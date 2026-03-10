# Webhook Testing

## Principle
Webhook testing requires mock receivers, deterministic retry verification, payload validation, and asynchronous event assertion to ensure reliable event-driven integrations.

## Rationale
Webhooks invert the typical request-response pattern: instead of the client polling for updates, the server pushes events to a client-provided URL. This introduces unique testing challenges. The delivery is asynchronous and may be delayed. Network failures trigger retries, which must be idempotent. Payloads must match a documented schema. Signatures must be verified to prevent spoofing.

Testing webhooks requires both sides: testing outbound webhooks (your application sends events to external systems) and testing inbound webhooks (your application receives events from external services like Stripe or GitHub). For outbound testing, you need a mock receiver that captures delivered payloads and allows assertions. For inbound testing, you need to simulate the external service sending properly signed payloads to your endpoint. Retry behavior, timeout handling, and out-of-order delivery must all be tested to build confidence in production reliability.

## Pattern Examples

### 1. Mock Webhook Receiver for Outbound Testing

```typescript
// tests/helpers/webhook-receiver.ts
import http from 'http';
import { EventEmitter } from 'events';

interface ReceivedWebhook {
  timestamp: number;
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  rawBody: string;
}

export class MockWebhookReceiver extends EventEmitter {
  private server: http.Server;
  private receivedWebhooks: ReceivedWebhook[] = [];
  private port: number = 0;
  private responseStatus: number = 200;
  private responseDelay: number = 0;
  private failNextN: number = 0;

  constructor() {
    super();
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }

    const rawBody = Buffer.concat(chunks).toString('utf-8');
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }

    const webhook: ReceivedWebhook = {
      timestamp: Date.now(),
      method: req.method || 'POST',
      path: req.url || '/',
      headers: req.headers as Record<string, string | string[] | undefined>,
      body,
      rawBody,
    };

    this.receivedWebhooks.push(webhook);
    this.emit('webhook', webhook);

    if (this.responseDelay > 0) {
      await new Promise((r) => setTimeout(r, this.responseDelay));
    }

    if (this.failNextN > 0) {
      this.failNextN--;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Simulated failure' }));
      return;
    }

    res.writeHead(this.responseStatus, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true }));
  }

  async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server.listen(0, () => {
        const address = this.server.address();
        this.port = typeof address === 'object' && address ? address.port : 0;
        resolve(`http://localhost:${this.port}`);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  setResponseStatus(status: number): void {
    this.responseStatus = status;
  }

  setResponseDelay(ms: number): void {
    this.responseDelay = ms;
  }

  failNext(count: number): void {
    this.failNextN = count;
  }

  getReceivedWebhooks(): ReceivedWebhook[] {
    return [...this.receivedWebhooks];
  }

  getLastWebhook(): ReceivedWebhook | undefined {
    return this.receivedWebhooks[this.receivedWebhooks.length - 1];
  }

  clear(): void {
    this.receivedWebhooks = [];
  }

  waitForWebhook(timeoutMs: number = 5000): Promise<ReceivedWebhook> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`No webhook received within ${timeoutMs}ms`));
      }, timeoutMs);

      this.once('webhook', (webhook: ReceivedWebhook) => {
        clearTimeout(timeout);
        resolve(webhook);
      });
    });
  }

  waitForWebhooks(count: number, timeoutMs: number = 10000): Promise<ReceivedWebhook[]> {
    return new Promise((resolve, reject) => {
      const collected: ReceivedWebhook[] = [];
      const timeout = setTimeout(() => {
        reject(
          new Error(`Only received ${collected.length}/${count} webhooks within ${timeoutMs}ms`),
        );
      }, timeoutMs);

      const handler = (webhook: ReceivedWebhook) => {
        collected.push(webhook);
        if (collected.length >= count) {
          clearTimeout(timeout);
          this.removeListener('webhook', handler);
          resolve(collected);
        }
      };

      this.on('webhook', handler);
    });
  }
}

// tests/webhooks/outbound-webhooks.spec.ts
import { test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockWebhookReceiver } from '../helpers/webhook-receiver';

let receiver: MockWebhookReceiver;
let receiverUrl: string;

