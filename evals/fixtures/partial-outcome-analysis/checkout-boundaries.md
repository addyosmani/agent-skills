# Checkout service boundaries

- `POST /checkout` calls, in order: auth service, inventory database, payment provider.
- On success it publishes an `order-created` event to the message broker.
- Auth service: internal, p99 40ms, no timeout configured on the client.
- Inventory database: reserves stock in a transaction separate from the order write.
- Payment provider: third-party, capture is irreversible, p99 800ms with occasional 30s stalls.
- The broker publish happens after the database commit, outside the transaction.
- Current client retry policy: 3 attempts with fixed 1s backoff, applied to every call above.
- No idempotency key is sent to the payment provider today.
- Emitted metrics: request count, p50/p99 latency, and 5xx rate per dependency.
- There is no read replica; a database failure fails the whole endpoint.
