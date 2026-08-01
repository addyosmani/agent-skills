---
name: parcel-driven-development
description: Reusable methodology for coordinating multi-agent, multi-session, and multi-project development through contract-first parcels, initiative-level coordination, persisted state, integration readiness, and release gate discipline. Use when a feature or initiative is too large for one agent to ship end-to-end, when work spans multiple sessions or repositories, when integration boundaries matter, or when external stakeholders, security review, UAT, or release readiness require consistent evidence.
---

# Parcel-Driven Development Skill

A methodology for shipping large features and multi-project initiatives by composing small, isolated, agent-built parts against stable contracts, with coordinator-owned sequencing, persistent state, integration readiness, and release gate discipline.

## Core Principle

> Prefer contract-first, parcel-sized development. Agents produce isolated, testable parts against stable interfaces. Coordination happens through contracts, initiative state, dependency graphs, integration surfaces, verification evidence, and merge discipline, not through agents negotiating with each other.

The assembly-line analogy still applies: agents are workers building specific, scoped, well-defined parts. The **coordinator** owns the contracts, dependency graph, scope enforcement, integration sequencing, state persistence, release gates, and escalation of product decisions.

Agents do not need to understand the whole product. They need to understand their assigned part deeply, build only against the approved contract, verify their work, and produce a clean handoff.

For multi-project initiatives, the coordinator is not merely sequencing branches. The coordinator is managing the initiative from end to end across repositories, services, deployment environments, integration boundaries, evidence artifacts, and release readiness.

> **A note on roles:** This skill uses "coordinator" deliberately. The role is operational, not purely architectural. The coordinator owns contracts, the dependency graph, scope enforcement, integration surfaces, persistent state, release gates, and escalation. Teams may substitute their own term such as "parcel owner," "tech lead," "feature owner," or "initiative owner," as long as the responsibilities stay intact.

## Mental Model

```text
Initiative Coordination = commander map
Parcel-Driven Development = squad-level execution
Security Review = hostile boundary inspection
Persistence Layer = operational memory
Integration Scenarios = truth serum
```

Unit tests prove parts.

Integration scenarios prove boundaries.

Release gates prove readiness.

Evidence artifacts prove claims.

## When to Use This Skill

Use this skill when:

- A feature is too large for one agent to ship end-to-end without making product decisions
- Multiple concurrent agent sessions are needed to hit a timeline
- Work spans multiple files, components, services, applications, or repositories
- The reviewer is the bottleneck and parcel reviews are faster than feature reviews
- The product surface will be evaluated by external stakeholders
- The work crosses integration boundaries such as API, auth, tenant, receipt, deployment, or public proof surfaces
- You need resumable coordination across multiple agent sessions
- You need durable initiative state instead of relying on chat history
- You need integration readiness, release candidate readiness, UAT readiness, or security gate tracking

Do NOT use this skill when:

- The work is a single bug fix or surgical change
- The feature is small enough that one agent can safely ship it end-to-end
- Contracts would be over-engineering for the scope
- The work has no meaningful integration, review, or release coordination risk

## Modes

This skill has two modes.

### Repo-Local Parcel Mode

Use this when the effort is contained inside one repository or one tightly bounded project surface.

The coordinator manages:

- Repo discovery
- Contract PR
- Thin vertical spike
- Parcel specs
- Worktrees and branches
- Parcel review
- Merge sequencing
- Repo-local verification

### Multi-Project Initiative Mode

Use this when the effort spans multiple repositories, services, applications, deployment environments, or integration boundaries.

The coordinator manages everything in Repo-Local Parcel Mode, plus:

- Initiative brief
- Project track map
- Cross-project dependency graph
- Integration surface map
- Environment readiness matrix
- Integration scenario matrix
- Security gate map
- Release gate checklist
- Persistent coordinator state
- Session handoff log
- Evidence index

Use Multi-Project Initiative Mode for platforms like Keon where public surfaces, gateway services, runtime services, memory/receipt systems, control planes, deployment environments, and proof artifacts must function together.

## Vocabulary

### Initiative

A named effort that spans one or more projects, repositories, services, environments, or stakeholder-facing outcomes.

Example:

```text
Keon RC Integration Readiness
```

### Project Track

