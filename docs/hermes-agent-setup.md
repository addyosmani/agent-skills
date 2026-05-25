# Hermes Agent Setup

Hermes Agent can use the skills in this repository as local `SKILL.md`-based workflows. Install the repo's `skills/` directories into your Hermes skills home, then start a new Hermes session so the skill index refreshes.

## Installation

1. Clone this repository:

```bash
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills
```

2. Copy the skills into Hermes' user skills directory:

```bash
mkdir -p ~/.hermes/skills
cp -R skills/* ~/.hermes/skills/
```

3. Start a new Hermes session:

```bash
hermes chat
```

Hermes discovers user skills from `~/.hermes/skills` and exposes them to the agent as available skills. The agent should load the relevant skill before working on a matching task.

## Usage

Ask Hermes to use one of the engineering workflows explicitly:

```text
Use spec-driven-development to write a spec for this feature.
```

```text
Use test-driven-development for this bug fix.
```

```text
Use code-review-and-quality to review this PR before merge.
```

You can also rely on the skill descriptions to trigger automatically when a task clearly matches a workflow, but explicit skill names are useful when introducing a new skill pack.

## Suggested starter set

If you want a smaller install instead of copying everything, start with the core lifecycle skills:

```bash
mkdir -p ~/.hermes/skills
cp -R skills/using-agent-skills ~/.hermes/skills/
cp -R skills/spec-driven-development ~/.hermes/skills/
cp -R skills/planning-and-task-breakdown ~/.hermes/skills/
cp -R skills/incremental-implementation ~/.hermes/skills/
cp -R skills/test-driven-development ~/.hermes/skills/
cp -R skills/code-review-and-quality ~/.hermes/skills/
cp -R skills/shipping-and-launch ~/.hermes/skills/
```

This gives Hermes the same basic development lifecycle used by the slash commands in this repository.

## Notes

- Hermes skills are directory-based; each skill directory should contain a `SKILL.md` file.
- Start a new session after adding or updating skills so the available-skills index is rebuilt.
- If you keep this repository cloned, repeat the `cp -R` step after pulling updates.
- Hermes documentation: <https://hermes-agent.nousresearch.com/docs>
