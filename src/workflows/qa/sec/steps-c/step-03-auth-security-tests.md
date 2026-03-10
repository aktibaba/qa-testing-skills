---
name: 'sec-c-step-03-auth-security-tests'
step: 3
mode: create
next_step: 'step-04-input-validation-tests.md'
previous_step: 'step-02-threat-model.md'
---

# Step 3 — Authentication, Session, and RBAC Security Tests

## STEP GOAL

Generate comprehensive security tests for authentication flows, session management, and role-based access control. These tests verify that identity controls are correctly implemented and resistant to common attack patterns.

## MANDATORY EXECUTION RULES

1. You MUST generate tests for the authentication mechanism detected in step 1.
2. You MUST test both positive (valid credentials) and negative (invalid credentials, expired tokens, wrong roles) cases.
3. You MUST test horizontal and vertical privilege escalation.
4. You MUST NOT store real credentials in test files — use environment variables.
5. You MUST include descriptive comments explaining each attack vector being tested.
6. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read progress file for auth mechanism, endpoints, and threat model
- Read authentication middleware and configuration
- Read RBAC/permission definitions
- Read session management configuration
- Create test files in `{test_dir}/security/auth/`
- Do NOT execute security tests in this step
- Do NOT test against production systems

## MANDATORY SEQUENCE

### 3.1 — Set Up Security Test Directory

Create the security test directory structure:

```
{test_dir}/security/
  auth/
    login-tests.[ext]
    session-tests.[ext]
    rbac-tests.[ext]
    jwt-tests.[ext]         # if JWT-based
    oauth-tests.[ext]       # if OAuth2-based
  helpers/
    auth-helper.[ext]
    request-helper.[ext]
  fixtures/
    test-users.json         # role definitions (no real passwords)
  config/
    security-test.config.[ext]
```

Use the project's primary test framework for test files (Jest, pytest, Go test, JUnit, etc.).

### 3.2 — Generate Login Security Tests

Test the authentication flow for security weaknesses:

1. **Valid authentication** — Verify correct credentials return valid tokens/sessions
2. **Invalid credentials** — Verify wrong password returns 401, not 500
3. **Non-existent user** — Verify response is indistinguishable from wrong password (timing attack prevention)
4. **Empty credentials** — Verify empty username/password are rejected
5. **SQL injection in login** — Test `' OR 1=1 --`, `admin'--` in username/password fields
6. **Brute force protection** — Verify account lockout or rate limiting after N failed attempts
7. **Credential stuffing** — Verify rate limiting applies per-IP, not just per-account
8. **Password policy** — Verify weak passwords are rejected (if registration exists)
9. **Case sensitivity** — Verify email/username handling is consistent
10. **Timing attacks** — Verify response time is consistent regardless of whether user exists

### 3.3 — Generate Session Management Tests

Test session lifecycle security:

1. **Session creation** — Verify session ID is generated with sufficient entropy
2. **Session expiration** — Verify sessions expire after the configured timeout
3. **Session invalidation** — Verify logout destroys the session server-side
4. **Session fixation** — Verify session ID changes after authentication
5. **Concurrent sessions** — Verify behavior with multiple active sessions (if limited)
6. **Cookie attributes** — Verify Secure, HttpOnly, SameSite flags on session cookies
7. **Token rotation** — Verify refresh tokens are rotated on use (if applicable)

### 3.4 — Generate JWT-Specific Tests (if applicable)

If the application uses JWTs:

1. **Signature validation** — Verify tampered tokens are rejected
2. **Algorithm confusion** — Test `alg: none` and `alg: HS256` with RSA public key
3. **Expiration enforcement** — Verify expired tokens are rejected
4. **Claims validation** — Verify `iss`, `aud`, `sub` claims are validated
5. **Key confusion** — Verify token signed with wrong key is rejected
6. **Token reuse after logout** — Verify revoked tokens are rejected (if blacklist exists)
7. **Sensitive data in payload** — Verify JWT payload does not contain passwords or sensitive PII
8. **Token size** — Verify oversized tokens are rejected gracefully

### 3.5 — Generate RBAC/Authorization Tests

Test access control boundaries:

1. **Vertical privilege escalation** — For each admin-only endpoint:
   - Attempt access with a regular user token
   - Attempt access with no token
   - Verify 403 Forbidden (not 404 or 500)

2. **Horizontal privilege escalation** — For each user-specific resource:
   - Authenticate as User A
   - Attempt to access User B's resource by changing the resource ID
   - Verify 403 Forbidden

3. **IDOR (Insecure Direct Object Reference)** — For each endpoint with resource IDs:
   - Test sequential ID enumeration (id=1, id=2, id=3)
   - Test with UUIDs from other users
   - Verify access control is enforced at the data layer

4. **Function-level access control** — For each privileged function:
   - Test direct API call bypassing UI restrictions
   - Test with manipulated role claims in tokens
   - Verify server-side enforcement

5. **Missing authorization** — For each authenticated endpoint:
   - Send request without Authorization header
   - Send request with empty Authorization header
   - Send request with malformed token
   - Verify consistent 401 response

### 3.6 — Generate Rate Limiting Tests

Test abuse prevention controls:

1. **Login rate limiting** — Verify throttling after configurable failed attempts
2. **API rate limiting** — Verify per-user and per-IP rate limits on endpoints
3. **Rate limit headers** — Verify `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
4. **Rate limit bypass** — Test header manipulation (`X-Forwarded-For`, `X-Real-IP`) to bypass IP-based limits

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 3 Complete — Auth Security Tests Generated

## Generated Files
- [list of all generated auth test files]

## Test Coverage
- Login security: [count] test cases
- Session management: [count] test cases
- JWT security: [count] test cases (or N/A)
- RBAC/Authorization: [count] test cases
- Rate limiting: [count] test cases

## Threats Addressed
[List of threats from threat model that are now covered]

## Next Step
step-04-input-validation-tests.md
```

## SUCCESS METRICS

- Login security tests cover at least 8 attack vectors
- Session management tests cover creation, expiration, invalidation, and fixation
- RBAC tests cover both vertical and horizontal privilege escalation
- IDOR tests implemented for all user-specific resource endpoints
- Tests use environment variables for credentials (no hardcoded secrets)
- Each test includes a comment explaining the vulnerability being tested
- Progress file updated

## FAILURE METRICS

- Fewer than 5 login test cases
- No privilege escalation tests
- No IDOR tests
- Credentials hardcoded in test files
- Tests lack explanatory comments
- Progress file not updated

---

**Next step:** Load `step-04-input-validation-tests.md`
