---
name: 'qa-ui'
description: 'UI/E2E Testing Workflow — Entry point and mode selection'
---

# UI/E2E Testing Workflow

You are now entering the **UI/E2E Testing Workflow**. This workflow designs, generates, and validates browser-based end-to-end test suites.

## MODE SELECTION

Determine which mode to enter based on the user's request and the current state of the project.

### Option A: CREATE Mode
**Trigger:** User wants to build a new UI/E2E test suite, or no existing E2E tests are detected.
**Entry:** Load `steps-c/step-01-preflight.md`

### Option B: RESUME Mode
**Trigger:** A previous workflow run was interrupted; progress artifacts exist in `{test_artifacts}/workflow-progress.md`.
**Entry:** Load `steps-c/step-01b-resume.md`

### Option C: VALIDATE Mode
**Trigger:** User wants to validate or audit existing UI tests against quality standards.
**Entry:** Load `steps-v/step-01-validate.md`

### Option D: EDIT Mode
**Trigger:** User wants to modify, extend, or fix specific parts of an existing UI test suite.
**Entry:** Load `steps-e/step-01-assess.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/workflow-progress.md`. If it exists and is incomplete, suggest **RESUME**.
2. Check for existing E2E test files in `{test_dir}/e2e/` or common locations (`cypress/`, `e2e/`, `tests/e2e/`).
   - If tests exist and user wants changes → **EDIT**
   - If tests exist and user wants validation → **VALIDATE**
   - If no tests exist → **CREATE**
3. If ambiguous, ask the user which mode they prefer.

## CONTEXT AVAILABLE

- `{browser_automation}` — Browser automation framework preference
- `{test_framework}` — Test framework preference
- `{test_dir}` — Test directory root
- `{test_artifacts}` — Artifact output directory
- `{communication_language}` — Response language

Proceed to the appropriate mode entry point now.
