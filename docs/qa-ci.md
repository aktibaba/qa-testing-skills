# QA CI/CD Skill: AI-Powered Pipeline Generation with Quality Gates

**Every push tested. Every merge gated. Automatically.**

---

## The Problem

Setting up a proper CI/CD pipeline takes days. You need to configure stages, caching, parallelism, quality gates, artifact storage, and notifications. Most teams end up with a pipeline that just runs `npm test` and calls it a day.

## What qa-ci Does

The `qa-ci` skill turns any AI agent into a DevOps architect that generates a multi-stage CI/CD pipeline with quality gates, caching strategies, and fail-fast ordering — for any CI platform.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Discovery
The agent detects your CI context:
- CI platform (GitHub Actions, GitLab CI, Jenkins, CircleCI, etc.)
- Test frameworks and commands
- Build system and package manager
- Docker usage
- Existing pipeline configuration

### Step 2 — You Approve the Plan
Review the proposed pipeline architecture before generation.

### Step 3 — Pipeline Generation
Stages follow the canonical fail-fast order:

```
Preflight → Static Analysis → Unit Tests → Build → Integration → E2E → Quality Gates → Artifacts
    ↓            ↓               ↓          ↓          ↓          ↓          ↓            ↓
  Lint        ESLint/TS       Jest/py    Compile    Docker+DB   Playwright  Coverage    Reports
  Format      Type check      Fast       Bundle     Real deps   Browser     Thresholds  Deploy
  Secrets     Complexity      Parallel   Validate   Slow        Visual      Security    Notify
```

**Why this order?** Cheapest, fastest checks first. If linting fails, why run a 10-minute E2E suite?

Example GitHub Actions pipeline:

```yaml
jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  unit-tests:
    needs: preflight
    runs-on: ubuntu-latest
    steps:
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  integration:
    needs: unit-tests
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: testdb
    steps:
      - run: npm run test:integration

  e2e:
    needs: integration
    steps:
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  quality-gate:
    needs: [unit-tests, integration, e2e]
    steps:
      - run: |
          if [ "$COVERAGE" -lt 80 ]; then exit 1; fi
```

### Step 4 — Quality Gates
Automated checks that block merge:

| Gate | Threshold | Blocks Merge? |
|------|-----------|---------------|
| Test pass rate | 100% | Yes |
| Code coverage | > 80% | Yes |
| Security scan | 0 critical CVEs | Yes |
| Lint | 0 errors | Yes |
| E2E | All pass | Yes |
| Performance | P95 < 500ms | Warning |

### Step 5 — Optimization

```
Optimization              | Impact
Dependency caching        | 60-80% faster installs
Docker layer caching      | 50-70% faster builds
Parallel test execution   | 40-60% faster test runs
Concurrency control       | Cancel stale PR runs
Timeout configuration     | No zombie jobs
```

### Step 6 — Documentation
Pipeline flow diagram and activation instructions:

```
PR opened → Preflight (1m) → Unit (2m) → Build (1m) → Integration (3m) → E2E (5m) → Gate → ✓ Merge
                                                                                         → ✗ Block
```

## Key Features

- **Any CI platform** — GitHub Actions, GitLab CI, Jenkins, CircleCI
- **Fail-fast ordering** — cheapest checks run first
- **Aggressive caching** — npm, Docker layers, build artifacts
- **Parallel execution** — independent stages run simultaneously
- **Quality gates** — coverage + security + tests must pass to merge
- **Artifact preservation** — test reports, screenshots, coverage on failure
- **Timeout configuration** — no jobs running forever
- **Concurrency control** — new push cancels previous pipeline run

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-ci` prompt with your AI agent. Production-grade CI/CD in minutes.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
