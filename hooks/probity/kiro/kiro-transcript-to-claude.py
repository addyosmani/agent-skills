#!/usr/bin/env python3
"""
Kiro session transcript -> Anthropic (Claude Code) transcript transducer.

Probity's claude-code vendor reconstructs conversation history from a
JSONL transcript in Anthropic's persisted message shape (see
node_modules/@nizos/probity/dist/vendors/claude-code/transcript.js):

    {"type":"assistant","message":{"content":[
        {"type":"tool_use","id":<id>,"name":<ClaudeToolName>,"input":{...}}]}}
    {"type":"user","message":{"content":[
        {"type":"tool_result","tool_use_id":<id>,"content":<string|blocks>}]}}
    {"type":"user","message":{"content":[{"type":"text","text":<prompt>}]}}

Kiro persists a different, versioned event stream at
~/.kiro/sessions/cli/<KIRO_SESSION_ID>.jsonl:

    {"kind":"Prompt","data":{"content":[{"kind":"text","data":<str>}]}}
    {"kind":"AssistantMessage","data":{"content":[
        {"kind":"toolUse","data":{"toolUseId","name","input"}},
        {"kind":"text","data":<str>}, {"kind":"thinking",...}]}}
    {"kind":"ToolResults","data":{"content":[
        {"kind":"toolResult","data":{"toolUseId","content":[{"kind":"text","data"}],"status"}}]}}

kiro-cli 3.x (V3 engine, #176) persists one event per line at
~/.kiro/sessions/<workspace>/sess_<id>/messages.jsonl:

    {"id","timestamp","payload":{"type":"user","content":<str>}}
    {"id","timestamp","payload":{"type":"assistant","content":<str>}}
    {"id","timestamp","payload":{"type":"tool_call","toolCallId","toolName","args"}}
    {"id","timestamp","payload":{"type":"tool_result","toolCallId","content":<str>,"success"}}

A V3 shell result is the output then "\n\nExit Code: N"; it is rewritten
as 2.x's {exit_status, stdout, stderr} envelope, so the green gate's Kiro
exit-status check reads both versions alike.

This script maps both onto the Anthropic shape so Probity's history-based
rules (the commit green-gate `requireGreenTestRun`, the TDD RED-before-GREEN
judge, characterization/probe resolution) can see prior tool calls and their
output when running under Kiro.

Tool-name mapping matters: Probity's history `toCanonical` only treats a
Claude `Bash` action as a shell command and `Write`/`Edit` as a file write.
So Kiro's `shell` must become `Bash` (or the green-gate never sees the
`xcodebuild ... test` output), and Kiro's `write` becomes `Write`/`Edit`.

Reads Kiro JSONL from argv[1] (or stdin) and writes Claude JSONL to stdout.
Malformed lines are skipped, mirroring Probity's own tolerant reader.
"""
import json
import re
import sys

# Kiro appends the exit code last, so the last match is Kiro's own even
# when the command printed "Exit Code: …" itself.
V3_SHELL_RESULT = re.compile(r"\AOutput:\n(.*)\n\nExit Code: (-?\d+)\s*\Z", re.S)


def _text_blocks(content):
    """Join the payloads of a Kiro content array into one string.

    Text blocks (`kind == "text"`) carry prompts and assistant prose. Tool
    RESULTS, however, are persisted as `kind == "json"` blocks — the shell
    tool's {exit_status, stdout, stderr} object, write confirmations, etc.
    The history-based rules match on command OUTPUT (the green-gate looks for
    a passing test run; the characterization gate looks for the marked test
    failing), so those json payloads must be serialized in rather than
    dropped — otherwise every command's output is invisible under Kiro and
    the gates can never see a test run at all.
    """
    out = []
    for item in content or []:
        if not isinstance(item, dict):
            continue
        kind = item.get("kind")
        data = item.get("data")
        if kind == "text":
            if isinstance(data, str):
                out.append(data)
        elif kind == "json":
            if isinstance(data, str):
                out.append(data)
            else:
                try:
                    out.append(json.dumps(data))
                except (TypeError, ValueError):
                    pass
    return "\n".join(out)


