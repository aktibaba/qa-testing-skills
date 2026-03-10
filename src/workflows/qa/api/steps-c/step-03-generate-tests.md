---
name: 'step-03-generate-tests'
description: 'Generate API test files based on the test strategy'
nextStepFile: './step-04-auth-tests.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 3: Generate Tests — Create API Test Files

## STEP GOAL

Generate the core API test files including shared test infrastructure (helpers, config, fixtures) and resource-level functional tests for all endpoints identified in the test plan.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if the test plan from Step 2 is missing.
- Generate real, executable test code — no placeholder functions or TODO comments.
- Follow the detected test framework's conventions exactly.
- Each test must be independent and isolated.

## CONTEXT BOUNDARIES

- Available context: test plan from `{test_artifacts}/workflow-progress.md`, API source files, detected framework conventions.
- Focus: functional tests and shared infrastructure only. Auth tests are in Step 4, edge cases in Step 5.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 3.1 — Load Test Plan

Read `{test_artifacts}/workflow-progress.md` and extract:
- Test file structure.
- Endpoint coverage matrix.
- Shared infrastructure design.
- Test data factories design.

**If test plan is missing or Step 2 is not marked COMPLETE:**
- **HALT** — return to Step 2.

### 3.2 — Create Directory Structure

Create the test directory hierarchy:

```
{test_dir}/api/
  config/
  helpers/
  resources/
  auth/
  edge-cases/
```

### 3.3 — Generate Test Configuration

Create `{test_dir}/api/config/test.config.{ext}`:

The configuration must include:
- `baseUrl`: Read from environment variable with fallback to detected value.
- `timeout`: Default request timeout (10 seconds recommended).
- `retries`: Number of retries for flaky network conditions (0 for strict testing).
- `headers`: Default headers (Content-Type: application/json, Accept: application/json).
- `auth`: Authentication configuration (token endpoint, credentials for test user).

Example structure (adapt to detected framework):

```typescript
// For Jest/Vitest + Supertest
export const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};
```

### 3.4 — Generate Test Data Fixtures

Create `{test_dir}/api/config/fixtures.{ext}`:

For each API resource, define:
- A factory function producing valid creation payloads.
- Each factory generates unique data using timestamps or random values.
- Override capability for specific field testing.

Example structure:

```typescript
export const userFactory = (overrides = {}) => ({
  name: `test-user-${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  ...overrides,
});
```

### 3.5 — Generate Request Helper

Create `{test_dir}/api/helpers/request.{ext}`:

The request helper must provide:
- A configured HTTP client instance with base URL and defaults.
- Methods for each HTTP verb (get, post, put, patch, delete).
- Automatic header injection.
- Request/response logging toggle for debugging.
- Response time tracking.

### 3.6 — Generate Assertion Helper

Create `{test_dir}/api/helpers/assertions.{ext}`:

Custom assertions for common patterns:
- `expectStatus(response, code)` — assert status code with descriptive error.
- `expectJsonBody(response)` — assert JSON content-type and parseable body.
- `expectSchema(response, schema)` — validate response against a schema definition.
- `expectPaginated(response)` — validate pagination structure (items, total, page, limit).
- `expectError(response, code, message)` — validate error response format.
- `expectCreated(response, requiredFields)` — validate 201 response with required fields present.

### 3.7 — Generate Cleanup Helper

Create `{test_dir}/api/helpers/cleanup.{ext}`:

Cleanup utility that:
- Tracks entity IDs created during tests.
- Provides a `register(resource, id)` function to track created entities.
- Provides a `cleanupAll()` function that deletes all tracked entities in reverse order.
- Handles cleanup failures gracefully (log but do not fail tests on cleanup errors).

### 3.8 — Generate Resource Test Files

For each API resource in the test plan, create `{test_dir}/api/resources/{resource}.test.{ext}`:

**Each test file must include:**

**Setup/Teardown:**
- Before all: create required test data dependencies (e.g., create a user before testing orders).
- After each: clean up entities created during the test.
- After all: final cleanup of all test data.

**Happy Path Tests (required for all risk levels):**

For each CRUD operation on the resource:

```
describe('[Resource Name] API', () => {

  describe('GET /api/{resources}', () => {
    it('should return a list of {resources} with 200 status', ...);
    it('should return items matching the expected schema', ...);
    it('should support pagination parameters', ...);
  });

  describe('GET /api/{resources}/:id', () => {
    it('should return a single {resource} by ID with 200 status', ...);
    it('should return 404 for a non-existent ID', ...);
  });

  describe('POST /api/{resources}', () => {
    it('should create a new {resource} with 201 status', ...);
    it('should return the created {resource} with an ID', ...);
    it('should reject requests with missing required fields', ...);
  });

  describe('PUT /api/{resources}/:id', () => {
    it('should update an existing {resource} with 200 status', ...);
    it('should return 404 for a non-existent ID', ...);
  });

  describe('DELETE /api/{resources}/:id', () => {
    it('should delete an existing {resource} with 200/204 status', ...);
    it('should return 404 for a non-existent ID', ...);
  });

});
```

Adapt the structure and syntax to the detected test framework (pytest uses `def test_*` functions, Go uses `func Test*`, etc.).

**Validation Tests (required for Critical and High risk):**
- Missing required fields return 400/422.
- Invalid data types return appropriate errors.
- Duplicate unique fields return 409.

### 3.9 — Verify Generated Files

After generating all files:
- Count total test files and test cases.
- Verify file names match the test framework's discovery pattern.
- Verify imports/requires reference correct helper paths.
- Verify no circular dependencies between test modules.

### Save Progress

Append to {outputFile}:

```markdown
## Status: step-03-generate-tests COMPLETE

## Generated Test Files
| File | Tests | Endpoints Covered |
|---|---|---|
| [for each file] |

## Shared Infrastructure
- Config: {test_dir}/api/config/test.config.{ext}
- Fixtures: {test_dir}/api/config/fixtures.{ext}
- Request helper: {test_dir}/api/helpers/request.{ext}
- Assertions: {test_dir}/api/helpers/assertions.{ext}
- Cleanup: {test_dir}/api/helpers/cleanup.{ext}

## Test Count
- Resource tests: [count]
- Validation tests: [count]
- Total: [count]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: All planned test files generated with executable code. Shared infrastructure (config, helpers, fixtures) created. Each resource has a test file covering happy paths. Test file names follow framework discovery conventions. No placeholder or TODO code.
### FAILURE: Test files contain placeholder functions. Helper modules are missing. Generated code has syntax errors. Test files do not follow framework conventions.
