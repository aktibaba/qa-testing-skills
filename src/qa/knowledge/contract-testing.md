# Consumer-Driven Contract Testing

## Principle
Consumer-driven contract testing ensures that services communicate correctly by having consumers define the interactions they expect, then verifying that providers honor those contracts.

## Rationale
In microservice architectures, integration testing between services is expensive and fragile. Spinning up all dependent services for every test run leads to slow pipelines and flaky failures caused by environment issues rather than real bugs. End-to-end tests across service boundaries suffer from combinatorial explosion as the number of services grows.

Contract testing solves this by decoupling consumer and provider testing. The consumer writes a test describing what it expects from the provider (the contract), and the provider independently verifies it can fulfill that contract. If a provider change would break a consumer, the provider's verification step catches it before deployment. Pact is the most widely adopted framework for this pattern, providing a broker to manage contract versions, track verification status, and enable deployment safety checks via the "can-i-deploy" tool.

## Pattern Examples

### 1. Consumer-Side Pact Test (JavaScript)

```typescript
// consumer/tests/contract/user-service.consumer.pact.spec.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { UserApiClient } from '../../src/clients/user-api-client';

const { like, eachLike, regex, integer, string, timestamp, boolean } = MatchersV3;

const provider = new PactV4({
  consumer: 'OrderService',
  provider: 'UserService',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'warn',
});

describe('User Service Contract', () => {
  describe('GET /api/users/:id', () => {
    it('returns a user when the user exists', async () => {
      await provider
        .addInteraction()
        .given('a user with ID user-001 exists')
        .uponReceiving('a request for user user-001')
        .withRequest('GET', '/api/users/user-001', (builder) => {
          builder.headers({
            Accept: 'application/json',
            Authorization: regex(/^Bearer .+$/, 'Bearer valid-token'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            id: string('user-001'),
            email: regex(/^.+@.+\..+$/, 'jane@example.com'),
            firstName: string('Jane'),
            lastName: string('Doe'),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", '2025-01-15T10:30:00.000Z'),
            isActive: boolean(true),
            roles: eachLike({
              id: string('role-admin'),
              name: string('admin'),
            }),
            address: like({
              street: string('123 Main St'),
              city: string('Portland'),
              state: string('OR'),
              zip: regex(/^\d{5}$/, '97201'),
            }),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url, 'valid-token');
          const user = await client.getUserById('user-001');

          expect(user.id).toBe('user-001');
          expect(user.email).toContain('@');
          expect(user.firstName).toBeTruthy();
          expect(user.roles.length).toBeGreaterThan(0);
          expect(user.address.zip).toMatch(/^\d{5}$/);
        });
    });

    it('returns 404 when user does not exist', async () => {
      await provider
        .addInteraction()
        .given('no user with ID user-999 exists')
        .uponReceiving('a request for non-existent user user-999')
        .withRequest('GET', '/api/users/user-999', (builder) => {
          builder.headers({
            Accept: 'application/json',
            Authorization: regex(/^Bearer .+$/, 'Bearer valid-token'),
          });
        })
        .willRespondWith(404, (builder) => {
          builder.jsonBody({
            error: string('USER_NOT_FOUND'),
            message: string('User with ID user-999 was not found'),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url, 'valid-token');
          await expect(client.getUserById('user-999')).rejects.toThrow('User with ID user-999 was not found');
        });
    });
  });

  describe('POST /api/users', () => {
    it('creates a new user with valid data', async () => {
      await provider
        .addInteraction()
        .given('the email newuser@example.com is not taken')
        .uponReceiving('a request to create a new user')
        .withRequest('POST', '/api/users', (builder) => {
          builder.headers({
            'Content-Type': 'application/json',
            Authorization: regex(/^Bearer .+$/, 'Bearer admin-token'),
          });
          builder.jsonBody({
            email: string('newuser@example.com'),
            firstName: string('New'),
            lastName: string('User'),
            roles: eachLike(string('viewer')),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({
            'Content-Type': 'application/json',
            Location: regex(/^\/api\/users\/user-.+$/, '/api/users/user-new-001'),
          });
          builder.jsonBody({
            id: regex(/^user-.+$/, 'user-new-001'),
            email: string('newuser@example.com'),
            firstName: string('New'),
            lastName: string('User'),
            isActive: boolean(true),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", '2025-06-01T08:00:00.000Z'),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url, 'admin-token');
          const created = await client.createUser({
            email: 'newuser@example.com',
            firstName: 'New',
            lastName: 'User',
            roles: ['viewer'],
          });

          expect(created.id).toMatch(/^user-.+$/);
          expect(created.email).toBe('newuser@example.com');
          expect(created.isActive).toBe(true);
        });
    });
  });
});
```

### 2. Provider-Side Verification

