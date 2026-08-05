---
name: go-live-readiness
description: Orchestrates a complete go-live readiness assessment for an existing system by sequencing initiative-coordination as the control plane, invoking security-review for security-sensitive surfaces, and dispatching parcel-driven-development only for remediation work surfaced by failed gates or scenarios. Use when someone asks for a go-live readiness check, release readiness assessment, launch readiness review, RC validation, or pre-launch audit on an already-built system. This skill adds an explicit assessment/no-build mode that IC, PDD, and SR do not provide individually.
---

# Go-Live Readiness Skill

An orchestrator that sequences `initiative-coordination`, `security-review`, and `parcel-driven-development` into a single go-live readiness command for an **existing system**.

## Purpose

This skill answers one question:

> Is this system ready to go live, and if not, what is blocking it?

The three underlying skills are strong individually. This skill wires them into a coherent assessment pipeline. It adds an **audit / evidence-collection mode** that none of the three skills expose by themselves — you are not building new work; you are proving what already exists.

## How This Skill Relates to the Others

```text
go-live-readiness  = assessment orchestrator (this skill)
initiative-coordination  = control plane: phases, gates, state, handoffs
security-review          = hostile boundary inspection for security-sensitive surfaces
parcel-driven-development = repo-local execution method, invoked ONLY for remediation
```

This skill does not replace the others. It sequences them.

- **IC** provides the spine: discovery, track map, surface map, scenario matrix, verification log, security gates, release gates, final handoff.
- **Security Review** is invoked once per security-sensitive surface during Phase 5.
- **PDD** is dispatched only when a failed gate or scenario requires remediation work.

## Assessment Mode vs. Build Mode

The underlying skills assume you are building new work. This skill adds an explicit **assessment mode**:

| Dimension | Build Mode (IC/PDD) | Assessment Mode (this skill) |
|---|---|---|
| Purpose | Produce new behavior | Prove existing behavior |
| Output | Merged PRs + evidence | Evidence + gate verdicts |
| PDD usage | All phases | Remediation only, if needed |
| IC phases used | All phases | Discovery → Verification → Gates → Handoff |
| Primary question | "What are we building?" | "Is what exists ready?" |

If assessment reveals remediation is needed, the coordinator dispatches targeted PDD parcels and re-runs verification. The remediation loop is bounded — one parcel per gap, not a new feature build.

## When to Use This Skill

Use when:

- A product is approaching a launch, RC cut, or production promotion
- You need a release readiness verdict (ship / hold / ship-with-constraints)
- You need integration evidence, not just passing unit tests
- Security-sensitive surfaces must be gated before promotion
- Public claims on the product need to be backed by evidence artifacts
- Multiple repos or services must prove they compose correctly
- You need a durable, auditable record of readiness

Do NOT use when:

- The product is early-stage with no meaningful integration boundaries
- You are building new features (use IC + PDD directly)
- A single repo needs a security scan (use `security-review` directly)

## The Single Command

To run a go-live readiness check, invoke this skill with:

1. The **system or initiative name**
2. The **target promotion environment** (staging → production, local → staging, etc.)
3. The **known project tracks** (repos, services, apps) if available, or "discover from workspace"
4. Optionally: known security-sensitive surfaces, known blockers, known open decisions

The skill will proceed through phases below without requiring you to manually sequence the underlying skills.

---

## Assessment Phases

### Phase A-0: Scope Classification

Before starting, classify the assessment.

```md
# Go-Live Assessment Scope

Initiative: <name>
Target Environment: <staging | production | public-static | other>
Mode: assessment (no-build)
Known Tracks: <list or "discover">
Known Security-Sensitive Surfaces: <list or "unknown, will discover">
Assessment Depth: <quick | standard | full>
PDD Remediation Authorized: <yes | no | on explicit approval>
```

Depth guidance:

- **Quick**: highest-risk gates and blockers only; no full scenario matrix
- **Standard**: full gate and scenario sweep; security review on identified surfaces
- **Full**: standard + threat model per surface + evidence pack + final handoff

### Phase A-1: Discovery (via IC Phase -1)

Run IC's Discovery phase.

Mandatory items:

- Repos involved, default branches, current git state
- Build and test commands
- Deployment environments and current deployment state
- Service boundaries and public entry points
- API and message contracts (existing, not planned)
- Auth and authorization boundaries
- Tenant or environment isolation rules
- Existing CI workflows and passing/failing status
- Current open PRs relevant to go-live
- Known blockers and known security constraints
- Existing evidence artifacts (test reports, receipts, manifests, fixtures)

Output: `docs/INITIATIVES/<initiative-id>/DISCOVERY.md`

### Phase A-2: Track and Surface Map (via IC Phases 0–1)

Map tracks and integration surfaces for the existing system.

- For each track: name, repo/location, role, current status
- For each surface: producer, consumer, contract reference, auth boundary, data classification, security relevance
- Flag every surface with `security_relevance: high` for security review in Phase A-5

