# Rework Kickstarter — GTM-P0A (loop-directive corrections)

You built GTM-P0A. Two independent adversarial reviewers both returned **PASS**;
your git evidence, byte identity, commit composition, and boundary discipline
all survived scrutiny intact. This rework corrects **content defects in
`loop-directive.md` only** — the one artifact you authored.

Standing constraints apply — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.

## Step 0 — restate and stop

1. Re-read your spec and `loop-directive.md` as committed.
2. Restate the seven corrections below, the sweep mandate, and the four
   tripwires.
3. Report current state: `git rev-parse HEAD`, `git status --short
   --untracked-files=all`, and the four copied blob OIDs.
4. Flag anything you believe is wrong in these rulings rather than silently
   complying.
5. **STOP** for the coordinator's go-ahead.

## The findings are a floor, not a ceiling

Fix **every** instance of each defect class below, not only the lines cited.
Reviewers found examples; you own the sweep. If a correction reveals a further
instance of the same class anywhere in the directive, fix that too and report it.

## Corrections

**C1 — Provenance overclaim (lines 12–13), the most important fix.** The
document asserts "Every statement below traces to the ratified charter or the
GTM-R1 amendment; this document creates no new authority." That is false and
self-contradicting: §1 bullets 3–4 (owner identity, charter-line supersession)
trace to coordinator ruling F1; §3's branch/worktree/base trace to the GTM-P0A
spec; §4's two-review requirement self-cites COORDINATOR-PATTERN at line 103;
§10 traces to the foreman-line loop pattern. Replace with an accurate provenance
statement that distinguishes: (a) content reproduced from the ratified charter
or GTM-R1; (b) operational state from the GTM-P0A spec; (c) ownership framing
from coordinator ruling F1, and process rules from COORDINATOR-PATTERN. Keep the
true and load-bearing half: this document **creates no dispatch authority beyond
GTM-P0A–P0C and changes no ratified decision, gate, scope, or exit criterion.**

**C2 — Dropped operative sentence in §8.** You reproduced the amendment's
exit-criterion paragraph but omitted its operative rule
(`goal-charter-amendment-r1.md:163–165`): *"Removing a selected program,
product, service, or external action from the completion denominator requires an
explicit decision-owner scope amendment."* Without it the naive reading is "a
coordinator-announced scope trim is fine." Restore the sentence. Then **diff
every restatement in this directive against its ratified source word by word**
and restore every other operative sentence you dropped — this defect class is
the reason the rule exists.

**C3 — Recovery anchor is not self-sufficient.** §10 requires a fresh session to
verify "both local commits, their exact messages, and their order," but the
directive records neither the messages nor any SHA. Record in §3 or §10: both
commit messages **verbatim**; commit 1's SHA `57201c8be9f1226b5bb14117094894b53f3d4cc2`;
the commit order; and the explicit note that commit 2's SHA cannot be recorded
inside commit 2 and must be read from `git log`/the branch reflog. State that if
the untracked spec is gone, this directive is the surviving record.

**C4 — Owner identity is not discriminating.** §1 identifies the owner as tool
name + date + permission mode, which any future Claude Code bypass session
literally satisfies. Add a discriminating marker, and reconcile §1 with §10: a
fresh session **inventories and reports; it never silently assumes ownership**,
and inability to confirm it is the recorded owner is itself the ownership
ambiguity stop condition. Broaden §1 bullet 5 beyond "Codex" to **any** rival
coordinator session of any harness.

**C5 — No self-amendment authority (document the gap; do not invent
authority).** The ratified Gate 2 matrix scopes GTM-P0B and GTM-P0C to four
named files each, and `loop-directive.md` is in neither. So no currently
ratified parcel may advance §4's State column or record an ownership transfer.
State this plainly as a **known open gap**: updating this directive — including
advancing queue state or recording a transfer — requires a decision-owner-
ratified parcel naming this file in its Allowed Files. Do **not** grant that
authority to anyone; record that it does not yet exist.

**C6 — §5 heading mismatch.** Heading reads "No W1–W8 authority" while the body
correctly reads "W0–W8". Make the heading "No W0–W8 authority". (This came from
the build kickstarter's wording; the body is right.)

**C7 — §3 remote prohibition is scoped too narrowly.** It reads "No fetch, pull,
rebase, or other remote call is authorized **against this base**," which a
literal reader could read as permitting a fetch of other refs — which would move
`origin/main` and unfreeze the base. Match spec constraint 4: no remote call at
all, and note that a fetch moving `origin/main` would unfreeze the pinned base.

## Tripwires — any breach stops the parcel

1. **Only `loop-directive.md` changes.** These four blob OIDs must be unchanged
   at the end: `charter.md` `b819acd7…`, `discovery.md` `da184885…`,
   `goal-charter-amendment-r1.md` `c221bbfb…`, `plan-review-findings.md`
   `ea0fdec3…`. Verify with `git rev-parse HEAD:<path>`.
2. **Exactly two commits from the frozen base at the end** — not three. Amend
   commit 2 with `git commit --amend --no-edit` after staging only
   `loop-directive.md` by explicit path. `--no-edit` preserves the message
   byte-exactly; do not retype it. Commit 1 must still be
   `57201c8be9f1226b5bb14117094894b53f3d4cc2`.
3. **Cumulative diff is still exactly the five Allowed Files.** Scope checks to
   `e56c2cbac1a225c0c364add327b944ca696d485e..HEAD`; never use `--all`, which
   overrides the range.
4. **Constraint-13 artifacts untouched** — still untracked, still
   `67ce5f4b…99027` and `ff408a56…73f1`.

Unchanged hard boundaries: no remote operation of any kind, no ambient-checkout
write, nothing outside the five Allowed Files, no P0B/P0C artifact. Gate 3 and
every external action remain withheld; your commits are Gate 2 return evidence
only.

## Completion claim

Map each of C1–C7 to the exact resulting text, report the sweep's additional
findings, and evidence all four tripwires. State the final HEAD, commit 1's
unchanged SHA, and the new commit 2 SHA. A claim missing the tripwire evidence
is presumptively empty. Do not accept your own work — both reviewers re-verify.
