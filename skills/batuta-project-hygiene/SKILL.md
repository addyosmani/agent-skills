---
name: batuta-project-hygiene
description: Bootstraps CLAUDE.md, doc skeleton (PRD/SPEC/ADR/plans/sessions), and GitHub repo. Use at session start or before SPEC.md/feature CLAUDE.md. Feature files NEVER at root. project-init | feature-init.
---

# Batuta Project Hygiene

## Overview

**Eliminate the manual CLAUDE.md step.** Projects need a rules file before the first code change, and features need a scoped rules file before the first spec. If the operator has to remember to create these, they will not get created. This skill auto-invokes on the two triggers where it matters: session start on an uninitialized project, and the moment a new feature is announced.

Two modes, both invoked without user typing a slash command:

- **`project-init`** — the project root has no `CLAUDE.md` but looks like a project. Bootstraps rules file + GitHub repo + first commit.
- **`feature-init`** — the operator described a new feature, capability, or slice. Creates a scoped sub-folder with its own `CLAUDE.md` and `SPEC.md`, then hands off to `spec-driven-development`.

This skill does not replace `spec-driven-development` — it prepares the filesystem so `spec-driven-development` has somewhere correct to write.

### Target layout

A project can hold one feature or many. Every feature lives in its own subfolder under the project's features root. Feature-scoped `SPEC.md` and `CLAUDE.md` NEVER live at project root.

```
<project-root>/
├── CLAUDE.md                ← project-wide rules (one file, shared by all features)
├── <manifest>               ← pyproject.toml / package.json / Cargo.toml / go.mod
└── src/                     ← features root (or packages/, app/, features/, crates/)
    ├── feature-one/
    │   ├── CLAUDE.md        ← scoped to feature-one
    │   ├── SPEC.md          ← scoped to feature-one
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

### Alternate layout — layered projects (Django, Rails, FastAPI monolith, Temporal workers)

When subpackages are technical layers (`models/`, `views/`, `services/`, `activities/`, `reports/`, `tools/`, etc.), code is NOT moved. Features live as documentation under `docs/features/`, and each feature's scoped `CLAUDE.md` maps which layer files implement it.

```
<project-root>/
├── CLAUDE.md                ← project-wide rules
├── pyproject.toml
├── src/<pkg>/               ← code organized by layer (untouched by hygiene)
│   ├── models/
│   ├── services/
│   ├── activities/
│   └── reports/
└── docs/
    └── features/
        ├── daily-report/
        │   ├── CLAUDE.md    ← maps which layer files implement the feature
        │   └── SPEC.md
        └── login-email/
            ├── CLAUDE.md
            └── SPEC.md
```

Rule of thumb: if relocating code into `src/<feature>/` would require a PR touching >20 files purely to reorganize, the project is layered → use `docs/features/<feature>/` instead.

## When to Use

### Mode `project-init`

Auto-trigger when **all** of these are true at session start:

- `./CLAUDE.md` does not exist.
- `./` contains at least one of: `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `pom.xml`, `Gemfile`, `.git/`.

Do NOT trigger:
- In a plain directory with no project markers (the operator may be exploring, not initializing).
- If `CLAUDE.md` already exists, even if empty — respect the operator's choice.
- Inside `node_modules/`, `.git/`, `target/`, `dist/`, `vendor/`, or other generated directories.

### Mode `project-retrofit` (auto-trigger at session start)

Auto-trigger when **all** of these are true:

- `./CLAUDE.md` EXISTS, AND
- ANY of the following is missing: `docs/PRD.md`, `docs/SPEC.md`, `docs/plans/active/`, `docs/sessions/`, `.claude/kb-config.json`.

Run silently — no announcement, no confirmation. Just add what is missing and report a one-line summary at the end. This prevents every session start from requiring a manual hygiene invocation on projects that have CLAUDE.md but were bootstrapped against an older plugin version.

### Mode `feature-init`

