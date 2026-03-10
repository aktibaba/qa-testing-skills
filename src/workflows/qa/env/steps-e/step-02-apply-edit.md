---
name: 'step-02-apply-edit'
description: 'Apply requested changes to the test environment'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step E2: Apply Edit — Execute Environment Changes

## STEP GOAL

Apply the edit plan from Step E1 to the existing test environment files, then validate the modified configuration to ensure it remains functional.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no edit plan exists from Step E1.
- Preserve all existing services and configuration that are not part of the edit.
- Maintain valid YAML throughout all modifications.

## CONTEXT BOUNDARIES

- Available context: edit plan from Step E1, all existing Docker files, checklist.md.
- Focus: apply changes and validate. Do not expand scope beyond the edit plan.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### E2.1 — Load Edit Plan

Read the edit plan from `{test_artifacts}/workflow-progress.md`.

**If edit plan is missing:**
- **HALT** — return to Step E1.

### E2.2 — Apply Service Changes

Execute each change from the edit plan:

**Adding a service:**
1. Add the service definition to `docker-compose.test.yml` with proper formatting.
2. Include `container_name` with `test-` prefix.
3. Add health check configuration appropriate to the service type.
4. Connect to `test-network`.
5. Add any required port mappings with offset values.
6. Update `depends_on` for services that need this new dependency.
7. Add environment variables to `.env.test`.

**Removing a service:**
1. Remove the service definition from `docker-compose.test.yml`.
2. Remove any `depends_on` references to this service from other services.
3. Remove associated port mappings.
4. Remove associated environment variables from `.env.test`.
5. Remove associated volume definitions if they are service-specific.
6. Remove any custom Dockerfile if it was only for this service.

**Updating a service:**
1. Modify the specific attributes as requested.
2. If the image version changes, verify the health check command still works with the new version.
3. Update any dependent configuration (ports, environment variables, volumes).

**Changing configuration:**
1. Apply the configuration change to the appropriate file.
2. Verify consistency across all files (Compose, .env.test, Dockerfiles).

### E2.3 — Update Health Checks

If the edit affects services with health checks:
- Verify existing health checks are compatible with changes.
- Add health checks for new services.
- Update health check commands if service versions changed.
- Adjust `depends_on` conditions for the updated dependency chain.

### E2.4 — Update Helper Script

If the edit changes the service set:
- Verify `scripts/test-env.sh` still works with the updated Compose file.
- No changes needed if the script uses generic `docker compose` commands.

### E2.5 — Validate Modified Environment

Run validation checks on the modified files:
- YAML syntax verification for `docker-compose.test.yml`.
- All service names are valid identifiers.
- All image references have version tags.
- All port mappings are valid and do not conflict.
- All environment variable references are defined in `.env.test`.
- Network and volume references are consistent.
- Dependency chain has no cycles.

Run the modified configuration against the critical items from `checklist.md`:
- Valid Compose syntax.
- All services have health checks.
- No hardcoded secrets.
- Clean teardown is possible.

### E2.6 — Report Changes

Present to the user:
- Summary of all changes applied.
- Files modified with a diff summary.
- Validation results.
- Any warnings or recommendations.
- Commands to apply the changes (e.g., `./scripts/test-env.sh reset`).

### Save Progress

Append to {outputFile}:

```markdown
## Edit Mode — Applied
- Changes applied: [summary]
- Files modified: [list]
- Validation: [PASS/FAIL with details]
- Recommended next action: [restart environment / no action needed]
```

## SUCCESS/FAILURE METRICS

### SUCCESS: All planned changes applied. Modified files pass syntax and checklist validation. No unintended side effects on existing services. User receives clear summary of changes.
### FAILURE: Changes introduce syntax errors. Dependency chain is broken. Validation reveals critical checklist failures. Existing services are disrupted by the edit.
