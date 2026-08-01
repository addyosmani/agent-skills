# W1-P1 Deterministic Pass — coordinator machine, 2026-07-22

Environment: PowerShell (per defects_lessons #10), Windows 11. Worktree `C:\Repos\foreman-line-W1-P1`, branch `feat/foreman-line-W1-P1` at 80c7be2.

```
PS> node -v
v24.11.1

PS> foreach package in contracts, spec-linter, schema-scaffold, permission-profiles, shaping:
      npm install --no-audit --no-fund
up to date in 716ms / 735ms / 727ms / 727ms / 708ms   (all five, no changes)

PS> cd plugins\foreman-line\shaping
PS> npx tsc --noEmit
(exit 0)

PS> npx tsx --test tests/*.test.ts
...
ℹ tests 31
ℹ pass 31
ℹ fail 0
(exit 0)

PS> npx biome check .
Checked 18 files in 23ms. No fixes applied.
(exit 0)
```

Result: TSC_EXIT=0, TEST_EXIT=0 (31/31), BIOME_EXIT=0 — matches the builder completion claim (31 tests, threshold >=18). Exit codes captured in full before reading (defects_lessons #11). Coordinator closure check preceded this pass: commits fb2359f (amendment alone), 8128d23 (build), 80c7be2 (README install-set fix) verified on the branch; dependencies exactly {ajv}; engines >=24.11.1; no bare `@foreman-line/*` import in src; SKILL.md, kickstarter template, README present on disk.

## Rework attempt 1 pass (2026-07-22, post-70cc8ea)

```
PS> node -v
v24.11.1
PS> npx tsc --noEmit          (exit 0)
PS> npx tsx --test tests/*.test.ts
ℹ tests 36
ℹ pass 36
ℹ fail 0                      (exit 0)
PS> npx biome check .
Checked 18 files in 26ms. No fixes applied.   (exit 0)
```

36 > 31: rework test-count tripwire silent. Closure check verified commit 70cc8ea on the branch, the uniform not-canonical error in emit.ts, 3+2 new tests, and the derive-first notes in SKILL.md + template before this pass ran.

## Rework attempt 2 pass (2026-07-22, post-4036023 — CodeQL polynomial-ReDoS x3 HIGH)

CI CodeQL (required check) raised 3 HIGH js/polynomial-redos alerts on PR #35 (self-check.ts extractH2Headings/sectionBody heading regexes; emit.ts deriveSessionSlug dash-strip). Rework attempt 2 (own Step 0, 3 flags ruled) replaced all three with linear char-code/trim/slice operations, byte-identical behavior, +3 hostile-input pinning tests (100k-char inputs, <1000ms budget).

```
PS> node -v
v24.11.1
PS> npx tsc --noEmit          (exit 0)
PS> npx tsx --test tests/*.test.ts
ℹ tests 39
ℹ pass 39
ℹ fail 0                      (exit 0)
PS> npx biome check .
Checked 19 files in 27ms. No fixes applied.   (exit 0)
```

39 > 36: tripwire silent. Coordinator closure check verified 4036023 on the branch, the heading regexes replaced by documented linear helpers, and only the two benign linear regexes remaining in emit.ts before this pass ran. CodeQL re-scan on push is the closing gate.
