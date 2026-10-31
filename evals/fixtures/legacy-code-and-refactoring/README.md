# order-pricing

Legacy pricing module for the checkout service. `src/pricing.js` exports
`priceOrder(order)` and has no tests. Six people have edited it over four
years; nobody can say why the clearance and bulk rules are applied in the
order they are, and the last "cleanup" produced a week of wrong invoices.

## Requested change

Gold-tier customers (`order.customer.tier === 'gold'`) get an extra 5% off
the subtotal. The existing 30% cap on the total discount still applies.

## Constraints

- Existing callers depend on the current output, including its rounding and
  the way tax is applied. No existing result may change.
- `npm test` runs `node --test`. There is no test directory yet.

## Example order

    { items: [{ unitPrice: 12.5, qty: 10, category: 'clearance' }],
      coupon: 'SAVE20', shipping: 'courier', customer: { tier: 'silver' } }
