# Performance Metrics and Validation

## Principle
Effective performance testing measures the right metrics -- TTFB, percentile latencies, throughput, error rate, and Apdex score -- against clearly defined SLA thresholds to detect regressions before they reach users.

## Rationale
Average response time is a misleading metric. A service with an average latency of 200ms might have a P99 of 5 seconds, meaning 1 in 100 requests is painfully slow. Performance testing must capture the full distribution of response times and focus on tail latencies (P95, P99) that represent the worst-case user experience.

Beyond latency, throughput (requests per second), error rate under load, and Time to First Byte (TTFB) each reveal different aspects of system health. Apdex score translates raw metrics into a single satisfaction index that stakeholders can understand. SLA validation automates the comparison of measured metrics against contractual or operational targets, enabling performance gates in CI pipelines that prevent slow code from shipping. Without structured performance metrics, teams discover performance problems only when users complain.

## Pattern Examples

### 1. k6 Performance Test with Comprehensive Metrics

```javascript
// tests/performance/api-load-test.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('custom_error_rate');
const ttfb = new Trend('custom_ttfb', true);
const orderCreationTime = new Trend('order_creation_duration', true);
const successfulOrders = new Counter('successful_orders');
const failedOrders = new Counter('failed_orders');

// SLA thresholds
export const options = {
  scenarios: {
    ramp_up_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // ramp up
        { duration: '5m', target: 50 },   // steady state
        { duration: '2m', target: 100 },  // peak load
        { duration: '5m', target: 100 },  // sustained peak
        { duration: '2m', target: 0 },    // ramp down
      ],
      gracefulRampDown: '30s',
    },
    constant_throughput: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      startTime: '16m',
    },
  },

  thresholds: {
    // HTTP-level thresholds
    http_req_duration: [
      'p(50)<200',    // median under 200ms
      'p(95)<800',    // P95 under 800ms
      'p(99)<2000',   // P99 under 2s
      'max<5000',     // absolute max under 5s
    ],
    http_req_failed: ['rate<0.01'],           // <1% error rate
    'http_req_duration{type:api}': ['p(95)<500'],  // API calls faster

    // Custom metric thresholds
    custom_ttfb: ['p(95)<300'],
    custom_error_rate: ['rate<0.02'],
    order_creation_duration: ['p(95)<1500'],

    // Throughput
    http_reqs: ['rate>80'],  // at least 80 RPS
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'load-test-token';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${AUTH_TOKEN}`,
};

export default function () {
  group('Browse Products', () => {
    const listResponse = http.get(`${BASE_URL}/api/products?page=1&limit=20`, {
      headers,
      tags: { type: 'api', endpoint: 'list-products' },
    });

    check(listResponse, {
      'list products: status 200': (r) => r.status === 200,
      'list products: has items': (r) => JSON.parse(r.body).items.length > 0,
      'list products: TTFB < 200ms': (r) => r.timings.waiting < 200,
    });

    ttfb.add(listResponse.timings.waiting);
    errorRate.add(listResponse.status !== 200);

    if (listResponse.status === 200) {
      const products = JSON.parse(listResponse.body).items;
      const randomProduct = products[Math.floor(Math.random() * products.length)];

      const detailResponse = http.get(`${BASE_URL}/api/products/${randomProduct.id}`, {
        headers,
        tags: { type: 'api', endpoint: 'get-product' },
      });

      check(detailResponse, {
        'product detail: status 200': (r) => r.status === 200,
        'product detail: has price': (r) => JSON.parse(r.body).price > 0,
      });

      ttfb.add(detailResponse.timings.waiting);
    }
  });

  group('Create Order', () => {
    const startTime = Date.now();

    const orderPayload = JSON.stringify({
      items: [
        { productId: 'prod-100', quantity: Math.ceil(Math.random() * 3) },
        { productId: 'prod-200', quantity: 1 },
      ],
      shippingAddress: {
        street: '123 Load Test Ave',
        city: 'Portland',
        state: 'OR',
        zip: '97201',
      },
    });

    const createResponse = http.post(`${BASE_URL}/api/orders`, orderPayload, {
      headers,
      tags: { type: 'api', endpoint: 'create-order' },
    });

    const duration = Date.now() - startTime;
    orderCreationTime.add(duration);

    const orderOk = check(createResponse, {
      'create order: status 201': (r) => r.status === 201,
      'create order: has order ID': (r) => JSON.parse(r.body).id !== undefined,
      'create order: TTFB < 500ms': (r) => r.timings.waiting < 500,
    });

    if (orderOk) {
      successfulOrders.add(1);
    } else {
      failedOrders.add(1);
    }

    errorRate.add(!orderOk);
    ttfb.add(createResponse.timings.waiting);
  });

  sleep(Math.random() * 2 + 1); // 1-3 second think time
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    vus: {
      max: data.metrics.vus_max?.values?.max || 0,
    },
    http: {
      requests: data.metrics.http_reqs?.values?.count || 0,
      rps: data.metrics.http_reqs?.values?.rate || 0,
      failRate: data.metrics.http_req_failed?.values?.rate || 0,
    },
    latency: {
      p50: data.metrics.http_req_duration?.values?.['p(50)'] || 0,
      p90: data.metrics.http_req_duration?.values?.['p(90)'] || 0,
      p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      p99: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
      max: data.metrics.http_req_duration?.values?.max || 0,
    },
    ttfb: {
      p95: data.metrics.custom_ttfb?.values?.['p(95)'] || 0,
    },
    orders: {
      successful: data.metrics.successful_orders?.values?.count || 0,
      failed: data.metrics.failed_orders?.values?.count || 0,
      p95Duration: data.metrics.order_creation_duration?.values?.['p(95)'] || 0,
    },
    thresholds: Object.entries(data.metrics)
      .filter(([_, m]) => m.thresholds)
      .reduce((acc, [name, m]) => {
        acc[name] = Object.entries(m.thresholds).reduce((t, [k, v]) => {
          t[k] = v.ok;
          return t;
        }, {});
        return acc;
      }, {}),
  };

  return {
    'results/performance-summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  // k6 built-in textSummary
  return JSON.stringify(data, null, 2);
}
```

### 2. Apdex Score Calculation and SLA Validation

```typescript
// tests/performance/apdex-validator.ts
interface PerformanceResult {
  endpoint: string;
  responseTimes: number[];
  errorCount: number;
  totalRequests: number;
}

