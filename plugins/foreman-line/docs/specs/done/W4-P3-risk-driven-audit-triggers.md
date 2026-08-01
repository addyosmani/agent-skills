---
ticket: KONE-TBD
title: Foreman Line - W4-P3 Risk-driven audit triggers (max(declared,derived) engine + PR→governing-spec resolution + report entrypoint)
status: active
owner: clinton.morgan
created: 2026-07-26
updated: 2026-07-26
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
surfaces: [plugins/foreman-line/integration/, .github/workflows/foreman-line-ci.yml]
routing_class: architecture/risk
permission_profile: builder-architecture
---

# W4-P3 — Risk-driven audit triggers

## Intent

Build the **deterministic risk-driven audit-trigger engine** for Stage E (Integration).
Two inputs, one decision (FOREMAN-LINE-PLAN §6): the **declared** risk from the parcel's
governing spec frontmatter (`risk:`/`surfaces:`) and the **derived** risk computed from the
set of changed diff paths via the §6 path→audit-domain mapping. `decision = max(declared,
derived)`. When `declared < derived` (e.g. spec says `low` but the diff touches `auth/`),
that is **spec-drift** — an independent condition surfaced for a block. The engine's output
projects to the frozen `AuditTriggerEvaluation { triggered, reason? }` that W4-P1's
already-shipped `emitIntegrationReceipt` consumes as its `auditTrigger` input, so the trigger
decision **rides inside the Stage-E receipt** — no new receipt, no new stage. The parcel also
adds the report-only `report` entrypoint (RW4) to the `integration/` package and describes the
additive `foreman-line-ci.yml` amendment that invokes it (report-only, non-blocking).

This parcel proves the **trigger**, not the audit **run**. The actual audit run
(security-audit / compliance-audit skills, finding-based PR block) is a **named dispatched
follow-on** — `W4-FUP-AUDIT` (D5 / PR4-4) — out of scope. All logic ships as pure/injectable
functions in the sandboxed, hermetically-tested `plugins/foreman-line/integration/` package.

**Decomposition note (coordinator ruling, Step 0).** The `spec-linter` corpus reconciliation +
CI re-enable that PR4-6 attaches to W4-P3 is **decoupled into a separate parcel** (pending
Clint's decision, carrying the `data_classification` definitional call). This engine does **not**
build-depend on a clean `docs/specs/done/` corpus: its declared-risk read resolves the **active
governing spec**, which is coordinator-linted before dispatch — never the archival `done/`
corpus. PR4-6's "the declared half cannot rest on an unlinted corpus" is satisfied by that
separate parcel; W4-P3 does not touch `spec-linter/`, `SPEC-CONVENTION.md`, `plugins.yml`, or any
`done/` spec.

## Constraints

- **Build shape (charter D2) — extend the shipped `integration/` package.** New files live in
  `plugins/foreman-line/integration/src/`: `audit-trigger.ts` (the `max(declared,derived)`
  engine + rich decision type + projection), `governing-spec.ts` (PR→governing-spec resolution +
  path matcher), `report.ts` (the report-only entrypoint). New tests in `tests/*.test.ts`
  (`tsx --test`). Mirror the package's existing shape exactly (`"type":"module"`,
  `engines.node >=24.11.1`, relative ESM specifiers). Add a `report` npm script
  (`"report": "tsx src/report.ts"`) to `package.json` (RW4). Rationale for extending vs. a new
  package: the engine's output feeds `emitIntegrationReceipt` (in `integration/`), the report
  entrypoint must live where `npm run report` resolves, and `foreman-line-ci.yml`'s path filter
  is already `plugins/foreman-line/integration/**`.
- **No frozen-contract change (loop-stop guard).** No file under
  `plugins/foreman-line/contracts/` is edited. The engine **consumes** the frozen
  `AuditTriggerEvaluation { triggered: boolean; reason?: string }`
  (`contracts/src/stages/e-integration.ts`) read-only via a relative ESM specifier. A need to add
  a `drift`/`blocked`/any field to `AuditTriggerEvaluation` — or any other frozen-contract change
  — is a **loop-stop**: STOP and report; not a build decision. The rich `AuditTriggerDecision`
  (below) is an **engine-internal** type in `integration/`, never persisted to the receipt.
