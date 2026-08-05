# SAMPLMAN - Topic — full channel dump (all 65 videos)

All 65 YouTube IDs from the **SAMPLMAN - Topic** YouTube channel (channel ID `UCcxS3mHY3ITjmLv5M00lCpQ`). Enumerated via `yt-dlp --no-check-certificates --flat-playlist --print id --print title --print duration --print url` on rock1 on 2026-08-05; all 65 verified accessible via `yt-dlp --no-check-certificates --skip-download --print title --print id --print duration`.

This is the **full-channel dump** archetype — every upload from a single channel, no curation. Distinct from the other example playlists (`playlist-classic-rock.md` / `playlist-upbeat-verified.md` / `playlist-jacob-collier.md` / `playlist-lofi-verified.md`) which are hand-picked by genre/mood. Use this archetype when you want to ingest a whole artist's catalog in one shot.

**Total runtime:** 157m 27s across 65 tracks. Track durations range from 50s to 5m 44s. Two long-running numbered series — "ITS A BEAUTIFUL DAY FOR A DAY" (15 tracks: ONE through THRTN) and "SEETHROUGH" (11 tracks: 2 through 12) — account for 26 of the 65 uploads.

## Verification status

All 65 videos verified 2026-08-05 on rock1 via `yt-dlp --skip-download`. Zero failures, zero "Video unavailable" errors, zero "live stream recording is not available" (the failure mode that bit the Lofi Girl 24/7 livestream IDs in `playlist-lofi-verified.md`).

## Channel signature

SAMPLMAN's uploads cluster into three groupings:

- **"ITS A BEAUTIFUL DAY FOR A DAY" series** — 15 tracks numbered ONE through THRTN (THIRTEEN). Same song pattern across multiple durations/versions.
- **"SEETHROUGH" series** — 11 tracks numbered 2 through 12. Another long-running series.
- **Standalone cuts** — ALL CAPS titles with periods-as-words ("NEVER.COULD.I.LEAVE.U", "AND.I.WANT.IT.RARE", "POW.HER.PUFF", "FUCKING.SUNDAY"), plus shorter lowercase titles ("jonnyquest", "egos", "be honest", "for my heart").

The aesthetic reads as lo-fi hip-hop / sampled beats / dub production with a heavy stylistic identity. Album-style grouping (15-track series + 11-track series + many standalone cuts) suggests these are EPs rather than scattered singles.

## NOT triggered on rock1

Per the user's explicit directive ("dont start this yet"), this file exists as a permanent example only — the daemon on rock1 is NOT playing these tracks. To queue it later, use the radio-queue skill's standard "Append while the daemon plays" recipe:

```bash
# Verify a sample first (the recipe in SKILL.md)
curl -X POST "$BRIDGE/run" -d '{"command":["bash","-c","yt-dlp --no-check-certificates --skip-download --print title --print id --print duration "https://www.youtube.com/watch?v=7zSZToj9qdc""]}'

# Then append the whole playlist (or pipe from this file via base64 push)
B64=$(base64 -w0 skills/personal-WbtUgeUv/radio-queue/examples/playlist-samplman.md | sed 's/^#.*$//')
curl -X POST "$BRIDGE/run" -d "$(python3 -c "import json; print(json.dumps({'command':['bash','-c',f'printf "%s" \"$(cat /tmp/playlist.b64)\" | base64 -d >> /tmp/audio/queue/queue.txt && wc -l /tmp/audio/queue/queue.txt']}))")"
```

The 65 IDs below are in `yt-dlp --flat-playlist` order (= upload order from newest to oldest on the channel). The prequeue worker will keep the pipeline full across the ~1h 53min total runtime.

## The playlist

Copy-paste any of these lines into `/tmp/audio/queue/queue.txt` on rock1 (one URL per line). Each track is annotated with its position in the channel's upload order and the duration in M:SS format.

