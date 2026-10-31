# Usage-based billing brief

The product currently charges one flat monthly price. Leadership wants usage-
based billing next quarter, but “usage” has not been defined. Candidate meters
include API requests, processed records, and successful jobs.

Known constraints:

- Existing customers need a migration path.
- Billing events must be auditable and idempotent.
- Late-arriving events occur for up to seven days.
- Finance requires invoice reconciliation.

Unknowns include pricing tiers, free allowances, meter ownership, correction
rules, customer-facing usage visibility, and regional tax behavior. Produce a
spec and surface these decisions; do not implement them by assumption.
