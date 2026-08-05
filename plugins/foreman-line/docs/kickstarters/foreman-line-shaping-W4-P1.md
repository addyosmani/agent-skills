# Shaping Session Kickstarter — W4-P1 (Integration / Stage-E)

You are the Shaping Agent for Foreman Line parcel **W4-P1**. Run the `/foreman-shaping` skill (`plugins/foreman-line/skills/foreman-shaping/SKILL.md`) and follow it exactly. This is a **Step 0 dispatch** — restate and STOP for the coordinator's answers before authoring any draft.

## Inputs

- **Idea:** Build **Stage E (Integration)** of the Foreman Line: the capability that takes a built, verified parcel branch and (a) commits/pushes/opens its PR, (b) verifies the branch-protection posture ("agents cannot merge" — *verified via the GitHub effective-rules API, not assumed*; lesson #15), and (c) emits a **Stage-E `ReceiptDocument`** on PR open, chained from the Stage-D verdict. Per charter **D2**, the logic ships as a sandboxed, tested `plugins/foreman-line/integration/` package (pure functions the CI workflow *invokes*), plus a NEW **report-only** workflow `.github/workflows/foreman-line-ci.yml`.

- **Context references (read before restating):**
  - Charter: `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md` — **D2** (build shape: packages + report-only workflow; hermetic tests; workflow path filter must not double-run the per-package suites `plugins.yml` already owns), **D8** (outward-facing carve-out), **D9** (Stage-E/F receipts reuse `ReceiptDocument`, stage `'E'`), the W4-P1 decomposition row.
  - Loop directive: `plugins/foreman-line/docs/goals/w4-ci-integration/loop-directive.md` — the **cross-parcel correlation invariant** (below) and the `foreman-line-ci.yml` ownership rule (P1 CREATES it; P3/P4 amend additively).
  - **CROSS-PARCEL INVARIANT (load-bearing, from W4-P0):** the Stage-E receipt MUST **inherit** the prior stage's `correlationId` (mint only fresh `sessionId`/`runId`) — NEVER mint a fresh `correlationId`. W4-P0 just fixed exactly this defect at Stage C (`dispatch/src/approval-cli/index.ts`, shipped `b8cca96`); mirror that inherit pattern. If Stage E mints fresh, SCAF-P4's exit chain fails the receipts validator's AC5c invariant (`receipts/src/validator.ts:147-170`). Verify the receipt shape on disk against `contracts/` (`STAGE_IDS` includes `'E'`; `ReceiptDocument` schema) — a need to change a frozen `contracts/` file is a **loop-stop**.
  - Existing CI: `.github/workflows/plugins.yml` (auto-runs `npm test` on every package as a BLOCKING gate — so W4-P1's `integration/` package tests MUST be **hermetic**: no secrets, no external-repo path, no network), `apps.yml`. Package pattern to mirror: `plugins/foreman-line/dispatch/` (package.json, tsconfig.json, biome.json, src/index.ts, tests/).
  - Shipped Stage-D output W4-P1 consumes: the `VerificationVerdict` envelope + Stage-D closure receipt (`plugins/foreman-line/verification/`). Confirm the exact hand-off shape on disk.
  - Canon: `docs/SPEC-CONVENTION.md`; `docs/transcripts/defects_lessons.md` (#15 effective-rules API for branch protection; #19 linear-time string ops; #22 typed try-catch; #26 pre-PR `git diff --stat origin/main`; #27 hold-scoping); `COORDINATOR-PATTERN.md`.

## Where you work

- Worktree: `C:\Repos\foreman-line-w4-p1` on branch `feat/foreman-line-w4-p1`, branched from current `main` (which includes W4-P0 `b8cca96`). Do ALL work there; never touch the main working tree, never check out another branch, never push.
- Environment: Windows. Node toolchain in **PowerShell only**, `node -v` first (>=24.11.1).

## Step 0 — restate and STOP (mandatory gate)

Restate the idea; propose the parcel decomposition (risk **standard**, routing **standard-feature** per charter D7 — but if you judge W4-P1 too large for one parcel/branch given its distinct concerns [integration package, the new workflow, the Stage-E receipt, the branch-protection verifier], SAY SO and propose a split); enumerate the exact draft files; confirm out-of-scope; list clarifying questions in small numbered batches, each with a recommended default. Then STOP.

**Questions you MUST surface for the coordinator (do not resolve yourself):**
1. **D8 carve-out check on `foreman-line-ci.yml`.** Creating a NEW `.github/workflows/*.yml` is adjacent to D8's outward-facing carve-out. Frame precisely: is a *report-only, foreman-line-path-scoped, non-blocking* new workflow within standing authorization to create, or a stop-and-present? (Recommend the coordinator decide; note that D8's carve-out targets workflows that *gate non-foreman-line PRs*, branch-protection changes, and required-status promotion — a report-only additive workflow gates nothing.)
2. **Stage-E trigger semantics.** Does Stage E emit its receipt when the coordinator opens the PR (coordinator-invoked function), or inside the `foreman-line-ci.yml` run (CI-invoked)? Where does the receipt get written and committed?
3. **Branch-protection verifier scope.** Is the effective-rules API check a read-only assertion function in the `integration/` package (recommended), with the actual ruleset configuration remaining a human step (D8)?

## Outputs (after answers)

- Parcel spec draft(s) under `plugins/foreman-line/docs/specs/active/` at `status: draft`, passing the advisory self-check (`plugins/foreman-line/shaping/`).
- One `.shaping-result.json` with `parcelSpecRefs` (POSIX, ≥1) and `epics: []`, emitted via `emitShapingResult` after `deriveSessionSlug`.

## STOP boundary

No `status` flip, no epics/Jira, no receipt emission, no implementation code, no workflow-file creation during shaping (the spec *describes* `foreman-line-ci.yml`; the builder creates it after dispatch). Coordinator lint is the sole promotion authority. A frozen-contract need is a loop-stop.

## Completion

Report the draft path(s), the ShapingResult path, and any open questions awaiting a coordinator decision.
