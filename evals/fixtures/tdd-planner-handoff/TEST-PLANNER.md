# Reviewed Test Planner: Invoice Line Rounding

- Review decision: APPROVED
- Planner status: READY

## Oracle

- Source: `tdd-invoice-rounding/README.md`.
- Approved rule: Round each line total to the nearest cent before summing the
  invoice total.
- Unresolved requirements: None.

## Case Specification

### INV-ROUND-001: Round Each Line Before Summing

- Status: READY
- Objective: Reproduce the escaped invoice rounding defect and prove the
  approved per-line rounding rule.
- Test level: Unit.
- Preconditions: Keep the existing CommonJS `calculateInvoiceTotal` API.
- Input: Line totals `[0.335, 0.335]`.
- Action: Call `calculateInvoiceTotal([0.335, 0.335])`.
- Expected result / oracle: Returns `0.68` under the approved billing rule.
- Expected RED reason: The current implementation returns `0.67`.
- Priority: Critical.
- Existing command: Discover and use the project-owned command in
  `tdd-invoice-rounding/package.json`.

## Handoff Boundary

Implement only `INV-ROUND-001`. Translate its setup, action, and assertion into
the repository's test syntax without changing their meaning. If the oracle or
READY status cannot be validated, block implementation and return the case to
the design workflow.
