# APP_SPECIFICATION — {App Name}

> Canonical, evidence-backed inventory of what this application does. Behavior only — not implementation.
> Source: `{repo / ref}` · Generated: `{date}` · Skill: get-app-specs

## Scope

- **In scope:** {modules / surfaces}
- **Out of scope:** {exclusions + reason}
- **ID namespace:** {e.g. `BACKEND.BILLING` — prepended to every ID below; or `none` for a single-scope run}
- **Evidence classes available:** code | tests | traces | logs | schemas | config | docs

## Liveness Evidence Sources (intake)

> Bounds every "cold" judgment in this spec. If no runtime source exists, liveness leans on schedule/wiring + human elicitation, and Cold/Indeterminate items must go to a human.

| Source | Available? | Tool / location | Retention window |
|-|-|-|-|
| Runtime telemetry / APM | Y/N | {Dynatrace / App Insights / …} | {e.g. 30d} |
| Access / request logs | Y/N | {location} | {window} |
| Scheduler config | Y/N | {cron / Hangfire / Quartz / cloud} | n/a |
| Feature-flag state | Y/N | {provider} | n/a |

## Coverage Summary

{1–3 sentences: what was inventoried, where evidence was thin, overall confidence + liveness posture.}

| Bucket | Count | High | Med | Low |
|-|-|-|-|-|
| Features (F) | | | | |
| Business rules (BR) | | | | |
| Requirements (R) | | | | |
| Domain canon (CANON) | | | | |

| Liveness | Live | Cold | Dead (omitted) | Indeterminate |
|-|-|-|-|-|
| Features | | | | |

---

## Features

> Includes headless/automated processes. Each carries a trigger and a liveness label.

### F-001 {name}
- **Behavior:** {what it does, observably}
- **Trigger:** user | scheduled | event | manual | external
- **Cadence:** {if scheduled — e.g. daily 02:00, `0 0 1 1 *`; else n/a}
- **Liveness:** Live | Cold | Dead | Indeterminate
- **Confidence:** High | Medium | Low
- **Evidence:** `path:line` (code), `dynatrace: … last 30d` (log/runtime), `schedule.yaml:12` (config) …
- **Notes / config:** {flags, defaults}
- **Open questions:** OQ-### (if any)

### F-002 {name — scheduled example}
- **Behavior:** Year-end tax/close export
- **Trigger:** scheduled
- **Cadence:** `0 0 1 1 *` (yearly) — absence from a 30d window is expected, NOT cold
- **Liveness:** Live (schedule is the primary signal; runtime corroborates if window allows)
- **Confidence:** Medium
- **Evidence:** `src/jobs/yearEndClose.cs:20` (code), `infra/schedules.yaml:8` (config)

---

## Business Rules

### BR-001 {name}
- **Rule:** {the constraint/policy}
- **Trigger / scope:** {when it applies}
- **Confidence:** High | Medium | Low
- **Evidence:** `path:line`

---

## Requirements (Non-Functional / Technical)

### R-001 {name}
- **Requirement:** {limit / SLA / security control}
- **Source of truth:** {config / code / doc} · **Default:** {value}
- **Confidence:** High | Medium | Low
- **Evidence:** `path:line`

---

## Domain Canon

### CANON-001 {term / entity / invariant}
- **Definition:** {canonical meaning the system enforces}
- **Invariants:** {what must always hold}
- **Confidence:** High | Medium | Low
- **Evidence:** `path:line`

---

## Dependencies

| ID | Dependency | Kind | Version/Contract | Used by | Evidence |
|-|-|-|-|-|-|
| DEP-001 | {e.g. Stripe API} | external | {v / contract} | F-### | `path:line` |
| DEP-002 | {e.g. Postgres} | datastore | {schema ref} | F-### | `path:line` |

---

## Periodic / Seasonal Operations (human-elicited)

> The category neither static analysis nor a short telemetry window can see. Ask explicitly.
> **"Are there month-end, quarter-end, year-end, audit, tax, renewal, or seasonal operations that would NOT show up as a scheduled job in code or in recent telemetry?"**

| Op | Cadence | Captured as | Confirmed by | Evidence (if any) |
|-|-|-|-|-|
| {e.g. annual SOC2 export} | yearly | F-### | {name} | {code/config or "human-only"} |

---

## Findings — Anti-Patterns & Suspected Bugs

> Do not "fix" here. These are candidate tombstones for downstream modernization.

| ID | Finding | Severity | Evidence | Related |
|-|-|-|-|-|
| FND-001 | {e.g. password truncated at 8 chars} | high | `path:line` | BR-### / OQ-### |

---

## Omissions — Candidate Tombstones

> Anything dropped from the baseline. Omit ONLY on positive evidence of death or explicit human decision. Never silent.

| Item | Reason | Liveness evidence | Decided by |
|-|-|-|-|
| {e.g. LegacyReportExportJob} | Dead — unwired, 0 runtime, superseded | `no schedule ref`, `dynatrace: 0 hits 13mo` | {static / human} |

---

## Open Questions

| ID | Question | Blocks | Owner | Due | Status |
|-|-|-|-|-|-|
| OQ-001 | {ambiguity to resolve} | F-### | {name} | {date} | open |

---

## Self-Check (must all be true before baseline is complete)

- [ ] Every F/BR/R/CANON item has ≥1 evidence pointer.
- [ ] Every item has a confidence label.
- [ ] Every Low-confidence item has a paired OQ.
- [ ] Every F-* has a trigger and a liveness label.
- [ ] No F-* is marked Dead on static absence alone.
- [ ] Every Cold / Indeterminate item was routed to a human (resolved or pending).
- [ ] Every omission has a recorded rationale + liveness evidence.
- [ ] The periodic/seasonal-ops question was posed to a human.
- [ ] Scope exclusions are recorded with reasons.
- [ ] IDs are unique and not recycled.
- [ ] IDs are namespaced to this spec's scope (or bare for a single-scope run) and match `^([A-Z][A-Z0-9]*\.)*(F|BR|R|CANON)-[0-9]+$`.
- [ ] No implementation/redesign leaked into the spec.
