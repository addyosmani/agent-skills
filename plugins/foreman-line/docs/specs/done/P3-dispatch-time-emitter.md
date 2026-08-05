---
ticket: KONE-TBD            # register via jira-workflow at Stage B; replace before dispatch
title: Foreman Line - dispatch-time permission-profile emitter (P3)
status: done                # Shipped 2026-07-20; PR #23 merged; dual adversarial review passed with no blocking findings
owner: clinton.morgan
created: 2026-07-16
updated: 2026-07-20
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
surfaces: [plugins/foreman-line/permission-profiles/*, .gitignore]
routing_class: architecture/risk
permission_profile: null
---

# P3 - Dispatch-Time Permission-Profile Emitter

## Intent

Ship the dispatch-time mechanism that installs a resolved permission profile into a parcel worktree's untracked `.claude/settings.local.json` **before** any builder or reviewer session launches - a `dispatch-worktree` CLI added to P1's existing `permission-profiles` package. This is the parcel that makes the whole goal non-inert: P1's registry, P2's field, and P4's lint are all documentation until P3 actually writes an envelope that bites at a live process boundary. The single load-bearing acceptance gate is therefore not a unit test but a **live capability-probe** (charter D9-amendment): a real top-level `claude` CLI session, launched in a freshly emitted `reviewer-readonly` worktree in normal (non-bypass) mode, is proven to be denied a Write-tool write and a shell-based `git commit`/`git push`, with a positive control showing the same operations succeeding under `builder-standard`, and a post-probe `git status` clean in the reviewer worktree.

This parcel ships the strongest honestly-achievable version of "reviewer never fixes, never commits": a structurally reduced, mechanically-enforced-where-loaded capability, whose three documented limits (not-loaded under a subagent; void under bypass mode; the unbounded shell-write residual F-B) are carried forward from P1's README, not glossed. It delivers the envelope *mechanism*, not its guaranteed *application* (charter F-G): nothing forces a coordinator to run this wrapper instead of a bare `git worktree add`, and mandatory-invocation enforcement is out of scope (future dispatch automation). It also does not construct a `DispatchOrder` (charter F-E): no runtime producer exists anywhere in this repo, and standing one up would be scope creep into W2-P3.

## Constraints

- **Location:** the CLI lands **inside P1's existing `plugins/foreman-line/permission-profiles/` package** (decision #1) - a `dispatch-worktree` subcommand alongside the shipped `validate` subcommand, sharing the single `permission-profiles` bin. New source in `src/emitter.ts` (resolve + project + create-worktree + write) and an extended `src/cli.ts` (subcommand dispatch). No new package, no second bin. This is not a cross-package import: P3 *is* the permission-profiles package growing a second verb, so it consumes its own `validateRegistry`, `PROFILE_NAMES`, and types, and reads its own shipped `permission-profiles.yaml` - none of which is a sibling dependency.
- **Stack:** TypeScript, Node >=22 (repo root `engines.node` requires >=24.11.1; live toolchain reports `v24.11.1`), ESM-only. Tests via `node --test` through `tsx` (`tsx --test tests/*.test.ts`, the package's existing `npm test`). Lint/format with `biome`.
- **Runtime dependency allowlist unchanged:** the package's `dependencies` MUST remain exactly `{ajv, yaml}` (P1's machine-enforced allowlist test stays green). Git worktree creation and file writes use Node built-ins (`node:child_process`, `node:fs`, `node:path`) - no new runtime dependency. If the emitter is tempted to add one, that is a stop-and-report.
- **ajv / `JSONSchemaType` ban (standing rule, restated):** P3 introduces **no new schema**. It consumes P1's `permissionProfileRegistrySchema` via `validateRegistry` and parses its CLI arguments imperatively (not via a schema). If any schema-shaped validation of P3's own inputs is introduced, it must be a hand-authored `SchemaObject` (draft-07), never `JSONSchemaType` - but the recommended design introduces none.
- **Deny-first projection is P1's ruling carried forward (D9):** the emitter projects a resolved `profile.envelope` into `settings.local.json.permissions`. `deny`/`ask` are the restriction mechanism; `allow` and `network` are documentation-only. The emitted file is the untracked `.claude/settings.local.json`, **never** the tracked `settings.json` (D9). Every emitted envelope already carries P1's `.claude/**` self-modification guard because it comes verbatim from the validated registry.
- **P1 is shipped and frozen for this goal (read-only):** P3 does not modify P1's schema, types, validator, registry document, or its five semantic invariants. P3 only *reads* the registry (via `validateRegistry` + index) and *adds* the emitter surface.

### CLI surface, invocation, and semantics (decision #1, decision #8-worktree-creation)

A single new subcommand:

```
permission-profiles dispatch-worktree --parcel <ref> --profile <name> --path <worktree-path>
```

- `--profile <name>` MUST be one of `PROFILE_NAMES` (the P1 authority); an unknown name is rejected **before any git mutation** (fail-fast).
- `--path <worktree-path>` is where the new worktree is created. Per charter D5 the wrapper **creates** the git worktree + branch; it is not an emit-into-an-existing-directory tool. Reconciling the kickstarter's "a worktree path that doesn't exist" failure case with D5's create semantics: the **parent** directory of `--path` must exist and `--path` itself must **not** already exist (creating a worktree over an existing path is the error, not a missing one). (Surfaced as a provisional decision - see below.)
- `--parcel <ref>` names the parcel; the branch is derived as `feat/foreman-line-<ref>` (matching lesson #9's established `feat/foreman-line-P*` / `C:\Repos\foreman-line-P*` convention), recorded for the operator, and used as the new worktree's branch. (Surfaced as a provisional decision - branch-name derivation vs. an explicit `--branch` override.)

Operation order (fail-fast, no partial git state on a bad profile):
1. Parse args; resolve the profile against P1's registry (`validateRegistry` gate, then index `profiles[name]`). Unknown profile or invalid registry stops here, before touching git.
2. `git worktree add <path> -b <branch>` (creates worktree + branch).
3. Write `<path>/.claude/settings.local.json` from the resolved envelope projection.
4. Print the resolved profile name, branch, and path to stdout (the operator's audit line - **not** a `DispatchOrder`, see decision #4).

### Envelope -> `settings.local.json` projection (decision #7)

The emitter writes a `{ "permissions": { ... } }` object matching Claude Code's live shape (verified against this repo's `.claude/settings.local.json`: `allow[]`/`deny[]`/`defaultMode`/`additionalDirectories[]`):

- **`deny`** - projected verbatim from `envelope.deny` (THE restriction mechanism).
- **`ask`** - projected verbatim from `envelope.ask`.
- **`defaultMode`** - projected only if the profile declares one; otherwise omitted (the harness default applies). Deny wins regardless of mode, so this is not load-bearing for denial; the emitter never writes `bypassPermissions` (P1's schema cannot express it, so it can never appear in a resolved envelope).
- **`additionalDirectories`** - projected only if the profile declares it.
- **`allow` is NOT projected**, and **`network` is NOT projected** (both documentation-only per D9/F-L). Omitting `allow` keeps the emitted enforced artifact purely restrictive, so no reader mistakes an `allow` line in a live settings file for the restriction mechanism. (Surfaced as a provisional decision - the coordinator may prefer to also emit `allow` for parity with the registry; deny-wins means it changes no enforcement either way.)

### The `.gitignore` fix (F-D, decision #2)

Add to the **repo-root** `.gitignore` (decision #2 - root, matching how `.claude/` config is conventionally handled and simplest to reason about; a per-worktree scoped ignore would not travel to fresh clones/CI, which is the exact hole F-D identifies):

```
# Emitted per-worktree permission envelopes (permission-profile-registry P3) - never tracked
.claude/settings.local.json
**/.claude/settings.local.json
```

This makes D9's "won't ride a PR into main" guarantee repo-local and portable, instead of depending on a contributor's machine-local global gitignore. The additions are additive to the existing `.claude/**/*.db` / `.claude/**/cache/**` patterns and touch no other ignore rule.

### Failure / rollback contract (decision #5)

Exit codes mirror P1's `0/1/2` discipline, re-cast for an emitter:

| Code | Meaning |
|---|---|
| `0` | Success - worktree + branch created, profile resolved, `settings.local.json` written. |
| `1` | Well-formed invocation that could not complete: registry document fails `validateRegistry` (integrity failure); `git worktree add` failed (target `--path` already exists, branch already exists, not inside a git repo, git error); `<path>/.claude/settings.local.json` already exists (refuse to clobber - no silent overwrite); filesystem write error. Every failure reason printed to stderr. |
| `2` | Usage error: missing/unknown flags, missing `--parcel`/`--profile`/`--path`, or a `--profile` value not in `PROFILE_NAMES` (a bad argument value, caught before any git mutation). |

Rollback: because the profile is resolved and validated *before* `git worktree add` (step 1 before step 2), a bad profile leaves no git state to roll back. If the settings write (step 3) fails after the worktree was created (step 2), the CLI reports the created worktree path on stderr and exits `1` without attempting an automatic `git worktree remove` (leaving cleanup explicit and visible rather than silently deleting an operator's freshly created worktree). (Surfaced as a provisional decision.)

### DispatchOrder: not touched (decision #4)

P3 does **not** construct, produce, or stamp a `DispatchOrder`, and does **not** import the `DispatchOrder` type (even type-only) from `contracts/`. Recommended resolution (a) from the kickstarter: the CLI emits `settings.local.json` and prints the resolved profile name / branch / path as a plain operator audit line; no `DispatchOrder`-shaped object is involved. Rationale: F-E establishes that no runtime `DispatchOrder` producer exists anywhere in this repo; the charter's "type-level only" stamp is already satisfied by P2 having shipped the `permissionProfile?: string` field (it is type-carriable today). Building any `DispatchOrder`-shaped receipt here risks becoming the very producer F-E warns is scope creep into W2-P3 - a stop-and-report, not a natural extension. The audit line the CLI prints MUST NOT be labeled or shaped as a `DispatchOrder`.

### Standing dispatch / environment constraints

- **Branch/worktree (lesson #9):** the P3 builder works on the named feature branch `feat/foreman-line-P3`, isolated in its own worktree at `C:\Repos\foreman-line-P3` - never in the main working tree. This line goes into the dispatch kickstarter verbatim.
- **Launch mode (charter D9-amendment(a)) - LOAD-BEARING, see Verification Plan:** P3's build session AND both dual-review sessions AND the live capability-probe MUST run as top-level `claude` CLI sessions (cwd = the relevant worktree, normal/non-bypass permission mode). Never an Agent/Task-tool subagent, never `--dangerously-skip-permissions`. This is the one dispatch-shape departure from W0 practice, and it exists precisely because this is the parcel that proves the envelope bites.
- **Deterministic-pass environment (lesson #10):** the deterministic (unit/integration) tier runs in PowerShell only; `node -v` (must report >=22) is the first command run, before anything else.
- **PowerShell pipeline exit-code lesson (lesson #11):** CLI exit-code tests capture output in full before reading `$LASTEXITCODE` - never truncate a pipeline whose exit code is under test.
- **Closure-check tripwire (charter):** no parcel diff in this goal may touch tracked `.claude/**` paths. P3 writes only to a worktree's *untracked* `.claude/settings.local.json` at runtime and adds `.gitignore` entries; it commits no `.claude/**` file. If any P3 diff stages a tracked `.claude/**` path, that is loud, not silent.

## Acceptance Criteria

**Tier 1 - deterministic (runnable via `npx tsx --test`, PowerShell, `node -v` first):**

1. `npx tsc --noEmit` passes on the `permission-profiles` package with the new emitter source.
2. `package.json`'s `dependencies` keys still equal exactly `{ajv, yaml}` (P1's allowlist test stays green; no runtime dependency added for git/fs).
3. **Profile resolution:** given `--profile reviewer-readonly`, the emitter resolves the exact `reviewer-readonly` envelope from the shipped `permission-profiles.yaml`, gated through `validateRegistry` (a resolution path that does not first validate the registry is a defect). An unknown `--profile` value exits `2` before any git call; a registry that fails `validateRegistry` exits `1`.
4. **Projection fidelity:** the projected `settings.local.json` for `reviewer-readonly` contains, in `permissions.deny`, the bare `Edit` and `Write` tools and all ten enumerated git-mutation rules (`Bash/PowerShell(git commit|push|apply|stash|merge*)`); does **not** contain bare `Bash` or bare `PowerShell` in `deny`; contains no `allow` key and no `network` key; contains no `bypassPermissions` anywhere. The projected `builder-standard` file denies force-push variants + the `.claude/**` self-mod guard and does not deny `Write`.
5. **Worktree creation (against a throwaway temp git repo in the test):** `dispatch-worktree --parcel PX --profile builder-standard --path <tmp>` creates a worktree at `<tmp>` on branch `feat/foreman-line-PX` and writes `<tmp>/.claude/settings.local.json`; exits `0`. Re-running against an already-existing `--path` exits `1` (no clobber); a pre-existing `<path>/.claude/settings.local.json` exits `1` (no overwrite).
6. **Exit-code contract:** `0` on success; `2` on missing/unknown flags and on an unknown `--profile` value; `1` on registry-integrity failure, git-worktree failure, and settings-already-present. Every failure reason is written to stderr (not just the first). Tests capture full output before reading `$LASTEXITCODE` (lesson #11).
7. **`.gitignore` (F-D):** the repo-root `.gitignore` contains both `.claude/settings.local.json` and `**/.claude/settings.local.json`; a test asserts `git check-ignore` (or equivalent) resolves an emitted worktree `settings.local.json` to the repo-tracked `.gitignore`, not a machine-local global ignore.
8. `biome check .` passes with zero diagnostics.
9. All tests pass via `npx tsx --test`; the package's total test count does not decrease from P1's shipped baseline and increases by the emitter's new cases (record pre-edit baseline at dispatch and the post-edit count).
10. **No DispatchOrder / no cross-package coupling (F-E):** the shipped package contains no import of `contracts/` (or any sibling `plugins/foreman-line/*` package), no construction of a `DispatchOrder`, and no runtime producer of any dispatch payload. Grep-confirmable.

**Tier 2 - live capability-probe (manual, top-level `claude` CLI sessions; the load-bearing gate, charter D9-amendment / F-A/F-B/F-C).** An optional scripted `--smoke` secondary signal (ratified 2026-07-16) may exist for build-time convenience but is never evidence for AC11-14 — the manual procedure below is always the required gate:

11. **The probe is executed, not asserted by a test runner.** Using the emitter itself (dogfooding), emit two fresh worktrees: one under `reviewer-readonly`, one under `builder-standard`. Then, in **separate top-level `claude` CLI sessions** (cwd = the respective worktree, normal/non-bypass mode - never a subagent, never bypass):
    - **Negative (reviewer-readonly worktree), all MUST be denied:** (a) a Write-tool file write; (b) a Bash `git commit`; (c) a PowerShell `git commit` (or `git push`). These target the *enumerated* denied operations - the probe MUST NOT claim denial of a non-enumerated idiom (e.g. `Bash(echo x > f)`), which the envelope deliberately does **not** deny (the F-B residual; see AC13).
    - **Positive control (builder-standard worktree), all MUST succeed:** the *same* three operations - Write-tool write, Bash commit, PowerShell commit - succeed, proving each denial in the negative run is attributable to the `reviewer-readonly` envelope, not to an incidental failure (path absent, wrong cwd, unloaded settings, typo) (F-C).
12. **Post-probe detection control (charter D9-amendment standing control):** after the reviewer-readonly session, `git status` in that worktree is **clean**. A dirty tree is a tripwire finding, not a shrug.
13. **Residual honesty (F-B):** the probe's recorded evidence explicitly states that a non-enumerated shell write idiom (`echo > file`, `sed -i`, etc.) is **not** denied by `reviewer-readonly`'s envelope - the reviewer's fix/commit capability is *reduced, not eliminated* - and that the `git status`-clean detection control is the paired mitigation. Evidence that reads "reviewer is fully read-only, full stop" is a defect against the charter's deliberately-hedged objective.
14. **Evidence captured as a receipt:** the probe is documented in a runbook shipped with the package (`plugins/foreman-line/permission-profiles/PROBE.md` - see decision below), and its execution evidence (session transcript excerpts showing each denial and each positive-control success, plus the `git status` output) is attached to P3's PR. The build session produces the initial evidence; each of the two dual reviewers independently reproduces the probe in their own top-level session; the coordinator personally verifies the evidence before accepting (loop-directive step 6). A probe result showing only the deny half, or run in any non-top-level / bypass mode, is presumptively empty.

## Out of Scope

- **P1's registry schema/types/validator/registry document.** P3 reads P1 (via `validateRegistry` + index) and adds an emitter; it does not modify P1's schema, `PROFILE_NAMES`, the five semantic invariants, or the six v0 profiles' contents. P1 is shipped and frozen for this goal. Changing a profile's envelope is a stop-and-report.
- **`plugins/foreman-line/contracts/` (P2's surface, shipped).** No touching `DispatchOrder`, no import of it (even type-only), no construction of a dispatch payload, no producer. The charter's "type-level stamp" is already satisfied by P2's shipped field (F-E). Standing up a `DispatchOrder` producer is the single most tempting trap and is a stop-and-report.
- **`plugins/foreman-line/spec-linter/` (P4's surface).** P3 does not enum-validate any spec frontmatter; P4 consumes `PROFILE_NAMES`, not P3.
- **Any Foreman Line dispatch automation.** No SessionStart hook (D5 explicitly rejected the hook approach as circular), no CI step, no scheduled job, no code that runs on its own. The emitter is a manually-invoked CLI slotting into the coordinator's existing by-hand worktree creation. Mandatory-invocation enforcement (forcing the wrapper to be used instead of a bare `git worktree add`) is future dispatch automation (W2-P3), not this parcel (F-G).
- **Network-dimension enforcement (F-L).** `network` is documentation-only; the emitter does not project it into an enforced setting and no AC asserts it gates at the process boundary.
- **Closing the Bash/PowerShell residual (F-B).** The emitted envelope reduces, not eliminates, shell-based mutation; the residual is documented and paired with the `git status`-clean detection control, not closed. Attempting to deny the unbounded set of shell write idioms (or denying bare `Bash`/`PowerShell`, which P1 invariant 5 forbids for `reviewer-readonly`) is out of scope and would break P1's registry.
- **Treating a scripted probe as sufficient evidence.** The required, load-bearing AC11-14 evidence MUST always be the manual, top-level-CLI, dual-reproduced procedure (F-K) — a scripted headless `claude -p` invocation is a different mode that risks passing while proving nothing, reintroducing the exact placebo F-A caught. An optional `--smoke` scripted signal is permitted (ratified 2026-07-16) strictly as a non-substituting, build-time convenience — it must never be cited as satisfying AC11-14 in a completion claim, review finding, or PR body.
- **The other frozen/shipped packages** (`routing-policy`, `receipts`, `skill-injection`) - untouchable, not imported.
- **`SPEC-CONVENTION.md`, `COORDINATOR-PATTERN.md`, and the deferred-parcel note.** The dispatch-table envelope-column update and the deferred-parcel-note closure ride P4, not P3.
- **CI workflow wiring** of the emitter or the probe - deferred to W4, consistent with every sibling.
- **`INDEX.md` and Jira registration / status flip to `active`.** `ticket: KONE-TBD` is registered at Stage B; the `INDEX.md` entry and the `draft`->`active` flip are the coordinator's at the approval gate, not this shaping session's.

## Context & References

- `docs/goals/permission-profile-registry/charter.md` - **D5** (worktree-creation wrapper, not a hook), **D9** (deny-first; `.claude/settings.local.json` untracked, never tracked `settings.json`; self-mod guard), **D9-amendment(a)/(b)/(c)** (top-level-CLI launch-mode pinning for P3's build/review/probe; enumerable Bash+PowerShell repo-mutation denies; deliberate reviewer shell access + standing `git status`-clean detection control), the **P3 parcel row** (AC + the four mandated dual-review focus questions - binding, not a redesign target), and the **Exit criterion's two scope limits** (F-E type-only, no producer; F-G mechanism not forced application).
- `docs/goals/permission-profile-registry/plan-review-findings.md` - **F-A** (launch mode decides whether the file is read at all), **F-B** (deny-Edit/Write is not deny-filesystem-mutation while Bash is allowed), **F-C** (positive/negative control - a probe with no positive control proves nothing), **F-D** (repo-tracked `.gitignore`), **F-E** (no `DispatchOrder` producer; type-level only), **F-K** (P3-specific reviewer focus questions), **F-L** (network documentation-only).
- `docs/goals/permission-profile-registry/loop-directive.md` - the dispatch-mechanics overlay (P3 build/review are top-level CLI sessions, not subagents) and step 6 (coordinator personally verifies the probe before accepting).
- `docs/specs/done/P1-permission-profile-registry-schema.md` - the package P3 extends; the `PROFILE_NAMES`/`validateRegistry`/types exports P3 consumes; the deny-first ruling, the six v0 profiles, and the session-start-load-bound README (with the not-loaded/bypass/shell failure modes) whose enforcement P3 now proves.
- `docs/specs/done/P2-dispatch-order-permission-profile-field.md` - the shipped `permissionProfile?: string` field; the "type-level only, no producer" scoping P3 must not violate.
- `plugins/foreman-line/permission-profiles/src/{cli,index,types,validator}.ts`, `permission-profiles.yaml`, `README.md` - the shipped P1 artifacts P3 reads/extends.
- `.claude/settings.local.json` (this repo) - the live ground truth for the `permissions` object shape the emitter writes (`allow`/`deny`/`defaultMode`/`additionalDirectories`; bare-tool and `Tool(specifier)` rule forms; the force-push deny idioms).
- `.gitignore` (repo root) - the F-D target; currently has no `.claude/settings.local.json` entry (the hole this parcel closes).
- `docs/transcripts/defects_lessons.md` - #9 (name branch/worktree), #10 (PowerShell + `node -v` first), #11 (don't truncate a pipeline whose exit code you trust), #12 (hostile-input probing at the live boundary licenses reviewer shell access; dual review), #5/#7/#14 (verify claims on disk; closure checks verify work; attempt the naive/wrong reading).

## Verification Plan

### Launch-mode requirement - LOAD-BEARING, restated in plain terms (do not treat as boilerplate)

**P3's build session, and BOTH required dual-review sessions, and the live capability-probe, MUST each run as a top-level `claude` CLI session** - a real `claude` process started in its own terminal/window, with its working directory set to the parcel worktree (`C:\Repos\foreman-line-P3` for build/review; the freshly emitted probe worktrees for the probe), in the harness's **normal (non-bypass) permission mode**. They MUST NOT run as an Agent/Task-tool background subagent, and MUST NOT run in `--dangerously-skip-permissions` / bypass mode.

Why, in one breath: a permission profile only constrains a session that actually *loads* the worktree-local `.claude/settings.local.json` at start. A background subagent shares the parent session's already-loaded settings and never reloads the worktree's local scope, so the envelope is inert for it; a bypass-mode session skips deny rules entirely. Either shape turns this parcel - whose entire job is to prove the envelope bites - into a placebo that goes green while enforcing nothing (plan-review F-A). This is the one dispatch-shape departure from every prior W0 parcel, and it applies **only** to P3. The coordinator dispatching P3's builder or reviewer as a subagent, or in bypass mode, is a stop-and-report on the coordinator's own conduct (loop-directive loop-stop), not merely a builder tripwire.

### Deterministic tier (Tier 1 ACs 1-10)

Runs in PowerShell on the coordinator's machine; `node -v` (>=22) is the first command run (lesson #10). Covers: `tsc --noEmit` (AC1); dependency-allowlist (AC2); profile resolution + `validateRegistry` gating (AC3); projection fidelity for `reviewer-readonly` and `builder-standard` (AC4); worktree creation + no-clobber against a throwaway temp git repo (AC5); the `0/1/2` exit-code contract with full-output capture before `$LASTEXITCODE` (AC6, lesson #11); the repo-tracked `.gitignore` resolution (AC7); `biome check` (AC8); test-count non-regression + attributable increase (AC9); the no-DispatchOrder / no-coupling grep (AC10).

### Live-probe tier (Tier 2 ACs 11-14) - the load-bearing gate

Executed manually per `PROBE.md`, in top-level `claude` CLI sessions as above. The build session produces the initial probe evidence (transcripts of each denial + each positive-control success + the clean `git status`), attached to the PR. This is **not** a `node --test` case and cannot be - a test runner cannot launch and drive an interactive `claude`.

### Review - DUAL independent adversarial review (charter D7/D8), each reviewer a top-level CLI session

Two independent, zero-shared-context adversarial reviewers, **each running as its own top-level `claude` CLI session in the parcel worktree** (not a subagent, not bypass). Each independently reproduces the live probe in a fresh emitted worktree and runs the charter's four mandated P3 focus questions (F-K), each attempting the naive/wrong reading (lesson #14):

1. **Real launch mechanism (F-A/F-K).** Does the probe launch the session via the exact mechanism real dispatch uses - a top-level `claude` CLI process in normal mode - and not whatever mode makes the probe pass? Attempt the wrong reading: would the probe still "pass" under a subagent or bypass mode (it must not, and the reviewer must confirm the recorded evidence is from a genuine top-level normal-mode session).
2. **Shell-based denial, not only Write-tool (F-B/F-K).** Is a shell-based `git commit`/`git push` denied under `reviewer-readonly`, not only a Write-tool write? Independently confirm the *residual* is honestly recorded: a non-enumerated `echo > file` is **not** denied, and the evidence says so rather than overclaiming.
3. **Positive control (F-C/F-K).** Do the same three operations *succeed* under `builder-standard`, making each `reviewer-readonly` denial attributable to the envelope rather than an incidental failure? A negative-only probe is presumptively empty.
4. **Post-probe `git status` clean (D9-amendment/F-K).** Is the reviewer worktree's `git status` clean after the probe? A dirty tree is a tripwire finding.

Where the two reviewers disagree on a finding, the coordinator reproduces it before triaging (lesson #14). The coordinator additionally performs the loop-directive step-6 personal verification (launch mode, both write vectors, positive control, clean status) before accepting - a P3 completion claim showing only the deny half is presumptively empty (F-C).

### PROBE.md and evidence location (provisional decision)

The probe runbook ships as `plugins/foreman-line/permission-profiles/PROBE.md` (co-located with the package it exercises - within the declared `surfaces:`), containing the exact numbered attempts, expected outcomes, and the residual/detection-control notes. Execution evidence (transcript excerpts + `git status` output) lives in the PR body / review thread, not committed as a tracked artifact (it references no `.claude/**` tracked path). *Surfaced for coordinator ratification: an alternative is a `docs/`-side runbook; package co-location is recommended because the probe is a property of this package's emitter.*

## Epic/Story/Task Projection (proposal only - Jira registration is future work, not this session)

**Epic:** Foreman Line - Permission-Profile Registry + Dispatch-Time Emitter *(the goal charter's four-parcel epic; P3 is its third story)*

**Story:** P3 - Dispatch-Time Permission-Profile Emitter

- **Task 1:** `src/emitter.ts` - resolve profile (via `validateRegistry` + index), project envelope -> `settings.local.json.permissions` (deny/ask/defaultMode/additionalDirectories; omit allow/network), create worktree + branch, write settings; fail-fast ordering.
- **Task 2:** Extend `src/cli.ts` with the `dispatch-worktree` subcommand + the `0/1/2` exit-code contract; keep the `validate` subcommand and single bin.
- **Task 3:** Repo-root `.gitignore` additions (`.claude/settings.local.json`, `**/.claude/settings.local.json`) - the F-D closure.
- **Task 4:** Tier-1 deterministic tests (resolution, projection fidelity, worktree creation + no-clobber, exit codes, `.gitignore` resolution, dependency allowlist, no-coupling grep).
- **Task 5:** `PROBE.md` runbook - the numbered live-probe procedure with expected outcomes, residual honesty, and detection-control notes.
- **Task 5b (optional):** a scripted `--smoke` secondary signal (headless `claude -p`, build-time convenience only) - clearly labeled "informational, not probe evidence"; never substitutes for Task 6's manual procedure.
- **Task 6 (verification, not builder-owned):** execute the live capability-probe in top-level CLI sessions; dual independent adversarial review (each a top-level CLI session) per the four mandated focus questions; coordinator step-6 personal verification; human merge gate.

The next Jira-relevant registration event for this goal is P4 (spec-linter enum upgrade) once P3 is merged.

## Provisional Decisions (surfaced for coordinator ratification - status stays `draft` until then)

Every item below was resolved unilaterally by the shaping agent as a well-reasoned default, per the kickstarter's "propose a default and STOP" instruction. None is final; the coordinator (and Clint) may ratify or override any of them at the approval gate. **Decision #3 needs the most scrutiny.**

1. **CLI surface = a `dispatch-worktree` subcommand inside P1's existing `permission-profiles` package** (kickstarter decision #1), not a separate package. Rationale: least new surface; reuses P1's `validateRegistry`/`PROFILE_NAMES`/types/registry without a cross-package import (it *is* that package); mirrors the sibling single-bin, subcommand-per-verb shape. *Override option:* a standalone `dispatch-worktree` package if the coordinator wants the emitter physically separated from the validator - but that forces a real cross-package import of P1 for no benefit.

2. **`.gitignore` fix at repo root** (kickstarter decision #2), with both `.claude/settings.local.json` and `**/.claude/settings.local.json`. Rationale: simplest, portable to fresh clones/CI (a per-worktree scoped ignore would not travel, which is exactly the F-D hole), and matches how `.claude/` config is conventionally handled. *Override option:* a worktree-scoped ignore - not recommended, defeats F-D's portability point.

3. **Live capability-probe = a human-executed, dual-reviewer-reproduced manual procedure in real top-level interactive `claude` CLI sessions, documented in `PROBE.md`, evidence captured in the PR - NOT an automated script that shells out to `claude`** (kickstarter decision #3 - flagged as the one needing the most scrutiny). Reasoning, made explicit because this is genuinely unusual:
   - The charter's F-K focus question is "does the probe launch the session via the *exact mechanism real dispatch uses*, not whatever mode makes the probe pass?" Real dispatch is a builder/reviewer opening an interactive top-level `claude` session in the worktree. A scripted headless `claude -p` (or `--output-format json`) subprocess is a *different* invocation mode whose settings-loading behavior is not the same thing under test - automating the probe would risk passing while proving nothing, which is the exact placebo (F-A) the whole D9-amendment exists to prevent. Automating it reintroduces the failure mode one level down.
   - The probe is inherently interactive and observed: it cannot run under `node --test` (a test runner cannot drive an interactive `claude`), and it requires an authenticated `claude`, network, and human judgment about whether an attempt was *denied by the envelope* vs. declined/prompted for another reason.
   - The reproducibility concern (a single manual attestation is weak) is already answered by the charter's design: the probe is reproduced at least three times by independent top-level sessions (the builder + two dual reviewers) and personally spot-verified by the coordinator (loop-directive step 6), plus the `git status`-clean detection control. That is a stronger guarantee than one automated script that could be uniformly wrong.
   - **Ratified by Clint 2026-07-16: option (ii) accepted.** The manual, dual-reproduced, top-level-CLI procedure above remains the **required, primary, load-bearing gate** — nothing below substitutes for it. Additionally, P3 MAY ship an optional scripted secondary signal: a `--smoke` mode (or a separate `probe:smoke` script) that shells out to `claude -p` (headless, non-interactive) against a freshly emitted worktree and checks the same deny/allow assertions programmatically, for fast iteration *during build only*. This scripted signal is explicitly informational-only — a green scripted run proves nothing about real dispatch (headless `-p` invocation is a different mode than the top-level interactive session real dispatch uses, so it does not close F-A on its own) and MUST NOT be cited in a completion claim, review finding, or PR body as satisfying AC11-14. The PR's evidence for AC11-14 must always be the manual procedure's transcripts, never the scripted signal's output. Also ships a probe-*setup* helper (throwaway worktree emission + numbered attempt list) as described below — the setup helper and the optional `--smoke` mode may share code, but `--smoke`'s output is clearly labeled "informational, not probe evidence" wherever it's printed.

4. **P3 does not touch `DispatchOrder` at all** (kickstarter decision #4, recommended option (a)). The CLI emits `settings.local.json` and prints the resolved profile name/branch/path; no `DispatchOrder` object is constructed, and the type is not imported even type-only. Rationale: F-E - no producer exists; the "type-level stamp" is already satisfied by P2's shipped field; building a `DispatchOrder`-shaped receipt here is the scope-creep trap (option (b)) into W2-P3 and would be a stop-and-report. *Override option:* option (b), a minimal illustrative `DispatchOrder`-shaped receipt - explicitly not recommended; it is the exact producer F-E warns against.

5. **Failure/rollback = the `0/1/2` contract above** (kickstarter decision #5): `0` success; `2` usage errors including an unknown `--profile` value (caught before any git mutation, fail-fast); `1` well-formed-but-incomplete (registry-integrity failure, git-worktree failure incl. pre-existing path/branch, pre-existing `settings.local.json` refused rather than clobbered, write error). No automatic `git worktree remove` on a post-creation write failure - the created path is reported on stderr and left for explicit operator cleanup. *Override options:* (i) make unknown-profile a `1` rather than `2` (I chose `2` because it is a bad argument *value*, a usage class); (ii) add `--force` to permit overwriting an existing `settings.local.json` (I default to refuse-and-report); (iii) auto-remove the worktree on a write failure (I default to leave-and-report to avoid silently deleting an operator's freshly created worktree).

6. **Worktree creation semantics** (reconciling charter D5 "creates worktree + branch" with kickstarter #5's "path doesn't exist" error case): the CLI is a **creator** - the parent of `--path` must exist and `--path` must **not** already exist; creating over an existing path is the `1` error, not a missing one. The branch is derived as `feat/foreman-line-<parcel>` from `--parcel`, matching lesson #9's convention. *Override options:* (i) an `--emit-only` mode that writes settings into an already-existing worktree (would make "path doesn't exist" the literal error the kickstarter phrased) - not recommended, D5 says create; (ii) an explicit `--branch <name>` override instead of deriving from `--parcel`.

7. **Envelope projection = `deny`/`ask`/`defaultMode`(if declared)/`additionalDirectories`(if declared); `allow` and `network` NOT projected** (decision #7). Rationale: keeps the emitted enforced artifact purely restrictive so no `allow` line in a live settings file is mistaken for the restriction mechanism (D9); `network` is documentation-only (F-L). Deny-wins means including `allow` would change no enforcement. *Override option:* also emit `allow` for registry parity - harmless to enforcement, but blurs the documentation-only line D9 draws.

8. **`PROBE.md` co-located in the package** (`plugins/foreman-line/permission-profiles/PROBE.md`), evidence in the PR body (not a committed tracked artifact). *Override option:* a `docs/`-side runbook; package co-location recommended because the probe is a property of this package's emitter.
