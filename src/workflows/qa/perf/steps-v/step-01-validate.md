---
name: 'perf-v-step-01-validate'
step: 1
mode: validate
next_step: null
---

# Validate Step 1 — Validate Performance Test Suite

## STEP GOAL

Perform a comprehensive quality audit of an existing performance test suite by scoring it against the performance testing checklist. Produce a detailed validation report with scores, findings, and actionable remediation recommendations.

## MANDATORY EXECUTION RULES

1. You MUST score every item in the performance testing checklist.
2. You MUST read all performance test files, not just the manifest or README.
3. You MUST provide evidence for each score (pass or fail with file reference).
4. You MUST produce a validation report at `{test_artifacts}/performance-validation-report.md`.
5. You MUST prioritize remediation recommendations by impact.
6. You MUST NOT modify any files — this is a read-only audit.

## CONTEXT BOUNDARIES

- Read all performance test scripts, configs, CI pipelines, and documentation
- Read the checklist from `checklist.md`
- Read CI pipeline definitions for performance test integration
- Read the progress file if it exists
- Create the validation report file
- Do NOT modify any existing files
- Do NOT execute tests

## MANDATORY SEQUENCE

### 1.1 — Discover Performance Test Assets

Scan the project for performance test files:

1. Check standard locations: `{test_dir}/performance/`, `{test_dir}/perf/`, `{test_dir}/load/`
2. Check tool-specific locations: `k6/`, `locust/`, `artillery/`, `jmeter/`, `gatling/`
3. Check for configuration files: `k6.config.js`, `artillery.yml`, `locustfile.py`, `*.jmx`
4. Check CI pipeline for performance test jobs
5. Check for performance-related documentation

Create a complete asset inventory.

### 1.2 — Score Checklist Section: Baseline Established

For each item in the "Baseline Established" section:
- Check for documented baseline results (files, reports, comments in code)
- Check for baseline metrics (p50, p90, p95, p99, throughput, error rate)
- Check for version-controlled baseline data

Score: [X] / [5] items passing

### 1.3 — Score Checklist Section: Thresholds Defined

For each item in the "Thresholds Defined" section:
- Read test scripts and verify threshold declarations
- Check that thresholds cover response time, error rate, and throughput
- Verify thresholds produce exit codes (not just console output)
- Check SLA/SLO alignment documentation

Score: [X] / [6] items passing

### 1.4 — Score Checklist Section: Realistic Load Profiles

For each item in the "Realistic Load Profiles" section:
- Verify VU counts and RPS targets are justified (not arbitrary)
- Check for think times and pacing configuration
- Verify request distribution across endpoints
- Check test data variety

Score: [X] / [6] items passing

### 1.5 — Score Checklist Section: Scenario Coverage

Check for the presence of each scenario type:
- Smoke test defined and runnable
- Load test defined with appropriate duration
- Stress test defined with staged ramp
- Spike test defined (recommended)
- Soak test defined or planned (recommended)

Score: [X] / [5] items passing

### 1.6 — Score Checklist Section: Metrics Collected

Verify metrics collection:
- Client-side metrics (response time, throughput, error rate)
- Custom business metrics
- HTTP status code distribution
- Connection-level metrics
- Result export configuration
- Historical trend capability

Score: [X] / [6] items passing

### 1.7 — Score Checklist Section: CI Integration

Check CI pipeline configuration:
- Performance tests in CI pipeline
- Smoke tests on PRs (fast feedback)
- Load tests on schedule
- Pass/fail based on thresholds
- Results archived as artifacts
- Actionable failure messages
- Isolated test environment

Score: [X] / [7] items passing

### 1.8 — Score Checklist Section: Script Quality

Evaluate script quality:
- Parameterized base URL, VU count, duration
- Environment variables for secrets
- Descriptive comments and scenario names
- Authentication handling
- Version-controlled
- Modular structure

Score: [X] / [6] items passing

### 1.9 — Calculate Overall Score

Sum all section scores and determine rating:

| Score | Rating | Action |
|---|---|---|
| 28+ / 33 | Excellent | Minor refinements only |
| 21-27 / 33 | Good | Address gaps in weakest section |
| 14-20 / 33 | Fair | Significant improvements needed |
| < 14 / 33 | Poor | Major rework recommended |

### 1.10 — Generate Validation Report

Create `{test_artifacts}/performance-validation-report.md`:

```markdown
# Performance Test Suite — Validation Report

## Overall Score: [X] / 33 — [Rating]

## Section Scores
| Section | Score | Status |
|---|---|---|
| Baseline Established | X / 5 | [pass/warn/fail] |
| Thresholds Defined | X / 6 | [pass/warn/fail] |
| Realistic Load Profiles | X / 6 | [pass/warn/fail] |
| Scenario Coverage | X / 5 | [pass/warn/fail] |
| Metrics Collected | X / 6 | [pass/warn/fail] |
| CI Integration | X / 7 | [pass/warn/fail] |
| Script Quality | X / 6 | [pass/warn/fail] |

## Detailed Findings
[For each failed item: what's missing, where to fix it, and why it matters]

## Remediation Recommendations (Priority Order)
1. **[Critical]** [action item with specific file and change]
2. **[High]** [action item]
3. **[Medium]** [action item]
4. **[Low]** [action item]

## Assets Reviewed
[Complete list of files examined]
```

### 1.11 — Present Results

Display the validation summary to the user with:
- Overall score and rating
- Top 3 critical findings
- Recommended next action (EDIT mode for fixes, or acknowledgment if excellent)

## Save Progress

Write validation results to `{test_artifacts}/workflow-progress.md`:

```markdown
# Performance Testing Workflow Progress

## Status: Validation Complete

## Score: [X] / 33 — [Rating]

## Critical Findings
[Top findings requiring attention]

## Report Location
{test_artifacts}/performance-validation-report.md
```

## SUCCESS METRICS

- Every checklist item scored with evidence
- Overall score calculated correctly
- Validation report generated at the specified path
- Remediation recommendations prioritized by impact
- Results presented clearly to the user

## FAILURE METRICS

- Checklist items skipped or scored without evidence
- Score calculation error
- No validation report generated
- Recommendations not prioritized
- Existing files modified (should be read-only)

---

**Validation complete.** If critical gaps are found, suggest entering EDIT mode to address them.
