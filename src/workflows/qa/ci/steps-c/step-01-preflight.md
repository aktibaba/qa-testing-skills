---
name: 'ci-preflight'
description: 'Detect CI platform, existing config, and test framework'
nextStepFile: 'steps-c/step-02-generate-pipeline.md'
outputFile: '{test_artifacts}/ci-preflight.md'
---

# Step 1 — Preflight Detection

## STEP GOAL

Detect the target CI/CD platform, identify existing pipeline configurations, catalog test frameworks in use, and gather all context needed to generate an optimal pipeline.

## MANDATORY EXECUTION RULES

1. You MUST scan the project root for existing CI configuration files.
2. You MUST detect the test framework(s) and their configuration.
3. You MUST identify the project's build system and package manager.
4. You MUST consult `qa-index.csv` for relevant pipeline knowledge fragments.
5. You MUST ask the user to confirm the target CI platform if auto-detection fails.

## CONTEXT BOUNDARIES

- READ: Project root, CI config files, package files, test config files, qa-index.csv, knowledge fragments
- WRITE: `{test_artifacts}/ci-preflight.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Detect CI Platform

Scan for existing CI configurations:

| File/Directory | Platform |
|---|---|
| `.github/workflows/*.yml` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `Jenkinsfile` | Jenkins |
| `azure-pipelines.yml` | Azure Pipelines |
| `.circleci/config.yml` | CircleCI |
| `bitbucket-pipelines.yml` | Bitbucket Pipelines |
| `.drone.yml` | Drone CI |
| `.harness/` | Harness |

If `{ci_platform}` is "auto" and no config is found, check for:
- `.github/` directory --> Likely GitHub, suggest GitHub Actions
- Remote URL containing "gitlab" --> Suggest GitLab CI
- Otherwise ask the user

### 2. Catalog Existing Pipeline

If a CI config already exists, parse it to understand:
- Current stages and their order
- Existing test commands
- Cache configuration
- Artifact uploads
- Quality gates (if any)
- Trigger conditions (push, PR, schedule)

### 3. Detect Test Stack

Identify all test frameworks and tools:
- **Package file analysis:** Parse package.json scripts, pytest.ini, pom.xml plugins
- **Config file detection:** jest.config.*, vitest.config.*, playwright.config.*, cypress.config.*
- **Test directory structure:** tests/, spec/, __tests__/, e2e/
- **Coverage tools:** nyc, istanbul, coverage.py, jacoco

### 4. Detect Build System

Identify build tools:
- npm/yarn/pnpm (Node.js)
- pip/poetry/pipenv (Python)
- maven/gradle (Java)
- go build (Go)
- dotnet build (.NET)
- cargo (Rust)

### 5. Consult Knowledge Base

Load from qa-index.csv:
- `ci-pipeline-testing` (id: 18) — Pipeline design patterns
- `ci-quality-gates` (id: 19) — Quality gate criteria
- `parallel-test-execution` (id: 29) — Parallelization strategies

### 6. Record Preflight Results

Write to `{test_artifacts}/ci-preflight.md`:
```markdown
# CI Preflight Results

## Platform
- Detected: {platform}
- Existing config: {yes/no}
- Config path: {path or N/A}

## Test Stack
- Frameworks: {list}
- Test commands: {list}
- Coverage tool: {tool}

## Build System
- Package manager: {manager}
- Build command: {command}
- Lockfile: {path}

## Current Pipeline Analysis (if exists)
- Stages: {list}
- Missing stages: {list}
- Optimization opportunities: {list}

## Knowledge Loaded
- {list of fragment IDs}
```

## Save Progress

Write to `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-ci
current_step: step-01-preflight
status: complete
next_step: step-02-generate-pipeline
timestamp: {current_timestamp}
```

## SUCCESS METRICS

- [ ] CI platform detected or confirmed by user
- [ ] Test frameworks and tools cataloged
- [ ] Build system identified
- [ ] Existing pipeline analyzed (if present)
- [ ] Knowledge fragments loaded
- [ ] Preflight results written to output file

## FAILURE METRICS

- Cannot detect any CI platform or test framework --> Ask user for explicit configuration
- Project has no test setup at all --> Suggest running a test workflow (API, UI, INT) first
