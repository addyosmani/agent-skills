# Shaping Session Kickstarter — W4-P0 (correlation-lineage fix)

> **DISPATCH-AUTHORIZED (2026-07-26).** The `w4-ci-integration` charter is at a partial Gate-1 re-open, but that re-open is scoped to the **exit criterion / D6 / D8** — all of which concern SCAF-P4 and the merge/branch-protection model. **W4-P0 is orthogonal**: its scope is fixed by D1 + D3 (ratified, not under re-ratification), and its Gate-2 dispatch authorization was granted at initial ratification. Shaping is docs-only and stops at Step 0 for a coordinator ruling before any draft. Proceeding does NOT touch any pending element and does NOT constitute re-ratification of the SCAF-P4 exit.

You are the Shaping Agent for `W4-P0`. Run the `/foreman-shaping` skill (`plugins/foreman-line/skills/foreman-shaping/SKILL.md`) and follow it exactly.

## Inputs

- **Idea:** Fix the receipt-chain correlation lineage so a full Stage A→F chain is `validateChain`-valid. Today the shipped dispatch machinery mints a **fresh** `correlationId` at Stage C, breaking the AC5c shared-correlation invariant for every chain beyond A→B. The fix: at the Stage-C `DispatchOrder` receipt assembly, **inherit the prior stage's `correlationId`** (and `workflowId`, already inherited) instead of minting a new one — mirroring the already-shipped D-stage `inheritCorrelation` pattern — while continuing to mint fresh `sessionId`/`runId`.
- **Context references:**
  - Charter: `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md` — D1 (order: P0 first), D3 (this fix), D9 (chain validity via `validateChain`).
  - Plan review: `plugins/foreman-line/docs/goals/w4-ci-integration/plan-review-findings.md` — PR4-8 (precise defect + fix shape), verified-true section.
  - **Coordinator-verified disk facts (confirm each before drafting ACs):**
    - `plugins/foreman-line/dispatch/src/approval-cli/index.ts:378-388` — the Stage-C `DispatchOrder` receipt draft; line 384 is the `correlationId: randomUUID()` to replace with an inherited value. `workflowId` is already threaded (line 386); `pkg.prevHash` (line 390) is the Stage-B chain tip.
    - `plugins/foreman-line/verification/src/harness/index.ts:314-338` — `inheritCorrelation(source, sessionId, runId, failCode, sourceLabel)`: the exact pattern to mirror (reads `source.correlation.{workflowId, correlationId}`, keeps both, mints fresh session/run). Determine whether to reuse/export this helper or replicate it in dispatch.
    - `plugins/foreman-line/receipts/src/validator.ts:147-170` — `checkSharedCorrelation` / `validateChain`: the AC5c invariant the fix must satisfy (all participants share `workflowId` AND `correlationId`).
  - Canon: `docs/SPEC-CONVENTION.md`, `docs/transcripts/defects_lessons.md` (#1–#26; esp. #22 typed try-catch, #26 pre-PR `git diff --stat origin/main`), COORDINATOR-PATTERN.md.

## Where you work

- Worktree: `C:\Repos\foreman-line-w4-p0` on branch `feat/foreman-line-w4-p0`. Do ALL work there; never touch the main working tree, never check out another branch, never push.
- Environment: Windows. Node toolchain commands run in **PowerShell only**; run `node -v` first (must satisfy `>=24.11.1`).

## Step 0 — restate and STOP (mandatory gate)

Before writing any draft: restate the idea in your own words; state the single parcel you propose (risk **elevated**, routing **architecture/risk** — this reopens shipped W2 dispatch machinery, dual adversarial review per D7); enumerate the draft files you will create; confirm what is out of scope; list clarifying questions in small numbered batches, each with a recommended default. Then STOP and wait for the coordinator's answers.

## Shaping-specific guidance (this is a fix to SHIPPED code, not a greenfield parcel)

- **Surfaces:** `plugins/foreman-line/dispatch/` is the sole authorized reopen this wave (D3). Determine the minimal edit surface. If the `correlationId` source at Stage C is not cleanly available without threading it through `prepareDispatch`/the `pkg` shape, surface that as an Open Question — do NOT expand scope silently.
- **No frozen-contract change** — verified: `correlation-context.schema.json` pins UUID *format* only; `STAGE_IDS` already covers A–F. If the fix appears to require editing anything under `plugins/foreman-line/contracts/`, that is a **loop-stop** — STOP and report.
- **Acceptance criteria must include** a regression test that asserts **`validateChain` passes over a full A→F chain** (not merely `walkChain`, which checks `prevHash` linkage but NOT AC5c). Prefer a fixture-isolated test that builds a genesis→A→…→F chain through the real machinery and asserts `validateChain(...).valid === true`.
- **Note for the AC author:** pre-fix on-disk chains (e.g. `1912af36…`, `bfdba601…`) are hash-chained and **non-migratable** — they will remain AC5c-invalid and are out of scope; the fix applies to newly-minted chains only. State this in Out of Scope.

## Outputs (after answers)

- One parcel spec draft under `plugins/foreman-line/docs/specs/active/` at `status: draft`, passing the advisory self-check (`plugins/foreman-line/shaping/`).
- One `plugins/foreman-line/docs/specs/active/<SESSION-SLUG>.shaping-result.json` with `parcelSpecRefs` (POSIX, `>= 1`) and `epics: []`. Derive the slug via `deriveSessionSlug` before calling emit.

## STOP boundary

No `status` flip (draft → active), no `epics` filling, no Jira registration, no receipt emission/hashing, and **no implementation code** — shaping produces the spec only. Coordinator lint is the sole promotion authority. A need to change a frozen contract is a loop-stop.

## Completion

End by reporting the draft path, the `ShapingResult` path, and any open questions still awaiting a human/coordinator decision.
