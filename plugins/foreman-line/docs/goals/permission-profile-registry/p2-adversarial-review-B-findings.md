# P2 Adversarial Review — Reviewer B (independent, dual-review)

**Parcel:** P2 — DispatchOrder `permissionProfile` field
**Subject:** worktree `C:\Repos\foreman-line-P2`, branch `feat/foreman-line-P2`, commit `08dc2b6`
**Reviewer:** B (zero shared context with reviewer A)
**Date:** 2026-07-16
**Verdict in one line:** Nothing survives scrutiny as a defect. The change is exactly the D2 (amended) three-artifact surface, additive-only, non-breaking, and every acceptance criterion and mandated focus question is satisfied by deterministic evidence I ran myself. Recommend merge.

## What I ran (PowerShell, Node v24.11.1 — mandated shell; Git Bash reports v20.18.0, the documented nvm shell-shadow, not used for the toolchain)

- `npx tsc --noEmit` → exit 0 (AC1).
- `npx tsx --test tests/*.test.ts` → **72 pass / 0 fail** (AC4/AC5/AC7).
- `npx biome check .` → "Checked 17 files. No fixes applied.", exit 0 (AC6).
- `npm run generate` then `git status --porcelain` → **clean tree** (D2 proof obligation: regeneration is deterministic/idempotent, committed JSON matches typed source).
- `git diff main --name-only -- plugins/foreman-line/contracts/` → exactly 4 files.
- Whole-repo grep for `DispatchOrder`, and grep of `contracts/` for `permission-profiles|ProfileName|PROFILE_NAMES`.

## Focus-question findings

| # | Focus question | Severity | Disposition | Reasoning / evidence |
|---|----------------|----------|-------------|----------------------|
| 1 | **Scope containment (load-bearing)** | none (pass) | accept-as-documented | `git diff main` touches exactly 4 files: `src/stages/c-dispatch.ts`, `schemas/dispatch-order.schema.json`, `schemas/stage-envelope.dispatch-order.schema.json`, `tests/parity.test.ts`. `git diff main --name-only` for `schemas/` returns exactly the two dispatch-order files; the other 15 of 17 schema files are byte-identical (not in the name-only diff). `package.json`, `src/envelope.ts`, `src/registry.ts`, `src/testing.ts`, `src/index.ts`, every other `src/stages/*`, and every other test file are unchanged. Worktree tree is clean. This is precisely the D2 (amended) surface plus its decision-#5 composed derivative. |
| 2 | **Additive-only, non-breaking** | none (pass) | accept-as-documented | Interface field is `readonly permissionProfile?: string` (optional). Schema `required` array is unchanged (`parcelRef, stepZeroRestatement, routingDecisionRef, injectedSkills`) — `permissionProfile` is NOT in it, in both the standalone and composed schemas. Attempted the breaking reading directly: `src/testing.ts`/`sampleDispatchOrder` is unmodified (no `permissionProfile`), and the unmodified `tests/propagation.test.ts` A→F chain (untouched) still validates green — the optional-absent case (AC5b) also passes. No green depends on editing the fixture (decision #6 honored). |
| 3 | **Field constrains + strictness survives** (security-relevant) | none (pass) | accept-as-documented | Negatives bite at the *property* level, not merely via `additionalProperties`: wrong-type `42` is rejected by `type:'string'` (AC5c, pass); empty-string `''` rejected by `minLength:1` (AC5d, pass). Strictness guard: `{...sample, permissionProfile:'builder-standard', notAField:'x'}` still validates `false` with the new property present (AC5f, pass) — `additionalProperties:false` was not loosened. On the "opaque string, minLength 1 too permissive?" hypothesis: values like `'   '` (whitespace), `'../../etc'` (path-traversal-shaped), or arbitrary long/unicode strings DO pass here — but this is **correctly deferred**. There is no consumer at this layer that treats the value as a path or resolves it; enum-binding to the P1 registry is explicitly P4's job (spec-linter), and this matches sibling fields (`parcelRef`, `routingDecisionRef`) exactly (decision #8). Prototype-pollution vector is closed: a `__proto__`-shaped sibling key is an unknown field rejected by `additionalProperties:false`. No exploitable gap at THIS layer. |
| 4 | **No cross-package coupling / no producer** | none (pass) | accept-as-documented | Grep of `contracts/` for `permission-profiles`/`ProfileName`/`PROFILE_NAMES` → no matches; field is a bare `string`, no sibling import; `package.json` dependencies unchanged (`ajv` only). Whole-repo `DispatchOrder` grep: the only code references are within `contracts/` (type decl + tests + the `sampleDispatchOrder` fixture). All other hits are static `.json` receipt *fixtures* in `receipts/tests/fixtures/` and docs/specs — no runtime code anywhere constructs/produces/stamps a `DispatchOrder`. Confirms spec F-E: type-level contract only, zero live producer. The "wire it up so it's real" trap was not taken. |
| 5 | **Test-count tripwire (66→72)** | none (pass) | accept-as-documented | Executed baseline: 72 tests pass post-edit. `main`'s `parity.test.ts` has 1 static `test(` (the `allSchemaFiles.length===17` case); the branch has 7 — i.e. **6 new attributable field tests** (positive, optional-absent, wrong-type, empty-string, envelope-propagation, strictness-guard). The drift loop, the `allContractFixtures`/`composedBoundaries` loops, and the `=== 17` assertion are untouched (hunk header shows the `for` loop only as unchanged context); schema file count is still 17, so no loop-driver moved. Delta of exactly 6 = 66→72. Tripwire satisfied; not an artifact of a changed loop count. |

## Informational (non-blocking) observations

| # | Observation | Severity | Disposition | Reasoning |
|---|-------------|----------|-------------|-----------|
| I-1 | Envelope-propagation test (AC5e) asserts only the positive path (envelope with `permissionProfile` validates true against composed input/output schemas), no negative through the composed schema. | informational | accept-as-documented | Adequate as written. Because the composed payload has `additionalProperties:false`, a stale/absent composed field would have *rejected* the envelope carrying `permissionProfile` — so the positive assertion implicitly proves the field is present in the composed schema. Committed-file correctness is independently covered by the (green) drift loop, and I visually confirmed `stage-envelope.dispatch-order.schema.json` payload carries the field with envelope-level keys (`correlation`/`receipt`/`timestamp`/`reworkSignal`) byte-identical to base. No change needed. |
| I-2 | The two new-test-block `Ajv` instance and `dispatchOrderSchema` recompilation are duplicated rather than reusing the file's existing `ajv`. | informational | accept-as-documented | Deliberate isolation so the new cases don't run through the existing loops (decision #3). Biome is clean; no correctness impact. |

## Bottom line

Every AC (1–8) and all five mandated focus questions pass against evidence I ran myself in the mandated PowerShell/Node-24 toolchain. The diff is the exact authorized surface, additive and non-breaking, with the security-relevant strictness properties intact and the opaque-string permissiveness correctly deferred to P4. No defect, no scope creep, no producer, no cross-package coupling. Recommend merge.
