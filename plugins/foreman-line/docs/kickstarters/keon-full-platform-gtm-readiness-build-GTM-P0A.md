# Builder Kickstarter — GTM-P0A (goal control-plane durability)

You are the Builder for parcel **GTM-P0A** of the goal
`keon-full-platform-gtm-readiness`, Stage C of the Foreman Line.

Standing constraints apply — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.

## Where you work

- **Repository:** `D:/Repos/agent-skills`
- **Worktree (yours):** `D:/Repos/agent-skills-worktrees/keon-full-platform-gtm-readiness-20260818`
- **Branch:** `goal/keon-full-platform-gtm-readiness-20260818`
- **Frozen base:** `e56c2cbac1a225c0c364add327b944ca696d485e`

The ambient checkout `D:/Repos/agent-skills` is **read-only source**. It sits on
an unrelated branch and holds uncommitted work belonging to other people. Read
from it; never edit, stage, commit, clean, stash, or move anything in it.

**Permission envelope note (read it, do not act on it):** your spec declares
`permission_profile: builder-architecture`. You are dispatched as a subagent, so
you inherit the coordinator session's already-loaded settings rather than a
worktree-local envelope. The profile is therefore **directive-enforced for this
parcel, not mechanically enforced**. That makes the scope rules below your actual
boundary. Treat them as hard.

## Why this parcel exists

The four ratified control artifacts for this goal currently exist **only as
untracked files inside an ambient checkout sitting on a foreign branch**. The
plan-level adversarial review flagged this as finding R10 (Block). One `git
clean` destroys the ratified charter, its corrective amendment, and the review
record. Your job is to make that state durable and to leave behind one loop
directive so any future coordinator has a single queue, authority boundary, and
recovery point.

You change no product, application, patent, creative, Linear, or external state.

## Step 0 — restate and stop

Before any mutation:

1. Read `plugins/foreman-line/docs/specs/active/GTM-P0A-goal-control-durability.md`
   in full. It is your complete spec, `status: active`, coordinator-linted and
   promoted. Constraints 1–13 and Acceptance Criteria 1–12 bind you.
2. Read, from the ambient checkout, all four of the goal's ratified control
   artifacts: `charter.md`, `discovery.md`, `goal-charter-amendment-r1.md`
   (GTM-R1 controls wherever it conflicts with the charter), and
   `plan-review-findings.md`. All four are pinned by constraint 6 and all four
   are Allowed Files.
3. Read `plugins/foreman-line/docs/SPEC-CONVENTION.md` §2–§4 and
   `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`.
4. Record and report, as literal command output, your Step 0 evidence:
   - `git rev-parse --abbrev-ref HEAD` and `git rev-parse HEAD`
   - `git status --short` — the untracked set must equal **exactly** the two
     permitted control artifacts of spec constraint 13 and nothing else
   - proof that `plugins/foreman-line/docs/goals/keon-full-platform-gtm-readiness/`
     does **not** exist in the worktree
   - SHA-256 of each of the four ambient source artifacts, compared against the
     four pinned values in spec constraint 6
5. Restate in your own words: the five Allowed Files; the two-commit order and
   their exact messages; the byte-identity requirement; constraint 13's
   never-touch artifacts; and every item in Out of Scope.
6. Flag any ambiguity. Do not silently resolve anything the spec leaves open.
7. **STOP.** Wait for the coordinator's explicit go-ahead. Any Step 0 mismatch —
   branch, HEAD, untracked set, destination-directory presence, or a single hash
   byte — stops the parcel and returns to the coordinator. Do not "fix" a
   mismatch.

## After the go-ahead

Copy the four artifacts byte-for-byte into the same repo-relative path inside
your worktree. Do not paraphrase, reflow, normalize line endings, or repair
prose — including prose you believe is wrong. Byte identity is the deliverable.

Author `loop-directive.md` as the only new substantive artifact, modeled on
`plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-loop.md`. It
must record, each traceable to the charter or GTM-R1 amendment:

1. **Ownership block** — the current goal owner is the coordinator session that
   dispatched you (Claude Code, bypass-permissions, `/goal resume`, 2026-08-18).
   One goal, one coordinator; transfers only at parcel boundaries via this
   block; if ownership is ambiguous, stop and report, never assume.
2. **Ratification state** — GTM-R1 ratified 2026-08-18 by Clint Morgan; two
   fresh follow-up reviewers returned PASS; Gate 1 closed.
3. **Pinned state** — branch, worktree, frozen base, and the four source
   SHA-256 values.
4. **Queue in strict order** — `GTM-P0A` (current) → `GTM-P0B` (blocked on
   independent P0A acceptance) → `GTM-P0C` (blocked on independent P0B
   acceptance), with each parcel's exact output boundary from the amendment's
   Revision 1 Gate 2 matrix.
5. **No W1–W8 authority.** Waves are coordination containers and are never
   directly dispatchable. Every post-P0 child needs its own shaping and separate
   ratification.
6. **Child-authority firewalls** — `keon-proof-led-portfolio-priority` /
   KPP-001-A / KEO-59, `provisional-patent-readiness`, and
   `keon-creative-foundation-v1` remain exclusively child-owned and read-only to
   this umbrella. Read-only status receipts in; no dispatch, amendment, closure,
   or mutation out. No ownership transfer is ever inferred.