```
# 01. Soul.Drips/BrightRooms (3:03) — verified 2026-08-05
https://www.youtube.com/watch?v=7zSZToj9qdc

# 02. ITS A BEAUTIFUL DAY FOR A DAY ELVN (2:32) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=MzMjqSrYdg4

# 03. ITS A BEAUTIFUL DAY FOR A DAY ATE (2:08) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=Lexykmr_D9s

# 04. ITS A BEAUTIFUL DAY FOR A DAY 15 FIFTN (1:56) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=9QpOSt6zEKo

# 05. ITS A BEAUTIFUL DAY FOR A DAY TWELV (0:50) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=3LnxLvpaH6E

# 06. ITS A BEAUTIFUL DAY FOR A DAY TEN (1:06) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=hvU_cZMTIfU

# 07. ITS A BEAUTIFUL DAY FOR A DAY SEVN (3:00) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=mT9CU5-IqXw

# 08. ITS A BEAUTIFUL DAY FOR A DAY NINE (2:27) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=07GjPIdB2Yw

# 09. ITS A BEAUTIFUL DAY FOR A DAY SXTN (2:12) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=jJb23iPAasQ

# 10. ITS A BEAUTIFUL DAY FOR A DAY ONE (1:24) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=tEQy4EIPzAU

# 11. ITS A BEAUTIFUL DAY FOR A DAY FIVE (3:02) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=sj0AoX_BBMQ

# 12. ITS A BEAUTIFUL DAY FOR A DAY FOUR (3:00) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=hcIO5RJNDZ0

# 13. ITS A BEAUTIFUL DAY FOR A DAY FRTN (2:00) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=UUcIEdgDUPU

# 14. ITS A BEAUTIFUL DAY FOR A DAY TWO (0:59) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=ijHuPjLLRkg

# 15. ITS A BEAUTIFUL DAY FOR A DAY SIX (2:08) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=tJEsZTGMgV0

# 16. ITS A BEAUTIFUL DAY FOR A DAY THREE (1:39) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=4Vz3kMz1W0o

# 17. ITS A BEAUTIFUL DAY FOR A DAY THRTN (2:08) — verified 2026-08-05
#   Series note: ITS A BEAUTIFUL DAY FOR A DAY — numbered series (ONE through THRTN). 15 tracks total in this set.
https://www.youtube.com/watch?v=YPS9RKUT_fU

# 18. NEVER.COULD.I.LEAVE.U (2:16) — verified 2026-08-05
https://www.youtube.com/watch?v=G7RviYgn5_k

# 19. AND.I.WANT.IT.RARE (3:10) — verified 2026-08-05
https://www.youtube.com/watch?v=YmJDIOAJBBc

# 20. POW.HER.PUFF (3:57) — verified 2026-08-05
https://www.youtube.com/watch?v=NEHKY-B7Q0Q

# 21. SET.MY.SOUL.ON.FIRE (1:18) — verified 2026-08-05
https://www.youtube.com/watch?v=kJjC8UzGS-Y

# 22. FUCK.YOU.19 (2:44) — verified 2026-08-05
https://www.youtube.com/watch?v=cost5l6-vr4

# 23. HOW.EYE.FEEL (1:45) — verified 2026-08-05
https://www.youtube.com/watch?v=2bfJvk0vlHA

# 24. TELEVISION.DUB (5:18) — verified 2026-08-05
https://www.youtube.com/watch?v=nnjqnzJhzBA

# 25. LISTEN.THERES.BIN (1:26) — verified 2026-08-05
https://www.youtube.com/watch?v=EstQhA09zuQ

# 26. FUCKING.SUNDAY (3:48) — verified 2026-08-05
https://www.youtube.com/watch?v=mognuN8snYk

# 27. WHAT.R.WE.GONNA.DO.UGH (2:04) — verified 2026-08-05
https://www.youtube.com/watch?v=NP6qxy93PLI

# 28. NOT.TRYING.2.HURT.U (2:24) — verified 2026-08-05
https://www.youtube.com/watch?v=95eiAjE5RqM

# 29. ONE.PUNCH.GUY.MAN (3:28) — verified 2026-08-05
https://www.youtube.com/watch?v=QuBv0EeEmQc

# 30. FALLING.FADING.DOWN.I.GO (1:25) — verified 2026-08-05
https://www.youtube.com/watch?v=CGuoKUDBdSE

# 31. WHEN.IM.ALONE.IN.MY.HEAD (2:39) — verified 2026-08-05
https://www.youtube.com/watch?v=rXZ9FGIB42A

# 32. DUBWOP (1:22) — verified 2026-08-05
https://www.youtube.com/watch?v=MZzEd5zMMbE

# 33. SEETHROUGH.8 (1:38) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=qMvQ5jNSAxs

# 34. SEETHROUGH.9 (2:47) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=Qy0SAn20nmk

# 35. SEETHROUGH.2 (1:15) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=VcZv_CkPUtI

# 36. SEETHROUGH.6 (3:58) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=6w7MVxNdHqg

# 37. SEETHROUGH.5 (1:20) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=Pq26R-YSeLk

# 38. SEETHROUGH.3 (1:36) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=2UQM3HC_D24

# 39. SEETHROUGH.10 (1:10) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=A4Jc6EDgVvo

# 40. SEETHROUGH.12 (2:22) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=KUJxstENLbI

# 41. SEETHROUGH.11 (4:49) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=ec3-PtlSyMM

# 42. SEETHROUGH.7 (1:38) — verified 2026-08-05
#   Series note: SEETHROUGH — numbered series (2 through 12). 11 tracks total in this set.
https://www.youtube.com/watch?v=Onwavkg888w

# 43. Who Will Join Me (1:43) — verified 2026-08-05
https://www.youtube.com/watch?v=ifUVdcOT-mM

# 44. Drifting Ughway (3:28) — verified 2026-08-05
https://www.youtube.com/watch?v=P2uJL2nk4TM

# 45. Roadee (1:52) — verified 2026-08-05
https://www.youtube.com/watch?v=wOTXvr5fzBA

# 46. Due DILLA Gence Thank You (3:37) — verified 2026-08-05
https://www.youtube.com/watch?v=sedHb-hyDOU

# 47. Denise Flip (5:44) — verified 2026-08-05
https://www.youtube.com/watch?v=_2FZlTUuK0w

# 48. Not In It For The Bars (1:40) — verified 2026-08-05
https://www.youtube.com/watch?v=j5nfpcHEw74

# 49. Sined Chord (1:38) — verified 2026-08-05
https://www.youtube.com/watch?v=bDqBKONUtFA

# 50. Love Or Wudeva (2:46) — verified 2026-08-05
https://www.youtube.com/watch?v=7Eo5U4cVNpg

# 51. Air Doom Peace (2:26) — verified 2026-08-05
https://www.youtube.com/watch?v=kWJlChmARWk

# 52. I Loov You (1:34) — verified 2026-08-05
https://www.youtube.com/watch?v=8LKbm-6RS8Q

# 53. Space Cowaboy (1:14) — verified 2026-08-05
https://www.youtube.com/watch?v=6O7oe7V6tDM

# 54. Hungry Belly (3:12) — verified 2026-08-05
https://www.youtube.com/watch?v=ur9AN_2xNOI

# 55. Some Keys (2:24) — verified 2026-08-05
https://www.youtube.com/watch?v=_YOwV-OJy5s

# 56. jonnyquest (2:56) — verified 2026-08-05
https://www.youtube.com/watch?v=r9sXj7UqR5I

# 57. ughchkaugh (2:14) — verified 2026-08-05
https://www.youtube.com/watch?v=tlS4yoerbhY

# 58. egos (2:03) — verified 2026-08-05
https://www.youtube.com/watch?v=SzBE55-_-h0

# 59. be honest (3:29) — verified 2026-08-05
https://www.youtube.com/watch?v=CcbICl7pX5Y

# 60. for my heart (3:39) — verified 2026-08-05
https://www.youtube.com/watch?v=I8Tyxnf2Syo

# 61. That's it go to your room (1:22) — verified 2026-08-05
https://www.youtube.com/watch?v=iJ7xgLA0JZA

# 62. ???? (3:05) — verified 2026-08-05
https://www.youtube.com/watch?v=uMoUhgd-R3Q

# 63. great day doomy (2:32) — verified 2026-08-05
https://www.youtube.com/watch?v=Wxkx7ZU8_EQ

# 64. how much time/death of the heart (2:48) — verified 2026-08-05
https://www.youtube.com/watch?v=LECU5Bcf6Mw

# 65. absence of consciousness (2:50) — verified 2026-08-05
https://www.youtube.com/watch?v=aeJ4PgdXDlo
```

## Why this archetype exists

Other example playlists are *curator's picks* — small, hand-selected sets of tracks that fit a mood or genre. This file is different: it's a *catalog* — every track, in upload order. When a user says "play me everything by X" or "ingest the full discography of Y," this is the template. The downside is the playlist is long (~1h 53min) and unscreened — the user gets every track, including weaker ones. The upside is completeness.

If you want to subset this kind of catalog, the cleanest path is: copy this file to a new example (e.g. `playlist-samplman-top-10.md`), pick the 10 you want, and add a curator's note explaining the selection criteria. Don't mutate this file in place.

## Verification history

- 2026-08-05 — initial enumeration + verification; `yt-dlp --flat-playlist` returned 65 entries; `yt-dlp --skip-download --print title --print id --print duration` confirmed all 65 are accessible (zero failures). File created as a permanent example only — NOT triggered on rock1 per the user's "dont start this yet" directive.
