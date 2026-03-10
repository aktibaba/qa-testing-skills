---
name: 'qa-tmt'
description: 'Teach Me Testing Workflow — Entry point with learning track menu'
---

# Teach Me Testing

Welcome to **Teach Me Testing** — your progressive QA education companion. This workflow provides interactive, hands-on learning sessions tailored to your experience level and technology stack.

## LEARNING TRACK MENU

Choose a learning track to begin or continue your QA education journey.

### Track 1: Testing Fundamentals
**For:** Beginners who are new to automated testing
**Topics:** Why we test, test types (unit/integration/e2e), first test, assertions, test structure (AAA pattern), test naming
**Sessions:** 5-6 sessions

### Track 2: Test Design Patterns
**For:** Developers who write tests but want to write better ones
**Topics:** Page Object Model, test factories, fixtures, mocking/stubbing, test isolation, DRY test code
**Sessions:** 4-5 sessions

### Track 3: Test Infrastructure
**For:** Developers who want to set up testing infrastructure
**Topics:** Docker test environments, CI/CD pipelines, test reporting, parallel execution, caching
**Sessions:** 4-5 sessions

### Track 4: Specialized Testing
**For:** Intermediate/advanced testers expanding their skillset
**Topics:** API testing, performance testing, security testing, visual regression, contract testing, accessibility testing
**Sessions:** 6-8 sessions (pick topics a la carte)

### Track 5: Test Strategy and Leadership
**For:** Tech leads and QA managers
**Topics:** Risk-based testing, coverage strategy, regression management, quality gates, team testing culture, metrics
**Sessions:** 4-5 sessions

---

## HOW SESSIONS WORK

1. **Assessment:** If this is your first time, we start with a brief knowledge assessment to recommend the right track and starting point.
2. **Curriculum:** A personalized curriculum is generated based on your level, stack, and goals.
3. **Interactive session:** Each session combines explanation, real-world examples in your stack, and hands-on exercises.
4. **Progress tracking:** Your progress is saved so you can continue where you left off.
5. **Validation:** Periodically, we validate your understanding with challenges.

## MODE SELECTION

### New Learner
**Trigger:** First visit, or user wants to start fresh.
**Entry:** Load `steps-c/step-01-assess-level.md`

### Continuing Learner
**Trigger:** Previous session log exists at `{test_artifacts}/tmt-session-log.md`.
**Entry:** Load `steps-c/step-01b-continue.md`

### Knowledge Check
**Trigger:** User wants to test their knowledge or validate progress.
**Entry:** Load `steps-v/step-v-01-validate.md`

## MODE DETECTION RULES

1. Check for `{test_artifacts}/tmt-session-log.md`. If it exists, suggest **Continue**.
2. If no session log exists, start with **New Learner** flow.
3. If user explicitly asks for a knowledge check or quiz, enter **Knowledge Check**.

Proceed to the appropriate entry point now.
