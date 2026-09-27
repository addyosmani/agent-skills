#!/bin/bash
# cloud-reap.sh — find and kill leftover brain machines (development-setup DS12, DS13).
#
# Usage: skills/development-setup/scripts/cloud-reap.sh
# Run from the project root at the start and the end of every session that uses the cloud.
#   - terminates every brain=dev machine past its brain:expires-at, and every stopped one
#   - deletes brain-kill-* schedules whose machine is gone
#   - releases every brain Mac host with no machine on it once its 24-hour minimum has passed
# Prints what it killed and what is still running as JSON on stdout; status goes to stderr.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/cloud-lib.sh"

NOW="$(iso_utc "$(date +%s)")Z"
KILLED=""; LIVE=""; RELEASED=""; HELD=""

while read -r id state type expires ticket ip; do
  [ -n "$id" ] || continue
  if [ "$state" = stopped ] || [[ "$expires" < "$NOW" ]]; then
    aws ec2 terminate-instances --instance-ids "$id" >/dev/null
    aws scheduler delete-schedule --name "brain-kill-$id" >/dev/null 2>&1 || true
    echo "terminated $id ($ticket, $state, expired $expires)" >&2
    KILLED="$KILLED${KILLED:+,}\"$id\""
  else
    LIVE="$LIVE${LIVE:+,}{\"instance_id\":\"$id\",\"state\":\"$state\",\"type\":\"$type\",\"ticket\":\"$ticket\",\"public_ip\":\"$ip\",\"expires_at\":\"$expires\"}"
  fi
done < <(aws ec2 describe-instances --filters Name=tag:brain,Values=dev Name=instance-state-name,Values=pending,running,stopping,stopped \
  --query "Reservations[].Instances[].[InstanceId, State.Name, InstanceType, Tags[?Key=='brain:expires-at']|[0].Value, Tags[?Key=='brain:ticket']|[0].Value, PublicIpAddress]" \
  --output text)

for name in $(aws scheduler list-schedules --name-prefix brain-kill- --query 'Schedules[].Name' --output text); do
  [ "$name" = None ] && continue
  state="$(aws ec2 describe-instances --instance-ids "${name#brain-kill-}" --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo gone)"
  case "$state" in terminated|shutting-down|gone|None) aws scheduler delete-schedule --name "$name" >/dev/null ;; esac
done

for host in $(aws ec2 describe-hosts --filter Name=tag:brain,Values=dev Name=state,Values=available \
  --query 'Hosts[?length(Instances)==`0`].HostId' --output text); do
  [ "$host" = None ] && continue
  if [ "$(aws ec2 release-hosts --host-ids "$host" --query 'length(Successful)' --output text)" = 1 ]; then
    aws scheduler delete-schedule --name "brain-release-$host" >/dev/null 2>&1 || true
    echo "released Mac host $host" >&2
    RELEASED="$RELEASED${RELEASED:+,}\"$host\""
  else
    HELD="$HELD${HELD:+,}\"$host\""
  fi
done

echo "{\"terminated\":[$KILLED],\"released_hosts\":[$RELEASED],\"live\":[$LIVE],\"held_hosts\":[$HELD]}"
