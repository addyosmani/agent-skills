# Local-Wave Evidence Digest

Date: **2026-09-05**. This compact local record preserves important baseline/final facts, command outcomes, source paths and hashes if temporary reports disappear. It is an attributed digest, not copied raw logs, a signature, a fresh product execution by this journal worker or whole-initiative acceptance. The end-user grant and narrower parent worker directives are distinguished in FINAL-HANDOFF/CHARTER.

## Provenance

Evidence root **E** = `C:/Users/clint/AppData/Local/Temp/opencode/foreman-line-analysis-20260905/`. Candidate root **W** = `D:/Repos/agent-skills-worktrees/`. All report paths below expand against E; all candidate paths against W. The journal worker read the final assembly reports and hashed these report files, but did not inspect or modify candidate worktrees. Candidate-file hashes below are transcribed, with attribution, from independent review B; the assembly handoff SHA-256 and parent execution results were supplied in the final parent directive.

| Source report | Scope preserved locally | SHA-256 of report, measured by journal worker |
|---|---|---|
| `review-assembly-a.md` | Local PASS; 24-path union, retained assertions, full 1169+16 tests and 14 typechecks/lints | `d9682225a4b12f1bc464390ba0523d4cfd9c9881f7edfb7611e6269959a4e208` |
| `review-assembly-b.md` | Scoped PASS; 33 focused tests, negative/composition probes, raw SHA-256 manifest; no full-matrix execution claim | `a6123fc600b20c967327dc492c0586a5fe618792494cccda32eeaa9b83476734` |
| `review-coordinator-final.md` | F1 missing-DB utility PASS; independently18 tests at fixed helper hashes, not operational/product acceptance | `9f72ddeba363cd964cdcab060c949e58041e8475fa7b40f671d470d9c68e83e9` |
| `ci-runtime-evidence.md` | MAIN baseline partial test selection, default imports unresolved, read-only D4 target evidence | `25824e04cf8e0e8ab672bad65be9aebe8dd10ef802a6f9a505bf551b4c213e99` |
| `owner-handoffs/FL-FK-V0-RESULT.md` | Original FK timeout, partial156 pass/1 fail and output preservation | `d00e71af1d9313aecd557e0b09d168697b7a1521decd06aed636d234f7d4829e` |
| `owner-handoffs/FL-FK-V0-RETRY-RESULT.md` | Short-TEMP retry, semantic440 and597 distinct latest passes across invocations, no acceptance | `fecde33c992eff8cda0d4bddf0226af6420cc2fbbda3ebac30df6cbbef144ac4` |

Earlier candidate sources: `review-a.md` and `review-b.md` for R1; `review-r2-final-a.md` and `review-r2-final-b.md` for final R2; `review-r3.md`; `review-r4-a.md` and `review-r4-b.md`. Their relevant outcomes and limits are retained below. Older R2 review-B HOLD and coordinator F1 HOLD remain historical; final reports supersede only the resolved findings. References are provenance, not proof that owner packets were delivered.

## Outcome and History

**Final parent outcome: local remediation wave accepted, broader initiative blocked.** All task workers are finished according to the final parent directive. No background scheduling, pending assembly rerun, merge, hosted CI or installed-host acceptance is represented.

| Receipt | Counts / result | Limit |
|---|---|---|
| Original immutable board | 15 goal classifications,28 work items; original worker had no completed remediation | Prior worker scope, not an end-user-wide execution prohibition |
| MAIN read-only baseline | 1086 pass/1 fail/1 skip; 3 schema-generator-file cases not run; 14 typechecks/14 lints pass,41/42 command exits0 | Not the candidate's complete package matrix; skill-injection exact expectation omitted existing contracts reviewer mapping |
| R1 local candidate | Receipts80 pass; dependent integration188 pass/1 skip; typecheck/lint pass; independent A/B PASS | Structural sealing only; no authenticated merge/hash/lifecycle claim |
| Final R2 local candidate | 239 pass/1 skip; typecheck/lint pass; final A/B PASS | `stringKeys: true` resolves earlier alias-key collision HOLD; report-only semantics retained |
| Final R3 local candidate | 197 pass/1 skip; typecheck/lint pass; independent scoped PASS | Review itself ran narrower guarded tests; full final count is parent-reported; no live SCM call |
| R4 local candidate | 14 installs/42 checks pass;1091 package passes,0 fail/skip;16 helper passes; scoped A/B PASS | Not hosted CI/default-adapter/installed-session/D4 evidence |
| First combined assembly, historical | 1168 package pass/1 fail;16 helper pass;41/42 checks | Approval canonical-parity cross-package byte freeze conflicted with reviewed receipts changes; preserve this failure |
| Final assembly parent full CI runner | **14/14 offline installs;42/42 checks;1169 package +16 helper =1185 passed;0 failed/0 skipped** | Local runner, not GitHub execution; parent-reported actual CLI result |
| Independent assembly review A | **1169 package +16 helper passed**, all14 typechecks/lints exit0; local PASS | Used installed dependencies, **zero installs**, not actual CI-helper CLI or hosted runner |
| Independent assembly review B | **33 focused passes/0 fail/0 skip**, safe probes pass; scoped PASS | No full package/runner/typecheck/lint matrix claim; unqualified release/AC4 acceptance not granted |
| Parent combined new-test check | **108 focused passes/0 fail/0 skip**, supported Node+tsx | Subset/corroboration, not108 extra distinct tests added to1185 |
| State utility | Independent F1 review PASS,18 tests | Separate utility tests, not added to product1185 |

