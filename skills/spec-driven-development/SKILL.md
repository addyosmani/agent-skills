---
name: spec-driven-development
description: 编码前先创建 spec。用于启动新项目、新功能或重要变更，且尚无 specification 时。也用于需求不清、存在歧义，或只有模糊想法时。
---

# Spec-Driven Development

## Overview
写任何代码前，先写结构化 specification。spec 是你和人类工程师之间共享的事实来源，定义要构建什么、为什么构建，以及如何判断完成。没有 spec 就写代码，本质是在猜。

## When to Use
- 启动新项目或新功能
- 需求含糊或不完整
- 变更会影响多个文件或模块
- 即将做架构决策
- 任务实现预计超过 30 分钟

**何时不要使用：** 单行修复、拼写修正，或需求明确且自包含的变更。

## 带 Gate 的工作流

Spec-driven development 有四个阶段。当前阶段未验证前，不要进入下一阶段。

```
SPECIFY ──→ PLAN ──→ TASKS ──→ IMPLEMENT
   │          │        │          │
   ▼          ▼        ▼          ▼
 人类       人类      人类       人类
 review     review   review     review
```

### Phase 1: Specify

从高层愿景开始。持续向人类提澄清问题，直到需求足够具体。

**立即暴露假设。** 写任何 spec 内容前，先列出你的假设：

```
我正在做的假设：
1. 这是一个 web application，不是 native mobile
2. Authentication 使用 session-based cookies，不使用 JWT
3. Database 是 PostgreSQL，依据是现有 Prisma schema
4. 只面向 modern browsers，不支持 IE11
→ 如有不对，请现在纠正；否则我会按这些假设继续。
```

不要静默补全模糊需求。spec 的核心价值，是在写代码前暴露误解；假设是最危险的误解形式。

**编写 spec 文档，覆盖以下六个核心区域：**

1. **Objective** — 要构建什么，为什么构建？用户是谁？成功是什么样？

2. **Commands** — 写完整可执行命令和 flags，不要只写工具名。
   ```
   Build: npm run build
   Test: npm test -- --coverage
   Lint: npm run lint --fix
   Dev: npm run dev
   ```

3. **Project Structure** — 源码放哪里，测试放哪里，文档放哪里。
   ```
   src/           → application source code
   src/components → React components
   src/lib        → shared utilities
   tests/         → unit and integration tests
   e2e/           → end-to-end tests
   docs/          → documentation
   ```

4. **Code Style** — 一个真实代码片段胜过三段文字说明。包含命名约定、格式规则，以及好输出的例子。

5. **Testing Strategy** — 使用什么 framework，测试放哪里，coverage 期望是什么，不同关注点分别用哪一层测试。

6. **Boundaries** — 三层边界：
   - **Always do:** 提交前运行测试，遵守命名约定，验证输入
   - **Ask first:** 修改数据库 schema，新增 dependencies，修改 CI config
   - **Never do:** 提交 secrets，编辑 vendor 目录，未经批准删除 failing tests

**Spec template:**

```markdown
# Spec: [项目/Feature 名称]

## Objective
[要构建什么以及为什么构建。User stories 或 acceptance criteria。]

## Tech Stack
[Framework、language、关键 dependencies 及其版本。]

## Commands
[Build、test、lint、dev 的完整命令。]

## Project Structure
[目录结构及说明。]

## Code Style
[示例代码片段 + 关键约定。]

## Testing Strategy
[Framework、测试位置、coverage 要求、测试层级。]

## Boundaries
- Always: [...]
- Ask first: [...]
- Never: [...]

## Success Criteria
[如何判断完成：具体、可测试的条件。]

## Open Questions
[任何尚未解决、需要人类输入的问题。]
```

**把指令重写为成功标准。** 收到模糊需求时，将它转成具体条件：

```
需求：“让 dashboard 更快”

重写后的 success criteria：
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ 这些目标是否正确？
```

这样可以围绕清晰目标循环、重试和解决问题，而不是猜“更快”是什么意思。

### Phase 2: Plan

基于已验证的 spec，生成技术实现计划：

1. 识别主要 components 及其 dependencies
2. 确定实现顺序：哪些必须先做
3. 记录风险和缓解策略
4. 区分哪些可并行，哪些必须串行
5. 定义各阶段之间的验证 checkpoints

计划必须可评审：人类应能读完后明确说“是，这个方向对”或“不，改 X”。

### Phase 3: Tasks

把计划拆成离散、可实现的 tasks：

- 每个 task 应能在一次专注 session 内完成
- 每个 task 都有明确 acceptance criteria
- 每个 task 都包含 verification step：test、build 或 manual check
- tasks 按 dependency 排序，不按主观重要性排序
- 单个 task 不应要求修改超过约 5 个文件

**Task template:**
```markdown
- [ ] Task: [描述]
  - Acceptance: [完成后必须满足什么]
  - Verify: [如何确认：test command、build、manual check]
  - Files: [会修改哪些文件]
```

### Phase 4: Implement

一次只执行一个 task，并遵循 `skills/incremental-implementation/SKILL.md` (`incremental-implementation`) 和 `skills/test-driven-development/SKILL.md` (`test-driven-development`)。每一步使用 `skills/context-engineering/SKILL.md` (`context-engineering`) 加载正确的 spec sections 和 source files，不要把整个 spec 一次性塞给 agent。

## 保持 Spec 有生命

spec 是活文档，不是一次性产物：

- **决策变化时更新** — 如果发现 data model 需要改变，先更新 spec，再实现。
- **范围变化时更新** — 新增或移除 features，都要反映到 spec 中。
- **提交 spec** — spec 应和代码一起进入 version control。
- **在 PR 中引用 spec** — 链接到每个 PR 实现的 spec section。

## Common Rationalizations
| 借口 | 现实 |
|---|---|
| “这很简单，不需要 spec” | 简单任务不需要长 spec，但仍需要 acceptance criteria。两行 spec 也可以。 |
| “我写完代码后再补 spec” | 那是 documentation，不是 specification。spec 的价值在于写代码前强制澄清。 |
| “spec 会拖慢速度” | 15 分钟 spec 可避免数小时返工。15 分钟 waterfall 胜过 15 小时 debugging。 |
| “需求反正会变” | 所以 spec 才是活文档。过时 spec 也比没有 spec 好。 |
| “用户知道自己想要什么” | 再清楚的请求也有隐含假设。spec 要把这些假设暴露出来。 |

## Red Flags

- 没有任何书面需求就开始写代码
- 在澄清“完成”含义前就问“要不要直接开始做？”
- 实现 spec 或 task list 中未提到的 feature
- 做架构决策但不记录
- 因为“要做什么很明显”而跳过 spec

## Verification

进入实现前，确认：

- [ ] spec 覆盖全部六个核心区域
- [ ] 人类已 review 并 approve spec
- [ ] success criteria 具体且可测试
- [ ] Boundaries（Always/Ask First/Never）已定义
- [ ] spec 已保存到 repository 文件中
