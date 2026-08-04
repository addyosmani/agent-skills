#!/bin/bash
# scripts/queue.sh — CLI helper for the radio-queue daemon
# Usage:
#   queue.sh add URL [|start=N|duration=M]      # append a song
#   queue.sh list                              # print queue.txt
#   queue.sh clear                             # empty the queue (kills any running prequeue)
#   queue.sh status                            # queue + current playback + prequeue state + tail of log
#   queue.sh skip                              # kill current play2.py (next song starts)
#   queue.sh stop                              # kill the daemon + any prequeue worker
set -euo pipefail

QDIR=/tmp/audio/queue
QFILE="$QDIR/queue.txt"
LOG="$QDIR/queue.log"
PREQ_LOCK="$QDIR/prequeue.lock"
PREQ_OUT="$QDIR/prequeue.out"
PCURR="$QDIR/current.pcm"
PNEXT="$QDIR/next.pcm"

ACTION="${1:-status}"
shift || true

usage() {
  cat >&2 <<EOF
usage: queue.sh <command> [args]

  add URL [|start=N|duration=M]   Append a YouTube URL to the queue
  list                           Print queue.txt
  clear                          Empty queue.txt (kills any running prequeue)
  status                         Queue + current playback + prequeue state + last log lines
  skip                           Kill current play2.py — next song starts now
  stop                           Stop the daemon + any prequeue worker
EOF
  exit 2
}

case "$ACTION" in
  add)
    [ $# -lt 1 ] && usage
    printf '%s\n' "$*" >> "$QFILE"
    echo "queued: $*"
    ;;
  list|cat)
    if [ -f "$QFILE" ]; then
      cat "$QFILE"
    else
      echo "(no queue file yet — daemon not started?)"
    fi
    ;;
  clear)
    # Kill any running prequeue worker first so it doesn't keep churning.
    if [ -f "$PREQ_LOCK" ]; then
      pid="$(cat "$PREQ_LOCK" 2>/dev/null || true)"
      [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
      rm -f "$PREQ_LOCK" "$PREQ_OUT" "$PNEXT" "$QDIR"/next.webm "$QDIR"/next.mp3
    fi
    : > "$QFILE"
    echo "queue cleared"
    ;;
  status)
    echo "=== queue.txt ==="
    if [ -f "$QFILE" ]; then cat "$QFILE"; else echo "(no queue file)"; fi
    echo
    echo "=== current playback ==="
    ps -ef | grep -E 'queue_player|play2\.py|yt-dlp|ffmpeg' | grep -v grep || echo "(none)"
    echo
    echo "=== prequeue ==="
    if [ -f "$PREQ_LOCK" ]; then
      pid="$(cat "$PREQ_LOCK" 2>/dev/null || echo unknown)"
      echo "worker PID: $pid (background download for next track)"
      [ -f "$PNEXT" ] && echo "next.pcm: $(stat -c %s "$PNEXT") bytes (ready to swap)"
    else
      if [ -f "$PNEXT" ]; then
        echo "next.pcm ready ($(stat -c %s "$PNEXT") bytes) — no live worker"
      else
        echo "(idle — no prequeue in flight, no next.pcm prepared)"
      fi
    fi
    echo
    echo "=== last 10 log lines ==="
    if [ -f "$LOG" ]; then tail -10 "$LOG"; else echo "(no log)"; fi
    ;;
  skip)
    pkill -KILL -f 'play2\.py.*current\.pcm' 2>/dev/null || true
    echo "skipped current song"
    ;;
  stop)
    pkill -TERM -f queue_player.sh 2>/dev/null || true
    sleep 1
    pkill -KILL -f queue_player.sh 2>/dev/null || true
    pkill -KILL -f 'play2\.py.*current\.pcm' 2>/dev/null || true
    if [ -f "$PREQ_LOCK" ]; then
      pid="$(cat "$PREQ_LOCK" 2>/dev/null || true)"
      [ -n "$pid" ] && kill -KILL "$pid" 2>/dev/null || true
      rm -f "$PREQ_LOCK"
    fi
    echo "queue player stopped"
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "unknown command: $ACTION" >&2
    usage
    ;;
esac
