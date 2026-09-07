---
ticket: GMF-P0
title: Governed Model Fleet discovery and permanent negative contracts
status: draft
owner: clinton.morgan
created: 2026-09-04
updated: 2026-09-04
supersedes: null
superseded_by: null
risk: critical
surfaces:
  - plugins/foreman-line/docs/goals/governed-model-fleet/gmf-p0-*.md
  - plugins/foreman-line/docs/specs/active/GMF-P0-governed-model-fleet-discovery-and-negative-contracts.md
  - plugins/foreman-line/docs/specs/active/gmf-p0-governed-model-fleet-discovery-and-negative-contracts.shaping-result.json
routing_class: architecture/risk
permission_profile: builder-architecture
data_classification: internal
---

# GMF-P0 — Governed Model Fleet discovery and permanent negative contracts

## Intent

Produce a passive, evidence-linked discovery baseline for Governed Model Fleet before any
product implementation or external effect is authorized. The parcel maps repository,
canon, environment, authority, data-flow, contract, threat, and negative-scenario facts;
it converts the inherited and Amendment-A1-required denial cases into permanent,
reproducible specifications; and it assembles a truthful P0 closure record for the next
bounded Gate-2 decision. Its consumers are the GMF coordinator, the two independent P0
reviewers, the human Gate-2 owner, and the later GMF-P1 contract parcel.

## Constraints

- The controlling authority is the ratified Governed Model Fleet charter as amended by A1,
  the closed plan-review findings, the discovery record, and the loop directive, at the
  exact shaping-time SHA-256 pins listed below. A hash mismatch is drift to reconcile, not
  permission to reinterpret canon.
- GMF-P0 is zero implementation. It may inspect local text, Git metadata, tool versions,
  configuration, and already-present artifacts. It must not edit product repositories,
  exercise a product effect path, or create executable product code, schemas, migrations,
  fixtures, tests, services, images, repositories, or deployments.
- No provider/model call, workload process, MCP workload, container, WSL distribution, or
  VM may be launched. No network probe, package installation, dependency resolution,
  credential access, source upload, source disclosure, paid action, or external mutation is
  allowed. Version/status queries must remain passive and local.
- Do not create or protect `keon-model-gateway` or `keon-fleet-executor`. Their absence is
  evidence and the human prerequisite `GMF-HG-R1` remains unsatisfied.
- Do not edit `charter.md`, `amendment-a1.md`, `plan-review-findings.md`, `discovery.md`,
  `loop-directive.md`, the goal index, any file under `model-fleet-v1`, or any product repo.
  Model Fleet V1 is immutable predecessor evidence.
- Runtime-issued `IPermission` remains the sole authority. A role, prompt, profile,
  `FleetPermissionEnvelope`, receipt, evidence file, readiness recommendation, or this spec
  cannot authorize an effect.
- Treat `fleet.worker.execute`, `fleet.model.infer`, and `fleet.patch.promote` as separate
  effects with separate descriptors, permissions, spends, receipts, terminal states, and
  denial paths. Never collapse source materialization, provider attempt, or promotion into
  ambient execution authority.
- Preserve D5/D9 timing: pre-spend preparation is blank and source-free; one satisfied
  execution spend precedes one isolated root process tree; source materialization is
  post-spend and pre-cognition; failure consumes authority and cannot retry under it.
- Preserve D13/D21 timing: one exact provider attempt is one spend; automatic retry and
  fallback are prohibited; an unknown post-send charge remains reserved until append-only
  settlement or human resolution.
- Preserve D15: only the separately deployable Promotion Actuator may stage into a new
  isolated worktree/ref; it cannot merge and Gate 3 remains human.
- Findings must distinguish observed fact, ratified requirement, inference, proposal,
  unresolved decision, unavailable evidence, and stale evidence. A missing product
  decision is recorded as a blocking decision request; the builder must not invent it.
- All five output records are Markdown governance/evidence artifacts. They must contain no
  credentials, tokens, customer data, PII, internal endpoints, or copied proprietary source.