- **No cross-package import edges.** No `integration → verification`, `integration → spec-linter`,
  or `integration → dispatch` import. Frontmatter parsing and any risk-ordering the engine needs
  are **local** helpers (mirroring W4-P1's local `inheritCorrelation` and the no-`allocateSequence`
  rule). If an equivalent risk-level type is already exported by a **consumed contract**, reuse it
  read-only; otherwise define the ordinal locally.
- **Hermetic tests are mandatory (charter D2 / PR4-5).** `plugins.yml:44-78` auto-runs `npm test`
  on **every** package as a **blocking** gate on `ubuntu-latest`. Every external effect — reading
  changed diff paths, loading `active/` specs, any git read — is an **injected function seam**
  (default = real, tests = fixtures). **No secrets, no network, no live `git`/`gh`, no
  external-repo path.** Diff-path inputs and active-spec descriptors are fixtures.
- **Declared half rests on the ACTIVE governing spec (PR4-6).** The engine resolves declared risk
  from the parcel's **governing active spec** (coordinator-linted at dispatch), not the archival
  `done/` corpus. It reads only `status: active` specs; `draft` (non-dispatchable) and `done/`
  (archival) specs never govern.
- **Report-only / non-blocking (charter D2/D8, PR4-7).** The `report` entrypoint surfaces the
  decision (incl. `triggered` and `drift`) as GitHub annotations and **always exits 0**. The
  drift-*block* is proven at the **decision/harness level** (deterministic tests over the rich
  `AuditTriggerDecision`), not via the report's exit code. Promotion of any check to *required /
  blocking* status is a human stop-and-present (D8) — out of this parcel.
- **`foreman-line-ci.yml` amendment is additive and builder-authored (PR4-9).** W4-P1 created the
  workflow (which already calls `npm run report --if-present`, a no-op today). W4-P3 **amends it
  additively** (this spec *describes* the change; the builder authors the YAML): adding the
  `report` script makes that invocation live; if the report needs the PR base ref to compute
  changed paths, the step gets it via env. Guards: report-only, **no** required-status job, path
  filter unchanged and non-duplicative of `plugins.yml`'s per-package suite. Never concurrently
  authored with P4.
- **Correlation invariant (cross-parcel, load-bearing).** Nothing in W4-P3 mints a
  `correlationId` or emits a receipt. The trigger value flows only into W4-P1's shipped
  `emitIntegrationReceipt`, which inherits `correlationId`/`workflowId` from the Stage-D tip.
- **Lesson #26:** run `git diff --stat origin/main` before opening the PR (standing per-parcel
  gate; P0–P4 land serially to main between builder branches).

## Design

### Rich decision (engine-internal, never persisted)

```ts
type RiskLevel = 'low' | 'standard' | 'elevated' | 'critical'   // ordinal low<standard<elevated<critical (SPEC-CONVENTION §4.6)

interface AuditTriggerDecision {
  declaredRisk: RiskLevel        // governing active spec's risk; 'low' floor when no governing spec
  derivedRisk: RiskLevel         // §6 diff mapping; 'elevated' on any category match, else 'low'
  decision: RiskLevel            // max(declaredRisk, derivedRisk)
  triggered: boolean             // decision >= 'elevated'  (§6 "the audit-suite should run")
  drift: boolean                 // declaredRisk < derivedRisk  (INDEPENDENT of triggered)
  governingSpec: string | null   // resolved active-spec path, or null (no-governing-spec)
  reasons: readonly string[]     // derived-domain matches, drift note, no/multi-governing-spec note
}
```

