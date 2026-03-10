---
name: 'sec-c-step-05-container-dep-scan'
step: 5
mode: create
next_step: 'step-06-validate-and-summary.md'
previous_step: 'step-04-input-validation-tests.md'
---

# Step 5 — Container Scanning and Dependency Audit

## STEP GOAL

Set up automated container image scanning and dependency vulnerability auditing. Generate CI-integrated scanning configurations that detect known vulnerabilities in base images, application dependencies, and container misconfigurations.

## MANDATORY EXECUTION RULES

1. You MUST configure dependency scanning for the project's package manager(s).
2. You MUST configure container scanning if the project uses Docker.
3. You MUST define severity thresholds that block CI builds on critical/high vulnerabilities.
4. You MUST generate machine-readable output configuration (JSON, SARIF).
5. You MUST NOT run scans against production images or registries.
6. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read project dependency files (package.json, package-lock.json, requirements.txt, go.sum, pom.xml, etc.)
- Read Dockerfiles and Docker Compose configuration
- Read existing CI pipeline configuration
- Create scanning configuration files
- Create CI pipeline jobs for scanning
- Do NOT execute scans in this step (configuration only)
- Do NOT modify application dependencies

## MANDATORY SEQUENCE

### 5.1 — Configure Dependency Scanning

Based on the detected package manager, set up vulnerability scanning:

**Node.js (npm/yarn/pnpm):**
```bash
# npm audit — built-in, no installation needed
npm audit --audit-level=high --json > audit-results.json

# Or with audit-ci for CI integration
npx audit-ci --high --report-type json
```

Configuration file for audit-ci (`audit-ci.jsonc`):
```json
{
  "high": true,
  "allowlist": [],
  "report-type": "json"
}
```

**Python (pip/poetry):**
```bash
# pip-audit — comprehensive vulnerability database
pip-audit --format json --output audit-results.json

# Or safety (uses Safety DB)
safety check --json --output audit-results.json
```

**Go:**
```bash
# govulncheck — official Go vulnerability scanner
govulncheck -json ./... > audit-results.json
```

**Java (Maven/Gradle):**
```xml
<!-- OWASP Dependency Check plugin -->
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <configuration>
    <failBuildOnCVSS>7</failBuildOnCVSS>
    <format>JSON</format>
  </configuration>
</plugin>
```

**Universal (Trivy):**
```bash
# Trivy scans any language's lock files
trivy fs --severity HIGH,CRITICAL --format json --output audit-results.json .
```

Generate the appropriate configuration for the detected stack.

### 5.2 — Configure Container Image Scanning

If the project uses Docker:

**Trivy (recommended — single binary, comprehensive):**
```bash
# Scan built image
trivy image --severity HIGH,CRITICAL --format json --output container-scan.json myapp:latest

# Scan Dockerfile for misconfigurations
trivy config --severity HIGH,CRITICAL --format json --output dockerfile-scan.json .
```

Create a Trivy configuration file (`.trivy.yaml`):
```yaml
severity:
  - HIGH
  - CRITICAL
format: json
exit-code: 1
ignore-unfixed: true
```

**Docker Scout (if using Docker Desktop):**
```bash
docker scout cves myapp:latest --format sarif --output scout-results.sarif
```

**Grype (alternative):**
```bash
grype myapp:latest -o json > grype-results.json --fail-on high
```

### 5.3 — Configure Dockerfile Best Practices Check

Generate or configure a Dockerfile linting and security check:

1. **Hadolint** — Dockerfile linter:
   ```bash
   hadolint Dockerfile --format json > hadolint-results.json
   ```

2. **Key checks to enforce:**
   - No `latest` tag on base images — use specific versions
   - `USER` directive present — do not run as root
   - No `COPY . .` without `.dockerignore`
   - No secrets in `ENV` or `ARG` directives
   - `HEALTHCHECK` defined
   - Minimal base image (alpine, distroless, slim)
   - Multi-stage build used (no build tools in final image)

3. Create `.hadolint.yaml`:
   ```yaml
   ignored:
     - DL3008  # Pin versions in apt-get (noisy for testing)
   trustedRegistries:
     - docker.io
     - gcr.io
   ```

### 5.4 — Configure Secret Detection

Set up scanning for accidentally committed secrets:

**TruffleHog:**
```bash
trufflehog filesystem --json --fail . > secrets-scan.json
```

**GitLeaks:**
```bash
gitleaks detect --source . --report-format json --report-path secrets-scan.json
```

**detect-secrets:**
```bash
detect-secrets scan --all-files --json > .secrets.baseline
```

Create a `.gitleaksignore` or equivalent allowlist file for known false positives.

### 5.5 — Generate CI Integration for Scanning

Create CI pipeline jobs that run scans automatically:

**GitHub Actions example:**
```yaml
name: Security Scanning
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run dependency audit
        run: [package-manager-specific command]
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dependency-audit
          path: audit-results.json

  container-scan:
    runs-on: ubuntu-latest
    if: hashFiles('Dockerfile') != ''
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t myapp:scan .
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:scan
          format: json
          output: container-scan.json
          severity: HIGH,CRITICAL
          exit-code: 1
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: container-scan
          path: container-scan.json

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Run GitLeaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Adapt to the detected CI platform.

### 5.6 — Define Vulnerability Management Process

Document the process for handling scan results:

1. **Critical/High** — Block merge, fix immediately, no exceptions
2. **Medium** — Track in issue tracker, fix within current sprint
3. **Low** — Track in issue tracker, fix within current release cycle
4. **False positives** — Add to allowlist with justification comment
5. **Unfixable** — Document risk acceptance with owner and review date

Create an allowlist template for known false positives with fields for:
- Vulnerability ID (CVE, advisory)
- Reason for allowlisting
- Approved by (name/role)
- Review date (when to re-evaluate)

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:

```markdown
## Status: Step 5 Complete — Container and Dependency Scanning Configured

## Scanning Configuration
- **Dependency scanner**: [tool and config file]
- **Container scanner**: [tool and config file]
- **Dockerfile linter**: [tool and config file]
- **Secret scanner**: [tool and config file]

## CI Integration
- **Pipeline file**: [path]
- **Scan triggers**: [PR, push to main, scheduled]
- **Blocking severity**: [HIGH, CRITICAL]

## Generated Files
- [list of all generated config and CI files]

## Next Step
step-06-validate-and-summary.md
```

## SUCCESS METRICS

- Dependency scanning configured for the project's package manager
- Container scanning configured (if Docker is used)
- Secret detection configured
- CI pipeline jobs created for automated scanning
- Severity thresholds defined with blocking rules
- Machine-readable output format configured (JSON or SARIF)
- Vulnerability management process documented
- Progress file updated

## FAILURE METRICS

- No dependency scanning configured
- Container scanning missing when Docker is in use
- No CI integration for scans
- No severity thresholds (scans report but never block)
- No machine-readable output
- Progress file not updated

---

**Next step:** Load `step-06-validate-and-summary.md`
