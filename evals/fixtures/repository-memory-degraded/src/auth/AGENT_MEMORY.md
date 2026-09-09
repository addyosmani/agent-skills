---
scope:
  - src/auth/**
evidence:
  - src/auth/session.js#SessionService
invalidated_by:
  - src/routes/refresh.js
---

# How session authentication works

- Token renewal happens only in `SessionService.renewToken`; route handlers
  delegate to it and never touch tokens directly.
- Session tokens expire after fifteen minutes and are rotated on renewal.
