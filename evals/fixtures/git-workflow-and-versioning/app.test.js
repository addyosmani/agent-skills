'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { total } = require('./app');

test('totals item prices', () => {
  assert.equal(total([{ price: 1 }, { price: 2 }]), 3);
});
