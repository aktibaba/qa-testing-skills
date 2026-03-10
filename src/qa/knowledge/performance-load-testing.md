# Load Testing Patterns

## Principle
Load tests validate system behavior under realistic traffic patterns by defining measurable thresholds, not just checking if the system "feels fast."

## Rationale
Performance problems are notoriously difficult to catch in development. A feature that
responds in 50ms under a single developer's requests may take 5 seconds under 500
concurrent users due to database connection pool exhaustion, lock contention, or memory
pressure. Traditional functional tests cannot catch these issues because they exercise
one request at a time.

Load testing systematically applies controlled traffic to a system and measures
response times, error rates, and resource utilization. k6 has emerged as the modern
standard for this: scripts are written in JavaScript, thresholds are defined in code
(not external dashboards), and results integrate directly with CI pipelines. The key
patterns are: ramp-up strategies that model realistic traffic growth, threshold
configuration that fails the build on regression, custom metrics for business-specific
SLAs, and distributed execution for high-volume scenarios.

## Pattern Examples

### 1. Basic k6 Load Test with Thresholds

```javascript
// load-tests/api-products.js
// k6 load test for the product listing endpoint.

import http from "k6/http";
import { check, sleep } from "k6";

// Define the test configuration.
export const options = {
  // Ramp up to 50 virtual users over 1 minute, hold for 3 minutes, ramp down.
  stages: [
    { duration: "1m", target: 50 },   // Ramp up.
    { duration: "3m", target: 50 },   // Steady state.
    { duration: "30s", target: 0 },   // Ramp down.
  ],

  // Thresholds define pass/fail criteria.
  // If any threshold is breached, k6 exits with a non-zero code.
  thresholds: {
    // 95th percentile response time must be under 500ms.
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    // Error rate must be under 1%.
    http_req_failed: ["rate<0.01"],
    // At least 95% of checks must pass.
    checks: ["rate>0.95"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export default function () {
  // Simulate a user browsing the product catalog.
  const res = http.get(`${BASE_URL}/api/products?page=1&perPage=20`, {
    headers: {
      Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
      Accept: "application/json",
    },
  });

  // Validate the response.
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has data array": (r) => {
      const body = r.json();
      return body && Array.isArray(body.data);
    },
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  // Simulate user think time between requests.
  sleep(Math.random() * 3 + 1); // 1-4 seconds.
}
```

**Running:**

```bash
# Run locally.
k6 run load-tests/api-products.js

# Run with environment variables.
k6 run -e BASE_URL=https://staging.example.com -e TEST_TOKEN=abc123 load-tests/api-products.js

# Run with a specific number of VUs (overrides stages).
k6 run --vus 100 --duration 5m load-tests/api-products.js
```

### 2. Multi-Scenario Load Test (User Journey)

```javascript
// load-tests/user-journey.js
// Simulates a realistic user journey: browse -> search -> view -> add to cart -> checkout.

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

// Custom metrics for business-specific tracking.
const checkoutDuration = new Trend("checkout_duration");
const successfulOrders = new Counter("successful_orders");
const failedOrders = new Counter("failed_orders");

export const options = {
  scenarios: {
    // Scenario 1: Browsers (high volume, light load).
    browsers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "5m", target: 200 },
        { duration: "1m", target: 0 },
      ],
      exec: "browseProducts",
    },
    // Scenario 2: Buyers (lower volume, heavier load per user).
    buyers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 30 },
        { duration: "5m", target: 30 },
        { duration: "1m", target: 0 },
      ],
      exec: "purchaseFlow",
    },
  },

  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.02"],
    checkout_duration: ["p(95)<3000"],  // Checkout must complete in 3s.
    successful_orders: ["count>50"],     // At least 50 orders should succeed.
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const TOKEN = __ENV.TEST_TOKEN || "load-test-token";
const HEADERS = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

// Scenario 1: Browse products.
export function browseProducts() {
  group("Browse catalog", () => {
    const listRes = http.get(`${BASE_URL}/api/products?page=1&perPage=20`, { headers: HEADERS });
    check(listRes, { "list 200": (r) => r.status === 200 });

    sleep(2);

    // Pick a random product to view.
    if (listRes.status === 200) {
      const products = listRes.json().data;
      if (products.length > 0) {
        const product = products[Math.floor(Math.random() * products.length)];
        const detailRes = http.get(`${BASE_URL}/api/products/${product.id}`, { headers: HEADERS });
        check(detailRes, { "detail 200": (r) => r.status === 200 });
      }
    }

    sleep(3);
  });
}

// Scenario 2: Full purchase flow.
export function purchaseFlow() {
  group("Add to cart", () => {
    const res = http.post(
      `${BASE_URL}/api/cart/items`,
      JSON.stringify({ productId: "product-1", quantity: 1 }),
      { headers: HEADERS }
    );
    check(res, { "add to cart 200": (r) => r.status === 200 || r.status === 201 });
    sleep(1);
  });

  group("Checkout", () => {
    const startTime = Date.now();

    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({
        items: [{ productId: "product-1", quantity: 1 }],
        shippingAddress: {
          street: "123 Load Test Ave",
          city: "Testville",
          state: "CA",
          zip: "90210",
        },
      }),
      { headers: HEADERS }
    );

    const elapsed = Date.now() - startTime;
    checkoutDuration.add(elapsed);

    if (res.status === 201) {
      successfulOrders.add(1);
    } else {
      failedOrders.add(1);
    }

    check(res, { "order created": (r) => r.status === 201 });
    sleep(2);
  });
}
```

