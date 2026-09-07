# Goal Charter — Governed Model Fleet

**Goal slug:** `governed-model-fleet`  
**Created:** 2026-09-03  
**Owner:** Clinton Morgan  
**Coordinator:** `/root` — current Remote-safe Codex conversation  
**Status:** STAGE ZERO CLOSED — Amendment A1 ratified; awaiting Gate 2 for GMF-P0  
**Mode:** multi-repository governed reference workload  
**Predecessor:** `model-fleet-v1`, frozen at MF-P0 `NO-GO`

## Ratified Stage Zero assumptions

The owner explicitly ratified these assumptions on 2026-09-03:

| ID | Ratified assumption |
|---|---|
| A1 | `keon-fleet-executor` and `keon-model-gateway` are separate service/repository boundaries. Their repositories do not yet exist locally; Stage Zero does not authorize creating them. |
| A2 | Docker/WSL2 may initially prove synthetic or public workloads. Private or internal source requires a disposable VM until independent security evidence approves another boundary. |
| A3 | Canonical descriptors, `IPermission` constraints, spend records, and receipt contracts belong to `keon-systems/keon-contracts`. `FleetPermissionEnvelope` is a derived executor projection only and is never independently authoritative or spendable. |
| A4 | Workers receive no host-repository bind mount. The executor materializes `base_commit + explicit overlay` in ephemeral Linux storage and returns immutable patch and evidence artifacts. |
| A5 | `fleet.worker.execute`, `fleet.model.infer`, and `fleet.patch.promote` are separate effects. Execution authority never implies inference authority; possession of output never implies promotion authority. |
| A6 | Gate 2 authorizes only named parcel dispatch. Provider spend, internal-source disclosure, repository promotion, deployment, and Gate 3 remain separate explicit human actions. |
| A7 | GMF-P0 is discovery, canon mapping, threat modeling, contract inventory, and preservation of permanent MF-P0 regression scenarios only. It performs zero product implementation. |

## Objective

Build Governed Model Fleet as Keon's reference workload for heterogeneous autonomous
execution. A Remote-controlled Codex foreman may propose and reconcile bounded work, but
Keon Runtime is the sole authority boundary and a disposable container or VM is the
isolation boundary. Workers obtain neither provider credentials nor direct access to the
authoritative host repository.

The reference workload must demonstrate governance across authority, isolation, source
identity, data disclosure, model consumption, cost, concurrency, artifact production, and
patch promotion while producing independently verifiable evidence. It succeeds only when
the allowed path and the permanent denial suite both pass in the named environments and an
offline verifier independently validates the complete receipt/evidence chain.

## Constitutional invariants

> No component that proposes, prepares, hosts, or executes a Fleet workload may
> independently confer authority to perform that workload. Authority originates
> exclusively from Runtime-issued `IPermission`, is bound to the complete effect
> descriptor, and is atomically consumed immediately before the corresponding effect.

> Possession of worker execution authority does not imply model inference authority.

> Possession of worker output does not imply repository mutation authority.

Runtime governs whether a precisely described effect may occur. The executor, VM,
container runtime, host OS, and network controls enforce isolation. Neither layer may be
represented as substituting for the other.

## Current evidence baseline

Passive local discovery on 2026-09-03 established:

- `D:\Repos\keon-omega\keon-systems` is on `main` at
  `2b6c75536f50f125155ee697446cec89f70f2fec` with a clean tracked worktree.
- `D:\Repos\keon-omega\keon-mcp-gateway` is on `main` at
  `d6376fd024d43be7ff458af675c646ae93c52492`; its pre-existing
  `.serena/project.yml` modification is outside this goal's current ownership.
- `keon-fleet-executor` and `keon-model-gateway` are not present under
  `D:\Repos\keon-omega`; no repository creation is authorized by this draft.
- `keon-systems/keon-contracts` already defines `ipermission.v1`,
  `permission_event.v1`, `permission_spend.v1`, and the receipt lifecycle profile.
  These artifacts identify themselves as contract candidates pending conformance.
- `IPermission` already binds effect class, effect-descriptor hash, constraints hash,
  policy version, expiry, use policy, use count, lineage, revocation reference, and
  permission hash. Existing spend verification fails closed on missing, expired, revoked,
  consumed, scope-mismatched, binding-mismatched, invalid-signature, unsupported, and
  human-oversight failures.
