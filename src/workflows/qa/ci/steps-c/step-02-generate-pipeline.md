---
name: 'ci-generate-pipeline'
description: 'Generate CI/CD pipeline configuration for the detected platform'
nextStepFile: 'steps-c/step-03-quality-gates.md'
outputFile: '{test_artifacts}/ci-pipeline-draft.md'
---

# Step 2 — Generate Pipeline Configuration

## STEP GOAL

Generate a complete, production-ready CI/CD pipeline configuration for the detected platform, with properly ordered stages, caching, parallelization, and artifact management.

## MANDATORY EXECUTION RULES

1. You MUST follow the canonical stage order from `instructions.md`.
2. You MUST include caching for dependencies and build artifacts.
3. You MUST configure test stages to produce JUnit XML or equivalent reports.
4. You MUST include artifact upload for test reports and coverage.
5. You MUST use pinned versions for all actions, images, and tools.
6. You MUST write the actual CI config file (not just a description of it).

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/ci-preflight.md`, `instructions.md`, loaded knowledge fragments
- WRITE: CI config file (platform-specific path), `{test_artifacts}/ci-pipeline-draft.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Select Pipeline Template

Based on the detected platform, select the appropriate template structure:

**GitHub Actions:**
```yaml
name: CI Quality Pipeline
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

**GitLab CI:**
```yaml
stages:
  - preflight
  - static-analysis
  - unit-test
  - build
  - integration-test
  - e2e-test
  - quality-gate
```

**Jenkins:**
```groovy
pipeline {
  agent any
  stages { ... }
  post { always { ... } }
}
```

### 2. Generate Preflight Stage

Configure dependency installation and cache restoration:
- Checkout code
- Restore dependency cache (key: lockfile hash)
- Install dependencies
- Save cache

### 3. Generate Static Analysis Stage

Add linting, type-checking, and format verification:
- ESLint / Pylint / Checkstyle / golint
- TypeScript compiler / mypy / type checking
- Prettier / Black / gofmt format check
- SAST scanning (optional: Semgrep, CodeQL)

### 4. Generate Unit Test Stage

Configure fast unit tests with coverage:
- Run unit test command from preflight detection
- Collect coverage output (lcov, cobertura, jacoco)
- Upload test results as artifacts
- Upload coverage report as artifact
- Set timeout (recommended: 5 minutes max)

### 5. Generate Build Stage

Compile or bundle the application:
- Run build command
- Cache build output for downstream stages
- Verify build output exists and is valid

### 6. Generate Integration Test Stage

Configure integration tests with service dependencies:
- Start service containers (database, cache, message queue)
- Wait for services to be healthy
- Run integration tests
- Upload test results
- Tear down services

### 7. Generate E2E Test Stage (if applicable)

Configure end-to-end tests:
- Install browser dependencies (Playwright) or Cypress binary
- Run E2E test suite
- Upload screenshots/videos on failure
- Upload test results

### 8. Generate Artifact Upload

Configure artifact collection:
- Test result files (JUnit XML)
- Coverage reports (HTML, lcov)
- Build outputs
- Failure screenshots/videos
- Set retention period (7 days for PRs, 30 days for main)

### 9. Write Pipeline Configuration

Write the complete CI config to the platform-specific path:
- GitHub Actions: `.github/workflows/ci.yml`
- GitLab CI: `.gitlab-ci.yml`
- Jenkins: `Jenkinsfile`
- Azure: `azure-pipelines.yml`
- CircleCI: `.circleci/config.yml`

Also write a draft summary to `{test_artifacts}/ci-pipeline-draft.md`.

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-ci
current_step: step-02-generate-pipeline
status: complete
next_step: step-03-quality-gates
timestamp: {current_timestamp}
config_file: {path_to_ci_config}
```

## SUCCESS METRICS

- [ ] Complete CI config file generated and written
- [ ] All applicable stages included in correct order
- [ ] Caching configured with lockfile-based keys
- [ ] Test stages produce artifacts
- [ ] Pinned versions used throughout
- [ ] Pipeline draft summary written

## FAILURE METRICS

- Unknown CI platform --> Cannot generate config, ask user to specify
- No test commands found --> Generate pipeline skeleton with TODO placeholders for test commands
