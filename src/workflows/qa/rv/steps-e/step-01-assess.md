---
name: 'rv-edit-assess'
description: 'Assess existing quality report and determine requested changes'
nextStepFile: 'steps-e/step-02-apply-edit.md'
outputFile: '{test_artifacts}/rv-edit-plan.md'
---

# Edit Step 1 — Assess Change Request

## STEP GOAL

Understand what changes the user wants to make to an existing quality report or how they want to address previously flagged findings.

## MANDATORY EXECUTION RULES

1. You MUST read the existing quality report from `{test_artifacts}/rv-quality-report.md`.
2. You MUST clarify the user's intent if the requested change is ambiguous.
3. You MUST produce an edit plan before making any changes.
4. You MUST NOT overwrite the existing report without the edit plan.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/rv-quality-report.md`, `{test_artifacts}/rv-evaluation-data.md`, test files
- WRITE: `{test_artifacts}/rv-edit-plan.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Existing Report

Read the current quality report and evaluation data. Parse:
- Current scores per dimension
- Existing findings and recommendations
- Files that were reviewed

### 2. Understand Change Request

Determine the type of edit:
- **Re-score specific files:** User fixed issues and wants updated scores
- **Add files to review:** New test files need to be included
- **Modify recommendations:** User wants different or additional recommendations
- **Update scope:** Change from "all" to specific scope or vice versa
- **Refresh report:** Re-evaluate after codebase changes

### 3. Create Edit Plan

Document the planned changes:
```markdown
# Edit Plan
- Type: {re-score | add-files | modify-recommendations | update-scope | refresh}
- Affected files: [list]
- Current scores: [relevant current scores]
- Expected changes: [description]
```

## Save Progress

Write edit plan to `{test_artifacts}/rv-edit-plan.md`.

## SUCCESS METRICS

- [ ] Existing report loaded and understood
- [ ] User intent clarified
- [ ] Edit plan created with specific scope of changes

## FAILURE METRICS

- No existing report found --> Redirect to CREATE mode (step-01-load-context)
- User request unclear --> Ask clarifying questions before proceeding
