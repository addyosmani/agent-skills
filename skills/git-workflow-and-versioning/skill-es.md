---
name: git-workflow-and-versioning
description: Estructura las prácticas de flujo de trabajo con git. Úsalo al realizar cualquier cambio de código. Úsalo al hacer commit, crear ramas, resolver conflictos o cuando necesites organizar el trabajo en múltiples flujos paralelos.
---

# Git Workflow and Versioning

## Overview

Git es tu red de seguridad. Trata los commits como puntos de guardado, las ramas como entornos aislados y el historial como documentación. Cuando los agentes de IA generan código a alta velocidad, un control de versiones disciplinado es el mecanismo que mantiene los cambios manejables, revisables y reversibles.

## When to Use

Siempre. Todo cambio de código fluye a través de git.

## Core Principles

### Trunk-Based Development (Recommended)

Mantén `main` siempre desplegable. Trabaja en ramas de feature de corta duración que se integran de nuevo en 1-3 días. Las ramas de desarrollo de larga duración son costos ocultos: divergen, generan conflictos de merge y retrasan la integración. La investigación de DORA muestra consistentemente que el trunk-based development se correlaciona con equipos de ingeniería de alto rendimiento.

```
main ──●──●──●──●──●──●──●──●──●──  (always deployable)
         ╲      ╱  ╲    ╱
          ●──●─╱    ●──╱    ← short-lived feature branches (1-3 days)
```

Este es el valor por defecto recomendado. Los equipos que usan gitflow o ramas de larga duración pueden adaptar los principios (commits atómicos, cambios pequeños, mensajes descriptivos) a su modelo de ramas — la disciplina de commit importa más que la estrategia de ramificación específica.

- **Las ramas de desarrollo son costos.** Cada día que una rama existe, acumula riesgo de merge.
- **Las ramas de release son aceptables.** Cuando necesitas estabilizar un release mientras main avanza.
- **Feature flags > ramas largas.** Prefiere desplegar trabajo incompleto detrás de flags en lugar de mantenerlo en una rama durante semanas.

### 1. Commit Early, Commit Often

Cada incremento exitoso recibe su propio commit. No acumules cambios grandes sin commitear.

```
Work pattern:
  Implement slice → Test → Verify → Commit → Next slice

Not this:
  Implement everything → Hope it works → Giant commit
```

Los commits son puntos de guardado. Si el siguiente cambio rompe algo, puedes revertir al último estado conocido al instante.

### 2. Atomic Commits

Cada commit hace una cosa lógica:

```
# Good: Each commit is self-contained
git log --oneline
a1b2c3d Add task creation endpoint with validation
d4e5f6g Add task creation form component
h7i8j9k Connect form to API and add loading state
m1n2o3p Add task creation tests (unit + integration)

# Bad: Everything mixed together
git log --oneline
x1y2z3a Add task feature, fix sidebar, update deps, refactor utils
```

### 3. Descriptive Messages

Los mensajes de commit explican el *porqué*, no solo el *qué*:

```
# Good: Explains intent
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
Uses Zod schema validation at the route handler level,
consistent with existing validation patterns in auth.ts.

# Bad: Describes what's obvious from the diff
update auth.ts
```

**Format:**
```
<type>: <short description>

<optional body explaining why, not what>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `test` — Adding or updating tests
- `docs` — Documentation only
- `chore` — Tooling, dependencies, config

### 4. Keep Concerns Separate

No combines cambios de formato con cambios de comportamiento. No combines refactors con features. Cada tipo de cambio debería ser un commit separado — y idealmente un PR separado:

```
# Good: Separate concerns
git commit -m "refactor: extract validation logic to shared utility"
git commit -m "feat: add phone number validation to registration"

# Bad: Mixed concerns
git commit -m "refactor validation and add phone number field"
```

**Separa el refactoring del trabajo de feature.** Un cambio de refactor y un cambio de feature son dos cambios distintos: envíalos por separado. Esto hace que cada cambio sea más fácil de revisar, revertir y entender en el historial. Las limpiezas pequeñas (renombrar una variable) pueden incluirse en un commit de feature a discreción del revisor.

### 5. Size Your Changes

Apunta a ~100 líneas por commit/PR. Los cambios de más de ~1000 líneas deberían dividirse. Consulta las estrategias de división en `code-review-and-quality` para saber cómo desglosar cambios grandes.

```
~100 lines  → Easy to review, easy to revert
~300 lines  → Acceptable for a single logical change
~1000 lines → Split into smaller changes
```

## Branching Strategy

### Feature Branches

```
main (always deployable)
  │
  ├── feature/task-creation    ← One feature per branch
  ├── feature/user-settings    ← Parallel work
  └── fix/duplicate-tasks      ← Bug fixes
