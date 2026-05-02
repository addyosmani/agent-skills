# SPEC — batuta-agent-skills

**Status:** living document
**Last reviewed:** 2026-05-02 (v3.6)
**Companion documents:** [`PRD.md`](PRD.md) (why), [`adr/`](adr/) (per-decision rationale), [`usage/`](usage/) (operator recipes — upgrade, code-graph, consumer-projects, ci), feature-scoped specs in `docs/<feature>.md` and `skills/<skill>/SKILL.md` (how each module works)

This is a project-wide architecture overview. It describes what the plugin contains, how the pieces fit, and what constraints they enforce. Per-module behavior lives in feature-scoped specs (cross-referenced from each section below).

## Component map

```
batuta-agent-skills/
├── CLAUDE.md                  ← project conventions (rules, not architecture)
├── docs/
│   ├── PRD.md                 ← problem, vision, success metrics
│   ├── SPEC.md                ← this file
│   ├── adr/                   ← per-decision rationale (numbered, dated, immutable once accepted)
│   ├── plans/active/          ← exactly one active plan per feature branch
│   ├── plans/archive/         ← completed plans, dated
│   ├── sessions/              ← session journals (YYYY-MM-DD-<slug>.md)
│   ├── DELEGATION-RULE.md            ← delegation contract
│   └── DELEGATION-RULE-SPECIALISTS.md ← feature spec: agent-architect + Haiku/Sonnet calibration
├── agents/                    ← 9 plugin-shipped agents (6 base + 1 meta + 3 KB pipeline), all with explicit model:
├── hooks/
│   ├── hooks.json             ← SessionStart + PreToolUse registration
│   ├── session-start.sh       ← session-start advice + KB context loader
│   ├── delegation-guard.sh    ← PreToolUse kill-switch enforcement
│   ├── pre-write-skill-gate.sh   ← marker check before new SKILL.md
│   ├── pre-write-agent-gate.sh   ← marker check before new agents/*.md
│   ├── pr-merge-guard.sh         ← blocks direct merge to main/master
│   └── post-commit-kb.sh         ← per-machine git hook (ADR mirror + kb-pipeline dispatch)
├── skills/                    ← invocable skills (build, plan, spec, test, review, etc.)
├── rules/                     ← engineering invariants library (declarative; imported via @<path> from consumer CLAUDE.md)
├── tools/                     ← consumer-side scripts (setup-rules.sh)
├── .claude/commands/          ← slash commands (/spec, /plan, /build, ...)
└── references/                ← supplementary checklists
```

## Layer 1 — Agents (nine shipped, all with explicit `model:`)

| Agent | Model | Role | Tool grants |
|---|---|---|---|
| `implementer` | sonnet | Generic implementer for spec-driven slices | Read, Write, Edit, Bash, Grep, Glob |
| `implementer-haiku` | haiku | Trivial-change executor (CSS, rename, README, config flips) | Read, Write, Edit, Bash, Grep, Glob |
| `code-reviewer` | sonnet | GATE 2 — five-axis review with `AUDIT RESULT` contract | Read, Grep, Glob, Bash |
| `security-auditor` | sonnet | GATE 3 — OWASP-grounded vulnerability scan | Read, Grep, Glob, Bash |
| `test-engineer` | sonnet | GATE 1 — test design + coverage; `Write` scoped to test paths | Read, Write, Bash, Grep, Glob |
| `agent-architect` | sonnet | Meta-agent: creates project-local specialists on demand | Read, Write, Glob, Grep, WebSearch, WebFetch |
| `kb-pipeline` | sonnet | Per-commit KB orchestrator: Capture / Curate / Write to Obsidian vault | Read, Write, Edit, Bash, Grep, Glob |
| `kb-curator` | sonnet | Markdown classifier for kb-curate: 7-category classification of journal bullets | Read, Write, Edit, Bash, Grep, Glob |
| `kb-backfiller` | sonnet | Legacy repo extractor: READMEs, commits, issues, code analysis → vault inbox | Read, Write, Grep, Glob, Bash |

