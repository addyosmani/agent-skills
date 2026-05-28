---
name: code-review-and-quality
description: 执行多维度 code review。在合并任何变更前使用。用于审查你自己、其他 agent 或人类编写的代码。用于在代码进入 main branch 前，从多个维度评估代码质量。
---

# Code Review and Quality

## Overview

使用 quality gates 进行多维度 code review。每个变更合并前都必须 review，无例外。Review 覆盖五个维度：正确性、可读性、架构、安全性和性能。

**批准标准：** 当一个变更明确改善整体代码健康度时批准它，即使它并不完美。完美代码不存在，目标是持续改进。不要因为它不是你会写出的方式就阻塞变更。如果它改善 codebase 并遵循项目约定，就批准。

## When to Use

- 合并任何 PR 或变更前
- 完成 feature 实现后
- 需要评估其他 agent 或 model 生成的代码时
- 重构现有代码时
- 任何 bug fix 后（同时 review fix 和 regression test）

## The Five-Axis Review

每次 review 都按这些维度评估代码：

### 1. Correctness

代码是否完成了它声称要做的事？

- 是否匹配 spec 或 task 要求？
- 是否处理 edge cases（null、empty、边界值）？
- 是否处理 error paths（不只 happy path）？
- 是否通过所有 tests？Tests 是否真的覆盖了正确内容？
- 是否存在 off-by-one errors、race conditions 或 state inconsistencies？

### 2. Readability & Simplicity

其他 engineer（或 agent）能否在作者不解释的情况下理解这段代码？

- 命名是否描述清晰，并与项目约定一致？（不要在无 context 时使用 `temp`、`data`、`result`）
- Control flow 是否直接（避免嵌套 ternaries、深层 callbacks）？
- 代码组织是否符合逻辑（相关代码聚合、module boundaries 清晰）？
- 是否有应简化的“聪明”技巧？
- **能否用更少行完成？**（100 行足够却写 1000 行是失败）
- **抽象是否配得上它的复杂度？**（到第三个 use case 前不要泛化）
- Comments 是否能帮助说明非显而易见的意图？（但不要注释显而易见的代码。）
- 是否有 dead code artifacts：no-op variables（`_unused`）、backwards-compat shims 或 `// removed` comments？

### 3. Architecture

变更是否符合系统设计？

- 是否遵循现有 patterns，或引入新 pattern？如为新 pattern，理由是否充分？
- 是否保持清晰的 module boundaries？
- 是否有应共享的 code duplication？
- Dependencies 方向是否正确（无 circular dependencies）？
- 抽象层级是否合适（不过度工程化，也不过度耦合）？

### 4. Security

详细安全指引见 `security-and-hardening`。此变更是否引入漏洞？

- User input 是否经过 validation 和 sanitization？
- Secrets 是否避免进入 code、logs 和 version control？
- 需要处是否检查 authentication/authorization？
- SQL queries 是否 parameterized（无 string concatenation）？
- Outputs 是否 encoded 以防止 XSS？
- Dependencies 是否来自可信来源且无已知 vulnerabilities？
- 来自外部来源的数据（APIs、logs、user content、config files）是否按 untrusted 处理？
- 外部 data flows 是否在 system boundaries 经过 validation 后才用于 logic 或 rendering？

### 5. Performance

详细 profiling 和 optimization 见 `performance-optimization`。此变更是否引入性能问题？

- 是否有 N+1 query patterns？
- 是否有 unbounded loops 或 unconstrained data fetching？
- 是否有应改为 async 的 synchronous operations？
- UI components 是否有不必要 re-renders？
- List endpoints 是否缺少 pagination？
- Hot paths 是否创建大型 objects？

## Change Sizing

小而聚焦的变更更易 review、更快 merge、更安全 deploy。目标规模：

```
~100 lines changed   → 好。可一次 review 完。
~300 lines changed   → 若是单一逻辑变更，可以接受。
~1000 lines changed  → 太大。拆分它。
```

**“一个变更”的定义：** 一个自包含修改，只解决一件事，包含相关 tests，并在提交后保持系统可用。它是 feature 的一部分，而不是整个 feature。

**变更过大时的拆分策略：**

| Strategy | How | When |
|----------|-----|------|
| **Stack** | 先提交小变更，再基于它开始下一个变更 | Sequential dependencies |
| **By file group** | 按需要不同 reviewer 的文件组拆分 | Cross-cutting concerns |
| **Horizontal** | 先创建 shared code/stubs，再接入 consumers | Layered architecture |
| **Vertical** | 将 feature 拆成更小的 full-stack slices | Feature work |