- The optional shaping red-team is intentionally not run for this critical draft because
  the governing authority forbids provider calls. P0 still requires two independent fresh
  architecture/security reviews after Gate 2 and after its evidence is complete.
- `status: draft` is mandatory until coordinator lint and an explicit human Gate-2 decision.
  A passing advisory self-check or a `READY` recommendation never flips status or grants
  dispatch.

## Acceptance Criteria

- [ ] `gmf-p0-repository-canon-environment-map.md` records, with command/evidence provenance,
  every repository path, remote, branch, exact local HEAD, tracked/untracked state, absent
  future repository, applicable instruction file, governing-record hash, relevant tool
  version, and available isolation-environment metadata that can be learned passively. It
  labels every observation time and drift risk; it does not claim environment eligibility.
- [ ] The map distinguishes the authoritative source repositories from user-local installs,
  runtime deployments, proposed repositories, and the frozen `model-fleet-v1` predecessor.
  It records that no container/VM/workload/provider path was launched or probed.
- [ ] `gmf-p0-contract-inventory.md` maps each ratified effect and boundary to its current
  owning repository, exact source/contract anchor, current status, canonicalization/hash
  domain if present, producer, verifier/consumer, durability/transaction seam, receipt
  lifecycle, and P1 gap. Current code is never described as Fleet-ready merely because a
  nearby primitive exists.
- [ ] The contract inventory explicitly covers canonical `IPermission`, derived
  `FleetPermissionEnvelope`, worker/inference/promotion descriptors, `SourceIdentity`,
  `ExecutionEnvironmentIdentity`, MCP capabilities, artifact/evidence manifests, atomic
  spend/reservation/concurrency/pending-effect state, terminal reconciliation/settlement,
  signing/trust bundles, and offline verification.
- [ ] `gmf-p0-threat-model.md` maps trust boundaries, protected assets, actors, entry/exit
  points, data classes, misuse cases, controls, independent observers, residual risks, and
  downstream parcel ownership. It includes source/materialization, process tree, network,
  provider cost, MCP confused-deputy, evidence, supply-chain, and promotion boundaries.
- [ ] The threat model distinguishes Runtime authorization from OS/container/VM enforcement
  and records that neither substitutes for the other. It treats every absent repository,
  unselected VM/enforcement plane, non-durable state seam, and unavailable independent
  observer as an explicit gap rather than assumed capability.
- [ ] `gmf-p0-permanent-negative-scenarios.md` contains one row/specification for every
  mandatory scenario ID GMF-NEG-001 through GMF-NEG-066 below. No ID is omitted, merged,
  renamed, weakened, or deleted; additional cases require additive IDs and provenance.
- [ ] Every negative specification states: effect and trust boundary; fixture/data class;
  canonical descriptor and permission state; deterministic setup; single injected fault;
  exact expected decision/error code or an explicit `BLOCKED_UNRATIFIED_ERROR_CODE`;
  expected permission/spend/reservation/concurrency/receipt/terminal state; independent
  observation point; required zero-process/zero-egress/zero-source/zero-provider-attempt/
  zero-mutation assertion as applicable; cleanup that cannot erase the assertion; and the
  downstream parcel that must implement and prove it.
- [ ] For pre-spend denials the scenario requires zero effect and durable denial evidence.
  For post-spend execution/promotion failures it requires permanent consumption, one effect
  attempt at most, termination/compensation as applicable, durable terminal evidence, and
  no retry under the same permission. For sent/unknown inference outcomes it requires
  permanent consumption, retained reservation, no automatic retry/fallback, and append-only
  settlement only.
- [ ] All scenario observers are independent of the component under test. A component's own
  status, log, summary, or worker JSON may be corroboration but never the sole proof. Any
  scenario lacking an available independent observer is `HOLD`, not passing.
