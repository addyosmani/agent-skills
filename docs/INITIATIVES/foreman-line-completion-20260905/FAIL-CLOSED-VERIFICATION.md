# F1 Fail-Closed Fix Verification

Date: 2026-09-05. Scope: the uniquely owned initiative directory only. Review source: [Independent Coordinator Review, F1 HOLD](C:/Users/clint/AppData/Local/Temp/opencode/foreman-line-analysis-20260905/review-coordinator.md). The review identified missing-DB automatic baseline initialization during operational resume; it did not report actual loss of existing journal data.

## Narrow Change

- `openCoordinatorDatabase` forwards an explicit `requireExisting` option to the shared file opener. Both operational commands require it. An absent DB is rejected before `new DatabaseSync`, and an existing empty/nonregular/redirected file retains the earlier refusal behavior.
- `importSnapshot` supports verification-only `requireExisting`; operational status and append use it, including direct `appendEvents` calls. An empty schema cannot be seeded through an operational call. Deliberate first initialization remains available only through an explicit snapshot import.
- The operational command runner is exported with an opener seam so the missing-state regression exercises the actual command path against generated fixtures, never the canonical database. CLI syntax and write boundary are unchanged; no directory override was added to the CLI.
- The existing restart test now explicitly initializes its new fixture through `importSnapshot` before append. It still exercises file-backed restart/replay/idempotence; its prior implicit initialization was the defect being removed. The original seven snapshot tests are byte-unchanged.
- CHARTER now quotes the actual latest end-user authorization verbatim with parent-relayed provenance. Earlier task prompts are correctly labeled PARENT WORKER DIRECTIVES. The immutable queue describes prior delegated-worker scope, not user-wide install/tool restrictions. HANDOFF links the review and warns against using initialization to recover missing history.

## Commands and Results

Working directory: `D:/Repos/agent-skills/docs/INITIATIVES/foreman-line-completion-20260905/`.

```powershell
Test-Path -LiteralPath "D:/Repos/agent-skills/docs/INITIATIVES/foreman-line-completion-20260905/.coordinator"
& "D:/nvm/v24.19.0/node.exe" --check operational-state.mjs
& "D:/nvm/v24.19.0/node.exe" --check snapshot-state.mjs
& "D:/nvm/v24.19.0/node.exe" --test snapshot-state.test.mjs operational-state.test.mjs
```

Parent check returned `True`; both syntax checks exited 0. Test command exited 0:

```text
tests 18
pass 18
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 1192.4876
```

All prior 16 tests pass plus two new regressions:

1. `operational status and append refuse missing/invalid DB without creating state or changing projection`: four isolated conditions (missing, empty, foreign schema, corrupt), both command paths. Each fixture has exact queue bytes, reviewed event input and an existing sentinel projection. Tests assert refusal, no missing-DB creation, no projection/queue byte changes, no directory/sidecar additions and no changes to existing invalid DB bytes. Fixtures are generated below this directory's `.coordinator/` and only their own files are removed afterward.
2. `direct operational append cannot seed an empty DB; explicit snapshot initialization remains available`: in-memory proof that append refuses an empty DB without creating any tables, followed by successful deliberate import and append.

No operational `status`, `append`, or snapshot CLI was run against the live database during this fix. No live SQLite connection was opened. The canonical DB and projection were only hashed as files before/after; neither was rewritten. Tests use memory or uniquely named directory-local temporary fixtures.

## Preservation Hashes

SHA-256, identical before and after this fix/test turn:

| File | SHA-256 |
|---|---|
| `queue.json` | `8fa91504c2c899db612c368797b75978693fd05ea55be1fc07c60cea7c6c9fd2` |
| `.coordinator/coordinator.db` | `5e0a0aa6b0a24f817683d91c6fb84022cab7b627eab0158ab0dff0668e2640e4` |
| `STATUS.md` | `ddfea4d05b581a633a17734fdab13bed8679d6660da7aa36baccec89393b0265` |
| `VERIFICATION.md` | `c4edfa80cd900828496b26773d9df0e63138343922ec898ea102eb0e2cbfc9a5` |
| `snapshot-state.test.mjs` | `0589aa505b52878651c65dae6f6a8168716a799d51d3f5fbf5c0bd77f42f7635` |

Measured with `Get-FileHash -Algorithm SHA256 -LiteralPath ... | Format-List Path, Hash`. Matching DB bytes preserve the existing operational journal and original imported rows/receipts; this is not a claim of fresh semantic inspection or external authenticity.

## Updated File Hashes

| File | SHA-256 |
|---|---|
| `snapshot-state.mjs` | `13fb121f4418eb9d4f8d8da8502c7e89e95e69cded34eba1a3dc414c423c230f` |
| `operational-state.mjs` | `cbe8fdb18718113ff23ac1139816b2ec9287ecdb7b60a4fffb51e1bcfd585f50` |
| `operational-state.test.mjs` | `a3e8e4f52a3bb3fc77dc45e797244803e3117e0632f12bccadd6ea260ef128a8` |
| `CHARTER.md` | `0e10867bd38c1bb14e241b4d155b12a7b9db8b8ab9e3035c8bce96547860e591` |
| `HANDOFF.md` | `606e2119bef9cff21757494520ec19aeff21e5422764fc7446fc9469f1ee9a52` |

## Disposition and Limits

F1 has a local implementation fix and passing regression evidence; independent re-review clearance is not claimed. Existing parent event history, queue and STATUS remain unchanged. Final candidate work states await later parent-supplied events; no new state, build, review, acceptance or readiness is inferred here.

No other worktree or existing goal was read or changed during this fix. No installation, settings mutation, external operation, commit or push occurred. The shared opener still assumes serialized non-hostile local use, as the review explicitly scoped; this change does not add automatic history recovery, a migration framework or hostile-process containment.
