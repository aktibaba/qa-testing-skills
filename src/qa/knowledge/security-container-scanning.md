# Container Security Scanning

## Principle
Container security scanning must be automated into the CI pipeline, catching vulnerabilities in base images, dependencies, and application code before containers reach production.

## Rationale
Containers inherit the security posture of their base images and every package installed during the build process. A seemingly innocuous `FROM node:18` pulls in hundreds of OS-level packages, any of which may contain known CVEs. Without automated scanning, these vulnerabilities accumulate silently until an attacker exploits them.

Effective container security combines multiple layers: scanning Dockerfiles for misconfigurations (running as root, exposing unnecessary ports), analyzing images for OS and application-level vulnerabilities, generating Software Bills of Materials (SBOMs) for supply chain transparency, and enforcing policies that block deployments when critical vulnerabilities are detected. Tools like Trivy and Snyk Container integrate directly into CI workflows, providing fast feedback and actionable remediation guidance. The goal is not zero vulnerabilities -- that is rarely achievable -- but a managed, documented approach where risks are acknowledged and mitigated within defined SLA windows.

## Pattern Examples

### 1. Trivy Scanning with Policy Enforcement

```yaml
# .github/workflows/container-security.yml
name: Container Security Scan

on:
  push:
    paths:
      - 'Dockerfile*'
      - 'docker-compose*.yml'
      - 'package-lock.json'
      - 'go.sum'
      - '.trivyignore'
  pull_request:
    branches: [main]

jobs:
  dockerfile-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Lint Dockerfile with hadolint
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Dockerfile
          failure-threshold: warning
          ignore: DL3008,DL3018  # Allow unpinned apt/apk versions for base packages

  trivy-scan:
    runs-on: ubuntu-latest
    needs: dockerfile-lint
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t app:scan-target .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:scan-target'
          format: 'json'
          output: 'trivy-results.json'
          severity: 'CRITICAL,HIGH,MEDIUM'
          vuln-type: 'os,library'
          ignore-unfixed: true
          exit-code: '0'

      - name: Run Trivy with SARIF output for GitHub Security
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:scan-target'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Evaluate scan results against policy
        run: |
          cat > /tmp/evaluate-policy.js << 'SCRIPT'
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('trivy-results.json', 'utf-8'));

          const policy = {
            maxCritical: 0,
            maxHigh: 3,
            maxMedium: 20,
            blockOnFixable: true,
          };

          let critical = 0, high = 0, medium = 0;
          let fixableCritical = 0;
          const findings = [];

          for (const result of results.Results || []) {
            for (const vuln of result.Vulnerabilities || []) {
              const severity = vuln.Severity.toUpperCase();
              const fixable = !!vuln.FixedVersion;

              if (severity === 'CRITICAL') { critical++; if (fixable) fixableCritical++; }
              if (severity === 'HIGH') high++;
              if (severity === 'MEDIUM') medium++;

              if (severity === 'CRITICAL' || severity === 'HIGH') {
                findings.push({
                  id: vuln.VulnerabilityID,
                  pkg: vuln.PkgName,
                  installed: vuln.InstalledVersion,
                  fixed: vuln.FixedVersion || 'N/A',
                  severity,
                  title: vuln.Title,
                });
              }
            }
          }

          console.log('\n=== Container Security Report ===');
          console.log(`Critical: ${critical} (fixable: ${fixableCritical})`);
          console.log(`High: ${high}`);
          console.log(`Medium: ${medium}`);

          if (findings.length > 0) {
            console.log('\n--- Critical/High Findings ---');
            console.table(findings.map(f => ({
              CVE: f.id, Package: f.pkg, Installed: f.installed, Fixed: f.fixed, Severity: f.severity
            })));
          }

          let blocked = false;
          if (critical > policy.maxCritical) {
            console.error(`\nBLOCKED: ${critical} critical vulnerabilities (max: ${policy.maxCritical})`);
            blocked = true;
          }
          if (high > policy.maxHigh) {
            console.error(`BLOCKED: ${high} high vulnerabilities (max: ${policy.maxHigh})`);
            blocked = true;
          }
          if (policy.blockOnFixable && fixableCritical > 0) {
            console.error(`BLOCKED: ${fixableCritical} fixable critical vulnerabilities exist`);
            blocked = true;
          }

          process.exit(blocked ? 1 : 0);
          SCRIPT
          node /tmp/evaluate-policy.js

      - name: Upload scan results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: trivy-scan-results
          path: trivy-results.json
          retention-days: 30

  sbom-generation:
    runs-on: ubuntu-latest
    needs: trivy-scan
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t app:sbom-target .

      - name: Generate SBOM with Trivy
        run: |
          trivy image --format cyclonedx --output sbom.cdx.json app:sbom-target

      - name: Generate SPDX SBOM
        run: |
          trivy image --format spdx-json --output sbom.spdx.json app:sbom-target

      - name: Upload SBOMs
        uses: actions/upload-artifact@v4
        with:
          name: sbom-artifacts
          path: |
            sbom.cdx.json
            sbom.spdx.json
          retention-days: 90
```

