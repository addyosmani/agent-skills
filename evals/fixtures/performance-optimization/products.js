"use strict";

function renderProducts(products) {
  let html = "";

  const sortedProducts = [...products].sort((a, b) => b.sales - a.sales);
  const ranks = new Map();
  for (let i = 0; i < sortedProducts.length; i++) {
    const id = sortedProducts[i].id;
    if (!ranks.has(id)) {
      ranks.set(id, i + 1);
    }
  }

  for (const product of products) {
    const rank = ranks.get(product.id);
    html += `<li data-rank="${rank}">${product.name}: ${product.sales}</li>`;
  }
  return `<ul>${html}</ul>`;
}

module.exports = { renderProducts };
