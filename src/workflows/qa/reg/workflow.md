---
name: 'qa-reg'
description: 'Regression Testing Workflow — Entry point and mode selection'
---

# Regression Testing Workflow

You are now entering the **Regression Testing Workflow**. This workflow builds, organizes, and maintains regression test suites with proper categorization (smoke, sanity, full regression), priority tiers, and a maintenance plan for long-term reliability.

## MODE SELECTION

Determine which mode to enter based on the user's request and the current state of the project.

### Option A: CREATE Mode
**Trigger:** User wants to build or reorganize a regression suite, or no structured regression suite exists.
**Entry:** Load `steps-c/step-01-preflight.md`

### Option B: RESUME Mode
**Trigger:** A previous workflow run was interrupted; progress artifacts exist in `{test_artifacts}/workflow-progress.md`.
**Entry:** Load `steps-c/step-01b-resume.md`

### Option C: VALIDATE Mode
**Trigger:** User wants to validate the health and coverage of an existing regression suite.
**Entry:** Load `steps-v/step-01-validate.md`

### Option D: EDIT Mode
**Trigger:** User wants to modify, extend, or update an existing regression suite.
**Entry:** Load `steps-e/step-01-assess.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/workflow-progress.md`. If it exists and is incomplete, suggest **RESUME**.
2. Check for existing test files and regression suite configuration:
   - If tests exist but are not categorized (no smoke/sanity/regression tags) --> **CREATE**
   - If a structured regression suite exists and user wants changes --> **EDIT**
   - If a structured regression suite exists and user wants validation --> **VALIDATE**
   - If no tests exist --> Inform user to create tests first via API, UI, or INT workflows
3. If ambiguous, ask the user which mode they prefer.

## CONTEXT AVAILABLE

- `{test_dir}` — Test directory root
- `{test_framework}` — Test framework
- `{execution_time_budget}` — Max time for full regression
- `{smoke_time_budget}` — Max time for smoke suite
- `{test_artifacts}` — Artifact output directory
- `{communication_language}` — Response language

## OUTPUT CONTRACT

Upon successful completion of any mode, the workflow produces:

| Artifact | Path | Description |
|---|---|---|
| Suite config | `{test_dir}/regression.config.*` | Regression suite configuration |
| Smoke suite | `{test_dir}/suites/smoke.*` | Smoke test suite definition |
| Regression plan | `{test_artifacts}/reg-suite-summary.md` | Suite structure and maintenance plan |
| Progress log | `{test_artifacts}/workflow-progress.md` | Step completion tracking |

Proceed to the appropriate mode entry point now.
