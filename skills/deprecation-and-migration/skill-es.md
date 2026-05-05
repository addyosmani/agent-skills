---
name: deprecation-and-migration
description: Gestiona la deprecación y migración. Úsalo al eliminar sistemas, APIs o funcionalidades antiguas. Úsalo al migrar usuarios de una implementación a otra. Úsalo al decidir si mantener o dar de baja código existente.
---

# Deprecation and Migration

## Overview

El código es un pasivo, no un activo. Cada línea de código tiene un costo de mantenimiento continuo: bugs por corregir, dependencias por actualizar, parches de seguridad por aplicar y nuevos ingenieros por incorporar. La deprecación es la disciplina de eliminar código que ya no justifica su existencia, y la migración es el proceso de mover a los usuarios de forma segura de lo viejo a lo nuevo.

La mayoría de las organizaciones de ingeniería son buenas construyendo cosas. Pocas son buenas eliminándolas. Esta skill aborda esa brecha.

## When to Use

- Reemplazando un sistema, API o biblioteca antiguo con uno nuevo
- Dando de baja una funcionalidad que ya no se necesita
- Consolidando implementaciones duplicadas
- Eliminando código muerto que nadie posee pero de lo que todos dependen
- Planificando el ciclo de vida de un nuevo sistema (la planificación de deprecación comienza en el diseño)
- Decidiendo si mantener un sistema legacy o invertir en migración

## Core Principles

### Code Is a Liability

Cada línea de código tiene un costo continuo: necesita tests, documentación, parches de seguridad, actualizaciones de dependencias y carga mental para quienes trabajen cerca. El valor del código reside en la funcionalidad que proporciona, no en el código mismo. Cuando la misma funcionalidad puede ofrecerse con menos código, menos complejidad o mejores abstracciones, el código antiguo debe desaparecer.

### Hyrum's Law Makes Removal Hard

Con suficientes usuarios, todo comportamiento observable se convierte en una dependencia — incluyendo bugs, peculiaridades de timing y efectos secundarios no documentados. Por eso la deprecación requiere migración activa, no solo un anuncio. Los usuarios no pueden "simplemente cambiar" cuando dependen de comportamientos que el reemplazo no replica.

### Deprecation Planning Starts at Design Time

Al construir algo nuevo, pregúntate: "¿Cómo eliminaríamos esto en 3 años?" Los sistemas diseñados con interfaces limpias, feature flags y superficie mínima son más fáciles de deprecar que los sistemas que filtran detalles de implementación por todas partes.

## The Deprecation Decision

Antes de deprecar cualquier cosa, responde estas preguntas:

```
1. ¿Este sistema todavía proporciona valor único?
   → Si sí, mantenlo. Si no, continúa.

2. ¿Cuántos usuarios/consumidores dependen de él?
   → Cuantifica el alcance de la migración.

3. ¿Existe un reemplazo?
   → Si no, construye el reemplazo primero. No deprecies sin una alternativa.

4. ¿Cuál es el costo de migración para cada consumidor?
   → Si es trivialmente automatizable, hazlo. Si es manual y de alto esfuerzo, contrapónlo con el costo de mantenimiento.

5. ¿Cuál es el costo de mantenimiento continuo de NO deprecar?
   → Riesgo de seguridad, tiempo de ingeniería, costo de oportunidad de la complejidad.
```

## Compulsory vs Advisory Deprecation

| Type | When to Use | Mechanism |
|------|-------------|-----------|
| **Advisory** | La migración es opcional, el sistema antiguo es estable | Advertencias, documentación, incentivos. Los usuarios migran en su propio timeline. |
| **Compulsory** | El sistema antiguo tiene problemas de seguridad, bloquea el progreso, o el costo de mantenimiento es insostenible | Fecha límite firme. El sistema antiguo será eliminado para la fecha X. Proporcionar tooling de migración. |

**Default to advisory.** Usa compulsory solo cuando el costo de mantenimiento o el riesgo justifiquen forzar la migración. La deprecación compulsoria requiere proporcionar tooling de migración, documentación y soporte — no puedes simplemente anunciar una fecha límite.

## The Migration Process

### Step 1: Build the Replacement

No depreces sin una alternativa funcional. El reemplazo debe:

- Cubrir todos los casos de uso críticos del sistema antiguo
- Tener documentación y guías de migración
- Estar probado en producción (no solo "teóricamente mejor")

### Step 2: Announce and Document

```markdown
## Deprecation Notice: OldService

**Status:** Deprecated as of 2025-03-01
**Replacement:** NewService (see migration guide below)
**Removal date:** Advisory — no hard deadline yet
**Reason:** OldService requires manual scaling and lacks observability.
            NewService handles both automatically.

### Migration Guide
1. Replace `import { client } from 'old-service'` with `import { client } from 'new-service'`
2. Update configuration (see examples below)
3. Run the migration verification script: `npx migrate-check`
```

### Step 3: Migrate Incrementally

