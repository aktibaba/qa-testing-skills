# Microservice Testing

## Principle
Microservice testing requires strategies that verify individual service behavior, inter-service communication, distributed transaction correctness, and end-to-end flow integrity without requiring all services to be running simultaneously.

## Rationale
Microservice architectures trade monolithic complexity for distributed complexity. A single user action may trigger a chain of synchronous API calls, asynchronous messages, and saga-based workflows spanning multiple services. Testing this effectively requires a layered approach: unit tests within each service, integration tests at service boundaries, contract tests between consumer-provider pairs, and end-to-end tests for critical user journeys.

The saga pattern -- where a business transaction spans multiple services through a sequence of local transactions with compensating actions for rollback -- is particularly challenging to test. Each step must be verified independently, and failure at any point must trigger the correct compensation chain. Distributed tracing (via OpenTelemetry) provides visibility into cross-service request flows, and tests can assert on trace data to verify that services interact correctly. Service mesh testing validates that retry policies, circuit breakers, and load balancing behave as configured. Without these testing strategies, microservice teams discover integration issues only in staging or production.

## Pattern Examples

### 1. Service Boundary Integration Testing

```typescript
// order-service/tests/integration/payment-integration.spec.ts
import { test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../../src/app';
import { GenericContainer, StartedTestContainer, Network } from 'testcontainers';
import { Server } from 'http';

let app: Server;
let appPort: number;
let mockPaymentService: StartedTestContainer;
let mockInventoryService: StartedTestContainer;
let postgres: StartedTestContainer;
let network: any;

beforeAll(async () => {
  network = await new Network().start();

  // Start PostgreSQL
  postgres = await new GenericContainer('postgres:16-alpine')
    .withNetwork(network)
    .withNetworkAliases('db')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'orders',
    })
    .withExposedPorts(5432)
    .start();

  // Start mock payment service (WireMock)
  mockPaymentService = await new GenericContainer('wiremock/wiremock:3.5.4')
    .withNetwork(network)
    .withNetworkAliases('payment-service')
    .withExposedPorts(8080)
    .start();

  // Start mock inventory service
  mockInventoryService = await new GenericContainer('wiremock/wiremock:3.5.4')
    .withNetwork(network)
    .withNetworkAliases('inventory-service')
    .withExposedPorts(8080)
    .start();

  // Configure WireMock stubs
  const paymentUrl = `http://localhost:${mockPaymentService.getMappedPort(8080)}`;
  const inventoryUrl = `http://localhost:${mockInventoryService.getMappedPort(8080)}`;

  // Payment service stub: successful charge
  await fetch(`${paymentUrl}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        method: 'POST',
        urlPattern: '/api/charges',
        bodyPatterns: [{ matchesJsonPath: '$.amount' }],
      },
      response: {
        status: 201,
        jsonBody: {
          id: 'ch_test_123',
          status: 'succeeded',
          amount: '{{jsonPath request.body "$.amount"}}',
        },
        transformers: ['response-template'],
      },
    }),
  });

  // Inventory service stub: check stock
  await fetch(`${inventoryUrl}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        method: 'GET',
        urlPattern: '/api/inventory/.*',
      },
      response: {
        status: 200,
        jsonBody: { productId: 'prod-100', available: 50, reserved: 5 },
      },
    }),
  });

  // Start the order service
  const application = createApp({
    dbUrl: `postgres://test:test@localhost:${postgres.getMappedPort(5432)}/orders`,
    paymentServiceUrl: paymentUrl,
    inventoryServiceUrl: inventoryUrl,
  });

  await new Promise<void>((resolve) => {
    app = application.listen(0, () => {
      const addr = app.address();
      appPort = typeof addr === 'object' && addr ? addr.port : 3000;
      resolve();
    });
  });
}, 120000);

afterAll(async () => {
  app?.close();
  await mockPaymentService?.stop();
  await mockInventoryService?.stop();
  await postgres?.stop();
  await network?.stop();
});

