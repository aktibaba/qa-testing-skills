---
name: 'ci-validate'
description: 'Validate existing CI pipeline against quality checklist'
nextStepFile: ''
outputFile: '{test_artifacts}/ci-validation-result.md'
---

# Validate Step 1 — Pipeline Quality Validation

## STEP GOAL

Validate an existing CI/CD pipeline configuration against the quality checklist, scoring each dimension and producing a pass/fail result with remediation guidance.

## MANDATORY EXECUTION RULES

1. You MUST read the existing CI config file.
2. You MUST check every item in `checklist.md` against the actual config.
3. You MUST produce a clear pass/fail/warning for each item.
4. You MUST provide specific remediation steps for each failure.
5. You MUST produce an overall score and determination.

## CONTEXT BOUNDARIES

- READ: CI config files, `checklist.md`, project configuration files
- WRITE: `{test_artifacts}/ci-validation-result.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Locate CI Config

Find the CI pipeline configuration:
- Scan standard locations for each platform
- Parse the configuration into stages and settings

### 2. Validate Each Dimension

**Stage Ordering:** Verify stages run in the correct order per `instructions.md` canonical order. Flag if expensive stages run before cheap ones.

**Caching and Performance:** Check for dependency caching, Docker layer caching, lockfile-based cache keys, parallel execution.

**Artifact Management:** Verify test results are uploaded, coverage reports generated, failure artifacts preserved, retention configured.

**Quality Gates:** Check for coverage thresholds, test pass rate enforcement, security scan evaluation, merge blocking.

**Notifications:** Verify failure notifications, PR comments, coverage delta reporting.

**Security and Reliability:** Check for hardcoded secrets, unpinned versions, missing timeouts, retry configuration.

### 3. Produce Validation Result

```markdown
# CI Pipeline Validation Result

**Overall: {PASS | FAIL | WARN} — Score: {N}/5**
**Platform:** {detected_platform}
**Config file:** {path}

## Stage Ordering: {PASS/FAIL/WARN}
- [PASS] Static analysis runs before tests
- [FAIL] E2E tests run before build stage — should run after
  - Remediation: Move e2e job to depend on build job
- ...

## Caching and Performance: {PASS/FAIL/WARN}
- ...

(repeat for all 6 dimensions)

## Summary
- Passed: {N}/{total} checklist items
- Failed: {N}/{total} checklist items
- Warnings: {N}/{total} checklist items

## Top Remediation Actions
1. {highest impact fix}
2. {second highest impact fix}
3. ...
```

## Save Progress

Write results to `{test_artifacts}/ci-validation-result.md`.

## SUCCESS METRICS

- [ ] CI config located and parsed
- [ ] All checklist items evaluated
- [ ] Pass/fail/warn assigned with evidence
- [ ] Remediation steps provided for failures
- [ ] Overall score produced

## FAILURE METRICS

- No CI config found --> Report that no pipeline exists, suggest CREATE mode
- Config uses unknown platform syntax --> Apply generic validation criteria
