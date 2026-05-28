---
name: deprecation-and-migration
description: 管理 deprecation 和 migration。当移除旧系统、API 或功能时使用。当将用户从一种实现迁移到另一种实现时使用。当决定维护还是下线现有代码时使用。
---

# 弃用与迁移

## Overview
代码是负债，不是资产。每一行代码都有持续维护成本：要修 bug、更新 dependency、应用 security patches，并让新工程师理解。Deprecation 是移除不再值得维护的代码的纪律，migration 是把用户从旧方案安全迁移到新方案的过程。

多数工程组织擅长构建，少数擅长移除。本 skill 用来补上这个缺口。

## When to Use
- 用新系统、API 或 library 替换旧系统、API 或 library
- 下线不再需要的功能
- 合并重复实现
- 移除没人拥有但所有人依赖的 dead code
- 规划新系统 lifecycle（deprecation planning 从设计阶段开始）
- 决定是维护 legacy system，还是投入 migration

## 核心原则

### Code 是负债

每一行代码都有持续成本：需要 tests、documentation、security patches、dependency updates，也给附近工作的人带来认知负担。代码的价值在于它提供的功能，而不是代码本身。当同样功能可以用更少代码、更少复杂度或更好 abstraction 提供时，旧代码就应该移除。

### Hyrum's Law 让移除变难

用户足够多时，每个可观察行为都会被依赖，包括 bug、timing quirks 和未文档化的 side effects。因此 deprecation 需要主动 migration，而不是只发公告。当用户依赖了替代方案没有复刻的行为时，他们不能“直接切换”。

### Deprecation Planning 从设计阶段开始

构建新东西时，问：“3 年后我们会如何移除它？” 设计时具备清晰 interfaces、feature flags 和最小 surface area 的系统，比到处泄漏实现细节的系统更容易 deprecate。

## Deprecation 决策

弃用任何东西前，回答这些问题：

```
1. 这个系统是否仍提供独特价值？
   → 如果是，继续维护。如果否，继续。

2. 有多少 users/consumers 依赖它？
   → 量化 migration scope。

3. 是否已有 replacement？
   → 如果没有，先构建 replacement。没有替代方案就不要 deprecate。

4. 每个 consumer 的 migration cost 是多少？
   → 如果能简单自动化，就自动化。如果需要手动且成本高，与维护成本权衡。

5. 不 deprecate 的持续维护成本是什么？
   → Security risk、engineer time、复杂度带来的 opportunity cost。
```

## Compulsory vs Advisory Deprecation

| 类型 | 何时使用 | 机制 |
|------|-------------|-----------|
| **Advisory** | Migration 可选，旧系统稳定 | Warnings、documentation、nudges。用户按自己的节奏迁移。 |
| **Compulsory** | 旧系统有 security issues、阻碍进展，或维护成本不可持续 | 硬截止日期。旧系统将在日期 X 移除。提供 migration tooling。 |

**默认 advisory。** 只有当维护成本或风险足以证明强制迁移合理时，才使用 compulsory。Compulsory deprecation 必须提供 migration tooling、documentation 和 support，不能只宣布 deadline。

## Migration 流程

### Step 1: 构建 Replacement

没有可用替代方案就不要 deprecate。Replacement 必须：

- 覆盖旧系统所有关键 use cases
- 有 documentation 和 migration guides
- 已在 production 中验证（不是只在理论上更好）

### Step 2: 公告并文档化

```markdown
## Deprecation Notice: OldService

**Status:** Deprecated as of 2025-03-01
**Replacement:** NewService（见下方 migration guide）
**Removal date:** Advisory — 暂无硬截止日期
**Reason:** OldService 需要手动 scaling，且缺少 observability。
            NewService 会自动处理两者。

### Migration Guide
1. 将 `import { client } from 'old-service'` 替换为 `import { client } from 'new-service'`
2. 更新 configuration（见下方 examples）
3. 运行 migration verification script: `npx migrate-check`
```

### Step 3: 增量迁移

一次迁移一个 consumer，不要一次性全部迁移。对每个 consumer：

```
1. 识别与 deprecated system 的所有 touchpoints
2. 更新为使用 replacement
3. 验证行为匹配（tests、integration checks）
4. 移除对旧系统的 references
5. 确认没有 regressions
```