- Runtime's current launch authority is configuration-seeded and in-memory, the launch
  composition contains a placeholder allow-all rate limiter outside the active constraint
  path, and launch mode remains fail-fast.
- Runtime's current controlled execution handler performs no external I/O; its only effect
  is an internal governed-ledger append. Its launch ledger is currently in-memory.
- MCP Gateway already exposes a governed decide/execute path and fails closed when Runtime
  omits an execution receipt, but it does not establish Fleet-specific authority,
  isolation, provider credential custody, or model-spend accounting.

These observations are inputs to GMF-P0 and may drift. They are not claims that Runtime or
Gateway is already production-ready for Fleet execution.

## Ratified locked decisions

D1–D24 and the original GMF-P0–GMF-P6 phase graph were explicitly ratified by the owner on
2026-09-04. The completed plan review reopened Gate 1 for scoped changes. The owner
explicitly ratified [Amendment A1](amendment-a1.md) and its revised graph through GMF-P9 on
2026-09-04. The table and graph below incorporate that controlling amendment.

| ID | Decision | Reasoning |
|---|---|---|
| D1 | Governed Model Fleet is a successor initiative, not an amendment to Model Fleet V1. Every file and receipt under `model-fleet-v1` remains frozen negative evidence. | The failed host-local prototype established durable boundary requirements and must not be rewritten into apparent success. |
| D2 | Runtime-issued `IPermission` is the only canonical authority for every Fleet effect. The foreman, gateways, executors, profiles, prompts, role names, receipts, and evidence bundles confer no authority. | This extends Keon's authority model instead of creating a Fleet authority system beside it. |
| D3 | `FleetPermissionEnvelope` is the derived executor projection name. It may carry permission/effect identifiers, descriptor and constraints hashes, audience, nonce, expiry, remaining-use projection, approval binding, and proof material, but it is valid only as a presentation of the referenced canonical `IPermission`. It cannot be reissued, delegated, refreshed, or spent independently. | The executor needs a transport representation without accidentally gaining an authority primitive. |
| D4 | V1 governs three distinct effect classes: `fleet.worker.execute`, `fleet.model.infer`, and `fleet.patch.promote`. Each has its own complete descriptor, permission decision, spend, receipt binding, and denial path. | Instantiation, disclosure/cost, and authoritative mutation are different consequences. |
| D5 (A1) | Pre-spend preparation may create and attest only a blank, non-worker isolation shell with no source, credentials, external network, model/MCP gateway, or authoritative-repository access. After recomputing the descriptor, one atomic `fleet.worker.execute` spend immediately precedes one isolated root process tree. Post-spend bootstrap materializes and verifies source before cognition. Any bootstrap, manifest, launch, or runtime failure consumes the permission, terminates the tree, reconciles reservations, and cannot retry under that permission. | This makes source transfer part of the authorized execution consequence while preserving one-spend/one-process-tree and non-replay semantics. |
| D6 (A1) | Runtime owns one durable transaction boundary that atomically validates revocation, expiry, descriptor, audience, nonce, policy, and lineage; consumes permission; records a unique effect attempt; reserves budget; acquires concurrency; and persists the pre-effect receipt plus pending-effect state under database isolation/uniqueness guarantees. Reservations are accounting, not authority. Unknown cost remains reserved until append-only settlement, adjustment, or human resolution; recovery never resurrects permission. | Current spend, receipt, and soft-budget seams are not atomic enough for external effects or concurrent accounting. |
| D7 | Every complete effect descriptor is canonicalized and hashed. It binds tenant, actor/worker/task identity, effect class, audience, nonce, expiry, repository/source identity, execution-environment identity, role, filesystem and network policy, provider/model and data class where applicable, cost/runtime/call limits, approval references, artifact targets, and contract versions. Material descriptor drift requires a new permission. | A permission for effect A must be unusable for a similar-looking effect B. |
| D8 | Source identity is `base_commit + explicit overlay`, represented by repository ID, canonical remote identity, commit SHA, source-tree hash, source-manifest hash, submodule-manifest hash, uncommitted-overlay hash, and materialization method. Ambient dirty state is forbidden. | Commit identity alone does not bind deliberately included local changes or submodule state. |
| D9 (A1) | The executor never bind-mounts the authoritative repository. Before spend it may validate declared identity and prepare only a blank isolation boundary. After spend and root-tree start, a narrow bootstrap channel materializes the exact source into disposable Linux storage, verifies source/overlay manifests before cognition, closes the channel, and later exports only content-addressed patch/evidence artifacts. Mismatch terminates the effect with a consumed-permission failure outcome. | This removes ambient host state and closes the pre-spend disclosure gap. |
| D10 (A1) | `ExecutionEnvironmentIdentity` binds executor and guest/base-OS image digests; executor, kernel, hypervisor/isolation, policy-engine, and enforcement-plane versions/identities; host-security and boot/config attestation; network, DNS, filesystem, process, and resource-policy digests; runtime profile; and evidence-contract version, all with explicit canonical byte domains. The instantiated environment independently attests the exact match before spend. | Authorization for environment A cannot degrade to a similar environment B. |
| D11 (A1) | Docker/WSL2 may prove deny-only and synthetic/public workloads only after complete environment and policy attestation. Private/internal source requires an independently reviewed disposable VM matching every descriptor-bound guest, kernel, hypervisor, enforcement, boot/config, and resource control. Isolation eligibility never implies disclosure authority. | Runtime governs capabilities; the hardened execution environment enforces isolation. |
| D12 | Workers receive no OpenRouter or other provider credentials, no arbitrary DNS, and no direct outbound TLS. Their only network surfaces are explicitly named internal gateways. The model gateway owns external provider credentials and enforces provider, model, task, data class, payload binding, spend, and expiry before forwarding. | Credential custody and egress enforcement must remain outside model-controlled code. |
| D13 (A1) | One exact outbound provider attempt is one `fleet.model.infer` effect and consumes one permission. V1 prohibits automatic downstream retries and provider/model fallback; every attempt needs a new nonce, permission, spend, and ordinal. The descriptor binds canonical request bytes/hash, endpoint, provider request/idempotency ID, model/revision, data class, pricing snapshot/currency, token/call/time/stream ceilings, reserved cost, and remaining budget. The gateway enforces cutoff and distrusts worker usage claims. | Provider attempts—not client streams—are the auditable disclosure and cost unit. |
| D14 | MCP access is capability-scoped by server identity, exact tool names, argument constraints, mapped effect class, maximum calls, audience, and expiry. Network reachability to a server alone never authorizes a tool invocation. | This prevents the worker or an MCP server from becoming a confused deputy. |
| D15 (A1) | Worker output is immutable evidence. A separately deployable, audience-bound Fleet Promotion Actuator—sourced from `keon-fleet-executor` but isolated from worker/executor identity—is the only V1 `fleet.patch.promote` actuator. It revalidates patch/source/target hashes, target HEAD, allowed paths/forms, reviews, human approval, clean-state, and lock/CAS immediately before spend, then atomically stages into a new isolated promotion worktree/ref with terminal rollback/compensation evidence. It cannot merge; Gate 3 remains human. | Promotion needs a trusted actuator and target distinct from both worker output and protected-branch merge authority. |
| D16 (A1) | Fleet profiles Keon's existing seven receipt types. Every effect records durable denial or one terminal outcome; append-only settlement may refine unknown cost without rewriting history. Inference distinguishes pre-send failure, sent/usage-pending, unknown post-send failure/cancellation, settlement, and adjustment/refund; execution distinguishes bootstrap/materialization/manifest/launch/runtime/termination failures; promotion distinguishes rejection, isolated staging/apply, rollback/compensation, and partial/ambiguous failure. Offline verification trusts canonical bytes, signatures, and complete lineage. | External effects need explicit terminal and settlement semantics without a parallel receipt vocabulary. |
| D17 (A1) | The executor allow path is absent or disabled through GMF-P4B. P4B's deny-only implementation must complete independent review and the human-controlled merge/acceptance boundary before P4C may be shaped or dispatched. P4C alone may enable one bounded synthetic/public positive path. MF-P0 failures remain GMF-NEG-001–010, and P0 adds inference, MCP, accounting, materialization, process-tree, evidence, and promotion negatives. | Denial enforcement must close independently before any allow path exists. |
| D18 | Initial roles are `researcher`, `reviewer`, `builder`, `tester`, and `documenter`. A role is a policy input and task contract, never an authority grant. Role limits are maximums; exact descriptors and permissions may narrow them further. | Cognitive specialization is useful, but role labels must not become ambient capability. |
| D19 (A1) | Contracts and Runtime authority/accounting live in `keon-systems`; MCP admission in `keon-mcp-gateway`; credentialed forwarding in future `keon-model-gateway`; disposable execution and Promotion Actuator source in future `keon-fleet-executor`; the foreman skill in `agent-skills`; offline verification in `Keon.Verify`. Promotion has a distinct audience, deployable identity, and trust boundary despite sharing a source repository. Cortex/Control remain outside V1 absent amendment. | Every consequential surface now has an explicit owner without duplicating Keon authority. |
| D20 | Gate 2 authorizes only the named parcel dispatch and its Allowed Files. It never authorizes repository creation, provider spend, private/internal disclosure, patch promotion, deployment, publication, merge, or Gate 3. Each such consequential action requires its own explicit human authorization at the actual boundary. | Process authority must remain narrower than external effect authority. |
| D21 (A1) | A satisfied spend is permanently consumed even when the effect fails, is ambiguous, or settles at zero. Worker, provider, and promotion retries are new effects with new nonce, attempt-specific descriptor, permission, and foreman proposal. Idempotency may return the recorded effect/receipt but never create a second process tree, provider attempt, or patch application. Unknown post-send inference cost stays reserved until append-only settlement or human resolution. | Non-replay must apply uniformly across all three effect classes. |
| D22 (A1) | Synthetic/public proof is the only default. Private/internal source transfer into a disposable VM is part of `fleet.worker.execute` and requires a human grant bound to exact source and VM identities, task, role, internal gateway audiences, provider/model/data class, cost ceiling, and expiry. Model transmission still needs a separate `fleet.model.infer` spend. Credentials, regulated data, secrets, and ambiguous data remain denied until separately ratified. | Isolation approval, source disclosure, and model disclosure remain distinct checks. |
| D23 | The foreman may decompose, propose, request authority, inspect evidence, reconcile workers, reject outputs, and present a final judgment. It may not mint permissions, widen descriptors, bypass denial, treat worker claims as acceptance, or promote a patch without the dedicated effect path. | The coordinator remains accountable without becoming the governor. |
| D24 | Dynamic empirical routing, unrestricted multi-provider fallback, host-repository execution, native Remote subagent provider switching, production deployment, automatic publication, autonomous merging, and self-authorized budget increases are out of GMF V1 scope. | V1 proves the authority and evidence spine before optimizing the model exchange. |

