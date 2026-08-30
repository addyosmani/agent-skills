/**
 * Fail-closed dispatch-time execution for policy-governed shadow routes.
 *
 * The host owns adapter discovery and invocation implementations. This module
 * owns the enforceable boundary: immutable exact-request authorization, live
 * discovery on every call, runtime-frozen zero tools/effects/authority, narrow
 * untrusted output validation, pending independent review, and normalized receipts.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type {
  RoutingPolicy,
  ShadowRoute,
  ShadowTaskType,
} from '../../../routing-policy/src/index.js'
import { validatePolicy } from '../../../routing-policy/src/index.js'

const POLICY_REPO_PATH = 'plugins/foreman-line/routing-policy/routing-policy.yaml'
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const SHA256_HEX = /^[a-f0-9]{64}$/

export const SHADOW_LIMITS = {
  publicInputBytes: 65_536,
  candidateBytes: 32_768,
  evidenceRefCount: 64,
  evidenceRefBytes: 2_048,
  authorizationRefBytes: 512,
  reviewerIdBytes: 256,
  parcelIdBytes: 128,
  allowedTaskTypeCount: 16,
  taskTypeBytes: 128,
} as const

export class ShadowRoutingError extends Error {
  readonly code:
    | 'INVALID_INPUT'
    | 'INVALID_PUBLIC_INPUT'
    | 'PUBLIC_INPUT_TOO_LARGE'
    | 'NON_PUBLIC_INPUT'
    | 'PARCEL_AUTHORIZATION_MISMATCH'
    | 'PARCEL_TASK_NOT_AUTHORIZED'
    | 'AUTHORIZATION_VERIFICATION_FAILED'
    | 'INVALID_AUTHORIZATION_RECORD'
    | 'AUTHORIZATION_NOT_PUBLIC'
    | 'AUTHORIZATION_MISMATCH'
    | 'INVALID_REVIEW_BINDING'
    | 'POLICY_UNREADABLE'
    | 'POLICY_INVALID'
    | 'UNKNOWN_SHADOW_ROUTE'
    | 'UNSUPPORTED_TASK'
    | 'ADAPTER_INVOCATION_FAILED'
    | 'INVALID_ADAPTER_OUTPUT'
    | 'RECEIPT_WRITE_FAILED'

  constructor(code: ShadowRoutingError['code'], message: string) {
    super(message)
    this.name = 'ShadowRoutingError'
    this.code = code
  }
}

export interface ParcelShadowAuthorization {
  /** Caller claim only; trusted authority comes from resolveParcelAuthorization. */
  readonly parcelId: string
  readonly authorizationRef: string
  readonly dataClassification: string
  readonly allowedTaskTypes: readonly string[]
  /** SHA-256 of the canonical JSON representation returned by hashShadowPublicInput. */
  readonly publicInputSha256: string
}

/** Narrow authoritative shape returned by the trusted Parcel resolver. */
export interface ResolvedParcelShadowAuthorization {
  readonly parcelId: string
  readonly dataClassification: 'public'
  readonly allowedTaskTypes: readonly string[]
  readonly publicInputSha256: string
}

export interface ShadowRoutingInput {
  readonly workflowId: string
  readonly routeName: string
  readonly taskType: string
  readonly publicInput: unknown
  readonly parcelAuthorization: ParcelShadowAuthorization
  /** A human or agent identity distinct from the shadow adapter. Review starts pending. */
  readonly independentReviewerId: string
}

export interface ShadowInvocationRequest {
  readonly adapterId: string
  readonly taskType: ShadowTaskType
  readonly publicInput: unknown
  readonly parcelId: string
  readonly authorizationRef: string
  readonly candidateOnly: true
  readonly authority: 'none'
  readonly toolsGranted: readonly []
  readonly effectCapability: 'none'
}

export interface ShadowRoutingDependencies {
  /** Resolve an authorization reference from a trusted host-local Parcel authority. */
  readonly resolveParcelAuthorization: (authorizationRef: string) => Promise<unknown>
  /** Must perform fresh host-local discovery; this module never caches its result. */
  readonly discoverAdapter: (adapterId: string) => Promise<unknown>
  /** Owns provider transport. The request cannot carry tools, effects, or authority. */
  readonly invokeAdapter: (request: ShadowInvocationRequest) => Promise<unknown>
}

export interface ShadowRoutingOptions {
  readonly repoRoot?: string
  readonly now?: () => string
}