- [ ] `gmf-p0-closure-evidence.md` is a bounded evidence index and P0 decision package, not
  an approval. It records exact files/hashes, commands and outputs, unresolved findings,
  negative-case coverage, review verdicts, collision state, authority boundaries, and a
  single `READY_TO_REQUEST_GMF_P1_GATE_2` or `HOLD` recommendation with reasons.
- [ ] No output makes GMF-P1 dispatchable or represents that Gate 2, repository creation,
  provider spend, source disclosure, promotion, merge, installation, deployment,
  publication, or Gate 3 has been granted.
- [ ] The parcel changes only the exact Allowed Files. `git diff --check` is clean, all
  factual claims reconcile to local evidence, and the spec/advisory lint remains green.
- [ ] Two fresh, independent, read-only architecture/security reviewers assess the exact P0
  evidence set with no builder context and return explicit verdicts. No unresolved Critical,
  High, or decision/graph-changing finding may remain before a Gate-2 readiness
  recommendation; reviewers do not fix, commit, call providers, launch workloads, or mutate
  external state.

## Out of Scope

- Product implementation in `agent-skills`, `keon-systems`, `keon-mcp-gateway`, or any
  future Fleet repository, including code, schemas, migrations, fixtures, or tests.
- Creating/protecting service repositories or satisfying `GMF-HG-R1`.
- Selecting or provisioning a VM, container, WSL distribution, hypervisor, enforcement
  plane, service identity, key provider, signing root, durable database, provider, model,
  pricing source, or production environment.
- Provider/model/MCP calls, network or egress tests, workload/process-tree launches,
  container or VM activity, secret inspection, paid activity, and any private/internal
  source transfer or disclosure.
- Changing A1–A7, D1–D24 as amended, the GMF-P0–P9 graph, receipt-type count, effect classes,
  ownership boundaries, retry semantics, data-class policy, promotion authority, or any
  frozen/candidate contract.
- Implementing or executing any negative scenario. P0 writes exact permanent specifications
  and evidence requirements only.
- Promotion, patch application, worktree/ref staging against a product repository, merge,
  installation, activation, deployment, publication, receipt minting, or Gate 3.
- Editing, reinterpreting, or refreshing any file under `model-fleet-v1`.

## Context & References

- `plugins/foreman-line/docs/goals/governed-model-fleet/charter.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/amendment-a1.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/plan-review-findings.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/discovery.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/loop-directive.md`
- `plugins/foreman-line/docs/SPEC-CONVENTION.md`
- `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`
- `plugins/foreman-line/skills/parcel-driven-development/SKILL.md`
- `plugins/foreman-line/permission-profiles/permission-profiles.yaml`
- `D:/Repos/keon-omega/keon-systems/keon-contracts/contracts/ipermission.v1.json`
- `D:/Repos/keon-omega/keon-systems/keon-contracts/contracts/permission_event.v1.json`
- `D:/Repos/keon-omega/keon-systems/keon-contracts/contracts/permission_spend.v1.json`
- `D:/Repos/keon-omega/keon-systems/keon-contracts/contracts/receipt_lifecycle_profile.v1.json`
- `D:/Repos/keon-omega/keon-systems/src/Keon.Contracts/Permission.cs`
- `D:/Repos/keon-omega/keon-systems/src/Keon.Verify/PermissionSpendVerifier.cs`
- `D:/Repos/keon-omega/keon-systems/src/Keon.Runtime/Observability/Persistence/SqlitePermissionSpendLedger.cs`
- `D:/Repos/keon-omega/keon-systems/src/Keon.Runtime/Execution/ExecutionDispatcher.cs`
- `D:/Repos/keon-omega/keon-systems/src/Keon.Runtime/Execution/ControlledExecutionHandler.cs`
- `D:/Repos/keon-omega/keon-systems/src/Keon.Runtime.Api/LaunchAuthority.cs`
- `D:/Repos/keon-omega/keon-systems/src/Keon.Runtime.Api/LaunchExecution.cs`
- `D:/Repos/keon-omega/keon-mcp-gateway/contracts/governed_invoke_envelope.v1.schema.json`
- `D:/Repos/keon-omega/keon-mcp-gateway/src/Keon.McpGateway/Tools/GovernedExecuteHandler.cs`
- `D:/Repos/keon-omega/keon-mcp-gateway/src/Keon.McpGateway/Runtime/RuntimeClient.cs`

