---
name: 'qa-perf-instructions'
description: 'Performance Testing Workflow — Master instructions'
---

# Performance Testing Workflow — Instructions

## PURPOSE

This workflow produces production-grade performance test suites that validate system behavior under load. It covers tool selection, scenario design (smoke, load, stress, spike, soak), script generation, threshold configuration, metrics collection, and CI/CD integration.

## GUIDING PRINCIPLES

1. **Baseline before optimizing** — Always establish a performance baseline before making changes. Without a baseline, you cannot measure improvement or detect regressions.

2. **Realistic load profiles** — Model test scenarios after real production traffic patterns. Use access logs, analytics, and APM data to define user journeys, think times, and request distributions.

3. **Thresholds over observations** — Every performance test must have explicit pass/fail thresholds. A test that produces numbers without judging them is a benchmark, not a gate.

4. **Percentiles over averages** — Report p50, p90, p95, and p99 latencies. Averages hide tail latency problems that affect real users.

5. **Isolate variables** — Test one thing at a time. If you change code and infrastructure simultaneously, you cannot attribute performance changes accurately.

6. **Ramp gradually** — Always use ramp-up periods. Sudden load spikes cause connection storms that produce misleading failure data unrelated to application performance.

7. **Monitor the system under test** — Performance tests without server-side observability are blind. Correlate client-side metrics with CPU, memory, DB connections, and error rates on the target system.

8. **Reproducibility** — Tests must produce consistent results across runs. If variance exceeds 10%, investigate environmental factors before drawing conclusions.

## TOOL SELECTION LOGIC

When `{perf_tool}` is set to `auto`, detect the tool by scanning:

1. `package.json` dependencies for `k6`, `artillery`
2. `requirements.txt` / `pyproject.toml` for `locust`
3. Config files: `k6.config.js`, `artillery.yml`, `locustfile.py`, `jmeter/*.jmx`, `gatling/`
4. Existing test directories: `perf/`, `load-tests/`, `performance/`, `k6/`

Priority order when nothing is detected:
1. **k6** — Best default: JavaScript scripting, built-in thresholds, excellent CI integration, low resource footprint
2. **Locust** — If project is Python-based and team prefers Python scripting
3. **Artillery** — If project is Node.js-based and needs YAML-driven scenarios
4. **JMeter** — If project requires GUI-based test design or Java ecosystem integration
5. **Gatling** — If project is Scala/Java and needs code-based scenarios

## SCENARIO TYPES

| Scenario | Purpose | VU Pattern | Duration |
|---|---|---|---|
| Smoke | Verify scripts work with minimal load | 1-5 VUs constant | 1-2 min |
| Load | Validate performance at expected traffic | Ramp to target RPS | 5-15 min |
| Stress | Find breaking point | Ramp beyond capacity | 10-30 min |
| Spike | Test sudden traffic bursts | Instant jump to 5-10x normal | 2-5 min |
| Soak | Detect memory leaks, connection exhaustion | Constant moderate load | 1-4 hours |

## OUTPUT STANDARDS

- All test scripts must include descriptive comments explaining each scenario
- Thresholds must be defined for: response time (p95), error rate, throughput
- Scripts must support parameterized base URLs for environment portability
- Results must be exportable in JSON/CSV for trend analysis
- CI integration must produce machine-readable pass/fail exit codes

## ARTIFACT TRACKING

All progress is tracked in `{test_artifacts}/workflow-progress.md`. This file records:
- Current step and status
- Detected configuration
- Generated files list
- Validation results
- Any blockers or decisions needed

## KNOWLEDGE FRAGMENTS

Relevant fragments from qa-index.csv:
- `performance-testing-basics` — Load testing fundamentals
- `k6-patterns` — k6 scripting patterns and best practices
- `ci-cd-integration` — CI pipeline integration
- `test-data-management` (06) — Data setup strategies
- `docker-test-env` — Containerized performance test runners
- `retry-and-timeout-patterns` (30) — Timeout and retry strategies