interface ApdexConfig {
  satisfiedThresholdMs: number;   // T: satisfied if response < T
  toleratingThresholdMs: number;  // 4T: tolerating if T <= response < 4T
}

interface SLADefinition {
  endpoint: string;
  apdex: ApdexConfig;
  maxP95Ms: number;
  maxP99Ms: number;
  maxErrorRatePercent: number;
  minThroughputRps: number;
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

function calculateApdex(responseTimes: number[], config: ApdexConfig): number {
  let satisfied = 0;
  let tolerating = 0;

  for (const time of responseTimes) {
    if (time <= config.satisfiedThresholdMs) {
      satisfied++;
    } else if (time <= config.toleratingThresholdMs) {
      tolerating++;
    }
    // frustrated (above tolerating) adds 0
  }

  return (satisfied + tolerating / 2) / responseTimes.length;
}

function interpretApdex(score: number): string {
  if (score >= 0.94) return 'Excellent';
  if (score >= 0.85) return 'Good';
  if (score >= 0.70) return 'Fair';
  if (score >= 0.50) return 'Poor';
  return 'Unacceptable';
}

function validateSLA(result: PerformanceResult, sla: SLADefinition): {
  passed: boolean;
  details: { metric: string; actual: number; threshold: number; passed: boolean }[];
} {
  const sorted = [...result.responseTimes].sort((a, b) => a - b);
  const p95 = calculatePercentile(sorted, 95);
  const p99 = calculatePercentile(sorted, 99);
  const errorRate = (result.errorCount / result.totalRequests) * 100;
  const apdexScore = calculateApdex(result.responseTimes, sla.apdex);
  const durationSec = 300; // assume 5-minute test
  const throughput = result.totalRequests / durationSec;

  const checks = [
    { metric: 'P95 Latency (ms)', actual: p95, threshold: sla.maxP95Ms, passed: p95 <= sla.maxP95Ms },
    { metric: 'P99 Latency (ms)', actual: p99, threshold: sla.maxP99Ms, passed: p99 <= sla.maxP99Ms },
    { metric: 'Error Rate (%)', actual: errorRate, threshold: sla.maxErrorRatePercent, passed: errorRate <= sla.maxErrorRatePercent },
    { metric: 'Apdex Score', actual: apdexScore, threshold: 0.85, passed: apdexScore >= 0.85 },
    { metric: 'Throughput (RPS)', actual: throughput, threshold: sla.minThroughputRps, passed: throughput >= sla.minThroughputRps },
  ];

  return {
    passed: checks.every((c) => c.passed),
    details: checks,
  };
}

// Usage in a test
import { test, expect } from '@playwright/test';

const slaDefinitions: SLADefinition[] = [
  {
    endpoint: '/api/products',
    apdex: { satisfiedThresholdMs: 200, toleratingThresholdMs: 800 },
    maxP95Ms: 500,
    maxP99Ms: 1500,
    maxErrorRatePercent: 0.5,
    minThroughputRps: 100,
  },
  {
    endpoint: '/api/orders',
    apdex: { satisfiedThresholdMs: 500, toleratingThresholdMs: 2000 },
    maxP95Ms: 1200,
    maxP99Ms: 3000,
    maxErrorRatePercent: 1.0,
    minThroughputRps: 50,
  },
];

test.describe('SLA Validation', () => {
  test('all endpoints meet SLA requirements', async () => {
    // Load k6 results from previous run
    const fs = await import('fs');
    const rawResults: PerformanceResult[] = JSON.parse(
      fs.readFileSync('results/endpoint-metrics.json', 'utf-8'),
    );

    const failures: string[] = [];

    for (const sla of slaDefinitions) {
      const result = rawResults.find((r) => r.endpoint === sla.endpoint);
      if (!result) {
        failures.push(`No results found for ${sla.endpoint}`);
        continue;
      }

      const validation = validateSLA(result, sla);
      for (const detail of validation.details) {
        if (!detail.passed) {
          failures.push(
            `${sla.endpoint} - ${detail.metric}: actual=${detail.actual.toFixed(2)}, threshold=${detail.threshold}`,
          );
        }
      }
    }

    expect(failures, `SLA violations:\n${failures.join('\n')}`).toHaveLength(0);
  });
});
```

### 3. TTFB Monitoring and Web Vitals Collection

```typescript
// tests/performance/web-vitals.spec.ts
import { test, expect, Page } from '@playwright/test';

interface WebVitals {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
  inp: number;
}

async function collectWebVitals(page: Page, url: string): Promise<WebVitals> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate((): Promise<WebVitals> => {
    return new Promise((resolve) => {
      const vitals: Partial<WebVitals> = {};

      // TTFB from Navigation Timing
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      vitals.ttfb = navEntry.responseStart - navEntry.requestStart;

      // FCP from Paint Timing
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint');
      vitals.fcp = fcpEntry ? fcpEntry.startTime : 0;

      // LCP from PerformanceObserver
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        vitals.lcp = last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // CLS from PerformanceObserver
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        vitals.cls = clsValue;
      }).observe({ type: 'layout-shift', buffered: true });

      // Wait for metrics to settle
      setTimeout(() => {
        resolve({
          ttfb: vitals.ttfb || 0,
          fcp: vitals.fcp || 0,
          lcp: vitals.lcp || 0,
          cls: vitals.cls || 0,
          fid: 0,
          inp: 0,
        });
      }, 3000);
    });
  });

  return metrics;
}

