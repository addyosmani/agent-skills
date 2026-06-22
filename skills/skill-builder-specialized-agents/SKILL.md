---
name: skill-builder-specialized-agents
description: Guides agents through creating, validating, and routing repository-native skills and specialized agents. Use when a reusable workflow needs a new skill, an existing skill needs structural validation, or Bob needs a bounded pre-dispatch contract.
---

# Skill Builder and Specialized Agents

## Overview

Create skills only when a procedure will recur, then validate the skill and any specialist dispatch before use. Bob remains the orchestrator; this skill produces source artifacts and contracts but does not install them or authorize runtime changes.

## When to Use

- A workflow will recur and general project instructions are insufficient.
- An existing skill needs maintenance or deterministic validation.
- Bob needs a specialist for a bounded build, review, audit, or authoring task.
- Do not create a skill for one-off facts, session progress, or generic advice.
- Do not use this source package to edit live Hermes configuration or dispatch directly.

## Workflow

1. Decide whether the need is procedural and likely to recur on at least five similar tasks. Keep knowledge in the wiki and task-specific state in a SPEC or handoff.
2. Write the non-trivial task SPEC first. Name the objective, scope, safety rules, exact verification, reporting, and stop conditions.
3. Preview generation with `scripts/create-skill-agent.sh`. Supply a concrete purpose, trigger, and scope. Add `--agent-name` only when a reusable specialist role is needed.
4. Review the preview. Run again with `--go` only inside the assigned source worktree.
5. Strictly validate each created `SKILL.md` and specialist definition with `scripts/validate-skill-agent.sh`.
6. Preview and create the distributable archive with `scripts/package-skill.sh`; it excludes bytecode and refuses overwrite.
7. Copy `templates/dispatch-contract.md` to a task-owned location and replace every placeholder. Validate it before handing the task to any agent.
8. Dispatch according to the contract: Cursor for builds, Pi/Codex for escalation/review/audit, and OpenCode only when Chris explicitly requests it.
9. Save the creation report. Activation or installation is a separate rollout requiring its own authority and runtime verification.

### Bob's orchestration boundary

- Bob decides whether a skill or specialist is appropriate, owns the SPEC, selects the route, and evaluates the result.
- Skill authoring creates reusable instructions and validation artifacts; it does not execute the task those instructions describe.
- Agent dispatch transfers a validated, bounded contract to a specialist; it does not grant new authority.
- Direct execution is limited to explicitly classified quick/read-only work or work already authorized by a controlling SPEC.

### Commands

Preview a new skill and specialist:

```bash
skills/skill-builder-specialized-agents/scripts/create-skill-agent.sh \
  --root /path/to/agent-skills --name example-skill \
  --purpose "validate example deployment plans" \
  --trigger "a deployment plan needs deterministic review" \
  --scope "source documentation and fixture files only" \
  --agent-name example-plan-reviewer
```

After reviewing the preview, repeat the same command with `--go`. Validate outputs:

```bash
skills/skill-builder-specialized-agents/scripts/validate-skill-agent.sh \
  --skill /path/to/agent-skills/skills/example-skill/SKILL.md
```

Validate a dispatch contract:

```bash
skills/skill-builder-specialized-agents/scripts/validate-skill-agent.sh \
  --contract /absolute/path/to/dispatch-contract.md
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| “Bob can infer the missing details.” | Inference at dispatch time is the source of scope drift; contracts must name the action, target, outcome, and boundaries. |
| “The current skill loader accepts it.” | Loader acceptance proves discoverability, not safety or procedural quality. Run the strict validator. |
| “Installing it now is part of testing.” | Source validation and runtime activation are separate risk boundaries. Activation needs separate authority. |
| “A restart is harmless.” | Restarting a live agent changes active sessions and is production-impacting on acerserver. |

## Red Flags

- The objective is “improve,” “handle,” or “fix” without a named target and outcome.
- A non-trivial task has no existing SPEC path.
- A contract contains an unapproved production-impacting instruction.
- The same text mixes Bob orchestration, authoring, dispatch, and execution responsibilities.
- A generator would overwrite an existing skill or specialist.
- Validation passes only because required sections are empty or contain placeholders.

## Verification

- [ ] Generator dry-run creates no files and prints the exact `--go` command.
- [ ] Generated skill and agent definitions pass strict validation.
- [ ] All repository skills pass compatibility validation.
- [ ] Vague, missing-SPEC, unsafe, mismatched-name, overwrite, and placeholder-SPEC fixtures fail for the intended reasons.
- [ ] Unsafe SKILL.md, specialized-agent, and AGENTS.md instructions fail validation.
- [ ] External generator roots and archive output paths fail without creating files.
- [ ] Every executable under `scripts/` is Bash with `set -e`.
- [ ] No live Hermes/Bob file or process changed.
- [ ] Creation report lists changed files, verification, remaining risks, and stop reason.
