---
name: 'rv-quality-evaluation'
description: 'Score tests against quality criteria — determinism, isolation, readability, coverage'
nextStepFile: 'steps-c/step-04-generate-report.md'
outputFile: '{test_artifacts}/rv-evaluation-data.md'
---

# Step 3 — Quality Evaluation

## STEP GOAL

Read and evaluate each test file (or sampled subset) against the six quality dimensions defined in `checklist.md`. Produce per-file scores and collect findings for the final report.

## MANDATORY EXECUTION RULES

1. You MUST read the actual test file content before scoring — never score based on filename alone.
2. You MUST score every quality dimension for each reviewed file.
3. You MUST cite specific line numbers and code patterns as evidence for each score.
4. You MUST use the knowledge fragments loaded in step-01 to inform your evaluation.
5. You MUST record both strengths and weaknesses for each file.
6. You MUST NOT modify any test files during evaluation.

## CONTEXT BOUNDARIES

- READ: Test files from catalog, loaded knowledge fragments, checklist.md
- WRITE: `{test_artifacts}/rv-evaluation-data.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Evaluation Framework

Read `checklist.md` to refresh the scoring criteria. Load any knowledge fragments identified in step-01 that have not yet been consulted.

### 2. Evaluate Each Test File

For each test file in the review set, perform a structured evaluation:

#### a. Determinism (Score 1-5)
Check for:
- Hardcoded dates, timestamps, or `Date.now()` / `time.time()` without mocking
- Random value generation without seeding
- Network calls without mocking/intercepting
- File system operations without temp directory isolation
- Test ordering dependencies (tests that fail when run in isolation)
- Database state assumptions

#### b. Isolation (Score 1-5)
Check for:
- Shared mutable variables between tests (module-level state)
- Missing or inadequate setup/teardown
- Global state mutations (environment variables, singletons)
- Tests that create side effects consumed by other tests
- Proper use of test fixtures vs. shared state

#### c. Readability (Score 1-5)
Check for:
- Descriptive test names following conventions (describe/it, test_should, given_when_then)
- Arrange-Act-Assert structure
- Magic numbers or unexplained literals
- Excessive test length (>50 lines per test case is a warning)
- Clear distinction between setup, action, and verification

#### d. Assertions (Score 1-5)
Check for:
- Presence of at least one assertion per test
- Specificity of assertions (exact value checks vs. truthy checks)
- Custom error messages on critical assertions
- Use of appropriate matchers (toEqual vs. toBe, assert_called_with vs. assert_called)
- Negative test cases with specific error assertions

#### e. Coverage (Score 1-5)
Check for:
- Happy path coverage for the module under test
- Error/exception path coverage
- Boundary value testing
- Edge case handling (empty arrays, null values, large inputs)
- Missing test cases for public functions/methods

#### f. Maintainability (Score 1-5)
Check for:
- Test helper/utility extraction
- Use of factories, builders, or fixtures for test data
- Hardcoded test data vs. generated data
- Resilience to minor implementation changes
- Test file organization and grouping

### 3. Record Findings

For each file, produce a structured evaluation record:

```markdown
### {filename}

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Determinism | 4 | Uses frozen time via jest.useFakeTimers() (L12). Minor: one test reads from /tmp without cleanup (L45). |
| Isolation | 3 | beforeEach resets DB, but module-level `counter` variable shared across tests (L8). |
| Readability | 5 | Clear describe/it blocks, AAA pattern throughout. |
| Assertions | 4 | Specific matchers used. Missing error message on L67 assertion. |
| Coverage | 3 | Happy path covered. Missing: error handling for 500 responses, empty input edge case. |
| Maintainability | 4 | Good use of test factories. One duplicated setup block in lines 20-35 and 80-95. |

**Overall:** 3.8/5

**Top Findings:**
1. [HIGH] Shared mutable state in `counter` variable (L8) — risk of order-dependent failures
2. [MEDIUM] Missing error path tests for HTTP 500 responses
3. [LOW] Duplicated setup block could be extracted to shared helper
```

### 4. Compute Aggregate Scores

After evaluating all files, compute:
- Per-dimension averages across all files
- Overall weighted average (determinism and isolation weighted 1.5x due to reliability impact)
- Standard deviation to identify inconsistency across the suite

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-rv
current_step: step-03-quality-evaluation
status: complete
next_step: step-04-generate-report
timestamp: {current_timestamp}
files_evaluated: {count}
overall_score: {weighted_average}
```

## SUCCESS METRICS

- [ ] Every file in review set has been read and scored
- [ ] All six dimensions scored with evidence for each file
- [ ] Findings recorded with severity levels
- [ ] Aggregate scores computed
- [ ] Evaluation data written to output file

## FAILURE METRICS

- Cannot read a test file --> Log the error, skip file, note in report
- Test file uses unknown framework --> Apply generic quality criteria, flag for manual review
