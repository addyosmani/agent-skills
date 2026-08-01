I've read the spec in full, both prior Step-0 passes, the model-routing judgment, the ADR-069 mirror (with its binding DRAFT caveat), and inspected the actual repo state. Here is Step 0.

Step 0 — W0-P1 Pipeline Stage Contracts
Scope, in my own words
Freeze the typed interface boundaries between the Foreman Line's six stages (A Intake → B Registration → C Dispatch & Build → D Verification → E Integration → F Closure) so that later waves (W1–W5) can be built in parallel against stable contracts. Types + JSON Schemas + tests only — zero runtime behavior. Concretely:

A CorrelationContext grounded in observed kaseya-one-ai@dev conventions — four required UUID-format fields (correlationId, sessionId, workflowId, runId) plus one optional Line-scoped agentId?. Not the ADR-069 taxonomy: WorkloadId and ContextId are explicitly excluded until ratification. Branded string types in TS (compile-time safety); plain UUID strings on the wire (branding does not change serialization).
Stage-invariant generic envelopes StageInput<T> / StageOutput<T> carrying CorrelationContext, an opaque ReceiptRef (hash + locator only), a single ISO-8601 UTC timestamp (input = received-at, output = produced-at), and reworkSignal: ReworkSignal | null. ReworkSignal = { reason, originStage, targetStage, attempt, verdictReceipt? }.
Seven payload types across six stages (C owns two): ShapingResult, RegistrationResult, DispatchOrder, BuildResult, VerificationVerdict, IntegrationResult, ClosureRecord.
Dual representation, drift-proof: each contract authored as an ajv JSONSchemaType<T> typed literal so tsc itself makes type↔schema disagreement a compile error (the SETTLED mechanism from the routing decision — Agent 1's approach). Composed per-boundary schemas validate a complete stage message strictly in one shot via envelope schema-factory functions — I will not use the base-envelope-with-open-payload pattern (it contradicts AC5 strict mode). A generate step serializes the typed literals to committed schemas/*.json; a parity test asserts on-disk === serialized-from-source.
All shapes readonly/immutable.
Files I will create (exact paths, all under plugins/foreman-line/contracts/)
Tooling (3)

package.json — ESM ("type":"module"), ajv as the sole runtime dep; typescript, tsx, @biomejs/biome pinned devDeps; engines: ">=22"; scripts: typecheck / test / generate / lint.
tsconfig.json — strict, module: NodeNext, noEmit.
biome.json — Biome 2.x formatter + linter.
Source (11)

src/correlation.ts — branded ID types + CorrelationContext + its JSONSchemaType literal.
src/envelope.ts — ReceiptRef, ReworkSignal, StageId, StageInput<T>, StageOutput<T>, their shared schemas, and the stageEnvelopeSchema(payloadSchema) factory.
src/stages/a-intake.ts — ShapingResult (+ schema)
src/stages/b-registration.ts — RegistrationResult (+ schema)
src/stages/c-dispatch.ts — DispatchOrder, BuildResult (+ schemas)
src/stages/d-verification.ts — VerificationVerdict (+ schema)
src/stages/e-integration.ts — IntegrationResult (+ schema)
src/stages/f-closure.ts — ClosureRecord (+ schema)
src/registry.ts — name → {schema, canonical sample} registry (feeds generate + tests)
src/generate.ts — writes schemas/*.json from the registry
src/index.ts — barrel re-export
Committed JSON Schemas (17, in schemas/)

Standalone (10): correlation-context, receipt-ref, rework-signal, shaping-result, registration-result, dispatch-order, build-result, verification-verdict, integration-result, closure-record (.schema.json each)
Composed per-boundary (7): stage-envelope.<payload>.schema.json for each of the seven payloads (the strict runtime artifact — see Flag 3)
Tests (4)

tests/parity.test.ts — AC2 (no-drift + canonical-sample validation + both envelope typed schemas agree with composed file)
tests/propagation.test.ts — AC3 (7-hop A→F chain, single CorrelationContext, identity unmutated)
tests/rework.test.ts — AC4 (D→C→D: workflowId stable, runId unique per attempt)
tests/strictness.test.ts — AC5 (rejects: missing correlation fields, non-UUID-format values, unknown envelope fields under strict, ReceiptRef missing hash or locator)
Total ≥ 15 test cases across those files (AC7).

Docs (1)

README.md — AC8 (≤2 sentences per boundary type + A→F diagram)
Total: ~36 new files. Zero repo files modified — I will not touch root package.json workspaces (contracts stays self-contained, like plugins/kds-figma), SPEC-CONVENTION.md, or the spec. (One conditional: a local .gitignore only if root doesn't already ignore nested node_modules/.)

Out of Scope — confirmed
I confirm and will honor all nine exclusions: no runtime stage implementation (W1–W4); no Jira/MCP types beyond opaque refs in RegistrationResult (W1-P4); no routing-policy logic/schema (W0-P3); ReceiptRef stays opaque — no shape/canonicalization/linkage (W0-P4); no skill-injection matrix schema — injected skills are an opaque string[] (W0-P5); no Smart Triage/assignment types (W5); no persistence/transport/serialization beyond JSON-Schema validation; no SPEC-CONVENTION.md edits (W0-P2 owns v0.2 fields).

Flags — only what isn't already resolved on disk or in the directive
Flag 1 — Branch/worktree blocker (needs your call before I build). feat/foreman-line-w0-p1 is checked out in a separate worktree at C:/Repos/foreman-line-w0-p1, and its tip (5ebdd5b) is 5 commits behind my current branch feat/pcc-scaffold — it is missing the very spec, kickstarter, ADR-069 mirror, and transcripts that define this parcel (all committed on feat/pcc-scaffold). Since the repo is the sole source of truth and the spec must be present to build against, that branch needs those doc commits first. I'm currently in the main worktree on feat/pcc-scaffold. Which do you want: (a) I build in the existing C:/Repos/foreman-line-w0-p1 worktree after bringing feat/pcc-scaffold's doc commits into it (rebase/merge); (b) re-point feat/foreman-line-w0-p1 onto current feat/pcc-scaffold HEAD, then build; or (c) something else? I won't touch worktrees/branches without your direction.

Flag 2 — UUID validation with a single dependency (design resolution, please endorse). AC5 requires rejecting non-UUID-format correlation values, but ajv's format: "uuid" requires the separate ajv-formats package — a second runtime dep, which the spec forbids ("exactly one… ajv… nothing else"). I'll satisfy AC5 with a version-agnostic UUID pattern regex instead — which also matches the spec's own wording ("generic UUID format — the platform does not mandate UUID versions") and keeps ajv as the sole runtime dep. Confirming the regex-over-format choice so it's not a surprise.

Flag 3 — StageInput/StageOutput composed-schema collapse (confirm). StageInput<T> and StageOutput<T> are structurally identical on the wire (same fields, including one timestamp: string; only the semantic differs — received-at vs produced-at). I plan one composed schema per payload boundary (7 files) serving both, with a parity test proving both JSONSchemaType<StageInput<T>> and JSONSchemaType<StageOutput<T>> typed literals agree with the committed file — rather than 14 near-duplicate schemas. OK to collapse to 7?

Execution note (not a flag): local Node is v20.18.0, below the pre-resolved engines: ">=22" floor. tsx --test, node --test, and ajv all run on v20, so I can execute every AC check locally against the declared-22 package — flagging only so you know verification runs on v20.

Stopping here for your confirmation before writing any code. I especially need your answer on Flag 1 (where I build), since it determines the working tree.