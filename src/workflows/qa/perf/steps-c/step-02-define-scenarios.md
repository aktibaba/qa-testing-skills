---
name: 'perf-c-step-02-define-scenarios'
step: 2
mode: create
next_step: 'step-03-generate-scripts.md'
previous_step: 'step-01-preflight.md'
---

# Step 2 — Define Load Scenarios

## STEP GOAL

Design a comprehensive set of performance test scenarios (smoke, load, stress, spike, soak) tailored to the identified endpoints and expected traffic patterns. Each scenario must have clearly defined virtual user counts, ramp profiles, durations, and success criteria.

## MANDATORY EXECUTION RULES

1. You MUST define at least three scenario types (smoke, load, stress are mandatory; spike and soak are recommended).
2. You MUST base VU counts and RPS targets on the parameters from step 1, not arbitrary values.
3. You MUST document the rationale for each scenario's configuration.
4. You MUST NOT generate scripts in this step — this step produces scenario definitions only.
5. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read the progress file from step 1 for detected endpoints and parameters
- Read production traffic data if available (access logs, analytics, APM dashboards)
- Read existing SLA/SLO documentation
- Do NOT create test script files in this step
- Do NOT execute any performance tests

## MANDATORY SEQUENCE

### 2.1 — Define User Journeys

Map real user behavior to test scenarios:

1. **Identify critical user flows** from the endpoints detected in step 1:
   - Example: Login -> Browse catalog -> Search -> View product -> Add to cart -> Checkout
   - Example: Authenticate -> Create resource -> List resources -> Update resource -> Delete resource
2. **Assign traffic weights** — What percentage of total traffic does each flow represent?
3. **Define think times** — Realistic pauses between requests (typically 1-5 seconds for web apps)
4. **Identify data dependencies** — Which requests need data from previous responses (correlation)

### 2.2 — Design Smoke Test Scenario

Purpose: Validate that performance test scripts execute correctly with minimal load.

- **VUs**: 1-3 (constant)
- **Duration**: 1-2 minutes
- **Thresholds**: Response time < 2s (p95), error rate = 0%
- **Use case**: Quick sanity check, suitable for PR pipelines

### 2.3 — Design Load Test Scenario

Purpose: Validate system performance under expected production traffic.

- **VUs**: Calculate from `{perf_target_rps}` and average response time
  - Formula: VUs = Target_RPS x Average_Response_Time_Seconds
  - Example: 100 RPS x 0.2s = 20 VUs
- **Ramp profile**: Gradual ramp over 20% of total duration
  - Example for 5-minute test: 1 minute ramp-up, 3.5 minutes sustained, 30 seconds ramp-down
- **Duration**: `{perf_duration}` (default 5 minutes)
- **Thresholds**: Response time < SLA target (p95), error rate < 1%, RPS >= target

### 2.4 — Design Stress Test Scenario

Purpose: Find the system's breaking point and observe degradation behavior.

- **VUs**: Staged ramp from 50% to 200%+ of normal load
  - Stage 1: 50% of target (warm-up) — 2 minutes
  - Stage 2: 100% of target (baseline) — 3 minutes
  - Stage 3: 150% of target (moderate stress) — 3 minutes
  - Stage 4: 200% of target (high stress) — 3 minutes
  - Stage 5: Ramp down to 0 — 2 minutes
- **Duration**: 13-15 minutes total
- **Thresholds**: No hard pass/fail — document the point at which errors spike or latency degrades
- **Key observation**: Note the VU count where p95 latency doubles or error rate exceeds 5%

### 2.5 — Design Spike Test Scenario

Purpose: Test system resilience to sudden traffic bursts.

- **VUs**: Instant jump from baseline to 5-10x normal load
  - Phase 1: Normal load (1 minute)
  - Phase 2: Instant spike to 5x (2 minutes)
  - Phase 3: Return to normal (1 minute)
  - Phase 4: Instant spike to 10x (2 minutes)
  - Phase 5: Return to zero (1 minute)
- **Duration**: 7-8 minutes
- **Thresholds**: System should recover to normal latency within 30 seconds of spike ending
- **Key observation**: Auto-scaling behavior, connection pool recovery, error recovery time

### 2.6 — Design Soak Test Scenario

Purpose: Detect memory leaks, connection pool exhaustion, and resource degradation over time.

- **VUs**: Moderate constant load (50-75% of target capacity)
- **Duration**: 1-4 hours (configurable)
- **Thresholds**: p95 latency variance < 20% between first and last hour, error rate stable, no OOM events
- **Key observation**: Memory growth trends, response time drift, connection count stability

### 2.7 — Compile Scenario Matrix

Create a summary table:

| Scenario | VUs | Duration | Ramp | Key Threshold | CI Frequency |
|---|---|---|---|---|---|
| Smoke | 1-3 | 1-2 min | None | p95 < 2s, 0% errors | Every PR |
| Load | Calculated | 5+ min | Gradual | p95 < SLA, <1% errors | Nightly |
| Stress | Staged | 13-15 min | Staged | Find breaking point | Weekly |
| Spike | 5-10x jump | 7-8 min | Instant | Recovery < 30s | Weekly |
| Soak | 50-75% | 1-4 hours | None | Stable over time | Pre-release |

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 2 Complete — Scenarios Defined

## Scenario Definitions
[Compiled scenario matrix with VU counts, durations, and thresholds]

## User Journeys
[Documented flows with traffic weights and think times]

## Next Step
step-03-generate-scripts.md
```

## SUCCESS METRICS

- At least 3 scenario types defined (smoke, load, stress)
- Each scenario has explicit VU counts, duration, ramp profile, and thresholds
- User journeys mapped with traffic weights and think times
- Scenario matrix compiled with CI frequency recommendations
- Progress file updated

## FAILURE METRICS

- Fewer than 3 scenarios defined
- Scenarios use arbitrary numbers not tied to target RPS or detected capacity
- No user journeys defined (only single-endpoint tests)
- Progress file not updated

---

**Next step:** Load `step-03-generate-scripts.md`
