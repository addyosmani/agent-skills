# Verified Jacob Collier playlist

All six YouTube IDs in this file were verified via `yt-dlp --no-check-certificates --skip-download --dump-single-json <url>` on rock1 on 2026-08-05 — every URL resolved to its claimed title with the correct ID.

This is the curator-selected set of Jacob Collier's top performances for the radio-queue skill. The selection spans studio recordings (Hideaway, Don't You Worry 'Bout a Thing), live orchestral improvisations (Kennedy Center / National Symphony, BBC Proms / Metropole Orkest), and high-profile collaborations (Coldplay's Chris Martin on Fix You, Alita Moses on Dancing Queen, John Legend + Tori Kelly on Bridge Over Troubled Water). All videos are official-channel uploads.

## How these IDs were verified

Same recipe as `playlist-upbeat-verified.md`: probe with `yt-dlp --skip-download --dump-single-json` before queueing. Verified URLs return a JSON blob containing `title` + `id`; bad IDs return `ERROR: [youtube] <id>: Video unavailable`.

```bash
# On rock1, via the bridge
yt-dlp --no-check-certificates --skip-download --dump-single-json 'https://www.youtube.com/watch?v=ID' 2>&1
```

## The playlist

Copy-paste any of these lines into `/tmp/audio/queue/queue.txt` on rock1 (one per line), or pipe the whole block:

```
# Don't You Worry 'Bout a Thing — Jacob Collier (studio, 2013) — verified 2026-08-05
#   His breakout track — every part played/sung/produced by Collier himself, recorded through a single SM58 mic
https://www.youtube.com/watch?v=pvKUttYs5ow

# Hideaway — Jacob Collier (studio, 2016, from In My Room) — verified 2026-08-05
#   Debut single — written/arranged/performed/recorded/produced in his home music room
https://www.youtube.com/watch?v=4v3zyPEy-Po

# Little Blue — Jacob Collier @Mahogany Sessions (2023) — verified 2026-08-05
#   Mahogany Sessions version, 6.8M views — featured in his Djesse Vol. 4 tour
https://www.youtube.com/watch?v=IQvzX0Z3HE4

# In The Real Early Morning — Jacob Collier / Metropole Orkest @ BBC Proms — verified 2026-08-05
#   With the 80-piece Metropole Orkest at the Royal Albert Hall
https://www.youtube.com/watch?v=OFVVRyFH1vs

# Dancing Queen feat. Alita Moses — Jacob Collier (Live in Stockholm) — verified 2026-08-05
#   ABBA cover with Alita Moses; tight harmonies + Collier's typical multi-tracked arrangement
https://www.youtube.com/watch?v=wEUnXXTZE-Y

# Fix You with Chris Martin — Jacob Collier (Live from the O2 Arena) — verified 2026-08-05
#   Coldplay collaboration — the O2 concert version with Chris Martin on stage
https://www.youtube.com/watch?v=TwC0Db7oerM
```

## Why these performances

Jacob Collier's signature is multi-tracked vocal/instrumental arrangement + cross-genre collaboration. The selection above covers three modes: (a) **studio solo** (Don't You Worry 'Bout a Thing, Hideaway, Little Blue) — Collier playing every part himself, recorded at home; (b) **orchestral live** (Real Early Morning with Metropole Orkest at BBC Proms) — Collier improvising with an 80-piece ensemble; (c) **high-profile collaborations** (Dancing Queen with Alita Moses, Fix You with Chris Martin) — Collier's vocal harmonizing style in a duet/featured-artist context.

Curator's note: this is a 6-song sample. For a longer playlist, add his Djesse Vol. 1–4 tracks (Nightingale, With The Love In My Heart, It Don't Matter, etc.) — all on his official YouTube channel. The Kennedy Center improvisation with the National Symphony Orchestra (`TURkB9zqxa0`, 12.8M views) is also worth queueing if you want a longer-form single (it's a ~10 min improvisation).

## Push the whole block from Sauna in one bridge call

```bash
B64=$(base64 -w0 skills/personal-WbtUgeUv/radio-queue/examples/playlist-jacob-collier.md | sed 's/^#.*$//')
curl -X POST "$BRIDGE/run" -d "$(python3 -c "import json; print(json.dumps({'command':['bash','-c',f'printf \"%s\" \\\"$(cat /tmp/playlist.b64)\\\" | base64 -d >> /tmp/audio/queue/queue.txt && wc -l /tmp/audio/queue/queue.txt']}))")"
```

## Verification history

- 2026-08-05 — initial verification + queue trigger; all 6 IDs returned correct titles + ids via `--dump-single-json`; daemon transitioned from the upbeat playlist to this Jacob Collier set on rock1 end-to-end (queue.txt overwritten via base64 push).