`triggered` and `drift` are **distinct axes** (coordinator ruling OQ5): `triggered` means the
decision reached `elevated`+ (audit should run); `drift` means the spec under-declared vs. the
diff. `drift` does **not** force `triggered:true`.

### Projection to the frozen contract

```ts
function toAuditTriggerEvaluation(d: AuditTriggerDecision): AuditTriggerEvaluation {
  // triggered = (decision >= 'elevated') — NOT set true merely because of drift.
  // Any drift + domains fold into the human-readable reason string.
  // Returns EXACTLY { triggered, reason? } — no extra field (frozen-contract guard).
}
```

### Derived-risk mapping (§6, deterministic)

`deriveRisk(changedPaths)` → `{ derivedRisk, reasons }`. Any category match ⇒ `derivedRisk =
'elevated'` with the domain named in `reasons`; no match ⇒ `'low'`:

- auth / authz / secrets / tenancy / session / crypto paths → **security**
- IaC (Pulumi/Terraform) / Dockerfiles / CI-workflow files → **infra + supply-chain**
- lockfile / dependency-manifest changes → **supply-chain**
- new external endpoint / data-egress (best-effort path heuristic) → **security + compliance**

The matcher is a documented, ordered rule table (path regex/glob → domain). No new runtime
dependency.

### PR → governing-spec resolution (PR4-6)

`resolveGoverningSpec(changedPaths, activeSpecs)` where `activeSpecs: { path, risk, surfaces }[]`
are `status:'active'` descriptors (a `draft`/`done` descriptor is never included/never governs):

- **single match** (one active spec whose `surfaces:` globs cover ≥1 changed path):
  `declaredRisk = spec.risk`, `governingSpec = spec.path`.
- **no match**: `governingSpec = null`, `declaredRisk = 'low'` (floor), `reasons +=
  'no-governing-spec'`. A no-spec diff on an elevated-derived surface therefore still yields
  `triggered:true` **and** `drift:true` (low < elevated) — the safe default.
- **multi-match**: `declaredRisk = max(risk across all matching specs)`, `reasons += 'multi-spec:
  <paths>'`. Allowed but surfaced.

