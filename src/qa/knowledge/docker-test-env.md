# Docker-Based Test Environment Patterns

## Principle
Containerized test environments eliminate "works on my machine" drift by guaranteeing identical, reproducible runtime conditions for every test execution.

## Rationale
Test failures caused by environment inconsistency are among the most expensive to debug.
A developer's local machine may run a different OS, a different version of Node or Python,
different system libraries, or different service configurations than CI. When a test passes
locally but fails in CI (or vice versa), the team wastes hours bisecting environment
differences instead of shipping features.

Docker solves this by packaging the entire runtime---interpreter, dependencies, system
libraries, and configuration---into a single immutable image. Every engineer, every CI
runner, and every staging environment runs the exact same bytes. The Dockerfile becomes a
living, version-controlled specification of the test environment, reviewed alongside
application code. Multi-stage builds keep images small by separating build-time
dependencies from the lean runtime layer. Health checks and wait-for-it patterns ensure
dependent services (databases, caches, message brokers) are genuinely ready before tests
begin, eliminating a whole class of flaky "connection refused" failures.

## Pattern Examples

### 1. Multi-Stage Dockerfile for a Node.js Test Runner

```dockerfile
# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first for better layer caching.
# If package.json hasn't changed, Docker reuses the cached npm install layer.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- Stage 2: Test runner ----
FROM node:20-alpine AS test-runner

WORKDIR /app

# Install OS-level tools needed by some test utilities (e.g., curl for health checks).
RUN apk add --no-cache curl bash

# Bring in node_modules from the dependency stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application and test source code.
COPY . .

# Environment variables that configure the test run.
# These can be overridden at runtime with `docker run -e`.
ENV NODE_ENV=test
ENV LOG_LEVEL=warn
ENV TEST_DB_HOST=db
ENV TEST_DB_PORT=5432
ENV TEST_DB_NAME=testdb
ENV TEST_REDIS_HOST=redis
ENV TEST_REDIS_PORT=6379

# Health check: verify the container can at least run Node.
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Default command runs the full test suite.
# Override at runtime: docker run test-runner npm run test:unit
CMD ["npm", "test"]
```

### 2. Multi-Stage Dockerfile for a Python/pytest Test Runner

```dockerfile
# ---- Stage 1: Build wheel and install deps ----
FROM python:3.12-slim AS builder

WORKDIR /app

# System deps required for building C extensions (psycopg2, etc.).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-test.txt ./

# Install into a virtual env so we can copy just the venv to the runtime stage.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir -r requirements.txt -r requirements-test.txt

# ---- Stage 2: Lean test runner ----
FROM python:3.12-slim AS test-runner

WORKDIR /app

# Runtime-only system deps (no compiler toolchain).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built virtual environment from the builder stage.
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

# Test configuration via environment variables.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TESTING=1
ENV DATABASE_URL=postgresql://test:test@db:5432/testdb
ENV REDIS_URL=redis://redis:6379/0

# Health check: verify Python and pytest are importable.
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD python -c "import pytest; print('ok')" || exit 1

# Default: run all tests with verbose output and short tracebacks.
CMD ["pytest", "-v", "--tb=short", "tests/"]
```

### 3. Wait-for-It Pattern: Ensuring Services Are Ready

A common source of flaky tests is starting tests before a database or cache is fully
accepting connections. The scripts below block until the dependent service responds.

**Shell-based wait-for-it script (`scripts/wait-for-it.sh`):**

```bash
#!/usr/bin/env bash
# Usage: ./wait-for-it.sh host:port [-t timeout] [-- command]
# Waits for a TCP connection to succeed before running the trailing command.

set -e

HOST=""
PORT=""
TIMEOUT=30
COMMAND=""

# Parse host:port argument.
parse_hostport() {
  HOST="${1%%:*}"
  PORT="${1##*:}"
}

parse_hostport "$1"
shift

# Parse optional flags.
while [[ $# -gt 0 ]]; do
  case "$1" in
    -t)
      TIMEOUT="$2"
      shift 2
      ;;
    --)
      shift
      COMMAND="$@"
      break
      ;;
    *)
      shift
      ;;
  esac
done

echo "Waiting for ${HOST}:${PORT} (timeout: ${TIMEOUT}s)..."

start_ts=$(date +%s)
while true; do
  # Attempt a TCP connection using /dev/tcp or nc.
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "${HOST}:${PORT} is available."
    break
  fi

  now_ts=$(date +%s)
  elapsed=$(( now_ts - start_ts ))
  if [[ $elapsed -ge $TIMEOUT ]]; then
    echo "ERROR: Timed out waiting for ${HOST}:${PORT} after ${TIMEOUT}s."
    exit 1
  fi

  sleep 1
done

# Execute the trailing command, if provided.
if [[ -n "$COMMAND" ]]; then
  exec $COMMAND
fi
```

**Using the wait script as a Docker entrypoint:**

```dockerfile
COPY scripts/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Wait for Postgres and Redis before running tests.
ENTRYPOINT [ \
  "wait-for-it.sh", "db:5432", "-t", "60", "--", \
  "wait-for-it.sh", "redis:6379", "-t", "30", "--" \
]
CMD ["npm", "test"]
```

### 4. Application-Level Health Check Polling (Node.js)

Sometimes a TCP port being open isn't enough---you need the service to respond to
application-level queries (e.g., Postgres must accept SQL).