## Repository and track map

| Track | Owning repository | V1 responsibility | Current state |
|---|---|---|---|
| Governance | `D:\Repos\agent-skills` | Charter, parcel records, distributable foreman skill/package | Existing; only goal docs authorized now |
| Authority/contracts/verifier | `D:\Repos\keon-omega\keon-systems` | Effect descriptors, constraints, spend/accounting, receipts, offline verification | Existing; no edits authorized now |
| MCP boundary | `D:\Repos\keon-omega\keon-mcp-gateway` | Capability-scoped governed MCP admission | Existing and pre-dirty; no edits authorized now |
| Model gateway | Proposed `Keon-Systems/keon-model-gateway` | Credential custody and governed inference forwarding | Repository absent; creation requires human action |
| Fleet executor | Proposed `Keon-Systems/keon-fleet-executor` | Disposable materialization, isolation, launch, evidence export | Repository absent; creation requires human action |

The user-local installed skill and any local service deployment are release/install outputs,
not authoritative source. They are not created during Stage Zero.

## Phase graph

```text
GMF-P0 -> GMF-P1 -> GMF-P2A -> GMF-P2B -> GMF-P2C
                                      |
                     +----------------+----------------+
                     |                                 |
                 GMF-HG-R1                          GMF-P5
           human repo creation gate              MCP admission
                     |
             +-------+-------+
             |               |
          GMF-P3A         GMF-P4A
          model-gateway   executor baseline
          baseline            |
             |             GMF-P4B
          GMF-P3B         deny-only + independent closure
          model gateway       |
             +-------+--------+
                     v
                  GMF-P4C
                  bounded public allow path
                     |
                  GMF-P6
                  Promotion Actuator
                     |
               +-----+-----+
               |           |
            GMF-P7       GMF-P8
            foreman      offline verifier
               |           |
               +-----+-----+
                     v
                  GMF-P9
                  verification-only adversarial E2E
```

