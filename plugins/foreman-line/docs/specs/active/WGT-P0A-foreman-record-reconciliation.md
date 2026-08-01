---
ticket: WGT-P0A
title: Foreman record reconciliation
status: active
owner: clinton.morgan
created: 2026-08-01
updated: 2026-08-01
supersedes: null
superseded_by: null
risk: elevated
surfaces:
  - plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/charter.md
  - plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/loop-directive.md
  - plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/*findings.md
  - plugins/foreman-line/docs/transcripts/*handoff.md
routing_class: architecture/risk
data_classification: internal
---

# WGT-P0A — Foreman record reconciliation

## Intent

Reconcile the durable Foreman goal records to the verified post-bootstrap state
and the live Website GTM queue. This is a control-plane/documentation parcel;
it does not change Foreman product behavior, the plugin source, package
metadata, tests, or any external control record. The output must leave the next
safe action unambiguous: WGT-P0B in a separate `keon-docs` worktree, followed by
WGT-P0C Linear reconciliation only after P0B is independently verified.

## Constraints

- Base is exactly fresh `origin/main` at `714ac657ded62d5a549428d06574fcb710ecc481`.
- The parcel branch is `codex/wgt-p0a-foreman-reconciliation-20260801` and the
  worktree is `D:/Repos/agent-skills-worktrees/wgt-p0a-foreman-reconciliation-20260801`.
- WGT-P0BOOT is complete: PR #4 merged at
  `48d1db73ad0a6e9c2d9bd76f92f3a44d9fb7fcf0`; closeout PR #5 merged at
  `714ac657ded62d5a549428d06574fcb710ecc481`; the plugin is tracked under
  `plugins/foreman-line`; the completed spec is under `docs/specs/done`.
- WGT-A1 through WGT-A6 and the superseding queue are ratified on 2026-08-01.
  Gate 2 standing dispatch applies to the named agent parcels only. Gate 3
  remains contingent on each complete green chain.
- Record exact state, not assertions. Current human/external gates H5, H6A,
  H6B, H7P, H7, and H8 remain open/not performed. G2 remains open; payment,
  publication, customer-data handling, and outreach remain NO-GO.
- Preserve the Kaseya exclusion. Do not send outreach, search Gmail for replies,
  mutate Linear, publish the website, enable payment, or accept customer data.
- The live Linear source of truth remains the existing Keon initiative and
  `KEO-59`; P0A only records observed state and must not create or edit issues.

## Acceptance Criteria

- [ ] The records state that WGT-P0BOOT completed on the verified commits and
  that `plugins/foreman-line` is tracked on `origin/main`.
- [ ] The queue is recorded exactly as `WGT-P0A -> WGT-P0B -> WGT-P0C`, then
  the ratified dependency-ready queue; no parcel crosses a red/unknown gate.
- [ ] Gate states explicitly distinguish Gate 1 closed, Gate 2 standing
  dispatch granted for the named queue, Gate 3 withheld per parcel, G2 open,
  G4 not established, and H5/H6A/H6B/H7P/H7/H8 human/external and open.
- [ ] Current Linear observations are recorded without duplicate creation:
  `KEO-59` In Progress; `KEO-145`, `KEO-156`, `KEO-157`, and `KEO-158` are
  existing related records; `KEO-197` remains the sole BrowseAhead lane.
- [ ] Outreach truth is recorded: KPM-06 is prepared/approval-gated, the exact
  ten-recipient Gmail Sent search returned zero messages, no KPM-07 actual-send
  receipt exists, and reply monitoring is prohibited until explicit G2 closure
  plus an actual KPM-07 send. The Kaseya exclusion is retained.
- [ ] The old pre-bootstrap missing-source stop is retained as history but
  explicitly resolved by the merged bootstrap evidence; it cannot continue to
  block P0A or authorize any external action.
- [ ] The durable handoff names the next safe action as WGT-P0B in a separate
  `keon-docs` repo-owned branch/worktree and names the do-not-touch boundaries.
- [ ] Exact-scope verification, clean-diff checks, and two independent
  context-independent reviews return PASS with no unresolved Blocker, High, or
  Medium finding before publication or merge.

## Out of Scope

- Foreman source, manifests, package files, dependencies, tests, contracts, or
  generated output.
- Any `keon-docs`, `keon-systems-web`, `keon-systems`, or other Keon repository.
- Any Linear issue/document mutation or backlog creation.
- Gmail search beyond the already recorded ten-recipient Sent result; reply
  monitoring is explicitly blocked.
- Outreach, public claims, terms/privacy publication, payment, Stripe/Neon
  state, deployment, customer data, legal decisions, or Kaseya work.
- Rewriting historical bootstrap evidence or the ratified D1-D9/WGT-D1-WGT-D10
  decisions.

## Context & References

- `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`
- `plugins/foreman-line/skills/goal/SKILL.md`
- `plugins/foreman-line/skills/parcel-driven-development/SKILL.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/charter.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/website-gtm-closeout-amendment.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/website-gtm-plan-review-findings.md`
- `plugins/foreman-line/docs/specs/done/WGT-P0BOOT-tracked-foreman-bootstrap.md`
- `plugins/foreman-line/docs/transcripts/build-WGT-P0BOOT-tracked-bootstrap.md`

## Verification Plan

The builder must begin with Step 0: restate this contract, verify the exact
branch/worktree/base/upstream/clean status, verify the bootstrap tree and live
state references, list the exact Allowed Files, and stop on any mismatch.

Required coordinator checks after the builder claim:

1. `git diff --name-only origin/main...HEAD` is a subset of Allowed Files;
   `git diff --check` is clean for all new/edited records; no product or
   unrelated historical path changed.
2. All factual claims in the records are checked against the on-disk Git tree,
   GitHub merge evidence, and current read-only Linear results. A claim is
   empty if its evidence is missing, stale, or only asserted in prose.
3. The exact queue, gate boundaries, outreach truth, Kaseya exclusion, and next
   safe action are each present and mutually consistent.
4. The spec-linter advisory/self-check and repository-appropriate Markdown
   checks pass without modifying files.
5. Two fresh, context-independent frontier reviews inspect the exact diff and
   return PASS with no unresolved Blocker, High, or Medium finding. Reviewers
   must not edit, commit, publish, or mutate Linear.
6. Before merge, re-fetch `origin/main`, rebase the parcel branch, rerun the
   exact-scope and clean-diff checks, and preserve the green-chain evidence.

Mandatory reviewer focus questions:

- Does the reconciled record distinguish merged bootstrap evidence from the
  obsolete missing-source preflight stop without rewriting history?
- Does the queue and gate table preserve every dependency and human/external
  boundary, especially G2, KPM-07, H6A/H6B, H7P, H7, and H8?
- Is the Linear observation read-only and tied to existing identifiers rather
  than creating duplicate backlog or silently treating related issues as WGT
  records?
- Could any wording be read as authorizing outreach, publication, payment,
  customer-data handling, or Gmail reply monitoring?

## Allowed Files

Only these exact paths may be created, edited, moved, or deleted in this parcel:

- `plugins/foreman-line/docs/specs/active/WGT-P0A-foreman-record-reconciliation.md`
- `plugins/foreman-line/docs/specs/done/WGT-P0A-foreman-record-reconciliation.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/website-gtm-closeout-amendment.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/loop-directive.md`
- `plugins/foreman-line/docs/goals/keon-proof-led-portfolio-priority/wgt-p0a-findings.md`
- `plugins/foreman-line/docs/transcripts/wgt-p0a-foreman-record-reconciliation-handoff.md`

Any required path outside this list is a stop-and-report condition requiring a
ratified amendment. No glob or directory shorthand grants mutation authority.

## Builder reconciliation record — 2026-08-01

Step 0 passed on the named worktree and branch. The worktree was clean before
implementation; `HEAD` was `f807422d54c9cf2d10c48bdbfd712c01be0d2082`, the
branch was `codex/wgt-p0a-foreman-reconciliation-20260801`, and local
`origin/main` was the verified base
`714ac657ded62d5a549428d06574fcb710ecc481`.

The merged bootstrap evidence is verified: agent-skills PR #4 merged at
`48d1db73ad0a6e9c2d9bd76f92f3a44d9fb7fcf0`, closeout PR #5 merged at
`714ac657ded62d5a549428d06574fcb710ecc481`, and `plugins/foreman-line` plus
the completed bootstrap spec are tracked on `origin/main`. The prior
pre-bootstrap missing-source stop remains historical evidence and is resolved
for this parcel; it neither blocks P0A nor authorizes any external action.

This spec remains `active` after the builder record changes. The coordinator
must perform the independent reviews, Gate 3 decision, and later Stage F
closure before moving this spec to `docs/specs/done/`; P0A does not archive its
own spec.

## Status

Builder record prepared within exact scope. Local doc/spec checks and the
independent read-only review chain remain required before any merge or
publication. No external system was mutated.