```typescript
// provider/tests/contract/user-service.provider.pact.spec.ts
import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { app } from '../../src/app';
import { db } from '../../src/database';
import http from 'http';

let server: http.Server;
let serverPort: number;

beforeAll(async () => {
  await db.migrate.latest();

  server = app.listen(0);
  const address = server.address();
  serverPort = typeof address === 'object' && address ? address.port : 3000;
});

afterAll(async () => {
  server.close();
  await db.destroy();
});

describe('UserService Provider Verification', () => {
  it('fulfills all consumer contracts', async () => {
    const opts = {
      providerBaseUrl: `http://localhost:${serverPort}`,
      provider: 'UserService',

      // Option A: Load pacts from broker
      pactBrokerUrl: process.env.PACT_BROKER_URL || 'http://localhost:9292',
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_SHA || '0.0.0-local',
      providerVersionBranch: process.env.GIT_BRANCH || 'local',

      // Option B: Load pacts from local files (for development)
      // pactUrls: [path.resolve(process.cwd(), '../consumer/pacts/OrderService-UserService.json')],

      consumerVersionSelectors: [
        { mainBranch: true },
        { deployedOrReleased: true },
      ],

      stateHandlers: {
        'a user with ID user-001 exists': async () => {
          await db('users').delete();
          await db('users').insert({
            id: 'user-001',
            email: 'jane@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            is_active: true,
            created_at: '2025-01-15T10:30:00.000Z',
          });
          await db('user_roles').insert({
            user_id: 'user-001',
            role_id: 'role-admin',
            role_name: 'admin',
          });
          await db('user_addresses').insert({
            user_id: 'user-001',
            street: '123 Main St',
            city: 'Portland',
            state: 'OR',
            zip: '97201',
          });
        },

        'no user with ID user-999 exists': async () => {
          await db('users').where('id', 'user-999').delete();
        },

        'the email newuser@example.com is not taken': async () => {
          await db('users').where('email', 'newuser@example.com').delete();
        },
      },

      requestFilter: (req: any, _res: any, next: () => void) => {
        // Inject a valid auth token for provider verification
        if (!req.headers.authorization) {
          req.headers.authorization = 'Bearer test-provider-verification-token';
        }
        next();
      },

      enablePending: true,
      includeWipPactsSince: '2025-01-01',

      logLevel: 'info',
    };

    await new Verifier(opts).verifyProvider();
  });
});
```

### 3. Pact Broker Setup and CI Integration

```yaml
# docker-compose.pact-broker.yml
version: '3.8'
services:
  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgres://pact:pact@pact-db/pact
      PACT_BROKER_BASIC_AUTH_USERNAME: admin
      PACT_BROKER_BASIC_AUTH_PASSWORD: admin
      PACT_BROKER_ALLOW_PUBLIC_READ: "true"
      PACT_BROKER_WEBHOOK_SCHEME_WHITELIST: https http
    depends_on:
      pact-db:
        condition: service_healthy

  pact-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact
      POSTGRES_DB: pact
    volumes:
      - pact-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pact"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pact-db-data:
```

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
  PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        consumer: [order-service, billing-service, notification-service]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: cd services/${{ matrix.consumer }} && npm ci
      - run: cd services/${{ matrix.consumer }} && npm run test:contract:consumer

      - name: Publish pacts to broker
        run: |
          cd services/${{ matrix.consumer }}
          npx pact-broker publish ./pacts \
            --consumer-app-version="${{ github.sha }}" \
            --branch="${{ github.head_ref || github.ref_name }}" \
            --broker-base-url="${PACT_BROKER_URL}" \
            --broker-token="${PACT_BROKER_TOKEN}" \
            --tag-with-git-branch

  provider-verification:
    runs-on: ubuntu-latest
    needs: consumer-tests
    strategy:
      matrix:
        provider: [user-service, product-service, payment-service]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: cd services/${{ matrix.provider }} && npm ci
      - name: Verify provider contracts
        run: cd services/${{ matrix.provider }} && npm run test:contract:provider
        env:
          CI: 'true'
          GIT_SHA: ${{ github.sha }}
          GIT_BRANCH: ${{ github.head_ref || github.ref_name }}

  can-i-deploy:
    runs-on: ubuntu-latest
    needs: [consumer-tests, provider-verification]
    if: github.event_name == 'pull_request'
    steps:
      - name: Check deployment safety
        run: |
          npx @pact-foundation/pact-cli can-i-deploy \
            --pacticipant="OrderService" \
            --version="${{ github.sha }}" \
            --to-environment="production" \
            --broker-base-url="${PACT_BROKER_URL}" \
            --broker-token="${PACT_BROKER_TOKEN}" \
            --retry-while-unknown=12 \
            --retry-interval=10
```

```typescript
// scripts/record-deployment.ts
// Run after successful deployment to record in broker
import { execSync } from 'child_process';

const service = process.argv[2];
const version = process.argv[3];
const environment = process.argv[4] || 'production';
const brokerUrl = process.env.PACT_BROKER_URL!;
const brokerToken = process.env.PACT_BROKER_TOKEN!;

if (!service || !version) {
  console.error('Usage: ts-node record-deployment.ts <service> <version> [environment]');
  process.exit(1);
}

const cmd = [
  'npx @pact-foundation/pact-cli',
  'record-deployment',
  `--pacticipant="${service}"`,
  `--version="${version}"`,
  `--environment="${environment}"`,
  `--broker-base-url="${brokerUrl}"`,
  `--broker-token="${brokerToken}"`,
].join(' ');

console.log(`Recording deployment: ${service}@${version} -> ${environment}`);
execSync(cmd, { stdio: 'inherit' });
```
