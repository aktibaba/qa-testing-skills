---
name: 'step-01b-resume'
description: 'Resume an interrupted integration testing workflow'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1B: Resume — Continue Interrupted Workflow

## STEP GOAL
Read the saved workflow progress, determine where the previous session stopped, and resume from the next incomplete step.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Do NOT re-execute completed steps
- Verify completed artifacts still exist before skipping their steps

## CONTEXT BOUNDARIES
- Available context: `{test_artifacts}/workflow-progress.md`, generated files from prior steps

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 1B.1 — Load Progress File

Read `{test_artifacts}/workflow-progress.md` and parse:

1. **Last completed step** — Which step number was last marked complete
2. **Detected configuration** — Stack type, service map, integration points
3. **Generated files list** — Which files were already created
4. **Strategy decisions** — Mock boundaries, test layering, priority assignments
5. **Any blockers** — Issues noted in the progress file

### 1B.2 — Verify Artifacts

For each completed step, verify the expected output files still exist:

- **Step 1 complete:** Service dependency map and integration point catalog recorded
- **Step 2 complete:** Test strategy with mock boundaries and priority matrix recorded
- **Step 3 complete:** Docker Compose file, helper files, mock definitions, seed data exist on disk
- **Step 4 complete:** Integration test spec files exist on disk
- **Step 5 complete:** Webhook and event-driven test files exist on disk

If any artifacts are missing for a "completed" step, mark that step for re-execution.

### 1B.3 — Present Resume Summary

Show the user:

```
Resume Summary:
- Last completed step: Step <N> — <name>
- Artifacts verified: <pass/fail for each step>
- Resuming from: Step <N+1> — <name>
- Outstanding work: <brief description>
```

Ask the user to confirm before proceeding.

### 1B.4 — Route to Next Step

Based on the last completed step, load the appropriate next step file:

| Last Complete | Resume From                        |
|---------------|------------------------------------|
| Step 1        | `./step-02-design-strategy.md`     |
| Step 2        | `./step-03-setup-test-env.md`      |
| Step 3        | `./step-04-generate-tests.md`      |
| Step 4        | `./step-05-webhook-event-tests.md` |
| Step 5        | `./step-06-validate-and-summary.md`|

If no progress file exists, inform the user and redirect to Step 1 (Create mode): `./step-01-preflight.md`

### Save Progress

Update {outputFile} with resume entry:

```markdown
## Resume Event: <timestamp>
- Previous session ended at: Step <N>
- Artifacts verified: <status>
- Resuming from: Step <N+1>
```

Load next step: Determined dynamically from 1B.4.

## SUCCESS/FAILURE METRICS
### SUCCESS: Progress file loaded successfully, artifacts verified, user confirmed resume point, correct next step loaded
### FAILURE: Progress file not found or corrupted, artifacts missing without detection, resumed from wrong step
