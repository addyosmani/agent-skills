# Governed Model Fleet — Stage Zero Discovery

**Date:** 2026-09-03  
**Scope:** passive local discovery only  
**Status:** initial record; Stage Zero and Amendment A1 ratified; GMF-P0 awaits Gate 2  
**Authority:** no product edits, provider calls, repository creation, deployment, or patch
promotion

## Purpose

This record separates facts observed on disk from charter decisions and unknowns. It is not
implementation evidence and does not claim that a Fleet workload can safely run today.

## Repository inventory

| Repository | Remote | Branch / observed HEAD | Observed state | Proposed ownership |
|---|---|---|---|---|
| `D:\Repos\agent-skills` | `https://github.com/m0r6aN/agent-skills.git` | `main` / `5ce6ddc7f996d764e506b6b421779fbf3ece689a` | Existing Model Fleet/Foreman records and INDEX changes are present; unrelated `.claude/settings.json` is untracked | Governance records and eventual distributable skill |
| `D:\Repos\keon-omega\keon-systems` | `https://github.com/Keon-Systems/keon-systems.git` | `main` / `2b6c75536f50f125155ee697446cec89f70f2fec` | Tracked worktree clean | Canonical contracts, Runtime authority/spend/accounting, verifier |
| `D:\Repos\keon-omega\keon-mcp-gateway` | `https://github.com/Keon-Systems/keon-mcp-gateway.git` | `main` / `d6376fd024d43be7ff458af675c646ae93c52492` | Pre-existing tracked modification to `.serena/project.yml` | Governed MCP tool boundary |
| Proposed `D:\Repos\keon-omega\keon-model-gateway` | Proposed `Keon-Systems/keon-model-gateway` | Absent | Not created | Provider credential custody and governed inference |
| Proposed `D:\Repos\keon-omega\keon-fleet-executor` | Proposed `Keon-Systems/keon-fleet-executor` | Absent | Not created | Disposable materialization and hardened execution |

Observed commits are discovery pins, not implementation bases. Parcel shaping must refresh
them and isolate all work from pre-existing changes.

## Existing contract and code anchors

| Anchor | Observed fact | GMF implication |
|---|---|---|
| `keon-contracts/contracts/ipermission.v1.json` | Canonical `IPermission` is a sidecar authority object, defaults to explicit single use, uses append-only revocation, and forbids parallel/ambient authority. Status is `contract_candidate_pending_conformance`. | Fleet must extend and conform this contract; its envelope cannot become authority. |
| `permission_event.v1.json` | Grant/revoke lifecycle is append-only and preserves the seven-receipt hard cap. | Fleet lifecycle states should profile existing receipt types first. |
| `permission_spend.v1.json` | Only `satisfied` permits execution; all other verdicts deny and must be receipted. | Each Fleet effect needs spend binding and denial evidence. |
| `receipt_lifecycle_profile.v1.json` | Failed execution is a governed terminal lifecycle, and replay may return an existing execution reference. | `LAUNCH_FAILED` must be terminal after spend; idempotency cannot launch twice. |
| `src/Keon.Contracts/Permission.cs` | `IPermission` includes effect and constraints hashes, expiry, use policy/count, lineage, revocation, and human-grant identity fields. | Audience, nonce, budget, environment, and Fleet descriptors must extend canonical constraints/contracts rather than bypass them. |
| `src/Keon.Verify/RuntimePermissionSpendGate.cs` and related verifier/tests | A spend gate and negative vectors already exist for permission checks. | P1/P2 should extend proven seams and add Fleet race/crash/effect coverage. |
| `src/Keon.Runtime/Execution/ControlledExecutionHandler.cs` | The only current controlled side effect is an internal ledger append; the handler explicitly performs no external I/O. | No present code path launches a worker or calls a provider. |
| `src/Keon.Runtime.Api/LaunchAuthority.cs` | Authority is config-seeded/in-memory, launch remains fail-fast, and an allow-all limiter exists only as an inactive placeholder. | Durable authority and real accounting are prerequisite work, not assumed capability. |
| `src/Keon.Runtime.Api/LaunchExecution.cs` | Governed-action persistence is in-memory and explicitly not durable across restart. | P2 must close crash and durability semantics before external effects. |
| MCP Gateway `GovernedExecuteHandler` | Existing tool flow asks Runtime to decide then execute. | It is a reusable boundary, not sufficient Fleet enforcement. |
| MCP Gateway `RuntimeClient` | Missing Runtime execution receipt is treated as malformed governance state and fails closed. | Preserve fail-closed receipt custody across new integrations. |
| `contracts/governed_invoke_envelope.v1.schema.json` | Gateway envelope is a reference map, not a verification signal; offline verification requires underlying artifacts. | Fleet summaries cannot stand in for receipt/evidence verification. |

## Authority and data-flow model to prove

```text
Remote user / Codex foreman
        |
        | proposes exact effect descriptor
        v
Keon Gateway + Runtime
        |
        | Runtime-issued IPermission only
        v
Fleet executor ---------------------> disposable container / VM
        |                                      |
        | derived FleetPermissionEnvelope      | no host repo mount
        |                                      | no provider secret
        |                                      v
        |                               Codex worker
        |                                      |
        |                              internal model request
        |                                      v
        |                              model gateway
        |                                      |
        |                         separate fleet.model.infer spend
        |                                      v
        |                                  provider
        v
immutable patch + evidence
        |
        v
foreman review
        |
        | separate fleet.patch.promote spend
        v
authoritative repository
```

## Initial trust boundaries

1. Human/foreman to Gateway: authenticated actor and exact proposed descriptor.
2. Gateway to Runtime: canonical decision, permission, spend, and receipt interfaces.
3. Runtime to executor/model gateway/promoter: audience-bound derived envelope plus proof;
   the receiver does not mint or widen authority.
