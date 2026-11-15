# Runbook: the self-hosted production host

The one procedure for running FixFlow on a host the owner controls: a VPS from phase P3b until
P13e, then the home box. The stack is `docker-compose.prod.yml` (profiles `db`, `app`, `web`,
`ops`, `edge`), driven by `ops/selfhost/bin/ffc`, reached **only** through a Cloudflare Tunnel.
Nothing publishes a port. Media and off-box dumps stay on R2. Until `T_close` the host runs only
a `drain-image*` tag (section 11).

Why this shape (the short version; `docs/adr/0001-database-region-topology.md` Amendment 2 has
the rest): the old Railway deployment died with its environment, and an installed phone deletes a
queued record on any 2xx and parks it on a bare 4xx. So every door in this runbook fails toward
"keep and retry": the backend cannot start before a restore is signed off, the tunnel's catch-all
is a 503, the old hostname only hangs (section 10), and a restore after `T_open` is never a quick fix.

| Section | What                                              | Who / where                      |
| ------- | ------------------------------------------------- | -------------------------------- |
| 0       | Conventions (paths, `ffc`, profiles, deep health) | read once                        |
| 1       | Host ready: VPS                                   | owner, SSH, P3b                  |
| 2       | Host ready: home box (box gate)                   | owner, at the box                |
| 3       | Secrets and env files                             | owner, SSH                       |
| 4       | Install the stack (nothing started)               | owner, SSH                       |
| 5       | Cloudflare: tunnel, DNS, `api.` settings          | owner, SSH + dashboard           |
| 6       | Restore per recovery case, admit traffic          | owner, SSH, P3c                  |
| 7       | Heartbeat and hourly dump                         | owner, SSH + monitoring service  |
| 8       | The drain window (`T_open` … `T_close`)           | owner + the drain sessions       |
| 9       | Backups                                           | owner, SSH                       |
| 10      | Old-hostname stub                                 | development machine + Railway    |
| 11      | `release/drain` and the `drain-image` tag         | development machine              |
| 12      | The deploy train                                  | coordinator + owner              |
| 13      | Operations R0-R9 (daily, outages, deploy, moves)  | owner, SSH                       |

Every step is numbered `<section>.<n>` (in section 13, `R<k>.<n>`) and has a **Do** and a
**Check** with the expected result. A Check that does not show the expected result is a STOP.
`VERIFY:` marks a fact about a third-party tool or dashboard (menu names, CLI wording) that could
not be confirmed from this repository; read it on first use and correct this file.

What the P3a smoke ran locally (`ops/selfhost/smoke/smoke.sh`, with `runbook-commands.sh`): the
restore gate, the B5 snapshot, the restore as `fixflow_app` with Appendix B, the code-head command,
the sequence check, the roster check and create, `set_pin --report`, the fence, the manifest export,
the three window-audit queries, the cursor re-seed, the deep-health read-back, the heartbeat (healthy
and database-down), the app's own dump code, the web headers, the ingress rules (offline) and the
no-published-port check. Everything that needs a real host, Cloudflare, R2, Railway or a phone was
not run; those steps are the ones with `VERIFY:` lines or that name a dashboard.

## 0. Conventions (read once; every step below assumes them)

- **Who runs it.** The owner, at an SSH session on the host, as root (`sudo -i`). Each step is
  numbered `<section>.<n>`, has a **Do** block and a **Check** block with the expected result.
  A step whose Check does not show the expected result is a STOP: do not continue; record what
  you saw in the phone's or the phase's W0-results row.
- **Paths on the host.**

  | Path                         | What                                                        | Owner / mode       |
  | ---------------------------- | ----------------------------------------------------------- | ------------------ |
  | `/opt/fixflow`               | a clone of the repository at the deployed tag or commit     | root               |
  | `/etc/fixflow/`              | env files and secrets (never in git)                        | root:root `0700`   |
  | `/etc/fixflow/*.env`         | `compose.env`, `postgres.env`, `backend.env`, `ops.env`, `heartbeat.env` | root:root `0600` |
  | `/etc/fixflow/cloudflared/`  | tunnel `config.yml` (+ `config.maintenance.yml`) and the credentials JSON | `65532:65532`, files `0400` |
  | `/etc/fixflow/restore-signed-off` | the restore gate (the backend will not start without it) | root:root `0600` |
  | `/var/lib/fixflow/drain/`    | drain artefacts (pre-drain snapshot, fuel snapshot, audit output) | root `0700`  |
  | `/var/log/fixflow/`          | heartbeat and hourly-dump logs                              | root               |

- **`ffc`** is `/usr/local/bin/ffc`, a link to `/opt/fixflow/ops/selfhost/bin/ffc`: `docker
  compose` with the project name `fixflow`, the file `/opt/fixflow/docker-compose.prod.yml`, the
  env file `/etc/fixflow/compose.env`, and `FIXFLOW_GIT_SHA` set to the checkout's HEAD. Never
  run plain `docker compose` against this stack.
- **Profiles are not remembered.** Name every profile that must be running on every `up`:

  ```bash
  P_DB="--profile db"
  P_RUN="--profile db --profile app --profile web --profile edge"   # add --profile ops if used
  ```

  `ffc $P_RUN up -d` is "the whole stack"; `ffc $P_DB up -d` is postgres alone. `ffc` refuses
  `up`, `start`, `restart`, `create`, `run`, `build`, `pull`, `down` and `rm` without a named
  profile (which services start is always your explicit choice). For everything else (`ps`,
  `logs`, `exec`, `cp`, `stop`, `config`) it activates every profile when you name none, so
  `ffc ps -q backend` and `ffc logs edge` work as written.
- **Services** (compose names): `postgres`, `restore-gate` (one-shot), `backend`, `web`, `ops`,
  `edge` (cloudflared). No service publishes a port; the only way in is the tunnel.
- **Placeholders.** `example.invalid` stands for the owner's domain, `<tech>` for a technician id
  (`t1`), `<vc>` for a versionCode, `<stamp>` for `date -u +%Y%m%dT%H%M%SZ`. Nothing in this file
  is a real secret, host or domain.
- **Deep health.** "Read deep health" means:

  ```bash
  ffc exec -T backend sh -c 'curl -fsS -H "X-Ops-Proxy-Token: $FIXFLOW_OPS_PROXY_TOKEN" http://localhost:8000/api/ops/health' | python3 -m json.tool
  ```

  The route answers 200 even when a component is down: read `components[]` (`database` must be
  `ok`) and `facts` (environment, `git_sha`, dispatcher, backups, the three ceilings).
- **psql as the database owner:** `ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1`.
  Every restore and every SQL step below runs as `fixflow_app`, never as `postgres`.
- **The app's own R2 credential.** Anything written to R2 by this runbook goes through the backend
  container (`fixflow-backup.sh`, `fixflow-r2-put.sh`), so no R2 key is ever typed on the host.

---

## 1. Host ready — VPS

Applies to the default host from P3b until P13e: a 2 vCPU / 4 GB Ubuntu Server LTS VPS. Run every
command as root over SSH. `<vps-ip>` is the server's public address (and `<vps-ipv6>` if it has one).
Do the steps in order; 1.4 (SSH) is placed so you cannot lock yourself out.

### 1.1 Provider firewall: deny all inbound except SSH

**Do**

1. In the provider's firewall panel attach one firewall to the server with inbound rule `TCP 22`
   only (from your own IP if it is stable, otherwise from anywhere; SSH is key-only after 1.4).
   Every other inbound rule is absent. Outbound stays allow-all (the tunnel needs TCP/UDP 7844 out,
   FCM and R2 need 443 out).
2. If the server has a public IPv6 address, the same rules must cover IPv6.
3. Docker bypasses `ufw` for published ports, so the controls are this firewall and "no `ports:`
   in the compose file". Do not rely on `ufw`.

**Check** (from a machine that is NOT the server, e.g. your laptop)

```bash
for p in 22 80 443 5432 8000; do nc -vz -w5 <vps-ip> $p; done
```

Expected: port 22 `succeeded`; ports 80, 443, 5432, 8000 `timed out`. A `refused` means the packet
reached the host: STOP, the firewall is not in the path.
VERIFY: some providers reject instead of drop, which also prints `refused`. If so, use the listener
proof below instead of the loop above.

Definitive proof with a throwaway listener. On the host run `python3 -m http.server 8000 --bind 0.0.0.0`
(leave it running), then from the laptop:

```bash
nc -vz -w5 <vps-ip> 8000        # must NOT say succeeded
```

Stop the listener with Ctrl-C on the host. With IPv6: repeat with `nc -6 -vz -w5 <vps-ipv6> 8000`.

### 1.2 Provider backups ON