**大变更可接受的情况：** 完整删除文件，或 automated refactoring，reviewer 只需验证意图而非逐行检查。

**将 refactoring 与 feature work 分开。** 同时重构现有代码并新增行为的变更是两个变更，应分开提交。小清理（变量重命名）可由 reviewer 酌情包含。

## Change Descriptions

每个变更都需要一段能在 version control history 中独立成立的描述。

**第一行：** 简短、祈使句、独立完整。写 “Delete the FizzBuzz RPC”，不要写 “Deleting the FizzBuzz RPC.” 信息量必须足够，让搜索历史的人无需读 diff 就能理解变更。

**Body：** 说明改了什么以及为什么。包含代码本身不可见的 context、decisions 和 reasoning。必要时链接 bug numbers、benchmark results 或 design docs。若方案有缺点，也要说明。

**Anti-patterns：** “Fix bug,” “Fix build,” “Add patch,” “Moving code from A to B,” “Phase 1,” “Add convenience functions.”

## Review Process

### Step 1: Understand the Context

看代码前，先理解意图：

```
- 这个变更要达成什么？
- 它实现了哪个 spec 或 task？
- 预期行为变化是什么？
```

### Step 2: Review the Tests First

Tests 会揭示意图和覆盖范围：

```
- 是否有针对该变更的 tests？
- Tests 是否测试行为（而非实现细节）？
- Edge cases 是否覆盖？
- Test names 是否描述清楚？
- 如果代码变化，这些 tests 能否捕获 regression？
```

### Step 3: Review the Implementation

带着五个维度走读代码：

```
对每个变更文件：
1. Correctness：这段代码是否做到 test 所表达的行为？
2. Readability：我能否无需帮助读懂？
3. Architecture：它是否适合系统？
4. Security：是否有漏洞？
5. Performance：是否有 bottlenecks？
```

### Step 4: Categorize Findings

给每条 comment 标注 severity，让作者知道哪些必须处理、哪些可选：

| Prefix | Meaning | Author Action |
|--------|---------|---------------|
| *(no prefix)* | 必须修改 | Merge 前必须处理 |
| **Critical:** | 阻塞 merge | Security vulnerability、data loss、broken functionality |
| **Nit:** | 小问题，可选 | 作者可忽略：formatting、style preferences |
| **Optional:** / **Consider:** | 建议 | 值得考虑，但不是必须 |
| **FYI** | 仅供参考 | 无需行动，作为未来 context |

这能避免作者把所有反馈都当成强制项，浪费时间处理可选建议。

### Step 5: Verify the Verification

检查作者的验证说明：

```
- 运行了哪些 tests？
- Build 是否通过？
- 是否手动测试了变更？
- UI changes 是否有 screenshots？
- 是否有 before/after comparison？
```

## Multi-Model Review Pattern

用不同 models 提供不同 review 视角：

```
Model A 编写代码
    │
    ▼
Model B review correctness 和 architecture
    │
    ▼
Model A 处理反馈
    │
    ▼
Human 做最终决定
```

这能捕获单一 model 可能漏掉的问题。不同 models 有不同盲点。

**Review agent 示例 prompt：**
```
请 review 这个 code change，关注 correctness、security，以及是否遵循
我们的项目约定。Spec 说明 [X]。该变更应当 [Y]。
请将问题标为 Critical、Important 或 Suggestion。
```

## Dead Code Hygiene

任何 refactoring 或 implementation change 后，检查孤立代码：

1. 识别现在 unreachable 或 unused 的代码
2. 明确列出它
3. **删除前先询问：** “是否移除这些现在 unused 的元素：[list]？”

不要留下 dead code，它会误导未来读者和 agents。但也不要静默删除不确定的东西。有疑问就问。

```
已识别 DEAD CODE：
- src/utils/date.ts 中的 formatLegacyDate() — 已由 formatDate() 替代
- src/components/ 中的 OldTaskCard component — 已由 TaskCard 替代
- src/config.ts 中的 LEGACY_API_URL constant — 已无引用
→ 是否可以安全移除这些？
```

## Review Speed

缓慢 review 会阻塞整个团队。切换 context 去 review 的成本低于让别人等待的成本。

- **一个工作日内响应**，这是上限，不是目标
- **理想节奏：** 收到 review request 后尽快响应，除非正在深度专注 coding。典型变更应在一天内完成多轮 review
- **优先快速给出单次反馈**，而不是只追求快速最终批准。即使需要多轮，快速反馈也能减少挫败感
- **大变更：** 要求作者拆分，而不是 review 一个巨大的 changeset

