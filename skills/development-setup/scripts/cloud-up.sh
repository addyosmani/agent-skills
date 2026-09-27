#!/bin/bash
# cloud-up.sh — place an agent on a shared EC2 dev machine, or launch one (development-setup DS10–DS13, DS17).
#
# Usage: skills/development-setup/scripts/cloud-up.sh <ticket> [--type <instance-type>] [--mac] [--approved "<the user's words>"]
# Run from the project root; settings come from its .env (project .env.example, cloud.md One-time setup).
#
#   default   joins the first live dev machine whose metrics show headroom (cloud-capacity.sh) and moves its
#             deadline to CLOUD_MAX_HOURS from now; when none has room, launches CLOUD_DEFAULT_TYPE (m8i.2xlarge)
#             on Amazon Linux 2023 with Docker and Compose. Launching past CLOUD_MAX_MACHINES (2) live dev
#             machines refuses without --approved (DS11, DS12)
#   --type    launches a new machine of that type; any type but the default refuses without --approved (DS12)
#   --mac     a macOS build machine from CLOUD_MAC_AMI on CLOUD_MAC_TYPE (mac2.metal); reuses a free brain Mac
#             host, and allocating a new one refuses without --approved. A new host is released 24 h after
#             allocation (DS17)
#   --approved  the user's explicit permission for this machine, recorded on the ticket
#
# A machine terminates itself after CLOUD_IDLE_MINUTES with no SSH connection and no load, and at its deadline
# regardless; an EventBridge schedule terminates it at the same deadline from the AWS side (DS13). If that
# schedule cannot be created the new machine is terminated at once. Prints the machine as JSON on stdout;
# status goes to stderr.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/cloud-lib.sh"

usage() { sed -n '4p' "$0" | sed 's/^# //' >&2; exit 2; }
TICKET="$(tag_safe "${1:-}" | tr -cd 'A-Za-z0-9._-')"
[ -n "$TICKET" ] && [ "${1#-}" = "$1" ] || usage
shift
TYPE=""; MAC=0; APPROVED=""
while [ $# -gt 0 ]; do
  case "$1" in
    --type) TYPE="$2"; shift 2 ;;
    --mac) MAC=1; shift ;;
    --approved) APPROVED="$(tag_safe "$2")"; shift 2 ;;
    *) usage ;;
  esac
done
need CLOUD_SUBNET CLOUD_SECURITY_GROUP CLOUD_KEY_NAME CLOUD_SCHEDULER_ROLE_ARN

refuse() { echo "refused: $1. Ask the user, record the answer on the ticket, and pass --approved \"<their words>\" (DS12)." >&2; exit 3; }
machine_json() { echo "{\"instance_id\":\"$1\",\"type\":\"$2\",\"host_id\":\"$3\",\"public_ip\":\"$4\",\"ssh\":\"ssh -A ec2-user@$4\",\"expires_at\":\"$5\",\"joined\":$6}"; }

NOW="$(date +%s)"
DEADLINE=$(( NOW + MAX_HOURS * 3600 ))
EXPIRES="$(iso_utc "$DEADLINE")Z"

# Join a live dev machine with headroom (DS11).
if [ "$MAC" = 0 ] && [ -z "$TYPE" ]; then
  LIVE=0
  while read -r id type ip expires; do
    [ -n "$id" ] || continue
    LIVE=$((LIVE + 1))
    [ "$ip" != None ] || continue
    if CAP="$("$HERE/cloud-capacity.sh" "$ip" 2>/dev/null)"; then
      echo "joining $id ($type): $CAP" >&2
      if [[ "$expires" < "$EXPIRES" ]]; then
        if schedule update "brain-kill-$id" "$DEADLINE" terminateInstances "{\"InstanceIds\":[\"$id\"]}"; then
          aws ec2 create-tags --resources "$id" --tags "Key=brain:expires-at,Value=$EXPIRES"
          "${SSH[@]}" "ec2-user@$ip" "sudo sed -i 's/^DEADLINE=.*/DEADLINE=$DEADLINE/' /usr/local/etc/brain-watchdog.env" \
            || echo "WARNING: could not move the watchdog deadline on $id; it stays at $expires" >&2
          expires="$EXPIRES"
        else
          echo "WARNING: could not move the deadline of $id; it stays at $expires" >&2
        fi
      fi
      machine_json "$id" "$type" "" "$ip" "$expires" true
      exit 0
    fi
    echo "$id has no headroom: ${CAP:-metrics unreadable}" >&2
  done < <(aws ec2 describe-instances --filters Name=tag:brain,Values=dev Name=tag:brain:kind,Values=dev Name=instance-state-name,Values=pending,running \
    --query "Reservations[].Instances[].[InstanceId, InstanceType, PublicIpAddress, Tags[?Key=='brain:expires-at']|[0].Value]" --output text)
  [ "$LIVE" -lt "$MAX_MACHINES" ] || [ -n "$APPROVED" ] || refuse "$LIVE dev machines are live and none has headroom; another passes CLOUD_MAX_MACHINES ($MAX_MACHINES)"
fi

