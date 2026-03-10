---
name: 'ci-validate-and-summary'
description: 'Validate pipeline configuration and produce final summary'
nextStepFile: ''
outputFile: '{test_artifacts}/ci-pipeline-summary.md'
---

# Step 4 — Validate and Summarize

## STEP GOAL

Validate the generated pipeline configuration for correctness, completeness, and best practices. Produce a comprehensive summary document explaining every stage, gate, and configuration decision.

## MANDATORY EXECUTION RULES

1. You MUST validate the pipeline config syntax (YAML validity, correct indentation).
2. You MUST verify all stages reference valid commands and artifacts.
3. You MUST check the pipeline against `checklist.md` items.
4. You MUST produce a human-readable summary of the pipeline.
5. You MUST include next steps for the user to activate the pipeline.

## CONTEXT BOUNDARIES

- READ: Generated CI config file, `{test_artifacts}/ci-preflight.md`, `{test_artifacts}/ci-quality-gates.md`, `checklist.md`
- WRITE: `{test_artifacts}/ci-pipeline-summary.md`
- EXECUTE: None

## MANDATORY SEQUENCE

### 1. Syntax Validation

Verify the generated CI config:
- YAML is valid and properly indented
- All referenced files and paths exist or are documented as prerequisites
- All environment variable references are valid
- Action/image versions are pinned (no `latest`, no `master`)
- No deprecated syntax for the target platform

### 2. Checklist Validation

Score the generated pipeline against `checklist.md`:
- Run through each checklist dimension
- Confirm all applicable items are addressed
- Note any intentionally skipped items with justification

### 3. Pipeline Flow Summary

Create a visual representation of the pipeline flow:

```
Preflight --> Static Analysis --> Unit Tests --> Build
                                                  |
                                    Integration Tests --> E2E Tests
                                                              |
                                                    Quality Gates --> Artifacts --> Notify
```

### 4. Stage Documentation

For each stage, document:
- **Purpose:** What this stage does
- **Commands:** The commands it runs
- **Duration estimate:** Expected execution time
- **Artifacts:** What it produces
- **Dependencies:** What must complete first
- **Failure behavior:** What happens if this stage fails

### 5. Configuration Reference

Document all configurable values:
- Coverage threshold and how to change it
- Cache paths and keys
- Parallelism settings
- Timeout values
- Secret names and where to set them

### 6. Activation Instructions

Provide step-by-step instructions:
1. Review the generated config file
2. Set required secrets in the CI platform
3. Configure branch protection rules
4. Push the config file to trigger the first run
5. Verify all stages pass on a test branch
6. Enable branch protection to require the pipeline

### 7. Optimization Recommendations

Suggest future improvements:
- Test sharding for faster execution
- Scheduled runs for nightly full suites
- Deployment stages (staging, production)
- Rollback triggers based on post-deploy tests
- Cache warming strategies

## Save Progress

Update `{test_artifacts}/workflow-progress.md`:
```
workflow: qa-ci
current_step: step-04-validate-and-summary
status: complete
next_step: none
timestamp: {current_timestamp}
config_file: {path_to_ci_config}
checklist_score: {score}/5
```

Write summary to `{test_artifacts}/ci-pipeline-summary.md`.

## SUCCESS METRICS

- [ ] Pipeline config validated for syntax correctness
- [ ] Checklist validation completed with score
- [ ] Pipeline flow documented with stage descriptions
- [ ] Activation instructions provided
- [ ] Summary written to output file
- [ ] Progress marked as complete

## FAILURE METRICS

- Pipeline config has syntax errors --> Fix errors before finalizing
- Checklist score below 3/5 --> Iterate on pipeline config to address gaps
