# GraphQL Testing Patterns

## Principle
GraphQL APIs require targeted testing of queries, mutations, subscriptions, error handling, and schema validation to ensure type safety and data integrity across the entire graph.

## Rationale
Unlike REST APIs where each endpoint has a fixed response shape, GraphQL allows clients to request arbitrary data structures. This flexibility introduces unique testing challenges: a query may work perfectly with one selection set but fail silently with another. Schema changes can break clients in subtle ways that are not caught by traditional HTTP status code checks.

Thorough GraphQL testing must verify that resolvers return correct data for various query shapes, that mutations enforce business rules and return appropriate errors, that subscriptions deliver real-time updates reliably, and that the schema itself remains backward-compatible. Without dedicated GraphQL testing patterns, teams often discover data-fetching bugs only in production when a new client query hits an untested resolver path.

## Pattern Examples

### 1. Query Testing with Variable Combinations

```typescript
// graphql-query.spec.ts
import { test, expect } from '@playwright/test';
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('http://localhost:4000/graphql', {
  headers: { Authorization: 'Bearer test-token-admin' },
});

const GET_USERS = `
  query GetUsers($first: Int, $after: String, $filter: UserFilter) {
    users(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          email
          profile {
            firstName
            lastName
            avatar
          }
          roles {
            name
            permissions
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
        totalCount
      }
    }
  }
`;

test.describe('User Query', () => {
  test('returns paginated users with nested profile data', async () => {
    const data = await client.request(GET_USERS, {
      first: 5,
      after: null,
      filter: { status: 'ACTIVE' },
    });

    expect(data.users.edges).toHaveLength(5);
    expect(data.users.pageInfo.hasNextPage).toBe(true);
    expect(data.users.pageInfo.totalCount).toBeGreaterThan(5);

    const firstUser = data.users.edges[0].node;
    expect(firstUser).toHaveProperty('id');
    expect(firstUser).toHaveProperty('email');
    expect(firstUser.profile).toHaveProperty('firstName');
    expect(firstUser.profile).toHaveProperty('lastName');
    expect(firstUser.roles).toBeInstanceOf(Array);
    expect(firstUser.roles[0]).toHaveProperty('name');
    expect(firstUser.roles[0]).toHaveProperty('permissions');
  });

  test('handles cursor-based pagination correctly', async () => {
    const firstPage = await client.request(GET_USERS, { first: 2 });
    const cursor = firstPage.users.pageInfo.endCursor;

    const secondPage = await client.request(GET_USERS, {
      first: 2,
      after: cursor,
    });

    const firstPageIds = firstPage.users.edges.map((e: any) => e.node.id);
    const secondPageIds = secondPage.users.edges.map((e: any) => e.node.id);
    const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));

    expect(overlap).toHaveLength(0);
  });

  test('filters return only matching results', async () => {
    const data = await client.request(GET_USERS, {
      first: 50,
      filter: { role: 'ADMIN' },
    });

    for (const edge of data.users.edges) {
      const roleNames = edge.node.roles.map((r: any) => r.name);
      expect(roleNames).toContain('ADMIN');
    }
  });

  test('returns empty edges for no-match filter', async () => {
    const data = await client.request(GET_USERS, {
      first: 10,
      filter: { email: 'nonexistent@impossible-domain-xyz.com' },
    });

    expect(data.users.edges).toHaveLength(0);
    expect(data.users.pageInfo.hasNextPage).toBe(false);
    expect(data.users.pageInfo.totalCount).toBe(0);
  });
});
```

### 2. Mutation Testing with Error Handling

