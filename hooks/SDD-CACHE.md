# sdd-cache hook

Cross-session citation cache for [`source-driven-development`](../skills/source-driven-development/SKILL.md). Skips redundant `WebFetch` calls without weakening the skill's "verify against current docs" guarantee.

## Why

`source-driven-development` fetches official docs for every framework-specific decision. Working on the same project across sessions means fetching the same pages over and over. Caching the content as local memory would contradict the skill — docs change, and a stale cache hides that.

This hook caches fetched content on disk, but **revalidates with the origin server on every reuse** via HTTP `If-None-Match` / `If-Modified-Since`. Content is only served from cache when the server responds `304 Not Modified`, which is a fresh verification — not a memory read.

## Setup

1. Add hooks to `.claude/settings.json` (or `.claude/settings.local.json` for personal use):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/hooks/sdd-cache-pre.sh\"",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/hooks/sdd-cache-post.sh\"",
            "async": true,
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

   `${CLAUDE_PROJECT_DIR}` resolves to the directory you launched Claude Code from. The snippet above works when the hooks live inside the same project. If you installed `agent-skills` elsewhere (e.g. as a shared plugin under `~/agent-skills`), replace `${CLAUDE_PROJECT_DIR}/hooks/...` with the absolute path to each script.

2. Make sure `.claude/sdd-cache/` is in your `.gitignore` (already included in this repo).

3. Use `/source-driven-development` (or the skill) as usual. No changes to the skill or the agent's workflow — the cache is transparent.

## Mental model

HTTP resource cache keyed by URL. Freshness is delegated to the origin via `ETag` / `Last-Modified`; no TTL, no prompt in the key.

The stored body is not raw HTML — `WebFetch` post-processes each response through a model using the caller's prompt, so what we cache is one agent's reading of the page. The key stays URL-only so reads reuse across sessions; the original prompt is kept as metadata and surfaced in the hit message so the next agent can tell whether the earlier reading fits.

## How it works

One cache entry per URL, stored as JSON in `.claude/sdd-cache/<sha>.json`:

| Event | Action |
|---|---|
| `PreToolUse WebFetch` | If an entry exists, sends a `HEAD` request with `If-None-Match` / `If-Modified-Since`. On `304`, blocks the fetch and returns the cached content to the agent via stderr, with the original prompt surfaced as metadata. Otherwise allows the fetch. |
| `PostToolUse WebFetch` | Captures the response, issues a `HEAD` request to record the current `ETag` / `Last-Modified`, and stores `{url, prompt, etag, last_modified, content, fetched_at}`. |

**Freshness rules:**

- Entry is served only if the origin confirms `304 Not Modified`.
- Entries without an `ETag` or `Last-Modified` header are never cached — without a validator, the hook cannot verify freshness later, and caching would mean trusting memory.
- Cache key is `sha256(url)`. The same URL asked with a different prompt hits the same entry; the cached body reflects the prompt used on the first fetch, and that prompt is shown alongside the hit so the agent can decide whether to re-use or re-fetch manually.

**What the agent sees:**

- Cache hit: `WebFetch` is blocked via exit code 2. Claude Code delivers the hook's stderr payload back to the agent as a tool error — this is the intended signal for a cache hit, not a failure. The payload is prefixed with `[sdd-cache] Cache hit for <url>` and wraps the cached body between `----- BEGIN CACHED CONTENT -----` / `----- END CACHED CONTENT -----` markers so the agent can use it as if `WebFetch` had just returned it.
- Cache miss or stale: `WebFetch` runs normally; the result is stored for next time.

The skill itself is unchanged. It continues to follow `DETECT → FETCH → IMPLEMENT → CITE`. The hook only changes what happens under the hood when `FETCH` runs.

## Local testing

### 1. Smoke test the scripts directly

