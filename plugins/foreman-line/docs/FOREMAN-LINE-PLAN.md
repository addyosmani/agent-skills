# The Foreman Line — Master Plugin Plan

**Version:** 0.1 (Draft — working name "the Line"; rename at will)
**Owner:** Clinton Morgan — Principal Agentic AI Platform Architect, KaseyaOne
**Status:** Proposed
**Thesis:** One orchestrated pipeline from idea to merged code, in which specs are the unit of truth, humans hold exactly two gates (dispatch and merge), every stage emits a verifiable receipt, and the platform layer (model routing, Kompress, audit suite, DocSpine) is wired in by default — not by memory.

---

## 1. What This Is

The Line is Foreman's flagship workflow: the end-to-end conveyor that carries a raw idea through shaping, registration, dispatch, build, verification, integration, and closure. It composes the plugins already ranked as force multipliers — Parcel Compiler, Verification Harness, Context Ledger, Adversarial Review Panel — plus the platform layer, into a single operable loop.

It is built the way it demands others build: parcel by parcel, under PDD, with the Line's own construction as the first proof.

---

## 2. Pipeline Stages

### Stage A — Intake & Shaping
Input: an idea or prompt. More context helps; none is required.

1. The **Shaping Agent** runs interactive ideation and optimization with the human: clarifies intent, surfaces constraints, proposes decomposition.
2. Output artifact: **parcel specs written to `plugins/foreman-line/docs/specs/`** — one per unit of work — each with intent, constraints, acceptance criteria, mandatory out-of-scope, plus new v0.2 schema fields: `risk:` and `surfaces:`.
3. The agent proposes the Epic → Story → Task tree as a *projection* of the parcel set.

> **Non-negotiable:** the spec is the source of truth for implementation. Jira artifacts are projections of specs, never the other way around. An idea that skips the spec and lands directly in Jira has recreated the vague-ticket anti-pattern the whole system exists to kill.

**Human gate: approval of the parcel set + tree before anything is registered.**

### Stage B — Registration
1. On approval, the agent creates the Epic/Story/Task tree in Jira via the **local Jira MCP server**.
2. Bidirectional linking per SPEC-CONVENTION §5: ticket key in spec frontmatter; SHA permalink to the spec in the ticket. Enforced, not suggested.
3. **Assignment via Smart Triage** — see §4.

### Stage C — Dispatch & Build
1. Each SWE's agent **subscribes to Jira queries** scoped to its human's assignment.
2. The agent **proposes** the next-best candidate (priority, dependency order, capacity) — it does not grab.
3. The agent pre-drafts its **Step 0 restatement**: scope, enumerated surfaces, out-of-scope acknowledgment.
4. **Human gate: one-tap dispatch approval.** Step 0 confirmation is preserved exactly as validated in production.
5. **Model routing policy** (policy-as-code, §5) selects model(s) and agent count for the parcel's task class, data classification, and cost ceiling.
6. **Kaseya Kompress is mandatory** on all pipeline context. Exception baked into policy: system prompts are never compressed (prompt-cache prefix integrity).
7. Agent(s) build on an isolated branch/worktree. One parcel, one branch, no shared state.
8. **Builder-side skill injection (§5a):** the skill matrix loads capabilities matched to the parcel's surfaces — every parcel gets test-coverage (Kaseya-standard tests); `ui/*` parcels additionally get **kds-figma** (`plugins/kds-figma`), resolving Figma node refs from the spec's Context & References into KDS tokens, variable definitions, and screenshots. Builders work with the org's real standards and design system in context, not approximations.

### Stage D — Verification
Verification is layered, and no agent — including the orchestrator — grades its own work:

1. **Deterministic harness first:** acceptance criteria executed as checks (tests, lint, schema validation, spec-conformance), plus verifier-side checks from the skill matrix (§5a) — coverage thresholds on every parcel, **kds-sweep** for `ui/*`, **tenant-isolation** for `tenancy/*` — all blocking. pcc-style: canonical receipts (RFC 8785) for every claim.
2. **Adversarial review second:** a frontier-model reviewer, *distinct from the coordinating agent*, armed with the **code-review skill** — challenging the change against Kaseya's documented dev standards, with standard citations in its findings.
3. The **Coordinator** (frontier model) routes rework if either layer fails — mechanical build/test failures go to a small model running **build-fix-loop** first; frontier re-coordination is the escalation, not the default. The Coordinator consumes verification results; it never produces them.
4. **Human review is required before the ticket is updated.** On approval, the agent updates the Jira ticket via MCP.

