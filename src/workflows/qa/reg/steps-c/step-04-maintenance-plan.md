---
name: 'reg-maintenance-plan'
description: 'Create regression suite maintenance plan with review cadence and ownership'
nextStepFile: 'steps-c/step-05-validate-and-summary.md'
outputFile: '{test_artifacts}/reg-maintenance-plan.md'
---

# Step 4 — Maintenance Plan

## STEP GOAL

Create a living maintenance plan for the regression suite that defines review cadence, test ownership, flaky test remediation process, and metrics for tracking suite health over time.

## MANDATORY EXECUTION RULES

1. You MUST define a review cadence appropriate to the team's sprint cycle.
2. You MUST assign ownership for each feature area's tests.
3. You MUST define the flaky test remediation process.
4. You MUST specify health metrics and tracking mechanisms.
5. You MUST create a process for adding, promoting, and retiring tests.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/reg-categorization.md`, `{test_artifacts}/reg-suite-config.md`, knowledge fragments
- WRITE: `{test_artifacts}/reg-maintenance-plan.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Define Review Cadence

Establish regular review cycles:

```markdown
## Review Cadence

### Sprint Review (every 2 weeks)
- Review new tests added during the sprint
- Assign new tests to appropriate suite tiers
- Check quarantine queue — fix or remove stale flaky tests
- Review execution time trends

### Monthly Health Check
- Full suite execution time audit
- Coverage gap analysis against new features
- Flakiness rate trend analysis
- Test ownership verification

### Quarterly Deep Review
- Re-evaluate all P1/smoke assignments
- Remove orphaned tests (no corresponding feature)
- Optimize slow tests
- Update suite time budgets based on actual data
```

### 2. Define Test Ownership

Map test ownership to teams or individuals:

```markdown
## Test Ownership

| Feature Area | Owner (Team/Individual) | Test Count | Suite |
|---|---|---|---|
| Authentication | {team/person} | {N} | Smoke + Sanity |
| Payments | {team/person} | {N} | Smoke |
| User Management | {team/person} | {N} | Sanity |
| ... | ... | ... | ... |

### Ownership Rules
- Every test file MUST have an owner
- Owner is responsible for maintaining test quality and fixing flaky tests
- When a team member leaves, ownership transfers to the team lead
- New tests inherit ownership from the feature team
```

### 3. Flaky Test Process

Define the quarantine and remediation workflow:

```markdown
## Flaky Test Remediation

### Detection
- Test fails intermittently in CI (>2% failure rate over 7 days)
- Reported by team member experiencing local flakiness

### Quarantine Process
1. Tag test as `@quarantine` with a date stamp
2. Move to quarantine suite (stops blocking CI)
3. Create tracking issue with:
   - Failure frequency and pattern
   - Suspected root cause
   - Assigned owner
   - Target remediation date (max 2 sprints)

### Remediation
- Owner investigates root cause within 1 sprint
- Common fixes: add waits, mock external deps, fix shared state
- If not fixable within 2 sprints, decide: rewrite or delete

### Promotion Back
- Fix is applied and test passes 50 consecutive runs
- Remove `@quarantine` tag, return to original suite
- Monitor for 1 week after promotion
```

### 4. Test Lifecycle

Define how tests move through the system:

```markdown
## Test Lifecycle

### Adding Tests
1. New feature development includes tests (definition of done)
2. Tests default to P3/Full Regression
3. Critical path tests are promoted to P1/Smoke during sprint review
4. Tests must pass 10 consecutive runs before being added to smoke/sanity

### Promoting Tests
- P3 → P2: Feature becomes high-traffic or business-critical
- P2 → P1: Feature is revenue-impacting or security-critical
- Always verify time budget after promotion

### Demoting/Retiring Tests
- Feature deprecated → Tests moved to P4, then removed after feature sunset
- Test provides no unique coverage → Remove
- Test is permanently flaky with no fix path → Remove (after documenting the gap)
```

### 5. Health Metrics

Define what to track:

```markdown
## Suite Health Metrics

| Metric | Target | Alert Threshold |
|---|---|---|
| Smoke pass rate | 100% | < 100% |
| Full regression pass rate | > 99% | < 98% |
| Smoke execution time | < {smoke_time_budget} | > 80% of budget |
| Full regression execution time | < {execution_time_budget} | > 80% of budget |
| Quarantine queue size | < 5 tests | > 10 tests |
| Quarantine age (oldest) | < 2 sprints | > 1 month |
| Test-to-feature coverage | > 90% of features | < 80% |
| Flakiness rate (7-day) | < 1% | > 2% |
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-reg
current_step: step-04-maintenance-plan
status: complete
next_step: step-05-validate-and-summary
timestamp: {current_timestamp}
```

Write plan to `{test_artifacts}/reg-maintenance-plan.md`.

## SUCCESS METRICS

- [ ] Review cadence defined with specific activities per cycle
- [ ] Test ownership mapped to teams/individuals
- [ ] Flaky test process documented end-to-end
- [ ] Test lifecycle (add, promote, demote, retire) defined
- [ ] Health metrics and alert thresholds specified
- [ ] Maintenance plan written to output file

## FAILURE METRICS

- Cannot determine team structure for ownership --> Use placeholder ownership, ask user to fill in
- No CI system for metrics tracking --> Document manual tracking process
