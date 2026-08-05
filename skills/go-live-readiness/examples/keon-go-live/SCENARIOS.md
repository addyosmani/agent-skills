# Integration Scenarios — Keon Systems Family Go-Live

**Assessment:** keon-go-live · **Date:** 2026-05-31

Scenario status here is the *target* set. Actual run status by environment lives in
[VERIFICATION.md](VERIFICATION.md). A scenario is never "globally passing" — it passes
in a specific environment against a specific build.

| ID | Scenario | Surface | Type | Release-Blocking | Sec Relevance |
|---|---|---|---|---|---|
| SC-01 | Valid token accepted; expired token rejected | IS-01 | positive+negative | yes | high |
| SC-02 | Forged/tampered JWT rejected (signature check) | IS-01 | negative | yes | high |
| SC-03 | Collective produces handoff but cannot execute an effect directly | IS-02 | negative | yes | high |
| SC-04 | Unauthorized/malformed governed-execute denied at gateway; no execution | IS-03 | negative | yes | high |
| SC-05 | Cross-tenant governed-execute (tenant-A token → tenant-B resource) denied at runtime | IS-03 | negative | yes | high |
| SC-06 | Runtime writes receipt to Cortex; retrievable + deterministic replay, no mutation | IS-04 | positive | yes | high |
| SC-07 | Cross-tenant receipt read denied | IS-04 | negative | yes | high |
| SC-08 | Provisioning does not promote data across realms; no credential leakage in logs/response | IS-05 | negative | yes | high |
| SC-09 | Public proof page loads; claims map to evidence; static fixtures labeled (no false live claim) | IS-06 | positive | yes | medium |

## Detail — SC-05 (the surface behind the blocking finding)

### Goal
Prove tenant isolation holds **at the runtime**, not only at the gateway.

### Steps
1. Obtain a valid service token scoped to tenant A.
2. Issue a governed-execute request naming a tenant-B resource.
3. Observe denial and absence of any tenant-B effect or receipt.

### Expected Result
Denied at `keon-systems` with an authz decision independent of the gateway's assertion.

### Why it matters
If `keon-systems` trusts the gateway's tenant claim without re-validating, a confused-deputy
path or a gateway bug becomes a cross-tenant breach. See finding **F-002** in
[SECURITY-GATES.md](SECURITY-GATES.md).