Loading active specs (read `active/*.md`, parse frontmatter, filter `status==='active'`) is an
**injected seam**; the frontmatter reader is a **local** minimal parser (no `spec-linter` import),
wrapped in a typed try-catch (lesson #22). Tests inject descriptors directly.

### Path matcher

A small local matcher supporting: exact path equality; directory-prefix (surface ends with `/`);
and `*` / `**` glob semantics. No new runtime dependency.

### Report entrypoint (RW4)

`report.ts` (`npm run report` → `tsx src/report.ts`): resolve changed paths (injected seam;
default = git diff name-only vs. the PR base merge-base, base ref from env in CI), load active
specs (injected seam), compute the `AuditTriggerDecision`, print GitHub annotations
(`::notice::` / `::warning::`) surfacing `decision` / `triggered` / `drift`, and **exit 0
always**. Report-only; enforcement is the later D8 human phase.

## Acceptance Criteria

1. **Package extension + public surface + `report` script.** `integration/src/` gains
   `audit-trigger.ts`, `governing-spec.ts`, `report.ts`; `src/index.ts` additionally exports the
   engine (`AuditTriggerDecision`, the evaluate function, `toAuditTriggerEvaluation`), the
   governing-spec resolver, and `deriveRisk`. `package.json` gains `"report": "tsx src/report.ts"`.
   No file under `contracts/` is edited; `AuditTriggerEvaluation` is imported read-only via a
   relative ESM specifier. No `integration → verification`/`spec-linter`/`dispatch` import exists.

2. **Derived-risk mapping (§6) is deterministic.** `deriveRisk(changedPaths)` returns
   `derivedRisk:'elevated'` with a domain reason for each §6 category — (a) auth/authz/secrets/
   tenancy/session/crypto → security; (b) IaC/Dockerfiles/CI-workflow → infra+supply-chain;
   (c) lockfile/dependency-manifest → supply-chain; (d) new-endpoint/egress heuristic →
   security+compliance — and `'low'` for a benign path set. Tests assert every category over
   fixture path sets and the benign→`low` case.

3. **`max(declared,derived)` decision + `triggered`.** The evaluate function composes
   `declaredRisk`+`derivedRisk` → `decision = max` over `low<standard<elevated<critical`;
   `triggered = decision >= 'elevated'`. Tests cover declared>derived, declared<derived, and equal.

4. **`drift` is independent of `triggered`.** `drift = declaredRisk < derivedRisk`. Tests assert:
   declared `low` + derived `elevated` → `drift:true, triggered:true`; declared `critical` +
   derived `low` → `drift:false, triggered:true`; declared `standard` + derived `low` →
   `drift:false, triggered:false`. Locks the two-axis rule (OQ5).

5. **Governing-spec resolution — three cases (PR4-6).** Over fixture active-spec descriptors +
   changed paths: (a) **single match** → `declaredRisk = spec.risk`, `governingSpec = path`;
   (b) **no match** → `governingSpec=null`, `declaredRisk='low'`, a `no-governing-spec` reason, and
   a no-spec diff on an elevated-derived surface yields `triggered:true` + `drift:true`;
   (c) **multi-match** → `declaredRisk = max(risk)` across matches, a `multi-spec` reason. A test
   passes a `draft` and a `done` descriptor and asserts neither governs.

6. **Path-matcher semantics.** Tests assert exact, directory-prefix (`plugins/foreman-line/
   integration/` covers a nested file), and glob (`.../verification/**` covers a nested `.ts`)
   matches, plus representative non-matches. No new runtime dependency is introduced.

7. **Projection to the frozen contract (OQ5).** `toAuditTriggerEvaluation(decision)` returns
   **exactly** `{ triggered, reason? }`: `triggered = (decision >= 'elevated')` — **never** true
   merely because of drift; drift + domains fold into `reason`. Tests assert (i) a drift case with
   `decision>=elevated` → `{triggered:true, reason contains 'spec-drift'}`; (ii) a
   `decision<elevated`, no-drift case → `{triggered:false}` (no drift wording); (iii) the projected
   object contains no key beyond `triggered`/`reason` (frozen-contract guard).

8. **Stage-E receipt integration — no new receipt/stage/contract change.** A fixture-isolated test
   builds a synthetic valid chain `genesis→A→…→D` (shared `correlationId`/`workflowId`, correct
   `prevHash`/`sequence`), computes a decision, projects it, passes it as `auditTrigger` to the
   **real** `emitIntegrationReceipt`, and asserts: the Stage-E receipt's
   `subject.auditTrigger` deep-equals the projected value; `validateChain([...A..D, E]).valid ===
   true`; and `E.correlation.correlationId === D.correlation.correlationId`. (Reuses the shipped
   emitter; proves the value flows through without minting correlation or adding a stage.)

9. **Report entrypoint — report-only / non-blocking.** The report's core, invoked with injected
   changed-paths and active-spec seams (fixtures), prints annotations reflecting
   `decision`/`triggered`/`drift` and **exits 0** even when `triggered` and/or `drift` are true.
   Tests assert the annotation content and the exit-0 contract; no network / real git / secrets.

10. **`foreman-line-ci.yml` amendment described (builder authors, additive — PR4-9).** The
    §Workflow amendment gives the concrete additive change (add the `report` script; supply the PR
    base ref to the existing report step if needed). Guards a reviewer can confirm: report-only, no
    required-status job added, path filter unchanged (`integration/**` + the workflow file), no
    duplication of `plugins.yml`'s per-package `npm test` gate.

11. **Correlation-mint guard.** No new file in this parcel mints a `correlationId` or emits a
    receipt (the only receipt path is the shipped `emitIntegrationReceipt`, which inherits). A test
    or reviewer-checkable assertion confirms the engine/report never construct a `correlation`
    object with a fresh `correlationId`.

12. **`npx tsc --noEmit`** passes with zero errors (run in `integration/`, PowerShell).

13. **`biome check .`** passes with zero diagnostics (run in `integration/`).

14. **All tests pass** via `npx tsx --test tests/*.test.ts`, including ACs 2–11. The suite is
    hermetic (no network/secrets/external-repo path) so it is green under `plugins.yml` on
    `ubuntu-latest`.

## Out of Scope

- **`spec-linter` corpus reconciliation + CI re-enable — SEPARATE parcel (coordinator ruling).**
  W4-P3 does **not** touch `spec-linter/`, does **not** re-enable it in `plugins.yml`, does **not**
  edit any `done/` spec. PR4-6's CI-re-enable prerequisite is satisfied by that separate parcel;
  the engine's declared half reads the **active** governing spec (linted at dispatch), not `done/`.
- **The `data_classification` definitional decision** (schematize into the spec-frontmatter schema
  + SPEC-CONVENTION §4 vs. strip from the six `done/` specs) — that separate parcel, pending Clint.
- **Any `.github/workflows/plugins.yml` edit** — the exclusion-removal is a D8 outward-facing
  human step owned by the separate corpus parcel, never agent-applied.
- **The inline audit RUN** (security-audit / compliance-audit skills; finding-based PR block) —
  the named dispatched follow-on **W4-FUP-AUDIT** (D5 / PR4-4). W4-P3 proves the trigger, not the run.
- **Promotion of any W4 check to required / blocking status** — human stop-and-present (D8 / PR4-7).
- **Any frozen-contract change** (`plugins/foreman-line/contracts/`, incl. adding a `drift`/
  `blocked` field to `AuditTriggerEvaluation`) — a **loop-stop**.
- **W4-P4** (GitHub gate assembly, Stage-F receipt, merge, Jira closure) and **W4-P2** (DocSpine
  hook) — later parcels.
- **Modifying any other shipped package** (`verification/`, `dispatch/`, `receipts/`, `approval/`,
  `contracts/`, `permission-profiles/`, `spec-linter/`) — consumed read-only via relative ESM.
- **Emitting a LIVE Stage-E receipt** — that happens during SCAF-P4's travel (this emitter + this
  engine); W4-P3's verification is hermetic unit tests only.
