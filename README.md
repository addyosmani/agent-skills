# Batuta Agent Skills

**A Claude Code plugin: native-delegation main + post-edit audit chain + dual-engine code-graph + supply-chain hardening + runtime CI.** Forked from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and extended across 10 layers (see [`docs/SPEC.md`](docs/SPEC.md)).

Read these in order to understand the project:

1. [`docs/PRD.md`](docs/PRD.md) — vision, problem, success metrics
2. [`docs/SPEC.md`](docs/SPEC.md) — architecture overview (10 layers — agents, specialists, hook, audit chain, doc graph, rules, validators, code-graph, supply-chain, runtime CI)
3. [`docs/DELEGATION-RULE.md`](docs/DELEGATION-RULE.md) — native delegation + post-edit audit chain; kill-switch enforcement (v2.7+)
4. [`docs/DELEGATION-RULE-SPECIALISTS.md`](docs/DELEGATION-RULE-SPECIALISTS.md) — when and how `agent-architect` creates project-local domain specialists
5. [`docs/usage/`](docs/usage/) — operator recipes (upgrade, code-graph, consumer-projects, ci) — start here if you want to USE the plugin
6. [`docs/adr/`](docs/adr/) — decision records (9 ADRs covering Rule #0, Haiku tier, hook scope, audit chain shape, plan persistence, native delegation, code-graph dual-engine, audit × code-graph integration, E2E methodology)
7. [`CLAUDE.md`](CLAUDE.md) — project conventions and session-handoff protocol

If you're switching from Claude Code to another tool mid-feature (token budget, pair programming, etc.), read [`docs/PORTABILITY.md`](docs/PORTABILITY.md).

## Architecture in one paragraph

The plugin ships **six agents** — five base (`implementer` Sonnet, `implementer-haiku` Haiku, `code-reviewer` Sonnet, `test-engineer` Sonnet, `security-auditor` Sonnet) and one meta-agent (`agent-architect` Sonnet) — all with explicit `model:` declarations. A **plugin-level PreToolUse hook** (`hooks/delegation-guard.sh`, kill-switch-only since v2.7) blocks the main agent only on **plugin self-disable surfaces** (`.claude/settings*.json`, `.claude/hooks/*`, `.claude/agents/*`, `.env`, `secrets/*`). For everything else, Claude's native judgment decides delegate-vs-edit, aligned with Anthropic's platform pattern. After implementation, a **sequential audit chain** runs `test-engineer` → `code-reviewer` → `security-auditor` with a literal `AUDIT RESULT: APPROVED|BLOCKED|NOT APPLICABLE` contract on the staged `git diff` regardless of authorship. From v3.0, both `code-reviewer` and `security-auditor` execute a **Step 0.5 blast-radius / attack-surface enumeration** via the **dual-engine code-graph** (`graphify` multimodal + `codebase-memory-mcp` code-only fallback), with graceful-degrade when no engine is available. The codebase-memory-mcp install path is hardened by **3 supply-chain gates** (release pin + SHA-256 verify + `gh attestation verify`). A **runtime CI workflow** (`.github/workflows/ci.yml`) runs `actionlint` + 9 static validators + 4 sonnet-driven E2E scenarios on every PR. When a slice needs domain expertise the base agents don't cover, `agent-architect` creates a project-local specialist at `<project>/.claude/agents/<name>.md` with discovery-first to avoid duplicates.

## Install

```
/plugin marketplace add jota-batuta/batuta-agent-skills
/plugin install batuta-agent-skills@batuta-agent-skills
```

Or, for local development:

```bash
git clone https://github.com/jota-batuta/batuta-agent-skills.git
claude --plugin-dir /path/to/batuta-agent-skills
```

After installing, the plugin's PreToolUse hook is active in every session where the plugin is enabled. It blocks **only** the kill-switch paths listed above; for all other paths Claude uses its native delegation judgment. The post-edit audit chain (test → review → security) runs on every staged diff regardless of authorship. See [`docs/DELEGATION-RULE.md`](docs/DELEGATION-RULE.md) for the full contract.

For the dual-engine code-graph (architecture / onboarding / refactor questions), run the one-time-per-machine bootstrap:

```bash
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh
```

Operator recipes for upgrade, retrofit, code-graph use, and CI are in [`docs/usage/`](docs/usage/).

Optional dependency used internally by `batuta-skill-authoring`:

```bash
npx skills add vercel-labs/skills --skill find-skills
```

## What you get

```
 UPSTREAM (unchanged)                  BATUTA LAYER
 ────────────────────                  ────────────
 20 engineering skills                 10 Batuta-specific skills (full table below)
 + 7 slash commands                    + 7 agents with explicit model: (5 base + agent-architect + kb-pipeline)
 + supplementary checklists            + 2 hooks (SessionStart + PreToolUse delegation-guard)
                                          + post-commit-kb.sh (per-machine git hook)
                                       + project doc graph (PRD, SPEC, ADRs, plans, sessions)
                                       + audit chain contract
                                       + rules/ (engineering invariants imported à la carte)
                                       + vendored: writing-skills (obra/superpowers, MIT), context7 (intellectronica, CC0)
```

Attribution for upstream and vendored sources lives in [`ATTRIBUTION.md`](ATTRIBUTION.md).

### Full skill inventory (30 skills)

#### Upstream — `addyosmani/agent-skills` (20 skills)

Inherited verbatim from the upstream marketplace. These are the production-grade engineering workflows that drive every phase of the SDLC. See the [Upstream README section](#agent-skills-upstream) below for the original descriptions.

| Phase | Skill | One-line role |
|---|---|---|
| Define | `idea-refine` | Refine ideas through structured divergent + convergent thinking. |
| Define | `spec-driven-development` | Write a spec before code; requirements first. |
| Plan | `planning-and-task-breakdown` | Decompose specs into atomic, ordered tasks. |
| Build | `incremental-implementation` | Land changes in small slices, never one big drop. |
| Build | `test-driven-development` | Write the failing test first, then make it pass. |
| Build | `context-engineering` | Optimize agent context (rules + memory + retrieval) at session start. |
| Build | `source-driven-development` | Ground implementation in cited official documentation. |
| Build | `frontend-ui-engineering` | Build production-quality UIs (a11y, design tokens, state). |
| Build | `api-and-interface-design` | Design stable APIs, module boundaries, type contracts. |
| Verify | `browser-testing-with-devtools` | Test in real browsers via Chrome DevTools MCP. |
| Verify | `debugging-and-error-recovery` | Systematic root-cause debugging, not guesswork. |
| Review | `code-review-and-quality` | Multi-axis code review before merge. |
| Review | `code-simplification` | Reduce accidental complexity without changing behavior. |
| Review | `security-and-hardening` | OWASP-grounded vulnerability scan + hardening. |
| Review | `performance-optimization` | Profile-then-optimize Core Web Vitals + load times. |
| Ship | `git-workflow-and-versioning` | Atomic commits, branches, conflict resolution. |
| Ship | `ci-cd-and-automation` | Pipeline setup, gated jobs, deployment automation. |
| Ship | `deprecation-and-migration` | Sunset old systems and migrate users safely. |
| Ship | `documentation-and-adrs` | Record decisions and write docs future engineers can read. |
| Ship | `shipping-and-launch` | Pre-launch checklist, monitoring, rollback. |
| Meta | `using-agent-skills` | Discovery flowchart that routes to the right skill for the task. |

(`using-agent-skills` is the meta-skill that drives auto-invocation; see `skills/using-agent-skills/SKILL.md`.)

#### Batuta-specific — added by this fork (10 skills)

Layered on top of upstream. Most have **mandatory triggers** documented in [`CLAUDE.md`](CLAUDE.md) so they fire without operator intervention.

| Skill | Auto-trigger | Role |
|---|---|---|
| `batuta-project-hygiene` | Session start when project lacks `CLAUDE.md` OR doc skeleton; before feature work | Bootstrap project rules, doc graph (`docs/PRD.md`, `docs/SPEC.md`, `docs/adr/`, `docs/plans/`, `docs/sessions/`), GitHub repo, `.claude/kb-config.json`. Three modes: `project-init`, `project-retrofit`, `feature-init`. Scans `<vault>/clients/*` for the client-discovery menu. |
| `batuta-skill-authoring` | Before any new `skills/<name>/SKILL.md` is created in this plugin | Discover-first gate (forces `npx skills find` against the 91k+ skills.sh catalog), distinctness check, conventions enforcement. Marker-file enforced by `pre-write-skill-gate.sh`. |
| `batuta-agent-authoring` | Before any new `agents/<name>.md` is created in this plugin | Distinctness check against existing agents, tool-minimality, Batuta naming. Marker-file enforced by `pre-write-agent-gate.sh`. |
| `batuta-rule-authoring` | Before any new file under `rules/` | Validates the §A.4 canonical format, §A.5 conventions (50–200 lines, imperative tone, anti-patterns mandatory), §A.6 admission gate of N=2 projects evidence. |
| `research-first-dev` | Before writing code that imports/calls any external library or API not yet cited this session | Forces Context7 lookup, web-search fallback, and a `// Source: <url> (verified YYYY-MM-DD, <lib>@<version>)` citation comment at every import site. |
| `code-graph` | When the operator asks about architecture, dependencies, refactor scope; or session start on a >5k-LOC repo without an index | Builds or queries a code knowledge graph. Dual-engine: `graphify` (multimodal, primary) + `codebase-memory-mcp` (code-only, Windows fallback). Four modes: `--scan`, `--watch`, `--mcp`, `--query`. |
| `batuta-kb-vault` | When bootstrapping or operating the operator's Obsidian vault | Defines the L0/L1/L2/L3 vault structure (inbox / journals / curated / glossary), frontmatter contracts, tagging, inbox drain protocol. Companion to `kb-curate` and `kb-backfill`. |
| `kb-curate` | PR-merge / `/kb-curate` slash / weekly cron / `/kb-end-session` | Promotes captured journal bullets (L1) to curated decisions, gotchas, playbooks, glossary entries (L2/L3). 7-category classification, hybrid control matrix. Powered by the `kb-curator` agent. |
| `kb-backfill` | One-shot when extracting historical knowledge from a legacy repo into the vault inbox | 4-phase pipeline: README/CHANGELOG → commits → GitHub issues+PRs → optional code analysis. Idempotent, configurable scope. Powered by the `kb-backfiller` agent. |
| ~~`notion-kb-workflow`~~ | **DEPRECATED 2026-05-01** ([ADR-0012](docs/adr/0012-obsidian-only-kb-pipeline.md)) | Frozen. Replaced by `hooks/session-start.sh` (auto context load) + `batuta-project-hygiene` mode `project-init` (vault menu) + `hooks/post-commit-kb.sh` + `agents/kb-pipeline.md` (per-commit dispatch). Do not invoke. |

The `kb-pipeline` agent (in `agents/`, not `skills/`) is the per-commit dispatch target — runs Capture / Curate / Write phases against the commit diff. Triggered by `hooks/post-commit-kb.sh` when `kb_pipeline_enabled: true` in `.claude/kb-config.json`.

#### Vendored — kept as upstream copies in `skills/_vendored/`

| Vendored skill | Origin | License |
|---|---|---|
| `writing-skills` | obra/superpowers | MIT |
| `context7` | intellectronica/context7 | CC0 |

These are imported by Batuta skills (`batuta-skill-authoring` uses `writing-skills`; `research-first-dev` uses `context7`) and kept verbatim — not modified in this fork.

## Layers

The plugin contains two independent layers. They do not overlap; pick the right one for the content you are adding.

| Layer | Question | Activation | Format |
|---|---|---|---|
| [`skills/`](skills/) | "What do I do when *X* situation arises?" | Auto-invocation by Claude Code via skill description matching | `SKILL.md` per directory with `name`/`description` frontmatter |
| [`rules/`](rules/) | "How must the code look *always*?" | Explicit `@<path>` import from a project's `CLAUDE.md` | Plain Markdown with light frontmatter (`title`/`applies-to`/`last-reviewed`) |

`skills/` carries 30 procedures (20 upstream + 10 Batuta-specific; full table in [What you get](#what-you-get) above). `rules/` carries declarative invariants imported à la carte by consumer projects via `@.claude/rules/<rule>.md` (project-relative path resolved through symlinks created by `tools/setup-rules.sh`). New rules require passing the `batuta-rule-authoring` admission gate. See [`rules/README.md`](rules/README.md) for the full layer documentation and [`rules/_meta/how-to-import.md`](rules/_meta/how-to-import.md) for the consumer protocol.

## Merging upstream updates

```bash
git fetch upstream
git merge upstream/main
```

Expect conflicts in `CLAUDE.md`, `README.md`, `agents/*.md`, `hooks/hooks.json`, and `docs/`. The Batuta architecture (Rule #0, hook, audit chain, doc graph) supersedes upstream defaults — preserve Batuta on every conflict unless the upstream change is a bugfix in a skill body.

## Cross-tool portability

The plugin's runtime enforcement (hook, audit chain, agent delegation) is specific to **Claude Code 1.x**. The doc graph (PRD/SPEC/ADRs/plans/sessions) is plain Markdown and ports to any tool that reads project files. If you need to continue work in Cursor, Codex CLI, Aider, or another tool, see [`docs/PORTABILITY.md`](docs/PORTABILITY.md) for what survives the switch and how to self-enforce Rule #0 without the hook.

---

## Upstream README (reference)

> **Note:** the sections below are preserved verbatim from the upstream `addyosmani/agent-skills` README. Install commands and tool-setup tables in this section reference the **upstream** repo, not this fork. For the Batuta-specific install (recommended), see the top of this file.

The sections below are the upstream's documentation, preserved as reference for the 20 skills inherited by this fork. See [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills) for the original.

---

# Agent Skills (upstream)

**Production-grade engineering skills for AI coding agents.**

Skills encode the workflows, quality gates, and best practices that senior engineers use when building software. These ones are packaged so AI agents follow them consistently across every phase of development.

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

---

## Commands

7 slash commands that map to the development lifecycle. Each one activates the right skills automatically.

| What you're doing | Command | Key principle |
|-------------------|---------|---------------|
| Define what to build | `/spec` | Spec before code |
| Plan how to build it | `/plan` | Small, atomic tasks |
| Build incrementally | `/build` | One slice at a time |
| Prove it works | `/test` | Tests are proof |
| Review before merge | `/review` | Improve code health |
| Simplify the code | `/code-simplify` | Clarity over cleverness |
| Ship to production | `/ship` | Faster is safer |

Skills also activate automatically based on what you're doing — designing an API triggers `api-and-interface-design`, building UI triggers `frontend-ui-engineering`, and so on.

---

## Quick Start

<details>
<summary><b>Claude Code (recommended)</b></summary>

**Marketplace install:**

```
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills
```

> **SSH errors?** The marketplace clones repos via SSH. If you don't have SSH keys set up on GitHub, either [add your SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) or switch to HTTPS for fetches only:
> ```bash
> git config --global url."https://github.com/".insteadOf "git@github.com:"
> ```

**Local / development:**

```bash
git clone https://github.com/addyosmani/agent-skills.git
claude --plugin-dir /path/to/agent-skills
```

</details>

<details>
<summary><b>OpenCode</b></summary>

Uses agent-driven skill execution via `AGENTS.md` and the `skill` tool. The Batuta runtime layer (Rule #0 hook, audit chain, agent delegation) is **not available** on OpenCode — only the skill-routing surface ports. See [docs/opencode-setup.md](docs/opencode-setup.md).

</details>

<details>
<summary><b>Codex CLI / Cursor / Aider / Gemini CLI / Windsurf / other tools</b></summary>

Skills and the doc graph (PRD, SPEC, ADRs, plans, sessions) are plain Markdown and load into any tool that reads project files. **The Batuta runtime layer is Claude Code-only.** If you switch tools mid-feature, read [docs/PORTABILITY.md](docs/PORTABILITY.md) for the checklist of what survives, what does not, and how to self-enforce Rule #0 without the hook.

</details>



---

## All 20 Skills

The commands above are the entry points. Under the hood, they activate these 20 skills — each one a structured workflow with steps, verification gates, and anti-rationalization tables. You can also reference any skill directly.

### Define - Clarify what to build

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [idea-refine](skills/idea-refine/SKILL.md) | Structured divergent/convergent thinking to turn vague ideas into concrete proposals | You have a rough concept that needs exploration |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | Write a PRD covering objectives, commands, structure, code style, testing, and boundaries before any code | Starting a new project, feature, or significant change |

### Plan - Break it down

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | Decompose specs into small, verifiable tasks with acceptance criteria and dependency ordering | You have a spec and need implementable units |

### Build - Write the code

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | Thin vertical slices - implement, test, verify, commit. Feature flags, safe defaults, rollback-friendly changes | Any change touching more than one file |
| [test-driven-development](skills/test-driven-development/SKILL.md) | Red-Green-Refactor, test pyramid (80/15/5), test sizes, DAMP over DRY, Beyonce Rule, browser testing | Implementing logic, fixing bugs, or changing behavior |
| [context-engineering](skills/context-engineering/SKILL.md) | Feed agents the right information at the right time - rules files, context packing, MCP integrations | Starting a session, switching tasks, or when output quality drops |
| [source-driven-development](skills/source-driven-development/SKILL.md) | Ground every framework decision in official documentation - verify, cite sources, flag what's unverified | You want authoritative, source-cited code for any framework or library |
| [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) | Component architecture, design systems, state management, responsive design, WCAG 2.1 AA accessibility | Building or modifying user-facing interfaces |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | Contract-first design, Hyrum's Law, One-Version Rule, error semantics, boundary validation | Designing APIs, module boundaries, or public interfaces |

### Verify - Prove it works

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [browser-testing-with-devtools](skills/browser-testing-with-devtools/SKILL.md) | Chrome DevTools MCP for live runtime data - DOM inspection, console logs, network traces, performance profiling | Building or debugging anything that runs in a browser |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | Five-step triage: reproduce, localize, reduce, fix, guard. Stop-the-line rule, safe fallbacks | Tests fail, builds break, or behavior is unexpected |

### Review - Quality gates before merge

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | Five-axis review, change sizing (~100 lines), severity labels (Nit/Optional/FYI), review speed norms, splitting strategies | Before merging any change |
| [code-simplification](skills/code-simplification/SKILL.md) | Chesterton's Fence, Rule of 500, reduce complexity while preserving exact behavior | Code works but is harder to read or maintain than it should be |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | OWASP Top 10 prevention, auth patterns, secrets management, dependency auditing, three-tier boundary system | Handling user input, auth, data storage, or external integrations |
| [performance-optimization](skills/performance-optimization/SKILL.md) | Measure-first approach - Core Web Vitals targets, profiling workflows, bundle analysis, anti-pattern detection | Performance requirements exist or you suspect regressions |

### Ship - Deploy with confidence

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | Trunk-based development, atomic commits, change sizing (~100 lines), the commit-as-save-point pattern | Making any code change (always) |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | Shift Left, Faster is Safer, feature flags, quality gate pipelines, failure feedback loops | Setting up or modifying build and deploy pipelines |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | Code-as-liability mindset, compulsory vs advisory deprecation, migration patterns, zombie code removal | Removing old systems, migrating users, or sunsetting features |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | Architecture Decision Records, API docs, inline documentation standards - document the *why* | Making architectural decisions, changing APIs, or shipping features |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | Pre-launch checklists, feature flag lifecycle, staged rollouts, rollback procedures, monitoring setup | Preparing to deploy to production |

---

## Agents (six shipped, all with explicit `model:` declarations)

| Agent | Model | Role |
|-------|-------|------|
| [implementer](agents/implementer.md) | sonnet | Generic implementer for spec-driven slices |
| [implementer-haiku](agents/implementer-haiku.md) | haiku | Trivial-change executor (CSS/string change, rename, README edit, config flip, ≤3 files no logic) — escalates to `implementer` if the task drifts beyond trivial |
| [code-reviewer](agents/code-reviewer.md) | sonnet | GATE 2 of the audit chain — five-axis review with `AUDIT RESULT: APPROVED\|BLOCKED` contract |
| [test-engineer](agents/test-engineer.md) | sonnet | GATE 1 — test design and coverage; `Write` scoped to test paths only |
| [security-auditor](agents/security-auditor.md) | sonnet | GATE 3 — OWASP-grounded vulnerability scan |
| [agent-architect](agents/agent-architect.md) | sonnet | Meta-agent. Creates project-local domain specialists on demand at `<project>/.claude/agents/<name>.md` with discovery-first |

The main agent picks which agent to delegate to based on task complexity. See [`docs/DELEGATION-RULE-SPECIALISTS.md`](docs/DELEGATION-RULE-SPECIALISTS.md) for the calibration table (12 worked examples mapped to Haiku / Sonnet / Opus).

---

## Reference Checklists

Quick-reference material that skills pull in when needed:

| Reference | Covers |
|-----------|--------|
| [testing-patterns.md](references/testing-patterns.md) | Test structure, naming, mocking, React/API/E2E examples, anti-patterns |
| [security-checklist.md](references/security-checklist.md) | Pre-commit checks, auth, input validation, headers, CORS, OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Core Web Vitals targets, frontend/backend checklists, measurement commands |
| [accessibility-checklist.md](references/accessibility-checklist.md) | Keyboard nav, screen readers, visual design, ARIA, testing tools |

---

## How Skills Work

Every skill follows a consistent anatomy:

```
┌─────────────────────────────────────────────┐
│  SKILL.md                                   │
│                                             │
│  ┌─ Frontmatter ─────────────────────────┐  │
│  │ name: lowercase-hyphen-name           │  │
│  │ description: Use when [trigger]       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Overview         → What this skill does    │
│  When to Use      → Triggering conditions   │
│  Process          → Step-by-step workflow   │
│  Rationalizations → Excuses + rebuttals     │
│  Red Flags        → Signs something's wrong │
│  Verification     → Evidence requirements   │
└─────────────────────────────────────────────┘
```

**Key design choices:**

- **Process, not prose.** Skills are workflows agents follow, not reference docs they read. Each has steps, checkpoints, and exit criteria.
- **Anti-rationalization.** Every skill includes a table of common excuses agents use to skip steps (e.g., "I'll add tests later") with documented counter-arguments.
- **Verification is non-negotiable.** Every skill ends with evidence requirements - tests passing, build output, runtime data. "Seems right" is never sufficient.
- **Progressive disclosure.** The `SKILL.md` is the entry point. Supporting references load only when needed, keeping token usage minimal.

---

## Project Structure

For the canonical architecture overview, read [`docs/SPEC.md`](docs/SPEC.md). Short version:

```
batuta-agent-skills/
├── CLAUDE.md                  # project conventions + session-handoff protocol
├── AGENTS.md                  # cross-tool entry point (mirror of CLAUDE.md essentials)
├── docs/
│   ├── PRD.md                 # vision, problem, success metrics
│   ├── SPEC.md                # architecture overview (≤200 lines)
│   ├── DELEGATION-RULE.md     # Rule #0 contract + audit chain
│   ├── DELEGATION-RULE-SPECIALISTS.md  # agent-architect + Haiku/Sonnet/Opus calibration
│   ├── PORTABILITY.md         # cross-tool fallback when leaving Claude Code
│   ├── adr/                   # numbered architecture decision records
│   ├── plans/active/          # exactly one active plan per feature branch
│   ├── plans/archive/         # completed plans, dated
│   ├── sessions/              # session journals (Context|Decisions|Changes|Next)
│   ├── getting-started.md, skill-anatomy.md, opencode-setup.md
│   └── qa/                    # benchmark reports
├── agents/                    # 7 agents with explicit model: (5 base + agent-architect + kb-pipeline)
│                              #   Plus kb-curator, kb-backfiller invoked by their respective skills.
├── hooks/
│   ├── hooks.json             # SessionStart + PreToolUse registration
│   ├── session-start.sh       # session-start advice + KB context loader (vault auto-load)
│   ├── delegation-guard.sh    # PreToolUse kill-switch enforcement
│   ├── pre-write-skill-gate.sh   # marker check before any new skills/<name>/SKILL.md
│   ├── pre-write-agent-gate.sh   # marker check before any new agents/<name>.md
│   └── post-commit-kb.sh      # per-machine git hook (ADR auto-mirror + kb-pipeline dispatch)
├── skills/                    # 20 upstream + 10 Batuta-specific — see "Full skill inventory" above
├── rules/                     # engineering invariants library (core/, stack/, domain-co/, delivery/) — imported à la carte by consumer projects
├── tools/
│   └── setup-rules.sh         # consumer-side script: symlinks rules into a project's .claude/rules/
├── .claude/commands/          # 7 slash commands
└── references/                # supplementary checklists
```

---

## Why Agent Skills?

AI coding agents default to the shortest path - which often means skipping specs, tests, security reviews, and the practices that make software reliable. Agent Skills gives agents structured workflows that enforce the same discipline senior engineers bring to production code.

Each skill encodes hard-won engineering judgment: *when* to write a spec, *what* to test, *how* to review, and *when* to ship. These aren't generic prompts - they're the kind of opinionated, process-driven workflows that separate production-quality work from prototype-quality work.

Skills bake in best practices from Google's engineering culture — including concepts from [Software Engineering at Google](https://abseil.io/resources/swe-book) and Google's [engineering practices guide](https://google.github.io/eng-practices/). You'll find Hyrum's Law in API design, the Beyonce Rule and test pyramid in testing, change sizing and review speed norms in code review, Chesterton's Fence in simplification, trunk-based development in git workflow, Shift Left and feature flags in CI/CD, and a dedicated deprecation skill treating code as a liability. These aren't abstract principles — they're embedded directly into the step-by-step workflows agents follow.

---

## Contributing

Skills should be **specific** (actionable steps, not vague advice), **verifiable** (clear exit criteria with evidence requirements), **battle-tested** (based on real workflows), and **minimal** (only what's needed to guide the agent).

See [docs/skill-anatomy.md](docs/skill-anatomy.md) for the format specification and [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT - use these skills in your projects, teams, and tools.
