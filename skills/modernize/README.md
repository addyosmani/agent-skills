# Modernize — Legacy Codebase Rewriter

> **Shack to Mansion.** Extract intent, rebuild clean, zero translation debt.

> This README is both the **design-of-record** and a **session-resumption brief**. A person or agent should be able to read it cold and understand what this skill is, why it works the way it does, what exists today, and what to do next. Current as of 2026-06-09.

---

## 1. The One Idea

Modernize an application to deliver the **same or better functional value** — and nothing else. We do **not** emulate legacy coding patterns, project structure, frameworks, or architecture. Those are *accident*, not *essence*. We extract what the system actually does, validate it with a human, and build a clean, modern, best-practice application **greenfield** — as if functional requirements gathering just finished.

The trap we explicitly reject: line-by-line translation (Angular→React, Python→C#, etc.). Translation drags the legacy system's accidental complexity, dead patterns, and framework quirks into the new build — you get a Python-flavored C# app that's worse than either parent. We capture behavior, throw away structure.

**Litmus test for every decision:** is this *essence* (what the app must correctly do → capture it) or *accident* (how the old code happened to do it → ignore it)?

---

## 2. The Functional Approach

We don't map legacy backend contracts to frontend models, count their projects, or reproduce their layering. We gather **functionality** through a small set of evidence lenses that run in parallel and converge:

| Lens | Source | What it yields |
|-|-|-|
| **Capabilities** | frontend + existing docs | the WHAT — what a user can do, the surface inventory |
| **Rules & side effects** | backend code (behavior, not structure) | the server-side rules, authorization, calculations, and effects that make each capability *correct* |
| **Headless processes** | backend (jobs, consumers, webhooks) | functionality with zero frontend footprint |
| **Data shape & invariants** | DB schema + app-level state machines | entities, constraints (FKs/uniqueness = encoded rules), and rules enforced only in code |
| **Human augmentation** | stakeholder review | edge cases, seasonal ops, and rules no artifact records |

Critical nuance: the frontend tells you what the UI *exposes*, never what the system must *correctly do*. The high-value, high-risk behavior — the $10k approval gate, tax math, the audit-log side effect — is server-side and often has no UI. "Capabilities from the surface, rules and effects from the code, structure in the trash." Capture the former and miss the latter and you ship something that demos identically and is silently wrong.

Then: **run it by a human, then build greenfield.** The human reviews and *augments* an evidence-derived spec (they don't fill a thin one — humans forget the load-bearing bug; the codebase doesn't).

---

## 3. Core Concepts

**Contracts.** A behavioral contract encodes ONE provable behavior: inputs/preconditions → trigger → expected outputs, side effects (with explicit assertions), error behavior, determinism strategy, and evidence pointers. Approved contracts are the *only* implementation truth. Schema: `schemas/contract.schema.json`. Wire-level parity (SDK/service): `schemas/wire_contract.schema.json`.

**Evidence + confidence.** No behavior without evidence (`path:line`). Every claim is confidence-labeled (High/Medium/Low). Low-confidence items gating downstream work must be resolved or explicitly accepted — never laundered into facts.

**Liveness reconciliation.** Captured code is not captured functionality. Code that exists but never fires is a fossil, and rebuilding it is the same footgun as recreating architecture. **Existence is not liveness, and "no caller in the repo" is not proof of dead** — the highest-value backend code is often invoked via DI/reflection, attribute routing, message brokers, external callers, external schedulers, or feature flags, none of which a static call-site search sees. Liveness is evidence-graded: runtime telemetry > wiring/schedule > static caller. It is **cadence-aware** — a yearly job missing from a 30-day telemetry window is *between runs*, not dead; for scheduled work the schedule is the primary signal. Default bias: **capture-and-flag, never silently drop**; omit only on positive evidence of death or an explicit human call, and tombstone every omission. (Full detail lives in `get-app-specs`.)

**Two distinct reconciliations — don't conflate them:**
- **Liveness reconciliation** (discovery-time): does this functionality actually get triggered? Gates whether it enters the spec.
- **Behavioral reconciliation** (implementation-time): does the new app match the legacy for what we kept? Gates the parity claim. Equivalence is bounded by sampling coverage against *captured legacy behavior* — recording only the target proves nothing.

**Tombstones.** Approved divergences from legacy behavior (and recorded omissions of dead code) live in `TOMBSTONES.md` — an auditable decision log. Defensible changes, not silent ones.

**Receipts & defensibility.** Reconciliation produces replayable receipts (hashes, replay scripts) and a `DEFENSIBILITY.md`: what was proven, how, how to replay it, what drift means, what was tombstoned. *Proof, not vibes.*

**HITL gate.** Human validation is mandatory before implementation begins — it's the load-bearing wall, not ceremony. Gates bind to **phase transitions, not tree depth** (see §5).

---

## 4. The Two Skills

| Skill | Role |
|-|-|
| **`modernize`** | Orchestrator. Owns the phase workflow, contracts, reconciliation, receipts, release decision. |
| **`get-app-specs`** | Discovery primitive. Extracts the evidence-backed, confidence-labeled, liveness-checked baseline spec. Standalone-useful (audit, onboarding, archaeology) *and* serves as modernize Phase 0. |

They're coupled by **IDs**: `get-app-specs` defines `F-` (features, incl. headless processes via a `trigger` attribute), `BR-` (business rules), `R-` (requirements), `CANON-` (domain canon), `DEP-` (dependencies), `OQ-` (open questions). Modernize contracts set `linked_requirements` to those IDs; the contract schema enforces every contract links ≥1 baseline ID. No orphan contracts, no orphan code.

---

## 5. Execution Architecture — Choreography of Process-Skills

Enterprise apps need real discovery *and* development at scale; a single agent is a context and throughput choke point. The model is **choreography, not orchestration**: autonomous processes (defined as skills) that decompose recursively, report into shared state, with a primary agent as **watcher, not blocker**.

- **Processes are skills.** Decomposition lives in versioned, testable contracts, not in per-run improvisation. `get-app-specs` is the discovery process primitive; "frontend-discovery / backend-discovery" are it pointed at a sub-scope. Recursion = a process invoking the process on a narrower scope.
- **Watcher, not blocker.** The primary observes a shared status tree and updates it as processes report. A process that goes silent shows as `started` and becomes a **signal to investigate** — it does NOT lock the whole run. Resilient to partial failure where a synchronous join would deadlock.
- **Loud vs quiet failure.** Async trades a loud deadlock for silent incompleteness — worse for a proof skill. Mitigations are mandatory: every process emits a **terminal DONE/FAILED** (never just goes quiet), and a **coverage check** confirms every *discovered* child reached terminal before the baseline is declared complete. A tree with dangling `started` nodes is not a complete baseline.
- **Watching ≠ reconciling.** Cross-process contradictions (frontend assumes a field the backend never emits) need an explicit **reconcile step**, not passive aggregation. Aggregation gathers; reconciliation resolves conflicts and catches the lie.
- **State split (reuse the QCC pattern).** Ephemeral presence in Redis — **advisory liveness only: no lease, no TTL-reclamation, no requeue, no reaper** — alongside the durable node tree + results in SQLite (`schemas/task_store.sql`). The Redis presence ping is *not* the dropped lease-reaper "heartbeat"; it exists solely to decide *when* to raise an investigate flag. "Started forever" = was present, now absent, no terminal record = the investigate signal (surfaced, never auto-resolved).
- **Gates bind to phase transitions, not depth.** A discovery tree five levels deep still has exactly ONE discovery→implementation gate. Intra-discovery joins need *coordination*, not *approval*. Depth stops mattering for gating.
- **Governance.** Depth is a proxy that lies (6×4×10 leaves ≫ 2⁶). Real levers: a **spawn budget** allocated downward (each level spends from its parent's allotment) + **max_concurrency** (rate-limit ceiling). Keep `max_depth ≈ 5` as a dumb fuse (root → subsystem → project → module → component covers almost any codebase), but budget is the control.

---

## 6. Phase Workflow

0. **Specification Baseline** — run `get-app-specs` (unless a current baseline exists). Produces `APP_SPECIFICATION.md`.
1. **Discovery & Contract Drafting** — inventory evidence; draft behavioral contracts mapped to baseline IDs → `contracts/DRAFT_MANIFEST.yaml`.
2. **Human Validation Gate** — review, resolve ambiguity + Cold/Indeterminate liveness items, record tombstones → approved `contracts/MANIFEST.yaml`.
3. **Target Architecture & Task Graph** — target-native design (`ARCHITECTURE.md`), task graph.
4. **Implementation & Contract Tests** — implement only approved-contract behavior; tests + telemetry; receipts.
5. **Reconciliation & Release** — stratified sampling, legacy↔target diff under drift rules, coverage/delta reports, release decision.

---

## 7. Usage (condensed)

**Invoke naturally:**
```
Use the modernizer skill to rewrite D:/Repos/old-inventory-service to C# Web API .NET 10.
Output to D:/Repos/inventory-api-v2. Skip the legacy-reports module.
```
or point at a config: `Run modernizer using examples/dotnet-migration.yaml`.

**Source types:** local `path`, public `url`, or private `repo` (SSH).
**Target stack:** free-form string Claude interprets idiomatically (`"C# Web API .NET 10 + MediatR + CQRS"`, `"Go 1.23 + Gin + GORM"`, `"Rust + Axum + SQLx"`, …).

**Key options:** `exclude_patterns`, module `exclusions` (with reason), `drift` rules (prefer the weighted per-field model — strict/ignore/tolerances — over a single scalar; a bare `drift_tolerance: 0.05` is a convenience default that means little across heterogeneous contracts), `reconciliation` (stratified `coverage_targets` for happy/error/edge/security; keep it ON — disabling it ships the branding without the proof), `forced_optimizations`, and liveness evidence sources (telemetry/logs + window).

**Examples:** `minimal.yaml` (the on-ramp), `dotnet-migration.yaml`, `dotnet-clean-architecture.yaml`, `go-migration.yaml`, `rust-axum-migration.yaml`, `sdk-py-to-csharp.yaml`. SDK parity playbook: `references/sdk-reconciliation-harness.md`.

**Outputs:** new `src/` + `tests/`, `APP_SPECIFICATION.md`, `contracts/`, `ARCHITECTURE.md`, `TOMBSTONES.md`, reconciliation/coverage/delta reports, `receipts/` (manifest, replay scripts, hashes), `DEFENSIBILITY.md`.

---

## 8. Current State

**Built & decided:**
- Functionality-first philosophy (essence vs accident) — the north star.
- `get-app-specs` is a **separate sibling skill** (spec extraction is independently useful), with liveness reconciliation, cadence-aware rule, telemetry-source intake, and the targeted periodic-ops human prompt. Template included.
- Both contract schemas written (`contract.schema.json`, `wire_contract.schema.json`) — strict, evidence + confidence required, REST/WS/libcall wire support, secrets never stored raw.
- `schemas/manifest.schema.json` written — `contracts/MANIFEST.yaml` shape: per-contract `content_hash` entries (transitive binding for #7 / coverage enumeration for #5) + the `approval` block (via `$ref`). `DRAFT_MANIFEST.yaml` validates too (approval optional).
- Headless processes modeled as `F-*` + `trigger` attribute (keeps contract schema valid); liveness evidence reuses existing kinds (no taxonomy drift).
- Empty stubs removed; `minimal.yaml` filled; only the real reference (`sdk-reconciliation-harness.md`) kept.

**Designed + now specified (schema committed, normative in SKILL.md):**
- Choreography execution model (§5): node-tree schema committed at `schemas/task_store.sql` (`runs` + `nodes`, lifecycle `pending→started→done|failed`, terminal-state + loud-failure triggers, coverage/investigate views) and promoted to a normative **Execution Model** section in `SKILL.md`. Watcher/terminal-state/coverage contract, advisory-only state split, phase-transition gating, and spawn-budget/concurrency governance are all written down.

**Built this session (runtime executors — code + tests):**
- **`executors/`** — a TS/Node package inside the skill, **58/58 tests green**, built against the committed schemas (not summaries of them). Driver is Node's built-in `node:sqlite` (see §9).
  - **#1 node-tree store** (`src/task-store.ts`): applies `schemas/task_store.sql` verbatim, sets `foreign_keys` per-connection, and enforces the three invariants SQL can't — concurrency ceiling, depth fuse, atomic budget spend — with every check-then-act path in an `IMMEDIATE` transaction. Typed rows mirror the DDL 1:1 (no mapping = no drift). No reap/requeue API (watcher doctrine). **Governance enforcement (budget/concurrency/depth) lives here** — it was on the "not yet built" list, it's done.
  - **#2 choreography spine**: advisory `PresenceStore` (`src/presence.ts` in-memory + `src/presence-redis.ts` optional `ioredis`, dynamic-imported to stay optional); observe-only `Watcher` (`src/watcher.ts` — `tick()` = started ∩ presence-absent, surfaces flags, never mutates) + cancelable `startWatchLoop`; coverage-check (`src/coverage.ts` — phase/tree complete iff `open === 0`, returning the blocking nodes for diagnostics).
  - **#3 approval gate** (Phase II→III/IV wall): the six-check fail-closed refuse algorithm in code — `src/canonical-json.ts` (RFC 8785/JCS), `src/approval-hash.ts` (`manifestHash` strip-then-hash + per-contract `contractContentHash` over canonical JSON of the contract body), `src/approval-schema.ts` (hand-mirrored `approval.schema.json` validator, zero-dep), `src/git-verifier.ts` (`GitVerifier` interface + `ChildProcessGitVerifier`; args-as-array to `spawnSync`, no shell string, refs charset-guarded), `src/approval-gate.ts` (`verifyApproval` + `writeApprovalReceipt` + `ApprovalGate`). Checks run live on every call: phase-coverage → schema → signature(+allowlist) → ref-integrity → signed-hash → live-hash; decision `pass` iff all six prove, else `refuse`. No `verified` boolean (none in schema — re-derived live); receipt → `receipts/approval_verification.json`. **20 tests** cover the happy path + each check failing in isolation (bad sig, off-allowlist signer, repointed ref, swapped signed-hash, post-approval manifest tamper, contract-swap-on-disk via content-hash drift) + the detached-signature fallback. Gate is YAML-agnostic by construction: it consumes a parsed manifest object + a `resolveContract` thunk + a live `discoveryCoverage` thunk (wrap `checkPhase(store,id,'phase1')`); the orchestrator owns the `MANIFEST.yaml`/contract-file parse (no `yaml` dep pulled into the executor). Detached path implements SSH (`ssh-keygen -Y verify`); GPG-detached is a documented extension seam.

**Designed, not yet built (runtime):**
- _None — the runtime executor queue is cleared (#1–#4 all built, **58/58 green**). Only the first calibration run remains; see §10._

**Built this session — runtime #4 (claim tier):**
- **#4 claim tier** (Phase V release gate): deterministic `computeClaim` over reconciliation counts + coverage evidence — `src/claim-tier.ts` (the tier ladder `unverified`/`partial`/`verified`/`failed`, recomputed from evidence and never trusted as a stored field; `releaseBlocked`; `writeClaimReceipt` merging the `claim` block into `receipts/manifest.json` and refusing to clobber non-object files), `src/claim-schema.ts` (hand-mirrored `claim.schema.json` validator, zero-dep), `src/defensibility.ts` (renders `DEFENSIBILITY.md` whose headline **is** the tier, with real coverage numbers and every gap named — waivers marked `(accepted via TOMBSTONES.md#…)`, never laundered out). Honesty is structural: `unverified` (recon didn't run / 0 legacy samples / 0 paired comparisons) asserts NO parity; strict-drift-beyond-tolerance → `failed` (blocks release, rule #6); unwaived coverage/contract gaps → `partial`; tombstone-waived gaps stay named. **19 tests** across every ladder rung, the derivations (`met` = achieved≥target, `contracts_covered` = ≥min-samples ∧ ≥1-paired), the waiver semantics, schema round-trip, the DEFENSIBILITY render, and receipt merge/clobber-refusal.

**Resolved this session (#5, #6, #7 — all ✅; runtime executors remain, see above):**
- #5 — ✅ **DONE.** Receipts + `DEFENSIBILITY.md` are now **claim-tier gated**. Claim ladder (`unverified` / `partial` / `verified` / `failed`) at `schemas/claim.schema.json`; deterministic tier algorithm + DEFENSIBILITY.md template at `references/defensibility-and-claims.md`; SKILL.md rule #9 + new **Claim Ladder** section + Phase V wired (capture both sides, compute tier, emit at earned tier). No recon / no legacy samples / no paired comparisons → `unverified` (no parity claim); strict drift beyond tolerance → `failed` (blocks release, rule #6); unwaived coverage/contract gaps → `partial`; tombstone-waived gaps stay named, never laundered. `DEFENSIBILITY.md` added to Required Run Outputs; `receipts/manifest.json` carries the `claim` block.
- #6 — ✅ **DONE.** `task_store` is now the choreography node tree: DDL committed at `schemas/task_store.sql`. Heartbeat/lease-reaper model dropped — the schema carries no lease/TTL/heartbeat columns and the doctrine is stated in the file header and the SKILL.md Execution Model section. Stale `lease metadata` output line removed from SKILL.md; README §5 presence wording disambiguated (advisory presence ≠ reaper heartbeat). **Columns added beyond the original bare list** (justified, not silent): `run_id` + a minimal `runs` companion table (scope a tree, hold governance ceilings); `phase` (phase-transition gate scoping); `failure_reason` (loud-failure enforcement); `spawn_budget_total`/`spawn_budget_used` + `depth` (persist the §5 governance levers); `created_at`. Status lifecycle elaborated to `pending→started→done|failed` (added `pending` to separate *discovered* from *running*). `node_type` left as documented-convention TEXT (open vocabulary), not a hard enum — only `status`/`phase` are CHECK-bounded.
- #7 — ✅ **DONE.** HITL gate is now a **forgery-resistant** approval artifact. `approval` block schema at `schemas/approval.schema.json` (approver, timestamp, signed git tag/commit the agent can't author, signing-key fingerprint, `manifest_hash`); verification playbook at `references/approval-verification.md`; SKILL.md rule #3 strengthened + new **Approval Gate** section; Phase II exit / Phase III entry refuse the transition without a live-verified signature + manifest-hash match. `manifest_hash` excludes the `approval` block and transitively binds contract bodies via per-contract content hashes (kills the contract-swap hole). Gate re-verifies on every transition and trusts no stored boolean (there is no `verified` field); decisions logged to `receipts/approval_verification.json`. **Trust assumption stated plainly:** holds iff no allowlisted private signing key is reachable by the agent's execution environment.

---

## 9. Decisions — locked this session

- **ID strategy under parallel discovery:** ✅ **LOCKED — hierarchical/namespaced** (e.g. `BACKEND.BILLING.F-003`). Collision-free by construction, encodes provenance, zero coordination. **Ripple applied:** `linked_requirements` pattern loosened to `^([A-Z][A-Z0-9]*\.)*(F|BR|R|CANON)-[0-9]+$` in BOTH `contract.schema.json` and `manifest.schema.json` (bare `F-003` still valid — backward compatible). **Sibling ripple ✅ done:** `get-app-specs` now emits namespaced IDs — new "Namespacing under parallel discovery" rules in Identifier Schemes, Phase 0 fixes the node's prefix from scope, Phase IV self-check + `APP_SPECIFICATION.template.md` (Scope `ID namespace` + self-check) updated.
- **Gate placement:** ✅ **LOCKED — staged per-subsystem.** Each subsystem discovery subtree earns its own Phase II approval (its own signed manifest); the root holds a final sign-off over the merged manifest. Scales to enterprise and avoids one monster approval blocking everything. Per-subsystem manifests compose into the root manifest; each carries its own `approval` block.
- **Process granularity:** ✅ **LOCKED — generic-plus-profiles**, with `get-app-specs` as the generic discovery process; "frontend/backend/etc." are profiles (parameters), not bespoke skills. One testable process, many scopes.
- **Governance defaults:** ✅ **LOCKED (calibration pending)** — `max_depth=5`, `max_concurrency=8`, `spawn_budget_total=0` default (a node spawns only with explicitly allotted budget; fail-safe). Numbers are placeholders to retune against real-scenario runs.
- **Telemetry reality:** ✅ **RESOLVED for Kaseya targets — Dynatrace + OpenTelemetry** (the platform's Observability package; QCC already does deep Dynatrace DQL). So **liveness can run runtime-backed (strong)** for Kaseya apps, not just capture-and-flag. *Caveat to confirm per-app:* not every legacy target is instrumented — an un-instrumented / pre-OTel app still falls back to capture-and-flag + the human. Verify instrumentation coverage when scoping each run.
- **Executor stack:** ✅ **LOCKED — TS/Node, inside the skill (`executors/`).** This is dev-time skill tooling, not platform runtime, so "match the platform (.NET)" doesn't earn its weight; matching the existing Node skill tooling + iteration speed do. The skill stays **target-language-agnostic** — `target_stack` is a free-form string; backend-to-C# is one config value, never a hardcode. Factored so the node-tree/presence layer can lift to a sibling package if `get-app-specs` later needs it.
- **SQLite driver:** ✅ **LOCKED — `node:sqlite` (built-in), not `better-sqlite3`.** Four native-build dead-ends on the Kaseya box (no Node-24 prebuilt → node-gyp compile fail → Defender `EBUSY`) made the native module the wrong call; `node:sqlite` is zero-native-dependency, so the skill runs wherever Claude Code's Node runs. Cost: a **Node ≥ 22.5 floor** (set in `engines`). All driver code is isolated in `task-store.ts`, so a swap stays a one-file change.
- **Presence backend:** ✅ **LOCKED — `PresenceStore` interface; in-memory default, Redis (`ioredis`) optional.** Advisory only (no lease / TTL-reclaim / reaper); the TTL is the lapse signal that decides *when to investigate*, nothing more. `ioredis` is an `optionalDependency`, dynamic-imported, so the package imports and typechecks without it.

---

## 10. Next Steps

The decided-but-unwritten queue is now fully cleared:
1. ✅ **DONE — #6** node-tree DDL + choreography wiring (`schemas/task_store.sql`; Execution Model + rules 7–8; stale reaper refs removed).
2. ✅ **DONE — #7** forgery-resistant HITL approval artifact (`schemas/approval.schema.json` + `references/approval-verification.md` + Approval Gate; rule #3; gate refuses Phase II→III/IV without a live-verified signed approval).
3. ✅ **DONE — #5** claim-tier-gated receipts + `DEFENSIBILITY.md` (`schemas/claim.schema.json` + `references/defensibility-and-claims.md` + Claim Ladder; rule #9; Phase V wired).
4. ✅ **DONE — executor scoping locked** (§9): TS/Node, inside the skill (`executors/`), `node:sqlite` driver, `PresenceStore` interface. Integration seams honored as spec'd (SQLite node tree, advisory Redis presence, git `verify-tag`/`verify-commit`, canonical-JSON hashing).
5. ✅ **DONE — runtime #1 (node-tree store) + #2 (choreography spine)** — `executors/`, 19/19 green. Governance enforcement (budget / concurrency / depth) folded into the store. See §8 "Built this session."
6. ✅ **DONE — runtime #3 (approval gate)** — the Phase II→III/IV wall in code: six-check fail-closed `verifyApproval` (phase-coverage → schema → signature+allowlist → ref-integrity → signed-hash → live-hash), RFC 8785 canonical hashing, `ChildProcessGitVerifier` (`git verify-tag`/`verify-commit`, args-as-array/no shell), receipt to `receipts/approval_verification.json`. 20 new tests; suite now **39/39 green**. See §8 "Built this session."
7. ✅ **DONE — runtime #4 (claim tier)** — the Phase V release gate in code: deterministic `computeClaim` (tier recomputed from evidence, never trusted), `releaseBlocked`, `writeClaimReceipt` (merges `claim` into `receipts/manifest.json`), hand-mirrored `claim.schema.json` validator, and `DEFENSIBILITY.md` renderer (headline = tier, gaps named, waivers marked). `unverified` asserts no parity; `failed` blocks release; unwaived gaps force `partial`. 19 new tests; **suite now 58/58 green. Runtime executor queue (#1–#4) cleared.**

**Remaining:**
- **First real-scenario run** — the only open item. Calibrate `max_concurrency` / spawn-budget against actual tree fan-out; `sdk-py-to-csharp` is the lead candidate (wire-contract + SDK harness already spec'd). This run is also the first **live** exercise of the executors end-to-end: the node-tree store under real fan-out, the watcher/coverage spine, the approval gate's `ChildProcessGitVerifier` against a real signed tag, and the claim-tier engine against real reconciliation counts. A live Redis is needed only for the multi-agent variant; single-process runs use in-memory presence.

---

## See Also
- `SKILL.md` — core skill definition (phases, contract requirements, drift, failure conditions).
- `../get-app-specs/SKILL.md` — discovery primitive + full liveness reconciliation spec.
- `schemas/` — `contract`, `wire_contract`, `approval`, `claim`, and `manifest` JSON Schemas, plus `task_store.sql` (choreography node tree DDL).
- `references/approval-verification.md` — the HITL approval gate playbook.
- `references/defensibility-and-claims.md` — the parity claim ladder + `DEFENSIBILITY.md` template.
- `references/sdk-reconciliation-harness.md` — the SDK parity playbook.
- `executors/` — runtime executors (TS/Node, `node:sqlite`): node-tree store + choreography spine (watcher, coverage) + approval gate + claim tier. `cd executors && npm test` to verify (58 tests). Runtime queue #1–#4 complete; only the first calibration run remains.
- `examples/` — ready-to-edit configs.
