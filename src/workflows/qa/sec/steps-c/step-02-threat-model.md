---
name: 'sec-c-step-02-threat-model'
step: 2
mode: create
next_step: 'step-03-auth-security-tests.md'
previous_step: 'step-01-preflight.md'
---

# Step 2 — Create Lightweight Threat Model (STRIDE-Based)

## STEP GOAL

Produce a lightweight threat model using the STRIDE framework to systematically identify threats against the application. This model drives test prioritization — high-severity threats get tested first and most thoroughly.

## MANDATORY EXECUTION RULES

1. You MUST apply all six STRIDE categories to the application's architecture.
2. You MUST prioritize threats by severity and likelihood.
3. You MUST map each identified threat to a specific test or mitigation verification.
4. You MUST NOT generate test scripts in this step — this step produces the threat model only.
5. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read the progress file from step 1 for attack surface, architecture, and data sensitivity
- Read application architecture files (route definitions, middleware, data models)
- Read authentication and authorization configuration
- Read infrastructure configuration (Docker, reverse proxy, cloud config)
- Do NOT create test files in this step
- Do NOT execute any scans

## MANDATORY SEQUENCE

### 2.1 — Apply STRIDE Categories

Analyze the application through each STRIDE lens:

#### S — Spoofing (Identity)
Can an attacker impersonate another user or system?

Examine:
- Authentication bypass possibilities
- Token forgery or replay attacks
- Session hijacking vectors
- API key leakage or sharing
- Certificate validation for service-to-service communication

#### T — Tampering (Data Integrity)
Can an attacker modify data they should not be able to change?

Examine:
- Mass assignment vulnerabilities (extra fields in requests)
- Unsigned or unvalidated data in transit
- Client-side state manipulation (hidden fields, local storage)
- Database record modification through injection
- File upload content manipulation

#### R — Repudiation (Accountability)
Can an attacker perform actions without leaving a trace?

Examine:
- Audit logging gaps for security-critical operations
- Log injection (attacker-controlled data in log entries)
- Missing correlation IDs for request tracing
- Insufficient logging of auth events (login, logout, failed attempts)

#### I — Information Disclosure
Can an attacker access data they should not see?

Examine:
- Verbose error messages leaking stack traces or internal paths
- API responses including unnecessary fields (internal IDs, metadata)
- Directory listing enabled
- Source maps accessible in production
- Debug endpoints or admin panels exposed
- Sensitive data in URL query parameters (logged by proxies)

#### D — Denial of Service
Can an attacker degrade or prevent legitimate access?

Examine:
- Missing rate limiting on public endpoints
- Expensive queries without pagination limits
- File upload without size limits
- Regular expression denial of service (ReDoS)
- Resource exhaustion through large payloads
- Missing request timeouts

#### E — Elevation of Privilege
Can an attacker gain higher access than authorized?

Examine:
- Vertical escalation: regular user performing admin actions
- Horizontal escalation: user A accessing user B's resources
- IDOR (Insecure Direct Object References)
- Missing function-level access control
- Default admin accounts or credentials
- Privilege escalation through API parameter manipulation

### 2.2 — Prioritize Threats

Score each identified threat using Risk = Likelihood x Impact:

**Likelihood Scale:**
| Score | Level | Description |
|---|---|---|
| 3 | High | Easily exploitable, well-known attack vector |
| 2 | Medium | Requires some skill or specific conditions |
| 1 | Low | Requires significant effort or unlikely conditions |

**Impact Scale:**
| Score | Level | Description |
|---|---|---|
| 3 | High | Data breach, full system compromise, financial loss |
| 2 | Medium | Partial data exposure, service degradation |
| 1 | Low | Minor information disclosure, cosmetic issues |

**Risk Matrix:**
| Risk Score | Priority | Testing |
|---|---|---|
| 7-9 | Critical | Must test immediately, block release if untested |
| 4-6 | High | Test in current sprint, include in CI |
| 2-3 | Medium | Test within current release cycle |
| 1 | Low | Test when capacity allows |

### 2.3 — Map Threats to Test Categories

Link each threat to the test step that will address it:

| Threat | STRIDE | Risk | Test Step |
|---|---|---|---|
| JWT algorithm confusion | Spoofing | High | Step 3 (Auth) |
| SQL injection in search | Tampering | Critical | Step 4 (Input) |
| Missing rate limiting | DoS | High | Step 3 (Auth) |
| IDOR on user resources | Elevation | Critical | Step 3 (Auth) |
| Outdated dependencies | Various | Medium | Step 5 (Deps) |
| Container running as root | Elevation | Medium | Step 5 (Container) |
| XSS in user comments | Tampering | High | Step 4 (Input) |

### 2.4 — Document Assumptions and Boundaries

Record:
- **Trust boundaries**: Where does trusted code interact with untrusted input?
- **Assumptions**: What security controls are assumed to be in place?
- **Out of scope**: What threats are accepted or managed by other teams?
- **Data flow**: How does sensitive data move through the system?

### 2.5 — Compile Threat Model Document

Create a concise threat model summary:

```markdown
## Threat Model — [Application Name]

### Architecture Overview
[Brief description of components and their interactions]

### Trust Boundaries
[Where trusted/untrusted zones meet]

### Threat Register
[Table of all identified threats with STRIDE category, risk score, and test mapping]

### Top 5 Critical Threats
1. [Highest risk threat with description and test plan]
2. ...
3. ...
4. ...
5. ...

### Assumptions
[List of security assumptions]
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 2 Complete — Threat Model Created

## Threat Summary
- **Critical threats**: [count]
- **High threats**: [count]
- **Medium threats**: [count]
- **Low threats**: [count]

## Top Threats
[Top 5 threats with risk scores]

## Test Priority
[Ordered list of test categories by threat severity]

## Next Step
step-03-auth-security-tests.md
```

## SUCCESS METRICS

- All six STRIDE categories applied to the application
- At least 10 specific threats identified
- Each threat scored for risk (likelihood x impact)
- Threats mapped to specific test steps
- Top 5 critical threats documented with test plans
- Trust boundaries and assumptions recorded
- Progress file updated

## FAILURE METRICS

- STRIDE categories not all addressed
- Fewer than 5 threats identified (insufficient analysis)
- Threats not prioritized (no risk scoring)
- No mapping from threats to test steps
- Progress file not updated

---

**Next step:** Load `step-03-auth-security-tests.md`
