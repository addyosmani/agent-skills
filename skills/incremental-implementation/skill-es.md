---
name: incremental-implementation
description: Entrega cambios incrementalmente. Úsalo al implementar cualquier funcionalidad o cambio que toque más de un archivo. Úsalo cuando estés a punto de escribir una gran cantidad de código de una vez, o cuando una tarea se sienta demasiado grande para entregar en un solo paso.
---

# Incremental Implementation

## Overview

Construye en rebanadas verticales delgadas — implementa una pieza, testéala, verifícala, luego expande. Evita implementar una funcionalidad completa en una sola pasada. Cada incremento debería dejar el sistema en un estado funcional y testeable. Esta es la disciplina de ejecución que hace que las funcionalidades grandes sean manejables.

## When to Use

- Implementando cualquier cambio multi-archivo
- Construyendo una nueva funcionalidad a partir de una descomposición de tareas
- Refactorizando código existente
- Cualquier vez que sientas tentación de escribir más de ~100 líneas antes de testear

**When NOT to use:** Cambios de un solo archivo, una sola función, donde el alcance ya es mínimo.

## The Increment Cycle

```
┌──────────────────────────────────────┐
│                                      │
│   Implement ──→ Test ──→ Verify ──┐  │
│       ▲                           │  │
│       └───── Commit ◄─────────────┘  │
│              │                       │
│              ▼                       │
│          Next slice                  │
│                                      │
└──────────────────────────────────────┘
```

Para cada rebanada:

1. **Implement** la pieza más pequeña de funcionalidad completa
2. **Test** — ejecuta el test suite (o escribe un test si no existe)
3. **Verify** — confirma que la rebanada funciona como se espera (tests pasan, build exitoso, verificación manual)
4. **Commit** — guarda tu progreso con un mensaje descriptivo (consulta `git-workflow-and-versioning` para guía de atomic commits)
5. **Move to the next slice** — continúa, no reinicies

## Slicing Strategies

### Vertical Slices (Preferred)

Construye un camino completo a través del stack:

```
Slice 1: Create a task (DB + API + basic UI)
    → Tests pass, user can create a task via the UI

Slice 2: List tasks (query + API + UI)
    → Tests pass, user can see their tasks

Slice 3: Edit a task (update + API + UI)
    → Tests pass, user can modify tasks

Slice 4: Delete a task (delete + API + UI + confirmation)
    → Tests pass, full CRUD complete
```

Cada rebanada entrega funcionalidad end-to-end operativa.

### Contract-First Slicing

Cuando backend y frontend necesitan desarrollar en paralelo:

```
Slice 0: Define the API contract (types, interfaces, OpenAPI spec)
Slice 1a: Implement backend against the contract + API tests
Slice 1b: Implement frontend against mock data matching the contract
Slice 2: Integrate and test end-to-end
```

### Risk-First Slicing

Ataca la pieza más riesgosa o incierta primero:

```
Slice 1: Prove the WebSocket connection works (highest risk)
Slice 2: Build real-time task updates on the proven connection
Slice 3: Add offline support and reconnection
```

Si Slice 1 falla, lo descubres antes de invertir en Slices 2 y 3.

## Implementation Rules

### Rule 0: Simplicity First

Antes de escribir cualquier código, pregúntate: "¿Qué es lo más simple que podría funcionar?"

Después de escribir código, revísalo contra estas comprobaciones:
- ¿Puede hacerse en menos líneas?
- ¿Estas abstracciones están justificando su complejidad?
- ¿Un staff engineer miraría esto y diría "¿por qué no simplemente..."?
- ¿Estoy construyendo para requisitos futuros hipotéticos, o para la tarea actual?

```
SIMPLICITY CHECK:
✗ Generic EventBus with middleware pipeline for one notification
✓ Simple function call

✗ Abstract factory pattern for two similar components
✓ Two straightforward components with shared utilities

✗ Config-driven form builder for three forms
✓ Three form components
```

Tres líneas de código similares son mejores que una abstracción prematura. Implementa primero la versión ingenua y obviamente correcta. Optimiza solo después de que la corrección esté probada con tests.

### Rule 0.5: Scope Discipline

Toca solo lo que la tarea requiere.

NO hagas:
- "Limpiar" código adyacente a tu cambio
- Refactorizar imports en archivos que no estás modificando
- Eliminar comentarios que no entiendes completamente
- Agregar funcionalidades no especificadas porque "parecen útiles"
- Modernizar sintaxis en archivos que solo estás leyendo

