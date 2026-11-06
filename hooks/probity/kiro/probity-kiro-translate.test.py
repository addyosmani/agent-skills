#!/usr/bin/env python3
"""Tests for the Probity<->Kiro pending-action translator (`event` mode).

Run: python3 hooks/probity/kiro/probity-kiro-translate.test.py

The invariant: a Kiro `insert` adds text to an *existing* file, so translating
it to a Claude `Write` of only the introduced text tells Probity the whole
file became that text — content rules (e.g. the glossary guard) then read
every existing term as "removed". The pending write hasn't run yet, so the
file on disk is the pre-write state and the true result is reconstructable.
"""
import importlib.util
import io
import json
import os
import pathlib
import sys
import tempfile

_HERE = pathlib.Path(__file__).parent
_spec = importlib.util.spec_from_file_location(
    "kiro_translate", _HERE / "probity-kiro-translate.py"
)
translate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(translate)

failures = []


def check(name, condition):
    print(f"  {'ok' if condition else 'FAIL'}: {name}")
    if not condition:
        failures.append(name)


def run_event(event):
    old_in, old_out = sys.stdin, sys.stdout
    sys.stdin, sys.stdout = io.StringIO(json.dumps(event)), io.StringIO()
    try:
        translate.cmd_event()
        return sys.stdout.getvalue()
    finally:
        sys.stdin, sys.stdout = old_in, old_out


with tempfile.TemporaryDirectory() as d:
    path = os.path.join(d, "GLOSSARY.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Glossary\n\n## Existing Term\n\nA definition.\n")

    # An insert that appends a new term.
    out = run_event({
        "tool_name": "fs_write",
        "tool_input": {"command": "insert", "path": path,
                       "content": "\n## New Term\n\nAnother definition.\n"},
        "cwd": d,
    })
    payload = json.loads(out) if out.strip() else {}
    content = payload.get("tool_input", {}).get("content", "")
    check("insert translates to a Write", payload.get("tool_name") == "Write")
    check("reconstructed content keeps the existing term", "## Existing Term" in content)
    check("reconstructed content includes the inserted term", "## New Term" in content)

    # insert with an explicit line index keeps everything too.
    out = run_event({
        "tool_name": "fs_write",
        "tool_input": {"command": "insert", "path": path, "insertLine": 1,
                       "content": "inserted-line\n"},
        "cwd": d,
    })
    content = json.loads(out)["tool_input"]["content"] if out.strip() else ""
    check("line-indexed insert keeps existing content", "## Existing Term" in content and "inserted-line" in content)

    # create still carries the whole-file content through unchanged.
    out = run_event({
        "tool_name": "fs_write",
        "tool_input": {"command": "create", "path": os.path.join(d, "new.txt"),
                       "content": "whole file"},
        "cwd": d,
    })
    check("create passes full content as a Write",
          json.loads(out)["tool_input"]["content"] == "whole file")

    # strReplace still maps to an Edit (unchanged).
    out = run_event({
        "tool_name": "fs_write",
        "tool_input": {"command": "strReplace", "path": path, "oldStr": "a", "newStr": "b"},
        "cwd": d,
    })
    check("strReplace maps to Edit", json.loads(out)["tool_name"] == "Edit")

