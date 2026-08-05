---
name: initiative-coordination
description: Coordinates multi-agent, multi-session, multi-project initiatives across repositories, services, applications, environments, integration boundaries, release gates, and persisted operational state. Use when a product effort spans multiple repos or services, requires end-to-end integration validation, needs resumable coordinator state, or must produce release-readiness evidence across projects.
---

# Initiative Coordination Skill

A coordinator methodology for managing large multi-project efforts across multiple agents, sessions, repositories, services, environments, and release gates.

This skill sits above repo-local implementation methods such as Parcel-Driven Development. It does not replace parcel work. It coordinates parcel work across a broader initiative.

## Core Principle

> Treat the initiative, not the pull request, as the unit of delivery.

A single project can pass tests and still fail as part of the system. A single PR can be correct and still break a boundary. A single agent session can finish its task and still leave the initiative blocked.

The coordinator owns the full initiative state:

* Scope
* Tracks
* Project boundaries
* Integration surfaces
* Contracts
* Dependency graph
* Agent dispatch
* Session handoffs
* Verification evidence
* Security gates
* Release gates
* Persistent operational state

Agents build pieces. The coordinator proves that the pieces compose.

## Relationship to Parcel-Driven Development

Use Parcel-Driven Development for repo-local implementation work.

Use Initiative Coordination when the effort spans:

* Multiple repositories
* Multiple applications
* Multiple services
* Multiple deployment environments
* Multiple agent sessions
* Cross-project contracts
* Integration boundaries
* Security-sensitive release gates
* End-to-end readiness claims

Initiative Coordination may dispatch Parcel-Driven Development inside each project track.

```text
Initiative Coordination = program control plane
Parcel-Driven Development = repo-local execution method
Security Review = specialized boundary and threat review
```

The coordinator invokes lower-level skills when needed. The coordinator does not become those skills.

## When to Use This Skill

Use this skill when:

* A feature spans more than one repository or service
* Multiple agents or sessions are working on related parts
* A release depends on integration behavior, not just local unit tests
* The work needs persistent state across sessions
* The work has public, customer-facing, compliance, security, or launch-readiness implications
* The project has many boundaries, contracts, or deployment environments
* You need a reliable answer to “what is actually done?”
* You need release evidence, not just merged PRs

Do not use this skill when:

* The work is a single isolated bug fix
* One repo and one agent can complete the task safely
* Integration behavior is irrelevant
* The overhead would exceed the coordination risk

## Key Definitions

### Initiative

A coordinated product effort spanning one or more projects, repositories, services, environments, or release gates.

Examples:

* Keon RC Integration Readiness
* BioStack Video Intake Pipeline
* MarketOps Campaign Workspace Launch
* Public Proof Site Hardening

### Project Track

The slice of the initiative owned by a single project, repo, service, app, or deployment component.

Examples:

* Public website
* API
* Runtime
* MCP Gateway
* Cortex
* Control cockpit
* Documentation
* Deployment
* Security review

### Integration Surface

A boundary where two or more project tracks interact.

Examples:

* Web app to API
* MCP Gateway to Runtime
* Runtime to Cortex
* Control to provisioning service
* Collective to governed handoff contract
* Public proof page to evidence artifact contract

### Integration Scenario

A concrete end-to-end behavior that proves an integration surface works.

Examples:

* Unauthorized command is denied and no execution occurs
* Runtime writes a receipt to Cortex
* Public proof fixture matches manifest contract
* Control provisions a tenant environment without leaking credentials
* Collective produces intent but cannot directly execute effects

### Release Gate

A checkable condition that must pass before an initiative can be considered ready.

Examples:

* All required integration scenarios pass in staging
* Security review blockers are resolved
* No unresolved open product decisions remain
* Evidence artifacts exist for all public claims
* Rollback plan exists
* Deployment configuration reviewed

### Coordinator State

