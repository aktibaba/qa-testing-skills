---
name: 'ci-edit-assess'
description: 'Assess existing CI pipeline and determine requested changes'
nextStepFile: 'steps-e/step-02-apply-edit.md'
outputFile: '{test_artifacts}/ci-edit-plan.md'
---

# Edit Step 1 — Assess Change Request

## STEP GOAL

Understand what changes the user wants to make to an existing CI/CD pipeline configuration and produce an edit plan.

## MANDATORY EXECUTION RULES

1. You MUST read the existing CI config file.
2. You MUST clarify the user's intent if the requested change is ambiguous.
3. You MUST produce an edit plan before making any changes.
4. You MUST assess the impact of the requested change on other pipeline stages.

## CONTEXT BOUNDARIES

- READ: Existing CI config file, `{test_artifacts}/ci-preflight.md` (if exists), project files
- WRITE: `{test_artifacts}/ci-edit-plan.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Existing Pipeline

Read the current CI config and parse:
- Current stages and their order
- Trigger conditions
- Cache configuration
- Quality gates (if any)
- Artifact uploads

### 2. Understand Change Request

Determine the type of edit:
- **Add stage:** New test stage, deployment stage, or analysis step
- **Modify stage:** Change commands, timeouts, or conditions for an existing stage
- **Add quality gate:** New threshold or enforcement rule
- **Optimize performance:** Improve caching, add parallelism, reduce duration
- **Change platform:** Migrate pipeline to a different CI platform
- **Fix issue:** Resolve a pipeline failure or misconfiguration

### 3. Impact Assessment

For the requested change, evaluate:
- Which stages are affected
- Whether stage ordering changes
- Cache invalidation implications
- New secrets or environment variables needed
- Estimated impact on pipeline duration

### 4. Create Edit Plan

Document the planned changes:
```markdown
# CI Pipeline Edit Plan
- Type: {add-stage | modify-stage | add-gate | optimize | migrate | fix}
- Affected stages: [list]
- New dependencies: [list]
- Impact on duration: {estimate}
- Breaking changes: {yes/no — details}
```

## Save Progress

Write edit plan to `{test_artifacts}/ci-edit-plan.md`.

## SUCCESS METRICS

- [ ] Existing pipeline loaded and understood
- [ ] User intent clarified
- [ ] Impact assessment completed
- [ ] Edit plan created

## FAILURE METRICS

- No existing CI config found --> Redirect to CREATE mode
- Requested change conflicts with existing stages --> Present conflict and ask user to choose
