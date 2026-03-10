# QA Unit Testing Skill: AI-Powered Unit Test Generation

**Comprehensive unit tests for your business logic — generated in minutes, not days.**

---

## The Problem

Unit tests are the foundation of reliable software. But writing them is tedious. You know you should test edge cases, error paths, and boundary values. You rarely do. Coverage stays at 40% and nobody touches it.

## What qa-unit Does

The `qa-unit` skill turns any AI agent into a unit testing expert that analyzes your source code, identifies critical modules, and generates thorough test suites following best practices.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Discovery
The agent scans your project and detects:
- Language and test framework (Jest, pytest, JUnit, Go test, etc.)
- Source structure and module organization
- Existing tests and current coverage
- Test configuration and scripts

### Step 2 — Identify Test Targets
Not everything needs the same level of testing. The agent prioritizes:

| Priority | What | Example |
|----------|------|---------|
| **P0 — Critical** | Business logic, calculations, auth | `calculatePrice()`, `validateToken()` |
| **P1 — High** | Data transformations, API handlers | `formatResponse()`, `parseInput()` |
| **P2 — Medium** | Utilities, helpers, formatters | `slugify()`, `dateFormat()` |

### Step 3 — Design Test Structure
Tests mirror your source directory:

```
src/                          tests/
├── services/                 ├── services/
│   ├── pricing.js            │   ├── pricing.test.js
│   └── auth.js               │   └── auth.test.js
├── utils/                    ├── utils/
│   └── validation.js         │   └── validation.test.js
└── models/                   └── models/
    └── user.js                   └── user.test.js
```

### Step 4 — You Approve the Plan
Before any code is generated, you see:
- Which modules will be tested
- Estimated test count per module
- Proposed file structure
- Mock strategy for external dependencies

### Step 5 — Test Generation
Every test follows the **Arrange-Act-Assert** pattern:

```javascript
describe('calculateDiscount', () => {
  it('applies 10% discount for orders over $100', () => {
    // Arrange
    const order = { total: 150, customerTier: 'standard' };

    // Act
    const result = calculateDiscount(order);

    // Assert
    expect(result).toBe(135);
  });

  it('returns zero discount for empty cart', () => { ... });
  it('caps discount at maximum allowed value', () => { ... });
  it('throws error for negative total', () => { ... });
});
```

Each function gets:
- **Happy path** — normal expected behavior
- **Edge cases** — boundary values, empty inputs, max/min
- **Error cases** — invalid inputs, missing data, exceptions
- **Parameterized tests** — multiple inputs, one test definition

### Step 6 — Test Helpers & Factories
Reusable test infrastructure:

```javascript
// factories/user.factory.js
const createUser = (overrides = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  ...overrides,
});
```

- **Factories** — generate test data with sensible defaults
- **Custom matchers** — domain-specific assertions
- **Mock builders** — consistent mock setup for external services

### Step 7 — Coverage & Validation
Configured thresholds that enforce quality:

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## Key Principles

- **One assertion focus per test** — test names describe exactly what's tested
- **Mock at boundaries** — external APIs and databases get mocked, internal code doesn't
- **No test interdependence** — each test runs in isolation
- **Descriptive names** — `it('returns null when user not found')` not `it('test 3')`
- **No logic in tests** — no if/else, no loops, no calculations in assertions

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-unit` prompt with your AI agent. Your unit test coverage goes from 40% to 80%+ in one session.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
