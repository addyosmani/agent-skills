# 代理技能

**AI 编程代理的生产级工程技能。**

技能编码了资深工程师在构建软件时使用的工作流程、质量门禁和最佳实践。这些技能被打包，以便 AI 代理在开发的每个阶段都能一致地遵循。

```
  定义          规划          构建          验证          审查          发布
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ 想法 │ ───▶ │规格说明│ ───▶ │ 代码 │ ───▶ │ 测试 │ ───▶ │  QA  │ ───▶ │  Go  │
 │ 细化 │      │  PRD │      │ 实现 │      │ 调试 │      │ 门禁 │      │ 上线 │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

---

## 命令

7 个斜杠命令，对应开发生命周期。每个命令自动激活相应的技能。

| 你正在做什么 | 命令 | 核心原则 |
|-------------------|---------|---------------|
| 定义要构建的内容 | `/spec` | 代码之前先写规格说明 |
| 规划如何构建 | `/plan` | 小而原子化的任务 |
| 增量构建 | `/build` | 每次一个切片 |
| 验证它能工作 | `/test` | 测试即证明 |
| 合并前审查 | `/review` | 提升代码健康度 |
| 简化代码 | `/code-simplify` | 清晰优于巧妙 |
| 发布到生产环境 | `/ship` | 更快反而更安全 |

技能也会根据你的操作自动激活 —— 设计 API 会触发 `api-and-interface-design`，构建 UI 会触发 `frontend-ui-engineering`，以此类推。

---

## 快速开始

<details>
<summary><b>Claude Code（推荐）</b></summary>

**市场安装：**

```
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills
```

> **SSH 错误？** 市场通过 SSH 克隆仓库。如果你没有在 GitHub 上设置 SSH 密钥，可以[添加你的 SSH 密钥](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)，或者使用完整的 HTTPS URL 强制 HTTPS 克隆：
> ```bash
> /plugin marketplace add https://github.com/addyosmani/agent-skills.git
> /plugin install agent-skills@addy-agent-skills
> ```

**本地 / 开发：**

```bash
git clone https://github.com/addyosmani/agent-skills.git
claude --plugin-dir /path/to/agent-skills
```

</details>

<details>
<summary><b>Cursor</b></summary>

将任何 `SKILL.md` 复制到 `.cursor/rules/`，或引用完整的 `skills/` 目录。参见 [docs/cursor-setup.md](docs/cursor-setup.md)。

</details>

<details>
<summary><b>Gemini CLI</b></summary>

作为原生技能安装以实现自动发现，或添加到 `GEMINI.md` 以获得持久上下文。参见 [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md)。

**从仓库安装：**

```bash
gemini skills install https://github.com/addyosmani/agent-skills.git --path skills
```

**从本地克隆安装：**

```bash
gemini skills install ./agent-skills/skills/
```

</details>

<details>
<summary><b>Windsurf</b></summary>

将技能内容添加到你的 Windsurf 规则配置中。参见 [docs/windsurf-setup.md](docs/windsurf-setup.md)。

</details>

<details>
<summary><b>OpenCode</b></summary>

通过 AGENTS.md 和 `skill` 工具使用代理驱动的技能执行。

参见 [docs/opencode-setup.md](docs/opencode-setup.md)。

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

使用 `agents/` 中的代理定义作为 Copilot 角色，并在 `.github/copilot-instructions.md` 中使用技能内容。参见 [docs/copilot-setup.md](docs/copilot-setup.md)。

</details>

<details>
  <summary><b>Kiro IDE & CLI </b></summary>
  Kiro 的技能位于 ".kiro/skills/" 下，可存储在项目或全局级别。Kiro 也支持 Agents.md。参见 Kiro 文档 https://kiro.dev/docs/skills/
</details>

<details>
<summary><b>Codex / 其他代理</b></summary>

技能是纯 Markdown —— 它们适用于任何接受系统提示或指令文件的代理。参见 [docs/getting-started.md](docs/getting-started.md)。

</details>



---

## 全部 20 个技能

上述命令是入口点。在底层，它们激活这 20 个技能 —— 每个技能都是有步骤、验证门禁和反合理化表格的结构化工作流。你也可以直接引用任何技能。

### 定义 - 明确要构建什么

| 技能 | 功能 | 使用场景 |
|-------|-------------|----------|
| [idea-refine](skills/idea-refine/SKILL.md) | 结构化的发散/收敛思维，将模糊的想法转化为具体的提案 | 你有一个需要探索的粗略概念 |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | 在任何代码之前编写涵盖目标、命令、结构、代码风格、测试和边界的 PRD | 启动新项目、功能或重大变更 |

### 规划 - 拆解任务

| 技能 | 功能 | 使用场景 |
|-------|-------------|----------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | 将规格说明分解为小型、可验证的任务，包含验收标准和依赖排序 | 你有规格说明，需要可执行的单元 |

### 构建 - 编写代码

| 技能 | 功能 | 使用场景 |
|-------|-------------|----------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | 薄垂直切片 - 实现、测试、验证、提交。特性开关、安全默认值、回滚友好的变更 | 任何涉及多个文件的变更 |
| [test-driven-development](skills/test-driven-development/SKILL.md) | 红-绿-重构，测试金字塔（80/15/5），测试规模，DAMP 优于 DRY，Beyonce 规则，浏览器测试 | 实现逻辑、修复 bug 或改变行为 |
| [context-engineering](skills/context-engineering/SKILL.md) | 在正确的时间向代理提供正确的信息 - 规则文件、上下文打包、MCP 集成 | 启动会话、切换任务或输出质量下降时 |
| [source-driven-development](skills/source-driven-development/SKILL.md) | 将每个框架决策基于官方文档 - 验证、引用来源、标记未经验证的内容 | 你需要对任何框架或库使用权威的、引用来源的代码 |
| [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) | 组件架构、设计系统、状态管理、响应式设计、WCAG 2.1 AA 无障碍 | 构建或修改面向用户的界面 |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | 契约优先设计、Hyrum's Law、单版本规则、错误语义、边界验证 | 设计 API、模块边界或公共接口 |

### 验证 - 证明它能工作

| 技能 | 功能 | 使用场景 |
|-------|-------------|----------|
| [browser-testing-with-devtools](skills/browser-testing-with-devtools/SKILL.md) | Chrome DevTools MCP 获取实时运行时数据 - DOM 检查、控制台日志、网络跟踪、性能分析 | 构建或调试任何在浏览器中运行的内容 |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | 五步排查：复现、定位、简化、修复、防护。停止生产线规则、安全回退 | 测试失败、构建中断或行为不符合预期 |

### 审查 - 合并前的质量门禁

| 技能 | 功能 | 使用场景 |
|-------|-------------|----------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | 五轴审查，变更规模（约 100 行），严重级别标签（Nit/Optional/FYI），审查速度规范，拆分策略 | 合并任何变更之前 |
| [code-simplification](skills/code-simplification/SKILL.md) | Chesterton's Fence、500 规则，在保持精确行为的同时降低复杂度 | 代码能工作但比应有的更难阅读或维护 |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | OWASP Top 10 防护、认证模式、密钥管理、依赖审计、三层边界系统 | 处理用户输入、认证、数据存储或外部集成 |
| [performance-optimization](skills/performance-optimization/SKILL.md) | 测量优先方法 - Core Web Vitals 目标、性能分析工作流、包体积分析、反模式检测 | 存在性能要求或你怀疑有性能退化 |

### 发布 - 自信地部署

| 技能 | 功能 | 使用场景 |
|-------|-------------|----------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | 主干开发、原子提交、变更规模（约 100 行）、提交即保存点模式 | 进行任何代码变更（始终） |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | 左移、更快更安全、特性开关、质量门禁流水线、故障反馈循环 | 设置或修改构建和部署流水线 |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | 代码即负债思维、强制性与建议性弃用、迁移模式、僵尸代码清除 | 移除旧系统、迁移用户或停用功能 |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | 架构决策记录、API 文档、内联文档标准 - 记录*原因* | 做出架构决策、变更 API 或发布功能 |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | 上线前检查清单、特性开关生命周期、分阶段发布、回滚程序、监控设置 | 准备部署到生产环境 |

---

## 代理角色

针对特定审查的预配置专家角色：

| 代理 | 角色 | 视角 |
|-------|------|-------------|
| [code-reviewer](agents/code-reviewer.md) | 高级 Staff 工程师 | 五轴代码审查，"Staff 工程师会批准这个吗？"的标准 |
| [test-engineer](agents/test-engineer.md) | QA 专家 | 测试策略、覆盖率分析和 Prove-It 模式 |
| [security-auditor](agents/security-auditor.md) | 安全工程师 | 漏洞检测、威胁建模、OWASP 评估 |

---

## 参考检查清单

技能需要时加载的快速参考材料：

| 参考 | 涵盖内容 |
|-----------|--------|
| [testing-patterns.md](references/testing-patterns.md) | 测试结构、命名、模拟、React/API/E2E 示例、反模式 |
| [security-checklist.md](references/security-checklist.md) | 提交前检查、认证、输入验证、请求头、CORS、OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Core Web Vitals 目标、前端/后端检查清单、测量命令 |
| [accessibility-checklist.md](references/accessibility-checklist.md) | 键盘导航、屏幕阅读器、视觉设计、ARIA、测试工具 |

---

## 技能如何工作

每个技能都遵循一致的格式：

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Guides agents through [task].│  │
│  │              Use when…                    │  │
│  └───────────────────────────────────────────┘  │                                                                                                
│  Overview         → What this skill does        │
│  When to Use      → Triggering conditions       │
│  Process          → Step-by-step workflow       │
│  Rationalizations → Excuses + rebuttals         │
│  Red Flags        → Signs something's wrong     │
│  Verification     → Evidence requirements       │
└─────────────────────────────────────────────────┘
```

