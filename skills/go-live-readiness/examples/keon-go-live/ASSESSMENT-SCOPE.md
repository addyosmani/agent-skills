# Go-Live Assessment Scope

## Initiative

keon-go-live

## Initiative Name

Keon Systems Family — Production Go-Live Readiness

## Target Environment

production

## Promotion Path

staging → production

## Mode

assessment (no-build)

## Assessment Depth

full

## Known Tracks

Analyzed in trust-root → public-surface order so each integration surface is understood
from its producer side before its consumer, and security-critical boundaries are
established before the surfaces that depend on them.

| # | Track | Repo / Location | Role |
|---|---|---|---|
| 1 | Auth | `D:\Repos\keon-omega\keon-auth` | Identity, token issuance/validation, authz — trust root |
| 2 | Systems (core) | `D:\Repos\keon-omega\keon-systems` | Governed execution core — Decide-before-Execute |
| 3 | MCP Gateway | `D:\Repos\keon-omega\keon-mcp-gateway` | Governed tool boundary — policy, tenant binding, receipts |
| 4 | Cortex | `D:\Repos\keon-omega\keon-cortex` | Deterministic memory / receipt substrate |
| 5 | Collective | `D:\Repos\keon-omega\keon.collective` | Cognition plane → GovernedIntentHandoff |
| 6 | Control | `D:\Repos\keon-omega\keon.control.website` | Control cockpit / tenant + environment provisioning |
| 7 | Public Web | `D:\Repos\keon-omega\keon-systems-web` | Public website / proof surfaces |

## Security-Sensitive Surfaces

| Surface | Threat Class | Review Required |
|---|---|---|
| keon-auth → all services | Token forgery, authz bypass, secret exposure | yes |
| keon.collective → GovernedIntentHandoff → gateway/systems | Confused deputy, execution boundary bypass | yes |
| keon-mcp-gateway → keon-systems | Unauthorized execution, tenant-binding bypass | yes |
| keon-systems → keon-cortex | Cross-tenant leakage, audit/receipt tampering | yes |
| keon.control.website → provisioning | Credential exposure, cross-realm data promotion | yes |
| keon-systems-web → public proof contract | Unsupported public claims, public endpoint abuse | yes |

## Known Blockers

- Staging integration runs for the cognition and isolation surfaces have not been
  captured with evidence (carried into VERIFICATION as `unverified`).

## Known Open Decisions

- None at scope time. (One waiver decision is recorded during Phase A-5; see SECURITY-GATES.md.)

## PDD Remediation Authorized

on explicit approval

## Assessment Date

2026-05-31

## Coordinator

ClaudeTitan (go-live-readiness)