Auto-trigger when the operator describes a new feature with phrases like:

- "voy a empezar/hacer la feature X"
- "vamos a implementar X"
- "necesito agregar X al proyecto"
- "start/implement feature X"

Do NOT trigger:
- When the operator asks a question about an existing feature.
- When the operator asks for code inside a file that already has a feature folder.
- When the operator is in mid-session on the same feature (check git branch + recent commits).

## Process

### Mode: `project-init`

0. **Detect organization style** — feature-oriented (vertical slices) vs layer-oriented (horizontal layers). This runs BEFORE stack detection because it decides where feature docs will live.

   Inspect immediate children of `src/`, `packages/`, `app/`, or the project root (depending on manifest):

   - Names like `models/`, `views/`, `services/`, `controllers/`, `activities/`, `workflows/`, `reports/`, `tools/`, `schemas/`, `repositories/`, `handlers/`, `tasks/`, `routers/` → **layer-oriented**.
   - Names like business-domain terms (`auth/`, `billing/`, `daily-report/`, `user-profile/`, `checkout/`) → **feature-oriented**.
   - Empty `src/` or mixed signals → ask the operator once:
     ```
     ¿Cómo está organizado el código?
       1) Por feature (vertical slice — cada carpeta es un módulo de negocio completo)
       2) Por capa técnica (horizontal — models/, services/, views/, etc.)
     ```

   Record the answer in the generated `CLAUDE.md` under `## Feature folder convention` using this format:

   ```markdown
   ## Feature folder convention

   style: <feature-oriented | layered>
   features-root: <path-template>
   ```

   - Feature-oriented example: `features-root: src/<feature>/`
   - Layered example: `features-root: docs/features/<feature>/` (code lives in existing technical layers; feature folders are docs-only)

1. **Detect stack** from manifest files. Map to stack name:
   - `package.json` with `"next"` dep → `nextjs`
   - `package.json` with `"react"` dep → `react`
   - `package.json` with `"express"` / `"fastify"` → `node-api`
   - `pyproject.toml` or `requirements.txt` with `fastapi` → `fastapi`
   - `pyproject.toml` with `django` → `django`
   - `Cargo.toml` → `rust`
   - `go.mod` → `go`
   - otherwise → `generic`

2. **Invoke built-in `/init`** to get a stack-aware baseline `CLAUDE.md`. This populates Tech Stack, Commands, and Project Structure from the actual files.

3. **Append Batuta sections** to the generated `CLAUDE.md`:
   - `## Mandatory Skills for Batuta Projects` — copy verbatim from this plugin's root `CLAUDE.md`.
   - `## Feature folder convention` — **placeholder**, filled in on first `feature-init` invocation (see Mode: feature-init step 1).

4. **Create project documentation skeleton** (skip any file that already exists):

   ```bash
   mkdir -p docs/adr docs/plans/active docs/plans/archive docs/sessions
   touch docs/plans/active/.gitkeep docs/plans/archive/.gitkeep docs/sessions/.gitkeep
   ```

   `docs/PRD.md` — vision anchor (start with this skeleton; expand to ~70 lines as Vision/Constraints/Roadmap become real):
   ```markdown
   # PRD — <project-name>

   ## Problem
   <TODO: fill in>

   ## Vision
   <TODO: fill in>

   ## Users
   <TODO: fill in>

   ## Success metrics
   | Metric | Baseline | Target |
   |---|---|---|
   | <TODO> | — | — |

   ## Non-goals
   <TODO: fill in>

   ## Constraints
   <TODO: fill in>
   ```

   `docs/SPEC.md` — architecture anchor (start with this skeleton; grow to ~150 lines as components stabilize):
   ```markdown
   # SPEC — <project-name>

   ## Component map
   <!-- TODO: paste block diagram here -->

   ## Architecture summary
   <TODO: one paragraph>

   ## Cross-cutting constraints
   - <TODO: bullet per constraint>

   ---
   *See also: [PRD](PRD.md) · [ADRs](adr/)*
   ```

   `docs/adr/0001-template-decision.md` — ADR format reference (≤40 lines):
   ```markdown
   # ADR 0001 — Template Decision

   **Status:** Template
   **Date:** YYYY-MM-DD
   **Deciders:** <names>

   ## Context
   Rename this file to `NNNN-<your-title>.md` when you write your first real ADR.
   Describe the situation and the forces at play.

   ## Decision
   State the chosen option.

   ## Alternatives considered
   | Option | Rejected because |
   |---|---|
   | Option A | <reason> |

   ## Consequences
   Positive: …
   Negative: …
   ```

