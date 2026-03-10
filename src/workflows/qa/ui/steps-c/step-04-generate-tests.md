---
name: 'step-04-generate-tests'
description: 'Generate E2E test files for critical user flows'
nextStepFile: './step-05-visual-a11y.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 4: Generate Tests — E2E Test Files for Critical Flows

## STEP GOAL
Generate complete, runnable E2E test files for all P0 critical flows and P1 flows identified in the test plan. Each test file follows the Page Object Model pattern and uses the helpers created in Step 3.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Generate ALL P0 test files before any P1 files
- Every test must be independent and isolated
- Every test file must have a header comment explaining the flow
- Use the page objects and helpers from Step 3 — do not inline selectors

## CONTEXT BOUNDARIES
- Available context: test plan from Step 2, framework setup from Step 3
- Required knowledge fragments: `selector-resilience` (09), `page-object-model` (11), `test-isolation` (07), `network-first-testing` (10)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 4.1 — Generate Page Objects for P0 Flows

For each page involved in P0 flows, create a dedicated page object file:

**File naming:** `pages/<page-name>.page.ts`

Each page object must include:
- Extends `BasePage`
- All selectors as private properties using `data-testid` or ARIA locators
- Semantic action methods (e.g., `fillLoginForm(email, password)`, `submitOrder()`)
- Assertion/validation methods (e.g., `expectSuccessMessage()`, `expectErrorState()`)
- `isLoaded()` override checking page-specific element
- Navigation method if the page has a direct URL

**Example structure:**
```typescript
// pages/login.page.ts
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // Selectors
  private emailInput = '[data-testid="login-email"]';
  private passwordInput = '[data-testid="login-password"]';
  private submitButton = '[data-testid="login-submit"]';
  private errorMessage = '[data-testid="login-error"]';

  async goto(): Promise<void> {
    await this.navigate('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.submitButton);
  }

  async expectError(message: string): Promise<void> {
    await expect(this.page.locator(this.errorMessage)).toContainText(message);
  }

  async isLoaded(): Promise<boolean> {
    return this.page.locator(this.emailInput).isVisible();
  }
}
```

### 4.2 — Generate P0 Test Files

For each P0 critical flow, generate a test specification file:

**File naming:** `specs/<flow-name>.spec.ts`

**Required structure for every test file:**
```typescript
/**
 * E2E Test: <Flow Name>
 *
 * Tests the <description of user journey>.
 * Priority: P0
 * Preconditions: <list preconditions>
 * Covers: <list of pages/routes>
 */

import { test, expect } from '@playwright/test'; // or framework equivalent

test.describe('<Flow Name>', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: establish preconditions via API, not UI
  });

  test('should <happy path description>', async ({ page }) => {
    // Arrange — preconditions
    // Act — user interactions
    // Assert — expected outcomes
  });

  test('should handle <error case>', async ({ page }) => {
    // Negative path testing
  });

  test('should <edge case>', async ({ page }) => {
    // Boundary testing
  });
});
```

**Mandatory test patterns for each flow:**

1. **Happy path** — Complete flow with valid data, asserting successful outcome
2. **Validation errors** — Submit with invalid/missing data, assert error messages shown
3. **Unauthorized access** — Attempt flow without authentication (if auth-gated)
4. **Network failure** — Intercept API call and simulate error, assert graceful handling

### 4.3 — Generate P1 Test Files

Apply the same pattern as P0, but with reduced scenario coverage:
- Happy path (required)
- One error path (required)
- Edge cases (optional based on complexity)

### 4.4 — Generate Shared Component Tests

If shared components (modals, data tables, forms) are used across multiple flows, create component-level test files:

**File naming:** `specs/components/<component-name>.spec.ts`

These tests verify the component's interactive behavior in isolation:
- Modal open/close, escape key, overlay click
- Table sorting, filtering, pagination
- Form validation, field interactions

### 4.5 — Generate Test Fixtures

Create JSON fixture files for test data:

**File naming:** `fixtures/<entity-name>.json`

```json
{
  "validUser": {
    "email": "test-user@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  },
  "invalidUser": {
    "email": "not-an-email",
    "password": "short"
  }
}
```

### 4.6 — Verify Test Independence

Review all generated tests and confirm:
- No test references another test's data or state
- `beforeEach` blocks use API seeding, not UI flows
- No hardcoded waits (`sleep`, `wait(ms)`)
- All selectors use `data-testid` or ARIA locators
- Each test can be run in isolation with `test.only()`

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 4 Complete — Tests Generated

## Generated Page Objects
| File                    | Page       | Methods |
|-------------------------|------------|---------|
| pages/login.page.ts     | Login      | 4       |
| ...                     | ...        | ...     |

## Generated Test Files
| File                         | Flow        | Tests | Priority |
|------------------------------|-------------|-------|----------|
| specs/auth-flow.spec.ts      | Auth        | 5     | P0       |
| ...                          | ...         | ...   | ...      |

## Test Fixtures
- fixtures/users.json
- ...

## Total: <N> test files, <M> individual tests

## Next Step: step-05-visual-a11y.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: All P0 flows have test files with happy path + error path, all test files use page objects, no hardcoded selectors in test files, no sleep/wait calls, at least one fixture file generated
### FAILURE: P0 flow missing test coverage, selectors hardcoded in test files instead of page objects, tests depend on execution order, sleep calls present
