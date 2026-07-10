---
name: envoy-proxy
description: "Envoy proxy architecture, xDS control-plane patterns, listener/route/cluster design, and safe config rollout. Use when implementing, reviewing, or troubleshooting Envoy-based edge or service-mesh traffic flows. Triggers: envoy, xds, listener, route config, control plane, proxy rollout."
argument-hint: "Question or task involving Envoy config, control plane, or traffic policy"
---

# Envoy Proxy

## Use This Skill For

- Envoy listener, route, and cluster configuration
- Dynamic config distribution with xDS-style control planes
- Edge traffic policy (timeouts, retries, headers, auth hooks)
- Safe config rollout, canary, and rollback strategy

## Guardrails

1. Validate config schema before publish.
2. Roll out changes in phases and monitor NACK/error thresholds.
3. Keep last-known-good config and define rollback conditions.
4. Separate tenant policy from shared platform defaults.
