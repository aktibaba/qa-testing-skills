---
name: 'qa-int-checklist'
description: 'Integration Test Quality Checklist'
---

# Integration Test Quality Checklist

Use this checklist to score existing or newly generated integration test suites. Each item is scored PASS / FAIL / N/A.

---

## 1. Service Boundaries

- [ ] **1.1** Each integration test clearly identifies the two (or more) systems being tested together
- [ ] **1.2** Tests target the actual interface (HTTP endpoint, DB query, message queue) — not internal implementation details
- [ ] **1.3** Service dependencies are documented in test file headers (what calls what)
- [ ] **1.4** Tests cover both the consumer side and the provider side of each integration point
- [ ] **1.5** Internal service interactions use real instances (via Docker/Testcontainers); external third-party services use mocks

## 2. Contract Testing

- [ ] **2.1** API contracts (OpenAPI, GraphQL schema, Protobuf) exist for service interfaces
- [ ] **2.2** Integration tests validate request format, headers, and authentication match the contract
- [ ] **2.3** Integration tests validate response format, status codes, and payload structure match the contract
- [ ] **2.4** Breaking contract changes are detected before deployment (consumer-driven contract tests or schema validation)
- [ ] **2.5** Contract version compatibility is tested when multiple API versions coexist

## 3. Data Flow

- [ ] **3.1** Data transformation across service boundaries is explicitly tested (input → processing → output)
- [ ] **3.2** Database integration tests use real database instances with migrations applied (not in-memory fakes for SQL databases)
- [ ] **3.3** Test data is seeded explicitly at the start of each test — no reliance on pre-existing data
- [ ] **3.4** Data cleanup occurs after each test (transaction rollback, deletion, or container reset)
- [ ] **3.5** Data format edge cases are tested: empty payloads, max-length fields, Unicode, null values, nested objects
- [ ] **3.6** Pagination, filtering, and sorting are tested with realistic data volumes (not just 1-2 records)

## 4. Error Propagation

- [ ] **4.1** Tests verify how errors from downstream services propagate to upstream consumers
- [ ] **4.2** HTTP error codes are tested: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- [ ] **4.3** Timeout behavior is tested: what happens when a dependent service is slow or unresponsive
- [ ] **4.4** Circuit breaker or retry behavior is validated (if implemented)
- [ ] **4.5** Error responses include meaningful error messages and error codes — not just status numbers
- [ ] **4.6** Partial failure scenarios are tested: one service in a chain fails, others handle gracefully

## 5. Authentication and Authorization

- [ ] **5.1** Tests verify that unauthenticated requests are rejected with appropriate status codes
- [ ] **5.2** Tests verify role-based access: admin vs. regular user vs. service-to-service
- [ ] **5.3** Token expiration and refresh flows are tested
- [ ] **5.4** Service-to-service authentication (API keys, mutual TLS, service tokens) is validated
- [ ] **5.5** CORS and security headers are verified in cross-origin scenarios

## 6. Asynchronous Integrations

- [ ] **6.1** Message queue integrations (RabbitMQ, Kafka, SQS) have dedicated tests for publish and consume
- [ ] **6.2** Webhook delivery is tested with a mock receiver that validates payload and headers
- [ ] **6.3** Event ordering and idempotency are tested (duplicate events, out-of-order delivery)
- [ ] **6.4** Dead letter queue behavior is tested for failed message processing
- [ ] **6.5** Async operations have appropriate wait strategies (polling, event listeners) — not sleep-based

## 7. Test Environment

- [ ] **7.1** Docker Compose or Testcontainers configuration exists for all required services
- [ ] **7.2** Test environment starts cleanly from scratch (no manual setup steps)
- [ ] **7.3** Service health checks are used before running tests (wait for DB ready, API responding)
- [ ] **7.4** Test environment is torn down after test runs — no lingering containers or data
- [ ] **7.5** Environment variables and secrets are managed via `.env.test` files (not hardcoded)
- [ ] **7.6** Test environment mirrors production topology (same database engine, same message broker)

## 8. Test Organization

- [ ] **8.1** Integration tests are separated from unit tests (different directory or test tag)
- [ ] **8.2** Tests can run independently — no dependency on execution order
- [ ] **8.3** Test files are named by integration boundary (e.g., `user-service-db.test.ts`, `order-api-payment.test.ts`)
- [ ] **8.4** Shared fixtures and helpers are in a dedicated directory
- [ ] **8.5** CI pipeline runs integration tests in a separate stage from unit tests

---

## SCORING

| Rating         | Criteria                                        |
|----------------|-------------------------------------------------|
| **EXCELLENT**  | 90-100% PASS across all sections                |
| **GOOD**       | 75-89% PASS, no FAIL in sections 1-2            |
| **NEEDS WORK** | 50-74% PASS or any FAIL in section 1            |
| **POOR**       | Below 50% PASS                                  |
