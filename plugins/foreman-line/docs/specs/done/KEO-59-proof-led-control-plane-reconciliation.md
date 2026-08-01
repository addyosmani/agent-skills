---
ticket: KEO-59
title: Keon proof-led control-plane reconciliation (P0)
status: done
owner: clint.morgan
created: 2026-07-29
updated: 2026-07-29
supersedes: null
risk: elevated
surfaces:
  - docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md
  - docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md
routing_class: architecture/risk
permission_profile: builder-standard
data_classification: internal
---

# KEO-59 — Proof-Led Control-Plane Reconciliation (P0)

## Intent

Reconcile the ratified Keon Proof-Led Portfolio Priority into the existing
`keon-proof-led-commercial-entry` initiative and KEO-59 execution tracker as a
dated, additive amendment. Establish one authoritative dependency graph and
record the bounded KEO-197 BrowseAhead lane without creating a second control
plane, backlog, initiative, claim, or product authority.

This parcel records decisions and current live mappings. It does not implement
commercial, verifier, or BrowseAhead behavior.

## Constraints

1. Work from the current `keon-docs` `origin/main` in one clean, isolated
   worktree and one parcel branch. Do not edit a dirty shared checkout.
2. Preserve the existing historical D0-1 through D0-5 record. Add a dated
   amendment; do not rewrite history.
3. Record D1-D9 below verbatim. The builder may add formatting or mapping
   columns, but may not paraphrase, weaken, or broaden a decision:
   - **D1:** `keon-proof-led-commercial-entry` and KEO-59 remain the sole initiative and commercial parent. Foreman Line is the execution method, not a parallel control plane.
   - **D2:** The $2,500 Workflow Evidence Review is the first paid transaction. The $9,500 Evidence Pack Sprint is the first implementation engagement and is offered only after a Review identifies an approved, bounded remediation lane.
   - **D3:** No second `llverify` executable is created by default. “Minimum `llverify` gate” means a frozen, tested compatibility subset implemented through the existing `Keon.Cli verify-pack` unless the reconciliation parcel proves a distinct executable is necessary. Customer language remains “offline verifier.”
   - **D4:** The Review may reach G2/G3/G4 and earn first revenue without Ledgerline canonization. A Sprint lane that promises a real independently verified Evidence Pack cannot be sold or delivered until its applicable verifier gate passes.
   - **D5:** The minimum verifier gate is fail-closed and fixture-backed: version/schema recognition; deterministic JCS/SHA-256 recomputation; complete listed-artifact coverage; Ed25519 signature and trusted-key checks; tenant and identity consistency; monotonic, gap-free receipt-chain validation; authorization-to-completion binding for the same operation and request fingerprint; explicit completeness/seal status; negative fixtures for every mandatory failure; stable machine-readable output and non-zero failure codes. Mandatory checks may not report SKIP.
   - **D6:** BrowseAhead has WIP limit one. It runs only from capacity not needed to clear a revenue-critical blocker, and no BrowseAhead parcel may become a dependency of Review launch, Sprint packaging, verifier freeze, payment, fulfillment, or delivery.
   - **D7:** Reuse `KEO-197` as the sole BrowseAhead slop-squatting lane. First freeze its domain/path slop-squatting contract and hostile fixtures; then implement only that bounded, fail-closed pre-network behavior. Foreman parcels may sequence the work, but no duplicate Linear issue is created.
   - **D8:** All Keon implementation occurs in one parcel/branch/worktree per repo from current `origin/main`, with exact Allowed Files. Dirty shared checkouts remain untouched. Architecture, verifier, security, billing, and public-claim parcels receive two independent adversarial reviews.
   - **D9:** No customer contact, public claim, payment enablement, invoice creation, legal approval, or production-data handling is inferred from this charter. Those remain explicit human/outward-facing gates under the existing initiative.
4. Record that D1-D9, the amended parcel decomposition, dependency graph, and
   exit criterion were explicitly re-ratified on 2026-07-29.
5. Record Gate 2 standing dispatch authorization exactly for P0-P2, P3A-P3E,
   P4-P7, and BA1-BA2, subject to dependency order, exact Allowed Files,
   isolated worktrees, and Step 0 restate-and-stop gates.
6. Record that Gate 3 standing merge authorization is withheld pending each
   parcel's complete deterministic and adversarial evidence. Parcel evidence
   permits a merge-decision request only.
7. Record H0-H4 as human/external milestones outside Gate 2. Do not infer
   authorization for outreach, publication, payment enablement, invoices,
   legal acceptance, production deployment, or customer-data handling.
8. Reconcile the existing live Linear mapping without mutating Linear:
   - KEO-59 — sole commercial parent; In Progress.
   - KEO-155 — Review/Sprint packaging closure; In Progress.
   - KEO-156 — minimum verifier compatibility and canon freeze; Todo.
   - KEO-158 — commercial state-machine and paid-path work; Todo.
   - KEO-159 — Review rehearsal; Todo.
   - KEO-160 — verifier gap implementation; Todo.
   - KEO-161 — Sprint rehearsal; Todo.
   - KEO-54 — direct-motion preparation and experiment; Todo.
   - KEO-197 — sole bounded BrowseAhead slop-squatting lane; Todo.
   - KEO-153 — existing commercial-entry initiative execution; In Progress.
