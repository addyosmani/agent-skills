# Advanced Test Planner Scenarios

This fixture contains four independent planning scenarios. Produce plans and
case models only; there is no implementation to edit or execute.

## Refund Eligibility Sources

Two approved sources disagree at the refund deadline:

- The product acceptance criterion says a purchase remains refundable through
  the end of the 30th calendar day in the merchant's configured timezone.
- The public API example says a refund is accepted while
  `now <= purchasedAt + 720 hours`.

The difference is observable across daylight-saving changes and when merchant
and purchaser timezones differ. No owner has resolved which source controls.

## Checkout Client Migration

The approved migration changes the checkout response field `total` to
`grandTotal` in OpenAPI and regenerates the web client. The React confirmation
page is updated in the same release. Validation, authorization, and persistence
behavior are unchanged. A mobile consumer remains on the old response shape for
one release and must continue working. Checkout is a critical revenue journey.

## Order Commit Workflow

The order service now reserves stock, inserts the order, and writes an outbox
event in one database transaction. The HTTP request and response schemas are
unchanged. A database error must roll back all three effects. Retrying the same
idempotency key must not reserve stock or emit an event twice. Delivery workers
may receive the outbox event more than once.

## Bulk Import Discovery

A new CSV customer import has examples for UTF-8 comma-separated files, but
requirements for duplicate rows, mixed encodings, partial failure, cancellation,
and retry are not settled. Previous import incidents involved duplicate records,
silent row loss, and files that passed validation but failed after several
minutes. The team has a two-hour test session before the release decision. The
release owner is the customer-data product lead.
