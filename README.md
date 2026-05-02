# Batuta Agent Skills

A Claude Code plugin that gives AI coding agents structured engineering workflows, automated quality gates, and durable project memory. Forked from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and extended with delegation, audit enforcement, a knowledge pipeline backed by an Obsidian vault, and a dual-engine code knowledge graph. See [`docs/SPEC.md`](docs/SPEC.md) for the full architecture.

Read these in order to understand the project:

1. [`docs/PRD.md`](docs/PRD.md) -- vision, problem, success metrics
2. [`docs/SPEC.md`](docs/SPEC.md) -- architecture overview (11 layers)
3. [`docs/DELEGATION-RULE.md`](docs/DELEGATION-RULE.md) -- native delegation + post-edit audit chain
4. [`docs/DELEGATION-RULE-SPECIALISTS.md`](docs/DELEGATION-RULE-SPECIALISTS.md) -- agent-architect + model calibration
5. [`docs/usage/`](docs/usage/) -- operator recipes (upgrade, code-graph, consumer-projects, CI)
6. [`docs/adr/`](docs/adr/) -- 12 architecture decision records
7. [`CLAUDE.md`](CLAUDE.md) -- project conventions and session-handoff protocol

If you are switching from Claude Code to another tool mid-feature, read [`docs/PORTABILITY.md`](docs/PORTABILITY.md).

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
 --------------------                  ------------
 21 engineering skills                 10 Batuta-specific skills
 + 7 slash commands                    + 9 agents with explicit model: declarations
 + supplementary checklists            + 5 hooks (SessionStart + 4 PreToolUse)
                                          + post-commit-kb.sh (per-machine git hook)
                                       + Obsidian KB pipeline (auto-capture per commit)
                                       + project doc graph (PRD, SPEC, 12 ADRs, plans, sessions)
                                       + audit chain contract (test -> review -> security)
                                       + rules/ (engineering invariants imported a la carte)
                                       + vendored: writing-skills (MIT), context7 (CC0)
