"""Shared helpers for posting bash scripts to the rock1 shell bridge."""
import json
import time
import urllib.request

BRIDGE_URL = "https://rock1.tail3a04f5.ts.net/run"


def post_to_bridge(bash_script, timeout=120):
    """POST an argv-array command to the rock1 bridge and return (status, elapsed, response_text)."""
    body = json.dumps({"command": ["bash", "-c", bash_script]})
    req = urllib.request.Request(
        BRIDGE_URL,
        data=body.encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        resp = r.read().decode("utf-8")
    return r.status, time.time() - t0, resp


def frame_ansi(line_repr):
    """printf line that writes one frame with ANSI clear+home prefix."""
    return f"printf '\\x1b[H\\x1b[2J%b\\n' {line_repr} > /dev/ttyS2"


def frame_plain(line_repr):
    """printf line that writes one frame with no prefix (scrolls)."""
    return f"printf '%b\\n' {line_repr} > /dev/ttyS2"
