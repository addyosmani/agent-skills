# invoicing

Builds an invoice from line items for a tenant. All amounts are integer cents.

```js
const { buildInvoice } = require('./src/invoice');
buildInvoice([{ unitCents: 1000, qty: 1 }], { taxRate: 0.05, legacyRounding: false });
// → { lines: [{ amount: 1000, tax: 50 }], subtotal: 1000, tax: 50, total: 1050 }
```

## Invariants

- Invoice tax is calculated once, on the subtotal, and rounded half up.
- The tax shown on each line is for information only. It is rounded per
  line, so the lines need not add up to the invoice tax.
- Tenants on the pre-2024 contract set `legacyRounding: true`, which rounds
  every tax amount up instead of half up.

Run the tests with `npm test`.
