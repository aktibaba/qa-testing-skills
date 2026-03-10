# Docker Compose for Multi-Service Test Setups

## Principle
Docker Compose orchestrates multi-service test topologies as declarative, version-controlled YAML, enabling any engineer to reproduce the full integration environment with a single command.

## Rationale
Modern applications rarely run in isolation. A typical service depends on a relational
database, a cache layer, a message broker, and possibly other microservices. Unit tests
mock these dependencies away, but integration and end-to-end tests need real instances.
Manually installing and configuring Postgres, Redis, and RabbitMQ on every developer
machine and every CI runner is error-prone and version-sensitive.

Docker Compose solves this by describing the entire service graph---images, ports,
networks, volumes, health checks, and startup order---in a single `docker-compose.yml`.
Override files (`docker-compose.override.yml`, `docker-compose.ci.yml`) layer
environment-specific tweaks without duplicating the base configuration. Compose profiles
allow different test types (unit, integration, e2e) to spin up only the services they
need, saving time and resources. Network isolation ensures tests running in parallel
cannot collide. Named volumes and bind mounts inject seed data and extract artifacts.

## Pattern Examples

### 1. App + Postgres + Redis (Full-Stack Integration)

```yaml
# docker-compose.yml
# Base configuration for the application, database, and cache.

version: "3.9"

services:
  # ---------- Database ----------
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - "5432:5432"
    # Health check ensures Compose waits until Postgres accepts queries.
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d testdb"]
      interval: 3s
      timeout: 3s
      retries: 10
    volumes:
      # Seed the database with schema and reference data on first start.
      - ./scripts/init-db:/docker-entrypoint-initdb.d:ro
      # Named volume persists data across container restarts during a session.
      - pgdata:/var/lib/postgresql/data
    networks:
      - test-net

  # ---------- Cache ----------
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 10
    networks:
      - test-net

  # ---------- Application / Test Runner ----------
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: test-runner
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://test:test@db:5432/testdb
      REDIS_URL: redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      # Bind-mount source so file watchers work during local development.
      - .:/app
      # Anonymous volume prevents overwriting node_modules from the image.
      - /app/node_modules
      # Persist coverage output on the host.
      - ./coverage:/app/coverage
    networks:
      - test-net

volumes:
  pgdata:

networks:
  test-net:
    driver: bridge
```

### 2. App + Postgres + RabbitMQ (Event-Driven Architecture)

```yaml
# docker-compose.yml

version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: orders_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d orders_test"]
      interval: 3s
      timeout: 3s
      retries: 10
    networks:
      - test-net

  # ---------- Message Broker ----------
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI (useful for debugging)
    healthcheck:
      # rabbitmq-diagnostics is more reliable than checking the port.
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 5s
      timeout: 5s
      retries: 15
    networks:
      - test-net

  # ---------- Application ----------
  app:
    build:
      context: .
      target: test-runner
    environment:
      DATABASE_URL: postgresql://test:test@db:5432/orders_test
      AMQP_URL: amqp://guest:guest@rabbitmq:5672
      LOG_LEVEL: warn
    depends_on:
      db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - test-net
    command: ["pytest", "-v", "--tb=short", "tests/integration/"]

  # ---------- Worker (consumes messages) ----------
  worker:
    build:
      context: .
      target: test-runner
    environment:
      DATABASE_URL: postgresql://test:test@db:5432/orders_test
      AMQP_URL: amqp://guest:guest@rabbitmq:5672
    depends_on:
      db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - test-net
    command: ["python", "-m", "app.worker"]

networks:
  test-net:
    driver: bridge
```

### 3. Override Files for Local vs CI

**Base file (`docker-compose.yml`)** stays environment-agnostic.
Override files layer on top without duplication.

