---
name: 'step-02-design-test-strategy'
description: 'Design risk-based API test strategy'
nextStepFile: './step-03-generate-tests.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 2: Design Test Strategy — Risk-Based API Test Planning

## STEP GOAL

Design a comprehensive API test strategy using risk-based prioritization. Classify every endpoint by risk level, define test types and coverage targets, and produce a test plan that Step 3 will use to generate test files.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if endpoint inventory from Step 1 is missing or empty.
- Every endpoint must be classified and assigned test coverage.
- Prioritize by risk, not by alphabetical order or discovery order.

## CONTEXT BOUNDARIES

- Available context: Step 1 detection results from `{test_artifacts}/workflow-progress.md`, knowledge fragments (risk-based-testing, api-testing-fundamentals).
- Focus: strategy design only. Do not write test code in this step.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 2.1 — Load Preflight Results

Read `{test_artifacts}/workflow-progress.md` and extract:
- Complete endpoint inventory.
- API framework and style.
- Authentication type and roles.
- Test framework and existing tests.
- External dependencies.

**If progress file is missing or Step 1 is not marked COMPLETE:**
- **HALT** — return to Step 1.

### 2.2 — Classify Endpoints by Risk

Assign a risk level to each endpoint based on these criteria:

**Critical Risk — Failure causes data loss, security breach, or revenue impact:**
- Authentication endpoints (login, register, password reset, token refresh).
- Payment/billing endpoints.
- Data mutation on core entities (create, update, delete users/orders/etc.).
- Admin privilege escalation paths.
- Endpoints handling PII or sensitive data.

**High Risk — Failure significantly impacts user experience:**
- Data retrieval for primary entities (list, get by ID).
- Search and filtering endpoints.
- File upload/download.
- Webhook receivers.
- Endpoints with complex business logic.

**Medium Risk — Failure impacts secondary features:**
- Admin-only endpoints.
- Reporting and analytics endpoints.
- Notification endpoints.
- Configuration/settings endpoints.
- Bulk operations.

**Low Risk — Failure has minimal impact:**
- Health check and status endpoints.
- Version/info endpoints.
- Documentation endpoints.
- Internal tooling endpoints.

### 2.3 — Define Test Types per Risk Level

Map test coverage depth to risk level:

| Test Type | Critical | High | Medium | Low |
|---|---|---|---|---|
| Happy path (valid request, expected response) | Required | Required | Required | Required |
| Input validation (missing/invalid fields) | Required | Required | Optional | Skip |
| Authentication (with/without valid token) | Required | Required | Required | Skip |
| Authorization (role-based access) | Required | Required | Optional | Skip |
| Error responses (4xx/5xx) | Required | Required | Optional | Skip |
| Boundary values (min/max/empty) | Required | Required | Optional | Skip |
| Injection patterns (SQLi, XSS) | Required | Optional | Skip | Skip |
| Response schema validation | Required | Required | Required | Optional |
| Concurrency / race conditions | Optional | Optional | Skip | Skip |
| Performance baseline | Optional | Optional | Skip | Skip |

### 2.4 — Design Test File Structure

Plan the test file organization based on the detected framework conventions:

```
{test_dir}/api/
  config/
    test.config.{ext}          # Base URL, timeouts, environment
    fixtures.{ext}             # Test data factories
  helpers/
    request.{ext}              # HTTP client wrapper with defaults
    auth.{ext}                 # Token generation and auth helpers
    assertions.{ext}           # Custom response assertions
    cleanup.{ext}              # Test data cleanup utilities
  resources/
    {resource-name}.test.{ext} # One file per API resource
  auth/
    authentication.test.{ext}  # Auth flow tests
    authorization.test.{ext}   # RBAC tests
  edge-cases/
    validation.test.{ext}      # Input validation tests
    error-handling.test.{ext}  # Error response tests
    boundaries.test.{ext}      # Boundary value tests
```

### 2.5 — Design Shared Test Infrastructure

Plan the helper modules:

**Request Builder:**
- Centralized HTTP client with base URL from configuration.
- Default headers (Content-Type, Accept).
- Request/response logging for debugging.
- Configurable timeouts.

**Auth Helper:**
- Token generation for each role.
- Token caching to avoid repeated auth calls during tests.
- Expired token generation for negative tests.
- Auth header injection into requests.

**Assertion Library:**
- Status code assertions with descriptive messages.
- Response body schema validation.
- Header presence and value assertions.
- Error response structure validation.
- Pagination structure validation.

**Cleanup Utility:**
- Track created entities during tests.
- Teardown function to delete created entities after each test.
- Database reset strategy (if direct DB access is available).

### 2.6 — Define Test Data Strategy

Plan test data management:

- **Factories**: Functions that generate valid entity data with optional overrides.
- **Unique identifiers**: Use timestamps or UUIDs to avoid collisions in parallel runs.
- **Minimal data**: Each test creates only the data it needs.
- **Cleanup**: Every created entity is tracked and deleted in teardown.

For each resource, define:
- A valid creation payload (all required fields).
- An invalid payload (missing required fields).
- Boundary payloads (empty strings, max lengths, special characters).

### 2.7 — Compile Test Plan

Create the final test plan document:

```markdown
## Test Plan

### Coverage Summary
- Total endpoints: [count]
- Critical: [count] endpoints, [count] tests planned
- High: [count] endpoints, [count] tests planned
- Medium: [count] endpoints, [count] tests planned
- Low: [count] endpoints, [count] tests planned
- Total tests planned: [count]

### Test Files to Generate
1. [file path] — [description, test count]
   ...

### Endpoint Coverage Matrix
| Endpoint | Risk | Happy Path | Validation | Auth | Error | Edge Cases |
|---|---|---|---|---|---|---|
| [for each endpoint] |

### Shared Infrastructure
- Request builder: [details]
- Auth helper: [details]
- Assertions: [details]
- Cleanup: [details]

### Test Data Factories
- [resource]: [fields and generation strategy]
```

### Save Progress

Append the test plan to {outputFile}:

```markdown
## Status: step-02-design-test-strategy COMPLETE

## Test Strategy
[complete test plan from 2.7]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Every endpoint classified by risk level. Test types assigned per risk level. Test file structure designed. Shared infrastructure planned. Test data strategy defined. Complete coverage matrix produced.
### FAILURE: Endpoints missing risk classification. No test type mapping. Test plan has gaps in critical endpoints. Shared infrastructure not planned.
