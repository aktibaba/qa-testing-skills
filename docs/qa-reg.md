# QA Regression Testing Skill: Organize Tests into Smart, Tiered Suites

**Run the right tests at the right time. Stop running everything on every commit.**

---

## The Problem

You have 500 tests. They take 45 minutes. You run all of them on every PR. Developers wait, CI queues back up, and everyone starts ignoring test results. Or worse — you stop running tests at all.

## What qa-reg Does

The `qa-reg` skill turns any AI agent into a regression testing architect that analyzes your existing test suite, categorizes tests by priority and risk, and organizes them into time-budgeted tiers.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Test Inventory
The agent scans your entire test suite:
- Total test count and execution time
- Test types (unit, integration, e2e)
- Feature mapping (which tests cover which features)
- Flaky test detection (inconsistent pass/fail history)
- Orphan tests (tests for deleted features)

### Step 2 — Priority Classification
Every test gets a priority:

| Priority | Criteria | Example |
|----------|----------|---------|
| **P1 — Critical** | Auth, payments, core flow | Login, checkout, data integrity |
| **P2 — High** | Key business features | Search, user management, reporting |
| **P3 — Medium** | Supporting features | Settings, preferences, notifications |
| **P4 — Low** | Edge cases, cosmetic | Tooltip text, date formatting |

### Step 3 — Suite Tiers (Time-Budgeted)

```
Tier        | Tests        | Time Budget | When to Run
Smoke       | P1 only      | < 2 min     | Every commit
Sanity      | P1 + P2      | < 5 min     | Every PR
Regression  | P1 + P2 + P3 | < 10 min    | Pre-merge, nightly
Full        | Everything   | No limit    | Weekly, pre-release
Quarantine  | Flaky tests  | Separate    | Nightly (isolated)
```

### Step 4 — You Approve the Plan
Review categorization before any changes are made. Move tests between tiers based on your business knowledge.

### Step 5 — Implementation
Tags/markers added to existing tests:

```javascript
// Jest
describe('[P1][smoke] Authentication', () => { ... });
describe('[P2][sanity] Search functionality', () => { ... });
describe('[P3][regression] User preferences', () => { ... });
```

```python
# pytest
@pytest.mark.smoke
@pytest.mark.P1
def test_login_valid_credentials(): ...

@pytest.mark.sanity
@pytest.mark.P2
def test_search_by_keyword(): ...
```

Run commands for each tier:
```bash
npm test -- --grep "@smoke"           # 2 min
npm test -- --grep "@sanity"          # 5 min
npm test -- --grep "@regression"      # 10 min
npx jest --testPathPattern=quarantine # Flaky only
```

### Step 6 — Flaky Test Quarantine

```
Flaky Test Detected
       ↓
Move to quarantine suite (separate CI job)
       ↓
Create tracking issue with 2-sprint fix deadline
       ↓
If not fixed → delete or rewrite
       ↓
If fixed → promote back to main suite
```

No flaky test runs alongside real tests. Ever.

### Step 7 — Maintenance Plan

| Cadence | Action |
|---------|--------|
| **Each sprint** | Review quarantine, fix or delete flaky tests |
| **Monthly** | Check orphan tests, validate feature mapping |
| **Quarterly** | Re-prioritize based on production incidents |

Health metrics with alert thresholds:
- Suite pass rate < 95% → investigate
- Execution time grows > 20% → optimize
- Flaky count > 5% → quarantine review

## Key Features

- **Time-budgeted tiers** — smoke in 2 min, sanity in 5 min, full regression in 10 min
- **Priority-based** — critical tests always run first
- **Flaky quarantine** — separate flaky tests from reliable ones
- **Feature mapping** — know which features have test coverage gaps
- **Orphan detection** — find tests for code that no longer exists
- **Maintenance cadence** — built-in review schedule
- **Any test framework** — Jest, pytest, JUnit, Go test, etc.

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-reg` prompt with your AI agent. Run 2-minute smoke tests on every commit, full regression before release.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
