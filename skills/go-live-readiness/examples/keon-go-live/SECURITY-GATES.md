# Security Gates — Keon Systems Family Go-Live

**Assessment:** keon-go-live · **Date:** 2026-05-31 · **Reviewer:** GeminiTitan (security-review skill)

Findings are produced by the `security-review` skill and mapped to gate status using the
go-live severity→gate table: **Critical/High = blocked**, **Medium = blocked unless waived
with named owner**, **Low/Informational = advisory**.

## Gate map

| Gate | Surface | Threat Class | Finding(s) | Status | Blocking |
|---|---|---|---|---|---|
| SG-01 | IS-01 keon-auth | token forgery / authz bypass | F-003 (Low) | passing (advisory) | yes |
| SG-02 | IS-02 collective handoff | confused deputy / effect bypass | none | passing | yes |
| SG-03 | IS-03 gateway → systems | tenant-binding bypass | **F-002 (High)** | **failing** | yes |
| SG-04 | IS-04 systems → cortex | cross-tenant leakage | none (staging unverified) | pending | yes |
| SG-05 | IS-05 control provisioning | credential exposure / cross-realm | none | passing | yes |
| SG-06 | IS-06 public proof | public endpoint abuse | F-001 (Medium, waived) | passing (waived) | yes |

## Findings

### F-002 — Runtime trusts gateway tenant assertion without re-validation
- **Severity:** High · **Confidence:** High
- **CVSS-lite:** AV:N/AC:H/PR:L/UI:N/S:C/C:H/I:H/A:N
- **Locator:** keon-systems governed-execute handler (tenant scope taken from forwarded
  gateway claim; no independent check against the token's tenant binding)
- **Impact:** A confused-deputy path or a gateway defect could allow a tenant-A caller to
  act on tenant-B resources — a tenant isolation break.
- **Remediation:** `keon-systems` must independently re-validate tenant scope on every
  governed-execute against the authenticated token, not the gateway's forwarded assertion.
- **Framework mapping:** OWASP API1 (BOLA) / CWE-639 / CWE-441
- **Disposition:** **BLOCKING.** Remediation parcel `rp-gateway-runtime-tenant-revalidation`
  proposed in FINAL-HANDOFF.md. Owners: J. Okafor (gateway), A. Rivera (core).

### F-001 — Public live-check endpoint lacks per-IP rate limiting (WAIVED)
- **Severity:** Medium · **Confidence:** Medium
- **Locator:** keon-systems-web `/api/proof/live-check`
- **Impact:** Unauthenticated endpoint could be hammered to drive cost/noise.
- **Waiver:**
  - **Rationale:** endpoint is CDN-fronted with edge caching and a 5s origin TTL; blast
    radius is low and no sensitive data is exposed.
  - **Named owner accepting residual risk:** M. Chen (Public Web)
  - **Date of waiver:** 2026-05-31
  - **Re-assessment timeline:** 2026-06-14 (add origin rate limit before next RC)

### F-003 — Verbose token-validation errors in staging (ADVISORY)
- **Severity:** Low · **Confidence:** High
- **Locator:** keon-auth token endpoint (staging config returns detailed validation reasons)
- **Impact:** Minor information disclosure aiding token-shape probing.
- **Disposition:** advisory; tracked in risk register, does not block. Owner: S. Patel.

## Coverage gaps

- SG-04 (cortex tenant isolation) has **no staging evidence** (SC-07 unverified). Gate is
  `pending`, treated as not-yet-cleared for production.
