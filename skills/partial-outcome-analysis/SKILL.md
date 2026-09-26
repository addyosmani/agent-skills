---
name: partial-outcome-analysis
description: Decides what happens when a dependency times out, stalls, or leaves an outcome unknown. Use when a call to a database, queue, or third-party API needs stated behavior for the slow, unreachable, and unknown cases, or when deciding whether a retry is safe.
---

# Partial Outcome Analysis

## Overview

Most outages are not caused by a failure nobody could have predicted. They are caused by a failure nobody **specified a behavior for** — the dependency timed out, and the code did whatever fell out of the control flow.

This skill is the discipline of enumerating the ways an operation can partially fail *before* writing the happy path, and deciding — deliberately, in writing — what happens in each case. An unspecified failure mode is not an edge case. It is a latent incident with a date on it.

The output is not a document for its own sake. It is a set of decisions that become code, tests, and alerts.

## When to Use

- Designing any feature that crosses a process, network, or service boundary
- Writing a design document or ADR for something with a dependency
- Reviewing code that calls a database, queue, cache, or third-party API
- After an incident, to find the sibling failures that have not happened yet
- Before adding a retry — retries change which failures are possible

**NOT for:**
- Diagnosing a failure happening right now — see `debugging-and-error-recovery`; this skill is what makes that triage fast next time
- Deciding retry counts, backoff, and circuit-breaker thresholds — that is a resilience concern; this skill decides *whether a retry is even safe*
- Making a repeated effect harmless — see the idempotency-key section of `api-and-interface-design`, which owns the implementation this skill keeps asking for
- Designing telemetry — see `observability-and-instrumentation`. This skill tells you *what* must be observable; instrumenting it is separate

## Process

### 1. Draw the boundaries

List every hop where the operation can fail **independently of the caller**. A boundary is anywhere the failure can happen without your code being told.

```
POST /checkout
  ├─ 1. auth service        (network)
  ├─ 2. inventory DB        (network + disk)
  ├─ 3. payment provider    (network, third-party, irreversible)
  ├─ 4. order write         (network + disk)
  ├─ 5. confirmation email  (network, third-party, externally visible)
  └─ 6. analytics event     (network, best-effort)
```

Boundaries you do not list are boundaries you do not handle. In-process function calls are not boundaries; anything with a socket is.

### 2. Fill the three-outcome table

For every boundary, every call has three outcomes — not two:

| | Success | Failure | **Unknown** |
|---|---|---|---|
| 3. payment provider | record charge | show error, no order | **?** |

The **unknown** column is the one that matters, and the one usually left blank. A timeout, a dropped connection, a process killed mid-write — you do not know whether the operation applied. "Failure" and "unknown" are different states and must produce different behavior.

**A blank cell is the finding.** Do not move on until every cell has a decision. If the answer is genuinely "we accept the risk", write that down — an accepted risk is a decision; an empty cell is an accident waiting.

For the unknown cell, exactly three answers are legitimate:

1. **Make it safe to repeat** — an idempotency key, so retrying is harmless. Preferred. See `api-and-interface-design` for deriving and honouring the key.
2. **Make it detectable** — record intent before the call so reconciliation can resolve it later.
3. **Make it impossible** — collapse the boundary, e.g. move the write into the same transaction.

"Retry and hope" is not on the list.

### 3. Classify the blast radius

For each failure, ask what *else* breaks:

| Radius | Meaning | Example |
|---|---|---|
| **Contained** | This request fails; nothing else notices | One checkout returns 503 |
| **Shared-resource** | Failure consumes capacity others need | Slow dependency exhausts the connection pool |
| **Cascading** | Failure propagates to callers of callers | Retry storm takes down a healthy dependency |
| **Corrupting** | Failure leaves persistent wrong state | Payment captured, order never written |

Contained failures are cheap. **Corrupting failures are the expensive ones**, and they are the ones a happy-path-first design produces, because the corruption happens in the gap between two boundaries.

