---
name: 'step-01-preflight'
description: 'Detect UI framework, browser automation tool, and gather pages/components'
nextStepFile: './step-02-design-test-plan.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1: Preflight — Project Discovery and Framework Detection

## STEP GOAL
Analyze the project to detect the UI framework, browser automation tool, identify all pages and components, and establish the foundation for test planning.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Do NOT generate any test files in this step — discovery only
- Record all findings in the progress artifact

## CONTEXT BOUNDARIES
- Available context: project source tree, package manifests, existing config files
- Required knowledge fragments: `selector-resilience` (09), `page-object-model` (11)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 1.1 — Detect UI Framework

Scan the project to identify the frontend framework:

- **package.json** — Check `dependencies` and `devDependencies` for:
  - `react`, `react-dom` → React
  - `vue`, `nuxt` → Vue
  - `@angular/core` → Angular
  - `svelte`, `@sveltejs/kit` → Svelte
  - `next` → Next.js (React-based)
  - `gatsby` → Gatsby (React-based)
  - `astro` → Astro
- **File extensions** — `.jsx`, `.tsx`, `.vue`, `.svelte`, `.angular`
- **Config files** — `next.config.js`, `nuxt.config.ts`, `angular.json`, `svelte.config.js`
- **Non-JS frameworks** — Check for Rails views, Django templates, Laravel Blade, Phoenix LiveView

Record: `ui_framework: <detected>`

### 1.2 — Detect Browser Automation Tool

If `{browser_automation}` is `auto`, detect from:

1. **package.json dependencies:**
   - `@playwright/test` → Playwright
   - `cypress` → Cypress
   - `selenium-webdriver`, `webdriverio` → Selenium/WebdriverIO
   - `puppeteer` → Puppeteer
2. **Config files:**
   - `playwright.config.ts` / `playwright.config.js`
   - `cypress.config.js` / `cypress.config.ts` / `cypress.json`
   - `wdio.conf.js` / `wdio.conf.ts`
3. **Existing test directories:**
   - `cypress/` → Cypress
   - `e2e/` or `tests/e2e/` → Likely Playwright
4. **If nothing detected:** Recommend **Playwright** as default (fastest, multi-browser, best DX)

Record: `browser_automation: <detected or recommended>`

### 1.3 — Map Application Pages and Routes

Build an inventory of all user-facing pages:

1. **Route definitions:** Scan router config files:
   - React Router: `routes.tsx`, `App.tsx` (Route components)
   - Next.js: `app/` or `pages/` directory structure
   - Vue Router: `router/index.ts`
   - Angular: `app-routing.module.ts`
   - Server-rendered: URL patterns in routing files
2. **Navigation components:** Find navbar, sidebar, menu components to discover page links
3. **For each page, record:**
   - Route path (e.g., `/dashboard`, `/settings/profile`)
   - Page component file
   - Key interactive elements (forms, buttons, data tables)
   - Authentication requirement (public / authenticated / admin)
   - Data dependencies (API calls made on load)

Output a structured page inventory table.

### 1.4 — Identify Key Components

Catalog reusable interactive components that will need component-level page objects:

- Forms (login, registration, search, data entry)
- Modals and dialogs
- Data tables with pagination/sorting/filtering
- File upload widgets
- Navigation menus and breadcrumbs
- Toast notifications and alerts
- Date pickers, dropdowns, and complex inputs

### 1.5 — Assess Current Test State

Check for any existing E2E or UI tests:

- Count existing test files and their locations
- Identify which pages/flows already have coverage
- Note any test utilities, helpers, or fixtures already in place
- Check for existing `data-testid` attributes in the source code
- Evaluate quality of existing tests against the checklist (quick scan, not full audit)

### 1.6 — Environment and Auth Assessment

- How does the app authenticate users? (session cookies, JWT, OAuth, SSO)
- Is there a test/staging environment available?
- Can test users be created via API or database seeding?
- Are there environment variables needed for test execution?

### Save Progress

Save the following to {outputFile}:

```markdown
# UI/E2E Workflow Progress

## Status: Step 1 Complete — Preflight

## Detected Configuration
- UI Framework: <value>
- Browser Automation: <value>
- Node/Runtime Version: <value>
- Package Manager: <value>

## Page Inventory
| Route | Component | Auth Required | Key Elements | Priority |
|-------|-----------|---------------|--------------|----------|
| ...   | ...       | ...           | ...          | ...      |

## Key Components
- <component list>

## Existing Test State
- Test files found: <count>
- Coverage gaps: <list>
- Existing helpers: <list>

## Auth/Environment
- Auth method: <value>
- Test environment: <value>
- Test user creation: <value>

## Next Step: step-02-design-test-plan.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: UI framework detected, browser automation tool selected, page inventory contains at least 3 routes, component catalog populated, auth method identified
### FAILURE: Unable to detect UI framework, no pages/routes found, unable to determine authentication approach
