---
name: 'qa-reg-checklist'
description: 'Regression testing quality checklist'
---

# Regression Testing Checklist

Use this checklist to validate the health and structure of a regression test suite.

---

## 1. Critical Path Coverage

- [ ] Authentication flow (login, logout, session management) is covered
- [ ] Core CRUD operations for primary entities are tested
- [ ] Payment or transaction flows are tested (if applicable)
- [ ] User registration and onboarding flow is covered
- [ ] API endpoints with highest traffic are tested
- [ ] Data integrity constraints are verified

## 2. Smoke Suite Definition

- [ ] Smoke suite is explicitly defined and tagged
- [ ] Smoke suite contains only P1 (critical path) tests
- [ ] Smoke suite runs within time budget (`{smoke_time_budget}`)
- [ ] Smoke suite is configured to run on every PR and commit
- [ ] Smoke suite failure blocks merge and deployment
- [ ] Smoke suite contains 10-20 tests maximum

## 3. Execution Time Budget

- [ ] Full regression suite runs within `{execution_time_budget}`
- [ ] Individual test execution times are monitored
- [ ] Slow tests (> 30s) are identified and optimized or moved to separate suite
- [ ] Parallel execution is configured where supported
- [ ] Test sharding is used for large suites
- [ ] No unnecessary waits or sleeps in test code

## 4. Flaky Test Handling

- [ ] Flaky tests are identified and tagged/labeled
- [ ] Flaky tests are quarantined into a separate suite
- [ ] Quarantine suite runs with retry logic (2-3 retries)
- [ ] Flakiness rate is tracked per test
- [ ] Each flaky test has an assigned owner
- [ ] Remediation timeline exists for quarantined tests

## 5. Feature Mapping

- [ ] Every test maps to a feature, user story, or requirement
- [ ] Tests are organized by feature area (not just file structure)
- [ ] Priority levels (P1-P4) are assigned to each test
- [ ] Orphaned tests (no clear purpose) are identified
- [ ] New feature tests are added as part of the development process
- [ ] Deprecated feature tests are removed or archived

## 6. Maintenance Plan

- [ ] Regression suite is reviewed at a regular cadence (per sprint or monthly)
- [ ] Test ownership is documented (team or individual)
- [ ] Suite health metrics are tracked (pass rate, duration, flakiness)
- [ ] Regression suite configuration is version-controlled
- [ ] Process exists for promoting tests between tiers
- [ ] Process exists for adding new tests to the appropriate tier

---

## Scoring Guide

| Score | Label | Criteria |
|-------|-------|----------|
| 5 | Exemplary | All items checked, suite is well-structured and maintained |
| 4 | Good | 80%+ items checked, minor gaps in coverage or process |
| 3 | Acceptable | 60-79% items checked, suite works but needs organization |
| 2 | Below Standard | 40-59% items checked, tests exist but no suite structure |
| 1 | Critical | Below 40%, no regression strategy in place |