interface ShadowResultContainment {
  readonly candidateOnly: true
  readonly authority: 'none'
  readonly toolsGranted: readonly []
  readonly effectCapability: 'none'
  readonly gateImpact: 'none'
  readonly approvalImpact: 'none'
  readonly receiptRef: string
}

export interface ShadowSkippedResult extends ShadowResultContainment {
  readonly status: 'skipped'
  readonly reason: 'adapter_not_verified_available'
  readonly reviewImpact: 'none'
}

export interface ShadowCandidateResult extends ShadowResultContainment {
  readonly status: 'candidate'
  readonly candidate: string
  readonly evidenceRefs: readonly string[]
  readonly candidateSha256: string
  readonly reviewImpact: 'pending_independent_review'
  readonly independentReview: {
    readonly required: true
    readonly status: 'pending'
    readonly reviewerId: string
    readonly candidateSha256: string
  }
}

export type ShadowRoutingResult = ShadowSkippedResult | ShadowCandidateResult

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactEnumerableDataKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  if (Object.getOwnPropertySymbols(value).length !== 0) return false
  const actualKeys = Object.getOwnPropertyNames(value).sort()
  const expected = [...expectedKeys].sort()
  if (actualKeys.length !== expected.length) return false
  for (let index = 0; index < expected.length; index += 1) {
    if (actualKeys[index] !== expected[index]) return false
    const descriptor = Object.getOwnPropertyDescriptor(value, expected[index] ?? '')
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      return false
    }
  }
  return true
}

function isDenseArray(value: readonly unknown[]): boolean {
  if (Object.getOwnPropertySymbols(value).length !== 0) return false
  const ownNames = Object.getOwnPropertyNames(value).filter((name) => name !== 'length')
  if (ownNames.length !== value.length) return false
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) return false
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      return false
    }
  }
  return true
}

interface CanonicalBudget {
  bytes: number
  readonly maxBytes: number
}

function chargeCanonicalBudget(budget: CanonicalBudget, fragment: string): void {
  budget.bytes += Buffer.byteLength(fragment, 'utf8')
  if (budget.bytes > budget.maxBytes) {
    throw new ShadowRoutingError(
      'PUBLIC_INPUT_TOO_LARGE',
      `Canonical public input exceeds ${budget.maxBytes} UTF-8 bytes`,
    )
  }
}

