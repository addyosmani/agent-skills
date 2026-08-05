import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CoordinatorIdentityError,
  parseCoordinatorIdentity,
} from '../src/auth/coordinator-identity.js'

test('AC2: happy-path parse', () => {
  const result = parseCoordinatorIdentity({ login: 'alice', node_id: 'U_abc123' })
  assert.deepEqual(result, { login: 'alice', nodeId: 'U_abc123' })
})

test('AC3a: null → throws CoordinatorIdentityError', () => {
  assert.throws(() => parseCoordinatorIdentity(null), CoordinatorIdentityError)
})

test('AC3b: string → throws CoordinatorIdentityError', () => {
  assert.throws(() => parseCoordinatorIdentity('string'), CoordinatorIdentityError)
})

test('AC3c: empty login → throws CoordinatorIdentityError', () => {
  assert.throws(
    () => parseCoordinatorIdentity({ login: '', node_id: 'U_x' }),
    CoordinatorIdentityError,
  )
})

test('AC3d: missing node_id → throws CoordinatorIdentityError', () => {
  assert.throws(() => parseCoordinatorIdentity({ login: 'alice' }), CoordinatorIdentityError)
})

test('AC3e: missing login → throws CoordinatorIdentityError', () => {
  assert.throws(() => parseCoordinatorIdentity({ node_id: 'U_x' }), CoordinatorIdentityError)
})

test('AC3f: empty node_id → throws CoordinatorIdentityError', () => {
  assert.throws(
    () => parseCoordinatorIdentity({ login: 'alice', node_id: '' }),
    CoordinatorIdentityError,
  )
})

test('AC4: error name and instanceof', () => {
  try {
    parseCoordinatorIdentity(null)
    assert.fail('should have thrown')
  } catch (err) {
    assert.ok(err instanceof CoordinatorIdentityError)
    assert.equal((err as CoordinatorIdentityError).name, 'CoordinatorIdentityError')
  }
})

test('AC5: extra fields are ignored', () => {
  const result = parseCoordinatorIdentity({ login: 'alice', node_id: 'U_x', extra: 42 })
  assert.deepEqual(result, { login: 'alice', nodeId: 'U_x' })
})