Shared-resource is the most under-estimated: a dependency that is *slow* is often more dangerous than one that is *down*, because a down dependency fails fast while a slow one holds your threads until nothing is left.

### 4. Write the degradation ladder

Decide what the system does as conditions worsen, and what triggers each step:

```
FULL         all dependencies healthy
  ↓          recommendations service p99 > 1s, or error rate > 5%
DEGRADED     serve checkout without recommendations
  ↓          inventory DB read replica lag > 30s
READ-ONLY    browse and read; no new orders
  ↓          payment provider unreachable for > 2 min
FAIL-CLOSED  reject checkout with a clear message; do not queue silently
```

Two rules:

- **Every transition needs a measurable trigger.** "If things look bad" is not a trigger; a threshold on a metric you already emit is.
- **Fail-closed is a legitimate destination**, and for anything touching money it is usually the right one. Silently queueing work you cannot complete converts an outage into a data problem.

### 5. Specify the failure's user-visible contract

Decide what the caller sees, and make it honest:

- Which status code, and does it mean "retry this" or "do not retry this"?
- Is the error message diagnosable, or does it assert a cause you have not established?
- Is a partial success reported as success? (It should not be.)

A misleading error costs more than no error. An operator who trusts a wrong message investigates the wrong system.

### 6. Write the injection plan

Every specified behavior needs a test that proves it. Name the mechanism per boundary:

| Failure | How to inject |
|---|---|
| Dependency down | Point at a closed port |
| Dependency slow | Proxy with added latency; assert your timeout fires first |
| Dependency returns garbage | Stub returning malformed payload |
| Unknown outcome | Kill the process between effect and record |
| Partial write | Fail the second of two writes |

If a failure mode cannot be injected, it cannot be tested, and the specified behavior is a guess. Say so explicitly rather than pretending otherwise.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "That dependency has never gone down" | Then you have no evidence about what happens when it does. Absence of an incident is not evidence of handling. |
| "The retry will handle it" | Retries handle *failure*. They amplify *unknown* into duplicates, and amplify *slow* into a thundering herd. |
| "We'll add error handling once it works" | The happy path is the easy 20%. Retrofitting failure handling means rediscovering every boundary decision without the design context. |
| "It's an internal service, it's reliable" | Internal networks partition, deploys restart pods mid-request, and internal callers retry more aggressively because it feels free. |
| "If that fails we have bigger problems" | Frequently true and never a design. Write down what happens, even if the answer is "the whole request fails, loudly". |
| "This is over-engineering for our scale" | The table costs an hour. Scale determines *how much* you invest in each cell, not whether you fill it in. |
| "The framework handles timeouts" | It handles *its* timeout, with a default you did not choose, which is usually longer than your caller's patience. |

## Red Flags

- A design document describing only the successful sequence
- Any external call with no timeout, or a timeout longer than the caller's
- A three-outcome table where the "unknown" column is empty or says "shouldn't happen"
- Retry added to an operation nobody has confirmed is idempotent
- `except Exception: pass`, or a catch that logs and continues into code assuming success
- Error messages asserting a cause the code has not established
- A degradation plan whose triggers are human judgement rather than metrics
- Failure paths with no test — especially the partial-write case
- Two writes to different systems with no story for the second one failing

## Verification

The analysis is complete when:

1. **Every boundary is listed**, and the list matches what the code actually calls — grep for clients and sockets and compare.
2. **Every cell in every three-outcome table has a written decision**, including accepted risks.
3. **Every "unknown" cell resolves to safe-to-repeat, detectable, or impossible** — never to "retry and hope".
4. **Every retry has a stated reason to believe the operation is idempotent**, with a pointer to what makes it so.
5. **Every degradation transition has a metric and a threshold** that exist today.
6. **Every specified behavior has a test that injects that failure**, and each test fails if you delete the handling it defends.
7. **Blast radius is classified per failure**, and every corrupting failure has either been eliminated or has a detection mechanism.

The exit criterion is the one this pack applies everywhere else: *if you cannot point at a test that fails when the handling is removed, the behavior is unspecified, whatever the document says.*
