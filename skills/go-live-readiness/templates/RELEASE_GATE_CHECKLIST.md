# Release Gate Checklist

## Initiative

<initiative-id>

## Target Environment

<staging | production | other>

## Date

<YYYY-MM-DD>

---

## Gates

| Gate ID | Gate | Required Evidence | Status | Owner | Notes |
|---|---|---|---|---|---|
| gate-contracts-verified | All required contracts exist, are current, and referenced by consumers | Contract files, version refs | pending | | |
| gate-scenarios-verified | Required integration scenarios pass in target environment | VERIFICATION.md run records | pending | | |
| gate-security-clearance | Blocking security gate findings are resolved | SECURITY-GATES.md, finding status | pending | | |
| gate-evidence-complete | Public claims map to evidence artifacts | Evidence index | pending | | |
| gate-open-decisions-resolved | No unresolved product, security, or contract decisions remain | DECISIONS.md | pending | | |
| gate-rollback-documented | Rollback plan exists and is reviewed | ROLLBACK.md | pending | | |
| gate-deployment-config-reviewed | Deployment configuration for target environment reviewed | Config review note | pending | | |
| gate-tenant-separation-verified | Tenant/environment isolation holds in target environment | Verification run | pending | | |

---

## Security Finding Disposition

| Finding ID | Severity | Surface | Status | Waiver Owner | Waiver Rationale |
|---|---|---|---|---|---|
| <F-001> | <Critical/High/Medium/Low> | <surface> | <open/resolved/waived> | | |

---

## Verdict

<ship | hold | ship-with-constraints>

### Rationale

<One paragraph explaining the verdict. If hold or ship-with-constraints, name every blocking issue.>

### Constraints (if ship-with-constraints)

- <constraint with named owner and re-assessment timeline>

### Deferred Work

- <work item deferred to post-launch>
