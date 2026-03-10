---
name: 'qa-ci-checklist'
description: 'CI/CD quality checklist for pipeline validation'
---

# CI/CD Pipeline Quality Checklist

Use this checklist to validate CI pipeline configurations. Each item maps to a quality principle.

---

## 1. Stage Ordering

- [ ] Static analysis (lint, type-check) runs before test stages
- [ ] Unit tests run before integration and E2E tests
- [ ] Build stage runs after static analysis and unit tests
- [ ] E2E tests run after build is complete
- [ ] Quality gates evaluate after all test stages complete
- [ ] No circular dependencies between stages

## 2. Caching and Performance

- [ ] Dependency cache is configured (npm cache, pip cache, Maven/Gradle cache)
- [ ] Docker layer caching is enabled for container builds
- [ ] Cache keys include lockfile hash for automatic invalidation
- [ ] Build artifacts are passed between stages (not rebuilt)
- [ ] Independent stages run in parallel where possible
- [ ] Total pipeline duration is within acceptable budget (target: < 15 min)

## 3. Artifact Management

- [ ] Test results are uploaded as artifacts (JUnit XML, JSON reports)
- [ ] Code coverage reports are generated and uploaded
- [ ] Logs from failed stages are preserved
- [ ] Artifacts have appropriate retention periods configured
- [ ] Coverage reports are published to PR comments or dashboard
- [ ] Screenshots/videos from E2E tests are uploaded on failure

## 4. Quality Gates

- [ ] Code coverage threshold is enforced (minimum: `{coverage_threshold}%`)
- [ ] Test pass rate gate is configured (target: 100%, minimum: 99%)
- [ ] No new security vulnerabilities allowed (SAST/DAST results)
- [ ] Performance regression gate is configured (if applicable)
- [ ] Quality gate failure blocks merge/deployment
- [ ] Gate thresholds are documented and version-controlled

## 5. Notifications

- [ ] Pipeline failure triggers team notification (Slack, email, PR comment)
- [ ] Quality gate violations are reported with specific details
- [ ] Coverage delta is reported on pull requests
- [ ] Notification includes actionable links (failed test, coverage report)
- [ ] Notification noise is minimized (no alerts on passing runs unless opted in)

## 6. Security and Reliability

- [ ] Secrets are stored in platform secret manager, not hardcoded
- [ ] Pipeline uses pinned action/image versions (not `latest` or `master`)
- [ ] Timeout limits are set on all stages
- [ ] Retry logic is configured for flaky infrastructure (not flaky tests)
- [ ] Branch protection rules require pipeline to pass before merge
- [ ] Pipeline runs on pull requests, not just after merge

---

## Scoring Guide

| Score | Label | Criteria |
|-------|-------|----------|
| 5 | Exemplary | All items checked, pipeline is optimized and fast |
| 4 | Good | 80%+ items checked, minor optimization opportunities |
| 3 | Acceptable | 60-79% items checked, pipeline works but has gaps |
| 2 | Below Standard | 40-59% items checked, significant missing stages or gates |
| 1 | Critical | Below 40%, pipeline provides minimal quality assurance |