beforeAll(async () => {
  receiver = new MockWebhookReceiver();
  receiverUrl = await receiver.start();

  // Register webhook endpoint with the application
  await fetch('http://localhost:3000/api/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify({
      url: `${receiverUrl}/events`,
      events: ['order.created', 'order.updated', 'order.cancelled'],
      secret: 'webhook-signing-secret',
    }),
  });
});

afterAll(async () => {
  await receiver.stop();
});

beforeEach(() => {
  receiver.clear();
});

test('sends webhook on order creation', async () => {
  const webhookPromise = receiver.waitForWebhook(5000);

  // Trigger the event
  const orderResponse = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer user-token',
    },
    body: JSON.stringify({
      items: [{ productId: 'prod-100', quantity: 1 }],
    }),
  });

  expect(orderResponse.status).toBe(201);
  const order = await orderResponse.json();

  const webhook = await webhookPromise;

  // Validate payload structure
  expect(webhook.body.event).toBe('order.created');
  expect(webhook.body.data.id).toBe(order.id);
  expect(webhook.body.data.items).toHaveLength(1);
  expect(webhook.body.timestamp).toBeDefined();

  // Validate headers
  expect(webhook.headers['content-type']).toBe('application/json');
  expect(webhook.headers['x-webhook-signature']).toBeDefined();
  expect(webhook.headers['x-webhook-id']).toBeDefined();
});

test('retries on receiver failure with exponential backoff', async () => {
  // First 2 attempts will fail, third will succeed
  receiver.failNext(2);

  const webhooksPromise = receiver.waitForWebhooks(3, 30000);

  await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer user-token',
    },
    body: JSON.stringify({
      items: [{ productId: 'prod-100', quantity: 1 }],
    }),
  });

  const webhooks = await webhooksPromise;

  expect(webhooks).toHaveLength(3);

  // Verify retry timing (exponential backoff)
  const intervals = [];
  for (let i = 1; i < webhooks.length; i++) {
    intervals.push(webhooks[i].timestamp - webhooks[i - 1].timestamp);
  }

  // Second retry should be longer than first
  expect(intervals[1]).toBeGreaterThan(intervals[0]);

  // All three should have the same webhook ID (same delivery attempt)
  const webhookIds = webhooks.map((w) => w.headers['x-webhook-id']);
  expect(new Set(webhookIds).size).toBe(1);
}, 35000);

test('validates webhook signature', async () => {
  const webhookPromise = receiver.waitForWebhook(5000);

  await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer user-token',
    },
    body: JSON.stringify({
      items: [{ productId: 'prod-100', quantity: 1 }],
    }),
  });

  const webhook = await webhookPromise;
  const signature = webhook.headers['x-webhook-signature'] as string;
  expect(signature).toBeTruthy();

  // Verify HMAC signature
  const crypto = await import('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', 'webhook-signing-secret')
    .update(webhook.rawBody)
    .digest('hex');

  expect(signature).toBe(`sha256=${expectedSignature}`);
});
```

### 2. Inbound Webhook Testing (Receiving External Events)

```typescript
// tests/webhooks/inbound-stripe.spec.ts
import { test, expect } from 'vitest';
import crypto from 'crypto';

const APP_URL = 'http://localhost:3000';
const STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_key';

function generateStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function sendStripeWebhook(eventType: string, data: any): Promise<Response> {
  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: eventType,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    api_version: '2024-06-20',
  });

  const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET);

  return fetch(`${APP_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: payload,
  });
}

test('processes payment_intent.succeeded event', async () => {
  const response = await sendStripeWebhook('payment_intent.succeeded', {
    id: 'pi_test_123',
    amount: 2999,
    currency: 'usd',
    status: 'succeeded',
    metadata: { order_id: 'ord-webhook-test-001' },
  });

  expect(response.status).toBe(200);

  // Verify the order was updated
  const orderResponse = await fetch(`${APP_URL}/api/orders/ord-webhook-test-001`, {
    headers: { Authorization: 'Bearer admin-token' },
  });

  const order = await orderResponse.json();
  expect(order.paymentStatus).toBe('paid');
  expect(order.status).toBe('processing');
});

test('rejects webhook with invalid signature', async () => {
  const payload = JSON.stringify({
    id: 'evt_fake',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_fake' } },
  });

  const response = await fetch(`${APP_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': 't=12345,v1=invalid_signature',
    },
    body: payload,
  });

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toContain('signature');
});

