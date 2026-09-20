---
name: observability-and-instrumentation
description: Observability rules — structured logging used judiciously with no noise, logs at request/job boundaries, state transitions, and errors only, bounded metric labels, no PII or secrets in logs, technical metrics (rate, errors, duration, saturation) for new endpoints, jobs, and external calls, product and business metrics named by the PM in the PRD, Prometheus/Grafana/Loki, and deferred alerts, runbooks, and traces; instruments code so production behavior is visible and diagnosable. Use when you add a log line, a metric, a dashboard, an alert, or review a change for missing or redundant instrumentation — even when the user only says "add some logging"; when shipping any feature that runs in production and you need evidence it works; or when production issues are reported but you can't tell what happened from the available data; also when instrumenting a coding-agent organization to see its hierarchy, loaded skills and docs, context usage, tool calls, turns, tokens, and cost.
category: coding
---

# Observability and Instrumentation

## Overview

Code you can't observe is code you can't operate. Observability is the ability to answer "what is the system doing and why?" from the outside, using the telemetry the code emits. If a feature ships without telemetry, the first user-reported bug becomes archaeology instead of a query.

## When to Use

- Building any feature that will run in production
- Adding a new service, endpoint, background job, or external integration
- Adding a log line, a metric, a dashboard, or an alert
- Reviewing a change for missing or redundant instrumentation
- A production incident took too long to diagnose ("we couldn't tell what happened")
- Setting up or reviewing alerting rules
- Reviewing a PR that adds I/O, retries, queues, or cross-service calls

**NOT for:**
- Diagnosing a failure happening right now — use the `debugging-and-error-recovery` skill (observability is what makes that skill fast next time)
- Profiling and optimizing measured slowness — use the `performance-optimization` skill
- Launch-day monitoring checklists and rollback triggers — see the `shipping-and-launch` skill; this skill covers the instrumentation that feeds them

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
| O5 | **Every task instruments what it ships:** technical metrics — rate, errors, duration, saturation (RED + saturation) — for new endpoints, jobs, and external calls; product and business metrics named in the PRD. Metrics use bounded labels and are tested. Detail: `../../references/metrics-and-logging.md`. Beyond this baseline, the backend engineer decides tech metrics (O4). |
| O6 | **Stack: Prometheus (metrics), Grafana (dashboards), Loki (logs).** Dashboards and alerts are provisioned at the milestone the plan names; **metric emission itself is always required.** |

## Alerts, runbooks, traces, SLOs

| ID | Rule |
| --- | --- |
| O7 | **Runbooks and traces: deferred. Alerts: provisioned at the milestone the plan names,** together with dashboards; not before. |
| O8 | The HLD keeps observability high level: metrics, logs, alerts; and names SLOs (`hld`). |

## Process

### 1. Define "working" before instrumenting

Telemetry without a question is noise. Before adding any instrumentation, write down 2–4 questions an on-call engineer will ask about this feature:

```
FEATURE: checkout payment retry
QUESTIONS ON-CALL WILL ASK:
1. What fraction of payments succeed on first attempt vs after retry?
2. When a payment fails permanently, why? (provider error? timeout? validation?)
3. Is the payment provider slower than usual?
→ Every signal below must help answer one of these.
```

If you can't name the questions, you're not ready to instrument — you'll log everything and learn nothing.

### 2. Pick the right signal for each question

| Signal | Answers | Cost profile | Example |
|---|---|---|---|
| **Structured log** | "What happened in this specific case?" | Per-event; grows with traffic | `payment_failed` with provider error code |
| **Metric** | "How often / how fast, in aggregate?" | Fixed per series; cheap to query | p99 latency of provider calls |
| **Trace** (deferred, O7) | "Where did time go across services?" | Per-request; usually sampled | One slow checkout, broken down by hop |

Rule of thumb: metrics tell you **that** something is wrong, traces tell you **where**, logs tell you **why**.

### 3. Structured logging (O1, O2, O3)

Log events, not prose. Every log line is a JSON object with a stable event name and machine-readable fields:

```typescript
// BAD: string interpolation — unqueryable, inconsistent
logger.info(`Payment ${id} failed for user ${userId} after ${n} retries`);

// GOOD: stable event name + structured fields
logger.warn({
  event: 'payment_failed',
  paymentId: id,
  provider: 'stripe',
  errorCode: err.code,
  attempt: n,
}, 'payment failed');
```

**Log levels — use them consistently:**

