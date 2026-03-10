---
name: 'perf-c-step-06-validate-and-summary'
step: 6
mode: create
next_step: null
previous_step: 'step-05-ci-integration.md'
---

# Step 6 — Validate Setup and Summarize

## STEP GOAL

Validate the complete performance test suite against the quality checklist, verify script correctness, and produce a comprehensive summary report with usage instructions and next steps.

## MANDATORY EXECUTION RULES

1. You MUST validate all generated scripts for syntactic correctness.
2. You MUST score the suite against the performance testing checklist.
3. You MUST produce the final report at `{test_artifacts}/performance-report.md`.
4. You MUST provide clear "how to run" instructions for each scenario.
5. You MUST identify any gaps and recommend follow-up actions.
6. You MUST save final progress.

## CONTEXT BOUNDARIES

- Read all generated files from steps 3-5
- Read the checklist from `checklist.md`
- Read progress file for accumulated configuration
- Create the final report file
- Do NOT modify test scripts in this step (only report issues)
- Do NOT execute tests (validation is static analysis only)

## MANDATORY SEQUENCE

### 6.1 — Validate Script Syntax

For each generated test script:

1. **k6**: Check for valid JavaScript/TypeScript syntax, proper imports, exported `options` and `default function`
2. **Locust**: Check for valid Python syntax, proper class inheritance from `HttpUser`, `@task` decorators
3. **Artillery**: Check for valid YAML syntax, required `config` and `scenarios` sections
4. **JMeter**: Check for valid XML structure with `TestPlan`, `ThreadGroup`, `HTTPSampler` elements
5. **Gatling**: Check for valid Scala/Java syntax, proper simulation class structure

Report any issues found with file path and line reference.

### 6.2 — Score Against Checklist

Evaluate the suite against each section of `checklist.md`:

1. **Baseline Established** — Score items (baseline can be established on first run)
2. **Thresholds Defined** — Verify thresholds exist in scripts and produce exit codes
3. **Realistic Load Profiles** — Verify VU counts, think times, and traffic weights
4. **Scenario Coverage** — Count implemented scenarios vs. recommended
5. **Metrics Collected** — Verify standard and custom metrics
6. **CI Integration** — Verify pipeline configuration
7. **Script Quality** — Verify parameterization, comments, modularity

Calculate total score and rating per the checklist scoring table.

### 6.3 — Identify Gaps and Recommendations

Based on the checklist score, identify:

1. **Critical gaps** — Items that should be addressed before first use
2. **Recommended improvements** — Items to address in the next iteration
3. **Nice-to-have enhancements** — Long-term improvements

### 6.4 — Generate Summary Report

Create `{test_artifacts}/performance-report.md`:

```markdown
# Performance Test Suite — Summary Report

## Overview
- **Project**: [project name]
- **Tool**: [selected tool and version]
- **Created**: [date]
- **Endpoints covered**: [count]

## Quick Start

### Prerequisites
[Installation instructions for the performance tool]

### Run Smoke Test (Fast — 1-2 minutes)
[Exact command to run smoke test]

### Run Load Test (Standard — 5+ minutes)
[Exact command to run load test]

### Run Stress Test (Extended — 15 minutes)
[Exact command to run stress test]

### Run All Scenarios
[Command or script to run full suite]

## Scenario Summary
[Table of all scenarios with VU counts, durations, and thresholds]

## Endpoints Under Test
[List of all endpoints covered with scenario mapping]

## Threshold Configuration
[Summary of thresholds for each scenario]

## CI Integration
[Summary of CI jobs, triggers, and how to view results]

## Quality Score
- **Overall**: [score] / [total] — [rating]
[Section-by-section breakdown]

## Gaps and Recommendations
[Prioritized list of improvements]

## Files Generated
[Complete list of generated files with paths and descriptions]
```

### 6.5 — Final Progress Update

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: COMPLETE

## Quality Score
[score] / [total] — [rating]

## Generated Files
[Complete file list]

## Recommendations
[Top 3 follow-up actions]
```

## Save Progress

Mark workflow as complete in `{test_artifacts}/workflow-progress.md` with final status, quality score, and file manifest.

## SUCCESS METRICS

- All generated scripts pass syntax validation
- Checklist score calculated with section-by-section breakdown
- Final report generated at `{test_artifacts}/performance-report.md`
- Quick-start commands provided for each scenario
- Gaps and recommendations documented
- Workflow marked as complete in progress file

## FAILURE METRICS

- Scripts contain syntax errors that were not reported
- Checklist score not calculated
- No summary report generated
- Missing usage instructions
- Progress file not marked as complete

---

**Workflow complete.** Present the summary report to the user and highlight the quick-start commands and any critical gaps.
