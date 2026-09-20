---
name: langfuse-sdk-upgrade
description: Upgrade Langfuse SDKs and application instrumentation while preserving trace attributes across observations. Use for Python or JS/TS SDK migrations, including the application side of a v4 platform migration.
metadata:
  required_access:
    - CODEBASE
    - LANGFUSE_PROJECT_SCRIPT
---

# Langfuse SDK upgrade

## Sources of truth

Determine every installed Langfuse SDK major version, then fetch each applicable leaf guide in full before editing:

- [SDK upgrade paths](https://langfuse.com/docs/observability/sdk/upgrade-path)
- [Python v3 to v4](https://langfuse.com/docs/observability/sdk/upgrade-path/python-v3-to-v4)
- [JS/TS v4 to v5](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5)
- [Instrumentation and attribute propagation](https://langfuse.com/docs/observability/sdk/instrumentation#add-attributes)
- [Sessions and session-level metrics](https://langfuse.com/docs/observability/features/sessions)
- [Direct OpenTelemetry ingestion](https://langfuse.com/integrations/native/opentelemetry)

Follow every intermediate guide when the installed version is more than one major behind. Use the current docs for implementation details; do not copy examples from this file.

## Workflow

1. Inventory every SDK, integration package, direct OpenTelemetry exporter, initialization site, instrumentation wrapper, lockfile, worker, script, and test that can emit Langfuse data.
2. Find every source of correlating attributes, including `session_id`/`sessionId`, `user_id`/`userId`, tags, metadata, version, environment, and trace name. Search for the values and surrounding application concepts, not only removed SDK method names.
3. Apply every relevant item from the exact version-specific guides. Preserve each correlating attribute by establishing its documented propagation scope before any observation-producing call that must inherit it.


## Completion report

Report the versions before and after, changed instrumentation paths, attribute sources and propagation scopes, validation performed, inspected trace or session, and any remaining blocked verification.
