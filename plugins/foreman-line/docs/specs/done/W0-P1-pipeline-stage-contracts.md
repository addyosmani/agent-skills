---
ticket: KONE-TBD            # register via jira-workflow at Stage B; replace before dispatch
title: Foreman Line - pipeline stage contracts (W0-P1)
status: done                # merged via PR #12 (c9bc6a3), 2026-07-14
owner: clinton.morgan
created: 2026-07-13
updated: 2026-07-13
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [contracts/*, platform/correlation]
routing_class: architecture/risk   # W0 contract work routes frontier per policy
---

# W0-P1 - Pipeline Stage Contracts

## Intent

Define the frozen, typed contracts between the Foreman Line's six stages (A Intake → B Registration → C Dispatch & Build → D Verification → E Integration → F Closure), including correlation-identity propagation per ADR-069. Every downstream wave (W1–W5) builds against these interfaces; freezing them first is what lets later parcels be dispatched in parallel without collision. No runtime behavior ships in this parcel - types, schemas, and their tests only.

## Constraints

- **Location:** `plugins/foreman-line/contracts/` in `kaseya-one-productivity-tools` (local: `C:\Repos\kaseya-one-productivity-tools`). The Line is a plugin composed of skills; it lives with them. Override at approval if you want it in `kaseya-forge` instead - decide once, here.
- **Stack:** TypeScript, Node ≥22, ESM-only. Tests via `node --test` (`npx tsx --test`). Lint/format with `biome`. Minimal pinned deps - schema validation may add exactly one runtime dependency (`ajv` or equivalent); nothing else.
- **Dual representation:** every contract ships as (1) a TypeScript type and (2) a JSON Schema, with a test asserting they agree. Agents consume schemas; humans and compilers consume types. Neither is allowed to drift.
- **Correlation identity (grounded in platform reality):** `CorrelationContext` adopts the vocabulary observed in `kaseya-one-ai@dev` — the shipped `EventHubMessage<T>` envelope and executor tracing keys — NOT the unratified ADR-069 draft. Four required fields, UUID-format strings on the wire (branded types in TS for compile-time safety; branding does not change serialization): `correlationId` (end-to-end key; matches `EventHubMessage<T>.CorrelationId`), `sessionId`, `workflowId` (stable across re-runs of the same workflow), `runId` (unique per execution attempt, including rework retries). One optional Line-scoped extension: `agentId?` (needed by dispatch semantics; documented as a Line field, not a platform claim). Explicitly excluded until ADR-069 is ratified: `WorkloadId` (unadopted rename of the incumbent `CorrelationId`) and `ContextId` (unimplemented anywhere; deferred even by the draft ADR itself). No additions without a ratified ADR.
- **Stage envelope pattern:** all stage I/O is wrapped in `StageInput<T>` / `StageOutput<T>` envelopes carrying `CorrelationContext`, a `ReceiptRef` (opaque pointer - hash + locator only), a single ISO-8601 UTC `timestamp` (input = when received, output = when produced), and `reworkSignal: ReworkSignal | null`. `ReworkSignal` is `{ reason: string; originStage: StageId; targetStage: StageId; attempt: number; verdictReceipt?: ReceiptRef }`. Payload types plug into the envelope; the envelope never changes per stage.
- **Payload types to define (one per stage boundary):** `ShapingResult` (parcel spec refs + proposed Epic/Story tree), `RegistrationResult` (ticket keys + SHA permalinks, both directions), `DispatchOrder` (parcel ref, Step-0 restatement, routing decision ref, injected-skill list), `BuildResult` (branch, commit SHAs, touched surfaces), `VerificationVerdict` (harness claim results, adversarial findings w/ standard citations, pass/rework), `IntegrationResult` (PR ref, CI job outcomes, audit-trigger evaluation), `ClosureRecord` (merge SHA, ticket transition, spec lifecycle move).
- All types are `readonly`/immutable-shaped; contracts describe facts, not mutable state.

## Acceptance Criteria

1. `npx tsc --noEmit` passes on the contracts package.
2. Every exported contract type has a matching JSON Schema in `schemas/`, and a generated-agreement test proves type ↔ schema parity for all of them.
3. A round-trip test constructs a full A→F envelope chain (7 hops across 6 stages — Stage C emits both `DispatchOrder` and `BuildResult`) with a single `CorrelationContext`, and asserts the identity propagates unmutated through every envelope.
4. `RunId` uniqueness and `WorkflowId` stability across a rework loop (D → C → D) are covered by an explicit test.
5. Schema validation rejects: missing correlation fields, correlation values that are not UUID-format strings (generic UUID format — the platform does not mandate UUID versions), unknown envelope fields (strict mode), and a `ReceiptRef` without both hash and locator.
6. `biome check` passes with zero diagnostics.
7. All tests pass via `npx tsx --test`; total test count ≥ 15.
8. `contracts/README.md` documents each stage boundary in ≤ 2 sentences per type, with the A→F diagram.

## Out of Scope

- Any runtime implementation of any stage (W1–W4).
- Jira/MCP calls or types beyond the opaque refs in `RegistrationResult` (W1-P4 owns Jira shapes).
- Routing policy evaluation logic and its schema (W0-P3).
- Receipt *shape*, canonicalization, or chain linkage - `ReceiptRef` is deliberately opaque here (W0-P4).
- Skill injection matrix schema (W0-P5).
- Smart Triage / assignment types (W5).
- Persistence, transport, or serialization beyond JSON Schema validation.
- Modifying SPEC-CONVENTION.md (v0.2 field additions are W0-P2).

## Context & References

- FOREMAN-LINE-PLAN.md - §2 (stages), §3 (D1–D9), §5a (skill matrix, consumed as an opaque list here)
- SPEC-CONVENTION.md - schema this parcel is written under
- `kaseya-one-ai@dev` observed conventions — AUTHORITATIVE for `CorrelationContext`: `EventHubMessage<T>` (`src/Features/KaseyaOneAi.TicketsTriage/Models/EventHubMessage.cs`) and executor tracing keys `sessionId`/`workflowId`/`runId` (e.g. `SkillExtractionWorkflowExecutor`)
- ADR-069 (DRAFT, unratified) — directional reference only; mirrored with status caveat at `docs/reference/ADR-069-platform-identity-correlation-taxonomy.md`
- Prior art: `pcc` receipt canonicalization (`src/receipts/canonical.ts`) - informs `ReceiptRef` opacity, not imported here

## Verification Plan

Deterministic only - this parcel is pure contracts: compile check, parity tests, propagation tests, schema strictness tests, biome. Adversarial review focus: envelope generality (will Stage D's rework loop fit without envelope changes?) and platform-convention fidelity against `kaseya-one-ai@dev`.
