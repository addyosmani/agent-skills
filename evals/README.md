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
| 1. Structural | Frontmatter, naming, required sections, layout and line budget, `references/` links, command parity, artifact paths, manifest versions | CI (`validate-skills.js`, `validate-reference-links.js`, `validate-commands.js`, `validate-artifact-paths.js`, `validate-versions.js`) | Free |
| 2. Trigger & routing | Positive prompts rank their skill top-k; negative prompts don't; no two descriptions near-collide | CI (`run-evals.js --min-rank1 95`) | Free |
| 3. Behavioral | An agent following the skill satisfies its `expectations[]` | On demand (`run-evals.js --behavioral`) | Tokens |

Tier 2 is a **lexical approximation** of routing (stemmed TF-IDF over descriptions). It cannot judge semantics — that's Tier 3's job — but it catches the two failure modes that dominate real trigger bugs: a description missing the vocabulary users say (false negative), and an over-broad description that outranks the right skill (false positive). A Tier-2 failure usually means *fix the description*, not the eval.

## Running

```bash
# Tier 2 — deterministic, runs in CI
node scripts/run-evals.js
node scripts/run-evals.js --min-rank1 95  # enforce the current routing floor

# Tier 3 — behavioral, runs each eval through headless claude, then grades it
node scripts/run-evals.js --behavioral test-driven-development            # spends tokens
node scripts/run-evals.js --behavioral test-driven-development --dry-run  # prints the plan only
```

Tier 3 supports two behavioral artifact kinds. `execution` is the default: each eval runs in a throwaway git repository, real project inputs from `files[]` are materialized out of `evals/fixtures/` and committed as the baseline, and the grader judges the full `--output-format stream-json --verbose` execution trace, including tool calls. `dialogue` is reserved for skills whose deliverable is the conversation itself; it needs no fixture, and the grader judges the assistant's conversational turns without requiring file edits or commands. Claiming `dialogue` is a human-reviewed exemption, not a general escape hatch for execution skills.

The executor runs with an explicit permission mode (`--permission-mode acceptEdits` plus a pre-approved tool list) so execution evals can genuinely edit files, run commands, inspect diffs, and make commits rather than being denied and narrating instead. Traces are fenced as untrusted data in the grader prompt and piped to the grader over stdin (they can be megabytes; argv would hit the OS argument-size limit), executor and grader calls carry timeouts, and grader output is validated as JSON before being written to `evals/results/` (gitignored) in skill-creator's `grading.json` shape. Discipline skills also include pressure cases for time pressure, sunk cost, and authority pressure; these verify that the workflow still holds when the prompt argues for skipping it.

## Plugin evals (Claude Code)

`claude plugin eval` (Claude Code 2.1.269 or later) loads the whole plugin, every skill at once, runs the cases under `evals/plugin/`, and scores each case with and without the plugin. It complements Tier 2 rather than replacing it: Tier 2 checks that a description carries the vocabulary users say; this checks that Claude Code's own router picks the skill on a natural prompt, and what the skill adds to the reply (the `Δ` column).

```bash
claude plugin eval . --no-publish                                          # every case, both arms, 3 runs each
claude plugin eval . --case code-review-fires --runs 1 --ablation none     # one cheap iteration on one case
```

A case is a directory holding `prompt.md` (frontmatter: turn and tool limits; body: the prompt, sent verbatim) and one grader per file under `graders/`. Reports land in `evals/plugin/results/<timestamp>/`, already gitignored. Every run and every `llm` grader is a real model call on your account, so this runs on demand and never in CI, like Tier 3.

Two rules keep it honest. The manifest's `experimental.evals` key scopes the scan to `evals/plugin/`, so a fixture elsewhere under `evals/` is never read as a case. And a `tool_used: Skill` grader only says whether the skill fired; in a two-arm run it is excluded from the score, so pair it with a grader on the reply itself. `code-review-fires` shows the pattern: the fired indicator, a free `regex` grader that looks for the skill's severity taxonomy (Critical, Required, Nit, Optional, Consider, FYI) used as a heading or as a label, and one `llm` judge on the planted off-by-one. `code-review-stays-quiet` is the precision check: the review skill must not fire on a test-first request, and its `Δ` is expected to be 0; a second, unscored indicator records whether test-driven-development fires instead.

