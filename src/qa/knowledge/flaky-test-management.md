# Flaky Test Management

## Principle
Flaky tests must be detected, quarantined, root-caused, and fixed systematically---never ignored, never deleted, never retried into silence.

## Rationale
A flaky test is one that produces different results (pass/fail) on the same code without
any changes. Flaky tests are corrosive: they erode team confidence in the test suite,
cause developers to ignore genuine failures ("it's just flaky"), and waste CI resources
on unnecessary retries. Studies at Google found that flaky tests account for approximately
16% of all test failures, and that unfixed flaky tests correlate with slower development
velocity.

The root causes fall into predictable categories: timing issues (race conditions,
insufficient waits), shared state (tests polluting each other), test ordering
dependencies, environment differences (timezone, locale, available ports), and
non-deterministic data (random IDs, floating-point comparisons). Each category has
specific fix patterns. The management process has four phases: detect (identify which
tests are flaky), quarantine (isolate them so they don't block the pipeline), diagnose
(find the root cause), and fix (apply the appropriate pattern).

## Pattern Examples

### 1. Flaky Test Detection System

```python
# scripts/flaky_detector.py
"""Detect flaky tests by running the suite multiple times and comparing results."""

import json
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class TestResult:
    name: str
    outcomes: list[str] = field(default_factory=list)  # "passed", "failed", "error"

    @property
    def is_flaky(self) -> bool:
        unique_outcomes = set(self.outcomes)
        return len(unique_outcomes) > 1

    @property
    def flaky_rate(self) -> float:
        if not self.outcomes:
            return 0.0
        failures = sum(1 for o in self.outcomes if o != "passed")
        return failures / len(self.outcomes)


def run_suite(run_number: int) -> dict[str, str]:
    """Run the test suite once and return {test_name: outcome}."""
    result = subprocess.run(
        [
            "pytest",
            "--tb=no",
            "-q",
            "--json-report",
            f"--json-report-file=flaky-run-{run_number}.json",
        ],
        capture_output=True,
        text=True,
    )

    with open(f"flaky-run-{run_number}.json") as f:
        report = json.load(f)

    outcomes = {}
    for test in report.get("tests", []):
        outcomes[test["nodeid"]] = test["outcome"]

    return outcomes


def detect_flaky(num_runs: int = 5) -> list[TestResult]:
    """Run the suite multiple times and identify flaky tests."""
    all_tests: dict[str, TestResult] = defaultdict(TestResult)

    for i in range(num_runs):
        print(f"Run {i + 1}/{num_runs}...")
        outcomes = run_suite(i)

        for test_name, outcome in outcomes.items():
            if test_name not in all_tests:
                all_tests[test_name] = TestResult(name=test_name)
            all_tests[test_name].outcomes.append(outcome)

    flaky = [t for t in all_tests.values() if t.is_flaky]
    flaky.sort(key=lambda t: t.flaky_rate, reverse=True)

    return flaky


def main():
    num_runs = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    flaky_tests = detect_flaky(num_runs)

    if not flaky_tests:
        print(f"No flaky tests detected in {num_runs} runs.")
        return

    print(f"\nFlaky tests detected ({len(flaky_tests)}):\n")
    for test in flaky_tests:
        outcomes_str = ", ".join(test.outcomes)
        print(f"  [{test.flaky_rate:.0%} fail rate] {test.name}")
        print(f"    Outcomes: {outcomes_str}\n")

    # Write flaky test list to a file for quarantine.
    with open("flaky-tests.json", "w") as f:
        json.dump(
            [{"name": t.name, "flaky_rate": t.flaky_rate, "outcomes": t.outcomes}
             for t in flaky_tests],
            f,
            indent=2,
        )


if __name__ == "__main__":
    main()
```

### 2. Quarantine Pattern (pytest)

```python
# tests/conftest.py
"""Quarantine marker: isolate known-flaky tests from the main suite."""

import pytest
import json
import os

# Load the quarantine list.
QUARANTINE_FILE = os.path.join(os.path.dirname(__file__), "quarantined-tests.json")

if os.path.exists(QUARANTINE_FILE):
    with open(QUARANTINE_FILE) as f:
        QUARANTINED = {t["name"] for t in json.load(f)}
else:
    QUARANTINED = set()


def pytest_collection_modifyitems(config, items):
    """
    Automatically mark quarantined tests so they can be included or excluded.
    """
    for item in items:
        if item.nodeid in QUARANTINED:
            item.add_marker(pytest.mark.quarantined)


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "quarantined: test is quarantined due to flakiness"
    )
```

```json
// tests/quarantined-tests.json
[
  {
    "name": "tests/e2e/test_checkout.py::TestCheckout::test_payment_confirmation",
    "reason": "Timing issue with Stripe webhook callback",
    "quarantined_date": "2025-01-15",
    "owner": "payments-team",
    "ticket": "JIRA-1234"
  },
  {
    "name": "tests/integration/test_email.py::TestEmail::test_welcome_email_sent",
    "reason": "Mailhog container sometimes slow to start",
    "quarantined_date": "2025-01-20",
    "owner": "platform-team",
    "ticket": "JIRA-1256"
  }
]
```

```bash
# Run the main suite WITHOUT quarantined tests (for CI gate).
pytest -m "not quarantined"

# Run ONLY quarantined tests (for a separate monitoring job).
pytest -m "quarantined" --no-header

# Run everything (for comprehensive local testing).
pytest
```

### 3. Quarantine Pattern (Jest)

```javascript
// tests/quarantine.js
// Quarantine configuration for Jest.

const quarantinedTests = [
  {
    testPath: "tests/e2e/checkout.test.js",
    testName: "displays payment confirmation",
    reason: "Race condition with webhook callback",
    ticket: "JIRA-1234",
    owner: "payments-team",
  },
  {
    testPath: "tests/integration/email.test.js",
    testName: "sends welcome email on registration",
    reason: "SMTP mock timing issue",
    ticket: "JIRA-1256",
    owner: "platform-team",
  },
];

module.exports = { quarantinedTests };
```

```javascript
// jest.setup.js
const { quarantinedTests } = require("./tests/quarantine");

// In CI, skip quarantined tests.
if (process.env.CI) {
  const originalIt = global.it;

  global.it = function (name, fn, timeout) {
    const testPath = expect.getState().testPath;
    const isQuarantined = quarantinedTests.some(
      (q) => testPath.includes(q.testPath) && name === q.testName
    );

    if (isQuarantined) {
      return originalIt.skip(name, fn, timeout);
    }
    return originalIt(name, fn, timeout);
  };
}
```

### 4. Root Cause Categories and Fix Patterns

```javascript
// Root Cause 1: TIMING / RACE CONDITIONS
// Symptom: Test passes locally, fails in CI. Passes with a sleep().

// BAD: Fixed sleep that may be too short in CI.
// await new Promise(r => setTimeout(r, 2000));
// await expect(element).toBeVisible();

// GOOD: Poll until the condition is met, with a timeout.
await expect(page.getByTestId("confirmation")).toBeVisible({ timeout: 10000 });

// GOOD (Playwright): Use auto-waiting locators.
await page.getByTestId("submit").click(); // Playwright auto-waits for element to be actionable.


// Root Cause 2: SHARED STATE / TEST ORDERING
// Symptom: Test fails when run after a specific other test.

// BAD: Tests share database state.
describe("Orders", () => {
  // This test creates an order but doesn't clean up.
  // it("creates an order", async () => {
  //   await db.query("INSERT INTO orders ...");
  // });
  // This test assumes a clean orders table.
  // it("returns empty list when no orders", async () => { ... });
});

// GOOD: Each test uses a transaction that rolls back.
describe("Orders", () => {
  let trx;
  beforeEach(async () => { trx = await db.transaction(); });
  afterEach(async () => { await trx.rollback(); });

  it("creates an order", async () => {
    await trx("orders").insert({ /* ... */ });
    const orders = await trx("orders").select("*");
    expect(orders).toHaveLength(1);
  });

  it("returns empty list when no orders exist", async () => {
    const orders = await trx("orders").select("*");
    expect(orders).toHaveLength(0); // Clean state from rollback.
  });
});


// Root Cause 3: NON-DETERMINISTIC DATA
// Symptom: Fails intermittently with comparison errors.

// BAD: Comparing against Date.now() which varies by milliseconds.
// expect(user.createdAt).toBe(new Date().toISOString());

// GOOD: Use a range or matcher.
const now = Date.now();
const createdAt = new Date(user.createdAt).getTime();
expect(createdAt).toBeGreaterThan(now - 5000);
expect(createdAt).toBeLessThan(now + 5000);

// GOOD: Freeze time.
jest.useFakeTimers();
jest.setSystemTime(new Date("2025-01-15T12:00:00Z"));
// Now Date.now() and new Date() return the frozen time.


// Root Cause 4: RESOURCE CONTENTION
// Symptom: Fails when tests run in parallel but passes serially.

// BAD: Multiple tests bind to the same port.
// const server = app.listen(3000);

// GOOD: Use dynamic port assignment.
const server = app.listen(0); // OS assigns a free port.
const port = server.address().port;


// Root Cause 5: FLOATING POINT COMPARISON
// Symptom: Passes on one architecture, fails on another.

// BAD:
// expect(calculateTax(100)).toBe(8.25);

// GOOD:
expect(calculateTax(100)).toBeCloseTo(8.25, 2); // 2 decimal places.
```

### 5. CI Flaky Test Monitoring Job

```yaml
# .github/workflows/flaky-monitor.yml
name: Flaky Test Monitor

on:
  schedule:
    # Run nightly at 2 AM UTC.
    - cron: "0 2 * * *"

jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Run test suite 10 times
        run: |
          RESULTS_DIR=flaky-results
          mkdir -p $RESULTS_DIR

          for i in $(seq 1 10); do
            echo "=== Run $i/10 ==="
            npx jest --ci --json --outputFile="$RESULTS_DIR/run-$i.json" || true
          done

      - name: Analyze flaky tests
        run: node scripts/analyze-flaky-results.js

      - name: Create issue for new flaky tests
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const flaky = JSON.parse(fs.readFileSync('flaky-report.json', 'utf-8'));

            if (flaky.length > 0) {
              const body = flaky.map(t =>
                `- **${t.name}** (${t.failRate}% fail rate)\n  Outcomes: ${t.outcomes.join(', ')}`
              ).join('\n');

              github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Flaky tests detected: ${flaky.length} test(s)`,
                body: `## Flaky Tests Detected\n\n${body}\n\nDetected by nightly flaky test monitor.`,
                labels: ['flaky-test', 'tech-debt'],
              });
            }
