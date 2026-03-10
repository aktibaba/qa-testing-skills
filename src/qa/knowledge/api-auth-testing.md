# API Authentication and Authorization Testing

## Principle
Auth testing must verify that every endpoint enforces identity (authentication) and permission (authorization) boundaries, treating the absence of a rejection as a critical security defect.

## Rationale
Authentication and authorization bugs are consistently among the most exploited
vulnerabilities in web applications (OWASP A01:2021 - Broken Access Control, A07:2021 -
Identification and Authentication Failures). A single misconfigured route can expose
private data or allow privilege escalation. Yet auth logic is often undertested because
it feels repetitive to cover every endpoint/role combination.

Systematic auth testing follows a matrix approach: for each endpoint, test every
authentication state (no token, expired token, malformed token, valid token) and every
authorization level (viewer, editor, admin). JWT-specific tests verify signature
validation, expiry enforcement, and claims integrity. OAuth2 flow tests ensure proper
redirect handling, token exchange, and scope enforcement. Session management tests catch
fixation, hijacking, and improper invalidation vulnerabilities.

## Pattern Examples

### 1. JWT Token Testing (JavaScript / Jest + Supertest)

```javascript
// tests/api/auth/jwt.test.js
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../../src/app");

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

// Helper to create tokens with specific properties.
function createToken(payload, options = {}) {
  return jwt.sign(
    {
      sub: payload.userId || "user-123",
      email: payload.email || "test@example.com",
      role: payload.role || "viewer",
      ...payload,
    },
    options.secret || JWT_SECRET,
    {
      expiresIn: options.expiresIn || "1h",
      algorithm: options.algorithm || "HS256",
    }
  );
}

describe("JWT authentication", () => {
  it("rejects requests with no Authorization header", async () => {
    const res = await request(app).get("/api/users").expect(401);

    expect(res.body.error).toBe("Unauthorized");
    expect(res.body.message).toContain("token");
  });

  it("rejects requests with a malformed Authorization header", async () => {
    // Missing "Bearer " prefix.
    await request(app)
      .get("/api/users")
      .set("Authorization", "not-a-bearer-token")
      .expect(401);
  });

  it("rejects tokens signed with the wrong secret", async () => {
    const badToken = createToken(
      { userId: "user-123" },
      { secret: "wrong-secret-key" }
    );

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${badToken}`)
      .expect(401);

    expect(res.body.message).toContain("invalid");
  });

  it("rejects expired tokens", async () => {
    const expiredToken = createToken(
      { userId: "user-123" },
      { expiresIn: "-1s" }  // Already expired.
    );

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);

    expect(res.body.message).toContain("expired");
  });

  it("rejects tokens with an unsupported algorithm", async () => {
    // If the server expects HS256, sending a token with "none" algorithm
    // is a classic attack vector.
    const unsignedToken = jwt.sign(
      { sub: "user-123", role: "admin" },
      "",
      { algorithm: "none" }
    );

    await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${unsignedToken}`)
      .expect(401);
  });

  it("accepts a valid token and sets req.user", async () => {
    const token = createToken({
      userId: "user-123",
      email: "test@example.com",
      role: "admin",
    });

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.email).toBe("test@example.com");
  });

  it("rejects a token with missing required claims", async () => {
    // Token without the "sub" claim.
    const token = jwt.sign({ email: "no-sub@example.com" }, JWT_SECRET, {
      expiresIn: "1h",
    });

    await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });
});
```

### 2. Role-Based Access Control (RBAC) Testing

```javascript
// tests/api/auth/rbac.test.js
const request = require("supertest");
const app = require("../../../src/app");
const { createToken } = require("../../helpers/auth");

// Define the access matrix: endpoint -> method -> allowed roles.
const ACCESS_MATRIX = [
  // Endpoint              Method   Allowed Roles
  ["/api/users",           "GET",   ["admin"]],
  ["/api/users/:id",       "GET",   ["admin", "editor"]],
  ["/api/users",           "POST",  ["admin"]],
  ["/api/users/:id",       "DELETE", ["admin"]],
  ["/api/products",        "GET",   ["admin", "editor", "viewer"]],
  ["/api/products",        "POST",  ["admin", "editor"]],
  ["/api/products/:id",    "PATCH", ["admin", "editor"]],
  ["/api/products/:id",    "DELETE", ["admin"]],
  ["/api/reports",         "GET",   ["admin", "editor"]],
  ["/api/settings",        "GET",   ["admin"]],
  ["/api/settings",        "PATCH", ["admin"]],
];

const ALL_ROLES = ["admin", "editor", "viewer"];
const TEST_ID = "00000000-0000-0000-0000-000000000001";

describe("RBAC access matrix", () => {
  // Generate a test for every endpoint + role combination.
  for (const [endpointTemplate, method, allowedRoles] of ACCESS_MATRIX) {
    const endpoint = endpointTemplate.replace(":id", TEST_ID);
    const deniedRoles = ALL_ROLES.filter((r) => !allowedRoles.includes(r));

    // Test that allowed roles get through (not 403).
    for (const role of allowedRoles) {
      it(`${method} ${endpointTemplate} allows ${role}`, async () => {
        const token = createToken({ role });
        const res = await request(app)
          [method.toLowerCase()](endpoint)
          .set("Authorization", `Bearer ${token}`)
          .send(method === "POST" || method === "PATCH" ? { name: "test" } : undefined);

        // We expect anything other than 403 (could be 200, 201, 404, etc.).
        expect(res.status).not.toBe(403);
      });
    }

    // Test that denied roles get 403.
    for (const role of deniedRoles) {
      it(`${method} ${endpointTemplate} denies ${role}`, async () => {
        const token = createToken({ role });
        const res = await request(app)
          [method.toLowerCase()](endpoint)
          .set("Authorization", `Bearer ${token}`)
          .send(method === "POST" || method === "PATCH" ? { name: "test" } : undefined);

        expect(res.status).toBe(403);
      });
    }
  }
});
```

### 3. OAuth2 Authorization Code Flow Testing (Python / pytest)

```python
# tests/api/auth/test_oauth2.py
"""Test OAuth2 authorization code flow endpoints."""

import re
from urllib.parse import urlparse, parse_qs

import pytest
import requests

BASE_URL = "http://localhost:8000"
CLIENT_ID = "test-client-id"
CLIENT_SECRET = "test-client-secret"
REDIRECT_URI = "http://localhost:3000/callback"


class TestOAuth2AuthorizationCodeFlow:
    """Tests for the standard OAuth2 authorization code grant."""

    def test_authorize_redirects_to_login(self):
        """GET /oauth/authorize should redirect to login if not authenticated."""
        res = requests.get(
            f"{BASE_URL}/oauth/authorize",
            params={
                "response_type": "code",
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT_URI,
                "scope": "read write",
                "state": "random-csrf-state",
            },
            allow_redirects=False,
        )

        assert res.status_code == 302
        location = res.headers["Location"]
        assert "/login" in location

    def test_authorize_rejects_invalid_client_id(self):
        res = requests.get(
            f"{BASE_URL}/oauth/authorize",
            params={
                "response_type": "code",
                "client_id": "invalid-client",
                "redirect_uri": REDIRECT_URI,
            },
            allow_redirects=False,
        )

        assert res.status_code == 400
        assert "client_id" in res.json().get("message", "").lower()

    def test_authorize_rejects_mismatched_redirect_uri(self, auth_session):
        """The redirect_uri must match the registered URI exactly."""
        res = auth_session.get(
            f"{BASE_URL}/oauth/authorize",
            params={
                "response_type": "code",
                "client_id": CLIENT_ID,
                "redirect_uri": "http://evil.com/callback",
                "scope": "read",
            },
            allow_redirects=False,
        )

        assert res.status_code == 400
        assert "redirect_uri" in res.json().get("message", "").lower()

    def test_full_authorization_code_exchange(self, auth_session):
        """Complete flow: authorize -> get code -> exchange for tokens."""
        # Step 1: Authorize (authenticated session gets a redirect with code).
        res = auth_session.get(
            f"{BASE_URL}/oauth/authorize",
            params={
                "response_type": "code",
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT_URI,
                "scope": "read write",
                "state": "csrf-state-123",
            },
            allow_redirects=False,
        )

        assert res.status_code == 302
        callback_url = res.headers["Location"]
        parsed = urlparse(callback_url)
        params = parse_qs(parsed.query)

        # The code should be present and state should match.
        assert "code" in params
        assert params["state"][0] == "csrf-state-123"
        auth_code = params["code"][0]

        # Step 2: Exchange the code for tokens.
        token_res = requests.post(
            f"{BASE_URL}/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": auth_code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        )

        assert token_res.status_code == 200
        tokens = token_res.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "Bearer"
        assert tokens["expires_in"] > 0

        # Step 3: Use the access token to call a protected endpoint.
        api_res = requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert api_res.status_code == 200

    def test_authorization_code_is_single_use(self, auth_session):
        """A code cannot be reused after being exchanged."""
        # Get a code.
        res = auth_session.get(
            f"{BASE_URL}/oauth/authorize",
            params={
                "response_type": "code",
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT_URI,
                "scope": "read",
            },
            allow_redirects=False,
        )
        code = parse_qs(urlparse(res.headers["Location"]).query)["code"][0]

        # First exchange succeeds.
        first = requests.post(
            f"{BASE_URL}/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        )
        assert first.status_code == 200

        # Second exchange with the same code fails.
        second = requests.post(
            f"{BASE_URL}/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        )
        assert second.status_code == 400

    def test_refresh_token_rotation(self, auth_session):
        """Refreshing a token should issue new access AND refresh tokens."""
        # Obtain initial tokens.
        res = auth_session.get(
            f"{BASE_URL}/oauth/authorize",
            params={
                "response_type": "code",
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT_URI,
                "scope": "read",
            },
            allow_redirects=False,
        )
        code = parse_qs(urlparse(res.headers["Location"]).query)["code"][0]

        tokens = requests.post(
            f"{BASE_URL}/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        ).json()

        original_refresh = tokens["refresh_token"]

        # Refresh.
        refresh_res = requests.post(
            f"{BASE_URL}/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": original_refresh,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        )

        assert refresh_res.status_code == 200
        new_tokens = refresh_res.json()
        assert new_tokens["access_token"] != tokens["access_token"]
        # Refresh token should be rotated (new value).
        assert new_tokens["refresh_token"] != original_refresh


class TestTokenExpiry:
    """Verify that token expiration is enforced server-side."""

    def test_expired_access_token_is_rejected(self, expired_token):
        res = requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert res.status_code == 401
        assert "expired" in res.json()["message"].lower()

    def test_expired_refresh_token_is_rejected(self, expired_refresh_token):
        res = requests.post(
            f"{BASE_URL}/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": expired_refresh_token,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        )
        assert res.status_code == 400


class TestSessionManagement:
    """Test session security properties."""

    def test_logout_invalidates_token(self, auth_headers):
        # Logout.
        res = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers=auth_headers,
        )
        assert res.status_code == 204

        # Subsequent requests with the same token should fail.
        res = requests.get(
            f"{BASE_URL}/api/users/me",
            headers=auth_headers,
        )
        assert res.status_code == 401

    def test_password_change_invalidates_existing_tokens(self):
        """Changing password should revoke all outstanding sessions."""
        # Login and get a token.
        login_res = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "session-test@example.com", "password": "OldPass1!"},
        )
        token_a = login_res.json()["token"]

        # Change password.
        requests.post(
            f"{BASE_URL}/api/auth/change-password",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"currentPassword": "OldPass1!", "newPassword": "NewPass2!"},
        )

        # The old token should no longer work.
        res = requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 401

    def test_concurrent_sessions_are_tracked(self):
        """Multiple logins create independent sessions."""
        login_payload = {"email": "multi@example.com", "password": "Pass1!"}

        token_a = requests.post(
            f"{BASE_URL}/api/auth/login", json=login_payload
        ).json()["token"]
        token_b = requests.post(
            f"{BASE_URL}/api/auth/login", json=login_payload
        ).json()["token"]

        # Both tokens should work independently.
        assert requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token_a}"},
        ).status_code == 200

        assert requests.get(
            f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token_b}"},
        ).status_code == 200

        # Tokens should be different.
        assert token_a != token_b
```

### 4. Permission Boundary Testing Helper

```javascript
// tests/helpers/auth.js
// Helper for generating test tokens and running permission checks.

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

function createToken({ userId, email, role, scopes, expiresIn } = {}) {
  return jwt.sign(
    {
      sub: userId || `user-${role || "viewer"}-001`,
      email: email || `${role || "viewer"}@example.com`,
      role: role || "viewer",
      scopes: scopes || [],
    },
    JWT_SECRET,
    { expiresIn: expiresIn || "1h" }
  );
}

// Create a full set of tokens for matrix testing.
function createTokenSet() {
  return {
    admin: createToken({ role: "admin" }),
    editor: createToken({ role: "editor" }),
    viewer: createToken({ role: "viewer" }),
    expired: createToken({ role: "admin", expiresIn: "-1s" }),
    noRole: jwt.sign({ sub: "user-norole" }, JWT_SECRET, { expiresIn: "1h" }),
    wrongSecret: jwt.sign(
      { sub: "user-wrong", role: "admin" },
      "wrong-secret",
      { expiresIn: "1h" }
    ),
  };
}

module.exports = { createToken, createTokenSet };
```
