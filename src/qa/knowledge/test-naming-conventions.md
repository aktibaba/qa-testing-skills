# Test Naming and Organization Conventions

## Principle
Consistent test naming and organization enables developers to find, understand, and maintain tests quickly, turning the test suite into living documentation of system behavior.

## Rationale
A well-organized test suite serves two purposes: it verifies that code works correctly, and it documents how the system is supposed to behave. When test names read like specifications ("should reject expired discount codes at checkout"), any developer can understand the expected behavior without reading the implementation. When test files mirror the source code structure, finding the tests for a given module is trivial.

Poor naming and organization create the opposite effect. Tests named "test1", "it works", or "handles edge case" tell nothing about what is being tested. Files dumped into a single flat directory make it impossible to assess coverage by feature. Inconsistent patterns force developers to learn different conventions across the codebase. Establishing and enforcing naming conventions early pays compound dividends as the test suite grows from dozens to thousands of tests.

## Pattern Examples

### 1. describe/it Pattern with BDD-Style Naming

```typescript
// tests/services/order-service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { OrderService } from '../../src/services/order-service';
import { createMockDb, createMockPaymentGateway } from '../helpers/mocks';

// Pattern: describe blocks mirror the class/module structure
// it blocks describe behavior in plain English
describe('OrderService', () => {
  let orderService: OrderService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockPayment: ReturnType<typeof createMockPaymentGateway>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockPayment = createMockPaymentGateway();
    orderService = new OrderService(mockDb, mockPayment);
  });

  // Group by method
  describe('createOrder', () => {
    // Happy path first
    it('creates an order with valid items and returns the order ID', async () => {
      const order = await orderService.createOrder({
        userId: 'user-001',
        items: [{ productId: 'prod-100', quantity: 2 }],
      });

      expect(order.id).toBeDefined();
      expect(order.status).toBe('pending');
      expect(order.items).toHaveLength(1);
    });

    it('calculates the total including tax', async () => {
      mockDb.products.findById.mockResolvedValue({ id: 'prod-100', price: 10.0 });

      const order = await orderService.createOrder({
        userId: 'user-001',
        items: [{ productId: 'prod-100', quantity: 3 }],
      });

      expect(order.subtotal).toBe(30.0);
      expect(order.tax).toBeGreaterThan(0);
      expect(order.total).toBe(order.subtotal + order.tax);
    });

    // Validation errors next
    it('rejects an order with no items', async () => {
      await expect(
        orderService.createOrder({ userId: 'user-001', items: [] }),
      ).rejects.toThrow('Order must contain at least one item');
    });

    it('rejects an order with quantity exceeding stock', async () => {
      mockDb.products.findById.mockResolvedValue({ id: 'prod-100', price: 10, stock: 5 });

      await expect(
        orderService.createOrder({
          userId: 'user-001',
          items: [{ productId: 'prod-100', quantity: 10 }],
        }),
      ).rejects.toThrow('Insufficient stock');
    });

    it('rejects an order for a non-existent product', async () => {
      mockDb.products.findById.mockResolvedValue(null);

      await expect(
        orderService.createOrder({
          userId: 'user-001',
          items: [{ productId: 'prod-999', quantity: 1 }],
        }),
      ).rejects.toThrow('Product not found: prod-999');
    });
  });

  describe('cancelOrder', () => {
    it('cancels a pending order and restores stock', async () => {
      mockDb.orders.findById.mockResolvedValue({
        id: 'ord-001',
        userId: 'user-001',
        status: 'pending',
        items: [{ productId: 'prod-100', quantity: 2 }],
      });

      const result = await orderService.cancelOrder('ord-001', 'user-001', 'Changed my mind');

      expect(result.status).toBe('cancelled');
      expect(result.cancellationReason).toBe('Changed my mind');
      expect(mockDb.products.incrementStock).toHaveBeenCalledWith('prod-100', 2);
    });

    it('prevents cancellation of a shipped order', async () => {
      mockDb.orders.findById.mockResolvedValue({
        id: 'ord-002',
        userId: 'user-001',
        status: 'shipped',
      });

      await expect(
        orderService.cancelOrder('ord-002', 'user-001', 'Too late'),
      ).rejects.toThrow('Cannot cancel order with status: shipped');
    });

    it('prevents a user from cancelling another user\'s order', async () => {
      mockDb.orders.findById.mockResolvedValue({
        id: 'ord-003',
        userId: 'user-002',
        status: 'pending',
      });

      await expect(
        orderService.cancelOrder('ord-003', 'user-001', 'Not mine'),
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('applyDiscountCode', () => {
    it('applies a valid percentage discount to the order total', async () => {
      const order = { id: 'ord-001', subtotal: 100, discount: 0, total: 108 };
      mockDb.orders.findById.mockResolvedValue(order);
      mockDb.discounts.findByCode.mockResolvedValue({
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        expiresAt: new Date(Date.now() + 86400000),
        usageLimit: 100,
        usageCount: 50,
      });

      const result = await orderService.applyDiscountCode('ord-001', 'SAVE20');

      expect(result.discount).toBe(20); // 20% of $100
      expect(result.total).toBe(88); // $100 - $20 + tax
    });

    it('rejects an expired discount code', async () => {
      mockDb.discounts.findByCode.mockResolvedValue({
        code: 'EXPIRED',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      });

      await expect(
        orderService.applyDiscountCode('ord-001', 'EXPIRED'),
      ).rejects.toThrow('Discount code has expired');
    });

    it('rejects a discount code that has reached its usage limit', async () => {
      mockDb.discounts.findByCode.mockResolvedValue({
        code: 'MAXED',
        type: 'percentage',
        value: 10,
        expiresAt: new Date(Date.now() + 86400000),
        usageLimit: 100,
        usageCount: 100,
      });

      await expect(
        orderService.applyDiscountCode('ord-001', 'MAXED'),
      ).rejects.toThrow('Discount code usage limit reached');
    });
  });
});
```

