# Rework 2 (FINAL) — GTM-P0A loop-directive accuracy and durability

Both round-2 reviewers returned **PASS**. Your git integrity, amend discipline,
byte identity, and every C/SW restoration survived word-by-word re-diffing. One
reviewer proved by loose-object accounting that no third commit was ever made
and discarded, and that the amend preserved the message rather than retyping it.

**This is the FINAL rework for GTM-P0A.** It is bounded to the nine items below.
Do not improve anything else. After this, the parcel is accepted or held — there
is no round 3, so if you believe an item here is wrong, say so at Step 0 rather
than complying.

Standing constraints apply — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.

## Step 0 — restate and stop

Restate the nine items and the four tripwires, report `git rev-parse HEAD`,
`git status --short --untracked-files=all`, and the four copied blob OIDs, flag
anything you disagree with, then **STOP** for the go-ahead.

## The nine corrections — all in `loop-directive.md` only

**R1 (was M3) — the last dropped operative sentence. Highest value here.** §8
reproduces sentence 1 of the amendment's `agent-preparation-complete` paragraph
and drops sentence 2, its operative definition
(`goal-charter-amendment-r1.md:137–140`): *"It requires all internally preparable
evidence, drafts, owner questionnaires, counsel packets,
security/integration/release packets, and external-action runbooks to be
review-accepted."* Both reviewers found it independently; I reproduced it. Restore
it verbatim alongside the charter clause you already have. Without it a future
coordinator has no stated bar for claiming the intermediate state.

**R2 (was M2) — make the ownership claim survive a `git clean`.** §1 bullets 3–4
and marker (c) rest on coordinator ruling F1, which exists **only** in an
untracked kickstarter in the ambient checkout. One `git clean` destroys it, and a
future session would then read a claim it cannot verify while the committed
`charter.md:5` still says "Primary Codex session." That is the R10 failure mode
this parcel exists to close, reappearing at the ownership layer. Add a
**"Coordinator rulings of record"** subsection inlining, verbatim and attributed:
ruling **F1**'s five mandated points; ruling **F2** (commit messages verbatim, no
`Co-Authored-By` trailer — absence is deliberate); and ruling **F4**
(`discovery.md` ships with known-stale closing prose, deliberately unrepaired
under constraint 8, non-authorizing because it withholds rather than grants).
State that these are reproduced here so the directive is self-supporting if the
kickstarter is lost.

**R3 (was M1) — correct a false claim in an authority block.** §1 asserts element
(b) is "mechanically checkable." It is not: what is verifiable is the *existence*
of commit `57201c8…`; nothing on disk records **which session dispatched the
builder that produced it** (the commit author is the git identity, not a session).
This was my wording in the FR1 ruling and it was wrong. Replace with an accurate
statement: the commit's existence and contents are verifiable; the session
linkage is an assertion of record, not a provable fact; therefore **the
fail-closed rule is what actually protects ownership** — a session that cannot
confirm it is the recorded owner is not the owner and must stop.

**R4 (was I-2) — do not let BLOCKED read as stale.** §4's "treat the queue State
column as accurate only as of GTM-P0A" invites the reading that the **BLOCKED**
markers are stale too, therefore non-binding. State explicitly that the
Depends-on column and the BLOCKED markers are **binding regardless of table
staleness**, and that staleness can only mean a predecessor is *not yet*
accepted — never that a successor is unblocked.

**R5 (was I-4) — my C1 wording implied a grant.** "creates no dispatch authority
**beyond** GTM-P0A through GTM-P0C" read literally implies this document *does*
create authority up to P0C. Reword so the document creates **no dispatch
authority at all**, and the only dispatch authority is GTM-R1's Gate 2 matrix
grant for P0A–P0C, which this file reports rather than confers.

**R6 (was I-3) — make the provenance taxonomy exhaustive.** §1's owner marker and
§4's known-gap statement belong to none of C1's four origins; they are this
document's own derivation. Add that fifth category explicitly and label those two
passages as belonging to it.

**R7 (was I-5) — fix an overstatement.** §3 says "a fetch of **any** ref would
move `origin/main`," which is technically false (`git fetch origin some-branch`
need not). State it accurately: a fetch can update `origin/*` including
`origin/main`, which would unfreeze the pinned base — therefore no remote call of
any kind.

**R8 (was I-6 / D's I-4) — reconcile the pledge with your deliberate tightenings.**
You tightened several restatements in the withholding direction ("separately
shaped", "is **ever** inferred", "**never** equivalent", and "by the decision
owner" appended to SW2). Those are safe and I am keeping them. But they contradict
C1's pledge that "a summary here never narrows or widens it." Correct the pledge
to state the truth: where this directive tightens a ratified phrase it does so
**only in the withholding direction**, it never widens an authority, and the
ratified source controls in any conflict.

**R9 (was D's I-3) — fix a literal inaccuracy.** §4's "appears in the Allowed
Files of **no ratified parcel**" is false — GTM-P0A's Allowed Files include it.
Reword: it appears in the Allowed Files of GTM-P0A only, which is complete; no
pending or future ratified parcel names it, which is why the gap stands.

## Tripwires — unchanged, any breach stops the parcel

1. **Only `loop-directive.md` changes.** These four blob OIDs must be unchanged:
   `b819acd7…`, `da184885…`, `c221bbfb…`, `ea0fdec3…`.
2. **Exactly two commits from the frozen base.** Amend commit 2 with
   `git commit --amend --no-edit`, staging only `loop-directive.md` by explicit
   path. Commit 1 must remain `57201c8be9f1226b5bb14117094894b53f3d4cc2`.
3. **Cumulative diff still exactly the five Allowed Files**, scoped
   `e56c2cbac1a225c0c364add327b944ca696d485e..HEAD`, never `--all`.
4. **Constraint-13 artifacts untouched** — untracked, `67ce5f4b…99027` and
   `ff408a56…73f1`.

No remote operation, no ambient write, nothing outside the five Allowed Files.
Gate 3 and every external action remain withheld.

## Completion claim

Map R1–R9 to resulting text, evidence all four tripwires, and state final HEAD,
commit 1's unchanged SHA, and the new commit 2 SHA. Re-run the
dropped-operative-sentence sweep once more over §8 specifically, since that
section has now yielded two separate drops. Normalize whitespace and strip `**`
before concluding anything is absent — false absences have bitten every role on
this parcel.
