---
name: frontend-ui-engineering
description: 构建 production-quality UI。用于构建或修改 user-facing interfaces。也用于创建 components、实现 layouts、管理 state，或输出需要像 production-quality 而不是 AI-generated 时。
---

# Frontend UI Engineering

## Overview
构建 accessible、performant、视觉精致的 production-quality user interfaces。目标是让 UI 看起来像顶级公司有设计意识的工程师构建，而不是 AI 生成。这意味着真正遵循 design system、正确 accessibility、周到 interaction patterns，并避免通用的“AI aesthetic”。

## When to Use
- 构建新的 UI components 或 pages
- 修改现有 user-facing interfaces
- 实现 responsive layouts
- 添加 interactivity 或 state management
- 修复 visual 或 UX 问题

## Component Architecture（组件架构）

### File Structure（文件结构）

把一个 component 相关内容放在一起：

```
src/components/
  TaskList/
    TaskList.tsx          # Component implementation
    TaskList.test.tsx     # Tests
    TaskList.stories.tsx  # Storybook stories（如果使用）
    use-task-list.ts      # Custom hook（复杂 state 时）
    types.ts              # Component-specific types（需要时）
```

### Component Patterns（组件模式）

**优先 composition，而不是 configuration：**

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

**保持 components 聚焦：**

```tsx
// Good: 只做一件事
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

**分离 data fetching 和 presentation：**

```tsx
// Container: 处理 data
export function TaskListContainer() {
  const { tasks, isLoading, error } = useTasks();

  if (isLoading) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Failed to load tasks" retry={refetch} />;
  if (tasks.length === 0) return <EmptyState message="No tasks yet" />;

  return <TaskList tasks={tasks} />;
}

// Presentation: 处理 rendering
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul role="list" className="divide-y">
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}
```

## State Management（状态管理）

**选择能工作的最简单方案：**

```
Local state (useState)           → Component-specific UI state
Lifted state                     → 2-3 个 sibling components 共享
Context                          → Theme、auth、locale（read-heavy, write-rare）
URL state (searchParams)         → Filters、pagination、可分享 UI state
Server state (React Query, SWR)  → 带 caching 的 remote data
Global store (Zustand, Redux)    → App-wide 共享的复杂 client state
```

**避免 prop drilling 超过 3 层。** 如果 props 被穿过不使用它们的 components，加入 context 或重构 component tree。

## Design System Adherence（遵循设计系统）

### 避免 AI Aesthetic

AI-generated UI 有可识别模式。全部避免：

| AI Default | 为什么有问题 | Production Quality |
|---|---|---|
| 到处紫色/靛蓝 | Models 默认使用视觉上“安全”的 palette，导致所有 app 看起来一样 | 使用项目实际 color palette |
| 过度 gradients | Gradients 增加视觉噪声，并与多数 design systems 冲突 | 使用符合 design system 的 flat 或 subtle gradients |
| 全部大圆角（rounded-2xl） | 最大圆角传递“友好”，但忽略真实设计中的 corner radii 层级 | 使用 design system 中一致的 border-radius |
| 泛用 hero sections | 模板化 layout，与真实内容或用户需求无关 | Content-first layouts |
| Lorem ipsum 式 copy | Placeholder text 会掩盖真实内容暴露的 layout 问题（length、wrapping、overflow） | 真实感 placeholder content |
| 到处 oversized padding | 均匀的大 padding 会破坏 visual hierarchy 并浪费屏幕空间 | 一致 spacing scale |
| Stock card grids | 统一 grids 是 layout 捷径，忽略信息优先级和扫描模式 | Purpose-driven layouts |
| Shadow-heavy design | 多层 shadows 会与内容争夺注意力，并拖慢低端设备渲染 | 除非 design system 指定，否则使用 subtle 或 no shadows |

### Spacing and Layout（间距和布局）

使用一致 spacing scale。不要发明数值：

```css
/* 使用 scale: 0.25rem increments（或项目实际 scale） */
/* Good */  padding: 1rem;      /* 16px */
/* Good */  gap: 0.75rem;       /* 12px */
/* Bad */   padding: 13px;      /* 不在任何 scale 上 */
/* Bad */   margin-top: 2.3rem; /* 不在任何 scale 上 */
```

### Typography（排版）

尊重 type hierarchy：

```
h1 → Page title（每页一个）
h2 → Section title
h3 → Subsection title
body → Default text
small → Secondary/helper text
```

不要跳过 heading levels。不要把 heading styles 用在非 heading 内容上。

### Color（颜色）

- 使用 semantic color tokens：`text-primary`, `bg-surface`, `border-default`，不要用 raw hex values
- 确保足够 contrast（普通文本 4.5:1，大文本 3:1）
- 不要只靠颜色传递信息（同时使用 icons、text 或 patterns）

## Accessibility (WCAG 2.1 AA)

每个 component 都必须满足这些标准：

### Keyboard Navigation（键盘导航）

```tsx
// 每个 interactive element 都必须 keyboard accessible
<button onClick={handleClick}>Click me</button>        // ✓ 默认 focusable
<div onClick={handleClick}>Click me</div>               // ✗ 不可 focusable
<div role="button" tabIndex={0} onClick={handleClick}    // ✓ 但优先用 <button>
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

