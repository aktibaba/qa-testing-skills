---
name: 'perf-e-step-02-apply-edit'
step: 2
mode: edit
next_step: null
previous_step: 'step-01-assess.md'
---

# Edit Step 2 — Apply Changes

## STEP GOAL

Execute the edit plan from step 1, modifying or creating files as specified, then validate that the changes are correct and the suite remains functional.

## MANDATORY EXECUTION RULES

1. You MUST follow the edit plan from step 1 exactly — do not add unplanned changes.
2. You MUST preserve existing functionality that is not part of the edit scope.
3. You MUST update cascade dependencies (thresholds, CI, docs) as identified in the plan.
4. You MUST validate modified scripts for syntactic correctness.
5. You MUST present a summary of all changes made.
6. You MUST save progress after completing edits.

## CONTEXT BOUNDARIES

- Read the edit plan from `{test_artifacts}/workflow-progress.md`
- Read all files identified in the edit plan
- Modify files as specified in the edit plan
- Create new files only if the edit plan calls for them
- Do NOT modify files outside the edit plan scope
- Do NOT execute performance tests

## MANDATORY SEQUENCE

### 2.1 — Load Edit Plan

Read the edit plan from the progress file. Confirm:
- Files to modify and their intended changes
- Files to create (if any)
- Cascade updates required
- Validation criteria

### 2.2 — Apply Primary Changes

For each file in the "Files to Modify" list:

1. Read the current file content
2. Apply the specified change
3. Verify the modification is syntactically correct
4. Ensure no unintended side effects on adjacent code

For each file in the "Files to Create" list:

1. Generate the file following the project's existing conventions
2. Use consistent style with existing performance test scripts
3. Include appropriate comments and documentation

### 2.3 — Apply Cascade Updates

For each cascade dependency identified in the edit plan:

1. **Thresholds** — Update threshold values in affected scripts and documentation
2. **CI config** — Update pipeline configuration if triggers, scripts, or parameters changed
3. **Documentation** — Update README, threshold docs, and any inline documentation
4. **Helper files** — Update shared utilities if interfaces changed

### 2.4 — Validate Changes

Perform static validation:

1. Check modified scripts for syntax errors
2. Verify thresholds are internally consistent (smoke < load < stress progression)
3. Verify CI config references correct script paths
4. Verify parameterization is intact (no hardcoded values introduced)

### 2.5 — Present Change Summary

Display a clear summary:

```markdown
## Changes Applied

### Modified Files
1. [file path] — [description of change]
2. [file path] — [description of change]

### Created Files
1. [file path] — [purpose]

### Cascade Updates
1. [file path] — [what was updated and why]

### Validation
- Syntax check: [pass/fail]
- Threshold consistency: [pass/fail]
- CI config: [pass/fail]
- Parameterization: [pass/fail]
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Edit Complete

## Changes Applied
[Summary of all modifications]

## Validation Results
[Pass/fail for each check]

## Recommendations
[Any follow-up actions suggested]
```

## SUCCESS METRICS

- All planned changes applied successfully
- Cascade dependencies updated
- Modified scripts pass syntax validation
- No unplanned changes introduced
- Change summary presented to user
- Progress file updated

## FAILURE METRICS

- Planned changes not fully applied
- Cascade updates missed (e.g., CI config still references old paths)
- Syntax errors introduced by edits
- Unplanned changes made outside edit scope
- Progress file not updated

---

**Edit workflow complete.** Present the change summary and recommend running the smoke test to verify the changes work correctly.
