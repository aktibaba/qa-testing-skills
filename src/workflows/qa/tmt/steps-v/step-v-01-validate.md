---
name: 'tmt-validate-progress'
description: 'Validate learning progress and knowledge retention'
nextStepFile: ''
outputFile: '{test_artifacts}/tmt-validation-result.md'
---

# Validate Step 1 — Knowledge Validation

## STEP GOAL

Assess the learner's knowledge retention and practical ability through a structured validation exercise. This goes beyond session scores to test whether the learner can apply concepts independently.

## MANDATORY EXECUTION RULES

1. You MUST base the validation on concepts from completed sessions.
2. You MUST include both recall questions and practical exercises.
3. You MUST adapt difficulty to the learner's track and progress.
4. You MUST provide detailed feedback on each answer.
5. You MUST produce a progress report with strengths and areas for growth.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/tmt-session-log.md`, `{test_artifacts}/tmt-curriculum.md`, `{test_artifacts}/tmt-assessment.md`, knowledge fragments
- WRITE: `{test_artifacts}/tmt-validation-result.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Determine Validation Scope

Read the session log to determine which concepts to test:
- Include all concepts marked as "mastered" in completed sessions
- Include concepts flagged for "review" (these are especially important to re-test)
- Weight recent sessions more heavily

### 2. Recall Questions (5 questions)

Ask questions that test conceptual understanding:

**Format:** Multiple choice or short answer, covering key concepts from completed sessions.

Example questions (adapt to completed content):
1. "What is the purpose of the 'Arrange' phase in the AAA pattern?"
2. "Why should tests not share mutable state?"
3. "When is it appropriate to use a mock vs. a real implementation?"
4. "What makes a test 'flaky' and why is it problematic?"
5. "How would you decide which tests belong in a smoke suite?"

### 3. Practical Exercise (1-2 exercises)

Present a coding challenge that requires applying multiple concepts:

**Beginner validation:**
"Here is a function. Write two tests: one for the happy path and one for an error case. Use proper naming and the AAA pattern."

**Intermediate validation:**
"Here is a test that has three problems (shared state, missing assertion, poor naming). Identify and fix all three."

**Advanced validation:**
"Design a test strategy for this feature. Define what tests you would write, how you would organize them, and what you would mock."

### 4. Score and Evaluate

Score each component:

**Recall:** {X}/5 (1 point per correct answer)

**Practical:** {X}/10
- Correctness: Does it work? (4 points)
- Best practices: Does it follow patterns learned? (3 points)
- Completeness: Are edge cases considered? (3 points)

**Overall validation score:** {X}/15

**Level determination:**
- 13-15: Ready to advance to next track
- 10-12: Solid understanding, continue current track
- 7-9: Some gaps, recommend reviewing specific sessions
- Below 7: Recommend revisiting foundational sessions

### 5. Detailed Feedback

For each question and exercise:
- What the learner got right (reinforce correct understanding)
- What needs improvement (with specific references to session material)
- Recommended review sessions for weak areas

### 6. Generate Progress Report

```markdown
# Knowledge Validation Report

## Learner: {name/level}
## Date: {timestamp}
## Track: {track_name}
## Sessions Completed: {N}/{total}

## Recall Score: {X}/5
- [PASS] AAA Pattern understanding
- [PASS] Test isolation principles
- [FAIL] Mock vs stub distinction — Review Session 2
- ...

## Practical Score: {X}/10
- Correctness: {X}/4
- Best Practices: {X}/3
- Completeness: {X}/3

## Overall: {X}/15 — {level_determination}

## Strengths
- {strength_1}
- {strength_2}

## Areas for Growth
- {area_1} — Recommend reviewing Session {N}
- {area_2} — Recommend extra practice with {topic}

## Recommendation
{Next steps based on score}
```

## Save Progress

Write to `{test_artifacts}/tmt-validation-result.md`.

Update `{test_artifacts}/tmt-session-log.md` (append):
```
validation: {date}
recall_score: {X}/5
practical_score: {X}/10
overall: {X}/15
recommendation: {next_steps}
```

## SUCCESS METRICS

- [ ] Validation scope determined from session history
- [ ] Recall questions asked and scored
- [ ] Practical exercise presented and evaluated
- [ ] Detailed feedback provided for each component
- [ ] Progress report generated with recommendations
- [ ] Results written to output file

## FAILURE METRICS

- No completed sessions to validate --> Redirect to step-01-assess-level
- Learner declines the validation --> Offer a lighter "quick check" with 3 questions
