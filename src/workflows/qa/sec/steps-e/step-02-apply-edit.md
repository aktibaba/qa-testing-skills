---
name: 'sec-e-step-02-apply-edit'
step: 2
mode: edit
next_step: null
previous_step: 'step-01-assess.md'
---

# Edit Step 2 — Apply Changes

## STEP GOAL

Execute the edit plan from step 1, modifying or creating files as specified, then validate that the changes are correct and the security test suite maintains or improves its coverage.

## MANDATORY EXECUTION RULES

1. You MUST follow the edit plan from step 1 exactly — do not add unplanned changes.
2. You MUST preserve existing security coverage that is not part of the edit scope.
3. You MUST update cascade dependencies (threat model, CI, report) as identified in the plan.
4. You MUST validate modified test files for syntactic correctness.
5. You MUST verify that the change does not reduce overall security coverage.
6. You MUST present a summary of all changes made.
7. You MUST save progress after completing edits.

## CONTEXT BOUNDARIES

- Read the edit plan from `{test_artifacts}/workflow-progress.md`
- Read all files identified in the edit plan
- Modify files as specified in the edit plan
- Create new files only if the edit plan calls for them
- Do NOT modify files outside the edit plan scope
- Do NOT execute security tests or scans

## MANDATORY SEQUENCE

### 2.1 — Load Edit Plan

Read the edit plan from the progress file. Confirm:
- Files to modify and their intended changes
- Files to create (if any)
- Cascade updates required
- Coverage validation criteria

### 2.2 — Apply Primary Changes

For each file in the "Files to Modify" list:

1. Read the current file content
2. Apply the specified change
3. Verify the modification is syntactically correct
4. Verify security test logic is sound (correct payloads, assertions, status codes)
5. Ensure no unintended side effects on adjacent test cases

For each file in the "Files to Create" list:

1. Generate the file following the project's existing security test conventions
2. Use consistent style with existing test scripts
3. Include appropriate comments explaining attack vectors
4. Include proper imports and helper references

### 2.3 — Apply Cascade Updates

For each cascade dependency identified in the edit plan:

1. **Threat model** — Add new threats or update risk scores if the attack surface changed
2. **CI config** — Update pipeline configuration if new scanning tools or test files were added
3. **Security report** — Note that the report should be regenerated after changes
4. **Helper files** — Update shared utilities if interfaces changed
5. **Checklist** — Note any items that are now covered or no longer covered

### 2.4 — Validate Changes

Perform validation:

1. Check modified test files for syntax errors
2. Verify test assertions match expected security behavior (correct status codes, rejection patterns)
3. Verify CI config references correct file paths
4. Verify no credentials or secrets were introduced
5. Verify coverage is maintained or improved (count test cases before and after)

### 2.5 — Present Change Summary

Display a clear summary:

```markdown
## Changes Applied

### Modified Files
1. [file path] — [description of change]
2. [file path] — [description of change]

### Created Files
1. [file path] — [purpose and coverage area]

### Cascade Updates
1. [file path] — [what was updated and why]

### Coverage Impact
- Before: [X] test cases across [Y] categories
- After: [X'] test cases across [Y'] categories
- Net change: [+/- N] test cases

### Validation
- Syntax check: [pass/fail]
- Security logic: [pass/fail]
- CI config: [pass/fail]
- No hardcoded secrets: [pass/fail]
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Edit Complete

## Changes Applied
[Summary of all modifications]

## Coverage Impact
[Before/after comparison]

## Validation Results
[Pass/fail for each check]

## Recommendations
[Any follow-up actions suggested, such as regenerating the security report]
```

## SUCCESS METRICS

- All planned changes applied successfully
- Cascade dependencies updated
- Modified files pass syntax validation
- Security coverage maintained or improved
- No credentials or secrets introduced
- No unplanned changes made outside edit scope
- Change summary presented to user
- Progress file updated

## FAILURE METRICS

- Planned changes not fully applied
- Cascade updates missed
- Syntax errors introduced by edits
- Security coverage reduced without justification
- Credentials hardcoded in modified files
- Unplanned changes made outside edit scope
- Progress file not updated

---

**Edit workflow complete.** Present the change summary and recommend running the affected test categories to verify the changes work correctly.
