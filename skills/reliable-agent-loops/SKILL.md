---
name: reliable-agent-loops
description: Builds LLM agent loops that survive production. Use when implementing or modifying a model→tool→model loop, a tool-calling loop, or any multi-step autonomous workflow. Use when an agent hangs, loops forever, double-executes a side effect, blows its token budget, or loses work when a step fails.
---

# Reliable Agent Loops

## Overview

An agent loop calls a model, runs whatever tools the model asked for, feeds the results back, and repeats until the model says it's done. Every iteration costs tokens and can trigger real side effects: charges, emails, file writes, deploys. Demos pass because the loop stays short and the inputs cooperate. Real traffic produces long loops, malformed tool output, timeouts, and half-finished runs.

Three failures cause most agent-loop incidents: iteration that never terminates, tool errors that get swallowed, and side effects that run more than once. Design against those three before worrying about anything else.

## When to Use

- Writing or changing the main loop (model → tool → model)
- Adding a tool that writes data, moves money, sends messages, or deploys
- Adding retries, timeouts, or backoff to a tool or model call
- Debugging a loop that hangs, repeats itself, or loses progress after a crash
- Before letting the agent run without a human approving each step

## Process

### 1. Bound the loop

Cap both the iteration count and the token/dollar spend. Reaching a cap is an expected outcome, not an exception, so return the best partial answer with a reason instead of throwing.

```ts
// BAD: nothing stops this once the model keeps asking for tools
while (!done) {
  const res = await model.run(messages);
  done = handle(res);
}

// GOOD: bounded by steps and spend; exhaustion is a defined return value
const MAX_STEPS = 12;
let tokensUsed = 0;
for (let step = 0; step < MAX_STEPS; step++) {
  const res = await model.run(messages);
  tokensUsed += res.usage.totalTokens;
  if (tokensUsed > TOKEN_BUDGET) return partial(messages, "token_budget_exceeded");
  if (res.stop === "final") return final(res);
  messages.push(...(await runTools(res.toolCalls)));
}
return partial(messages, "max_steps_reached");
```

### 2. Surface tool errors instead of swallowing them

A tool error that gets caught and ignored leaves the model working from missing data, and it will invent an answer around the gap. Return the error to the model as a structured tool result so it can adapt, or fail the run. Don't catch it and continue with a null.

```ts
// BAD: the model never learns the call failed
try { result = await tool(args); } catch (e) { result = null; }

// GOOD: the failure becomes an observation the model can act on
try {
  result = { ok: true, data: await tool(args) };
} catch (e) {
  result = { ok: false, error: classify(e) };
}
```

### 3. Make retries idempotent

Retry only the errors worth retrying (timeouts, 429s, 5xx), with exponential backoff and jitter. A 4xx will fail the same way every time, so don't retry it. Any retried call with a side effect needs an idempotency key, or a timeout followed by a retry runs it twice.

```ts
// BAD: timeout, then retry, and the customer is refunded twice
await stripe.refunds.create({ charge, amount });

// GOOD: the same key collapses duplicates on the provider side
await stripe.refunds.create(
  { charge, amount },
  { idempotencyKey: `refund:${orderId}` }
);
```

### 4. Gate irreversible actions

Let reversible actions run on their own. Anything you can't undo (refunds, deletes, outbound email, deploys) should require an explicit confirmation or sit behind an allowlist, and each tool should hold the narrowest permissions it needs.

```ts
const IRREVERSIBLE = new Set(["issueRefund", "deleteAccount", "sendEmail", "deploy"]);
if (IRREVERSIBLE.has(call.name) && !call.approved) return requestConfirmation(call);
```

For tool input validation, authorization, and the threat model around untrusted tool output (including prompt injection through tool results), follow `security-and-hardening`. This skill covers only the loop-control side of those actions.

### 5. Persist state so a run can resume

Checkpoint after each step. If the process dies at step 8 of 10, the rerun should pick up at step 8, and it must not replay the side effects from steps 1 through 7. Guard each side effect with a check for whether this run already performed it.

### 6. Instrument every run

Assign a run ID and record a per-step trace: the tool calls, their arguments, token counts, and cost. When a run misbehaves in production, you need to reconstruct what it did from the logs without rerunning it. For the underlying logging, metrics, and tracing setup, follow `observability-and-instrumentation`; this skill only adds the per-run trace an agent loop needs on top of it.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "The model won't actually loop forever." | It will, the first time a tool returns something it didn't expect. The cap is one line of code. |
| "The tool is idempotent, so retries are safe." | Confirm that. A timeout-then-retry on a non-idempotent POST runs twice. Add a key regardless. |
| "We'll add tracing later." | You need it the first time a production run goes wrong, and by then there's nothing to read. Add the run ID now. |
| "Resume is over-engineering." | A crash that replays a refund from step 3 is the exact case resume exists to prevent. |
| "Confirmation slows the agent down." | Only on irreversible actions, and the time saved is trivial next to undoing a wrong refund or deploy. |

## Red Flags

- `while (true)` or `while (!done)` with no step or token cap
- A `try/catch` around a tool call that logs the error and continues
- Retry logic wrapping a charge, send, or write with no idempotency key
- No run ID in the logs, so past runs can't be reconstructed
- Side effects with no "did this run already do it?" guard on resume
- Tools that can delete, pay, or deploy with no confirmation or allowlist

## Verification

- [ ] The loop has a hard step cap and a token/cost budget, and hitting either returns a partial result with a reason
- [ ] Tool errors are returned to the model as structured results or fail the run; none are silently dropped
- [ ] Only retryable errors retry, with backoff and jitter, and every retried side effect carries an idempotency key
- [ ] Irreversible actions require confirmation or an allowlist, and tools run with least privilege
- [ ] Run state is checkpointed, and a resumed run does not repeat completed side effects
- [ ] Every run has an ID and a per-step trace with token and cost counts
