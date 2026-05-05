---
name: source-driven-development
description: Fundamenta cada decisión de implementación en la documentación oficial. Úsalo cuando quieras código con autoridad y citas de fuentes, libre de patrones obsoletos. Úsalo cuando construyas con cualquier framework o librería donde la corrección importe.
---

# Source-Driven Development

## Overview

Cada decisión de código específica de un framework debe estar respaldada por documentación oficial. No implementes de memoria: verifica, cita y deja que el usuario vea tus fuentes. Los datos de entrenamiento se vuelven obsoletos, las APIs quedan deprecadas, las mejores prácticas evolucionan. Esta skill asegura que el usuario reciba código en el que pueda confiar porque cada patrón se rastrea hasta una fuente autoritativa que puede verificar.

## When to Use

- El usuario quiere código que siga las mejores prácticas actuales para un framework dado
- Construyes boilerplate, código inicial o patrones que se copiarán a lo largo de un proyecto
- El usuario solicita explícitamente una implementación documentada, verificada o "correcta"
- Implementas features donde el enfoque recomendado por el framework importa (forms, routing, data fetching, state management, auth)
- Revisas o mejoras código que usa patrones específicos de un framework
- Cualquier vez que estés a punto de escribir código específico de un framework de memoria

**When NOT to use:**

- La corrección no depende de una versión específica (renombrar variables, corregir typos, mover archivos)
- Lógica pura que funciona igual en todas las versiones (loops, conditionals, data structures)
- El usuario quiere explícitamente velocidad sobre verificación ("solo hazlo rápido")

## The Process

```
DETECT ──→ FETCH ──→ IMPLEMENT ──→ CITE
  │          │           │            │
  ▼          ▼           ▼            ▼
 What       Get the    Follow the   Show your
 stack?     relevant   documented   sources
            docs       patterns
```

### Step 1: Detect Stack and Versions

Lee el archivo de dependencias del proyecto para identificar versiones exactas:

```
package.json    → Node/React/Vue/Angular/Svelte
composer.json   → PHP/Symfony/Laravel
requirements.txt / pyproject.toml → Python/Django/Flask
go.mod          → Go
Cargo.toml      → Rust
Gemfile         → Ruby/Rails
```

Declara explícitamente lo que encontraste:

```
STACK DETECTED:
- React 19.1.0 (from package.json)
- Vite 6.2.0
- Tailwind CSS 4.0.3
→ Fetching official docs for the relevant patterns.
```

Si faltan versiones o son ambiguas, **pregúntale al usuario**. No adivines: la versión determina qué patrones son correctos.

### Step 2: Fetch Official Documentation

Obtén la página específica de documentación para el feature que estás implementando. No la página de inicio, no toda la documentación: la página relevante.

**Source hierarchy (in order of authority):**

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Official documentation | react.dev, docs.djangoproject.com, symfony.com/doc |
| 2 | Official blog / changelog | react.dev/blog, nextjs.org/blog |
| 3 | Web standards references | MDN, web.dev, html.spec.whatwg.org |
| 4 | Browser/runtime compatibility | caniuse.com, node.green |

**Not authoritative — never cite as primary sources:**

- Stack Overflow answers
- Blog posts or tutorials (even popular ones)
- AI-generated documentation or summaries
- Your own training data (that is the whole point — verify it)

**Be precise with what you fetch:**

```
BAD:  Fetch the React homepage
GOOD: Fetch react.dev/reference/react/useActionState

BAD:  Search "django authentication best practices"
GOOD: Fetch docs.djangoproject.com/en/6.0/topics/auth/
```

Después de obtener la documentación, extrae los patrones clave y anota cualquier advertencia de deprecación o guía de migración.

Cuando las fuentes oficiales entran en conflicto entre sí (p. ej., una guía de migración contradice la referencia de la API), presenta la discrepancia al usuario y verifica qué patrón funciona realmente contra la versión detectada.

### Step 3: Implement Following Documented Patterns

Escribe código que coincida con lo que muestra la documentación:

