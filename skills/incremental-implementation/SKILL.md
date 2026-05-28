---
name: incremental-implementation
description: 增量交付变更。用于实现任何涉及多个文件的 feature 或 change。也用于你准备一次性写大量代码，或任务大到无法一步落地时。
---

# Incremental Implementation

## Overview
用薄的纵向切片构建：实现一小块，测试，验证，再扩展。避免一次性实现整个 feature。每个 increment 都应让系统保持可工作、可测试状态。这种执行纪律能让大型 feature 变得可控。

## When to Use
- 实现任何多文件变更
- 按 task 拆解构建新 feature
- 重构现有代码
- 任何想在测试前写超过约 100 行代码的时候

**何时不要使用：** 单文件、单函数变更，且 scope 已经足够小。

## Increment Cycle

```
┌──────────────────────────────────────┐
│                                      │
│   实现 ──→ 测试 ──→ 验证 ──┐        │
│    ▲                      │        │
│    └───── 提交 ◄──────────┘        │
│           │                         │
│           ▼                         │
│        下一切片                     │
│                                      │
└──────────────────────────────────────┘
```

对每个 slice：

1. **实现** 最小的完整功能片段
2. **测试** — 运行 test suite（如果没有测试，先写测试）
3. **验证** — 确认该 slice 按预期工作（tests pass、build succeeds、manual check）
4. **提交** -- 用描述性 message 保存进度（atomic commit 指南见 `git-workflow-and-versioning`）
5. **进入下一切片** — 继续推进，不要重来

## 切片策略

### Vertical Slices（首选）

构建一条贯穿 stack 的完整路径：

```
Slice 1: Create a task (DB + API + basic UI)
    → Tests pass，用户可以通过 UI 创建 task

Slice 2: List tasks (query + API + UI)
    → Tests pass，用户可以看到自己的 tasks

Slice 3: Edit a task (update + API + UI)
    → Tests pass，用户可以修改 tasks

Slice 4: Delete a task (delete + API + UI + confirmation)
    → Tests pass，完整 CRUD 完成
```

每个 slice 都交付可工作的端到端功能。

### Contract-First Slicing

当 backend 和 frontend 需要并行开发时：

```
Slice 0: 定义 API contract (types, interfaces, OpenAPI spec)
Slice 1a: 按 contract 实现 backend + API tests
Slice 1b: 按 contract 用 mock data 实现 frontend
Slice 2: 集成并端到端测试
```

### Risk-First Slicing

先处理风险最高或最不确定的部分：

```
Slice 1: 证明 WebSocket connection 可工作（最高风险）
Slice 2: 基于已验证的 connection 构建 real-time task updates
Slice 3: 增加 offline support 和 reconnection
```

如果 Slice 1 失败，你会在投入 Slices 2 和 3 之前发现。

## 实现规则

### Rule 0: Simplicity First

写任何代码前，先问：“能工作的最简单方案是什么？”

写完代码后，按这些检查点 review：
- 这能用更少行完成吗？
- 这些 abstractions 值得它们带来的复杂度吗？
- Staff engineer 会不会看完说“为什么不直接...”？
- 我是在为假想的未来需求构建，还是为当前 task 构建？

```
SIMPLICITY CHECK:
✗ 为一个 notification 做带 middleware pipeline 的 Generic EventBus
✓ 简单函数调用

✗ 为两个相似 components 做 abstract factory pattern
✓ 两个直接的 components，加 shared utilities

✗ 为三个 forms 做 config-driven form builder
✓ 三个 form components
```

三行相似代码好过过早抽象。先实现 naive、明显正确的版本。只有在 tests 证明正确后再优化。

### Rule 0.5: Scope Discipline

只触碰 task 需要的内容。

不要：
- “顺手清理”你改动旁边的代码
- 在未修改的文件中重构 imports
- 删除你没有完全理解的 comments
- 因为“看起来有用”而添加 spec 外的 feature
- 在只是阅读的文件里现代化 syntax

如果发现 task scope 外值得改进的东西，记下来，不要修：

