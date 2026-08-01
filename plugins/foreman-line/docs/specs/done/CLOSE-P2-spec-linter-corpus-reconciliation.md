---
ticket: KONE-TBD
title: Foreman Line - CLOSE-P2 spec-linter corpus reconciliation (grandfather rule, data_classification, CI re-enable)
status: active
owner: clinton.morgan
created: 2026-07-28
updated: 2026-07-28
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/spec-linter/, .github/workflows/plugins.yml, docs/SPEC-CONVENTION.md]
routing_class: standard-feature
permission_profile: builder-standard
---

# CLOSE-P2 — Spec-linter corpus reconciliation + CI re-enable

> **Surfaces vocabulary note (honest advisory):** the `.github/workflows/plugins.yml`
> entry is outside the §4.7 canonical prefix vocabulary (`docs/`, `plugins/`, `skills/`,
> `apps/`, `config/`). The spec-linter will emit a non-blocking advisory warning for it.
> This is deliberate (same posture as CLOSE-P3): the workflow is a real surface this
> parcel touches, and inventing a canonical-looking prefix to silence the advisory would
> be dishonest. Extending §4.7 is a separate reviewed PR, out of this parcel's scope.
>
> **`docs/specs/done/` is deliberately NOT a surface.** The grandfather mechanism exists
> precisely so no done/ spec's content is edited. If the builder finds an edit to any
> `done/` spec unavoidable, that is a stop condition — report to the coordinator, do not
> edit.

## Intent

`plugins/foreman-line/spec-linter`'s own test suite is excluded from CI (`plugins.yml`
test loop, "known corpus debt" warning) because `spec-linter validate` over
`plugins/foreman-line/docs/specs/done/` exits 1: fourteen historical specs predate parts
of the schema v0.2 contract that later parcels tightened (the P4 `permission_profile`
enum, and `additionalProperties: false` vs the never-schematized `data_classification`
field). This parcel pays that debt honestly — a narrow, enumerated grandfather rule for
the historical violations, schematizing `data_classification` per the predecessor's
ratified W4-P5 definition, and re-enabling the linter in CI with corpus validation
enforced going forward — closing w4-closeout exit item 2.

## Verified violation inventory (as of main `c95d3a8`)

The linter (`src/cli.ts validate`, recursive over `.md` files; the two `*.shaping-result.json`
files in done/ are ignored by construction) fails the done/ corpus on exactly these classes:

1. **`permission_profile: null`** ×4 — `P1-permission-profile-registry-schema.md`,
   `P2-dispatch-order-permission-profile-field.md`, `P3-dispatch-time-emitter.md`,
   `W0-P5-skill-injection-matrix-schema-validator.md`. Schema requires a string matching
   the `PROFILE_NAMES` enum; these predate the registry (the field's own contract said
   `null` back then).
2. **Pre-registry `permission_profile` value `builder`** ×2 —
   `W4-P2-docspine-ci-hook.md`, `SCAF-P4-exit-vehicle.md`. `builder` was written before
   the P4 enum bind; it is not in `PROFILE_NAMES`.
3. **`routing_class: standard`** ×2 — `W1-P2-epic-story-projection.md`,
   `W1-P3-human-approval-flow.md`. Pre-dates the frozen four-value enum
   (`standard-feature` is the modern spelling).
4. **`data_classification:` present** ×6 — `SCAF-P2`, `SCAF-P3`, `W3-P1` … `W3-P4`.
   Rejected today by `additionalProperties: false`; fixed by schematizing the field
   (item 2 below), NOT by grandfathering.

