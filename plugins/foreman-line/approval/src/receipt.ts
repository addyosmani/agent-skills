/**
 * Receipt mechanics (coordinator ruling Q4, "one document, both roles"):
 * exactly one `ReceiptDocument` is minted at approval - the genesis IS the
 * Stage-A receipt. Per W0-P4 chain semantics, `sequence: 0` / `prevHash: null`
 * is the genesis, minted at Stage A. `hash = sha256Hex(canonicalize(<this
 * document with the \`hash\` key removed>))`, mirroring the shipped
 * `receipts` package's hash domain exactly (parity-pinned via
 * `tests/canonical-parity.test.ts`). Stored at the W0-P4 locator built by the
 * shipped `receiptPath(workflowId, 0, 'A', 'ShapingResult')`. The minted
 * document is validated with the shipped `validateReceiptDocument` before it
 * is returned for writing.
 */
import type { CorrelationContext, ReceiptRef } from '../../contracts/src/index.js'
import {
  type ReceiptDocument,
  receiptPath,
  validateReceiptDocument,
} from '../../receipts/src/index.js'
import { canonicalize, type JsonValue } from './canonical.js'
import { sha256Hex } from './hash.js'

/**
 * Schema-version literal for minted documents this wave. The shipped
 * `receiptDocumentSchema` only requires a non-empty string; `"1"` matches the
 * convention of the receipts package's own frozen worked-vector fixture
 * (`tests/fixtures/hash-vector-genesis.json`).
 */
export const RECEIPT_SCHEMA_VERSION = '1'

export interface MintedReceipt {
  readonly document: ReceiptDocument
  readonly ref: ReceiptRef
}

/**
 * Mint the genesis / Stage-A `ReceiptDocument` for `subject` (the approval
 * subject manifest, including `approvedHash`), keyed by `correlation`.
 * `subject` is not deep-validated against a stage schema here (`ReceiptDocument.subject`
 * is a free-form `JsonValue` by the shipped `receipts` contract - see its
 * README's "NOT deep-validated here" note); it must already be a plain,
 * JSON-serializable value. Throws if the minted document fails
 * `validateReceiptDocument`.
 */
export function mintGenesisReceipt(
  correlation: CorrelationContext,
  subject: unknown,
  timestamp: string,
): MintedReceipt {
  const draft = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: 'stage' as const,
    stage: 'A' as const,
    claimRef: null,
    correlation,
    sequence: 0,
    prevHash: null,
    timestamp,
    subjectKind: 'ShapingResult',
    subject,
    signature: null,
  }
  const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
  const document = { ...draft, hash } as unknown as ReceiptDocument

  const result = validateReceiptDocument(document)
  if (!result.valid) {
    throw new Error(
      `mintGenesisReceipt: minted document fails validateReceiptDocument: ${result.errors.join('; ')}`,
    )
  }

  const locator = receiptPath(correlation.workflowId, 0, 'A', 'ShapingResult')
  const ref: ReceiptRef = { hash, locator }
  return { document, ref }
}
