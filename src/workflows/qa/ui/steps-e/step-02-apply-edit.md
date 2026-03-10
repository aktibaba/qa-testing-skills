---
name: 'step-02-apply-edit'
description: 'Apply the planned changes to existing UI tests'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 2 (Edit): Apply Changes — Execute the Edit Plan

## STEP GOAL
Execute the edit plan from the assessment step, modify existing files, create new files as needed, and validate the changes.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Follow the edit plan exactly — do not expand scope without user approval
- Preserve existing test functionality — do not break passing tests
- Run the quality checklist on modified files

## CONTEXT BOUNDARIES
- Available context: edit plan from Step 1 (Edit), existing test files, project source
- Required knowledge fragments: varies by edit type

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 2E.1 — Execute Modifications

Apply each change from the edit plan:

**For each file to modify:**
1. Read the current file content
2. Identify the specific sections to change
3. Apply changes while preserving:
   - Existing passing test logic (unless specifically targeted for change)
   - Import statements and dependencies
   - File structure and naming conventions
   - Comments and documentation
4. Verify the modified file is syntactically valid

**For each new file to create:**
1. Follow the same patterns and conventions as existing files
2. Use consistent naming, selector strategy, and assertion patterns
3. Ensure new page objects extend the existing base class (if available)
4. Add header comments explaining the file's purpose

**For each file to delete:**
1. Confirm with user before deleting
2. Check that no other files import from the file being deleted
3. Update any index or barrel files

### 2E.2 — Update Dependencies

If new packages are needed:
1. Generate the install command but do not auto-execute
2. Present to user for approval: `npm install -D <packages>`
3. Update config files if new plugins or extensions are required

### 2E.3 — Validate Changes

Run the quality checklist (from `checklist.md`) on ALL modified and new files:

1. **Selector check** — All new selectors use `data-testid` or ARIA
2. **Wait check** — No new `sleep()` or hard waits introduced
3. **Isolation check** — New tests remain independent
4. **POM check** — New page interactions go through page objects
5. **Naming check** — Test names describe user behavior

### 2E.4 — Generate Diff Summary

Produce a clear summary of all changes:

```
Changes Applied:
- Modified: <file> — <what changed>
- Created: <file> — <what it does>
- Deleted: <file> — <reason>

New dependencies: <list or "none">
Source changes needed: <list of data-testid additions or "none">
```

### 2E.5 — Provide Verification Commands

Give the user commands to verify the changes work:

```bash
# Run only modified/new tests
npx playwright test <specific-test-files>

# Run full suite to check nothing is broken
npx playwright test

# Update visual baselines if visual tests were modified
npx playwright test --update-snapshots specs/visual/
```

### Save Progress

Finalize {outputFile}:

```markdown
## Status: EDIT COMPLETE

## Changes Applied
| Action   | File                       | Description                    |
|----------|----------------------------|--------------------------------|
| Modified | specs/auth-flow.spec.ts    | Updated selectors for new form |
| Created  | pages/settings.page.ts     | New page object for settings   |
| ...      | ...                        | ...                            |

## Validation Results
- Checklist items checked: <N>
- All PASS: <yes/no>
- Issues found: <list or "none">

## Verification Commands
<commands from 2E.5>
```

Load next step: Workflow complete. Return control to user.

## SUCCESS/FAILURE METRICS
### SUCCESS: All planned changes applied, no existing tests broken, new code passes checklist validation, diff summary provided, verification commands given
### FAILURE: Changes not applied as planned, existing tests broken by modifications, new code violates checklist items, no verification path provided
