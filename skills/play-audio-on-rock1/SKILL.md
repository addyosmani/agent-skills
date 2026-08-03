---
name: play-audio-on-rock1
description: "Generate short audio clips via ElevenLabs and play them on rock1's audio outputs through the rock1 shell bridge — pure-stdlib ctypes→ALSA Python player (no apt install needed), with one-shot and loop playback, mixer state inspection, and mixer control (unmute + set volume). Includes /dev/ttyS2 banner tee for live observability. Use when 'play audio on rock1', 'make rock1 beep', 'loop a clip on rock1', 'check audio device on rock1', 'set volume on rock1', 'alsa mixer rock1', or 'es8316 control'."
license: MIT
compatibility: "Requires Python 3.8+ stdlib on rock1, libasound2 installed (Ubuntu default), shant user with sudo NOPASSWD or audio-group membership, and the rock1 shell bridge connection (conn_6rp6oRY9DBJG). Tested on rock1 — Pine64 RockPro64, Ubuntu 26.04 aarch64, kernel k7.0.0-28-generic, ES8316 codec on card 1."
---

# Play Audio on rock1

Generate short audio clips remotely and play them on rock1's audio hardware over the shell bridge — no apt install needed.

## Why this exists

rock1 has audio hardware (HDMI I2S + ES8316 codec on the 3.5mm jack) but ships without audio CLI tools — no `aplay`, no `ffmpeg`, no `amixer`. Installing `alsa-utils` is fine for a permanent box but slow for an experiment loop. This skill ships a pure-stdlib `ctypes→libasound.so.2` path that runs from `python3 /tmp/audio/play.py /tmp/audio/clip.pcm` with zero install — same pattern as `ascii-uart-animator` for the UART side.

The shell bridge normally ferries argv for CLI debug; this skill ferries **raw PCM audio bytes** end-to-end: ElevenLabs sound-generation → Sauna sandbox → base64 chunked over the bridge → rock1 /tmp/ → ctypes→ALSA → Analog (3.5mm) output.

## Audio hardware on rock1

| Card | id | PCM | Mixer |
|---|---|---|---|
| 0 | `hdmisound` | `hw:0,0` | none (HDMI digital passthrough) |
| 1 | `Analog` | `hw:1,0` | ES8316 codec, 35 mixer elements |

The typical target is `hw:1,0` (Analog/3.5mm jack). **The Analog device only accepts stereo** — mono input must be expanded to L=R inline; the player does this automatically.

## Quick start

### 1. Generate a clip (Sauna side)

```typescript
const res = await fetch(
  "https://sauna.local/v1/elevenlabs/v1/sound-generation?output_format=pcm_22050",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "a short futuristic sonar ping with a soft descending tail",
      duration_seconds: 2,
    }),
  }
);
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync("session/rock1-clip.pcm", buf);
```

Raw PCM (S16LE mono) — no MP3 decode needed on either side.

### 2. Transfer the clip + the player to rock1

The PCM is ~176KB raw / ~235KB base64 for a 4s clip. Transfer in 4 chunks of base64 (~59KB each) — first chunk uses `tee` (truncate or create), subsequent chunks use `tee -a` (append). Use the same pattern for `scripts/play.py` (~5KB — single transfer fine):

```bash
# First chunk (creates the file):
printf '%s' '[b64]' | base64 -d | tee /tmp/audio/clip.pcm
# Subsequent chunks (append):
printf '%s' '[b64-2]' | base64 -d | tee -a /tmp/audio/clip.pcm
```
### 3. Play through `hw:1,0`

```bash
sudo -n python3 /tmp/audio/play.py /tmp/audio/clip.pcm --device hw:1,0
```

That's it. The player expands mono→stereo inline, opens ALSA, writes frames, drains, closes.

## Recipes

### Loop N times with /dev/ttyS2 banners

```bash
for i in 1 2 3 4 5 6 7; do
  printf '=== [%s] play %d/7 START ===\n' "$(date -u +%H:%M:%S)" "$i" | tee -a /dev/ttyS2
  sudo -n python3 /tmp/audio/play.py /tmp/audio/clip.pcm --device hw:1,0 |& tee -a /dev/ttyS2
  rc=${PIPESTATUS[0]}
  printf '=== [%s] play %d/7 END rc=%d ===\n' "$(date -u +%H:%M:%S)" "$i" "$rc" | tee -a /dev/ttyS2
done
```

