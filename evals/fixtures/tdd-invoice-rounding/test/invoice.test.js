'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInvoiceTotal } = require('../src/invoice');

test('sums invoice line totals', () => {
  assert.equal(calculateInvoiceTotal([12.5, 7.25]), 19.75);
});
