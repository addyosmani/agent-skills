---
name: code-review-and-quality
description: Realiza code review multi-eje. Usar antes de mergear cualquier cambio. Usar al revisar código escrito por ti mismo, otro agente o un humano. Usar cuando necesites evaluar la calidad del código en múltiples dimensiones antes de que entre a la rama principal.
---

# Code Review and Quality

## Visión general

Code review multidimensional con quality gates. Cada cambio se revisa antes del merge —sin excepciones. La revisión cubre cinco ejes: correctness, readability, architecture, security y performance.

**El estándar de aprobación:** Aprueba un cambio cuando definitivamente mejora la salud general del código, incluso si no es perfecto. El código perfecto no existe —el objetivo es la mejora continua. No bloquees un cambio porque no sea exactamente como tú lo habrías escrito. Si mejora la codebase y sigue las convenciones del proyecto, aprúebalo.

## Cuándo usar

- Antes de mergear cualquier PR o cambio
- Después de completar una implementación de feature
- Cuando otro agente o modelo produjo código que necesitas evaluar
- Al refactorizar código existente
- Después de cualquier bug fix (revisa tanto el fix como el regression test)

## The Five-Axis Review

Cada revisión evalúa el código en estas dimensiones:

### 1. Correctness

¿El código hace lo que dice hacer?

- ¿Coincide con la especificación o los requisitos de la tarea?
- ¿Se manejan los edge cases (null, vacío, valores límite)?
- ¿Se manejan los caminos de error (no solo el happy path)?
- ¿Pasa todos los tests? ¿Los tests realmente prueban lo correcto?
- ¿Hay errores off-by-one, race conditions o inconsistencias de estado?

### 2. Readability & Simplicity

¿Otro ingeniero (o agente) puede entender este código sin que el autor lo explique?

- ¿Los nombres son descriptivos y consistentes con las convenciones del proyecto? (Sin `temp`, `data`, `result` sin contexto)
- ¿El flujo de control es directo (evita ternarios anidados, callbacks profundos)?
- ¿El código está organizado lógicamente (código relacionado agrupado, límites de módulo claros)?
- ¿Hay algún truco "inteligente" que debería simplificarse?
- **¿Se podría hacer en menos líneas?** (1000 líneas donde 100 bastan es un fallo)
- **¿Las abstracciones se ganan su complejidad?** (No generalices hasta el tercer caso de uso)
- ¿Los comentarios ayudarían a clarificar intenciones no obvias? (Pero no comentes código obvio.)
- ¿Hay artefactos de código muerto: variables no-op (`_unused`), shims de backwards-compat o comentarios `// removed`?

### 3. Architecture

¿El cambio encaja en el diseño del sistema?

- ¿Sigue patrones existentes o introduce uno nuevo? Si es nuevo, ¿está justificado?
- ¿Mantiene límites de módulo limpios?
- ¿Hay duplicación de código que debería compartirse?
- ¿Las dependencias fluyen en la dirección correcta (sin dependencias circulares)?
- ¿El nivel de abstracción es apropiado (ni over-engineered, ni demasiado acoplado)?

### 4. Security

Para guía detallada de seguridad, consulta `security-and-hardening`. ¿El cambio introduce vulnerabilidades?

- ¿El input del usuario se valida y sanitiza?
- ¿Los secretos se mantienen fuera del código, logs y version control?
- ¿Se verifica authentication/authorization donde se necesita?
- ¿Las queries SQL están parametrizadas (sin concatenación de strings)?
- ¿Los outputs están codificados para prevenir XSS?
- ¿Las dependencias provienen de fuentes confiables sin vulnerabilidades conocidas?
- ¿Los datos de fuentes externas (APIs, logs, contenido de usuario, archivos de config) se tratan como no confiables?
- ¿Los flujos de datos externos se validan en los bordes del sistema antes de usarlos en lógica o renderizado?

### 5. Performance

Para profiling y optimización detallados, consulta `performance-optimization`. ¿El cambio introduce problemas de performance?