## Shaping-Time Passive Baseline

Observed locally on 2026-09-04; every value must be refreshed at builder Step 0 and drift
must stop execution until the coordinator reconciles it.

| Repository/environment | Observation |
|---|---|
| `D:/Repos/agent-skills` | `main` at `5ce6ddc7f996d764e506b6b421779fbf3ece689a`; origin `https://github.com/m0r6aN/agent-skills.git`; pre-existing dirty work includes `chrome/chrome-native-host.bat`, `.claude/settings.json`, goal index, `foreman-kernel`, `governed-model-fleet`, and `model-fleet-v1` paths |
| `D:/Repos/keon-omega/keon-systems` | clean `main` at `2b6c75536f50f125155ee697446cec89f70f2fec`; origin `https://github.com/Keon-Systems/keon-systems.git` |
| `D:/Repos/keon-omega/keon-mcp-gateway` | `main` at `d6376fd024d43be7ff458af675c646ae93c52492`; pre-existing `.serena/project.yml` modification; origin `https://github.com/Keon-Systems/keon-mcp-gateway.git` |
| Future repositories | `D:/Repos/keon-omega/keon-model-gateway` and `D:/Repos/keon-omega/keon-fleet-executor` absent |
| Host/tool surface | Windows `10.0.26200.0` x64; PowerShell `7.6.5`; Git `2.45.2.windows.1`; Node `24.7.0`; npm `11.6.2`; .NET SDK `10.0.303`; Codex CLI `0.153.2`; Docker client/server `29.7.2`; WSL default `Ubuntu-22.04`, version 2 |

The named future parcel branch is `codex/gmf-p0-discovery-20260904`; the named future
worktree is `D:/Repos/agent-skills-worktrees/gmf-p0-discovery-20260904`. Both were absent at
shaping time and must not be created before explicit Gate 2. Because the governing GMF
records are currently uncommitted relative to the observed `agent-skills` HEAD, the
coordinator must provide them to the future builder as hash-identical read-only inputs or
first establish a reviewed Git base outside this parcel. The builder may not copy, edit, or
commit those existing records under GMF-P0 authority.

Shaping-time governing-record SHA-256 pins:

| Record | SHA-256 |
|---|---|
| `charter.md` | `cfb1557b25e01d892daeb01fb94cf31869f963c3cdf4eb81043dbc05705b938e` |
| `amendment-a1.md` | `22d681f0fc8786fc501a555143d6f3687495457d67647207ecd479377170e501` |
| `plan-review-findings.md` | `b784ed7656294d19e887c3a221e5eb8354160bb3f647530e2d3c1519532bd5ff` |
| `discovery.md` | `56affe5c3e77e8a260abe88df4cf5662b3ff541ff0c0a6525d193f018cfd9e2d` |
| `loop-directive.md` | `14ec886b7d3de64f10359bb42641b542ff43a40c6bd661dba04d4b13b4f045cf` |
| `SPEC-CONVENTION.md` | `7ac315005cde6ad6def848b83de1d1b644e321c5d9f6434bc925deb6daba8703` |

## Required Output Contract

The five P0 output files must use a common evidence vocabulary:

- `OBSERVED`: directly reproduced from local read-only evidence, with timestamp and command
  or path.
- `RATIFIED`: controlling charter/amendment text, with decision ID.
- `INFERRED`: a bounded conclusion whose premises are cited and whose uncertainty is stated.
- `GAP`: required by canon but absent, incomplete, unowned, unverifiable, or not yet chosen.
- `DECISION_REQUIRED`: a product/architecture choice that only the owner/coordinator may
  ratify. P0 records options and consequences but chooses none.