### Approval Amendment

Explicit active amendment: `W/fl-assembly-20260905/plugins/foreman-line/docs/specs/active/FL-ASSEMBLY-approval-vector.md`. It replaces only the obsolete receipt-directory cross-package byte freeze in `approval/tests/canonical-parity.test.ts`. Original expected vector/hash assertions and package-wide no-pcc assertion remain exact. The additional test changes a timestamp in a fresh object, invokes real canonicalization/hash, requires a changed digest, rechecks the original and proves the original fixture bytes unchanged. Helpers/canonicalizer/hash implementation/fixture remain unchanged from base.

Semantic payload digests (not raw fixture-file SHA-256):

```text
original timestamp 2026-07-15T00:00:00Z
original canonical digest 06d29ab66ebffd099f4e9031f7c38ffb778a996f6e18726ab8eea30a35f3ee23
mutated timestamp 2026-07-15T00:00:01Z
mutated canonical digest  08249442c9e841d68ce7b73217732a56a1f4a0cdfbc6cf5dea97003208f74835
```

Review A replaced canonicalizer output in memory with the fixed original bytes: old positive/no-pcc tests passed, new assertion deliberately failed at line64, test process exit1. Review B independently rejected constant expected hashes, all-zero hashes and ignored timestamp mutations; reinstating the old seal made15 of29 chain tests fail. These deliberate mutant failures are assertion-binding evidence, not on-disk candidate failures or additional successful product tests. B's in-memory closure/retry probes recomputed emitted hashes, rejected half-closed seals, accepted successful retries, and showed subsequent timestamp tampering can still pass structural `isSealed`: cryptographic authenticity remains outside that predicate.

## Commands and Counts

Runtime **N** = `D:/nvm/v24.19.0/node.exe`, version `v24.19.0`; npm CLI **M** = `D:/nvm/v24.19.0/node_modules/npm/bin/npm-cli.js`. Assembly cwd **A** = `D:/Repos/agent-skills-worktrees/fl-assembly-20260905`.

The parent reports actual full offline CI-runner success. Its documented invocation interface, retained here for reproduction, is:

```powershell
# cwd A; documented interface, not a verbatim parent shell transcript
& "D:/nvm/v24.19.0/node.exe" scripts/foreman-line-ci.mjs "D:/nvm/v24.19.0/node_modules/npm/bin/npm-cli.js" --offline
```

Parent exact environment-prefix/transcript and the108-focus argv/file list were not separately relayed; do not invent them. Recover the parent's detailed record from the assembly handoff path/hash below. Known result is1185 total passes and separately108 focused passes. This journal worker ran neither command.

Review A exact package command bodies, each in `A/plugins/foreman-line/<package>`:

```powershell
& "D:/nvm/v24.19.0/node.exe" "D:/nvm/v24.19.0/node_modules/npm/bin/npm-cli.js" run test --ignore-scripts
& "D:/nvm/v24.19.0/node.exe" "D:/nvm/v24.19.0/node_modules/npm/bin/npm-cli.js" run typecheck --ignore-scripts
& "D:/nvm/v24.19.0/node.exe" "D:/nvm/v24.19.0/node_modules/npm/bin/npm-cli.js" run lint --ignore-scripts
```

Its in-memory capture used shell:false,120000ms child timeout,16MiB capture, process-local Node PATH prefix, npm offline/audit=false/fund=false and TSX_DISABLE_CACHE=1. All42 package checks first exited0. The first count-aggregation harness expected TAP but received spec output and itself returned1 with empty counts; the reviewer repeated14 test invocations, corrected only summary parsing, recovered all counts and returned0. This is a preserved evidence-parser correction, not a candidate source failure, install or hidden test failure.