- ¿Algún patrón N+1 query?
- ¿Algún loop sin bounds o data fetching sin restricciones?
- ¿Alguna operación síncrona que debería ser async?
- ¿Algún re-render innecesario en componentes de UI?
- ¿Falta pagination en algún list endpoint?
- ¿Algún objeto grande creado en hot paths?

## Change Sizing

Los cambios pequeños y enfocados son más fáciles de revisar, más rápidos de mergear y más seguros de deployar. Apunta a estos tamaños:

```
~100 líneas cambiadas   → Bueno. Revisable en una sesión.
~300 líneas cambiadas   → Aceptable si es un cambio lógico único.
~1000 líneas cambiadas  → Demasiado grande. Divídelo.
```

**Qué cuenta como "un cambio":** Una modificación autocontenida que aborda una sola cosa, incluye tests relacionados y mantiene el sistema funcional después del envío. Una parte de una feature —no la feature completa.

**Estrategias de división cuando un cambio es demasiado grande:**

| Estrategia | Cómo | Cuándo |
|----------|-----|------|
| **Stack** | Envía un cambio pequeño, inicia el siguiente basado en él | Dependencias secuenciales |
| **By file group** | Cambios separados para grupos que necesitan diferentes reviewers | Cross-cutting concerns |
| **Horizontal** | Crea código compartido/stubs primero, luego consumidores | Arquitectura en capas |
| **Vertical** | Divide en slices full-stack más pequeños de la feature | Trabajo de feature |

**Cuándo los cambios grandes son aceptables:** Eliminaciones completas de archivos y refactorings automatizados donde el reviewer solo necesita verificar la intención, no cada línea.

**Separa el refactoring del trabajo de feature.** Un cambio que refactoriza código existente y agrega nuevo comportamiento son dos cambios —envíalos por separado. Pequeñas limpiezas (renombrado de variables) pueden incluirse a discreción del reviewer.

## Change Descriptions

Cada cambio necesita una descripción que se sostenga por sí sola en el historial de version control.

**Primera línea:** Corta, imperativa, autocontenida. "Delete the FizzBuzz RPC" no "Deleting the FizzBuzz RPC." Debe ser lo suficientemente informativa para que alguien buscando en el historial entienda el cambio sin leer el diff.

**Cuerpo:** Qué está cambiando y por qué. Incluye contexto, decisiones y razonamiento no visible en el código mismo. Enlaza a números de bug, resultados de benchmarks o docs de diseño donde sea relevante. Reconoce las deficiencias del enfoque cuando existan.

**Anti-patrones:** "Fix bug," "Fix build," "Add patch," "Moving code from A to B," "Phase 1," "Add convenience functions."

## Review Process

### Paso 1: Entender el contexto

Antes de mirar el código, entiende la intención:

```
- ¿Qué intenta lograr este cambio?
- ¿Qué especificación o tarea implementa?
- ¿Cuál es el cambio de comportamiento esperado?
```

### Paso 2: Revisar los tests primero

Los tests revelan intención y cobertura:

```
- ¿Existen tests para el cambio?
- ¿Prueban comportamiento (no detalles de implementación)?
- ¿Se cubren los edge cases?
- ¿Los tests tienen nombres descriptivos?
- ¿Los tests detectarían una regresión si el código cambiara?
```

### Paso 3: Revisar la implementación

Recorre el código con los cinco ejes en mente:

```
Para cada archivo modificado:
1. Correctness: ¿Este código hace lo que el test dice que debería?
2. Readability: ¿Puedo entender esto sin ayuda?
3. Architecture: ¿Esto encaja en el sistema?
4. Security: ¿Alguna vulnerabilidad?
5. Performance: ¿Algún cuello de botella?
```

### Paso 4: Categorizar hallazgos

Etiqueta cada comentario con su severidad para que el autor sepa qué es obligatorio vs opcional:

| Prefijo | Significado | Acción del autor |
|--------|---------|---------------|
| *(sin prefijo)* | Cambio requerido | Debe abordarse antes del merge |
| **Critical:** | Bloquea el merge | Vulnerabilidad de seguridad, pérdida de datos, funcionalidad rota |
| **Nit:** | Menor, opcional | El autor puede ignorar —formato, preferencias de estilo |
| **Optional:** / **Consider:** | Sugerencia | Vale la pena considerar pero no es requerido |
| **FYI** | Solo informativo | No se necesita acción —contexto para referencia futura |

