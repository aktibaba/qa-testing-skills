---
name: 'step-05-webhook-event-tests'
description: 'Generate webhook and event-driven integration tests'
nextStepFile: './step-06-validate-and-summary.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 5: Webhook and Event-Driven Integration Tests

## STEP GOAL
Generate integration tests for asynchronous communication patterns: webhooks (incoming and outgoing), message queue publish/consume cycles, event-driven workflows, and callback-based integrations.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- If the project has no async integrations, document this finding and proceed to Step 6
- All async tests must use proper wait strategies — never sleep-based polling
- Test idempotency for every message consumer

## CONTEXT BOUNDARIES
- Available context: service map from Step 1, test environment from Step 3
- Required knowledge fragments: `webhook-testing` (23), `retry-and-timeout-patterns` (30), `test-isolation` (07)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 5.1 — Identify Async Integration Points

From the service map in Step 1, list all asynchronous integrations:

| Type | Source | Target | Protocol | Payload Format |
|------|--------|--------|----------|----------------|
| Webhook (incoming) | Stripe | API | HTTPS POST | JSON |
| Webhook (outgoing) | API | Customer URL | HTTPS POST | JSON |
| Message Queue | API | RabbitMQ → Worker | AMQP | JSON |
| Event Stream | Service A | Kafka → Service B | Kafka | Avro/JSON |
| Scheduled Job | Cron | API | Internal | N/A |

If no async integrations exist, skip to Save Progress and note "N/A — No async integrations detected."

### 5.2 — Generate Incoming Webhook Tests

For each incoming webhook endpoint (e.g., payment provider callbacks):

**File naming:** `specs/webhooks/<provider>-webhook.test.ts`

```typescript
/**
 * Integration Test: <Provider> Incoming Webhooks
 *
 * Tests webhook handling for events received from <provider>.
 * Integration boundary: <Provider> → Application webhook endpoint
 * Priority: P0
 */

describe('<Provider> Webhook Handler', () => {
  describe('Signature Verification', () => {
    test('should accept webhook with valid signature', async () => {
      const payload = createWebhookPayload('payment.succeeded', { amount: 1999 });
      const signature = signWebhookPayload(payload, WEBHOOK_SECRET);

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('Stripe-Signature', signature)
        .send(payload);

      expect(response.status).toBe(200);
    });

    test('should reject webhook with invalid signature', async () => {
      const payload = createWebhookPayload('payment.succeeded', { amount: 1999 });

      const response = await request(app)
        .post('/webhooks/stripe')
        .set('Stripe-Signature', 'invalid-signature')
        .send(payload);

      expect(response.status).toBe(401);
    });

    test('should reject webhook with missing signature header', async () => {
      const payload = createWebhookPayload('payment.succeeded', {});

      const response = await request(app)
        .post('/webhooks/stripe')
        .send(payload);

      expect(response.status).toBe(401);
    });
  });

  describe('Event Processing', () => {
    test('should process payment.succeeded event and update order', async () => {
      // Arrange: create order in pending state
      const order = await createTestOrder({ status: 'awaiting_payment' });

      // Act: send webhook
      const payload = createWebhookPayload('payment.succeeded', {
        metadata: { orderId: order.id },
        amount: order.total,
      });
      await sendSignedWebhook('/webhooks/stripe', payload);

      // Assert: order status updated
      const updatedOrder = await getOrder(order.id);
      expect(updatedOrder.status).toBe('paid');
      expect(updatedOrder.paidAt).toBeDefined();
    });

    test('should process payment.failed event and notify user', async () => {
      const order = await createTestOrder({ status: 'awaiting_payment' });

      const payload = createWebhookPayload('payment.failed', {
        metadata: { orderId: order.id },
        error: { message: 'Insufficient funds' },
      });
      await sendSignedWebhook('/webhooks/stripe', payload);

      const updatedOrder = await getOrder(order.id);
      expect(updatedOrder.status).toBe('payment_failed');
      // Verify notification was triggered (check mock email service or notification queue)
    });

    test('should handle unknown event type gracefully', async () => {
      const payload = createWebhookPayload('unknown.event.type', {});
      const response = await sendSignedWebhook('/webhooks/stripe', payload);

      expect(response.status).toBe(200); // Acknowledge but do nothing
    });
  });

  describe('Idempotency', () => {
    test('should process duplicate webhook only once', async () => {
      const order = await createTestOrder({ status: 'awaiting_payment' });
      const payload = createWebhookPayload('payment.succeeded', {
        metadata: { orderId: order.id },
      });

      // Send same webhook twice
      await sendSignedWebhook('/webhooks/stripe', payload);
      await sendSignedWebhook('/webhooks/stripe', payload);

      // Verify order was updated only once (no double-processing)
      const events = await getOrderEvents(order.id);
      const paymentEvents = events.filter(e => e.type === 'payment_succeeded');
      expect(paymentEvents).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should return 200 even if processing fails (to prevent retries)', async () => {
      // Depending on strategy — some providers retry on non-2xx
      const payload = createWebhookPayload('payment.succeeded', {
        metadata: { orderId: 'non-existent-order' },
      });

      const response = await sendSignedWebhook('/webhooks/stripe', payload);
      // Strategy decision: return 200 and log error, or return 4xx/5xx for retry
      expect([200, 422]).toContain(response.status);
    });
  });
});
```

