# W1-P2 Deterministic Pass — coordinator machine, 2026-07-22

Environment: PowerShell (defects_lessons #10), Windows 11. Worktree `C:\Repos\foreman-line-W1-P2`, branch `feat/foreman-line-W1-P2` at bfad9ba (amendment 46679d9 committed alone before build, per Flag 3 ruling).

```
PS> node -v
v24.11.1

PS> npm install in projection + contracts, shaping, spec-linter, schema-scaffold, permission-profiles
up to date (all six, no changes)

PS> cd plugins\foreman-line\projection
PS> npx tsc --noEmit
(exit 0)

PS> npx tsx --test tests/*.test.ts
ℹ tests 47
ℹ pass 47
ℹ fail 0
(exit 0)

PS> npx biome check .
Checked 24 files in 30ms. No fixes applied.
(exit 0)
```

Result: TSC_EXIT=0, TEST_EXIT=0 (47/47), BIOME_EXIT=0 — matches the builder completion claim (47 tests, floor 16). Exit codes captured in full (#11). Coordinator closure check preceded this pass: commits 46679d9 (amendment alone, AC2 only) + bfad9ba verified on the branch; branch-vs-main diff over contracts/, shaping/, spec-linter/, root package.json empty; all claimed src/test files on disk.

## Rework attempt 1 pass (2026-07-22, post-5ec58b2 — path containment + merge-base diff hardening)

```
PS> node -v
v24.11.1
PS> npx tsc --noEmit          (exit 0)
PS> npx tsx --test tests/*.test.ts
ℹ tests 59
ℹ pass 59
ℹ fail 0                      (exit 0)
PS> npx biome check .
Checked 26 files in 28ms. No fixes applied.   (exit 0)
```

59 > 47: tripwire silent. Closure check verified 5ec58b2 on the branch, assertSafeSlug via String.includes at both ruled entry points, assertContainedPath via resolve/relative, 12 tests in path-containment.test.ts, merge-base diff helper wired into the three no-modification tests.
