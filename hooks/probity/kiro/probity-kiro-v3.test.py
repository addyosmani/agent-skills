#!/usr/bin/env python3
"""End-to-end check of the Kiro shim on kiro-cli 3.x events (issue #176).

Run: python3 hooks/probity/kiro/probity-kiro-v3.test.py

kiro-cli 3.1 renamed the mutating tools (fs_write {path, text},
str_replace, fs_append, execute_bash) and moved session files to
~/.kiro/sessions/<workspace>/sess_<id>/messages.jsonl. With neither
mapped, Probity judged no Kiro write and saw no history. This runs the
real shim with a stand-in probity-claude that records what it was given.
"""
import json
import os
import pathlib
import shutil
import subprocess
import tempfile

_HERE = pathlib.Path(__file__).resolve().parent
failures = []


def check(name, condition, detail=""):
    print(f"  {'ok' if condition else 'FAIL'}: {name}")
    if not condition:
        failures.append(name)
        if detail:
            print(f"      {detail}")


# Records its stdin and, when the payload names a transcript, a copy of it;
# denies so the shim's exit code shows Probity was asked.
RECORDER = """#!/bin/sh
cat > "$RECORD_DIR/payload.json"
python3 - "$RECORD_DIR" <<'PY'
import json, sys, shutil
d = sys.argv[1]
p = json.load(open(d + "/payload.json"))
if p.get("transcript_path"):
    shutil.copy(p["transcript_path"], d + "/transcript.jsonl")
PY
printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"judged"}}'
"""

with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp).resolve()
    project = base / "project"
    hooks = project / ".kiro" / "hooks"
    hooks.mkdir(parents=True)
    for name in ("probity-kiro.sh", "probity-kiro-translate.py", "kiro-transcript-to-claude.py"):
        shutil.copy(_HERE / name, hooks / name)
    bin_dir = project / "node_modules" / ".bin"
    bin_dir.mkdir(parents=True)
    (bin_dir / "probity-claude").write_text(RECORDER)
    (bin_dir / "probity-claude").chmod(0o755)
    (project / "src").mkdir()
    (project / "src" / "Thing.kt").write_text("class Thing\n")

    home = base / "home"
    session = home / ".kiro" / "sessions" / "5c3b8f6213d4a67e" / "sess_v3-session"
    session.mkdir(parents=True)
    (session / "messages.jsonl").write_text("\n".join(json.dumps({"id": str(i), "timestamp": "t", "payload": p}) for i, p in enumerate([
        {"type": "user", "content": "add a test"},
        {"type": "tool_call", "toolCallId": "c1", "toolName": "execute_bash", "args": {"command": "./gradlew check"}},
        {"type": "tool_result", "toolCallId": "c1", "content": "Output:\nBUILD FAILED\n\nExit Code: 1", "success": False},
    ])) + "\n")
    record = base / "record"
    record.mkdir()

    def shim(tool, tool_input):
        event = {"hook_event_name": "PreToolUse", "session_id": "sess_v3-session", "cwd": str(project),
                 "tool_name": tool, "tool_input": tool_input}
        env = {k: v for k, v in os.environ.items() if k not in ("KIRO_SESSION_ID", "NODE_PATH")}
        env.update(HOME=str(home), RECORD_DIR=str(record))
        for leftover in record.iterdir():
            leftover.unlink()
        res = subprocess.run(["bash", str(hooks / "probity-kiro.sh")], input=json.dumps(event),
                             capture_output=True, text=True, cwd=str(project), env=env)
        payload = json.loads((record / "payload.json").read_text()) if (record / "payload.json").exists() else None
        return res, payload

    path = str(project / "src" / "Thing.kt")
    res, payload = shim("fs_write", {"path": path, "text": "class Thing(val x: Int)\n"})
    check("V3 fs_write is judged", res.returncode == 2 and payload is not None, res.stderr)
    check("...as a Write of its text", payload and payload["tool_name"] == "Write"
          and payload["tool_input"]["content"] == "class Thing(val x: Int)\n", payload)
    transcript = (record / "transcript.jsonl").read_text() if (record / "transcript.jsonl").exists() else ""
    check("...with the V3 session's history as the transcript", '"name": "Bash"' in transcript
          and '"exit_status": \\"exit status: 1\\"' not in transcript and "exit status: 1" in transcript, transcript[:300])

    res, payload = shim("str_replace", {"path": path, "oldStr": "Thing", "newStr": "Other", "replace_all": False})
    check("V3 str_replace is judged as an Edit", res.returncode == 2 and payload and payload["tool_name"] == "Edit", res.stderr)

    res, payload = shim("fs_append", {"path": path, "text": "fun go() = 1\n"})
    check("V3 fs_append is judged as a Write of the whole result", res.returncode == 2 and payload
          and payload["tool_input"]["content"] == "class Thing\nfun go() = 1\n", payload)

    res, payload = shim("execute_bash", {"command": "git commit -m x", "cwd": str(project)})
    check("V3 execute_bash is judged as Bash", res.returncode == 2 and payload and payload["tool_name"] == "Bash", res.stderr)

    res, payload = shim("read_file", {"path": path})
    check("V3 read_file is let through without Probity", res.returncode == 0 and payload is None, res.stderr)

    res, payload = shim("edit_code", {"path": path})
    check("a write tool the shim can't translate is blocked", res.returncode == 2 and payload is None and "can't judge" in res.stderr, res.stderr)

    # kiro-cli 3.x drops an agent hook's timeout_ms and lets a call through
    # when the hook runs past 60 s; the shim blocks before that.
    (bin_dir / "probity-claude").write_text("#!/bin/sh\nsleep 5\n")
    os.environ["PROBITY_KIRO_TIMEOUT_S"] = "1"
    try:
        res, payload = shim("fs_write", {"path": path, "text": "x\n"})
    finally:
        del os.environ["PROBITY_KIRO_TIMEOUT_S"]
    check("a judge slower than the 3.x hook timeout blocks instead of letting the call through",
          res.returncode == 2 and "took longer than" in res.stderr, res.stderr)

if failures:
    raise SystemExit(f"{len(failures)} check(s) failed")
print("all checks passed")
