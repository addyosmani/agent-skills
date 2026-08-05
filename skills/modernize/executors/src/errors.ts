// errors.ts — Typed errors for the choreography store.
// Callers branch on instanceof rather than parsing messages.

export class TaskStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A run_id was referenced that does not exist. */
export class RunNotFoundError extends TaskStoreError {}

/** A node id was referenced that does not exist. */
export class NodeNotFoundError extends TaskStoreError {}

/** Parent has no remaining spawn budget (spawn_budget_used would exceed total). */
export class BudgetExhaustedError extends TaskStoreError {}

/** Starting the node would exceed runs.max_concurrency for its run. */
export class ConcurrencyCeilingError extends TaskStoreError {}

/** Child depth would exceed runs.max_depth (the dumb fuse). */
export class DepthFuseError extends TaskStoreError {}

/** UNIQUE(run_id, path) violated — a sibling already owns this scope path. */
export class DuplicatePathError extends TaskStoreError {}

/** Requested status transition is not legal (terminal is immutable; started-once). */
export class IllegalTransitionError extends TaskStoreError {}

/** failNode called without a non-empty failure_reason (loud failure, never quiet). */
export class LoudFailureError extends TaskStoreError {}
