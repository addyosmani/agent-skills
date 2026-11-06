#!/usr/bin/env python3
"""
Translation helper for the Probity <-> Kiro PreToolUse shim.

Two subcommands, both stdin -> stdout so the shim can pipe cleanly
(the earlier inline `python3 - <<'PY'` form clashed the heredoc with the
piped payload on stdin, silently producing empty output = allow):

  event   Read a Kiro preToolUse event JSON on stdin, write the
          equivalent claude-code payload JSON on stdout. Emits NOTHING
          (and exits 0) for non-mutating tools, so the shim can fast-allow.
          A transcript path, if provided via $TRANSCRIPT_TMP, is attached
          so Probity's history-based rules work under Kiro.

  reason  Read a Probity claude-code response JSON on stdin. If it is a
          deny, write the permissionDecisionReason on stdout; otherwise
          write nothing. The shim turns a non-empty reason into `exit 2`.

  transcript-path
          Read a Kiro preToolUse event JSON on stdin and write the path of
          its session file, or nothing: kiro-cli 2.x's
          ~/.kiro/sessions/cli/<id>.jsonl, or 3.x's
          ~/.kiro/sessions/<workspace>/sess_<id>/messages.jsonl (#176).

  install Read a claude-code payload JSON on stdin; exit 0 when it is a
          shell command that only installs packages (`npm ci`, `npm
          install`, pnpm/yarn/bun install), 1 otherwise. When Probity is
          installed nowhere the shim blocks every call but this one, so
          the session can recover (issue #90).
"""
import glob
import json
import os
import re
import sys

# kiro-cli 2.x: `fs_write`/`write` with a `command` (create, strReplace,
# insert) and `content`. kiro-cli 3.x (V3 engine, #176): `fs_write` {path,
# text} rewrites the file, `str_replace` {path, oldStr, newStr,
# replace_all} edits it, `fs_append` {path, text} appends to it.
WRITE_TOOLS = {"fs_write", "write", "fsWrite"}
REPLACE_TOOLS = {"str_replace", "strReplace"}
APPEND_TOOLS = {"fs_append", "fsAppend"}
SHELL_TOOLS = {"shell", "execute_bash", "execute_cmd", "executeBash", "executeCmd"}
INSTALL_COMMAND = re.compile(
    r"^\s*(?:cd\s+\S+\s*(?:&&|;)\s*)?"
    r"(?:npm\s+(?:ci|install|i)|pnpm\s+(?:install|i)|yarn(?:\s+install)?|bun\s+install)"
    r"(?:\s+-[\w-]+(?:=\S+)?)*\s*$"
)


def _insert_result(path, cwd, content, insert_line):
    """Reconstruct a file's content after a Kiro `insert`, so content-based
    Probity rules (e.g. the glossary guard) see the true result rather than
    only the introduced text. The pending write hasn't run yet, so the file on
    disk is the pre-write state; fall back to the introduced text alone if it
    cannot be read."""
    full = path if os.path.isabs(path) else os.path.join(cwd, path)
    try:
        with open(full, "r", encoding="utf-8") as handle:
            existing = handle.read()
    except OSError:
        return content
    if isinstance(insert_line, int) and not isinstance(insert_line, bool):
        lines = existing.splitlines(keepends=True)
        idx = max(0, min(insert_line, len(lines)))
        block = content if content.endswith("\n") else content + "\n"
        return "".join(lines[:idx]) + block + "".join(lines[idx:])
    separator = "" if existing == "" or existing.endswith("\n") else "\n"
    return existing + separator + content


def _append_result(path, cwd, text):
    """A V3 `fs_append`'s resulting file: what is on disk (the write hasn't
    run yet) followed by the appended text, or the text alone for a new
    file."""
    full = path if os.path.isabs(path) else os.path.join(cwd, path)
    try:
        with open(full, "r", encoding="utf-8") as handle:
            return handle.read() + text
    except OSError:
        return text


def _edit(path, cwd, ti):
    return {
        "tool_name": "Edit",
        "tool_input": {
            "file_path": path,
            "old_string": ti.get("oldStr", ""),
            "new_string": ti.get("newStr", ""),
            "replace_all": bool(ti.get("replace_all", ti.get("replaceAll", False))),
        },
        "cwd": cwd,
    }


