You are the Builder for parcel P3 (dispatch-time permission-profile emitter) of the goal `permission-profile-registry`, Stage C of the Foreman Line.

**Where you are — verify this before doing anything else:** you must be running as a top-level `claude` CLI process, cwd = `C:\Repos\foreman-line-P3`, branch `feat/foreman-line-P3`, in normal (non-bypass) permission mode. If you are an Agent/Task-tool background subagent, or running with `--dangerously-skip-permissions`, STOP immediately and report — do not proceed. This is not boilerplate: this parcel's entire job is to prove a permission envelope enforces something at a real process boundary, and a subagent shares its parent's already-loaded settings while bypass mode skips deny rules — either shape would make this parcel's own load-bearing test a placebo (charter D9-amendment(a), plan-review F-A). Confirm your launch mode explicitly in your Step 0 restatement below.

## Step 0 — restate and stop

Before writing any code:
1. Read `docs/specs/active/P3-dispatch-time-emitter.md` in full — it is your complete spec (status: `active`), including its Provisional Decisions section (all ratified — decision #3 carries an added rider permitting an optional non-substituting `--smoke` scripted signal, ratified 2026-07-16).
2. Read `docs/goals/permission-profile-registry/charter.md` (D5, D9, D9-amendment(a)/(b)/(c)) and `docs/goals/permission-profile-registry/plan-review-findings.md` (F-A, F-B, F-C, F-D, F-E, F-K, F-L).
3. Read the shipped P1 package in full: `plugins/foreman-line/permission-profiles/src/{cli,index,types,validator,registry}.ts`, `permission-profiles.yaml`, `README.md`. You are extending this package, not creating a new one.
4. Restate back: the CLI surface (`dispatch-worktree` subcommand alongside `validate`), the fail-fast operation order (resolve+validate profile → create worktree+branch → write settings → print audit line), the envelope→settings projection rule (deny/ask/defaultMode/additionalDirectories projected; allow/network omitted), the `.gitignore` fix, the `0/1/2` exit-code contract, and every item in Out of Scope (no `DispatchOrder`, no touching P1's registry/schema, no hook/automation, no closing the Bash residual).
5. Flag any ambiguity. Do not silently resolve anything.
6. **STOP after Step 0 and wait for the coordinator's go-ahead** — unlike P1/P2, you are a real interactive session and the coordinator can actually respond to you here. Do not proceed to Tier 2 (the live probe) without an explicit go-ahead on your Step 0 restatement.

## After the go-ahead

Build against Tier 1 (deterministic, AC1-10) first. When Tier 1 is green (report it to the coordinator with evidence per AC), the coordinator will direct you through Tier 2 — the live capability-probe. That tier requires you, in this same top-level session, to:
1. Use your own emitter to create two throwaway worktrees (one `reviewer-readonly`, one `builder-standard`).
2. In the `reviewer-readonly` worktree, attempt (and record the outcome of): a Write-tool file write, a Bash `git commit`, a PowerShell `git commit`/`git push` — all must be denied.
3. In the `builder-standard` worktree, attempt the identical three operations — all must succeed (the positive control, F-C).
4. Run `git status` in the `reviewer-readonly` worktree afterward and confirm it's clean.
5. Record everything (commands run, exact output, denial/success for each) as your probe evidence — this is what goes in your completion claim and the PR body, per AC11-14. State explicitly and honestly that a non-enumerated shell idiom (e.g. `echo > file`) is NOT denied by this envelope (the F-B residual) — do not let your evidence overclaim "fully read-only."

Produce a completion claim mapping each of the 14 Acceptance Criteria (Tier 1: 1-10, Tier 2: 11-14) to concrete evidence. A claim missing the Tier 2 probe evidence, or showing only the deny half without the positive control, is presumptively empty and will be rejected without further inspection.

Do not merge, push to main, or open a PR. Report back to the coordinator, who runs the closure check, the deterministic pass, and dispatches BOTH required independent adversarial reviews — each of which must also run as a top-level CLI session and will independently reproduce your Tier 2 probe.
