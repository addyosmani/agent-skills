#!/bin/bash
# brain-watchdog.sh — runs on a cloud machine as root; cloud-up.sh installs it through user data.
# Every minute it appends "epoch load1 vcpus mem_used_pct disk_used_pct" to /var/lib/brain/metrics
# (the last 60 lines are kept) for cloud-capacity.sh (development-setup DS11), and it shuts the
# machine down, which terminates it, once it has had no SSH connection and a 1-minute load under a
# quarter of its vCPUs for IDLE_MINUTES, or at DEADLINE (epoch seconds) regardless (DS13).
# Its settings are re-read every minute from /usr/local/etc/brain-watchdog.env, so cloud-up.sh can
# move the deadline when another agent joins. Its log goes to stdout.
mkdir -p /var/lib/brain
METRICS=/var/lib/brain/metrics
idle_since="$(date +%s)"
vcpus="$(getconf _NPROCESSORS_ONLN)"
while sleep 60; do
  . /usr/local/etc/brain-watchdog.env
  now="$(date +%s)"
  if [ "$now" -ge "$DEADLINE" ]; then echo "deadline reached, shutting down"; shutdown -h now; exit 0; fi

  if [ -r /proc/loadavg ]; then load="$(cut -d' ' -f1 /proc/loadavg)"; else load="$(sysctl -n vm.loadavg | awk '{print $2}')"; fi
  if [ -r /proc/meminfo ]; then
    mem="$(awk '/^MemTotal:/ { t = $2 } /^MemAvailable:/ { a = $2 } END { printf "%d", (t - a) * 100 / t }' /proc/meminfo)"
  else
    mem=0
  fi
  disk="$(df -P / | awk 'NR == 2 { sub("%", "", $5); print $5 }')"
  echo "$now $load $vcpus $mem $disk" >> "$METRICS"
  tail -n 60 "$METRICS" > "$METRICS.tmp" && mv "$METRICS.tmp" "$METRICS"
  chmod 644 "$METRICS"

  if command -v ss >/dev/null; then
    ssh_conns="$(ss -Htn state established '( sport = :22 )' | wc -l | tr -d ' ')"
  else
    ssh_conns="$(netstat -an -p tcp | grep -cE '[.:]22[[:space:]].*ESTABLISHED' || true)"
  fi
  if [ "$ssh_conns" -gt 0 ] || awk -v l="$load" -v c="$vcpus" 'BEGIN { exit !(l >= c / 4) }'; then
    idle_since="$now"
  elif [ $((now - idle_since)) -ge $((IDLE_MINUTES * 60)) ]; then
    echo "idle for $IDLE_MINUTES minutes, shutting down"; shutdown -h now; exit 0
  fi
done
