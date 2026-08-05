# Spec-Driven Development Convention

**Version:** 0.1 (Draft for review)
**Author:** Clinton Morgan — Principal Agentic AI Platform Architect, KaseyaOne
**Status:** Proposed
**Validated against:** QCC AI Assistant showcase (16/16 W1 parcels merged), Kaseya Forge modernization pipeline, DocSpine parcel plan

---

## 1. Purpose

This convention defines how AI-consumable implementation specs are authored, stored, versioned, and consumed by agents across KaseyaOne repositories. It formalizes a pattern already validated in production via Parcel-Driven Development (PDD): **specs, prompts, and context are first-class, versioned engineering artifacts** — not chat history.

Jira remains the system of record for **delivery tracking** (what, why, when, who). Git becomes the system of record for **implementation context** (how, in full detail). This document defines the contract between the two.

**This convention does not replace the Atlassian MCP request.** Repo-local specs solve implementation context; Jira MCP solves live delivery state (blockers, priorities, PM comments). They are complementary. The MCP request should proceed in parallel.

---

## 2. Folder Structure

Specs live in `docs/specs/` — **not** a dotted folder.

> **Rationale:** Specs must receive PR review like code. Dotted folders (`.spec/`) hide from humans, doc tooling, and casual review. If agents are going to build from these files, humans need to see them by default.

```
docs/
  specs/
    INDEX.md                  # Manifest: ticket → spec mapping, status at a glance
    active/                   # Specs agents may load as context
      KONE-1234-verdict-system.md
      KONE-1301-action-gate.md
    done/                     # Shipped. Historical record only. Agents MUST NOT auto-load.
      KONE-1102-flow-diagram.md
    core/                     # Small, stable, always-loadable context
      architecture-overview.md
      conventions.md
      glossary.md
```

> **Monorepo rule:** in a repository hosting multiple projects, each project root carries its own `docs/specs/` lifecycle (`INDEX.md`, `active/`, `done/`, optional `core/`), plus its own `kickstarters/`, `transcripts/`, and `goals/` as needed. The repo-root `docs/` holds only repo-wide material: this convention, cross-project reference docs, demos/diagrams, shared lessons, and a root `docs/specs/` lifecycle reserved for parcels whose surfaces span multiple projects. A project's spec lives with the project whose code it governs.

**Rules:**

- One spec file per unit of work (one ticket, or one parcel of a larger ticket).
- Filename format: `<TICKET-KEY>-<short-slug>.md`. The ticket key in the filename is mandatory.
- `core/` is capped at **3–5 short documents**. It is the stable substrate every agent session may load. If it grows past that, it's wrong — split repo docs into normal `docs/` and keep `core/` lean.
- `INDEX.md` is regenerated (or hand-updated) on every spec state change. It is the single file an agent reads to discover what context exists without loading everything.

---

## 3. Spec Lifecycle

A spec is a **point-in-time work order**, not a living document. Stale specs loaded as context are worse than no specs — agents will confidently build against last quarter's architecture.

| State | Location | Agent behavior |
|---|---|---|
| `draft` | `active/` | Not dispatchable. Human still authoring. |
| `active` | `active/` | Loadable and dispatchable. This is the contract for the work. |
| `done` | `done/` | Never auto-loaded. Historical/archaeological reference only. |
| `superseded` | `done/` | As `done`, plus frontmatter points to the replacing spec. |

**Lifecycle rules:**

1. State lives in frontmatter (`status:`) **and** folder location. They must agree; the folder is authoritative for agent tooling.
2. When work merges, the spec moves to `done/` **in the same PR** or an immediate follow-up. This is a merge-checklist item, not an honor-system chore.
3. Material changes to an `active` spec require a comment on the linked Jira ticket (see §5).
4. Agents load only: (a) the spec for their assigned ticket, and (b) `core/`. Nothing else, ever, without explicit human instruction. "Load the specs folder" is not a thing.

---

## 4. Required Spec Schema

Every spec begins with YAML frontmatter. Missing required fields fail lint (see §7).

