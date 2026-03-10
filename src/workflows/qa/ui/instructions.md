---
name: 'qa-ui-instructions'
description: 'UI/E2E Testing Workflow — Master instructions'
---

# UI/E2E Testing Workflow — Instructions

## PURPOSE

This workflow produces production-grade UI/E2E test suites that verify critical user journeys through browser automation. It covers framework setup, Page Object Model architecture, test generation, visual regression, and accessibility validation.

## GUIDING PRINCIPLES

1. **Risk-based prioritization** — Test the flows that matter most to users and revenue first. Not every page needs E2E coverage; focus on critical paths (auth, checkout, core CRUD, onboarding).

2. **Resilient selectors** — Always prefer `data-testid` attributes, ARIA roles, or semantic selectors. Never rely on CSS class names, XPath with positional indices, or auto-generated IDs.

3. **Explicit waits over implicit** — Use `waitForSelector`, `waitForResponse`, or framework-native waiting mechanisms. Never use `sleep()` or fixed-duration waits.

4. **Test isolation** — Each test must be independent. Use API calls or database seeding for setup, not UI flows. Tests must not depend on execution order.

5. **Page Object Model** — Abstract page interactions into reusable page objects or component models. Test files should read like user stories, not DOM manipulation scripts.

6. **Visual regression as a safety net** — Screenshot comparison catches CSS regressions that functional tests miss. Configure appropriate thresholds and maintain baseline images in version control.

7. **Accessibility is not optional** — Every generated test suite must include axe-core or equivalent accessibility scans on key pages.

## FRAMEWORK SELECTION LOGIC

When `{browser_automation}` is set to `auto`, detect the framework by scanning:

1. `package.json` dependencies for `@playwright/test`, `cypress`, `selenium-webdriver`, `puppeteer`
2. Config files: `playwright.config.ts`, `cypress.config.js`, `wdio.conf.js`
3. Existing test directories: `e2e/`, `cypress/`, `tests/e2e/`

Priority order when nothing is detected:
1. **Playwright** — Best default: fast, multi-browser, built-in assertions, trace viewer
2. **Cypress** — If project is heavily React/Vue and team prefers component testing
3. **Selenium** — If project requires legacy browser support or uses Java/.NET stack

## OUTPUT STANDARDS

- All test files must include descriptive `describe`/`test` blocks with clear naming
- Each test file must have a header comment explaining what user flow it covers
- Page objects must be in a dedicated `pages/` or `models/` directory
- Config must support both local and CI execution
- Test data must be externalized (fixtures, factories, or API seeding)

## ARTIFACT TRACKING

All progress is tracked in `{test_artifacts}/workflow-progress.md`. This file records:
- Current step and status
- Detected configuration
- Generated files list
- Validation results
- Any blockers or decisions needed

## KNOWLEDGE FRAGMENTS

Relevant fragments from qa-index.csv:
- `selector-resilience` (09) — Resilient selector patterns
- `page-object-model` (11) — POM architecture
- `visual-regression` (12) — Visual regression testing
- `accessibility-testing` (27) — WCAG and axe patterns
- `network-first-testing` (10) — Network mocking for E2E
- `retry-and-timeout-patterns` (30) — Wait and retry strategies
- `test-isolation` (07) — Isolation patterns
- `test-data-management` (06) — Data setup strategies
- `flaky-test-management` (21) — Anti-flakiness measures
