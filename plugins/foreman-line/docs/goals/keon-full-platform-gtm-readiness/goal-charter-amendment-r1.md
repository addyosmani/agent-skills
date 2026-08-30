# Goal-Charter Corrective Amendment — GTM-R1

**Status:** RATIFIED 2026-08-18 — FOLLOW-UP REVIEW PASS
**Goal:** `keon-full-platform-gtm-readiness`
**Decision owner:** Clint Morgan
**Source:** Mandatory plan-level adversarial review dated 2026-08-18

If ratified, this amendment controls wherever it conflicts with the original
charter. Unaffected decisions remain ratified.

## Decision amendments

| ID | Revision 1 replacement | Consequence |
|---|---|---|
| D3-R1 | KPP-001-A/KEO-59 remains the exclusive control plane for the Workflow Evidence Review, Evidence Pack Sprint, customer motion, payment sequencing, and their owned site/fulfillment artifacts. This umbrella may consume a versioned status receipt and surface a conflict, but may not dispatch, amend, close, or mutate any KPP-owned item. Ratified KPP sequencing controls over conflicting stale operational text until that text is amended through KPP authority. | No umbrella Gate 2 authority crosses the KPP boundary; any amendment requires that goal's coordinator and ratification path. |
| D4-R1 | Authority is assigned by responsibility: pinned repository/test evidence governs implementation fact; `PACKAGING_REGISTRY.yaml` governs package/service identity, dependencies, and saleability; ratified directives govern sequencing and commercial decisions; `CLAIMS_REGISTRY.yaml` governs registered external wording, strength, and allowed surfaces; `PROOF_MAP.yaml` governs proof routing, not currency; KEO-167/the Capability Registry is a versioned synthesis of implementation classification; Evidence Ledger v1.2 governs dated technical eligibility for external use; Core/dossiers/pages/media are downstream consumers. Conflict, missing join, stale evidence, or missing required negative proof yields hold/No. | KEO-167 cannot overwrite canon, and a registry label cannot substitute for current verification. |
| D7-R1 | The active `provisional-patent-readiness` goal exclusively owns patent-source custody, mechanism reconciliation, filing-package assembly, and filing-readiness evidence. Its Hard Rule Zero and preservation rules control until amended in that goal. Umbrella W5 is limited to read-only child-status consumption, chain-of-title/counsel coordination, and artifact-specific application-surface disclosure mapping. No category such as `low-detail` is a legal safe harbor. | No patent/doctrine source mutation or disclosure relaxation occurs through GTM authority. Every outward artifact still needs exact-surface clearance. |

## Existing-child authority firewalls

| Child authority | Exclusive ownership | Umbrella interface |
|---|---|---|
| `keon-proof-led-portfolio-priority` / KPP-001-A / KEO-59 | Review/Sprint commercial execution, customer motion, payment path, owned commercial artifacts | Read-only status receipt; conflicts held for child coordinator |
| `provisional-patent-readiness` | Patent custody, mechanisms, filing corpus, filing-readiness evidence | Read-only readiness/disclosure inputs; no source mutation |
| `keon-creative-foundation-v1` | Flagship master, claim map, derivative matrix, media production and publication gate | Read-only release receipt and missing-gate status; no second derivatives plan |

No ownership transfer is inferred. A transfer requires an explicit parcel-boundary
handoff recorded by both control planes.

## Source, evidence, and release contracts

### Frozen coverage denominator

Before capability or application work, P0B must freeze a versioned coverage
manifest containing:

- canonical package and service IDs;
- stable capability and external-claim IDs;
- owning repositories and pinned source revisions;
- public routes and media surfaces;
- selected application programs;
- integration contracts and scenarios;
- exact child-control-plane interfaces;
- explicit exclusions, rationale, owner, and required final disposition.

Every later addition increments the manifest version and records dependency
impact. Automated crosswalk acceptance must reject missing, orphaned, or
duplicate IDs across the manifest, Capability Registry, packaging registry,
claims registry, proof map, Evidence Ledger, Core, dossiers, and public
surfaces.

