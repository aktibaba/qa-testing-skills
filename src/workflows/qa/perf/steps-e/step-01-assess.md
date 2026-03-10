---
name: 'perf-e-step-01-assess'
step: 1
mode: edit
next_step: 'step-02-apply-edit.md'
---

# Edit Step 1 — Assess Current State and Requested Change

## STEP GOAL

Understand the current performance test suite, identify what the user wants to change, and create a precise edit plan that preserves existing work while implementing the requested modifications.

## MANDATORY EXECUTION RULES

1. You MUST read and understand the existing performance test suite before proposing changes.
2. You MUST clarify ambiguous edit requests with the user before proceeding.
3. You MUST identify all files that will be affected by the change.
4. You MUST assess the impact of the change on thresholds, CI configuration, and other scenarios.
5. You MUST NOT make changes in this step — assessment only.
6. You MUST save the edit plan before proceeding.

## CONTEXT BOUNDARIES

- Read all existing performance test files (scripts, config, CI pipeline, helpers)
- Read the progress file if it exists
- Read the checklist for quality reference
- Do NOT modify any files in this step
- Do NOT execute tests

## MANDATORY SEQUENCE

### 1.1 — Inventory Existing Suite

Scan for performance test assets:

1. **Test scripts** — Find all performance test files in `{test_dir}/performance/`, `{test_dir}/perf/`, `{test_dir}/load/`, or tool-specific directories
2. **Configuration** — Find config files, environment files, threshold definitions
3. **CI integration** — Find pipeline jobs related to performance testing
4. **Helper files** — Auth utilities, data generators, shared functions
5. **Documentation** — README, threshold docs, reports

Create a file inventory with path, purpose, and last modified date.

### 1.2 — Understand the Requested Change

Categorize the user's request:

| Category | Examples |
|---|---|
| Add endpoint | "Add performance tests for the new /api/v2/search endpoint" |
| Modify threshold | "Change the p95 threshold from 500ms to 300ms" |
| Add scenario | "Add a spike test scenario" |
| Change tool | "Migrate from Artillery to k6" |
| Update CI | "Run load tests on every merge to main instead of nightly" |
| Fix issue | "Tests are failing because the auth flow changed" |
| Add metrics | "Track custom metrics for checkout flow duration" |
| Scale up | "Increase target RPS from 100 to 500" |

If the request is unclear, ask the user to specify:
- What exactly should change?
- Which scenarios are affected?
- Are there new SLA requirements?

### 1.3 — Impact Analysis

For the identified change, assess:

1. **Direct impact** — Which files need modification?
2. **Cascade impact** — Does this change affect thresholds, CI config, or documentation?
3. **Risk** — Could this change break existing tests or produce misleading results?
4. **Effort** — Is this a minor edit or a significant rework?

### 1.4 — Create Edit Plan

Document the edit plan:

```markdown
## Edit Plan

### Requested Change
[User's request in clear terms]

### Category
[Category from the table above]

### Files to Modify
1. [file path] — [what changes and why]
2. [file path] — [what changes and why]

### Files to Create (if any)
1. [file path] — [purpose]

### Cascade Updates Required
- [ ] Thresholds: [yes/no — details]
- [ ] CI config: [yes/no — details]
- [ ] Documentation: [yes/no — details]
- [ ] Helper files: [yes/no — details]

### Risk Assessment
[Low/Medium/High] — [explanation]

### Validation After Edit
[How to verify the change works correctly]
```

Present the edit plan to the user for confirmation.

## Save Progress

Write edit plan to `{test_artifacts}/workflow-progress.md`:

```markdown
# Performance Testing Workflow Progress

## Status: Edit Mode — Assessment Complete

## Edit Plan
[Full edit plan from 1.4]

## Next Step
steps-e/step-02-apply-edit.md
```

## SUCCESS METRICS

- Complete inventory of existing performance test assets
- User's change request clearly categorized and understood
- Impact analysis completed with cascade effects identified
- Edit plan created with specific files and changes listed
- User confirms the edit plan before proceeding
- Progress file updated with edit plan

## FAILURE METRICS

- Existing suite not fully inventoried (missing files)
- Change request remains ambiguous after assessment
- Impact analysis skipped (cascade effects not considered)
- No edit plan created
- Progress file not updated

---

**Next step:** Load `step-02-apply-edit.md`
