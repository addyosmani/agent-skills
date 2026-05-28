---
name: using-agent-skills
description: 发现并调用 agent skills。用于开始 session，或需要判断当前 task 适用哪个 skill 时。这是管理所有其他 skills 如何被发现和调用的 meta-skill。
---

# Using Agent Skills

## Overview
Agent Skills 是一组按开发阶段组织的工程 workflow skills。每个 skill 都编码了 senior engineers 会遵循的具体流程。这个 meta-skill 帮助你发现并应用当前 task 所需的正确 skill。

## Skill 发现

当 task 到来时，识别开发阶段并应用对应 skill：

```
Task 到来
    │
    ├── 还不知道想要什么？ ───────────→ interview-me
    ├── 有粗略概念，需要变体？ ───────→ idea-refine
    ├── 新项目/feature/change？ ─────→ spec-driven-development
    ├── 有 spec，需要 tasks？ ───────→ planning-and-task-breakdown
    ├── 正在实现代码？ ───────────────→ incremental-implementation
    │   ├── UI 工作？ ───────────────→ frontend-ui-engineering
    │   ├── API 工作？ ──────────────→ api-and-interface-design
    │   ├── 需要更好的 context？ ───→ context-engineering
    │   ├── 需要文档验证的代码？ ────→ source-driven-development
    │   └── 风险高/代码不熟？ ───────→ doubt-driven-development
    ├── 编写/运行 tests？ ───────────→ test-driven-development
    │   └── 基于浏览器？ ────────────→ browser-testing-with-devtools
    ├── 出问题了？ ──────────────────→ debugging-and-error-recovery
    ├── Review 代码？ ───────────────→ code-review-and-quality
    │   ├── 太复杂？ ────────────────→ code-simplification
    │   ├── 有安全顾虑？ ────────────→ security-and-hardening
    │   └── 有性能顾虑？ ────────────→ performance-optimization
    ├── Commit/branch？ ─────────────→ git-workflow-and-versioning
    ├── CI/CD pipeline 工作？ ───────→ ci-cd-and-automation
    ├── 废弃/迁移？ ─────────────────→ deprecation-and-migration
    ├── 写 docs/ADRs？ ─────────────→ documentation-and-adrs
    └── 部署/发布？ ─────────────────→ shipping-and-launch
```

## 核心操作行为

这些行为始终适用，跨所有 skills。不可协商。

### 1. 暴露假设

实现任何非平凡内容前，明确说明你的假设：

```
我正在做的假设：
1. [关于需求的假设]
2. [关于架构的假设]
3. [关于范围的假设]
→ 如有不对，请现在纠正；否则我会按这些继续。
```

不要静默补全模糊需求。最常见的失败模式，是做出错误假设并在未检查的情况下继续。尽早暴露不确定性，比返工更便宜。

### 2. 主动管理困惑

遇到不一致、冲突需求或不清晰 specification 时：

1. **停止。** 不要靠猜继续。
2. 点明具体困惑。
3. 呈现 tradeoff 或提出澄清问题。
4. 等待解决后再继续。

**坏：** 静默选择一种解释，并希望它是对的。
**好：** “我看到 spec 里是 X，但现有代码是 Y。哪个优先？”

### 3. 必要时反驳

你不是 yes-machine。当某个方案有明确问题时：

- 直接指出问题
- 解释具体代价；能量化就量化，例如“这会增加约 200ms latency”，而不是“这可能更慢”
- 提出替代方案
- 如果人类在充分知情后仍决定覆盖，接受该决定

迎合是失败模式。“当然！”之后实现一个坏主意，对任何人都没帮助。诚实的技术分歧比虚假的认同更有价值。

### 4. 强制简单

你的自然倾向是过度复杂化。主动抵抗它。

完成任何实现前，先问：
- 能否用更少代码完成？
- 这些 abstractions 是否值得它们带来的复杂度？
- Staff engineer 看了会不会说“为什么不直接……”？

如果你写了 1000 行而 100 行足够，就是失败。优先选择无聊、明显的方案。聪明技巧很昂贵。

### 5. 保持范围纪律

只触碰被要求触碰的内容。

不要：
- 删除你不理解的注释
- “顺手清理”与 task 无关的代码
- 把相邻系统作为副作用重构
- 未经明确批准删除看似未使用的代码
- 因为“看起来有用”而添加 spec 外的 feature