const pageThresholds: Record<string, Partial<WebVitals>> = {
  '/': { ttfb: 300, fcp: 1800, lcp: 2500, cls: 0.1 },
  '/products': { ttfb: 400, fcp: 2000, lcp: 3000, cls: 0.1 },
  '/checkout': { ttfb: 300, fcp: 1500, lcp: 2000, cls: 0.05 },
};

test.describe('Web Vitals Performance', () => {
  for (const [pagePath, thresholds] of Object.entries(pageThresholds)) {
    test(`${pagePath} meets Core Web Vitals targets`, async ({ page }) => {
      const vitals = await collectWebVitals(page, pagePath);

      console.log(`Vitals for ${pagePath}:`, JSON.stringify(vitals, null, 2));

      if (thresholds.ttfb !== undefined) {
        expect(vitals.ttfb, `TTFB for ${pagePath}`).toBeLessThan(thresholds.ttfb);
      }
      if (thresholds.fcp !== undefined) {
        expect(vitals.fcp, `FCP for ${pagePath}`).toBeLessThan(thresholds.fcp);
      }
      if (thresholds.lcp !== undefined) {
        expect(vitals.lcp, `LCP for ${pagePath}`).toBeLessThan(thresholds.lcp);
      }
      if (thresholds.cls !== undefined) {
        expect(vitals.cls, `CLS for ${pagePath}`).toBeLessThan(thresholds.cls);
      }
    });
  }

  test('TTFB is consistent across multiple requests', async ({ page }) => {
    const ttfbValues: number[] = [];

    for (let i = 0; i < 10; i++) {
      const vitals = await collectWebVitals(page, '/');
      ttfbValues.push(vitals.ttfb);
    }

    const sorted = [...ttfbValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.ceil(0.95 * sorted.length) - 1];
    const stdDev = Math.sqrt(
      ttfbValues.reduce((sum, val) => sum + (val - median) ** 2, 0) / ttfbValues.length,
    );

    console.log(`TTFB Stats: median=${median}ms, P95=${p95}ms, stdDev=${stdDev.toFixed(1)}ms`);

    expect(p95, 'P95 TTFB').toBeLessThan(400);
    expect(stdDev, 'TTFB std dev should be low (consistent)').toBeLessThan(100);
  });
});
```
