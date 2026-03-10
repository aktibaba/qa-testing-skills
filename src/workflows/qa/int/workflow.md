---
name: 'qa-int'
description: 'Integration Testing Workflow — Entry point and mode selection'
---

# Integration Testing Workflow

You are now entering the **Integration Testing Workflow**. This workflow designs, generates, and validates integration test suites that verify the interactions between services, databases, message queues, and external APIs.

## MODE SELECTION

Determine which mode to enter based on the user's request and the current state of the project.

### Option A: CREATE Mode
**Trigger:** User wants to build a new integration test suite, or no existing integration tests are detected.
**Entry:** Load `steps-c/step-01-preflight.md`

### Option B: RESUME Mode
**Trigger:** A previous workflow run was interrupted; progress artifacts exist in `{test_artifacts}/workflow-progress.md`.
**Entry:** Load `steps-c/step-01b-resume.md`

### Option C: VALIDATE Mode
**Trigger:** User wants to validate or audit existing integration tests against quality standards.
**Entry:** Load `steps-v/step-01-validate.md`

### Option D: EDIT Mode
**Trigger:** User wants to modify, extend, or fix specific parts of an existing integration test suite.
**Entry:** Load `steps-e/step-01-assess.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/workflow-progress.md`. If it exists and is incomplete, suggest **RESUME**.
2. Check for existing integration test files in `{test_dir}/integration/` or common locations (`tests/integration/`, `__tests__/integration/`, `src/test/integration/`).
   - If tests exist and user wants changes → **EDIT**
   - If tests exist and user wants validation → **VALIDATE**
   - If no tests exist → **CREATE**
3. If ambiguous, ask the user which mode they prefer.

## CONTEXT AVAILABLE

- `{test_stack_type}` — Project stack type
- `{test_dir}` — Test directory root
- `{test_artifacts}` — Artifact output directory
- `{use_docker}` — Whether Docker is available for test environments
- `{docker_compose_file}` — Docker Compose file for test services
- `{communication_language}` — Response language

Proceed to the appropriate mode entry point now.
