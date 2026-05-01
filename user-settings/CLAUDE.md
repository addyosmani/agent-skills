# User-level rules (jota-batuta)

These rules apply to every Claude Code session, on every project, regardless of per-project CLAUDE.md. Project CLAUDE.md can add or narrow scope but must not contradict these.

## Research-first (non-negotiable)

Before writing code that uses any external library, API, or service:

1. Context7 lookup for the exact version in the project's dependency manifest.
2. If Context7 has no coverage or the version is outdated, web search against the official documentation domain or the library's GitHub repository.
3. Add a source-citation comment at the import site: `// Source: <url> (verified YYYY-MM-DD, <lib>@<version>)`.

Research is cheap, rework is expensive. Trust is not a substitute for verification. This is enforced by the `research-first-dev` skill from `batuta-agent-skills`.

## Divergent then convergent thinking

For any non-trivial decision (architecture, data model, flow, stack choice):

1. **Diverge** — list at least three viable approaches. Include the one that looks obviously right. Do not collapse early.
2. **Converge** — pick one, and for each alternative state the concrete reason it was rejected (cost, complexity, scope, risk). Quantify when possible.
3. Record the decision as an ADR or a bullet in the project's session notes.

Stopping at the first workable idea is the most common failure mode. Force the divergent step even when you think you know.

## Commit after every change

After every meaningful change:

1. `git status` + `git diff` — confirm scope matches intent.
2. `git add <specific files>` — never `git add -A` unless the repo is a fresh scaffold.
3. `git commit` with a message that explains the *why*, not only the *what*.

Never leave uncommitted work at the end of a session. A 10-line dirty tree tomorrow is 2 hours of re-understanding.

## New project = GitHub repo on day 0

If you start a new project:

1. `gh repo create jota-batuta/<name> --private` (or `--public` if it is an open-source artifact like a plugin fork).
2. `git init` + `git remote add origin <url>` + first commit + `git push -u origin main` before writing any feature code.
3. Open a draft PR for the first feature branch immediately. Work on the branch, push often.

A project that lives only on your disk is a project that will never ship. The GitHub repo is the real project.

## PR policy (always create, never merge)

1. Every change goes through a PR — no direct pushes to `main` or `master`.
2. Claude creates PRs via `gh pr create`. Claude never merges PRs.
3. The operator (jota-batuta) merges manually after review.
4. Commits must not include `Co-Authored-By: Claude` or any AI attribution.

## Language policy

- Conversations with the operator: Spanish.
- Artifacts (code, README, SKILL.md, commit messages, PR descriptions, ADRs, tests): English.
- User-facing guides intended for Spanish-speaking clients: Spanish.

One exception to the artifact rule: `docs/` aimed at internal team members may be Spanish if explicitly stated in the project CLAUDE.md.

## Obsidian KB as durable memory (ADR-0012, supersedes Notion KB workflow)

Per ADR-0012 in `batuta-agent-skills`, Obsidian is the single source of truth for the KB. Notion is deprecated for internal Batuta use (kept only when a client needs read access). The vault lives at `~/.claude/kb-vault.json` → `vault_root` (machine-wide config), structured as `<vault>/clients/<slug>/projects/<slug>/{sessions,sprints,decisions,gotchas,tasks}/` plus shared `<vault>/{decisions,gotchas,playbooks,glossary,_inbox,templates}/`.

**Automatic at session start**: `hooks/session-start.sh` reads `<project>/.claude/kb-config.json` and injects client metadata, project status, last 3 vault sessions, and the active plan into the main agent's context. No manual command needed. If the config is missing, `batuta-project-hygiene mode=project-init` triggers and presents a numbered menu of existing clients from the vault before asking for a new one.

**Automatic per commit**: `hooks/post-commit-kb.sh` writes a journal bullet to `docs/sessions/` and mirrors it to the vault. Two opt-in flags in `.claude/kb-config.json` (default `false`):

