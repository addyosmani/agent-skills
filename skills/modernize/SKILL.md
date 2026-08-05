---
name: modernizer
description: Contract-first modernization workflow for rebuilding legacy systems with provable behavioral equivalence. Use when a team needs to extract requirements and contracts, perform human validation, implement an idiomatic target solution, and verify parity with reconciliation reports and replayable receipts.
metadata:
  author: The Brotherhood
  keywords:
    - modernization
    - legacy rewrite
    - contract-first
    - reconciliation
    - receipts
---

# Objective

Modernize a legacy system by deriving behavioral contracts from evidence, validating contracts with human review, implementing in a target-native architecture, and proving equivalence within defined drift tolerances.

## Non-Negotiable Rules

1. Treat approved contracts as the only implementation truth.
2. Do not perform line-by-line translation from source to target.
3. Require verified, forgery-resistant human approval before implementation starts; the gate re-verifies a signed approval artifact every time and never trusts a self-asserted approval flag (see Approval Gate).
4. Attach evidence to every behavioral claim.
5. Escalate ambiguity instead of guessing behavior.
6. Block release if reconciliation fails.
7. A node leaves `started` only by writing its own terminal state (`done`/`failed`); the primary watches and never auto-reaps or requeues.
8. Do not open a phase-transition gate until a coverage check proves every discovered node of the closing phase reached a terminal state.
9. Never claim parity a run hasn't earned: receipts and `DEFENSIBILITY.md` assert only the claim tier justified by reconciliation actually executed against captured legacy samples. No recon / no legacy samples / no paired comparisons -> `unverified`, no parity claim (see Claim Ladder).

## Required Run Outputs

- `APP_SPECIFICATION.md` (or equivalent baseline spec artifact)
- `contracts/DRAFT_MANIFEST.yaml`
- `contracts/MANIFEST.yaml` (human-approved)
- Individual contract files in `contracts/`
- `TOMBSTONES.md` for approved semantic divergences
- `ARCHITECTURE.md` for target design decisions
- `task_store.db` (choreography node tree; schema `schemas/task_store.sql`)
- `coverage_check.md` (terminal-state coverage: every discovered node reached `done`/`failed`)
- `receipts/approval_verification.json` (Phase II->III/IV approval gate decision record)
- `telemetry.log` with evidence links
- `coverage_summary.md`
- `sampling_summary.md`
- `delta_report.md`
- `recon/` diff artifacts
- `receipts/manifest.json` (carries the parity `claim` block; schema `schemas/claim.schema.json`)
- `receipts/trace_index.json`
- `receipts/replay.sh` or `receipts/replay.ps1`
- `receipts/hashes.sha256`
- `DEFENSIBILITY.md` (headline = earned claim tier; what was proven, coverage achieved, what was NOT verified, how to replay)

## Execution Model - Choreography of Process-Skills

Enterprise modernization needs discovery *and* implementation at scale; a single agent is a context and throughput chokepoint. This skill runs as **choreography, not orchestration**: autonomous process-skills decompose the work recursively, report into shared state, and a primary agent acts as **watcher, not blocker**.

**Processes are skills.** Decomposition lives in versioned skills, not per-run improvisation. `get-app-specs` is the discovery process primitive; recursion is a process invoking the process on a narrower scope (subsystem -> project -> module -> component).

**The node tree is the durable source of truth.** Every process invocation is a row in the `nodes` table (`schemas/task_store.sql`, SQLite, materialized as `task_store.db`). A node is created `pending`, moves to `started` when it runs, and leaves `started` **only by writing its own terminal row** (`done` or `failed`). The primary never mutates a child's terminal state on its behalf.

**State split (QCC pattern).** Durable node tree + results live in SQLite (`task_store.db`). Ephemeral presence lives in Redis and is **advisory only**: a last-seen signal used to decide *when* to raise an investigate flag for a still-`started` node. It carries **no lease, no TTL-reclamation, and no requeue semantics. There is no reaper.** A worker-pool/lease-reaper topology is explicitly rejected here - wrong shape for a supervised tree.

**Watcher, not blocker.** The primary observes the node tree and updates it as processes report. A node stuck in `started` with absent presence and no terminal row is a **signal to investigate** - it does **not** lock the run and is **never** auto-reaped. This is resilient to partial failure where a synchronous join would deadlock.

**Loud vs quiet failure (mandatory).** Async trades a loud deadlock for silent incompleteness - worse for a proof skill. Therefore: every process emits a **terminal `done`/`failed`** (a `failed` node records `failure_reason`; it never just goes quiet), and a **coverage check** confirms every *discovered* child reached terminal before a baseline or phase is declared complete. A tree with dangling `pending`/`started` nodes is **not** complete. The store enforces this: see views `v_open_nodes` and `v_phase_coverage`.

