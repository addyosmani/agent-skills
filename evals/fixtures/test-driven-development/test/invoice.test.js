import assert from "node:assert/strict";
import test from "node:test";
import { invoiceTotal } from "../src/invoice.js";

test("totals whole-dollar line items", () => {
  assert.equal(
    invoiceTotal([
      { quantity: 2, unitPrice: 10 },
      { quantity: 1, unitPrice: 5 }
    ]),
    25
  );
});

test("applies tax to the subtotal", () => {
  assert.equal(invoiceTotal([{ quantity: 1, unitPrice: 100 }], 0.075), 107.5);
});
