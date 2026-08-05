# PROBE.md — Live Capability-Probe for the Dispatch-Time Emitter (P3)

This runbook is the **load-bearing acceptance gate** for the permission-profile
emitter (goal `permission-profile-registry`, parcel P3, AC11–14). It is a
**manual, human-executed, human-observed** procedure run in **top-level
`claude` CLI sessions**. It is deliberately **not** a `node --test` case: a test
runner cannot launch and drive an interactive `claude`, and — more importantly —
automating it in a headless `claude -p` subprocess is a *different invocation
mode* whose settings-loading behavior is not the thing under test. See
"Why manual" below.

> An optional scripted `--smoke` signal (if ever added) is a build-time
> convenience only. It is **never** evidence for AC11–14 and must never be cited
> in a completion claim, review finding, or PR body. This document's manual
> procedure is the only accepted evidence.

## What this probe proves — and what it does not

**Proves (where the envelope is loaded):** a `reviewer-readonly` session is
**denied** a Write-tool write, a Bash `git commit`, and a PowerShell
`git commit`/`git push`; and the *same* operations **succeed** under
`builder-standard` (the positive control, F-C), so each denial is attributable
to the envelope and not to an incidental failure (wrong path, wrong cwd,
unloaded settings, typo).

**Does NOT prove — state this honestly in evidence (F-B / AC13):**

- The envelope is only loaded by a **top-level `claude` CLI session started in
  the worktree in normal (non-bypass) mode**. It is **inert** under an
  Agent/Task-tool background subagent (shares the parent's already-loaded
  settings) and **void** under `--dangerously-skip-permissions` / bypass mode.
