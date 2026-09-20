---
name: langfuse-observability
description: Instrument LLM applications with Langfuse tracing. Use when setting up Langfuse, adding observability to LLM calls, or auditing existing instrumentation.
metadata:
  required_access:
    - CODEBASE
    - LANGFUSE_PROJECT_SCRIPT
---

# Langfuse Observability

Instrument LLM applications with Langfuse tracing, following best practices and tailored to your use case.

## Workflow

### 1. Assess Current State

Check the project:

- Is Langfuse SDK installed?
- What LLM frameworks are used? (OpenAI SDK, LangChain, LlamaIndex, Vercel AI SDK, etc.)
- Is there existing instrumentation?

**No integration yet:** Set up Langfuse using a framework integration if available. Integrations capture more context automatically and require less code than manual instrumentation.

**Integration exists:** Audit against baseline requirements below.

### 2. Verify Baseline Requirements

Every trace should have these fundamentals:

| Requirement               | Check                                                                                    | Why                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Model name                | Is the LLM model captured?                                                               | Enables model comparison and filtering                 |
| Token usage               | Are input/output tokens tracked?                                                         | Enables automatic cost calculation                     |
| Good trace names          | Are names descriptive? (`chat-response`, not `trace-1`)                                  | Makes traces findable and filterable                   |
| Span hierarchy            | Are multi-step operations nested properly?                                               | Shows which step is slow or failing                    |
| Correct observation types | Are generations marked as generations, and is each other call given its most specific type (`retriever` for a lookup, `agent` for a subagent, etc.) rather than a generic `tool`/`span`? See the [observation types docs](https://langfuse.com/docs/observability/features/observation-types). | Enables model-specific analytics and drives the Agent Graph |
| Sensitive data masked     | Is PII/confidential data excluded or masked?                                             | Prevents data leakage                                  |
| Trace input/output        | Does the trace capture meaningful input/output? Is input explicitly set to show only relevant data (e.g., user message), not all function args? | Makes traces readable in the UI and avoids leaking sensitive args |

Framework integrations (OpenAI, LangChain, etc.) handle model name, tokens, and observation types automatically. Prefer integrations over manual instrumentation.

Docs: https://langfuse.com/docs/tracing

**Beyond the baseline**, add context relevant to the app. Infer from code where possible; only ask when it's not obvious (e.g. how they judge a good vs. bad response, what they'd filter a dashboard by, which user segments they'd compare). These are not baseline — add only what fits.

| If code shows...                                     | Add                 | Why                                                                             |
| ---------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| Conversation history, chat endpoints, message arrays | `session_id`        | Groups conversations — [docs](https://langfuse.com/docs/tracing-features/sessions) |
| User authentication, `user_id` variables             | `user_id`           | User filtering and cost attribution — [docs](https://langfuse.com/docs/tracing-features/users) |
| Multiple distinct endpoints/features                 | `feature` tag       | Per-feature analytics — [docs](https://langfuse.com/docs/tracing-features/tags) |
| Customer/tenant identifiers                          | `customer_tier` tag | Cost/quality breakdown by segment — [docs](https://langfuse.com/docs/tracing-features/tags) |
| Feedback collection, ratings                         | Feedback score      | Quality filtering and trends — [docs](https://langfuse.com/docs/scores/overview) |
| Image/audio/file input or output (e.g. image generation, vision) | Media in observation input/output | Renders media in the UI; base64 data URIs and external URLs are handled automatically, wrap raw bytes/files in `LangfuseMedia`. Follow the [multi-modality docs](https://langfuse.com/docs/observability/features/multi-modality) to implement |

### 3. Run and Self-Audit the Traces (required)

Instrumentation isn't done when the code compiles. This is a loop you own as the agent, it's your responsibility to deliver traces of the highest quality your can produce:

**a.** Execute the instrumented path end-to-end so a trace is actually sent.

**b.** Fetch the trace(s) you just created from Langfuse. Any method works (`langfuse-cli`, REST API, SDK, MCP); the CLI is usually simplest — see [references/cli.md](references/cli.md).

**c.** Audit the trace against the best-practices page. **Always fetch it fresh — never audit from memory, this cannot be skipped** (the guidance changes over time):

https://langfuse.com/docs/observability/best-practices

Ask yourself, for each observation: is all data that a user might need in the future, to understand exactly what context the agent had when it made decisions, available in Langfuse?

**d.** Fix every gap you find, then re-run and re-fetch to confirm. Repeat until the trace clears the guidance. Then report what you audited and changed, and link the final trace.

### 4. Explore Traces With the User

With a clean trace in place, invite the user to explore it in the Langfuse UI:

"Your traces are now appearing in Langfuse. Take a look at a few of them—see what data is being captured, what's useful, and what's missing."

Point them to the relevant views:

- Traces view: individual requests
- Sessions view: grouped conversations (if `session_id` added)
- Dashboard: filtered views using tags
- Scores: filter by quality metrics

This helps them understand what they're getting, spot what's missing, and ask better questions about what to add next.

## Always Explain Why

When suggesting additions, explain the user benefit:

```
"I recommend adding session_id to your traces.

Why: This groups messages from the same conversation together.
You'll be able to see full conversation flows in the Sessions view,
making it much easier to debug multi-turn interactions.

Learn more: https://langfuse.com/docs/tracing-features/sessions"
```

## Multi-agent systems (subagent dispatch)

When one agent's execution dispatches OTHER agents (coding agents like Claude Code/Codex, research agents, orchestrator/worker architectures), a few extra points on top of the baseline:

- **Type a subagent's own execution as `agent`, not `tool`/`span`.** A bare tool/span for a dispatch hides all of the subagent's internal structure; `agent` lets it show up as its own node in the [Agent Graph](https://langfuse.com/docs/observability/features/agent-graphs).
- **Don't emit duplicate dispatch + execution nodes.** Emitting both a `tool`-typed "dispatch" span and a separate `agent`-typed observation for the same subagent, as siblings, double-represents one event. Emit only the `agent` observation when you have the subagent's actual execution; keep a bare tool span only as a fallback when you have no visibility into what the subagent did.
- **Nest recursively.** Nest the subagent's `agent` observation under the `agent` or `span` that orchestrates the dispatch, as a sibling of the `generation` that requested it. Within the subagent, put its generations, tool calls, and nested subagent executions under that subagent's `agent` observation; each tool or nested subagent is a sibling of the generation that requested it, not a child of that generation.
- **Name subagents distinctly.** Frameworks often default every subagent to the same generic role name, making them indistinguishable in the tree and graph (nodes key on name). Derive a specific name from the subagent's actual task/role when the framework doesn't provide one.

## Common Mistakes

| Mistake                                        | Problem                                             | Fix                                                                               |
| ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| No `flush()` in scripts                        | Traces never sent                                   | Call `langfuse.flush()` before exit                                               |
| Flat traces                                    | Can't see which step failed                         | Use nested spans for distinct steps                                               |
| Generic trace names                            | Hard to filter                                      | Use descriptive names: `chat-response`, `doc-summary`                             |
| Logging sensitive data                         | Data leakage risk                                   | Mask PII before tracing                                                           |
| Not explicitly setting input with `@observe`   | All function args become trace input (including API keys, configs) | Python: use `langfuse.update_current_span(input=...)`. JS/TS: use `updateActiveObservation({ input: ... })`. Set only the relevant input (e.g., user message) |
| Manual instrumentation when integration exists | More code, less context                             | Use framework integration                                                         |
| Langfuse import before env vars loaded         | Langfuse initializes with missing/wrong credentials | Import Langfuse AFTER loading environment variables (e.g., after `load_dotenv()`) |
| Wrong import order with OpenAI                 | Langfuse can't patch the OpenAI client              | Import Langfuse and call its setup BEFORE importing OpenAI client                 |
