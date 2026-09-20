Core Philosophy
    - Pay cost at build time rather than at runtime
    - Make illegal states unrepresentable 
    - Stable and agreed Interfaces , so that agents can work parallelly
    - Colocation. Feature first folder structure instead of type first.
    - Validation should always happen in backend. 
    - Frontend shoudnt do any validation. Types clients should makes sure that frontend can only call with valid structures
    - Publish change log and Follow semver for releases
Tech stack
    1. monorepo.
    2. modular monolith (services can be deployed as independet servers or can be packaged as single binray)
    3. Infra via terraform (for aws)
    4. swagger api
    5. fe in react and typescript 
    6. be in golang/python (ask)
    7. docker for local development
    8. postgres for db 
    9. observability using prom + grafana + loki 
    10. mobile in react native / expo (choose easiest option first, unless complexity says otherwise)
    11. Use Github for ci/cd
    12. Use Mermaid to create flow diagrams as code
    13. Use Draw.io to create hlds as code
    14. Use drawdb to create db schema as code
    15. Use linear for all project management flow
Principal Engineer  needs to do following in HLD planning
    1. api interface
    2. domain models and glossary
    3. Interaction between services
    4. Clear Service boundaries (if creating new service or deciding where one feature should sit)
    5. tradeoffs
    6. assumptions
    7. Goals
    8. Non goals
    9. Diagrams 
    10. Constraints
    11. Observability (keep it high level)
        a. Metrics
        b. Logs
        c. Alerts
    12. Aleternatives considered
    13. Dependencies /Infra
    14. SLOs
    15. Constraints
    16. Some LLD
        a. Important classes, its interfaces and interactions among them
        b. DB schema
        c. API contracts
It has some elements of LLD
In HLD, PE will keep these things very high level (if he deems fit to discuss. Can skip them as well)
And can callout things he left for staff engineers to figure out. 

LLD 
    1. Make illegal states unrepresentable 
    2. Do validations at the edges (when receiving data from api, database, event store etc.)
    3. Business logic should have zero to minimal defense
    4. If defensive programming is absolutely necessary, try to make that illegal state a first class domain object so that errors are explicit and not implicitly
    5. Strong typing according to domain model
    6. OpenAPI and generate well-typed clients
    7. Type json
    8. Use enums
    9. Avoid raw strings at all costs
    10. Don’t favor high cyclometry complexity
    11. Separation of api models, domain/application models and db models…so that each layer can evolve independently
    12. Don’t put comments in the code. Put comments in the ticket and link ticket in the code
    13. Comments should be sparingly used and should describe the "why"..that is product/business reasoning behind the code. What code is doing should be self explanatory
    14. Always write testable code. That is 
        ○ don’t inject  concrete dependencies directly
        ○ Avoid random(), time() in the code
    15. Favor composition over inheritance
    16. Deliberation on domain models
        a. Use domain models for uuids
        b. Sum types, product types