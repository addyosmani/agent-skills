'use strict';

function invoiceTotal(lines) {
  return lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
}

module.exports = { invoiceTotal };
