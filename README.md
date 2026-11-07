# Agent Skills

**Production-grade engineering skills for AI coding agents.**

Skills encode the workflows, quality gates, and best practices that senior engineers use when building software. These ones are packaged so AI agents follow them consistently across every phase of development.

This distribution pairs the skills with **[Probity](https://github.com/nizos/probity)**, a PreToolUse rule engine that mechanically enforces the disciplines the skills teach: a failing test before production code, ports-and-adapters boundaries, spec-first acceptance tests, and a green test run before every commit. **A complete install has two parts: the skills, and a Probity guardrail installed and configured in the target project.** Installing only the skills leaves every gate switched off. See [Quick Start](#quick-start).

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

## Commands

9 slash commands that map to the development lifecycle. Each one activates the right skills automatically.

| What you're doing | Command | Key principle |
|-------------------|---------|---------------|
| Define what to build | `/spec` | Spec before code |
| Plan how to build it | `/plan` | Small, atomic tasks |
| Build incrementally | `/build` | One slice at a time |
| Prove it works | `/test` | Tests are proof |
| Review before merge | `/review` | Improve code health |
| Audit web performance | `/webperf` | Measure before you optimize |
| Simplify the code | `/code-simplify` | Clarity over cleverness |
| Ship to production | `/ship` | Faster is safer |
| Keep enforcement current | `/probity-update` | Updates flow, forks rot |

In Claude Code these install as plugin commands. Where a built-in command has the same name, as `/review` does, use the namespaced form: `/agent-skills:review`.

Want fewer manual steps once the spec exists? **`/build auto`** generates the plan and implements every task in a single approved pass — you approve the plan once, then it runs autonomously. It removes the human stepping *between* tasks, not the verification: every task is still test-driven and committed individually, and it pauses on failures or risky steps.

Skills also activate automatically based on what you're doing — designing an API triggers `api-and-interface-design`, building UI triggers `frontend-ui-engineering`, and so on.

---

## Quick Start

> **Installing with an AI agent?** The install is **not finished** once the skills are copied. Part 2 below (Probity) is a required step, not an optional extra: Probity must be installed *in the target project*, its config edited to that project's layout, its scoping verified, and its hook wired into the agent. Work through the [install checklist](#install-checklist) before reporting done.

Setup has two parts. Do both.

| Part | What it installs | Where it lives |
|------|------------------|----------------|
| **1. Skills** | The workflow skills, agent personas, and slash commands the agent *reads* | Your agent's skill or plugin directory |
| **2. Probity** | The rule engine that *blocks* tool calls violating those workflows, plus this repo's rule templates | The target project's root (`probity.config.ts`, `rules/`, `scripts/`) and its agent hook config |

### Part 1: Install the skills

The commands below install from this fork, [JJChill/agent-skills](https://github.com/JJChill/agent-skills). It carries the full upstream [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) catalog plus the Probity templates that Part 2 depends on; installing from upstream gives you the skills but not `hooks/probity/`.

**Fastest path — any agent, one command.** The open [skills CLI](https://github.com/vercel-labs/skills) installs into 70+ agents (Claude Code, Cursor, Codex, Copilot, Cline, and more):

```bash
npx skills add JJChill/agent-skills            # install all 31 skills
npx skills add JJChill/agent-skills --list     # browse before installing
```

Or grab individual skills:

```bash
npx skills add JJChill/agent-skills --skill code-review-and-quality   # five-axis review before merge
npx skills add JJChill/agent-skills --skill interview-me              # requirements interrogation, one question at a time
npx skills add JJChill/agent-skills --skill test-driven-development   # red-green-refactor, enforced
```

> **Installing one skill?** A per-skill `npx` install copies only
> `skills/<name>/`, not the repo-level `references/` directory. The skill still
> works, but paths to supplementary shared checklists are unavailable. Use a
> whole-repo integration, clone the repository, or copy the needed checklist into
> a `references/` directory inside the installed skill. This portability gap is
> tracked in [#361](https://github.com/addyosmani/agent-skills/issues/361).

Prefer a native integration? Pick your tool below.

<details>
<summary><b>Claude Code (recommended)</b></summary>

**Marketplace install:**

```
/plugin marketplace add JJChill/agent-skills
/plugin install agent-skills@jjchill-agent-skills
```

> **SSH errors?** The marketplace clones repos via SSH. If you don't have SSH keys set up on GitHub, either [add your SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) or use the full HTTPS URL to force HTTPS cloning during the marketplace-add step:
> ```bash
> /plugin marketplace add https://github.com/JJChill/agent-skills.git
> /plugin install agent-skills@jjchill-agent-skills
> ```
>
> If `/plugin install` still fails with `git@github.com: Permission denied (publickey)` on Windows or macOS, the recommended workaround is to configure Git once to rewrite GitHub SSH URLs to HTTPS for subprocess clones:
> ```bash
> git config --global url."https://github.com/".insteadOf git@github.com:
> ```

**Local / development:**

```bash
git clone https://github.com/JJChill/agent-skills.git
claude --plugin-dir /path/to/agent-skills
```

</details>

<details>
<summary><b>Cursor</b></summary>

Put workflow skills under `.cursor/skills/` (sync from `agent-skills/skills/`) and short policies in `.cursor/rules/*.mdc` — do not paste full skills into rules. Both directories live in your project; this repo does not ship a `.cursor/` folder. See [docs/cursor-setup.md](docs/cursor-setup.md).

</details>

<details>
<summary><b>Antigravity CLI</b></summary>

Install as a native plugin for skills and subagents. In affected Antigravity CLI releases, legacy command TOMLs are reported as converted but their wrapper commands are not discoverable; invoke the underlying namespaced skills directly. See [docs/antigravity-setup.md](docs/antigravity-setup.md#lifecycle-workflows-and-command-compatibility).

**Install from the repo:**

```bash
agy plugin install https://github.com/JJChill/agent-skills.git
```

**Install from a local clone:**

```bash
git clone https://github.com/JJChill/agent-skills.git
agy plugin install ./agent-skills
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

Install as native skills for auto-discovery, or add to `GEMINI.md` for persistent context. See [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md).

**Install from the repo:**

```bash
gemini skills install https://github.com/JJChill/agent-skills.git --path skills
```

**Install from a local clone:**

```bash
gemini skills install ./agent-skills/skills/
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add skill contents to your Windsurf rules configuration. See [docs/windsurf-setup.md](docs/windsurf-setup.md).

</details>

<details>
<summary><b>OpenCode</b></summary>

Copy skills to `.opencode/skills/` (or `~/.config/opencode/skills/`), add a project-local `AGENTS.md`, and use the built-in `skill` tool for agent-driven execution. Optional slash commands can be added under `.opencode/commands/`.

See [docs/opencode-setup.md](docs/opencode-setup.md).

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

Use agent definitions from `agents/` as Copilot personas and skill content in `.github/copilot-instructions.md`. The lifecycle slash commands (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`) are Claude Code commands and do not appear in Copilot; invoke the skills by name (`/spec-driven-development`, …) instead. See [docs/copilot-setup.md](docs/copilot-setup.md).

Using the standalone `copilot` CLI? Install it as a plugin — see [docs/copilot-cli-setup.md](docs/copilot-cli-setup.md).

</details>

<details>
  <summary><b>Kiro IDE & CLI </b></summary>

Skills for Kiro reside under `.kiro/skills/` (project or global level), and Kiro also reads `AGENTS.md`. See the Kiro docs at https://kiro.dev/docs/skills/.

Kiro users still complete [Part 2 of the Quick Start](#part-2-install-and-configure-probity-in-the-target-project) (Probity installed and configured in the project); only the hook wiring differs. Probity has no native Kiro vendor, so a thin preToolUse shim translates Kiro's tool events to Probity's `claude-code` contract and back, letting one `probity.config.ts` enforce both agents. Assets live in [`hooks/probity/kiro/`](hooks/probity/kiro/); see [docs/kiro-setup.md](docs/kiro-setup.md).

</details>

<details>
<summary><b>Codex</b></summary>

Install as a native Codex plugin (Codex CLI v0.122+):

```bash
codex plugin marketplace add JJChill/agent-skills
codex plugin add agent-skills@agent-skills
```

The first command registers the marketplace; the second installs the plugin. Codex reads the root `skills/` directory directly through `.codex-plugin/plugin.json`. Once installed, invoke skills in chat using `@` (e.g., `@spec-driven-development`). See [docs/codex-setup.md](docs/codex-setup.md) for local installation and troubleshooting.

</details>

<details>
<summary><b>Command Code</b></summary>

Install natively with the built-in `cmd skills` command. Command Code clones the repo, discovers every `SKILL.md`, and installs into `.commandcode/skills/`:

```bash
cmd skills add JJChill/agent-skills            # pick skills to install (project)
cmd skills add JJChill/agent-skills --global   # install for all projects (~/.commandcode/skills/)
cmd skills add JJChill/agent-skills -s spec-driven-development  # install a specific skill
```

Installed skills show up in the TUI slash menu, e.g. `/spec-driven-development`. See [docs/commandcode-setup.md](docs/commandcode-setup.md).

</details>

<details>
<summary><b>Other Agents</b></summary>

Skills are plain Markdown - they work with any agent that accepts system prompts or instruction files. See [docs/getting-started.md](docs/getting-started.md). Hosts that install the pack but aren't listed above are in [docs/other-hosts.md](docs/other-hosts.md).

</details>



### Part 2: Install and configure Probity in the target project

Probity lives in the **project you are building**, not in this repo. The skills tell the agent what good looks like; Probity intercepts every `Write`/`Edit`/`Bash` call before it executes and blocks the ones that break the rules, with a corrective message the agent recovers from. Without it, the skills are advice the agent can rationalize away under pressure. [hooks/PROBITY.md](hooks/PROBITY.md) is the full reference (every rule, what it enforces, and how); the steps below are the minimum viable setup.

**Agent support.** Probity hooks into Claude Code, Codex, and GitHub Copilot CLI natively, and into Kiro through the shim in [`hooks/probity/kiro/`](hooks/probity/kiro/) ([docs/kiro-setup.md](docs/kiro-setup.md)). Other agents (Cursor, Gemini CLI, Windsurf, and so on) have no hook Probity can attach to, so they get the skills only. Record that in the project's agent instructions so nobody assumes the gates are live.

Run everything below from the target project's root.

**1. Install Probity and the rule package.** Node is required even for non-Node projects; a one-dependency `package.json` next to `gradlew` or the `.xcworkspace` is fine (Swift projects: give it `"type": "module"`).

```bash
npm install -D @nizos/probity @jjchill/probity-rules
```


Kotlin parser support for the deterministic single-test TDD fast path ships
with the rule package and installs automatically as optional dependencies. If
a platform cannot install the parser, or disk/install constraints require
`npm install --omit=optional`, Kotlin writes delegate to the AI TDD rule with
an explicit fast-path-unavailable diagnostic.

**2. Pick the preset for the project's language** and copy in its thin config template — a short file that imports the preset's rule factory from the package and calls it with this project's options.

| Project | Preset factory / template | Calibrated for |
|---------|----------------------------|-----------------|
| JavaScript / TypeScript | `jsRuleEntries` · [`probity.config.ts`](hooks/probity/probity.config.ts) | `src/core` + `src/adapters` layout, vitest or jest |
| Kotlin / JVM / Android | `kotlinRuleEntries` · [`probity.config.kotlin.ts`](hooks/probity/probity.config.kotlin.ts) | Multi-module Gradle, `*-core` / `*-ui` split, a mocking library present |
| Kotlin Multiplatform | `kmpRuleEntries` · [`probity.config.kmp.ts`](hooks/probity/probity.config.kmp.ts) | Per-feature hexagonal packages, fakes only, Markdown specs in `docs/specs/` |
| Swift / iOS | `swiftRuleEntries` · [`probity.config.swift.ts`](hooks/probity/probity.config.swift.ts) | Xcode workspace, `AcceptanceTests/` four-layer suite, XCUITest |

```bash
cp node_modules/@jjchill/probity-rules/probity.config.ts ./probity.config.ts   # or probity.config.kotlin.ts / .kmp.ts / .swift.ts
```

Keep `probity.config.ts` at the project root: Probity discovers it by searching upward from the working directory. The rule modules and scripts the template imports live inside the installed package — nothing else needs copying.

If the project will use the glossary or spec-parity rules, seed the files they read: copy `node_modules/@jjchill/probity-rules/GLOSSARY.template.md` to `docs/GLOSSARY.md`, and create `docs/specs/` for feature files. Both degrade gracefully while absent, but the Kotlin Multiplatform and Swift presets are built around them.

**3. Edit the config for this project.** The thin template calls the preset's rule factory (`jsRuleEntries`, `kotlinRuleEntries`, `kmpRuleEntries`, or `swiftRuleEntries`) with an options object — that options object, not the package internals, is what you edit. The presets describe a *typical* layout and **will not match yours as-is**. Open `probity.config.ts` and set its factory options to change, at minimum:

- **Core-purity globs.** Point them at the project's domain, use-case, and port code only. Adapters, DI modules, composition roots, and UI must *not* match, or the boundary rule blocks work those files are supposed to do.
- **TDD scope globs.** The production and test code you want red-green-refactor enforced on. This rule costs a model call per matching write, so scope it deliberately.
- **Spec-layer globs.** The acceptance specification files only, never the DSL or protocol-driver layers (those legitimately contain the mechanics the Language Test blocks).
- **Commit gate.** The `command`, `successPattern`, and `failurePattern` passed to `requireGreenTestRun` must match the project's real test command and its runner's summary lines. The JS/TS default covers vitest and jest, Kotlin defaults to Gradle, Swift to `xcodebuild`.
- **Infrastructure import screen.** Extend the known-vendor regex with the project's actual frameworks, SDKs, and I/O libraries.
- **Preset-specific paths.** Kotlin and Swift presets: `specsDir`, `testFilePattern`, module and package names. Optional `glossaryPath` and `seamHint` once a glossary and canonical ports exist.

Brownfield codebase? The deterministic rules are delta-based (only what a write *introduces* blocks; existing call sites do not), and a spec suite that predates the parity gate gets a one-time baseline so existing gaps do not block every specs/acceptance commit:

```bash
npx probity-spec-parity --specs docs/specs --baseline docs/specs/.parity-baseline --write-baseline
```

See "Brownfield adoption" in [hooks/PROBITY.md](hooks/PROBITY.md#spectest-traceability-kmp-preset).

**4. Verify the scoping before the first agent session does.** Wrong globs are the main failure mode, and one direction is silent: a glob slightly too narrow never fires, and nothing notices.

```bash
npx probity-scope-report --config probity.config.ts
```

Fix every `DEAD SCOPE` (a block matching zero files) and every warning about core rules claiming adapter/DI/UI paths or the acceptance-language rule claiming driver/DSL files. Re-run until it is clean. Add `--strict` in CI so layout drift fails the build instead of silently switching a rule off.

**5. Wire the hook into the agent.** For Claude Code, install the Probity plugin:

```
/plugin marketplace add nizos/probity
/plugin install probity@probity
```

Or add it to the project's `.claude/settings.json` so every teammate and every future session inherits it:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write|Edit|NotebookEdit",
        "hooks": [
          { "type": "command", "command": "cd \"$CLAUDE_PROJECT_DIR\" && ./node_modules/.bin/probity-claude" }
        ]
      }
    ]
  }
}
```

`probity-claude` (from `@jjchill/probity-rules`) wraps Probity so work done inside Claude Code sub-agents is judged against the sub-agent's own transcript; the bare `probity` bin, which the plugin runs, only sees the parent session's. See [hooks/PROBITY.md](hooks/PROBITY.md).

Keep the `cd "$CLAUDE_PROJECT_DIR" &&` anchor. Hooks are not guaranteed to run from the repo root; a bare relative path then fails **non-blocking** and every rule silently stops enforcing. Codex and Copilot CLI wiring is in [Probity's setup guide](https://github.com/nizos/probity/blob/main/docs/setup.md) (`--agent codex` / `--agent github-copilot`); Kiro is in [docs/kiro-setup.md](docs/kiro-setup.md).

AI-validated rules reuse the agent's own authentication through the vendor SDK. No extra API key or billing is needed.

**6. Prove a gate fires.** Start a fresh agent session in the project and ask it to add a small production function under a core path with no test. The write must be blocked with a Probity message naming the TDD rule. Then ask it to `git commit` without running the tests; the commit must be blocked by the green-run gate. If either action goes through, the hook is not wired or the globs do not claim that path. Go back to step 4.

**7. Commit the setup.** `package.json`, the lockfile, `probity.config.ts`, the hook settings, and any glossary or baseline files belong in the target repo. Enforcement that lives on one machine is not enforcement.

**Updating.** Once this is set up, keep it current with `/probity-update` instead of re-running these steps by hand. It upgrades the `@jjchill/probity-rules` package, proposes config migrations for anything the new version wires that your `probity.config.ts` doesn't yet, refreshes the Kiro shim files if the project uses Kiro, and re-verifies scoping.

### Install checklist

An install of this pack is complete when all of the following are true in the target project. Agents performing the install: report each item explicitly, and do not describe Probity as optional.

- [ ] Skills installed for the agent in use (Part 1)
- [ ] `@nizos/probity` installed as a dev dependency in the target project
- [ ] `@jjchill/probity-rules` installed and `probity.config.ts` created from the matching preset template
- [ ] Every glob, the commit-gate test command, and the vendor import screen edited to this project's real layout
- [ ] `npx probity-scope-report` runs clean (no dead scopes, no mis-claimed layers)
- [ ] PreToolUse hook wired for the agent (plugin or settings file), anchored to the project directory
- [ ] A deliberate violation was blocked in a live session (step 6)
- [ ] Config, package.json, lockfile, and hook settings committed to the repo
- [ ] If the agent in use is one Probity cannot hook (Cursor, Gemini CLI, Windsurf, ...), that limitation is written into the project's agent instructions

---

## Adoption

Skills and Probity both installed? How you roll the pack out depends on your codebase. The **[Adoption Guide](docs/adoption-guide.md)** covers two paths: the full lifecycle from day one for a greenfield project, or an incremental, verification-first rollout for an established codebase.

---

## All 32 Skills

The commands above are entry points. The pack includes 32 skills total — 31 lifecycle skills plus the `using-agent-skills` meta-skill. Each skill is a structured workflow with steps, verification gates, and anti-rationalization tables. You can also reference any skill directly.

### Meta - Discover which skill applies

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [using-agent-skills](skills/using-agent-skills/SKILL.md) | Maps incoming work to the right skill workflow and defines shared operating rules | Starting a session or deciding which skill applies |

### Define - Clarify what to build

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [interview-me](skills/interview-me/SKILL.md) | One-question-at-a-time interview that extracts what the user actually wants instead of what they think they should want, until ~95% confidence | The ask is underspecified, or the user invokes "interview me" / "grill me" |
| [idea-refine](skills/idea-refine/SKILL.md) | Structured divergent/convergent thinking to turn vague ideas into concrete proposals | You have a rough concept that needs exploration |
| [event-storming](skills/event-storming/SKILL.md) | Map the domain as past-tense events on a timeline, then commands, actors, aggregates, bounded contexts — agent facilitates, human is the domain expert | Starting a new project or unfamiliar domain, or seeding the glossary |
| [user-stories](skills/user-stories/SKILL.md) | Translate wishes into small INVEST stories — user-visible outcomes in the user's words, zero solution content | Capturing requirements, or fixing technical/oversized/vague stories |
| [story-mapping](skills/story-mapping/SKILL.md) | Narrative backbone + activities + story cards instead of epics — spot gaps, slice releases thin across the whole journey | Organizing many stories, planning releases, or trading scope |
| [specification-by-example](skills/specification-by-example/SKILL.md) | Derive acceptance criteria as concrete positive/negative examples, expert-ruled and refined to the representative minimum | A story needs acceptance criteria before `acceptance-testing` automates them |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | Write a PRD covering objectives, commands, structure, code style, testing, and boundaries before any code | Starting a new project, feature, or significant change |
| [ubiquitous-language](skills/ubiquitous-language/SKILL.md) | One shared domain vocabulary backed by a maintained repository glossary — one term per concept, glossary terms verbatim in code/specs/ports, synonyms corrected everywhere | Naming any domain concept, creating or updating the glossary, or resolving synonym/ambiguity drift |

### Plan - Break it down

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | Decompose specs into small, verifiable tasks with acceptance criteria and dependency ordering | You have a spec and need implementable units |

### Build - Write the code

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | Thin vertical slices - implement, test, verify, commit. Feature flags, safe defaults, rollback-friendly changes | Any change touching more than one file |
| [test-driven-development](skills/test-driven-development/SKILL.md) | Red-Green-Refactor, test pyramid (80/15/5), test sizes, DAMP over DRY, Beyonce Rule, browser testing | Implementing logic, fixing bugs, or changing behavior |
| [context-engineering](skills/context-engineering/SKILL.md) | Feed agents the right information at the right time - rules files, context packing, MCP integrations | Starting a session, switching tasks, or when output quality drops |
| [source-driven-development](skills/source-driven-development/SKILL.md) | Ground every framework decision in official documentation - verify, cite sources, flag what's unverified | You want authoritative, source-cited code for any framework or library |
| [doubt-driven-development](skills/doubt-driven-development/SKILL.md) | Adversarial fresh-context review of every non-trivial decision in-flight - CLAIM → EXTRACT → DOUBT → RECONCILE → STOP, with optional user-authorized cross-model escalation | Stakes are high (production, security, irreversible), working in unfamiliar code, or a confident output is cheaper to verify now than to debug later |
| [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) | Component architecture, design systems, state management, responsive design, WCAG 2.1 AA accessibility | Building or modifying user-facing interfaces |
| [ios-development](skills/ios-development/SKILL.md) | Repository-driven Xcode builds, simulator deployment, XCTest/XCUITest design, and evidence-based Apple-platform diagnostics | Building, launching, testing, or troubleshooting a native iOS app |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | Contract-first design, Hyrum's Law, One-Version Rule, error semantics, boundary validation | Designing APIs, module boundaries, or public interfaces |
| [ports-and-adapters](skills/ports-and-adapters/SKILL.md) | Hexagonal architecture, strictly enforced — every unowned or separately-deployed dependency (incl. UI, frameworks, OS clock/fs/env) behind a port, thin translation-only adapters, fakes swapped only at ports | Adding any external dependency, structuring a service, or reviewing boundary/test-seam violations |

### Verify - Prove it works

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [acceptance-testing](skills/acceptance-testing/SKILL.md) | Executable specifications as the definition of done — domain-language Given-When-Then, four-layer test infrastructure (spec → DSL → protocol drivers → SUT), functional/temporal isolation, deployable-unit scope | Starting a story, writing/reviewing acceptance or BDD tests, or defining the pipeline's acceptance stage |
| [browser-testing-with-devtools](skills/browser-testing-with-devtools/SKILL.md) | Chrome DevTools MCP for live runtime data - DOM inspection, console logs, network traces, performance profiling | Building or debugging anything that runs in a browser |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | Five-step triage: reproduce, localize, reduce, fix, guard. Stop-the-line rule, safe fallbacks | Tests fail, builds break, or behavior is unexpected |

### Review - Quality gates before merge

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | Five-axis review, change sizing (~100 lines), severity labels (Nit/Optional/FYI), review speed norms, splitting strategies | Before merging any change |
| [code-simplification](skills/code-simplification/SKILL.md) | Chesterton's Fence, Rule of 500, reduce complexity while preserving exact behavior | Code works but is harder to read or maintain than it should be |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | OWASP Top 10 prevention, auth patterns, secrets management, dependency auditing, three-tier boundary system | Handling user input, auth, data storage, or external integrations |
| [performance-optimization](skills/performance-optimization/SKILL.md) | Measure-first approach - Core Web Vitals targets, profiling workflows, bundle analysis, anti-pattern detection | Performance requirements exist or you suspect regressions |

### Ship - Deploy with confidence

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | Trunk-based development, atomic commits, change sizing (~100 lines), the commit-as-save-point pattern | Making any code change (always) |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | Shift Left, Faster is Safer, feature flags, quality gate pipelines, failure feedback loops | Setting up or modifying build and deploy pipelines |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | Code-as-liability mindset, compulsory vs advisory deprecation, migration patterns, zombie code removal | Removing old systems, migrating users, or sunsetting features |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | Architecture Decision Records, API docs, inline documentation standards - document the *why* | Making architectural decisions, changing APIs, or shipping features |
| [observability-and-instrumentation](skills/observability-and-instrumentation/SKILL.md) | SLOs and error-budget burn-rate alerting, wide events, RED metrics, OpenTelemetry tracing, telemetry emitted through ports and asserted in tests - instrument as you build | Adding telemetry, defining SLOs, or shipping anything that runs in production |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | Pre-launch checklists, feature flag lifecycle, staged rollouts, rollback procedures, monitoring setup | Preparing to deploy to production |

---

## Agent Personas

Pre-configured specialist personas for targeted reviews:

| Agent | Role | Perspective |
|-------|------|-------------|
| [code-reviewer](agents/code-reviewer.md) | Senior Staff Engineer | Five-axis code review with "would a staff engineer approve this?" standard |
| [domain-expert-proxy](agents/domain-expert-proxy.md) | Domain Expert Stand-in | Source-cited domain rulings from recorded knowledge only; everything else becomes an open question — fills the domain seat in three-amigos and event-storming sessions |
| [product-owner-proxy](agents/product-owner-proxy.md) | Product Owner Stand-in | Source-cited value/priority/scope rulings from recorded product intent; novel trade-offs escalate — fills the product seat in event-storming and release slicing |
| [test-engineer](agents/test-engineer.md) | QA Specialist | Test strategy, coverage analysis, and the Prove-It pattern |
| [security-auditor](agents/security-auditor.md) | Security Engineer | Vulnerability detection, threat modeling, OWASP assessment |
| [web-performance-auditor](agents/web-performance-auditor.md) | Web Performance Engineer | Core Web Vitals audit with Quick/Deep modes and a metric-honesty rule; run it via `/webperf` |

See [docs/agents.md](docs/agents.md) for the decision matrix, orchestration rules, and how personas compose with skills and slash commands.

---

## Reference Checklists

Quick-reference material that skills pull in when needed:

| Reference | Covers |
|-----------|--------|
| [definition-of-done.md](references/definition-of-done.md) | Project-wide standing bar every change clears, contrasted with per-task acceptance criteria |
| [testing-patterns.md](references/testing-patterns.md) | Test structure, naming, mocking, React/API/E2E examples, anti-patterns (JavaScript/TypeScript) |
| [security-checklist.md](references/security-checklist.md) | Pre-commit checks, auth, input validation, headers, CORS, OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Core Web Vitals targets, frontend/backend checklists, measurement commands |
| [accessibility-checklist.md](references/accessibility-checklist.md) | Keyboard nav, screen readers, visual design, ARIA, testing tools |
| [observability-checklist.md](references/observability-checklist.md) | On-call questions, structured logging, RED/USE metrics, tracing, symptom-based alerting, pre-launch gate |
| [orchestration-patterns.md](references/orchestration-patterns.md) | Endorsed multi-persona orchestration patterns, anti-patterns, and the "personas don't invoke personas" rule |

---

## How Skills Work

Every skill follows a consistent anatomy:

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

**Key design choices:**

- **Process, not prose.** Skills are workflows agents follow, not reference docs they read. Each has steps, checkpoints, and exit criteria.
- **Anti-rationalization.** Every skill includes a table of common excuses agents use to skip steps (e.g., "I'll add tests later") with documented counter-arguments.
- **Verification is non-negotiable.** Every skill ends with evidence requirements - tests passing, build output, runtime data. "Seems right" is never sufficient.
- **Progressive disclosure.** The `SKILL.md` is the entry point. Supporting references load only when needed, keeping token usage minimal.

---

## Project Structure

The portable core stays in shared directories. Host-specific paths are native discovery conventions, not branding aliases; renaming or merging them would break the tools that scan those exact locations.

| Layer / consumer | Repository paths | Purpose |
|---|---|---|
| Shared workflow core | `skills/` (32 skills) | Portable `SKILL.md` workflows used by every integration |
| Shared review material | `agents/` (7 personas), `references/` (7 checklists) | Specialist reviewers and pack-level checklists carried by whole-repo installs |
| Claude Code adapter | `.claude/commands/` (9 commands), `.claude-plugin/`, `hooks/` | Slash-command wrappers, marketplace metadata, and lifecycle hooks |
| Probity enforcement | `hooks/probity/`, `hooks/PROBITY.md` | Rule presets, rules, CLI bins, and Kiro shim, published as `@jjchill/probity-rules` (Part 2 of Quick Start) |
| Gemini CLI adapter | `.gemini/commands/` (9 commands) | Gemini-native TOML command wrappers |
| Antigravity CLI adapter | `commands/` (9 commands), `plugin.json` | Legacy TOML wrappers and the root plugin manifest; see the [known wrapper limitation](docs/antigravity-setup.md#lifecycle-workflows-and-command-compatibility) |
| Codex adapter | `.codex-plugin/`, `.agents/plugins/` | Codex plugin metadata and marketplace registration; Codex consumes `skills/` directly |
| GitHub Copilot CLI adapter | `plugin.json` | Root plugin metadata; Copilot CLI discovers `skills/` by convention and does not register the lifecycle wrappers |
| Contributor tooling | `scripts/` (12 scripts), `evals/` (32 case files), `.github/workflows/` | Validation, routing evals, and CI |
| Documentation | `docs/` | Universal guidance and per-tool setup guides |

Tools without a checked-in adapter directory install or copy the shared `skills/` core into their own native location. The [Quick Start](#quick-start) links the setup guide for each supported host.

---

## Why Agent Skills?

AI coding agents default to the shortest path - which often means skipping specs, tests, security reviews, and the practices that make software reliable. Agent Skills gives agents structured workflows that enforce the same discipline senior engineers bring to production code.

Each skill encodes hard-won engineering judgment: *when* to write a spec, *what* to test, *how* to review, and *when* to ship. These aren't generic prompts - they're the kind of opinionated, process-driven workflows that separate production-quality work from prototype-quality work.

Skills bake in best practices from Google's engineering culture — including concepts from [Software Engineering at Google](https://abseil.io/resources/swe-book) and Google's [engineering practices guide](https://google.github.io/eng-practices/). You'll find Hyrum's Law in API design, the Beyonce Rule and test pyramid in testing, change sizing and review speed norms in code review, Chesterton's Fence in simplification, trunk-based development in git workflow, Shift Left and feature flags in CI/CD, and a dedicated deprecation skill treating code as a liability. These aren't abstract principles — they're embedded directly into the step-by-step workflows agents follow.

---

## How it compares

Wondering how this stacks up against [Superpowers](https://github.com/obra/superpowers) or [Matt Pocock's skills](https://github.com/mattpocock/skills)? See **[docs/comparison.md](docs/comparison.md)** for an honest, side-by-side look at how the three are shaped differently and when to reach for each — including a link to a controlled [head-to-head experiment](https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/).

---

## Contributing

Skills should be **specific** (actionable steps, not vague advice), **verifiable** (clear exit criteria with evidence requirements), **battle-tested** (based on real workflows), and **minimal** (only what's needed to guide the agent).

See [docs/skill-anatomy.md](docs/skill-anatomy.md) for the format specification, [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, and [docs/advanced-per-agent-configuration.md](docs/advanced-per-agent-configuration.md) for applying model routing, tool restrictions, and other per-agent runtime controls without breaking the portable `SKILL.md` frontmatter.

---

## Team

agent-skills is built and maintained by:

| | Name | GitHub | Role |
|---|------|--------|------|
| <img src="https://github.com/addyosmani.png?size=120" width="60" height="60" alt="Addy Osmani"> | **Addy Osmani** | [@addyosmani](https://github.com/addyosmani) | Creator |
| <img src="https://github.com/federicobartoli.png?size=120" width="60" height="60" alt="Federico Bartoli"> | **Federico Bartoli** | [@federicobartoli](https://github.com/federicobartoli) | Collaborator |
| <img src="https://github.com/nucliweb.png?size=120" width="60" height="60" alt="Joan León"> | **Joan León** | [@nucliweb](https://github.com/nucliweb) | Collaborator |

---

## License

MIT - use these skills in your projects, teams, and tools.
