# Using agent-skills with GitHub Copilot

## Setup

### Copilot Instructions

Copilot supports creating agent skills using a `.github/skills`, `.claude/skills`, or `.agents/skills` directory in your repository.

```bash
mkdir -p .github/skills/test-driven-development .github/skills/code-review-and-quality

# Create files for essential skills
cat /path/to/agent-skills/skills/test-driven-development/SKILL.md > .github/skills/test-driven-development/SKILL.md
cat /path/to/agent-skills/skills/code-review-and-quality/SKILL.md > .github/skills/code-review-and-quality/SKILL.md
```

For more details, refer [Creating agent skills for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills).

### Agent Personas (*.agent.md)

Copilot supports specialized agent personas. Use the agent-skills agents:

> **Important:** Use the `*.agent.md` extension for compatibility across VS Code and GitHub Copilot coding agent.
> VS Code also detects plain `*.md` files in `.github/agents`, but other Copilot surfaces may not.
> See [VS Code custom agents docs](https://code.visualstudio.com/docs/agent-customization/custom-agents#_custom-agent-file-structure) for details.

Skills and personas are separate customizations. Installing or copying skills does not install the personas.

Run this from the target repository root. The source repository is cloned to a temporary directory and removed after the four persona files are copied:

```bash
source_dir="$(mktemp -d)"
git clone --depth 1 https://github.com/addyosmani/agent-skills.git "$source_dir"

mkdir -p .github/agents
for agent in code-reviewer test-engineer security-auditor web-performance-auditor; do
  cp "$source_dir/agents/$agent.md" ".github/agents/$agent.agent.md"
done

rm -rf "$source_dir"
```

PowerShell:

```powershell
$source = Join-Path ([IO.Path]::GetTempPath()) "agent-skills-$([guid]::NewGuid())"

try {
  git clone --depth 1 https://github.com/addyosmani/agent-skills.git $source
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to clone agent-skills."
  }

  $destination = ".github\agents"
  New-Item -ItemType Directory -Force -Path $destination | Out-Null

  foreach ($agent in @(
    "code-reviewer",
    "test-engineer",
    "security-auditor",
    "web-performance-auditor"
  )) {
    Copy-Item `
      -LiteralPath (Join-Path $source "agents\$agent.md") `
      -Destination (Join-Path $destination "$agent.agent.md")
  }
}
finally {
  Remove-Item -LiteralPath $source -Recurse -Force -ErrorAction SilentlyContinue
}
```

Open the target repository root in VS Code. In Copilot Chat, select the persona from the agent picker, then enter the task:

- Select `code-reviewer`, then enter `Review this PR`.
- Select `test-engineer`, then enter `Analyze test coverage for this module`.
- Select `security-auditor`, then enter `Check this endpoint for vulnerabilities`.
- Select `web-performance-auditor`, then enter `Audit this web application`.

Custom agents are modes in current VS Code releases, not agent skills or `@` mentions. If they do not appear, run **Chat: Open Customizations** to inspect discovery, then run **Developer: Reload Window** after adding the files.

In GitHub Copilot CLI, run from the target repository root:

```bash
copilot --agent code-reviewer
```

To target a repository without changing directories:

```bash
copilot -C "/path/to/repository" --agent code-reviewer
```

In an interactive CLI session, use `/agent` to switch personas.

For Copilot cloud agent, commit the `.github/agents/*.agent.md` files and merge them into the repository's default branch. The personas then appear in the custom-agent dropdown on GitHub.

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
3. **Reference in chat** — When working on a specific phase, paste the relevant skill content into Copilot Chat for context.
4. **Combine with PR reviews** — Set up Copilot to review PRs using the code-reviewer agent persona.
