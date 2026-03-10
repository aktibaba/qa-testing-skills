---
name: 'reg-categorize-tests'
description: 'Categorize tests into smoke, sanity, full regression, and priority tiers'
nextStepFile: 'steps-c/step-03-generate-regression-suite.md'
outputFile: '{test_artifacts}/reg-categorization.md'
---

# Step 2 — Categorize Tests

## STEP GOAL

Assign every test to a suite tier (smoke, sanity, full regression, quarantine) and a priority level (P1-P4) based on risk assessment and feature criticality.

## MANDATORY EXECUTION RULES

1. You MUST categorize every test discovered in step-01.
2. You MUST use risk-based criteria from the knowledge fragments to assign priorities.
3. You MUST respect the time budgets when assigning tests to smoke and sanity suites.
4. You MUST identify and quarantine any known-flaky tests.
5. You MUST present the categorization to the user for confirmation before proceeding.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/reg-preflight.md`, test files, loaded knowledge fragments
- WRITE: `{test_artifacts}/reg-categorization.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Define Risk Criteria

Apply risk-based prioritization from knowledge fragment `risk-based-testing`:

**P1 — Critical (Smoke Suite):**
- Revenue-impacting flows (checkout, payment, subscription)
- Security boundaries (authentication, authorization, data access)
- Data integrity operations (create, update, delete of primary entities)
- Core API endpoints with highest traffic

**P2 — High (Sanity Suite):**
- Major feature workflows (search, filtering, sorting)
- Key integrations (third-party APIs, webhooks, email)
- User-facing CRUD for secondary entities
- Error handling for critical paths

**P3 — Medium (Full Regression):**
- Secondary feature paths
- Edge cases for core features
- Admin/back-office functionality
- Reporting and analytics features

**P4 — Low (Full Regression, deprioritize if time-constrained):**
- Cosmetic/UI polish tests
- Rarely used features
- Legacy compatibility tests
- Performance micro-benchmarks

### 2. Assign Suite Tiers

For each test, assign a suite tier:

```
Smoke:
  - [P1] tests/auth/login.test.ts::should login with valid credentials
  - [P1] tests/auth/login.test.ts::should reject invalid password
  - [P1] tests/payments/checkout.test.ts::should complete purchase
  ...

Sanity:
  - [P2] tests/users/crud.test.ts::should create user with valid data
  - [P2] tests/search/search.test.ts::should return results for valid query
  ...

Full Regression:
  - [P3] tests/admin/reports.test.ts::should generate monthly report
  - [P4] tests/legacy/compat.test.ts::should handle v1 API format
  ...

Quarantine:
  - [FLAKY] tests/notifications/email.test.ts::should send welcome email
    Reason: Intermittent SMTP timeout, flaky 15% of runs
  ...
```

### 3. Validate Time Budgets

Estimate execution times and verify:
- Smoke suite fits within `{smoke_time_budget}`
- Sanity suite fits within 5 minutes
- Full regression fits within `{execution_time_budget}`

If a suite exceeds its budget:
- Move lowest-priority tests to the next tier down
- Identify opportunities for parallelization
- Flag slow individual tests for optimization

### 4. Identify Flaky Tests

Scan for flaky test indicators:
- Tests with retry decorators or `.retry()` calls
- Tests with comments mentioning "flaky", "intermittent", "skip"
- Tests with `skip`, `xit`, `xtest`, `@pytest.mark.skip` annotations
- Tests relying on timing, network, or external services without mocking

Mark identified flaky tests for quarantine.

### 5. Present Categorization

Produce a summary table:

```markdown
| Suite | Tests | Est. Time | Within Budget |
|-------|-------|-----------|---------------|
| Smoke | 15 | 1m 30s | Yes (budget: 2m) |
| Sanity | 45 | 4m 15s | Yes (budget: 5m) |
| Full Regression | 180 | 8m 45s | Yes (budget: 10m) |
| Quarantine | 8 | N/A | N/A |
| TOTAL | 248 | - | - |
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-reg
current_step: step-02-categorize-tests
status: complete
next_step: step-03-generate-regression-suite
timestamp: {current_timestamp}
smoke_count: {N}
sanity_count: {N}
regression_count: {N}
quarantine_count: {N}
```

Write categorization to `{test_artifacts}/reg-categorization.md`.

## SUCCESS METRICS

- [ ] Every test assigned a priority level (P1-P4)
- [ ] Every test assigned a suite tier
- [ ] Time budgets validated for each suite
- [ ] Flaky tests identified and quarantined
- [ ] Categorization summary produced

## FAILURE METRICS

- Cannot estimate execution times --> Use conservative estimates, flag for measurement
- Smoke suite exceeds time budget even with only P1 tests --> Flag that P1 tests are too slow
