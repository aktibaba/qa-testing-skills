# QA Integration Testing Skill: Test How Your Services Actually Talk to Each Other

**Unit tests pass. Production breaks. Integration tests prevent that.**

---

## The Problem

Your microservice calls the database, which triggers a webhook, which sends a message to a queue, which updates another service. Each piece works in isolation. Together? That's where bugs hide.

Integration tests are hard to write because they need real databases, real queues, and real service interactions. Most teams skip them entirely.

## What qa-int Does

The `qa-int` skill turns any AI agent into an integration testing architect that maps your service dependencies and generates tests for every interaction point — with real databases via Docker and smart mocking for external APIs.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Dependency Mapping
The agent scans your architecture and identifies:
- Service-to-service communication (REST, gRPC, GraphQL)
- Database connections (SQL, NoSQL, Redis)
- Message queues (RabbitMQ, Kafka, SQS)
- External API dependencies (Stripe, Twilio, etc.)
- Webhooks and event-driven flows

### Step 2 — Strategy: Real vs. Mocked

| Dependency | Strategy | Why |
|------------|----------|-----|
| Your database | **Real** (Docker) | Must test actual queries |
| Your Redis cache | **Real** (Docker) | Must test actual caching |
| Stripe API | **Mocked** (Contract) | Can't hit real payment API in tests |
| Partner webhook | **Mocked** | Can't trigger real external events |
| Your other microservice | **Real or mocked** | Depends on CI setup |

### Step 3 — You Approve the Plan
Full visibility before any code is generated. Adjust what's real vs. mocked based on your CI environment.

### Step 4 — Docker Test Environment
Real services spun up automatically:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    tmpfs: /var/lib/postgresql/data   # Fast, disposable
  redis:
    image: redis:7-alpine
  rabbitmq:
    image: rabbitmq:3-alpine
```

Or using Testcontainers for programmatic control.

### Step 5 — Test Generation
Tests cover every integration point:

**Database CRUD:**
```javascript
it('creates user and retrieves by email', async () => {
  await userRepo.create({ email: 'test@example.com', name: 'Test' });
  const found = await userRepo.findByEmail('test@example.com');
  expect(found.name).toBe('Test');
});
```

**Service-to-Service:**
- Request/response validation
- Timeout and retry behavior
- Circuit breaker activation

**Webhooks & Events:**
- Signature verification
- Idempotency (same event delivered twice)
- Payload validation

**Contract Testing:**
- Mock external APIs with recorded contracts
- Verify your code handles their responses correctly
- Detect breaking changes early

### Step 6 — Coverage Report

```
Integration Point     | CRUD | Error | Timeout | Contract
PostgreSQL            |  ✓   |   ✓   |    ✓    |    —
Redis Cache           |  ✓   |   ✓   |    ✓    |    —
Stripe API (mocked)   |  ✓   |   ✓   |    ✓    |    ✓
RabbitMQ Events       |  ✓   |   ✓   |    ✓    |    —
Webhook Receiver      |  ✓   |   ✓   |    —    |    ✓
```

## Key Features

- **Real databases via Docker** — no more "it works on my machine"
- **Transaction rollback** — each test cleans up after itself
- **Dead letter queue testing** — what happens when message processing fails?
- **Error propagation** — if Service A fails, does Service B handle it correctly?
- **Contract mocking** — external APIs mocked with realistic response contracts
- **Idempotency testing** — same request twice shouldn't create duplicate data

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-int` prompt with your AI agent. Find the bugs that unit tests miss.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
