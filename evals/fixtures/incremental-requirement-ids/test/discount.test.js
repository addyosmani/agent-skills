'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { applyDiscount } = require('../src/discount');

test('DSC-10: unknown code leaves the total unchanged', () => {
  assert.equal(applyDiscount(1000, 'NOPE'), 1000);
});
