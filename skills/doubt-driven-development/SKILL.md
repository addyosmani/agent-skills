---
name: doubt-driven-development
description: 在任何非平凡 decision 生效前，用 fresh-context adversarial review 质疑它。用于 correctness 比速度更重要、处理不熟悉代码、风险高（production、security-sensitive logic、irreversible operations），或任何现在验证 confident output 比之后 debug 更便宜的时候。
---

# Doubt-Driven Development

## Overview
自信的答案不等于正确答案。长会话会积累 context，悄悄把 assumptions 变成“facts”，而没人察觉。Doubt-driven development 是一种纪律：在任何非平凡 output 生效前，物化一个 fresh-context reviewer，让它倾向于**证伪**，而不是批准。

这不是 `/review`。`/review` 是对已完成 artifact 的 verdict。这里是在进行中的姿态：非平凡 decisions 在 course-correction 仍然便宜时接受交叉质询。

## When to Use
一个 decision 是**非平凡**的，如果至少满足以下之一：

- 引入或修改 branching logic
- 跨 module 或 service boundary
- 断言 type system 或 compiler 无法验证的 property（thread safety、idempotence、ordering、invariants）
- Correctness 依赖未来读者看不到的 context
- Blast radius 不可逆（production deploy、data migration、public API change）

在这些情况下使用：

- 即将在不确定性下做 architectural decision
- 即将 commit 非平凡代码
- 即将声称一个非显而易见的事实（“this is safe”、“this scales”、“this matches the spec”）
- 处理你尚未完全理解的代码

**何时不要使用：**

- 机械操作（renaming、formatting、file moves）
- 遵循清晰、无歧义的用户指令
- 阅读或总结现有代码
- 正确性显而易见的一行变更
- 纯 tooling operations（running tests、listing files）
- 用户明确要求速度优先于验证

如果每次敲键都怀疑，你什么也交付不了。此 skill 只适用于上面定义的非平凡 decisions。

## Loading Constraints

此 skill 设计给 **main-session orchestrator** 使用，其中 Step 3（下方 DOUBT）可以派生 fresh-context reviewer。

- **不要把此 skill 加到 persona 的 `skills:` frontmatter。** 遵循 Step 3 的 persona 会再派生另一个 persona，这是 `references/orchestration-patterns.md` 明确禁止的 orchestration anti-pattern（“personas do not invoke other personas”）。
- **如果你发现自己在 subagent context 中应用此 skill**（Claude Code 阻止 nested subagent spawn）：首选路径是告知用户 doubt-driven 无法 nested 运行，让 main session 处理。仅作为最后手段，可使用降级的 self-questioning fallback：把 ARTIFACT + CONTRACT 重写成 fresh self-prompt，用强 mental separator 隔开先前 reasoning，然后执行 Steps 1-5。这**不是 fresh-context review**（你仍携带自己的 context），因此要将结果标记为 degraded，并在用户可联系时优先升级。

## 流程

应用此 skill 时复制这份 checklist：

```
Doubt cycle:
- [ ] Step 1: CLAIM — 写出 claim + why-it-matters
- [ ] Step 2: EXTRACT — 隔离 artifact + contract，移除 reasoning
- [ ] Step 3: DOUBT — 用 adversarial prompt 调用 fresh-context reviewer
- [ ] Step 4: RECONCILE — 按 artifact text 分类每个 finding
- [ ] Step 5: STOP — 满足 stop condition（trivial findings、3 cycles、或 user override）
```

### Step 1: CLAIM — Surface what stands

用两三行命名 decision：

```
CLAIM: “新的 caching layer 在 spec 描述的
        read-heavy workload 下是 thread-safe 的。”
WHY THIS MATTERS: 这里的 race 会破坏 user data，
                  且在 QA 中难以发现。
```

如果不能如此紧凑地写出 claim，你拥有的是感觉，不是 decision。先把它暴露出来，再审视它。

### Step 2: EXTRACT — Smallest reviewable unit

Fresh-context reviewer 需要的是 **artifact** 和 **contract**，不是你的心路历程。