7. **Gate 3 hold** — withheld. No cherry-pick, integration into any target
   branch, push, PR, merge, release, or deployment.
8. **External-action hold** — withheld. No Linear mutation, filing, submission,
   outreach, publication, counsel acceptance, payment, production deployment, or
   customer-data handling.
9. **Stop conditions** — carry the charter's stop-condition list.
10. **Crash-recovery rule** — a fresh session must first inventory the spec, the
    worktree, branch, HEAD, the five Allowed Files, both local commits, and any
    unclaimed partial state before continuing. Work without a completion claim is
    UNCLAIMED; disk state is never accepted as done.

Then make exactly two local commits, in order, with these exact messages:

1. `docs(gtm): GTM-R1 charter amendment (coordinator-ratified)` — containing
   `goal-charter-amendment-r1.md` and nothing else.
2. `docs(gtm): pin full-platform GTM control plane` — containing `charter.md`,
   `discovery.md`, `plan-review-findings.md`, and `loop-directive.md`.

Stage only explicit Allowed File paths. `git add -A` and any broad staging are
forbidden. Never stage the two constraint-13 artifacts.

## Hard boundaries

No fetch, pull, rebase, push, PR, merge, cherry-pick, or any other remote
operation. No network. No edit to the ambient checkout. No file outside the five
Allowed Files. No creation of any P0B/P0C artifact (`coverage-manifest.yaml`,
source-precedence, status-model, crosswalk, child-status, founder, or counsel
contracts). No shaping, dispatching, or accepting of any other parcel.

Your local commits are **Gate 2 return evidence only**.

## Completion claim

Report a claim that maps **each of the spec's 12 Acceptance Criteria** to
concrete evidence — literal command output, file path, or exact hash. It must
include the deterministic report of AC10: frozen base, both exact commit SHAs,
each committed file's hash, the ordered commit-to-file mapping, final HEAD,
`git status --short`, and explicit confirmation that no remote operation
occurred. A claim that does not map every AC to evidence, or that omits the
deterministic report, is presumptively empty and will be rejected without
further inspection.

Do not merge, push, open a PR, or accept your own work. Return the claim and
branch state to the coordinator, who runs the closure check against disk, the
deterministic pass, and two independent adversarial reviews.

---

# Coordinator rulings on the Step 0 gate (2026-08-18)

Step 0 returned PASS. The coordinator independently re-verified branch, HEAD,
the untracked set, the absence of the destination directory, and both
constraint-13 hashes on disk before ruling. Reviewers: these rulings are part of
the parcel contract. They are recorded here, not in the spec, because the spec
file is a constraint-13 artifact whose bytes must not change mid-parcel.

**F1 — ownership block. RULING: option (a), with the exact framing below.**
`charter.md:5` and `discovery.md:5` both name a "Primary Codex session
designated by Clint Morgan, subject to explicit ratification / subject to
Gate 1." That is a pre-loop designation of intent, not a live ownership record:
no ownership block exists anywhere for this goal, because `loop-directive.md`
has never existed. There is therefore no prior owner and **no transfer to
record** — inventing one would fabricate history, which is exactly what the
ownership rule forbids. `loop-directive.md` must state, in the ownership block:

- this is the **first** ownership block for this goal, and no prior ownership
  block existed;
- **no ownership transfer is claimed, recorded, or inferred**;
- the current owner is the Claude Code coordinator session designated by the
  decision owner's explicit `/goal resume` instruction on 2026-08-18;
- this block supersedes the charter/discovery coordinator-designation line for
  **operational ownership only**, and changes no ratified decision, gate, or
  scope;
- if a live Codex coordinator session holds an unrecorded claim to this goal,
  that is a **stop condition**: stop, report to the decision owner, and dispatch
  nothing further until they rule.

**F2 — commit trailer. RULING: verbatim messages only. No trailer, no body, no
co-author line.** AC3/AC4 make exact message text an acceptance criterion that
reviewers verify directly; the `Co-Authored-By` convention is not part of this
parcel's contract. Reviewers must read the trailer's absence as this deliberate
ruling, not as a builder omission.

**F3 — kickstarter listed three ambient artifacts where constraint 6 pins four.
ACCEPTED as a kickstarter defect; fixed above.** Step 0.2 now names all four.
Scope was never reduced — constraint 6 and Allowed Files always pinned four, and
the builder correctly read and hashed all four.

**F4 — stale prose in `discovery.md`. ACCEPTED as documented; do not repair.**
Its closing sentence ("…remain unauthorized while that amendment is open") is
stale now that GTM-R1 is ratified and Gate 1 is closed. Constraint 8 forbids
repair, and the holds it describes remain in force regardless, so the staleness
is cosmetic and non-authorizing. It ships byte-identical. Reviewers must
attribute it to the pinned source, not to this parcel. The coordinator carries
it as an open item for a future amendment parcel; it is **not** in P0A scope.

**F5 — implicit destination-directory creation. ACKNOWLEDGED, no ruling needed.**

**Reflog note for reviewers.** The worktree reflog carries a
`reset: moving to HEAD` entry. Coordinator verification confirms it changed
nothing: HEAD, `git status --short --untracked-files=all`, and both
constraint-13 hashes are identical before and after Step 0. Confirm this
independently; do not treat the entry alone as evidence of mutation.
