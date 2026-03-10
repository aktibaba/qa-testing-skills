# Quality Gate Criteria

## Principle
Quality gates are automated, objective checkpoints that prevent code from advancing through the pipeline unless it meets predefined, measurable standards.

## Rationale
Without quality gates, the decision to release becomes subjective: "it looks fine" or
"we'll fix it later." This leads to a steady accumulation of technical debt, test
coverage decay, and performance regressions that compound over time. By the time the
team notices, the codebase has degraded significantly.

Quality gates formalize team standards as enforceable thresholds. A merge cannot proceed
if coverage drops below 80%, if any critical security vulnerability is detected, or if
response times exceed the performance budget. These gates shift quality left: issues are
caught at PR time, not in staging or production. The gates themselves serve as living
documentation of the team's quality expectations. Crucially, gates must be actionable---
when a gate fails, the developer must know exactly what to fix and how.

## Pattern Examples

### 1. Coverage Thresholds (Jest Configuration)

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "json-summary"],

  // Coverage thresholds that FAIL the build if not met.
  coverageThreshold: {
    // Global thresholds apply to the entire codebase.
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Per-directory thresholds for critical modules.
    "./src/services/payment/": {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    "./src/services/auth/": {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    // Lower thresholds for less critical areas.
    "./src/utils/": {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};
```

### 2. Coverage Thresholds (pytest Configuration)

```ini
# pytest.ini or pyproject.toml [tool.pytest.ini_options]
[pytest]
addopts =
    --cov=app
    --cov-report=term-missing
    --cov-report=html
    --cov-report=xml
    --cov-fail-under=85
```

```toml
# pyproject.toml
[tool.coverage.run]
source = ["app"]
branch = true

[tool.coverage.report]
fail_under = 85
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if __name__ == .__main__.",
    "raise NotImplementedError",
    "pass",
    "except ImportError",
]

# Per-module minimum coverage.
# These are enforced by a custom script (see below).
[tool.coverage.paths]
payment = ["app/services/payment/*"]
auth = ["app/services/auth/*"]
```

```python
# scripts/check_coverage.py
"""Enforce per-module coverage thresholds."""

import json
import sys

THRESHOLDS = {
    "app/services/payment": 95,
    "app/services/auth": 90,
    "app/api": 85,
    "app/utils": 70,
}

def check():
    with open("coverage/coverage.json") as f:
        data = json.load(f)

    failures = []
    for module_path, min_coverage in THRESHOLDS.items():
        # Collect coverage for all files under this path.
        matching_files = {
            k: v for k, v in data["files"].items()
            if k.startswith(module_path)
        }

        if not matching_files:
            continue

        total_stmts = sum(f["summary"]["num_statements"] for f in matching_files.values())
        covered_stmts = sum(f["summary"]["covered_lines"] for f in matching_files.values())

        if total_stmts == 0:
            continue

        pct = (covered_stmts / total_stmts) * 100

        if pct < min_coverage:
            failures.append(
                f"  {module_path}: {pct:.1f}% (minimum: {min_coverage}%)"
            )

    if failures:
        print("Coverage gate FAILED:")
        for f in failures:
            print(f)
        sys.exit(1)
    else:
        print("Coverage gate PASSED.")


if __name__ == "__main__":
    check()
```

### 3. Performance Budget Gate

```javascript
// scripts/check-performance-budget.js
// Validates Lighthouse or k6 results against performance budgets.

const fs = require("fs");

const BUDGETS = {
  // Lighthouse performance metrics.
  "first-contentful-paint": { max: 1800, unit: "ms" },
  "largest-contentful-paint": { max: 2500, unit: "ms" },
  "total-blocking-time": { max: 200, unit: "ms" },
  "cumulative-layout-shift": { max: 0.1, unit: "score" },
  "speed-index": { max: 3400, unit: "ms" },

  // Bundle size budgets.
  "main-bundle-size": { max: 250, unit: "KB" },
  "total-js-size": { max: 500, unit: "KB" },
  "total-css-size": { max: 100, unit: "KB" },
};

function checkLighthouseBudget(reportPath) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const audits = report.audits;
  const failures = [];

  const metricMap = {
    "first-contentful-paint": audits["first-contentful-paint"]?.numericValue,
    "largest-contentful-paint": audits["largest-contentful-paint"]?.numericValue,
    "total-blocking-time": audits["total-blocking-time"]?.numericValue,
    "cumulative-layout-shift": audits["cumulative-layout-shift"]?.numericValue,
    "speed-index": audits["speed-index"]?.numericValue,
  };

  for (const [metric, value] of Object.entries(metricMap)) {
    if (value === undefined) continue;
    const budget = BUDGETS[metric];
    if (!budget) continue;

    if (value > budget.max) {
      failures.push(
        `${metric}: ${value.toFixed(1)}${budget.unit} exceeds budget of ${budget.max}${budget.unit}`
      );
    }
  }

  return failures;
}

function checkBundleSizeBudget(statsPath) {
  const stats = JSON.parse(fs.readFileSync(statsPath, "utf-8"));
  const failures = [];

  const mainBundle = stats.assets.find((a) => a.name.startsWith("main."));
  if (mainBundle) {
    const sizeKB = mainBundle.size / 1024;
    if (sizeKB > BUDGETS["main-bundle-size"].max) {
      failures.push(
        `main-bundle-size: ${sizeKB.toFixed(1)}KB exceeds budget of ${BUDGETS["main-bundle-size"].max}KB`
      );
    }
  }

  const totalJS = stats.assets
    .filter((a) => a.name.endsWith(".js"))
    .reduce((sum, a) => sum + a.size, 0) / 1024;

  if (totalJS > BUDGETS["total-js-size"].max) {
    failures.push(
      `total-js-size: ${totalJS.toFixed(1)}KB exceeds budget of ${BUDGETS["total-js-size"].max}KB`
    );
  }

  return failures;
}

// Main execution.
const lighthouseFailures = checkLighthouseBudget("lighthouse-report.json");
const bundleFailures = checkBundleSizeBudget("webpack-stats.json");
const allFailures = [...lighthouseFailures, ...bundleFailures];

if (allFailures.length > 0) {
  console.error("Performance budget gate FAILED:");
  allFailures.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
} else {
  console.log("Performance budget gate PASSED.");
}
```

### 4. Security Scan Gate

```yaml
# .github/workflows/security-gate.yml
name: Security Gate

on:
  pull_request:
    branches: [main]

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      # npm audit: fail on critical or high severity vulnerabilities.
      - name: Check for vulnerable dependencies
        run: npm audit --audit-level=high

  secret-scanning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for scanning all commits.

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep SAST
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/javascript
            p/typescript
          generateSarif: true

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif
```

### 5. Release Readiness Checklist (Automated)

```python
# scripts/release_readiness.py
"""Automated release readiness gate. Checks all quality criteria."""

import json
import subprocess
import sys
from dataclasses import dataclass


@dataclass
class GateResult:
    name: str
    passed: bool
    message: str
    blocking: bool = True  # If True, failure blocks the release.


def check_test_pass_rate() -> GateResult:
    """All tests must pass."""
    result = subprocess.run(
        ["pytest", "--tb=no", "-q", "--co", "-q"],
        capture_output=True, text=True,
    )
    total = len(result.stdout.strip().split("\n"))

    result = subprocess.run(
        ["pytest", "--tb=no", "-q"],
        capture_output=True, text=True,
    )
    # Parse "X passed, Y failed" from the last line.
    last_line = result.stdout.strip().split("\n")[-1]
    passed = "failed" not in last_line

    return GateResult(
        name="Test Pass Rate",
        passed=passed,
        message=last_line,
    )


def check_coverage() -> GateResult:
    """Coverage must meet minimum threshold."""
    with open("coverage/coverage-summary.json") as f:
        data = json.load(f)

    line_pct = data["total"]["lines"]["pct"]
    passed = line_pct >= 85

    return GateResult(
        name="Code Coverage",
        passed=passed,
        message=f"Line coverage: {line_pct}% (minimum: 85%)",
    )


def check_security_audit() -> GateResult:
    """No critical security vulnerabilities."""
    result = subprocess.run(
        ["npm", "audit", "--json"],
        capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    critical = data.get("metadata", {}).get("vulnerabilities", {}).get("critical", 0)
    high = data.get("metadata", {}).get("vulnerabilities", {}).get("high", 0)

    passed = critical == 0 and high == 0
    return GateResult(
        name="Security Audit",
        passed=passed,
        message=f"Critical: {critical}, High: {high}",
    )


def check_no_skipped_tests() -> GateResult:
    """No tests should be permanently skipped."""
    result = subprocess.run(
        ["grep", "-r", "@pytest.mark.skip", "tests/", "--count"],
        capture_output=True, text=True,
    )
    skip_count = sum(int(line.split(":")[-1]) for line in result.stdout.strip().split("\n") if line)

    passed = skip_count <= 5  # Allow up to 5 skipped tests.
    return GateResult(
        name="Skipped Tests",
        passed=passed,
        message=f"{skip_count} tests are skipped (max allowed: 5)",
        blocking=False,  # Warning, not blocking.
    )


def check_todo_count() -> GateResult:
    """Track TODO/FIXME count - should not increase."""
    result = subprocess.run(
        ["grep", "-r", "-c", "TODO\\|FIXME", "src/"],
        capture_output=True, text=True,
    )
    count = sum(int(line.split(":")[-1]) for line in result.stdout.strip().split("\n") if line)

    return GateResult(
        name="TODO/FIXME Count",
        passed=count <= 20,
        message=f"{count} TODO/FIXME items (max allowed: 20)",
        blocking=False,
    )


def main():
    gates = [
        check_test_pass_rate(),
        check_coverage(),
        check_security_audit(),
        check_no_skipped_tests(),
        check_todo_count(),
    ]

    print("=" * 60)
    print("RELEASE READINESS REPORT")
    print("=" * 60)

    blocking_failures = []
    for gate in gates:
        status = "PASS" if gate.passed else ("FAIL" if gate.blocking else "WARN")
        icon = "+" if gate.passed else "-"
        print(f"  [{icon}] {status:4s} | {gate.name}: {gate.message}")

        if not gate.passed and gate.blocking:
            blocking_failures.append(gate)

    print("=" * 60)

    if blocking_failures:
        print(f"BLOCKED: {len(blocking_failures)} blocking gate(s) failed.")
        sys.exit(1)
    else:
        print("READY: All blocking gates passed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
```

### 6. Pull Request Quality Gate (GitHub Actions)

```yaml
# .github/workflows/pr-quality-gate.yml
name: PR Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Run tests with coverage
        run: |
          npx jest --ci --coverage --json --outputFile=test-results.json

      - name: Check coverage diff
        run: |
          # Compare coverage with the base branch.
          git fetch origin main
          git checkout origin/main -- coverage/coverage-summary.json 2>/dev/null || true
          if [ -f coverage/coverage-summary.json ]; then
            node scripts/coverage-diff.js
          fi

      - name: Comment PR with results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('test-results.json', 'utf-8'));
            const passed = results.numPassedTests;
            const failed = results.numFailedTests;
            const total = results.numTotalTests;

            const body = `## Quality Gate Results
            | Metric | Value | Status |
            |--------|-------|--------|
            | Tests Passed | ${passed}/${total} | ${failed === 0 ? 'PASS' : 'FAIL'} |
            | Test Suites | ${results.numPassedTestSuites}/${results.numTotalTestSuites} | ${results.numFailedTestSuites === 0 ? 'PASS' : 'FAIL'} |
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body,
            });
```
