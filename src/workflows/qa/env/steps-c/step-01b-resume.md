---
name: 'step-01b-resume'
description: 'Resume an interrupted ENV workflow from the last completed step'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1B: Resume — Continue Interrupted Workflow

## STEP GOAL

Detect the last completed step from a previous interrupted workflow run and resume execution from the next incomplete step.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no progress file exists — this means there is nothing to resume; switch to Mode A (Create).
- Do not re-execute completed steps unless their outputs are missing or corrupted.

## CONTEXT BOUNDARIES

- Available context: `{test_artifacts}/workflow-progress.md`, generated files on disk.
- Focus: state recovery and routing only. Do not perform workflow steps here.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 1B.1 — Load Progress File

Read `{test_artifacts}/workflow-progress.md`.

**If file does not exist:**
- Inform the user that no previous workflow run was found.
- Recommend starting with Mode A (Create).
- **HALT**.

**If file exists but is empty or corrupted:**
- Inform the user that the progress file is unreadable.
- Recommend starting fresh with Mode A (Create) after backing up existing artifacts.
- **HALT**.

### 1B.2 — Determine Last Completed Step

Parse the progress file for status markers. Look for the latest `## Status:` entry:

| Status Marker | Last Completed | Next Step |
|---|---|---|
| `step-01-preflight COMPLETE` | Step 1 | `./step-02-design-environment.md` |
| `step-02-design-environment COMPLETE` | Step 2 | `./step-03-generate-compose.md` |
| `step-03-generate-compose COMPLETE` | Step 3 | `./step-04-health-checks.md` |
| `step-04-health-checks COMPLETE` | Step 4 | `./step-05-validate-and-summary.md` |
| `WORKFLOW COMPLETE` | All steps | No action needed — workflow already finished |

### 1B.3 — Verify Step Outputs

Before resuming, verify that the outputs from completed steps still exist:

**Step 1 outputs:** Detection data in progress file.
**Step 2 outputs:** Service blueprint in progress file.
**Step 3 outputs:** `docker-compose.test.yml`, `.env.test`, `scripts/test-env.sh` on disk.
**Step 4 outputs:** Updated `docker-compose.test.yml` with health checks.

If any expected output is missing:
- Roll back to the step that should have produced it.
- Inform the user which step needs to be re-executed and why.

### 1B.4 — Report and Route

Present the user with:
- Last completed step name and timestamp (if available).
- Summary of completed work.
- Next step to execute.
- Any issues found during output verification.

Ask for confirmation before resuming, then load the appropriate next step file.

### Save Progress

Append to {outputFile}:

```markdown
## Resume Point
- Resumed at: [timestamp]
- Last completed: [step name]
- Resuming from: [next step name]
- Output verification: [PASS/issues found]
```

Load next step: {nextStepFile} (dynamically determined from 1B.2)

## SUCCESS/FAILURE METRICS

### SUCCESS: Progress file parsed correctly. Last completed step identified. All prior outputs verified. Next step loaded and execution resumed.
### FAILURE: Progress file missing or corrupted. Prior step outputs are missing and cannot be recovered. Conflicting state between progress file and actual files on disk.