### Orthogonal state model

Each capability or claim records separate axes for:

1. implementation maturity;
2. verification state and evidence expiry;
3. deployed/live environment;
4. commercial availability;
5. disclosure class;
6. technical claim eligibility; and
7. artifact/surface release clearance.

Every Evidence Ledger row references canonical claim IDs or is explicitly
`internal_only`. Unsupported evidence deterministically yields technical `No`.
Surface release clearance defaults to `No` and never derives from technical
eligibility alone.

Controlled artifact states are `draft`, `verified-local`, `review-accepted`,
`approval-ready`, `merge-authorized`, `merged`, `deployed`, `live-verified`,
`founder-approved`, `sent-to-counsel`, `counsel-cleared-for-named-surface`,
`submission-ready`, `submitted`, `prepared-but-stale`, and `held`. Unqualified
`ready`, `approved`, or `accepted` is prohibited.

### Human and legal records

- The founder-facts register uses stable IDs, source, factual owner,
  observation date, expiry, exact allowed wording, limitations, and explicit
  `none`/`unknown` values. Paid traction requires verified payment evidence.
- Each counsel clearance is keyed to exact artifact hash/version, claim IDs,
  audience, channel/program, terms snapshot, permitted wording, prohibited
  detail, conditions, approval date, expiration/re-review trigger, counsel
  identity, and founder acceptance.
- Program terms receive a dated pre-submission clearance and, if selected, a
  separate post-selection/pre-acceptance clearance. A named human approves
  submission-time eligibility facts.
- Negative checks reject outward self-certification such as `patent-safe`,
  `approved for submission`, or presumed `confidential portal` status.

## Amended waves and dependencies

W0-W8 are **coordination waves only and are never directly dispatchable**.
Every post-P0 child must be shaped and separately ratified or explicitly
approved with one owner, one repository or integration-only boundary, pinned
base, exact Allowed and Forbidden Files, deterministic acceptance, review
route, and return evidence.

Two evidence lanes prevent an obscure capability from blocking the first
application wave:

1. **Application-critical lane:** only the complete claim/fact subset actually
   needed for the shared Core and Microsoft/AWS/NVIDIA dossiers.
2. **Full-portfolio lane:** every remaining in-scope package, service, route,
   integration, and media surface receives a verified or held disposition.

No claim may enter a dossier merely because it is outside the first subset.
Full-goal exit still requires the full-portfolio lane.

```text
Revision 1 ratification -> follow-up PASS -> P0A -> P0B -> P0C
P0C -> separately ratified application-critical and full-portfolio parcels
application-critical capability evidence -> technical ledger eligibility
technical eligibility + founder facts + artifact-specific H2 clearance -> W6b dossier clearance
W1 scope disposition -> W8A package/surface readiness-or-hold receipt
W8A receipt + technical eligibility + required H2 clearance -> bounded W7 surface candidate
W7 candidate + security/privacy + integration + release gates -> H3 external execution

KPP, patent, and KCF child graphs remain independently controlling.
```

W6 is split into internal draft (`W6a`) and artifact-specific founder/counsel
clearance (`W6b`). W7 is decomposed into separate per-package, per-route,
pitch, demo, flagship-release, and derivative-consumption parcels. W8A is a
readiness-or-hold assessment; W8B implementation work requires independent,
separately ratified product initiatives.

Security/privacy, integration, and release applicability is recorded as Pass,
Fail, or evidence-backed N/A, never omitted. Required gates cover data and
threat classification, authentication/authorization, tenant isolation,
secret/key handling, dependency findings, negative cases, pinned cross-product
scenarios, contract/conformance tests, target environment, build and route/E2E
checks, observability, rollback, support/runbooks, and authorized live
verification.

## Amended exit criterion

`agent-preparation-complete` is a precise intermediate state, not goal
completion. It requires all internally preparable evidence, drafts, owner
questionnaires, counsel packets, security/integration/release packets, and
external-action runbooks to be review-accepted.

