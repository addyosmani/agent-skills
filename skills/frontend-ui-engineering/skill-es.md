---
name: frontend-ui-engineering
description: Construye UIs de calidad de producción. Úsalo al construir o modificar interfaces orientadas al usuario. Úsalo al crear componentes, implementar layouts, gestionar estado, o cuando el resultado necesite verse y sentirse como de calidad de producción en lugar de generado por IA.
---

# Frontend UI Engineering

## Overview

Construye interfaces de usuario de calidad de producción que sean accesibles, performantes y visualmente pulidas. El objetivo es una UI que parezca construida por un ingeniero con sensibilidad de diseño en una empresa líder — no como si fuera generada por una IA. Esto significa adherencia real a un design system, accesibilidad adecuada, patrones de interacción cuidadosos y nada de "estética de IA" genérica.

## When to Use

- Construyendo nuevos componentes o páginas de UI
- Modificando interfaces existentes orientadas al usuario
- Implementando layouts responsivos
- Agregando interactividad o gestión de estado
- Corrigiendo problemas visuales o de UX

## Component Architecture

### File Structure

Coloca todo lo relacionado con un componente en el mismo lugar:

```
src/components/
  TaskList/
    TaskList.tsx          # Component implementation
    TaskList.test.tsx     # Tests
    TaskList.stories.tsx  # Storybook stories (if using)
    use-task-list.ts      # Custom hook (if complex state)
    types.ts              # Component-specific types (if needed)
```

### Component Patterns

**Prefer composition over configuration:**

```tsx
// Good: Composable
<Card>
  <CardHeader>
    <CardTitle>Tasks</CardTitle>
  </CardHeader>
  <CardBody>
    <TaskList tasks={tasks} />
  </CardBody>
</Card>

// Avoid: Over-configured
<Card
  title="Tasks"
  headerVariant="large"
  bodyPadding="md"
  content={<TaskList tasks={tasks} />}
/>
```

**Keep components focused:**

```tsx
// Good: Does one thing
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Checkbox checked={task.done} onChange={() => onToggle(task.id)} />
      <span className={task.done ? 'line-through text-muted' : ''}>{task.title}</span>
      <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
        <TrashIcon />
      </Button>
    </li>
  );
}
```

**Separate data fetching from presentation:**

```tsx
// Container: handles data
export function TaskListContainer() {
  const { tasks, isLoading, error } = useTasks();

  if (isLoading) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Failed to load tasks" retry={refetch} />;
  if (tasks.length === 0) return <EmptyState message="No tasks yet" />;

  return <TaskList tasks={tasks} />;
}

// Presentation: handles rendering
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul role="list" className="divide-y">
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}
```

## State Management

**Choose the simplest approach that works:**

```
Local state (useState)           → Estado de UI específico del componente
Lifted state                     → Compartido entre 2-3 componentes hermanos
Context                          → Tema, auth, locale (lectura intensiva, escritura rara)
URL state (searchParams)         → Filtros, paginación, estado de UI compartible
Server state (React Query, SWR)  → Datos remotos con cache
Global store (Zustand, Redux)    → Estado complejo del cliente compartido en toda la app
```

**Avoid prop drilling deeper than 3 levels.** Si estás pasando props a través de componentes que no los usan, introduce context o reestructura el árbol de componentes.

## Design System Adherence

### Avoid the AI Aesthetic

Las UIs generadas por IA tienen patrones reconocibles. Evita todos ellos:

| AI Default | Why It Is a Problem | Production Quality |
|---|---|---|
| Purple/indigo everything | Los modelos defaultan a paletas visualmente "seguras", haciendo que cada app se vea idéntica | Usa la paleta de colores real del proyecto |
| Excessive gradients | Los gradients agregan ruido visual y chocan con la mayoría de los design systems | Gradients planos o sutiles que coincidan con el design system |
| Rounded everything (rounded-2xl) | El redondeo máximo señala "amigable" pero ignora la jerarquía de radios de esquina en diseños reales | Border-radius consistente del design system |
| Generic hero sections | Layout impulsado por plantillas sin conexión con el contenido real o la necesidad del usuario | Layouts orientados al contenido |
| Lorem ipsum-style copy | El texto de relleno oculta problemas de layout que el contenido real revela (longitud, wrapping, overflow) | Contenido de placeholder realista |
| Oversized padding everywhere | El padding generoso igual por todas partes destruye la jerarquía visual y desperdicia espacio de pantalla | Escala de espaciado consistente |
| Stock card grids | Las grids uniformes son un atajo de layout que ignora la prioridad de la información y los patrones de escaneo | Layouts con propósito definido |
| Shadow-heavy design | Las sombras en capas agregan profundidad que compite con el contenido y ralentiza el renderizado en dispositivos de gama baja | Sombras sutiles o ninguna, a menos que el design system lo especifique |

### Spacing and Layout

Usa una escala de espaciado consistente. No inventes valores:

