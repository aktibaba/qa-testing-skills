---
name: 'tmt-session-menu'
description: 'Present session menu and let the learner choose a topic'
nextStepFile: 'steps-c/step-04-teach-session.md'
outputFile: '{test_artifacts}/tmt-session-choice.md'
---

# Step 3 — Session Menu

## STEP GOAL

Present the curriculum as an interactive menu, letting the learner choose which session to take next. Recommend the next session in sequence but allow jumping to any topic.

## MANDATORY EXECUTION RULES

1. You MUST present the full curriculum with progress indicators.
2. You MUST recommend the next session in sequence.
3. You MUST allow the learner to choose any available session.
4. You MUST show which sessions are completed and which are pending.
5. You MUST record the learner's choice before proceeding.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/tmt-curriculum.md`, `{test_artifacts}/tmt-session-log.md` (if exists)
- WRITE: `{test_artifacts}/tmt-session-choice.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Load Progress

Check `{test_artifacts}/tmt-session-log.md` for completed sessions:
- Parse completed session IDs and dates
- Identify the next recommended session
- Check for sessions flagged for review

### 2. Present Menu

Display the curriculum as an interactive menu:

```
=== Teach Me Testing — Session Menu ===

Track: {track_name}
Level: {level}
Progress: {completed}/{total} sessions

RECOMMENDED NEXT: Session {N} — {title}

  [x] Session 1: Why We Test
      Completed: 2024-01-15 | Score: 8/10

  [x] Session 2: Your First Test
      Completed: 2024-01-17 | Score: 9/10

  [ ] Session 3: Test Structure     <-- RECOMMENDED
      Prerequisite: Session 2 (completed)

  [ ] Session 4: Assertions Mastery
      Prerequisite: Session 3 (not yet completed)

  [ ] Session 5: Test Naming
      Prerequisite: Session 3 (not yet completed)

  [ ] Session 6: Introduction to Mocking
      Prerequisite: Session 4 (not yet completed)

Type a session number to begin, or press Enter for the recommended session.
```

### 3. Validate Choice

If the learner selects a session:
- Check that prerequisites are met (all prior sessions completed or explicitly skipped)
- If prerequisites are not met, warn the learner and ask to confirm
- Allow skipping prerequisites for advanced learners who self-assess

### 4. Prepare Session Context

Once a session is chosen:
- Load the relevant knowledge fragments from qa-index.csv
- Prepare stack-specific examples
- Load any recall questions from previous sessions
- Record the choice

### 5. Record Choice

Write to `{test_artifacts}/tmt-session-choice.md`:
```markdown
# Session Choice
- Session: {number}
- Title: {title}
- Knowledge fragments: {IDs}
- Prerequisite status: {met/skipped}
- Started: {timestamp}
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-tmt
current_step: step-03-session-menu
status: complete
next_step: step-04-teach-session
timestamp: {current_timestamp}
selected_session: {number}
```

## SUCCESS METRICS

- [ ] Curriculum displayed with progress indicators
- [ ] Next session recommended
- [ ] Learner's choice recorded
- [ ] Prerequisites validated
- [ ] Session context prepared

## FAILURE METRICS

- No curriculum found --> Re-run step-02-curriculum
- Learner wants a topic not in the curriculum --> Offer to add it as a custom session
