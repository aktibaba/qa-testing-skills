---
name: 'tmt-continue'
description: 'Continue from a previous learning session'
nextStepFile: 'steps-c/step-03-session-menu.md'
outputFile: '{test_artifacts}/tmt-continue-summary.md'
---

# Step 1b — Continue Previous Session

## STEP GOAL

Resume the learning journey from where the learner left off, presenting their progress and directing them to the session menu to choose their next topic.

## MANDATORY EXECUTION RULES

1. You MUST read the session log to determine progress.
2. You MUST read the curriculum to identify remaining sessions.
3. You MUST present a progress summary before offering the menu.
4. You MUST check for concepts flagged for review and incorporate them.
5. You MUST welcome the learner back warmly.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/tmt-session-log.md`, `{test_artifacts}/tmt-curriculum.md`, `{test_artifacts}/tmt-assessment.md`
- WRITE: `{test_artifacts}/tmt-continue-summary.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Session History

Read `{test_artifacts}/tmt-session-log.md` and parse:
- Total sessions completed
- Last session date, topic, and score
- Concepts mastered vs. concepts flagged for review
- Overall average score

### 2. Welcome Back

Greet the learner with context:
```
Welcome back! Here is where you left off:

Last session: Session {N} — {title} ({date})
Score: {X}/10
Sessions completed: {N}/{total}

Concepts to review from last time:
- {concept} — we will do a quick warm-up on this
```

### 3. Check for Practice Completion

If practice was assigned in the previous session:
- Ask if the learner completed the practice exercises
- If yes, briefly discuss what they learned
- If no, that is fine — offer to incorporate the practice into the next session

### 4. Prepare Review Items

Gather concepts flagged for review across all sessions:
- Create warm-up questions for the most recent flagged concepts
- Note any recurring weak areas that may need extra attention
- Adjust the recommended next session if a prerequisite concept is weak

### 5. Proceed to Menu

Direct to `steps-c/step-03-session-menu.md` to let the learner choose their next session.

Write summary to `{test_artifacts}/tmt-continue-summary.md`:
```markdown
# Continue Summary
- Sessions completed: {N}/{total}
- Last session: {title} on {date}
- Overall average: {X}/10
- Concepts for review: [{list}]
- Recommended next: Session {N+1}: {title}
- Continued at: {timestamp}
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-tmt
current_step: step-01b-continue
status: complete
next_step: step-03-session-menu
timestamp: {current_timestamp}
sessions_completed: {N}
```

## SUCCESS METRICS

- [ ] Session history loaded and parsed
- [ ] Progress summary presented to learner
- [ ] Review concepts identified
- [ ] Learner directed to session menu
- [ ] Continue summary written

## FAILURE METRICS

- No session log found --> Redirect to step-01-assess-level for new learner flow
- Session log corrupted --> Offer to restart or manually set progress
