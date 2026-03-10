# QA Environment Skill: AI-Powered Docker Test Environment Generation

**"Works on my machine" is not a test strategy. Containerize your test environment.**

---

## The Problem

Your tests need a database, a Redis cache, maybe a message queue. Setting this up locally is different on every machine. CI is different again. Tests fail because of environment differences, not code bugs.

## What qa-env Does

The `qa-env` skill turns any AI agent into a DevOps architect that generates a complete, reproducible Docker-based test environment matching your production topology.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Discovery
The agent detects your full dependency tree:
- Application framework and language
- Databases (PostgreSQL, MySQL, MongoDB, etc.)
- Caches (Redis, Memcached)
- Message queues (RabbitMQ, Kafka)
- Search engines (Elasticsearch)
- Existing Docker/compose configuration

### Step 2 — Environment Blueprint
Every service mapped with health checks and resource limits:

| Service | Image | Health Check | Data Strategy |
|---------|-------|-------------|---------------|
| PostgreSQL | `postgres:16-alpine` | `pg_isready` | tmpfs (fast, disposable) |
| Redis | `redis:7-alpine` | `redis-cli ping` | tmpfs |
| RabbitMQ | `rabbitmq:3-alpine` | `rabbitmq-diagnostics` | tmpfs |
| App | Multi-stage build | HTTP `/health` | — |

### Step 3 — You Approve the Plan
Review the service topology before anything is generated.

### Step 4 — Generated Files

**docker-compose.test.yml:**
```yaml
services:
  app:
    build:
      context: .
      target: test
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://test:test@postgres:5432/testdb
      - REDIS_URL=redis://redis:6379
    networks:
      - test-network

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    tmpfs: /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 2s
      timeout: 5s
      retries: 10
    networks:
      - test-network

networks:
  test-network:
    driver: bridge
```

**test-env.sh** — one-command helper:
```bash
./test-env.sh up      # Start environment
./test-env.sh run     # Run tests
./test-env.sh reset   # Reset databases
./test-env.sh logs    # View service logs
./test-env.sh down    # Tear down everything
```

**.env.test** — test-specific configuration (no production secrets).

### Step 5 — Database Init Scripts
Seed scripts for test data, migrations, and schema setup — all automated on container start.

### Step 6 — Validation Checklist

```
Check                           | Status
Health checks on all services   |  ✓
Pinned image versions (no latest)|  ✓
No secrets in docker-compose     |  ✓
tmpfs for database storage       |  ✓
Isolated test network            |  ✓
Multi-stage build for app        |  ✓
```

## Key Features

- **Alpine images** — small, fast to pull
- **Pinned versions** — `postgres:16-alpine`, never `latest`
- **Health checks** — tests wait until services are truly ready
- **tmpfs storage** — databases run in memory (fast, auto-cleanup)
- **Isolated network** — test environment doesn't interfere with anything else
- **No secrets exposed** — test credentials only, never production
- **One-command operation** — `./test-env.sh up && ./test-env.sh run`

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-env` prompt with your AI agent. Reproducible test environments in minutes.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
