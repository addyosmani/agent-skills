# Using agent-skills with GitHub Copilot

This guide covers Copilot in VS Code. For the standalone `copilot` command-line tool, see [copilot-cli-setup.md](copilot-cli-setup.md).

**What an install actually gives you:** the skills. Each installed skill becomes a slash command named after its frontmatter `name` — `/spec-driven-development`, `/test-driven-development`, and so on. `npx skills add addyosmani/agent-skills` and the manual copy below both install skills only. Neither of those two routes copies this repo's short lifecycle wrappers (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`) — those are Claude Code commands living in `.claude/commands/`. Use the full skill names, or add your own aliases — see [Lifecycle workflows](#lifecycle-workflows).

## Setup

### Copilot Instructions

Copilot supports creating agent skills using a `.github/skills`, `.claude/skills`, or `.agents/skills` directory in your repository.

```bash
mkdir -p .github/skills/test-driven-development .github/skills/code-review-and-quality

# Create files for essential skills
cat /path/to/agent-skills/skills/test-driven-development/SKILL.md > .github/skills/test-driven-development/SKILL.md
cat /path/to/agent-skills/skills/code-review-and-quality/SKILL.md > .github/skills/code-review-and-quality/SKILL.md
```

Whichever of these two routes you use, the result is one `SKILL.md` per skill directory under one of those three project paths. An installer run with a global/user flag writes somewhere else instead — check its output for the path it used. Run `/skills` in Copilot Chat to open the **Configure Skills** menu and confirm what got discovered.

For more details, refer [Creating agent skills for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills) and the VS Code guide to [agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills).

### Agent Personas (*.agent.md)

Copilot supports specialized agent personas. Use the agent-skills agents:

> **Important:** GitHub Copilot requires custom agent files to be named `*.agent.md`.
> Files named `*.md` are silently ignored by Copilot.
> See [VS Code custom agents docs](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_custom-agent-file-structure) for details.

```bash
# Create the agents directory and copy agent definitions
mkdir -p .github/agents
cp /path/to/agent-skills/agents/code-reviewer.md .github/agents/code-reviewer.agent.md
cp /path/to/agent-skills/agents/test-engineer.md .github/agents/test-engineer.agent.md
cp /path/to/agent-skills/agents/security-auditor.md .github/agents/security-auditor.agent.md
```

Invoke agents in Copilot Chat:
- `@code-reviewer Review this PR`
- `@test-engineer Analyze test coverage for this module`
- `@security-auditor Check this endpoint for vulnerabilities`

### Custom Instructions (User Level)

For skills you want across all repositories:

1. Open VS Code → Settings → GitHub Copilot → Custom Instructions
2. Add your most-used skill summaries

## Recommended Configuration

### .github/copilot-instructions.md

GitHub Copilot supports project-level instructions via `.github/copilot-instructions.md`.

```markdown
# Project Coding Standards

## Testing
- Write tests before code (TDD)
- For bugs: write a failing test first, then fix (Prove-It pattern)
- Test hierarchy: unit > integration > e2e (use the lowest level that captures the behavior)
- Run `npm test` after every change

## Code Quality
- Review across five axes: correctness, readability, architecture, security, performance
- Every PR must pass: lint, type check, tests, build
- No secrets in code or version control

## Implementation
- Build in small, verifiable increments
- Each increment: implement → test → verify → commit
- Never mix formatting changes with behavior changes

## Boundaries
- Always: Run tests before commits, validate user input
- Ask first: Database schema changes, new dependencies
- Never: Commit secrets, remove failing tests, skip verification
```

### Specialized Agents

Use the agents for targeted review workflows in Copilot Chat.

## Lifecycle Workflows

Skills are user-invocable by default, so once they're discovered the whole lifecycle is available under the skills' own names — no extra configuration:

| Workflow | Copilot invocation | Notes |
|----------|--------------------|-------|
| Define | `/spec-driven-development` | Writes a structured spec before code |
| Plan | `/planning-and-task-breakdown` | Produces `tasks/plan.md` and `tasks/todo.md` |
| Build | `/incremental-implementation` | Pair with `/test-driven-development`; one slice at a time |
| Verify | `/test-driven-development` | Red-green-refactor, Prove-It for bugs |
| Review | `/code-review-and-quality` | Five-axis review |
| Ship | `/shipping-and-launch` | Launch readiness |

Type `/` to browse what's actually loaded in this workspace.

Natural language is the fallback, and works in any Copilot surface whether or not the slash commands show up:

> Use the spec-driven-development skill to write a spec for [the feature].