Migra los consumidores uno a la vez, no todos a la vez. Para cada consumidor:

```
1. Identifica todos los puntos de contacto con el sistema deprecado
2. Actualiza para usar el reemplazo
3. Verifica que el comportamiento coincide (tests, integration checks)
4. Elimina las referencias al sistema antiguo
5. Confirma que no hay regresiones
```

**The Churn Rule:** Si eres dueño de la infraestructura que se está deprecando, eres responsable de migrar a tus usuarios — o proporcionar actualizaciones retrocompatibles que no requieran migración. No anuncies la deprecación y dejes a los usuarios resolverlo por su cuenta.

### Step 4: Remove the Old System

Solo después de que todos los consumidores hayan migrado:

```
1. Verifica cero uso activo (métricas, logs, análisis de dependencias)
2. Elimina el código
3. Elimina los tests, documentación y configuración asociados
4. Elimina los avisos de deprecación
5. Celebra — eliminar código es un logro
```

## Migration Patterns

### Strangler Pattern

Ejecuta los sistemas antiguo y nuevo en paralelo. Rutea el tráfico incrementalmente del viejo al nuevo. Cuando el sistema antiguo maneja 0% del tráfico, elimínalo.

```
Phase 1: New system handles 0%, old handles 100%
Phase 2: New system handles 10% (canary)
Phase 3: New system handles 50%
Phase 4: New system handles 100%, old system idle
Phase 5: Remove old system
```

### Adapter Pattern

Crea un adapter que traduzca las llamadas de la interfaz antigua a la nueva implementación. Los consumidores siguen usando la interfaz antigua mientras migras el backend.

```typescript
// Adapter: old interface, new implementation
class LegacyTaskService implements OldTaskAPI {
  constructor(private newService: NewTaskService) {}

  // Old method signature, delegates to new implementation
  getTask(id: number): OldTask {
    const task = this.newService.findById(String(id));
    return this.toOldFormat(task);
  }
}
```

### Feature Flag Migration

Usa feature flags para cambiar consumidores del sistema antiguo al nuevo uno a la vez:

```typescript
function getTaskService(userId: string): TaskService {
  if (featureFlags.isEnabled('new-task-service', { userId })) {
    return new NewTaskService();
  }
  return new LegacyTaskService();
}
```

## Zombie Code

Zombie code es código que nadie posee pero de lo que todos dependen. No se mantiene activamente, no tiene un dueño claro y acumula vulnerabilidades de seguridad y problemas de compatibilidad. Señales:

- Sin commits en 6+ meses pero existen consumidores activos
- Sin maintainer o equipo asignado
- Tests fallando que nadie corrige
- Dependencias con vulnerabilidades conocidas que nadie actualiza
- Documentación que referencia sistemas que ya no existen

**Response:** Asigna un dueño y mantenlo adecuadamente, o deprecalo con un plan de migración concreto. El zombie code no puede permanecer en el limbo — o recibe inversión o es eliminado.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It still works, why remove it?" | El código que funciona pero nadie mantiene acumula deuda de seguridad y complejidad. El costo de mantenimiento crece silenciosamente. |
| "Someone might need it later" | Si se necesita más tarde, puede reconstruirse. Mantener código sin usar "por si acaso" cuesta más que reconstruirlo. |
| "The migration is too expensive" | Compara el costo de migración con el costo de mantenimiento continuo durante 2-3 años. La migración suele ser más barata a largo plazo. |
| "We'll deprecate it after we finish the new system" | La planificación de deprecación comienza en el momento del diseño. Cuando el nuevo sistema esté listo, tendrás nuevas prioridades. Planifica ahora. |
| "Users will migrate on their own" | No lo harán. Proporciona tooling, documentación e incentivos — o haz la migración tú mismo (the Churn Rule). |
| "We can maintain both systems indefinitely" | Dos sistemas haciendo lo mismo significa el doble de mantenimiento, testing, documentación y costo de onboarding. |

## Red Flags

- Sistemas deprecados sin reemplazo disponible
- Anuncios de deprecación sin tooling de migración ni documentación
- Deprecación "suave" que ha sido advisory durante años sin progreso
- Zombie code sin dueño y con consumidores activos
- Nuevas funcionalidades agregadas a un sistema deprecado (invierte en el reemplazo en su lugar)
- Deprecación sin medir el uso actual
- Eliminación de código sin verificar cero consumidores activos

## Verification

Después de completar una deprecación:

- [ ] El reemplazo está probado en producción y cubre todos los casos de uso críticos
- [ ] Existe una guía de migración con pasos concretos y ejemplos
- [ ] Todos los consumidores activos han sido migrados (verificado por métricas/logs)
- [ ] El código antiguo, tests, documentación y configuración fueron completamente eliminados
- [ ] No quedan referencias al sistema deprecado en el codebase
- [ ] Los avisos de deprecación fueron eliminados (cumplieron su propósito)
