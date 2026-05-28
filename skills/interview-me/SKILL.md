---
name: interview-me
description: 提取用户真正想要的东西，而不是他们以为自己应该想要的东西。通过一次一个问题的访谈，直到对底层意图达到约 95% 信心。用于请求不充分（“build me X”但没有“给谁”或“为什么现在”）、用户明确调用（“interview me”“grill me”“are we sure?”“stress-test my thinking”），或你发现自己在任何 plan、spec 或 code 前静默补全模糊需求时。
---

# Interview Me

## Overview
人们提出的要求，和他们真正想要的东西，往往不同。他们说要“a dashboard”，因为这是常见说法，不一定因为 dashboard 能解决问题。他们说“make it faster”，却没有给出要达到的数字。

发现这种差距的最便宜时机，是任何 plan、spec 或 code 出现之前。一旦开始构建，切换成本就变得真实，用户也会把错误东西合理化成“good enough”。不匹配会被锁定。

这个 skill 在产生成本前关闭差距。其他 Define 阶段 skills 假设你已经大致知道自己想要什么：`idea-refine` 从 idea 生成变体，`spec-driven-development` 写下 requirements，`doubt-driven-development` 在你起草 plan 后做 stress-test。`interview-me` 位于这些之前：一次问一个问题，附上你的最佳猜测，直到你能在用户开口前预测他们会说什么。

## When to Use
在以下情况应用此 skill：

- 请求至少缺少一项：用户**是谁**、他们**为什么**想要、**成功**是什么样、约束性**constraint**是什么
- 请求是惯例式而非具体式（“build me X”“make it faster”），且不靠猜无法拆解这种惯例
- 你想用未暴露的 assumptions 开始
- 两个合理价值发生冲突时，用户没说明要优化哪个（simplicity vs. flexibility、cost vs. speed）
- 用户明确调用：“interview me”“grill me”“before we start, are we sure?”“stress-test my thinking”

**何时不要使用：**

- 请求明确且自包含（“rename this variable”“fix this typo”）
- 用户明确要求速度优先于验证
- 纯信息请求（“how does X work?”“what does this code do?”）
- 机械操作（renames、formats、file moves）
- 你已有 ≥95% 信心；在假定自己已达到前，重新阅读下方 stop condition

## 加载约束

此 skill 需要一个在线且可响应的用户。**不要在非交互上下文中调用**，例如 CI pipelines、scheduled runs、`/loop` 或 autonomous-loop。如果处于这些场景且请求不充分，把它标记为用户 blocker，而不是猜。

## 流程

### Step 1: 提出假设，并给出信心数字

提问前，用**一句话**写下你当前对用户想要什么的最佳理解，并附上诚实的信心数字（0–100%）：

```
HYPOTHESIS: 你想要一种在 standup 中回答“how are we doing?”的方式，而“dashboard”是你想到的惯例形式。
CONFIDENCE: ~30% — 缺少：给谁用、“metrics”在上下文中指什么、成功是什么样
```

数字会迫使诚实。如果你写了高数字，但无法预测用户对接下来三个问题的反应，这个数字就是错的。从你能 defend 的信心水平开始。

当信心低于约 70% 时，在同一行附上简短原因：仍未解决或缺失什么。这会明确告诉用户访谈需要暴露什么，也避免数字变成含糊信号。

### Step 2: 一次问一个问题，每个问题附上猜测

格式：

```
Q: <一个聚焦问题>
GUESS: <你对答案的假设，以及产生该假设的理由>
```

等待用户反应后再问下一个问题。

**为什么一次一个，而不是批量：**

- 如果把假设埋在列表里，用户无法有效反应
- 批量问题鼓励扫读和表面回答
- 第三个问题通常依赖第一个问题的答案；一次全问会锁定错误 framing
- 用户认真思考的精力有限；一次只消耗在一个问题上

**为什么附上猜测：**

- 用户对错误猜测的反应，比从零生成答案更快
- 它让你承诺一个可被明显证伪的 hypothesis，从而保持诚实
- 它暴露的是**你的** assumptions，这正是访谈要揭示的东西

这里的风险是礼貌型用户为了配合而认同你的猜测。缓解方式是明显表现出愿意犯错，并偶尔朝你预期用户会反驳的方向猜。

### Step 3: 倾听“want vs. should want”

