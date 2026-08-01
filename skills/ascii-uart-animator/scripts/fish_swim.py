"""Multiline fish swim — bubbles above, fish body, water, sea floor. 150 frames @ 25fps.

Scene layout per frame (all rows are 40 chars wide):
  Row 0: header (`--- frame N/150 fish swim ---`)
  Row 1: 4 bubble dots drifting right (`o` / `.` alternating)
  Rows 2-4: water, with the fish `><(((°>` in either row 2 or row 3
            (alternates every 8 frames for a swimming up/down bob)
  Row 5: `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~` sea floor
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bridge import post_to_bridge, frame_ansi

W = 40
FPS_DELAY = 0.04
TOTAL_FRAMES = 150

FISH_VARIANTS = [
    "><(((°>",          # tail at rest
    "><(((°> ",         # tail mid-flick (open)
    "><(((°>)))",       # tail fully extended right
    "><(((°> ",         # tail mid-flick back
]


def render_frame(n):
    fish_x = n % (W - 10)
    fish_y = 2 + ((n // 4) % 2)
    tail_idx = n % 4
    fish_body = FISH_VARIANTS[tail_idx]

    header = f"--- frame {n + 1}/{TOTAL_FRAMES} fish swim ---"

    bubbles_chars = [" "] * W
    for i in range(4):
        bx = (W - 14 + i * 7 + (n // 2)) % W
        bc = "o.o."[((n // 2) + i) % 4]
        if 0 <= bx < W:
            bubbles_chars[bx] = bc
    bubbles = "".join(bubbles_chars)

    water_rows = [[" "] * W for _ in range(3)]
    if 0 <= fish_x < W:
        for i, c in enumerate(fish_body):
            if fish_x + i < W:
                water_rows[fish_y - 2][fish_x + i] = c
    water = "\n".join("".join(r) for r in water_rows)

    floor = "~" * W

    return "\n".join([header, bubbles, water, floor])


def build_bash():
    lines = ["set -e"]
    for n in range(TOTAL_FRAMES):
        lines.append(frame_ansi(repr(render_frame(n))))
        lines.append(f"sleep {FPS_DELAY:.3f}")
    lines.append("printf '\\x1b[H\\x1b[2J*** FIN fish_swim @ 25fps, 150 multiline frames ***\\n' > /dev/ttyS2")
    lines.append('echo "fish-sent"')
    return "\n".join(lines)


if __name__ == "__main__":
    body = build_bash()
    status, elapsed, resp = post_to_bridge(body)
    print(f"HTTP {status}  elapsed={elapsed:.2f}s  frames={TOTAL_FRAMES}  movie~{TOTAL_FRAMES * FPS_DELAY:.1f}s")
    print("RESPONSE:", resp)
