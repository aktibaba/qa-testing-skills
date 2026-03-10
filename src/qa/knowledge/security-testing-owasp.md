# OWASP Top 10 Security Testing

## Principle
Security testing must systematically probe each OWASP Top 10 vulnerability category with automated, repeatable tests that run on every build, not just during annual penetration tests.

## Rationale
Security vulnerabilities discovered in production cost 30x more to fix than those caught
during development. The OWASP Top 10 represents the most critical web application
security risks, yet many teams defer security testing to infrequent manual penetration
tests or rely solely on static analysis tools that miss runtime vulnerabilities.

Automated security tests embedded in the CI pipeline catch the most common
vulnerabilities---SQL injection, XSS, broken authentication, CSRF, insecure
headers---every time code changes. These tests complement (but do not replace) manual
penetration testing and security audits. The goal is to create a safety net that catches
regressions immediately, leaving penetration testers free to focus on complex,
business-logic vulnerabilities.

## Pattern Examples

### 1. SQL Injection Testing (A03:2021 - Injection)

```python
# tests/security/test_injection.py
"""Test for SQL injection vulnerabilities."""

import pytest
import requests

BASE_URL = "http://localhost:8000/api"

# Common SQL injection payloads.
SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "' UNION SELECT * FROM users--",
    "1; SELECT * FROM information_schema.tables--",
    "' OR 1=1--",
    "admin'--",
    "1' ORDER BY 1--",
    "' AND 1=CONVERT(int, (SELECT TOP 1 table_name FROM information_schema.tables))--",
    "'; WAITFOR DELAY '0:0:5'--",  # Time-based blind injection.
]


class TestSQLInjection:

    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_search_endpoint_rejects_injection(self, auth_headers, payload):
        """Search parameters must be parameterized, not concatenated."""
        res = requests.get(
            f"{BASE_URL}/products",
            params={"search": payload},
            headers=auth_headers,
        )

        # Should return 200 with empty results or 400, NOT a 500 (which
        # indicates the payload reached the database unescaped).
        assert res.status_code != 500, f"Possible SQL injection with: {payload}"

        # The response should not contain database error messages.
        body = res.text.lower()
        assert "syntax error" not in body
        assert "sql" not in body or "sql injection" not in body
        assert "unclosed quotation" not in body
        assert "unterminated" not in body

    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_login_endpoint_rejects_injection(self, payload):
        """Auth endpoints are prime injection targets."""
        res = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": payload, "password": "anything"},
        )

        # Must not return 200 (successful auth via injection).
        assert res.status_code in (400, 401, 422)

    @pytest.mark.parametrize("payload", SQL_INJECTION_PAYLOADS)
    def test_path_parameter_rejects_injection(self, auth_headers, payload):
        """URL path parameters must be validated."""
        res = requests.get(
            f"{BASE_URL}/users/{payload}",
            headers=auth_headers,
        )
        assert res.status_code in (400, 404, 422)
```

### 2. Cross-Site Scripting (XSS) Testing (A03:2021 - Injection)

```javascript
// tests/security/xss.test.js
const request = require("supertest");
const app = require("../../src/app");

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  '"><script>alert(document.cookie)</script>',
  "javascript:alert('xss')",
  '<svg onload=alert("xss")>',
  '{{constructor.constructor("return this")()}}',
  "${7*7}",  // Template injection.
  '<iframe src="javascript:alert(1)">',
  "'-alert(1)-'",
  '<body onload=alert("xss")>',
];

describe("XSS prevention", () => {
  for (const payload of XSS_PAYLOADS) {
    it(`sanitizes user input: ${payload.slice(0, 40)}...`, async () => {
      // Submit the payload as user-generated content.
      const createRes = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: payload, price: 10, category: "test" });

      // If creation succeeds, verify the stored data is sanitized.
      if (createRes.status === 201) {
        const productId = createRes.body.data.id;
        const readRes = await request(app)
          .get(`/api/products/${productId}`)
          .set("Authorization", `Bearer ${adminToken}`);

        const storedName = readRes.body.data.name;

        // The stored value must not contain executable script tags.
        expect(storedName).not.toContain("<script");
        expect(storedName).not.toContain("onerror=");
        expect(storedName).not.toContain("onload=");
        expect(storedName).not.toContain("javascript:");
      } else {
        // If creation was rejected, that's also acceptable (input validation).
        expect(createRes.status).toBe(422);
      }
    });
  }
});
```

### 3. Security Headers Testing (A05:2021 - Security Misconfiguration)

