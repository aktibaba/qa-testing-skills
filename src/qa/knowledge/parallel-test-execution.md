# Parallel Test Execution

## Principle
Parallel test execution reduces feedback time by distributing tests across multiple workers or machines, but requires proper isolation of shared resources -- especially databases -- to prevent flaky failures.

## Rationale
As test suites grow beyond a few hundred tests, sequential execution becomes a bottleneck. A suite that takes 30 minutes sequentially can complete in 5 minutes when distributed across 6 workers. However, parallelism introduces a class of problems that do not exist in sequential execution: race conditions on shared database state, port conflicts, file system contention, and non-deterministic test ordering.

The fundamental principle is isolation. Each parallel worker must operate on its own slice of shared resources. For databases, this means either separate schemas per worker, transaction-based isolation (each test runs in a transaction that is rolled back), or deterministic data partitioning. For network resources, this means dynamic port allocation. For file systems, this means worker-specific temporary directories. When these isolation boundaries are properly established, parallelism is both safe and dramatically faster. Sharding strategies determine how tests are distributed: round-robin for simplicity, duration-based for optimal balance, or test-file-based for natural grouping.

## Pattern Examples

### 1. Playwright Sharding Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Fully parallel execution within and across files
  fullyParallel: true,

  // Number of parallel workers
  workers: process.env.CI
    ? parseInt(process.env.WORKERS || '4')
    : Math.max(1, require('os').cpus().length - 1),

  // Retry flaky tests
  retries: process.env.CI ? 2 : 0,

  // Fail fast in CI
  maxFailures: process.env.CI ? 10 : undefined,

  // Timeout per test
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },

  projects: [
    // Fast smoke tests run first
    {
      name: 'smoke',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Full regression depends on smoke passing
    {
      name: 'regression',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*\.smoke\.spec\.ts/,
      dependencies: ['smoke'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

```yaml
# .github/workflows/parallel-tests.yml
name: Parallel Test Execution

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4, 5, 6]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Start application
        run: |
          npm run build && npm run start &
          npx wait-on http://localhost:3000 --timeout 60000

      - name: Run tests (shard ${{ matrix.shard }}/6)
        run: npx playwright test --shard=${{ matrix.shard }}/6
        env:
          WORKER_INDEX: ${{ matrix.shard }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-shard-${{ matrix.shard }}
          path: test-results/
          retention-days: 7

      - name: Upload blob report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 7

  merge-reports:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: Download all blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged HTML report
        uses: actions/upload-artifact@v4
        with:
          name: merged-html-report
          path: playwright-report/
          retention-days: 14
```

### 2. Database Isolation for Parallel Workers

```typescript
// tests/helpers/parallel-db.ts
import Knex from 'knex';

interface WorkerDbConfig {
  schemaName: string;
  connection: Knex.Knex;
}

const baseConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'test',
    password: process.env.DB_PASSWORD || 'test',
    database: process.env.DB_NAME || 'testdb',
  },
};

export async function createWorkerDatabase(workerIndex: number): Promise<WorkerDbConfig> {
  const schemaName = `test_worker_${workerIndex}`;

  // Admin connection to create schema
  const adminDb = Knex(baseConfig);

  // Create isolated schema for this worker
  await adminDb.raw(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await adminDb.raw(`CREATE SCHEMA "${schemaName}"`);
  await adminDb.destroy();

  // Worker-specific connection with search_path set to worker schema
  const workerDb = Knex({
    ...baseConfig,
    searchPath: [schemaName],
    pool: { min: 1, max: 5 },
    migrations: {
      directory: './src/database/migrations',
      schemaName,
    },
    seeds: {
      directory: './src/database/seeds',
    },
  });

  // Run migrations in worker schema
  await workerDb.raw(`SET search_path TO "${schemaName}"`);
  await workerDb.migrate.latest();

  // Seed test data
  await workerDb.seed.run();

  return { schemaName, connection: workerDb };
}

export async function destroyWorkerDatabase(config: WorkerDbConfig): Promise<void> {
  await config.connection.destroy();

  const adminDb = Knex(baseConfig);
  await adminDb.raw(`DROP SCHEMA IF EXISTS "${config.schemaName}" CASCADE`);
  await adminDb.destroy();
}

// Alternative: Transaction-based isolation (faster, for unit/integration tests)
export async function createTransactionIsolation(db: Knex.Knex): Promise<Knex.Knex.Transaction> {
  const trx = await db.transaction();

  // Each test gets a savepoint within the transaction
  return trx;
}

export async function rollbackTransaction(trx: Knex.Knex.Transaction): Promise<void> {
  await trx.rollback();
}

// tests/helpers/global-setup.ts
// Playwright global setup for parallel database isolation
import { FullConfig } from '@playwright/test';
import { createWorkerDatabase, WorkerDbConfig } from './parallel-db';

const workerDbs = new Map<number, WorkerDbConfig>();

async function globalSetup(config: FullConfig) {
  const workerCount = config.workers || 1;

  console.log(`Setting up ${workerCount} worker databases...`);

  const setupPromises = [];
  for (let i = 0; i < workerCount; i++) {
    setupPromises.push(
      createWorkerDatabase(i).then((dbConfig) => {
        workerDbs.set(i, dbConfig);
      }),
    );
  }

  await Promise.all(setupPromises);
  console.log(`All ${workerCount} worker databases ready`);

  // Store for teardown
  (globalThis as any).__workerDbs = workerDbs;
}

async function globalTeardown() {
  const dbs: Map<number, WorkerDbConfig> = (globalThis as any).__workerDbs;
  if (!dbs) return;

  const teardownPromises = [];
  for (const [_, dbConfig] of dbs) {
    teardownPromises.push(destroyWorkerDatabase(dbConfig));
  }
  await Promise.all(teardownPromises);
  console.log('All worker databases cleaned up');
}

export { globalSetup, globalTeardown };

// tests/fixtures/db-fixture.ts
import { test as base } from '@playwright/test';
import Knex from 'knex';

type DbFixtures = {
  workerDb: Knex.Knex;
};

export const test = base.extend<{}, DbFixtures>({
  workerDb: [
    async ({}, use, workerInfo) => {
      const schemaName = `test_worker_${workerInfo.workerIndex}`;

      const db = Knex({
        client: 'pg',
        connection: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'test',
          password: process.env.DB_PASSWORD || 'test',
          database: process.env.DB_NAME || 'testdb',
        },
        searchPath: [schemaName],
      });

      await use(db);
      await db.destroy();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
```

### 3. Duration-Based Sharding Strategy

```typescript
// scripts/optimize-shards.ts
import * as fs from 'fs';

interface TestDuration {
  file: string;
  duration: number; // milliseconds
}

interface ShardAssignment {
  shard: number;
  files: string[];
  totalDuration: number;
}

function loadTestDurations(historyFile: string): TestDuration[] {
  if (!fs.existsSync(historyFile)) return [];

  const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));

  // Average duration across last 5 runs per file
  const durationMap = new Map<string, number[]>();

  for (const run of history.slice(-5)) {
    for (const test of run.tests) {
      const existing = durationMap.get(test.file) || [];
      existing.push(test.duration);
      durationMap.set(test.file, existing);
    }
  }

  return Array.from(durationMap.entries()).map(([file, durations]) => ({
    file,
    duration: durations.reduce((a, b) => a + b, 0) / durations.length,
  }));
}

function assignToShards(tests: TestDuration[], shardCount: number): ShardAssignment[] {
  // Greedy algorithm: assign longest test to shard with least total duration
  const shards: ShardAssignment[] = Array.from({ length: shardCount }, (_, i) => ({
    shard: i + 1,
    files: [],
    totalDuration: 0,
  }));

  // Sort tests by duration descending (longest first)
  const sorted = [...tests].sort((a, b) => b.duration - a.duration);

  for (const test of sorted) {
    // Find shard with minimum total duration
    const minShard = shards.reduce((min, s) =>
      s.totalDuration < min.totalDuration ? s : min,
    );

    minShard.files.push(test.file);
    minShard.totalDuration += test.duration;
  }

  return shards;
}

function generateShardConfig(shards: ShardAssignment[]): void {
  const config = {
    generated: new Date().toISOString(),
    shards: shards.map((s) => ({
      index: s.shard,
      files: s.files,
      estimatedDuration: Math.round(s.totalDuration / 1000),
    })),
  };

  fs.writeFileSync('shard-config.json', JSON.stringify(config, null, 2));

  console.log('\nShard distribution:');
  for (const shard of shards) {
    console.log(
      `  Shard ${shard.shard}: ${shard.files.length} files, ~${(shard.totalDuration / 1000).toFixed(1)}s`,
    );
  }

  const maxDuration = Math.max(...shards.map((s) => s.totalDuration));
  const minDuration = Math.min(...shards.map((s) => s.totalDuration));
  const balance = ((minDuration / maxDuration) * 100).toFixed(1);
  console.log(`\nBalance: ${balance}% (100% = perfect)`);
}

// Main
const shardCount = parseInt(process.argv[2] || '6');
const historyFile = process.argv[3] || 'results/test-duration-history.json';

const durations = loadTestDurations(historyFile);

if (durations.length === 0) {
  console.log('No duration history found. Using round-robin distribution.');
  // Fallback: discover test files and distribute evenly
  const { globSync } = require('glob');
  const testFiles = globSync('tests/**/*.spec.ts');
  const fallbackDurations = testFiles.map((f: string) => ({ file: f, duration: 1000 }));
  const shards = assignToShards(fallbackDurations, shardCount);
  generateShardConfig(shards);
} else {
  console.log(`Loaded durations for ${durations.length} test files`);
  const shards = assignToShards(durations, shardCount);
  generateShardConfig(shards);
}
```

```typescript
// playwright.config.ts - using shard config for custom distribution
import { defineConfig } from '@playwright/test';
import * as fs from 'fs';

function getShardTestFiles(): string[] | undefined {
  const shardIndex = parseInt(process.env.SHARD_INDEX || '0');
  if (shardIndex === 0) return undefined; // no custom sharding

  try {
    const config = JSON.parse(fs.readFileSync('shard-config.json', 'utf-8'));
    const shard = config.shards.find((s: any) => s.index === shardIndex);
    return shard?.files;
  } catch {
    return undefined;
  }
}

const shardFiles = getShardTestFiles();

export default defineConfig({
  testDir: './tests',
  ...(shardFiles
    ? { testMatch: shardFiles.map((f: string) => `**/${f.split('/').pop()}`) }
    : {}),
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
});
```
