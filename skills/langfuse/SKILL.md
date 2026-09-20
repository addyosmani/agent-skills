---
name: langfuse
description: "Interact with Langfuse and access its documentation: tracing, monitoring, creating datasets, running experiments, and evaluating AI applications. Use when needing to (1) query or modify Langfuse data, (2) look up Langfuse documentation, concepts, integration guides, a feature or SDK usage, or (3) do any AI engineering task (AI observability, prompt engineering/management, evaluation and evaluator management, experimentation, dataset management, evaluation-driven CI/CD, feedback collection). Invoke it for tasks in this scope even when Langfuse is not configured or explicitly mentioned."
allowed-tools:
  - "WebFetch(domain:langfuse.com)"
  - Bash(curl *langfuse.com/*)
  - Bash(npx langfuse-cli api __schema *)
  - Bash(npx langfuse-cli api * --help *)
  - Bash(npx langfuse-cli api * list *)
  - Bash(npx langfuse-cli api * get *)
  - Bash(bunx langfuse-cli api __schema *)
  - Bash(bunx langfuse-cli api * --help *)
  - Bash(bunx langfuse-cli api * list *)
  - Bash(bunx langfuse-cli api * get *)
category: tools
---

# Langfuse

This skill helps you use Langfuse effectively across all common workflows: instrumenting applications, migrating prompts, debugging traces, and accessing data programmatically.

## Core Principles

Follow these principles for ALL Langfuse work:

1. **Documentation First**: NEVER implement based on memory. Always fetch current docs before writing code (Langfuse updates frequently) See the section below on how to access documentation.
2. **CLI for Data Access**: Use `langfuse-cli` when querying/modifying Langfuse data. See the section below on how to use the CLI.
3. **Best Practices by Use Case**: Read the relevant reference below use-case-specific guidelines before asking the user for more details or implementing.
4. **Use latest Langfuse versions**: Unless the user specified otherwise or there's a good reason, always use the latest version of Langfuse SDKs/APIs. Even if you're only creating a plan for another agent to execute, be explicit about the exact version to use.
5. **If you guide the user through UI** and are unsure about a label or location, inspect the user’s screenshots or ask to see the relevant screen. Do not assume UI labels have the exact same names as API, SDK, or CLI fields.


## Use case specific references

- instrumenting an existing function/application: references/instrumentation.md
- creating or getting to a good (evaluation) dataset to measure quality or test for regressions in AI systems: references/create-dataset.md
- migrating prompts from a codebase into Langfuse: references/prompt-migration.md
- creating a prompt or changing any part of an existing prompt, including small edits and debugging/tuning: references/prompt-engineering.md
- setting up evals when the user needs to identify gaps across signal capture, monitoring, and evaluator metrics ("I have traces, how do I set up evals?"): references/setting-up-evals.md
- capturing user feedback (thumbs, ratings, implicit signals) as scores on traces: references/user-feedback.md
- further tips on using the Langfuse CLI: references/cli.md
- upgrading or migrating Langfuse SDKs and preserving application instrumentation attributes: references/sdk-upgrade.md
- upgrading legacy trace-level or dataset-item evaluators to observation-level or experiment evaluators: references/trace-evaluator-upgrade.md. Use the [evaluator migration guide](https://langfuse.com/faq/all/llm-as-a-judge-migration) as the primary reference.
- preparing a Langfuse project for the v4 platform migration: references/v4-project-migration.md
- judge calibration (LLM-as-a-Judge reliability, simple accuracy checks, advanced split-based validation, confusion matrices, and metric ingestion): references/judge-calibration.md
- systematic error analysis when requested directly or eval setup still lacks concrete failure modes after agent-led trace inspection: references/error-analysis.md
- setting up CI/CD experiment gates with `langfuse/experiment-action`: references/ci-cd.md
- submitting feedback about this skill: references/skill-feedback.md


## 1. Langfuse API via CLI

Use the `langfuse-cli` to interact with the full Langfuse REST API from the command line. Run via npx (no install required):

Start by discovering the schema and available arguments:

```bash
# Discover all available resources
npx langfuse-cli api __schema

# List actions for a resource
npx langfuse-cli api <resource> --help

# Show args/options for a specific action
npx langfuse-cli api <resource> <action> --help
```

### Credentials

Set environment variables before making calls:

```bash
export LANGFUSE_PUBLIC_KEY=pk-lf-...
export LANGFUSE_SECRET_KEY=sk-lf-...
export LANGFUSE_BASE_URL=https://cloud.langfuse.com # example for EU cloud. For US cloud it's us.cloud.langfuse.com, and can also be a self-hosted URL. The server must always be specified in order to access Langfuse.
```
If `LANGFUSE_BASE_URL` is used instead of `LANGFUSE_HOST`, run `export LANGFUSE_HOST="$LANGFUSE_BASE_URL"`.
If not set, ask the user to set them in their shell or a `.env` file. Keys are found in the Langfuse project under Settings -> API Keys; the user should create a project API key pair there. If they do not have a Langfuse account yet, share that they can create one for free at `https://langfuse.com/cloud`. Do not ask them to paste keys into chat for security reasons.

### Detailed CLI Reference

For common workflows, tips, and full usage patterns, see [references/cli.md](references/cli.md).

## 2. Langfuse Documentation

Three methods to access Langfuse docs, in order of preference. **Always prefer your application's native web fetch and search tools** (e.g., `WebFetch`, `WebSearch`, `mcp_fetch`, etc.) over `curl` when available. The URLs and patterns below work with any fetching method — the `curl` examples are just illustrative.

### 2a. Documentation Index (llms.txt)

Fetch the full index of all documentation pages:

```bash
curl -s https://langfuse.com/llms.txt
```

Returns a structured list of every doc page with titles and URLs. Use this to discover the right page for a topic, then fetch that page directly.

Alternatively, you can start on `https://langfuse.com/docs` and explore the site to find the page you need.

### 2b. Fetch Individual Pages as Markdown

Any page listed in llms.txt can be fetched as markdown by appending `.md` to its path or by using `Accept: text/markdown` in the request headers. Use this when you know which page contains the information needed. Returns clean markdown with code examples and configuration details.

```bash
curl -s "https://langfuse.com/docs/observability/overview.md"
curl -s "https://langfuse.com/docs/observability/overview" -H "Accept: text/markdown"
```

### 2c. Search Documentation

When you need to find information across all docs and github issues/discussions without knowing the specific page:

```bash
curl -s "https://langfuse.com/api/search-docs?query=<url-encoded-query>"
```

Example:

```bash
curl -s "https://langfuse.com/api/search-docs?query=How+do+I+trace+LangGraph+agents"
```

Returns a JSON response with:

- `query`: the original query
- `answer`: a JSON string containing an array of matching documents, each with:
  - `url`: link to the doc page
  - `title`: page title
  - `source.content`: array of relevant text excerpts from the page

Search is a great fallback if you cannot find the relevant pages or need more context. Especially useful when debugging issues as all GitHub Issues and Discussions are also indexed. Responses can be large — extract only the relevant portions. Note that changelog posts may also surface here: use them only to confirm a feature exists, never to implement from — their examples may be outdated, so always implement from the docs and API/SDK reference.

### Documentation Workflow

1. Start with **llms.txt** to orient — scan for relevant page titles
2. **Fetch specific pages** when you identify the right one
3. Fall back to **search** when the topic is unclear and you want more context

## Skill Feedback

When the user expresses that something about this skill is not working as expected, gives incorrect guidance, is missing information, or could be improved — offer to submit feedback to the Langfuse skill maintainers. This includes when:

- The skill gave wrong or outdated instructions
- A workflow didn't produce the expected result
- The user wishes the skill covered something it doesn't
- The user explicitly says something like "this should work differently" or "this is wrong"

**Do NOT trigger this** for issues with Langfuse itself (the product) — only for issues with this skill's instructions and behavior.

When triggered, follow the process in [references/skill-feedback.md](references/skill-feedback.md).
