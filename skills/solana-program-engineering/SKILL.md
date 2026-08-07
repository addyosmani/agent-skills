---
name: solana-program-engineering
description: Guides correct, secure Solana program design with Anchor or native. Use when writing or reviewing Solana programs, designing account structures, PDAs, CPIs, instruction handlers, or when hardening on-chain logic against common exploits.
---

# Solana Program Engineering

## Overview

Write Solana programs that are correct under concurrency, explicit about account ownership and authority, and resistant to the most common on-chain failure modes. Prefer Anchor for most application programs; drop to native only when you need control Anchor cannot give cleanly.

## When to Use

- Designing or implementing a new Solana program / instruction set
- Reviewing account layouts, PDA seeds, or CPI graphs
- Adding authority checks, reentrancy guards, or economic invariants
- Writing or improving program tests (LiteSVM, banks-client, mollusk)
- Auditing for classic Solana footguns (missing signer, wrong owner, account confusion)

**Not for:** pure frontend wallet UX (use `dapp-transaction-ux`), generic API design, or non-Solana chains.

## Core Principles

### 1. Accounts are the API

Every meaningful state change must be expressed through explicit accounts. If an instruction needs data or authority, it must appear in the accounts list. Never hide critical state in "magic" global accounts without documenting the seeds and bump.

### 2. PDAs must be deterministic and collision-resistant

- Seeds should include a domain separator + unique business key (e.g. `b"escrow"`, maker, mint, nonce).
- Always store and verify the bump.
- Never derive a PDA with user-controlled seeds that can collide with system or other program accounts.

### 3. Authority is explicit and checked early

```rust
// Pattern: check signer + expected authority account before any mutation
require_keys_eq!(ctx.accounts.authority.key(), expected_authority);
require!(ctx.accounts.authority.is_signer, ErrorCode::Unauthorized);
```

Prefer `has_one` / constraint macros in Anchor. Fail closed.

### 4. CPI is a trust boundary

- Validate the target program ID.
- Pass only the accounts the callee actually needs.
- Assume the callee can read everything you pass; do not pass privileged accounts "just in case".
- Prefer invoker-signed PDAs over user-signed authorities when the program itself should own the action.

### 5. Economic and state invariants belong on-chain

If a rule must never be violated (balances, supply, status transitions), enforce it in the program. Off-chain checks are UX, not safety.

### 6. Close accounts cleanly

When an account is no longer needed, zero data (or use `close` constraint), return lamports to a documented recipient, and prevent revival attacks (re-init after close).

## Account Design Checklist

- [ ] Discriminator / account type is checked on every load
- [ ] Owner is the expected program
- [ ] Space is calculated correctly (including discriminator + padding)
- [ ] Realloc paths are bounded and paid by the correct party
- [ ] Init / init_if_needed paths cannot be front-run into a bad state
- [ ] Seeds + bump are stored or re-derived and verified on sensitive paths

## Common Solana Footguns

| Footgun | Reality |
|---|---|
| Missing `is_signer` on authority | Anyone can call the instruction |
| Wrong account owner check | Attacker substitutes a look-alike account |
| PDA seeds without domain separator | Cross-protocol collision risk |
| Unchecked CPI program ID | Attacker redirects to malicious program |
| Closing without zeroing / preventing re-init | Revival / lamport drain patterns |
| Relying on `remaining_accounts` without strict validation | Account confusion |
| Using `AccountInfo` when typed accounts suffice | Easy to skip owner/discriminator checks |

## Testing Expectations

- Unit-test instruction handlers with LiteSVM or banks-client style frameworks.
- Cover: happy path, wrong signer, wrong owner, bad PDA, arithmetic edge cases, close + re-init, CPI failure modes.
- Prefer deterministic clock/slot control for time-dependent logic.
- Keep a small set of integration tests that exercise the real account graph.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll add the authority check later" | Later never comes; ship the check with the mutation. |
| "Anchor constraints are enough, no need for extra requires" | Constraints are great; still verify critical invariants in handler logic where clarity matters. |
| "This account is only used internally" | If it is in the accounts list, it is part of the public surface. |
| "Tests on localnet are enough" | Localnet hides slot/ordering and some runtime edge cases. Add targeted simulation tests. |

## Red Flags

- Instructions that mutate state without a clear signer or PDA authority
- PDAs derived from purely user-supplied seeds with no domain separator
- CPI to a program ID taken from an account instead of a constant / allow-list
- `init_if_needed` without a clear uniqueness story
- Closing accounts but leaving residual data or allowing immediate re-init by an attacker
- No tests for unauthorized and wrong-account cases

## Verification

- [ ] Every state-mutating instruction has an explicit, tested authority path
- [ ] PDA seeds + bumps are documented and verified
- [ ] CPI targets are constrained
- [ ] Close paths return lamports and prevent revival
- [ ] Negative tests exist for wrong signer / wrong owner / bad seeds
- [ ] Account space and discriminators are correct
