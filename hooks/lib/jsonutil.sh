#!/bin/bash
# jsonutil.sh — shared JSON helpers for the sdd-cache hooks.
#
# jq is preferred but not guaranteed to be installed. Falls back to python3,
# then node. If none of the three exist, callers should bypass caching
# entirely (source this file and check `$JSON_TOOL` for "none").
#
# All helpers pass values through environment variables, never shell/string
# interpolation — cached doc content can contain backticks, quotes, and
# newlines, and each backend's native JSON encoder handles that correctly.

detect_json_tool() {
  if command -v jq >/dev/null 2>&1; then
    echo jq
  elif command -v python3 >/dev/null 2>&1; then
    echo python3
  elif command -v node >/dev/null 2>&1; then
    echo node
  else
    echo none
  fi
}

JSON_TOOL="${JSON_TOOL:-$(detect_json_tool)}"

# jf_get_file FILE PATH DEFAULT
# PATH is a single top-level key (this codebase never nests more than one
# level deep for the fields it reads from cache/stats files).
jf_get_file() {
  local file="$1" path="$2" default="${3:-}"
  [ -f "$file" ] || { printf '%s' "$default"; return 0; }
  case "$JSON_TOOL" in
    jq)
      jq -r --arg d "$default" ".${path} // \$d" "$file" 2>/dev/null
      ;;
    python3)
      JF_FILE="$file" JF_PATH="$path" JF_DEFAULT="$default" python3 -c '
import json, os
try:
    with open(os.environ["JF_FILE"]) as fh:
        d = json.load(fh)
except Exception:
    d = {}
v = d.get(os.environ["JF_PATH"])
print(v if v is not None and v != "" else os.environ["JF_DEFAULT"])
' 2>/dev/null
      ;;
    node)
      JF_FILE="$file" JF_PATH="$path" JF_DEFAULT="$default" node -e '
const fs = require("fs");
let d = {};
try { d = JSON.parse(fs.readFileSync(process.env.JF_FILE, "utf8")); } catch (e) {}
const v = d[process.env.JF_PATH];
console.log(v !== undefined && v !== null && v !== "" ? v : process.env.JF_DEFAULT);
' 2>/dev/null
      ;;
    *)
      printf '%s' "$default"
      ;;
  esac
}

# jf_get_input_field JSON PATH DEFAULT
# PATH is "a.b" (max two levels — matches tool_input.url / tool_input.prompt).
jf_get_input_field() {
  local json="$1" path="$2" default="${3:-}"
  case "$JSON_TOOL" in
    jq)
      printf '%s' "$json" | jq -r --arg d "$default" ".${path} // \$d" 2>/dev/null
      ;;
    python3)
      JF_PATH="$path" JF_DEFAULT="$default" python3 -c '
import json, os, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
cur = d
for p in os.environ["JF_PATH"].split("."):
    cur = cur.get(p) if isinstance(cur, dict) else None
    if cur is None:
        break
print(cur if cur is not None and cur != "" else os.environ["JF_DEFAULT"])
' <<<"$json" 2>/dev/null
      ;;
    node)
      JF_PATH="$path" JF_DEFAULT="$default" node -e '
let d = {};
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) {}
let cur = d;
for (const p of process.env.JF_PATH.split(".")) {
  cur = (cur && typeof cur === "object") ? cur[p] : undefined;
  if (cur === undefined || cur === null) break;
}
console.log(cur !== undefined && cur !== null && cur !== "" ? cur : process.env.JF_DEFAULT);
' <<<"$json" 2>/dev/null
      ;;
    *)
      printf '%s' "$default"
      ;;
  esac
}

# jf_response_type JSON -> "object" | "string" | "other"
jf_response_type() {
  local json="$1"
  case "$JSON_TOOL" in
    jq)
      printf '%s' "$json" | jq -r '.tool_response | type' 2>/dev/null
      ;;
    python3)
      python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
v = d.get("tool_response")
print("object" if isinstance(v, dict) else "string" if isinstance(v, str) else "other")
' <<<"$json" 2>/dev/null
      ;;
    node)
      node -e '
let d = {};
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) {}
const v = d.tool_response;
console.log(typeof v === "object" && v !== null ? "object" : typeof v === "string" ? "string" : "other");
' <<<"$json" 2>/dev/null
      ;;
    *)
      echo other
      ;;
  esac
}

# jf_extract_response_content JSON -> first non-empty of the known content
# fields on tool_response (object case), or tool_response itself (string case).
jf_extract_response_content() {
  local json="$1"
  case "$JSON_TOOL" in
    jq)
      printf '%s' "$json" | jq -r '
        if (.tool_response | type) == "object" then
          (.tool_response.result // .tool_response.output // .tool_response.text // .tool_response.content // .tool_response.body // empty)
        elif (.tool_response | type) == "string" then
          .tool_response
        else
          empty
        end
      ' 2>/dev/null
      ;;
    python3)
      python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
