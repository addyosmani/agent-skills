// approval-errors.ts — Typed errors for the approval-gate executor.
// Mirrors the errors.ts pattern: callers branch on instanceof, not message text.
//
// NOTE: a *failed verification check* is NOT an error — it is a first-class
// `refuse` decision returned by the gate (see approval-gate.ts). These errors are
// reserved for programmer/config/environment faults (bad git binary, unsafe ref,
// uncanonicalizable input) that prevent a check from even being evaluated. The
// gate catches them and folds them into a fail-closed check result; it never lets
// a thrown error be mistaken for a pass.

export class ApprovalGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A value could not be reduced to RFC 8785 canonical JSON (e.g. NaN/Infinity, cyclic, unsupported type). */
export class CanonicalizationError extends ApprovalGateError {}

/** A git/ssh-keygen invocation failed to run, or a ref failed the safety guard. */
export class GitCommandError extends ApprovalGateError {}

/** The gate was invoked with insufficient/contradictory configuration (e.g. detached method, no detached config). */
export class ApprovalConfigError extends ApprovalGateError {}