### ARIA Labels（ARIA 标签）

```tsx
// 为缺少 visible text 的 interactive elements 加 label
<button aria-label="Close dialog"><XIcon /></button>

// 为 form inputs 加 label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// 没有 visible label 时使用 aria-label
<input aria-label="Search tasks" type="search" />
```

### Focus Management（焦点管理）

```tsx
// 内容变化时移动 focus
function Dialog({ isOpen, onClose }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  // 打开时把 focus trap 在 dialog 内
  return (
    <dialog open={isOpen}>
      <button ref={closeRef} onClick={onClose}>Close</button>
      {/* dialog content */}
    </dialog>
  );
}
```

### 有意义的 Empty 和 Error States

```tsx
// 不要显示 blank screens
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

## Responsive Design（响应式设计）

先为 mobile 设计，再扩展：

```tsx
// Tailwind: mobile-first responsive
<div className="
  grid grid-cols-1      /* Mobile: single column */
  sm:grid-cols-2        /* Small: 2 columns */
  lg:grid-cols-3        /* Large: 3 columns */
  gap-4
">
```

在这些 breakpoints 测试：320px, 768px, 1024px, 1440px。

## Loading and Transitions（加载和过渡）

```tsx
// Skeleton loading（内容加载不用 spinners）
function TaskListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

// 用 optimistic updates 提升感知速度
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

## See Also（另见）

详细 accessibility requirements 和 testing tools，见 `references/accessibility-checklist.md`。

## Common Rationalizations
| 借口 | 现实 |
|---|---|
| “Accessibility 只是 nice-to-have” | 在很多司法辖区这是法律要求，也是 engineering quality standard。 |
| “以后再做 responsive” | 事后补 responsive design 比一开始构建难 3 倍。 |
| “设计还没定稿，所以先不做 styling” | 使用 design system defaults。未 styling 的 UI 会给 reviewers 留下破损的第一印象。 |
| “这只是 prototype” | Prototypes 会变成 production code。把基础打对。 |
| “AI aesthetic 现在也可以” | 它传递低质量信号。从一开始使用项目实际 design system。 |

## Red Flags
- Components 超过 200 行（拆分）
- Inline styles 或任意 pixel values
- 缺少 error states、loading states 或 empty states
- 没有 keyboard navigation testing
- 只用颜色表示状态（只有红/绿，没有 text 或 icons）
- 泛用“AI look”（紫色 gradients、oversized cards、stock layouts）

## Verification
构建 UI 后确认：

- [ ] Component renders without console errors
- [ ] 所有 interactive elements 都 keyboard accessible（用 Tab 走完整页）
- [ ] Screen reader 可以传达页面 content 和 structure
- [ ] Responsive：在 320px, 768px, 1024px, 1440px 可用
- [ ] Loading、error、empty states 都已处理
- [ ] 遵循项目 design system（spacing、colors、typography）
- [ ] dev tools 或 axe-core 中没有 accessibility warnings
