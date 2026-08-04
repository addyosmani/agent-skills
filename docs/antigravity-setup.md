# Using agent-skills with Antigravity CLI (agy)

The `agent-skills` package can be installed as a native plugin in the Antigravity CLI (`agy`), giving the agent access to structured workflows, personas, and custom slash commands.

## Setup

### Option 1: Native Plugin Installation (Recommended)

Antigravity CLI has a first-class plugin system that registers skills, agents, and custom commands.

**Install from the remote repository:**

```bash
agy plugin install https://github.com/addyosmani/agent-skills.git
```

**Install from a local clone:**

1. Clone the repository:
   ```bash
   git clone https://github.com/addyosmani/agent-skills.git
   ```
2. Install the plugin using `agy`:
   ```bash
   agy plugin install /path/to/agent-skills
   ```

This will validate the plugin and install it into your global Antigravity configuration directory (`~/.gemini/antigravity-cli/plugins/agent-skills/`).

### Option 2: Import from Gemini CLI

If you have already installed `agent-skills` under your legacy Gemini CLI installation, you can import it directly:
```bash
agy plugin import gemini
```

Once installed, verify the active plugin:
```bash
agy plugin list
```

---

## Slash Commands

The plugin registers 8 custom slash commands: 7 lifecycle commands plus the `/webperf` specialist audit:

| Command | What it does | Activated Skill |
|---------|--------------|-----------------|
| `/spec` | Write a structured spec before writing code | `spec-driven-development` |
| `/planning` | Break work into small, verifiable tasks | `planning-and-task-breakdown` |
| `/build` | Implement the next task incrementally | `incremental-implementation` |
| `/test` | Run TDD workflow — red, green, refactor | `test-driven-development` |
| `/review` | Five-axis code review | `code-review-and-quality` |
| `/code-simplify` | Reduce complexity without changing behavior | `code-simplification` |
| `/ship` | Pre-launch checklist via parallel persona fan-out | `shipping-and-launch` |
| `/webperf` | Audit browser-facing apps for Core Web Vitals and performance issues | `web-performance-auditor` |

Each command automatically invokes the corresponding skill and guides the agent step-by-step.

> **Note:** Use `/planning` instead of `/plan` to avoid conflicts with Antigravity's internal plan-generation command.

---

## Skills & Discovery

Antigravity automatically discovers skills inside the plugin's `skills/` directory. 
* Antigravity matches user tasks and intents to relevant skills on-demand.
* If a task matches a skill, the agent will load the skill and prompt you for permission before executing.

---

## Verification & Validation

To validate that your local plugin is correctly structured and contains all skills, run:
```bash
agy plugin validate /path/to/agent-skills
```

---

## How It Works

### 1. On-Demand Skill Activation
Antigravity CLI automatically discovers the `SKILL.md` files located in the `skills/` directory of the installed plugin. Using the trigger descriptions in each skill's frontmatter, the agent will dynamically activate the appropriate workflow when it detects matching developer intent.

For example, when you ask the agent to:
- **Design a new system** &rarr; It will suggest/activate `spec-driven-development`.
- **Implement a feature** &rarr; It will activate `incremental-implementation` and `test-driven-development`.
- **Fix a bug** &rarr; It will activate `debugging-and-error-recovery`.

### 2. Specialized Agent Personas
The plugin registers reusable subagent definitions from the `agents/` directory:
- `code-reviewer.md`
- `security-auditor.md`
- `test-engineer.md`

You can invoke these personas directly within your session or when delegating tasks using subagents.

---

## Configuration & Customization

### Project-Specific Enforcements (`AGENTS.md`)
To enforce strict skill compliance (e.g. requiring a spec or plan before writing code), copy or link `AGENTS.md` into the root of your workspace. Antigravity CLI reads this file to align the agent's behavior and planning phase with your team's conventions.

### Sandbox Mode
If you want to run skills or scripts with limited terminal permissions (for safety when running third-party validation tests), launch the CLI with:

```bash
agy --sandbox
```

---

## Usage Tips

1. **Keep plugins up-to-date:** You can update the CLI or check for newer plugin versions using:
   ```bash
   agy update
   ```
2. **Review before execution:** When agents execute complex refactoring tasks using these skills, use `Ctrl+r` to enter the **Artifact Review** screen to review, edit, or approve code before it is committed.
3. **Control permissions:** You can use the `--dangerously-skip-permissions` flag only in trusted local projects where you want to bypass manual tool approval prompts.
