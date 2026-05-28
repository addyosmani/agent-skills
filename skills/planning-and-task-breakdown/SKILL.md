---
name: planning-and-task-breakdown
description: 将 work 拆成有序 tasks。用于已有 spec 或清晰 requirements、需要拆成可实现 tasks 时。也用于 task 太大而无法开始、需要估算 scope，或可以并行 work 时。
---

# Planning and Task Breakdown

## Overview
将 work 拆解为小而可验证的 tasks，并配有明确 acceptance criteria。好的 task breakdown，决定了 agent 是能可靠完成工作，还是产出一团乱麻。每个 task 都应足够小，可以在一次专注 session 内实现、测试和验证。

## When to Use
- 你已有 spec，需要拆成可实现 units
- Task 太大或太模糊，难以开始
- Work 需要跨多个 agents 或 sessions 并行
- 你需要向人类沟通 scope
- 实现顺序不明显

**何时不要使用：** Scope 明显的单文件变更，或 spec 已包含定义良好的 tasks。

## Planning 流程

### Step 1: 进入 Plan Mode

写任何代码前，在 read-only mode 下操作：

- 阅读 spec 和相关 codebase sections
- 识别 existing patterns 和 conventions
- 映射 components 之间的 dependencies
- 记录 risks 和 unknowns

**Planning 期间不要写代码。** 输出是 plan document，不是 implementation。

### Step 2: 识别 Dependency Graph

映射谁依赖谁：

```
Database schema
    │
    ├── API models/types
    │       │
    │       ├── API endpoints
    │       │       │
    │       │       └── Frontend API client
    │       │               │
    │       │               └── UI components
    │       │
    │       └── Validation logic
    │
    └── Seed data / migrations
```

实现顺序按 dependency graph 自底向上：先构建 foundations。

### Step 3: 垂直切片

不要先构建所有 database，再构建所有 API，再构建所有 UI；一次构建一条完整 feature path：

**坏（horizontal slicing）：**
```
Task 1: 构建整个 database schema
Task 2: 构建所有 API endpoints
Task 3: 构建所有 UI components
Task 4: 连接所有内容
```

**好（vertical slicing）：**
```
Task 1: User 可以创建 account（registration 的 schema + API + UI）
Task 2: User 可以 log in（login 的 auth schema + API + UI）
Task 3: User 可以创建 task（creation 的 task schema + API + UI）
Task 4: User 可以查看 task list（list view 的 query + API + UI）
```

每个 vertical slice 都交付可工作的、可测试的 functionality。

### Step 4: 编写 Tasks

每个 task 遵循此结构：

```markdown
## Task [N]: [简短描述性标题]

**Description:** 一段说明此 task 完成什么。

**Acceptance criteria:**
- [ ] [具体、可测试的条件]
- [ ] [具体、可测试的条件]

**Verification:**
- [ ] Tests pass: `npm test -- --grep "feature-name"`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: [要验证什么的说明]

**Dependencies:** [依赖的 Task 编号，或 "None"]

**Files likely touched:**
- `src/path/to/file.ts`
- `tests/path/to/test.ts`

**Estimated scope:** [Small: 1-2 files | Medium: 3-5 files | Large: 5+ files]
```

### Step 5: 排序并设置 Checkpoint

安排 tasks 时确保：

1. Dependencies 已满足（先构建 foundation）
2. 每个 task 完成后系统都处于可工作状态
3. 每 2-3 个 tasks 后有 verification checkpoints
4. 高风险 tasks 靠前（fail fast）

添加明确 checkpoints：

```markdown
## Checkpoint: After Tasks 1-3
- [ ] 所有 tests pass
- [ ] Application builds without errors
- [ ] Core user flow works end-to-end
- [ ] 继续前与人类 review
```

## Task 大小指南

| Size | Files | Scope | Example |
|------|-------|-------|---------|
| **XS** | 1 | 单个 function 或 config change | 添加 validation rule |
| **S** | 1-2 | 一个 component 或 endpoint | 添加新 API endpoint |
| **M** | 3-5 | 一个 feature slice | User registration flow |
| **L** | 5-8 | Multi-component feature | Search with filtering and pagination |
| **XL** | 8+ | **太大，需要继续拆分** | — |

如果 task 是 L 或更大，应拆成更小 tasks。Agent 最适合执行 S 和 M tasks。

**何时继续拆分 task：**
- 需要超过一次专注 session（约 2+ 小时 agent work）
- 无法用 3 条或更少 bullets 描述 acceptance criteria
- 触及两个或更多独立 subsystems（例如 auth 和 billing）
- Task title 中出现 “and”（通常意味着这是两个 tasks）

## Plan Document Template

```markdown
# Implementation Plan: [Feature/Project Name]

## Overview
[一段总结要构建什么]

## Architecture Decisions
- [Key decision 1 及 rationale]
- [Key decision 2 及 rationale]

## Task List

### Phase 1: Foundation
- [ ] Task 1: ...
- [ ] Task 2: ...

### Checkpoint: Foundation
- [ ] Tests pass，builds clean

### Phase 2: Core Features
- [ ] Task 3: ...
- [ ] Task 4: ...

### Checkpoint: Core Features
- [ ] End-to-end flow works

### Phase 3: Polish
- [ ] Task 5: ...
- [ ] Task 6: ...

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Strategy] |

## Open Questions
- [需要人类输入的问题]
```

## 并行化机会

当有多个 agents 或 sessions 可用时：

- **可安全并行：** 独立 feature slices、已实现 features 的 tests、documentation
- **必须串行：** Database migrations、shared state changes、dependency chains
- **需要协调：** 共享 API contract 的 features（先定义 contract，再并行）

## Common Rationalizations
| 合理化 | 现实 |
|---|---|
| “我会边做边弄清楚” | 这会导致一团乱麻和返工。10 分钟 planning 可节省数小时。 |
| “Tasks 很明显” | 仍然写下来。明确 tasks 会暴露隐藏 dependencies 和被遗忘的 edge cases。 |
| “Planning 是 overhead” | Planning 就是 task。没有 plan 的 implementation 只是打字。 |
| “我可以全记在脑子里” | Context windows 有限。书面 plans 能跨 session boundaries 和 compaction 存活。 |

## Red Flags

- 没有书面 task list 就开始 implementation
- Tasks 写成“implement the feature”，却没有 acceptance criteria
- Plan 中没有 verification steps
- 所有 tasks 都是 XL-sized
- Tasks 之间没有 checkpoints
- 未考虑 dependency order

## Verification

开始 implementation 前，确认：

- [ ] 每个 task 都有 acceptance criteria
- [ ] 每个 task 都有 verification step
- [ ] Task dependencies 已识别且顺序正确
- [ ] 没有 task 触及超过约 5 个 files
- [ ] Major phases 之间存在 checkpoints
- [ ] 人类已 review 并 approve plan
