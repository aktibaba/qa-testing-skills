# Test Isolation Patterns

## Principle
Every test must produce the same result regardless of execution order, parallelism, or the outcome of any other test.

## Rationale
Test isolation failures are among the most insidious problems in a test suite. When
test A passes alone but fails when test B runs first, the root cause is shared mutable
state: a database row left behind, a global variable mutated, a file written to disk,
or a mock not properly restored. These failures are non-deterministic, making them
appear as "flaky" tests when the real problem is architectural.

True isolation means each test sets up exactly the state it needs, executes, and cleans
up completely---leaving no trace. Database transaction rollback is the gold standard for
SQL-based isolation because it is fast and atomic. For services that cannot participate
in a transaction (Redis, Elasticsearch, external APIs), strategies include
container-per-test, namespace prefixing, and mock server isolation. Parallel test
execution amplifies isolation requirements: two tests inserting a user with the same
email will collide unless data is unique per test. The patterns below provide concrete
approaches for each isolation challenge.

## Pattern Examples

### 1. Database Transaction Rollback Isolation (Node.js / Knex)

```javascript
// tests/helpers/db-isolation.js
// Wraps each test in a database transaction that is rolled back after the test.

const knex = require("../../src/db"); // Knex instance.

/**
 * beforeEach: start a transaction and replace the global DB connection.
 * afterEach: roll back the transaction, restoring the database to its pre-test state.
 */
let trx;

async function beginTransaction() {
  trx = await knex.transaction();
  // Override the app's DB module to use the transaction.
  // This works because Node.js modules are singletons.
  jest.spyOn(require("../../src/db"), "default", "get").mockReturnValue(trx);
  return trx;
}

async function rollbackTransaction() {
  if (trx) {
    await trx.rollback();
    trx = null;
  }
  jest.restoreAllMocks();
}

module.exports = { beginTransaction, rollbackTransaction };
```

```javascript
// tests/integration/user-service.test.js
const { beginTransaction, rollbackTransaction } = require("../helpers/db-isolation");
const userService = require("../../src/services/user-service");

describe("UserService", () => {
  beforeEach(async () => {
    await beginTransaction();
  });

  afterEach(async () => {
    await rollbackTransaction();
  });

  it("creates a user", async () => {
    const user = await userService.create({
      email: "isolated@example.com",
      name: "Isolated User",
    });
    expect(user.id).toBeDefined();

    const found = await userService.findById(user.id);
    expect(found.email).toBe("isolated@example.com");
    // After rollback, this user will not exist in the database.
  });

  it("does not see users from other tests", async () => {
    const users = await userService.findAll();
    // This would fail without isolation if the previous test's user persisted.
    const isolatedUser = users.find((u) => u.email === "isolated@example.com");
    expect(isolatedUser).toBeUndefined();
  });
});
```

### 2. Database Transaction Rollback (Python / pytest + SQLAlchemy)

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from app.database import Base

TEST_DB_URL = "postgresql://test:test@localhost:5432/testdb"


