---
name: get-app-specs
description: Extract a canonical application specification from a codebase — features, business rules, requirements, domain canon, and dependencies — each evidence-backed, confidence-labeled, and liveness-checked (does this code actually get triggered?), with open questions surfaced. Use standalone to inventory what an app actually does (audit, onboarding, pre-rewrite archaeology), or as Phase 0 of the modernizer skill to produce the APP_SPECIFICATION.md baseline that behavioral contracts map to.
metadata:
  author: The Brotherhood
  keywords:
    - app specification
    - feature inventory
    - business rules
    - requirements extraction
    - reverse engineering
    - liveness reconciliation
    - dead code detection
    - modernization baseline
---

# Objective

Derive a canonical, evidence-backed specification of what an application does — independent of how it is implemented. Output a single authoritative `APP_SPECIFICATION.md` that inventories features, business rules, technical requirements, domain canon, and dependencies, with a confidence label and source evidence on every claim, a liveness verdict on every capability, and every gap surfaced as an explicit open question.

This skill describes behavior. It does not redesign, refactor, or rewrite. When used as modernizer Phase 0, its output is the baseline that all downstream contracts trace back to.

## Non-Negotiable Rules

1. Attach source evidence (`path:line`) to every behavioral claim. No evidence, no claim.
2. Describe observed behavior, not implementation mechanics or aspirational intent.
3. Confidence-label every item. Never launder a guess as a fact.
4. Escalate ambiguity as an open question instead of resolving it by assumption.
5. Do not infer behavior from a single weak signal; corroborate across evidence classes where possible.
6. Mark anti-patterns and suspected bugs as findings — do not silently "correct" them in the spec.
7. Existence is not liveness. Never mark functionality dead on the absence of a static caller alone; grade liveness by evidence, and flag the uncertain instead of dropping it.

## Output Artifact

- `APP_SPECIFICATION.md` — the canonical baseline (see `templates/APP_SPECIFICATION.template.md`).

Optional supporting artifacts when scope warrants:
- `evidence_index.md` — flat list of every evidence pointer cited.
- `open_questions.md` — extracted OQ list for stakeholder routing.

## Identifier Schemes

Every item gets a stable ID. These are the IDs the modernizer contract schema links against (`linked_requirements`).

| Prefix | Meaning | Example |
|-|-|-|
| `F-###` | Feature — a capability the system exposes (user-facing OR headless) | `F-014 Reserve inventory for 15 minutes` |
| `BR-###` | Business rule — a constraint/policy governing behavior | `BR-007 Orders over $10k require manager approval` |
| `R-###` | Requirement — non-functional/technical constraint | `R-003 p95 latency < 200ms` |
| `CANON-###` | Domain canon — entity, term, or invariant definition | `CANON-002 A Pack is immutable once sealed` |
| `DEP-###` | Dependency — external or internal system relied upon | `DEP-005 Stripe API v2023-10 for charges` |
| `OQ-###` | Open question — unresolved ambiguity | `OQ-009 Is the 8-char password cap intentional?` |

Headless/automated processes are captured as `F-*` too — a scheduled job is a capability, just not user-facing. Each `F-*` carries a **trigger** (`user | scheduled | event | manual | external`) and a **liveness** label (below). IDs are stable and never reused; retire rather than recycle.

### Namespacing under parallel discovery

Under the modernizer's choreography (multiple discovery nodes running concurrently over different scopes), IDs are **namespaced by scope** so they are collision-free by construction — no central allocator, no cross-node coordination. A node prepends a dot-separated, UPPERCASE scope prefix (derived from its choreography node `path`) to every ID it emits:

- `BACKEND.BILLING.F-003` · `BACKEND.BILLING.BR-007` · `FRONTEND.CHECKOUT.CANON-002`

Rules:
- The numeric suffix is unique **within its namespace** — each node numbers its own `F-001`, `F-002`, … from scratch; the prefix guarantees global uniqueness. That is the whole point: provenance is encoded and no two nodes can collide without coordinating.
- Namespace segments are UPPERCASE alphanumeric, start with a letter, dot-separated. Contract-linked IDs (`F`/`BR`/`R`/`CANON`) MUST match `^([A-Z][A-Z0-9]*\.)*(F|BR|R|CANON)-[0-9]+$` — the exact pattern the modernizer's `contract.schema.json` / `manifest.schema.json` accept. `DEP`/`OQ` follow the same prefix convention.
- **Bare IDs (`F-003`) are valid for a single-scope / standalone run** (no parallel decomposition) — the bare form is just the empty namespace. Both forms are accepted downstream.
- Namespace derives from stable scope, not run order. Retire-don't-recycle still holds within a namespace.

## Confidence Labels

Assign one to every F/BR/R/CANON item.

