# ENV Workflow — Docker Test Environment Setup

## PURPOSE

Build reproducible, disposable Docker-based test environments tailored to the project's technology stack. Generates `docker-compose.test.yml`, supporting Dockerfiles, health checks, wait-for-it scripts, and usage documentation.

---

## MODE SELECTION

Determine the execution mode based on the user's intent and current state.

### Mode A — Create (default)

**Trigger:** First run, or user explicitly requests a new environment setup.

1. Load configuration from `{config_source}`.
2. Execute steps in `steps-c/` sequentially:
   - `step-01-preflight.md` — Detect stack, verify Docker, gather context.
   - `step-02-design-environment.md` — Design Docker Compose services.
   - `step-03-generate-compose.md` — Generate docker-compose.test.yml and Dockerfiles.
   - `step-04-health-checks.md` — Add health checks and readiness probes.
   - `step-05-validate-and-summary.md` — Validate setup, provide instructions.

### Mode B — Resume

**Trigger:** An interrupted workflow is detected via `{test_artifacts}/workflow-progress.md`.

1. Load progress from `{test_artifacts}/workflow-progress.md`.
2. Execute `steps-c/step-01b-resume.md` to determine last completed step.
3. Continue from the next incomplete step in the Create sequence.

### Mode C — Validate

**Trigger:** User asks to validate, audit, or check an existing environment.

1. Execute `steps-v/step-01-validate.md`.
2. Score the environment against `checklist.md`.
3. Report pass/fail with remediation guidance.

### Mode D — Edit

**Trigger:** User asks to modify, update, or change an existing environment.

1. Execute `steps-e/step-01-assess.md` to understand current state and requested change.
2. Execute `steps-e/step-02-apply-edit.md` to apply the change.
3. Re-validate affected components.

---

## MODE DETECTION LOGIC

```
IF {test_artifacts}/workflow-progress.md exists AND is incomplete:
    → Mode B (Resume)
ELSE IF user intent contains "validate" OR "check" OR "audit" OR "review":
    → Mode C (Validate)
ELSE IF user intent contains "edit" OR "update" OR "change" OR "modify" OR "add service" OR "remove service":
    → Mode D (Edit)
ELSE:
    → Mode A (Create)
```

---

## CONFIGURATION LOADING

Before executing any mode, load and merge configuration:

1. Read `{config_source}` for project-level settings.
2. Apply workflow-level variable overrides from `workflow.yaml`.
3. Auto-detect values where variables are set to `"auto"`.
4. Store resolved configuration in memory for all steps.

---

## OUTPUT CONTRACT

Upon successful completion of any mode, the workflow produces:

| Artifact | Path | Description |
|---|---|---|
| Docker Compose file | `{project-root}/docker-compose.test.yml` | Main orchestration file |
| Dockerfiles | `{project-root}/docker/test/` | Custom Dockerfiles if needed |
| Environment file | `{project-root}/.env.test` | Environment variables for test containers |
| Progress log | `{test_artifacts}/workflow-progress.md` | Step completion tracking |
| Summary report | `{test_artifacts}/env-summary.md` | Final summary and usage instructions |
