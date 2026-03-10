# API Workflow — Instructions

## Overview

This workflow creates comprehensive API test suites using a risk-based approach. It detects the project's API framework and test tooling, designs a test strategy prioritized by risk, generates test files covering happy paths, authentication, error handling, and edge cases, then validates the complete suite.

## Prerequisites

- Project source code accessible at `{project-root}`.
- API source files or OpenAPI/Swagger specification available.
- Test framework installed or installable (auto-detected).
- API endpoints identifiable from source, routes, or specification.

## How It Works

### Step 1: Preflight

The workflow detects:
- **API framework**: Express, FastAPI, Django REST, Spring Boot, Gin, NestJS, Rails, Phoenix, etc.
- **API style**: REST, GraphQL, gRPC, or mixed.
- **Existing test infrastructure**: test framework, test directory, configuration files.
- **Endpoint inventory**: routes, controllers, resolvers, or protobuf definitions.
- **Authentication method**: Bearer/JWT, Basic, OAuth2, API key, session, or none.
- **Dependencies**: databases, external services, message queues.

### Step 2: Design Test Strategy

Applies risk-based test prioritization:

**Risk Classification:**
- **Critical**: Authentication, payment, data mutation, user-facing core features.
- **High**: Data retrieval for primary entities, search, filtering.
- **Medium**: Secondary features, admin endpoints, reporting.
- **Low**: Health checks, version endpoints, internal tooling.

**Test Type Distribution:**
- Functional tests (happy path + validation).
- Authentication and authorization tests.
- Error handling tests (4xx, 5xx responses).
- Edge case and boundary tests.
- Contract tests (schema validation).
- Performance smoke tests (optional baseline).

### Step 3: Generate Tests

Creates test files organized by:
- **Resource/entity**: One test file per API resource (users, orders, products, etc.).
- **Convention**: Follows the detected test framework's naming and structure conventions.
- **Shared infrastructure**: Request builders, response validators, test data factories.

Each test file includes:
- Setup and teardown hooks.
- Descriptive test names following "should [expected behavior] when [condition]" pattern.
- Assertions on status codes, response body structure, headers, and data values.
- Test data isolation — no test depends on another test's state.

### Step 4: Auth Tests

Generates dedicated authentication and authorization tests:
- Valid credentials produce expected tokens/sessions.
- Invalid credentials return appropriate error responses.
- Expired tokens are rejected.
- Role-based access control is enforced.
- Rate limiting is tested (if applicable).
- CORS headers are validated (if applicable).

### Step 5: Error and Edge Cases

Covers failure modes:
- Invalid input types, missing required fields, extra fields.
- Boundary values (empty strings, zero, negative numbers, max lengths).
- SQL injection, XSS, and common injection patterns.
- Concurrent requests and race conditions (where testable).
- Large payloads, special characters, Unicode.
- Pagination boundaries (first page, last page, beyond range).

### Step 6: Validate and Summary

Validates the test suite:
- All test files have valid syntax.
- Tests can be discovered by the test runner.
- Test naming follows conventions.
- Coverage report against endpoint inventory.
- Summary with run commands and coverage metrics.

## Test Framework Selection

The workflow auto-detects and supports:

| Language | Frameworks |
|---|---|
| JavaScript/TypeScript | Jest, Vitest, Mocha, Supertest, Playwright API testing |
| Python | pytest + httpx/requests, unittest |
| Go | testing + net/http/httptest, testify |
| Java | JUnit 5 + RestAssured, Spring MockMvc |
| Ruby | RSpec + Faraday/HTTParty |
| C# | xUnit + HttpClient, NUnit |
| Elixir | ExUnit + Phoenix.ConnTest |
| Rust | tokio::test + reqwest |

## Variable Reference

| Variable | Type | Default | Description |
|---|---|---|---|
| `api_base_url` | string | `""` | Base URL for API under test |
| `api_auth_type` | string | `none` | Authentication method |
| `test_framework` | string | `auto` | Test framework to use |
| `test_dir` | string | `{project-root}/tests` | Root test directory |
| `test_stack_type` | string | `auto` | Project stack type |
| `test_artifacts` | string | `{project-root}/test-artifacts` | Artifact output directory |

## Test Organization

```
tests/
  api/
    config/
      test.config.ts        # Test configuration
      fixtures.ts            # Shared test data
    helpers/
      request.ts             # HTTP request builder
      auth.ts                # Authentication helpers
      assertions.ts          # Custom assertions
    resources/
      users.test.ts          # User endpoint tests
      orders.test.ts         # Order endpoint tests
      products.test.ts       # Product endpoint tests
    auth/
      authentication.test.ts # Auth flow tests
      authorization.test.ts  # RBAC tests
    edge-cases/
      validation.test.ts     # Input validation tests
      error-handling.test.ts # Error response tests
      boundaries.test.ts     # Boundary value tests
```

## Error Handling

- If no API endpoints are found: search for route definitions, controller files, OpenAPI spec. Ask user if detection fails.
- If test framework cannot be determined: recommend based on detected language and install instructions.
- If authentication type is unclear: generate tests for the most common patterns and let user select.