最危险的回答，是用户说出一个“听起来像深思熟虑”的答案，而不是他们真正想要的东西。注意：

- 匹配 best-practice 话术但缺少具体性的回答（“I want it to be scalable”“clean architecture”）
- 诉诸惯例的回答（“the way most apps do it”“the standard approach”）
- 类似 “I should probably…”、“I think I'm supposed to…”、“good engineering practice says…” 的表达
- 把 buzzwords 当目标：当“modern”“scalable”“robust”成了答案，而非具体 outcome

听到这些时，要问：

> *“如果你不需要向任何人解释或证明，你真正想要什么？”*

这个问题通常比前五个问题更有效。

### Step 4: 用用户自己的话复述意图

当信心较高时，写回你现在认为用户想要什么。保持简洁（5–8 行），尽量使用他们的语言，并组织成用户可以逐行确认或纠正的结构：

```
我现在认为你想要的是：

- Outcome:      <一行>
- User:         <一行 — 谁受益>
- Why now:      <一行 — 什么发生了变化>
- Success:      <一行 — 如何知道它有效>
- Constraint:   <一行 — 约束性限制>
- Out of scope: <一行 — 明确不做什么>

Yes / no / refine?
```

包含 “Out of scope” 不可协商。一半的错位来自对**不构建什么**的静默分歧。

### Step 5: 确认，必须是明确 yes，不是“whatever you think”

Gate 是明确的 “yes”。以下都**不是** yes：

- “Whatever you think is best.” → 用户在委托，这意味着他们也没有 95% 信心。用两个具体选项重新提问，让他们选择。
- “Sounds good.” → 含糊。问：“Anything you'd refine?” 沉默不是确认。
- “Sure, let's go.” → 常常是礼貌退出，不是认可。使用同样 follow-up。
- 沉默后说 “okay let's start.” → 用户放弃访谈了，不是达成一致。停下，问是否漏掉了什么。

如果用户纠正你，吸收纠正并重新复述。循环直到得到明确 yes。

### 95% 信心停止条件

当你能对这个问题回答 yes 时，就完成了：

> *我能预测用户对接下来三个我会问的问题的反应吗？*

如果可以，你们已有共享理解。停止访谈并产出复述。如果不可以，还没完成；继续问下一个问题。

这是可检查测试，不是感觉。它也有下限：如果已多轮仍无法预测，这说明请求本身有信息，而不是继续硬磨的理由。停下并告诉用户：“我已经问了 X 个问题，但仍无法预测你的反应。缺少某个基础信息。要不要退一步？”

## 输出

此 skill 的输出是一个**已确认的意图陈述**：Step 4 的复述，加上 Step 5 的明确 yes。这就是 deliverable。Specs、plans 和 task lists 都在下游；它们消费这个 skill 产出的 intent。

如果用户希望持久化 intent（多 session 项目、handoff 给其他 collaborator），可提议保存到 `docs/intent/[topic].md`。只有在用户确认后才保存。

## 示例

一个简短 before-and-after。

**不使用 `interview-me`：**

```
User:  build me a dashboard for our metrics
Agent: <开始提出 chart libraries 和 layouts>
```

Agent 已假设：给谁用、哪些 metrics、“for our team”是什么意思、成功是什么样。这些都没有被说明。每个 assumption 都是用户之后可能说“that's not what I meant”的地方。

**使用 `interview-me`：**

```
User: build me a dashboard for our metrics

Agent:
HYPOTHESIS: 你想要一种在 standup 中回答“how are we doing?”的方式，而“dashboard”是你想到的惯例答案。
CONFIDENCE: ~30% — 缺少：给谁用、“metrics”是什么、成功是什么样

Q:     当你说“how are we doing?”时，是谁在问？只有你自己、standup 中的 engineering team，还是上级链路（例如 manager、exec、board）？
GUESS: standup 中的 engineering team，因为“we”通常指这个范围，standup 也是这个问题常出现的地方。如果是给 execs，metrics 和 framing 会很不一样。

User: It's actually for me. I keep losing track of which experiments are running and what their early signal looks like.

Agent:
Updated read: 根本不是 team dashboard，而是 personal experiment tracker。Confidence: ~60% — 仍缺少：“early signal”是什么意思，以及 done 是什么样。

Q:     缺口是你不知道有哪些 experiments，还是无法在一个地方看到它们的结果？
GUESS: 第二个。你在某处有 experiments 列表，但结果分散在五个不同工具里，手工对齐让你疲惫。

User: First one actually. I literally don't have a list. They're spread across different docs.

Agent: <继续>
```