### 2. Hardened Dockerfile with Security Best Practices

```dockerfile
# Dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

# Run as non-root during build
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependency files first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

# Copy source and build
COPY --chown=appuser:appgroup . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Stage 2: Production image
FROM node:20-alpine AS production

# Security: install security updates
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Security: create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Security: remove unnecessary system tools
RUN rm -rf /usr/bin/wget /usr/bin/curl /usr/sbin/apk 2>/dev/null || true

WORKDIR /app

# Copy only production artifacts
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Security: set filesystem to read-only where possible
RUN chmod -R 555 /app/dist && \
    mkdir -p /app/tmp && chown appuser:appgroup /app/tmp

# Security: drop all capabilities
USER appuser

# Security: health check without curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); \
    const req = http.get('http://localhost:3000/health', (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); req.on('error', () => process.exit(1)); req.end();"

# Expose only the necessary port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

```typescript
// tests/security/dockerfile.spec.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Dockerfile Security Checks', () => {
  const imageName = 'app:security-test';

  test.beforeAll(() => {
    execSync(`docker build -t ${imageName} .`, { stdio: 'pipe' });
  });

  test('container runs as non-root user', () => {
    const user = execSync(`docker run --rm ${imageName} whoami`).toString().trim();
    expect(user).not.toBe('root');
    expect(user).toBe('appuser');
  });

  test('container has no shell access for root', () => {
    const result = execSync(
      `docker run --rm --entrypoint sh ${imageName} -c "id -u" 2>&1`,
    ).toString().trim();
    expect(parseInt(result)).toBeGreaterThan(0); // non-root UID
  });

  test('no unnecessary packages are installed', () => {
    const packages = execSync(
      `docker run --rm --entrypoint sh ${imageName} -c "apk list --installed 2>/dev/null || true"`,
    ).toString();
    const dangerousPackages = ['curl', 'wget', 'netcat', 'nmap', 'tcpdump'];
    for (const pkg of dangerousPackages) {
      expect(packages, `Package ${pkg} should not be installed`).not.toContain(pkg);
    }
  });

  test('sensitive files are not present in the image', () => {
    const sensitiveFiles = ['.env', '.git', 'docker-compose.yml', '.npmrc', '.ssh'];
    for (const file of sensitiveFiles) {
      const result = execSync(
        `docker run --rm --entrypoint sh ${imageName} -c "test -e /app/${file} && echo found || echo missing"`,
      ).toString().trim();
      expect(result, `${file} should not be in the image`).toBe('missing');
    }
  });

  test('image has minimal layer count', () => {
    const historyRaw = execSync(
      `docker history ${imageName} --format '{{.CreatedBy}}' --no-trunc`,
    ).toString();
    const layers = historyRaw.split('\n').filter((l) => l.trim());
    expect(layers.length, 'Image should have fewer than 25 layers').toBeLessThan(25);
  });

  test('image size is within acceptable bounds', () => {
    const sizeOutput = execSync(
      `docker image inspect ${imageName} --format '{{.Size}}'`,
    ).toString().trim();
    const sizeBytes = parseInt(sizeOutput);
    const sizeMB = sizeBytes / (1024 * 1024);
    console.log(`Image size: ${sizeMB.toFixed(1)} MB`);
    expect(sizeMB, 'Image should be under 300MB').toBeLessThan(300);
  });

  test('no high or critical vulnerabilities with fixes available', () => {
    const trivyOutput = execSync(
      `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy image --severity HIGH,CRITICAL --ignore-unfixed \
        --exit-code 0 --format json ${imageName}`,
      { maxBuffer: 10 * 1024 * 1024 },
    ).toString();

    const results = JSON.parse(trivyOutput);
    let fixableCritical = 0;

    for (const result of results.Results || []) {
      for (const vuln of result.Vulnerabilities || []) {
        if (vuln.Severity === 'CRITICAL' && vuln.FixedVersion) {
          fixableCritical++;
          console.error(
            `Fixable CRITICAL: ${vuln.VulnerabilityID} in ${vuln.PkgName} ` +
            `(${vuln.InstalledVersion} -> ${vuln.FixedVersion})`,
          );
        }
      }
    }

    expect(fixableCritical, 'No fixable critical vulnerabilities allowed').toBe(0);
  });
});
```

### 3. Snyk Container Integration and .trivyignore Management

```yaml
# .trivyignore
# Accepted risks - reviewed 2025-06-15
# CVE-2024-1234: Low impact in our context, no fix available
CVE-2024-1234

