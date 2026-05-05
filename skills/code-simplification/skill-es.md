---
name: code-simplification
description: Simplifica el código para claridad. Usar al refactorizar código para claridad sin cambiar el comportamiento. Usar cuando el código funciona pero es más difícil de leer, mantener o extender de lo que debería. Usar al revisar código que ha acumulado complejidad innecesaria.
---

# Code Simplification

> Inspirado por el [Claude Code Simplifier plugin](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md). Adaptado aquí como una skill agnóstica de modelo, orientada a procesos, para cualquier agente de coding de IA.

## Visión general

Simplifica el código reduciendo la complejidad mientras se preserva el comportamiento exacto. El objetivo no es menos líneas —es código que sea más fácil de leer, entender, modificar y depurar. Cada simplificación debe pasar una prueba simple: "¿Un nuevo miembro del equipo entendería esto más rápido que el original?"

## Cuándo usar

- Después de que una feature funciona y los tests pasan, pero la implementación se siente más pesada de lo necesario
- Durante el code review cuando se señalan problemas de readability o complejidad
- Cuando encuentras lógica profundamente anidada, funciones largas o nombres poco claros
- Al refactorizar código escrito bajo presión de tiempo
- Al consolidar lógica relacionada dispersa en varios archivos
- Después de mergear cambios que introdujeron duplicación o inconsistencia

**Cuándo NO usar:**

- El código ya está limpio y legible —no simplifiques por simplificar
- Aún no entiendes qué hace el código —comprende antes de simplificar
- El código es crítico para performance y la versión "más simple" sería mediblemente más lenta
- Estás a punto de reescribir el módulo por completo —simplificar código descartable es desperdiciar esfuerzo

## The Five Principles

### 1. Preserve Behavior Exactly

No cambies lo que el código hace —solo cómo lo expresa. Todos los inputs, outputs, side effects, comportamiento de error y edge cases deben permanecer idénticos. Si no estás seguro de que una simplificación preserva el comportamiento, no la hagas.

```
PREGUNTA ANTES DE CADA CAMBIO:
→ ¿Produce el mismo output para cada input?
→ ¿Mantiene el mismo comportamiento de error?
→ ¿Preserva los mismos side effects y ordenamiento?
→ ¿Todos los tests existentes siguen pasando sin modificación?
```

### 2. Follow Project Conventions

La simplificación significa hacer el código más consistente con la codebase, no imponer preferencias externas. Antes de simplificar:

```
1. Lee CLAUDE.md / convenciones del proyecto
2. Estudia cómo el código vecino maneja patrones similares
3. Coincide con el estilo del proyecto en:
   - Orden de imports y sistema de módulos
   - Estilo de declaración de funciones
   - Convenciones de nombres
   - Patrones de manejo de errores
   - Profundidad de anotaciones de tipo
```

La simplificación que rompe la consistencia del proyecto no es simplificación —es churn.

### 3. Prefer Clarity Over Cleverness

El código explícito es mejor que el código compacto cuando la versión compacta requiere una pausa mental para parsear.

```typescript
// UNCLEAR: Cadena densa de ternarios
const label = isNew ? 'New' : isUpdated ? 'Updated' : isArchived ? 'Archived' : 'Active';

// CLEAR: Mapeo legible
function getStatusLabel(item: Item): string {
  if (item.isNew) return 'New';
  if (item.isUpdated) return 'Updated';
  if (item.isArchived) return 'Archived';
  return 'Active';
}
```

```typescript
// UNCLEAR: Reduces encadenados con lógica inline
const result = items.reduce((acc, item) => ({
  ...acc,
  [item.id]: { ...acc[item.id], count: (acc[item.id]?.count ?? 0) + 1 }
}), {});

// CLEAR: Paso intermedio con nombre
const countById = new Map<string, number>();
for (const item of items) {
  countById.set(item.id, (countById.get(item.id) ?? 0) + 1);
}
```

### 4. Maintain Balance

La simplificación tiene un modo de fallo: la sobre-simplificación. Vigila estas trampas:

- **Inlinear demasiado agresivamente** —eliminar un helper que le daba nombre a un concepto hace que el call site sea más difícil de leer
- **Combinar lógica no relacionada** —dos funciones simples fusionadas en una compleja no es más simple
- **Eliminar "abstracción innecesaria"** —algunas abstracciones existen por extensibilidad o testabilidad, no por complejidad
- **Optimizar por conteo de líneas** —menos líneas no es el objetivo; la comprensión más fácil sí lo es

### 5. Scope to What Changed

Por defecto, simplifica el código modificado recientemente. Evita refactors drive-by de código no relacionado a menos que te pidan explícitamente ampliar el alcance. La simplificación sin alcance crea ruido en los diffs y riesgo de regresiones no intencionales.

## The Simplification Process

### Paso 1: Entender antes de tocar (Chesterton's Fence)