- `STALE`: prior evidence that no longer matches the refreshed observation.
- `NOT_TESTED`: prohibited or unavailable empirical proof; never treated as passing.

Each file begins with parcel ID, observation window, repositories/commits inspected,
governing-record hashes, author role, mutation statement, prohibited-actions statement, and
an evidence index. Cross-file claims use stable IDs and reciprocal links; prose summaries
cannot replace the underlying evidence row.

## Permanent Negative Scenario Baseline

The output must specify all IDs below individually. The label is the single injected fault;
each row supplies the remaining exact fields required by Acceptance Criteria.

| ID | Single injected fault | Mandatory result family |
|---|---|---|
| GMF-NEG-001 | Required isolation is unavailable. | Zero worker processes; denied before spend. |
| GMF-NEG-002 | Worker attempts filesystem escape outside the ephemeral root. | Outside path is independently observed inaccessible; no host mutation. |
| GMF-NEG-003 | Worker attempts unauthorized external network or DNS. | Independent network observer records zero external packets. |
| GMF-NEG-004 | Permission and runtime profile disagree. | Runtime authority wins; zero worker process. |
| GMF-NEG-005 | A consumed permission is replayed. | Second spend and second effect are denied. |
| GMF-NEG-006 | Any bound effect-descriptor field/hash is substituted. | Spend is denied; zero effect. |
| GMF-NEG-007 | Permission/envelope audience differs from the actuator. | Spend is denied; zero effect. |
| GMF-NEG-008 | Permission is revoked after issuance but before spend. | Effect-time validation denies; zero effect. |
| GMF-NEG-009 | Permission expires before spend. | Effect-time validation denies; zero effect. |
| GMF-NEG-010 | Executor cannot establish or attest required policy. | Zero worker processes and durable failure/denial evidence. |
| GMF-NEG-011 | `fleet.model.infer` permission is replaced or absent. | Zero provider attempts; durable denial. |
| GMF-NEG-012 | Canonical inference request bytes/hash differ after authorization. | Zero provider attempts; descriptor mismatch denial. |
| GMF-NEG-013 | Provider identity or endpoint is substituted. | Zero provider attempts to both approved and substituted endpoints. |
| GMF-NEG-014 | Model or knowable revision is substituted. | Zero provider attempts; descriptor mismatch denial. |
| GMF-NEG-015 | Payload data class differs from the descriptor. | Zero provider attempts and zero disclosure. |
| GMF-NEG-016 | Gateway tries a second provider attempt after failure. | No second attempt; new nonce/permission/spend required. |
| GMF-NEG-017 | Gateway tries automatic provider or model fallback. | Fallback is absent/denied; zero fallback attempt. |
| GMF-NEG-018 | Connection drops after provider send. | Permission consumed; charge unknown/reserved; no retry; append-only settlement only. |
| GMF-NEG-019 | Timeout or cancellation occurs after send with unknown usage. | Permission consumed; reservation retained; no retry/fallback. |
| GMF-NEG-020 | Pricing snapshot drifts before send. | Zero provider attempts until a newly bound descriptor/permission exists. |
| GMF-NEG-021 | Currency differs from the authorized pricing snapshot. | Zero provider attempts; reservation is not silently converted. |
| GMF-NEG-022 | Stream/token/time/call ceiling is reached. | Gateway enforces cutoff; one attempt maximum; terminal and cost state remain durable. |
| GMF-NEG-023 | Concurrent inference requests race the same remaining budget. | Atomic accounting permits only valid reservations; no overspend. |
| GMF-NEG-024 | Worker executions race the same concurrency capacity. | Atomic slot acquisition admits only the allowed count; denied contenders create no tree. |
| GMF-NEG-025 | Worker bypasses the model gateway toward a provider. | Independent network observer records zero direct-provider packets. |
| GMF-NEG-026 | Worker attempts to discover or exfiltrate provider credentials. | No credential is present/readable and zero external disclosure occurs. |
| GMF-NEG-027 | Promotion target repository identity is substituted. | Spend/apply denied; zero target mutation. |
| GMF-NEG-028 | Patch bytes or patch/manifest hash is substituted. | Spend/apply denied; zero target mutation. |
| GMF-NEG-029 | Review or human-approval evidence is missing/substituted. | Spend/apply denied; zero target mutation. |
| GMF-NEG-030 | Target HEAD is stale relative to the descriptor. | Revalidation denies before spend/apply; zero mutation. |
| GMF-NEG-031 | Target worktree/state is dirty. | Clean-state precondition denies; user state remains untouched. |
| GMF-NEG-032 | Patch path traverses outside the eligible root. | Patch rejected; zero outside-root and target mutation. |
| GMF-NEG-033 | Patch introduces or exploits a symlink. | Ineligible form is rejected under the ratified P1 policy; zero mutation. |
| GMF-NEG-034 | Patch introduces or exploits a hardlink. | Ineligible form is rejected under the ratified P1 policy; zero mutation. |
| GMF-NEG-035 | Patch mutates submodule identity/content unexpectedly. | Manifest mismatch/ineligible form denies; zero mutation. |
| GMF-NEG-036 | Patch contains a binary form not authorized by exact policy. | Apply denied; zero mutation. |
| GMF-NEG-037 | Case collision or path alias changes target meaning. | Normalization detects conflict; zero mutation. |
| GMF-NEG-038 | Two promotion attempts race the same target/CAS. | At most one isolated staging mutation; loser denied; protected/default branch unchanged. |
| GMF-NEG-039 | Promotion apply is partial or ambiguous. | Permission stays consumed; durable ambiguous/compensation evidence; no merge. |
| GMF-NEG-040 | A completed/failed promotion permission is replayed. | Zero second patch application. |
| GMF-NEG-041 | Isolated staging evidence is presented as merge/Gate-3 authority. | Claim is rejected; protected/default branch remains unchanged. |
| GMF-NEG-042 | Canonical remote/source fetch resolves to drifted content. | Post-spend bootstrap fails; tree terminates before cognition; permission remains consumed. |
| GMF-NEG-043 | LFS object is missing or hash-drifted. | Manifest verification fails; zero cognition; whole tree terminates. |
| GMF-NEG-044 | Submodule URL/commit/manifest drifts. | Manifest verification fails; zero cognition; whole tree terminates. |
| GMF-NEG-045 | Explicit overlay bytes/hash or membership drifts. | Manifest verification fails; zero cognition; whole tree terminates. |
| GMF-NEG-046 | Source archive attempts absolute/parent traversal or unsafe form. | Extraction rejects; nothing escapes disposable root; tree terminates. |
| GMF-NEG-047 | Source/manifest changes between verification and cognition. | TOCTOU is independently detected; zero cognition on unbound bytes. |
| GMF-NEG-048 | Descendant survives root failure/timeout/termination. | Independent process observer proves the entire authorized tree is gone. |
| GMF-NEG-049 | Process tree exceeds a bound resource or loses required policy. | Tree terminates; permission stays consumed; durable terminal evidence. |
| GMF-NEG-050 | Evidence export is attempted after enforcement-policy loss. | Unauthorized export is denied; tree terminates; incomplete evidence fails closed. |
| GMF-NEG-051 | MCP server identity differs from the capability. | Zero tool invocations; durable denial. |
| GMF-NEG-052 | MCP tool name differs from the exact capability. | Zero tool invocations; durable denial. |
| GMF-NEG-053 | MCP arguments exceed or differ from bound constraints. | Zero tool invocations; durable denial. |
| GMF-NEG-054 | Tool-to-effect mapping differs from the capability. | Zero tool/effect invocation; durable denial. |
| GMF-NEG-055 | MCP maximum-call counter is exhausted or raced. | No excess call; counter is atomic and durable. |
| GMF-NEG-056 | MCP audience differs from the caller/server. | Zero tool invocations; durable denial. |
| GMF-NEG-057 | MCP capability expires before invocation. | Zero tool invocations; durable denial. |
| GMF-NEG-058 | Alternate MCP transport bypasses governed admission. | Transport parity denies; zero tool invocations. |
| GMF-NEG-059 | Derived `FleetPermissionEnvelope` is forged/widened/reissued. | Canonical permission validation denies; zero effect. |
| GMF-NEG-060 | Atomic pre-effect receipt/pending-state persistence fails. | Transaction commits nothing and zero effect occurs. |
| GMF-NEG-061 | A spent effect has no required terminal outcome. | Success is impossible; reconciliation holds reservation/state and fails closed. |
| GMF-NEG-062 | Duplicate or conflicting terminal outcome is appended. | Conflict rejected/detected; history is not rewritten. |
| GMF-NEG-063 | Reservation remains leaked after an otherwise terminal effect. | Readiness fails; budget is not reused until append-only reconciliation. |
| GMF-NEG-064 | Worker/gateway supplies forged cost or usage evidence. | Evidence rejected; authoritative reservation/settlement remains unresolved. |
| GMF-NEG-065 | Trust bundle/key rotation state mismatches signing time or scope. | Verification/effect fails closed; no untrusted evidence is accepted. |
| GMF-NEG-066 | Producer/verifier canonical bytes or domain separation differ. | Hash/signature verification fails closed; zero new authority or accepted success. |

