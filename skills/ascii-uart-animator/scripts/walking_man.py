r"""Walking stick figure — 4 cycling leg poses, walker moves right 2 px/frame. 120 frames @ 20fps.

Pose cycle (3 rows per pose):
  0: standing    legs together, V
  1: right leg forward — left leg back, right leg forward
  2: passing    legs together, mid-stride
  3: left leg forward — left leg forward, right leg back
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bridge import post_to_bridge, frame_ansi

W = 50
FPS_DELAY = 0.05
TOTAL_FRAMES = 120

WALK_POSES = [
    ["   O   ", "  /|\\  ", "  / \\  "],
    ["   O   ", "  /|\\  ", "/     |"],
    ["   O   ", "  /|\\  ", "   |   "],
    ["   O   ", "  /|\\  ", "|     \\"],
]

POSE_W = 7


def render_frame(n):
    walker_x = (n * 2) % (W - POSE_W)
    pose = WALK_POSES[n % 4]
    header = f"--- frame {n + 1}/{TOTAL_FRAMES} walking man @ 20fps ---"
    rows = []
    for prow in pose:
        row = [" "] * W
        if 0 <= walker_x < W:
            for i, c in enumerate(prow):
                if 0 <= walker_x + i < W:
                    row[walker_x + i] = c
        rows.append("".join(row))
    rows.append("=" * W)
    return "\n".join([header] + rows)


def build_bash():
    lines = ["set -e"]
    for n in range(TOTAL_FRAMES):
        lines.append(frame_ansi(repr(render_frame(n))))
        lines.append(f"sleep {FPS_DELAY:.3f}")
    lines.append("printf '\\x1b[H\\x1b[2J*** FIN walking_man @ 20fps, 120 multiline frames ***\\n' > /dev/ttyS2")
    lines.append('echo "walker-sent"')
    return "\n".join(lines)


if __name__ == "__main__":
    body = build_bash()
    status, elapsed, resp = post_to_bridge(body)
    print(f"HTTP {status}  elapsed={elapsed:.2f}s  frames={TOTAL_FRAMES}  movie~{TOTAL_FRAMES * FPS_DELAY:.1f}s")
    print("RESPONSE:", resp)
