/**
 * Central registry of every exported skill-injection type and its typed
 * JSON Schema. `generate.ts` serializes these to `schemas/*.json`; the
 * parity test proves the committed files never drift from these typed
 * sources.
 */
import type { SchemaFile } from '../../schema-scaffold/src/registry.js'
import {
  coordinatorSkillsSchema,
  integrationSkillsSchema,
  roleSkillMapSchema,
  skillInjectionMatrixSchema,
} from './schemas.js'

export type { SchemaFile }

export const allSchemaFiles: readonly SchemaFile[] = [
  { name: 'skill-injection-matrix', schema: skillInjectionMatrixSchema },
  { name: 'role-skill-map', schema: roleSkillMapSchema },
  { name: 'coordinator-skills', schema: coordinatorSkillsSchema },
  { name: 'integration-skills', schema: integrationSkillsSchema },
]
