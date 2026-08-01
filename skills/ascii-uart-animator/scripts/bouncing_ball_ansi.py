"""Bouncing ball with ANSI clear+home between frames — 30 frames, 30fps. Redraws in place."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bridge import post_to_bridge, frame_ansi

W, H = 40, 6
FPS_DELAY = 0.033
TOTAL_FRAMES = 30

CYCLE = [
    (4, 0), (8, 3), (12, 4), (16, 3),
    (20, 0), (24, 3), (28, 4), (32, 3),
    (36, 0),
]


def render_frame(n):
    x, h = CYCLE[n % len(CYCLE)]
    rows = [[" "] * W for _ in range(H)]
    row = H - 1 - h
    if 0 <= row < H:
        rows[row][x] = "o"
    return "\n".join("".join(r) for r in rows) + "\n" + "=" * W


def build_bash():
    lines = ["set -e"]
    for n in range(TOTAL_FRAMES):
        lines.append(frame_ansi(repr(render_frame(n))))
        lines.append(f"sleep {FPS_DELAY:.3f}")
    lines.append("printf '\\x1b[H\\x1b[2J        *** FIN bouncing_ball_ansi @ 30fps ***\\n' > /dev/ttyS2")
    lines.append('echo "ball-ansi-sent"')
    return "\n".join(lines)


if __name__ == "__main__":
    body = build_bash()
    status, elapsed, resp = post_to_bridge(body)
    print(f"HTTP {status}  elapsed={elapsed:.2f}s  frames={TOTAL_FRAMES}  movie~{TOTAL_FRAMES * FPS_DELAY:.1f}s")
    print("RESPONSE:", resp)
