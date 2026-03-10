---
name: 'step-01-assess'
description: 'Assess existing API test suite for requested edits'
nextStepFile: './step-02-apply-edit.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step E1: Assess — Evaluate Current Test Suite for Edit

## STEP GOAL

Read and understand the existing API test suite, then analyze the user's edit request to determine what changes are needed, which files are affected, and what the impact will be on test coverage and isolation.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no existing API test files are found — recommend Mode A (Create) instead.
- Do not apply any changes in this step. Assessment only.

## CONTEXT BOUNDARIES

- Available context: existing test files, user's edit request, API source code.
- Focus: understanding current state and planning changes. No file modifications.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### E1.1 — Load Existing Test Suite

Read all files in `{test_dir}/api/`:
- Test configuration files.
- Helper modules.
- Resource test files.
- Auth test files.
- Edge case test files.

**If `{test_dir}/api/` does not exist or contains no test files:**
- Inform the user that no API test suite exists yet.
- Recommend running the API workflow in Create mode first.
- **HALT**.

Build an inventory:
- Count total test files.
- Count total test cases.
- List all tested endpoints.
- List all helpers and fixtures.

### E1.2 — Analyze Edit Request

Classify the user's request:

| Category | Examples |
|---|---|
| **Add Endpoint Tests** | "Add tests for the new /orders endpoint", "Test the search API" |
| **Add Test Type** | "Add auth tests", "Add boundary tests for users" |
| **Fix Tests** | "Tests are failing", "Fix the login test", "Update assertions" |
| **Update Tests** | "API response changed", "New field added to user schema" |
| **Refactor Tests** | "Extract common setup", "Improve test organization" |
| **Remove Tests** | "Remove deprecated endpoint tests" |
| **Add Helper** | "Add a custom assertion", "Create a new factory" |

### E1.3 — Impact Analysis

For each planned change, assess:

- **File impact**: Which test files need to be created, modified, or deleted?
- **Helper impact**: Do shared helpers need updates (new factories, assertions, auth roles)?
- **Coverage impact**: Will coverage increase, decrease, or remain the same?
- **Isolation impact**: Could the change break test independence?
- **Dependency impact**: Do other test files depend on code being changed?
- **Convention impact**: Does the change follow existing naming and structure conventions?

### E1.4 — Check for New Endpoints

If the edit involves new endpoints:
- Scan the API source for the endpoint's route definition.
- Identify HTTP method, path, request/response schema.
- Determine authentication requirements.
- Classify the endpoint's risk level.
- Plan test coverage based on risk level (same strategy as Step 2 of Create mode).

### E1.5 — Generate Edit Plan

Compile a detailed edit plan:

```markdown
## Edit Plan

### Requested Changes
1. [change description]

### Files to Create
- [file path]: [purpose, estimated test count]

### Files to Modify
- [file path]: [what changes, which tests affected]

### Files to Delete
- [file path]: [reason]

### Helper Changes
- [helper file]: [additions/modifications]

### Coverage Impact
- Before: [X] endpoints covered, [Y] total tests
- After: [estimated X'] endpoints covered, [estimated Y'] total tests
- Net change: [+/- endpoints, +/- tests]

### Risks
- [potential issues with the changes]

### Rollback Strategy
- [how to undo the changes if needed]
```

### Save Progress

Append to {outputFile}:

```markdown
## Edit Mode — Assessment
- Edit request: [user's request summary]
- Category: [add/fix/update/refactor/remove]
- Files affected: [count]
- Coverage impact: [increase/decrease/neutral]
- Edit plan: [summary]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Existing test suite fully inventoried. Edit request categorized. Impact analysis complete with coverage metrics. Edit plan documented with rollback strategy.
### FAILURE: Cannot read existing test files. Edit request is ambiguous. Impact analysis incomplete.