### 3. Spike Test Pattern

```javascript
// load-tests/spike-test.js
// Tests system resilience under sudden traffic spikes (e.g., flash sale).

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 10 },    // Baseline traffic.
    { duration: "30s", target: 500 },   // Sudden spike.
    { duration: "2m", target: 500 },    // Sustained spike.
    { duration: "30s", target: 10 },    // Spike subsides.
    { duration: "2m", target: 10 },     // Recovery period.
  ],

  thresholds: {
    // During a spike, we accept slightly degraded performance.
    http_req_duration: ["p(95)<2000"],  // 2s during spike (vs 500ms normal).
    http_req_failed: ["rate<0.05"],     // 5% error rate acceptable during spike.
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export default function () {
  const res = http.get(`${BASE_URL}/api/products?page=1`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "not rate limited": (r) => r.status !== 429,
  });
  sleep(0.5);
}
```

### 4. Soak Test Pattern

```javascript
// load-tests/soak-test.js
// Runs at moderate load for an extended period to detect memory leaks,
// connection pool exhaustion, and gradual performance degradation.

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "5m", target: 100 },    // Ramp up.
    { duration: "4h", target: 100 },     // Sustained load for 4 hours.
    { duration: "5m", target: 0 },       // Ramp down.
  ],

  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },

  // Output results to a file for post-analysis.
  // Look for p95 trending upward over time (memory leak indicator).
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export default function () {
  const endpoints = [
    "/api/products?page=1",
    "/api/products?page=2",
    "/api/users/me",
    "/api/cart",
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(res, {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
  });

  sleep(Math.random() * 2 + 1);
}
```

### 5. Custom Metrics and Tags

```javascript
// load-tests/custom-metrics.js

import http from "k6/http";
import { check } from "k6";
import { Trend, Rate, Counter, Gauge } from "k6/metrics";

// Custom metrics.
const apiLatency = new Trend("api_latency_by_endpoint");
const businessErrors = new Rate("business_error_rate");
const totalRevenue = new Counter("total_simulated_revenue");
const activeUsers = new Gauge("active_simulated_users");

export const options = {
  stages: [
    { duration: "2m", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    "api_latency_by_endpoint{endpoint:products}": ["p(95)<300"],
    "api_latency_by_endpoint{endpoint:orders}": ["p(95)<1000"],
    business_error_rate: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const HEADERS = {
  Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
  "Content-Type": "application/json",
};

export default function () {
  activeUsers.add(1);

  // Tag metrics by endpoint for granular analysis.
  const productRes = http.get(`${BASE_URL}/api/products`, {
    headers: HEADERS,
    tags: { endpoint: "products" },
  });

  apiLatency.add(productRes.timings.duration, { endpoint: "products" });

  if (productRes.status === 200) {
    const products = productRes.json().data;
    if (products.length > 0) {
      const product = products[0];

      // Create an order.
      const orderRes = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] }),
        { headers: HEADERS, tags: { endpoint: "orders" } }
      );

      apiLatency.add(orderRes.timings.duration, { endpoint: "orders" });

      if (orderRes.status === 201) {
        totalRevenue.add(product.price);
        businessErrors.add(0);
      } else {
        businessErrors.add(1);
      }
    }
  }
}

export function handleSummary(data) {
  // Custom summary output.
  return {
    "load-test-results.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
```

### 6. Distributed Load Testing with k6

```bash
#!/usr/bin/env bash
# scripts/run-distributed-load-test.sh
# Run k6 load tests in distributed mode using k6-operator on Kubernetes
# or multiple machines.

set -euo pipefail

SCRIPT="load-tests/user-journey.js"
BASE_URL="${BASE_URL:-https://staging.example.com}"
TEST_TOKEN="${TEST_TOKEN:-$(./scripts/get-load-test-token.sh)}"

# Option 1: k6 Cloud (managed distributed execution).
k6 cloud run "$SCRIPT" \
  -e BASE_URL="$BASE_URL" \
  -e TEST_TOKEN="$TEST_TOKEN"

# Option 2: Multiple machines via SSH.
# Split the VU count across machines.
MACHINES=("load-gen-1.internal" "load-gen-2.internal" "load-gen-3.internal")
VUS_PER_MACHINE=100

for MACHINE in "${MACHINES[@]}"; do
  ssh "$MACHINE" "k6 run \
    --vus $VUS_PER_MACHINE \
    --duration 5m \
    -e BASE_URL=$BASE_URL \
    -e TEST_TOKEN=$TEST_TOKEN \
    $SCRIPT" &
done

wait
echo "All load generators finished."
```

### 7. CI Integration

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  workflow_dispatch:
    inputs:
      target_url:
        description: "Target URL for load testing"
        required: true
        default: "https://staging.example.com"
      duration:
        description: "Test duration (e.g., 5m, 30m)"
        required: true
        default: "5m"

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install -y k6

      - name: Run load test
        run: |
          k6 run \
            -e BASE_URL=${{ github.event.inputs.target_url }} \
            -e TEST_TOKEN=${{ secrets.LOAD_TEST_TOKEN }} \
            --duration ${{ github.event.inputs.duration }} \
            --out json=load-test-results.json \
            load-tests/api-products.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: load-test-results.json
```