**Watching is not reconciling.** Cross-process contradictions (frontend assumes a field the backend never emits) require an explicit **reconcile step**, not passive aggregation. Aggregation gathers; reconciliation resolves conflicts and catches the lie.

**Gates bind to phase transitions, not tree depth.** A discovery tree five levels deep still has exactly ONE discovery->implementation gate (Phase II). Intra-discovery joins need *coordination* (the coverage check), not *approval*. Each node records its `phase`; a phase-transition gate may open only when that phase's `open` count in `v_phase_coverage` is zero.

**Governance.** Depth is a proxy that lies (6x4x10 leaves >> 2^6). The real levers, persisted per run/node:
- **Spawn budget** allocated downward - each node spends children from its parent's allotment (`spawn_budget_total` / `spawn_budget_used`).
- **`max_concurrency`** - a ceiling on simultaneously `started` nodes (`runs.max_concurrency`).
- **`max_depth` ~ 5** - a dumb fuse (root -> subsystem -> project -> module -> component), not the primary control. Budget is the control.

## Approval Gate (Phase II -> III/IV)

The discovery->implementation gate requires a **forgery-resistant approval artifact** in `contracts/MANIFEST.yaml` - never a self-asserted flag. Block shape: `schemas/approval.schema.json`. Full playbook: `references/approval-verification.md`.

- **The artifact.** An `approval` block whose trust comes from a **signed git tag/commit** (or detached signature) produced by an allowlisted approver key - something the agent cannot author. It records `approver`, `approved_at`, `method`, the signing-key fingerprint, the immutable signed `object`, and `manifest_hash`.
- **`manifest_hash`** = SHA-256 over canonical JSON of the manifest with the `approval` block removed; it transitively binds contract bodies via per-contract `content_hash` entries in `contracts/MANIFEST.yaml` (schema `schemas/manifest.schema.json`). Approve manifest A and you cannot swap in B.
- **Verify live, on every transition.** Re-run all checks before opening the gate: (1) Phase I coverage clear; (2) `approval` valid vs schema; (3) signature verifies AND signer is allowlisted; (4) ref resolves to the recorded `object`; (5) the hash in the signed message == `approval.manifest_hash` == freshly recomputed hash; (6) every contract still matches its recorded content hash. Any failure -> ABORT, stay in Phase II, emit the failing check.
- **Never trust a stored boolean.** There is no `verified` field; a prior PASS is evidence, not authority. Record each decision in `receipts/approval_verification.json`.
- **Trust assumption.** This holds iff no allowlisted private signing key is reachable by the agent's execution environment.

## Claim Ladder (Receipts & DEFENSIBILITY.md)

Equivalence is bounded by sampling against **captured legacy behavior** - recording only the target proves nothing. Receipts and `DEFENSIBILITY.md` may assert only the tier the evidence earns. Block shape: `schemas/claim.schema.json`. Algorithm + DEFENSIBILITY.md template: `references/defensibility-and-claims.md`.

