---
name: 'step-01-validate'
description: 'Validate existing integration tests against the quality checklist'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1 (Validate): Validate — Full Quality Audit of Integration Tests

## STEP GOAL
Perform a comprehensive quality audit of the existing integration test suite by evaluating every item in the checklist, scoring each section, and producing a detailed report with actionable recommendations.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Evaluate EVERY item in the checklist — do not skip
- Read actual test files — do not guess based on file names
- Be honest and specific — cite file names and line numbers for FAIL items

## CONTEXT BOUNDARIES
- Available context: existing test files, Docker config, project source, `checklist.md`
- Required knowledge fragments: `contract-testing` (13), `docker-test-env` (01), `database-testing` (22), `webhook-testing` (23), `mock-stub-spy` (34), `test-isolation` (07), `microservice-testing` (31)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 1V.1 — Inventory Existing Tests

Build a complete inventory:

1. **Test files** — List all integration test files with line counts and test case counts
2. **Docker configuration** — Compose files, Dockerfiles for test services
3. **Mock definitions** — WireMock mappings, nock interceptors, Pact contracts
4. **Helpers** — Lifecycle helpers, factories, seed scripts
5. **Environment config** — `.env.test`, connection strings
6. **CI config** — Pipeline files referencing integration tests

### 1V.2 — Evaluate Checklist Section by Section

For each checklist section, read the relevant files and score each item:

**Section 1: Service Boundaries**
- Read all test file headers — do they identify the integration boundary?
- Check if tests target interfaces (endpoints, queries) or internal implementation
- Verify consumer and provider sides are both covered
- Check mock vs. real instance decisions

**Section 2: Contract Testing**
- Look for OpenAPI/GraphQL schema references in tests
- Check request format validation (headers, auth, body structure)
- Check response format validation (status codes, payload structure)
- Look for Pact or similar consumer-driven contract tests
- Check for contract version testing

**Section 3: Data Flow**
- Check data transformation tests across boundaries
- Verify database tests use real instances (not in-memory SQLite for PostgreSQL tests)
- Check seed data management — explicit seeding vs. assumed state
- Verify cleanup in afterEach/afterAll hooks
- Look for edge case testing (empty, max-length, Unicode, null)

**Section 4: Error Propagation**
- Search for error status code assertions (400, 401, 403, 404, 500)
- Check for timeout behavior tests
- Look for circuit breaker or retry tests
- Verify error responses include meaningful messages
- Check partial failure scenario tests

**Section 5: Authentication and Authorization**
- Check for unauthenticated request tests
- Look for role-based access tests
- Check token expiration tests
- Verify service-to-service auth testing

**Section 6: Asynchronous Integrations**
- Check for message queue publish/consume tests
- Look for webhook delivery/receipt tests
- Check idempotency tests
- Look for dead letter queue tests
- Verify wait strategies (event-based vs. sleep-based)

**Section 7: Test Environment**
- Review Docker Compose for health checks on ALL services
- Check if environment starts from scratch (no manual steps)
- Verify teardown removes all containers and data
- Check `.env.test` management
- Compare test environment to production topology

**Section 8: Test Organization**
- Check separation from unit tests
- Verify test independence (no order dependencies)
- Review file naming conventions
- Check for shared fixture directory
- Review CI pipeline stage configuration

### 1V.3 — Calculate Scores

For each section, calculate: `PASS count / (PASS + FAIL count)` (exclude N/A)

Overall score: weighted average (Sections 1-2 weighted 2x, others 1x)

Apply rating:
| Rating         | Criteria                              |
|----------------|---------------------------------------|
| **EXCELLENT**  | 90-100% PASS across all sections      |
| **GOOD**       | 75-89% PASS, no FAIL in sections 1-2  |
| **NEEDS WORK** | 50-74% PASS or any FAIL in section 1  |
| **POOR**       | Below 50% PASS                        |

### 1V.4 — Generate Remediation Plan

For each FAIL item, provide:

1. **What's wrong** — Specific issue with file:line reference
2. **Why it matters** — Risk introduced by the failure (e.g., "Undetected contract breaks could cause production outages")
3. **How to fix** — Concrete steps or code snippet to resolve
4. **Effort estimate** — Low (< 30 min), Medium (1-2 hours), High (half day+)

Prioritize fixes:
- **Quick wins** — Low effort, high impact
- **Important** — Medium effort, high impact
- **Nice to have** — Any effort, low impact

### 1V.5 — Present Results

```
Integration Test Quality Audit
═══════════════════════════════

Overall Score: <EXCELLENT/GOOD/NEEDS WORK/POOR> (<percentage>%)

Section Scores:
1. Service Boundaries:         <score>% <rating>
2. Contract Testing:           <score>% <rating>
3. Data Flow:                  <score>% <rating>
4. Error Propagation:          <score>% <rating>
5. Authentication & AuthZ:     <score>% <rating>
6. Async Integrations:         <score>% <rating>
7. Test Environment:           <score>% <rating>
8. Test Organization:          <score>% <rating>

Top Priority Fixes:
1. <fix description> — <file> — <effort>
2. ...

Quick Wins:
1. <fix description> — <file> — <effort>
2. ...

Coverage Gaps:
- <integration point without tests>
- ...
```

### Save Progress

Save to {outputFile}:

```markdown
# Integration Testing Workflow Progress — Validate Mode

## Status: VALIDATION COMPLETE

## Overall Score: <rating> (<percentage>%)

## Section Scores
<detailed scores>

## FAIL Items
<list with file:line references>

## Remediation Plan
### Quick Wins
<list>
### Important Fixes
<list>
### Nice to Have
<list>

## Test Suite Stats
- Total test files: <N>
- Total test cases: <N>
- Integration points covered: <N>
- Integration points missing: <N>
- Docker services: <N>
- Mock definitions: <N>
```

Load next step: Workflow complete. Return control to user.

## SUCCESS/FAILURE METRICS
### SUCCESS: Every checklist item evaluated with PASS/FAIL/N/A, scores calculated per section and overall, FAIL items have specific file:line references, remediation plan provided with effort estimates, coverage gaps identified
### FAILURE: Checklist items skipped, scores not calculated, FAIL items lack specificity, no remediation guidance