```yaml
# docker-compose.override.yml
# Automatically loaded by `docker compose up` on developer machines.

version: "3.9"

services:
  app:
    # Bind-mount source for hot-reload during local development.
    volumes:
      - .:/app
      - /app/node_modules
    # Expose debugger port.
    ports:
      - "9229:9229"
    # Run tests in watch mode locally.
    command: ["npx", "jest", "--watch", "--verbose"]
    environment:
      # Verbose logging for local debugging.
      LOG_LEVEL: debug
```

```yaml
# docker-compose.ci.yml
# Used in CI: docker compose -f docker-compose.yml -f docker-compose.ci.yml up

version: "3.9"

services:
  app:
    # No source bind-mount in CI; use the baked-in code from the image.
    volumes:
      # Only mount the output directory for artifact collection.
      - ./test-results:/app/test-results
      - ./coverage:/app/coverage
    environment:
      LOG_LEVEL: warn
      CI: "true"
      # JUnit reporter for CI systems to parse.
      JEST_JUNIT_OUTPUT_DIR: /app/test-results
    command: >
      npx jest
        --ci
        --coverage
        --reporters=default
        --reporters=jest-junit
        --forceExit
```

**Running in CI:**

```bash
# CI pipeline step
docker compose -f docker-compose.yml -f docker-compose.ci.yml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from app
```

### 4. Profiles for Different Test Types

Profiles let you define services that only start when a specific profile is activated.
This avoids spinning up heavy services (like Selenium) for unit tests.

```yaml
# docker-compose.yml

version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d testdb"]
      interval: 3s
      timeout: 3s
      retries: 10
    # No profile = always starts.
    networks:
      - test-net

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 10
    # Only start for integration and e2e tests.
    profiles: ["integration", "e2e"]
    networks:
      - test-net

  # Selenium grid for browser-based E2E tests.
  selenium-hub:
    image: selenium/hub:4.18
    profiles: ["e2e"]
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"
    networks:
      - test-net

  chrome:
    image: selenium/node-chrome:4.18
    profiles: ["e2e"]
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
    depends_on:
      - selenium-hub
    networks:
      - test-net

  # Mailhog for email integration tests.
  mailhog:
    image: mailhog/mailhog:latest
    profiles: ["integration", "e2e"]
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    networks:
      - test-net

  app:
    build:
      context: .
      target: test-runner
    environment:
      DATABASE_URL: postgresql://test:test@db:5432/testdb
      REDIS_URL: redis://redis:6379/0
      SMTP_HOST: mailhog
      SMTP_PORT: 1025
      SELENIUM_URL: http://selenium-hub:4444/wd/hub
    depends_on:
      db:
        condition: service_healthy
    networks:
      - test-net

networks:
  test-net:
    driver: bridge
```

```bash
# Run only unit tests (just db starts, no redis/selenium/mailhog):
docker compose up app

# Run integration tests (db + redis + mailhog):
docker compose --profile integration up app

# Run E2E tests (everything):
docker compose --profile e2e up app
```

### 5. Volume Mounts for Test Data and Artifacts

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    volumes:
      # SQL files in this directory are executed alphabetically on first start.
      # 01-schema.sql creates tables; 02-seed.sql inserts reference data.
      - ./fixtures/db-init:/docker-entrypoint-initdb.d:ro
    networks:
      - test-net

  app:
    build:
      context: .
      target: test-runner
    volumes:
      # Mount test fixture files (JSON, CSV) read-only.
      - ./fixtures/api-payloads:/app/fixtures:ro

      # Mount output directories read-write to extract artifacts.
      - ./output/coverage:/app/coverage
      - ./output/screenshots:/app/screenshots
      - ./output/reports:/app/test-results

      # Mount a custom test config file.
      - ./config/test.env:/app/.env:ro
    networks:
      - test-net

networks:
  test-net:
    driver: bridge