```

### 6. Flaky Test Retry Strategy (Use Sparingly)

```javascript
// playwright.config.js
// Retries are a TEMPORARY measure, not a fix.
module.exports = {
  retries: process.env.CI ? 2 : 0,  // Retry up to 2 times in CI only.

  // Categorize retried tests in the report so they are visible.
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    // Custom reporter that flags retried tests.
    ["./tests/reporters/flaky-reporter.js"],
  ],
};
```

```javascript
// tests/reporters/flaky-reporter.js
// Custom Playwright reporter that tracks retried (potentially flaky) tests.

class FlakyReporter {
  constructor() {
    this.retried = [];
  }

  onTestEnd(test, result) {
    if (result.retry > 0 && result.status === "passed") {
      this.retried.push({
        title: test.title,
        file: test.location.file,
        retries: result.retry,
      });
    }
  }

  onEnd() {
    if (this.retried.length > 0) {
      console.log("\n--- FLAKY TEST WARNING ---");
      console.log(`${this.retried.length} test(s) passed only after retry:\n`);
      for (const test of this.retried) {
        console.log(`  ${test.file} > "${test.title}" (retried ${test.retries}x)`);
      }
      console.log("\nThese tests should be investigated for flakiness.");
      console.log("--------------------------\n");
    }
  }
}

module.exports = FlakyReporter;
```
