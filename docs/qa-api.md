# QA API Testing Skill: AI-Powered API Test Generation

**Stop writing API tests manually. Let AI do it in minutes.**

---

## The Problem

You have dozens of API endpoints. Each needs tests for happy paths, error cases, auth flows, edge cases, and schema validation. Writing all of this by hand takes days — and you probably skip half of it.

## What qa-api Does

The `qa-api` skill turns any AI agent into a senior QA architect that analyzes your API codebase and generates a complete, production-ready test suite.

One command. Full coverage.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Discovery
The agent scans your project and auto-detects:
- API framework (Express, FastAPI, Spring Boot, Rails, etc.)
- Endpoint inventory from routes/controllers
- Authentication method (JWT, OAuth, API key, session)
- Existing test setup and gaps

### Step 2 — Risk-Based Test Strategy
Not all endpoints are equal. The agent classifies each endpoint:

| Priority | What Gets Tested | Example |
|----------|------------------|---------|
| **P0 — Critical** | Auth, payments, data mutation | `POST /auth/login`, `POST /orders` |
| **P1 — High** | Core business logic | `GET /products`, `PUT /users/:id` |
| **P2 — Medium** | Supporting endpoints | `GET /categories`, `GET /health` |

### Step 3 — You Approve the Plan
Before any code is generated, the agent presents:
- Detected stack and tool choices
- Prioritized list of what will be generated
- Proposed file/folder structure
- Estimated output (file count, test count)

**Nothing gets generated until you say "proceed."**

### Step 4 — Test Generation
The agent generates organized, maintainable test files:

```
tests/
├── config/           # Base URL, timeouts, auth setup
├── fixtures/         # Reusable test data
├── helpers/          # Auth helpers, request builders
├── endpoints/
│   ├── auth.test.js
│   ├── users.test.js
│   ├── orders.test.js
│   └── products.test.js
└── edge-cases/       # Boundary values, concurrent requests
```

### Step 5 — Auth Tests (Dedicated)
Authentication gets its own dedicated test suite:
- Login flows (valid, invalid, locked accounts)
- Token lifecycle (issue, refresh, expire, revoke)
- RBAC (role-based access to each endpoint)
- Rate limiting and brute force protection

### Step 6 — Error & Edge Cases
The boring stuff nobody writes but everyone needs:
- Invalid input types, missing fields, extra fields
- Boundary values (empty strings, max length, negative numbers)
- Concurrent request handling
- Malformed JSON, wrong content types

### Step 7 — Coverage Report
A clear matrix showing what's covered:

```
Endpoint          | Happy | Error | Auth | Edge | Schema
POST /auth/login  |  ✓    |  ✓    |  ✓   |  ✓   |  ✓
GET /users/:id    |  ✓    |  ✓    |  ✓   |  ✓   |  ✓
DELETE /orders/:id|  ✓    |  ✓    |  ✓   |  ✓   |  ✓
```

## What Makes It Different

- **Works with any API framework** — REST, GraphQL, gRPC
- **Works with any AI agent** — Claude, GPT, Gemini, Copilot, Cursor
- **Risk-prioritized** — critical endpoints first, not alphabetical
- **Independent tests** — each test has its own setup/teardown, no shared state
- **Schema validation** — response structure is verified, not just status codes
- **Zero config** — auto-detects everything from your codebase

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-api` prompt with your preferred AI agent. Your API test suite is minutes away.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
