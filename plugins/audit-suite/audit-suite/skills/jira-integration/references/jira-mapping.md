# Jira Mapping Reference

How work items become Jira issues: field mappings, description templates,
idempotency mechanics, and per-transport specifics.

---

## Structure mapping

| Input | Jira | Notes |
|---|---|---|
| Remediation phase (`phase_name`) | **Epic** — `[Audit] Phase 1 — Quick Wins` | One epic per phase; skip epics if the project doesn't use them (flat issues + labels instead). |
| Plan item / finding | **Task** (or the project's working type) | Epic-linked when phases exist. |
| `depends_on` | **Issue link** — `Blocks` (prerequisite blocks dependent) | Create after all issues exist. |
| Item id (`REM-001` / `SEC-007`) | **Summary prefix** — `[REM-001] Enforce MFA on all auth surfaces` | The idempotency key — never strip it. |

## Field mapping

| Input field | Jira field | Mapping |
|---|---|---|
| Severity / phase | **Priority** | Critical → Highest, High → High, Medium → Medium, Low/Info → Low. Plan items without severity: phase 1 → High, 2 → Medium, 3 → Low. |
| Effort (S/M/L) | **Label** `effort-s/m/l` | Story-point fields are install-specific — labels are portable. Map to points only if the person names their field. |
| Source | **Labels** | Always `audit-suite`; plus module ids that produced the findings (`sec-owasp-asvs`) when known. |
| `findings_closed`, `controls_addressed`, `retires` | **Description** | Per the template below. |

## Description template

Keep it scannable; link to the report for depth. Remember the sensitivity rule
(SKILL.md step 3): impact summary yes, exploit detail no.

```
*Filed by audit-suite (jira-integration) — do not edit the [REM-001] summary prefix; re-runs key off it.*

h3. What & why
<item title/body — the risk or obligation this retires>

h3. Closes
* Findings: SEC-004, SEC-011
* Controls: SOC2 CC6.1

h3. Effort & dependencies
* Effort: S (estimate, not commitment)
* Depends on: [REM-003]

h3. Provenance
suite 1.1.0 · plan remediation-plan-2026-06-12.json · report audit/audit-report-2026-06-12.md
```

REST API v3 requires Atlassian Document Format (ADF) for `description` — convert
each block to ADF paragraphs/lists (a flat sequence of `paragraph` and
`bulletList` nodes is enough; don't attempt rich layout). acli and most MCP tools
accept plain/wiki text as-is.

## Idempotency lookup

Before each create, search the destination project:

```
JQL: project = <KEY> AND labels = audit-suite AND summary ~ "REM-001"
```

- Exactly one match → **update** it (description, priority, labels only).
- No match → **create**.
- Multiple matches → don't guess: list them in the preview and ask which to
  update (someone cloned or split a ticket; that's their workflow, not an error).

## Transport specifics

**MCP** — use the session's Atlassian tool set; prefer its search tool for the
idempotency JQL. Tool names vary by server; discover, don't hardcode.

**acli** — `acli jira workitem create/update/search`. Confirm auth with a cheap
read (`search` on the project) before the batch.

**REST** — `POST/PUT /rest/api/3/issue`, `POST /rest/api/3/issueLink`,
`GET /rest/api/3/search?jql=…`. Basic auth from `JIRA_EMAIL:JIRA_API_TOKEN`
(base64) against `JIRA_BASE_URL`. Build headers in-process; never echo the token
or paste a runnable curl containing it. Verify credentials with `GET /myself`
before the batch. Create epics first to obtain keys for epic links.

**CSV fallback** (no access at all) — write `jira-import-<date>.csv` with columns
`Issue Type, Summary, Description, Priority, Labels` (one `Labels` column per
label). Tell the person where Jira's CSV import lives (Project settings →
Import). The summary prefix still carries the id, so a later live run stays
idempotent.

## Write-back shape

On request (SKILL.md step 6), annotate the consumed sidecar per item:

```json
{ "id": "REM-001", "jira": { "key": "SEC-142", "url": "https://<site>/browse/SEC-142" } }
```

Leave every other field untouched — the sidecar remains the remediation plan's
artifact; this skill only adds the tracking pointer.