**Do** Enable the provider's automatic backups/snapshots for the server (daily is enough).
A provider snapshot is crash-consistent, not a database dump. From `T_open` on, restoring from one
is an O-10 R2 restore (needs every drained phone's manifest); it is never a quick fix.

**Check** The provider panel shows backups `enabled` and the next scheduled time. After the first
run the panel lists one backup with today's date. Write both in the W0-results row.

### 1.3 Base system and packages

**Do**

```bash
lsb_release -d
apt-get update && apt-get -y full-upgrade
apt-get install -y git curl ca-certificates openssl cron dnsutils netcat-openbsd python3 logrotate
[ -f /var/run/reboot-required ] && echo "REBOOT NEEDED"
```

If it prints `REBOOT NEEDED`, run `reboot`, wait, SSH back in as root, continue.

**Check**

```bash
lsb_release -d                                      # Ubuntu ... LTS
for c in git curl openssl dig nc python3 flock; do command -v $c >/dev/null || echo "MISSING $c"; done
systemctl is-active cron
```

Expected: an Ubuntu LTS line; no `MISSING` line; `active`.

### 1.4 SSH key-only

**Do**

1. Open a SECOND terminal and confirm you can log in with your key (`ssh root@<vps-ip>`). Keep the
   first session open until the Check passes.
2. Write the drop-in (the `10-` prefix makes it win over cloud-init's `50-cloud-init.conf`):

```bash
cat > /etc/ssh/sshd_config.d/10-fixflow.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password
EOF
sshd -t && systemctl reload ssh
```

**Check**

```bash
sshd -T | grep -Ei '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '
```

Expected: `passwordauthentication no`, `kbdinteractiveauthentication no`, and `permitrootlogin`
`prohibit-password` (older sshd prints `without-password`). From the laptop:
`ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password root@<vps-ip>` must end
`Permission denied (publickey)`. Your key login from the second terminal still works.

### 1.5 Clock and timezone

The server judges device clock drift at 120 s and re-buckets attendance punches beyond that, so a
wrong server clock corrupts attendance. The timezone is set to the shop's so the 04:30 reboot in 1.7
is shop time, clear of the scheduler's 02:30 / 03:00 / 03:30 jobs (Asia/Karachi).

**Do**

```bash
apt-get install -y chrony
timedatectl set-timezone Asia/Karachi
systemctl enable --now chrony
```

**Check**

```bash
timedatectl show -p NTPSynchronized --value        # yes
timedatectl | grep 'Time zone'                     # Asia/Karachi (PKT, +0500)
chronyc tracking | grep -E 'Leap status|System time'
```

Expected: `yes`; the zone line; `Leap status : Normal` and a `System time` offset well under a second.
(If it says `no`, wait one minute and repeat once; still `no` is a STOP.)

### 1.6 Swap 2 GB

**Do** Skip creation if `swapon --show` already lists 2 GB.

```bash
swapon --show
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-fixflow.conf && sysctl --system >/dev/null
```

**Check**

```bash
swapon --show; free -h | grep -i swap; sysctl vm.swappiness; grep -c '^/swapfile ' /etc/fstab
```

Expected: `/swapfile` 2G listed; `Swap:` total about 2.0Gi; `vm.swappiness = 10`; `1`.

### 1.7 Unattended upgrades with a 04:30 reboot window

Only Ubuntu's own security origins are auto-installed. Docker Engine (from Docker's repo) and images
are NOT auto-updated: that is intended. Upgrade them yourself in a maintenance window.

**Do**

```bash
apt-get install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
cat > /etc/apt/apt.conf.d/52fixflow-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF
```

**Check**

```bash
apt-config dump | grep -E 'Automatic-Reboot|Unattended-Upgrade "1"'
systemctl is-enabled apt-daily-upgrade.timer
unattended-upgrade --dry-run --debug 2>&1 | tail -n 5
```

Expected: `Automatic-Reboot "true"`, `Automatic-Reboot-Time "04:30"`, `Unattended-Upgrade "1"`;
`enabled`; a dry run that ends without `Traceback` or `ERROR`. After the first automatic reboot,
confirm the heartbeat (section 7) is back within 5 minutes.

### 1.8 Docker Engine and the compose plugin (Docker's apt repo)

**Do**

VERIFY: compare these lines with the current Ubuntu instructions at docs.docker.com/engine/install/ubuntu
before running (repository URL, key path, package names).

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

**Check**

```bash
docker --version; docker compose version
systemctl is-enabled docker; systemctl is-active docker
docker info --format '{{.ServerVersion}} {{.CgroupDriver}}'
```

Expected: a Docker version and `Docker Compose version v2.x`; `enabled`; `active`; a server version.

### 1.9 The docker group is root

Anyone in the `docker` group can become root. No other user belongs in it, and the Docker socket is
never exposed over TCP.

**Do** Do not add any user to the group (no `usermod -aG docker`).

**Check**

```bash
getent group docker                       # docker:x:<gid>:   (member list empty)
ss -ltn | grep -E ':(2375|2376)\b' || echo "no docker tcp socket"
```

Expected: the member list after the last colon is empty; `no docker tcp socket`.

### 1.10 Disk space (alert note)

Postgres, Docker logs (capped at 5 x 10 MB per container by the compose file) and `pg_wal` live on
this disk. Alert at 80 %.

**Do** In the provider panel enable a disk-usage alert at 80 % to the owner's email if the provider
offers one. If it does not, put `df -h /` in the daily R0 check. Never run `docker system prune` or
`docker volume prune` on this host (the database is a named volume).

**Check**

```bash
df -h / /var/lib/docker
```

Expected: `Use%` under 80 %, and the alert (or the R0 line) exists.

### 1.11 `/opt/fixflow`: the repository at the deployed commit

**Do** Clone as root. `<repo-url>` is the repository address and `<tag-or-sha>` the release to deploy
(the `drain-image` tag until the plan says otherwise).

```bash
git clone <repo-url> /opt/fixflow
git -C /opt/fixflow checkout <tag-or-sha>
git -C /opt/fixflow rev-parse HEAD
```

VERIFY: a private repository needs a read-only deploy key or token for the clone; set that up in
your usual way. Never leave a token in the remote URL (`git -C /opt/fixflow remote -v`).

**Check**

```bash
git -C /opt/fixflow rev-parse HEAD                              # the sha you meant to deploy
git -C /opt/fixflow status --porcelain --untracked-files=no     # no output (else ffc says -dirty)
ls -l /opt/fixflow/docker-compose.prod.yml /opt/fixflow/ops/selfhost/bin/ffc
```

Expected: the exact sha; empty status; both files exist and `ffc` is executable (`-rwxr-xr-x`).
If `ops/selfhost/` is missing, that commit predates P3a: STOP and pick the right tag.

### 1.12 Link `ffc`

**Do**

```bash
ln -sfn /opt/fixflow/ops/selfhost/bin/ffc /usr/local/bin/ffc
```

**Check**

```bash
readlink -f /usr/local/bin/ffc; test -x /usr/local/bin/ffc && echo executable
```

Expected: `/opt/fixflow/ops/selfhost/bin/ffc` and `executable`. (`ffc` itself needs
`/etc/fixflow/compose.env` from section 3, so it is first run in 4.1.)

### 1.13 Directories and modes

**Do**

```bash
install -d -m 0700 -o root -g root /etc/fixflow /var/lib/fixflow /var/lib/fixflow/drain
install -d -m 0755 -o root -g root /var/log/fixflow
```

(`/etc/fixflow/cloudflared` is created in 5.5 with its own owner.)

**Check**

```bash
stat -c '%a %U:%G %n' /etc/fixflow /var/lib/fixflow /var/lib/fixflow/drain /var/log/fixflow
```

Expected: `700 root:root /etc/fixflow`, `700 root:root /var/lib/fixflow`,
`700 root:root /var/lib/fixflow/drain`, `755 root:root /var/log/fixflow`.

### 1.14 Logrotate for the FixFlow logs

**Do**

```bash
install -m 0644 -o root -g root /opt/fixflow/ops/selfhost/cron/fixflow-logrotate /etc/logrotate.d/fixflow
```

**Check**

```bash
logrotate -d /etc/logrotate.d/fixflow; echo exit=$?
```

Expected: `exit=0`, no line containing `error:`; the debug output mentions `/var/log/fixflow/*.log`
(skipped as not existing yet is fine).

---

## 2. Host ready — home box

The home box is NOT the primary host. It becomes primary only through phase P13e (runbook R9: route
to the 503 responder, stop the VPS backend and its crons, copy `/etc/fixflow`, final dump, restore,
tunnel move), and only after the box gate in 2.9 has passed. Until then it runs the box-gate probe and
serves as the off-provider dump puller and restore-drill host. Never run the heartbeat, the hourly
dump or `--profile app` here before P13e.

Items that do not apply: 1.1 (no provider firewall; the router is the boundary, see 2.4) and 1.2
(no provider backups; backups are the R2 dumps).

### 2.1 Operating system and disk

**Do** Install Ubuntu Server LTS on the box. Plan default: no disk encryption (an unattended boot
after a power cut matters more here; physical security of the box is then the control). If the
owner decides on LUKS, a passphrase prompt blocks unattended boot: record that decision in W0-results.
Install SMART tools: `apt-get install -y smartmontools`.

**Check**

```bash
lsb_release -d; lsblk -f | grep -c crypto_LUKS; smartctl -H /dev/sda | grep -i 'overall-health'
```

Expected: Ubuntu LTS; `0` (no LUKS, unless the owner decided otherwise); `PASSED`. VERIFY: the disk
device name (`/dev/sda`, `/dev/nvme0n1`) from `lsblk`.

### 2.2 BIOS: power on after AC loss

**Do** In the BIOS/UEFI set "Restore on AC power loss" / "After power failure" to `Power On`
(the menu name varies by vendor). VERIFY: the exact menu name on this machine.

**Check** Run this BEFORE any FixFlow data is on the box (it is a hard power cut). With the box
running, pull the box's own power cord (not a shutdown), wait 10 seconds, plug it back in. The box
must boot by itself, with no keypress:

```bash
uptime -s; systemctl is-active docker; systemctl is-enabled docker
```

Expected: a boot time in the last few minutes; `active`; `enabled`.

### 2.3 UPS covering the box, the ONT and the router

**Do** Plug the box, the fibre ONT (or modem) and the router into the UPS. The router is the usual
forgotten link. Note the UPS model and its rated runtime at the shop's load in W0-results. VERIFY:
the longest load-shedding gap you must ride through; if the UPS runtime is shorter, a clean shutdown
at low battery (NUT) is an owner decision and is not set up by this runbook.

**Check** With the box running and `uptime` in view, switch the UPS's wall mains off (or pull its plug)
for 15 minutes and leave it off:

```bash
uptime -s                                                   # unchanged: the box did not reboot
curl -sS https://www.cloudflare.com -o /dev/null -w '%{http_code}\n'
```

Expected: the boot time is the same before and after; the curl prints a 3-digit code (`200`, or a
`3xx`) each time you run it during the outage. `000` or a curl error = the ONT or router is not on the
UPS: STOP. Restore mains and note the UPS battery percentage after the 15 minutes.

### 2.4 The router forwards nothing

**Do** In the router admin page remove every port-forward / virtual-server / DMZ rule. Give the box a
fixed LAN address (DHCP reservation). SSH to the box is reachable from the LAN only. VERIFY: any
remote-admin overlay (VPN, private network) is an owner decision outside this runbook; never forward
port 22.

**Check** From a machine on a different network (a phone hotspot), with `<public-ip>` from
`curl -sS https://www.cloudflare.com/cdn-cgi/trace | grep '^ip='` run ON the box:

```bash
for p in 22 80 443 5432 8000; do nc -vz -w5 <public-ip> $p; done
```

Expected: every port `timed out` or `refused`; none `succeeded`.

### 2.5 Host items shared with the VPS

**Do** Run steps 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14 unchanged (replace
"provider panel" with the box's own tools in 1.10: `df -h /` in R0 is the alert).

**Check** Each step's own Check, plus:

```bash
systemctl is-enabled docker; timedatectl show -p NTPSynchronized --value
```

Expected: `enabled`; `yes`.

### 2.6 Outbound reach to the tunnel edge from the shop's ISP

**Do** Run step 5.1's egress check on this box (the home ISP can filter port 7844).

**Check** As 5.1 (`succeeded` on TCP 7844). A failure here blocks P13e; record it in W0-results.

### 2.7 The `heartbeat.env` for a not-yet-primary box

**Do** Create the file with only the probe's line (do not copy the full example here):

```bash
install -m 0600 -o root -g root /dev/null /etc/fixflow/heartbeat.env
printf 'FIXFLOW_BOXGATE_PING_URL=REPLACE-ME\n' > /etc/fixflow/heartbeat.env
```

At the off-box monitoring service create a NEW check named `fixflow-boxgate`: expected period 5
minutes, grace 5 minutes, alerting to the owner's email. It is a separate check from the VPS
heartbeat; never reuse the heartbeat URL. Put its ping URL in place of `REPLACE-ME` with an editor
(the URL is a secret: anyone holding it can mask an outage).

**Check**

```bash
stat -c '%a %U:%G %n' /etc/fixflow/heartbeat.env
grep -c REPLACE /etc/fixflow/heartbeat.env
sed -n 's/^FIXFLOW_BOXGATE_PING_URL=//p' /etc/fixflow/heartbeat.env | cut -c1-8
```

Expected: `600 root:root /etc/fixflow/heartbeat.env`; `0`; `https://`.

### 2.8 Start the box-gate probe

The probe proves only that the box is powered and online (power, UPS, router, ISP). It needs no
FixFlow service.

**Do**

```bash
/opt/fixflow/ops/selfhost/bin/fixflow-boxgate-ping.sh; echo exit=$?
install -m 0644 -o root -g root /opt/fixflow/ops/selfhost/cron/fixflow-boxgate /etc/cron.d/fixflow-boxgate
date -u +%Y-%m-%dT%H:%M:%SZ      # write this start time in W0-results
```

**Check**

Expected `exit=0` and the monitoring service shows a first ping now. After 12 minutes the service
shows 2 more pings, 5 minutes apart, and the log is empty (the script prints nothing on success):

```bash
test ! -s /var/log/fixflow/boxgate.log && echo "log empty"; ls -l /etc/cron.d/fixflow-boxgate
```

Expected: `log empty`; `-rw-r--r-- 1 root root`. If the log has text it is an error line
(`FIXFLOW_BOXGATE_PING_URL is not set` or a curl error): fix and repeat.

### 2.9 Read the 14-day gate

**Do** After 14 full days from the start time in 2.8, open the check's ping history at the
monitoring service and count received pings. The gate is: received pings at least 99.5 % of the
expected 5-minute pings over 14 days. Expected pings = 14 x 24 x 12 = 4032, so the gate is
at least 4012 received (at most 20 missed, about 100 minutes in total). Use the raw ping log, not
the service's own uptime percentage, whose method may differ. Otherwise the gate is passed by a second
uplink (owner decision; not set up here).
VERIFY: where the chosen monitoring service shows the per-ping history and how long it keeps it
(it must keep at least 14 days; export the log if not).

**Check** Write in the W0-results row: start time, end time, pings received, the percentage, and
PASS or FAIL. FAIL, or a gap longer than a few minutes you cannot explain, means the home box stays a
drill and dump host and does not become primary. P13e starts no earlier than this row says PASS.

---

## 3. Secrets and env files

Rule: secrets live in root-only files under `/etc/fixflow/`, never in git, never only on the box.
An encrypted off-host copy (password manager) plus a printed recovery sheet is part of this section,
because losing Railway's environment is what made the last incident unrecoverable by configuration.
Never `cat` an env file or paste a value into chat, a ticket or a shell command line. Compare
values by length, equality or `sha256sum` prefix only (the checks below do).

| Secret | File | How to generate | Re-mintable if lost? | Who else needs the same value |
| --- | --- | --- | --- | --- |
| `FIXFLOW_JWT_SECRET` | `backend.env` | `openssl rand -hex 32` (a NEW value for the drain; boot refuses < 32 bytes) | Yes. A new value makes every existing token 401; the v2 outbox pauses and techs log in again with name and PIN (a build without v2 drops queued job writes on it: `O10-F15`, R6.2). Plan rotation as a maintenance event | Nobody. On the P13e move, copy `backend.env` byte for byte or every phone 401s |
| `FIXFLOW_OPS_PROXY_TOKEN` | `backend.env` | `openssl rand -hex 32` | Yes; change both sides together and recreate backend (and ops) | `OPS_PROXY_TOKEN` in `ops.env` (identical). The heartbeat reads it from `backend.env` itself; the backend healthcheck reads its own environment |
| `POSTGRES_PASSWORD` | `postgres.env` | `openssl rand -hex 24` | Only while you can reach the container: it is applied on FIRST init of an empty volume only. Changing the file later does NOT change the database password (needs `ALTER ROLE` inside the container) | Nobody |
| `FIXFLOW_APP_DB_PASSWORD` | `postgres.env` | `openssl rand -hex 24` (hex only: it sits inside a URL) | As above (`ALTER ROLE fixflow_app PASSWORD ...` plus both files) | The password inside `FIXFLOW_DATABASE_URL` in `backend.env` (identical) |
| `FIXFLOW_DATABASE_URL` | `backend.env` | typed by hand: `postgresql+asyncpg://fixflow_app:<app password>@postgres:5432/fixflow` | Rebuilt from the two lines above | Contains the app DB password |
| `FIXFLOW_R2_ACCOUNT_ID`, `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`, `_BUCKET` | `backend.env` | Cloudflare dashboard, R2: create an API token with object read and write on the one bucket; the secret is shown once. The account id and bucket name are on the R2 page | Yes while the Cloudflare account lives (mint a new token, revoke the old). The secret is not retrievable later | Nobody; backups, post-drain dumps and archive uploads all go through the backend's own key |
| `FIXFLOW_FCM_SERVICE_ACCOUNT_B64` | `backend.env` | Firebase console, project settings, service accounts, generate a new private key; `base64 -w0 key.json`; paste the one line; delete `key.json` | Yes while the Firebase project is reachable. Empty = push disabled (set deliberately or not at all) | Nobody |
| `FIXFLOW_SENTRY_DSN` | `backend.env` | Sentry project settings, client keys (DSN). Empty = off | Re-readable any time from Sentry | The APK has its own DSN baked at build time |
| `FIXFLOW_WEB_SENTRY_DSN` | `compose.env` | The web project's DSN. Public by design (it is baked into the web bundle). Empty = off | Re-readable any time | Changing it needs a web rebuild |
| Tunnel credentials JSON | `/etc/fixflow/cloudflared/<tunnel-id>.json` | `cloudflared tunnel create` (5.3) | Not retrievable. Re-mint = create a new tunnel, new id, new config and DNS routes (no phone impact) | Nobody (not `cert.pem`, which is deleted in 5.6) |
| `OPS_PASSWORD` | `ops.env` | a long random passphrase: `openssl rand -base64 18` | Yes (just choose a new one) | You, typing it at the ops login; keep it in the password manager |
| `OPS_SESSION_SECRET` | `ops.env` | `openssl rand -hex 32` (set it, or every restart signs everyone out) | Yes | Nobody |
| Dead-man URLs: `FIXFLOW_HEARTBEAT_PING_URL`, `_FAIL_URL`, `FIXFLOW_HOURLY_DUMP_PING_URL`, `FIXFLOW_BOXGATE_PING_URL` | `heartbeat.env` | Created at the off-box monitoring service (7.1, 2.7). The URL itself is the secret | Yes: regenerate the check's URL at the service and edit the file | Nobody |
| `FIXFLOW_LEGACY_JWT_SECRET` + `FIXFLOW_LEGACY_JWT_EXPIRES_AT` | `backend.env` (commented out) | The value is the PREVIOUS deployment's signing secret: it cannot be generated. `EXPIRES_AT` is an ISO-8601 UTC time. Both or neither | The secret is not re-mintable; if the old one is lost there is no legacy window | The old host's secret. Default OFF. Only inside an owner-signed supervised window; it accepts old-secret tokens for write methods on tech accounts only, never `set_pin`, ignores the token's own expiry, and `EXPIRES_AT` ends it |

Also keep on the recovery sheet (not on the host): the Cloudflare login and its 2FA recovery codes,
the domain registrar login, the VPS provider login, the monitoring service login, the Firebase and
Sentry logins, and the SSH key's location. Not re-mintable: the Android keystore (export it
separately).

### 3.1 Create the files from the templates

**Do**

```bash
for n in compose postgres backend ops heartbeat; do
  install -m 0600 -o root -g root /opt/fixflow/ops/selfhost/env/$n.env.example /etc/fixflow/$n.env
done
```

`ops.env` is created even if you will not run the ops console: `ffc config` with all profiles reads
it. (On a home box that is not yet primary, do not do this; see 2.7.)

**Check**

```bash
ls -l /etc/fixflow/*.env
```

Expected: five files, each `-rw------- 1 root root`.

### 3.2 Create the dead-man checks first

**Do** Do 7.1 now (it only creates the checks at the monitoring service and gives you the ping URLs
you need in 3.7). Return here when you hold the heartbeat URL (and the hourly-dump URL).

**Check** You hold two URLs, saved in the password manager: one for the 1-minute heartbeat and one
for the hourly dump.

### 3.3 Generate the random values

**Do** Run each line separately and put each result straight into the file in 3.5-3.7 (and into the
password manager). Do not run them with the value on a command line.

```bash
openssl rand -hex 32      # FIXFLOW_JWT_SECRET
openssl rand -hex 32      # FIXFLOW_OPS_PROXY_TOKEN (and OPS_PROXY_TOKEN)
openssl rand -hex 32      # OPS_SESSION_SECRET
openssl rand -hex 24      # POSTGRES_PASSWORD
openssl rand -hex 24      # FIXFLOW_APP_DB_PASSWORD
openssl rand -base64 18   # OPS_PASSWORD
```

**Check** Six different strings; the first three are 64 characters, the next two 48.

### 3.4 Fill `compose.env`

**Do** Edit `/etc/fixflow/compose.env` with `nano` or `vi`:

1. `FIXFLOW_DOMAIN=` your domain, no scheme.
2. `FIXFLOW_CLOUDFLARED_TAG=` a released cloudflared version tag. VERIFY: pick a dated release tag from
   the cloudflared releases page or the `cloudflare/cloudflared` image tags; never `latest`.
3. Leave `FIXFLOW_ETC=/etc/fixflow` and `FIXFLOW_BACKUP_ENABLED=false` (it is turned on only at P3c
   step 7). `FIXFLOW_WEB_SENTRY_DSN` optional.

**Check**

```bash
grep -E '^(FIXFLOW_DOMAIN|FIXFLOW_CLOUDFLARED_TAG|FIXFLOW_BACKUP_ENABLED)=' /etc/fixflow/compose.env
```

Expected: your domain; the tag you chose; `FIXFLOW_BACKUP_ENABLED=false`. (compose.env holds no
secrets, so printing it is fine.)

### 3.5 Fill `postgres.env`

**Do** Set `POSTGRES_PASSWORD` and `FIXFLOW_APP_DB_PASSWORD` to the two `openssl rand -hex 24` values.
The role `fixflow_app` is created with that password the first time the database volume starts empty.

**Check**

```bash
awk -F= '$1=="POSTGRES_PASSWORD"||$1=="FIXFLOW_APP_DB_PASSWORD"{print $1, length($2)}' /etc/fixflow/postgres.env
```

Expected: both names with length `48`.

### 3.6 Fill `backend.env`

**Do** Edit `/etc/fixflow/backend.env`:

1. `FIXFLOW_DATABASE_URL=postgresql+asyncpg://fixflow_app:<FIXFLOW_APP_DB_PASSWORD>@postgres:5432/fixflow`
   (keep the `+asyncpg` scheme; host `postgres`).
2. `FIXFLOW_JWT_SECRET`, `FIXFLOW_OPS_PROXY_TOKEN` from 3.3.
3. `FIXFLOW_CORS_ORIGINS=["https://app.<domain>"]` (a JSON list).
4. The four `FIXFLOW_R2_*` values.
5. `FIXFLOW_SENTRY_DSN` and `FIXFLOW_FCM_SERVICE_ACCOUNT_B64` if used (else leave empty).
6. Leave `FIXFLOW_ENABLE_SCHEDULER=true`, `FIXFLOW_SCHEDULER_TIMEZONE=Asia/Karachi`,
   `FIXFLOW_BACKUP_RETENTION_DAYS=30`. Do not add `FIXFLOW_ENVIRONMENT`, `FIXFLOW_BACKUP_*` prefix lines or
   `FIXFLOW_ENABLE_DISPATCHER`: the compose file sets them after this file and wins.
7. Leave every line of the ceilings block and the legacy-secret block commented out.

**Check**

```bash
f=/etc/fixflow/backend.env
awk -F= '$1=="FIXFLOW_JWT_SECRET"||$1=="FIXFLOW_OPS_PROXY_TOKEN"{print $1, length($2)}' $f
[ "$(sed -n 's#^FIXFLOW_DATABASE_URL=postgresql+asyncpg://fixflow_app:\([^@]*\)@postgres:5432/fixflow$#\1#p' $f)" = "$(sed -n 's/^FIXFLOW_APP_DB_PASSWORD=//p' /etc/fixflow/postgres.env)" ] && echo "db password matches" || echo "DB PASSWORD MISMATCH"
grep -c '^FIXFLOW_LEGACY_JWT' $f
GATE_DIR=/etc/fixflow sh /opt/fixflow/ops/selfhost/bin/restore-gate.sh --env-only
```

Expected: both names with length `64`; `db password matches`; `0` (legacy verifier off);
`restore gate: backend.env OK ...`. The last line runs the restore gate's own key check. Compose
reads `name: value`, `export name=value`, `name = value` and any letter case as separate
variables, and the settings loader lowercases every name, so a `fixflow_environment: dev` line
could beat the compose's `FIXFLOW_ENVIRONMENT=production`. The gate allows a forced key only in
the exact `NAME=value` form and refuses any key that is not a plain ASCII name. It refuses to let
the backend start while such a line exists, and names the line and key, never the value.

### 3.7 Fill `ops.env` and `heartbeat.env`

**Do**

1. `ops.env`: `OPS_PASSWORD`, `OPS_SESSION_SECRET`, `OPS_PROXY_TOKEN` (the SAME value as
   `FIXFLOW_OPS_PROXY_TOKEN`), `OPS_HEALTH_TARGETS` with your domain. Leave every `OPS_RAILWAY_*` and
   `RAILWAY_*` line out. The Sentry lines stay commented unless Sentry SaaS is used.
2. `heartbeat.env`: `FIXFLOW_HEARTBEAT_HEALTH_URL=https://api.<domain>/api/ops/health`;
   `FIXFLOW_HEARTBEAT_PING_URL` = the 1-minute check's URL from 3.2; `FIXFLOW_HOURLY_DUMP_PING_URL` = the
   hourly check's URL; `FIXFLOW_HEARTBEAT_FAIL_URL` optional; leave `FIXFLOW_BOXGATE_PING_URL` empty on a VPS.

**Check**

```bash
[ "$(sed -n 's/^FIXFLOW_OPS_PROXY_TOKEN=//p' /etc/fixflow/backend.env)" = "$(sed -n 's/^OPS_PROXY_TOKEN=//p' /etc/fixflow/ops.env)" ] && echo "ops token matches" || echo "OPS TOKEN MISMATCH"
grep -E '^FIXFLOW_HEARTBEAT_HEALTH_URL=' /etc/fixflow/heartbeat.env
```

Expected: `ops token matches`; the health URL with your domain.

### 3.8 Permissions and no placeholders left

**Do**

```bash
chown root:root /etc/fixflow/*.env && chmod 600 /etc/fixflow/*.env
```

**Check**

```bash
stat -c '%a %U:%G %n' /etc/fixflow/*.env
grep -c REPLACE /etc/fixflow/*.env
```

Expected: five lines, each `600 root:root /etc/fixflow/<name>.env`; the count for every file is `0`.
Any file with a count above 0 still has a placeholder: STOP and fill it.

### 3.9 The encrypted off-host copy and the recovery sheet

**Do**

1. From your laptop copy the files out and store them as attachments in the password manager (an
   encrypted vault), then delete the local copies:

```bash
scp root@<vps-ip>:/etc/fixflow/{compose,postgres,backend,ops,heartbeat}.env .
```

2. Add the tunnel credentials JSON after 5.6 (same way), and the R2 token, FCM key and legacy secret if
   any, as their own items.
3. Print one recovery sheet: the accounts listed under the table above, their 2FA recovery codes, where
   the vault and the SSH key are, and who else can open them. Keep it physically apart from the
   box.

**Check** On the host and on the laptop compute a fingerprint of each file, and compare:

```bash
sha256sum /etc/fixflow/*.env | cut -c1-12     # on the host
sha256sum *.env | cut -c1-12                  # on the laptop, in the folder you scp'd into
```

Expected: the same twelve characters per file on both sides. Then the vault item opens on a second
device and the sheet is printed. Record "off-host copy done" in the W0-results row.

---

## 4. Install the stack

Define the profile sets once per SSH session (profiles are not remembered):

```bash
P_DB="--profile db"
P_RUN="--profile db --profile app --profile web --profile edge"
P_ALL="--profile db --profile app --profile web --profile ops --profile edge"
```

Nothing is started in this section.

### 4.1 The compose file renders with every profile

**Do**

```bash
ffc $P_ALL config -q; echo exit=$?
```

**Check** Expected: `exit=0` and nothing else. An error naming a variable (`FIXFLOW_DOMAIN`,
`FIXFLOW_CLOUDFLARED_TAG`) or a missing env file means 3.x is incomplete: STOP.

### 4.2 The overrides and the no-ports rule are in the rendered file

**Do**

```bash
ffc $P_ALL config | grep -E 'FIXFLOW_(ENVIRONMENT|BACKUP_PREFIX|BACKUP_ENABLED|ENABLE_DISPATCHER|CORS_ORIGINS)'
ffc $P_ALL config | grep -cE '^ +ports:'
```

**Check** Expected: `FIXFLOW_ENVIRONMENT: production`, `FIXFLOW_BACKUP_PREFIX: backups/db-selfhost/`,
`FIXFLOW_BACKUP_ENABLED: "false"`, `FIXFLOW_ENABLE_DISPATCHER: "false"`, and your CORS list with its
double quotes intact; and `0` for the `ports:` count (grep exits 1 on a zero count; that is expected).
VERIFY: this compose version inlines `env_file` values into `config` output. If the CORS line is
absent, check it after the backend first runs: `ffc exec -T backend printenv FIXFLOW_CORS_ORIGINS`
must print `["https://app.<domain>"]` with the quotes.

### 4.3 Pull the pinned images and build ours

**Do** On a 2 vCPU / 4 GB host the web build takes several minutes; wait for it.

```bash
ffc $P_ALL pull postgres restore-gate edge
ffc $P_ALL build backend web ops
```

**Check**

```bash
docker image ls --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep -E '^(postgres:17-bookworm|cloudflare/cloudflared|fixflow/)'
git -C /opt/fixflow rev-parse HEAD
```

Expected: `postgres:17-bookworm`, `cloudflare/cloudflared:<your tag>`, and `fixflow/backend`, `fixflow/web`,
`fixflow/ops`, each tagged with exactly the sha printed on the last line (a `-dirty` suffix means the
checkout has local changes: go back to 1.11).

### 4.4 Record the image digests

Tags move; the digest identifies what you run. Never `docker pull` again, or prune images, without
recording the new digest.

**Do**

```bash
SHA="$(git -C /opt/fixflow rev-parse HEAD)"
CF_TAG="$(sed -n 's/^FIXFLOW_CLOUDFLARED_TAG=//p' /etc/fixflow/compose.env)"
{
  echo "recorded $(date -u +%Y%m%dT%H%M%SZ) git $SHA"
  echo "postgres    $(docker image inspect --format '{{index .RepoDigests 0}}' postgres:17-bookworm)"
  echo "cloudflared $(docker image inspect --format '{{index .RepoDigests 0}}' cloudflare/cloudflared:$CF_TAG)"
  for s in backend web ops; do echo "$s $(docker image inspect --format '{{.Id}}' fixflow/$s:$SHA)"; done
} | tee /var/lib/fixflow/image-digests-$(date -u +%Y%m%dT%H%M%SZ).txt
```

**Check** Expected: five lines after the header, the first two ending `@sha256:<64 hex>`, the other three
`sha256:<64 hex>`; the file exists under `/var/lib/fixflow/`. Copy the lines into the W0-results
deploy-train row.

### 4.5 No container publishes a port (repeat this after EVERY `up`)

**Do**

```bash
docker ps --format '{{.Names}} [{{.Ports}}]'
docker ps --format '{{.Names}} [{{.Ports}}]' | grep -- '->' ; echo "published=$?"
ss -ltnp | grep -E 'docker-proxy' ; echo "proxy=$?"
```

**Check** Expected: no line contains `->`, so `published=1`; no `docker-proxy` process, so `proxy=1`; the
host's listening sockets are sshd and the system resolver only. Right now nothing is running, so the
first command prints nothing. Later a container can show an unpublished image port such as
`[5432/tcp]` or `[8000/tcp]`: that is fine, it is not reachable from outside. What must never appear is
`0.0.0.0:...->...` or `[::]:...->...`. If it does: STOP, `ffc $P_ALL stop`, and find the `ports:` line
(the compose file has none, so a local edit or an `FF_EXTRA_COMPOSE` override is the cause).

---

## 5. Cloudflare: tunnel, DNS and `api.` settings

Tool choice: use the cloudflared CONTAINER at the same pinned tag as the compose file (no cloudflared
binary on the host). `$DOMAIN` and `$CF_TAG` below come from `compose.env`; set them once per session:

```bash
DOMAIN="$(sed -n 's/^FIXFLOW_DOMAIN=//p' /etc/fixflow/compose.env)"
CF_TAG="$(sed -n 's/^FIXFLOW_CLOUDFLARED_TAG=//p' /etc/fixflow/compose.env)"
CFDIR=/etc/fixflow/cloudflared
echo "$DOMAIN $CF_TAG"
```

From a laptop, type your domain in place of `$DOMAIN`.

### 5.1 Prerequisites: zone active, outbound reach to the tunnel edge

**Do** In the Cloudflare dashboard the domain's zone shows `Active`, on Cloudflare DNS, with 2FA on the
account. On the host:

```bash
dig +short NS "$DOMAIN"
nc -vz -w5 region1.v2.argotunnel.com 7844
```

**Check** Expected: the NS lines name Cloudflare name servers; `succeeded` for TCP 7844.
VERIFY: the hostname `region1.v2.argotunnel.com` and port 7844 against Cloudflare's current "tunnel
connectivity prechecks" page; the UDP path (QUIC) cannot be tested reliably with `nc -u`, TCP is the
fallback cloudflared uses.

### 5.2 Log in (a one-time certificate)

**Do**

```bash
install -d -m 0700 -o 65532 -g 65532 /root/cf-setup
docker run --rm -it -v /root/cf-setup:/home/nonroot/.cloudflared cloudflare/cloudflared:$CF_TAG tunnel login
```

It prints a URL. Open it in your laptop's browser, choose the domain's zone, authorize.
VERIFY: the container user's home is `/home/nonroot` (the mount target), and the login flow prints a URL
rather than needing a local browser.

**Check**

```bash
ls -l /root/cf-setup/cert.pem
```

Expected: the file exists. `cert.pem` is a full-power account certificate: it is deleted in 5.6.

### 5.3 Create the tunnel

**Do**

```bash
docker run --rm -v /root/cf-setup:/home/nonroot/.cloudflared cloudflare/cloudflared:$CF_TAG tunnel create fixflow
```

**Check**

```bash
ls /root/cf-setup/*.json
TUNNEL_ID="$(basename /root/cf-setup/*.json .json)"; echo "$TUNNEL_ID"
```

Expected: exactly one JSON file; the id is a UUID and equals the id printed by `tunnel create`.
More than one file or an error such as `tunnel with name already exists` is a STOP.

### 5.4 DNS routes for `api.` and `app.`

**Do**

```bash
docker run --rm -v /root/cf-setup:/home/nonroot/.cloudflared cloudflare/cloudflared:$CF_TAG tunnel route dns fixflow "api.$DOMAIN"
docker run --rm -v /root/cf-setup:/home/nonroot/.cloudflared cloudflare/cloudflared:$CF_TAG tunnel route dns fixflow "app.$DOMAIN"
```

`ops.` is not routed now: it goes live only behind Cloudflare Access (5.16). If a command reports an
existing record for the name, STOP and look at the DNS page (do not overwrite a record you do not
recognise).

**Check**

```bash
dig +short "api.$DOMAIN"; dig +short "app.$DOMAIN"
```

Expected: Cloudflare edge addresses (proxied records answer with edge IPs, not a CNAME), and none is
`<vps-ip>`. In the dashboard DNS page both names are `CNAME <tunnel-id>.cfargotunnel.com`, Proxied.

### 5.5 Place the credentials and the config files

**Do** The credentials file and configs belong to `65532:65532` (cloudflared runs as that user), mode
`0400`, in a `0500` directory. `config.yml` is the ACTIVE file; at install it is a copy of the
maintenance file, so `api.` answers 503 to the world until the cutover (5.9).

```bash
install -d -m 0500 -o 65532 -g 65532 "$CFDIR"
install -m 0400 -o 65532 -g 65532 "/root/cf-setup/$TUNNEL_ID.json" "$CFDIR/$TUNNEL_ID.json"
EX=/opt/fixflow/ops/selfhost/cloudflared
put() { t="$(mktemp)"; sed -e "s/REPLACE-WITH-TUNNEL-UUID/$TUNNEL_ID/g" -e "s/example\.invalid/$DOMAIN/g" "$1" > "$t"; install -m 0400 -o 65532 -g 65532 "$t" "$2"; rm -f "$t"; }
put $EX/config.example.yml             "$CFDIR/config.normal.yml"
put $EX/config.maintenance.example.yml "$CFDIR/config.maintenance.yml"
put $EX/config.maintenance.example.yml "$CFDIR/config.yml"
```

**Check**

```bash
stat -c '%a %u:%g %n' "$CFDIR" "$CFDIR"/*
grep -c REPLACE "$CFDIR"/*.yml
sed -n '/^ingress:/,$p' "$CFDIR/config.normal.yml"
```

Expected: the directory `500 65532:65532`; four files `400 65532:65532` (the JSON and three yml); every
yml count `0`; the normal ingress lists `api.<domain>` to `http://backend:8000`, `app.<domain>` to
`http://web:80`, and the last rule `service: http_status:503` (never 404).

### 5.6 Secure the setup directory

**Do** First store `/root/cf-setup/<tunnel-id>.json` in the password manager (3.9 step 2: `scp` it to
your laptop, attach it, delete the laptop copy). Then destroy the setup directory:

```bash
shred -u /root/cf-setup/cert.pem "/root/cf-setup/$TUNNEL_ID.json"
rmdir /root/cf-setup
```

**Check**

```bash
ls -A /root/cf-setup 2>&1 | head -n 1
```

Expected: `ls: cannot access '/root/cf-setup': No such file or directory`. After this, creating
another tunnel or route needs a new `tunnel login`.

### 5.7 Validate the ingress rules

**Do**

```bash
for f in config.normal.yml config.maintenance.yml; do
  docker run --rm --network none -v /etc/fixflow/cloudflared:/etc/cloudflared:ro cloudflare/cloudflared:$CF_TAG \
    tunnel --config /etc/cloudflared/$f ingress validate
done
docker run --rm --network none -v /etc/fixflow/cloudflared:/etc/cloudflared:ro cloudflare/cloudflared:$CF_TAG \
  tunnel --config /etc/cloudflared/config.normal.yml ingress rule https://unknown.example.invalid/
docker run --rm --network none -v /etc/fixflow/cloudflared:/etc/cloudflared:ro cloudflare/cloudflared:$CF_TAG \
  tunnel --config /etc/cloudflared/config.normal.yml ingress rule "https://api.$DOMAIN/api/health"
```

**Check** Expected: both `validate` runs end `OK`; the `unknown.example.invalid` URL matches the LAST rule,
service `http_status:503`; the `api.` URL matches rule `#1`, service `http://backend:8000`.
VERIFY: the exact wording of the `ingress validate` and `ingress rule` output for the installed tag; the
required facts are no error, and the catch-all being `http_status:503`.

### 5.8 Route to maintenance (every hostname answers 503), and first start of the edge

Use this before the restore is signed off, during a restore, and for the R9 host move. A 503 without
the app's marker header is "connectivity" to the phones: they keep their queue.

**Do**

```bash
cd /etc/fixflow/cloudflared
if cmp -s config.yml config.normal.yml || cmp -s config.yml config.maintenance.yml; then
  install -m 0400 -o 65532 -g 65532 config.maintenance.yml config.yml
  ffc $P_RUN up -d --force-recreate edge
else
  echo "config.yml matches neither saved file: STOP"
fi
```

(`config.normal.yml` is the saved normal routing. The guard refuses to overwrite a `config.yml` that
was edited by hand and matches neither saved file, so no routing is ever lost. If it prints STOP, run
`diff` against both, decide, and save the intended normal file as `config.normal.yml` first.)

**Check**

```bash
ffc $P_RUN logs --tail 30 edge | grep -ci 'registered tunnel connection'
curl -sS -D - -o /dev/null "https://api.$DOMAIN/api/health" | grep -iE '^(HTTP|server|x-fixflow-api)'
curl -sS -o /dev/null -w '%{http_code}\n' "https://api.$DOMAIN/api/health"
```

Expected: the first count is at least `1` (VERIFY: the log wording, `Registered tunnel connection`, for the
installed tag); the header lines show `HTTP/2 503` and `server: cloudflare` and NO `x-fixflow-api` line;
the last command prints `503`. Run 4.5 (no published ports) now.

### 5.9 Route to the backend (normal routing)

Run this ONLY when the later phase says so (the cutover), with the backend up, the restore signed off,
and deep health reading `database` ok. Never before: it opens `api.` to the fleet.

**Do**

```bash
cd /etc/fixflow/cloudflared
install -m 0400 -o 65532 -g 65532 config.normal.yml config.yml
ffc $P_RUN up -d --force-recreate edge
```

**Check**

```bash
ffc $P_RUN logs --tail 30 edge | grep -ci 'registered tunnel connection'
curl -sS -D - -o /dev/null "https://api.$DOMAIN/api/health" | grep -iE '^(HTTP|server|x-fixflow-api)'
```

Expected: at least `1`; `HTTP/2 200`, `server: cloudflare` and `x-fixflow-api: 1`. With the backend
stopped in normal routing the answer is a 5xx (expected `502`; VERIFY on first test); any 4xx is a STOP.
`curl -I` (a HEAD request) is not a valid check: the health route answers GET only, so a HEAD returns 405.

### 5.10 The stopped-tunnel test (O-08 section 4 (v), HYPOTHESIS)

Whether a stopped tunnel yields exactly a Cloudflare 530/1033 is a HYPOTHESIS. Test it while `api.` is on
the maintenance route (5.8) and before any phone is admitted.

**Do**

```bash
ffc $P_RUN stop edge
sleep 45
curl -sS -i -m 20 "https://api.$DOMAIN/api/health" | head -n 20
curl -sS -o /dev/null -w '%{http_code}\n' -m 20 -A 'okhttp/4.12.0' "https://api.$DOMAIN/api/health"
ffc $P_RUN up -d edge
```

**Check** Record the status line and any `error code: 1033` text in the W0-results row. Expected: a
Cloudflare 5xx (530 with error 1033 is the documented case; any other 5xx is acceptable to the phones
but must be recorded), or a connection failure. If ANY 4xx appears (403, 404, 1020, a challenge): STOP,
do not open `api.`, and bring the output to the review. After `up -d edge`, repeat the 5.8 Check
(`503`).

### 5.11 `api.`: WAF managed rules off

A challenge or block answers 403, which the phones treat as a definitive refusal and park a write.

**Do** Cloudflare dashboard, the zone, Security, WAF: turn the managed rulesets off, or add a custom
rule with expression `http.host eq "api.<domain>"` and action `Skip` for "all managed rules"
(not for rate limiting rules). VERIFY: the menu names (Security, WAF, Managed rules, Custom rules) and
whether a free-plan managed ruleset is deployed by default on this zone.

**Check** From the laptop:

```bash
curl -sS -D - -o /dev/null "https://api.example.invalid/api/health?x=%3Cscript%3Ealert(1)%3C/script%3E" | grep -iE '^(HTTP|cf-mitigated|server)'
```

Expected: `HTTP/2 503` while on the maintenance route (`200` after 5.9), `server: cloudflare`, no
`cf-mitigated` line. A 403 or `cf-mitigated: challenge` is a STOP.

### 5.12 Bot Fight Mode and Browser Integrity Check off

**Do** Dashboard, the zone, Security, Bots: Bot Fight Mode OFF. Security, Settings: Browser Integrity
Check OFF. VERIFY: the menu names; Bot Fight Mode is zone-wide on the free plan (a hostname skip rule
cannot exempt `api.`), so it is off for the whole zone including `app.`.

**Check**

```bash
for ua in 'curl/8.5.0' 'okhttp/4.12.0' 'python-requests/2.32' ''; do
  curl -sS -D - -o /dev/null -A "$ua" "https://api.example.invalid/api/health" | grep -iE '^(HTTP|server|cf-mitigated)'
done
```

Expected: four identical answers (`503` now, `200` after 5.9), each with `server: cloudflare` and no
`cf-mitigated`. A 403 for any user agent is a STOP.

### 5.13 Challenges, Under Attack Mode and Cloudflare Access off for `api.`

**Do**

1. Security, Settings: security level not "I'm Under Attack"; no challenge passage page. VERIFY: names.
2. Zero Trust, Access, Applications: no application whose hostname covers `api.<domain>` (no wildcard
   `*.<domain>` either).
3. No Page Rule, Configuration Rule or Transform Rule that redirects or challenges `api.`.

**Check**

```bash
curl -sS -D - -o /dev/null "https://api.example.invalid/api/health" | grep -iE '^(HTTP|location|cf-access|set-cookie|server)'
```

Expected: only `HTTP/2 503` (later `200`) and `server: cloudflare`. A `location:` to
`cloudflareaccess.com`, a `cf-access-*` header or a 302 is a STOP.

### 5.14 Rate limiting: 429 with Retry-After only

**Do** The only rate rule allowed on `api.` is the login rule from the plan (P3c step 5). Its action must
answer `429` with a `Retry-After` header; never a block that returns 403, a challenge or a JS check.
Create it only in that phase. VERIFY: the rule's response settings and that the free plan's rate-limit
response carries `Retry-After`.

**Check** With a rule in place, from the laptop send repeated requests to a path the rule matches
(REPLACE-ME is the rule's path; use a throwaway path, never real credentials):

```bash
for i in $(seq 1 40); do curl -sS -o /dev/null -D - "https://api.example.invalid/REPLACE-ME" | grep -iE '^(HTTP|retry-after)'; done | sort | uniq -c
```

Expected: any limited response is `HTTP/2 429` with a `retry-after:` line; no 403. With no rule, record
"no rate rule" and skip.

### 5.15 The domain: auto-renew, multi-year, registrar lock, 2FA

A lapsed domain or a registrar parking page is the same failure class as Railway's 404.

**Do** At the registrar: auto-renew ON, registered for several years, registrar/transfer lock ON, 2FA on the
registrar login, a payment method that will not expire, recovery email you control. Same for the
Cloudflare account: 2FA and the recovery codes on the sheet (3.9).

**Check** From the laptop:

```bash
whois example.invalid | grep -iE 'expir|status'
```

Expected: an expiry date at least 2 years out and a status line containing `clientTransferProhibited`
(the lock). VERIFY: some registries print different field names; the registrar panel is the
authority.

### 5.16 `app.` and `ops.` behind Cloudflare Access (allowed, optional)

**Do** Zero Trust, Access, Applications: add a self-hosted application for `app.<domain>` (and `ops.<domain>`
if used) with an allow policy for the owner's and managers' emails. Never for `api.`. `ops.` stays
unrouted (5.4) unless it is behind Access. VERIFY: Access free-tier seat count and the menu names.

**Check**

```bash
curl -sS -D - -o /dev/null "https://app.example.invalid/" | grep -iE '^(HTTP|location)'
```

Expected: a `302` to `cloudflareaccess.com` for `app.` (and a `503` while the maintenance routing is
active). And `api.` still shows no `location:` (5.13).

### 5.17 One outside check of `api.` after any dashboard change

**Do** From the laptop, after ANY change in the dashboard:

```bash
curl -sS -D - -o /dev/null "https://api.example.invalid/api/health" | grep -iE '^(HTTP|server|x-fixflow-api|cf-mitigated|location)'
```

**Check** Expected on maintenance: `HTTP/2 503`, `server: cloudflare`, nothing else. Expected on normal
routing: `HTTP/2 200`, `server: cloudflare`, `x-fixflow-api: 1`, nothing else. Anything else, especially
a 4xx, a `location`, `cf-mitigated`, or a missing marker on the 200, is a STOP.

---

## 6. Restore and admit traffic (O-08 section 3; O-10 B1-B3)

The order is the safety. **The backend must not start before the restore is verified**: a backend
that boots on an empty database runs `alembic upgrade head`, builds a schema and seeds
`dispatch_cursor`, and the restore then collides with it. The compose enforces this with the
restore gate (`/etc/fixflow/restore-signed-off`), and every step below runs as the database owner
`fixflow_app`, never as `postgres`, so restored objects belong to the role the app connects as.

**From `T_open` on, do not use this section on its own.** Any restore after the first phone has
drained — a provider snapshot, an hourly dump, a nightly dump — is an **O-10 R2 restore**: it needs
every drained phone's manifest (section 8.6; off-host copies under `archive/manifests/` and the
post-drain dumps under `archive/post-drain/`, each phone's keys in its W0-results row), a replay
through `drain_audit.py`, and the owner's written sign-off. A phone deletes a record once it has
landed, so a restore to a point before that landing loses it on both sides.

Recovery cases (settled in P0a, recorded in W0-results): **a** a Supabase project or its logical
backup is available; **b** only an R2 dump (`backups/db/fixflow-db-<stamp>.dump`) exists; **c**
nothing, the database starts empty and only the phones carry data.

### 6.1 Close the doors

**Do** If the tunnel already exists, route it to the 503 responder FIRST (step 5.8), then:

```bash
rm -f /etc/fixflow/restore-signed-off
ffc stop backend; ffc ps
```

**Check** `test ! -e /etc/fixflow/restore-signed-off && echo gate-closed` prints `gate-closed`;
`ffc $P_RUN ps` lists no running `backend`. With a tunnel: `curl -sS -o /dev/null -w '%{http_code}\n' https://api.example.invalid/api/health` prints `503`.

### 6.2 The source is archived before anything is loaded (cases a and b)

**Do** Nothing on the host: P0a item 3 (`docs/program/lab/p0a/r2-archive.sh`) copied the old
dumps to `archive/pre-selfhost/` in R2 and to the owner's laptop, and P0a item 4 produced and
verified the case-a dump. Copy the chosen dump to the host:

```bash
install -d -m 700 /var/lib/fixflow/restore
# from the laptop: scp <dump> root@<host>:/var/lib/fixflow/restore/
```

**Check** `sha256sum /var/lib/fixflow/restore/<dump>` equals the sha256 recorded for that file in
W0-results (P0a items 3/4). Different: STOP. Prefer the live case-a dump; the newest R2 dump is
the cross-check and the fallback (compare both with Appendix B in 6.8).

### 6.3 Postgres alone

**Do**

```bash
ffc $P_DB up -d
```

**Check** (expected: `healthy`, then `fixflow_app|fixflow_app|false`, then a `17.` version):

```bash
docker inspect --format '{{.State.Health.Status}}' $(ffc $P_DB ps -q postgres)
ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc "select current_user || '|' || pg_get_userbyid(datdba) || '|' || (select rolsuper from pg_roles where rolname = 'fixflow_app') from pg_database where datname = 'fixflow'"
ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc 'show server_version'
```

### 6.4 The code head this image migrates to

**Do**

```bash
ffc $P_DB --profile app run --rm --no-deps --entrypoint alembic backend heads
```

**Check** prints `0046 (head)`. A dump whose `alembic_version` is ABOVE this head must not be
loaded under this image: STOP (never `alembic downgrade`; never run an image below the database's
head).

### 6.5 Case c only: nothing to load

**Do** Skip 6.6-6.8. Write the sign-off in 6.9 with `case=c`; the backend's first start builds
the schema (migrations 0001-0046, seed accounts `t1`..`t5` and `m1`, the cursor seeded at the
`job_event` head). Then do 6.11-6.14, which are mandatory in case c (the seed PIN is public).

### 6.6 Prove the dump, and save what the database holds now (cases a and b)

Nothing is dropped in this step. It proves the dump will load, and, if the database already has
tables (R3 on a live host, a second attempt), saves them off the host first. Manager-side writes
made since the dump are in no phone manifest: without this copy they are lost the moment 6.7
drops the schema.

**Do** (a) the dump and its restore list:

```bash
D=<dump file name>
ffc exec -T postgres mkdir -p /restore
ffc cp /var/lib/fixflow/restore/$D postgres:/restore/$D
ffc exec -T postgres sha256sum /restore/$D
ffc exec -T postgres sh -c 'pg_restore -l "$1" > "$1.toc" && grep -v -E "^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public " "$1.toc" > "$1.list"' _ /restore/$D; echo "list exit=$?"
ffc exec -T postgres grep -c 'SCHEMA - public' /restore/$D.list
ffc exec -T postgres grep -c 'TABLE DATA' /restore/$D.list
```

The dump's own `SCHEMA - public` entry is left out of the list: a dump taken with
`--schema=public` (every nightly, hourly and post-drain dump, `core/backup.py`) carries
`CREATE SCHEMA public`, which fails on the schema 6.7 recreates and stops `--exit-on-error`
(`O08-F06`; the 2026-08-02 drill in `docs/RUNBOOK-BACKUPS.md`). Dropping alone is not the fix: a
dump taken without `--schema` (the B5 form) does not create the schema.

**Check (a)** the in-container `sha256sum` equals 6.2's (R3: the receipt's, R3.4); `list exit=0`; the first
`grep -c` prints `0` (the list has no schema entry; `COMMENT - SCHEMA public` lines stay, they are
fine) and the second a number above `30` (the tables with data; an empty list would "restore"
nothing and still exit 0). Anything else: STOP; nothing has been touched.

**Do** (b) count the live tables; if the count is not `0`, dump the live database and put the copy
off the host (the backend is stopped since 6.1, so nothing writes):

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc "select count(*) from pg_tables where schemaname = 'public'"
# only when that count is not 0:
S=$(date -u +%Y%m%dT%H%M%SZ)
ffc exec -T postgres pg_dump -U fixflow_app -d fixflow --format=custom > /var/lib/fixflow/restore/pre-restore-$S.pgdump; echo "dump exit=$?"
ffc exec -T postgres sh -c 'cat > /tmp/p.dump && pg_restore -l /tmp/p.dump | grep -c "TABLE DATA"; rm -f /tmp/p.dump' < /var/lib/fixflow/restore/pre-restore-$S.pgdump
sha256sum /var/lib/fixflow/restore/pre-restore-$S.pgdump
/opt/fixflow/ops/selfhost/bin/fixflow-r2-put.sh /var/lib/fixflow/restore/pre-restore-$S.pgdump archive/pre-restore/pre-restore-$S.pgdump
```

**Check (b)** count `0`: write "pre-restore: empty, no copy" in W0-results and go on. Otherwise:
`dump exit=0`; the `TABLE DATA` count is above `30`; the upload prints
`uploaded key=archive/pre-restore/pre-restore-<S>.pgdump` with the same sha256 as `sha256sum`;
record key and sha256 in W0-results. If the upload fails, copy the file off the host another way
(`scp` to the laptop) and record its sha256 there; never go to 6.7 while the only copy is on the
host's own disk. `archive/` is never pruned (`core/backup.py`).

### 6.7 Empty the schema and load the dump, as the owner

**Do** (in the same shell as 6.6: `D` is still set)

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public'
ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc "select count(*) from pg_tables where schemaname = 'public'"
ffc exec -T postgres pg_restore --no-owner --no-privileges --exit-on-error -U fixflow_app -d fixflow -L /restore/$D.list /restore/$D; echo "restore exit=$?"
```

The schema is recreated empty and owned by `fixflow_app`. `--no-owner --no-privileges` as in
O-08 section 3: a dump taken with owners (a dashboard download) would otherwise stop on
`ALTER ... OWNER` to a role this database does not have.

**Check** the count prints `0`; `restore exit=0`. Any other exit: STOP, keep the log, do not
start the backend; redo 6.7 (the list from 6.6 is unchanged). To go back to the database as it
was, load 6.6's `pre-restore-<S>.pgdump` with the same two steps (its own list, then 6.7).

### 6.8 Appendix B: the restored facts (all must pass before the backend starts)

**Do**

```bash
ffc cp /opt/fixflow/ops/selfhost/sql/appendix-b.sql postgres:/restore/appendix-b.sql
ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -f /restore/appendix-b.sql > /var/lib/fixflow/restore/appendix-b-$(date -u +%Y%m%dT%H%M%SZ).txt; echo "queries exit=$?"
ffc exec -T postgres psql -U fixflow_app -d fixflow -tA -F ' ' -c "select 'job_token_seq', (select last_value from job_token_seq), (select max(token) from job) union all select 'job_event_seq', (select last_value from job_event_seq), (select max(seq) from job_event) union all select 'shop_setting_seq', (select last_value from shop_setting_seq), (select max(seq) from shop_setting)"
```

**Check**, each line, against the P0a `dumpfacts-<stamp>.txt` of the SAME dump (from
`verify-dump.sh`):

1. `queries exit=0`.
2. `version_num` is `0045` or `0046` and not above 6.4's head.
3. Every table's row count equals the P0a figure for this dump (`diff` the two count blocks).
4. `job_payment` non-voided sum and the `staff_ledger` / `staff_ledger_chain` counts equal P0a's.
5. In the sequence query, the first number is at or above the second on all three lines. A
   sequence below its table's max makes every write a 500 while reads stay green.
6. `dispatch_cursor`: a 0046 dump has the `whatsapp` row at or near `max(job_event.seq)`; a 0045
   dump has none (migration 0046 seeds it on the backend's first start, at the restored head).
7. `attendance_geofence`: note whether an active row carries the workshop's real coordinates.
   Whatever it says, 6.12 sets it.

Any mismatch: STOP and record it; the dump is not signed off.

### 6.9 Sign off and start the backend (tunnel still on the 503 responder)

**Do**

```bash
printf 'signed-off case=<a|b|c> dump=<file or none> sha256=<sum or none> by=<owner> at=%s\n' "$(date -u +%FT%TZ)" > /etc/fixflow/restore-signed-off
chmod 600 /etc/fixflow/restore-signed-off
ffc $P_DB --profile app up -d
```

**Check** `ffc $P_DB --profile app logs restore-gate` shows `restore gate: signed off`; within two
minutes `docker inspect --format '{{.State.Health.Status}}' $(ffc $P_DB --profile app ps -q backend)`
prints `healthy`; deep health (section 0) shows `database` `ok`, `facts.environment`
`production`, `facts.enable_dispatcher` `false`, `facts.backup_enabled` `false`,
`facts.backup_prefix` `backups/db-selfhost/`, `facts.git_sha` equal to
`git -C /opt/fixflow rev-parse HEAD`, and the `migrations` component `ok` at `0046`.
`ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc 'select consumer, last_seq from dispatch_cursor'`
prints `whatsapp|<max job_event.seq>`.

### 6.10 Case c extra: the job ticket sequence

**Do** Set `N` well above the highest ticket number any customer holds or any phone's job cache
shows (printed tickets ran 1051-1057 and above; take the A3 photos and P0a item 5 into account):

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -c "select setval('job_token_seq', <N>, true)"
```

**Check** `ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc 'select last_value from job_token_seq'`
prints `<N>`. Also expect, per O-10 "Recovery case: nothing": punches, crossings and pings land
for the seeded ids; offline creates land as new jobs; every other write for an old job id parks
with an app 404 (visible, never discarded: the manager re-enters it from the manifest archive,
cash first); travel samples for missing jobs are dropped.

### 6.11 Roster check: every technician id any phone holds exists

**Do** With the list from P0a item 5 (`t1 t2 …`):

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -tA -c "select x from unnest(string_to_array('<t1 t2 t3 ...>', ' ')) as x where x not in (select id from technician)"
```

For each id printed, create it with an unusable random PIN (6.13 then sets the real one):

```bash
ffc exec -T -e FF_ID=<id> -e FF_NAME='<Display Name>' -e FF_ROLE=tech backend python -c '
import asyncio, os, secrets
import app.registry  # noqa: F401
from app.core.db import SessionLocal
from app.features.identity.models import Technician
from app.features.identity.security import hash_pin
async def main():
    async with SessionLocal() as s:
        s.add(Technician(id=os.environ["FF_ID"], name=os.environ["FF_NAME"], role=os.environ["FF_ROLE"], pin_hash=hash_pin(secrets.token_hex(16))))
        await s.commit()
asyncio.run(main())'
```

**Check** the first command, run again, prints nothing.

### 6.12 The workshop fence (O-10 B3; `O10-F14`)

The app uses the newest active, undeleted row for the shop. A missing or `(0,0)` fence makes every
phone stop geofencing the moment it connects. Coordinates come from P0a item 9.

**Do**

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
UPDATE attendance_geofence SET is_active = false, updated_at = now()
 WHERE shop_id = 'default' AND is_active AND deleted_at IS NULL;
INSERT INTO attendance_geofence (shop_id, name, center_lat, center_lng, radius_m, is_active)
VALUES ('default', 'Workshop', <lat>, <lng>, 80, true);
COMMIT;
SQL
ffc $P_DB --profile app up -d --force-recreate backend
```

**Check** exactly one row, with the coordinates typed and `80`:

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc "select center_lat, center_lng, radius_m from attendance_geofence where shop_id = 'default' and is_active and deleted_at is null"
```

### 6.13 PINs, before any phone can reach the host (O-10 B3; ruling R4)

**Do** List the accounts still on a seed PIN, then set each (6+ digits, never `1234`/`123456`;
the script prompts twice; the PIN never goes on the command line). A restored database's real PINs
may stay; a fresh one (case c) has the public seed PIN on every account. `set_pin` also clears a
login lock.

```bash
ffc exec -T backend python -m scripts.set_pin --report
ffc exec backend python -m scripts.set_pin --tech <id> --apply
```

**Check** `--report` lists no account on a seed PIN, and deep health's `accounts[]` shows
`"default_pin_active": false` for every active account. Seal each PIN on a slip for step E4.

### 6.14 Admit traffic (O-10 B6) — only when the drain phase says so

**Do** Step 5.9 (route to the backend). This is the drain's B6: before it come the ceilings
(8.1) and the pre-drain snapshot (8.2).

**Check** `curl -sS -D - -o /dev/null https://api.example.invalid/api/health | grep -iE '^(HTTP|x-fixflow-api)'`
shows `HTTP/2 200` and `x-fixflow-api: 1` (a GET: the route answers HEAD with 405).


---

## 7. Heartbeat and hourly dump

Both jobs run only on the CURRENT primary host. R9 (the move to the home box) removes both from the
old host (`rm /etc/cron.d/fixflow-heartbeat /etc/cron.d/fixflow-hourly-dump`) before the new host
installs them, so two hosts never ping, dump or prune. On a host that is not primary (the home box
before P13e) only the box-gate cron of section 2 is installed.

Timing: the heartbeat cron is installed once the stack is up AND `api.` is routed to the backend (5.9).
The heartbeat calls `https://api.<domain>/api/ops/health` through the tunnel, and while `api.` is on the
maintenance route that answers 503, so a cron installed earlier fails every minute and pages by
design. If you keep the plan's earlier order (cron live in P3c), create the check PAUSED at the service
and un-pause it right after 5.9. The hourly-dump cron is installed in phase P3c, only after the restore
is signed off (never before).

### 7.1 Create the dead-man checks (off the box)

**Do** At the off-box monitoring service create two checks (the service itself must not run on this host or
in the same Cloudflare account):

1. `fixflow-heartbeat`: expected every 1 minute, grace 5 minutes.
2. `fixflow-hourly-dump`: expected every 1 hour, grace 90 minutes.

Alert each to the owner's email (and a second contact). Copy the two ping URLs into the password manager.
They go into `heartbeat.env` as `FIXFLOW_HEARTBEAT_PING_URL` and `FIXFLOW_HOURLY_DUMP_PING_URL` (3.7).
Optional: a failure URL for an immediate alert as `FIXFLOW_HEARTBEAT_FAIL_URL`.

**Check** Both checks exist, show `new` or `waiting`, and have an alert contact. If the service offers a
test alert, send one and confirm the email arrives. VERIFY: the service's wording for grace and pause.

### 7.2 Run the heartbeat by hand before `api.` is open (container-address test)

Needs the backend up (restore signed off, 3.x done) and works while `api.` answers 503.

**Do**

```bash
install -d -m 0700 /root/hbtest
ln -sf /etc/fixflow/backend.env /root/hbtest/backend.env
BIP="$(docker inspect -f '{{(index .NetworkSettings.Networks "fixflow_app").IPAddress}}' "$(ffc $P_RUN ps -q backend)")"
printf 'FIXFLOW_HEARTBEAT_HEALTH_URL=http://%s:8000/api/ops/health\n' "$BIP" > /root/hbtest/heartbeat.env
grep '^FIXFLOW_HEARTBEAT_PING_URL=' /etc/fixflow/heartbeat.env >> /root/hbtest/heartbeat.env
chmod 600 /root/hbtest/heartbeat.env
FIXFLOW_ETC=/root/hbtest /opt/fixflow/ops/selfhost/bin/fixflow-heartbeat.sh; echo exit=$?
```

VERIFY: the network name `fixflow_app` (project `fixflow` plus network `app`; `docker network ls`).

**Check** Expected `exit=0` and nothing printed; the dead-man dashboard shows a ping within a minute.
Now the failure case: stop the database (no phone is admitted yet, so this is safe; never do it after
the fleet is on):

```bash
ffc $P_DB stop postgres
sleep 5
FIXFLOW_ETC=/root/hbtest /opt/fixflow/ops/selfhost/bin/fixflow-heartbeat.sh; echo exit=$?
ffc $P_DB up -d postgres
```

Expected: one `heartbeat: UNHEALTHY http=200 body=...` line and `exit=1` (the route answers 200 with the
database component not ok, so the status code alone proves nothing); no new ping at the dashboard. Wait
for postgres to be healthy (`ffc $P_DB ps` shows `healthy`), run the heartbeat again: `exit=0`. Clean up:

```bash
rm -rf /root/hbtest
```

### 7.3 Run the heartbeat through the tunnel (after 5.9)

**Do** With `api.` on the backend route:

```bash
/opt/fixflow/ops/selfhost/bin/fixflow-heartbeat.sh; echo exit=$?
```

**Check** Expected `exit=0`, nothing printed, and a ping at the dashboard. `exit=2` means a URL or the token
is empty in the env files; `exit=3` means healthy but the ping failed (a typo in the ping URL or no
egress); `exit=1` prints the UNHEALTHY line: read the `http=` code (`503` means `api.` is still on
maintenance, 5.8; `000` means no route).

### 7.4 Install the heartbeat cron

**Do**

```bash
install -m 0644 -o root -g root /opt/fixflow/ops/selfhost/cron/fixflow-heartbeat /etc/cron.d/fixflow-heartbeat
```

**Check**

```bash
ls -l /etc/cron.d/fixflow-heartbeat
sleep 130; test ! -s /var/log/fixflow/heartbeat.log && echo "log empty"
```

Expected: `-rw-r--r-- 1 root root`; `log empty` (the script prints nothing when healthy); the dashboard shows a
ping every minute.

### 7.5 Test paging once

**Do** After 5.9 and before any phone is admitted, stop the backend and wait for the grace time plus a
minute:

```bash
ffc $P_RUN stop backend
```

**Check** The monitoring service emails the owner. Then `ffc $P_RUN up -d backend`, wait for `healthy`
(`ffc $P_RUN ps backend`, up to 90 s), and the check returns to up with a recovery notice. Record the
time of the alert in the W0-results row. No alert = STOP: the dead-man setup is not working.

### 7.6 The hourly dump by hand

Needs the backend up, valid `FIXFLOW_R2_*` values, and the restore signed off.

**Do**

```bash
/opt/fixflow/ops/selfhost/bin/fixflow-backup.sh hourly; echo exit=$?
```

**Check** Expected one JSON line with `"key": "backups/db-hourly/..."`, a non-zero `size_bytes`, a 64-hex
`sha256`, `"pruned": []`, then `exit=0`; the hourly-dump check at the dead-man service shows a ping (if
`FIXFLOW_HOURLY_DUMP_PING_URL` is set). A key that does not start with `backups/db-hourly/` is a STOP.
`exit=4` means another dump holds the lock; wait and retry. The post-drain and nightly dumps are
separate (not part of this section).

### 7.7 Install the hourly-dump cron (phase P3c, after restore sign-off)

**Do**

```bash
install -m 0644 -o root -g root /opt/fixflow/ops/selfhost/cron/fixflow-hourly-dump /etc/cron.d/fixflow-hourly-dump
```

**Check** After the next `:17` of the hour:

```bash
ls -l /etc/cron.d/fixflow-hourly-dump
tail -n 2 /var/log/fixflow/hourly-dump.log
```

Expected: `-rw-r--r-- 1 root root`; a JSON line whose key starts `backups/db-hourly/` with a timestamp from
that hour; the dead-man check shows a ping; no `Traceback`.

### 7.8 One primary only

**Do** Before and after any host move list the crons on BOTH hosts.

**Check**

```bash
ls /etc/cron.d/ | grep fixflow
```

Expected: the current primary lists `fixflow-heartbeat` and `fixflow-hourly-dump`; the old host (and a
home box before P13e) lists neither (the home box lists `fixflow-boxgate`).

---

## 8. The drain window (O-10 B4, B5, E and F)

`T_open` is the moment the ceilings are widened (8.1); `T_close` the moment they are put back
(8.8). Write both, in UTC, into W0-results. Every command below runs on the primary host.

### 8.1 Widen the ceilings, record `T_open` (O-10 B4)

**Do** Edit `/etc/fixflow/backend.env` (remove the leading `#`):

```bash
FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS=<W>   # W = hours from the oldest queued device_time to now, plus 72; start at 2640 until a manifest gives the maximum
FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS=<W>                 # only in cases a and b (the jobs exist); case c keeps the default 48
# FIXFLOW_ATTENDANCE_PING_BACKDATE_CEILING_HOURS            # stays at the code default unless the owner signs a raise for a manifest that shows older unsent pings
```

Settings are read at import, and `restart` does not re-read env files, so recreate:

```bash
ffc $P_RUN up -d --force-recreate backend
date -u +%FT%TZ   # this is T_open
```

**Check** deep health `facts`: `attendance_device_time_backdate_ceiling_hours` = W,
`jobs_gps_backdate_ceiling_hours` = W (or 48 in case c), `attendance_ping_backdate_ceiling_hours`
unchanged. Never touch the 120 s future tolerances.

### 8.2 Pre-drain snapshot, for forensics only (O-10 B5; `O10-F9`)

Taken before the route opens. It is **never restored after any phone has drained**.

**Do**

```bash
S=$(date -u +%Y%m%dT%H%M%SZ)
ffc exec -T postgres pg_dump -U fixflow_app -d fixflow --format=custom > /var/lib/fixflow/drain/predrain-$S.pgdump
ffc exec -T postgres sh -c 'cat > /tmp/s.dump && pg_restore -l /tmp/s.dump | grep -c "TABLE DATA"; rm -f /tmp/s.dump' < /var/lib/fixflow/drain/predrain-$S.pgdump
sha256sum /var/lib/fixflow/drain/predrain-$S.pgdump
/opt/fixflow/ops/selfhost/bin/fixflow-r2-put.sh /var/lib/fixflow/drain/predrain-$S.pgdump archive/pre-drain/predrain-$S.pgdump
```

Then the fuel snapshot (P2b-2's `drain_audit.py`; VERIFY: its exact arguments in P2b-2's
merged `backend/scripts/drain_audit.py --help`):

```bash
ffc exec -T backend python -m scripts.drain_audit --snapshot-fuel > /var/lib/fixflow/drain/fuel-$S.json
/opt/fixflow/ops/selfhost/bin/fixflow-r2-put.sh /var/lib/fixflow/drain/fuel-$S.json archive/pre-drain/fuel-$S.json
```

**Check** the `pg_restore -l` count is above 40 (one `TABLE DATA` line per table); the upload
lines print `uploaded key=archive/pre-drain/...` with the same sha256 as `sha256sum`; record both
keys and hashes in W0-results.

### 8.3 Open the route (O-10 B6)

Section 6.14. Record the time.

### 8.4 After every P4a / P4b / P4r row: the post-drain dump

**Do**

```bash
/opt/fixflow/ops/selfhost/bin/fixflow-backup.sh post-drain
```

**Check** one JSON line: `key` starts `archive/post-drain/fixflow-db-`, `pruned` is `[]`. Write the
key and the sha256 into the phone's row. (Nothing under `archive/` is ever pruned: `backup.py`
refuses, whatever is passed.)

### 8.5 Manifest export (O-10 D4/E5), per phone

The phone uploads its manifest as an `app_event` named `drain_manifest` as its first
authenticated call. Export it off the host right after the phone's E5:

**Do**

```bash
T=<tech id signed in on that phone>; VC=<versionCode>
ffc exec -T postgres psql -U fixflow_app -d fixflow -tA -v ON_ERROR_STOP=1 -v tech="$T" <<'SQL' > /var/lib/fixflow/drain/manifest-$T-$VC.json
SELECT coalesce(json_agg(json_build_object('id', id, 'client_id', client_id, 'actor_id', actor_id, 'device_id', device_id, 'device_time', device_time, 'server_time', server_time, 'props', props) ORDER BY server_time), '[]'::json)
FROM app_event WHERE name = 'drain_manifest' AND actor_id = :'tech';
SQL
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(len(d), 'manifest event(s)')" /var/lib/fixflow/drain/manifest-$T-$VC.json
/opt/fixflow/ops/selfhost/bin/fixflow-r2-put.sh /var/lib/fixflow/drain/manifest-$T-$VC.json archive/manifests/$T-$VC.json
```

On a shared phone each technician signs in in turn (O10-F10): export once per technician.

**Check** at least `1 manifest event(s)`; the upload line prints
`uploaded key=archive/manifests/<tech>-<vc>.json`; record the key in the phone's row. `0`: the
manifest did not land: no drain on this phone (O-10 R6).

### 8.6 Window audit queries (O-10 F), run at `T_close` before the ceilings go back

**Do** (`T_OPEN` and `T_CLOSE` as recorded, ISO-8601 UTC). psql variables are interpolated in
a script read from stdin, not in a `-c` string, so each query is a heredoc:

```bash
A() { ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -v t_open=<T_OPEN> -v t_close=<T_CLOSE> "$@"; }
# 1. late-sync audit: rows that landed in the window more than 24 h after their device time
A -tA <<'SQL' > /var/lib/fixflow/drain/late-sync.csv
COPY (
  SELECT 'punch' AS src, id, tech_id, kind, device_time, server_time, drift_seconds FROM attendance_event
   WHERE server_time BETWEEN :'t_open' AND :'t_close' AND server_time - device_time > interval '24 hours'
  UNION ALL
  SELECT 'presence', id, tech_id, NULL, device_time, server_time, NULL FROM attendance_presence_event
   WHERE server_time BETWEEN :'t_open' AND :'t_close' AND server_time - device_time > interval '24 hours'
  ORDER BY 3, 5
) TO STDOUT WITH CSV HEADER;
SQL
# 2. per-technician min/max device_time of what landed in the window
A <<'SQL'
SELECT tech_id, count(*), min(device_time), max(device_time) FROM attendance_event
 WHERE server_time BETWEEN :'t_open' AND :'t_close' GROUP BY tech_id ORDER BY tech_id;
SQL
# 3. payroll exports whose window overlaps a back-filled day (cut before the late rows landed)
A <<'SQL'
SELECT from_date, to_date, row_count, storage_path, created_at FROM payroll_export
 WHERE to_date >= (SELECT min(device_time)::date FROM attendance_event
                    WHERE server_time BETWEEN :'t_open' AND :'t_close')
 ORDER BY from_date;
SQL
```

Upload the CSV: `fixflow-r2-put.sh /var/lib/fixflow/drain/late-sync.csv archive/drain-audit/late-sync-<T_CLOSE stamp>.csv`.

**Check** each query exits 0; the CSV's row count and the two tables go into W0-results. A payroll
export listed in query 3 is stale for the back-filled days: the owner decides its re-issue (it is
not regenerated automatically: `payroll_export` is idempotent on its window).

### 8.7 Put the ceilings back, record `T_close` (O-10 F)

**Do** Comment out or delete the ceiling lines added in 8.1 (the code defaults then apply: 24 h
punches, 48 h job GPS, 240 h pings), then:

```bash
ffc $P_RUN up -d --force-recreate backend
date -u +%FT%TZ   # this is T_close
```

**Check** deep health `facts`: `24`, `48`, `240`.

### 8.8 Re-seed the dispatch cursor (at `T_close` and after every P4r)

Rows that arrived during the window are old news; the cursor moves to the current head so that,
if the dispatcher is ever enabled, it never messages a customer about them (standing rule 4;
`O10-F7`). It only ever moves forward.

**Do**

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO dispatch_cursor (consumer, last_seq, updated_at)
SELECT 'whatsapp', COALESCE(MAX(seq), 0), now() FROM job_event
ON CONFLICT (consumer) DO UPDATE
   SET last_seq = GREATEST(dispatch_cursor.last_seq, EXCLUDED.last_seq), updated_at = now();
SQL
```

**Check** `ffc exec -T postgres psql -U fixflow_app -d fixflow -tAc "select (select last_seq from dispatch_cursor where consumer = 'whatsapp') = (select coalesce(max(seq), 0) from job_event)"`
prints `t`. The dispatcher stays OFF: `grep -n 'FIXFLOW_ENABLE_DISPATCHER' /opt/fixflow/docker-compose.prod.yml`
shows `"false"`; enabling it is a separate owner-approved change after the last re-open.

### 8.9 Late phones

A phone that shows up after `T_close` gets a scheduled, supervised re-open: 8.1 again (the
ceilings are global), its E-steps, 8.4-8.6 for that phone, 8.7, 8.8.

## 9. Backups

### 9.1 A manual backup (the nightly job's own call)

**Do**

```bash
/opt/fixflow/ops/selfhost/bin/fixflow-backup.sh manual
```

This is the same as `ffc exec backend python -c "import asyncio;from app.core.backup import
run_db_backup;asyncio.run(run_db_backup())"`, with the receipt printed. It writes under
`backups/db-selfhost/` (the compose fixes the prefix) and prunes only that folder, 30 days.

**Check** one JSON line whose `key` starts `backups/db-selfhost/fixflow-db-`; the old Railway-era
`backups/db/` folder is never listed or pruned by this host.

### 9.2 Turn the nightly dump on (P3c step 7, after the owner signs the restore off)

**Do** In `/etc/fixflow/compose.env` set `FIXFLOW_BACKUP_ENABLED=true`, then
`ffc $P_RUN up -d backend` (the changed value recreates the container).

**Check** deep health: `facts.backup_enabled` `true`, and the `scheduler` component lists
`db-backup-nightly` with a next run at 02:30 Asia/Karachi.

### 9.3 Hourly dump and the drill

The hourly dump is a host cron (section 7), `backups/db-hourly/`, 72 h. The monthly restore drill
is R7.

---

## 10. Old-hostname stub

The technician app on the phones still calls the old Railway hostname, written `<old-host>` below.
Whatever answers there decides what a phone does with a queued record: any 2xx or 204 reads as
"landed" and the phone deletes its copy; a bare 4xx is parked as a final refusal; a 5xx counts
toward parking; **no answer at all** keeps the record and retries later. So the stub never answers
with a status of its own (standing rule 5; O-10 section C). It lives in `ops/hang-stub/` and runs on
the OLD Railway service, not on the host.

**Which mode applies** (K = the update APK can be installed; H = the old Railway service is ours):

| K | H | Mode | When |
| - | - | ---- | ---- |
| yes | yes | **hang** only | from the moment the old service is replaced, until removal (10.9) |
| no | yes | **proxy** | only from O-10 step B6 (the new host restored, verified and routed); between sessions it goes back to hang (10.8) |
| any | no | **no stub** | nothing to deploy; write "H=no, no stub" in W0-results and skip to section 11 |

The stub is removed only after every roster phone has a P4b, P4r or retired row (10.9). It is
never answered for by an "ok" page, a 404 page or a 503: if you cannot deploy it, STOP and tell the
session; do not improvise a replacement.

**Never leave `<old-host>` without a running stub while any roster phone lacks its row.** Railway's
edge answers for a missing deployment itself, with a markerless 404 (or a 5xx), and every phone
parks its queued records on it, fleet-wide. So until 10.9, none of these, not even to "stop the
damage":

- removing or detaching the service's public domain or route;
- deleting the service, or removing (`railway down`), pausing or scaling to zero its deployment;
- removing a working deployment because a newer one failed (Railway keeps serving the last Active
  deployment while a new one fails; leave it).

Every STOP in this section uses the same remedy, 10.10: keep the fleet offline, put the stub back
to hang, roll back to the last deployment that passed 10.6.

**10.1 Record the mode.**
**Do:** from the phone rows in W0-results read K and H for the fleet, pick the row of the table
above, and write "stub mode: hang | proxy | none, decided <date UTC>" in the phase's W0-results table.
**Check:** the written mode matches the table. K=yes with a proxy, or K=no with a hang, is a STOP.

**10.2 Run the stub's tests (development machine, Node >= 22).**
**Do:**

```bash
cd <repo>            # a clean clone of the commit that holds ops/hang-stub/
node --test ops/hang-stub/server.test.mjs
```

**Check:** exit 0 and `fail 0` in the summary. A failure is a STOP (do not deploy a stub the tests
do not pass).

**10.3 Link the Railway CLI to the OLD service (from `ops/hang-stub/`, never the repository root).**
**Do:**

```bash
cd <repo>/ops/hang-stub
pwd                      # must end in /ops/hang-stub
railway link             # choose the project, environment and service that own <old-host>
railway status           # shows the linked project, environment and service
```

**Check:** `pwd` ends in `ops/hang-stub`, and `railway status` names the service you know serves
`<old-host>`. From the repository root Railway detects the Vite app and builds the wrong thing
(CLAUDE.md "Build and deploy traps"); a wrong service name is a STOP.
VERIFY: `railway link` and `railway status` exist with these names and prompts (run `railway --help`
on the owner's machine).

**10.4 Set the mode (hang first, always).**
**Do:**

```bash
railway variables --set "STUB_MODE=hang"
```

Leave `STUB_HANG_MS` unset (default 45000; the stub never goes below 20000).
**Check:** `railway variables` lists `STUB_MODE` = `hang` and no `STUB_UPSTREAM`. (A proxy mode
without a valid `https://` upstream falls back to hang and prints a `WARNING`; hang is the safe
default either way.)
VERIFY: the flag is `--set` and the variable listing command is `railway variables` in the installed
CLI version.

**10.5 Empty the service's healthcheck, then deploy.**
**Do:** (a) Railway dashboard, that service, Settings, Deploy: **Healthcheck Path must be empty**.
The stub answers nothing, so a healthcheck would never pass and the deploy would never go live.
(b) Still in `ops/hang-stub/`:

```bash
grep -ci healthcheck railway.json     # expect 0 (the file sets none and one replica)
railway up --detach
```

**Check:** the dashboard shows the new deployment as Active (not Failed, not "Healthcheck failed"),
and the deployment log has the line `[hang-stub] mode=hang port=... hang_ms=45000` and no `WARNING`
line. Write the deployment's id in W0-results once 10.6 passes: it is the rollback target of 10.10.
If the deployment Failed, do not delete it, the service or the earlier deployment; the earlier one
is still the one serving. Fix the cause, deploy again, and run 10.6 against whatever is Active.
VERIFY: `railway up --detach` flag, and `railway logs` to read the deployment log from the CLI.

**10.6 Check hang mode: no status at all.**
**Do:** from any machine that is not the host:

```bash
curl -sS -m 30 -o /dev/null -w '%{http_code}' https://<old-host>/api/health; echo " exit=$?"
curl -sS -m 30 -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' \
  -d '{}' https://<old-host>/api/events; echo " exit=$?"
```

**Check:** both print `000 exit=28` (curl gave up at 30 s) or `000 exit=52` (empty reply after the
stub closed). ANY three-digit status (200, 204, 404, 502, 503) is a STOP: a phone could read it as
landed or as a refusal. Go to 10.10 at once. Never remove the public route or the deployment
instead: that turns every answer into Railway's own 404 (the intro of this section). The
deployment log shows `hang reason=hang-mode method=GET path="/api/health"` for the first request.
The 30 s `curl` is also the one test that Railway's edge holds a silent connection longer than the
app's 15 s abort. If the edge answers by itself before 30 s (a 502 or 504 with no stub log line
for it), hang mode cannot protect anything on this platform. That is a STOP for the session, not
for a fix here: 10.10, then the fleet stays offline until the session decides.

**10.7 Proxy mode (K=no and H=yes only, from O-10 step B6 on).**
**Do:** only after the new host is restored, verified, and `api.example.invalid` routes to the
backend (O-10 B6), and for a re-open (P4r) only after the session has cut the network of every other
roster phone that has no row (the proxy gives every phone the same egress address; see the note
below):

```bash
cd <repo>/ops/hang-stub
railway variables --set "STUB_MODE=proxy" --set "STUB_UPSTREAM=https://api.example.invalid"
railway up --detach
```

**Check:**

```bash
# the backend's own answer passes through with its marker
curl -sS -m 20 -D - -o /dev/null https://<old-host>/api/health | grep -i -E '^HTTP|x-fixflow-api'
# a request the BACKEND refuses (no ops token) passes through with the backend's own status and marker
curl -sS -m 20 -D - -o /dev/null https://<old-host>/api/ops/health | grep -i -E '^HTTP|x-fixflow-api'
```

The first shows a `200` status line and `x-fixflow-api: 1`. The second shows `401` and
`x-fixflow-api: 1` (the same status and marker `https://api.example.invalid/api/ops/health` gives).
A status without the marker line is a STOP: 10.10 (hang, roll back, fleet offline), then investigate.
Proxy mode passes the app's own answers, a marked `401` included. A field build without the v2
outbox drops queued job writes on that 401 (`O10-F15`; `ops/hang-stub/README.md` "When the stub is
not a guarantee"): go to proxy only once the owner's `O10-F15` decision is recorded.
The stub's tests prove that a markerless 429, 403 or 404, any 5xx, a timeout and an oversized body
all hang instead of answering; do not try to provoke them in production.
Note: every phone reaches the backend from Railway's egress address, so the backend's per-IP login
limiter (20 attempts a minute) sees the whole fleet as one client. Sign technicians in one at a time.
VERIFY: the CLI accepts two `--set` flags in one call (otherwise run it twice).

**10.8 Return to hang (end of every proxy session, and at T_close while any phone lacks a row).**
**Do:**

```bash
cd <repo>/ops/hang-stub
railway variables --set "STUB_MODE=hang"
railway variables                      # confirm; STUB_UPSTREAM may stay set, it is ignored in hang mode
```

Make sure the deployment actually restarted with the new value (dashboard: a new deployment after
the variable change; if not, `railway up --detach` again). Every restart ends the requests the stub
was holding, and the edge may answer those with a 5xx (one strike of five in an old build): change
the mode or redeploy only while the fleet is idle (outside working hours, or phones offline).
**Check:** repeat the two commands of 10.6; both give `000` with `exit=28` or `exit=52`. Anything
else: 10.10.
VERIFY: whether `railway variables --set` triggers a redeploy by itself in the installed CLI.

**10.9 Remove the stub (only when no roster phone needs the old hostname).**
**Do:** open W0-results and read the roster: every roster phone has a **P4b row, a P4r row or a
retired row**. If even one phone lacks one, STOP: leave the stub in hang mode (10.8). When all have
one, remove the Railway service's deployment (dashboard: that service, Settings, delete the
service; or `railway down` for the active deployment) and write a dated "old-hostname stub removed"
row in W0-results naming the three row types you checked.
**Check:** `curl -sS -m 20 -o /dev/null -w '%{http_code}' https://<old-host>/api/health` now
returns Railway's own edge page (a 404 is expected). That 4xx is harmless only because no roster
phone calls this hostname any more; it is exactly why the removal waits for the last row.
VERIFY: `railway down` removes the active deployment only (the service stays); deleting the service
is the dashboard step.

**10.10 STOP remedy: hang, roll back, fleet offline (any STOP in this section).**
**Do,** in this order:

1. Tell the session at once. Every roster phone without its row stays (or goes) offline, with
   network cut as in the drain procedure, until step 4 passes. An offline phone keeps its records;
   only an answer from `<old-host>` can cost them.
2. `cd <repo>/ops/hang-stub && railway variables --set "STUB_MODE=hang"`.
3. Roll back: dashboard, that service, Deployments, the deployment id written at 10.5 (the last one
   that passed 10.6), Redeploy/Rollback. If no deployment has passed 10.6 yet (the first deploy),
   deploy again in hang mode from the tested commit (`railway up --detach`, 10.5). Do not remove the
   failing deployment by hand, and do not touch the domain: the rollback replaces it.
4. Run the two commands of 10.6.

**Check:** step 4 gives `000` with `exit=28` or `exit=52` for both, and the deployment log has a
`hang reason=hang-mode` line for each. Only then may the session bring phones back online. If
step 4 still shows a status, the fleet stays offline and the session decides; the domain and the
service stay as they are.
VERIFY: the name of Railway's rollback action for a past deployment in the installed dashboard.

---

## 11. `release/drain` and the drain-image tag

Until `T_close` the host runs the git tag `drain-image` (or its re-cuts `drain-image-2`, `-3`) and
nothing else (standing rule 3). It is cut from the branch `release/drain`, which is a branch at
commit `a31924a` (the `main` of before the program's first merge) plus exactly four commits applied
by `git cherry-pick`, in this order: P1 (`87bbe88`), the tech-metrics timezone fix (`3810e42`),
P2b-2 (`<p2b2>`), P3a (`90ea88d`). The fix is there because without it four jobs tests fail whenever
the gates run between 19:00 and 24:00 UTC, on any tree cut from `a31924a` (ruling C30, plan 7.9,
`plan-v9.27`). Pick the ORIGINAL `3810e42` (applies cleanly on P1), never its `main` squash `f192fee`
(PR #204), which was made on top of P7a. The original is on no `main` commit; fetch it by the annotated
tag **`drain-pick-tz-fix`** on `origin`, which points at
`3810e4209ea4bf8fde7ce500cea0458d3e7ff701` (ruling C32). The tag is never moved or deleted: it is
what keeps the commit reachable from a clean clone (the plan branch it was made on may go away). The
full sha is the check, wherever the tag is used.
**Never `git merge`**: the repository squash-merges, and a merge would pull in whatever else reached
`main`. Cutting the tag is the last Scope item of P2b-2, the last of them to merge (P1, P3a and the
fix's `main` squash are merged). The P3a-2
PR, if there is one, is NOT part of it. Run this section on the development machine, in a clean
clone, not on the host.

**11.1 Preconditions.**
**Do:**

```bash
git fetch origin --tags
git cat-file -t a31924a                      # commit
for c in 87bbe88 <p2b2> 90ea88d; do
  git branch -r --contains "$c" | grep -q 'origin/main' && echo "$c on main" || echo "$c NOT on main"
  echo "parents: $(git cat-file -p "$c" | grep -c '^parent')"
done
git cat-file -t drain-pick-tz-fix           # tag (annotated)
git rev-parse 'drain-pick-tz-fix^{commit}'   # the fix's full sha
git log -1 --format='parents=%p %s' drain-pick-tz-fix
git merge-base --is-ancestor drain-pick-tz-fix origin/main; echo "is-ancestor exit=$?"
git status --porcelain                       # expect no output
gh --version | head -n 1                     # 11.8 reads CI with gh
gh auth status --hostname github.com 2>&1 | grep 'Logged in'
```

**Check:** `commit`; each of the three phase commits prints `on main` and `parents: 1` (a squash
commit, not a merge commit); for the fix: `tag`, then exactly
`3810e4209ea4bf8fde7ce500cea0458d3e7ff701`, then ONE parent and the subject
`fix(jobs): resolve the tech-metrics window in the shop timezone, not UTC`, then `is-ancestor exit=1`
(the fix is not on `main`: there it is the squash `f192fee`, a different commit); no uncommitted
changes. The last line prints the exit code rather than a word, because the other two codes are STOPs
that must not read like a pass:

- `is-ancestor exit=0`: the tagged commit IS an ancestor of `main`, so the tag names the wrong commit
  or history was rewritten. STOP.
- `is-ancestor exit=128`: the tag or `origin/main` is missing in this clone (the three fix lines above
  it print `fatal:` too). STOP; run `git fetch origin --tags` and repeat 11.1. If the tag is still
  missing, take it to the coordinator.

A missing tag or any other sha is a STOP: never re-point or re-create the tag, take it to the
coordinator.

The last two lines print `gh version 2.<n>.<n> (<date>)` and one line
`✓ Logged in to github.com account <the owner's login> (...)`. `gh: command not found`, or no
`Logged in` line, is a STOP before anything is cut: 11.8 cannot read CI without it. Installing `gh` and
`gh auth login` are the owner's own steps.

**11.2 Cut the branch.**
**Do:** `git switch -c release/drain a31924a`
**Check:** `git rev-parse --short HEAD` prints `a31924a`.

**11.3 Cherry-pick P1.**
**Do:** `git cherry-pick -x 87bbe88`
**Check:** exit 0, a new commit, no conflict message. On a conflict run `git cherry-pick --abort`,
STOP, and record the conflicting files in W0-results: a resolved conflict is a different commit from the
reviewed one and needs the reviewer's read.

**11.3a Cherry-pick the tech-metrics timezone fix (ruling C30).**
**Do:** `git cherry-pick -x drain-pick-tz-fix` (the tag from 11.1; it names the commit
`3810e4209ea4bf8fde7ce500cea0458d3e7ff701`)
**Check:** as 11.3; `git log -1 --format=%B HEAD | grep 'cherry picked from'` prints
`(cherry picked from commit 3810e4209ea4bf8fde7ce500cea0458d3e7ff701)`; and `git show --stat HEAD` lists
the same four files as `git show --stat 'drain-pick-tz-fix^{commit}'` (`backend/app/features/jobs/`
router, service and two tests; `^{commit}` shows the commit alone, where the bare tag name would print
the tag's message first). Never `f192fee`: that squash was made on top of P7a and is not reviewed
against this tree. It also applies cleanly here, with the same four files, so only the sha tells them
apart (11.6).

**11.4 Cherry-pick P2b-2.**
**Do:** `git cherry-pick -x <p2b2>`
**Check:** as 11.3.

**11.5 Cherry-pick P3a.**
**Do:** `git cherry-pick -x 90ea88d`
**Check:** as 11.3. If P3a-2 exists, do NOT include it. See the note after 11.14.

**11.6 The log shows exactly those commits.**
**Do:**

```bash
git log --oneline a31924a..release/drain
git log --reverse a31924a..release/drain --format=%B | grep 'cherry picked from'
```

**Check:** the first command shows exactly four lines, newest first: P3a, P2b-2, the fix
(`fix(jobs): resolve the tech-metrics window in the shop timezone, not UTC`), P1. The second checks the
SOURCES, not the subjects: `-x` wrote each picked commit's full sha into its message, and `--reverse`
lists them in pick order. It must print exactly these four lines, in this order (`<p2b2-full-sha>` is
`git rev-parse <p2b2>`):

```text
(cherry picked from commit 87bbe88abf3c1b1222edda696ef032678a4dc34e)
(cherry picked from commit 3810e4209ea4bf8fde7ce500cea0458d3e7ff701)
(cherry picked from commit <p2b2-full-sha>)
(cherry picked from commit 90ea88d67a4b3939c318c82a813039037291aa51)
```

A line naming `f192fee97d3e223abc59c1323971ea1be198e25f` means `main`'s squash was picked instead of
the fix: the files and the patch look the same, only the source differs. STOP, and reset the branch to
the P1 pick (the commit 11.3 made). Find it by its trailer, print it, and reset only when the search
found exactly one commit:

```bash
git branch --show-current                    # release/drain
P1_PICK=$(git log --format=%H --grep='cherry picked from commit 87bbe88abf3c1b1222edda696ef032678a4dc34e' a31924a..release/drain)
printf '%s\n' "$P1_PICK"; echo "count=$(printf '%s\n' "$P1_PICK" | grep -c .)"
if [ "$(git branch --show-current)" != release/drain ]; then echo "STOP: not on release/drain"; elif [ "$(printf '%s\n' "$P1_PICK" | grep -c .)" != 1 ]; then echo "STOP: not exactly one P1 pick"; else git reset --hard "$P1_PICK"; fi
git log --oneline a31924a..HEAD
git log -1 --format=%B HEAD | grep 'cherry picked from'
```

**Check:** `release/drain`; one full sha and `count=1`; `HEAD is now at <that sha> <P1's subject>`; one
log line (P1); and `(cherry picked from commit 87bbe88abf3c1b1222edda696ef032678a4dc34e)`. A count of 0,
or of 2 or more, prints `STOP: not exactly one P1 pick` and resets nothing: delete the branch and cut
again from 11.2, as below. `STOP: not on release/drain` means another branch is checked out (the first
line names it), and nothing was reset: run `git switch release/drain` and paste the block again. After a good reset, pick the tag as in 11.3a, redo 11.4 and 11.5, and run this step again.

Any other difference (a missing, extra or reordered line, another sha) is a STOP too: delete the branch
(`git switch main; git branch -D release/drain`) and cut again from 11.2. Both recoveries rewrite only
the local branch, and that is safe because nothing has been pushed yet: the branch first goes to
`origin` in 11.8, after this step and 11.7. (In a re-cut, 11.13, the branch is already on `origin`;
that step says how to recover there.)

**11.7 The diff touches no file outside those PRs.**
**Do:**

```bash
git diff a31924a..release/drain --stat | tail -n 1
diff <(git diff --name-only a31924a release/drain | sort) \
     <(for c in 87bbe88 3810e42 <p2b2> 90ea88d; do git show --name-only --format= "$c"; done | sort -u)
```

**Check:** the `diff` prints nothing (the set of files changed on the branch equals the union of the
four commits' files). Record the `--stat` summary line in W0-results.

**11.8 Push the branch alone; CI and the local gates green on that exact commit, before tagging.**
The rule (ruling C34): **a `drain-image*` tag is created only on a commit whose local gates and whose
CI run on the pushed branch are both green.** So the branch goes to `origin` first, without a tag.
Nothing deploys from a branch: the host runs only a tag (11.14). CI runs on every push to
`release/drain` and `release/drain-web`: the trigger is in P3a's `.github/workflows/ci.yml`, which the
cherry-pick carries.
**Do (push, then read CI for that sha):**

```bash
git push origin release/drain                # the branch only; no tag yet
SHA=$(git rev-parse release/drain); echo "$SHA"
gh run list --workflow ci.yml --branch release/drain --commit "${SHA:?not set - run the SHA= line of 11.8}" --event push \
  --json databaseId,status,conclusion --jq '.[] | "\(.databaseId) \(.status) \(.conclusion)"'
gh run view <run-id> --json headSha,status,conclusion,jobs \
  --jq '"run \(.status) \(.conclusion) \(.headSha)", (.jobs[] | "\(.name): \(.status) \(.conclusion)")'
```

Every use of `SHA` in this section is written `"${SHA:?...}"`: if `SHA` is unset or empty, bash prints
`bash: SHA: not set - run the SHA= line of 11.8` and runs nothing else on that line (an empty
`--commit ""` would otherwise list up to 20 runs of any commit). A line that starts `: "${SHA:?...}";`
carries the guard for a later word that cannot (`${SHA:0:7}`).

**Check (CI):** `gh run list` prints exactly one line, `<run-id> completed success`; `gh run view` with
that id prints, with the three job lines in any order:

```text
run completed success <the full sha printed by echo>
Lint · Format · Test · Build: completed success
Mobile · TypeScript · Jest: completed success
Backend · Ruff · Mypy · Pytest: completed success
```

While the run is in progress, `gh run list` prints `<run-id> in_progress` (or `queued`) with no
conclusion, and `gh run view` shows each job as `completed success`, `in_progress` or `queued`. That is
not a result: do not tag. Wait (`gh run watch <run-id> --exit-status` blocks until the run ends) and
read `gh run view` again. If `gh run list` still prints nothing a few minutes after the push, do not
tag. Check that the push landed (`git ls-remote origin refs/heads/release/drain` shows `$SHA`), then
open the repository's Actions page on GitHub (a run may be queued there, or Actions may be off for the
repository). If the push landed and Actions shows no run for that sha, the branch's `ci.yml` lacks the
trigger: the P3a cherry-pick is missing or wrong. Each of these is a STOP; take it to the coordinator.
A job ending
`failure` or `cancelled`, a `headSha` other than `$SHA`, or more than one run line is a STOP: do not
tag; take the run's URL to the coordinator. The pushed branch stays where it is; it deploys nothing.

**Do (local gates, on the same sha):**

```bash
git worktree add --detach "../ff-rdrain-${SHA:0:7}" "${SHA:?not set - run the SHA= line of 11.8}"   # detached: release/drain is checked out here
# Docker Desktop running (`docker info` answers). Run in the background; it can exceed 10 minutes.
: "${SHA:?not set - run the SHA= line of 11.8}"; bash <plan checkout>/docs/program/lab/ff-gates.sh backend rdrain "../ff-rdrain-${SHA:0:7}"
```

The worktree's path carries the short sha, so a re-cut (11.13) gets a new one. When the summary has been
read and recorded, remove it (the logs live outside it, under the gate-log directory):

```bash
: "${SHA:?not set - run the SHA= line of 11.8}"; git worktree remove "../ff-rdrain-${SHA:0:7}"
```

**Check (gates):** its second line of output is `HEAD <short $SHA> tree=clean ...` (the first is
`LOGDIR`); exit 0, and `<log dir>/summary.txt` (printed at the end of the run) says all gates green
with the worktree clean (`tree=dirty` or `RUN partial` is not a merge-readiness run), zero skipped
tests, zero skipped integration tests. Paste the summary path and the CI run id into W0-results. The
remove prints nothing; a refusal ("contains modified or untracked files") means the run changed the
tree, which is not a clean run: STOP. Any red gate is a STOP: do not tag. Go on to 11.9 only when both
checks of this step are green for `$SHA`.
VERIFY: `ff-gates.sh` lives at `docs/program/lab/ff-gates.sh` on the checkout that holds the plan, its
argument order is `backend <lane> <worktree>`, and the lanes `rdrain` and `rdrain-web` are accepted
([a-z0-9-]).

**11.9 Tag.**
**Do:**

```bash
git tag -a drain-image -m "drain image: P1 87bbe88, fix 3810e42 (C30), P2b-2 <p2b2>, P3a 90ea88d cherry-picked onto a31924a; CI run <run-id>; gates <summary path>; <date UTC>" "${SHA:?not set - run the SHA= line of 11.8}"
git cat-file -t drain-image
git tag -n1 drain-image
[ "$(git rev-parse 'drain-image^{commit}')" = "${SHA:?not set - run the SHA= line of 11.8}" ] && [ "$SHA" = "$(git rev-parse origin/release/drain)" ] && echo "drain-image = SHA = origin/release/drain" || echo "STOP: the tag is not on the checked commit"
```

**Check:** `tag` (annotated); the message naming the four commits; and
`drain-image = SHA = origin/release/drain` (the tag is on the commit 11.8 pushed and checked).

**11.10 Push the tag.**
**Do:** `git push origin drain-image` (the tag only; the branch went in 11.8)
**Check:** `git ls-remote origin refs/heads/release/drain 'refs/tags/drain-image*'` lists the branch
and the tag, and the tag's peeled line (`drain-image^{}`) shows the same commit as the branch. A tag is
never moved and never force-pushed: a fix is a new tag (11.13).

**11.11 Record it.**
**Do:** paste `git log --oneline a31924a..release/drain` into W0-results with the tag, the date, the CI
run id and the gate summary path (a "drain image cut" row).
**Check:** the row shows exactly four commits and the tag's commit sha.

**11.12 `release/drain-web` (web-only commits P12a and P12).**
**Do:** once P12a and P12 are merged to `main`:

```bash
git switch -c release/drain-web release/drain
git cherry-pick -x <p12a> <p12>            # two commits, in that order, never git merge
```

**Check:** `git log --oneline release/drain..release/drain-web` shows exactly those two commits, and
`git diff --stat release/drain release/drain-web -- backend/` prints nothing (no backend change rides
the web branch).
Then the order of 11.8 to 11.10 (ruling C34), with the web branch's OWN sha. Never reuse 11.8's `SHA`:
that is `release/drain`'s commit, and with it the CI query, the gates and the tag below would all land
on the backend tree.
**Do (push, then read CI for that sha):**

```bash
git push origin release/drain-web            # the branch only; no tag yet
SHA=$(git rev-parse release/drain-web); echo "$SHA"
git rev-parse release/drain                  # the backend commit: a DIFFERENT sha
gh run list --workflow ci.yml --branch release/drain-web --commit "${SHA:?not set - run the SHA= line of 11.12}" --event push \
  --json databaseId,status,conclusion --jq '.[] | "\(.databaseId) \(.status) \(.conclusion)"'
gh run view <run-id> --json headSha,status,conclusion,jobs \
  --jq '"run \(.status) \(.conclusion) \(.headSha)", (.jobs[] | "\(.name): \(.status) \(.conclusion)")'
```

**Check (CI):** the first two shas differ; then as 11.8: one line `<run-id> completed success`,
`run completed success <the first sha>`, and the three jobs `completed success`, with 11.8's waits and
STOPs (`git ls-remote origin refs/heads/release/drain-web` for the push).
**Do (web gates, on the same sha, in their own worktree):**

```bash
git worktree add --detach "../ff-rdrain-web-${SHA:0:7}" "${SHA:?not set - run the SHA= line of 11.12}"
: "${SHA:?not set - run the SHA= line of 11.12}"; bash <plan checkout>/docs/program/lab/ff-gates.sh web rdrain-web "../ff-rdrain-web-${SHA:0:7}"
```

**Check (gates):** as 11.8: `HEAD <short sha> tree=clean`, exit 0, the summary all green. After
recording it: `: "${SHA:?not set - run the SHA= line of 11.12}"; git worktree remove "../ff-rdrain-web-${SHA:0:7}"`.
**Do (tag; it refuses the backend commit and any change under `backend/`):**

```bash
if [ "$(git rev-parse release/drain)" = "${SHA:?not set - run the SHA= line of 11.12}" ]; then echo "STOP: SHA is release/drain's commit"; elif [ -n "$(git diff --stat release/drain "$SHA" -- backend/)" ]; then echo "STOP: SHA changes backend/"; else git tag -a drain-web-image -m "drain web image: P12a <p12a>, P12 <p12> cherry-picked onto drain-image; CI run <run-id>; gates <summary path>; <date UTC>" "$SHA" && echo "tagged $SHA"; fi
```

**Check:** `tagged <the first sha>`. Either STOP line means no tag was made: take it to the coordinator.
Only after `tagged`, push the tag alone:

```bash
git push origin drain-web-image
git ls-remote origin refs/heads/release/drain-web 'refs/tags/drain-web-image*'
```

**Check:** the branch and the tag are listed, and the tag's peeled line (`drain-web-image^{}`) shows the
branch's commit. R5 then has something exact to check out (the tag name is the coordinator's ruling of
2026-11-13 on review #195; the plan names only the branch).

**11.13 Re-cut after a window fix.**
A drain-tool fix found during the window goes through `main` as a reviewed PR first; an APK-side fix
goes to `main` with a new versionCode and a P2c re-run and is NOT re-cut here.
**Do (first, the local branch must be the last pushed cut):**

```bash
git fetch origin
git switch release/drain
[ "$(git rev-parse release/drain)" = "$(git rev-parse origin/release/drain)" ] && echo "release/drain = origin/release/drain" || echo "STOP: local release/drain is not origin's"
```

**Check:** `release/drain = origin/release/drain`. The STOP line means this clone's branch is older (or
holds commits `origin` lacks): do not pick; re-cut from a fresh clone, where `git switch release/drain`
starts from `origin/release/drain`. Never push over the remote branch.
**Do (then the fix):**

```bash
git cherry-pick -x <fix-sha>               # the fix's squash commit on main
```

then repeat 11.6 (the log now shows the four commits plus the fix commit(s) and nothing else; the
trailer list is the four lines of 11.6 followed by one line naming each window fix's full sha) and 11.7
(compare against the four commits plus the fix). Here the branch is already on `origin`, so a failure
in either is recovered from the last pushed cut, not by 11.6's reset or delete:
`git reset --hard origin/release/drain`, then pick again. Never force-push the branch.
Then 11.8 on the updated branch, in its order: push the branch alone (`git push origin release/drain`, a
fast-forward), set `SHA` again with 11.8's line, read the CI run for the new `$SHA`, run the gates in
its own worktree and remove it. Only when both are green, tag the next free name on that sha and push
the tag alone:

```bash
git tag -a drain-image-2 -m "drain image re-cut: fix <fix-sha> on top of drain-image; CI run <run-id>; gates <summary path>; <date UTC>" "${SHA:?not set - run the SHA= line of 11.8}"
git push origin drain-image-2
```

(`drain-image-3` for the next one; never reuse or move a name.)
**Check:** `git log --oneline a31924a..release/drain` shows exactly the four commits of 11.6 and the
window fix commit(s); `git rev-parse 'drain-image-2^{commit}'` equals `$SHA` and `git rev-parse origin/release/drain`; the
`ls-remote` check of 11.10 lists the new tag. Add a W0-results row: the fix sha, the tag, the CI run id,
the gate summary. Deploy it with R5 (section 13). If `release/drain-web` exists, repeat the cherry-pick
there too and re-tag `drain-web-image-2`, in 11.12's order (branch, CI and gates, then the tag).

**11.14 Until `T_close`, the host runs only a `drain-image*` tag.**
**Do (on the host, any time before T_close, and before every R5):**

```bash
git -C /opt/fixflow describe --tags --exact-match HEAD
```

**Check:** prints `drain-image`, `drain-image-2` and so on (see R5.2 for the web conditional). A bare
sha, `main` or any other tag is a STOP: do not deploy; tell the session.

Notes. (a) The checkout on the host holds the scripts too (`ffc`, `fixflow-backup.sh`, the heartbeat,
the crons): until `T_close` they are exactly the tag's versions, so a script fix needs a re-cut. (b) If
the plan's P3a-2 (stub and heartbeat split out) is ever used, its files are not in `drain-image`; the
heartbeat script is a host script read from `/opt/fixflow/ops/selfhost/bin/`, so the host would lack it.
STOP and raise it before installing the heartbeat cron.

---

## 12. The deploy train

Behaviour-changing phases that merge to `main` before P4c are **not deployed** when they merge
(standing rule 3). Each one is a row in the deploy-train table in W0-results; P4c deploys `main` HEAD
once and runs the rows' post-deploy checks.

**12.1 Add the row when the phase merges.**
**Do:** append to the "Deploy-train table" in `docs/program/W0-results.md`: phase, PR, merge sha,
migration (a number, or `none`), post-deploy check (read-only; the exact command or page). The table
also carries a "Rehearsal (L4)" column; fill it when the rehearsal runs. The phase's Done-when ends
"merged; deploy-train row added".
**Check:**

```bash
grep -n -A12 'Deploy-train table' docs/program/W0-results.md
git branch -r --contains <merge-sha>        # lists origin/main
```

The row is there, and the merge sha is on `origin/main`.

**12.2 Nothing from `main` reaches the host before P4c.**
**Do:** on the host, before any R5 in the window: `git -C /opt/fixflow describe --tags --exact-match HEAD`
**Check:** `drain-image` or `drain-image-N` (or `drain-web-image*` for the web conditional in R5.2).
`main` or a bare sha before P4c is a STOP.

**12.3 Before `T_close` the web image comes from `release/drain-web`.**
**Do:** build and deploy it per R5 with the `drain-web-image*` tag as the target (R5.2). The web halves
of mixed PRs (P6a, P7b-2, P9b, P10a) do not ride it; they wait for the train.
**Check:** `git -C /opt/fixflow describe --tags --exact-match HEAD` prints `drain-web-image*`, and
`git diff --stat drain-image..drain-web-image -- backend/` (development machine) prints nothing.

**12.4 P4c: deploy `main` HEAD once.**
**Do:** only after `T_close` is recorded and the P4c steps before the train are done. Fetch and pin the
sha, then run R5 once with that sha as the target:

```bash
git -C /opt/fixflow fetch origin --tags
git -C /opt/fixflow rev-parse origin/main        # write this full sha into the P4c table
```

**Check:** R5 passes with `facts.git_sha` equal to that sha. `start.sh` applies every pending
migration in chain order on this one boot; read the applied head:

```bash
ffc exec -T postgres psql -U fixflow_app -d fixflow -Atc 'select version_num from alembic_version'
```

It equals the highest migration among the train's rows (and the head named in CLAUDE.md at that sha).
FK `VALIDATE` migrations that wait for an orphan audit ship as their own later migration, not here.

**12.5 Run each row's post-deploy check, in table order.**
**Do:** for each row top to bottom, run its check (all are read-only), and write the result into the
row: PASS or the output seen.
**Check:** every row PASS. A failing row **halts the train**: deploy nothing further. Rollback follows
R5.9 (never below the applied Alembic head; a migrated schema means a forward fix, not a rollback).
The rows after it continue as P4c-train sessions, each tagged `train-<n>` only on a failure.

**12.6 The last row rebuilds the web image from `main`.**
**Do:** `ffc $P_RUN build web` and `ffc $P_RUN up -d` (R5.5, R5.6 on the final checkout), then open the
attendance board in the manager app.
**Check:** `docker inspect --format '{{.Image}}' $(ffc ps -q web)` is recorded beside the sha, and the
board shows `sampler_state` (the P6a row's check).

**12.7 Retire the release branches, keep the tags.**
**Do:** after 12.6, stop deploying from `release/drain` and `release/drain-web`; record "retired
<date>" in W0-results. **Do not delete** the tags `drain-image*` and `drain-web-image*`: they are the
rollback targets and the evidence of what ran during the window.
**Check:** `git ls-remote origin 'refs/tags/drain-image*'` still lists them.

**12.8 After `T_close`, every phase ends "deployed per R5".**
**Do:** the owner at SSH runs R5 (about 15 minutes) for the phase's merge sha, then records in the
phase's W0-results row: `facts.git_sha` from deep health, the output of
`docker inspect --format '{{.Image}}' $(ffc ps -q backend)`, and the phase's post-deploy check result.
**Check:** the three facts are in the row, and `git_sha` equals the phase's merge sha (or the sha of
the `main` HEAD it was deployed with).

---

## 13. Runbook operations

Steps in this section are numbered `R<k>.<n>` (R5.3 is step 3 of R5). The "R" numbers are this
runbook's operations; the rollback rules of O-10 are always written "O-10 R2" and so on, and are
different things. Every step assumes the conventions in section 0 (`ffc`, `$P_DB`, `$P_RUN`).

**From `T_open` on, any restore of the database is an O-10 R2 restore.** A provider snapshot, an
hourly dump and a nightly dump all count. After a landed write a phone deletes its copy, so a restore
to an older state loses records for good unless every drained phone's manifest is in hand
(`archive/manifests/<tech>-<versionCode>.json`, plus the post-drain dumps; each phone's keys are in its
W0-results row), replayed through `drain_audit.py`, with the owner's sign-off. Section 8 is that
procedure. R1, R2, R3, R8 and R9 each point to it where it applies.

### R0 Daily

Five minutes, at SSH. PIN problems reported by technicians go to R9b.

**R0.1 Heartbeat alive.**
**Do:** open the off-box dead-man service and read the time of the last ping; then on the host
`/opt/fixflow/ops/selfhost/bin/fixflow-heartbeat.sh; echo "exit=$?"`.
**Check:** last ping under 2 minutes old; the script prints nothing but `exit=0` (it prints only on
failure; exit 1 unhealthy, 2 misconfigured, 3 healthy but the ping failed). Also
`tail -n 5 /var/log/fixflow/heartbeat.log` has no lines from today.

**R0.2 Containers up.**
**Do:** `ffc $P_RUN ps`
**Check:** `postgres`, `backend`, `web` and `edge` show `Up` and, where a healthcheck exists,
`(healthy)`. A finished `restore-gate` is normal and is not listed.

**R0.3 Deep health.**
**Do:** read deep health (section 0).
**Check:** `components` has `database` with `status` `ok`; `facts.environment` is `production`;
`facts.enable_dispatcher` is `false`. An overall `status` of `degraded` is expected while the optional
Railway pages are unconfigured (O08-F09); read the components, not the overall word. `default_pins`
must not list an active account.

**R0.4 Disk.**
**Do:** `df -h / ; docker system df`
**Check:** the filesystem holding `/var/lib/docker` is under 80 % used.

**R0.5 Last backup age.**
**Do:** `tail -n 2 /var/log/fixflow/hourly-dump.log; date -u +%Y%m%dT%H%M%SZ`
**Check:** the last JSON receipt's `key` ends `fixflow-db-<stamp>.dump` and its `<stamp>` is under 90
minutes before the `date` output. Once nightly backups are on (`FIXFLOW_BACKUP_ENABLED=true`), the
02:30 dump appears under `backups/db-selfhost/`. Until the hourly cron is installed, write "not yet
installed" instead.

**R0.6 Clock.**
**Do:** `timedatectl show -p NTPSynchronized`
**Check:** `NTPSynchronized=yes` (a wrong host clock re-buckets attendance punches).

### R1 Host will not boot

Phones keep their records while the host is down (the tunnel is gone: a Cloudflare error or a network
failure, never an app answer). Do nothing on the phones.

**R1.1 Reach the machine.**
**Do:** VPS: the provider's console shows the machine running; reboot from it if stopped. Home box:
check mains, UPS, the BIOS "power on after AC loss" setting, then the ONT and router (the usual
forgotten link). Then `ssh` in.
**Check:** `ssh` answers. The dead-man service is already alerting on the silence; leave it.

**R1.2 Docker is running.**
**Do:** `systemctl is-active docker`; if not `active`: `systemctl start docker; systemctl enable docker`
**Check:** `active`.

**R1.3 Disk is not full.**
**Do:** `df -h /`. If full, free space with `journalctl --vacuum-size=200M` and by deleting old files
under `/var/lib/fixflow/drain/` that were uploaded and recorded. **Never run `docker volume prune`,
`docker system prune --volumes` or `docker compose down -v`**: with postgres stopped, `pg_data`
looks unused and would be deleted with the database.
**Check:** under 90 % used; `docker volume ls` still lists `fixflow_pg_data`.

**R1.4 Start the database first, then the rest.**
**Do:**

```bash
ffc $P_DB up -d
ffc $P_DB ps                 # wait for (healthy)
ffc $P_RUN up -d
```

`restart: unless-stopped` does not restart a container that was stopped by hand; that is why this
command is run.
**Check:** `ffc $P_RUN ps` as in R0.2. If `restore-gate` reports **CLOSED**, the file
`/etc/fixflow/restore-signed-off` is missing or empty: STOP. Do not recreate it to get running. Find
out why (wrong machine, `/etc/fixflow` lost) and restore the secrets from the encrypted off-box copy;
the sign-off is only written after a restore passed Appendix B (section 6).

**R1.5 A container restart-loops.**
**Do:** `ffc logs --tail 80 backend` (or `postgres`, `edge`).
**Check and act:** a refusal to boot on the JWT secret (blank, short or the dev value) means fix
`/etc/fixflow/backend.env`, then `ffc $P_RUN up -d --force-recreate backend`; an alembic error means
read it, **never `alembic downgrade`**, and never start an older image against a newer schema (R5.9).
A postgres error about corruption or a missing `PG_VERSION` is a restore: R3 (and from `T_open`, an
O-10 R2 restore).

**R1.6 Confirm.**
**Do:** R0.2, R0.3, then `fixflow-heartbeat.sh; echo "exit=$?"` and, through the tunnel,
`curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health | grep -i -E '^HTTP|x-fixflow-api'`.
**Check:** `exit=0`; `200` and `x-fixflow-api: 1`.

### R2 ISP or tunnel down

An outbound-only tunnel survives a changing address and CGNAT. When it is down the phones see a
Cloudflare 5xx or a network error and keep their records. The right action is nearly always: restore
the connection and wait. Do not stand up anything that answers for `api.`, do not change DNS to an
"ok" page, and do not fail over to another host by restoring a dump (an O-10 R2 restore after `T_open`;
section 8).

**R2.1 Tell which leg is down.**
**Do:** on the host: `ffc logs --tail 50 edge`; `ffc $P_RUN ps edge`;
`curl -sS -m 15 -D - -o /dev/null https://api.example.invalid/api/health | head -n 5`
**Check:** edge logs showing repeated connection errors and the curl failing or answering from
Cloudflare without `x-fixflow-api: 1` mean the host cannot reach Cloudflare (ISP, router, DNS) or the
tunnel is stopped; edge registered and `200` with the marker means the problem is elsewhere (R4).

**R2.2 Fix the connection.**
**Do:** VPS: provider status page and console. Home box: power-cycle the router and ONT, check the UPS,
check the second uplink if there is one.
**Check:** `getent hosts api.example.invalid` prints an address, and the edge logs stop showing errors.

**R2.3 Re-register the tunnel if it did not recover.**
**Do:** `ffc --profile edge up -d --force-recreate edge`
**Check:** `ffc logs --tail 20 edge` shows "Registered tunnel connection" lines, and the curl of R1.6
returns `200` with `x-fixflow-api: 1`.

**R2.4 After the outage.**
**Do:** wait; phones flush by themselves. Watch `ffc logs --tail 100 backend` for 5xx lines for a few
minutes (O-10 R4: an app-origin 5xx during a drain is a reason to cut the route (step 5.8) before five
flushes), then R0.3 and R0.5. Note the outage's start and end in W0-results (home box: it counts in
the box-gate history).
**Check:** the heartbeat is pinging again; the backend log shows requests and no 5xx.

### R3 Restore from R2

The procedure is **section 6 of this runbook** (restore per recovery case: close the doors, prove
the dump and save the live database off the host, drop and recreate `public` as `fixflow_app`,
`pg_restore --exit-on-error`, Appendix B, the restore gate, then the app). This subsection adds
the gate in front of it and the fetch of a later R2 dump, which section 6's 6.2 does not cover.
On a live host 6.6 (b) always applies: the database has tables, and the writes made since the
dump exist nowhere else.

**R3.1 Has the window opened?**
**Do:** read W0-results for a `T_open` value.
**Check:** if there is no `T_open`, fetch the dump (R3.4), then restore per section 6 and redo any
server step (O-10 R1: before any phone drains, every server step can be redone). If there is a
`T_open`, this is an **O-10 R2 restore**: continue with R3.2; do not start a restore until R3.3 is
complete.

**R3.2 Close the door.**
**Do:** route `api.` to the 503 responder (step 5.8) and stop the backend:
`ffc $P_RUN stop backend`.
**Check:** `curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health | grep -i -E '^HTTP|x-fixflow-api'`
shows `503` and no `x-fixflow-api` line; `ffc $P_RUN ps backend` shows it stopped.

**R3.3 Get every drained phone's manifest in hand.**
**Do:** list the off-host copies (a one-off container with the app's R2 credential; the backend
stays stopped), or read the keys recorded in each phone's W0-results row:

```bash
ffc $P_RUN run --rm --no-deps -T --entrypoint python backend -c "from app.core.storage import get_storage; print(*get_storage().list_keys('archive/manifests/'), sep='\n')"
ffc $P_RUN run --rm --no-deps -T --entrypoint python backend -c "from app.core.storage import get_storage; print(*get_storage().list_keys('archive/post-drain/'), sep='\n')"
```

**Check:** every drained phone (every P4a, P4b and P4r row) has its
`archive/manifests/<tech>-<versionCode>.json` and its post-drain dump key. A phone without them blocks
the restore: STOP and take it to the owner.

**R3.4 Fetch the dump and check it against its receipt.**
**Do:** list the candidates and pick the key the owner chose (after `T_open`: the O-10 R2 decision
in W0-results; before: the newest that passed its drill):

```bash
for p in backups/db-selfhost/ backups/db-hourly/ archive/post-drain/; do
  ffc $P_RUN run --rm --no-deps -T --entrypoint python backend -c "import sys; from app.core.storage import get_storage; print(*sorted(get_storage().list_keys(sys.argv[1]))[-3:], sep='\n')" "$p"
done
KEY=<the chosen key>
install -d -m 700 /var/lib/fixflow/restore
```

Fetch it as R7.2 does (signed GET, no R2 key typed), into the restore folder:

```bash
url="$(ffc $P_RUN run --rm --no-deps -T --entrypoint python backend -c 'import sys; from app.core.storage import get_storage; print(get_storage().mint_playback_url(sys.argv[1], 300))' "$KEY")"
curl -fsS -m 300 -o "/var/lib/fixflow/restore/$(basename "$KEY")" "$url"; unset url
sha256sum "/var/lib/fixflow/restore/$(basename "$KEY")"
```

Then find the sha256 the backup job recorded when it uploaded that key (its receipt):

```bash
grep -F "\"$KEY\"" /var/log/fixflow/hourly-dump.log                       # backups/db-hourly/: a JSON line with "sha256"
ffc $P_RUN logs --no-log-prefix backend 2>/dev/null | grep -F "db backup uploaded: $KEY"   # backups/db-selfhost/ (nightly)
```

A post-drain or manual key's sha256 is in its W0-results row (8.4 recorded it).
**Check:** the fetched file's `sha256sum` equals the receipt's `sha256`. This replaces 6.2's check
in section 6 (6.6 compares against it). Different: STOP. No receipt left (a new host, rotated
logs): write "no receipt; fetched sha256 <sum>" in W0-results and rely on 6.6's list check and
Appendix B; the owner signs that off in R3.5.

**R3.5 Restore, replay, sign off.**
**Do:** section 6 from 6.1 for the restore (6.2 is replaced by R3.4; 6.6 (b) saves the live
database to `archive/pre-restore/` first); section 8 for the replay of every manifest through
`drain_audit.py`; the owner signs off in writing in W0-results.
**Check:** W0-results has the `archive/pre-restore/` key and sha256 from 6.6 (b); the replay
reports no unreplayed row; Appendix B passes; the owner's sign-off row exists. Only then re-open
the route (step 5.9) and start the app.

### R4 DNS, domain or Cloudflare problem

The constraint behind every step: nothing on the path may answer a phone with a bare 4xx (a captive
page, a WAF block, a challenge, a parking page). A 5xx without the app's marker or a network error is
safe; a 4xx is not.

**R4.1 See what the phone would see.**
**Do:** `curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health; echo "exit=$?"`
**Check:** read it against this table:

| You see | Meaning | Go to |
| ------- | ------- | ----- |
| `200` and `x-fixflow-api: 1` | healthy | nothing to do |
| no status, `exit` 6, 7, 28, 35, 51 or 60 | DNS, connection or TLS failure; phones keep records | R4.3, then R2 |
| `503` with no marker | the route is on the 503 responder, or the tunnel has no origin | R4.4 |
| `403`, `429`, a challenge or block page, `cf-ray` present, no marker | Cloudflare is answering a client error: the dangerous class | R4.2 |
| any 4xx with no marker and not from Cloudflare (registrar or parking page) | domain problem | R4.3 |

**R4.2 Cloudflare is blocking or challenging `api.`.**
**Do:** first stop the damage: route `api.` to the 503 responder (step 5.8) so phones see
connectivity instead of a refusal (this is the same abort lever as O-10 R3). Then in the Cloudflare
dashboard, for `api.`: no WAF custom rules, no Bot Fight Mode, no Browser Integrity Check, no managed
challenge, no Access application; rate-limit rules may only answer 429 with a Retry-After.
**Check:** after re-routing back, R4.1 gives `200` and `x-fixflow-api: 1` for a GET and for
`curl -sS -m 20 -D - -o /dev/null -X POST -H 'content-type: application/json' -d '{}' https://api.example.invalid/api/ops/health`
(`401` with the marker, the backend's own refusal).

**R4.3 DNS or domain.**
**Do:** the registrar dashboard: the domain is not expired, not parked, not on hold; Cloudflare
dashboard: the zone is active and `api.` points at the tunnel. Auto-renew, registrar lock and 2FA on.
**Check:** `getent hosts api.example.invalid` prints an address and R4.1 is healthy. A domain that
lapses or parks is the same failure the old Railway hostname was; renew first, investigate after.

**R4.4 The tunnel config on the host.**
**Do:**

```bash
ls -ln /etc/fixflow/cloudflared
tail -n 1 /etc/fixflow/cloudflared/config.yml
grep -c 'http_status:404' /etc/fixflow/cloudflared/config.yml
```

**Check:** the files are owned by `65532 65532` and mode `-r--------`; the last line of
`config.yml` is the catch-all `- service: http_status:503` (or, on purpose, the maintenance config);
the `grep -c` prints `0` (a 404 catch-all is a definitive refusal to the phones). If the config is
right and the edge does not register, `ffc --profile edge up -d --force-recreate edge` and read
`ffc logs --tail 30 edge`.
If the Cloudflare account itself is locked or lapsed, tunnel, DNS and R2 fail together: the fallback is
a cheap VPS running this same compose (R8).

### R5 Deploy a tag or `main`

Before `T_close` the target is only a `drain-image*` tag (standing rule 3). After it, the target is a
`main` sha. The deploy is the same either way. About 15 minutes, owner at SSH.

**R5.1 The checkout is clean.**
**Do:** `git -C /opt/fixflow status --porcelain --untracked-files=no`
**Check:** no output. Anything listed makes `ffc` stamp the build `<sha>-dirty`; undo the change
(`git -C /opt/fixflow checkout -- <file>`) and re-run.

**R5.2 Choose and fetch the target.**
**Do:**

```bash
git -C /opt/fixflow fetch origin --tags
git -C /opt/fixflow rev-parse '<target>^{commit}'      # write this full sha down as TARGET
```

Before `T_close`: `<target>` is `drain-image` (or the newest `drain-image-N`). If this deploy must also
carry the web commits P12a/P12, the target is `drain-web-image*` instead (the tip of `release/drain-web`);
its backend tree is identical to `drain-image`:
`git -C /opt/fixflow diff --stat drain-image..<that tag> -- backend/` must print nothing.
After `T_close`: `<target>` is a full `main` sha that the phase's PR merged to
(`git -C /opt/fixflow branch -r --contains <sha>` lists `origin/main`).
**Check:** TARGET printed; before `T_close` the name starts `drain-image` or `drain-web-image`.
The `drain-web-image` tag is the coordinator's ruling (2026-11-13, review #195; see 11.12). The single
checkout means one sha for both images, so the web before `T_close` is built from `release/drain-web`
or not at all.

**R5.3 Record where you are, and take a dump.**
**Do:**

```bash
git -C /opt/fixflow rev-parse HEAD                                          # PREV sha
docker inspect --format '{{.Image}}' $(ffc ps -q backend)                   # PREV image id
ffc exec -T postgres psql -U fixflow_app -d fixflow -Atc 'select version_num from alembic_version'   # DB head
/opt/fixflow/ops/selfhost/bin/fixflow-backup.sh manual
```

**Check:** three values written down; the backup prints one JSON receipt with a `key`, `size_bytes`
and `sha256`.

**R5.4 Check out the target.**
**Do:** `git -C /opt/fixflow checkout --detach <TARGET>`
**Check:** `git -C /opt/fixflow rev-parse HEAD` equals TARGET; before `T_close`,
`git -C /opt/fixflow describe --tags --exact-match HEAD` prints the tag.

**R5.5 Build.**
**Do:** `ffc $P_RUN build backend web`
**Check:** exit 0; `docker images --format '{{.Repository}}:{{.Tag}}' | grep "fixflow/backend:$(git -C /opt/fixflow rev-parse HEAD)"` prints a line.

**R5.6 Start.**
**Do:** `ffc $P_RUN up -d` (add `--profile ops` to `$P_RUN` if the ops console is used). `start.sh` runs
`alembic upgrade head` on boot and then serves; there is no separate migration step.
**Check:** wait up to 2 minutes, then `ffc $P_RUN ps` shows `backend` `(healthy)`, and
`ffc logs --tail 60 backend` shows the alembic lines and `Application startup complete`. A backend that
exits is a STOP: R5.9.

**R5.7 Verify by content.**
**Do:**

```bash
want="$(git -C /opt/fixflow rev-parse HEAD)"; echo "want=$want"
ffc exec -T backend sh -c 'curl -fsS -H "X-Ops-Proxy-Token: $FIXFLOW_OPS_PROXY_TOKEN" http://localhost:8000/api/ops/health' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("git_sha=", d["facts"]["git_sha"]); print([c for c in d["components"] if c["name"]=="database"])'
```

**Check:** `git_sha` equals `want`, and the database component is `ok`. Also
`curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health | grep -i -E '^HTTP|x-fixflow-api'`
shows `200` and `x-fixflow-api: 1`.

**R5.8 Record.**
**Do:** `docker inspect --format '{{.Image}}' $(ffc ps -q backend)` and write, in the phase's
W0-results row: the sha, `facts.git_sha`, this image id, the DB head
(`select version_num from alembic_version`) and the post-deploy check result.
**Check:** the row has all five.

**R5.9 Roll back (only when R5.6 or R5.7 failed).**
**Do:**

1. Find the migration head the previous version expects:
   `git -C /opt/fixflow show <PREV>:CLAUDE.md | grep -o 'head = \*\*[0-9]*\*\*'`, and the database's
   applied head (`select version_num from alembic_version`, as in R5.3).
2. **If the database head is higher than the previous version's head, STOP. Do not roll back.** An old
   image against a newer schema is unsafe; fix forward instead (deploy a corrected target).
3. If they are equal: `git -C /opt/fixflow checkout --detach <PREV>`, then `ffc $P_RUN build backend web`
   and `ffc $P_RUN up -d`, then R5.7.

Before `T_close` the rollback target is also only a `drain-image*` tag. **Never `alembic downgrade`.**
**Check:** R5.7 passes with `git_sha` equal to `<PREV>`.
VERIFY: the `head = **NNNN**` text exists in CLAUDE.md at the previous sha (CI checks it; if the grep
prints nothing, take the head from the end of the `down_revision` chain in `backend/alembic/versions/`).

### R6 Rotate secrets

`restart` does not re-read env files: every change below needs `up -d --force-recreate`. The
database role password is NOT rotated here (`postgres.env` is read only at first initialisation, so
editing it changes nothing); do not edit it on a running host.

**R6.1 Back up the current files.**
**Do:** `cp -a /etc/fixflow/backend.env /etc/fixflow/backend.env.bak-<stamp>; cp -a /etc/fixflow/ops.env /etc/fixflow/ops.env.bak-<stamp>`
**Check:** `ls -l /etc/fixflow/*.bak-*` shows both, mode `-rw-------`, owner root.

**R6.2 Rotate the JWT secret (signs everyone out: schedule it).**
Every manager and technician session ends. On a build with the v2 outbox a phone's queued writes
are not lost (an app 401 pauses the outbox until sign-in), but each technician must sign in again
with name and PIN. A field build WITHOUT the v2 outbox drops queued job writes on that 401
(`O10-F15`): while any such phone is in the fleet, rotate only after its queue is empty. Do not do
it during the drain window, while the legacy-secret verifier is on, or during working hours.
**Do:** `openssl rand -hex 32` and put the value in `FIXFLOW_JWT_SECRET=` in `/etc/fixflow/backend.env`
with an editor (never on a command line); then `ffc $P_RUN up -d --force-recreate backend`.
**Check:** `sed -n 's/^FIXFLOW_JWT_SECRET=//p' /etc/fixflow/backend.env | tr -d '\n' | wc -c` prints
`64`; `backend` becomes `(healthy)`; the manager signs in on the web app; an old session is signed out.

**R6.3 Rotate the ops proxy token (both files, together).**
**Do:** new value (`openssl rand -hex 32`) in `FIXFLOW_OPS_PROXY_TOKEN=` of `backend.env` **and**
`OPS_PROXY_TOKEN=` of `ops.env`, the same string in both. Then
`ffc $P_RUN up -d --force-recreate backend ops` (drop `ops` if the ops console is not used). The
heartbeat reads the token from `backend.env`, so it follows by itself.
**Check:**

```bash
ffc exec -T backend sh -c 'curl -sS -o /dev/null -w "%{http_code}\n" -H "X-Ops-Proxy-Token: wrong" http://localhost:8000/api/ops/health'   # 401
fixflow-heartbeat.sh; echo "exit=$?"                                                                         # exit=0
```

and R0.3 returns the deep health. Heartbeat failures for the minute between the edit and the recreate
are expected.

**R6.4 Other secrets (R2 keys, FCM service account, Sentry DSN).**
**Do:** mint the new value at the provider, edit `backend.env`, `ffc $P_RUN up -d --force-recreate backend`.
`FIXFLOW_LEGACY_JWT_SECRET` and its `EXPIRES_AT` are set only inside an owner-signed, supervised window
and removed after it (both or neither).
**Check:** R0.3 `database` ok and the `r2_storage` component ok; for R2 keys also `fixflow-backup.sh manual`
prints a receipt.

**R6.5 Clean up and update the off-box copy.**
**Do:** `rm /etc/fixflow/*.bak-*`, then update the encrypted off-box copy of the secrets.
**Check:** `ls /etc/fixflow` shows no `.bak-` file.

### R7 Monthly restore drill

Prove a real dump restores. Never against `fixflow` itself. On a machine that cannot create Docker
networks (the development laptop), use the single-container form instead:
`docs/program/lab/p0a/verify-dump.sh <dump file>` (a throwaway `postgres:17-alpine` with the Appendix B
queries), and skip to R7.8.

**R7.1 Pick the newest dump.**
**Do:**

```bash
ffc exec -T backend python -c "from app.core.storage import get_storage; print(*sorted(get_storage().list_keys('backups/db-selfhost/'))[-3:], sep='\n')"
```

**Check:** the newest key's stamp is under 26 hours old (nightly) or from `backups/db-hourly/` (under
2 hours). Set `KEY=<that key>`.

**R7.2 Fetch it without typing an R2 key.**
**Do:**

```bash
url="$(ffc exec -T backend python -c 'import sys; from app.core.storage import get_storage; print(get_storage().mint_playback_url(sys.argv[1], 300))' "$KEY")"
curl -fsS -m 300 -o /var/lib/fixflow/drain/drill.dump "$url"; unset url
sha256sum /var/lib/fixflow/drain/drill.dump; ls -l /var/lib/fixflow/drain/drill.dump
```

**Check:** the file is non-empty. VERIFY: `mint_playback_url` produces a working signed GET for a
`backups/` key (it is the signed-GET path media uses; not run against a backup key).

**R7.3 Make sure it is a real dump.**
**Do:** `ffc exec -T postgres pg_restore -l < /var/lib/fixflow/drain/drill.dump | head -n 20`
**Check:** a table of contents prints (not "does not appear to be a valid archive").

**R7.4 Create a scratch database.**
**Do:** the one step that needs the superuser (the app role cannot create databases):
`ffc exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE fixflow_drill OWNER fixflow_app'`
**Check:** prints `CREATE DATABASE`.

**R7.5 Restore into it as `fixflow_app`.**
**Do:**

```bash
ffc exec -T postgres mkdir -p /restore
ffc cp /var/lib/fixflow/drain/drill.dump postgres:/restore/drill.dump
ffc exec -T postgres psql -U fixflow_app -d fixflow_drill -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public'
ffc exec -T postgres sh -c 'pg_restore -l "$1" > "$1.toc" && grep -v -E "^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public " "$1.toc" > "$1.list"' _ /restore/drill.dump && ffc exec -T postgres grep -c 'TABLE DATA' /restore/drill.dump.list
ffc exec -T postgres pg_restore --exit-on-error --no-owner --no-privileges -U fixflow_app -d fixflow_drill -L /restore/drill.dump.list /restore/drill.dump; echo "exit=$?"
```

**Check:** the `grep -c` prints a number above `30`; `exit=0` (6.6 and 6.7 explain the list).

**R7.6 Appendix B on the copy.**
**Do:**

```bash
ffc cp /opt/fixflow/ops/selfhost/sql/appendix-b.sql postgres:/restore/appendix-b.sql
ffc exec -T postgres psql -U fixflow_app -d fixflow_drill -v ON_ERROR_STOP=1 -f /restore/appendix-b.sql | tee /var/lib/fixflow/drain/drill-appendix-b.txt
```

**Check:** exits 0; all public tables are counted; `alembic_version` is at or below the live head; the
three sequences (`job_token_seq`, `job_event_seq`, `shop_setting_seq`) are at or above their tables'
maxima; the non-voided `job_payment` sum matches live up to the writes since the dump.

**R7.7 Compare with live.**
**Do:** run the same `appendix-b.sql` against `-d fixflow` and compare the counts.
**Check:** no table has MORE rows in the restore than live; the differences are only the rows written
since the dump's stamp.

**R7.8 Clean up and record.**
**Do:**

```bash
ffc exec -T postgres psql -U postgres -c 'DROP DATABASE fixflow_drill'
ffc exec -T postgres rm -f /restore/drill.dump
rm -f /var/lib/fixflow/drain/drill.dump
```

then add one row to the **Drill log** table in `docs/RUNBOOK-BACKUPS.md` (columns: Date, Dump source,
Restored into, Result) with the key, the head, the counts and PASS or the failure.
**Check:** `psql -U postgres -Atc '\l'` no longer lists `fixflow_drill`; the row is committed.

### R8 Host replacement or move to a VPS

The same compose file on the new machine; only the restore and the DNS/tunnel move. Read the paragraph
under the section heading first: from `T_open` on, the restore in R8.4 is an O-10 R2 restore (section 8).
A dead host's records exist only on the phones that drained them and in the dumps.

**R8.1 Build the new host.**
**Do:** the "host ready" checklist (VPS or home box section), then `git clone` to `/opt/fixflow` and
`git -C /opt/fixflow checkout --detach <the sha or tag the old host ran>`; install `ffc`
(`ln -s /opt/fixflow/ops/selfhost/bin/ffc /usr/local/bin/ffc`).
**Check:** `git -C /opt/fixflow rev-parse HEAD` equals the old host's recorded sha (before `T_close`:
`describe --tags --exact-match HEAD` prints a `drain-image*` tag).

**R8.2 Restore the secrets.**
**Do:** from the encrypted off-box copy (or, if the old host is alive, as in R9.3) into `/etc/fixflow/`
with the same modes and numeric owners (`65532:65532` for `cloudflared/`). Use the **same**
`FIXFLOW_JWT_SECRET` or every phone gets a 401. Do NOT bring `restore-signed-off` across.
**Check:** `ls -ln /etc/fixflow /etc/fixflow/cloudflared` shows the expected modes and owners, and
`/etc/fixflow/restore-signed-off` does not exist yet.

**R8.3 Door shut.**
**Do:** keep `api.` on the 503 responder (step 5.8) until R8.6.
**Check:** `curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health | grep -i -E '^HTTP|x-fixflow-api'`
shows `503` and no marker.

**R8.4 Restore the database.**
**Do:** section 6 (case by case, as `fixflow_app`, Appendix B, then the sign-off file, then
`ffc --profile db --profile app --profile web up -d`, no edge yet). From `T_open` on: section 8 first (manifests in hand,
replay through `drain_audit.py`, owner sign-off).
**Check:** Appendix B counts as section 6 requires; backend `(healthy)`; deep health read locally shows
`git_sha` equal to R8.1's sha.

**R8.5 Move the tunnel.**
**Do:** the same credentials JSON and `config.yml` on the new host. If the old host is alive, stop its
edge FIRST: `ffc --profile edge stop edge` there; two connectors on one tunnel share the traffic, and
half of it would reach the stale host. Then `ffc --profile edge up -d edge` on the new host.
**Check:** `ffc logs --tail 20 edge` shows registered connections, and the tunnel's connector list in
the Cloudflare dashboard shows only the new host.

**R8.6 Route, read back, re-install the crons.**
**Do:** route `api.` to the backend (step 5.9), then `fixflow-heartbeat.sh; echo "exit=$?"`; then
`mkdir -p /var/log/fixflow` and install the crons as in R9.9. If the old host is alive, remove
`/etc/cron.d/fixflow-heartbeat` and `/etc/cron.d/fixflow-hourly-dump` there (R9.2).
**Check:** `200` and `x-fixflow-api: 1` through `api.`; `exit=0`; R0.1 and R0.5 pass within an hour.
Update `FIXFLOW_DOMAIN` only if the domain itself changed, and then rebuild the web image (the API URL
is baked into the bundle).

### R9 VPS to home box (phase P13e)

Not before the later of "P5d-2 done" and the last re-open, and only after the box gate (a 14-day
heartbeat from the home box's site at 99.5 % reachability or better, or a second uplink). Skipped when
there is no home box. The VPS is called "old" and the home box "new". Because the window has opened,
the restore here falls under the rule at the top of this section: the plan lists no exemption, so the
owner records a sign-off row for it (the final dump is taken with the backend stopped, so it is
current; Appendix B equality in R9.6 is the evidence).

**R9.1 Route `api.` to the 503 responder.**
**Do:** step 5.8 (maintenance route) on the old host (the tunnel itself answers 503 for every
hostname). Mute or pause the off-box dead-man check for the move window in the monitoring service, so
the move does not page.
**Check:** `curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health | grep -i -E '^HTTP|x-fixflow-api'`
shows `503` and no `x-fixflow-api` line.

**R9.2 Stop the old backend and remove the old host crons.**
No scheduler, pruner or dead-man ping may run from the old host after this step.
**Do (old host):**

```bash
rm -f /etc/cron.d/fixflow-heartbeat /etc/cron.d/fixflow-hourly-dump
ffc $P_RUN stop backend
```

From now on never run `ffc ... up -d` on the old host.
**Check:**

```bash
ls /etc/cron.d/fixflow-* 2>&1 | grep -E 'heartbeat|hourly' ; echo "grep-exit=$?"     # grep-exit=1 (nothing listed)
ffc ps -q backend                                                                      # prints nothing
pgrep -af 'fixflow-(heartbeat|backup)' ; echo "pgrep-exit=$?"                          # pgrep-exit=1
```

**R9.3 Copy `/etc/fixflow` to the new host, byte for byte, except the sign-off.**
Same JWT secret, or every phone 401s. The sign-off file is NOT copied: it is the new host's own gate
and is written only after R9.6 passes; a copied one would let the backend boot on an empty database.
**Do (old host):**

```bash
cd /etc/fixflow && find . -type f ! -name restore-signed-off -print0 | sort -z | xargs -0 sha256sum > /root/etc-fixflow.sha256
tar --numeric-owner --exclude=fixflow/restore-signed-off -C /etc -czf /root/etc-fixflow.tgz fixflow
scp /root/etc-fixflow.tgz /root/etc-fixflow.sha256 root@<home-box>:/root/
```

**Do (new host):**

```bash
tar --numeric-owner -C /etc -xpzf /root/etc-fixflow.tgz
cd /etc/fixflow && sha256sum -c /root/etc-fixflow.sha256
```

**Check:** every line ends `OK`; `ls -ln /etc/fixflow/cloudflared` shows `65532 65532`, mode
`-r--------`; `/etc/fixflow/restore-signed-off` does not exist on the new host. Delete both archives
from both hosts afterwards (`shred -u` or `rm`).

**R9.4 Final dump and Appendix B on the old host, with sha256.**
The backend is stopped, so nothing writes. The database container is still up.
**Do (old host):**

```bash
stamp=$(date -u +%Y%m%dT%H%M%SZ)
ffc exec -T postgres pg_dump -U fixflow_app -d fixflow --format=custom --schema=public --no-owner --no-privileges > /var/lib/fixflow/drain/final-$stamp.pgdump
ffc exec -T postgres pg_restore -l < /var/lib/fixflow/drain/final-$stamp.pgdump | head -n 5
sha256sum /var/lib/fixflow/drain/final-$stamp.pgdump | tee /var/lib/fixflow/drain/final-$stamp.sha256
ffc exec -T postgres mkdir -p /restore
ffc cp /opt/fixflow/ops/selfhost/sql/appendix-b.sql postgres:/restore/appendix-b.sql
ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -f /restore/appendix-b.sql > /var/lib/fixflow/drain/appendix-b-source-$stamp.txt
scp /var/lib/fixflow/drain/final-$stamp.pgdump /var/lib/fixflow/drain/final-$stamp.sha256 root@<home-box>:/var/lib/fixflow/drain/
```

**Check:** the dump is non-empty and its table of contents prints; the sha256 and the source
Appendix B output are saved; on the new host `cd /var/lib/fixflow/drain && sha256sum -c final-$stamp.sha256`
prints `OK`.

**R9.5 Prepare the new host's database container.**
**Do (new host):** `git -C /opt/fixflow rev-parse HEAD` must equal the old host's sha; then
`ffc $P_DB up -d` (postgres alone; no `app` profile).
**Check:** `ffc $P_DB ps` shows `postgres` `(healthy)`; no backend container exists.

**R9.6 Restore on the new host with section 6's production commands; Appendix B equals the source.**
**Do (new host):** set `stamp` to the old host's value from R9.4 (`ls /var/lib/fixflow/drain/final-*.pgdump`), then section 6 (drop and recreate `public` as `fixflow_app`; `ffc cp` the dump to
`postgres:/restore/`; the TOC list without the `SCHEMA - public` entry; `pg_restore --exit-on-error
--no-owner --no-privileges -U fixflow_app -d fixflow -L <list>`; Appendix B), exactly as 6.6-6.8:

```bash
ffc cp /opt/fixflow/ops/selfhost/sql/appendix-b.sql postgres:/restore/appendix-b.sql
ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -f /restore/appendix-b.sql > /var/lib/fixflow/drain/appendix-b-dest-$stamp.txt
```

**Check:** `ffc` restore exit 0; and `diff /var/lib/fixflow/drain/appendix-b-source-$stamp.txt /var/lib/fixflow/drain/appendix-b-dest-$stamp.txt`
prints nothing (every table count, the money sum, the three sequences and `alembic_version` are
identical to the source). Any difference is a STOP: nothing has moved yet; the old host is still
authoritative. Then write the new host's own sign-off (`/etc/fixflow/restore-signed-off`, as in
section 6) and start the app **without** the edge:
`ffc --profile db --profile app --profile web up -d`; read deep health locally (section 0):
`database` ok, `git_sha` equal to the old host's.

**R9.7 Move the tunnel (the old edge is stopped first).**
**Do:** on the old host `ffc --profile edge stop edge`; confirm; then on the new host first check which
routing `config.yml` carries (R9.1 left the maintenance routing in place):
`grep -c 'service: http://backend:8000' /etc/fixflow/cloudflared/config.yml` (`0` = maintenance,
`1` = normal), then `ffc --profile edge up -d edge`.
**Check:** old host: `ffc ps -q edge` prints nothing; new host: `ffc logs --tail 20 edge` shows
registered connections; the Cloudflare tunnel's connector list shows only the new host;
`curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health | grep -i -E '^HTTP|x-fixflow-api'`
still shows `503` and no marker while the route is on the maintenance config. The credentials JSON is
the one copied in R9.3; never create a second tunnel.

**R9.8 Route to the backend and read deep health back through `api.`.**
**Do (new host):** step 5.9 (normal routing), then:

```bash
umask 077; h="$(mktemp)"
printf 'X-Ops-Proxy-Token: %s\n' "$(sed -n 's/^FIXFLOW_OPS_PROXY_TOKEN=//p' /etc/fixflow/backend.env | tail -n 1)" > "$h"
curl -fsS -m 20 -H @"$h" https://api.example.invalid/api/ops/health | python3 -m json.tool; rm -f "$h"
```

**Check:** `database` is `ok`; `facts.git_sha` equals the old host's recorded sha; `facts.environment`
is `production`; `facts.enable_dispatcher` is `false`; the three ceilings are the values recorded at
`T_close`; and `curl -sS -m 20 -D - -o /dev/null https://api.example.invalid/api/health` gives `200` with
`x-fixflow-api: 1`. The manager signs in on `https://app.example.invalid` with the same PIN as before
(the same JWT secret also keeps phone sessions alive).

**R9.9 Install the heartbeat and hourly crons on the new host.**
**Do (new host):**

```bash
mkdir -p /var/log/fixflow
install -m 0644 /opt/fixflow/ops/selfhost/cron/fixflow-heartbeat   /etc/cron.d/fixflow-heartbeat
install -m 0644 /opt/fixflow/ops/selfhost/cron/fixflow-hourly-dump /etc/cron.d/fixflow-hourly-dump
install -m 0644 /opt/fixflow/ops/selfhost/cron/fixflow-boxgate     /etc/cron.d/fixflow-boxgate
install -m 0644 /opt/fixflow/ops/selfhost/cron/fixflow-logrotate   /etc/logrotate.d/fixflow
/opt/fixflow/ops/selfhost/bin/fixflow-heartbeat.sh; echo "exit=$?"
/opt/fixflow/ops/selfhost/bin/fixflow-backup.sh hourly
```

Un-mute the dead-man check.
**Check:** `exit=0`; the dump prints a receipt with a `key` under `backups/db-hourly/`; after 2 minutes
the dead-man service shows the new host's pings. The box-gate cron (`fixflow-boxgate`) is a home-box
cron and is not on the old host.

**R9.10 Keep the old host read-only for 14 days.**
Only the postgres container runs there: no backend, no web, no edge, no crons.
**Do (old host):**

```bash
ffc $P_RUN stop backend web edge ops 2>/dev/null; true
ffc exec -T postgres psql -U postgres -c "ALTER SYSTEM SET default_transaction_read_only = on"
ffc $P_DB restart postgres
```

(`ALTER SYSTEM` writes the setting into the data volume, so it survives restarts and reboots.)
**Check:**

```bash
ffc exec -T postgres psql -U postgres -Atc 'SHOW default_transaction_read_only'                       # on
ffc exec -T postgres psql -U fixflow_app -d fixflow -c 'CREATE TABLE ro_probe(x int)'                  # ERROR: cannot execute CREATE TABLE in a read-only transaction
ffc ps                                                                                                  # postgres only
ls /etc/cron.d/fixflow-* 2>/dev/null | wc -l                                                           # 0
```

This guards against an accidental write by a stray backend; a session can still override it with
`SET`, so it is a guard, not a lock. Do not run `ffc ... up -d` on this host.
VERIFY: the `ALTER SYSTEM` plus restart behaves as described on the installed Postgres 17 image (the
setting has not been run on this stack).

**R9.11 After 14 days: destroy the old host.**
**Do:** only when, over those 14 days, the new host's heartbeat history is clean, the hourly and
nightly dumps are landing, and an R7 drill has passed on the new host. Make sure the final dump
(`final-<stamp>.pgdump` and its sha256) exists in R2 (`fixflow-r2-put.sh /var/lib/fixflow/drain/final-<stamp>.pgdump archive/p13e/final-<stamp>.pgdump` on the new host) and
off both machines on the owner's laptop; then delete the VPS in the provider's console, with its
snapshots and backups, and remove its SSH key from wherever it was recorded. Write a dated
"P13e close" row in W0-results: the date, the final dump's key and sha256, the Appendix B comparison,
the sign-off, and "old host destroyed".
**Check:** the provider console no longer lists the VPS; `ssh` to it fails; the P13e-close row exists
and names the date; R0.1 to R0.5 pass on the new host.

### R9b PIN lock recovery

(Kept as R9b rather than a note under R0: it has steps of its own. R0 points here.) The lock blocks
even a correct PIN on purpose; do not try to work around it. Everything runs through the backend
container. Neither script takes a PIN on the command line.

**R9b.1 See what is locked.**
**Do:** `ffc exec -T backend python -m scripts.unlock_account` (dry run; changes nothing)
**Check:** prints `=== accounts carrying throttle state: N ===` and one line per account, with
`LOCKED until ...` for a live lock.

**R9b.2 A technician is locked and a manager can sign in.**
**Do:** the manager sets that technician's PIN in the app (`PUT /api/technicians/<tech>/pin`, which
resets the lock as a side effect). PINs are 6 or more digits, never `1234` or `123456`.
**Check:** R9b.1 no longer lists that account; the technician signs in.

**R9b.3 The manager's own account is locked, or the lock must be cleared by hand.**
**Do:**

```bash
ffc exec -T backend python -m scripts.unlock_account --tech m1            # dry run
ffc exec -T backend python -m scripts.unlock_account --tech m1 --apply
```

**Check:** prints `Applied: throttle state cleared on 1 account(s). PINs are unchanged.` Sign in at
once: the list of ids is public, so the account can be locked again.

**R9b.4 A PIN is forgotten, or an account still has a seed PIN (login gives 403 "PIN must be changed by the manager").**
**Do:** with a terminal (no `-T`, so the PIN is prompted for twice and never echoed or logged):

```bash
ffc exec backend python -m scripts.set_pin --report                       # which accounts carry a default PIN
ffc exec backend python -m scripts.set_pin --tech m1                      # dry run: policy check
ffc exec backend python -m scripts.set_pin --tech m1 --apply
```

**Check:** the last command prints `PIN set for m1 (manager); login throttle cleared; sessions untouched.`;
`--report` exits 0 and says `0 active account(s) still carry a default PIN` once every account is done;
a refusal line `Refused for ... Nothing done.` means the PIN broke the policy (digits only, 6 or more,
not a known default). Do not use `--pin-stdin` at an interactive shell (the PIN lands in the shell
history). Do not add any other path that writes a PIN.
