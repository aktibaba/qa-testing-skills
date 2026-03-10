---
name: 'perf-c-step-04-thresholds-metrics'
step: 4
mode: create
next_step: 'step-05-ci-integration.md'
previous_step: 'step-03-generate-scripts.md'
---

# Step 4 — Configure Thresholds, Custom Metrics, and SLAs

## STEP GOAL

Define and integrate explicit pass/fail thresholds, custom business metrics, and SLA-aligned criteria into the generated performance test scripts. Every test must produce a clear pass or fail verdict.

## MANDATORY EXECUTION RULES

1. You MUST define thresholds for response time (p95), error rate, and throughput for every scenario.
2. You MUST implement at least one custom metric for a business-critical transaction.
3. You MUST ensure thresholds produce non-zero exit codes on failure for CI integration.
4. You MUST NOT use only averages — percentile-based thresholds are required.
5. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read generated test scripts from step 3
- Read SLA/SLO documentation if available
- Modify test scripts to add/refine thresholds and custom metrics
- Do NOT execute performance tests in this step
- Do NOT change scenario structure (VU counts, durations)

## MANDATORY SEQUENCE

### 4.1 — Define Standard Thresholds

Apply the following threshold categories to each scenario:

**Response Time Thresholds:**
| Metric | Smoke | Load | Stress | Spike |
|---|---|---|---|---|
| p95 | < 500ms | < SLA target | Observation only | < 2x SLA during recovery |
| p99 | < 1000ms | < 2x SLA target | Observation only | < 3x SLA during recovery |

**Error Rate Thresholds:**
| Metric | Smoke | Load | Stress | Spike |
|---|---|---|---|---|
| Error rate | 0% | < 1% | < 10% at peak | < 5% during recovery |
| HTTP 5xx rate | 0% | < 0.1% | Document only | < 1% during recovery |

**Throughput Thresholds:**
| Metric | Smoke | Load | Stress | Spike |
|---|---|---|---|---|
| RPS | > 0 (script works) | >= {perf_target_rps} | Document max sustained | Recovery to baseline |

### 4.2 — Implement Thresholds in Scripts

Add thresholds using the tool's native mechanism:

**k6:**
```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>100'],
  },
};
```

**Locust:**
```python
# In locustfile.py or via command-line
# --headless -u 100 -r 10 --run-time 5m
# Thresholds checked via custom event handlers or locust-plugins
```

**Artillery:**
```yaml
config:
  ensure:
    p95: 500
    maxErrorRate: 1
```

Adapt to the selected tool's syntax.

### 4.3 — Define Custom Business Metrics

Create custom metrics for business-critical transactions:

1. **Transaction timers** — Measure end-to-end flow duration (e.g., "checkout_flow_duration")
2. **Business event counters** — Count successful business operations (e.g., "orders_placed", "searches_completed")
3. **Data quality metrics** — Validate response payload correctness (e.g., "valid_search_results_rate")

**k6 example:**
```javascript
import { Trend, Counter, Rate } from 'k6/metrics';

const checkoutDuration = new Trend('checkout_flow_duration');
const ordersPlaced = new Counter('orders_placed');
const searchAccuracy = new Rate('valid_search_results');
```

### 4.4 — Configure SLA Alignment

Map business SLAs to test thresholds:

1. Review any documented SLAs/SLOs from step 1
2. Create a threshold mapping:
   - SLA: "99.9% availability" -> Threshold: error rate < 0.1%
   - SLA: "Response time < 200ms" -> Threshold: p95 < 200ms
   - SLA: "Handle 1000 concurrent users" -> Threshold: VUs = 1000, error rate < 1%
3. Document the SLA-to-threshold mapping for team reference

### 4.5 — Configure Result Export

Set up result output for analysis and trending:

- **JSON output** — Machine-readable results for CI parsing
- **CSV output** — For spreadsheet analysis and charting
- **InfluxDB/Prometheus** — For time-series visualization (if available)
- **HTML report** — Human-readable summary (tool-dependent)

**k6:**
```javascript
// Run with: k6 run --out json=results.json script.js
// Or: k6 run --out csv=results.csv script.js
```

### 4.6 — Create Threshold Documentation

Create a `thresholds.md` file documenting:
- All defined thresholds and their rationale
- SLA/SLO alignment mapping
- Custom metrics and what they measure
- How to adjust thresholds for different environments
- Escalation procedures when thresholds are breached

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 4 Complete — Thresholds Configured

## Threshold Summary
- Smoke: p95 < [value], errors = 0%
- Load: p95 < [value], errors < 1%, RPS >= [target]
- Stress: observation mode, documented breaking point criteria
- Spike: recovery thresholds defined

## Custom Metrics
[List of custom metrics with descriptions]

## SLA Alignment
[Mapping of business SLAs to test thresholds]

## Result Export
- Format: [JSON/CSV/InfluxDB]
- Output path: [path]

## Next Step
step-05-ci-integration.md
```

## SUCCESS METRICS

- Every scenario has explicit p95, error rate, and throughput thresholds
- At least one custom business metric implemented
- Thresholds produce non-zero exit codes on failure
- SLA alignment documented (or noted as "no SLAs defined")
- Result export configured in at least one machine-readable format
- Progress file updated

## FAILURE METRICS

- Scripts lack thresholds (produce output but no pass/fail verdict)
- Only average-based thresholds used (no percentiles)
- Custom metrics not implemented
- Result export not configured
- Progress file not updated

---

**Next step:** Load `step-05-ci-integration.md`