```

### 6. Network Isolation for Parallel Test Suites

When running multiple test suites in parallel (e.g., microservice A and microservice B),
each suite must get its own network to prevent port collisions and cross-talk.

```bash
#!/usr/bin/env bash
# scripts/run-parallel-suites.sh
# Runs multiple service test suites in parallel with isolated networks.

set -euo pipefail

SUITES=("service-a" "service-b" "service-c")
PIDS=()

for SUITE in "${SUITES[@]}"; do
  echo "Starting suite: ${SUITE}"

  # Each suite gets a unique project name, which gives it isolated
  # networks, volumes, and container names.
  docker compose \
    --project-name "test-${SUITE}" \
    -f "services/${SUITE}/docker-compose.yml" \
    -f "services/${SUITE}/docker-compose.ci.yml" \
    up \
    --build \
    --abort-on-container-exit \
    --exit-code-from app \
    &

  PIDS+=($!)
done

# Wait for all suites and collect exit codes.
FAILED=0
for i in "${!PIDS[@]}"; do
  if ! wait "${PIDS[$i]}"; then
    echo "FAIL: ${SUITES[$i]}"
    FAILED=1
  else
    echo "PASS: ${SUITES[$i]}"
  fi
done

# Clean up all projects.
for SUITE in "${SUITES[@]}"; do
  docker compose --project-name "test-${SUITE}" \
    -f "services/${SUITE}/docker-compose.yml" \
    down --volumes --remove-orphans 2>/dev/null || true
done

exit $FAILED
```

### 7. Service Dependency Patterns

```yaml
version: "3.9"

services:
  # Pattern 1: Simple dependency (just wait for container to start).
  app-basic:
    depends_on:
      - db

  # Pattern 2: Health-check dependency (wait for service to be healthy).
  # This is the RECOMMENDED approach for test environments.
  app-healthy:
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Pattern 3: Service completed successfully (e.g., migration runner).
  app-after-migration:
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully

  # Migration runner exits after applying migrations.
  migrate:
    build:
      context: .
      target: test-runner
    command: ["npx", "prisma", "migrate", "deploy"]
    environment:
      DATABASE_URL: postgresql://test:test@db:5432/testdb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d testdb"]
      interval: 3s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 10
```

### 8. Reusable Compose Fragments with YAML Anchors

```yaml
version: "3.9"

# Define reusable blocks with YAML anchors.
x-common-env: &common-env
  LOG_LEVEL: warn
  NODE_ENV: test
  DATABASE_URL: postgresql://test:test@db:5432/testdb

x-healthcheck-defaults: &healthcheck-defaults
  interval: 3s
  timeout: 3s
  retries: 10

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD-SHELL", "pg_isready -U test -d testdb"]

  # Multiple services share the same environment block.
  api:
    build:
      context: ./services/api
    environment:
      <<: *common-env
      SERVICE_NAME: api
    depends_on:
      db:
        condition: service_healthy

  worker:
    build:
      context: ./services/worker
    environment:
      <<: *common-env
      SERVICE_NAME: worker
    depends_on:
      db:
        condition: service_healthy

  scheduler:
    build:
      context: ./services/scheduler
    environment:
      <<: *common-env
      SERVICE_NAME: scheduler
    depends_on:
      db:
        condition: service_healthy
```

### 9. Quick-Reference: Common Commands

```bash
# Start services and run tests (foreground, stop on first container exit):
docker compose up --build --abort-on-container-exit --exit-code-from app

# Start services in background, run tests separately:
docker compose up -d db redis
docker compose run --rm app npm test

# Run a one-off test command without starting the full stack:
docker compose run --rm --no-deps app npx jest tests/unit/

# View logs for a specific service:
docker compose logs -f db

# Rebuild without cache (useful when Dockerfile changes aren't picked up):
docker compose build --no-cache app

# Tear down everything including volumes and orphan containers:
docker compose down --volumes --remove-orphans

# Scale a service (e.g., run 3 Chrome nodes for Selenium):
docker compose --profile e2e up --scale chrome=3
```
