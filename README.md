# Agent Brain

A fork of [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) used as the base of one engineer's own agent brain: the upstream skills and personas, plus more personas, more skills, the conventions, and the way of working that every project the brain runs into follows.

```
you ──▶ /brain [persona] [request]     the main agent adopts one persona, declares
                                        persona · skills · tools · model · harness · effort,
                                        and starts subagents for long-running work
you ──▶ /brain-status                   who is running what, on which model
```

## What is here

| Path | What |
|---|---|
| `AGENTS.md` · `CLAUDE.md` | how to work on this repository; `CLAUDE.md` only points at `AGENTS.md` |
| `project/` | files copied as they are to a project's root: `AGENTS.md`, the organization every agent runs under, with the installed skills and personas filled in by the build; `SOUL.md`, how every agent carries itself |
| `agents/` | personas: root, product manager, backend, web, and mobile engineers, scout, the reviewers |
| `skills/` | the flat skill dump, including the convention skills, each a table of rules with ids, none overridable; `manifest.json` names the ones in the brain |
| `references/` | ticket anatomy, commit and PR anatomy, review guidelines, the development loop, the documentation map, context scope, the upstream checklists |
| `templates/` | the documents a project fills in: ARCHITECTURE, PRD, HLD, LLD, DOMAIN, ADR, DEVELOPMENT, DEPLOYMENT, CHANGELOG, LEARNINGS |
| `docs/` | skill and persona anatomies, per-tool setup guides |
| `evals/` | trigger and routing evals for every skill |

## Use it

```bash
node scripts/build-brain.js          # assemble build/ from manifest.json
```

Then follow `build/README.md` to copy the brain into a project, and start a session there with `/brain`. Or install this repository as a plugin the way upstream does (`docs/getting-started.md`). The `/brain` and `/brain-status` commands ship for Claude Code, Gemini CLI, Antigravity, and pi (`docs/pi-setup.md`).

## Change it

- New skill: `skills/<name>/SKILL.md` per [docs/skill-anatomy.md](docs/skill-anatomy.md), an eval case in `evals/cases/`, a line in `manifest.json`. A skill copied from elsewhere may keep its shape until it is refactored after its eval.
- New persona: `agents/<name>.md` per [docs/persona-anatomy.md](docs/persona-anatomy.md), a line in `manifest.json` and in `project/AGENTS.md`.
- Checks: `node scripts/validate-skills.js`, `validate-agents.js`, `validate-reference-links.js`, `validate-commands.js`, `run-evals.js --min-rank1 80`.

`Goal.md` and `User.md` are the owner's requirements and are never edited by agents.

## Credits

The skill format, most engineering skills, the shared checklists, the slash commands, and the eval framework are from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), MIT licensed under the original copyright; see [LICENSE](LICENSE).
