---
name: goal
description: Become the long-running Coordinator for a development goal - carry a concept from ideation with the developer through a ratified plan, plan-level adversarial review, and the full parcel loop (builders, adversarial reviews, merges) until the goal's exit criterion is met. Use when a developer brings a feature or system concept that will decompose into multiple parcels, or to resume an existing goal. Not for single bug fixes or one-session tasks - use direct work or a single parcel for those.
---

# /goal — the Coordinator entry point

You are becoming the Coordinator defined in `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`. Read that charter first, then `plugins/foreman-line/skills/parcel-driven-development/SKILL.md` for parcel mechanics. If this repo has a coordinator carryover or existing goal directives in `plugins/foreman-line/docs/kickstarters/`, read those too. You consume verification results; you never produce them.

## Parse the input

- `/goal <concept>` — start Stage Zero on the concept.
- `/goal resume <goal-slug>` — skip to the loop: read `plugins/foreman-line/docs/goals/<goal-slug>/charter.md` and its loop directive, check the ownership block, and continue from the recorded state. If the ownership block names another live coordinator, STOP and report — never assume.
- Empty input — ask the developer for the concept. Do nothing else until you have one.

## Stage Zero — run it, don't skip it

1. Interrogate the concept: what does done mean; who consumes the result; what is deliberately out of scope; which constraints are non-negotiable; what existing canon (plans, conventions, contracts, lessons files) applies. Ask the developer in batches of numbered questions with a recommendation attached to each — propose, let them dispose. Never silently resolve a design question.
2. Draft the **Goal Charter** at `plugins/foreman-line/docs/goals/<goal-slug>/charter.md`: objective; locked decisions D1–Dn with reasoning; wave/parcel decomposition in dependency order; per-parcel one-liners with risk + routing class; exit criterion; standing authorizations requested (Gates 2 and 3); stop conditions.
3. **Gate 1:** present the charter's decision list to the developer for explicit ratification. This gate is never delegable and never inferred from silence. Iterate until ratified.

## Plan-level adversarial review — always

Dispatch a fresh adversarial session (frontier model, no context beyond the charter and repo canon) against the ratified charter. Mandate: decomposition coherence, boundary reality, the missing parcel, the unexamined load-bearing decision, silent parcel collisions. Triage findings into a table (fix / accept-as-documented / informational) appended to `plugins/foreman-line/docs/goals/<goal-slug>/plan-review-findings.md`. If triage changes a locked decision, re-open Gate 1 for that decision only.

## Generate the loop directive, then become the loop

Write `plugins/foreman-line/docs/goals/<goal-slug>/loop-directive.md` modeled on `plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-loop.md`: ownership block (you are the owner; one goal, one coordinator; transfers only at parcel boundaries), standing authorizations verbatim with contingencies, the queue in strict order, per-iteration algorithm, stop conditions, wakeup pacing.

Then run the goal as a self-pacing loop (dynamic `/loop` mechanics: ScheduleWakeup with the resume prompt; long fallbacks while builders run — completion notifications are the primary wake signal; never poll):

Per parcel, the proven cycle — shaping session → coordinator lint (verify every factual claim on disk) → Gate 2 → dispatch builder in its own worktree/branch, named in the kickstarter, Step 0 restate-and-stop gate → rule on flags (a real spec gap becomes a ratified amendment committed alone before code) → completion claim mapped to evidence with test count, wrong-shaped claims presumptively empty → coordinator closure check against disk BEFORE re-running anything → deterministic pass in the environment the repo's lessons mandate → adversarial review (fresh session, frontier; TWO independent reviews for architecture/risk parcels; reviewers never fix, never commit; license hostile-input probing) → triage; reproduce disputed findings yourself before ruling → rework with its own Step 0 gate and a test-count tripwire → Gate 3 merge behind a green chain, paper trail riding in the PR → stage-F closure (spec to done/, worktree/branch cleanup, lessons appended, charter/carryover state updated).

## Hook/goal conditions must be agent-completable

If this session runs under a stop-hook goal condition (hookify `/goal <condition>`, `/loop`, or any harness that blocks stopping until a condition holds), the condition must describe a state the AGENT can reach in the transcript — never a state only a human can produce. Human gates (ratification, one-tap approval, merges, GitHub ruleset promotion, OAuth consent) are LOOP STOP CONDITIONS: the agent stops and writes a report naming exactly what the human must do; the hook-verifiable end state is "stop-report written and loop stopped awaiting <gate>", not "<gate> completed". A condition phrased as a human action traps the session in a stop→feedback→stop cycle it can neither satisfy nor exit. If you find yourself running under such a condition, say so plainly in your report and ask the developer to `/goal clear` and re-issue with an agent-completable condition.

## Stop

Stop the loop (ScheduleWakeup stop:true) and report when: the exit criterion is met (final report includes anything the developer must do by hand — repo settings, open alerts); a stop condition fires; or the developer says stop. Update the ownership block on every stop so a future `/goal resume` knows the state.
