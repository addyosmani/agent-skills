/**
 * Public surface of the Foreman Line Stage-E Integration package (W4-P1).
 * Three testable outputs: the PR-automation planner, the branch-protection
 * posture verifier, and the Stage-E `ReceiptDocument` emitter. All git/gh/
 * effective-rules effects are injected seams (default = real, tests = mock);
 * `IntegrationError` is the package's typed error class.
 */
export {
  type AuditTriggerDecision,
  type DeriveRiskResult,
  deriveRisk,
  type EvaluateAuditTriggerInput,
  evaluateAuditTrigger,
  maxRisk,
  type RiskLevel,
  riskAtLeast,
  riskLessThan,
  toAuditTriggerEvaluation,
} from './audit-trigger.js'
// --- auth ---
export {
  type CoordinatorIdentity,
  CoordinatorIdentityError,
  parseCoordinatorIdentity,
} from './auth/coordinator-identity.js'
export {
  type BranchProtectionVerdict,
  type BypassActor,
  type EffectiveRule,
  type EffectiveRulesResponse,
  type FetchEffectiveRulesFn,
  fetchEffectiveRulesLive,
  verifyBranchProtectionPosture,
} from './branch-protection.js'
export {
  assertClosureJiraGate,
  ClosureError,
  type ClosureErrorCode,
  type ClosureInput,
  type ClosureJiraTransport,
  type ClosurePackage,
  type ClosureResult,
  createClosureJiraAdapter,
  type ExecuteClosureDeps,
  executeClosure,
  type LoadedReceipt,
  type LoadReceiptChainFn,
  type PrepareClosureDeps,
  prepareClosure,
  retryHalfClosedClosure,
} from './closure.js'
export { type EmitClosureReceiptArgs, emitClosureReceipt } from './closure-receipt.js'
export {
  type DocSpineAuditReport,
  type DocSpineClaimFinding,
  type DocSpineDocFinding,
  type DocSpineHookResult,
  type DocSpineHookSeams,
  type DocSpineRunVerifyFn,
  runDocSpineHook,
} from './docspine-hook.js'
export type { DocSpineReportSeams } from './docspine-report.js'
export {
  composeEffectiveRules,
  EffectiveRulesNormalizationError,
  normalizeEffectiveRules,
  normalizeRulesetBypass,
} from './effective-rules.js'
export { IntegrationError } from './errors.js'
export {
  ExitVehicleError,
  formatPrRef,
  type LoadedChainTip,
  loadChainTip,
  type ParsedPrRef,
  parsePrRef,
  type RunStageEArgs,
  type RunStageFArgs,
  runStageE,
  runStageF,
} from './exit-vehicle.js'
export {
  type BranchProtectionDiff,
  buildBranchProtectionDiff,
  type CandidateCheck,
  composeRequiredChecks,
  type RequiredCheckComposition,
} from './gate-assembly.js'
export {
  type ActiveSpecDescriptor,
  evaluateChangeSet,
  type GoverningSpecResolution,
  type LoadActiveSpecsFn,
  loadActiveSpecsLive,
  matchesSurface,
  resolveGoverningSpec,
} from './governing-spec.js'
export {
  buildPrAutomationPlan,
  type GhPrCreateArgs,
  type GhPrCreateFn,
  type GhPrCreateResult,
  type GitPushArgs,
  type GitPushFn,
  type GitPushResult,
  type PlannedOperation,
  type PrAutomationInput,
  type PrAutomationPlan,
  type PrAutomationResult,
  type PrAutomationSeams,
  planPrAutomation,
} from './pr-plan.js'
export {
  type EmitIntegrationReceiptArgs,
  emitIntegrationReceipt,
  type WriteReceiptFn,
} from './receipt.js'
export { type ReportResult, type ReportSeams, runReport } from './report.js'