- **High** — corroborated by direct, unambiguous evidence (e.g. explicit code path + passing test, or code + schema + doc agreement).
- **Medium** — supported by evidence but with interpretation, or a single solid source with no contradiction.
- **Low** — inferred, sparse, conflicting, or evidence-by-absence. Every Low item MUST have a paired `OQ-###`.

Blocking rule: a Low-confidence item that gates downstream work must be either resolved (promoted with new evidence) or explicitly accepted by an owner before the baseline is considered complete. Do not let Low items pass silently.

## Liveness Reconciliation

Captured code is not captured functionality. A behavior that exists in source but is never triggered is a fossil, and rebuilding it greenfield is the same footgun as recreating legacy architecture. Reconcile liveness before an item enters the baseline as required functionality.

The cardinal rule: **existence is not liveness, and "no caller in the repo" is not proof of dead.** The highest-value backend behavior is often invoked in ways static analysis cannot see:
- DI / reflection resolution (resolved by interface; no literal call site)
- attribute / convention routing (the framework is the caller)
- message- or event-driven handlers (a broker subscription is the trigger)
- externally called endpoints (another service, partner, or webhook — caller not in this repo at all)
- externally scheduled work (k8s CronJob, Hangfire/Quartz registration, cloud scheduler — no code-level trigger)
- feature-flagged paths (resolved at runtime)

Defaulting "no caller = dead" silently deletes live functionality — the same catastrophic, invisible failure class as missing a server-side rule.

### Liveness evidence (strongest to weakest)

- **Runtime** (`trace`/`log` kind) — telemetry, APM, access/request logs showing actual execution and frequency. Definitive for *live*; absence is NOT definitive for *dead* (see cadence).
- **Wiring / schedule** (`config` kind) — route registration, subscription binding, cron/schedule config, DI registration. Proves it *can* fire.
- **Static caller** (`code` kind) — an in-repo call site. Weak; its absence means nothing.

### Cadence-aware rule

Telemetry-absence means "cold" only relative to the item's own period. A daily job silent for 30 days is suspect; a yearly job silent for 30 days is simply between runs. For scheduled/periodic work the **declared schedule is the primary liveness signal** and runtime is corroboration — a `0 0 1 1 *` cron or a yearly recurring registration is positive intent-to-fire that no short telemetry window may override. Reconcile every "cold" verdict against the declared cadence before flagging anything dead.

### Liveness labels

Assign one to every `F-*`:
- **Live** — runtime evidence of execution, OR wired with a cadence consistent with the observed absence.
- **Cold** — wired/scheduled but no runtime evidence within a window that should have caught it. A flag, not a verdict.
- **Dead** — positive evidence of death: no wiring, no runtime, superseded or unreachable.
- **Indeterminate** — liveness cannot be established from available evidence.

### Default bias and omission

Error asymmetry sets the default: dropping live code (false-dead) is catastrophic and silent; keeping dead code (false-live) is wasteful but visible and cheap. Therefore:
- When liveness is uncertain (**Cold** or **Indeterminate**), **capture-and-flag — never silently drop.** Route it to the human gate.
- **Omit** an item only on positive evidence of death (**Dead**) or an explicit human decision.
- Every omission records a rationale and its liveness evidence; downstream these become candidate `TOMBSTONES.md` entries. Defensible drops, not disappearances.

## Phase Workflow

### Phase 0 — Scope and Intake

Action:
- Confirm scope boundaries: what is in and out. Honor any `exclude_patterns` / module exclusions.
- Identify the available evidence classes (code, tests, traces, logs, schemas, config, docs).
- Identify liveness evidence sources: runtime telemetry (Dynatrace, Application Insights, APM), access/request logs, scheduler config (cron / Hangfire / Quartz / cloud scheduler), and feature-flag state. Ask the operator: *which telemetry/log sources are available, and over what retention window?* Record the window — it bounds every "cold" judgment that follows.

Exit criteria:
- Scope is written down.
- The node's ID namespace prefix is fixed from its scope (or `none` for a single-scope run); every ID this run emits carries it.
- Available liveness evidence sources and their window are recorded (or their absence noted).
- Inaccessible-but-in-scope areas are logged as open questions, not skipped silently.

### Phase I — Evidence Inventory

Action:
- Enumerate source evidence: entry points, public APIs/handlers, domain models, persistence schemas, config/feature flags, scheduler/trigger wiring, tests, runtime traces/logs (with their window), and documentation.
- Build a working evidence index keyed by `path:line`.

Exit criteria:
- Each major surface area has at least one cataloged evidence pointer.
- Gaps in evidence coverage are noted.

### Phase II — Derivation

