---
name: agent-tool-design
description: Guides design of reliable tools and function-calling interfaces for AI agents. Use when defining tool schemas, side effects, idempotency, error contracts, progressive disclosure, or when agents must call external systems safely.
---

# Agent Tool Design

## Overview

Tools are the agent's hands. Bad tool design produces hallucinated arguments, double side effects, unrecoverable errors, and context bloat. Design tools that are hard to misuse, easy to retry safely, and cheap to load.

## When to Use

- Defining function/tool schemas for an agent (OpenAI tools, Anthropic tools, MCP, custom)
- Adding side-effecting actions (send email, transfer funds, write DB, deploy)
- Designing search / retrieval / browser tools
- Reviewing agent failures caused by tool misuse
- Building MCP servers or skill-exposed scripts

**Not for:** pure prompt writing without tools, or general API design unrelated to agents (see `api-and-interface-design`).

## Core Principles

### 1. Schema is the contract

- Strict JSON Schema (or equivalent) with explicit types, enums, and required fields.
- Descriptions tell the model *when* and *why* to call the tool, not only what fields mean.
- Prefer fewer, sharper tools over a kitchen-sink mega-tool.

### 2. Side effects must be explicit and idempotent where possible

- Name tools so side effects are obvious (`create_invoice`, `transfer_sol`, not `handle_payment`).
- Accept an idempotency key or natural unique key for any non-read action.
- Document whether retries are safe.

### 3. Errors are structured and recoverable

Return machine-readable error codes + short human messages:
- `VALIDATION_ERROR` (fix recoverable by fixing args)
- `NOT_FOUND`
- `PERMISSION_DENIED`
- `RATE_LIMITED` (include retry-after when known)
- `TRANSIENT` vs `PERMANENT`
- `NEEDS_USER_CONFIRMATION` for high-impact actions

Never return only a free-form string stack trace as the tool result.

### 4. Progressive disclosure of context

- Tool descriptions stay short (loaded often).
- Large reference material lives in resources loaded only when the tool is selected or when the tool itself returns a pointer.
- Prefer returning summaries + IDs over dumping entire documents into the conversation.

### 5. Least privilege defaults

- Tools should only do what the current task requires.
- Dangerous capabilities (delete, transfer, production deploy) require explicit confirmation steps or separate high-privilege tools that are not always exposed.

### 6. Deterministic enough to test

- Pure/query tools should be snapshot-testable.
- Side-effect tools should be testable with fakes and idempotency assertions.

## Tool Description Pattern

```text
Use this tool when you need <specific outcome>.
Do not use for <nearby but wrong cases>.
Always provide <required disambiguators>.
On success returns <shape>.
On failure returns { error: { code, message, details? } }.
```

## High-Impact Action Pattern

1. Agent proposes action with full parameters.
2. Tool or runtime requires explicit confirmation artifact (user click, signed challenge, or two-phase commit).
3. Only then execute.
4. Return stable receipt ID.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The model will figure out the args" | It will hallucinate. Constrain with schema + good descriptions. |
| "We'll just let it call delete directly" | High-impact tools need confirmation or separation. |
| "Return the whole DB row every time" | Burns context and hides what mattered. Return only what the next step needs. |
| "Retries are the orchestrator's problem" | If the tool is not idempotent, retries create duplicate real-world effects. |

## Red Flags

- Tools with `any` / untyped object parameters
- Side-effect tools with no idempotency story
- Error results that are plain strings only
- One mega-tool that "does everything"
- Descriptions that restate the parameter list without usage guidance
- Always-on exposure of destructive tools

## Verification

- [ ] Every tool has strict schema + clear when-to-use description
- [ ] Side-effect tools document idempotency and confirmation needs
- [ ] Errors use stable codes the agent can branch on
- [ ] Results are minimal but sufficient
- [ ] Destructive capabilities are gated
- [ ] Happy path and validation failure paths are tested