def _map_tool(name, tool_input):
    """Map a Kiro tool name+input to a Claude (tool_name, input) pair.

    Only the shapes Probity's history reader interprets need to be exact:
      - shell   -> Bash  {command}
      - write   -> Write {file_path, content} / Edit {file_path, new_string}
    Everything else is passed through under its own name and read by
    Probity as an inert `other` action (no rule matches it).
    """
    tool_input = tool_input if isinstance(tool_input, dict) else {}
    if name in ("shell", "execute_bash", "execute_cmd"):
        return "Bash", {"command": tool_input.get("command", "")}
    if name in ("str_replace", "strReplace"):
        return "Edit", {
            "file_path": tool_input.get("path", ""),
            "old_string": tool_input.get("oldStr", ""),
            "new_string": tool_input.get("newStr", ""),
            "replace_all": bool(tool_input.get("replace_all", tool_input.get("replaceAll", False))),
        }
    if name in ("fs_append", "fsAppend"):
        return "Write", {"file_path": tool_input.get("path", ""), "content": tool_input.get("text", "")}
    if name in ("write", "fs_write", "fsWrite"):
        op = tool_input.get("command")
        path = tool_input.get("path", "")
        if op == "strReplace":
            return "Edit", {
                "file_path": path,
                "old_string": tool_input.get("oldStr", ""),
                "new_string": tool_input.get("newStr", ""),
                "replace_all": bool(tool_input.get("replaceAll", False)),
            }
        # create / insert / append: the introduced text is `content` (2.x)
        # or `text` (3.x).
        return "Write", {
            "file_path": path,
            "content": tool_input.get("text", tool_input.get("content", "")),
        }
    return name or "Unknown", tool_input


def _v3_shell_result(content):
    match = V3_SHELL_RESULT.match(content)
    if not match:
        return content
    return json.dumps({"exit_status": "exit status: " + match.group(2), "stdout": match.group(1), "stderr": ""})


def transduce_v3(payload, emit, state):
    """One kiro-cli 3.x event. `state` maps toolCallId -> tool name, so a
    result can be read the way its call's tool reports."""
    kind = payload.get("type")
    if kind == "user" and isinstance(payload.get("content"), str) and payload["content"]:
        emit({"type": "user", "message": {"content": [{"type": "text", "text": payload["content"]}]}})
    elif kind == "assistant" and isinstance(payload.get("content"), str) and payload["content"]:
        emit({"type": "assistant", "message": {"content": [{"type": "text", "text": payload["content"]}]}})
    elif kind == "tool_call":
        name = payload.get("toolName")
        state[payload.get("toolCallId", "")] = name
        cname, cinput = _map_tool(name, payload.get("args"))
        emit({"type": "assistant", "message": {"content": [{
            "type": "tool_use", "id": payload.get("toolCallId", ""), "name": cname, "input": cinput}]}})
    elif kind == "tool_result":
        content = payload.get("content")
        content = content if isinstance(content, str) else _text_blocks(content)
        if state.get(payload.get("toolCallId", "")) in ("execute_bash", "shell"):
            content = _v3_shell_result(content)
        emit({"type": "user", "message": {"content": [{
            "type": "tool_result", "tool_use_id": payload.get("toolCallId", ""), "content": content}]}})
    # Other 3.x events (session_start, turn_start, usage_summary, ...) carry no history.


def transduce_line(raw, emit, state=None):
    line = raw.strip()
    if not line:
        return
    try:
        entry = json.loads(line)
    except (ValueError, TypeError):
        return
    if not isinstance(entry, dict):
        return
    if isinstance(entry.get("payload"), dict):
        transduce_v3(entry["payload"], emit, state if state is not None else {})
        return
    kind = entry.get("kind")
    data = entry.get("data") or {}
    content = data.get("content") if isinstance(data, dict) else None

    if kind == "Prompt":
        text = _text_blocks(content)
        if text:
            emit({"type": "user",
                  "message": {"content": [{"type": "text", "text": text}]}})
        return

    if kind == "AssistantMessage":
        blocks = []
        for item in content or []:
            if not isinstance(item, dict):
                continue
            ikind = item.get("kind")
            idata = item.get("data") or {}
            if ikind == "toolUse" and isinstance(idata, dict):
                cname, cinput = _map_tool(idata.get("name"), idata.get("input"))
                blocks.append({
                    "type": "tool_use",
                    "id": idata.get("toolUseId", ""),
                    "name": cname,
                    "input": cinput,
                })
            elif ikind == "text" and isinstance(idata, str):
                blocks.append({"type": "text", "text": idata})
        if blocks:
            emit({"type": "assistant", "message": {"content": blocks}})
        return

    if kind == "ToolResults":
        for item in content or []:
            if not isinstance(item, dict) or item.get("kind") != "toolResult":
                continue
            idata = item.get("data") or {}
            if not isinstance(idata, dict):
                continue
            emit({
                "type": "user",
                "message": {"content": [{
                    "type": "tool_result",
                    "tool_use_id": idata.get("toolUseId", ""),
                    "content": _text_blocks(idata.get("content")),
                }]},
            })
        return
    # Unknown top-level kinds are ignored.


def main(argv):
    src = open(argv[1], "r", encoding="utf-8") if len(argv) > 1 else sys.stdin
    out = sys.stdout

    def emit(obj):
        out.write(json.dumps(obj))
        out.write("\n")

    state = {}
    try:
        for raw in src:
            transduce_line(raw, emit, state)
    finally:
        if src is not sys.stdin:
            src.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