```javascript
// scripts/wait-for-postgres.js
// Polls Postgres until a simple query succeeds, then exits 0.

const { Client } = require("pg");

const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 2000;

async function waitForPostgres() {
  const client = new Client({
    host: process.env.TEST_DB_HOST || "localhost",
    port: parseInt(process.env.TEST_DB_PORT || "5432", 10),
    user: process.env.TEST_DB_USER || "test",
    password: process.env.TEST_DB_PASSWORD || "test",
    database: process.env.TEST_DB_NAME || "testdb",
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await client.connect();
      const result = await client.query("SELECT 1 AS ready");
      if (result.rows[0].ready === 1) {
        console.log(`Postgres is ready (attempt ${attempt}).`);
        await client.end();
        process.exit(0);
      }
    } catch (err) {
      console.log(
        `Attempt ${attempt}/${MAX_RETRIES}: Postgres not ready (${err.message}). ` +
        `Retrying in ${RETRY_INTERVAL_MS}ms...`
      );
      // Ensure the client is disconnected before retrying.
      try { await client.end(); } catch (_) {}
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
  }

  console.error("Postgres did not become ready in time.");
  process.exit(1);
}

waitForPostgres();
```

### 5. Application-Level Health Check Polling (Python)

```python
# scripts/wait_for_postgres.py
"""Block until Postgres accepts connections and responds to a query."""

import os
import sys
import time

import psycopg2

MAX_RETRIES = 20
RETRY_INTERVAL = 2  # seconds

def wait():
    dsn = os.environ.get(
        "DATABASE_URL",
        "postgresql://test:test@db:5432/testdb",
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            conn = psycopg2.connect(dsn)
            cur = conn.cursor()
            cur.execute("SELECT 1")
            result = cur.fetchone()
            if result and result[0] == 1:
                print(f"Postgres ready (attempt {attempt}).")
                conn.close()
                sys.exit(0)
        except psycopg2.OperationalError as exc:
            print(
                f"Attempt {attempt}/{MAX_RETRIES}: "
                f"Postgres not ready ({exc}). "
                f"Retrying in {RETRY_INTERVAL}s..."
            )
        time.sleep(RETRY_INTERVAL)

    print("ERROR: Postgres did not become ready in time.", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    wait()
```

### 6. Environment Variable Configuration Matrix

A common pattern is running the same test suite against multiple configurations by
overriding environment variables at container launch.

```bash
#!/usr/bin/env bash
# scripts/run-test-matrix.sh
# Runs the test suite against multiple database backends.

set -euo pipefail

IMAGE="myapp-test-runner:latest"

# Build the test image once.
docker build --target test-runner -t "$IMAGE" .

declare -A CONFIGS
CONFIGS["postgres-15"]="DATABASE_URL=postgresql://test:test@host.docker.internal:5415/testdb"
CONFIGS["postgres-16"]="DATABASE_URL=postgresql://test:test@host.docker.internal:5416/testdb"
CONFIGS["postgres-17"]="DATABASE_URL=postgresql://test:test@host.docker.internal:5417/testdb"

FAILED=0

for CONFIG_NAME in "${!CONFIGS[@]}"; do
  echo "========================================="
  echo "Running tests against: ${CONFIG_NAME}"
  echo "========================================="

  ENV_VAR="${CONFIGS[$CONFIG_NAME]}"

  if docker run --rm \
    --network host \
    -e "$ENV_VAR" \
    -e "TEST_CONFIG_NAME=${CONFIG_NAME}" \
    "$IMAGE"; then
    echo "PASS: ${CONFIG_NAME}"
  else
    echo "FAIL: ${CONFIG_NAME}"
    FAILED=1
  fi
done

exit $FAILED
```

### 7. Dockerfile Best Practices Checklist for Test Environments

```dockerfile
# GOOD: Pin exact image digests for full reproducibility in CI.
FROM node:20.11.1-alpine@sha256:abcdef1234567890 AS deps

# GOOD: Use .dockerignore to keep the build context small.
# .dockerignore should contain: node_modules, .git, dist, coverage, .env

# GOOD: Run as a non-root user to match production constraints.
RUN addgroup -S testgroup && adduser -S testuser -G testgroup
USER testuser

# GOOD: Set a working directory explicitly.
WORKDIR /app

# GOOD: Copy dependency manifests first, install, then copy source.
# This order maximizes Docker layer cache hits.
COPY --chown=testuser:testgroup package.json package-lock.json ./
RUN npm ci

COPY --chown=testuser:testgroup . .

# GOOD: Label images for traceability.
LABEL maintainer="qa-team@example.com"
LABEL purpose="test-runner"
LABEL vcs-ref="${GIT_SHA}"

# GOOD: Use exec form for CMD to receive signals correctly.
CMD ["npm", "test"]
```

### 8. Debugging a Failing Test Container

```bash
# Run the test container interactively with a shell instead of the test command.
docker run -it --rm \
  --entrypoint /bin/sh \
  -e NODE_ENV=test \
  -e DATABASE_URL=postgresql://test:test@db:5432/testdb \
  --network myapp_test-net \
  myapp-test-runner:latest

# Inside the container, you can:
#   - Run individual tests: npx jest tests/auth.test.js
#   - Check connectivity: nc -zv db 5432
#   - Inspect env: printenv | sort
#   - Check installed packages: npm ls --depth=0

# Alternatively, attach to a running container:
docker exec -it <container_id> /bin/sh

# Copy test artifacts (coverage, screenshots) out of a stopped container:
docker cp <container_id>:/app/coverage ./coverage-from-container
```
