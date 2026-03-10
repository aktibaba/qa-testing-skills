# Error Path and Negative Testing

## Principle
Error path testing systematically verifies that applications handle invalid inputs, boundary conditions, and unexpected failures gracefully, preventing silent data corruption and security vulnerabilities.

## Rationale
Most bugs that reach production exist not in the happy path (which gets the most attention during development and testing) but in error paths: the boundary between valid and invalid input, the fallback when an external service is down, the behavior when disk space runs out. These paths are exercised rarely in manual testing but frequently in production by users who enter unexpected data, bots that send malformed requests, and infrastructure that fails unpredictably.

Negative testing flips the testing mindset from "does it work?" to "how does it break?" Boundary value analysis identifies the exact edges where behavior changes: one item below the maximum, one character past the limit, the exact moment a timeout fires. Chaos engineering extends this to infrastructure: what happens when a database connection drops mid-transaction, when network latency spikes to 30 seconds, or when a downstream service returns garbage? Testing these paths before production discovers them turns potential incidents into handled edge cases.

## Pattern Examples

### 1. Boundary Value Analysis

```typescript
// tests/boundaries/input-validation.spec.ts
import { test, expect } from 'vitest';
import { UserService } from '../../src/services/user-service';
import { createMockDb } from '../helpers/mocks';

const userService = new UserService(createMockDb());

test.describe('Username Validation Boundaries', () => {
  // Boundary: minimum length is 3
  test('rejects username with 0 characters (empty)', async () => {
    await expect(userService.createUser({ username: '', email: 'a@b.com' }))
      .rejects.toThrow('Username must be between 3 and 30 characters');
  });

  test('rejects username with 1 character', async () => {
    await expect(userService.createUser({ username: 'a', email: 'a@b.com' }))
      .rejects.toThrow('Username must be between 3 and 30 characters');
  });

  test('rejects username with 2 characters (just below minimum)', async () => {
    await expect(userService.createUser({ username: 'ab', email: 'a@b.com' }))
      .rejects.toThrow('Username must be between 3 and 30 characters');
  });

  test('accepts username with 3 characters (at minimum)', async () => {
    const user = await userService.createUser({ username: 'abc', email: 'abc@b.com' });
    expect(user.username).toBe('abc');
  });

  test('accepts username with 4 characters (just above minimum)', async () => {
    const user = await userService.createUser({ username: 'abcd', email: 'abcd@b.com' });
    expect(user.username).toBe('abcd');
  });

  // Boundary: maximum length is 30
  test('accepts username with 29 characters (just below maximum)', async () => {
    const username = 'a'.repeat(29);
    const user = await userService.createUser({ username, email: 'long@b.com' });
    expect(user.username).toBe(username);
  });

  test('accepts username with 30 characters (at maximum)', async () => {
    const username = 'a'.repeat(30);
    const user = await userService.createUser({ username, email: 'max@b.com' });
    expect(user.username).toBe(username);
  });

  test('rejects username with 31 characters (just above maximum)', async () => {
    const username = 'a'.repeat(31);
    await expect(userService.createUser({ username, email: 'over@b.com' }))
      .rejects.toThrow('Username must be between 3 and 30 characters');
  });
});

test.describe('Quantity Boundaries in Orders', () => {
  const orderService = new (require('../../src/services/order-service').OrderService)(createMockDb());

  // Boundary: quantity must be positive integer, max 999
  const quantityCases = [
    { value: -1, shouldFail: true, desc: 'negative quantity' },
    { value: 0, shouldFail: true, desc: 'zero quantity' },
    { value: 0.5, shouldFail: true, desc: 'fractional quantity' },
    { value: 1, shouldFail: false, desc: 'minimum valid quantity' },
    { value: 2, shouldFail: false, desc: 'typical small quantity' },
    { value: 999, shouldFail: false, desc: 'maximum valid quantity' },
    { value: 1000, shouldFail: true, desc: 'just above maximum quantity' },
    { value: NaN, shouldFail: true, desc: 'NaN quantity' },
    { value: Infinity, shouldFail: true, desc: 'infinite quantity' },
  ];

  for (const { value, shouldFail, desc } of quantityCases) {
    test(`${shouldFail ? 'rejects' : 'accepts'} ${desc} (${value})`, async () => {
      const promise = orderService.createOrder({
        userId: 'user-001',
        items: [{ productId: 'prod-100', quantity: value }],
      });

      if (shouldFail) {
        await expect(promise).rejects.toThrow();
      } else {
        const order = await promise;
        expect(order.items[0].quantity).toBe(value);
      }
    });
  }
});

test.describe('Price Calculation Edge Cases', () => {
  test('handles floating point precision in totals', () => {
    // Classic floating point: 0.1 + 0.2 !== 0.3
    const items = [
      { price: 0.1, quantity: 1 },
      { price: 0.2, quantity: 1 },
    ];

    const total = items.reduce((sum, item) => {
      return Math.round((sum + item.price * item.quantity) * 100) / 100;
    }, 0);

    expect(total).toBe(0.3); // not 0.30000000000000004
  });

  test('handles maximum order value without overflow', () => {
    const items = [{ price: 99999.99, quantity: 999 }];
    const total = items[0].price * items[0].quantity;

    expect(total).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(Number.isFinite(total)).toBe(true);
  });

  test('zero-price items do not cause division by zero in discounts', () => {
    const calculateDiscount = (price: number, discountPercent: number) => {
      if (price === 0) return 0;
      return Math.round(price * (discountPercent / 100) * 100) / 100;
    };

    expect(calculateDiscount(0, 50)).toBe(0);
    expect(calculateDiscount(100, 0)).toBe(0);
    expect(calculateDiscount(0, 0)).toBe(0);
  });
});
```

