# Backend Test Fixture

This fixture represents a backend-only validation change to `POST /checkout`.
The request and response contract are unchanged. The endpoint handles payment
input, so authorization and secret-safe output remain quality concerns.

## Release Test Policy

A release requires these test gates:

- `npm run test:unit`
- `npm run test:api`
- `npm run test:contract`

`npm run test:e2e` is optional for this fixture release. The `lint` and `build`
scripts are non-test CI gates owned by other workflows, not by the Tests skill.