- `adr_mirror_enabled: true` → ADRs touched by the commit are copied to `<vault>/decisions/adr-NNNN-<slug>.md` with Obsidian frontmatter, idempotent via `source_hash`.
- `kb_pipeline_enabled: true` → dispatches the `kb-pipeline` agent in background (`nohup timeout 120 claude --print ... & disown`); the agent runs Capture / Curate / Write phases against the commit diff and writes to vault L2 (decisions / gotchas / playbooks) or `_inbox/` (rejected / pending).

**Manual when needed**: `/kb-curate` for batch L1→L2 promotion of accumulated journal bullets. `/kb-end-session` closes the project journal.

**Deprecated**: `notion-kb-workflow --read | --init | --append`. Frozen as of 2026-05-01. Do not invoke.

The context window is not memory. The Obsidian vault is.

## Claude Code boundaries

- Use sub-agents (Task tool) for any work that touches many files or requires research. Keep the main session's context budget under 50% utilization.
- Never block the main session waiting for a long-running process. Use `run_in_background: true` on Bash.
- For deploys, prefer local `docker compose` first; cloud after local is proven,
- For payments, auth secrets, and PII: never commit to the repo, never log in plaintext.
- Never expose secrets or keys to GitHub.

## Autonomous project hygiene

At the start of any session, before writing or editing files, invoke the `batuta-project-hygiene` skill (from the `batuta-agent-skills` plugin) with `mode=project-init` if the current working directory:

- has no `CLAUDE.md` at its root, AND
- contains at least one of: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or a `.git/` directory.

Before starting work on a new feature — when the operator describes a new feature, capability, or slice — invoke `batuta-project-hygiene` with `mode=feature-init <name>`. The skill handles folder convention, scoped CLAUDE.md, and SPEC.md placement. Do not create CLAUDE.md or feature folders manually in these two cases — delegate to the skill.

Before delegating implementation work on an existing project — when the implementer returns a BLOCKER citing missing doc skeleton (`docs/plans/active/` or `specs/current/` not present) — invoke `batuta-project-hygiene` with `mode=project-retrofit`. The mode is purely additive: it completes what is missing without overwriting what exists. Required when a project bootstrapped against an older plugin version or a stale plugin cache (phantom-SHA scenarios) and is now stuck because `mode=project-init` no longer fires (gated on missing CLAUDE.md). Documented in the v2.4 release notes.

### Feature files NEVER go at project root

A project can have one feature or many. Every feature gets its own subfolder under the project's features root (`src/`, `packages/`, `app/`, or `features/` — whichever the project uses). Both `SPEC.md` and `CLAUDE.md` for a feature MUST be created inside that feature's subfolder, NEVER at the project root.

Required layout (project with N features):

```
<project-root>/
├── CLAUDE.md                ← project-wide rules (one file, shared by all features)
├── <manifest>               ← pyproject.toml / package.json / Cargo.toml / go.mod
└── src/                     ← features root (or packages/, app/, features/, crates/)
    ├── feature-one/
    │   ├── CLAUDE.md        ← scoped to feature-one
    │   ├── SPEC.md          ← scoped to feature-one
    │   ├── tasks/           ← task breakdown for feature-one
    │   └── <source files>
    ├── feature-two/
    │   ├── CLAUDE.md
    │   ├── SPEC.md
    │   └── <source files>
    └── feature-three/
        ├── CLAUDE.md
        ├── SPEC.md
        └── <source files>
```

### Decisión previa — ¿el código está organizado por feature o por capa técnica?

Antes de elegir el features root, inspeccioná la estructura existente:

- **Por feature** (vertical slices): cada subfolder bajo `src/`, `packages/`, `app/` contiene un módulo completo de negocio (modelo + vista + lógica + tests). Típico en Next.js App Router, monorepos JS/TS, Rust workspaces.
  → Usá el árbol de auto-detección normal (`src/<feature>/`, `packages/<feature>/`, etc.).

