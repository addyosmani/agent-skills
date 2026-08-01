---
ticket: KONE-TBD
title: Plugin manifest and skill relocation (P1, plugin-packaging-and-scaffolder)
status: active
owner: clinton.morgan
created: 2026-07-29
updated: 2026-07-29
supersedes: null
risk: elevated
surfaces:
  - plugins/foreman-line/.claude-plugin/plugin.json
  - plugins/foreman-line/skills/**
  - plugins/foreman-line/CHANGELOG.md
  - plugins/foreman-line/shaping/README.md
  - plugins/foreman-line/shaping/tests/skill-template-presence.test.ts
  - plugins/foreman-line/docs/COORDINATOR-PATTERN.md
  - plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-carryover.md
  - plugins/foreman-line/docs/kickstarters/foreman-shaping-template.md
  - plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W4-P0.md
  - plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W4-P1.md
  - plugins/foreman-line/docs/kickstarters/foreman-line-parcel-DOCS-P1-rework.md
  - plugins/foreman-line/docs/kickstarters/foreman-line-shaping-P1.md
  - plugins/kds-figma/docs/parcels/index.md
  - plugins/kds-figma/docs/figma-research/UNPARK-DIRECTIVE.md
  - plugins/kds-figma/docs/figma-research/IMPLEMENTATION-DIRECTIVE.md
  - plugins/kds-figma/docs/figma-research/COORDINATOR-KICKOFF.md
  - skills/goal/**
  - skills/foreman-shaping/**
  - skills/parcel-driven-development/**
  - CLAUDE.md
  - .claude-plugin/marketplace.json
routing_class: architecture/risk
---

# P1 — Plugin manifest and skill relocation

Parcel P1 (Wave 1) of the `plugin-packaging-and-scaffolder` goal. Closes findings **F1**
(not an ingestible plugin) and **F8** (documented entry point does not load). Charter:
`plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/charter.md` — §4.1, D13, §5 P1.
The charter is the contract; this spec instantiates it for dispatch.

## Intent

Make `plugins/foreman-line` an installable Claude Code plugin whose skills travel with it, and fix
F8: the three Foreman Line skills (`goal`, `foreman-shaping`, `parcel-driven-development`) live in
repo-root `skills/`, which is not a skill-discovery path, so the documented coordinator entry point
`/goal` is not invokable in its own repo. Moving them into `plugins/foreman-line/skills/` — a real
discovery path — plus adding a plugin manifest and marketplace entry fixes the load failure and
makes the plugin ingestible elsewhere. Removing the stale personal-scope PDD copy (after local
install) closes P1's half of F9.

## Constraints

1. **Install precedes deletion** (developer ruling, 2026-07-29). The plugin is installed locally
   and confirmed present *before* `~/.claude/skills/parcel-driven-development/` is removed. No
   window exists in which PDD is unavailable.
2. **Manifest shape follows `plugins/audit-suite/.claude-plugin/plugin.json` exactly** — same
   fields, no extras, `version: 0.1.0`, **no `skills` field** (auto-discovery from the plugin's
   `skills/` subdirectory is empirically proven by audit-suite in this repo).
3. **Skill file content moves unmodified** except for one enumerated edit: the moved
   `goal/SKILL.md` updates its internal pointer to PDD's new path. `foreman-shaping/SKILL.md` and
   `parcel-driven-development/SKILL.md` move byte-identical (verify with `Get-FileHash`; the
   rtk-wrapped `diff` has reported byte-different files as identical and must not be used for byte
   claims). No content reconciliation — that is P2.
4. **Cross-plugin pointer updates use note form, not deep relative paths** (coordinator ruling,
   Step 0 A2). Each kds-figma markdown link to the PDD skill is replaced with a non-link reference
   naming both the loadable skill `parcel-driven-development` and the repo-root-relative locator
   `plugins/foreman-line/skills/parcel-driven-development/SKILL.md`.
5. **Do-not-touch set** (coordinator ruling, Step 0). These contain old paths deliberately and must
   not be edited:
   - `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/charter.md` — §7 criterion 4's
     grep-pattern list *contains* `skills/goal/` and `skills/foreman-shaping/` as search patterns;
     §3 F5's locator and §5 P1's text are point-in-time evidence.
   - `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/plan-review-findings.md`.
   - `docs/specs/done/**`, `plugins/foreman-line/docs/specs/done/**`,
     `plugins/foreman-line/docs/transcripts/**` — historical record.
   - `plugins/foreman-line/docs/kickstarters/plan-review-packaging-scaffolder.md` — closed review
     dispatch.
   - `.claude/worktrees/**` — a live registered git worktree belonging to other in-flight work;
     never edit across a worktree boundary.
   - `~/.claude/skills/get-app-specs/`, `~/.claude/skills/jira-workflow/`,
     `~/.claude/skills/modernize/` — duplicates not owned by this plugin.
6. In `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-P1.md`, only the read-instruction
   reference (line 6) is updated. The move-source enumeration in its Idea section (lines 19–24)
   describes the move operation itself and stays as written.
7. Windows environment; Node toolchain commands run in **PowerShell only**; `node -v` must satisfy
   `>=24.11.1`. Fresh worktree checkouts do not carry `node_modules` for `spec-linter`,
   `permission-profiles`, or `shaping`; run `npm ci` in each before running tests or the
   self-check.
8. Charter stop condition: **P1 leaves `/goal` unloadable → stop immediately.** If the fresh-session
   check (AC group B) fails, that is a loop-stop, not a patch-forward.

## Acceptance Criteria

**Group A — agent-verifiable on disk, in-session.** These are the only criteria the builder may
claim green.

1. `plugins/foreman-line/.claude-plugin/plugin.json` exists, parses as JSON, carries exactly the
   audit-suite field set (`name`, `version`, `description`, `author`, `homepage`, `repository`,
   `license`, `keywords`), `name: "foreman-line"`, `version: "0.1.0"`, and no `skills` field.
2. `.claude-plugin/marketplace.json` parses as JSON and contains a `foreman-line` entry with
   `source: "./plugins/foreman-line"`; all pre-existing entries are unchanged.
3. `plugins/foreman-line/skills/goal/SKILL.md`, `plugins/foreman-line/skills/foreman-shaping/SKILL.md`,
   and `plugins/foreman-line/skills/parcel-driven-development/SKILL.md` exist; `skills/goal/`,
   `skills/foreman-shaping/`, and `skills/parcel-driven-development/` no longer exist.
4. `Get-FileHash` proves the moved `foreman-shaping/SKILL.md` and
   `parcel-driven-development/SKILL.md` are byte-identical to their pre-move sources. The moved
   `goal/SKILL.md` differs from its source only in the PDD pointer line (line 8).
5. `plugins/foreman-line/CHANGELOG.md` exists with a `0.1.0` entry recording the manifest addition
   and the skill relocation.
6. Every file in the Allowed Files edit list has its old-path pointer(s) updated per this spec.
7. **Bounded no-dangling-pointer grep:** `git grep -n -e "skills/goal/" -e "skills/foreman-shaping/"
   -e "skills/parcel-driven-development/"` over the parcel worktree returns hits **only** in this
   enumerated allowlist — anything outside it fails the criterion:
   - `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/charter.md`
   - `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/plan-review-findings.md`
   - `docs/specs/done/**`
   - `plugins/foreman-line/docs/specs/done/**`
   - `plugins/foreman-line/docs/transcripts/**`
   - `plugins/foreman-line/docs/kickstarters/plan-review-packaging-scaffolder.md`
   - `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-P1.md` (the retained move-source
     enumeration only)
   - `plugins/foreman-line/docs/specs/active/P1-plugin-packaging.md` (this spec — it enumerates
     source paths by necessity)
8. The shaping package's test suite passes in the parcel worktree after
   `skill-template-presence.test.ts` is updated to the new path (PowerShell, Node `>=24.11.1`).
9. The plugin is installed locally, and **only after** install evidence appears in the transcript,
   `~/.claude/skills/parcel-driven-development/` is deleted and its absence is shown. The deletion
   touches exactly that one directory; the three non-owned duplicates remain untouched, shown by a
   directory listing.

**Group B — NOT verifiable in-session; post-merge human verification.** Skill discovery happens at
session start, so no session that performs the move can observe the result. **Any in-session green
claim on these is false by construction, and the builder must not make one.**

10. In a fresh Claude Code session opened after merge and local install, `/goal`,
    `/foreman-shaping`, and `/parcel-driven-development` appear as loadable skills sourced from the
    installed `foreman-line` plugin.
11. **Recording:** the human verifier's result is recorded as a coordinator verification note at
    `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/p1-fresh-session-verification.md`
    (git-evidenced, discoverable by `git log`), not as a Jira comment — coordinator ruling, Step 0
    D1: the ticket is KONE-TBD and SPEC-CONVENTION §5 assigns implementation context to Git. Once a
    real KONE key exists, a Jira comment may be added additively; it is not the record of authority.

## Out of Scope

- The `~/.claude/skills/` duplicates **not** owned by this plugin: `get-app-specs`,
  `jira-workflow`, `modernize`. Touching them is scope drift (charter §5 P1 scope bound).
- Content reconciliation of the surviving PDD copy (`docs/parcels/` vs `docs/specs/` language,
  `## Allowed Files` merge into SPEC-CONVENTION) — that is **P2**. This parcel moves bytes; it does
  not rewrite them.
- The `keon-skills` third PDD copy — external repository, recorded as a known divergence.
- Historical/closed artifacts naming old paths (the do-not-touch set in Constraints §5).
- `skills/parcel-driven-development.zip` — untracked distribution artifact, not a skill source.
- `templates/`, `project-scaffold/`, and everything in Waves 2–4.
- Any edit to the 34 shipped specs' frontmatter, to `docs/SPEC-CONVENTION.md`, or to the
  spec-linter.
- Any `.claude/worktrees/**` content.
- **`AGENTS.md`** — *removed from scope by coordinator-ratified amendment, 2026-07-29.* The file is
  untracked in the main working tree, so `git worktree add` does not carry it and it is **absent from
  every parcel worktree** — an edit AC against it is unsatisfiable, and AC 7's `git grep` is
  structurally blind to untracked files regardless. Its correct end state is defined by **D5**
  (`AGENTS.md` holds the canon, `CLAUDE.md` becomes a one-line import) and implemented by **P3**,
  which creates the `AGENTS.md` template. Tracking the present duplicate in P1 would commit the exact
  shape D5 exists to replace. Developer ruling: the stray untracked duplicate is deleted rather than
  carried forward, so no stale pointer survives anywhere.

## Allowed Files

Exact list per D11 — no globs. Both source and destination paths are enumerated for moves.

**Create:**
- `plugins/foreman-line/.claude-plugin/plugin.json`
- `plugins/foreman-line/CHANGELOG.md`

**Move (source → destination):**
- `skills/goal/SKILL.md` → `plugins/foreman-line/skills/goal/SKILL.md`
- `skills/foreman-shaping/SKILL.md` → `plugins/foreman-line/skills/foreman-shaping/SKILL.md`
- `skills/parcel-driven-development/SKILL.md` → `plugins/foreman-line/skills/parcel-driven-development/SKILL.md`

(Each source directory contains only `SKILL.md`, verified; the emptied directories are removed.)

**Edit:**
- `.claude-plugin/marketplace.json`
- `CLAUDE.md`
- `plugins/foreman-line/skills/goal/SKILL.md` (post-move: internal PDD pointer only)
- `plugins/foreman-line/shaping/README.md`
- `plugins/foreman-line/shaping/tests/skill-template-presence.test.ts`
- `plugins/foreman-line/docs/COORDINATOR-PATTERN.md` (two references, lines 3 and 88)
- `plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-carryover.md`
- `plugins/foreman-line/docs/kickstarters/foreman-shaping-template.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W4-P0.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W4-P1.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-parcel-DOCS-P1-rework.md`
- `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-P1.md` (line-6 read instruction only)
- `plugins/kds-figma/docs/parcels/index.md`
- `plugins/kds-figma/docs/figma-research/UNPARK-DIRECTIVE.md`
- `plugins/kds-figma/docs/figma-research/IMPLEMENTATION-DIRECTIVE.md`
- `plugins/kds-figma/docs/figma-research/COORDINATOR-KICKOFF.md`

**Delete (outside the repo, after local install — AC 9):**
- `~/.claude/skills/parcel-driven-development/` (entire directory)

**Post-merge (coordinator-authored, named here so the recording location is contractual — AC 11):**
- `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/p1-fresh-session-verification.md`

## Context & References

- Charter: `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/charter.md` (§4.1
  plugin shape, D13 packaging-first, §5 P1, §9 stop conditions)
- Plan review: `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/plan-review-findings.md`
- Dispatch: `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-P1.md`
- Manifest precedent: `plugins/audit-suite/.claude-plugin/plugin.json`
- Marketplace: `.claude-plugin/marketplace.json`
- Convention: `docs/SPEC-CONVENTION.md` (§3 lifecycle, §4 schema, §8 dispatch)
- Standing constraints: `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`

## Verification Plan

The adversarial reviewer verifies Group A independently (no builder self-grading) and confirms
Group B was **not** claimed. Byte claims use `Get-FileHash` only.

### Mandated reviewer focus questions

1. **Does any pointer to the old skill paths survive anywhere in the repo outside AC 7's enumerated
   allowlist?** Run the grep yourself; do not trust the builder's output. Then invert it: is every
   allowlist entry genuinely historical record or deliberate search-pattern/move-source text — or
   has live guidance been smuggled into the allowlist?
2. **Does any acceptance criterion invite a self-graded claim on skill loadability?** The
   in-session/fresh-session split (Group A vs Group B) is load-bearing: confirm the builder claimed
   nothing from Group B, and that no Group A criterion is worded such that passing it implies
   `/goal` loads.
3. **Did install verifiably precede deletion** (AC 9) — is there transcript evidence of the
   installed plugin *before* the `~/.claude/skills/parcel-driven-development/` removal, and did the
   deletion touch exactly that one directory (the three non-owned duplicates still present)?
4. **Are the two unmodified skill files byte-identical across the move** (`Get-FileHash`, never the
   rtk-wrapped `diff`), and is the moved `goal/SKILL.md`'s diff confined to the single PDD pointer
   line?
5. **Is the charter's grep-pattern list (§7 criterion 4) untouched?** An "update every old path"
   sweep that rewrote those patterns silently breaks the goal's exit criterion.