tr = d.get("tool_response")
out = ""
if isinstance(tr, dict):
    for k in ("result", "output", "text", "content", "body"):
        v = tr.get(k)
        if v:
            out = v
            break
elif isinstance(tr, str):
    out = tr
print(out)
' <<<"$json" 2>/dev/null
      ;;
    node)
      node -e '
let d = {};
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) {}
const tr = d.tool_response;
let out = "";
if (tr && typeof tr === "object") {
  for (const k of ["result", "output", "text", "content", "body"]) {
    if (tr[k]) { out = tr[k]; break; }
  }
} else if (typeof tr === "string") {
  out = tr;
}
console.log(out);
' <<<"$json" 2>/dev/null
      ;;
    *)
      printf ''
      ;;
  esac
}

# jf_write_cache_file FILE URL PROMPT ETAG LAST_MODIFIED CONTENT FETCHED_AT
# CONTENT/PROMPT come through env vars so arbitrary bytes (backticks, quotes,
# newlines) never touch shell interpolation.
jf_write_cache_file() {
  local file="$1"
  export JF_URL="$2" JF_PROMPT="$3" JF_ETAG="$4" JF_LAST_MOD="$5" JF_CONTENT="$6" JF_FETCHED_AT="$7"
  local tmp="${file}.$$.tmp"
  case "$JSON_TOOL" in
    jq)
      jq -n \
        --arg url "$JF_URL" --arg prompt "$JF_PROMPT" --arg etag "$JF_ETAG" \
        --arg last_modified "$JF_LAST_MOD" --arg content "$JF_CONTENT" \
        --argjson fetched_at "$JF_FETCHED_AT" \
        '{url: $url, prompt: $prompt, etag: $etag, last_modified: $last_modified, content: $content, fetched_at: $fetched_at}' \
        >"$tmp" 2>/dev/null
      ;;
    python3)
      python3 -c '
import json, os
out = {
    "url": os.environ["JF_URL"],
    "prompt": os.environ["JF_PROMPT"],
    "etag": os.environ["JF_ETAG"],
    "last_modified": os.environ["JF_LAST_MOD"],
    "content": os.environ["JF_CONTENT"],
    "fetched_at": int(os.environ["JF_FETCHED_AT"]),
}
print(json.dumps(out))
' >"$tmp" 2>/dev/null
      ;;
    node)
      node -e '
const out = {
  url: process.env.JF_URL,
  prompt: process.env.JF_PROMPT,
  etag: process.env.JF_ETAG,
  last_modified: process.env.JF_LAST_MOD,
  content: process.env.JF_CONTENT,
  fetched_at: parseInt(process.env.JF_FETCHED_AT, 10),
};
console.log(JSON.stringify(out));
' >"$tmp" 2>/dev/null
      ;;
    *)
      return 1
      ;;
  esac
  if [ -s "$tmp" ]; then
    mv "$tmp" "$file"
  else
    rm -f "$tmp"
    return 1
  fi
}

# jf_write_stats_file FILE HITS BYTES_SAVED SINCE LAST_HIT
jf_write_stats_file() {
  local file="$1"
  export JF_HITS="$2" JF_BYTES_SAVED="$3" JF_SINCE="$4" JF_LAST_HIT="$5"
  local tmp="${file}.$$.tmp"
  case "$JSON_TOOL" in
    jq)
      jq -n \
        --argjson hits "$JF_HITS" --argjson bytes_saved "$JF_BYTES_SAVED" \
        --argjson since "$JF_SINCE" --argjson last_hit "$JF_LAST_HIT" \
        '{hits: $hits, bytes_saved: $bytes_saved, since: $since, last_hit: $last_hit}' \
        >"$tmp" 2>/dev/null
      ;;
    python3)
      python3 -c '
import json, os
out = {
    "hits": int(os.environ["JF_HITS"]),
    "bytes_saved": int(os.environ["JF_BYTES_SAVED"]),
    "since": int(os.environ["JF_SINCE"]),
    "last_hit": int(os.environ["JF_LAST_HIT"]),
}
print(json.dumps(out))
' >"$tmp" 2>/dev/null
      ;;
    node)
      node -e '
const out = {
  hits: parseInt(process.env.JF_HITS, 10),
  bytes_saved: parseInt(process.env.JF_BYTES_SAVED, 10),
  since: parseInt(process.env.JF_SINCE, 10),
  last_hit: parseInt(process.env.JF_LAST_HIT, 10),
};
console.log(JSON.stringify(out));
' >"$tmp" 2>/dev/null
      ;;
    *)
      return 1
      ;;
  esac
  if [ -s "$tmp" ]; then
    mv "$tmp" "$file"
  else
    rm -f "$tmp"
    return 1
  fi
}
