---
name: context-isolation
description: "Always read first, before starting any multi-step, multi-phase, or multi-workstream task: decide what needs its own isolated context versus what should share the main thread. Use fresh subagents or sessions for adversarial/verification review, independent parallel workstreams, and large exploratory research so their intermediate noise, dead ends, and half-formed guesses don't pollute or bias the main thread. Keep a single continuous task in one context instead of fragmenting it. Triggers on: context pollution, context rot, subagent, isolated task, fresh context, parallel work, verification review, long session, context window, contaminated reasoning."
---

# Context Isolation

## Overview

Every additional turn, tool result, and dead-end exploration in a context window is signal until it becomes noise. As a session grows, irrelevant history dilutes the model's attention on what actually matters right now — this is context rot. Left unmanaged it produces three concrete failure modes: decisions anchored on stale or superseded findings, verification that rubber-stamps the original reasoning because it can see that reasoning, and wasted tokens re-establishing context that a cleanly scoped subagent would never have needed in the first place.

Context isolation is not "use fewer tokens" (that's `token-efficiency`) — it's "put the right boundary around the right unit of work" so contamination can't cross it.

## When to isolate

- **Independent verification or adversarial review.** A reviewer that can see the original author's reasoning inherits its blind spots and biases toward agreeing. Verification needs a fresh context: give it the artifact and the acceptance criteria, not the story of how it was built.
- **Parallel independent workstreams.** If two pieces of work don't depend on each other's intermediate state, running them in the same context serializes them for no benefit and lets one's noise bleed into the other's reasoning.
- **Large exploratory research or search.** Most of what a broad search turns up is noise you discard. Isolate the search so only the distilled conclusion — not every dead end — lands in the main thread.
- **Anything whose failure shouldn't contaminate the main thread.** A speculative approach that might not pan out should be explored somewhere its abandonment doesn't leave confusing half-finished context behind.

## When NOT to isolate

- **A single continuous task with real dependencies between steps.** Splitting a task where step 3 needs the reasoning from step 1 just to re-derive that reasoning at extra cost. Isolation only pays off when the boundary is real.
- **Anything the main thread needs to react to immediately.** If you'll need to make a judgment call based on subtlety in the result, don't hide that subtlety behind a subagent's compressed summary.

## How to isolate

- **Subagents with a minimal, self-contained prompt.** A subagent has no memory of this conversation. Give it exactly the inputs it needs (specific IDs, file paths, constraints, the question to answer) — not "everything we discussed," which forces it to either ask for clarification it can't get or guess.
- **Fresh sessions for genuinely separate topics.** If a new thread of work shares no state with the current one, starting fresh avoids both context rot and cross-topic confusion.
- **Scoped tool calls over broad ones.** Reading one targeted file section is a form of isolation too — it keeps unrelated file content out of context entirely.
- **Bring back conclusions, not transcripts.** When a subagent or isolated exploration finishes, pull its distilled finding into the main thread — not its full working log.

## Anti-patterns

- Spawning a subagent with the entire chat history when it only needs three specific facts.
- Re-running the same exploration twice because an earlier isolated thread's findings were never surfaced back to the main context.
- Asking a verification pass to review work while it can still see the original chain of reasoning that produced it.
- Fragmenting one continuous, dependent task across multiple isolated calls purely to "save tokens," then paying more to re-establish context each time than isolation ever saved.
