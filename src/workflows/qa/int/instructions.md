---
name: 'qa-int-instructions'
description: 'Integration Testing Workflow — Master instructions'
---

# Integration Testing Workflow — Instructions

## PURPOSE

This workflow produces production-grade integration test suites that verify interactions across service boundaries: APIs, databases, message queues, webhooks, and external services. Integration tests sit between unit tests and E2E tests — they validate that components work together correctly without requiring a full application stack.

## GUIDING PRINCIPLES

1. **Test at the boundary** — Integration tests verify the contract between two systems. Focus on the interface, not the internal implementation. Test what crosses the wire.

2. **Isolate the system under test** — Use test doubles (mocks, stubs, fakes) for external services you do not own. Use real instances (via Docker) for services you do own.

3. **Contract-first thinking** — If an API contract (OpenAPI, GraphQL schema, Protobuf) exists, test against it. If it does not exist, define one as part of the testing effort.

4. **Real databases, fake externals** — Use real database instances (via Docker) with migrations applied. Mock third-party APIs (Stripe, SendGrid, etc.) with contract-based stubs.

5. **Idempotent tests** — Every integration test must be repeatable. Use transactions, database seeding, or container resets to ensure clean state.

6. **Error propagation matters** — Test not just happy paths but how errors propagate across boundaries. A 500 from Service B should produce a meaningful error in Service A.

7. **Webhook and event tests are not optional** — If the system uses webhooks, message queues, or event-driven patterns, these must have dedicated integration tests.

## STACK DETECTION LOGIC

When `{test_stack_type}` is `auto`, detect the project type:

1. **Backend indicators:** `src/main/java`, `cmd/`, `app/`, `manage.py`, `Gemfile`, `go.mod`, `Cargo.toml`
2. **Frontend indicators:** `package.json` with React/Vue/Angular, `src/components/`
3. **Fullstack indicators:** Both backend and frontend indicators present
4. **Microservices indicators:** Multiple `Dockerfile`s, `docker-compose.yml` with multiple services, gateway/proxy config

Determine integration test framework by stack:
- **Node.js:** Jest, Vitest, Mocha with supertest
- **Python:** pytest with httpx/requests
- **Java/Kotlin:** JUnit 5 with Spring Boot Test, Testcontainers
- **Go:** go test with testcontainers-go
- **.NET:** xUnit with WebApplicationFactory, Testcontainers
- **Ruby:** RSpec with VCR, Webmock

## OUTPUT STANDARDS

- All test files must clearly separate setup, execution, and assertion phases
- Each test file must have a header comment explaining the integration boundary tested
- External service mocks must be defined in a shared `mocks/` or `stubs/` directory
- Docker Compose test configuration must be separate from production compose files
- Test data setup must be explicit — no reliance on pre-existing database state

## ARTIFACT TRACKING

All progress is tracked in `{test_artifacts}/workflow-progress.md`. This file records:
- Current step and status
- Detected configuration and service map
- Generated files list
- Validation results
- Any blockers or decisions needed

## KNOWLEDGE FRAGMENTS

Relevant fragments from qa-index.csv:
- `contract-testing` (13) — Consumer-driven contract testing
- `docker-test-env` (01) — Docker-based test environments
- `docker-compose-patterns` (02) — Multi-service compose patterns
- `database-testing` (22) — Database testing patterns
- `webhook-testing` (23) — Webhook and event testing
- `mock-stub-spy` (34) — Mock and stub patterns
- `test-isolation` (07) — Test isolation
- `test-data-management` (06) — Data management strategies
- `microservice-testing` (31) — Microservice testing patterns
- `error-handling-testing` (35) — Error path testing