| Level | Meaning | On-call action |
|---|---|---|
| `error` | Invariant broken; someone may need to act | Investigate |
| `warn` | Degraded but handled (retry succeeded, fallback used) | Watch for trends |
| `info` | Significant business event (order placed, job finished) | None |
| `debug` | Diagnostic detail | Off in production by default |

**Correlation IDs are mandatory.** Generate (or accept) a request ID at the system boundary and attach it to every log line, span, and outbound call. Without it, you cannot reconstruct a single request from interleaved logs:

```typescript
// Express: child logger per request, ID propagated downstream
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] ?? crypto.randomUUID();
  req.log = logger.child({ requestId: req.id });
  res.setHeader('x-request-id', req.id);
  next();
});
```

**When several entry points write to one log, name the entry point.** A correlation ID identifies a run; it does not say which code path started it. The same job reached by a scheduler, by a replay endpoint, and by a manual CLI run produces interchangeable lines in one sink, so attributing a line falls back to elimination — cross-reading the scheduler's history, the process table, a deploy log — and that argument holds only as long as those external records happen to still exist. Stamp the entry point where the run starts, next to the correlation ID, and propagate both the same way:

```typescript
// One helper for every entry point: the run's own logger carries both fields.
// `entryPoint`, not `source` — ECS reserves `source.*` for network fields.
export const runLog = (entryPoint: 'scheduler' | 'replay_endpoint' | 'cli', runId: string) =>
  logger.child({ entryPoint, requestId: runId });

// scheduler tick        -> runLog('scheduler', crypto.randomUUID())
// POST /jobs/:id/replay -> runLog('replay_endpoint', req.id)
// CLI invocation        -> runLog('cli', process.env.RUN_ID ?? crypto.randomUUID())
```

Both fields have to cross the same boundaries as the correlation ID — queue metadata, HTTP headers — or a worker re-derives the entry point and guesses. A field that merely correlates with an entry point is a hint, not an attribution: anything that can invoke the job can reproduce it.

**Never log secrets, tokens, passwords, or full PII.** This is a hard rule from the `security-and-hardening` skill — telemetry pipelines are a classic data-leak path. Allowlist fields; don't log whole request bodies.

Telemetry pipelines are a classic data-leak path (O3). Allowlist fields; don't log whole request bodies.

### 4. Metrics (O4, O5, O6)
For request-driven services, instrument **RED** on every endpoint and every external dependency: **R**ate (requests/sec), **E**rrors (failure rate), **D**uration (latency histogram, not average). For resources (queues, pools, hosts), use **USE**: **U**tilization, **S**aturation, **E**rrors.


The example below uses Prometheus' `prom-client` (O6):

```typescript
import { Histogram } from 'prom-client';

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status_class'],  // '2xx', not '200'
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
```

**Cardinality is the failure mode.** Every unique label combination is a separate time series. Labels must come from small, fixed sets (route template, status class, provider name). Never use user IDs, raw URLs, error messages, or other unbounded values as labels — that belongs in logs.

```
OK as label:    route="/api/tasks/:id"   status_class="5xx"   provider="stripe"
NEVER a label:  user_id, email, request_id, full URL, error message text
```

Track averages never, percentiles always: an average hides the 1% of users having a terrible time. Use histograms and read p50/p95/p99.

### 5. Distributed tracing (deferred, O7)

Traces are deferred (O7). When a plan brings them into scope, use OpenTelemetry — it's the vendor-neutral standard, and auto-instrumentation covers HTTP, gRPC, and common DB clients with near-zero code:

