# Using agent-skills with Reasonix

This repository is also a native Reasonix plugin. The adapter exposes the
reusable workflow assets without importing repository-maintenance instructions
or lifecycle hooks.

## Objective

Make the same agent-skills package available in Reasonix with a small,
auditable capability surface:

- all skills under `skills/`
- slash commands under `.claude/commands/`
- specialist personas under `agents/`

The root `CLAUDE.md`, `hooks/`, and MCP configuration are intentionally not
part of the Reasonix adapter. They configure development of this repository or
other host-specific lifecycle behavior rather than reusable Reasonix features.

## Install

Inspect the exact capability inventory before installing:

```bash
reasonix plugin install https://github.com/addyosmani/agent-skills.git --dry-run
```

The preview should report 24 skills, 8 commands, 4 agents, and no hooks or MCP
servers. Install only after the preview matches that boundary:

```bash
reasonix plugin install https://github.com/addyosmani/agent-skills.git --yes
```

Local clones work too:

```bash
reasonix plugin install /path/to/agent-skills --dry-run
reasonix plugin install /path/to/agent-skills --yes
```

Use a Reasonix build whose native v2 plugin manifests load only explicitly
declared resources. If the preview discovers `CLAUDE.md` or any hook, stop and
upgrade Reasonix before installing.

## Usage

After installation, start a new Reasonix session. Skills and commands use the
package-qualified namespace, for example:

```text
/agent-skills:spec-driven-development
/agent-skills:spec
/agent-skills:agent:code-reviewer
```

Use `/plugins show agent-skills` to inspect the installed inventory.

## Adapter contract

`reasonix-plugin.json` is the single source of truth for Reasonix discovery.
It declares only `skills`, `commands`, and `agents`; no compatibility fallback
or install script is required. Release validation keeps its version aligned
with the repository's other plugin manifests.
