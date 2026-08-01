Shaping Session Kickstarter — P1 (plugin packaging + skill relocation)

You are the Shaping Agent for `p1-plugin-packaging`, first parcel of the
`plugin-packaging-and-scaffolder` goal.

**Read `plugins/foreman-line/skills/foreman-shaping/SKILL.md` from disk and follow it exactly. Do NOT attempt to invoke
`/foreman-shaping`** — it is not loadable in this repo, which is finding F8 and part of what this
very parcel fixes. Repo-root `skills/` is not a skill-discovery path; only `~/.claude/skills/` and
installed plugins are. Reading the file is the working path. Do not spend turns diagnosing this.

## Inputs

**Idea.** Make `plugins/foreman-line` an installable plugin whose canon and skills travel, and fix
the fact that its documented entry point does not load. Concretely:

1. Add `plugins/foreman-line/.claude-plugin/plugin.json`, following the shape of
   `plugins/audit-suite/.claude-plugin/plugin.json`.
2. Register the plugin in `.claude-plugin/marketplace.json`.
3. Move `skills/goal/`, `skills/foreman-shaping/`, and `skills/parcel-driven-development/` into
   `plugins/foreman-line/skills/`.
4. Update every pointer that names the old locations — including `CLAUDE.md` and the untracked
   root `AGENTS.md`, which currently say `skills/goal/`.
5. **Install the plugin locally first, then remove the now-redundant copy at
   `~/.claude/skills/parcel-driven-development/`.** Install precedes deletion — developer ruling,
   2026-07-29 — so there is no window in which PDD is unavailable.

**Context references.** Read in full:

- `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/charter.md` — especially §4.1, D13, and §5 P1. **The charter is the contract; this kickstarter only dispatches it.**
- `plugins/foreman-line/docs/goals/plugin-packaging-and-scaffolder/plan-review-findings.md` — F8's disposition
- `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`
- `docs/SPEC-CONVENTION.md` — your spec must satisfy its schema and pass `plugins/foreman-line/spec-linter/`
- `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md` — standing constraints apply

## Where you work

- Worktree: `C:\Repos\kaseya-one-productivity-tools.p1-packaging` on branch `feat/p1-plugin-packaging`.
  Do ALL work there. Never touch the main working tree, never check out another branch, never push.
- Environment: Windows. Node toolchain commands run in **PowerShell only**; run `node -v` first
  (must satisfy `>=24.11.1`). Byte comparisons use `Get-FileHash` — the rtk-wrapped `diff` has been
  observed reporting byte-different files as identical.

## Step 0 — restate and STOP (mandatory gate)

Before drafting: restate the parcel in your own words; enumerate the exact files you propose to
create, move, edit, and delete; state what is out of scope; list every clarifying question in small
numbered batches, each with a recommended default. Then STOP and wait. Do not author drafts on your
own resolution of an open question.

## Two problems the spec must solve, not paper over

**(1) The headline criterion is not verifiable in-session.** Skill discovery happens at session
start, so the builder cannot prove `/goal` loads from the installed plugin within the session that
moves it. Any in-session green claim on that criterion is false by construction. Your acceptance
criteria must separate what the builder can verify on disk (manifest valid, marketplace entry
parses, files at their new paths, no dangling pointers) from what requires a fresh session
(`/goal` and `/foreman-shaping` appear as loadable skills). Name the second group explicitly as a
post-merge human verification step, and state how it is recorded. Do not write an AC that invites a
self-graded claim.

**(2) There are more duplicate skills than this parcel owns.** `skills/` and `~/.claude/skills/`
both contain `get-app-specs`, `jira-workflow`, and `modernize` in addition to
`parcel-driven-development`. **Only the three Foreman Line skills are in P1's scope.** The other
duplicates are not owned by this plugin; moving or deleting them is out of scope and would be
scope drift. Say so in Out of Scope explicitly.

## Outputs (after your questions are answered)

- One parcel spec draft at `plugins/foreman-line/docs/specs/active/P1-plugin-packaging.md`,
  `status: draft`, passing the advisory self-check (`plugins/foreman-line/shaping/`). Frontmatter
  must carry `risk: elevated` and `routing_class: architecture/risk` per the charter, plus
  `surfaces:` covering every path you touch. `ticket:` is `KONE-TBD`.
- One `plugins/foreman-line/docs/specs/active/p1-plugin-packaging.shaping-result.json` with
  `parcelSpecRefs` (POSIX, `>= 1`) and `epics: []`. Derive the slug with `deriveSessionSlug` before
  calling emit — the emitter rejects a non-canonical slug.

Include a **Verification Plan with mandated reviewer focus questions** (SPEC-CONVENTION §4.5) — the
highest-leverage line you will write. At minimum, one focus question must probe whether any pointer
to the old skill paths survives anywhere in the repo, and one must probe the in-session
verifiability split above.

`allowed_files` per D11 is an exact list, not a glob. This parcel moves files; enumerate both source
and destination paths.

## STOP boundary

No `status` flip (draft → active) — coordinator lint is the sole promotion authority. No `epics`
filling. No Jira registration. No receipt emission or hashing. No implementation: you write specs,
not code, and you do not move any file this parcel proposes to move.

A need to change a frozen contract, or any charter amendment, is a loop-stop — STOP and report; do
not amend the charter yourself.

## Completion

Report the draft path, the `ShapingResult` path, and every open question still awaiting a human
decision. Flag anything you found that the charter does not cover.
