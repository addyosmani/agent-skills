---
name: Kakunin Compliance Guard
description: >
  Use when an AI agent must verify its certificate scope before a privileged
  action, check behavioral risk score before committing a transaction, or emit
  a compliant audit event for EU AI Act Article 12 logging. Prevents
  unauthorized agent actions and builds tamper-evident audit trails.
tags: [compliance, ai-agents, mica, eu-ai-act, x509, scope-check, identity, audit]
lifecycle: build
---

## Overview

Kakunin provides cryptographic identity (X.509 certificates) and behavioral
accountability for autonomous AI agents operating in regulated industries
(fintech, healthcare, legal). This skill covers the three core guard patterns:
scope verification before action, risk score check before high-stakes
operations, and audit event emission for compliance logging.

## When to Use

- Agent is about to execute a **privileged action** (financial trade, data
  mutation, API call with side effects) and needs authorization proof
- Agent needs to **check its own risk score** before a high-stakes operation
  (auto-revocation triggers at score ≥ 0.85)
- Any agent action needs to be written to an **immutable audit trail** for EU
  AI Act Article 12 or MiCA compliance
- Receiving system needs to **verify a remote agent's certificate** before
  trusting its signed message or delegating a task

## Process

### 1. Scope Verification (pre-action guard)

```python
# Python — kakunin SDK
from kakunin import Kakunin
from kakunin.integrations.scope import verify_agent_scope

client = Kakunin(api_key="kak_live_...")

@verify_agent_scope(client, agent_id="agt-123", required_scopes=["trade.execute"])
async def execute_trade(order: dict) -> dict:
    # Only runs if agent has trade.execute in its certificate scope
    ...
```

```typescript
// TypeScript — Vercel AI SDK
import { createKakuninTools } from '@kakunin/ai-sdk';
import { generateText } from 'ai';

const tools = createKakuninTools({ apiKey: 'kak_live_...', agentId: 'agt-123' });
// checkAgentScope tool available to the model
```

### 2. Risk Score Check (pre-transaction)

```python
result = await client.agents.get("agt-123")
score = result.metadata.get("risk_score", 0)
if score >= 0.75:
    raise RuntimeError(f"Agent risk score {score} too high — aborting trade")
```

### 3. Audit Event Emission (post-action)

```python
await client.events.create(
    agent_id="agt-123",
    action_type="transaction_initiated",   # one of 10 canonical types
    details={"order_id": "ORD-9921", "amount": 50000},
)
# Fire-and-forget — never blocks execution path
```

### 4. Certificate Verification (receiver side)

```bash
# Public endpoint — no auth, <500ms p99
curl https://api.kakunin.ai/v1/verify/{serial_number}
# Returns: status, scopes, valid_until, revocation_history
```

## Canonical Event Types

Use exactly these strings for `action_type` (other values are rejected):

`api_call` · `authentication_attempt` · `authentication_failure` ·
`data_access` · `data_mutation` · `transaction_initiated` ·
`transaction_anomaly` · `unauthorized_access_attempt` ·
`message_signed` · `message_verification_failed`

## Red Flags

- **Scope check skipped** — agent executes privileged action without verifying
  its certificate scope → unauthorized action, no audit trail
- **Risk score ignored** — agent at score ≥ 0.85 proceeds with transaction →
  Kakunin auto-revokes certificate mid-execution, partial state
- **Event emission awaited inline** — blocks execution path; always
  fire-and-forget (wrap in `try/catch`, never `await` in hot path)
- **Using `anon` role** with Supabase RLS + Kakunin → grants public access to
  certificate metadata; always use `authenticated` role
- **Hardcoding `kak_test_` key in production** → sandbox CA, certificates not
  recognized by verifiers

## Verification

After integrating, confirm the guard works end-to-end:

```bash
# 1. Verify the agent is active with expected scopes
curl -H "Authorization: Bearer kak_live_..." \
  https://www.kakunin.ai/api/v1/agents/agt-123

# 2. Check a scope — expect {"allowed": true, ...}
curl -H "Authorization: Bearer kak_live_..." \
  https://api.kakunin.ai/v1/verify/CERT_SERIAL

# 3. Confirm event appears in audit log
curl -H "Authorization: Bearer kak_live_..." \
  "https://www.kakunin.ai/api/v1/audit-log?agent_id=agt-123&limit=5"
```

## Resources

- Docs: https://kakunin.ai/docs
- API reference: https://kakunin.ai/docs/api-reference
- Sandbox keys (free, 100 certs/day): https://kakunin.ai/dashboard
- MCP server: `POST https://www.kakunin.ai/api/mcp` (tools/list, tools/call)
- Python SDK: `pip install kakunin`
- TypeScript SDK: `npm install @kakunin/sdk`
- Vercel AI SDK tools: `npm install @kakunin/ai-sdk`
- Mastra integration: `npm install @kakunin/mastra`
