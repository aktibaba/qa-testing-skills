---
name: 'sec-v-step-01-validate'
step: 1
mode: validate
next_step: null
---

# Validate Step 1 — Validate Security Test Suite

## STEP GOAL

Perform a comprehensive quality audit of an existing security test suite by scoring it against the security testing checklist. Cross-reference with the threat model (if available) to identify coverage gaps. Produce a detailed validation report with scores, findings, and actionable remediation recommendations.

## MANDATORY EXECUTION RULES

1. You MUST score every item in the security testing checklist.
2. You MUST read all security test files, scanning configs, and CI pipeline definitions.
3. You MUST provide evidence for each score (pass or fail with file reference).
4. You MUST cross-reference findings with the threat model if one exists.
5. You MUST produce a validation report at `{test_artifacts}/security-validation-report.md`.
6. You MUST prioritize remediation recommendations by security risk.
7. You MUST NOT modify any files — this is a read-only audit.

## CONTEXT BOUNDARIES

- Read all security test scripts, scanning configs, CI pipelines, and documentation
- Read the checklist from `checklist.md`
- Read the threat model if it exists in the project
- Read CI pipeline definitions for security scanning integration
- Read the progress file if it exists
- Create the validation report file
- Do NOT modify any existing files
- Do NOT execute tests or scans

## MANDATORY SEQUENCE

### 1.1 — Discover Security Test Assets

Scan the project for security test files:

1. Check standard locations: `{test_dir}/security/`, `{test_dir}/sec/`
2. Check for scanning configs: `.semgrep.yml`, `.trivy.yaml`, `.snyk`, `.gitleaks.yml`, `audit-ci.jsonc`
3. Check CI pipeline for security scanning jobs
4. Check for threat model documentation
5. Check for security-related documentation and reports

Create a complete asset inventory.

### 1.2 — Score Checklist Section: OWASP Top 10 Coverage

For each OWASP Top 10 item:
- Check for corresponding test cases in the test suite
- Verify tests cover the specific vulnerability category
- Check for both detection and prevention validation

Score: [X] / [10] items passing

### 1.3 — Score Checklist Section: Authentication and Authorization

For each auth-related item:
- Check for login security tests (invalid credentials, brute force, timing)
- Check for session management tests (expiration, fixation, invalidation)
- Check for JWT-specific tests (if applicable)
- Check for RBAC tests (vertical and horizontal escalation)
- Check for IDOR tests
- Check for rate limiting tests

Score: [X] / [11] items passing

### 1.4 — Score Checklist Section: Input Validation

For each input validation item:
- Check for SQL injection tests with multiple payload categories
- Check for XSS tests (reflected, stored, DOM-based)
- Check for CSRF protection verification
- Check for command injection and path traversal tests
- Check for file upload security tests
- Check for header injection tests

Score: [X] / [10] items passing

### 1.5 — Score Checklist Section: Security Headers and Transport

For each header/transport item:
- Check for HSTS validation
- Check for CSP validation
- Check for X-Content-Type-Options, X-Frame-Options validation
- Check for CORS policy testing
- Check for cookie security attribute verification
- Check for TLS configuration validation

Score: [X] / [9] items passing

### 1.6 — Score Checklist Section: Container Security

For each container security item:
- Check for container image scanning configuration
- Check for Dockerfile best practices enforcement
- Check for non-root user configuration
- Check for secret-free image verification
- Check for resource limits and network policies

Score: [X] / [8] items passing

### 1.7 — Score Checklist Section: Dependency Scanning

For each dependency scanning item:
- Check for automated dependency scanning in CI
- Check for transitive dependency coverage
- Check for severity-based blocking rules
- Check for license compliance (if applicable)
- Check for machine-readable output
- Check for historical trend data

Score: [X] / [8] items passing

### 1.8 — Cross-Reference Threat Model

If a threat model exists:

1. Load the threat model document
2. For each identified threat, check for a corresponding test
3. Flag untested critical and high-severity threats as critical gaps
4. Calculate threat coverage percentage

If no threat model exists:
- Note this as a significant gap
- Recommend creating one (suggest EDIT mode to add it)

### 1.9 — Calculate Overall Score

Sum all section scores and determine rating:

| Score | Rating | Action |
|---|---|---|
| 44+ / 54 | Excellent | Minor refinements only |
| 33-43 / 54 | Good | Address gaps in weakest section |
| 22-32 / 54 | Fair | Significant improvements needed |
| < 22 / 54 | Poor | Major security testing gaps — immediate action required |

### 1.10 — Generate Validation Report

Create `{test_artifacts}/security-validation-report.md`:

```markdown
# Security Test Suite — Validation Report

## Overall Score: [X] / 54 — [Rating]

## Risk Assessment
- **Critical gaps**: [count] (untested high-severity threats)
- **Threat model coverage**: [X]% (or "No threat model found")

## Section Scores
| Section | Score | Status |
|---|---|---|
| OWASP Top 10 | X / 10 | [pass/warn/fail] |
| Auth & Authorization | X / 11 | [pass/warn/fail] |
| Input Validation | X / 10 | [pass/warn/fail] |
| Security Headers | X / 9 | [pass/warn/fail] |
| Container Security | X / 8 | [pass/warn/fail] |
| Dependency Scanning | X / 8 | [pass/warn/fail] |

## Detailed Findings
[For each failed item: what's missing, where to fix it, security impact, and remediation steps]

## Untested Threats (from Threat Model)
[List of threats without corresponding tests, ordered by risk score]

## Remediation Recommendations (Priority Order)
1. **[Critical]** [action item — security impact and specific fix]
2. **[High]** [action item]
3. **[Medium]** [action item]
4. **[Low]** [action item]

## Compliance Notes
[Regulatory requirements and their coverage status]

## Assets Reviewed
[Complete list of files examined]
```

### 1.11 — Present Results

Display the validation summary to the user with:
- Overall score and rating
- Critical gaps (untested high-severity threats)
- Top 3 recommended actions
- Suggested next action (EDIT mode for fixes, or acknowledgment if excellent)

## Save Progress

Write validation results to `{test_artifacts}/workflow-progress.md`:

```markdown
# Security Testing Workflow Progress

## Status: Validation Complete

## Score: [X] / 54 — [Rating]

## Critical Gaps
[Untested critical/high threats]

## Top Recommendations
1. [Most impactful recommendation]
2. [Second recommendation]
3. [Third recommendation]

## Report Location
{test_artifacts}/security-validation-report.md
```

## SUCCESS METRICS

- Every checklist item scored with evidence
- Overall score calculated correctly
- Threat model cross-referenced (if available)
- Validation report generated at the specified path
- Remediation recommendations prioritized by security risk
- Results presented clearly to the user

## FAILURE METRICS

- Checklist items skipped or scored without evidence
- Score calculation error
- Threat model not cross-referenced when available
- No validation report generated
- Recommendations not prioritized by risk
- Existing files modified (should be read-only)

---

**Validation complete.** If critical gaps are found, suggest entering EDIT mode to address them. If the score is below "Good", strongly recommend remediation before the next release.
