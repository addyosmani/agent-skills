#!/bin/bash
# cloud-capacity.sh — whether a shared dev machine has room for one more agent (development-setup DS11).
#
# Usage: skills/development-setup/scripts/cloud-capacity.sh <public-ip>
# Run from the project root. Reads the last 15 minutes of the machine's /var/lib/brain/metrics over SSH,
# written every minute by brain-watchdog.sh. Headroom means: the 15-minute average load is under
# CLOUD_MAX_CPU_PCT (70) percent of its vCPUs, and the latest memory and disk use are under
# CLOUD_MAX_MEM_PCT (75) and CLOUD_MAX_DISK_PCT (80). A machine with under 5 minutes of metrics has just
# started and counts as having room. Prints the numbers and the verdict as JSON on stdout; exits 0 with
# headroom, 1 without, 2 when the machine cannot be read.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/cloud-lib.sh"

IP="${1:-}"
[ -n "$IP" ] || { echo "usage: cloud-capacity.sh <public-ip>" >&2; exit 2; }
OUT="$("${SSH[@]}" "ec2-user@$IP" 'tail -n 15 /var/lib/brain/metrics 2>/dev/null; echo "agents $(ls -d ~/work/*/ 2>/dev/null | wc -l)"')" \
  || { echo "cannot read metrics from $IP" >&2; exit 2; }

printf '%s\n' "$OUT" | awk -v cpu_max="$MAX_CPU_PCT" -v mem_max="$MAX_MEM_PCT" -v disk_max="$MAX_DISK_PCT" '
  $1 == "agents" { agents = $2; next }
  { n++; load += $2; vcpus = $3; mem = $4; disk = $5 }
  END {
    cpu = (n && vcpus) ? int(load / n * 100 / vcpus) : 0
    room = (n < 5) || (cpu < cpu_max && mem < mem_max && disk < disk_max)
    printf "{\"agents\":%d,\"minutes\":%d,\"cpu_pct\":%d,\"mem_pct\":%d,\"disk_pct\":%d,\"headroom\":%s}\n", agents, n, cpu, mem, disk, room ? "true" : "false"
    exit !room
  }'
