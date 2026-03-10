---
name: 'step-01-validate'
description: 'Validate existing API test suite against quality checklist'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step V1: Validate — Full API Test Suite Quality Audit

## STEP GOAL

Perform a comprehensive quality audit of the existing API test suite by evaluating every item in the validation checklist. Produce a scored report with specific improvement guidance for any failures.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no API test files exist — there is nothing to validate.
- Evaluate every checklist item. Do not skip items or assume passes.
- Be objective — report actual test quality, not intentions.

## CONTEXT BOUNDARIES

- Available context: all test files in `{test_dir}/api/`, checklist.md, API source code for coverage comparison.
- Focus: read-only audit. Do not modify any files. Report findings only.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### V1.1 — Load Test Suite

Read all files in `{test_dir}/api/` and its subdirectories.

**If directory does not exist or contains no test files:**
- Report that no API test suite has been created.
- Recommend running the API workflow in Create mode.
- **HALT**.

Build a complete inventory:
- Total test files.
- Total test cases (count individual test functions/it blocks).
- Test categories (functional, auth, validation, edge cases).
- Helper modules and configuration files.

### V1.2 — Test Structure Audit

Evaluate against the "Test Structure" section of `checklist.md`:

- Check directory organization (config/, helpers/, resources/, auth/, edge-cases/).
- Verify each API resource has a dedicated test file.
- Check for shared helpers in helpers/ directory.
- Verify centralized configuration exists.
- Check test data fixtures are separate from test logic.

Record PASS/FAIL for each item with specific file paths as evidence.

### V1.3 — Test Naming and Readability Audit

Evaluate against the "Test Naming and Readability" section:

- Sample test names and check for "should [behavior] when [condition]" pattern.
- Verify describe blocks map to endpoints or features.
- Check for single assertion purpose in each test.
- Search for magic numbers or unexplained constants.

Record PASS/FAIL with examples from the test files.

### V1.4 — Functional Coverage Audit

Evaluate against the "Functional Coverage" section:

- Inventory API endpoints from source code.
- Map test files to endpoints.
- Check for CRUD coverage per resource.
- Verify happy path tests check status code, body structure, and data values.
- Check for response schema validation.
- Look for pagination, filtering, and sorting tests.
- Check Content-Type and Accept header verification.

Produce a coverage gap report listing untested endpoints.

### V1.5 — Authentication and Authorization Audit

Evaluate against the "Authentication and Authorization" section:

- Check for auth test files.
- Verify valid and invalid credential flows are tested.
- Check for expired/revoked token tests.
- Verify protected endpoints test unauthenticated access.
- Check for role-based access tests (if applicable).
- Check for cross-tenant isolation tests (if applicable).

Record PASS/FAIL with evidence.

### V1.6 — Error Handling Audit

Evaluate against the "Error Handling" section:

- Check for missing required field tests.
- Check for invalid data type tests.
- Check for 404 tests with invalid IDs.
- Check for 405 tests with unsupported methods.
- Check for 5xx error handling tests.

Record PASS/FAIL with evidence.

### V1.7 — Edge Cases and Boundaries Audit

Evaluate against the "Edge Cases and Boundaries" section:

- Check for empty string and null value tests.
- Check for boundary value tests (min, max, zero, negative).
- Check for special character and Unicode tests.
- Check for large payload tests.
- Check for injection pattern tests.

Record PASS/FAIL with evidence.

### V1.8 — Test Isolation Audit

Evaluate against the "Test Isolation" section:

- Analyze test setup/teardown hooks.
- Check for shared state between tests.
- Verify tests can run in any order.
- Check for unique identifiers in test data.
- Look for database cleanup patterns.

This is a critical section — shared state is the most common cause of flaky API tests.

Record PASS/FAIL with specific violations identified.

### V1.9 — Test Infrastructure Audit

Evaluate against the "Test Infrastructure" section:

- Check if base URL is configurable via environment variable.
- Check timeout configuration.
- Check for shared HTTP client.
- Check for centralized auth token management.
- Check for custom assertion helpers.

Record PASS/FAIL with evidence.

### V1.10 — Documentation Audit

Evaluate against the "Documentation" section:

- Check for test run command documentation.
- Check for environment setup prerequisites.
- Check for coverage report instructions.
- Check for known limitations documentation.

Record PASS/FAIL with evidence.

### V1.11 — Compile Validation Report

Calculate the quality score:

- Total items evaluated.
- Items passed.
- Items failed.
- Critical items failed.

Determine rating:
- **GREEN**: All items pass.
- **YELLOW**: 1-4 non-critical items fail.
- **RED**: Any critical item fails (no functional coverage for critical endpoints, no auth tests, tests not isolated, no error handling).

Generate the validation report:

```markdown
# API Test Suite Validation Report

## Quality Score: [GREEN/YELLOW/RED]
## Passed: [X] / [total]

## Results by Category

### Test Structure
- [PASS/FAIL] [item] — [evidence]

### Test Naming and Readability
- [PASS/FAIL] [item] — [evidence]

### Functional Coverage
- [PASS/FAIL] [item] — [evidence]
- Coverage: [X] / [total] endpoints ([percentage]%)

### Authentication and Authorization
- [PASS/FAIL] [item] — [evidence]

### Error Handling
- [PASS/FAIL] [item] — [evidence]

### Edge Cases and Boundaries
- [PASS/FAIL] [item] — [evidence]

### Test Isolation
- [PASS/FAIL] [item] — [evidence]

### Test Infrastructure
- [PASS/FAIL] [item] — [evidence]

### Documentation
- [PASS/FAIL] [item] — [evidence]

## Coverage Gaps
[List of untested endpoints with their risk levels]

## Critical Failures
[List of critical failures with remediation steps]

## Improvement Roadmap
[Prioritized list of improvements, ordered by impact]
1. [highest impact improvement]
2. ...

## Remediation Estimates
[Rough effort estimates for each improvement]
```

### Save Progress

Append to {outputFile}:

```markdown
## Validation Mode — Complete
- Quality Score: [GREEN/YELLOW/RED]
- Passed: [X] / [total]
- Critical failures: [count]
- Coverage: [X] / [total] endpoints
- Report: {test_artifacts}/api-validation-report.md
```

Write the full report to `{test_artifacts}/api-validation-report.md`.

## SUCCESS/FAILURE METRICS

### SUCCESS: Every checklist item evaluated with evidence from actual test files. Quality score calculated correctly. Coverage gaps identified with endpoint-level detail. Improvement roadmap prioritized by impact. Report written to artifacts directory.
### FAILURE: Checklist items skipped. Score does not match actual results. Coverage comparison missing (no endpoint inventory from source). No remediation guidance.