> Use the code-review-and-quality skill to review my staged changes.

### Optional: short `/spec`-style aliases

VS Code's extension-host local agents support [prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files) at `.github/prompts/<name>.prompt.md`, and each becomes a `/<name>` slash command. The Agent Host does **not** use prompt files — there, use the skill names above.

An alias is a thin shortcut to one skill, nothing more. These aliases do not implement the orchestration in this repo's Claude Code commands — `/build auto`'s single-approval plan-and-implement pass and `/ship`'s parallel persona fan-out. Reproducing that on Copilot is its own piece of work, not something a one-file alias covers. Prefer the skill names as your default; reach for aliases only if the short form is worth the extra file.

Create one, without clobbering an existing file:

```bash
mkdir -p .github/prompts
[ -e .github/prompts/spec.prompt.md ] || cat > .github/prompts/spec.prompt.md <<'EOF'
---
description: Write a structured spec before writing code
---

Use the spec-driven-development skill.

Ask clarifying questions about the objective and target users, core features and
acceptance criteria, stack preferences and constraints, and known boundaries.
Then write a spec covering objective, commands, project structure, code style,
testing strategy, and boundaries. Save it as SPEC.md in the project root and
confirm with me before any code is written.
EOF
```

Reload the window, then type `/spec`.

For the rest, run the same `mkdir`/`cat` block with the filename swapped (the filename *is* the command name), and take the `description` and body from this table. **Replace the entire body below the `---` frontmatter**, not just the skill name — the spec body's SPEC.md and clarifying-question instructions belong to Define only, and leaving them in would make `/plan` or `/test` write a spec.

| Alias file | `description` | Complete body — everything below the frontmatter |
|------------|---------------|--------------------------------------------------|
| `.github/prompts/plan.prompt.md` | Break an approved spec into ordered, verifiable tasks | Use the planning-and-task-breakdown skill. Read the spec, then break the work into small, independently verifiable tasks, each with acceptance criteria and explicit dependency order. Save the result to `tasks/plan.md` and `tasks/todo.md`. Write no product code — show me the plan and wait for my approval. |
| `.github/prompts/build.prompt.md` | Implement the next planned task, test-first | Use the incremental-implementation and test-driven-development skills. Read `tasks/plan.md` and `tasks/todo.md`, then take the next unchecked task and only that one. Write a failing test first, make it pass, refactor, run the suite, and tick the task off. Stop there and report what changed. |
| `.github/prompts/test.prompt.md` | Write tests before the code that satisfies them | Use the test-driven-development skill. For new behavior, write a failing test that captures it before any implementation. For a bug, reproduce it with a failing test first, then fix it. Run the suite after each step and show me the red and the green output. |

Write the body yourself, or take it from this table, rather than copying `.claude/commands/*.md` verbatim: those files reference skills as `agent-skills:<name>`, a Claude Code plugin namespace that means nothing to Copilot.

### If the skill slash commands don't appear

Work through these in order — `/spec-driven-development` missing and `/spec` missing have different causes:

1. **Check where the skills landed.** Each one needs its own directory containing a `SKILL.md`. The project-level paths this guide uses are `.github/skills/`, `.claude/skills/` and `.agents/skills/` — but an installer run with a global/user flag writes outside the workspace instead (`~/.agents/skills/` and equivalents), so a skill that isn't in any of the three may simply be installed personally. Confirm the actual path against the [VS Code agent skills docs](https://code.visualstudio.com/docs/agent-customization/agent-skills), then re-install into the project if you wanted it project-scoped.
2. **Check the frontmatter.** `name` must be present and valid — it *is* the slash command. A skill whose frontmatter opts out of user invocation won't appear.
3. **Check the Configure Skills menu.** Run `/skills` and confirm the skill is enabled here.
4. **Start a fresh session.** Newly added skills aren't always picked up mid-conversation.
5. **Check the host.** If `/spec-driven-development` works but your `/spec` alias doesn't, you're likely on the Agent Host, which doesn't read prompt files.
6. **Check versions.** VS Code (**Help → About**) and the Copilot Chat extension; skills-as-slash-commands is recent, so update if either is behind.

## Usage Tips

1. **Keep instructions concise** — Copilot instructions work best when focused. Summarize the key rules rather than including full skill files.
2. **Use agents for review** — The code-reviewer, test-engineer, and security-auditor agents are designed for Copilot's agent model.
3. **Reference in chat** — When working on a specific phase, paste the relevant skill content into Copilot Chat for context.
4. **Combine with PR reviews** — Set up Copilot to review PRs using the code-reviewer agent persona.
