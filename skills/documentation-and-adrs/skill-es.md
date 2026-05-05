---
name: documentation-and-adrs
description: Registra decisiones y documentación. Úsalo al tomar decisiones arquitectónicas, cambiar APIs públicas, lanzar funcionalidades, o cuando necesites registrar contexto que futuros ingenieros y agentes necesitarán para entender el codebase.
---

# Documentation and ADRs

## Overview

Documenta las decisiones, no solo el código. La documentación más valiosa captura el *porqué* — el contexto, las restricciones y los trade-offs que llevaron a una decisión. El código muestra *qué* se construyó; la documentación explica *por qué se construyó de esta manera* y *qué alternativas fueron consideradas*. Este contexto es esencial para futuros humanos y agentes que trabajen en el codebase.

## When to Use

- Tomando una decisión arquitectónica significativa
- Eligiendo entre enfoques competidores
- Agregando o cambiando una API pública
- Lanzando una funcionalidad que cambia el comportamiento visible para el usuario
- Incorporando nuevos miembros al equipo (o agentes) al proyecto
- Cuando te encuentres explicando lo mismo repetidamente

**When NOT to use:** No documentes código obvio. No agregues comentarios que repitan lo que el código ya dice. No escribas documentación para prototipos descartables.

## Architecture Decision Records (ADRs)

Los ADRs capturan el razonamiento detrás de decisiones técnicas significativas. Son la documentación de mayor valor que puedes escribir.

### When to Write an ADR

- Elegir un framework, biblioteca o dependencia mayor
- Diseñar un modelo de datos o esquema de base de datos
- Seleccionar una estrategia de autenticación
- Decidir sobre una arquitectura de API (REST vs. GraphQL vs. tRPC)
- Elegir entre herramientas de build, plataformas de hosting o infraestructura
- Cualquier decisión que sería costosa de revertir

### ADR Template

Almacena los ADRs en `docs/decisions/` con numeración secuencial:

```markdown
# ADR-001: Use PostgreSQL for primary database

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Date
2025-01-15

## Context
We need a primary database for the task management application. Key requirements:
- Relational data model (users, tasks, teams with relationships)
- ACID transactions for task state changes
- Support for full-text search on task content
- Managed hosting available (for small team, limited ops capacity)

## Decision
Use PostgreSQL with Prisma ORM.

## Alternatives Considered

### MongoDB
- Pros: Flexible schema, easy to start with
- Cons: Our data is inherently relational; would need to manage relationships manually
- Rejected: Relational data in a document store leads to complex joins or data duplication

### SQLite
- Pros: Zero configuration, embedded, fast for reads
- Cons: Limited concurrent write support, no managed hosting for production
- Rejected: Not suitable for multi-user web application in production

### MySQL
- Pros: Mature, widely supported
- Cons: PostgreSQL has better JSON support, full-text search, and ecosystem tooling
- Rejected: PostgreSQL is the better fit for our feature requirements

## Consequences
- Prisma provides type-safe database access and migration management
- We can use PostgreSQL's full-text search instead of adding Elasticsearch
- Team needs PostgreSQL knowledge (standard skill, low risk)
- Hosting on managed service (Supabase, Neon, or RDS)
```

### ADR Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **Don't delete old ADRs.** Capturan contexto histórico.
- Cuando una decisión cambia, escribe un nuevo ADR que referencie y supere al anterior.

## Inline Documentation

### When to Comment

Comenta el *porqué*, no el *qué*:

```typescript
// BAD: Restates the code
// Increment counter by 1
counter += 1;

// GOOD: Explains non-obvious intent
// Rate limit uses a sliding window — reset counter at window boundary,
// not on a fixed schedule, to prevent burst attacks at window edges
if (now - windowStart > WINDOW_SIZE_MS) {
  counter = 0;
  windowStart = now;
}
```

### When NOT to Comment

```typescript
// Don't comment self-explanatory code
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Don't leave TODO comments for things you should just do now
// TODO: add error handling  ← Just add it

// Don't leave commented-out code
// const oldImplementation = () => { ... }  ← Delete it, git has history
```

