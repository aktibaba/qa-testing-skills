# QA UI Testing Skill: AI-Powered E2E Browser Test Generation

**Your AI agent now writes Playwright, Cypress, and Selenium tests like a senior SDET.**

---

## The Problem

E2E tests are the most valuable and the most painful to write. Flaky selectors, auth flows, visual regressions, accessibility checks — it takes weeks to build a solid suite. Most teams give up halfway.

## What qa-ui Does

The `qa-ui` skill transforms any AI agent into a browser automation expert that generates complete, maintainable E2E test suites using Page Object Model patterns and resilient selectors.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Discovery
The agent scans your frontend and detects:
- UI framework (React, Vue, Angular, Next.js, etc.)
- Existing browser automation tool or recommends one
- Pages, routes, and navigation structure
- Authentication method and login flow

### Step 2 — Risk-Based Test Plan
Critical user flows get tested first:

| Priority | Flow | Example |
|----------|------|---------|
| **P0** | Auth + core transaction | Login → Add to cart → Checkout |
| **P1** | Key business flows | Search, filter, user profile |
| **P2** | Supporting flows | Settings, help pages |

Browser/viewport matrix is defined:
- Desktop (1280x720)
- Tablet (768x1024)
- Mobile (375x667)

### Step 3 — You Approve the Plan
The agent presents everything before generating a single line of code. You can adjust scope, change priorities, or ask questions.

### Step 4 — Framework Setup with Page Object Model
Clean, maintainable architecture:

```
tests/
├── pages/
│   ├── LoginPage.js      # Selectors + actions
│   ├── DashboardPage.js
│   └── CheckoutPage.js
├── helpers/
│   ├── auth.helper.js    # API-based login (fast)
│   └── data.helper.js    # Test data factories
├── e2e/
│   ├── auth.spec.js
│   ├── checkout.spec.js
│   └── search.spec.js
└── visual/
    └── screenshots/
```

### Step 5 — Resilient Selectors
The agent uses a strict selector hierarchy that doesn't break when CSS changes:

```
1. Role     → getByRole('button', { name: 'Submit' })
2. Label    → getByLabel('Email address')
3. Test ID  → getByTestId('checkout-btn')
4. Text     → getByText('Welcome back')
```

Never `div.container > span:nth-child(3)`. Ever.

### Step 6 — Visual & Accessibility Tests
What most teams skip, this skill includes by default:
- **Screenshot regression** — pixel-diff comparison with dynamic content masking
- **Accessibility (a11y)** — axe-core integration for WCAG compliance
- **Keyboard navigation** — tab order, focus management, skip links

### Step 7 — Coverage Report
Every critical flow mapped to test status:

```
Flow               | Happy | Validation | Error | Visual | a11y
Login              |  ✓    |     ✓      |   ✓   |   ✓    |  ✓
Checkout           |  ✓    |     ✓      |   ✓   |   ✓    |  ✓
Search + Filter    |  ✓    |     ✓      |   ✓   |   ✓    |  ✓
```

## Key Features

- **Page Object Model** — change a selector once, all tests update
- **API-based auth** — tests login via API, not UI (10x faster)
- **Auto-wait** — no `sleep(3000)`, proper wait-for-element patterns
- **Parallel execution** — tests run independently, no shared state
- **CI-ready** — includes headless config and CI pipeline snippet
- **Any framework** — Playwright, Cypress, or Selenium

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-ui` prompt with your AI agent. Full E2E coverage in minutes, not weeks.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
