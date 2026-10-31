# split-payment

Utility for splitting an amount of money among `n` participants without
losing or inventing cents. Amounts are integer cents throughout; the
library never touches floating point.

## API

`splitCents(totalCents, n)` returns an array of `n` integer cent amounts.
`totalCents` is a non-negative integer, `n` is a positive integer.

## Invariants

Every result must satisfy both invariants, for every input:

1. **Exactness** — the shares sum to exactly `totalCents`. Money is never
   lost or created.
2. **Fairness** — no two shares differ by more than one cent. When the
   total does not divide evenly, the leftover cents go to the earliest
   shares, one cent each.

For example, `splitCents(100, 7)` is `[15, 15, 14, 14, 14, 14, 14]`.

## Tests

```
npm test
```
