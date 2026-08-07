---
name: authentication-and-authorization
description: Guides practical authn/authz design for web and API apps. Use when implementing login, sessions, tokens, RBAC/ABAC, permission checks, or when reviewing auth for security and correctness gaps.
---

# Authentication and Authorization

## Overview

Authentication answers "who is this?". Authorization answers "what may they do?". Conflating them, scattering checks, or inventing crypto are common ways apps get breached or become unmaintainable. Prefer boring, standard patterns.

## When to Use

- Designing login, signup, logout, password reset, MFA
- Choosing session cookies vs bearer tokens vs both
- Implementing RBAC, ABAC, or resource-level permissions
- Protecting APIs and server actions
- Reviewing auth middleware and permission checks

**Not for:** deep cryptography research, or Solana wallet-adapter specifics.

## Core Principles

### 1. Use standard protocols and libraries

- Prefer battle-tested libraries over hand-rolled JWT/session code.
- OAuth/OIDC for delegated identity when appropriate.
- Store password hashes with modern algorithms (e.g. Argon2/bcrypt) via a maintained library.

### 2. Sessions and tokens have explicit lifetimes

- Define absolute and idle timeouts.
- Rotate refresh tokens; treat reuse detection as a security event.
- Invalidate server-side sessions on logout and password change.

### 3. Authorization is centralized and deny-by-default

- Check permissions at the boundary (API handler, server action, policy layer).
- Default deny; grant explicitly.
- Do not rely on UI hiding alone.

### 4. Resource ownership is part of the check

`user.role == admin` is not enough for `DELETE /docs/:id`. Verify the principal may act on *that* resource.

### 5. Least privilege for tokens and scopes

- Access tokens should be short-lived and narrowly scoped.
- Service credentials must not share user session privileges carelessly.

### 6. Audit sensitive auth events

Log (without secrets): login success/failure, password changes, permission denials on sensitive actions, token reuse.

## Practical Patterns

**Cookie sessions (first-party web):** HTTP-only, Secure, SameSite; CSRF protection for state-changing requests.

**Bearer tokens (APIs / mobile):** short-lived access token + rotating refresh; store refresh securely.

**Server-side permission function:** one place that answers `can(principal, action, resource)` so checks stay consistent.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll just put the user id in a JWT and trust it" | Still verify signature, expiry, audience, and server-side revocation when required. |
| "Frontend routes are protected, we're fine" | APIs must enforce independently. |
| "Admin role can do everything, no need for resource checks" | Confused deputy and IDOR bugs love this. |
| "Custom crypto is more secure" | Almost never. Use standard libraries. |

## Red Flags

- Permissions checked only in the UI
- Long-lived access tokens with no rotation story
- Password reset tokens that never expire or are predictable
- Authorization logic copy-pasted across handlers with subtle differences
- Secrets or tokens logged in plaintext
- "Remember me" implemented as eternal sessions without risk controls

## Verification

- [ ] Authn uses maintained libraries and standard flows
- [ ] Sessions/tokens have explicit expiry and invalidation paths
- [ ] Authorization is deny-by-default and resource-aware
- [ ] Sensitive actions are permission-checked on the server
- [ ] CSRF/session cookie flags set correctly for browser apps
- [ ] Auth events for critical actions are auditable
