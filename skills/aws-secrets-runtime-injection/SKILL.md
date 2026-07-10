---
name: aws-secrets-runtime-injection
description: "Runtime secret delivery patterns for AWS-hosted services using least-privilege access and rotation-safe reload behavior. Use when designing secret handling for immutable host pipelines. Triggers: secrets manager, ssm parameter store, runtime secrets, secret rotation."
argument-hint: "Secret injection or rotation design question"
---

# AWS Secrets Runtime Injection

## Use This Skill For

- Secrets Manager and Parameter Store retrieval patterns
- Runtime secret injection for app and proxy processes
- Rotation cadence and no-downtime reload behavior
- IAM least-privilege policy shaping for secret access

## Guardrails

1. Never commit or bake secrets in images/artifacts.
2. Scope secret read permissions per service role.
3. Validate secret presence at startup with clear failures.
4. Test rotation without full host replacement.
