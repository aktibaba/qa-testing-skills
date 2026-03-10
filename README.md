# QA Testing Skills

A modular, AI-driven QA architect system that provides risk-based test strategy, test automation guidance, environment management, security testing, performance validation, and release gate decisions.

**Stack-agnostic** — works with any language, framework, or CI/CD platform.

## Architecture

```
src/
├── module.yaml                    # Module configuration & variables
├── agents/
│   └── qa.agent.yaml              # QA Architect agent persona & menu
├── qa/
│   ├── qa-index.csv               # Knowledge fragment index (35 entries)
│   └── knowledge/                 # 35 reusable knowledge fragments
│       ├── docker-test-env.md
│       ├── api-testing-fundamentals.md
│       ├── risk-based-testing.md
│       └── ... (32 more)
└── workflows/qa/
    ├── env/                       # Docker test environment setup
    ├── api/                       # API testing
    ├── ui/                        # UI/E2E testing
    ├── int/                       # Integration testing
    ├── perf/                      # Performance testing
    ├── sec/                       # Security testing
    ├── rv/                        # Test quality review
    ├── ci/                        # CI/CD pipeline setup
    ├── reg/                       # Regression testing
    └── tmt/                       # Teach Me Testing (education)
```

## Workflows

| Trigger | Workflow | Description |
|---------|----------|-------------|
| **ENV** | Docker Environment | Setup reproducible Docker-based test environments |
| **API** | API Testing | Design and implement API test suites (REST, GraphQL, gRPC) |
| **UI**  | UI/E2E Testing | Browser automation and end-to-end test design |
| **INT** | Integration Testing | Test service interactions, webhooks, messaging |
| **PERF**| Performance Testing | Load testing, stress testing, benchmarks |
| **SEC** | Security Testing | Vulnerability scanning, penetration test guidance |
| **RV**  | Test Review | Quality scoring and best practices validation |
| **CI**  | CI/CD Pipeline | Quality pipeline with test stages and gates |
| **REG** | Regression Testing | Build and maintain regression suites |
| **TMT** | Teach Me Testing | Progressive QA education sessions |

## Workflow Modes

Every workflow supports **tri-modal execution**:

- **[C] Create** — Run the full workflow from scratch
- **[R] Resume** — Resume an interrupted workflow
- **[V] Validate** — Validate existing outputs against checklist
- **[E] Edit** — Revise existing outputs

## Knowledge Base

35 knowledge fragments organized in 3 tiers:

- **Core** (18 fragments) — Always relevant: Docker environments, API testing, test isolation, risk-based testing, CI pipelines, security, performance, regression design
- **Extended** (12 fragments) — Loaded on demand: GraphQL, POM, visual regression, contract testing, accessibility, parallel execution, database testing
- **Specialized** (5 fragments) — Context-specific: email testing, file uploads, mobile testing, microservice patterns

## Supported Stacks

- **Languages**: JavaScript/TypeScript, Python, Go, Java, C#, Ruby, PHP
- **Test Frameworks**: Playwright, Cypress, Jest, pytest, JUnit, Go test, xUnit, RSpec, Mocha, Vitest, Selenium, Appium
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins, Azure Pipelines, CircleCI, Harness, Bitbucket Pipelines
- **Performance**: k6, Locust, Artillery, JMeter, Gatling
- **Security**: Semgrep, Trivy, Snyk, ZAP
- **Containers**: Docker, Podman, nerdctl

## Configuration

Edit `module.yaml` to customize:

```yaml
variables:
  test_stack_type: "auto"          # auto | frontend | backend | fullstack | mobile
  test_framework: "auto"           # auto | playwright | cypress | jest | pytest | ...
  ci_platform: "auto"             # auto | github-actions | gitlab-ci | jenkins | ...
  use_docker: true                 # Docker-based test environments
  container_runtime: "docker"      # docker | podman | nerdctl
  communication_language: "en"     # ISO 639-1 language code
```

## How It Works

1. **Agent loads** → reads `qa.agent.yaml` persona and menu
2. **User triggers workflow** → e.g., "API" starts the API testing workflow
3. **Mode selection** → Create / Resume / Validate / Edit
4. **Step-by-step execution** → Each step file loads sequentially (just-in-time)
5. **Knowledge injection** → Relevant fragments loaded from `qa-index.csv`
6. **Output generation** → Tests, configs, reports saved to project
7. **Validation** → Outputs checked against quality checklist

## License

MIT
