#!/bin/bash
# scripts/queue_player.sh — radio-queue daemon
# Reads /tmp/audio/queue/queue.txt, downloads + plays each URL in sequence.
# Force-on ES8316 mixer @ 100% before every song (volume never drifts).
# All output tee'd to /dev/ttyS2 for live observability.
set +u

QDIR=/tmp/audio/queue
QFILE="$QDIR/queue.txt"
LOG="$QDIR/queue.log"
PCM="$QDIR/current.pcm"
RAW="$QDIR/current"
LOGSIZE=200000   # truncate log when it exceeds this

mkdir -p "$QDIR"

log() {
  # Format: [HH:MM:SS UTC] message  →  tee to log file + /dev/ttyS2 + discard stdout
  printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" \
    | tee -a "$LOG" -a /dev/ttyS2 > /dev/null
}

force_mixer() {
  log "locking mixer @ 100%"
  sudo -n python3 /tmp/audio/set_mixer.py 2>&1 \
    | tee -a "$LOG" -a /dev/ttyS2 > /dev/null
}

play_one() {
  local entry="$1"
  # Strip comments (everything from # onwards) and trim whitespace.
  entry="${entry%%#*}"
  entry="$(echo "$entry" | xargs)"
  [ -z "$entry" ] && return 0

  # Parse URL + optional pipe-separated args:  URL|start=N|duration=M
  local url="${entry%%|*}"
  local rest=""
  if [[ "$entry" == *"|"* ]]; then
    rest="${entry#*|}"
  fi
  local start=0 dur=0
  IFS='|' read -ra parts <<< "$rest"
  for kv in "${parts[@]}"; do
    local k="${kv%%=*}" v="${kv#*=}"
    case "$k" in
      start|ss)    start="$v" ;;
      duration|t|dur) dur="$v" ;;
    esac
  done

  log "downloading: $url"
  rm -f "$RAW".*

  # --no-check-certificates: bypasses stale cert chains in some sandbox envs
  #                          (harmless when the cert chain is fine)
  if ! /usr/local/bin/yt-dlp \
        --no-check-certificates \
        -f bestaudio/best -x \
        --audio-format mp3 --audio-quality 0 \
        --no-playlist --no-warnings \
        -o "$RAW.%(ext)s" \
        "$url" 2>&1 \
      | tee -a "$LOG" -a /dev/ttyS2 > /dev/null; then
    log "yt-dlp FAILED for $url"
    return 1
  fi

  local audio_file
  audio_file="$(ls "$RAW".* 2>/dev/null | head -1)"
  if [ -z "$audio_file" ]; then
    log "no audio file produced for $url"
    return 1
  fi
  log "audio: $audio_file ($(stat -c %s "$audio_file") bytes)"

  log "converting to PCM (44100Hz stereo S16LE)"
  local fa=(-y -i "$audio_file" -ar 44100 -ac 2 -f s16le "$PCM")
  if [ "$start" -gt 0 ] 2>/dev/null; then
    fa=(-y -ss "$start" -i "$audio_file" -ar 44100 -ac 2 -f s16le "$PCM")
    if [ "$dur" -gt 0 ] 2>/dev/null; then
      fa=(-y -ss "$start" -t "$dur" -i "$audio_file" -ar 44100 -ac 2 -f s16le "$PCM")
    fi
  fi
  if ! ffmpeg "${fa[@]}" 2>&1 \
      | tee -a "$LOG" -a /dev/ttyS2 > /dev/null; then
    log "ffmpeg FAILED for $audio_file"
    return 1
  fi

  log "PCM ready: $(stat -c %s "$PCM") bytes"
  force_mixer

  log "playing via play2.py (stereo, 44100Hz)"
  sudo -n python3 /tmp/audio/play2.py "$PCM" --device hw:1,0 --rate 44100 --in-channels 2 2>&1 \
    | tee -a "$LOG" -a /dev/ttyS2 > /dev/null

  log "playback done"
  rm -f "$RAW".* "$PCM"
  return 0
}

truncate_log() {
  if [ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -gt "$LOGSIZE" ]; then
    tail -c $((LOGSIZE / 2)) "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
  fi
}

log "=== queue player started (pid $$) ==="

# Main loop: pop URL from queue, download + play, repeat forever.
# When queue is empty, sleep 5s and check again.
while true; do
  truncate_log

  if [ ! -f "$QFILE" ]; then
    touch "$QFILE"
  fi

  local line
  line="$(head -n 1 "$QFILE" 2>/dev/null || true)"
  if [ -z "$line" ]; then
    sleep 5
    continue
  fi

  if ! sed -i '1d' "$QFILE" 2>/dev/null; then
    log "ERROR: failed to remove first line from $QFILE"
    sleep 5
    continue
  fi

  play_one "$line" || log "play_one failed for: $line (continuing)"
done
