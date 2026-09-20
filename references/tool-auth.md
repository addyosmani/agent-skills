# Tool Authentication for Linear and GitHub

Every persona reaches Linear and GitHub through an MCP server or a CLI. Credentials are never in the repository: they are environment variables on the machine running the agent. The `linear` and `github` skills each carry the server entry in an `mcp.json`; copy it into your tool's config with that tool's own variable syntax. Tools that only have a global config get the snippet below.

## Servers and credentials

| Server | URL | Auth |
|---|---|---|
| Linear | `https://mcp.linear.app/mcp` | OAuth on first use (browser prompt); no variable needed. Headless fallback: `LINEAR_API_KEY` against the GraphQL API |
| GitHub | `https://api.githubcopilot.com/mcp/` | `Authorization: Bearer $GITHUB_PAT`; fine-grained token with `contents`, `pull_requests`, `metadata`, `actions:read` (add `issues` if used) |

Set once per machine, for example in the shell profile:

```bash
export GITHUB_PAT=github_pat_...
export LINEAR_API_KEY=lin_api_...   # only for CLI/API fallbacks
```

## Per tool

| Tool | Repo-level file | Variable syntax | Notes |
|---|---|---|---|
| Claude Code | `.mcp.json` | `${GITHUB_PAT}` | Also `claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer $GITHUB_PAT"` |
| Pi (`pi-mcp-adapter`) | `.mcp.json`, read from the project | `${GITHUB_PAT}` | Linear needs `"auth": "oauth"` or the adapter does not start the OAuth flow; the build writes it, and Claude Code accepts the key |
| Cursor | `.cursor/mcp.json` | `${env:GITHUB_PAT}` | Enable the servers in Settings → MCP after opening the repo |
| Gemini CLI | `.gemini/settings.json` | `$GITHUB_PAT` | `httpUrl` form; or `gemini mcp add --transport http github <url> --header ...` |
| OpenCode | `opencode.json` | `{env:GITHUB_PAT}` | `type: remote` servers |
| GitHub Copilot (VS Code) | `.vscode/mcp.json` | `${env:GITHUB_PAT}` | VS Code may prompt to trust the servers |
| Codex | none (global) | `${GITHUB_PAT}` in `~/.codex/config.toml` | see snippet below |
| Kimi and other MCP clients | tool-specific global config | tool-specific | same URL and header; see snippet below |

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.linear]
url = "https://mcp.linear.app/mcp"

[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
http_headers = { Authorization = "Bearer ${GITHUB_PAT}" }
```

### Kimi and any other MCP-capable client

Register two remote HTTP servers with the same values; the config file and its variable syntax are the client's. If the client cannot expand variables, use its secret store or the CLI fallbacks below rather than pasting a token into a file.

```json
{
  "linear": { "url": "https://mcp.linear.app/mcp" },
  "github": { "url": "https://api.githubcopilot.com/mcp/", "headers": { "Authorization": "Bearer <token from secret store>" } }
}
```

## CLI and API fallbacks (any tool with a shell)

- GitHub: `gh auth login` once, then `gh pr create|view|review|checks|merge`, `gh release create`. The `github` skill maps every operation to `gh`.
- Linear: no official CLI. Use the GraphQL API with `LINEAR_API_KEY`:

```bash
curl -s https://api.linear.app/graphql -H "Authorization: $LINEAR_API_KEY" -H "Content-Type: application/json" \
  -d '{"query":"{ viewer { id name } }"}'
```

The `linear` skill's concept mapping applies unchanged; only the transport differs.

## Rules

- Never commit a token, paste one into a config file, or echo one into a log or ticket.
- Verify with a read-only call (list teams, list open PRs) before any write.
- A tool that cannot authenticate is a blocker: escalate with blocker type `missing access`; do not fabricate tracker or PR state.
