---
name: 'step-02-apply-edit'
description: 'Apply requested changes to the API test suite'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step E2: Apply Edit — Execute Test Suite Changes

## STEP GOAL

Apply the edit plan from Step E1 to the existing API test suite, then validate the modified suite to ensure tests remain isolated, conventions are followed, and coverage is maintained or improved.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no edit plan exists from Step E1.
- Preserve existing test isolation — new tests must not depend on other tests' state.
- Follow existing naming conventions and file organization.
- Generate real, executable test code — no placeholder functions.

## CONTEXT BOUNDARIES

- Available context: edit plan from Step E1, all existing test files, API source code.
- Focus: apply changes and validate. Do not expand scope beyond the edit plan.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### E2.1 — Load Edit Plan

Read the edit plan from `{test_artifacts}/workflow-progress.md`.

**If edit plan is missing:**
- **HALT** — return to Step E1.

### E2.2 — Apply Changes by Category

**Adding Endpoint Tests:**
1. Create the new test file following existing directory structure and naming conventions.
2. Import existing helpers (request builder, assertions, auth, cleanup).
3. Create test data factories for the new resource (add to fixtures file).
4. Generate tests according to the risk-level coverage matrix.
5. Include setup/teardown hooks for test data.

**Adding Test Types:**
1. Create the new test file in the appropriate directory (auth/, edge-cases/).
2. Reuse existing helpers and infrastructure.
3. Follow the same patterns as existing tests of that type.

**Fixing Tests:**
1. Identify the root cause of the failure.
2. Update assertions, request payloads, or setup/teardown as needed.
3. Verify the fix does not break other tests.
4. Document what changed and why.

**Updating Tests:**
1. Update affected test assertions to match new API response schemas.
2. Add new fields to factories and fixtures.
3. Update schema validation tests.
4. Verify no tests rely on the old response format.

**Refactoring Tests:**
1. Extract shared code to helper modules.
2. Update all files that should use the extracted code.
3. Verify no functionality is lost.
4. Ensure test count remains the same.

**Removing Tests:**
1. Delete the test file or remove specific test cases.
2. Update any shared state or fixtures that were only used by removed tests.
3. Update coverage documentation.

**Adding Helpers:**
1. Create the helper in the `helpers/` directory.
2. Export the helper function or class.
3. Update existing tests to use the new helper where appropriate.
4. Add documentation comments explaining usage.

### E2.3 — Validate Modified Suite

After applying changes:

**Structural validation:**
- All test files follow naming conventions.
- All imports reference existing modules.
- No circular dependencies.
- Directory structure is maintained.

**Isolation validation:**
- No test depends on state from another test.
- Each test has its own setup and teardown.
- Test data uses unique identifiers.
- New tests include cleanup in teardown.

**Convention validation:**
- Test names follow "should [behavior] when [condition]" pattern.
- Describe blocks map to endpoints or features.
- Single assertion purpose per test.
- Consistent code style with existing tests.

**Coverage validation:**
- Map all tests to endpoints.
- Verify no previously covered endpoints lost coverage.
- Verify new endpoints have appropriate coverage for their risk level.

### E2.4 — Report Changes

Present to the user:
- Summary of all changes applied.
- Files created, modified, or deleted.
- Test count before and after.
- Coverage impact (endpoints gained/lost).
- Validation results.
- Commands to run the modified tests.
- Any warnings or recommendations for follow-up.

### Save Progress

Append to {outputFile}:

```markdown
## Edit Mode — Applied
- Changes applied: [summary]
- Files created: [list]
- Files modified: [list]
- Files deleted: [list]
- Test count: [before] → [after] ([+/- change])
- Coverage: [before] → [after] endpoints
- Validation: [PASS/FAIL with details]
```

## SUCCESS/FAILURE METRICS

### SUCCESS: All planned changes applied. Modified suite passes structural, isolation, and convention validation. Coverage is maintained or improved. User receives clear summary with run commands.
### FAILURE: Changes introduce test isolation violations. Generated code has syntax errors. Coverage decreased without justification. Existing tests are broken by the edit.