Class 3 is not named in the CLOSE-P2 charter one-liner (which names only the
`permission_profile` grandfather) but is part of the same pre-v0.2-freeze debt and blocks
the exit-item-2 AC identically; it is covered by the same grandfather mechanism to honor
the no-done/-edits preference. **The coordinator must confirm this inclusion at dispatch**
(the predecessor's W4-P5 definition instead planned a mechanical edit of the two files).

## Constraints

- **Standing constraints apply** — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.
  In particular **#12 (no byte-pin freeze tests)**: do not ship a test asserting any
  done/ spec or the allowlist file is byte-unchanged. Pin invariants (the allowlist's
  membership and waiver kinds), never bytes.
- **Standing authorization 5 (charter, w4-closeout) covers exactly one `plugins.yml`
  diff:** the spec-linter exclusion removal (plus this parcel's corpus-validation step in
  the same `test` job — see AC3 and the dispatch confirmation note there). Any other
  change anywhere in `.github/` is outside the authorization and out of scope.
- **CLOSE-P3's shipped always-report design is untouchable:** `plugins.yml`'s
  unfiltered `pull_request` trigger stays; no path filters, no skipped conclusions, no
  job/check rename. The check name `test` is frozen (D4 requires it by name). New CI work
  lands as steps INSIDE the existing `test` job.
- **A blanket "skip done/" is prohibited.** The grandfather mechanism must be an explicit,
  enumerated allowlist (filename + waived violation class), reviewed in this PR and
  auditable forever. Skipping the directory would un-lint the corpus — the opposite of
  this parcel's purpose.
- **No done/ spec content changes.** Reconciliation happens entirely in the linter and
  the convention. (Frontmatter folder-vs-status rot in `SCAF-P3` — `status: draft` in
  `done/` — is a known, linter-invisible residue; recorded below, not fixed here.)
- **Enum authority unchanged:** `permission_profile` validation for non-grandfathered
  specs keeps binding to `PROFILE_NAMES` imported from
  `plugins/foreman-line/permission-profiles` (P4/F-I authority). Do not fork or re-derive
  the list.
- **SPEC-CONVENTION edits follow the §11 amendment discipline:** the `data_classification`
  convention text (exact text supplied in this spec, below) lands as a standalone,
  clearly-labeled amendment commit before the implementing linter code.
- Node toolchain via PowerShell on this machine (Git Bash nvm shadows system Node).

## Scope

### 1. Grandfather rule (linter-side, enumerated)

Add to `spec-linter` an explicit grandfather allowlist — a typed constant in `src/`
(e.g. `grandfather.ts`), exported and unit-tested — mapping **exact spec filenames**
(basenames, as they exist in `done/` today) to the **specific waived violation class(es)**:

- `permission-profile-legacy` — waives only `permission_profile` schema/enum violations
  (covers classes 1 and 2 above; 6 files).
- `routing-class-legacy` — waives only the `routing_class` enum violation (class 3; 2
  files — pending the dispatch confirmation noted above).

Semantics: `validateSpecFrontmatter` (or a thin wrapper the CLI calls with the file's
basename) filters out ONLY errors of the waived class for ONLY allowlisted basenames.
Every other error class on a grandfathered file still fails; every file not on the list
gets full validation, including the `PROFILE_NAMES` enum. Waived violations SHOULD still
surface as advisory warnings (`grandfathered: …`) so the debt stays visible in CI logs.
Growing the allowlist requires editing linter source in a reviewed PR — that is the
boundary pin. A test must assert the allowlist contains exactly the 8 expected basenames
(set equality — an invariant pin, not a byte pin) so silent growth fails the suite.

### 2. `data_classification:` schematized (predecessor W4-P5 definition)

The predecessor ratified this on disk (w4-ci-integration charter, W4-P5 row): "schematize
`data_classification` as optional field in the spec-linter schema + §11 SPEC-CONVENTION
amendment." Implement exactly that:

- `src/schemas.ts` (and the generated `schemas/spec-frontmatter.schema.json` via
  `npm run generate`; `tests/parity.test.ts` must stay green): add optional property
  `data_classification: { type: 'string', pattern: '\\S' }`. Optional, non-empty,
  non-whitespace-only string. **No enum** — the predecessor ratified "optional field",
  not a value vocabulary; the only observed corpus value is `internal`. Adding an enum
  later is a non-breaking additive change, mirroring the `permission_profile` precedent.
- SPEC-CONVENTION amendment (exact text, to land in §4.6 as a new trailing bullet, via
  the §11 pattern):

  > - **`data_classification:`** — **Optional.** A non-empty, non-whitespace-only string
  >   naming the sensitivity classification of the data the parcel's surfaces handle
  >   (observed corpus value: `internal`). Schematized by CLOSE-P2 per the W4-P5 ruling;
  >   no controlled vocabulary yet — when one is ratified, enum validation is added as a
  >   non-breaking additive change (same pattern as `permission_profile`).

- Update `spec-linter/README.md` (field table + optional list) to match.

### 3. CI re-enable + corpus enforcement (`plugins.yml`, inside the frozen `test` job)

- Remove the spec-linter exclusion from the per-package test loop: delete the
  `if [ "$dir" = "plugins/foreman-line/spec-linter" ]` skip block and its EXCLUSION
  comment (currently around lines 55–68). The linter's suite (including `cli.test.ts`'s
  live-corpus assertion, if present) then runs like every other package.
