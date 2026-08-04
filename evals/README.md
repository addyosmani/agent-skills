# Skill Evals

How this repo measures whether its skills actually work: that they **trigger** when they should, **stay distinct** from each other, and **change agent behavior** the way each skill promises.

## Prior art (and what we adopted)

There is no single settled community standard for evaluating `SKILL.md` skills, but two approaches lead:

- **Anthropic's skill-creator v2** defines a per-skill `evals.json` (prompt + `expectations[]`, graded from the transcript) plus trigger-accuracy testing of descriptions against sample prompts. We adopt its [`evals.json` schema](https://github.com/anthropics/skills/tree/main/skills/skill-creator) for our behavioral tier and add one optional `kind` field to select the artifact being graded.
- **Superpowers** (obra) tests skills with bash + `claude -p` + prompt fixtures and grader scripts. Our behavioral runner follows the same headless-`claude` pattern, with the grading rubric drawn from `expectations[]`.

What neither provides is a **deterministic, CI-safe** check for a multi-skill *catalog* — does each skill's description carry the vocabulary users actually say, and do two skills' descriptions collide? That's Tier 2 below, and it's this repo's addition.

## The three tiers

| Tier | What it checks | Runs | Cost |
|---|---|---|---|
| 1. Structural | Frontmatter, naming, required sections, command parity | CI (`validate-skills.js`, `validate-commands.js`) | Free |
| 2. Trigger & routing | Positive prompts rank their skill top-k; negative prompts don't; no two descriptions near-collide | CI (`run-evals.js`) | Free |
| 3. Behavioral | An agent following the skill satisfies its `expectations[]` | On demand (`run-evals.js --behavioral`) | Tokens |

Tier 2 is a **lexical approximation** of routing (stemmed TF-IDF over descriptions). It cannot judge semantics — that's Tier 3's job — but it catches the two failure modes that dominate real trigger bugs: a description missing the vocabulary users say (false negative), and an over-broad description that outranks the right skill (false positive). A Tier-2 failure usually means *fix the description*, not the eval.

## Running

```bash
# Tier 2 — deterministic, runs in CI
node scripts/run-evals.js
node scripts/run-evals.js --min-rank1 80  # enforce the current routing floor

# Tier 3 — behavioral, runs each eval through headless claude, then grades it
node scripts/run-evals.js --behavioral test-driven-development            # spends tokens
node scripts/run-evals.js --behavioral test-driven-development --dry-run  # prints the plan only
```

Tier 3 supports two behavioral artifact kinds. `execution` is the default: each eval runs in a throwaway git repository, real project inputs from `files[]` are materialized out of `evals/fixtures/` and committed as the baseline, and the grader judges the full `--output-format stream-json --verbose` execution trace, including tool calls. `dialogue` is reserved for skills whose deliverable is the conversation itself; it needs no fixture, and the grader judges the assistant's conversational turns without requiring file edits or commands. Claiming `dialogue` is a human-reviewed exemption, not a general escape hatch for execution skills.

The executor runs with an explicit permission mode (`--permission-mode acceptEdits` plus a pre-approved tool list) so execution evals can genuinely edit files, run commands, inspect diffs, and make commits rather than being denied and narrating instead. Traces are fenced as untrusted data in the grader prompt and piped to the grader over stdin (they can be megabytes; argv would hit the OS argument-size limit), executor and grader calls carry timeouts, and grader output is validated as JSON before being written to `evals/results/` (gitignored) in skill-creator's `grading.json` shape. Discipline skills also include pressure cases for time pressure, sunk cost, and authority pressure; these verify that the workflow still holds when the prompt argues for skipping it.

## Eval case format

One file per skill: `evals/cases/<skill-name>.json`.

```json
{
  "skill_name": "test-driven-development",
  "trigger": {
    "positive": [
      { "prompt": "Write a failing test for this bug before fixing it", "top_k": 3 }
    ],
    "negative": [
      { "prompt": "Update the architecture diagram in the docs", "owner": "documentation-and-adrs" }
    ]
  },
  "evals": [
    {
      "id": 1,
      "kind": "execution",
      "prompt": "Fix the reported rounding bug in the invoice totals, test-first.",
      "expected_output": "A failing test demonstrating the bug, a minimal fix turning it green, full suite passing",
      "files": [
        "test-driven-development"
      ],
      "expectations": [
        "A failing test is written and shown failing before the fix",
        "The implementation is the minimum needed to pass",
        "The full suite is run after the fix to catch regressions"
      ]
    }
  ]
}
```

- `evals[]` uses skill-creator's core schema (`id`, `prompt`, `expected_output`, optional `files[]`, `expectations[]`) plus this repository's optional `kind`. `kind` must be `execution` or `dialogue` and defaults to `execution` for compatibility. Execution evals require non-empty `files[]`; paths are relative to `evals/fixtures/` and may name a file or project directory. Dialogue evals may omit `files[]` because the transcript is the artifact. Expectations are verifiable statements a grader checks against the relevant artifact — behaviors, not phrasings.
- `trigger` is this repo's extension. `positive` prompts are realistic user asks that should route here (`top_k` defaults to 3; tighten to 1 for a skill's signature ask). `negative` prompts belong to a *different* skill; this skill must not rank first for them. Declare that skill in `owner` where you can: the runner then asserts the owner **outranks** this skill, turning the negative into a real pairwise routing test instead of one that can pass vacuously when the prompt matches nothing.

**Writing good trigger prompts:** paraphrase how users actually talk; don't copy the description (that's gaming the eval). If a realistic prompt can't rank because the description lacks its vocabulary, that is a real finding — improve the description.

## Adding a skill

Every skill ships with an eval file. When you add `skills/<name>/`, add `evals/cases/<name>.json` with at least 3 positive triggers, 2 negative triggers, and 1 behavioral eval. Execution evals must be backed by `evals/fixtures/<name>/`; use `kind: "dialogue"` only when the skill's deliverable is genuinely the conversation itself. Missing case files, incomplete case counts, unknown kinds, invalid fixture paths, and absent required fixtures are CI errors.

## Metrics to watch

The Tier-2 run prints a **trigger rank-1 rate** (share of positive prompts that rank their skill first, not merely top-k). CI runs with `--min-rank1 80`, leaving useful headroom below the checked-in 86% baseline so an unrelated description edit does not immediately turn CI red. Raise the floor as routing improves; never lower it to make a regression pass. Falling numbers mean descriptions are drifting toward each other. The collision check errors at ≥75% pairwise description similarity and warns at ≥50%. Known description-vocabulary gaps surfaced by these evals are tracked in [#351](https://github.com/addyosmani/agent-skills/issues/351).