### 5.3 — Generate Outgoing Webhook Tests

If the application sends webhooks to customer-configured URLs:

**File naming:** `specs/webhooks/outgoing-webhook.test.ts`

```typescript
/**
 * Integration Test: Outgoing Webhook Delivery
 *
 * Tests that the application correctly sends webhooks to configured endpoints.
 * Integration boundary: Application → Customer webhook URL
 * Priority: P1
 */

describe('Outgoing Webhook Delivery', () => {
  let mockReceiver: MockWebhookReceiver;

  beforeEach(async () => {
    mockReceiver = await startMockWebhookReceiver(9999);
  });

  afterEach(async () => {
    await mockReceiver.stop();
  });

  test('should deliver webhook with correct payload format', async () => {
    // Configure webhook URL pointing to mock receiver
    await configureWebhook('http://localhost:9999/webhook', ['order.created']);

    // Trigger event
    await createOrder(testOrderData);

    // Wait for webhook delivery
    const received = await mockReceiver.waitForRequest(5000);
    expect(received.body).toMatchObject({
      event: 'order.created',
      data: expect.objectContaining({ id: expect.any(String) }),
      timestamp: expect.any(String),
    });
    expect(received.headers['content-type']).toBe('application/json');
    expect(received.headers['x-webhook-signature']).toBeDefined();
  });

  test('should retry on delivery failure', async () => {
    mockReceiver.failNextRequests(2); // Fail first 2 attempts

    await createOrder(testOrderData);

    // Should eventually succeed after retries
    const received = await mockReceiver.waitForRequest(30000);
    expect(received).toBeDefined();
    expect(mockReceiver.requestCount).toBeGreaterThanOrEqual(3);
  });

  test('should respect configured event filters', async () => {
    await configureWebhook('http://localhost:9999/webhook', ['order.created']);

    // Trigger unsubscribed event
    await updateOrder(existingOrderId, { status: 'shipped' });

    // Should NOT receive webhook
    const received = await mockReceiver.waitForRequest(3000).catch(() => null);
    expect(received).toBeNull();
  });
});
```

### 5.4 — Generate Message Queue Integration Tests

For message queue-based integrations:

**File naming:** `specs/messaging/<queue-name>.messaging.test.ts`

