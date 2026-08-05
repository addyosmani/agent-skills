# Integration Surfaces — Keon Systems Family Go-Live

**Assessment:** keon-go-live · **Date:** 2026-05-31

| ID | Surface | Producer | Consumer | Contract | Auth Boundary | Data Classification | Security Relevance | Status |
|---|---|---|---|---|---|---|---|---|
| IS-01 | Identity & authz | keon-auth | all tracks | JWT (RSA-signed) + authz claim shape | issuer/verifier | secret-bearing (keys) | high | mapped |
| IS-02 | Governed intent handoff | keon.collective | keon-mcp-gateway / keon-systems | `GovernedIntentHandoff` schema | service identity | tenant-scoped intent | high | mapped |
| IS-03 | Governed execute | keon-mcp-gateway | keon-systems | governed-execute request + tenant binding | service token + tenant scope | tenant-scoped operational | high | mapped |
| IS-04 | Receipt write/read | keon-systems | keon-cortex | receipt schema | service identity | audit / lineage, tenant-scoped | high | mapped |
| IS-05 | Tenant/env provisioning | keon.control.website | provisioning API | provisioning request/response | admin capability + credentials | confidential, cross-realm sensitive | high | mapped |
| IS-06 | Public proof artifact | keon-systems-web | public reader | proof manifest + fixture schema | public unauthenticated | public | medium | mapped |

## Per-surface detail

### IS-03 — Governed execute (keon-mcp-gateway → keon-systems)
- **Positive:** authorized, well-formed governed-execute request for tenant T executes and produces a receipt.
- **Negative:** unauthorized/malformed request is denied at the gateway; no execution reaches the core.
- **Negative (cross-tenant):** a token scoped to tenant A requesting a tenant-B resource is denied **at the runtime**, not only at the gateway.
- **Failure mode:** core unavailable → gateway returns a typed error, no partial execution.
- **Security gate:** SG-03 (tenant authz). **This surface carries the blocking finding F-002.**

### IS-04 — Receipt write/read (keon-systems → keon-cortex)
- **Positive:** runtime writes a receipt; it is retrievable and deterministically replayable with no mutation.
- **Negative:** a cross-tenant receipt read is denied.
- **Security gate:** SG-04 (tenant isolation).

### IS-06 — Public proof artifact (keon-systems-web → public)
- **Positive:** proof page loads; every public claim maps to an evidence manifest entry; static fixtures are labeled as such (no false "live" claim).
- **Security gate:** SG-06 (public claims + endpoint abuse). Carries waived Medium F-001 (rate limiting).
