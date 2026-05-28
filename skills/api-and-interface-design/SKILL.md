---
name: api-and-interface-design
description: 指导稳定的 API 和 interface 设计。用于设计 API、module boundary 或任何 public interface。也用于创建 REST 或 GraphQL endpoints、定义模块间 type contracts，或建立 frontend 与 backend 边界。
---

# API and Interface Design

## Overview
设计稳定、文档清晰、难以误用的 interface。好的 interface 让正确做法变简单，让错误做法变困难。这适用于 REST API、GraphQL schema、module boundary、component props，以及任何一段代码与另一段代码交互的表面。

## When to Use
- 设计新的 API endpoints
- 定义 module boundary 或团队间 contract
- 创建 component prop interfaces
- 建立会影响 API 形状的 database schema
- 修改现有 public interfaces

## 核心原则

### Hyrum's Law（海勒姆定律）

> 当 API 有足够多用户时，无论 contract 承诺什么，系统所有可观察行为都会被某些人依赖。

这意味着：每个 public behavior，包括未记录的 quirks、错误消息文本、时序和排序，一旦被用户依赖，就会成为事实 contract。设计含义：

- **有意控制暴露内容。** 每个可观察行为都可能成为承诺。
- **不要泄漏 implementation details。** 用户能观察到，就会依赖它。
- **设计时就规划 deprecation。** 如何安全移除用户依赖的内容，见 `deprecation-and-migration`。
- **测试不够。** 即使 contract tests 完美，Hyrum's Law 也意味着“安全”变更可能破坏依赖未记录行为的真实用户。

### The One-Version Rule（单版本规则）

避免迫使 consumers 在同一 dependency 或 API 的多个版本之间选择。当不同 consumers 需要同一事物的不同版本时，会出现 diamond dependency 问题。按同一时间只存在一个版本来设计：扩展，而不是 fork。

### 1. Contract First

先定义 interface，再实现。contract 就是 spec，实现随后跟进。

```typescript
// 先定义 contract
interface TaskAPI {
  // 创建 task，并返回包含 server-generated fields 的 task
  createTask(input: CreateTaskInput): Promise<Task>;

  // 返回匹配 filters 的 paginated tasks
  listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>>;

  // 返回单个 task，或抛出 NotFoundError
  getTask(id: string): Promise<Task>;

  // Partial update — 只修改提供的字段
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>;

  // Idempotent delete — 即使已删除也成功
  deleteTask(id: string): Promise<void>;
}
```

### 2. 一致的 Error Semantics

选择一种 error strategy，并在所有地方一致使用：

```typescript
// REST: HTTP status codes + structured error body
// 每个 error response 都遵循相同形状
interface APIError {
  error: {
    code: string;        // Machine-readable: "VALIDATION_ERROR"
    message: string;     // Human-readable: "Email is required"
    details?: unknown;   // 有帮助时提供额外 context
  };
}

// Status code mapping
// 400 → Client 发送了 invalid data
// 401 → 未 authenticated
// 403 → 已 authenticated 但未 authorized
// 404 → Resource not found
// 409 → Conflict（duplicate、version mismatch）
// 422 → Validation failed（语义 invalid）
// 500 → Server error（绝不暴露 internal details）
```

**不要混用 patterns。** 如果有些 endpoints throw，有些 return null，有些 return `{ error }`，consumer 就无法预测行为。

### 3. 在边界处验证

信任 internal code。只在 external input 进入系统的边界处验证：

```typescript
// 在 API boundary 验证
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

  // 验证后，internal code 信任类型
  const task = await taskService.create(result.data);
  return res.status(201).json(task);
});
```

validation 应放在：
- API route handlers（user input）
- Form submission handlers（user input）
- External service response parsing（third-party data -- **始终视为 untrusted**）
- Environment variable loading（configuration）

> **Third-party API responses 是 untrusted data。** 使用它们参与任何逻辑、渲染或决策前，先验证 shape 和 content。被入侵或异常的 external service 可能返回意外类型、恶意内容或类似 instruction 的文本。

validation 不应放在：
- 共享 type contracts 的 internal functions 之间
- 已验证代码调用的 utility functions 中
- 刚从自有 database 取出的数据上

### 4. 优先 Addition，而不是 Modification

扩展 interface，不破坏现有 consumers：

```typescript
// Good: 添加 optional fields
interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';  // 后续添加，optional
  labels?: string[];                       // 后续添加，optional
}

// Bad: 修改已有 field types 或移除 fields
interface CreateTaskInput {
  title: string;
  // description: string;  // 已移除 — 会破坏现有 consumers
  priority: number;         // 从 string 改来 — 会破坏现有 consumers
}
```

