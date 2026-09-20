---
name: langfuse-v4-project-migration
description: Prepare an application and Langfuse project for v4 by upgrading ingestion and API usage, migrating legacy evaluators, and moving exports to the enriched observation schema.
metadata:
  required_access:
    - CODEBASE
    - LANGFUSE_PROJECT_INTERFACE
    - LANGFUSE_PROJECT_SCRIPT
---

# Langfuse v4 project migration

## Sources of truth

Fetch only the pages needed for the surfaces found:

- [V4 overview](https://langfuse.com/docs/v4) and [compatibility](https://langfuse.com/docs/compatibility)
- [SDK upgrade paths](https://langfuse.com/docs/observability/sdk/upgrade-path)
- [Custom ingestion migration](https://langfuse.com/integrations/native/opentelemetry/migration-to-v4)
- [Deprecated API migration](https://langfuse.com/faq/all/deprecated-api-migration)
- [Evaluator migration](https://langfuse.com/faq/all/llm-as-a-judge-migration)
- [Evaluation Rules](https://api.reference.langfuse.com/#tag/unstableevaluationrules) and [Evaluators](https://api.reference.langfuse.com/#tag/unstableevaluators) APIs
- Export migrations: [Blob Storage](https://langfuse.com/docs/api-and-data-platform/features/export-to-blob-storage#upgrade-path), [Mixpanel](https://langfuse.com/integrations/analytics/mixpanel#migrate-export-source), and [PostHog](https://langfuse.com/integrations/analytics/posthog#migrate-export-source)

Discover unstable schemas before use.

## Choose the execution mode

- Confirm the target host and project before project reads or writes. Never request secrets in chat or commit them.
- Prefer an available project interface. Otherwise use the [CLI](https://langfuse.com/docs/api-and-data-platform/features/cli), starting with `api __schema` and action `--help`.
- Without project access, enter **code-only mode**: complete verifiable repository work, do not infer evaluator or export state, and mark every project-dependent result blocked.
- Without codebase access, inspect the project and return an exact code handoff; do not mark repository work ready.

## Migrate the codebase

- Inventory every Langfuse SDK, integration, OTEL exporter, initialization site, lockfile, raw request, generated client, script, notebook, and CI call.
- Upgrade to the latest stable SDK major required by the current docs and apply every applicable breaking change. Record both declared and resolved versions; update an existing lockfile.
- Find every source of correlating attributes, including session and user IDs, tags, metadata, version, environment, and trace name; do not search only for removed SDK methods.
- Put overall input/output on the root observation. Establish the documented propagation scope before observation-producing calls so every applicable child receives the attributes needed for filtering and aggregation, including the session ID on cost-bearing generations.
- For raw `/api/public/ingestion`, use the current Langfuse SDK in Python or JS/TS. For other languages, use the language's native OpenTelemetry API and follow the custom-ingestion guide.
- When replacing synchronous ingestion, assess buffering, retries, flushing, shutdown, and error propagation. Do not claim identical delivery semantics without verification.
- For other deprecated APIs, migrate the path, parameters, pagination, filters, field groups, response parsing, and downstream consumer together using the deprecated-API guide.
- Check self-hosted compatibility before replacing calls; report code targeting a v3 server as blocked on the server upgrade.

## Migrate evaluators

- Inventory all active evaluators and rules, inspect each referenced definition, and report inactive rules without reactivating them.
- Check the Evaluators UI on the confirmed target host for active **Legacy** rows ([open in Langfuse Cloud](https://cloud.langfuse.com/project/~/evals)); public interfaces may not expose every legacy target.
- For each inspected active legacy rule, record its filters, sampling, mappings, representative payloads, one observation or experiment successor, required code changes, and cutover test.
- Label this a **project-verified contract** only when the rule and representative observations were inspected. Label code-only suggestions **candidate targets**, never project state.
- Consolidate all required evaluator variables and filter attributes onto the one target observation. Observation evaluators cannot read siblings or children.
- Create or update the successor disabled, validate it on newly ingested data, obtain approval before enabling it, compare scores and logs, then disable rather than delete the legacy rule.

### Deprecated trace input/output escape hatch

- Default to removing deprecated trace input/output and migrating the evaluator to root-observation input/output.
- Never add or retain `set_current_trace_io()`, `span.set_trace_io()`, `setActiveTraceIO()`, `span.setTraceIO()`, or equivalent compatibility merely because a legacy rule exists or project access is unavailable.
- Offer compatibility only when automatic migration is currently impossible or the user explicitly insists on preserving the legacy evaluator unchanged after being warned that trace input/output is deprecated.
- Even then, require explicit confirmation before changing code, mark the evaluator migration `manual action` or `blocked`, and document the condition for removing the escape hatch. Do not present it as the recommended migration.

## Migrate exports

- Inventory Blob Storage, Mixpanel, PostHog, and other sources in **Project Settings > Integrations**.
- Follow each documented dual-source transition. Enabling dual output is additive; enriched-only stops legacy output and requires explicit downstream-owner confirmation.
- Validate warehouse schemas, paths, joins, dashboards, transformations, alerts, and historical-data handling. Keep every consumer on one shape during dual mode.
- Change only the source; preserve credentials, schedules, prefixes, formats, field groups, and secrets. Report the area `manual action` until downstream consumers are confirmed.

## Validate and report

- Test applicable hierarchy, root input/output, propagated attributes, public/release/environment behavior, API pagination and parsing, delivery semantics, and absence of deprecated calls.
- Before production cutover, send representative traces from the migrated instrumentation to a non-production Langfuse project and inspect the resulting observations there. Mocked tests do not verify backend ingestion or project behavior.
- On a session path, confirm the root and every applicable child observation carry the intended session ID and that session cost includes the cost-bearing children.
- Re-read rules and integrations after writes. Preserve disabled legacy rules for rollback; never claim completion without checking the Evaluators UI on the target host for legacy rows.
- The readiness report must contain exactly these seven rows, each marked `ready`, `changed`, `manual action`, or `blocked`: project access; SDK/instrumentation; trace evaluators; dataset evaluators; direct APIs; exports; verification/rollback.
- In evaluator rows, separate contracts verified against project data from targets suggested only by code inspection. For every row not marked `ready`, include the blocker, next action, and a direct UI link when applicable.