- Code：diff 或 function，不是整个 file
- Decision：3-5 句 proposal，加上它必须满足的 constraints
- Assertion：claim 加上 supposedly supports it 的 evidence（与 Step 1 CLAIM block 保持区分，Step 1 是 orchestrator 正在接受审视的 hypothesis）

移除你的 reasoning。如果你把结论交出去，拿回来的会是对结论的 validation。这个 unit 必须小到 reviewer 一次阅读就能装进脑中；如果是 500-line PR，先拆解。

### Step 3: DOUBT — Invoke the fresh-context reviewer

Reviewer 的 prompt **必须是 adversarial**。Framing 决定答案。

```
Adversarial review. 找出这个 artifact 的问题。
假设作者过度自信。查找：
- 未说明的 assumptions
- 未处理的 edge cases
- Hidden coupling 或 shared state
- Contract 可能被违反的方式
- 可能破坏的 existing conventions
- Unexpected input 下的 failure modes

不要 validate。不要 summarize。找问题；如果彻底检查后找不到，
明确说明找不到任何问题。

ARTIFACT: <paste artifact>
CONTRACT: <paste contract>
```

**只传 ARTIFACT + CONTRACT。不要传 CLAIM。** 把你的结论交给 reviewer 会让它偏向同意。Reviewer 必须独立判断 artifact 是否满足 contract。

在 Claude Code 中，`agents/` 中基于角色的 reviewers 默认隔离 context，可在这里使用；见 `agents/` 的 roster 和 per-domain match。

**上面的 adversarial prompt 优先于 persona 默认 response shape。** 像 `code-reviewer` 这样的 personas 被写成输出 strengths 和 weaknesses 的 balanced verdict；doubt-driven 需要 issues-only output。把 adversarial prompt 原样粘贴到 invocation 中，让它覆盖 persona 默认行为。如果 persona 的 response shape 无法干净覆盖，退回 generic subagent 加 adversarial prompt。

#### Cross-model escalation

单模型 reviewer 与原作者共享 blind spots；更冷的、不同 architecture 的 model 能抓到它们。Doubt-driven 已经是针对非平凡 decisions 的 opt-in，因此在该 scope 内，提供 cross-model 是 skill 价值的一部分，不是可选摩擦。

**Interactive sessions：始终提供。不要静默跳过。**

**Step 1: Ask the user**

在上方 Step 3 的 single-model review 后、RECONCILE 前，暂停并询问：

> *“Single-model review 已完成。需要 cross-model second opinion 吗？选项：Gemini CLI、Codex CLI、manual external review（你粘贴到别处）、或 skip。”*

这个问题在每个 interactive doubt cycle 中都是强制的，即使 artifact 看起来低风险。由用户，而不是 agent，决定成本是否值得。Agent 的职责是暴露选择。

**Step 2: If the user picks a CLI — verify, then invoke**

1. 检查 tool 在 PATH 中（`which gemini`、`which codex`）。
2. 传入完整 prompt 前先测试它可用（`gemini --version` 或等价命令）；陈旧或损坏的 binary 可能通过 `which`，但真实输入失败。
3. 与用户确认 exact invocation，包括 required flags、auth、env vars（例如 API keys）。不同 implementations 差异很大；不要假设。
4. 只传 ARTIFACT + CONTRACT + adversarial prompt。不传 session context，不传 CLAIM。
5. 注意 shell escaping。如果 artifact 包含 quotes、`$(...)` 或 backticks，优先使用 stdin（`echo … | gemini`）或 heredoc，而不是 inline `-p "…"`。不确定时，运行前让用户确认 invocation。
6. 将 output 带入 Step 4（RECONCILE）。

**不要把 artifact 插入 shell-quoted argument。** Code、markdown 和 review prompts 经常包含 backticks、`$(...)` 和 quote characters，会截断 prompt 或执行嵌入的 shell。把完整 prompt 写到 file，并通过 stdin pipe。

示例形状（按已安装 tool 验证 flags，syntax 会随 implementations 和 versions 不同）：