```typescript
// graphql-mutation.spec.ts
import { test, expect } from '@playwright/test';
import { GraphQLClient, ClientError } from 'graphql-request';

const adminClient = new GraphQLClient('http://localhost:4000/graphql', {
  headers: { Authorization: 'Bearer test-token-admin' },
});

const userClient = new GraphQLClient('http://localhost:4000/graphql', {
  headers: { Authorization: 'Bearer test-token-user' },
});

const unauthClient = new GraphQLClient('http://localhost:4000/graphql');

const CREATE_ORDER = `
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      order {
        id
        status
        items {
          productId
          quantity
          unitPrice
          lineTotal
        }
        subtotal
        tax
        total
        createdAt
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const CANCEL_ORDER = `
  mutation CancelOrder($orderId: ID!, $reason: String!) {
    cancelOrder(orderId: $orderId, reason: $reason) {
      order {
        id
        status
        cancelledAt
        cancellationReason
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

test.describe('Order Mutations', () => {
  let createdOrderId: string;

  test('creates an order with valid input', async () => {
    const data = await adminClient.request(CREATE_ORDER, {
      input: {
        customerId: 'cust-001',
        items: [
          { productId: 'prod-100', quantity: 2 },
          { productId: 'prod-200', quantity: 1 },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'Portland',
          state: 'OR',
          zip: '97201',
          country: 'US',
        },
      },
    });

    expect(data.createOrder.errors).toHaveLength(0);
    expect(data.createOrder.order.status).toBe('PENDING');
    expect(data.createOrder.order.items).toHaveLength(2);
    expect(data.createOrder.order.total).toBeGreaterThan(0);
    expect(data.createOrder.order.subtotal + data.createOrder.order.tax)
      .toBeCloseTo(data.createOrder.order.total, 2);

    createdOrderId = data.createOrder.order.id;
  });

  test('returns validation errors for invalid input', async () => {
    const data = await adminClient.request(CREATE_ORDER, {
      input: {
        customerId: 'cust-001',
        items: [],
        shippingAddress: {
          street: '',
          city: 'Portland',
          state: 'OR',
          zip: 'invalid',
          country: 'US',
        },
      },
    });

    expect(data.createOrder.order).toBeNull();
    expect(data.createOrder.errors.length).toBeGreaterThan(0);

    const errorCodes = data.createOrder.errors.map((e: any) => e.code);
    expect(errorCodes).toContain('EMPTY_ITEMS');
    expect(errorCodes).toContain('INVALID_ZIP');
  });

  test('rejects unauthorized mutation with UNAUTHENTICATED error', async () => {
    try {
      await unauthClient.request(CREATE_ORDER, {
        input: {
          customerId: 'cust-001',
          items: [{ productId: 'prod-100', quantity: 1 }],
          shippingAddress: {
            street: '123 Main St',
            city: 'Portland',
            state: 'OR',
            zip: '97201',
            country: 'US',
          },
        },
      });
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ClientError);
      const gqlErrors = (error as ClientError).response.errors;
      expect(gqlErrors).toBeDefined();
      expect(gqlErrors![0].extensions?.code).toBe('UNAUTHENTICATED');
    }
  });

  test('enforces authorization rules on mutation', async () => {
    try {
      await userClient.request(CANCEL_ORDER, {
        orderId: 'order-owned-by-other-user',
        reason: 'Changed my mind',
      });
      expect.unreachable('Should have thrown');
    } catch (error) {
      const gqlErrors = (error as ClientError).response.errors;
      expect(gqlErrors![0].extensions?.code).toBe('FORBIDDEN');
    }
  });
});
```

### 3. Subscription and Schema Validation Testing

```typescript
// graphql-subscription.spec.ts
import { test, expect } from '@playwright/test';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';

function createWsClient(token: string) {
  return createClient({
    url: 'ws://localhost:4000/graphql',
    webSocketImpl: WebSocket,
    connectionParams: { authToken: token },
  });
}

const ORDER_STATUS_SUBSCRIPTION = `
  subscription OnOrderStatusChange($orderId: ID!) {
    orderStatusChanged(orderId: $orderId) {
      orderId
      previousStatus
      newStatus
      timestamp
      updatedBy
    }
  }
`;

test.describe('Order Status Subscription', () => {
  test('receives real-time order status updates', async () => {
    const wsClient = createWsClient('test-token-admin');
    const events: any[] = [];

    const subscription = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Subscription timed out')), 10000);

      const unsubscribe = wsClient.subscribe(
        {
          query: ORDER_STATUS_SUBSCRIPTION,
          variables: { orderId: 'order-sub-test-001' },
        },
        {
          next: (value) => {
            events.push(value.data.orderStatusChanged);
            if (events.length === 2) {
              clearTimeout(timeout);
              unsubscribe();
              resolve();
            }
          },
          error: (err) => {
            clearTimeout(timeout);
            reject(err);
          },
          complete: () => {},
        },
      );
    });

    // Trigger status changes via mutation
    const { GraphQLClient } = await import('graphql-request');
    const httpClient = new GraphQLClient('http://localhost:4000/graphql', {
      headers: { Authorization: 'Bearer test-token-admin' },
    });

    await httpClient.request(`
      mutation { updateOrderStatus(orderId: "order-sub-test-001", status: PROCESSING) { order { id } } }
    `);

    await new Promise((r) => setTimeout(r, 500));

    await httpClient.request(`
      mutation { updateOrderStatus(orderId: "order-sub-test-001", status: SHIPPED) { order { id } } }
    `);

    await subscription;

    expect(events).toHaveLength(2);
    expect(events[0].previousStatus).toBe('PENDING');
    expect(events[0].newStatus).toBe('PROCESSING');
    expect(events[1].previousStatus).toBe('PROCESSING');
    expect(events[1].newStatus).toBe('SHIPPED');

    wsClient.dispose();
  });
});

// graphql-schema-validation.spec.ts
import { buildSchema, introspectionFromSchema, buildClientSchema } from 'graphql';
import { diff as schemaDiff } from '@graphql-inspector/core';

test.describe('Schema Validation', () => {
  test('schema has no breaking changes from baseline', async () => {
    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          {
            __schema {
              types { name kind fields { name type { name kind ofType { name kind } } } }
              queryType { name }
              mutationType { name }
              subscriptionType { name }
            }
          }
        `,
      }),
    });

    const { data } = await response.json();
    expect(data.__schema.queryType.name).toBe('Query');
    expect(data.__schema.mutationType.name).toBe('Mutation');

    const typeNames = data.__schema.types.map((t: any) => t.name);
    expect(typeNames).toContain('User');
    expect(typeNames).toContain('Order');
    expect(typeNames).toContain('Product');
  });

  test('all required fields are non-nullable', async () => {
    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          {
            __type(name: "Order") {
              fields {
                name
                type {
                  kind
                  name
                  ofType { kind name }
                }
              }
            }
          }
        `,
      }),
    });

    const { data } = await response.json();
    const fields = data.__type.fields;

    const requiredFields = ['id', 'status', 'createdAt', 'total'];
    for (const fieldName of requiredFields) {
      const field = fields.find((f: any) => f.name === fieldName);
      expect(field, `Field ${fieldName} should exist`).toBeDefined();
      expect(field.type.kind, `Field ${fieldName} should be NON_NULL`).toBe('NON_NULL');
    }
  });

  test('deprecated fields include a deprecation reason', async () => {
    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          {
            __type(name: "User") {
              fields(includeDeprecated: true) {
                name
                isDeprecated
                deprecationReason
              }
            }
          }
        `,
      }),
    });

    const { data } = await response.json();
    const deprecatedFields = data.__type.fields.filter((f: any) => f.isDeprecated);

    for (const field of deprecatedFields) {
      expect(
        field.deprecationReason,
        `Deprecated field "${field.name}" must have a deprecation reason`,
      ).toBeTruthy();
      expect(field.deprecationReason.length).toBeGreaterThan(10);
    }
  });
});
```