```python
# tests/security/test_headers.py
"""Verify security headers are present on all responses."""

import pytest
import requests

BASE_URL = "http://localhost:8000"

ENDPOINTS = ["/", "/api/products", "/api/users/me", "/login"]


class TestSecurityHeaders:

    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    def test_strict_transport_security(self, endpoint):
        res = requests.get(f"{BASE_URL}{endpoint}", allow_redirects=False)
        hsts = res.headers.get("Strict-Transport-Security", "")
        assert "max-age=" in hsts, f"Missing HSTS header on {endpoint}"
        max_age = int(hsts.split("max-age=")[1].split(";")[0])
        assert max_age >= 31536000, "HSTS max-age should be at least 1 year"

    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    def test_content_type_options(self, endpoint):
        res = requests.get(f"{BASE_URL}{endpoint}", allow_redirects=False)
        assert res.headers.get("X-Content-Type-Options") == "nosniff"

    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    def test_frame_options(self, endpoint):
        res = requests.get(f"{BASE_URL}{endpoint}", allow_redirects=False)
        xfo = res.headers.get("X-Frame-Options", "")
        assert xfo in ("DENY", "SAMEORIGIN"), f"Missing X-Frame-Options on {endpoint}"

    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    def test_content_security_policy(self, endpoint):
        res = requests.get(f"{BASE_URL}{endpoint}", allow_redirects=False)
        csp = res.headers.get("Content-Security-Policy", "")
        assert "default-src" in csp, f"Missing CSP on {endpoint}"
        # Should not allow unsafe-inline for scripts.
        assert "'unsafe-inline'" not in csp.split("script-src")[1] if "script-src" in csp else True

    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    def test_no_server_version_leakage(self, endpoint):
        res = requests.get(f"{BASE_URL}{endpoint}", allow_redirects=False)
        server = res.headers.get("Server", "")
        # Server header should not reveal version numbers.
        assert not any(c.isdigit() for c in server), \
            f"Server header leaks version: {server}"
        # Powered-by should not be present.
        assert "X-Powered-By" not in res.headers

    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    def test_referrer_policy(self, endpoint):
        res = requests.get(f"{BASE_URL}{endpoint}", allow_redirects=False)
        rp = res.headers.get("Referrer-Policy", "")
        safe_policies = [
            "no-referrer",
            "strict-origin-when-cross-origin",
            "same-origin",
            "strict-origin",
        ]
        assert rp in safe_policies, f"Unsafe Referrer-Policy: {rp}"
```

### 4. CSRF Protection Testing (A01:2021 - Broken Access Control)

```javascript
// tests/security/csrf.test.js
const request = require("supertest");
const app = require("../../src/app");

describe("CSRF protection", () => {
  it("rejects state-changing requests without CSRF token", async () => {
    // POST without CSRF token should be rejected.
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Origin", "https://evil-site.com")  // Cross-origin.
      .send({ name: "Hacker", email: "hack@evil.com" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("CSRF");
  });

  it("accepts requests with valid CSRF token", async () => {
    // First, get a CSRF token from the server.
    const tokenRes = await request(app)
      .get("/api/csrf-token")
      .set("Authorization", `Bearer ${adminToken}`);

    const csrfToken = tokenRes.body.token;

    // Include the CSRF token in the state-changing request.
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Legit User", email: "legit@example.com", password: "Pass1!" });

    expect(res.status).toBe(201);
  });

  it("rejects requests from disallowed origins", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("Origin", "https://malicious-site.com")
      .send({ name: "Evil", email: "evil@example.com" });

    expect(res.status).toBe(403);
  });
});
```

### 5. Rate Limiting Tests (A04:2021 - Insecure Design)

```python
# tests/security/test_rate_limiting.py
"""Verify rate limiting is enforced on sensitive endpoints."""

import time
import requests
import pytest

BASE_URL = "http://localhost:8000"


class TestRateLimiting:

    def test_login_rate_limit(self):
        """Login endpoint should limit repeated attempts."""
        responses = []
        for i in range(20):
            res = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "test@example.com", "password": "wrong"},
            )
            responses.append(res.status_code)

        # At some point, we should start getting 429 Too Many Requests.
        assert 429 in responses, "Login endpoint is not rate limited"

        # The 429 response should include a Retry-After header.
        last_429 = [r for r in range(len(responses)) if responses[r] == 429]
        if last_429:
            res = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "test@example.com", "password": "wrong"},
            )
            if res.status_code == 429:
                assert "Retry-After" in res.headers

    def test_password_reset_rate_limit(self):
        """Password reset should be rate limited to prevent email bombing."""
        responses = []
        for i in range(10):
            res = requests.post(
                f"{BASE_URL}/api/auth/forgot-password",
                json={"email": "test@example.com"},
            )
            responses.append(res.status_code)

        assert 429 in responses, "Password reset is not rate limited"

    def test_api_global_rate_limit(self, auth_headers):
        """General API should have a higher but still enforced rate limit."""
        responses = []
        for i in range(200):
            res = requests.get(
                f"{BASE_URL}/api/products",
                headers=auth_headers,
            )
            responses.append(res.status_code)

        rate_limited = responses.count(429)
        # At high volume, some requests should be rate limited.
        assert rate_limited > 0, "No rate limiting detected on API endpoint"

    def test_rate_limit_resets_after_window(self):
        """Rate limit should reset after the window expires."""
        # Exhaust the rate limit.
        for i in range(20):
            requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "reset-test@example.com", "password": "wrong"},
            )

        # Wait for the rate limit window to expire.
        time.sleep(62)  # Assume 1-minute window.

        # Should be able to make requests again.
        res = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "reset-test@example.com", "password": "wrong"},
        )
        assert res.status_code != 429
```

