---
name: 'rv-generate-report'
description: 'Generate quality report with scores, findings, and recommendations'
nextStepFile: ''
outputFile: '{test_artifacts}/rv-quality-report.md'
---

# Step 4 — Generate Quality Report

## STEP GOAL

Compile evaluation data into a comprehensive, actionable quality report. The report must be useful to both developers (detailed findings) and tech leads (executive summary with scores).

## MANDATORY EXECUTION RULES

1. You MUST include an executive summary with the overall score and key takeaways.
2. You MUST present per-dimension aggregate scores with visual indicators.
3. You MUST rank all findings by severity (CRITICAL > HIGH > MEDIUM > LOW).
4. You MUST provide concrete code examples for each recommendation.
5. You MUST include a "Quick Wins" section with low-effort, high-impact improvements.
6. You MUST write the final report to the output file.

## CONTEXT BOUNDARIES

- READ: Evaluation data from step-03, context from step-01, catalog from step-02
- WRITE: `{test_artifacts}/rv-quality-report.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Executive Summary

```markdown
# Test Quality Report

## Executive Summary

**Overall Score: {weighted_average}/5 — {label}**

| Dimension | Score | Status |
|-----------|-------|--------|
| Determinism | {score}/5 | {pass/warn/fail} |
| Isolation | {score}/5 | {pass/warn/fail} |
| Readability | {score}/5 | {pass/warn/fail} |
| Assertions | {score}/5 | {pass/warn/fail} |
| Coverage | {score}/5 | {pass/warn/fail} |
| Maintainability | {score}/5 | {pass/warn/fail} |

**Suite:** {total_files} test files, {total_cases} test cases
**Scope:** {review_scope}
**Framework:** {detected_framework}
```

Status thresholds: >= 4 = pass, 3-3.9 = warn, < 3 = fail

### 2. Findings by Severity

Group all findings from the evaluation into severity tiers:

**CRITICAL** — Tests that may produce false positives/negatives or mask real bugs:
- Flaky tests (non-deterministic)
- Tests with no assertions
- Tests that always pass regardless of implementation

**HIGH** — Issues that reduce test suite reliability:
- Shared mutable state between tests
- Missing error path coverage for critical flows
- Hardcoded external dependencies

**MEDIUM** — Quality improvements that reduce maintenance burden:
- Poor naming conventions
- Missing edge case coverage
- Duplicated test setup code

**LOW** — Polish items and best-practice alignment:
- Minor naming inconsistencies
- Suboptimal assertion matchers
- Missing test description comments

### 3. Per-File Breakdown

Include the detailed per-file evaluation from step-03, sorted by score (worst first) to prioritize attention.

### 4. Recommendations

For each finding, provide:
1. **What:** Clear description of the issue
2. **Why:** Impact on test reliability or maintainability
3. **How:** Concrete code example showing the fix
4. **Effort:** Low / Medium / High

Example:
```markdown
### REC-001: Replace shared mutable state with per-test fixtures

**What:** `tests/auth.test.ts` uses a module-level `counter` variable (L8) shared across tests.
**Why:** Tests become order-dependent and may fail when run in parallel or shuffled.
**How:**
// Before (problematic)
let counter = 0;
test('increments', () => { counter++; expect(counter).toBe(1); });

// After (isolated)
test('increments', () => { let counter = 0; counter++; expect(counter).toBe(1); });
**Effort:** Low
```

### 5. Quick Wins

List the top 5 improvements that are low-effort but high-impact:
1. Effort estimate (time)
2. Expected improvement (which dimension improves)
3. Specific files to change

### 6. Next Steps

Suggest a prioritized action plan:
1. Fix all CRITICAL findings immediately
2. Address HIGH findings within the current sprint
3. Schedule MEDIUM findings for the next sprint
4. Add LOW findings to the backlog

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-rv
current_step: step-04-generate-report
status: complete
next_step: none
timestamp: {current_timestamp}
report_file: {test_artifacts}/rv-quality-report.md
overall_score: {weighted_average}
```

## SUCCESS METRICS

- [ ] Executive summary with overall score generated
- [ ] All findings ranked by severity
- [ ] Concrete recommendations with code examples provided
- [ ] Quick wins section included
- [ ] Report written to output file
- [ ] Progress marked as complete

## FAILURE METRICS

- No evaluation data available from step-03 --> Cannot generate report, re-run evaluation
- All scores are 5/5 with no findings --> Report the clean bill of health, suggest advanced checks
