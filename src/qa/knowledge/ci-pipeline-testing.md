# CI Pipeline Design for Tests

## Principle
A well-designed CI pipeline runs the fastest, highest-value tests first, parallelizes aggressively, caches dependencies, and surfaces failures with clear artifacts.

## Rationale
A slow or unreliable CI pipeline directly reduces developer productivity. If the
pipeline takes 30 minutes, developers context-switch to other tasks and lose flow.
If it fails intermittently, developers stop trusting results and merge despite red
builds. If it provides no artifacts on failure, debugging requires reproducing the
issue locally.

Effective CI pipeline design follows a testing pyramid: unit tests run first (fast,
cheap, high signal), followed by integration tests (moderate speed, need services),
followed by E2E tests (slow, but catch system-level issues). Each stage gates the
next: if units fail, integration tests never start, saving resources. Parallel
execution within each stage reduces wall-clock time. Dependency caching eliminates
redundant installs. Artifact collection (test reports, coverage, screenshots)
ensures failures are debuggable without re-running the pipeline.

## Pattern Examples

### 1. GitHub Actions: Full Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Cancel in-progress runs for the same PR/branch.
concurrency:
  group: test-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"
  REGISTRY: ghcr.io

jobs:
  # ---- Stage 1: Lint + Type Check (fastest, catches obvious errors) ----
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - run: npm ci

      - name: ESLint
        run: npx eslint . --format=json --output-file=eslint-report.json
        continue-on-error: true

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: Upload lint report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: lint-report
          path: eslint-report.json

  # ---- Stage 2: Unit Tests (fast, no external dependencies) ----
  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        # Shard unit tests across 3 parallel runners.
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - run: npm ci

      - name: Run unit tests (shard ${{ matrix.shard }}/3)
        run: |
          npx jest \
            --shard=${{ matrix.shard }}/3 \
            --ci \
            --coverage \
            --reporters=default \
            --reporters=jest-junit \
            tests/unit/
        env:
          JEST_JUNIT_OUTPUT_DIR: ./test-results/unit
          JEST_JUNIT_OUTPUT_NAME: junit-shard-${{ matrix.shard }}.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-results-shard-${{ matrix.shard }}
          path: |
            test-results/
            coverage/

  # ---- Stage 3: Integration Tests (need database and cache) ----
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - run: npm ci

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run integration tests
        run: |
          npx jest \
            --ci \
            --coverage \
            --reporters=default \
            --reporters=jest-junit \
            tests/integration/
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          JEST_JUNIT_OUTPUT_DIR: ./test-results/integration

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-results
          path: |
            test-results/
            coverage/

  # ---- Stage 4: E2E Tests (full stack with browser) ----
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build

      - name: Start application
        run: |
          npm start &
          npx wait-on http://localhost:3000 --timeout 30000
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run E2E tests
        run: npx playwright test --reporter=html,junit
        env:
          BASE_URL: http://localhost:3000
          PLAYWRIGHT_JUNIT_OUTPUT_NAME: test-results/e2e/junit.xml

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/

  # ---- Stage 5: Merge coverage from all stages ----
  coverage-report:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    if: always()
    steps:
      - uses: actions/checkout@v4

      - name: Download all coverage artifacts
        uses: actions/download-artifact@v4
        with:
          pattern: "*-results*"
          merge-multiple: true

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - run: npm ci

      - name: Merge coverage reports
        run: |
          npx nyc merge coverage/ merged-coverage.json
          npx nyc report --reporter=text --reporter=lcov --temp-dir=merged-coverage.json

      - name: Upload final coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/lcov-report/
```

### 2. GitLab CI: Full Testing Pipeline

```yaml
# .gitlab-ci.yml

stages:
  - lint
  - unit
  - integration
  - e2e
  - report

variables:
  NODE_VERSION: "20"
  POSTGRES_USER: test
  POSTGRES_PASSWORD: test
  POSTGRES_DB: testdb

# Global cache: share node_modules across all jobs.
cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/
  policy: pull

# ---- Stage: Install & Cache Dependencies ----
install:
  stage: .pre
  image: node:${NODE_VERSION}-alpine
  script:
    - npm ci
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/
    policy: push  # This job populates the cache.

# ---- Stage: Lint ----
lint:
  stage: lint
  image: node:${NODE_VERSION}-alpine
  script:
    - npx eslint . --format=junit --output-file=eslint-junit.xml
    - npx tsc --noEmit
  artifacts:
    when: always
    reports:
      junit: eslint-junit.xml
    expire_in: 7 days

