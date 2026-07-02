---
name: atlas-cloud-integration
description: Integrates Atlas Cloud LLM, image, video, and upload APIs into agent workflows. Use when adding Atlas Cloud support, wiring OpenAI-compatible chat clients to Atlas Cloud, or implementing async media generation with live model/schema discovery.
---

# Atlas Cloud Integration

## Overview

Atlas Cloud exposes two API surfaces that should be treated as separate
interfaces:

- LLM chat: OpenAI-compatible `https://api.atlascloud.ai/v1`
- Media generation: async image/video/upload APIs under `https://api.atlascloud.ai/api/v1`

The reliable integration path is:

1. Read the API key from `ATLASCLOUD_API_KEY`.
2. Fetch the live model list from `GET https://api.atlascloud.ai/api/v1/models`.
3. Filter to models with `display_console: true`.
4. Fetch the selected model's schema URL before building a request body.
5. Submit generation jobs once, then poll the prediction endpoint until a terminal status.

Do not hard-code model IDs, parameter names, prices, or enum values unless the
repository already pins those values as part of its own contract.

## When to Use

Use this skill when:

- Adding Atlas Cloud as an LLM provider behind an existing OpenAI-compatible client.
- Adding image, video, or upload support to a provider abstraction.
- Building an agent skill, CLI command, workflow, or MCP tool that calls Atlas Cloud.
- Reviewing an existing Atlas Cloud integration for stale model IDs or guessed parameters.

Do not use this skill for unrelated model registries, local inference pipelines with no
cloud-provider boundary, or projects where adding a provider would be promotional rather
than functional.

## Integration Workflow

### LLM Chat

If the target project already supports OpenAI-compatible clients, add Atlas Cloud as
configuration rather than inventing a new client:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ATLASCLOUD_API_KEY,
  baseURL: "https://api.atlascloud.ai/v1",
});

const response = await client.chat.completions.create({
  model: modelIdFromConfig,
  messages,
  max_tokens: maxTokens ?? 1024,
});
```

Validate:

- The API key is never committed.
- The provider reads `ATLASCLOUD_API_KEY`.
- Streaming behavior follows the project's existing OpenAI-compatible path.
- Reasoning or long-output models get enough `max_tokens` to avoid empty truncated output.

### Media Generation

For image and video generation, use the async media API:

```typescript
const mediaBaseURL = "https://api.atlascloud.ai/api/v1";

const submit = await fetch(`${mediaBaseURL}/model/generateImage`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.ATLASCLOUD_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model: modelId, prompt, ...schemaCheckedParams }),
});

const predictionId = (await submit.json()).data.id;
```

Then poll:

```typescript
const result = await fetch(`${mediaBaseURL}/model/prediction/${predictionId}`, {
  headers: { Authorization: `Bearer ${process.env.ATLASCLOUD_API_KEY}` },
});
```

Handle terminal statuses explicitly:

- success: `completed`, `succeeded`
- failure: `failed`, `error`, `cancelled`, `canceled`

For upload workflows, call `POST /model/uploadMedia` and pass the returned URL only
to a model schema field that explicitly accepts an input image or media URL.

### Live Discovery

Before writing request bodies:

1. Fetch `https://api.atlascloud.ai/api/v1/models`.
2. Select only `display_console: true` entries.
3. Fetch the chosen entry's `schema` URL.
4. Read `components.schemas.Input.properties`.
5. Send only fields present in that schema.

If the schema does not include a desired field, do not send it. Rename adapters only
when the schema proves the target model expects the alternate name.

## Common Rationalizations

"The example model ID worked last month."

Model catalogs change. Fetch the live list before committing code, docs, tests, or
examples that name a model.

"This is OpenAI-compatible, so media generation can use the chat endpoint."

Only LLM chat uses the OpenAI-compatible base URL. Image, video, and upload flows use
the media API and prediction polling.

"Retrying failed POST requests is harmless."

Generation POST requests can create billable jobs. Retry GET polling requests, but do
not blindly retry submit requests.

"A README mention is enough."

If the target project has a provider, registry, adapter, or config surface, add Atlas
Cloud there first. Documentation should explain a working integration, not substitute
for one.

## Red Flags

- A provider PR only edits README or badges while the project has provider code.
- Model IDs or request parameters are copied from memory instead of live discovery.
- The API key is placed in source, examples, screenshots, fixtures, or lock files.
- Media code posts to `/v1/chat/completions` instead of `/api/v1/model/generateImage`
  or `/api/v1/model/generateVideo`.
- Polling never times out or never handles failed jobs.
- Request bodies send `image_size`, `ratio`, `aspect_ratio`, or `resolution` without
  confirming that the selected model schema accepts that exact field.
- Upload URLs are used as permanent storage instead of temporary generation inputs.

## Verification

Before finishing an Atlas Cloud integration:

1. Confirm the current model IDs came from a live `/api/v1/models` response.
2. Confirm every request field appears in the selected model schema.
3. Run the target project's unit tests or the narrow provider/adapter tests.
4. Run a compile/type check when touching TypeScript, Python packages, Go, Rust, or Java.
5. Exercise the error path for missing `ATLASCLOUD_API_KEY`.
6. Verify media generation code handles `completed`, `succeeded`, `failed`, and timeout states.
7. Confirm no secrets, sponsor text, logo blocks, credits, or partner claims were added unless
   the repository already has an explicit place for that content and the maintainer requested it.