The slice of an initiative owned by one repo, service, app, deployment unit, or documentation/evidence area.

Examples:

```text
keon-systems-web
Keon.MCPGateway
Keon.Runtime
Keon.Cortex
Keon.Collective
Keon.Control
Deployment / Azure
Proof artifacts / docs
```

### Integration Surface

A contract boundary between two or more tracks.

Examples:

```text
Public web proof page -> MCP Gateway live check
MCP Gateway -> Runtime governed execution
Runtime -> Cortex receipt write
Collective -> GovernedIntentHandoff
Control -> tenant/environment provisioning
```

### Parcel

One atomic unit of agent work inside a project track. A parcel has its own branch, worktree, spec, verification command, and acceptance criteria.

### Integration Parcel

A parcel focused on proving or hardening behavior across project boundaries. It may add tests, harnesses, fixtures, config, scripts, or documentation, but should not casually implement unrelated features.

### Release Gate

A checkable readiness condition that must pass before promotion, public launch, UAT, or production exposure.

### Evidence Artifact

A durable proof object such as a test report, receipt, manifest, screenshot, trace, verifier output, static fixture, deployment URL, PR link, or command transcript.

## The Hard Rules

These are not guidelines. They are enforceable boundaries.

1. **Contracts before parallel implementation.** Types, fixtures, examples, and minimal tests land before parallel work forks.
2. **One parcel, one branch, one worktree.** No agent works in a shared directory. No branch contains multiple parcels.
3. **Parcels must be independently reviewable.** If a reviewer needs three other parcels to evaluate this one, the parcel is too big or has hidden dependencies.
4. **Specs must name allowed files.** Every parcel spec lists files the agent may touch. Files outside that list are forbidden.
5. **Shared integration files are serialized.** Route registries, index/barrel exports, app shells, lockfiles, environment config, deployment manifests, and other shared files cannot be touched by parallel parcels unless explicitly sequenced.
6. **Rebase from the base branch before PR.** Every parcel rebases onto current base branch immediately before opening or updating its PR.
7. **Tests or manual verification required per parcel.** Every parcel spec lists how to verify it works. Agents complete verification before declaring done.
8. **Agents stop on missing product decisions.** If implementation requires a product call not present in the spec, the agent halts and reports the decision needed.
9. **No silent public contract changes.** If a parcel needs to change an approved contract, it stops and requests an amendment.
10. **No secrets, PII, payload dumps, or unsafe logs.** Standard safety floor applies to every parcel regardless of scope.
11. **Integration surfaces must have scenarios.** A boundary is not ready until positive, negative, and failure-mode scenarios are defined and tracked.
12. **Security gates block release.** If a surface requires security review, release cannot proceed until required security evidence exists.
13. **Persistent state beats chat memory.** Multi-session or multi-project coordination must store durable initiative state outside the conversation.
14. **A scenario is environment-specific.** A scenario is not simply "passing." It is passing in a specific environment against a specific build, config, and deployment.
15. **Evidence beats claims.** Public, stakeholder, UAT, or release claims must be backed by evidence artifacts.

## Time, Calendars, and the Two Clocks

This methodology runs on two clocks. Conflating them produces bad plans.

### Calendar time belongs to coordination gates

Humans, reviewers, UAT windows, security scans, stakeholder ceremonies, and deployments move on human time.

Calendar-bound concepts:

- Wave
- Milestone
- Release candidate
- UAT window
- Security review window
- Stakeholder review
- Deployment window

These exist in calendar days and weeks because the humans and processes attached to them do.

### Execution time belongs to parcels

Agent execution units measure work done, not days spent.

Execution-bound concepts:

- Parcel
- Batch
- Merge queue
- Verification pass
- Integration scenario run
- Release gate check

Suggested targets:

- **Agent implementation target:** 20 to 90 minutes for code changes and local verification
- **Parcel lifecycle target:** 2 to 4 hours wall-clock including context load, review, rebase, PR cleanup, and merge
- **Integration parcel lifecycle target:** long enough to produce trustworthy evidence, not long enough to become a hidden feature build
- **Wave target:** complete when the dependency graph clears and exit criteria pass

A wave is done when its exit criteria are checkable as true, not when a duration expires.

## Phase -2: Initiative Classification

Before repo discovery, decide whether this is Repo-Local Parcel Mode or Multi-Project Initiative Mode.

