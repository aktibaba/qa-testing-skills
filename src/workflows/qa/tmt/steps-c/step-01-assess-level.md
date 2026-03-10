---
name: 'tmt-assess-level'
description: 'Assess the learner current testing knowledge level'
nextStepFile: 'steps-c/step-02-curriculum.md'
outputFile: '{test_artifacts}/tmt-assessment.md'
---

# Step 1 — Assess Knowledge Level

## STEP GOAL

Determine the learner's current testing knowledge level through a structured assessment. This informs the curriculum generation and ensures sessions are appropriately challenging.

## MANDATORY EXECUTION RULES

1. You MUST ask the learner diagnostic questions, not just accept a self-assessment.
2. You MUST assess both theoretical knowledge and practical experience.
3. You MUST identify the learner's technology stack and preferences.
4. You MUST determine the learner's goals (why they want to learn testing).
5. You MUST produce a level determination with evidence.

## CONTEXT BOUNDARIES

- READ: Project files (to detect stack), qa-index.csv
- WRITE: `{test_artifacts}/tmt-assessment.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Detect Technology Stack

Before asking questions, scan the project (if available) to understand:
- Programming language(s) in use
- Frameworks (React, Express, Django, Spring, etc.)
- Existing test files (presence and quality)
- Existing test configuration

If no project context, ask the learner directly:
- What language/framework do you use most?
- What is your current project about?

### 2. Diagnostic Questions

Ask a series of questions that probe knowledge depth. Do not present these as a formal quiz — frame them as a friendly conversation.

**Foundational (Beginner check):**
1. "Can you describe the difference between a unit test and an integration test?"
2. "What does 'Arrange-Act-Assert' mean in testing?"
3. "Have you written automated tests before? What framework?"

**Intermediate check:**
4. "How do you handle testing functions that depend on a database or external API?"
5. "What strategies do you use to keep tests independent from each other?"
6. "How do you decide which tests to write for a new feature?"

**Advanced check:**
7. "How would you design a test strategy for a new microservice that processes payments?"
8. "What is your approach to dealing with flaky tests in CI?"
9. "How do you measure whether your test suite is effective (beyond just code coverage)?"

### 3. Evaluate Responses

Score each response on a 3-point scale:
- **0 — No knowledge:** Cannot answer or gives incorrect answer
- **1 — Basic understanding:** Knows the concept but lacks depth or practical experience
- **2 — Strong understanding:** Gives detailed, experienced answer with examples

Level determination:
- **Beginner** (0-5 points): Needs foundational concepts
- **Intermediate** (6-11 points): Knows basics, ready for patterns and design
- **Advanced** (12-18 points): Ready for strategy, architecture, and specialized topics

### 4. Identify Learning Goals

Ask the learner:
- "What is your primary goal? (Write first tests / Improve test quality / Build test infrastructure / Learn specific testing type)"
- "Is there a specific problem you are trying to solve?"
- "How much time can you dedicate to learning sessions?"

### 5. Record Assessment

Write to `{test_artifacts}/tmt-assessment.md`:
```markdown
# Learner Assessment

## Profile
- Stack: {detected_stack}
- Framework experience: {frameworks}
- Testing experience: {none/basic/moderate/extensive}

## Assessment Results
- Foundational score: {X}/6
- Intermediate score: {X}/6
- Advanced score: {X}/6
- Total: {X}/18
- **Level: {Beginner/Intermediate/Advanced}**

## Goals
- Primary goal: {goal}
- Specific interests: {topics}
- Time availability: {session_duration}

## Recommended Track
- Track: {1-5}
- Starting session: {topic}
- Estimated sessions to complete: {N}

## Diagnostic Notes
{Observations about specific strengths and areas for growth}
```

## Save Progress

Write to `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-tmt
current_step: step-01-assess-level
status: complete
next_step: step-02-curriculum
timestamp: {current_timestamp}
learner_level: {level}
recommended_track: {track}
```

## SUCCESS METRICS

- [ ] Learner's stack identified
- [ ] Diagnostic questions asked and responses evaluated
- [ ] Level determined with evidence
- [ ] Learning goals documented
- [ ] Recommended track selected
- [ ] Assessment written to output file

## FAILURE METRICS

- Learner does not engage with questions --> Offer simpler yes/no assessment
- Cannot detect any technology stack --> Ask directly, provide common options