- **Status promotion, Jira/epics projection, receipt emission during shaping.** Shaping produces
  the draft + ShapingResult only; coordinator lint is the sole promotion authority.

## Workflow amendment — additive change to `.github/workflows/foreman-line-ci.yml`

> Descriptive only; the **builder** authors the YAML. W4-P1 created this workflow; it already
> invokes `npm run report --if-present` (a no-op until this parcel adds the script). The additive
> change: (1) the `report` npm script now exists, making that invocation live; (2) if the report
> needs the PR base ref to compute changed paths in CI, the existing report step receives it via
> env (e.g. `BASE_SHA: ${{ github.event.pull_request.base.sha }}`). It stays **report-only /
> non-blocking**, foreman-line-path-scoped, adds **no** required-status job, and does not duplicate
> `plugins.yml`'s per-package `npm test` gate (PR4-9). The `plugins.yml` spec-linter exclusion is
> NOT touched here (separate corpus parcel, D8 human step).

## Context & References

- Charter: `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md` — **D5**
  (audit-trigger execution model: decision + drift-block now, run dispatched follow-on), **D2**
  (build shape / hermetic tests / path filter), **D7** (P3 elevated / architecture-risk / dual
  review), **D8** (outward-facing carve-out), **D9** (Stage-E receipt reuse), the W4-P3
  decomposition row + PR4-9 collision discipline.
- Plan review: `.../plan-review-findings.md` — **PR4-4** (D5 narrows §6; blocking run is a named
  follow-on), **PR4-6** (PR→governing-spec resolution must be defined; spec-linter CI re-enable is
  the prerequisite — decoupled to a separate parcel per Step-0 ruling), **PR4-9** (P1 creates the
  workflow, P3/P4 amend additively).
