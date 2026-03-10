---
name: 'step-05-validate-and-summary'
description: 'Validate the complete setup and provide usage instructions'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 5: Validate and Summary — Final Verification

## STEP GOAL

Validate the entire generated test environment against the quality checklist, run a syntax check, and produce a comprehensive summary with usage instructions for the user.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if generated files from Steps 3-4 are missing.
- Run every validation check even if early checks pass.
- Be honest about failures — do not mark items as passed without verification.

## CONTEXT BOUNDARIES

- Available context: all generated files, checklist.md, workflow progress.
- Focus: validation and documentation only. Do not modify generated files unless a critical error is found.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 5.1 — Syntax Validation

Validate the Docker Compose file:
- Read `{project-root}/docker-compose.test.yml` and verify valid YAML structure.
- Verify all service names are valid Docker Compose identifiers.
- Verify all image references include version tags.
- Verify all port mappings have valid host:container format.
- Verify all environment variable references are defined.
- Verify network and volume definitions are consistent with service references.

If any syntax errors are found:
- Fix them in the Compose file.
- Document the fix in the progress log.

### 5.2 — Checklist Validation

Load `checklist.md` and evaluate each item:

For each checklist item:
1. Read the criterion.
2. Check the generated files against it.
3. Mark as PASS or FAIL with a brief justification.

Compile results into a validation report.

### 5.3 — Compute Quality Score

Based on checklist results:

- **GREEN**: All items pass. Environment is production-ready.
- **YELLOW**: 1-3 non-critical items fail. Environment is functional but has gaps.
- **RED**: Any critical item fails. Environment needs remediation before use.

Critical items that trigger RED:
- Invalid Compose syntax.
- Missing health checks on any service.
- Hardcoded secrets in Compose or Dockerfiles.
- No clean teardown capability.

### 5.4 — Generate Architecture Diagram

Create a text-based architecture diagram showing:
- All services and their connections.
- Port mappings (host:container).
- Network topology.
- Volume mounts.

Example format:

```
                    ┌─────────────────────────────────────┐
                    │         test-network (bridge)        │
                    └──────┬──────────┬──────────┬────────┘
                           │          │          │
                    ┌──────▼──┐ ┌─────▼────┐ ┌──▼──────┐
                    │ test-app│ │test-redis │ │test-mail│
                    │ :3001   │ │ :16379   │ │ :18025  │
                    └────┬────┘ └──────────┘ └─────────┘
                         │
                    ┌────▼─────────┐
                    │test-postgres │
                    │ :15432       │
                    └──────────────┘
```

### 5.5 — Generate Summary Report

Write `{test_artifacts}/env-summary.md`:

```markdown
# Test Environment Summary

## Quick Start

### Start the environment
```bash
./scripts/test-env.sh up
# or
docker compose -f docker-compose.test.yml up -d --wait
```

### Run tests
```bash
[framework-specific test command]
```

### Check status
```bash
./scripts/test-env.sh status
```

### View logs
```bash
./scripts/test-env.sh logs
```

### Tear down
```bash
./scripts/test-env.sh down
# or
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

### Reset (rebuild from scratch)
```bash
./scripts/test-env.sh reset
```

## Services

| Service | Image | Host Port | Container Port | Health Check |
|---|---|---|---|---|
| [for each service] |

## Architecture

[text-based diagram from 5.4]

## Environment Variables

See `.env.test` for all configuration. Copy `.env.test.example` to `.env.test` to get started.

## Troubleshooting

### Containers fail to start
- Check Docker daemon is running: `docker info`
- Check port conflicts: `lsof -i :[port]`
- Check logs: `./scripts/test-env.sh logs`

### Health checks failing
- Increase `start_period` in docker-compose.test.yml
- Check service-specific logs: `docker logs test-[service]`

### Tests cannot connect to services
- Verify containers are healthy: `./scripts/test-env.sh status`
- Use container service names (not localhost) in test configuration
- Check `.env.test` for correct connection strings

## Quality Score

[GREEN/YELLOW/RED] — [summary]

## Checklist Results

[pass/fail for each checklist item]
```

### 5.6 — Final Progress Update

### Save Progress

Update {outputFile}:

```markdown
## Status: WORKFLOW COMPLETE

## Final Quality Score: [GREEN/YELLOW/RED]
## Generated Files: [list all files]
## Summary Report: {test_artifacts}/env-summary.md
```

Present the summary to the user with the quick-start commands prominently displayed.

## SUCCESS/FAILURE METRICS

### SUCCESS: All generated files pass syntax validation. Quality score is GREEN or YELLOW. Summary report is complete with quick-start commands, architecture diagram, and troubleshooting guide. User can start the environment with a single command.
### FAILURE: Compose file has syntax errors that could not be auto-fixed. Quality score is RED. Summary report is missing critical sections.
