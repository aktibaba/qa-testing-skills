---
name: 'step-01b-resume'
description: 'Resume an interrupted API testing workflow from the last completed step'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1B: Resume — Continue Interrupted Workflow

## STEP GOAL

Detect the last completed step from a previous interrupted API workflow run and resume execution from the next incomplete step.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no progress file exists — switch to Mode A (Create).
- Verify the progress file belongs to the API workflow (not another workflow).
- Do not re-execute completed steps unless their outputs are missing.

## CONTEXT BOUNDARIES

- Available context: `{test_artifacts}/workflow-progress.md`, generated test files on disk.
- Focus: state recovery and routing only. Do not perform workflow steps here.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 1B.1 — Load Progress File

Read `{test_artifacts}/workflow-progress.md`.

**If file does not exist:**
- Inform the user that no previous workflow run was found.
- Recommend starting with Mode A (Create).
- **HALT**.

**If file exists but does not contain API workflow markers:**
- Check for `API Workflow Progress` or `qa-api` headers.
- If not found, this may be a progress file from a different workflow.
- Inform the user and recommend starting fresh.
- **HALT**.

**If file exists but is empty or corrupted:**
- Inform the user that the progress file is unreadable.
- Recommend starting fresh with Mode A (Create).
- **HALT**.

### 1B.2 — Determine Last Completed Step

Parse the progress file for status markers. Look for the latest `## Status:` entry:

| Status Marker | Last Completed | Next Step |
|---|---|---|
| `step-01-preflight COMPLETE` | Step 1 | `./step-02-design-test-strategy.md` |
| `step-02-design-test-strategy COMPLETE` | Step 2 | `./step-03-generate-tests.md` |
| `step-03-generate-tests COMPLETE` | Step 3 | `./step-04-auth-tests.md` |
| `step-04-auth-tests COMPLETE` | Step 4 | `./step-05-error-edge-cases.md` |
| `step-05-error-edge-cases COMPLETE` | Step 5 | `./step-06-validate-and-summary.md` |
| `WORKFLOW COMPLETE` | All steps | No action needed |

### 1B.3 — Verify Step Outputs

Before resuming, verify that the outputs from completed steps still exist:

**Step 1 outputs:** Detection data (endpoints, framework, auth type) in progress file.
**Step 2 outputs:** Test strategy and coverage matrix in progress file.
**Step 3 outputs:** Test infrastructure files and resource test files on disk.
**Step 4 outputs:** Auth test files on disk.
**Step 5 outputs:** Edge case test files on disk.

For each completed step, check:
- Are the expected files present at their documented paths?
- Do the files contain real test code (not empty)?
- Are helper modules intact?

If any expected output is missing:
- Roll back to the step that should have produced it.
- Inform the user which step needs to be re-executed and why.

### 1B.4 — Report and Route

Present the user with:
- Last completed step name.
- Summary of completed work (endpoints discovered, tests generated, etc.).
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

### SUCCESS: Progress file parsed correctly. Workflow identified as API workflow. Last completed step identified. All prior outputs verified. Next step loaded.
### FAILURE: Progress file missing or belongs to a different workflow. Prior step outputs are missing and cannot be recovered.