```typescript
// tracing.ts — must be imported before anything else
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'checkout-service',
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

Add manual spans only around meaningful internal units of work (e.g., `applyDiscounts`, `chargeProvider`) and attach the attributes on-call will filter by. Propagate context across every async boundary — HTTP headers, queue message metadata — or the trace dies at the gap. Sample head-based at a low rate by default; keep 100% of errors if your backend supports tail sampling.

### 6. Alerting (at the milestone the plan names, O6, O7)

Alert on **symptoms users feel**, not on causes:

```
SYMPTOM (page-worthy):           CAUSE (dashboard, not a page):
error rate > 1% for 5 min        CPU at 85%
p99 latency > 2s                 one pod restarted
queue age > 10 min               disk at 70%
```

Cause-based alerts fire when nothing is wrong and miss failures you didn't predict. Symptom-based alerts fire exactly when users are hurt, regardless of the cause.

Rules for every alert you create:

1. **It must be actionable.** If the response is "ignore it, it self-heals", delete the alert.
2. **It has a threshold and duration** justified by the SLO (O8) or by historical data, not by a guess.
3. Use two severities only: **page** (user-facing, act now) and **ticket** (degradation, act this week). A third tier becomes noise that trains people to ignore everything.

### 7. Verify the telemetry itself

Instrumentation is code; it can be wrong. Before calling the work done, trigger the paths and look at the actual output:

- Force an error in staging → find it in the logs by `requestId`, confirm fields are structured (not `[object Object]`)
- Send test traffic → confirm metric series appear with the expected labels and sane values
- Fire each new alert once (lower the threshold temporarily) → confirm it reaches the right channel

## Review checklist

Reviewers flag observability that is **missing or redundant** (metrics, logs). Before opening a PR:

1. New endpoint / job / external call → rate, errors, duration, saturation metrics with bounded labels, and a test that they are emitted (O5).
2. Logs only at boundaries, transitions, and errors; none in loops or pure logic (O2, O1).
3. No PII, no secrets, no unbounded label values (O3, `coding-standards` C22).
4. Product/business metrics only if the PRD names them (O4, O5).
5. Alerts and dashboards land at the milestone the plan names; runbooks and traces stay deferred (O7, O6).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll add logging after it works" | "After" becomes "after the first incident", which is the most expensive moment to discover you're blind. Every task instruments what it ships (O5). |
| "More logs = more observability" | Unstructured noise makes incidents slower, not faster. Three queryable events beat three hundred prose lines (O1). |
| "A debug line inside the loop helps me trace it" | Nothing inside pure business logic, no per-iteration logs, nothing that duplicates a metric (O2). |
| "console.log is fine for now" | Unstructured output can't be filtered, correlated, or alerted on. The structured logger costs five extra minutes once. |
| "We can just look at the dashboards when something breaks" | Dashboards built without defined questions show you everything except the answer. Start from on-call questions. |
| "Metric emission can wait until the dashboards milestone" | Dashboards and alerts wait for the milestone; metric emission itself is always required (O6). |
| "A usage counter would be nice, let me add one" | Product and business metrics are decided by the PM and named in the PRD (O4, O5). |
| "Let's add a trace and a runbook while we're here" | Runbooks and traces are deferred; alerts land at the milestone the plan names, not before (O7). |
| "Alert on everything important, we'll tune later" | A noisy pager trains people to ignore it. The tuning never happens; the missed real page does. |
| "User ID as a metric label makes debugging easier" | It also makes your metrics backend fall over. High-cardinality lookups belong in logs (O3). |

## Red Flags

- A feature PR with retries, queues, or external calls and zero new telemetry (O5)
- A new endpoint, job, or external call without rate, errors, duration, saturation metrics or without a test that they are emitted (O5)
- Log lines built by string interpolation instead of structured fields
- A log line inside pure business logic or inside a loop, or one that duplicates a metric (O2)
- No correlation/request ID — each log line is an orphan
- One log stream fed by a scheduler, a webhook, and manual runs, with no field naming which one produced the line
- Metrics labeled with user IDs, raw URLs, or error message text (cardinality bomb) (O3)
- A product or business metric the PRD does not name (O4)
- Latency tracked as an average with no percentiles
- Alerts that fire daily and get acknowledged without action
- Alerts on causes (CPU, memory) paging humans while user-facing error rate is unmonitored
- Alerts, dashboards, runbooks, or traces added before the milestone the plan names (O6, O7)
- Secrets, tokens, or full request bodies appearing in logs (O3)
- "It works on my machine" as the only evidence a production feature is healthy

## Verification

After instrumenting a feature, confirm:

- [ ] The on-call questions for this feature are written down, and each signal maps to one
- [ ] All log output is structured (JSON), with stable event names and a correlation ID on every line, only at request/job boundaries, domain state transitions, and errors (O1, O2)
- [ ] Every log sink written by more than one entry point carries an entry-point field, set where the run starts and propagated with the correlation ID rather than inferred downstream
- [ ] No secrets, tokens, or unredacted PII in any log line (spot-check actual output) (O3)
- [ ] Rate, errors, duration, saturation metrics exist for every new endpoint, job, and external call, with bounded label sets, and a test proves they are emitted (O5)
- [ ] Product and business metrics match what the PRD names, nothing more (O4, O5)
- [ ] Latency is a histogram; p95/p99 are queryable
- [ ] Dashboards and alerts are present only if the plan names this milestone for them; every new alert is symptom-based and was test-fired once (O6, O7)
- [ ] A single request can be followed end-to-end in the tracing UI without broken spans
- [ ] An induced failure in staging was located via telemetry alone, without reading the source

For the at-a-glance version of this list, including the pre-launch instrumentation gate, see `../../references/observability-checklist.md`.
