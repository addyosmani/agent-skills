'use strict';

const CODES = { SAVE10: 10, HALF: 50, ALL: 150 };

/** Total in cents after applying a percentage discount code; unknown codes change nothing. */
function applyDiscount(totalCents, code) {
  const percent = CODES[code];
  if (percent === undefined) return totalCents;
  return Math.max(0, Math.round(totalCents * (1 - percent / 100)));
}

module.exports = { applyDiscount };