function canonicalJson(
  value: unknown,
  ancestors: ReadonlySet<object> = new Set(),
  budget: CanonicalBudget = { bytes: 0, maxBytes: Number.POSITIVE_INFINITY },
): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    if (
      typeof value === 'string' &&
      Buffer.byteLength(value, 'utf8') > budget.maxBytes - budget.bytes
    ) {
      throw new ShadowRoutingError(
        'PUBLIC_INPUT_TOO_LARGE',
        `Canonical public input exceeds ${budget.maxBytes} UTF-8 bytes`,
      )
    }
    const serialized = JSON.stringify(value)
    chargeCanonicalBudget(budget, serialized)
    return serialized
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ShadowRoutingError('INVALID_PUBLIC_INPUT', 'Public input must be finite JSON data')
    }
    const serialized = JSON.stringify(value)
    chargeCanonicalBudget(budget, serialized)
    return serialized
  }
  if (typeof value !== 'object') {
    throw new ShadowRoutingError('INVALID_PUBLIC_INPUT', 'Public input must be JSON data')
  }
  if (ancestors.has(value)) {
    throw new ShadowRoutingError('INVALID_PUBLIC_INPUT', 'Public input must not be cyclic')
  }

  const nextAncestors = new Set(ancestors)
  nextAncestors.add(value)
  if (Array.isArray(value)) {
    const remainingBytes = budget.maxBytes - budget.bytes
    if (Number.isFinite(remainingBytes) && value.length > Math.floor((remainingBytes + 1) / 2)) {
      throw new ShadowRoutingError(
        'PUBLIC_INPUT_TOO_LARGE',
        `Canonical public input exceeds ${budget.maxBytes} UTF-8 bytes`,
      )
    }
    if (!isDenseArray(value)) {
      throw new ShadowRoutingError(
        'INVALID_PUBLIC_INPUT',
        'Public input arrays must be dense JSON arrays without extra properties',
      )
    }
    chargeCanonicalBudget(budget, '[')
    const items: string[] = []
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) chargeCanonicalBudget(budget, ',')
      items.push(canonicalJson(value[index], nextAncestors, budget))
    }
    chargeCanonicalBudget(budget, ']')
    return `[${items.join(',')}]`
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new ShadowRoutingError('INVALID_PUBLIC_INPUT', 'Public input must contain plain objects')
  }
  const record = value as Record<string, unknown>
  const ownNames = Object.getOwnPropertyNames(record)
  if (
    Object.getOwnPropertySymbols(record).length !== 0 ||
    ownNames.some((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(record, key)
      return (
        descriptor === undefined ||
        descriptor.enumerable !== true ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined
      )
    })
  ) {
    throw new ShadowRoutingError(
      'INVALID_PUBLIC_INPUT',
      'Public input objects must contain only enumerable JSON data properties',
    )
  }
  chargeCanonicalBudget(budget, '{')
  const entries: string[] = []
  for (const [index, key] of ownNames.sort().entries()) {
    if (index > 0) chargeCanonicalBudget(budget, ',')
    if (Buffer.byteLength(key, 'utf8') > budget.maxBytes - budget.bytes) {
      throw new ShadowRoutingError(
        'PUBLIC_INPUT_TOO_LARGE',
        `Canonical public input exceeds ${budget.maxBytes} UTF-8 bytes`,
      )
    }
    const serializedKey = JSON.stringify(key)
    chargeCanonicalBudget(budget, serializedKey)
    chargeCanonicalBudget(budget, ':')
    entries.push(`${serializedKey}:${canonicalJson(record[key], nextAncestors, budget)}`)
  }
  chargeCanonicalBudget(budget, '}')
  return `{${entries.join(',')}}`
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function canonicalizeShadowPublicInput(publicInput: unknown): string {
  try {
    return canonicalJson(publicInput, new Set(), {
      bytes: 0,
      maxBytes: SHADOW_LIMITS.publicInputBytes,
    })
  } catch (error) {
    if (error instanceof ShadowRoutingError) throw error
    throw new ShadowRoutingError('INVALID_PUBLIC_INPUT', 'Public input must be canonical JSON data')
  }
}

function deepFreezeJson(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  if (Array.isArray(value)) {
    for (const item of value) deepFreezeJson(item)
  } else {
    for (const key of Object.keys(value)) {
      deepFreezeJson((value as Record<string, unknown>)[key])
    }
  }
  return Object.freeze(value)
}

interface PublicInputSnapshot {
  readonly value: unknown
  readonly sha256: string
}

interface ValidatedParcelClaim {
  readonly parcelId: string
  readonly authorizationRef: string
  readonly dataClassification: 'public'
  readonly allowedTaskTypes: readonly string[]
  readonly publicInputSha256: string
}

interface ValidatedShadowRoutingRequest {
  readonly workflowId: string
  readonly routeName: string
  readonly taskType: string
  readonly publicInput: unknown
  readonly publicInputSha256: string
  readonly parcelAuthorization: ValidatedParcelClaim
  readonly independentReviewerId: string
}

interface ShadowDependencySnapshot {
  readonly resolveParcelAuthorization: (authorizationRef: string) => Promise<unknown>
  readonly discoverAdapter: (adapterId: string) => Promise<unknown>
  readonly invokeAdapter: (request: ShadowInvocationRequest) => Promise<unknown>
}

function snapshotShadowPublicInput(publicInput: unknown): PublicInputSnapshot {
  const canonical = canonicalizeShadowPublicInput(publicInput)
  const value = deepFreezeJson(JSON.parse(canonical) as unknown)
  return Object.freeze({ value, sha256: sha256(canonical) })
}

/**
 * Bind a Parcel authorization to dense canonical JSON, independent of object
 * key order, while enforcing the public-input byte limit.
 */
export function hashShadowPublicInput(publicInput: unknown): string {
  return sha256(canonicalizeShadowPublicInput(publicInput))
}

function requireNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ShadowRoutingError('INVALID_INPUT', `${field} must be a non-empty string`)
  }
}

function requireBoundedString(
  value: unknown,
  field: string,
  maxBytes: number,
): asserts value is string {
  requireNonEmptyString(value, field)
  if (Buffer.byteLength(value, 'utf8') > maxBytes) {
    throw new ShadowRoutingError('INVALID_INPUT', `${field} exceeds ${maxBytes} UTF-8 bytes`)
  }
}