The durable operational record of initiative progress, decisions, blockers, risks, verification, sessions, agents, PRs, and evidence.

Markdown may present coordinator state. A database should own coordinator state when the work spans multiple sessions or projects.

## The Hard Rules

These are enforceable boundaries.

1. **The initiative must have one coordinator.** Multiple agents may execute, but one coordinator owns state, sequencing, and readiness.
2. **Every project track must be named.** No hidden workstreams.
3. **Every integration surface must have an owner.** If two systems interact, someone owns proving the boundary.
4. **Every boundary must define a contract.** The contract may be code, schema, fixture, API shape, message format, route behavior, or documented operational agreement.
5. **No project is “done” until its required integration scenarios pass.** Local tests are necessary but not sufficient.
6. **Merged PRs are not release evidence by themselves.** Evidence must show behavior.
7. **Session handoffs are mandatory.** Every agent session that changes initiative state must leave a usable handoff.
8. **Security-sensitive surfaces must be gated.** The coordinator identifies them and blocks release until security evidence exists.
9. **Environment matters.** A scenario is only passing in the environment where it was verified.
10. **Persistence is required for multi-session or multi-project initiatives.** Chat history is not coordinator state.
11. **No silent product decisions.** Agents stop and report when missing decisions affect behavior, contracts, user experience, security, or release readiness.
12. **No secrets, PII, unsafe logs, payload dumps, or credential exposure.** This applies across every track and every session.
13. **No untracked cross-project coupling.** If one project depends on behavior in another, the dependency must appear in the initiative state.
14. **Release gates must be explicit and checkable.** “Looks good” is not a gate.
15. **The coordinator must tell the truth.** Unknown, unverified, skipped, blocked, and not-applicable are distinct states.

## Operating Model

Initiative Coordination runs in phases.

```text
Phase -1: Discovery
Phase 0: Initiative Charter
Phase 1: Track and Boundary Mapping
Phase 2: Contract and Scenario Planning
Phase 3: Dispatch and Execution
Phase 4: Integration Verification
Phase 5: Security and Release Gates
Phase 6: Final Evidence and Handoff
```

Each phase produces durable artifacts.

## Phase -1: Discovery

Before planning, inspect the real project landscape.

Mandatory discovery items:

* Repositories involved
* Default branches
* Build commands
* Test commands
* Existing agent instructions
* Existing skills or repo rules
* Deployment environments
* Service boundaries
* Public entry points
* API contracts
* Message contracts
* Data stores
* Authentication and authorization boundaries
* Tenant or environment isolation rules
* Existing CI workflows
* Existing release process
* Current git state for each repo
* Current open PRs relevant to the initiative
* Known blockers
* Known security constraints

Output:

```text
docs/INITIATIVES/<initiative-id>/DISCOVERY.md
```

Discovery must include a repo inventory.

```md
# Discovery - <Initiative Name>

## Repositories

| Repo | Role | Default Branch | Status | Notes |
|---|---|---|---|---|
| keon-systems-web | Public website and proof surfaces | main | clean | Static proof routes |
| Keon.Runtime | Governed execution | main | unknown | Needs validation |
| Keon.MCPGateway | Tool boundary | main | unknown | Security-sensitive |
| Keon.Cortex | Receipts and lineage | main | unknown | Tenant isolation required |

## Known Environments

| Environment | Purpose | Status | Notes |
|---|---|---|---|
| local | developer verification | available | partial |
| staging | integration verification | pending | required before RC |
| production | customer/public exposure | blocked | release gate required |

## Known Risks

- <risk>
- <risk>
```

## Phase 0: Initiative Charter

The coordinator writes an initiative charter.

The charter defines:

* Initiative name
* Mission
* Why it matters
* In-scope tracks
* Out-of-scope tracks
* Success criteria
* Release gates
* Evidence requirements
* Security posture
* Human decision owners
* Constraints
* Stop conditions

Output:

