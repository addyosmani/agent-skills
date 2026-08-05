# Goal-Charter Amendment Draft — KPP-001-A (Revision 2)

**Status:** RATIFIED r2 — Gate 1 re-ratification closed 2026-08-05 for D2, D3, D4, D5, D6, D7,
the affected dependency graph, and Gate 2 scope
**Goal:** `keon-proof-led-portfolio-priority`
**Decision owner:** Clint Morgan
**Source authority:** `D:\Repos\keon-omega\keon-systems\planning\kpp-001-a\KPP-001-A.md`, ratified 2026-08-05 at local commit `0d5b3cf`
**Live backlog evidence:** Linear KEO-59; KEO-198 through KEO-206

## Changes from Revision 1

1. Adds D5-A for KPP-001-A A4: one Sprint lane per SOW, balance term,
   20-hour Review cap, margin floor, and Core Ledgerline unsellability before
   the full release gate.
2. Adds the A5.2 48-hour decision-owner approval SLA and the approval-latency
   portfolio measure.
3. Adds the A1 no-signal declaration threshold to KEO-204/206 logic.
4. Tightens the successful first-delivery exit to require a recorded §12
   keep/change/kill review as well as §4.3 economics.
5. Identifies KEO-198/199 as the A5.3 split items, subject to Gate 1 identity
   confirmation.

## Purpose

KPP-001-A controls where it conflicts with the existing goal charter. This
amendment keeps Foreman Line as the execution method but replaces the
infrastructure-first first-revenue route, freezes BrowseAhead engineering, and
right-sizes the `llverify` path without relaxing any claim, legal, privacy, or
security constraint.

## Locked decision amendments proposed for Gate 1