Si notas algo que vale la pena mejorar fuera del alcance de tu tarea, anótalo — no lo arregles:

```
NOTICED BUT NOT TOUCHING:
- src/utils/format.ts tiene un import sin usar (no relacionado con esta tarea)
- El middleware de auth podría usar mejores mensajes de error (tarea separada)
→ ¿Quieres que cree tareas para estos?
```

### Rule 1: One Thing at a Time

Cada incremento cambia una cosa lógica. No mezcles concerns:

**Bad:** Un commit que agrega un nuevo componente, refactoriza uno existente, y actualiza la config de build.

**Good:** Tres commits separados — uno para cada cambio.

### Rule 2: Keep It Compilable

Después de cada incremento, el proyecto debe compilar y los tests existentes deben pasar. No dejes el codebase en un estado roto entre rebanadas.

### Rule 3: Feature Flags for Incomplete Features

Si una funcionalidad no está lista para usuarios pero necesitas mergear incrementos:

```typescript
// Feature flag for work-in-progress
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';

if (ENABLE_TASK_SHARING) {
  // New sharing UI
}
```

Esto te permite mergear incrementos pequeños al main branch sin exponer trabajo incompleto.

### Rule 4: Safe Defaults

El nuevo código debería defaultar a comportamiento seguro y conservador:

```typescript
// Safe: disabled by default, opt-in
export function createTask(data: TaskInput, options?: { notify?: boolean }) {
  const shouldNotify = options?.notify ?? false;
  // ...
}
```

### Rule 5: Rollback-Friendly

Cada incremento debería ser reversible de forma independiente:

- Los cambios aditivos (nuevos archivos, nuevas funciones) son fáciles de revertir
- Las modificaciones a código existente deberían ser mínimas y enfocadas
- Las database migrations deberían tener migraciones de rollback correspondientes
- Evita eliminar algo en un commit y reemplazarlo en el mismo commit — sepáralos

## Working with Agents

Al dirigir a un agente para que implemente incrementalmente:

```
"Let's implement Task 3 from the plan.

Start with just the database schema change and the API endpoint.
Don't touch the UI yet — we'll do that in the next increment.

After implementing, run `npm test` and `npm run build` to verify
nothing is broken."
```

Sé explícito sobre qué está en alcance y qué NO está en alcance para cada incremento.

## Increment Checklist

Después de cada incremento, verifica:

- [ ] El cambio hace una cosa y la hace completamente
- [ ] Todos los tests existentes siguen pasando (`npm test`)
- [ ] El build es exitoso (`npm run build`)
- [ ] El type checking pasa (`npx tsc --noEmit`)
- [ ] El linting pasa (`npm run lint`)
- [ ] La nueva funcionalidad funciona como se espera
- [ ] El cambio está commiteado con un mensaje descriptivo

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll test it all at the end" | Los bugs se acumulan. Un bug en Slice 1 hace que los Slices 2-5 estén mal. Testea cada rebanada. |
| "It's faster to do it all at once" | *Parece* más rápido hasta que algo se rompe y no puedes encontrar cuál de las 500 líneas cambiadas causó el problema. |
| "These changes are too small to commit separately" | Los commits pequeños son gratis. Los commits grandes ocultan bugs y hacen los rollbacks dolorosos. |
| "I'll add the feature flag later" | Si la funcionalidad no está completa, no debería ser visible para el usuario. Agrega el flag ahora. |
| "This refactor is small enough to include" | Los refactors mezclados con features hacen ambos más difíciles de revisar y debuggear. Sepáralos. |

## Red Flags

- Más de 100 líneas de código escritas sin ejecutar tests
- Múltiples cambios no relacionados en un solo incremento
- Expansión de alcance tipo "déjame agregar esto también rápido"
- Saltarse el paso de test/verify para ir más rápido
- Build o tests rotos entre incrementos
- Cambios grandes sin commitear acumulándose
- Construir abstracciones antes de que el tercer caso de uso lo exija
- Tocar archivos fuera del alcance de la tarea "ya que estoy aquí"
- Crear nuevos archivos de utilidades para operaciones de una sola vez

## Verification

Después de completar todos los incrementos para una tarea:

- [ ] Cada incremento fue testeado y commiteado individualmente
- [ ] El test suite completo pasa
- [ ] El build está limpio
- [ ] La funcionalidad funciona end-to-end como se especificó
- [ ] No quedan cambios sin commitear