```yaml
---
ticket: KONE-1234                 # Required. Jira key.
title: Verdict system redesign    # Required.
status: active                    # Required: draft | active | done | superseded
owner: clinton.morgan             # Required. Human accountable for the spec.
created: 2026-07-10               # Required.
updated: 2026-07-10               # Required. Bump on any material edit.
supersedes: null                  # Optional. Ticket/spec this replaces.
superseded_by: null               # Required when status: superseded.
# --- schema v0.2 fields (frozen by W0-P2) ---
risk: standard                    # Required: low | standard | elevated | critical
surfaces: [docs/SPEC-CONVENTION.md]  # Required, non-empty array of path/glob strings
routing_class: standard-feature   # Required: boilerplate | standard-feature | architecture/risk | implementation/standard
permission_profile: null          # Optional until the permission-profile registry ships
---
```

### 4.6 Schema v0.2 Fields (added W0-P2)

Four fields extend the required schema beyond the original eight. All four are machine-validated by `plugins/foreman-line/spec-linter/`.

- **`risk:`** — **Required.** One of `low | standard | elevated | critical`. Declared risk level, set at shaping time, human-approved (not agent-inferred). Consumed by CI audit-trigger rules and model-routing tier selection. Values are per `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md` §6.
- **`surfaces:`** — **Required, non-empty array of strings.** Repo-relative paths or glob patterns describing the filesystem surfaces the parcel touches. Consumed by audit-trigger CI rules and skill-injection matrix evaluation. At least one entry is required — an empty array fails schema validation. See §4.7 for the canonical vocabulary of known prefixes and the advisory-warning behavior for entries outside it.
- **`routing_class:`** — **Required.** One of `boilerplate | standard-feature | architecture/risk | implementation/standard`. Task-class key used by routing-policy evaluation at dispatch. This enum is identical to the `classes` map keys in `plugins/foreman-line/routing-policy/routing-policy.yaml`; this convention is the authoritative definition, the routing-policy file is the corroborating instantiation.
- **`permission_profile:`** — **Optional until the permission-profile registry ships.** A name referencing a profile in a reviewed permission-profile registry (a separate, deferred parcel). Never inline permission rules directly in a spec — a self-describing document must not be its own security authority. Lint behavior: if present, the value must be a non-empty, non-whitespace-only string (rejected otherwise); if absent, the spec-linter emits a non-blocking advisory warning to stderr (exit code remains `0`). The linter CLI exposes a `--no-permission-profile-warning` flag to suppress this advisory. When the registry ships, it will add enum validation as a non-breaking additive change to this field's contract.
- **`data_classification:`** — **Optional.** A non-empty, non-whitespace-only string
  naming the sensitivity classification of the data the parcel's surfaces handle
  (observed corpus value: `internal`). Schematized by CLOSE-P2 per the W4-P5 ruling;
  no controlled vocabulary yet — when one is ratified, enum validation is added as a
  non-breaking additive change (same pattern as `permission_profile`).

### 4.7 `surfaces:` Canonical Vocabulary (added W0-P2)

`surfaces:` is a **semi-controlled vocabulary**. This subsection defines the initial known surface prefixes:

- `docs/`
- `plugins/`
- `skills/`
- `apps/`
- `config/`

A `surfaces:` entry that does not begin with one of these prefixes does **not** fail validation — it triggers a non-blocking advisory warning from the spec-linter (exit code remains `0`). This is deliberate: novel surfaces are not hard-blocked, but they are made visible.

**Extension mechanism:** new prefixes are added to this list via a PR that edits this subsection. That PR is the reviewed extension point — it prevents silent vocabulary sprawl (an agent inventing a new top-level surface without anyone seeing it) while never blocking a parcel on a vocabulary gap.

### 4.8 `Allowed Files` Mutation Authority

Every dispatchable spec must contain an `## Allowed Files` body section listing
each file the parcel may create, edit, move, or delete. Entries are exact
repo-relative paths; globs and directory-wide shorthand are prohibited.

`surfaces:` and `Allowed Files` serve different purposes:

- `surfaces:` is broad routing and audit metadata.
- `Allowed Files` is the parcel's mutation authority.

