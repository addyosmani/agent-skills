# Board Verification

Scope: only this new initiative directory and in-memory/file-backed coordinator snapshot. Date: 2026-09-05. Environment: local Windows PowerShell, Node `v24.7.0`. Product build/CI/installed-runtime evidence: **not run, not passing by implication**. No external calls or dependency installation.

## Executed Commands

| Command | Working directory | Observed result |
|---|---|---|
| `git status --short` | `D:/Repos/agent-skills` | Initial unrelated dirty/untracked files preserved; later observation adds `docs/INITIATIVES/` only |
| `git worktree list --porcelain` | Repo root | Owner/candidate branches and HEADs recorded in DISCOVERY; no changes |
| `node --version` | Initial workspace | `v24.7.0` |
| `Test-Path -LiteralPath "D:/Repos/agent-skills/docs"` | Repo root | `True`, before creating directory-local artifacts |
| `node --check snapshot-state.mjs` | Initiative directory | Exit 0, no syntax errors |
| `node --test snapshot-state.test.mjs` | Initiative directory | Exit 0; 7 passed, 0 failed, 0 skipped |
| `Test-Path -LiteralPath "D:/Repos/agent-skills/docs/INITIATIVES/foreman-line-completion-20260905/.coordinator"` | Repo root | `True`, before generated DB write |
| `node snapshot-state.mjs` | Initiative directory | Exit 0, `imported` |
| `node snapshot-state.mjs` | Initiative directory, sequential repeat | Exit 0, `no-op`; same source hash, first-import time and rows |
| `node --test snapshot-state.test.mjs` and `node --check snapshot-state.mjs` | Initiative directory, final helper | Both exit 0; tests again 7 passed, 0 failed/skipped |
| `node snapshot-state.mjs` | Initiative directory, final helper recheck | Exit 0, `no-op`; identical hash/timestamp/counts, integrity and FK results |
| `git check-ignore -v "docs/INITIATIVES/foreman-line-completion-20260905/.coordinator/coordinator.db"` | Repo root | Directory-local `.gitignore:1` matches `/.coordinator/coordinator.db*` |
| `git rev-parse HEAD` | Repo root, final | `5ce6ddc7f996d764e506b6b421779fbf3ece689a`, unchanged |

## Test Output

```text
complete board preserves 15 exact goals and 28 evidence-gated work items: PASS
invalid shapes, evidence, IDs, references and dependencies fail before persistence: PASS
baseline rejects authority widening, false execution, passing gates and product proof: PASS
transactional in-memory import twice is an exact no-op with FK/integrity and all rows: PASS
different valid snapshot is refused without overwriting or status promotion: PASS
persisted state tampering is detected and is never silently repaired: PASS
failed seed rolls back created IC tables and unknown existing DB is preserved: PASS
tests 7
pass 7
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 279.7294
```

The in-memory tests also prove actual FK enforcement, unchanged `total_changes()` on repeat, rejection of 18 invalid shape/reference/evidence cases and 13 authority/false-claim cases, and transaction rollback under an injected mid-schema seed interruption. They do not modify the generated file-backed database or any owner state.

## File-Backed Receipts

```json
{
  "first_outcome": "imported",
  "second_outcome": "no-op",
  "sha256": "8fa91504c2c899db612c368797b75978693fd05ea55be1fc07c60cea7c6c9fd2",
  "imported_at_utc": "2026-09-05T11:01:26.214Z",
  "integrity": "ok",
  "foreign_key_violations": 0,
  "counts": {
    "initiatives": 1,
    "projects": 1,
    "tracks": 17,
    "contracts": 7,
    "integration_surfaces": 7,
    "work_items": 28,
    "work_item_dependencies": 5,
    "integration_scenarios": 14,
    "verification_runs": 0,
    "decisions": 6,
    "risks": 5,
    "security_gates": 5,
    "release_gates": 6,
    "session_handoffs": 1,
    "artifacts": 7
  },
  "snapshot_imports": 1,
  "goal_tracks": 15,
  "new_remediations_completed": 0
}
```

All three file-backed runs execute `PRAGMA integrity_check`, `PRAGMA foreign_key_check` and a full projected-row/content comparison against the validated queue, not just counts. IC relationships use foreign keys; extra `details_json` preserves owners, evidence, blockers and next actions. `snapshot_imports.queue_json` retains full authorization/routing/source snapshot and its SHA-256. That hash proves byte identity of the local import, not external source authenticity or signed evidence.

Warnings on tests and both imports: `ExperimentalWarning: SQLite is an experimental feature and might change at any time`. No attempt was made to upgrade Node or suppress the warning. Generated SQLite writes are restricted to `.coordinator/coordinator.db` and SQLite's transient sidecars there; no alternate path option, directory creation, updater, scheduler, provider adapter or execution framework exists in the helper.

## Limits

- File-backed imports validate one immutable baseline. Changed snapshots, unknown schemas, existing empty DBs, redirected/link targets, or active/recovery sidecars are refused. Future operational updates need separate explicit review, not reset/reseed.
- No owner-worktree tests, Foreman package tests, dependency installs, generation, current CI fetch, effective-rules query, installed plugin probe, provider call, commercial action or independent security clearance was performed.
- Seven board tests passing does not make any SC-* product scenario passing. `verification_runs` intentionally contains zero product rows; board evidence is indexed as `ART-VERIFY` and this session's handoff points here.
- No new remediation completed, no workers dispatched, no goal records edited, no commits/push/merge. Baseline delivery is complete; initiative/product readiness remains blocked.
