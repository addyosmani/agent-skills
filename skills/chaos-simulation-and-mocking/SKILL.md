---
name: chaos-simulation-and-mocking
description: Guides agents through deterministic tool mocking and chaos proxy simulation. Use when writing integration tests, deploying tool wrappers, or validating fallback logic under restricted VPCs.
---

# Chaos Proxy & Resilient Simulation

## Overview
External APIs and third-party dependencies are inherently unreliable in production, suffering from rate limits, network partitions, and strict corporate proxy firewalls. This skill mandates wrapping tool execution in deterministic mocking layers to simulate chaos, proving the agent's fallback mechanisms degrade gracefully.

## When to Use
- Developing or testing tool wrappers and external API client integrations
- Verifying error recovery, exponential backoff, or fallback mechanisms
- Deploying agents into restricted corporate VPCs or behind strict ECP proxies
- Designing multi-cloud failover or secondary provider routing logic

**When NOT to use:** Developing pure internal UI layouts or non-networked data models.

## The Gated Workflow

Follow these four linear phases to ensure robust simulation depth.

```
MAP-DEPENDENCIES ──→ INJECT-CHAOS-PROXY ──→ SIMULATE-LATENCY ──→ ASSERT-FALLBACKS
```

### Phase 1: Map Dependencies
Identify all external network boundaries, third-party API calls, and platform SDK initializations within the target module.

### Phase 2: Inject Chaos Proxy
Configure a deterministic interceptor (e.g., Promptfoo custom providers or local HTTP mocking adapters) to sit between the application logic and the external network.

### Phase 3: Simulate Latency
Execute the test suite under explicit adversarial conditions:
1. Inject simulated 401/403 authentication failures.
2. Introduce artificial connection latency exceeding standard timeout ceilings.
3. Simulate dropped packets and rate-limit response codes (429).

### Phase 4: Assert Fallbacks
Verify that the application logic intercepts the injected errors, triggers exponential backoff retries, or safely diverts execution to secondary fallback providers.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The external API works perfectly on my local machine." | Local testing ignores production reality. Intermittent timeouts, restricted corporate firewalls, and provider outages are inevitable. Fallbacks must be proven. |
| "Mocking all external endpoints takes too much extra effort." | Unmocked external dependencies cause flaky CI builds and mask critical failure modes. Deterministic mocking ensures reliable, reproducible test suites. |
| "We can just log the error and let the human handle it." | Autonomy requires robust self-recovery. Agents must attempt safe fallbacks before escalating to manual operator intervention. |

## Red Flags
- Writing integration tests that make live network calls without accompanying mocked offline tests
- Failing to assert specific timeout parameters on external client instantiations
- Catching generic exceptions without executing proper retry or diversion paths

## Verification
After completing the simulation setup, confirm:
- [ ] All external dependencies are wrapped in deterministic mocking proxies
- [ ] The test suite successfully verifies behavior under artificial latency and 429/500 responses
- [ ] Fallback pathways and graceful degradation logic are explicitly proven via test assertions
- [ ] No unmocked external network traffic leaks during offline verification cycles
