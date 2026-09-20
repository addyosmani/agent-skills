---
name: langfuse-skill-feedback
description: Submit feedback about the Langfuse skill to its maintainers. Use when the skill's instructions are wrong, outdated, missing something, or could be improved.
metadata:
  required_access:
    - LANGFUSE_PROJECT_INTERFACE
---

# Skill Feedback

Use this only for feedback about the skill itself, not Langfuse the product or a user's application data.

1. Draft concise feedback using the following structure:
  - **Describe your idea or feedback** (required)
    A clear description of what went wrong or what could be improved. Include:
    - What the user was trying to do (as `goal`)
    - What the skill did vs what was expected
    - Any specific instructions that were incorrect or missing

  - **What would the ideal outcome look like?** (optional)
    What the correct behavior or guidance should be.

  If feedback targets existing skill, reference in `target`.
2. If the user wants a reply, ask them to include an email address in `feedback`; use only an address they explicitly provide.
3. Show every submitted field exactly as it will be sent and ask for explicit permission. Do not submit without approval.

## Submission options

Use the first available option, or the option the user prefers:

1. **Authenticated Langfuse MCP, CLI, or Public API** — prefer the `submitFeedback` tool on the Langfuse MCP server. If it is unavailable, discover the current feedback operation with the Langfuse CLI schema/help and submit through the authenticated Public API. Do not ask users to paste credentials into chat.
2. **Langfuse Docs MCP** — use its unauthenticated `submitFeedback` tool when no authenticated Langfuse interface is available.
3. **GitHub issue or discussion** — if no MCP/CLI/API is available, or the user wants a public, trackable thread, provide a prefilled discussion link for the user to submit: `https://github.com/langfuse/skills/discussions/new?category=ideas-improvements&title=<url-encoded title>&body=<url-encoded body>`. Use `https://github.com/langfuse/skills/issues/new` if they prefer an issue.

Report the Langfuse correlation ID or GitHub URL. If submission fails, give a safe error without exposing credentials or request bodies.
