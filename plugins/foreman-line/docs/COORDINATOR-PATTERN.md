# The Coordinator Pattern

Extracted 2026-07-15 from five shipped Foreman Line parcels (W0-P1, PCC-P0, W0-P3, W0-P4, SEC-1) and ratified by Clint. This is the generalized charter for the role the carryover docs call "the Coordinator (D4)." The parcel-mechanics half of the pattern is documented in `plugins/foreman-line/skills/parcel-driven-development/`; this charter adds the pieces that methodology never formalized: the upstream ideation stage, the plan-level review, the human-gate model, and the long-running loop that holds it all together. Entry point: the `/goal` skill (`plugins/foreman-line/skills/goal/`).

## The role, in one paragraph

The coordinator is the first agent a developer works with and the only long-running one. It carries a goal from concept to shipped, but it never produces verification of its own work - it consumes verification produced by others (D4). It interviews the developer, drafts the plan, routes every parcel through builders and adversarial reviewers in fresh sessions, rules on flags, ratifies spec amendments, runs deterministic passes, triages findings, and merges only behind a green chain. Its outputs are decisions and dispatches; its evidence trail is kickstarters, transcripts, and receipts.

## Lifecycle

```
Stage Zero (ideation)          - coordinator + developer, mutual  → Goal Charter
   └─ GATE 1: developer ratifies the charter (never delegable)
Plan adversarial review        - fresh frontier session, ALWAYS   → findings + triage
   └─ charter amended if needed; re-ratify only if decisions changed
Per-parcel loop (repeat)       - the proven 11-step loop           → merged parcel
   ├─ GATE 2: dispatch approval (delegable via standing authorization)
   └─ GATE 3: merge (delegable via standing authorization, green-chain contingent)
Goal exit                      - exit criterion met                → final report, loop stops
```

## Stage Zero - concept to ratified plan

Everything downstream of Stage Zero was formalized first; Stage Zero was run by hand (FOREMAN-LINE-PLAN.md was relay-built) until this charter. Most mistakes start here, so it gets structure:

1. **Intake.** Developer brings a concept - a sentence to a page. The coordinator interrogates it: what does done mean, who consumes the result, what is deliberately out, what constraints are non-negotiable, what existing canon applies.
2. **Ideation is mutual.** The coordinator proposes; the developer disposes. Open design questions are surfaced as explicit numbered decisions with a recommendation each - never silently resolved. (The four-decision ratification that created this document is the reference example.)
3. **Output: the Goal Charter**, one document, containing: the objective; locked decisions (D1–Dn, each with its reasoning recorded); the wave/parcel decomposition with dependency order; per-parcel one-liners with risk and routing class; the goal exit criterion; standing authorizations granted for this goal (see Gates); and the stop conditions.
4. **Gate 1 - ratification.** The developer approves the charter explicitly. This gate can never be delegated or pre-authorized: a "mutual final design decision" with one party absent is neither mutual nor a decision.

## Plan-level adversarial review - always

Before the first parcel is shaped, the ratified charter goes to a fresh adversarial session (frontier model, zero coordinator context beyond the charter and repo canon). 

Mandate: 
 - Is the decomposition coherent? 
 - Are parcel boundaries real or wishful? 
 - which parcel is missing? 
 - Which locked decision is load-bearing but unexamined? 
 - Where will two parcels silently collide? 
 
 The coordinator triages findings exactly as it does code findings (fix / accept-as-documented / informational, table appended to the review transcript). If triage changes a locked decision, Gate 1 re-opens for that decision. 

This review is not risk-gated - it runs every time, because plan defects are the cheapest defects in the system and the review that would have caught them costs one session.

## The three human gates

| Gate | What                                         | Delegable?                                                                                                                          |
| ---- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Charter ratification (Stage Zero exit)       | **Never**                                                                                                                           |
| 2    | Dispatch approval (parcel-set + kickstarter) | Yes - standing authorization scoped to the charter's named parcels, granted at ratification or later                                |
| 3    | Merge                                        | Yes - standing authorization ("merge it" rule), always contingent on the full verification chain being green; any red step voids it |

Standing authorizations are written into the goal's loop directive verbatim, with their scope and their contingencies. Harness permission prompts are not process gates and must never be used as them - gates live in directives, envelopes live in settings (see Dispatch).

## Dispatch table

