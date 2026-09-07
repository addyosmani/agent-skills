# Orders architecture decision context

The orders service currently stores mutable order rows and emits best-effort
webhooks. Auditors need a complete history of state transitions, and support
must be able to reconstruct an order at a prior point in time.

Options discussed:

1. Keep the current model and add an append-only audit table.
2. Adopt event sourcing for orders and build read projections.
3. Use database change-data capture as the audit history.

Event sourcing improves traceability and replay, but adds projection rebuilds,
event versioning, eventual consistency, and operational complexity. The team
has event-stream experience, but the reporting service expects synchronous
reads. The decision applies only to the orders bounded context.
