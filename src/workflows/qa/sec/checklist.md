---
name: 'qa-sec-checklist'
description: 'Security Testing Quality Checklist'
---

# Security Testing Quality Checklist

Use this checklist to validate security test suite completeness and quality.

## 1. OWASP Top 10 Coverage

- [ ] A01: Broken Access Control — Tests verify authorization boundaries and privilege separation
- [ ] A02: Cryptographic Failures — Tests check for weak algorithms, plaintext storage, missing encryption
- [ ] A03: Injection — SQL, NoSQL, OS command, LDAP, and ORM injection tests implemented
- [ ] A04: Insecure Design — Security requirements documented and validated in architecture
- [ ] A05: Security Misconfiguration — Default credentials, unnecessary features, verbose errors tested
- [ ] A06: Vulnerable Components — Dependency scanning integrated with known vulnerability databases
- [ ] A07: Authentication Failures — Brute force, credential stuffing, session management tested
- [ ] A08: Software and Data Integrity — Deserialization, CI/CD pipeline integrity verified
- [ ] A09: Logging and Monitoring — Security events are logged, no sensitive data in logs
- [ ] A10: Server-Side Request Forgery — SSRF vectors tested on URL-accepting endpoints

## 2. Authentication and Authorization

- [ ] Login flow tested with valid and invalid credentials
- [ ] Password policy enforcement validated (length, complexity, common passwords)
- [ ] Account lockout or rate limiting after failed attempts verified
- [ ] Session management tested (creation, expiration, invalidation on logout)
- [ ] Session fixation and session hijacking mitigations verified
- [ ] Multi-factor authentication tested (if applicable)
- [ ] JWT validation tested (signature, expiration, algorithm confusion, none algorithm)
- [ ] RBAC/ABAC boundaries tested — each role can only access permitted resources
- [ ] Horizontal privilege escalation tested (user A cannot access user B's resources)
- [ ] Vertical privilege escalation tested (regular user cannot perform admin actions)
- [ ] API key and token management tested (rotation, revocation, scope)

## 3. Input Validation

- [ ] SQL injection tested on all database-connected inputs
- [ ] Cross-Site Scripting (XSS) tested — reflected, stored, and DOM-based
- [ ] Cross-Site Request Forgery (CSRF) protection verified on state-changing endpoints
- [ ] Command injection tested on inputs that interact with OS processes
- [ ] Path traversal tested on file-serving endpoints
- [ ] XML External Entity (XXE) tested if XML parsing is present
- [ ] Server-Side Template Injection (SSTI) tested if templates accept user input
- [ ] File upload validation tested (type, size, content, filename sanitization)
- [ ] Header injection tested (Host header, X-Forwarded-For manipulation)
- [ ] Content-type validation enforced (reject unexpected content types)

## 4. Security Headers and Transport

- [ ] HTTPS enforced — HTTP redirects to HTTPS, HSTS header present
- [ ] Content-Security-Policy header configured
- [ ] X-Content-Type-Options: nosniff header present
- [ ] X-Frame-Options or frame-ancestors CSP directive configured
- [ ] Referrer-Policy header configured
- [ ] Permissions-Policy header configured (formerly Feature-Policy)
- [ ] CORS policy tested — only allowed origins accepted, credentials handling correct
- [ ] Cookie security attributes verified (Secure, HttpOnly, SameSite)
- [ ] TLS configuration validated (minimum version, strong cipher suites)

## 5. Container Security

- [ ] Base images scanned for known vulnerabilities
- [ ] Images use specific version tags, not `latest`
- [ ] Containers run as non-root user
- [ ] No secrets or credentials baked into images
- [ ] Unnecessary packages and tools removed from production images
- [ ] Read-only filesystem where possible
- [ ] Resource limits defined (memory, CPU)
- [ ] Network policies restrict container-to-container communication

## 6. Dependency Scanning

- [ ] Direct dependencies scanned against vulnerability databases (NVD, GitHub Advisory)
- [ ] Transitive dependencies included in scan scope
- [ ] Scan runs automatically on every build in CI
- [ ] Critical and high severity vulnerabilities block the build
- [ ] License compliance checked (no copyleft in proprietary projects, as applicable)
- [ ] Remediation paths documented (upgrade version, alternative package, patch)
- [ ] Scan results exported in machine-readable format (SARIF, JSON)
- [ ] Historical scan data retained for trend analysis

## SCORING

| Score | Rating | Action |
|---|---|---|
| 44+ / 54 | Excellent | Minor refinements only |
| 33-43 / 54 | Good | Address gaps in weakest section |
| 22-32 / 54 | Fair | Significant improvements needed |
| < 22 / 54 | Poor | Major security testing gaps — immediate action required |