两个问题后，agent 发现真实请求不是“a dashboard”，而是“a list”。不同 artifact、不同 scope、不同 work。Dashboard 会是错的。

## 与其他 Skills 的交互

- **`idea-refine`**：下游。如果已确认 intent 是“我想要 X，但不知道如何确定 scope”，交给 `idea-refine`，基于已明确 intent 生成变体。
- **`spec-driven-development`**：下游。如果已确认 intent 很具体（“I want X for Y users with Z success criteria”），交给 `spec-driven-development` 写下来。
- **`planning-and-task-breakdown`**：此 skill 的下下游（在 spec 之后）。
- **`doubt-driven-development`**：时间线的另一端。`interview-me` 是决策前的 intent extraction；`doubt-driven-development` 是决策后的 artifact review。两者都捕捉偏差，但时机不同。
- **`source-driven-development`**：正交。`interview-me` 澄清用户想要什么；SDD 验证 framework facts。它们不冲突。

## Common Rationalizations
| 合理化 | 现实 |
|---|---|
| “请求已经足够清楚” | 如果你现在无法用一句话写出用户想要的 outcome，请求就不清楚。先运行 Step 1 再判断。 |
| “问太多问题会浪费他们时间” | 4–6 个有针对性的问题浪费的时间很少。构建错误东西浪费的时间巨大，而且成本由用户承担。 |
| “我会边做边弄清楚” | 代码存在后的切换成本是现在的 10 倍。实现中 discovery 就是返工。 |
| “他们说了 ‘whatever you think’，所以我该直接决定” | “Whatever you think” 是委托，不是决策。用两个具体选项重新提问，让他们选择。 |
| “我应该给他们几个 options 选” | Options 适用于用户知道自己想要什么、正在权衡 trade-offs 的场景。他们现在还不知道。列 options 会扩大搜索；提问会缩小搜索。 |
| “附上猜测会引导他们” | 引导正是目的。反应比从零生成更快。风险是迎合，不是引导；通过明显愿意犯错来缓解。 |
| “我们聊够了，我懂了” | 测试一下：你能预测他们对接下来三个问题的反应吗？如果不能，你还没懂。 |
| “用户说 yes 了，结束” | 如果 yes 跟在含糊复述或开放式 “sounds good” 后，这个 yes 是空的。具体复述并重新确认。 |

## Red Flags

- 一条消息里问三个或更多问题：这是批量，不是访谈
- 问题没有附带你的 hypothesis：这是调查，不是承诺
- 把 “whatever you think is best” 当作终止答案
- 在用户明确确认复述前，产出 spec、plan 或 task list
- 问题 framed 为 “what would be best practice?”，而不是 “what do you actually want?”
- 用户给出 sophistication-signaling 答案（“scalable”“clean”“modern”），你却不追问它是否真是他们想要的
- 三轮或更多后信心没有明显上升：你问错了问题，退一步重新 frame
- 信心数字低于约 70% 但没有附原因：用户不知道缺什么，就无法帮你补齐
- 用户确认前保存 intent doc；doc 本身暗示了用户未给出的 yes
- 复述中跳过 “Out of scope” 行；对非目标的静默分歧占错位的一半

## Verification

应用 `interview-me` 后：

- [ ] 第一轮明确陈述了 hypothesis 和 confidence number
- [ ] 每个低于约 70% 的 confidence number 都附有一行原因（仍未解决或缺失什么）
- [ ] 一次只问一个问题，且每个问题都附带 agent 的 guess
- [ ] 当用户给出 sophistication-signaling 或 convention-signaling 答案时，至少问过一次“如果不需要证明，你真正想要什么？”
- [ ] 向用户写回了具体复述（Outcome / User / Why now / Success / Constraint / Out of scope）
- [ ] 用户用明确 yes 确认复述（不是 “whatever you think”、不是 “sounds good”、不是沉默）
- [ ] 到停止点时，agent 能预测接下来三个问题的用户反应
- [ ] 任何交给下游 skill（`idea-refine`、`spec-driven-development`）的 handoff，都是基于已确认 intent，而不是原始不充分请求