你的工作是外科手术式精确，不是未经请求的翻新。

### 6. 验证，不要假设

每个 skill 都包含 verification step。任务未通过验证前不算完成。“看起来对”永远不够；必须有证据，例如通过的 tests、build 输出或 runtime 数据。

## 要避免的失败模式

这些细微错误看似高效，实际会制造问题：

1. 未检查就做出错误假设
2. 不管理自己的困惑；迷失时仍硬推进
3. 注意到不一致却不暴露
4. 对非显然决策不呈现 tradeoffs
5. 对明显有问题的方案迎合式回应（“当然！”）
6. 过度复杂化 code 和 APIs
7. 修改与 task 无关的代码或注释
8. 删除你未完全理解的内容
9. 因为“很明显”而无 spec 构建
10. 因为“看起来对”而跳过验证

## Skill 规则

1. **开始工作前检查是否有适用 skill。** Skills 编码了可防止常见错误的流程。

2. **Skills 是 workflows，不是建议。** 按顺序执行步骤。不要跳过 verification steps。

3. **多个 skills 可以同时适用。** 一个 feature implementation 可能按顺序涉及 `idea-refine` → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` → `test-driven-development` → `code-review-and-quality` → `code-simplification` → `shipping-and-launch`。

4. **不确定时，从 spec 开始。** 如果 task 非平凡且没有 spec，先使用 `spec-driven-development`。

## 生命周期顺序

完整 feature 的典型 skill 顺序是：

```
1.  interview-me                → 提取用户真正想要什么
2.  idea-refine                 → 细化模糊想法
3.  spec-driven-development     → 定义要构建什么
4.  planning-and-task-breakdown → 拆成可验证 chunks
5.  context-engineering         → 加载正确 context
6.  source-driven-development   → 对照官方 docs 验证
7.  incremental-implementation  → 逐 slice 构建
8.  doubt-driven-development    → 在执行中交叉审问非平凡决策
9.  test-driven-development     → 证明每个 slice 可用
10. code-review-and-quality     → merge 前 review
11. code-simplification         → 保持行为不变，减少不必要复杂度
12. git-workflow-and-versioning → 清理 commit history
13. documentation-and-adrs      → 记录决策
14. deprecation-and-migration   → 必要时安全退役旧系统并迁移用户
15. shipping-and-launch         → 安全部署
```

并非每个 task 都需要每个 skill。一个 bug fix 可能只需要：`debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality`。

## 快速参考

| Phase | Skill | 一句话摘要 |
|-------|-------|------------|
| Define | interview-me | 在任何 plan、spec 或 code 前，暴露用户真正想要什么 |
| Define | idea-refine | 通过结构化发散和收敛思考细化 ideas |
| Define | spec-driven-development | 先有 requirements 和 acceptance criteria，再写 code |
| Plan | planning-and-task-breakdown | 拆解成小而可验证的 tasks |
| Build | incremental-implementation | 薄 vertical slices，每次扩展前先测试 |
| Build | source-driven-development | 实现前对照官方 docs 验证 |
| Build | doubt-driven-development | 用 fresh context 对每个非平凡决策做对抗式 review |
| Build | context-engineering | 在正确时间提供正确 context |
| Build | frontend-ui-engineering | 具备 accessibility 的生产级 UI |
| Build | api-and-interface-design | 有清晰 contracts 的稳定 interfaces |
| Verify | test-driven-development | 先写 failing test，再让它通过 |
| Verify | browser-testing-with-devtools | 使用 Chrome DevTools MCP 做 runtime verification |
| Verify | debugging-and-error-recovery | Reproduce → localize → fix → guard |
| Review | code-review-and-quality | 五轴 review 与 quality gates |
| Review | code-simplification | 保持行为不变，减少不必要复杂度 |
| Review | security-and-hardening | OWASP prevention、input validation、least privilege |
| Review | performance-optimization | 先测量，只优化真正重要的部分 |
| Ship | git-workflow-and-versioning | Atomic commits，干净 history |
| Ship | ci-cd-and-automation | 每次 change 都有 automated quality gates |
| Ship | deprecation-and-migration | 移除旧系统并安全迁移用户 |
| Ship | documentation-and-adrs | 记录 why，不只是 what |
| Ship | shipping-and-launch | Pre-launch checklist、monitoring、rollback plan |
