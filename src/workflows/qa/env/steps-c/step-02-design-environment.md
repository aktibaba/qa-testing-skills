---
name: 'step-02-design-environment'
description: 'Design Docker Compose services based on project needs'
nextStepFile: './step-03-generate-compose.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 2: Design Environment — Docker Compose Architecture

## STEP GOAL

Design a complete Docker Compose service architecture tailored to the detected project stack and its dependencies. Produce a service blueprint that Step 3 will use to generate files.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if preflight data from Step 1 is missing or incomplete.
- Every design decision must be justified by a detected dependency, not assumed.

## CONTEXT BOUNDARIES

- Available context: Step 1 detection results from `{test_artifacts}/workflow-progress.md`.
- Focus: architecture design only. Do not write any Docker files in this step.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 2.1 — Load Preflight Results

Read `{test_artifacts}/workflow-progress.md` and extract:
- Detected language, framework, stack type.
- List of dependencies with version hints.
- Existing Docker assets.
- Port conflict information.

**If progress file is missing or Step 1 is not marked COMPLETE:**
- **HALT** — return to Step 1.

### 2.2 — Design Application Service

Define the application container:

**For interpreted languages (Node.js, Python, Ruby):**
- Use the official language image with a pinned minor version (e.g., `node:20-alpine`).
- Mount source code as a volume for test execution.
- Set working directory and install dependencies at build time.

**For compiled languages (Go, Java, Rust, .NET):**
- Use multi-stage build: builder stage compiles, runtime stage runs tests.
- Copy compiled test binary or use the build tool's test command.

**For all applications:**
- Set `restart: "no"` (test containers should not auto-restart).
- Define resource limits: `mem_limit`, `cpus`.
- Configure logging: `driver: json-file` with `max-size: 10m`.

### 2.3 — Design Database Services

For each detected database dependency, define a service:

| Database | Image | Health Check | Init Strategy |
|---|---|---|---|
| PostgreSQL | `postgres:16-alpine` | `pg_isready -U $POSTGRES_USER` | Init scripts in `/docker-entrypoint-initdb.d/` |
| MySQL | `mysql:8.0` | `mysqladmin ping -h localhost` | Init scripts in `/docker-entrypoint-initdb.d/` |
| MariaDB | `mariadb:11` | `healthcheck.sh --connect` | Init scripts in `/docker-entrypoint-initdb.d/` |
| MongoDB | `mongo:7` | `mongosh --eval 'db.runCommand("ping")'` | Init scripts in `/docker-entrypoint-initdb.d/` |
| Redis | `redis:7-alpine` | `redis-cli ping` | Append-only file or RDB snapshot |
| SQLite | N/A (file-based) | N/A | File mount or in-memory |

Design decisions for each:
- Use `tmpfs` for the data directory when test isolation requires it.
- Define test-specific credentials (non-production).
- Map to offset ports (e.g., PostgreSQL on 15432 instead of 5432) to avoid host conflicts.

### 2.4 — Design Supporting Services

For each detected supporting dependency:

| Service | Image | Purpose | Health Check |
|---|---|---|---|
| RabbitMQ | `rabbitmq:3-management-alpine` | Message broker | `rabbitmq-diagnostics -q ping` |
| Kafka | `confluentinc/cp-kafka:7.5.0` | Event streaming | `kafka-broker-api-versions --bootstrap-server localhost:9092` |
| Zookeeper | `confluentinc/cp-zookeeper:7.5.0` | Kafka coordination | `echo ruok \| nc localhost 2181` |
| Elasticsearch | `elasticsearch:8.11.0` | Search engine | `curl -s http://localhost:9200/_cluster/health` |
| Mailhog | `mailhog/mailhog:v1.0.1` | SMTP testing | `wget -q --spider http://localhost:8025` |
| LocalStack | `localstack/localstack:3` | AWS service mocks | `curl -s http://localhost:4566/_localstack/health` |
| MinIO | `minio/minio:latest` | S3-compatible storage | `curl -f http://localhost:9000/minio/health/live` |
| Memcached | `memcached:1.6-alpine` | Caching | `echo stats \| nc localhost 11211` |

### 2.5 — Design Network Topology

Create a dedicated test network:

```yaml
networks:
  test-network:
    name: test-network
    driver: bridge
```

All services must connect to this network. No service should use the default bridge.

### 2.6 — Design Volume Strategy

Define volumes based on data lifecycle:

- **Ephemeral data** (database state between tests): Use `tmpfs` mounts.
- **Seed data** (initialization scripts, fixtures): Use bind mounts from project.
- **Persistent test artifacts** (logs, reports): Use named volumes or bind mounts to `{test_artifacts}`.

### 2.7 — Design Environment Variables

Plan the `.env.test` file structure:

```
# Database
TEST_DB_HOST=test-postgres
TEST_DB_PORT=5432
TEST_DB_NAME=test_db
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_password

# Redis
TEST_REDIS_HOST=test-redis
TEST_REDIS_PORT=6379

# Application
NODE_ENV=test
APP_PORT=3001
LOG_LEVEL=debug
```

All connection references must use container service names, not `localhost`.

### 2.8 — Compile Service Blueprint

Create the final service blueprint document listing:
- Each service with its image, ports, volumes, environment, health check, and dependencies.
- The network configuration.
- The volume definitions.
- The environment variable file structure.

### Save Progress

Append the service blueprint to {outputFile}:

```markdown
## Status: step-02-design-environment COMPLETE

## Service Blueprint
### Services
- [service-name]: image, ports, health check, depends_on
  ...

### Network: test-network (bridge)

### Volumes
- [volume definitions]

### Environment Variables (.env.test)
- [variable list]

### Port Mapping
- [host:container port pairs, avoiding conflicts]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Complete service blueprint produced with all detected dependencies covered. Each service has image, health check, and port mapping defined. Network and volume strategy documented.
### FAILURE: Missing services for detected dependencies. No health check strategy. Port conflicts unresolved.