### 6. Broken Authentication Testing (A07:2021)

```javascript
// tests/security/broken-auth.test.js
const request = require("supertest");
const app = require("../../src/app");

describe("Authentication security", () => {
  it("does not reveal whether an email exists during login", async () => {
    // Both existing and non-existing emails should return the same error.
    const existingRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "real-user@example.com", password: "wrong-password" });

    const nonExistingRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@example.com", password: "wrong-password" });

    // Same status code.
    expect(existingRes.status).toBe(nonExistingRes.status);
    // Same error message (no user enumeration).
    expect(existingRes.body.message).toBe(nonExistingRes.body.message);
    // Response time should be similar (prevent timing attacks).
  });

  it("enforces password complexity requirements", async () => {
    const weakPasswords = [
      "123456",          // Too simple.
      "password",        // Common password.
      "short",           // Too short.
      "nodigits!",       // No numbers.
      "12345678",        // No letters.
    ];

    for (const password of weakPasswords) {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test-${Date.now()}@example.com`,
          name: "Test",
          password,
        });

      expect(res.status).toBe(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "password" }),
        ])
      );
    }
  });

  it("locks account after repeated failed attempts", async () => {
    const email = "lockout-test@example.com";

    // Make 10 failed login attempts.
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong" });
    }

    // The 11th attempt, even with the correct password, should fail.
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "CorrectPass1!" });

    expect(res.status).toBe(423); // 423 Locked or 403.
    expect(res.body.message).toContain("locked");
  });

  it("does not expose sensitive data in error responses", async () => {
    const res = await request(app)
      .get("/api/users/nonexistent-id")
      .set("Authorization", `Bearer ${adminToken}`);

    // Error response should not contain stack traces or internal details.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("at Object.");  // No stack trace.
    expect(body).not.toContain("node_modules"); // No file paths.
    expect(body).not.toContain("SELECT");       // No SQL queries.
    expect(body).not.toContain("password");     // No credential fields.
  });
});
```

### 7. IDOR (Insecure Direct Object Reference) Testing (A01:2021)

```python
# tests/security/test_idor.py
"""Test that users cannot access other users' resources."""

import pytest
import requests

BASE_URL = "http://localhost:8000/api"


class TestIDOR:

    def test_user_cannot_read_other_users_profile(self, user_a_headers, user_b_id):
        res = requests.get(
            f"{BASE_URL}/users/{user_b_id}",
            headers=user_a_headers,
        )
        # Should be 403 Forbidden, not 200.
        assert res.status_code == 403

    def test_user_cannot_update_other_users_profile(self, user_a_headers, user_b_id):
        res = requests.patch(
            f"{BASE_URL}/users/{user_b_id}",
            json={"name": "Hacked Name"},
            headers=user_a_headers,
        )
        assert res.status_code == 403

    def test_user_cannot_read_other_users_orders(self, user_a_headers, user_b_order_id):
        res = requests.get(
            f"{BASE_URL}/orders/{user_b_order_id}",
            headers=user_a_headers,
        )
        assert res.status_code == 403

    def test_user_cannot_delete_other_users_data(self, user_a_headers, user_b_id):
        res = requests.delete(
            f"{BASE_URL}/users/{user_b_id}",
            headers=user_a_headers,
        )
        assert res.status_code == 403

    def test_sequential_id_enumeration(self, user_a_headers):
        """Probe sequential IDs to find other users' resources."""
        for guessed_id in range(1, 100):
            res = requests.get(
                f"{BASE_URL}/orders/{guessed_id}",
                headers=user_a_headers,
            )
            # Should never return 200 for another user's order.
            if res.status_code == 200:
                order = res.json()["data"]
                assert order["userId"] == "user-a-id", \
                    f"IDOR: User A can access order {guessed_id} belonging to another user"
```
