---
name: inter-agent-protocol-verification
description: Guides agents through multi-agent communication graph auditing and typed payload contract enforcement. Use when connecting multiple specialist agents or deploying multi-agent orchestrations.
---

# Inter-Agent Protocol Verification (A2A)

## Overview
Unconstrained communication between multiple autonomous agents leads to severe vulnerabilities, including runaway token loops, lateral privilege escalation, and deadlocks. This skill enforces a strict verification workflow across multi-agent graphs to guarantee strongly-typed contracts and cryptographic handshake integrity.

## When to Use
- Connecting multiple specialized agent personas (e.g., using CrewAI, AutoGen, or LangGraph)
- Defining message payloads, inter-agent RPC boundaries, or state handoffs
- Orchestrating multi-agent workflows across decentralized or siloed repositories
- Auditing shared memory spaces or collaborative reasoning loops

**When NOT to use:** Developing standalone, single-agent utility scripts with no inter-agent communication.

## The Gated Workflow

Follow these four linear phases to validate inter-agent protocol integrity.

```
MAP-AGENTS ──→ TRACE-HANDSHAKE ──→ DETECT-LOOPS ──→ ENFORCE-CONTRACT
```

### Phase 1: Map Agents
Construct a comprehensive directed graph of all participating agent nodes, tracing their permitted message pathways, shared context windows, and tool access scopes.

### Phase 2: Trace Handshake
Inspect the authentication and validation mechanisms used during inter-agent communication. Assert that payloads are verified via cryptographically signed identity tokens (e.g., MuTI JWT handshakes).

### Phase 3: Detect Loops
Analyze the message routing topology to identify potential circular dependencies, redundant bidirectional queries, and infinite retry deadlocks.

### Phase 4: Enforce Contract
Inject explicit schema definitions (e.g., strict Pydantic models) to type-check all inter-agent message payloads at runtime.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The agents will communicate naturally in plain text." | Unconstrained multi-agent dialogue leads to unbounded token usage, hallucinated instructions, and lateral privilege escalation. Communication must follow a verified, strongly-typed contract. |
| "Adding strict schemas makes it too hard for agents to collaborate." | Typed contracts ensure predictable, secure execution. Ambiguous conversational handoffs lead to broken state transitions and silent data corruption. |
| "We can just trust the internal agents since they belong to our fleet." | Internal trust boundaries are easily compromised via prompt injection. Every inter-agent boundary must be treated as an untrusted verification checkpoint. |

## Red Flags
- Allowing agents to pass raw, unvalidated string outputs directly into another agent's execution context
- Structuring multi-agent workflows without explicit maximum recursion or turn-limit parameters
- Omitting cryptographic verification from cross-repository or cross-network agent handshakes

## Verification
After verifying the multi-agent graph, confirm:
- [ ] All inter-agent communication pathways adhere to explicit, strongly-typed payload schemas
- [ ] Automated interaction tests assert zero circular communication loops or deadlocks
- [ ] Cryptographic identity verification (MuTI JWT) is enforced at all critical agent boundaries
- [ ] Execution graphs enforce explicit token ceilings and maximum turn thresholds
