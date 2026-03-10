---
name: 'step-06-validate-and-summary'
description: 'Validate generated test suite and produce final summary'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 6: Validate and Summarize — Final Quality Check

## STEP GOAL
Validate the complete generated test suite against the quality checklist, generate a summary report, and provide the user with next steps for execution and CI integration.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Run the full checklist — do not skip sections
- Be honest about gaps — do not mark items PASS if uncertain

## CONTEXT BOUNDARIES
- Available context: all generated files from Steps 3-5, checklist.md
- Required knowledge fragments: `ci-pipeline-testing` (18), `flaky-test-management` (21)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 6.1 — Run Quality Checklist

Evaluate every item in `checklist.md` against the generated test suite:

1. **Selector Resilience (1.1-1.5)** — Review all page objects for selector strategy
2. **Wait Strategies (2.1-2.5)** — Scan all test files for sleep/wait patterns
3. **Test Isolation (3.1-3.5)** — Verify no inter-test dependencies
4. **Page Object Model (4.1-4.6)** — Check POM architecture completeness
5. **Visual Regression (5.1-5.6)** — Verify visual test configuration
6. **Accessibility (6.1-6.5)** — Verify a11y integration
7. **Test Structure (7.1-7.5)** — Review naming and organization
8. **CI/CD Integration (8.1-8.5)** — Verify CI configuration

Record PASS / FAIL / N/A for each item with brief justification.

### 6.2 — Calculate Coverage Summary

Produce a coverage summary:

| Metric                    | Value     |
|---------------------------|-----------|
| Total test files           | N         |
| Total test cases           | N         |
| P0 flows covered           | N / N     |
| P1 flows covered           | N / N     |
| Pages with visual tests    | N / N     |
| Pages with a11y scans      | N / N     |
| Page objects created        | N         |
| Fixture files               | N         |

### 6.3 — Identify Gaps and Recommendations

List any areas that need attention:

- **Missing coverage:** Flows or pages not yet covered
- **Selector gaps:** Components that need `data-testid` attributes added to source code
- **Flakiness risks:** Tests that may be prone to flakiness (complex async flows, third-party dependencies)
- **Test data dependencies:** External services or data that tests depend on
- **CI considerations:** Estimated execution time, parallelization recommendations

### 6.4 — Generate Run Commands

Provide ready-to-use commands:

```bash
# Run all E2E tests locally
npx playwright test

# Run specific test file
npx playwright test specs/auth-flow.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Update visual baselines
npx playwright test --update-snapshots

# Generate HTML report
npx playwright show-report
```

### 6.5 — CI Pipeline Snippet

Provide a ready-to-use CI step:

**GitHub Actions:**
```yaml
- name: Run E2E Tests
  run: npx playwright test
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    CI: true

- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: test-artifacts/playwright-results/
    retention-days: 14
```

### 6.6 — Maintenance Guide

Document how to maintain the test suite:

1. **Adding tests for new features:** Create page object first, then test spec
2. **Updating visual baselines:** Run `--update-snapshots` after intentional UI changes
3. **Handling flaky tests:** Use `test.fixme()` to mark, create a tracking issue, investigate root cause
4. **Test data rotation:** When test data becomes stale, update fixtures and re-seed
5. **Keeping selectors in sync:** When refactoring components, update page objects and `data-testid` attributes together

### Save Progress

Finalize {outputFile}:

```markdown
## Status: WORKFLOW COMPLETE

## Quality Score
- Checklist result: <EXCELLENT/GOOD/NEEDS WORK/POOR>
- Pass rate: <N>/<total> items

## Coverage Summary
<table from 6.2>

## Gaps and Recommendations
<from 6.3>

## Generated Files Summary
<complete file listing with descriptions>

## Next Steps for User
1. Run: `<install command>`
2. Add `data-testid` attributes to source components (see list above)
3. Run: `<test command>` to generate baselines
4. Add CI pipeline step (see snippet above)
5. Review and commit baseline screenshots
```

Load next step: Workflow complete. Return control to user.

## SUCCESS/FAILURE METRICS
### SUCCESS: Full checklist evaluated with scores, coverage summary produced, run commands provided, CI snippet generated, maintenance guide included, quality score is GOOD or better
### FAILURE: Checklist not fully evaluated, no run commands provided, no CI integration guidance