```text
docs/INITIATIVES/<initiative-id>/CHARTER.md
```

Template:

```md
# Initiative Charter - <Initiative Name>

## Mission

<One paragraph describing the initiative outcome.>

## Why This Matters

<Business, product, launch, security, customer, or operational reason.>

## In Scope

- <track or behavior>
- <track or behavior>

## Out of Scope

- <explicit non-goal>
- <explicit non-goal>

## Success Criteria

- <checkable outcome>
- <checkable outcome>

## Release Gates

- <gate>
- <gate>

## Required Evidence

- <artifact or verification proof>
- <artifact or verification proof>

## Security Posture

<Summary of security-sensitive boundaries and required review posture.>

## Stop Conditions

The coordinator must stop and request direction if:

- A public claim cannot be supported by evidence
- A security boundary is unclear
- A contract changes without an amendment path
- A project requires scope outside the initiative charter
- A release gate cannot be verified
```

## Phase 1: Track and Boundary Mapping

The coordinator creates a track map and integration surface map.

Outputs:

```text
docs/INITIATIVES/<initiative-id>/TRACKS.md
docs/INITIATIVES/<initiative-id>/INTEGRATION-SURFACES.md
```

### Track Map Template

```md
# Project Tracks - <Initiative Name>

| Track | Repo/Location | Owner | Role | Status | Notes |
|---|---|---|---|---|
| Public Website | keon-systems-web | coordinator | public proof surfaces | active | Static proof pages |
| MCP Gateway | Keon.MCPGateway | coordinator | governed tool boundary | pending | Security-sensitive |
| Runtime | Keon.Runtime | coordinator | Decide-before-Execute | pending | Must prove denial path |
| Cortex | Keon.Cortex | coordinator | receipts and lineage | pending | Tenant partitioning required |
```

### Integration Surface Template

```md
# Integration Surfaces - <Initiative Name>

| Surface | Producer | Consumer | Contract | Auth Boundary | Data Classification | Status |
|---|---|---|---|---|---|---|
| Public proof artifact contract | evidence files | web proof page | manifest + fixture schema | public read | public | pending |
| Governed execution | MCP Gateway | Runtime | governed execute request | authenticated service | tenant-scoped operational | pending |
| Receipt write | Runtime | Cortex | receipt schema | service identity | audit/lineage | pending |
```

Every integration surface must include:

* Producer
* Consumer
* Contract
* Positive scenario
* Negative scenario
* Failure behavior
* Auth boundary
* Data classification
* Required evidence
* Environment coverage
* Security gate status

## Phase 2: Contract and Scenario Planning

The coordinator defines cross-project contracts and integration scenarios before dispatching implementation.

Outputs:

```text
docs/INITIATIVES/<initiative-id>/CONTRACTS.md
docs/INITIATIVES/<initiative-id>/SCENARIOS.md
```

### Contract Planning

Contracts can be:

* API request/response schemas
* Message schemas
* Event schemas
* Receipt formats
* Static fixtures
* Manifest files
* Environment variable contracts
* CLI command contracts
* UI route contracts
* Authorization behavior
* Operational runbooks

Template:

````md
# Contracts - <Initiative Name>

## <Contract Name>

### Owner

<Track or repo>

### Consumers

- <consumer>

### Contract Shape

```json
{
  "example": "shape"
}
````

### Required Fixtures

* <path>

### Required Tests

* <test behavior>

### Amendment Rule

Changes to this contract require:

1. A contract amendment entry
2. Updated fixtures
3. Updated dependent scenario specs
4. Updated dependent parcel specs
5. Coordinator approval before dependent work resumes

````

### Integration Scenario Matrix

Template:

```md
# Integration Scenarios - <Initiative Name>

