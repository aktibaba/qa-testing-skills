# Environment Cleanup and Teardown

## Principle
Every test environment must have an automated, idempotent teardown procedure that returns all resources to their pre-test state, preventing state leakage and resource exhaustion.

## Rationale
Test environments accumulate state over time: database rows, uploaded files, Docker
containers, temporary directories, cache entries, and network resources. Without
systematic cleanup, this accumulated state causes three problems. First, tests become
order-dependent as they interact through leftover data. Second, resources are exhausted
(disk fills up with screenshots, Docker runs out of layers, connection pools are
depleted). Third, debugging becomes impossible because the environment contains artifacts
from dozens of previous test runs.

Effective teardown operates at multiple levels: per-test (transaction rollback, mock
restoration), per-suite (database truncation, container restart), and per-pipeline
(Docker prune, artifact cleanup). The teardown must be idempotent---running it twice
produces the same result---and resilient to partial failures (if one cleanup step fails,
the remaining steps still execute).

## Pattern Examples

### 1. Docker Cleanup Script

```bash
#!/usr/bin/env bash
# scripts/docker-cleanup.sh
# Comprehensive Docker cleanup for test environments.
# Safe to run multiple times (idempotent).

set -euo pipefail

PROJECT_PREFIX="${1:-test}"
DRY_RUN="${DRY_RUN:-false}"

echo "=== Docker Test Environment Cleanup ==="
echo "Project prefix: ${PROJECT_PREFIX}"
echo "Dry run: ${DRY_RUN}"
echo ""

run_cmd() {
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] $*"
  else
    echo "[EXEC] $*"
    eval "$@" || true  # Don't fail on cleanup errors.
  fi
}

# 1. Stop and remove containers from the test project.
echo "--- Stopping test containers ---"
CONTAINERS=$(docker ps -aq --filter "label=com.docker.compose.project=${PROJECT_PREFIX}" 2>/dev/null || true)
if [ -n "$CONTAINERS" ]; then
  run_cmd "docker stop $CONTAINERS"
  run_cmd "docker rm -f $CONTAINERS"
else
  echo "No test containers found."
fi

# 2. Remove containers by name pattern.
echo "--- Removing containers matching pattern ---"
PATTERN_CONTAINERS=$(docker ps -aq --filter "name=${PROJECT_PREFIX}" 2>/dev/null || true)
if [ -n "$PATTERN_CONTAINERS" ]; then
  run_cmd "docker rm -f $PATTERN_CONTAINERS"
fi

# 3. Remove test networks.
echo "--- Removing test networks ---"
NETWORKS=$(docker network ls --filter "name=${PROJECT_PREFIX}" -q 2>/dev/null || true)
if [ -n "$NETWORKS" ]; then
  run_cmd "docker network rm $NETWORKS"
fi

# 4. Remove test volumes.
echo "--- Removing test volumes ---"
VOLUMES=$(docker volume ls --filter "name=${PROJECT_PREFIX}" -q 2>/dev/null || true)
if [ -n "$VOLUMES" ]; then
  run_cmd "docker volume rm $VOLUMES"
fi

# 5. Remove dangling images (untagged layers from builds).
echo "--- Removing dangling images ---"
DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null || true)
if [ -n "$DANGLING" ]; then
  run_cmd "docker rmi $DANGLING"
fi

# 6. Remove test-specific images.
echo "--- Removing test runner images ---"
TEST_IMAGES=$(docker images --filter "label=purpose=test-runner" -q 2>/dev/null || true)
if [ -n "$TEST_IMAGES" ]; then
  run_cmd "docker rmi $TEST_IMAGES"
fi

# 7. Prune build cache older than 24 hours.
echo "--- Pruning build cache ---"
run_cmd "docker builder prune --filter 'until=24h' -f"

# 8. Report disk usage.
echo ""
echo "=== Docker Disk Usage ==="
docker system df
echo ""
echo "Cleanup complete."
```

### 2. Database Reset Strategies

