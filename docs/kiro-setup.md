# Using agent-skills with Kiro

Kiro supports the open Agent Skills format, so the skills in this repository can be used without rewriting them. Kiro discovers each skill from its `SKILL.md` frontmatter, loads only the name and description at startup, and activates the full instructions when your request matches the skill.

## Setup

### Option 1: Import Individual Skills

Use Kiro's **Agent Steering & Skills** panel:

1. Open **Agent Steering & Skills** in Kiro.
2. Click **+** and choose **Import a skill**.
3. Choose **GitHub**.
4. Paste a URL for a specific skill folder or its `SKILL.md`.

Example skill URLs:

```text
https://github.com/addyosmani/agent-skills/tree/main/skills/test-driven-development
https://github.com/addyosmani/agent-skills/blob/main/skills/code-review-and-quality/SKILL.md
```

Kiro requires GitHub imports to target a skill subdirectory or `SKILL.md` file, not the repository root. Repeat the import for each skill you want available.

### Option 2: Workspace Skills

Use workspace skills when you want this pack available only inside one project:

```bash
git clone https://github.com/addyosmani/agent-skills.git
mkdir -p .kiro/skills
cp -R agent-skills/skills/* .kiro/skills/
```

Workspace skills live under:

```text
.kiro/skills/<skill-name>/SKILL.md
```

This is the best fit for team workflows because the skill set can be committed with the project and reviewed like any other project convention.

### Option 3: Global Skills

Use global skills for personal workflows you want in every Kiro workspace:

```bash
git clone https://github.com/addyosmani/agent-skills.git
mkdir -p ~/.kiro/skills
cp -R agent-skills/skills/* ~/.kiro/skills/
```

Global skills live under:

```text
~/.kiro/skills/<skill-name>/SKILL.md
```

If a workspace skill and global skill share the same name, Kiro prioritizes the workspace skill. This lets a project override a personal default when the team needs different instructions.

## Usage

Kiro automatically activates skills when your request matches the `description` field in `SKILL.md`. You can also invoke a skill directly from chat by typing `/` and selecting the skill as a slash command.

Good starting set:

| Skill | Use when |
|-------|----------|
| `spec-driven-development` | Starting a new project, feature, or significant change |
| `planning-and-task-breakdown` | Turning a spec into implementable tasks |
| `incremental-implementation` | Building changes in small verified slices |
| `test-driven-development` | Implementing logic, fixing bugs, or changing behavior |
| `code-review-and-quality` | Reviewing work before merge |

## Kiro Concepts

Kiro separates reusable skills from Kiro-specific context:

| Concept | Use for |
|---------|---------|
| Skills | Portable workflows like TDD, code review, security hardening, and launch checklists |
| Steering | Project-specific Kiro context such as coding standards, repo conventions, or team preferences |
| Powers | MCP-backed integrations that combine tools with guidance |

Use this repository's `skills/` directory for portable workflows. Use Kiro steering for project-specific rules. Do not copy this repository's root `AGENTS.md` into your own project as a generic setup file; it is scoped to contributors working on this repository.

## Maintenance

Imported skills are copied into your Kiro skills directory. To update them, re-import the skill or refresh your local clone and copy the `skills/` directory again.

After updating, check that each skill still has:

- `SKILL.md` in the skill folder
- `name` frontmatter matching the folder name
- `description` frontmatter that says when Kiro should activate it

## References

- [Kiro Agent Skills documentation](https://kiro.dev/docs/skills/)
- [Agent Skills specification](https://agentskills.io/)
