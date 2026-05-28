---
name: source-driven-development
description: 让每个 implementation decision 都基于官方文档。用于需要权威、有 source citation、避免过时模式的代码。也用于使用任何 correctness 重要的 framework 或 library 构建时。
---

# Source-Driven Development

## Overview
每个 framework-specific 的代码决策都必须有官方文档支撑。不要凭记忆实现：先验证、引用，并让用户看到 sources。Training data 会过时，APIs 会 deprecated，best practices 会演进。这个 skill 确保用户获得可信代码，因为每个 pattern 都能追溯到可检查的权威来源。

## When to Use
- 用户希望代码遵循某个 framework 的当前 best practices
- 构建会在项目中复用的 boilerplate、starter code 或 patterns
- 用户明确要求 documented、verified 或“正确”的 implementation
- 实现 framework 推荐方式很重要的 features（forms、routing、data fetching、state management、auth）
- Review 或改进使用 framework-specific patterns 的代码
- 任何即将凭记忆编写 framework-specific code 的时候

**何时不要使用：**

- Correctness 不依赖特定 version（重命名变量、修复 typos、移动 files）
- 各版本行为相同的 pure logic（loops、conditionals、data structures）
- 用户明确希望速度优先于验证（“just do it quickly”）

## 流程

```
DETECT ──→ FETCH ──→ IMPLEMENT ──→ CITE
  │          │           │            │
  ▼          ▼           ▼            ▼
 什么       获取相关     遵循文档化    展示
 stack？    docs        patterns     sources
```

### Step 1: Detect Stack and Versions

读取项目 dependency file，识别精确 versions：

```
package.json    → Node/React/Vue/Angular/Svelte
composer.json   → PHP/Symfony/Laravel
requirements.txt / pyproject.toml → Python/Django/Flask
go.mod          → Go
Cargo.toml      → Rust
Gemfile         → Ruby/Rails
```

明确说明你发现了什么：

```
STACK DETECTED:
- React 19.1.0 (from package.json)
- Vite 6.2.0
- Tailwind CSS 4.0.3
→ 正在获取相关 patterns 的官方 docs。
```

如果 versions 缺失或有歧义，**询问用户**。不要猜，因为 version 决定哪些 patterns 正确。

### Step 2: Fetch Official Documentation

获取你要实现的 feature 对应的具体文档页。不是 homepage，不是完整 docs，而是相关页面。

**Source hierarchy（按权威性排序）：**

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Official documentation | react.dev, docs.djangoproject.com, symfony.com/doc |
| 2 | Official blog / changelog | react.dev/blog, nextjs.org/blog |
| 3 | Web standards references | MDN, web.dev, html.spec.whatwg.org |
| 4 | Browser/runtime compatibility | caniuse.com, node.green |

**非权威来源，不要作为 primary sources 引用：**

- Stack Overflow answers
- Blog posts 或 tutorials（即使很流行）
- AI-generated documentation 或 summaries
- 你自己的 training data（这正是要验证的原因）

**精确获取所需内容：**

```
BAD:  获取 React homepage
GOOD: 获取 react.dev/reference/react/useActionState

BAD:  搜索 "django authentication best practices"
GOOD: 获取 docs.djangoproject.com/en/6.0/topics/auth/
```

获取后，提取关键 patterns，并记录任何 deprecation warnings 或 migration guidance。

当官方来源彼此冲突（例如 migration guide 与 API reference 矛盾）时，向用户暴露差异，并针对检测到的 version 验证哪个 pattern 实际可用。

### Step 3: Implement Following Documented Patterns

编写符合文档示例的代码：

- 使用 docs 中的 API signatures，不凭记忆
- 如果 docs 展示了新的做法，使用新做法
- 如果 docs deprecate 了某个 pattern，不要使用 deprecated version
- 如果 docs 没覆盖某件事，将其标记为 unverified

**当 docs 与现有 project code 冲突时：**

```
CONFLICT DETECTED:
现有 codebase 使用 useState 管理 form loading state，
但 React 19 docs 针对此 pattern 推荐 useActionState。
(Source: react.dev/reference/react/useActionState)

Options:
A) 使用 modern pattern (useActionState) — 与当前 docs 一致
B) 匹配现有 code (useState) — 与 codebase 一致
→ 你更倾向哪种方式？
```

暴露冲突。不要静默选择。

### Step 4: Cite Your Sources

每个 framework-specific pattern 都要有 citation。用户必须能验证每个 decision。

**在 code comments 中：**

```typescript
// React 19 form handling with useActionState
// Source: https://react.dev/reference/react/useActionState#usage
const [state, formAction, isPending] = useActionState(submitOrder, initialState);
```

**在 conversation 中：**

```
我使用 useActionState，而不是手动 useState 管理
form submission state。React 19 用这个 hook 替代了手动
isPending/setIsPending pattern。

Source: https://react.dev/blog/2024/12/05/react-19#actions
"useTransition now supports async functions [...] to handle
pending states automatically"
```

**Citation rules:**

- 使用完整 URLs，不要 shortened URLs
- 尽量使用带 anchors 的 deep links（例如 `/useActionState#usage` 优于 `/useActionState`），anchors 比 top-level pages 更能经受 docs 重构
- 当引用支持非显而易见的 decision 时，quote relevant passage
- 推荐 platform features 时，包含 browser/runtime support data
- 如果找不到某个 pattern 的 documentation，明确说明：

```
UNVERIFIED: 我找不到此 pattern 的官方 documentation。
这是基于 training data，可能已过时。
上线生产前请验证。
```

诚实说明无法验证的内容，比虚假 confidence 更有价值。

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| “我对这个 API 很有把握” | Confidence 不是 evidence。Training data 包含看似正确但在当前 versions 下 broken 的过时 patterns。验证。 |
| “Fetching docs 浪费 tokens” | 幻觉出 API 浪费更多。用户 debug 一小时后发现 function signature 变了。一次 fetch 避免数小时返工。 |
| “Docs 里不会有我需要的东西” | 如果 docs 没覆盖，这是有价值的信息，说明该 pattern 可能不是官方推荐。 |
| “我只要说明可能过时就行” | Disclaimer 没帮助。要么验证并引用，要么明确标记 unverified。含糊其辞是最差选项。 |
| “这是简单 task，不用查” | 错误 patterns 的简单 tasks 会变成 templates。用户把 deprecated form handler 复制到十个 components 后才发现 modern approach。 |

## Red Flags

- 没查对应 version 的 docs 就写 framework-specific code
- 对 API 使用“我相信”或“我认为”，而不是引用 source
- 不知道 pattern 适用哪个 version 就实现
- 引用 Stack Overflow 或 blog posts，而不是 official documentation
- 因为 training data 中出现过就使用 deprecated APIs
- 实现前没有读取 `package.json` / dependency files
- 交付 framework-specific decisions 无 source citations 的代码
- 只需要一个相关页面，却 fetch 整个 docs site

## Verification
使用 source-driven development 实现后：

- [ ] 已从 dependency file 识别 framework 和 library versions
- [ ] 已为 framework-specific patterns 获取 official documentation
- [ ] 所有 sources 都是 official documentation，不是 blog posts 或 training data
- [ ] Code 遵循当前 version 文档展示的 patterns
- [ ] Non-trivial decisions 包含带完整 URLs 的 source citations
- [ ] 未使用 deprecated APIs（已对照 migration guides 检查）
- [ ] Docs 与现有 code 的冲突已向用户暴露
- [ ] 任何无法验证的内容都明确标记为 unverified
