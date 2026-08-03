# Discovery — Keon Proof-Led Portfolio Priority

**Status:** Grounded draft for Foreman Line Stage Zero
**Observed:** 2026-07-29
**Coordinator:** Primary Codex session designated by Clint Morgan
**Mode:** Multi-Project Initiative

## Purpose

Ground the portfolio-priority directive in current repository evidence before
proposing a Gate 1 charter. This document is a discovery record, not a new Keon
control plane and not authorization to implement, publish, sell, invoice, or
merge.

## Existing authority

The existing Keon control plane remains authoritative:

- `keon-docs/docs/INITIATIVES/keon-proof-led-commercial-entry/CHARTER.md`
- `keon-docs/docs/INITIATIVES/keon-proof-led-commercial-entry/EXECUTION-TRACKER.md`
- Linear parent `KEO-59`
- `keon-docs/canon/claims/CLAIMS_REGISTRY.yaml`
- `keon-docs/canon/claims/PACKAGING_REGISTRY.yaml`

The existing charter was ratified on 2026-07-17. Gate 0 and Gate 1 are recorded
as validated. Gate 2 is recorded as blocked on explicit approval of the
procurement packet and KPM-06. Public launch, payment acceptance, customer
commitments, and new Runtime/Gateway implementation remain blocked by that
control plane.

The Foreman Line goal must amend and execute that initiative. It must not create
a parallel offer, claims ledger, outreach campaign, Linear parent, or initiative
state authority.

## Commercial packaging observed

`PACKAGING_REGISTRY.yaml` already establishes the intended two-stage funnel:

1. `SVC-WORKFLOW-EVIDENCE-REVIEW`
   - pre-launch;
   - $2,500 prepaid;
   - one workflow and one consequential action;
   - assessment only;
   - does not create or certify an Evidence Pack.
2. `SVC-EVIDENCE-PACK-SPRINT`
   - pre-launch;
   - $9,500 with a $4,750 manually approved invoice deposit;
   - qualified follow-on to the Review;
   - never instant checkout;
   - produces a real Evidence Pack only when the selected implementation lane
     and verifier requirements are satisfied.

This is materially better defined than the earlier portfolio discussion
assumed. The implementation plan should close and exercise this packaging, not
redesign it without evidence.

## Ledgerline and verifier truth

The private `Keon-Systems/keon-ledgerline` repository exists. Its current
`CANONICAL-SOURCE-STATUS.md` says:

- draft for review;
- non-public and non-canonized;
- no production Runtime, Gateway, verifier, or schema implementation may be
  driven from it;
- it does not implement or replace `Keon.Cli verify-pack`;
- canonization requires contract reconciliation, negative fixtures, claims and
  proof registration, governance review, and IP review.

The `keon-systems` repository already contains:

- `Keon.Cli verify-pack`;
- JCS canonicalization and SHA-256 integrity checks;
- Ed25519 attestation verification;
- receipt-chain, tenant, trust-bundle, key-state, and authorization checks;
- structured exit codes and negative security tests;
- an authoritative internal L3 output contract.

Known limitations include:

- `--bundle` embedded-trust extraction is not wired;
- several L3 artifact checks are explicitly skipped pending WS-D;
- exported verification-proof fields contain placeholders;
- the current Evidence Pack contract is not yet reconciled as equivalent to the
  Ledgerline draft's four-record and seal semantics.

`keon.runtime.producer.v2` merged to `keon-systems/main` on 2026-07-28 in PR
#172. It provides signed authorization/completion receipts with operation,
identity, request-fingerprint, tenant, and retry binding. It is implementation
evidence to reconcile, not automatic proof of Ledgerline compatibility.

Conclusion: the minimum `llverify` gate should first define and freeze the
required subset against `Keon.Cli verify-pack`. A second verifier executable is
presumptively rejected unless reconciliation proves a non-overlapping need.
Public and customer language remains “offline verifier.”

## BrowseAhead truth

