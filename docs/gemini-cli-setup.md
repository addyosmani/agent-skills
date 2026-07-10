# Using agent-skills with Gemini CLI

## Setup

### Option 1: Install as Skills (Recommended)

Gemini CLI has a native skills system that auto-discovers `SKILL.md` files in `.gemini/skills/` or `.agents/skills/` directories. Each skill activates on demand when it matches your task.

**Install from the repo:**

```bash
gemini skills install https://github.com/addyosmani/agent-skills.git --path skills
```

**Or install from a local clone:**

```bash
git clone https://github.com/addyosmani/agent-skills.git
gemini skills install /path/to/agent-skills/skills/
```

**Install for a specific workspace only:**

```bash
gemini skills install /path/to/agent-skills/skills/ --scope workspace
```

Skills installed at workspace scope go into `.gemini/skills/` (or `.agents/skills/`). User-level skills go into `~/.gemini/skills/`.

Once installed, verify with:

```
/skills list
```

Gemini CLI injects skill names and descriptions into the prompt automatically. When it recognizes a matching task, it asks permission to activate the skill before loading its full instructions.

### Option 2: GEMINI.md (Persistent Context)

For skills you want always loaded as persistent project context (rather than on-demand activation), add them to your project's `GEMINI.md`:

```bash
# Create GEMINI.md with core skills as persistent context
cat /path/to/agent-skills/skills/incremental-implementation/SKILL.md > GEMINI.md
echo -e "\n---\n" >> GEMINI.md
cat /path/to/agent-skills/skills/code-review-and-quality/SKILL.md >> GEMINI.md
```

You can also modularize by importing from separate files:

```markdown
# Project Instructions

@skills/test-driven-development/SKILL.md
@skills/incremental-implementation/SKILL.md
```

Use `/memory show` to verify loaded context, and `/memory reload` to refresh after changes.

> **Skills vs GEMINI.md:** Skills are on-demand expertise that activate only when relevant, keeping your context window clean. GEMINI.md provides persistent context loaded for every prompt. Use skills for phase-specific workflows and GEMINI.md for always-on project conventions.

## Recommended Configuration

### Always-On (GEMINI.md)

Add these as persistent context for every session:

- `incremental-implementation` — Build in small verifiable slices
- `code-review-and-quality` — Five-axis review

### On-Demand (Skills)

Install these as skills so they activate only when relevant:

- `test-driven-development` — Activates when implementing logic or fixing bugs
- `spec-driven-development` — Activates when starting a new project or feature
- `frontend-ui-engineering` — Activates when building UI
- `security-and-hardening` — Activates during security reviews
- `performance-optimization` — Activates during performance work

## Advanced Configuration

### MCP Integration

Many skills in this pack leverage [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) tools to interact with the environment. For example:

- `browser-testing-with-devtools` uses the `chrome-devtools` MCP extension.
- `performance-optimization` can benefit from performance-related MCP tools.

To enable these, ensure you have the relevant MCP extensions installed in your Gemini CLI configuration (`~/.gemini/config.json`).

### Session Hooks

Gemini CLI supports session lifecycle hooks. You can use these to automatically inject context or run validation scripts at the start of a session.

To replicate the `agent-skills` experience from other tools, you can configure a `SessionStart` hook that reminds you of the available skills or loads a meta-skill.

### Explicit Context Loading

You can explicitly load any skill into your current session by referencing it with the `@` symbol in your prompt:

```markdown
Use the @skills/test-driven-development/SKILL.md skill to implement this fix.
```

This is useful when you want to ensure a specific workflow is followed without waiting for auto-discovery.

## Slash Commands

The repo ships 8 slash commands under `.gemini/commands/`: 7 lifecycle commands plus the `/webperf` specialist audit. Gemini CLI auto-discovers them when you run from the project root.

| Command | What it does |
|---------|--------------|
| `/spec` | Write a structured spec before writing code |
| `/planning` | Break work into small, verifiable tasks |
| `/build` | Implement the next task incrementally |
| `/test` | Run TDD workflow — red, green, refactor |
| `/review` | Five-axis code review |
| `/code-simplify` | Reduce complexity without changing behavior |
| `/ship` | Pre-launch checklist via parallel persona fan-out |
| `/webperf` | Audit browser-facing apps for Core Web Vitals and performance issues |

Each command invokes the corresponding skill automatically — no manual skill loading required.

> **Note:** Use `/planning` instead of `/plan` — `/plan` conflicts with a Gemini CLI internal command name.

## Usage Tips

1. **Prefer skills over GEMINI.md** — Skills activate on demand and keep your context window focused. Only put skills in GEMINI.md if you want them always loaded.
2. **Skill descriptions matter** — Each SKILL.md has a `description` field in its frontmatter that tells agents when to activate it. The descriptions in this repo are optimized for auto-discovery across all supported tools (Claude Code, Gemini CLI, etc.) by clearly stating both *what* the skill does and *when* it should be triggered.
3. **Use agents for review** — Copy `agents/code-reviewer.md` content when requesting structured code reviews.
4. **Combine with references** — Reference checklists from `references/` when working on specific quality areas like testing or performance.
