/**
 * Public API for @foreman-line/verification.
 *
 * Current sub-modules:
 *   src/harness/     — deterministic verification harness (Stage D.1, W3-P1)
 *   src/adversarial/ — adversarial reviewer dispatch-and-collect (Stage D.2,
 *                      W3-P2)
 *   src/pipeline/    — verdict assembly + rework routing (Stage D.3, W3-P3)
 *   src/human-gate/  — human review gate + Jira ticket update (Stage D.4,
 *                      W3-P4)
 */

export type {
  AdversarialErrorCode,
  CollectDeps,
  CollectResult,
  GitFn,
  GitResult,
  LaunchDeps,
  LaunchResult,
  ReviewDispatchDeps,
  ReviewDispatchInput,
  ReviewDispatchResult,
  ReviewerLaunchCommand,
  SpawnedProcess,
  SpawnFn,
} from './adversarial/index.js'
export {
  AdversarialError,
  buildReviewerLaunchCommand,
  collectAdversarialFindings,
  dispatchReview,
  emitStopReport,
  generateReviewKickstarter,
  launchReviewer,
  parseAdversarialFindings,
} from './adversarial/index.js'
export type {
  HarnessInput,
  HarnessResult,
  MatrixCheck,
  MatrixCheckResult,
  MatrixCheckSet,
  TestResults,
  VerificationErrorCode,
} from './harness/index.js'
export {
  AC_CONVENTION_PATH,
  allocateSequence,
  recordBuildResult,
  runHarness,
  VerificationError,
} from './harness/index.js'
export type {
  ExecuteHumanGateDeps,
  HumanGateDecision,
  HumanGateErrorCode,
  HumanGateInput,
  HumanGateJiraTransport,
  HumanGatePackage,
  HumanGateResult,
  PrepareHumanGateDeps,
  RetryHalfClosedDeps,
} from './human-gate/index.js'
export {
  assertHumanGateJiraGate,
  createHumanGateJiraAdapter,
  executeHumanGate,
  HumanGateError,
  prepareHumanGate,
  retryHalfClosed,
} from './human-gate/index.js'
export type {
  Disposition,
  EmitVerdictDeps,
  PipelineErrorCode,
  PipelineFsDeps,
  ReverificationPlan,
  ReworkAttemptRecord,
  ReworkKickstarterInput,
  ReworkRoutingInput,
  ReworkRoutingResult,
  RouteReworkDeps,
  VerdictInput,
} from './pipeline/index.js'
export {
  assembleVerdict,
  countReworkAttempts,
  emitVerificationVerdict,
  generateBuildFixKickstarter,
  generateRecoordinationKickstarter,
  PipelineError,
  planReverification,
  routeRework,
} from './pipeline/index.js'