- **Tiers.** `unverified` (recon didn't run, or 0 legacy samples, or 0 paired comparisons - **no parity claim**); `partial` (ran against legacy, unwaived coverage/contract gaps - bounded claim, gaps named); `verified` (ran against legacy, all targets met or tombstone-waived - equivalence *within drift tolerance, bounded by coverage*; never "identical"); `failed` (strict-field drift beyond tolerance - block release, rule #6).
- **Paired comparison.** A legacy<->target comparison needs BOTH sides for the same stimulus. Target-only recordings can never lift the tier above `unverified`.
- **Recompute, don't trust.** The tier is a function of the sample/comparison/coverage counts, computed at emission - never a stored field. A receipt may not assert above its tier; at `unverified` it carries no parity assertion.
- **Waivers are named, not laundered.** A coverage gap accepted via `TOMBSTONES.md` keeps `verified` but stays listed in DEFENSIBILITY.md. Unwaived gaps force `partial`.

## Phase Workflow

### Phase 0 - Specification Baseline

Action:
- Run `$get-app-specs` on the source repository unless a current baseline spec is already provided.
- Use the resulting app spec as the canonical inventory of features, business rules, dependencies, and domain canon.

Entry criteria:
- Repository access is available.
- Scope boundaries are defined (what is in and out of modernization scope).

Exit criteria:
- `APP_SPECIFICATION.md` exists and is reviewed.
- Baseline includes confidence labels and open questions.
- Blocking low-confidence items are either resolved or explicitly accepted for discovery follow-up.

### Phase I - Discovery and Contract Drafting

Action:
- Inventory source evidence: APIs, code, tests, logs, traces, schemas, runtime config.
- Draft behavioral contracts mapped to baseline spec IDs.

Entry criteria:
- Baseline spec is available (from Phase 0 or user-provided equivalent).

Exit criteria:
- `contracts/DRAFT_MANIFEST.yaml` exists.
- Each contract includes source evidence pointers.
- Coverage report exists showing which baseline requirements are mapped or pending.
- Coverage check passes: every discovered discovery node reached a terminal state (`done`/`failed`) - no dangling `pending`/`started` nodes (`v_open_nodes` is empty for this phase).

### Phase II - Human Validation Gate

Action:
- Review draft manifest with stakeholders.
- Resolve ambiguities and conflicting interpretations.
- Record approved divergences in `TOMBSTONES.md`.

Entry criteria:
- Draft manifest is complete enough for review.

Exit criteria:
- `contracts/MANIFEST.yaml` validates against `schemas/manifest.schema.json` (per-contract `content_hash` entries + a valid `approval` block) and passes Approval Gate verification; `receipts/approval_verification.json` records the PASS.
- Open ambiguities are closed or explicitly deferred with owner and due date.
- Tombstones are documented for all approved behavioral differences.
- This is the single discovery->implementation gate regardless of discovery-tree depth; it requires the Phase I coverage check to have passed.

### Phase III - Target Architecture and Task Graph

Action:
- Produce target-native design in `ARCHITECTURE.md`.
- Build the implementation task graph as nodes in the choreography node tree (`task_store.db`; see Execution Model), each mapped to contract groups.

Entry criteria:
- The Approval Gate verifies live (signed approval artifact + manifest-hash match, signer allowlisted). Re-verify on entry; a prior PASS or a stored flag is never sufficient.

Exit criteria:
- Architecture decisions reference contract groups.
- Task plan maps each contract to implementation and test tasks.
- No task claims behavior outside approved contracts.

### Phase IV - Implementation and Contract Tests

Action:
- Implement only behavior described in approved contracts.
- Add tests per contract and generate telemetry evidence.

Entry criteria:
- Approved manifest and architecture are available.

Exit criteria:
- Contract tests pass at required threshold.
- Telemetry includes traceable contract IDs.
- Receipts are generated and replay scripts run successfully.

### Phase V - Reconciliation and Release Decision

Action:
- Capture BOTH legacy and target behavior samples for the same stimuli (a parity claim needs paired comparisons; target-only recordings prove nothing).
- Execute stratified reconciliation sampling against the captured legacy samples.
- Compare legacy and modernized outputs using drift rules.
- Compute the parity claim tier from the evidence (see Claim Ladder) and publish coverage, sampling, and delta reports.
- Emit `receipts/manifest.json` (with the `claim` block) and `DEFENSIBILITY.md` at the earned tier - never above it.

Entry criteria:
- Implementation phase is complete with receipts.

Exit criteria:
- Reconciliation ran against captured legacy samples with >= 1 paired comparison per claimed contract (else tier is `unverified` and no parity may be claimed).
- Strict fields are within configured drift tolerance (else tier is `failed` - release blocked, rule #6).
- The `claim` block validates against `schemas/claim.schema.json`; receipts and `DEFENSIBILITY.md` assert nothing above the earned tier; unwaived coverage/contract gaps are named (tier `partial`).
- Release decision is documented with evidence links and the earned claim tier.

## Contract Requirements

Every contract file must include:
- Contract ID and version
- Linked baseline requirement IDs (for example `F-*`, `BR-*`, `R-*`, canon IDs)
- Inputs and preconditions
- Execution trigger
- Expected outputs
- Side effects with explicit assertions
- Error handling behavior
- Determinism strategy
- Evidence pointers (`path:line`) to source artifacts

Store contracts in versioned YAML and validate against:
- `schemas/contract.schema.json`
- `schemas/wire_contract.schema.json` (when wire-level parity applies)

## Drift Scoring Requirements

Define scoring rules before reconciliation:
- Strict fields (for example status codes, signatures, stable enumerations)
- Ignored or normalized fields (for example timestamps, generated IDs)
- Numeric tolerances for float comparisons
- Ordering semantics (ordered list vs unordered set)

## Failure Conditions

Stop and escalate if any of the following occur:
- Contract coverage is below agreed threshold.
- Required strict fields drift outside tolerance.
- Ambiguities remain unresolved at validation gate.
- Confidence falls below agreed minimum.
- Reconciliation fails.

## Non-Goals

- Do not redefine domain semantics without approved tombstones.
- Do not perform speculative refactors unrelated to contract compliance.
- Do not enforce style preferences that conflict with contract behavior.
- Do not assert behavior without source evidence.

## Final Instruction

Optimize for defensibility, replayability, and evidence. If equivalence cannot be proven with receipts and reconciliation artifacts against captured legacy samples, the run is `unverified` - record that honestly and claim nothing more. Proof, not vibes.
