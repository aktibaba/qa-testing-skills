# Network-First Testing

## Principle
Intercept and control HTTP traffic at the network layer to create deterministic, fast, and isolated tests that fully decouple the frontend from backend availability.

## Rationale
End-to-end tests that depend on live backend services are slow, flaky, and
non-deterministic. A database migration, a rate limit, or a third-party API outage can
fail your UI test suite even though the frontend code is correct. Network-first testing
inverts this dependency: instead of hoping the backend returns the right data, you
explicitly define what the network returns for each test scenario.

This approach provides three key benefits. First, **speed**: intercepted requests
resolve in microseconds, not milliseconds. Second, **determinism**: the same test
produces the same result regardless of backend state. Third, **coverage**: you can
simulate error states (500s, timeouts, malformed JSON) that are difficult or impossible
to trigger against a real backend. Modern frameworks like Playwright and Cypress provide
built-in network interception. For server-side tests, MSW (Mock Service Worker) offers
the same capability at the Node.js level.

## Pattern Examples

### 1. Playwright Route Interception

```javascript
// tests/e2e/products.spec.js
const { test, expect } = require("@playwright/test");

// Sample response data.
const mockProducts = [
  { id: "1", name: "Widget", price: 29.99, stock: 100 },
  { id: "2", name: "Gadget", price: 49.99, stock: 0 },
  { id: "3", name: "Doohickey", price: 9.99, stock: 42 },
];

test.describe("Product listing page", () => {

  test("displays products from the API", async ({ page }) => {
    // Intercept the API call and return mock data.
    await page.route("**/api/products*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: mockProducts,
          meta: { total: 3, page: 1, perPage: 20 },
        }),
      });
    });

    await page.goto("/products");

    // Assert the UI renders the mocked data.
    await expect(page.getByTestId("product-item-1")).toContainText("Widget");
    await expect(page.getByTestId("product-item-2")).toContainText("Gadget");
    await expect(page.getByTestId("product-list")).toHaveCount(1);
  });

  test("shows empty state when no products exist", async ({ page }) => {
    await page.route("**/api/products*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, perPage: 20 } }),
      });
    });

    await page.goto("/products");

    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(page.getByTestId("empty-state")).toContainText("No products found");
  });

  test("shows error banner on API failure", async ({ page }) => {
    await page.route("**/api/products*", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/products");

    await expect(page.getByRole("alert")).toContainText("Failed to load products");
  });

  test("handles network timeout gracefully", async ({ page }) => {
    await page.route("**/api/products*", async (route) => {
      // Simulate a timeout by delaying the response.
      await new Promise((resolve) => setTimeout(resolve, 30000));
      route.abort("timedout");
    });

    await page.goto("/products");

    // The UI should show a timeout-specific message.
    await expect(page.getByTestId("loading-spinner")).toBeVisible();
    // After the app's own timeout, it should show an error.
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
  });
});
```

### 2. Playwright Request/Response Assertion

```javascript
// tests/e2e/checkout.spec.js
const { test, expect } = require("@playwright/test");

test("submits the correct order payload", async ({ page }) => {
  // Capture the request that the frontend sends.
  let capturedRequest = null;

  await page.route("**/api/orders", (route) => {
    capturedRequest = route.request();
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: { id: "order-123", status: "confirmed" },
      }),
    });
  });

  // Intercept product and cart APIs too.
  await page.route("**/api/cart", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [{ productId: "1", name: "Widget", quantity: 2, unitPrice: 29.99 }],
          total: 59.98,
        },
      }),
    });
  });

  await page.goto("/checkout");
  await page.getByTestId("checkout-place-order").click();

  // Wait for the confirmation to appear.
  await expect(page.getByTestId("order-confirmation")).toContainText("order-123");

  // Assert the request payload was correct.
  expect(capturedRequest).not.toBeNull();
  const body = capturedRequest.postDataJSON();
  expect(body).toMatchObject({
    items: [{ productId: "1", quantity: 2 }],
  });
  expect(capturedRequest.method()).toBe("POST");
  expect(capturedRequest.headers()["content-type"]).toContain("application/json");
});

test("sends auth token with API requests", async ({ page }) => {
  // Set a fake auth cookie/token.
  await page.context().addCookies([
    { name: "auth_token", value: "fake-jwt-token", domain: "localhost", path: "/" },
  ]);

  let authHeader = null;

  await page.route("**/api/products*", (route) => {
    authHeader = route.request().headers()["authorization"];
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { total: 0 } }),
    });
  });

  await page.goto("/products");

  expect(authHeader).toBe("Bearer fake-jwt-token");
});
```

