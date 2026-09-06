# Using agent-skills with fx

[fx](https://fx.sh) (by Vercel Labs) is a coding agent harness and CLI with native Agent Skills support. It discovers every `SKILL.md` under a set of workspace and user skill roots at startup, and loads a skill's full instructions into context only when the skill is invoked.

> fx is experimental (v0.0.6 at the time of writing; skill discovery paths below require 0.0.5+). Paths and commands come from the [fx skills documentation](https://fx.sh/docs/capabilities/skills) — check it if something has moved.

## Install fx

```bash
curl -fsSL https://fx.sh/setup.sh | bash
```

Then authenticate with `fx login` (Vercel AI Gateway), `fx login codex` (OpenAI), `fx login grok` (xAI), or `fx setup` for direct API keys.

## Project scope (zero configuration)

fx discovers skills from a `skills/` directory at the workspace root — the exact layout this repository uses. Working inside a clone of this repo, or any project that vendors the pack the same way, requires no installation step:

```bash
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills
fx
```

All skills appear in the `/skills` catalog immediately.

To use the pack in your own project, copy the skills into `.fx/skills/` — fx's native project root, checked before every other workspace root:

```bash
git clone https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
mkdir -p .fx/skills
cp -R /tmp/agent-skills/skills/* .fx/skills/
```

If you already vendor these skills for another agent (for example under `.claude/skills/` or `.agents/skills/`), fx finds them there — no second copy needed.

## User scope (all projects)

Install into `~/.fx/skills/` to make the pack available in every workspace:

```bash
git clone https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
mkdir -p ~/.fx/skills
cp -R /tmp/agent-skills/skills/* ~/.fx/skills/
```

An existing Claude Code user-level install (`~/.claude/skills/`) is also picked up automatically.

**Symlinks:** symlinking from a local clone instead of copying works without configuration as long as the link target resolves inside your home directory or the workspace:

```bash
ln -s ~/src/agent-skills/skills/* ~/.fx/skills/
```

Only symlinks that resolve *outside* home and workspace (Nix store paths, for example) need their target listed in the colon-separated `FX_SKILL_SYMLINK_AUTHORITIES` environment variable:

```bash
export FX_SKILL_SYMLINK_AUTHORITIES="/nix/store"
```

## Where fx looks for skills

| Scope | Roots (in priority order) |
|-------|---------------------------|
| Workspace | `.fx/skills/`, `skills/`, `.opencode/skills/`, `.codex/skills/`, `.claude/skills/`, `.agents/skills/`, `.claw/skills/` |
| User | `~/.fx/skills/`, `~/.config/opencode/skills/`, `~/.codex/skills/`, `~/.claude/skills/`, `~/.agents/skills/`, `~/.claw/skills/` |

Workspace roots are checked from the workspace upward, stopping before your home directory — so a `skills/` directory in a parent of the project is picked up too. Only the primary workspace contributes project skills; additional workspace directories provide tool access but are not scanned for skills.

## Usage

- `/skills` — browse the interactive skill catalog
- `/skills show <name>` — inspect a skill without loading it into context
- Type `$` in the composer to search skills directly
- The agent can also load skills itself via the `install_skill` and `skill` tools

Discovery is metadata-only: with all skills installed, only names and descriptions sit in context until a skill is actually invoked, so the full pack carries little token overhead.

## Lifecycle workflow via AGENTS.md

fx has no user-defined slash commands, so the lifecycle commands (`/spec`, `/plan`, `/build`, …) do not port. Use the agent-driven approach instead, the same way the [OpenCode integration](opencode-setup.md) works: fx loads `AGENTS.md` project instruction files at global (`~/.fx/AGENTS.md`), workspace, and target scopes (narrowest scope wins), and this repository's root `AGENTS.md` already encodes the skill-routing rules. Inside a clone of this repo the lifecycle enforcement works out of the box; for your own projects, adapt the routing rules into your workspace `AGENTS.md`:

- "Design a feature" → `spec-driven-development`
- "Plan this change" → `planning-and-task-breakdown`
- "Implement this" → `incremental-implementation` + `test-driven-development`
- "Fix this bug" → `debugging-and-error-recovery`
- "Review this" → `code-review-and-quality`

## Frontmatter compatibility

fx requires `name` in `SKILL.md` frontmatter and treats `description` as optional; additional fields are permitted for compatibility with other agent systems. Every skill in this pack satisfies this as-is — no conversion needed.

## Limitations

- No custom slash commands — lifecycle phases are reached through intent or explicit skill invocation (`$`, `/skills`)
- No plugin manifest system — irrelevant here, since native discovery covers the whole pack
- fx is experimental; skill behavior may change between releases
