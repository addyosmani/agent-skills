# DELEGATION-RULE.md — Native delegation + post-edit audit

> The plugin reinforces Claude's native delegation judgment rather than replacing it. This document defines the contract.

## The model (v2.7+)

**Goal**: The main agent uses Claude's native delegation judgment to decide when to delegate vs edit directly. The plugin reinforces this by:

1. Providing high-quality subagents (`implementer`, `implementer-haiku`, `code-reviewer`, `test-engineer`, `security-auditor`) so when Claude DECIDES to delegate, the destination is well-defined.
2. Running the audit chain post-edit on any staged diff (regardless of whether main or subagent produced it).
3. Hard-blocking only kill-switch paths and secrets.

**What Claude's native judgment looks like** (from Anthropic's docs):

- Direct edit when: ≤ ~20 lines, single file, file already in context, debugging existing behavior, exploratory iteration.
- Delegate (Task) when: spans multiple files, deep research/exploration (Explore subagent), parallel work, task matches a specialist's domain (compliance, security, data engineering).
- Default to delegate when context cost is high (large file reads, multi-step analysis) — round-trip is cheaper than polluting the main's window.

**The plugin does NOT block direct edits.** The plugin runs the audit chain on commit / pre-merge to verify the resulting diff.

## When Claude typically delegates vs edits

Informative, not normative. This is Claude's expected behavior given its native judgment:

| Situation | Expected behavior |
|---|---|
| Implementing a new module | Delegate (implementer) |
| Adding tests for new code | Delegate (test-engineer) |
| Bug fix found via test, < 10 LOC | Edit directly (faster than round-trip) |
| Bug spans 3 files, root-cause unclear | Delegate (implementer + Explore for analysis) |
| Renaming a function across the repo | Delegate (haiku for mechanical) |
| Adjusting a single string for retest | Edit directly |
| Editing CLAUDE.md / docs / specs / ADRs | Edit directly (always) |
| Modifying `.env`, `.claude/settings.json`, `.claude/hooks/*` | Hard-blocked (kill-switch) |

## Subagent destinations (when Claude delegates)

When delegating, the main picks the model **by task complexity, not surface area**:

| Agent | Model | Role |
|---|---|---|
| `implementer` | sonnet | Generic builder. Reads spec/plan/tasks, produces code, writes build-log, hands off to audit chain. |
| `implementer-haiku` | haiku | Trivial-change executor (CSS, rename, README, config flips ≤ 3 files, no new conditional/async). |
| `agent-architect` | sonnet | Meta-agent. Creates domain specialists on demand with discovery-first. Never implements. |
| `<specialist>` | sonnet (haiku/opus by exception) | Domain expert created by `agent-architect` when a recurring pattern justifies persistence. |
| `test-engineer` | sonnet | GATE 1. Writes or runs tests, reports coverage gaps, blocks on failing tests. |
| `code-reviewer` | sonnet | GATE 2. Five-axis review (correctness, readability, architecture, security, performance). Blocks on Critical findings. |
| `security-auditor` | sonnet | GATE 3. OWASP-grounded vulnerability scan. Blocks on Critical or High findings. |
| `kb-pipeline` | sonnet | Per-commit KB orchestrator. Auto-dispatched by `hooks/post-commit-kb.sh`. Three internal phases (Capture / Curate / Write) against the commit diff; writes to the Obsidian vault. Detached background process. |
| `kb-curator` | sonnet | Batch L1→L2 journal classifier for `/kb-curate`. Seven-category triage (decision-new, decision-supersede, gotcha-new, gotcha-update, playbook, glossary, noise). Hybrid control matrix. |
| `kb-backfiller` | sonnet | Read-only legacy extractor for `/kb-backfill`. Pulls READMEs, commit messages, GitHub issues/PRs, optional code analysis. Writes only to vault `_inbox/` for later promotion. |

Model calibration:
- **Haiku** — trivial: CSS or string change, rename without signature shifts, README/CHANGELOG edit, config flip, ≤ 3 files with no new conditional or async.
- **Sonnet** (default) — anything with control flow, tests, integrations, async, error handling, or refactor across modules.
- **Opus** (justified exception) — only compliance, regulation, legal, or forensic-accounting work where errors carry legal cost.

## Post-edit audit chain (mandatory on staged diff)

The audit chain runs post-edit on any staged diff, regardless of who produced it — the main agent or a subagent. The chain reads `git diff` and does not care about authorship.

```
<main edits> | implementer | implementer-haiku | <specialist> → test-engineer → code-reviewer → security-auditor
```

The chain is sequential and blocking — each gate reads the previous one's output.

### When the chain runs vs. when it does not

**The chain runs when:**

| Phase | Why the chain applies |
|---|---|
| `implementer` returns staged code changes | New or modified source needs review, tests, and security scan before merge. |
| `implementer-haiku` returns trivial changes | Even trivial changes can introduce regressions or supply-chain risk; the chain runs but auditors typically pass quickly. |
| A specialist returns staged code changes | Specialists are subject to the same gates as the generic implementer. Domain knowledge is not a license to skip review. |
| The main agent edits source directly and stages changes | The chain applies regardless of diff authorship. If `git diff --staged` is non-empty, the chain runs. |
| A docs-only slice modifies `agents/`, `skills/`, `hooks/`, or any agent/skill prompt | Agent definitions are runtime contracts — code-reviewer evaluates clarity and distinctness; security-auditor checks for prompt-injection surface. |

