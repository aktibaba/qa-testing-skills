---
name: 'perf-c-step-01-preflight'
step: 1
mode: create
next_step: 'step-02-define-scenarios.md'
---

# Step 1 — Preflight: Stack Detection & Tool Selection

## STEP GOAL

Detect the project's technology stack, identify performance-critical endpoints and services, verify that required performance testing tools are available, and establish the testing context for subsequent steps.

## MANDATORY EXECUTION RULES

1. You MUST complete every action in the MANDATORY SEQUENCE before proceeding.
2. You MUST NOT skip tool detection or fall back to assumptions without scanning.
3. You MUST NOT proceed to step 2 if critical blockers are identified (no target endpoints, no viable tool).
4. You MUST save progress after completing this step.

## CONTEXT BOUNDARIES

- Read project files: package.json, requirements.txt, pyproject.toml, go.mod, pom.xml, Gemfile, Cargo.toml
- Read existing test configurations and CI pipelines
- Read API route definitions, controller files, and OpenAPI/Swagger specs
- Read application configuration for service URLs and ports
- Do NOT modify any source code in this step
- Do NOT install tools or dependencies in this step

## MANDATORY SEQUENCE

### 1.1 — Detect Technology Stack

Scan the project root to identify:
- **Primary language and framework** (Node.js/Express, Python/FastAPI, Go/Gin, Java/Spring, etc.)
- **API type** (REST, GraphQL, gRPC, WebSocket)
- **Existing test infrastructure** (test runners, assertion libraries, CI config)
- **Database and service dependencies** (PostgreSQL, Redis, message queues, external APIs)
- **Deployment target** (Docker, Kubernetes, serverless, bare metal)

Record findings in a structured format.

### 1.2 — Identify Performance-Critical Endpoints

Locate endpoints and services that require performance testing:

1. **Scan route definitions** — Express routes, FastAPI paths, Spring controllers, Go handlers
2. **Check OpenAPI/Swagger specs** — If `openapi.yaml`, `swagger.json`, or similar exists, parse endpoint definitions
3. **Identify high-risk endpoints:**
   - Authentication and token endpoints
   - Search and list endpoints (pagination, filtering)
   - File upload/download endpoints
   - Write-heavy endpoints (create, update, bulk operations)
   - Endpoints with database joins or aggregations
   - WebSocket or SSE connections
4. **Check for existing SLAs/SLOs** — Look for performance budgets in documentation, config, or monitoring setup

If no endpoints can be detected, ask the user to provide target URLs and expected traffic patterns.

### 1.3 — Detect or Select Performance Tool

If `{perf_tool}` is `auto`:

1. Scan for existing performance test configurations:
   - `k6/`, `*.k6.js`, `k6.config.js` -> k6
   - `locustfile.py`, `locust/` -> Locust
   - `artillery.yml`, `artillery/` -> Artillery
   - `*.jmx`, `jmeter/` -> JMeter
   - `gatling/`, `*.scala` in simulation dirs -> Gatling
2. Scan dependency files for performance tool packages
3. If nothing detected, select based on project stack:
   - JavaScript/TypeScript projects -> **k6** (JavaScript API, lightweight)
   - Python projects -> **Locust** (native Python, distributed)
   - Node.js with YAML preference -> **Artillery** (YAML-driven)
   - Java/Scala projects -> **Gatling** or **JMeter**
   - Default fallback -> **k6**

Record the selected tool and rationale.

### 1.4 — Verify Tool Availability

Check whether the selected tool is installed and accessible:
- k6: `k6 version`
- Locust: `locust --version` or `pip show locust`
- Artillery: `npx artillery version` or `artillery version`
- JMeter: `jmeter --version` or check `JMETER_HOME`
- Gatling: check `GATLING_HOME` or `gatling.sh`

If the tool is not installed, provide installation instructions but do NOT block the workflow. Scripts can be generated without the tool being locally available.

### 1.5 — Establish Test Parameters

Resolve the following parameters:
- **Base URL**: Detect from environment files, Docker Compose, or ask the user
- **Target RPS**: Use `{perf_target_rps}` or estimate from traffic data
- **Test duration**: Use `{perf_duration}` or default to 5 minutes for load tests
- **Authentication**: Determine if endpoints require auth tokens and how to obtain them
- **Test data requirements**: Identify if tests need seed data (user accounts, sample records)

## Save Progress

Write the following to `{test_artifacts}/workflow-progress.md`:

```markdown
# Performance Testing Workflow Progress

## Status: Step 1 Complete — Preflight

## Detected Configuration
- **Stack**: [detected stack]
- **Performance Tool**: [selected tool]
- **Tool Installed**: [yes/no]
- **Base URL**: [detected or configured URL]
- **Target RPS**: [value]
- **Test Duration**: [value]

## Performance-Critical Endpoints
[List of identified endpoints with risk assessment]

## Authentication
- **Required**: [yes/no]
- **Method**: [bearer/basic/oauth2/api-key/none]

## Next Step
step-02-define-scenarios.md
```

## SUCCESS METRICS

- Technology stack fully identified with language, framework, and API type
- At least 3 performance-critical endpoints identified (or user-provided list confirmed)
- Performance testing tool selected with clear rationale
- Base URL, target RPS, and duration parameters resolved
- Progress file written to `{test_artifacts}/workflow-progress.md`

## FAILURE METRICS

- Cannot determine project stack (no recognizable project files)
- No endpoints or services identified for testing
- User cannot provide target URLs when auto-detection fails
- Progress file not written

On failure, report the specific blocker and ask the user for guidance before proceeding.

---

**Next step:** Load `step-02-define-scenarios.md`
