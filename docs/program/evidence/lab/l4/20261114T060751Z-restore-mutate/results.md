# L4 — restore rehearsal (origin/main)

Verdicts: DONE 32, FAILED 16, AMBIGUOUS 4, MOVED 1, NRH 8, N/A 1 (of 62 rows; NRH = not rehearsable here; MOVED = the runbook changed shape under the step, nothing typed)

## What was rehearsed

```
rehearsed ref: origin/main = e6f85c58b8b7133c5d06374ef95a8267800c1e87 (the stand-in origin's main; read before bundling, checked in the host)
other refs bundled: none
checkout bundled from: C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/rv201-head
rig: ops/lab/rehearsal at 8c2383e467f062d3028af02c37e7ecd8443804a2 (0 uncommitted file(s) under it)
modes: mutate=1; slot pool: light
started: 2026-11-14T06:08:16Z
```

## Runbook steps

| Phase | Step | Verdict | Run | Check and result | Note |
| --- | --- | --- | --- | --- | --- |
| selftest | shape guard | **DONE** | lib/selftest-runbook.py on the runbook under rehearsal and the committed pins | 16 ok, 0 FAIL | selftest-runbook.txt |
| restore | 1.11 | **DONE** | git clone of the stand-in origin; checkout main | rev-parse = e6f85c58b8b7133c5d06374ef95a8267800c1e87, status empty, ffc executable | repo-url is the stand-in origin /srv/origin.git (the VERIFY on a deploy key does not apply) |
| restore | 1.12 | **FAILED** | ln -sfn ffc | readlink + executable: /usr/local/bin/ffc.l4mut executable |  |
| restore | 1.13 | **DONE** | install -d | 700 root:root /etc/fixflow;700 root:root /var/lib/fixflow;700 root:root /var/lib/fixflow/drain;755 root:root /var/log/fixflow; |  |
| restore | 1.14 | **DONE** | install the logrotate file; logrotate -d | rotating pattern: /var/log/fixflow/*.log weekly (8 rotations);considering log /var/log/fixflow/*.log; log /var/log/fixflow/*.log does not exist -- skipping;exit=0; | logrotate 3.x of the stand-in host (Alpine), the same configuration syntax as Debian's |
| restore | 3.1 | **FAILED** | install -m 0600 the five templates | ls -l: 0 of 5 files -rw------- root root |  |
| restore | 3.2 | **NRH** | create the dead-man checks at the monitoring service | - | needs the off-box monitoring service. Stand-in: a local listener on the stand-in host (127.0.0.1:9999) whose URLs go into heartbeat.env |
| restore | 3.3 | **DONE** | the six openssl lines of the block, one at a time | lengths: 64 64 64 48 48 24 ; distinct: 6 | the Check names the first five lengths (64,64,64,48,48); the sixth (base64 18) is 24 |
| restore | 3.4 | **DONE** | edit compose.env (domain, cloudflared tag) | FIXFLOW_DOMAIN=l4lab.example.invalid;FIXFLOW_CLOUDFLARED_TAG=2025.11.1;FIXFLOW_BACKUP_ENABLED=false; | cloudflared tag 2025.11.1 (the smoke's); the VERIFY on picking a dated tag was not exercised |
| restore | 3.5 | **DONE** | edit postgres.env | POSTGRES_PASSWORD 48;FIXFLOW_APP_DB_PASSWORD 48; |  |
| restore | 3.6 | **DONE** | edit backend.env (URL, JWT, ops token, CORS, four stand-in R2 values) | FIXFLOW_JWT_SECRET 64;FIXFLOW_OPS_PROXY_TOKEN 64;db password matches;0;restore gate: backend.env OK (no forced key in another spelling, every key a plain name); | R2 values are stand-ins: account l4lab, bucket l4-bucket (the stand-in bucket on the stand-in host) |
| restore | 3.7 | **DONE** | edit ops.env and heartbeat.env | ops token matches;FIXFLOW_HEARTBEAT_HEALTH_URL=https://api.l4lab.example.invalid/api/ops/health; | ping URLs point at the stand-in dead-man listener |
| restore | 3.8 | **DONE** | chown/chmod | stat: 5 of 5 '600 root:root'; files with a REPLACE count above 0: 0 (/etc/fixflow/backend.env:0 /etc/fixflow/compose.env:0 /etc/fixflow/heartbeat.env:0 /etc/fixflow/ops.env:0 /etc/fixflow/postgres.env:0 ) |  |
| restore | 3.9 | **NRH** | scp the env files to the laptop, password-manager vault, printed sheet | host half of the check ran: 5 fingerprints of 12 characters | needs the owner's laptop and vault |
| restore | 4.1 | **FAILED** | ffc $P_ALL config -q | unknown flag: --l4-no-such-flag;exit=1; |  |
| restore | 4.2 | **FAILED** | config \| grep overrides; ports count | FIXFLOW_BACKUP_ENABLED: "true"; FIXFLOW_BACKUP_PREFIX: backups/db-selfhost/; FIXFLOW_CORS_ORIGINS: '["https://app.l4lab.example.invalid"]'; FIXFLOW_ENABLE_DISPATCHER: "false"; FIXFLOW_ENVIRONMENT: production;0; | the CORS line: 1 rendered (the VERIFY on env_file inlining is answered: compose v2.33 inlines it) |
| restore | 4.3 | **DONE** | pull postgres restore-gate edge; build backend web ops (exit 0) | fixflow/backend:181c4b29a18a916066be054aa957c551e774c4a4 35a12eed7494;fixflow/backend:e6f85c58b8b7133c5d06374ef95a8267800c1e87 27d289d39acd;fixflow/backend:d0378e5a840f31c1fe0133fdbbae540f0c2985f8 ceaf748238f8;fixflow/backend:13b203710dbe140b84b9f0b641d442d0856c0292 9db7af72b869;fixflow/backend:38c8bb06759cfe1dc1bd66c1ee3d568908835e0e aa0ebc840178;fixflow/backend:659c146b5f62db6cb1e0065ef1ff28aa7f |  |
| restore | 4.4 | **DONE** | record the digests | 5 of 5 digest lines; file /var/lib/fixflow/image-digests-20261114T060835Z.txt |  |
| restore | 4.5 (nothing running) | **DONE** | docker ps ports; ss docker-proxy | published=1;proxy=1; | the stand-in host's own sockets are not sshd (a container); the check that matters is no '->' and no docker-proxy |
| restore-1 | 6.1 (nightly form, empty volume) | **DONE** | rm -f restore-signed-off; ffc stop backend; ffc ps | gate-closed; backend rows Up: 0; 6.6's marker and proof: n/a | the curl-through-the-tunnel 503 check is NRH (no tunnel) |
| restore-1 | 6.2 (nightly form, empty volume) | **DONE** | install -d restore; (scp played by cp) | sha256 26ffae5be750c1f1… vs recorded 26ffae5be750c1f1… | recorded sha = dumps.sha256 from prep (P0a's role) |
| restore-1 | 6.3 (nightly form, empty volume) | **DONE** | ffc $P_DB up -d | healthy;fixflow_app\|fixflow_app\|false;17.12 (Debian 17.12-1.pgdg12+1); |  |
| restore-1 | 6.4 (nightly form, empty volume) | **AMBIGUOUS** | alembic heads in a one-off backend | 0047 (head); | CLAUDE.md at the deployed checkout says head 0047; the runbook's text names '0046 (head)'; the dump's head is 0047 |
| restore-1 | 6.6a (nightly form, empty volume) | **DONE** | prove the dump: cp in, sha256, restore list | sha match 1; list exit=0; SCHEMA-public entries 0; TABLE DATA 43 | D=fixflow-db-20261114T060825Z.dump; TOC SCHEMA lines in the original: 1 |
| restore-1 | 6.6b (nightly form, empty volume) | **DONE** | count live tables | count 0: 'pre-restore: empty, no copy' |  |
| restore-1 | 6.7 (nightly form, empty volume) | **DONE** | DROP SCHEMA public CASCADE; CREATE SCHEMA public; pg_restore -L list | count after drop 0; restore exit=0; STOP lines: 0 |  |
| restore-1 | 6.8 (nightly form, empty volume) | **FAILED** | appendix-b.sql; the sequence query | queries exit=0: 1; 47 tables, count lines differing from the source: 2; version 0047 (the dump's head 0047); payments 20\|2777500 (source 20\|2777500); ledger\|chain\|head 26\|27\|27 (source 26\|27\|27); sequences at/above max: yes; cursor whatsapp\|204; geofence: default \| Workshop (PLACEHOLDER — set real coords) \| 0 \| 0 \| 150 \| f | check 6 reads 'a 0046 dump has the whatsapp row at or near max(job_event.seq)': here whatsapp\|204 vs max 307. In the review's form (equals the value recorded for this dump: 204) it passes |
| restore-1 | 6.9 (nightly form, empty volume) | **FAILED** | write restore-signed-off; ffc $P_DB --profile app up -d (exit 0) | gate-log 'signed off' x1; healthy=yes; environment=production dispatcher=False backup=False prefix=backups/db-selfhost/ git_sha=the checkout HEAD e6f85c5 database=ok migrations=head 0047; cursor=whatsapp\|204 max(seq)=307 | RUNBOOK DEFECT (D1): everything else as expected, but the cursor check expects whatsapp\|<max job_event.seq> and reads whatsapp\|204 with max(seq)=307. 0046 seeded the cursor at the head when the migration ran; events kept arriving with the dispatcher off, and nothing between 6.7 and 6.9 moves it (the re-seed is 8.8, at T_close). Production was deployed at 0046 on 2026-08-02 (docs/RUNBOOK-BACKUPS.md:141), so the real dump most likely shows the same. Fix (binding review, finding 1): 6.9 runs 8.8's forward-only re-seed (GREATEST) once the backend is healthy and keeps this check exact. Loosening th |
| restore-1 | 6.10 | **N/A** | case c only | - | the rehearsal is case a; the smoke (P3a) ran its setval |
| restore-1 | 6.11 | **DONE** | roster check (roster t1..t7, t7 never synced); create t7 | missing before: [t7]; create exit 0; missing after: [] | the roster list stands in for P0a item 5 |
| restore-1 | 6.12 | **DONE** | fence update + force-recreate backend | rows: [24.86\|67\|80 ] (exit 0) | typed 24.8600 / 67.0000; Postgres prints them as numbers (24.86\|67\|80), compared numerically |
| restore-1 | 6.13 | **FAILED** | set_pin --report; set_pin --tech <id> --apply (interactive, twice) for: t5 | report after: 1 on a seed PIN; deep health active accounts with default_pin_active: 1 | the interactive prompt was answered through a pty (lib/typist.py) at each prompt; PINs are random stand-ins kept in no file |
| restore-1 | 6.14 | **NRH** | route api. to the backend (5.9) | - | needs the Cloudflare tunnel |
| restore-1 | 4.5 (stack up) | **DONE** | docker ps ports; ss docker-proxy | fixflow-backend-1 [8000/tcp];fixflow-postgres-1 [];fixflow-l4-s3-1 [];published=1;proxy=1; | the stand-in host's own sockets are not sshd (a container); the check that matters is no '->' and no docker-proxy |
| restore-1 | 7.1 | **NRH** | create the dead-man checks | - | the off-box monitoring service; stand-in listener on 127.0.0.1:9999 |
| restore-1 | 7.2 | **AMBIGUOUS** | heartbeat by hand at the container address; then with postgres stopped; then again | healthy: [exit=0 ] pings 0->1; db down: [UNHEALTHY http=000 exit=1]; again: [exit=0 ]; lab probe: deep health with postgres stopped answered 200 after 24.031093s; getaddrinfo(postgres) gaierror after 8.0s | network name fixflow_app confirmed (the VERIFY line); the alarm fired (exit=1, no ping) but the Expected 'http=200' was not seen: with postgres stopped, /api/ops/health did not answer within the heartbeat's curl -m 20, so it printed http=000. The lab probe shows whether this host's offline DNS explains the delay (a real host gets a fast NXDOMAIN). Either way the alarm fires; settle on the real host. If it recurs there, the smallest fix is the Expected text: 'http=000 or http=200 with database not ok' |
| restore-1 | 7.3 | **NRH** | heartbeat through the tunnel | - | needs api.<domain> on the tunnel |
| restore-1 | 7.4 | **FAILED** | install the heartbeat cron file; cronie runs it | -rw-r--r-- 1 root root 357 Nov 14 06:10 /etc/cron.d/fixflow-heartbeat;log empty;; heartbeat pings at the stand-in dead-man service during the 130 s: 0 (at ) | cronie reads /etc/cron.d with the user field as Debian's cron does; the ping URL is the stand-in listener |
| restore-1 | 7.5 | **NRH** | test paging once | - | needs the monitoring service's e-mail |
| restore-1 | 7.6 | **FAILED** | fixflow-backup.sh hourly | receipt: backups/db-hourly/fixflow-db-20261114T061257Z.dump 184010 64 []; exit=0; hourly ping x0 | written to the stand-in bucket through the app's own run_db_backup |
| restore-1 | 7.7 | **DONE** | install the hourly-dump cron; cronie runs it | -rw-r--r-- 1 root root 367 Nov 14 06:14 /etc/cron.d/fixflow-hourly-dump;{"key": "backups/db-hourly/fixflow-db-20261114T061401Z.dump", "size_bytes": 184010, "sha256": "1022978d21ce7c150bda241d92c8a5dc2d15c39b21297;; hourly-dump pings 0 -> 1 | the minute field was moved to the next run and put back (deviations.log); everything else in the line ran under cron as written |
| restore-1 | 7.8 | **MOVED** | ls /etc/cron.d \| grep fixflow |  | runbook moved under: 7.8 (moved.log); nothing was typed for it, so its check proves nothing. one host only here |
| restore-1 | 9.1 | **FAILED** | fixflow-backup.sh manual (the nightly job's call) | key backups/db-selfhost/fixflow-db-20261114T061407Z.dump; pruned [backups/db-selfhost/fixflow-db-20260901T023000Z.dump]; left under db-selfhost/: backups/db-selfhost/fixflow-db-20260915T023000Z.dump backups/db-selfhost/fixflow-db-20261001T023000Z.dump backups/db-selfhost/fixflow-db-20261114T061407Z.dump backups/db-selfhost/sub/fixflow-db-20260101T000000Z.dump ; backups/db/: backups/db/fixflow-db-2 | prune checked against planted 2026-08..10 dumps: 30 days and keep-newest-3 applied; Railway-era backups/db/, a sub-folder and archive/ untouched |
| restore-2 | 6.1 (B5 form, over the live database) | **DONE** | rm -f restore-signed-off; ffc stop backend; ffc ps | gate-closed; backend rows Up: 0; 6.6's marker and proof: n/a | the curl-through-the-tunnel 503 check is NRH (no tunnel) |
| restore-2 | 6.2 (B5 form, over the live database) | **FAILED** | install -d restore; (scp played by cp) | sha256 804cc87882aa403c… vs recorded 0000000000000000… | recorded sha = dumps.sha256 from prep (P0a's role) |
| restore-2 | 6.3 (B5 form, over the live database) | **DONE** | ffc $P_DB up -d | healthy;fixflow_app\|fixflow_app\|false;17.12 (Debian 17.12-1.pgdg12+1); |  |
| restore-2 | 6.4 (B5 form, over the live database) | **AMBIGUOUS** | alembic heads in a one-off backend | 0047 (head); | CLAUDE.md at the deployed checkout says head 0047; the runbook's text names '0046 (head)'; the dump's head is 0047 |
| restore-2 | 6.6a (B5 form, over the live database) | **FAILED** | prove the dump: cp in, sha256, restore list | sha match 0; list exit=0; SCHEMA-public entries 0; TABLE DATA 43 | D=standin-b5-20261114T060825Z.pgdump; TOC SCHEMA lines in the original: 1 |
| restore-2 | 6.6b (B5 form, over the live database) | **DONE** | count 43 live tables; pg_dump; TABLE DATA count; sha256; fixflow-r2-put.sh | dump exit=0; TABLE DATA 43; local sha256 fed8f30d1646a13d7cba01d9d09bbaf69b93afd53e77bf0da2e774b5ff973427; the bucket's copy fed8f30d1646a13d7cba01d9d09bbaf69b93afd53e77bf0da2e774b5ff973427; uploaded key=archive/pre-restore/pre-restore-20261114T061417Z.pgdump size=184053 sha256=fed8f30d1646a13d7cba01d9d09bbaf6 | uploaded to the stand-in bucket; the bucket's copy hashed back through the app's storage client |
| restore-2 | 6.7 (B5 form, over the live database) | **DONE** | DROP SCHEMA public CASCADE; CREATE SCHEMA public; pg_restore -L list | count after drop 0; restore exit=0; STOP lines: 0 |  |
| restore-2 | 6.8 (B5 form, over the live database) | **AMBIGUOUS** | appendix-b.sql; the sequence query | queries exit=0: 1; 47 tables, count lines differing from the source: 0; version 0047 (the dump's head 0047); payments 20\|2777500 (source 20\|2777500); ledger\|chain\|head 26\|27\|27 (source 26\|27\|27); sequences at/above max: yes; cursor whatsapp\|204; geofence: default \| Workshop (PLACEHOLDER — set real coords) \| 0 \| 0 \| 150 \| f | check 6 reads 'a 0046 dump has the whatsapp row at or near max(job_event.seq)': here whatsapp\|204 vs max 307. In the review's form (equals the value recorded for this dump: 204) it passes |
| restore-2 | 6.9 (B5 form, over the live database) | **FAILED** | write restore-signed-off; ffc $P_DB --profile app up -d (exit 0) | gate-log 'signed off' x3; healthy=yes; environment=production dispatcher=False backup=False prefix=backups/db-selfhost/ git_sha=the checkout HEAD e6f85c5 database=ok migrations=head 0047; cursor=whatsapp\|204 max(seq)=307 | RUNBOOK DEFECT (D1): everything else as expected, but the cursor check expects whatsapp\|<max job_event.seq> and reads whatsapp\|204 with max(seq)=307. 0046 seeded the cursor at the head when the migration ran; events kept arriving with the dispatcher off, and nothing between 6.7 and 6.9 moves it (the re-seed is 8.8, at T_close). Production was deployed at 0046 on 2026-08-02 (docs/RUNBOOK-BACKUPS.md:141), so the real dump most likely shows the same. Fix (binding review, finding 1): 6.9 runs 8.8's forward-only re-seed (GREATEST) once the backend is healthy and keeps this check exact. Loosening th |
| drain-window | 8.1 | **DONE** | uncomment two ceilings (W=2640); up -d --force-recreate backend | T_open=2026-11-14T06:14:32Z; facts 2640 / 2640 / 240 | the first block is the lines to write, not commands; backend.env.example carries them as '# KEY=24' lines |
| drain-window | 8.2 | **NRH** | pg_dump predrain; count; sha256; r2-put; then drain_audit --snapshot-fuel; r2-put | snapshot: TABLE DATA 43 (>40 expected); uploaded key=archive/pre-drain/predrain-20261114T061439Z.pgdump size=184148 sha256=3d9d8c22fd62066584469ebe91c; fuel (exit 2): /usr/local/bin/python: No module named scripts.drain_audit fixflow-r2-put: '/var/lib/fixflow/drain/fuel-20261114T061439Z.json' is missing or empty | the snapshot half ran as written and passed; the fuel half needs P2b-2's backend/scripts/drain_audit.py, which is not merged (the runbook marks its arguments VERIFY) |
| drain-window | 8.3 | **NRH** | open the route (6.14) | - | needs the tunnel |
| drain-window | 8.4 | **DONE** | fixflow-backup.sh post-drain | archive/post-drain/fixflow-db-20261114T061443Z.dump [] |  |
| drain-window | 8.5 | **DONE** | manifest export to json; count; r2-put | 1 manifest event(s) uploaded key=archive/manifests/t1-9.json size=269 sha256=3b1624f3bcde9ef74c49869b03714f86beec7b9831fd87dc288531f43cbea19a | a stand-in manifest event |
| drain-window | 8.6 | **FAILED** | three window-audit queries; upload the CSV (typed as written: no T_close exists yet) | exit 1, psql ERROR lines 0; late-sync.csv 0 line(s); /srv/l4/kit/lib/harness.sh: line 155: T_CLOSE: No such file or directory /srv/l4/kit/lib/harness.sh: line 155: T_CLOSE: No such file or directory /srv/l4/kit/lib/harness.sh: line 155: T_CLOSE: No such; upload exit 1: /srv/l4/kit/lib/harness.sh: line 155: T_CLOSE: No such file or directory | RUNBOOK DEFECTS: (N2) the step needs <T_CLOSE> 'as recorded', but T_close is recorded only in 8.7, after it, so it cannot be followed where it stands; typed as written, the placeholder is a shell redirection and the queries never run. (D3) the upload line calls fixflow-r2-put.sh by bare name, which is not on PATH (only ffc is linked into /usr/local/bin; 6.6 b, 8.2, 8.5 spell out /opt/fixflow/ops/selfhost/bin/); the same at the P13e line; not reached in this run: the placeholder's redirection fails first (exit 1); seen as exit 127 in the runs with a filled-in stamp Fixes: 8.6 after 8.7 with 8.7 |
| drain-window | 8.7 | **FAILED** | comment the ceilings out; recreate | facts 2640 / 2640 / 240 |  |
| drain-window | 8.8 | **FAILED** | re-seed the cursor (forward only) | cursor 204 -> 307; equals max(seq): f; compose: 118: FIXFLOW_ENABLE_DISPATCHER: "false" |  |
| drain-window | 9.2 | **DONE** | compose.env FIXFLOW_BACKUP_ENABLED=true; ffc $P_RUN up -d backend | backup_enabled=True; db-backup-nightly→2026-11-15 02:30 PKT; scheduler: 5 job(s): ops-metric-rollup→2026-11-14 11:20 PKT; db-backup-nightly→2026-11-15 02:30 PKT; outcome-auto-link-scan→2026-11-15 03:00 PKT; media-orphan-sweep→2026-11-15 03:30 PKT; payroll-weekly-export→2026-11-15 2 | the deployed checkout (e6f85c5) carries PR #208 (CronTrigger with timezone=): the four cron jobs (payroll-weekly-export, db-backup-nightly, outcome-auto-link-scan, media-orphan-sweep) run in the shop zone; the Check wants PKT |
| drain-window | 4.5 (end) | **DONE** | docker ps ports; ss docker-proxy | fixflow-backend-1 [8000/tcp];fixflow-postgres-1 [];fixflow-l4-s3-1 [];published=1;proxy=1; | the stand-in host's own sockets are not sshd (a container); the check that matters is no '->' and no docker-proxy |

## Not rehearsable here

- **3.2** create the dead-man checks at the monitoring service: needs the off-box monitoring service. Stand-in: a local listener on the stand-in host (127.0.0.1:9999) whose URLs go into heartbeat.env
- **3.9** scp the env files to the laptop, password-manager vault, printed sheet: needs the owner's laptop and vault
- **6.14** route api. to the backend (5.9): needs the Cloudflare tunnel
- **7.1** create the dead-man checks: the off-box monitoring service; stand-in listener on 127.0.0.1:9999
- **7.3** heartbeat through the tunnel: needs api.<domain> on the tunnel
- **7.5** test paging once: needs the monitoring service's e-mail
- **8.2** pg_dump predrain; count; sha256; r2-put; then drain_audit --snapshot-fuel; r2-put: the snapshot half ran as written and passed; the fuel half needs P2b-2's backend/scripts/drain_audit.py, which is not merged (the runbook marks its arguments VERIFY)
- **8.3** open the route (6.14): needs the tunnel

## Lab substitutions (each one, as it happened)

```
lab: ffc runs with FF_EXTRA_COMPOSE=lib/lab-override.yml (stand-in bucket + its CA; no port)
lab: cron is cronie on the (Alpine) stand-in host; it reads /etc/cron.d with the user field, as Debian's cron does
lab: a runbook line carrying a ${NAME:?} guard runs in a subshell (lib/guardwrap.py): the rig's non-interactive bash would exit on it, where the owner's interactive shell drops the rest of that line; what the line assigns is carried back
lab: P_RUN without --profile edge (cloudflared needs a real tunnel); P_ALL unchanged for config/pull/build
lab: P_RUN without --profile edge (cloudflared needs a real tunnel); P_ALL unchanged for config/pull/build
lab: 6.2 scp from the laptop played by cp /srv/l4/dumps/fixflow-db-20261114T060825Z.dump /var/lib/fixflow/restore/
lab probe 7.2: deep health with postgres stopped answered: 200 after 24.031093s; getaddrinfo(postgres) gaierror after 8.0s
lab: from 7.4 on, heartbeat.env's FIXFLOW_HEARTBEAT_HEALTH_URL is the backend's container address (no tunnel), so the cron heartbeat can be healthy
lab: 7.7 the installed cron line's minute 17 moved to 14 for one run, then put back (the Check waits for the next :17)
lab: planted in the stand-in bucket before 9.1: backups/db-selfhost/fixflow-db-20260901T023000Z.dump backups/db-selfhost/fixflow-db-20260915T023000Z.dump backups/db-selfhost/fixflow-db-20261001T023000Z.dump backups/db/fixflow-db-20260701T023000Z.dump archive/pre-selfhost/fixflow-db-20260701T023000Z.dump backups/db-selfhost/sub/fixflow-db-20260101T000000Z.dump
lab: 6.2 scp from the laptop played by cp /srv/l4/dumps/standin-b5-20261114T060825Z.pgdump /var/lib/fixflow/restore/
lab: 8.5 a stand-in drain_manifest app_event for t1 inserted by SQL (no phone here)
```

## Edits made in the owner's editor (values never shown)

```
edited /etc/fixflow/compose.env: FIXFLOW_DOMAIN (value not shown)
edited /etc/fixflow/compose.env: FIXFLOW_CLOUDFLARED_TAG (value not shown)
edited /etc/fixflow/postgres.env: POSTGRES_PASSWORD (value not shown)
edited /etc/fixflow/postgres.env: FIXFLOW_APP_DB_PASSWORD (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_DATABASE_URL (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_JWT_SECRET (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_OPS_PROXY_TOKEN (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_CORS_ORIGINS (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_R2_ACCOUNT_ID (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_R2_ACCESS_KEY_ID (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_R2_SECRET_ACCESS_KEY (value not shown)
edited /etc/fixflow/backend.env: FIXFLOW_R2_BUCKET (value not shown)
edited /etc/fixflow/ops.env: OPS_PASSWORD (value not shown)
edited /etc/fixflow/ops.env: OPS_SESSION_SECRET (value not shown)
edited /etc/fixflow/ops.env: OPS_PROXY_TOKEN (value not shown)
edited /etc/fixflow/ops.env: OPS_HEALTH_TARGETS (value not shown)
edited /etc/fixflow/heartbeat.env: FIXFLOW_HEARTBEAT_HEALTH_URL (value not shown)
edited /etc/fixflow/heartbeat.env: FIXFLOW_HEARTBEAT_PING_URL (value not shown)
edited /etc/fixflow/heartbeat.env: FIXFLOW_HOURLY_DUMP_PING_URL (value not shown)
edited /etc/fixflow/compose.env: FIXFLOW_BACKUP_ENABLED (value not shown)
edited /etc/fixflow/compose.env: FIXFLOW_BACKUP_ENABLED (value not shown)
t5 stand-in PIN set (value in no file)
edited /etc/fixflow/heartbeat.env: FIXFLOW_HEARTBEAT_HEALTH_URL (value not shown)
edited /etc/fixflow/backend.env: uncommented the two ceilings, W=2640
edited /etc/fixflow/compose.env: FIXFLOW_BACKUP_ENABLED (value not shown)
edited /etc/fixflow/compose.env: FIXFLOW_BACKUP_ENABLED (value not shown)
```

## Runbook blocks that moved under a step (nothing typed for them)

```
restore-1	7.8	__RB_MISSING__ 7.8 fence 1: runbook.py: MOVED: the block of step 7.8 that begins 'ls /etc/cron.d/ | grep fixflow' has 2 line(s); pinned 1 
```