Ask:

- Does this touch more than one repository?
- Does it cross service, auth, tenant, data, deployment, or public proof boundaries?
- Does success require an end-to-end scenario?
- Does release readiness depend on more than one project track?
- Will multiple agent sessions need to resume state over time?
- Is security review required for any boundary?
- Would a merged PR still be insufficient to prove the initiative is done?

If yes to any of these, use Multi-Project Initiative Mode.

Output:

```md
# Initiative Classification

Mode: <Repo-Local Parcel Mode | Multi-Project Initiative Mode>
Reason:
Scope:
Primary tracks:
Primary integration surfaces:
Required gates:
Persistence required: <yes/no>
```

## Phase -1: Repo and Project Discovery

Before writing strategy or parcels, the coordinator inspects the target repo or project set to ground the methodology in real constraints.

Mandatory discovery items per repo:

- **Agent instructions:** `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.windsurfrules`, or repo-specific agent operating instructions
- **Build and test commands:** `package.json`, `Makefile`, CI workflows, test scripts, lint scripts, typecheck commands, build commands
- **Base branch:** default integration branch such as `main`, `develop`, `master`, or release branch
- **Existing patterns:** components, hooks, routing, state management, telemetry, error handling, tests, contracts, fixtures
- **Git state:** clean working tree, uncommitted changes, long-lived branches, existing worktrees
- **Branch naming conventions:** `feat/*`, `claude/*`, `codex/*`, ticket prefixes, or repo conventions
- **Serialization-point files:** barrel exports, route registries, app shells, lockfiles, environment config, shared manifests, deployment files
- **Existing skills/guidelines:** design systems, security rules, test standards, proof rules, copy rules, domain doctrine
- **Deployment posture:** local only, staging, production, static hosting, container app, internal ingress, public ingress
- **Data and auth posture:** tenant boundaries, credentials, secrets, role boundaries, token handling, test data classification

Output is a **Repo Constraints** section attached to the initiative or strategy doc.

For Multi-Project Initiative Mode, produce one Repo Constraints section per project track.

## Phase 0: Initiative Strategy

The coordinator writes a strategy document separate from any PR plan.

It establishes:

- Initiative name and purpose
- Feature or platform surface
- Why it matters
- What is strong today and must be preserved
- What is broken, missing, risky, or unproven
- Project tracks
- Integration surfaces
- Wave structure with exit criteria
- Release gates
- Security gates
- What ready means
- What evidence is required

Recommended path:

```text
docs/INITIATIVES/<initiative-id>/STRATEGY.md
```

For repo-local work, this may stay inside the repo.

For multi-project work, this should live in the coordinator workspace or the primary orchestration repo.

## Phase 1: Contracts PR

A single PR introduces the type definitions, fixtures, examples, and minimal tests for every contract the parallel work will build against.

Critical principles:

- **Types alone are not enough.** Include realistic fixtures and examples.
- **JSDoc on non-obvious fields.** Every field where reasonable people could disagree gets a canonical explanation.
- **Fixture tests.** A test should assert that fixtures satisfy the contract.
- **Runtime validation only when consistent with the repo.** Do not introduce zod, io-ts, or new validation frameworks as a side effect unless approved.
- **No UI wiring.** Contracts ship without broad consumers.
- **No silent cross-project contract drift.** If a contract is consumed across projects, the owner and version must be explicit.

For Multi-Project Initiative Mode, contracts include:

- Internal TypeScript/C# contracts
- API request/response contracts
- Fixture schema
- Receipt schema
- Evidence artifact schema
- Event/telemetry schema
- Environment config shape
- Error/refusal/denial shape

## Phase 2: Thin Vertical Spike

After contracts merge, build one small end-to-end consumer to validate the abstraction before scaling out.

Examples:

- One proof page live-check call from web to gateway
- One gateway denial path into runtime
- One runtime receipt write into Cortex
- One Collective handoff produced without execution
- One Control provisioning status round trip

If the spike reveals bad abstractions, fix the contracts before dispatching parallel work.

The cost of fixing a contract before five agents build against it is one PR.

The cost after is five PRs plus a contract amendment and rebase mess. That is how gremlins get a company badge.

## Phase 3: Parallel Parcel Dispatch

