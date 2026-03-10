---
name: 'step-03-setup-framework'
description: 'Setup browser automation framework configuration and test helpers'
nextStepFile: './step-04-generate-tests.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 3: Setup Framework — Configure Browser Automation and Helpers

## STEP GOAL
Install and configure the browser automation framework, create the project scaffolding (page objects directory, helpers, fixtures), and set up configuration for both local and CI execution.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Generate config and helper files only — no test files yet
- All config must support headless CI execution

## CONTEXT BOUNDARIES
- Available context: detected framework from Step 1, test plan from Step 2
- Required knowledge fragments: `page-object-model` (11), `retry-and-timeout-patterns` (30), `network-first-testing` (10)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 3.1 — Install Dependencies

Generate the installation command based on detected framework:

**Playwright:**
```bash
npm init playwright@latest
# or
npx playwright install --with-deps
```

**Cypress:**
```bash
npm install -D cypress @testing-library/cypress
```

**Selenium/WebdriverIO:**
```bash
npm install -D webdriverio @wdio/cli @wdio/local-runner @wdio/mocha-framework
```

Present the command to the user; do not auto-execute package installs.

### 3.2 — Create Framework Configuration

Generate the main config file tailored to the project:

**Playwright — `playwright.config.ts`:**
- `testDir`: pointing to `{test_dir}/e2e`
- `retries`: 2 in CI, 0 locally
- `workers`: auto-detect in CI, use available CPUs
- `use.baseURL`: from environment variable `BASE_URL` with sensible default
- `use.trace`: `on-first-retry` for debugging
- `use.screenshot`: `only-on-failure`
- `projects`: configured per browser matrix from Step 2
- `reporter`: `html` for local, `junit` for CI
- `outputDir`: `{test_artifacts}/playwright-results`

**Cypress — `cypress.config.ts`:**
- `e2e.baseUrl`: from environment variable
- `e2e.specPattern`: `{test_dir}/e2e/**/*.cy.{ts,js}`
- `e2e.supportFile`: `{test_dir}/e2e/support/e2e.ts`
- `retries.runMode`: 2
- `video`: true
- `screenshotOnRunFailure`: true
- `viewportWidth` / `viewportHeight`: from browser matrix

### 3.3 — Create Directory Structure

Generate the following directory structure:

```
{test_dir}/e2e/
  pages/               # Page Object Model files
  fixtures/            # Test data fixtures (JSON/TS)
  helpers/             # Utility functions
  support/             # Framework support files (custom commands, global hooks)
  specs/               # Test specification files (created in Step 4)
```

### 3.4 — Create Base Page Object

Generate a base page object class that all page objects extend:

```typescript
// pages/base.page.ts
export class BasePage {
  constructor(protected page: Page) {}

  async navigate(path: string): Promise<void> { /* ... */ }
  async waitForPageLoad(): Promise<void> { /* ... */ }
  async getTitle(): Promise<string> { /* ... */ }
  async screenshot(name: string): Promise<void> { /* ... */ }
  async isLoaded(): Promise<boolean> { /* ... */ }
}
```

This must include:
- Navigation helper with base URL resolution
- Page load detection (networkidle or DOM ready)
- Screenshot capture method
- `isLoaded()` assertion method that checks for a page-specific element

### 3.5 — Create Auth Helper

Generate an authentication helper based on the auth method detected in Step 1:

- **Cookie/Session:** Login via API, inject session cookie into browser context
- **JWT:** Obtain token via API, set in localStorage or cookie
- **OAuth:** Use a test bypass or mock OAuth provider
- **Basic Auth:** Embed credentials in URL or use HTTP authentication

The helper must support:
- `loginAsUser(role)` — Pre-authenticated state without UI interaction
- `logout()` — Clear authentication state
- Multiple user roles (regular user, admin, etc.)

### 3.6 — Create Test Data Helpers

Generate helpers for test data management:

- **Fixture loader** — Load JSON fixtures from the `fixtures/` directory
- **API seeder** — Create test entities via API calls (if API endpoints available)
- **Cleanup utility** — Delete created test data after test runs
- **Data factories** — Generate randomized but valid test data (faker-based)

### 3.7 — Create Global Hooks

Generate setup/teardown hooks:

- **Global setup:** Start dev server if needed, verify app health, seed base data
- **Global teardown:** Clean up test data, stop services
- **Per-test hooks:** Clear browser state, reset to known URL

### 3.8 — Create Environment Configuration

Generate `.env.test` template:

```env
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/api
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=<configure-me>
CI=false
```

Add to `.gitignore` if not already present: `.env.test.local`

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 3 Complete — Framework Configured

## Generated Files
- Config: <config file path>
- Base Page Object: <path>
- Auth Helper: <path>
- Data Helpers: <path>
- Global Hooks: <path>
- Env Template: <path>

## Directory Structure
<tree output>

## Install Command (pending user execution)
<command>

## Next Step: step-04-generate-tests.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: Framework config generated with CI support, base page object created, auth helper matches detected auth method, directory structure in place, at least one fixture file created
### FAILURE: Config missing CI settings, no page object base class, auth helper not adapted to project's auth method
