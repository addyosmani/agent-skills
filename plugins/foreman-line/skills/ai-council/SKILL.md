---
name: ai-council
description: Convene an independent multi-model council (Grok, Codex, Claude, Gemini CLIs) to audit, review, or judge something, then synthesize their verdicts into an actionable directive. Use whenever a task is judgment-heavy and benefits from independent perspectives — site/UX audits, code or architecture reviews, naming and copy decisions, strategy critiques, "is this good?" questions, red-teaming a plan, or any request mentioning "council", "ruthless analysis", "get multiple opinions", "what would other models say", or "audit this". Also use when a single-model answer risks blind spots the user will pay for. Do NOT use for mechanical tasks with one correct answer (renames, refactors, data transforms) — a council on those is waste.
---

# AI Council — Independent Multi-Model Critique Protocol

Convene several frontier-model CLIs as independent auditors, then synthesize. The power of this
protocol comes from one property: **independence**. Each seat forms its verdict without seeing
the others' work. When N independent minds converge on the same finding, that finding is no
longer opinion — it is settled fact you can execute against without debate. When one seat finds
something the others missed, that unique find is often the most valuable output of the whole
run (a fresh pair of eyes with a different lens), but it must be verified before it is treated
as fact.

You are the orchestrator and synthesizer. You also hold a seat: do your own analysis of the
subject BEFORE reading any council output, so your verdict is one more independent data point
rather than an echo.

## The protocol

### 1. Gather evidence, then write the shared brief

Do the legwork first — render the page, read the code, run the tests, collect the numbers.
The council critiques evidence; it does not gather it.

Write one brief file (e.g. `.audit/<topic>-brief.md` inside the project) that every seat reads.
The brief contains ONLY:

- **Context**: what the subject is, who it serves, any non-negotiable constraints/doctrine.
- **Inventory**: objective description of the subject (structure, content, behavior — verbatim
  where possible).
- **Verified observations**: facts you established with tools (measurements, error output,
  rendering behavior at specific widths, timings). Facts, not interpretations.
- **The task**: the exact questions to answer.
- **The output contract**: the exact format every seat must return. A strict shared format is
  what makes synthesis mechanical instead of interpretive. Default contract:

```
Deliver EXACTLY: "TOP 5 BRUTAL FINDINGS" (numbered, one line each) then "TOP 5 MOVES"
(numbered, one line each, implementation-ready). Max 350 words total. Plain text only.
```

Never put conclusions, hypotheses, or your own ranking of severity in the brief. Anything you
editorialize contaminates every seat and destroys the independence that makes convergence
meaningful. If you catch yourself writing "this seems broken" — stop, rewrite as the raw
observation ("at 1440px the nav renders as X").

### 2. Assign one distinct lens per seat

Identical prompts produce redundancy; distinct lenses produce coverage. Diversity catches
failure modes that redundancy cannot. Give each seat a role one sentence long, plus "judge X
hardest". Default roster (adapt the lenses to the domain, keep the spread):

| Seat   | Lens                                                                  |
|--------|-----------------------------------------------------------------------|
| Grok   | Visceral first impression, brand daring, the 7-second judgment        |
| Codex  | Mechanics: conversion/correctness, information architecture, journeys |
| Claude | Narrative arc, credibility, internal consistency, audience routing    |
| Gemini | Craft: typographic/visual/code discipline, competitive differentiation |

Domain adaptations (examples, not limits):
- **Code review**: correctness+edge cases / security / performance / API ergonomics+readability
- **Architecture**: failure modes / operational cost / evolution+migration / simplicity
- **Copy/messaging**: skeptic-trust / clarity-to-a-novice / differentiation / conversion
- **Plan red-team**: what breaks first / hidden dependencies / cheaper path exists / stakeholder blowback

