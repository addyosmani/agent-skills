# Invoice Rounding Bug

Work in this project and preserve its CommonJS public API.

The approved billing rule is: round each line total to the nearest cent before
summing the invoice total. The reported reproducer is two line totals of
`0.335`; the invoice total must be `0.68`, but the current implementation
returns `0.67`.

Use the project-owned test command from `package.json`. Add a regression test
that fails for the reported reason before changing the implementation, make the
smallest production change that fixes it, then run the affected required suite.
