# Test Planner: Invoice Line Rounding

## Test Analysis

- Test basis / oracle: `tdd-invoice-rounding/README.md`; each line total is rounded to the nearest cent before invoice totals are summed.
- Changed surfaces: `tdd-invoice-rounding/src/invoice.js` currency calculation.
- Affected contracts: CommonJS export must remain unchanged.
- Quality concerns: financial correctness.
- Assumptions or blocked questions: none.

## Test Design

- Primary layer: Unit.
- Adjacent layers: none.
- Case-design technique: Regression reproduction.
- Coverage model: preserve the smallest reported input and its approved expected result.
- Skipped layers and why: API, Contract, Integration, and E2E do not add evidence for this isolated calculation.

## Case Specifications

### INV-ROUND-001 — Round each line before summing

- Description / objective: Prove the invoice total follows the approved per-line currency-rounding rule for the escaped defect.
- Source / risk: Approved billing rule in `tdd-invoice-rounding/README.md`; escaped money defect.
- Layer: Unit.
- Preconditions: Existing CommonJS `calculateInvoiceTotal` API.
- Test data: Line totals `[0.335, 0.335]`.

| Step | Action | Expected observation / oracle |
|---:|---|---|
| 1 | Call `calculateInvoiceTotal([0.335, 0.335])`. | Returns `0.68` per the approved billing rule; before the fix, RED is `0.67 !== 0.68`. |

- Technique / coverage: Regression reproduction of the smallest reported input.
- Priority: Critical.
- Status: READY.
- Postconditions / cleanup: None.

## Implementation Handoff

- First RED case: `INV-ROUND-001`; fail because actual `0.67` differs from expected `0.68`.
- Existing command: discover and use the project-owned command in `tdd-invoice-rounding/package.json`.
- Planner status: READY.
- Residual risk / owner: none for this scoped defect.
