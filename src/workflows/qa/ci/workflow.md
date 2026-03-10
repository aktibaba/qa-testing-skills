---
name: 'qa-ci'
description: 'CI/CD Pipeline Workflow — Entry point and mode selection'
---

# CI/CD Pipeline Workflow

You are now entering the **CI/CD Pipeline Workflow**. This workflow scaffolds, validates, and optimizes CI/CD pipelines with properly ordered test stages, quality gates, and artifact management.

## MODE SELECTION

Determine which mode to enter based on the user's request and the current state of the project.

### Option A: CREATE Mode
**Trigger:** User wants to build a new CI/CD pipeline, or no existing CI config is detected.
**Entry:** Load `steps-c/step-01-preflight.md`

### Option B: RESUME Mode
**Trigger:** A previous workflow run was interrupted; progress artifacts exist in `{test_artifacts}/workflow-progress.md`.
**Entry:** Load `steps-c/step-01b-resume.md`

### Option C: VALIDATE Mode
**Trigger:** User wants to audit an existing CI pipeline against quality standards.
**Entry:** Load `steps-v/step-01-validate.md`

### Option D: EDIT Mode
**Trigger:** User wants to modify, extend, or fix an existing CI pipeline configuration.
**Entry:** Load `steps-e/step-01-assess.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/workflow-progress.md`. If it exists and is incomplete, suggest **RESUME**.
2. Check for existing CI configuration files:
   - `.github/workflows/*.yml` --> GitHub Actions
   - `.gitlab-ci.yml` --> GitLab CI
   - `Jenkinsfile` --> Jenkins
   - `azure-pipelines.yml` --> Azure Pipelines
   - `.circleci/config.yml` --> CircleCI
   - `bitbucket-pipelines.yml` --> Bitbucket Pipelines
3. If CI config exists:
   - User wants changes --> **EDIT**
   - User wants validation --> **VALIDATE**
4. If no CI config exists --> **CREATE**
5. If ambiguous, ask the user which mode they prefer.

## CONTEXT AVAILABLE

- `{ci_platform}` — Target CI/CD platform
- `{test_framework}` — Test framework in use
- `{coverage_threshold}` — Minimum coverage percentage
- `{test_parallelism}` — Parallel runner count
- `{test_artifacts}` — Artifact output directory
- `{communication_language}` — Response language

## OUTPUT CONTRACT

Upon successful completion of any mode, the workflow produces:

| Artifact | Path | Description |
|---|---|---|
| CI config file | Platform-specific location | Main pipeline configuration |
| Quality gates config | Embedded in CI config | Coverage, pass rate, security thresholds |
| Pipeline summary | `{test_artifacts}/ci-pipeline-summary.md` | Summary with stage descriptions |
| Progress log | `{test_artifacts}/workflow-progress.md` | Step completion tracking |

Proceed to the appropriate mode entry point now.
