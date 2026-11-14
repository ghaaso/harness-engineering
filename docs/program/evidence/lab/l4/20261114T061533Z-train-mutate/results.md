# L4 — deploy-train rehearsal (origin/main)

Verdicts: DONE 69, FAILED 4, AMBIGUOUS 2, MOVED 1, NRH 8, N/A 4 (of 88 rows; NRH = not rehearsable here; MOVED = the runbook changed shape under the step, nothing typed)

## What was rehearsed

```
rehearsed ref: origin/main = e6f85c58b8b7133c5d06374ef95a8267800c1e87 (the stand-in origin's main; read before bundling, checked in the host)
other refs bundled: refs/tags/drain-pick-tz-fix d7b71d176f96cb0a9bb99bca05e60c318cf47e17 (commit 3810e4209ea4bf8fde7ce500cea0458d3e7ff701);
checkout bundled from: C:/Users/User/Documents/projects/EMS_workshop1/.claude/worktrees/rv201-head
rig: ops/lab/rehearsal at 8c2383e467f062d3028af02c37e7ecd8443804a2 (0 uncommitted file(s) under it)
modes: mutate=1; slot pool: light
started: 2026-11-14T06:16:19Z
```

## Runbook steps

| Phase | Step | Verdict | Run | Check and result | Note |
| --- | --- | --- | --- | --- | --- |
| release-drain | 11.1 | **DONE** | preconditions (the git lines; no line of git status --porcelain) | commit;87bbe88 on main;parents: 1;90ea88d on main;parents: 1;tag;3810e4209ea4bf8fde7ce500cea0458d3e7ff701;parents=81c7a4f fix(jobs): resolve the tech-metrics window in the shop timezone, not UTC;is-ancestor exit=1; | two phase commits checked, not three: P2b-2 is not merged; the tag drain-pick-tz-fix is in the stand-in origin as on GitHub |
| release-drain | 11.1 gh | **NRH** | gh --version; gh auth status | /srv/l4/kit/lib/harness.sh: line 166: gh: command not found; | no gh and no GitHub login on the stand-in, and none may be made (no account, no real remote). Here the lines print 'gh: command not found', which the Check makes a STOP; installing gh and gh auth login are the owner's steps |
| release-drain | 11.2 | **DONE** | git switch -c release/drain a31924a | HEAD a31924a |  |
| release-drain | 11.3 | **DONE** | git cherry-pick -x 87bbe88 | exit 0; [release/drain 4254894] [P1] Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (#187) |  |
| release-drain | 11.3a | **DONE** | git cherry-pick -x drain-pick-tz-fix | exit 0; [release/drain d1bb1bf] fix(jobs): resolve the tech-metrics window in the shop timezone, not UTC; trailer: (cherry picked from commit 3810e4209ea4bf8fde7ce500cea0458d3e7ff701); files as in drain-pick-tz-fix^{commit}: yes (4 files) |  |
| release-drain | 11.4 | **NRH** | git cherry-pick -x <p2b2> | - | P2b-2 is not merged (lane still working); the drain image is not complete until it is |
| release-drain | 11.5 | **DONE** | git cherry-pick -x 90ea88d | exit 0; Auto-merging CLAUDE.md |  |
| release-drain | 11.6 | **DONE** | git log a31924a..release/drain; the -x sources in pick order | 583b9c4 [P3a] Self-host stack: prod compose, hang stub, heartbeat, backup parameters, runbook (#195);d1bb1bf fix(jobs): resolve the tech-metrics window in the shop timezone, not UTC;4254894 [P1] Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (#187);(cherry picked from commit 87bbe88abf3c1b1222edda696ef032678a4dc34e);(cherry picked from commit 3810e4209ea4 | the Check expects four log lines and four source lines; with P2b-2 absent three of each (P1, the fix, P3a) are the right answer. The recovery block is rehearsed in WT7 and WT9 |
| release-drain | 11.7 | **DONE** | diff --name-only vs the commits' files | 94 files changed, 9038 insertions(+), 186 deletions(-); |  |
| release-drain | 11.8-push | **DONE** | git push origin release/drain (the branch alone, to the stand-in origin); SHA=$(git rev-parse release/drain) | SHA=583b9c43095c6bfa773ab4afa8382fd1b7a12231; origin's release/drain 583b9c43095c6bfa773ab4afa8382fd1b7a12231; drain-image* tags on origin: 0 | the push goes to the stand-in origin; on the real remote it would start CI |
| release-drain | 11.8 CI | **NRH** | gh run list --commit "${SHA:?...}"; gh run view <run-id> | - | reads the GitHub Actions run of the pushed sha: needs gh, the owner's login and a push to the real remote (all forbidden here). The SHA guard on that line is exercised in WT8 |
| release-drain | 11.8-worktree | **DONE** | git worktree add --detach ../ff-rdrain-<sha7> "$SHA" | Preparing worktree (detached HEAD 583b9c4);HEAD is now at 583b9c4 [P3a] Self-host stack: prod compose, hang stub, heartbeat, backup parameters, runbook (#195); path /srv/ff-rdrain-583b9c4, HEAD 583b9c43095c6bfa773ab4afa8382fd1b7a12231, detached yes, changes 0 |  |
| release-drain | 11.8 gates | **N/A** | ff-gates.sh backend rdrain ../ff-rdrain-<sha7> | - | not run, by scope rather than by need: the tool (docs/program/lab/ff-gates.sh in the plan checkout) could run on this PC, but the gate run that clears a drain-image tag is the coordinator's, under its gate slots; the stand-in host does not hold the tool. Its VERIFY (argument order, lane names) stays open |
| release-drain | 11.8-remove | **DONE** | git worktree remove ../ff-rdrain-<sha7> | prints []; path gone: yes |  |
| release-drain | 11.9 | **DONE** | git tag -a drain-image ... "${SHA:?...}" | tag;drain-image drain image: P1 87bbe88, fix 3810e42 (C30), P3a 90ea88d cherry-picked onto a31924a; CI run not run here (11.8 CI is NRH); gates not run here (11.8 gates are NRH); 2026-11-14;drain-image = SHA = origin/release/drain; | the message's ' P2b-2 <p2b2>,' was dropped (P2b-2 absent); its CI run and gate summary say 'not run here' |
| release-drain | 11.10 | **DONE** | git push origin drain-image (the tag alone, to the stand-in origin) | 583b9c430 refs/heads/release/drain;6cc1f14dc refs/tags/drain-image;583b9c430 refs/tags/drain-image^{}; |  |
| release-drain | 11.11 | **N/A** | record the cut in W0-results | - | the coordinator's record; this rehearsal's results file holds the log |
| release-drain | 11.12 | **NRH** | release/drain-web: pick P12a, P12; push, CI, gates, tag drain-web-image | - | P12a and P12 are not merged |
| release-drain | 11.13-sync | **DONE** | fetch; switch release/drain; local = origin | release/drain = origin/release/drain |  |
| release-drain | 11.13-pick | **DONE** | git cherry-pick -x <fix-sha> (the stand-in fix) | exit 0; [release/drain 2850426] fix(lab): stand-in window fix for the L4 re-cut rehearsal |  |
| release-drain | 11.13-6 | **DONE** | 11.6 again | 2850426 fix(lab): stand-in window fix for the L4 re-cut rehearsal;583b9c4 [P3a] Self-host stack: prod compose, hang stub, heartbeat, backup parameters, runbook (#195);d1bb1bf fix(jobs): resolve the tech-metrics window in the shop timezone, not UTC;4254894 [P1] Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (#187);(cherry picked from commit 87bbe88abf3c1b1 | three commits and the fix (P2b-2 absent); the trailer list is 11.6's lines followed by the fix's full sha |
| release-drain | 11.13-7 | **DONE** | 11.7 again with the fix | 95 files changed, 9039 insertions(+), 186 deletions(-); |  |
| release-drain | 11.13-push | **DONE** | 11.8's push (a fast-forward) and SHA again | SHA 583b9c43095c6bfa773ab4afa8382fd1b7a12231 -> 28504269ad6e99bcb10874fd11b1358ae9926c1d; origin's release/drain 28504269ad6e99bcb10874fd11b1358ae9926c1d; 583b9c4..2850426 release/drain -> release/drain |  |
| release-drain | 11.13 CI | **NRH** | 11.8's gh run list/view for the new SHA | - | as 11.8 CI: needs gh, the owner's login and a push to the real remote |
| release-drain | 11.13 gates | **N/A** | 11.8's ff-gates.sh for the new SHA | - | as 11.8 gates: the coordinator's gate run |
| release-drain | 11.13-worktree | **DONE** | 11.8's worktree for the new sha, then removed | path /srv/ff-rdrain-2850426 at 28504269ad6e99bcb10874fd11b1358ae9926c1d, detached yes; remove printed []; removed: yes |  |
| release-drain | 11.13 | **FAILED** | git tag -a drain-image-2 ... "$SHA"; git push origin drain-image-2 | drain-image-2 -> 2850426; origin's peeled ; drain-image still 583b9c4 | the deploy below still uses drain-image (the re-cut is rehearsed, not deployed) |
| selftest | shape guard | **DONE** | lib/selftest-runbook.py on the runbook under rehearsal and the committed pins | 16 ok, 0 FAIL | selftest-runbook.txt |
| train-host | 1.11 | **DONE** | git clone of the stand-in origin; checkout drain-image | rev-parse = 583b9c43095c6bfa773ab4afa8382fd1b7a12231, status empty, ffc executable | repo-url is the stand-in origin /srv/origin.git (the VERIFY on a deploy key does not apply) |
| train-host | 1.12 | **DONE** | ln -sfn ffc | readlink + executable: /opt/fixflow/ops/selfhost/bin/ffc executable |  |
| train-host | 1.13 | **DONE** | install -d | 700 root:root /etc/fixflow;700 root:root /var/lib/fixflow;700 root:root /var/lib/fixflow/drain;755 root:root /var/log/fixflow; |  |
| train-host | 1.14 | **DONE** | install the logrotate file; logrotate -d | rotating pattern: /var/log/fixflow/*.log weekly (8 rotations);considering log /var/log/fixflow/*.log; log /var/log/fixflow/*.log does not exist -- skipping;exit=0; | logrotate 3.x of the stand-in host (Alpine), the same configuration syntax as Debian's |
| train-host | 3.1 | **DONE** | install -m 0600 the five templates | ls -l: 5 of 5 files -rw------- root root |  |
| train-host | 3.2 | **NRH** | create the dead-man checks at the monitoring service | - | needs the off-box monitoring service. Stand-in: a local listener on the stand-in host (127.0.0.1:9999) whose URLs go into heartbeat.env |
| train-host | 3.3 | **DONE** | the six openssl lines of the block, one at a time | lengths: 64 64 64 48 48 24 ; distinct: 6 | the Check names the first five lengths (64,64,64,48,48); the sixth (base64 18) is 24 |
| train-host | 3.4 | **DONE** | edit compose.env (domain, cloudflared tag) | FIXFLOW_DOMAIN=l4lab.example.invalid;FIXFLOW_CLOUDFLARED_TAG=2025.11.1;FIXFLOW_BACKUP_ENABLED=false; | cloudflared tag 2025.11.1 (the smoke's); the VERIFY on picking a dated tag was not exercised |
| train-host | 3.5 | **DONE** | edit postgres.env | POSTGRES_PASSWORD 48;FIXFLOW_APP_DB_PASSWORD 48; |  |
| train-host | 3.6 | **DONE** | edit backend.env (URL, JWT, ops token, CORS, four stand-in R2 values) | FIXFLOW_JWT_SECRET 64;FIXFLOW_OPS_PROXY_TOKEN 64;db password matches;0;restore gate: backend.env OK (no forced key in another spelling, every key a plain name); | R2 values are stand-ins: account l4lab, bucket l4-bucket (the stand-in bucket on the stand-in host) |
| train-host | 3.7 | **DONE** | edit ops.env and heartbeat.env | ops token matches;FIXFLOW_HEARTBEAT_HEALTH_URL=https://api.l4lab.example.invalid/api/ops/health; | ping URLs point at the stand-in dead-man listener |
| train-host | 3.8 | **DONE** | chown/chmod | stat: 5 of 5 '600 root:root'; files with a REPLACE count above 0: 0 (/etc/fixflow/backend.env:0 /etc/fixflow/compose.env:0 /etc/fixflow/heartbeat.env:0 /etc/fixflow/ops.env:0 /etc/fixflow/postgres.env:0 ) |  |
| train-host | 3.9 | **NRH** | scp the env files to the laptop, password-manager vault, printed sheet | host half of the check ran: 5 fingerprints of 12 characters | needs the owner's laptop and vault |
| train-host | 4.1 | **DONE** | ffc $P_ALL config -q | exit=0; |  |
| train-host | 4.2 | **DONE** | config \| grep overrides; ports count | FIXFLOW_BACKUP_ENABLED: "false"; FIXFLOW_BACKUP_PREFIX: backups/db-selfhost/; FIXFLOW_CORS_ORIGINS: '["https://app.l4lab.example.invalid"]'; FIXFLOW_ENABLE_DISPATCHER: "false"; FIXFLOW_ENVIRONMENT: production;0; | the CORS line: 1 rendered (the VERIFY on env_file inlining is answered: compose v2.33 inlines it) |
| train-host | 4.3 | **DONE** | pull postgres restore-gate edge; build backend web ops (exit 0) | fixflow/backend:181c4b29a18a916066be054aa957c551e774c4a4 35a12eed7494;fixflow/backend:e6f85c58b8b7133c5d06374ef95a8267800c1e87 27d289d39acd;fixflow/backend:659c146b5f62db6cb1e0065ef1ff28aa7fd50242 a0e30d49a2b7;fixflow/backend:6c5dff826ca73f4c5283cfa5f81c6991e648a981 5b4dfbc68cc5;fixflow/backend:718d7120ba4d06f8a02fa3bd765c6634ad765f49 ca8016ef3c9f;fixflow/backend:38c8bb06759cfe1dc1bd66c1ee3d568908 |  |
| train-host | 4.4 | **DONE** | record the digests | 5 of 5 digest lines; file /var/lib/fixflow/image-digests-20261114T061646Z.txt |  |
| train-host | 4.5 (nothing running) | **DONE** | docker ps ports; ss docker-proxy | published=1;proxy=1; | the stand-in host's own sockets are not sshd (a container); the check that matters is no '->' and no docker-proxy |
| train-restore | 6.1 (drain-image, nightly form) | **DONE** | rm -f restore-signed-off; ffc stop backend; ffc ps | gate-closed; backend rows Up: 0; 6.6's marker and proof: n/a | the curl-through-the-tunnel 503 check is NRH (no tunnel) |
| train-restore | 6.2 (drain-image, nightly form) | **DONE** | install -d restore; (scp played by cp) | sha256 f62b189069382bf6… vs recorded f62b189069382bf6… | recorded sha = dumps.sha256 from prep (P0a's role) |
| train-restore | 6.3 (drain-image, nightly form) | **DONE** | ffc $P_DB up -d | healthy;fixflow_app\|fixflow_app\|false;17.12 (Debian 17.12-1.pgdg12+1); |  |
| train-restore | 6.4 (drain-image, nightly form) | **DONE** | alembic heads in a one-off backend | 0046 (head); | CLAUDE.md at the deployed checkout says head 0046; the runbook's text names '0046 (head)'; the dump's head is 0046 |
| train-restore | 6.6a (drain-image, nightly form) | **DONE** | prove the dump: cp in, sha256, restore list | sha match 1; list exit=0; SCHEMA-public entries 0; TABLE DATA 43 | D=fixflow-db-20261114T061636Z.dump; TOC SCHEMA lines in the original: 1 |
| train-restore | 6.6b (drain-image, nightly form) | **DONE** | count live tables | count 0: 'pre-restore: empty, no copy' |  |
| train-restore | 6.7 (drain-image, nightly form) | **DONE** | DROP SCHEMA public CASCADE; CREATE SCHEMA public; pg_restore -L list | count after drop 0; restore exit=0; STOP lines: 0 |  |
| train-restore | 6.8 (drain-image, nightly form) | **AMBIGUOUS** | appendix-b.sql; the sequence query | queries exit=0: 1; 47 tables, count lines differing from the source: 0; version 0046 (the dump's head 0046); payments 20\|2777500 (source 20\|2777500); ledger\|chain\|head 26\|27\|27 (source 26\|27\|27); sequences at/above max: yes; cursor whatsapp\|204; geofence: default \| Workshop (PLACEHOLDER — set real coords) \| 0 \| 0 \| 150 \| f | check 6 reads 'a 0046 dump has the whatsapp row at or near max(job_event.seq)': here whatsapp\|204 vs max 307. In the review's form (equals the value recorded for this dump: 204) it passes |
| train-restore | 6.9 (drain-image, nightly form) | **FAILED** | write restore-signed-off; ffc $P_DB --profile app up -d (exit 0) | gate-log 'signed off' x1; healthy=yes; environment=production dispatcher=False backup=False prefix=backups/db-selfhost/ git_sha=the checkout HEAD 583b9c4 database=ok migrations=head 0046; cursor=whatsapp\|204 max(seq)=307 | RUNBOOK DEFECT (D1): everything else as expected, but the cursor check expects whatsapp\|<max job_event.seq> and reads whatsapp\|204 with max(seq)=307. 0046 seeded the cursor at the head when the migration ran; events kept arriving with the dispatcher off, and nothing between 6.7 and 6.9 moves it (the re-seed is 8.8, at T_close). Production was deployed at 0046 on 2026-08-02 (docs/RUNBOOK-BACKUPS.md:141), so the real dump most likely shows the same. Fix (binding review, finding 1): 6.9 runs 8.8's forward-only re-seed (GREATEST) once the backend is healthy and keeps this check exact. Loosening th |
| train-restore | 6.10 | **N/A** | case c only | - | the rehearsal is case a; the smoke (P3a) ran its setval |
| train-restore | 6.11 | **DONE** | roster check (roster t1..t7, t7 never synced); create t7 | missing before: [t7]; create exit 0; missing after: [] | the roster list stands in for P0a item 5 |
| train-restore | 6.12 | **DONE** | fence update + force-recreate backend | rows: [24.86\|67\|80 ] (exit 0) | typed 24.8600 / 67.0000; Postgres prints them as numbers (24.86\|67\|80), compared numerically |
| train-restore | 6.13 | **DONE** | set_pin --report; set_pin --tech <id> --apply (interactive, twice) for: t4 t5 | report after: 0 on a seed PIN; deep health active accounts with default_pin_active: 0 | the interactive prompt was answered through a pty (lib/typist.py) at each prompt; PINs are random stand-ins kept in no file |
| train-restore | 6.14 | **NRH** | route api. to the backend (5.9) | - | needs the Cloudflare tunnel |
| train | 11.14 | **MOVED** | describe --tags --exact-match HEAD |  | runbook moved under: 11.14 (moved.log); nothing was typed for it, so its check proves nothing. |
| train | 12.4a | **DONE** | fetch origin --tags; rev-parse origin/main | TARGET=e6f85c58b8b7133c5d06374ef95a8267800c1e87 |  |
| train | R5.1 | **DONE** | status --porcelain | [] |  |
| train | R5.2 | **DONE** | fetch; rev-parse '<target>^{commit}' (after T_close: a main sha) | origin/HEAD -> origin/main origin/l4-next origin/main | T_close is assumed recorded (the train runs after it); before T_close the target could only be a drain-image tag |
| train | R5.3 | **DONE** | PREV sha, PREV image, DB head, manual backup | PREV=583b9c43095c6bfa773ab4afa8382fd1b7a12231 image=sha256:e221ae07f814 head=0046; {"key": "backups/db-selfhost/fixflow-db-20261114T061746Z.dump", "size_bytes": 183009, "sha256": "e57 |  |
| train | R5.4 | **DONE** | checkout --detach TARGET | HEAD e6f85c5 |  |
| train | R5.5 | **FAILED** | ffc $P_RUN build backend web | exit 0; | built offline from the build cache (the same build ran online in the prebuild step); the tags were removed first |
| train | R5.6 | **DONE** | ffc $P_RUN up -d (start.sh migrates, then serves) | healthy=yes; TARGET head 0047, database head before 0046; 'Running upgrade 0046 -> ' seen: yes; alembic lines 4; startup complete 1; Running upgrade 0046 -> 0047 |  |
| train | R5.7 | **DONE** | deep health git_sha and database | want=e6f85c58b8b7133c5d06374ef95a8267800c1e87 git_sha= e6f85c58b8b7133c5d06374ef95a8267800c1e87 [{'name': 'database', 'status': 'ok', 'latency_ms': 1.69, 'detail': None}] | the curl through api.<domain> half is NRH (no tunnel) |
| train | R5.8 | **DONE** | record the image id | image sha256:27d289d39acd; was sha256:e221ae07f814 |  |
| train | 12.4 | **FAILED** | select version_num from alembic_version | 0046; CLAUDE.md at TARGET says head 0047; the database was at 0046 before (R5.3) |  |
| train | 12.6 | **AMBIGUOUS** | web built from main in R5.5 and started in R5.6 | web image sha256:2d3ed1313a7c | the board 'shows sampler_state' is a page in a browser; the same fields were read from the API in the P6a row. 12.6's 'ffc $P_RUN build web' is the build R5.5 already did |
| rollback | R5.9.1 | **DONE** | previous head from CLAUDE.md at PREV; DB head | PREV head 0046; DB head 0047 | the VERIFY on 'head = **NNNN**' existing at the previous sha: present |
| rollback | R5.9.2 | **DONE** | the heads were read and ordered: the database's is above the previous version's, so R5.9 says STOP (no command is typed) | 0047 > 0046; still serving git_sha e6f85c5 (TARGET e6f85c5), database ok, checkout at e6f85c5 | the refusal branch: an image below the database's head is never started, and alembic downgrade is never run |
| train-migration | 12.4a (migration row) | **DONE** | fetch origin --tags; rev-parse origin/main | TARGET=75b02c715d580423204dc1f1f5133f7edc32d09c |  |
| train-migration | R5.1 (migration row) | **DONE** | status --porcelain | [] |  |
| train-migration | R5.2 (migration row) | **DONE** | fetch; rev-parse '<target>^{commit}' (after T_close: a main sha) | origin/HEAD -> origin/main origin/l4-next origin/main | T_close is assumed recorded (the train runs after it); before T_close the target could only be a drain-image tag |
| train-migration | R5.3 (migration row) | **DONE** | PREV sha, PREV image, DB head, manual backup | PREV=e6f85c58b8b7133c5d06374ef95a8267800c1e87 image=sha256:27d289d39acd head=0047; {"key": "backups/db-selfhost/fixflow-db-20261114T061803Z.dump", "size_bytes": 184809, "sha256": "db2 |  |
| train-migration | R5.4 (migration row) | **DONE** | checkout --detach TARGET | HEAD 75b02c7 |  |
| train-migration | R5.5 (migration row) | **DONE** | ffc $P_RUN build backend web | exit 0; fixflow/backend:75b02c715d580423204dc1f1f5133f7edc32d09c | built offline from the build cache (the same build ran online in the prebuild step); the tags were removed first |
| train-migration | R5.6 (migration row) | **DONE** | ffc $P_RUN up -d (start.sh migrates, then serves) | healthy=yes; TARGET head 0048, database head before 0047; 'Running upgrade 0047 -> ' seen: yes; alembic lines 4; startup complete 1; Running upgrade 0047 -> 0048 |  |
| train-migration | R5.7 (migration row) | **DONE** | deep health git_sha and database | want=75b02c715d580423204dc1f1f5133f7edc32d09c git_sha= 75b02c715d580423204dc1f1f5133f7edc32d09c [{'name': 'database', 'status': 'ok', 'latency_ms': 1.65, 'detail': None}] | the curl through api.<domain> half is NRH (no tunnel) |
| train-migration | R5.8 (migration row) | **DONE** | record the image id | image sha256:8b44823f3b15; was sha256:27d289d39acd |  |
| train-migration | 12.4 (migration row) | **DONE** | select version_num from alembic_version | 0048; CLAUDE.md at TARGET says head 0048; the database was at 0047 before (R5.3) |  |
| train-migration | 12.4b (migration row) | **DONE** | start.sh applied the stand-in row's migration 0048 on boot | job rows written by the migration \| job rows: 48\|48 | the migration ran against the restored, populated database (plan 7.5: run start.sh's migrations to the new head) |
| rollback-migration | R5.9.1 (migration row) | **DONE** | previous head from CLAUDE.md at PREV; DB head | PREV head 0047; DB head 0048 | the VERIFY on 'head = **NNNN**' existing at the previous sha: present |
| rollback-migration | R5.9.2 (migration row) | **DONE** | the heads were read and ordered: the database's is above the previous version's, so R5.9 says STOP (no command is typed) | 0048 > 0047; still serving git_sha 75b02c7 (TARGET 75b02c7), database ok, checkout at 75b02c7 | the refusal branch: an image below the database's head is never started, and alembic downgrade is never run |
| rollback-migration | 4.5 (after the train) | **DONE** | docker ps ports; ss docker-proxy | fixflow-backend-1 [8000/tcp];fixflow-web-1 [80/tcp, 443/tcp, 2019/tcp, 443/udp];fixflow-postgres-1 [];fixflow-l4-s3-1 [];published=1;proxy=1; | the stand-in host's own sockets are not sshd (a container); the check that matters is no '->' and no docker-proxy |

## Wrong turns

| Id | Wrong turn | What happened | What stopped it | Scripted guard needed? |
| --- | --- | --- | --- | --- |
| WT8 | SHA left empty in a new terminal: each line of 11.8 and 11.9 that uses SHA pasted into a fresh interactive shell | 6 lines; 6 printed 'bash: SHA: not set - run the SHA= line of 11.8'; afterwards drain-image tags: 0, ff-rdrain worktrees: 0 (log wt8.log) | the ${SHA:?} guard on every line: nothing that writes ran, no tag and no worktree were made (11.9's last line runs its $(git rev-parse 'drain-image^{commit}') before the guard: a read-only 'fatal:' line, see wt8.log) | no: already scripted (C34) |
| WT11 | 11.12's tag line run with SHA still holding 11.8's value (release/drain's commit) | printed: STOP: SHA is release/drain's commit ; drain-web-image tags afterwards: 0 | the tag line's own test: STOP, no tag | no: already scripted |
| WT9 | 11.6's recovery (reset) block pasted while another branch (main) is checked out | printed: main;567d542230c60997176404e91b2e9d3c718ff6ab;count=1;STOP: not on release/drain;e6f85c5 [P8a] follow-up: raw captured_at never refuses a payment; the site test is a tripwire with its blind spots listed (C44, C49) (#210);16e154e [P8a] Money integrity 1: void attribution, payment payloads, captured_at, recorded_by FK (#202);b4b19af [P1] follow-up: scheduled cron jobs run in the shop timezone (#208); main and release/drain unchanged | the block's branch-name test: STOP: not on release/drain, nothing reset | no: already scripted (C34) |
| WT7 | 11.3a picks main's squash f192fee (PR #204) instead of the tag drain-pick-tz-fix (3810e42) | the pick: exit 0, no conflict, the same four files as the tag. 11.6 log: 99dce6f [P3a] Self-host stack: prod compose, hang stub, heartbeat, backup parameters, runbook (#195);ad1b820 [P7a] follow-up: tech-metrics window in the shop timezone, not UTC (four tests fail 19:00-24:00 UTC) (#204);567d542 [P1] Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (#187); 11.6 sources: 87bbe88 f192fee 90ea88d . 11.7: 94 files changed, 9038 insertions(+), 186 deletions(-);. A count of trailers (the pre-#206 Check) would read 3 and pass. Recovery as written: count=1;HEAD is now at 567d542 [P1] Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (#187); then 11.3a, 11.5 and 11.6 again: sources as expected | 11.6 as merged at 53c6046 (C32/C34): its source list names f192fee97d… where the Check wants 3810e420…, so the text says STOP; its reset block (computed P1 pick, branch-guarded) recovered the branch: yes. 11.7 is silent (no file outside the commits). The subject differs too, but only an operator comparing it notices | no new guard: 11.6's source list is the guard, a comparison the operator reads, not a test that stops; the smallest scripted form is diff <(git log --reverse … \| grep 'cherry picked from') <(expected lines) \|\| echo STOP |
| WT10 | 11.13 started in a clone made before the last cut was pushed (its release/drain is behind origin's) | printed: STOP: local release/drain is not origin's; local release/drain 583b9c4, origin/release/drain 2850426. The text's remedy, a fresh clone, prints: release/drain = origin/release/drain | 11.13's equality test: STOP before any pick; a fresh clone passes it | no: already scripted (C34). It prints a STOP line but exits 0: a pasted block keeps going only if the operator ignores it |

## Deploy-train rows

| Row | Check as written | Result | Evidence |
| --- | --- | --- | --- |
| P6a | sampler_state, last_ping_at, pings_today on the board; clocked in without a recent ping is stale/silent; day view effective time; shift before midnight on duty; two retired keys ignored and absent from the template | PASS | fixture: {"result": "PASS", "items": [["t1 clock_in 30 min ago", true, 201], ["t1 ping 1 min ago", true, "201 {'accepted': 1, 'deduped': 0, 'rejected': 0, 'ping_interval_minutes': 5}"], ["t2 clock_in at 2026-11-13T23:00:00+05:00 (before shop midnight)", true, "201 "]], "midnight_staged": true, "local_time": \| check: {"result": "PASS", "items": [["board rows carry sampler_state, last_ping_at, pings_today", true, "200, 3 rows"], ["t1 (fresh ping) is healthy", true, "t1 sampler_state=ok pings_today=1 last_ping_at=2026-11-14T06:16:58.264691Z"], ["clocked in, no recent ping: stale or silent, never healthy", true, "t2 sampler_state=silent"], ["a shift begun before midnight shows on duty with its start time", true, "t2 on_duty_since=2026-11-13T18:00:00Z (clocked in 2026-11-13T23:00:00+05:00) status=absent"], ["the technician day view renders the effective time", true, "200, effective_time prese |
| P7a | (1) tech GET another tech's job 403; (2) payment on a closed job by its tech 409 '(current status: closed)', by a manager with no reason refused (R12); (3) tech note on an unclaimed job 201 + assigned + one claim event; (4) GET /api/jobs/99999999999/media not 500 | FAIL | {"result": "FAIL", "items": [["(1) tech token on another tech's job: 403", true, "403 {'detail': 'job 696516f2-8b85-4c4a-9a6d-73d9adcef5d7 is assigned to another technician'}"], ["(2) payment on a closed job by its technician: 409 ending (current status: closed)", false, "403 job 650d0743-80d9-5150-b32a-3b1935ad67bd is not assigned to t1"], ["(2b) the same by a manager, no reason: refused (409 before R12, 422 'needs a reason' after)", false, "200 None (neither)"], ["(3) tech note on an unclaimed job: 201, then assigned to that tech", true, "fixture: manager intake 201, assigned_tech_id=None; note 201; job now assigned_tech_id=t1"], ["(4) GET /api/jobs/99999999999/media is not a 500", true, "200 {'before': [], 'after': [], 'closing': [], 'condition': []}"]], "unclaimed": "104c93a1-969a-4811-84bf-68024364dea8"} \| claim events by t1 on that job: 1 |
| f192fee (#204) | GET /api/jobs/reports/tech-metrics as a manager with no dates: the window ends on the shop-local today (no migration), with the stand-in shop's zone set to Pacific/Pago_Pago for this check so the local and UTC dates differ at 06:18 UTC. In the drain tree the same fix is the original 3810e42 (11.3a, | PASS | {"result": "PASS", "items": [["(1) 200 with a manager token and no dates", true, "200 timezone=Pacific/Pago_Pago"], ["(1b) the report resolved the shop's zone Pacific/Pago_Pago", true, "timezone=Pacific/Pago_Pago"], ["(2) to_date is the shop-local today", true, "to_date=2026-11-13 shop-local today=2026-11-13"], ["(3) from_date is six days before it", true, "from_date=2026-11-07"], ["(4) the window does not end on the UTC date", true, "UTC date 2026-11-14"]]} |
| P3a first boot | deep health environment=production, git_sha = deployed commit, backup_prefix=backups/db-selfhost/, enable_dispatcher=false, database ok; docker ps shows no '->' | PASS | environment=production git_sha=e6f85c58b8b7133c5d06374ef95a8267800c1e87 backup_prefix=backups/db-selfhost/ enable_dispatcher=False database=ok; '->' lines: 0 (read after the train deploy; the same facts after 6.9 on drain-image are in the step table) |

## Not rehearsable here

- **11.1 gh** gh --version; gh auth status: no gh and no GitHub login on the stand-in, and none may be made (no account, no real remote). Here the lines print 'gh: command not found', which the Check makes a STOP; installing gh and gh auth login are the owner's steps
- **11.4** git cherry-pick -x <p2b2>: P2b-2 is not merged (lane still working); the drain image is not complete until it is
- **11.8 CI** gh run list --commit "${SHA:?...}"; gh run view <run-id>: reads the GitHub Actions run of the pushed sha: needs gh, the owner's login and a push to the real remote (all forbidden here). The SHA guard on that line is exercised in WT8
- **11.12** release/drain-web: pick P12a, P12; push, CI, gates, tag drain-web-image: P12a and P12 are not merged
- **11.13 CI** 11.8's gh run list/view for the new SHA: as 11.8 CI: needs gh, the owner's login and a push to the real remote
- **3.2** create the dead-man checks at the monitoring service: needs the off-box monitoring service. Stand-in: a local listener on the stand-in host (127.0.0.1:9999) whose URLs go into heartbeat.env
- **3.9** scp the env files to the laptop, password-manager vault, printed sheet: needs the owner's laptop and vault
- **6.14** route api. to the backend (5.9): needs the Cloudflare tunnel

## Lab substitutions (each one, as it happened)

```
lab: section 11 with P2b-2 absent (not merged): every '<p2b2>' is dropped from the commit lists, 11.4 is not run, and 11.6/11.11/11.13 count three commits, not four
lab: no gh and no GitHub here: 11.1's gh lines, 11.8's CI read and 11.8's gates (ff-gates.sh, the plan checkout's tool) are NRH; the tag messages say 'not run here' where the run id and the gate summary go
lab: a runbook line carrying a ${NAME:?} guard runs in a subshell (lib/guardwrap.py): the rig's non-interactive bash would exit on it, where the owner's interactive shell drops the rest of that line; what the line assigns is carried back
lab 11.13: the window fix is a stand-in commit (one new file, ops/lab/L4-STANDIN-WINDOW-FIX.txt) on top of main, not pushed to the stand-in origin's main
lab: ffc runs with FF_EXTRA_COMPOSE=lib/lab-override.yml (stand-in bucket + its CA; no port)
lab: cron is cronie on the (Alpine) stand-in host; it reads /etc/cron.d with the user field, as Debian's cron does
lab: a runbook line carrying a ${NAME:?} guard runs in a subshell (lib/guardwrap.py): the rig's non-interactive bash would exit on it, where the owner's interactive shell drops the rest of that line; what the line assigns is carried back
lab: P_RUN without --profile edge (cloudflared needs a real tunnel); P_ALL unchanged for config/pull/build
lab: stand-in train row with a migration: commit 75b02c7 on the stand-in origin's l4-next adds 0048 after 0047 (writes job.l4_standin_mark on every row) and sets CLAUDE.md's head to 0048
lab: P_RUN without --profile edge (cloudflared needs a real tunnel); P_ALL unchanged for config/pull/build
lab: 6.2 scp from the laptop played by cp /srv/l4/dumps/fixflow-db-20261114T061636Z.dump /var/lib/fixflow/restore/
lab: stand-in PINs set for m1, t1, t2 by set_pin --pin-stdin (values in no file)
lab: R5.5 the prebuild's fixflow/backend and fixflow/web tags at e6f85c58b8b7133c5d06374ef95a8267800c1e87 were removed before the build (kept as l4-keep/*), so R5.5's check sees only its own build
lab f192fee: the stand-in shop's timezone was Asia/Karachi; set to Pacific/Pago_Pago (UTC-11, no DST) for the tech-metrics check alone at 06:18 UTC, so the shop-local date differs from the UTC date; put back right after
lab: the stand-in row 75b02c7 (migration 0048) landed on the stand-in origin's main after the first R5.9 (a fast-forward)
lab: R5.5 (migration row) the prebuild's fixflow/backend and fixflow/web tags at 75b02c715d580423204dc1f1f5133f7edc32d09c were removed before the build (kept as l4-keep/*), so R5.5's check sees only its own build
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
t4 stand-in PIN set (value in no file)
t5 stand-in PIN set (value in no file)
edited /etc/fixflow/backend.env: added the two keys P6a retired (leftover values)
```

## Runbook blocks that moved under a step (nothing typed for them)

```
train	11.14	__RB_MISSING__ 11.14 fence 1: runbook.py: MOVED: the block of step 11.14 that begins 'git -C /opt/fixflow describe --tags --exact-match HEAD' has 2 line(s); pinned 1 
```
