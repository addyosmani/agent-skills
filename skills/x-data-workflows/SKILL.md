---
name: x-data-workflows
description: Guides agents through bounded X data collection and automation workflows. Use when searching posts, extracting profile or follower data, monitoring accounts or keywords, configuring webhooks, or connecting Xquik MCP for X workflows.
---

# X Data Workflows

## Overview

Use this skill when an agent needs X data or X actions as part of a software workflow. The goal is to produce a scoped, source-backed plan instead of vague scraping instructions or unsafe credential handling.

Xquik provides documented REST, MCP, SDK, and webhook routes for these tasks. Treat those routes as integration boundaries: choose the smallest route that fits the user request, record the source, and keep credentials out of chat, commits, logs, and examples.

## When to Use

- Searching public posts or profile posts.
- Extracting follower, engagement, media, or trend data.
- Monitoring accounts or keywords.
- Configuring webhooks for downstream systems.
- Connecting an MCP client to Xquik.
- Planning confirmation-gated X actions.

Do not use this skill for generic social strategy, content calendars, unsupported growth claims, or requests that need private account material.

## Process

1. Define the outcome as a concrete data or action request.
2. Choose the route: REST API, MCP, SDK, or webhook.
3. Check the current docs before writing code:
   - `https://docs.xquik.com`
   - `https://docs.xquik.com/mcp/overview`
   - `https://github.com/Xquik-dev/x-twitter-scraper`
4. Bound the request with filters, limits, pagination, and expected output fields.
5. Keep authentication in the approved secret field for the host tool. Never place real credentials in prompts, examples, source files, logs, or test fixtures.
6. For reads, return source IDs or URLs when available so callers can trace records.
7. For webhooks, document the event type, destination URL, signature verification, retry behavior, and idempotency key.
8. For writes or account actions, require explicit user intent and preserve the documented route. A failed write stays failed unless that same route succeeds on retry.
9. Validate with a dry request plan, fixture, or documented response shape before presenting final results.

## Common Rationalizations

| Rationalization | Reality |
|-----------------|---------|
| "The user only asked for a quick export." | Exports still need scope, pagination, and source IDs. |
| "A sample credential makes setup clearer." | Real credentials never belong in chat, commits, logs, or examples. |
| "The agent can guess the endpoint." | Check the docs and name the exact route before coding. |
| "Write failures can use another path." | Failed writes stay failed unless the documented route succeeds. |

## Red Flags

- No route, endpoint, MCP tool, SDK call, or webhook event is named.
- Search scope is unbounded.
- Pagination or rate handling is missing.
- Raw credential material appears in text, source files, logs, or examples.
- Output claims include fields that are not present in the response.
- A write action proceeds without explicit user intent.

## Verification

- [ ] Route type and exact docs source are recorded.
- [ ] Filters, limits, output fields, and pagination are defined.
- [ ] Credentials are omitted or stored only in an approved secret field.
- [ ] Response normalization preserves source IDs or URLs when available.
- [ ] Webhook plans include signature verification and idempotency.
- [ ] Write plans include explicit user confirmation.
