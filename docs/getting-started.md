# Getting Started with batuta-agent-skills

> **Read first** (in this order):
> 1. [`docs/PRD.md`](PRD.md) — vision, problem, success metrics
> 2. [`docs/SPEC.md`](SPEC.md) — architecture overview (10 layers including code-graph + supply-chain + runtime CI)
> 3. [`docs/DELEGATION-RULE.md`](DELEGATION-RULE.md) — native delegation + post-edit audit chain; kill-switch enforcement (v2.7+)
> 4. [`CLAUDE.md`](../CLAUDE.md) — conventions and session-handoff protocol
>
> For **operator recipes** (upgrade, code-graph install, retrofit, CI), see [`docs/usage/`](usage/) — brief, action-oriented guides with copy-pasteable commands.
>
> This file is the skills-and-agents quick-start that complements the architectural docs above. It is NOT the source of truth for project structure — `docs/SPEC.md` is.

`batuta-agent-skills` is a Claude Code plugin. The runtime layer (PreToolUse hook, agent delegation, audit chain) is **Claude Code-specific**. The skills, agents, and doc graph are plain Markdown and load into other tools as static context. If you are switching from Claude Code to another tool mid-feature, see [`docs/PORTABILITY.md`](PORTABILITY.md).

## How Skills Work

Each skill is a Markdown file (`SKILL.md`) that describes a specific engineering workflow. When loaded into an agent's context, the agent follows the workflow — including verification steps, anti-patterns to avoid, and exit criteria.

**Skills are not reference docs.** They're step-by-step processes the agent follows.

## Quick Start (Claude Code, the canonical surface)

### 1. Install via marketplace

```
/plugin marketplace add jota-batuta/batuta-agent-skills
/plugin install batuta-agent-skills@batuta-agent-skills
```

Or, for local development:

```bash
git clone https://github.com/jota-batuta/batuta-agent-skills.git
claude --plugin-dir /path/to/batuta-agent-skills
```

### 2. Choose a skill

Browse the `skills/` directory. Each subdirectory contains a `SKILL.md` with:
- **When to use** — triggers that indicate this skill applies
- **Process** — step-by-step workflow
- **Verification** — how to confirm the work is done
- **Common rationalizations** — excuses the agent might use to skip steps
- **Red flags** — signs the skill is being violated

### 3. Load the skill into your agent

Copy the relevant `SKILL.md` content into your agent's system prompt, rules file, or conversation. The most common approaches:

**System prompt:** Paste the skill content at the start of the session.

**Rules file:** Add skill content to your project's rules file (CLAUDE.md, .cursorrules, etc.).

**Conversation:** Reference the skill when giving instructions: "Follow the test-driven-development process for this change."

### 4. Use the meta-skill for discovery

Start with the `using-agent-skills` skill loaded. It contains a flowchart that maps task types to the appropriate skill.

## Recommended Setup

### Minimal (Start here)

Load three essential skills into your rules file:

1. **spec-driven-development** — For defining what to build
2. **test-driven-development** — For proving it works
3. **code-review-and-quality** — For verifying quality before merge

These three cover the most critical quality gaps in AI-assisted development.

### Full Lifecycle

For comprehensive coverage, load skills by phase:

```
Starting a project:  spec-driven-development → planning-and-task-breakdown
During development:  incremental-implementation + test-driven-development
Before merge:        code-review-and-quality + security-and-hardening
Before deploy:       shipping-and-launch
```

### Context-Aware Loading

Don't load all skills at once — it wastes context. Load skills relevant to the current task:

- Working on UI? Load `frontend-ui-engineering`
- Debugging? Load `debugging-and-error-recovery`
- Setting up CI? Load `ci-cd-and-automation`

## Skill Anatomy

Every skill follows the same structure:

```
YAML frontmatter (name, description)
├── Overview — What this skill does
├── When to Use — Triggers and conditions
├── Core Process — Step-by-step workflow
├── Examples — Code samples and patterns
├── Common Rationalizations — Excuses and rebuttals
├── Red Flags — Signs the skill is being violated
└── Verification — Exit criteria checklist
```

See [skill-anatomy.md](skill-anatomy.md) for the full specification.

## Using Agents

The `agents/` directory contains six agents — five base + one meta-agent — all with explicit `model:` declarations to prevent silent Opus inheritance:

