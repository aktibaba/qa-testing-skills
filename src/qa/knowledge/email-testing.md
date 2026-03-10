# Email Testing

## Principle
Email testing uses local SMTP mock servers like MailHog or Mailtrap to capture, inspect, and assert on email content without sending real emails or depending on external mail services.

## Rationale
Email is a critical communication channel for user registration, password resets, order confirmations, and notifications. Yet email testing is often skipped because it seems complex: real SMTP servers are unreliable in CI environments, emails may be delayed, and inspecting email content programmatically requires parsing MIME structures.

Local SMTP mock servers solve these problems completely. MailHog runs as a Docker container, captures all outbound email, and provides an API to search and inspect messages. Tests can send a registration request, query MailHog for the resulting email, and verify the subject, body, links, and attachments -- all in milliseconds with zero network dependencies. This pattern enables testing the full email flow: template rendering, personalization, link generation, attachment inclusion, and delivery to the correct recipients. Without email testing, teams discover broken email templates, dead links, and missing personalizations only when users report them.

## Pattern Examples

### 1. MailHog Docker Setup and API Client

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      SMTP_HOST: mailhog
      SMTP_PORT: 1025
      SMTP_SECURE: "false"
      SMTP_USER: ""
      SMTP_PASS: ""
      EMAIL_FROM: "noreply@testapp.com"
    depends_on:
      - mailhog
      - db

  mailhog:
    image: mailhog/mailhog:v1.0.1
    ports:
      - "1025:1025"  # SMTP port
      - "8025:8025"  # Web UI and API port

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
```

```typescript
// tests/helpers/mailhog-client.ts
interface MailHogMessage {
  ID: string;
  From: { Relays: string[]; Mailbox: string; Domain: string };
  To: Array<{ Relays: string[]; Mailbox: string; Domain: string }>;
  Content: {
    Headers: Record<string, string[]>;
    Body: string;
    Size: number;
    MIME: {
      Parts: Array<{
        Headers: Record<string, string[]>;
        Body: string;
        Size: number;
      }>;
    } | null;
  };
  Created: string;
  Raw: { From: string; To: string[]; Data: string };
}

interface MailHogSearchResult {
  total: number;
  count: number;
  start: number;
  items: MailHogMessage[];
}

export class MailHogClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8025') {
    this.baseUrl = baseUrl;
  }

  async getAllMessages(): Promise<MailHogMessage[]> {
    const response = await fetch(`${this.baseUrl}/api/v2/messages`);
    const data: MailHogSearchResult = await response.json();
    return data.items;
  }

  async searchByRecipient(email: string): Promise<MailHogMessage[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v2/search?kind=to&query=${encodeURIComponent(email)}`,
    );
    const data: MailHogSearchResult = await response.json();
    return data.items;
  }

  async searchBySubject(subject: string): Promise<MailHogMessage[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v2/search?kind=containing&query=${encodeURIComponent(subject)}`,
    );
    const data: MailHogSearchResult = await response.json();
    return data.items.filter((msg) => {
      const msgSubject = msg.Content.Headers['Subject']?.[0] || '';
      return msgSubject.includes(subject);
    });
  }

  async deleteAllMessages(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages`, { method: 'DELETE' });
  }

  async deleteMessage(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages/${id}`, { method: 'DELETE' });
  }

  async waitForMessage(
    predicate: (msg: MailHogMessage) => boolean,
    timeoutMs: number = 10000,
    pollIntervalMs: number = 500,
  ): Promise<MailHogMessage> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const messages = await this.getAllMessages();
      const match = messages.find(predicate);
      if (match) return match;
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`No matching email found within ${timeoutMs}ms`);
  }

  async waitForMessageTo(
    recipient: string,
    timeoutMs: number = 10000,
  ): Promise<MailHogMessage> {
    return this.waitForMessage(
      (msg) => msg.To.some((to) => `${to.Mailbox}@${to.Domain}` === recipient),
      timeoutMs,
    );
  }

  getPlainTextBody(message: MailHogMessage): string {
    if (message.Content.MIME?.Parts) {
      const textPart = message.Content.MIME.Parts.find((p) =>
        p.Headers['Content-Type']?.[0]?.includes('text/plain'),
      );
      return textPart?.Body || message.Content.Body;
    }
    return message.Content.Body;
  }

  getHtmlBody(message: MailHogMessage): string {
    if (message.Content.MIME?.Parts) {
      const htmlPart = message.Content.MIME.Parts.find((p) =>
        p.Headers['Content-Type']?.[0]?.includes('text/html'),
      );
      return htmlPart?.Body || '';
    }
    return '';
  }

  extractLinks(html: string): string[] {
    const linkRegex = /href=["']([^"']+)["']/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      links.push(match[1]);
    }
    return links;
  }
}
```

### 2. Email Content Verification Tests

```typescript
// tests/email/registration-email.spec.ts
import { test, expect, beforeEach } from 'vitest';
import { MailHogClient } from '../helpers/mailhog-client';