# CVE-2024-5678: Requires network access we don't expose
# Review date: 2025-07-01
CVE-2024-5678
```

```typescript
// tests/security/snyk-scan.spec.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';

interface SnykVulnerability {
  id: string;
  title: string;
  severity: string;
  packageName: string;
  version: string;
  fixedIn: string[];
  isUpgradable: boolean;
  isPatchable: boolean;
}

test.describe('Snyk Container Scan', () => {
  const imageName = 'app:snyk-test';
  let scanResults: any;

  test.beforeAll(() => {
    execSync(`docker build -t ${imageName} .`, { stdio: 'pipe' });

    const output = execSync(
      `snyk container test ${imageName} --json --severity-threshold=medium`,
      { maxBuffer: 20 * 1024 * 1024, env: { ...process.env } },
    ).toString();

    scanResults = JSON.parse(output);
    fs.writeFileSync('results/snyk-container-results.json', JSON.stringify(scanResults, null, 2));
  });

  test('no critical vulnerabilities with available fixes', () => {
    const criticalFixable = (scanResults.vulnerabilities || []).filter(
      (v: SnykVulnerability) =>
        v.severity === 'critical' && (v.isUpgradable || v.isPatchable || v.fixedIn.length > 0),
    );

    if (criticalFixable.length > 0) {
      console.error('Fixable critical vulnerabilities:');
      for (const v of criticalFixable) {
        console.error(`  ${v.id}: ${v.packageName}@${v.version} -> fix: ${v.fixedIn.join(', ')}`);
      }
    }

    expect(criticalFixable).toHaveLength(0);
  });

  test('base image recommendations are followed', () => {
    const baseImageAdvice = scanResults.docker?.baseImageRemediation;

    if (baseImageAdvice?.advice) {
      for (const advice of baseImageAdvice.advice) {
        console.log(`Base image recommendation: ${advice.message}`);
      }
    }

    if (baseImageAdvice?.recommendedFrom) {
      console.log(`Recommended base image: ${baseImageAdvice.recommendedFrom}`);
    }

    // Verify we are not using a deprecated or vulnerable base
    const baseImage = scanResults.docker?.baseImage || '';
    expect(baseImage).not.toContain(':latest');
    expect(baseImage).not.toMatch(/node:\d+-(?:buster|stretch)/); // deprecated Debian versions
  });

  test('license compliance check', () => {
    const restrictedLicenses = ['GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'];
    const violations: string[] = [];

    for (const vuln of scanResults.vulnerabilities || []) {
      if (vuln.license && restrictedLicenses.includes(vuln.license)) {
        violations.push(`${vuln.packageName}: ${vuln.license}`);
      }
    }

    expect(violations, `License violations found: ${violations.join(', ')}`).toHaveLength(0);
  });
});
```
