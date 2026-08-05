# Discovery — Keon Systems Family Go-Live

**Assessment:** keon-go-live · **Date:** 2026-05-31 · **Coordinator:** ClaudeTitan

## Repositories

| Repo | Role | Default Branch | Build/Test | Git State | Notes |
|---|---|---|---|---|---|
| keon-auth | Identity / tokens / authz | main | `dotnet build` / `dotnet test` | clean | Trust root; RSA signing keys via secret store |
| keon-systems | Governed execution core | main | `dotnet build` / `dotnet test` | clean | Decide-before-Execute engine |
| keon-mcp-gateway | Governed tool boundary | main | `npm run build` / `npm test` | clean | Tenant binding + receipt hooks |
| keon-cortex | Memory / receipt substrate | main | `pytest` | clean | Python 3.10+; deterministic replay |
| keon.collective | Cognition plane | main | `npm test` | clean | Emits GovernedIntentHandoff; no direct effect path |
| keon.control.website | Control cockpit / provisioning | main | `npm run build` | clean | Tenant + environment provisioning UI/API |
| keon-systems-web | Public website / proof | main | `npm run build` | clean | Static proof routes + live-check endpoint |

## Environments

| Environment | Purpose | Status | Notes |
|---|---|---|---|
| local | developer integration | available | Most scenarios pass here |
| staging | release-candidate validation | partial | 3 cross-project scenarios not yet evidenced |
| production | customer/public exposure | blocked | Requires release gates |
| public-static | public proof surfaces | available | Static fixtures; CDN-fronted |

## CI / Workflow State

- All seven repos have CI on `main`; unit suites green at the assessed commit set.
- No cross-repo integration pipeline exists — integration scenarios are run manually.
  (This is itself a risk; see RISKS in FINAL-HANDOFF.md.)

## Auth / Tenant Posture

- `keon-auth` issues short-lived service tokens and user tokens; RSA-signed.
- Tenant scope is asserted at the `keon-mcp-gateway` boundary and propagated to
  `keon-systems` via the governed-execute request. **Open question surfaced here:**
  does `keon-systems` independently re-validate tenant scope, or trust the gateway
  assertion? (Investigated in Phase A-5 → finding F-002.)
- `keon-cortex` partitions receipts by tenant; cross-tenant read must be denied.

## Existing Evidence Artifacts

- Unit test reports per repo (CI).
- Local integration transcripts for governed-execute denial (SC-04) and receipt
  write/replay (SC-06).
- Public proof evidence manifest in `keon-systems-web`.

## Known Risks (carried forward)

- No automated cross-project integration environment → staging evidence is manual and incomplete.
- Tenant re-validation at the runtime layer is unconfirmed.
