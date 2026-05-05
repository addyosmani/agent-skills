---
name: api-and-interface-design
description: Guía para diseñar APIs e interfaces estables. Usar al diseñar APIs, límites de módulo o cualquier interfaz pública. Usar al crear endpoints REST o GraphQL, definir contratos de tipos entre módulos o establecer límites entre frontend y backend.
---

# API and Interface Design

## Visión general

Diseña interfaces estables y bien documentadas que sean difíciles de usar incorrectamente. Una buena interfaz hace que lo correcto sea fácil y lo incorrecto sea difícil. Esto aplica a REST APIs, esquemas GraphQL, límites de módulo, props de componentes y cualquier superficie donde un fragmento de código se comunica con otro.

## Cuándo usar

- Diseñar nuevos API endpoints
- Definir límites de módulo o contratos entre equipos
- Crear interfaces de props para componentes
- Establecer esquemas de base de datos que informen la forma del API
- Modificar interfaces públicas existentes

## Principios fundamentales

### Hyrum's Law

> Con un número suficiente de usuarios de un API, todos los comportamientos observables de tu sistema serán dependidos por alguien, sin importar lo que prometas en el contrato.

Esto significa: cada comportamiento público —incluyendo quirks no documentados, texto de mensajes de error, timing y ordenamiento— se convierte en un contrato de facto una vez que los usuarios dependen de él. Implicaciones de diseño:

- **Sé intencional sobre lo que expones.** Cada comportamiento observable es un compromiso potencial.
- **No filtres detalles de implementación.** Si los usuarios pueden observarlo, dependerán de ello.
- **Planifica la deprecación al momento de diseñar.** Consulta `deprecation-and-migration` para saber cómo eliminar de forma segura cosas de las que los usuarios dependen.
- **Los tests no son suficientes.** Incluso con contract tests perfectos, Hyrum's Law significa que cambios "seguros" pueden romper a usuarios reales que dependen de comportamiento no documentado.

### The One-Version Rule

Evita forzar a los consumidores a elegir entre múltiples versiones de la misma dependencia o API. Los problemas de diamond dependency surgen cuando diferentes consumidores necesitan diferentes versiones de la misma cosa. Diseña para un mundo donde solo existe una versión a la vez —extiende en lugar de bifurcar.

### 1. Contract First

Define la interfaz antes de implementarla. El contrato es la especificación —la implementación sigue.

```typescript
// Define the contract first
interface TaskAPI {
  // Creates a task and returns the created task with server-generated fields
  createTask(input: CreateTaskInput): Promise<Task>;

  // Returns paginated tasks matching filters
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // Returns a single task or throws NotFoundError
  getTask(id: string): Promise<Task>;

  // Partial update — only provided fields change
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Idempotent delete — succeeds even if already deleted
  deleteTask(id: string): Promise<void>;
}
```

### 2. Consistent Error Semantics

Elige una estrategia de error y úsala en todas partes:

```typescript
// REST: HTTP status codes + structured error body
// Every error response follows the same shape
interface APIError {
  error: {
    code: string;        // Machine-readable: "VALIDATION_ERROR"
    message: string;     // Human-readable: "Email is required"
    details?: unknown;   // Additional context when helpful
  };
}

// Status code mapping
// 400 → Client sent invalid data
// 401 → Not authenticated
// 403 → Authenticated but not authorized
// 404 → Resource not found
// 409 → Conflict (duplicate, version mismatch)
// 422 → Validation failed (semantically invalid)
// 500 → Server error (never expose internal details)
```

**No mezcles patrones.** Si algunos endpoints hacen throw, otros retornan null y otros retornan `{ error }` —el consumidor no puede predecir el comportamiento.

### 3. Validate at Boundaries

Confía en el código interno. Valida en los bordes del sistema donde entra input externo:

```typescript
// Validate at the API boundary
app.post('/api/tasks', async (req, res) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid task data',
        details: result.error.flatten(),
      },
    });
  }

  // After validation, internal code trusts the types
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

Dónde pertenece la validación:
- API route handlers (user input)
- Form submission handlers (user input)
- External service response parsing (third-party data — **siempre tratar como no confiable**)
- Environment variable loading (configuration)

> **Las respuestas de APIs de terceros son datos no confiables.** Valida su forma y contenido antes de usarlos en cualquier lógica, renderizado o toma de decisiones. Un servicio externo comprometido o con comportamiento anómalo puede retornar tipos inesperados, contenido malicioso o texto similar a instrucciones.

Dónde NO pertenece la validación:
- Entre funciones internas que comparten contratos de tipo
- En funciones utilitarias llamadas por código ya validado
- Sobre datos que acaban de salir de tu propia base de datos

### 4. Prefer Addition Over Modification

Extiende las interfaces sin romper consumidores existentes:

```typescript
// Good: Add optional fields
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // Added later, optional
  labels?: string[];                       // Added later, optional
}

