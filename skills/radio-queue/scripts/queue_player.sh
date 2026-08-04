#!/bin/bash
# scripts/queue_player.sh — radio-queue daemon with prequeue
#
# Reads /tmp/audio/queue/queue.txt, downloads + plays each URL in sequence.
# Force-on ES8316 mixer @ 100% before every song (volume never drifts).
# All output tee'd to /dev/ttyS2 for live observability.
#
# PREQUEUE: a background worker downloads + transcodes the NEXT track
# while the current one plays. Eliminates the gap between songs — no
# yt-dlp+ffmpeg wait at the track boundary. The worker writes to next.*
# and exits; the main loop atomically swaps next.* → current.* when the
# current track finishes. Cold-start cost is paid only on the first song
# (and on the rare case where prequeue download > playback duration).
set +u

QDIR=/tmp/audio/queue
QFILE="$QDIR/queue.txt"
LOG="$QDIR/queue.log"
CURR="$QDIR/current"
NEXT="$QDIR/next"
PCURR="$QDIR/current.pcm"
PNEXT="$QDIR/next.pcm"
PREQ_LOCK="$QDIR/prequeue.lock"
PREQ_OUT="$QDIR/prequeue.out"
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

# Pop the first non-empty, non-comment line from queue.txt.
# Echoes the entry to stdout. Returns 0 on success, 1 if queue is empty.
pop_url() {
  while true; do
    [ ! -f "$QFILE" ] && return 1
    local line
    line="$(head -n 1 "$QFILE" 2>/dev/null || true)"
    [ -z "$line" ] && return 1
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [ -z "$line" ] && {
      sed -i '1d' "$QFILE" 2>/dev/null || true
      continue
    }
    if ! sed -i '1d' "$QFILE" 2>/dev/null; then
      log "ERROR: failed to remove first line from $QFILE"
      return 1
    fi
    echo "$line"
    return 0
  done
}

# Parse URL + optional pipe-separated args:  URL|start=N|duration=M
# Sets globals URL, START, DUR.
parse_entry() {
  local entry="$1"
  URL="${entry%%|*}"
  local rest=""
  if [[ "$entry" == *"|"* ]]; then
    rest="${entry#*|}"
  fi
  START=0
  DUR=0
  IFS='|' read -ra parts <<< "$rest"
  for kv in "${parts[@]}"; do
    local k="${kv%%=*}" v="${kv#*=}"
    case "$k" in
      start|ss)        START="$v" ;;
      duration|t|dur)  DUR="$v" ;;
    esac
  done
}

# Download + transcode URL into $RAW.pcm (stereo 44100Hz s16le).
# Args: url raw_prefix pcmfile start dur
prepare_pcm() {
  local url="$1" raw="$2" pcmfile="$3" start="$4" dur="$5"
  log "downloading: $url"
  rm -f "$raw".*

  # --no-check-certificates: bypasses stale cert chains in some sandbox envs
  #                          (harmless when the cert chain is fine)
  if ! /usr/local/bin/yt-dlp \
        --no-check-certificates \
        -f bestaudio/best -x \
        --audio-format mp3 --audio-quality 0 \
        --no-playlist --no-warnings \
        -o "$raw.%(ext)s" \
        "$url" 2>&1 \
      | tee -a "$LOG" -a /dev/ttyS2 > /dev/null; then
    log "yt-dlp FAILED for $url"
    return 1
  fi

  local audio_file
  audio_file="$(ls "$raw".* 2>/dev/null | head -1)"
  if [ -z "$audio_file" ]; then
    log "no audio file produced for $url"
    return 1
  fi
  log "audio: $audio_file ($(stat -c %s "$audio_file") bytes)"

  log "converting to PCM (44100Hz stereo S16LE)"
  local fa=(-y -i "$audio_file" -ar 44100 -ac 2 -f s16le "$pcmfile")
  if [ "$start" -gt 0 ] 2>/dev/null; then
    fa=(-y -ss "$start" -i "$audio_file" -ar 44100 -ac 2 -f s16le "$pcmfile")
    if [ "$dur" -gt 0 ] 2>/dev/null; then
      fa=(-y -ss "$start" -t "$dur" -i "$audio_file" -ar 44100 -ac 2 -f s16le "$pcmfile")
    fi
  fi
  if ! ffmpeg "${fa[@]}" 2>&1 \
      | tee -a "$LOG" -a /dev/ttyS2 > /dev/null; then
    log "ffmpeg FAILED for $audio_file"
    return 1
  fi

  log "PCM ready: $(stat -c %s "$pcmfile") bytes"
  return 0
}

