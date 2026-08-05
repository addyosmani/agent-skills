**HERE I PASTED THE KICKSTART MESSAGE INTO CLAUDE'S CONTEXT.**
---

I've read the spec in full and investigated the repo. The three referenced source documents (FOREMAN-LINE-PLAN.md, SPEC-CONVENTION.md, ADR-069) do not exist anywhere in this repo — I searched by name and by content. plugins/foreman-line/contracts/ already exists but is empty. Here is my Step 0.

Step 0 — Scope restatement, file plan, Out-of-Scope confirmation, and flags
Scope, in my own words
Freeze the typed interface boundaries between the Foreman Line's six stages (A Intake → B Registration → C Dispatch & Build → D Verification → E Integration → F Closure) so that later waves can be built in parallel against stable contracts. This parcel ships only types + JSON Schemas + tests — zero runtime behavior. Concretely:

A CorrelationContext type implementing the ADR-069 taxonomy exactly (WorkloadId → SessionId → WorkflowId/RunId → AgentId/InstanceId → ContextId).
Generic StageInput<T> / StageOutput<T> envelopes that wrap every stage's payload and carry CorrelationContext, an opaque ReceiptRef (hash + locator only), timestamp(s), and ReworkSignal | null. The envelope is stage-invariant; only the payload T changes.
Seven payload types (Stage C is "Dispatch & Build," so it owns two): ShapingResult, RegistrationResult, DispatchOrder, BuildResult, VerificationVerdict, IntegrationResult, ClosureRecord.
Dual representation: each contract exists as a TS type and a JSON Schema, bound together so neither can drift.
All shapes readonly/immutable.
Dual-representation mechanism I intend to use (this is the core design decision): author each JSON Schema as an ajv JSONSchemaType<T> TypeScript literal — this makes tsc itself enforce type↔schema parity at compile time (if the type and schema disagree, the build fails). A small generate step serializes those typed literals to committed schemas/*.json (what agents consume). The AC2 "generated-agreement test" then asserts the on-disk JSON equals the serialized-from-source output (no drift) and that a canonical sample of each type validates against its schema. Generic envelopes are handled by schema factory functions (stageInputSchema(payloadSchema)), which also demonstrates envelope generality (the same factory serves all stages unchanged).

Files I intend to create (all under plugins/foreman-line/contracts/)
Package / tooling

package.json — ESM ("type":"module"), ajv pinned as the sole runtime dependency; typescript, tsx, @biomejs/biome pinned as devDependencies; scripts for typecheck/test/generate/lint.
tsconfig.json — strict, module: ESNext, moduleResolution: Bundler, noEmit.
biome.json — Biome 2.x formatter + linter config (no root biome config exists today).
.gitignore — ignore local node_modules/ (repo root may already cover this; I'll confirm and skip if redundant).
Source (src/)

src/correlation.ts — CorrelationContext + the ADR-069 ID types.
src/envelope.ts — StageInput<T>, StageOutput<T>, ReceiptRef, ReworkSignal, StageId.
src/payloads.ts — the 7 payload types + their small sub-types.
src/schemas/index.ts — the JSONSchemaType<T> schema literals + envelope schema factories + a contract registry (name → type sample + schema).
src/generate.ts — writes schemas/*.json from the typed schema objects.
src/index.ts — public re-exports.
Generated JSON Schemas (schemas/, committed)

schemas/correlation-context.schema.json, receipt-ref.schema.json, rework-signal.schema.json, one per payload (shaping-result.schema.json … closure-record.schema.json), and composed envelope schemas per stage boundary. (~13–15 files.)
Tests (test/)

test/parity.test.ts — AC2 (generated-agreement / no-drift + sample validation).
test/propagation.test.ts — AC3 (A→F envelope chain, one CorrelationContext, asserts identity unmutated).
test/rework.test.ts — AC4 (RunId uniqueness + WorkflowId stability across D→C→D).
test/strictness.test.ts — AC5 (reject missing correlation fields, unknown fields under strict mode, ReceiptRef missing hash or locator).
Docs

README.md — AC8 (≤2 sentences per stage-boundary type + the A→F diagram).
Files I will NOT modify: root package.json/workspaces, .claude-plugin/marketplace.json, SPEC-CONVENTION.md, or the spec itself. The contracts package will be self-contained (its own node_modules) to keep blast radius minimal.

Out of Scope — confirmed
I confirm and will honor all eight exclusions: no runtime stage implementation; no Jira/MCP types beyond opaque refs in RegistrationResult; no routing-policy logic/schema; ReceiptRef stays opaque (no receipt shape/canonicalization/chaining); no skill-injection matrix schema (injected skills are an opaque string[]); no Smart Triage/assignment types; no persistence/transport/serialization beyond JSON-Schema validation; no edits to SPEC-CONVENTION.md.

Flags — ambiguities, contradictions, and risks
Referenced authorities are absent from the repo. FOREMAN-LINE-PLAN.md, SPEC-CONVENTION.md, and ADR-069 don't exist here (likely in kaseya-forge, which isn't a working dir). I will treat the spec text itself as authoritative — building CorrelationContext from the exact taxonomy on line 27 and payloads from line 30. I cannot cross-check ADR-069 fidelity against the actual ADR. Confirm that's acceptable, or point me at the docs.

Node version mismatch. Spec requires Node ≥22; this machine runs v20.18.0. node --test and tsx work on 20, so I can proceed, but package.json engines — do you want >=22 (per spec) or >=20 (per environment)? I'll set >=22 and note the local runtime is below it.

"exactly one dependency (ajv)... nothing else." I read this as runtime deps: ajv only. The Stack constraint itself mandates tsc/tsx/biome, which I'll add as devDependencies (toolchain, not product deps). Also: tsx, @biomejs/biome, and ajv are not currently installed — I'll need npm install inside contracts/ (requires network). Confirm the dep interpretation and that network install is available.

"timestamps" (plural) on the envelope is unspecified in count. I intend a single ISO-8601 timestamp: string per envelope, identical on both StageInput and StageOutput (input = when received, output = when produced). If you want a specific set (e.g., createdAt + receivedAt), tell me.

Location override. Default is plugins/foreman-line/contracts/ (exists, empty). Confirm you want it here and not in kaseya-forge.

Branded ID types. I plan branded string types for the ADR-069 IDs (nominal safety; directly supports AC4's RunId/WorkflowId distinction). There's a known friction between branded primitives and ajv's JSONSchemaType<T>; I'll verify compatibility as my very first implementation step and fall back to plain string aliases (documented) only if it fights the tool. Flagging so the choice isn't a surprise.

Stage C → two payloads. Because C is "Dispatch & Build," the A→F chain in AC3 threads seven payload envelopes across the six stages (DispatchOrder and BuildResult both under C). Confirm that reading.

Stopping here for your confirmation before writing any code.