- The deny list enumerates git-mutation *commands*; it does **not** deny the
  unbounded set of shell write idioms. A non-enumerated idiom such as
  `echo x > file`, `sed -i`, `tee`, or `python -c "open(...,'w')"` is **NOT
  denied**. `reviewer-readonly`'s fix/commit capability is **reduced, not
  eliminated** — and bare `Bash`/`PowerShell` are deliberately retained for
  hostile-input probing (lesson #12; P1 invariant 5). The paired mitigation is
  the post-probe `git status`-clean detection control (Step 5), not closure of
  this residual.

Evidence that reads "reviewer is fully read-only, full stop" is a **defect**
against this parcel's deliberately-hedged objective.

## Launch-mode requirement (LOAD-BEARING — do not treat as boilerplate)

Every session in this probe MUST be:

- a **top-level `claude` CLI process** (a real `claude` started in its own
  terminal/window), **not** an Agent/Task-tool background subagent;
- with **cwd = the freshly emitted worktree** being probed;
- in the harness's **normal (non-bypass)** permission mode — **never**
  `--dangerously-skip-permissions`.

A probe run in any other mode is **presumptively empty** and will be rejected
without further inspection.

## Step 0 — Emit the two worktrees (dogfood the emitter)

From a top-level session in the main repo worktree (`C:\Repos\foreman-line-P3`),
use the emitter itself to create two throwaway worktrees. Pick a parent
directory that exists and leaf paths that do not:

```powershell
# reviewer-readonly worktree
npx tsx plugins/foreman-line/permission-profiles/src/cli.ts dispatch-worktree `
  --parcel PROBE-RO --profile reviewer-readonly --path C:\Repos\foreman-line-probe-ro

# builder-standard worktree (the positive control)
npx tsx plugins/foreman-line/permission-profiles/src/cli.ts dispatch-worktree `
  --parcel PROBE-STD --profile builder-standard --path C:\Repos\foreman-line-probe-std
```

Confirm each printed the audit line (`profile:` / `branch:` / `path:` /
`settings:`) and wrote `<path>\.claude\settings.local.json`. Open both settings
files and confirm: the reviewer file's `permissions.deny` contains bare `Edit`,
bare `Write`, and the ten `Bash/PowerShell(git commit|push|apply|stash|merge*)`
rules, and NO `allow` key; the builder file denies force-push variants + the
`.claude/**` self-mod guard but NOT bare `Write`.

## Step 1 — Negative control: `reviewer-readonly` (ALL must be DENIED)

Start a **new top-level `claude` CLI session** with cwd =
`C:\Repos\foreman-line-probe-ro`, normal mode. Attempt each; record the exact
outcome:

| # | Attempt | Expected |
|---|---------|----------|
| 1a | **Write tool**: ask Claude to write a new file (e.g. `probe.txt`) via the Write tool | **Denied** by `Write` deny rule |
| 1b | **Bash**: `git commit --allow-empty -m "probe"` | **Denied** by `Bash(git commit*)` |
| 1c | **PowerShell**: `git commit --allow-empty -m "probe"` (or `git push`) | **Denied** by `PowerShell(git commit*)` (resp. `PowerShell(git push*)`) |

Record each denial verbatim (the harness's denial message / permission
rejection). All three MUST be denied.

## Step 2 — Residual demonstration (honesty, not a pass/fail gate)

Still in the `reviewer-readonly` session, attempt ONE non-enumerated shell
write idiom and record that it is **NOT denied** (do not commit it):

| # | Attempt | Expected |
|---|---------|----------|
| 2a | **Bash**: `echo probe > residual.txt` | **NOT denied** — the F-B residual |

This is expected behavior, documented, and paired with Step 5's detection
control. It is captured to keep the evidence honest, not to fail the probe.

## Step 3 — Positive control: `builder-standard` (ALL must SUCCEED)

Start a **separate new top-level `claude` CLI session** with cwd =
`C:\Repos\foreman-line-probe-std`, normal mode. Attempt the identical three
operations from Step 1:

| # | Attempt | Expected |
|---|---------|----------|
| 3a | **Write tool**: write `probe.txt` | **Succeeds** |
| 3b | **Bash**: `git commit --allow-empty -m "probe"` | **Succeeds** |
| 3c | **PowerShell**: `git commit --allow-empty -m "probe"` | **Succeeds** |

All three MUST succeed. This proves each Step-1 denial is attributable to the
`reviewer-readonly` envelope, not an incidental failure (F-C).

## Step 4 — (nothing; reserved)

## Step 5 — Post-probe detection control (D9-amendment standing control)

Back in the `reviewer-readonly` worktree, run:

```powershell
git -C C:\Repos\foreman-line-probe-ro status
```

Because Step 1 denied all commits and Step 2's `residual.txt` was left
uncommitted, the tree will show `residual.txt` as untracked. **The load-bearing
assertion is that no commit was created and no tracked file was modified by a
denied operation.** Record the `git status` output. A tree showing a *committed*
change from a denied operation is a **tripwire finding**, not a shrug. (Note the
untracked `residual.txt` from Step 2 is the expected, disclosed residual.)

## Step 6 — Tear down the throwaway worktrees

```powershell
git -C C:\Repos\foreman-line-P3 worktree remove --force C:\Repos\foreman-line-probe-ro
git -C C:\Repos\foreman-line-P3 worktree remove --force C:\Repos\foreman-line-probe-std
git -C C:\Repos\foreman-line-P3 branch -D feat/foreman-line-PROBE-RO feat/foreman-line-PROBE-STD
```

## Evidence to capture (AC14)

For the completion claim / PR body, attach transcript excerpts showing:

1. The two emitter audit lines (Step 0) and confirmation both settings files
   were written with the expected `deny` contents.
2. Each of the three `reviewer-readonly` denials (Steps 1a–1c), verbatim.
3. The disclosed non-denial of the non-enumerated idiom (Step 2a) with the
   explicit statement that this is the F-B residual — reduced, not eliminated.
4. Each of the three `builder-standard` successes (Steps 3a–3c), verbatim.
5. The post-probe `git status` output (Step 5).
6. An explicit attestation of launch mode: top-level `claude` CLI, cwd = the
   respective worktree, normal (non-bypass) mode.

A result showing only the deny half (no positive control), or run in any
non-top-level / bypass mode, is presumptively empty.

## Why manual (decision #3, ratified 2026-07-16)

The charter's F-K focus question is: *does the probe launch the session via the
exact mechanism real dispatch uses, not whatever mode makes the probe pass?*
Real dispatch is a builder/reviewer opening an interactive top-level `claude`
session in the worktree. A scripted headless `claude -p` subprocess is a
different invocation mode whose settings-loading is not the thing under test —
automating the probe would risk passing while proving nothing, reintroducing
the exact placebo (plan-review F-A) this whole gate exists to prevent, one level
down. Reproducibility is instead provided by the design: the probe is
reproduced by the builder plus **two independent dual reviewers** (each a
top-level CLI session) and spot-verified by the coordinator (loop-directive
step 6), plus the `git status`-clean detection control.