### 2. File Structure and Test Categorization

```
project/
├── src/
│   ├── services/
│   │   ├── order-service.ts
│   │   ├── user-service.ts
│   │   └── payment-service.ts
│   ├── controllers/
│   │   ├── order-controller.ts
│   │   └── user-controller.ts
│   └── utils/
│       ├── validators.ts
│       └── formatters.ts
│
├── tests/
│   ├── unit/                          # Fast, isolated, no I/O
│   │   ├── services/
│   │   │   ├── order-service.spec.ts   # mirrors src/services/
│   │   │   ├── user-service.spec.ts
│   │   │   └── payment-service.spec.ts
│   │   └── utils/
│   │       ├── validators.spec.ts
│   │       └── formatters.spec.ts
│   │
│   ├── integration/                   # Tests with real dependencies
│   │   ├── api/
│   │   │   ├── orders.api.spec.ts     # HTTP-level tests
│   │   │   └── users.api.spec.ts
│   │   └── database/
│   │       ├── migrations.spec.ts
│   │       └── queries.spec.ts
│   │
│   ├── e2e/                           # Full user flows
│   │   ├── checkout.e2e.spec.ts
│   │   ├── registration.e2e.spec.ts
│   │   └── search.e2e.spec.ts
│   │
│   ├── smoke/                         # Critical path, runs first
│   │   ├── health-check.smoke.spec.ts
│   │   └── login.smoke.spec.ts
│   │
│   ├── visual/                        # Screenshot comparison
│   │   ├── homepage.visual.spec.ts
│   │   └── components.visual.spec.ts
│   │
│   ├── a11y/                          # Accessibility
│   │   ├── page-accessibility.spec.ts
│   │   └── wcag-checklist.spec.ts
│   │
│   ├── performance/                   # Load and performance
│   │   ├── api-load-test.js
│   │   └── web-vitals.spec.ts
│   │
│   ├── contract/                      # Consumer/provider contracts
│   │   ├── consumer/
│   │   └── provider/
│   │
│   ├── helpers/                       # Shared test utilities
│   │   ├── mocks.ts
│   │   ├── fixtures.ts
│   │   ├── test-data-builder.ts
│   │   └── custom-matchers.ts
│   │
│   └── fixtures/                      # Static test data
│       ├── users.json
│       ├── products.json
│       └── images/
│           └── test-avatar.png
```

