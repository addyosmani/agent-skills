# Goal Charter — Keon Proof-Led Portfolio Priority

**Status:** RATIFIED — Gate 1 closed 2026-07-29 after plan-review amendment
**Coordinator:** Primary Codex session designated by Clint Morgan
**Mode:** Multi-Project Initiative
**Canonical Keon initiative:** `keon-proof-led-commercial-entry`
**Discovery:** [discovery.md](./discovery.md)
**Plan review:** [plan-review-findings.md](./plan-review-findings.md)
**Ratified website GTM amendment:** [website-gtm-closeout-amendment.md](./website-gtm-closeout-amendment.md)

## Ratification record

On 2026-07-29, Clint Morgan explicitly:

- ratified D1-D9 without amendment;
- ratified the parcel decomposition and exit criterion;
- granted Gate 2 standing dispatch authorization for P0-P6 and BA1-BA2,
  subject to this charter's dependency order, exact Allowed Files, isolated
  worktrees, and Step 0 restate-and-stop gates;
- withheld Gate 3 standing merge authorization pending each parcel's complete
  evidence chain; and
- authorized continued in-scope execution while preserving the charter's
  external-action boundaries and stop conditions.

The mandatory fresh plan-level adversarial review then found that the initially
ratified
decomposition could not reach its own commercial exit, treated the safe paid
path as one oversized parcel, and contained contradictory dependency edges.
The coordinator accepted those findings and amended only the decomposition,
exit mechanics, and resulting Gate 2 parcel scope. D1-D9 remain locked and
unchanged.

After an independent follow-up review returned PASS, Clint Morgan explicitly
re-ratified D1-D9, the amended parcel decomposition, and the amended exit
criterion on 2026-07-29. Clint granted Gate 2 standing dispatch authorization
for P0-P2, P3A-P3E, P4-P7, and BA1-BA2. Gate 3 standing merge authorization
remains withheld pending each parcel's evidence. H0-H4 and every external
action remain outside Gate 2.

After P0 implementation and two independent reviews exposed a pre-existing
claims-validation gate defect, Clint Morgan explicitly authorized a bounded
**P0V claims-validation repair parcel before P0 Gate 3** on 2026-07-29. This is
a parcel-specific Gate 2 authorization for P0V. It adds only the verification
prerequisite `P0V -> P0 Gate 3`; it does not change D1-D9, the commercial
dependency graph, the exit criterion, Gate 3 withholding, or any external
authority.

## Objective

Reach first safe revenue through the existing Keon Workflow Evidence Review,
convert qualified findings into a tightly scoped Evidence Pack Sprint, and
establish the minimum independently verifiable Evidence Pack contract needed
for that Sprint, while preserving one bounded BrowseAhead work lane that has no
dependency edge into first revenue.

Foreman Line coordinates this objective. It does not replace the existing Keon
initiative charter, claims and packaging registries, Linear KEO-59 control
plane, or repository-local evidence. Once ratified, the first parcel amends
those authorities so they and this charter describe one plan.

## Locked decisions