| Scenario | Tracks | Surface | Environment | Positive/Negative | Required Evidence | Status |
|---|---|---|---|---|---|---|
| Unauthorized command denied | MCP Gateway, Runtime | governed execution | local, staging | negative | request, decision, no execution proof, receipt | pending |
| Receipt readback works | Runtime, Cortex | receipt write/read | local, staging | positive | receipt ID, readback result | pending |
| Public proof artifact loads | Website, Evidence | proof fixture contract | local build | positive | build output, route screenshot/log | pending |
````

Each scenario must define:

```md
## Scenario: <scenario-id>

### Goal

<Behavior this scenario proves.>

### Tracks

- <track>
- <track>

### Surface

<integration surface>

### Environment Coverage

- local: <required/optional/not applicable>
- staging: <required/optional/not applicable>
- production: <required/optional/not applicable>

### Preconditions

- <precondition>

### Steps

1. <step>
2. <step>

### Expected Result

- <observable outcome>

### Evidence Required

- <log, receipt, screenshot, command output, test result, artifact>

### Security Relevance

<none | low | medium | high>

### Release Blocking

<yes | no>

### Status

<pending | passing | failing | blocked | skipped | not applicable>
```

## Phase 3: Dispatch and Execution

The coordinator dispatches work into project tracks.

Repo-local implementation should use Parcel-Driven Development when the track needs scoped code changes.

The coordinator must track:

* Parcel ID
* Project track
* Repo
* Branch
* Worktree
* Agent/session
* Dependencies
* Status
* PR
* Verification
* Handoff
* Integration surface affected

Output:

```text
docs/INITIATIVES/<initiative-id>/DISPATCH.md
```

Dispatch table:

```md
# Dispatch - <Initiative Name>

| Work Item | Type | Track | Repo | Agent | Branch | PR | Status | Blocks |
|---|---|---|---|---|---|---|---|---|
| pdd-web-proof-fixture-contract | parcel | Public Website | keon-systems-web | Claude A | feat/... | #12 | merged | scenario-proof-loads |
| int-gateway-runtime-denial | integration | Gateway/Runtime | multiple | Coordinator | n/a | n/a | pending | RC gate |
| sec-runtime-cortex-tenant-isolation | security gate | Runtime/Cortex | multiple | Security reviewer | n/a | n/a | blocked | production |
```

Work item types:

* discovery
* contract
* parcel
* integration
* security-gate
* release-gate
* documentation
* deployment
* evidence
* decision

## Phase 4: Integration Verification

Integration verification is mandatory.

Local unit tests prove parts. Integration scenarios prove system behavior.

Output:

```text
docs/INITIATIVES/<initiative-id>/VERIFICATION.md
```

Verification states:

* pending
* running
* passing
* failing
* blocked
* skipped
* not applicable

A scenario is never simply “passing.” It is passing for a specific:

* Environment
* Build
* Commit set
* Configuration
* Date/time
* Verification command
* Evidence artifact

Template:

````md
# Verification - <Initiative Name>

## Scenario Run: <run-id>

### Scenario

<scenario-id>

### Environment

<local | staging | production | public-static | sandbox>

### Commit Set

| Repo | Commit |
|---|---|
| repo-a | abc123 |
| repo-b | def456 |

### Configuration

- <configuration detail>

### Command or Procedure

```bash
<command>
````

### Result

<passing | failing | blocked | skipped>

### Evidence

* <path or summary>
* <path or summary>

### Notes

<notes>
```

## Phase 5: Security and Release Gates

Use the 'security-review' skill to perform a full security analysis.

Output:
  - Use outputs defined in the security-review skill

### Security Gate Map

```md
# Security Gates - <Initiative Name>

| Gate | Surface | Threat Class | Required Review | Required Evidence | Status | Blocking |
|---|---|---|---|---|---|---|
| gateway-runtime-authz | MCP Gateway -> Runtime | unauthorized execution | security-review | deny tests, capability checks, no execution proof | pending | yes |
| runtime-cortex-tenant-isolation | Runtime -> Cortex | cross-tenant leakage | security-review | tenant partition tests, receipt scoping | pending | yes |
| public-proof-claim-safety | Website -> public claims | unsupported claims | claim hygiene review | claim/evidence map | pending | yes |
```

