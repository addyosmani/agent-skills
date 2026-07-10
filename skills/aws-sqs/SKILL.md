---
name: aws-sqs
description: "SQS queue design for async workflows, retries, DLQ handling, and idempotent workers. Use when building or troubleshooting background processing pipelines. Triggers: sqs, queue, dlq, retry policy, async worker."
argument-hint: "SQS workflow design or queue incident"
---

# AWS SQS

## Use This Skill For

- Queue and DLQ configuration
- Retry and visibility timeout tuning
- Worker idempotency and duplicate handling
- Backlog recovery and replay runbooks

## Guardrails

1. Set explicit retry and DLQ policies.
2. Use idempotency keys in all worker paths.
3. Tune visibility timeout to real processing time.
4. Define replay procedures before incidents occur.
