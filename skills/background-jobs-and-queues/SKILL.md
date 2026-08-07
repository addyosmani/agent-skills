---
name: background-jobs-and-queues
description: Guides reliable background job and queue design. Use when offloading work from request path, designing retries, idempotency, dead-letter handling, or scheduling async tasks.
---

# Background Jobs and Queues

## Overview

Async jobs keep request latency low and absorb spikes, but poorly designed jobs cause duplicate side effects, poison queues, and silent data loss. Design jobs to be idempotent, observable, and bounded in failure.

## When to Use

- Moving slow or unreliable work off the HTTP/request path
- Designing retry policies, backoff, and dead-letter queues
- Implementing email, webhooks, imports, thumbnails, settlements, etc.
- Debugging duplicate processing or stuck jobs
- Choosing queue semantics (at-least-once vs effectively-once via idempotency)

**Not for:** pure cron one-liners with no side effects, or real-time streaming architectures (different toolset).

## Core Principles

### 1. Assume at-least-once delivery

Most queues deliver at-least-once. Design handlers so duplicate execution does not corrupt state. Use idempotency keys or natural unique constraints.

### 2. Keep payloads small and stable

Store IDs and minimal parameters in the job; load fresh state inside the worker. Large blobs in queues make retries and versioning painful.

### 3. Explicit retry taxonomy

- Transient errors → retry with exponential backoff + jitter
- Permanent / validation errors → do not retry endlessly; dead-letter or mark failed
- Poison messages → isolate after N attempts

### 4. Visibility timeout / lease discipline

Workers must finish or heartbeat within the lease. Otherwise another worker may process the same job → duplicates.

### 5. Observability is mandatory

Track: enqueue rate, processing latency, success/fail, retry count, DLQ depth, oldest job age. Alert on DLQ growth and stuck age.

### 6. Side effects need receipts

For emails, payments, webhooks: record a durable "already done" marker keyed by idempotency key before or after the external call according to a clear exactly-once *effect* strategy.

## Recommended Job Handler Shape

1. Parse/validate payload.
2. Check idempotency / short-circuit if already completed.
3. Perform work (preferably transactional with state update).
4. Mark complete.
5. On failure, throw typed error that maps to retry vs dead-letter.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Duplicates are unlikely" | They happen under retries and deploys. Design for them. |
| "Just retry forever" | Poison messages will clog the queue. Cap attempts. |
| "Put the whole record in the job JSON" | Schema drift and size problems follow. Pass IDs. |
| "We'll notice failures from user reports" | DLQ metrics exist so users are not your monitor. |

## Red Flags

- Handlers that are not safe under double execution
- Infinite retries with no DLQ
- No metrics on queue lag or failure rate
- Jobs that must run exactly once but have no idempotency key
- Doing multi-minute work inside a web request instead of a job

## Verification

- [ ] Handler is idempotent or guarded by unique constraints
- [ ] Retry vs permanent failure paths are explicit
- [ ] DLQ (or equivalent) exists and is monitored
- [ ] Payloads are minimal and version-tolerant
- [ ] Leases/visibility timeouts match worst-case runtime
- [ ] Critical side effects have durable receipts
