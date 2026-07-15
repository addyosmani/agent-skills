'use strict';

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateInvoiceTotal(lineTotals) {
  return roundCurrency(lineTotals.reduce((total, lineTotal) => total + lineTotal, 0));
}

module.exports = { calculateInvoiceTotal };