The inherited GMF-NEG-001–010 retain their charter meanings. The additive labels are the
minimum coverage required by Amendment A1 and the plan review; the P0 output may split a
label into additive IDs but may not combine away an independent fault or weaken its result.

## Verification Plan

Builder Step 0 must restate this spec, exact Allowed Files, branch/worktree/base, read-only
repositories, governing hashes, prohibited actions, scenario count `66`, and known blockers,
then stop for coordinator ruling before writing P0 outputs. Any mismatch, pre-existing
Allowed File, or overlapping writer is a stop.

Required deterministic checks after the builder claim:

1. Refresh local Git/path/tool facts using read-only commands only. Compare repository HEAD,
   status, remote, future-repository absence, instruction files, and governing hashes to the
   shaping-time baseline. Record drift; do not fetch, pull, install, or probe the network.
2. Verify `git diff --name-only` is a subset of Allowed Files and that no existing governing
   record, predecessor file, product repository, install path, or external state changed.
3. Parse the negative matrix and prove IDs `GMF-NEG-001` through `GMF-NEG-066` are present
   exactly once, with every required field non-empty. Reject duplicate, missing, merged,
   weakened, or untraceable cases.
4. Verify every factual statement has an evidence reference and classification; every
   unresolved choice is `DECISION_REQUIRED` or `GAP`, never silently selected.
