---
contract_version: 1
task_id: replace-with-kebab-task-id
orchestrator: bob
execution_role: agent-dispatch
agent: cursor
task_class: build
risk: medium
workspace: /absolute/path/to/assigned/worktree
spec: /absolute/path/to/non-placeholder-spec.md
oc_explicitly_requested: false
---

# Specialized Agent Dispatch Contract

## Objective

Replace this paragraph with a bounded action, named target, and observable outcome of at least eight words.

## Scope

Replace this paragraph with concrete files, components, boundaries, and explicit non-goals.

## Expected Outputs

- List every required source, test, documentation, or report artifact.

## Verification Commands

- List exact commands with their expected pass criteria.

## Safety Restrictions

- Do not restart services, deploy, kill tmux sessions, or modify live runtime configuration.
- Do not expand authority beyond the controlling SPEC.

## Stop Conditions

- Stop on missing authority, scope conflict, dirty protected state, or a repeatedly failing gate.

## Creation Report

- Files changed: list paths or `none`.
- Verification: list each command and PASS/FAIL.
- Remaining risks: list known limitations or `none`.
- Stop reason: task complete or the exact blocking gate.