**The chain does NOT run when:**

| Phase | Why the chain does not apply |
|---|---|
| Exploration / research / discovery | No code is produced. Reading files, running `git log`, asking questions, browsing the codebase — there is nothing to audit. |
| Planning / spec-writing / ADR drafting | Outputs are docs. The audit chain is for code; doc reviews happen at PR time by the operator. |
| Ad-hoc database queries / data analysis | A specialist running read-only SQL or analyzing a parquet file produces a report, not a diff. No code to review. |
| Conversation with the operator | Architectural deliberation, scope negotiation, tradeoff discussion — pure dialogue, no diff. |
| Pre-flight BLOCKERs from a subagent | If the implementer or a specialist returns BLOCKER, the chain does NOT run. The main resolves the BLOCKER and re-delegates; the chain runs on the *next* return that produces a diff. |

**Rule of thumb:** if `git diff --staged --stat` and `git diff HEAD --stat` both report zero changes, the chain is not applicable.

**Runtime defense.** Each auditor (`code-reviewer`, `test-engineer`, `security-auditor`) runs a Step 0 pre-flight that checks for staged or unstaged diff. If both are empty, the auditor returns `AUDIT RESULT: NOT APPLICABLE` and stops.

### Closing rule

The main agent does NOT mark a task as complete until all applicable gates return `AUDIT RESULT: APPROVED`. A `BLOCKED` verdict reopens the cycle by re-invoking the implementer or specialist with the auditor's report attached.

### GATE 3 skip allowlist

GATE 3 (security-auditor) is default-on. The main may skip it ONLY when ALL of the following hold:

- The slice modifies only files under `docs/`, `README*`, `*.md` outside `agents/` and `skills/`
- No code, no configuration, no dependency manifest, no agent definition, no hook is touched
- No environment variable or secret reference is added or changed

If even one condition fails, GATE 3 runs.

### Anti-rationalization table

| Excuse | Reality |
|---|---|
| "The change is docs-only, audit is overkill" | Check the GATE 3 skip allowlist. If the file is `agents/*.md`, `skills/*.md`, `hooks/*`, or any code, GATE 3 still runs. |
| "Tests already ran inside the implementer, GATE 1 is redundant" | Implementer ran tests against its own implementation; `test-engineer` validates coverage gaps and intent. Different lens. Run it. |
| "This is a hotfix, no time for the full chain" | Hotfixes touching production are exactly when audit-chain skipping causes incidents. Run the chain. |
| "Security has already reviewed this pattern before" | Reviewed the pattern, not this slice's wiring. Run GATE 3. |
| "We just had a long conversation, let's run the audit chain to be safe" | The chain has nothing to audit if no code changed. Running it produces no value and burns Sonnet tokens. |

## Hard kill-switches (plugin-enforced)

The PreToolUse hook (`hooks/delegation-guard.sh`) hard-blocks the main agent from writing to:

- `.claude/settings*.json` — prevents disabling audit triggers
- `.claude/hooks/*` — prevents disabling the hook itself
- `.claude/agents/*` — prevents overwriting agent contracts
- `.env`, `.env.*` — prevents committing secrets
- `secrets/*` — prevents committing secrets

**Everything else is allowed.** Claude's native judgment applies.

Subagents bypass the hook entirely (identified by `agent_id` in stdin JSON). Their tool scope is enforced by their own frontmatter `tools:` declarations.

See [`adr/0006-trust-native-delegation.md`](adr/0006-trust-native-delegation.md) for the decision record on the v2.7 realignment.

## What the main agent does directly

Anything and everything that its native judgment says is appropriate — including editing source files when the task is small and well-understood. In addition, always:

1. Conversation with the operator (architectural deliberation, scope negotiation, tradeoff discussion)
2. Running `/spec`, `/plan`, and the other planning skills
3. Invoking subagents via `Task` when the task warrants delegation
4. Reading audit reports and deciding whether the gate passed
5. Writing `lessons-learned.md` after the slice closes

## Enforcement

This rule is enforced by two mechanisms:

1. **PreToolUse kill-switch hook** (`hooks/delegation-guard.sh`): blocks write operations targeting secrets and plugin self-disable surfaces. Everything else passes.
2. **Audit chain post-edit**: when staged diff exists, the main invokes `test-engineer → code-reviewer → security-auditor` before closing a task. This is the quality and security gate regardless of who produced the diff.

**Plan-mode persistence:** After exiting plan mode, run `/save-plan <slug>` to copy the plan project-local. ADR-0005 documents why this is operator-invoked rather than runtime-automatic.

See [DELEGATION-RULE-SPECIALISTS.md](DELEGATION-RULE-SPECIALISTS.md) for the dynamic specialist creation flow.
