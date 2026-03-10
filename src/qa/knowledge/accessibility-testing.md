# Accessibility Testing

## Principle
Accessibility testing must be automated into the development workflow using axe-core and WCAG guidelines, supplemented by manual screen reader testing, to ensure applications are usable by people with disabilities.

## Rationale
Approximately 15% of the world's population lives with some form of disability. Web accessibility is not just a legal requirement (ADA, Section 508, EN 301 549) but a fundamental aspect of quality. Inaccessible applications exclude users who rely on screen readers, keyboard navigation, magnification, or alternative input devices.

Automated tools like axe-core can catch approximately 30-50% of accessibility issues: missing alt text, insufficient color contrast, missing form labels, and incorrect ARIA usage. The remaining issues require manual testing with actual assistive technologies. Playwright's built-in accessibility snapshot capabilities and axe-core integration make it practical to include a11y checks in every test run. The key is layering automation for fast feedback with periodic manual audits for thorough coverage. WCAG 2.1 Level AA is the most widely adopted conformance target, covering perceivable, operable, understandable, and robust criteria.

## Pattern Examples

### 1. axe-core Integration with Playwright

```typescript
// tests/a11y/axe-setup.ts
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface A11yFixtures {
  makeAxeBuilder: () => AxeBuilder;
}

export const test = base.extend<A11yFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('#third-party-widget')  // exclude known third-party issues
        .exclude('.ad-container');

    await use(builder);
  },
});

// Helper to format axe violations for readable output
export function formatViolations(violations: any[]): string {
  if (violations.length === 0) return 'No violations found';

  return violations
    .map((v) => {
      const nodes = v.nodes
        .map((n: any) => {
          const target = n.target.join(', ');
          const fix = n.failureSummary?.split('\n')[1]?.trim() || 'See axe documentation';
          return `    - Element: ${target}\n      Fix: ${fix}`;
        })
        .join('\n');

      return `${v.impact?.toUpperCase()} [${v.id}]: ${v.description}\n  Help: ${v.helpUrl}\n  Affected elements:\n${nodes}`;
    })
    .join('\n\n');
}

export { expect };

// tests/a11y/page-accessibility.spec.ts
import { test, expect, formatViolations } from './axe-setup';

test.describe('Page-Level Accessibility', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/products', name: 'Products' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Registration' },
    { path: '/contact', name: 'Contact' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page has no critical a11y violations`, async ({ page, makeAxeBuilder }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const results = await makeAxeBuilder().analyze();

      const criticalAndSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      if (criticalAndSerious.length > 0) {
        console.error(`\nAccessibility violations on ${name}:\n`);
        console.error(formatViolations(criticalAndSerious));
      }

      expect(
        criticalAndSerious,
        `Found ${criticalAndSerious.length} critical/serious a11y violations on ${name}`,
      ).toHaveLength(0);

      // Log moderate/minor issues as warnings
      const minor = results.violations.filter(
        (v) => v.impact === 'moderate' || v.impact === 'minor',
      );
      if (minor.length > 0) {
        console.warn(`\n${minor.length} moderate/minor a11y issues on ${name} (non-blocking)`);
      }
    });
  }

  test('authenticated pages are accessible', async ({ page, makeAxeBuilder }) => {
    // Login first
    await page.goto('/login');
    await page.locator('[data-testid="email"]').fill('test@example.com');
    await page.locator('[data-testid="password"]').fill('password123');
    await page.locator('[data-testid="login-btn"]').click();
    await page.waitForURL('/dashboard');

    const authenticatedPages = ['/dashboard', '/settings', '/orders'];

    for (const pagePath of authenticatedPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const results = await makeAxeBuilder().analyze();

      const violations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      expect(
        violations,
        `A11y violations on ${pagePath}:\n${formatViolations(violations)}`,
      ).toHaveLength(0);
    }
  });
});

// tests/a11y/component-states.spec.ts
import { test, expect, formatViolations } from './axe-setup';

