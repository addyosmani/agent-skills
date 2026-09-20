# Backend architecture

Modular monolith of services, each a bounded context and a collection of vertical-slice features, hexagonal inside, deployable as one binary or separately. Detail lives in each service's `docs/`.

## Services

| Service | Bounded context | Owns | Client SDK | Docs |
|---|---|---|---|---|

## Shared modules

The pluggable modules every project needs: payments, auth (OTP and OAuth), profile. Where they live and how a service plugs one in.

## Infra

Terraform under `infra/`. Environments, what runs where, and how a service reaches its dependencies. LocalStack for local AWS.

## Data

PostgreSQL. Schema lives separately from code, migrations are backward compatible for one release, connection pooling, fail on conflict.

## Observability

Structured logs at boundaries and transitions; tech metrics decided by the backend engineer; alerts, runbooks, and traces deferred.
