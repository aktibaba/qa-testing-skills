---
name: 'step-04-generate-tests'
description: 'Generate integration tests for API contracts, database interactions, and service communications'
nextStepFile: './step-05-webhook-event-tests.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 4: Generate Tests — Integration Test Files

## STEP GOAL
Generate complete, runnable integration test files for all P0 and P1 integration points. Tests cover API contract validation, database interactions, service-to-service communication, and error propagation across boundaries.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Generate ALL P0 tests before P1 tests
- Every test must use the helpers and mocks from Step 3
- Every test must be independent — no shared mutable state between tests
- Each test file must have a header comment identifying the integration boundary

## CONTEXT BOUNDARIES
- Available context: strategy from Step 2, environment from Step 3
- Required knowledge fragments: `contract-testing` (13), `database-testing` (22), `mock-stub-spy` (34), `test-isolation` (07), `error-handling-testing` (35)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 4.1 — Generate API Contract Tests

For each API endpoint involved in P0 integration points, generate contract validation tests:

**File naming:** `specs/api/<endpoint-group>.contract.test.ts`

**Required test structure:**
```typescript
/**
 * Integration Test: <Service> API Contract
 *
 * Validates the request/response contract for <endpoint group>.
 * Integration boundary: <consumer> → <provider>
 * Priority: P0
 */

import { setupTestEnvironment, teardownTestEnvironment } from '../helpers/test-lifecycle';

describe('<Endpoint Group> API Contract', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('POST /api/resource', () => {
    test('should accept valid payload and return 201 with created resource', async () => {
      const payload = { /* valid data from factory */ };
      const response = await request(app).post('/api/resource').send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        ...payload,
        createdAt: expect.any(String),
      });
    });

    test('should reject invalid payload with 400 and validation errors', async () => {
      const payload = { /* invalid data */ };
      const response = await request(app).post('/api/resource').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'email', message: expect.any(String) })
      );
    });

    test('should reject unauthenticated request with 401', async () => {
      const response = await request(app)
        .post('/api/resource')
        .send({ /* valid data */ });
      // No auth header

      expect(response.status).toBe(401);
    });

    test('should return correct content-type header', async () => {
      const response = await authenticatedRequest('POST', '/api/resource', { /* data */ });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /api/resource/:id', () => {
    test('should return resource by ID with correct schema', async () => {
      // Arrange: seed a resource
      const created = await seedResource();

      // Act
      const response = await authenticatedRequest('GET', `/api/resource/${created.id}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.id,
        name: created.name,
        // ... all expected fields
      });
    });

    test('should return 404 for non-existent resource', async () => {
      const response = await authenticatedRequest('GET', '/api/resource/non-existent-id');
      expect(response.status).toBe(404);
    });
  });
});
```

### 4.2 — Generate Database Integration Tests

For each service-to-database integration point, test data persistence and retrieval:

**File naming:** `specs/db/<entity-name>.db.test.ts`

**Required scenarios:**
```typescript
/**
 * Integration Test: <Entity> Database Operations
 *
 * Validates CRUD operations and data integrity for <entity>.
 * Integration boundary: <service> → <database>
 * Priority: P0
 */

describe('<Entity> Database Integration', () => {
  beforeEach(async () => {
    await truncateTable('entities');
    await seedBaseData();
  });

  describe('Create', () => {
    test('should persist entity with all fields', async () => {
      const entity = createTestEntity();
      const result = await repository.create(entity);

      const dbRecord = await queryDb('SELECT * FROM entities WHERE id = $1', [result.id]);
      expect(dbRecord).toMatchObject(entity);
    });

    test('should enforce unique constraints', async () => {
      const entity = createTestEntity({ email: 'unique@test.com' });
      await repository.create(entity);

      await expect(repository.create(entity)).rejects.toThrow(/unique/i);
    });

    test('should enforce not-null constraints', async () => {
      const entity = createTestEntity({ name: null });
      await expect(repository.create(entity)).rejects.toThrow();
    });
  });

  describe('Read', () => {
    test('should retrieve entity with all fields intact', async () => { /* ... */ });
    test('should return null for non-existent ID', async () => { /* ... */ });
    test('should support pagination with correct total count', async () => { /* ... */ });
    test('should support filtering by indexed fields', async () => { /* ... */ });
  });

  describe('Update', () => {
    test('should update only specified fields', async () => { /* ... */ });
    test('should update timestamp on modification', async () => { /* ... */ });
    test('should handle concurrent updates without data loss', async () => { /* ... */ });
  });

  describe('Delete', () => {
    test('should remove entity from database', async () => { /* ... */ });
    test('should handle cascade deletes correctly', async () => { /* ... */ });
    test('should return not-found for already-deleted entity', async () => { /* ... */ });
  });

  describe('Data Integrity', () => {
    test('should handle Unicode characters in text fields', async () => {
      const entity = createTestEntity({ name: 'Tester' });
      const result = await repository.create(entity);
      const retrieved = await repository.findById(result.id);
      expect(retrieved.name).toBe('Tester');
    });

    test('should handle maximum field lengths', async () => {
      const entity = createTestEntity({ name: 'A'.repeat(255) });
      const result = await repository.create(entity);
      expect(result.name).toHaveLength(255);
    });

    test('should handle empty string vs null', async () => { /* ... */ });
  });
});
```

### 4.3 — Generate Service-to-Service Integration Tests

For internal service-to-service communication points:

**File naming:** `specs/services/<consumer>-<provider>.integration.test.ts`

```typescript
/**
 * Integration Test: <Consumer> → <Provider> Service Communication
 *
 * Validates HTTP communication between <consumer> and <provider>.
 * Integration boundary: <consumer> → <provider>
 * Priority: P0
 */