| Package | Review A passes | Fail/skip | Test/typecheck/lint exits |
|---|---:|---|---|
| approval |65|0/0|0/0/0|
| contracts |72|0/0|0/0/0|
| dispatch |118|0/0|0/0/0|
| integration |249|0/0|0/0/0|
| permission-profiles |70|0/0|0/0/0|
| projection |58|0/0|0/0/0|
| receipts |80|0/0|0/0/0|
| registration |70|0/0|0/0/0|
| routing-policy |59|0/0|0/0/0|
| schema-scaffold |15|0/0|0/0/0|
| shaping |39|0/0|0/0/0|
| skill-injection |41|0/0|0/0/0|
| spec-linter |80|0/0|0/0/0|
| verification |153|0/0|0/0/0|
| **Total** |**1169**|**0/0**|**all0**|

Review A also ran `N --test scripts/foreman-line-ci.test.mjs` at A:16 pass/exit0, and `N --import tsx --test tests/canonical-parity.test.ts` in approval:3 pass/exit0. Focused reruns are subsets, not additions to1185. Review B's33 tests were approval canonical parity3, receipts hash vector1, receipts chain invariants29, executed together through native Node TypeScript stripping and in-memory relative-import resolution under `--permission --allow-fs-read=<assembly-root>` with no write/network/child/worker permission. Safe in-memory composition/negative probes returned expected outcomes; this focused execution is not the package tsx/full-matrix runner or universal host containment proof.

## Candidate Identity and Digests

All five candidate HEADs/base: `5ce6ddc7f996d764e506b6b421779fbf3ece689a`. That HEAD alone does **not** pin the uncommitted delta; raw hashes below identify reviewed bytes.

| Root under W | Branch | Reviewed delta |
|---|---|---|
| `fl-r1-terminal-seal-20260905` | `feat/foreman-line-FL-R1-20260905` |5 files|
| `fl-r2-audit-loader-20260905` | `feat/foreman-line-FL-R2-20260905` |7 files|
| `fl-r3-pr-push-20260905` | `feat/foreman-line-FL-R3-20260905` |6 files|
| `fl-r4-package-ci-20260905` | `feat/foreman-line-FL-R4-20260905` |6 files|
| `fl-assembly-20260905` | `feat/foreman-line-FL-ASSEMBLY-20260905` |24-file union +3 approved assembly-only paths =27|

Both reviewers establish all24 lane files byte-identical to assembly before/after their checks. Assembly remains **uncommitted**, with12 unstaged tracked modifications,15 untracked paths and empty staging; not a clean worktree or branch accepted on main. No source/owner worktree modifications, pushes or merges were introduced by assembly review. Final parent reports source identity preserved and all task workers finished.

Raw file SHA-256 manifest below is transcribed from `review-assembly-b.md:102-139`. Paths are relative to `plugins/foreman-line/` in the named lane and assembly, except leading `/` means repo root. Handoffs were opaque byte comparisons for reviewers, not endorsements of their prose.

