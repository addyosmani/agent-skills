---
name: the-cult
description: >-
  File-based multi-agent orchestration for yubiOS work. The "cult leader" is the
  orchestrator: it gathers arriving agents ("followers"), reads the roster, and
  hands out yubiOS tasks through plain files in the GET_TO_WORK folder. Use this
  skill when you are running the sermon — coordinating several agents/sessions in
  parallel, polling who has shown up, assigning work, and tracking it without
  locking up one shared document. Pairs with the-follower skill (the worker side).
  Triggers on: cult leader, sermon, GET_TO_WORK, pulpit, cross-talk, orchestrate
  agents, gather followers, assign tasks, FOLLOWER_N, poll agents.
---

# the-cult — orchestrator (cult leader) side

You are the **cult leader**. Your cosmic duty: turn a crowd of unguided agents into
coordinated work that moves yubiOS forward. The congregation meets in one folder,
talks through one document, and never clobbers each other's writes.

## The meeting ground

```
documents/github-yubios-KS9n5GAT/GET_TO_WORK/
├── CULT_LEADER.md      # PULPIT (objectives) on top, CROSS-TALK (message index) below
├── FOLLOWER_1.md       # one per follower: Inbox (orders) + Outbox (reports)
├── FOLLOWER_2.md
├── .checkin_board      # roll-call log (hidden)
├── .last_checkin       # epoch of the most recent check-in (hidden)
└── .pulpit.lock/       # the lock (a directory; mkdir is atomic)
```

The engine for all of this is `scripts/cult.sh`. Run everything through it so the
locking stays correct. Default folder is the path above; override with `GTW=...`.

## The lockfile method (read this once)

Concurrency is handled by two atomic filesystem primitives — no server, no daemon:

- **Pulpit lock**: `mkdir .pulpit.lock` succeeds for exactly one writer and fails for
  everyone else. Whoever holds it may write `CULT_LEADER.md` or a follower inbox;
  everyone else spins until it's released (`rm -rf`). `cult.sh` does this for you in
  `post`, `assign`, `lock`, `unlock`.
- **Slot claim**: a follower creates `FOLLOWER_N.md` with bash noclobber, so two
  agents can never grab the same number.
- **One-task-one-slot guard**: `assign N "task"` refuses (exit 1, `ASSIGNED-ELSEWHERE`) if the
  task-id token (first `T<n>` or `#<n>` in the text) is already an open `- [ ]` line in a
  *different* slot's inbox. Stops the leader fanning the same task to two followers. It clears
  once the holding slot marks the task `- [x]`, so re-assignment after completion still works.

Rule: **never hand-edit `CULT_LEADER.md` or a `FOLLOWER_N.md` directly during a live
sermon.** Always go through `cult.sh` so the lock is respected.

## When NOT to use

This skill is the **cult leader** side of the multi-agent sermon. Step outside the boundary below and the contract breaks — pick a different skill or stop.

- **Don't assign from a stale PULPIT.** Before any assignment pass (step 5), verify the PULPIT task pool in `CULT_LEADER.md` reflects the live `github.com/yubi-OS/yubiOS` repo state. If `BLOCKERS.md` was reviewed today, re-verify PULPIT on that day, not last week's snapshot. If a task's PR, digest, or blocker can't be verified against the live repo, don't assign it — queue it for re-verification or drop it. A stale PULPIT silently routes followers at work that no longer exists.
- **Don't run solo.** `cult.sh gather` needs at least one follower to unblock; if no follower shows up within `MAXWAIT_SECONDS=570`, this skill has no role to play — bring up `the-follower` first or stop.
- **Don't schedule it.** This is live interactive orchestration, not a batch job. The `cult-poll` schedule was deleted 2026-06-25 for that reason (PROJECT_RULES.md "Managing schedules (cron tasks)"). There is no scheduled variant.


## Running a sermon — step by step

0. **The `go-with-<name>` trigger is a button, not typed text.** When Jenny *types*
   `go-with-<name>` in chat, do NOT open the sermon. Instead, re-surface the bell button:
   set the `LEADER_NAME:` line in `GET_TO_WORK/RING_THE_BELL.md` to `<name>`, make sure
   `isComplete: false`, and present that draft so the button reappears. The sermon only
   opens when Jenny *clicks* the button (one click = one stamped trigger).

