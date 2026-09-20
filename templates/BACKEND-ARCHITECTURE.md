# Backend architecture

How the backend is put together today. Detail lives in each service's `docs/`.

## Shape

<modular monolith or separate deployables; how a service is structured inside>

## Services

| Service | Bounded context | Owns | Client SDK | Docs |
|---|---|---|---|---|

## Shared modules

<the pluggable modules (payments, auth, profile, …): where each lives and how a service plugs one in>

## Infra

<what runs where per environment, how a service reaches its dependencies, where the infrastructure code lives>

## Data

<engine, where the schema lives, migration tooling, pooling>

## Observability

<what is emitted where; dashboards and alerts that exist>
