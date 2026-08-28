'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { paginate } = require('./pagination');

test('returns the second page for a one-based page number', () => {
  assert.deepEqual(paginate(['a', 'b', 'c', 'd', 'e'], 2, 2), ['c', 'd']);
});
