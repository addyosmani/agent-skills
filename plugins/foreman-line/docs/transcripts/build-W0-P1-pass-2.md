**HERE I PASTED ONLY THE FULL PATH TO THE KICKSTARTER IN A FRESH CLAUDE CODE SESSION**

---

I have everything I need for Step 0. Here is my full restatement.

Step 0 — W0-P1 Scope Restatement
What this parcel does (in my words)
W0-P1 creates the frozen type layer that all six Foreman Line pipeline stages (A→F) compile against. It ships TypeScript types, JSON Schemas for each type, and tests proving they stay in sync. Zero runtime behavior. Every later wave imports from this package; it exists to prevent schema drift between agent-consumed JSON and compiler-consumed types.

Every file I intend to create (exact paths, all new)
Package scaffolding

plugins/foreman-line/contracts/package.json
plugins/foreman-line/contracts/tsconfig.json
plugins/foreman-line/contracts/biome.json
TypeScript source (src/)

plugins/foreman-line/contracts/src/correlation.ts — branded ID primitives + CorrelationContext
plugins/foreman-line/contracts/src/envelope.ts — ReceiptRef, ReworkSignal, StageInput<T>, StageOutput<T>
plugins/foreman-line/contracts/src/stages/a-intake.ts — ShapingResult
plugins/foreman-line/contracts/src/stages/b-registration.ts — RegistrationResult
plugins/foreman-line/contracts/src/stages/c-dispatch.ts — DispatchOrder, BuildResult
plugins/foreman-line/contracts/src/stages/d-verification.ts — VerificationVerdict
plugins/foreman-line/contracts/src/stages/e-integration.ts — IntegrationResult
plugins/foreman-line/contracts/src/stages/f-closure.ts — ClosureRecord
plugins/foreman-line/contracts/src/index.ts — barrel re-export
JSON Schemas (schemas/) — one per exported type (12 files)

CorrelationContext.schema.json
ReceiptRef.schema.json
ReworkSignal.schema.json
StageInput.schema.json (base envelope; payload typed as open object)
StageOutput.schema.json (base envelope; payload typed as open object)
ShapingResult.schema.json
RegistrationResult.schema.json
DispatchOrder.schema.json
BuildResult.schema.json
VerificationVerdict.schema.json
IntegrationResult.schema.json
ClosureRecord.schema.json
Tests (tests/)

plugins/foreman-line/contracts/tests/parity.test.ts — AC2: validates every payload type object against its schema; asserts schema rejects deliberately wrong shapes
plugins/foreman-line/contracts/tests/propagation.test.ts — AC3: constructs a full A→F chain, one CorrelationContext, asserts it is reference-identical (or deep-equal) through every envelope
plugins/foreman-line/contracts/tests/rework.test.ts — AC4: D→C→D rework loop; WorkflowId is stable, RunId is unique per leg
plugins/foreman-line/contracts/tests/schema-rejection.test.ts — AC5: rejects missing correlation fields, unknown envelope fields (additionalProperties: false), ReceiptRef without both hash and locator
Documentation

plugins/foreman-line/contracts/README.md — AC8: ≤2 sentences per boundary type, A→F ASCII diagram
Total: 30 new files, 0 modified files.

Out of Scope — confirmed
I will not touch: runtime stage implementations, Jira call shapes, routing policy logic (W0-P3), receipt canonicalization (W0-P4), skill injection matrix schema (W0-P5), Smart Triage types (W5), persistence/transport, or SPEC-CONVENTION.md.

Flags — ambiguities and gaps I need you to confirm before I write code
Flag 1 — ADR-069 is missing from the repo.
Neither ADR-069 nor FOREMAN-LINE-PLAN.md nor SPEC-CONVENTION.md exist in the repository yet. The spec gives me the taxonomy (WorkloadId → SessionId → WorkflowId/RunId → AgentId/InstanceId → ContextId) and AC4 tells me WorkflowId is stable and RunId is mutable across a rework loop. I plan to model all five as branded string opaque types and put them all as required fields on CorrelationContext. Is that correct, or does ADR-069 shape these differently?

Flag 2 — WorkflowId/RunId notation.
The spec writes these with a slash. I'm reading them as two sibling fields on CorrelationContext: workflowId (stable across a workflow) and runId (new for each execution attempt, including rework retries). AC4 tests their independence, which supports this. Confirm or correct.

Flag 3 — Stage C has two payload types.
The spec lists 7 payloads across 6 stages. Stage C is "Dispatch & Build" and owns both DispatchOrder and BuildResult. For the A→F round-trip test (AC3) I plan to model C as two sub-steps (dispatch sub-step → build sub-step), both using the same envelope, making the chain 7 hops rather than 6. Is that the right read, or should C emit a single combined payload?

Flag 4 — Envelope parity for generics.
StageInput<T> and StageOutput<T> are generic in TypeScript. JSON Schema can't natively express generics. My plan: one base schema for the envelope structure (with payload: {} open object) satisfies AC2 for the envelope types. Concrete stage inputs/outputs are tested by validating payload schemas against their respective payload types. Does this satisfy your intent for AC2, or do you want one composite schema per stage boundary (12 stage-boundary schemas instead of 5 base schemas + 7 payload schemas)?

Flag 5 — ReworkSignal shape.
The spec says envelopes carry ReworkSignal | null but doesn't define ReworkSignal's fields. I plan: { reason: string; originStage: "A"|"B"|"C"|"D"|"E"|"F"; reworkCount: number }. Any fields you want added or different names?

Awaiting your confirmation before I write a single line of code.