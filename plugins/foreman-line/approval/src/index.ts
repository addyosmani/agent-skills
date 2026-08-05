/**
 * Public surface of the Foreman Line Human Approval Flow package (W1-P3).
 * `ShapingResult`, `CorrelationContext`, `ReceiptRef`, `ReceiptDocument` and
 * the frozen schemas are NOT re-exported here - they are owned by the
 * frozen `contracts`/`receipts` packages and imported from there directly,
 * same precedent as `shaping`/`projection`. No CLI class is exported; the
 * CLI entry point is `src/cli.ts` (the `approval` bin), invoked as a
 * process, not a library call - same shape as `receipts`/`routing-policy`.
 */
export {
  APPROVAL_RECORD_SUFFIX,
  type ApprovalRecord,
  approvalRecordPath,
  writeApprovalRecord,
} from './approval-record.js'
export { type PerformApprovalResult, performApproval } from './approve-flow.js'
export {
  canonicalize,
  type JsonArray,
  type JsonObject,
  type JsonPrimitive,
  type JsonValue,
} from './canonical.js'
export {
  confirmationMatches,
  isInteractiveTty,
  promptForConfirmation,
} from './confirm.js'
export { generateCorrelationContext } from './correlation.js'
export { sha256Hex } from './hash.js'
export { ACTIVE_SPECS_DIR, DEFAULT_REPO_ROOT } from './paths.js'
export { type MintedReceipt, mintGenesisReceipt, RECEIPT_SCHEMA_VERSION } from './receipt.js'
export { writeReceiptDocument } from './receipt-writer.js'
export {
  REJECTION_RECORD_SUFFIX,
  type RejectionRecord,
  rejectionRecordPath,
  writeRejectionRecord,
} from './rejection-record.js'
export { renderTree } from './render.js'
export {
  PROJECTED_SUFFIX,
  type ResolvedArtifact,
  type ResolveOptions,
  resolveArtifact,
  SHAPING_RESULT_SUFFIX,
} from './resolve-input.js'
export { assertSafeSlug } from './slug-guard.js'
export {
  type ApprovalSubject,
  type ComputedSubject,
  computeApprovalSubject,
  computeSpecSet,
  type SpecSetEntry,
} from './subject.js'
