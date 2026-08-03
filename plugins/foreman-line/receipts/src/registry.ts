/**
 * Central registry of every exported receipts type and its typed JSON Schema.
 * `generate.ts` serializes these to `schemas/*.json`; the parity test proves
 * the committed files never drift from these typed sources.
 */
import type { SchemaFile } from '../../schema-scaffold/src/registry.js'
import { receiptDocumentSchema, signatureSchema } from './schemas.js'

export type { SchemaFile }

export const allSchemaFiles: readonly SchemaFile[] = [
  { name: 'receipt-document', schema: receiptDocumentSchema },
  { name: 'signature', schema: signatureSchema },
]
