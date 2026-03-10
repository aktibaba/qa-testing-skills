---
name: 'qa-perf'
description: 'Performance Testing Workflow — Entry point and mode selection'
---

# Performance Testing Workflow

You are now entering the **Performance Testing Workflow**. This workflow designs, generates, and validates performance test suites covering load, stress, spike, and soak testing scenarios.

## MODE SELECTION

Determine which mode to enter based on the user's request and the current state of the project.

### Option A: CREATE Mode
**Trigger:** User wants to build a new performance test suite, or no existing performance tests are detected.
**Entry:** Load `steps-c/step-01-preflight.md`

### Option B: RESUME Mode
**Trigger:** A previous workflow run was interrupted; progress artifacts exist in `{test_artifacts}/workflow-progress.md`.
**Entry:** Load `steps-c/step-01b-resume.md`

### Option C: VALIDATE Mode
**Trigger:** User wants to validate or audit existing performance tests against quality standards.
**Entry:** Load `steps-v/step-01-validate.md`

### Option D: EDIT Mode
**Trigger:** User wants to modify, extend, or fix specific parts of an existing performance test suite.
**Entry:** Load `steps-e/step-01-assess.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/workflow-progress.md`. If it exists and is incomplete, suggest **RESUME**.
2. Check for existing performance test files in `{test_dir}/performance/`, `{test_dir}/perf/`, `{test_dir}/load/`, or common locations (`k6/`, `locust/`, `artillery/`).
   - If tests exist and user wants changes -> **EDIT**
   - If tests exist and user wants validation -> **VALIDATE**
   - If no tests exist -> **CREATE**
3. If ambiguous, ask the user which mode they prefer.

## CONTEXT AVAILABLE

- `{perf_tool}` — Performance testing tool preference
- `{perf_target_rps}` — Target requests per second
- `{perf_duration}` — Default test duration
- `{test_dir}` — Test directory root
- `{test_artifacts}` — Artifact output directory
- `{communication_language}` — Response language

Proceed to the appropriate mode entry point now.