The six base agents (implementer, implementer-haiku, code-reviewer, security-auditor, test-engineer, and agent-architect's generated specialists) form the audit chain (test → review → security after implementation). `agent-architect` is the meta-layer for dynamic specialist creation; it does not execute work itself. The three KB agents (`kb-pipeline`, `kb-curator`, `kb-backfiller`) handle the Obsidian vault pipeline — per-commit capture, batch curation, and legacy backfill respectively. See [`adr/0001-rule-zero-delegation-only-main.md`](adr/0001-rule-zero-delegation-only-main.md) for why these specific roles, [`adr/0002-implementer-haiku-separate-agent.md`](adr/0002-implementer-haiku-separate-agent.md) for why the Haiku tier is a separate agent, [`adr/0012-obsidian-only-kb-pipeline.md`](adr/0012-obsidian-only-kb-pipeline.md) for the KB pipeline architecture, and [`DELEGATION-RULE-SPECIALISTS.md`](DELEGATION-RULE-SPECIALISTS.md) for the task-complexity calibration that picks the model.

## Layer 2 — Project-local specialists (created at runtime by `agent-architect`)

`agent-architect` materializes `<project>/.claude/agents/<name>.md` files when a slice needs domain expertise the base agents don't cover. Each specialist gets:

- Explicit `model:` (Haiku, Sonnet, or Opus by the calibration table)
- Minimal `tools:` list (per role: implementer / auditor / researcher)
- Workflow ending with the literal `READY FOR AUDIT: test-engineer → code-reviewer → security-auditor`
- Reserved-name guard prevents shadowing of base agents

See [`DELEGATION-RULE-SPECIALISTS.md`](DELEGATION-RULE-SPECIALISTS.md) for the full creation contract, sanitization rules, promotion path (project-local → user-global), and fleet maintenance.

## Layer 3 — Runtime enforcement (PreToolUse hook)

`hooks/delegation-guard.sh` registered in `hooks/hooks.json` with matcher `Write|Edit|MultiEdit|NotebookEdit`. Kill-switch-only model (v2.7+, aligned with Anthropic's platform pattern):

- **Subagent bypass**: requires non-empty `agent_id` AND `hook_event_name == "PreToolUse"` in stdin JSON. Subagents bypass the hook entirely; their tool scope is enforced by their own frontmatter.
- **Kill-switch blocklist** (always blocked from the main, regardless of other path): `.claude/settings*.json`, `.claude/hooks/*`, `.claude/agents/*`, `.env`, `.env.*`, `secrets/*`. These are the surfaces that would let the main self-disable the plugin or commit secrets.
- **All other paths: allowed.** Claude uses its native judgment for the delegate-vs-edit decision. No path-whitelist enforcement — that was the v1/v2.6 model, removed in v2.7 to align with Anthropic's guidance that PreToolUse hooks are for hard constraints, not workflow routing.
- **Failure mode (v2.7)**: if JSON parsing fails, the hook ALLOWs (does not fail closed). A parse error should not block the session; the hook's purpose is kill-switch protection.
- Path-traversal guard: matches `..` only as a path segment.
- Defensive Windows backslash normalization for Git Bash compatibility.
- Fail-soft on missing `jq` (warns to stderr, allows). Operator install hint provided.
- Output protocol: `exit 0` allows; `exit 1` blocks with stderr message.

**Audit chain as post-edit safeguard**: the primary quality + security enforcement is the post-edit audit chain (Layer 4), not the pre-edit hook. The hook's sole remaining job is preventing the main from writing to kill-switch paths.

See [`adr/0003-plugin-level-hook-vs-permissions-deny.md`](adr/0003-plugin-level-hook-vs-permissions-deny.md) for why a hook and not the `permissions.deny` system. See [`adr/0006-trust-native-delegation.md`](adr/0006-trust-native-delegation.md) for the v2.7 realignment rationale.

## Layer 4 — Audit chain (sequential, blocking)

After the implementer (or specialist) writes code:

```
GATE 1: test-engineer       → AUDIT RESULT: APPROVED | BLOCKED
GATE 2: code-reviewer       → AUDIT RESULT: APPROVED | BLOCKED
GATE 3: security-auditor    → AUDIT RESULT: APPROVED | BLOCKED  (default-on; skip allowlist in DELEGATION-RULE.md)
```

Sequential, not parallel — each gate reads the previous one's output. The main agent does NOT close a task until all applicable gates return APPROVED. A BLOCKED verdict reopens the cycle with the auditor's report attached. See [`adr/0004-audit-chain-sequential-not-parallel.md`](adr/0004-audit-chain-sequential-not-parallel.md) for the rationale.

The contract is documented in [`DELEGATION-RULE.md`](DELEGATION-RULE.md) including the GATE 3 skip allowlist (4 narrow conditions, exhaustive) and the anti-rationalization table for the main.

## Layer 5 — Documentation graph (this layer)

The doc graph mirrors the four-quadrant model of the industry consensus:

| Question | Project-wide | Feature-scoped |
|---|---|---|
| Why (vision/metrics) | `docs/PRD.md` | `docs/features/<feature>/PRD.md` (when warranted; not yet present) |
| What/how (architecture) | `docs/SPEC.md` (this file) | `docs/<feature>.md`, `skills/<skill>/SKILL.md` |
| Why-this-how (decisions) | `docs/adr/NNNN-*.md` | (rare; major decisions promote up) |
| How-we-work (rules) | `CLAUDE.md` | `src/<feature>/CLAUDE.md` |

Plans and session journals augment this:

- `docs/plans/active/<date>-<slug>.md` — exactly one active plan per feature branch
- `docs/plans/archive/<date>-<slug>.md` — completed plans (moved at PR merge)
- `docs/sessions/<date>-<slug>.md` — session journal with `Context | Decisions | Changes | Next` sections; the `Next` line is the entry point for the next session

See `CLAUDE.md` section "Session-handoff protocol" for how the operator and the main agent interact with these files.

## Layer 6 — Engineering invariants (`rules/`)

A library of declarative engineering invariants (style, security, multi-tenancy, delivery checklists) that consumer projects import à la carte from their own `CLAUDE.md`.

- **Format:** plain Markdown with light frontmatter (`title`, `applies-to`, `last-reviewed`). NOT `SKILL.md` format.
- **Activation:** explicit `@<path>` import in the consumer project's `CLAUDE.md`. NOT auto-discovered.
- **Folder structure:** `rules/core/` (universal), `rules/stack/`, `rules/domain-co/`, `rules/delivery/`. New domain folders are added as evidence accumulates.
- **Import path:** consumer projects symlink `.claude/rules/<rule>.md` → `<plugin>/rules/<rule>.md` via `tools/setup-rules.sh`, then import via `@.claude/rules/<rule>.md` (project-relative, portable cross-developer).
- **Authoring gate:** new rules must pass the `batuta-rule-authoring` skill (validates §A.4 format, §A.5 conventions, §A.6 admission gate of N=2 projects evidence).

This layer is independent of `skills/`. Skills are workflows triggered by events; rules are invariants always in effect. The boundary is documented in [`../rules/README.md`](../rules/README.md).

## Layer 7 — Static contract validators (`tests/v2.5-validators/`)

A static-check test suite that grep-verifies the v2.5+ enforcement contracts (audit chain scope Step 0, research-first Step 2, meta-agent template baking, batuta-agent-authoring verification rules, code-graph skill shape, code-graph helpers behavior, audit-chain × code-graph integration) are present in their respective files.

- **Format:** bash scripts under `tests/v2.5-validators/<NN>-<short-name>.sh`. Each case exits 0 on PASS, non-zero on FAIL.
- **Current cases:** 9 (cases 01–09). 01 audit chain Step 0; 02–03 implementer + implementer-haiku Step 2; 04 agent-architect baking; 05 batuta-agent-authoring rules; 06 delegation-guard kill-switch; 07 code-graph skill shape; 08 code-graph helpers behavior; 09 audit-chain × code-graph integration.
- **Orchestration:** `tests/v2.5-validators/run.sh` runs all cases and aggregates the result. CI-friendly exit code.
- **Scope:** static contract checks only — grep against expected wording in the agent prompts and skill files. NOT runtime tests; does not invoke `claude` CLI.
- **Adding a case:** required whenever a new enforcement contract is wired into an agent prompt or skill. The case must grep-check for the canonical wording the contract uses, not paraphrase, so source-file drift fails the test deliberately.

This layer is the regression net for the runtime enforcement layers (3 and 4). When an auditor's Step 0 or an implementer's Step 2 gets accidentally edited away during a refactor, validators catch it before merge.

## Layer 8 — Code knowledge graph (v2.8+)

A dual-engine code-graph layer so architecture / onboarding / refactor questions consult a persisted graph instead of re-reading the repo file by file.

- **Primary engine:** `graphify` ([github.com/safishamsi/graphify](https://github.com/safishamsi/graphify), v0.5.4). Multimodal — code (25 languages via tree-sitter) + docs + PDFs + images + audio (Whisper local). Output: `graphify-out/{graph.json, GRAPH_REPORT.md, graph.html, cache/}`.
- **Fallback engine:** `codebase-memory-mcp` ([github.com/DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp), v0.6.0). Native C MCP server, code-only, 14 MCP tools (`index_repository`, `search_graph`, `trace_call_path`, ...). Critical on Windows where graphify currently has open install issues.
- **Skill:** [`skills/code-graph/SKILL.md`](../skills/code-graph/SKILL.md). Auto-trigger by description matching on architecture / onboarding / refactor prompts. Step 0 reads cached engine state at `~/.claude/code-graph-engines.json` and dispatches to the best available engine.
- **Slash:** [`.claude/commands/code-graph.md`](../.claude/commands/code-graph.md). Operator-invoked manual surface. Modes: `--scan`, `--watch`, `--mcp`, `--query`, with `--engine <name>` override.
- **Bootstrap:** [`tools/setup-code-graph.sh`](../tools/setup-code-graph.sh). Operator-side. Installs both engines (uv > pipx > pip for graphifyy; SHA-256-verified GitHub release download for codebase-memory-mcp; provenance-attested via `gh attestation verify` if available). Idempotent. Chained from `tools/setup-rules.sh --all`.
- **Audit chain integration (Step 0.5, v3.0+):** `code-reviewer` and `security-auditor` consult the active engine after Step 0 (NOT-APPLICABLE) and before the framework review, for blast-radius / attack-surface enumeration. Non-blocking; graceful-degrade to v2.9 behavior when no engine is available. `test-engineer` is intentionally NOT consulting (scope guard, ADR-0008).
- **Rule:** [`rules/integrations/code-graph-usage.md`](../rules/integrations/code-graph-usage.md). Declarative contract for consumer projects (cite the engine, never run `graphify claude install`, never commit `graphify-out/`, etc.).

See [`adr/0007-code-graph-dual-engine.md`](adr/0007-code-graph-dual-engine.md) for the dual-engine rationale and [`adr/0008-audit-chain-code-graph-integration.md`](adr/0008-audit-chain-code-graph-integration.md) for Step 0.5. Operator recipe: [`usage/code-graph.md`](usage/code-graph.md).

## Layer 9 — Supply-chain hardening (v2.9 + v3.1 + v3.4)

A 3-gate verification posture for the codebase-memory-mcp engine binary, plus version-pinning across the rest of the install surface.

| Gate | What it proves | Defends against | Shipped in |
|---|---|---|---|
| 1. Release pin | Asset URL is immutable per release | `main`-branch tampering | v2.8 |
| 2. SHA-256 against signed `checksums.txt` | Asset matches the manifest of the same release | Network MITM, half-tampered re-upload | v2.9 |
| 3. `gh attestation verify` (Sigstore + GH Actions provenance) | Asset chains to the expected workflow run in the expected repo | Maintainer-account compromise re-publishing both asset + checksums | v3.1 |

Asymmetric trust posture (intentional, documented in [ADR-0007 § Update](adr/0007-code-graph-dual-engine.md)): codebase-memory-mcp gets all 3 gates; graphifyy gets PyPI version-pin only (`==0.5.4`). PyPI hash-pinning is postponed because `uv tool install` does not expose `--require-hashes`. Tracked upstream at `astral-sh/uv#5945`.

In v3.4, the plugin's own GitHub Actions surface adopted the same posture: third-party actions pinned by full commit SHA (`actions/checkout@de0fac2e... # v6`, `actions/setup-node@49933ea5... # v4`, `raven-actions/actionlint@205b530c... # v2.1.2`); Claude CLI pinned to `@anthropic-ai/claude-code@2.1.123`.

## Layer 10 — Runtime CI (`.github/workflows/`, v3.3+)

GitHub Actions workflow that runs the static validators + the E2E harness on every PR.

- **`.github/workflows/ci.yml`** with three gated jobs:
  1. `actionlint` — lints every workflow YAML file (~seconds, no secrets).
  2. `static-validators` — runs `tests/v2.5-validators/run.sh` (9 cases) + the API-free E2E scenario 01 (engines-state roundtrip). Always runs.
  3. `e2e` — runs `tests/e2e/run.sh` against `claude --print --model sonnet` (4 scenarios). Gated on `ANTHROPIC_API_KEY` repo secret via a probe step that exits clean when missing — fresh forks see green CI.
- **Concurrency:** cancel-in-progress on the same ref to save tokens during fast iteration.
- **Permissions:** `contents: read` (least-privilege).
- **Triggers:** `on: push: branches: [main]` + `on: pull_request` + `on: workflow_dispatch`. NOT `pull_request_target` (would expose maintainer secrets to fork code; intentionally avoided, comment in the workflow file).

The E2E harness lives in [`tests/e2e/`](../tests/e2e/) with 4 scenarios (engines-state roundtrip, skill-discovery, research-first citation, audit-chain clean-tree NOT-APPLICABLE) and the orchestrator `run.sh`. It uses `claude --print --plugin-dir "$REPO_ROOT" --model sonnet` to load HEAD instead of marketplace cache. See [`adr/0009-e2e-print-mode-methodology.md`](adr/0009-e2e-print-mode-methodology.md) for the methodology decision.

Operator recipe (wiring this pattern into a consumer repo): [`usage/ci.md`](usage/ci.md).

## Layer 11 — Obsidian KB pipeline (v3.6+)

A 4-level knowledge base (`_inbox` L0 → `sessions/` L1 → `decisions/`+`gotchas/` L2 → `glossary/` L3) persisted in the operator's Obsidian vault. Captures decisions, gotchas, and patterns automatically on every commit; curates them into a connected graph via wikilinks.

- **Capture (automatic):** `hooks/post-commit-kb.sh` writes a journal bullet to `docs/sessions/` and mirrors it to the vault with `[[client]]`/`[[project]]` wikilinks on every commit. When `kb_pipeline_enabled: true`, dispatches the `kb-pipeline` agent in background to run Capture / Curate / Write phases against the commit diff.
- **ADR mirror (automatic):** When `adr_mirror_enabled: true`, committed ADRs are mirrored to `<vault>/decisions/adr-NNNN-<slug>.md` with Obsidian frontmatter. Idempotent via `source_hash`.
- **Curation (semi-automatic):** `kb-curate` skill promotes L1 journal bullets to L2 curated entries via the `kb-curator` agent. 7-category classification with hybrid control matrix (auto-apply for low-risk categories, `.draft` review for high-risk).
- **Backfill (manual):** `kb-backfill` skill extracts historical knowledge from legacy repos into `_inbox/` via the `kb-backfiller` agent. 4-phase pipeline.
- **Wikilink convention (v3.6):** Every vault write must include inline `[[wikilinks]]` and a `related:` frontmatter field per `batuta-kb-vault` SKILL.md Step 3.5. This is the mechanism that connects notes in the Obsidian graph and enables `research-first-dev` Step 1.5 cross-project lookups.
- **Context injection:** `hooks/session-start.sh` loads client metadata, project status, and recent vault sessions into the agent's context at session start.
- **Config:** Per-project `.claude/kb-config.json` with `enabled`, `client`, `project`, `vault_root`, `adr_mirror_enabled`, `kb_pipeline_enabled`. Machine-wide vault root at `~/.claude/kb-vault.json`.

See [`adr/0012-obsidian-only-kb-pipeline.md`](adr/0012-obsidian-only-kb-pipeline.md) for the architecture decision (single agent, async dispatch, Notion deprecated).

## Skills (invocable workflows)

The plugin ships skills organized by development phase. Each skill has a `SKILL.md` in `skills/<name>/`. Phases:

| Phase | Skills |
|---|---|
| Define | `idea-refine`, `spec-driven-development` |
| Plan | `planning-and-task-breakdown` |
| Build | `incremental-implementation`, `test-driven-development`, `context-engineering`, `source-driven-development`, `frontend-ui-engineering`, `api-and-interface-design` |
| Verify | `browser-testing-with-devtools`, `debugging-and-error-recovery` |
| Review | `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization` |
| Ship | `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`, `documentation-and-adrs`, `shipping-and-launch` |
| Meta (Batuta-specific) | `batuta-project-hygiene`, `batuta-skill-authoring`, `batuta-agent-authoring`, `batuta-rule-authoring`, `research-first-dev`, `using-agent-skills` |
| KB pipeline (Batuta-specific, ADR-0012) | `batuta-kb-vault`, `kb-curate`, `kb-backfill` |
| Architecture / refactor (Batuta-specific) | `code-graph` |
| Deprecated | ~~`notion-kb-workflow`~~ (frozen 2026-05-01 per [ADR-0012](adr/0012-obsidian-only-kb-pipeline.md); replaced by `hooks/session-start.sh` + `hooks/post-commit-kb.sh` + `agents/kb-pipeline.md`) |

Each skill is auto-discoverable via the `using-agent-skills` flowchart. The Batuta-specific meta-skills are mandatory triggers documented in `CLAUDE.md`. The `kb-pipeline` agent (defined in `agents/kb-pipeline.md`, not a skill) is the per-commit dispatch target — it runs Capture / Curate / Write phases against the commit diff and writes to the operator's Obsidian vault.

## Cross-cutting constraints

- All agent files ≤ 150 lines (enforced via `batuta-agent-authoring`).
- All description fields ≤ 150 characters.
- All artifacts in English; conversation in Spanish (operator preference).
- No `Co-Authored-By: Claude` in commits.
- Plugin operates only on Claude Code's native primitives (hooks, agents, skills, slash commands). No external services for core enforcement.
- Windows + Git Bash compatibility: paths normalized at every boundary.

## What this plugin does NOT do

- Does not redefine `permissions.allow`/`deny`. Those remain the operator's domain.
- Does not auto-merge PRs. The operator merges manually after review.
- Does not run on systems without Claude Code 1.x.
- Does not provide UI surfacing of metrics. Metrics are observed via Anthropic billing + transcript inspection.

For the historical and motivational backing of these constraints, see [`PRD.md`](PRD.md). For each major decision and the alternatives rejected, see [`adr/`](adr/).
