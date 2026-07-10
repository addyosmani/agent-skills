# Using agent-skills with Codex

This repository is also a [Codex plugin](https://developers.openai.com/codex/plugins/build). The same root-level `skills/` directory used by Claude Code is consumed by Codex, so no files are copied or duplicated.

## Install (one command)

```bash
codex plugin marketplace add addyosmani/agent-skills
```

> Requires Codex CLI v0.122 or later. On older releases the command was `codex marketplace add`. See the [Codex CLI docs](https://developers.openai.com/codex/cli).

Codex clones the repo into `~/.codex/plugins/agent-skills/`, registers the marketplace in `~/.codex/config.toml`, and makes the plugin available. Restart Codex if it's already running.

Local clones work too:

```bash
codex plugin marketplace add /path/to/your/clone
```

## Usage

After install, invoke a skill in Codex chat with `@` (e.g. `@spec-driven-development`) or just describe the task and let Codex pick the right skill. All 24 skills under `skills/` are available.

## How it works

- `.codex-plugin/plugin.json` — Codex plugin manifest at the repo root. Points `skills` at `./skills/` and declares an empty Codex hook config so Codex does not auto-load Claude-oriented hooks from `hooks/hooks.json`.
- `.agents/plugins/marketplace.json` — marketplace entry declaring the repo root (`./`) as the plugin source.
- `skills/<name>/SKILL.md` — unchanged. Codex and Claude Code share the same `name` + `description` frontmatter format, so one file serves both platforms.

Slash commands in `.claude/commands/` and personas in `agents/` stay Claude Code-specific — Codex has no native equivalent for either. On Codex, invoke the underlying skill directly instead of the slash command (e.g. `@spec-driven-development` instead of `/spec`).
