/**
 * Shared schema-file shape: the `SchemaFile` interface every consumer's own
 * registry.ts is typed against. Carries no consumer-specific data - each
 * consumer keeps its own `allSchemaFiles`. See README.md for the exact
 * extraction boundary and which per-package files this replaces.
 */
import type { SchemaObject } from 'ajv'

export interface SchemaFile {
  /** Committed schema file base name (`schemas/<name>.schema.json`). */
  readonly name: string
  /** The typed JSON Schema; serialized verbatim to the committed file. */
  readonly schema: SchemaObject
}
