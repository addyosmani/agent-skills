---
name: documentation-and-adrs
description: 记录决策和 documentation。用于做 architectural decisions、修改 public APIs、shipping features，或需要记录未来 engineers 和 agents 理解 codebase 所需 context 时。
---

# Documentation and ADRs

## Overview
记录 decisions，而不只是记录 code。最有价值的 documentation 捕获 *why*：导致某个 decision 的 context、constraints 和 trade-offs。Code 展示构建了 *what*；documentation 解释 *为什么这样构建* 以及 *考虑过哪些 alternatives*。这些 context 对未来处理 codebase 的人类和 agents 都必不可少。

## When to Use
- 做重要 architectural decision
- 在竞争 approaches 之间选择
- 添加或修改 public API
- Shipping 会改变 user-facing behavior 的 feature
- 帮助新 team members（或 agents）熟悉项目
- 当你发现自己反复解释同一件事时

**何时不要使用：** 不要记录显而易见的 code。不要添加重复代码含义的 comments。不要为 throwaway prototypes 写 docs。

## Architecture Decision Records (ADRs)（架构决策记录）

ADRs 捕获重大技术决策背后的 reasoning。它们是你能写出的最高价值 documentation。

### When to Write an ADR（何时写 ADR）

- 选择 framework、library 或 major dependency
- 设计 data model 或 database schema
- 选择 authentication strategy
- 决定 API architecture（REST vs. GraphQL vs. tRPC）
- 在 build tools、hosting platforms 或 infrastructure 之间选择
- 任何回滚成本很高的 decision

### ADR Template（ADR 模板）

将 ADRs 按顺序编号存放在 `docs/decisions/`：

```markdown
# ADR-001: 使用 PostgreSQL 作为 primary database

## Status（状态）
Accepted | Superseded by ADR-XXX | Deprecated

## Date（日期）
2025-01-15

## Context（背景）
我们需要 task management application 的 primary database。关键 requirements：
- Relational data model（users、tasks、teams 及其 relationships）
- task state changes 需要 ACID transactions
- 支持 task content 的 full-text search
- 有 managed hosting（小团队，ops capacity 有限）

## Decision（决策）
使用 PostgreSQL 和 Prisma ORM。

## Alternatives Considered（考虑过的替代方案）

### MongoDB
- Pros: Flexible schema，容易启动
- Cons: 我们的数据天然 relational；需要手动管理 relationships
- Rejected: 在 document store 中存 relational data 会导致复杂 joins 或 data duplication

### SQLite
- Pros: Zero configuration、embedded、reads 很快
- Cons: concurrent write support 有限，production 没有 managed hosting
- Rejected: 不适合 production 中的 multi-user web application

### MySQL
- Pros: Mature、widely supported
- Cons: PostgreSQL 有更好的 JSON support、full-text search 和 ecosystem tooling
- Rejected: PostgreSQL 更适合我们的 feature requirements

## Consequences（后果）
- Prisma 提供 type-safe database access 和 migration management
- 可使用 PostgreSQL full-text search，而无需添加 Elasticsearch
- 团队需要 PostgreSQL knowledge（standard skill，low risk）
- Hosting 使用 managed service（Supabase、Neon 或 RDS）
```

### ADR Lifecycle（ADR 生命周期）

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **不要删除旧 ADRs。** 它们捕获 historical context。
- decision 变化时，写新的 ADR，引用并 supersede 旧 ADR。

## Inline Documentation（内联文档）

### When to Comment（何时写注释）

Comment *why*，不要 comment *what*：

```typescript
// BAD: 重复 code 含义
// Increment counter by 1
counter += 1;

// GOOD: 解释不明显的 intent
// Rate limit 使用 sliding window，在 window boundary 重置 counter，
// 而不是按固定 schedule 重置，以防止 window edges 的 burst attacks
if (now - windowStart > WINDOW_SIZE_MS) {
  counter = 0;
  windowStart = now;
}
```

### When NOT to Comment（何时不要写注释）

```typescript
// 不要 comment self-explanatory code
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// 不要留下 TODO comments 给现在就该做的事
// TODO: add error handling  ← 直接加上

// 不要留下 commented-out code
// const oldImplementation = () => { ... }  ← 删除它，git 有 history
```

