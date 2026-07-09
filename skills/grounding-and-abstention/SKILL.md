---
name: grounding-and-abstention
description: Designs LLM and RAG features that ground every claim in retrieved evidence and abstain — say "I don't know", refuse, or escalate to a human — instead of hallucinating a confident wrong answer. Use when building any feature where an LLM answers from documents, data, or tools (RAG, support assistants, search, agents); when the cost of a confident wrong answer is high (regulated or user-facing domains); or when answers must be traceable to a source. Use when the system needs to know what it does not know.
---

# Grounding and Abstention

## Overview

The most common — and most damaging — production LLM failure is a **confident wrong answer**. The model is equally fluent when it is right and when it is fabricating, so a plausible-sounding hallucination ships straight past a casual reviewer and into a user's hands.

This skill is the **design discipline** for the opposite behavior: every claim is grounded in retrieved evidence, and when the feature cannot answer reliably it **abstains** — says "I don't have that," refuses, asks a clarifying question, or escalates to a human — rather than guessing. A feature that grounds and abstains is trusted; one that confabulates fluently is a liability.

This is a build-time skill. *Measuring* output quality and catching regressions is the `evaluating-llm-output` skill's job; *designing the grounding and abstention behavior it measures* is this skill's.

## When to Use

- Building any feature where an LLM answers from documents, a knowledge base, tools, or retrieved data (RAG, support assistants, internal search, doc Q&A, agents that report findings)
- The cost of a confident wrong answer is high — regulated domains (legal, medical, financial), or anything user-facing where trust matters
- Answers must be **traceable** to a source the user or an SME can check
- Users can ask things that are out of scope or not in the knowledge base

**When NOT to use:**

- Pure-creative or ideation output where there is no ground truth (fiction, brainstorming, naming)
- Deterministic code paths — use [`test-driven-development`](../test-driven-development/SKILL.md)
- Throwaway prototypes with no real users and no cost to being wrong

## The Process

```
BOUND ──→ GROUND ──→ ABSTAIN ──→ ESCALATE ──→ TEST THE GAPS ──→ TUNE
  │         │           │            │              │             │
  ▼         ▼           ▼            ▼              ▼             ▼
what can  answer only  make "I     route low-    eval on the   pick the
it answer from cited   don't know" confidence &  UNANSWERABLE  refuse↔halluc
vs must   evidence,    a designed  high-stakes   inputs, not   operating
abstain?  or refuse    output      to a human    just the hits point
```

### Step 1: Bound the question space

Before the first prompt, write down what the feature **can** answer and what **must** trigger abstention or escalation:

```
IN SCOPE (answer from sources):   product/policy questions covered by the KB
MUST ABSTAIN (no confident answer): topics not in the KB, missing/weak evidence
MUST ESCALATE (needs a human):    personalized/high-stakes decisions,
                                   anything requiring a licensed professional
```

These boundaries are not documentation — they become your eval cases (Step 5). If you cannot name what the feature must refuse, you have not designed it yet.

### Step 2: Ground every claim

Retrieve first, then generate **only from what was retrieved**. Each non-trivial claim cites the source it came from (chunk id, doc + section, or URL).

```
System prompt (the load-bearing instruction):
"Answer ONLY using the provided sources. Cite the source for each claim.
 If the sources do not contain the answer, say you don't have that
 information — do NOT answer from general knowledge."
```

**Relevance gates the answer, not presence.** Retrieval always returns *something*; ranking by cosine similarity will hand back the "least irrelevant" chunk for a question the corpus never covered. Set a **relevance floor** — below it, there is effectively no evidence, so abstain instead of answering from parametric memory. That memory path is exactly where hallucinations come from.

### Step 3: Make abstention a first-class output

Refusal is a **designed response**, not an error or an afterthought bolted on later. Structure the output so "I can't answer this" is a normal, typed result the application renders gracefully:

```json
{ "answer": null, "reason": "no_supporting_evidence",
  "message": "I don't have that in my sources.", "sources": [] }
```

A system built to *always* produce an answer cannot be retrofitted to abstain without a rewrite of its prompts and output contract. Design the abstain path from day one.

### Step 4: Confidence and escalation

