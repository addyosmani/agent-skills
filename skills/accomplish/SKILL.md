---
name: accomplish
description: Turns a vague objective into a verifiable goal, then orchestrates the cheapest way to reach it under guardrails — a direct action, a guarded work loop, periodic checks via /loop, or a delegation chain across the lifecycle skills. Interviews one question at a time to pin the outcome, verification, boundaries, and stop conditions, then gets sign-off. Trigger when the user hands you an outcome with no clear finish line or known path — "accomplish X", "get X working/stable", "improve/speed up/clean up Y", "drive this to done", "just make it happen", "get us ready for…" — or monitoring asks ("keep an eye on the deploy", "babysit this job"). Best for multi-step, uncertain, or long-running work. Do NOT trigger for single-step or single-skill asks with an obvious finish line — a specific edit, explaining or teaching existing code (including "accomplish a deeper understanding of…"), fixing one named error, a one-shot deploy or cron setup, or asks better served by a dedicated spec, plan, review, or interview skill.
---

# Accomplish

## Overview

Most requests arrive as outcomes, not plans: "get the flaky tests under control," "make the onboarding faster," "keep an eye on the deploy." The gap between that and useful autonomous work is a well-formed goal — one with a finish line you can *check*, not just feel.

`accomplish` is the orchestrator that closes that gap and then routes the work. It does four things in order: **upgrade** the ask into a verifiable goal, **validate** that goal with the user, **choose** the cheapest execution mode that fits, and **execute** under guardrails that prevent a long-running loop from burning time or money with nothing to show.

