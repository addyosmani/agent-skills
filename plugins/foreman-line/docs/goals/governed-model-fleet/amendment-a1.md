# Governed Model Fleet — Proposed Amendment A1

**Date:** 2026-09-04  
**Trigger:** plan-level adversarial review  
**Status:** RATIFIED 2026-09-04 — incorporated into `charter.md`  
**Unchanged:** A1–A7; D1–D4, D7, D8, D12, D14, D18, D20, D23, D24

## Decision amendments

The following ratified text replaces only the named original decisions.

### A1-D5 — execution effect and exact spend point

For `fleet.worker.execute`, pre-spend preparation may create only a blank, non-worker
isolation shell and prove its environment identity. It may not access source, credentials,
external network, model gateways, MCP gateways, or authoritative repository state. The
executor recomputes the effective descriptor, then requests one atomic Runtime spend
immediately before starting one isolated root process tree. That spend authorizes at most
that one process-tree effect. Post-spend bootstrap transfers and materializes the bound
source inside the isolation boundary, verifies its manifest, then permits cognition. Any
bootstrap, manifest, or launch failure consumes the permission, terminates the entire tree,
reconciles reservations, and produces a failure outcome; it cannot retry under that
permission.

### A1-D6 — Runtime-owned atomic state and settlement

Runtime owns one durable transaction boundary for effect-time permission validation and
accounting. Validation of revocation, expiry, descriptor, audience, nonce, policy and
lineage; permission consumption; unique effect-attempt recording; budget reservation;
concurrency-slot acquisition; and persistence of the pre-effect authorization receipt plus
pending-effect state commit atomically under database uniqueness and isolation guarantees.
Reservations are accounting state, not authority. Terminal reconciliation records actual
cost when authoritative evidence exists, or an explicit unknown/pending amount when it does
not; unresolved cost retains the necessary reservation and blocks overspend until an
append-only settlement, adjustment, or human resolution releases it. Recovery may expire
leases and reconcile state but never resurrect or re-spend permission.

### A1-D9 — post-spend source materialization

The executor never bind-mounts the authoritative host repository. Before spend it may
validate the declared source identity and prepare a blank isolation boundary without
transferring source. After a satisfied `fleet.worker.execute` spend and root process-tree
start, a narrowly scoped bootstrap channel materializes the exact bound source into
disposable Linux storage, verifies the source and overlay manifest before model cognition,
and closes the channel. It exports only content-addressed patch/evidence artifacts. A
mismatch terminates the effect and produces a consumed-permission failure outcome.

### A1-D10 — complete execution environment identity

Execution authority binds the exact `ExecutionEnvironmentIdentity`: executor image digest
and version; guest/base-OS image digest; kernel; hypervisor or isolation technology and
version; enforcement-plane and host-security-posture identity; boot/config attestation;
policy-engine version; network-, DNS-, filesystem-, process-, and resource-policy digests;
runtime-profile digest; and evidence-contract version. Canonical byte domains are explicit.
The instantiated environment must independently attest a match before spend. Any missing or
mismatched element means no spend and no effect.

### A1-D11 — tier eligibility and attestation

Docker/WSL2 may prove deny-only and synthetic/public workloads only when the complete
environment identity and enforcement policy attest successfully. Private/internal source
requires a disposable VM whose guest/base image, kernel, hypervisor/isolation layer,
enforcement plane, boot/config posture, and resource limits match the descriptor and pass
independent isolation review. Isolation eligibility never implies data-disclosure authority.
Kernel/hypervisor/container exploit resistance belongs to the hardened environment;
Runtime governs the exact capabilities and disclosures granted.

### A1-D13 — provider-attempt inference unit

One exact outbound provider attempt is one `fleet.model.infer` effect and consumes one
permission. A client request/response stream may contain zero or more separately authorized
attempts, but GMF V1 prohibits automatic downstream retries and provider/model fallback.
Every new attempt requires a new nonce, permission, spend, and attempt ordinal. The
descriptor binds canonical request bytes/hash, provider endpoint and request/idempotency ID,
model and revision where knowable, data class, pricing snapshot and currency, token/call/
time/stream ceilings, estimated and reserved cost, and remaining task budget. The gateway
enforces streaming cutoff and never trusts worker-supplied usage or price evidence.

### A1-D15 — promotion actuator and target

Worker output is immutable evidence, not host mutation authority. A separately deployable
and audience-bound **Fleet Promotion Actuator**, sourced from the `keon-fleet-executor`
repository but isolated from the worker/executor runtime identity, is the only V1 component
allowed to exercise `fleet.patch.promote`. It revalidates exact patch and manifest hashes,
source identity, target repository identity and HEAD, allowed paths/file forms, required
review and human approval evidence, clean-state preconditions, and a target lock/CAS before
spend. It applies into a newly created isolated promotion worktree/ref using atomic staging,
records terminal outcome and rollback/compensation evidence, and exposes no callable surface
to workers. Promotion never merges to the protected/default branch; Gate 3 remains the
separate human merge decision.

### A1-D16 — terminal and settlement evidence

Fleet uses Keon's existing seven receipt types and lifecycle rules unless a separately
ratified contract amendment proves a new type necessary. Fleet states are profiles/payloads,
not new receipt primitives. Every effect records a durable denial or one terminal outcome;
append-only follow-up settlement may refine unknown cost without rewriting history.
Inference distinguishes denied, failed-before-send, sent/usage-pending,
failed-or-cancelled-after-send with unknown charge, completed/settled, and later
adjustment/refund evidence. Execution distinguishes bootstrap, materialization, manifest,
launch, runtime, and termination failures. Promotion distinguishes rejected, staged,
applied-to-isolated-ref, rolled-back/compensated, and partial/ambiguous failures. The offline
verifier trusts canonical bytes, signatures, and complete lineage—not gateway summaries.

