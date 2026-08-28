# Payment retry operations

On-call must be able to answer:

- Are retries recovering transient gateway failures?
- Which gateway and failure class is driving exhaustion?
- Is one payment being charged more than once?
- Which customer-visible payments need intervention now?

Payment and attempt IDs are safe correlation identifiers. Card numbers,
customer email addresses, and raw gateway responses must never be logged.
