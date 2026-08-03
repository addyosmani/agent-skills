/**
 * Model routing evaluation engine (W2-P3).
 *
 * Loads and validates the frozen routing-policy.yaml, runtime-validates the
 * caller-supplied routing_class and data_classification strings, intersects
 * the class allowlist tiers with the data_classification eligible model set to
 * resolve a single concrete model ID, writes a routing receipt, and returns
 * { resolvedModelId, resolvedTier, routingDecisionRef }.
 *
 * Pure evaluation: no network calls, no MCP, no Jira. Fully deterministic.
 *
 * Linear-time string ops (lesson #19): class names, model IDs, and tier names
 * are validated with Set membership checks (===), never with regex over
 * runtime-variable strings.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type {
  ClassName,
  DataClassificationTier,
  RoutingPolicy,
} from '../../../routing-policy/src/index.js'
import {
  CLASS_NAMES,
  DATA_CLASSIFICATION_TIERS,
  validatePolicy,
} from '../../../routing-policy/src/index.js'

// ─── Error class ──────────────────────────────────────────────────────────────

export class RoutingError extends Error {
  readonly code:
    | 'UNKNOWN_CLASS'
    | 'UNKNOWN_DATA_CLASSIFICATION'
    | 'NO_ELIGIBLE_MODEL'
    | 'POLICY_INVALID'
    | 'POLICY_UNREADABLE'
    | 'RECEIPT_WRITE_FAILED'

  constructor(code: RoutingError['code'], message: string) {
    super(message)
    this.name = 'RoutingError'
    this.code = code
  }
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface RoutingInput {
  /** String from spec frontmatter; validated at runtime against CLASS_NAMES. */
  readonly routing_class: string
  /** String from spec frontmatter; validated at runtime against DATA_CLASSIFICATION_TIERS. */
  readonly data_classification: string
  /** Unique identifier for this workflow; used as the receipt directory name. */
  readonly workflowId: string
}

export interface RoutingResult {
  /** The single resolved concrete model ID (e.g. 'claude-sonnet-5'). */
  readonly resolvedModelId: string
  /** The policy tier that produced the resolved model (e.g. 'standard'). */
  readonly resolvedTier: string
  /** Repo-relative path to the written routing receipt JSON. */
  readonly routingDecisionRef: string
}

export interface RoutingOptions {
  /**
   * Absolute path to the repository root. All file operations (policy read,
   * receipt write) resolve relative to this path.
   * Defaults to process.cwd(). Tests pass a tmp directory.
   */
  readonly repoRoot?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLICY_REPO_PATH = 'plugins/foreman-line/routing-policy/routing-policy.yaml'

// ─── Evaluation ──────────────────────────────────────────────────────────────

export function evaluateRouting(input: RoutingInput, options: RoutingOptions = {}): RoutingResult {
  const repoRoot = options.repoRoot ?? process.cwd()

  // 1. Load the frozen policy YAML
  let rawYaml: string
  try {
    rawYaml = readFileSync(join(repoRoot, POLICY_REPO_PATH), 'utf8')
  } catch (err) {
    throw new RoutingError(
      'POLICY_UNREADABLE',
      `Cannot read routing policy at ${POLICY_REPO_PATH}: ${String(err)}`,
    )
  }

  // 1b. Parse the YAML — yaml package throws YAMLParseError on malformed input
  let rawPolicy: unknown
  try {
    rawPolicy = parse(rawYaml)
  } catch (err) {
    throw new RoutingError(
      'POLICY_INVALID',
      `Cannot parse routing policy YAML at ${POLICY_REPO_PATH}: ${String(err)}`,
    )
  }

  // 2. Validate with validatePolicy; throw POLICY_INVALID if invalid
  const validation = validatePolicy(rawPolicy)
  if (!validation.valid) {
    throw new RoutingError(
      'POLICY_INVALID',
      `Routing policy is invalid: ${validation.errors.join('; ')}`,
    )
  }
  const policy = rawPolicy as RoutingPolicy

  // 3. Runtime-validate routing_class — Set membership check (no regex)
  const classNamesSet = new Set<string>(CLASS_NAMES)
  if (!classNamesSet.has(input.routing_class)) {
    throw new RoutingError(
      'UNKNOWN_CLASS',
      `Unknown routing_class: '${input.routing_class}'. Valid classes: ${CLASS_NAMES.join(', ')}`,
    )
  }

  // 4. Runtime-validate data_classification — Set membership check (no regex)
  const dataTiersSet = new Set<string>(DATA_CLASSIFICATION_TIERS)
  if (!dataTiersSet.has(input.data_classification)) {
    throw new RoutingError(
      'UNKNOWN_DATA_CLASSIFICATION',
      `Unknown data_classification: '${input.data_classification}'. Valid tiers: ${DATA_CLASSIFICATION_TIERS.join(', ')}`,
    )
  }

  const routingClass = input.routing_class as ClassName
  const dataClassification = input.data_classification as DataClassificationTier

  // 5. Get class entry (noUncheckedIndexedAccess: guard against missing entry post-validation)
  const classEntry = policy.classes[routingClass]
  if (classEntry === undefined) {
    throw new RoutingError(
      'POLICY_INVALID',
      `Policy missing class entry for '${routingClass}' despite passing validation`,
    )
  }

  // 6. Build eligible model set — O(1) lookup per model (linear-time intersection)
  const dataClassRule = policy.data_classification[dataClassification]
  if (dataClassRule === undefined) {
    throw new RoutingError(
      'POLICY_INVALID',
      `Policy missing data_classification entry for '${dataClassification}' despite passing validation`,
    )
  }
  const eligible = new Set(dataClassRule.eligible_models)

  // 7. Walk allowlist tiers in policy order; find first eligible model
  let resolvedModelId: string | undefined
  let resolvedTier: string | undefined

  for (const tier of classEntry.allowlist) {
    const tierModels = policy.model_tiers[tier] ?? []
    for (const model of tierModels) {
      if (eligible.has(model)) {
        resolvedModelId = model
        resolvedTier = tier
        break
      }
    }
    if (resolvedModelId !== undefined) break
  }

  // 8. No eligible model found across all tiers
  if (resolvedModelId === undefined || resolvedTier === undefined) {
    throw new RoutingError(
      'NO_ELIGIBLE_MODEL',
      `No eligible model found for routing_class '${input.routing_class}' with data_classification '${input.data_classification}'`,
    )
  }

  // Write routing receipt — mkdirSync with recursive:true handles pre-existing dirs;
  // both calls are wrapped so ENOSPC/EACCES/ENAMETOOLONG surface as RoutingError
  const receiptDir = join(repoRoot, 'docs', 'receipts', input.workflowId)
  const receipt = {
    workflowId: input.workflowId,
    routing_class: input.routing_class,
    data_classification: input.data_classification,
    resolvedTier,
    resolvedModelId,
    timestamp: new Date().toISOString(),
    policyRef: POLICY_REPO_PATH,
  }
  try {
    mkdirSync(receiptDir, { recursive: true })
    writeFileSync(join(receiptDir, 'routing-decision.json'), JSON.stringify(receipt, null, 2))
  } catch (err) {
    throw new RoutingError(
      'RECEIPT_WRITE_FAILED',
      `Cannot write routing receipt to ${receiptDir}: ${String(err)}`,
    )
  }

  return {
    resolvedModelId,
    resolvedTier,
    routingDecisionRef: `docs/receipts/${input.workflowId}/routing-decision.json`,
  }
}