- Loop directive: `.../loop-directive.md` — the NEXT:W4-P3 scope paragraph, the cross-parcel
  correlation invariant, and RW4 (W4-P3 adds the `report` script `foreman-line-ci.yml` invokes).
- Audit-trigger model: `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md` **§6** (declared+derived,
  the path→domain mapping, `max(declared,derived)`, drift = spec-drift blocks until reconciled).
- Frozen contract (consume, do not edit): `contracts/src/stages/e-integration.ts`
  (`AuditTriggerEvaluation { triggered, reason? }`, `IntegrationResult`).
- Shipped Stage-E emitter this engine feeds: `plugins/foreman-line/integration/src/receipt.ts`
  (`emitIntegrationReceipt` — consumes `auditTrigger`, inherits `correlationId`/`workflowId`);
  public surface `integration/src/index.ts`.
- Shipped W4-P1 spec (shape to mirror): `plugins/foreman-line/docs/specs/done/W4-P1-integration-stage-e.md`.
- Chain validity: `plugins/foreman-line/receipts/src/validator.ts` (`validateChain` / AC5c
  `checkSharedCorrelation`); consumed via `receipts/src/index.js`.
- CI: `.github/workflows/plugins.yml` (blocking per-package `npm test`, lines 44-78);
  `.github/workflows/foreman-line-ci.yml` (report-only scaffold W4-P1 created).
- Canon: `docs/SPEC-CONVENTION.md` (§4.6 `risk:`/`surfaces:` values; §4.7 surfaces vocabulary);
  `docs/transcripts/defects_lessons.md` (#22 typed try-catch on external-shape reads, #26 pre-PR
  `git diff --stat origin/main`); `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`.

## Verification Plan

- **Deterministic, fixture-isolated:** derived-risk mapping, governing-spec resolution, decision,
  drift, and projection are pure functions tested over fixtures. The chain-integration test (AC8)
  writes receipt fixtures under a temp `repoRoot` and runs the **real** `emitIntegrationReceipt`.
  The report is tested via injected changed-paths + active-spec seams. Zero network, zero secrets,
  zero external-repo path — green under `plugins.yml` on `ubuntu-latest`.
- **Harness proves the block (PR4-7):** the drift-*block* is asserted over the rich
  `AuditTriggerDecision` (ACs 4–5), not the report exit; SCAF-P4 later carries the ≥3 harness ACs
  incl. the declared-vs-derived mismatch case.
- **Dual review (D7):** elevated / architecture-risk — two independent reviewers.

## Open Questions (resolved at coordinator lint 2026-07-27)

- **KONE ticket — RESOLVED: keep `KONE-TBD`.** Build parcel; no Jira registration (matches every shipped W0–W4 build spec).
- **`subjectKind`/receipt slug — RESOLVED: N/A.** W4-P3 emits no receipt of its own; the trigger value rides in W4-P1's `stage:'E'` / `IntegrationResult` receipt.
- **Risk-level type source — RESOLVED: define `RiskLevel` LOCALLY in `audit-trigger.ts`.** Coordinator verified on disk: `contracts/src` exports NO four-level risk type; the `low|standard|elevated|critical` enum lives only in `spec-linter/src` (`schemas.ts`/`types.ts`), which the engine is forbidden to import (no `integration → spec-linter` edge — AC1). So the local definition is the only valid path (same pattern as W4-P1's local `inheritCorrelation`). Add a comment citing **SPEC-CONVENTION §4.6** as the canonical source so any future enum divergence is visible. The AC1 no-`spec-linter`-import guard is load-bearing.
- **New-endpoint/egress derived heuristic (AC2d) — RESOLVED: KEEP.** §6 names "new external endpoints or data egress → security + compliance" as a category, so it stays in the derived set. Implement as a documented, conservative path heuristic with the limitation stated in `reasons`; deep egress analysis is deferred to the dispatched run (W4-FUP-AUDIT). Do not drop it (dropping would deviate from §6).
