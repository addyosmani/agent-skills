---
name: solana-rpc-resilience
description: Guides resilient Solana RPC and data access patterns under rate limits, forks, lagging nodes, and partial failures. Use when building backends, indexers, bots, or dApp servers that talk to Solana RPC or third-party providers.
---

# Solana RPC Resilience

## Overview

Solana RPC is not a local database. Nodes lag, rate-limit, fork, and occasionally return inconsistent views. Production systems need explicit strategy for retries, commitment, multi-provider failover, and verification of critical reads.

## When to Use

- Building backends, bots, indexers, or API proxies that call Solana RPC
- Handling 429s, timeouts, stale blockhashes, or inconsistent account reads
- Choosing commitment levels and confirmation strategies
- Designing multi-provider or fallback RPC routing
- Debugging "it worked on my RPC" production issues

**Not for:** pure on-chain program logic or frontend wallet adapter wiring alone.

## Core Principles

### 1. Treat every RPC call as fallible

Timeouts, 429, 5xx, and malformed payloads are normal. Wrap clients with:
- deadlines
- bounded retries with jitter
- error classification (retryable vs not)

### 2. Commitment is a product choice

- `processed` — fastest, least safe for value decisions
- `confirmed` — common default for UX
- `finalized` — preferred for settlement, credits, and irreversible actions

Do not mix commitments carelessly across a single business flow.

### 3. Critical writes need confirmation policy

After `sendTransaction`:
- track signature status to the required commitment
- handle `blockhash not found` / expired
- handle `already processed`
- surface unknown/timeout as a distinct state (do not pretend success)

### 4. Multi-provider and failover

- Prefer an explicit primary + fallback list over a single URL
- Health-check or circuit-break bad providers
- Do not assume two providers always agree at `processed`
- For safety-critical reads (balances before transfer), verify with the commitment you trust or cross-check

### 5. Rate limits are design constraints

- Batch where the API allows
- Cache immutable or slowly changing data (mint metadata, program IDL hashes)
- Coalesce identical in-flight reads
- Back off on 429; respect provider limits instead of hammering

### 6. Indexers and bots need cursor discipline

- Store signatures / slots checkpoints durably
- Make replay idempotent
- Prefer finality-aware cursors for money movement

## Practical Patterns

**Blockhash freshness:** fetch a recent blockhash close to send time; rebuild on expiry.

**Account reads before action:** read at the commitment you will use for the decision; avoid acting on `processed` if you settle on `finalized`.

**Proxy / gateway:** centralize retries, API keys, and observability in one place (your own RPC proxy) rather than scattering them in every service.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Public RPC is fine for production" | It will rate-limit and flake under load. Plan providers and fallbacks. |
| "If sendTransaction returned a signature, we're done" | You still need confirmation tracking. |
| "Retry immediately on every error" | Amplifies outages. Classify + jitter + budget. |
| "Any node is fine for balance checks" | Lagging nodes cause double-spend style UX bugs. |

## Red Flags

- Single RPC URL with no fallback
- No distinction between retryable and permanent errors
- Treating submitted signatures as settled funds
- Unbounded retry loops on 429
- Mixing commitment levels inside one financial flow without documentation
- Indexer checkpoints only in memory

## Verification

- [ ] RPC client has timeouts, bounded retries, and error classification
- [ ] Commitment levels are explicit per use case
- [ ] send + confirm flow handles expiry and already-processed
- [ ] Fallback providers or clear degradation mode exist
- [ ] 429 paths back off
- [ ] Critical financial reads use an appropriate commitment
- [ ] Observability shows provider, method, latency, and error class
