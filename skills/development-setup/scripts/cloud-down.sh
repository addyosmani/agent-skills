#!/bin/bash
# cloud-down.sh — take an agent off a brain machine, and terminate the machine when nobody is left (development-setup DS14).
#
# Usage: skills/development-setup/scripts/cloud-down.sh <instance-id> [<work-dir>]
# Run from the project root. Refuses a machine without the brain=dev tag.
#   dev machine  stops and removes the Compose project <work-dir> with its volumes and deletes ~/work/<work-dir>;
#                terminates the machine only when no other agent's directory is left under ~/work.
#                A machine that cannot be reached is left to its deadline and cloud-reap.sh
#   Mac machine  terminated; its host stays allocated until its scheduled release, 24 h after allocation,
#                so further iOS builds reuse it (DS17)
# Prints the result as JSON on stdout; status goes to stderr.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/cloud-lib.sh"

ID="${1:-}"
DIR="$(printf %s "${2:-}" | tr -cd 'A-Za-z0-9._-')"
[ -n "$ID" ] || { echo "usage: cloud-down.sh <instance-id> [<work-dir>]" >&2; exit 2; }
read -r TAG KIND HOST IP <<<"$(aws ec2 describe-instances --instance-ids "$ID" \
  --query "Reservations[0].Instances[0].[Tags[?Key=='brain']|[0].Value, Tags[?Key=='brain:kind']|[0].Value, Placement.HostId, PublicIpAddress]" --output text)"
[ "$TAG" = dev ] || { echo "refused: $ID is not a brain machine (no brain=dev tag)" >&2; exit 3; }
[ "$HOST" = None ] && HOST=""

terminate() {
  aws ec2 terminate-instances --instance-ids "$ID" >/dev/null
  aws scheduler delete-schedule --name "brain-kill-$ID" >/dev/null 2>&1 || true
  echo "terminated $ID" >&2
  [ -z "$HOST" ] || echo "Mac host $HOST stays allocated until its scheduled release; reuse it for further iOS builds" >&2
  echo "{\"instance_id\":\"$ID\",\"terminated\":true,\"agents_left\":0,\"host_id\":\"$HOST\"}"
  exit 0
}

[ "$KIND" = mac ] && terminate

LEFT="$("${SSH[@]}" "ec2-user@$IP" "
  if [ -n '$DIR' ] && [ -d ~/work/'$DIR' ]; then
    (cd ~/work/'$DIR' && docker compose -p '$DIR' down -v --remove-orphans >/dev/null 2>&1 || true)
    rm -rf ~/work/'$DIR'
  fi
  ls -d ~/work/*/ 2>/dev/null | wc -l")" \
  || { echo "cannot reach $ID at $IP; it terminates at its deadline, and cloud-reap.sh terminates it after that" >&2; exit 1; }
LEFT="$(printf %s "$LEFT" | tr -d ' ')"
[ -z "$DIR" ] || echo "removed ~/work/$DIR and its containers from $ID" >&2
[ "$LEFT" = 0 ] && terminate
echo "$ID still has $LEFT agent directories; left running for them" >&2
echo "{\"instance_id\":\"$ID\",\"terminated\":false,\"agents_left\":$LEFT,\"host_id\":\"\"}"
