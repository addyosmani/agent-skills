# P2 Adversarial Review — Reviewer A (independent, zero-shared-context)

**Subject:** `feat/foreman-line-P2` @ `08dc2b6` — add optional `permissionProfile?: string` to `DispatchOrder` in `plugins/foreman-line/contracts/`.
**Reviewer:** A of a required dual review (D7). Read-only; no edits made.
**Date:** 2026-07-16.
**Verdict in one line:** Nothing survives scrutiny as a defect. The change is exactly the D2 (amended) three-artifact surface, additive-only, non-breaking, genuinely constraining, and with no cross-package coupling or producer. The full deterministic chain reproduces green (tsc, 72 tests, biome, clean-tree regeneration).

## Environment / verification actually run

- Git Bash `node -v` = v20.18.0 (nvm-shadowed); **PowerShell `node -v` = v24.11.1** (meets spec `>=22` / repo `engines >=24.11.1`). Toolchain run in PowerShell per lesson #10.
- `npx tsc --noEmit` → exit 0 (AC1).
- `npx tsx --test tests/*.test.ts` → **72 tests, 72 pass, 0 fail** (AC5/AC7). The six new `permissionProfile:` cases all present and passing.
- `npx biome check .` → "Checked 17 files … No fixes applied", exit 0 (AC6).
- `npm run generate` → regenerated 17 schema files; **`git status --porcelain` empty afterward** — the committed schemas are byte-identical to freshly generated output (D2 proof obligation; AC3/AC4).
- `git diff main` (whole repo) touches **exactly 4 files** and nothing else.

## Focus-question findings

| # | Focus question | Severity | Disposition | Reasoning / evidence |
|---|----------------|----------|-------------|----------------------|
| 1 | **Scope containment (load-bearing).** | None (clean) | informational | Whole-repo `git diff main --stat` = exactly `src/stages/c-dispatch.ts`, `schemas/dispatch-order.schema.json`, `schemas/stage-envelope.dispatch-order.schema.json`, `tests/parity.test.ts`. `package.json`, `src/envelope.ts`, `src/registry.ts`, `src/testing.ts`, `src/index.ts`, every other stage file, and every other test file are unchanged. Schema-name-only diff confirms only the two dispatch-order schemas changed; the other 15 are byte-identical (confirmed additionally by clean-tree regeneration). Composed-schema diff is `+4` inside the payload only — envelope-level keys (`correlation`/`receipt`/`timestamp`/`reworkSignal`) untouched. Matches D2(amended) exactly, incl. decision #5's composed derivative. |
| 2 | **Additive-only, non-breaking.** | None (clean) | informational | Interface: `readonly permissionProfile?: string` is `?`-marked (c-dispatch.ts:15). Schema `required` array (line 21) still lists only the original four fields — `permissionProfile` absent from `required`. `additionalProperties: false` retained (line 20). `sampleDispatchOrder`/`src/testing.ts` unmodified (decision #6) — and the unchanged canonical-sample loop (17 canonical-validate tests) plus the A→F propagation chain still pass, so the optional-absent proof is genuine and not achieved by editing the fixture. No existing field re-typed or reordered; field is tail-appended (decision #2). |
| 3 | **Field constrains; strictness survives.** | None (clean) | informational | Negatives genuinely bite: wrong-type (`42`) rejected by `type:'string'`; empty string rejected by `minLength:1`. These are non-vacuous because the optional-absent + positive tests prove the spread base (`sampleDispatchOrder`) validates true, so the only failing cause is the field value. Strictness guard (`notAField:'x'` alongside a valid `permissionProfile`) still rejects → `additionalProperties:false` not loosened. Envelope-propagation test compiles the composed input/output schemas and validates a `makeEnvelope(order)` with the field set → true, which is meaningful because the composed payload inherits `additionalProperties:false` (an undeclared field would fail). |
| 4 | **No cross-package coupling / no producer.** | None (clean) | informational | Grep for `permission-profiles`/`ProfileName`/`PROFILE_NAMES` across `contracts/` → **no matches**; field typed as bare `string` (decision #1). `package.json.dependencies` unchanged. Repo-wide `DispatchOrder` matches are only: the contract type/schema, tests, `src/testing.ts` fixture, receipts **static JSON** test fixtures, and docs — **no runtime code constructs/produces/stamps a `DispatchOrder`** (confirms charter F-E; the W2-P3 "wire it up" trap was not entered). |
| 5 | **Test-count tripwire.** | None (clean) | informational | Observed post-edit total = **72**, matching spec's 66→72 (+6). The +6 are exactly the six new attributable `permissionProfile:` `test(...)` cases; the loop drivers are untouched (17 no-drift + 17 canonical + 7 input/output + 1 static static `=== 17` assertion all still enumerate/pass; strictness 15, propagation 4, rework 5 = 66 baseline). Increase is from new field tests, not a moved loop driver. `allSchemaFiles.length` still 17 (17 schema files on disk). |

## Naive/wrong readings attempted (lesson #14)

- **"Field silently accepts anything"** — refuted: wrong-type and empty-string are rejected by the property subschema, not merely by `additionalProperties`.
- **"Green depends on an edited fixture"** — refuted: `src/testing.ts` is unmodified; the optional-absent green comes from the genuinely unchanged canonical fixture.
- **"Composed regen leaked into other schemas"** — refuted: only the two dispatch-order schemas changed; clean-tree regeneration + name-only diff + byte-size stability of the other 15.
- **"A producer was stood up to make the field real"** — refuted: no runtime `DispatchOrder` constructor anywhere; only type/schema/tests/static-fixtures.
- **"Count moved because a loop driver changed"** — refuted: loops and the `=== 17` assertion are unedited; +6 is entirely the new named tests.

## Net

No fix-worthy findings. The parcel is a faithful, minimal, additive execution of D2(amended)'s exact three-artifact surface, and the deterministic chain reproduces green independently on this reviewer's machine.