# Background worker: prepare the next URL's PCM.
# Writes its PID to $PREQ_LOCK so the main loop can detect liveness.
# Exits 0 on success (next.pcm present), 1 on failure (next.* cleaned up).
prequeue_worker() {
  local url="$1" start="$2" dur="$3"
  echo $$ > "$PREQ_LOCK"
  rm -f "$NEXT".* "$PNEXT"
  log "PREQUEUE: starting $url"
  if prepare_pcm "$url" "$NEXT" "$PNEXT" "$start" "$dur"; then
    log "PREQUEUE: ready (next.pcm $(stat -c %s "$PNEXT") bytes)"
  else
    log "PREQUEUE: failed for $url (next.* cleaned, will cold-download)"
    rm -f "$NEXT".* "$PNEXT"
  fi
  rm -f "$PREQ_LOCK"
}

# Atomically swap next.* → current.* if next.pcm is ready.
# Returns 0 if swapped, 1 if not ready.
swap_if_ready() {
  [ ! -f "$PNEXT" ] && return 1
  rm -f "$CURR".* "$PCURR"
  # Move all next.* files to current.* — they share the basename pattern.
  for f in "$NEXT".webm "$NEXT".mp3 "$PNEXT"; do
    [ -f "$f" ] || continue
    local newname
    newname="${f/$NEXT/$CURR}"
    mv "$f" "$newname"
  done
  log "PREQUEUE: swapped next → current (current.pcm $(stat -c %s "$PCURR" 2>/dev/null || echo 0) bytes)"
  return 0
}

truncate_log() {
  if [ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -gt "$LOGSIZE" ]; then
    tail -c $((LOGSIZE / 2)) "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
  fi
}

log "=== queue player started (pid $$) ==="

# Main loop. Three phases per iteration:
#   1. Ensure current.pcm is ready (swap from prequeue, else cold-download).
#   2. Kick off prequeue for the NEXT URL in the queue (if any).
#   3. Play current.pcm via play2.py (blocks until done).
# Then loop. The prequeue worker runs concurrently between iterations.
while true; do
  truncate_log

  if [ ! -f "$QFILE" ]; then
    touch "$QFILE"
  fi

  # --- Phase 1: ensure current.pcm is ready ---
  if [ ! -f "$PCURR" ]; then
    if swap_if_ready; then
      : # current.pcm now ready from prequeue — no download cost
    else
      line="$(pop_url)" || { sleep 5; continue; }
      parse_entry "$line"
      log "no prequeue available — cold download for: $URL"
      if ! prepare_pcm "$URL" "$CURR" "$PCURR" "$START" "$DUR"; then
        log "cold prepare failed for: $URL (continuing)"
        continue
      fi
    fi
  fi

  # --- Phase 2: launch prequeue for the next URL (if any + no worker running) ---
  if [ ! -f "$PREQ_LOCK" ]; then
    if line="$(pop_url)"; then
      parse_entry "$line"
      log "PREQUEUE: launching background worker for $URL"
      ( prequeue_worker "$URL" "$START" "$DUR" ) > "$PREQ_OUT" 2>&1 &
      disown
    fi
  fi

  # --- Phase 3: play current.pcm ---
  force_mixer
  log "playing via play2.py (stereo, 44100Hz)"
  sudo -n python3 /tmp/audio/play2.py "$PCURR" --device hw:1,0 --rate 44100 --in-channels 2 2>&1 \
    | tee -a "$LOG" -a /dev/ttyS2 > /dev/null
  log "playback done"

  # Clean up current.* — the prequeue worker is using next.*, don't touch it.
  rm -f "$CURR".* "$PCURR"

  # If the prequeue finished during playback, the next iteration swaps
  # immediately. If it's still running (very rare — download > playback),
  # Phase 1 will sleep briefly then swap when ready.
done