const mailhog = new MailHogClient('http://localhost:8025');
const APP_URL = 'http://localhost:3000';

beforeEach(async () => {
  await mailhog.deleteAllMessages();
});

test('sends welcome email on user registration', async () => {
  const email = `test-${Date.now()}@example.com`;

  const response = await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'SecureP@ss123',
      firstName: 'Test',
      lastName: 'User',
    }),
  });
  expect(response.status).toBe(201);

  const message = await mailhog.waitForMessageTo(email, 5000);

  // Verify sender
  expect(`${message.From.Mailbox}@${message.From.Domain}`).toBe('noreply@testapp.com');

  // Verify subject
  const subject = message.Content.Headers['Subject']?.[0];
  expect(subject).toBe('Welcome to TestApp - Verify Your Email');

  // Verify HTML content
  const html = mailhog.getHtmlBody(message);
  expect(html).toContain('Test'); // first name personalization
  expect(html).toContain('Welcome');
  expect(html).not.toContain('{{');  // no unrendered template variables
  expect(html).not.toContain('undefined');

  // Verify verification link exists and is valid
  const links = mailhog.extractLinks(html);
  const verifyLink = links.find((l) => l.includes('/verify-email'));
  expect(verifyLink).toBeDefined();
  expect(verifyLink).toMatch(/token=[A-Za-z0-9\-_]+/);

  // Verify the link actually works
  const verifyResponse = await fetch(verifyLink!, { redirect: 'manual' });
  expect([200, 302]).toContain(verifyResponse.status);

  // Verify plain text alternative exists
  const plainText = mailhog.getPlainTextBody(message);
  expect(plainText).toContain('Welcome');
  expect(plainText).toContain('Test');
});

