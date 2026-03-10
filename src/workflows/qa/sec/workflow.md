---
name: 'qa-sec'
description: 'Security Testing Workflow — Entry point and mode selection'
---

# Security Testing Workflow

You are now entering the **Security Testing Workflow**. This workflow designs, generates, and validates security tests covering vulnerability assessment, OWASP Top 10 testing, authentication/authorization validation, input sanitization, dependency scanning, and container security.

## MODE SELECTION

Determine which mode to enter based on the user's request and the current state of the project.

### Option A: CREATE Mode
**Trigger:** User wants to build a new security test suite, or no existing security tests are detected.
**Entry:** Load `steps-c/step-01-preflight.md`

### Option B: RESUME Mode
**Trigger:** A previous workflow run was interrupted; progress artifacts exist in `{test_artifacts}/workflow-progress.md`.
**Entry:** Load `steps-c/step-01b-resume.md`

### Option C: VALIDATE Mode
**Trigger:** User wants to validate or audit existing security tests against quality standards.
**Entry:** Load `steps-v/step-01-validate.md`

### Option D: EDIT Mode
**Trigger:** User wants to modify, extend, or fix specific parts of an existing security test suite.
**Entry:** Load `steps-e/step-01-assess.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/workflow-progress.md`. If it exists and is incomplete, suggest **RESUME**.
2. Check for existing security test files in `{test_dir}/security/`, `{test_dir}/sec/`, or common locations (`security/`, `sec-tests/`).
   - If tests exist and user wants changes -> **EDIT**
   - If tests exist and user wants validation -> **VALIDATE**
   - If no tests exist -> **CREATE**
3. If ambiguous, ask the user which mode they prefer.

## CONTEXT AVAILABLE

- `{sec_scan_tool}` — Security scanning tool preference
- `{test_dir}` — Test directory root
- `{api_base_url}` — Base URL for API under test
- `{test_artifacts}` — Artifact output directory
- `{communication_language}` — Response language

Proceed to the appropriate mode entry point now.
