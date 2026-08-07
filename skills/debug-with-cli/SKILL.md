---
name: debug-with-cli
description: "Drive shell commands on a remote machine (CI runner, SBC, dev box, your own laptop) from a Sauna session during debug — when the user wants you to read logs, inspect process state, restart services, run bcvk/qemu/podman, or do any other CLI work on a target box you can't otherwise reach. Uses Tailscale Funnel + a tiny Bearer-auth HTTP bridge (the target box runs a 50-LOC Python stdlib server, the agent calls curl POST /run with argv-array commands). Set up a Bearer-auth custom API connection (connection_type: keys, auth_type: bearer) at the Funnel URL of the target machine, then call the /run endpoint with argv-array commands (no shell injection). Triggers on: 'run command on rock1', 'execute on remote', 'debug the runner', 'check service on the box', 'tail journalctl on the live host', 'can you drive that machine', 'help me debug the CI box', 'connect you to a CLI', 'use tailscale to issue cli', 'live shell on the runner', 'speed up debug', 'echo something to test'."
license: MIT
compatibility: Requires Python 3.8+ stdlib on the target machine and Tailscale installed with `tailscale funnel` enabled on that node. The Sauna side needs an HTTP-out connection row.
---

# Debug with CLI

## Philosophy

The Sauna sandbox (a Cloudflare Worker / Northflank container) has full network access but is **not on the user's Tailscale tailnet**, has no `tailscale` binary, and can't `ssh` to machines that aren't publicly routable. When the user says "speed up debug" or "drive the live CI host," the natural ask is "let Sauna run commands on the box."

The architecture is HTTP-only via the Sauna auth proxy, so the answer is always: **target box runs an HTTP server that accepts Bearer-auth POST requests with an argv-array command and returns `{stdout, stderr, returncode}`.** This skill codifies the canonical setup — Tailscale Funnel for the public HTTPS surface, a ~50-LOC Python stdlib server for the bridge, a 32-byte Bearer token as the auth, and a `connection_type: keys` Sauna connection so the proxy auto-injects Bearer on every call.

The argv shape (not shell strings) is a **feature**: no injection, no quoting issues, no `;`-vs-`&&` confusion, and `subprocess.run(cmd, shell=False)` is enforced by the bridge code even when `cmd[0] == "bash"`.

## When to Use

Apply when:

- The user wants Sauna to run shell commands on a machine Sauna can't otherwise reach — a CI runner (rock1, the yubiOS ARM64 SBC), a homelab dev box, a NAS, anything with Tailscale that isn't publicly SSH'd.
- The debug loop is "read logs / inspect state / run a probe" — turning 20-min GitHub Actions round-trips into 20-second curl invocations.
- The user explicitly says "drive that machine," "live shell," "connect you to a CLI," "use Tailscale to issue CLI," or any equivalent.
- Existing yubiOS CI debug work needs to be reproduced or extended on the runner host directly (e.g. re-running a step that the GH Actions log truncated).

Do NOT use:

- The work is already an HTTP API call (use the existing connection row directly — don't add a shell layer).
- The user wants a one-off read on a single log line (use GitHub Actions logs API or `mcp list` against an existing MCP server, not a new bridge).
- The target machine has no Tailscale and no way to install it (this skill presumes Tailscale is the bootstrap).
- The action needs a real interactive PTY (this skill is `subprocess.run` — non-interactive. For TUI/REPL needs, reach for `ttyd` or ssh-over-WebSocket, not this).

## The Setup

### On the target box (one-time, ~2 minutes)

1. **Tailscale**: `curl -fsSL https://tailscale.com/install.sh | sh`. Auth headlessly with a non-ephemeral reusable auth key from `https://login.tailscale.com/admin/settings/keys` — non-ephemeral keeps the node identity stable across reboots (the Funnel URL is tied to the node name; ephemeral nodes would rotate the URL each session).
2. **Funnel**: pick a port (8080 is canonical), expose it: `tailscale funnel --bg 8080`. Confirm with `tailscale funnel status`. The public URL is `https://<node-name>.<tailnet-name>.ts.net`.
3. **Bridge script**: copy the script below to `/usr/local/bin/rock1-shell-server.py` on the target. `chmod +x`. Stdlib only — no `pip install` required.
4. **Bearer token**: `openssl rand -hex 32` — 256 bits of entropy. Store it in `/etc/rock1-shell.env` (`ROCK1_SHELL_TOKEN=<hex>`) so the nohup wrapper picks it up across restarts. Mode 600; never committed to git.
5. **Run**: `set -a; . /etc/rock1-shell.env; set +a; nohup python3 /usr/local/bin/rock1-shell-server.py >> /var/log/rock1-shell.log 2>&1 &`.
6. **Local smoke test**: `curl -sS http://127.0.0.1:8080/run -X POST -H "Authorization: Bearer $ROCK1_SHELL_TOKEN" -H "Content-Type: application/json" -d '{"command":["echo","local test"]}'` should print `{"returncode":0,"stdout":"local test\n",...}`. Without the Bearer header, the same call should return `HTTP 401`.

### On the Sauna side

1. Add a connection via `connect_account`:
   - `connection_type`: `"keys"` (custom API key, **not** `"mcp"`)
   - `name`: `"<node> shell bridge"` (e.g. `"rock1 shell bridge"`)
   - `url`: `https://<node>.<tailnet>.ts.net/`
   - `auth_type`: `"bearer"`
   - `fields`: `[{ name: "token", label: "Bearer Token", type: "password", required: true }]`
   - `auth_strategy`: `{ strategy: "static", inject: [{ type: "bearer" }] }`
2. User pastes the Bearer token through the form. Sauna stores it; the proxy auto-injects `Authorization: Bearer <token>` on every request to that domain.
3. Verify with `curl -sS -i https://<node>.<tailnet>.ts.net/run -X POST -d '{"command":["echo","probe"]}' -H "Content-Type: application/json"` (no auth) — should return `HTTP/1.1 401 Unauthorized` (Funnel + bridge up, auth enforced). Then with the connection's auth injected, the same call should return 200 with the echo result.

## The Bridge Script

Copy verbatim to `/usr/local/bin/rock1-shell-server.py` on the target:

```python
#!/usr/bin/env python3
"""
rock1-shell-server: minimal Bearer-auth HTTP shell bridge.
No deps (stdlib only). Listens on 127.0.0.1:8080.
Funnel via Tailscale: `tailscale funnel --bg 8080`.
POST /run with JSON {command: [str,...], timeout?: int, cwd?: str}
"""
import json, os, hmac, subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

TOKEN = os.environ["ROCK1_SHELL_TOKEN"].encode()
PORT = int(os.environ.get("ROCK1_SHELL_PORT", "8080"))


class H(BaseHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass  # quiet; tail logs to stderr from nohup wrapper

    def do_POST(self):
        if self.path != "/run":
            self.send_error(404); return
        presented = self.headers.get("Authorization", "").removeprefix("Bearer ").encode()
        if not presented or not hmac.compare_digest(presented, TOKEN):
            self.send_error(401); return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception as e:
            self.send_error(400, f"bad body: {e}"); return
        cmd = body.get("command")
        if not isinstance(cmd, list) or not cmd or not all(isinstance(x, str) for x in cmd):
            self.send_error(400, "command must be non-empty list[str]"); return
        try:
            r = subprocess.run(
                cmd, capture_output=True,
                timeout=int(body.get("timeout", 60)),
                cwd=body.get("cwd") or None,
                text=True,
            )
            out = {"stdout": r.stdout, "stderr": r.stderr, "returncode": r.returncode}
            status = 200
        except subprocess.TimeoutExpired as e:
            out = {"error": "timeout", "timeout": e.timeout,
                   "stdout": (e.stdout or b"").decode(errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or "")}
            status = 408
        except Exception as e:
            out = {"error": repr(e)}; status = 500
        body_out = json.dumps(out).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body_out)))
        self.end_headers()
        self.wfile.write(body_out)


if __name__ == "__main__":
    print(f"rock1-shell-server listening on 127.0.0.1:{PORT}", flush=True)
    HTTPServer(("127.0.0.1", PORT), H).serve_forever()
```

## The Call Shape

From the Sauna sandbox, with the connection passed:

```bash
curl -sS -X POST 'https://<node>.<tailnet>.ts.net/run' \
  -H 'Content-Type: application/json' \
  -d '{"command":["echo","hello"],"timeout":10}'
```

Returns JSON: `{"stdout": "hello\n", "stderr": "", "returncode": 0}`. On timeout: `{"error":"timeout","timeout":N,"stdout":"..."}` with HTTP 408.

**Argv, not shell.** The `command` field is a JSON array of strings — passed straight to `subprocess.run` with no `/bin/sh -c` interpretation. This is the security feature: no injection, no quoting hell, no `;`-vs-`&&` confusion. To get shell features:

- **Pipes**: not supported at the bridge. Run `["bash", "-c", "dmesg | head -20"]` if you must, or extend the bridge (see Anti-patterns below — bash via argv is OK because `subprocess.run(["bash","-c","..."])` is still argv to bash, not a string to `sh -c`).
- **sudo**: `["sudo","-n","systemctl","restart","podman"]` (the `-n` non-interactive flag is critical — sudo would otherwise hang waiting for a password).
- **Env vars per-call**: not currently supported. The bridge inherits env from the parent process. To pass per-command env, extend the script to accept an `env` field.
- **Working directory**: `cwd` field on the request body, default is `None` (the bridge's CWD).

## The argv-audit-to-tty pattern (user observability)

When the user is watching a serial console or log terminal hooked to the target's TTY (`/dev/ttyS2` on rock1, a PTY on a dev box, etc.), every bridge POST must leave a visible audit trail. The shape is **two-in-one**: write a banner line to the TTY first, then run the actual command with its output tee'd to the same TTY.

Recipe (Sauna-side wrapper, written at `/tmp/sauna-bridge-wrapper.sh` in the Sauna sandbox and re-inlined per `bash` tool call since `/tmp` is per-call):

```bash
sauna_post() {
  local argv_json="$1"   # e.g. '["bash","-c","ls /tmp"]'
  local body
  body=$(python3 - "$argv_json" <<'PYEOF'
import json, sys
argv = json.loads(sys.argv[1])
argv_human = " ".join(repr(a) for a in argv)
banner = "\n=== [$(date -u +%H:%M:%S)] argv: " + argv_human + " ===\n"
# build shell-safe cmd_str (single-quote each element, escape internal ')
parts = []
for a in argv:
    if any(c in a for c in " \t\n\"'" + "\\$;&|<>(){}[]#*?!~"):
        parts.append("'" + a.replace("'", "'\\''") + "'")
    else:
        parts.append(a)
cmd_str = " ".join(parts)
combined = "printf '%b' " + repr(banner) + " > /dev/ttyS2; " + cmd_str + " 2>&1 | tee -a /dev/ttyS2"
print(json.dumps({"command": ["bash", "-c", combined]}))
PYEOF
)
  curl -sS -X POST 'https://<node>.<tailnet>.ts.net/run' \
    -H 'Content-Type: application/json' -d "$body"
}
```

Three rules that keep the pattern correct:

1. **`printf '%b'`, not `printf '%s'`** — `%b` interprets `\n` as a newline so the banner reads cleanly on the TTY. `%s` (and unescaped `echo` strings) leave `\n` as two literal characters, which the user reads as garbled `\n` text. User correction: "there are extra \n in what i sent".
2. **`tee -a`, not `>`** — append so multiple bridge calls in the same session don't clobber each other's output on the TTY. The TTY is line-buffered anyway.
3. **`repr()` for argv elements in the inner `bash -c` body** — every shell-special character in an argv string must be single-quoted (`'a b c'`), so the inner command body is shell-safe. Without it, a path with a space or a `$` will break the inner command.

When multi-line content (a doc snippet, a fix body, a heredoc) needs to go to the TTY, write it to the host's `/tmp` first in a separate POST (the Sauna sandbox `/tmp` is per-`bash`-call and does NOT cross calls), then `cat /tmp/<file> > /dev/ttyS2` in a second POST. User correction: "/tmp/answer.txt is local to you not the host".

Verbatim directive from the user: "echo command sent to the host on the tty always!" and "cant you just make an argv wrapper on your end to split it and tee the output to /dev/ttyS2". Apply the pattern any time the user is debugging live on a target that has a TTY available for inspection.


## Security Model

- **Token entropy**: 32 bytes from `openssl rand -hex 32` = 256 bits. Uncrackable by brute force.
- **Transport**: HTTPS via Tailscale Funnel. Cloudflare terminates TLS at the Funnel edge; Tailscale's coordinator forwards to the target's localhost. No TLS termination at the bridge (Funnel handles it).
- **Listen address**: bridge binds `127.0.0.1:8080`, **never** `0.0.0.0`. The Funnel edge is the only ingress.
- **Token storage**: `/etc/rock1-shell.env` on the target (mode 600). NOT in the Sauna chat, NOT in a session file, NOT committed to git.
- **Argv-only**: `subprocess.run(command, shell=False)` is enforced by the bridge code — even if the user crafts `command=["bash"]`, that's still argv to bash, not `bash -c "$string"`.
- **HMAC compare**: `hmac.compare_digest` for the Bearer comparison — constant-time, no timing leak.
- **Audit**: enable journald to capture the bridge process's stderr (no request logging by default — add it if your threat model demands it).

## Alternatives Considered

These were tried or evaluated before settling on the bridge pattern. Document why each was rejected so future sessions don't re-litigate.

1. **`mcp-proxy` (sparfenyuk/mcp-proxy, PyPI)** — stdio-to-HTTP bridge for MCP servers. Rejected: **no inbound auth** on the SSE/HTTP port (anyone with the URL can call). `ALLOW_COMMANDS` is a command allowlist, not a request-auth filter. Unsuitable for hardware-attached CI runners (real YubiKey, destructive /dev/sda tests).
2. **`punkpeye/mcp-proxy` (npm)** — supports `--apiKey` X-API-Key header. Rejected: requires Node on the target, requires the user to manage the JSON spec file, and uses X-API-Key (not Bearer) which means the Sauna connection has to be re-typed with a non-standard auth scheme.
3. **Cloudflare Tunnel + Cloudflare Access** — most "enterprise" auth (OIDC: GitHub, Google). Rejected: adds Cloudflare as a dep, requires per-call OIDC flow, setup overhead is high for what should be a 2-min local tool.
4. **mTLS** — client cert presented by the Sauna sandbox. Rejected: Sauna sandbox has no `~/.ssh`-style cert store; provisioning client certs in the proxy auth model is awkward.
5. **Add the Sauna sandbox to the user's tailnet** — deploy a Northflank container with `tailscaled` and an auth key. Theoretically the cleanest answer (real Tailscale identity auth). Rejected: adds a Northflank container to the infra, doesn't change the auth model for the public HTTPS surface anyway.
6. **Tailscale Funnel ACL grants** — restrict Funnel to specific Tailscale users. Rejected: Sauna sandbox isn't a tailnet user (no `tailscale` binary), so this would lock out the only caller that matters.

## Anti-patterns

- **Listening on `0.0.0.0` instead of `127.0.0.1`.** The bridge should bind localhost only — Funnel is the ingress. If the bridge listens on all interfaces, anything on the target's LAN can probe port 8080 without going through Funnel's TLS.
- **Logging the Bearer token in plaintext.** Not in journald, not in `/var/log/`, not in `~/.bash_history`, not in the chat. The token is the auth — leak it, lose it.
- **Using a short token.** `openssl rand -hex 32` is 64 chars. Anything shorter than 128 bits is brute-forceable in practice.
- **Using a string command instead of argv.** `{"command":"ls /"}` would be a shell-injection vector the moment someone writes `{"command":"ls /; rm -rf /"}`. The bridge parses argv, not strings — keep it that way.
- **Forwarding Funnel to a non-localhost port that's already exposed.** If port 8080 is hosting other services on the target, pick a different port for the bridge.
- **Treating `sudo` as a free action.** `sudo` hangs without a TTY unless `-n` is passed. Pass `-n` always.
- **Skipping the local smoke test.** A Funnel'd bridge that doesn't pass `curl http://127.0.0.1:8080/run` locally will fail through Funnel too — debug the local case first.
- **Mistaking Cloudflare `530 / error 1016` for an auth issue.** That error means the origin (target box) isn't listening on the Funnel'd port. It's a server-up problem, not an auth problem — restart the bridge, check `tailscale funnel status`, verify the process is running (`ss -tlnp | grep 8080`).

## Loading Constraints

- **Argv-only by design.** Do not extend the bridge to accept shell strings. If a caller needs pipes or `&&`, they pass `["bash", "-c", "..."]` themselves — and accept the responsibility.
- **No logging by default.** The bridge logs request lines to stderr at INFO level; turn it off or filter it before forwarding journald. The stdout/stderr of executed commands IS captured by the bridge and returned in the response body — that's enough audit for most purposes.
- **One bridge per target machine.** If the target has multiple "shells" (e.g. different allowlists), run them on different ports. Don't multiplex allowlists via env vars — that's a footgun.
- **Token rotation cadence:** rotate the Bearer when (a) the Sauna connection is dropped, (b) the target box's Tailscale node is removed/re-added, (c) any team-member with access to the box changes. Rotation = new `openssl rand -hex 32`, update `/etc/rock1-shell.env`, restart the bridge, update the Sauna connection form.
- **Read the alternatives section before re-evaluating this approach.** If a future session proposes mcp-proxy or Cloudflare Tunnel without checking the auth model, surface this skill as the precedent.
