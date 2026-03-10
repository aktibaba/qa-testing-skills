---
name: 'sec-c-step-06-validate-and-summary'
step: 6
mode: create
next_step: null
previous_step: 'step-05-container-dep-scan.md'
---

# Step 6 — Security Report and Recommendations

## STEP GOAL

Validate the complete security test suite against the quality checklist, compile all findings into a comprehensive security report, and provide prioritized remediation recommendations.

## MANDATORY EXECUTION RULES

1. You MUST validate all generated test files and configurations for correctness.
2. You MUST score the suite against the security testing checklist.
3. You MUST produce the final report at `{test_artifacts}/security-report.md`.
4. You MUST prioritize recommendations by risk level from the threat model.
5. You MUST provide clear "how to run" instructions for each test category.
6. You MUST save final progress.

## CONTEXT BOUNDARIES

- Read all generated files from steps 3-5
- Read the checklist from `checklist.md`
- Read the threat model from step 2
- Read progress file for accumulated configuration
- Create the final report file
- Do NOT modify test scripts in this step (only report issues)
- Do NOT execute tests or scans

## MANDATORY SEQUENCE

### 6.1 — Validate Generated Artifacts

For each generated test file and configuration:

1. **Test scripts** — Verify syntactic correctness, proper imports, valid test structure
2. **Scanning configs** — Verify YAML/JSON syntax, valid tool options, correct paths
3. **CI pipeline** — Verify pipeline syntax, correct action versions, secret references
4. **Helper files** — Verify utility functions are correctly structured

Report any issues found with file path and description.

### 6.2 — Score Against Checklist

Evaluate the suite against each section of `checklist.md`:

1. **OWASP Top 10 Coverage** — Which of the 10 categories have test coverage?
2. **Authentication and Authorization** — Score auth test completeness
3. **Input Validation** — Score injection and validation test coverage
4. **Security Headers and Transport** — Score header validation tests
5. **Container Security** — Score container scanning configuration
6. **Dependency Scanning** — Score SCA integration

Calculate total score and rating per the checklist scoring table.

### 6.3 — Map Coverage to Threat Model

Cross-reference the threat model from step 2:

1. For each identified threat, verify a corresponding test exists
2. Identify any threats from the model that lack test coverage
3. Flag untested critical and high-severity threats as gaps

Create a coverage matrix:

| Threat | Risk | Test File | Status |
|---|---|---|---|
| JWT algorithm confusion | High | auth/jwt-tests.js | Covered |
| SQL injection in search | Critical | input/injection-tests.js | Covered |
| Missing rate limiting | High | auth/rate-limit-tests.js | Covered |
| SSRF in webhook URL | Medium | — | GAP |

### 6.4 — Compile Remediation Recommendations

Based on the threat model, checklist gaps, and detected security controls:

1. **Immediate (Critical/High risk):**
   - Findings that should block release
   - Missing security controls for critical threats
   - Known vulnerability patterns in code

2. **Short-term (Medium risk):**
   - Checklist items with partial coverage
   - Security headers missing or misconfigured
   - Container hardening improvements

3. **Long-term (Low risk / Best practices):**
   - Defense-in-depth improvements
   - Monitoring and alerting enhancements
   - Security automation improvements

### 6.5 — Generate Security Report

Create `{test_artifacts}/security-report.md`:

```markdown
# Security Test Suite — Assessment Report

## Executive Summary
- **Project**: [project name]
- **Assessment date**: [date]
- **Risk level**: [high/medium/low]
- **Quality score**: [X] / 54 — [rating]
- **Threat model threats**: [total identified]
- **Test coverage**: [percentage of threats with tests]

## Quick Start

### Run All Security Tests
[Command to run the complete security test suite]

### Run Auth Security Tests Only
[Command to run auth tests]

### Run Input Validation Tests Only
[Command to run input validation tests]

### Run Dependency Scan
[Command to run dependency audit]

### Run Container Scan
[Command to run container image scan]

### Run Secret Detection
[Command to run secret scanning]

## Threat Model Summary
[Top threats with risk scores and test coverage status]

## Quality Score Breakdown

| Section | Score | Status |
|---|---|---|
| OWASP Top 10 | X / 10 | [status] |
| Auth & Authorization | X / 11 | [status] |
| Input Validation | X / 10 | [status] |
| Security Headers | X / 9 | [status] |
| Container Security | X / 8 | [status] |
| Dependency Scanning | X / 8 | [status] |
| **Total** | **X / 54** | **[rating]** |

## Coverage Gaps
[Threats from the model without corresponding tests]

## Remediation Recommendations

### Immediate Actions (Critical/High)
[Prioritized list with specific steps]

### Short-Term Actions (Medium)
[Prioritized list]

### Long-Term Improvements
[Best practice recommendations]

## CI Integration Summary
[Pipeline jobs, triggers, and how to view results]

## Files Generated
[Complete list of generated files with paths and descriptions]

## Regulatory Compliance Notes
[Relevant compliance requirements and coverage status]
```

### 6.6 — Final Progress Update

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: COMPLETE

## Quality Score
[X] / 54 — [rating]

## Threat Coverage
[X] / [Y] threats covered ([percentage]%)

## Generated Files
[Complete file list]

## Critical Gaps
[Any untested critical/high threats]

## Report Location
{test_artifacts}/security-report.md
```

## Save Progress

Mark workflow as complete in `{test_artifacts}/workflow-progress.md` with final status, quality score, threat coverage, and file manifest.

## SUCCESS METRICS

- All generated files pass validation
- Checklist score calculated with section-by-section breakdown
- Threat model coverage matrix completed
- Final report generated at `{test_artifacts}/security-report.md`
- Quick-start commands provided for each test category
- Remediation recommendations prioritized by risk
- Workflow marked as complete in progress file

## FAILURE METRICS

- Generated files contain errors that were not reported
- Checklist score not calculated
- Threat coverage not assessed
- No security report generated
- Missing usage instructions
- Progress file not marked as complete

---

**Workflow complete.** Present the security report to the user, highlighting the quality score, any critical gaps, and the top 3 recommended actions.