| Agent | Model | Purpose |
|-------|-------|---------|
| `implementer.md` | sonnet | Generic implementer for spec-driven slices |
| `implementer-haiku.md` | haiku | Trivial-change executor (CSS/string change, rename, README, config flip) — escalates if the task drifts beyond trivial |
| `code-reviewer.md` | sonnet | GATE 2 — five-axis code review with `AUDIT RESULT: APPROVED\|BLOCKED` contract |
| `test-engineer.md` | sonnet | GATE 1 — test strategy and writing |
| `security-auditor.md` | sonnet | GATE 3 — OWASP-grounded vulnerability detection |
| `agent-architect.md` | sonnet | Meta-agent — creates project-local domain specialists on demand at `<project>/.claude/agents/<name>.md` |

In Claude Code, the main agent invokes these via the `Task` tool. The audit chain (test-engineer → code-reviewer → security-auditor) runs sequentially after the implementer or specialist returns its `READY FOR AUDIT` line. The main does NOT close a task without three `AUDIT RESULT: APPROVED` verdicts. Full contract: [`docs/DELEGATION-RULE.md`](DELEGATION-RULE.md).

In other tools without `Task` support, load the agent body as static context and execute its workflow manually.

## Using Commands

The `.claude/commands/` directory contains slash commands for Claude Code:

| Command | Skill Invoked |
|---------|---------------|
| `/spec` | spec-driven-development |
| `/plan` | planning-and-task-breakdown |
| `/build` | incremental-implementation + test-driven-development |
| `/test` | test-driven-development |
| `/review` | code-review-and-quality |
| `/ship` | shipping-and-launch |

## Using References

The `references/` directory contains supplementary checklists:

| Reference | Use With |
|-----------|----------|
| `testing-patterns.md` | test-driven-development |
| `performance-checklist.md` | performance-optimization |
| `security-checklist.md` | security-and-hardening |
| `accessibility-checklist.md` | frontend-ui-engineering |

Load a reference when you need detailed patterns beyond what the skill covers.

## Spec and task artifacts

The `/spec` and `/plan` commands create working artifacts (`SPEC.md`, `tasks/plan.md`, `tasks/todo.md`). Treat them as **living documents** while the work is in progress:

- Keep them in version control during development so the human and the agent have a shared source of truth.
- Update them when scope or decisions change.
- If your repo doesn’t want these files long‑term, delete them before merge or add the folder to `.gitignore` — the workflow doesn’t require them to be permanent.

## Tips

1. **Start with spec-driven-development** for any non-trivial work
2. **Always load test-driven-development** when writing code
3. **Don't skip verification steps** — they're the whole point. The audit chain (test → review → security) is non-negotiable; do not close a task without all three `AUDIT RESULT: APPROVED` verdicts
4. **Load skills selectively** — more context isn't always better
5. **Use the agents for review** — different perspectives catch different issues
6. **The main agent edits directly when appropriate** (v2.7+). Claude's native judgment decides delegate-vs-edit. The PreToolUse hook (`hooks/delegation-guard.sh`) only blocks **kill-switch paths** (`.claude/settings*.json`, `.claude/hooks/*`, `.claude/agents/*`, `.env`, `secrets/*`). The audit chain (test → review → security) is the post-edit safeguard for all other paths. See [ADR-0006](adr/0006-trust-native-delegation.md) for the v2.7 realignment with Anthropic's platform pattern.
7. **For domain expertise the base agents don't cover** (Google OAuth, payment-processor webhooks, Colombian e-invoicing parsers, etc.), invoke `agent-architect` to create or reuse a project-local specialist before delegating.
8. **For architecture / refactor / onboarding questions**, the `code-graph` skill (v2.8+, single-engine since v4.0) auto-triggers and consults a persisted graph instead of re-reading the repo. Engine: codebase-memory-mcp (Go MCP server). One-time bootstrap per machine: `bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh`. Operator recipe: [`usage/code-graph.md`](usage/code-graph.md). Debug-focused recipe: [`usage/debugging-with-code-graph.md`](usage/debugging-with-code-graph.md). **Windows users:** for the smoothest experience, run Claude Code and the engine inside WSL2 — symlinks, bash scripts, and the binary all work natively. Install WSL2: `wsl --install` from an elevated PowerShell.
9. **Across sessions**, follow the session-handoff protocol in [`CLAUDE.md`](../CLAUDE.md): one active plan in `docs/plans/active/`, session journal in `docs/sessions/`, the `Next:` line in the journal is the next session's entry point.
10. **Upgrading the plugin** when a new version ships: `claude plugin update batuta-agent-skills` + restart. Cache staleness is the most common cause of "skill not auto-triggering" — see [`usage/upgrading.md`](usage/upgrading.md).
