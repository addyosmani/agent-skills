---
name: planning-and-task-breakdown
description: Descompone el trabajo en tareas ordenadas. Úsalo cuando cuentas con una especificación o requisitos claros y necesitas dividir el trabajo en tareas implementables. Úsalo cuando una tarea parezca demasiado grande para empezar, cuando necesites estimar el alcance, o cuando sea posible trabajar en paralelo.
---

# Planning and Task Breakdown

## Overview

Descompón el trabajo en tareas pequeñas y verificables con criterios de aceptación explícitos. Una buena descomposición de tareas marca la diferencia entre un agente que completa el trabajo de forma confiable y uno que genera un enredo. Cada tarea debe ser lo suficientemente pequeña como para implementarla, probarla y verificarla en una sesión enfocada.

## When to Use

- Tienes una especificación y necesitas dividirla en unidades implementables
- Una tarea parece demasiado grande o vaga para empezar
- El trabajo necesita paralelizarse entre múltiples agentes o sesiones
- Necesitas comunicar el alcance a una persona
- El orden de implementación no es obvio

**When NOT to use:** Cambios de un solo archivo con alcance obvio, o cuando la especificación ya contiene tareas bien definidas.

## The Planning Process

### Step 1: Enter Plan Mode

Antes de escribir código alguno, opera en modo de solo lectura:

- Lee la especificación y las secciones relevantes del codebase
- Identifica patrones y convenciones existentes
- Mapea las dependencias entre componentes
- Anota riesgos e incógnitas

**Do NOT write code during planning.** El resultado es un documento de planificación, no una implementación.

### Step 2: Identify the Dependency Graph

Mapea qué depende de qué:

```
Database schema
    │
    ├── API models/types
    │       │
    │       ├── API endpoints
    │       │       │
    │       │       └── Frontend API client
    │       │               │
    │       │               └── UI components
    │       │
    │       └── Validation logic
    │
    └── Seed data / migrations
```

El orden de implementación sigue el grafo de dependencias de abajo hacia arriba: construye los cimientos primero.

### Step 3: Slice Vertically

En lugar de construir toda la base de datos, luego toda la API y luego toda la UI, construye un flujo completo de funcionalidad a la vez:

**Bad (horizontal slicing):**
```
Task 1: Build entire database schema
Task 2: Build all API endpoints
Task 3: Build all UI components
Task 4: Connect everything
```

**Good (vertical slicing):**
```
Task 1: User can create an account (schema + API + UI for registration)
Task 2: User can log in (auth schema + API + UI for login)
Task 3: User can create a task (task schema + API + UI for creation)
Task 4: User can view task list (query + API + UI for list view)
```

Cada vertical slice entrega funcionalidad operativa y testeable.

### Step 4: Write Tasks

Cada tarea sigue esta estructura:

```markdown
## Task [N]: [Short descriptive title]

**Description:** One paragraph explaining what this task accomplishes.

**Acceptance criteria:**
- [ ] [Specific, testable condition]
- [ ] [Specific, testable condition]

**Verification:**
- [ ] Tests pass: `npm test -- --grep "feature-name"`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: [description of what to verify]

**Dependencies:** [Task numbers this depends on, or "None"]

**Files likely touched:**
- `src/path/to/file.ts`
- `tests/path/to/test.ts`

**Estimated scope:** [Small: 1-2 files | Medium: 3-5 files | Large: 5+ files]
```

### Step 5: Order and Checkpoint

Organiza las tareas de modo que:

1. Las dependencias se satisfagan (construye los cimientos primero)
2. Cada tarea deje el sistema en un estado operativo
3. Los puntos de verificación ocurran cada 2-3 tareas
4. Las tareas de alto riesgo estén al principio (fail fast)

Añade checkpoints explícitos:

```markdown
## Checkpoint: After Tasks 1-3
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Core user flow works end-to-end
- [ ] Review with human before proceeding
```

## Task Sizing Guidelines

| Size | Files | Scope | Example |
|------|-------|-------|---------|
| **XS** | 1 | Single function or config change | Add a validation rule |
| **S** | 1-2 | One component or endpoint | Add a new API endpoint |
| **M** | 3-5 | One feature slice | User registration flow |
| **L** | 5-8 | Multi-component feature | Search with filtering and pagination |
| **XL** | 8+ | **Too large — break it down further** | — |

Si una tarea es L o mayor, debe dividirse en tareas más pequeñas. Un agente rinde mejor con tareas S y M.

**When to break a task down further:**
- Tomaría más de una sesión enfocada (aproximadamente 2+ horas de trabajo del agente)
- No puedes describir los criterios de aceptación en 3 viñetas o menos
- Toca dos o más subsistemas independientes (p. ej., auth y billing)
- Te descubres escribiendo "and" en el título de la tarea (señal de que son dos tareas)

## Plan Document Template

```markdown
# Implementation Plan: [Feature/Project Name]

## Overview
[One paragraph summary of what we're building]

## Architecture Decisions
- [Key decision 1 and rationale]
- [Key decision 2 and rationale]

## Task List

### Phase 1: Foundation
- [ ] Task 1: ...
- [ ] Task 2: ...

### Checkpoint: Foundation
- [ ] Tests pass, builds clean

### Phase 2: Core Features
- [ ] Task 3: ...
- [ ] Task 4: ...

### Checkpoint: Core Features
- [ ] End-to-end flow works

### Phase 3: Polish
- [ ] Task 5: ...
- [ ] Task 6: ...

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Strategy] |

## Open Questions
- [Question needing human input]
```

## Parallelization Opportunities

Cuando hay múltiples agentes o sesiones disponibles:

- **Safe to parallelize:** Independent feature slices, tests for already-implemented features, documentation
- **Must be sequential:** Database migrations, shared state changes, dependency chains
- **Needs coordination:** Features that share an API contract (define the contract first, then parallelize)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll figure it out as I go" | Así es como terminas con un enredo y retrabajo. 10 minutos de planificación ahorran horas. |
| "The tasks are obvious" | Escríbelas de todos modos. Las tareas explícitas sacan a la luz dependencias ocultas y casos límite olvidados. |
| "Planning is overhead" | La planificación es la tarea. La implementación sin un plan es solo teclear. |
| "I can hold it all in my head" | Las ventanas de contexto son finitas. Los planes escritos sobreviven a los límites de sesión y a la compactación. |

## Red Flags

- Empezar la implementación sin una lista de tareas escrita
- Tareas que dicen "implement the feature" sin criterios de aceptación
- No hay pasos de verificación en el plan
- Todas las tareas son de tamaño XL
- No hay checkpoints entre tareas
- No se considera el orden de dependencias

## Verification

Antes de empezar la implementación, confirma:

- [ ] Cada tarea tiene criterios de aceptación
- [ ] Cada tarea tiene un paso de verificación
- [ ] Las dependencias de las tareas están identificadas y ordenadas correctamente
- [ ] Ninguna tarea toca más de ~5 archivos
- [ ] Existen checkpoints entre fases principales
- [ ] La persona ha revisado y aprobado el plan