test('creates order with inventory reservation and payment', async () => {
  const response = await fetch(`http://localhost:${appPort}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({
      items: [{ productId: 'prod-100', quantity: 2 }],
      paymentMethodId: 'pm_test_123',
    }),
  });

  expect(response.status).toBe(201);
  const order = await response.json();

  expect(order.status).toBe('confirmed');
  expect(order.paymentId).toBe('ch_test_123');
  expect(order.items[0].reserved).toBe(true);
});

test('rolls back reservation when payment fails', async () => {
  // Configure payment service to fail
  const paymentUrl = `http://localhost:${mockPaymentService.getMappedPort(8080)}`;
  await fetch(`${paymentUrl}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priority: 1, // Higher priority than default stub
      request: {
        method: 'POST',
        urlPattern: '/api/charges',
        bodyPatterns: [{ matchesJsonPath: '$[?(@.paymentMethodId == "pm_failing")]' }],
      },
      response: {
        status: 402,
        jsonBody: { error: 'CARD_DECLINED', message: 'Card was declined' },
      },
    }),
  });

  const response = await fetch(`http://localhost:${appPort}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({
      items: [{ productId: 'prod-100', quantity: 2 }],
      paymentMethodId: 'pm_failing',
    }),
  });

  expect(response.status).toBe(402);
  const body = await response.json();
  expect(body.error).toBe('PAYMENT_FAILED');

  // Verify inventory reservation was released
  const inventoryUrl = `http://localhost:${mockInventoryService.getMappedPort(8080)}`;
  const requests = await fetch(`${inventoryUrl}/__admin/requests?urlPattern=/api/inventory/release`);
  const releaseRequests = await requests.json();
  expect(releaseRequests.requests.length).toBeGreaterThan(0);
});

test('handles inventory service timeout with circuit breaker', async () => {
  // Configure inventory service to delay
  const inventoryUrl = `http://localhost:${mockInventoryService.getMappedPort(8080)}`;
  await fetch(`${inventoryUrl}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priority: 1,
      request: {
        method: 'GET',
        urlPattern: '/api/inventory/prod-slow',
      },
      response: {
        status: 200,
        fixedDelayMilliseconds: 15000, // 15 second delay
        jsonBody: { productId: 'prod-slow', available: 10 },
      },
    }),
  });

  const response = await fetch(`http://localhost:${appPort}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify({
      items: [{ productId: 'prod-slow', quantity: 1 }],
      paymentMethodId: 'pm_test_123',
    }),
  });

  // Should timeout and return error, not hang
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(body.error).toMatch(/SERVICE_UNAVAILABLE|TIMEOUT/);
});
```

### 2. Saga Pattern Testing

```typescript
// order-service/tests/sagas/order-saga.spec.ts
import { test, expect, beforeEach } from 'vitest';
import { OrderSaga, SagaStep, SagaState } from '../../src/sagas/order-saga';

// Mock service clients
function createMockServices() {
  const executionLog: string[] = [];

  return {
    log: executionLog,
    inventory: {
      reserve: async (items: any[]) => {
        executionLog.push('inventory.reserve');
        return { reservationId: 'res-001' };
      },
      release: async (reservationId: string) => {
        executionLog.push('inventory.release');
        return { released: true };
      },
    },
    payment: {
      charge: async (amount: number, methodId: string) => {
        executionLog.push('payment.charge');
        return { chargeId: 'ch-001' };
      },
      refund: async (chargeId: string) => {
        executionLog.push('payment.refund');
        return { refundId: 'rf-001' };
      },
    },
    shipping: {
      createLabel: async (orderId: string, address: any) => {
        executionLog.push('shipping.createLabel');
        return { trackingNumber: 'TRACK-001' };
      },
      cancelLabel: async (trackingNumber: string) => {
        executionLog.push('shipping.cancelLabel');
        return { cancelled: true };
      },
    },
    notification: {
      sendConfirmation: async (orderId: string, email: string) => {
        executionLog.push('notification.sendConfirmation');
        return { sent: true };
      },
      sendCancellation: async (orderId: string, email: string) => {
        executionLog.push('notification.sendCancellation');
        return { sent: true };
      },
    },
  };
}

test.describe('Order Saga - Happy Path', () => {
  test('executes all steps in correct order', async () => {
    const services = createMockServices();
    const saga = new OrderSaga(services);

    const result = await saga.execute({
      orderId: 'ord-001',
      userId: 'user-001',
      items: [{ productId: 'prod-100', quantity: 2 }],
      totalAmount: 59.98,
      paymentMethodId: 'pm_test',
      shippingAddress: { street: '123 Main St', city: 'Portland', state: 'OR', zip: '97201' },
      email: 'user@example.com',
    });

    expect(result.state).toBe('COMPLETED');
    expect(services.log).toEqual([
      'inventory.reserve',
      'payment.charge',
      'shipping.createLabel',
      'notification.sendConfirmation',
    ]);
  });
});

