# Using agent-skills with Oh My Pi

This repository is an [Oh My Pi](https://github.com/oh-my-pi) plugin as well as a Claude Code plugin. Skills, slash commands, and personas are shared; only the session-start hook has an OMP-native implementation.

## Install

```
/marketplace add addyosmani/agent-skills
/marketplace install agent-skills@addy-agent-skills
```

CLI equivalent:

```bash
omp plugin marketplace add addyosmani/agent-skills
omp plugin install agent-skills@addy-agent-skills
```

Then `/reload-plugins` so skills and slash commands refresh. Restart the session to pick up the session-start extension and task agents.

A local clone works too:

```bash
omp plugin marketplace add /path/to/agent-skills
omp plugin install agent-skills@addy-agent-skills
```

### Local checkout (no marketplace)

Open this repository in Oh My Pi. Native discovery reads `.omp/`:

| Path | Points at | Becomes |
|------|-----------|---------|
| `.omp/skills` | `skills/` | 25 skills in the skill list; `read skill://<name>` |
| `.omp/commands` | `.claude/commands/` | `/spec` `/plan` `/build` `/test` `/constraints` `/review` `/code-simplify` `/ship` `/webperf` |
| `.omp/agents` | `agents/` | `task` agents `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor` |
| `.omp/extensions/session-start.js` | `hooks/pre/session-start.js` | Injects `using-agent-skills` on the next user turn |
| `.omp/rules/skills-contributing.md` | (OMP-native copy) | Contributor guardrail while editing `skills/**` |

Do not copy root `AGENTS.md` or `CLAUDE.md` into other projects. Those files configure agents working on this repository. The reusable assets are `skills/`.

## Usage

- **Skills.** Describe the work; the agent should `read skill://<name>` when a skill matches. Or invoke `/skill:<name>` when skill commands are enabled.
- **Slash commands.** Same names as Claude Code (`/spec`, `/plan`, `/build`, `/build auto`, `/test`, `/constraints`, `/review`, `/code-simplify`, `/ship`, `/webperf`). After a marketplace install the names are prefixed: `/agent-skills:spec`.
- **Personas.** Spawn with the `task` tool, `agent` set to the persona `name`. `/ship` fans out `code-reviewer`, `security-auditor`, and `test-engineer` in one `tasks[]` array. `/webperf` spawns `web-performance-auditor`.
- **Meta-skill.** The session-start extension injects `using-agent-skills` silently on the next turn. Skills still appear in the list if the extension does not load.

## How it works

- `.omp-plugin/marketplace.json` — OMP-preferred catalog. Plugin source is `./` (this repo is the plugin). Marketplace name stays `addy-agent-skills` so the install id matches Claude Code: `agent-skills@addy-agent-skills`.
- `.omp-plugin/plugin.json` — Points `skills` at `./skills` and `commands` at `./.claude/commands` only. The root `commands/` directory is Antigravity TOML and is not an OMP command source.
- `.claude-plugin/` — Unchanged Claude Code manifests. OMP reads `.omp-plugin/` first and falls back to `.claude-plugin/` when the OMP catalog is absent.
- `skills/<name>/SKILL.md` — Unchanged. OMP and Claude Code share `name` + `description` frontmatter.
- `agents/<role>.md` — Unchanged. OMP task discovery loads `agents/` from marketplace plugin roots and from `.omp/agents` in a local checkout. Dispatch with `task` (`agent: code-reviewer`), not Claude Code's Agent tool (`subagent_type`).
- `hooks/pre/session-start.js` — OMP extension (CJS default export). Claude Code continues to use `hooks/session-start.sh` via `hooks/hooks.json`.
- `.omp/commands` — Symlink to `.claude/commands`. Command bodies are harness-aware: Oh My Pi uses `task`; Claude Code uses the Agent tool.

## What OMP does not load from the Claude layout

| Claude path | OMP equivalent |
|-------------|----------------|
| `hooks/hooks.json` + `session-start.sh` | `hooks/pre/session-start.js` |
| `.claude/rules/` | `.omp/rules/` |
| Root `CLAUDE.md` | Root `AGENTS.md` (already loaded) and this setup guide |
| Claude Agent tool / Agent Teams | `task` + Agent Hub |

## Optional extensions

`sdd-cache` and `simplify-ignore` are **opt-in**. They are not in `.omp/extensions/`, so opening this repo or installing the plugin does **not** load them.

| Extension | File | What it intercepts | Cache dir |
|-----------|------|--------------------|-----------|
| sdd-cache | `hooks/omp/sdd-cache.js` | `read` of `http(s)://` URLs; revalidates with `HEAD` (`304` only) | `.omp/sdd-cache/` |
| simplify-ignore | `hooks/omp/simplify-ignore.js` | `read` / `write` / `edit`; hides `simplify-ignore-start` blocks | `.omp/.simplify-ignore-cache/` |

Enable in user or project config:

```yaml
# ~/.omp/agent/config.yml  or  <project>/.omp/config.yml
extensions:
  - /path/to/agent-skills/hooks/omp/sdd-cache.js
  - /path/to/agent-skills/hooks/omp/simplify-ignore.js
```

Or for one session:

```bash
omp --extension /path/to/agent-skills/hooks/omp/sdd-cache.js
omp --extension /path/to/agent-skills/hooks/omp/simplify-ignore.js
```

After a marketplace install, point those paths at the cached plugin copy (see `omp plugin list`). Same contract as the Claude Code snippets in `hooks/SDD-CACHE.md` and `hooks/SIMPLIFY-IGNORE.md`: you opt in per project; the plugin does not turn them on globally.

Add the cache directories to `.gitignore` (this repo already ignores them).

## Verify

```bash
node scripts/validate-versions.js
node --test scripts/omp-session-start-test.mjs
node --test hooks/omp/sdd-cache-test.js hooks/omp/simplify-ignore-test.js
```

After install, confirm `/spec` (or `/agent-skills:spec`) expands, `skill://spec-driven-development` resolves, and `task` lists `code-reviewer`.
