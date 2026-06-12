# LLM Integration Checklist

Quick reference for safe, resilient, and testable LLM API integrations. Use alongside the `llm-api-integration` skill.

## Table of Contents

- [Prompt Safety](#prompt-safety)
- [Structured Output](#structured-output)
- [Resilience & Error Handling](#resilience--error-handling)
- [Token & Cost Management](#token--cost-management)
- [Testing](#testing)
- [Common Anti-Patterns](#common-anti-patterns)

## Prompt Safety

- [ ] System instructions are separated from user-provided content
- [ ] User inputs are wrapped in XML tags or unique delimiters (`<user-content>...</user-content>`)
- [ ] Closing delimiter tags inside user input are escaped or stripped
- [ ] Prompts are stored in dedicated template files or modules — not inline inside business logic
- [ ] No secrets, API keys, or internal system details are included in the prompt text
- [ ] Prompts over 20 lines are stored in external files and loaded dynamically

## Structured Output

- [ ] API-native structured output mode is used when available (e.g., Gemini `responseSchema`, OpenAI `response_format`)
- [ ] A schema validation library (Zod, Pydantic, JSON Schema) parses every LLM response before use
- [ ] JSON extraction handles common model quirks (Markdown fences, trailing commas, extra whitespace)
- [ ] Schema validation failures produce actionable error messages with the raw model output for debugging
- [ ] Response types are defined in code (TypeScript interfaces, Python dataclasses) derived from the validation schema

## Resilience & Error Handling

### Retries
- [ ] Exponential backoff is implemented for `429` (rate limit) and `5xx` (server error) responses
- [ ] Jitter (randomized delay) is added to prevent thundering herd on shared rate limits
- [ ] Maximum retry count is capped (recommended: 3 attempts)
- [ ] Non-retriable errors (`400`, `401`, `403`) fail immediately without retries

### Timeouts
- [ ] Client-side timeout is explicitly set (recommended: 10–30 seconds)
- [ ] AbortController (or language equivalent) is used so hung requests are terminated
- [ ] Timeout errors produce a specific, distinguishable error type

### Fallbacks
- [ ] A fallback model is configured for critical paths (e.g., primary: `gpt-4o`, fallback: `gpt-4o-mini`)
- [ ] Fallback triggers after N consecutive failures or a specific error type
- [ ] Fallback usage is logged/alerted so the team knows primary capacity is degraded

## Token & Cost Management

- [ ] Token usage (prompt + completion) is logged per request during development
- [ ] Conversation histories are truncated using a sliding window or summary compression
- [ ] System prompt is measured and optimized — every token costs money and latency
- [ ] Batch requests are used when available to reduce per-call overhead
- [ ] Budget alerts or hard caps are configured in the provider dashboard

## Testing

- [ ] Unit tests mock the API client at the service boundary — no real network calls
- [ ] Mock responses include both valid and malformed JSON to test parser resilience
- [ ] Schema validation edge cases are tested (missing fields, wrong types, extra fields)
- [ ] Retry logic is tested with simulated `429` and `5xx` responses
- [ ] Timeout behavior is tested with delayed or hanging mock responses
- [ ] No API keys or tokens are required to run the test suite

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Concatenating raw user input into the prompt | Prompt injection — user can override system instructions | Wrap user input in XML delimiters and escape closing tags |
| Parsing LLM output with `response.split(":")` or regex | Brittle — breaks when model rephrases or adds whitespace | Use JSON mode + schema validation (Zod/Pydantic) |
| No timeout on LLM API calls | Hung requests exhaust server threads and connection pools | Set explicit client-side timeout with AbortController |
| Using `JSON.parse()` without `try/catch` | Unhandled exception when model outputs invalid JSON | Always wrap in try/catch with a descriptive error |
| Hardcoding a single model with no fallback | Single point of failure — rate limits or outages halt the feature | Configure a fallback model for critical paths |
| Running real API calls in CI/CD tests | Slow, flaky, expensive, requires secrets in CI environment | Mock the API client; test parsing and retry logic separately |
| Logging full prompts with user data | PII exposure in logs, potential compliance violation | Log prompt templates and token counts, not user content |
