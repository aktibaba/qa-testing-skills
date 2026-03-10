---
name: 'qa-sec-instructions'
description: 'Security Testing Workflow — Master instructions'
---

# Security Testing Workflow — Instructions

## PURPOSE

This workflow produces a comprehensive security testing suite that identifies vulnerabilities, validates security controls, and establishes continuous security testing in the CI/CD pipeline. It covers threat modeling, OWASP Top 10 testing, authentication and authorization validation, input sanitization, dependency scanning, and container security.

## GUIDING PRINCIPLES

1. **Defense in depth** — Test security at every layer: network, application, data, and infrastructure. A single control failure should not compromise the system.

2. **OWASP Top 10 as baseline** — The OWASP Top 10 represents the minimum set of security concerns. Every web application must be tested against these categories. Extend coverage based on the application's threat profile.

3. **Shift-left security** — Integrate security testing early in the development lifecycle. Static analysis on every PR, dependency scanning on every build, and dynamic testing pre-release.

4. **Least privilege verification** — Every role and permission boundary must be tested. Verify that users cannot access resources beyond their authorization level through direct requests, parameter manipulation, or privilege escalation.

5. **Input is hostile** — Treat all user input as potentially malicious. Test every input vector (query params, headers, body, file uploads, cookies) for injection, overflow, and encoding attacks.

6. **Automate the repeatable** — Manual penetration testing has its place, but automated security tests catch regressions. Every fixed vulnerability should have a regression test.

7. **Secrets management** — Never store credentials, API keys, or tokens in source code or test scripts. Use environment variables, secret managers, or CI vault integrations.

8. **Compliance awareness** — Understand regulatory requirements (GDPR, HIPAA, PCI-DSS, SOC 2) that apply to the project and ensure security tests cover compliance-relevant controls.

## TOOL SELECTION LOGIC

When `{sec_scan_tool}` is set to `auto`, detect tools by scanning:

1. `package.json` scripts/dependencies for `snyk`, `npm audit`, `eslint-plugin-security`
2. `requirements.txt` / `pyproject.toml` for `bandit`, `safety`, `pip-audit`
3. CI config for existing security scanning steps (Trivy, Snyk, Semgrep, ZAP)
4. Docker-related files for container scanning configuration
5. `.snyk`, `.semgrep.yml`, `trivy.yaml` config files

Priority order when nothing is detected:
1. **Semgrep** — Best default for static analysis: fast, language-agnostic, free community rules
2. **Trivy** — Best for container and dependency scanning: single binary, comprehensive database
3. **Snyk** — If project needs license compliance and commercial vulnerability database
4. **ZAP** — If project needs dynamic application security testing (DAST)

## TESTING CATEGORIES

| Category | Focus | Tools |
|---|---|---|
| SAST | Source code vulnerabilities | Semgrep, Bandit, ESLint security, CodeQL |
| DAST | Runtime vulnerabilities | ZAP, Nuclei, Burp Suite |
| SCA | Dependency vulnerabilities | Trivy, Snyk, npm audit, pip-audit |
| Container | Image vulnerabilities | Trivy, Grype, Docker Scout |
| Secrets | Credential leaks | TruffleHog, GitLeaks, detect-secrets |
| Auth | Authentication/Authorization | Custom test scripts |
| Input | Injection and validation | Custom test scripts, ZAP active scan |

## OUTPUT STANDARDS

- All security test scripts must include comments explaining the vulnerability being tested
- Test results must include severity classification (Critical, High, Medium, Low, Info)
- Failed tests must include remediation guidance, not just "vulnerability found"
- Dependency scan results must differentiate between direct and transitive dependencies
- Container scan results must include the affected layer and fix version
- Reports must be machine-parseable for CI integration (JSON or SARIF format)

## ARTIFACT TRACKING

All progress is tracked in `{test_artifacts}/workflow-progress.md`. This file records:
- Current step and status
- Detected configuration
- Generated files list
- Scan results summary
- Any blockers or decisions needed

## KNOWLEDGE FRAGMENTS

Relevant fragments from qa-index.csv:
- `owasp-top-10` — OWASP Top 10 testing patterns
- `auth-testing` — Authentication and authorization testing
- `input-validation` — Input validation and sanitization testing
- `container-security` — Container and image security
- `dependency-scanning` — SCA and dependency audit patterns
- `ci-cd-integration` — CI pipeline integration
- `secrets-management` — Secrets detection and management