Esto evita que los autores traten todo el feedback como obligatorio y pierdan tiempo en sugerencias opcionales.

### Paso 5: Verificar la verificación

Revisa la historia de verificación del autor:

```
- ¿Qué tests se ejecutaron?
- ¿El build pasó?
- ¿El cambio se probó manualmente?
- ¿Hay screenshots para cambios de UI?
- ¿Hay comparación before/after?
```

## Multi-Model Review Pattern

Usa diferentes modelos para diferentes perspectivas de revisión:

```
Model A escribe el código
    │
    ▼
Model B revisa correctness y architecture
    │
    ▼
Model A atiende el feedback
    │
    ▼
Human hace la decisión final
```

Esto detecta problemas que un solo modelo podría omitir —diferentes modelos tienen diferentes puntos ciegos.

**Ejemplo de prompt para un agente de revisión:**
```
Review this code change for correctness, security, and adherence to
our project conventions. The spec says [X]. The change should [Y].
Flag any issues as Critical, Important, or Suggestion.
```

## Dead Code Hygiene

Después de cualquier refactoring o cambio de implementación, revisa código huérfano:

1. Identifica código que ahora es inalcanzable o no usado
2. Enuméralo explícitamente
3. **Pregunta antes de eliminar:** "¿Debería remover estos elementos ahora no usados: [lista]?"

No dejes código muerto por ahí —confunde a futuros lectores y agents. Pero no elimines en silencio cosas de las que no estás seguro. Cuando dudes, pregunta.

```
DEAD CODE IDENTIFIED:
- formatLegacyDate() in src/utils/date.ts — replaced by formatDate()
- OldTaskCard component in src/components/ — replaced by TaskCard
- LEGACY_API_URL constant in src/config.ts — no remaining references
→ Safe to remove these?
```

## Review Speed

Las revisiones lentas bloquean equipos enteros. El costo de cambiar de contexto para revisar es menor que el costo de espera impuesto a otros.

- **Responde dentro de un día hábil** —este es el máximo, no el objetivo
- **Cadencia ideal:** Responde poco después de que llegue una solicitud de revisión, a menos que estés profundamente en coding enfocado. Un cambio típico debería completar múltiples rondas de revisión en un solo día
- **Prioriza respuestas individuales rápidas** sobre aprobación final rápida. El feedback rápido reduce la frustración incluso si se necesitan múltiples rondas
- **Cambios grandes:** Pide al autor que los divida en lugar de revisar un changeset masivo

## Handling Disagreements

Al resolver disputas de revisión, aplica esta jerarquía:

1. **Hechos técnicos y datos** prevalecen sobre opiniones y preferencias
2. **Style guides** son la autoridad absoluta en asuntos de estilo
3. **Software design** debe evaluarse sobre principios de ingeniería, no preferencia personal
4. **Consistencia de la codebase** es aceptable si no degrada la salud general

**No aceptes "Lo limpiaré después."** La experiencia muestra que la limpieza diferida raramente sucede. Requiere limpieza antes del envío a menos que sea una emergencia genuina. Si los problemas circundantes no pueden abordarse en este cambio, requiere que se archive un bug con auto-asignación.

## Honesty in Review

Al revisar código —ya sea escrito por ti, otro agente o un humano:

- **No hagas rubber-stamp.** "LGTM" sin evidencia de revisión no ayuda a nadie.
- **No suavices problemas reales.** "Esto podría ser una preocupación menor" cuando es un bug que afectará producción es deshonesto.
- **Cuantifica problemas cuando sea posible.** "Este N+1 query agregará ~50ms por ítem en la lista" es mejor que "esto podría ser lento."
- **Oponerte a enfoques con problemas claros.** El sycophancy es un modo de fallo en las revisiones. Si la implementación tiene problemas, dílo directamente y propón alternativas.
- **Acepta override con gracia.** Si el autor tiene contexto completo y está en desacuerdo, difiere a su juicio. Comenta sobre el código, no sobre las personas —reformulando críticas personales para enfocarse en el código mismo.

