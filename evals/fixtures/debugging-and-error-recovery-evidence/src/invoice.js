'use strict';

const { legacyRound } = require('./rounding');

// Builds an invoice in integer cents: each line's amount and tax, the
// subtotal, the invoice tax and the total.
function buildInvoice(items, config) {
  const round = config.legacyRounding ? legacyRound : Math.round;
  const lines = items.map((item) => {
    const amount = item.unitCents * item.qty;
    return { amount, tax: round(amount * config.taxRate) };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const tax = lines.reduce((sum, line) => sum + line.tax, 0);
  return { lines, subtotal, tax, total: subtotal + tax };
}

module.exports = { buildInvoice };