```typescript
/**
 * Integration Test: <Queue/Topic> Message Processing
 *
 * Tests message publish and consume cycle via <broker>.
 * Integration boundary: <Publisher> → <Broker> → <Consumer>
 * Priority: P0
 */

describe('<Queue Name> Message Processing', () => {
  describe('Publish', () => {
    test('should publish message with correct format to queue', async () => {
      await triggerAction(); // Action that should produce a message

      const message = await consumeNextMessage('order-events', 5000);
      expect(message).toMatchObject({
        type: 'order.created',
        payload: expect.objectContaining({ orderId: expect.any(String) }),
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          correlationId: expect.any(String),
        }),
      });
    });
  });

  describe('Consume', () => {
    test('should process valid message and produce expected side effect', async () => {
      // Publish test message directly to queue
      await publishMessage('email-queue', {
        type: 'send_welcome_email',
        payload: { userId: 'test-user-1', email: 'user@test.com' },
      });

      // Wait for consumer to process
      await waitForCondition(async () => {
        const emails = await getMockEmailsSent();
        return emails.length > 0;
      }, 10000);

      const emails = await getMockEmailsSent();
      expect(emails[0].to).toBe('user@test.com');
      expect(emails[0].template).toBe('welcome');
    });

    test('should handle malformed message without crashing consumer', async () => {
      await publishMessage('email-queue', 'not-valid-json');

      // Consumer should not crash — verify it's still alive
      await new Promise(r => setTimeout(r, 2000));
      const healthCheck = await checkConsumerHealth();
      expect(healthCheck.status).toBe('healthy');

      // Malformed message should be in dead letter queue
      const dlqMessages = await getDeadLetterMessages('email-queue-dlq');
      expect(dlqMessages.length).toBeGreaterThan(0);
    });

    test('should handle duplicate messages idempotently', async () => {
      const message = {
        type: 'send_welcome_email',
        payload: { userId: 'test-user-1', email: 'user@test.com' },
        messageId: 'unique-msg-123',
      };

      // Publish same message twice
      await publishMessage('email-queue', message);
      await publishMessage('email-queue', message);

      await waitForCondition(async () => {
        const processed = await getProcessedMessageCount('unique-msg-123');
        return processed >= 1;
      }, 10000);

      // Should only process once
      const emails = await getMockEmailsSent();
      const welcomeEmails = emails.filter(e => e.to === 'user@test.com' && e.template === 'welcome');
      expect(welcomeEmails).toHaveLength(1);
    });
  });

  describe('Error Recovery', () => {
    test('should retry failed message processing', async () => { /* ... */ });
    test('should route poison messages to dead letter queue after max retries', async () => { /* ... */ });
    test('should handle broker connection loss and reconnect', async () => { /* ... */ });
  });
});
```

### 5.5 — Create Async Test Helpers

Generate helper utilities for async test patterns:

```typescript
// helpers/async-helpers.ts

/**
 * Wait for a condition to become true, polling at intervals.
 * Throws if condition is not met within timeout.
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeoutMs = 10000,
  intervalMs = 500,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Consume the next message from a queue with timeout.
 */
export async function consumeNextMessage(
  queue: string,
  timeoutMs = 5000,
): Promise<any> { /* ... */ }

/**
 * Mock webhook receiver for testing outgoing webhooks.
 */
export class MockWebhookReceiver {
  async start(port: number): Promise<void> { /* ... */ }
  async stop(): Promise<void> { /* ... */ }
  async waitForRequest(timeoutMs: number): Promise<ReceivedRequest> { /* ... */ }
  failNextRequests(count: number): void { /* ... */ }
  get requestCount(): number { /* ... */ }
}
```

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 5 Complete — Webhook & Event Tests Generated

## Async Integration Points Tested
| Type | Source → Target | Tests | Priority |
|------|----------------|-------|----------|
| Incoming Webhook | Stripe → API | 7 | P0 |
| Outgoing Webhook | API → Customer | 4 | P1 |
| Message Queue | API → RabbitMQ → Worker | 8 | P0 |
| ... | ... | ... | ... |

## Generated Files
- specs/webhooks/stripe-webhook.test.ts
- specs/webhooks/outgoing-webhook.test.ts
- specs/messaging/order-events.messaging.test.ts
- helpers/async-helpers.ts

## N/A Items (if applicable)
- <list any async patterns not present in this project>

## Next Step: step-06-validate-and-summary.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: All async integration points have test files, webhook signature verification tested, idempotency tested for all consumers, dead letter queue behavior covered, proper wait strategies used (no sleep-based polling), async helpers created
### FAILURE: Async integrations exist but no tests generated, idempotency not tested, sleep-based polling used instead of event-driven waits, webhook signatures not verified
