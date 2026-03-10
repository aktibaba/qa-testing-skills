# Visual Regression Testing

## Principle
Visual regression testing captures and compares screenshots of UI components and pages to detect unintended visual changes, providing a safety net that unit and integration tests cannot offer.

## Rationale
Functional tests verify that elements exist and behave correctly, but they cannot detect that a CSS change shifted a button off-screen, that a font failed to load, or that overlapping z-indices created an unreadable layout. Visual regression testing fills this gap by comparing pixel-level snapshots against approved baselines.

The key challenge is managing false positives. Anti-aliasing differences across operating systems, dynamic content like timestamps, and animation states can all produce meaningless diffs. Effective visual testing requires thoughtful threshold configuration, masking of dynamic regions, consistent test environments (typically Docker-based), and a workflow for reviewing and approving intentional changes. When integrated into CI, visual regression tests become a powerful gate that prevents subtle UI regressions from reaching production.

## Pattern Examples

### 1. Playwright Visual Comparison with Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/__screenshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{testName}/{projectName}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 50,
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  use: {
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 13'],
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});

// tests/visual/homepage.visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations and transitions for stable screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test('hero section renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for hero image to load
    await page.locator('[data-testid="hero-image"]').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve);
          })),
      );
    });

    const heroSection = page.locator('[data-testid="hero-section"]');
    await expect(heroSection).toHaveScreenshot('hero-section.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('full page screenshot with dynamic content masked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="live-clock"]'),
        page.locator('[data-testid="trending-count"]'),
        page.locator('[data-testid="user-avatar"]'),
        page.locator('.ad-banner'),
      ],
      maskColor: '#808080',
    });
  });

  test('navigation dropdown visual state', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="products-menu-trigger"]').hover();
    await page.locator('[data-testid="products-dropdown"]').waitFor({ state: 'visible' });

    // Wait for dropdown animation to complete
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="products-dropdown"]')).toHaveScreenshot(
      'products-dropdown.png',
      { maxDiffPixels: 30 },
    );
  });

  test('responsive layout at multiple breakpoints', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const breakpoints = [
      { width: 375, height: 812, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop-large' },
    ];

    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.waitForTimeout(200); // allow layout to settle

      await expect(page).toHaveScreenshot(`products-${bp.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.01,
      });
    }
  });
});
```

### 2. Component-Level Visual Testing with Storybook

```typescript
// tests/visual/components.visual.spec.ts
import { test, expect } from '@playwright/test';

const STORYBOOK_URL = 'http://localhost:6006';

interface StoryConfig {
  id: string;
  name: string;
  variants?: Record<string, string>;
  waitForSelector?: string;
  threshold?: number;
}

const stories: StoryConfig[] = [
  {
    id: 'components-button--primary',
    name: 'button-primary',
    variants: {
      default: '',
      hover: '&args=pseudo:hover',
      disabled: '&args=disabled:true',
      loading: '&args=loading:true',
    },
  },
  {
    id: 'components-card--product-card',
    name: 'product-card',
    waitForSelector: '.card-image',
    threshold: 0.15,
  },
  {
    id: 'components-form--login-form',
    name: 'login-form',
    variants: {
      empty: '',
      filled: '&args=prefilled:true',
      error: '&args=showErrors:true',
    },
  },
  {
    id: 'components-datatable--with-data',
    name: 'data-table',
    waitForSelector: 'tbody tr',
  },
];

test.describe('Component Visual Regression', () => {
  for (const story of stories) {
    const variants = story.variants ?? { default: '' };

    for (const [variantName, variantArgs] of Object.entries(variants)) {
      test(`${story.name} - ${variantName}`, async ({ page }) => {
        const url = `${STORYBOOK_URL}/iframe.html?id=${story.id}${variantArgs}&viewMode=story`;
        await page.goto(url);

        if (story.waitForSelector) {
          await page.locator(story.waitForSelector).first().waitFor({ state: 'visible' });
        }

        await page.waitForLoadState('networkidle');

        // Isolate the story root for clean screenshots
        const storyRoot = page.locator('#storybook-root > *').first();

        await expect(storyRoot).toHaveScreenshot(
          `${story.name}-${variantName}.png`,
          {
            threshold: story.threshold ?? 0.2,
            maxDiffPixels: 20,
          },
        );
      });
    }
  }
});

// tests/visual/theme-switching.visual.spec.ts
test.describe('Theme Visual Tests', () => {
  const pages = ['/', '/products', '/pricing', '/contact'];

  for (const pagePath of pages) {
    test(`dark theme - ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Toggle dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(200);

      const pageName = pagePath === '/' ? 'home' : pagePath.slice(1);
      await expect(page).toHaveScreenshot(`${pageName}-dark.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        mask: [page.locator('[data-dynamic]')],
      });
    });
  }
});
```

### 3. CI Integration and Diff Management

```yaml
# .github/workflows/visual-tests.yml
name: Visual Regression Tests

on:
  pull_request:
    paths:
      - 'src/components/**'
      - 'src/styles/**'
      - 'src/pages/**'
      - 'tests/visual/**'

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.44.0-jammy

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Start application
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:3000 --timeout 60000

      - name: Run visual tests
        run: npx playwright test --project=chromium-desktop tests/visual/
        env:
          CI: true

      - name: Upload diff artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff-report
          path: |
            tests/visual/__screenshots__/*-diff.png
            tests/visual/__screenshots__/*-actual.png
            test-results/
          retention-days: 14

      - name: Comment PR with visual diff summary
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');

            const diffDir = 'tests/visual/__screenshots__';
            let diffFiles = [];
            try {
              const walkDir = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                  const fullPath = path.join(dir, entry.name);
                  if (entry.isDirectory()) walkDir(fullPath);
                  else if (entry.name.endsWith('-diff.png')) diffFiles.push(fullPath);
                }
              };
              walkDir(diffDir);
            } catch (e) {}

            if (diffFiles.length > 0) {
              const body = [
                '## Visual Regression Failures',
                '',
                `Found **${diffFiles.length}** visual difference(s).`,
                '',
                'Download the `visual-diff-report` artifact to review the diffs.',
                '',
                '| Screenshot | Status |',
                '|---|---|',
                ...diffFiles.map(f => `| \`${path.basename(f).replace('-diff.png', '')}\` | Changed |`),
                '',
                'To update baselines, run:',
                '```bash',
                'UPDATE_SNAPSHOTS=true npx playwright test tests/visual/',
                '```',
              ].join('\n');

              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
```

```typescript
// scripts/update-visual-baselines.ts
// Helper script to selectively update visual baselines
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const SCREENSHOT_DIR = 'tests/visual/__screenshots__';

async function main() {
  const diffFiles: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('-actual.png')) diffFiles.push(full);
    }
  }

  walk(SCREENSHOT_DIR);

  if (diffFiles.length === 0) {
    console.log('No visual diffs found. Run tests first.');
    return;
  }

  console.log(`Found ${diffFiles.length} visual diff(s):\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  for (const actualFile of diffFiles) {
    const expectedFile = actualFile.replace('-actual.png', '.png');
    const diffFile = actualFile.replace('-actual.png', '-diff.png');
    const name = path.basename(actualFile).replace('-actual.png', '');

    console.log(`  ${name}`);
    const answer = await ask('  Accept this change? (y/n/q): ');

    if (answer.toLowerCase() === 'q') break;
    if (answer.toLowerCase() === 'y') {
      fs.copyFileSync(actualFile, expectedFile);
      fs.unlinkSync(actualFile);
      if (fs.existsSync(diffFile)) fs.unlinkSync(diffFile);
      console.log(`  Updated baseline for ${name}\n`);
    } else {
      console.log(`  Skipped ${name}\n`);
    }
  }

  rl.close();
  console.log('Done. Commit updated baselines to finalize.');
}

main();
```
