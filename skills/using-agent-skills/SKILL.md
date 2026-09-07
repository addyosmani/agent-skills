---
name: using-agent-skills
description: Route work among this personal engineering skill collection. Use when choosing a workflow or resolving overlapping skill guidance; skip when the relevant skill is already clear.
---

# Using Agent Skills

Select the smallest set of skills that materially helps the requested task. A skill supplies task-specific guidance; it does not require the whole engineering lifecycle.

## Scope and precedence

- System and developer instructions and runtime permissions govern execution. Explicit user instructions and authorization take precedence over skill guidelines within those boundaries.
- Reuse the user's requirements, approved plans, and prior decisions. Do not restart an interview or approval sequence because another skill was loaded.
- Continue authorized work through completion. A review or planning skill does not grant permission to publish, send messages, or perform unrelated external actions.
- If a skill would cause a pause, first determine whether the question was already answered or the action authorized. If a real decision or permission is still missing, identify the exact instruction and explain the unresolved issue briefly.

## Choosing a workflow

| Need | Skill |
|---|---|
| Material ambiguity about the desired outcome | interview-me |
| Explore and compare possible ideas | idea-refine |
| Define a significant feature's requirements | spec-driven-development |
| Establish a missing quality bar | constraint-driven-development |
| Order dependent tasks or coordinate parallel agents | planning-and-task-breakdown |
| Implement a substantial change in verifiable slices | incremental-implementation |
| Repair missing, stale, or conflicting project context | context-engineering |
| Verify version-sensitive framework behavior | source-driven-development |
| Resolve consequential uncertainty through independent review | doubt-driven-development |
| Build UI or establish its visual direction | frontend-ui-engineering / frontend-design |
| Design public interfaces or module contracts | api-and-interface-design |
| Write meaningful behavior or regression tests | test-driven-development |
| Verify browser behavior | browser-testing-with-devtools |
| Diagnose a reproducible failure | debugging-and-error-recovery |
| Review, simplify, harden, or profile code | code-review-and-quality / code-simplification / security-and-hardening / performance-optimization |
| Organize Git changes or version a release | git-workflow-and-versioning |
| Change pipelines, documentation, or instrumentation | ci-cd-and-automation / documentation-and-adrs / observability-and-instrumentation |
| Retire a system or launch a release | deprecation-and-migration / shipping-and-launch |

These are routing choices, not mandatory stages. Read only the selected skill and the supporting references needed for the task. Skip an unavailable skill and use available evidence and tools; disclose a capability gap only when it affects the result.

## Handling uncertainty

Inspect the repository, configuration, existing conventions, and earlier conversation before asking for information. Resolve routine implementation choices within the authorized scope. State assumptions when they affect the outcome; no fixed narration template is required.

Ask a focused question when ambiguity materially affects the product, compatibility, data exposure, cost, or an irreversible action. Pause only the dependent work and continue useful independent tasks. Silence is not approval. Ordinary confirmation and explicit delegation of judgment are sufficient within their stated scope.

## Scope and completion

Make changes needed for the requested outcome. Avoid adjacent cleanup and speculative features. Prefer clear code and existing project conventions over new abstractions.

Completion requires evidence appropriate to the change: acceptance criteria met, relevant checks and required project gates passed, and material limitations reported. Run meaningful regression tests and runtime checks where they establish behavior. Update documentation when the change makes it inaccurate or the project requires it. Do not require a new test, full suite, runtime launch, or documentation edit for every change. After checks pass, expand or repeat them only for new changes, failures, required gates, or unresolved risk.

Report the outcome, useful verification evidence, and remaining limitations concisely. Do not force assumption blocks, confidence percentages, or lists of untouched files.

## Maintenance basis

These workflow defaults follow the [official GPT-6 Astra guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices), checked 2026-09-07. Keep concrete project constraints; adjust generic workflow rules when evidence shows unnecessary pauses, duplicated work, or missing verification.
