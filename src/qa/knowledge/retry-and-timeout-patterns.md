# Retry and Timeout Best Practices

## Principle
Always use explicit, condition-based waits with defined timeouts instead of arbitrary sleeps; reserve retries for genuinely transient failures, not for masking test fragility.

## Rationale
Timing issues are the most common cause of flaky tests. A test that works locally (where
the system responds in 10ms) fails in CI (where the system takes 200ms under load). The
naive fix---adding `sleep(2)`---makes tests slow and still fragile (what if CI takes 3
seconds?). Implicit waits (global timeouts that silently wait for any element) hide
performance regressions and make debugging difficult because failures appear to happen
"somewhere" after a long delay.

Explicit waits poll for a specific condition (element visible, HTTP status 200, database
row exists) with a maximum timeout. They return as soon as the condition is met, making
tests as fast as the system allows while remaining resilient to variable latency.
Exponential backoff with jitter prevents thundering-herd problems when retrying against
shared resources. Properly configured timeouts at each layer (HTTP client, database
query, test framework) create a predictable failure cascade rather than indefinite hangs.

## Pattern Examples

### 1. Explicit Waits in Playwright

```javascript
// tests/e2e/dashboard.spec.js
const { test, expect } = require("@playwright/test");

test.describe("Dashboard loading", () => {

  test("waits for data to load before asserting", async ({ page }) => {
    await page.goto("/dashboard");

    // GOOD: Explicit wait for a specific condition.
    // Returns as soon as the element is visible, up to 10s.
    await expect(page.getByTestId("dashboard-stats")).toBeVisible({ timeout: 10000 });

    // GOOD: Wait for network idle (all API calls completed).
    await page.waitForLoadState("networkidle");

    // GOOD: Wait for a specific API response before asserting.
    const [response] = await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes("/api/stats") && res.status() === 200
      ),
      page.getByTestId("refresh-button").click(),
    ]);

    const data = await response.json();
    expect(data.totalUsers).toBeGreaterThan(0);

    // BAD: Never do this.
    // await page.waitForTimeout(5000);
    // await expect(page.getByTestId("stats")).toBeVisible();
  });

  test("waits for navigation to complete", async ({ page }) => {
    await page.goto("/products");

    // GOOD: Wait for navigation triggered by a click.
    await Promise.all([
      page.waitForURL("**/products/*"),  // Wait for URL to change.
      page.getByTestId("product-item-1").click(),
    ]);

    // Now we're on the product detail page.
    await expect(page.getByTestId("product-detail")).toBeVisible();
  });

  test("handles slow-loading components", async ({ page }) => {
    await page.goto("/reports");

    // GOOD: Wait for a loading indicator to appear AND disappear.
    const spinner = page.getByTestId("loading-spinner");

    // Wait for spinner to appear (confirms request was initiated).
    await expect(spinner).toBeVisible({ timeout: 2000 });

    // Wait for spinner to disappear (confirms response was received).
    await expect(spinner).not.toBeVisible({ timeout: 30000 });

    // Now assert on the loaded content.
    await expect(page.getByTestId("report-table")).toBeVisible();
  });
});
```

### 2. Explicit Waits in Cypress

```javascript
// cypress/e2e/dashboard.cy.js

describe("Dashboard", () => {

  it("waits for API response before asserting", () => {
    // Set up an intercept BEFORE the action that triggers the request.
    cy.intercept("GET", "/api/stats").as("getStats");

    cy.visit("/dashboard");

    // GOOD: Wait for the specific API call to complete.
    cy.wait("@getStats").then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
    });

    // Now the data is loaded; safe to assert.
    cy.getByTestId("total-users").should("not.be.empty");
  });

  it("uses conditional waiting with should()", () => {
    cy.visit("/products");

    // GOOD: Cypress `should()` automatically retries until the assertion passes
    // or the default timeout (4s) expires.
    cy.getByTestId("product-list")
      .should("be.visible")
      .children()
      .should("have.length.greaterThan", 0);

    // GOOD: Custom timeout for slow operations.
    cy.getByTestId("report-table", { timeout: 15000 })
      .should("be.visible");
  });

  it("waits for element to not exist", () => {
    cy.visit("/dashboard");

    // GOOD: Wait for loading to complete.
    cy.getByTestId("loading-overlay").should("not.exist");

    // Now assert on content.
    cy.getByTestId("dashboard-content").should("be.visible");
  });
});
```