function validateTaskTypes(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > SHADOW_LIMITS.allowedTaskTypeCount ||
    !isDenseArray(value) ||
    !value.every(
      (taskType) =>
        typeof taskType === 'string' &&
        taskType.trim().length > 0 &&
        Buffer.byteLength(taskType, 'utf8') <= SHADOW_LIMITS.taskTypeBytes,
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new ShadowRoutingError(
      'INVALID_INPUT',
      `${field} must contain at most ${SHADOW_LIMITS.allowedTaskTypeCount} unique bounded strings`,
    )
  }
  return value
}

function validatePreDiscoveryInput(input: ShadowRoutingInput): ValidatedShadowRoutingRequest {
  const workflowId = input.workflowId
  const routeName = input.routeName
  const taskType = input.taskType
  const publicInput = input.publicInput
  const independentReviewerId = input.independentReviewerId
  const parcelClaim = input.parcelAuthorization
  const parcelId = parcelClaim.parcelId
  const authorizationRef = parcelClaim.authorizationRef
  const dataClassification = parcelClaim.dataClassification
  const allowedTaskTypes = parcelClaim.allowedTaskTypes
  const claimedInputSha256 = parcelClaim.publicInputSha256

  requireNonEmptyString(workflowId, 'workflowId')
  requireNonEmptyString(routeName, 'routeName')
  requireBoundedString(taskType, 'taskType', SHADOW_LIMITS.taskTypeBytes)
  requireBoundedString(parcelId, 'parcelAuthorization.parcelId', SHADOW_LIMITS.parcelIdBytes)
  requireBoundedString(
    authorizationRef,
    'parcelAuthorization.authorizationRef',
    SHADOW_LIMITS.authorizationRefBytes,
  )
  requireBoundedString(
    independentReviewerId,
    'independentReviewerId',
    SHADOW_LIMITS.reviewerIdBytes,
  )

  if (!SAFE_IDENTIFIER.test(workflowId) || !SAFE_IDENTIFIER.test(routeName)) {
    throw new ShadowRoutingError(
      'INVALID_INPUT',
      'workflowId and routeName must be safe receipt identifiers',
    )
  }
  if (dataClassification !== 'public') {
    throw new ShadowRoutingError(
      'NON_PUBLIC_INPUT',
      'Shadow routing accepts only Parcel-authorized public input',
    )
  }
  const validatedTaskTypes = validateTaskTypes(
    allowedTaskTypes,
    'parcelAuthorization.allowedTaskTypes',
  )
  if (!SHA256_HEX.test(claimedInputSha256)) {
    throw new ShadowRoutingError(
      'PARCEL_AUTHORIZATION_MISMATCH',
      'Parcel public-input authorization digest is invalid',
    )
  }

  const inputSnapshot = snapshotShadowPublicInput(publicInput)
  if (inputSnapshot.sha256 !== claimedInputSha256) {
    throw new ShadowRoutingError(
      'PARCEL_AUTHORIZATION_MISMATCH',
      'Public input does not match the Parcel authorization digest',
    )
  }
  if (independentReviewerId === routeName) {
    throw new ShadowRoutingError(
      'INVALID_REVIEW_BINDING',
      'Independent reviewer must be distinct from the shadow adapter',
    )
  }
  const parcelAuthorization: ValidatedParcelClaim = Object.freeze({
    parcelId,
    authorizationRef,
    dataClassification: 'public',
    allowedTaskTypes: Object.freeze([...validatedTaskTypes]),
    publicInputSha256: claimedInputSha256,
  })
  return Object.freeze({
    workflowId,
    routeName,
    taskType,
    publicInput: inputSnapshot.value,
    publicInputSha256: inputSnapshot.sha256,
    parcelAuthorization,
    independentReviewerId,
  })
}

function snapshotDependencies(dependencies: ShadowRoutingDependencies): ShadowDependencySnapshot {
  const resolveParcelAuthorization = dependencies.resolveParcelAuthorization
  const discoverAdapter = dependencies.discoverAdapter
  const invokeAdapter = dependencies.invokeAdapter
  if (typeof resolveParcelAuthorization !== 'function') {
    throw new ShadowRoutingError(
      'AUTHORIZATION_VERIFICATION_FAILED',
      'Trusted Parcel authorization resolver is required',
    )
  }
  if (typeof discoverAdapter !== 'function' || typeof invokeAdapter !== 'function') {
    throw new ShadowRoutingError(
      'INVALID_INPUT',
      'Shadow discovery and invocation dependencies are required',
    )
  }
  return Object.freeze({ resolveParcelAuthorization, discoverAdapter, invokeAdapter })
}