- **Por capa técnica** (horizontal layers): los subfolders son `models/`, `views/`, `services/`, `activities/`, `reports/`, `tools/`. Típico en Django, Rails, Temporal workers, FastAPI apps con separación clásica.
  → **NO muevas código.** Los features viven documentalmente en `docs/features/<feature>/` con su `CLAUDE.md`, `SPEC.md`, `PRD.md`. El CLAUDE.md de cada feature lista qué archivos de las capas técnicas la implementan (mapa feature→código).

**Por qué**: forzar un refactor a `src/<feature>/` en proyectos monolito-por-capa rompe imports, tests y registros de worker/router con riesgo desproporcionado al beneficio. La documentación vive en `docs/` de forma honesta; el código queda donde está.

**Regla de bolsillo**: si mover código requeriría un PR de >20 archivos solo para reubicar, estás en el caso "por capa" → `docs/features/`.

Hard rules:

1. **NEVER** create `SPEC.md` at the project root. Specs are scoped to features — they live in `src/<feature>/`, `packages/<feature>/`, `app/<feature>/`, or `crates/<feature>/` (feature-oriented projects), or in `docs/features/<feature>/` (layer-oriented projects — Django, Rails, FastAPI, Temporal).
2. **NEVER** overwrite an existing project-level `CLAUDE.md` during `feature-init`. Project-wide and feature-scoped CLAUDE.md are separate files at different levels.
3. If the upstream `/spec` command from `agent-skills` would write to root, redirect its target to the feature subfolder. The upstream default is wrong for multi-feature projects — override.
4. Auto-detect the features root from the project structure before asking the operator:
   - **Layered project** (subpaquetes bajo `src/` son `models/`, `views/`, `services/`, `activities/`, `reports/`, `tools/`, etc.) → `docs/features/<feature>/` (docs-only; el código queda en su capa original)
   - `pyproject.toml` with `src/` directory and feature-named subpackages → `src/<feature>/`
   - `package.json` with `packages/` → `packages/<feature>/`
   - Next.js App Router (`app/` directory) → `app/<feature>/`
   - `Cargo.toml` with `[workspace]` → `crates/<feature>/`
   - Fallback → `features/<feature>/`

   Persist the chosen convention in the project-level `CLAUDE.md` under `## Feature folder convention` with explicit `style:` (`feature-oriented` or `layered`) and `features-root:` fields, so future features don't re-ask.
5. Scoped `CLAUDE.md` must be short (≤ 60 lines) and only contain rules unique to the feature: scope, boundaries, patterns. Do NOT restate user-level or project-level rules — those inherit automatically through Claude Code's nested CLAUDE.md loading.

This prevents the monorepo-spaghetti failure mode where every feature dumps a `SPEC.md` at root and no one can tell which spec belongs to which piece of code.

## Native delegation + post-edit audit

The main agent uses Claude's native judgment for the delegate-vs-edit decision. The plugin provides high-quality subagents as the destination when delegation is chosen, and enforces an audit chain post-edit on any staged diff.

**Subagent destinations** (when Claude delegates):

- `implementer` (Sonnet) — multi-file slices, control flow, async, integrations
- `implementer-haiku` (Haiku) — trivial edits ≤ 3 files no new conditional/async
- `code-reviewer`, `test-engineer`, `security-auditor` (Sonnet) — sequential audit chain
- `agent-architect` (Sonnet) — meta-agent that creates project-local specialists

When delegating, the main picks the model **by task complexity, not surface area**:

- **Haiku** — trivial: CSS or string change, rename without signature shifts, README/CHANGELOG edit, config flip, ≤ 3 files with no new conditional or async.
- **Sonnet** (default) — anything with control flow, tests, integrations, async, error handling, or refactor across modules.
- **Opus** (justified exception) — only compliance, regulation, legal, or forensic-accounting work where errors carry legal cost (Colombian e-invoicing compliance, Colombian labor law, GDPR, forensic audit).

