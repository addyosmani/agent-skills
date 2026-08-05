---
name: jira-integration
description: >-
  Create or update Jira issues from structured work items — a remediation plan,
  audit findings, review action items, or any task list — mapping phases to
  epics and items to issues with priority, labels, links, and traceable ids,
  always previewing the full batch before anything is created, and never
  duplicating issues on re-run. Use when someone says "file these in Jira",
  "create tickets for these findings", "push the remediation plan to Jira",
  "track this work in Jira", or wants any list of work turned into Jira issues.
  Works via Atlassian MCP tools, the acli CLI, or the Jira REST API — whichever
  the session has. This skill WRITES work items INTO Jira; it does not read,
  plan, or execute work from existing Jira tickets.
---

# Jira Integration

Turn structured work into tracked Jira issues — without duplicates, without
surprises, and without ever creating a ticket the person hasn't previewed.

Built as the audit suite's ticket-filing stage (it natively consumes
`remediation-plan` and `security-audit` sidecars) but deliberately generic: any
skill, plugin, or person with a list of work items can use it standalone.

**Boundary:** one direction only — work items *into* Jira (create/update). Reading
tickets to plan or execute work is a different job (e.g. a jira-workflow skill);
don't absorb it.

Field mappings, description templates, and idempotency mechanics live in
`references/jira-mapping.md`.

---

## Workflow

### 1. Gather the work items

In priority order:

1. **A `remediation-plan` JSON sidecar** — richest input: phases, dependencies,
   effort, findings closed. Phases become epics; items become issues.
2. **A `security-audit` findings sidecar** (or `compliance-audit` gaps) — one
   issue per finding/gap, severity mapped to priority.
3. **Anything else** — a markdown plan, action items from a review, a prose list.
   Normalize to `{ id, title, body, priority?, parent? }`; synthesize stable ids
   if absent.

Every item needs a stable id (`REM-001`, `SEC-007`…) — it's the idempotency key.

### 2. Resolve Jira access

Try in order; use the first that works, and say which one you're using:

1. **Atlassian/Jira MCP tools** present in the session.
2. **`acli`** (Atlassian CLI) installed and authenticated.
3. **REST API** — requires `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` env
   vars. Build the auth header in-process; **never echo or log the token**.

If none is available: don't stall — say exactly what to configure (one env-var
block beats a lecture), and offer the fallback: a **Jira-importable CSV** written
to disk so the work isn't lost.

### 3. Resolve the destination

Confirm with the person before any write: **project key**, **issue types**
(epic/task/story — verify they exist in the project), and optionally components,
assignee, and a sprint/board. If the project key wasn't given, ask — never guess
a project. Apply the field mappings from `references/jira-mapping.md`.

**Sensitivity check:** security findings in tickets are visible to everyone with
project access. Keep exploit detail out of descriptions (link to the report on
disk instead) and confirm the project's visibility is appropriate — one sentence,
once.

### 4. Preview — mandatory, before any write

Render the full batch as a dry-run table: issue type, summary, priority, labels,
epic link, dependency links, and whether each item is a **create** or an
**update** (per the idempotency lookup below). State the total. Then stop and get
explicit confirmation. **No Jira write of any kind happens before the person
approves the preview** — this is non-negotiable, regardless of how the skill was
invoked.

### 5. Create / update idempotently

Before creating anything, search the project for issues already carrying each
item's stable id (mechanics in `references/jira-mapping.md`). Existing issue →
**update** (refresh description, priority, labels; never touch its status or
assignee). No match → **create**. Order: epics first, then issues with epic
links, then dependency links (`Blocks`). On partial failure, stop, report
exactly what was created and what wasn't, and make the re-run safe — the
idempotency keys guarantee no duplicates.

### 6. Report and write back

Output a results table: item id → issue key (linked URL) → created/updated.
If the input was a sidecar, offer to write the issue keys back into it
(`jira: { key, url }` per item) so the next run — and the next audit — can
trace plan items to tickets.

---

## Constraints

- **Preview before write — always.** Creating tickets is outward-facing and
  noisy to undo. No exceptions, even when invoked by another skill.
- **Idempotent re-runs.** Running twice must never file twice. The stable item id
  in the summary is the contract — don't strip it.
- **Update, don't clobber.** Refresh content on existing issues; never change
  status, assignee, or sprint on an update — those belong to the team's workflow.
- **Credentials stay invisible.** Never print tokens, auth headers, or curl
  commands containing secrets; report HTTP failures by status and message only.
- **Don't editorialize the work.** File what the input says. Reordering,
  re-scoping, or re-prioritizing items is `remediation-plan`'s job.
- **Name what didn't land.** Partial failures are reported per-item, never
  papered over with "done".

## References

- `references/jira-mapping.md` — field mappings (severity → priority,
  phase → epic), description templates, idempotency lookup, REST/acli/CSV
  specifics.
- `../remediation-plan/SKILL.md` — the sidecar format this skill consumes best
  (when installed as part of the audit suite).
