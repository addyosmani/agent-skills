import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv, type SchemaObject } from 'ajv'
import { type ShadowRoute, type ShadowTaskType, shadowRouteSchema } from '../src/index.js'

test('package entrypoint exports the shadow route schema and public types', () => {
  const taskType: ShadowTaskType = 'spec_lint'
  const route: ShadowRoute = {
    adapter_id: 'cerebras-shadow',
    data_classification: 'public',
    allowed_task_types: [taskType],
    requires_live_discovery: true,
    candidate_only: true,
    authority: 'none',
    tools_granted: [],
    effect_capability: 'none',
    prohibited_roles: ['verifier', 'coordinator'],
  }

  const validate = new Ajv({ allErrors: true }).compile(shadowRouteSchema as SchemaObject)
  assert.equal(validate(route), true, JSON.stringify(validate.errors))
})