### Stage E — Integration
1. Agent commits, pushes, and opens the PR. Branch protection: agents cannot merge.
2. CI triggers **DocSpine** to validate and update documentation claims against the changed code.
3. CI runs **risk-driven audit triggers** (§6): declared risk from spec frontmatter + derived risk from the diff decide whether the audit-suite runs, and at what tier.
4. GitHub gates: required security scans, required reviews, co-pilot assisted human review.

### Stage F — Closure
1. **Human gate: the merge.** A human owns every merge. Deliberate, permanent.
2. On merge: ticket transitions to closed via MCP; spec moves `active/ → done/`; the receipt chain is sealed.
3. Correlation IDs (ADR-069 taxonomy: WorkloadId → SessionId → WorkflowId/RunId → AgentId) stamp every stage. The chain idea → spec → ticket → dispatch → PR → merge is walkable end to end.
4. **Lesson distillation.** Lessons earned in the cycle are appended to `docs/transcripts/defects_lessons.md` with a **disposition line** (per the ledger's convention): the distilled rule is routed into the narrowest artifact already in the reading path of the agent it governs — kickstarter constraint, SPEC-CONVENTION, coordinator pattern/carryover, or a mechanical hook/CI check (best of all — a checked rule no longer needs remembering) — or marked narrative-only. No agent reads the ledger as operating instructions; a lesson without a disposition is not closed. **When a lesson's rule invalidates an existing pattern, the disposition includes a one-time enumeration sweep of the existing corpus — instances retired immediately or recorded as a single named debt with the full inventory (lesson #36: installing a rule for future parcels while leaving existing instances live means the class keeps firing).**

---

## 3. Locked Decisions (with reasoning)

| # | Decision | Reasoning |
|---|---|---|
| D1 | Specs are the unit of dispatch; Jira tickets are projections | Prevents automating the vague-ticket anti-pattern; preserves Git as implementation truth |
| D2 | Humans hold exactly two gates: dispatch approval and merge | Step 0 + human merge are the two validated drift/quality controls; everything between is automatable |
| D3 | Agents propose work; they do not auto-grab | Auto-grab kills Step 0. Full autonomy is a maturity level earned with verification data, not a starting posture |
| D4 | Coordinator ≠ Verifier | No self-graded work at any level. Harness and Adversarial Review are separate plugins by design |
| D5 | Audit triggers are declared + derived, never "somehow" | `risk:`/`surfaces:` in spec frontmatter + diff-based CI rules = deterministic, auditable |
| D6 | Model routing is policy-as-code | Versioned routing table (task class × data classification → allowlist + cost ceiling); privacy gates eligibility before cost optimizes |
| D7 | Kompress mandatory; system prompts exempt | Token burn control without breaking prompt-cache prefix hits |
| D8 | Every stage emits an RFC 8785 canonical receipt | pcc machinery exists; the Trust Wall demands a walkable chain |
| D9 | The Line is built via PDD | Dogfooding is the proof; every wave below is a parcel set |

---

## 4. Smart Triage as the Assignment Engine

**Decision: yes — as a new tenant class, on a separate deployment.**

Mapping of existing agents to the engineering domain:

| Smart Triage agent | Engineering role |
|---|---|
| Impact Assessment | Parcel priority/urgency scoring from spec + Epic context |
| Skill Extraction | Tech-surface extraction from parcel (`surfaces:` + stack) |
| Skill Assessment | SWE proficiency scoring against extracted surface |
| Smart Assignment | Parcel → SWE match |
| Capacity Planner | Sprint-load-aware throttling (deterministic, unchanged) |

**Conditions:**
1. **Separate deployment/environment from the MSP pilot.** Internal dogfooding must not share blast radius with production customer tenants.
2. **Engineering skill taxonomy** is net-new work — the MSP taxonomy does not transfer. Budgeted as its own parcel (W5-P2).
3. **Feedback capture is the hidden payoff:** engineers correct bad assignments immediately and loudly. That correction stream is the highest-quality assignment-feedback corpus the product will ever get — instrument it from day one and feed it back into Skill Assessment.

---

## 5. Model Routing Policy (v0 shape)

A versioned artifact in the repo (`routing-policy.yaml`), evaluated at dispatch:

```yaml
# illustrative
classes:
  boilerplate:        { allowlist: [small, medium], ceiling_usd: 0.50 }
  standard-feature:   { allowlist: [medium, large], ceiling_usd: 5.00 }
  architecture/risk:  { allowlist: [frontier],      ceiling_usd: 25.00 }
data_classification:
  public:       no additional restriction
  internal:     approved-endpoint models only
  restricted:   private/on-platform inference only
roles:
  coordinator:  frontier            # always
  verifier:     frontier            # always, distinct instance from coordinator
  builder:      per task class
```

Rules: data classification gates eligibility **before** cost optimization runs; ceilings are per-parcel and enforced by the Context Ledger; every routing decision lands in the receipt.

**Concrete v0 instantiation (as of July 2026 — revisit quarterly):**

| Role / class | Model | Reasoning |
|---|---|---|
| Builder (default) | Claude Sonnet 5 | Most agentic Sonnet, near-Opus coding at ~40% of the cost; PDD's pinned scopes are exactly the conditions where mid-tier performs like frontier. Budget at standard $3/$15 — intro $2/$10 pricing ends Aug 31, 2026 |
| Boilerplate / build-fix-loop | Claude Haiku 4.5 | $1/$5, fast; mechanical fixes don't deserve Sonnet tokens |
| Coordinator | Claude Opus 4.8 | Frontier role by D4; must outclass the builders it coordinates |
| Adversarial Reviewer | Claude Opus 4.8 | A verifier weaker than its builders is theater |
| Security-audit parcels & security review | Claude Opus 4.8 — **hard override, never Sonnet 5** | Sonnet 5 has deliberately reduced cybersecurity capability; task class overrides default routing |

---

## 5a. Skill Injection Policy (the execution-plane library)

The Line is the conveyor; the skills library is the rack of tools hanging above each station (`kaseya-one-productivity-tools`, deployed at `~\.claude\skills\`). Skills are wired in through a single mechanism — a versioned **skill injection matrix**, policy-as-code alongside the routing policy — rather than hardcoding each skill into a pipeline stage:

```yaml
# illustrative — skill-injection.yaml
builder:
  '*':            [test-coverage]          # Kaseya-standard tests on every parcel
  'ui/*':         [kds-figma]              # design context + KDS tokens
verifier_harness:
  '*':            [test-coverage.check]    # coverage threshold, blocking
  'ui/*':         [kds-sweep]              # design conformance, blocking
  'tenancy/*':    [tenant-isolation]       # isolation checks, blocking
adversarial_reviewer:
  '*':            [code-review]            # reviews against KASEYA dev standards, not LLM taste
coordinator:
  rework_first:   [build-fix-loop]         # mechanical build failures, cheap model
integration:
  jira:           [jira-workflow]          # Stage B/E ticket ops build on this, not from scratch
```

Rules:
- Injection is driven mechanically by the parcel's `surfaces:` and task class — no per-dispatch human decision.
- Skills split into **builder-side** (context/capability injected at dispatch) and **verifier-side** (blocking checks in the harness). The same domain often ships both: test-coverage *adds* standards-compliant tests in the builder and *enforces* thresholds in the harness.
- **code-review arms the Adversarial Reviewer** with Kaseya's actual dev standards — the reviewer challenges against documented organizational rules, not generic model taste. Review findings carry standard citations in the receipt.
- **tenant-isolation is a blocking harness check** for any parcel whose surfaces touch tenancy — and doubles as a derived audit trigger (§6). On a multi-tenant platform this is the check that pays for the whole harness.
- **build-fix-loop is the Coordinator's first rework move:** mechanical build/test failures route to a small model running build-fix-loop before any frontier re-coordination. Cheap fixes stay cheap; escalation is earned by repeated failure, not default.
- The matrix is versioned in the repo; every injection decision lands in the dispatch receipt. **New skills join the Line by editing the matrix, not the pipeline.**

---

## 6. Risk-Driven Audit Triggers (killing the "somehow")

Two inputs, one deterministic decision:

**Declared (from spec frontmatter, set at shaping, human-approved):**
```yaml
risk: low | standard | elevated | critical
surfaces: [api/auth, infra/pulumi, ...]
```

**Derived (from the diff, evaluated in CI):**
- Paths matching auth/authz, secrets handling, tenancy, session, crypto → security audit
- IaC (Pulumi/Terraform), Dockerfiles, CI workflow files → infra + supply-chain audit
- Lockfile/dependency changes → supply-chain scan
- New external endpoints or data egress → security + compliance audit

Decision = max(declared, derived). `elevated`+ runs the audit-suite plugins as blocking CI jobs; findings above threshold block the PR. Declared-vs-derived mismatches (spec said `low`, diff says auth paths) are flagged as spec-drift and block until reconciled.

---

## 7. Open Questions (decide before W1 exit)

1. **Naming.** "The Line" is a working name. Foreman runs the Line — keep the factory metaphor or rename.
2. **Dispatch approval UX.** CLI-first (fastest) vs. QCC surface (most visible to leadership). Recommend CLI in W2, QCC panel in a later wave.
3. **Multi-agent builds.** When routing selects N>1 builders for one parcel: sub-parcel split (preferred — preserves one-agent-one-scope) vs. shared-parcel coordination (violates D2's spirit). Recommend: N>1 forces a shaping-time split.
4. ~~**DocSpine IP posture.**~~ **RESOLVED:** DocSpine currently lives in Clint's personal Kaseya account and transfers to the KaseyaOne org the **evening before the demo** (held back until then to control the introduction; off-hours timing minimizes pre-demo visibility and leaves a full night of slack for CI/permission fixes). W4-P2 is unblocked as of transfer. See transfer checklist in §7a.
5. **Escalation path.** What happens when verification fails ×N — rework loop cap, human pull-in threshold.
6. **Jira MCP hosting.** Local MCP server ownership, auth model (scoped service principal per ADR workload identity), and blast-radius controls for Jira write scopes.

### 7a. DocSpine Transfer Checklist (evening before demo)

Repo transfers change more than the owner — run this list the evening before, then re-verify green in the morning:

1. **Transfer** personal account → `KaseyaOne` org; verify the new canonical URL resolves.
2. **Redirects:** GitHub redirects the old URL, but redirects break silently on a future rename — update any hardcoded remotes/links immediately, don't lean on the redirect.
3. **Local remote:** `git remote set-url origin` on `C:\Repos\docspine`.
4. **Access:** set team/collaborator permissions under org policy (org default may be more restrictive than personal); confirm branch protection survives or re-apply.
5. **CI/secrets:** personal-account Actions secrets and integrations do not transfer — re-provision under org context; confirm any workflows go green.
6. **Morning check:** one glance before the call — CI green, URL resolves, permissions correct. Thirty seconds of verification, zero surprises with an audience.

---

## 8. Build Plan — Waves & Parcels

Each wave ships independently valuable capability and has hard exit criteria. All work under PDD; specs in `plugins/foreman-line/docs/specs/`.

### W0 — Contracts (foundation, no runtime)
- **W0-P1** Pipeline stage contracts: typed interfaces between stages A–F; correlation ID propagation (ADR-069)
- **W0-P2** Parcel schema v0.2: add `risk:`, `surfaces:`, `routing_class:` to SPEC-CONVENTION frontmatter
- **W0-P3** Routing policy schema + validator
- **W0-P4** Receipt chain spec: per-stage receipt shape (RFC 8785), chain linkage, storage
- **W0-P5** Skill injection matrix schema + validator (§5a)
- **Exit:** all contracts reviewed and merged; downstream waves build against frozen interfaces

### W1 — Intake & Registration
- **W1-P1** Shaping Agent: idea → interactive shaping → parcel spec drafts
- **W1-P2** Epic/Story projection generator (specs → tree proposal)
- **W1-P3** Human approval flow (CLI) for parcel set + tree
- **W1-P4** Jira MCP integration: tree creation, bidirectional SHA-permalink linking, default-deny write authorization gate — built on the existing **jira-integration** skill, not from scratch
- **Exit:** one real idea shaped, approved, and registered end-to-end with linked specs and tickets

### W2 — Dispatch
- **W2-P1** Jira query subscription + next-candidate ranking
- **W2-P2** Step 0 pre-draft + one-tap human dispatch approval
- **W2-P3** Model routing v0: static policy table evaluation at dispatch
- **W2-P4** Kompress integration in the dispatch context path (system-prompt exemption enforced)
- **W2-P5** Builder-side skill injection engine: matrix evaluation at dispatch, surfaces-matched loading (test-coverage universal; kds-figma for `ui/*`), injection receipts
- **Exit:** a registered parcel dispatched to a builder with routed model, compressed context, injected skills, and a dispatch receipt

### W3 — Verification
- **W3-P1** Verification Harness: acceptance criteria as executable checks + verifier-side matrix checks (coverage thresholds, kds-sweep for `ui/*`, tenant-isolation for `tenancy/*`), receipts per claim
- **W3-P2** Adversarial Reviewer: frontier instance, isolated from Coordinator, armed with code-review skill (Kaseya dev standards, cited findings)
- **W3-P3** Coordinator: build-fix-loop as first-line rework on a small model, frontier re-coordination as escalation, rework cap (per open question 5)
- **W3-P4** Human review gate + ticket update via MCP
- **Exit:** a built parcel passes harness + adversarial review, is human-approved, ticket updated — with zero self-graded claims in the chain

### W4 — CI Integration
- **W4-P1** Commit/push/PR automation with branch protection (agents cannot merge)
- **W4-P2** DocSpine CI hook: doc-claims validation against the diff *(blocked on open question 4)*
- **W4-P3** Risk-driven audit triggers: declared + derived evaluation, blocking jobs, drift flagging
- **W4-P4** GitHub gate assembly: required scans, required human review, merge → closure automation
- **Exit:** one parcel travels Stage E–F fully: PR, docs validated, audits triggered correctly on an elevated-risk diff, human merge, ticket closed, receipt chain sealed

### W5 — Smart Triage Assignment
- **W5-P1** Engineering tenant class + separate deployment
- **W5-P2** Engineering skill taxonomy + Skill Extraction/Assessment prompt adaptation
- **W5-P3** Assignment loop integration into Stage B
- **W5-P4** Feedback capture instrumentation (assignment corrections → assessment signal)
- **Exit:** assignments flow through Smart Triage for one team-tenant; correction feedback lands in telemetry

### Sequencing notes
- W0 → W1 → W2 → W3 → W4 is a strict chain (each proves the next stage of the Line on real work).
- W5 is parallelizable after W1 (registration exists); manual assignment is the interim.
- Every wave's demo artifact: **the receipt chain for one real parcel**, walked live.

---

## 9. Risks — Honest Ledger

| Risk | Mitigation |
|---|---|
| This is a platform wearing a plugin costume — ocean-boiling temptation | Strict wave gates; each wave ships standalone value; no wave starts before the prior exits |
| Jira write + git push + PR creation = large agent blast radius | Default-deny authorization gate (approval-gate executor pattern exists), scoped service principals, branch protection, receipts on every mutation |
| Smart Triage dogfooding destabilizes the MSP pilot | Separate deployment, separate tenant class, no shared state — condition, not preference |
| Verification loop cost (frontier verifier on every parcel) | Routing policy tiers verification depth by `risk:`; Context Ledger enforces ceilings |
| DocSpine transfer-day surprises (CI secrets, permissions, remotes) | Transfer checklist (§7a) executed with time buffer before the demo, not minutes |
| Autonomy creep — pressure to remove the two human gates as volume grows | The gates are architectural, not procedural: agents lack merge permissions and lack dispatch authority by construction |

---

*Built parcel by parcel. Proven receipt by receipt. Enforced by tooling, not memory.*