## Parcel definitions

| Parcel | Outcome | Routing and review class | Dependencies | No-go boundary |
|---|---|---|---|---|
| GMF-P0 | Verifies repos/canon, trust/data flows, threat model, contract gaps, environment feasibility, and expanded permanent negatives. | Architecture/security; two independent reviews | Ratified Stage Zero | Zero product implementation, provider calls, repo creation, or deployment |
| GMF-P1 | Freezes effect, source, environment, envelope, artifact, terminal, receipt, and evidence contracts. | Contract/architecture/security; two independent reviews | GMF-P0 | Frozen-canon change reopens Gate 1 |
| GMF-P2A | Builds the durable Runtime authority/accounting store and migration. | Runtime/data/security; two independent reviews | GMF-P1 | Effect path stays disabled |
| GMF-P2B | Builds atomic validation, spend, reservation, concurrency, pending-effect, and pre-effect receipt transaction. | Runtime/concurrency/security; two independent reviews | GMF-P2A | No external effect |
| GMF-P2C | Builds terminal reconciliation, lease recovery, settlement, and verification primitives. | Runtime/recovery/security; two independent reviews | GMF-P2B | Recovery cannot reauthorize or replay |
| GMF-HG-R1 | Human creates/protects the two ratified service repositories and establishes initial base commits. This is a prerequisite, not a parcel. | Human external action | GMF-P0/P1 findings available | No inferred or standing authority |
| GMF-P3A | Adds reviewed model-gateway repository scaffolding, CI, supply-chain policy, signing/trust configuration, and service identity. | Supply-chain/security; two independent reviews | GMF-HG-R1 | No provider credential or call |
| GMF-P3B | Implements governed model forwarding, per-attempt spend, cutoff, cost reservation/settlement, and deny-first egress. | Security/external-cost; two independent reviews | GMF-P2C, GMF-P3A | No paid call/nonpublic disclosure without separate human authority |
| GMF-P4A | Adds reviewed executor repository scaffolding, CI, supply-chain policy, signing/trust configuration, and service identities. | Supply-chain/security; two independent reviews | GMF-HG-R1 | No workload launch |
| GMF-P4B | Implements blank preparation, attestation, post-spend materialization, process-tree control, and deny-only enforcement. | Isolation/security; two independent reviews | GMF-P2C, GMF-P4A | Allow path mechanically absent/disabled |
| GMF-P4C | Enables exactly one bounded synthetic/public allowed execution path after P3B/P4B independently close. | Isolation/integration/security; two independent reviews | GMF-P3B, accepted GMF-P4B | No private/internal source |
| GMF-P5 | Implements capability-scoped MCP admission, argument binding, counters, expiry/audience checks, transport parity, and no-bypass tests. | Gateway/security; two independent reviews | GMF-P1, GMF-P2C | No generic reachability-as-authority |
| GMF-P6 | Implements the isolated Promotion Actuator and safe isolated-worktree/ref application path. | Repository mutation/security; two independent reviews | GMF-P1, GMF-P2C, GMF-P4C | Cannot merge or touch protected/default branch |
| GMF-P7 | Implements the foreman adapter and distributable skill without conferring authority. | Agentic architecture/security; two independent reviews | GMF-P3B, P4C, P5, P6 | No user-local installation/default activation |
| GMF-P8 | Implements and independently accepts the offline Fleet verifier and fixtures. | Evidence/security; two independent reviews | GMF-P1, P2C, P3B, P4C, P5, P6 | Does not run the final proof it will judge |
| GMF-P9 | Runs verification-only adversarial E2E proof and assembles Gate 3 evidence; verifier source/fixtures are forbidden from Allowed Files. | System/security/release; two independent reviews | GMF-P7, independently accepted P8 | No production deploy/public release/routine private-source use |