test('sends password reset email with expiring link', async () => {
  const email = 'existing-user@test.com';

  await fetch(`${APP_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const message = await mailhog.waitForMessageTo(email, 5000);

  const subject = message.Content.Headers['Subject']?.[0];
  expect(subject).toBe('Reset Your Password');

  const html = mailhog.getHtmlBody(message);
  const links = mailhog.extractLinks(html);
  const resetLink = links.find((l) => l.includes('/reset-password'));
  expect(resetLink).toBeDefined();

  // Verify link contains a token
  const url = new URL(resetLink!);
  const token = url.searchParams.get('token');
  expect(token).toBeTruthy();
  expect(token!.length).toBeGreaterThan(20);

  // Verify email mentions expiration
  expect(html).toMatch(/expire|valid for|24 hours/i);

  // Verify the reset token is valid via API
  const validateResponse = await fetch(`${APP_URL}/api/auth/validate-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  expect(validateResponse.status).toBe(200);
});

test('order confirmation email contains correct order details', async () => {
  const email = 'existing-user@test.com';

  // Create and pay for an order
  const orderResp = await fetch(`${APP_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-token' },
    body: JSON.stringify({
      items: [
        { productId: 'prod-100', quantity: 2 },
        { productId: 'prod-200', quantity: 1 },
      ],
    }),
  });
  const order = await orderResp.json();

  await fetch(`${APP_URL}/api/orders/${order.id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer user-token' },
    body: JSON.stringify({ paymentMethodId: 'pm_test' }),
  });

  const message = await mailhog.waitForMessage(
    (msg) => {
      const subj = msg.Content.Headers['Subject']?.[0] || '';
      return subj.includes('Order Confirmation') &&
        msg.To.some((to) => `${to.Mailbox}@${to.Domain}` === email);
    },
    5000,
  );

  const html = mailhog.getHtmlBody(message);

  // Verify order number is in the email
  expect(html).toContain(order.id);

  // Verify items are listed
  expect(html).toContain('Wireless Mouse');
  expect(html).toContain('USB-C Cable');

  // Verify quantities
  expect(html).toMatch(/Wireless Mouse.*?2/s);
  expect(html).toMatch(/USB-C Cable.*?1/s);

  // Verify total amount
  expect(html).toContain(order.total.toFixed(2));

  // Verify order tracking link
  const links = mailhog.extractLinks(html);
  const trackingLink = links.find((l) => l.includes('/orders/'));
  expect(trackingLink).toContain(order.id);
});

test('does not send email for non-existent user on password reset', async () => {
  await fetch(`${APP_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@example.com' }),
  });

  // Wait a bit and verify no email was sent
  await new Promise((r) => setTimeout(r, 2000));
  const messages = await mailhog.searchByRecipient('nonexistent@example.com');
  expect(messages).toHaveLength(0);
});
```

### 3. Email Deliverability and Compliance Checks

```typescript
// tests/email/compliance.spec.ts
import { test, expect, beforeEach } from 'vitest';
import { MailHogClient } from '../helpers/mailhog-client';

const mailhog = new MailHogClient('http://localhost:8025');
const APP_URL = 'http://localhost:3000';

beforeEach(async () => {
  await mailhog.deleteAllMessages();
});

test('all transactional emails have required headers', async () => {
  // Trigger several different email types
  const triggers = [
    fetch(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `header-test-1@example.com`, password: 'Pass123!', firstName: 'A', lastName: 'B' }),
    }),
    fetch(`${APP_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing-user@test.com' }),
    }),
  ];

  await Promise.all(triggers);
  await new Promise((r) => setTimeout(r, 3000));

  const messages = await mailhog.getAllMessages();
  expect(messages.length).toBeGreaterThan(0);

  for (const msg of messages) {
    const headers = msg.Content.Headers;

    // Required headers
    expect(headers['From'], 'From header is required').toBeDefined();
    expect(headers['Subject'], 'Subject header is required').toBeDefined();
    expect(headers['Content-Type'], 'Content-Type is required').toBeDefined();

    // CAN-SPAM compliance: must have physical address or unsubscribe
    const html = mailhog.getHtmlBody(msg);
    const plainText = mailhog.getPlainTextBody(msg);
    const fullContent = html + plainText;

    // Transactional emails don't require unsubscribe, but should have company info
    expect(fullContent).toMatch(/testapp|TestApp/i);

    // No empty subjects
    const subject = headers['Subject']?.[0] || '';
    expect(subject.trim().length).toBeGreaterThan(0);

    // MIME multipart should have both text and HTML parts
    if (msg.Content.MIME?.Parts) {
      const contentTypes = msg.Content.MIME.Parts.map(
        (p) => p.Headers['Content-Type']?.[0] || '',
      );
      expect(
        contentTypes.some((ct) => ct.includes('text/plain')),
        'Email should have a plain text part',
      ).toBe(true);
      expect(
        contentTypes.some((ct) => ct.includes('text/html')),
        'Email should have an HTML part',
      ).toBe(true);
    }
  }
});

test('email links use HTTPS in production config', async () => {
  // This test would run against a staging environment with production-like config
  const email = `link-test-${Date.now()}@example.com`;

  await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Pass123!', firstName: 'Link', lastName: 'Test' }),
  });

  const message = await mailhog.waitForMessageTo(email, 5000);
  const html = mailhog.getHtmlBody(message);
  const links = mailhog.extractLinks(html);

  const appLinks = links.filter((l) =>
    !l.startsWith('mailto:') && !l.startsWith('#') && !l.startsWith('tel:'),
  );

  for (const link of appLinks) {
    // In CI/test environments we allow http://localhost
    if (!link.includes('localhost')) {
      expect(link, `Link should use HTTPS: ${link}`).toMatch(/^https:\/\//);
    }
  }
});

test('email rendering handles special characters correctly', async () => {
  const email = `special-${Date.now()}@example.com`;

  await fetch(`${APP_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Pass123!',
      firstName: "O'Brien",
      lastName: 'Müller-Schmidt',
    }),
  });

  const message = await mailhog.waitForMessageTo(email, 5000);
  const html = mailhog.getHtmlBody(message);

  // Names with special characters should render correctly (HTML-encoded is also acceptable)
  expect(html).toMatch(/O'Brien|O&#39;Brien|O&apos;Brien/);
  expect(html).toMatch(/Müller-Schmidt|M&uuml;ller-Schmidt/);

  // Should not have double-encoded entities
  expect(html).not.toContain('&amp;#39;');
  expect(html).not.toContain('&amp;uuml;');
});
```