Set thresholds (retrieval score, self-consistency across samples, or a judge's confidence). Below the threshold, don't just abstain silently — **escalate**: hand off to a human, open a review ticket, or ask a clarifying question.

Some categories **always escalate** regardless of confidence. In a mortgage assistant, *"Am I approved?"* or *"What rate can I get?"* route to a licensed loan officer every time — the model must never answer them even if it "sounds sure." Encode these as hard rules, not soft preferences.

When escalating, hand the human a **review package**, not just the raw question: the question + the retrieved evidence + the draft answer + why it was flagged. That is what makes a human-in-the-loop gate fast instead of a bottleneck.

### Step 5: Test the gaps, not just the hits

The most-skipped, highest-value step. Evaluate with **unanswerable and out-of-scope inputs**, not only questions the KB covers. An eval set of only answerable questions gives a model that *never abstains* a perfect score — while it hallucinates on every real out-of-scope query. Measure three numbers, not one:

| Metric | What it catches | Where it lives |
|---|---|---|
| **Abstention accuracy** | Does it refuse when it should? | unanswerable + out-of-scope cases |
| **Hallucination rate** | Does it invent answers to unanswerables? | must-abstain cases that got a confident answer |
| **Over-refusal rate** | Does it refuse things it *could* have answered? | answerable cases that got refused |

Build the harness with the `evaluating-llm-output` skill; this skill defines *which cases must exist* (the unanswerables) and *which behaviors count as pass/fail*.

### Step 6: Tune the tradeoff

Over-refusal (useless) and hallucination (dangerous) are two ends of one dial — you cannot maximize helpfulness and safety independently; pushing one down pushes the other up.

```
  more abstention                          more answering
  ◄─────────────────────────┼─────────────────────────►
  over-refusal              │              hallucination
  (safe but unhelpful)   operating point   (helpful but unsafe)
                         chosen by stakes
```

Pick the operating point deliberately for the domain: high-stakes (legal/medical/financial) → bias toward abstain; low-stakes internal search → bias toward answer. Track **both** rates over time; never tune one blind to the other.

## Grounding Techniques

| Technique | What it does | Use when |
|---|---|---|
| Retrieve-then-generate | Answer is built from retrieved chunks, not memory | Any RAG / doc-Q&A feature |
| Cite-per-claim | Each claim carries its source (id/anchor/URL) | Answers must be verifiable by a user or SME |
| Relevance floor | Below a similarity/rerank threshold → treat as no evidence | Corpus doesn't cover everything users ask |
| Constrain to context | System prompt forbids answering beyond the sources | Preventing parametric-memory leakage |
| Structured output + sources array | `{answer, sources[], reason}` typed contract | The app must render/verify sources and refusals |
| Quote-and-attribute | Quote the supporting passage when a claim is non-obvious | High-stakes or disputed claims |

## Abstention Triggers → Responses

| Trigger | Right response |
|---|---|
| No / low-relevance retrieval | Refuse + say it's not in your sources |
| Conflicting sources | Surface the conflict; don't silently pick one |
| Out-of-scope topic | Refuse + point to where the answer lives |
| Needs real-time/data you don't have | Say so; offer the freshest thing you *do* have |
| Requires a licensed/authorized human | Escalate — always, regardless of confidence |
| Asks for a guarantee/decision you can't make | Explain the limit; route to a human |
| Ambiguous question | Ask one clarifying question before answering |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "A plausible answer is more helpful than 'I don't know'" | In any domain with real stakes, a confident wrong answer is worse than an honest gap — it breaks trust and can cause harm. When you don't know, abstention *is* the helpful answer. |
| "The model sounds confident, so it's probably right" | Fluency is not accuracy. An LLM is equally fluent when correct and when fabricating. Ground the claim in a source or flag it — tone is not evidence. |
| "Refusing makes the product look dumb" | Refusing *wrong* answers makes it trustworthy. Users forgive "I don't have that"; they do not forgive being confidently misled. |
| "We'll add grounding and abstention later" | Retrofitting refusal onto a system designed to always answer is a rewrite of its prompts and output contract. Design the abstain path from the first prompt. |
| "Our eval pass rate is high" | If the eval set only contains answerable questions, a model that never abstains scores 100% and still hallucinates on every out-of-scope real query. Test the gaps. |
| "Retrieval returned chunks, so answer from them" | Retrieval always returns something. Relevance, not presence, gates the answer — below the floor there is no evidence, so abstain. |
| "Adding a source citation is extra work" | The citation is the proof. Without it, neither the user nor an SME can tell a grounded answer from a fluent guess. |

## Red Flags

- The feature never says "I don't know" anywhere in testing
- Answers carry no citations, or a claim can't be traced to a source
- The eval set contains only answerable questions — no unanswerables or out-of-scope inputs
- Abstention is implemented as an error/exception instead of a designed response
- The model answers from general knowledge when retrieval was empty or weak
- Every query gets an answer — there is no confidence threshold
- High-stakes decisions are answered directly instead of escalated to a human
- Only accuracy-on-answerable is measured; over-refusal and hallucination-on-unanswerable are not

## Interaction with Other Skills

- **the `evaluating-llm-output` skill**: complementary. That skill *measures* output quality and guards against regressions; this one *designs* the grounding and abstention behavior it measures. Build with this, verify with that.
- **[`source-driven-development`](../source-driven-development/SKILL.md)**: SDD grounds *your framework code* in official documentation. This grounds *the product's LLM answers* in retrieved data. Same principle — cite, don't guess — applied at runtime to what the feature says, not to how you write it.
- **[`doubt-driven-development`](../doubt-driven-development/SKILL.md)**: doubt-driven verifies *your reasoning* about an artifact before it stands. This makes the shipped feature apply the same "don't assert what you can't support" discipline to its own outputs at runtime.
- **[`context-engineering`](../context-engineering/SKILL.md)**: context-engineering feeds the right information in; this skill decides what to do when that information is insufficient — abstain rather than fill the gap with invention.

## Verification

After designing a feature with this skill:

- [ ] In-scope, must-abstain, and must-escalate boundaries are written down
- [ ] Answers are built only from retrieved evidence, and each non-trivial claim cites a source
- [ ] Retrieval below a relevance floor triggers abstention, not a parametric-memory answer
- [ ] Abstention is a first-class, gracefully-rendered response — not an error
- [ ] A confidence threshold routes low-confidence and high-stakes cases to a human, with a review package
- [ ] The eval set includes unanswerable and out-of-scope inputs, and you measure abstention accuracy, over-refusal rate, and hallucination-on-unanswerable
- [ ] The over-refusal ↔ hallucination operating point was chosen deliberately for the domain's stakes