test.describe('Order Saga - Compensation', () => {
  test('compensates in reverse order when payment fails', async () => {
    const services = createMockServices();
    // Make payment fail
    services.payment.charge = async () => {
      services.log.push('payment.charge.FAILED');
      throw new Error('Card declined');
    };

    const saga = new OrderSaga(services);

    const result = await saga.execute({
      orderId: 'ord-002',
      userId: 'user-001',
      items: [{ productId: 'prod-100', quantity: 1 }],
      totalAmount: 29.99,
      paymentMethodId: 'pm_failing',
      shippingAddress: { street: '123 Main St', city: 'Portland', state: 'OR', zip: '97201' },
      email: 'user@example.com',
    });

    expect(result.state).toBe('COMPENSATED');
    expect(result.failedStep).toBe('payment');
    expect(result.error).toMatch(/Card declined/);

    // Verify execution order: forward steps then compensation in reverse
    expect(services.log).toEqual([
      'inventory.reserve',       // Step 1: succeeded
      'payment.charge.FAILED',   // Step 2: failed
      'inventory.release',       // Compensate step 1
    ]);
  });

  test('compensates in reverse order when shipping fails', async () => {
    const services = createMockServices();
    services.shipping.createLabel = async () => {
      services.log.push('shipping.createLabel.FAILED');
      throw new Error('Shipping provider unavailable');
    };

    const saga = new OrderSaga(services);

    const result = await saga.execute({
      orderId: 'ord-003',
      userId: 'user-001',
      items: [{ productId: 'prod-100', quantity: 1 }],
      totalAmount: 29.99,
      paymentMethodId: 'pm_test',
      shippingAddress: { street: '123 Main St', city: 'Portland', state: 'OR', zip: '97201' },
      email: 'user@example.com',
    });

    expect(result.state).toBe('COMPENSATED');
    expect(result.failedStep).toBe('shipping');

    expect(services.log).toEqual([
      'inventory.reserve',            // Step 1: succeeded
      'payment.charge',               // Step 2: succeeded
      'shipping.createLabel.FAILED',  // Step 3: failed
      'payment.refund',               // Compensate step 2
      'inventory.release',            // Compensate step 1
    ]);
  });

  test('handles compensation failure with dead letter', async () => {
    const services = createMockServices();
    const deadLetterQueue: any[] = [];

    // Payment fails
    services.payment.charge = async () => {
      services.log.push('payment.charge.FAILED');
      throw new Error('Card declined');
    };

    // Compensation also fails
    services.inventory.release = async () => {
      services.log.push('inventory.release.FAILED');
      throw new Error('Inventory service down');
    };

    const saga = new OrderSaga(services, {
      onCompensationFailure: (step: string, error: Error, context: any) => {
        deadLetterQueue.push({ step, error: error.message, context });
      },
    });

    const result = await saga.execute({
      orderId: 'ord-004',
      userId: 'user-001',
      items: [{ productId: 'prod-100', quantity: 1 }],
      totalAmount: 29.99,
      paymentMethodId: 'pm_test',
      shippingAddress: { street: '123 Main St', city: 'Portland', state: 'OR', zip: '97201' },
      email: 'user@example.com',
    });

    expect(result.state).toBe('COMPENSATION_FAILED');
    expect(deadLetterQueue).toHaveLength(1);
    expect(deadLetterQueue[0].step).toBe('inventory');
    expect(deadLetterQueue[0].error).toBe('Inventory service down');
  });
});
```

### 3. Distributed Tracing in Tests

```typescript
// tests/tracing/distributed-trace.spec.ts
import { test, expect, beforeAll } from 'vitest';

const JAEGER_URL = 'http://localhost:16686';
const APP_URL = 'http://localhost:3000';

interface JaegerSpan {
  traceID: string;
  spanID: string;
  operationName: string;
  serviceName: string;
  duration: number;
  tags: Array<{ key: string; value: string | number | boolean }>;
  logs: Array<{ fields: Array<{ key: string; value: string }> }>;
  references: Array<{ refType: string; traceID: string; spanID: string }>;
}

async function getTraceByHeader(traceId: string): Promise<JaegerSpan[]> {
  // Wait for spans to be flushed
  await new Promise((r) => setTimeout(r, 2000));

  const response = await fetch(`${JAEGER_URL}/api/traces/${traceId}`);
  const data = await response.json();

  if (!data.data || data.data.length === 0) return [];

  return data.data[0].spans.map((span: any) => ({
    traceID: span.traceID,
    spanID: span.spanID,
    operationName: span.operationName,
    serviceName: data.data[0].processes[span.processID]?.serviceName || 'unknown',
    duration: span.duration,
    tags: span.tags,
    logs: span.logs || [],
    references: span.references || [],
  }));
}

