# 中文 Agent Skills

面向 AI 编程工具的中文 skills 集合。内容从 `agent-skills/skills/` 翻译而来，保留原始 folder 名、skill 名、命令、路径、代码块和专业术语，改写为更适合中文母语者阅读和触发的精炼中文指令。

这些 skills 的目标是让 agent 在需求澄清、spec、计划、实现、测试、review、上线等阶段都按稳定流程工作，而不是只根据一次性 prompt 临场发挥。

## 目录结构

```text
cn-skills/
├── README.md
└── skills/
    ├── using-agent-skills/
    │   └── SKILL.md
    ├── interview-me/
    │   └── SKILL.md
    ├── spec-driven-development/
    │   └── SKILL.md
    └── ...
```

核心内容都在 `skills/<skill-name>/SKILL.md` 中。folder 名和 `name` 字段保持英文，方便 Cursor、Codex、Claude、Gemini 等工具按原名称引用。

## Skill 分类

### 选择与澄清

- `using-agent-skills`：判断当前任务应该使用哪个 skill，并规定通用执行规则。
- `interview-me`：通过一次一个问题的方式收集需求，适合需求不完整时先访谈。
- `idea-refine`：把模糊想法发散、收敛成可执行方向。
- `spec-driven-development`：编码前先写 spec，明确目标、命令、结构、测试和边界。

### 计划与实现

- `planning-and-task-breakdown`：把 spec 拆成小而可验证的 tasks。
- `incremental-implementation`：按小步提交实现，每步 build/test/verify。
- `test-driven-development`：用 Red-Green-Refactor、test pyramid 和可维护测试驱动实现。
- `context-engineering`：为 agent 提供正确上下文，避免一次塞入过多信息。
- `source-driven-development`：以官方文档和权威来源指导 framework/library 使用。
- `doubt-driven-development`：对高风险决策做反向审查，降低自信错误。

### 产品与接口

- `frontend-ui-engineering`：构建 UI、组件、响应式布局和 accessibility。
- `api-and-interface-design`：设计 API、module boundary 和公共 interface。
- `browser-testing-with-devtools`：用 browser/devtools 证实 UI 运行时行为。

### 质量与安全

- `debugging-and-error-recovery`：系统化复现、定位、缩小、修复和补防线。
- `code-review-and-quality`：按质量维度 review，控制变更大小和风险。
- `code-simplification`：在行为不变前提下降低复杂度。
- `security-and-hardening`：处理 auth、输入、secrets、dependencies 和外部集成风险。
- `performance-optimization`：先测量，再优化 Core Web Vitals、bundle、runtime 等性能问题。

### 交付与维护

- `git-workflow-and-versioning`：使用小而原子的 commits、清晰分支和版本策略。
- `ci-cd-and-automation`：设计 build/deploy pipeline、quality gates 和 failure feedback loops。
- `deprecation-and-migration`：迁移、废弃和删除旧系统，避免 zombie code。
- `documentation-and-adrs`：写 ADR、API docs 和解释“为什么”的文档。
- `shipping-and-launch`：上线前检查、风险控制、回滚和发布后观察。

## 在 Cursor 中使用

### 方式一：作为项目规则引用

适合希望 Cursor Agent 在项目中长期遵守这些 workflow 的场景。

1. 将需要的 `SKILL.md` 内容复制到 `.cursor/rules/` 下的规则文件中。
2. 也可以按主题拆分，例如：

```text
.cursor/rules/
├── spec-driven-development.mdc
├── frontend-ui-engineering.mdc
└── code-review-and-quality.mdc
```

3. 在规则中保留 skill 的触发条件、步骤、verification 和 red flags。
4. 对大型项目，优先加入 `using-agent-skills`、`context-engineering` 和与你常用工作流相关的 skills。

### 方式二：在对话中显式引用

适合临时任务或只想用某个 workflow 的场景。

示例：

```text
请按 cn-skills/skills/interview-me/SKILL.md 先采访我，一次只问一个问题，直到你有足够信息写 spec。
```

```text
请使用 cn-skills/skills/spec-driven-development/SKILL.md，先写 spec，不要直接编码。
```

```text
请按 cn-skills/skills/frontend-ui-engineering/SKILL.md 构建这个页面原型，并确保 responsive 和 accessibility。
```

## 在 Codex 中使用

