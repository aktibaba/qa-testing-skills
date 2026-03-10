---
name: 'step-01-validate'
description: 'Validate existing UI tests against the quality checklist'
nextStepFile: null
outputFile: '{test_artifacts}/workflow-progress.md'
---

# Step 1 (Validate): Validate — Full Quality Audit of UI Tests

## STEP GOAL
Perform a comprehensive quality audit of the existing UI/E2E test suite by evaluating every item in the checklist, scoring each section, and producing a detailed report with actionable recommendations.

## MANDATORY EXECUTION RULES
- Read this entire step before acting
- Speak in {communication_language}
- Evaluate EVERY item in the checklist — do not skip
- Read actual test files — do not guess based on file names
- Be honest and specific — cite file names and line numbers for FAIL items

## CONTEXT BOUNDARIES
- Available context: existing test files, project source, `checklist.md`
- Required knowledge fragments: `selector-resilience` (09), `page-object-model` (11), `visual-regression` (12), `accessibility-testing` (27), `test-isolation` (07), `flaky-test-management` (21)

## MANDATORY SEQUENCE
**CRITICAL:** Follow this sequence exactly.

### 1V.1 — Inventory Existing Tests

Build a complete inventory:

1. **Test files** — List all `.spec.ts`, `.test.ts`, `.cy.ts` files with line counts
2. **Page objects** — List all page object files
3. **Config files** — Framework config, env files
4. **Helpers and utilities** — Auth helpers, data factories, custom commands
5. **Visual baselines** — Screenshot files, if any
6. **CI config** — Pipeline files referencing tests

### 1V.2 — Evaluate Checklist Section by Section

For each checklist section, read the relevant files and score each item:

**Section 1: Selector Resilience**
- Read all page object files and test files
- Search for selector patterns: `data-testid`, `getByRole`, CSS classes, XPath
- Count and categorize each selector strategy used
- Flag any fragile selectors with file:line references

**Section 2: Wait Strategies**
- Search all test files for `sleep`, `wait(`, `setTimeout`, `cy.wait(number)`
- Check for explicit wait usage: `waitForSelector`, `waitForResponse`
- Review timeout configuration in the config file

**Section 3: Test Isolation**
- Check `beforeEach`/`beforeAll` hooks — do they use API calls or UI flows?
- Look for shared mutable state between tests
- Check if tests reference other test files or share variables
- Verify parallel execution configuration

**Section 4: Page Object Model**
- Check for `pages/` or `models/` directory
- Verify page objects have semantic methods (not just wrappers around `click`)
- Check if test files access DOM directly or through page objects
- Review base class usage

**Section 5: Visual Regression**
- Check for visual test files
- Look for screenshot comparison configuration
- Verify dynamic content masking
- Check baseline management

**Section 6: Accessibility**
- Look for axe-core or similar integration
- Check which pages have a11y scans
- Verify violation handling (failures vs warnings)
- Check for keyboard navigation tests

**Section 7: Test Structure**
- Review file naming conventions
- Check test block naming quality
- Measure file sizes (flag files over 200 lines)
- Look for magic values

**Section 8: CI/CD Integration**
- Check CI pipeline config for headless execution
- Verify report generation and artifact upload
- Check failure screenshot capture
- Review timeout configuration

### 1V.3 — Calculate Scores

For each section, calculate: `PASS count / (PASS + FAIL count)` (exclude N/A)

Overall score: weighted average across sections (Sections 1-3 are weighted 2x, others 1x)

Apply rating:
| Rating         | Criteria                              |
|----------------|---------------------------------------|
| **EXCELLENT**  | 90-100% PASS across all sections      |
| **GOOD**       | 75-89% PASS, no FAIL in sections 1-3  |
| **NEEDS WORK** | 50-74% PASS or any FAIL in section 1  |
| **POOR**       | Below 50% PASS                        |

### 1V.4 — Generate Remediation Plan

For each FAIL item, provide:

1. **What's wrong** — Specific issue with file:line reference
2. **Why it matters** — Risk introduced by the failure
3. **How to fix** — Concrete steps or code snippet to resolve
4. **Effort estimate** — Low (< 30 min), Medium (1-2 hours), High (half day+)

Prioritize fixes:
- **Quick wins** — Low effort, high impact (fix these first)
- **Important** — Medium effort, high impact
- **Nice to have** — Any effort, low impact

### 1V.5 — Present Results

Format the complete audit report:

```
UI/E2E Test Quality Audit
═══════════════════════════

Overall Score: <EXCELLENT/GOOD/NEEDS WORK/POOR> (<percentage>%)

Section Scores:
1. Selector Resilience:  <score>% <rating>
2. Wait Strategies:      <score>% <rating>
3. Test Isolation:       <score>% <rating>
4. Page Object Model:    <score>% <rating>
5. Visual Regression:    <score>% <rating>
6. Accessibility:        <score>% <rating>
7. Test Structure:       <score>% <rating>
8. CI/CD Integration:    <score>% <rating>

Top Priority Fixes:
1. <fix description> — <file> — <effort>
2. ...

Quick Wins:
1. <fix description> — <file> — <effort>
2. ...
```

### Save Progress

Save to {outputFile}:

```markdown
# UI/E2E Workflow Progress — Validate Mode

## Status: VALIDATION COMPLETE

## Overall Score: <rating> (<percentage>%)

## Section Scores
<detailed scores>

## FAIL Items
<list with file:line references>

## Remediation Plan
### Quick Wins
<list>
### Important Fixes
<list>
### Nice to Have
<list>

## Test Suite Stats
- Total test files: <N>
- Total test cases: <N>
- Page objects: <N>
- Visual tests: <N>
- A11y tests: <N>
```

Load next step: Workflow complete. Return control to user.

## SUCCESS/FAILURE METRICS
### SUCCESS: Every checklist item evaluated with PASS/FAIL/N/A, scores calculated per section and overall, FAIL items have specific file:line references, remediation plan provided with effort estimates
### FAILURE: Checklist items skipped, scores not calculated, FAIL items lack specificity, no remediation guidance
