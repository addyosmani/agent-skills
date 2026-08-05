# Project Tracks — Keon Systems Family Go-Live

**Assessment:** keon-go-live · **Date:** 2026-05-31

| Track | Repo | Owner | Role | Status | Notes |
|---|---|---|---|---|---|
| Auth | keon-auth | S. Patel | Identity, tokens, authz | active | Trust root for all surfaces |
| Systems (core) | keon-systems | A. Rivera | Governed execution (Decide-before-Execute) | active | Must prove tenant re-validation |
| MCP Gateway | keon-mcp-gateway | J. Okafor | Governed tool boundary | active | Tenant binding + receipts |
| Cortex | keon-cortex | A. Rivera | Receipts / lineage / memory | active | Tenant partitioning required |
| Collective | keon.collective | D. Sato | Cognition plane | active | Must prove no direct effect path |
| Control | keon.control.website | L. Nguyen | Tenant/environment provisioning | active | Credential handling sensitive |
| Public Web | keon-systems-web | M. Chen | Public proof surfaces | active | Claims must map to evidence |

## Ordering rationale

Producers and trust roots are assessed before their consumers:

```
keon-auth ──▶ (every other track depends on identity/authz)
   keon-systems ──▶ executes governed effects
      keon-mcp-gateway ──▶ governs entry into keon-systems
         keon-cortex ──▶ records receipts from keon-systems
            keon.collective ──▶ produces intent, cannot execute
               keon.control.website ──▶ provisions tenants/environments
                  keon-systems-web ──▶ presents public claims (evidence-last)
```
