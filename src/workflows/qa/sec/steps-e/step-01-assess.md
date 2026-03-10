---
name: 'sec-e-step-01-assess'
step: 1
mode: edit
next_step: 'step-02-apply-edit.md'
---

# Edit Step 1 — Assess Current State and Requested Change

## STEP GOAL

Understand the current security test suite, identify what the user wants to change, and create a precise edit plan that preserves existing work while implementing the requested modifications.

## MANDATORY EXECUTION RULES

1. You MUST read and understand the existing security test suite before proposing changes.
2. You MUST clarify ambiguous edit requests with the user before proceeding.
3. You MUST identify all files that will be affected by the change.
4. You MUST assess the security impact of the change (does it increase or decrease coverage?).
5. You MUST NOT make changes in this step — assessment only.
6. You MUST save the edit plan before proceeding.

## CONTEXT BOUNDARIES

- Read all existing security test files (auth tests, input tests, scanning configs, CI pipeline)
- Read the threat model if it exists
- Read the progress file if it exists
- Read the checklist for quality reference
- Do NOT modify any files in this step
- Do NOT execute tests or scans

## MANDATORY SEQUENCE

### 1.1 — Inventory Existing Suite

Scan for security test assets:

1. **Auth tests** — Find authentication, session, and RBAC test files
2. **Input validation tests** — Find injection, XSS, CSRF test files
3. **Scanning configs** — Find dependency, container, and secret scanning configurations
4. **CI integration** — Find pipeline jobs related to security testing
5. **Threat model** — Find any threat model documentation
6. **Helper files** — Auth utilities, request helpers, test data
7. **Documentation** — Security reports, remediation tracking

Create a file inventory with path, purpose, and coverage area.

### 1.2 — Understand the Requested Change

Categorize the user's request:

| Category | Examples |
|---|---|
| Add endpoint coverage | "Add security tests for the new /api/v2/payments endpoint" |
| Update auth tests | "We switched from JWT to session-based auth" |
| Add test category | "Add SSRF tests for the webhook URL feature" |
| Update scanning | "Switch from npm audit to Snyk for dependency scanning" |
| Fix false positives | "The XSS test on /api/search is a false positive" |
| Update CI | "Add container scanning to the PR pipeline" |
| Add compliance | "We need PCI-DSS compliance tests for the payment flow" |
| Update threat model | "We added a new microservice, update the threat model" |

If the request is unclear, ask the user to specify:
- What exactly should change?
- Which test categories are affected?
- Are there new threats or compliance requirements?

### 1.3 — Impact Analysis

For the identified change, assess:

1. **Coverage impact** — Does this change increase or decrease security coverage?
2. **Threat model alignment** — Does this change address a gap or create one?
3. **Direct impact** — Which files need modification?
4. **Cascade impact** — Does this change affect the threat model, checklist score, CI config, or report?
5. **Risk** — Could this change introduce security testing blind spots?
6. **Effort** — Is this a minor edit or a significant rework?

### 1.4 — Create Edit Plan

Document the edit plan:

```markdown
## Edit Plan

### Requested Change
[User's request in clear terms]

### Category
[Category from the table above]

### Coverage Impact
[Increase/Decrease/Neutral — explanation]

### Files to Modify
1. [file path] — [what changes and why]
2. [file path] — [what changes and why]

### Files to Create (if any)
1. [file path] — [purpose]

### Cascade Updates Required
- [ ] Threat model: [yes/no — details]
- [ ] Checklist score: [yes/no — details]
- [ ] CI config: [yes/no — details]
- [ ] Security report: [yes/no — details]
- [ ] Helper files: [yes/no — details]

### Risk Assessment
[Low/Medium/High] — [explanation of any blind spots introduced]

### Validation After Edit
[How to verify the change works correctly and maintains coverage]
```

Present the edit plan to the user for confirmation.

## Save Progress

Write edit plan to `{test_artifacts}/workflow-progress.md`:

```markdown
# Security Testing Workflow Progress

## Status: Edit Mode — Assessment Complete

## Edit Plan
[Full edit plan from 1.4]

## Next Step
steps-e/step-02-apply-edit.md
```

## SUCCESS METRICS

- Complete inventory of existing security test assets
- User's change request clearly categorized and understood
- Coverage impact assessed (no accidental blind spots)
- Impact analysis completed with cascade effects identified
- Edit plan created with specific files and changes listed
- User confirms the edit plan before proceeding
- Progress file updated with edit plan

## FAILURE METRICS

- Existing suite not fully inventoried (missing files)
- Change request remains ambiguous after assessment
- Coverage impact not assessed
- Impact analysis skipped (cascade effects not considered)
- No edit plan created
- Progress file not updated

---

**Next step:** Load `step-02-apply-edit.md`
