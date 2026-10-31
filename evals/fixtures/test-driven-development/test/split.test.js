'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { splitCents } = require('../src/split');

test('splits an evenly divisible total into equal shares', () => {
  assert.deepEqual(splitCents(10000, 4), [2500, 2500, 2500, 2500]);
});

test('a single participant receives the whole total', () => {
  assert.deepEqual(splitCents(500, 1), [500]);
});
