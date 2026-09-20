# pi Setup

[pi](https://github.com/badlogic/pi-mono) reads `AGENTS.md` from the project root, skills from `.pi/skills/` (or `~/.pi/agent/skills/`), and prompt templates from `.pi/prompts/` (or `~/.pi/agent/prompts/`). A prompt template is a Markdown file whose name is the slash command; `$@` is replaced by the arguments.

## Install into a project

```bash
node scripts/build-brain.js                       # in this repository
cp build/AGENTS.md build/SOUL.md /path/to/project/
cp -r build/references build/templates /path/to/project/
mkdir -p /path/to/project/.pi
cp -r build/skills /path/to/project/.pi/skills
cp -r build/agents /path/to/project/.pi/agents    # personas, read by /brain
cp -r build/.pi/prompts /path/to/project/.pi/prompts
```

Then in the project:

```
/brain backend-engineer fix the login timeout
/brain-status
```

## MCP

pi's MCP adapter reads the project `.mcp.json`; Linear needs `"auth": "oauth"` there. See [references/tool-auth.md](../references/tool-auth.md).
