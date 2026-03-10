# Test Reporting

## Principle
Test reports must be structured, actionable, and automatically published so that test failures lead to quick diagnosis and resolution rather than manual log parsing.

## Rationale
Running tests is only half the battle. Without clear reporting, test results sit in CI logs that nobody reads, failures are dismissed as "probably flaky," and trends go unnoticed until quality degrades significantly. Good test reporting serves multiple audiences: developers need stack traces and screenshots to debug failures, QA leads need pass/fail trends and coverage metrics to assess release readiness, and managers need summary dashboards to understand quality health.

The reporting ecosystem spans multiple formats and tools. JUnit XML is the universal interchange format understood by every CI system. Allure provides rich interactive reports with history, categories, and attachments. HTML reporters give quick visual summaries. Custom dashboards aggregate data across test suites and runs to surface trends. The key is automating the entire pipeline from test execution to artifact publishing, so every CI run produces a browsable report without manual intervention.

## Pattern Examples

### 1. Playwright with Multiple Reporter Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    // Console output for local development
    ['list', { printSteps: true }],

    // JUnit XML for CI integration
    ['junit', {
      outputFile: 'results/junit-report.xml',
      embedAnnotationsAsProperties: true,
      embedAttachmentsAsProperty: 'testrun_evidence',
    }],

    // HTML reporter for browsable results
    ['html', {
      outputFolder: 'results/html-report',
      open: process.env.CI ? 'never' : 'on-failure',
      attachmentsBaseURL: process.env.CI
        ? 'https://artifacts.example.com/test-results/'
        : undefined,
    }],

    // JSON for custom processing
    ['json', {
      outputFile: 'results/test-results.json',
    }],

    // Custom reporter for Slack/Teams notifications
    ['./reporters/slack-reporter.ts'],
  ],

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});

// reporters/slack-reporter.ts
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

interface SlackMessage {
  channel: string;
  blocks: any[];
}

class SlackReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private flaky = 0;
  private failures: { title: string; error: string; file: string }[] = [];
  private startTime = 0;

  onBegin(_config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    const totalTests = suite.allTests().length;
    console.log(`Running ${totalTests} tests...`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    switch (result.status) {
      case 'passed':
        this.passed++;
        break;
      case 'failed':
      case 'timedOut':
        this.failed++;
        this.failures.push({
          title: test.title,
          error: result.errors[0]?.message?.slice(0, 200) || 'Unknown error',
          file: test.location.file.split('/').slice(-2).join('/'),
        });
        break;
      case 'skipped':
        this.skipped++;
        break;
    }

    if (result.status === 'passed' && result.retry > 0) {
      this.flaky++;
    }
  }

  async onEnd(result: FullResult) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const total = this.passed + this.failed + this.skipped;
    const passRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : '0';

    if (!process.env.SLACK_WEBHOOK_URL) {
      console.log('SLACK_WEBHOOK_URL not set, skipping notification');
      return;
    }

    const isSuccess = this.failed === 0;
    const emoji = isSuccess ? ':white_check_mark:' : ':x:';
    const color = isSuccess ? '#36a64f' : '#e01e5a';

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Test Run ${isSuccess ? 'Passed' : 'Failed'}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Total:* ${total}` },
          { type: 'mrkdwn', text: `*Duration:* ${duration}s` },
          { type: 'mrkdwn', text: `*Passed:* ${this.passed}` },
          { type: 'mrkdwn', text: `*Failed:* ${this.failed}` },
          { type: 'mrkdwn', text: `*Skipped:* ${this.skipped}` },
          { type: 'mrkdwn', text: `*Pass Rate:* ${passRate}%` },
        ],
      },
    ];

    if (this.flaky > 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `:warning: *${this.flaky} flaky test(s)* passed on retry` },
      });
    }

    if (this.failures.length > 0) {
      const failureList = this.failures
        .slice(0, 5)
        .map((f) => `- \`${f.file}\`: ${f.title}\n  _${f.error}_`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failures:*\n${failureList}${this.failures.length > 5 ? `\n...and ${this.failures.length - 5} more` : ''}`,
        },
      });
    }

    if (process.env.CI_BUILD_URL) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Report' },
            url: process.env.CI_BUILD_URL,
          },
        ],
      });
    }

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
  }
}

export default SlackReporter;
```

### 2. Allure Report Integration

```typescript
// playwright.config.ts (Allure section)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: true,
      categories: [
        {
          name: 'API Failures',
          matchedStatuses: ['failed'],
          messageRegex: '.*status code.*',
        },
        {
          name: 'Timeout Failures',
          matchedStatuses: ['failed'],
          messageRegex: '.*Timeout.*',
        },
        {
          name: 'Element Not Found',
          matchedStatuses: ['failed'],
          messageRegex: '.*locator.*',
        },
      ],
      environmentInfo: {
        Environment: process.env.TEST_ENV || 'local',
        Browser: 'Chromium',
        Node: process.version,
      },
    }],
  ],
});

// tests/orders/create-order.spec.ts
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Order Creation', () => {
  test('creates order with valid payment',
    async ({ page }) => {
      // Allure metadata
      await allure.owner('qa-team');
      await allure.severity('critical');
      await allure.epic('E-Commerce');
      await allure.feature('Orders');
      await allure.story('Order Creation');
      await allure.tag('smoke', 'regression');
      await allure.link('https://jira.example.com/browse/ORD-123', 'Jira Ticket');

      await allure.step('Navigate to products page', async () => {
        await page.goto('/products');
        await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
      });

      await allure.step('Add item to cart', async () => {
        await page.locator('[data-testid="product-card"]').first().click();
        await page.locator('[data-testid="add-to-cart"]').click();

        const cartCount = await page.locator('[data-testid="cart-count"]').textContent();
        await allure.parameter('Cart Items', cartCount || '0');
        expect(parseInt(cartCount || '0')).toBeGreaterThan(0);
      });

      await allure.step('Complete checkout', async () => {
        await page.goto('/checkout');
        await page.locator('[data-testid="card-number"]').fill('4111111111111111');
        await page.locator('[data-testid="card-expiry"]').fill('12/28');
        await page.locator('[data-testid="card-cvv"]').fill('123');
        await page.locator('[data-testid="place-order"]').click();
      });

      await allure.step('Verify confirmation', async () => {
        await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
        const orderId = await page.locator('[data-testid="order-id"]').textContent();
        await allure.parameter('Order ID', orderId || 'unknown');
        await allure.attachment(
          'confirmation-screenshot',
          await page.screenshot(),
          'image/png',
        );
      });
    },
  );
});
```

```yaml
# .github/workflows/test-with-allure.yml
name: Tests with Allure Report

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Download previous Allure history
        uses: actions/cache@v4
        with:
          path: allure-history
          key: allure-history-${{ github.ref }}
          restore-keys: allure-history-

      - name: Run tests
        run: npx playwright test
        continue-on-error: true

      - name: Copy history from previous runs
        run: |
          mkdir -p allure-results/history
          cp -r allure-history/history/* allure-results/history/ 2>/dev/null || true

      - name: Generate Allure report
        run: |
          npm install -g allure-commandline
          allure generate allure-results --clean -o allure-report

      - name: Save history for next run
        run: |
          mkdir -p allure-history
          cp -r allure-report/history allure-history/ 2>/dev/null || true

      - name: Deploy report to GitHub Pages
        if: always()
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: allure-report
          destination_dir: allure/${{ github.run_number }}

      - name: Post report link
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const reportUrl = `https://${context.repo.owner}.github.io/${context.repo.repo}/allure/${context.runNumber}`;
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Test Report\n\n[View Allure Report](${reportUrl})\n\nRun #${context.runNumber}`,
            });
```

### 3. Custom Dashboard Data Aggregation

```typescript
// scripts/aggregate-test-results.ts
import * as fs from 'fs';
import * as path from 'path';

interface TestRunSummary {
  runId: string;
  timestamp: string;
  branch: string;
  commit: string;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  passRate: number;
  suites: SuiteSummary[];
  slowestTests: { name: string; duration: number }[];
  failedTests: { name: string; error: string; file: string }[];
}

interface SuiteSummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  duration: number;
}