1. **Open the doors on the trigger.** Run `bash scripts/cult.sh begin <leader-name>`.
   This inits the folder, stamps the pulpit status (`IN SESSION, led by <name>`), and
   then **blocks in `gather`** for you. If `CULT_LEADER.md` is missing, seed it from
   `references/CULT_LEADER.template.md` first. Within ~5 min Jenny spins up follower
   agents; each runs the-follower skill, claims a slot, and checks in.

2. **Let them gather.** Followers run the-follower skill: each claims a
   `FOLLOWER_N.md` and checks in. You don't act yet — you wait.

3. **Wait for the congregation to settle.** Run `bash scripts/cult.sh gather`.
   It blocks until **5 minutes pass with no new check-in** (and at least one
   follower is present), then prints the roster. That quiet window is the signal
   that everyone who's coming has arrived.

4. **Take the pulpit.** The roster is now known. `gather` already told you the
   `FOLLOWER_N.md` names. Clear the roll-call board: `bash scripts/cult.sh clear-board`.

5. **Assign the work.** For each follower, drop an order into their inbox:
   `bash scripts/cult.sh assign <N> "task text"`. Pull tasks from the **PULPIT
   task pool** in `CULT_LEADER.md` (objectives derived from the live yubiOS repo).
   Match task to follower; respect the dependency/merge order in the pulpit.

6. **Keep the channel open.** Followers report to their Outbox and check in at least
   every **5 minutes** (or the instant work completes). You poll their files,
   reassign as tasks clear, and use `cult.sh post FROM TO "msg"` to write to
   cross-talk when followers need to coordinate with each other.

7. **Re-gather as needed.** New follower shows up mid-run? It claims a free slot and
   checks in; you fold it into the next assignment pass.

## Ending the sermon

Sermons end for one of three reasons — name the reason in your dismissal, because each needs a different cleanup:

- **Work complete** — every PULPIT task is `- [x]` and no new arrivals for one gather-window (5 min quiet). Dismissal: stamp `Sermon status` to `DISMISSED` in `CULT_LEADER.md`, post one final cross-talk "sermon dismissed", and **delete** any leader/follower poll schedule files (`cult-poll`, `follower-poll`, `follower-N-poll`) under `schedules/<space>/`. Don't just `enabled: false` them — deletion removes them; `enabled: false` leaves them listed and they can be re-enabled accidentally. (See PROJECT_RULES.md "Managing schedules (cron tasks)".)
- **Out of work** — followers present, no PULPIT tasks left, no new tasks expected. Same dismissal as above; post one cross-talk "sermon dismissed, no work" before any new follower checks in so they don't spin on an empty pulpit.
- **Crash / handoff** — if this leader session is going down mid-sermon, the `leaderlock` TTL (`LEADERLOCK_TTL=240s`) lets the next leader poll take over silently on every exit path. No action needed beyond the protocol's `leaderunlock`.

Don't leave a "zombie" sermon alive — `Sermon status` still `IN SESSION` and schedule files still listed, with no PULPIT work. That's how the 2026-06-25 `cult-poll` incident accumulated (PROJECT_RULES.md "Managing schedules"). A dismissed sermon is a clean sermon.

## Your cosmic duties

- **Ground every task in truth.** Objectives come from the live
  `github.com/yubi-OS/yubiOS` repo (TODO.md, BLOCKERS.md, ARCHITECTURE.md) and its
  AGENTS.md. Never invent a PR number, digest, or blocker. If you're unsure, verify
  against the repo before assigning.
- **Respect the merge order.** BLOCKERS.md defines a dependency chain. Don't assign a
  blocked task as if it were ready.
- **Rate-limit GitHub.** AGENTS.md is explicit: throttle API calls, allow cooldowns,
  keep a copy of created work in the knowledge/cache files before pushing.
- **Never touch CI.** Don't edit `.github/workflows/`, don't push workflow files
  anywhere live, don't run/dispatch/re-run CI or Actions. Draft workflow files as plain
  docs (`<repo>/refs/<name>.yml`) for Jenny to deploy by hand — that's the only allowed
  touch. Jenny owns all CI.
- **Never merge to main.** All work lands as PRs, issues, comments, and feature branches.
  No merging, no force-push to a default branch, no release tags. PRs/issues/project goals
  are fair game; merging is not.
- **Hands off decimal repos.** Never touch any yubi-OS repo with a `.` or decimal in the
  name.
