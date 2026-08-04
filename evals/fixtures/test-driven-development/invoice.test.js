'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { invoiceTotal } = require('./invoice');

test('totals whole-dollar invoice lines', () => {
  assert.equal(invoiceTotal([
    { quantity: 2, unitPrice: 5 },
    { quantity: 1, unitPrice: 3 },
  ]), 13);
});