```

Attribution for upstream and vendored sources lives in [`ATTRIBUTION.md`](ATTRIBUTION.md).

## Features

### Agents and delegation

Nine agents ship with explicit `model:` declarations. The main agent picks the delegate based on task complexity (see [`docs/DELEGATION-RULE-SPECIALISTS.md`](docs/DELEGATION-RULE-SPECIALISTS.md) for 12 worked examples).

| Agent | Model | Role |
|-------|-------|------|
| [implementer](agents/implementer.md) | sonnet | Generic implementer for spec-driven slices |
| [implementer-haiku](agents/implementer-haiku.md) | haiku | Trivial-change executor (CSS, rename, config flip, <=3 files no logic) |
| [code-reviewer](agents/code-reviewer.md) | sonnet | GATE 2 -- five-axis review with AUDIT RESULT contract |
| [test-engineer](agents/test-engineer.md) | sonnet | GATE 1 -- test design and coverage |
| [security-auditor](agents/security-auditor.md) | sonnet | GATE 3 -- OWASP-grounded vulnerability scan |
| [agent-architect](agents/agent-architect.md) | sonnet | Meta-agent: creates project-local domain specialists with discovery-first |
| [kb-pipeline](agents/kb-pipeline.md) | sonnet | Per-commit Capture/Curate/Write against the diff, writes to vault |
| [kb-curator](agents/kb-curator.md) | sonnet | Batch L1->L2 promotion of journal bullets to curated knowledge |
| [kb-backfiller](agents/kb-backfiller.md) | sonnet | One-shot historical extraction from legacy repos into the vault |

After any implementation (by any agent or the main), a sequential audit chain runs: `test-engineer` -> `code-reviewer` -> `security-auditor`, each reading `git diff` and returning `AUDIT RESULT: APPROVED|BLOCKED|NOT APPLICABLE`.

### Knowledge pipeline (Obsidian vault)

Per [ADR-0012](docs/adr/0012-obsidian-only-kb-pipeline.md), the Obsidian vault is the single source of truth for project knowledge. The pipeline operates at four levels:

- **L0 (inbox)** -- raw captures, unprocessed.
- **L1 (journals)** -- session bullets written automatically on every commit by `hooks/post-commit-kb.sh`.
- **L2 (curated)** -- decisions, gotchas, playbooks promoted from L1 by the `kb-pipeline` agent (per-commit, background) or by `/kb-curate` (batch).
- **L3 (glossary)** -- stable definitions and cross-project references.

Key behaviors:
- **Auto-capture per commit**: when `kb_pipeline_enabled: true` in `.claude/kb-config.json`, the post-commit hook dispatches the `kb-pipeline` agent in a detached background process. The commit returns immediately.
- **Session-start context loading**: `hooks/session-start.sh` reads client metadata, project status, and the last 3 vault sessions into the agent's context automatically.
- **Research-first vault lookup**: the `research-first-dev` skill checks the vault for prior decisions before reaching for external docs.
- **Wikilinks and frontmatter**: all vault entries carry Obsidian-compatible frontmatter and use `[[wikilinks]]` for cross-references.

Notion is deprecated for internal use (kept only when a client needs read access). The old `notion-kb-workflow` skill is frozen.

### Engineering invariants (rules/)

The `rules/` layer ships declarative invariants that consumer projects import via `@.claude/rules/<rule>.md` in their `CLAUDE.md`. Symlinks are created by `tools/setup-rules.sh`. Current rules cover research-first citations, secrets/PII handling, code style, code-graph usage, and authoring gates. New rules must pass the `batuta-rule-authoring` admission gate. See [`rules/README.md`](rules/README.md).

### Code knowledge graph

Architecture and dependency questions are answered from a persisted graph, not by re-reading files every time. The `code-graph` skill supports two engines:

- **graphify** (primary) -- multimodal, processes docs and images alongside code.
- **codebase-memory-mcp** (fallback) -- code-only, stable on Windows.

Engine selection is automatic based on `~/.claude/code-graph-engines.json`. Bootstrap both with `tools/setup-code-graph.sh`. See [ADR-0007](docs/adr/0007-code-graph-dual-engine.md).

## Full skill inventory (33 skills)

### Upstream -- addyosmani/agent-skills (21 skills)

Inherited verbatim from the upstream marketplace. See the [upstream repo](https://github.com/addyosmani/agent-skills) for full descriptions.

| Phase | Skill | One-line role |
|-------|-------|---------------|
| Define | `idea-refine` | Refine ideas through structured divergent + convergent thinking |
| Define | `spec-driven-development` | Write a spec before code; requirements first |
| Plan | `planning-and-task-breakdown` | Decompose specs into atomic, ordered tasks |
| Build | `incremental-implementation` | Land changes in small slices, never one big drop |
| Build | `test-driven-development` | Write the failing test first, then make it pass |
| Build | `context-engineering` | Optimize agent context (rules + memory + retrieval) at session start |
| Build | `source-driven-development` | Ground implementation in cited official documentation |
| Build | `frontend-ui-engineering` | Build production-quality UIs (a11y, design tokens, state) |
| Build | `api-and-interface-design` | Design stable APIs, module boundaries, type contracts |
| Verify | `browser-testing-with-devtools` | Test in real browsers via Chrome DevTools MCP |
| Verify | `debugging-and-error-recovery` | Systematic root-cause debugging, not guesswork |
| Review | `code-review-and-quality` | Multi-axis code review before merge |
| Review | `code-simplification` | Reduce accidental complexity without changing behavior |
| Review | `security-and-hardening` | OWASP-grounded vulnerability scan + hardening |
| Review | `performance-optimization` | Profile-then-optimize Core Web Vitals + load times |
| Ship | `git-workflow-and-versioning` | Atomic commits, branches, conflict resolution |
| Ship | `ci-cd-and-automation` | Pipeline setup, gated jobs, deployment automation |
| Ship | `deprecation-and-migration` | Sunset old systems and migrate users safely |
| Ship | `documentation-and-adrs` | Record decisions and write docs future engineers can read |
| Ship | `shipping-and-launch` | Pre-launch checklist, monitoring, rollback |
| Meta | `using-agent-skills` | Discovery flowchart that routes to the right skill |

### Batuta-specific -- added by this fork (10 skills)

Most have mandatory triggers documented in [`CLAUDE.md`](CLAUDE.md) so they fire without operator intervention.

| Skill | Auto-trigger | Role |
|-------|-------------|------|
| `batuta-project-hygiene` | Session start (no CLAUDE.md) or before feature work | Bootstrap project rules, doc graph, GitHub repo, KB config. Three modes: `project-init`, `project-retrofit`, `feature-init` |
| `batuta-skill-authoring` | Before any new `skills/<name>/SKILL.md` | Discover-first gate against 91k+ skills.sh catalog. Marker-file enforced by hook |
| `batuta-agent-authoring` | Before any new `agents/<name>.md` | Distinctness check against existing agents, tool-minimality |
| `batuta-rule-authoring` | Before any new file under `rules/` | Validates canonical format, conventions, N=2 admission gate |
| `research-first-dev` | Before code that imports any uncited external dependency | Context7 lookup, web-search fallback, `// Source:` citation at import site |
| `code-graph` | Architecture/dependency questions or session start on >5k-LOC repo | Dual-engine code knowledge graph. Four modes: `--scan`, `--watch`, `--mcp`, `--query` |
| `batuta-kb-vault` | When bootstrapping or operating the Obsidian vault | Defines L0-L3 vault structure, frontmatter contracts, tagging, inbox drain |
| `kb-curate` | PR-merge / `/kb-curate` / weekly cron / session end | Promotes journal bullets (L1) to curated decisions, gotchas, playbooks (L2/L3) |
| `kb-backfill` | One-shot on legacy repos | 4-phase extraction: README/CHANGELOG, commits, GitHub issues+PRs, code analysis |
| ~~`notion-kb-workflow`~~ | **DEPRECATED** ([ADR-0012](docs/adr/0012-obsidian-only-kb-pipeline.md)) | Frozen. Replaced by vault hooks + kb-pipeline agent. Do not invoke |

