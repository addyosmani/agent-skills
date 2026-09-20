---
name: langfuse-prompt-migration
description: Migrate hardcoded prompts to Langfuse for version control and deployment-free iteration. Use when user wants to externalize prompts, move prompts to Langfuse, or set up prompt management.
metadata:
  required_access:
    - CODEBASE
    - LANGFUSE_PROJECT_SCRIPT
---

# Langfuse Prompt Migration

Migrate hardcoded prompts into Langfuse-managed prompts. The API mechanics (`create_prompt`, `get_prompt`, `.compile()`, linking to traces) are in the docs — fetch them at execution time.

## Prerequisites

Verify credentials exist — check presence only, never print the secret key (its value would land in the agent's context and transcripts):

```bash
[ -n "$LANGFUSE_PUBLIC_KEY" ] && echo "public key: set" || echo "public key: missing"
[ -n "$LANGFUSE_SECRET_KEY" ] && echo "secret key: set" || echo "secret key: missing"
[ -n "${LANGFUSE_BASE_URL:-${LANGFUSE_HOST:-}}" ] && echo "base url: set" || echo "base url: missing"
```

Use `LANGFUSE_BASE_URL` for current SDKs. If only `LANGFUSE_HOST` is set, export `LANGFUSE_BASE_URL="$LANGFUSE_HOST"`. If a CLI expects `LANGFUSE_HOST` and only `LANGFUSE_BASE_URL` is set, export `LANGFUSE_HOST="$LANGFUSE_BASE_URL"`.

If credentials or the base URL are missing, ask the user to set them in their shell or a `.env` file. Do not ask them to paste secret keys into chat.

## 1. Inventory every prompt (before writing any code)

For each prompt, record:

- **Name**: lowercase, hyphenated (e.g. `chat-assistant`)
- **Source file**: where the prompt text lives
- **Code file to refactor**: the file that USES the prompt. For asset files (`.txt`/`.yaml`/`.md`), this is the file that loads the asset, not the asset itself
- **Type**: `chat` (message array) or `text` (plain string)
- **Variables**: values interpolated in, converted to `{{var}}`
- **Content**: the actual text to upload

Before choosing `text` or `chat`, fetch and follow [Chat vs Text Prompts](https://langfuse.com/docs/prompt-management/data-model#text-vs-chat-prompts). Do not default unrelated prompt flows to one prompt type.

Prompts typically live in OpenAI message arrays, Anthropic system arguments, LangChain prompt templates, Vercel AI system/prompt fields, and raw multi-line strings near LLM calls.

## 2. Convert templating and decide structure

**Variable syntax:** Langfuse substitutes only double-brace `{{var}}`. Convert every single-brace form during upload — `{var}`, `${var}`, f-string `{var}`, `.format(var=...)`, and string concatenation all become `{{var}}`. Uploading `{var}` will silently fail to substitute.

**Complex templates:** Langfuse has no conditionals, loops, or filters. If the code uses them (e.g. Jinja `{% if %}`/`{% for %}`), either pre-compute the value in code and pass a plain `{{variable}}` (recommended), or store the raw template and compile client-side — which loses Playground preview and UI experiments. See https://langfuse.com/docs/prompt-management/features/variables and the [external templating FAQ](https://langfuse.com/faq/all/using-external-templating-libraries).

**What to make a variable vs. keep hardcoded:**

| Make variable | Keep hardcoded |
|---------------|----------------|
| User-specific (`{{user_name}}`) | Output format instructions |
| Dynamic content (`{{context}}`) | Safety guardrails |
| Per-request (`{{query}}`) | Persona / personality |
| Environment-specific (`{{company_name}}`) | Static examples |

**Naming:** lowercase-hyphenated, feature-based (`document-summarizer`), hierarchical for related prompts (`support/triage`), prefix subprompts with `_` (`_base-personality`).

Before extracting subprompts, fetch and follow [Prompt Composability](https://langfuse.com/docs/prompt-management/features/composability). Use composition for the reuse and shared-maintenance cases described there, not merely to decompose one coherent prompt flow.

## 3. Present the plan, then create and refactor

When the user explicitly requests a migration and credentials work, treat that request as authorization to create prompts and refactor the call sites. Present the inventory and plan as a progress update, then continue.

Ask only when a materially different design choice would change behavior, required credentials are unavailable, or destructive cleanup needs approval. Do not stop merely to confirm names, prompt types, or optional tracing.

Then:

- Create the prompts (label migrated prompts `production` — they're already live) and refactor call sites to fetch each prompt from Langfuse and compile its variables in. The SDK calls differ across Python and JS/TS — fetch the current docs: https://langfuse.com/docs/prompt-management/get-started
- Fetch by the `production` label
- If the codebase already has Langfuse tracing (decorators, an instrumented client, or manual spans), link prompts so you can see which version produced each response. See https://langfuse.com/docs/prompt-management/features/link-to-traces

## 4. Verify

- All prompts created with the `production` label; code fetches with `label="production"`
- Variables and subprompts compile without errors
- Application behavior is unchanged
- Generations show the linked prompt in the UI (if tracing enabled)
