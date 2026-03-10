---
name: 'step-05-error-edge-cases'
description: 'Generate error handling and edge case test files'
nextStepFile: './step-06-validate-and-summary.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 5: Error and Edge Cases — Failure Mode Testing

## STEP GOAL

Generate test files that cover error handling, input validation edge cases, boundary values, injection patterns, and unusual request scenarios. Ensure the API fails gracefully and returns consistent, informative error responses.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if Step 3 test infrastructure does not exist.
- Generate tests for all Critical and High risk endpoints. Medium risk endpoints get selective coverage.
- Every error test must assert both the status code AND the error response body structure.

## CONTEXT BOUNDARIES

- Available context: test plan from Step 2, test infrastructure from Step 3, knowledge fragments (error-handling-testing, api-testing-fundamentals).
- Focus: error paths, validation, boundaries, and injection. Do not duplicate happy path tests from Step 3.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 5.1 — Load Context

From `{test_artifacts}/workflow-progress.md`, extract:
- Endpoint inventory with risk classifications.
- Generated resource test files (to avoid duplication).
- Request body schemas for each endpoint.
- Test data factories.

### 5.2 — Generate Input Validation Tests

Create `{test_dir}/api/edge-cases/validation.test.{ext}`:

**Required Field Validation:**

For each endpoint that accepts a request body, test with each required field missing individually:

```
describe('Input Validation', () => {

  describe('POST /api/{resource} — Required Fields', () => {
    it('should return 400/422 when "name" field is missing', ...);
    it('should return 400/422 when "email" field is missing', ...);
    it('should return field-level error identifying the missing field', ...);
    it('should return 400/422 when request body is empty', ...);
    it('should return 400/422 when request body is not JSON', ...);
  });

  describe('POST /api/{resource} — Type Validation', () => {
    it('should reject string where number is expected', ...);
    it('should reject number where string is expected', ...);
    it('should reject boolean where string is expected', ...);
    it('should reject array where object is expected', ...);
    it('should reject null for non-nullable fields', ...);
  });

  describe('POST /api/{resource} — Format Validation', () => {
    it('should reject invalid email format', ...);
    it('should reject invalid URL format', ...);
    it('should reject invalid date format', ...);
    it('should reject invalid UUID format', ...);
  });

  describe('POST /api/{resource} — Extra Fields', () => {
    it('should ignore or reject unknown fields in request body', ...);
    it('should not allow mass assignment of protected fields (role, isAdmin)', ...);
  });

});
```

### 5.3 — Generate Boundary Value Tests

Create `{test_dir}/api/edge-cases/boundaries.test.{ext}`:

```
describe('Boundary Values', () => {

  describe('String Fields', () => {
    it('should handle empty string for optional fields', ...);
    it('should reject empty string for required fields', ...);
    it('should handle maximum length strings', ...);
    it('should reject strings exceeding maximum length', ...);
    it('should handle strings with leading/trailing whitespace', ...);
    it('should handle strings with special characters (!@#$%^&*)', ...);
    it('should handle Unicode characters (emoji, CJK, RTL text)', ...);
    it('should handle strings with newlines and control characters', ...);
  });

  describe('Numeric Fields', () => {
    it('should handle zero value', ...);
    it('should handle negative numbers where applicable', ...);
    it('should reject negative numbers where not applicable', ...);
    it('should handle maximum integer value', ...);
    it('should handle decimal precision boundaries', ...);
    it('should reject NaN and Infinity', ...);
  });

  describe('Collection Endpoints', () => {
    it('should return empty array when no items exist', ...);
    it('should handle page=0 or page=-1 gracefully', ...);
    it('should handle limit=0 gracefully', ...);
    it('should handle extremely large limit values', ...);
    it('should handle page number beyond total pages', ...);
    it('should handle sort by non-existent field', ...);
  });

  describe('ID Parameters', () => {
    it('should return 404 for non-existent numeric ID', ...);
    it('should return 400/404 for non-numeric ID when numeric expected', ...);
    it('should return 400/404 for malformed UUID', ...);
    it('should return 400/404 for excessively long ID', ...);
  });

});
```

### 5.4 — Generate Error Handling Tests

Create `{test_dir}/api/edge-cases/error-handling.test.{ext}`:

```
describe('Error Handling', () => {

  describe('Error Response Format', () => {
    it('should return consistent error response structure for all errors', ...);
    it('should include error code or type in error responses', ...);
    it('should include human-readable message in error responses', ...);
    it('should not expose stack traces in error responses', ...);
    it('should not expose internal paths or server details', ...);
    it('should return JSON content-type for error responses', ...);
  });

  describe('HTTP Method Handling', () => {
    it('should return 405 for unsupported HTTP methods', ...);
    it('should include Allow header in 405 responses', ...);
  });

  describe('Content Type Handling', () => {
    it('should return 415 for unsupported content types', ...);
    it('should return 406 for unsupported Accept headers', ...);
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', ...);
    it('should include Retry-After header in 429 responses', ...);
    it('should include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)', ...);
  });

  describe('Large Payloads', () => {
    it('should return 413 for request body exceeding size limit', ...);
    it('should handle large JSON arrays gracefully', ...);
    it('should handle deeply nested JSON objects gracefully', ...);
  });

});
```

### 5.5 — Generate Injection Tests

Add injection pattern tests (in the validation or a dedicated file):

```
describe('Injection Prevention', () => {

  describe('SQL Injection', () => {
    it('should safely handle single quotes in string fields', ...);
    it('should safely handle SQL keywords in input (SELECT, DROP, UNION)', ...);
    it('should safely handle SQL injection in query parameters', ...);
    it('should safely handle SQL injection in path parameters', ...);
  });

  describe('NoSQL Injection', () => {
    it('should safely handle $gt, $ne operators in JSON fields', ...);
    it('should safely handle $where clauses in input', ...);
  });

  describe('XSS Prevention', () => {
    it('should sanitize or escape HTML tags in input', ...);
    it('should sanitize script tags in stored data', ...);
    it('should not reflect unsanitized input in responses', ...);
  });

  describe('Path Traversal', () => {
    it('should reject path traversal patterns (../../) in file-related endpoints', ...);
    it('should reject encoded path traversal patterns', ...);
  });

});
```

Only generate injection tests for Critical and High risk endpoints. Skip for endpoints that do not accept user input.

### Save Progress

Append to {outputFile}:

```markdown
## Status: step-05-error-edge-cases COMPLETE

## Edge Case Test Files
| File | Tests | Coverage |
|---|---|---|
| validation.test.{ext} | [count] | Required fields, types, formats |
| boundaries.test.{ext} | [count] | String, numeric, collection, ID boundaries |
| error-handling.test.{ext} | [count] | Error format, methods, content types, rate limiting |

## Edge Case Coverage
- Validation tests: [count]
- Boundary tests: [count]
- Error handling tests: [count]
- Injection tests: [count]
- Total: [count]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Validation tests cover all required fields for Critical/High risk endpoints. Boundary value tests cover string, numeric, and collection edge cases. Error response format is tested for consistency. Injection tests cover SQL injection and XSS for Critical endpoints. All error tests assert both status code and response body.
### FAILURE: Only status codes are asserted without checking response bodies. Missing validation tests for required fields. No boundary value tests. No injection pattern tests for Critical endpoints.