Security-sensitive surfaces include:

* Authentication
* Authorization
* Tenant isolation
* Credential handling
* Public input
* Public claims
* Agent tool execution
* Prompt injection exposure
* Indirect prompt injection exposure
* External network calls
* Data persistence
* Audit trails
* Logs
* Receipts
* PII
* Secrets
* Billing
* Deployment exposure

### Release Gate Checklist

```md
# Release Gates - <Initiative Name>

| Gate | Description | Required Evidence | Status | Owner |
|---|---|---|---|---|
| contracts-final | All required contracts are stable or amended | CONTRACTS.md, amendment log | pending | coordinator |
| integration-local | Required scenarios pass locally | VERIFICATION.md | pending | coordinator |
| integration-staging | Required scenarios pass in staging | VERIFICATION.md | pending | coordinator |
| security-clearance | Blocking security gates resolved | SECURITY-GATES.md | pending | security |
| evidence-complete | Public claims map to evidence | EVIDENCE.md | pending | coordinator |
| release-handoff | Final handoff exists | FINAL-HANDOFF.md | pending | coordinator |
```

## Phase 6: Final Evidence and Handoff

The coordinator produces a final initiative handoff.

Output:

```text
docs/INITIATIVES/<initiative-id>/FINAL-HANDOFF.md
```

Template:

```md
# Final Handoff - <Initiative Name>

## Initiative Status

<ready | not ready | partially ready | blocked>

## Summary

<Concise summary of what was completed.>

## Completed Tracks

- <track>: <summary>

## Completed Integration Scenarios

| Scenario | Environment | Status | Evidence |
|---|---|---|---|
| <scenario> | <environment> | passing | <evidence> |

## Release Gates

| Gate | Status | Notes |
|---|---|---|
| <gate> | <status> | <notes> |

## Security Gates

| Gate | Status | Notes |
|---|---|---|
| <gate> | <status> | <notes> |

## Open Risks

- <risk>

## Deferred Work

- <work>

## Known Non-Goals

- <non-goal>

## Final Recommendation

<ship | hold | ship with constraints | continue hardening>

## Evidence Index

- <artifact>
- <artifact>
```

## Persistence Layer

Markdown is reviewable state. It is not durable operational state.

For multi-project, multi-agent, or multi-session work, use a local coordinator database.

SQLite is the default persistence layer unless the initiative requires shared multi-user access.

Recommended location:

```text
.coordinator/
  coordinator.db
  initiative.config.json
  generated/
    CHARTER.md
    TRACKS.md
    INTEGRATION-SURFACES.md
    CONTRACTS.md
    SCENARIOS.md
    VERIFICATION.md
    SECURITY-GATES.md
    RELEASE-GATES.md
    FINAL-HANDOFF.md
```

The database is the source of operational truth. Markdown files may be generated for human review.

### Minimum SQLite Schema