- Add one step to the same `test` job (after the test loop; before or after the biome
  loop, builder's call): corpus validation —
  `(cd plugins/foreman-line/spec-linter && npx tsx src/cli.ts validate ../docs/specs/done)`
  failing the job on nonzero exit. This makes "validate done/ exits 0" a standing CI
  invariant, not a one-time claim. Also validate `../docs/specs/active` in the same step
  ONLY if it is already green at build time; if active/ is not green, ship done/-only and
  record why (active/ enforcement is not chartered — do not fix active/ specs to force it).
- No other `plugins.yml` changes. No new job, no name change, no filters.

### 4. Self-referential AC honesty (S4)

Exit item 2 binds "as of CLOSE-P2's own final SHA": at that SHA, `done/` contains the
CLOSE-P3 and CLOSE-P1 specs (already verified green-relevant: valid enum profiles, with
expected `.github/workflows/` surfaces ADVISORIES only — advisories do not affect exit
code). THIS spec is still in `active/` at that SHA; its Stage-F move to `done/` happens
post-merge, and the coordinator lints the moved spec at closure per the charter. The
builder's deterministic evidence is therefore: linter exit 0 over the then-current
`done/` at the final build SHA. This spec's own frontmatter is deliberately
fully-modern (valid enum profile, no grandfather entry) so the closure lint needs no
special case.

## Acceptance Criteria

1. `npx tsx src/cli.ts validate plugins/foreman-line/docs/specs/done` (from the
   spec-linter package dir, path adjusted) exits **0** at the parcel's final SHA, with
   grandfathered violations visible as advisory warnings on stderr.
2. Full enum validation still binds for non-grandfathered specs: a unit test feeds a NEW
   filename (not on the allowlist) with `permission_profile: builder` and with
   `permission_profile: null` and asserts exit-1/`valid: false`; a grandfathered basename
   with a NON-waived violation (e.g. missing `risk`) also fails.
3. `plugins.yml` diff contains exactly: the exclusion-block removal and the added
   corpus-validation step inside the existing `test` job — nothing else. **The
   corpus-step addition slightly exceeds the literal wording of standing authorization 5
   ("exclusion removal"); the coordinator confirms this reading at dispatch or escalates
   to Clint before the builder touches the workflow.**
4. CI evidence on the parcel's PR: the `test` check runs the spec-linter package suite
   (visible `::group::plugins/foreman-line/spec-linter`) and the corpus-validation step,
   and reports a conclusion (always-report preserved). A deliberate corpus violation
   (reviewer-side probe or a temporary commit reverted before merge) fails the check.
5. `data_classification` accepted: the six done/ specs carrying it pass with no
   grandfather entry for that class; `data_classification: ''` and `data_classification: null`
   are rejected for any spec. Schema JSON regenerated; `parity.test.ts` green.
6. SPEC-CONVENTION amendment landed as a standalone §11-pattern commit (docs-only,
   coordinator-identified message) preceding the linter implementation commits.
7. Allowlist membership pinned by set-equality test (exactly 8 basenames, exactly the
   two waiver kinds mapped as inventoried above); no byte-pin test anywhere (constraint #12).
8. `npx tsc --noEmit`, `npx tsx --test`, `npx biome check .` green in
   `plugins/foreman-line/spec-linter` (and `permission-profiles` untouched).

## Out of Scope

- The D4 ruleset change (human, last, per charter) and anything else in `.github/` beyond
  the two named `plugins.yml` edits.
- §4.7 surfaces-vocabulary extension (separate reviewed PR).
- Editing any `done/` spec's content — including the `SCAF-P3` `status: draft`-in-`done/`
  rot (linter-invisible; recorded here as residual debt for a future hygiene parcel) and
  the two `routing_class: standard` files (grandfathered, not edited).
- The deferred Jira leg (KONE-TBD stands; no Jira writes).
- Making `active/` corpus validation a CI requirement (opportunistic only, per item 3).
- Any `permission_profile` registry/profile changes in `permission-profiles/`.
- Fixing or restructuring `cli.test.ts` beyond what re-enabling requires.

## Verification Plan

Deterministic pass: AC1 (corpus exit 0 + advisory visibility), AC2 (boundary unit tests),
AC5 (schema acceptance/rejection), AC7 (allowlist set-equality), AC8 (suites green),
AC3 diff inspection (`git diff origin/main -- .github/workflows/plugins.yml` shows only
the two named hunks), AC4 via the PR's live CI log, AC6 via `git log` on the amendment
commit.

**Mandated reviewer focus questions:**

1. **Can the grandfather mechanism accidentally grandfather a NEW spec?** How is the
   boundary pinned — is matching by exact basename against a source-frozen list, are the
   waivers class-scoped (a grandfathered file with any OTHER violation still fails), and
   does the set-equality test actually fail when an entry is added? Probe: add a fake
   allowlist entry / rename a fixture to a grandfathered basename and confirm the suite
   or validation catches the under-enforcement direction.
2. **Does the linter's own test suite AND the corpus validation actually run inside the
   CI check named `test` after the exclusion removal?** Evidence must be the PR's CI log
   (group markers + corpus step output), not local runs. Does a deliberate corpus
   violation fail the check (and does the check still report a conclusion on a docs-only
   PR — always-report preserved)?
3. **Does the `data_classification` schema addition break any existing done/ spec?** It
   must not: the six carriers pass via optionality + the non-empty-string shape (no
   grandfather entry for this class), and no other spec is affected because absent
   optional fields validate trivially. Confirm the regenerated JSON schema and parity
   test agree, and that rejection of empty/null values doesn't hit any corpus file.
4. **Is the `plugins.yml` diff exactly the authorized shape?** Nothing beyond the
   exclusion removal + corpus step; check name, triggers, and CLOSE-P3's always-report
   comments untouched; and the AC3 authorization-reading confirmation is recorded in the
   dispatch trail.

## Context & References

- Charter: `plugins/foreman-line/docs/goals/w4-closeout/charter.md` (CLOSE-P2 row, exit
  item 2 as S4-amended, standing authorization 5).
- Plan review: `plugins/foreman-line/docs/goals/w4-closeout/plan-review-findings.md` (S4).
- Predecessor W4-P5 definition: `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md`
  (parcels table, W4-P5 row, added 2026-07-27).
- Convention: `docs/SPEC-CONVENTION.md` §4.5–§4.7, §11.
- Linter: `plugins/foreman-line/spec-linter/` (`src/cli.ts`, `src/validate.ts`,
  `src/schemas.ts`, `README.md`, `tests/`).
- Enum authority: `plugins/foreman-line/permission-profiles/src/types.ts` (`PROFILE_NAMES`).
- CI: `.github/workflows/plugins.yml` (exclusion at the test loop; CLOSE-P3 header/always-report
  comments).
- Precedent for the surfaces advisory acknowledgment:
  `plugins/foreman-line/docs/specs/done/CLOSE-P3-biome-ci-always-report.md`.

## Coordinator rulings at dispatch (2026-07-28)

- **F1 RULED — `routing-class-legacy` waiver class RATIFIED.** The charter one-liner named only the
  `permission_profile` grandfather, but the ratified exit item 2 requires exit 0 over done/, and
  `routing_class: standard` ×2 blocks it. A second class-scoped waiver honors the "don't touch
  done/ contents" boundary; a mechanical done/-spec edit is rejected (immutable shipped corpus).
- **F2 RULED — the corpus-validation CI step is IN-SCOPE.** It is the instrument of ratified exit
  item 2's "runs in CI" clause, additive, inside the same `plugins.yml` `test` job authorization 5
  already covers for this parcel. The literal-wording gap in authorization 5 is recorded here and
  surfaced to Clint in the goal's final report for veto; if vetoed, the step is reverted by a
  one-line follow-up.
- **F3 NOTED — `SCAF-P3-receipt-chain-walker.md` carries `status: draft` in done/** (linter-invisible,
  predecessor-named). Deferred to a future hygiene parcel; recorded in the goal's final report.

### Dispatch rulings A1–A4 (2026-07-28, coordinator)

- **A1 — builder evidence tier for AC4.** The builder commits only (never push/PR/merge), so
  AC4's live PR CI-log evidence and any on-PR probe are coordinator-owned at Stage E. The
  builder's evidence tier is: workflow diff + local corpus run + induced-failure demonstration
  (introduce a violation locally, show exit 1, revert, show clean tree — revert visible in the
  claim).
- **A2 — advisory channel.** Grandfathered-violation warnings are stderr advisories following
  the existing surfaces-vocabulary advisory convention (same per-file `<path>: <warning>`
  prefix style; exit code untouched). If existing code structurally forced a different
  channel, the builder was to FLAG rather than improvise.
- **A3 — active/ inclusion in the CI corpus step is condition-based, not judgment.** Include
  `active/` iff `validate active/` exits 0 at the builder's final SHA, recording the condition's
  outcome in a one-line comment in the workflow step. **Condition met:** active/ exited 0 at
  build time (containing this spec, which lints 0 with one expected surfaces advisory), so
  active/ is included.
- **A4 — F1/F2 confirmed at dispatch.** The routing-class-legacy waiver (F1) and the corpus
  CI step (F2) are ratified; the Clint-veto path for F2's authorization-wording gap is
  coordinator-owned in the goal's final report.
- **A6 — two further fork-point freezes retired (2026-07-29, coordinator, extends A5).** The A5 sweep enumerated the full class; two members gate this parcel's own PR: `projection/tests/frozen-surface.test.ts` "AC13: zero modification to contracts/, shaping/, or spec-linter/ since the branch fork point" and `registration/tests/frozen-surface.test.ts` "AC15: zero modification to the frozen contract + shipped packages" (pins spec-linter/ and approval/ — the latter now touched by A5 itself). Both are their parcels' shipped-and-closed drift controls (lesson #34 class, occurrences four and five). Ruled: retire exactly these two tests with deletion-site comments naming A6 and Builder #12; everything else in both files stays. `projection/tests/` and `registration/tests/` are added to this parcel's surfaces for exactly these deletions. The sweep's remaining class members (green on this branch) are deliberately untouched — enumerated as the FREEZE-SWEEP deferred debt in the goal's final report.
- **A5 — approval fork-point freeze retired (2026-07-29, coordinator, red-CI ruling).** `approval/tests/frozen-surface.test.ts`'s "AC13: zero modification to contracts/, receipts/, projection/, shaping/, spec-linter/ since the branch fork point" was W1-P3's parcel-time drift control shipped as a permanent test — lesson #34's class (third occurrence after W4-P2 AC14 and SCAF-P4 AC8, both retired by CLOSE-P3 A1). It reds any future PR that legitimately touches those five directories, and fired first on CLOSE-P2's chartered spec-linter changes. Ruled: RETIRE that one test with a deletion-site comment naming this amendment and Builder #12; every other test in the file (e.g. the Task-tier invariant check) STAYS. `approval/tests/` is added to this parcel's surfaces for exactly this deletion.
