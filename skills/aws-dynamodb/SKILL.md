---
name: aws-dynamodb
description: "DynamoDB table design, access patterns, conditional writes, and throughput scaling. Use when implementing state stores, idempotency records, or high-scale key-value workflows. Triggers: dynamodb, partition key, conditional write, ttl, throughput."
argument-hint: "DynamoDB schema or query pattern task"
---

# AWS DynamoDB

## Use This Skill For

- Table and index design from access patterns
- Conditional writes and state transitions
- Idempotency and workflow status tracking
- Capacity planning and hot partition mitigation

## Guardrails

1. Model by access pattern, not by normalized entities.
2. Use conditional writes for workflow correctness.
3. Define TTL strategy for ephemeral records.
4. Monitor throttling and partition heat continuously.
