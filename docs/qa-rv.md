# QA Test Review Skill: AI-Powered Test Quality Audit

**Your tests exist. But are they any good?**

---

## The Problem

You have tests. They pass. Coverage is 75%. Everything looks green. But half your tests assert `toBeTruthy()` on everything, share mutable state, use hardcoded dates that break in January, and test implementation details instead of behavior. Green doesn't mean good.

## What qa-rv Does

The `qa-rv` skill turns any AI agent into a test quality auditor that evaluates your existing test suite across 6 dimensions, scores each file, and provides actionable recommendations with before/after code examples.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Discovery
The agent scans your test suite:
- Test framework and configuration
- Test file locations and naming patterns
- Test count, types, and coverage metrics
- Test execution patterns

### Step 2 — Six-Dimension Quality Evaluation
Every test file is scored 1-5 on each dimension:

#### 1. Determinism (Same result every run?)
```
BAD:  expect(createdAt).toBe('2024-01-15')     // Breaks tomorrow
GOOD: expect(createdAt).toBeInstanceOf(Date)     // Always passes
```
- No hardcoded dates, times, or random values
- No network calls without mocks
- No dependency on test execution order

#### 2. Isolation (Independent tests?)
```
BAD:  let counter = 0;
      it('test 1', () => { counter++; expect(counter).toBe(1); });
      it('test 2', () => { counter++; expect(counter).toBe(2); });

GOOD: it('test 1', () => { const counter = 0; ... });
      it('test 2', () => { const counter = 0; ... });
```
- No shared mutable state between tests
- Each test sets up and tears down its own data
- Tests pass when run in any order

#### 3. Readability (Clear intent?)
```
BAD:  it('test 3', () => { ... });
GOOD: it('returns empty array when no products match filter', () => { ... });
```
- Descriptive test names (scenario + expected result)
- Arrange-Act-Assert pattern
- No complex logic inside tests

#### 4. Assertions (Precise and meaningful?)
```
BAD:  expect(result).toBeTruthy();
GOOD: expect(result).toEqual({ id: 1, name: 'Test', status: 'active' });
```
- Specific assertions, not just truthy/falsy
- One assertion focus per test
- Error messages that explain what went wrong

#### 5. Coverage (Right things tested?)
- Critical paths have tests
- Edge cases and error paths covered
- Not just happy path testing

#### 6. Maintainability (Easy to update?)
```
BAD:  // Same setup copy-pasted in 15 tests
GOOD: const user = createTestUser({ role: 'admin' });
```
- Uses factories and helpers
- No duplicated test setup
- Changes to code require minimal test updates

### Step 3 — Scored Report

```
File                    | Determ. | Isol. | Read. | Assert. | Cover. | Maint. | Avg
auth.test.js            |   5     |   4   |   4   |    3    |   5    |   4    | 4.2
checkout.test.js        |   2     |   3   |   2   |    2    |   4    |   2    | 2.5
search.test.js          |   4     |   5   |   5   |    5    |   3    |   4    | 4.3
user.test.js            |   3     |   2   |   3   |    2    |   4    |   3    | 2.8
```

### Step 4 — Findings by Severity

```
Severity  | Finding                                    | File              | Line
Critical  | Shared mutable state between tests         | checkout.test.js  | 12
Critical  | Hardcoded date will fail after 2024         | user.test.js      | 45
High      | 23 assertions use only toBeTruthy()        | checkout.test.js  | *
High      | No error path testing for payment flow     | checkout.test.js  | —
Medium    | Test setup duplicated across 8 tests       | user.test.js      | *
Low       | Test names don't describe expected behavior | search.test.js    | *
```

### Step 5 — Recommendations with Code Examples

**Quick Wins** (low effort, high impact):
1. Replace `toBeTruthy()` with specific assertions — 30 min
2. Extract shared setup into `beforeEach` — 20 min
3. Replace hardcoded dates with relative dates — 15 min

**Action Plan:**
| Action | Effort | Impact | Priority |
|--------|--------|--------|----------|
| Fix shared state in checkout tests | 1 hour | Critical bugs prevented | P0 |
| Add error path tests for payments | 2 hours | Production crashes prevented | P1 |
| Create test data factory | 3 hours | 50% less test maintenance | P1 |
| Rename all test descriptions | 1 hour | Better debugging experience | P2 |

## What Makes It Different

- **No code generation** — this skill evaluates, not generates
- **Evidence-based scoring** — every score backed by specific line numbers
- **Before/after examples** — shows exactly how to fix each finding
- **Severity-ranked** — fix critical issues first
- **Effort estimates** — know how long each fix takes
- **Works on any test suite** — Jest, pytest, JUnit, Go test, etc.

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-rv` prompt with your AI agent. Find out if your tests are actually protecting you.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