### 3. Polling Pattern for Backend Tests

```javascript
// tests/helpers/polling.js

/**
 * Poll a condition function until it returns true or the timeout expires.
 * Much better than sleep() because it returns immediately when the condition is met.
 *
 * @param {Function} conditionFn - Async function that returns true when ready.
 * @param {object} options - Configuration.
 * @returns {Promise<void>}
 */
async function waitFor(conditionFn, {
  timeout = 10000,
  interval = 200,
  message = "Condition not met within timeout",
} = {}) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await conditionFn();
      if (result) return;
    } catch (err) {
      // Condition threw; keep trying.
    }
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

module.exports = { waitFor };
```

```javascript
// Usage in tests:
const { waitFor } = require("../helpers/polling");

it("processes the order asynchronously", async () => {
  // Trigger an async operation.
  const orderId = await orderService.submit({ items: [{ productId: "1", qty: 1 }] });

  // Poll until the order reaches "confirmed" status.
  await waitFor(
    async () => {
      const order = await orderService.findById(orderId);
      return order.status === "confirmed";
    },
    {
      timeout: 15000,
      interval: 500,
      message: `Order ${orderId} did not reach confirmed status`,
    }
  );

  const order = await orderService.findById(orderId);
  expect(order.status).toBe("confirmed");
  expect(order.confirmedAt).toBeDefined();
});
```

### 4. Polling Pattern (Python)

```python
# tests/helpers/polling.py
"""Polling utilities for async operation testing."""

import time
from typing import Callable, TypeVar, Optional

T = TypeVar("T")


def wait_for(
    condition: Callable[[], T],
    timeout: float = 10.0,
    interval: float = 0.2,
    message: str = "Condition not met within timeout",
) -> T:
    """
    Poll condition() until it returns a truthy value or timeout expires.

    Args:
        condition: Callable that returns a truthy value when the condition is met.
        timeout: Maximum time to wait in seconds.
        interval: Time between polls in seconds.
        message: Error message on timeout.

    Returns:
        The truthy return value of condition().

    Raises:
        TimeoutError if the condition is not met within the timeout.
    """
    start = time.monotonic()
    last_exception = None

    while time.monotonic() - start < timeout:
        try:
            result = condition()
            if result:
                return result
        except Exception as exc:
            last_exception = exc

        time.sleep(interval)

    error_msg = f"{message} (timeout: {timeout}s)"
    if last_exception:
        error_msg += f"\nLast exception: {last_exception}"
    raise TimeoutError(error_msg)


def wait_for_row(
    session,
    model,
    filters: dict,
    timeout: float = 10.0,
):
    """Wait for a database row matching the given filters to exist."""
    def check():
        return session.query(model).filter_by(**filters).first()

    return wait_for(
        check,
        timeout=timeout,
        message=f"Row not found: {model.__name__} with {filters}",
    )
```

```python
# Usage:
def test_async_order_processing(db_session, order_service):
    order_id = order_service.submit(items=[{"product_id": "1", "qty": 1}])

    # Wait for the async worker to process the order.
    order = wait_for(
        lambda: db_session.query(Order).filter_by(
            id=order_id, status="confirmed"
        ).first(),
        timeout=15.0,
        interval=0.5,
        message=f"Order {order_id} was not confirmed",
    )

    assert order.status == "confirmed"
    assert order.confirmed_at is not None
```

### 5. Exponential Backoff with Jitter

```javascript
// tests/helpers/retry.js

/**
 * Retry a function with exponential backoff and jitter.
 * Use for operations that may fail due to transient conditions
 * (e.g., eventual consistency, rate limiting, container startup).
 */
async function retryWithBackoff(fn, {
  maxRetries = 5,
  baseDelay = 100,       // Starting delay in ms.
  maxDelay = 10000,      // Cap the delay to prevent excessive waits.
  backoffFactor = 2,     // Multiply delay by this factor each retry.
  jitterRange = 0.5,     // Randomize delay by +/- this fraction.
  retryableErrors = [],  // Only retry on these error types; empty = retry all.
  onRetry = null,        // Callback: (attempt, delay, error) => void
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if this error is retryable.
      if (retryableErrors.length > 0) {
        const isRetryable = retryableErrors.some(
          (errType) => error instanceof errType || error.code === errType
        );
        if (!isRetryable) throw error;
      }

      if (attempt > maxRetries) break;

      // Calculate delay with exponential backoff.
      let delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd.
      const jitter = delay * jitterRange * (Math.random() * 2 - 1);
      delay = Math.max(0, delay + jitter);

      if (onRetry) {
        onRetry(attempt, delay, error);
      }

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

module.exports = { retryWithBackoff };
```