function findSpan(spans: JaegerSpan[], service: string, operation: string): JaegerSpan | undefined {
  return spans.find(
    (s) => s.serviceName === service && s.operationName.includes(operation),
  );
}

function getTagValue(span: JaegerSpan, key: string): string | number | boolean | undefined {
  return span.tags.find((t) => t.key === key)?.value;
}

test.describe('Distributed Tracing Verification', () => {
  test('order creation spans all required services', async () => {
    // Make request with a known trace ID for lookup
    const response = await fetch(`${APP_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        items: [{ productId: 'prod-100', quantity: 1 }],
        paymentMethodId: 'pm_test',
      }),
    });

    expect(response.status).toBe(201);

    // Extract trace ID from response headers
    const traceId = response.headers.get('x-trace-id');
    expect(traceId).toBeTruthy();

    const spans = await getTraceByHeader(traceId!);
    expect(spans.length).toBeGreaterThan(0);

    // Verify all expected services participated
    const serviceNames = [...new Set(spans.map((s) => s.serviceName))];
    expect(serviceNames).toContain('order-service');
    expect(serviceNames).toContain('inventory-service');
    expect(serviceNames).toContain('payment-service');

    // Verify span hierarchy (parent-child relationships)
    const orderSpan = findSpan(spans, 'order-service', 'POST /api/orders');
    expect(orderSpan).toBeDefined();

    const inventorySpan = findSpan(spans, 'inventory-service', 'reserve');
    expect(inventorySpan).toBeDefined();
    expect(inventorySpan!.references.some(
      (r) => r.refType === 'CHILD_OF' && r.spanID === orderSpan!.spanID,
    )).toBe(true);

    const paymentSpan = findSpan(spans, 'payment-service', 'charge');
    expect(paymentSpan).toBeDefined();

    // Verify HTTP status codes are tagged
    expect(getTagValue(orderSpan!, 'http.status_code')).toBe(201);
    expect(getTagValue(inventorySpan!, 'http.status_code')).toBe(200);
    expect(getTagValue(paymentSpan!, 'http.status_code')).toBe(201);

    // Verify no error tags
    for (const span of spans) {
      expect(
        getTagValue(span, 'error'),
        `Span ${span.serviceName}/${span.operationName} should not have errors`,
      ).not.toBe(true);
    }
  });

  test('failed request traces include error details', async () => {
    const response = await fetch(`${APP_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        items: [{ productId: 'prod-out-of-stock', quantity: 100 }],
        paymentMethodId: 'pm_test',
      }),
    });

    const traceId = response.headers.get('x-trace-id');
    expect(traceId).toBeTruthy();

    const spans = await getTraceByHeader(traceId!);

    // Find the span that failed
    const errorSpan = spans.find((s) => getTagValue(s, 'error') === true);
    expect(errorSpan).toBeDefined();

    // Error details should be logged
    const errorLog = errorSpan!.logs.find((l) =>
      l.fields.some((f) => f.key === 'event' && f.value === 'error'),
    );
    expect(errorLog).toBeDefined();

    // Error message should not contain sensitive data
    const errorMessage = errorLog!.fields.find((f) => f.key === 'message')?.value || '';
    expect(errorMessage).not.toMatch(/password|secret|key|token/i);
  });

  test('trace propagation works across async message processing', async () => {
    // Trigger an async event (order shipped -> notification sent)
    const response = await fetch(`${APP_URL}/api/orders/ord-trace-async/ship`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        trackingNumber: 'TRACK-TRACE-001',
        carrier: 'ups',
      }),
    });

    const traceId = response.headers.get('x-trace-id');
    expect(traceId).toBeTruthy();

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 5000));

    const spans = await getTraceByHeader(traceId!);

    // Same trace ID should connect synchronous and asynchronous spans
    const serviceNames = [...new Set(spans.map((s) => s.serviceName))];
    expect(serviceNames).toContain('order-service');
    expect(serviceNames).toContain('notification-service');

    // Find the async message span
    const messageSpan = findSpan(spans, 'notification-service', 'process');
    expect(messageSpan).toBeDefined();

    // Verify the trace context was propagated through the message queue
    expect(messageSpan!.traceID).toBe(traceId);
  });
});
```
