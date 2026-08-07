---
name: feature-flags
description: Guides safe use of feature flags and progressive delivery. Use when introducing flags, gating risky changes, running experiments, or cleaning up stale flags that create technical debt.
---

# Feature Flags

## Overview

Feature flags decouple deploy from release and reduce blast radius. They also rot into permanent branching complexity if ownership and removal are unclear. Use flags deliberately, keep them short-lived when possible, and evaluate them in one place.

## When to Use

- Shipping incomplete features behind a gate
- Progressive rollout / canary / percentage release
- Kill switches for risky subsystems
- A/B experiments with a clear hypothesis and end date
- Reviewing flag-related complexity or stale toggles

**Not for:** replacing proper config management for permanent environment differences (those are config, not flags).

## Core Principles

### 1. Every flag has an owner and a fate

- Name the owner team/person.
- Record intended lifetime: short-lived release flag vs long-lived ops kill switch.
- Schedule removal for release flags.

### 2. Evaluate flags at the edge when possible

Prefer resolving the flag once at a boundary and passing a boolean/strategy inward over sprinkling flag checks deep in domain logic.

### 3. Default safe

- New risky behavior defaults off in production until explicitly enabled.
- Fail closed on flag service outages for dangerous features; fail open only when intentional and documented.

### 4. Avoid combinatorial explosion

Two flags = 4 worlds; five flags = 32. Limit active interdependent flags. Test the combinations you claim to support.

### 5. Clean up aggressively

When a rollout is done, remove the flag and the old path. Stale flags are debt and latent bugs.

### 6. Observability

Log or metric flag evaluation for critical paths so you can answer "was this cohort on the new code?"

## Flag Types (keep them distinct)

| Type | Purpose | Lifetime |
|---|---|---|
| Release | Decouple deploy from launch | Short |
| Experiment | Measure hypothesis | Fixed window |
| Ops / kill switch | Emergency control | Longer, reviewed |
| Permission | Entitlements | Product-managed |

Do not use one flag for all four meanings.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll remove the flag next sprint" | Put a calendar reminder or ticket with a date now. |
| "Just check the flag everywhere" | Centralize evaluation; avoid domain pollution. |
| "Leaving both code paths forever is flexible" | It doubles test cost and incident surface. |
| "Flag service is down, enable everything" | For risky features, fail safe. |

## Red Flags

- Flags with no owner or no removal plan
- Nested `if flagA && flagB && !flagC` in core business logic
- Experiments without a success metric or end date
- Permanent environment config implemented as feature flags
- Dead code paths still gated by a flag that is 100% on

## Verification

- [ ] Flag has owner, purpose, and intended lifetime
- [ ] Default is safe for production
- [ ] Evaluation point is clear and not deeply duplicated
- [ ] Cleanup task exists for release/experiment flags
- [ ] Critical evaluations are observable
- [ ] Unsupported flag combinations are avoided or tested
