---
name: 'sec-c-step-01-preflight'
step: 1
mode: create
next_step: 'step-02-threat-model.md'
---

# Step 1 — Preflight: Attack Surface Identification & Tool Detection

## STEP GOAL

Identify the application's attack surface, detect available security testing tools, review the architecture for security-relevant components, and establish the context for the security testing workflow.

## MANDATORY EXECUTION RULES

1. You MUST complete every action in the MANDATORY SEQUENCE before proceeding.
2. You MUST identify all external-facing endpoints and input vectors.
3. You MUST detect or select at least one security scanning tool.
4. You MUST identify authentication mechanisms and data sensitivity level.
5. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read project files: package.json, requirements.txt, pyproject.toml, go.mod, pom.xml, Gemfile, Cargo.toml
- Read API route definitions, middleware, controllers, and OpenAPI/Swagger specs
- Read authentication and authorization configuration (JWT config, OAuth setup, RBAC definitions)
- Read Docker and infrastructure configuration
- Read existing CI pipeline configuration
- Read `.env.example` or environment documentation for secrets patterns
- Do NOT modify any source code in this step
- Do NOT run security scans in this step

## MANDATORY SEQUENCE

### 1.1 — Detect Technology Stack

Scan the project root to identify:
- **Primary language and framework** (Node.js/Express, Python/Django, Go/Gin, Java/Spring, etc.)
- **API type** (REST, GraphQL, gRPC, WebSocket, server-rendered pages)
- **Database layer** (ORM used, raw queries, connection method)
- **Authentication mechanism** (JWT, session cookies, OAuth2, API keys, SAML)
- **Frontend framework** (React, Vue, Angular, server-rendered)
- **Infrastructure** (Docker, Kubernetes, serverless, reverse proxy)
- **Third-party integrations** (payment processors, email services, cloud APIs)

Record findings in a structured format.

### 1.2 — Map Attack Surface

Enumerate all entry points and input vectors:

1. **API endpoints** — Scan route files, controllers, and OpenAPI specs
   - Classify each endpoint: public, authenticated, admin-only
   - Identify state-changing endpoints (POST, PUT, DELETE, PATCH)
   - Note endpoints that accept file uploads
   - Note endpoints that accept URLs or redirect parameters

2. **Input vectors** — For each endpoint, identify:
   - Query parameters
   - Request body fields (JSON, form data, multipart)
   - Path parameters
   - Headers (Authorization, custom headers)
   - Cookies
   - File uploads

3. **Data sensitivity** — Classify data handled:
   - PII (names, emails, addresses, phone numbers)
   - Financial data (payment info, account numbers)
   - Health data (medical records, prescriptions)
   - Authentication credentials (passwords, tokens, API keys)
   - System data (internal IPs, infrastructure details)

4. **External integrations** — List outbound connections:
   - Third-party APIs called
   - Webhook endpoints
   - Email/SMS services
   - Cloud storage services

### 1.3 — Review Architecture for Security Components

Check for existing security measures:

1. **Authentication middleware** — JWT validation, session management, OAuth2 flows
2. **Authorization middleware** — RBAC/ABAC enforcement, permission checks
3. **Input validation** — Schema validation libraries (Joi, Zod, Pydantic, marshmallow)
4. **Rate limiting** — Request throttling configuration
5. **CORS configuration** — Allowed origins, methods, credentials
6. **Security headers** — Helmet, django-secure, or manual header configuration
7. **CSRF protection** — Anti-CSRF tokens or SameSite cookies
8. **Logging** — Security event logging, audit trails
9. **Secrets management** — Environment variables, vault integration, config encryption

Record what exists and what is missing.

### 1.4 — Detect or Select Security Tools

If `{sec_scan_tool}` is `auto`:

1. Scan for existing security tool configurations:
   - `.semgrep.yml`, `.semgrepignore` -> Semgrep
   - `trivy.yaml`, `.trivyignore` -> Trivy
   - `.snyk` -> Snyk
   - `zap-config.yaml`, `.zap/` -> OWASP ZAP
   - `.bandit`, `bandit.yaml` -> Bandit (Python)

2. Scan CI pipeline for security scanning steps

3. Scan dependency files for security tools:
   - npm: `eslint-plugin-security`, `snyk`, `audit-ci`
   - Python: `bandit`, `safety`, `pip-audit`
   - Go: `gosec`, `govulncheck`
   - Java: `spotbugs`, `find-sec-bugs`, `dependency-check`

4. If nothing detected, recommend based on needs:
   - **Static analysis (SAST)**: Semgrep (polyglot), Bandit (Python), ESLint security (JS)
   - **Dependency scanning (SCA)**: Trivy (universal), npm audit (JS), pip-audit (Python)
   - **Dynamic testing (DAST)**: ZAP (web apps), Nuclei (API scanning)
   - **Container scanning**: Trivy, Grype, Docker Scout
   - **Secret detection**: TruffleHog, GitLeaks, detect-secrets

### 1.5 — Establish Security Testing Scope

Define what will be tested:

- **In scope**: All application endpoints, dependencies, containers, configuration
- **Out of scope**: Third-party services (unless they are self-hosted), infrastructure beyond the application boundary
- **Compliance requirements**: Note any regulatory frameworks (GDPR, HIPAA, PCI-DSS, SOC 2) that apply
- **Risk tolerance**: Classify the application's risk level (public-facing with PII = high, internal tool = medium, prototype = low)

## Save Progress

Write the following to `{test_artifacts}/workflow-progress.md`:

```markdown
# Security Testing Workflow Progress

## Status: Step 1 Complete — Preflight

## Detected Configuration
- **Stack**: [detected stack]
- **API Type**: [REST/GraphQL/gRPC/etc.]
- **Auth Mechanism**: [JWT/session/OAuth2/etc.]
- **Security Tools**: [detected/selected tools]
- **Data Sensitivity**: [high/medium/low]
- **Risk Level**: [high/medium/low]

## Attack Surface Summary
- **Total endpoints**: [count]
- **Public endpoints**: [count]
- **Authenticated endpoints**: [count]
- **Admin endpoints**: [count]
- **File upload endpoints**: [count]
- **Redirect/URL endpoints**: [count]

## Existing Security Controls
[List of detected security measures]

## Missing Security Controls
[List of expected but absent security measures]

## Compliance Requirements
[Applicable regulatory frameworks or "none identified"]

## Next Step
step-02-threat-model.md
```

## SUCCESS METRICS

- Technology stack fully identified with security-relevant components
- Attack surface mapped with endpoint classification
- Data sensitivity level determined
- At least one security scanning tool selected
- Existing security controls inventoried
- Security gaps identified
- Progress file written to `{test_artifacts}/workflow-progress.md`

## FAILURE METRICS

- Cannot determine project stack (no recognizable project files)
- No endpoints or input vectors identified
- No security tools selected or available
- Attack surface not mapped
- Progress file not written

On failure, report the specific blocker and ask the user for guidance before proceeding.

---

**Next step:** Load `step-02-threat-model.md`
