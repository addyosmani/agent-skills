---
name: aws-route53
description: "Route 53 DNS and routing policy patterns, including weighted and failover records. Use when managing service discovery, cutovers, or DNS validation workflows. Triggers: route53, dns, hosted zone, cname, weighted routing, failover dns."
argument-hint: "Route53 or DNS routing task"
---

# AWS Route 53

## Use This Skill For

- Hosted zone and record management
- Weighted/latency/failover policy rollout
- DNS cutover planning and rollback
- Health check-backed DNS failover

## Guardrails

1. Verify TTL strategy before planned cutovers.
2. Use staged weighted routing when risk is non-trivial.
3. Confirm record propagation and endpoint readiness together.
4. Keep DNS ownership and change history auditable.
