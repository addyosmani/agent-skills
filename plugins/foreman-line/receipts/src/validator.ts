/**
 * `validateReceiptDocument`: schema conformance (ajv, `receiptDocumentSchema`)
 * plus the two single-document semantic invariants (AC4). `validateChain`:
 * the three chain-level invariants (AC5), run over an ordered document array.
 *
 * Both surface every violation in one pass (independent of whether the
 * structural pass succeeded) — the exit-code contract's `1` case (every
 * violation on stderr, not just the first) depends on this.
 *
 * Chain-splice/reorder resistance is deliberately bounded: AC5b checks that a
 * stored `prevHash` string-equals the prior receipt's *stored* `hash` field.
 * It never recomputes that hash from canonical bytes — a coordinated edit
 * that rewrites a receipt's content and consistently patches every
 * downstream `hash`/`prevHash` to match would NOT be caught here. Only pcc's
 * future cryptographic recomputation (`receipt verify`) catches that.
 *
 * Robustness (AC5d, rework amendment): `validateChain` never throws on
 * arbitrary JSON values as members. Exclusion is per-comparison capability,
 * not per-document validity — a member that is not a JSON object, or whose
 * `correlation` is not a JSON object, is excluded from exactly the
 * cross-member comparisons it cannot participate in, and is reported via its
 * per-document schema violations. Adjacency comparisons touching an excluded
 * side are skipped entirely (no bridging across an excluded member).
 * `validateChain([])` is invalid: a chain must contain receipts.
 */
import { Ajv, type SchemaObject } from 'ajv'
import { receiptDocumentSchema } from './schemas.js'
import type { ReceiptDocument } from './types.js'

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

const ajv = new Ajv({ allErrors: true })
const validateStructure = ajv.compile(receiptDocumentSchema as SchemaObject)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** AC4a: `claimRef` is null iff `kind === 'stage'`. */
function checkClaimRefInvariant(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  if (doc.kind === 'stage' && doc.claimRef !== null) {
    errors.push(`claimRef must be null when kind is 'stage', got ${JSON.stringify(doc.claimRef)}`)
  }
  if (doc.kind === 'claim' && doc.claimRef === null) {
    errors.push("claimRef must be non-null when kind is 'claim'")
  }
  return errors
}

/** AC4b: `prevHash === null` iff `sequence === 0`. */
function checkGenesisInvariant(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const { sequence, prevHash } = doc
  if (typeof sequence !== 'number') return errors
  if (sequence === 0 && prevHash !== null) {
    errors.push(
      `prevHash must be null when sequence is 0 (genesis), got ${JSON.stringify(prevHash)}`,
    )
  }
  if (sequence !== 0 && prevHash === null) {
    errors.push(`prevHash must be non-null when sequence is ${sequence} (non-genesis)`)
  }
  return errors
}

export function validateReceiptDocument(doc: unknown): ValidationResult {
  const errors: string[] = []

  const structurallyValid = validateStructure(doc)
  if (!structurallyValid) {
    for (const err of validateStructure.errors ?? []) {
      const path = err.instancePath.length > 0 ? err.instancePath : '(root)'
      errors.push(`${path} ${err.message ?? 'is invalid'}`)
    }
  }

  if (isRecord(doc)) {
    errors.push(...checkClaimRefInvariant(doc))
    errors.push(...checkGenesisInvariant(doc))
  }

  return { valid: errors.length === 0, errors }
}

/**
 * AC5a: sequence values are exactly `0..M-1`, contiguous, no gaps or
 * duplicates — over the M members capable of participating (JSON objects
 * with a numeric `sequence`; coordinator ruling: the range is 0..M-1 over
 * participants, so a stray malformed file never attributes a spurious
 * contiguity violation to the valid members).
 */
function checkSequenceContiguity(docs: readonly unknown[]): string[] {
  const sequences: number[] = []
  for (const doc of docs) {
    if (isRecord(doc) && typeof doc.sequence === 'number') sequences.push(doc.sequence)
  }
  const sorted = [...sequences].sort((a, b) => a - b)
  const contiguous = sorted.every((value, index) => value === index)
  if (!contiguous) {
    return [
      `chain sequence values must be exactly 0..${sequences.length - 1}, contiguous, no gaps or duplicates; found ${JSON.stringify(sequences)}`,
    ]
  }
  return []
}

/**
 * AC5b: prevHash pointer resolution against the prior receipt's stored hash.
 * A non-object member cannot participate: any adjacency comparison touching
 * it is skipped entirely — no bridging to compare across it (coordinator
 * ruling: `prevHash` points to the immediate predecessor only, and the
 * excluded member's schema violations already fail the chain).
 */
function checkPrevHashPointers(docs: readonly unknown[]): string[] {
  const errors: string[] = []
  docs.forEach((doc, index) => {
    if (!isRecord(doc)) return
    if (index === 0) {
      if (doc.prevHash !== null) {
        errors.push(
          `receipts[0].prevHash must be null (genesis), got ${JSON.stringify(doc.prevHash)}`,
        )
      }
      return
    }
    const prev = docs[index - 1]
    if (!isRecord(prev)) return
    if (doc.prevHash !== prev.hash) {
      errors.push(
        `receipts[${index}].prevHash (${JSON.stringify(doc.prevHash)}) does not match receipts[${index - 1}].hash (${JSON.stringify(prev.hash)})`,
      )
    }
  })
  return errors
}

/**
 * AC5c: every receipt shares an identical correlation.workflowId and
 * correlationId. A member whose `correlation` is not a JSON object cannot
 * participate and is excluded; the baseline is the first participating
 * member.
 */
function checkSharedCorrelation(docs: readonly unknown[]): string[] {
  const errors: string[] = []
  const participants: { index: number; correlation: Record<string, unknown> }[] = []
  docs.forEach((doc, index) => {
    if (isRecord(doc) && isRecord(doc.correlation)) {
      participants.push({ index, correlation: doc.correlation })
    }
  })
  const first = participants[0]
  if (first === undefined) return errors
  for (const { index, correlation } of participants) {
    if (
      correlation.workflowId !== first.correlation.workflowId ||
      correlation.correlationId !== first.correlation.correlationId
    ) {
      errors.push(
        `receipts[${index}].correlation.workflowId/correlationId diverges from receipts[${first.index}]'s`,
      )
    }
  }
  return errors
}

export function validateChain(docs: readonly ReceiptDocument[]): ValidationResult {
  if (docs.length === 0) {
    return { valid: false, errors: ['chain contains no receipts'] }
  }

  const errors: string[] = []

  docs.forEach((doc, index) => {
    const result = validateReceiptDocument(doc)
    for (const message of result.errors) {
      errors.push(`receipts[${index}]: ${message}`)
    }
  })

  errors.push(...checkSequenceContiguity(docs))
  errors.push(...checkPrevHashPointers(docs))
  errors.push(...checkSharedCorrelation(docs))

  return { valid: errors.length === 0, errors }
}

/** Derived read (not a stored flag): sealed iff the highest-sequence receipt is stage F. */
export function isSealed(chain: readonly ReceiptDocument[]): boolean {
  if (chain.length === 0) return false
  const highest = chain.reduce((max, doc) => (doc.sequence > max.sequence ? doc : max))
  return highest.stage === 'F'
}
