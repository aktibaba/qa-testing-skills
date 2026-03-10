# QA Testing Skills

AI-powered QA testing prompts that work with **any AI agent** — Claude Code, Cursor, Windsurf, GitHub Copilot, ChatGPT, Gemini, or any LLM.

One command to install. Zero dependencies. Just markdown prompts that turn any AI into a QA architect.

## Quick Start

```bash
npx qa-testing-skills init
```

That's it. The CLI auto-detects your AI tool and installs the prompts in the right place.

### Platform-specific install

```bash
npx qa-testing-skills init claude      # → .claude/commands/
npx qa-testing-skills init cursor      # → .cursor/rules/
npx qa-testing-skills init windsurf    # → .windsurf/rules/
npx qa-testing-skills init copilot     # → .github/copilot-instructions.md
npx qa-testing-skills init generic     # → prompts/ (copy-paste anywhere)
```

## Available Prompts

| Prompt | What it does |
|--------|-------------|
| **qa-api** | Design and generate API test suites (REST, GraphQL, gRPC) |
| **qa-ui** | Browser automation and E2E tests (Playwright, Cypress, Selenium) |
| **qa-env** | Docker-based reproducible test environments |
| **qa-int** | Integration tests for service interactions, databases, queues |
| **qa-perf** | Load testing, stress testing, benchmarks (k6, Locust, Artillery) |
| **qa-sec** | Security testing — OWASP Top 10, scanning, vulnerability detection |
| **qa-ci** | CI/CD pipeline with quality gates (GitHub Actions, GitLab CI, Jenkins) |
| **qa-reg** | Regression suite organization — smoke, sanity, full regression tiers |
| **qa-rv** | Test quality review — scored audit with actionable recommendations |

## Usage Examples

### Claude Code
```bash
# After running: npx qa-testing-skills init claude
claude /qa-api        # Generate API tests for your project
claude /qa-ui         # Generate E2E tests
claude /qa-ci         # Setup CI pipeline with quality gates
```

### Cursor / Windsurf
Prompts are auto-loaded as rules. Just ask:
> "Use qa-api to generate tests for my Express API"

### ChatGPT / Gemini / Any LLM
```bash
npx qa-testing-skills init generic
```
Then copy-paste the relevant prompt file from `prompts/` into your chat.

## What Each Prompt Does

Every prompt follows the same pattern:

1. **Discovery** — Scans your project, detects stack, framework, existing tests
2. **Strategy** — Designs a risk-based test plan prioritized by business impact
3. **Generation** — Creates test files, configs, and helpers ready to run
4. **Validation** — Checks output against a quality checklist
5. **Report** — Provides run commands, coverage summary, and recommendations

## Supported Stacks

- **Languages**: JavaScript/TypeScript, Python, Go, Java, C#, Ruby, PHP
- **Test Frameworks**: Playwright, Cypress, Jest, pytest, JUnit, Go test, xUnit, RSpec, Mocha, Vitest, Selenium
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins, Azure Pipelines, CircleCI, Bitbucket Pipelines
- **Performance**: k6, Locust, Artillery, JMeter, Gatling
- **Security**: Semgrep, Trivy, Snyk, ZAP
- **Containers**: Docker, Podman, nerdctl

## How It Works

Each prompt is a self-contained markdown file that instructs any AI to act as a QA architect. No runtime, no dependencies, no API keys needed.

```
prompts/
├── qa-api.md      # API testing prompt
├── qa-ui.md       # UI/E2E testing prompt
├── qa-env.md      # Docker environment prompt
├── qa-int.md      # Integration testing prompt
├── qa-perf.md     # Performance testing prompt
├── qa-sec.md      # Security testing prompt
├── qa-ci.md       # CI/CD pipeline prompt
├── qa-reg.md      # Regression testing prompt
└── qa-rv.md       # Test review prompt
```

The CLI just copies these files to the right location for your AI tool. That's the whole trick.

## License

MIT
