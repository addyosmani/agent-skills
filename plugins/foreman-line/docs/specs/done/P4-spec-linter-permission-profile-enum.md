---
ticket: KONE-TBD                 # register via jira-workflow at Stage B; replace before dispatch
title: Foreman Line - spec-linter permission_profile enum upgrade (P4)
status: done                       # Shipped 2026-07-20; PR #24 merged; single adversarial review passed with no blocking findings
owner: clinton.morgan
created: 2026-07-16
updated: 2026-07-20
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/spec-linter/*, docs/COORDINATOR-PATTERN.md, docs/kickstarters/foreman-line-coordinator-loop.md]
routing_class: standard-feature
permission_profile: shaping-agent
---

# P4 - Spec-Linter `permission_profile` Enum Upgrade

## Intent

Close the forward commitment `SPEC-CONVENTION.md` §4.6 made when W0-P2 added the `permission_profile:` field: *"When the registry ships, it will add enum validation as a non-breaking additive change to this field's contract."* The registry shipped (P1). This parcel upgrades the spec-linter so that when `permission_profile:` **is present**, its value must match a name in the P1 permission-profile registry (read by importing P1's authoritative `PROFILE_NAMES` const, never by re-parsing `permission-profiles.yaml`) instead of "any non-empty, non-whitespace string." The field remains optional; the absent-field advisory-warning behavior is untouched. This is a small, mechanical, additive change that makes the field's authority real instead of aspirational.

Two doc-only closures the goal charter's P4 row assigns to this parcel ride it as first-class scope (not an afterthought): (1) flip `COORDINATOR-PATTERN.md`'s dispatch-table envelope column from "(target state)" to actual now that the registry (P1) and emitter (P3) have shipped; (2) mark the deferred-parcel note in `docs/kickstarters/foreman-line-coordinator-loop.md` as taken up. These land as a separate, clearly-labeled doc-only commit within the same PR (mirroring the coordinator-ratified-amendment discipline in SPEC-CONVENTION §11: doc rulings get their own clean commit).

This parcel adds no enforcement code and does not test the permission mechanism itself. It changes one field's lint contract, updates the two files whose canonical `permission_profile` values would otherwise no longer be legal, and adds one rejecting fixture. **It dispatches as a normal Agent-tool background subagent — there is no launch-mode restriction. Charter D9-amendment(a) (top-level `claude` CLI, cwd = worktree, non-bypass) is scoped to P3 only, because P3 is the sole parcel that ships enforcement code and probes the live session boundary; P4 does neither.**

## Constraints

- **Location:** `plugins/foreman-line/spec-linter/` in `kaseya-one-productivity-tools` (local: `C:\Repos\kaseya-one-productivity-tools`). Sibling to the frozen `contracts/`, `routing-policy/`, `receipts/`, `skill-injection/`, and to `permission-profiles/` (P1, the import source).
- **Stack:** TypeScript, ESM-only, Node >=22 for this package (repo root `package.json` `engines.node` requires >=24.11.1). Tests via `tsx --test`. Lint/format with `biome`.
- **Standing rule from the W0-P1 rework (binding):** ajv's `JSONSchemaType` is banned as a schema authority anywhere in this repo. The schema edit stays a hand-authored `SchemaObject` literal (`schemas.ts`). This parcel touches an existing `SchemaObject` property; it introduces no `JSONSchemaType`.
- **Cross-package import mechanism (this spec's decision #1 - see Verification Plan focus Q1 and the final decision list):** the enum's legal-value set is read by a **relative-path TypeScript import** of P1's authoritative const:
  ```ts
  import { PROFILE_NAMES } from '../../permission-profiles/src/index.js'
  ```
  added to `src/schemas.ts`. **No `package.json` change is made.** This mirrors the *existing, shipped, review-closed* `receipts -> contracts` precedent exactly (`plugins/foreman-line/receipts/src/*.ts` import `from '../../contracts/src/index.js'`; `receipts/package.json` declares no `@foreman-line/contracts` dependency). The foreman-line packages are **not** npm workspaces (repo-root `workspaces` is `["apps/*", "packages/*"]`), so a `dependencies` entry for `@foreman-line/permission-profiles` would resolve to nothing without new workspace machinery this parcel is not authorized to introduce. A relative import also keeps `tests/dependency-allowlist.test.ts` (which asserts `dependencies` keys equal exactly `{ajv, yaml}`) green with no edit. See the final decision list for why this is precedent-following, not precedent-setting.
- **Enum enforcement point (this spec's decision #2):** the constraint lives at the **schema layer**, as an `enum` on the existing `permission_profile` property in `src/schemas.ts`, computed from the imported const and kept **alongside** the existing `pattern`:
  ```ts
  permission_profile: { type: 'string', pattern: '\\S', enum: [...PROFILE_NAMES] },
  ```
  This is single-source-of-truth (the six names come from P1 by import, never copied) and consistent with how every other closed-set frontmatter field (`status`, `risk`, `routing_class`) already anchors its closed set at the schema `enum` layer. It also matches P1's own `schemas.ts`, which spreads `[...PROFILE_NAMES]` into a JSON Schema at module load. **No new validator-level check is added** — a duplicate semantic check would double the error and re-introduce a second source of truth. (P1's five invariants live in `validate.ts` because they are cross-field/set-equality rules JSON Schema cannot express; "value is one of a closed set" is exactly what `enum` is for.)
- **Existing `pattern` behavior is preserved, not relaxed (charter Out of Scope):** `pattern: '\\S'` stays on the property. Empty/whitespace-only values remain rejected by the pattern; unknown well-formed names are newly rejected by the enum. The two constraints sit side by side.
- **TypeScript type stays `permission_profile?: string`:** `SpecFrontmatter` in `src/types.ts` is **not** narrowed to import `ProfileName`. Rationale: the type is already looser than the schema for this field (the current `pattern: '\\S'` is a schema-only constraint the `string` type does not express), so leaving the type as `string` is consistent with the established handling and avoids a second cross-package import and a deeper type-coupling of spec-linter's compile to permission-profiles. The parity test's canonical sample (a valid name string) satisfies both representations. (Type-narrowing is surfaced as a considered-and-declined sub-decision for coordinator override.)
- **Regenerate the committed schema:** `schemas/spec-frontmatter.schema.json` is serialized from `specFrontmatterSchema` by `npm run generate`; after adding the enum, `generate` must be re-run and the regenerated file committed. The parity `no drift` test (`tests/parity.test.ts`) enforces byte-identity, so a stale committed file fails deterministically. The regenerated file will contain the six names in `PROFILE_NAMES` order.
- **Standing dispatch/environment constraints:**
  - **Branch/worktree (lesson #9):** the builder works on a named feature branch `feat/foreman-line-P4`, isolated in its own worktree at `C:\Repos\foreman-line-P4` — never directly in the main working tree. This line goes into the dispatch kickstarter verbatim.
  - **Deterministic-pass environment (lesson #10):** verification runs in PowerShell only. `node -v` is the first command run, before anything else, and must report >=22 for this package.
  - **CLI exit-code lesson (lesson #11):** if any CLI exit-code test is added, capture output in full before reading `$LASTEXITCODE` — never truncate a pipeline whose exit code is under test.

## Acceptance Criteria

1. `src/schemas.ts` imports `PROFILE_NAMES` from `'../../permission-profiles/src/index.js'` (relative path, no `package.json` change) and the `permission_profile` property reads `{ type: 'string', pattern: '\\S', enum: [...PROFILE_NAMES] }`. No `JSONSchemaType` is introduced.
2. `npx tsc --noEmit` passes on the spec-linter package (the cross-package relative import type-checks, exactly as `receipts -> contracts` does).
3. `tests/dependency-allowlist.test.ts` remains **unchanged and green**: `dependencies` keys still equal exactly `{ajv, yaml}` (the import is source-relative, not a declared dependency).
4. `schemas/spec-frontmatter.schema.json` is regenerated by `npm run generate` and committed; the `parity.test.ts` `no drift` test passes. The committed `permission_profile` property contains `pattern: "\\S"` **and** an `enum` array equal to the six `PROFILE_NAMES` values in order.
5. **Present + valid:** a spec whose `permission_profile:` is one of the six registry names (e.g. `builder-standard`) validates with zero errors (exit 0).
6. **Present + unknown:** a spec whose `permission_profile:` is a well-formed but unregistered name (e.g. `not-a-real-profile`) is **rejected** (exit 1) with the violation listed on stderr. Proven by a **new** fixture `tests/fixtures/reject-permission-profile-unknown.md`.
7. **Present + whitespace/empty:** the existing `tests/fixtures/reject-permission-profile-whitespace.md` still rejects (exit 1) via the retained `pattern` — behavior unchanged.
8. **Present + null:** the existing `tests/fixtures/permission-profile-null.md` still rejects (exit 1) via the `type: string` structural check — behavior unchanged (the enum does not alter the null case).
9. **Absent (backward-compat, load-bearing — charter §4.6 / decision #3):** a spec with **no** `permission_profile:` key still validates with exit 0 and emits only the existing non-blocking advisory warning. The field remains **optional** — the enum applies only when the property is present (it is not added to `required`). Proven by the existing `tests/fixtures/valid-spec-no-perm.md` continuing to pass unchanged, plus an explicit test asserting the absent-field path yields `valid: true` with the advisory warning present. The `--no-permission-profile-warning` flag behavior is unchanged.
10. **Canonical-value updates (the two files carrying an now-illegal value):**
    a. `tests/fixtures/valid-spec.md` — its `permission_profile:` is changed from `standard-build` (not a registry name) to a real name (`builder-standard`); it continues to validate with zero errors.
    b. `src/testing.ts` — `sampleSpecFrontmatter.permission_profile` is changed from `'standard-build'` to a real name (`'builder-standard'`), so the parity test's "canonical sample validates against the schema" continues to pass under the new enum.
11. The existing live-corpus test (`tests/schema-validation.test.ts`, hardcoded `done/` spec list) continues to pass with zero errors; its spec list is **not** expanded to add P1/P2's own specs (whose `permission_profile: null` would fail the `type: string` check and are intentionally outside that list). No done-spec in the current list carries a now-invalid `permission_profile` value (verified during the build; if one does, that is a stop-and-report, not a silent list edit).
12. `biome check .` passes with zero diagnostics; all tests pass via `tsx --test`; the total test count is **greater than** the pre-P4 count (new unknown-name rejection + absent-field backward-compat assertions added), and the exact before/after counts are recorded in the completion claim (test-count tripwire).
13. **Doc-only closures (separate, clearly-labeled commit in the same PR):**
    a. `docs/COORDINATOR-PATTERN.md` — the dispatch-table column header `Envelope (target state)` is changed to reflect actual state, and the preceding sentence's "aspirational ... until then the envelope column is aspirational and the directive text carries the boundary" framing is updated to reflect that the registry (P1) and emitter (P3) have shipped. The reviewer-row wording is aligned to the ratified D9-amendment objective ("structurally reduced, mechanically-enforced-where-loaded" / "reduced, not eliminated"), **not** left as the pre-review "missing capability" overclaim the plan review (F-A/F-B) explicitly softened. (See decision list item 7 — flagged for coordinator ratification.)
    b. `docs/kickstarters/foreman-line-coordinator-loop.md` — the "Deferred parcel" note is annotated as taken up (dated), pointing at the `permission-profile-registry` goal; the note is annotated, not deleted (history preserved).
    c. This doc-only commit touches only `docs/**` and is labeled as such in its message (e.g. `docs(foreman-line): P4 doc-only closures - envelope column actual + deferred-parcel note taken up`). No spec-linter code, schema, or test rides in it.

## Out of Scope

- **P1's registry, schema, or profile contents.** This parcel imports `PROFILE_NAMES` **read-only**; it does not modify `plugins/foreman-line/permission-profiles/` in any way — not the types, not `permission-profiles.yaml`, not the validator. If the builder finds themselves editing `permission-profiles/`, that is a stop-and-report.
- **P2's contract surface.** No touch to `plugins/foreman-line/contracts/`, the `DispatchOrder` type/schema, or its `permissionProfile` field. This parcel does not reference `DispatchOrder` at all.
- **P3's emitter surface.** No worktree-creation wrapper, no `dispatch-worktree` CLI, no `.claude/settings.local.json` emission, no `.gitignore` edit, no live capability-probe. P4 validates a spec's frontmatter field; it never resolves, installs, or exercises a profile envelope.
- **Any other spec-linter field's validation.** `risk:`, `routing_class:`, `surfaces:`, `status:`, `superseded_by:`, `ticket:`, `owner:`, dates — all untouched. The `surfaces:` advisory-vocabulary behavior and the `status: superseded` semantic invariant are unchanged.
- **Relaxing or changing the existing `permission_profile` whitespace-rejection `pattern`.** The `pattern: '\\S'` stays exactly as-is; the enum is added alongside it, never in place of it.
- **Narrowing the `SpecFrontmatter.permission_profile` TypeScript type** to a `ProfileName` union (considered and declined — see Constraints; surfaced as a coordinator-overridable sub-decision). The type stays `string`.
- **`SPEC-CONVENTION.md` §4.6 edits.** §4.6 already forward-committed to this exact upgrade; this parcel fulfills the commitment in the lint contract and does not edit the convention document. (The two doc-only closures are `COORDINATOR-PATTERN.md` and the coordinator-loop kickstarter, not SPEC-CONVENTION.)
- **CI workflow wiring** (a GitHub Actions step running the linter) — deferred to W4, same as every sibling. The exit-code contract already exists.
- **Introducing npm-workspace machinery** for `plugins/foreman-line/*` — not authorized here; the relative import needs none.
- **Shared-scaffold/validator extraction** across the sibling packages (charter D3/F-J) — a future, separately-ratified parcel; not touched.

## Context & References

- `docs/goals/permission-profile-registry/charter.md` — the ratified goal charter. P4's parcel-decomposition row (enum-validate `permission_profile:` against P1's named artifact by import; absent-field advisory unchanged; two doc-only closures); D6 (P4 in scope); D7 (P4 standard risk, single review); D9-amendment(a) (launch-mode pinning **P3-only** — P4 dispatches as a normal Agent-tool subagent); the "Dispatch-mechanics note" (P1/P2/P4 have no launch-mode restriction).
- `docs/goals/permission-profile-registry/plan-review-findings.md` — F-I (the authoritative profile-name artifact is P1's exported `PROFILE_NAMES`, bound by TS import, never by re-parsing YAML); F-H (README failure-mode honesty — P1's concern, cited for boundary awareness).
- `docs/specs/done/P1-permission-profile-registry-schema.md` — the "authoritative profile-name artifact" section: `PROFILE_NAMES` (`readonly ProfileName[]`) exported from `src/types.ts`, re-exported from `src/index.ts`; "P4 binds to `PROFILE_NAMES` by import ... does not re-parse `permission-profiles.yaml` and does not re-derive the name list." This spec's import target.
- `docs/SPEC-CONVENTION.md` §4.6 — the forward commitment this parcel fulfills; the field's optional-until-registry lint contract (present → non-empty non-whitespace string, now also a registry name; absent → non-blocking advisory, exit 0; `--no-permission-profile-warning` flag).
- `plugins/foreman-line/spec-linter/src/{schemas,validate,registry,generate,types,testing}.ts` — the dual-representation (TS type + hand-authored `SchemaObject`) + parity-test + `generate.ts` discipline this change must fit inside. The enum goes in `schemas.ts`; `validate.ts` is unchanged (advisory-absent path stays as-is at line ~74).
- `plugins/foreman-line/receipts/src/{types,schemas,paths}.ts` and `receipts/package.json` — the existing, shipped cross-package-import precedent this parcel follows: `import ... from '../../contracts/src/index.js'` with no declared `@foreman-line/contracts` dependency. This is why decision #1 is precedent-following, not precedent-setting.
- `plugins/foreman-line/permission-profiles/src/{index,types,schemas}.ts` — P1's shipped source; `PROFILE_NAMES`/`ProfileName` exports (the import target) and P1's own `[...PROFILE_NAMES]`-into-schema pattern (the precedent for decision #2).
- `plugins/foreman-line/spec-linter/tests/{parity,dependency-allowlist,schema-validation,semantic-invariants,cli}.test.ts` and `tests/fixtures/*` — the tests/fixtures affected: `valid-spec.md` and `testing.ts` (value updates), new `reject-permission-profile-unknown.md`, unchanged `reject-permission-profile-whitespace.md` / `permission-profile-null.md` / `valid-spec-no-perm.md`.
- `docs/COORDINATOR-PATTERN.md` (dispatch table, ~lines 47-55) and `docs/kickstarters/foreman-line-coordinator-loop.md` ("Deferred parcel", ~line 42) — the two doc-only closure targets.
- `docs/transcripts/defects_lessons.md` — #9 (name the branch/worktree in the spec), #10 (PowerShell + `node -v` first), #11 (never truncate a pipeline whose exit code you trust), #5/#7 (verify claims on disk; green checks verify state, closure checks verify work), #14 (attempt the naive/wrong reading, not just the intended one).

## Verification Plan

**Deterministic checks:** `tsc --noEmit` (AC2); `dependency-allowlist.test.ts` green and unchanged (AC3); parity `no drift` + canonical-sample tests (AC4, AC10b); present-valid / present-unknown / present-whitespace / present-null / absent-backward-compat tests (AC5-AC9); the `valid-spec.md` value-update regression (AC10a); the live-corpus regression (AC11); `biome check` (AC12); test-count tripwire (AC12). Deterministic pass runs in PowerShell on the coordinator's machine; `node -v` (must report >=22) is the first command run, before anything else (lesson #10). Any CLI exit-code test captures output in full before reading `$LASTEXITCODE` (lesson #11).

**Standard-risk parcel: single adversarial review** (charter D7). This is the one remaining standard-risk parcel in the goal. Mandated adversarial focus questions for the reviewer:

1. **Import mechanism follows the receipts->contracts precedent, sets no new one, and disturbs no contract (decision #1).** Confirm the enum's values come from a **relative-path import** of `PROFILE_NAMES`, not a copied literal list and not a `package.json` dependency. Confirm `receipts` is genuinely the same shape (relative import, no declared dependency) and that this repo's foreman-line packages are not npm workspaces (so a dependency entry would have been inert anyway). Confirm `dependency-allowlist.test.ts` is untouched and still asserts `{ajv, yaml}`. If the builder added a `package.json` dependency, introduced workspace config, or copied the six names as a literal (defeating F-I's single-source-of-truth), that is a finding.
2. **The field is still optional — the enum did not silently make it required (decision #3, load-bearing).** Attempt the naive wrong reading (lesson #14): construct a spec with **no** `permission_profile:` key and confirm it exits 0 with only the advisory warning — the enum must live inside the property definition, never in `required`. A change that makes an absent field an error is a critical defect against SPEC-CONVENTION §4.6's "optional until registry ships" and the charter's absent-field-unchanged mandate.
3. **The `pattern` was preserved, not replaced (charter Out of Scope).** Confirm `pattern: '\\S'` still sits on the property alongside the enum, and that whitespace/empty (`reject-permission-profile-whitespace.md`) and null (`permission-profile-null.md`) still reject via pattern/type respectively — i.e. the enum was added, the existing rejections were not weakened or rerouted.
4. **Present-unknown genuinely rejects, with a positive control.** Confirm `reject-permission-profile-unknown.md` (a well-formed, unregistered name) exits 1 with the violation on stderr, **and** that a present-valid name (AC5) exits 0 — so the rejection is attributable to the enum, not to an incidental parse/path failure. Confirm the two now-updated canonical values (`valid-spec.md`, `testing.ts`) use real registry names and pass.
5. **No encroachment on P1/P2/P3 (boundary hunt).** Grep the diff: no edit under `permission-profiles/` (P1), `contracts/` (P2), or any emitter/`settings.local.json`/`.gitignore`/worktree-wrapper surface (P3); no `DispatchOrder` reference; no `validate.ts` change to any field other than the schema enum's effect on `permission_profile`. Any of these is scope creep.
6. **Doc-only closures are honest and correctly committed (AC13).** Confirm the `COORDINATOR-PATTERN.md` envelope column and surrounding framing read as *actual* and are aligned to the ratified D9-amendment hedge ("mechanically-enforced-where-loaded" / "reduced, not eliminated"), not the pre-review "missing capability" overclaim; confirm the coordinator-loop deferred-parcel note is annotated (not deleted) as taken up; confirm the doc changes are in a **separate, clearly-labeled `docs`-only commit** touching no code.

**Dispatch shape:** P4's builder and reviewer sessions dispatch as **normal Agent-tool background subagents** (same as every W0 parcel and P1/P2). There is **no** top-level-CLI / non-bypass launch-mode restriction — that restriction (D9-amendment(a)) is scoped to P3 alone, since P3 is the only parcel that ships enforcement code and probes the live session boundary. P4 ships no enforcement code and tests no permission mechanism.

## Epic/Story/Task Projection (proposal only - Jira registration is future work, not this session)

**Epic:** Foreman Line - Permission-Profile Registry + Dispatch-Time Emitter *(the goal charter's four-parcel epic; P4 is its final story)*

**Story:** P4 - Spec-Linter `permission_profile` Enum Upgrade

- **Task 1:** `schemas.ts` — relative-path import of `PROFILE_NAMES`; add `enum: [...PROFILE_NAMES]` alongside the retained `pattern` on `permission_profile`; regenerate and commit `schemas/spec-frontmatter.schema.json`.
- **Task 2:** Tests/fixtures — new `reject-permission-profile-unknown.md`; present-unknown rejection + present-valid + absent-backward-compat assertions; verify whitespace/null fixtures still reject; update `valid-spec.md` and `src/testing.ts` canonical values to real registry names; confirm `dependency-allowlist` and live-corpus tests stay green.
- **Task 3 (doc-only, separate commit):** flip `COORDINATOR-PATTERN.md`'s envelope column to actual (aligned to the D9-amendment hedge); annotate the `foreman-line-coordinator-loop.md` deferred-parcel note as taken up.
- **Task 4 (verification, not builder-owned):** single adversarial review per the six focus questions above; deterministic pass on the coordinator's machine; human review gate before merge.
