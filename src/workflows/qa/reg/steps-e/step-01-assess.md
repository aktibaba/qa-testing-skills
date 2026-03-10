---
name: 'reg-edit-assess'
description: 'Assess existing regression suite and determine requested changes'
nextStepFile: 'steps-e/step-02-apply-edit.md'
outputFile: '{test_artifacts}/reg-edit-plan.md'
---

# Edit Step 1 — Assess Change Request

## STEP GOAL

Understand what changes the user wants to make to an existing regression suite and produce an edit plan.

## MANDATORY EXECUTION RULES

1. You MUST read the existing regression suite configuration and categorization.
2. You MUST clarify the user's intent if the requested change is ambiguous.
3. You MUST assess the impact on suite time budgets and tier balance.
4. You MUST produce an edit plan before making any changes.

## CONTEXT BOUNDARIES

- READ: Existing suite configs, `{test_artifacts}/reg-categorization.md`, `{test_artifacts}/reg-suite-summary.md`, test files
- WRITE: `{test_artifacts}/reg-edit-plan.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Existing Suite

Read the current regression suite configuration:
- Suite tier assignments
- Priority levels
- Execution time budgets
- Quarantine list
- Feature mapping

### 2. Understand Change Request

Determine the type of edit:
- **Add tests:** New tests need to be categorized and added to appropriate tiers
- **Promote/demote tests:** Move tests between tiers (smoke to sanity, etc.)
- **Quarantine tests:** Move flaky tests to quarantine
- **Un-quarantine tests:** Return fixed tests to their original suite
- **Rebalance suites:** Adjust tier assignments to meet time budgets
- **Update ownership:** Change test ownership assignments
- **Remove tests:** Retire tests for deprecated features

### 3. Impact Assessment

For the requested change, evaluate:
- Effect on suite execution times
- Effect on coverage balance across tiers
- Whether time budgets will still be met
- Whether critical paths remain covered in smoke suite

### 4. Create Edit Plan

```markdown
# Regression Suite Edit Plan
- Type: {add | promote | demote | quarantine | un-quarantine | rebalance | update-ownership | remove}
- Tests affected: {count}
- Time budget impact: {estimate}
- Coverage impact: {description}
```

## Save Progress

Write edit plan to `{test_artifacts}/reg-edit-plan.md`.

## SUCCESS METRICS

- [ ] Existing suite loaded and understood
- [ ] User intent clarified
- [ ] Impact on time budgets assessed
- [ ] Edit plan created

## FAILURE METRICS

- No existing suite found --> Redirect to CREATE mode
- Requested change would leave smoke suite empty --> Warn user, require confirmation
