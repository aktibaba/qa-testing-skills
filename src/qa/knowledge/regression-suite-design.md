# Regression Suite Design

## Principle
A regression suite is a curated, tiered collection of tests organized by scope and execution speed, designed to catch regressions at the earliest and cheapest stage possible.

## Rationale
Without deliberate organization, test suites grow into an undifferentiated mass where
running "all the tests" takes hours. Developers stop running tests locally because it
takes too long. CI pipelines become bottlenecks. When a release is urgent, nobody knows
which subset of tests provides adequate confidence.

A well-designed regression suite has explicit tiers: smoke tests (2-5 minutes, run on
every commit, verify the system boots and core paths work), sanity tests (10-15 minutes,
run on every PR, verify the changed area and its neighbors), and full regression (30-60+
minutes, run nightly or before releases, verify everything). Each tier has clear entry
criteria, ownership, and maintenance expectations. Test selection strategies (change-based,
risk-based, dependency-graph-based) determine which tests to run when, optimizing the
balance between confidence and feedback speed.

## Pattern Examples

### 1. Three-Tier Suite Organization

```
tests/
  smoke/                   # Tier 1: 2-5 min, every commit
    health-check.test.js   # App starts, DB connects, cache responds.
    login-flow.test.js     # Core auth works.
    homepage-loads.test.js  # Main page renders without errors.
    api-heartbeat.test.js   # Critical API endpoint returns 200.

  sanity/                  # Tier 2: 10-15 min, every PR
    auth/                  # Auth flows beyond basic login.
    products/              # CRUD for core entities.
    checkout/              # Order creation flow.
    search/                # Search functionality.

  regression/              # Tier 3: 30-60 min, nightly / pre-release
    auth/                  # All auth edge cases.
    products/              # All product scenarios.
    checkout/              # All checkout scenarios.
    admin/                 # Admin panel tests.
    reports/               # Reporting features.
    integrations/          # Third-party integrations.
    edge-cases/            # Boundary conditions, rare scenarios.
    accessibility/         # a11y compliance.
    performance/           # Client-side performance budgets.
```

### 2. Smoke Test Suite Implementation

```javascript
// tests/smoke/critical-paths.test.js
// Smoke tests: must pass before ANY other tests run.
// Each test is independent and validates a critical system component.

const request = require("supertest");
const app = require("../../src/app");

describe("SMOKE: System health", () => {
  it("application starts and responds", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
  });

  it("database is connected", async () => {
    const res = await request(app).get("/health/db").expect(200);
    expect(res.body.database).toBe("connected");
  });

  it("cache is connected", async () => {
    const res = await request(app).get("/health/cache").expect(200);
    expect(res.body.cache).toBe("connected");
  });
});

describe("SMOKE: Authentication", () => {
  it("login endpoint accepts credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "smoke-test@example.com", password: "SmokeTest1!" })
      .expect(200);

    expect(res.body.token).toBeDefined();
  });
});

describe("SMOKE: Core API", () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "smoke-test@example.com", password: "SmokeTest1!" });
    token = res.body.token;
  });

  it("product listing returns data", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("user profile is accessible", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.email).toBe("smoke-test@example.com");
  });
});
```

### 3. Playwright Suite Configuration by Tier

```javascript
// playwright.config.js
const { defineConfig, devices } = require("@playwright/test");

const TIER = process.env.TEST_TIER || "regression";

const tierConfigs = {
  smoke: {
    testDir: "./tests/smoke",
    timeout: 15000,
    retries: 0,          // Smoke tests must not need retries.
    workers: 1,          // Run sequentially for reliability.
    reporter: [["list"], ["json", { outputFile: "smoke-results.json" }]],
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
  },

  sanity: {
    testDir: "./tests/sanity",
    timeout: 30000,
    retries: 1,
    workers: 4,
    reporter: [["list"], ["html", { open: "never" }]],
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
  },

  regression: {
    testDir: "./tests/regression",
    timeout: 60000,
    retries: 2,
    workers: "50%",      // Use half the available CPU cores.
    reporter: [
      ["list"],
      ["html", { open: "never" }],
      ["junit", { outputFile: "regression-junit.xml" }],
    ],
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "mobile", use: { ...devices["iPhone 14"] } },
    ],
  },
};

module.exports = defineConfig({
  ...tierConfigs[TIER],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
```

```bash
# Run by tier:
TEST_TIER=smoke npx playwright test
TEST_TIER=sanity npx playwright test
TEST_TIER=regression npx playwright test
```

### 4. Test Selection by Changed Files

