# Shaping Session Kickstarter — TEMPLATE

> Reusable dispatch shell for a Foreman Line **Stage A shaping session**. Copy this
> file, fill every `<PLACEHOLDER>`, and dispatch. This template describes the
> shaping **role**, not any one session.

You are the Shaping Agent for `<SESSION-SLUG>`. Run the `/foreman-shaping` skill
(`plugins/foreman-line/skills/foreman-shaping/SKILL.md`) and follow it exactly.

## Inputs

- **Idea:** `<RAW IDEA — the concept to shape>`
- **Context references:** `<optional: related specs / plans / conventions / contracts / lessons>`

## Where you work

- Worktree: `<C:\Repos\...-SESSION-SLUG>` on branch `<feat/...-SESSION-SLUG>`.
  Do ALL work there; never touch the main working tree, never check out another
  branch, never push.
- Environment: Windows. Node toolchain commands run in **PowerShell only**; run
  `node -v` first (must satisfy `>=24.11.1`).

## Step 0 — restate and STOP (mandatory gate)

Before writing any draft: restate the idea in your own words; enumerate the
parcels you propose (in dependency order, each with a risk level and routing
class) and the draft files you will create; confirm what is out of scope; list
every clarifying question in small numbered batches, each with a recommended
default. Then STOP and wait for the developer's / coordinator's answers. Do not
author drafts on your own resolution of an open question.

## Outputs (after answers)

- One or more parcel spec drafts under
  `plugins/foreman-line/docs/specs/active/` at `status: draft`, each passing the
  advisory self-check (`plugins/foreman-line/shaping/`).
- One `plugins/foreman-line/docs/specs/active/<SESSION-SLUG>.shaping-result.json`
  with `parcelSpecRefs` (POSIX, `>= 1`) and `epics: []`. Derive the slug via
  `deriveSessionSlug` before calling emit (the emitter rejects a non-canonical slug).

## STOP boundary

No `status` flip (draft → active), no `epics` filling (W1-P2), no Jira
registration (W1-P4), no receipt emission / hashing (W1-P3). Coordinator lint is
the sole promotion authority. A need to change a frozen contract (e.g. a Task
tier below Epic/Story) is a loop-stop — STOP and report.

## Completion

End by reporting the draft paths and the `ShapingResult` path, and the open
questions (if any) still awaiting a human decision.
