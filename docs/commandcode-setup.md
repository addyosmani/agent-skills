# Using agent-skills with Command Code

[Command Code](https://commandcode.ai) has a native skills system. The built-in `cmd skills` command clones a GitHub repo, recursively discovers every `SKILL.md`, and installs the ones you pick.

The Command Code binary is available as `cmd` (with aliases `cmdc` on Windows and `command-code`). The examples below use `cmd`.

## Install

**Project scope** (installs into `.commandcode/skills/` at the current git root — the default):

```bash
cmd skills add addyosmani/agent-skills
```

In an interactive terminal this shows a multi-select so you can choose which of the 24 skills to install. Pipe/non-interactive invocations install all discovered skills.

**Install a specific skill:**

```bash
cmd skills add addyosmani/agent-skills -s spec-driven-development
```

**User scope** (installs into `~/.commandcode/skills/`, available in every project):

```bash
cmd skills add addyosmani/agent-skills --global
```

**Other supported forms:**

```bash
cmd skills add addyosmani/agent-skills@main            # a specific branch
cmd skills add addyosmani/agent-skills/skills/interview-me   # a specific path in the repo
cmd skills add addyosmani/agent-skills --force         # overwrite / update if already installed
```

## Manage

```bash
cmd skills list                       # list installed skills (project + user + bundled)
cmd skills remove spec-driven-development           # remove a project-scoped skill
cmd skills remove spec-driven-development --global  # remove a user-scoped skill
```

`--force` on `add` re-fetches and overwrites an existing skill, which is how you update to the latest version.

## Usage

Installed skills are discovered automatically and appear in the TUI slash menu, tagged `[skill]`:

```
/spec-driven-development   [skill] Write a spec before writing code…
```

Type `/` to browse, or start typing a skill name to filter. Use `/skills` to enable/disable skills.

## Where skills live

Command Code discovers skills from these locations (project entries resolve against the nearest git root):

| Scope | Path |
|-------|------|
| Project | `.commandcode/skills/<name>/SKILL.md` |
| Project (agents-compat) | `.agents/skills/<name>/SKILL.md` |
| User | `~/.commandcode/skills/<name>/SKILL.md` |
| User (agents-compat) | `~/.agents/skills/<name>/SKILL.md` |

`cmd skills add` writes to `.commandcode/skills/` (project) or `~/.commandcode/skills/` (`--global`).