**关键设计选择：**

- **流程，而非长文。** 技能是代理遵循的工作流，而非代理阅读的参考文档。每个技能都有步骤、检查点和退出标准。
- **反合理化。** 每个技能都包含一个常用借口的表格（例如"我稍后再加测试"），并附有记录在案的反驳论点。
- **验证是不可妥协的。** 每个技能都以证据要求结束 —— 测试通过、构建输出、运行时数据。"看起来没问题"永远不够。
- **渐进式披露。** `SKILL.md` 是入口点。支撑参考材料只在需要时加载，将 token 使用量降至最低。

---

## 项目结构

```
agent-skills/
├── skills/                            # 20 个核心技能（每个目录一个 SKILL.md）
│   ├── idea-refine/                   #   定义
│   ├── spec-driven-development/       #   定义
│   ├── planning-and-task-breakdown/   #   规划
│   ├── incremental-implementation/    #   构建
│   ├── context-engineering/           #   构建
│   ├── source-driven-development/     #   构建
│   ├── frontend-ui-engineering/       #   构建
│   ├── test-driven-development/       #   构建
│   ├── api-and-interface-design/      #   构建
│   ├── browser-testing-with-devtools/ #   验证
│   ├── debugging-and-error-recovery/  #   验证
│   ├── code-review-and-quality/       #   审查
│   ├── code-simplification/          #   审查
│   ├── security-and-hardening/        #   审查
│   ├── performance-optimization/      #   审查
│   ├── git-workflow-and-versioning/   #   发布
│   ├── ci-cd-and-automation/          #   发布
│   ├── deprecation-and-migration/     #   发布
│   ├── documentation-and-adrs/        #   发布
│   ├── shipping-and-launch/           #   发布
│   └── using-agent-skills/            #   元：如何使用本技能包
├── agents/                            # 3 个专家角色
├── references/                        # 4 个补充检查清单
├── hooks/                             # 会话生命周期钩子
├── .claude/commands/                  # 7 个斜杠命令（Claude Code）
├── .gemini/commands/                  # 7 个斜杠命令（Gemini CLI）
└── docs/                              # 每个工具的设置指南
```