```python
# tests/helpers/db_cleanup.py
"""Database cleanup strategies for different test scopes."""

from sqlalchemy import text
from contextlib import contextmanager


class DatabaseCleaner:
    """Provides multiple strategies for database cleanup."""

    def __init__(self, engine):
        self.engine = engine

    def truncate_all(self):
        """
        TRUNCATE all application tables.
        Fast but requires knowing the table list.
        Best for: between test suites.
        """
        with self.engine.connect() as conn:
            # Disable foreign key checks during truncation.
            conn.execute(text("SET session_replication_role = 'replica'"))

            # Get all non-system tables.
            result = conn.execute(text("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
                AND tablename NOT IN ('schema_migrations', 'alembic_version')
            """))

            tables = [row[0] for row in result]

            if tables:
                table_list = ", ".join(f'"{t}"' for t in tables)
                conn.execute(text(f"TRUNCATE TABLE {table_list} CASCADE"))

            # Re-enable foreign key checks.
            conn.execute(text("SET session_replication_role = 'origin'"))
            conn.commit()

    @contextmanager
    def transaction_rollback(self):
        """
        Wrap a test in a transaction that always rolls back.
        Fastest strategy; no data ever hits disk.
        Best for: individual tests.
        """
        conn = self.engine.connect()
        trans = conn.begin()
        try:
            yield conn
        finally:
            trans.rollback()
            conn.close()

    def delete_test_data(self, prefix="test_"):
        """
        Delete rows with a test prefix in key fields.
        Surgical approach when you can't truncate.
        Best for: shared environments (staging).
        """
        with self.engine.connect() as conn:
            conn.execute(text(f"DELETE FROM orders WHERE customer_email LIKE '{prefix}%'"))
            conn.execute(text(f"DELETE FROM users WHERE email LIKE '{prefix}%'"))
            conn.execute(text(f"DELETE FROM products WHERE name LIKE '{prefix}%'"))
            conn.commit()

    def reset_sequences(self):
        """Reset auto-increment sequences to 1."""
        with self.engine.connect() as conn:
            result = conn.execute(text("""
                SELECT sequence_name FROM information_schema.sequences
                WHERE sequence_schema = 'public'
            """))
            for row in result:
                conn.execute(text(f"ALTER SEQUENCE {row[0]} RESTART WITH 1"))
            conn.commit()

    def full_reset(self):
        """Complete reset: truncate + reset sequences + vacuum."""
        self.truncate_all()
        self.reset_sequences()
        with self.engine.connect() as conn:
            # VACUUM can't run inside a transaction.
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(text("VACUUM ANALYZE"))
```

```python
# tests/conftest.py
"""Pytest fixtures using the database cleaner."""

import pytest
from tests.helpers.db_cleanup import DatabaseCleaner


@pytest.fixture(scope="session")
def db_cleaner(engine):
    return DatabaseCleaner(engine)


@pytest.fixture(scope="module")
def clean_db(db_cleaner):
    """Truncate all tables before each test module."""
    db_cleaner.truncate_all()
    yield
    db_cleaner.truncate_all()


@pytest.fixture(scope="function")
def db_tx(db_cleaner):
    """Wrap each test in a transaction that rolls back."""
    with db_cleaner.transaction_rollback() as conn:
        yield conn
```

### 3. File and Artifact Cleanup

```javascript
// tests/helpers/file-cleanup.js
const fs = require("fs");
const path = require("path");

class FileCleanup {
  constructor() {
    this.trackedPaths = [];
  }

  /**
   * Track a file or directory for cleanup.
   * Returns the path for convenience.
   */
  track(filePath) {
    this.trackedPaths.push(filePath);
    return filePath;
  }

  /**
   * Create a temp directory that is automatically tracked for cleanup.
   */
  tempDir(prefix = "test-") {
    const dirPath = fs.mkdtempSync(path.join(require("os").tmpdir(), prefix));
    this.track(dirPath);
    return dirPath;
  }

  /**
   * Clean up all tracked paths.
   * Errors are logged but don't throw (idempotent).
   */
  cleanAll() {
    for (const trackedPath of this.trackedPaths) {
      try {
        if (fs.existsSync(trackedPath)) {
          const stat = fs.statSync(trackedPath);
          if (stat.isDirectory()) {
            fs.rmSync(trackedPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(trackedPath);
          }
        }
      } catch (err) {
        console.warn(`Cleanup warning: could not remove ${trackedPath}: ${err.message}`);
      }
    }
    this.trackedPaths = [];
  }
}

module.exports = { FileCleanup };
```

```javascript
// tests/integration/file-upload.test.js
const { FileCleanup } = require("../helpers/file-cleanup");

describe("File upload", () => {
  const cleanup = new FileCleanup();

  afterEach(() => {
    cleanup.cleanAll();
  });

  it("uploads and processes a CSV file", async () => {
    // Create a temp file that will be cleaned up.
    const tempDir = cleanup.tempDir("upload-test-");
    const csvPath = path.join(tempDir, "data.csv");
    fs.writeFileSync(csvPath, "name,email\nAlice,alice@example.com\n");

    const result = await fileService.processUpload(csvPath);
    expect(result.rowsProcessed).toBe(1);

    // Track the output file too.
    if (result.outputPath) {
      cleanup.track(result.outputPath);
    }
  });
});
```

### 4. Post-Test Hook Orchestration

