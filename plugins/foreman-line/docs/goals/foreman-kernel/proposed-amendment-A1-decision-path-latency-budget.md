# Proposed Charter Amendment A1 — Decision-Path Latency Budget

## Status

**RATIFIED**

This document supplies exact replacement text for a scoped Gate 1 amendment. It
is drafted text awaiting the developer's explicit ratification naming this
amendment and its targets. Nothing in it is in force. Per SPEC-CONVENTION §11,
a coordinator-ratified amendment requires exact replacement text (supplied
below), a standalone commit touching only convention/charter files, and a commit
message identifying it as coordinator-ratified — none of which has occurred.

**Source:** `ADR-001-runtime-infrastructure-posture.md`, Consequences §1, which
recorded this as advisory and named FK-P1 as the natural owner.

**Drafting note:** the charter text quoted below as "current" is taken from the
`foreman-kernel` charter as reviewed on 2026-08-31. The repository copy lives on
the `codex/foreman-kernel-stage0-20260830` worktree, which was not reachable
during drafting. Verify each quoted block against the worktree copy before
committing; any drift means the replacement blocks need re-anchoring, not
re-authoring.

---

## Why this belongs in the charter rather than in a spec

D8 places an `authorizeAction` call in the `PreToolUse` path of every governed
mutation. That makes decision latency a property of the *enforcement claim*, not
a quality-of-life detail:

1. **A latency regression is an enforcement regression.** D8's enforcement rests
   on adapters that are actually loaded. Hooks that make sessions feel sluggish
   get disabled by the person operating them, and a disabled adapter refuses
   nothing. The charter already treats non-enrollment as a first-class failure
   mode worth its own heartbeat detector; latency is the mechanism most likely to
   *cause* non-enrollment, and it currently has no owner.
2. **It settles transport by derivation rather than by preference.** A stated
   budget mechanically excludes per-invocation container start (roughly 200–800 ms
   cold) and any network hop. Without the budget, those are architecture opinions
   someone can relitigate in a parcel; with it, they are arithmetic.
3. **No parcel currently owns it.** FK-P1 defines the decision contract, FK-P16
   consumes it, FK-P17 exercises it, and none of them state a timing obligation.
   A requirement owned by nobody is satisfied by nobody.

Countervailing risk, stated plainly: a latency budget creates pressure to cache
authorization decisions, and an over-cached decision is a stale decision. A1
therefore binds caching to `goalRevision` and routes staleness into the existing
`STATE_REVISION_STALE` refusal rather than inventing a new failure mode. If that
binding is not acceptable, the budget should be rejected rather than softened —
a fast wrong answer is worse than a slow right one, and this record does not
argue otherwise.

---

## A1.1 — New locked decision D21

**Target:** §4 Locked decisions table. Append as a new row after D20.

**Proposed text:**

| D21 | The kernel's decision path carries a stated latency budget, measured on the D20 platform matrix. Two spans are distinguished: `kernelDecisionLatency` (request received at the decision surface → response written) is kernel-owned and budgeted at p50 ≤ 5 ms, p95 ≤ 20 ms, p99 ≤ 50 ms warm; `mediatedActionLatency` (host lifecycle entry → hook exit, inclusive of adapter and transport) is budgeted at p99 ≤ 150 ms. First-call-after-start cost is reported separately against a ≤ 2000 ms allowance and is never folded into a warm percentile. Exceeding a budget is a recorded obligation, not a refusal. Exceeding the hard deadline of 1000 ms on a single decision is treated as kernel-unreachable and inherits the D8 outage posture unchanged. Authorization results may be cached only when bound to `goalRevision`, `policyDigest`, and compiled-scope digest; a cache entry whose binding no longer matches produces `STATE_REVISION_STALE` rather than a stale ALLOW. | D8's enforcement claim depends on adapters that remain loaded and enabled. Latency is the most probable cause of an operator disabling one, which converts a claimed mechanical control into an undetected gap. Stating the budget also settles transport by derivation — per-invocation container start and network round trips are excluded arithmetically rather than by preference — and prevents the budget from being met by unsound caching. |

---

## A1.2 — FK-P1 parcel scope

**Target:** §6, Wave 0 parcel table, FK-P1 row, Outcome column.

**Current text:**

> Versioned lifecycle event, authenticated-principal/local-capability admission,
> `authorizeAction`, decision envelope, refusal-code, assurance-level, repository
> identity, content/read-capability boundary, host-path normalization split, and
> golden vectors.

**Proposed replacement:**

> Versioned lifecycle event, authenticated-principal/local-capability admission,
> `authorizeAction`, decision envelope, refusal-code, assurance-level, repository
> identity, content/read-capability boundary, host-path normalization split,
> golden vectors, and the D21 decision-path latency contract — the two measured
> spans and their observation points, the hard-deadline-to-outage mapping, and the
> revision-bound caching rule whose violation yields `STATE_REVISION_STALE`.

