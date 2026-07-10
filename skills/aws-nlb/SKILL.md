---
name: aws-nlb
description: "AWS Network Load Balancer patterns for L4 ingress, target groups, health checks, and failover behavior. Use when designing or troubleshooting NLB-backed traffic paths. Triggers: nlb, network load balancer, target group, l4 ingress."
argument-hint: "NLB setup or troubleshooting request"
---

# AWS NLB

## Use This Skill For

- L4 ingress architecture and target-group mapping
- Health check and failover tuning
- TLS pass-through or termination strategy boundaries
- Multi-AZ traffic resilience and recovery behavior

## Guardrails

1. Align target health checks with real application readiness.
2. Document fail-open or fail-closed expectations.
3. Validate connection draining behavior before cutover.
4. Test failover under load before production rollout.
