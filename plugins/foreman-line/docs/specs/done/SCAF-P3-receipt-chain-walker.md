---
ticket: KONE-23209
title: Foreman Line - receipt-chain walker (SCAF-P3 exit proof)
status: draft
owner: clinton.morgan
created: 2026-07-24
updated: 2026-07-24
supersedes: null
superseded_by: null
# --- schema v0.2 fields (frozen by W0-P2) ---
risk: standard
surfaces: [plugins/foreman-line/verification/src/chainwalk/**, plugins/foreman-line/verification/tests/chainwalk.test.ts]
routing_class: standard-feature
data_classification: internal
permission_profile: builder-standard   # additive TypeScript module + tests, no new runtime dependency, no registry egress, no network. Same rationale as SCAF-P2.
---

# SCAF-P3 - Receipt-Chain Walker

## Intent

Add a small, read-only receipt-chain walker to the `verification/` package: `walkChain(workflowId, repoRoot)` mechanically verifies that a workflow's receipt chain under `docs/receipts/<workflowId>/` is walkable genesis → tip (contiguous sequences, each `prevHash` equal to the prior receipt's `hash`, every document valid against the frozen receipt validator), and `renderChainTable(result)` renders the deterministic markdown chain table that the W3-P4 human-gate summary and Stage-F PR bodies present by hand today. The w3-verification exit criterion is literally "the receipt chain must be walkable genesis → A → B → C → D" — this parcel turns that from a manual read into a checkable function, and is itself the bounded exit-proof vehicle (charter D6) that travels the full pipeline: shaped → registered (W1) → dispatched (W2) → built → verified through the complete W3 Stage-D chain.

**Content-selection justification (charter D6):** the walker is genuinely useful (it operationalizes the goal's own exit criterion and feeds the W3-P4 summary's "receipt chain table"), strictly bounded (one new sub-module + one test file, 5 ACs), scoped to `plugins/foreman-line/verification/` (the charter-named surface), purely additive (no existing file modified, no frozen contract touched — it only *consumes* the shipped `receipts/` validator), and fully offline (tests run against fixture receipt directories in a temp dir; no Jira, no network). It was chosen over a docs-generating helper because its output is exercised by the very pipeline run that proves it.

## Constraints

- **Additive only.** Exactly two new files: `plugins/foreman-line/verification/src/chainwalk/index.ts` and `plugins/foreman-line/verification/tests/chainwalk.test.ts`. No existing file in `verification/` (or anywhere) is modified — including `src/index.ts`: the module is **not** re-exported from the package barrel (precedent: `writeClaimReceipt` in `src/harness/index.ts` is deliberately un-barreled). Consumers import it by direct path.
- **Frozen boundaries untouched.** No change to `contracts/`, `receipts/`, `routing-policy/`, `skill-injection/`, W1/W2 packages, or any schema byte. The walker imports `validateReceiptDocument` (and types) from `../../../receipts/src/index.js` via the established filesystem-relative ESM specifier; no bare specifiers, no root `package.json` change, no new dependency (the package's dependency-allowlist stays byte-identical).
- **Read-only.** `walkChain` performs no writes anywhere. Its only filesystem access is `readdirSync`/`readFileSync` under `docs/receipts/<workflowId>/`.
- **Input hardening.** `workflowId` is joined into a path, so it is validated against the hyphenated 8-4-4-4-12 hex UUID shape with a linear-time char-code guard *before any filesystem access* (mirror of the harness's RF-3 guard — reimplemented locally, not imported, because `assertValidWorkflowId` is intentionally private to `src/harness/`).
- **Lessons discipline:** #19 — all filename/label scanning is linear-time (char-code loops / `indexOf` / `startsWith`; no backtracking regex; must survive the CodeQL polynomial-redos gate); #22 — every filesystem read is wrapped in a typed try-catch throwing a `ChainWalkError` with a named code; #9 — builder works on a named feature branch in its own worktree (named in the dispatch kickstarter); #10/#11 — deterministic pass in PowerShell only, `node -v` first, never read `$LASTEXITCODE` through a truncating pipeline.
- **Receipt-name recognition** follows the shipped 6-digit-prefix convention (`^\d{6}-<stage>-<slug>.json`, per `receipts/src/paths.ts`); non-conforming filenames in the directory are ignored, exactly as `allocateSequence` does.
- **Determinism.** `renderChainTable` output depends only on its input `ChainWalkResult` — no timestamps-of-now, no environment reads — so it is snapshot-testable.
- Integration is PR-only; per SPEC-CONVENTION §3 this spec moves to `done/` in the same PR (or immediate follow-up) as a merge-checklist item.

## Acceptance Criteria

Authored per `plugins/foreman-line/verification/AC-CONVENTION.md` (sequential 1-based labels, one criterion per ID; each criterion proven by ≥1 passing test whose name contains its token, right-bounded — the shipped harness's `extractAcs`/`referencesAc` will mechanically parse and grade these).

AC-1: `plugins/foreman-line/verification/src/chainwalk/index.ts` exists, exporting `walkChain(workflowId: string, repoRoot?: string): ChainWalkResult`, `renderChainTable(result: ChainWalkResult): string`, and a typed `ChainWalkError` (named `code` field). It is not re-exported from `verification/src/index.ts`, adds no dependency (the package's runtime-dependency key set is unchanged), and the parcel's commit range adds exactly the two new files with zero modifications to existing files (`git diff --stat` against the base shows additions only).

AC-2: On a fixture directory containing a valid chain (genesis receipt with `prevHash: null`, then receipts whose sequences are contiguous from the genesis and whose `prevHash` each equals the prior receipt's `hash`, all passing `validateReceiptDocument`), `walkChain` returns `ok: true` with one entry per receipt in sequence order, each entry carrying `sequence`, `stage`, `kind`, `claimRef` (null when absent), `subjectKind`, and `hash` — proven against a fixture chain that spans multiple stages, and non-conforming filenames in the same directory are ignored.

AC-3: `walkChain` fails loud with a `ChainWalkError` carrying a distinct named code for each defect class — missing/empty receipt directory, unreadable/unparsable receipt file, receipt failing `validateReceiptDocument`, sequence gap or duplicate, `prevHash` not equal to the prior receipt's `hash`, genesis `prevHash` not null, and a `workflowId` failing the UUID guard (thrown before any filesystem access, including for traversal input like `../../..`). It never returns a partial `ok: true`.

AC-4: `renderChainTable` renders a deterministic GitHub-markdown table with a header row and one row per chain entry — columns: sequence, stage, kind, `claimRef`/`subjectKind`, truncated hash prefix (fixed length) — byte-identical across repeated invocations on the same input (snapshot-tested), suitable for embedding in the W3-P4 human-review summary and PR verification-chain tables.

AC-5: Quality gates hold in `verification/`: `npx tsc --noEmit` passes with zero errors, `npx biome check .` passes with zero diagnostics, and the full suite passes via `npx tsx --test tests/*.test.ts` — with all chainwalk string scanning linear-time (char-code / `indexOf` / `startsWith`; no backtracking regex) and every filesystem read wrapped in a typed try-catch throwing `ChainWalkError`.

## Out of Scope

- Modifying any existing file — `verification/src/{index.ts,harness,adversarial,pipeline,human-gate}/**`, any frozen contract/schema/package under `plugins/foreman-line/`, root `package.json`, or `AC-CONVENTION.md`. Any need to do so is a Stop-and-Report, not a builder ruling.
- Re-exporting chainwalk from `verification/src/index.ts` or any barrel; wiring it into W3-P3/W3-P4 call sites (adoption is a future parcel once shipped).
- Any write path: repairing, re-hashing, or re-sequencing a broken chain; the walker only reports.
- A CLI wrapper, cross-workflow scanning of all of `docs/receipts/`, or receipt *content* semantics beyond schema validity + linkage (e.g. grading claim subjects — that is the harness's job).
- Jira/network access in the parcel's own code or tests (registration and the Stage-D ticket transition happen via the pipeline machinery around this parcel, not inside it).
- New dependencies or npm workspace linking.

## Context & References

- `plugins/foreman-line/docs/goals/w3-verification/charter.md` — D6 (exit-proof vehicle; ≥3 harness-checkable ACs; `verification/` or adjacent low-risk surface), exit criterion ("receipt chain must be walkable genesis → A → B → C → D").
- `plugins/foreman-line/verification/AC-CONVENTION.md` — the named-test convention this spec's criteria bind to (§2 authoring, §3 test naming, §4 token boundary, §5 reporting).
- `plugins/foreman-line/verification/src/harness/index.ts` — `extractAcs` (line-start labels, duplicate/gap fail-loud), `referencesAc`, `allocateSequence`/`scanChainTip` (the filename-convention and tip-hash logic the walker generalizes to a full walk), RF-3 UUID guard pattern.
- `plugins/foreman-line/receipts/src/index.ts` — `validateReceiptDocument`, `receiptPath` (frozen; consumed, never modified).
- `plugins/foreman-line/docs/specs/done/W3-P1-verification-harness.md`, `W3-P4-human-gate-jira.md` — the harness this parcel is graded by; the human-gate summary whose "receipt chain table" this walker feeds.
- `plugins/foreman-line/docs/specs/done/SCAF-P2-shared-test-scaffold-extraction.md` — prior exit-proof spec pattern (including `data_classification`, present here from shaping — the SCAF-P2 omission-then-amendment is not repeated).
- `docs/transcripts/defects_lessons.md` #9, #10, #11, #19, #22, #23.

## Workflow (pipeline traversal — the reason this parcel exists)

1. **Register (Stage B, W1):** ticket created in the **KONE** Jira project via the W1 machinery (`jira-workflow` skill + W1-P4 MCP transport, default-deny gate); frontmatter `ticket:` and the filename link updated with the real key; spec status flips `draft → active` on coordinator lint pass.
2. **Dispatch (Stage C, W2):** `executeDispatch` CLI; builder in its own worktree/branch under the `builder-standard` envelope emitted at dispatch.
3. **Build:** out-of-band builder session; coordinator calls `recordBuildResult` on completion.
4. **Verify (Stage D, W3):** harness runs these five ACs as named-test executable checks (per-claim sub-receipts) → adversarial reviewer via the shipped W3-P2 headless dispatch (single review; standard-feature) → W3-P3 verdict assembly with mechanical rework routing → **W3-P4 human gate: Clint's one-tap CLI approval is required**; on approval the Jira ticket transitions via the W1-P4 transport and the Stage-D closure receipt is emitted.
5. **Exit proof:** the resulting chain — genesis → A → B → C → D — is walkable; fittingly, by the function this parcel ships.

### Dispatch context (Kompress-sized, per loop-directive lesson #23 — keep under ~200 tokens)

> SCAF-P3: add read-only receipt-chain walker to `verification/` — two new files only (`src/chainwalk/index.ts`, `tests/chainwalk.test.ts`), nothing else modified. `walkChain(workflowId, repoRoot)` validates UUID input pre-fs, scans `docs/receipts/<workflowId>/` (6-digit-prefix names only), verifies contiguous sequences + `prevHash` linkage + `validateReceiptDocument` per receipt; returns typed `ChainWalkResult` or throws `ChainWalkError` (named codes, one per defect class). `renderChainTable` renders a deterministic markdown table (snapshot-tested). No barrel export, no new deps, no writes, no network. Linear-time scans (#19), typed try-catch on every read (#22). Five ACs, named-test convention (AC-CONVENTION.md). Gates: tsc, biome, `tsx --test`.

## Verification Plan

Deterministic (PowerShell only, `node -v` first): `npx tsc --noEmit`, `npx biome check .`, `npx tsx --test tests/*.test.ts` in `verification/`; `git diff --stat` confirming an additions-only two-file diff; dependency-allowlist key set unchanged. The harness then re-grades all five ACs mechanically via named tests; matrix check `test-coverage.check` fires (the `'*'` row of `skill-injection.yaml` `verifier_harness:`) and blocks on failure.

Adversarial review mandated focus questions:
1. **Additive-only, actually verified:** confirm from git history (not just diff-stat exit) that no pre-existing file changed by one byte, and chainwalk is unreachable from `src/index.ts`.
2. **Fail-loud completeness:** perturb a fixture chain each way (gap, duplicate sequence, broken `prevHash`, invalid document, non-null genesis `prevHash`) and confirm a distinct typed error every time — no partial `ok: true`.
3. **Path-traversal hunt:** confirm the UUID guard runs before any fs call and rejects traversal-shaped input.
4. **Redos hunt:** confirm no backtracking regex anywhere in the new module.
5. **Determinism:** confirm `renderChainTable` is a pure function of its input (no clock/env reads).

## Epic/Story/Task Projection (proposal only — registration is Stage B via W1)

- **Epic:** Foreman Line — W3 Verification
  - **Story:** SCAF-P3 — Receipt-chain walker (exit-proof vehicle)
    - **Task:** `src/chainwalk/index.ts` — `walkChain`, `renderChainTable`, `ChainWalkError` (AC-1..AC-4 criteria)
    - **Task:** `tests/chainwalk.test.ts` — named-test coverage of all five criteria incl. fixture chains + negative cases
    - **Task:** Verification sweep — tsc/biome/tsx gates, additions-only diff, allowlist unchanged (AC-5 plus the AC-1 diff check)
