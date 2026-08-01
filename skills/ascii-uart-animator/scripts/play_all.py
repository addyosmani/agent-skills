"""Plays all 4 animations back-to-back to /dev/ttyS2:

  bouncing_ball → 1s pause → bouncing_ball_ansi → 1s pause
  → fish_swim → 1s pause → walking_man → FIN

Builds ONE big bash script so the bridge makes a single round-trip and rock1
runs everything sequentially. Total ~17 seconds of animation on the wire.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bouncing_ball
import bouncing_ball_ansi
import fish_swim
import walking_man
from bridge import post_to_bridge

SEPARATOR_DELAY = 1.0  # seconds pause between animations


def section_bash(render_fn, total_frames, fps_delay, with_clear, label):
    lines = []
    frame_fn = (
        lambda fr: f"printf '\\x1b[H\\x1b[2J%b\\n' {repr(fr)} > /dev/ttyS2"
        if with_clear
        else f"printf '%b\\n' {repr(fr)} > /dev/ttyS2"
    )
    for n in range(total_frames):
        lines.append(frame_fn(render_fn(n)))
        lines.append(f"sleep {fps_delay:.3f}")
    # Separator: clear screen + label + pause
    safe_label = label.replace("'", "'\\''")
    lines.append(f"printf '\\x1b[H\\x1b[2J=== {safe_label} (finished, next in {SEPARATOR_DELAY:.0f}s) ===\\n' > /dev/ttyS2")
    lines.append(f"sleep {SEPARATOR_DELAY}")
    return lines


def build_combined_bash():
    lines = ["set -e"]
    lines += section_bash(
        bouncing_ball.render_frame,
        bouncing_ball.TOTAL_FRAMES,
        bouncing_ball.FPS_DELAY,
        with_clear=False,
        label="bouncing_ball @ 10fps",
    )
    lines += section_bash(
        bouncing_ball_ansi.render_frame,
        bouncing_ball_ansi.TOTAL_FRAMES,
        bouncing_ball_ansi.FPS_DELAY,
        with_clear=True,
        label="bouncing_ball_ansi @ 30fps",
    )
    lines += section_bash(
        fish_swim.render_frame,
        fish_swim.TOTAL_FRAMES,
        fish_swim.FPS_DELAY,
        with_clear=True,
        label="fish_swim @ 25fps, multiline",
    )
    lines += section_bash(
        walking_man.render_frame,
        walking_man.TOTAL_FRAMES,
        walking_man.FPS_DELAY,
        with_clear=True,
        label="walking_man @ 20fps, multiline",
    )
    lines.append("printf '\\x1b[H\\x1b[2J*** ALL ANIMATIONS COMPLETE ***\\n' > /dev/ttyS2")
    lines.append('echo "all-sent"')
    return "\n".join(lines)


if __name__ == "__main__":
    body = build_combined_bash()
    total_time = (
        bouncing_ball.TOTAL_FRAMES * bouncing_ball.FPS_DELAY
        + bouncing_ball_ansi.TOTAL_FRAMES * bouncing_ball_ansi.FPS_DELAY
        + fish_swim.TOTAL_FRAMES * fish_swim.FPS_DELAY
        + walking_man.TOTAL_FRAMES * walking_man.FPS_DELAY
        + 3 * SEPARATOR_DELAY
    )
    print(f"BODY_BYTES: {len(body.encode())}")
    print(f"BASH_LINES: {body.count(chr(10)) + 1}")
    print(f"ESTIMATED_MOVIE_SECONDS: {total_time:.1f}")
    status, elapsed, resp = post_to_bridge(body, timeout=180)
    print(f"HTTP {status}  elapsed={elapsed:.2f}s")
    print("RESPONSE:", resp)
