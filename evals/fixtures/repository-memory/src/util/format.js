'use strict';

/**
 * Format a numeric amount as a currency string.
 */
function formatAmount(amount, currency = 'EUR') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new Error(`Invalide amount: ${amount}`);
  }
  return `${amount.toFixed(2)} ${currency}`;
}

module.exports = { formatAmount };