Parcels run in parallel waves.

Each parcel:

- Has its own worktree
- Has its own branch
- Has its own spec file
- Forks from current base branch
- Rebases onto the base branch immediately before PR
- Touches only allowed files
- Completes required verification
- Produces a session handoff

The coordinator dispatches parcels in dependency order.

The index tracks:

- Status
- Dependencies
- Collision risk
- Assigned worktree
- Branch
- PR link
- Agent/session owner
- Verification state
- Handoff state

## Phase 4: Assembly and Integration

Once primitive parcels are merged, assembly parcels wire them together.

Assembly parcels usually touch shared integration files, so they sequence rather than parallelize.

For Multi-Project Initiative Mode, integration parcels validate cross-project behavior.

Integration parcels should define:

- Projects involved
- Boundary under test
- Environment
- Scenario
- Required evidence
- Positive path
- Negative path
- Failure path
- Verification command
- Known limitations

## Phase 5: Hardening and Release Readiness

Hardening follows assembly and integration.

Hardening areas:

- Empty states
- Error states
- Refusal/denial states
- Rate-limit behavior
- Unauthorized behavior
- Tenant isolation
- Telemetry
- Logging safety
- Retry behavior
- Timeout behavior
- Secrets handling
- Accessibility
- UAT checklist
- Security review prep
- Deployment config
- Rollback notes
- Evidence completeness

This phase should not become a feature expansion swamp. If hardening reveals missing product functionality, create a new parcel or new initiative.

## Multi-Project Initiative Artifacts

In Multi-Project Initiative Mode, produce these artifacts:

```text
docs/INITIATIVES/<initiative-id>/
  STRATEGY.md
  TRACKS.md
  INTEGRATION-SURFACES.md
  SCENARIOS.md
  ENVIRONMENTS.md
  SECURITY-GATES.md
  RELEASE-GATES.md
  EVIDENCE.md
  DECISIONS.md
  RISKS.md
  SESSION-HANDOFFS.md
  PARCELS.md
```

If a persistence layer is used, these markdown files may be generated views. The database remains the source of operational truth.

## Persistence Layer

Markdown is reviewable state, not durable operational state.

For multi-session or multi-project work, maintain a local coordinator database. SQLite is the default unless the initiative requires shared multi-user access.

Recommended local structure:

```text
.coordinator/
  coordinator.db
  initiative.config.json
  generated/
    STRATEGY.md
    TRACKS.md
    INTEGRATION-SURFACES.md
    SCENARIOS.md
    ENVIRONMENTS.md
    SECURITY-GATES.md
    RELEASE-GATES.md
    EVIDENCE.md
    DECISIONS.md
    RISKS.md
    SESSION-HANDOFFS.md
    PARCELS.md
```

The database tracks initiatives, projects, repositories, tracks, integration surfaces, contracts, parcels, parcel dependencies, worktrees, branches, pull requests, verification runs, integration scenarios, scenario runs, decisions, risks, blockers, security findings, release gates, evidence artifacts, agent sessions, and session handoffs.

> **Schema:** The canonical SQLite schema is defined and owned by the `initiative-coordination` skill. Parcel-driven-development extends the base schema with the `parcels` and `parcel_dependencies` tables below. Use IC's base schema as the starting point and add these tables alongside it.

```sql
-- PDD-specific tables (add to the IC base schema)

CREATE TABLE parcels (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  track_id TEXT,
  wave TEXT NOT NULL,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  status TEXT NOT NULL,
  collision_risk TEXT NOT NULL,
  pr_url TEXT,
  assigned_agent TEXT,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

CREATE TABLE parcel_dependencies (
  parcel_id TEXT NOT NULL,
  depends_on_parcel_id TEXT NOT NULL,
  PRIMARY KEY (parcel_id, depends_on_parcel_id),
  FOREIGN KEY (parcel_id) REFERENCES parcels(id),
  FOREIGN KEY (depends_on_parcel_id) REFERENCES parcels(id)
);
```

The schema is intentionally boring. Boring persistence is good. The coordinator does not need a cathedral. It needs a ledger.

## Integration Surface Template

