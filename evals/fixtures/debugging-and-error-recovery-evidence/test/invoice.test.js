'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildInvoice } = require('../src/invoice');

const acme = { taxRate: 0.05, legacyRounding: false };

test('a single line is taxed at the tenant rate', () => {
  const invoice = buildInvoice([{ unitCents: 1000, qty: 1 }], acme);
  assert.equal(invoice.subtotal, 1000);
  assert.equal(invoice.tax, 50);
  assert.equal(invoice.total, 1050);
});

test('each line shows its own tax', () => {
  const invoice = buildInvoice([{ unitCents: 1000, qty: 2 }, { unitCents: 400, qty: 1 }], acme);
  assert.deepEqual(invoice.lines.map((line) => line.tax), [100, 20]);
});

test('legacy rounding rounds tax up', () => {
  const invoice = buildInvoice([{ unitCents: 110, qty: 1 }], { taxRate: 0.05, legacyRounding: true });
  assert.equal(invoice.tax, 6);
});
