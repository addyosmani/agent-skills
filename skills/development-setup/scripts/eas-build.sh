#!/bin/bash
# eas-build.sh — build the mobile app on EAS Build, or say why it has to go to AWS (development-setup DS16).
#
# Usage: skills/development-setup/scripts/eas-build.sh <android|ios> [<profile>]     (profile defaults to production)
# Run from the app directory (apps/mobile). EXPO_TOKEN, EAS_FREE_BUILDS (15) and EAS_MAX_QUEUE_MINUTES (30)
# come from the environment or the repository root's .env. Needs node and eas-cli (or npx).
#
#   exit 0  built on EAS; prints {"platform","build_id","status","artifact_url"} on stdout
#   exit 4  the month's free builds for this platform are used up: build on AWS
#   exit 5  the queue wait passed EAS_MAX_QUEUE_MINUTES; the EAS build was canceled: build on AWS
#   exit 1  the build failed or was canceled on EAS; prints the error code and message: read the logs, report the
#           reason, and fix it on EAS if it is the app's; move to AWS or local only when the user decides so
# Builds counted: every build of this platform started since the 1st of the month, UTC. Status goes to stderr.
set -e
PLATFORM="${1:-}"
PROFILE="${2:-production}"
case "$PLATFORM" in android|ios) ;; *) sed -n '4p' "$0" | sed 's/^# //' >&2; exit 2 ;; esac
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
[ -f "$ROOT/.env" ] && [ -z "${EXPO_TOKEN:-}" ] && { set -a; . "$ROOT/.env"; set +a; }
[ -n "${EXPO_TOKEN:-}" ] || { echo "set EXPO_TOKEN in .env (an Expo access token)" >&2; exit 2; }
FREE="${EAS_FREE_BUILDS:-15}"
MAX_QUEUE=$(( ${EAS_MAX_QUEUE_MINUTES:-30} * 60 ))
if command -v eas >/dev/null; then EAS=(eas); else EAS=(npx --yes eas-cli); fi
json() { node -e "const d = JSON.parse(require('fs').readFileSync(0, 'utf8')); $1"; }

MONTH="$(date -u +%Y-%m-01T00:00:00Z)"
USED="$("${EAS[@]}" build:list --platform "$PLATFORM" --limit 100 --json --non-interactive \
  | json "console.log(d.filter(b => b.createdAt >= '$MONTH').length)")"
echo "$USED of $FREE free $PLATFORM builds used this month" >&2
[ "$USED" -lt "$FREE" ] || { echo "free $PLATFORM builds used up: build on AWS" >&2; exit 4; }

ID="$("${EAS[@]}" build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive --no-wait --json | json "console.log(d[0].id)")"
echo "EAS build $ID queued" >&2
START="$(date +%s)"
while sleep 60; do
  VIEW="$("${EAS[@]}" build:view "$ID" --json)"
  read -r STATUS WAIT URL <<<"$(printf %s "$VIEW" \
    | json "console.log(d.status, d.estimatedWaitTimeLeftSeconds ?? -1, (d.artifacts && d.artifacts.buildUrl) || '-')")"
  case "$STATUS" in
    NEW|IN_QUEUE)
      QUEUED=$(( $(date +%s) - START ))
      if [ "$QUEUED" -ge "$MAX_QUEUE" ] || [ $(( QUEUED + WAIT )) -ge "$MAX_QUEUE" ]; then
        "${EAS[@]}" build:cancel "$ID" >&2 || true
        echo "EAS queue wait passes $(( MAX_QUEUE / 60 )) minutes; canceled $ID: build on AWS" >&2
        exit 5
      fi ;;
    FINISHED)
      echo "{\"platform\":\"$PLATFORM\",\"build_id\":\"$ID\",\"status\":\"FINISHED\",\"artifact_url\":\"$URL\"}"
      exit 0 ;;
    ERRORED|CANCELED)
      echo "EAS build $ID $STATUS: $(printf %s "$VIEW" | json "console.log(d.error ? (d.error.errorCode || '') + ' ' + (d.error.message || '') : 'no error reported')")" >&2
      echo "logs: ${EAS[*]} build:view $ID" >&2
      exit 1 ;;
  esac
done
