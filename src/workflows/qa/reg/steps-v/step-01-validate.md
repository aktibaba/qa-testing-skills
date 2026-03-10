---
name: 'reg-validate'
description: 'Validate regression suite against quality checklist'
nextStepFile: ''
outputFile: '{test_artifacts}/reg-validation-result.md'
---

# Validate Step 1 — Regression Suite Validation

## STEP GOAL

Validate an existing regression test suite against the quality checklist, assessing coverage, organization, time budgets, flaky test handling, and maintenance practices.

## MANDATORY EXECUTION RULES

1. You MUST read all suite configuration files and test files.
2. You MUST check every item in `checklist.md` against the actual suite.
3. You MUST verify execution time budgets with actual or estimated run times.
4. You MUST produce a clear pass/fail/warning for each checklist item.
5. You MUST provide specific remediation guidance for any failures.

## CONTEXT BOUNDARIES

- READ: `checklist.md`, suite config files, test files, `{test_artifacts}/reg-suite-summary.md` (if exists)
- WRITE: `{test_artifacts}/reg-validation-result.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Checklist and Suite

Read `checklist.md` for evaluation criteria. Locate and parse the regression suite configuration.

### 2. Validate Each Dimension

**Critical Path Coverage:** Verify authentication, CRUD, payment, and high-traffic paths are covered. Cross-reference with source code to find uncovered critical paths.

**Smoke Suite Definition:** Check that a smoke suite is defined, tagged, within time budget, contains only P1 tests, and is integrated with CI.

**Execution Time Budget:** Estimate or measure suite run times. Flag suites exceeding their budgets. Identify the slowest tests.

**Flaky Test Handling:** Check for quarantine tags, investigate skipped tests, look for retry annotations, verify flaky test tracking.

**Feature Mapping:** Verify tests map to features, check for orphaned tests, verify priority assignments are current.

**Maintenance Plan:** Check for documented review cadence, test ownership, health metrics tracking.

### 3. Produce Validation Result

```markdown
# Regression Suite Validation Result

**Overall: {PASS | FAIL | WARN} — Score: {N}/5**

## Critical Path Coverage: {PASS/FAIL/WARN}
- [PASS] Authentication flow covered (login.test.ts, register.test.ts)
- [FAIL] Payment flow has no test coverage
  - Remediation: Add smoke-level tests for checkout and payment processing
- ...

## Smoke Suite: {PASS/FAIL/WARN}
- ...

(repeat for all 6 dimensions)

## Summary
- Passed: {N}/{total} checklist items
- Failed: {N}/{total} checklist items
- Warnings: {N}/{total} checklist items

## Top Actions
1. {highest priority remediation}
2. ...
```

## Save Progress

Write results to `{test_artifacts}/reg-validation-result.md`.

## SUCCESS METRICS

- [ ] All checklist items evaluated with evidence
- [ ] Pass/fail/warn assigned to each item
- [ ] Time budget compliance verified
- [ ] Remediation guidance provided for failures
- [ ] Overall score produced

## FAILURE METRICS

- No regression suite configuration found --> Report FAIL, suggest CREATE mode
- Cannot estimate run times --> Flag for manual measurement