## Handling Disagreements

解决 review 分歧时，按此优先级：

1. **技术事实和数据** 高于意见和偏好
2. **Style guides** 是 style 问题的最高依据
3. **Software design** 必须按工程原则评估，而非个人偏好
4. **Codebase consistency** 可接受，前提是不损害整体健康度

**不要接受 “I'll clean it up later.”** 经验表明，推迟的清理很少发生。除非是真正紧急情况，否则要求提交前清理。如果周边问题无法在此变更中处理，要求创建 bug 并 self-assign。

## Honesty in Review

Review 代码时，无论代码由你、其他 agent 还是人类编写：

- **不要 rubber-stamp。** 没有 review 证据的 “LGTM” 没有帮助。
- **不要淡化真实问题。** 会打到 production 的 bug，却说 “This might be a minor concern” 是不诚实。
- **尽可能量化问题。** “This N+1 query will add ~50ms per item in the list” 优于 “this could be slow.”
- **对明显有问题的方案要 push back。** 讨好是 review 的 failure mode。如果实现有问题，直接说明并提出 alternatives。
- **优雅接受 override。** 如果作者掌握完整 context 且不同意，尊重其判断。评论代码，不评论人。把个人化批评改写为聚焦代码本身。

## Dependency Discipline

Code review 的一部分是 dependency review：

**添加任何 dependency 前：**
1. 现有 stack 是否能解决？（通常可以。）
2. Dependency 有多大？（检查 bundle impact。）
3. 是否 actively maintained？（检查 last commit、open issues。）
4. 是否有已知 vulnerabilities？（`npm audit`）
5. License 是什么？（必须与项目兼容。）

**规则：** 优先使用 standard library 和现有 utilities，而非新 dependencies。每个 dependency 都是负债。

## The Review Checklist

```markdown
## Review: [PR/Change title]

### Context
- [ ] 我理解这个变更做了什么以及为什么做

### Correctness
- [ ] 变更匹配 spec/task 要求
- [ ] Edge cases 已处理
- [ ] Error paths 已处理
- [ ] Tests 对变更覆盖充分

### Readability
- [ ] 命名清晰且一致
- [ ] 逻辑直接
- [ ] 无不必要复杂度

### Architecture
- [ ] 遵循现有 patterns
- [ ] 无不必要 coupling 或 dependencies
- [ ] 抽象层级合适

### Security
- [ ] Code 中无 secrets
- [ ] Input 在 boundaries 被 validated
- [ ] 无 injection vulnerabilities
- [ ] Auth checks 已到位
- [ ] External data sources 按 untrusted 处理

### Performance
- [ ] 无 N+1 patterns
- [ ] 无 unbounded operations
- [ ] List endpoints 有 pagination

### Verification
- [ ] Tests pass
- [ ] Build succeeds
- [ ] 已完成 manual verification（如适用）

### Verdict
- [ ] **Approve** — Ready to merge
- [ ] **Request changes** — Issues must be addressed
```
## See Also

- 详细 security review 指引见 `references/security-checklist.md`
- Performance review checks 见 `references/performance-checklist.md`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| “It works, that's good enough” | 可运行但不可读、不安全或架构错误的代码会制造持续累积的债务。 |
| “I wrote it, so I know it's correct” | 作者会看不见自己的假设。每个变更都需要另一双眼睛。 |
| “We'll clean it up later” | Later 不会到来。Review 是 quality gate，使用它。要求 merge 前清理，而不是之后。 |
| “AI-generated code is probably fine” | AI code 需要更多审查，不是更少。即使错误，它也自信且貌似合理。 |
| “The tests pass, so it's good” | Tests 必要但不充分。它们捕获不了 architecture problems、security issues 或 readability concerns。 |

## Red Flags

- PR 未经任何 review 就 merge
- Review 只检查 tests 是否 pass（忽略其他维度）
- 没有实际 review 证据的 “LGTM”
- Security-sensitive changes 未经过 security-focused review
- 大 PR “too big to review properly”（拆分它们）
- Bug fix PR 没有 regression tests
- Review comments 没有 severity labels，导致不清楚哪些必改、哪些可选
- 接受 “I'll fix it later”，它不会发生

## Verification

Review 完成后：

- [ ] 所有 Critical issues 已解决
- [ ] 所有 Important issues 已解决，或有明确理由 deferred
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Verification story 已记录（改了什么、如何验证）