Every parcel receives an independently shaped spec with exact repositories, base commits,
Allowed Files, test commands, rollback, and acceptance evidence. This charter does not grant
those scopes in advance.

## Permanent negative regression suite

| ID | Scenario | Required result |
|---|---|---|
| GMF-NEG-001 | Required isolation unavailable | Zero worker processes |
| GMF-NEG-002 | Filesystem escape attempted | Outside ephemeral root is inaccessible |
| GMF-NEG-003 | Unauthorized network attempted | No packet reaches an external destination |
| GMF-NEG-004 | Permission/profile disagreement | Runtime authority wins and execution is denied |
| GMF-NEG-005 | Permission replay | Second spend is denied |
| GMF-NEG-006 | Descriptor substitution | Spend is denied |
| GMF-NEG-007 | Audience mismatch | Spend is denied |
| GMF-NEG-008 | Permission revoked after issuance | Spend is denied |
| GMF-NEG-009 | Permission expired | Spend is denied |
| GMF-NEG-010 | Executor cannot establish required policy | Zero worker processes and a failure receipt |

P0 must turn each scenario into a reproducible contract with an observation point that is
independent of the component under test. Later parcels may add cases but may not weaken or
delete these ten without a ratified amendment.

## Security and evidence gates

- No allowed launch path before deny-only P4 evidence closes.
- No private/internal source before the disposable-VM boundary passes independent review.
- No provider request without a separate satisfied `fleet.model.infer` spend.
- No worker provider secret, arbitrary DNS, arbitrary outbound TLS, host repository mount,
  or implicit MCP capability.
