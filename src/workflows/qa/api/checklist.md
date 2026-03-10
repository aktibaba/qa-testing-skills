# API Workflow — Validation Checklist

Use this checklist to validate the generated API test suite. Each item must pass for the test suite to be considered production-ready.

---

## Test Structure

- [ ] **PASS/FAIL** — Test files exist in organized directory structure under `{test_dir}/api/`
- [ ] **PASS/FAIL** — Each API resource has a dedicated test file
- [ ] **PASS/FAIL** — Shared helpers and utilities are in a `helpers/` directory
- [ ] **PASS/FAIL** — Test configuration is centralized (base URL, timeouts, auth)
- [ ] **PASS/FAIL** — Test data fixtures are defined separately from test logic

## Test Naming and Readability

- [ ] **PASS/FAIL** — Test names follow "should [behavior] when [condition]" pattern
- [ ] **PASS/FAIL** — Test groups/describe blocks map to endpoints or features
- [ ] **PASS/FAIL** — Each test has a single clear assertion purpose
- [ ] **PASS/FAIL** — No magic numbers or unexplained constants in test code

## Functional Coverage

- [ ] **PASS/FAIL** — All CRUD operations are tested for each resource
- [ ] **PASS/FAIL** — Happy path tests verify status code, response body structure, and data values
- [ ] **PASS/FAIL** — Response schema/contract is validated (not just status codes)
- [ ] **PASS/FAIL** — Pagination, filtering, and sorting are tested where applicable
- [ ] **PASS/FAIL** — Content-Type and Accept headers are verified

## Authentication and Authorization

- [ ] **PASS/FAIL** — Valid authentication flow produces expected tokens/sessions
- [ ] **PASS/FAIL** — Invalid credentials return 401 with appropriate error body
- [ ] **PASS/FAIL** — Expired/revoked tokens are rejected
- [ ] **PASS/FAIL** — Protected endpoints reject unauthenticated requests
- [ ] **PASS/FAIL** — Role-based access control is tested (if applicable)
- [ ] **PASS/FAIL** — Cross-tenant data isolation is verified (if multi-tenant)

## Error Handling

- [ ] **PASS/FAIL** — Missing required fields return 400/422 with field-level errors
- [ ] **PASS/FAIL** — Invalid data types return appropriate validation errors
- [ ] **PASS/FAIL** — Not found (404) responses are tested for invalid IDs
- [ ] **PASS/FAIL** — Method not allowed (405) is tested for unsupported HTTP methods
- [ ] **PASS/FAIL** — Server errors (5xx) are handled gracefully in test assertions

## Edge Cases and Boundaries

- [ ] **PASS/FAIL** — Empty string and null values are tested
- [ ] **PASS/FAIL** — Boundary values tested (min, max, zero, negative)
- [ ] **PASS/FAIL** — Special characters and Unicode in string fields
- [ ] **PASS/FAIL** — Large payloads are tested against size limits
- [ ] **PASS/FAIL** — SQL injection and XSS patterns are tested as rejected input

## Test Isolation

- [ ] **PASS/FAIL** — Each test is independent and can run in any order
- [ ] **PASS/FAIL** — Tests clean up created data (setup/teardown hooks)
- [ ] **PASS/FAIL** — No test relies on state from a previous test
- [ ] **PASS/FAIL** — Test data uses unique identifiers (timestamps, UUIDs)

## Test Infrastructure

- [ ] **PASS/FAIL** — Base URL is configurable via environment variable
- [ ] **PASS/FAIL** — Timeouts are configured and reasonable
- [ ] **PASS/FAIL** — HTTP client is shared via helper module
- [ ] **PASS/FAIL** — Authentication token generation is centralized
- [ ] **PASS/FAIL** — Custom assertions for common response patterns exist

## Documentation

- [ ] **PASS/FAIL** — Test run command is documented
- [ ] **PASS/FAIL** — Environment setup prerequisites are listed
- [ ] **PASS/FAIL** — Coverage report generation is documented
- [ ] **PASS/FAIL** — Known limitations or untested areas are documented

---

## Scoring

| Rating | Criteria |
|---|---|
| **GREEN** | All items pass |
| **YELLOW** | 1-4 non-critical items fail (missing edge cases or documentation) |
| **RED** | Any critical item fails (no auth tests, no error handling, tests not isolated, no functional coverage) |

Critical items: functional coverage for all resources, authentication tests, test isolation, error handling tests.
