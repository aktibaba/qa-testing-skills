# Mock, Stub, and Spy Patterns

## Principle
Use the lightest test double that satisfies the test's needs: stubs for providing canned answers, spies for observing interactions, and mocks for enforcing behavioral contracts---and resist the temptation to mock everything.

## Rationale
Test doubles (mocks, stubs, spies, fakes) decouple the unit under test from its
collaborators, enabling fast and isolated tests. However, the three types serve
fundamentally different purposes, and conflating them leads to brittle, implementation-
coupled tests that break on every refactor.

A **stub** provides predetermined answers to calls, replacing a dependency's output
without verifying how it was called. Use stubs when you need to control what comes back
from a collaborator. A **spy** wraps a real implementation and records calls, letting
you verify interactions after the fact. Use spies when the real implementation is safe
to call but you need to assert that it was called correctly. A **mock** is a
pre-programmed stub that also verifies expectations about how it was called. Use mocks
when the interaction itself is the behavior you are testing (e.g., "did we send an email
exactly once?"). Over-mocking---replacing every collaborator with mocks---produces tests
that pass even when the production code is broken, because the tests only verify the
wiring between mocks.

## Pattern Examples

### 1. Stubs: Controlling Dependency Output (Jest)

```javascript
// src/services/pricing-service.js
class PricingService {
  constructor(taxApi, discountRepo) {
    this.taxApi = taxApi;
    this.discountRepo = discountRepo;
  }

  async calculateTotal(items, customerId) {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = await this.discountRepo.getActiveDiscount(customerId);
    const discountedTotal = discount
      ? subtotal * (1 - discount.percentage / 100)
      : subtotal;
    const taxRate = await this.taxApi.getTaxRate("US", "CA");
    const tax = discountedTotal * taxRate;
    return {
      subtotal,
      discount: discount ? discount.percentage : 0,
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat((discountedTotal + tax).toFixed(2)),
    };
  }
}
```

```javascript
// tests/unit/pricing-service.test.js
const { PricingService } = require("../../src/services/pricing-service");

describe("PricingService.calculateTotal", () => {
  // Create STUBS: we only care about what they return, not how they're called.
  const taxApiStub = {
    getTaxRate: jest.fn().mockResolvedValue(0.0825), // 8.25% tax.
  };

  const discountRepoStub = {
    getActiveDiscount: jest.fn(),
  };

  const service = new PricingService(taxApiStub, discountRepoStub);

  const items = [
    { price: 20, quantity: 2 }, // 40
    { price: 10, quantity: 3 }, // 30
  ]; // subtotal: 70

  it("calculates total without discount", async () => {
    // Stub returns null (no active discount).
    discountRepoStub.getActiveDiscount.mockResolvedValue(null);

    const result = await service.calculateTotal(items, "customer-1");

    expect(result.subtotal).toBe(70);
    expect(result.discount).toBe(0);
    expect(result.tax).toBe(5.78); // 70 * 0.0825
    expect(result.total).toBe(75.78);
  });

  it("applies discount before tax", async () => {
    // Stub returns a 10% discount.
    discountRepoStub.getActiveDiscount.mockResolvedValue({ percentage: 10 });

    const result = await service.calculateTotal(items, "customer-2");

    expect(result.subtotal).toBe(70);
    expect(result.discount).toBe(10);
    // Discounted: 70 * 0.9 = 63. Tax: 63 * 0.0825 = 5.20.
    expect(result.tax).toBe(5.20);
    expect(result.total).toBe(68.20);
  });
});
```

### 2. Spies: Observing Real Behavior (Jest)

```javascript
// src/services/notification-service.js
class NotificationService {
  constructor(emailClient, logger) {
    this.emailClient = emailClient;
    this.logger = logger;
  }

  async sendOrderConfirmation(order) {
    const email = {
      to: order.customerEmail,
      subject: `Order ${order.id} confirmed`,
      body: `Your order of ${order.items.length} items has been confirmed.`,
    };

    try {
      await this.emailClient.send(email);
      this.logger.info(`Confirmation sent for order ${order.id}`);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Failed to send confirmation for order ${order.id}`, error);
      return { sent: false, error: error.message };
    }
  }
}
```

```javascript
// tests/unit/notification-service.test.js
const { NotificationService } = require("../../src/services/notification-service");

