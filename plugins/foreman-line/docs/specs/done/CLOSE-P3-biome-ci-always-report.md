---
ticket: KONE-TBD
title: Foreman Line - CLOSE-P3 biome in CI (per-package lint loop) + always-report jobs (D4 precondition)
status: active
owner: clinton.morgan
created: 2026-07-28
updated: 2026-07-28
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: low
surfaces: [plugins/foreman-line/integration/, plugins/foreman-line/integration/tests/conformance.test.ts, .github/workflows/plugins.yml, .github/workflows/foreman-line-ci.yml]
routing_class: boilerplate
permission_profile: builder-standard
---

# CLOSE-P3 — Biome in CI + always-report jobs

> **Surfaces vocabulary note (honest advisory):** the two `.github/workflows/` entries are
> outside the §4.7 canonical prefix vocabulary (`docs/`, `plugins/`, `skills/`, `apps/`,
> `config/`). The spec-linter will emit a non-blocking advisory warning for them. This is
> deliberate — the workflows are the real surfaces this parcel touches, and inventing a
> canonical-looking prefix to silence the advisory would be dishonest. Extending §4.7 is a
> separate reviewed PR, out of this parcel's scope.

## Intent

Two defect classes landed on main because CI never ran biome. This parcel closes that gap:
fix the two existing biome errors on main, then add a per-package biome lint loop to
`plugins.yml` so the net exists going forward. It also ships the D4 precondition (charter
B2, re-ratified): additive always-report changes so the checks named `test` (plugins.yml)
and `integration-report` (foreman-line-ci.yml) report a conclusion on EVERY pull request
to main — today both are path-filtered, so requiring them by name at D4 would wedge any PR
their paths don't match. CLOSE-P3 is first in D5 order precisely because it is cheap and
makes the CI net stricter for CLOSE-P1 and CLOSE-P2.

## Constraints

- **Standing constraints apply** — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.
- **Standing authorization 5 (charter, w4-closeout) covers exactly these additive diffs**
  to `.github/workflows/plugins.yml` and `.github/workflows/foreman-line-ci.yml` — the
  biome lint loop and the always-report changes. Any other change anywhere in `.github/`
  is outside the authorization and out of scope (predecessor D8 carve-out stands).
- **Additive only.** No restructuring, renaming, or removal of existing jobs/steps in
  either workflow. Existing steps stay byte-equivalent except where the always-report
  mechanism necessarily touches the `on:` trigger block or adds an in-job guard.
- **Check NAMES are frozen:** the check-run names visible to branch protection must remain
  exactly `test` and `integration-report`. D4 will require them by these names on ruleset
  19402394. No rename, no matrix expansion that changes the reported check name, no
  splitting into `test (lint)` / `test (unit)`.
- **Lint is check-only in CI.** No `--write`, no auto-fix in any workflow step. Auto-fix
  happens once, locally, in this parcel's own commits (item 1 below).
- **Per-package binary is authoritative (findings S3):** a single root `biome check` fails
  on the repo's 15 nested-root configs. The lint loop must invoke each package's own
  pinned biome via `npm run lint --if-present` per package — never a root-level biome
  invocation.
- **`foreman-line-ci.yml` PR4-9 ownership rule holds:** it must not start running suites
  `plugins.yml` owns (per-package tests/lint). Its header comment declaring the workflow
  non-blocking MAY be updated to reflect the new reality (integration-report becomes a
  to-be-required check at D4), but the one-owning-workflow-per-check rule is untouched.
- **No biome config changes** in any of the 15 packages. The two error fixes are source
  fixes under each package's existing config.

## Amendment A1 (2026-07-28, coordinator-ratified)

> A1: `tests/conformance.test.ts` is added to this parcel's surfaces for exactly three changes, ruled on builder flag 2026-07-28: (1) RETIRE the 'SCAF-P4 AC8: src/index.ts changes are append-only vs origin/main' test — superseded by the export-set preservation test in the same suite (verify that test exists, passes, and covers every origin/main export; if it does not fully cover, strengthen it in the same commit). (2) RETIRE the 'AC14: foreman-line-ci.yml byte-unchanged from origin/main' test — it was W4-P2's parcel-time control and blocks the workflow change this parcel's charter authorizes; the AC19 marker-presence test STAYS. (3) 'SCAF-P4 AC7: src/errors.ts byte-unchanged' STAYS untouched — this parcel has no business with errors.ts. Retired tests are deleted with a comment at the deletion site naming this amendment. No other conformance changes.

## Acceptance Criteria

**AC1 — Two biome errors on main fixed.** `plugins/foreman-line/integration/src/index.ts`
(import organization / assist) and `plugins/foreman-line/integration/tests/docspine-hook.test.ts`
(formatting) are fixed using the package's own pinned biome (`npm run lint` /
`biome check --write` run locally inside the package). After the fix, the package's
check-only lint exits 0.

**AC2 — Per-package lint exits 0.** For each package containing one of the fixed files
(the `plugins/foreman-line/integration` package), `npm run lint` (check-only) exits 0 at
the parcel's final SHA. Reviewer verifies by running it, not by reading the diff.

**AC3 — Lint loop in plugins.yml.** `.github/workflows/plugins.yml` gains a per-package
lint loop step (or job) mirroring the existing per-package test loop's discovery pattern
(`find plugins skills -maxdepth 4 -name package.json -not -path '*/node_modules/*'`),
running `npm run lint --if-present` in each package, failing the check if any package's
lint fails. Packages without a `lint` script are skipped silently (`--if-present`
semantics). Evidence: the parcel PR's own CI log shows the loop executing and listing
packages.