> **Canonical definition:** The full integration surface template — including producer, consumer, contract, positive/negative/failure scenarios, auth boundary, data classification, required evidence, environment coverage, security gate status, and release blocking fields — is defined and owned by the `initiative-coordination` skill.
>
> When filling out an integration surface in a PDD initiative, use the template from IC. PDD parcels reference surface IDs; they do not redefine the surface structure.

## Integration Scenario Matrix

> **Canonical definition:** The integration scenario matrix — including scenario ID, tracks, surface, environment, positive/negative type, required evidence, and status — is defined and owned by the `initiative-coordination` skill (Phase 2: Contract and Scenario Planning).
>
> PDD's parcel specs reference scenario IDs. PDD does not maintain a separate scenario matrix schema.

## Environment Readiness Matrix

> **Canonical definition:** The environment readiness matrix — including environment, purpose, required scenarios, deployment, secrets realm, and status — is defined and owned by the `initiative-coordination` skill.
>
> Key rules (from IC): local passing does not imply staging passing; staging passing does not imply production safety; production release requires explicit release gates; tenant and environment/data realm must be tracked separately for tenant-aware systems.

## Security Gate Orchestration

This skill does not replace a security review skill. The `security-review` skill performs the actual analysis.

> **Canonical definition:** The security gate template, gate map, security-sensitive surface list, and waiver rules are defined and owned by the `initiative-coordination` skill (Phase 5: Security and Release Gates).
>
> PDD's responsibility: parcel specs identify whether a security gate applies (`Security Gate` field in the parcel spec) and parcel agents produce any required security evidence. The gate itself is tracked in IC's gate map. A parcel with a security gate requirement cannot be considered release-ready until IC records the gate as passed.

## Release Gates

> **Canonical definition:** The release gate checklist, gate template, and gate vocabulary are defined and owned by the `initiative-coordination` skill (Phase 5: Security and Release Gates).
>
> PDD's responsibility: each parcel spec declares whether it is release-blocking (`Release Gate` field), and parcel agents must produce the required evidence before a gate can be marked passing. PDD does not define gate structure; it supplies evidence to IC's gate checklist.

## Parcel Shape Guidance

### Good parcel types

Parcels are nouns, not broad feature wishes.

Good parcel types:

- Contract / type
- Pure component
- Pure function
- Static prompt set
- Adapter
- Renderer
- Wiring step
- Test-only hardening
- Telemetry-only instrumentation
- Config-only environment wiring
- Integration harness
- Scenario test
- Evidence manifest update
- Security gate test

### Bad parcel types

These are features, not parcels:

- "Build feature X"
- "Make UX better"
- "Support citations"
- "Clean up AI drawer"
- "Refactor conversation system"
- "Finish integration"
- "Make security good"
- "Prepare for launch"

### Sizing

- Agent implementation target: 20 to 90 minutes of focused execution
- Full parcel lifecycle: 2 to 4 hours wall-clock
- If implementation alone would take longer than 90 minutes, decompose it
- If a parcel is easy but touches many files, it is still too big
- If a parcel crosses a security boundary, make the boundary explicit
- If a parcel crosses a project boundary, consider making it an integration parcel

## Parcel Spec Template

Every parcel file MUST use this structure.

