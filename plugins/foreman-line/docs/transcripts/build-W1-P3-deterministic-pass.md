# W1-P3 Deterministic Pass — coordinator machine, 2026-07-22

Environment: PowerShell (defects_lessons #10), Windows 11. Worktree `C:\Repos\foreman-line-W1-P3`, branch `feat/foreman-line-W1-P3` at 260690f (spec cd48180 committed alone at dispatch).

```
PS> node -v
v24.11.1

PS> npm install in approval + contracts, receipts, projection, shaping, spec-linter, schema-scaffold, permission-profiles
up to date (all eight, no changes)

PS> cd plugins\foreman-line\approval
PS> npx tsc --noEmit
(exit 0)

PS> npx tsx --test tests/*.test.ts
ℹ tests 46
ℹ pass 46
ℹ fail 0
(exit 0)

PS> npx biome check .
Checked 29 files in 33ms. No fixes applied.
(exit 0)
```

Result: TSC_EXIT=0, TEST_EXIT=0 (46/46), BIOME_EXIT=0 — matches the builder completion claim (46 tests, floor 18). Closure check preceded this pass: commit 260690f verified on the branch; branch-vs-main diff over contracts/, receipts/, projection/, shaping/, spec-linter/, root package.json empty; all claimed src/test files on disk. Step 0 flags F1–F6 ruled pre-build (no spec amendment required — all rulings, no gaps).

## Rework attempt 1 pass (2026-07-22, post-0b864ff — slug containment + record-before-receipt durability)

```
PS> node -v
v24.11.1
PS> npx tsc --noEmit          (exit 0)
PS> npx tsx --test tests/*.test.ts
ℹ tests 66
ℹ pass 66
ℹ fail 0                      (exit 0)
PS> npx biome check .
Checked 33 files in 37ms. No fixes applied.   (exit 0)
```

66 > 46: tripwire silent. Closure check verified 0b864ff on the branch, assertSafeSlug (^[a-z0-9-]+$) at all three sites, performApproval record-before-receipt with rollback, human-gate single-call-site proofs preserved and re-targeted.