function parseJUnitXML(xmlContent: string): TestRunSummary {
  // Simplified XML parsing (in practice, use xml2js or fast-xml-parser)
  const testsuites = xmlContent.match(/<testsuite[^>]*>/g) || [];
  const testcases = xmlContent.match(/<testcase[^>]*>[\s\S]*?<\/testcase>|<testcase[^/]*\/>/g) || [];

  let total = 0, passed = 0, failed = 0, skipped = 0;
  const failedTests: { name: string; error: string; file: string }[] = [];
  const testDurations: { name: string; duration: number }[] = [];

  for (const tc of testcases) {
    total++;
    const name = tc.match(/name="([^"]+)"/)?.[1] || 'Unknown';
    const time = parseFloat(tc.match(/time="([^"]+)"/)?.[1] || '0');
    const file = tc.match(/classname="([^"]+)"/)?.[1] || '';

    testDurations.push({ name, duration: time });

    if (tc.includes('<failure') || tc.includes('<error')) {
      failed++;
      const errorMsg = tc.match(/<failure[^>]*message="([^"]+)"/)?.[1] || 'Test failed';
      failedTests.push({ name, error: errorMsg, file });
    } else if (tc.includes('<skipped')) {
      skipped++;
    } else {
      passed++;
    }
  }

  testDurations.sort((a, b) => b.duration - a.duration);

  return {
    runId: process.env.CI_RUN_ID || `local-${Date.now()}`,
    timestamp: new Date().toISOString(),
    branch: process.env.GIT_BRANCH || 'unknown',
    commit: process.env.GIT_SHA || 'unknown',
    duration: testDurations.reduce((sum, t) => sum + t.duration, 0),
    total,
    passed,
    failed,
    skipped,
    flaky: 0,
    passRate: total > 0 ? (passed / total) * 100 : 0,
    suites: [],
    slowestTests: testDurations.slice(0, 10),
    failedTests,
  };
}

function appendToHistory(summary: TestRunSummary, historyFile: string): void {
  let history: TestRunSummary[] = [];

  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
  }

  history.push(summary);

  // Keep last 100 runs
  if (history.length > 100) {
    history = history.slice(-100);
  }

  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function detectTrends(history: TestRunSummary[]): string[] {
  const warnings: string[] = [];

  if (history.length < 5) return warnings;

  const recent = history.slice(-5);
  const avgPassRate = recent.reduce((sum, r) => sum + r.passRate, 0) / recent.length;
  const avgDuration = recent.reduce((sum, r) => sum + r.duration, 0) / recent.length;

  if (avgPassRate < 95) {
    warnings.push(`Pass rate trending low: ${avgPassRate.toFixed(1)}% (last 5 runs)`);
  }

  const previousAvgDuration =
    history.slice(-10, -5).reduce((sum, r) => sum + r.duration, 0) / 5;
  if (avgDuration > previousAvgDuration * 1.2) {
    warnings.push(
      `Test duration increased by ${(((avgDuration - previousAvgDuration) / previousAvgDuration) * 100).toFixed(0)}% compared to previous period`,
    );
  }

  const consecutiveFailures = recent.filter((r) => r.failed > 0).length;
  if (consecutiveFailures >= 3) {
    warnings.push(`${consecutiveFailures} of last 5 runs have failures`);
  }

  return warnings;
}

// Main
const junitPath = process.argv[2] || 'results/junit-report.xml';
const historyPath = process.argv[3] || 'results/test-history.json';

if (fs.existsSync(junitPath)) {
  const xml = fs.readFileSync(junitPath, 'utf-8');
  const summary = parseJUnitXML(xml);

  console.log(`\n=== Test Run Summary ===`);
  console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`);
  console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`);
  console.log(`Duration: ${summary.duration.toFixed(1)}s`);

  if (summary.failedTests.length > 0) {
    console.log(`\nFailed Tests:`);
    for (const t of summary.failedTests) {
      console.log(`  - ${t.name}: ${t.error}`);
    }
  }

  appendToHistory(summary, historyPath);

  const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  const trends = detectTrends(history);
  if (trends.length > 0) {
    console.log(`\nTrend Warnings:`);
    for (const w of trends) {
      console.log(`  ⚠ ${w}`);
    }
  }
} else {
  console.error(`JUnit report not found: ${junitPath}`);
  process.exit(1);
}
```
