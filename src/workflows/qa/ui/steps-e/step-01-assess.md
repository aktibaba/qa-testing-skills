---
name: 'step-01-assess'
description: 'Assess existing UI tests for edit mode'
nextStepFile: './step-02-apply-edit.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1 (Edit): Assess — Analyze Existing UI Tests

## STEP GOAL
Understand the current state of the existing UI test suite, identify what the user wants to change, and plan the specific edits needed.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Do NOT modify any files in this step — assessment only
- Ask the user to clarify if the edit request is ambiguous

## CONTEXT BOUNDARIES
- Available context: existing test files, project source, user's edit request
- Required knowledge fragments: `selector-resilience` (09), `page-object-model` (11), `test-isolation` (07)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 1E.1 — Understand Edit Request

Parse the user's request and classify it:

| Edit Type            | Examples                                                |
|----------------------|---------------------------------------------------------|
| **Add coverage**     | "Add tests for the new settings page"                  |
| **Fix flaky tests**  | "The checkout test fails intermittently"               |
| **Update selectors** | "We refactored the login form, tests are broken"       |
| **Add visual tests** | "Add screenshot tests for the dashboard"               |
| **Add a11y tests**   | "We need accessibility tests for all pages"            |
| **Refactor**         | "Our tests don't use page objects, help us refactor"   |
| **Update config**    | "We switched from Cypress to Playwright"               |
| **Performance**      | "Tests take 20 minutes, help us speed them up"         |

### 1E.2 — Scan Existing Test Suite

Inventory the current test suite:

1. **Test files** — List all test files with locations, file sizes, and test counts
2. **Page objects** — Check if POM pattern is used, list page object files
3. **Config** — Read framework config, note settings
4. **Helpers** — List utility files, auth helpers, fixture files
5. **CI integration** — Check for CI pipeline config referencing tests
6. **Test results** — If available, read recent test reports for pass/fail patterns

### 1E.3 — Gap Analysis

Based on the edit request, identify:

1. **Files to modify** — Which existing files need changes
2. **Files to create** — Any new files needed
3. **Files to delete** — Any files that should be removed (e.g., replacing framework)
4. **Dependencies** — Any new packages needed
5. **Source changes** — Any `data-testid` attributes to add in application source

### 1E.4 — Impact Assessment

Evaluate the scope of changes:

- **Low impact:** Changes to 1-3 files, no structural changes
- **Medium impact:** Changes to 4-10 files, may require new page objects
- **High impact:** Structural refactoring, framework migration, 10+ files affected

### 1E.5 — Present Edit Plan

Show the user a clear edit plan:

```
Edit Plan:
- Type: <edit type>
- Impact: <low/medium/high>
- Files to modify: <list>
- Files to create: <list>
- Dependencies to add: <list>
- Estimated scope: <brief description>

Proceed? (y/n)
```

### Save Progress

Save to {outputFile}:

```markdown
# UI/E2E Workflow Progress — Edit Mode

## Status: Edit Assessment Complete

## Edit Request
- Type: <type>
- Description: <user's request>

## Current State
- Test files: <count>
- Page objects: <count>
- Framework: <name and version>

## Edit Plan
- Files to modify: <list>
- Files to create: <list>
- Impact: <level>

## Next Step: step-02-apply-edit.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: Edit request clearly classified, existing suite fully scanned, edit plan with specific file list presented, user confirmed plan
### FAILURE: Edit request misunderstood, existing tests not scanned, no clear plan of what to change
