---
name: 'tmt-curriculum'
description: 'Generate personalized curriculum based on level and stack'
nextStepFile: 'steps-c/step-03-session-menu.md'
outputFile: '{test_artifacts}/tmt-curriculum.md'
---

# Step 2 — Generate Curriculum

## STEP GOAL

Generate a personalized learning curriculum based on the assessment results, the learner's technology stack, and their stated goals.

## MANDATORY EXECUTION RULES

1. You MUST base the curriculum on the assessment from step-01.
2. You MUST order topics with prerequisites before advanced topics.
3. You MUST use the learner's technology stack for all planned examples.
4. You MUST keep each session within the time budget (`{session_duration}`).
5. You MUST consult qa-index.csv for knowledge fragments to include in each session.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/tmt-assessment.md`, qa-index.csv, knowledge fragments
- WRITE: `{test_artifacts}/tmt-curriculum.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Select Track and Starting Point

Based on the assessment:

**Beginner --> Track 1: Testing Fundamentals**
```
Session 1: Why We Test — The cost of bugs, testing pyramid, ROI of testing
Session 2: Your First Test — Setup framework, write and run a test, understand output
Session 3: Test Structure — AAA pattern, describe/it blocks, setup/teardown
Session 4: Assertions Mastery — Equality, truthiness, exceptions, custom matchers
Session 5: Test Naming — Descriptive names, conventions, organizing test files
Session 6: Introduction to Mocking — Why mock, simple mocks, when not to mock
```

**Intermediate --> Track 2: Test Design Patterns**
```
Session 1: Test Isolation Deep Dive — Shared state problems, fixture scoping, cleanup
Session 2: Mocking Strategies — Mocks vs stubs vs spies, mocking boundaries, overtesting
Session 3: Test Data Management — Factories, builders, fixtures, fake data generation
Session 4: Testing Async Code — Promises, callbacks, timers, retries, race conditions
Session 5: Error Path Testing — Boundary values, edge cases, negative tests, error assertions
```

**Intermediate --> Track 3: Test Infrastructure**
```
Session 1: Docker Test Environments — Why containers, Compose for testing, health checks
Session 2: CI/CD for Testing — Pipeline design, stage ordering, caching, artifacts
Session 3: Test Reporting — JUnit XML, HTML reports, coverage visualization, PR comments
Session 4: Parallel Execution — Sharding strategies, worker isolation, shared resources
```

**Advanced --> Track 4: Specialized Testing**
```
Session 1: API Testing Patterns — REST validation, schema testing, auth flows
Session 2: Performance Testing — Load testing with k6, baseline metrics, regression detection
Session 3: Security Testing — OWASP Top 10, SAST/DAST, injection testing
Session 4: Contract Testing — Consumer-driven contracts, Pact, provider verification
Session 5: Visual Regression — Screenshot comparison, viewport testing, threshold tuning
Session 6: Accessibility Testing — WCAG criteria, axe integration, screen reader testing
```

**Advanced --> Track 5: Strategy and Leadership**
```
Session 1: Risk-Based Testing — Risk matrices, prioritization, coverage strategy
Session 2: Regression Suite Design — Smoke/sanity/full tiers, maintenance cadence
Session 3: Quality Gates — Coverage thresholds, release readiness, metrics that matter
Session 4: Testing Culture — Team practices, definition of done, review processes
Session 5: Metrics and Reporting — What to measure, dashboards, trend analysis
```

### 2. Map Knowledge Fragments

For each session, identify the qa-index.csv fragments to load:

```markdown
Session 1 (Test Isolation):
  - Knowledge: test-isolation (07), mock-stub-spy (34)
  - Exercises: Refactor a test with shared state to use proper isolation

Session 2 (Mocking Strategies):
  - Knowledge: mock-stub-spy (34), api-testing-fundamentals (03)
  - Exercises: Replace a real API call with a mock, compare stub vs spy
```

### 3. Customize for Stack

Adapt all examples to the learner's stack:
- **Node.js/TypeScript:** Use Jest/Vitest syntax, Express/Fastify examples
- **Python:** Use pytest syntax, Django/Flask examples
- **Java:** Use JUnit 5 syntax, Spring Boot examples
- **Go:** Use testing package, stdlib examples
- **Ruby:** Use RSpec syntax, Rails examples

### 4. Generate Curriculum Document

```markdown
# Personalized Testing Curriculum

## Learner Profile
- Level: {level}
- Stack: {stack}
- Track: {track_name}
- Sessions: {count}
- Estimated completion: {weeks} weeks at {session_duration}/session

## Session Plan

### Session 1: {title}
- **Objective:** {one sentence}
- **Knowledge:** {fragment IDs}
- **Key concepts:** {list}
- **Exercise:** {brief description}
- **Prerequisite:** None

### Session 2: {title}
- **Objective:** {one sentence}
- **Knowledge:** {fragment IDs}
- **Key concepts:** {list}
- **Exercise:** {brief description}
- **Prerequisite:** Session 1

(continue for all sessions)

## Progress Milestones
- After Session 2: Can write basic tests independently
- After Session 4: Can design test suites for new features
- After completion: {track-specific milestone}
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-tmt
current_step: step-02-curriculum
status: complete
next_step: step-03-session-menu
timestamp: {current_timestamp}
track: {track_number}
total_sessions: {count}
```

Write curriculum to `{test_artifacts}/tmt-curriculum.md`.

## SUCCESS METRICS

- [ ] Track selected based on assessment
- [ ] Sessions ordered with prerequisites respected
- [ ] Knowledge fragments mapped to each session
- [ ] Examples customized for learner's stack
- [ ] Curriculum document generated

## FAILURE METRICS

- Assessment data missing --> Re-run step-01-assess-level
- Learner's stack not supported in examples --> Use pseudocode with stack-agnostic patterns
