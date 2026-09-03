# Proposed Charter Amendment A3 — Hierarchical Coordination with Per-Coordinator Sidecars

## Status

**PROPOSED — not ratified, not in force, and not authorized for implementation.**

This is a current-instance translation of the coordination concept recovered from the
historical `governed-scale-out` charter. The historical charter has no authority in this
repository. Its separate `coordination-seam-proposal.md` was never ratified; none of that
proposal's implementation recommendations are imported by implication.

**Target:** `plugins/foreman-line/docs/goals/foreman-kernel/charter.md` in the
`codex/foreman-kernel-stage0-20260830` goal worktree.

**Authority boundary:** this document is a Gate 1 amendment proposal only. It does not edit
the authoritative charter, change the live coordinator, reopen or dispatch FK-P0, widen the
standing FK-P0–FK-P21 Gate 2 grant, or alter human-owned Gate 3.

## Anchor verification

Verified 2026-09-03 against:

- goal-worktree HEAD `197185bd2e9236b58cb3e9b4d2764b4c996878fb`;
- `charter.md`, 435 lines, SHA-256
  `c19359374480b03c39ce04316f94007fbb87e3be2b5be39bca8dd4072164234d`;
- the §4 decision table through ratified D21;
- the parked A2 drafting chain, where D22 is retired and unclaimed; and
- `loop-directive.md`, which names a different live owning coordinator and places FK-P0
  at human Gate 3.

The repo-wide decision-row sweep found no decision after the retired D22. This draft
therefore reserves **D23–D25**. Repeat that sweep immediately before transcription. Do not
renumber or reuse D22: its retirement is part of the drafting provenance.

## Why this belongs at Gate 1

This is not a scheduling convenience. It fixes where accountability terminates, whether
coordination may recurse, which components may exercise judgment, and whether a shared
service may become an undeclared global coordinator. Those are authority and architecture
boundaries. A parcel author or builder cannot choose them safely.

The amendment deliberately separates two concerns:

1. **The coordination contract is fixed now.** One accountable owner remains visible even
   when work fans out.
2. **The implementation is not added to the current first release.** FK-P0–FK-P21 remain
   unchanged. Implementation requires a separately ratified follow-on goal or an amendment
   that names new parcels, dependencies, acceptance evidence, and Gate 2 authority.

---

## A3.1 — New locked decision D23: hierarchical accountability

**Target:** §4 Locked decisions table. Append after D21.

**Proposed text:**

| D23 | Coordination may scale hierarchically, but ownership of a goal is never split. Every goal has exactly one owning coordinator at the root, which holds the goal exit criterion, final report, ownership record, and human-authority interface. The owner may commission subordinate coordinators only for coordination domains declared in ratified canon and proven mechanically disjoint for concurrent mutation over their declared files, contracts, and serialization points. Disjointness is a continuing obligation, not a commissioning-time formality: each declared domain carries a revision digest, and any change to a declared domain invalidates the prior proof and requires revalidation before further concurrent dispatch; an unrevalidated domain fails closed. Each subordinate has exactly one parent, owns only its delegated domain, and reports upward under D25. A subordinate's authority ceiling is a strict subset of its parent's; no coordinator may delegate, exercise, or reacquire authority it did not receive, and delegation never includes Gate 1 or Gate 3. A subordinate may itself commission subordinates only within its own delegated domain and only under this same rule, to a maximum commissioning depth declared in the charter. The same coordinator contract applies recursively; there is no separate subordinate implementation. A goal with only one eligible coordination domain commissions no subordinate. Commissioning is revocable and its lifecycle is explicit: an edge is in exactly one of `proposed`, `active`, `quiescing`, `revoked`, or `closed`; a parent may revoke or quiesce a child at any time; on revocation, parent termination, or restart, delegated authority returns to the nearest surviving ancestor and in-flight delegated work is re-leased or refused rather than inherited implicitly; at no point may two coordinators hold root ownership of the same goal. | A flat coordinator pool removes the single point of accountability along with the bottleneck. A hierarchy preserves a named owner while allowing independent domains to progress concurrently. Requiring canon-declared scope and continuing mechanical disjointness prevents organizational labels from concealing shared contracts, files, or serialization points, and prevents a proof that was true at commissioning from silently lapsing as domains grow. Ceiling monotonicity and an explicit revocation lifecycle are what keep recursion from manufacturing authority or a second root owner across restart. |

### Translation note

The historical rule fixed subordinate scope to “one application.” That label is not copied
here because the current `foreman-kernel` goal is organized around repositories, parcels,
contracts, adapters, and shared serialization points rather than an enterprise application
portfolio. The invariant is retained in current vocabulary: a subordinate owns one
**ratified coordination domain**, and concurrent domains must be mechanically disjoint.

---

## A3.2 — New locked decision D24: coordinator-scoped sidecars

**Target:** §4 Locked decisions table. Append after D23.