| ID | Proposed decision | Reasoning |
|---|---|---|
| D1 | `keon-proof-led-commercial-entry` and KEO-59 remain the sole initiative and commercial parent. Foreman Line is the execution method, not a parallel control plane. | Preserves the ratified July authority and prevents duplicate backlog or claims state. |
| D2 | The $2,500 Workflow Evidence Review is the first paid transaction. The $9,500 Evidence Pack Sprint is the first implementation engagement and is offered only after a Review identifies an approved, bounded remediation lane. | Matches the current packaging registry, lowers purchase friction, and resolves the ambiguous phrase “first wedge” without demoting the Sprint. |
| D3 | No second `llverify` executable is created by default. “Minimum `llverify` gate” means a frozen, tested compatibility subset implemented through the existing `Keon.Cli verify-pack` unless the reconciliation parcel proves a distinct executable is necessary. Customer language remains “offline verifier.” | Keon already has a substantial offline verifier; Ledgerline currently forbids implementation from its non-canonized draft. Duplication would delay revenue and create conflicting truth. |
| D4 | The Review may reach G2/G3/G4 and earn first revenue without Ledgerline canonization. A Sprint lane that promises a real independently verified Evidence Pack cannot be sold or delivered until its applicable verifier gate passes. | Keeps verification work off the Review's revenue path while preventing the Sprint from outrunning proof. |
| D5 | The minimum verifier gate is fail-closed and fixture-backed: version/schema recognition; deterministic JCS/SHA-256 recomputation; complete listed-artifact coverage; Ed25519 signature and trusted-key checks; tenant and identity consistency; monotonic, gap-free receipt-chain validation; authorization-to-completion binding for the same operation and request fingerprint; explicit completeness/seal status; negative fixtures for every mandatory failure; stable machine-readable output and non-zero failure codes. Mandatory checks may not report SKIP. | This is the smallest gate that supports an honest independently verifiable Sprint artifact. It avoids adopting the whole Ledgerline roadmap. |
| D6 | BrowseAhead has WIP limit one. It runs only from capacity not needed to clear a revenue-critical blocker, and no BrowseAhead parcel may become a dependency of Review launch, Sprint packaging, verifier freeze, payment, fulfillment, or delivery. | Preserves product momentum without permitting portfolio inversion. |
| D7 | Reuse `KEO-197` as the sole BrowseAhead slop-squatting lane. First freeze its domain/path slop-squatting contract and hostile fixtures; then implement only that bounded, fail-closed pre-network behavior. Foreman parcels may sequence the work, but no duplicate Linear issue is created. | Live Linear already contains the authoritative WAAA-backed threat definition, taxonomy boundary, fixtures, and acceptance criteria under BrowseAhead parent `KEO-147`. |
| D8 | All Keon implementation occurs in one parcel/branch/worktree per repo from current `origin/main`, with exact Allowed Files. Dirty shared checkouts remain untouched. Architecture, verifier, security, billing, and public-claim parcels receive two independent adversarial reviews. | Applies Foreman Line and PDD boundaries to the current dirty multi-repo workspace. |
| D9 | No customer contact, public claim, payment enablement, invoice creation, legal approval, or production-data handling is inferred from this charter. Those remain explicit human/outward-facing gates under the existing initiative. | LFG authorizes execution planning and safe local work, not irreversible external acts. |

## Minimum verifier gate

The contract-freeze parcel must map each mandatory check to:

1. an existing implementation and passing test;
2. a bounded implementation gap and exact parcel; or
3. an explicit exclusion that removes the corresponding Sprint claim or lane.

The gate passes only when:

- one valid representative bundle returns the frozen success status offline;
- tampered, missing, reordered, cross-tenant, unauthorized, incorrectly bound,
  incomplete, and unsealed fixtures return the frozen failure/open status;
- no required check is implemented only as a caller assertion;
- no required check returns SKIP;
- all verifier output is deterministic except explicitly identified diagnostic
  timestamps;
- the claims and proof registries describe exactly what the evidence proves and
  does not prove.

This gate applies to a Sprint lane that produces a real Evidence Pack. It does
not convert the Review into certification, legal advice, or a platform
dependency.

## Waves and parcel decomposition — amended after plan review

`P3` is a parent wave, not a dispatchable parcel. Only its bounded child
parcels may be dispatched. `H0-H4` are human/external milestones, not agent
parcels and not covered by Gate 2.

