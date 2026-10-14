# Spec: Discount codes

## Objective
Shoppers apply a discount code to a cart total.

## Commands
- Test: `npm test`
- Requirement coverage: `node scripts/check-requirements.mjs SPEC.md`

## Testing Strategy
Node's built-in test runner, tests in `test/`.
Test names start with their requirement ID and a colon: `DSC-3: rejects expired codes`.

| Seam | Requirement IDs |
| --- | --- |
| applyDiscount() | DSC-1, DSC-2, DSC-10 |

Requirement key: DSC

## Success Criteria
1. DSC-1: A percentage code reduces the total by that percentage, rounded to the nearest cent.
2. DSC-2: A code never takes the total below zero.
3. DSC-10: An unknown code leaves the total unchanged.
