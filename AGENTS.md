# agent-brain

This repository is where the brain is built: the personas in `agents/`, the skills in `skills/`, the conventions as skills with rule ids, the shared references in `references/`, the document templates in `templates/`, and the checks and evals that keep them honest. Agents working here maintain those assets. They do not run under the organization the brain ships; that is `project/AGENTS.md`, and its way of working and coding conventions are not rules for this repository.

## Project structure

```
AGENTS.md        this file: how to work on the repository
CLAUDE.md        points here
project/         files copied as they are to a project's root: AGENTS.md (the organization; the build fills in the installed skills and personas), SOUL.md, .env.example
agents/          personas, one file per role (docs/persona-anatomy.md)
skills/          the flat skill dump (docs/skill-anatomy.md)
references/      shared checklists and the way-of-working contracts
templates/       documents a project fills in under docs/: ARCHITECTURE, PRD, HLD, LLD, LEARNINGS, ...
manifest.json    which skills and personas make up the brain
scripts/         validators, the eval runner, and build-brain.js
.claude/commands/ .gemini/commands/ commands/ .pi/prompts/   slash commands: /brain, /brain-status (plus the upstream set in the first three)
evals/           trigger and routing evals; every skill needs a case
docs/            anatomies and per-tool setup guides
```

## Commands

| Purpose | Command |
|---|---|
| Skill anatomy | `node scripts/validate-skills.js` |
| Persona anatomy and manifest | `node scripts/validate-agents.js` |
| Reference links | `node scripts/validate-reference-links.js` |
| Command parity across tools | `node scripts/validate-commands.js` |
| Trigger and routing evals | `node scripts/run-evals.js --min-rank1 80` |
| Assemble the brain from `manifest.json` | `node scripts/build-brain.js` → `build/` |

## Conventions for this repository

- A skill lives at `skills/<kebab>/SKILL.md` with `name`, a `description` that says what it does and then "Use when", an optional `category`, and the sections in [docs/skill-anatomy.md](docs/skill-anatomy.md). A skill copied from elsewhere may keep its own shape until it is refactored after its eval; a skill written here follows the anatomy from the start. Every skill needs `evals/cases/<name>.json`.
- A persona lives at `agents/<kebab>.md` and follows [docs/persona-anatomy.md](docs/persona-anatomy.md). It lists the only skills and tools it may use, and carries no model or effort. Add it to `manifest.json` and to the persona table in `project/AGENTS.md`.
- Never duplicate content between a skill, a persona, and a reference. A skill has an unambiguous "Use when" and may name a related skill and the relation between them (an "Interaction with other skills" section), never cite its rules line by line; the persona says which skills are fetched for which activity. A convention rule is cited by id inside its own skill and from tickets, reviews, and references (`coding-standards` C13); the prefix index lives in `project/AGENTS.md`.
- `Goal.md` and `User.md` are the owner's requirements. Never edit them.
- Before adding a skill, run the pre-flight in [CONTRIBUTING.md](CONTRIBUTING.md).

## Learnings from projects

A project's `docs/LEARNINGS.md`, stamped from `templates/LEARNINGS.md`, is where its agents record what would change a rule, a skill, or a persona: an override the user granted, a correction of what a rule told the agent to do, a gap in a skill, or a workaround around one, at the moment it happens. Ordinary requests and one-off preferences stay on the ticket. That file is written there and read here: it is the input to this repository, and the harness (the personas, skills, conventions, references, and templates) improves from it. Nothing in a note is a rule until it lands here and passes the checks above.

How a note becomes a change:

| Kind | What it points at | What changes here |
|---|---|---|
| `feedback` | the skill, persona, or rule the correction concerns | reword the rule, add the rationalization it defeated, or move the guidance to the persona if it was a routing mistake |
| `gap` | a rule or skill that was silent, ambiguous, or wrong | extend the skill that should have covered it, or write the one that will, with its eval case |
| `workaround` | a missing capability or a tool limitation | the same as a gap: the skill, a reference, or a tool skill's mapping |
| `override` | a rule the user set aside on purpose | if it recurs, the rule was wrong or its stated override condition was; change the rule, never delete the note |

A note that recurs across tickets or projects is the signal to act; a single note is evidence to keep. An agent in a project may make an obvious, small fix to a skill in the same task and reference the note; anything larger waits for the maintainer. Notes are never deleted: they are the record of why a skill changed.
