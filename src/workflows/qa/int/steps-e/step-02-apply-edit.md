---
name: 'step-02-apply-edit'
description: 'Apply the planned changes to existing integration tests'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 2 (Edit): Apply Changes — Execute the Edit Plan

## STEP GOAL
Execute the edit plan from the assessment step, modify existing files, create new files as needed, update Docker configuration, and validate the changes.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Follow the edit plan exactly — do not expand scope without user approval
- Preserve existing passing tests — do not break what already works
- Run the quality checklist on modified files

## CONTEXT BOUNDARIES
- Available context: edit plan from Step 1 (Edit), existing test files, project source
- Required knowledge fragments: varies by edit type

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 2E.1 — Execute Modifications

Apply each change from the edit plan:

**For test file modifications:**
1. Read the current file content
2. Identify specific sections to change
3. Apply changes preserving existing passing test logic
4. Maintain consistent import structure and naming conventions
5. Verify the modified file is syntactically valid

**For Docker Compose changes:**
1. Read the current compose file
2. Add/modify/remove services as planned
3. Ensure all services have health checks
4. Verify ports do not conflict
5. Test that the compose file is valid YAML

**For mock definition updates:**
1. Update mock response payloads to match new API versions
2. Add new endpoint mappings
3. Update request matchers if request format changed
4. Verify mock definitions match the real API contract

**For new files:**
1. Follow existing project conventions (naming, structure, patterns)
2. Use the same test helpers and factories as existing tests
3. Add header comments identifying the integration boundary
4. Ensure new tests are independent of existing tests

### 2E.2 — Update Dependencies

If new packages are needed:
1. Generate the install command but do not auto-execute
2. Present to user: `npm install -D <packages>`
3. Update any configuration files for new plugins

### 2E.3 — Update Docker Environment

If Docker changes were planned:
1. Update `docker-compose.test.yml` with new/modified services
2. Add health checks for any new services
3. Update `.env.test` with new connection strings or endpoints
4. Update test lifecycle helpers to wait for new services

### 2E.4 — Validate Changes

Run the quality checklist (from `checklist.md`) on ALL modified and new files:

1. **Service boundaries** — Clear boundary identification in new/modified tests
2. **Contract validation** — Request/response format tested
3. **Data flow** — Seed data and cleanup correct
4. **Error propagation** — Error paths covered
5. **Test isolation** — No shared state between tests
6. **Environment** — Docker config valid with health checks

### 2E.5 — Generate Diff Summary

```
Changes Applied:
- Modified: <file> — <what changed>
- Created: <file> — <what it does>
- Deleted: <file> — <reason>
- Docker: <service added/modified/removed>

New dependencies: <list or "none">
Environment changes: <list or "none">
```

### 2E.6 — Provide Verification Commands

```bash
# Restart test environment (if Docker changes were made)
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d --wait

# Run only modified/new tests
npx jest <specific-test-files>

# Run full integration suite to check nothing is broken
npm run test:integration

# Verify Docker services are healthy
docker compose -f docker-compose.test.yml ps
```

### Save Progress

Finalize {outputFile}:

```markdown
## Status: EDIT COMPLETE

## Changes Applied
| Action   | File                              | Description                      |
|----------|-----------------------------------|----------------------------------|
| Modified | specs/api/users.contract.test.ts  | Updated for API v2 changes       |
| Created  | mocks/wiremock/new-provider.json  | Mock for new payment provider    |
| ...      | ...                               | ...                              |

## Docker Changes
- <list or "none">

## Validation Results
- Checklist items checked: <N>
- All PASS: <yes/no>
- Issues found: <list or "none">

## Verification Commands
<commands from 2E.6>
```

Load next step: Workflow complete. Return control to user.

## SUCCESS/FAILURE METRICS
### SUCCESS: All planned changes applied, no existing tests broken, Docker config valid, new code passes checklist validation, diff summary provided, verification commands given
### FAILURE: Changes not applied as planned, existing tests broken, Docker config invalid, no verification path