# ---- Stage: Unit Tests (parallel shards) ----
unit-tests:
  stage: unit
  image: node:${NODE_VERSION}-alpine
  parallel: 3
  script:
    - |
      npx jest \
        --shard=${CI_NODE_INDEX}/${CI_NODE_TOTAL} \
        --ci \
        --coverage \
        --reporters=default \
        --reporters=jest-junit \
        tests/unit/
  variables:
    JEST_JUNIT_OUTPUT_DIR: ./test-results
    JEST_JUNIT_OUTPUT_NAME: junit-unit.xml
  artifacts:
    when: always
    reports:
      junit: test-results/junit-unit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 7 days
  coverage: '/All files\s*\|\s*(\d+\.?\d*)\s*\|/'

# ---- Stage: Integration Tests ----
integration-tests:
  stage: integration
  image: node:${NODE_VERSION}
  services:
    - name: postgres:16-alpine
      alias: db
    - name: redis:7-alpine
      alias: redis
  variables:
    DATABASE_URL: postgresql://test:test@db:5432/testdb
    REDIS_URL: redis://redis:6379
  script:
    - npx prisma migrate deploy
    - |
      npx jest \
        --ci \
        --coverage \
        --reporters=default \
        --reporters=jest-junit \
        tests/integration/
  artifacts:
    when: always
    reports:
      junit: test-results/junit-integration.xml
    paths:
      - coverage/
    expire_in: 7 days

# ---- Stage: E2E Tests ----
e2e-tests:
  stage: e2e
  image: mcr.microsoft.com/playwright:v1.42.0-jammy
  services:
    - name: postgres:16-alpine
      alias: db
  variables:
    DATABASE_URL: postgresql://test:test@db:5432/testdb
  script:
    - npm ci
    - npm run build
    - npm start &
    - npx wait-on http://localhost:3000 --timeout 30000
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    expire_in: 7 days

# ---- Stage: Combined Report ----
coverage-report:
  stage: report
  image: node:${NODE_VERSION}-alpine
  when: always
  script:
    - npx nyc merge coverage/ .nyc_output/merged.json
    - npx nyc report --reporter=text-summary --reporter=html
  artifacts:
    paths:
      - coverage/
    expire_in: 30 days
  coverage: '/Statements\s*:\s*(\d+\.?\d*)\%/'
```

### 3. Parallel Execution Strategies

```yaml
# GitHub Actions: Playwright sharding
e2e-tests:
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false  # Don't cancel other shards on failure.
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - uses: actions/checkout@v4

    - name: Run Playwright tests (shard ${{ matrix.shard }}/4)
      run: npx playwright test --shard=${{ matrix.shard }}/4

    - name: Upload shard results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: e2e-results-shard-${{ matrix.shard }}
        path: test-results/

  # Merge results from all shards.
  merge-e2e-results:
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: always()
    steps:
      - uses: actions/checkout@v4
      - name: Download all shard results
        uses: actions/download-artifact@v4
        with:
          pattern: e2e-results-shard-*
          merge-multiple: true
          path: all-results/

      - name: Merge Playwright reports
        run: npx playwright merge-reports --reporter=html all-results/

      - uses: actions/upload-artifact@v4
        with:
          name: merged-e2e-report
          path: playwright-report/
```

### 4. Dependency Caching Patterns

```yaml
# GitHub Actions: Advanced caching for multiple tools.
steps:
  # Node.js npm cache.
  - uses: actions/setup-node@v4
    with:
      node-version: "20"
      cache: "npm"

  # Playwright browser cache.
  - name: Cache Playwright browsers
    uses: actions/cache@v4
    id: playwright-cache
    with:
      key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      path: ~/.cache/ms-playwright

  - name: Install Playwright browsers (if cache miss)
    if: steps.playwright-cache.outputs.cache-hit != 'true'
    run: npx playwright install --with-deps chromium

  # Docker layer cache (for custom test images).
  - name: Cache Docker layers
    uses: actions/cache@v4
    with:
      path: /tmp/.buildx-cache
      key: docker-${{ runner.os }}-${{ hashFiles('Dockerfile') }}
      restore-keys: docker-${{ runner.os }}-

  - name: Build test image
    uses: docker/build-push-action@v5
    with:
      context: .
      target: test-runner
      load: true
      cache-from: type=local,src=/tmp/.buildx-cache
      cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
```

### 5. Test Failure Notification

```yaml
# .github/workflows/test.yml (append to the end)
notify-failure:
  runs-on: ubuntu-latest
  needs: [lint, unit-tests, integration-tests, e2e-tests]
  if: failure() && github.ref == 'refs/heads/main'
  steps:
    - name: Notify Slack on main branch failure
      uses: slackapi/slack-github-action@v1.25.0
      with:
        payload: |
          {
            "text": "CI failed on main",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*CI Pipeline Failed on main* :red_circle:\n*Commit:* `${{ github.sha }}`\n*Author:* ${{ github.actor }}\n*Run:* <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Pipeline>"
                }
              }
            ]
          }
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```
