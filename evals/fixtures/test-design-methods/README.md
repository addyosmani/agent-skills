# Test Design Planning Fixture

This fixture contains requirements for test-planning evals. Produce a Test Planner and concrete test-case model only; there is no implementation to edit or execute.

## Inventory Reservation API

`POST /inventory/reserve` accepts a required `quantity` field. It must be an integer from 1 through 100 inclusive. Missing, null, string, fractional, zero, negative, and values above 100 are rejected with status 422. Authentication behavior and the request/response schema are unchanged.

## Discount Rules

Discount selection depends on three conditions:

- the customer is a member;
- the cart subtotal is at least $100;
- a campaign coupon is valid.

A member with a qualifying subtotal receives a 10% loyalty discount, even when a valid coupon is present. Otherwise, a valid coupon gives 5%. All other carts receive no discount. Discounts never stack.

## Order State Machine

Orders start in `Draft`.

- `pay` moves `Draft` to `Paid` and charges once.
- repeating `pay` in `Paid` is idempotent and must not charge again.
- `ship` moves `Paid` to `Shipped`.
- `cancel` moves `Draft` to `Cancelled`.
- shipping a `Draft` order, paying a `Cancelled` order, and cancelling a `Shipped` order are invalid transitions.

## Deployment Matrix

The supported factors are:

- Browser: Chrome, Firefox, Safari
- Locale: en-US, fr-FR, ja-JP
- Plan: Free, Pro, Enterprise
- Authentication: Password, SSO

The full Cartesian set is too expensive. Safari + ja-JP + Enterprise + SSO is a known high-risk combination that must be included even if a pairwise generator omits it.
