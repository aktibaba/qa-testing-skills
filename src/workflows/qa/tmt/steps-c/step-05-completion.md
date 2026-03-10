---
name: 'tmt-completion'
description: 'Session summary, next steps, and learning resources'
nextStepFile: ''
outputFile: '{test_artifacts}/tmt-session-log.md'
---

# Step 5 — Session Completion

## STEP GOAL

Wrap up the current session, provide a comprehensive summary of progress, recommend next steps, and offer additional learning resources.

## MANDATORY EXECUTION RULES

1. You MUST summarize what was learned in this session.
2. You MUST show overall progress across all completed sessions.
3. You MUST recommend the next session or learning action.
4. You MUST provide relevant external resources for further study.
5. You MUST update the session log with completion data.

## CONTEXT BOUNDARIES

- READ: `{test_artifacts}/tmt-session-{session_number}.md`, `{test_artifacts}/tmt-session-log.md`, `{test_artifacts}/tmt-curriculum.md`
- WRITE: `{test_artifacts}/tmt-session-log.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Session Summary

Present a concise summary:

```
=== Session Complete ===

Session {N}: {title}
Score: {X}/10
Time: {duration}

Key Takeaway: {one sentence}

Concepts Mastered:
  [x] {concept_1}
  [x] {concept_2}

Needs Review:
  [ ] {concept_3} — revisit in next session warm-up
```

### 2. Overall Progress

Show cumulative progress:

```
=== Learning Progress ===

Track: {track_name}
Completed: {N}/{total} sessions ({percentage}%)

Session History:
  [x] Session 1: Why We Test — 8/10
  [x] Session 2: Your First Test — 9/10
  [x] Session 3: Test Structure — 7/10  <-- current
  [ ] Session 4: Assertions Mastery
  [ ] Session 5: Test Naming
  [ ] Session 6: Introduction to Mocking

Overall Average: {average_score}/10
Strongest Area: {area}
Area for Growth: {area}
```

### 3. Recommend Next Steps

Based on the session score and overall progress:

**If score >= 8/10:**
"Great session! You have a solid grasp of {topic}. Next up: Session {N+1} — {title}, which builds on what you learned today."

**If score 6-7/10:**
"Good progress! You understand the basics of {topic}. I recommend one practice exercise before moving on: {specific exercise}. When you are ready, Session {N+1} covers {title}."

**If score < 6/10:**
"This is a foundational topic, so it is worth spending more time on it. Try these practice exercises: {list}. When you feel more comfortable, we can revisit this session or move on to Session {N+1}."

### 4. Practice Suggestions

Provide 2-3 specific practice activities:

1. **Apply to your codebase:** "Find a function in your project that is not tested and write a test using the {pattern} we learned today."
2. **Extend the exercise:** "Take the exercise from today and add tests for edge cases: empty input, very large input, and invalid input."
3. **Read and review:** "Look at an existing test in your project and evaluate whether it follows the {pattern}. How would you improve it?"

### 5. Learning Resources

Recommend resources relevant to the session topic:

```markdown
## Further Reading
- [{Framework} Testing Documentation]({url}) — Official docs for {framework} testing
- [Testing Best Practices]({url}) — Community guide to testing patterns
- [Knowledge Fragment: {name}] — Review the qa-index fragment for deeper reference

## Recommended Practice
- Write 3 more tests using today's pattern
- Review and improve 1 existing test in your codebase
- Try the challenge exercise (if not completed during the session)
```

### 6. Update Session Log

Append to `{test_artifacts}/tmt-session-log.md`:
```markdown
---
## Session {N}: {title}
- Date: {timestamp}
- Score: {X}/10
- Status: complete
- Concepts mastered: [{list}]
- Concepts for review: [{list}]
- Practice assigned: [{list}]
- Next recommended: Session {N+1}: {title}
```

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-tmt
current_step: step-05-completion
status: complete
next_step: none
timestamp: {current_timestamp}
sessions_completed: {total_completed}
overall_average: {score}/10
next_session: {N+1}
```

## SUCCESS METRICS

- [ ] Session summary presented with score and takeaway
- [ ] Overall progress displayed
- [ ] Next steps recommended based on performance
- [ ] Practice suggestions provided
- [ ] Resources shared
- [ ] Session log updated

## FAILURE METRICS

- No session data to summarize --> Redirect to step-04-teach-session
- All sessions complete --> Congratulate learner, suggest next track or knowledge check