describe('<Consumer> → <Provider> Integration', () => {
  describe('Happy Path', () => {
    test('should successfully call provider and process response', async () => { /* ... */ });
    test('should pass correct authentication headers', async () => { /* ... */ });
    test('should handle paginated responses from provider', async () => { /* ... */ });
  });

  describe('Error Propagation', () => {
    test('should handle provider returning 400 with meaningful error', async () => {
      // Mock provider to return 400
      mockProviderError(400, { error: 'Invalid request' });

      const result = await consumer.callProvider(invalidPayload);

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid request');
    });

    test('should handle provider timeout gracefully', async () => {
      // Mock provider to delay beyond timeout
      mockProviderDelay(35000); // 35s delay

      await expect(consumer.callProvider(validPayload))
        .rejects.toThrow(/timeout/i);
    });

    test('should handle provider 500 and not corrupt local state', async () => {
      const stateBefore = await getLocalState();
      mockProviderError(500, { error: 'Internal error' });

      try {
        await consumer.callProvider(validPayload);
      } catch { /* expected */ }

      const stateAfter = await getLocalState();
      expect(stateAfter).toEqual(stateBefore); // No mutation on failure
    });
  });

  describe('Data Transformation', () => {
    test('should correctly transform provider response to internal format', async () => { /* ... */ });
    test('should handle missing optional fields in provider response', async () => { /* ... */ });
  });
});
```

### 4.4 — Generate External Service Mock Tests

For each external service (tested via mocks), verify the integration code handles mock responses correctly:

**File naming:** `specs/external/<service-name>.external.test.ts`

```typescript
/**
 * Integration Test: <Service Name> External Integration
 *
 * Tests integration with <external service> using mock responses.
 * Integration boundary: Application → <External Service> (mocked)
 * Priority: P0/P1
 */

describe('<External Service> Integration', () => {
  afterEach(() => {
    nock.cleanAll(); // or equivalent mock cleanup
  });

  test('should handle successful response', async () => {
    mockStripeCharge(1999, 'succeeded');
    const result = await paymentService.charge(1999, 'usd', 'tok_visa');
    expect(result.status).toBe('succeeded');
    expect(result.amount).toBe(1999);
  });

  test('should handle card declined error', async () => {
    mockStripeChargeFailure();
    await expect(paymentService.charge(1999, 'usd', 'tok_declined'))
      .rejects.toThrow(/card declined/i);
  });

  test('should handle rate limiting (429)', async () => {
    mockStripeRateLimit();
    // Should retry and eventually succeed or fail gracefully
  });

  test('should handle network error', async () => {
    nock('https://api.stripe.com').post('/v1/charges').replyWithError('ECONNREFUSED');
    await expect(paymentService.charge(1999, 'usd', 'tok_visa'))
      .rejects.toThrow(/connection/i);
  });
});
```

### 4.5 — Verify Test Independence

Review all generated tests and confirm:
- No test reads data created by another test
- `beforeEach` blocks reset state (truncate, re-seed)
- No hardcoded IDs that could collide between parallel runs
- All external mocks are cleaned up in `afterEach`
- Tests can run in any order with `--randomize` flag

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 4 Complete — Integration Tests Generated

## Generated Test Files
| File | Boundary | Tests | Priority |
|------|----------|-------|----------|
| specs/api/users.contract.test.ts | API → Consumer | 8 | P0 |
| specs/db/users.db.test.ts | Service → PostgreSQL | 12 | P0 |
| specs/services/api-auth.integration.test.ts | API → Auth | 6 | P0 |
| specs/external/stripe.external.test.ts | App → Stripe | 5 | P0 |
| ... | ... | ... | ... |

## Total: <N> test files, <M> individual tests

## Test Categories
- API Contract: <N> tests
- Database: <N> tests
- Service-to-Service: <N> tests
- External Mocks: <N> tests

## Next Step: step-05-webhook-event-tests.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: All P0 integration points have test files with happy path + error propagation tests, database tests include CRUD + integrity checks, external services tested via mocks with failure scenarios, all tests are independent
### FAILURE: P0 integration points missing tests, no error propagation tests, database tests cover only happy path, tests share mutable state