4a. **Cross-tool bootstrap (auto-apply, no prompt)** — for projects with a manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`), create these files automatically. Skip only on pure-docs repos with no manifest markers. Do NOT ask the operator — just proceed.

   **Skip each file if it already exists (idempotent).**

   `AGENTS.md` (project root, ≤ 30 lines) — mirrors CLAUDE.md essentials in the cross-tool AGENTS.md standard so agents other than Claude Code can orient themselves. Points to docs/ — does NOT duplicate full content:

   ```markdown
   # AGENTS.md — <project-name>

   > Cross-tool agent instructions. For Claude Code, see CLAUDE.md.
   > Rule #0: read docs/DELEGATION-RULE.md before touching any file.

   ## Project overview
   <TODO: one-sentence summary — copy from docs/PRD.md when filled>

   ## Doc graph
   | Doc | Purpose |
   |---|---|
   | [docs/PRD.md](docs/PRD.md) | Vision, constraints, success metrics |
   | [docs/SPEC.md](docs/SPEC.md) | Architecture overview and component map |
   | [docs/plans/active/](docs/plans/active/) | Active task plans (start here for open work) |
   | [docs/sessions/](docs/sessions/) | Session journals — last entry has "Next entry point" |
   | [docs/adr/](docs/adr/) | Architecture decision records |

   ## Rule #0 summary
   Delegate only. Never invent an approach not in a plan or spec.
   Full rule: [docs/DELEGATION-RULE.md](docs/DELEGATION-RULE.md)
   ```

   `.aider.conf.yml` (project root, ≤ 15 lines) — created by default (or if the operator mentions Aider); skip otherwise. Lists the key context files so Aider's `--read` flag picks them up automatically:

   ```yaml
   # Aider configuration — auto-generated by batuta-project-hygiene
   # Docs: https://aider.chat/docs/config/aider_conf.html
   # Note: Aider in a non-Claude-Code session cannot run the audit chain.
   # auto-commits: false ensures Aider does not silently rewrite files outside the audit cycle.
   # Consider also setting auto-lint: false if your linter could mutate files unexpectedly.
   read:
     - AGENTS.md
     - docs/PRD.md
     - docs/SPEC.md
     - docs/plans/active/
   auto-commits: false
   ```

   **Do NOT create** `.cursor/rules/`, `GEMINI.md`, or `.windsurfrules` — the operator opts into those per-tool. `AGENTS.md` and `.aider.conf.yml` are the only auto-bootstrapped cross-tool files.

4b. **Engineering invariants bootstrap (auto-apply, no prompt)** — for projects with a manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`), run the following automatically. Skip only on pure-docs repos with no manifest markers. Do NOT ask the operator.

   - Run `bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-rules.sh --all` (deterministic path matching the install layout enforced by the plugin's own setup script; do not introduce a `find`-based lookup here). The code-graph engine bootstrap is a separate operator-side step — `setup-rules.sh` does NOT chain into it (changed in v4.0). After the rule import succeeds, also run `bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh` to install codebase-memory-mcp; a non-zero exit from this step is reported but does NOT abort hygiene — the project still completes init/retrofit even if the engine is unavailable on this OS.
   - Append to project's `CLAUDE.md` immediately after the section header `## Mandatory Skills for Batuta Projects` block, a new section:

     ```markdown
     ## Engineering invariants (imported from batuta-agent-skills)

     @.claude/rules/research-first-citations.md
     @.claude/rules/secrets-and-pii.md
     @.claude/rules/code-style.md
     ```

   - Append `.claude/rules/` to the project's `.gitignore` idempotently. Defensive form that handles missing trailing newline:
     ```bash
     if ! grep -qxF '.claude/rules/' .gitignore 2>/dev/null; then
       [ -s .gitignore ] && [ -n "$(tail -c1 .gitignore)" ] && echo "" >> .gitignore
       echo '.claude/rules/' >> .gitignore
     fi
     ```
     (Creates the file if missing; ensures a newline before append if existing file lacks one; never duplicates the entry on re-runs.) Symlinks are per-machine.

   **Verification:** `test -L .claude/rules/research-first-citations.md` (a symlink exists) and `grep -q "@.claude/rules/" CLAUDE.md`.

4c. **KB capture hook installation (auto-apply, no prompt)** — for projects with a `.git/` directory (or after step 5 has run `git init`), install the hook automatically. Skip only on pure-docs repos with no manifest markers.

   **Vault path resolution (run FIRST — needed by client discovery below):**
   1. Read `~/.claude/kb-vault.json` → `.vault_root` field. This is the machine-level source of truth, set once per machine.
   2. If that file doesn't exist: ask the operator *"¿Dónde está tu vault de Obsidian? (ruta absoluta, ej: /e/Gdrive.../OBSIDIAN/BATUTA/BATUTA)"*. Save the answer to `~/.claude/kb-vault.json` so future projects never ask again.
   3. Never write a shell template (`${VAULT_ROOT:-…}`) or tilde path into `kb-config.json` — the hook doesn't eval shell expressions.

   **Client discovery (vault scan — runs BEFORE asking for client slug):**
   - List `<vault_root>/clients/*/` directories. For each, read `_metadata.md` frontmatter to extract `name` (full client name) and `industry`.
   - Build a numbered menu:
     ```
     Detecté estos clientes en tu vault:
       1. jota-batuta — Batuta self
       2. kiosco — El Kiosco Golosinas SAS (Alimentos/Distribución)
       3. kiro — Kiro Group
       N. <cliente nuevo>

     ¿A cuál pertenece este proyecto? (número o slug nuevo)
     ```
   - If operator picks an existing client by number or slug → use that as `client`. Skip the slug inference below.
   - If operator types a new slug or `N`, follow up:
     ```
     Cliente nuevo. Decime:
       - Nombre completo (ej: Grupo Empresarial Chesco):
       - Industria (ej: Conglomerado / Manufactura / Servicios):
       - País (ej: Colombia):
       - Slug definitivo (kebab-case, ej: chesco):
     ```
     Then create `<vault_root>/clients/<slug>/_metadata.md` with frontmatter:
     ```yaml
     ---
     type: client
     name: <full name>
     slug: <slug>
     status: active
     industry: <industry>
     country: <country>
     created_at: <YYYY-MM-DD>
     last_verified: <YYYY-MM-DD>
     tags: [client/<slug>]
     ---
     ```
     plus a one-line body describing the engagement context.
   - **Skip the menu** if `vault_root` is unreachable (offline machine, Drive not synced) — fall back to slug inference below and log a warning to `.claude/kb-debug.log`.
   - **Read-only vault fallback**: when the vault is reachable for reads but a write fails (Drive sync conflict, permission error, Drive quota), do NOT abort. Log `WARN hygiene: vault read-only — created kb-config.json with client=$slug but did NOT create vault entry` and proceed. The next successful run with a writable vault will create the missing folders idempotently.

   **Slug inference (fallback when client was not picked from the vault menu, or vault was unreachable):**
   - Infer `client` from: `git remote get-url origin` → extract the GitHub org (e.g. `jota-batuta/bato-cajas` → `jota-batuta`), OR fall back to the parent directory name, OR fall back to `"default"`.
   - Infer `project` from: current directory name (basename of `$(pwd)`), kebab-cased. (Always inferred this way, regardless of how `client` was resolved.)
   - **Ask the operator ONLY if** both inference paths produce `"default"` or ambiguous results (e.g. the directory is named `src` or `tmp`). Ask in one question: *"¿Client slug y project slug para el KB hook (ej: bato-cajas bato-cajas)?"*. Accept space-separated answer. Do NOT ask Y/n — proceed regardless.

   **Project folder bootstrap in vault (after client + project are resolved):**
   - Create `<vault_root>/clients/<client>/projects/<project>/` with subfolders `sessions/`, `sprints/`, `decisions/`, `gotchas/`, `tasks/`. Idempotent: skip if folder exists.
   - Drop a placeholder `<vault_root>/clients/<client>/projects/<project>/_status.md` if missing — a one-line stub the operator fleshes out later (or the kb-pipeline agent populates).

   - Create `.claude/kb-config.json` with the resolved vault path:
     ```json
     {
       "enabled": true,
       "client": "<detected-or-prompted>",
       "project": "<detected-or-prompted>",
       "vault_root": "<absolute-path-from-global-config>",
       "session_slug_strategy": "branch-or-plan-or-daily"
     }
     ```
   - Install the hook: copy `~/.claude/plugins/marketplaces/batuta-agent-skills/hooks/post-commit-kb.sh` to `.git/hooks/post-commit`. If `.git/hooks/post-commit` already exists with non-Batuta content, append the line `bash "${CLAUDE_PLUGIN_ROOT}/hooks/post-commit-kb.sh"` instead of overwriting (preserve existing logic). On Windows (Git Bash), `chmod +x` the file.
   - Append `.claude/kb-config.json` to `.gitignore` (contains machine-specific vault path; not committed by default).

   **Verification:** `test -f .git/hooks/post-commit && grep -q "post-commit-kb" .git/hooks/post-commit && test -f .claude/kb-config.json`. After the next `git commit`, verify a new bullet appears in `docs/sessions/<today>-<slug>.md` and (if `vault_root` reachable) in `<vault_root>/clients/<client>/projects/<project>/sessions/<today>.md`.

5. **GitHub boilerplate** (per user-level CLAUDE.md rule "New project = GitHub repo on day 0"):
   - If no `.git/` exists: `git init && git add CLAUDE.md && git commit -m "chore: initial project hygiene"`
   - If no remote: ask operator `"Crear repo GitHub <jota-batuta/<detected-name>>? (y/n)"`. On `y`: `gh repo create jota-batuta/<name> --private --source=. --remote=origin --push`.

6. **Verification**:
   - `./CLAUDE.md` exists and contains `## Mandatory Skills for Batuta Projects`
   - `test -f docs/PRD.md && test -f docs/SPEC.md && test -f docs/adr/0001-template-decision.md`
   - `test -d docs/plans/active && test -d docs/plans/archive && test -d docs/sessions`
   - `test -f AGENTS.md` (cross-tool bootstrap ran for manifest project)
   - `test -f .aider.conf.yml || echo skipped` (skipped for pure-docs repos or if operator opted out)
   - `git log -1 --oneline` shows the hygiene commit
   - `git remote get-url origin` returns a URL (if GitHub step ran)

### Mode: `project-retrofit`

**Trigger:** invoked explicitly by the operator — or by the main agent acting on a BLOCKER returned from `implementer` / `implementer-haiku` pre-flight Step 0 (the implementer does NOT call this skill programmatically; it returns a BLOCKER, the main reads the BLOCKER and invokes retrofit, then re-delegates). Apply when a project has CLAUDE.md but is missing parts of the doc skeleton. Auto-detect candidates:

- `./CLAUDE.md` EXISTS, AND
- ANY of these is missing: `./docs/PRD.md`, `./docs/SPEC.md`, `./docs/plans/active/`, `./docs/plans/archive/`, `./docs/sessions/`, `./docs/adr/`, `./.claude/rules/`

**Do NOT trigger** if the project is fully bootstrapped (all of the above exist).

**Process:**

1. **Detect what is missing** — scan the candidates above and build a list.
2. **For each missing item, run only the corresponding sub-step from `Mode: project-init`**:
   - Missing `docs/{PRD,SPEC}.md` or `docs/adr/0001-template-decision.md` → run step 4 (Create project documentation skeleton) for those files only. NEVER overwrite existing files.
   - Missing `docs/plans/active|archive/` or `docs/sessions/` → create directories with `.gitkeep`.
   - Missing `.claude/rules/` symlinks → run step 4a (Cross-tool bootstrap) for rules only (call `bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-rules.sh --all` if operator opts in). Note: `--all` does NOT chain into the code-graph engine bootstrap (changed in v4.0). If the operator wants codebase-memory-mcp installed too, also run `bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh` as a separate step.
   - Missing `## Engineering invariants` section in CLAUDE.md → append the section with the @ imports (per step 4b on project-init), preserving everything that's already in CLAUDE.md.
   - Missing `.claude/kb-config.json` AND missing `.git/hooks/post-commit` containing `post-commit-kb` → run step 4c (KB capture hook). Repo must have `.git/` already (retrofit does not run `git init`). NEVER overwrite an existing `post-commit` hook — append the Batuta line instead.
3. **Preserve everything that already exists.** This mode is purely additive. If the operator has customized any of the existing files, those customizations stay.
4. **Report what was added vs preserved.** Output format:
   ```
   batuta-project-hygiene mode=project-retrofit complete
     added : docs/PRD.md (skeleton)
     added : docs/SPEC.md (skeleton)
     added : docs/plans/active/.gitkeep
     added : docs/sessions/.gitkeep
     added : .claude/rules/<3 symlinks>
     added : ## Engineering invariants section in CLAUDE.md
     preserved : CLAUDE.md (existing custom rules untouched)
     preserved : docs/adr/ (already had user-authored ADRs)
   ```

**Verification (idempotent):** running `mode=project-retrofit` again on the same project should detect nothing missing and report "all sections present, no action needed".

---

### Mode: `feature-init <name>`

**Hard constraint before any step**: the feature's `SPEC.md` and `CLAUDE.md` MUST be created inside a subfolder, NEVER at the project root. If the upstream `/spec` command would write to root, override its target. The root is reserved for project-wide files only.

**Input precondition**: `<name>` MUST match the regex `^[a-z0-9][a-z0-9-]{0,40}$` (kebab-case, ≤ 41 chars, no shell metacharacters). This is enforced before any shell command runs. If the operator-supplied or upstream-derived name does not match, REJECT with a re-prompt for a valid kebab-case name. Do NOT attempt to sanitize. Same constraint applies to `<detected-name>` derived in `project-init` when used in `gh repo create jota-batuta/<detected-name>`.

1. **Read `./CLAUDE.md` `## Feature folder convention` section**:
   - If it records `style: layered` → target is always `docs/features/<name>/`. No auto-detection. Skip to step 2.
   - If it records `style: feature-oriented` with a filled-in `features-root:` template (e.g. `features/<name>/`, `packages/<name>/`, `src/<name>/`, `app/<name>/`) → use it.
   - If the section has no explicit `style:` field (legacy CLAUDE.md written before Step 0 existed) → treat as `feature-oriented` and apply the auto-detection tree below.
   - If the section is a placeholder or missing → run the auto-detection tree:
     - `pyproject.toml` + existing `src/` directory with layer-named subpackages → treat as layered, use `docs/features/<name>/` and back-fill `style: layered` into CLAUDE.md.
     - `pyproject.toml` + existing `src/` directory with feature-named subpackages → `src/<name>/`
     - `package.json` + existing `packages/` directory → `packages/<name>/`
     - `package.json` with Next.js App Router + `app/` directory → `app/<name>/`
     - `package.json` without `packages/` or `app/` → `features/<name>/`
     - Rust (`Cargo.toml`) with workspace → `crates/<name>/`
     - Otherwise ask:
       ```
       Qué convención de carpetas usas para features en este proyecto?
         1) src/<name>/           (Python src-layout, feature-oriented)
         2) packages/<name>/      (pnpm/Yarn workspace)
         3) app/<name>/           (Next.js App Router)
         4) features/<name>/      (generic feature-oriented)
         5) docs/features/<name>/ (layered project — code stays in its layer)
         6) otra: <ruta>

       (La respuesta queda guardada en CLAUDE.md y no se te preguntará de nuevo.)
       ```
   - After resolving (auto-detect or user answer), write the chosen `style:` and `features-root:` into `./CLAUDE.md` at `## Feature folder convention`.

2. **Create the feature folder** at the resolved path. Reject if it already exists (operator should use an existing-feature flow, not this mode).

3. **Create `<feature-folder>/CLAUDE.md`** with scoped rules:

   **Feature-oriented variant** (code lives inside the feature folder):
   ```markdown
   # Feature: <name>

   Inherits from `../CLAUDE.md` and `~/.claude/CLAUDE.md`. Only feature-specific rules live here.

   ## Scope
   <one-sentence operator-provided description>

   ## Boundaries
   - Do not modify files outside this folder without opening a separate PR.
   - Commits must stay within this feature branch.
   - Feature tests live alongside source, not in a global test directory.
   ```

   **Layered variant** (code lives in existing technical layers — use this template when `style: layered`):
   ```markdown
   # Feature: <name>

   Inherits from `../../CLAUDE.md` and `~/.claude/CLAUDE.md`. Docs-only — code lives in existing layers.

   ## Scope
   <one-sentence operator-provided description>

   ## Code map

   | Layer | Files |
   |---|---|
   | models | <src/<pkg>/models/<...>.py> |
   | services | <src/<pkg>/services/<...>.py> |
   | activities | <src/<pkg>/activities/<...>.py> |
   | workflows | <src/<pkg>/workflows/<...>.py> |
   | reports | <src/<pkg>/reports/<...>.py> |

   (Fill in the actual files this feature touches. The spec below must stay consistent with these files.)

   ## Boundaries
   - Edits to layer files must trace back to SPEC.md in this folder.
   - Do not create a new layer just for this feature; extend an existing one.
   - Commits must stay within this feature branch.
   ```

4. **Delegate SPEC creation** to the upstream `spec-driven-development` skill, **explicitly overriding its default write target** to `<feature-folder>/SPEC.md`. The upstream skill defaults to project root — that default is wrong for multi-feature projects. Pass the target path explicitly.

   If the upstream skill resists or produces `SPEC.md` at root anyway:
   - Move it: `mv SPEC.md <feature-folder>/SPEC.md`
   - Do not proceed to commit until SPEC.md is inside the feature folder.

5. **Commit**:
   ```bash
   git checkout -b feature/<name>
   git add <feature-folder>/
   git commit -m "feat(<name>): scaffold feature folder with CLAUDE.md and SPEC.md"
   ```

6. **Verification**:
   - `<feature-folder>/CLAUDE.md` exists
   - `<feature-folder>/SPEC.md` exists
   - `git branch --show-current` returns `feature/<name>`

## Anti-Rationalizations

| Excuse | Reality |
|---|---|
| "The operator didn't say 'create CLAUDE.md' so I shouldn't" | The user-level rule delegates the decision to this skill. That IS the explicit permission. |
| "`/init` alone is enough" | `/init` does not add Batuta Mandatory Skills or set up the feature convention. Use `/init` as Step 2 of project-init, not as the whole flow. |
| "Ask before creating the feature folder" | Feature naming is the only ambiguous part. If the folder name is ambiguous (e.g. operator says "auth stuff"), ask for a kebab-case name, then proceed — do not ask permission for every step. |
| "The operator will fix the CLAUDE.md later" | Later means never. The rules file exists at session start or doesn't exist. |

## Red Flags

- **SPEC.md or CLAUDE.md for a feature ending up at project root.** This is the top failure mode. If you see SPEC.md at root after a feature-init, move it immediately and check why the upstream skill wasn't redirected.
- Creating a feature folder without reading `## Feature folder convention` from the project CLAUDE.md first.
- Generating a CLAUDE.md that is a verbatim copy of another project's CLAUDE.md (always re-run stack detection).
- Committing across feature boundaries (feature-init must only touch its own folder).
- Skipping the git branch creation in feature-init mode.
- Pushing to GitHub without asking the operator first, or pushing to a public repo when the operator said `--private`.
- Ignoring auto-detection signals (if `src/` directory exists in a Python project, default to `src/<name>/`; do not ask the operator a question that the project structure already answers).
- Creating a feature folder at `src/<name>/` in a project whose `## Feature folder convention` recorded `style: layered`. The style decision is sticky — don't override without asking the operator.
- Moving existing code into a `features/` folder as a side-effect of `feature-init`. Hygiene never moves code; it only creates documentation folders.
- Treating a technical layer name (`services/`, `activities/`, `reports/`, `tools/`) as a feature. These are horizontal layers in a layered project, not vertical slices.

## Verification

After `project-init`:
```bash
test -f CLAUDE.md                                          # exists
grep -q "Mandatory Skills for Batuta" CLAUDE.md            # Batuta section present
grep -q "Feature folder convention" CLAUDE.md              # placeholder present
test -f docs/PRD.md                                        # PRD skeleton created
test -f docs/SPEC.md                                       # SPEC skeleton created
test -f docs/adr/0001-template-decision.md                 # ADR template created
test -d docs/plans/active && test -d docs/plans/archive    # plans dirs exist
test -d docs/sessions                                      # sessions dir exists
test -f AGENTS.md                                          # cross-tool bootstrap (manifest projects)
test -f .aider.conf.yml || echo skipped                    # Aider config (skipped for pure-docs repos)
test -L .claude/rules/research-first-citations.md || echo skipped  # rules bootstrap (opted-in)
grep -q "@.claude/rules/" CLAUDE.md || echo skipped        # invariants import present (opted-in)
grep -q "\.claude/rules/" .gitignore || echo skipped       # rules dir gitignored (opted-in)
git log --oneline -1 | grep -q "project hygiene"           # committed
```

After `feature-init <name>` (feature-oriented):
```bash
test -f features/<name>/CLAUDE.md 2>/dev/null || test -f packages/<name>/CLAUDE.md 2>/dev/null || test -f src/<name>/CLAUDE.md 2>/dev/null || test -f app/<name>/CLAUDE.md 2>/dev/null
test -f features/<name>/SPEC.md 2>/dev/null || test -f packages/<name>/SPEC.md 2>/dev/null || test -f src/<name>/SPEC.md 2>/dev/null || test -f app/<name>/SPEC.md 2>/dev/null
git branch --show-current | grep -q "feature/<name>"
```

After `feature-init <name>` (layered):
```bash
test -f docs/features/<name>/CLAUDE.md
test -f docs/features/<name>/SPEC.md
grep -q "## Code map" docs/features/<name>/CLAUDE.md
git branch --show-current | grep -q "feature/<name>"
# Negative: no new folder inside src/<pkg>/ for this feature
test ! -d src/*/<name>
```

If any check fails, the mode did not complete — report the failure to the operator and do not proceed to the next user task.