```sql
CREATE TABLE initiatives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mission TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  name TEXT NOT NULL,
  repo_path TEXT,
  remote_url TEXT,
  default_branch TEXT,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  project_id TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE integration_surfaces (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  name TEXT NOT NULL,
  producer_track_id TEXT NOT NULL,
  consumer_track_id TEXT NOT NULL,
  contract_id TEXT,
  auth_boundary TEXT,
  data_classification TEXT,
  security_relevance TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (producer_track_id) REFERENCES tracks(id),
  FOREIGN KEY (consumer_track_id) REFERENCES tracks(id)
);

CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_track_id TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL,
  version TEXT,
  notes TEXT,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (owner_track_id) REFERENCES tracks(id)
);

CREATE TABLE work_items (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  track_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  branch TEXT,
  worktree TEXT,
  pr_url TEXT,
  assigned_agent TEXT,
  blocks_release INTEGER NOT NULL DEFAULT 0,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

CREATE TABLE work_item_dependencies (
  work_item_id TEXT NOT NULL,
  depends_on_work_item_id TEXT NOT NULL,
  PRIMARY KEY (work_item_id, depends_on_work_item_id),
  FOREIGN KEY (work_item_id) REFERENCES work_items(id),
  FOREIGN KEY (depends_on_work_item_id) REFERENCES work_items(id)
);

CREATE TABLE integration_scenarios (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  surface_id TEXT NOT NULL,
  name TEXT NOT NULL,
  environment_required TEXT NOT NULL,
  positive_or_negative TEXT NOT NULL,
  release_blocking INTEGER NOT NULL,
  security_relevance TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (surface_id) REFERENCES integration_surfaces(id)
);

CREATE TABLE verification_runs (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  scenario_id TEXT,
  work_item_id TEXT,
  environment TEXT NOT NULL,
  commit_set_json TEXT,
  command TEXT,
  result TEXT NOT NULL,
  evidence_path TEXT,
  notes TEXT,
  created_at_utc TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (scenario_id) REFERENCES integration_scenarios(id),
  FOREIGN KEY (work_item_id) REFERENCES work_items(id)
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  decision TEXT,
  owner TEXT,
  created_at_utc TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);

CREATE TABLE risks (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  mitigation TEXT,
  owner TEXT,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);

CREATE TABLE security_gates (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  surface_id TEXT,
  name TEXT NOT NULL,
  threat_class TEXT NOT NULL,
  required_evidence TEXT NOT NULL,
  status TEXT NOT NULL,
  blocking INTEGER NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (surface_id) REFERENCES integration_surfaces(id)
);

CREATE TABLE release_gates (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  required_evidence TEXT NOT NULL,
  status TEXT NOT NULL,
  owner TEXT,
  blocking INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);

CREATE TABLE session_handoffs (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  work_item_id TEXT,
  agent_name TEXT NOT NULL,
  session_label TEXT,
  starting_commit_set_json TEXT,
  ending_commit_set_json TEXT,
  files_changed_json TEXT,
  commands_run_json TEXT,
  tests_result TEXT,
  decisions_needed TEXT,
  blockers TEXT,
  next_safe_action TEXT,
  do_not_touch TEXT,
  created_at_utc TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (work_item_id) REFERENCES work_items(id)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  related_work_item_id TEXT,
  related_scenario_id TEXT,
  created_at_utc TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);
```

### State Rules

* Every work item must belong to an initiative.
* Every integration scenario must belong to an integration surface.
* Every security gate must be tied to a surface unless it is initiative-wide.
* Every verification run must include an environment.
* Every agent session must leave a handoff if it changes files, state, decisions, or evidence.
* Generated markdown must not be manually edited unless the coordinator explicitly allows it.

## Session Handoff

Session handoff is mandatory.

Every agent session must report:

````md
# Session Handoff - <work-item-id>

## Initiative

<initiative-id>

## Work Item

<work-item-id>

## Agent / Session

<agent name or session label>

## Starting State

- Branch:
- Worktree:
- Starting commit:
- Relevant dependencies:

## Ending State

- Branch:
- Ending commit:
- PR:
- Status:

## Files Changed

- <file>
- <file>

## Commands Run

