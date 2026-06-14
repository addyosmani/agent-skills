---
name: llm-cost-optimization
description: Reduces token usage and LLM API cost at runtime without lowering output quality. Use when LLM spend is climbing faster than usage, when prompts or context are large, or when building a feature that calls a model in a loop or at scale. Use when cost or latency per request needs to come down.
---

# LLM Cost Optimization

## Overview

LLM cost is tokens in plus tokens out, times request volume. Most apps pay for tokens they don't need: a static system prompt resent in full on every call, the entire conversation replayed each turn, whole documents stuffed into context, unbounded prose output, and a frontier model doing work a small one could. Measure cost per request first, then cut the largest line items in a way that doesn't touch output quality.

This is distinct from two neighboring skills. `context-engineering` tunes the coding agent's own session; `performance-optimization` targets latency and web vitals. This skill is about the dollar cost of the model calls your product makes at runtime.

## When to Use

- LLM API spend is rising faster than usage justifies
- System prompts, instructions, or retrieved context are large
- The full conversation transcript is replayed on every turn
- A frontier model is handling cheap, high-volume tasks (classification, extraction, routing)
- Cost or latency per request needs to come down

## Process

### 1. Measure cost per request first

Providers return token usage on every response. Log input and output tokens per call, then rank calls by total spend. Optimize the biggest line item, not the easiest one.

```ts
// BAD: optimizing on a hunch
// "the prompt feels long, let me trim some words"

// GOOD: log usage, then rank where the money actually goes
logger.info({ call: "summarize", inTok: res.usage.input_tokens, outTok: res.usage.output_tokens });
```

### 2. Cache the static prefix

The system prompt, tool schemas, and few-shot examples are identical on every call. Serve them from provider prompt caching so you stop paying full price to resend them. On any repeated prefix this is the largest and safest win.

```ts
// BAD: the same multi-thousand-token system prompt billed in full every call
await client.messages.create({ system: SYSTEM_PROMPT, messages });

// GOOD: cache the stable prefix; later calls read it at a fraction of the cost
await client.messages.create({
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  messages,
});
```

### 3. Stop replaying the full history

A full-transcript replay grows every turn and you pay for all of it each time. Keep recent turns verbatim and fold older ones into a short running summary; send deltas instead of rewriting the whole state.

```ts
// BAD: every turn resends the entire transcript
messages.push(userTurn);
await model.run(messages);

// GOOD: recent turns verbatim, older turns compressed into a summary
const context = [olderTurnsSummary, ...messages.slice(-RECENT_TURNS)];
await model.run(context);
```

### 4. Retrieve narrowly instead of stuffing

Don't paste whole documents into the prompt. Retrieve the few relevant chunks, dedupe them, and tune chunk size and top-k to the smallest set that still answers the question.

### 5. Cap and structure the output

Set `max_tokens`. When code consumes the output, ask for JSON against a schema rather than prose, and drop "be detailed/thorough" instructions where they aren't needed. Output tokens often cost more than input.

```ts
// BAD: unbounded prose the code then has to parse
const reply = await model.run({ messages });

// GOOD: capped and structured, cheaper to produce and to consume
const reply = await model.run({ messages, max_tokens: 256, response_format: RefundSchema });
```

### 6. Route to the right model

Send extraction, classification, routing, and short transforms to a small, cheap model; reserve the frontier model for genuine reasoning. Batch independent calls and memoize identical ones.

### Don't trade away quality

Some context earns its tokens. Keep few-shot examples that measurably improve accuracy, summaries that preserve detail the task needs, and retrieval that grounds answers. Check quality before and after any cut with `evaluating-llm-output`; a cheaper response that's wrong costs more than the tokens it saved.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Tokens are cheap." | At one request, sure. At production volume the resent system prompt is most of the bill. Cache it. |
| "We need the whole history." | The model needs the relevant history. Window or summarize, and measure whether quality actually drops. |
| "Caching is premature." | Prompt caching is a few lines and pays back on the first repeated prefix. |
| "A bigger model is just better." | On hard reasoning. For extraction and classification you're paying many times over for no quality gain. |
| "Structured output is less natural." | For machine-consumed output that is the point: fewer tokens, parseable, cheaper. |

## Red Flags

- System prompt or tool schemas resent uncached on every call
- The full conversation transcript replayed each turn
- Whole documents or files pasted into the prompt
- No `max_tokens`, and free-form prose where the code parses JSON
- One expensive model used for every task regardless of difficulty
- No per-request token or cost logging, so the biggest driver is unknown

## Verification

- [ ] Input/output tokens and cost are logged per request, and the top spend drivers are known
- [ ] The static prefix (system prompt, tool schemas, examples) is served from a prompt cache
- [ ] History is windowed or summarized rather than replayed in full
- [ ] Context is retrieved narrowly with tuned chunking and top-k, not stuffed
- [ ] Outputs are capped with `max_tokens` and structured where code consumes them
- [ ] Cheap, high-volume tasks are routed to a smaller model; identical calls are memoized
- [ ] Output quality was checked before and after cuts, with no regression
