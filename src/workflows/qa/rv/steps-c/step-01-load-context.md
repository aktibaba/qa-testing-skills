---
name: 'rv-load-context'
description: 'Load tests to review and consult qa-index.csv for relevant knowledge'
nextStepFile: 'steps-c/step-02-discover-tests.md'
outputFile: '{test_artifacts}/rv-context.md'
---

# Step 1 — Load Context

## STEP GOAL

Load the project context, identify the test framework and stack, and consult the qa-index.csv knowledge base to retrieve relevant quality evaluation criteria for this specific stack.

## MANDATORY EXECUTION RULES

1. You MUST read the project root to identify package files, configuration, and source structure.
2. You MUST detect the test framework(s) in use (jest, pytest, junit, vitest, playwright, cypress, etc.).
3. You MUST consult `qa-index.csv` and load relevant knowledge fragments before proceeding.
4. You MUST NOT skip knowledge loading — it informs all downstream scoring.
5. You MUST record all detected context in the output file.

## CONTEXT BOUNDARIES

- READ: Project root files, package.json/requirements.txt/pom.xml/go.mod, test configuration files, qa-index.csv, knowledge fragments
- WRITE: `{test_artifacts}/rv-context.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Detect Project Stack

Scan the project root for technology indicators:
- `package.json` --> Node.js ecosystem (check for jest, vitest, mocha, playwright, cypress)
- `requirements.txt` / `pyproject.toml` / `setup.py` --> Python ecosystem (check for pytest, unittest)
- `pom.xml` / `build.gradle` --> Java ecosystem (check for JUnit, TestNG)
- `go.mod` --> Go ecosystem (go test)
- `Gemfile` --> Ruby ecosystem (RSpec, minitest)
- `.csproj` --> .NET ecosystem (xUnit, NUnit)

Record: `detected_stack`, `detected_framework`, `detected_test_runner`.

### 2. Identify Review Scope

Based on `{review_scope}`:
- `all` --> Review all test files
- `unit` --> Focus on unit tests only
- `integration` --> Focus on integration tests only
- `e2e` --> Focus on end-to-end tests only
- `changed-only` --> Use git diff to identify changed test files

### 3. Consult qa-index.csv

Load `qa-index.csv` and select fragments relevant to the detected stack:
- Always load: `test-isolation` (07), `flaky-test-management` (21), `test-naming-conventions` (33), `mock-stub-spy` (34), `unit-testing-fundamentals` (36)
- If UI tests detected: `selector-resilience` (09), `page-object-model` (11)
- If API tests detected: `api-testing-fundamentals` (03)
- If performance tests detected: `performance-load-testing` (14)

Read each selected fragment from `knowledge/` directory.

### 4. Record Context

Write the detected context to `{test_artifacts}/rv-context.md`:
```
# Review Context
- Stack: {detected_stack}
- Framework: {detected_framework}
- Scope: {review_scope}
- Knowledge loaded: [list of fragment IDs]
- Test directories found: [list]
- Timestamp: {current_timestamp}
```

## Save Progress

Write to `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-rv
current_step: step-01-load-context
status: complete
next_step: step-02-discover-tests
timestamp: {current_timestamp}
```

## SUCCESS METRICS

- [ ] Project stack and test framework detected
- [ ] Relevant knowledge fragments loaded from qa-index.csv
- [ ] Context summary written to output file
- [ ] Progress file updated

## FAILURE METRICS

- No test files detected anywhere in the project --> Inform user and halt
- Cannot determine test framework --> Ask user to specify `{test_framework}`