```md
# Parcel: <parcel-id>

## Goal
<One sentence. What this parcel produces.>

## Initiative
<initiative-id or n/a>

## Project Track
<repo/service/app/docs/deployment track>

## Wave
<W1 | W2 | W3 | Integration | Hardening | Release>

## Branch
<branch-prefix>/<wave>-<parcel-id>

## Worktree
<C:\Repos\<repo>.<parcel-id> or platform equivalent>

## Dependencies
- <parcel-id this parcel cannot start until merged>

## Integration Surfaces
- <surface-id or none>

## Security Gate
<none | gate-id | security review required before merge | security review required before release>

## Allowed Files
- <exact path>
- <exact path>

If a required file is not listed, stop and request a spec amendment before editing or creating it.

## Forbidden
- <Things the agent must NOT do, even if helpful>
- <Specifically call out integration files and adjacent surfaces>

## Out of Scope
<Explicit non-goals at the product level.>

Forbidden tells the agent where not to step. Out of Scope tells the reviewer what not to flag as missing.

## Existing Patterns To Follow
- <path/to/existing/example.tsx or equivalent> - <describe what to mirror>

## Contract
<Inline type signatures, prop interfaces, function signatures, API contract, schema, or links to the contracts PR>

## Required Tests
- <test file path or test behavior to verify>

If none, state: "No automated tests required. Manual verification required."

## Acceptance Criteria
- <Observable behavior>
- <Required output of verification step>

## Verification
- <Exact commands to run>
- <What success looks like>

## Evidence Required
- <test output>
- <screenshot>
- <receipt>
- <artifact path>
- <PR link>

## Collision Risk
<Low | Medium | High>

List files, surfaces, or parcels that could collide.

## PR Notes
- What changed: <one-line summary>
- Why: <pointer to strategy doc and/or parcel goal>
- Risk: <known risks introduced by this parcel>
- Verification: <how reviewer can verify beyond CI passing>
- Evidence: <artifact links or paths>

## Session Handoff
- Starting commit:
- Ending commit:
- Files changed:
- Commands run:
- Tests passed:
- Tests failed:
- Decisions needed:
- Blockers:
- Next safe action:
- Do not touch:

## Stop-and-Report Rule
If implementation requires a product decision not present in this spec, stop and report the decision needed.

If a required file is not in Allowed Files, stop and request a spec amendment before editing or creating it.

If the contract needs to change, stop and request a contract amendment.

If a security boundary is unclear, stop and request clarification before implementation.
```

## Parcel Index Document

`<project-root>/docs/specs/INDEX.md` is the project-local coordination board.

For multi-project initiatives, this can be generated from the coordinator database.

```md
# Parcel Index: <Feature or Initiative Name>

## Status

| Parcel | Project | Wave | Status | Worktree | Branch | PR | Assignee |
|---|---|---|---|---|---|---|---|
| w1-contracts-ai-core | web | W1 | merged | n/a | merged | #N | Claude A |
| w1-thread-tabs | web | W1 | in-review | C:\Repos\repo.w1-thread-tabs | feat/w1-thread-tabs | #N | Claude B |

## Dependency Graph

w1-contracts-ai-core -> w1-thread-tabs
w1-contracts-ai-core -> w1-message-actions
w1-thread-tabs + w1-message-actions -> w2-wire-ai-drawer

## Collision-Risk Files

| File | Owning Parcels | Risk | Sequence |
|---|---|---|---|
| src/lib/ai-prompts/index.ts | w1-prompt-routing, w2-help-prompts-wire | high | serialized |

## Integration Surfaces

| Surface | Producer | Consumer | Contract | Status |
|---|---|---|---|---|
| web-proof-live-check | web | gateway | ProofLiveCheckRequest/Response | pending |

## Wave Status

W1:
- Parcels merged: X/N
- Exit criteria met: <yes/no/which-pending>

W2:
- Parcels merged: X/N
- Exit criteria met: <yes/no/which-pending>

Integration:
- Scenarios passing: X/N
- Blocking scenarios: <list>

## Contract Amendments

| Amendment | Contract | Affected Parcels | Status | Migration Note |
|---|---|---|---|---|
| ca-001 | AiCitation | w2-citation-renderer | proposed | none |

## Open Decisions Needed

- <Any parcels that hit the stop-and-report rule>

## Blockers

- <Current blockers>

## Evidence Index

| Evidence | Type | Parcel/Scenario | Path/Link | Status |
|---|---|---|---|---|
```

## Branch and Worktree Hygiene

### Local pattern

```bash
# From the main repo, ensure local <base-branch> is current with origin.
git fetch origin
git checkout <base-branch>
git pull --ff-only origin <base-branch>

# Create a worktree per active parcel.
git worktree add C:\Repos\<repo>.<parcel-id> -b <branch-prefix>/<wave>-<parcel-id> <base-branch>
```

Each agent works in its own directory.

Branch prefix and base branch are locked during discovery.

### Merge pattern

```bash
# Inside the parcel worktree, immediately before opening or updating the PR.
git fetch origin
git rebase origin/<base-branch>
# Resolve conflicts, rerun verification, then push.
```

Rules:

- Every parcel branches off current base branch
- Every parcel rebases before PR
- Parcels never branch off other parcels unless explicitly specified
- No long-lived integration branches unless the coordinator explicitly creates one for release candidate assembly
- If an integration branch exists, it is temporary and documented

## Serialization Points