@pytest.fixture(scope="session")
def engine():
    """Create engine and tables once for the entire test session."""
    eng = create_engine(TEST_DB_URL)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    """
    Each test gets a session wrapped in a SAVEPOINT.
    Nested transactions (from application code) create sub-SAVEPOINTs.
    Everything rolls back when the test ends.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    # If application code calls session.begin_nested() or session.commit(),
    # intercept and use SAVEPOINTs instead of real commits.
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, trans):
        nonlocal nested
        if trans.nested and not trans._parent.nested:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

### 3. Container-Per-Test Pattern (Testcontainers)

For tests that need a fully isolated database instance (e.g., testing migrations,
schema changes, or Postgres extensions):

```python
# tests/test_migrations.py
"""Each test gets its own Postgres container."""

import pytest
from testcontainers.postgres import PostgresContainer
from sqlalchemy import create_engine, text


@pytest.fixture
def fresh_db():
    """Spin up a disposable Postgres container for this test only."""
    with PostgresContainer("postgres:16-alpine") as pg:
        engine = create_engine(pg.get_connection_url())
        yield engine
        engine.dispose()


class TestMigrations:

    def test_migration_applies_cleanly(self, fresh_db):
        """Run migrations against a pristine database."""
        from alembic.config import Config
        from alembic import command

        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", str(fresh_db.url))

        # Upgrade to latest; this should not raise.
        command.upgrade(alembic_cfg, "head")

        # Verify a key table exists.
        with fresh_db.connect() as conn:
            result = conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
            ))
            assert result.scalar() is True

    def test_migration_rollback(self, fresh_db):
        """Verify migrations can be rolled back cleanly."""
        from alembic.config import Config
        from alembic import command

        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", str(fresh_db.url))

        command.upgrade(alembic_cfg, "head")
        command.downgrade(alembic_cfg, "base")

        # After full rollback, no application tables should remain.
        with fresh_db.connect() as conn:
            result = conn.execute(text(
                "SELECT count(*) FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
            ))
            assert result.scalar() == 0
```

```javascript
// tests/integration/testcontainers.test.js
// Node.js Testcontainers example.

const { GenericContainer } = require("testcontainers");
const { Client } = require("pg");

describe("with a fresh Postgres container", () => {
  let container;
  let client;

  beforeAll(async () => {
    // Start a new Postgres container for this test suite.
    container = await new GenericContainer("postgres:16-alpine")
      .withEnvironment({
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
        POSTGRES_DB: "testdb",
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        // Wait until Postgres is ready to accept connections.
        Wait.forLogMessage(/database system is ready to accept connections/, 2)
      )
      .start();

    client = new Client({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: "test",
      password: "test",
      database: "testdb",
    });
    await client.connect();
  }, 60000); // 60s timeout for container startup.

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  it("starts with an empty database", async () => {
    const result = await client.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    );
    expect(parseInt(result.rows[0].count)).toBe(0);
  });
});
```

### 4. Mock Server Isolation

When tests interact with external HTTP services, each test should get its own mock
server or isolated set of stubs to prevent cross-contamination.

```javascript
// tests/helpers/mock-server.js
const { setupServer } = require("msw/node");
const { http, HttpResponse } = require("msw");

/**
 * Create an isolated mock server for a single test.
 * The server is automatically cleaned up after each test.
 */
function createMockServer(handlers = []) {
  const server = setupServer(...handlers);

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers()); // Remove per-test overrides.
  afterAll(() => server.close());

  return server;
}

module.exports = { createMockServer };
```

```javascript
// tests/services/payment-service.test.js
const { http, HttpResponse } = require("msw");
const { createMockServer } = require("../helpers/mock-server");
const paymentService = require("../../src/services/payment-service");

// Shared mock server for this file.
const server = createMockServer([
  // Default handler: successful payment.
  http.post("https://api.stripe.com/v1/charges", () => {
    return HttpResponse.json({ id: "ch_default", status: "succeeded" });
  }),
]);

describe("PaymentService", () => {
  it("processes a successful payment", async () => {
    const result = await paymentService.charge({ amount: 1000, currency: "usd" });
    expect(result.status).toBe("succeeded");
  });

  it("handles payment failure", async () => {
    // Override ONLY for this test; resetHandlers() in afterEach reverts it.
    server.use(
      http.post("https://api.stripe.com/v1/charges", () => {
        return HttpResponse.json(
          { error: { message: "Card declined" } },
          { status: 402 }
        );
      })
    );

    await expect(
      paymentService.charge({ amount: 1000, currency: "usd" })
    ).rejects.toThrow("Card declined");
  });

  it("uses the default handler again (not the override)", async () => {
    // The override from the previous test was reset by afterEach.
    const result = await paymentService.charge({ amount: 500, currency: "usd" });
    expect(result.status).toBe("succeeded");
  });
});
```

### 5. Parallel-Safe Test Data with Unique Identifiers

```javascript
// tests/helpers/unique.js
// Generate test data that is unique per test run and per worker.

const { v4: uuidv4 } = require("uuid");

const WORKER_ID = process.env.JEST_WORKER_ID || "1";

/**
 * Generate a unique email that won't collide with other tests
 * or parallel workers.
 */
function uniqueEmail(prefix = "test") {
  return `${prefix}-${WORKER_ID}-${uuidv4().slice(0, 8)}@example.com`;
}

/**
 * Generate a unique name with a prefix for easy identification in logs.
 */
function uniqueName(prefix = "Test User") {
  return `${prefix} W${WORKER_ID}-${Date.now()}`;
}

/**
 * Generate a unique slug/key for resources.
 */
function uniqueSlug(base = "test") {
  return `${base}-${WORKER_ID}-${uuidv4().slice(0, 8)}`;
}

module.exports = { uniqueEmail, uniqueName, uniqueSlug };
```

```javascript
// tests/api/users-parallel.test.js
const { uniqueEmail, uniqueName } = require("../helpers/unique");

describe("User creation (parallel-safe)", () => {
  it("creates a user with a unique email", async () => {
    const email = uniqueEmail("create");
    const name = uniqueName("Create Test");

    const res = await api.post("/api/users", {
      email,
      name,
      password: "TestPass1!",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(email);
  });
});
```

### 6. Global State Cleanup Utilities

```javascript
// tests/helpers/cleanup.js

/**
 * Save and restore environment variables around a test.
 */
function withEnv(overrides) {
  const originals = {};

  beforeEach(() => {
    for (const [key, value] of Object.entries(overrides)) {
      originals[key] = process.env[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  afterEach(() => {
    for (const [key] of Object.entries(overrides)) {
      if (originals[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originals[key];
      }
    }
  });
}

/**
 * Save and restore a module-level singleton between tests.
 */
function withSingleton(modulePath, property) {
  let original;

  beforeEach(() => {
    original = require(modulePath)[property];
  });

  afterEach(() => {
    require(modulePath)[property] = original;
  });
}

module.exports = { withEnv, withSingleton };
```

```python
# tests/helpers/cleanup.py
"""Context managers and fixtures for test isolation."""

import os
import pytest
from contextlib import contextmanager
from unittest.mock import patch


@contextmanager
def temporary_env(**variables):
    """
    Temporarily set environment variables, restoring originals on exit.

    Usage:
        with temporary_env(DATABASE_URL="sqlite://", DEBUG="true"):
            assert os.environ["DEBUG"] == "true"
        # Original values restored here.
    """
    originals = {}
    for key, value in variables.items():
        originals[key] = os.environ.get(key)
        os.environ[key] = value

    try:
        yield
    finally:
        for key, original in originals.items():
            if original is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = original


@pytest.fixture
def clean_temp_dir(tmp_path):
    """
    Provide a temporary directory that is automatically cleaned up.
    Tests that write files should use this instead of writing to the project directory.
    """
    yield tmp_path
    # tmp_path is cleaned up by pytest automatically.


@pytest.fixture(autouse=True)
def reset_caches():
    """Clear application-level caches between tests."""
    yield
    from app.cache import cache_registry
    for cache in cache_registry:
        cache.clear()
```

### 7. Redis Isolation with Key Prefixing

```javascript
// tests/helpers/redis-isolation.js
const Redis = require("ioredis");

/**
 * Create an isolated Redis client that prefixes all keys with a unique namespace.
 * This allows parallel tests to share a single Redis instance without collisions.
 */
function createIsolatedRedis() {
  const prefix = `test:${process.env.JEST_WORKER_ID || "1"}:${Date.now()}:`;
  const client = new Redis(process.env.TEST_REDIS_URL || "redis://localhost:6379");

  // Wrap key-based commands to auto-prefix.
  const originalGet = client.get.bind(client);
  const originalSet = client.set.bind(client);
  const originalDel = client.del.bind(client);

  client.get = (key, ...args) => originalGet(`${prefix}${key}`, ...args);
  client.set = (key, ...args) => originalSet(`${prefix}${key}`, ...args);
  client.del = (...keys) => originalDel(...keys.map((k) => `${prefix}${k}`));

  // Cleanup: delete all keys with this prefix.
  client.cleanupTestKeys = async () => {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  };

  return client;
}

module.exports = { createIsolatedRedis };
```
