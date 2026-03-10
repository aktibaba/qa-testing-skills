---
name: 'step-06-validate-and-summary'
description: 'Validate generated integration test suite and produce final summary'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 6: Validate and Summarize — Final Quality Check

## STEP GOAL
Validate the complete integration test suite against the quality checklist, generate a summary report, and provide the user with execution instructions and CI integration guidance.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Run the full checklist — do not skip sections
- Be honest about gaps — do not mark items PASS if uncertain

## CONTEXT BOUNDARIES
- Available context: all generated files from Steps 3-5, checklist.md
- Required knowledge fragments: `ci-pipeline-testing` (18), `ci-quality-gates` (19), `flaky-test-management` (21)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 6.1 — Run Quality Checklist

Evaluate every item in `checklist.md` against the generated test suite:

1. **Service Boundaries (1.1-1.5)** — Review test files for clear boundary identification
2. **Contract Testing (2.1-2.5)** — Check contract validation coverage
3. **Data Flow (3.1-3.6)** — Verify data integrity and edge case testing
4. **Error Propagation (4.1-4.6)** — Verify error path coverage across boundaries
5. **Authentication (5.1-5.5)** — Check auth and authorization test coverage
6. **Asynchronous Integrations (6.1-6.5)** — Verify webhook and message queue test coverage
7. **Test Environment (7.1-7.6)** — Verify Docker config, health checks, cleanup
8. **Test Organization (8.1-8.5)** — Review naming, independence, structure

Record PASS / FAIL / N/A for each item with brief justification.

### 6.2 — Calculate Coverage Summary

| Metric                        | Value   |
|-------------------------------|---------|
| Total test files               | N       |
| Total test cases               | N       |
| P0 integration points covered  | N / N   |
| P1 integration points covered  | N / N   |
| API contract tests              | N       |
| Database integration tests      | N       |
| Service-to-service tests        | N       |
| External service mock tests     | N       |
| Webhook/event tests             | N       |
| Error propagation tests         | N       |

### 6.3 — Identify Gaps and Recommendations

List areas needing attention:

- **Missing coverage:** Integration points without tests
- **Contract gaps:** Services without formal API contracts
- **Error scenarios:** Untested failure modes
- **Environment gaps:** Services not yet containerized
- **Data edge cases:** Untested data format scenarios
- **Performance considerations:** Expected test suite execution time

### 6.4 — Generate Run Commands

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d --wait

# Run all integration tests
npm run test:integration
# or
npx jest --config jest.integration.config.ts
# or
pytest tests/integration/ -v

# Run specific test file
npx jest specs/api/users.contract.test.ts

# Run with verbose output
npx jest --verbose --forceExit tests/integration/

# Tear down environment
docker compose -f docker-compose.test.yml down -v

# One-command run (start, test, stop)
./scripts/test-integration.sh
```

### 6.5 — CI Pipeline Configuration

**GitHub Actions:**
```yaml
integration-tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_DB: testdb
        POSTGRES_USER: testuser
        POSTGRES_PASSWORD: testpass
      ports:
        - 5433:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
    redis:
      image: redis:7-alpine
      ports:
        - 6380:6379
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - run: npm ci
    - run: npm run db:migrate:test
      env:
        DATABASE_URL: postgresql://testuser:testpass@localhost:5433/testdb

    - name: Run Integration Tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://testuser:testpass@localhost:5433/testdb
        REDIS_URL: redis://localhost:6380
        CI: true

    - name: Upload Test Report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: integration-test-report
        path: test-artifacts/
        retention-days: 14
```

### 6.6 — Maintenance Guide

1. **Adding new integration points:** Map the boundary first (Step 1 pattern), then decide mock vs. real (Step 2), then write tests
2. **When APIs change:** Update contract tests first, then update mock definitions, then run full suite
3. **When Docker images are updated:** Pin specific versions in compose file, test with new version in a branch
4. **Handling flaky integration tests:** Check for timing issues first (add proper waits), then check for data leakage between tests, use `--forceExit` as last resort
5. **Scaling test execution:** Use Testcontainers for per-test containers, or Docker Compose with parallel test files
6. **Mock maintenance:** When external service APIs change, update mock definitions and fixture files

### Save Progress

Finalize {outputFile}:

```markdown
## Status: WORKFLOW COMPLETE

## Quality Score
- Checklist result: <EXCELLENT/GOOD/NEEDS WORK/POOR>
- Pass rate: <N>/<total> items

## Coverage Summary
<table from 6.2>

## Gaps and Recommendations
<from 6.3>

## Generated Files Summary
<complete file listing with descriptions>

## Next Steps for User
1. Start test environment: `docker compose -f docker-compose.test.yml up -d --wait`
2. Run migrations: `npm run db:migrate:test`
3. Execute tests: `npm run test:integration`
4. Add CI pipeline step (see snippet above)
5. Configure external service mock recordings
6. Review and commit all generated files
```

Load next step: Workflow complete. Return control to user.

## SUCCESS/FAILURE METRICS
### SUCCESS: Full checklist evaluated with scores, coverage summary produced, run commands provided, CI pipeline config with service containers generated, maintenance guide included, quality score is GOOD or better
### FAILURE: Checklist not fully evaluated, no run commands, no CI configuration, no maintenance guidance