| Parcel / milestone | Product | One-line output | Risk / routing | Depends on | Revenue blocking |
|---|---|---|---|---|---|
| P0V — Claims-validation repair | Make the existing claim-ID gate portable and align strict detection with structured claim declarations while preserving malformed-ID rejection | `claims:check` is deterministic and green on pristine `origin/main` and the P0 worktree without treating governance prose as a product claim | Architecture/public-claim tooling / frontier / dual review | P0 blocker evidence; before P0 Gate 3 | Yes, because P0 cannot clear Gate 3 without it |
| P0 — Control-plane reconciliation | A dated amendment to the existing Keon charter/tracker and live Linear mapping, with no duplicate issues | One authoritative dependency graph, including explicit authorization for the bounded BrowseAhead lane | Architecture / frontier / dual review | Gate 1 | Yes |
| P1 — Review/Sprint packaging closure | Approval-ready Review packet, explicit Review-to-Sprint handoff, Sprint lane selector, quote/deposit boundary, and delivery ownership | A buyer can understand what is bought now versus scoped later | Commercial/security / frontier / dual review | P0 | Yes |
| P2 — Minimum verifier compatibility and canon freeze | Frozen mapping among Evidence Pack, Runtime producer receipts, Ledgerline candidates, `Keon.Cli verify-pack`, mandatory fixtures, and every required canon/claims/proof amendment or explicit non-equivalence stop | One decision-ready, buildable verifier gate without a duplicate CLI | Architecture/security / frontier / dual review | P0 | No for Review; yes for verified Sprint |
| P3A — Commercial state-machine contract | Freeze website intent, qualification, approval, Stripe truth, Neon state, intake, fulfillment, delivery, refund, retention, and audit transitions without implementing them all together | One cross-surface contract and negative-path matrix | Billing/security / frontier / dual review | P0, P1 | Yes |
| P3B — Commercial persistence slice | Implement only the approved Neon commercial-state persistence and migrations, excluding raw evidence and key custody | Durable, minimal engagement state with migration and access evidence | Data/security / frontier / dual review | P3A | Yes |
| P3C — Billing and refund slice | Implement Stripe test Checkout, signed replay-safe webhook handling, idempotent state transitions, refund/dispute handling, and test/live separation | Payment truth cannot be inferred from redirects or duplicate events | Billing/security / frontier / dual review | P3A, P3B | Yes |
| P3D — Intake, fulfillment, and delivery slice | Implement the bounded secure-intake invitation, analyst/human approval gates, manual fulfillment state, delivery acknowledgement, and retention/deletion actions | The Review can be fulfilled without raw-evidence custody or autonomous customer-visible conclusions | Security/operations / frontier / dual review | P3A, P3B | Yes |
| P3E — Safe paid-path integration acceptance | Exercise the P3B/P3C/P3D boundaries in the required test environment and produce G4 evidence without enabling live payment | One environment-specific release decision packet | Integration/security / frontier / dual review | P3B, P3C, P3D, P4 | Yes |
| P4 — Review rehearsal | Run one sanitized end-to-end Review rehearsal and produce the exact internal delivery evidence | Proof that the service can be delivered within scope and time | Standard feature / independent review | P1 | Yes |
| P5 — Verifier gap implementation | Only the exact code, fixtures, and approved registry changes P2 identifies as missing from the minimum gate | Existing verifier passes every mandatory positive and negative fixture | Architecture/security / frontier / dual review | P2 | No for Review; yes for verified Sprint |
| P6 — Sprint rehearsal | Execute one representative Review finding through one selected Sprint lane into a real, independently verified Evidence Pack | Evidence that the implementation engagement is deliverable | Integration/security / frontier / dual review | P2, P4, P5 | No for first Review revenue |
| P7 — Direct-motion preparation | Research 25 named accounts/contacts, rank 10 qualified prospects, and prepare personalized ask/follow-up language for approval; send nothing | KPM-06 is approval-ready without creating a second campaign | Commercial/research / independent review | P0, P1 | Yes |
| H0 — Packet and owner approval | Named decision, claims, legal/privacy, and security owners approve or amend the P1/KPM-03 packet | G2 prerequisite is human-owned and explicit | Human gate | P1 | Yes |
| H1 — Direct-motion approval | Decision owner approves the P7 prospect set and outbound language; G2 is recorded only when all prerequisites pass | Customer contact remains explicitly authorized | Human gate | P7, H0 | Yes |
| H2 — Direct motion | Send 10 approved personalized asks and complete or schedule two follow-up cycles through KEO-145/KPM-07 | Real market motion, never simulated outreach | External human action | H1 | Yes |
| H3 — Response and discovery handling | Triage every response within two business days and run qualified discovery/proof-review calls; accept no payment in this milestone | KPM-08 preserves human/customer gates without making G4 a prerequisite for learning | External human action | H2 | Yes |
| H4 — Paid engagement or qualified-negative close | On the paid branch, require P3E/G4 before accepting payment, then record delivery and KPM-09 evidence; on the negative branch, close only after the exact activity threshold and keep/change/kill decision | The experiment reaches a truthful paid or qualified-negative outcome | Human decision | H3; P3E/G4 on paid branch only | Yes |
| BA1 — KEO-197 contract freeze | After P0 explicitly amends the existing initiative scope, freeze the WAAA-backed domain/path slop-squatting contract, taxonomy mapping, hostile fixtures, and expected outcomes already bounded by `KEO-197` | Implementation-ready BrowseAhead contract without a duplicate issue | Research/spec / frontier review | P0; capacity only | No |
| BA2 — KEO-197 bounded detector | Implement and prove the frozen fail-closed pre-network behavior under `KEO-197` | Tested BrowseAhead finding with provenance and no authority over execution | Architecture/security / frontier / dual review | BA1; capacity only | No |

