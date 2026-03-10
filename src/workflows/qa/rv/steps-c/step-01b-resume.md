---
name: 'rv-resume'
description: 'Resume an interrupted test review workflow'
nextStepFile: ''
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1b — Resume Interrupted Workflow

## STEP GOAL

Detect and resume from the last completed step of a previously interrupted test review workflow.

## MANDATORY EXECUTION RULES

1. You MUST read `{test_artifacts}/workflow-progress.md` to determine the last completed step.
2. You MUST verify that intermediate artifacts from completed steps still exist.
3. You MUST resume from the next incomplete step, not restart from the beginning.
4. You MUST inform the user which steps were already completed and which will now run.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/workflow-progress.md`, all intermediate artifacts
- WRITE: `{test_artifacts}/workflow-progress.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Read Progress File

Load `{test_artifacts}/workflow-progress.md` and parse:
- `current_step` — Last completed step
- `status` — Should be "complete" for the last step
- `next_step` — The step to resume from

### 2. Verify Artifacts

Confirm that artifacts from completed steps exist:
- Step 01 complete --> `{test_artifacts}/rv-context.md` exists
- Step 02 complete --> `{test_artifacts}/rv-test-catalog.md` exists
- Step 03 complete --> `{test_artifacts}/rv-evaluation-data.md` exists
- Step 04 complete --> `{test_artifacts}/rv-quality-report.md` exists (workflow already done)

If an artifact is missing, re-run that step and all subsequent steps.

### 3. Resume Execution

Map `next_step` to the correct step file:
- `step-02-discover-tests` --> Load `steps-c/step-02-discover-tests.md`
- `step-03-quality-evaluation` --> Load `steps-c/step-03-quality-evaluation.md`
- `step-04-generate-report` --> Load `steps-c/step-04-generate-report.md`
- `none` --> Workflow already complete, inform user

### 4. Inform User

Present a summary:
```
Resuming Test Review Workflow
- Completed: step-01 (context), step-02 (discovery)
- Resuming from: step-03 (quality evaluation)
- Artifacts verified: rv-context.md, rv-test-catalog.md
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md` with resume timestamp:
```
workflow: qa-rv
current_step: {resumed_step}
status: resuming
resumed_from: {last_completed_step}
timestamp: {current_timestamp}
```

## SUCCESS METRICS

- [ ] Progress file read and parsed
- [ ] Intermediate artifacts verified
- [ ] Correct next step identified and loaded
- [ ] User informed of resume state

## FAILURE METRICS

- Progress file missing or corrupted --> Offer to restart from step-01
- Critical artifacts missing --> Re-run from the step that produces them
