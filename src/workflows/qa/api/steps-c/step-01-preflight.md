---
name: 'step-01-preflight'
description: 'Detect API framework, gather endpoints, check dependencies'
nextStepFile: './step-02-design-test-strategy.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1: Preflight — API Discovery and Environment Detection

## STEP GOAL

Detect the project's API framework, inventory all endpoints, identify the authentication method, detect the test framework, and gather all context needed to design the API test strategy.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if no API endpoints can be identified after exhaustive search.
- Do not generate any test files in this step — discovery only.

## CONTEXT BOUNDARIES

- Available context: project root filesystem, config.yaml settings, qa-index.csv knowledge fragments.
- Focus: detection and inventory only.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 1.1 — Detect API Framework

Scan the project to identify the API framework:

| Indicator | Framework |
|---|---|
| `express` in package.json dependencies | Express.js |
| `@nestjs/core` in package.json | NestJS |
| `fastify` in package.json | Fastify |
| `fastapi` in requirements.txt/pyproject.toml | FastAPI |
| `django` + `djangorestframework` | Django REST Framework |
| `flask` in requirements.txt | Flask |
| `gin-gonic/gin` in go.mod | Gin (Go) |
| `echo` in go.mod | Echo (Go) |
| `spring-boot-starter-web` in pom.xml/build.gradle | Spring Boot |
| `rails` in Gemfile | Ruby on Rails |
| `phoenix` in mix.exs | Phoenix (Elixir) |
| `actix-web` in Cargo.toml | Actix Web (Rust) |

Also detect the API style:
- **REST**: Route definitions with HTTP methods (GET, POST, PUT, DELETE).
- **GraphQL**: Schema definitions (`.graphql` files), resolvers, `apollo-server`, `graphene`.
- **gRPC**: `.proto` files, gRPC service definitions.

Record: `detected_api_framework`, `detected_api_style`.

### 1.2 — Inventory API Endpoints

Build a complete endpoint inventory using multiple detection strategies:

**Strategy A — Route/Controller Files:**
Search for route definitions:
- Express/Fastify: `router.get/post/put/delete`, `app.get/post/put/delete`
- NestJS: `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Controller()`
- FastAPI: `@app.get`, `@app.post`, `@router.get`
- Django: `urlpatterns`, `ViewSet`
- Spring: `@GetMapping`, `@PostMapping`, `@RequestMapping`
- Go: `r.GET`, `r.POST`, `mux.HandleFunc`
- Rails: `routes.rb` with `resources`, `get`, `post`

**Strategy B — OpenAPI/Swagger Specification:**
Search for:
- `openapi.yaml`, `openapi.json`, `swagger.yaml`, `swagger.json`
- Auto-generated spec endpoints (`/api/docs`, `/swagger`)

**Strategy C — GraphQL Schema:**
Search for:
- `.graphql` schema files
- Schema definitions in code (type definitions, resolvers)
- Query and Mutation types

**Strategy D — gRPC Proto Files:**
Search for:
- `.proto` files with service definitions
- Generated client/server stubs

For each endpoint, record:
- HTTP method (or query/mutation type).
- Path with parameters.
- Request body schema (if detectable).
- Response schema (if detectable).
- Authentication requirement (if detectable).
- Source file location.

### 1.3 — Detect Authentication Method

Identify how the API handles authentication:

| Indicator | Auth Type |
|---|---|
| `jwt`, `jsonwebtoken`, `pyjwt` in dependencies | Bearer/JWT |
| `passport`, `passport-jwt` | Bearer/JWT with Passport |
| `oauth2`, `authlib` | OAuth2 |
| `basic-auth` middleware, `httpBasic` | Basic Auth |
| `x-api-key` header checks | API Key |
| Session/cookie middleware | Session-based |
| No auth middleware detected | None or undetermined |

Also check for:
- Auth middleware applied globally vs. per-route.
- Role/permission decorators or guards.
- CORS configuration.
- Rate limiting middleware.

Record: `detected_auth_type`, `auth_middleware_location`, `roles_detected`.

### 1.4 — Detect Test Framework

Identify the existing test setup:

- Check for test configuration files (jest.config.*, pytest.ini, vitest.config.*, etc.).
- Check for existing test files and their patterns.
- Check for HTTP testing libraries (supertest, httpx, rest-assured, etc.).
- Check for test runner scripts in package.json, Makefile, or CI config.

If no test framework is detected, recommend one based on the API framework:

| API Framework | Recommended Test Stack |
|---|---|
| Express/NestJS/Fastify | Jest or Vitest + Supertest |
| FastAPI | pytest + httpx |
| Django REST | pytest + Django test client |
| Spring Boot | JUnit 5 + RestAssured or MockMvc |
| Gin/Echo | Go testing + net/http/httptest |
| Rails | RSpec + Faraday |
| Phoenix | ExUnit + Phoenix.ConnTest |

Record: `detected_test_framework`, `http_test_client`, `test_config_file`, `existing_test_count`.

### 1.5 — Detect External Dependencies

Identify services the API depends on for proper test design:
- Databases (need test fixtures and seeding).
- External APIs (need mocking/stubbing).
- File storage (need test buckets/directories).
- Email services (need mock SMTP).
- Message queues (need test consumers).

Record each dependency for test infrastructure planning.

### 1.6 — Check for Existing API Tests

Scan for any existing API test files:
- Count existing tests.
- Identify tested vs. untested endpoints.
- Note test patterns and conventions already in use.
- Check for shared helpers and fixtures.

This avoids duplicating work and ensures new tests integrate with existing ones.

### Save Progress

Save accumulated detection results to {outputFile}:

```markdown
# API Workflow Progress

## Status: step-01-preflight COMPLETE

## API Detection
- Framework: {detected_api_framework}
- API Style: {detected_api_style}
- Auth Type: {detected_auth_type}

## Endpoint Inventory
| Method | Path | Auth Required | Source File |
|---|---|---|---|
| [for each endpoint] |

## Test Framework
- Framework: {detected_test_framework}
- HTTP Client: {http_test_client}
- Existing Tests: {existing_test_count}
- Config: {test_config_file}

## External Dependencies
- [list each dependency]

## Roles Detected
- [list roles if RBAC is detected]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: API framework detected. At least one endpoint inventoried. Test framework identified or recommended. Authentication method determined. All results recorded.
### FAILURE: No API endpoints found after exhaustive search. Unable to determine API framework. Project contains no API source code.
