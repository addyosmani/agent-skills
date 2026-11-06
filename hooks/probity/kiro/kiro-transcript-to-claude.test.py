#!/usr/bin/env python3
"""Tests for the Kiro->Claude transcript transducer.

Run: python3 hooks/probity/kiro/kiro-transcript-to-claude.test.py

Guards the invariant that matters for Probity's history-based rules: tool
RESULTS (shell stdout/stderr) are persisted by Kiro as `json` content blocks,
and must survive translation into the Claude tool_result content — otherwise
the green-gate and characterization gate never see any command output.
"""
import importlib.util
import json
import pathlib

_HERE = pathlib.Path(__file__).parent
_spec = importlib.util.spec_from_file_location(
    "kiro_transducer", _HERE / "kiro-transcript-to-claude.py"
)
transducer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(transducer)

failures = []


def check(name, condition):
    print(f"  {'ok' if condition else 'FAIL'}: {name}")
    if not condition:
        failures.append(name)


# A shell tool result is a `json` block carrying {exit_status, stdout, stderr}.
result_line = json.dumps({
    "kind": "ToolResults",
    "data": {"content": [{
        "kind": "toolResult",
        "data": {
            "toolUseId": "abc",
            "content": [{"kind": "json", "data": {
                "exit_status": "exit status: 65",
                "stdout": "Test Case 'testRestoreSucceeds' failed (0.1 seconds).",
                "stderr": "",
            }}],
        },
    }]},
})

emitted = []
transducer.transduce_line(result_line, emitted.append)

check("a ToolResults line is translated to one user/tool_result message", len(emitted) == 1)
content = emitted[0]["message"]["content"][0]["content"] if emitted else ""
check("the json tool-result payload survives translation (test name)", "testRestoreSucceeds" in content)
check("the failure signal survives translation (/fail/)", "failed" in content)

# Text blocks (prompts, assistant prose) must still work.
check(
    "text blocks are still extracted",
    transducer._text_blocks([{"kind": "text", "data": "hello"}]) == "hello",
)
# A string json payload is passed through as-is.
check(
    "string json payloads pass through",
    "raw" in transducer._text_blocks([{"kind": "json", "data": "raw output"}]),
)

# --- kiro-cli 3.x session files, issue #176 -------------------------------
# One line per event: {"id", "timestamp", "payload": {"type", ...}}, shapes
# taken from real 3.1.0 sessions with the contents replaced.
def v3(payload):
    return json.dumps({"id": "e", "timestamp": "2026-11-06T10:00:00Z", "payload": payload})


emitted = []
state = {}
for line in [
    v3({"type": "session_start", "agentType": "build", "content": "steering"}),
    v3({"type": "user", "content": "add the unread count"}),
    v3({"type": "assistant", "content": "I'll add a test first."}),
    v3({"type": "tool_call", "toolCallId": "t1", "toolName": "str_replace",
        "args": {"path": "/r/CountTest.kt", "oldStr": "a", "newStr": "b", "replace_all": False}}),
    v3({"type": "tool_result", "toolCallId": "t1", "content": "Replaced text in /r/CountTest.kt", "success": True}),
    v3({"type": "tool_call", "toolCallId": "t2", "toolName": "execute_bash",
        "args": {"command": "./gradlew :sdk:core:jvmTest -q", "cwd": "/r"}}),
    v3({"type": "tool_result", "toolCallId": "t2", "content": "Output:\n\n\nExit Code: 0", "success": True}),
    v3({"type": "tool_call", "toolCallId": "t3", "toolName": "fs_write", "args": {"path": "/r/Count.kt", "text": "class Count\n"}}),
    v3({"type": "tool_call", "toolCallId": "t4", "toolName": "fs_append", "args": {"path": "/r/Count.kt", "text": "fun x() = 1\n"}}),
    v3({"type": "tool_call", "toolCallId": "t5", "toolName": "execute_bash", "args": {"command": "./gradlew check -q; echo x"}}),
    v3({"type": "tool_result", "toolCallId": "t5", "content": "Output:\nhi\n\nExit Code: 0\n\nExit Code: 1", "success": False}),
    v3({"type": "turn_end", "stopReason": "end_turn"}),
]:
    transducer.transduce_line(line, emitted.append, state)

kinds = [(e["type"], e["message"]["content"][0]["type"]) for e in emitted]
check("V3 user, assistant, tool calls and results are all emitted", kinds == [
    ("user", "text"), ("assistant", "text"),
    ("assistant", "tool_use"), ("user", "tool_result"),
    ("assistant", "tool_use"), ("user", "tool_result"),
    ("assistant", "tool_use"), ("assistant", "tool_use"),
    ("assistant", "tool_use"), ("user", "tool_result"),
])
edit = emitted[2]["message"]["content"][0]
check("V3 str_replace becomes an Edit", edit["name"] == "Edit" and edit["input"]["file_path"] == "/r/CountTest.kt")
bash = emitted[4]["message"]["content"][0]
check("V3 execute_bash becomes Bash", bash["name"] == "Bash" and bash["input"] == {"command": "./gradlew :sdk:core:jvmTest -q"})
envelope = json.loads(emitted[5]["message"]["content"][0]["content"])
check("a V3 shell result becomes Kiro's exit-status envelope",
      envelope == {"exit_status": "exit status: 0", "stdout": "", "stderr": ""})
write = emitted[6]["message"]["content"][0]
check("V3 fs_write becomes a Write of its text", write["name"] == "Write" and write["input"]["content"] == "class Count\n")
append = emitted[7]["message"]["content"][0]
check("V3 fs_append becomes a Write", append["name"] == "Write" and append["input"]["content"] == "fun x() = 1\n")
spoof = json.loads(emitted[9]["message"]["content"][0]["content"])
check("a result whose output prints its own Exit Code keeps Kiro's last one",
      spoof["exit_status"] == "exit status: 1" and spoof["stdout"].endswith("Exit Code: 0"))
check("a non-shell V3 result is passed through as text", emitted[3]["message"]["content"][0]["content"] == "Replaced text in /r/CountTest.kt")

if failures:
    print(f"\n{len(failures)} check(s) failed")
    raise SystemExit(1)
print("\nall checks passed")