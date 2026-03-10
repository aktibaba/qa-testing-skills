---
name: 'qa-rv'
description: 'Test Review Workflow — Entry point and mode selection'
---

# Test Review Workflow

You are now entering the **Test Review Workflow**. This workflow evaluates existing tests against quality best practices and produces a scored quality report with actionable recommendations.

## MODE SELECTION

Determine which mode to enter based on the user's request and the current state of the project.

### Option A: CREATE Mode
**Trigger:** User wants a full test quality review, or no previous review report exists.
**Entry:** Load `steps-c/step-01-load-context.md`

### Option B: RESUME Mode
**Trigger:** A previous workflow run was interrupted; progress artifacts exist in `{test_artifacts}/workflow-progress.md`.
**Entry:** Load `steps-c/step-01b-resume.md`

### Option C: VALIDATE Mode
**Trigger:** User wants to quickly validate tests against the quality checklist without a full review.
**Entry:** Load `steps-v/step-01-validate.md`

### Option D: EDIT Mode
**Trigger:** User wants to modify or update an existing quality report or fix previously flagged issues.
**Entry:** Load `steps-e/step-01-assess.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/workflow-progress.md`. If it exists and is incomplete, suggest **RESUME**.
2. Check for existing test files in `{test_dir}/` or common locations (`tests/`, `test/`, `spec/`, `__tests__/`).
   - If tests exist and user wants a fresh review --> **CREATE**
   - If tests exist and user wants to fix flagged issues --> **EDIT**
   - If tests exist and user wants a quick validation --> **VALIDATE**
   - If no tests exist --> Inform user there are no tests to review.
3. If ambiguous, ask the user which mode they prefer.

## CONTEXT AVAILABLE

- `{test_dir}` — Test directory root
- `{test_framework}` — Test framework
- `{review_scope}` — Scope of review (all, unit, integration, e2e, changed-only)
- `{test_artifacts}` — Artifact output directory
- `{communication_language}` — Response language

Proceed to the appropriate mode entry point now.
