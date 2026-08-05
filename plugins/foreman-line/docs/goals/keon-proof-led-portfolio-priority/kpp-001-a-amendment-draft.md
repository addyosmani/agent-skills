# Goal-Charter Amendment Draft — KPP-001-A (Revision 3)

**Status:** RATIFIED r3 — Gate 1 re-ratification closed 2026-08-05 for D2, D3, D4, D5, D6, D7,
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

## Revision 3 corrections — mandatory plan review

1. Makes the valid-negative exit require both the KEO-206 review and every A1
   no-signal threshold; the date trigger alone cannot close the experiment.
2. Adds a bounded P0M manual paid-path contract-freeze parcel and four
   non-Gate-2 human milestones for signature, cleared funds, approved intake,
   and delivery/economics recording.
3. Adds KEO-54 explicitly to the mandatory KEO-202 disposition boundary.
4. Replaces conflicting historical authority with one Gate 2 matrix.
5. Defines the `llverify-preview` timebox clock and anti-reset rule.

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
| D3-A | `llverify-preview` is the only authorized pre-Sprint implementation parcel: checks 1–5, core tamper/chain-gap/signature/key-status fixtures, stable exit codes, and JSON mode. It is internal only and one-owner. Its ten-business-day capacity clock starts at owner-accepted dispatch; consumed days are recorded in parcel evidence; neither pause nor reassignment resets it; and day ten requires stop-and-return to the decision owner. | KPP-001-A A3 authorizes a bounded preview while preserving the full release gate. |
| D4-A | The Workflow Evidence Review may reach G2 and first paid revenue without any `llverify` implementation. No offline-verification claim, `offline_verified` output, or Core Ledgerline Sprint acceptance is authorized until the full `llverify` v1 release gate passes. | Separates paid learning from claims and verified Sprint delivery. |
| D5-A | A Sprint selects exactly one bounded lane per SOW at the $9,500 baseline lane price ($4,750 deposit; balance due net-14 on the SOW's named acceptance evidence under D2-A). Core Ledgerline is unsellable until the full release gate passes. The Review has a 20-analyst-hour cap; at the cap it auto-narrows to the named workflow's highest-priority evidence question and the overage is recorded in §4.3 economics. An engagement projected to have negative gross labor contribution at intake must be declined or repriced by the decision owner. | KPP-001-A A4 closes the open-ended multi-lane build path and caps delivery exposure from customer one. |
| D6-A | BrowseAhead engineering has zero active parcels until the first prepaid Review or a signed, paid design-partner commitment. KEO-153 may conduct discovery only, with zero engineering capacity and no new claims. | KPP-001-A A5.4 supersedes the prior one-parcel WIP allowance. |
| D7-A | KEO-197 is frozen with all other BrowseAhead engineering; its prior BA1/BA2 path is not dispatchable while the A5.4 condition is unmet. | The amendment applies the freeze consistently to the previously singled-out lane. |

## Dispatch snapshot after ratification

| Order | Work item | Owner / authority | Status and gate |
|---|---|---|---|
| 0 | KEO-201 — Ratify KPP-001-A | Clint Morgan | Done; evidence committed at `0d5b3cf`. |
| 1 | P0M — manual paid-path contract freeze | Clint Morgan; counsel approval is an external gate | Docs-only parcel: exact future allowed files are `planning/kpp-001-a/engagement-letter-template.md`, `planning/kpp-001-a/invoice-template.md`, `planning/kpp-001-a/intake-channel-data-handling-contract.md`, and `planning/kpp-001-a/delivery-checklist.md`. Required before first signature or intake. |
| 2 | KEO-202 — `ll/1.0` reconciliation decision | Clint Morgan | Due 2026-08-12; blocks preview. The dated decision must name dispositions for KEO-54, KEO-198 (ex-KEO-156 Ledgerline-contract portion), and KEO-199 (ex-KEO-160 verifier-contract portion). |
| 3 | KEO-200 — G2 packet | Clint Morgan | Explicit G2 approval blocks all outreach. |
| 4 | KEO-203 — legal review | Clint Morgan + counsel | Human/counsel gate; blocks first signature only. |
| 5 | H-SIGN / H-FUNDS / H-INTAKE / H-DELIVERY | Human-owned, non-Gate-2 milestones | Record approved letter/signature, cleared invoice funds, approved intake channel/data handling, and delivery plus §4.3 economics respectively. |
| 6 | KEO-204 — REV-COHORT-1 | Human outward-facing action | Blocked by G2; ten qualified asks within 14 days of G2. No credible buying signal may be declared only after at least 20 qualified asks or 30 calendar days, whichever comes first, with zero prepaid conversions and zero scheduled scoping calls outstanding. |
| 7 | KEO-205 — `llverify-preview` | **Owner unassigned** | Blocked by KEO-202; no shaping or dispatch until one owner is named. |
| 8 | KEO-206 — automatic review | Decision owner | Due 2026-10-15 if zero prepaid Reviews. |

**Standing rule (KPP-001-A A5.2):** A ready, ratified item waiting on
decision-owner approval carries a 48-hour approval SLA. Days waited on
decision-owner approval are recorded as a portfolio measure and reviewed at
each §12 review point; a breach is recorded, never silently absorbed.

## Dependencies and exclusions

```text
KPP ratification -> P0M -> H-SIGN -> H-FUNDS -> H-INTAKE -> H-DELIVERY
KPP ratification -> KEO-202 (KEO-54 + KEO-198 + KEO-199 dispositions) -> KEO-205
KPP ratification -> KEO-200 -> KEO-204 (human outreach)
KEO-203 -> H-SIGN only
no-signal declaration: >=20 qualified asks OR 30 days, with A1 conditions met
decision-owner approval of any ready item: 48h SLA; latency recorded
zero prepaid Reviews on 2026-10-15 -> KEO-206
Sprint SOW: exactly one lane; Core Ledgerline unsellable pre-gate (D5-A)

BrowseAhead engineering (KEO-147..152, KEO-197): frozen
KEO-153: discovery only; not a build parcel
Website / Stripe / Neon: deferred behind first-revenue review point
```

## Gate 2 authority matrix — proposed

No historical authority applies to an item not explicitly listed below.

| Item | Authority after Revision 3 ratification |
|---|---|
| P0M manual paid-path contract freeze | **Shaping/proposal only; dispatch withheld.** A parcel spec must name the exact four artifacts and its isolated worktree before a separate dispatch approval. |
| KEO-202 reconciliation decision | **Human decision work; no builder dispatch.** The decision owner records the dated disposition. |
| KEO-200 G2 packet | **Shaping/proposal only; dispatch withheld.** A docs-only revision parcel may be proposed after P0M's contract boundary is frozen. |
| KEO-205 `llverify-preview` | **Shaping/proposal only; dispatch withheld** until KEO-202 is recorded, a single owner is named, and a separate dispatch approval identifies the ten-day clock. |
| H-SIGN, H-FUNDS, H-INTAKE, H-DELIVERY, KEO-203, KEO-204, KEO-206 | **Agent dispatch denied.** These remain human/counsel/external decision or execution milestones. |
| BrowseAhead, former P1–P7, BA1–BA2, website/Stripe/Neon work | **Agent dispatch denied** until a future ratified amendment expressly permits a bounded parcel. |

Gate 3 remains withheld. No outreach, counsel work, first signature, invoice,
payment collection, public claim, production-data handling, or merge authority
is inferred.

## Stop conditions

- The KeonSystems workflow has no `Blocked` or `Paused` state. Frozen-item
  comments are recorded, but no substitute state may be invented or treated as
  cancellation.
- Stop before any `llverify-preview` shaping/dispatch without KEO-202 and a
  named owner.
- Stop before a valid-negative close unless the KEO-206 review is recorded and
  the complete A1 no-signal threshold, zero-prepaid, and no-outstanding-call
  conditions are evidenced.
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
review point recorded, or a valid-negative close records the 2026-10-15 §12
review **and** the complete A1 no-signal threshold: at least 20 qualified asks
or 30 calendar days, whichever comes first, with zero prepaid conversions and
zero scheduled scoping calls outstanding. The 2026-10-15 trigger fires a
review; it does not independently close the experiment. This does not
authorize, require, or imply a verified Sprint, self-serve checkout, or
BrowseAhead engineering before their independent gates pass.

## Revision 2 and Revision 3 ratification record

On 2026-08-05, Clint Morgan fully ratified and authorized the six Revision 2 decision
replacements (D2-A, D3-A, D4-A, D5-A, D6-A, D7-A), the dispatch snapshot
including the A5.2 standing rule, the KEO-198/199 identity confirmation, the
narrowed Gate 2 proposal, and the exit criterion.

The mandatory fresh plan review then identified the Revision 3 corrections
above. On 2026-08-05, Clint Morgan ratified Revision 3: the corrections, P0M
and the four human milestones, the KEO-54 disposition requirement, the
explicit Gate 2 authority matrix, the timebox accounting rule, and the
corrected valid-negative exit branch.

The matrix is now controlling. Gate 2 is limited to its stated
shaping/proposal authority; no dispatch, merge, outreach, counsel work, first
signature, invoice, payment collection, public claim, or production-data
handling authority is inferred.