### 3. Cypress Network Interception

```javascript
// cypress/e2e/products.cy.js

describe("Product listing", () => {

  it("displays products from intercepted API", () => {
    // cy.intercept matches requests and provides mock responses.
    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: {
        data: [
          { id: "1", name: "Widget", price: 29.99 },
          { id: "2", name: "Gadget", price: 49.99 },
        ],
        meta: { total: 2, page: 1, perPage: 20 },
      },
    }).as("getProducts");  // Alias for waiting.

    cy.visit("/products");

    // Wait for the intercepted request to complete.
    cy.wait("@getProducts");

    cy.getByTestId("product-item-1").should("contain", "Widget");
    cy.getByTestId("product-item-2").should("contain", "Gadget");
  });

  it("handles server errors", () => {
    cy.intercept("GET", "/api/products*", {
      statusCode: 500,
      body: { error: "Internal Server Error" },
    }).as("getProductsFail");

    cy.visit("/products");
    cy.wait("@getProductsFail");

    cy.findByRole("alert").should("contain", "Failed to load");
  });

  it("simulates network failure", () => {
    cy.intercept("GET", "/api/products*", { forceNetworkError: true }).as("networkError");

    cy.visit("/products");

    cy.findByRole("alert").should("contain", "Network error");
  });

  it("simulates slow response", () => {
    cy.intercept("GET", "/api/products*", {
      statusCode: 200,
      body: { data: [{ id: "1", name: "Slow Widget" }], meta: { total: 1 } },
      delay: 3000,  // 3 second delay.
    }).as("slowProducts");

    cy.visit("/products");

    // Spinner should appear while waiting.
    cy.getByTestId("loading-spinner").should("be.visible");

    cy.wait("@slowProducts");

    // Spinner should disappear; content should appear.
    cy.getByTestId("loading-spinner").should("not.exist");
    cy.getByTestId("product-item-1").should("contain", "Slow Widget");
  });
});
```

### 4. Cypress Request Assertion

```javascript
// cypress/e2e/checkout.cy.js

describe("Checkout flow", () => {

  it("sends correct order payload", () => {
    // Mock cart API.
    cy.intercept("GET", "/api/cart", {
      body: {
        data: {
          items: [{ productId: "p1", name: "Widget", quantity: 2, unitPrice: 29.99 }],
          total: 59.98,
        },
      },
    });

    // Intercept and spy on the order creation request.
    cy.intercept("POST", "/api/orders", {
      statusCode: 201,
      body: { data: { id: "order-456", status: "confirmed" } },
    }).as("createOrder");

    cy.visit("/checkout");
    cy.getByTestId("checkout-place-order").click();

    // Assert the request payload.
    cy.wait("@createOrder").then((interception) => {
      expect(interception.request.body).to.deep.include({
        items: [{ productId: "p1", quantity: 2 }],
      });
      expect(interception.request.headers).to.have.property("authorization");
    });

    cy.getByTestId("order-confirmation").should("contain", "order-456");
  });
});
```

### 5. MSW (Mock Service Worker) for Node.js Integration Tests

```javascript
// tests/setup/msw-handlers.js
// Define default API mock handlers for the test suite.

const { http, HttpResponse } = require("msw");

const handlers = [
  // User profile endpoint.
  http.get("https://api.example.com/users/me", () => {
    return HttpResponse.json({
      data: { id: "user-1", name: "Test User", email: "test@example.com" },
    });
  }),

  // Product listing.
  http.get("https://api.example.com/products", ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("perPage") || "20");

    return HttpResponse.json({
      data: Array.from({ length: perPage }, (_, i) => ({
        id: `product-${(page - 1) * perPage + i + 1}`,
        name: `Product ${(page - 1) * perPage + i + 1}`,
        price: 9.99 + i,
      })),
      meta: { total: 100, page, perPage },
    });
  }),

  // Order creation.
  http.post("https://api.example.com/orders", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { data: { id: "order-new", status: "confirmed", items: body.items } },
      { status: 201 }
    );
  }),
];

module.exports = { handlers };
```

