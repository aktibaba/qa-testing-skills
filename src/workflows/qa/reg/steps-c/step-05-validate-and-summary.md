---
name: 'reg-validate-and-summary'
description: 'Validate regression suite and produce final summary'
nextStepFile: ''
outputFile: '{test_artifacts}/reg-suite-summary.md'
---

# Step 5 — Validate and Summarize

## STEP GOAL

Validate the generated regression suite against the quality checklist, verify all configurations are correct, and produce a comprehensive summary for the team.

## MANDATORY EXECUTION RULES

1. You MUST validate the suite against every item in `checklist.md`.
2. You MUST verify generated configuration files are syntactically correct.
3. You MUST confirm all test tags match the categorization from step-02.
4. You MUST produce a final summary that serves as the regression suite documentation.
5. You MUST include actionable next steps for the user.

## CONTEXT BOUNDARIES

- READ: All artifacts from steps 01-04, `checklist.md`, generated config files, test files
- WRITE: `{test_artifacts}/reg-suite-summary.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Checklist Validation

Score the regression suite against `checklist.md`:
- Evaluate each dimension (critical paths, smoke suite, time budget, flaky handling, feature mapping, maintenance)
- Produce pass/fail/warn for each item
- Calculate overall score

### 2. Configuration Verification

Verify all generated files:
- Suite config files are syntactically valid
- Test tags/markers match the categorization
- Run commands are correct and complete
- No orphaned tags (tags that don't match any suite definition)

### 3. Coverage Summary

Produce a coverage map showing:
- Features with smoke-level coverage
- Features with sanity-level coverage
- Features with only full-regression coverage
- Features with no test coverage (gaps)

### 4. Generate Final Summary

```markdown
# Regression Suite Summary

## Overview
- Framework: {detected_framework}
- Total tests: {total}
- Suites: Smoke ({N}), Sanity ({N}), Full Regression ({N}), Quarantine ({N})
- Quality score: {score}/5

## Suite Commands
| Suite | Command | Budget | Est. Time |
|-------|---------|--------|-----------|
| Smoke | {command} | {budget} | {estimate} |
| Sanity | {command} | 5m | {estimate} |
| Full Regression | {command} | {budget} | {estimate} |
| Quarantine | {command} | N/A | {estimate} |

## Coverage Map
{feature coverage table}

## Files Created/Modified
{list of all files created or modified}

## Checklist Score
{detailed checklist results}

## Next Steps
1. Run `{smoke_command}` to verify smoke suite works
2. Run `{regression_command}` to verify full suite works
3. Integrate smoke suite into CI (see qa-ci workflow)
4. Schedule nightly full regression run
5. Set up flaky test monitoring
6. Share maintenance plan with the team
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-reg
current_step: step-05-validate-and-summary
status: complete
next_step: none
timestamp: {current_timestamp}
checklist_score: {score}/5
report_file: {test_artifacts}/reg-suite-summary.md
```

Write summary to `{test_artifacts}/reg-suite-summary.md`.

## SUCCESS METRICS

- [ ] Checklist validation completed with score
- [ ] All configurations verified
- [ ] Coverage map produced
- [ ] Final summary written with next steps
- [ ] Progress marked as complete

## FAILURE METRICS

- Generated configs have errors --> Fix before finalizing
- Checklist score below 3/5 --> Iterate on suite configuration to address gaps
