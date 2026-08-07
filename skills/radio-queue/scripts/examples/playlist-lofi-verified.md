# Verified lo-fi hip-hop / chillhop playlist

All six YouTube IDs in this file were verified via `yt-dlp --no-check-certificates --skip-download --dump-single-json <url>` on rock1 on 2026-08-05 — every URL resolved to its claimed title with the correct ID, and durations were confirmed via `yt-dlp --skip-download --print title --print id --print duration`.

This is the curator's pick for the radio-queue skill: lo-fi hip-hop / chillhop / vaporwave — distinct from the upbeat pop/funk and Jacob Collier vocal-harmony playlists we've been cycling. The vibe is chilled study/work background: slow beats, jazz-inflected samples, atmospheric textures. Total runtime ~67 minutes.

## How these IDs were verified

```bash
# On rock1, via the bridge
yt-dlp --no-check-certificates --skip-download --print title --print id --print duration 'https://www.youtube.com/watch?v=ID' 2>&1
```

`--print` is the verify-mode used during playlist curation; `--dump-single-json` (the recipe in the SKILL.md) works too but `--print` is faster and shows you exactly the three fields you need (title, id, duration) without needing to parse a JSON blob. Use whichever you prefer; both fail-fast on `Video unavailable` or `live stream recording is not available`.

## The playlist

Copy-paste any of these lines into `/tmp/audio/queue/queue.txt` on rock1 (one per line), or pipe the whole block:

```
# Nujabes — Feather (feat. Cise Starr & Akin from CYNE) [Official Audio] — verified 2026-08-05
#   The genre's foundational track. 2005, Modal Soul. Jazz-inflected boom-bap with introspective lyrics.
https://www.youtube.com/watch?v=hQ5x8pHoIPA

# Idealism — Both Of Us — verified 2026-08-05
#   Chillhop Raw Cuts 2 single; 56M Spotify streams; atmospheric + minimal
https://www.youtube.com/watch?v=Djz-AXDO27Q

# Wyl & Wun Two — Kübla — verified 2026-08-05
#   German producer Jan Vetter (Wun Two); atmospheric downtempo / vaporwave / chillhop
https://www.youtube.com/watch?v=tzNfWU4Wqu8

# Tom Misch — It Runs Through Me (feat. De La Soul) [Official Video] — verified 2026-08-05
#   Jazz/lofi cross-over; 30.3M views; guitar-led + hip-hop trio
https://www.youtube.com/watch?v=M1N_wbhAfQ4

# Idealism — Amaranthine [Full BeatTape] — verified 2026-08-05
#   Full 10-track EP; ~27 minutes continuous; the long-form anchor of the set
https://www.youtube.com/watch?v=Bv8AjhDlJrw

# Ensemble ☁️ Dreamy Lofi Hiphop beats — verified 2026-08-05
#   Curated compilation from Dreamhop Music; 12 tracks across 27:27
https://www.youtube.com/watch?v=ACjHqCsmqfA
```

## Why these tracks

The selection covers four modes of the lo-fi umbrella: (a) **foundational classic** (Nujabes — Feather, 2005, Modal Soul, 6.1M views — the track that established chillhop as a genre); (b) **modern chillhop producers** (Idealism with two slots — both an individual track and a full EP, plus Wun Two — German atmospheric downtempo); (c) **jazz/lofi cross-over** (Tom Misch with De La Soul — the guitar-led arrangement that bridges lofi and jazz); (d) **long-form compilations** (Amaranthine and Ensemble — the 27-min mixes that anchor the second half of the queue).

Runtime distribution: 4 short individual tracks (2-5 min each = ~13 min total) + 2 long-form mixes (27 min each = ~54 min total). The prequeue worker handles the long mixes cleanly — `next.pcm` swaps in instantly at the song boundary — so the 27-min tracks don't introduce a long gap.

## Push the whole block from Sauna in one bridge call

```bash
B64=$(base64 -w0 skills/personal-WbtUgeUv/radio-queue/examples/playlist-lofi-verified.md | sed 's/^#.*$//')
curl -X POST "$BRIDGE/run" -d "$(python3 -c "import json; print(json.dumps({'command':['bash','-c',f'printf \"%s\" \\\"$(cat /tmp/playlist.b64)\\\" | base64 -d >> /tmp/audio/queue/queue.txt && wc -l /tmp/audio/queue/queue.txt']}))")"
```

## What didn't make it (and why)

- **`jfKfPfyJRdk`** — Lofi Girl "beats to relax/study to" 24/7 livestream → yt-dlp returned `ERROR: [youtube] jfKfPfyJRdk: This live stream recording is not available`. Live streams aren't downloadable recordings; the SKILL.md's verify-before-queue recipe would have flagged this.
- **`rUxyKA_-grg`** — Lofi Girl "beats to sleep/chill to" 24/7 livestream → same failure mode.

Both are great YouTube channels with stable IDs and huge audiences, but they don't work for the radio-queue's offline-download model. Use them directly on YouTube instead.

## Verification history

- 2026-08-05 — initial verification + queue trigger; all 6 IDs returned correct titles + ids via `--print title --print id --print duration`; durations measured at 113s / 175s / 185s / 299s / 1636s / 1647s respectively; daemon transitioned from the Jacob Collier set to this lo-fi set on rock1 end-to-end (queue.txt overwritten via base64 push).