## Dependency Discipline

Parte del code review es la revisión de dependencias:

**Antes de agregar cualquier dependencia:**
1. ¿El stack existente resuelve esto? (A menudo lo hace.)
2. ¿Qué tan grande es la dependencia? (Revisa el impacto en el bundle.)
3. ¿Está activamente mantenida? (Revisa el último commit, issues abiertos.)
4. ¿Tiene vulnerabilidades conocidas? (`npm audit`)
5. ¿Cuál es la licencia? (Debe ser compatible con el proyecto.)

**Regla:** Prefiere la biblioteca estándar y utilidades existentes sobre nuevas dependencias. Cada dependencia es un pasivo.

## The Review Checklist

```markdown
## Review: [PR/Change title]

### Context
- [ ] Entiendo qué hace este cambio y por qué

### Correctness
- [ ] El cambio coincide con la especificación/requisitos de la tarea
- [ ] Se manejan los edge cases
- [ ] Se manejan los caminos de error
- [ ] Los tests cubren adecuadamente el cambio

### Readability
- [ ] Los nombres son claros y consistentes
- [ ] La lógica es directa
- [ ] Sin complejidad innecesaria

### Architecture
- [ ] Sigue patrones existentes
- [ ] Sin acoplamiento ni dependencias innecesarias
- [ ] Nivel de abstracción apropiado

### Security
- [ ] Sin secretos en el código
- [ ] Input validado en los bordes
- [ ] Sin vulnerabilidades de inyección
- [ ] Checks de auth en su lugar
- [ ] Fuentes de datos externas tratadas como no confiables

### Performance
- [ ] Sin patrones N+1
- [ ] Sin operaciones sin bounds
- [ ] Pagination en list endpoints

### Verification
- [ ] Los tests pasan
- [ ] El build tiene éxito
- [ ] Verificación manual realizada (si aplica)

### Verdict
- [ ] **Approve** — Listo para merge
- [ ] **Request changes** — Los issues deben ser abordados
```
## See Also

- Para guía detallada de revisión de seguridad, consulta `references/security-checklist.md`
- Para checks de revisión de performance, consulta `references/performance-checklist.md`

## Justificaciones comunes

| Justificación | Realidad |
|---|---|
| "Funciona, eso es suficiente" | El código que funciona pero es ilegible, inseguro o arquitectónicamente incorrecto crea deuda que se compone. |
| "Lo escribí yo, así que sé que es correcto" | Los autores son ciegos a sus propias suposiciones. Cada cambio se beneficia de otro par de ojos. |
| "Lo limpiaremos después" | El después nunca llega. La revisión es el quality gate —úsalo. Requiere limpieza antes del merge, no después. |
| "El código generado por IA probablemente está bien" | El código de IA necesita más escrutinio, no menos. Es confiado y plausible, incluso cuando está equivocado. |
| "Los tests pasan, así que está bien" | Los tests son necesarios pero no suficientes. No detectan problemas de arquitectura, issues de seguridad ni preocupaciones de readability. |

## Señales de alerta

- PRs mergeados sin ninguna revisión
- Revisión que solo verifica si los tests pasan (ignorando otros ejes)
- "LGTM" sin evidencia de revisión real
- Cambios sensibles a seguridad sin revisión enfocada en seguridad
- PRs grandes que son "demasiado grandes para revisar adecuadamente" (divídelos)
- Sin regression tests en PRs de bug fix
- Comentarios de revisión sin etiquetas de severidad —hace que no sea claro qué es requerido vs opcional
- Aceptar "Lo arreglaré después" —nunca sucede

## Verificación

Después de completar la revisión:

- [ ] Todos los issues Critical están resueltos
- [ ] Todos los issues Important están resueltos o diferidos explícitamente con justificación
- [ ] Los tests pasan
- [ ] El build tiene éxito
- [ ] La historia de verificación está documentada (qué cambió, cómo se verificó)