function parseResolvedAuthorization(value: unknown): ResolvedParcelShadowAuthorization {
  if (
    !isRecord(value) ||
    !hasExactEnumerableDataKeys(value, [
      'parcelId',
      'dataClassification',
      'allowedTaskTypes',
      'publicInputSha256',
    ])
  ) {
    throw new ShadowRoutingError(
      'INVALID_AUTHORIZATION_RECORD',
      'Trusted Parcel resolver returned an invalid authorization record',
    )
  }
  try {
    requireBoundedString(
      value.parcelId,
      'resolvedAuthorization.parcelId',
      SHADOW_LIMITS.parcelIdBytes,
    )
    validateTaskTypes(value.allowedTaskTypes, 'resolvedAuthorization.allowedTaskTypes')
  } catch {
    throw new ShadowRoutingError(
      'INVALID_AUTHORIZATION_RECORD',
      'Trusted Parcel resolver returned an invalid authorization record',
    )
  }
  if (typeof value.dataClassification !== 'string') {
    throw new ShadowRoutingError(
      'INVALID_AUTHORIZATION_RECORD',
      'Trusted Parcel resolver returned an invalid authorization record',
    )
  }
  if (value.dataClassification !== 'public') {
    throw new ShadowRoutingError(
      'AUTHORIZATION_NOT_PUBLIC',
      'Trusted Parcel authorization is not public',
    )
  }
  if (typeof value.publicInputSha256 !== 'string' || !SHA256_HEX.test(value.publicInputSha256)) {
    throw new ShadowRoutingError(
      'INVALID_AUTHORIZATION_RECORD',
      'Trusted Parcel resolver returned an invalid authorization record',
    )
  }
  return value as unknown as ResolvedParcelShadowAuthorization
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((value) => rightSet.has(value))
}

async function verifyParcelAuthorization(
  input: ValidatedShadowRoutingRequest,
  resolveParcelAuthorization: ShadowDependencySnapshot['resolveParcelAuthorization'],
): Promise<ResolvedParcelShadowAuthorization> {
  let rawAuthorization: unknown
  try {
    rawAuthorization = await resolveParcelAuthorization(input.parcelAuthorization.authorizationRef)
  } catch {
    throw new ShadowRoutingError(
      'AUTHORIZATION_VERIFICATION_FAILED',
      'Trusted Parcel authorization resolution failed',
    )
  }
  let authorization: ResolvedParcelShadowAuthorization
  try {
    authorization = parseResolvedAuthorization(rawAuthorization)
  } catch (error) {
    if (error instanceof ShadowRoutingError) throw error
    throw new ShadowRoutingError(
      'INVALID_AUTHORIZATION_RECORD',
      'Trusted Parcel resolver returned an invalid authorization record',
    )
  }
  if (
    authorization.parcelId !== input.parcelAuthorization.parcelId ||
    authorization.dataClassification !== input.parcelAuthorization.dataClassification ||
    authorization.publicInputSha256 !== input.parcelAuthorization.publicInputSha256 ||
    authorization.publicInputSha256 !== input.publicInputSha256 ||
    !sameStringSet(authorization.allowedTaskTypes, input.parcelAuthorization.allowedTaskTypes)
  ) {
    throw new ShadowRoutingError(
      'AUTHORIZATION_MISMATCH',
      'Caller authorization claims do not match the trusted Parcel record',
    )
  }
  return authorization
}

function loadPolicy(repoRoot: string): RoutingPolicy {
  let rawYaml: string
  try {
    rawYaml = readFileSync(join(repoRoot, POLICY_REPO_PATH), 'utf8')
  } catch {
    throw new ShadowRoutingError(
      'POLICY_UNREADABLE',
      `Cannot read routing policy at ${POLICY_REPO_PATH}`,
    )
  }

  let rawPolicy: unknown
  try {
    rawPolicy = parse(rawYaml)
  } catch {
    throw new ShadowRoutingError(
      'POLICY_INVALID',
      `Cannot parse routing policy YAML at ${POLICY_REPO_PATH}`,
    )
  }
  const validation = validatePolicy(rawPolicy)
  if (!validation.valid) {
    throw new ShadowRoutingError(
      'POLICY_INVALID',
      `Routing policy is invalid: ${validation.errors.join('; ')}`,
    )
  }
  return rawPolicy as RoutingPolicy
}

