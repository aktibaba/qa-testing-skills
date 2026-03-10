---
name: 'step-02-design-test-plan'
description: 'Create a risk-based UI test plan and identify critical user flows'
nextStepFile: './step-03-setup-framework.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 2: Design Test Plan — Risk-Based UI Test Strategy

## STEP GOAL
Produce a prioritized test plan that identifies critical user flows, assigns risk scores, and defines the scope of E2E test coverage.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Do NOT generate test files yet — planning only
- Every flow must have a risk justification

## CONTEXT BOUNDARIES
- Available context: page inventory from Step 1, project source, knowledge fragments
- Required knowledge fragments: `risk-based-testing` (08), `test-isolation` (07)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 2.1 — Risk Assessment Matrix

For each page/route from the Step 1 inventory, score along three dimensions (1-5 scale):

| Dimension             | Score 1 (Low)                      | Score 5 (High)                       |
|-----------------------|------------------------------------|--------------------------------------|
| **Business Impact**   | Informational page, rarely used    | Revenue-critical, user onboarding    |
| **Complexity**        | Static content, no interactions    | Multi-step forms, real-time updates  |
| **Change Frequency**  | Stable, rarely modified            | Frequently changed, many contributors|

**Risk Score** = Business Impact x Complexity x Change Frequency

### 2.2 — Identify Critical User Flows

Based on risk scores, identify the top user flows that require E2E coverage. Typical critical flows include:

1. **Authentication flow** — Sign up, log in, log out, password reset, MFA
2. **Primary value flow** — The core action users come to the app for (e.g., create a post, place an order, send a message)
3. **Payment/checkout flow** — Cart, payment form, order confirmation (if applicable)
4. **User settings/profile** — Profile update, notification preferences, account deletion
5. **Data CRUD operations** — Create, read, update, delete for primary entities
6. **Search and navigation** — Search functionality, filtering, pagination
7. **Error states** — 404 pages, form validation errors, network failure handling
8. **Admin flows** — Admin-specific operations (if applicable)

For each flow, document:
- **Flow name** and description
- **Entry point** (URL or navigation path)
- **Steps** (numbered user actions)
- **Expected outcomes** (what the test asserts)
- **Test data requirements** (users, entities, preconditions)
- **Risk score** (from matrix)
- **Priority tier:** P0 (must have) / P1 (should have) / P2 (nice to have)

### 2.3 — Define Test Boundaries

Establish what is IN scope and OUT of scope for E2E tests:

**IN scope (E2E):**
- Multi-page user journeys
- Cross-component interactions
- Authentication and authorization gates
- Critical form submissions with backend validation
- Navigation and routing behavior

**OUT of scope (handle with unit/integration tests instead):**
- Individual component rendering
- Pure utility function logic
- API response format validation (covered by API tests)
- CSS styling details (covered by visual regression)

### 2.4 — Test Data Strategy

Define how test data will be managed:

1. **User accounts** — How to create test users (API seeding, DB fixtures, or signup flow)
2. **Entity data** — How to create required entities (products, orders, posts, etc.)
3. **Environment state** — Required configuration, feature flags, third-party mock services
4. **Cleanup strategy** — How to reset state between tests (API cleanup, DB reset, isolated contexts)

### 2.5 — Browser and Viewport Matrix

Define the browser/viewport combinations to cover:

| Browser  | Viewport      | Priority | Rationale          |
|----------|---------------|----------|--------------------|
| Chromium | 1920x1080     | P0       | Primary desktop    |
| Chromium | 375x667       | P0       | Mobile (iPhone SE) |
| Firefox  | 1920x1080     | P1       | Cross-browser      |
| WebKit   | 1024x768      | P1       | Safari/tablet      |

### Save Progress

Append to {outputFile}:

```markdown
## Status: Step 2 Complete — Test Plan Designed

## Risk Assessment
| Page/Flow         | Business | Complexity | Change Freq | Risk Score | Priority |
|-------------------|----------|------------|-------------|------------|----------|
| ...               | ...      | ...        | ...         | ...        | ...      |

## Critical User Flows (Prioritized)
### P0 — Must Have
1. <flow name> — <brief description>
   - Steps: ...
   - Assertions: ...

### P1 — Should Have
1. ...

### P2 — Nice to Have
1. ...

## Test Data Strategy
- User creation: <method>
- Entity seeding: <method>
- Cleanup: <method>

## Browser Matrix
- <as defined above>

## Next Step: step-03-setup-framework.md
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS
### SUCCESS: At least 3 P0 critical flows identified with complete step definitions, risk matrix populated for all pages, test data strategy defined, browser matrix specified
### FAILURE: No risk prioritization performed, fewer than 2 critical flows identified, no test data strategy