```bash
<command>
````

## Verification Result

<result>

## Decisions Needed

* <decision or none>

## Blockers

* <blocker or none>

## Next Safe Action

<one concrete next action>

## Do Not Touch

* <path, surface, behavior, or boundary>

````

If the session cannot complete its work, the handoff must say exactly where it stopped and what is safe to do next.

## Status Vocabulary

Use these states consistently.

### Work Item Status

- proposed
- ready
- dispatched
- in-progress
- blocked
- in-review
- merged
- rejected
- deferred
- canceled

### Scenario Status

- pending
- running
- passing
- failing
- blocked
- skipped
- not-applicable

### Gate Status

- pending
- ready-for-review
- passing
- failing
- blocked
- waived
- not-applicable

### Initiative Status

- discovered
- chartered
- active
- blocked
- release-candidate
- ready
- shipped
- deferred
- canceled

## Security Gate Orchestration

The coordinator must identify security-sensitive boundaries.

Security review should be invoked when a surface involves:

- Authentication
- Authorization
- Agent tool execution
- Public input
- External input
- Prompt injection risk
- Indirect prompt injection risk
- Secrets
- Credentials
- Tokens
- Tenant data
- Audit logs
- Receipts
- Persistent storage
- Billing or payments
- Deployment exposure
- Administrative capability
- Customer data
- PII
- Cross-tenant behavior

The coordinator does not perform all security analysis unless assigned. The coordinator ensures the correct security skill or reviewer is invoked and blocks release until evidence exists.

## Environment Readiness Matrix

Every initiative with deployment implications must maintain an environment matrix.

```md
# Environment Readiness - <Initiative Name>

| Environment | Purpose | Required? | Status | Evidence |
|---|---|---|---|---|
| local | developer integration | yes | passing | verification run vr-001 |
| staging | release candidate validation | yes | pending | none |
| production | public/customer exposure | yes | blocked | requires release gates |
````

Rules:

* Local passing does not imply staging passing.
* Staging passing does not imply production safety.
* Production release requires explicit release gates.
* Public static proof is an environment if it supports public claims.
* Sandbox and production tenant realms must be treated separately where applicable.

## Contract Amendment Rule

Cross-project contracts are stable by default.

A contract amendment must:

1. Identify the contract being changed
2. Identify all affected tracks
3. Identify all affected scenarios
4. Identify all affected work items
5. Update fixtures and examples
6. Update tests
7. Update dependent specs
8. Land before dependent work resumes
9. Include migration notes if existing behavior is affected

Contract amendment template:

```md
# Contract Amendment - <amendment-id>

## Contract

<contract-id>

## Reason

<why change is needed>

## Change

<what changes>

## Affected Tracks

- <track>

## Affected Scenarios

- <scenario>

## Affected Work Items

- <work item>

## Required Updates

- <fixture>
- <test>
- <doc>
- <spec>

## Migration Notes

<notes>

## Status

<proposed | approved | merged | rejected>
```

## Coordinator Review Checklist

Before declaring an initiative ready, the coordinator checks:

1. Is the initiative charter complete?
2. Are all tracks named?
3. Are all integration surfaces mapped?
4. Are contracts documented?
5. Are contract amendments resolved?
6. Are project-local parcels merged or explicitly deferred?
7. Are integration scenarios defined?
8. Are required scenarios passing in required environments?
9. Are security gates complete or explicitly waived?
10. Are release gates complete?
11. Are public claims supported by evidence?
12. Are unresolved decisions documented?
13. Are risks documented with mitigation?
14. Are session handoffs complete?
15. Is the final handoff accurate?
16. Is the recommendation honest?

If any item is unknown, the initiative is not ready.

## Anti-Patterns

Avoid these.

### PR Completion Theater

Treating merged PRs as proof that the initiative is ready.

Merged code is not the same as verified behavior.

### Unit-Test Mirage

Believing a system works because every repo passed its own tests.

Distributed systems fail at boundaries.

### Ghost Dependency

One project silently depends on behavior in another project without a tracked integration surface.

### Chat-History State

Relying on conversation memory instead of durable coordinator state.

### Security Later

Treating security as a final polish step after implementation.

Security-sensitive surfaces must be identified during planning.

### Staging Surprise

Waiting until staging to discover missing configuration, auth, environment, or contract assumptions.

### Silent Waiver