test.describe('Component State Accessibility', () => {
  test('modal dialog is accessible when open', async ({ page, makeAxeBuilder }) => {
    await page.goto('/products');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="product-modal"]').waitFor({ state: 'visible' });

    const results = await makeAxeBuilder()
      .include('[data-testid="product-modal"]')
      .analyze();

    expect(results.violations).toHaveLength(0);

    // Verify modal-specific a11y requirements
    const modal = page.locator('[data-testid="product-modal"]');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby');

    // Verify focus is trapped in modal
    const focusableElements = modal.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);

    // First focusable element should have focus
    const firstFocusable = focusableElements.first();
    await expect(firstFocusable).toBeFocused();
  });

  test('form validation errors are announced to screen readers', async ({ page, makeAxeBuilder }) => {
    await page.goto('/register');

    // Submit empty form to trigger validation
    await page.locator('[data-testid="register-btn"]').click();

    const results = await makeAxeBuilder().analyze();
    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(violations).toHaveLength(0);

    // Verify error messages are linked to inputs via aria-describedby
    const emailInput = page.locator('[data-testid="email"]');
    const describedBy = await emailInput.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const errorElement = page.locator(`#${describedBy}`);
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toHaveAttribute('role', 'alert');

    // Verify input is marked as invalid
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('dropdown menu is keyboard navigable', async ({ page }) => {
    await page.goto('/');

    const menuTrigger = page.locator('[data-testid="user-menu-trigger"]');
    await menuTrigger.focus();
    await page.keyboard.press('Enter');

    const menu = page.locator('[data-testid="user-menu-dropdown"]');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('role', 'menu');

    // Arrow down should move through items
    await page.keyboard.press('ArrowDown');
    const firstItem = menu.locator('[role="menuitem"]').first();
    await expect(firstItem).toBeFocused();

    await page.keyboard.press('ArrowDown');
    const secondItem = menu.locator('[role="menuitem"]').nth(1);
    await expect(secondItem).toBeFocused();

    // Escape should close the menu
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(menuTrigger).toBeFocused(); // focus returns to trigger
  });
});
```

### 2. WCAG Compliance Checklist Testing

```typescript
// tests/a11y/wcag-checklist.spec.ts
import { test, expect } from '@playwright/test';