It is deliberately not a doer of one thing. It is the layer that decides *which* doer to invoke — a single edit, an autonomous work loop, a periodic `/loop`, or a delegation chain through the lifecycle skills (`spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, and the rest). Its value is in the decision and the guardrails, not in re-implementing capabilities that already exist.

## When to Use

Apply this skill when:

- The user states an **outcome without a finish line** — "improve X", "automate Y", "get Z working", "just make it happen"
- The user explicitly invokes: "accomplish…", "help me achieve…", "I want to get … done", "I need you to handle…"
- The path to completion is **uncertain** (you can't list the steps up front) but there *is* an observable success condition once you think about it
- The work is likely to run **long enough that runaway risk is real** — many iterations, real cost, or irreversible actions in the middle
- The user wants **ongoing/periodic** action ("check the build every 10 minutes", "give me a daily digest")

**When NOT to use:**

- The ask is unambiguous and one-shot ("rename this variable", "what does this function do?", "fix this typo") — just do it
- A more specific skill already owns the whole job and the finish line is clear (a pure spec → use `spec-driven-development` directly; a known bug → `debugging-and-error-recovery`)
- Pure information requests — answer them
- You're inside a non-interactive context (CI, a scheduled run, an autonomous loop) — the upgrade interview needs a live user; if the ask is underspecified there, flag it as a blocker instead of guessing

The test: **if you already know exactly what "done" looks like and how you'd prove it, you probably don't need this skill — act.** If you'd be inventing the finish line as you go, run this first.

## The Process

### Step 1 — Capture the raw objective

Ask, in the user's terms: **"What would you like to accomplish?"** (skip this if they already told you).

Record the raw intent verbatim. Do not start any automation, edits, or research yet. This is the input to the upgrade, not the work itself.

### Step 2 — Upgrade the goal (inline interview)

This is the heart of the skill. A raw objective becomes a *goal* when it has six fields filled in. Interview the user to extract them — **one question at a time, each with your best guess attached**, so they can react to a concrete proposal instead of generating an answer from scratch:

| Field | What it pins down | Example |
|---|---|---|
| **Outcome** | The final state that counts as done | "All tests in `auth/` pass in CI, no skips added" |
| **Verification surface** | The evidence that *proves* it — not belief | "`pytest auth/` exits 0; CI run green" |
| **Constraints** | What must stay intact | "Public API unchanged; existing green tests stay green" |
| **Boundaries** | Files / services / data the work may touch | "Only `src/auth/**` and its tests" |
| **Iteration policy** | How the next action is chosen each loop | "Run the suite, fix the first failure, re-run" |
| **Stop conditions** | When to halt and report instead of pushing on | "Blocked on a missing secret, or 15 iterations with no net new passing test" |

Rules for the interview, and the reasons they matter:

- **One question at a time.** A batch invites skim-reading; the user can't react to a buried hypothesis, and the third question often depends on the answer to the first.
- **Attach a guess to every question.** Reacting to a wrong guess is faster than answering a blank, and it forces *your* assumptions into the open where they can be corrected cheaply.
- **The verification surface is non-negotiable.** A goal you can't check is a wish. If the user can't name evidence, that's the most important thing to resolve before any execution — keep probing until there's something observable (a command's exit code, a diff, a benchmark number, a passing scenario).
- **Stop interviewing when you can predict the user's answers.** If you can already guess their reaction to your next three questions, you have shared understanding — move on. If you've gone several rounds and still can't, something foundational is missing; say so rather than grinding.

**Keep each turn tight.** The user reads a question, reacts to a guess, and moves on — they are not reading an essay. Each interview turn is: the question, your single best guess, and (for loop/periodic modes) the concrete defaults you propose. That's it. Specifically:

- **Lean on defaults instead of open questions.** A good guess is a concrete proposal the user can accept with one word: "~10 iterations or ~30 min, whichever first" beats "how many iterations should I cap at?". Bake the numbers into the guess so the easy answer is "yes."
- **Offer your bet, not a menu.** State your single most-likely interpretation plus *at most* one or two high-probability alternatives. An exhaustive list of every observability backend or every flavor of "better" buries the guess and makes the user do triage. Ask directly for the load-bearing value (the metric and threshold, the main pain point) and let your guess carry the rest.
- **Don't narrate your reasoning.** The user cares about the question and the proposed guardrails, not *why* you picked a mode. Name the mode in one clause ("I'd run this as a guarded goal loop") and move on; skip the paragraph defending the choice.
- **Show the target early.** Once you have the outcome, sketch a compact goal-block skeleton (the six-field shape from Step 3, with `<…>` placeholders for what's still open). Seeing what you're building toward lets the user correct the frame in one pass and saves you re-explaining it later. Still name the execution mode in an explicit clause when you show the skeleton — the `Iteration:` line hints at it, but the user should see the mode stated plainly ("I'd run this as a guarded goal loop"), not have to infer it.

If the initial ask is badly underspecified (missing *who/why*, not just the six fields), and `interview-me` is installed, hand the front of this step to it — it specializes in extracting intent before a goal even takes shape. Otherwise run the interview inline as above.

### Step 3 — Validate the upgraded goal

Write the six fields back to the user as a compact block and ask for an explicit yes:

```
Here's the goal I'd execute against:

- Outcome:        <one line>
- Verification:   <the evidence that proves it>
- Constraints:    <what must stay intact>
- Boundaries:     <what I may touch>
- Iteration:      <how I choose each next step>
- Stop when:      <halt-and-report conditions>

Execution mode: <mode + one-line reason>
Guardrails:     <iteration cap · budget · checkpoints>

Accurate? Anything to add or change?
```

Fold in corrections and restate until the user gives a real yes. "Whatever you think", "sounds good", and silence are **not** yes — they signal the user isn't at confidence either. Re-ask with concrete options framed as a choice. Do not execute against an unconfirmed goal; everything downstream inherits its errors.

### Step 4 — Choose the execution mode

Pick the **cheapest mode that can actually reach the verified outcome**. Overshooting (a full lifecycle chain for a one-line fix) wastes the user's time and tokens; undershooting (a blind loop on work that needed a spec) produces confident garbage.

| If the work is… | Mode | What you do |
|---|---|---|
| A single, well-understood action | **Direct** | Make the change, show the verification evidence, done. No loop. |
| Multi-step with an uncertain path but a checkable outcome | **Goal loop** | Iterate autonomously under guardrails (Step 5) until the verification surface passes or a stop condition fires. |
| Recurring or time-based ("every N minutes", "daily") | **Periodic** | Use `/loop <interval> <command>` for the cadence; keep the main goal moving in parallel if there is one. |
| A substantial engineering effort (new feature, significant change) | **Delegation chain** | Orchestrate the lifecycle skills in sequence, conditionally (below). |

These compose. A feature might run a delegation chain for the build *and* a `/loop` to watch CI. Name the mode and the reason in the Step 3 block so the user approves the strategy, not just the goal.

**Goal mode is a behavior, not a command here.** There is no installed `/goal`; "goal loop" means *you* run the iterate-verify-check loop under the guardrails below. If a `/goal` command exists in the user's environment, prefer it and pass the upgraded goal as its argument.

#### Delegation chain (conditional on installed skills)

For real engineering work, don't re-derive process this skill's siblings already encode. When these skills are present, route to them; when they aren't, fall back to doing the step inline:

- Vague intent, missing *who/why* → `interview-me`
- Rough concept needing options → `idea-refine`
- Needs requirements before code → `spec-driven-development` (or `/spec`)
- Has a spec, needs tasks → `planning-and-task-breakdown` (or `/plan`)
- Implementing → `incremental-implementation` + `test-driven-development` (or `/build`, `/test`)
- Before merge → `code-review-and-quality`, `code-simplification` (or `/review`, `/code-simplify`)
- Deploying → `shipping-and-launch` (or `/ship`)

Check availability before naming a skill in your plan; never promise a handoff to something that isn't installed. The fallback is always "do the step inline with built-in tools," so the chain degrades gracefully.

### Step 5 — Set guardrails

Before starting any loop or long-running mode, set explicit limits. Their entire purpose is to make "this is going nowhere" a *detectable, automatic* event instead of something the user discovers after it has burned an hour. Propose concrete defaults **inside your guess** so the user can accept them in one word — don't leave them implied:

- **Iteration cap** — a hard ceiling on loop turns (default **~10**). Reaching it halts and reports; it does not silently continue.
- **Budget** — a time or token ceiling for the run (default **~30 min**). Same halt-and-report behavior.
- **No-progress detection** — if an iteration produces no *material* change toward the verification surface (same failures, same diff, no new evidence), count it; two or three in a row is a stop condition. This is what actually catches spinning.
- **Termination criteria** — the goal's own stop conditions from Step 2.
- **Human checkpoints** — pause and ask before anything **irreversible or outward-facing**: writing to a production datastore, deploying, merging a PR, sending external communication, deleting data. Approval for one such action does not extend to the next.

State the guardrails in the Step 3 block so they're part of what the user approves. If the user wants different limits, use theirs.

### Step 6 — Execute and monitor

Run the chosen mode. After each iteration (or each loop interval), report **progress with evidence**, not vibes: the test output, the diff summary, the benchmark delta, the count toward the cap. "It's working" is not a status; "3 of 5 auth tests now pass, 2 iterations used" is.

If you hit a stop condition or a checkpoint, **stop and summarize**: what you tried, what the evidence shows, why you halted, and the specific input or decision you need from the user to continue. A clean halt with a clear ask beats a loop that keeps going to look busy.

### Step 7 — Complete and summarize

When the verification surface passes (or the user calls it), deliver:

- **The result** — the concrete deliverables (diff, files, artifacts, benchmark output)
- **The proof** — the verification evidence that the outcome was actually met
- **The accounting** — iterations used, rough budget consumed, anything notable that happened
- **Next steps** — follow-ups or residual risks worth flagging, if any

Do not declare success on belief. If verification didn't actually pass, say so plainly and report where it stands.

## Output

The artifacts of this skill are: a **confirmed goal** (the six-field block with an explicit yes), a **named execution mode with guardrails**, and a **final summary backed by verification evidence**. The work product itself (code, config, docs) comes from whatever mode or downstream skill did the doing — `accomplish` owns the framing, routing, and accounting around it.

If the goal will span multiple sessions, offer to persist the confirmed goal block to `docs/goals/<topic>.md` so it survives a context reset. Only save if the user confirms.

## Interaction with Other Skills

- **`interview-me`**: upstream of the upgrade. Use it when the ask is missing *who/why*, not just the six goal fields. Its output (confirmed intent) feeds Step 2.
- **`spec-driven-development` / `planning-and-task-breakdown`**: downstream, inside the delegation chain. A confirmed goal that needs design hands off to the spec; a spec hands off to task breakdown.
- **`incremental-implementation` / `test-driven-development`**: the doers inside goal-loop and delegation modes. The goal's verification surface *is* the thing TDD drives toward.
- **`/loop`**: the mechanism for periodic mode. `accomplish` decides the cadence and command; `/loop` runs it.
- **`code-review-and-quality` / `shipping-and-launch`**: the tail of a delegation chain when the outcome includes "merged" or "deployed" — both of which are human-checkpoint actions per Step 5.

`accomplish` orchestrates; it does not duplicate. If a sibling skill owns a step, route to it.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The objective is clear, I'll just start." | If you can't state the verification surface in one line right now, it isn't clear. Run Step 2 first — that's 90 seconds against hours of wrong-direction work. |
| "I'll figure out what 'done' means as I go." | A finish line discovered mid-loop is a finish line you'll move to match whatever you built. Pin it before executing. |
| "Guardrails are overkill for this." | Guardrails cost one sentence to set. A loop with no no-progress detection is the exact thing that burns an hour producing nothing. |
| "The user said 'just handle it,' so I'll skip the validation." | "Just handle it" is delegation of the *work*, not permission to skip pinning the goal. A 30-second restate prevents handing back the wrong outcome. |
| "I'll route through the full lifecycle to be safe." | Overshooting wastes time and tokens. Match the mode to the work — a one-line fix doesn't need a spec. |
| "It's basically working, I'll call it done." | "Basically" means verification didn't pass. Show the evidence or report it as incomplete. |
| "More options and rationale make my question more helpful." | They make it harder to answer. A buried guess and an exhaustive menu push triage work back onto the user. One bet plus a default they can accept in a word is faster and just as rigorous. |
| "I should explain why this mode fits." | The user wants the question and the guardrails, not your reasoning. Name the mode in a clause and move on; the justification is for you, not them. |
| "I'll merge/deploy since the goal said so." | Irreversible and outward-facing actions are checkpoints regardless of the goal text. Pause and confirm. |

## Red Flags

- Starting edits, research, or a loop before the goal's verification surface is named
- A goal block with no observable evidence in the Verification line ("it should work better")
- Executing against "sounds good" or silence instead of an explicit yes
- Launching a goal loop with no iteration cap, no budget, and no no-progress check
- An interview turn that runs long on rationale, or lists every possible option instead of one bet plus at most one or two alternatives
- Proposing a guardrail or threshold as an open question ("how many iterations?") instead of a concrete default the user can accept in a word
- Reporting progress as "making good progress" with no test output, diff, or number attached
- Routing a one-line change through a multi-skill chain, or running a blind loop on work that needed a spec
- Naming a downstream skill in your plan without checking it's installed
- Crossing an irreversible/outward-facing action (deploy, merge, prod write, external send) without a checkpoint
- Declaring completion when the verification surface never actually passed

## Verification

After applying `accomplish`:

- [ ] The raw objective was captured before any automation began
- [ ] All six goal fields were filled, with the verification surface stated as observable evidence (not belief)
- [ ] The upgrade interview asked one question at a time, each with a guess attached
- [ ] Each interview turn stayed tight — one bet (not an exhaustive menu), concrete defaults folded into the guess, no meta-rationale dumped on the user
- [ ] The goal block was restated to the user and confirmed with an explicit yes
- [ ] An execution mode was chosen and justified as the cheapest fit for the work
- [ ] Any downstream skill named in the plan was confirmed installed before being relied on
- [ ] Guardrails (iteration cap, budget, no-progress detection, stop conditions, human checkpoints) were set and approved before execution
- [ ] Progress was reported with evidence at each iteration/interval
- [ ] Irreversible or outward-facing actions paused at a human checkpoint
- [ ] Completion was declared only after the verification surface actually passed, with the evidence shown
