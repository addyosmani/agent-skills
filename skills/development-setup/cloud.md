# Cloud machines and mobile builds

How agents develop on shared EC2 machines and build the mobile app under `development-setup` DS10–DS17. The scripts are in `scripts/`, run from the project root (`eas-build.sh` from the app directory), and read the project's `.env`; the project's `.env.example` lists every variable.

## One-time setup (the user)

An agent never creates these; when one is missing, the script names it and the agent asks the user.

| `.env` variable | What it is |
|---|---|
| `AWS_PROFILE` | the profile the scripts run as; its credentials stay on this machine (DS15) |
| `CLOUD_REGION` | the region for every brain machine |
| `CLOUD_SUBNET` | a subnet that assigns public addresses |
| `CLOUD_SECURITY_GROUP` | inbound TCP 22 from the user's address only, nothing else (DS15) |
| `CLOUD_KEY_NAME` | an EC2 key pair whose private key is in this machine's SSH agent |
| `CLOUD_SCHEDULER_ROLE_ARN` | a role EventBridge Scheduler assumes (trust `scheduler.amazonaws.com`) with `ec2:TerminateInstances` and `ec2:ReleaseHosts`, conditioned on the tag `brain=dev` |
| `CLOUD_MAC_AMI` | for iOS on AWS only: a macOS AMI prepared with the Xcode, Node, CocoaPods, and EAS CLI versions the project pins |
| `EXPO_TOKEN` | an Expo access token for EAS Build |

The tunables, with their defaults, are in `.env.example`; a project that changes one records why in `docs/DEVELOPMENT.md`.

The profile needs `ec2:RunInstances`, `TerminateInstances`, `Describe*`, `CreateTags`, `AllocateHosts`, `ReleaseHosts`; `ssm:GetParameter`; `scheduler:CreateSchedule`, `UpdateSchedule`, `DeleteSchedule`, `ListSchedules`; and `iam:PassRole` on the scheduler role.

## What guards the cost

| Guard | Where | Stops |
|---|---|---|
| Sharing | `cloud-up.sh` joins the first live machine with headroom by `cloud-capacity.sh` | a machine per agent (DS11) |
| Size and count | `cloud-up.sh` refuses another type, a machine past `CLOUD_MAX_MACHINES`, and a new Mac host without `--approved` | the machine nobody asked for (DS12) |
| Idle | a watchdog on the machine | a machine with no SSH connection and a load under a quarter of its vCPUs for `CLOUD_IDLE_MINUTES` (DS13) |
| Deadline | the watchdog, and an EventBridge schedule from the AWS side; each join moves it to `CLOUD_MAX_HOURS` from then | a forgotten or hung machine (DS13) |
| Shutdown | `--instance-initiated-shutdown-behavior terminate` | the disk bill: a shutdown terminates, it never stops (DS13) |
| Leaving | `cloud-down.sh` terminates when the last agent's directory is gone | a machine nobody is on (DS14) |
| Reaper | `cloud-reap.sh` at every session's start and end | expired or stopped machines, stale schedules, Mac hosts past 24 hours (DS14) |

A job left running detached with no SSH connection and a low load is idle; keep the SSH session open for the length of any long job.

## Metrics

The watchdog appends `epoch load1 vcpus mem_used_pct disk_used_pct` to `/var/lib/brain/metrics` every minute. `cloud-capacity.sh <ip>` reads the last 15 minutes and says whether the machine has headroom: average load under `CLOUD_MAX_CPU_PCT` of its vCPUs, and memory and disk under `CLOUD_MAX_MEM_PCT` and `CLOUD_MAX_DISK_PCT`. A machine with under 5 minutes of metrics counts as having room. These are the machine's metrics, not the app's: a project's own Prometheus and Grafana stay per agent (DS6). Run it yourself before starting a heavy job (a full build, a load test) on a shared machine; if it shows no headroom, wait or ask for another machine with its output as the evidence (DS12).

## Development

1. `scripts/cloud-reap.sh`.
2. `scripts/cloud-up.sh <ticket>` joins a machine with headroom or launches one, and prints `instance_id`, `public_ip`, `ssh`, `expires_at`, and `joined`. When it refuses, ask the user with its message and the metrics, record the answer on the ticket, then rerun with `--approved "<their words>"` (and `--type <type>` for a larger machine).
3. `ssh -A ec2-user@<ip>`; on a new machine wait for `cloud-init status --wait`. `git clone` the repository into `~/work/<ticket>-<slug>` and check out the branch. The forwarded agent pushes; nothing else is copied over (DS15).
4. In that directory, as locally: `docker compose -p <ticket>-<slug> up` for the services you touch, LocalStack, the seed or snapshot, and Prometheus, Grafana, and Loki when debugging (DS3–DS6, DS10). Pick host ports no other project on the machine uses (`docker ps --format '{{.Ports}}'`) and set them in the directory's `.env`.
5. Reach a service with a tunnel, `ssh -A -L 3000:localhost:<port> ec2-user@<ip>`; never open a port on the security group.
6. Commit and push before every pause (DS15).
7. Done: push, `scripts/cloud-down.sh <instance-id> <ticket>-<slug>`, `scripts/cloud-reap.sh`.

## Mobile builds

EAS Build by default (DS16). From the app directory:

```bash
skills/development-setup/scripts/eas-build.sh android production   # or ios
```

| Exit | Meaning | Next |
|---|---|---|
| 0 | built on EAS; prints the artifact URL | done |
| 4 | this month's free builds for the platform are used up | build on AWS; note the reason on the ticket |
| 5 | the queue wait passed `EAS_MAX_QUEUE_MINUTES`; the EAS build was canceled | build on AWS; note the reason on the ticket |
| 1 | the build failed on EAS; prints the error code and message | read the logs (`eas build:view <id>`), report the reason on the ticket with a recommendation; the app's own failure is fixed and rebuilt on EAS; moving to AWS or local is the user's call |

The user may send any build straight to AWS, or, rarely, to this machine; record it on the ticket. An iOS build runs locally only on macOS with the Xcode the project pins.

**Android on AWS:** join or launch a dev machine as above, and build in a Docker container from the image `docs/DEVELOPMENT.md` names (the JDK and Android SDK the project pins), for example `eas build --platform android --local` inside it. Run `cloud-capacity.sh` first: a Gradle release build needs several GiB of memory and all the cores it can get.

**iOS on AWS:** `scripts/cloud-up.sh <ticket> --mac`. It reuses a free brain Mac host; when none exists it refuses until the user approves a new one, asked with "a Mac host bills for at least 24 hours" (DS17). A Mac takes several minutes to boot. Build with `eas build --platform ios --local` or `xcodebuild archive`. Signing credentials come the way `docs/DEVELOPMENT.md` says, for this build only, never committed.

Either way: `scp` the artifact back or submit it from the machine, then `cloud-down.sh`. A Mac machine is terminated at once; its host stays allocated for further iOS builds and is released 24 hours after allocation by its schedule, or by `cloud-reap.sh` after that.
