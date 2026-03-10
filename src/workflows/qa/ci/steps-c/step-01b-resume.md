---
name: 'ci-resume'
description: 'Resume an interrupted CI pipeline workflow'
nextStepFile: ''
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1b — Resume Interrupted Workflow

## STEP GOAL

Detect and resume from the last completed step of a previously interrupted CI pipeline workflow.

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
- Step 01 complete --> `{test_artifacts}/ci-preflight.md` exists
- Step 02 complete --> CI config file exists at platform-specific path
- Step 03 complete --> `{test_artifacts}/ci-quality-gates.md` exists
- Step 04 complete --> `{test_artifacts}/ci-pipeline-summary.md` exists (workflow done)

If an artifact is missing, re-run that step and all subsequent steps.

### 3. Resume Execution

Map `next_step` to the correct step file:
- `step-02-generate-pipeline` --> Load `steps-c/step-02-generate-pipeline.md`
- `step-03-quality-gates` --> Load `steps-c/step-03-quality-gates.md`
- `step-04-validate-and-summary` --> Load `steps-c/step-04-validate-and-summary.md`
- `none` --> Workflow already complete, inform user

### 4. Inform User

Present a summary:
```
Resuming CI Pipeline Workflow
- Completed: step-01 (preflight), step-02 (pipeline generation)
- Resuming from: step-03 (quality gates)
- Artifacts verified: ci-preflight.md, ci.yml
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md` with resume timestamp.

## SUCCESS METRICS

- [ ] Progress file read and parsed
- [ ] Intermediate artifacts verified
- [ ] Correct next step identified and loaded
- [ ] User informed of resume state

## FAILURE METRICS

- Progress file missing or corrupted --> Offer to restart from step-01
- Critical artifacts missing --> Re-run from the step that produces them
