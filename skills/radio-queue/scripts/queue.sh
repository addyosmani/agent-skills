#!/bin/bash
# scripts/queue.sh — CLI helper for the radio-queue daemon
# Usage:
#   queue.sh add URL [|start=N|duration=M]      # append a song
#   queue.sh list                              # print queue.txt
#   queue.sh clear                             # empty the queue
#   queue.sh status                            # queue + current playback + tail of log
#   queue.sh skip                              # kill current play2.py (next song starts)
#   queue.sh stop                              # kill the daemon
set -euo pipefail

QDIR=/tmp/audio/queue
QFILE="$QDIR/queue.txt"
LOG="$QDIR/queue.log"

ACTION="${1:-status}"
shift || true

usage() {
  cat >&2 <<EOF
usage: queue.sh <command> [args]

  add URL [|start=N|duration=M]   Append a YouTube URL to the queue
  list                           Print queue.txt
  clear                          Empty queue.txt (next song plays, then idle)
  status                         Queue + current playback + last log lines
  skip                           Kill current play2.py — next song starts now
  stop                           Stop the daemon
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
