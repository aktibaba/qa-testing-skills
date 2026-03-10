---
name: 'step-01-validate'
description: 'Validate existing test environment against quality checklist'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step V1: Validate — Full Environment Quality Audit

## STEP GOAL

Perform a comprehensive quality audit of the existing test environment by evaluating every item in the validation checklist. Produce a scored report with specific remediation guidance for any failures.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no `docker-compose.test.yml` exists — there is nothing to validate.
- Evaluate every checklist item. Do not skip items or assume passes.
- Be objective — report actual state, not intended state.

## CONTEXT BOUNDARIES

- Available context: all Docker files in the project, `checklist.md`, project filesystem.
- Focus: read-only audit. Do not modify any files. Report findings only.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### V1.1 — Load Environment Files

Read all test environment files:
- `{project-root}/docker-compose.test.yml`
- `{project-root}/.env.test`
- `{project-root}/.env.test.example`
- `{project-root}/docker/test/Dockerfile.*`
- `{project-root}/scripts/test-env.sh`
- `{project-root}/.dockerignore`
- `{project-root}/.gitignore`

**If `docker-compose.test.yml` does not exist:**
- Report that no test environment has been set up.
- Recommend running the ENV workflow in Create mode.
- **HALT**.

Note which files exist and which are missing.

### V1.2 — Docker Compose Structure Audit

Evaluate against the "Docker Compose Structure" section of `checklist.md`:

- Check YAML validity by parsing the Compose file structure.
- Verify Compose specification version or format.
- Check all `container_name` values for `test-` prefix.
- Verify a dedicated test network is defined and used.
- Check that all services are attached to the test network.

Record PASS/FAIL for each item with evidence.

### V1.3 — Image Configuration Audit

Evaluate against the "Image Configuration" section:

- Check every `image:` directive for pinned version tags.
- Verify image publishers (official Docker Hub images preferred).
- If custom Dockerfiles exist, check for multi-stage builds.
- Check base image sizes (alpine/slim preferred).

Record PASS/FAIL for each item with evidence.

### V1.4 — Health Check Audit

Evaluate against the "Health Checks" section:

For every service in the Compose file:
- Verify `healthcheck` directive exists.
- Verify the health check command is appropriate for the service type.
- Verify `interval`, `timeout`, `retries`, and `start_period` are configured.
- Check `depends_on` entries use `condition: service_healthy`.

Record PASS/FAIL for each item with evidence. List any services missing health checks.

### V1.5 — Environment Variables Audit

Evaluate against the "Environment Variables" section:

- Check `.env.test` exists and contains required variables.
- Scan Compose file and Dockerfiles for hardcoded secrets or credentials.
- Check `.gitignore` for `.env.test` entry.
- Verify database connection strings use container service names.

Record PASS/FAIL for each item with evidence.

### V1.6 — Resource Management Audit

Evaluate against the "Resource Management" section:

- Check for `mem_limit` or `deploy.resources.limits.memory` on resource-intensive services.
- Check for CPU limits where appropriate.
- Check for `tmpfs` usage for ephemeral data.
- Review named volume usage — verify necessity.

Record PASS/FAIL for each item with evidence.

### V1.7 — Port Management Audit

Evaluate against the "Port Management" section:

- Check host port mappings for conflicts with common ports (3000, 5432, 3306, 6379, etc.).
- Verify offset port strategy (e.g., 15432 instead of 5432).
- Check that only necessary ports are exposed.

Record PASS/FAIL for each item with evidence.

### V1.8 — Cleanup and Isolation Audit

Evaluate against the "Cleanup and Isolation" section:

- Verify `docker compose down -v` would remove all resources.
- Check for orphan volume or network definitions.
- Verify test data isolation between runs.
- Check independence from any development `docker-compose.yml`.

Record PASS/FAIL for each item with evidence.

### V1.9 — Documentation Audit

Evaluate against the "Documentation" section:

- Check for quick-start command documentation.
- Check for environment variable descriptions.
- Check for troubleshooting guidance.
- Check for teardown instructions.

Record PASS/FAIL for each item with evidence.

### V1.10 — Compile Validation Report

Calculate the quality score:

Count results:
- Total items evaluated.
- Items passed.
- Items failed.
- Critical items failed.

Determine rating:
- **GREEN**: All items pass.
- **YELLOW**: 1-3 non-critical items fail.
- **RED**: Any critical item fails.

Generate the validation report:

```markdown
# ENV Validation Report

## Quality Score: [GREEN/YELLOW/RED]
## Passed: [X] / [total]

## Results by Category

### Docker Compose Structure
- [PASS/FAIL] [item] — [evidence]

### Image Configuration
- [PASS/FAIL] [item] — [evidence]

[...for each category]

## Critical Failures
[List any critical failures with remediation steps]

## Recommendations
[Ordered list of improvements, critical first]

## Remediation Commands
[Specific commands or file changes to fix failures]
```

### Save Progress

Append to {outputFile}:

```markdown
## Validation Mode — Complete
- Quality Score: [GREEN/YELLOW/RED]
- Passed: [X] / [total]
- Critical failures: [count]
- Report: {test_artifacts}/env-validation-report.md
```

Write the full report to `{test_artifacts}/env-validation-report.md`.

## SUCCESS/FAILURE METRICS

### SUCCESS: Every checklist item evaluated with evidence. Quality score calculated correctly. Report includes specific remediation guidance for failures. Report written to artifacts directory.
### FAILURE: Checklist items skipped without evaluation. Score does not match actual results. No remediation guidance provided for failures.