| ID | Replacement decision | Why |
|---|---|---|
| D2-A | For Review customers one through three, the paid path is countersigned engagement letter plus cleared invoice payment (wire/ACH). Website, Stripe, and Neon are deferred behind the first-revenue review point. | KPP-001-A A2 removes infrastructure from the first-revenue critical path. |
| D3-A | `llverify-preview` is the only authorized pre-Sprint implementation parcel: checks 1–5, core tamper/chain-gap/signature/key-status fixtures, stable exit codes, and JSON mode. It is internal only, one-owner, and timeboxed to ten business days. | KPP-001-A A3 authorizes a bounded preview while preserving the full release gate. |
| D4-A | The Workflow Evidence Review may reach G2 and first paid revenue without any `llverify` implementation. No offline-verification claim, `offline_verified` output, or Core Ledgerline Sprint acceptance is authorized until the full `llverify` v1 release gate passes. | Separates paid learning from claims and verified Sprint delivery. |
| D5-A | A Sprint selects exactly one bounded lane per SOW at the $9,500 baseline lane price ($4,750 deposit; balance due net-14 on the SOW's named acceptance evidence under D2-A). Core Ledgerline is unsellable until the full release gate passes. The Review has a 20-analyst-hour cap; at the cap it auto-narrows to the named workflow's highest-priority evidence question and the overage is recorded in §4.3 economics. An engagement projected to have negative gross labor contribution at intake must be declined or repriced by the decision owner. | KPP-001-A A4 closes the open-ended multi-lane build path and caps delivery exposure from customer one. |
| D6-A | BrowseAhead engineering has zero active parcels until the first prepaid Review or a signed, paid design-partner commitment. KEO-153 may conduct discovery only, with zero engineering capacity and no new claims. | KPP-001-A A5.4 supersedes the prior one-parcel WIP allowance. |
| D7-A | KEO-197 is frozen with all other BrowseAhead engineering; its prior BA1/BA2 path is not dispatchable while the A5.4 condition is unmet. | The amendment applies the freeze consistently to the previously singled-out lane. |

## Dispatch snapshot after ratification

| Order | Work item | Owner / authority | Status and gate |
|---|---|---|---|
| 0 | KEO-201 — Ratify KPP-001-A | Clint Morgan | Done; evidence committed at `0d5b3cf`. |
| 1 | KEO-202 — `ll/1.0` reconciliation decision | Clint Morgan | Due 2026-08-12; blocks preview. Inputs: KEO-198 (ex-KEO-156 Ledgerline-contract portion) and KEO-199 (ex-KEO-160 verifier-contract portion), split per KPP-001-A A5.3 — identity to be confirmed at Gate 1. |
| 2 | KEO-200 — G2 packet | Clint Morgan; revision support may be locally dispatched only after Gate 1 | Explicit G2 approval blocks all outreach. |
| 3 | KEO-203 — legal review | Clint Morgan + counsel | Human/counsel gate; blocks first signature only. |
| 4 | KEO-204 — REV-COHORT-1 | Human outward-facing action | Blocked by G2; ten qualified asks within 14 days of G2. No credible buying signal may be declared only after at least 20 qualified asks or 30 calendar days, whichever comes first, with zero prepaid conversions and zero scheduled scoping calls outstanding. |
| 5 | KEO-205 — `llverify-preview` | **Owner unassigned** | Blocked by KEO-202; no dispatch until one owner is named. |
| 6 | KEO-206 — automatic review | Decision owner | Due 2026-10-15 if zero prepaid Reviews. |

**Standing rule (KPP-001-A A5.2):** A ready, ratified item waiting on
decision-owner approval carries a 48-hour approval SLA. Days waited on
decision-owner approval are recorded as a portfolio measure and reviewed at
each §12 review point; a breach is recorded, never silently absorbed.

## Dependencies and exclusions

```text
KPP ratification -> KEO-202 -> KEO-205 (internal, P1)
KPP ratification -> KEO-200 -> KEO-204 (human outreach)
KEO-203 -> first signature only
no-signal declaration: >=20 qualified asks OR 30 days, with A1 conditions met
decision-owner approval of any ready item: 48h SLA; latency recorded
zero prepaid Reviews on 2026-10-15 -> KEO-206
Sprint SOW: exactly one lane; Core Ledgerline unsellable pre-gate (D5-A)

BrowseAhead engineering (KEO-147..152, KEO-197): frozen
KEO-153: discovery only; not a build parcel
Website / Stripe / Neon: deferred behind first-revenue review point
```

## Gate 2 proposal

No standing Gate 2 authority is carried forward for the affected former P1–P7
or BA1–BA2 parcels. After this amendment is ratified:

1. a single docs-only packet-revision parcel may be proposed for KEO-200;
2. `llverify-preview` may be shaped only after KEO-202 is recorded and its one
   implementation owner is named; and
3. all outreach, counsel work, first signatures, invoices, payment collection,
   public claims, production-data handling, and merges remain separately
   human-owned.

## Stop conditions

- The KeonSystems workflow has no `Blocked` or `Paused` state. Frozen-item
  comments are recorded, but no substitute state may be invented or treated as
  cancellation.
- Stop before any `llverify-preview` shaping/dispatch without KEO-202 and a
  named owner.
- Stop before any BrowseAhead engineering, any external action, or any
  infrastructure-first commercial work.
- Stop before any Sprint SOW that selects more than one lane or contracts Core
  Ledgerline acceptance before the full `llverify` v1 release gate passes.
- Stop on any required file outside an exact Allowed Files list, contract
  conflict, claims expansion, security boundary ambiguity, or missing legal
  decision.

## Proposed exit criterion amendment

The portfolio amendment closes when the KPP-001-A engine reaches its recorded
outcome: a Review is delivered in three to five business days after a prepaid
conversion with §4.3 economics and the §12 keep/change/kill review for that
review point recorded, or the valid 2026-10-15 §12
keep/change/kill review is recorded after zero prepaid Reviews. This does not
authorize, require, or imply a verified Sprint, self-serve checkout, or
BrowseAhead engineering before their independent gates pass.

## Gate 1 ratification record

On 2026-08-05, Clint Morgan fully ratified and authorized the six decision
replacements (D2-A, D3-A, D4-A, D5-A, D6-A, D7-A), the dispatch snapshot
including the A5.2 standing rule, the KEO-198/199 identity confirmation, the
narrowed Gate 2 proposal, and the exit criterion.

The amendment is now the controlling authority wherever it conflicts with the
existing goal charter. Gate 2 remains limited exactly as stated above; no
outreach, counsel work, first signature, invoice, payment collection, public
claim, production-data handling, or merge authority is inferred.