test('handles duplicate event delivery idempotently', async () => {
  const eventId = `evt_idempotent_${Date.now()}`;
  const payload = JSON.stringify({
    id: eventId,
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_dup_test',
        amount: 1500,
        currency: 'usd',
        status: 'succeeded',
        metadata: { order_id: 'ord-dup-test' },
      },
    },
    created: Math.floor(Date.now() / 1000),
  });

  const signature = generateStripeSignature(payload, STRIPE_WEBHOOK_SECRET);
  const headers = {
    'Content-Type': 'application/json',
    'Stripe-Signature': signature,
  };

  // Send the same event twice
  const first = await fetch(`${APP_URL}/api/webhooks/stripe`, { method: 'POST', headers, body: payload });
  const second = await fetch(`${APP_URL}/api/webhooks/stripe`, { method: 'POST', headers, body: payload });

  expect(first.status).toBe(200);
  expect(second.status).toBe(200); // Should succeed but not double-process

  // Verify order was only updated once
  const events = await fetch(`${APP_URL}/api/orders/ord-dup-test/events`, {
    headers: { Authorization: 'Bearer admin-token' },
  });
  const eventLog = await events.json();
  const paymentEvents = eventLog.filter((e: any) => e.type === 'payment.received');
  expect(paymentEvents).toHaveLength(1);
});

test('responds within timeout to prevent retries', async () => {
  const start = Date.now();

  const response = await sendStripeWebhook('charge.refunded', {
    id: 'ch_refund_test',
    amount_refunded: 1000,
    currency: 'usd',
    metadata: { order_id: 'ord-refund-test' },
  });

  const elapsed = Date.now() - start;
  expect(response.status).toBe(200);
  expect(elapsed).toBeLessThan(5000); // Must respond within 5s to avoid Stripe retry
});
```

### 3. Async Event Flow Testing

```typescript
// tests/webhooks/event-flow.spec.ts
import { test, expect } from 'vitest';
import { MockWebhookReceiver } from '../helpers/webhook-receiver';

test('complete order lifecycle emits correct webhook sequence', async () => {
  const receiver = new MockWebhookReceiver();
  const url = await receiver.start();

  // Register for all order events
  await fetch('http://localhost:3000/api/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
    body: JSON.stringify({
      url: `${url}/events`,
      events: ['order.created', 'order.paid', 'order.shipped', 'order.delivered'],
      secret: 'test-secret',
    }),
  });

  const allWebhooks = receiver.waitForWebhooks(4, 30000);

  // Step 1: Create order
  const createResp = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-token' },
    body: JSON.stringify({ items: [{ productId: 'prod-100', quantity: 1 }] }),
  });
  const order = await createResp.json();

  // Step 2: Pay for order
  await fetch(`http://localhost:3000/api/orders/${order.id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-token' },
    body: JSON.stringify({ paymentMethodId: 'pm_test' }),
  });

  // Step 3: Ship order
  await fetch(`http://localhost:3000/api/orders/${order.id}/ship`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
    body: JSON.stringify({ trackingNumber: 'TRACK-123', carrier: 'ups' }),
  });

  // Step 4: Mark delivered
  await fetch(`http://localhost:3000/api/orders/${order.id}/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
  });

  const webhooks = await allWebhooks;

  // Verify correct event sequence
  const eventTypes = webhooks.map((w) => w.body.event);
  expect(eventTypes).toEqual([
    'order.created',
    'order.paid',
    'order.shipped',
    'order.delivered',
  ]);

  // Verify each event has consistent order ID
  for (const webhook of webhooks) {
    expect(webhook.body.data.id).toBe(order.id);
  }

  // Verify shipped event includes tracking info
  const shippedEvent = webhooks.find((w) => w.body.event === 'order.shipped');
  expect(shippedEvent?.body.data.trackingNumber).toBe('TRACK-123');
  expect(shippedEvent?.body.data.carrier).toBe('ups');

  await receiver.stop();
}, 35000);
```