def cmd_event():
    try:
        event = json.load(sys.stdin)
    except Exception:
        return 0  # unparseable -> emit nothing -> shim allows
    if not isinstance(event, dict):
        return 0

    tool = event.get("tool_name") or ""
    ti = event.get("tool_input")
    ti = ti if isinstance(ti, dict) else {}
    cwd = event.get("cwd") or os.getcwd()

    if tool in SHELL_TOOLS:
        payload = {"tool_name": "Bash", "tool_input": {"command": ti.get("command", "")}, "cwd": cwd}
    elif tool in REPLACE_TOOLS:
        payload = _edit(ti.get("path", ""), cwd, ti)
    elif tool in APPEND_TOOLS:
        path = ti.get("path", "")
        payload = {
            "tool_name": "Write",
            "tool_input": {"file_path": path, "content": _append_result(path, cwd, ti.get("text", ti.get("content", "")))},
            "cwd": cwd,
        }
    elif tool in WRITE_TOOLS:
        path = ti.get("path", "")
        if ti.get("command") == "strReplace":
            payload = _edit(path, cwd, ti)
        elif ti.get("command") == "insert":
            # insert ADDS to an existing file; a Write of only the introduced
            # text would tell Probity the whole file became that text. Rebuild
            # the true resulting content from the pre-write file on disk.
            payload = {
                "tool_name": "Write",
                "tool_input": {
                    "file_path": path,
                    "content": _insert_result(path, cwd, ti.get("content", ""), ti.get("insertLine")),
                },
                "cwd": cwd,
            }
        else:  # create (2.x `content`, 3.x `text`) -> Write of the whole file
            payload = {
                "tool_name": "Write",
                "tool_input": {"file_path": path, "content": ti.get("text", ti.get("content", ""))},
                "cwd": cwd,
            }
    else:
        return 0  # not a mutating tool -> allow without invoking probity

    transcript = os.environ.get("TRANSCRIPT_TMP") or ""
    if transcript:
        payload["transcript_path"] = transcript

    sys.stdout.write(json.dumps(payload))
    return 0


def cmd_reason():
    raw = sys.stdin.read().strip()
    if not raw:
        return 0
    try:
        obj = json.loads(raw)
    except Exception:
        return 0
    if not isinstance(obj, dict):
        return 0
    out = obj.get("hookSpecificOutput", {})
    if isinstance(out, dict) and out.get("permissionDecision") == "deny":
        sys.stdout.write(out.get("permissionDecisionReason", "blocked by Probity"))
    return 0


SESSION_ID = re.compile(r"^[A-Za-z0-9_-]+$")


def cmd_transcript_path():
    try:
        event = json.load(sys.stdin)
    except Exception:
        event = {}
    candidates = [os.environ.get("KIRO_SESSION_ID") or ""]
    if isinstance(event, dict):
        candidates.append(str(event.get("session_id") or ""))
    sessions = os.path.join(os.path.expanduser("~"), ".kiro", "sessions")
    for session in candidates:
        # An id that isn't a plain name could reach outside the sessions folder.
        if not SESSION_ID.match(session):
            continue
        v2 = os.path.join(sessions, "cli", session + ".jsonl")
        if os.path.isfile(v2):
            sys.stdout.write(v2)
            return 0
        names = {session, session if session.startswith("sess_") else "sess_" + session}
        found = [
            path
            for name in names
            for path in glob.glob(os.path.join(glob.escape(sessions), "*", name, "messages.jsonl"))
        ]
        if found:
            sys.stdout.write(max(found, key=os.path.getmtime))
            return 0
    return 0


def cmd_install():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 1
    command = payload.get("tool_input", {}).get("command") if isinstance(payload, dict) else None
    return 0 if isinstance(command, str) and INSTALL_COMMAND.match(command) else 1


def main(argv):
    mode = argv[1] if len(argv) > 1 else ""
    if mode == "event":
        return cmd_event()
    if mode == "reason":
        return cmd_reason()
    if mode == "install":
        return cmd_install()
    if mode == "transcript-path":
        return cmd_transcript_path()
    sys.stderr.write("usage: probity-kiro-translate.py {event|reason|transcript-path|install}\n")
    return 64


if __name__ == "__main__":
    sys.exit(main(sys.argv))
