---
name: 'step-05-visual-a11y'
description: 'Add visual regression and accessibility tests'
nextStepFile: './step-06-validate-and-summary.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 5: Visual Regression and Accessibility Tests

## STEP GOAL
Add visual regression testing (screenshot comparison) and accessibility scanning (axe-core) to the test suite, covering key pages and critical UI states.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Visual tests must mask dynamic content (timestamps, avatars, randomized data)
- Accessibility violations must be treated as test failures, not warnings

## CONTEXT BOUNDARIES
- Available context: page inventory from Step 1, generated tests from Step 4
- Required knowledge fragments: `visual-regression` (12), `accessibility-testing` (27)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 5.1 — Configure Visual Regression

**Playwright:**
Visual regression is built-in with `toHaveScreenshot()`:

```typescript
// playwright.config.ts additions
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference
    threshold: 0.2,            // Color threshold per pixel
    animations: 'disabled',    // Freeze CSS animations
  },
},
snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
```

**Cypress:**
Install `cypress-image-snapshot`:
```bash
npm install -D cypress-image-snapshot @types/cypress-image-snapshot
```

Configure in support file:
```typescript
import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command';
addMatchImageSnapshotCommand({
  failureThreshold: 0.01,
  failureThresholdType: 'percent',
});
```

### 5.2 — Generate Visual Regression Tests

Create visual tests for key pages and states:

**File naming:** `specs/visual/<page-name>.visual.spec.ts`

For each key page:
1. **Default state** — Page fully loaded with typical data
2. **Empty state** — Page with no data (empty lists, no results)
3. **Error state** — Page showing error messages
4. **Responsive states** — Mobile (375px) and tablet (768px) viewports

**Masking strategy for dynamic content:**
```typescript
// Mask dynamic elements before screenshot
await page.evaluate(() => {
  document.querySelectorAll('[data-testid="timestamp"]').forEach(el => {
    el.textContent = '2024-01-01 12:00:00';
  });
  document.querySelectorAll('[data-testid="avatar"]').forEach(el => {
    el.style.visibility = 'hidden';
  });
});

await expect(page).toHaveScreenshot('dashboard-default.png');
```

Alternative: Use `mask` option to cover dynamic regions:
```typescript
await expect(page).toHaveScreenshot('dashboard.png', {
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="avatar"]'),
  ],
});
```

### 5.3 — Configure Accessibility Testing

**Install axe-core integration:**

Playwright:
```bash
npm install -D @axe-core/playwright
```

Cypress:
```bash
npm install -D cypress-axe axe-core
```

### 5.4 — Generate Accessibility Tests

Create accessibility scan tests for all key pages:

**File naming:** `specs/a11y/<page-name>.a11y.spec.ts`

**Playwright example:**
```typescript
/**
 * Accessibility Test: <Page Name>
 * Scans for WCAG 2.1 AA violations using axe-core.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('<Page Name> — Accessibility', () => {
  test('should have no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/<route>');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('[data-testid="third-party-widget"]')  // Exclude 3rd-party embeds
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have no violations in error state', async ({ page }) => {
    // Trigger error state
    await page.goto('/<route>');
    // ... trigger validation errors
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### 5.5 — Keyboard Navigation Tests

Generate keyboard navigation tests for critical interactive flows:

```typescript
test('should support keyboard navigation through login form', async ({ page }) => {
  await page.goto('/login');

  // Tab to email field
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="login-email"]')).toBeFocused();

  // Tab to password field
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="login-password"]')).toBeFocused();

  // Tab to submit button and Enter to submit
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
  await page.keyboard.press('Enter');
});

test('should close modal with Escape key', async ({ page }) => {
  // Open modal
  await page.click('[data-testid="open-modal"]');
  await expect(page.locator('[data-testid="modal"]')).toBeVisible();

  // Escape closes modal
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();

  // Focus returns to trigger element
  await expect(page.locator('[data-testid="open-modal"]')).toBeFocused();
});
```

### 5.6 — Generate Baseline Screenshots

Provide instructions for baseline generation:

```bash
# Generate initial baseline screenshots (run once on a clean state)
npx playwright test --update-snapshots specs/visual/

# Review baselines before committing
ls tests/e2e/__screenshots__/
```

Document the baseline update process:
1. Run tests to generate baselines
2. Review screenshots visually
3. Commit baselines to version control
4. CI will compare future runs against committed baselines
5. When intentional UI changes are made, re-run with `--update-snapshots` and commit new baselines

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 5 Complete — Visual & A11y Tests Added

## Visual Regression Tests
| File                           | Page       | States Covered | Viewports |
|--------------------------------|------------|----------------|-----------|
| specs/visual/home.visual.spec  | Home       | 3              | 2         |
| ...                            | ...        | ...            | ...       |

## Accessibility Tests
| File                        | Page       | WCAG Level | Exclusions |
|-----------------------------|------------|------------|------------|
| specs/a11y/home.a11y.spec   | Home       | AA         | none       |
| ...                         | ...        | ...        | ...        |

## Keyboard Navigation Tests
- Login form tab order
- Modal escape/focus management
- ...

## Baseline Status
- Baselines generated: <yes/no — pending user execution>
- Baseline update command documented: yes

## Next Step: step-06-validate-and-summary.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: Visual tests cover at least 3 key pages with dynamic masking configured, axe-core integrated and scanning for WCAG 2.1 AA, keyboard navigation tested for at least 1 critical flow, baseline generation documented
### FAILURE: No visual regression tests generated, accessibility scanning not integrated, no masking for dynamic content, keyboard navigation ignored