What the first runs taught (Claude Code 2.1.278, claude-opus-5). Skill invocation is stochastic: the review skill fired in 5 of 7 runs on the phrasing the case uses, and test-driven-development fired in 2 of 7 runs on the test-first prompt, so read `Δ` and the report rather than the exit code, or pass `--threshold 0.8` as the CI example in the docs does. In one run the review skill did not fire and the reply still used its severity taxonomy as headings, which no baseline run did in nine; the loaded skill descriptions may shape the reply even without an invocation. Phrasing matters, and the description is the lever. With the original description, "Review this diff before I merge it", "Can you do a proper code review of this change before I merge it?" and "Review this pull request for me before it goes into main" rarely fired the skill; the model reviewed the diff on its own, competently but without the verdict, the severity tiers or the five-axis pass. Describing what the skill adds did not help, and neither did naming diffs and pull requests on their own; what made the difference was saying that the skill applies even when the diff is pasted inline, which is the case the model was treating as "I can just do this myself". On claude-opus-5-5 with the model pinned, that one clause took the four review phrasings from 7 of 27 fires to 21 of 27, left the nine adjacent must-not-fire prompts at 0 of 27 both ways, and moved the plainest phrasing from 0 of 9 to 3 of 9, so it is better, not solved. `code-review-stays-quiet-on-commit-message` guards that clause: a pasted diff with a commit-message request must not fire the review skill. Two practical rules from the same day: pin `--model` and record the Claude Code version whenever you report numbers, because the CLI updates itself and the default model changed twice between morning and evening; and give a case a turn budget of 10 or more, since the model may reach a skill through its slash command (`agent-skills:review`, then `code-review-and-quality`), which costs two turns.

The same lever, applied to test-driven-development (claude-opus-5-5 pinned, six runs per prompt). With the original description, "Add unit tests for this function", "Fix this bug ... here is the function" and "Change this function so that size can never exceed 100" fired the skill 0 of 6 each, while the process-shaped "Write a failing test for this bug before we fix it" fired 6 of 6: the model wrote the tests or the fix directly. Here the tail alone was not enough; what worked was naming the three requests and saying the skill applies even when the code is pasted inline and the request does not mention tests. That clause took the four prompts from 6 of 24 to 19 of 24 (add tests 6 of 6, fix a bug 6 of 6, change behavior 1 of 6), and left eight adjacent must-not-fire prompts at 0 of 24 under every variant tried. The one-line behavior change is the floor: the trace shows a single-turn edit with no tool call, the model does not consider a procedure for it. `tdd-fires-on-pasted-bug` and `tdd-stays-quiet-on-debug` are the pair for that clause: the first checks the skill fires on a pasted bug and that the reply reproduces it with a failing test before the fix, the second checks that a "what broke" question with a diff does not pull the TDD skill in. On the first, the skill fired in every run, but the reply put the failing test before the fix in 2 of 4 runs with the plugin and 0 of 3 without: the judge is strict on purpose, since that order is what the skill adds, and the misses (fix first, then a test with a note that it would have failed on the old code) are an adherence gap of the skill in a session with no shell to run anything, not a routing one.

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
      "prompt": "Finance filed the reconciliation bug written up in BUG.md. Fix it.",
      "expected_output": "A failing reproduction test for the lost-cent case, a fix preserving both README invariants (exact sum, earliest-shares fairness), the fairness invariant covered by its own test, full suite passing",
      "files": [
        "test-driven-development"
      ],
      "expectations": [
        "A test reproducing the lost-cent case from BUG.md is added and shown failing before src/split.js is modified",
        "The final implementation satisfies the full README fairness invariant (leftover cents go to the earliest shares): splitCents(10000, 3) returns [3334, 3333, 3333] as BUG.md expects and splitCents(100, 7) returns [15, 15, 14, 14, 14, 14, 14] as the README example shows; dumping the whole remainder on a single share would violate both",
        "The fairness invariant from the README has its own test case in the suite on an input with remainder of at least 2 (such as splitCents(100, 7)), where dumping the whole remainder on one share would fail it, beyond the reported lost-cent case",
        "The full suite is run with the repository's own command after the fix"
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

The Tier-2 run prints a **trigger rank-1 rate** (share of positive prompts that rank their skill first, not merely top-k). CI runs with `--min-rank1 95`, leaving useful headroom below the checked-in 100% baseline so an unrelated description edit does not immediately turn CI red. Raise the floor as routing improves; never lower it to make a regression pass. Falling numbers mean descriptions are drifting toward each other. The collision check errors at ≥75% pairwise description similarity and warns at ≥50%. When these evals surface a description-vocabulary gap (see [#351](https://github.com/addyosmani/agent-skills/issues/351) for the original examples), fix the description, not the prompt.
