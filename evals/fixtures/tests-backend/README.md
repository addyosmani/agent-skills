# Backend Test Fixture

This fixture represents a backend-only validation change to `POST /checkout`.
The request and response contract, frontend behavior, and persistence are
unchanged. The endpoint handles payment input, so commands and output must
remain safe for test resources and secret-safe reporting.

## Test Command Notes

All test scripts except `test:backend-integration` are deterministic,
non-interactive, self-contained, and make no network or external-service calls.

`npm run test:backend-integration` requires a non-production test database named
by `CHECKOUT_FIXTURE_TEST_DATABASE_URL`. When that variable is absent, do not
start the command. Never point it at production or print its value.

The frontend integration suite exercises UI state and client boundaries. The
backend integration suite exercises database-backed service behavior. Neither
is part of the backend-only validation change described above.

## Release Test Policy

A release requires these test gates:

- `npm run test:unit`
- `npm run test:api`
- `npm run test:contract`

`npm run test:frontend-integration`, `npm run test:backend-integration`, and
`npm run test:e2e` are optional for this fixture release. The `lint` and `build`
scripts are non-test CI gates owned by other workflows.
