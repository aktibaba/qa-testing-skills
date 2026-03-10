---
name: 'qa-ui-checklist'
description: 'UI/E2E Test Quality Checklist'
---

# UI/E2E Test Quality Checklist

Use this checklist to score existing or newly generated UI test suites. Each item is scored PASS / FAIL / N/A.

---

## 1. Selector Resilience

- [ ] **1.1** All selectors use `data-testid`, ARIA roles (`getByRole`), labels (`getByLabel`), or semantic text (`getByText`)
- [ ] **1.2** No selectors rely on CSS class names, auto-generated IDs, or fragile XPath expressions
- [ ] **1.3** No selectors use positional indices (`nth-child`, `[0]`) as the primary locator strategy
- [ ] **1.4** Selectors are centralized in page objects or constants — not duplicated across test files
- [ ] **1.5** Custom `data-testid` attributes are added to source components for critical interactive elements

## 2. Wait Strategies

- [ ] **2.1** No hard-coded `sleep()`, `wait(ms)`, or fixed-duration delays exist in any test
- [ ] **2.2** Tests use explicit waits: `waitForSelector`, `waitForResponse`, `waitForNavigation`, or equivalent
- [ ] **2.3** Timeout values are configurable via environment variables or test config (not inline magic numbers)
- [ ] **2.4** Network requests are awaited or intercepted before asserting on their results
- [ ] **2.5** Retry logic exists for inherently flaky operations (file uploads, third-party redirects)

## 3. Test Isolation

- [ ] **3.1** Each test can run independently — no test depends on another test's state or execution order
- [ ] **3.2** Test data is created via API calls, database seeding, or fixtures — not through UI interactions in `beforeAll`
- [ ] **3.3** Tests clean up after themselves or use isolated contexts (browser contexts, incognito modes)
- [ ] **3.4** Authentication state is established via API/token injection, not by logging in through the UI for every test
- [ ] **3.5** Parallel execution is supported — tests do not share mutable global state

## 4. Page Object Model (POM)

- [ ] **4.1** A dedicated `pages/` or `models/` directory exists with one file per page or major component
- [ ] **4.2** Page objects encapsulate selectors and interaction methods — tests do not access raw DOM
- [ ] **4.3** Page objects expose semantic actions (`login(user, pass)`, `addToCart(item)`) not low-level steps
- [ ] **4.4** Navigation between pages returns the target page object for fluent chaining
- [ ] **4.5** Shared components (navbar, modals, forms) have reusable component objects
- [ ] **4.6** Page objects include built-in validation methods (`isLoaded()`, `hasError()`)

## 5. Visual Regression

- [ ] **5.1** Visual regression tests exist for key pages and critical UI states
- [ ] **5.2** Baseline screenshots are committed to version control with clear naming
- [ ] **5.3** Comparison threshold is configured (e.g., 0.1% pixel diff) — not using pixel-perfect matching
- [ ] **5.4** Dynamic content (timestamps, avatars, ads) is masked or frozen during visual captures
- [ ] **5.5** Visual tests run on a consistent viewport size and browser version
- [ ] **5.6** A process exists to update baselines when intentional UI changes are made

## 6. Accessibility (a11y)

- [ ] **6.1** axe-core or equivalent accessibility engine is integrated into the test suite
- [ ] **6.2** Key pages are scanned for WCAG 2.1 AA violations as part of the test run
- [ ] **6.3** Accessibility violations are treated as test failures, not warnings
- [ ] **6.4** Keyboard navigation is tested for critical flows (tab order, focus management, escape to close)
- [ ] **6.5** Color contrast and text scaling are validated on primary content pages

## 7. Test Structure and Readability

- [ ] **7.1** Test file names clearly indicate the user flow being tested (e.g., `checkout-flow.spec.ts`)
- [ ] **7.2** `describe`/`test` block names read as user stories ("User can add item to cart and checkout")
- [ ] **7.3** Each test file has a header comment explaining scope, preconditions, and tested flow
- [ ] **7.4** Test files contain fewer than 200 lines — large files are split by sub-flow
- [ ] **7.5** Magic values are extracted into constants or fixture files

## 8. CI/CD Integration

- [ ] **8.1** Tests run in CI with headless browser configuration
- [ ] **8.2** Test reports (HTML, JUnit XML) are generated and archived as CI artifacts
- [ ] **8.3** Failure screenshots and trace files are captured automatically on test failure
- [ ] **8.4** Tests have a reasonable timeout (per-test and global) configured in CI
- [ ] **8.5** Parallel execution or sharding is configured for suites exceeding 5 minutes

---

## SCORING

| Rating       | Criteria                              |
|-------------|---------------------------------------|
| **EXCELLENT** | 90-100% PASS across all sections     |
| **GOOD**      | 75-89% PASS, no FAIL in sections 1-3 |
| **NEEDS WORK**| 50-74% PASS or any FAIL in section 1 |
| **POOR**      | Below 50% PASS                       |
