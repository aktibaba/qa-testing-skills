---
name: 'rv-discover-tests'
description: 'Discover and catalog all test files in scope'
nextStepFile: 'steps-c/step-03-quality-evaluation.md'
outputFile: '{test_artifacts}/rv-test-catalog.md'
---

# Step 2 — Discover and Catalog Tests

## STEP GOAL

Discover all test files within the review scope, catalog them by type (unit, integration, e2e), and build a structured inventory for quality evaluation.

## MANDATORY EXECUTION RULES

1. You MUST search all standard test locations for the detected framework.
2. You MUST classify each test file by type (unit, integration, e2e, performance, other).
3. You MUST count test cases per file where possible.
4. You MUST NOT modify any test files during discovery.
5. You MUST output a complete catalog before proceeding.

## CONTEXT BOUNDARIES

- READ: All test files, test configuration files, context from step-01
- WRITE: `{test_artifacts}/rv-test-catalog.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Search Test Locations

Scan these directories (adapt to detected framework):
- `{test_dir}/` — Primary test directory
- `tests/`, `test/`, `spec/`, `__tests__/` — Common conventions
- `src/**/*.test.*`, `src/**/*.spec.*` — Co-located tests
- `e2e/`, `cypress/`, `playwright/` — E2E-specific directories
- Framework-specific: `jest.config.*`, `pytest.ini`, `conftest.py`, `.mocharc.*`

### 2. Classify Test Files

For each discovered test file, determine:
- **Type:** unit | integration | e2e | performance | other
- **Framework:** jest | pytest | junit | playwright | cypress | etc.
- **Test count:** Number of test cases / it blocks / test functions
- **Lines of code:** Total lines in the test file
- **Has fixtures/helpers:** Whether it uses shared test utilities
- **Last modified:** File modification date

Classification heuristics:
- Files in `unit/` or with simple function tests --> unit
- Files importing database clients, HTTP clients, or Docker --> integration
- Files using browser automation or page objects --> e2e
- Files with load/stress/benchmark keywords --> performance

### 3. Build Catalog

Produce a structured catalog:

```markdown
# Test File Catalog

## Summary
- Total test files: N
- Total test cases: N
- Unit tests: N files (N cases)
- Integration tests: N files (N cases)
- E2E tests: N files (N cases)
- Other: N files (N cases)

## File Inventory

| # | File | Type | Framework | Tests | Lines | Fixtures | Modified |
|---|------|------|-----------|-------|-------|----------|----------|
| 1 | tests/auth.test.ts | unit | jest | 12 | 180 | yes | 2024-01-15 |
| ... | | | | | | | |
```

### 4. Identify Review Targets

Based on catalog size, determine review strategy:
- **Small suite** (< 20 files): Review all files
- **Medium suite** (20-50 files): Review all, but prioritize critical paths
- **Large suite** (50+ files): Sample-based review — select representative files from each category plus all recently modified files

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-rv
current_step: step-02-discover-tests
status: complete
next_step: step-03-quality-evaluation
timestamp: {current_timestamp}
catalog_size: {total_files}
```

## SUCCESS METRICS

- [ ] All test directories searched
- [ ] Every test file classified by type
- [ ] Test case counts tallied
- [ ] Catalog written to output file
- [ ] Review strategy determined based on suite size

## FAILURE METRICS

- Zero test files found after exhaustive search --> Report to user, suggest creating tests first
- Test files exist but cannot be parsed --> Log unparseable files, continue with parseable ones