describe("NotificationService", () => {
  const mockOrder = {
    id: "ORD-123",
    customerEmail: "customer@example.com",
    items: [{ name: "Widget" }, { name: "Gadget" }],
  };

  it("sends email with correct content (spy on email client)", async () => {
    // Use a real-ish email client but SPY on the send method.
    const emailClient = {
      send: jest.fn().mockResolvedValue({ messageId: "msg-001" }),
    };
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const service = new NotificationService(emailClient, logger);
    const result = await service.sendOrderConfirmation(mockOrder);

    expect(result.sent).toBe(true);

    // SPY assertions: verify the email was sent with correct parameters.
    expect(emailClient.send).toHaveBeenCalledTimes(1);
    expect(emailClient.send).toHaveBeenCalledWith({
      to: "customer@example.com",
      subject: "Order ORD-123 confirmed",
      body: expect.stringContaining("2 items"),
    });

    // SPY on logger: verify logging happened.
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("ORD-123")
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs error when email fails (spy on logger)", async () => {
    const emailClient = {
      send: jest.fn().mockRejectedValue(new Error("SMTP connection refused")),
    };
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const service = new NotificationService(emailClient, logger);
    const result = await service.sendOrderConfirmation(mockOrder);

    expect(result.sent).toBe(false);
    expect(result.error).toBe("SMTP connection refused");

    // Verify error was logged with the right context.
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("ORD-123"),
      expect.any(Error)
    );
  });
});
```

### 3. Spying on Real Implementations (Jest spyOn)

```javascript
// tests/unit/user-service.test.js
const userService = require("../../src/services/user-service");
const emailValidator = require("../../src/utils/email-validator");

describe("UserService.register", () => {
  it("calls the real email validator and proceeds", async () => {
    // Spy on a real module function without replacing it.
    const validateSpy = jest.spyOn(emailValidator, "validate");

    await userService.register({
      email: "real@example.com",
      name: "Test",
      password: "SecurePass1!",
    });

    // The REAL validation logic ran, but we can verify it was called.
    expect(validateSpy).toHaveBeenCalledWith("real@example.com");
    expect(validateSpy).toHaveReturnedWith(true);

    validateSpy.mockRestore(); // Always restore spies.
  });
});
```

### 4. Python unittest.mock Patterns

```python
# tests/unit/test_order_service.py
"""Mock, stub, and spy patterns using unittest.mock."""

from unittest.mock import Mock, patch, call, MagicMock
import pytest
from app.services.order_service import OrderService


