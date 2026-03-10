---
name: 'perf-c-step-05-ci-integration'
step: 5
mode: create
next_step: 'step-06-validate-and-summary.md'
previous_step: 'step-04-thresholds-metrics.md'
---

# Step 5 — Integrate Performance Tests into CI Pipeline

## STEP GOAL

Create CI/CD pipeline configuration that runs performance tests automatically at appropriate stages — smoke tests on every PR, load tests nightly, and full suites pre-release. The pipeline must produce actionable feedback with clear pass/fail results.

## MANDATORY EXECUTION RULES

1. You MUST generate CI configuration for the detected CI platform (or GitHub Actions as default).
2. You MUST separate smoke tests (fast, every PR) from load/stress tests (slow, scheduled).
3. You MUST ensure CI jobs fail with non-zero exit codes when thresholds are breached.
4. You MUST archive test results as CI artifacts.
5. You MUST NOT hardcode secrets — use CI secret management.
6. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read existing CI configuration files (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, etc.)
- Read progress file for tool selection, thresholds, and configuration
- Create or modify CI pipeline configuration files
- Create helper scripts for CI execution
- Do NOT execute CI pipelines
- Do NOT store secrets in files

## MANDATORY SEQUENCE

### 5.1 — Detect CI Platform

If `{ci_platform}` is `auto`, detect from existing configuration:

| File/Directory | Platform |
|---|---|
| `.github/workflows/` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `Jenkinsfile` | Jenkins |
| `azure-pipelines.yml` | Azure Pipelines |
| `.circleci/config.yml` | CircleCI |
| `bitbucket-pipelines.yml` | Bitbucket Pipelines |
| `.drone.yml` | Drone |
| `.harness/` | Harness |

Default to GitHub Actions if no CI platform is detected.

### 5.2 — Generate Smoke Test CI Job

Create a CI job for smoke tests that runs on every PR/push:

**Requirements:**
- Trigger: pull request, push to main/develop
- Install performance tool
- Run smoke test script
- Fail the pipeline if thresholds are breached
- Archive results as artifacts
- Total execution: < 3 minutes

**GitHub Actions example structure:**
```yaml
name: Performance Smoke Test
on:
  pull_request:
    branches: [main, develop]

jobs:
  perf-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install [tool]
        # Tool-specific installation
      - name: Run smoke test
        run: [tool command] scripts/smoke.[ext]
        env:
          BASE_URL: ${{ secrets.PERF_BASE_URL }}
      - name: Archive results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: perf-smoke-results
          path: results/
```

### 5.3 — Generate Load Test CI Job

Create a CI job for load tests that runs on schedule:

**Requirements:**
- Trigger: scheduled (nightly or weekly via cron)
- Manual trigger option (workflow_dispatch)
- Configurable parameters (VU count, duration, target URL)
- Run load test script
- Archive detailed results
- Send notification on failure (optional)
- Total execution: 10-20 minutes

### 5.4 — Generate Full Suite CI Job

Create a CI job for the complete performance suite (pre-release):

**Requirements:**
- Trigger: manual only or release branch push
- Run all scenarios sequentially: smoke -> load -> stress
- Continue on failure for individual scenarios (collect all data)
- Generate combined report
- Archive all results
- Total execution: 30-45 minutes

### 5.5 — Configure Test Environment for CI

Ensure the performance test target is available in CI:

1. **Docker Compose** — If the project uses Docker, start services before tests
2. **Staging environment** — If testing against a remote target, configure URL via secrets
3. **Service health checks** — Wait for services to be ready before starting tests
4. **Resource allocation** — Ensure CI runner has sufficient CPU/memory for the load generator

### 5.6 — Create CI Helper Script

Generate a wrapper script (`scripts/run-perf-tests.sh`) that:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCENARIO="${1:-smoke}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="${RESULTS_DIR:-./results}"

mkdir -p "$RESULTS_DIR"

echo "Running ${SCENARIO} performance test against ${BASE_URL}"

# Tool-specific execution command
# Exit code reflects threshold pass/fail
```

The script should:
- Accept scenario name as argument
- Use environment variables for configuration
- Create results directory
- Execute the correct script for the scenario
- Preserve the tool's exit code for CI pass/fail

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 5 Complete — CI Integration

## CI Platform
- **Detected**: [platform]
- **Configuration file**: [path to CI config]

## CI Jobs Created
- Smoke test: [trigger: every PR] — [config file path]
- Load test: [trigger: nightly] — [config file path]
- Full suite: [trigger: manual/pre-release] — [config file path]

## Helper Scripts
- [path to run-perf-tests.sh]

## Environment Configuration
- Target URL source: [Docker Compose / staging URL / secrets]
- Secrets required: [list of required CI secrets]

## Next Step
step-06-validate-and-summary.md
```

## SUCCESS METRICS

- CI configuration generated for the detected platform
- Smoke tests configured to run on every PR (< 3 minute budget)
- Load tests configured on a schedule (nightly or weekly)
- Full suite available for manual/pre-release execution
- Results archived as CI artifacts
- Secrets managed via CI secret store (not hardcoded)
- Helper script generated for local and CI execution
- Progress file updated

## FAILURE METRICS

- No CI configuration generated
- All test types on same trigger (smoke and stress on every PR)
- Secrets hardcoded in CI configuration
- Results not archived
- CI job does not fail on threshold breach
- Progress file not updated

---

**Next step:** Load `step-06-validate-and-summary.md`
