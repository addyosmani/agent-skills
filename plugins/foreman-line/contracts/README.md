# Foreman Line — Pipeline Stage Contracts (W0-P1)

Frozen, typed contracts between the Foreman Line's six stages. Every downstream
wave (W1–W5) builds against these interfaces, so they are frozen first. This
parcel ships **types + JSON Schemas + tests only** — no runtime stage behavior.

Each contract exists in **two representations that cannot drift**: a TypeScript
type (for the compiler and humans) and a JSON Schema (for runtime agents). Every
schema is authored as an ajv [`JSONSchemaType<T>`](https://ajv.js.org/guide/typescript.html)
literal, so a mismatch between a type and its schema is a **compile error**, not
merely a test failure. `npm run generate` serializes those typed literals to
`schemas/*.json`, and the parity test asserts the committed files never drift.

## The pipeline (A → F)

Correlation identity is created once at intake and propagates **unmutated**
through every envelope. Stage C emits two payloads (Dispatch **and** Build), so a
full run is **7 hops across 6 stages**:

```
        ShapingResult      RegistrationResult   DispatchOrder    BuildResult
  ┌───┐ ───────────► ┌───┐ ───────────────► ┌─────────────────────────────┐
  │ A │              │ B │                   │ C  (Dispatch & Build)        │
  └───┘  Intake      └───┘  Registration     └─────────────────────────────┘
                                                            │ BuildResult
                                                            ▼
  ┌───┐ ◄─────────── ┌───┐ ◄─────────────── ┌───┐ ◄────────────────────────
  │ F │              │ E │                   │ D │   VerificationVerdict
  └───┘  Closure     └───┘  Integration      └───┘
  ClosureRecord      IntegrationResult         │
                                               └── rework ──► back to Stage C
```

Every hop is a `StageOutput<Payload>` that becomes the next stage's
`StageInput<Payload>`. If Stage D returns a `rework` verdict, it emits a
`ReworkSignal` targeting Stage C; the retry is a new execution attempt (fresh
`runId`) under the same `workflowId`.

## Correlation identity

`CorrelationContext` is grounded in **observed `kaseya-one-ai@dev` conventions**
(`EventHubMessage<T>.CorrelationId` plus executor tracing keys), **not** the
unratified ADR-069 draft. On the wire every id is a plain UUID-format string;
in TypeScript they are branded types for compile-time nominal safety (a `RunId`
cannot be passed where a `WorkflowId` is expected). The branding is a phantom
type — erased at runtime, invisible to serialization.

| Field           | Required | Meaning |
| --------------- | -------- | ------- |
| `correlationId` | yes      | End-to-end key; matches `EventHubMessage<T>.CorrelationId`. |
| `sessionId`     | yes      | Groups related interactions within a correlation. |
| `workflowId`    | yes      | Stable across re-runs of the same workflow definition. |
| `runId`         | yes      | Unique per execution attempt, including rework retries. |
| `agentId`       | no       | Line-scoped extension for dispatch semantics (not a platform claim). |

**Excluded until ADR-069 is ratified:** `WorkloadId` (an unadopted rename of the
incumbent `CorrelationId`) and `ContextId` (unimplemented, deferred by the draft
ADR itself). No additions without a ratified ADR.

## Envelope

Every stage's I/O is wrapped in a stage-invariant envelope; only the payload `T`
changes per boundary.

- **`StageInput<T>` / `StageOutput<T>`** — carry the `CorrelationContext`, a
  `ReceiptRef`, a single ISO-8601 UTC `timestamp` (input = when received, output
  = when produced), `reworkSignal: ReworkSignal | null`, and the `payload`. The
  two are structurally identical, so one composed schema per boundary serves both
  directions.
- **`ReceiptRef`** — an opaque pointer to a receipt: content `hash` + `locator`
  only. The receipt's shape and chaining are out of scope here (owned by W0-P4).
- **`ReworkSignal`** — emitted when work must go back upstream: `reason`,
  `originStage`, `targetStage`, `attempt` counter, and an optional
  `verdictReceipt`.

## Stage boundary payloads

- **`ShapingResult`** (Stage A → B) — the parcel spec references that were shaped,
  plus the proposed Epic/Story work-breakdown tree.
- **`RegistrationResult`** (Stage B → C) — the ticket keys created and the SHA
  permalinks in both directions (ticket→commit and commit→ticket). Jira/MCP
  shapes are out of scope; keys and links are opaque strings (W1-P4 owns those).
- **`DispatchOrder`** (Stage C, dispatch) — the order handed to a builder: parcel
  ref, the Step-0 restatement, a routing-decision ref, and the injected-skill
  list. Routing logic (W0-P3) and the skill matrix (W0-P5) are opaque here.
- **`BuildResult`** (Stage C, build) — the outcome of the build: the branch, the
  commit SHAs produced, and the surfaces touched.
- **`VerificationVerdict`** (Stage D → E) — the harness claim results, the
  adversarial findings with standard citations, and the overall `pass`/`rework`
  verdict that gates Stage E.
- **`IntegrationResult`** (Stage E → F) — the PR reference, the CI job outcomes,
  and the audit-trigger evaluation that decides whether Stage F escalates.
- **`ClosureRecord`** (Stage F) — the merge SHA, the ticket status transition, and
  the spec's lifecycle move that together mark the parcel shipped.

## Consuming the contracts

```ts
import Ajv from 'ajv'
import { shapingResultInputSchema, type StageInput, type ShapingResult } from '@foreman-line/contracts'

const ajv = new Ajv({ allErrors: true })
const validate = ajv.compile(shapingResultInputSchema) // full stage message, strict
```

Runtime agents that do not run TypeScript consume the committed
`schemas/*.schema.json` directly (10 standalone contract schemas + 7 composed
per-boundary envelope schemas).

## Working on this package

```bash
npm run typecheck   # tsc --noEmit
npm run generate    # rewrite schemas/*.json from the typed sources
npm run test        # tsx --test tests/*.test.ts
npm run lint        # biome check .
```

Runtime dependency: **`ajv` only**. `typescript`, `tsx`, and `@biomejs/biome` are
dev-only. Requires **Node ≥ 22** (ESM-only). UUID validation uses a
version-agnostic regex pattern (the platform mandates no UUID version), which
keeps `ajv` the sole runtime dependency — no `ajv-formats` needed.

> **Branded-type note:** branded ids compile cleanly against ajv's
> `JSONSchemaType<T>` in this toolchain, so no plain-string fallback was needed.
> If a future ajv/TypeScript combination rejects branded scalars, the documented
> fallback is to alias the id types to plain `string` (still UUID-validated by
> schema) without changing any wire format.
