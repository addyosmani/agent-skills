---
name: langfuse-error-analysis
description: Deep-dive error analysis of an LLM pipeline or AI application using Langfuse traces.
  Use this skill whenever the user wants to understand why their AI system is producing
  bad outputs, where their pipeline is failing, or how to categorise and label failures
  into a taxonomy and decide what to prioritise fixing. Also trigger for "review my
  traces", "my outputs look wrong", "help me debug my LLM app", "I want to analyse
  errors", "build a failure taxonomy", or "what's going wrong with my pipeline".
metadata:
  required_access:
    - LANGFUSE_PROJECT_INTERFACE
---

# Error Analysis

## Primary Guide

**1. Fetch the guide in this blogpost**

https://langfuse.com/guides/cookbook/error-analysis-llm-applications.md

If fetch is not available query for langfuse.com error analysis guide

Read it in full. It defines the authoritative 5-step process (sample selection → open coding → clustering → labelling → deciding what to fix).

**2. Guide the user through this step by step**

You as a coding agent and the user go through this together to perform a full error analysis with their data in Langfuse. Set up the scores, representative sample, and annotation queue for the user, and provide direct UI links wherever their action is required. Be proactive and explain what is happening in plain language without reciting internal step numbers or jargon.

## Rules CRITICAL
- Perform interactions with the user's Langfuse instance yourself rather than telling the user to do them.
- The user performs the open-coding review and supplies human labels; do not do this on their behalf.
- Where a step needs the user's judgment or input, pause and ask before acting.
- Use charts where possible to display data.

---

## Langfuse Implementation Notes

The guide describes the process. These notes cover the Langfuse-specific mechanics required to execute it.

### Credentials

Make sure Langfuse credentials are available before starting — a public key (`pk-lf-...`), a secret key (`sk-lf-...`), and the host (e.g. `https://cloud.langfuse.com` for EU, `https://us.cloud.langfuse.com` for US, `https://jp.cloud.langfuse.com` for JP, or a self-hosted URL). If they aren't configured, ask the user to set them — do not ask them to paste secret values into chat.

Verify you can actually reach the user's project before proceeding. If access fails, stop and ask the user to check their credentials and host.

### Annotation target: OBSERVATION versus TRACE

> **CRITICAL:** In OpenTelemetry-instrumented apps, trace-level `input`/`output` can be null — content often lives in a GENERATION observation. In that case, add the GENERATION observation (not the trace) to the annotation queue, so the content being reviewed is actually visible.

### Annotation queues

> **CRITICAL:** Queues cannot be updated or deleted after creation. Create score configs first, then the queue with all config IDs. To add new configs later, create a new queue.


**Always give the user a direct link immediately after creating a queue:**

| Host | URL pattern |
|------|-------------|
| EU cloud | `https://cloud.langfuse.com/project/<projectId>/annotation-queues/<queueId>` |
| US cloud | `https://us.cloud.langfuse.com/project/<projectId>/annotation-queues/<queueId>` |
| Self-hosted | `<LANGFUSE_BASE_URL>/project/<projectId>/annotation-queues/<queueId>` |

Instruction to give: *"Please open code the first ~50 examples. For each trace, write what you observe in the `open_coding` field (describe behaviour, don't diagnose root causes), then set `pass_fail_assessment` to Pass or Fail."*


### Prompt fixes

When a category warrants a prompt fix, always offer the user two options:
1. Create it as a versioned prompt in Langfuse (tracked, usable via the prompt API)
2. Draft the specific text change for them to review and apply

### Setup evaluators

When a category warrants an evaluator, build it following `references/setting-up-evals.md`.


### Common gotchas

| Mistake | Fix |
|---------|-----|
| Annotating the trace instead of the observation | Target the GENERATION observation, not the trace, when content lives there |
| Creating a score config without checking existing ones | Check existing score configs first; they can't be deleted |
| Queue created before score configs | Create configs → collect IDs → create queue |
| Requesting too many traces at once | Page size is capped (max 100); paginate to get more |
| No rate limiting on bulk queue item creation | Space out requests to avoid hitting rate limits (429) |
