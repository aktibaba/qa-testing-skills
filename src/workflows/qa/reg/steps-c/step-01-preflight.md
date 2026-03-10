---
name: 'reg-preflight'
description: 'Analyze existing tests, map features, and identify coverage gaps'
nextStepFile: 'steps-c/step-02-categorize-tests.md'
outputFile: '{test_artifacts}/reg-preflight.md'
---

# Step 1 — Preflight Analysis

## STEP GOAL

Analyze the existing test suite to understand what is covered, map tests to features, and identify gaps in regression coverage. This analysis forms the foundation for building a structured regression suite.

## MANDATORY EXECUTION RULES

1. You MUST scan all test directories and identify every test file.
2. You MUST map each test to a feature area or module.
3. You MUST identify critical paths that lack test coverage.
4. You MUST consult `qa-index.csv` for regression suite design knowledge.
5. You MUST detect the test framework and understand its tagging/grouping capabilities.

## CONTEXT BOUNDARIES

- READ: All test files, source files, qa-index.csv, knowledge fragments, project configuration
- WRITE: `{test_artifacts}/reg-preflight.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Detect Test Framework and Configuration

Identify the test framework and its capabilities for test organization:
- **Jest:** `describe` blocks, `test.only`, `--testPathPattern`, tags via `jest-circus`
- **pytest:** markers (`@pytest.mark.smoke`), `conftest.py`, `-m` flag
- **JUnit:** `@Tag`, `@Category`, test suites XML
- **Playwright:** `test.describe`, `--grep`, projects
- **Cypress:** `describe`, `--spec`, tags plugin
- **Go test:** `//go:build` tags, `-run` flag
- **Vitest:** Same as Jest patterns

Record tagging/grouping mechanism for later use.

### 2. Discover and Inventory Tests

For each test file, extract:
- File path and name
- Test case names/descriptions
- Test count
- Approximate execution time (from test reports if available)
- Existing tags or markers
- Module/feature under test (inferred from imports and file location)

### 3. Map Tests to Features

Build a feature map:
```
Feature: Authentication
  - tests/auth/login.test.ts (8 tests)
  - tests/auth/register.test.ts (5 tests)
  - tests/auth/password-reset.test.ts (4 tests)

Feature: User Management
  - tests/users/crud.test.ts (12 tests)
  - tests/users/permissions.test.ts (6 tests)
```

### 4. Identify Coverage Gaps

Cross-reference the feature map with source code:
- List public modules/endpoints without corresponding tests
- Identify critical paths (auth, payments, data mutations) with no coverage
- Flag features with only happy-path tests (missing error/edge cases)

### 5. Assess Current State

Summarize:
- Total tests and estimated execution time
- Existing organization (flat, by-feature, by-type)
- Existing tagging/prioritization (or lack thereof)
- Known flaky tests (if tracked)
- Test-to-source ratio by module

### 6. Consult Knowledge Base

Load from qa-index.csv:
- `regression-suite-design` (id: 32) — Suite design patterns
- `risk-based-testing` (id: 08) — Prioritization strategies
- `flaky-test-management` (id: 21) — Flaky test patterns

## Save Progress

Write to `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-reg
current_step: step-01-preflight
status: complete
next_step: step-02-categorize-tests
timestamp: {current_timestamp}
total_tests: {count}
total_files: {count}
features_mapped: {count}
```

Write analysis to `{test_artifacts}/reg-preflight.md`.

## SUCCESS METRICS

- [ ] All test files discovered and inventoried
- [ ] Tests mapped to feature areas
- [ ] Coverage gaps identified
- [ ] Framework tagging capabilities documented
- [ ] Knowledge fragments loaded
- [ ] Preflight analysis written to output file

## FAILURE METRICS

- No test files found --> Inform user to create tests first
- Cannot determine feature mapping --> Ask user for feature list or source map