### Vendored -- upstream copies in skills/_vendored/ (2 skills)

| Vendored skill | Origin | License |
|----------------|--------|---------|
| `writing-skills` | obra/superpowers | MIT |
| `context7` | intellectronica/context7 | CC0 |

## Layers

The plugin contains two independent layers. They do not overlap; pick the right one for the content you are adding.

| Layer | Question | Activation | Format |
|-------|----------|------------|--------|
| [`skills/`](skills/) | "What do I do when X situation arises?" | Auto-invocation by Claude Code via skill description matching | `SKILL.md` per directory with `name`/`description` frontmatter |
| [`rules/`](rules/) | "How must the code look always?" | Explicit `@<path>` import from a project's `CLAUDE.md` | Plain Markdown with light frontmatter (`title`/`applies-to`/`last-reviewed`) |

See [`rules/README.md`](rules/README.md) for the full layer documentation and [`rules/_meta/how-to-import.md`](rules/_meta/how-to-import.md) for the consumer protocol.

## Reference checklists

| Reference | Covers |
|-----------|--------|
| [testing-patterns.md](references/testing-patterns.md) | Test structure, naming, mocking, React/API/E2E examples |
| [security-checklist.md](references/security-checklist.md) | Pre-commit checks, auth, input validation, OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Core Web Vitals targets, frontend/backend checklists |
| [accessibility-checklist.md](references/accessibility-checklist.md) | Keyboard nav, screen readers, ARIA, testing tools |

## Merging upstream updates

```bash
git fetch upstream
git merge upstream/main
```

Expect conflicts in `CLAUDE.md`, `README.md`, `agents/*.md`, `hooks/hooks.json`, and `docs/`. The Batuta architecture supersedes upstream defaults -- preserve Batuta on every conflict unless the upstream change is a bugfix in a skill body.

## Cross-tool portability

The plugin's runtime enforcement (hook, audit chain, agent delegation) is specific to **Claude Code 1.x**. The doc graph (PRD/SPEC/ADRs/plans/sessions) is plain Markdown and ports to any tool that reads project files. If you need to continue work in Cursor, Codex CLI, Aider, or another tool, see [`docs/PORTABILITY.md`](docs/PORTABILITY.md) for what survives the switch.

## Contributing

Skills should be specific (actionable steps, not vague advice), verifiable (clear exit criteria), battle-tested (based on real workflows), and minimal (only what guides the agent). See [docs/skill-anatomy.md](docs/skill-anatomy.md) for the format and [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT -- use these skills in your projects, teams, and tools.