### Document Known Gotchas（记录已知陷阱）

```typescript
/**
 * IMPORTANT: 此 function 必须在 first render 前调用。
 * 如果 hydration 后调用，会造成 unstyled content flash，
 * 因为 SSR 期间 theme context 不可用。
 *
 * 完整 design rationale 见 ADR-003。
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```

## API Documentation（API 文档）

对 public APIs（REST、GraphQL、library interfaces）：

### Inline with Types（TypeScript 首选）

```typescript
/**
 * 创建新 task。
 *
 * @param input - Task creation data（title required，description optional）
 * @returns 包含 server-generated ID 和 timestamps 的 created task
 * @throws {ValidationError} 如果 title 为空或超过 200 characters
 * @throws {AuthenticationError} 如果 user 未 authenticated
 *
 * @example
 * const task = await createTask({ title: 'Buy groceries' });
 * console.log(task.id); // "task_abc123"
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // ...
}
```

### OpenAPI / Swagger for REST APIs（REST API）

```yaml
paths:
  /api/tasks:
    post:
      summary: 创建 task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Task 已创建
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: 验证错误
```

## README Structure（README 结构）

每个项目都应有 README，覆盖：

```markdown
# 项目名称

用一段话描述这个项目做什么。

## Quick Start（快速开始）
1. Clone repo
2. 安装 dependencies：`npm install`
3. 设置 environment：`cp .env.example .env`
4. 运行 dev server：`npm run dev`

## Commands（命令）
| Command | 说明 |
|---------|-------------|
| `npm run dev` | 启动 development server |
| `npm test` | 运行 tests |
| `npm run build` | Production build |
| `npm run lint` | 运行 linter |

## Architecture（架构）
简要说明 project structure 和关键 design decisions。
链接到 ADRs 获取细节。

## Contributing（贡献）
如何 contribute、coding standards、PR process。
```

## Changelog Maintenance（维护 Changelog）

对已 shipping features：

```markdown
# Changelog

## [1.2.0] - 2025-01-20
### Added（新增）
- Task sharing：users 可以与 team members 分享 tasks (#123)
- Task assignments 的 email notifications (#124)

### Fixed（修复）
- 快速点击 create button 时出现 duplicate tasks (#125)

### Changed（变更）
- 为改善 UX，task list 现在每页加载 50 items（之前是 20）(#126)
```

## Documentation for Agents（面向 Agents 的文档）

AI agent context 的特别考虑：

- **CLAUDE.md / rules files** — 记录 project conventions，确保 agents 遵循
- **Spec files** — 保持 specs 更新，确保 agents 构建正确内容
- **ADRs** — 帮助 agents 理解过去 decisions 的原因（避免重新决策）
- **Inline gotchas** — 防止 agents 掉入已知陷阱

## Common Rationalizations
| 借口 | 现实 |
|---|---|
| “代码是 self-documenting” | Code 显示 what，不显示 why、不显示哪些 alternatives 被拒绝，也不显示适用 constraints。 |
| “API 稳定后再写 docs” | 写 docs 会让 API 更快稳定。doc 是 design 的第一个 test。 |
| “没人读 docs” | Agents 会读。未来 engineers 会读。三个月后的你也会读。 |
| “ADRs 是 overhead” | 10 分钟 ADR 能避免 6 个月后为同一 decision 争论 2 小时。 |
| “Comments 会过时” | 关于 *why* 的 comments 稳定。关于 *what* 的 comments 会过时，所以只写前者。 |

## Red Flags
- Architectural decisions 没有 written rationale
- Public APIs 没有 documentation 或 types
- README 没解释如何运行项目
- 用 commented-out code 代替删除
- TODO comments 已存在数周
- 有重大 architectural choices 的项目没有 ADRs
- Documentation 重复 code，而不是解释 intent

## Verification
完成 documentation 后确认：

- [ ] 所有重大 architectural decisions 都有 ADRs
- [ ] README 覆盖 quick start、commands 和 architecture overview
- [ ] API functions 有 parameter 和 return type documentation
- [ ] Known gotchas 在重要位置 inline documented
- [ ] 没有剩余 commented-out code
- [ ] Rules files（CLAUDE.md 等）是 current 且 accurate
