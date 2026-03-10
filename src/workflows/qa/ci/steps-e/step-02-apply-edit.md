---
name: 'ci-edit-apply'
description: 'Apply changes to the CI pipeline configuration based on the edit plan'
nextStepFile: ''
outputFile: '{test_artifacts}/ci-pipeline-summary.md'
---

# Edit Step 2 — Apply Changes

## STEP GOAL

Execute the edit plan from step-01-assess, modifying the CI pipeline configuration and validating the changes.

## MANDATORY EXECUTION RULES

1. You MUST follow the edit plan created in step-01-assess.
2. You MUST preserve unaffected portions of the pipeline config.
3. You MUST maintain correct stage ordering after changes.
4. You MUST validate the modified config for syntax correctness.
5. You MUST document all changes made.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/ci-edit-plan.md`, existing CI config file
- WRITE: CI config file (update), `{test_artifacts}/ci-pipeline-summary.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Edit Plan

Read `{test_artifacts}/ci-edit-plan.md` to determine the scope of changes.

### 2. Apply Changes

Execute the planned modifications:

**Add stage:** Insert the new stage in the correct position within the pipeline, add dependencies on prior stages, configure artifacts.

**Modify stage:** Update the specified stage's commands, environment, or conditions while preserving its integration with other stages.

**Add quality gate:** Add the gate evaluation step, configure thresholds, update the quality gate stage.

**Optimize:** Modify cache configuration, add matrix/parallel execution, adjust timeouts.

**Migrate:** Translate the existing pipeline to the new platform's syntax, preserving all functionality.

**Fix:** Apply the targeted fix, add comments explaining the issue and resolution.

### 3. Validate Changes

After applying changes:
- Verify YAML syntax validity
- Confirm stage ordering is correct
- Check all artifact references are valid
- Ensure no circular dependencies
- Verify new secrets are documented

### 4. Document Changes

Update or create `{test_artifacts}/ci-pipeline-summary.md` with:
- Change log entry describing what was modified
- Updated pipeline flow diagram
- New or modified stage descriptions
- Any new configuration requirements

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-ci
current_step: edit-apply
status: complete
edit_type: {type}
timestamp: {current_timestamp}
```

## SUCCESS METRICS

- [ ] All planned changes applied to CI config
- [ ] Pipeline config validates correctly
- [ ] Stage ordering maintained
- [ ] Changes documented in summary
- [ ] No regressions in existing functionality

## FAILURE METRICS

- Edit introduces syntax errors --> Fix before finalizing
- Edit breaks stage dependencies --> Resolve ordering conflicts
