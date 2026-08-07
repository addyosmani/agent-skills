---
name: dapp-transaction-ux
description: Guides reliable, honest transaction UX for Solana (and similar) dApps. Use when building wallet connect flows, transaction previews, confirmation states, error surfaces, or any user-facing sendTransaction path.
---

# dApp Transaction UX

## Overview

Users abandon or get drained by unclear transaction flows. Good dApp UX makes every signature intentional, every pending state truthful, and every failure actionable. This skill covers wallet connection, simulation, preview, send, confirmation, and error recovery for Solana-style transactions.

## When to Use

- Implementing or refactoring wallet connect + sendTransaction
- Designing transaction preview / simulation UI
- Handling confirmation, timeouts, and dropped transactions
- Surfacing program errors and wallet rejection cleanly
- Building multi-step or partial-sign flows

**Not for:** on-chain program logic itself (use `solana-program-engineering`) or generic React component styling.

## Core Principles

### 1. Never surprise-sign

Every signature request must show:
- What will change (human summary)
- Who is paying fees / rent
- Which accounts are writable / signers (at least at a high level)
- Estimated fee + priority fee if set

Prefer wallet simulation + your own preflight summary over "Confirm in wallet" with no context.

### 2. Separate "built" from "sent" from "confirmed"

States that must be distinct in UI and logic:
- Idle / building
- Awaiting signature
- Submitted (signature known)
- Confirming (commitment level)
- Confirmed / finalized
- Failed (with reason)
- Timed out / unknown (need status poll or explorer link)

Do not collapse "submitted" and "confirmed".

### 3. Simulation before signature when possible

- Run `simulateTransaction` (or wallet simulation) with the same configuration you will send.
- Surface program logs and unit consumption when useful for power users.
- Block clearly failing simulations; warn on borderline ones.

### 4. Errors must be mapped, not raw

Map common wallet and program errors to short, honest messages:
- User rejected
- Insufficient SOL / token balance
- Blockhash expired
- Program custom error (decode known codes)
- RPC / network failure
- Already processed

Always offer: retry (when safe), explorer link, and copy signature.

### 5. Idempotency and retries

- Prefer durable nonces or careful blockhash refresh strategies for long-lived flows.
- On retry, rebuild with a fresh blockhash unless you intentionally use a nonce.
- Never double-submit the same logical action without a clear user intent (or an on-chain idempotency key).

### 6. Priority fees and compute are product decisions

Expose a simple default that works under load. Advanced users can override. Do not silently underprice during congestion and then blame the network.

## Recommended Flow

1. Build transaction (recent blockhash, fee payer, instructions).
2. Simulate.
3. Show preview (summary + fee + risk notes).
4. Request signature.
5. Send raw transaction with explicit preflight / skipPreflight policy.
6. Track signature to desired commitment.
7. Update UI from confirmation or mapped error.
8. Provide explorer link and next-step CTA.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Wallet already shows the transaction" | Most users do not understand account lists. You still owe a human summary. |
| "We'll just toast 'Transaction sent'" | Sent ≠ confirmed. Users will refresh and panic. |
| "Raw program logs are fine" | Decode known errors; hide noise; keep a "details" expand. |
| "Retry with the same blockhash" | Expired blockhash is one of the top failure modes. Rebuild. |

## Red Flags

- Single "Loading..." state that covers sign + send + confirm
- No simulation step on value-moving transactions
- Ignoring `User rejected the request` as a hard error with scary messaging
- No explorer link after submit
- Silent retry loops that can double-spend user intent
- Fee estimation that is never shown

## Verification

- [ ] Preview shows human summary + fee before signature
- [ ] UI distinguishes submitted vs confirmed vs failed
- [ ] User rejection is a calm, non-alarming path
- [ ] Known program errors are decoded
- [ ] Explorer link is available after submit
- [ ] Retry rebuilds blockhash (or uses nonce correctly)
- [ ] Simulation runs on critical paths
