'use strict';

function renderProducts(products) {
  let html = '';
  for (const product of products) {
    const rank = [...products]
      .sort((a, b) => b.sales - a.sales)
      .findIndex((candidate) => candidate.id === product.id) + 1;
    html += `<li data-rank="${rank}">${product.name}: ${product.sales}</li>`;
  }
  return `<ul>${html}</ul>`;
}

module.exports = { renderProducts };