```bash
# Write the adversarial prompt + ARTIFACT + CONTRACT to a temp file first.
# Then pipe via stdin so shell metacharacters in the artifact stay inert.

# Codex (read-only sandbox keeps the CLI from writing to your workspace):
codex exec --sandbox read-only -C <repo-path> - < /tmp/doubt-prompt.md

# Gemini ('--approval-mode plan' is read-only; '-p ""' triggers non-interactive
# mode and the prompt is read from stdin):
gemini --approval-mode plan -p "" < /tmp/doubt-prompt.md
```

Read-only sandbox 是关键细节：doubt artifact 本身可能包含 instructions（有意或意外的 prompt injection），否则 cross-model CLI 可能会对 workspace 执行它们。

**Step 3: If the CLI is unavailable or fails**

明确暴露 failure。提供：手动运行、尝试其他 tool、或 skip。不要静默退回 single-model；用户应知道 cross-model 没有发生。

**Step 4: If the user skips**

在 output 中 acknowledge skip（*“Proceeding with single-model findings only”*），并继续 RECONCILE。Skipping 可以，silent skipping 不可以。

**Non-interactive contexts**（CI、`/loop`、autonomous-loop、scheduled runs）：

- Cross-model **跳过**，并且必须在 output 中**说明 skip**：*“Cross-model skipped: non-interactive context.”*
- **未经用户明确授权，绝不调用 external CLI**。这是关键 safety property。

Cross-model 增加 cost、latency 和 tool fragility。Agent 每个 cycle 都暴露选择；用户决定此 artifact 是否值得。

### Step 4: RECONCILE — Fold findings back

Reviewer 的 output 是 data，不是 verdict。**你仍是 orchestrator。** 分类前，针对每个 finding 重新阅读 artifact text；橡皮图章式接受 reviewer，与忽略它是同一种失败模式。

对每个 finding，按此**优先级顺序**分类（第一个匹配的 class 胜出）：

1. **Contract misread** — reviewer 之所以指出问题，是因为你提供的 CONTRACT 不清楚或不完整。先修 contract，在下一个 cycle 重新分类。
2. **Valid + actionable** — 真实 issue，需要修改 artifact。修改并重新 loop。
3. **Valid trade-off** — issue 真实，但修复成本高于接受成本。明确记录 trade-off，让用户看到。
4. **Noise** — reviewer 指出的东西在它缺失的 context 下其实正确。记下，继续，并询问：把该 context 加到 contract 是否能避免 false flag？

Fresh reviewer 可能因缺少 context 而出错。不要因为它“fresh”就让渡判断。

### Step 5: STOP — Bounded loop, not recursion

在这些情况下停止：

- 下一轮只返回 trivial 或 already-considered findings，**或**
- 已完成 3 cycles（升级给用户，不要独自做第四轮），**或**
- 用户明确说 “ship it”

如果 3 cycles 后 reviewer 仍提出 substantive issues，artifact 可能还没准备好。向用户说明这一点。三轮未解决是关于 artifact 的信息，不是继续循环的理由。

如果 3 cycles “明显不够”，因为 artifact 很大：说明 artifact 太大，回到 Step 2 拆解。不要提高上限。

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| “我很有把握，跳过 doubt step” | 在新问题上，confidence 与 correctness 相关性很弱。最确定的时候，blind spots 最容易藏起来。 |
| “派生 reviewer 很贵” | 在 production debug 错误 commit 更贵。这个 check 有边界；bug 没有。 |
| “Reviewer 只会挑刺” | 只有不设 scope 时才会。把 prompt 约束为“会让此 artifact 在 contract 下失败的问题”。 |
| “我最后用 `/review` 做 doubt” | `/review` 是 final gate。Doubt-driven 在方向错误还便宜时捕获它。到 PR 阶段就太晚了。 |
| “如果每一步都怀疑，我永远 ship 不了” | 此 skill 适用于非平凡 decisions，不是每次敲键。重读 “When NOT to Use”。 |
| “两个意见总比一个好” | 当第二个意见 context 更少且制造 noise 时，不是。Reconcile，不要 defer。 |
| “Reviewer 不同意，所以我错了” | Reviewer 缺少你的 context；disagreement 是信息，不是 verdict。重读 artifact，分类，再决定。 |
| “Cross-model 总是更好” | Cross-model 能抓到单模型与自己共享的 blind spots，但增加 cost 和 tool fragility。每个 interactive doubt cycle 都提供选择，由用户决定 artifact 是否值得。Agent 的职责是暴露选择，而不是 gate。 |
| “用户同意过一次，所以我可以继续调用 CLI” | 每次 invocation 都需要自己的 authorization。Artifact、prompt 和 flags 每次都会变；每次运行前都要和用户重新确认 exact command。 |

