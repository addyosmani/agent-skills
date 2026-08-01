---
name: ascii-uart-animator
description: "Send framed ASCII art animations to a UART device (e.g. /dev/ttyS2) over the rock1 shell bridge — bouncing ball, fish swim, walking stick figure. Use when testing UART throughput, verifying ANSI rendering on the receiver, exercising the debug CLI bridge with something tangible, or just sending a fun ASCII movie down a serial line. Built-in: bouncing_ball (9 frames @ 10fps, no clear), bouncing_ball_ansi (30 frames @ 30fps, ANSI clear+home between frames), fish_swim (150 multiline frames @ 25fps with bubbles + sea floor), walking_man (120 multiline frames @ 20fps stick figure walking right), and play_all (all four back-to-back with separator pauses)."
license: MIT
compatibility: "Requires Python 3.8+ stdlib on the agent side, the rock1 shell bridge connection (conn_6rp6oRY9DBJG), and a writable UART char device on rock1 owned by the bridge user."
---

# ASCII UART Animator

Push framed ASCII art to `/dev/ttyS2` on **rock1** (or any UART char device the bridge user owns) via the Tailscale-Funnel shell bridge. Each frame is one `printf` write; between frames, `sleep N` paces the animation.

## How it works

1. Python builds a per-frame ASCII string for the requested animation.
2. Wraps it in a `printf '...\n' '<frame>' > /dev/ttyS2` line — prepend `\x1b[H\x1b[2J` (cursor home + clear screen) for a clean redraw instead of a scroll.
3. Bundles all frames into one bash script with `sleep FPS_DELAY` between them.
4. POSTs `{"command": ["bash", "-c", "<script>"]}` to the bridge at `https://rock1.tail3a04f5.ts.net/run`.
5. rock1 runs the script as user `shant` (who owns `/dev/ttyS2` at mode `0600`).

## Running

Each script is self-contained Python that posts to the bridge directly. Run via `run_script` with the `rock1 shell bridge` connection passed:

```python
run_script(
    file={path: "skills/personal-WbtUgeUv/ascii-uart-animator/scripts/fish_swim.py"},
    connections=[{id: "conn_6rp6oRY9DBJG", name: "rock1 shell bridge"}],
    executor="sandbox",
)
```

Or invoke any of them inline by copying the relevant `render_frame` logic into a `run_script` `inline` call.

## Built-in animations

| Script | Frames | FPS | Scene |
|---|---|---|---|
| `bouncing_ball.py` | 9 | 10 | Single `o` ball arcing across `=` ground. No clear between frames — scrolls. |
| `bouncing_ball_ansi.py` | 30 | 30 | Same ball, but ANSI `\x1b[H\x1b[2J` between frames so it redraws in place. |
| `fish_swim.py` | 150 | 25 | Header + bubbles row + fish (4 tail-wag variants) in row 2/3 + water + `~` sea floor. |
| `walking_man.py` | 120 | 20 | Stick figure `O /\|` with 4 cycling leg poses, walks right 2 px/frame across `=` ground. |
| `play_all.py` | 309 | mixed | All four in sequence with 1s separator pauses between. ~17s total. |

## Knobs

Each script has constants near the top:

- `W` — scene width
- `TOTAL_FRAMES` — how many frames in the loop
- `FPS_DELAY` — seconds between frames (lower = faster)

The actual frame interval on the wire is `FPS_DELAY + (bytes_per_frame / baud_rate)`. At 115200 8N1, a 200-byte frame adds ~17 ms of transmission time on top of the schedule.

## Adding a new animation

1. Write `render_frame(n, total)` returning a `\n`-joined string.
2. Loop frames into a bash script:

   ```python
   for n in range(TOTAL_FRAMES):
       lines.append(f"printf '\\x1b[H\\x1b[2J%b\\n' {repr(render_frame(n))} > /dev/ttyS2")
       lines.append(f"sleep {FPS_DELAY:.3f}")
   ```

3. POST to bridge via `scripts/bridge.py:post_to_bridge`.

The `%b` printf directive is the key — it interprets the `\n` escapes that `repr()` puts in the frame literal as real newlines. (Use `%s` if you want literal `\n` instead.)

## Quirks worth knowing

- `repr()` of a multi-line Python string wraps the whole thing in single quotes and escapes internal newlines as `\n` — that's why we use `%b`, not `%s`.
- bash `printf` requires `\xHH` (two hex digits) — `\x1b[H\x1b[2J` works because `\x1b` is exactly two hex digits.
- The bridge runs `subprocess.run(argv)` directly — there's no shell interpolation. So everything dangerous goes inside the bash `-c` script as one big quoted string.
- A bridge call with a multi-thousand-line bash script takes 20+ seconds of wall clock; set `run_script` timeout accordingly.
