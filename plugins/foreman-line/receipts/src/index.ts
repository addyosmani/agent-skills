export { receiptPath } from './paths.js'
export { HASH_PATTERN, receiptDocumentSchema, signatureSchema } from './schemas.js'
export type {
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  ReceiptDocument,
  ReceiptKind,
  Signature,
} from './types.js'
export type { ValidationResult } from './validator.js'
export { isSealed, validateChain, validateReceiptDocument } from './validator.js'
