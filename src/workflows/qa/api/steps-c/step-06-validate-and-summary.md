---
name: 'step-06-validate-and-summary'
description: 'Validate generated tests, produce coverage report and summary'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 6: Validate and Summary — Final Test Suite Verification

## STEP GOAL

Validate the complete API test suite against the quality checklist, produce a coverage report mapping tests to endpoints, and generate a summary with run instructions for the user.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if test files from Steps 3-5 are missing.
- Evaluate every checklist item honestly.
- Be specific about coverage gaps — do not claim 100% coverage if endpoints are untested.

## CONTEXT BOUNDARIES

- Available context: all generated test files, checklist.md, workflow progress, endpoint inventory.
- Focus: validation and documentation only. Do not add new tests unless a critical gap is found.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 6.1 — Inventory Generated Tests

Read all generated test files and build a complete inventory:
- List every test file with its path.
- Count test cases per file.
- Categorize: functional, auth, validation, boundary, error handling, injection.
- Total test count.

### 6.2 — Build Coverage Matrix

Map generated tests back to the endpoint inventory from Step 1:

```markdown
| Endpoint | Risk | Happy Path | Validation | Auth | Error | Edge Cases | Total Tests |
|---|---|---|---|---|---|---|---|
| GET /api/users | High | 3 | 2 | 2 | 1 | 2 | 10 |
| POST /api/users | Critical | 2 | 5 | 3 | 2 | 4 | 16 |
| ... |
```

Calculate coverage metrics:
- Endpoints with at least one test: [count] / [total].
- Critical endpoints fully covered: [count] / [total critical].
- Percentage of test plan executed.

### 6.3 — Checklist Validation

Load `checklist.md` and evaluate each item:

For each checklist item:
1. Read the criterion.
2. Check the generated test files against it.
3. Mark as PASS or FAIL with evidence from the actual test files.

Compile results into a structured validation report.

### 6.4 — Compute Quality Score

Based on checklist results:

- **GREEN**: All items pass. Test suite is production-ready.
- **YELLOW**: 1-4 non-critical items fail. Suite is functional but has gaps.
- **RED**: Any critical item fails. Suite needs remediation.

Critical items that trigger RED:
- No functional coverage for Critical risk endpoints.
- No authentication tests.
- Tests are not isolated (shared state between tests).
- No error handling tests.

### 6.5 — Fix Critical Gaps

If quality score is RED, attempt to fix critical gaps:
- Generate missing test files for uncovered Critical endpoints.
- Add missing auth tests.
- Add missing error handling tests.
- Fix test isolation issues.

Re-evaluate after fixes. If still RED, document remaining issues for the user.

### 6.6 — Generate Run Instructions

Determine the correct test run command based on the detected framework:

| Framework | Run Command |
|---|---|
| Jest | `npx jest tests/api/ --verbose` |
| Vitest | `npx vitest run tests/api/` |
| pytest | `pytest tests/api/ -v` |
| Go test | `go test ./tests/api/... -v` |
| JUnit | `mvn test -pl api-tests` or `gradle test --tests "api.*"` |
| RSpec | `bundle exec rspec spec/api/` |
| ExUnit | `mix test test/api/` |

Include commands for:
- Running all API tests.
- Running a specific test file.
- Running tests with verbose output.
- Running tests with coverage report.
- Running tests in watch mode (if supported).

### 6.7 — Generate Summary Report

Write `{test_artifacts}/api-summary.md`:

```markdown
# API Test Suite Summary

## Quick Start

### Run all API tests
[framework-specific command]

### Run a specific test file
[framework-specific command]

### Run with coverage
[framework-specific command]

### Run in watch mode
[framework-specific command]

## Coverage Report

### Endpoint Coverage Matrix
[coverage matrix from 6.2]

### Coverage Metrics
- Total endpoints: [count]
- Endpoints with tests: [count] ([percentage]%)
- Critical endpoints covered: [count] / [total critical]
- Total test cases: [count]

### Test Distribution
- Functional tests: [count]
- Authentication tests: [count]
- Authorization tests: [count]
- Validation tests: [count]
- Boundary tests: [count]
- Error handling tests: [count]
- Injection tests: [count]

## Test Files

| File | Category | Test Count |
|---|---|---|
| [for each file] |

## Quality Score

[GREEN/YELLOW/RED] — [summary]

## Checklist Results

[pass/fail for each checklist item]

## Recommendations

[ordered list of next improvements]

## Known Gaps

[any untested endpoints or scenarios, with justification]

## Prerequisites

- [required dependencies]
- [environment setup]
- [configuration needed]
```

### 6.8 — Final Progress Update

### Save Progress

Update {outputFile}:

```markdown
## Status: WORKFLOW COMPLETE

## Final Quality Score: [GREEN/YELLOW/RED]
## Total Test Files: [count]
## Total Test Cases: [count]
## Endpoint Coverage: [percentage]%
## Summary Report: {test_artifacts}/api-summary.md
```

Present the summary to the user with the quick-start commands prominently displayed.

## SUCCESS/FAILURE METRICS

### SUCCESS: Coverage matrix maps every endpoint to its tests. Quality score is GREEN or YELLOW. Summary report includes run commands, coverage metrics, and improvement recommendations. All Critical endpoints have comprehensive test coverage.
### FAILURE: Coverage matrix has unmapped endpoints among Critical risk items. Quality score is RED after attempted fixes. Summary is missing run commands or coverage data.
