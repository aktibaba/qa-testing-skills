---
name: 'qa-rv-checklist'
description: 'Test quality criteria checklist for review scoring'
---

# Test Quality Checklist

Use this checklist to evaluate test quality. Each item maps to a quality dimension and contributes to the overall score.

---

## 1. Determinism

- [ ] Tests produce identical results on every run without external dependencies
- [ ] No reliance on system clock, random values, or network calls without mocking
- [ ] No implicit ordering dependencies between test cases
- [ ] Time-sensitive tests use frozen/mocked time
- [ ] Database-dependent tests use transactions or clean state per test
- [ ] File system operations use temp directories with cleanup

## 2. Isolation

- [ ] Each test can run independently in any order
- [ ] No shared mutable state between test cases
- [ ] Proper setup and teardown (beforeEach/afterEach, setUp/tearDown, or equivalent)
- [ ] Test fixtures are scoped appropriately (per-test, per-suite, per-session)
- [ ] External services are mocked/stubbed at the boundary
- [ ] Parallel execution does not cause interference

## 3. Naming and Readability

- [ ] Test names describe the scenario and expected outcome (e.g., `should_return_404_when_user_not_found`)
- [ ] Test structure follows Arrange-Act-Assert (AAA) or Given-When-Then pattern
- [ ] No magic numbers or unexplained string literals
- [ ] Helper functions and fixtures have descriptive names
- [ ] Test files mirror the source file structure for easy navigation
- [ ] Comments explain "why" for non-obvious test logic, not "what"

## 4. Assertions

- [ ] Each test has at least one meaningful assertion
- [ ] Assertions are specific (e.g., `assertEqual` over `assertTrue`)
- [ ] Custom error messages explain what went wrong
- [ ] No overly broad assertions (e.g., `assertNotNull` when a value check is needed)
- [ ] Negative test cases assert specific error types and messages
- [ ] Snapshot/golden-file tests are reviewed and intentionally maintained

## 5. Coverage

- [ ] Happy path for each public function/endpoint is tested
- [ ] Error paths and exception handling are tested
- [ ] Boundary values and edge cases are covered
- [ ] Authentication and authorization paths are tested (where applicable)
- [ ] Data validation rules are tested with valid and invalid inputs
- [ ] Critical business logic has comprehensive test coverage

## 6. Maintainability

- [ ] Common test logic is extracted into shared helpers/utilities
- [ ] Page Objects, test factories, or builders reduce duplication
- [ ] Test data is generated programmatically, not hardcoded
- [ ] Tests are resilient to minor UI or API changes
- [ ] Flaky tests are tagged, tracked, and have a remediation plan
- [ ] Test suite runs within an acceptable time budget

---

## Scoring Guide

| Score | Label | Criteria |
|-------|-------|----------|
| 5 | Exemplary | All items checked, no issues found |
| 4 | Good | 80%+ items checked, only minor gaps |
| 3 | Acceptable | 60-79% items checked, some notable gaps |
| 2 | Below Standard | 40-59% items checked, significant issues |
| 1 | Critical | Below 40%, fundamental quality problems |