```javascript
// Usage:
const { retryWithBackoff } = require("../helpers/retry");

it("eventually connects to the database", async () => {
  const result = await retryWithBackoff(
    async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      const res = await client.query("SELECT 1 AS ready");
      await client.end();
      return res.rows[0].ready;
    },
    {
      maxRetries: 10,
      baseDelay: 500,
      maxDelay: 5000,
      onRetry: (attempt, delay, err) => {
        console.log(`DB connect attempt ${attempt} failed (${err.message}), retrying in ${delay}ms`);
      },
    }
  );

  expect(result).toBe(1);
});
```

### 6. Timeout Configuration at Every Layer

```javascript
// config/test-timeouts.js
// Centralized timeout configuration for the entire test suite.

module.exports = {
  // HTTP client timeouts.
  http: {
    connect: 5000,      // TCP connection timeout.
    response: 10000,    // Time to first byte.
    deadline: 30000,    // Total request deadline.
  },

  // Database query timeouts.
  database: {
    query: 5000,        // Individual query timeout.
    connect: 10000,     // Connection pool acquisition.
    idle: 30000,        // Idle connection timeout.
  },

  // Test framework timeouts.
  framework: {
    test: 30000,        // Individual test timeout (jest/mocha).
    suite: 120000,      // Test suite timeout.
    hook: 15000,        // beforeAll/afterAll timeout.
  },

  // UI test timeouts.
  ui: {
    navigation: 15000,  // Page load / navigation.
    element: 5000,      // Element to appear.
    animation: 1000,    // CSS animation to complete.
    networkIdle: 10000, // Network to settle.
  },

  // External service timeouts.
  external: {
    stripe: 15000,
    sendgrid: 10000,
    s3: 20000,
  },
};
```

```javascript
// jest.config.js
const timeouts = require("./config/test-timeouts");

module.exports = {
  testTimeout: timeouts.framework.test,
  // ...
};
```

```javascript
// playwright.config.js
const timeouts = require("./config/test-timeouts");

module.exports = {
  timeout: timeouts.framework.test,
  expect: {
    timeout: timeouts.ui.element,
  },
  use: {
    navigationTimeout: timeouts.ui.navigation,
    actionTimeout: timeouts.ui.element,
  },
};
```

### 7. Anti-Patterns and Corrections

```javascript
// ANTI-PATTERN 1: Arbitrary sleep.
// BAD:
// await new Promise(r => setTimeout(r, 5000));
// expect(await getOrderStatus(id)).toBe("confirmed");

// GOOD: Poll for the condition.
await waitFor(async () => (await getOrderStatus(id)) === "confirmed", {
  timeout: 15000,
  message: "Order not confirmed",
});


// ANTI-PATTERN 2: Global implicit wait.
// BAD (Selenium-style):
// driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS);
// This silently waits on EVERY element lookup, masking performance issues.

// GOOD: Explicit wait per action.
await expect(page.getByTestId("result")).toBeVisible({ timeout: 5000 });


// ANTI-PATTERN 3: Retry hiding real failures.
// BAD: Retrying a test 5 times masks a genuine ordering bug.
// jest.retryTimes(5);

// GOOD: Retry only around the specific transient operation.
const data = await retryWithBackoff(
  () => fetchFromEventuallyConsistentStore(key),
  { maxRetries: 3 }
);
expect(data).toBeDefined();


// ANTI-PATTERN 4: Missing timeout entirely.
// BAD: This can hang forever if the stream never ends.
// const data = await readStream(stream);

// GOOD: Wrap in a timeout.
const data = await Promise.race([
  readStream(stream),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Stream read timed out")), 30000)
  ),
]);


// ANTI-PATTERN 5: Timeout too aggressive.
// BAD: 100ms timeout in CI where latency is higher.
// await expect(element).toBeVisible({ timeout: 100 });

// GOOD: Use CI-aware timeouts.
const baseTimeout = process.env.CI ? 10000 : 5000;
await expect(element).toBeVisible({ timeout: baseTimeout });
```
