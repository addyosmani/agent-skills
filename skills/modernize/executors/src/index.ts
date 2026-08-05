// index.ts — public surface of @modernize/executors (grows as #3–#5 land).

// #1 — node-tree store
export { TaskStore } from './task-store.js';
export type { TaskStoreOptions } from './task-store.js';
export { loadDdl, findDdlPath } from './ddl.js';
export { newId } from './ids.js';
export * from './errors.js';
export type * from './types.js';

// #2 — choreography spine
export { InMemoryPresenceStore } from './presence.js';
export type { PresenceStore } from './presence.js';
export { createRedisPresenceStore } from './presence-redis.js';
export type { RedisPresenceOptions } from './presence-redis.js';
export { Watcher, startWatchLoop } from './watcher.js';
export type { InvestigateFlag, WatchLoopHandle, WatchLoopOptions } from './watcher.js';
export { checkPhase, checkAllPhases, isTreeComplete } from './coverage.js';
export type { PhaseCoverage } from './coverage.js';

// #3 — approval gate (Phase II -> III/IV wall)
export { ApprovalGate, verifyApproval, writeApprovalReceipt } from './approval-gate.js';
export type {
  ApprovalVerification,
  ApprovalChecks,
  CheckResult,
  CheckStatus,
  VerifyApprovalInput,
  DiscoveryCoverageResult,
  DetachedVerifyConfig,
  ApprovalGateConfig,
  GateVerifyArgs,
} from './approval-gate.js';
export { canonicalize } from './canonical-json.js';
export { sha256Hex, manifestHash, contractContentHash } from './approval-hash.js';
export type { ApprovalBlock, ApprovalAnchor, ApprovalMethod, ContractEntry, ManifestLike } from './approval-hash.js';
export { validateApprovalBlock, asApprovalBlock } from './approval-schema.js';
export type { ApprovalSchemaResult } from './approval-schema.js';
export { ChildProcessGitVerifier, extractManifestHash } from './git-verifier.js';
export type { GitVerifier, GitVerifyResult } from './git-verifier.js';
export { ApprovalGateError, CanonicalizationError, GitCommandError, ApprovalConfigError } from './approval-errors.js';

// #4 — claim tier (Phase V release gate)
export { computeClaim, releaseBlocked, writeClaimReceipt, ClaimEmitError } from './claim-tier.js';
export type {
  ClaimTier,
  Stratum,
  GapKind,
  ReconciliationInput,
  StratumInput,
  ContractSampleInput,
  ComputeClaimInput,
  CoverageRow,
  ClaimEvidence,
  Gap,
  ClaimReconciliation,
  ClaimBlock,
} from './claim-tier.js';
export { validateClaim, asClaimBlock } from './claim-schema.js';
export type { ClaimSchemaResult } from './claim-schema.js';
export { renderDefensibility, writeDefensibility } from './defensibility.js';
export type { DefensibilityOptions } from './defensibility.js';
