---
name: 'step-01-assess'
description: 'Assess existing integration tests for edit mode'
nextStepFile: './step-02-apply-edit.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1 (Edit): Assess — Analyze Existing Integration Tests

## STEP GOAL
Understand the current state of the existing integration test suite, identify what the user wants to change, and plan the specific edits needed.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Do NOT modify any files in this step — assessment only
- Ask the user to clarify if the edit request is ambiguous

## CONTEXT BOUNDARIES
- Available context: existing test files, project source, user's edit request
- Required knowledge fragments: `contract-testing` (13), `mock-stub-spy` (34), `test-isolation` (07), `database-testing` (22)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 1E.1 — Understand Edit Request

Parse the user's request and classify it:

| Edit Type                | Examples                                                    |
|--------------------------|-------------------------------------------------------------|
| **Add integration point** | "We added a new payment provider, need tests"              |
| **Update mocks**          | "Stripe API v2 changed, mocks are outdated"               |
| **Fix broken tests**      | "DB tests fail after migration, schema changed"            |
| **Add error scenarios**   | "Need more failure mode coverage for the auth service"     |
| **Add webhook tests**     | "We now send webhooks, need delivery tests"                |
| **Docker env changes**    | "Switched from MySQL to PostgreSQL"                        |
| **Refactor test structure** | "Tests are slow, need better isolation"                  |
| **Add contract tests**    | "Need Pact tests for the API gateway"                     |

### 1E.2 — Scan Existing Test Suite

Inventory the current integration test suite:

1. **Test files** — List all integration test files with locations and test counts
2. **Docker config** — Read Docker Compose test configuration
3. **Mocks** — List mock definitions (WireMock mappings, nock interceptors, etc.)
4. **Helpers** — List test lifecycle helpers, factories, seed scripts
5. **Contracts** — Check for Pact files, OpenAPI specs used in tests
6. **CI config** — Check pipeline configuration for integration test stage
7. **Test results** — If available, review recent test reports for patterns

### 1E.3 — Gap Analysis

Based on the edit request, identify:

1. **Files to modify** — Which existing test files, mocks, or helpers need changes
2. **Files to create** — New test files, mock definitions, or helpers needed
3. **Files to delete** — Obsolete mocks, outdated test files
4. **Docker changes** — New services, version updates, config changes
5. **Dependencies** — New packages for mock tools, test frameworks
6. **Database changes** — Migration scripts, seed data updates

### 1E.4 — Impact Assessment

Evaluate the scope of changes:

- **Low impact:** Mock updates, adding tests to existing files, seed data changes
- **Medium impact:** New test files, new mock services, Docker config changes
- **High impact:** Framework migration, architecture changes, Docker Compose restructuring

### 1E.5 — Present Edit Plan

Show the user a clear edit plan:

```
Edit Plan:
- Type: <edit type>
- Impact: <low/medium/high>
- Files to modify: <list>
- Files to create: <list>
- Docker changes: <list or "none">
- Dependencies to add: <list or "none">
- Estimated scope: <brief description>

Proceed? (y/n)
```

### Save Progress

Save to {outputFile}:

```markdown
# Integration Testing Workflow Progress — Edit Mode

## Status: Edit Assessment Complete

## Edit Request
- Type: <type>
- Description: <user's request>

## Current State
- Integration test files: <count>
- Mock definitions: <count>
- Docker services: <count>
- Framework: <name>

## Edit Plan
- Files to modify: <list>
- Files to create: <list>
- Docker changes: <list>
- Impact: <level>

## Next Step: step-02-apply-edit.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: Edit request classified, existing suite fully scanned, edit plan with specific file list presented, impact assessed, user confirmed plan
### FAILURE: Edit request misunderstood, existing tests not scanned, no clear plan of what to change
