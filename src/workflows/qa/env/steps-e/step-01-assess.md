---
name: 'step-01-assess'
description: 'Assess existing test environment for requested edits'
nextStepFile: './step-02-apply-edit.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step E1: Assess — Evaluate Current Environment for Edit

## STEP GOAL

Read and understand the existing test environment configuration, then analyze the user's edit request to determine what changes are needed and their impact on the overall setup.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no existing `docker-compose.test.yml` is found — recommend Mode A (Create) instead.
- Do not apply any changes in this step. Assessment only.

## CONTEXT BOUNDARIES

- Available context: existing Docker files, `.env.test`, user's edit request.
- Focus: understanding current state and planning changes. No file modifications.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### E1.1 — Load Existing Configuration

Read the following files:
- `{project-root}/docker-compose.test.yml` — current Compose definition.
- `{project-root}/.env.test` — current environment variables.
- `{project-root}/docker/test/Dockerfile.*` — any custom Dockerfiles.
- `{project-root}/scripts/test-env.sh` — helper script.

**If `docker-compose.test.yml` does not exist:**
- Inform the user that no test environment exists yet.
- Recommend running the ENV workflow in Create mode first.
- **HALT**.

### E1.2 — Parse Current Services

Build an inventory of the current environment:
- List all services with their images, ports, volumes, and health checks.
- Map the dependency chain.
- Identify the network configuration.
- Note all environment variables and their current values.

### E1.3 — Analyze Edit Request

Classify the user's request into one or more edit categories:

| Category | Examples |
|---|---|
| **Add Service** | "Add Redis", "I need Kafka", "Add a mail server" |
| **Remove Service** | "Remove MongoDB", "I don't need Elasticsearch anymore" |
| **Update Service** | "Upgrade PostgreSQL to 16", "Change Redis port" |
| **Change Configuration** | "Add environment variable", "Change memory limits" |
| **Update Health Check** | "Increase timeout", "Fix health check for service X" |
| **Restructure** | "Split into profiles", "Add test data seeding" |

### E1.4 — Impact Analysis

For each planned change, assess:
- **Dependency impact**: Will other services be affected? Do `depends_on` chains need updating?
- **Port conflicts**: Does adding/changing a service introduce port conflicts?
- **Environment variables**: Do new variables need to be added to `.env.test`?
- **Volume changes**: Do volume mounts need to be added or removed?
- **Health check impact**: Do health checks need to be added, updated, or removed?
- **Breaking changes**: Will this change break existing test configurations?

### E1.5 — Generate Edit Plan

Compile a detailed edit plan:

```markdown
## Edit Plan

### Requested Changes
1. [change description]

### Files to Modify
- [file path]: [what changes]

### New Files to Create
- [file path]: [purpose]

### Impact Assessment
- Dependency chain: [affected/not affected]
- Port mapping: [changes needed/no change]
- Environment variables: [additions/removals/no change]
- Health checks: [additions/updates/no change]
- Breaking changes: [yes - details / no]

### Rollback Strategy
- [how to undo the changes if needed]
```

### Save Progress

Append to {outputFile}:

```markdown
## Edit Mode — Assessment
- Edit request: [user's request summary]
- Category: [add/remove/update/restructure]
- Impact: [low/medium/high]
- Files affected: [list]
- Edit plan: [summary]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Current environment fully inventoried. Edit request categorized. Impact analysis complete. Edit plan documented with rollback strategy.
### FAILURE: Cannot read existing Docker files. Edit request is ambiguous and cannot be classified. Impact analysis reveals irreconcilable conflicts.