## Dependency order

```text
Gate 1 -> P0
P0V -> P0 Gate 3 (verification prerequisite only)
P0 -> P1, P2, BA1
P1 -> P3A, P4, P7, H0
P3A -> P3B
P3B -> P3C, P3D
P3C + P3D + P4 -> P3E -> G4
P7 + H0 -> H1 -> H2 -> H3 -> H4
P3E/G4 -> H4 (paid branch only)
P2 -> P5
P2 + P4 + P5 -> P6 -> verified Sprint readiness
BA1 -> BA2

BrowseAhead has no edge into P0-P6.
P2/P5/P6 have no edge into first Review revenue.
H0-H4 are not covered by standing dispatch authorization.
```

## Exit criterion

The goal is complete only when all of the following are true:

1. The existing Keon initiative and Linear state contain the ratified portfolio
   priority and one dependency graph.
2. The Review-to-Sprint packaging has been exercised with a real or sanitized
   representative scope and does not imply an automatic quote or commitment.
3. Before any payment is accepted, P1, P3A-P3E, and P4 have produced the
   required approval, rehearsal, environment-specific integration, security,
   and G4 evidence. A qualified-negative experiment close does not require
   payment-path enablement.
4. The Workflow Evidence Review has earned at least one verified safe paid
   transaction and its human-approved delivery evidence is recorded, or the
   experiment closes as a valid negative only after all of these are evidenced:
   25 named accounts/contacts researched; 10 qualified prospects prioritized;
   10 approved personalized asks sent; two follow-up cycles completed or
   scheduled for non-responders; every response triaged within two business
   days; every qualified-opportunity record complete; and a recorded
   keep/change/kill decision.
5. P2 has frozen the minimum verifier compatibility contract and all required
   canon/claims/proof dispositions. P2 cannot be deferred. P5 implementation
   may be deferred only with every affected Sprint claim and lane blocked.
6. A representative Sprint rehearsal produces a real verified artifact if and
   only if the verifier gate passes.
7. BrowseAhead has consumed no revenue-critical dependency capacity and its
   bounded lane is either shipped, deliberately deferred, or closed as
   non-applicable.
8. All required security and release gates, session handoffs, evidence indexes,
   PRs, and Stage F closures are complete.

## Standing authorizations

1. **Gate 2 — dispatch: GRANTED.** Standing authorization applies exactly to
   P0-P2, P3A-P3E, P4-P7, and BA1-BA2 in the dependency order above. A later
   parcel-specific authorization also applies to P0V before P0 Gate 3. All are
   subject to exact Allowed Files, isolated worktrees, and each parcel's Step 0
   restate-and-stop gate. H0-H4 are never covered by Gate 2.
2. **Gate 3 — merge: WITHHELD.** Each named parcel must return after its
   complete deterministic and adversarial verification chain is green and all
   host checks and branch rules are verified live. Parcel evidence authorizes a
   merge decision request; it does not authorize the merge. Any red, unknown,
   skipped mandatory check, disputed finding, or scope amendment keeps the
   parcel on hold.
3. **External actions: NOT GRANTED.** Customer outreach, public publication,
   payment enablement, invoices, legal acceptance, production deployment, and
   customer-data handling always stop for explicit approval.

## Stop conditions

Stop and return to the decision owner when:

- a proposed change conflicts with the claims or packaging registry;
- Review-first versus Sprint-first commercial sequencing changes;
- a new verifier executable appears necessary;
- the Ledgerline draft, existing Evidence Pack contract, and Runtime producer
  contract cannot be reconciled without a product or canon decision;
- a mandatory verifier check would remain SKIP;
- implementation would touch a dirty shared checkout;
- a parcel requires files outside its exact Allowed Files;
- a public/customer claim outruns proof;
- a security, billing, legal, IP, or production-data boundary is unclear;
- BrowseAhead work would delay a revenue-critical parcel;
- live Linear state contradicts the local initiative record;
- a tripwire fires twice on the same parcel; or
- any outward-facing action lacks explicit authorization.

## Gate 1 closure

Gate 1 is closed. D1-D9, the amended decomposition, the dependency graph, the
exit criterion, and the Gate 2 scope were explicitly ratified on 2026-07-29.
Any later change reopens Gate 1 only for the affected decision and downstream
work. No external-action authorization is inferred for H0-H4.