Output:
- `docs/INITIATIVES/<initiative-id>/CHARTER.md`
- `docs/INITIATIVES/<initiative-id>/TRACKS.md`
- `docs/INITIATIVES/<initiative-id>/INTEGRATION-SURFACES.md`

### Phase A-3: Contract and Scenario Inventory (via IC Phase 2)

Inventory existing contracts and define integration scenarios.

For each integration surface:

- Does a contract exist? Where is it? Is it current?
- What positive scenario proves the surface works?
- What negative scenario proves denial/rejection works?
- What failure-mode scenario proves graceful degradation?
- What evidence already exists?
- What evidence is missing?

This is the core of assessment mode: you are not writing contracts, you are auditing what exists against what is required.

Output:
- `docs/INITIATIVES/<initiative-id>/CONTRACTS.md`
- `docs/INITIATIVES/<initiative-id>/SCENARIOS.md`

### Phase A-4: Integration Verification (via IC Phase 4)

For each scenario, determine its current status in the target environment.

Verification states:
- `passing` — evidence exists, environment confirmed, build/commit pinned
- `failing` — scenario was run and failed
- `unverified` — no evidence that this scenario has been run
- `blocked` — cannot be verified until a prerequisite is resolved
- `not-applicable` — scenario is explicitly out of scope for this go-live

A scenario marked `unverified` is **not the same as passing**. Unverified is a blocker unless explicitly waived.

For each scenario run, record:
- Environment
- Commit set
- Command or procedure
- Result
- Evidence artifact path or link

Output: `docs/INITIATIVES/<initiative-id>/VERIFICATION.md`

### Phase A-5: Security Review (via security-review skill)

For each surface flagged `security_relevance: high` or `medium`:

1. Invoke `security-review` skill with target class and depth
2. Record all findings (Critical, High, Medium, Low, Informational)
3. Map findings to security gates:
   - **Critical or High** → gate status: `failing` → release: **blocked**
   - **Medium** → gate status: `failing` → release: blocked unless explicitly waived with documented rationale
   - **Low or Informational** → gate status: `advisory` → does not block release by default

Update IC's security gate map with findings from each security review.

Output (from security-review skill):
- Markdown report per surface
- JSON findings sidecar for deep audits
- `docs/INITIATIVES/<initiative-id>/SECURITY-GATES.md` (updated by coordinator)

### Phase A-6: Release Gate Checklist (via IC Phase 5)

Walk IC's release gate checklist for the target environment.

Standard gates for go-live:

| Gate | Description | Evidence Required | Blocking |
|---|---|---|---|
| `contracts-verified` | All required contracts exist, are current, and are referenced by consumers | Contract files, version refs | yes |
| `scenarios-verified` | Required integration scenarios pass in target environment | VERIFICATION.md run records | yes |
| `security-clearance` | Blocking security gate findings are resolved | SECURITY-GATES.md, finding status | yes |
| `evidence-complete` | Public claims map to evidence artifacts | Evidence index | yes |
| `open-decisions-resolved` | No unresolved product, security, or contract decisions remain | DECISIONS.md | yes |
| `rollback-documented` | Rollback plan exists and is tested or reviewed | ROLLBACK.md | yes |
| `deployment-config-reviewed` | Deployment configuration for target environment reviewed | Config review note | yes |
| `tenant-separation-verified` | Tenant/environment isolation holds in target environment | Verification run | yes (if multi-tenant) |

Output: `docs/INITIATIVES/<initiative-id>/RELEASE-GATES.md`

### Phase A-7: Final Readiness Handoff (via IC Phase 6)

The coordinator produces a final handoff with one of three verdicts:

- **ship** — all release gates pass, no blocking issues
- **hold** — one or more blocking gates are failing or unverified
- **ship-with-constraints** — gates pass with documented exceptions; named owner accepts residual risk

The final handoff must:
- State the verdict clearly
- List every passing gate with evidence reference
- List every failing or unverified gate with status and owner
- List every security finding and its disposition
- List open risks and who owns them
- List deferred work explicitly (not silently dropped)
- Be honest — "unknown" is not the same as "passing"

Output: `docs/INITIATIVES/<initiative-id>/FINAL-HANDOFF.md`

---

## Remediation Loop

If Phase A-4 or A-5 surfaces failing scenarios or security gate failures:

1. Coordinator creates a remediation work item for each gap
2. Coordinator dispatches a targeted PDD parcel for each work item
3. PDD parcel follows normal parcel discipline (branch, worktree, spec, verification, handoff)
4. After parcel merges, coordinator re-runs the affected scenario or security review
5. Gate status updates based on new evidence
6. Loop until gates pass or coordinator declares hold

The remediation loop is **bounded**:
- One parcel per identified gap
- Parcels do not expand scope beyond the gap they address
- If a parcel reveals a larger structural problem, coordinator escalates and updates the final verdict

---

## Severity → Gate Decision Mapping