- Usa las firmas de API de los docs, no de memoria
- Si los docs muestran una nueva forma de hacer algo, usa la nueva forma
- Si los docs deprecan un patrón, no uses la versión deprecada
- Si los docs no cubren algo, márcalo como no verificado

**When docs conflict with existing project code:**

```
CONFLICT DETECTED:
The existing codebase uses useState for form loading state,
but React 19 docs recommend useActionState for this pattern.
(Source: react.dev/reference/react/useActionState)

Options:
A) Use the modern pattern (useActionState) — consistent with current docs
B) Match existing code (useState) — consistent with codebase
→ Which approach do you prefer?
```

Presenta el conflicto. No elijas uno en silencio.

### Step 4: Cite Your Sources

Cada patrón específico de un framework recibe una cita. El usuario debe poder verificar cada decisión.

**In code comments:**

```typescript
// React 19 form handling with useActionState
// Source: https://react.dev/reference/react/useActionState#usage
const [state, formAction, isPending] = useActionState(submitOrder, initialState);
```

**In conversation:**

```
I'm using useActionState instead of manual useState for the
form submission state. React 19 replaced the manual
isPending/setIsPending pattern with this hook.

Source: https://react.dev/blog/2024/12/05/react-19#actions
"useTransition now supports async functions [...] to handle
pending states automatically"
```

**Citation rules:**

- Full URLs, not shortened
- Prefer deep links with anchors where possible (e.g. `/useActionState#usage` over `/useActionState`) — los anchors sobreviven mejor a la reestructuración de documentos que las páginas de nivel superior
- Cita el pasaje relevante cuando respalde una decisión no obvia
- Incluye datos de soporte de navegador/runtime al recomendar features de plataforma
- Si no puedes encontrar documentación para un patrón, dílo explícitamente:

```
UNVERIFIED: I could not find official documentation for this
pattern. This is based on training data and may be outdated.
Verify before using in production.
```

La honestidad sobre lo que no pudiste verificar es más valiosa que una falsa confianza.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'm confident about this API" | La confianza no es evidencia. Los datos de entrenamiento contienen patrones obsoletos que parecen correctos pero fallan contra versiones actuales. Verifica. |
| "Fetching docs wastes tokens" | Alucinar una API desperdicia más. El usuario debuguea durante una hora y luego descubre que la firma de la función cambió. Un fetch previene horas de retrabajo. |
| "The docs won't have what I need" | Si los docs no lo cubren, esa es información valiosa: el patrón puede no estar oficialmente recomendado. |
| "I'll just mention it might be outdated" | Un disclaimer no ayuda. O verifica y cita, o márcalo claramente como no verificado. La duda a medias es la peor opción. |
| "This is a simple task, no need to check" | Las tareas simples con patrones equivocados se convierten en plantillas. El usuario copia tu handler de formularios deprecado en diez componentes antes de descubrir que existe el enfoque moderno. |

## Red Flags

- Escribir código específico de un framework sin consultar los docs para esa versión
- Usar "I believe" o "I think" sobre una API en lugar de citar la fuente
- Implementar un patrón sin saber a qué versión aplica
- Citar Stack Overflow o blog posts en lugar de documentación oficial
- Usar APIs deprecadas porque aparecen en los datos de entrenamiento
- No leer `package.json` / archivos de dependencias antes de implementar
- Entregar código sin citas de fuentes para decisiones específicas de un framework
- Obtener un sitio de documentación completo cuando solo una página es relevante

## Verification

Después de implementar con source-driven development:

- [ ] Las versiones de framework y librerías fueron identificadas desde el archivo de dependencias
- [ ] La documentación oficial fue obtenida para patrones específicos del framework
- [ ] Todas las fuentes son documentación oficial, no blog posts ni datos de entrenamiento
- [ ] El código sigue los patrones mostrados en la documentación de la versión actual
- [ ] Las decisiones no triviales incluyen citas de fuentes con URLs completas
- [ ] No se usan APIs deprecadas (verificado contra guías de migración)
- [ ] Los conflictos entre docs y código existente fueron presentados al usuario
- [ ] Todo lo que no pudo verificarse está marcado explícitamente como no verificado
