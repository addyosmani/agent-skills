---
name: structured-output-guarantees
description: Guides production patterns for reliable structured outputs from LLMs (JSON/schema validation, repair loops, constrained decoding). Use when extracting structured data, building agents that must return typed objects, or eliminating JSON hallucinations.
---

# Structured Output Guarantees

## Overview

LLMs freestyle. Production systems cannot. This skill covers practical patterns to get valid, schema-conforming structured data every time: schema-first design, validation, repair loops, constrained decoding, and clear failure modes.

## When to Use

- Extracting structured data from text, PDFs, or tool results
- Building agents that must return typed objects to downstream code
- Replacing brittle "please respond in JSON" prompts
- Designing retry / self-correction loops for invalid outputs
- Evaluating structured extraction quality

**Not for:** free-form creative writing or pure chat UX without a schema.

## Core Principles

### 1. Schema is the source of truth

- Define the target with JSON Schema, Pydantic, Zod, or equivalent *before* prompting.
- Keep schemas tight: required fields, enums, ranges, formats.
- Prefer many small schemas over one giant optional blob.

### 2. Prefer constrained decoding when available

When the provider supports JSON mode / grammar / tool-calling with schema, use it. It beats prompt-only compliance.

### 3. Validate always; never trust the model

```text
raw model output → parse → validate against schema → accept OR repair OR fail
```

Downstream code should only receive already-validated objects.

### 4. Repair loops must be bounded and observable

- Max N attempts (e.g. 2–3).
- Feed validator errors back to the model (field paths + messages), not vague "try again".
- Log every attempt for debugging and evals.
- Escalate to hard failure or human review after budget is exhausted.

### 5. Separate "extract" from "decide"

Do not ask the same call to invent business decisions and also emit perfect schema. Extract facts first; apply deterministic logic second.

### 6. Design for partial success when appropriate

For multi-record extraction, allow valid items through and isolate invalid ones with reasons, instead of failing the entire batch unless atomicity is required.

## Minimal Reliable Pipeline

1. Define schema (Pydantic/Zod/JSON Schema).
2. Prompt with schema + short examples of valid objects only (avoid invalid examples).
3. Request structured mode / tool call if available.
4. Parse + validate.
5. On failure: repair prompt with specific validator errors; retry ≤ N.
6. On final failure: return structured error to caller; do not pass raw invalid JSON downstream.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The model almost always returns valid JSON" | Almost is not production. Validate every time. |
| "We'll fix bad outputs in the UI" | Corruption spreads. Reject at the boundary. |
| "One more retry without feedback will fix it" | Without validator detail, retries wander. |
| "Loosen the schema so it passes" | You traded type safety for silence. Tighten and repair instead. |

## Red Flags

- `JSON.parse` without schema validation
- Unbounded retry loops
- Schemas full of optional fields that hide missing data
- Prompts that ask for JSON but never show the schema
- Downstream code that catches parse errors and continues with defaults silently

## Verification

- [ ] Schema exists and is versioned with the code that consumes it
- [ ] Every model output path validates before use
- [ ] Repair loop is bounded and logs attempts
- [ ] Final failure is explicit and structured
- [ ] Evals cover invalid, partial, and adversarial outputs
- [ ] Constrained decoding / tool mode used when the provider supports it
