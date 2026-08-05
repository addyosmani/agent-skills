# Example: Keon Go-Live Readiness Assessment

A worked, end-to-end example of the `go-live-readiness` skill applied to the Keon
Systems family of products, promoting **staging → production**.

This example demonstrates **assessment / no-build mode**: the system already exists;
the coordinator proves what is ready and reports honestly on what is not. The verdict
is **HOLD** — chosen deliberately to show the full gating machinery, including a
blocking security finding, unverified staging scenarios, and one waived Medium finding.

> All names, commit SHAs, owners, and findings below are illustrative. They show the
> *shape* of real output, not real Keon assessment results.

## Reading order

These artifacts mirror the phase sequence in `SKILL.md` (A-0 → A-7):

| # | Artifact | Phase | What it shows |
|---|----------|-------|---------------|
| 1 | [ASSESSMENT-SCOPE.md](ASSESSMENT-SCOPE.md) | A-0 | Scope, target env, tracks in trust-root order, depth |
| 2 | [DISCOVERY.md](DISCOVERY.md) | A-1 | Repo inventory, environments, CI state, known blockers |
| 3 | [TRACKS.md](TRACKS.md) | A-2 | Project tracks and their roles |
| 4 | [INTEGRATION-SURFACES.md](INTEGRATION-SURFACES.md) | A-2 | Cross-project boundaries + security relevance |
| 5 | [SCENARIOS.md](SCENARIOS.md) | A-3 | Positive/negative/failure scenarios per surface |
| 6 | [VERIFICATION.md](VERIFICATION.md) | A-4 | Per-scenario status by environment with evidence |
| 7 | [SECURITY-GATES.md](SECURITY-GATES.md) | A-5 | Findings → gate mapping (incl. one blocking High) |
| 8 | [RELEASE-GATES.md](RELEASE-GATES.md) | A-6 | Release gate checklist with per-gate verdict |
| 9 | [FINAL-HANDOFF.md](FINAL-HANDOFF.md) | A-7 | The **HOLD** verdict + remediation plan |

## The system under assessment

Seven repositories, analyzed trust-root → public-surface:

1. `keon-auth` — identity, tokens, authz (trust root)
2. `keon-systems` — governed execution core (Decide-before-Execute)
3. `keon-mcp-gateway` — governed tool boundary (policy, tenant binding, receipts)
4. `keon-cortex` — deterministic memory / receipt substrate
5. `keon.collective` — cognition plane → GovernedIntentHandoff
6. `keon.control.website` — control cockpit / tenant + environment provisioning
7. `keon-systems-web` — public website / proof surfaces

## Verdict at a glance

> **HOLD**

Blocking:
- `security-clearance` — **F-002 (High)**: runtime trusts the gateway's tenant assertion
  without independently re-validating tenant scope (confused-deputy / defense-in-depth gap).
- `scenarios-verified` — three required scenarios are **unverified** in staging (SC-03, SC-07, SC-08).
- `tenant-separation-verified` — depends on the two items above.

Non-blocking:
- **F-001 (Medium)** waived with named owner + re-assessment date (public proof-page rate limiting).
- **F-003 (Low)** advisory (verbose auth error messages in staging).

Two bounded remediation parcels are proposed in [FINAL-HANDOFF.md](FINAL-HANDOFF.md).
