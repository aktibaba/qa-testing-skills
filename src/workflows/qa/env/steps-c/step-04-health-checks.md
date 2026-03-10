---
name: 'step-04-health-checks'
description: 'Add health checks, wait-for-it, and readiness probes'
nextStepFile: './step-05-validate-and-summary.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 4: Health Checks — Readiness and Dependency Ordering

## STEP GOAL

Refine health check configurations for every service in the Docker Compose file. Ensure proper dependency ordering so that services start only when their dependencies are fully ready, not just running.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if `docker-compose.test.yml` does not exist from Step 3.
- Every service must have a health check — no exceptions.
- Use `service_healthy` condition for all `depends_on` entries.

## CONTEXT BOUNDARIES

- Available context: generated Docker Compose file, service blueprint, knowledge fragments on health checks.
- Focus: health check refinement and dependency ordering only. Do not restructure services.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 4.1 — Read Current Compose File

Load `{project-root}/docker-compose.test.yml` and inventory all services. For each service, note:
- Current health check (if any).
- Current `depends_on` entries.
- Service type (database, cache, broker, application).

### 4.2 — Apply Service-Specific Health Checks

Update each service with a production-grade health check:

**PostgreSQL:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-test_db}"]
  interval: 5s
  timeout: 5s
  retries: 5
  start_period: 10s
```

**MySQL / MariaDB:**
```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p$${MYSQL_ROOT_PASSWORD}"]
  interval: 5s
  timeout: 5s
  retries: 5
  start_period: 15s
```

**MongoDB:**
```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 5s
  timeout: 5s
  retries: 5
  start_period: 10s
```

**Redis:**
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 3s
  retries: 3
  start_period: 5s
```

**RabbitMQ:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "rabbitmq-diagnostics -q ping"]
  interval: 10s
  timeout: 10s
  retries: 5
  start_period: 30s
```

**Kafka:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092"]
  interval: 10s
  timeout: 10s
  retries: 10
  start_period: 30s
```

**Elasticsearch:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health || exit 1"]
  interval: 10s
  timeout: 10s
  retries: 10
  start_period: 30s
```

**Mailhog:**
```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:8025"]
  interval: 5s
  timeout: 3s
  retries: 3
  start_period: 5s
```

**LocalStack:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -sf http://localhost:4566/_localstack/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 15s
```

**Application Service:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -sf http://localhost:$${APP_PORT:-3000}/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 15s
```

If the application does not expose a health endpoint, use a process check:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pgrep -f 'node|python|java|go' || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 10s
```

### 4.3 — Configure Dependency Ordering

Update `depends_on` for each service using `condition: service_healthy`:

```yaml
services:
  test-app:
    depends_on:
      test-postgres:
        condition: service_healthy
      test-redis:
        condition: service_healthy
```

**Dependency chain rules:**
1. Infrastructure services (databases, caches) have no dependencies.
2. Brokers depend on their coordinators (Kafka depends on Zookeeper).
3. Application services depend on all infrastructure services they connect to.
4. Test runner services depend on the application service.

### 4.4 — Add Startup Timeout Configuration

For services that need extended startup time, adjust `start_period`:
- Databases: 10-15 seconds.
- Message brokers: 20-30 seconds.
- Elasticsearch: 30-60 seconds.
- Application with migrations: 20-30 seconds.

### 4.5 — Write Updated Compose File

Save the updated `docker-compose.test.yml` with all health checks and dependency orderings applied.

### Save Progress

Append to {outputFile}:

```markdown
## Status: step-04-health-checks COMPLETE

## Health Check Summary
| Service | Health Check Command | Interval | Retries | Start Period |
|---|---|---|---|---|
| [service] | [command] | [interval] | [retries] | [start_period] |

## Dependency Chain
- [service] depends on: [list]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Every service has a health check with appropriate test command, interval, timeout, retries, and start_period. Dependency chain is acyclic and uses `service_healthy` conditions. Compose file is valid YAML after modifications.
### FAILURE: Any service lacks a health check. Dependency chain has cycles. `depends_on` uses `service_started` instead of `service_healthy`. Invalid YAML after edits.