4. Host to disposable environment: content-addressed source input, exact policy/image
   identity, no ambient mounts or secrets.
5. Worker to internal gateways: mutually authenticated worker/task identity and explicitly
   scoped methods only.
6. Internal gateway to external provider: credential custody, egress allowlist, payload and
   cost enforcement.
7. Worker/executor to evidence consumer: immutable content hashes and receipt lineage;
   self-reported success is untrusted.
8. Patch artifact to authoritative repository: independent review and a separate
   effect-time promotion permission.

## Initial threat model

| Threat | Required control or proof |
|---|---|
| Forged, replayed, expired, revoked, wrong-audience, or substituted permission/envelope | Canonical hash/signature verification, nonce/use ledger, effect-time revocation and expiry checks, audience binding, second-spend denial |
| Time-of-check/time-of-use descriptor drift | Prepare first, recompute effective descriptor, atomically spend immediately before the effect, exact environment/source hashes |
| Concurrent budget oversubscription or worker-slot race | One durable transaction for spend, reservation, slot acquisition, and pre-effect receipt |
| Crash after spend or ambiguous launch result | Permission remains consumed; durable `LAUNCH_FAILED`/ambiguous terminal state; process observation and reservation reconciliation; no blind retry |
| Executor or gateway impersonation | Workload identity, audience-bound permission projection, mutually authenticated internal channel, pinned service/environment identity |
| Host path, symlink, junction, submodule, archive, or patch traversal | Disposable Linux materialization, manifest validation, path normalization, no host bind mount, safe patch parser and target revalidation |
| Container/kernel breakout | Disposable VM for nonpublic data until independent isolation evidence approves a weaker tier; hardened host/runtime and resource limits |
| Arbitrary worker egress, DNS rebinding, SSRF, or secret exfiltration | No provider secret, default-deny namespace egress/DNS, internal names only, gateway destination pinning and payload policy |
| Model-cost overrun, streaming after budget exhaustion, or dishonest provider usage | Atomic reservation, hard response/token/time ceilings, measured reconciliation, provider/gateway evidence, fail-closed cutoff |
| MCP confused deputy or tool-argument widening | Per-tool capability with argument constraints, effect mapping, call counts, audience, expiry, and separate spend when consequential |
| Evidence omission, truncation, tampering, equivocation, or secret leakage | Content-addressed manifest, receipt chain, terminal completeness rules, redaction policy, independent offline verifier and negative vectors |
| Malicious patch, Git hooks, binary/symlink changes, or stale promotion target | Immutable patch manifest, independent review/test, clean target preconditions, hooks disabled/controlled, effect-time promotion revalidation |
| Supply-chain substitution | Pinned image digests, dependency provenance, SBOM/signature policy, environment identity binding |

## Permanent regression inheritance

Model Fleet V1 MF-P0 is retained as immutable negative evidence. GMF-P0 must map its exact
failures to GMF-NEG-001–004 and specify GMF-NEG-005–010 without editing the predecessor
record. Every scenario needs:

- a canonical input descriptor and permission state;
- a deterministic setup;
- an independent observation point;
- a required denial/error code and receipt state;
- zero-process, zero-egress, or zero-mutation evidence where applicable; and
- cleanup/rollback that cannot hide a failed assertion.

## Environment matrix

| Environment | Intended use | Current authorization |
|---|---|---|
| Local Docker/WSL2 disposable Linux | Deny-only tests and eventual synthetic/public positive control | Discovery only; no workload launch authorized |
| Disposable VM | Required boundary for private/internal source | Not selected or provisioned; no use authorized |
| External model provider | Governed inference only through model gateway | No call, spend, or disclosure authorized |
| Authoritative Git repository | Promotion target only through `fleet.patch.promote` | Read-only discovery; no promotion authorized |
| Staging/production | Future service integration/deployment | Out of Stage Zero and not authorized |

## Open questions GMF-P0 must close

1. Which existing Runtime transaction and persistence boundary can atomically combine
   permission spend, reservation, slot acquisition, and pre-effect receipt?
2. How are audience and nonce represented without weakening or duplicating `IPermission`?
3. What is the canonical schema and hash procedure for each effect descriptor, source
   identity, execution environment, patch artifact, and terminal evidence manifest?
4. How does the executor prove “zero worker processes” independently across crash and
   timeout cases?
5. Which VM technology and attestation evidence qualify for private/internal source?
6. How does the model gateway reserve and reconcile cost when provider pricing/usage is
   unavailable, delayed, or inconsistent?
7. What payload classifications and transformations are allowed at the inference boundary,
   and which remain unconditionally denied in V1?
8. Which existing MCP Gateway surface should carry Fleet proposals and capability scopes,
   and what stays in a dedicated service API?
9. What patch forms, file types, sizes, rename/symlink semantics, and host-worktree states
   are eligible for promotion?
10. What durable receipt/evidence store and signing/key-provider composition is required
    before external effects, given the current in-memory launch baseline?
11. How will new repositories be created, protected, bootstrapped, and pinned without
    silently granting that external action to a parcel?
12. Which exact `agent-skills` source/install packaging path represents the Codex foreman
    skill without treating a user-local copy as authoritative source?

## Stage Zero result

- A1–A7: ratified.
- Charter decisions D1–D24 and GMF-P0–GMF-P6: ratified 2026-09-04.
- Plan-level adversarial review: completed with `REQUEST CHANGES`; triage accepted a scoped
  Amendment A1 affecting named decisions and the graph; owner ratified it 2026-09-04.
- Gate 2: absent.
- Product implementation and external effects: not authorized.
