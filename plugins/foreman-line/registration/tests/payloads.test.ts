/**
 * AC5: create schema (Q3/D3). Built payloads match the reference shapes -
 * Epic issuetype 11, Story issuetype 7, Story->Epic via `parent`, required
 * `customfield_14522` = {id:'12817'}, `labels: string[]`, priority omitted
 * (defaults P2). The ids are verified at the live probe (see README), never
 * assumed here.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildCreatePayload,
  EPIC_ISSUETYPE_ID,
  STORY_ISSUETYPE_ID,
  WORK_TYPE_ID,
} from '../src/payloads.js'

test('AC5: Epic payload matches the reference shape (issuetype 11, no parent, no priority)', () => {
  const payload = buildCreatePayload({
    projectKey: 'KONE',
    issuetypeId: EPIC_ISSUETYPE_ID,
    title: 'My Epic',
    stableId: 'epic-demo',
  })
  assert.deepEqual(payload, {
    fields: {
      project: { key: 'KONE' },
      issuetype: { id: '11' },
      summary: '[TEST] [epic-demo] My Epic',
      labels: ['mcp-test'],
      customfield_14522: { id: '12817' },
    },
  })
  assert.equal('parent' in payload.fields, false)
  assert.equal('priority' in payload.fields, false)
})

test('AC5: Story payload matches the reference shape (issuetype 7, parent linkage)', () => {
  const payload = buildCreatePayload({
    projectKey: 'KONE',
    issuetypeId: STORY_ISSUETYPE_ID,
    title: 'My Story',
    stableId: 'demo-story',
    parentKey: 'KONE-1234',
  })
  assert.deepEqual(payload, {
    fields: {
      project: { key: 'KONE' },
      issuetype: { id: '7' },
      summary: '[TEST] [demo-story] My Story',
      labels: ['mcp-test'],
      customfield_14522: { id: '12817' },
      parent: { key: 'KONE-1234' },
    },
  })
})

test('AC5: the reference ids are the ratified constants', () => {
  assert.equal(EPIC_ISSUETYPE_ID, '11')
  assert.equal(STORY_ISSUETYPE_ID, '7')
  assert.equal(WORK_TYPE_ID, '12817')
})