Antes de cambiar o eliminar algo, entiende por qué existe. Esto es Chesterton's Fence: si ves una cerca cruzando un camino y no entiendes por qué está ahí, no la derribes. Primero entiende la razón, luego decide si la razón aún aplica.

```
ANTES DE SIMPLIFICAR, RESPONDE:
- ¿Cuál es la responsabilidad de este código?
- ¿Qué lo llama? ¿A qué llama?
- ¿Cuáles son los edge cases y caminos de error?
- ¿Hay tests que definan el comportamiento esperado?
- ¿Por qué podría haberse escrito de esta forma? (¿Performance? ¿Restricción de plataforma? ¿Razón histórica?)
- Revisa git blame: ¿cuál era el contexto original de este código?
```

Si no puedes responder estas preguntas, no estás listo para simplificar. Lee más contexto primero.

### Paso 2: Identificar oportunidades de simplificación

Escanea estos patrones —cada uno es una señal concreta, no un olor vago:

**Complejidad estructural:**

| Patrón | Señal | Simplificación |
|---------|--------|----------------|
| Anidamiento profundo (3+ niveles) | Flujo de control difícil de seguir | Extrae condiciones en guard clauses o funciones helper |
| Funciones largas (50+ líneas) | Múltiples responsabilidades | Divide en funciones enfocadas con nombres descriptivos |
| Ternarios anidados | Requiere stack mental para parsear | Reemplaza con cadenas if/else, switch o objetos de búsqueda |
| Boolean parameter flags | `doThing(true, false, true)` | Reemplaza con options objects o funciones separadas |
| Condicionales repetidos | El mismo `if` en varios lugares | Extrae a una función predicado bien nombrada |

**Nombres y legibilidad:**

| Patrón | Señal | Simplificación |
|---------|--------|----------------|
| Nombres genéricos | `data`, `result`, `temp`, `val`, `item` | Renombra para describir el contenido: `userProfile`, `validationErrors` |
| Nombres abreviados | `usr`, `cfg`, `btn`, `evt` | Usa palabras completas a menos que la abreviatura sea universal (`id`, `url`, `api`) |
| Nombres engañosos | Función llamada `get` que también muta estado | Renombra para reflejar el comportamiento real |
| Comentarios explicando "qué" | `// increment counter` sobre `count++` | Elimina el comentario —el código ya es suficientemente claro |
| Comentarios explicando "por qué" | `// Retry because the API is flaky under load` | Conserva estos —transportan intención que el código no puede expresar |

**Redundancia:**

| Patrón | Señal | Simplificación |
|---------|--------|----------------|
| Lógica duplicada | Las mismas 5+ líneas en varios lugares | Extrae a una función compartida |
| Código muerto | Ramas inalcanzables, variables no usadas, bloques comentados | Elimina (después de confirmar que está realmente muerto) |
| Abstracciones innecesarias | Wrapper que no agrega valor | Inlinea el wrapper, llama la función subyacente directamente |
| Patrones over-engineered | Factory-for-a-factory, strategy-with-one-strategy | Reemplaza con el enfoque directo simple |
| Type assertions redundantes | Casting a un tipo que ya está inferido | Elimina la aserción |

### Paso 3: Aplicar cambios incrementalmente

Haz una simplificación a la vez. Ejecuta tests después de cada cambio. **Envía cambios de refactoring por separado de cambios de feature o bug fix.** Un PR que refactoriza y agrega una feature son dos PRs —divídelos.

```
PARA CADA SIMPLIFICACIÓN:
1. Haz el cambio
2. Ejecuta el test suite
3. Si los tests pasan → commit (o continúa con la siguiente simplificación)
4. Si los tests fallan → revierte y reconsidera
```

Evita agrupar múltiples simplificaciones en un solo cambio no testeado. Si algo se rompe, necesitas saber qué simplificación lo causó.

**The Rule of 500:** Si un refactoring tocaría más de 500 líneas, invierte en automatización (codemods, scripts sed, AST transforms) en lugar de hacer los cambios a mano. Las ediciones manuales a esa escala son propensas a errores y agotadoras de revisar.

### Paso 4: Verificar el resultado

Después de todas las simplificaciones, da un paso atrás y evalúa el conjunto:

```
COMPARA ANTES Y DESPUÉS:
- ¿La versión simplificada es genuinamente más fácil de entender?
- ¿Introdujiste algún patrón inconsistente con la codebase?
- ¿El diff es limpio y revisable?
- ¿Un compañero aprobaría este cambio?
```

Si la versión "simplificada" es más difícil de entender o revisar, reviértela. No todo intento de simplificación tiene éxito.

## Language-Specific Guidance

### TypeScript / JavaScript