Action:
- Derive `F-*` from exposed capabilities and exercised paths (user-facing AND headless/scheduled processes).
- Derive `BR-*` from validation, branching, guards, and policy logic.
- Derive `R-*` from configured limits, timeouts, SLAs, security controls, performance-shaping code.
- Derive `CANON-*` from domain entities, vocabulary, and invariants the code enforces.
- Derive `DEP-*` from external calls, SDKs, brokers, datastores, and internal service boundaries.
- For every `F-*`, grade liveness per **Liveness Reconciliation**: record its trigger, liveness label, and — when scheduled — its cadence. Reconcile telemetry-absence against declared cadence before assigning Cold or Dead.
- Cite evidence on each. Where behavior depends on config, record the config source and default.

Exit criteria:
- Every derived item carries ≥1 evidence pointer.
- Every `F-*` carries a trigger and a liveness label.
- Cross-cutting behaviors (auth, error handling, retries, idempotency) are explicitly captured, not assumed.

### Phase III — Confidence, Liveness Gaps, and Human Elicitation

Action:
- Assign a confidence label to every F/BR/R/CANON item.
- Convert every ambiguity, contradiction, or evidence-by-absence into an `OQ-*`.
- Flag anti-patterns / suspected bugs as findings linked to their evidence (these become candidate tombstones downstream).
- Pose targeted human elicitation for what neither static analysis nor a short telemetry window can reveal. At minimum ask: *"Are there month-end, quarter-end, year-end, audit, tax, renewal, or seasonal operations that would NOT appear as a scheduled job in code or in recent telemetry?"* Capture any as `F-*` with their cadence.
- Resolve every **Cold** / **Indeterminate** item to keep or omit. Record an omission rationale for anything dropped. Never silently drop.

Exit criteria:
- No unlabeled items; every `F-*` has a liveness label.
- Every Low-confidence item has a paired open question.
- No item is marked **Dead** on static absence alone.
- Every omission has a recorded rationale and its liveness evidence.

### Phase IV — Assemble and Self-Check

Action:
- Assemble `APP_SPECIFICATION.md` from the template.
- Self-check: every claim has evidence; every Low item has an OQ; every `F-*` has a trigger + liveness label; nothing is Dead on static absence alone; every omission has a rationale; scope exclusions are recorded; ID schemes are consistent, namespaced to scope (or bare for a single-scope run), unique, and match the baseline ID pattern.

Exit criteria:
- `APP_SPECIFICATION.md` exists and passes the self-check.
- A short coverage summary states what was inventoried and what remains uncertain — including liveness posture (counts of Cold / Indeterminate items awaiting human resolution).

## Evidence Pointer Convention

- Code / test: `path:line` or `path:start-end` (e.g. `src/orders/service.py:142-160`).
- Trace / log / schema / config / doc: artifact path plus locator (e.g. `traces/checkout-2024-11.har#tx-12`).
- Liveness evidence reuses these kinds: runtime execution is `trace`/`log` (e.g. `dynatrace: POST /v1/packs — 0 hits, last 30d`); schedule/flag wiring is `config` (e.g. `src/jobs/schedule.yaml:12 — 0 0 1 1 *`).
- Tag each pointer with its kind: `code | test | trace | log | schema | doc | config`.
- Never cite an artifact you did not actually open.

## Handoff to the Modernizer

When this runs as modernizer Phase 0:
- `APP_SPECIFICATION.md` becomes the canonical inventory consumed by Phase I (Discovery and Contract Drafting).
- Phase I contracts set `linked_requirements` to the `F-/BR-/R-/CANON-` IDs defined here (namespaced, e.g. `BACKEND.BILLING.F-003`, or bare for a single-scope run); the contract schema enforces that every contract links ≥1 baseline ID matching the `linked_requirements` pattern.
- Unresolved `OQ-*` items, plus all **Cold** / **Indeterminate** liveness items, route to the Phase II human validation gate.
- Flagged anti-patterns/bugs and recorded omissions become candidate `TOMBSTONES.md` entries.

## Failure Conditions

Stop and escalate if:
- Repository/evidence access is insufficient to inventory in-scope areas.
- Core behavior cannot be corroborated by any evidence class (record as OQ, do not invent).
- Contradictions between evidence sources cannot be reconciled.
- Liveness cannot be assessed for a high-stakes capability (no runtime evidence AND no schedule/wiring) — flag for human review; do not silently drop.

## Non-Goals

- Do not propose, design, or implement a target solution.
- Do not refactor, rename, or "fix" behavior in the spec.
- Do not assert behavior without source evidence.
- Do not declare functionality dead from the absence of a static caller alone.
- Do not collapse distinct behaviors to make the inventory look tidier than reality.

## Final Instruction

Optimize for truth and traceability over completeness theater. A smaller spec where every line is backed by evidence beats a sprawling one built on inference. If you cannot prove it, label it Low and raise an open question. If you cannot prove it is dead, do not bury it — flag it.