### Document Known Gotchas

```typescript
/**
 * IMPORTANT: This function must be called before the first render.
 * If called after hydration, it causes a flash of unstyled content
 * because the theme context isn't available during SSR.
 *
 * See ADR-003 for the full design rationale.
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```

## API Documentation

Para APIs públicas (REST, GraphQL, interfaces de bibliotecas):

### Inline with Types (Preferred for TypeScript)

```typescript
/**
 * Creates a new task.
 *
 * @param input - Task creation data (title required, description optional)
 * @returns The created task with server-generated ID and timestamps
 * @throws {ValidationError} If title is empty or exceeds 200 characters
 * @throws {AuthenticationError} If the user is not authenticated
 *
 * @example
 * const task = await createTask({ title: 'Buy groceries' });
 * console.log(task.id); // "task_abc123"
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // ...
}
```

### OpenAPI / Swagger for REST APIs

```yaml
paths:
  /api/tasks:
    post:
      summary: Create a task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: Validation error
```

## README Structure

Cada proyecto debería tener un README que cubra:

```markdown
# Project Name

One-paragraph description of what this project does.

## Quick Start
1. Clone the repo
2. Install dependencies: `npm install`
3. Set up environment: `cp .env.example .env`
4. Run the dev server: `npm run dev`

## Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run tests |
| `npm run build` | Production build |
| `npm run lint` | Run linter |

## Architecture
Brief overview of the project structure and key design decisions.
Link to ADRs for details.

## Contributing
How to contribute, coding standards, PR process.
```

## Changelog Maintenance

Para funcionalidades lanzadas:

```markdown
# Changelog

## [1.2.0] - 2025-01-20
### Added
- Task sharing: users can share tasks with team members (#123)
- Email notifications for task assignments (#124)

### Fixed
- Duplicate tasks appearing when rapidly clicking create button (#125)

### Changed
- Task list now loads 50 items per page (was 20) for better UX (#126)
```

## Documentation for Agents

Consideración especial para el contexto de agentes de IA:

- **CLAUDE.md / rules files** — Documentan las convenciones del proyecto para que los agentes las sigan
- **Spec files** — Mantén las especificaciones actualizadas para que los agentes construyan lo correcto
- **ADRs** — Ayudan a los agentes a entender por qué se tomaron decisiones pasadas (evita re-decidir)
- **Inline gotchas** — Previenen que los agentes caigan en trampas conocidas

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is self-documenting" | El código muestra el qué. No muestra el porqué, qué alternativas fueron rechazadas, ni qué restricciones aplican. |
| "We'll write docs when the API stabilizes" | Las APIs se estabilizan más rápido cuando las documentas. La documentación es la primera prueba del diseño. |
| "Nobody reads docs" | Los agentes sí. Los futuros ingenieros sí. Tu yo de dentro de 3 meses sí. |
| "ADRs are overhead" | Un ADR de 10 minutos previene un debate de 2 horas sobre la misma decisión seis meses después. |
| "Comments get outdated" | Los comentarios sobre el *porqué* son estables. Los comentarios sobre el *qué* se desactualizan — por eso solo escribes el primero. |

## Red Flags

- Decisiones arquitectónicas sin justificación escrita
- APIs públicas sin documentación ni tipos
- README que no explica cómo ejecutar el proyecto
- Código comentado en lugar de eliminación
- Comentarios TODO que llevan semanas ahí
- Sin ADRs en un proyecto con elecciones arquitectónicas significativas
- Documentación que repite el código en lugar de explicar la intención

## Verification

Después de documentar:

- [ ] Los ADRs existen para todas las decisiones arquitectónicas significativas
- [ ] El README cubre quick start, comandos y visión general de la arquitectura
- [ ] Las funciones de la API tienen documentación de parámetros y tipos de retorno
- [ ] Los gotchas conocidos están documentados inline donde importan
- [ ] No queda código comentado
- [ ] Los archivos de reglas (CLAUDE.md, etc.) están actualizados y son precisos
