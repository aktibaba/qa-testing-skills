# QA Security Testing Skill: AI-Powered Security Test Suite Generation

**OWASP Top 10 coverage without hiring a penetration tester.**

---

## The Problem

Security testing is either expensive (hire a pentester), slow (manual checklists), or skipped entirely ("we'll do it before launch"). Meanwhile, your login endpoint doesn't rate-limit, your API accepts SQL in the search field, and your Docker image has 47 known CVEs.

## What qa-sec Does

The `qa-sec` skill turns any AI agent into a security testing architect that performs threat modeling, maps your attack surface, and generates automated security tests covering OWASP Top 10 and beyond.

```bash
npx @aktibaba/qa-testing-skills init
```

## How It Works

### Step 1 — Attack Surface Mapping
The agent identifies everything an attacker would look at:
- Public endpoints and their input vectors
- Authentication and session management
- File upload capabilities
- Admin/privileged routes
- Third-party integrations
- Existing security tools and headers

### Step 2 — STRIDE Threat Model
Every component is analyzed through six threat categories:

| Threat | Question | Example Test |
|--------|----------|--------------|
| **Spoofing** | Can someone pretend to be another user? | Token forgery, session hijacking |
| **Tampering** | Can data be modified in transit? | Request body manipulation, CSRF |
| **Repudiation** | Can actions be denied? | Audit log completeness |
| **Information Disclosure** | Does the app leak data? | Error messages, headers, enumeration |
| **Denial of Service** | Can the service be overwhelmed? | Rate limiting, payload size |
| **Elevation of Privilege** | Can a user gain unauthorized access? | IDOR, role escalation |

### Step 3 — You Approve the Plan
Review the threat model and test scope before any code is generated. Add or remove specific threats based on your risk tolerance.

### Step 4 — Authentication & Authorization Tests
10 vectors tested systematically:

```javascript
describe('Authentication Security', () => {
  it('rejects expired JWT tokens', ...);
  it('prevents brute force with rate limiting', ...);
  it('does not reveal if email exists on failed login', ...);
  it('invalidates all sessions on password change', ...);
  it('enforces RBAC - user cannot access admin routes', ...);
  it('prevents IDOR - user A cannot access user B data', ...);
});
```

### Step 5 — Injection & Input Validation

**SQL Injection:**
```javascript
const payloads = ["' OR '1'='1", "'; DROP TABLE users;--", "1 UNION SELECT *"];
payloads.forEach(p => {
  it(`rejects SQL injection: ${p}`, async () => {
    const res = await api.get(`/search?q=${encodeURIComponent(p)}`);
    expect(res.status).not.toBe(200);
  });
});
```

**Also tested:** XSS, CSRF, command injection, path traversal, header injection.

### Step 6 — Dependency & Container Scanning
CI-integrated security scanning:
- `npm audit` / `pip audit` — known vulnerabilities in dependencies
- `Trivy` — container image CVE scanning
- Secret detection — no API keys or passwords in code
- Security headers validation (HSTS, CSP, X-Frame-Options)

### Step 7 — Security Report
Every finding ranked by severity:

```
Finding                              | Severity | Status
No rate limiting on /auth/login      | Critical | FAIL
JWT secret is hardcoded              | Critical | FAIL
Missing CSRF token on POST forms     | High     | FAIL
X-Frame-Options header missing       | Medium   | WARN
Verbose error messages in production | Medium   | WARN
```

## What Gets Tested

- Login/register — no user enumeration
- Token management — expiry, refresh, revocation
- RBAC — every role against every endpoint
- IDOR — cross-user data access
- SQL injection, XSS, CSRF, command injection
- File upload — type validation, size limits, path traversal
- Security headers — HSTS, CSP, CORS
- Dependencies — known CVEs
- Containers — image vulnerabilities
- Secrets — no credentials in code or config

## Get Started

```bash
npx @aktibaba/qa-testing-skills init
```

Then use the `qa-sec` prompt with your AI agent. Find vulnerabilities before attackers do.

---

*Part of the [QA Testing Skills](https://github.com/aktibaba/qa-testing-skills) open-source toolkit.*
