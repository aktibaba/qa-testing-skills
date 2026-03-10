# Database Testing

## Principle
Database testing validates that migrations run correctly, data integrity constraints hold under real-world scenarios, and seed data management enables reproducible test environments.

## Rationale
The database is the foundation of most applications, yet it is often the least tested component. Migration scripts that work on a developer's machine may fail on a production database with millions of rows. Constraint violations that should be caught at the database level may only surface when a specific combination of data triggers them. Seed data that was valid six months ago may no longer match the current schema.

Database testing must cover three areas: migration testing ensures that schema changes apply cleanly in both directions (up and down), data integrity testing verifies that constraints, triggers, and indexes behave correctly under load and edge cases, and seed data management provides consistent starting states for all test environments. These tests should run against a real database engine (not an in-memory substitute) to catch engine-specific behavior differences. Docker makes it practical to spin up fresh database instances for each test run, ensuring isolation and reproducibility.

## Pattern Examples

### 1. Migration Testing with Knex

```typescript
// tests/database/migrations.spec.ts
import { test, expect, beforeAll, afterAll } from 'vitest';
import Knex from 'knex';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

let container: StartedTestContainer;
let db: Knex.Knex;

beforeAll(async () => {
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'testdb',
    })
    .withExposedPorts(5432)
    .start();

  db = Knex({
    client: 'pg',
    connection: {
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: 'test',
      password: 'test',
      database: 'testdb',
    },
    migrations: {
      directory: './src/database/migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  });
}, 60000);

afterAll(async () => {
  await db.destroy();
  await container.stop();
});

test('all migrations run forward successfully', async () => {
  const [batchNo, migrations] = await db.migrate.latest();
  expect(batchNo).toBeGreaterThan(0);
  expect(migrations.length).toBeGreaterThan(0);
  console.log(`Applied ${migrations.length} migrations in batch ${batchNo}`);
});

test('migrations are idempotent (running latest twice succeeds)', async () => {
  const [batchNo, migrations] = await db.migrate.latest();
  // Second call should apply zero new migrations
  expect(migrations.length).toBe(0);
});

test('all migrations roll back cleanly', async () => {
  // Get current migration state
  const currentVersion = await db.migrate.currentVersion();
  expect(currentVersion).not.toBe('none');

  // Roll back all migrations one by one
  let rollbackCount = 0;
  while (true) {
    const [batchNo, migrations] = await db.migrate.rollback();
    if (migrations.length === 0) break;
    rollbackCount += migrations.length;
  }

  const afterRollback = await db.migrate.currentVersion();
  expect(afterRollback).toBe('none');

  // Re-apply all migrations
  const [_, applied] = await db.migrate.latest();
  expect(applied.length).toBe(rollbackCount);
});

test('each migration can be applied and rolled back individually', async () => {
  // Start from clean state
  await db.migrate.rollback(undefined, true);

  const migrationFiles = await db.migrate.list();
  const pendingMigrations = migrationFiles[1]; // [completed, pending]

  for (const migration of pendingMigrations) {
    // Apply single migration
    await db.migrate.up();

    // Verify it applied
    const currentVersion = await db.migrate.currentVersion();
    expect(currentVersion).toBeTruthy();

    // Roll it back
    await db.migrate.down();
  }

  // Re-apply all for subsequent tests
  await db.migrate.latest();
});

test('migration creates expected tables and columns', async () => {
  const tables = await db.raw(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tableNames = tables.rows.map((r: any) => r.table_name);
  expect(tableNames).toContain('users');
  expect(tableNames).toContain('orders');
  expect(tableNames).toContain('order_items');
  expect(tableNames).toContain('products');

  // Verify column structure of a critical table
  const columns = await db.raw(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position
  `);

  const colMap = new Map(columns.rows.map((c: any) => [c.column_name, c]));

  expect(colMap.get('id')?.data_type).toBe('uuid');
  expect(colMap.get('id')?.is_nullable).toBe('NO');
  expect(colMap.get('user_id')?.is_nullable).toBe('NO');
  expect(colMap.get('status')?.data_type).toMatch(/character varying|text/);
  expect(colMap.get('total_amount')?.data_type).toBe('numeric');
  expect(colMap.get('created_at')?.column_default).toContain('now()');
});