```typescript
// SIMPLIFY: Wrapper async innecesario
// Before
async function getUser(id: string): Promise<User> {
  return await userService.findById(id);
}
// After
function getUser(id: string): Promise<User> {
  return userService.findById(id);
}

// SIMPLIFY: Asignación condicional verbosa
// Before
let displayName: string;
if (user.nickname) {
  displayName = user.nickname;
} else {
  displayName = user.fullName;
}
// After
const displayName = user.nickname || user.fullName;

// SIMPLIFY: Construcción manual de array
// Before
const activeUsers: User[] = [];
for (const user of users) {
  if (user.isActive) {
    activeUsers.push(user);
  }
}
// After
const activeUsers = users.filter((user) => user.isActive);

// SIMPLIFY: Retorno booleano redundante
// Before
function isValid(input: string): boolean {
  if (input.length > 0 && input.length < 100) {
    return true;
  }
  return false;
}
// After
function isValid(input: string): boolean {
  return input.length > 0 && input.length < 100;
}
```

### Python

```python
# SIMPLIFY: Construcción verbosa de diccionario
# Before
result = {}
for item in items:
    result[item.id] = item.name
# After
result = {item.id: item.name for item in items}

# SIMPLIFY: Condicionales anidados con retorno temprano
# Before
def process(data):
    if data is not None:
        if data.is_valid():
            if data.has_permission():
                return do_work(data)
            else:
                raise PermissionError("No permission")
        else:
            raise ValueError("Invalid data")
    else:
        raise TypeError("Data is None")
# After
def process(data):
    if data is None:
        raise TypeError("Data is None")
    if not data.is_valid():
        raise ValueError("Invalid data")
    if not data.has_permission():
        raise PermissionError("No permission")
    return do_work(data)
```

### React / JSX

```tsx
// SIMPLIFY: Renderizado condicional verboso
// Before
function UserBadge({ user }: Props) {
  if (user.isAdmin) {
    return <Badge variant="admin">Admin</Badge>;
  } else {
    return <Badge variant="default">User</Badge>;
  }
}
// After
function UserBadge({ user }: Props) {
  const variant = user.isAdmin ? 'admin' : 'default';
  const label = user.isAdmin ? 'Admin' : 'User';
  return <Badge variant={variant}>{label}</Badge>;
}

// SIMPLIFY: Prop drilling a través de componentes intermedios
// Before — considera si el contexto o la composición resuelven esto mejor.
// Esta es una decisión de juicio —señálalo, no refactores automáticamente.
```

## Justificaciones comunes

| Justificación | Realidad |
|---|---|
| "Está funcionando, no hay necesidad de tocarlo" | El código que funciona pero es difícil de leer será difícil de arreglar cuando se rompa. Simplificar ahora ahorra tiempo en cada cambio futuro. |
| "Menos líneas siempre es más simple" | Un ternario anidado de 1 línea no es más simple que un if/else de 5 líneas. La simplicidad se mide por velocidad de comprensión, no por conteo de líneas. |
| "Rápidamente simplificaré este código no relacionado también" | La simplificación sin alcance crea diffs ruidosos y riesgo de regresiones en código que no pretendías cambiar. Mantente enfocado. |
| "Los tipos lo hacen auto-documentado" | Los tipos documentan estructura, no intención. Una función bien nombrada explica *por qué* mejor que una firma de tipo explica *qué*. |
| "Esta abstracción podría ser útil más tarde" | No preserves abstracciones especulativas. Si no se usa ahora, es complejidad sin valor. Elimínala y vuelve a agregar cuando sea necesario. |
| "El autor original debió tener una razón" | Quizás. Revisa git blame —aplica Chesterton's Fence. Pero la complejidad acumulada a menudo no tiene razón; es solo el residuo de iteración bajo presión. |
| "Refactorizaré mientras agrego esta feature" | Separa el refactoring del trabajo de feature. Los cambios mixtos son más difíciles de revisar, revertir y entender en el historial. |

## Señales de alerta

- Simplificación que requiere modificar tests para pasar (probablemente cambiaste comportamiento)
- Código "simplificado" que es más largo y difícil de seguir que el original
- Renombrar cosas para que coincidan con tus preferencias en lugar de las convenciones del proyecto
- Eliminar manejo de errores porque "hace el código más limpio"
- Simplificar código que no entiendes completamente
- Agrupar muchas simplificaciones en un solo commit grande y difícil de revisar
- Refactorizar código fuera del alcance de la tarea actual sin que te lo pidan

## Verificación

Después de completar una pasada de simplificación:

- [ ] Todos los tests existentes pasan sin modificación
- [ ] El build tiene éxito sin nuevas advertencias
- [ ] Linter/formatter pasa (sin regresiones de estilo)
- [ ] Cada simplificación es un cambio revisable e incremental
- [ ] El diff es limpio —sin cambios no relacionados mezclados
- [ ] El código simplificado sigue las convenciones del proyecto (verificado contra CLAUDE.md o equivalente)
- [ ] No se eliminó ni debilitó el manejo de errores
- [ ] No quedó código muerto (imports no usados, ramas inalcanzables)
- [ ] Un compañero o agente de revisión aprobaría el cambio como una mejora neta