| Lane | Relative path | Raw SHA-256 |
|---|---|---|
|R1|`receipts/src/validator.ts`|`7b4de277896a8406f1e63af8f4fd0827ec0a46fd194e1a61687425656d1adb42`|
|R1|`receipts/tests/chain-invariants.test.ts`|`d5ef88864bf177469aa9335c84404d78314df963a0baae6be72e3c68ec17792e`|
|R1|`receipts/README.md`|`9fbe9a2ea732c922c7653706fcd3b9d3339e878a5b6b5c71125f7e5e904d2728`|
|R1|`docs/kickstarters/FL-R1-handoff.md`|`2d61cb1738c9e9083d9e88f6ce777bb879f2e8daa5a65d946c7940098d8b177f`|
|R1|`docs/specs/active/FL-R1-terminal-seal.md`|`0cc4538cf5b0e890764dd59553556338dd796db17aa68495c7c5f7be128a5d5e`|
|R2|`integration/src/governing-spec.ts`|`cf60274d10677a5e4a8e944feeece30d9e913c0d78704d69896f54e0f087694b`|
|R2|`integration/tests/fl-r2-real-loader.test.ts`|`32368b9f67ba8e2aea0fed4d3231668ee24319694a6d8b3bb749a3179caf8ea9`|
|R2|`integration/tests/governing-spec.test.ts`|`20bceccb3a55936f8b801e1958eda8b778940db9df14254e06589478c0e6349d`|
|R2|`integration/package.json`|`75ab58cec0a1c6f34dfdab8e5941c953dfa9fc3e87edc8ef6f1164ced64fd258`|
|R2|`integration/package-lock.json`|`7beb18cbf78d977128b1cc76b471f69581c177a3e0e0d55e4d131888bf4cdc25`|
|R2|`docs/kickstarters/FL-R2-handoff.md`|`e0a274139ebad9c72d439e3be94588f69282a680c6063c32f426797d2ebb6a50`|
|R2|`docs/specs/active/FL-R2-real-audit-loader.md`|`991dbe600b1f2aa791dc44dcdc9115cf47d7287e85c48e4542588d3494358e11`|
|R3|`integration/src/pr-plan.ts`|`858b741167276e9d4b16bb97a71d093d04632aa44ef08d58e71bc8a5ba3cd26f`|
|R3|`integration/src/errors.ts`|`bbea063ddd9f365ce1951b8bd5519a3063f7424a033b7c52bf2cfda159a44397`|
|R3|`integration/tests/fl-r3-push-failure.test.ts`|`81e1e46f61309292d3e079a5469c36f0cf690182e6e0990bc3908c245cbfa0dd`|
|R3|`integration/tests/conformance.test.ts`|`cdacc6ee62843fb671f7bcea2783bc4eee968d2fd185cd46a26dd4ba66c618ae`|
|R3|`docs/kickstarters/FL-R3-handoff.md`|`43ec7575b89d2bf64312e6cddd015fa2f68f147129648eb2d9de2346c56b9663`|
|R3|`docs/specs/active/FL-R3-push-failure-stop.md`|`66681f44844c6895fa93443a6845efe07d5dc85d981990442480aeca64d51f2a`|
|R4|`/.github/workflows/foreman-line-ci.yml`|`8eb431b058453368bfeee726dac37b989d85d37435b072b2a01568e3fb69fc7b`|
|R4|`/scripts/foreman-line-ci.mjs`|`c35238364b81ed1c409fa1ca8d9a934bc8f7d1aca807ca6975bfcda89d1fbcf9`|
|R4|`/scripts/foreman-line-ci.test.mjs`|`7b2345379981db7a5896dc346be26be951a6c13bee50e1bfeda1607af517dd64`|
|R4|`skill-injection/tests/schema-validation.test.ts`|`1e6b5958ed65f22504bd99634a60da7cdb2a573a98a518203e8f3fa61daa1deb`|
|R4|`docs/kickstarters/FL-R4-handoff.md`|`be700d0684793ac49f25b1fe3b62c1bd3910a0f7bfb9fa59f05d66211b17e682`|
|R4|`docs/specs/active/FL-R4-package-ci.md`|`cc2191116020286d50c3a1973a0a0d61ad090c54990e4d920e6269e8560659e3`|
|Assembly only|`approval/tests/canonical-parity.test.ts`|`9727f0accc19f8ec3fabf87b3d56c1a700aa3344c65a61f0a6bb6fd0aeef7dfe`|
|Assembly only|`docs/specs/active/FL-ASSEMBLY-approval-vector.md`|`f3cd21427425f87734f9323ea02821fd85e9d013816af307612e36868c72d3f0`|
|Assembly only, final parent-supplied hash|`docs/kickstarters/FL-ASSEMBLY-handoff.md`|`4073ce6b1b4c1af8949838d9318669cf27d6bc945211f0ae07c7b021a604f638`|

Unchanged fixed-vector pins, raw SHA-256: `approval/tests/helpers.ts` = `ff3ed6b7a1f1014e276de0e56a1311deddb1f33b73d2469121933936c572ac91`; `approval/src/canonical.ts` = `b2d6edb944a2804e8e7c83db4f8224cd68f3b7dd0cd4a96fe5d49e13f043e34a`; `approval/src/hash.ts` = `3b7048c7b0f938346deb81f51bfee0440558b6129f351357ecb5590f60517891`; `receipts/tests/fixtures/hash-vector-genesis.json` = `814bc917e7add3bceb7cd881a08ffb16f082a819ff0725667020e49afae6ae8a`.

Reviewer B full952-file raw-byte manifest digest: `eedd1edc3533aecbd99154010890465c0b1dae737df645c11e2ad1605767654b`, constructed from sorted unique tracked/nonignored untracked paths and `JSON.stringify([[path,rawSha256],...])`, excluding ignored dependencies/Git internals/metadata. Before/after review checkpoints13:51:51.940Z and13:55:35.515Z retained this digest. Empty staged-diff digest: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. These are reviewer-time receipts, not a new journal-worker inspection of source state.