EXTRA=()
HOST=""
if [ "$MAC" = 1 ]; then
  need CLOUD_MAC_AMI
  KIND=mac
  TYPE="${TYPE:-$MAC_TYPE}"
  AMI="$CLOUD_MAC_AMI"
  HOST="$(aws ec2 describe-hosts --filter Name=tag:brain,Values=dev "Name=instance-type,Values=$TYPE" Name=state,Values=available \
    --query 'Hosts[?length(Instances)==`0`] | [0].HostId' --output text)"
  [ "$HOST" = None ] && HOST=""
  if [ -n "$HOST" ]; then
    echo "reusing Mac host $HOST" >&2
  else
    [ -n "$APPROVED" ] || refuse "a new $TYPE host bills for at least 24 hours (DS17)"
    AZ="$(aws ec2 describe-subnets --subnet-ids "$CLOUD_SUBNET" --query 'Subnets[0].AvailabilityZone' --output text)"
    HOST="$(aws ec2 allocate-hosts --instance-type "$TYPE" --availability-zone "$AZ" --quantity 1 \
      --tag-specifications "[{\"ResourceType\":\"dedicated-host\",\"Tags\":[{\"Key\":\"brain\",\"Value\":\"dev\"},{\"Key\":\"brain:ticket\",\"Value\":\"$TICKET\"},{\"Key\":\"brain:approved\",\"Value\":\"$APPROVED\"}]}]" \
      --query 'HostIds[0]' --output text)"
    echo "allocated Mac host $HOST in $AZ" >&2
    schedule create "brain-release-$HOST" $(( NOW + 24 * 3600 + 300 )) releaseHosts "{\"HostIds\":[\"$HOST\"]}" \
      || echo "WARNING: could not schedule the release of $HOST; run cloud-reap.sh after 24 hours to release it" >&2
  fi
  EXTRA+=(--placement "HostId=$HOST,Tenancy=host")
else
  KIND=dev
  TYPE="${TYPE:-$DEFAULT_TYPE}"
  [ "$TYPE" = "$DEFAULT_TYPE" ] || [ -n "$APPROVED" ] || refuse "$TYPE is not the default $DEFAULT_TYPE"
  ARCH="$(aws ec2 describe-instance-types --instance-types "$TYPE" --query 'InstanceTypes[0].ProcessorInfo.SupportedArchitectures[0]' --output text)"
  AMI="${CLOUD_AMI:-$(aws ssm get-parameter --name "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-$ARCH" --query Parameter.Value --output text)}"
  EXTRA+=(--block-device-mappings "[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":$DISK_GB,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]")
fi

OWNER="$(tag_safe "$(git config user.email 2>/dev/null || echo "${USER:-unknown}")")"
TMP="$(mktemp -t brain-user-data.XXXXXX)"
trap 'rm -f "$TMP"' EXIT
{
  echo '#!/bin/bash'
  echo 'mkdir -p /usr/local/bin /usr/local/etc'
  printf 'printf "IDLE_MINUTES=%s\\nDEADLINE=%s\\n" > /usr/local/etc/brain-watchdog.env\n' "$IDLE_MINUTES" "$DEADLINE"
  echo "cat > /usr/local/bin/brain-watchdog <<'WATCHDOG'"
  cat "$HERE/brain-watchdog.sh"
  echo 'WATCHDOG'
  echo 'chmod +x /usr/local/bin/brain-watchdog'
  if [ "$MAC" = 1 ]; then
    echo 'nohup /usr/local/bin/brain-watchdog >/var/log/brain-watchdog.log 2>&1 &'
  else
    echo 'systemd-run --unit brain-watchdog /usr/local/bin/brain-watchdog'
    echo 'dnf install -y docker git'
    echo 'systemctl enable --now docker'
    echo 'usermod -aG docker ec2-user'
    echo 'mkdir -p /usr/local/lib/docker/cli-plugins /home/ec2-user/work'
    echo 'chown ec2-user:ec2-user /home/ec2-user/work'
    echo 'curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose'
    echo 'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose'
  fi
} > "$TMP"

TAGS="{\"Key\":\"Name\",\"Value\":\"brain-$KIND-$TICKET\"},{\"Key\":\"brain\",\"Value\":\"dev\"},{\"Key\":\"brain:kind\",\"Value\":\"$KIND\"},{\"Key\":\"brain:ticket\",\"Value\":\"$TICKET\"},{\"Key\":\"brain:owner\",\"Value\":\"$OWNER\"},{\"Key\":\"brain:expires-at\",\"Value\":\"$EXPIRES\"}"
[ -n "$APPROVED" ] && TAGS="$TAGS,{\"Key\":\"brain:approved\",\"Value\":\"$APPROVED\"}"

echo "launching $TYPE ($KIND) for $TICKET until $EXPIRES" >&2
ID="$(aws ec2 run-instances --image-id "$AMI" --instance-type "$TYPE" --key-name "$CLOUD_KEY_NAME" \
  --network-interfaces "[{\"DeviceIndex\":0,\"SubnetId\":\"$CLOUD_SUBNET\",\"Groups\":[\"$CLOUD_SECURITY_GROUP\"],\"AssociatePublicIpAddress\":true}]" \
  --instance-initiated-shutdown-behavior terminate \
  --metadata-options HttpTokens=required \
  --user-data "file://$TMP" \
  --tag-specifications "[{\"ResourceType\":\"instance\",\"Tags\":[$TAGS]},{\"ResourceType\":\"volume\",\"Tags\":[$TAGS]}]" \
  "${EXTRA[@]}" \
  --query 'Instances[0].InstanceId' --output text)"

if ! schedule create "brain-kill-$ID" "$DEADLINE" terminateInstances "{\"InstanceIds\":[\"$ID\"]}"; then
  aws ec2 terminate-instances --instance-ids "$ID" >/dev/null
  echo "could not schedule the AWS-side termination of $ID, so it was terminated (DS13); check CLOUD_SCHEDULER_ROLE_ARN" >&2
  exit 1
fi

aws ec2 wait instance-running --instance-ids "$ID" || echo "$ID is still starting; cloud-reap.sh lists it with its address" >&2
IP="$(aws ec2 describe-instances --instance-ids "$ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
machine_json "$ID" "$TYPE" "$HOST" "$IP" "$EXPIRES" false