```javascript
// tests/services/order-service.test.js
const { setupServer } = require("msw/node");
const { http, HttpResponse } = require("msw");
const { handlers } = require("../setup/msw-handlers");
const orderService = require("../../src/services/order-service");

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("OrderService", () => {
  it("creates an order via the API", async () => {
    const order = await orderService.create({
      items: [{ productId: "product-1", quantity: 2 }],
    });

    expect(order.id).toBe("order-new");
    expect(order.status).toBe("confirmed");
  });

  it("handles API rate limiting", async () => {
    server.use(
      http.post("https://api.example.com/orders", () => {
        return HttpResponse.json(
          { error: "Too Many Requests", retryAfter: 60 },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      })
    );

    await expect(
      orderService.create({ items: [{ productId: "product-1", quantity: 1 }] })
    ).rejects.toThrow("Rate limited");
  });

  it("retries on transient 503 errors", async () => {
    let callCount = 0;

    server.use(
      http.post("https://api.example.com/orders", () => {
        callCount++;
        if (callCount < 3) {
          return HttpResponse.json(
            { error: "Service Unavailable" },
            { status: 503 }
          );
        }
        return HttpResponse.json(
          { data: { id: "order-retry", status: "confirmed" } },
          { status: 201 }
        );
      })
    );

    const order = await orderService.create({
      items: [{ productId: "product-1", quantity: 1 }],
    });

    expect(order.id).toBe("order-retry");
    expect(callCount).toBe(3); // Two failures + one success.
  });
});
```

### 6. Conditional Pass-Through for Hybrid Testing

```javascript
// tests/e2e/hybrid.spec.js
const { test, expect } = require("@playwright/test");

test.describe("Hybrid: mock external APIs, hit real backend", () => {

  test.beforeEach(async ({ page }) => {
    // Only mock EXTERNAL services; let internal API calls pass through.
    await page.route("**/api.stripe.com/**", (route) => {
      if (route.request().url().includes("/v1/charges")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "ch_mock", status: "succeeded" }),
        });
      } else {
        route.continue(); // Let other Stripe endpoints through.
      }
    });

    // Mock analytics to prevent real tracking during tests.
    await page.route("**/analytics.example.com/**", (route) => {
      route.fulfill({ status: 200, body: "" });
    });

    // Let all internal API calls (/api/*) go to the real backend.
    // (No route registered = pass-through by default.)
  });

  test("checkout with mocked payment but real order creation", async ({ page }) => {
    await page.goto("/checkout");
    // ... fill in checkout form ...
    await page.getByTestId("checkout-place-order").click();

    // The order was created on the real backend; Stripe was mocked.
    await expect(page.getByTestId("order-confirmation")).toBeVisible();
  });
});
```

### 7. Network Error Simulation Matrix

```javascript
// tests/e2e/error-resilience.spec.js
const { test, expect } = require("@playwright/test");

const errorScenarios = [
  {
    name: "500 Internal Server Error",
    response: { status: 500, body: JSON.stringify({ error: "Internal Server Error" }) },
    expectedMessage: "Something went wrong",
  },
  {
    name: "502 Bad Gateway",
    response: { status: 502, body: "Bad Gateway" },
    expectedMessage: "Service unavailable",
  },
  {
    name: "503 Service Unavailable",
    response: { status: 503, body: JSON.stringify({ error: "Service Unavailable" }) },
    expectedMessage: "Service unavailable",
  },
  {
    name: "Network disconnection",
    abort: "connectionfailed",
    expectedMessage: "Network error",
  },
  {
    name: "DNS resolution failure",
    abort: "namenotresolved",
    expectedMessage: "Network error",
  },
  {
    name: "Malformed JSON response",
    response: { status: 200, body: "not valid json{{{", contentType: "application/json" },
    expectedMessage: "Unexpected error",
  },
];

for (const scenario of errorScenarios) {
  test(`handles ${scenario.name}`, async ({ page }) => {
    await page.route("**/api/products*", (route) => {
      if (scenario.abort) {
        route.abort(scenario.abort);
      } else {
        route.fulfill(scenario.response);
      }
    });

    await page.goto("/products");

    await expect(page.getByRole("alert")).toContainText(scenario.expectedMessage);
    // Ensure the app doesn't crash (no unhandled exceptions).
    await expect(page.getByTestId("app-root")).toBeVisible();
  });
}
```