If implementation requires a path not listed in `Allowed Files`, work stops
until the coordinator ratifies a spec amendment. An agent must not expand its
own authority because a related edit appears useful.

Required body sections, in order:

### 4.1 Intent
What outcome this work produces and why it matters. 2–5 sentences. If you can't state the intent briefly, the work isn't understood well enough to dispatch.

### 4.2 Constraints
Hard boundaries: technology choices already made, patterns that must be followed, contracts that must not break, performance/security requirements. Reference `core/` docs rather than restating them.

### 4.3 Acceptance Criteria
Verifiable, checkable statements. Prefer criteria a validator or test can confirm over criteria requiring human vibes. Agents claim completion **against these**, and no agent verifies its own claim.

### 4.4 Out of Scope
**Mandatory, non-empty.** Explicitly list adjacent work the agent must NOT touch. This is the single most effective scope-drift control we have found in practice. "None" is not an acceptable entry — every unit of work has a boundary; state it.

### 4.5 Context & References
Links to relevant `core/` docs, related specs, PRs, ADRs. Links only — do not paste large document bodies into the spec (see §6, context budget).

Optional sections as needed: **Assumptions**, **Open Questions**, **Verification Plan**.

When a **Verification Plan** is present, it must include **mandated reviewer focus questions** — the specific places the adversarial review should look hardest, stated as questions (e.g. "is the envelope genuinely general?", "does the prose exclude the naive reading?"). Focus questions get dedicated field-by-field assessments instead of generic linting; this is the single highest-leverage line a shaper can write (lessons #4, #12).

---

## 5. The Spec ↔ Jira Contract

Two systems of record will drift unless the contract is explicit. This is the contract:

| Concern | System of record |
|---|---|
| What & why (delivery level), priority, status, assignee, dates | **Jira** |
| How (implementation detail), constraints, acceptance criteria, agent context | **Git spec** |

**Linking rules (bidirectional, mandatory):**

1. Every spec carries the Jira key in frontmatter (`ticket:`) and filename.
2. Every linked Jira ticket carries a link to the spec **path at a specific commit SHA** (permalink), not a branch-relative link. Branch links rot; SHA links are receipts.
3. When a spec's `updated:` date bumps for a material change, the ticket gets a comment: *"Spec updated: <permalink> — <one-line summary>."*
4. Conflicts resolve as follows: Jira wins on delivery state (priority, schedule, assignment); the spec wins on implementation detail. If they disagree on scope, work **stops** until a human reconciles them. Agents do not adjudicate scope conflicts.

---

## 6. Context Budget Discipline

Specs exist to give agents precise context — not to give them *all* context.

- An agent session loads: **its assigned spec + `core/` + `INDEX.md`**. Target total: comfortably under ~15k tokens of spec context. If a single spec exceeds ~3–4k tokens, split the work.
- `INDEX.md` exists so agents can *discover* related context and request it deliberately, rather than bulk-loading a folder.
- Do not paste code, logs, or long document excerpts into specs. Link to file paths and line ranges; the agent can read the repo.

---

## 7. Security & Content Rules

Specs are repo content: cloned to every workstation, shipped to inference endpoints as context, and visible in every fork of history forever.

**Never in a spec:**

- Credentials, tokens, API keys, connection strings — including "example" values that are real.
- Customer names, customer data, PII of any kind.
- Internal hostnames, IPs, or environment-specific endpoints. Reference them by role ("the reporting DB", "the telemetry endpoint") with resolution living in proper secret/config management.

**Enforcement:** a lightweight lint (pre-commit or CI) validates frontmatter schema, required sections, non-empty Out of Scope, and runs secret/PII pattern scanning over `**/docs/specs/**`. A convention without a validator is a suggestion. The lint is small — pattern-scan plus schema check — and we have existing sweep tooling this bolts onto.

---

## 8. Dispatch Model (How Agents Consume Specs)

This convention pairs with the dispatch discipline already validated under PDD:

1. **One spec → one agent → one isolated branch/worktree.** No shared working state between concurrent agents.
2. **Scope pinning at dispatch (Step 0):** the agent's first act is to restate the spec's scope and its exact `Allowed Files` mutation authority. The human confirms before work begins. `surfaces:` informs routing but never grants permission to edit a path.
3. **Agents claim completion against Acceptance Criteria; verification is external.** No agent verifies its own claim — validation is a separate deterministic check or separate reviewer.
4. **Gate 3 is human-owned unless delegation is proven at merge time.** Delegation is valid only when the target repository's effective branch rules name the agent's distinct identity as a bypass actor. The coordinator must query that rule at merge time and stop before any merge call when it cannot be proven. Missing configuration, an empty bypass list, a human-authenticated agent session, or an unavailable ruleset query all fail closed to human ownership.

---

## 9. Known Trade-offs (Honest Ledger)

| Pro | Con |
|---|---|
| Versioned, reviewable, diffable context | Spec-writing discipline required up front — this is real work |
| Parallel agent dispatch without context collisions | Lifecycle hygiene must be enforced (lint + merge checklist) or specs rot |
| Repeatable outcomes; specs are reusable work orders | Jira linkage is manual until Atlassian MCP lands |
| Audit trail: spec + PR + ticket = full receipt for every change | Human merge ownership caps throughput; that's the current price of quality |
| Out-of-scope sections measurably reduce agent drift | Two systems of record demand the §5 contract be actually followed |

---

## 10. Adoption Path

1. **Pilot:** adopt in 1–2 repos already doing agent-driven work; migrate existing parcel docs into this structure (mostly mechanical).
2. **Tooling:** ship the lint (schema + secret scan) and an `INDEX.md` generator in the pilot window.
3. **Review:** 2-sprint retro — measure spec-authoring overhead vs. rework/drift reduction.
4. **Standardize:** org-wide rollout with the lint required in CI for `**/docs/specs/**`.

---

## 11. Coordinator-Ratified Amendment Pattern (added W0-P2)

Some rulings this convention needs cannot wait for a full spec-and-review cycle — a coordinator makes a scoping or definitional ruling mid-parcel, and that ruling must become part of the convention immediately, not live only as a verbal decision in chat history that evaporates once the session ends. This section formalizes how that happens.

**Shape.** A coordinator-ratified amendment has exactly three properties, all three mandatory:

1. **Exact replacement text supplied by the coordinator.** The coordinator provides the literal text to land in this document — not a summary for the builder to paraphrase. The builder's job is to place it correctly, not to author the substance of the ruling.
2. **Committed alone, in the parcel worktree, before any implementing code.** The amendment commit touches only convention/documentation files. No spec-linter code, no schema files, no tests ride in the same commit. It is committed *before* the builder writes any implementation for the parcel the amendment enables — so the amendment's existence on disk does not depend on the implementation landing successfully.
3. **Commit message explicitly identifies it as a coordinator amendment.** Not a generic `docs: update conventions` message — the message must state, in plain language, that this is a coordinator-ratified amendment (e.g. `docs(specs): W0-P2 SPEC-CONVENTION v0.2 amendment (coordinator-ratified)`). This is what lets a future reader distinguish "the coordinator ruled on this" from "a builder edited prose while implementing."

**Purpose.** The amendment commit is the evidence that the ruling did not evaporate as a verbal decision. A chat transcript is not discoverable by `git log`; a standalone, clearly-labeled commit is. Anyone auditing this convention's history later can find exactly which commit ratified which rule, independent of whatever chat thread produced it.

**Worked examples.** Commits `057136b`, `ff9f6d3`, `28a0233`, and `5d530fb` demonstrate this pattern in practice — each is a standalone, coordinator-identified amendment commit that landed a ruling into this convention or an adjacent governance document ahead of the implementation it unblocked. This section (§11) and the §4 v0.2 schema-field extension it accompanies were themselves delivered following this exact pattern (W0-P2) — the amendment commit for this addition precedes, and is separate from, the `plugins/foreman-line/spec-linter/` implementation commit(s).

---

*Comments and objections welcome — this draft exists to be improved. The one non-negotiable is that whatever we standardize is enforced by tooling, not memory.*
