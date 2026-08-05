# Verification — Keon Systems Family Go-Live

**Assessment:** keon-go-live · **Date:** 2026-05-31 · **Target:** production (promoting from staging)

Verification states: `passing` · `failing` · `unverified` · `blocked` · `not-applicable`.
**`unverified` is not `passing`.** It is a blocker unless explicitly waived.

## Status matrix

| Scenario | local | staging | production | Evidence | Notes |
|---|---|---|---|---|---|
| SC-01 token accept/expire | passing | passing | n/a | vr-001 (auth-it log) | |
| SC-02 forged JWT rejected | passing | passing | n/a | vr-002 | |
| SC-03 collective cannot execute | passing | **unverified** | n/a | vr-003 (local only) | No staging evidence captured |
| SC-04 unauthorized execute denied | passing | passing | n/a | vr-004 (gateway+core log) | |
| SC-05 cross-tenant execute denied | passing* | **failing** | n/a | vr-005 | *gateway denies; runtime does not independently re-validate → F-002 |
| SC-06 receipt write + replay | passing | passing | n/a | vr-006 (receipt id + replay hash) | |
| SC-07 cross-tenant receipt read denied | passing | **unverified** | n/a | vr-007 (local only) | No staging evidence captured |
| SC-08 provisioning realm isolation | passing | **unverified** | n/a | vr-008 (local only) | No staging evidence captured |
| SC-09 public proof claims map | passing | n/a | n/a | vr-009 (public-static) | Verified on public-static |

## Representative run record

### vr-005 — SC-05 cross-tenant governed-execute
- **Environment:** staging
- **Commit set:** keon-mcp-gateway `a1b2c3d`, keon-systems `e4f5a6b`, keon-auth `9c0d1e2`
- **Procedure:** tenant-A service token → governed-execute naming tenant-B resource
- **Result:** **failing** — gateway denied as expected, but a direct core call replaying the
  same request with the gateway's forwarded tenant assertion was accepted by `keon-systems`
  (runtime did not re-validate tenant scope).
- **Evidence:** `evidence/vr-005-staging.log`
- **Disposition:** drives finding **F-002 (High)**; blocks `security-clearance` and `tenant-separation-verified`.

## Summary

- Passing (staging or applicable env): SC-01, SC-02, SC-04, SC-06, SC-09
- Unverified in staging: **SC-03, SC-07, SC-08** → blocks `scenarios-verified`
- Failing: **SC-05** → blocks `security-clearance`, `tenant-separation-verified`
