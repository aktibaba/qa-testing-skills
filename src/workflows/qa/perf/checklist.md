---
name: 'qa-perf-checklist'
description: 'Performance Testing Quality Checklist'
---

# Performance Testing Quality Checklist

Use this checklist to validate performance test suite completeness and quality.

## 1. Baseline Established

- [ ] Baseline metrics collected under normal load conditions
- [ ] Baseline documented with date, environment, and system configuration
- [ ] Baseline includes p50, p90, p95, p99 response times
- [ ] Baseline includes throughput (RPS), error rate, and concurrent user count
- [ ] Baseline results stored in version control or artifact storage for comparison

## 2. Thresholds Defined

- [ ] Response time thresholds set for critical endpoints (p95 < target)
- [ ] Error rate threshold defined (typically < 1% for load, < 5% for stress)
- [ ] Throughput minimum threshold set (RPS >= target)
- [ ] Thresholds are codified in test scripts, not just documented
- [ ] Thresholds produce machine-readable pass/fail exit codes
- [ ] SLA/SLO alignment verified — thresholds match business requirements

## 3. Realistic Load Profiles

- [ ] Load profiles modeled from production traffic patterns or estimated usage
- [ ] User journeys reflect real application usage (not just single-endpoint hammering)
- [ ] Think times and pacing configured to simulate realistic user behavior
- [ ] Request distribution matches production ratios (reads vs. writes, popular vs. niche endpoints)
- [ ] Test data is representative and sufficiently varied (no single-user testing)
- [ ] Ramp-up periods configured to avoid connection storms

## 4. Scenario Coverage

- [ ] Smoke test defined (1-5 VUs, script validation)
- [ ] Load test defined (target RPS, sustained duration)
- [ ] Stress test defined (beyond-capacity ramp to find breaking point)
- [ ] Spike test defined (sudden traffic burst handling)
- [ ] Soak test defined or planned (extended duration for leak detection)

## 5. Metrics Collected

- [ ] Client-side metrics: response time percentiles, throughput, error rate, iteration duration
- [ ] Custom metrics defined for business-critical transactions
- [ ] HTTP status code distribution tracked (2xx, 4xx, 5xx breakdown)
- [ ] Connection-level metrics: DNS lookup, TLS handshake, time-to-first-byte
- [ ] Results exported in machine-readable format (JSON, CSV, or InfluxDB)
- [ ] Historical trend data accessible for regression detection

## 6. CI Integration

- [ ] Performance tests integrated into CI/CD pipeline
- [ ] Smoke tests run on every PR/merge (fast feedback)
- [ ] Full load tests run on schedule or pre-release (nightly/weekly)
- [ ] CI job produces clear pass/fail based on threshold violations
- [ ] Test results archived as CI artifacts for historical comparison
- [ ] Pipeline fails on threshold breach with actionable error messages
- [ ] Performance test environment is isolated (not shared with other jobs)

## 7. Script Quality

- [ ] Scripts are parameterized (base URL, VU count, duration are configurable)
- [ ] Scripts use environment variables for secrets (API keys, auth tokens)
- [ ] Scripts include descriptive comments and scenario names
- [ ] Scripts handle authentication flows correctly
- [ ] Scripts are version-controlled alongside application code
- [ ] Scripts are modular (shared functions, reusable scenarios)

## SCORING

| Score | Rating | Action |
|---|---|---|
| 28+ / 33 | Excellent | Minor refinements only |
| 21-27 / 33 | Good | Address gaps in weakest section |
| 14-20 / 33 | Fair | Significant improvements needed |
| < 14 / 33 | Poor | Major rework recommended |
