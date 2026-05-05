---
name: spec-driven-development
description: Crea especificaciones antes de programar. Úsalo al iniciar un proyecto, feature o cambio significativo cuando aún no exista una especificación. Úsalo cuando los requisitos sean imprecisos, ambiguos o existan solo como una idea vaga.
---

# Spec-Driven Development

## Overview

Escribe una especificación estructurada antes de escribir código alguno. La especificación es la fuente de verdad compartida entre tú y el ingeniero humano: define qué estamos construyendo, por qué y cómo sabremos que está terminado. Código sin especificación es adivinar.

## When to Use

- Iniciar un proyecto o feature nuevo
- Los requisitos son ambiguos o incompletos
- El cambio afecta múltiples archivos o módulos
- Estás a punto de tomar una decisión arquitectónica
- La tarea tomaría más de 30 minutos en implementarse

**When NOT to use:** Correcciones de una sola línea, arreglo de typos o cambios donde los requisitos son inequívocos y autocontenidos.

## The Gated Workflow

El spec-driven development tiene cuatro fases. No avances a la siguiente fase hasta que la actual esté validada.

```
SPECIFY ──→ PLAN ──→ TASKS ──→ IMPLEMENT
   │          │        │          │
   ▼          ▼        ▼          ▼
 Human      Human    Human      Human
 reviews    reviews  reviews    reviews
```

### Phase 1: Specify

Comienza con una visión de alto nivel. Haz preguntas de aclaración al humano hasta que los requisitos sean concretos.

**Surface assumptions immediately.** Antes de escribir cualquier contenido de la especificación, lista lo que estás asumiendo:

```
ASSUMPTIONS I'M MAKING:
1. This is a web application (not native mobile)
2. Authentication uses session-based cookies (not JWT)
3. The database is PostgreSQL (based on existing Prisma schema)
4. We're targeting modern browsers only (no IE11)
→ Correct me now or I'll proceed with these.
```

No completes en silencio los requisitos ambiguos. Todo el propósito de la especificación es sacar a la luz malentendidos *antes* de que se escriba código: las suposiciones son la forma más peligrosa de malentendido.

**Write a spec document covering these six core areas:**

1. **Objective** — ¿Qué estamos construyendo y por qué? ¿Quién es el usuario? ¿Qué significa el éxito?

2. **Commands** — Comandos ejecutables completos con flags, no solo nombres de herramientas.
   ```
   Build: npm run build
   Test: npm test -- --coverage
   Lint: npm run lint --fix
   Dev: npm run dev
   ```

3. **Project Structure** — Dónde vive el código fuente, dónde van los tests, dónde pertenecen los docs.
   ```
   src/           → Application source code
   src/components → React components
   src/lib        → Shared utilities
   tests/         → Unit and integration tests
   e2e/           → End-to-end tests
   docs/          → Documentation
   ```

4. **Code Style** — Un fragmento de código real que muestre tu estilo vale más que tres párrafos describiéndolo. Incluye convenciones de nomenclatura, reglas de formato y ejemplos de buena salida.

5. **Testing Strategy** — Qué framework, dónde viven los tests, expectativas de cobertura, qué niveles de test para qué preocupaciones.

6. **Boundaries** — Sistema de tres niveles:
   - **Always do:** Ejecutar tests antes de commits, seguir convenciones de nomenclatura, validar inputs
   - **Ask first:** Cambios en el esquema de base de datos, añadir dependencias, cambiar config de CI
   - **Never do:** Hacer commit de secrets, editar directorios vendor, eliminar tests fallidos sin aprobación

**Spec template:**

```markdown
# Spec: [Project/Feature Name]

## Objective
[What we're building and why. User stories or acceptance criteria.]

## Tech Stack
[Framework, language, key dependencies with versions]

## Commands
[Build, test, lint, dev — full commands]

## Project Structure
[Directory layout with descriptions]

## Code Style
[Example snippet + key conventions]

## Testing Strategy
[Framework, test locations, coverage requirements, test levels]

## Boundaries
- Always: [...]
- Ask first: [...]
- Never: [...]

## Success Criteria
[How we'll know this is done — specific, testable conditions]

## Open Questions
[Anything unresolved that needs human input]
```

