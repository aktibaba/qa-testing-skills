---
name: 'sec-c-step-01b-resume'
step: 1b
mode: resume
next_step: null
---

# Step 1B — Resume Interrupted Workflow

## STEP GOAL

Detect the last completed step from a previously interrupted security testing workflow, validate the state of generated artifacts, and resume execution from the next incomplete step.

## MANDATORY EXECUTION RULES

1. You MUST read the progress file at `{test_artifacts}/workflow-progress.md` before taking any action.
2. You MUST validate that files referenced in the progress file still exist and are intact.
3. You MUST resume from the next incomplete step, not re-execute completed steps.
4. You MUST NOT overwrite files that are marked as complete unless they are corrupted.
5. You MUST inform the user of the detected state before proceeding.

## CONTEXT BOUNDARIES

- Read `{test_artifacts}/workflow-progress.md` for progress state
- Read all files referenced in the progress file to verify they exist
- Read generated test scripts and CI config to verify integrity
- Do NOT modify any files in this step
- Do NOT delete or overwrite completed artifacts

## MANDATORY SEQUENCE

### 1B.1 — Load Progress File

Read `{test_artifacts}/workflow-progress.md` and extract:
- Last completed step number and name
- Detected configuration (stack, tools, attack surface)
- List of generated files
- Threat model state
- Any recorded blockers or pending decisions

If the progress file does not exist or is empty, inform the user and suggest starting with CREATE mode (step-01-preflight.md).

### 1B.2 — Validate Artifact Integrity

For each file listed in the progress file:
1. Verify the file exists at the recorded path
2. Verify the file is non-empty
3. For test scripts, check that they contain expected test structures
4. For scanning configs, check that they contain valid configuration
5. For CI config, check that it references the correct scripts and tools

Record any missing or corrupted files.

### 1B.3 — Determine Resume Point

Map the last completed step to the next step:

| Last Completed | Resume From |
|---|---|
| Step 1 (Preflight) | step-02-threat-model.md |
| Step 2 (Threat Model) | step-03-auth-security-tests.md |
| Step 3 (Auth Tests) | step-04-input-validation-tests.md |
| Step 4 (Input Tests) | step-05-container-dep-scan.md |
| Step 5 (Container/Deps) | step-06-validate-and-summary.md |
| Step 6 (Complete) | Workflow already complete — suggest VALIDATE or EDIT mode |

If artifacts from a completed step are missing or corrupted, resume from that step instead.

### 1B.4 — Present State to User

Display a summary:

```
Security Testing Workflow — Resume

Last completed: Step [N] — [step name]
Files verified: [X] / [Y] intact
Missing/corrupted: [list or "none"]
Threat model: [present/missing]

Resuming from: Step [N+1] — [step name]
```

Wait for user confirmation before proceeding.

### 1B.5 — Resume Execution

Load the determined resume step file and continue execution. The resumed step will have access to all context from the progress file.

## Save Progress

No progress update in this step — the resume target step will update progress.

## SUCCESS METRICS

- Progress file read and parsed successfully
- All referenced artifacts validated
- Correct resume point determined
- User informed of state before proceeding
- Execution continues from the correct step

## FAILURE METRICS

- Progress file not found (must redirect to CREATE mode)
- Progress file is corrupted or unparseable
- Critical artifacts missing with no recovery path
- Wrong resume point selected (re-executing completed work)

---

**Next step:** Load the determined resume target step file.
