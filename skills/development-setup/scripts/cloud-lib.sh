#!/bin/bash
# cloud-lib.sh — settings and helpers shared by the cloud-*.sh scripts. Sourced, never run.
# Reads the project's .env from the current directory (the project root). The variables are
# listed in skills/development-setup/cloud.md, One-time setup.
# shellcheck disable=SC2034  # the settings are used by the scripts that source this file
[ -f .env ] && { set -a; . ./.env; set +a; }
REGION="${CLOUD_REGION:-${AWS_REGION:-${AWS_DEFAULT_REGION:-}}}"
[ -n "$REGION" ] || { echo "set CLOUD_REGION in .env" >&2; exit 2; }
export AWS_REGION="$REGION" AWS_PAGER=""
DEFAULT_TYPE="${CLOUD_DEFAULT_TYPE:-m8i.2xlarge}"
MAC_TYPE="${CLOUD_MAC_TYPE:-mac2.metal}"
IDLE_MINUTES="${CLOUD_IDLE_MINUTES:-30}"
MAX_HOURS="${CLOUD_MAX_HOURS:-8}"
MAX_MACHINES="${CLOUD_MAX_MACHINES:-2}"
DISK_GB="${CLOUD_DISK_GB:-100}"
MAX_CPU_PCT="${CLOUD_MAX_CPU_PCT:-70}"
MAX_MEM_PCT="${CLOUD_MAX_MEM_PCT:-75}"
MAX_DISK_PCT="${CLOUD_MAX_DISK_PCT:-80}"
SSH=(ssh -n -A -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes)

need() {
  for v in "$@"; do
    [ -n "${!v:-}" ] || { echo "set $v in .env (skills/development-setup/cloud.md, One-time setup)" >&2; exit 2; }
  done
}

# ISO 8601 UTC, without zone suffix, for epoch seconds $1 (GNU or BSD date).
iso_utc() { date -u -d "@$1" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -r "$1" +%Y-%m-%dT%H:%M:%S; }

# Keep only characters EC2 tag values accept.
tag_safe() { printf %s "$1" | tr -cd 'A-Za-z0-9 +=._:/@-' | cut -c1-250; }

# schedule <create|update> <name> <epoch> <ec2 api action> <input json>: a one-shot EventBridge schedule
# that calls the EC2 API at <epoch> as CLOUD_SCHEDULER_ROLE_ARN and deletes itself afterwards.
schedule() {
  local verb="$1" input
  shift
  input="$(printf %s "$4" | sed 's/"/\\"/g')"
  aws scheduler "$verb-schedule" --name "$1" \
    --schedule-expression "at($(iso_utc "$2"))" --schedule-expression-timezone UTC \
    --flexible-time-window Mode=OFF --action-after-completion DELETE \
    --target "{\"Arn\":\"arn:aws:scheduler:::aws-sdk:ec2:$3\",\"RoleArn\":\"$CLOUD_SCHEDULER_ROLE_ARN\",\"Input\":\"$input\"}" >/dev/null
}
