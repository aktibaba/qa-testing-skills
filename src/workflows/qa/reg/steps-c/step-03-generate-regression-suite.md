---
name: 'reg-generate-suite'
description: 'Generate or organize the regression test suite configuration'
nextStepFile: 'steps-c/step-04-maintenance-plan.md'
outputFile: '{test_artifacts}/reg-suite-config.md'
---

# Step 3 — Generate Regression Suite

## STEP GOAL

Generate the actual regression suite configuration files that enable running tests by tier (smoke, sanity, full regression, quarantine) using the test framework's native mechanisms.

## MANDATORY EXECUTION RULES

1. You MUST generate framework-native suite configurations (not just documentation).
2. You MUST use the framework's tagging/grouping mechanism identified in step-01.
3. You MUST create runnable commands for each suite tier.
4. You MUST add tags or markers to test files that lack them.
5. You MUST preserve existing test functionality while adding organization.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/reg-categorization.md`, `{test_artifacts}/reg-preflight.md`, test files
- WRITE: Suite config files, test file modifications (tags/markers), `{test_artifacts}/reg-suite-config.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Generate Suite Configuration

Based on the detected framework, create suite definitions:

**Jest / Vitest:**
```javascript
// jest.config.suites.js
module.exports = {
  projects: [
    {
      displayName: 'smoke',
      testMatch: ['**/*.test.{ts,js}'],
      testPathIgnorePatterns: ['/node_modules/'],
      globals: { SUITE: 'smoke' },
      // Use @jest-suite/smoke tag
    },
    // ... sanity, regression, quarantine
  ]
};
```

Also generate npm scripts:
```json
{
  "test:smoke": "jest --selectProjects smoke",
  "test:sanity": "jest --selectProjects sanity",
  "test:regression": "jest --selectProjects regression",
  "test:quarantine": "jest --selectProjects quarantine --retries 3"
}
```

**pytest:**
```ini
# pytest.ini or pyproject.toml
[tool.pytest.ini_options]
markers = [
    "smoke: Critical path tests (P1)",
    "sanity: Key feature tests (P2)",
    "regression: Full regression tests (P3/P4)",
    "quarantine: Known flaky tests under investigation",
]
```

Run commands:
```bash
pytest -m smoke
pytest -m "smoke or sanity"
pytest -m "not quarantine"
pytest -m quarantine --count=3  # with pytest-repeat for retries
```

**JUnit:**
```java
// Tags: @Tag("smoke"), @Tag("sanity"), @Tag("regression"), @Tag("quarantine")
// Suite runner configuration
```

**Playwright:**
```typescript
// playwright.config.ts — projects for each suite
{
  projects: [
    { name: 'smoke', grep: /@smoke/ },
    { name: 'sanity', grep: /@sanity/ },
    { name: 'regression', grep: /@regression/ },
  ]
}
```

### 2. Add Tags to Test Files

For each test that needs tagging (from categorization in step-02):

- Add framework-appropriate markers/tags to test files
- Preserve existing test code and structure
- Add tags as close to the test definition as possible
- Add a comment explaining the tier assignment

Example (Jest):
```javascript
// @suite:smoke @priority:P1
test('should login with valid credentials', () => { ... });
```

Example (pytest):
```python
@pytest.mark.smoke
@pytest.mark.priority_p1
def test_login_with_valid_credentials():
    ...
```

### 3. Create Run Scripts

Generate convenience scripts for running each suite:

```bash
#!/usr/bin/env bash
# scripts/test-smoke.sh — Run smoke suite
set -euo pipefail
echo "Running smoke suite (budget: {smoke_time_budget})..."
{framework_specific_command}
echo "Smoke suite complete."
```

### 4. Generate Suite Documentation

Write to `{test_artifacts}/reg-suite-config.md`:
```markdown
# Regression Suite Configuration

## Suite Commands
| Suite | Command | Budget |
|-------|---------|--------|
| Smoke | `npm run test:smoke` | {smoke_time_budget} |
| Sanity | `npm run test:sanity` | 5m |
| Full Regression | `npm run test:regression` | {execution_time_budget} |
| Quarantine | `npm run test:quarantine` | N/A |

## Files Modified
- {list of files where tags were added}

## Configuration Files Created
- {list of new config files}
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-reg
current_step: step-03-generate-regression-suite
status: complete
next_step: step-04-maintenance-plan
timestamp: {current_timestamp}
files_modified: {count}
configs_created: {count}
```

## SUCCESS METRICS

- [ ] Suite configuration files generated for the target framework
- [ ] Tags/markers added to test files
- [ ] Run commands for each suite tier documented
- [ ] All suites are runnable with the generated configuration
- [ ] Suite config documentation written

## FAILURE METRICS

- Framework does not support native tagging --> Use file-based organization (separate directories per suite)
- Adding tags would break existing test infrastructure --> Document manual tagging instructions instead