5. Verify every scenario names an observer independent of the component under test and the
   exact zero-effect/consumption/reservation/terminal semantics applicable to its timing.
6. Run the frozen frontmatter validator plus the shaping body-section advisory check on this
   draft, and run `git diff --check`. Advisory green is recorded but does not authorize a
   status change.
7. Run two fresh independent architecture/security reviews of the exact five-file evidence
   set and this spec. Each review returns a per-focus-question finding table and explicit
   `PASS`, `REQUEST_CHANGES`, or `HOLD`; no reviewer edits or executes a prohibited action.
8. Reconcile the reviews. A product/architecture decision, missing independent observer,
   canon conflict, or Critical/High finding forces `HOLD` in the Gate-2 evidence record.

Mandatory reviewer focus questions:

- Does any statement let the foreman, envelope, gateway, executor, profile, role, receipt,
  or evidence artifact confer authority outside Runtime-issued `IPermission`?
- Is pre-spend preparation genuinely blank/source-free, with one spend tied to at most one
  process tree and post-spend materialization before cognition?
- Are inference attempt, unknown-cost reservation, no-retry/no-fallback, and append-only
  settlement semantics complete and non-replayable?
- Are Runtime authorization and environment enforcement separately owned, attested, and
  independently observable, without assuming Docker/WSL2 or an unselected VM is eligible?