`keon-mcp-gateway/main` contains the bounded
`keon.browseahead.scan.v1` raw-content inspection path, deterministic findings,
sanitized and forensic bundle shapes, risk receipts, policy signals, and
authorization-scoped HTTP tests.

Current boundaries include:

- no live URL fetching;
- no rendered-DOM/browser automation;
- no proof of a complete pre-cognition context-admission boundary;
- an in-memory forensic sink;
- no source or test currently implements the domain/path slop-squatting contract
  now recorded in Linear.

Live Linear resolves the user's “squatting hole” wording to domain/path
slop-squatting before agent navigation. `KEO-197` was created on 2026-07-29
under BrowseAhead parent `KEO-147`, cites WAAA SQ-1/SQ-2, and already specifies
lookalike-domain, invented-path, IDN/homograph, deceptive-subdomain, and redirect
fixtures plus fail-closed pre-network acceptance. This is the canonical backlog
item. Foreman Line must reuse `KEO-197`; it must not create a duplicate issue.

## Repository snapshot

| Repo | Observed authoritative ref | Working-tree note | Initiative role |
|---|---|---|---|
| `keon-docs` | `origin/main` = `807f01b` | User-owned unrelated modifications and drafts present; do not edit this checkout | Canon, packaging, existing initiative control plane |
| `keon-systems-web` | `origin/main` = `afaa720` | Local checkout is behind and has a user-owned `.serena` modification | Review sales/delivery surface and payment gate |
| `keon-mcp-gateway` | `origin/main` = `39769d2` | User-owned `.serena` modification | Bounded BrowseAhead lane |
| `keon-systems` | `origin/main` = `50895fa` | User-owned `.serena` modification | Existing verifier and Runtime receipt producer |
| `keon-ledgerline` | private GitHub repo, `main` | Not cloned locally | Draft receipt-schema source under review |

All implementation must use isolated worktrees from the current authoritative
base. Existing dirty checkouts are discovery-only.

## Live Linear reconciliation

Linear was verified live on 2026-07-29.

| Issue | Live status | Role in this goal |
|---|---|---|
| `KEO-59` | In Progress / High | Sole commercial parent |
| `KEO-155` | In Progress / High | Existing commercial coordination child |
| `KEO-156` | Todo / High | Method, deliverables, schema, bundle, and verifier preflight |
| `KEO-158` | Todo / High | Website, Stripe, Neon, and paid path |
| `KEO-159` | Todo / High | Automation and human-gate design |
| `KEO-160` | Todo / Medium | Evidence Pack Sprint lanes and $9,500 evaluation target |
| `KEO-161` | Todo / High | First-three-customer validation |
| `KEO-54` | Todo / High | Offline open-source verifier build status and `llverify` contract |
| `KEO-145` | Todo / Urgent | Existing customer-discovery motion; no duplicate campaign |
| `KEO-153` | In Progress / Urgent | BrowseAhead implementation lane |
| `KEO-197` | Todo / High | Domain/path slop-squatting before agent navigation |

No issue titled “Keon Proof-Led Portfolio Priority” exists. No duplicate
portfolio parent should be created: ratified work belongs in `KEO-59`, its
existing children, `KEO-54`, and `KEO-197`.

A 2026-07-28 comment on `KEO-59` records legal approval to proceed, removing
the legal go/no-go hold on the first paid Review. A second comment makes clear
that this is not public-launch authorization: claims, fulfillment, payment, and
remaining security/legal ownership gates must still pass. The Linear initiative
control document still describes the earlier legal hold and is stale; P0 should
update it only after Gate 1 ratification.

## Stage Zero conflicts requiring Gate 1

1. Whether “first wedge” means the first paid transaction (the Review) or the
   first implementation engagement (the Sprint).
2. Whether the minimum verifier gate is satisfied by a frozen subset of the
   existing `Keon.Cli verify-pack`, as recommended, or requires a distinct
   `llverify` implementation.
3. Whether the Review may launch before the verifier subset is frozen, while the
   Sprint remains verifier-gated.
4. The exact standing authorization for parcel dispatch and merge.
