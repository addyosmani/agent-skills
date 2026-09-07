# Customer portal — product brief

Leadership wants a self-serve customer portal shipped as one initiative. The
request, as handed down:

- Customers sign in with email/password or company SSO and manage their
  account and team members.
- Customers pick a plan, enter payment details, and receive monthly invoices;
  plan changes prorate.
- Customers get email notifications for invoices, payment failures, and team
  invitations; enterprise customers can register webhooks for the same events.
- Admins see a usage dashboard: seats, API calls, and spend per month.

Constraints gathered so far:

- Billing must know who the customer is, so it depends on account data.
- Notifications fire on billing and account events.
- The dashboard reads from billing and notification delivery records.
- The four areas have different reviewers: platform owns accounts, finance
  owns billing, and growth owns notifications and the dashboard.
- Each area should be shippable and verifiable on its own; finance wants to
  sign off on billing without waiting for the dashboard.
