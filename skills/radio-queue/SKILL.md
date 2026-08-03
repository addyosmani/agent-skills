---
name: radio-queue
description: "Continuous radio-style music queue on rock1 — install ffmpeg + yt-dlp on-device, append YouTube URLs to /tmp/audio/queue/queue.txt, a daemon downloads each in sequence via yt-dlp, transcodes to raw PCM S16LE **stereo 44100Hz** via ffmpeg (CD quality), and plays through hw:1,0 with the ES8316 mixer locked at 100% before every song. Append songs while the daemon plays — no per-song bridge round-trip. Optional per-line clip args (`|start=N|duration=M`) for sections of long tracks. Use when 'play youtube on rock1', 'queue songs on rock1', 'radio queue on rock1', 'rock1 playlist', 'play a song from youtube', 'stream youtube to rock1', 'add song to queue', 'music on rock1', 'yt-dlp on rock1', 'play next song on rock1', 'build me a playlist', 'queue a song', 'rock1 radio', 'whats playing on rock1', 'stereo on rock1'."
license: MIT
compatibility: "Requires Ubuntu 22.04+ on the target (or any distro with `apt-get` + sudo NOPASSWD), the rock1 shell bridge (e.g. `conn_6rp6oRY9DBJG` → `https://rock1.tail3a04f5.ts.net/run`), and the parent `play-audio-on-rock1` skill deployed — specifically `/tmp/audio/play2.py` (the v2 stereo-aware ALSA PCM player) and `/tmp/audio/set_mixer.py` (the ES8316 mixer-locker)."
---

# Radio Queue on rock1

On-device YouTube → PCM → ALSA playlist. A daemon reads URLs from a file, downloads each, plays it, locks the mixer at 100% before every song so volume never drifts, and waits for the next URL. Append songs with `echo ... >> queue.txt` — no bridge round-trip needed per song.

This is a higher-level variant of [`play-audio-on-rock1`](../play-audio-on-rock1/SKILL.md). That skill covers single-clip generation + transfer + playback; this skill assumes the parent is deployed (player + set_mixer.py at `/tmp/audio/`) and adds on-device downloads + a queue loop on top.

## Why this exists

The parent skill ferries raw PCM over Tailscale Funnel as base64 chunks. Fine for one clip; terrible for a playlist — every song is a dozen bridge calls before playback even starts. Moving downloads to the device means the bridge is only used to *seed* the queue and *observe* it; each song is then a local operation (yt-dlp + ffmpeg + play2.py) with no Funnel round-trip.

The user's voice that drove this: *"is the download happening on device or on your end? make sure its on device so we can just queue a playlist"*.

## Architecture

```
/tmp/audio/queue/
├── queue.txt          # playlist — one URL per line, append anytime
├── queue_player.sh    # daemon (one process)
├── queue.log          # rolling log (also tee'd to /dev/ttyS2)
├── queue.out          # daemon stdout (normally empty)
├── current.webm       # yt-dlp's intermediate download (auto-cleaned)
├── current.mp3        # ffmpeg extraction (auto-cleaned)
└── current.pcm        # ffmpeg's PCM output fed to play2.py (auto-cleaned)
```

Per song:
1. `yt-dlp --no-check-certificates -f bestaudio -x --audio-format mp3` → `current.{webm,mp3}`
2. `ffmpeg -i current.mp3 -ar 44100 -ac 2 -f s16le current.pcm` — **stereo, 44.1 kHz (CD quality)**
3. `sudo -n python3 /tmp/audio/set_mixer.py` — force-on mixer (idempotent, ~1s)
4. `sudo -n python3 /tmp/audio/play2.py current.pcm --device hw:1,0 --rate 44100 --in-channels 2` — play
5. `rm current.*` — clean up

## Quick start (one-shot deploy)

```bash
# 1. Push install.sh + queue_player.sh + queue.sh to rock1 (base64 push, single call)
# 2. Run install.sh on rock1 — installs ffmpeg + yt-dlp + creates /tmp/audio/queue/
# 3. Start the daemon in background (nohup, returns immediately)
# 4. Append your first URL to queue.txt
```

The `scripts/install.sh` handles steps 1-2 idempotently. Push it from Sauna via the bridge:

```bash
# On Sauna side
base64 scripts/install.sh | xargs -I{} curl -X POST "$BRIDGE/run" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"command":["bash","-c","printf %s {} | base64 -d > /tmp/install.sh && sudo -n bash /tmp/install.sh"]}'
```

Then start the daemon and queue your first song:

```bash
# Start daemon (returns immediately, detached via nohup)
curl -X POST "$BRIDGE/run" -d '{"command":["bash","-c",
  "nohup /tmp/audio/queue/queue_player.sh </dev/null >/dev/null 2>&1 & echo detached pid=$!"]}'

# Append the first URL
curl -X POST "$BRIDGE/run" -d '{"command":["bash","-c",
  "echo https://www.youtube.com/watch?v=fJ9rUzIMcZQ >> /tmp/audio/queue/queue.txt"]}'
```

## Recipes

### Append a song while the daemon is playing

```bash
# On Sauna side (one bridge call)
curl -X POST "$BRIDGE/run" -d '{"command":["bash","-c",
  "echo https://www.youtube.com/watch?v=VIDEO_ID >> /tmp/audio/queue/queue.txt"]}'

# On rock1 directly (faster — no bridge)
echo 'https://www.youtube.com/watch?v=VIDEO_ID' >> /tmp/audio/queue/queue.txt
```