test('indexes exist for frequently queried columns', async () => {
  const indexes = await db.raw(`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  const indexNames = indexes.rows.map((r: any) => r.indexname);

  // Verify critical indexes exist
  expect(indexNames.some((n: string) => n.includes('orders') && n.includes('user_id'))).toBe(true);
  expect(indexNames.some((n: string) => n.includes('orders') && n.includes('status'))).toBe(true);
  expect(indexNames.some((n: string) => n.includes('order_items') && n.includes('order_id'))).toBe(true);
  expect(indexNames.some((n: string) => n.includes('products') && n.includes('sku'))).toBe(true);
});
```

### 2. Data Integrity and Constraint Testing

```typescript
// tests/database/constraints.spec.ts
import { test, expect } from 'vitest';
import { db } from './setup'; // shared db connection from migration tests

test.describe('Foreign Key Constraints', () => {
  test('cannot create order_item referencing non-existent order', async () => {
    await expect(
      db('order_items').insert({
        id: 'oi-orphan-001',
        order_id: 'non-existent-order-id',
        product_id: 'prod-100',
        quantity: 1,
        unit_price: 9.99,
      }),
    ).rejects.toThrow(/foreign key constraint|violates foreign key/i);
  });

  test('cascading delete removes child records', async () => {
    // Create parent and children
    const orderId = 'ord-cascade-test';
    await db('orders').insert({
      id: orderId,
      user_id: 'user-001',
      status: 'pending',
      total_amount: 29.97,
    });

    await db('order_items').insert([
      { id: 'oi-c1', order_id: orderId, product_id: 'prod-100', quantity: 1, unit_price: 9.99 },
      { id: 'oi-c2', order_id: orderId, product_id: 'prod-200', quantity: 2, unit_price: 9.99 },
    ]);

    // Delete parent
    await db('orders').where('id', orderId).delete();

    // Verify children are gone
    const orphanedItems = await db('order_items').where('order_id', orderId);
    expect(orphanedItems).toHaveLength(0);
  });
});

test.describe('Unique Constraints', () => {
  test('cannot create duplicate user email', async () => {
    const email = `unique-test-${Date.now()}@example.com`;

    await db('users').insert({
      id: `user-unique-1`,
      email,
      first_name: 'First',
      last_name: 'User',
      password_hash: 'hash1',
    });

    await expect(
      db('users').insert({
        id: `user-unique-2`,
        email, // same email
        first_name: 'Second',
        last_name: 'User',
        password_hash: 'hash2',
      }),
    ).rejects.toThrow(/unique constraint|duplicate key/i);
  });

  test('cannot create duplicate product SKU', async () => {
    const sku = `SKU-DUP-${Date.now()}`;
    await db('products').insert({
      id: 'prod-dup-1',
      name: 'Product A',
      sku,
      price: 19.99,
    });

    await expect(
      db('products').insert({
        id: 'prod-dup-2',
        name: 'Product B',
        sku, // same SKU
        price: 29.99,
      }),
    ).rejects.toThrow(/unique constraint|duplicate key/i);
  });
});

test.describe('Check Constraints', () => {
  test('rejects negative product price', async () => {
    await expect(
      db('products').insert({
        id: 'prod-neg-price',
        name: 'Bad Product',
        sku: 'SKU-NEG',
        price: -5.00,
      }),
    ).rejects.toThrow(/check constraint|violates check/i);
  });

  test('rejects zero quantity in order items', async () => {
    await expect(
      db('order_items').insert({
        id: 'oi-zero-qty',
        order_id: 'ord-existing',
        product_id: 'prod-100',
        quantity: 0,
        unit_price: 9.99,
      }),
    ).rejects.toThrow(/check constraint|violates check/i);
  });

  test('rejects invalid order status values', async () => {
    await expect(
      db('orders').insert({
        id: 'ord-bad-status',
        user_id: 'user-001',
        status: 'INVALID_STATUS',
        total_amount: 10.00,
      }),
    ).rejects.toThrow(/check constraint|invalid input/i);
  });
});

test.describe('Trigger Validation', () => {
  test('updated_at is automatically set on update', async () => {
    const userId = `user-trigger-${Date.now()}`;
    await db('users').insert({
      id: userId,
      email: `trigger-${Date.now()}@example.com`,
      first_name: 'Trigger',
      last_name: 'Test',
      password_hash: 'hash',
    });

    const before = await db('users').where('id', userId).first();
    const beforeUpdated = new Date(before.updated_at).getTime();

    // Wait a moment to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 100));

    await db('users').where('id', userId).update({ first_name: 'Updated' });
    const after = await db('users').where('id', userId).first();
    const afterUpdated = new Date(after.updated_at).getTime();

    expect(afterUpdated).toBeGreaterThan(beforeUpdated);
  });
});
```

### 3. Seed Data Management

```typescript
// src/database/seeds/test-seed-manager.ts
import Knex from 'knex';

interface SeedConfig {
  truncateOrder: string[];
  seeds: Record<string, any[]>;
}

const testSeedConfig: SeedConfig = {
  truncateOrder: [
    'order_items',
    'orders',
    'product_categories',
    'products',
    'categories',
    'user_roles',
    'users',
    'roles',
  ],
  seeds: {
    roles: [
      { id: 'role-admin', name: 'admin', permissions: JSON.stringify(['read', 'write', 'delete', 'manage']) },
      { id: 'role-user', name: 'user', permissions: JSON.stringify(['read', 'write']) },
      { id: 'role-viewer', name: 'viewer', permissions: JSON.stringify(['read']) },
    ],
    users: [
      { id: 'user-001', email: 'admin@test.com', first_name: 'Admin', last_name: 'User', password_hash: '$2b$10$hashedpassword1', is_active: true },
      { id: 'user-002', email: 'jane@test.com', first_name: 'Jane', last_name: 'Doe', password_hash: '$2b$10$hashedpassword2', is_active: true },
      { id: 'user-003', email: 'inactive@test.com', first_name: 'Inactive', last_name: 'User', password_hash: '$2b$10$hashedpassword3', is_active: false },
    ],
    user_roles: [
      { user_id: 'user-001', role_id: 'role-admin' },
      { user_id: 'user-002', role_id: 'role-user' },
      { user_id: 'user-003', role_id: 'role-viewer' },
    ],
    categories: [
      { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
      { id: 'cat-clothing', name: 'Clothing', slug: 'clothing' },
    ],
    products: [
      { id: 'prod-100', name: 'Wireless Mouse', sku: 'WM-001', price: 29.99, stock: 150 },
      { id: 'prod-200', name: 'USB-C Cable', sku: 'UC-001', price: 12.99, stock: 500 },
      { id: 'prod-300', name: 'T-Shirt', sku: 'TS-001', price: 19.99, stock: 200 },
      { id: 'prod-400', name: 'Out of Stock Item', sku: 'OOS-001', price: 49.99, stock: 0 },
    ],
    product_categories: [
      { product_id: 'prod-100', category_id: 'cat-electronics' },
      { product_id: 'prod-200', category_id: 'cat-electronics' },
      { product_id: 'prod-300', category_id: 'cat-clothing' },
      { product_id: 'prod-400', category_id: 'cat-electronics' },
    ],
  },
};

export async function seedTestData(db: Knex.Knex): Promise<void> {
  await db.transaction(async (trx) => {
    // Truncate in reverse foreign key order
    for (const table of testSeedConfig.truncateOrder) {
      await trx.raw(`TRUNCATE TABLE "${table}" CASCADE`);
    }

    // Insert seeds in dependency order
    for (const [table, rows] of Object.entries(testSeedConfig.seeds)) {
      if (rows.length > 0) {
        await trx(table).insert(rows);
      }
    }
  });
}

export async function verifyTestData(db: Knex.Knex): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  for (const [table, expectedRows] of Object.entries(testSeedConfig.seeds)) {
    const actualCount = await db(table).count('* as count').first();
    const count = parseInt(String(actualCount?.count || 0));

    if (count < expectedRows.length) {
      issues.push(`${table}: expected at least ${expectedRows.length} rows, found ${count}`);
    }
  }

  // Verify referential integrity
  const orphanedOrderItems = await db.raw(`
    SELECT oi.id FROM order_items oi
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.id IS NULL
  `);

  if (orphanedOrderItems.rows.length > 0) {
    issues.push(`Found ${orphanedOrderItems.rows.length} orphaned order items`);
  }

  return { valid: issues.length === 0, issues };
}

export async function resetToCleanState(db: Knex.Knex): Promise<void> {
  await seedTestData(db);
  const validation = await verifyTestData(db);
  if (!validation.valid) {
    throw new Error(`Seed data validation failed:\n${validation.issues.join('\n')}`);
  }
}
```