```javascript
// scripts/select-tests.js
// Determine which test suites to run based on changed files.

const { execSync } = require("child_process");

// Map source directories to test directories.
const DEPENDENCY_MAP = {
  "src/services/auth": ["tests/smoke/login", "tests/sanity/auth", "tests/regression/auth"],
  "src/services/payment": ["tests/smoke", "tests/sanity/checkout", "tests/regression/checkout"],
  "src/services/product": ["tests/sanity/products", "tests/regression/products"],
  "src/api/routes": ["tests/smoke", "tests/sanity"],
  "src/models": ["tests/sanity", "tests/regression"],
  "src/middleware": ["tests/smoke", "tests/sanity"],
  "src/components": ["tests/regression/ui"],
  "src/pages": ["tests/regression/ui", "tests/regression/accessibility"],
  "migrations": ["tests/smoke"],
};

function getChangedFiles() {
  const output = execSync("git diff --name-only origin/main...HEAD").toString().trim();
  return output ? output.split("\n") : [];
}

function selectTests(changedFiles) {
  const testDirs = new Set();

  // Always include smoke tests.
  testDirs.add("tests/smoke");

  for (const file of changedFiles) {
    for (const [srcPattern, tests] of Object.entries(DEPENDENCY_MAP)) {
      if (file.startsWith(srcPattern)) {
        tests.forEach((t) => testDirs.add(t));
      }
    }
  }

  return Array.from(testDirs);
}

const changed = getChangedFiles();
const tests = selectTests(changed);

console.log("Changed files:", changed.length);
console.log("Selected test directories:", tests);

// Output for CI consumption.
console.log(`::set-output name=test_dirs::${tests.join(",")}`);
```

### 5. Suite Maintenance Practices

```python
# scripts/suite_health.py
"""Audit the regression suite for maintenance issues."""

import os
import re
import json
from dataclasses import dataclass
from collections import Counter


@dataclass
class SuiteHealth:
    total_tests: int = 0
    skipped_tests: int = 0
    quarantined_tests: int = 0
    slow_tests: list = None  # Tests > 30s.
    duplicate_names: list = None
    missing_assertions: list = None
    orphaned_fixtures: list = None

    def __post_init__(self):
        self.slow_tests = self.slow_tests or []
        self.duplicate_names = self.duplicate_names or []
        self.missing_assertions = self.missing_assertions or []
        self.orphaned_fixtures = self.orphaned_fixtures or []


def audit_suite(test_dir: str) -> SuiteHealth:
    health = SuiteHealth()
    test_names = Counter()

    for root, dirs, files in os.walk(test_dir):
        for f in files:
            if not f.endswith((".test.js", ".spec.js", ".test.ts", ".spec.ts", "_test.py", "test_.py")):
                continue

            filepath = os.path.join(root, f)
            with open(filepath) as fh:
                content = fh.read()

            # Count tests.
            it_matches = re.findall(r'(?:it|test)\s*\(\s*["\'](.+?)["\']', content)
            health.total_tests += len(it_matches)

            # Track names for duplicate detection.
            for name in it_matches:
                test_names[name] += 1

            # Count skipped tests.
            skip_count = len(re.findall(r'(?:it|test)\.skip\s*\(', content))
            skip_count += len(re.findall(r'@pytest\.mark\.skip', content))
            health.skipped_tests += skip_count

            # Detect tests without assertions (potential false positives).
            test_blocks = re.findall(
                r'(?:it|test)\s*\([^)]+,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([^}]+)\}',
                content,
            )
            for block in test_blocks:
                if "expect" not in block and "assert" not in block and "should" not in block:
                    health.missing_assertions.append(filepath)

    # Find duplicate test names.
    health.duplicate_names = [name for name, count in test_names.items() if count > 1]

    return health


def print_report(health: SuiteHealth):
    print("=" * 50)
    print("REGRESSION SUITE HEALTH REPORT")
    print("=" * 50)
    print(f"Total tests:          {health.total_tests}")
    print(f"Skipped tests:        {health.skipped_tests} ({health.skipped_tests / max(health.total_tests, 1) * 100:.1f}%)")
    print(f"Quarantined:          {health.quarantined_tests}")
    print()

    if health.duplicate_names:
        print(f"Duplicate test names ({len(health.duplicate_names)}):")
        for name in health.duplicate_names[:10]:
            print(f"  - {name}")
        print()

    if health.missing_assertions:
        unique = list(set(health.missing_assertions))
        print(f"Tests without assertions ({len(unique)} files):")
        for f in unique[:10]:
            print(f"  - {f}")
        print()

    # Recommendations.
    skip_rate = health.skipped_tests / max(health.total_tests, 1) * 100
    if skip_rate > 5:
        print(f"WARNING: {skip_rate:.1f}% of tests are skipped. Review and fix or remove.")
    if health.duplicate_names:
        print(f"WARNING: {len(health.duplicate_names)} duplicate test names may cause confusion.")


if __name__ == "__main__":
    health = audit_suite("tests")
    print_report(health)
```

### 6. CI Pipeline with Tiered Execution

```yaml
# .github/workflows/test-tiers.yml
name: Tiered Test Suite

on:
  push:
    branches: [main]
  pull_request:

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - name: Smoke tests
        run: TEST_TIER=smoke npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: smoke-report
          path: smoke-results.json

  sanity:
    needs: smoke
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - name: Determine affected tests
        id: select
        run: node scripts/select-tests.js
      - name: Sanity tests
        run: TEST_TIER=sanity npx playwright test ${{ steps.select.outputs.test_dirs }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: sanity-report
          path: playwright-report/

  regression:
    # Full regression runs nightly or on release branches.
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: sanity
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Full regression (shard ${{ matrix.shard }}/4)
        run: TEST_TIER=regression npx playwright test --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: regression-report-${{ matrix.shard }}
          path: playwright-report/
```