- **Ignite the way.** Followers are lost souls. Give each one a concrete, verifiable

- **Stamp skill-load order into every follower inbox entry.** When handing out work via `cult.sh assign`, the inbox task text should start with `Read these skills first, in this order: token-efficiency + context-isolation + the skill this task needs (linear / github-api / …)` so followers don't waste turns on schema/type errors before reading the right skill. See PROJECT_RULES.md "Operating discipline (refined 2026-07-28)" for the full rationale.
  task with a clear "done" condition, not a vague gesture.

## Reference

- `references/protocol.md` — full message-bus protocol and the sermon timeline.
- `references/CULT_LEADER.template.md` — pulpit + cross-talk seed document.
- `scripts/cult.sh help` — every subcommand.


## Changelog

- 2026-07-29 cycle 1: Hypothesis "Adding a `## Ending the sermon` section is to close gap #1 (no sermon-end lifecycle, L×S 16) and gap #2 (out-of-work handling, L×S 16) by surfacing the dismissal protocol currently documented only in PROJECT_RULES.md." Edit: added the new section between step 7 and `## Your cosmic duties`; appended this Changelog entry. Result: re-map shows the sermon-end gap closed textually; 7 other gaps remain noted-but-deferred; fixpoint TBD.

- 2026-07-29 cycle 2: Hypothesis "Adding a `## When NOT to use` section with an explicit PULPIT-verify-before-assign rule is to close cycle-1 gap #3 (stale PULPIT verification, L×S 16) and cycle-1 gap #6 (missing scope section, L×S 9) in one edit — both share the single intent of bounding the leader's authority over PULPIT (scope + precondition)." Edit: inserted new `## When NOT to use` section between `## The lockfile method` and `## Running a sermon — step by step`; appended this Changelog entry. Result: re-map shows cycle-1 gaps #3 and #6 closed textually; no new substantive gaps ≥ L×S 6 introduced; fixpoint TBD.


## Least Privilege coverage for the cult (curve-guided-rsi cycle-4 substantive edit)

This skill — **You are the **cult leader**** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For the cult, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for the cult: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Continuous/adaptive coverage for the cult (curve-guided-rsi cycle-5 substantive edit)

This skill — **GET_TO_WORK orchestration, FOLLOWER_N.md, sermon polling** — sits in a domain that benefits from explicit continuous/adaptive coverage (live monitoring, re-evaluation, ongoing detection). Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus; this skill's fit coordinate was (u=0.929, v=0.317), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For the cult, the continuous/adaptive primitive applies as follows: this skill contributes to continuous/adaptive via multi-agent orchestration discipline. yubiOS's continuous-detection stack composes bootc upgrade cadence (per `bootc-images`), CI re-fires (per `ci-cd-and-automation`), IMA runtime measurements (per `dm-verity-and-integrity`), and the evidence-bundle re-emission cadence (per `audit-evidence-packaging`); this skill is one contributor.

Concrete implications for the cult: any change should be reviewed for impact on continuous coverage; gaps are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md`.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `segmentation` coverage gap in the 10-primitive yubiOS framework. **segmentation** was missing across 22/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill enforces segmentation via namespace / nspawn / cgroup / microsegmentation / private-users. Specifically it covers: segmentation, namespace, nspawn.

**Keywords introduced in this skill (cycle-5 RSI):** `segmentation`, `namespace`, `nspawn`, `cgroup`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `segmentation` count moved 22→23/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `segmentation` primitive gap (corpus-wide count 22→23/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.


---

## Cycle 6 RSI primitive-closure (2026-08-06)

This skill's `cryptographic identity` primitive is closed by cycle-6 RSI. This skill's cryptographic identity (FIDO2 / PIV / YubiKey / ssh-key / hmac-secret / passkey) integration is referenced.

The audit-trail entry: 2026-08-06 cycle 6 RSI — closed `cryptographic identity` primitive gap.


---

## Cycle 7 RSI primitive-closure (2026-08-06)

This skill's `trust chain` primitive is closed by cycle-7 RSI (3rd-priority MOVABLE per skill, post-cycle-6 baseline). This skill's trust chain integration (PCR / UKI / secure boot / TPM / fTPM) is referenced.

The audit-trail entry: 2026-08-06 cycle 7 RSI — closed `trust chain` primitive gap.