### Inspect ALSA devices + current volumes

```bash
sudo -n python3 /tmp/audio/inspect.py
```

Lists cards (from `/sys/class/sound`), PCM streams (from `/proc/asound/pcm`), and **every mixer control with current values**: name, playback volume (per channel %), playback mute state, capture volume. Output uses `/sys` for card enumeration (always works) and a defensive `ctypes→libasound.so.2` loop for mixer state.

### Set mixer state (volume + mute)

Edit the `MUTE_UNSET` and `VOL100` sets near the top of `scripts/set_mixer.py` to match what you want to change, then:

```bash
sudo -n python3 /tmp/audio/set_mixer.py
```

Returns `rc=0` for each successful change and re-verifies by re-reading. Default targets: un-mute `Left/Right Headphone Mixer *DAC`, set `Headphone` + `Headphone Mixer` + `DAC` to 100%.

## Files in this skill

- `SKILL.md` — this file
- `scripts/play.py` — ctypes PCM player (mono→stereo aware)
- `scripts/inspect.py` — ALSA device + mixer inspector
- `scripts/set_mixer.py` — mixer state setter

All three are pure Python 3 stdlib + `ctypes→libasound.so.2`. No `pip install` on rock1. The full folder (4 files) gets pushed to both `yubi-OS/agent-skills` and `yubi-OS/yubiOS`.

## Quirks

- **Mono→stereo expansion**: `hw:1,0` rejects mono. The player expands each mono sample to L=R stereo on the fly. Generate stereo PCM directly (`output_format=pcm_22050` is mono; pass `--in-channels 2` if you have stereo input).
- **sudo vs audio group**: shant isn't in the audio group on rock1 by default. Either `sudo usermod -aG audio shant` (then restart the bridge to pick up the new group) or use `sudo -n` (root bypasses group via `CAP_DAC_OVERRIDE`).
- **Mixer state is in-memory**: ES8316 driver state resets on reboot. Run `sudo alsactl store -f /var/lib/alsa/asound.state` to persist.
- **The "DAC at 0% but audio plays" quirk**: ES8316 auto-enables the I2S→DAC→HP path on `snd_pcm_open`, ignoring muted-mixer state until something else changes it. Playback works even when mixer controls report off — `set_mixer.py` forces them on so the path stays alive across `snd_pcm_close`.
- **PCM transfer size**: bridge POST bodies are fine up to ~240KB JSON. For clips longer than ~8s, chunk into ~60KB base64 chunks. Each chunk uses `printf '%s' '[b64]' | base64 -d | tee -a /tmp/audio/clip.pcm` (first chunk uses `tee` to truncate or create; subsequent chunks use `tee -a` to append).
- **`idx=0` across all mixer elements**: cosmetic quirk of the ES8316 selem layout — every element reports index 0 in `snd_mixer_selem_get_index`. Names + values are correct; ignore the index.
- **`snd_mixer_selem_get_name` returns `const char*` directly** (one arg, no buffer, no rc). Setting argtypes to `[c_void_p, c_char_p]` and treating the return as an int is a common bug — `inspect.py` uses the correct signature.

## Anti-patterns

- **Don't apt install alsa-utils** unless you need it persistently. The ctypes path works without it; saves 30s+ per install round-trip.
- **Don't send the full PCM as one argv** — chunk into base64 ≤ ~60KB each so the bridge stays under any practical argv limit.
- **Don't trust the "DAC at 0%" reading alone** — the ES8316 driver ignores the muted state until you actually play. Run `set_mixer.py` to force-on before relying on `aplay`-style usage.
- **Don't tee player stdout with `%s`** — use `printf '...\n'` (or `printf '%b'` if you need `\n` interpreted). `%s` will print literal `\n` to the UART.

## Pairs with

- `debug-with-cli` — the shell bridge pattern this skill relies on
- `ascii-uart-animator` — same rock1 + UART tee pattern, different sink (`/dev/ttyS2` for visual frames, `/dev/snd` for audio frames)
- `elevenlabs` — for `sound-generation` and `text-to-speech` endpoints (Sauna-side audio generation)