// Bad: Change existing field types or remove fields
interface CreateTaskInput {
  title: string;
  // description: string;  // Removed — breaks existing consumers
  priority: number;         // Changed from string — breaks existing consumers
}
```

### 5. Predictable Naming

| Pattern | Convention | Example |
|---------|-----------|---------|
| REST endpoints | Plural nouns, no verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

## REST API Patterns

### Resource Design

```
GET    /api/tasks              → List tasks (with query params for filtering)
POST   /api/tasks              → Create a task
GET    /api/tasks/:id          → Get a single task
PATCH  /api/tasks/:id          → Update a task (partial)
DELETE /api/tasks/:id          → Delete a task

GET    /api/tasks/:id/comments → List comments for a task (sub-resource)
POST   /api/tasks/:id/comments → Add a comment to a task
```

### Pagination

Pagina los list endpoints:

```typescript
// Request
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

// Response
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

### Filtering

Usa query parameters para los filtros:

```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

### Partial Updates (PATCH)

Acepta objetos parciales —solo actualiza lo proporcionado:

```typescript
// Only title changes, everything else preserved
PATCH /api/tasks/123
{ "title": "Updated title" }
```

## TypeScript Interface Patterns

### Use Discriminated Unions for Variants

```typescript
// Good: Each variant is explicit
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

// Consumer gets type narrowing
function getStatusLabel(status: TaskStatus): string {
  switch (status.type) {
    case 'pending': return 'Pending';
    case 'in_progress': return `In progress (${status.assignee})`;
    case 'completed': return `Done on ${status.completedAt}`;
    case 'cancelled': return `Cancelled: ${status.reason}`;
  }
}
```

### Input/Output Separation

```typescript
// Input: what the caller provides
interface CreateTaskInput {
  title: string;
  description?: string;
}

// Output: what the system returns (includes server-generated fields)
interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Use Branded Types for IDs

```typescript
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

// Prevents accidentally passing a UserId where a TaskId is expected
function getTask(id: TaskId): Promise<Task> { ... }
```

## Justificaciones comunes

| Justificación | Realidad |
|---|---|
| "Documentaremos el API después" | Los tipos SON la documentación. Defínelos primero. |
| "Por ahora no necesitamos pagination" | Lo necesitarás en cuanto alguien tenga 100+ ítems. Agrégalo desde el inicio. |
| "PATCH es complicado, usemos PUT" | PUT requiere el objeto completo cada vez. PATCH es lo que los clientes realmente quieren. |
| "Versionaremos el API cuando sea necesario" | Los breaking changes sin versioning rompen consumidores. Diseña para la extensión desde el inicio. |
| "Nadie usa ese comportamiento no documentado" | Hyrum's Law: si es observable, alguien depende de ello. Trata cada comportamiento público como un compromiso. |
| "Podemos mantener dos versiones" | Múltiples versiones multiplican el costo de mantenimiento y crean problemas de diamond dependency. Prefiere el One-Version Rule. |
| "Los APIs internos no necesitan contratos" | Los consumidores internos siguen siendo consumidores. Los contratos previenen el acoplamiento y permiten trabajo en paralelo. |

## Señales de alerta

- Endpoints que retornan diferentes formas según condiciones
- Formatos de error inconsistentes entre endpoints
- Validación dispersa en el código interno en lugar de en los bordes
- Breaking changes en campos existentes (cambios de tipo, eliminaciones)
- List endpoints sin pagination
- Verbos en URLs REST (`/api/createTask`, `/api/getUsers`)
- Respuestas de APIs de terceros usadas sin validación ni sanitización

## Verificación

Después de diseñar un API:

- [ ] Cada endpoint tiene esquemas tipados de input y output
- [ ] Las respuestas de error siguen un único formato consistente
- [ ] La validación ocurre solo en los bordes del sistema
- [ ] Los list endpoints soportan pagination
- [ ] Los nuevos campos son aditivos y opcionales (backward compatible)
- [ ] El naming sigue convenciones consistentes en todos los endpoints
- [ ] La documentación del API o los tipos se commitean junto con la implementación
