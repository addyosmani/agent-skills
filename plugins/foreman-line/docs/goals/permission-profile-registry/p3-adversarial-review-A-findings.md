# P3 Adversarial Review A — Findings

**Reviewer:** Reviewer A (independent; zero shared context with Reviewer B)
**Parcel:** P3 — Dispatch-Time Permission-Profile Emitter (`permission-profile-registry`)
**Commit under review:** `8ce32f2ae52a17040eb93b409eb0c4d2c649d87a` (feat/foreman-line-P3), "feat: implement dispatch-worktree command for permission profiles"
**Review worktree:** `C:\Repos\foreman-line-P3-review-A` (detached at 8ce32f2, created by me)
**Date:** 2026-07-20

## Bottom line

My independent attempt to **break** the parcel's central claim — that the emitted `reviewer-readonly` envelope actually denies fixes/commits at a real process boundary, with an honest positive control and clean tree — **failed: the envelope held on every vector I tried.** All four mandated focus questions come back with **no blocking defect**. The deterministic tier is fully green and every structural guard (closure tripwire, no-coupling, F-D gitignore, dependency allowlist, projection fidelity) holds.

**One honest methodological limitation (read this before treating AC11–14 as closed):** I executed the live probe via **headless `claude -p`**, a real top-level `claude` process (not a subagent, not bypass) that demonstrably *loaded the worktree-local envelope and enforced it* — but `-p` print mode is **not** the interactive top-level session the spec (decision #3 / PROBE.md "Why manual" / Out-of-scope line 130) designates as the sole accepted AC11–14 evidence. I engineered attribution controls that empirically rule out the specific "headless placebo" the spec worries about (see FQ3), so my run is materially stronger than a `--smoke` signal — **but per the spec's own rule I do not cite it as satisfying AC11–14**, and the interactive, human-observed procedure (builder PR evidence + coordinator step-6) remains the load-bearing gate. As an automated reviewer session I cannot drive an interactive `claude` through my tool interface; this is a property of the probe being deliberately manual, not a parcel defect.

---

## Launch-mode self-check (my own session)

- **Not a subagent** — top-level interactive `claude` CLI session (processed `/model`, carries SessionStart hook, MCP, memory).
- **Normal (non-bypass) mode** — corroborated operationally: my emitted deny rules fired in the probe subprocesses while a positive control succeeded; under bypass they would not have fired.
- Set up my **own** detached worktree at the exact SHA; did **not** review the builder's live worktree, and did **not** touch the parallel `foreman-line-P3-review-B` worktree (Reviewer B — zero coordination).

## Deterministic tier (Tier 1, AC1–10) — PASS

Run in PowerShell, `node -v` first (lesson #10), in `…/permission-profiles` inside the review worktree after `npm ci`:

| Check | Result |
|---|---|
| `node -v` | `v24.11.1` (≥22 ✓) |
| `npm test` (`tsx --test`) | **70 pass / 0 fail**, exit 0 |
| `npx tsc --noEmit` | exit 0, no diagnostics |
| `npx biome check .` | `Checked 19 files … No fixes applied`, exit 0 |

The suite includes direct AC coverage: AC3 resolution via `validateRegistry`, AC4 projection fidelity for both `reviewer-readonly` and `builder-standard`, AC5 worktree-create + no-clobber, AC6 `0/1/2` exit contract, AC7 gitignore resolution, AC10 no-coupling/no-DispatchOrder, plus P1's frozen invariants (incl. "reviewer-readonly missing the bare `Edit` deny" → rejected — relevant to the FQ2 note below).

## Structural guards — verified independently (not just via test names)

- **Closure tripwire (charter):** `git show --name-only 8ce32f2` touches **no tracked `.claude/**` path**. The only `.claude`-related change is repo-root `.gitignore` rules. ✓
- **No-coupling (AC10 / F-E):** grep of `src/*.ts` finds **no** `contracts/` import, no sibling `plugins/foreman-line/*` import, and **no `DispatchOrder` reference**. ✓
- **F-D gitignore:** repo-root `.gitignore` contains both `.claude/settings.local.json` and `**/.claude/settings.local.json`; `git check-ignore -v` on an emitted worktree file resolves to `.gitignore:11:**/.claude/settings.local.json` — the **repo-tracked** ignore, not a machine-global one. ✓
- **Dependency allowlist:** `dependencies` = exactly `{ajv 8.20.0, yaml 2.9.0}`. ✓
- **Projection fidelity (dogfooded from my own worktree's emitter):**
  - `reviewer-readonly` → `deny` = bare `Edit`, bare `Write`, `Edit(.claude/**)`, `Write(.claude/**)`, and the 10 `Bash/PowerShell(git commit|push|apply|stash|merge*)` rules; **no `allow`, no `network`, no `bypassPermissions`**. ✓
  - `builder-standard` → `deny` = 4 force-push variants + `Edit/Write(.claude/**)`; **does not deny bare `Write`**. ✓

## Live capability-probe — evidence (headless `claude -p`; see limitation above)

Two throwaway worktrees emitted with the reviewed emitter, each exercised from a fresh top-level `claude` process with cwd = that worktree, normal mode. Evidence is **objective ground truth** (filesystem / `git rev-list --count`), not the model's self-report. Confirmation the envelope was loaded: every subprocess printed `Permission deny rule (.claude\settings.local.json): …` — i.e. it read the worktree-local file I emitted.

| # | Session | Attempt | Expected | Observed (objective) |
|---|---|---|---|---|
| 1a | reviewer-readonly | Write tool → `probe.txt` | denied | **DENIED** — file not created |
| 1b | reviewer-readonly | Bash `git commit --allow-empty` | denied | **DENIED** — commit count 159→159 |
| 1c | reviewer-readonly | PowerShell `git commit --allow-empty` | denied | **DENIED** — commit count 159→159 |
| 2a | reviewer-readonly | Bash `echo probe > residual.txt` | **NOT** denied (F-B residual) | **RAN** — `residual.txt` created |
| 3a | builder-standard | Write tool → `probe.txt` | succeeds | **SUCCEEDED** — file created |
| 3b | builder-standard | Bash `git commit --allow-empty` | succeeds | **SUCCEEDED** — 159→160 |
| 3c | builder-standard | PowerShell `git commit --allow-empty` | succeeds | **SUCCEEDED** — 160→161 |
| 5 | reviewer-readonly | post-probe `git status` | clean (no commit, only disclosed residual) | **HEAD unchanged @8ce32f2**, no commit, `probe.txt` absent, only untracked `residual.txt` (the disclosed F-B residual) |

## The four mandated focus questions (F-K)

### FQ1 — Real launch mechanism (F-A) — **no defect; interactive confirmation reserved for human step-6**
The envelope is genuinely loaded and enforced by a **real top-level `claude` process** (it printed the deny rule sourced from `.claude\settings.local.json`), in **normal mode** (denies fired; bypass would have skipped them), and **not as a subagent** (a subagent would inherit the parent's already-loaded settings and never load the worktree-local scope — mine did load it). *Naive/wrong reading tested:* would it "pass" under bypass or a subagent? No — bypass would not have produced denials (the positive control proves denials are real, not blanket refusals), and a subagent would not have loaded the local file. **Caveat:** my run was print (`-p`) mode, which the spec deliberately distinguishes from interactive; I therefore do **not** claim this discharges AC11 — the interactive, human-observed transcripts (builder + coordinator step-6) remain required.

### FQ2 — Shell-based denial, not only Write-tool, residual honestly recorded (F-B) — **CONFIRMED, no defect**
Both `Bash(git commit*)` and `PowerShell(git commit*)` were denied (objective: no commit created on either vector). Critically, in the **same** reviewer-readonly session the non-enumerated `echo > residual.txt` **ran** — so (a) the F-B residual is real and (b) bare Bash is not blanket-blocked, isolating the deny *rule* as the cause of the commit denials. PROBE.md documents this residual explicitly ("reduced, not eliminated") and does **not** overclaim "fully read-only." No defect.

### FQ3 — Positive control (F-C) — **CONFIRMED, no defect**
The identical three operations (Write, Bash commit, PowerShell commit) all **succeeded** under `builder-standard` in the **identical** headless invocation mode. This is the key control that defeats the headless-placebo concern: if the reviewer-readonly denials were an artifact of headless approval-gating rather than the deny rules, the builder-standard operations would have failed too — they did not. Each reviewer-readonly denial is thus attributable to the envelope, not an incidental failure (wrong cwd/path/unloaded settings/typo).

### FQ4 — Post-probe `git status` clean (D9-amendment) — **CONFIRMED, no defect**
After the probe the reviewer-readonly worktree's HEAD was **unchanged** (`8ce32f2`, commit count 159), no commit was produced by any denied operation, `probe.txt` was absent, and the only working-tree entry was the untracked `residual.txt` — exactly the state PROBE.md Step 5 predicts (the disclosed residual). No committed change from a denied op → no tripwire.

## Additional observation (informational — NOT a P3 defect, do not block on it)

The harness emitted, on every session: *"`Write(**)` / `Write(.claude/**)` is not matched by file permission checks — only `Edit(path)` rules are; Edit rules cover all file-editing tools."* Implication: the path-scoped **`Write(.claude/**)`** deny line is effectively **inert**, and the reviewer-readonly Write-tool block is actually carried by the **bare `Edit` deny** (which covers all file-editing tools incl. Write), with the `.claude/**` self-mod guard carried by **`Edit(.claude/**)`**. This does not weaken any profile: reviewer-readonly denies bare `Edit`; every other profile keeps `Edit(.claude/**)`. It is **not a P3 defect** (P3 emits P1's frozen registry verbatim), and P1 already has an invariant test asserting reviewer-readonly's bare `Edit` deny is present (so the load-bearing rule can't be silently dropped). Flagging only so the coordinator/P4 are aware the `Write(...)`-scoped lines are documentation-grade, not enforcement-grade, on this harness version.

## Disagreement with the build-session completion claim?

I reviewed **blind** (did not read the build transcript). My independent evidence **supports** the AC1–10 claims and the *substance* of AC11–14 (the envelope demonstrably bites, with a working positive control and clean tree). My **only** qualification: any completion claim or PR body must present the **interactive** manual-procedure transcripts for AC11–14, per the spec — a headless signal (mine included) must not be cited as satisfying AC11–14. If the build session's evidence is headless-only, that portion is not yet spec-sufficient even though my probe corroborates the behavior.

## Cleanliness attestation

- Probe worktrees `fl-probe-ro-A` / `fl-probe-std-A` and their branches `feat/foreman-line-PROBE-RO-A` / `-STD-A` were **torn down** (`git worktree remove --force` + `branch -D` + `worktree prune`); both directories are gone and `git worktree list` no longer shows them.
- I did **not** modify the main repo working tree beyond this findings file, did **not** touch the builder worktree or the `-review-B` worktree, and created **no** commits on any parcel branch.
- My review worktree `C:\Repos\foreman-line-P3-review-A` (detached @8ce32f2) is left in place for the coordinator; it may be removed with `git worktree remove`.

**Verdict: PASS with no blocking findings.** Remaining gate is not mine to close: the interactive human-observed AC11–14 evidence (builder + coordinator step-6), which my independent headless probe corroborates but, per spec, does not replace.