```json
// package.json - test scripts by category
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit/",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "playwright test tests/e2e/",
    "test:smoke": "playwright test tests/smoke/",
    "test:visual": "playwright test tests/visual/",
    "test:a11y": "playwright test tests/a11y/",
    "test:perf": "k6 run tests/performance/api-load-test.js",
    "test:contract:consumer": "vitest run tests/contract/consumer/",
    "test:contract:provider": "vitest run tests/contract/provider/",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3. Naming Anti-Patterns and Corrections

```typescript
// BAD: Vague, uninformative test names
describe('OrderService', () => {
  it('works', async () => { /* ... */ });
  it('test create', async () => { /* ... */ });
  it('error case', async () => { /* ... */ });
  it('handles edge case', async () => { /* ... */ });
  it('should work correctly', async () => { /* ... */ });
  it('test 1', async () => { /* ... */ });
});

// GOOD: Descriptive, behavior-focused names
describe('OrderService', () => {
  describe('createOrder', () => {
    it('creates an order and returns a unique order ID', async () => { /* ... */ });
    it('calculates shipping based on the delivery address', async () => { /* ... */ });
    it('rejects orders with out-of-stock products', async () => { /* ... */ });
    it('rejects orders when the user account is suspended', async () => { /* ... */ });
    it('applies the loyalty discount for returning customers', async () => { /* ... */ });
    it('sends an order confirmation email after creation', async () => { /* ... */ });
  });
});

// BAD: Testing implementation details
describe('OrderService', () => {
  it('calls db.orders.insert with the correct parameters', async () => { /* ... */ });
  it('calls paymentGateway.charge exactly once', async () => { /* ... */ });
  it('sets the internal _status field to pending', async () => { /* ... */ });
});

// GOOD: Testing behavior and outcomes
describe('OrderService', () => {
  it('persists the order so it can be retrieved later', async () => {
    const order = await orderService.createOrder(validInput);
    const retrieved = await orderService.getOrder(order.id);
    expect(retrieved).toEqual(order);
  });

  it('charges the customer the correct total amount', async () => {
    await orderService.createOrder(validInput);
    expect(mockPayment.getLastCharge().amount).toBe(32.99);
  });

  it('marks the order as pending until payment is confirmed', async () => {
    const order = await orderService.createOrder(validInput);
    expect(order.status).toBe('pending');
  });
});

// BAD: Nested describe blocks that are too deep
describe('OrderService', () => {
  describe('createOrder', () => {
    describe('with valid input', () => {
      describe('when user has loyalty points', () => {
        describe('and points cover the full amount', () => {
          it('creates a zero-total order', () => { /* ... */ });
        });
      });
    });
  });
});

// GOOD: Flatten deep nesting with descriptive test names
describe('OrderService', () => {
  describe('createOrder', () => {
    it('creates a zero-total order when loyalty points cover the full amount', () => {
      /* ... */
    });
    it('applies partial loyalty points and charges the remainder', () => {
      /* ... */
    });
    it('ignores loyalty points when the user opts out', () => {
      /* ... */
    });
  });
});

// NAMING CONVENTION REFERENCE:
//
// describe blocks:   Use the class, module, or feature name
//                    e.g., describe('OrderService'), describe('createOrder')
//
// it blocks:         Start with a verb describing the behavior
//                    e.g., 'creates...', 'rejects...', 'returns...', 'sends...'
//
// Avoid:             'should' prefix (unnecessary noise)
//                    'test' prefix (already in a test)
//                    Implementation details (SQL queries, method calls)
//
// Test IDs:          Use tags or annotations for test management
//                    e.g., @smoke, @regression, @critical
//
// File naming:       <module-name>.<test-type>.spec.ts
//                    e.g., order-service.spec.ts
//                          checkout.e2e.spec.ts
//                          homepage.visual.spec.ts
//                          login.smoke.spec.ts
```