# --- kiro-cli 3.x (V3 engine) tool names, issue #176 ----------------------
with tempfile.TemporaryDirectory() as d:
    path = os.path.join(d, "Thing.kt")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("class Thing\n")

    out = json.loads(run_event({
        "hook_event_name": "PreToolUse", "session_id": "s", "cwd": d,
        "tool_name": "fs_write", "tool_input": {"path": path, "text": "class Thing(val x: Int)\n"},
    }))
    check("V3 fs_write maps to a Write of its text",
          out["tool_name"] == "Write" and out["tool_input"] == {"file_path": path, "content": "class Thing(val x: Int)\n"})

    out = json.loads(run_event({
        "hook_event_name": "PreToolUse", "session_id": "s", "cwd": d,
        "tool_name": "str_replace",
        "tool_input": {"path": path, "oldStr": "Thing", "newStr": "Other", "replace_all": True},
    }))
    check("V3 str_replace maps to an Edit with replace_all",
          out["tool_name"] == "Edit" and out["tool_input"] == {
              "file_path": path, "old_string": "Thing", "new_string": "Other", "replace_all": True})

    out = json.loads(run_event({
        "hook_event_name": "PreToolUse", "session_id": "s", "cwd": d,
        "tool_name": "fs_append", "tool_input": {"path": path, "text": "fun go() = 1\n"},
    }))
    check("V3 fs_append maps to a Write of the existing content plus the text",
          out["tool_name"] == "Write" and out["tool_input"]["content"] == "class Thing\nfun go() = 1\n")

    out = json.loads(run_event({
        "hook_event_name": "PreToolUse", "session_id": "s", "cwd": d,
        "tool_name": "fs_append", "tool_input": {"path": os.path.join(d, "New.kt"), "text": "x\n"},
    }))
    check("V3 fs_append to a new file writes just the text", out["tool_input"]["content"] == "x\n")

    out = json.loads(run_event({
        "hook_event_name": "PreToolUse", "session_id": "s", "cwd": d,
        "tool_name": "execute_bash",
        "tool_input": {"command": "git commit -m x", "cwd": d, "description": "commit", "run_in_background": False, "timeout": 60},
    }))
    check("V3 execute_bash maps to Bash", out == {"tool_name": "Bash", "tool_input": {"command": "git commit -m x"}, "cwd": d})

    for tool in ("read_file", "grep_search", "file_search"):
        check(f"V3 {tool} is not judged", run_event({"tool_name": tool, "tool_input": {"path": path}, "cwd": d}) == "")


def run_transcript_path(event, home):
    old_in, old_out, old_home = sys.stdin, sys.stdout, os.environ.get("HOME")
    old_session = os.environ.pop("KIRO_SESSION_ID", None)
    sys.stdin, sys.stdout = io.StringIO(json.dumps(event)), io.StringIO()
    os.environ["HOME"] = home
    try:
        translate.cmd_transcript_path()
        return sys.stdout.getvalue()
    finally:
        sys.stdin, sys.stdout = old_in, old_out
        if old_home is not None:
            os.environ["HOME"] = old_home
        if old_session is not None:
            os.environ["KIRO_SESSION_ID"] = old_session


with tempfile.TemporaryDirectory() as home:
    v3 = os.path.join(home, ".kiro", "sessions", "5c3b8f6213d4a67e", "sess_abc-123")
    os.makedirs(v3)
    with open(os.path.join(v3, "messages.jsonl"), "w") as handle:
        handle.write("{}\n")
    check("a V3 session is found by the event's session_id",
          run_transcript_path({"session_id": "sess_abc-123"}, home) == os.path.join(v3, "messages.jsonl"))
    check("a V3 session is found when session_id lacks the sess_ prefix",
          run_transcript_path({"session_id": "abc-123"}, home) == os.path.join(v3, "messages.jsonl"))
    v2 = os.path.join(home, ".kiro", "sessions", "cli")
    os.makedirs(v2)
    with open(os.path.join(v2, "old-id.jsonl"), "w") as handle:
        handle.write("{}\n")
    check("a V2 session is still found", run_transcript_path({"session_id": "old-id"}, home) == os.path.join(v2, "old-id.jsonl"))
    check("an unknown session gives no path", run_transcript_path({"session_id": "nope"}, home) == "")
    check("a session id cannot climb out of the sessions folder",
          run_transcript_path({"session_id": "../../etc"}, home) == "")

if failures:
    print(f"\n{len(failures)} check(s) failed")
    raise SystemExit(1)
print("\nall checks passed")