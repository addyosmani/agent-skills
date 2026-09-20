---
name: observability
description: Observability rules — structured logging used judiciously with no noise, logs at request/job boundaries, state transitions, and errors only, bounded metric labels, no PII or secrets in logs, technical metrics (rate, errors, duration, saturation) for new endpoints, jobs, and external calls, product and business metrics named by the PM in the PRD, Prometheus/Grafana/Loki, and deferred alerts, runbooks, and traces. Load whenever you add a log line, a metric, a dashboard, an alert, or review a change for missing or redundant instrumentation — even when the user only says "add some logging".
---

# Observability

## Logging

| ID | Rule |
| --- | --- |
| O1 | **Structured logging, judiciously. Do not create noise.** |
| O2 | Structured logs at **request/job boundaries, domain state transitions, and errors with context**; nothing inside pure business logic, no per-iteration logs, nothing that duplicates a metric. Override: a recorded operational requirement for more (never for less). |
| O3 | **Bounded labels; no PII or secrets in logs.** No secrets in source, fixtures, logs, or tracker comments. |

## Metrics

| ID | Rule |
| --- | --- |
| O4 | **Tech metrics decided by the backend engineer/agent; product and business metrics decided by the PM.** |
| O5 | **Every task instruments what it ships:** technical metrics — rate, errors, duration, saturation (RED + saturation) — for new endpoints, jobs, and external calls; product and business metrics named in the PRD. Metrics use bounded labels and are tested. Detail: `references/metrics-and-logging.md` (not in this repo — see `CLAUDE.md`). Beyond this baseline, the backend engineer decides tech metrics (O4). |
| O6 | **Stack: Prometheus (metrics), Grafana (dashboards), Loki (logs).** Dashboards and alerts are provisioned at the milestone the plan names; **metric emission itself is always required.** |

## Alerts, runbooks, traces, SLOs

| ID | Rule |
| --- | --- |
| O7 | **Runbooks and traces: deferred. Alerts: provisioned at the milestone the plan names,** together with dashboards; not before. |
| O8 | The HLD keeps observability high level: metrics, logs, alerts; and names SLOs (`hld-lld-design`). |

## Review checklist

Reviewers flag observability that is **missing or redundant** (metrics, logs). Before opening a PR:

1. New endpoint / job / external call → rate, errors, duration, saturation metrics with bounded labels, and a test that they are emitted (O5).
2. Logs only at boundaries, transitions, and errors; none in loops or pure logic (O2, O1).
3. No PII, no secrets, no unbounded label values (O3, `coding-standards` C22).
4. Product/business metrics only if the PRD names them (O4, O5).
5. Alerts and dashboards land at the milestone the plan names; runbooks and traces stay deferred (O7, O6).