Full goal completion additionally requires:

1. every frozen-manifest item has a verified or owner-approved held disposition
   that removes every affected availability, application, and release claim;
2. all mandatory internal legal prerequisites for any item labeled saleable or
   submission-ready are complete: employment/contributor determination,
   chain-of-title treatment, required executed assignment/license, disclosure
   classification, filing decision, Core clearance, program-terms clearance,
   and commercial-template clearance;
3. application Evidence Ledger rows are complete, lint-clean, current for the
   intended use, and surface clearance is separately recorded;
4. each selected program dossier is founder-approved, human eligibility-signed,
   counsel-cleared for that exact artifact and terms snapshot, and submitted
   only under H3 authority;
5. every selected public/product/media release has its W8A readiness receipt,
   applicable cross-cutting gates, child-control-plane release receipt, and
   authorized live verification; and
6. KPP, patent, and KCF child state is truthfully reflected without the umbrella
   claiming their completion.

Deferral of a mandatory legal or release gate leaves the affected item held and
the full goal active. Removing a selected program, product, service, or external
action from the completion denominator requires an explicit decision-owner
scope amendment; silent deferral is not completion.

## Revision 1 Gate 2 matrix

Gate 2 is granted only for the following internal control-plane parcels after
Revision 1 ratification and a fresh follow-up PASS. Parcel-local commits in
their isolated `agent-skills` worktree are authorized solely as return evidence.
Gate 3 remains withheld for integration.

| Parcel | Repo / output boundary | Exact purpose | Depends on |
|---|---|---|---|
| GTM-P0A | Isolated `agent-skills` worktree; goal directory only | Reproduce and pin `charter.md`, `discovery.md`, this amendment, review findings, and a loop directive from the selected clean local base; record hashes and local commit; no push/PR/merge | Follow-up PASS |
| GTM-P0B | Same goal directory; `coverage-manifest.yaml`, `source-precedence.md`, `artifact-status-model.md`, `evidence-crosswalk-contract.md` only | Freeze scope denominator, authority precedence, orthogonal states, freshness, and lintable joins | P0A accepted |
| GTM-P0C | Same goal directory; `child-authority-status.md`, `linear-disposition-proposal.md`, `founder-facts-contract.md`, `counsel-clearance-contract.md` only | Freeze child interfaces, local-only duplicate proposals, and exact human/legal input-output contracts | P0B accepted |

No standing Gate 2 authority applies to W1-W8 product, evidence, application,
website, media, patent, KPP, Linear, or external work. Those items remain
shaping/proposal-only until separately ratified or explicitly approved.

## Authority boundaries

- **Gate 2:** granted but not operable until follow-up review passes; then
  limited exactly to GTM-P0A-P0C. It authorizes parcel-local commits solely in
  their named isolated `agent-skills` worktree as return evidence.
- **Gate 3:** withheld for cherry-pick or other integration into a target
  branch, push, PR, merge, release, deployment, publication, or equivalent
  integration action.
- **External actions:** withheld, including Linear mutation, outreach, counsel
  acceptance, filing, submission, publication, payment, production deployment,
  and customer-data handling.

## Gate 1 scope

Gate 1 was reopened only for D3-R1, D4-R1, D7-R1, the child-authority
firewalls, coverage/evidence/release contracts, amended dependency graph,
amended exit criterion, and Revision 1 Gate 2 matrix.

## Ratification record

On 2026-08-18, Clint Morgan explicitly ratified D3-R1, D4-R1, D7-R1, the
child-authority firewalls, coverage/evidence/release contracts, amended
dependency graph and exit criterion, and Gate 2 only for GTM-P0A through
GTM-P0C. Gate 3 and all external actions remain withheld. No parcel is
dispatchable until the fresh follow-up plan review returns PASS.

Two fresh follow-up reviewers returned PASS after the authority wording was
clarified to permit isolated parcel-local evidence commits under Gate 2 while
withholding every Gate 3 integration and external action. GTM-P0A is the only
dependency-unlocked parcel.