### 2. Negative Testing for API Endpoints

```typescript
// tests/negative/api-error-handling.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('API Error Handling', () => {
  test.describe('Authentication Errors', () => {
    test('returns 401 for missing auth token', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/orders`);

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toMatch(/authentication|token/i);
      // Should not leak implementation details
      expect(JSON.stringify(body)).not.toMatch(/stack|trace|sequelize|knex/i);
    });

    test('returns 401 for expired JWT token', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/orders`, {
        headers: { Authorization: 'Bearer expired.jwt.token' },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('TOKEN_EXPIRED');
    });

    test('returns 401 for malformed auth header', async ({ request }) => {
      const malformedHeaders = [
        'not-a-bearer-token',
        'Bearer',
        'Bearer ',
        'Basic dXNlcjpwYXNz',
        'bearer valid-token', // wrong case
      ];

      for (const header of malformedHeaders) {
        const response = await request.get(`${BASE_URL}/api/orders`, {
          headers: { Authorization: header },
        });
        expect(response.status(), `Header "${header}" should return 401`).toBe(401);
      }
    });
  });

  test.describe('Input Validation Errors', () => {
    test('returns 400 with field-level errors for invalid JSON body', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        data: 'not valid json{{{',
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/INVALID_JSON|PARSE_ERROR/);
    });

    test('returns 400 with structured validation errors', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/users`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
        },
        data: {
          email: 'not-an-email',
          firstName: '',
          lastName: 'A', // too short
          password: '123', // too weak
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();

      expect(body.errors).toBeInstanceOf(Array);
      expect(body.errors.length).toBeGreaterThanOrEqual(3);

      const errorFields = body.errors.map((e: any) => e.field);
      expect(errorFields).toContain('email');
      expect(errorFields).toContain('firstName');
      expect(errorFields).toContain('password');

      // Each error should have field, message, and code
      for (const error of body.errors) {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    test('returns 400 for SQL injection attempts', async ({ request }) => {
      const injectionPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; SELECT * FROM users",
        "' UNION SELECT password FROM users --",
      ];

      for (const payload of injectionPayloads) {
        const response = await request.get(
          `${BASE_URL}/api/users?search=${encodeURIComponent(payload)}`,
          { headers: { Authorization: 'Bearer valid-token' } },
        );

        // Should not return 500 (which would indicate unhandled SQL)
        expect(
          response.status(),
          `SQL injection payload should not cause 500: ${payload}`,
        ).not.toBe(500);

        // Should return either 400 (invalid input) or 200 (no results)
        expect([200, 400]).toContain(response.status());
      }
    });

    test('returns 400 for XSS payloads in input fields', async ({ request }) => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
      ];

      for (const payload of xssPayloads) {
        const response = await request.post(`${BASE_URL}/api/comments`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          },
          data: { text: payload, postId: 'post-001' },
        });

        if (response.status() === 201) {
          // If accepted, the response must sanitize the content
          const body = await response.json();
          expect(body.text).not.toContain('<script');
          expect(body.text).not.toContain('onerror');
          expect(body.text).not.toContain('javascript:');
        }
      }
    });
  });

  test.describe('Resource Not Found and Conflict Errors', () => {
    test('returns 404 for non-existent resource with correct error format', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/orders/non-existent-id-12345`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('NOT_FOUND');
      // Should not reveal database details
      expect(body.message).not.toMatch(/SELECT|FROM|WHERE|query/i);
    });

    test('returns 409 for duplicate resource creation', async ({ request }) => {
      // Create first
      await request.post(`${BASE_URL}/api/users`, {
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
        data: { email: 'duplicate@test.com', firstName: 'Dup', lastName: 'User', password: 'Str0ngP@ss!' },
      });

      // Create duplicate
      const response = await request.post(`${BASE_URL}/api/users`, {
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
        data: { email: 'duplicate@test.com', firstName: 'Dup', lastName: 'Two', password: 'Str0ngP@ss!' },
      });

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.error).toBe('CONFLICT');
      expect(body.message).toMatch(/email.*already exists|duplicate/i);
    });
  });
});
```

### 3. Chaos Engineering Basics -- Failure Injection

```typescript
// tests/chaos/service-resilience.spec.ts
import { test, expect } from 'vitest';
import { OrderService } from '../../src/services/order-service';

test.describe('Service Resilience', () => {
  test('handles database connection timeout gracefully', async () => {
    const mockDb = {
      orders: {
        insert: () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out')), 100),
        ),
      },
      products: {
        findById: async () => ({ id: 'prod-100', price: 10, stock: 50 }),
      },
    };

    const service = new OrderService(mockDb as any);

    await expect(
      service.createOrder({
        userId: 'user-001',
        items: [{ productId: 'prod-100', quantity: 1 }],
      }),
    ).rejects.toThrow(/timeout|unavailable|try again/i);
  });

  test('retries transient database errors up to 3 times', async () => {
    let callCount = 0;
    const mockDb = {
      orders: {
        insert: async (data: any) => {
          callCount++;
          if (callCount < 3) {
            throw new Error('ECONNRESET: connection reset by peer');
          }
          return { id: 'ord-retry-001', ...data };
        },
      },
      products: {
        findById: async () => ({ id: 'prod-100', price: 10, stock: 50 }),
        decrementStock: async () => {},
      },
    };

    const service = new OrderService(mockDb as any);
    const order = await service.createOrder({
      userId: 'user-001',
      items: [{ productId: 'prod-100', quantity: 1 }],
    });

    expect(order.id).toBe('ord-retry-001');
    expect(callCount).toBe(3);
  });

  test('handles payment gateway returning unexpected response format', async () => {
    const mockPayment = {
      charge: async () => ({
        // Missing required fields
        unexpectedField: 'garbage',
        statusCode: 'not-a-real-status',
      }),
    };

    const service = new OrderService(
      { orders: {}, products: { findById: async () => ({ id: 'p1', price: 10, stock: 5 }) } } as any,
      mockPayment as any,
    );

    await expect(
      service.processPayment('ord-001', { paymentMethodId: 'pm_test' }),
    ).rejects.toThrow(/invalid response|payment processing failed/i);
  });

  test('handles concurrent modification conflict', async () => {
    let version = 1;
    const mockDb = {
      orders: {
        findById: async () => ({ id: 'ord-001', status: 'pending', version }),
        update: async (id: string, data: any) => {
          if (data.expectedVersion !== version) {
            throw new Error('Optimistic locking: version mismatch');
          }
          version++;
          return { ...data, version };
        },
      },
    };

    const service = new OrderService(mockDb as any);

    // Simulate concurrent updates
    const update1 = service.updateOrderStatus('ord-001', 'processing', 1);
    const update2 = service.updateOrderStatus('ord-001', 'cancelled', 1);

    const results = await Promise.allSettled([update1, update2]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason.message).toMatch(/version mismatch|conflict/i);
  });

  test('handles extremely large request payload', async ({ request }) => {
    const largePayload = {
      items: Array.from({ length: 10000 }, (_, i) => ({
        productId: `prod-${i}`,
        quantity: 1,
      })),
    };

    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify(largePayload),
    });

    // Should reject with appropriate error, not crash
    expect([400, 413]).toContain(response.status);
    const body = await response.json();
    expect(body.error).toMatch(/too large|too many items|limit/i);
  });

  test('handles null and undefined values in nested objects', async () => {
    const service = new OrderService({ orders: {}, products: {} } as any);

    const nullVariants = [
      { userId: null, items: [{ productId: 'p1', quantity: 1 }] },
      { userId: 'u1', items: null },
      { userId: 'u1', items: [{ productId: null, quantity: 1 }] },
      { userId: 'u1', items: [{ productId: 'p1', quantity: null }] },
      { userId: undefined, items: [{ productId: 'p1', quantity: 1 }] },
    ];

    for (const input of nullVariants) {
      await expect(
        service.createOrder(input as any),
        `Should handle: ${JSON.stringify(input)}`,
      ).rejects.toThrow(); // Should throw a validation error, not crash
    }
  });
});
```