```bash
# Simulate a PostToolUse payload: cache a page
echo '{
  "tool_input": {
    "url": "https://react.dev/reference/react/useActionState",
    "prompt": "extract the signature"
  },
  "tool_response": "useActionState(action, initialState) returns [state, formAction, isPending]"
}' | bash hooks/sdd-cache-post.sh

# Inspect the stored entry
ls .claude/sdd-cache/
cat .claude/sdd-cache/*.json | jq .

# Simulate the next PreToolUse on the same URL + prompt
echo '{
  "tool_input": {
    "url": "https://react.dev/reference/react/useActionState",
    "prompt": "extract the signature"
  }
}' | bash hooks/sdd-cache-pre.sh
echo "exit=$?"
```

Expected:

- First command creates one file under `.claude/sdd-cache/` (only if the server returned an `ETag` or `Last-Modified`).
- Second command exits `2` with the cached content on stderr when the origin replies `304`, or exits `0` silently otherwise.

### 2. End-to-end in a real session

1. Register the hooks in `.claude/settings.local.json` as shown above.
2. Start a Claude Code session in this repo.
3. Ask the agent to fetch a documentation page (e.g. "fetch `https://react.dev/reference/react/useActionState` and summarize").
4. Verify a file appears under `.claude/sdd-cache/`.
5. Ask the agent to fetch the same page with the same prompt again.
6. Verify the second `WebFetch` is blocked and the cached content is returned (visible in the session transcript as a tool error with `[sdd-cache]` prefix).

### 3. Freshness verification

To confirm the cache invalidates when docs change, force an `ETag` mismatch. Pick one specific entry — `*.json` is unsafe once the cache holds more than one file:

```bash
# Pick the entry you want to corrupt (swap in the actual filename)
ENTRY=.claude/sdd-cache/e49c9f378670cfbb1d7d871b6dee16d9.json

# Patch its ETag to something the origin will not recognize
jq '.etag = "W/\"stale-etag-forced\""' "$ENTRY" > "$ENTRY.tmp" && mv "$ENTRY.tmp" "$ENTRY"

# Next PreToolUse should miss (server returns 200, not 304)
echo '{"tool_input":{"url":"...", "prompt":"..."}}' | bash hooks/sdd-cache-pre.sh
echo "exit=$?"   # expect 0 (fetch allowed through)
```

### 4. Debugging

Both hooks write timestamped events to `.claude/sdd-cache/.debug.log` when debug mode is on. Enable it with either:

```bash
# Option A: env var (per-session)
SDD_CACHE_DEBUG=1 claude

# Option B: sentinel file (persistent)
mkdir -p .claude/sdd-cache && touch .claude/sdd-cache/.debug
# …disable with: rm .claude/sdd-cache/.debug
```

The log captures URL, detected `tool_response` shape, HEAD status, and why each invocation hit or missed. Useful when a cache miss looks unexpected (typically: the origin stopped emitting validators).

## Known limitations

- **Body is prompt-shaped.** A hit returns the earlier agent's reading of the page, with the original prompt surfaced so the current agent can decide whether it applies. If it doesn't, delete the file under `.claude/sdd-cache/` to force a re-fetch.
- **Every cache write costs an extra HEAD.** Claude Code doesn't expose the response headers that `WebFetch` already received, so the post hook re-queries the origin to capture `ETag` / `Last-Modified`. One extra roundtrip per miss — the price of keeping this a pure hook with no core changes.
- **Servers without `ETag` or `Last-Modified` are never cached.** Most official doc sites (react.dev, docs.djangoproject.com, developer.mozilla.org) emit validators. Sites that don't are always re-fetched.
- **A misbehaving server can serve a wrong `304`.** That's a server bug to diagnose, not a cache invariant to defend against; we don't paper over it with a TTL. Delete the entry if you spot a stale one.
- **Cache is local and per-project.** There is no team-wide shared cache. Adding one would require a signed-content-addressable storage layer, which is out of scope.

## Requirements

- `jq`
- `curl`
- `shasum` or `sha256sum` (auto-detected)
- Bash 3.2+