The consistency lens (Claude's default) deserves special mention: "does this thing contradict
itself?" is the lens that tends to catch the P0s everyone else walks past.

### 3. Launch all seats in parallel, headless

Run every seat concurrently from the directory containing the brief. Each prompt is:
role sentence + "Read <brief file> in the current directory and complete the task in its
'Your task' section" + "judge <lens> hardest" + output instruction.

Read `references/seats.md` for the exact working invocations, timings, and per-CLI quirks on
this machine (output capture, tool-permission flags, auth notes). If it does not exist yet
(fresh install — `seats.md` is machine-local and git-ignored), copy
`references/seats.template.md` to `references/seats.md` and refine it as you run. If
`seats.md` disagrees with what you observe, trust your observation and update the file — it
is maintained state, not gospel.

Seat discipline:
- Capture output to files (`<seat>-out.txt`) — stdout redirect or the CLI's write tool,
  whichever `seats.md` says is reliable for that CLI.
- **You must outlive the seats.** The council has no value until synthesis, and only you can
  synthesize — so never background a seat and end your turn "waiting". If your environment
  gives you reliable job control, launch concurrently and block until every output file
  exists. If it does not (common in one-shot/headless runs), run the seats as plain blocking
  calls, fastest seat last — wall time is dominated by the slowest seat either way, and a
  finished council beats an elegant one that never reports.
- A seat that fails after 2 attempts is NOTED and dropped, never blocked on. Quorum is 2
  seats + you. Report absent seats in the final output so the user knows coverage.
- While seats run (or before launching them, if running sequentially), produce your own
  verdict in the same contract format. Write it down before opening any seat's output.
- Do not finish until the deliverable of step 5 exists on disk. An orchestrator that exits
  after launching seats has done the cheap half of the job.

### 4. Synthesize by convergence

Read all verdicts, then sort every finding into three buckets:

- **Convergent (2+ seats independently)**: settled fact. State it with the count ("all four
  seats", "3 of 4"). These headline the output and need no further debate.
- **Unique-but-verified**: one seat found it, you confirmed it against the evidence (re-read
  the source, re-render, re-run). Credit the seat by name — provenance builds trust in the
  process. These are often the highest-value findings.
- **Unique-unverified**: one seat claims it, you could not confirm. Either verify now or list
  it explicitly as unverified. Never silently promote it to fact.

Also harvest the moves: when multiple seats propose the same fix, adopt it; when one seat's
fix is sharper than the convergent version, graft it in with credit.

### 5. Deliver a directive, not a report

The output is a document someone can execute without asking questions. Structure:

```
# DIRECTIVE — <subject> (<N>-seat council)
**Evidence:** <brief + seat output file paths>
## Verdict           — 1-2 sentences, the headline judgment
## Convergent Findings — F1..Fn, severity-tagged (P0 first), seat-count noted
## Execution Plan    — phased; mechanical fixes FIRST (no debate needed), creative work later;
                       every task has target, exact change, acceptance criteria
## Rules of Engagement — constraints, one-owner-per-task, evidence required per merge
```

If the directive will be handed to another agent, prepend a kickoff header: repo/subject
location, execution order, definition of done, and the delegation commands available. A naked
directive makes the receiving agent rediscover context you already have.

Keep the brief, all seat outputs, and the directive together in one directory (e.g. `.audit/`).
They are the receipts — the run's claims should be as inspectable as its subject's.

## Scaling the council

- **Quick check** (a name, a paragraph, a small diff): 2 seats + you, output contract "TOP 3 /
  TOP 3", skip the kickoff header.
- **Standard** (page audit, PR review, design doc): 3-4 seats, default contract.
- **High stakes** (architecture bet, launch go/no-go): full roster + a second adversarial
  round — feed the draft directive back to the seats with "refute this; what did the council
  miss?" before finalizing.

## Failure modes to avoid

- Seats given the orchestrator's opinions → convergence becomes echo, worthless.
- Waiting on a hung seat → the council's value decays with latency; drop and note it.
- Treating a unique unverified claim as consensus → one hallucination poisons the directive.
- Vague output contract → synthesis turns into interpretation; enforce the format.
- Using the council for mechanical work → four models agreeing x==1 is not insight.
