---
name: 'rv-validate'
description: 'Validate tests against the quality checklist'
nextStepFile: ''
outputFile: '{test_artifacts}/rv-validation-result.md'
---

# Validate Step 1 — Quality Checklist Validation

## STEP GOAL

Run a fast validation pass on existing tests against the quality checklist, producing a pass/fail result per checklist item without the full detailed evaluation of CREATE mode.

## MANDATORY EXECUTION RULES

1. You MUST load `checklist.md` as the evaluation framework.
2. You MUST check every item in the checklist against the actual test code.
3. You MUST produce a clear pass/fail/warning for each checklist item.
4. You MUST provide an overall pass/fail determination.
5. You MUST reference specific files and lines for any failures.

## CONTEXT BOUNDARIES

- READ: `checklist.md`, test files in `{test_dir}/`, test configuration files
- WRITE: `{test_artifacts}/rv-validation-result.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Checklist

Read `checklist.md` and parse all checklist items across the six dimensions.

### 2. Discover Test Files

Perform a quick discovery of test files (lighter than full CREATE mode discovery):
- Scan `{test_dir}/` and common test locations
- Identify framework from configuration files
- Build a file list without detailed cataloging

### 3. Validate Each Dimension

For each dimension in the checklist, sample test files and check:

**Determinism items:** Grep for time-dependent calls, random without seed, unguarded network calls.

**Isolation items:** Check for module-level mutable variables, missing setup/teardown, shared state patterns.

**Naming items:** Verify test name patterns match conventions, check for AAA structure.

**Assertion items:** Look for bare assertions, missing error messages, tests without assertions.

**Coverage items:** Check for error path tests, boundary tests, missing public method tests.

**Maintainability items:** Identify duplicated setup code, check for test helpers/factories.

### 4. Produce Validation Result

```markdown
# Validation Result

**Overall: {PASS | FAIL | WARN}**
**Checked: {N} items across {M} test files**

## Determinism: {PASS/FAIL/WARN}
- [PASS] Tests produce identical results on every run
- [FAIL] Reliance on system clock without mocking — auth.test.ts:L45
- ...

## Isolation: {PASS/FAIL/WARN}
- ...

(repeat for all 6 dimensions)

## Summary
- Passed: {N}/{total} checklist items
- Failed: {N}/{total} checklist items
- Warnings: {N}/{total} checklist items
```

Overall determination:
- **PASS:** No failures, at most 2 warnings
- **WARN:** No failures, 3+ warnings
- **FAIL:** Any failure item

## Save Progress

Write results to `{test_artifacts}/rv-validation-result.md`.

## SUCCESS METRICS

- [ ] All checklist items evaluated
- [ ] Pass/fail/warn assigned to each item with evidence
- [ ] Overall determination produced
- [ ] Results written to output file

## FAILURE METRICS

- No test files found --> Report FAIL with note that no tests exist
- Cannot determine framework --> Apply generic criteria, flag items that are framework-specific