**Proposed text:**

| D24 | Every coordinator may operate with two coordinator-scoped logical sidecars: (1) a deterministic scheduler for that coordinator's delegated queue and (2) a stateless adjudicator pool for judgment tasks arising from that queue. "Sidecar" is an authority and lifecycle boundary, not a required process, container, database, or vendor topology; the boundary constrains ownership and authority, and it is the role limits below — not the topology — that carry the throughput property. Sidecars are bound to one coordinator principal and one delegated domain. They may use the shared Foreman Kernel for neutral schema, lease, evidence-index, policy, and admission services, but no shared scheduler, adjudicator pool, or queue may acquire cross-coordinator ownership or become a global coordination authority. | Coordinator-local sidecars remove the owner's personal scheduling and triage queue as the throughput ceiling only if the scheduler can advance without consuming the coordinator's turn; the role limits state that requirement mechanically so the decision does not assert a property its own text leaves optional. Defining the boundary logically preserves that property in the current kernel architecture without duplicating trusted storage or smuggling a second control plane into infrastructure. |

### Required role limits

These limits are part of D24, not implementation suggestions:

- The scheduler advances its coordinator's queue without consuming a turn of that
  coordinator. A conforming implementation in which queue progress requires the
  coordinator to act does not satisfy D24, whatever its process topology.
- The scheduler is deterministic and performs no model judgment. Identical frozen inputs
  produce the same ordered decision and digest. The frozen input set is explicit and
  complete: queue contents and their revision digests, declared-domain digest, lease and
  admission state as read at a named revision, policy version, and an injected clock and
  seed. No ambient wall-clock, arrival order, hostname, process identity, or RNG may
  influence ordering; determinism claims are evidenced by repeat runs over a recorded
  input set, not by re-execution in a similar environment.
- The scheduler may propose or request dispatch only within its coordinator's delegated
  domain. It cannot ratify a charter, widen scope, grant itself authority, merge, or close a
  goal.
- Adjudicators retain no private durable authority state. Durable facts and evidence
  references are read from or written through the admitted kernel contracts.
- An adjudicator may classify or recommend a disposition, but cannot schedule work, mutate
  canon, grant Gate 1 or Gate 3, or convert its own output into independent verification.
  Pool membership confers no separation: independence is evaluated under D25 at the
  principal and occupancy level, and two members of the same pool are not independent of
  each other for verification purposes.
- Shared compute capacity, storage, or kernel services are infrastructure, not shared
  coordination ownership. Contention in them must produce a typed wait, refusal, or retry;
  it must not silently centralize queue selection.

---

## A3.3 — New locked decision D25: structural roll-up and separation

**Target:** §4 Locked decisions table. Append after D24.

**Proposed text:**

| D25 | A subordinate coordinator's roll-up is a claim, not evidence. Upward reports use a versioned structured envelope containing enumerated state, counts, digests, and canonical evidence references; no free-text assertion can satisfy an assurance or gate field. Parent verification is bounded and structural by default: the parent resolves every referenced evidence identity against the canonical index, compares digests and counts against the envelope, and confirms that referenced identities fall inside the child's declared domain. It refuses on any mismatch, unresolvable reference, domain escape, or envelope-version mismatch. Full re-derivation of a child's underlying evidence is not the default verification path; it is invoked only on refusal, on a declared sampling rule recorded in the charter, or where a named gate requires it, so that a parent's verification cost scales with claims resolved rather than with total subordinate work. Verification independence binds at the principal and occupancy level: no coordinator, scheduler, adjudicator, builder, or reviewer — and no other occupancy of the same principal or member of the same pool — may create the evidence that it consumes as independent verification of its own claim. Human-only gates remain human-only at every depth, and no accumulation of roll-ups constitutes a gate grant. | Hierarchy otherwise turns one self-graded summary into a chain of self-graded summaries. Bounding re-query to structural resolution keeps the root from becoming the new throughput ceiling exactly when the tree widens, while refusal and sampling preserve a path to full re-derivation where it is actually needed. Binding independence to principal and occupancy rather than to role names closes the fungible-pool gap, where two interchangeable members of one pool would otherwise satisfy a separation requirement they cannot meet. |

---

## A3.4 — New §5.1: coordination seam

**Target:** §5 First-release architecture. Insert after the architecture diagram and before
`### Common decision envelope`.

**Proposed text:**

> ### 5.1 Coordination seam
>
> The kernel is a neutral trust and operational-state substrate; it is not the owning
> coordinator. Coordination composes as a tree with one goal owner at the root. Every edge
> records parent principal, child principal, delegated-domain digest, authority ceiling,
> lease/revision binding, and lifecycle state. Authority ceilings, commissioning depth, and
> edge lifecycle transitions are governed by D23; §5.1 describes only how those constraints
> appear at the seam.
>
> Each coordinator's scheduler and adjudicator pool are local to that coordinator's queue
> as defined by D24, even when they use a common kernel instance. No component may infer a
> global queue merely because the kernel can observe multiple queues. Cross-domain
> collision, shared-contract ownership, and serialization conflicts are admission questions
> and fail closed before concurrent dispatch.
>
> Roll-ups follow D25. Structural resolution of a roll-up is a verification act, not a
> retrieval optimization; it never replaces the evidence to which it refers, and it never
> licenses acceptance of an unresolved reference.

