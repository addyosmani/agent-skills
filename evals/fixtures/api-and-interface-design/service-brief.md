# URL shortener service brief

The service needs public operations to create a short URL, resolve a slug, and
read aggregate click statistics. Clients include a browser extension and a
mobile app, so contracts must remain backward compatible.

Known constraints:

- Destination URLs are supplied by untrusted users.
- Slugs are six to twelve URL-safe characters.
- A missing slug and an expired slug must be distinguishable to operators, but
  the public API must not expose internal storage details.
- Statistics may be delayed by up to one minute.

Still undecided:

- Whether callers may request custom slugs.
- Whether links expire by default.
- Whether statistics require authentication.
