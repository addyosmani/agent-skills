# Adversarial Review — W0-P4 (receipt chain schema + structural validator) — Findings Report

**Two independent frontier reviews**, both distinct from coordinator (D4) and builder. Directive: docs/kickstarters/adversarial-review-W0-P4.md (five mandated focus questions from the spec's Verification Plan + five coordinator-flagged unruled probes).

- **Review A** (dispatched session): verdict **one Blocker** (B1), 2 should-fix, 6 nits. Probed directory content the fixtures never exercise and reproduced the blocker live at the CLI boundary.
- **Review B** (independent session, relayed): verdict **no blocking findings**, 1 should-fix, 3 nits. Did not probe the malformed-chain-member case; otherwise strongly overlapping with A.

Both reviews independently recomputed the AC8 hash vector against the cited `skills/parcel-compiler/tool` algorithm (not the package's test helper) and got `06d29ab6…ee23` — exact match, twice over.

## Mandated focus results (both reviews concur, all five PASS)

1. **Chain-splice resistance honestly bounded:** limitation stated plainly in validator.ts:10-15 module header, README "The honest limit of chain validation" section, and spec; all 47 test names audited — none overstates ("prevHash pointer mismatch", never "tamper"). The passing chain fixtures use dummy hashes the validator accepts, demonstrating the structural boundary by construction.
2. **Hash domain unambiguous, vector verified:** key sort is UTF-16 code-unit order per RFC 8785; null cases (`claimRef`/`prevHash`/`signature`) serialize deterministically; nested `subject` recurses correctly; top-level-only `hash` exclusion stated. Both reviewers' independent recomputations match the fixture and README.
3. **Canonicalization-authority boundary:** zero runtime import from `skills/parcel-compiler/tool/` (prose citations only); `tests/support/canonical.ts` referenced solely by `tests/hash-vector.test.ts`, never exported from `src/index.ts`, never touched by any `src/` module.
4. **W0-P1 non-pre-emption:** `contracts/` git-clean; `ReceiptRef`/`HarnessClaimResult`/`AdversarialFinding` appear only as prose + one string-literal `subjectKind` sample in paths.test.ts — a tag value, not a type. No field added, no type redefined, no fixture shaped like the frozen types.
5. **Cross-package import precedent:** relative specifier only (types.ts:12, schemas.ts:13, paths.ts:8); no bare `@foreman-line/contracts` in code; `src/index.ts` re-exports only local symbols (no contracts-surface widening; `correlationContextSchema` embedded by composition, the same pattern contracts' own envelope.ts uses); root `package.json` untouched; resolution proven under both `tsc --noEmit` and `tsx --test`.

## Findings

**B1 (Review A, BLOCKER — coordinator-reproduced before triage):** `validateChain` throws an unhandled `TypeError` on malformed chain members. validator.ts:122 (`checkSharedCorrelation`) dereferences `doc.correlation.workflowId` unconditionally. A chain directory containing a stray `.json` whose content is a JSON scalar (cli.ts:44 admits any `*.json`), or a member with `"correlation": null`, crashes with a stack trace on stderr instead of the violation list — exit 1 only via Node's uncaught-exception default. This breaks the exit-code contract this parcel *freezes* ("every violation listed on stderr") and the Step-0-ratified rule that non-conforming directory content "surfaces as whatever chain-invariant violations it causes under AC5". The per-document schema violations were already correctly recorded (validator.ts:136-141) before the crash discarded them. AC9's fixtures all pass because none contains a non-object member — the defect lives exactly in the blind spot the deterministic checks cannot see. **Coordinator reproduction:** scalar `notes.json` copied into a valid chain dir → `TypeError: Cannot read properties of undefined (reading 'workflowId')` at validator.ts:122, stack trace on stderr. Confirmed.

**S1 (both reviews):** `receiptPath` (paths.ts:10-22) interpolates `workflowId` and `subjectKind` with zero validation. Verified: `subjectKind = '../../evil'` and `workflowId = '../../../etc'` both emit locators escaping `docs/receipts/<workflowId>/`; `/`, `\`, `:`, `"`, spaces survive the slug transform, producing filenames illegal on NTFS (this repo's own dev environment). Also `receiptPath(wf, -1, …)` emits `0000-1-…`. Severity honestly bounded (Review B): pure string builder, no filesystem I/O in this parcel, inputs are developer-authored pipeline metadata — not exploitable *here*. But this parcel freezes the locator convention W3 will write git-committed files against, with no stated input contract. Review A rules runtime guard; Review B rules documented precondition with guard optional.

**S2 (Review A):** `validateChain([])` returns `valid: true` (all three chain checks vacuous on an empty array), contradicting the Step-0-ratified "empty chain directory is a usage error — there is nothing to validate". The CLI's exit-2 path pre-empts this for directory input, but a direct library consumer (W3) gets a "valid" verdict for an empty chain. Undocumented divergence.

**Nits:**
- **N1 (both):** 6-digit padding ceiling undocumented; at `sequence >= 1,000,000` the 7-digit filename breaks the lexicographic sort-key convention (verified: `1000000-…` sorts before `999999-…`). Debt, not defect — but the bound is frozen nowhere.
- **N2 (both):** slug transform non-injective (`HTTPResult` → `httpresult`, `HttpResult` → `http-result`). The sequence+stage prefix keeps filenames unique within a chain; cosmetic tail only.
- **N3 (Review A):** nested strictness *holds* (correlationContextSchema and signatureSchema both carry `additionalProperties: false` — W0-P1's schema doing the work) but no fixture exercises an unknown field nested in `correlation`; a regression in the imported schema would go unnoticed by this suite.
- **N4 (A) / N2 (B):** `signature` "MUST be null in this wave" is prose-only — the schema accepts a well-formed Signature object. Consistent with the ACs (deliberately absent from AC3's reject list; the schema usefully pre-defines the future shape); "MUST" reads stronger than the unenforced reality.
- **N5 (A):** hash-domain micro-edge — `JSON.parse('1e400')` yields `Infinity`, which the schema accepts but the cited `canonicalize` throws on. The algorithm's throw IS the defined answer; unreachable via honestly-produced receipts.
- **N6 (A):** README prints ~2.5 pages against AC13's ≤ 1.5-page cap.
- **N3 (B):** README says "the 6-digit filename sequence prefix is the sort key"; the implementation sorts by full filename lexicographically and admits any `*.json`. Coincides for conforming names; wording conflates the two.
- **Duplicate-prefix probe (both):** two files sharing a 6-digit prefix both load, tie-broken by full-filename sort; payload sequence collisions surface as AC5a duplicate violations, exit 1. Sound.

---

## Coordinator triage (post-review)

Where the two reviews disagree, the coordinator rules and records the reasoning.

| Finding | Disposition | Route |
|---|---|---|
| B1 | **Fix — merge gate.** Chain-level checks must never throw on arbitrary JSON values as members: a member that is not a JSON object, or whose `correlation` is not a JSON object, is excluded from the cross-member comparisons it cannot participate in and is reported via its (already-recorded) per-document schema violations. `checkPrevHashPointers`/`checkSequenceContiguity` survive today only by accidental `undefined` semantics — guard them explicitly, not by luck. Two new rejecting fixtures (scalar-JSON member; `correlation: null` member) asserted at the CLI boundary: exit 1, violations on stderr, no stack trace. Spec amended (rework amendment, coordinator-ratified). | Rework |
| S1 | **Fix — runtime guard AND documented precondition.** Ruling with Review A over Review B's guard-optional stance: the locator convention freezes in this parcel; a guard costs nothing for legitimate input and is expensive to retrofit after W3 depends on the surface (the exact reasoning that anchored W0-P3's frontier registry in code). `workflowId` must match `UUID_PATTERN`; `sequence` must be an integer in 0..999999 (also closes N1's enforcement half); `stage` must be one of `STAGE_IDS`; the slugified `subjectKind` must be non-empty and match `^[a-z0-9-]+$` (reject, don't strip — silent stripping changes locators). Violations throw `RangeError` naming the offending argument. Format unchanged for all legitimate input. Spec amended. | Rework |
| S2 | **Fix.** `validateChain([])` returns invalid with a "chain contains no receipts" violation, aligning the library verdict with the ratified CLI semantics; README documents that the CLI's exit-2 usage error pre-empts this path for directory input. Spec amended. | Rework |
| N1 | Fix — enforcement folded into S1's sequence bound; plus one README sentence stating the 6-digit ceiling where the convention is documented | Rework |
| N3 (A) | Fix — one rejecting fixture: unknown field nested inside `correlation`, proving the imported schema's strictness stays load-bearing | Rework |
| N4 (A) / N2 (B) | **Accept as documented.** No schema enforcement: the wave rule is temporal and the frozen schema stays wave-agnostic (the spec deliberately kept signature-non-null out of AC3's reject list). README wording softened to "null by convention in this wave (not schema-enforced; no signing infrastructure exists)". | Rework (doc line) |
| N2 (A/B slug) | Accept — one README sentence noting the transform is non-injective and the sequence+stage prefix is what guarantees filename uniqueness; no code change | Rework (doc line) |
| N3 (B) | Fix — README wording: full-filename lexicographic sort, which coincides with the 6-digit prefix for conforming names | Rework (doc line) |
| N5 (A) | Informational — the cited algorithm's throw is the defined behavior; no change | Closed here |
| N6 (A) | Fix — trim README to AC13's ≤ 1.5 pages while making the doc edits above; AC13 is an AC, not a suggestion | Rework |
| Duplicate-prefix probe | Informational — behavior sound as ratified | Closed here |

Rework directive: docs/kickstarters/foreman-line-parcel-W0-P4-rework.md. Test-count tripwire applies: 47 must strictly increase (B1 ≥ 2, S1 ≥ 4, S2 ≥ 1, N3-A ≥ 1 new tests expected — a claim whose test count does not increase will be rejected without inspection).

## Closure record

**Rework attempt 1: ACCEPTED — all items closed, verified against disk.** Step 0 gate: builder verified the 47-baseline live before restating, flagged four genuine ambiguities; coordinator ruled option-by-option (contiguity participation is capability-based, 0..M-1 over participants; prevHash adjacency skips excluded members, no bridging; non-integer sequence rejection in scope; AC13 operationalized at ≤110 source lines target / 120 ceiling). B1: participant-list guards in all three chain checks; the coordinator's original reproduction directory now exits 1 with `receipts[2]: (root) must be object` on stderr and zero stack trace — the blocker's own repro is the closure proof. S1+N1: `receiptPath` RangeError guards (UUID_PATTERN verified anchored at contracts/src/correlation.ts:8-9; sequence 0..999999; STAGE_IDS; slug reject-not-strip), format byte-identical for legitimate input. S2: `validateChain([])` invalid with "chain contains no receipts". N3-A: nested-unknown-field fixture rejects via the imported schema's strictness. Doc pass: all six README items present, trimmed under the ruled cap. Deterministic rework pass green: tsc 0, biome 0, **62/62 tests (47 → 62, +15; floor was 55)**. Dependency allowlist still exactly {ajv}; contracts/ and root package.json untouched; canonical.ts helper still test-only. Spec amendment 5d530fb committed alone, before code. Transcript: docs/transcripts/build-W0-P4-deterministic-pass.md (rework section).