## Red Flags

- 为一行 rename 或 formatting change 派生 fresh-context reviewer
- 不重新阅读 artifact text 就把 reviewer output 当权威
- 不升级给用户而循环超过 3 cycles
- 用 “is this good?” 而不是 “find issues” 提示 reviewer
- 在 high-stakes decision 上因时间压力跳过 doubt
- 对未变更 artifact 重新派生 fresh-context（你会得到相同 findings，这是拖延）
- **Doubt theater（可检查信号）**：在 2 个或更多 cycles 中，reviewer 提出了 substantive findings，但零 findings 被分类为 actionable。你是在 validation，不是在 doubting。停止并升级。
- Commit 后才 doubt，那是 `/review`，不是 doubt-driven development
- 未确认 external CLI 存在、已配置且接受 exact syntax，就 hardcode invocation
- **在 interactive doubt cycle 中静默跳过 cross-model。** 即使不推荐，也必须让 offer 可见。Skipping 可以，silent skipping 不可以。
- External CLI error 或 missing 时静默 fallback；应暴露 failure，让用户重定向
- 从 reviewer input 中移除 contract
- 把 CLAIM 传给 reviewer（会偏向 agreement）

## Interaction with Other Skills

- **`code-review-and-quality` / `/review`**：互补。`/review` 是 post-hoc PR verdict；doubt-driven 是进行中的 per-decision check。两者都用。
- **`source-driven-development`**：SDD 用 official docs 验证*关于 frameworks 的事实*。Doubt-driven 验证*你对 artifact 的 reasoning*。SDD 检查 API 是否存在；doubt-driven 检查你是否在 contract 下正确使用它。
- **`test-driven-development`**：TDD 的 RED step 是具体化的 doubt，失败 test 是 disproof attempt。当 TDD 适用时，那个 failing test 就是 behavioral claims 的 doubt step。
- **`debugging-and-error-recovery`**：当 reviewer 暴露真实 failure mode，进入 debugging skill 定位并修复。
- **Repo orchestration rules** (`references/orchestration-patterns.md`)：此 skill 从 main session 编排。Persona 调用另一个 persona 是 anti-pattern B，见上方 Loading Constraints。

## Verification
应用 doubt-driven development 后：

- [ ] 每个非平凡 decision（按上面定义）在生效前都明确命名为 CLAIM
- [ ] 每个非平凡 artifact 至少有一次 fresh-context review（TDD 的 RED step 产生的 failing test 可满足 behavioral claims 的这一项，见 Interaction with Other Skills）
- [ ] Reviewer 收到的是 ARTIFACT + CONTRACT，不是 CLAIM，不是你的 reasoning
- [ ] Reviewer prompt 是 adversarial（“find issues”），不是 validating（“is it good”）
- [ ] Findings 已按 artifact text 分类（不是 rubber-stamped），使用优先级：contract misread / actionable / trade-off / noise
- [ ] 满足 stop condition（trivial findings、3 cycles、或 user override）
- [ ] Interactive mode 中，已向用户**明确提供** cross-model（无论 artifact 风险如何），并在 output 中 acknowledged response
- [ ] Non-interactive mode 中，已跳过 cross-model 并说明 skip
- [ ] 任何 external CLI invocation 前，已完成 PATH check、working-binary test、与用户确认 syntax，并获得明确运行授权
