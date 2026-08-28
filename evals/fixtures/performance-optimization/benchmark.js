'use strict';

const { performance } = require('node:perf_hooks');
const { renderProducts } = require('./products');

const products = Array.from({ length: 1000 }, (_, id) => ({
  id,
  name: `Product ${id}`,
  sales: (id * 7919) % 10000,
}));

const start = performance.now();
const output = renderProducts(products);
const elapsed = performance.now() - start;
console.log(JSON.stringify({ products: products.length, bytes: output.length, elapsedMs: elapsed }));
