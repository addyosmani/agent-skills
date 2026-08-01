# WGT-P0BOOT independent review B findings

Date: 2026-08-01
Reviewer: independent review B — plugin/package integrity
Initially reviewed commit: `23fa60bdf0314ff21ab33e60af14ddac3f49ee6a`
Baseline / merge-base: `260d1eb5afa554ac23ff440a7dd6f92510381113`
Initial verdict: **HOLD**

## Follow-up review — exact head `5e6fab6d6f74ff0d624dae9924a0c02f447784da`

Follow-up verdict: **PASS**

The contract amendment resolves Blocker B-1 without creating a broad waiver:

- The pre-merge exception names only
  `approval/tests/canonical-parity.test.ts` —
  `AC2: no modification to receipts/ since the branch fork point` and
  `projection/tests/input-consumption.test.ts` —
  `AC3: no file under shaping/ is modified by this parcel since the branch fork point`.
- Each exception is green only when its diff is limited to byte-frozen paths
  from the durable 649-file manifest in its named subtree. Independent
  enumeration at `5e6fab6...` found exactly 63 `receipts/` paths and 23
  `shaping/` paths; zero path was outside its named subtree and zero path was
  absent from the frozen manifest.
- Every other test and command remains mandatory pre-merge. The root-package
  checks are not waived.
- After merge, no exception remains: a fresh `origin/main` checkout must pass
  the complete 14-workspace matrix, including both named tests. Any remaining
  failure keeps WGT-P0A locked and requires rollback or a separately authorized
  repair.
- The verification plan independently repeats that unqualified post-merge
  matrix before WGT-P0A may unlock.

Commit `5e6fab6...` changes only the active bootstrap spec, its builder
transcript, and the two authorized review records relative to `23fa60b...`.
It does not edit frozen product/source, plugin manifests, package manifests,
lockfiles, tests, or generators. The original provenance, manifest, JSON,
skill, and package-inventory evidence therefore remains applicable.

Current findings: Blocker B-1 **resolved**; no unresolved Blocker, High, or
Medium findings. The historical HOLD analysis against `23fa60b...` is retained
below as the evidence that motivated the narrow amendment.

## Disposition

The frozen plugin source, plugin manifests, JSON corpus, bundled skills, and
package inventory pass independent integrity checks. The exact committed head
does not satisfy WGT-P0BOOT acceptance criterion 6, however: two shipped
parcel-time frozen-surface tests necessarily see the first tracked import as a
modification from `origin/main`. The builder's reported 14/14 green run occurred
before the import was committed, when those helpers were blind to staged
content. Review B therefore cannot return PASS against this head.

No opportunistic product edit was found. The hold is a bootstrap verification
contract/test-context defect, not a frozen-source provenance defect.

## Findings

### Blocker B-1 — the pre-commit 14/14 result does not prove the committed bootstrap

Both affected helpers compute a merge base with `origin/main` and then run an
ordinary `git diff <merge-base> --stat -- <frozen-subtree>`. Before commit, that
command omits staged imported files; at commit `23fa60b...`, it sees the entire
new subtree because baseline `260d1eb...` contains no Foreman Line plugin.

- `approval/tests/canonical-parity.test.ts` —
  `AC2: no modification to receipts/ since the branch fork point` fails. The
  exact-head diff reports 63 added files / 3,297 insertions under
  `plugins/foreman-line/receipts`.
- `projection/tests/input-consumption.test.ts` —
  `AC3: no file under shaping/ is modified by this parcel since the branch fork point`
  is subject to the same helper and necessarily fails. The exact-head diff
  reports 23 added files / 2,446 insertions under
  `plugins/foreman-line/shaping`.
- The bounded root-`package.json` checks are not implicated. Approval's
  `AC12: root package.json is unmodified ...` passed in the independent partial
  run, consistent with the bootstrap's plugin-only scope.

This directly conflicts with acceptance criterion 6 (all 14 workspaces pass
`typecheck`, `test`, and `lint`) and criterion 8 (review B must have no
unresolved blocker/High/Medium finding). A contract amendment or other
coordinator-authorized classification is required before a new exact head can
be reviewed.

### High findings

None beyond Blocker B-1.

### Medium findings

None.

## Passing integrity evidence