function resolveRoute(policy: RoutingPolicy, input: ValidatedShadowRoutingRequest): ShadowRoute {
  const route = policy.shadow_routes[input.routeName]
  if (route === undefined) {
    throw new ShadowRoutingError(
      'UNKNOWN_SHADOW_ROUTE',
      `Unknown shadow route '${input.routeName}'`,
    )
  }
  if (!route.allowed_task_types.some((taskType) => taskType === input.taskType)) {
    throw new ShadowRoutingError(
      'UNSUPPORTED_TASK',
      `Shadow route '${input.routeName}' does not allow task '${input.taskType}'`,
    )
  }
  if (!input.parcelAuthorization.allowedTaskTypes.some((taskType) => taskType === input.taskType)) {
    throw new ShadowRoutingError(
      'PARCEL_TASK_NOT_AUTHORIZED',
      `Parcel does not authorize shadow task '${input.taskType}'`,
    )
  }
  if (input.independentReviewerId === route.adapter_id) {
    throw new ShadowRoutingError(
      'INVALID_REVIEW_BINDING',
      'Independent reviewer must be distinct from the shadow adapter',
    )
  }
  return route
}

function isVerifiedAvailable(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactEnumerableDataKeys(value, ['status']) &&
    value.status === 'verified_available'
  )
}

function parseCandidate(value: unknown): { candidate: string; evidenceRefs: readonly string[] } {
  if (!isRecord(value)) {
    throw new ShadowRoutingError('INVALID_ADAPTER_OUTPUT', 'Adapter output must be an object')
  }
  if (!hasExactEnumerableDataKeys(value, ['candidate', 'evidence_refs'])) {
    throw new ShadowRoutingError(
      'INVALID_ADAPTER_OUTPUT',
      'Adapter output may contain only candidate and evidence_refs',
    )
  }
  if (typeof value.candidate !== 'string' || value.candidate.trim().length === 0) {
    throw new ShadowRoutingError(
      'INVALID_ADAPTER_OUTPUT',
      'Adapter candidate must be a non-empty string',
    )
  }
  if (Buffer.byteLength(value.candidate, 'utf8') > SHADOW_LIMITS.candidateBytes) {
    throw new ShadowRoutingError(
      'INVALID_ADAPTER_OUTPUT',
      `Adapter candidate exceeds ${SHADOW_LIMITS.candidateBytes} UTF-8 bytes`,
    )
  }
  if (
    !Array.isArray(value.evidence_refs) ||
    value.evidence_refs.length > SHADOW_LIMITS.evidenceRefCount ||
    !isDenseArray(value.evidence_refs) ||
    !value.evidence_refs.every(
      (reference) =>
        typeof reference === 'string' &&
        reference.trim().length > 0 &&
        Buffer.byteLength(reference, 'utf8') <= SHADOW_LIMITS.evidenceRefBytes,
    )
  ) {
    throw new ShadowRoutingError(
      'INVALID_ADAPTER_OUTPUT',
      'Adapter evidence_refs must be an array of non-empty strings',
    )
  }
  return {
    candidate: value.candidate,
    evidenceRefs: Object.freeze([...value.evidence_refs]),
  }
}

function receiptRefFor(input: ValidatedShadowRoutingRequest): string {
  return `docs/receipts/${input.workflowId}/shadow-routing-${input.routeName}.json`
}

function writeReceipt(repoRoot: string, receiptRef: string, receipt: unknown): void {
  try {
    const receiptPath = join(repoRoot, receiptRef)
    mkdirSync(join(repoRoot, 'docs', 'receipts', receiptRef.split('/')[2] ?? ''), {
      recursive: true,
    })
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), 'utf8')
  } catch {
    throw new ShadowRoutingError('RECEIPT_WRITE_FAILED', `Cannot write ${receiptRef}`)
  }
}

const NO_TOOLS = Object.freeze([]) as readonly []

const CONTAINMENT = Object.freeze({
  candidateOnly: true,
  authority: 'none',
  toolsGranted: NO_TOOLS,
  effectCapability: 'none',
  gateImpact: 'none',
  approvalImpact: 'none',
} as const)