### A1-D17 — deny-only closure before allow

The executor allow path remains mechanically absent or disabled through GMF-P4B. GMF-P4B
implements and proves deny-only materialization/isolation behavior and must complete its
full independent review and human-controlled merge/acceptance boundary before GMF-P4C may
be shaped or dispatched. GMF-P4C alone may enable one tightly bounded synthetic/public
positive path. MF-P0 failures remain GMF-NEG-001–010, and GMF-P0 adds the inference, MCP,
accounting, materialization, process-tree, evidence, and promotion negatives identified by
plan review.

### A1-D19 — ownership additions

Contract and Runtime authority/accounting changes live in `keon-systems`; tool-boundary
admission lives in `keon-mcp-gateway`; credentialed model forwarding lives in the future
`keon-model-gateway`; disposable materialization, hardened execution, and the source for a
separately deployable Promotion Actuator live in the future `keon-fleet-executor`; the
distributable foreman skill lives in `agent-skills`; offline Fleet verification extends
`Keon.Verify`. The Promotion Actuator has a distinct audience, runtime identity, and trust
boundary from worker execution despite shared source-repository ownership. Cortex/Control
integration remains outside V1 unless later ratified.

### A1-D21 — replay and retries for every effect

A satisfied spend is permanently consumed even when its effect fails, becomes ambiguous,
or later settles at zero cost. No actuator retries, replays, or falls back under the same
permission. Worker execution retry creates a new process-tree effect; provider retry creates
a new provider-attempt effect; promotion retry creates a new isolated target attempt. Each
requires a new nonce, descriptor where attempt-specific fields change, permission, and
foreman proposal. Idempotency may return the already-recorded effect/receipt but can never
create a second process tree, provider attempt, or patch application. Unknown post-send
inference cost remains reserved until append-only settlement or human resolution.

### A1-D22 — source disclosure binding

Data classification is explicit and descriptor-bound. Synthetic/public proof is the only
default. Transfer/materialization of private/internal source inside a disposable VM is part
of the `fleet.worker.execute` consequence and requires a human grant bound to the exact
source identity, VM environment identity, task, role, approved internal gateway audiences,
provider/model/data class, cost ceiling, and expiry. Model transmission still requires its
separate `fleet.model.infer` spend. Credentials, regulated data, secrets, and ambiguous data
remain denied until separately modeled and ratified.

## Revised phase and parcel graph

```text
GMF-P0   Discovery + canon mapping + threat model + expanded negative matrix
    |
    v
GMF-P1   Effect/source/environment/artifact + receipt/evidence contracts
    |
    v
GMF-P2A  Durable Runtime authority/accounting store + migration
    |
    v
GMF-P2B  Atomic spend + reservation + concurrency + pre-effect receipt
    |
    v
GMF-P2C  Terminal reconciliation + lease recovery + verification primitives
    |
    +------------------------------+
    |                              |
    v                              v
GMF-HG-R1                      GMF-P5
Human creation/protection      Capability-scoped MCP admission
of two service repositories
    |
    +-------------------+
    |                   |
    v                   v
GMF-P3A              GMF-P4A
Model-gateway        Executor repo
repo baseline        baseline
    |                   |
    v                   v
GMF-P3B              GMF-P4B
Governed model       Executor/materialization
gateway              DENY-ONLY implementation + closure
    |                   |
    +---------+---------+
              v
           GMF-P4C
           Bounded synthetic/public allowed execution
              |
              v
           GMF-P6
           Isolated Promotion Actuator
              |
      +-------+-------+
      |               |
      v               v
   GMF-P7          GMF-P8
   Foreman         Offline Fleet verifier
   adapter/skill   implementation + independent acceptance
      |               |
      +-------+-------+
              v
           GMF-P9
           Verification-only adversarial E2E proof
```

Additional dependencies:

- GMF-P3B depends on P2C and P3A.
- GMF-P4B depends on P2C and P4A.
- GMF-P4C depends on independently closed P3B and P4B.
- GMF-P5 depends on P1 and P2C and may proceed after those close without waiting for repo
  creation.
- GMF-P6 depends on P1, P2C, and P4C.
- GMF-P7 depends on P3B, P4C, P5, and P6.
- GMF-P8 depends on P1, P2C, P3B, P4C, P5, and P6. Its implementation and fixtures close
  before P9.
- GMF-P9 depends on P7 and the independently accepted P8 and is verification-only; verifier
  source and fixtures are forbidden from its Allowed Files.

`GMF-HG-R1` is a human prerequisite, not a parcel and not standing authorization. It creates
and protects the two ratified service repositories and establishes their initial base
commits. After that human action, P3A/P4A separately add reviewed scaffolding, CI,
dependency/supply-chain policy, signing/trust configuration, and service identities.

## Ratification record

The owner explicitly ratified Governed Model Fleet Amendment A1: A1-D5, A1-D6,
A1-D9–A1-D11, A1-D13, A1-D15–A1-D17, A1-D19, A1-D21, A1-D22, and the revised graph
through GMF-P9 on 2026-09-04.

This amendment grants no Gate 2, repository creation, provider spend, source disclosure,
promotion, merge, installation, deployment, publication, or Gate 3 authority.
