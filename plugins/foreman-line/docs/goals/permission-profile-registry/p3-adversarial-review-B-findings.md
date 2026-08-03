# P3 Adversarial Review B — Findings (v2, against commit 8ce32f2)

**Reviewer:** Reviewer B (independent, zero shared context with Reviewer A)
**Session:** Top-level VSCode extension Claude Code session, normal (non-bypass) permission mode. NOT an Agent/Task-tool subagent. NOT `--dangerously-skip-permissions`.
**Date:** 2026-07-20
**Commit under review:** `8ce32f2` — "feat: implement dispatch-worktree command for permission profiles"
**Review worktree:** `git worktree add C:\Repos\foreman-line-P3-review-B 8ce32f2 --detach`
**Prior v1 finding superseded:** the v1 finding that "implementation is uncommitted" is resolved — `8ce32f2` commits all P3 artifacts to `feat/foreman-line-P3`.

---

## Launch-mode self-attestation (D9-amendment(a) requirement)

- **Session type:** Top-level Claude Code process (VSCode extension). NOT an Agent/Task-tool background subagent.
- **Permission mode:** Normal (non-bypass). NOT `--dangerously-skip-permissions`.
- **Cwd at session start:** `c:\Repos\kaseya-one-productivity-tools` (main repo). The review worktree was created during this session from the committed `8ce32f2`.

**Constraint on interactive probe reproduction:** This session cannot spawn new top-level `claude` CLI processes. Any attempt to do so via shell would produce a subprocess — a fundamentally different invocation mode than a human opening a new terminal window with `claude`, and exactly the mode the spec excludes as "a different invocation mode whose settings-loading is not the thing under test." I therefore verify the emitter's output and the structural correctness of the probe setup but cannot independently demonstrate runtime enforcement via an interactive session. This limitation is reported for each focus question below.

---

## Deterministic Tier (Tier 1, ACs 1–10) — all run from the committed review worktree