**AC4 — Lint is blocking within `test`.** A biome error in any package with a `lint`
script causes the check named `test` to conclude failure. (If the builder implements lint
as a separate job, that job's failure must still fail the `test` check — which in practice
means lint runs inside the `test` job, since the check name is frozen. Builder's call, but
the property is: lint red ⇒ `test` red.)

**AC5 — Always-report property.** After this parcel merges: on ANY pull request targeting
main — including one touching only, say, `README.md` — both checks named `test` and
`integration-report` complete with a successful conclusion. Today plugins.yml's PR trigger
is path-filtered to `plugins/**`, `skills/**`, `packages/kds-spec/**`, and itself;
foreman-line-ci.yml's to `plugins/foreman-line/integration/**` and itself. The builder
chooses the mechanism — e.g. remove the `pull_request` path filters and no-op fast inside
the job when no relevant paths changed (dorny/paths-filter, or a `git diff --name-only
$BASE_SHA...HEAD` guard), or an equivalent that yields a real conclusion (not a skipped
check — a skipped job reports no conclusion branch protection can consume, which recreates
the B2 wedge).

**AC6 — Suites still run when paths match.** On a PR that DOES touch relevant paths, the
full suites run exactly as before — the no-op fast path must not swallow real work.
Evidence: this parcel's own PR touches `plugins/**`, so its CI log must show the full
per-package test loop and the new lint loop actually executing (not the no-op branch).

**AC7 — Additive-only diff.** The diff to each workflow file is reviewable as additive:
existing job/step logic is preserved; the only permitted modifications to existing lines
are (a) the `on:` trigger block where the always-report mechanism requires it, and (b)
foreman-line-ci.yml's header comment (Constraints). Nothing else in `.github/` changes.

**AC8 — Verification of the docs-only case.** The docs-only leg of AC5 cannot be
demonstrated on this parcel's own PR (it is path-eligible by construction). This is
verified at Stage F, honestly: the coordinator (or reviewer) confirms the always-report
property on the next docs-only PR to main — the w4-closeout goal's own Stage-F closure PRs
are docs-only and will serve as the live harness. Until one has demonstrated it, exit
item confirmation for D4 must not treat AC5 as proven. Interim reviewer check: reason
through the workflow YAML that a docs-only PR produces a conclusion (trigger matches, job
runs, guard no-ops, exit 0) rather than a skip.

## Out of Scope

- **The D4 ruleset change itself** (requiring `test` + `integration-report` on ruleset
  19402394, approval count ≥ 1) — human-applied, LAST, after all three parcels merge.
- **CLOSE-P2's spec-linter exclusion removal** in plugins.yml (the
  `plugins/foreman-line/spec-linter` skip in the test loop stays in place this parcel).
- **CLOSE-P1's `integration/src` changes** — anything in `index.ts` beyond the single
  lint fix (no new exports, no seam wiring; I1 notes P1 shares this file and follows
  serially under the stricter net this parcel builds).
- **Biome config changes** in any of the 15 packages (no `biome.json` edits, no rule
  tuning, no version bumps).
- **Any non-additive workflow restructuring** — job renames, step reordering, matrix
  strategies, consolidation of the two workflows, or any change to `.github/` outside the
  two named files.
- **§4.7 surfaces-vocabulary extension** for `.github/` (separate reviewed PR if ever).
- **The deferred Jira leg / KONE ticket minting** (charter S2a).

## Context & References

- Charter: `plugins/foreman-line/docs/goals/w4-closeout/charter.md` (parcels table, D4,
  D5, D6, standing authorization 5).
- Plan review: `plugins/foreman-line/docs/goals/w4-closeout/plan-review-findings.md`
  (B2 — always-report; B3 — workflow authorization; S3 — per-package binary; I1 — shared
  `index.ts` with CLOSE-P1).
- Workflows: `.github/workflows/plugins.yml` (`test` job, per-package loops),
  `.github/workflows/foreman-line-ci.yml` (`integration-report` job, PR4-9 header).
- Convention: `docs/SPEC-CONVENTION.md`; standing constraints:
  `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.
- Shape precedent: `plugins/foreman-line/docs/specs/done/W4-P2-docspine-ci-hook.md`.

## Verification Plan

Deterministic pass (coordinator): per-package lint exits 0 in the integration package at
the final SHA; parcel PR's CI log shows the lint loop executed (AC3/AC6 evidence); workflow
diffs are additive per AC7; check names in the PR's checks tab are exactly `test` and
`integration-report`.

**Mandated reviewer focus questions:**

1. **Does the always-report mechanism truly cover every PR shape** — docs-only,
   `.github/`-only, mixed, and paths-match — and, critically, does it FAIL (not silently
   pass via the no-op branch) when relevant paths DID change and the suite broke? Trace
   the guard logic for each shape; a guard keyed on the wrong base SHA or a `paths-filter`
   misconfiguration can classify a real change as "no relevant paths" and green-wash a
   broken suite.
2. **Do the check names remain exactly `test` and `integration-report` from the
   required-checks perspective?** GitHub branch protection consumes check-run names, which
   for workflow jobs are the job `name`/id (or `jobs.<id>.name` when set) — verify the
   names the PR checks tab actually shows, not the YAML job ids alone. Any matrix, `name:`
   addition, or job split that alters the reported name silently breaks D4.
3. **Is a skipped conclusion impossible?** If the mechanism leaves any `if:` or path
   condition that yields job status `skipped` on some PR shape, branch protection will
   hold that PR forever once D4 applies — the exact B2 wedge this parcel exists to remove.
4. **Does foreman-line-ci.yml stay inside PR4-9?** Confirm no step added there duplicates
   suites plugins.yml owns, and the header comment (if edited) still states the ownership
   rule.
