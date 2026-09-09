# Using agent-skills with Qoder

Qoder uses the same `SKILL.md` format as this repository. The supported
integration contract is the complete set of workflows under `skills/`; Qoder
can discover them automatically and load each workflow only when it is needed.

## Install with the Skills CLI (recommended)

Install the skills for the current project:

```bash
npx skills add addyosmani/agent-skills -a qoder
```

This installs the selected workflows under `.qoder/skills/`, which can be
committed when a team wants to share the same setup.

To make the workflows available in every project for the current user, add the
global flag:

```bash
npx skills add addyosmani/agent-skills -a qoder -g
```

Global skills are installed under `~/.qoder/skills/`. Project skills take
precedence when a skill with the same name exists at both scopes.

List the Qoder skills that the Skills CLI knows about:

```bash
npx skills list -a qoder
```

## Install manually

From a local clone, copy the canonical `skills/` tree into the project-level
Qoder directory:

```bash
git clone https://github.com/addyosmani/agent-skills.git
mkdir -p /path/to/your-project/.qoder/skills
rsync -a agent-skills/skills/ /path/to/your-project/.qoder/skills/
```

For user-level installation, use `~/.qoder/skills/` as the destination instead.
Keep `agent-skills/skills/` as the upstream source and update the installed copy
when this repository changes.

Do not copy this repository's root `AGENTS.md` or `CLAUDE.md` into another
project. Those files configure agents that contribute to agent-skills itself;
the reusable workflows are the files under `skills/`.

## Use the skills

Start a new Qoder session after installation so the skill inventory is
refreshed. Skills can then be used in either of two ways:

- Describe the task naturally and let Qoder choose a matching skill from its
  `description` metadata.
- Type `/` in chat and select a skill explicitly, such as
  `/spec-driven-development` or `/code-review-and-quality`.

Use `using-agent-skills` when you want Qoder to route a task through the full
define, plan, build, verify, review, and ship lifecycle.

## Local plugin development

The repository also carries `.qoder-plugin/plugin.json` so a local checkout has
explicit Qoder plugin identity and version metadata. Validate a checkout
without installing it:

```bash
qodercli plugin validate /path/to/agent-skills
qodercli plugin list --plugin-dir /path/to/agent-skills --json
```

For an IDE-based development flow, Qoder can import the local checkout from its
Plugins interface. Start a new session after importing or updating the plugin.

The portable support contract in this guide is the root `skills/` directory.
Other repository assets are host-specific: `.claude/commands/` targets Claude
Code, `.gemini/commands/` targets Gemini CLI, and `commands/*.toml` targets
Antigravity CLI. Do not assume those command packages are Qoder commands merely
because the local plugin validator can scan the repository.

## Verify

After installation or import:

1. Start a new Qoder session.
2. Type `/` and confirm the installed skill names appear.
3. Invoke `/spec-driven-development` or ask Qoder to define a small feature.
4. Confirm Qoder loads that skill's instructions before proposing
   implementation.

For a local plugin checkout, also require both commands below to succeed:

```bash
qodercli plugin validate /path/to/agent-skills
qodercli plugin list --plugin-dir /path/to/agent-skills --json
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Skills are missing | Confirm `SKILL.md` files exist under `.qoder/skills/<name>/` or `~/.qoder/skills/<name>/`, then start a new session. |
| The wrong copy is used | Project-level `.qoder/skills/` takes precedence over the user-level copy. |
| A local plugin has no version | Confirm `.qoder-plugin/plugin.json` exists in the plugin root and rerun `qodercli plugin validate`. |
| Skills are stale | Run `npx skills update` for the installed scope, or resync from the upstream `skills/` directory. |
| A lifecycle shortcut is unavailable | Invoke the underlying skill directly; command packages in this repository are host-specific. |

## See also

- [Getting Started](getting-started.md)
- [Adoption Guide](adoption-guide.md)
- [Qoder Skills documentation](https://docs.qoder.com/extensions/skills)
- [Qoder Plugins documentation](https://docs.qoder.com/extensions/plugins)
- [Qoder CLI plugin layout](https://docs.qoder.com/cli/sdk/plugins)