class TestOrderService:

    def test_calculate_total_with_stub(self):
        """STUB pattern: control what the tax API returns."""
        # Create stubs.
        tax_api = Mock()
        tax_api.get_rate.return_value = 0.0825  # Stub return value.

        inventory = Mock()
        inventory.check_stock.return_value = True  # Always in stock.

        service = OrderService(tax_api=tax_api, inventory=inventory)

        total = service.calculate_total(
            items=[{"product_id": "1", "price": 100.0, "quantity": 2}]
        )

        assert total == 216.50  # (200 * 1.0825)

    def test_sends_confirmation_email_spy(self):
        """SPY pattern: verify email was sent with correct args."""
        email_client = Mock()
        email_client.send.return_value = {"message_id": "abc123"}

        service = OrderService(email_client=email_client)
        service.confirm_order(order_id="ORD-1", customer_email="a@b.com")

        # Spy on what was passed to send().
        email_client.send.assert_called_once()
        call_args = email_client.send.call_args

        assert call_args[1]["to"] == "a@b.com"
        assert "ORD-1" in call_args[1]["subject"]

    def test_retries_on_transient_failure(self):
        """MOCK pattern: verify retry behavior."""
        payment_gateway = Mock()
        # First call fails, second succeeds.
        payment_gateway.charge.side_effect = [
            ConnectionError("timeout"),
            {"transaction_id": "tx-123", "status": "success"},
        ]

        service = OrderService(payment_gateway=payment_gateway)
        result = service.process_payment(amount=50.00, card_token="tok_123")

        assert result["status"] == "success"
        # MOCK assertion: verify it was called exactly twice (1 retry).
        assert payment_gateway.charge.call_count == 2

    @patch("app.services.order_service.datetime")
    def test_sets_created_timestamp(self, mock_datetime):
        """STUB pattern: control the current time."""
        from datetime import datetime, timezone
        fixed_time = datetime(2025, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_time

        service = OrderService()
        order = service.create_order(items=[{"product_id": "1", "quantity": 1}])

        assert order.created_at == fixed_time

    def test_does_not_charge_for_free_orders(self):
        """MOCK pattern: verify something was NOT called."""
        payment_gateway = Mock()

        service = OrderService(payment_gateway=payment_gateway)
        service.process_order(items=[{"product_id": "free-sample", "price": 0}])

        # Payment gateway should never be called for a $0 order.
        payment_gateway.charge.assert_not_called()
```

### 5. Sinon.js Patterns (Alternative to Jest Mocks)

```javascript
// tests/unit/sinon-examples.test.js
const sinon = require("sinon");
const { expect } = require("chai");
const orderService = require("../../src/services/order-service");
const paymentGateway = require("../../src/gateways/payment");
const logger = require("../../src/utils/logger");

describe("OrderService with Sinon", () => {
  let sandbox;

  beforeEach(() => {
    // Sandbox ensures all stubs/spies are restored after each test.
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore(); // Critical: prevents state leakage.
  });

  it("uses a stub for the payment gateway", async () => {
    // STUB: replace the real method with a fake implementation.
    const chargeStub = sandbox.stub(paymentGateway, "charge").resolves({
      transactionId: "tx-fake",
      status: "success",
    });

    const result = await orderService.processPayment(100, "tok_test");

    expect(result.status).to.equal("success");
    expect(chargeStub.calledOnce).to.be.true;
    expect(chargeStub.calledWith(100, "tok_test")).to.be.true;
  });

  it("uses a spy on the logger", async () => {
    // SPY: wrap the real logger.info without replacing it.
    const logSpy = sandbox.spy(logger, "info");

    // Stub the external dependency (payment) but spy on internal (logger).
    sandbox.stub(paymentGateway, "charge").resolves({ status: "success" });

    await orderService.processPayment(50, "tok_test");

    expect(logSpy.calledOnce).to.be.true;
    expect(logSpy.firstCall.args[0]).to.include("Payment processed");
  });

  it("uses a fake timer for timeout testing", async () => {
    const clock = sandbox.useFakeTimers();

    sandbox.stub(paymentGateway, "charge").returns(
      new Promise(() => {}) // Never resolves (simulates timeout).
    );

    const promise = orderService.processPaymentWithTimeout(100, "tok_test", 5000);

    // Advance time by 5 seconds.
    clock.tick(5000);

    try {
      await promise;
      expect.fail("Should have timed out");
    } catch (err) {
      expect(err.message).to.include("timeout");
    }
  });
});
```

### 6. Over-Mocking Anti-Patterns

```javascript
// ANTI-PATTERN 1: Mocking the unit under test.
// BAD: You're testing the mock, not the code.
// jest.spyOn(userService, "validateEmail").mockReturnValue(true);
// const result = userService.register({ email: "bad-email" });
// expect(result.success).toBe(true);
// This test passes with ANY email because validation is mocked out.

// GOOD: Mock only the collaborators, not the unit under test.
jest.spyOn(emailClient, "send").mockResolvedValue({ sent: true });
const result = await userService.register({ email: "valid@example.com" });
expect(result.success).toBe(true);


// ANTI-PATTERN 2: Testing mock wiring instead of behavior.
// BAD: Test only verifies that method A calls method B with specific args.
// This breaks on any refactor even if the output is the same.
it("calls repository with correct args", async () => {
  // const mockRepo = { save: jest.fn() };
  // await service.createUser({ name: "Alice" });
  // expect(mockRepo.save).toHaveBeenCalledWith({ name: "Alice", role: "viewer" });
});

// GOOD: Test the observable outcome, not the internal calls.
it("creates a user with viewer role by default", async () => {
  const user = await service.createUser({ name: "Alice" });
  expect(user.name).toBe("Alice");
  expect(user.role).toBe("viewer");
  // Verify via the read path, not by spying on the write path.
  const fetched = await service.getUser(user.id);
  expect(fetched.role).toBe("viewer");
});


// ANTI-PATTERN 3: Mocking third-party library internals.
// BAD: Mocking Axios's internal methods.
// jest.mock("axios");
// axios.get.mockResolvedValue({ data: mockData });
// This couples tests to Axios's API; switching to fetch breaks all tests.

// GOOD: Create a thin wrapper and mock that.
// src/http-client.js
class HttpClient {
  async get(url) {
    const res = await axios.get(url);
    return res.data;
  }
}

// Test: mock YOUR wrapper, not Axios.
const httpClient = { get: jest.fn().mockResolvedValue(mockData) };
const service = new ProductService(httpClient);


// ANTI-PATTERN 4: Excessive jest.mock() at module level.
// BAD: Mocking everything makes tests pass but code can be completely broken.
// jest.mock("../../src/db");
// jest.mock("../../src/cache");
// jest.mock("../../src/email");
// jest.mock("../../src/logger");
// jest.mock("../../src/config");
// ... at this point you're testing nothing.

// GOOD: Mock only what you must; use integration tests for the rest.
// Mock the external boundary (HTTP, email) but use real internal logic.
jest.mock("../../src/gateways/stripe");
// Don't mock: db, cache, config, logger, validators, etc.
```

### 7. When to Use Each Type

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TEST DOUBLE DECISION GUIDE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "I need to control what a dependency RETURNS"                      │
│    → Use a STUB                                                     │
│    Example: taxApi.getRate() always returns 0.08                    │
│                                                                     │
│  "I need to verify a dependency was CALLED correctly"               │
│    → Use a SPY                                                      │
│    Example: Was emailClient.send() called with the right address?   │
│                                                                     │
│  "I need to verify exact INTERACTION behavior"                      │
│    → Use a MOCK (stub + spy + expectations)                         │
│    Example: charge() called exactly once, before sendReceipt()      │
│                                                                     │
│  "I need a lightweight working implementation"                      │
│    → Use a FAKE                                                     │
│    Example: In-memory database instead of Postgres                  │
│                                                                     │
│  "I don't need any test double"                                     │
│    → Use the REAL dependency                                        │
│    Example: Pure utility functions, value objects, validators        │
│                                                                     │
│  RULE OF THUMB:                                                     │
│    Mock at the boundary (HTTP, DB, filesystem, clock)               │
│    Use real implementations for everything else                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