9. The reconciliation may describe child parcel boundaries under existing
   issues, but it may not create a local backlog or assert that new Linear
   children already exist.
10. Explicitly authorize BA1/BA2 sequencing under D6/D7 while keeping
    BrowseAhead WIP at one and off every first-revenue dependency path.
11. Preserve the current commercial truth: G2 remains blocked and payment
    remains NO-GO. Do not advance a gate, status, claim, or readiness state.
12. Claims and packaging registries are authoritative and untouched by P0.
    Any conflict is a stop condition.

## Acceptance Criteria

1. The branch diff contains exactly the two Allowed Files in this spec.
2. `CHARTER.md` contains an additive, dated portfolio-priority amendment that:
   - preserves D0-1 through D0-5;
   - records the re-ratification, decision owner, Gate 2 scope, Gate 3 hold,
     and external-action boundary;
   - contains D1-D9 verbatim;
   - defines P0-P2, P3A-P3E, P4-P7, H0-H4, and BA1-BA2 at sufficient fidelity
     to preserve product, ownership, risk, dependency, and revenue-blocking
     distinctions; and
   - records the amended exit criterion without converting a qualified-negative
     close into a paid-path success.
3. `EXECUTION-TRACKER.md` contains a matching dated decision/amendment,
   dependency graph, parcel/milestone state, live Linear mapping, and an
   evidence/handoff summary. No separate handoff or index file is created.
4. The charter and tracker use this exact dependency graph:

   ```text
   Gate 1 -> P0
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
   ```

   Both files also state that BrowseAhead has no edge into P0-P6,
   P2/P5/P6 have no edge into first Review revenue, and H0-H4 are not covered
   by standing dispatch authorization.
5. The amended exit criterion states all of the following:
   - existing initiative and Linear state carry one ratified priority and graph;
   - Review-to-Sprint packaging is rehearsed and implies no automatic quote;
   - P1, P3A-P3E, P4, and the required human approvals precede payment;
   - the Review records either one verified safe paid transaction and delivery
     evidence, or a qualified-negative close only after 25 named
     accounts/contacts researched, 10 qualified prospects prioritized,
     10 approved personalized asks sent, two follow-up cycles completed or
     scheduled, two-business-day response triage, complete qualified
     opportunity records, and a recorded keep/change/kill decision;
   - P2 is mandatory; P5 may be deferred only by blocking every affected
     Sprint claim and lane;
   - a representative Sprint produces a real verified artifact only when the
     verifier gate passes;
   - BrowseAhead did not consume revenue-critical dependency capacity; and
   - all required gates, evidence, PR, handoff, and Stage F closure remain due.
6. The current Linear statuses and roles listed under Constraints are recorded
   as a dated reconciliation snapshot, not silently advanced.
7. D1-D9 are exact, the dependency table agrees with the graph, and no text
   implies a new `llverify`, automatic Sprint sale, certification, autonomous
   customer-facing conclusion, or live-payment authority.
8. `canon/claims/PACKAGING_REGISTRY.yaml` and
   `canon/claims/CLAIMS_REGISTRY.yaml` have zero diff from `origin/main`.
9. Repository claim validation passes and the final diff has no whitespace
   errors.
10. Two independent adversarial reviewers return no unresolved blocking
    finding. Review focus is mandatory:
    - D1-D9 wording is exact and unweakened;
    - graph and parcel/milestone tables agree;
    - no claim, payment state, or gate was advanced;
    - BrowseAhead remains bounded and absent from first-revenue dependencies;
    - only the two Allowed Files changed and D0-1 through D0-5 remain intact.

## Out of Scope

- Editing claims, packaging, proof, product, or Ledgerline registries or canon.
- Creating a new initiative, directive, tracker, index, handoff, or local
  backlog in `keon-docs`.
- Creating, updating, moving, closing, or commenting on Linear issues.
- Implementing P1-P7, BA1, BA2, H0-H4, verifier behavior, commercial behavior,
  website behavior, billing, outreach, or production deployment.
- Creating a second `llverify` executable or changing customer-facing claims.
- Advancing G2, G3, G4, payment readiness, public readiness, or any Linear
  status.
- Editing any file outside the Allowed Files section.

## Context & References

- Ratified source:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/charter.md`
- Plan-review closure:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/plan-review-findings.md`
- Coordinator loop:
  `D:/Repos/agent-skills/plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/loop-directive.md`
- Existing initiative authority:
  `docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md`
- Existing execution authority:
  `docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md`
- Packaging authority: `canon/claims/PACKAGING_REGISTRY.yaml`
- Claims authority: `canon/claims/CLAIMS_REGISTRY.yaml`

## Allowed Files

- `docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md`
- `docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md`

## Verification Plan

Run from the isolated `keon-docs` parcel worktree:

```powershell
rtk git ls-remote origin refs/heads/main
rtk git rev-parse origin/main
rtk git status --short --branch
rtk git diff --name-only origin/main...HEAD
rtk git diff --check origin/main...HEAD -- docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md
rtk git diff --exit-code origin/main...HEAD -- canon/claims/PACKAGING_REGISTRY.yaml canon/claims/CLAIMS_REGISTRY.yaml
rtk npm run claims:check
```

Also compare every D1-D9 sentence, dependency edge, exit threshold, live Linear
mapping, and authorization boundary against the ratified source before
requesting Gate 3.
