'use strict';

// Tenants on the pre-2024 contract (config.legacyRounding) round tax up.
// TODO: rounding up over-charges by a cent on some totals.
function legacyRound(cents) {
  return Math.ceil(cents);
}

module.exports = { legacyRound };
