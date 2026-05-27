# Using agent-skills with Agentsmesh

[Agentsmesh](https://github.com/sampleXbro/agentsmesh) is an open-source CLI that installs this pack once and generates native config for 30+ AI coding tools — Claude Code, Cursor, Copilot, Codex, Gemini CLI, Windsurf, Kiro, OpenCode, and the rest. Useful if you use more than one tool, or if your team does.

## Setup

### Install the CLI

```bash
# Homebrew
brew tap samplexbro/agentsmesh
brew install agentsmesh

# or npm
npm install -g agentsmesh
```

### Install this pack

From the root of your project:

```bash
agentsmesh init
agentsmesh install github:addyosmani/agent-skills
```

That's it — `install` materializes the pack into `.agentsmesh/packs/addyosmani-agent-skills-pack/` and immediately generates native config for whichever tools are enabled. The pack's layout (`skills/`, `agents/`, `rules/`, and per-tool command dirs like `.claude/commands/`) is auto-detected, so no `--as` or per-file flags are needed. Files under `references/` are pulled in automatically when a `SKILL.md` links to them — they travel with that skill as supporting files.

> The pack name `addyosmani-agent-skills-pack` is derived automatically from the GitHub org/repo. Pass `--name agent-skills` to `install` if you'd prefer a shorter name in subsequent commands.

### Pick which tools you generate for

`agentsmesh init` writes an `agentsmesh.yaml` listing the targets it'll generate for. Edit the list to enable any combination:

```yaml
version: 1
targets:
  - claude-code
  - cursor
  - copilot
  - codex-cli
  - gemini-cli
  - windsurf
features:
  - rules
  - commands
  - agents
  - skills
  - mcp
  - hooks
  - ignore
  - permissions
```

Then re-run `agentsmesh generate` to project the pack into the newly enabled targets.

## Recommended Configuration

### Stay in sync with upstream

When this repo updates, pull the changes into your project:

```bash
agentsmesh refresh addyosmani-agent-skills-pack
```

`refresh` re-fetches the pack against its originally-recorded source, prompts before overwriting any files you've modified locally, and re-runs `generate` automatically if anything changed. Omit the pack name to refresh every installed pack at once. `agentsmesh refresh --dry-run` previews what an upstream pull would change without writing anything.

For reproducible team setups, pin a tag at install time:

```bash
agentsmesh install github:addyosmani/agent-skills@v1.0.0
```

### Personal setup (across every repo)

If you want these skills loaded globally instead of per-project:

```bash
agentsmesh init --global
agentsmesh install --global github:addyosmani/agent-skills
```

Writes to `~/.claude/`, `~/.cursor/`, `~/.codex/`, `~/.windsurf/`, etc. `agentsmesh refresh --global addyosmani-agent-skills-pack` keeps the global install in sync the same way.

### Fresh clones

`.agentsmesh/packs/` is gitignored by default (treated like `node_modules`). After cloning a repo that uses agentsmesh, reinstate every recorded pack:

```bash
agentsmesh install --sync
```

## Usage Tips

1. **One source of truth** — edit pack content in `.agentsmesh/packs/addyosmani-agent-skills-pack/` (or pull updates with `refresh`) and every tool's native config stays aligned automatically.
2. **Cross-file links keep working** — references like `references/security-checklist.md` inside a `SKILL.md` are rewritten to target-relative paths automatically, so they resolve from `.claude/`, `.cursor/`, `.github/`, and the rest.
3. **Skip what you don't need** — remove targets from `agentsmesh.yaml` to keep generated output minimal, or pass `--targets claude-code,cursor` to a one-off `generate`.
4. **List what's installed** — `agentsmesh installs list` prints the pack name, source, features, and install date in a table, handy if you forget the exact name to pass to `refresh` or `uninstall`.