### Append with a clip (skip intro, trim to a section)

Per-line pipe-separated args:
```
https://www.youtube.com/watch?v=VIDEO_ID|start=30|duration=120
```
- `start=N` — skip the first N seconds
- `duration=M` — play only M seconds (requires `start`)

Without args, the full song plays.

### List / inspect / clear the queue

Use the `scripts/queue.sh` helper (push it to rock1 first):
```bash
queue.sh list       # cat queue.txt
queue.sh status     # queue + current playback + last log lines
queue.sh clear      # empty queue.txt
queue.sh skip       # kill current play2.py (next song starts immediately)
queue.sh stop       # kill the daemon
queue.sh add URL    # append a URL
```

### Force mixer @ 100% mid-playback

The daemon already does this before every song. If you want it *now* (e.g. after a manual mixer reset):
```bash
sudo -n python3 /tmp/audio/set_mixer.py
```

### Stream the live log over the bridge

```bash
tail -F /tmp/audio/queue/queue.log | tee -a /dev/ttyS2
```

## Files in this skill

- `SKILL.md` — this file
- `scripts/install.sh` — installs ffmpeg + yt-dlp on rock1, creates `/tmp/audio/queue/`
- `scripts/queue_player.sh` — the daemon
- `scripts/queue.sh` — CLI helper (`add` / `list` / `clear` / `status` / `skip` / `stop`)
- `examples/playlist-classic-rock.md` — sample classic-rock URLs to seed a new queue

All scripts are pure bash + standard GNU userland (no Python deps on the device beyond the parent's `play2.py` + `set_mixer.py`).

## Quirks

- **Volume always locked at 100%** — the daemon re-runs `set_mixer.py` before every song. The ES8316 mixer state is in-memory and resets on reboot; without this step the next song can play at low volume or be muted. This is the user-driven design choice after the parent skill was used standalone and produced low-volume output.
- **Bot detection on YouTube** — `yt-dlp` can hit "Sign in to confirm you're not a bot" on some videos. Workarounds in order of intrusiveness: (1) `--extractor-args "youtube:player_client=mediaconnect"` — newer player clients avoid some detection; (2) `--cookies-from-browser firefox` — needs a browser profile on rock1 (not in this skill); (3) `--cookies /tmp/cookies.txt` — export cookies from a desktop browser first. The `--no-check-certificates` flag the daemon uses is unrelated to this; it just handles sandbox-style cert-chain issues on some networks.
- **The yt-dlp source distribution's shebang** — the GitHub `yt-dlp` URL ships a Python zipapp that needs Python 3.10+. `install.sh` rewrites the shebang to whatever `which python3` resolves to (on rock1 that's Python 3.14 — works fine). If you want zero-dependency, download `yt-dlp_aarch64` (the PyInstaller standalone binary) instead — `install.sh` can be edited to swap the URL.
- **5-second idle between songs** — when the queue is empty the daemon sleeps 5s before re-checking. If you append during that window, the song starts on the next poll (worst case 5s latency). For real-time responsiveness, drop the sleep to 1s.
- **One song at a time** — `hw:1,0` is exclusive; the daemon kills no one because nothing else is playing. If you want to interleave with other audio sources, run them on a separate ALSA device or mix them upstream.
- **`sudo -n` is mandatory** — `install.sh` and the daemon call `sudo -n python3 ...` and `sudo -n ffmpeg`; the user must already be in NOPASSWD sudoers. On rock1 this is set for `shant`.
- **Log truncation** — `queue.log` auto-truncates to its last half when it crosses 200 KB. The full history is not preserved; tail it externally if you need it.
- **Errors don't kill the daemon** — if yt-dlp or ffmpeg fails for one song, the daemon logs it and moves on to the next. Failed URLs stay consumed (removed from `queue.txt`) so they don't loop forever.

## Anti-patterns

- **Don't run yt-dlp on Sauna + transfer PCM chunks** — that's the slow path. The whole point of this skill is to keep downloads on-device. Use this skill or extend it; don't bolt yt-dlp onto the parent's chunked-transfer path.
- **Don't `kill -9` the daemon without first killing any in-flight `play2.py`** — the play2.py will keep holding `/dev/snd` until it naturally closes. `pkill -KILL -f play2.py` first, then `pkill -f queue_player.sh`. Or just use `queue.sh stop`.
- **Don't write to `current.pcm` while the daemon is running** — the daemon uses that path as a scratch file. Race conditions are possible.
- **Don't apt install `alsa-utils`** — the parent skill explicitly avoids this to keep the rock1 box clean. We *do* apt-install `ffmpeg` here because there's no stdlib alternative for audio decoding; that's the one trade-off.
- **Don't run the daemon twice** — it will compete for `hw:1,0`. Use `pgrep -af queue_player.sh` to check before starting, or `queue.sh status`.

## Pairs with

- [`play-audio-on-rock1`](../play-audio-on-rock1/SKILL.md) — parent skill. Provides `play2.py` and `set_mixer.py` at `/tmp/audio/`. This skill *requires* those files; deploy the parent first.
- [`debug-with-cli`](../debug-with-cli/SKILL.md) — the shell bridge pattern. This skill uses the bridge to *seed* the queue but never for per-song data transfer.
- `ascii-uart-animator` — same `/dev/ttyS2` banner tee pattern; this skill tees its log lines there so you can watch downloads + playbacks on a serial console.
