---
name: 'rv-edit-apply'
description: 'Apply changes to the quality report based on the edit plan'
nextStepFile: ''
outputFile: '{test_artifacts}/rv-quality-report.md'
---

# Edit Step 2 — Apply Changes

## STEP GOAL

Execute the edit plan from step-01-assess, updating scores, findings, and recommendations in the quality report.

## MANDATORY EXECUTION RULES

1. You MUST follow the edit plan created in step-01-assess.
2. You MUST re-read any test files that need re-evaluation.
3. You MUST preserve unaffected portions of the existing report.
4. You MUST update aggregate scores after individual changes.
5. You MUST note which sections were updated and why.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/rv-edit-plan.md`, `{test_artifacts}/rv-quality-report.md`, test files as needed
- WRITE: `{test_artifacts}/rv-quality-report.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Edit Plan

Read `{test_artifacts}/rv-edit-plan.md` to determine the scope of changes.

### 2. Execute Changes

Based on edit type:

**Re-score:** Read the updated test files, re-evaluate against all six dimensions, replace the old scores and findings for those files.

**Add files:** Discover and evaluate the new files using the same process as step-03-quality-evaluation, append to the report.

**Modify recommendations:** Update the recommendations section based on user feedback, add new suggestions or remove resolved ones.

**Update scope:** Re-filter the test catalog based on the new scope, add or remove file evaluations as needed.

**Refresh:** Re-run the full evaluation on all files in scope, regenerate the complete report.

### 3. Recalculate Aggregates

After applying changes:
- Recalculate per-dimension averages
- Recalculate overall weighted score
- Update the executive summary
- Move resolved findings to a "Resolved" section

### 4. Annotate Changes

Add a "Change Log" section to the report:
```markdown
## Change Log
- {timestamp}: Re-scored auth.test.ts (isolation: 3 --> 5 after fixing shared state)
- {timestamp}: Added 3 new test files to review scope
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-rv
current_step: edit-apply
status: complete
edit_type: {type}
timestamp: {current_timestamp}
```

## SUCCESS METRICS

- [ ] All planned changes applied
- [ ] Aggregate scores recalculated
- [ ] Report updated with change log
- [ ] Executive summary reflects new scores

## FAILURE METRICS

- Edit plan references files that no longer exist --> Skip those, note in change log
- Re-evaluation produces worse scores --> Report honestly, do not suppress regressions