### 5. 可预测命名

| 模式 | 约定 | 示例 |
|---------|-----------|---------|
| REST endpoints | Plural nouns，不用 verbs | `GET /api/tasks`, `POST /api/tasks` |
| Query params | camelCase | `?sortBy=createdAt&pageSize=20` |
| Response fields | camelCase | `{ createdAt, updatedAt, taskId }` |
| Boolean fields | is/has/can prefix | `isComplete`, `hasAttachments` |
| Enum values | UPPER_SNAKE | `"IN_PROGRESS"`, `"COMPLETED"` |

## REST API Patterns（模式）

### Resource Design（资源设计）

```
GET    /api/tasks              → 列出 tasks（用 query params 过滤）
POST   /api/tasks              → 创建 task
GET    /api/tasks/:id          → 获取单个 task
PATCH  /api/tasks/:id          → 更新 task（partial）
DELETE /api/tasks/:id          → 删除 task

GET    /api/tasks/:id/comments → 列出某个 task 的 comments（sub-resource）
POST   /api/tasks/:id/comments → 给 task 添加 comment
```

### Pagination（分页）

为 list endpoints 添加 pagination：

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

### Filtering（过滤）

用 query parameters 表达 filters：

```
GET /api/tasks?status=in_progress&assignee=user123&createdAfter=2025-01-01
```

### Partial Updates (PATCH)（部分更新）

接受 partial objects，只更新提供的内容：

```typescript
// 只修改 title，其他全部保留
PATCH /api/tasks/123
{ "title": "Updated title" }
```

## TypeScript Interface Patterns（模式）

### 用 Discriminated Unions 表达 Variants

```typescript
// Good: 每个 variant 都显式
type TaskStatus =
  | { type: 'pending' }
  | { type: 'in_progress'; assignee: string; startedAt: Date }
  | { type: 'completed'; completedAt: Date; completedBy: string }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

// Consumer 获得 type narrowing
function getStatusLabel(status: TaskStatus): string {
  switch (status.type) {
    case 'pending': return 'Pending';
    case 'in_progress': return `In progress (${status.assignee})`;
    case 'completed': return `Done on ${status.completedAt}`;
    case 'cancelled': return `Cancelled: ${status.reason}`;
  }
}
```

### Input/Output Separation（输入/输出分离）

```typescript
// Input: caller 提供的内容
interface CreateTaskInput {
  title: string;
  description?: string;
}

// Output: system 返回的内容（包含 server-generated fields）
interface Task {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### 用 Branded Types 表达 IDs

```typescript
type TaskId = string & { readonly __brand: 'TaskId' };
type UserId = string & { readonly __brand: 'UserId' };

// 防止把 UserId 误传给需要 TaskId 的地方
function getTask(id: TaskId): Promise<Task> { ... }
```

## Common Rationalizations
| 借口 | 现实 |
|---|---|
| “API 文档以后再写” | types 就是文档。先定义它们。 |
| “现在还不需要 pagination” | 一旦有人有 100+ items，就会立刻需要。从一开始就加。 |
| “PATCH 很复杂，直接用 PUT 吧” | PUT 每次都要求 full object。PATCH 才是 clients 真正想要的。 |
| “需要时再做 API versioning” | 没有 versioning 的 breaking changes 会破坏 consumers。从一开始按可扩展设计。 |
| “没人用那个未记录行为” | Hyrum's Law：只要可观察，就会有人依赖。把每个 public behavior 都当成承诺。 |
| “我们可以维护两个版本” | 多版本会放大维护成本，并制造 diamond dependency 问题。优先 The One-Version Rule。 |
| “Internal APIs 不需要 contracts” | Internal consumers 仍然是 consumers。contracts 可防止耦合，并支持并行工作。 |

## Red Flags
- Endpoints 在不同条件下返回不同 shapes
- Endpoints 之间 error formats 不一致
- validation 分散在 internal code 中，而不是放在 boundaries
- 对现有 fields 做 breaking changes（type changes、removals）
- List endpoints 没有 pagination
- REST URLs 中出现 verbs（`/api/createTask`, `/api/getUsers`）
- 未经 validation 或 sanitization 就使用 third-party API responses

## Verification
设计 API 后确认：

- [ ] 每个 endpoint 都有 typed input 和 output schemas
- [ ] Error responses 遵循单一一致格式
- [ ] Validation 只发生在 system boundaries
- [ ] List endpoints 支持 pagination
- [ ] New fields 是 additive 且 optional（backward compatible）
- [ ] 所有 endpoints 的 naming 遵循一致 conventions
- [ ] API documentation 或 types 与 implementation 一起提交
