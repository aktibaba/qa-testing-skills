---
name: 'step-01-preflight'
description: 'Map service dependencies and detect integration points'
nextStepFile: './step-02-design-strategy.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1: Preflight — Service Discovery and Integration Point Mapping

## STEP GOAL
Analyze the project architecture to identify all services, their dependencies, integration points (APIs, databases, message queues, external services), and establish the foundation for integration test planning.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Do NOT generate any test files in this step — discovery only
- Map every integration boundary, not just the obvious ones

## CONTEXT BOUNDARIES
- Available context: project source tree, configuration files, Docker/compose files, dependency manifests
- Required knowledge fragments: `docker-test-env` (01), `docker-compose-patterns` (02), `microservice-testing` (31)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 1.1 — Detect Project Stack

If `{test_stack_type}` is `auto`, determine the stack type:

**Scan for indicators:**
- **Language/Runtime:** `package.json` (Node), `requirements.txt`/`pyproject.toml` (Python), `go.mod` (Go), `pom.xml`/`build.gradle` (Java/Kotlin), `Cargo.toml` (Rust), `Gemfile` (Ruby), `*.csproj` (.NET)
- **Framework:** Express, FastAPI, Django, Spring Boot, Gin, Rails, ASP.NET
- **Architecture:** Monolith vs. microservices (multiple service directories, multiple Dockerfiles)

Record: `stack_type: <detected>`, `language: <detected>`, `framework: <detected>`

### 1.2 — Map Service Architecture

Build a service dependency map:

**For monoliths:**
- Identify the application and its external dependencies
- Map database connections (connection strings, ORM config)
- Map external API calls (HTTP clients, SDK integrations)
- Map message queue connections (producer/consumer code)
- Map file storage connections (S3, local filesystem)
- Map cache connections (Redis, Memcached)

**For microservices:**
- Identify each service (from Docker Compose, Kubernetes manifests, or directory structure)
- Map service-to-service communication (HTTP, gRPC, message queue)
- Identify shared databases vs. per-service databases
- Map API gateways, load balancers, service mesh config
- Identify event buses and shared message topics

**Output format:**
```
Service Dependency Map:
┌─────────────┐     HTTP      ┌─────────────┐
│  API Server  │──────────────▶│  Auth Service │
└──────┬──────┘               └──────────────┘
       │ SQL
       ▼
┌─────────────┐     Publish   ┌──────────────┐
│  PostgreSQL  │              │  RabbitMQ     │
└─────────────┘               └──────┬───────┘
                                     │ Consume
                              ┌──────▼───────┐
                              │  Email Worker  │
                              └──────────────┘
```

### 1.3 — Catalog Integration Points

For each integration boundary, record:

| # | Source | Target | Protocol | Auth | Data Format | Error Handling |
|---|--------|--------|----------|------|-------------|----------------|
| 1 | API    | PostgreSQL | SQL/ORM | conn string | relational | exceptions |
| 2 | API    | Auth Svc | HTTP/REST | JWT | JSON | HTTP codes |
| 3 | API    | RabbitMQ | AMQP | credentials | JSON | DLQ |
| 4 | API    | Stripe | HTTP/REST | API key | JSON | webhook retry |
| ... | ... | ... | ... | ... | ... | ... |

Classify each as:
- **Internal** — Between services you own (test with real instances)
- **External** — Third-party services you do not own (test with mocks/stubs)

### 1.4 — Detect Existing Test Infrastructure

Check for existing integration test setup:

- **Test directories:** `tests/integration/`, `__tests__/integration/`, `src/test/integration/`
- **Docker test config:** `docker-compose.test.yml`, `docker-compose.ci.yml`
- **Testcontainers usage:** Look for Testcontainers imports in existing tests
- **Mock services:** Existing mock servers, WireMock configs, Pact files
- **Test database config:** Separate test database configuration

### 1.5 — Assess API Contracts

Check for existing API contracts:

- **OpenAPI/Swagger:** `openapi.yaml`, `swagger.json`, `docs/api/`
- **GraphQL schemas:** `schema.graphql`, `*.graphql` files
- **Protobuf definitions:** `*.proto` files
- **AsyncAPI:** `asyncapi.yaml` (for event-driven APIs)
- **Pact contracts:** `pacts/` directory

If no contracts exist, flag this as a gap to address in Step 2.

### 1.6 — Docker/Container Readiness

Assess container infrastructure for testing:

- Is Docker available? Check `{use_docker}` setting
- Does `docker-compose.yml` exist? What services does it define?
- Are there health check endpoints for each service?
- Can services be started independently?
- What is the startup time for the full stack?

### Save Progress

Save the following to {outputFile}:

```markdown
# Integration Testing Workflow Progress

## Status: Step 1 Complete — Preflight

## Detected Configuration
- Stack Type: <value>
- Language: <value>
- Framework: <value>
- Architecture: monolith / microservices

## Service Dependency Map
<ASCII diagram or structured list>

## Integration Points
| # | Source | Target | Protocol | Type | Priority |
|---|--------|--------|----------|------|----------|
| ...

## API Contracts
- OpenAPI: <found/missing>
- GraphQL: <found/missing>
- Protobuf: <found/missing>
- Pact: <found/missing>

## Existing Test Infrastructure
- Integration test files: <count>
- Docker test config: <yes/no>
- Mock services: <list>

## Docker Readiness
- Docker available: <yes/no>
- Compose file: <path or missing>
- Health checks: <status>

## Next Step: step-02-design-strategy.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: Stack detected, service dependency map with at least 2 integration points identified, each point classified as internal/external, API contract status assessed, Docker readiness evaluated
### FAILURE: Stack not detected, no integration points mapped, Docker availability not assessed