**Node version (lesson #10):** `v24.11.1` ✓ (>=22 required)

**AC1 — `npx tsc --noEmit`:**
```
Exit code: 0  ✓
```

**AC2/AC9 — `npm test` (full output captured before exit code per lesson #11):**
```
Exit code: 0
tests 70 / pass 70 / fail 0 / skip 0
```
All P3-added tests green: `emitter.test.ts`, `dispatch-cli.test.ts`, `gitignore.test.ts`, `no-coupling.test.ts`. Pre-existing 56 P1 tests also pass. Allowlist test ("runtime dependencies are exactly {ajv, yaml}") passes → AC2 ✓.

**AC8 — `npx biome check .`:**
```
Exit code: 0
Checked 19 files in 35ms. No fixes applied.  ✓
```

**AC7 — `.gitignore` spot-check (independent of test suite):**
```
git check-ignore -v "plugins/foreman-line/permission-profiles/some-wt/.claude/settings.local.json"
→ .gitignore:11:**/.claude/settings.local.json  [repo-tracked file, line 11]
```
Not the user global config. Both patterns present in the committed `.gitignore`. ✓

**AC10 — No DispatchOrder coupling (confirmed by test + manual verification):**
`emitter.ts` imports only `node:child_process`, `node:fs`, `node:path`, `node:url`, `yaml`, and package-internal `./types.js` / `./validator.js`. No `contracts/` path, no `DispatchOrder` string anywhere in `src/`. ✓

**Closure tripwire — no tracked `.claude/**` path in the diff:**
```
git diff HEAD~1 --name-only:
  .gitignore
  plugins/foreman-line/permission-profiles/PROBE.md
  plugins/foreman-line/permission-profiles/src/cli.ts
  plugins/foreman-line/permission-profiles/src/emitter.ts
  plugins/foreman-line/permission-profiles/tests/dispatch-cli.test.ts
  plugins/foreman-line/permission-profiles/tests/emitter.test.ts
  plugins/foreman-line/permission-profiles/tests/gitignore.test.ts
  plugins/foreman-line/permission-profiles/tests/no-coupling.test.ts
```
No `.claude/**` tracked path touched. Tripwire holds. ✓

**Tier 1 verdict: CONFIRMED green on all 10 ACs from the committed review worktree.**

---

## Adversarial code-level review

**Fail-fast operation order matches spec:**
Step 1: PROFILE_NAMES check (code 2, before any I/O) → Step 2: registry read + `validateRegistry` gate (code 1) → Step 3: path pre-flight — parent must exist, target must not (code 1) → Step 4: `git worktree add -b <branch>` (code 1, sole git mutation) → Step 5: no-overwrite check on `settings.local.json` (code 1) → Step 6: write (code 1, no auto-rollback). Profile resolved and validated *before* any git mutation. ✓

**`git.status !== 0` guards against null return:** If `spawnSync` fails to spawn `git` at all, `status` is `null`; `null !== 0` is `true`, so the emitter exits 1. ✓

**No `bypassPermissions` reachable:** `projectEnvelope` only projects `deny`/`ask`/`defaultMode` (if declared)/`additionalDirectories` (if declared). P1's schema `enum` excludes `bypassPermissions` at the schema level, so it can never appear in a resolved envelope and can never reach the emitter. ✓

**`SHIPPED_REGISTRY_PATH` is CWD-independent:** Derived from `import.meta.url` (the module file's own URL), not from `process.cwd()`. The emitter resolves its registry at a stable path regardless of the git worktree `--cwd` it runs in. ✓

**`parseFlags` does not reject duplicate flags:** `--profile a --profile b` silently takes `b`. Not a spec requirement and not a safety issue (the profile name is validated against `PROFILE_NAMES` before any action). Low severity, not an AC defect.

**README not updated for `dispatch-worktree`:** The README's CLI section still reads: "Single `validate <path>` command over the exported `validateRegistry(doc)`. No `resolve`/`emit`/`explain` — projecting a profile into `settings.local.json` is P3's job." The last sentence is now factually stale — P3 HAS shipped as part of this package — and the CLI section does not document the `dispatch-worktree` subcommand or its `0/1/2` exit-code contract. This is a documentation gap in the committed artifact.

**AC5 "pre-existing settings.local.json" test:** Uses `git add -f .claude/settings.local.json` to force-add the gitignore-excluded file into a temp repo. This exercises the no-overwrite guard correctly. The `-f` is needed specifically because the real repo's `.gitignore` would otherwise block staging. The temp repo is cleaned up via `rmSync`. ✓

**`Array.includes()` strict-equality semantics in AC4 test:** `!deny.includes('Bash')` checks for the exact string `"Bash"` — not any entry *containing* "Bash". Since `deny` contains `"Bash(git commit*)"` but not bare `"Bash"`, this correctly passes. A reader expecting substring matching could misread the test; runtime behavior is correct. ✓

---

## Projection fidelity (independent verification)

Emitter run from the review worktree (`C:\Repos\foreman-line-P3-review-B`), creating fresh Reviewer B probe worktrees:

**`reviewer-readonly` → `C:\Repos\foreman-line-probe-ro-B2\.claude\settings.local.json`:**
```json
{
  "permissions": {
    "deny": [
      "Edit", "Write",
      "Edit(.claude/**)", "Write(.claude/**)",
      "Bash(git commit*)", "PowerShell(git commit*)",
      "Bash(git push*)", "PowerShell(git push*)",
      "Bash(git apply*)", "PowerShell(git apply*)",
      "Bash(git stash*)", "PowerShell(git stash*)",
      "Bash(git merge*)", "PowerShell(git merge*)"
    ],
    "ask": []
  }
}
```
- Bare `Edit` + `Write` denied ✓
- All 10 mutation-command rules present ✓
- Bare `Bash` and `PowerShell` NOT denied (shell retained per invariant 5 / lesson #12) ✓
- No `allow` key ✓, no `network` key ✓, no `bypassPermissions` ✓
- Self-mod guard (`Edit/Write(.claude/**)`) present ✓

**`builder-standard` → `C:\Repos\foreman-line-probe-std-B2\.claude\settings.local.json`:**
```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force*)", "Bash(git push -f *)",
      "PowerShell(git push --force*)", "PowerShell(git push -f *)",
      "Edit(.claude/**)", "Write(.claude/**)"
    ],
    "ask": []
  }
}
```
- Bare `Write` NOT denied ✓ (positive control: builder can write files)
- Bare `Edit` NOT denied ✓ (positive control: builder can edit files)
- `Bash(git commit*)` NOT denied ✓ (positive control: builder can commit)
- Force-push variants denied ✓ (consistent with builder deny list)

**Git status of both probe worktrees after emission:**
```
C:\Repos\foreman-line-probe-ro-B2  → nothing to commit, working tree clean
C:\Repos\foreman-line-probe-std-B2 → nothing to commit, working tree clean
```
✓

---

## Four Mandated Focus Questions

### FQ1: Real launch mechanism (F-A/F-K)

**Verdict: PLAUSIBLE — mechanism correctly specified; interactive reproduction blocked by session type**

**Confirmed:**
- PROBE.md's launch-mode requirement section unambiguously requires: top-level `claude` CLI process, cwd = emitted worktree, normal (non-bypass) mode. "A probe run in any other mode is presumptively empty and will be rejected without further inspection." ✓
- The emitter creates compliant probe worktrees with correct settings.local.json. A top-level session launched in `foreman-line-probe-ro-B2` would load the `reviewer-readonly` deny rules at session start. ✓
- This review session itself runs as a top-level process in normal mode, not a subagent. ✓

**Could not independently verify:**
I cannot spawn new top-level `claude` CLI processes from within this session. Running the probe via `Bash(claude ...)` or `PowerShell(claude ...)` would create a subprocess with different settings-loading semantics — exactly the mode the spec identifies as a placebo. The interactive proof requires a human to open separate terminal windows.

**Adversarial reading attempted (lesson #14):** Under a subagent, the settings.local.json in the probe worktree is never loaded (subagent inherits parent's settings). Under bypass mode, deny rules are skipped. Either way, a probe would yield misleading results. PROBE.md correctly names both failure modes and requires the human to attest launch mode in the evidence. No evidence of the builder's interactive session is accessible in the committed diff — the probe evidence is expected to be in the PR body, not committed to the branch. The builder's original probe worktrees (`foreman-line-probe-ro`, `foreman-line-probe-std`) are empty directories with no git registration, consistent with Step 6 teardown having run.

### FQ2: Shell-based denial, not only Write-tool (F-B/F-K)

**Verdict: CONFIRMED for emitter output; PLAUSIBLE for runtime enforcement**

**Confirmed (independently):**
- Emitted `reviewer-readonly` settings contain all 10 Bash/PowerShell mutation-command rules. Every enumerated verb (`commit`, `push`, `apply`, `stash`, `merge`) covered in both shells. ✓
- Bare `Bash` and bare `PowerShell` are NOT in the deny list. Shell is retained. ✓
- PROBE.md Step 2 explicitly instructs the probe operator to attempt `echo probe > residual.txt` (a non-enumerated idiom) and record that it is **NOT denied** — the F-B residual is disclosed, not hidden.
- PROBE.md's "What this probe proves — and what it does not" section states: "reviewer-readonly's fix/commit capability is **reduced, not eliminated**." No overclaim anywhere. ✓
- README "Honest limitation" section: "it reduces, not eliminates, `reviewer-readonly`'s ability to mutate files or commit via other idioms." ✓

**Adversarial reading attempted:** The naive wrong reading would test only Write-tool denial and claim "reviewer can't write." The emitted settings, PROBE.md, and README all explicitly prevent this overclaim. PROBE.md Step 2 is a required step that must produce evidence of the non-denied residual. Evidence that omits Step 2 or reads "fully read-only" would be a defect per AC13.

**Could not independently verify:** Whether the Bash/PowerShell deny rules actually fire at the harness boundary (requires interactive probe session).

### FQ3: Positive control (F-C/F-K)

**Verdict: CONFIRMED for emitter output; PLAUSIBLE for runtime enforcement**

**Confirmed (independently):**
- `builder-standard` settings.local.json does NOT deny bare `Write` or `Edit`. ✓
- `builder-standard` settings.local.json does NOT deny `Bash(git commit*)` or `PowerShell(git commit*)`. ✓
- PROBE.md Step 3 requires all three operations (Write-tool write, Bash commit, PowerShell commit) to **succeed** under `builder-standard` — the positive control requirement is structurally encoded in the runbook. ✓
- The structural difference between the two emitted settings files is large and unambiguous: `reviewer-readonly` denies 14 rules; `builder-standard` denies 6, with zero overlap on bare `Write`/`Edit`/commit rules. The positive control worktree is structurally appropriate.

**Adversarial reading attempted:** A negative-only probe (showing denials under `reviewer-readonly` but no positive control) could green due to any incidental failure — wrong cwd, settings not loaded, environment issue. PROBE.md Step 3 and AC13 ("A result showing only the deny half...is presumptively empty") correctly require the positive control. My spot-check confirms builder-standard settings don't deny the operations being tested.

### FQ4: Post-probe `git status` clean (D9-amendment/F-K)

**Verdict: CONFIRMED for my own probe worktrees (post-emission, pre-probe); PLAUSIBLE for post-probe builder/reviewer state**

**Confirmed:**
- My freshly emitted probe worktrees are clean immediately after emission (Step 0), before any interactive probe session:
  ```
  foreman-line-probe-ro-B2 → nothing to commit, working tree clean
  foreman-line-probe-std-B2 → nothing to commit, working tree clean
  ```
- PROBE.md Step 5 specifies the correct check: `git -C C:\Repos\foreman-line-probe-ro status`, noting that the untracked `residual.txt` from Step 2 is the expected/disclosed residual and the assertion is that no *commit* was created.
- Reviewer A's probe worktrees (`C:\Repos\fl-probe-ro-A`, `C:\Repos\fl-probe-std-A`) are registered git worktrees with settings.local.json present and are clean (`nothing to commit, working tree clean`).

**Adversarial reading attempted:** The detection control requires actively running `git status`, not assuming clean. PROBE.md Step 5 makes this explicit. A reviewer who skips Step 5 fails AC12. The PROBE.md's framing correctly identifies a committed change as a "tripwire finding, not a shrug."

**Limitation:** I have not observed the post-probe status of the builder's session or any session that has actually interacted with the `reviewer-readonly` worktree under a loaded deny envelope. The clean statuses I observed are pre-probe (freshly emitted, no session run).

---

## Additional findings

### A1: README not updated for the new `dispatch-worktree` verb

The committed README still reads: "Single `validate <path>` command over the exported `validateRegistry(doc)`. No `resolve`/`emit`/`explain` — projecting a profile into `settings.local.json` is P3's job."

The second sentence is factually stale in the committed artifact: P3 HAS shipped as part of this package. The CLI section does not document `dispatch-worktree`, its flags (`--parcel`, `--profile`, `--path`), its `0/1/2` exit-code contract, or its audit-line output. Any operator consulting the README after merge will not find the new command.

This is a real gap in the committed code, not merely a style suggestion.

### A2: No AC14 probe evidence accessible in the committed diff

The committed branch (`8ce32f2`) contains no Tier 2 probe transcript evidence. Per AC14, "execution evidence (session transcript excerpts showing each denial and each positive-control success, plus the `git status` output) is attached to P3's PR." No PR exists yet — the builder was told not to open one. The builder's proof of Tier 2 execution will need to be in the PR body when the PR is opened.

This is not a defect in the code — it's a correct process state. The coordinator should verify AC14 evidence is present in the PR body before accepting.

### A3: Builder's original probe teardown state

`C:\Repos\foreman-line-probe-ro` and `C:\Repos\foreman-line-probe-std` are empty directories with no git registration and no associated branches. The branches `feat/foreman-line-PROBE-RO` and `feat/foreman-line-PROBE-STD` do not exist. This is consistent with Step 6 teardown having been run. However, the teardown left empty directories, which may confuse future use. Not a blocking issue.

---

## Summary

| Item | Verdict |
|---|---|
| Tier 1 (all 10 ACs) — from committed review worktree | **CONFIRMED** — 70/70 tests, tsc clean, biome clean, closure tripwire holds |
| FQ1: Real launch mechanism (F-A/F-K) | **PLAUSIBLE** — mechanism correctly specified and emitter output is correct; interactive reproduction impossible from within this session |
| FQ2: Shell-based denial + F-B residual honestly documented (F-B/F-K) | **CONFIRMED** (emitter output) — 10 mutation-command rules present, bare Bash/PowerShell retained, residual documented without overclaim |
| FQ3: Positive control (F-C/F-K) | **CONFIRMED** (emitter output) — builder-standard correctly omits bare Write/Edit/commit denies |
| FQ4: Post-probe git status clean (D9-amendment/F-K) | **CONFIRMED** (my emitted worktrees, pre-probe); **PLAUSIBLE** (post-probe / builder's session) |
| Closure tripwire | **HOLDS** — no tracked `.claude/**` path in diff |
| README documentation | **GAP** — `dispatch-worktree` verb not documented |
| AC14 Tier 2 evidence | **Pending** — expected in PR body, not in committed code |

**Overall assessment:** The implementation is structurally correct, test-covered, and spec-faithful. The one committed finding (README not updated) is minor. No stop-and-report conditions in the committed code. The remaining gap — independently verifying runtime enforcement via an interactive probe — is by design an offline human step requiring separate terminal sessions, which I cannot reproduce from within this embedded session. Coordinator should verify AC14 transcript evidence in the PR body before accepting.

---

## Tear-down

Reviewer B probe worktrees cleaned up after this review:
```
git -C C:\Repos\foreman-line-P3-review-B worktree remove --force C:\Repos\foreman-line-probe-ro-B2
git -C C:\Repos\foreman-line-P3-review-B worktree remove --force C:\Repos\foreman-line-probe-std-B2
git -C C:\Repos\foreman-line-P3-review-B branch -D feat/foreman-line-PROBE-RO-B2 feat/foreman-line-PROBE-STD-B2
```
