# Using agent-skills with Antigravity CLI (agy)

The `agent-skills` package can be installed as a native plugin in the Antigravity CLI (`agy`), giving the agent access to structured workflows and personas.

## Setup

### Option 1: Native Plugin Installation (Recommended)

Antigravity CLI has a first-class [plugin system](https://www.agy.dev/docs/plugins/) that registers skills and agents. The repository also carries legacy command TOMLs, but affected `agy` releases do not expose their converted wrappers; see [Lifecycle Workflows and Command Compatibility](#lifecycle-workflows-and-command-compatibility).

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

This will validate the plugin and install it into your global Antigravity configuration directory (`~/.gemini/config/plugins/agent-skills/`).

> **Note:** on current agy releases the plugin lands under `~/.gemini/config/plugins/`, not the legacy `~/.gemini/antigravity-cli/plugins/` path used by older versions. If you don't see the plugin at the legacy path, check `~/.gemini/config/plugins/agent-skills/` first.

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

## Lifecycle Workflows and Command Compatibility

Antigravity's [migration tooling](https://www.agy.dev/docs/cli/gcli-migration/) reports the 8 legacy definitions in `commands/*.toml` as "converted to skills." In affected `agy` 1.1.x releases, validation succeeds but the converted wrappers do not appear in the slash-command or skill catalog. A successful `agy plugin validate` therefore confirms the files are well formed, not that `/build` and the other short wrappers are available. This is tracked in [agent-skills #445](https://github.com/addyosmani/agent-skills/issues/445) and upstream in [antigravity-cli #788](https://github.com/google-antigravity/antigravity-cli/issues/788).

Use the native plugin skills directly while that importer limitation applies:

| Intended wrapper | Direct Antigravity invocation | Notes |
|------------------|-------------------------------|-------|
| `/spec` | `/agent-skills:spec-driven-development` | Writes a structured spec before code |
| `/planning` | `/agent-skills:planning-and-task-breakdown` | Antigravity's built-in `/planning` command is a separate plan-mode control |
| `/build` | `/agent-skills:incremental-implementation` | Also invoke `/agent-skills:test-driven-development`; wrapper-only `/build auto` orchestration is unavailable |
| `/test` | `/agent-skills:test-driven-development` | Runs the red-green-refactor workflow |
| `/review` | `/agent-skills:code-review-and-quality` | Runs the five-axis review workflow |
| `/code-simplify` | `/agent-skills:code-simplification` | Simplifies without changing behavior |
| `/ship` | `/agent-skills:shipping-and-launch` | The wrapper's automatic persona fan-out is unavailable; invoke specialist agents separately |
| `/webperf` | Select `web-performance-auditor` from `/agents` | This workflow is a persona, not a skill |

Do not add YAML frontmatter to the TOML files as a workaround. Gemini CLI reads the parallel TOML command format with a strict parser, and `---` frontmatter makes those files invalid TOML without changing Antigravity's conversion behavior.

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

Then start a fresh session and type `/agent-skills:` to inspect the namespaced skill catalog. If the validator reports that commands were converted but `/build` returns `No matches`, use the direct invocations above; reinstalling or adding a TOML `name` field does not resolve the known importer limitation.

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