This table closes the gap identified between `security-review` FINDING severity and IC's gate pass/block decision:

| Finding Severity | Gate Status | Release Impact |
|---|---|---|
| Critical | failing | **blocked** — must resolve before go-live |
| High | failing | **blocked** — must resolve before go-live |
| Medium | failing | **blocked by default** — waivable with documented rationale and named owner |
| Low | advisory | does not block — should appear in deferred work or risk register |
| Informational | advisory | does not block |

A waived Medium finding must include:
- Finding ID
- Rationale for waiver
- Named owner accepting residual risk
- Date of waiver
- Re-assessment timeline

---

## Output Artifacts From This Skill

When applying this skill, produce:

1. Go-Live Assessment Scope classification
2. Discovery document (via IC)
3. Initiative charter (via IC)
4. Track map (via IC)
5. Integration surface map (via IC)
6. Contract inventory (via IC)
7. Scenario matrix with verification status (via IC)
8. Security review reports (via security-review, one per security-sensitive surface)
9. Security gate map with finding-to-gate mapping (via IC + SR)
10. Release gate checklist with verdict per gate (via IC)
11. Remediation parcels if needed (via PDD)
12. Final readiness handoff with ship/hold/ship-with-constraints verdict

---

## Hard Rules

1. **Assessment mode does not assume passing.** Unverified is not passing. Evidence must exist.
2. **Security findings drive gate status.** Critical and High always block. No exceptions without a named waiver owner.
3. **Remediation is bounded.** Parcels fix specific gaps. They do not become feature builds.
4. **The verdict must be honest.** Ship, hold, or ship-with-constraints — not "looks good."
5. **Public claims require evidence.** Any claim on a public surface must be backed by a linked artifact.
6. **Environment specificity is mandatory.** A scenario is passing in a specific environment, not globally.
7. **Tenant and environment are separate dimensions.** Do not conflate staging tenant with production tenant.
8. **Waivers must be documented.** Skipping a gate is not the same as waiving it. Waivers name an owner.
9. **Session handoffs are required.** Any session that changes state, evidence, or gate status produces a handoff.
10. **The coordinator tells the truth.** If evidence is missing, the gate does not pass.

---

## Anti-Patterns

- **The optimistic sweep.** Running through gates and marking everything "looks good" without evidence.
- **The scope creep remediation.** A gap parcel becomes a feature sprint.
- **The waiver avalanche.** Medium and High findings are all waived to hit a launch date.
- **The staging-only proof.** Scenarios verified in staging are claimed as production-ready without explicit promotion gates.
- **The silent assumption.** A surface is assumed secure because it was reviewed once, six months ago.
- **The merged PR verdict.** "All PRs are merged" is not a go-live verdict.
- **The chat-history state.** Assessment results live in conversation memory instead of durable documents.

---

## Example: Keon Systems Go-Live Assessment

```md
# Go-Live Assessment Scope

Initiative: keon-go-live
Target Environment: staging → production
Mode: assessment (no-build)
Known Tracks (analyze in trust-root → public-surface order):
  1. keon-auth            (identity, tokens, authz — trust root, security-sensitive)
  2. keon-systems         (governed execution core — Decide-before-Execute, security-sensitive)
  3. keon-mcp-gateway     (governed tool boundary — policy, tenant binding, receipts, security-sensitive)
  4. keon-cortex          (deterministic memory / receipt substrate, security-sensitive)
  5. keon.collective      (cognition plane → GovernedIntentHandoff)
  6. keon.control.website (control cockpit — tenant/environment provisioning, security-sensitive)
  7. keon-systems-web     (public website and proof surfaces)
Assessment Depth: full
PDD Remediation Authorized: on explicit approval

Security-Sensitive Surfaces:
  - keon-auth → all services (token issuance/validation, authz decisions)
  - keon.collective → GovernedIntentHandoff → keon-mcp-gateway/keon-systems (intent must not self-execute; confused-deputy risk)
  - keon-mcp-gateway → keon-systems (governed execute; unauthorized/malformed request denied)
  - keon-systems → keon-cortex (receipt write/read; tenant isolation, deterministic replay, audit integrity)
  - keon.control.website → tenant/environment provisioning (credential handling, cross-realm promotion risk)
  - keon-systems-web → public proof artifact contract (unsupported claims risk; static vs live honesty)
```

Why this order: analyze each integration surface from its producer/trust-root side before
its consumer, and establish the security-critical boundaries (auth, gateway tenant binding,
cortex isolation) before the surfaces that depend on them. Public claim surfaces come last
because their evidence depends on everything beneath being verified.

Primary release gates:

- All integration scenarios passing in staging (local passing is not sufficient)
- Security review complete for all 6 security-sensitive surfaces
- No Critical or High security findings open
- Public claims map to evidence artifacts
- Tenant/environment isolation verified in staging
- Rollback plan documented and reviewed
- Deployment configuration reviewed
- Final handoff complete
