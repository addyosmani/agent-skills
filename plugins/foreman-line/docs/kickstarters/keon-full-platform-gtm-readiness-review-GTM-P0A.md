# Adversarial Review Kickstarter — GTM-P0A

You are an **independent adversarial reviewer** for parcel **GTM-P0A** of the
goal `keon-full-platform-gtm-readiness`. You have zero builder context and you
are not told what the builder claimed. Reach your own verdict from the artifacts.

Standing constraints apply — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`
(reviewer rules 8, 9, 10 especially).

## Absolute boundaries

**You never fix and you never commit.** Do not use Edit or Write. Do not create,
modify, move, rename, or delete any file anywhere. Do not run any mutating git
command — no `add`, `commit`, `stash`, `reset`, `checkout`, `restore`, `clean`,
`rebase`, `merge`, `cherry-pick`, `gc`, or `prune`. Do not run any remote or
network command — no `fetch`, `pull`, `push`, `ls-remote`. Read-only inspection
only. Your permission envelope is directive-enforced here, not mechanically
enforced, so these rules are your real boundary. If you believe something must
change, you write that in your findings — you do not do it.

Another reviewer is reviewing the same parcel in parallel, and the coordinator
is inspecting the same worktree. Assume concurrent readers; never mutate shared
state.

**End your review with a git-detection control** (reviewer rule 10): report
`git status --short --untracked-files=all`, `git rev-parse HEAD`, and the branch
reflog, proving your session left no commit, no staged path, and no new or
modified file.

## What you are reviewing

- **Repository:** `D:/Repos/agent-skills`
- **Worktree under review:** `D:/Repos/agent-skills-worktrees/keon-full-platform-gtm-readiness-20260818`
- **Branch:** `goal/keon-full-platform-gtm-readiness-20260818`
- **Frozen base:** `e56c2cbac1a225c0c364add327b944ca696d485e`
- **Range under review:** `e56c2cbac1a225c0c364add327b944ca696d485e..HEAD` (two commits)

Read first, in this order:

1. The spec — `plugins/foreman-line/docs/specs/active/GTM-P0A-goal-control-durability.md`
   in the worktree. Constraints 1–13 and Acceptance Criteria 1–12 are the
   contract. Note constraint 13: two named control artifacts (the spec itself
   and its `.shaping-result.json`) are *permitted* to remain untracked and must
   be byte-unchanged — they are deliberately excluded from the Allowed Files
   scope and clean-worktree assertions.
2. The coordinator rulings appended to
   `plugins/foreman-line/docs/kickstarters/keon-full-platform-gtm-readiness-build-GTM-P0A.md`.
   Rulings F1 (ownership framing), F2 (verbatim commit messages, **no**
   `Co-Authored-By` trailer — its absence is deliberate, not an omission), and
   F4 (`discovery.md` ships with known-stale prose, unrepaired by design) are
   part of the contract.
3. The committed artifacts in the worktree goal directory.
4. `plugins/foreman-line/docs/COORDINATOR-PATTERN.md` for the authority model.

The ambient checkout `D:/Repos/agent-skills` is read-only source for comparison.
It sits on an unrelated branch with other people's uncommitted work. Read it;
never touch it.

## The five mandated questions

Answer each with evidence, not impression:

1. **Are all four copied artifacts byte-identical to the pinned reviewed
   sources?** Verify independently. Comparing `git hash-object` of the ambient
   source against the committed blob OID is a strong check; SHA-256 of extracted
   blob content against the constraint-6 values is another. Do not accept
   worktree-file hashes alone as proof of what was *committed*.
2. **Is the amendment genuinely alone in the first commit?** Check the commit
   contents, not just the cumulative diff.
3. **Does `loop-directive.md` preserve every child-authority, Gate 3, and
   external hold without inventing dispatch authority?** Read it against the
   charter and GTM-R1 amendment. Hunt specifically for authority the directive
   grants that no ratified document granted.
4. **Does the two-commit range touch exactly the five Allowed Files?** Beware:
   `git log --all` overrides a range argument and will list unrelated branches'
   paths. Scope your checks to `base..HEAD`.
5. **Is there any evidence of a remote operation or ambient-checkout mutation?**
6. **Are the two constraint-13 artifacts still present, untracked, and
   byte-unchanged — neither committed nor edited?** Their Step 0 baseline
   hashes were `67ce5f4b0f473ac7d7a6746dc553aa60bcae1dc7b0e08882920ceaa7eba99027`
   and `ff408a56e35114aec3c8921675f6c788908b8ca833a6285fb009a057fbe173f1`.

## Attack the parcel, don't confirm it

Reviewer rule 9 binds hardest here: this parcel's contract is **prose**. For
each authority statement in `loop-directive.md`, attempt the *naive but literal*
reading — the reading a rushed future coordinator would take at 2am — and show
whether the text excludes it. Confirming the intended reading is present is not
review.

Specific attack surfaces worth your time:

- **Ownership.** The directive claims to be the first ownership block and denies
  any transfer, while `charter.md` and `discovery.md` name a "Primary Codex
  session" as coordinator. Is that reconciliation honest, or does it quietly
  manufacture authority? Would a future reader be misled about who may dispatch?
- **Authority leakage.** Does any sentence, read literally, permit a future
  coordinator to dispatch a W1–W8 parcel, mutate a child control plane, treat a
  local commit as integration, or read `agent-preparation-complete` as
  completion?
- **Queue reproduction.** Are P0B's and P0C's stated output boundaries faithful
  to the GTM-R1 Revision 1 Gate 2 matrix, or has scope drifted in transcription?
- **Hash and state fidelity.** Are the pinned values in the directive's section 3
  actually the values on disk?
- **Silent weakening.** Does any acceptance criterion appear satisfied by an
  artifact that merely *imitates* what the criterion demands?
- **Anything the spec forgot to require** that a future coordinator will need.

## Verdict

Return a structured review:

- **Verdict: PASS or FAIL**, stated plainly and first.
- **Per-question findings** for all six questions above, each with the evidence
  that settles it.
- **Findings table** — severity (Block / High / Medium / Informational), the
  defect, and the exact file/line or command output that proves it.
- **The git-detection control** described above.

Rank findings; do not decide dispositions — the coordinator triages and rules.
Your final text is the return value read by the coordinator, not a human-facing
message. If you find nothing blocking, say so directly; a manufactured finding
is worse than none.

---

# REWORK RE-VERIFICATION ADDENDUM (round 2)

An earlier round of two independent reviews returned PASS with findings. The
coordinator triaged them, dispatched a rework, and **commit 2 was amended** —
its SHA changed. `loop-directive.md` grew from 208 to 350 lines. You are
reviewing the **amended** state. Do not assume the earlier PASS carries over:
the document that earned it no longer exists.

## Pinned baseline facts (verify these; do not take them on trust)

- Frozen base: `e56c2cbac1a225c0c364add327b944ca696d485e`
- Commit 1 must be **unchanged**: `57201c8be9f1226b5bb14117094894b53f3d4cc2`
- Commit 2 was amended from `9c1cd4107825d528a2b5e653e06bba38ec8a9ad8` to a new
  SHA. There must be **exactly two** commits from the base — never three.
- The four copied blob OIDs must be **unchanged** by the rework:
  `charter.md` `b819acd7eb0ec856a53364b728ee466f43601363`;
  `discovery.md` `da18488515c8a9ef6b6a1c8cd10846b912309f94`;
  `goal-charter-amendment-r1.md` `c221bbfb7cd03d05fb48ec9df118396454e63adf`;
  `plan-review-findings.md` `ea0fdec306bd49832b58aa0a8de1d85d64c8a4b1`.
- Constraint-13 artifacts unchanged: `67ce5f4b…eba99027`, `ff408a56…fbe173f1`.

**Only `loop-directive.md` was authorized to change.** Any other difference is a
Block finding.

## What the rework was required to fix

Read the rework directive in full —
`plugins/foreman-line/docs/kickstarters/keon-full-platform-gtm-readiness-build-GTM-P0A-rework.md`
— then verify each item actually landed **as text**, and landed *correctly*:

- **C1** provenance overclaim replaced with an accurate four-way statement.
- **C2** restored: "Removing a selected program, product, service, or external
  action from the completion denominator requires an explicit decision-owner
  scope amendment."
- **C3** recovery anchor: both commit messages verbatim, commit 1's SHA, order,
  and why commit 2's SHA cannot be self-recorded.
- **C4** discriminating owner identity via the commit fingerprint; §1/§10
  reconciled; rival-session stop condition broadened beyond Codex.
- **C5** self-amendment gap **recorded, not granted**. Check hard that it grants
  no one authority.
- **C6** §5 heading now "No W0–W8 authority".
- **C7** remote prohibition absolute, not scoped "against this base".
- **SW1** `publication` restored to the §7 Gate 3 enumeration (it is withheld
  under both §7 and §8).
- **SW2** `required` restored before "independent review evidence".
- **SW3** "Existing KPP-001-A dispatch restrictions remain controlling for its
  track" restored.
- **SW4** "The original ratification remains the authority for unaffected
  decisions" restored.

## Grep warning, earned twice in this parcel

Operative sentences in these documents **wrap across lines** and carry inline
bold markers, so a naive single-line `grep "required independent review"`
returns empty on text that is present. Both the coordinator and the builder hit
this. Normalize whitespace and strip `**` before concluding anything is missing.
A false "absent" here would be a fabricated Block finding.

## Your round-2 mandate

1. Verify the five pinned baseline facts above on disk.
2. Verify C1–C7 and SW1–SW4 each landed, and that each restoration is
   **word-faithful to its ratified source** — re-diff them yourself against
   `charter.md` / `goal-charter-amendment-r1.md`. A restoration that paraphrases
   is still a defect.
3. **Re-run the dropped-operative-sentence sweep independently.** Two rounds
   have now found this defect class repeatedly (F-D, then SW1–SW4). Diff every
   restatement in `loop-directive.md` against its ratified source word by word
   and report any operative sentence still missing or weakened.
4. Confirm the 142 added lines introduced **no new authority** — the rework is
   the most likely place for authority to leak in, because it was written to
   *add* text about authority.
5. Answer the six mandated questions from the main kickstarter against the
   amended state.

Verdict PASS or FAIL, findings table, and the git-detection control as before.

---

# ROUND 3 — FINAL DELTA RE-VERIFICATION

Round 2 reviewed commit 2 as `740ed5c…` and returned PASS with Medium findings.
A final bounded rework (R1–R9) applied those findings. Commit 2 was amended
**twice more**: `740ed5c` → `f3756b5` → `e515bff…`. The current state has been
reviewed by no one. Do not carry forward any earlier PASS.

**Your scope is the delta plus the invariants.** This is deliberately narrower
than rounds 1–2: read `git diff 740ed5cf7b0532d174c3bd4b16dc64cec0bc821a..HEAD`
and judge it, then re-check the invariants below. You do not need to re-derive
the whole parcel from scratch, but you must not assume anything unchanged that
you have not checked.

## Invariants (verify; do not assume)

- Exactly **two** commits from base `e56c2cbac1a225c0c364add327b944ca696d485e`.
- Commit 1 still `57201c8be9f1226b5bb14117094894b53f3d4cc2`.
- Four copied blob OIDs unchanged: `b819acd7…`, `da184885…`, `c221bbfb…`,
  `ea0fdec3…`.
- Commit 2's message byte-exact, empty body, no trailer.
- Cumulative diff still exactly the five Allowed Files.
- Constraint-13 artifacts untracked and at `67ce5f4b…99027`, `ff408a56…73f1`.
- `origin/main` still at the frozen base; no upstream; no remote operation.
- `f3756b5` is a superseded, unreferenced amend — confirm no third commit is
  reachable from any ref.

## What R1–R9 were required to do

R1 restore the `agent-preparation-complete` definition sentence into §8
(verbatim, including terminal punctuation — a punctuation slip forced the second
amend). R2 inline coordinator rulings F1, F2, F4 verbatim so the directive
survives loss of the untracked kickstarter. R3 replace the false "mechanically
checkable" claim with an accurate verifiable/not-verifiable split. R4 make
BLOCKED binding regardless of table staleness. R5 remove the implied grant
("no dispatch authority **at all**"; the file reports GTM-R1's grant, never
confers it). R6 add a fifth provenance category for the document's own
derivation. R7 correct the fetch overstatement. R8 correct the pledge to admit
withholding-direction tightenings. R9 fix "no ratified parcel" → GTM-P0A only,
which is complete.

## The three questions that decide this round

1. **Did R1–R9 each land, correctly and word-faithfully?** R1's sentence must
   match `goal-charter-amendment-r1.md:137–140` including where the period
   falls. R2's inlined F1/F2/F4 must be verbatim against the build kickstarter's
   rulings section — a "verbatim record" that was quietly adjusted is not a
   record. Note F1's own bullet 5 says "Codex" while §1 broadens it to any
   harness; that divergence is deliberate and attributed to ruling C4.
2. **Did this rework introduce any NEW defect or new authority?** Every previous
   rework on this parcel introduced small new inaccuracies while fixing larger
   ones — that is the base rate you are testing against. Scan every added
   sentence for authority-granting constructions and for claims that overstate
   what the document can prove.
3. **Does R2 overclaim?** The builder was explicitly ruled that inlining makes
   the rulings *recorded and attributed, not provable* — a future session with a
   lost kickstarter still cannot verify F1 was ever ruled. Confirm the text says
   this plainly and does not imply inlining makes the ownership claim verifiable.
   An artifact that overstates its own durability is the failure mode here.

Also re-run the dropped-operative-sentence sweep over §8 one last time — that
section has produced two separate drops across three rounds.

Verdict PASS or FAIL first, findings table, and the git-detection control. Heed
the grep warning above: normalize whitespace and strip `**` before declaring
anything absent. A fabricated Block finding at this stage is worse than none.
