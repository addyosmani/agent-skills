# Contributing

Read [AGENTS.md](AGENTS.md) for the layout and the checks. `Goal.md` and `User.md` are the owner's requirements; never edit them.

## Before proposing a new skill

1. Search the catalog: most ideas overlap an existing skill. Extend it rather than adding a near-duplicate.
2. Check open pull requests (`gh pr list --state open`).
3. Say which gap the skill fills that no existing one does.

## Adding a skill

1. `skills/<kebab-name>/SKILL.md` per [docs/skill-anatomy.md](docs/skill-anatomy.md): frontmatter with `name`, a `description` that says what it does and then "Use when", an optional `category`; sections Overview, When to Use, a process, Common Rationalizations, Red Flags, Verification.
2. A skill copied from elsewhere goes into `skills/` as it is and is refactored to the anatomy after its eval. A skill written here follows the anatomy from the start.
3. `evals/cases/<name>.json` with at least three positive prompts, two negatives owned by other skills, and one behavioral eval.
4. Add it to `manifest.json` if the brain should carry it.
5. `node scripts/validate-skills.js && node scripts/run-evals.js --min-rank1 80`.

## Adding a persona

Follow [docs/persona-anatomy.md](docs/persona-anatomy.md): a narrow role, high-level guidelines, what it never does, the only skills and tools it may use, no model or effort. Add it to `manifest.json` and to the table in `project/AGENTS.md`. `node scripts/validate-agents.js`.

## Changing the rules or the conventions

`project/AGENTS.md` and the rule tables in the convention skills are short on purpose. Tightening is ordinary work; loosening is the owner's call. Anything longer than a rule goes into a reference the rule points at.

## What not to do

- Do not duplicate a rule across a skill, a persona, and a reference. One owns it; the others point.
- Do not weaken a validator to make a change pass.
- Do not put model or effort on a persona; the user sets them per run.