**Rationale:** FK-P1 already owns the decision envelope the adapter consumes and
the refusal codes the budget routes into. Placing the timing contract anywhere
else splits one contract across two parcels and invites the drift D12 exists to
prevent.

---

## A1.3 — FK-P17 measurement obligation

**Target:** §6, Wave 4 parcel table, FK-P17 row, Outcome column.

**Current text:**

> Exercises shell, subprocess, custom-tool/MCP, symlink/reparse, subagent,
> mediated bypass, hook non-enrollment, stale state, service timeout, and restart;
> produces the mechanical/detected/unsupported matrix.

**Proposed replacement:**

> Exercises shell, subprocess, custom-tool/MCP, symlink/reparse, subagent,
> mediated bypass, hook non-enrollment, stale state, service timeout, and restart;
> produces the mechanical/detected/unsupported matrix; and produces the D21
> latency profile on the D20 platform — warm percentiles for both measured spans,
> the first-call-after-start figure, and a hard-deadline case proving the
> unreachable path inherits the D8 outage posture rather than failing open.

**Rationale:** FK-P17 already drives the mediated lifecycle under adversarial
conditions and already owns the service-timeout case, which is the same code path
the hard deadline exercises. Adding a separate benchmarking parcel would
duplicate that harness.

**Deliberate limitation:** CI runners do not share the D20 platform's performance
characteristics. FK-P18 may assert only a coarse regression bound; the
authoritative measurement is FK-P17's on the proven host. This amendment does not
add a CI gate on latency, and a CI latency assertion must never be cited as
platform evidence.

---

## A1.4 — Wave 0 exit criterion

**Target:** §6, Wave 0 exit paragraph.

**Current text:**

> **Wave 0 exit:** contracts and fixtures are merged; exact path authority can be
> compiled without reading `surfaces:` as mutation permission; plan-level
> contradictions have no unresolved implementation consequence.

**Proposed replacement:**

> **Wave 0 exit:** contracts and fixtures are merged; exact path authority can be
> compiled without reading `surfaces:` as mutation permission; the D21 latency
> contract is specified with both measured spans, their observation points, the
> hard-deadline-to-outage mapping, and the revision-bound caching rule; and
> plan-level contradictions have no unresolved implementation consequence.

Note that Wave 0 exit requires the contract to be *specified*, not *met* — the
measurement is FK-P17's obligation in Wave 4. Wave 0 ships no runtime.

---

## A1.5 — New integration scenario 14

**Target:** §8 Integration scenarios. Append after scenario 13.

**Proposed text:**

> 14. **Decision-path latency:** on the D20 platform, a warm kernel serves a
>     representative governed-mutation decision within the D21 budget for both
>     measured spans; the first-call-after-start figure is recorded separately; a
>     decision exceeding the hard deadline is reported as kernel-unreachable and
>     inherits the D8 outage posture without failing open; and an authorization
>     cache entry whose `goalRevision`, `policyDigest`, or compiled-scope digest
>     no longer matches produces `STATE_REVISION_STALE` rather than a stale ALLOW.

---

## A1.6 — Gate 1 decision list

**Target:** §13, item 7.

**Current text:**

> 7. versioned typed tool contracts plus the read-confidentiality boundary (D17, D19);

**Proposed replacement:**

> 7. versioned typed tool contracts, the read-confidentiality boundary, and the
>    decision-path latency contract with its revision-bound caching rule
>    (D17, D19, D21);

---

## What this amendment deliberately does not do

Enumerated so triage has a boundary to check against:

- It adds no refusal class. The five initial mediated classes in §5 are unchanged;
  `STATE_REVISION_STALE` already exists and is reused rather than extended.
- It adds no authority. No tool gains the ability to mint approval, verification,
  merge, or closure authority, and D5 is untouched.
- It changes no human gate. Gates 1, 2, and 3 stand exactly as ratified.
- It does not alter the D20 platform claim, widen it, or imply parity on any host
  that has not produced process-boundary evidence.
- It does not make latency a CI gate. See A1.3's stated limitation.
- It creates no new parcel and changes no dependency edge in the FK-P0–FK-P21
  graph.
- It persists no prompt, payload, or credential. Latency records are operational
  telemetry only, consistent with §5's rule on the event stream, and are never
  evidence of enforcement.

## Open implementation question for FK-P1, not decided here

Whether the decision envelope gains an optional observability field (for example
`decisionLatencyMs`) is an FK-P1 contract question this amendment does not settle.
If added it must be additive and optional under D17's versioning rules, and it
must carry no authority semantics — a self-reported timing figure is not evidence
and must never be treated as such.

## Ratification

Ratifying this amendment binds D21 and the A1.2–A1.6 replacement text. Rejecting
it leaves the ADR's recommendation advisory, in which case the latency question
should be recorded as a known unowned risk rather than silently dropped — the
failure mode it describes does not stop existing because the amendment was
declined.

**Ratification record:** Ratified as written by Clint Morgan - 09/01/2026