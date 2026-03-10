# API Workflow — API Testing

## PURPOSE

Design and implement comprehensive API test suites covering functional validation, authentication, authorization, error handling, edge cases, and contract compliance. Supports REST, GraphQL, and gRPC APIs with any test framework.

---

## MODE SELECTION

Determine the execution mode based on the user's intent and current state.

### Mode A — Create (default)

**Trigger:** First run, or user explicitly requests new API tests.

1. Load configuration from `{config_source}`.
2. Execute steps in `steps-c/` sequentially:
   - `step-01-preflight.md` — Detect API framework, gather endpoints, check dependencies.
   - `step-02-design-test-strategy.md` — Risk-based API test strategy.
   - `step-03-generate-tests.md` — Generate API test files.
   - `step-04-auth-tests.md` — Authentication and authorization tests.
   - `step-05-error-edge-cases.md` — Error handling and edge case tests.
   - `step-06-validate-and-summary.md` — Run tests, validate, summarize.

### Mode B — Resume

**Trigger:** An interrupted workflow is detected via `{test_artifacts}/workflow-progress.md`.

1. Load progress from `{test_artifacts}/workflow-progress.md`.
2. Execute `steps-c/step-01b-resume.md` to determine last completed step.
3. Continue from the next incomplete step in the Create sequence.

### Mode C — Validate

**Trigger:** User asks to validate, audit, or review existing API tests.

1. Execute `steps-v/step-01-validate.md`.
2. Score the test suite against `checklist.md`.
3. Report pass/fail with improvement guidance.

### Mode D — Edit

**Trigger:** User asks to modify, add, or update existing API tests.

1. Execute `steps-e/step-01-assess.md` to understand current tests and requested change.
2. Execute `steps-e/step-02-apply-edit.md` to apply the change.
3. Re-validate affected test files.

---

## MODE DETECTION LOGIC

```
IF {test_artifacts}/workflow-progress.md exists AND is incomplete AND workflow is qa-api:
    → Mode B (Resume)
ELSE IF user intent contains "validate" OR "review" OR "audit" OR "check quality":
    → Mode C (Validate)
ELSE IF user intent contains "edit" OR "update" OR "add test" OR "modify" OR "fix test" OR "add endpoint":
    → Mode D (Edit)
ELSE:
    → Mode A (Create)
```

---

## CONFIGURATION LOADING

Before executing any mode, load and merge configuration:

1. Read `{config_source}` for project-level settings.
2. Apply workflow-level variable overrides from `workflow.yaml`.
3. Auto-detect API framework, test framework, and authentication type.
4. If `api_base_url` is empty, detect from project configuration.
5. Store resolved configuration in memory for all steps.

---

## OUTPUT CONTRACT

Upon successful completion of any mode, the workflow produces:

| Artifact | Path | Description |
|---|---|---|
| Test files | `{test_dir}/api/` | API test source files |
| Test config | `{test_dir}/api/config/` | Test configuration and fixtures |
| Test helpers | `{test_dir}/api/helpers/` | Shared utilities and request builders |
| Progress log | `{test_artifacts}/workflow-progress.md` | Step completion tracking |
| Summary report | `{test_artifacts}/api-summary.md` | Test coverage summary and run instructions |
