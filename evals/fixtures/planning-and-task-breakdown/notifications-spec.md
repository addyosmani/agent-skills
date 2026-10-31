# Notifications specification

Users can opt into email notifications when a task is assigned or becomes
overdue. Preferences are stored per user and default to disabled. Assignment
events already exist; overdue detection runs every fifteen minutes.

Requirements:

- Add preference read/update endpoints with boundary validation.
- Publish notification jobs from assignment and overdue flows.
- Deduplicate jobs by user, task, event type, and event version.
- Send email through the existing provider adapter.
- Record delivery status without storing message bodies.
- Feature flag the sending path; disabled remains the safe default.

Verification must include preference API tests, job deduplication tests,
provider-adapter integration tests, and one end-to-end assignment scenario.
No SMS, push notifications, or notification history UI is in scope.
