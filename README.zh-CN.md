# Agent Skills

[English](README.md) | 简体中文

**面向 AI 编程代理的生产级工程技能库。**

技能将资深工程师在构建软件时使用的流程、质量门禁和最佳实践编码为可复用工作流，供 AI 代理在开发的每个阶段一致地遵循。

<a href="https://trendshift.io/repositories/25200" target="_blank"><img src="https://trendshift.io/api/badge/repositories/25200" alt="addyosmani%2Fagent-skills | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

![Addy's Agent Skills](https://addyosmani.com/assets/images/addys-agent-skills.jpg)

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

---

## 命令

8 个斜杠命令对应开发全生命周期，每个命令会自动激活相应的技能。

| 你在做什么 | 命令 | 核心原则 |
|-----------|------|---------|
| 定义要构建什么 | `/spec` | 先写规格，再写代码 |
| 规划如何构建 | `/plan` | 小而原子的任务 |
| 增量式构建 | `/build` | 一次一个切片 |
| 证明它能工作 | `/test` | 测试即证明 |
| 合并前审查 | `/review` | 提升代码健康度 |
| 审计 Web 性能 | `/webperf` | 先测量，再优化 |
| 简化代码 | `/code-simplify` | 清晰优于巧妙 |
| 发布到生产 | `/ship` | 更快即更安全 |

规格确定后想减少手动步骤？**`/build auto`** 会生成计划并在单次获批流程中实现所有任务——你只需批准计划一次，之后自主运行。它消除的是任务*之间*的人工介入，而非验证：每个任务仍遵循测试驱动并单独提交，遇到失败或高风险步骤会暂停。

技能也会根据你的工作内容自动激活——设计 API 会触发 `api-and-interface-design`，构建 UI 会触发 `frontend-ui-engineering`，以此类推。

---

## 快速开始

<details>
<summary><b>Claude Code（推荐）</b></summary>

**市场安装：**

```
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills
```

> **SSH 报错？** 市场通过 SSH 克隆仓库。若你未在 GitHub 配置 SSH 密钥，可[添加 SSH 密钥](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)，或使用完整 HTTPS URL 强制 HTTPS 克隆：
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

将任意 `SKILL.md` 复制到 `.cursor/rules/`，或引用完整的 `skills/` 目录。详见 [docs/cursor-setup.md](docs/cursor-setup.md)。

</details>

<details>
<summary><b>Antigravity CLI</b></summary>

作为原生插件安装，包含技能、子代理和斜杠命令。详见 [docs/antigravity-setup.md](docs/antigravity-setup.md)。

**从仓库安装：**

```bash
agy plugin install https://github.com/addyosmani/agent-skills.git
```

**从本地克隆安装：**

```bash
git clone https://github.com/addyosmani/agent-skills.git
agy plugin install ./agent-skills
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

作为原生技能安装以支持自动发现，或添加到 `GEMINI.md` 以持久化上下文。详见 [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md)。

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

将技能内容添加到你的 Windsurf 规则配置中。详见 [docs/windsurf-setup.md](docs/windsurf-setup.md)。

</details>

<details>
<summary><b>OpenCode</b></summary>

通过 AGENTS.md 和 `skill` 工具实现代理驱动的技能执行。

详见 [docs/opencode-setup.md](docs/opencode-setup.md)。

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

使用 `agents/` 中的代理定义作为 Copilot 角色，将技能内容放入 `.github/copilot-instructions.md`。详见 [docs/copilot-setup.md](docs/copilot-setup.md)。

</details>

<details>
  <summary><b>Kiro IDE & CLI</b></summary>
  Kiro 的技能位于 ".kiro/skills/" 下，可存储在项目级或全局级。Kiro 也支持 Agents.md。详见 Kiro 文档：https://kiro.dev/docs/skills/
</details>

<details>
<summary><b>Codex / 其他代理</b></summary>

技能是纯 Markdown 格式——适用于任何接受系统提示或指令文件的代理。详见 [docs/getting-started.md](docs/getting-started.md)。

</details>



---

## 全部 24 项技能

上述命令是入口点。本技能包共包含 24 项技能——23 项生命周期技能，加上 `using-agent-skills` 元技能。每项技能都是结构化工作流，包含步骤、验证门禁和反合理化对照表。你也可以直接引用任意技能。

### 元技能 — 发现适用哪项技能

| 技能 | 作用 | 使用时机 |
|------|------|---------|
| [using-agent-skills](skills/using-agent-skills/SKILL.md) | 将 incoming 工作映射到正确的技能工作流，并定义共享操作规则 | 开始会话或决定适用哪项技能时 |

### Define — 明确要构建什么

| 技能 | 作用 | 使用时机 |
|------|------|---------|
| [interview-me](skills/interview-me/SKILL.md) | 一次一问的访谈，提取用户真正想要的（而非他们认为自己想要的），直到约 95% 置信度 | 需求描述不清，或用户调用「interview me」/「grill me」时 |
| [idea-refine](skills/idea-refine/SKILL.md) | 结构化的发散/收敛思维，将模糊想法转化为具体方案 | 有粗略概念需要探索时 |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | 在写任何代码之前撰写 PRD，涵盖目标、命令、结构、代码风格、测试和边界 | 启动新项目、新功能或重大变更时 |

### Plan — 拆解任务

| 技能 | 作用 | 使用时机 |
|------|------|---------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | 将规格分解为小而可验证的任务，附验收标准和依赖排序 | 已有规格，需要可执行单元时 |

### Build — 编写代码

| 技能 | 作用 | 使用时机 |
|------|------|---------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | 薄垂直切片——实现、测试、验证、提交。特性开关、安全默认值、可回滚变更 | 任何涉及多个文件的变更 |
| [test-driven-development](skills/test-driven-development/SKILL.md) | 红-绿-重构，测试金字塔（80/15/5），测试规模，DAMP 优于 DRY，Beyonce 规则，浏览器测试 | 实现逻辑、修复 bug 或改变行为时 |
| [context-engineering](skills/context-engineering/SKILL.md) | 在正确时机为代理提供正确信息——规则文件、上下文打包、MCP 集成 | 开始会话、切换任务或输出质量下降时 |
| [source-driven-development](skills/source-driven-development/SKILL.md) | 每个框架决策都基于官方文档——验证、引用来源、标注未验证内容 | 需要权威、有来源引用的框架/库代码时 |
| [doubt-driven-development](skills/doubt-driven-development/SKILL.md) | 对进行中的每个非平凡决策进行对抗性全新上下文审查——CLAIM → EXTRACT → DOUBT → RECONCILE → STOP，可选用户授权跨模型升级 | 风险高（生产、安全、不可逆）、在不熟悉代码中工作，或自信输出现在验证比事后调试更便宜时 |
| [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) | 组件架构、设计系统、状态管理、响应式设计、WCAG 2.1 AA 无障碍 | 构建或修改面向用户的界面时 |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | 契约优先设计、Hyrum 定律、单版本规则、错误语义、边界验证 | 设计 API、模块边界或公共接口时 |

### Verify — 证明它能工作

| 技能 | 作用 | 使用时机 |
|------|------|---------|
| [browser-testing-with-devtools](skills/browser-testing-with-devtools/SKILL.md) | 通过 Chrome DevTools MCP 获取实时运行时数据——DOM 检查、控制台日志、网络追踪、性能分析 | 构建或调试在浏览器中运行的内容时 |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | 五步分诊：复现、定位、缩小、修复、防护。停线规则、安全回退 | 测试失败、构建中断或行为异常时 |

### Review — 合并前质量门禁

| 技能 | 作用 | 使用时机 |
|------|------|---------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | 五轴审查、变更规模（约 100 行）、严重级别标签（Nit/Optional/FYI）、审查速度规范、拆分策略 | 合并任何变更之前 |
| [code-simplification](skills/code-simplification/SKILL.md) | 切斯特顿栅栏、500 行规则，在保持行为不变的前提下降低复杂度 | 代码能跑但比应有的更难读或难维护时 |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | OWASP Top 10 防护、认证模式、密钥管理、依赖审计、三层边界体系 | 处理用户输入、认证、数据存储或外部集成时 |
| [performance-optimization](skills/performance-optimization/SKILL.md) | 先测量再优化——Core Web Vitals 目标、性能分析工作流、打包分析、反模式检测 | 有性能要求或怀疑存在回归时 |

### Ship — 自信部署

| 技能 | 作用 | 使用时机 |
|------|------|---------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | 主干开发、原子提交、变更规模（约 100 行）、提交即存档点模式 | 进行任何代码变更时（始终适用） |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | 左移、更快即更安全、特性开关、质量门禁流水线、失败反馈循环 | 搭建或修改构建与部署流水线时 |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | 代码即负债思维、强制与建议性废弃、迁移模式、僵尸代码清理 | 移除旧系统、迁移用户或下线功能时 |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | 架构决策记录、API 文档、内联文档标准——记录*为什么* | 做架构决策、变更 API 或发布功能时 |
| [observability-and-instrumentation](skills/observability-and-instrumentation/SKILL.md) | 结构化日志、RED 指标、OpenTelemetry 追踪、基于症状的告警——边构建边埋点 | 添加遥测或发布任何在生产环境运行的内容时 |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | 上线前检查清单、特性开关生命周期、分阶段发布、回滚流程、监控配置 | 准备部署到生产环境时 |

---

## 代理角色（Personas）

预配置的专业角色，用于针对性审查：

| 代理 | 角色 | 视角 |
|------|------|------|
| [code-reviewer](agents/code-reviewer.md) | 高级 Staff 工程师 | 五轴代码审查，以「Staff 工程师会批准吗？」为标准 |
| [test-engineer](agents/test-engineer.md) | QA 专家 | 测试策略、覆盖率分析和 Prove-It 模式 |
| [security-auditor](agents/security-auditor.md) | 安全工程师 | 漏洞检测、威胁建模、OWASP 评估 |
| [web-performance-auditor](agents/web-performance-auditor.md) | Web 性能工程师 | Core Web Vitals 审计，Quick/Deep 模式及指标诚实规则；通过 `/webperf` 运行 |

详见 [docs/agents.md](docs/agents.md) 中的决策矩阵、编排规则，以及角色如何与技能和斜杠命令组合。

---

## 参考检查清单

技能在需要时引用的快速参考材料：

| 参考文档 | 涵盖内容 |
|---------|---------|
| [testing-patterns.md](references/testing-patterns.md) | 测试结构、命名、Mock、React/API/E2E 示例、反模式 |
| [security-checklist.md](references/security-checklist.md) | 提交前检查、认证、输入验证、响应头、CORS、OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Core Web Vitals 目标、前端/后端检查清单、测量命令 |
| [accessibility-checklist.md](references/accessibility-checklist.md) | 键盘导航、屏幕阅读器、视觉设计、ARIA、测试工具 |
| [observability-checklist.md](references/observability-checklist.md) | 值班问题、结构化日志、RED/USE 指标、追踪、基于症状的告警、上线前门禁 |
| [orchestration-patterns.md](references/orchestration-patterns.md) | 认可的多角色编排模式、反模式，以及「角色不调用角色」规则 |

---

## 技能如何工作

每项技能遵循一致的结构：

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Guides agents through [task].│  │
│  │              Use when…                    │  │
│  └───────────────────────────────────────────┘  │                                                                                                
│  Overview         → 本技能做什么                │
│  When to Use      → 触发条件                    │
│  Process          → 分步工作流                  │
│  Rationalizations → 借口 + 反驳                 │
│  Red Flags        → 出问题的信号                │
│  Verification     → 证据要求                    │
└─────────────────────────────────────────────────┘
```

**核心设计选择：**

- **流程，而非散文。** 技能是代理要遵循的工作流，不是供阅读的参考文档。每项都有步骤、检查点和退出标准。
- **反合理化。** 每项技能都包含代理跳过步骤时常用借口的对照表（例如「我稍后再加测试」）及有据反驳。
- **验证不可妥协。** 每项技能都以证据要求结尾——测试通过、构建输出、运行时数据。「看起来对」永远不够。
- **渐进式披露。** `SKILL.md` 是入口。支持性参考材料仅在需要时加载，保持 token 用量最小。

---

## 项目结构

```
agent-skills/
├── skills/                            # 24 项技能（23 项生命周期 + 1 项元技能）
│   ├── interview-me/                  #   Define
│   ├── idea-refine/                   #   Define
│   ├── spec-driven-development/       #   Define
│   ├── planning-and-task-breakdown/   #   Plan
│   ├── incremental-implementation/    #   Build
│   ├── context-engineering/           #   Build
│   ├── source-driven-development/     #   Build
│   ├── doubt-driven-development/      #   Build
│   ├── frontend-ui-engineering/       #   Build
│   ├── test-driven-development/       #   Build
│   ├── api-and-interface-design/      #   Build
│   ├── browser-testing-with-devtools/ #   Verify
│   ├── debugging-and-error-recovery/  #   Verify
│   ├── code-review-and-quality/       #   Review
│   ├── code-simplification/          #   Review
│   ├── security-and-hardening/        #   Review
│   ├── performance-optimization/      #   Review
│   ├── git-workflow-and-versioning/   #   Ship
│   ├── ci-cd-and-automation/          #   Ship
│   ├── deprecation-and-migration/     #   Ship
│   ├── documentation-and-adrs/        #   Ship
│   ├── observability-and-instrumentation/ # Ship
│   ├── shipping-and-launch/           #   Ship
│   └── using-agent-skills/            #   Meta: 如何使用本技能包
├── agents/                            # 4 个专业角色
├── references/                        # 5 份补充检查清单
├── hooks/                             # 会话生命周期钩子
├── .claude/commands/                  # 8 个斜杠命令（Claude Code）
├── .gemini/commands/                  # 8 个斜杠命令（Gemini CLI）
├── commands/                          # 8 个斜杠命令（Antigravity CLI）
├── plugin.json                        # Antigravity 插件清单
└── docs/                              # 各工具的安装指南
```

---

## 为什么选择 Agent Skills？

AI 编程代理默认走最短路径——往往跳过规格、测试、安全审查，以及让软件可靠的那些实践。Agent Skills 为代理提供结构化工作流，强制执行资深工程师用于生产代码的同一套纪律。

每项技能编码了来之不易的工程判断：*何时*写规格、*测什么*、*如何*审查、*何时*发布。这些不是泛泛的提示词——而是区分生产级工作与原型级工作的、有主见、流程驱动的工作流。

技能融入了 Google 工程文化的最佳实践——包括 [Software Engineering at Google](https://abseil.io/resources/swe-book) 和 Google [工程实践指南](https://google.github.io/eng-practices/) 中的概念。你会在 API 设计中看到 Hyrum 定律，在测试中看到 Beyonce 规则和测试金字塔，在代码审查中看到变更规模和审查速度规范，在简化中看到切斯特顿栅栏，在 Git 工作流中看到主干开发，在 CI/CD 中看到左移和特性开关，还有将代码视为负债的专用废弃技能。这些不是抽象原则——它们直接嵌入代理要遵循的分步工作流中。

---

## 与其他方案对比

想了解与 [Superpowers](https://github.com/obra/superpowers) 或 [Matt Pocock's skills](https://github.com/mattpocock/skills) 的差异？详见 **[docs/comparison.md](docs/comparison.md)**——诚实、并排对比三者的不同形态及适用场景，并附有受控 [正面对比实验](https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/) 的链接。

---

## 贡献

技能应当**具体**（可执行步骤，而非模糊建议）、**可验证**（明确的退出标准与证据要求）、**经过实战检验**（基于真实工作流）、**精简**（只保留引导代理所需的内容）。

格式规范见 [docs/skill-anatomy.md](docs/skill-anatomy.md)，贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证

MIT — 可在你的项目、团队和工具中自由使用这些技能。