- Initial state was exact and clean: branch `codex/foreman-line-bootstrap`,
  `HEAD=23fa60bdf0314ff21ab33e60af14ddac3f49ee6a`, one commit ahead of
  `origin/main`, with empty tracked and untracked porcelain output before review
  records were written.
- The durable source manifest has 649 lines and covers 4,229,356 bytes. All 649
  destination files and all 649 frozen-source counterparts exist and match
  their recorded SHA-256. Missing files: 0; mismatches: 0.
- Canonical path-list SHA-256 is
  `df4b8b955cd18b5ddbe100bf676332a9e4d81a2ef03a25330dce0d35102fbe2b`.
  Durable content-manifest SHA-256 is
  `48120451fda4d1cf6e6d6e5fd11e6ce5a4b1a0605a249b6d7a8dd1d65889e3c4`.
- JSON inventory is exactly 149 files. All 148 ordinary JSON files parse. The
  sole failure is exactly
  `plugins/foreman-line/receipts/tests/fixtures/malformed.json`; generic parsing
  rejects it, and the independently rerun receipts test suite passed.
- `.claude-plugin/plugin.json` parses and has exactly the required eight fields,
  `name=foreman-line`, `version=0.1.0`, and no `skills` field.
- `.codex-plugin/plugin.json` parses; its identity fields agree with the Claude
  manifest, `skills` is exactly `./skills/`, and its interface carries the
  required display, description, developer, category, capability, and default
  prompt surfaces.
- Exactly three plugin skill directories exist and each contains `SKILL.md`:
  `foreman-shaping`, `goal`, and `parcel-driven-development`.
- Exactly 14 package workspaces exist. Each has a parseable `package.json`,
  `package-lock.json`, `tsconfig.json`, and `biome.json`; each is private ESM,
  uses an `@foreman-line/*` name, and declares `typecheck`, `test`, and `lint`.

## Exact command matrix

Runtime for every independent Node-backed command was
`C:/Users/clint/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`
(`v24.14.0`), with that directory prepended to child `PATH`. The authorized
verification-local repair used npm `11.13.0` from
`C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`. No generator ran.

Every workspace declares this same command triplet:

| Workspace | Typecheck command | Test command | Lint command | Exact-head review-B result |
|---|---|---|---|---|
| `approval` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | typecheck **environment-failed** (`TS2688`, incomplete verification-local `@types/node`); test **FAIL** 57/65, including Blocker B-1 plus seven incomplete-local-`tsx` CLI failures; lint **PASS** |
| `contracts` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |
| `dispatch` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |
| `integration` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not retained; interrupted aggregate run was discarded |
| `permission-profiles` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not retained; interrupted aggregate run was discarded |
| `projection` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | deterministic committed-head test **FAIL** under Blocker B-1; full suite stopped |
| `receipts` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | typecheck **environment-failed** (`TS2307` for `ajv` through removed contracts deps); test **PASS**; lint **PASS** |
| `registration` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |
| `routing-policy` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |
| `schema-scaffold` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not retained; interrupted aggregate run was discarded |
| `shaping` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |
| `skill-injection` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |
| `spec-linter` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |
| `verification` | `npm run typecheck` -> `tsc --noEmit` | `npm test` -> `tsx --test tests/*.test.ts` | `npm run lint` -> `biome check .` | not rerun after Blocker B-1 stop |

The builder transcript records pre-commit PASS for all 42 script cells. Review B
does not promote that staging-blind result to exact-commit evidence.

## Verification-local environment note

Concurrent cleanup removed `contracts/node_modules` and pruned the Approval and
Dispatch dev dependencies after the builder run. Coordinator-authorized,
bounded offline `npm ci` attempts for Approval populated packages partially but
timed out before npm completed/linking and made no tracked change. Receipts
therefore demonstrated `test`/`lint` green but could not typecheck through the
missing Contracts dependency tree. These environment failures are not product
findings and are not the basis of HOLD; Blocker B-1 is independently
reproducible from the committed tree with Git alone.

## Closeout

- Product/source integrity: **PASS**.
- Plugin-manifest and JSON-corpus integrity: **PASS**.
- Exact committed-head package acceptance: **HOLD** on Blocker B-1.
- No source, manifest, lockfile, generator output, or product file was edited by
  review B. Only this authorized findings file was created.