Skipping a release gate without recording who waived it and why.

### Big-Bang Integration

Letting many tracks build independently, then trying to wire everything at the end.

### Evidence-Free Public Claims

Publishing public claims without mapped proof artifacts.

### Agent Drift

Letting an agent continue after it encounters missing product, security, or contract decisions.

## Recommended Directory Structure

For a shared skills repo:

```text
skills/
  initiative-coordination/
    SKILL.md
    templates/
      CHARTER.md
      DISCOVERY.md
      TRACKS.md
      INTEGRATION-SURFACES.md
      CONTRACTS.md
      SCENARIOS.md
      DISPATCH.md
      VERIFICATION.md
      SECURITY-GATES.md
      RELEASE-GATES.md
      SESSION-HANDOFF.md
      FINAL-HANDOFF.md
    examples/
      keon-rc-integration-readiness/
        CHARTER.md
        TRACKS.md
        INTEGRATION-SURFACES.md
        SCENARIOS.md
        RELEASE-GATES.md
```

For a project using this skill:

```text
.agent/
  skills.config.json
  project-context.md

.coordinator/
  coordinator.db
  initiative.config.json
  generated/
    CHARTER.md
    TRACKS.md
    INTEGRATION-SURFACES.md
    CONTRACTS.md
    SCENARIOS.md
    VERIFICATION.md
    SECURITY-GATES.md
    RELEASE-GATES.md
    FINAL-HANDOFF.md

docs/
  INITIATIVES/
    <initiative-id>/
      CHARTER.md
      TRACKS.md
      INTEGRATION-SURFACES.md
      CONTRACTS.md
      SCENARIOS.md
      VERIFICATION.md
      SECURITY-GATES.md
      RELEASE-GATES.md
      FINAL-HANDOFF.md
```

## Example: Keon RC Integration Readiness

```md
# Initiative Charter - keon-rc-integration-readiness

## Mission

Prove that Keon public surfaces, Control, Collective, MCP Gateway, Runtime, and Cortex compose correctly across intended boundaries with governed execution, denial behavior, receipt evidence, tenant/environment separation, and release-ready verification.

## Tracks

- Public Website
- Control
- Collective
- MCP Gateway
- Runtime
- Cortex
- Deployment
- Evidence
- Security Review

## Required Integration Surfaces

- Public proof page -> evidence artifact contract
- Collective -> GovernedIntentHandoff
- MCP Gateway -> Runtime governed execute
- Runtime -> Cortex receipt write/read
- Control -> tenant/environment provisioning
- Deployment -> environment configuration

## Required Scenarios

- Public proof artifact loads and matches manifest
- Collective produces handoff but does not execute effects
- Unauthorized MCP Gateway request is denied by Runtime
- Denied action creates receipt/no-execution evidence
- Runtime receipt can be read from Cortex
- Tenant/environment partitioning holds
- Control provisioning does not leak credentials
- Public claim map has evidence for each claim

## Release Gates

- Contracts stable
- Local integration passing
- Staging integration passing
- Security gates complete
- Evidence complete
- Public claims supported
- Final handoff complete
```

## Output Artifacts From This Skill

When applying this skill, produce:

1. Discovery document
2. Initiative charter
3. Track map
4. Integration surface map
5. Contract map
6. Scenario matrix
7. Dispatch board
8. Verification log
9. Security gate map
10. Release gate checklist
11. Session handoff log
12. Risk and decision log
13. Evidence index
14. Final handoff
15. Optional SQLite coordinator database

## Final Notes

This skill is about truth at system level.

A repo can be green while the initiative is red.

A PR can be merged while the boundary is unproven.

An agent can finish its task while the product remains blocked.

The coordinator’s job is to keep the whole map alive, force boundaries into the open, preserve durable state, and prove readiness with evidence.

If Parcel-Driven Development prevents repo-local chaos, Initiative Coordination prevents multi-project chaos.