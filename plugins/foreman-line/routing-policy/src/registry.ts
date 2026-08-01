/**
 * Central registry of every exported routing-policy type and its typed JSON
 * Schema. `generate.ts` serializes these to `schemas/*.json`; the parity test
 * proves the committed files never drift from these typed sources.
 */
import type { SchemaFile } from '../../schema-scaffold/src/registry.js'
import {
  classEntrySchema,
  dataClassificationRuleSchema,
  roleAssignmentSchema,
  routingPolicySchema,
} from './schemas.js'

export type { SchemaFile }

export const allSchemaFiles: readonly SchemaFile[] = [
  { name: 'routing-policy', schema: routingPolicySchema },
  { name: 'class-entry', schema: classEntrySchema },
  { name: 'data-classification-rule', schema: dataClassificationRuleSchema },
  { name: 'role-assignment', schema: roleAssignmentSchema },
]
