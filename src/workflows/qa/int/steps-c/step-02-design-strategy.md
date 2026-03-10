---
name: 'step-02-design-strategy'
description: 'Define integration test strategy including contract vs. e2e approach and mock boundaries'
nextStepFile: './step-03-setup-test-env.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 2: Design Strategy — Integration Test Strategy

## STEP GOAL
Define the integration test strategy: decide which integration points get contract tests vs. full integration tests, establish mock boundaries, define the test layering approach, and produce a prioritized test plan.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Do NOT generate test files in this step — strategy only
- Every decision must have a rationale documented

## CONTEXT BOUNDARIES
- Available context: service map and integration points from Step 1
- Required knowledge fragments: `contract-testing` (13), `mock-stub-spy` (34), `risk-based-testing` (08), `microservice-testing` (31)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 2.1 — Define Test Layering

Establish which test type covers each integration boundary:

| Test Layer | Scope | Speed | Fidelity | Use When |
|------------|-------|-------|----------|----------|
| **Contract tests** | Interface schema only | Fast | Medium | APIs between teams, external providers |
| **Component integration** | Service + its direct dependencies | Medium | High | Service + database, service + cache |
| **Service integration** | Two or more services together | Slow | Very High | Critical service chains, payment flows |
| **End-to-end integration** | Full system | Slowest | Highest | Smoke tests, release gates only |

For each integration point from Step 1, assign a test layer:

| Integration Point | Test Layer | Rationale |
|-------------------|------------|-----------|
| API → PostgreSQL  | Component integration | Core data persistence, must test with real DB |
| API → Auth Service | Contract test | Stable interface, separate team ownership |
| API → Stripe | Contract test + mock | External, use recorded responses |
| API → RabbitMQ → Worker | Service integration | Critical async flow, test end-to-end |

### 2.2 — Establish Mock Boundaries

Define what gets mocked and what runs as real instances:

**Real instances (via Docker/Testcontainers):**
- Databases (PostgreSQL, MySQL, MongoDB, Redis)
- Message brokers you own (RabbitMQ, Kafka — if startup is fast)
- Internal services that are part of the test scope
- Cache layers (Redis, Memcached)

**Mocked/stubbed services:**
- Third-party APIs (Stripe, SendGrid, Twilio, AWS services)
- External services with rate limits or costs per call
- Services with slow startup or complex setup
- Services owned by other teams (use contract tests instead)

**Mock implementation strategy:**
| Service | Mock Tool | Approach |
|---------|-----------|----------|
| Stripe API | WireMock / nock / responses | Record-replay with contract validation |
| SendGrid | Mock HTTP server | Capture and assert payloads |
| AWS S3 | LocalStack or MinIO | Local container replica |
| External Auth | Custom mock server | Return configurable responses |

### 2.3 — Risk-Based Prioritization

Score each integration point (1-5 scale):

| Dimension | Score 1 | Score 5 |
|-----------|---------|---------|
| **Data sensitivity** | Logs, analytics | Financial, PII, auth |
| **Failure blast radius** | Feature degradation | System-wide outage |
| **Change frequency** | Stable, rarely changes | Frequently updated |

**Priority assignment:**
- **P0 (must test):** Risk score > 50, or involves financial/auth data
- **P1 (should test):** Risk score 20-50, involves user data
- **P2 (nice to have):** Risk score < 20, involves non-critical features

### 2.4 — Define Test Scenarios Per Integration Point

For each P0 and P1 integration point, define test scenarios:

**Pattern for API-to-Database:**
1. Create entity via API → verify persisted in DB
2. Read entity via API → verify correct data returned from DB
3. Update entity via API → verify DB state changed
4. Delete entity via API → verify removed from DB
5. Concurrent writes → verify no data corruption
6. Invalid data → verify validation error and no DB mutation
7. Connection failure → verify graceful error handling

**Pattern for API-to-API (internal):**
1. Happy path request → correct response
2. Auth failure → 401/403 propagated correctly
3. Target service down → timeout/circuit breaker behavior
4. Malformed response from target → graceful handling
5. Rate limiting → retry behavior

**Pattern for API-to-Message Queue:**
1. Action triggers message → verify message published with correct payload
2. Message consumed → verify side effect (DB write, email sent, etc.)
3. Duplicate message → verify idempotent handling
4. Poison message → verify dead letter queue routing
5. Queue unavailable → verify error handling

### 2.5 — Define Test Data Strategy

Plan test data management for integration tests:

1. **Database seeding:** SQL scripts, migration + seed, or programmatic factories
2. **API fixtures:** Recorded responses for external service mocks
3. **Message fixtures:** Sample messages for queue-based tests
4. **User/auth fixtures:** Test credentials and tokens
5. **Cleanup approach:** Transaction rollback, truncate tables, or container reset

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 2 Complete — Strategy Defined

## Test Layering
| Integration Point | Test Layer | Mock/Real |
|-------------------|------------|-----------|
| ...               | ...        | ...       |

## Mock Boundaries
### Real Instances
- <list>
### Mocked Services
- <list with mock tool>

## Priority Matrix
| Integration Point | Data | Blast Radius | Change Freq | Score | Priority |
|-------------------|------|-------------|-------------|-------|----------|
| ...               | ...  | ...         | ...         | ...   | ...      |

## Test Scenarios (P0)
### <Integration Point 1>
1. <scenario>
2. <scenario>
...

## Test Data Strategy
- DB seeding: <method>
- API mocks: <tool>
- Cleanup: <method>

## Next Step: step-03-setup-test-env.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: Every integration point assigned a test layer, mock boundaries clearly defined with tool choices, at least 3 P0 integration points with 4+ test scenarios each, test data strategy documented
### FAILURE: No test layering defined, mock boundaries unclear, fewer than 2 integration points prioritized, no test data strategy