**The Churn Rule:** 如果你拥有正在被 deprecate 的 infrastructure，就负责迁移你的用户，或提供无需 migration 的 backward-compatible updates。不要只宣布 deprecation，然后让用户自己摸索。

### Step 4: 移除旧系统

只有所有 consumers 都完成 migration 后：

```
1. 验证 active usage 为零（metrics、logs、dependency analysis）
2. 移除代码
3. 移除相关 tests、documentation 和 configuration
4. 移除 deprecation notices
5. 庆祝 — 移除代码是一项成就
```

## Migration Patterns

### Strangler Pattern

让新旧系统并行运行。逐步把 traffic 从旧系统路由到新系统。当旧系统处理 0% traffic 时，移除旧系统。

```
Phase 1: 新系统处理 0%，旧系统处理 100%
Phase 2: 新系统处理 10% (canary)
Phase 3: 新系统处理 50%
Phase 4: 新系统处理 100%，旧系统 idle
Phase 5: 移除旧系统
```

### Adapter Pattern

创建 adapter，把旧 interface 的调用转换到新 implementation。Consumers 在你迁移 backend 时继续使用旧 interface。

```typescript
// Adapter: 旧 interface，新 implementation
class LegacyTaskService implements OldTaskAPI {
  constructor(private newService: NewTaskService) {}

  // 旧 method signature，委托给新 implementation
  getTask(id: number): OldTask {
    const task = this.newService.findById(String(id));
    return this.toOldFormat(task);
  }
}
```

### Feature Flag Migration

使用 feature flags，将 consumers 逐个从旧系统切到新系统：

```typescript
function getTaskService(userId: string): TaskService {
  if (featureFlags.isEnabled('new-task-service', { userId })) {
    return new NewTaskService();
  }
  return new LegacyTaskService();
}
```

## Zombie Code

Zombie code 是没人拥有但所有人依赖的代码。它没有主动维护者，没有清晰 owner，会持续累积 security vulnerabilities 和 compatibility issues。迹象：

- 6+ 个月没有 commits，但仍有 active consumers
- 没有指定 maintainer 或 team
- Failing tests 无人修复
- Dependencies 存在已知 vulnerabilities，但无人更新
- Documentation 引用了已不存在的 systems

**处理方式:** 要么指定 owner 并正确维护，要么用具体 migration plan deprecate。Zombie code 不能悬置；要么投入，要么移除。

## Common Rationalizations
| 借口 | 现实 |
|---|---|
| “它还能用，为什么要移除？” | 无人维护的可用代码会累积 security debt 和复杂度。维护成本会静默增长。 |
| “以后可能有人需要” | 以后需要时可以重建。为了“以防万一”保留未使用代码，成本高于重建。 |
| “migration 太贵” | 将 migration cost 与未来 2-3 年持续维护成本比较。长期看 migration 通常更便宜。 |
| “等新系统完成后再 deprecate” | Deprecation planning 从设计阶段开始。等新系统完成时，你会有新的优先级。现在就规划。 |
| “用户会自己迁移” | 不会。提供 tooling、documentation 和 incentives，或自己执行 migration（The Churn Rule）。 |
| “我们可以无限期维护两个系统” | 两个系统做同一件事，意味着双倍 maintenance、testing、documentation 和 onboarding cost。 |

## Red Flags
- Deprecated systems 没有可用 replacement
- Deprecation announcements 没有 migration tooling 或 documentation
- “Soft” deprecation 已 advisory 多年但没有进展
- Zombie code 没有 owner 但有 active consumers
- 向 deprecated system 添加新功能（应投入 replacement）
- Deprecation 前没有测量 current usage
- 未验证 active consumers 为零就移除代码

## Verification
完成 deprecation 后：

- [ ] Replacement 已在 production 验证，并覆盖所有关键 use cases
- [ ] Migration guide 存在，包含具体步骤和 examples
- [ ] 所有 active consumers 已迁移（通过 metrics/logs 验证）
- [ ] 旧代码、tests、documentation 和 configuration 已完全移除
- [ ] Codebase 中不再有 deprecated system 的 references
- [ ] Deprecation notices 已移除（它们已完成使命）