Serialization points are files or surfaces that many things import, route through, or depend on.

Examples:

- Index/barrel exports
- Route registries
- App shells
- Layout roots
- Package files and lockfiles
- Theme/token files
- Environment config
- Deployment manifests
- CI workflows
- API gateway route maps
- Public proof registries
- Evidence pack manifests

When a parcel needs to touch a serialization point:

- Mark collision risk High
- Track it in the index
- Merge it sequentially
- Rebase downstream parcels immediately after merge

## Contract Amendment Rule

Contracts shipped in Phase 1 are stable by default. They are not immutable, but they cannot be changed silently.

> **Canonical template:** The contract amendment template and full amendment workflow are defined and owned by the `initiative-coordination` skill (Contract Amendment Rule section).
>
> PDD-specific responsibility: parcel agents stop and report when a contract change is needed. The coordinator opens a contract amendment (using IC's template), and affected parcels pause until the amendment merges. PDD enforces the stop-and-report rule at the parcel level; IC owns the amendment record.

Agents do not edit approved contracts directly from parcel branches.

If a contract obviously needs to change, the agent stops and requests an amendment.

## Session Handoff

Every agent session that changes code, docs, config, contracts, or evidence must produce a session handoff.

> **Canonical template:** The session handoff template is defined and owned by the `initiative-coordination` skill. Use IC's SESSION-HANDOFF template. PDD extends it with parcel-specific fields (`Parcel`, `Tests Passed`, `Tests Failed`) already present in IC's handoff schema.

The handoff is not a vibes recap. It is an operational baton pass.

## Review Workflow

The coordinator reviews each parcel against its spec.

Checklist:

1. Does implementation match the contract?
2. Are only Allowed Files touched?
3. Were Forbidden items respected?
4. Did the parcel respect Out of Scope?
5. Did the agent avoid silent product decisions?
6. Were required tests or manual verification completed exactly as specified?
7. Did the parcel avoid secrets, PII, unsafe logs, and payload dumps?
8. If crossing supportability boundaries, were logs, metrics, and traces handled appropriately?
9. If crossing integration boundaries, was the relevant surface updated or referenced?
10. If security gate applies, was the required security evidence produced or tracked?
11. Was the session handoff completed?
12. Was persistent coordinator state updated if required?

A parcel that fails gets sent back with specific notes.

A parcel that passes gets merged quickly so downstream parcels can rebase.

## Dispatch Patterns

### Pattern: Wave 1 foundation dispatch

After contracts and thin vertical spike merge:

- Dispatch all parallel-safe primitive parcels
- Each gets its own worktree, branch, and agent session
- Review and merge as they complete
- Rebase queue maintains ordering for collision-risk parcels

### Pattern: Wave 2 assembly dispatch

- Dispatch one wiring parcel per integration surface or app surface
- Serialize parcels that touch the same integration file
- Each consumes Wave 1 outputs

### Pattern: Integration dispatch

- Dispatch integration parcels after relevant implementation parcels merge
- Run boundary scenarios
- Capture evidence
- Track results by environment
- Do not treat local success as staging success

### Pattern: Wave 3 hardening dispatch

- Lower parallelism
- Higher care
- Focus on error states, denial states, telemetry, accessibility, tenant boundaries, and supportability
- Often involves the coordinator directly

### Pattern: Release gate pass

- Freeze feature expansion
- Verify release gates
- Verify security gates
- Verify integration scenarios
- Verify evidence artifacts
- Verify public claims
- Produce release candidate summary

## When Things Go Wrong

### Contract was wrong

- Coordinator opens a contract amendment
- Affected parcels pause
- Fixtures, examples, tests, specs, and scenario expectations update together
- Dependent parcels rebase after amendment merges

### Agent expanded scope

- PR rejected with specific removal notes
- Spec may get stricter Forbidden items
- Repeat offenders get narrower allowed files

### Two parcels collided on a serialization point

- First valid PR merges
- Second rebases
- Coordinator resolves non-trivial conflict
- Index updates to prevent repeat collision

### Agent made a silent product decision

- PR rejected
- Decision escalated to product owner/coordinator
- Spec amended before work resumes

### Integration scenario fails

- Do not patch randomly across repos
- Identify failed boundary
- Determine producer, consumer, contract, environment, and evidence gap
- Create a targeted integration parcel or contract amendment
- Update scenario status and release gate impact

### Security gate fails

- Block release gate
- Record finding
- Assign mitigation parcel
- Require evidence before reopening the gate
- Do not downgrade severity without documented approval

### Persistent state drifts from repo reality

- Reconcile from source of truth: git, PRs, CI, artifact paths, scenario runs
- Regenerate markdown views
- Record reconciliation note
- Do not hand-edit generated docs unless explicitly allowed

## Anti-Patterns to Avoid

- **The "while you're in there" expansion.** Agents fix related code that was not in scope.
- **The silent contract change.** Adding a prop, field, enum value, endpoint behavior, or fixture shape without amendment.
- **The fake integration pass.** Unit tests pass, but no boundary scenario was run.
- **The everything-is-ready PR.** A PR merged and everyone pretends the initiative is complete.
- **The invisible security dependency.** Security review is assumed instead of tracked.
- **The chat-history coordinator.** State lives in conversation memory instead of a durable store.
- **The staging surprise.** Local passes, staging fails because config, secrets, ingress, tenant, or deployment assumptions were never modeled.
- **The proof claim without evidence.** Public copy claims something no artifact proves.
- **The integration branch swamp.** A temporary branch becomes a second main.
- **The agent democracy problem.** Multiple agents negotiate architecture independently instead of following coordinator-owned contracts.

## Output Artifacts From This Skill

For repo-local work, produce:

1. Repo Constraints note
2. Strategy document
3. Contracts PR
4. Thin vertical spike PR
5. Parcel index
6. Per-parcel specs
7. Dispatch order
8. Review notes
9. Session handoffs

For multi-project initiatives, also produce:

1. Initiative Classification
2. Project Track Map
3. Integration Surface Map
4. Integration Scenario Matrix
5. Environment Readiness Matrix
6. Security Gate Map
7. Release Gate Checklist
8. Persistent Coordinator State
9. Evidence Index
10. Decision Log
11. Risk Register
12. Cross-project Release Candidate Summary

## Keon Example: RC Integration Readiness

Example initiative:

```text
Initiative: Keon RC Integration Readiness

Goal:
Prove that the Keon public surfaces, Control cockpit, Collective cognition layer, MCP Gateway, Runtime, and Cortex work together across intended boundaries with security-relevant denial paths, receipt evidence, tenant/environment separation, and release-ready verification.
```

Primary tracks:

```text
keon-systems-web
Keon.MCPGateway
Keon.Runtime
Keon.Cortex
Keon.Collective
Keon.Control
Deployment / Azure
Security review
Evidence / documentation
```

Primary integration surfaces:

```text
Public web proof page -> MCP Gateway live check
MCP Gateway -> Runtime governed execute
Runtime -> Cortex receipt write/read
Collective -> GovernedIntentHandoff
Control -> tenant/environment provisioning
Public proof fixtures -> verifier/evidence contract
```

Primary release gates:

```text
Contract map complete
Integration scenario matrix complete
Local integration passing
Staging integration passing
Security gates complete
Evidence pack/proof claims aligned
Tenant/environment separation verified
Production exposure reviewed
Release candidate approved
```

Example integration scenarios:

```text
Live proof check denies unauthorized OpenClaw command
Gateway refuses malformed or unauthenticated request
Runtime denies unauthorized governed effect
Runtime writes denial receipt to Cortex
Cortex receipt can be retrieved/replayed without mutation
Collective produces handoff but cannot execute directly
Control provisions tenant environment without cross-realm data promotion
Public proof page does not claim live verification when static fixture is used
```

## Final Notes

This skill is about five things:

- **Replacing negotiation with contracts.** Agents should not infer what other agents meant.
- **Replacing creativity with constraint.** Agents should not make product decisions while being helpful.
- **Replacing memory with persistence.** Multi-session coordination should survive chat resets.
- **Replacing unit-test confidence with integration evidence.** Parts passing does not prove boundaries work.
- **Replacing launch vibes with release gates.** Readiness is a checklist backed by evidence.

If parcel boundaries are enforced, contracts are crisp, initiative state is durable, and integration scenarios are real, the system can be assembled safely even when no single agent holds the whole product in its head.

This is the way.