- Does every negative ID represent one reproducible fault with exact state transitions and
  an observer independent of the component under test?
- Can any promotion case mutate an authoritative/default branch, bypass the isolated
  Promotion Actuator, or confuse staged evidence with human Gate 3?
- Are current contract/code anchors described as candidates and seams rather than
  production Fleet capability?
- Did P0 silently choose a VM, persistence technology, provider/model, pricing source,
  error-code vocabulary, patch-form policy, key provider, or other unresolved product
  decision?
- Is the Gate-2 record merely an evidence-backed recommendation, with every external effect
  and later gate still withheld?

## Allowed Files

Only these exact repo-relative paths may be created or changed for GMF-P0:

- `plugins/foreman-line/docs/specs/active/GMF-P0-governed-model-fleet-discovery-and-negative-contracts.md`
- `plugins/foreman-line/docs/specs/active/gmf-p0-governed-model-fleet-discovery-and-negative-contracts.shaping-result.json`
- `plugins/foreman-line/docs/goals/governed-model-fleet/gmf-p0-repository-canon-environment-map.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/gmf-p0-contract-inventory.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/gmf-p0-threat-model.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/gmf-p0-permanent-negative-scenarios.md`
- `plugins/foreman-line/docs/goals/governed-model-fleet/gmf-p0-closure-evidence.md`

The first two files are shaping-owned artifacts and remain read-only inputs after Gate 2;
they are listed because this shaping session creates them, not as builder authority to
rewrite the contract or result. The builder creates only the five new goal-local P0 files.
No glob, directory shorthand, related file, generated file, cache, log, receipt, or temporary
artifact is mutation authority. Any required path outside this list requires a
coordinator-ratified spec amendment.

## Collision Risk and Sequencing

Collision risk is **high** because the ambient `agent-skills` checkout contains pre-existing
uncommitted goal/index work and a separate Foreman Kernel writer owns adjacent governance
state. No current Allowed File existed before shaping except this newly created draft/result.
GMF-P0 must use the named isolated worktree after Gate 2, read the coordinator worktree's
governing records only through verified hashes, and serialize any later integration with the
coordinator's uncommitted governance baseline. It must not stage, commit, reset, clean,
stash, move, or delete user-owned changes.

## Evidence and Handoff

The final P0 handoff is contained in `gmf-p0-closure-evidence.md` and must state: starting and
ending commit; exact files changed; commands run; passive observations; checks passed,
failed, skipped, or prohibited; both independent review verdicts; unresolved decisions;
blockers; and the next safe action. No receipt is minted. The only permissible next action
after a green P0 review chain is for the coordinator to present an exact human decision
request; it is not permission to shape, dispatch, build, or merge GMF-P1.

## Stop-and-Report Rules

Stop without inventing or widening scope if:

- a governing hash, repository HEAD/state, instruction, owner, or existing file conflicts
  with this spec;
- a current product fact cannot be established passively;
- an existing contract must change, an error code must be invented, or any open question
  requires an unratified product/architecture choice;
- an independent observer is unavailable or depends solely on the component under test;
- completing a scenario would require executing it, creating a fixture/test/schema, calling
  a provider/MCP/network service, launching a workload/container/VM, or accessing a secret;
- a required output path is occupied by another writer or a mutation would escape Allowed
  Files;
- any action would edit the charter, amendment, findings, discovery, loop, index,
  `model-fleet-v1`, a product repo, an install path, or external state; or
- any wording could be read as granting Gate 2, repository creation, source disclosure,
  provider spend, promotion, merge, installation, deployment, publication, or Gate 3.

On stop, preserve the partial evidence, set the Gate-2 recommendation to `HOLD`, name the
exact decision/evidence/authority required, and return control to the coordinator.
