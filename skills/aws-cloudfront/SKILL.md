---
name: aws-cloudfront
description: "CloudFront CDN and edge protection patterns for caching, origin routing, and DDoS-adjacent controls. Use when configuring CloudFront in front of app or proxy infrastructure. Triggers: cloudfront, cdn, edge cache, origin behavior, ddos edge."
argument-hint: "CloudFront architecture or troubleshooting task"
---

# AWS CloudFront

## Use This Skill For

- Distribution design and origin strategy
- Cache behavior and invalidation strategy
- Header/query/cookie forwarding trade-offs
- Edge-layer traffic protection and performance tuning

## Guardrails

1. Keep cache keys minimal and intentional.
2. Verify origin failover behavior before release.
3. Separate static and dynamic cache policies.
4. Track cache-hit and origin error rates after changes.
