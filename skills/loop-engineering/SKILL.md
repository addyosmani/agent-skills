---
name: loop-engineering
description: Designs bounded agent loops for ambiguous or recurring engineering work. Use when a task needs repeated inspect-act-verify passes, durable state, stop rules, rollback criteria, human gates, or handoff artifacts instead of a one-shot prompt.
---

# Loop Engineering

## Overview

Loop engineering turns an open-ended agent task into a controlled system: inspect current state, take one bounded action, verify with evidence, then decide whether to continue, stop, roll back, or ask a human. Use it to prevent long-running agents from drifting, over-editing, or claiming success without proof.

## When to Use

- The user asks for broad work such as "improve this repo", "keep fixing until it works", "monitor this PR", or "make this production ready".
- The task may require more than one pass, but each pass should remain small and reviewable.
- The work needs durable state, a run log, explicit budgets, or handoff to another agent.
- A recurring workflow should run on a schedule, webhook, issue, PR, or release event.
- Verification matters more than speed.

Do not use this skill for a narrow one-step edit with a clear test and no recurrence. In that case, use the relevant build, test, or review skill directly.

## Process

### 1. Write the Loop Contract First

Before changing anything, write a compact contract:

```yaml
goal: user-visible outcome
trigger: manual | schedule | webhook | issue | pr | release
state:
  source: files, issues, PRs, logs, database, or external system to inspect
  memory: where progress and decisions will be recorded
loop:
  inspect: evidence to collect before each pass
  act: smallest allowed action for one pass
  verify: command, check, screenshot, metric, or review gate
  decide: continue | stop | rollback | ask
budgets:
  max_passes: 1-5 unless the user approved more
  max_changes: files, directories, APIs, or systems allowed to change
  max_cost: tokens, runtime, money, or external calls
human_gates:
  - decisions that require approval
stop_rules:
  - success condition
  - ambiguity condition
  - failure condition
rollback:
  - how to undo the last pass
handoff:
  - artifact to leave behind: run log, PR, issue, report, or checklist
```

If the user did not specify a field, choose the safest bounded default and label it as an assumption.

### 2. Inspect Real State

Collect current evidence before acting:

- Read relevant files, issues, PRs, logs, test output, or runtime state.
- Check the current branch and dirty state before file edits.
- For UI work, inspect the running page or a screenshot.
- Record evidence paths or links in the run log.

Never start from a generic plan when the repository or system state is available.

### 3. Take One Bounded Action

Act only inside the contract:

- Make the smallest change that can move the loop toward the goal.
- Keep unrelated cleanup, dependency upgrades, and formatting out of the pass.
- If the needed change exceeds the budget, stop and ask before continuing.
- If a specialized workflow applies, follow the `spec-driven-development`, `incremental-implementation`, `test-driven-development`, `debugging-and-error-recovery`, or `code-review-and-quality` skill for that pass.

### 4. Verify With Evidence

Verification must be observable:

- Prefer tests, builds, linters, runtime checks, screenshots, or reviewed diffs.
- Match the verification scope to the action scope.
- If no strong verifier exists, say "inspection-only" and record the residual risk.
- Do not treat a green narrow check as proof of a broad goal.

### 5. Decide Explicitly

End every pass with one decision:

- `continue`: the pass succeeded and another planned pass remains inside budget.
- `stop`: the goal is met, or further work would be speculative.
- `rollback`: the pass made the system worse or violated the contract.
- `ask`: the next step depends on product intent, credentials, access, or risk tolerance.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can just keep improving until it feels done." | Loops need explicit stop rules; otherwise the agent drifts into unrelated work. |
| "This is obvious, so I can skip the contract." | The contract is what keeps broad tasks bounded and reviewable. |
| "The build passed, so the whole goal is complete." | A build is only proof for buildability. It may not prove behavior, UX, safety, or handoff quality. |
| "I found another issue, so I should fix it now." | Capture adjacent issues separately unless they block the current loop goal. |
| "Rollback is unnecessary because the change is small." | Small changes can still make state worse. Name the undo path before acting. |

## Red Flags

- The loop has no max pass count or cost budget.
- The agent changes files outside the declared blast radius.
- The run log contains conclusions without evidence.
- Verification is described as "looks good" or "should work".
- The agent keeps discovering new scope after the original success condition is satisfied.
- Human approval is missing for irreversible, external, financial, security, or data-destructive actions.

## Verification

Before finishing, confirm:

- [ ] The loop contract exists and names goal, trigger, state, action, verifier, stop rules, and rollback.
- [ ] Every pass has evidence from current state, not memory or assumptions alone.
- [ ] The action stayed within the declared budget and blast radius.
- [ ] Verification evidence is named explicitly.
- [ ] The final decision is one of `continue`, `stop`, `rollback`, or `ask`.
- [ ] A handoff artifact exists so another agent or human can continue without reconstructing context.

## Optional Tooling

This skill works manually. If a user wants a local-first workbench for generating loop contracts, agent packets, verifier gates, and handoff reports, one public implementation is [Ariadne Loop](https://github.com/zhangzeyu99-web/ariadne-loop).