```css
/* Use the scale: 0.25rem increments (or whatever the project uses) */
/* Good */  padding: 1rem;      /* 16px */
/* Good */  gap: 0.75rem;       /* 12px */
/* Bad */   padding: 13px;      /* Not on any scale */
/* Bad */   margin-top: 2.3rem; /* Not on any scale */
```

### Typography

Respeta la jerarquía tipográfica:

```
h1 → Título de página (uno por página)
h2 → Título de sección
h3 → Título de subsección
body → Texto por defecto
small → Texto secundario/de ayuda
```

No saltes niveles de encabezado. No uses estilos de encabezado para contenido que no es un encabezado.

### Color

- Usa tokens semánticos de color: `text-primary`, `bg-surface`, `border-default` — no valores hex raw
- Asegura contraste suficiente (4.5:1 para texto normal, 3:1 para texto grande)
- No confíes únicamente en el color para transmitir información (usa iconos, texto o patrones también)

## Accessibility (WCAG 2.1 AA)

Cada componente debe cumplir estos estándares:

### Keyboard Navigation

```tsx
// Every interactive element must be keyboard accessible
<button onClick={handleClick}>Click me</button>        // ✓ Focusable by default
<div onClick={handleClick}>Click me</div>               // ✗ Not focusable
<div role="button" tabIndex={0} onClick={handleClick}    // ✓ But prefer <button>
     onKeyDown={e => {
       if (e.key === 'Enter') handleClick();
       if (e.key === ' ') e.preventDefault();
     }}
     onKeyUp={e => {
       if (e.key === ' ') handleClick();
     }}>
  Click me
</div>
```

### ARIA Labels

```tsx
// Label interactive elements that lack visible text
<button aria-label="Close dialog"><XIcon /></button>

// Label form inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Or use aria-label when no visible label exists
<input aria-label="Search tasks" type="search" />
```

### Focus Management

```tsx
// Move focus when content changes
function Dialog({ isOpen, onClose }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  // Trap focus inside dialog when open
  return (
    <dialog open={isOpen}>
      <button ref={closeRef} onClick={onClose}>Close</button>
      {/* dialog content */}
    </dialog>
  );
}
```

### Meaningful Empty and Error States

```tsx
// Don't show blank screens
function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div role="status" className="text-center py-12">
        <TasksEmptyIcon className="mx-auto h-12 w-12 text-muted" />
        <h3 className="mt-2 text-sm font-medium">No tasks</h3>
        <p className="mt-1 text-sm text-muted">Get started by creating a new task.</p>
        <Button className="mt-4" onClick={onCreateTask}>Create Task</Button>
      </div>
    );
  }

  return <ul role="list">...</ul>;
}
```

## Responsive Design

Diseña mobile first, luego expande:

```tsx
// Tailwind: mobile-first responsive
<div className="
  grid grid-cols-1      /* Mobile: single column */
  sm:grid-cols-2        /* Small: 2 columns */
  lg:grid-cols-3        /* Large: 3 columns */
  gap-4
">
```

Test at these breakpoints: 320px, 768px, 1024px, 1440px.

## Loading and Transitions

```tsx
// Skeleton loading (not spinners for content)
function TaskListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

// Optimistic updates for perceived speed
function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);

      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      );

      return { previous };
    },
    onError: (_err, _taskId, context) => {
      queryClient.setQueryData(['tasks'], context?.previous);
    },
  });
}
```

## See Also

Para requisitos de accesibilidad detallados y herramientas de testing, consulta `references/accessibility-checklist.md`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Accessibility is a nice-to-have" | Es un requisito legal en muchas jurisdicciones y un estándar de calidad de ingeniería. |
| "We'll make it responsive later" | Hacer responsive retroactivamente es 3 veces más difícil que construirlo desde el inicio. |
| "The design isn't final, so I'll skip styling" | Usa los defaults del design system. La UI sin estilo crea una primera impresión rota para los reviewers. |
| "This is just a prototype" | Los prototipos se convierten en código de producción. Construye los cimientos correctos. |
| "The AI aesthetic is fine for now" | Señala baja calidad. Usa el design system real del proyecto desde el inicio. |

## Red Flags

- Componentes con más de 200 líneas (divídelos)
- Inline styles o valores arbitrarios en píxeles
- Faltan estados de error, loading o empty
- Sin testing de navegación por teclado
- Color como único indicador de estado (rojo/verde sin texto ni iconos)
- Look genérico de "IA" (gradients púrpuras, tarjetas oversized, layouts stock)

## Verification

Después de construir UI:

- [ ] El componente renderiza sin errores de consola
- [ ] Todos los elementos interactivos son accesibles por teclado (Tab a través de la página)
- [ ] El screen reader puede transmitir el contenido y la estructura de la página
- [ ] Responsive: funciona en 320px, 768px, 1024px, 1440px
- [ ] Estados de loading, error y empty están todos manejados
- [ ] Sigue el design system del proyecto (espaciado, colores, tipografía)
- [ ] Sin advertencias de accesibilidad en las dev tools o axe-core