Per-role routing is governed by the shipped routing policy (`plugins/foreman-line/routing-policy/`); this table is the operational summary. The permission-profile registry + dispatch-time emitter parcels have shipped (P1, P3 - `permission-profile-registry` goal), so the envelope column below reads as actual, structurally-reduced, mechanically-enforced-where-loaded state, not the aspirational placeholder it once was - subject to the session-start-load bound: an envelope only constrains a session that actually loads the emitted worktree-local `.claude/settings.local.json` (not a subagent sharing the parent's already-loaded settings, not a bypass-mode session), and even then a shell-capable profile's fix/commit capability is reduced, not eliminated (see P1's README and the `permission-profile-registry` goal charter's D9-amendment for the full failure-mode accounting).

| Role                        | Model tier                          | Session shape                                         | Envelope                                                                                                                                                                                                                                                             |
| --------------------------- | ----------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordinator                 | Frontier, always (policy invariant) | One long-running session per goal, `/goal` loop       | Broad, incl. push/PR/merge                                                                                                                                                                                                                                           |
| Builder (standard risk)     | Mid-tier (Sonnet-class)             | Fresh session/agent per parcel, own worktree + branch | Write scoped to spec `surfaces:`, network per profile                                                                                                                                                                                                                |
| Builder (architecture/risk) | Frontier                            | Same                                                  | Same                                                                                                                                                                                                                                                                 |
| Adversarial reviewer        | Frontier, always                    | Fresh session per review, zero builder context        | **Structurally reduced, mechanically-enforced-where-loaded - no Edit/Write, enumerable repo-mutation commands denied in both shells; "reviewer never fixes" is reduced, not eliminated (Bash/PowerShell residual is a deliberate, documented trade-off, not a gap)** |
| Shaping agent               | Frontier                            | Fresh session per parcel                              | Docs-only writes                                                                                                                                                                                                                                                     |

Three dispatch mechanics rules, all earned: every dispatch - including rework - opens with a Step 0 restate-and-stop gate; the branch/worktree is named in the directive, never ambient; and rework directives mandate "every X," never "the listed X" - the findings are a floor, not a ceiling, and no role is exempt from the sweep, including the coordinator (lesson #16). Every builder/reviewer kickstarter includes the standing constraints by reference (`plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`). For architecture/risk parcels, run **two independent adversarial reviews** (lesson #12: two frontier reviews of W0-P4 agreed on every focus question and only one found the blocker). Where reviews disagree, the coordinator reproduces the disputed finding before triaging - the reproduction is the tie-breaker at triage and the closure proof at acceptance.

## The long-running loop

The coordinator runs as a self-pacing loop (`/goal` enters it after ratification): work while there is work, sleep on a long fallback while builders build (completion notifications are the primary wake signal), stop when the exit criterion is met or a stop condition fires. One goal, one coordinator: the loop directive carries an ownership block, and ownership transfers only at parcel boundaries via that block (rule earned when a second coordinator committed onto a live parcel branch - 491fb80 - and was benign only by luck). Universal stop conditions: a frozen contract needs modification; a tripwire fires twice on one parcel; a security finding can't close in-parcel; anything outward-facing beyond the standing authorizations; queue empty.

When triage re-opens Gate 1 for specific decisions, the re-open is scoped, not blanket: list exactly which downstream work each re-opened decision blocks; work provably orthogonal to every re-opened element proceeds under the standing authorizations. Hold the *irreversible* step (merge-to-main, outward-facing wiring) for the human - not the reversible local upstream work (shaping, building, review) the re-opened decisions do not touch. Over-holding is a real cost, not a safe default (lesson #27).

## Verification spine (unchanged, referenced)

The per-parcel 11-step loop is canon in the coordinator carryover and is not duplicated here. Its non-negotiables: claims are verified on disk before acceptance (green checks verify state; only per-item closure checks verify work); deterministic passes run on the coordinator's machine in the environment the lessons file mandates; wrong-shaped claims are presumptively empty; test-count tripwires on every rework; reviews rank, owners decide.

One more, earned at the W4 exit (lesson #33): **when a parcel spec restates a goal exit criterion, diff the two texts word by word.** Specs are written after the charter by shaping sessions reading it, and they can weaken a criterion while appearing to implement it. A criterion naming a *produced artifact* — a minted receipt chain, a live API response, a real merged PR — is satisfied only by that artifact; a fixture imitating it is a self-graded claim. Parcel-level green does not roll up into goal-level satisfied: record the shortfall as an open exit condition at Stage-F closure and carry it to the final report.

## Lessons discipline (Stage F)

The lessons ledger (`docs/transcripts/defects_lessons.md`) is provenance and coordinator memory, never operating instructions — no dispatch directive tells an agent to read it wholesale. Every lesson appended at Stage-F closure carries a disposition line per the ledger's convention: the distilled rule installed in the narrowest artifact already read by the agent it governs (kickstarter constraint, SPEC-CONVENTION, this document, the carryover, or a mechanical hook/CI check), or marked narrative-only. An *open* disposition is a standing debt: the coordinator routes it the next time the candidate artifact is touched, and reconciles open dispositions at goal closure/carryover handoff.

## Lineage and extraction

This charter generalizes: the Foreman Line coordinator carryover (role + 11-step loop), the 2026-07-15 loop directive (long-running mechanics, ownership, standing authorizations), and `plugins/foreman-line/skills/parcel-driven-development/` (parcel mechanics). Extraction rule, applied to this document as to everything else: promote to the PDD skill / a company-wide package only after the pattern survives its next real goals - extract from shipped practice, never build the platform first.
