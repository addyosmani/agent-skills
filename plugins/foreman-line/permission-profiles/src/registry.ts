/**
 * Central registry of every exported permission-profile type and its typed
 * JSON Schema. `generate.ts` serializes these to `schemas/*.json`; the parity
 * test proves the committed files never drift from these typed sources.
 */
import type { SchemaFile } from '../../schema-scaffold/src/registry.js'
import {
  networkIntentSchema,
  permissionEnvelopeSchema,
  permissionProfileRegistrySchema,
  permissionProfileSchema,
} from './schemas.js'

export type { SchemaFile }

export const allSchemaFiles: readonly SchemaFile[] = [
  { name: 'permission-profile-registry', schema: permissionProfileRegistrySchema },
  { name: 'permission-profile', schema: permissionProfileSchema },
  { name: 'permission-envelope', schema: permissionEnvelopeSchema },
  { name: 'network-intent', schema: networkIntentSchema },
]