```

- Crea la rama desde `main` (o la rama por defecto del equipo)
- Mantén las ramas de corta duración (integra en 1-3 días) — las ramas de larga duración son costos ocultos
- Elimina las ramas después del merge
- Prefiere feature flags en lugar de ramas de larga duración para features incompletos

### Branch Naming

```
feature/<short-description>   → feature/task-creation
fix/<short-description>       → fix/duplicate-tasks
chore/<short-description>     → chore/update-deps
refactor/<short-description>  → refactor/auth-module
```

## Working with Worktrees

Para trabajo paralelo de agentes de IA, usa git worktrees para ejecutar múltiples ramas simultáneamente:

```bash
# Create a worktree for a feature branch
git worktree add ../project-feature-a feature/task-creation
git worktree add ../project-feature-b feature/user-settings

# Each worktree is a separate directory with its own branch
# Agents can work in parallel without interfering
ls ../
  project/              ← main branch
  project-feature-a/    ← task-creation branch
  project-feature-b/    ← user-settings branch

# When done, merge and clean up
git worktree remove ../project-feature-a
```

Benefits:
- Múltiples agentes pueden trabajar en diferentes features simultáneamente
- No se necesita cambiar de rama (cada directorio tiene su propia rama)
- Si un experimento falla, elimina el worktree — no se pierde nada
- Los cambios están aislados hasta que se fusionen explícitamente

## The Save Point Pattern

```
Agent starts work
    │
    ├── Makes a change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    ├── Makes another change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    └── Feature complete → All commits form a clean history
```

Este patrón significa que nunca pierdes más de un incremento de trabajo. Si un agente se desvía, `git reset --hard HEAD` te devuelve al último estado exitoso.

## Change Summaries

Después de cualquier modificación, proporciona un resumen estructurado. Esto facilita la revisión, documenta la disciplina de alcance y pone en evidencia cambios no intencionados:

```
CHANGES MADE:
- src/routes/tasks.ts: Added validation middleware to POST endpoint
- src/lib/validation.ts: Added TaskCreateSchema using Zod

THINGS I DIDN'T TOUCH (intentionally):
- src/routes/auth.ts: Has similar validation gap but out of scope
- src/middleware/error.ts: Error format could be improved (separate task)

POTENTIAL CONCERNS:
- The Zod schema is strict — rejects extra fields. Confirm this is desired.
- Added zod as a dependency (72KB gzipped) — already in package.json
```

Este patrón detecta suposiciones incorrectas temprano y proporciona a los revisores un mapa claro del cambio. La sección "DIDN'T TOUCH" es especialmente importante — demuestra que ejercitaste disciplina de alcance y no realizaste una renovación no solicitada.

## Pre-Commit Hygiene

Antes de cada commit:

```bash
# 1. Check what you're about to commit
git diff --staged

# 2. Ensure no secrets
git diff --staged | grep -i "password\|secret\|api_key\|token"

# 3. Run tests
npm test

# 4. Run linting
npm run lint

# 5. Run type checking
npx tsc --noEmit
```

Automatiza esto con git hooks:

```json
// package.json (using lint-staged + husky)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Handling Generated Files

- **Commitea archivos generados** solo si el proyecto los espera (por ejemplo, `package-lock.json`, migraciones de Prisma)
- **No commitees** output de build (`dist/`, `.next/`), archivos de entorno (`.env`) o configuración del IDE (`.vscode/settings.json` a menos que se comparta)
- **Ten un `.gitignore`** que cubra: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.pem`

## Using Git for Debugging

```bash
# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# Git checkouts midpoints; run your test at each to narrow down

# View what changed recently
git log --oneline -20
git diff HEAD~5..HEAD -- src/

# Find who last changed a specific line
git blame src/services/task.ts

# Search commit messages for a keyword
git log --grep="validation" --oneline
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll commit when the feature is done" | Un commit gigante es imposible de revisar, depurar o revertir. Commitea cada porción. |
| "The message doesn't matter" | Los mensajes son documentación. El tú del futuro (y los agentes futuros) necesitará entender qué cambió y por qué. |
| "I'll squash it all later" | Hacer squash destruye la narrativa del desarrollo. Prefiere commits incrementales limpios desde el inicio. |
| "Branches add overhead" | Las ramas de corta duración son gratuitas y evitan que el trabajo en conflicto colisione. Las ramas de larga duración son el problema — integra en 1-3 días. |
| "I'll split this change later" | Los cambios grandes son más difíciles de revisar, más riesgosos de desplegar y más difíciles de revertir. Divídelos antes de enviarlos, no después. |
| "I don't need a .gitignore" | Hasta que `.env` con secretos de producción se commitea. Configúralo inmediatamente. |

## Red Flags

- Cambios grandes sin commitear acumulándose
- Mensajes de commit como "fix", "update", "misc"
- Cambios de formato mezclados con cambios de comportamiento
- No hay `.gitignore` en el proyecto
- Commitear `node_modules/`, `.env` o artefactos de build
- Ramas de larga duración que divergen significativamente de main
- Force-push a ramas compartidas

## Verification

Para cada commit:

- [ ] El commit hace una cosa lógica
- [ ] El mensaje explica el porqué y sigue las convenciones de tipo
- [ ] Los tests pasan antes de commitear
- [ ] No hay secretos en el diff
- [ ] No hay cambios solo de formato mezclados con cambios de comportamiento
- [ ] El `.gitignore` cubre exclusiones estándar