**Post-edit audit chain** (always runs when there's a staged diff):

```
implementer | implementer-haiku | <specialist> | <main edits> → test-engineer → code-reviewer → security-auditor
```

The chain is sequential and each gate reads `git diff`. NOT-APPLICABLE returns immediately on a clean tree. The chain applies regardless of who produced the diff — the main agent or a subagent.

**Hard kill-switches** (plugin-enforced, not negotiable):

- `.claude/settings*.json`, `.claude/hooks/*`, `.claude/agents/*`
- `.env`, `.env.*`, `secrets/*`

Everything else: Claude's native judgment. Direct edits from the main are allowed on all other paths.

If the slice needs domain expertise the base agents don't cover, invoke `agent-architect` FIRST to create or reuse a project-local specialist at `<project>/.claude/agents/<name>.md`. Discovery-first against project-local + user-global + plugin agents to avoid duplicates.

See plugin `batuta-agent-skills/docs/DELEGATION-RULE.md` for the full contract, `docs/DELEGATION-RULE-SPECIALISTS.md` for the task-complexity calibration table, and `docs/adr/0006-trust-native-delegation.md` for the v2.7 realignment rationale.

**After exiting plan mode**, run `/save-plan <slug>` (added in v2.6) to copy the plan from `~/.claude/plans/<auto-name>.md` to `<project>/docs/plans/active/<YYYY-MM-DD>-<slug>.md`. Plan mode's default location is user-global ephemera; the project-local plan is canonical and travels with the code via git. The implementer pre-flight check rejects any slice whose plan is not at the project-local path — there is no improvising. ADR-0005 documents why this is a slash command rather than a runtime hook (the `ExitPlanMode` tool does not expose the plan file path, making automatic detection fragile).

**For projects that already have CLAUDE.md but lack `docs/PRD.md`, `docs/SPEC.md`, `docs/plans/active/`, or related skeleton**, invoke `batuta-project-hygiene` with `mode=project-retrofit` (added in v2.4). The mode is purely additive — completes what is missing without overwriting what exists. Use it when a project bootstrapped against an older plugin version or against a stale cache (phantom SHA scenarios).

## Engineering invariants from `rules/` (batuta-agent-skills)

The plugin ships a `rules/` layer with declarative engineering invariants that any project can import à la carte: research-first citations, secrets/PII handling, code style, and (over time) stack-specific and Colombia-specific patterns. Imports keep the project's own `CLAUDE.md` short — universal conventions live in plugin-provided modules, not copied per project.

**For a NEW project**: the `batuta-project-hygiene` skill (`mode=project-init`) auto-bootstraps the rule symlinks as part of its flow. The operator gets prompted "Bootstrap engineering invariants from batuta-agent-skills? (Y/n)" — answering Y runs `tools/setup-rules.sh --all` and pre-populates the project's `CLAUDE.md` with `@.claude/rules/<rule>.md` import lines. No manual action required beyond answering the prompt.

**For an EXISTING project** that did not run hygiene at init time: invoke `batuta-project-hygiene` again, OR run manually:

```bash
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-rules.sh --all
```

Then add `@.claude/rules/<rule>.md` lines to the project's `CLAUDE.md` (one per imported rule). On the next Claude Code session start the rules load automatically into context.

**Updates** propagate via `/plugin update batuta-agent-skills` — the symlinks point at the plugin install path, so rule contents update on each plugin pull. New rules added to the plugin require re-running the setup script (idempotent).

**Add `.claude/rules/` to your project `.gitignore`** — symlinks are per-machine and break on clones without the plugin installed.

See plugin `batuta-agent-skills/rules/_meta/how-to-import.md` for the full consumer protocol, exception protocol when a rule does not apply, and troubleshooting.
