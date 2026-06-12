---
name: harness-engineering
description: Guides agents through building durable repository harnesses: project rules, constraints, feedback loops, memory, evaluation, and governance. Use when adopting agent instructions, reducing repeated agent mistakes, adding drift checks, or turning project-specific failures into enforceable guardrails.
---

# Harness Engineering

## Overview

Harness engineering turns a repository into a safer operating environment for coding agents. Instead of relying on one-off prompts, capture durable rules, checks, memory, and review loops inside the project so future agents can follow them.

A harness is not a template to stamp onto every codebase. The target repository is the source of truth; preserve its architecture, package manager, commands, docs, tests, and conventions.

## When to Use

- A project needs persistent agent instructions such as `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, or `.github/copilot-instructions.md`
- Agents repeatedly make the same wrong edit, skip the same check, or ignore the same project convention
- You need to add lightweight drift checks, lint rules, tests, CI gates, or manual review points for agent-facing rules
- A runtime failure, data-loss path, security issue, permission bug, failed CI run, or cross-environment mismatch should not recur
- You are adopting an agent workflow into an existing repository and need to keep the adoption project-specific

Do not use this skill for generic prompt writing, wholesale rewrites of project architecture, or copying starter-kit files without first inspecting the target repository.

## Core Process

### 1. Inspect Before Prescribing

Read the target repository before adding rules:

- project overview: `README.md`, package manifests, build files, and existing setup docs
- agent guidance: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, Copilot instructions, or equivalent files
- verification: scripts, tests, linters, CI workflows, pre-commit hooks, and documented local commands
- knowledge store: decisions, architecture docs, runbooks, failures, troubleshooting notes, or postmortems
- conventions: naming, folder structure, dependency policy, test style, review expectations, and release process

If existing guidance already covers the need, update it in place instead of creating a parallel document. Use the `context-engineering` skill for broader context loading and session setup.

### 2. Map the Harness

Identify which harness component is missing or weak:

| Component | Purpose | Typical durable artifact |
|---|---|---|
| Instructions | Tell agents how to operate in this repo | `AGENTS.md`, `CLAUDE.md`, tool-specific rules |
| Constraints | Block invalid changes | lint rules, type checks, import boundaries, dependency policy |
| Feedback | Show mistakes quickly | tests, smoke checks, CI, pre-commit, examples |
| Memory | Preserve why and what not to repeat | ADRs, failure notes, troubleshooting docs |
| Evaluation | Measure whether the harness helps | task outcome logs, adoption reports, review summaries |
| Governance | Keep guidance current | drift checks, refresh workflow, ownership notes |

Only add the component that solves the observed problem. A small targeted check is better than a large unread rules file.

### 3. Make the Smallest Durable Change

Choose the least invasive artifact that changes future agent behavior:

- Add a specific rule to the existing agent instruction file when the issue is behavioral.
- Add or extend a test, lint rule, type check, script, or CI gate when the rule can be enforced automatically.
- Add a decision record when future agents need to know why an approach was chosen or rejected. Use the `documentation-and-adrs` skill for ADR structure.
- Add a failure note when a bug path should not recur, and name the check or manual review point that detects it.
- Add an adoption or refresh report when changing the harness itself, so reviewers can see assumptions, files changed, checks run, and remaining risks.

Avoid broad scaffolding. Do not overwrite project files, replace the package manager, add duplicate docs, or introduce a new toolchain unless the repository already supports it or the change is explicitly justified.

### 4. Convert Failures Into Memory and Checks

When fixing a high-risk or user-visible failure, record enough memory for a future agent to avoid repeating it:

```markdown
# Failure: Agents skipped the tenant permission check

## Trigger
Editing account export endpoints without reading the tenant authorization helper.

## Impact
Cross-tenant data could be exported by an authenticated user.

## Guardrail
`tests/security/account-export-permissions.test.ts` covers cross-tenant export denial.

## Review Note
Any export endpoint change must name the authorization helper used.
```

If no automated check is practical, say why and name the manual review point. Do not create failure memory for transient infrastructure noise that has no reusable lesson.

### 5. Wire Cheap Drift Checks

Drift checks keep harness files honest. Prefer deterministic checks that run locally and in CI:

- A script that verifies documented commands still exist in package scripts or Make targets
- A test that ensures agent rules mention required verification commands
- A markdown check that prevents decision or failure notes from missing required sections
- A CI job that runs the harness check alongside normal tests

Keep checks narrow. A drift script should fail on real mismatches, not become a brittle style linter for every sentence.

### 6. Report the Adoption

For non-trivial harness work, finish with a concise report:

- files changed and why each one was needed
- checks run, with exact commands and results
- assumptions made about the target repository
- manual review points or follow-up work
- failure memory added or why it was skipped
- how effectiveness will be measured, if the work claims to reduce repeated mistakes

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "A strong prompt is enough." | Prompts vanish after the session. Repository artifacts survive across agents, tools, and time. |
| "I'll copy the full template so we have everything." | Unused rules drift quickly. Add the smallest artifact that matches this repository's actual failure mode. |
| "This is just documentation, so no check is needed." | Important rules should be enforced where practical. If automation is not practical, document the manual review point. |
| "The agent already knows common best practices." | The agent does not know this project's implicit decisions unless the repository records them. |
| "The failure is fixed, so we can skip memory." | Without a regression check or failure note, future agents can repeat the same path with confidence. |

## Red Flags

- Adding a new agent rules file while an equivalent project-specific file already exists
- Copying generic commands, package manager assumptions, folder names, or CI jobs that do not match the repository
- Recording broad advice such as "write good tests" instead of project-specific instructions and evidence
- Adding failure notes that do not name a regression test, smoke check, lint rule, CI gate, or manual review point
- Introducing checks that require services, secrets, or long runtimes without a local fast path
- Treating a harness score or checklist as proof that agents now make fewer mistakes

## Verification

After applying this skill, confirm:

- [ ] Existing repository structure, commands, docs, and verification tools were inspected before edits
- [ ] Every new harness artifact maps to a specific observed gap, risk, or repeated mistake
- [ ] Existing docs or rules were updated instead of duplicated where practical
- [ ] Enforceable rules have tests, lint, scripts, CI, or a named manual review point
- [ ] High-risk fixed failures have durable memory, or the report explains why memory was skipped
- [ ] The final report lists changed files, checks run, assumptions, remaining risks, and follow-up work