```
NOTICED BUT NOT TOUCHING:
- src/utils/format.ts 有一个 unused import（与本 task 无关）
- auth middleware 的 error messages 可以更好（独立 task）
→ 要我为这些创建 tasks 吗？
```

### Rule 1: One Thing at a Time

每个 increment 只改变一件逻辑事情。不要混合 concerns：

**Bad:** 一个 commit 同时新增 component、重构现有 component、更新 build config。

**Good:** 三个独立 commits，每个 change 一个。

### Rule 2: Keep It Compilable

每个 increment 后，project 必须能 build，现有 tests 必须通过。不要让 codebase 在 slices 之间处于 broken state。

### Rule 3: Feature Flags for Incomplete Features

如果 feature 尚未可面向用户，但你需要 merge increments：

```typescript
// Feature flag for work-in-progress
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';

if (ENABLE_TASK_SHARING) {
  // New sharing UI
}
```

这样可以把小 increments merge 到 main branch，而不暴露未完成工作。

### Rule 4: Safe Defaults

新代码应默认采用安全、保守行为：

```typescript
// Safe: disabled by default, opt-in
export function createTask(data: TaskInput, options?: { notify?: boolean }) {
  const shouldNotify = options?.notify ?? false;
  // ...
}
```

### Rule 5: Rollback-Friendly

每个 increment 都应可独立 revert：

- Additive changes（新文件、新函数）易于 revert
- 对现有代码的修改应最小且聚焦
- Database migrations 应有对应 rollback migrations
- 避免在同一个 commit 中删除某物并替换它，拆开处理

## 与 Agents 协作

指导 agent 增量实现时：

```
“我们来实现 plan 里的 Task 3。

先只做 database schema change 和 API endpoint。
暂时不要碰 UI，我们在下一个 increment 做。

实现后，运行 `npm test` 和 `npm run build` 验证
没有破坏任何东西。”
```

明确每个 increment 的 scope 和不在 scope 的内容。

## Increment Checklist

每个 increment 后验证：

- [ ] 变更只做一件事，并完整做好
- [ ] 所有现有 tests 仍通过 (`npm test`)
- [ ] Build 成功 (`npm run build`)
- [ ] Type checking 通过 (`npx tsc --noEmit`)
- [ ] Linting 通过 (`npm run lint`)
- [ ] 新功能按预期工作
- [ ] 变更已用描述性 message 提交

**Note:** 在可能影响某个验证命令结果的变更后运行该命令。成功运行后，除非代码又发生变化，否则不要重复运行同一命令；对未变更代码重复运行不会提供新信息。

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| “我最后一起测” | Bugs 会叠加。Slice 1 的 bug 会让 Slices 2-5 都错。每个 slice 都要测试。 |
| “一次做完更快” | 在出问题且无法定位是哪 500 行变更导致之前，它只是*感觉*更快。 |
| “这些 changes 太小，不值得分开 commit” | 小 commits 几乎没有成本。大 commits 隐藏 bugs，也让 rollback 痛苦。 |
| “我稍后再加 feature flag” | 如果 feature 未完成，就不该对用户可见。现在就加 flag。 |
| “这个 refactor 足够小，可以一起带上” | Refactors 和 features 混在一起，会让两者都更难 review 和 debug。拆开。 |
| “我再跑一次 build 确认一下” | 成功运行后，除非代码发生变化，重复同一命令没有价值。后续 edits 后再运行，不要为求安心重复运行。 |

## Red Flags

- 未运行 tests 就写了超过 100 行代码
- 一个 increment 中有多个无关 changes
- “我顺手也加一下这个”的 scope expansion
- 为了更快推进而跳过 test/verify 步骤
- Increments 之间 build 或 tests broken
- 大量 uncommitted changes 堆积
- 在第三个 use case 真正需要前就构建 abstractions
- “既然在这里”就触碰 task scope 外的 files
- 为一次性操作创建新的 utility files
- 在没有任何代码变更的情况下连续两次运行同一个 build/test command

## Verification
完成一个 task 的所有 increments 后：

- [ ] 每个 increment 都已单独测试并提交
- [ ] Full test suite 通过
- [ ] Build clean
- [ ] Feature 按 spec 端到端工作
- [ ] 没有剩余 uncommitted changes