---

## 为什么需要代理技能？

AI 编程代理默认走最短路径 —— 这通常意味着跳过规格说明、测试、安全审查和使软件可靠的最佳实践。代理技能为代理提供结构化工作流，强制执行与资深工程师在生产代码中相同的纪律。

每个技能都编码了来之不易的工程判断：*何时*写规格说明、*测试什么*、*如何*审查、*何时*发布。这些不是泛泛的提示 —— 它们是那种 opinionated 的、流程驱动的工作流，将生产级工作与原型级工作区分开来。

技能融合了 Google 工程文化的最佳实践 —— 包括 [《Google 软件工程》](https://abseil.io/resources/swe-book) 和 Google 的[工程实践指南](https://google.github.io/eng-practices/)中的概念。你会在 API 设计中找到 Hyrum's Law，在测试中找到 Beyonce 规则和测试金字塔，在代码审查中找到变更规模和审查速度规范，在简化中找到 Chesterton's Fence，在 git 工作流中找到主干开发，在 CI/CD 中找到左移和特性开关，以及一个专门的弃用技能将代码视为负债。这些不是抽象原则 —— 它们直接嵌入到代理遵循的逐步工作流中。

---

## 贡献

技能应该是**具体的**（可操作的步骤，而非模糊的建议）、**可验证的**（有证据要求的明确退出标准）、**经过实战检验的**（基于真实工作流）和**简洁的**（只包含指导代理所需的内容）。

参见 [docs/skill-anatomy.md](docs/skill-anatomy.md) 了解格式规范，以及 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

---

## 许可证

MIT - 在你的项目、团队和工具中使用这些技能。