test.describe('WCAG 2.1 AA Compliance Checks', () => {
  test('1.1.1 - All images have meaningful alt text', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');

      // Decorative images should have alt="" or aria-hidden="true"
      // Meaningful images should have descriptive alt text
      if (ariaHidden === 'true' || role === 'presentation') {
        expect(alt === '' || alt === null, `Decorative image ${i} should have empty alt or be hidden`).toBe(true);
      } else {
        expect(alt, `Image ${i} is missing alt text`).toBeTruthy();
        expect(alt!.length, `Image ${i} alt text too short: "${alt}"`).toBeGreaterThan(2);
        expect(alt, `Image ${i} has placeholder alt text`).not.toMatch(/^image|^photo|^picture|^img/i);
      }
    }
  });

  test('1.4.3 - Text meets minimum contrast ratio (4.5:1)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const contrastIssues = await page.evaluate(() => {
      const issues: { element: string; color: string; background: string; ratio: number }[] = [];

      function luminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      function contrastRatio(l1: number, l2: number): number {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      function parseColor(color: string): [number, number, number] {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
      }

      const textElements = document.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, button');

      textElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.trim();
        if (!text || style.display === 'none' || style.visibility === 'hidden') return;

        const color = style.color;
        const bgColor = style.backgroundColor;

        if (bgColor === 'rgba(0, 0, 0, 0)') return; // transparent background, skip

        const [r1, g1, b1] = parseColor(color);
        const [r2, g2, b2] = parseColor(bgColor);
        const l1 = luminance(r1, g1, b1);
        const l2 = luminance(r2, g2, b2);
        const ratio = contrastRatio(l1, l2);

        const fontSize = parseFloat(style.fontSize);
        const isBold = parseInt(style.fontWeight) >= 700;
        const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && isBold);
        const minRatio = isLargeText ? 3 : 4.5;

        if (ratio < minRatio) {
          issues.push({
            element: `${el.tagName.toLowerCase()}: "${text.slice(0, 30)}"`,
            color,
            background: bgColor,
            ratio: Math.round(ratio * 100) / 100,
          });
        }
      });

      return issues;
    });

    if (contrastIssues.length > 0) {
      console.warn('Contrast issues found:');
      console.table(contrastIssues.slice(0, 10));
    }

    expect(contrastIssues, `Found ${contrastIssues.length} contrast violations`).toHaveLength(0);
  });

  test('2.1.1 - All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab through all interactive elements
    const focusOrder: string[] = [];
    let previousElement = '';
    let maxTabs = 100;

    while (maxTabs-- > 0) {
      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'body';
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const testId = el.getAttribute('data-testid') || '';
        return `${tag}${id}${testId ? `[${testId}]` : ''}`;
      });

      if (focused === 'body' || focused === previousElement) break;
      focusOrder.push(focused);
      previousElement = focused;
    }

    expect(focusOrder.length, 'Should have focusable elements').toBeGreaterThan(0);

    // Verify all clickable elements are in the tab order
    const clickableNotFocusable = await page.evaluate(() => {
      const missing: string[] = [];
      const clickables = document.querySelectorAll('[onclick], [data-testid*="btn"], [data-testid*="link"]');

      clickables.forEach((el) => {
        const tabindex = el.getAttribute('tabindex');
        const tag = el.tagName.toLowerCase();
        const isNativelyFocusable = ['a', 'button', 'input', 'select', 'textarea'].includes(tag);

        if (!isNativelyFocusable && tabindex !== '0') {
          missing.push(`${tag}[${el.getAttribute('data-testid') || el.textContent?.slice(0, 20)}]`);
        }
      });

      return missing;
    });

    expect(
      clickableNotFocusable,
      `These clickable elements are not keyboard accessible: ${clickableNotFocusable.join(', ')}`,
    ).toHaveLength(0);
  });

  test('2.4.7 - Focus indicators are visible', async ({ page }) => {
    await page.goto('/');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check that focus has a visible outline or ring
    const hasVisibleFocus = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const outline = style.outline;
      const boxShadow = style.boxShadow;

      return (
        (outline !== 'none' && outline !== '0px none rgb(0, 0, 0)') ||
        boxShadow !== 'none'
      );
    });

    expect(hasVisibleFocus, 'Focused element must have a visible focus indicator').toBe(true);
  });
});
```

### 3. Playwright Accessibility Snapshot Testing

```typescript
// tests/a11y/snapshots.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Accessibility Tree Snapshots', () => {
  test('navigation has correct ARIA structure', async ({ page }) => {
    await page.goto('/');

    const navSnapshot = await page.locator('nav').ariaSnapshot();

    // Verify the accessibility tree structure
    expect(navSnapshot).toContain('navigation');
    expect(navSnapshot).toMatch(/link "Home"/i);
    expect(navSnapshot).toMatch(/link "Products"/i);
    expect(navSnapshot).toMatch(/link "About"/i);
  });

  test('form has proper label associations', async ({ page }) => {
    await page.goto('/contact');

    const formSnapshot = await page.locator('form').ariaSnapshot();

    // Verify form fields are labeled
    expect(formSnapshot).toMatch(/textbox "Name"/i);
    expect(formSnapshot).toMatch(/textbox "Email"/i);
    expect(formSnapshot).toMatch(/textbox "Message"/i);
    expect(formSnapshot).toMatch(/button "Send"/i);
  });

  test('data table is accessible to screen readers', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const table = page.locator('[data-testid="orders-table"]');

    // Verify table has proper structure
    await expect(table).toHaveAttribute('role', /(table|grid)/);

    // Verify column headers
    const headers = table.locator('th, [role="columnheader"]');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);

    for (let i = 0; i < headerCount; i++) {
      const headerText = await headers.nth(i).textContent();
      expect(headerText?.trim().length, `Column header ${i} should not be empty`).toBeGreaterThan(0);
    }

    // Verify cells are properly associated with headers
    const firstRow = table.locator('tbody tr, [role="row"]').first();
    const cells = firstRow.locator('td, [role="cell"], [role="gridcell"]');
    const cellCount = await cells.count();
    expect(cellCount).toBe(headerCount);
  });

  test('live regions announce dynamic content', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify toast notifications use aria-live
    await page.locator('[data-testid="trigger-notification"]').click();

    const notification = page.locator('[data-testid="toast"]');
    await expect(notification).toBeVisible();
    await expect(notification).toHaveAttribute('role', 'alert');

    // aria-live should be assertive for important notifications
    const ariaLive = await notification.getAttribute('aria-live');
    expect(['assertive', 'polite']).toContain(ariaLive);
  });
});
```
