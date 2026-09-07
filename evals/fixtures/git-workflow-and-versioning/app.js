'use strict';

function total(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

module.exports = { total };
