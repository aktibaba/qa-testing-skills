---
name: 'step-04-auth-tests'
description: 'Generate authentication and authorization test files'
nextStepFile: './step-05-error-edge-cases.md'
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 4: Auth Tests — Authentication and Authorization

## STEP GOAL

Generate dedicated test files for authentication flows and authorization rules. Cover valid/invalid credentials, token lifecycle, role-based access, and security-critical authentication edge cases.

## MANDATORY EXECUTION RULES

- Read the entire step file before acting.
- Speak in {communication_language}.
- Halt if Step 3 test infrastructure (helpers, config) does not exist.
- If `api_auth_type` is `none` and no auth middleware was detected, generate a minimal auth test file that verifies endpoints are publicly accessible, then proceed to the next step.
- Test both positive (access granted) and negative (access denied) scenarios for every auth-protected endpoint.

## CONTEXT BOUNDARIES

- Available context: test infrastructure from Step 3, auth detection from Step 1, knowledge fragments (api-auth-testing).
- Focus: authentication and authorization tests only.

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly.

### 4.1 — Load Auth Context

From `{test_artifacts}/workflow-progress.md`, extract:
- Detected auth type (Bearer/JWT, Basic, OAuth2, API Key, Session, None).
- Auth middleware location and scope (global vs. per-route).
- Detected roles and permissions.
- Protected vs. public endpoints.

**If auth type is `none` and no auth middleware detected:**
- Generate a minimal test file verifying public access.
- Skip to Save Progress.

### 4.2 — Generate Auth Helper

Create or update `{test_dir}/api/helpers/auth.{ext}`:

The auth helper must provide:

**Token/credential management:**
- `getValidToken(role?)` — obtain a valid authentication credential for the given role.
- `getExpiredToken()` — generate or obtain an expired credential.
- `getInvalidToken()` — generate a malformed or invalid credential.
- `getMalformedToken()` — generate a structurally invalid credential (corrupted signature, wrong format).

**Role-based helpers (if RBAC detected):**
- `asAdmin()` — returns auth headers for admin role.
- `asUser()` — returns auth headers for regular user role.
- `asGuest()` — returns headers with no authentication.
- Additional role helpers for each detected role.

**Token caching:**
- Cache valid tokens to avoid repeated auth calls.
- Provide `clearTokenCache()` for tests that need fresh tokens.

### 4.3 — Generate Authentication Test File

Create `{test_dir}/api/auth/authentication.test.{ext}`:

**Login/Token Acquisition Tests:**

```
describe('Authentication', () => {

  describe('Login / Token Acquisition', () => {
    it('should return a valid token with correct credentials', ...);
    it('should return 401 with incorrect password', ...);
    it('should return 401 with non-existent user', ...);
    it('should return 400 with missing username/email', ...);
    it('should return 400 with missing password', ...);
    it('should return token with expected structure and claims', ...);
  });

  describe('Token Validation', () => {
    it('should accept requests with a valid token', ...);
    it('should reject requests with an expired token', ...);
    it('should reject requests with a malformed token', ...);
    it('should reject requests with an invalid signature', ...);
    it('should reject requests with no token', ...);
    it('should reject requests with empty Authorization header', ...);
  });

  describe('Token Refresh', () => {
    it('should issue a new token with a valid refresh token', ...);
    it('should reject refresh with an expired refresh token', ...);
    it('should reject refresh with an invalid refresh token', ...);
  });

  describe('Logout / Token Revocation', () => {
    it('should invalidate the token after logout', ...);
    it('should reject subsequent requests with the revoked token', ...);
  });

  describe('Password Security', () => {
    it('should not return the password in any response body', ...);
    it('should not log passwords in request bodies', ...);
    it('should enforce minimum password requirements', ...);
  });

});
```

Adapt based on detected auth type:
- **Basic Auth**: Test with correct/incorrect base64 encoded credentials.
- **API Key**: Test with valid/invalid/missing API key in header or query parameter.
- **OAuth2**: Test authorization code flow, client credentials, token introspection.
- **Session**: Test login, session cookie, session expiry, logout.

### 4.4 — Generate Authorization Test File

Create `{test_dir}/api/auth/authorization.test.{ext}`:

**Role-Based Access Control Tests:**

```
describe('Authorization', () => {

  describe('Admin Endpoints', () => {
    it('should allow admin access to admin-only endpoints', ...);
    it('should deny regular user access to admin endpoints with 403', ...);
    it('should deny unauthenticated access to admin endpoints with 401', ...);
  });

  describe('User Endpoints', () => {
    it('should allow users to access their own resources', ...);
    it('should deny users access to other users resources with 403', ...);
    it('should allow admin access to any user resources', ...);
  });

  describe('Resource Ownership', () => {
    it('should allow resource owner to update their resource', ...);
    it('should deny non-owner update with 403', ...);
    it('should allow resource owner to delete their resource', ...);
    it('should deny non-owner delete with 403', ...);
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent Tenant A from accessing Tenant B data', ...);
    it('should scope list queries to the authenticated tenant', ...);
  });

});
```

Skip cross-tenant tests if multi-tenancy is not detected.
Skip role-specific tests for roles that are not detected.

### 4.5 — Generate Security Header Tests

Add security-related header tests (can be in the authentication test file or a separate file):

```
describe('Security Headers', () => {
  it('should set X-Content-Type-Options: nosniff', ...);
  it('should set X-Frame-Options header', ...);
  it('should not expose server version in headers', ...);
  it('should set appropriate CORS headers', ...);
  it('should not return sensitive headers in error responses', ...);
});
```

### Save Progress

Append to {outputFile}:

```markdown
## Status: step-04-auth-tests COMPLETE

## Auth Test Files
| File | Tests | Coverage |
|---|---|---|
| authentication.test.{ext} | [count] | Login, token validation, refresh, logout |
| authorization.test.{ext} | [count] | RBAC, ownership, tenant isolation |
| auth helper | - | Token management, role helpers |

## Auth Coverage
- Auth type tested: {detected_auth_type}
- Roles covered: [list]
- Positive scenarios: [count]
- Negative scenarios: [count]
```

Load next step: {nextStepFile}

## SUCCESS/FAILURE METRICS

### SUCCESS: Authentication tests cover valid and invalid credential flows. Authorization tests verify every detected role. Both positive (access granted) and negative (access denied) scenarios are covered. Auth helper provides token management for all roles. No hardcoded credentials in test files (use config/fixtures).
### FAILURE: Only positive auth scenarios tested. Missing tests for expired/invalid tokens. Role-based access not tested for all detected roles. Credentials hardcoded in test files.
