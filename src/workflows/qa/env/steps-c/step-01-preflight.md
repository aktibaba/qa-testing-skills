---
name: 'step-01-preflight'
description: 'Detect project stack, check Docker availability, gather context'
nextStepFile: './step-02-design-environment.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1: Preflight — Stack Detection and Docker Verification

## STEP GOAL

Detect the project's technology stack, verify Docker is available and running, and gather all context needed to design the test environment.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if Docker is not available and cannot be resolved.
- Do not skip any detection phase even if the stack seems obvious.

## CONTEXT BOUNDARIES

- Available context: project root filesystem, config.yaml settings, system environment.
- Focus: detection and verification only. Do not generate any Docker files in this step.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 1.1 — Verify Container Runtime

Check that the configured container runtime is installed and operational:

```
docker --version        (or podman --version / nerdctl --version)
docker info             (verify daemon is running)
docker compose version  (verify Compose plugin is available)
```

**If Docker is not found:**
- Report the missing dependency.
- Provide installation links for the detected OS.
- **HALT** — do not proceed without a working container runtime.

**If Docker daemon is not running:**
- Suggest starting the daemon (`systemctl start docker`, Docker Desktop, etc.).
- **HALT** — do not proceed without a running daemon.

### 1.2 — Detect Project Stack

Scan the project root for technology indicators. Check files in this order:

| File | Indicates |
|---|---|
| `package.json` | Node.js — check for React, Next.js, Express, NestJS, Fastify |
| `requirements.txt` / `pyproject.toml` / `Pipfile` | Python — check for Django, Flask, FastAPI |
| `go.mod` | Go — check for Gin, Echo, Fiber, standard library |
| `pom.xml` / `build.gradle` | Java — check for Spring Boot, Quarkus, Micronaut |
| `Gemfile` | Ruby — check for Rails, Sinatra |
| `*.csproj` / `*.sln` | .NET — check for ASP.NET Core |
| `mix.exs` | Elixir — check for Phoenix |
| `Cargo.toml` | Rust — check for Actix, Axum, Rocket |

Record: `detected_language`, `detected_framework`, `detected_stack_type`.

### 1.3 — Detect Dependencies

Scan for external service dependencies:

**Databases:**
- Search for connection strings, ORM configurations, migration files.
- Look for: PostgreSQL, MySQL, MariaDB, MongoDB, SQLite, Redis, DynamoDB.

**Message Brokers:**
- Search for queue/topic configurations, consumer/producer patterns.
- Look for: RabbitMQ, Kafka, NATS, SQS, Redis Pub/Sub.

**Caches:**
- Search for cache client configurations.
- Look for: Redis, Memcached, Varnish.

**External Services:**
- Search for S3/MinIO clients, SMTP configurations, search engine clients.
- Look for: LocalStack, Mailhog, Elasticsearch, OpenSearch.

Record each dependency with: `service_name`, `version_hint`, `connection_config_location`.

### 1.4 — Detect Existing Docker Configuration

Check for existing Docker assets:

- `Dockerfile` or `Dockerfile.*` — existing build definitions.
- `docker-compose.yml` or `docker-compose.*.yml` — existing Compose files.
- `.dockerignore` — existing ignore patterns.
- `docker/` directory — organized Docker assets.

If an existing `docker-compose.test.yml` is found, flag it for Mode D (Edit) consideration.

### 1.5 — Detect Test Framework

Identify the test framework in use:

- Check test directories: `tests/`, `test/`, `__tests__/`, `spec/`, `*_test.go`.
- Check configuration files: `jest.config.*`, `pytest.ini`, `vitest.config.*`, `playwright.config.*`.
- Check test runner scripts in `package.json` scripts or `Makefile`.

Record: `detected_test_framework`, `test_directory`, `test_config_file`.

### 1.6 — Check Port Availability

Scan for commonly needed ports and check for conflicts:

- 5432 (PostgreSQL), 3306 (MySQL), 27017 (MongoDB)
- 6379 (Redis), 5672/15672 (RabbitMQ), 9092 (Kafka)
- 9200 (Elasticsearch), 1025/8025 (Mailhog), 4566 (LocalStack)

Record any ports already in use on the host.

### Save Progress

Save accumulated detection results to {outputFile}:

```markdown
# ENV Workflow Progress

## Status: step-01-preflight COMPLETE

## Detected Stack
- Language: {detected_language}
- Framework: {detected_framework}
- Stack Type: {detected_stack_type}
- Test Framework: {detected_test_framework}

## Detected Dependencies
- [list each dependency with version hint]

## Existing Docker Assets
- [list any existing Docker files]

## Port Conflicts
- [list any ports in use]

## Container Runtime
- Runtime: {container_runtime}
- Version: {runtime_version}
- Compose Version: {compose_version}
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Stack detected with at least language and one dependency identified. Docker runtime verified operational. All detection results recorded.
### FAILURE: Docker runtime not available. Project root is empty or inaccessible. No technology indicators found.