```python
# tests/conftest.py
"""Comprehensive post-test cleanup using pytest hooks."""

import pytest
import shutil
import os
import redis


@pytest.fixture(autouse=True, scope="function")
def cleanup_after_test(request, db_session, redis_client, tmp_path):
    """
    Runs cleanup after EVERY test, regardless of pass/fail.
    Uses a yield fixture to ensure cleanup runs even on exceptions.
    """
    # --- Setup (before test) ---
    yield

    # --- Teardown (after test) ---

    # 1. Roll back any uncommitted database transactions.
    try:
        db_session.rollback()
    except Exception:
        pass

    # 2. Clear Redis test keys.
    try:
        test_prefix = f"test:{request.node.nodeid}:*"
        keys = redis_client.keys(test_prefix)
        if keys:
            redis_client.delete(*keys)
    except Exception as e:
        print(f"Redis cleanup warning: {e}")

    # 3. Remove uploaded test files.
    upload_dir = os.path.join("uploads", "test")
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir, ignore_errors=True)

    # 4. Restore environment variables.
    # (Handled by the monkeypatch fixture if used.)

    # 5. Close any open file handles.
    # (Handled by context managers in well-written tests.)


@pytest.fixture(autouse=True, scope="session")
def cleanup_after_session():
    """Session-level cleanup: runs once after all tests complete."""
    yield

    # Clean up Docker test containers.
    os.system("docker compose -f docker-compose.test.yml down --volumes 2>/dev/null || true")

    # Remove test artifacts directory.
    artifacts_dir = "test-artifacts"
    if os.path.exists(artifacts_dir):
        shutil.rmtree(artifacts_dir, ignore_errors=True)

    # Clean up temp files older than 1 hour.
    import tempfile
    import time
    temp_dir = tempfile.gettempdir()
    cutoff = time.time() - 3600
    for entry in os.scandir(temp_dir):
        if entry.name.startswith("test-") and entry.stat().st_mtime < cutoff:
            try:
                if entry.is_dir():
                    shutil.rmtree(entry.path)
                else:
                    os.unlink(entry.path)
            except OSError:
                pass
```

### 5. CI Pipeline Cleanup Step

```yaml
# .github/workflows/test.yml (append as final job)
cleanup:
  runs-on: ubuntu-latest
  needs: [unit-tests, integration-tests, e2e-tests]
  if: always()  # Run even if tests failed.
  steps:
    - uses: actions/checkout@v4

    - name: Stop all test services
      run: docker compose -f docker-compose.test.yml down --volumes --remove-orphans

    - name: Remove test Docker resources
      run: |
        # Remove all containers with the test label.
        docker container prune -f --filter "label=purpose=test"
        # Remove test volumes.
        docker volume prune -f --filter "label=purpose=test"
        # Remove test networks.
        docker network prune -f --filter "label=purpose=test"
        # Remove dangling images.
        docker image prune -f

    - name: Clean up test database
      run: |
        docker run --rm \
          --network host \
          postgres:16-alpine \
          psql postgresql://test:test@localhost:5432/postgres \
          -c "DROP DATABASE IF EXISTS testdb;"

    - name: Report disk usage
      if: always()
      run: |
        echo "Docker disk usage:"
        docker system df
        echo ""
        echo "Runner disk usage:"
        df -h /
```

### 6. Cleanup Registry Pattern

```javascript
// tests/helpers/cleanup-registry.js
// Centralized cleanup registry that ensures all resources are released.

class CleanupRegistry {
  constructor() {
    this._cleanups = [];
  }

  /**
   * Register a cleanup function. Functions are executed in reverse order (LIFO).
   * This mirrors the typical setup/teardown pattern: last opened, first closed.
   */
  register(name, cleanupFn) {
    this._cleanups.push({ name, fn: cleanupFn });
  }

  /**
   * Execute all registered cleanup functions.
   * Collects errors but does not throw until all cleanups have been attempted.
   */
  async runAll() {
    const errors = [];

    // Execute in reverse registration order.
    while (this._cleanups.length > 0) {
      const { name, fn } = this._cleanups.pop();
      try {
        await fn();
      } catch (err) {
        errors.push({ name, error: err.message });
        console.warn(`Cleanup "${name}" failed: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} cleanup(s) failed:`, errors);
    }
  }
}

// Global instance for the test suite.
const globalCleanup = new CleanupRegistry();

module.exports = { CleanupRegistry, globalCleanup };
```

```javascript
// Usage in tests:
const { globalCleanup } = require("../helpers/cleanup-registry");

afterEach(async () => {
  await globalCleanup.runAll();
});

it("creates resources that need cleanup", async () => {
  const user = await createUser(db);
  globalCleanup.register("remove test user", () => db("users").where({ id: user.id }).del());

  const tempFile = writeTempFile("test-data.csv", "a,b,c\n1,2,3");
  globalCleanup.register("remove temp file", () => fs.unlinkSync(tempFile));

  const server = await startMockServer(3456);
  globalCleanup.register("stop mock server", () => server.close());

  // ... run test assertions ...
  // All three cleanups will execute in afterEach, even if the test fails.
});
```