Codex 和其他支持 instruction files 或 system prompt 的 agent，可以直接把 `SKILL.md` 作为任务上下文使用。

常见做法：

1. 在项目中保留 `cn-skills/skills/`。
2. 发起任务时引用目标 skill 路径。
3. 对复杂任务，先引用 `using-agent-skills` 让 agent 判断流程，再引用具体 skill。

示例 prompt：

```text
读取并遵循 cn-skills/skills/using-agent-skills/SKILL.md。
我的目标是实现一个登录页，但需求还不完整。请选择合适的 skill，并先不要写代码。
```

```text
遵循 cn-skills/skills/test-driven-development/SKILL.md。
请先写 failing test，再实现最小代码让测试通过，最后 refactor。
```

如果你的 Codex 环境支持全局或项目级 instructions，可以把常用 skill 摘要放进项目 instructions，把完整文件留在 `cn-skills/skills/` 中按需引用。

## 常见使用流程

### 从模糊想法到可实现功能

1. 用 `interview-me` 一次一个问题收集真实需求。
2. 用 `idea-refine` 发散和收敛方案。
3. 用 `spec-driven-development` 写 spec，并让你确认 assumptions、success criteria 和 boundaries。
4. 用 `planning-and-task-breakdown` 拆成小 tasks。
5. 用 `incremental-implementation` 逐步实现。
6. 用 `test-driven-development` 和 `debugging-and-error-recovery` 证明行为正确。
7. 用 `code-review-and-quality` 做合并前 review。

### 构建一个新 UI 原型

1. 用 `interview-me` 明确目标用户、页面状态、交互和内容。
2. 用 `spec-driven-development` 写 UI spec，包括 commands、project structure、accessibility 和 success criteria。
3. 用 `frontend-ui-engineering` 构建 component architecture、responsive layout 和 design system 对齐。
4. 用 `browser-testing-with-devtools` 检查 DOM、console、network、layout 和交互。
5. 用 `performance-optimization` 检查 LCP、CLS、bundle size 等风险。

### 设计 API 或模块边界

1. 用 `spec-driven-development` 明确目标、消费者、错误语义和成功标准。
2. 用 `api-and-interface-design` 先定义 contract，再实现。
3. 用 `source-driven-development` 核对 framework/library 的官方用法。
4. 用 `test-driven-development` 覆盖正常路径、错误路径和兼容性边界。
5. 用 `documentation-and-adrs` 记录 API docs 和关键 ADR。

### 修复复杂 bug

1. 用 `debugging-and-error-recovery` 先 reproduce，再 localize 和 reduce。
2. 用 `context-engineering` 只加载相关日志、测试、源码和 spec。
3. 用 `test-driven-development` 先补失败测试。
4. 用 `incremental-implementation` 最小化修复。
5. 用 `code-review-and-quality` 检查是否引入回归。

### 上线或迁移

1. 用 `planning-and-task-breakdown` 拆分上线、迁移或废弃计划。
2. 用 `ci-cd-and-automation` 检查 pipeline、quality gates 和 rollback。
3. 用 `deprecation-and-migration` 管理旧接口、旧数据和用户迁移。
4. 用 `shipping-and-launch` 做发布前 checklist、发布执行和发布后观察。
5. 用 `documentation-and-adrs` 记录关键决策和运维说明。

## 推荐默认组合

复杂需求默认先用：

```text
using-agent-skills → interview-me → spec-driven-development → planning-and-task-breakdown → incremental-implementation
```

前端需求常用：

```text
interview-me → spec-driven-development → frontend-ui-engineering → browser-testing-with-devtools → code-review-and-quality
```

高风险后端/API 需求常用：

```text
spec-driven-development → api-and-interface-design → source-driven-development → test-driven-development → security-and-hardening
```

性能问题常用：

```text
performance-optimization → browser-testing-with-devtools → debugging-and-error-recovery → incremental-implementation
```

## 翻译约定

- folder 名、skill 名、路径、命令、代码和配置语法不翻译。
- API、CLI、MCP、spec、task、PR、CI、test、build、lint、framework、dependency、agent、context 等专业术语通常保留英文。
- 代码块中如果是自然语言模板、示例说明、prompt、checklist 或流程文字，也翻译为中文。
- 代码块中如果是真实代码、shell command、config、路径或协议字段，保持原样。
- 译文追求精炼、准确、可执行，不逐字翻译。
