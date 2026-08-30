# Stage-F Closure Record — GTM-P0A

**Parcel:** GTM-P0A (goal control-plane durability)
**Goal:** `keon-full-platform-gtm-readiness`
**Closed:** 2026-08-18 by the Claude Code coordinator session
**State:** **review-accepted / verified-local — NOT integrated.** Gate 3 withheld.

> This record is **untracked** in an ambient checkout on a foreign branch and is
> destructible by `git clean`. That is the same R10 exposure GTM-P0A was created
> to close, one layer up. The future ratified amendment parcel (see Open Items)
> should commit this paper trail.

## Final verified state

| Item | Value |
|---|---|
| Repository | `D:/Repos/agent-skills` |
| Worktree | `D:/Repos/agent-skills-worktrees/keon-full-platform-gtm-readiness-20260818` |
| Branch | `goal/keon-full-platform-gtm-readiness-20260818` |
| Frozen base | `e56c2cbac1a225c0c364add327b944ca696d485e` |
| Commit 1 | `57201c8be9f1226b5bb14117094894b53f3d4cc2` — amendment alone |
| Commit 2 (final) | `e515bff3cec142719dbf6ee9177cde541660e306` |
| Superseded amends | `9c1cd41`, `740ed5c`, `f3756b5` — unreferenced, not on any ref |
| Upstream | none configured; never pushed |

Coordinator-verified at closure: exactly 2 commits from base; four copied blob
OIDs identical to their ambient sources (`b819acd7`, `da184885`, `c221bbfb`,
`ea0fdec3`); cumulative diff exactly the five Allowed Files; `git diff --check`
clean; both commit messages byte-exact with empty bodies and no trailer;
constraint-13 artifacts still untracked at `67ce5f4b…99027` / `ff408a56…73f1`;
`origin/main` still at the frozen base.

## Verification chain

| Stage | Result |
|---|---|
| Coordinator lint (pre-dispatch) | 2 blocking spec defects found and corrected; spec promoted `draft`→`active` |
| Step 0 gate | PASS, 5 flags ruled (F1–F5) |
| Build | 2 local commits |
| Closure check 1 | PASS |
| Adversarial review round 1 (A, B) | PASS + PASS; findings triaged |
| Rework 1 (C1–C7) + builder sweep (SW1–SW4) | applied; 4 tripwires green |
| Adversarial review round 2 (C, D) | PASS + PASS; M1/M2/M3 triaged |
| Rework 2 (R1–R9) | applied; 4 tripwires green |
| Adversarial review round 3 (E, F) | PASS + PASS; residuals informational |

Six independent adversarial reviews across three rounds; the final state was
cleared by two fresh reviewers who had not seen any earlier version.

## Acceptance criteria

AC1–AC10 and AC12 verified on disk by the coordinator. AC11 satisfied — two
independent reviewers returned PASS on the final state (`architecture/risk`
routing requires two).

## Open items — carry to the next parcel

The §4 queue-maintenance gap makes a decision-owner-ratified amendment parcel
**mandatory** before the queue can advance. These ride in its scope:

1. **§4 queue-maintenance gap (blocking P0B in practice).** No ratified parcel
   names `loop-directive.md` in its Allowed Files, so P0A's acceptance cannot be
   recorded, the State column cannot advance, and no ownership transfer can be
   written. Requires a ratified parcel naming this file.
2. **Ruling C4 not inlined.** F1/F2/F4 were inlined by R2, but ruling C4 — which
   authorizes §1 fact 5's broadening beyond "Codex" — still lives only in an
   untracked kickstarter. Residual asymmetry against the failure R2 closed.
3. **`discovery.md` stale closing prose** ("…remain unauthorized while that
   amendment is open"), shipped byte-identical under constraint 8 / ruling F4.
   Non-authorizing (it withholds), but wrong now that GTM-R1 is ratified.
4. **Six full-goal-completion requirements** from GTM-R1 are cited but not
   reproduced in the directive.
5. **Reviewer E findings 1–2 / F informational items**: §3's "checkable" wording
   is looser than §1's "recorded and attributed, not provable"; provenance
   category (e) says "two passages" where the rework added roughly six.
6. **Commit the paper trail** — this record, the build/rework/review
   kickstarters, and the coordinator rulings are all untracked and destructible.

## Coordinator action item for the decision owner

**Disable VS Code autofetch for this repository.** Both round-1 reviewers
independently detected a real `git fetch` inside the parcel worktree gitdir at
14:27:56; the coordinator reproduced it (ten worktree `FETCH_HEAD` files written
within ~1.1s, including worktrees dormant since July — an agent cannot do that).
It moved nothing: `origin/main` never left the frozen base and no objects
arrived. But the pinned base survived **only because `main` had no new upstream
commits**. That is luck, not control, and P0B/P0C rely on the same pin.

## Lessons (candidates for `docs/transcripts/defects_lessons.md`)

1. **A parcel's own spec and shaping-result, living untracked in its worktree,
   will false-trip a "clean worktree" Step 0 assertion.** Name them as permitted
   pre-existing untracked artifacts, exclude them from the scope and cleanliness
   assertions, and turn their byte-unchanged survival into an acceptance check.
   Caught at coordinator lint; would have hard-stopped the builder at Step 0.
2. **A shaping session can understate its own routing class's review depth.** The
   spec declared `routing_class: architecture/risk` but required *one* reviewer;
   canon mandates two. Diff a spec's review requirement against its declared
   routing class at lint time.
3. **Naive single-line `grep` produces false absences on wrapped, bold-marked
   prose.** It bit every role on this parcel — builder, coordinator, and
   reviewers — and a false absence would have sent a builder to "restore" text
   already present. Normalize whitespace and strip `**` before declaring
   anything missing.
4. **PowerShell parses `$var..HEAD` as its range operator**, silently returning
   `0` for `git rev-list --count $base..HEAD`. Quote the whole revision range
   (`"$base..HEAD"`). A coordinator trusting that output would have declared a
   healthy parcel's commits missing.
5. **`git log --all` overrides a range argument**, listing unrelated branches'
   paths and defeating an exact-scope check. Always scope to `base..HEAD` and
   never combine with `--all`.
6. **Restating a ratified source drops operative sentences.** Six separate drops
   across three rounds (F-D, SW1–SW4, M3), two of them in one section. Prose
   restatement is not a safe operation: diff every restatement against its source
   word by word, and re-sweep any section that has already yielded one drop.
7. **Every rework introduces new defects while fixing old ones** — this parcel's
   base rate was three consecutive times. Never accept a reworked artifact on the
   strength of the review that prompted the rework; re-verify the state that
   actually ships.
8. **Loose-object accounting proves negatives that commands cannot.** Counting
   objects written in a window (2 commits + 5 blobs + 12 trees = 19) proved no
   path outside Allowed Files was ever *transiently* staged, since `git add`
   writes a blob even when the staging is later discarded.
9. **Inlining a ruling makes it recorded and attributed, never provable.** Say so
   in the artifact. An authority document that overstates its own durability is
   worse than one that names its limit, because the overstatement is what a
   future coordinator will rely on.
