---
name: 'tmt-teach-session'
description: 'Interactive teaching session with explanations and exercises'
nextStepFile: 'steps-c/step-05-completion.md'
outputFile: '{test_artifacts}/tmt-session-{session_number}.md'
---

# Step 4 — Teaching Session

## STEP GOAL

Deliver an interactive teaching session following the structured format defined in `instructions.md`. The session combines concept explanation, guided examples in the learner's stack, hands-on exercises, and review.

## MANDATORY EXECUTION RULES

1. You MUST follow the session structure: warm-up, concept, example, exercise, review, summary.
2. You MUST use the learner's technology stack for all code examples.
3. You MUST include at least one hands-on exercise.
4. You MUST provide complete, runnable code examples (not pseudocode).
5. You MUST adapt difficulty to the learner's level.
6. You MUST stay within the time budget (`{session_duration}`).
7. You MUST load and use the relevant knowledge fragments.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/tmt-session-choice.md`, `{test_artifacts}/tmt-curriculum.md`, `{test_artifacts}/tmt-assessment.md`, knowledge fragments, learner's project files (if available)
- WRITE: `{test_artifacts}/tmt-session-{session_number}.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Warm-Up (2 minutes)

If this is not the first session:
- Ask a recall question from the previous session's key concept
- Example: "Last session we learned about the AAA pattern. Can you name the three phases?"
- Briefly acknowledge the answer and reinforce correct understanding
- If the answer reveals a gap, note it for review

If this is the first session:
- Welcome the learner
- Set expectations for the session format
- Preview what they will learn

### 2. Concept Introduction (5 minutes)

Present the session's core concept:

**Structure:**
1. Start with the "why" — a real-world scenario where this concept matters
   - Example: "Imagine you deploy on Friday. Your tests pass, but Monday morning users report they cannot log in. The login test was passing because it was checking the wrong thing..."
2. Define the concept in plain language
3. Show the concept in the context of the learner's stack
4. Connect to what they already know from previous sessions

**Calibrate by level:**
- Beginner: Use analogies, avoid jargon, explain every term
- Intermediate: Use precise terminology, reference patterns
- Advanced: Focus on trade-offs, edge cases, and design decisions

### 3. Guided Example (8 minutes)

Walk through a complete, real example:

**Structure:**
1. Show the "before" code (the problem or naive approach)
2. Explain what is wrong or suboptimal
3. Show the "after" code (the improved approach)
4. Explain every line of the improvement
5. Highlight the key takeaway

**Code requirements:**
- Must be in the learner's language and framework
- Must be complete and runnable (all imports, setup, etc.)
- Must include comments explaining non-obvious decisions
- Must follow the framework's idiomatic patterns

Example format:
```
// BEFORE: This test has a problem. Can you spot it?
test('should create user', async () => {
  const user = await createUser({ name: 'Test' });
  expect(user).toBeTruthy(); // Too vague!
});

// AFTER: Specific assertions that actually verify behavior
test('should create user with correct properties', async () => {
  const user = await createUser({ name: 'Test', email: 'test@example.com' });
  expect(user.id).toBeDefined();
  expect(user.name).toBe('Test');
  expect(user.email).toBe('test@example.com');
  expect(user.createdAt).toBeInstanceOf(Date);
});
```

### 4. Hands-On Exercise (10 minutes)

Present an exercise for the learner to complete:

**Structure:**
1. Clear problem statement
2. Starter code (for beginners) or just requirements (for advanced)
3. Expected outcome description
4. Hints available on request (3 levels: gentle nudge, specific hint, near-solution)

**Exercise types by level:**
- Beginner: Complete the missing assertion, fix the broken test, write a test for a given function
- Intermediate: Refactor a test to use proper isolation, mock an external dependency, handle an async edge case
- Advanced: Design a test strategy for a feature, write a custom test utility, optimize a slow test suite

**Hint system:**
```
Hint 1 (gentle): "Think about what happens when the input is empty."
Hint 2 (specific): "You need to handle the case where the array has zero elements."
Hint 3 (near-solution): "Add a test case like: expect(processItems([])).toEqual([]);"
```

### 5. Review and Feedback (3 minutes)

After the learner completes (or attempts) the exercise:

1. Acknowledge their effort positively
2. If correct: highlight what they did well, suggest one refinement
3. If incorrect: explain the gap without judgment, show the correct approach
4. If partially correct: celebrate what works, gently guide the rest

Score the exercise:
- 10/10: Perfect solution
- 8-9/10: Correct with minor improvements possible
- 6-7/10: Mostly correct, key concept applied but with gaps
- 4-5/10: Partial understanding, needs more practice
- 1-3/10: Concept not yet grasped, recommend revisiting

### 6. Summary and Preview (2 minutes)

Wrap up the session:
1. State the one-sentence key takeaway
2. Preview the next session's topic and why it builds on today
3. Suggest optional practice: "Try applying what we learned to another function in your codebase"
4. Save progress

## Save Progress

Write session record to `{test_artifacts}/tmt-session-{session_number}.md`:
```markdown
# Session {N}: {title}

## Date: {timestamp}
## Duration: {actual_duration}
## Level: {learner_level}

## Concepts Covered
- {concept_1}: {mastered/needs-review}
- {concept_2}: {mastered/needs-review}

## Exercise Result
- Score: {X}/10
- Completion: {full/partial/attempted}
- Notes: {specific observations}

## Recall Questions for Next Session
- Q1: {question about today's key concept}

## Key Takeaway
{one sentence summary}
```

Update `{test_artifacts}/tmt-session-log.md` (append):
```
session: {N}
title: {title}
date: {timestamp}
score: {X}/10
status: complete
concepts_mastered: [{list}]
concepts_review: [{list}]
```

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-tmt
current_step: step-04-teach-session
status: complete
next_step: step-05-completion
timestamp: {current_timestamp}
session_completed: {number}
session_score: {X}/10
```

## SUCCESS METRICS

- [ ] All six session phases delivered
- [ ] Code examples are in the learner's stack and runnable
- [ ] At least one exercise completed by the learner
- [ ] Feedback provided with specific observations
- [ ] Session record saved with progress tracking
- [ ] Session stayed within time budget

## FAILURE METRICS

- Learner disengages during session --> Pause, ask what would be more helpful, adapt
- Exercise is too hard/easy --> Adjust difficulty mid-session, note for curriculum adjustment
- Cannot provide stack-specific examples --> Use pseudocode, flag for curriculum update
