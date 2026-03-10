---
name: 'perf-c-step-03-generate-scripts'
step: 3
mode: create
next_step: 'step-04-thresholds-metrics.md'
previous_step: 'step-02-define-scenarios.md'
---

# Step 3 — Generate Performance Test Scripts

## STEP GOAL

Generate complete, runnable performance test scripts for the selected tool, implementing all scenarios defined in step 2. Scripts must be modular, parameterized, and follow the tool's best practices.

## MANDATORY EXECUTION RULES

1. You MUST generate scripts for the tool selected in step 1 (k6, Locust, Artillery, JMeter, or Gatling).
2. You MUST implement at least the smoke, load, and stress scenarios from step 2.
3. You MUST parameterize base URL, VU count, and duration — never hardcode environment-specific values.
4. You MUST include authentication handling if endpoints require it.
5. You MUST include inline comments explaining each section of the script.
6. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read progress file for tool selection, endpoints, and scenario definitions
- Read API route files and OpenAPI specs for request format details
- Read auth configuration for token acquisition patterns
- Create test script files in `{test_dir}/performance/` or tool-specific directory
- Create shared utility files (helpers, data files)
- Do NOT execute performance tests in this step

## MANDATORY SEQUENCE

### 3.1 — Set Up Directory Structure

Create the performance test directory:

```
{test_dir}/performance/
  scripts/
    smoke.{ext}
    load.{ext}
    stress.{ext}
    spike.{ext}           # if defined
    soak.{ext}            # if defined
  helpers/
    auth.{ext}            # authentication utilities
    data.{ext}            # test data generation
    checks.{ext}          # response validation helpers
  data/
    users.json            # test user credentials (if needed)
    payloads/             # request body templates
  config/
    default.json          # default configuration
  README.md               # usage instructions
```

Adjust file extensions based on tool:
- k6: `.js` or `.ts`
- Locust: `.py`
- Artillery: `.yml` with `.js` for custom functions
- JMeter: `.jmx`
- Gatling: `.scala` or `.java`

### 3.2 — Generate Authentication Helper

If endpoints require authentication:

**k6 example pattern:**
```javascript
import http from 'k6/http';

export function authenticate(baseUrl, username, password) {
  const res = http.post(`${baseUrl}/auth/login`, JSON.stringify({
    username, password
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) {
    throw new Error(`Auth failed: ${res.status}`);
  }
  return res.json('token');
}
```

Adapt the pattern to the actual auth mechanism detected in step 1 (bearer tokens, session cookies, OAuth2 flows, API keys).

### 3.3 — Generate Smoke Test Script

Implement the minimal-load validation scenario:

- 1-3 VUs, constant load, 1-2 minute duration
- Exercise all critical endpoints sequentially
- Include response validation (status codes, response body structure)
- Strict thresholds: p95 < 2000ms, zero errors
- This script doubles as a "script validation" tool

### 3.4 — Generate Load Test Script

Implement the sustained-traffic scenario:

- VU count calculated from target RPS and observed response times
- Gradual ramp-up over 20% of total duration
- Implement all user journeys with correct traffic weight distribution
- Include think times between requests
- Correlation: extract dynamic values from responses (IDs, tokens, pagination cursors)
- Thresholds aligned with SLA/SLO targets

### 3.5 — Generate Stress Test Script

Implement the staged overload scenario:

- Progressive stages from 50% to 200%+ of target capacity
- Each stage sustained long enough for metrics to stabilize (2-3 minutes minimum)
- Graceful ramp-down at the end
- Lenient thresholds — purpose is observation, not pass/fail
- Custom metrics for tracking degradation patterns

### 3.6 — Generate Spike Test Script (if defined)

Implement sudden burst scenario:

- Instant VU jumps (no ramp)
- Alternating normal and spike phases
- Metrics focused on recovery time after spike

### 3.7 — Generate Soak Test Script (if defined)

Implement extended duration scenario:

- Constant moderate load
- Duration parameterized (default 1 hour, configurable up to 4 hours)
- Custom metrics for memory and latency drift detection

### 3.8 — Generate Configuration File

Create a default configuration file:

```json
{
  "baseUrl": "http://localhost:3000",
  "targetRps": 100,
  "durations": {
    "smoke": "1m",
    "load": "5m",
    "stress": "15m",
    "spike": "8m",
    "soak": "1h"
  },
  "auth": {
    "username": "${PERF_TEST_USER}",
    "password": "${PERF_TEST_PASSWORD}"
  }
}
```

### 3.9 — Generate README

Create a README.md in the performance test directory with:
- Prerequisites and installation instructions
- How to run each scenario
- Configuration options
- How to interpret results
- Troubleshooting common issues

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 3 Complete — Scripts Generated

## Generated Files
- [list all generated files with paths]

## Script Summary
- Smoke test: [file path] — [VU count] VUs, [duration]
- Load test: [file path] — [VU count] VUs, [duration]
- Stress test: [file path] — staged ramp, [duration]
- Spike test: [file path or "not generated"]
- Soak test: [file path or "not generated"]

## Next Step
step-04-thresholds-metrics.md
```

## SUCCESS METRICS

- At least 3 test scripts generated (smoke, load, stress)
- All scripts are syntactically valid for the selected tool
- Base URL, VU count, and duration are parameterized (not hardcoded)
- Authentication flow implemented if required
- Response validation included (status codes, body checks)
- README with usage instructions generated
- Progress file updated

## FAILURE METRICS

- Fewer than 3 scripts generated
- Scripts contain hardcoded URLs or credentials
- Scripts lack response validation
- Scripts are syntactically invalid
- No README generated
- Progress file not updated

---

**Next step:** Load `step-04-thresholds-metrics.md`
