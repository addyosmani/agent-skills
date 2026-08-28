# Bug report: cents lost on three-way splits

From finance reconciliation (ticket FIN-482):

> Splitting $100.00 three ways returns `[3333, 3333, 3333]`. That sums to
> $99.99, one cent short. Reconciliation flags every three-way invoice we
> processed this month.

Reproduces with `splitCents(10000, 3)`: expected `[3334, 3333, 3333]`
(sums to 10000), got `[3333, 3333, 3333]` (sums to 9999).
