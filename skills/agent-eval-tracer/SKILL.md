---
name: agent-eval-tracer
description: Evaluates, traces, and verifies multi-agent AI systems by testing each agent in isolation, measuring output consistency across repeated runs, and validating memory retention. Use when evaluating an AI agent or multi-agent pipeline, debugging non-deterministic flakiness or hallucinations, testing memory and summarization layers with planted facts, or auditing whether individual sub-agents meet their contracts.
---

# Agent Eval Tracer

## Overview

End-to-end pass rates lie. In a multi-agent system, an individual agent or architectural layer can fail completely while the aggregate pipeline score barely moves because downstream components compensate or test suites only exercise un-branched paths. 

`agent-eval-tracer` enforces a component-level evaluation harness: testing each agent in isolation with frozen inputs, quantifying non-deterministic hallucinations through repeated consistency runs, verifying memory layers with planted-fact recall over realistic turn horizons, and compiling a masking-first diagnostic report.

## When to Use

- Evaluating, benchmarking, or regression-testing an AI agent or multi-agent pipeline
- Investigating suspected hallucinations, non-deterministic drift, or flakiness across runs
- Testing long-term memory, summarization, or state management layers
- Writing fast, deterministic regression assertions for agent routing, tool schemas, and output contracts without invoking live LLMs
- Investigating "too good to be true" pass rates where users report failures that test suites never caught

**NOT for:**
- Deterministic code testing where no LLM or agent runtime is involved (use `test-driven-development`)
- UI and DOM interaction testing in web browsers (use `browser-testing-with-devtools`)
- Production telemetry and distributed tracing across microservices (use `observability-and-instrumentation`)

## Core Process

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ 1. Map & Isolate │ ──> │ 2. Contract Test │ ──> │ 3. Consistency (Nx) │
└─────────────────┘     └──────────────────┘     └──────────────────────┘
                                                            │
┌─────────────────┐     ┌──────────────────┐               ▼
│ 5. Masking Rep. │ <── │ 4. Memory Recall │ <──────────────┘
└─────────────────┘     └──────────────────┘
```

### Step 1: Map the Multi-Agent Architecture
Inventory all constituent components before running tests. For each agent or sub-layer (e.g., Classifier, Router, Planner, Memory Synthesizer, Tool Caller, Escalator):
- **Input boundary**: What exact payload, context window, and history does it receive?
- **Output contract**: What schema, decision enum, or text format must it return?
- **Side effects**: What external tools, state mutations, or API calls does it perform?

You cannot evaluate in isolation what you have not explicitly bounded.

### Step 2: Write Fast Deterministic Contracts (No LLM Calls)
Before evaluating stochastic model behaviors, lock down deterministic boundaries with zero-LLM contract tests that execute in milliseconds:
- **Router schema validation**: Ensure decision keys map strictly to registered enums.
- **Tool call format checking**: Verify parameter shapes, required fields, and boundary constraints.
- **Invariant assertions**: Verify security guardrails (e.g., sanitized paths, absence of raw secrets, forbidden tool access).

### Step 3: Isolate Each Agent with Stubs and Spies
Wrap the target sub-agent and decouple it from upstream and downstream agents:
- **Freeze upstream inputs**: Feed identical, recorded fixtures to the isolated agent.
- **Stub external dependencies**: Replace database calls, web retrievers, and downstream tools with in-memory spies that record attempted actions without executing live side effects.
- **Evaluate in isolation**: Record latency, token usage, tool invocations, and raw completion outputs for *only* the unit under test.

### Step 4: Quantify Consistency and Hallucination Across Repeated Runs
LLMs are non-deterministic; a single test pass does not prove reliability.
- Run the identical prompt and input through the isolated agent $N$ times (minimum $N=5$, recommended $N=10$) under identical temperature and configuration.
- Compute the **Consistency Ratio**:
  $$\text{Consistency Ratio} = \frac{\text{Count of modal (most frequent) response}}{\text{Total iterations } N}$$
- Flag any agent with a consistency ratio below 0.80 on discrete classification or routing tasks. Inspect reasoning traces to isolate semantic contradictions and hallucinated arguments.

### Step 5: Verify Memory Retention with Planted-Fact Recall
Test whether the agent's memory or summarization layer truly retains facts across conversational horizons:
1. **Plant the fact**: Provide a distinctive, arbitrary key-value token in Turn 1 (e.g., `Favorite database: SurrealDB-v3`).
2. **Inject distractor context**: Run 10 to 20 conversational turns of plausible filler tasks, tool calls, and topic shifts to force active context eviction.
3. **Probe the memory layer**: Directly inspect the extracted summary or state buffer *before* prompting the final agent. Does the planted fact exist in the compressed memory?
4. **Query the agent**: Ask a query requiring the planted fact. Distinguish between *retrieval failure* (fact lost during summarization) and *reasoning failure* (fact retained in state but ignored by model).

### Step 6: Compile a Masking-First Diagnostic Report
Aggregate results into a diagnostic summary highlighting hidden failure points:
- **Per-Agent Pass Rate vs. Pipeline Pass Rate**: Contrast individual component scores against end-to-end scores to expose masking.
- **Variance Matrix**: Tabulate consistency scores across all $N$ runs.
- **Memory Retention Horizon**: Document maximum turn depth before factual degradation occurs.
- **Root Cause Attribution**: Categorize failures as prompt ambiguity, tool schema mismatch, context eviction, or model non-determinism.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The end-to-end integration test passed, so all agents are working." | Downstream agents frequently mask upstream errors by guessing or hallucinating missing fields. Test each agent alone. |
| "Running the evaluation once passed, so the prompt is stable." | Stochastic models can pass once on a lucky seed and fail on 30% of subsequent calls. Always run repeated consistency trials ($N \ge 5$). |
| "Memory tests pass on a 3-turn test conversation." | Short conversations never exercise context-window eviction or summarization compression. Memory must be tested across realistic turn horizons. |
| "Deterministic mocks don't test real agent intelligence." | Mocks isolate whether the agent fails due to its own reasoning or flaky external APIs and dependencies. |

## Red Flags

- Evaluating an agent pipeline exclusively with a single top-level success metric (e.g., "92% accuracy") with no per-agent telemetry.
- Skipping consistency checks because "temperature is set to 0.2" (sampling still diverges across complex reasoning paths).
- Believing memory works because the agent answers a question when the target fact is still present in the uncompacted recent message history.
- Live API calls executing against third-party production systems during evaluation runs.

## Verification

After applying this skill, verify:
- [ ] Every agent/layer in the pipeline has an identified input boundary, output contract, and side-effect profile.
- [ ] Deterministic contract tests (schema, enum, security invariants) execute without making live LLM calls.
- [ ] Targeted sub-agents are executed in isolation with frozen inputs and mocked tool dependencies.
- [ ] Consistency trials ($N \ge 5$) have been performed to measure non-deterministic hallucination rates.
- [ ] Memory and summarization layers are tested with planted facts separated by distractor turns.
- [ ] The final evaluation report surfaces per-agent breakdowns, consistency scores, and masking risks.