/**
 * Execute one optional shadow analysis at dispatch time.
 *
 * This API never performs provider discovery or transport itself; callers must
 * inject host-local operations. Every non-`verified_available` discovery result
 * (including exceptions and malformed data) becomes a normalized skip.
 */
export async function executeShadowRoute(
  input: ShadowRoutingInput,
  dependencies: ShadowRoutingDependencies,
  options: ShadowRoutingOptions = {},
): Promise<ShadowRoutingResult> {
  const requestSnapshot = validatePreDiscoveryInput(input)
  const dependencySnapshot = snapshotDependencies(dependencies)
  const repoRoot = options.repoRoot ?? process.cwd()
  const now = options.now
  await verifyParcelAuthorization(requestSnapshot, dependencySnapshot.resolveParcelAuthorization)
  const policy = loadPolicy(repoRoot)
  const route = resolveRoute(policy, requestSnapshot)
  const receiptRef = receiptRefFor(requestSnapshot)
  const timestamp = now?.() ?? new Date().toISOString()
  const commonReceipt = {
    workflowId: requestSnapshot.workflowId,
    parcelId: requestSnapshot.parcelAuthorization.parcelId,
    authorizationRef: requestSnapshot.parcelAuthorization.authorizationRef,
    routeName: requestSnapshot.routeName,
    adapterId: route.adapter_id,
    taskType: requestSnapshot.taskType,
    dataClassification: 'public',
    publicInputSha256: requestSnapshot.publicInputSha256,
    policyRef: POLICY_REPO_PATH,
    timestamp,
    ...CONTAINMENT,
  }

  let discovery: unknown
  try {
    discovery = await dependencySnapshot.discoverAdapter(route.adapter_id)
  } catch {
    discovery = undefined
  }
  let verifiedAvailable = false
  try {
    verifiedAvailable = isVerifiedAvailable(discovery)
  } catch {
    verifiedAvailable = false
  }
  if (!verifiedAvailable) {
    writeReceipt(repoRoot, receiptRef, {
      ...commonReceipt,
      status: 'skipped',
      reason: 'adapter_not_verified_available',
      discovery: 'not_verified_available',
      reviewImpact: 'none',
    })
    const result: ShadowSkippedResult = {
      status: 'skipped',
      reason: 'adapter_not_verified_available',
      reviewImpact: 'none',
      receiptRef,
      ...CONTAINMENT,
    }
    return Object.freeze(result)
  }

  const request: ShadowInvocationRequest = Object.freeze({
    adapterId: route.adapter_id,
    taskType: requestSnapshot.taskType as ShadowTaskType,
    publicInput: requestSnapshot.publicInput,
    parcelId: requestSnapshot.parcelAuthorization.parcelId,
    authorizationRef: requestSnapshot.parcelAuthorization.authorizationRef,
    candidateOnly: route.candidate_only,
    authority: route.authority,
    toolsGranted: NO_TOOLS,
    effectCapability: route.effect_capability,
  })

  let rawOutput: unknown
  try {
    rawOutput = await dependencySnapshot.invokeAdapter(request)
  } catch {
    throw new ShadowRoutingError(
      'ADAPTER_INVOCATION_FAILED',
      'Shadow adapter invocation failed without producing a candidate',
    )
  }
  let candidate: { candidate: string; evidenceRefs: readonly string[] }
  try {
    candidate = parseCandidate(rawOutput)
  } catch (error) {
    if (error instanceof ShadowRoutingError) throw error
    throw new ShadowRoutingError('INVALID_ADAPTER_OUTPUT', 'Adapter output could not be validated')
  }
  const candidateSha256 = sha256(
    canonicalJson({ candidate: candidate.candidate, evidence_refs: candidate.evidenceRefs }),
  )
  const independentReview = Object.freeze({
    required: true,
    status: 'pending',
    reviewerId: requestSnapshot.independentReviewerId,
    candidateSha256,
  } as const)

  writeReceipt(repoRoot, receiptRef, {
    ...commonReceipt,
    status: 'candidate',
    candidateSha256,
    evidenceRefs: candidate.evidenceRefs,
    reviewImpact: 'pending_independent_review',
    independentReview,
  })

  const result: ShadowCandidateResult = {
    status: 'candidate',
    candidate: candidate.candidate,
    evidenceRefs: candidate.evidenceRefs,
    candidateSha256,
    reviewImpact: 'pending_independent_review',
    independentReview,
    receiptRef,
    ...CONTAINMENT,
  }
  return Object.freeze(result)
}