**Reframe instructions as success criteria.** Al recibir requisitos vagos, tradúcelos en condiciones concretas:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED SUCCESS CRITERIA:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ Are these the right targets?
```

Esto te permite iterar, reintentar y resolver problemas hacia una meta clara en lugar de adivinar qué significa "más rápido".

### Phase 2: Plan

Con la especificación validada, genera un plan de implementación técnica:

1. Identifica los componentes principales y sus dependencias
2. Determina el orden de implementación (qué debe construirse primero)
3. Anota riesgos y estrategias de mitigación
4. Identifica qué puede construirse en paralelo vs. qué debe ser secuencial
5. Define puntos de verificación entre fases

El plan debe ser revisable: el humano debe poder leerlo y decir "sí, ese es el enfoque correcto" o "no, cambia X".

### Phase 3: Tasks

Descompón el plan en tareas discretas e implementables:

- Cada tarea debe poder completarse en una sesión enfocada
- Cada tarea tiene criterios de aceptación explícitos
- Cada tarea incluye un paso de verificación (test, build, manual check)
- Las tareas están ordenadas por dependencia, no por importancia percibida
- Ninguna tarea debería requerir cambiar más de ~5 archivos

**Task template:**
```markdown
- [ ] Task: [Description]
  - Acceptance: [What must be true when done]
  - Verify: [How to confirm — test command, build, manual check]
  - Files: [Which files will be touched]
```

### Phase 4: Implement

Ejecuta las tareas una a una siguiendo las skills de `incremental-implementation` y `test-driven-development`. Usa `context-engineering` para cargar las secciones correctas de la especificación y los archivos fuente en cada paso, en lugar de inundar al agente con la especificación completa.

## Keeping the Spec Alive

La especificación es un documento vivo, no un artefacto de una sola vez:

- **Update when decisions change** — Si descubres que el modelo de datos necesita cambiar, actualiza la especificación primero, luego implementa.
- **Update when scope changes** — Los features añadidos o eliminados deben reflejarse en la especificación.
- **Commit the spec** — La especificación pertenece al control de versiones junto con el código.
- **Reference the spec in PRs** — Enlaza de vuelta a la sección de la especificación que implementa cada PR.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is simple, I don't need a spec" | Las tareas simples no necesitan especificaciones *largas*, pero aún necesitan criterios de aceptación. Una especificación de dos líneas está bien. |
| "I'll write the spec after I code it" | Eso es documentación, no especificación. El valor de la especificación está en forzar claridad *antes* del código. |
| "The spec will slow us down" | Una especificación de 15 minutos previene horas de retrabajo. Waterfall en 15 minutos vence a debuggear en 15 horas. |
| "Requirements will change anyway" | Por eso la especificación es un documento vivo. Una especificación desactualizada sigue siendo mejor que ninguna especificación. |
| "The user knows what they want" | Incluso las solicitudes claras tienen suposiciones implícitas. La especificación saca esas suposiciones a la luz. |

## Red Flags

- Empezar a escribir código sin requisitos escritos
- Preguntar "¿debería empezar a construir?" antes de aclarar qué significa "terminado"
- Implementar features no mencionados en ninguna especificación o lista de tareas
- Tomar decisiones arquitectónicas sin documentarlas
- Saltarse la especificación porque "es obvio qué construir"

## Verification

Antes de pasar a la implementación, confirma:

- [ ] La especificación cubre las seis áreas principales
- [ ] El humano ha revisado y aprobado la especificación
- [ ] Los criterios de éxito son específicos y testeables
- [ ] Los límites (Always/Ask First/Never) están definidos
- [ ] La especificación se guarda en un archivo en el repositorio
