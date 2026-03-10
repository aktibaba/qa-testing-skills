---
name: 'reg-edit-apply'
description: 'Apply changes to the regression suite based on the edit plan'
nextStepFile: ''
outputFile: '{test_artifacts}/reg-suite-summary.md'
---

# Edit Step 2 — Apply Changes

## STEP GOAL

Execute the edit plan from step-01-assess, modifying test tags, suite configurations, and documentation.

## MANDATORY EXECUTION RULES

1. You MUST follow the edit plan created in step-01-assess.
2. You MUST update test file tags/markers to match new assignments.
3. You MUST update suite configuration files.
4. You MUST re-verify time budgets after changes.
5. You MUST update the suite summary documentation.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/reg-edit-plan.md`, suite config files, test files
- WRITE: Test files (tags), suite config files, `{test_artifacts}/reg-suite-summary.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Edit Plan

Read `{test_artifacts}/reg-edit-plan.md` to determine the scope of changes.

### 2. Apply Tag Changes

For each affected test:
- Update the suite tag/marker (e.g., `@smoke` to `@sanity`)
- Update the priority marker (e.g., `@priority_p1` to `@priority_p2`)
- Add `@quarantine` with date and reason if quarantining
- Remove `@quarantine` if un-quarantining

### 3. Update Suite Configuration

Modify suite config files to reflect changes:
- Update test path patterns if using file-based organization
- Update tag lists if using tag-based filtering
- Update run commands if test counts changed significantly

### 4. Re-verify Time Budgets

After applying changes:
- Recalculate estimated execution time for each suite
- Verify smoke suite is within `{smoke_time_budget}`
- Verify full regression is within `{execution_time_budget}`
- Flag any budget violations

### 5. Update Documentation

Update `{test_artifacts}/reg-suite-summary.md`:
- Updated suite counts and time estimates
- Change log entry
- Updated coverage map
- Updated ownership table (if applicable)

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-reg
current_step: edit-apply
status: complete
edit_type: {type}
tests_modified: {count}
timestamp: {current_timestamp}
```

## SUCCESS METRICS

- [ ] All planned changes applied
- [ ] Test tags updated correctly
- [ ] Suite configurations updated
- [ ] Time budgets re-verified
- [ ] Documentation updated

## FAILURE METRICS

- Tag changes break test execution --> Revert and investigate
- Time budget exceeded after changes --> Flag for user decision