## FK and Remaining Boundaries

FK isolated verification root: `W/fl-fk-v0-verification-20260905`, branch `feat/foreman-line-FL-FK-V0-20260905`, head `0ee165720f8d1e3a91eb283cb770400b23f61bf5`. Original tsc/lint/validate/sweep/generate passed, all three outputs byte-identical. Original whole-suite supervisor timed out during semantic tests; five completed files gave156 pass/1 fail. Deep TEMP caused control(e) Git filename-too-long before its byte assertions. Short-TEMP retry gave control(e)1 pass and the full semantic file440 pass, child exits0; latest distinct ledger597 passes across invocations. Raw598 observations retain one historical failure and its retry. **Not a full-suite npm exit0 or FK acceptance.** Control retry supervisor post-exit inspection returned1, separately reconciled with no remaining owned process.

FK output hashes: `schemas/authority-enforcement-registry.schema.json` = `b679a496254dcaa88da68a884abfe0ac436f6481b2b7c59aa0e1db133120d31c`; `authority-enforcement-registry.yaml` and `tests/fixtures/pass-minimal.yaml` each = `e1a5b9b0c2cb3c92b7591c5f4e24b233e8402fd91848256e83adbf2c2cc5dd13`. Reports preserve missing exact owner recovery Step0 source, reconstructed-plan/composite reconciliation, builder handoff, owner-directed dual review and human Gate3 obligations. Owner/source files were unchanged by the verifier per those receipts; no fresh check is made here.

Read-only D4 report identifies `m0r6aN/agent-skills`, main SHA5ce6ddc, no required-check or PR approval rule; historical `KaseyaOne/kaseya-one-productivity-tools` returned404, not proof of nonexistence. Intended D4 target and exact human action/proof remain unresolved. New workflow is not on main; hosted CI has not run. Verification/integration default MCP SDK resolution, DocSpine imports and installed fresh-session proof remain missing. No external writes in the evidence lane or new external calls by this journal worker.

Prepared legacy packet paths under E: `owner-handoffs/NEXT-ACTIONS.md`, `FK-P0-RECOVERY.md`, `WF-P0-REVIEW-A.md`, `WF-P0-REVIEW-B.md`, `GMF-P0-GATE2-REQUEST.md`, `GTM-MAINTENANCE-REQUEST.md` (last five under owner-handoffs). They are **not delivered/acknowledged**; WF files are review prompts, not AC13 reviews. HCS landing/gates, packaging P1 installed proof, KPP r3/counsel/funds, GTM maintenance/child authority, GMF exact passive P0 grant, MF freeze and ledgerline unknown remain. See FINAL-HANDOFF's15-goal table and CURRENT-SUMMARY's28-item matrix for exact next actions.

## Baseline and Journal Custody

Immutable queue SHA-256: `8fa91504c2c899db612c368797b75978693fd05ea55be1fc07c60cea7c6c9fd2`; original import UTC `2026-09-05T11:01:26.214Z`. Baseline tables/receipt are not rewritten. Prior event hashes: kickoff `f5da724b1be6902d5a82f0c9ecbca1206bf75568713a71a5958f7d6a053b4bff`; current-coverage `e925926f02873807199bde5ff7cc8a482651db2075652f2ee3444263acc33686`. The earlier failed assembly note remains in that history.

Reviewed utility hashes unchanged: snapshot helper `13fb121f4418eb9d4f8d8da8502c7e89e95e69cded34eba1a3dc414c423c230f`; operational helper `cbe8fdb18718113ff23ac1139816b2ec9287ecdb7b60a4fffb51e1bcfd585f50`. F1 final review independently passed18 tests; missing DB fails closed without recreating history or overwriting STATUS. No utility/schema change, new work item or gate transition was made for this final local-wave outcome.

Final journal execution: unchanged18-test suite **18pass/0fail/0skip**,6177.7627ms. `operational-state.mjs append events-final-local-wave-20260905.json` inserted8notes; identical repeat inserted0/duplicates8; independent process `status` generated sequence57. Read-only replay asserted all28 IDs/15 goal directories, only R1-R4 locally accepted, FK blocked and all11 gates blocked. Counts accepted4/proposed6/blocked9/deferred9. SQLite integrity **ok**, FK enforcement enabled,0violations. Baseline receipt/hash above and prior event/helper hashes remain unchanged. Final JSON SHA-256: `43c11f2e921c137dd3b9bbc12a38909e3c986fc13ef4aaf3573cb052232ee7ba`. These are utility tests and state checks, not new product runs. FINAL-HANDOFF contains the executed commands and final limits.
