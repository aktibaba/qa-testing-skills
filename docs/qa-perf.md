# QA Performance Testing Skill: AI-Powered Load & Stress Test Generation

**Know your breaking point before your users find it.**

---

## The Problem

Your app works fine with 10 users. What about 10,000? You don't know because performance testing is "complicated" — you need specialized tools, realistic scenarios, proper thresholds, and baseline data. So you skip it and hope for the best.

## What qa-perf Does

The `qa-perf` skill turns any AI agent into a performance testing architect that designs realistic load scenarios and generates production-ready test scripts with k6, Locust, or Artillery.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Discovery
The agent analyzes your application:
- Tech stack and infrastructure
- Critical endpoints (highest traffic, slowest response)
- Current baselines (if any)
- Existing performance tools
- Database query patterns

### Step 2 — Scenario Design
Five scenario types, each with a purpose:

| Scenario | What It Tests | Duration |
|----------|--------------|----------|
| **Smoke** | Basic sanity — does it respond? | 1 min, 1-2 users |
| **Load** | Expected traffic — normal day | 10 min, ramp to target VUs |
| **Stress** | Beyond capacity — where does it break? | 15 min, progressive overload |
| **Spike** | Sudden burst — flash sale, viral post | 5 min, instant jump to 10x |
| **Soak** | Long run — memory leaks, connection exhaustion | 1-4 hours, steady load |

### Step 3 — You Approve the Plan
Review scenarios, target VUs, and thresholds before scripts are generated.

### Step 4 — Script Generation
Organized, maintainable test scripts:

```
perf/
├── scenarios/
│   ├── smoke.js
│   ├── load.js
│   ├── stress.js
│   ├── spike.js
│   └── soak.js
├── helpers/
│   ├── auth.js        # Token management
│   └── data.js        # Parameterized test data
├── thresholds.js      # Pass/fail criteria
└── config.js          # Environment settings
```

Example k6 load test:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady state
    { duration: '2m', target: 200 },   // Push higher
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>100'],
  },
};
```

### Step 5 — Thresholds & Metrics
No averages. Percentiles only:

```
Metric                  | Threshold    | Why
P95 response time       | < 500ms      | 95% of users get fast response
P99 response time       | < 1000ms     | Even worst case is acceptable
Error rate              | < 1%         | Almost all requests succeed
Throughput              | > 100 req/s  | System handles expected load
```

### Step 6 — CI Integration

```yaml
# Smoke test on every PR
- run: k6 run perf/scenarios/smoke.js

# Load test nightly
- schedule: '0 2 * * *'
  run: k6 run perf/scenarios/load.js
```

Performance regression detection: compare against baselines automatically.

### Step 7 — Results Report
Clear pass/fail with actionable data:

```
Scenario    | P95     | P99     | Error Rate | Throughput | Result
Smoke       | 120ms   | 180ms   | 0.0%       | 50 req/s   | PASS
Load        | 340ms   | 780ms   | 0.2%       | 150 req/s  | PASS
Stress      | 890ms   | 2100ms  | 3.1%       | 280 req/s  | FAIL
Spike       | 1200ms  | 4500ms  | 8.7%       | 95 req/s   | FAIL
```

## Key Features

- **Realistic load profiles** — ramp-up, steady state, ramp-down (not instant blast)
- **Percentiles, not averages** — P95/P99 tell the real story
- **Parameterized data** — no hardcoded values, realistic variety
- **Token reuse** — auth tokens shared across virtual users
- **JSON/CSV export** — machine-readable results for dashboards
- **Baseline comparison** — detect performance regression over time
- **Any tool** — k6, Locust, or Artillery

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-perf` prompt with your AI agent. Find your breaking point before launch day.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
