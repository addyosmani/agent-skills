# Using agent-skills with GitHub Copilot

## Setup

### Agent Skills

Copilot supports creating agent skills using a `.github/skills`, `.claude/skills`, or `.agents/skills` directory in your repository.

Install all skills from the root of the repository where you use Copilot:

```bash
npx skills add addyosmani/agent-skills --agent github-copilot --skill '*' --copy --yes
```

This installs the skills in `.agents/skills/`, one of Copilot's supported project locations. To start with only the three essential skills:

```bash
npx skills add addyosmani/agent-skills --agent github-copilot --skill spec-driven-development --skill test-driven-development --skill code-review-and-quality --copy --yes
```

> **Skills and agents are separate.** The skills CLI installs the workflows in `skills/`; it does not install the personas in `agents/`. Follow the next section if you also want selectable custom agents.

For more details, refer [Adding agent skills for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills).

### Agent Personas (*.agent.md)

Copilot supports specialized agent personas. Use the agent-skills agents:

> **Important:** GitHub Copilot requires custom agent files to be named `*.agent.md`.
> Files named `*.md` are silently ignored by Copilot.
> See [VS Code custom agents docs](https://code.visualstudio.com/docs/agent-customization/custom-agents#_custom-agent-file-structure) for details.

```bash
# Create the agents directory and copy agent definitions
mkdir -p .github/agents
cp /path/to/agent-skills/agents/code-reviewer.md .github/agents/code-reviewer.agent.md
cp /path/to/agent-skills/agents/test-engineer.md .github/agents/test-engineer.agent.md
cp /path/to/agent-skills/agents/security-auditor.md .github/agents/security-auditor.agent.md
cp /path/to/agent-skills/agents/web-performance-auditor.md .github/agents/web-performance-auditor.agent.md
```

PowerShell:

```powershell
$source = "C:\path\to\agent-skills\agents"
$destination = ".github\agents"

New-Item -ItemType Directory -Force -Path $destination | Out-Null
Get-ChildItem -LiteralPath $source -Filter "*.md" | ForEach-Object {
  $name = [IO.Path]::GetFileNameWithoutExtension($_.Name)
  Copy-Item -LiteralPath $_.FullName -Destination "$destination\$name.agent.md"
}
```

In VS Code, select the persona from the agent picker in Copilot Chat, then enter the task:

- Select `code-reviewer`, then enter `Review this PR`.
- Select `test-engineer`, then enter `Analyze test coverage for this module`.
- Select `security-auditor`, then enter `Check this endpoint for vulnerabilities`.
- Select `web-performance-auditor`, then enter `Audit this web application`.

Custom agents are modes in current VS Code releases, not agent skills. If they do not appear, run **Chat: Open Customizations** to inspect discovery, then run **Developer: Reload Window** after adding the files.

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

## Usage Tips

1. **Keep instructions concise** — Copilot instructions work best when focused. Summarize the key rules rather than including full skill files.
2. **Use agents for review** — The code-reviewer, test-engineer, and security-auditor agents are designed for Copilot's agent model.
3. **Reference in chat** — Skills load automatically when their descriptions match the task. You can also ask Copilot to use a skill explicitly, such as "Use the test-driven-development skill for this change."
4. **Combine with PR reviews** — Set up Copilot to review PRs using the code-reviewer agent persona.
