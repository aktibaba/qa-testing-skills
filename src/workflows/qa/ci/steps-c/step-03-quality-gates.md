---
name: 'ci-quality-gates'
description: 'Configure quality gates — coverage, test pass rate, security, performance'
nextStepFile: 'steps-c/step-04-validate-and-summary.md'
outputFile: '{test_artifacts}/ci-quality-gates.md'
---

# Step 3 — Configure Quality Gates

## STEP GOAL

Add automated quality gates to the pipeline that enforce minimum standards for code coverage, test pass rate, security findings, and optionally performance metrics. Gates must block merges when thresholds are not met.

## MANDATORY EXECUTION RULES

1. You MUST configure a code coverage threshold gate (default: `{coverage_threshold}%`).
2. You MUST configure a test pass rate gate (target: 100%, failure threshold: < 99%).
3. You MUST add security scan result evaluation if SAST/DAST is included.
4. You MUST ensure gate failures produce clear, actionable error messages.
5. You MUST update the pipeline config file, not just document the gates.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/ci-preflight.md`, `{test_artifacts}/ci-pipeline-draft.md`, existing CI config, knowledge fragments
- WRITE: CI config file (update), `{test_artifacts}/ci-quality-gates.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Coverage Gate

Add a coverage enforcement step after test stages:

**Mechanism options (platform-dependent):**
- **GitHub Actions:** Use coverage tool's built-in threshold flag or a coverage-check action
- **GitLab CI:** Use `coverage` keyword with regex extraction
- **Jenkins:** Use coverage plugin with thresholds
- **Generic:** Parse coverage report and fail if below threshold

Configuration:
```
coverage_threshold: {coverage_threshold}%
coverage_report: {path_to_coverage_report}
fail_on_decrease: true  # Also fail if coverage drops from baseline
```

### 2. Test Pass Rate Gate

Ensure all tests pass:

- Parse JUnit XML test results
- Calculate pass rate: `passed / (passed + failed + errored)`
- Fail pipeline if pass rate < 99% (allows for known-flaky quarantined tests)
- Report: total, passed, failed, skipped, errored

### 3. Security Gate

If SAST/DAST scanning is configured:

- Parse security scan results (SARIF, JSON, or tool-specific format)
- Block on: any CRITICAL or HIGH severity findings
- Warn on: MEDIUM severity findings
- Allow with note: LOW severity findings
- Report: total findings by severity

### 4. Performance Gate (Optional)

If performance tests are included:

- Compare key metrics against baseline (P95 latency, throughput, error rate)
- Block if P95 latency regresses by > 20%
- Block if error rate exceeds 1%
- Report: current vs. baseline metrics

### 5. PR Comment Integration

Configure pipeline to post quality gate results as a PR comment:

```markdown
## Quality Gate Results

| Gate | Status | Value | Threshold |
|------|--------|-------|-----------|
| Coverage | PASS | 85.2% | >= 80% |
| Test Pass Rate | PASS | 100% | >= 99% |
| Security (SAST) | WARN | 2 medium | 0 critical/high |
| Performance | N/A | - | - |

**Overall: PASS**
```

### 6. Branch Protection

Document the recommended branch protection settings:
- Require status checks to pass before merge
- Require quality gate job to pass
- Require up-to-date branches
- No force pushes to main/develop

### 7. Update Pipeline Config

Modify the CI config file generated in step-02 to include:
- Quality gate stage/job after all test stages
- Coverage threshold enforcement
- Test result parsing and evaluation
- Conditional failure on gate violations

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-ci
current_step: step-03-quality-gates
status: complete
next_step: step-04-validate-and-summary
timestamp: {current_timestamp}
gates_configured: [coverage, pass-rate, security]
```

Write gate configuration summary to `{test_artifacts}/ci-quality-gates.md`.

## SUCCESS METRICS

- [ ] Coverage threshold gate configured and enforced
- [ ] Test pass rate gate configured
- [ ] Security gate configured (if scanning is present)
- [ ] PR comment integration configured
- [ ] Pipeline config file updated with gates
- [ ] Branch protection recommendations documented

## FAILURE METRICS

- Coverage tool not detected --> Add TODO comment in pipeline, warn user to configure coverage
- No test result format identified --> Default to JUnit XML, add conversion step