- No patch application without target/source revalidation and a satisfied
  `fleet.patch.promote` spend immediately before mutation.
- No acceptance based solely on worker JSON, gateway summaries, self-produced test logs,
  or a success status. The coordinator inspects artifacts; fresh reviewers and the offline
  verifier provide independent evidence.
- Any missing receipt, unverifiable signature/hash, transaction ambiguity, descriptor
  mismatch, reservation leak, or terminal-receipt gap fails closed.

## Exit criterion

Governed Model Fleet V1 is complete only when all of the following are true at one declared
set of repository commits and environment identities:

1. GMF-P0–GMF-P6 have completed their parcel loops with fresh required reviews and human
   merge/release decisions.
2. The three effect classes are independently authorized, spent, receipted, and denied.
3. A synthetic/public researcher → builder → reviewer workflow runs inside the approved
   disposable boundary with zero worker-held provider credentials and no host-repository
   mount.
4. The worker's immutable patch is reviewed and promoted only through a separate
   `fleet.patch.promote` effect.
5. GMF-NEG-001–010 pass using independent observation points, including zero-process and
   zero-egress assertions.
6. Budget and concurrency races, crash-after-spend, replay, revocation, expiry, descriptor
   substitution, and terminal reconciliation pass deterministic tests.
7. The offline verifier validates the complete permission, spend, execution, inference,
   artifact, promotion, and terminal evidence chain without network access and rejects
   tampering or omission.
8. The foreman independently reconciles source, patch, test, receipt, and verifier evidence
   and presents an honest Gate 3 package.

Completion does not imply production deployment, private-source approval, publication, or
default activation.

## Standing authorizations and gates

| Gate/action | Current state |
|---|---|
| Stage Zero assumptions A1–A7 | **Ratified** |
| Draft this successor charter and passive discovery record | **Authorized** |
| Gate 1 — ratify D1–D24 and the phase graph | **Granted 2026-09-04** |
| Plan-level adversarial review | **Completed — `REQUEST CHANGES`**; triage is recorded in `plan-review-findings.md` |
| Scoped Gate 1 — Amendment A1 | **Granted 2026-09-04**; controlling text incorporated above |
| Gate 2 — parcel dispatch | **Not granted** |
| Repository creation | **Not granted** |
| Provider spend or external model call | **Not granted** |
| Private/internal source disclosure | **Not granted** |
| Patch promotion into an authoritative repository | **Not granted** |
| Merge, deployment, publication, user-local installation, or Gate 3 | **Not granted** |

## Stop conditions

Stop and return to the owner when:

- a proposed change would weaken a constitutional invariant or alter D1–D24;
- a required repository, environment, authoritative contract, or independent observation
  point is unavailable;
- an existing goal or writer owns overlapping files;
- a contract owner, effect class, receipt lifecycle, source identity, data class, provider
  destination, budget rule, or promotion target is ambiguous;
- a security finding cannot close inside its parcel;
- a parcel requires provider spend, internal disclosure, repo creation, promotion,
  installation, merge, deployment, or publication without its separate human authority;
- a retry would reuse spent authority or an idempotency ambiguity could create a second
  effect; or
- any implementation is proposed before Gate 1 and plan-level review close.

## Gate 1 ratification record

The owner explicitly ratified Governed Model Fleet D1–D24 and GMF-P0–GMF-P6 on
2026-09-04. This ratification authorizes the already-requested plan-level adversarial review;
it does not grant Gate 2 or any external effect listed above.

The fresh plan review returned `REQUEST CHANGES`. Coordinator triage accepted the
load-bearing findings. The owner explicitly ratified [Amendment A1](amendment-a1.md) and
the revised graph through GMF-P9 on 2026-09-04. Stage Zero is closed. This does not grant
Gate 2 or any external effect.
