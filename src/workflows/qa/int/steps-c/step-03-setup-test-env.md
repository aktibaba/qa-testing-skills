---
name: 'step-03-setup-test-env'
description: 'Setup Docker-based integration test environment'
nextStepFile: './step-04-generate-tests.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 3: Setup Test Environment — Docker-Based Integration Infrastructure

## STEP GOAL
Create the Docker-based test environment, mock service configurations, test helper utilities, and database seeding infrastructure needed to run integration tests reliably.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Generate environment and helper files only — no test files yet
- All services must have health checks
- Environment must start cleanly from scratch with a single command

## CONTEXT BOUNDARIES
- Available context: service map from Step 1, strategy from Step 2
- Required knowledge fragments: `docker-test-env` (01), `docker-compose-patterns` (02), `test-data-management` (06), `test-environment-teardown` (28)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 3.1 — Generate Docker Compose Test Configuration

Create `docker-compose.test.yml` (or update existing) with services identified in Step 1:

**Structure:**
```yaml
version: '3.8'

services:
  # Real instances for owned services
  test-db:
    image: postgres:16-alpine  # Match production version
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
    ports:
      - "5433:5432"  # Different port to avoid conflicts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser -d testdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    tmpfs:
      - /var/lib/postgresql/data  # RAM disk for speed

  test-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  test-rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5673:5672"
      - "15673:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 10s
      retries: 5

  # Mock server for external APIs
  mock-server:
    image: wiremock/wiremock:latest
    ports:
      - "8090:8080"
    volumes:
      - ./tests/integration/mocks:/home/wiremock
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/__admin"]
      interval: 5s
      timeout: 3s
      retries: 5
```

**Key requirements:**
- Use non-standard ports to avoid conflicts with development services
- All services have health checks
- Use `tmpfs` for databases when data persistence is not needed (faster tests)
- Pin image versions to match production
- Use Alpine variants where available (faster pulls)

### 3.2 — Create Testcontainers Configuration (Alternative)

If the project prefers Testcontainers over Docker Compose, generate programmatic container setup:

**Node.js (testcontainers-node):**
```typescript
// helpers/test-containers.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';

export async function startTestDb() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
    .start();

  return {
    connectionString: container.getConnectionUri(),
    stop: () => container.stop(),
  };
}
```

**Java (Testcontainers):**
```java
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
    .withDatabaseName("testdb")
    .withUsername("testuser")
    .withPassword("testpass")
    .withTmpFs(Map.of("/var/lib/postgresql/data", "rw"));
```

### 3.3 — Create Directory Structure

```
{test_dir}/integration/
  helpers/             # Test utilities and setup helpers
  mocks/               # External service mock definitions
    wiremock/           # WireMock mappings and responses
    fixtures/           # Recorded API responses
  seeds/               # Database seed data
  specs/               # Test specification files (created in Step 4)
  docker-compose.test.yml
```

### 3.4 — Create Database Seeding Infrastructure

Generate database seeding utilities:

**SQL-based seeding:**
```sql
-- seeds/base-data.sql
-- Minimal data required for all integration tests

INSERT INTO users (id, email, role, created_at) VALUES
  ('test-user-1', 'user@test.com', 'user', NOW()),
  ('test-admin-1', 'admin@test.com', 'admin', NOW());

INSERT INTO organizations (id, name, owner_id) VALUES
  ('test-org-1', 'Test Organization', 'test-user-1');
```

**Programmatic factories:**
```typescript
// helpers/factories.ts
export function createTestUser(overrides = {}) {
  return {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    role: 'user',
    ...overrides,
  };
}

export function createTestOrder(userId: string, overrides = {}) {
  return {
    userId,
    items: [{ productId: 'prod-1', quantity: 1, price: 9.99 }],
    status: 'pending',
    ...overrides,
  };
}
```

### 3.5 — Create Mock Service Definitions

For each external service identified as "mocked" in Step 2:

**WireMock mappings:**
```json
// mocks/wiremock/mappings/stripe-charge.json
{
  "request": {
    "method": "POST",
    "url": "/v1/charges",
    "headers": {
      "Authorization": { "matches": "Bearer sk_test_.*" }
    }
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "jsonBody": {
      "id": "ch_test_123",
      "status": "succeeded",
      "amount": "${request.body.amount}",
      "currency": "usd"
    }
  }
}
```

**Programmatic mocks (nock/responses):**
```typescript
// helpers/mock-stripe.ts
import nock from 'nock';

export function mockStripeCharge(amount: number, status = 'succeeded') {
  return nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(200, {
      id: 'ch_test_123',
      status,
      amount,
      currency: 'usd',
    });
}

export function mockStripeChargeFailure() {
  return nock('https://api.stripe.com')
    .post('/v1/charges')
    .reply(402, {
      error: { type: 'card_error', message: 'Card declined' },
    });
}
```

### 3.6 — Create Test Lifecycle Helpers

Generate setup and teardown utilities:

```typescript
// helpers/test-lifecycle.ts

export async function setupTestEnvironment() {
  // 1. Wait for Docker services to be healthy
  await waitForService('http://localhost:5433', 'PostgreSQL');
  await waitForService('http://localhost:6380', 'Redis');

  // 2. Run database migrations
  await runMigrations();

  // 3. Seed base data
  await seedDatabase();
}

export async function teardownTestEnvironment() {
  // 1. Truncate all tables (preserve schema)
  await truncateAllTables();

  // 2. Clear Redis
  await flushRedis();

  // 3. Purge message queues
  await purgeQueues();
}

export async function waitForService(url: string, name: string, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`${name} not ready after ${timeoutMs}ms`);
}
```

### 3.7 — Create Environment Configuration

Generate `.env.test`:

```env
# Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=testdb
TEST_DB_USER=testuser
TEST_DB_PASSWORD=testpass
TEST_DATABASE_URL=postgresql://testuser:testpass@localhost:5433/testdb

# Redis
TEST_REDIS_URL=redis://localhost:6380

# RabbitMQ
TEST_AMQP_URL=amqp://guest:guest@localhost:5673

# Mock Server
TEST_MOCK_SERVER_URL=http://localhost:8090

# External Services (pointed at mock server)
STRIPE_API_URL=http://localhost:8090/stripe
SENDGRID_API_URL=http://localhost:8090/sendgrid

# Test Settings
TEST_TIMEOUT=30000
CI=false
```

### 3.8 — Create Startup Script

Generate a script to start the test environment:

```bash
#!/usr/bin/env bash
# scripts/test-integration.sh — Start environment and run integration tests

set -euo pipefail

echo "Starting test services..."
docker compose -f docker-compose.test.yml up -d --wait

echo "Running migrations..."
npm run db:migrate:test  # Adapt to project's migration command

echo "Running integration tests..."
npm run test:integration

EXIT_CODE=$?

echo "Stopping test services..."
docker compose -f docker-compose.test.yml down -v

exit $EXIT_CODE
```

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 3 Complete — Test Environment Configured

## Generated Files
- Docker Compose: docker-compose.test.yml
- Directory structure: {test_dir}/integration/
- Database seeds: seeds/base-data.sql
- Mock definitions: mocks/ (<count> mock files)
- Lifecycle helpers: helpers/test-lifecycle.ts
- Environment config: .env.test
- Startup script: scripts/test-integration.sh

## Services Configured
| Service     | Image              | Port  | Health Check |
|-------------|--------------------|----- -|-------------|
| PostgreSQL  | postgres:16-alpine | 5433  | pg_isready  |
| Redis       | redis:7-alpine     | 6380  | redis-cli   |
| ...         | ...                | ...   | ...         |

## Mock Services
| External Service | Mock Tool | Config File |
|------------------|-----------|-------------|
| Stripe           | WireMock  | mocks/wiremock/... |
| ...              | ...       | ...         |

## Next Step: step-04-generate-tests.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: Docker Compose file with health checks for all required services, mock definitions for all external services, database seeding infrastructure in place, lifecycle helpers created, single-command startup script works
### FAILURE: Missing health checks, external services not mocked, no database seeding, manual setup steps required
