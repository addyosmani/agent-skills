# Release Gates — Keon Systems Family Go-Live

**Assessment:** keon-go-live · **Date:** 2026-05-31 · **Target:** production

Gate statuses: `passing` · `failing` · `unverified` · `waived`. A gate does not pass
without evidence. `unverified` blocks unless explicitly waived with a named owner.

| Gate | Description | Evidence | Status | Blocking |
|---|---|---|---|---|
| contracts-verified | All required contracts exist, current, referenced by consumers | INTEGRATION-SURFACES.md, schema refs | passing | yes |
| scenarios-verified | Required integration scenarios pass in staging | VERIFICATION.md | **failing** | yes |
| security-clearance | Blocking security findings resolved | SECURITY-GATES.md | **failing** | yes |
| evidence-complete | Public claims map to evidence artifacts | vr-009, proof manifest | passing | yes |
| open-decisions-resolved | No unresolved product/security/contract decisions | only the F-001 waiver, documented | passing | yes |
| rollback-documented | Rollback plan exists and is reviewed | ROLLBACK reviewed 2026-05-29 (A. Rivera) | passing | yes |
| deployment-config-reviewed | Target-env deployment config reviewed | config review note 2026-05-30 | passing | yes |
| tenant-separation-verified | Tenant/environment isolation holds in target env | depends on SC-05 (fail) + SC-07 (unverified) | **failing** | yes (multi-tenant) |

## Blocking summary

Three blocking gates are not satisfied:

1. **security-clearance** — F-002 (High) open.
2. **scenarios-verified** — SC-03, SC-07, SC-08 unverified in staging; SC-05 failing.
3. **tenant-separation-verified** — downstream of F-002 and SC-07.

Per the skill's hard rules, any failing blocking gate forces a **HOLD** verdict.
