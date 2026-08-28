# Developer Onboarding

This guide is for people working **on** the agent-skills repository itself: contributing skills, fixing docs, improving the eval harness. If you want to *use* the skills in your own projects, you're looking for [getting-started.md](getting-started.md) instead.

It's a guided tour, not a rulebook. The rules live in [CONTRIBUTING.md](../CONTRIBUTING.md) (contribution workflow), [skill-anatomy.md](skill-anatomy.md) (skill format), and [evals/README.md](../evals/README.md) (eval framework); this document tells you when to read each one and how the pieces fit.

---

## 1. The mental model

The repo has five composable layers. Understanding what each one is *for* prevents the most common contribution mistakes (putting reference material in a skill, building a persona that routes to other personas, duplicating content across skills).

| Layer | Location | Job | In one word |
|---|---|---|---|
| **Skills** | `skills/<name>/SKILL.md` | Step-by-step workflows with verification gates | *How* |
| **Personas** | `agents/<role>.md` | Roles with a perspective and output format | *Who* |
| **Commands** | `.claude/commands/`, `.gemini/commands/`, `commands/` | User-facing entry points; the orchestration layer | *When* |
| **References** | `references/*.md` | Checklists skills pull in on demand | *What to check* |
| **Evals** | `evals/cases/<name>.json` | Proof that skills trigger and behave correctly | *Does it work* |

Two structural rules worth internalizing early:

- **The user (or a slash command) is the orchestrator.** Personas never invoke other personas; the only endorsed multi-persona pattern is parallel fan-out with a merge step (see [references/orchestration-patterns.md](../references/orchestration-patterns.md)).
- **Don't duplicate, reference.** Skills link to other skills and to `references/` instead of restating content. The same rule applies to docs, including this one.

One scope caveat that trips people up: `AGENTS.md` and `CLAUDE.md` at the repo root configure agents working on *this repo*. They are not reusable assets and setup guides must never tell users to copy them into their own projects; the reusable assets are the skills.

Note that commands exist in three parallel directories (Claude Code, Gemini CLI, Antigravity). Touch one and CI checks parity across all of them, see §3.

## 2. Local setup

```bash
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills
```

There's no build step and no `package.json`; validators are plain Node scripts. You need:

- **Node 20+** (what CI runs) for the `scripts/` validators
- **bash** (+ `jq` recommended) for the hook regression test
- **`gh` CLI** for the duplicate-PR check before proposing a skill
- **Claude Code** only if you want to run Tier 3 behavioral evals locally

To try the pack live against a local checkout:

```bash
claude --plugin-dir /path/to/agent-skills
```

## 3. The verification loop

The repo eats its own cooking: verification is non-negotiable for skills, and it's non-negotiable for contributions to the repo too. Everything CI runs, you can run locally in seconds:

```bash
# Tier 1, structural: frontmatter, naming, required sections
node scripts/validate-skills.js

# Command parity and description sync across the three command directories
node scripts/validate-commands.js

# Tier 2, trigger & routing: positive prompts rank top-k, negatives don't collide
node scripts/run-evals.js

# Tier 3, behavioral (on demand, spends tokens; --dry-run prints the plan)
node scripts/run-evals.js --behavioral <skill-name> --dry-run

# Hook regression test, required if you touch hooks/session-start.sh
# or skills/using-agent-skills/SKILL.md
bash hooks/session-start-test.sh
```

The three eval tiers are worth understanding even if you never touch the harness, because a red Tier 2 usually means *fix your skill's description*, not the eval: Tier 2 is a lexical approximation of routing (stemmed TF-IDF over descriptions), and its two target failure modes are a description missing the vocabulary users actually say, and an over-broad description that outranks the right skill. The full design, schema, and trust-level rules are in [evals/README.md](../evals/README.md).

Run the relevant subset before every PR. A PR that arrives green through Tier 1 + Tier 2 + command parity is reviewable; one that doesn't will bounce on mechanics before anyone reads the content.

## 4. Contribution paths

### Path 1: Fixing or improving an existing skill (most common, best first PR)

1. Keep changes focused and minimal; preserve the skill's structure and tone.
2. If you changed the frontmatter `description`, expect Tier 2 effects; run `node scripts/run-evals.js` and check the skill's trigger prompts still rank.
3. Run Tier 1 to confirm frontmatter is still valid.

### Path 2: Proposing a new skill (higher bar, do the pre-flight)

The catalog already covers most of the lifecycle, so the burden of proof is on the gap. Before writing anything, run the pre-flight checks in [CONTRIBUTING.md](../CONTRIBUTING.md#before-proposing-a-new-skill): search the catalog, check open PRs (`gh pr list --state open`; near-duplicate clusters already exist), confirm the idea fits [skill-anatomy.md](skill-anatomy.md), and justify the gap explicitly in your PR description. If it overlaps an existing skill, a focused edit to that skill beats a new directory.

A new skill ships as a set, not a single file: the `skills/<kebab-case-name>/SKILL.md`, a matching `evals/cases/<name>.json`, and a `scripts/` directory only when it ships runnable helpers (reference material goes in `references/`, never inside the skill). The exact frontmatter rules, the section anatomy, and the eval-case minimums live in [CONTRIBUTING.md](../CONTRIBUTING.md#structure) and [skill-anatomy.md](skill-anatomy.md); take them from there rather than this tour, so the two can't drift.

One point worth internalizing rather than looking up: when writing trigger prompts, paraphrase how users actually talk; copying the description into the prompts games the eval and tells you nothing.

### Path 3: Docs, references, harness

- Docs and skills are **English only**; translations aren't accepted because they drift ([CONTRIBUTING.md](../CONTRIBUTING.md#translations) has the rationale).
- Changes to `scripts/run-evals.js` or the eval schema should stay compatible with skill-creator's `evals.json` schema (adopted verbatim for the behavioral tier; that compatibility is a feature, not an accident).
- Anything touching the session-start hook or the meta-skill it embeds requires the hook regression test (§3).

## 5. Pre-PR checklist

- [ ] Tier 1 green: `node scripts/validate-skills.js`
- [ ] Tier 2 green: `node scripts/run-evals.js`
- [ ] Command parity green if you touched any command directory: `node scripts/validate-commands.js`
- [ ] Hook test green if you touched `hooks/` or `using-agent-skills`
- [ ] New skill → eval case file present with the minimum trigger/behavioral counts
- [ ] New skill → gap justified in the PR description; catalog and open PRs checked
- [ ] No duplicated content; cross-references used instead
- [ ] Change is small and focused (the repo's own `code-review-and-quality` change-sizing guidance applies to contributions here too)

## 6. Suggested reading order

1. [README.md](../README.md): the catalog and the lifecycle diagram (10 min)
2. `skills/using-agent-skills/SKILL.md`: how routing works from the agent's side
3. One well-established skill end to end (e.g. `test-driven-development`): internalize the anatomy by example
4. [skill-anatomy.md](skill-anatomy.md): the format spec, now with context
5. [evals/README.md](../evals/README.md): the three tiers and the case format
6. [CONTRIBUTING.md](../CONTRIBUTING.md) + [AGENTS.md](../AGENTS.md): the rules and the repo-scoped agent config