---

## A3.5 — Explicit first-release deferral

**Target:** §7 Explicitly not doing in this goal. Add the following bullet before the
closing paragraph.

**Proposed text:**

> - implementing or claiming hierarchical coordinator commissioning, coordinator-scoped
>   scheduler/adjudicator sidecars, cross-domain concurrency, or coordinator roll-up closure
>   in FK-P0–FK-P21. D23–D25 define compatibility and authority boundaries only; runtime
>   implementation requires a separately ratified follow-on goal or an amendment that adds
>   named parcels and acceptance evidence.

**Rationale:** D4 intentionally bounds the first release. Treating this amendment as an
implicit expansion would bypass the parcel graph, plan review, and Gate 2.

---

## A3.6 — Stop conditions

**Target:** §11 Stop conditions. Add the following items before the final queue-empty item.

**Proposed text:**

> - a proposal splits owning-coordinator accountability across a pool or leaves more than
>   one root owner for a goal;
> - a subordinate domain is treated as disjoint without a mechanical collision check over
>   its declared files, contracts, and serialization points;
> - a shared scheduler, adjudicator pool, or queue becomes a cross-coordinator authority;
> - a parent accepts prose assurance, unchecked counts, or unresolved evidence references
>   as a subordinate's verified completion; or
> - any role creates the evidence it consumes as independent verification of its own claim;
> - a declared coordination domain changes without revalidated disjointness before further
>   concurrent dispatch;
> - a commissioned edge exists in no declared lifecycle state, or delegated authority is
>   inherited implicitly after revocation, parent termination, or restart;
> - a scheduler's ordering is influenced by an input outside its declared frozen input set;
> - a parent treats full re-derivation as its default verification path, or treats
>   structural resolution as satisfied by an unresolved reference; or
> - two members of the same adjudicator pool, or two occupancies of the same principal, are
>   presented as independent verification of one another;

---

## A3.7 — Gate 1 decision list

**Target:** §13 Gate 1 decision list.

Insert a new item after current item 7 and renumber the existing items 8–11 to 9–12.

**Proposed item 8:**

> 8. hierarchical coordination with one unsplit goal owner, coordinator-scoped logical
>    scheduler and adjudicator sidecars, and structural evidence-referencing roll-ups
>    (D23–D25), with runtime implementation explicitly deferred;

No FK-P0–FK-P21 parcel, dependency, wave exit, integration scenario, goal exit criterion,
or standing Gate 2 authorization changes under this amendment.

---

## A3.8 — Ratification ledger

**Target:** §4.1 Ratification ledger.

If and only if the developer explicitly ratifies this amendment, append:

| Date | Instrument | Scope ratified | Record |
|---|---|---|---|
| YYYY-MM-DD | Amendment A3 — hierarchical coordination with per-coordinator sidecars | D23–D25; new §5.1; §7 deferral; §11 stop conditions; §13 item 8 | `<exact developer ratification statement>` |

The owning coordinator must replace the date and record with the actual ratification
evidence. Draft text or an approval of the general concept is not enough.

## Deliberately unresolved implementation choices

The historical implementation proposal raised useful questions, but it was unratified and
belongs to shaping, not this amendment. This amendment therefore does **not** decide:

- whether sidecars are in-process modules, worker processes, containers, or remote workers;
- the scheduler's total ordering keys;
- static quotas, optimistic backpressure, or another capacity-allocation mechanism;
- whether decision work reuses FK-P10's lease primitive;
- the physical receipt/evidence index used for high-volume roll-up queries;
- the number or model grade of adjudicators;
- retry, timeout, crash-recovery, and pool-sizing policy; or
- the exact follow-on parcel graph and prove-out repository.

Before implementation authority is requested, shaping must turn those choices into explicit
contracts and include at minimum:

1. a real parent/child commissioning proof;
2. repeat-run scheduler determinism evidence over frozen inputs;
3. double-lease, stale-revision, and cross-domain collision refusals;
4. malformed, missing, mismatched, and self-referential roll-up rejection;
5. proof that one coordinator's sidecars cannot inspect or dispatch another's queue except
   through an explicitly admitted cross-domain dependency; and
6. restart recovery without two owning coordinators or manufactured gate evidence.

## Ratification effect

Ratifying A3 binds the coordination topology and its authority limits while leaving the
current implementation queue unchanged. It authorizes no code, dispatch, merge, deployment,
or ownership transfer.

**Ratification record:** _(unratified — awaiting explicit developer decision)_
