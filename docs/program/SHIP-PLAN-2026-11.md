# FixFlow ship plan — phases sized to one session each (v9, 2026-11-13: v8 + §7 parallel lanes)

**Status: v9 — v8 plus the parallel-execution amendment (§7); P0a is still owed.** v1 was critiqued by five Opus lenses (138
findings, `SHIP-PLAN-2026-11-critique.md`); v2 reflected them and was verified by eight lenses
(141, `SHIP-PLAN-2026-11-critique-2.md`); v3 by four lenses (52, `SHIP-PLAN-2026-11-critique-3.md`);
v4 by a three-lens delta check (47, `SHIP-PLAN-2026-11-critique-4.md`); v5 by the harness and
architecture review (`HARNESS-REVIEW-2026-11-01.md`: four Opus architects, two judges, 45 claims
each attacked by two refuters; rulings **HR-…**, §6.6); v6 by a three-lens delta check of that
review (`SHIP-PLAN-2026-11-critique-5.md`: 1 blocker, 20 major, folded in); v7 by a one-critic
final check of that fold-in (critique-5 part 2: 10 major, 12 minor, folded in). §6 records every
adjudication and the rulings. Earlier versions are in git history (762a63f, 79b94c7, 9748453,
46c5d98, 7a6dbfa v5, 3fb8f9c v6, 4e01c82 v7, 3415b5e v8). Still awaiting: the owner's P0a answers (§4). **v9 adds §7 only** (lanes,
build-ahead, the lab; line numbers above §7 are unchanged from v8): the code lanes no longer wait for **P0a**; every phone and host step still does.

Built on `G2-deep-dive-gate-2026-11-01.md` (the verified register and decisions G2-D1..D3),
`G1-discovery-gate-2026-11-01.md`, the method in `docs/ORCHESTRATION-DESIGN-2026-10.md`, and
the W2 design notes in this repository under `docs/program/w2/`: `O-01` phones, `O-03` offline
engine, `O-04` attendance truth, `O-05` external attacker, `O-06` operator/insider and money
evidence, `O-07` accounting slice, `O-08` self-host, `O-10` fleet drain. Every phase cites them by
path, so a fresh session resumes from the repository alone. Register ids (`O01-F04`, `O3-F2`,
`O10-F3`, …) are G2 §2 rows. **"R" labels are always prefixed:** "O-10 R7" is a rollback rule
from the drain design, "runbook R5" is a RUNBOOK-SELFHOST operation, "ruling R5" is §6.5.

## 0. How to read and run this plan

- **Sessions.** One phase per session. A phase marked **(×n)** is *repeatable*: one session per
  unit (a workshop visit, an OEM, a late phone), each filling rows of a table that already
  exists; the phase is complete when its table is. **Several phase sessions run at once, one
  lane each (§7, v9):** every lane has its own worktree and its own gate stack
  (`docs/program/lab/ff-gates.sh <kind> <lane> <worktree>`); §7 wins where it and §0 differ.
- **Resume.** A code phase opens a **draft PR at its first commit** whose body is its Scope as a
  checkbox list, ticked as items land; resume = `gh pr view <branch>`, first unticked box. An
  operations phase's **first act commits its numbered step table** (copied from its Scope) to
  `docs/program/W0-results.md`, ticked as executed; resume = first unticked row; an operations
  phase puts the same `Plan @ <sha>` line and journal (below) at the head of that table. Builds
  in flight resume from `eas build:list`. The draft PR body's **first line is `Plan @ <sha>`** (the commit
  of this file and the cited design note at phase start); on resume run
  `git diff --stat <sha>..origin/main -- docs/program/` and re-read any changed section before
  ticking the next box. Under the checklist the body keeps a short **"Decisions / ruled out /
  owner corrections (this phase)"** journal, appended the moment one occurs (`gh pr edit
  --body-file`), so mid-phase state survives a context compaction (HR-C2); at phase close each
  entry is moved to its owner (a W0-results decision row or a plan amendment) and the journal
  says where it went. A phase's closing
  message answers six questions in a few lines: goal, where it fits, why this choice,
  before/after, what evidence ran (incl. skipped counts), what remains; it then refreshes
  `OWNER-VIEW.md`.
- **Routing (design doc §3).** Opus owns anything touching the outbox contract, drain tooling
  and its matching rules, the job lifecycle, ledger/chain and all posting/money code, auth, PIN,
  JWT, migrations, native patches, and the location-privacy time bounds. Sonnet implements
  well-specified screens, read models, infra files, docs and tests from a design's test list.
  Haiku extracts. Every PR gets an Opus reviewer with a refute-by-default brief naming the
  register ids it must try to break; the verdict names the **PR head SHA it read**, and a push
  after review needs a re-read of the diff since that SHA before merge. For each register id
  fixed the reviewer names the test that fails on the base commit and passes on head, and lists
  every changed expected value, removed assertion and new skip or xfail with its reason. The main session (Fable) briefs, gates and judges; it never
  implements.
- **Gates.** Backend gates run in Docker (Appendix A on `postgres:17-alpine` from P3a on; the
  owner starts Docker Desktop and confirms with `docker info`). Web and mobile gates run
  natively (green today on Node 24). A code phase is not done until gates are green locally
  **and** CI is green on the PR.
- **Merge is not deploy — the drain image and the deploy train.** From P3 on, production is the
  **primary host** ("the host" below; the physical machine at the shop is "the home box"). By
  ruling HR-A3 the host is a VPS from P3b until **P13e** moves it to the home box — not before
  the later of P5d-2 done and the last re-open, and only after the §4 box gate. **"Box gate"** is the §4 term for the home box's reliability condition. Where older text says
  "the box" it means the host. Until the drain window closes (`T_close`, P4c) the box runs the git tag
  **`drain-image`**, cut from the branch **`release/drain`** = a branch at P1's squash commit
  with the P2b-2 and P3a squash commits applied **by `git cherry-pick` only — never `git merge`**
  (the repo squash-merges; merging would pull in whatever else reached `main`). After the cut
  `git log release/drain` is recorded in W0-results and must show no commit from another PR, and
  the backend gates (Appendix A) run green on `release/drain` before tagging and after every
  re-cut. Cutting the tag is the last Scope item of whichever of P1 / P2b-2 / P3a merges last
  (P3a-2, if opened, is not part of the image). Runbook R5 deploys only that tag before
  `T_close`. A drain-tool fix during the window is cherry-picked onto `release/drain` and
  re-tagged `drain-image-2`, `-3`… with a W0-results row; an APK-side fix goes to `main`, gets a
  new versionCode and a P2c re-run. Behaviour-changing phases that merge to `main` earlier are
  appended to the **deploy-train table** in W0-results.md (columns: phase, PR, merge sha,
  migration, post-deploy check; the first phase that needs it commits the empty table, P3a
  confirms it exists) and are deployed by P4c; until then their Done-when ends at "**merged;
  deploy-train row added**". After `T_close` a phase ends with "**deployed per runbook R5** (owner
  at SSH, ~15 min); `/api/ops/health` shows the new head and `FIXFLOW_GIT_SHA`, and `docker
  inspect --format '{{.Image}}' backend` is recorded beside it". The **web image** before
  `T_close` is built on **`release/drain-web`** = `release/drain` plus the web-only commits
  P12a/P12 (never on `release/drain` itself); web halves of mixed PRs (P6a, P7b-2, P9b, P10a)
  ride the train, whose last row rebuilds the web image from `main`.
- **Migrations** take the next free slot at rebase time (check the `down_revision` chain) and
  update the CLAUDE.md head in the same PR; branch names carry no numbers. FKs/CHECKs on
  populated tables ship `NOT VALID`; `VALIDATE` lands in a later migration after an audit script
  has run on the box, immediately before that deploy (CLAUDE.md).
- **Retired phones.** A roster phone that cannot be drained (lost, dead, owner-declared) gets a
  **retired row** in W0-results (owner sign-off; its A3 photos transcribed or the loss declared).
  "Every roster phone has a P4b, P4r or retired row" is the condition later phases use.

**Standing rules:**

1. Nothing ships to a phone before the drain protocol has run **on that phone** and its AFTER
   check passed. Installs are per phone, supervised, and never an uninstall — **except** in the
   K=no branch, after the A3 photos, every row retried or transcribed, and the owner's written
   per-phone sign-off (`w2/O-10-design.md` BRANCH K=NO).
2. No field-reliability claim without device evidence from the phone models in the fleet.
3. The **drain image** is the `drain-image` tag (or its re-cut) and nothing else until `T_close`.
   No backend deploy from `main` before P4c.
4. The dispatcher stays OFF. The cursor is re-seeded at `T_close` and again after every P4r;
   enabling the dispatcher is a separate, owner-approved step after the **last re-open**, which
   is the point where every roster phone has a P4b, P4r or retired row (CLAUDE.md; `O10-F7`).
5. The old Railway hostname: K=yes → it may only **hang** (accept, no bytes for ≥ 20 s, close);
   K=no & H=yes → it may **proxy** to the box only from O-10 B6 and only through the repository's
   stub in proxy mode, which hangs instead of answering on any upstream error, 5xx or timeout.
   The stub never originates a 5xx, 2xx or 204 of its own; in proxy mode only the backend's own
   marker-carrying responses pass through (`O10-F3`, `O10-F4`). The stub is removed only after
   every roster phone has a P4b, P4r or retired row (O-10 C). O-08 §4's "503 stub" line is void.
6. Technicians are "released" only by the written release notice (`docs/program/notices/
   release.md`) at the end of their phone's E-steps; until then the hold notice
   (`docs/program/notices/fleet-hold.md`, committed as sent in P0a) stands.
7. Money stays in integer minor units; no money feed (staging, export, push) is driven by the
   `job_event` cursor (payloads may carry amounts for audit); the outbox never deletes a write.

## 1. Milestones against the five goals

| Goal | Reached at | Phases |
| --- | --- | --- |
| Production back on infrastructure the owner controls; fleet data drained with proof | end of P4c (late phones via P4r) | P0a, P0b, P1, P2a, P2b-1, P2b-2, P2c, P3a, P3b, P3c, P12a, P4a, P4b (×n), P4c, P4r (×n) |
| Geofencing, pings and travel behave as designed in the field (thresholds in §4) | end of P5d-2, thresholds passing | P6a, P5-spike, P5a, P5b-1, P5b-2, P5c, P5d-1a (×n), P5d-1b (×n), P5d-2, P6b-1, P6b-2 |
| Security holes closed for a shipped system | boot/edge set at P3c; the rest at the later of P7b-1 and P7b-2; insider evidence at P8b, P13a | P1, P3c, P7a, P7b-1, P7b-2, P8a, P8b, P12, P13a, P13b |
| Latency acceptable (threshold in §4) | measured in P3c before the route opens | P3c |
| Kacha khata → manager-approved pakka khata → Odoo | end of P10b (P11 only on a Custom plan); in P9-0b's no-Odoo branch, end of P10a (the journal CSV export, without the Odoo runbook) | P7a, P8a, P8b, P9-0a, P9-0b, P9a-1, P9a-2, P9b, P10a, P10b, P11 |
| Self-hosting durable, not just running | end of P13e (the host move; P13d is P13c's second PR) — or of P13d when W0-results records "no home box" and P13e is skipped | P13a, P13b, P13c, P13d, P13e |

## 2. Dependency order

Drawn from the Entry lines (the Entry line wins if they ever disagree):

```
P0a (today) ─► P0b (domain, destination by date)
P1 ─► P3a ─► P3b (needs the drain-image tag) ─► P3c ─► P4a ─► P4b×n ─► P4c (T_close, deploy train) ─► P4r×n
P2a ─► P2b-1 ─► P2b-2 (tag cut when the last of P1/P2b-2/P3a merges) ; P2b-1 ─► P2c ─► P4a
P0b ─► P2b-1 (domain name), P2c (DNS), P3b (destination) ; hatches: P2a-2 ─► P2c, P3a-2 ─► P3c, P8b-2 ─► P9a-2
P3b ─► P12a (A4 web fix, before P4a)
P6a (merge after P1; deployed by P4c) ─┐
P2b-1, P4a, P5-spike (or §4 "declined") ─┴─► P5a ─► P5b-1 ─► P5b-2 ─► P5c (after P4c) ─► P5d-1a×n ─► P5d-1b×n ─► P5d-2 ; P4a ─► P5-spike
P4c ─► P6b-1 ─► P6b-2 (needs P5a merged) ─► P5d-1a
P1 ─► P7a ─► P7b-1 (needs P3c XFF record, every phone P4b/P4r/retired + on v2) ; P3c ─► P7b-2
P7a ─► P8a ─► P8b ─► P9a-1 ─► P9a-2 ─► P9b ─► P10b ; P3b ─► P9-0a ─► P9-0b (owner) ─► P9a-1 ; P5d-2 (done) ─► P9a-1 ; P9a-2 ─► P10a ─► P10b ; P10a ─► P11 (optional)
P3c ─► P12 ; P4c, P7b-2 ─► P13a ─► P13b, P13c (+P13d as a second PR, needs the P6b-2 audit re-run clean, P8a) ; P5d-2, last re-open, P13b, box gate ─► P13e
P5d-2 ─► P14-n ─► P14-fleet×n ; P5d-2, a P14-n build ─► P14-log (backlog)
```

**Branch box (recorded by P0a, per phone).** K = the field build's signing cert equals the EAS
keystore cert; H = the owner controls the old Railway hostname; v2 = the field bundle contains
`jobs.outbox.v2`; R = recovery case a/b/c (`w2/O-10-design.md`, G1 §3).
- **K=yes** (expected): the graph above; the old host hangs (P3c step 4). A same-cert phone with a
  **lower** versionCode installs over cleanly and stays K=yes; a phone **STOPs and re-checks K**
  only on a cert mismatch, `INSTALL_FAILED_UPDATE_INCOMPATIBLE` or a version downgrade (O-10 E2).
- **K=no, H=yes**: P2c builds the fleet APK and does a fresh install on the spare phone instead
  of an install-over. P4a/P4b run O-10 "BRANCH K=NO" per phone in a **supervised session**: the
  old host proxies to the box **only from B6**, each parked row is retried by hand (S7 clock-in
  walk included), the AFTER check is against the A3 photos, then uninstall and fresh install of
  the fleet build. If v2=no, the owner decides in P0a whether old-secret tokens are accepted for
  the window (`O10-F15`, §4); the verifier is always built in P1 (default OFF); P3b keeps the
  sealed old secret only on a "yes".
- **K=no, H=no**: no drain is possible; P4a/P4b transcribe each phone's A3 photos into the
  manager web and declare the loss, then fresh install.
- **Mixed fleet** (one or a few K=no phones): the host **hangs** until every K=yes phone has its
  P4b row, then switches to proxy for the K=no phones, each in its own supervised session.
- **Network cut** (P0a item 12) on every phone in every branch. It lifts for a phone only when:
  K=yes and a hang-mode stub is verified (P3c step 4) — or the phone's own supervised drain
  session begins. Under K=no it never lifts outside that session.

## 3. Phase checklist

- [ ] P0a — Owner pre-flight: Railway cut-off + old secret, R2 archive, Supabase dump, evidence, tools, decisions (today)
- [ ] P0b — Procurement: domain, box or VPS, ISP, UPS (owner-run, dated)
- [ ] P1 — Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (default OFF)
- [ ] P2a — Offline engine honesty (mobile code) [P2a-2 if the hatch is taken]
- [ ] P2b-1 — Drain tooling and fleet profile (mobile code)
- [ ] P2b-2 — Drain audit script (backend code) [+ drain-image tag if last]
- [ ] P2c — Fleet APK v1: build, signature, install proof (both K branches)
- [ ] P3a — Self-host repository changes [P3a-2 if the hatch is taken] [+ drain-image tag if last]
- [ ] P3b — Host ready (VPS by default), restore, PIN rotation (owner session)
- [ ] P3c — Pre-cutover verification (preflight host; route stays closed)
- [ ] P12a — Web payment idempotency fix (A4), before P4a
- [ ] P4a — Pilot drain: field protocol, B4–B6, E1–E6 on one phone
- [ ] P4b (×n) — Fleet drain, one session per workshop visit
- [ ] P4c — Window close, ceilings, re-seed, deploy train
- [ ] P4r (×n) — Late re-open, one session per late phone
- [ ] P5-spike — Commercial background-location SDK spike (spare phone, debug build; or §4 "declined")
- [ ] P5a — Geofence and sampler fixes (mobile code) + compile gate
- [ ] P5b-1 — Permissions, OEM onboarding, remaining patches, typed-id login
- [ ] P5b-2 — Shift reminder, boundary rules, APK-side fields + v2 build
- [ ] P5c — Pilot validation of v2
- [ ] P5d-1a (×n) — Fleet install of v2, one session per visit; T0 at the last install
- [ ] P5d-1b (×n) — Per-OEM protocol runs (incl. the pilot's OEM)
- [ ] P5d-2 — 48 h review and FIELD-VALIDATION
- [ ] P6a — Attendance truth, migration-free: verdict rule, liveness, discard counts
- [ ] P6b-1 — Attendance migration: late flags, adjustments, payroll version and regeneration
- [ ] P6b-2 — Heartbeat index, sampler-health read, dispatcher guard, audit script
- [ ] P7a — Authorization model and money guards
- [ ] P7b-1 — Login, lock and session hardening (+ web typed-id login, roster removal, PII setting on)
- [ ] P7b-2 — Ops console, media, web dependencies, Cloudflare rules
- [ ] P8a — Money integrity 1: void attribution, payloads, captured_at, FK NOT VALID
- [ ] P8b — Money integrity 2: bill revisions, chain over payments (+ backfill), daily verify, mailer + anchor [P8b-2 if the hatch is taken]
- [ ] P9-0a — Week-export script (backend; one small PR)
- [ ] P9-0b — Odoo and books rehearsal (owner + accountant; the decide-before-build gate)
- [ ] P9a-1 — Accounting slice 1: posting tables, triggers, decision API
- [ ] P9a-2 — Accounting slice 2: stager
- [ ] P9b — Approval and reconciliation UI
- [ ] P10a — CSV export, transport seam, exports page
- [ ] P10b — Odoo import rehearsal (owner session)
- [ ] P11 — JSON-2 push adapter (Custom plan only)
- [ ] P12 — Web manager defects
- [ ] P13a — DB role split
- [ ] P13b — Backup encryption, put-only token, retention, first drill
- [ ] P13c — Monitoring upgrade, node:22 images, lock file; P13d as its second PR
- [ ] P13e — Primary host move: VPS → home box (owner session; after the §4 box gate)
- [ ] P14-n — Expo SDK upgrade, one phase per major; P14-fleet (×n)
- [ ] P14-log — One command log for the six queues (backlog; after P5d-2; Opus)

---

## P0a — Owner pre-flight (owner session, today)

**Goal.** Cut off anything that could still write to or prune the old data, archive and dump
before any clock runs out, capture the evidence that exists only on the phones and dashboards
today, and settle the decisions the program branches on.
**Entry.** None.
**Scope.** Design doc §4.0 items 1–10, `w2/O-10-design.md` A1–A3, G1 §5 form, §4 of this plan.
**Deliverables** — `docs/program/W0-results.md` with these numbered items **in this order,
except that item 10 (tools and access) is set up first**; every line a value or "unknown,
because …" except where marked MUST. Commands are Git Bash; start the shell with
`export MSYS_NO_PATHCONV=1`.
1. **Fleet hold notice** (MUST): the written procedure sent to every technician (do not open the
   app, clock in, start travel, tap Discard, update, uninstall, clear data, reset); date sent;
   the text **as sent** committed to `docs/program/notices/fleet-hold.md` (English and Urdu).
2. **Railway first** (MUST): project state; **copy the old `FIXFLOW_JWT_SECRET` from the Railway
   env and seal it unconditionally** (used only if K=no & H=yes & v2=no and §4 says yes;
   destroyed at P4c otherwise); then cut any surviving service off the database (remove its
   `DATABASE_URL` or scale it to 0) and reset the Supabase DB password in the dashboard, so an
   old backend can neither drain phones nor run its 02:30 pruner (`O08-F02`); whether the old
   subdomain can be bound (H) and to what; account and billing access.
3. **R2 archive** (MUST): mint an R2 API token; `export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=…`;
   `docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url https://<acct>.r2.cloudflarestorage.com s3 ls s3://<bucket>/backups/db/`
   (record the listing); then `… s3 cp --recursive s3://<bucket>/backups/db/ s3://<bucket>/archive/pre-selfhost/`;
   then a laptop copy with `docker run --rm -v C:/fixflow-r2:/dl -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url … s3 cp --recursive s3://<bucket>/backups/db/ /dl/`;
   `s3 ls` the archive prefix afterwards and record it.
4. **Supabase** (MUST, same day): status, pause date, the restore deadline as shown, Postgres
   major. If restorable: restore (unpause) and **take the dump now** through the session pooler:
   `docker run --rm -v C:/fixflow-dumps:/out postgres:17-alpine pg_dump "postgresql://postgres.<ref>:<pw>@<pooler-host>:5432/postgres" --format=custom --schema=public --no-owner --no-privileges -f /out/supabase-<date>.dump`
   (RUNBOOK-BACKUPS §session pooler); `sha256sum` it; upload it with
   `docker run --rm -v C:/fixflow-dumps:/up -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url … s3 cp /up/supabase-<date>.dump s3://<bucket>/archive/pre-selfhost/`;
   **verify it the same day with design Appendix C**: `export ARGS_DUMP_PATH=C:/fixflow-dumps/supabase-<date>.dump ARGS_LOGDIR=C:/fixflow-dumps/logs`,
   save the Appendix B block as `$ARGS_LOGDIR/appendix-b.sql`, run the Appendix C commands, record
   the Appendix B output. If only a
   dashboard download is available: `pg_restore -l` it inside `postgres:17-alpine` to learn its
   format; a plain-SQL file is loaded into a scratch PG17 and re-dumped as custom format of the
   `public` schema; done when an Appendix C restore of the resulting file passes. If the
   dashboard says unrecoverable: screenshot. "Unknown" is not accepted; "project restored" alone
   does not satisfy this item.
5. **Fleet roster**: phone × technician id × OEM/model/Android version × shared-phone yes/no.
6. **Field build, per phone**: `adb pull` of `base.apk`; `apksigner verify --print-certs`
   SHA-256; versionCode; `unzip` and `grep -a` of `assets/index.android.bundle` for
   `jobs.outbox.v2` (v2) and the baked API host; K per phone against the EAS keystore cert
   (`eas credentials`); the keystore **exported** (not re-mintable, `w2/O-08-design.md` §1).
7. **A3 photos**, per phone, today: airplane mode on and Wi-Fi off, open FixFlow, photograph the
   ClockScreen DID-NOT-SYNC list and every job banner, close the app, airplane mode off. "Not
   reachable" only for a phone whose session is gone.
8. **Sentry**: backend project last event; mobile project still ingests.
9. **Workshop coordinates** and the fence radius the owner wants (≥ 100 m, `O01-F04`).
10. **Tools and access**: Docker Desktop running (`docker info`); Android platform-tools (adb) and
    build-tools (apksigner) + a JDK; `npx eas-cli login`; `gh auth status`; `npx @railway/cli login` if H=yes;
    dashboard logins for Railway, Supabase, Cloudflare, Sentry, Firebase, Expo; **USB debugging
    on every roster phone** (item 6 needs it); a cable; a spare Android phone for P2c.
11. **Decisions** (§4): every row answered or left to its default; incl. the chain-anchor address
    and SMTP relay credentials (or "unanchored"), the geofence thresholds, the drain-window host (VPS by
    default, HR-A3), the SDK spike and the shift reminder (HR-A1b/c), the Odoo plan and
    version, and — when K=no & H=yes & v2=no — the `O10-F15` old-secret decision.
12. **Network cut, every phone**: FixFlow's per-app Wi-Fi and mobile data off (system settings),
    or "background data off + Wi-Fi blocked by <method>", or airplane mode when nothing else is
    available; method and date recorded per phone. It lifts only per the §2 branch box.
13. **Committed keys**: the Maps/Firebase/Sentry client keys restricted in each console (package
    name + SHA-1); done per key (`O05-17`).
14. **Workshop Wi-Fi** (HR-A1c): does the workshop have Wi-Fi that technicians' phones join during
    shifts? SSID and the BSSID(s) of its access point(s) (a phone's Wi-Fi details or the router);
    which roster phones join it. "No Wi-Fi" is a valid answer and disables the `O04-F18` rule.
15. **Field cash custody** (HR-A4, `O07-F17`): do technicians hold cash collected at customers, or
    receive "online" payments into personal wallets, before handing them to the shop? For how
    long, and who counts the hand-over today? "Never — every rupee reaches the manager the same
    day" is a valid answer and drops the remittance source.
16. **Books basis**: is the shop registered for sales tax (SRB/FBR)? Are the books on a cash
    basis? Is there an accountant, and does that person want per-transaction entries or periodic
    totals? Is a second money writer (a counter POS, an offline web manager, a second shop)
    planned within 12 months? Unknowns here are turned into answers in P9-0b, not here.
**Done when.** Items 1–4, 6 (every roster phone), 10 and 12 have values; the rest have values or
a dated "unknown, because".
**Workflow.** None; a Sonnet chat can help read a dashboard. **Resume.** The file.

## P0b — Procurement: domain, box or VPS, ISP, UPS (owner-run, dated)

**Goal.** What P2b-1, P2c and P3 cannot start without, with a date and a fallback.
**Entry.** P0a.
**Scope.** The **domain** (Cloudflare DNS, multi-year, auto-renew) — the name is enough for
P2b-1; DNS for P2c/P3a. The **host** (ruling HR-A3): by default a **small VPS** (2 vCPU / 4 GB,
provider backups on, provider firewall denying all inbound except SSH; Mumbai measured first in
P3c, then Singapore) running the identical compose behind the same `api.<domain>`, primary from
P3b until **P13e**. The **home box** (Linux, a UPS covering box, ONT and router, location, CGNAT
test once online) is the restore-drill host; it becomes primary only through P13e, after the
**§4 box gate** (a 14-day heartbeat from its site at ≥ 99.5 % reachability, or a second uplink).
The owner may invert the default at P3b **only if the home box already passes that same gate**
(§4); the gate is the one condition for the home box in every role, and the probe that measures it
is the P3a runbook's home-box heartbeat (a cron on the home box pinging a **second** dead-man
check every 5 min; the 99.5 % is read from that service's 14-day history), started here when a
box exists. "No home box" is a valid answer, recorded in W0-results: the VPS stays primary and
P13e is skipped. ISP facts. Target date = when the drain must
start (P4a), set by the Supabase deadline and the techs' hibernation clock.
**Done when.** `api.<domain>` exists in Cloudflare DNS and the host (VPS by default) exists
with SSH; the home box, if any, has its site facts and heartbeat start date recorded.
**Resume.** The W0-results section.

## P1 — Backend first-boot gate, PIN policy, origin marker, deep-health exposure, legacy verifier (backend; one PR; migration-free)

**Goal.** The first self-hosted boot cannot run with a dev secret or a usable seed PIN; every
response carries the marker the phones use to tell "the app said no" from "something in the way
said no"; the owner can read from deep-health everything later phases need to read back.
**Entry.** Docker Desktop up. **First act** (before any code; HR §4): the **cold-resume trial** —
the session writes ten facts about this phase from the plan to
`docs/program/evidence/resume-trial-P1/expected.json` and commits it, then dispatches a fresh
Sonnet agent given only the repository and "read SHIP-PLAN §0 and P1"; the main session judges
the recovered facts against the file and fixes any miss in the plan (same PR) before the first
code commit. Independent of P2a (which needs only the header name
`X-FixFlow-Api: 1`) and of P0a's answers.
**Scope (register).**
- Dev-secret fail-open (`O6-F01`/`O08-F01`/`O05-01`/`O10-F5`): boot refuses the dev default, a
  blank secret and a secret under 32 bytes unless `FIXFLOW_ENVIRONMENT` is explicitly `dev` or
  `test`; the default environment stops being `dev` (config.py), with the knock-on edits
  `FIXFLOW_ENVIRONMENT=test` in `ci.yml`, in design Appendix A's gate container and in the dev
  compose (`w2/O-06-design.md` item 1).
- Seed PINs (`O6-F05`/`O05-02`/`O10-F6`): in production, login **refuses** (403, "PIN must be
  changed by the manager") any account whose hash verifies against a known default PIN;
  **`MIN_PIN_DIGITS_TECH` → 6 and `SetPinRequest.pin` min_length → 6** in the service and schema
  (G2 §5, `O05-04`), with a test that a 4-digit tech PIN set through the API is refused;
  `backend/scripts/set_pin.py` (dry-run default) shares that policy.
- **Legacy-secret verifier, always built, default OFF** (`O10-F15`): when `FIXFLOW_LEGACY_JWT_SECRET`
  is set, a token whose signature verifies against it is accepted on **write routes only**, with
  the token's own `exp` **not enforced** (the field tokens all expired in 2026-09; the window
  expiry `FIXFLOW_LEGACY_JWT_EXPIRES_AT` replaces it) and `sub`/`ver`/`active` checks kept. Tests: a
  token 60 days past `exp` is accepted on a write route, refused on a read route, refused after
  `EXPIRES_AT`, and ignored entirely when the variable is unset.
- `/docs`, `/redoc`, `/openapi.json` off in production (`O6-F19`/`O05-16`); body caps on login
  and the webhook (`O05-14`).
- Marker header `X-FixFlow-Api: 1` on every response incl. unknown-route 404s and
  unhandled-exception 500s (an outer ASGI wrapper; `w2/O-03-design.md` step 1).
- **Deep-health exposure** (ops-token-gated): `default_pin_active` per account; the resolved
  client IP, raw `X-Forwarded-For` and `CF-Connecting-IP` of the request; `enable_dispatcher`,
  `backup_enabled`, `backup_prefix`; the device_time, jobs-GPS and ping backdate ceilings; the
  legacy verifier's on/off and expiry; `FIXFLOW_GIT_SHA` (a build arg the compose sets from
  `git rev-parse HEAD` or the tag; the image digest itself comes from `docker inspect`). Each
  with a test.
- Ping backdate ceiling default 48 → 240 h (`O04-F12`, G2 §5); drain-mode knobs
  (`FIXFLOW_ATTENDANCE_*`, `FIXFLOW_JOBS_GPS_*`) documented; `/api/ops/health` documented as the
  healthcheck target with its `X-Ops-Proxy-Token` requirement (`O08-F07`).
**Deliverables.** Code + tests per bullet (incl. forced-500 marker test, the no-env fails-closed
test run in a **cleaned environment** with no inherited `backend/.env` or compose env, `1234`
login → 403 in production); `set_pin.py`; the **skip-aware gate** (harness rule, HR §4): pytest
runs with `-rs --junitxml`, and the gate **fails when any `@integration` test was skipped**
(`backend/tests/conftest.py:65-72` skips them all when `FIXFLOW_TEST_DATABASE_URL` is unset) —
the same assertion added to `ci.yml` after pytest, the mobile job's `--passWithNoTests` removed,
and design Appendix A updated; a CI step that **fails** when CLAUDE.md's Alembic head differs
from the `down_revision` chain head and **warns** (not fails) on a CLAUDE.md path that does not
resolve under the repo root, `src/`, `technician-app/src/`, `backend/`, `backend/app/` or
`backend/app/features/` and is not in an **allow-list file** of negative mentions (27 names do not
resolve today, two of them — `core/railway.py`, `core/sentry_api.py` — named as files that must
not exist; the check turns fatal in P13c after CLAUDE.md is normalised, the allow-list staying); CLAUDE.md security section **and** the
Location-and-privacy trust-window line (240 h) updated. If P1 merges last of P1/P2b-2/P3a: the
`release/drain` branch and `drain-image` tag cut.
**Done when.** Backend gates green in Docker and CI; `curl -i` on an unknown path shows the
marker; a manual boot with no env fails closed.
**Owner inputs.** Docker Desktop started.
**Workflow.** Opus implements; Sonnet writes tests from this list; Opus reviewer with the G2 §1.1
claims as its refute list.
**Size.** Large; if long, the deep-health exposure bullet (except `default_pin_active` and the
client-IP echo) moves to P3a, and the CI harness items (skip gate, CLAUDE.md check,
`--passWithNoTests`) may move to a small **P1-ci** PR — they are not drain-image behaviour and
are never cherry-picked onto `release/drain`. **Resume.** Branch `fix/backend-first-boot-gate`.
**Backlog in these files.** none (`O05-15` → P7a; `O05-17` → P0a 13).

## P2a — Offline engine honesty (mobile code; one PR; no build)

**Goal.** The engine's contract is true under a dead, reviving or flaky backend.
**Entry.** Header name fixed (`X-FixFlow-Api: 1`). Independent of P1.
**Scope** — `w2/O-03-design.md`, by **its** step numbers (each checkbox names the design's test):
- **Step 1** origin-aware classification: a response without the marker (edge 404, Cloudflare
  403/502/530, captive pages) is **connectivity** — no park, no drop, no attempt count; 5xx
  counts toward the poison cap only with the marker (`O3-F6`). **No** JSON-`detail` fallback
  (ruling R8). Test: a `{"detail": …}` body without the marker is not definitive. Classification
  is **one pure `classify(error, kind)`** returning an outcome (landed / pause-auth / park /
  count-and-retry / free-retry / drop) from a per-kind policy table that **every** loop calls, the
  pending-media queue included (`O3-F22`; its 413 branch becomes a policy row) — no queue keeps a
  private ladder (HR-A2; O-03 amendments). A policy-table test asserts that `drop` appears only on
  the ping and travel rows (CLAUDE.md: every other queue never drops); the pending-media 413 row
  parks **only with the marker** (a markerless 413 is connectivity) and is paired with a
  client-side size check before upload.
- **Step 2** `sendOrQueue` keeps the write on non-app errors and on 401 (`O3-F1`, `O3-F8`).
- **Step 3** duty truth from live punches only (`O3-F2`, `O3-F3`).
- **Step 4** `clearSession()` on every 401 incl. headless; privacy gates read the cleared state
  (`O3-F7`).
- **Step 5** `drainAll(techId)` on mount, `active`, connected and after login, fixed order
  (`O3-F9`). Lives here only.
- **Step 8** location outbox id **per tap** + travel-state merge (`O3-F10`, `O3-F11`; CLAUDE.md
  "the outbox never deletes a write").
- **Step 9** corrupt-store preservation (`O3-F17`).
- **Step 10** (surfaces): engine status banner (`O3-F14`); `sendPunch` reports landed / queued /
  failed distinctly (`O3-F18`, L7).
**Deliverables.** Code and the design's pure-module Jest tests per step; every new test fails on
`main` and passes on the branch (prove it in the PR).
**Done when.** `npm run typecheck && npm test` green; CI green.
**Workflow.** Opus implements; Sonnet tests from the design's list; Opus reviewer briefed with
CLAUDE.md's outbox invariants.
**Size.** Large but single-threaded. If long, land steps 1–5 and 8 and open **P2a-2** for 9 and
10 (same brief); **P2c's** entry then adds "P2a-2 merged" (P2b-1 does not wait for it).
**Resume.** Branch `fix/mobile-engine-honesty`; draft PR checklist.
**Backlog in these files.** `O3-F16`, `O3-F19`..`F21`, `O10-F16`.

## P2b-1 — Drain tooling and fleet profile (mobile code; one PR; no build)

**Goal.** Everything fleet APK v1 needs to prove it lost nothing, and nothing in it that could
drain before that proof exists.
**Entry.** P2a merged; the domain name decided (P0b; DNS need not resolve); P0a item 6 recorded
for every roster phone (the fleet versionCode must exceed the fleet maximum).
**Scope** — `w2/O-10-design.md` D1–D7 and E4; `w2/O-03-design.md` steps 6–7:
- D1: the `fleet` EAS profile (APK, `EXPO_PUBLIC_API_URL=https://api.<domain>`, real Sentry DSN,
  versionCode above the fleet maximum). `preview` and `production` profiles **repointed to the
  owned domain or removed** (`O08-F05`/`O08-F14`); every later build names `fleet`.
- D4 then D3: the manifest snapshot at bundle load, **written once per versionCode** and carrying
  the phone's **total AsyncStorage bytes** (`O10-F17`; the Android cap is 6 MB); a sync gate
  every queue awaits that opens **only on a 2xx manifest receipt**; the one-time un-park
  migration keyed on edge reasons (`O10-F2`) runs **after** the snapshot is written.
- D5: the gate calls `drainAll` (P2a). D6/E4: login banner with per-tech record counts; the
  shared-phone sign-in copy (queues drain under their owner's session, `O10-F10`). D7: the Drain
  Report screen (BEFORE counts by queue and reason) and manifest upload via `POST /api/events`.
- Step 6: retry advice for stale rows at the **post-window ceiling of 336 h** read from one
  shared constant (`O3-F4`; P4c sets the server to the same value); Discard copy that
  distinguishes "server refused" from "could not reach" (`O3-F13`); every Discard writes a
  telemetry event with kind and tech (`O6-F14`/`O6-F15`, `w2/O-06-design.md` item 6).
- Step 7: pending-media retry/discard and the needs-attention list (`O3-F5`, `O3-F12`); a local
  catch around the selfie PUT so a throwing upload marks the punch and retries the selfie
  separately (`O10-F8`).
- The login screen states that the typed value is the **technician id on the sealed slip**
  (ruling R3) — the v1 build still shows the roster; the typed-id screen is P5b-1.
**Deliverables.** Code; tests `manifest.test` (gate waits for 2xx; un-park after snapshot;
once-per-versionCode), `unpark.test`, `retryAdvice.test` (boundary from the constant), `sync.test`
(selfie throw does not stall).
**Done when.** Mobile gates green; `expo export --platform android` + `grep -a` of the bundle
shows the owned domain and `jobs.outbox.v2`; a parked row older than the constant shows the
late prompt before Retry (test); CI green.
**Workflow.** Opus for the manifest gate, un-park ordering, retry advice, pending-media; Sonnet
for screens and banner; Opus reviewer briefed with O-10 R1–R7.
**Size.** Large. **Resume.** Branch `feat/fleet-drain-tooling`.
**Backlog in these files.** `O10-F9`, `O10-F11`, `O10-F12`.

## P2b-2 — Drain audit script (backend code; one PR; migration-free)

**Entry.** P2b-1 merged (manifest schema fixed).
**Scope.** `backend/scripts/drain_audit.py` (dry-run, read-only), run as `docker compose exec
backend python scripts/drain_audit.py …`: compares a manifest with server rows per tech since
`T_open`, with the matching rules for kinds that carry no `client_id` (`w2/O-10-design.md` E6);
`--test-window START END` reports the rows in that window separately while still counting them
toward the landed delta (the O-01 protocol rows); **`--snapshot-fuel OUT.json`** writes per-job
derived distance and fuel for closed/billed jobs (run at B5, written to the bind-mounted
`/var/lib/fixflow/drain/` and uploaded with the B5 dump to `archive/pre-drain/`, so a re-cut or
restart cannot lose it), and **`--fuel-baseline OUT.json`** diffs the AFTER state against it
(ruling R2; fuel is derived on the fly in `jobs/service.py`, so a `pg_dump` is not a usable
baseline). `docs/program/notices/release.md` (English and Urdu): what
is now allowed (open the app, clock in, travel, Retry), what stays forbidden (Discard, uninstall,
clear data), whom to call.
**Done when.** Backend gates green (pytest against a fixture manifest and a seeded DB, incl. the
snapshot/baseline round trip); CI green. If P2b-2 merges last of P1/P2b-2/P3a: the
`release/drain` branch and `drain-image` tag cut.
**Workflow.** Opus (matching rules halt the fleet on a mismatch); Opus reviewer. **Size.** Medium.
**Resume.** Branch `feat/drain-audit`.

## P2c — Fleet APK v1: build, signature, install proof (EAS + one spare phone; both K branches)

**Entry.** P2b-1 merged (P2a-2 too, if opened); domain in DNS (P0b); P0a item 6 for every roster
phone; the spare Android phone and the pulled field `base.apk`.
**Scope.** `eas build --profile fleet` (record the build id; if the queue is slow the session
ends at "submitted" and resumes from `eas build:list`); download; unzip and `grep -a`
`assets/index.android.bundle` for `api.<domain>` and `jobs.outbox.v2`; `apksigner verify
--print-certs` — **K=yes**: equals the field cert; install the field `base.apk` on the spare
phone, then `adb install -r` the fleet APK (same package, same cert, higher versionCode).
**K=no**: record the new cert SHA-256; fresh install on the spare phone. In both: the spare
phone's FixFlow network is **off** for the whole test (the APK bakes the production domain;
O-10 E6); open the app; the Drain Report renders (empty: the spare phone cannot log in).
**Deliverables.** W0-results "Fleet APK v1": build id, versionCode, cert, grep result, install
result, screenshot.
**Done when.** Grep clean; cert check per branch; install succeeds; the report renders.
**Owner inputs.** EAS access, the spare phone, the field APK. **Size.** Small plus the queue.
**Resume.** `eas build:list`; the section.

## P3a — Self-host repository changes (code; one PR; migration-free)

**Goal.** Everything the box will run, in the repo, smoke-tested locally, with the runbook the
owner session follows step by step.
**Entry.** P1 merged. **First act:** confirm the deploy-train table exists in W0-results.md
(create it if no earlier phase has).
**Scope** — `w2/O-08-design.md` §1–§2, §6; G2-D2:
- `docker-compose.prod.yml` with profiles: `db` (Postgres 17), `app` (backend; cannot start
  before the restore; `FIXFLOW_GIT_SHA` build arg; `FIXFLOW_BACKUP_ENABLED=false` until P3c
  step 7 — the code default is ON), `web`
  (Caddy serving the build from a **node:22 build stage with CSP and security headers, font
  self-hosted**, `O05-11`), `ops` (optional, `Dockerfile.ops`, `OPS_BACKEND_URL=http://backend:8000`,
  `OPS_RAILWAY_*` unset), `edge` (cloudflared with a 503 catch-all; `api.` → `backend:8000`
  directly so XFF stays single-hop, `O08-F04`; the compose healthcheck sends
  `X-Ops-Proxy-Token`). **No published ports** (`O05-08`/`O08-F03`); root-owned env files;
  `FIXFLOW_ENVIRONMENT=production`; `FIXFLOW_BACKUP_PREFIX=backups/db-selfhost/` (existing
  setting).
- **`ops/hang-stub/`**: zero-dependency Node service with two modes — *hang* (accept, no bytes
  for ≥ 20 s, close) and *proxy* (forward to `api.<domain>`; a response passes through **only if
  it carries `X-FixFlow-Api: 1`**; on any markerless response — a Cloudflare 429/403/404, an
  edge page —, any 5xx, error or timeout it hangs instead of answering, because the field build
  treats a bare 4xx as definitive) — with tests for both modes incl. "a markerless 429 causes a
  hang" (standing rule 5). Railway deploy command documented.
- Minimal **off-box heartbeat**: a host cron job calling `/api/ops/health` with the token and
  pinging the §4 dead-man service (G2-D2 "mandatory").
- `docs/RUNBOOK-SELFHOST.md`: the "host ready" checklist with a check command per item (a VPS
  section: provider firewall deny-all-inbound-except-SSH, provider backups on, swap, unattended
  upgrades; a home-box section: UPS covering box, ONT and router; the **box-gate probe** — a cron on
  the home box pinging a second dead-man check every 5 min, the 14-day history read from that
  service — with its start command); the
  secrets list (JWT, `FIXFLOW_OPS_PROXY_TOKEN`, R2, FCM, Sentry, optional `FIXFLOW_LEGACY_JWT_SECRET`
  + `EXPIRES_AT`); restore per recovery case **from O-08 §3**, run as the DB owner `fixflow_app`
  (`docker compose --profile db up -d`; `docker compose exec -T postgres psql -U fixflow_app -d
  fixflow -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public'`; `docker compose exec postgres
  mkdir -p /restore`; `docker compose cp <dump> postgres:/restore/`; `pg_restore --exit-on-error
  -U fixflow_app -d fixflow /restore/<dump>`; Appendix B via `psql -U fixflow_app -d fixflow -f
  /restore/appendix-b.sql`; then `--profile app --profile web`); case-c extras (`setval
  job_token_seq` above the highest printed ticket, roster slugs, O-10 "nothing" rules); the
  roster check (every tech id in P0a item 5 exists); the fence `UPDATE`/`INSERT` command; the
  **B5 snapshot** commands (`docker compose exec -T postgres pg_dump -U fixflow_app -d fixflow
  --format=custom > predrain-<stamp>.pgdump`, then `pg_restore -l` it and `sha256sum` it before
  the upload to `archive/pre-drain/`, then `drain_audit.py --snapshot-fuel` to
  `/var/lib/fixflow/drain/` and its upload); the **late-sync audit query**, the **per-tech
  min/max device_time query** and the **payroll_export listing** for the window (O-10 F); the
  **dispatch_cursor re-seed SQL**; a manual backup run (`docker compose exec backend python
  -c "import asyncio;from app.core.backup import run_db_backup;asyncio.run(run_db_backup())"`); the
  **hourly dump** (HR-A3): a host cron unit calling that same `run_db_backup` with
  `prefix=backups/db-hourly/` and a 72 h retention — this PR adds the prefix and retention
  parameters so naming, credential and pruning stay the app's (the `O6-F06` deviation covers it
  until P13b); the **post-drain dump** command (same call, `prefix=archive/post-drain/`, **retention: none** —
  the parameter change adds a no-prune mode with a test — key recorded in the phone's row); the
  **manifest export** command (the phone's `drain_manifest` app_event props as JSON to
  `archive/manifests/<tech>-<versionCode>.json`, key recorded in the row);
  the ceiling env names and the restart; runbook R1–R7 incl. **R5 deploy of a tag or of `main`**,
  **R8** (host → VPS, O-08) and **R9** (the P13e VPS → home-box move: route `api.` to the 503
  responder; **stop the VPS backend container and disable its host crons** (hourly dump,
  heartbeat) so no scheduler, pruner or dead-man ping runs from the old host; copy `/etc/fixflow`
  to the home box byte-for-byte (same JWT secret, or every phone 401s); final dump + sha256;
  restore with the O-08 §3 production commands, then Appendix B counts equal the source; tunnel
  move; deep-health read-back; the heartbeat and hourly crons installed on the home box; the old
  host kept **read-only** = the DB container only with `default_transaction_read_only=on`, no
  backend, no crons, for 14 days, then destroyed in a dated P13e-close row); the rule that
  **from `T_open` on, any restore** — provider snapshot, hourly dump, nightly dump — **is an
  O-10 R2 restore** (needs every drained phone's manifest: the off-host copies are
  `archive/manifests/<tech>-<versionCode>.json` and the post-drain dumps, each phone's keys in its
  row; replayed through `drain_audit.py`, with owner sign-off);
  the Cloudflare settings for `api.` (no WAF/Bot Fight/challenges; rate rules answer only 429
  with Retry-After); the **`release/drain` branch and `drain-image` tag procedure** incl. the
  re-cut after a window fix; the deploy-train procedure.
- CI backend job on Postgres 17 and **design Appendix A → `postgres:17-alpine`** (`O08-F12`);
  CLAUDE.md Deploy row, traps and doc map updated; ADR-0001 amended "superseded" (G2-D1 as
  amended by HR-A3: a VPS host for the drain window, the home box via P13e).
**Deliverables.** The files; a local `docker compose -f docker-compose.prod.yml up` smoke on
Docker Desktop with a fake domain and throwaway DB (health green, catch-all 503). If P3a merges
last of P1/P2b-2/P3a: the `release/drain` branch and `drain-image` tag cut.
**Done when.** Gates and CI green; local smoke green; runbook steps numbered.
**Workflow.** Sonnet drafts configs and runbook from O-08; Opus reviews compose, restore order,
stub modes against `O08-F01`/`F02`/`F07` and rule 5.
**Size.** Large. If long, move the stub and the heartbeat (and their runbook sections) to
**P3a-2** (Entry: P3a merged; Done: stub tests + CI green). P3a-2 does **not** affect the
drain-image tag (the stub runs on Railway and the heartbeat is a host cron, neither is in the
backend image); P3c's Entry then adds "P3a-2 merged".
**Resume.** Branch `feat/selfhost-stack`.
**Backlog in these files.** `O08-F09` (P7b-2), `O08-F10` (P13c).

## P3b — Host ready, restore, PIN rotation (owner session at the host: VPS by default, HR-A3)

**Goal.** The recovered database on the box, verified, with no account on a default or short
PIN, the backend and web booting against it — reachable from the box only.
**Entry.** `drain-image` tag cut; P0b destination with SSH; the P0a dump artefacts and the archive
copy done; the recovery case decided (§4: no default); the `O10-F15` decision recorded if it
applies.
**Scope** (runbook steps, table committed to W0-results first):
1. Host-ready checklist (VPS or box per P0b), every command's output recorded; on a VPS also:
   provider firewall closed, provider backups on, swap, unattended upgrades.
2. Secrets into `/etc/fixflow`: generated JWT secret; **only on a §4 "yes" (K=no & H=yes &
   v2=no): the sealed old secret as `FIXFLOW_LEGACY_JWT_SECRET` with `EXPIRES_AT` = the planned
   `T_close`** (P4c extends it with the window); `FIXFLOW_OPS_PROXY_TOKEN`; R2 keys; FCM service
   account; Sentry DSN; encrypted copy in the owner's password manager; printed recovery sheet.
3. `--profile db`; restore per case as `fixflow_app` (runbook commands); Appendix B gate against
   the O-08 §3 baselines; case (a) cross-checked against the newest archived R2 dump; record
   `T_restore` (max timestamps from Appendix B).
4. `--profile app --profile web` (and `ops` if used) at the **`drain-image` tag**: deep-health
   shows `jwt_secret_overridden`, `enable_dispatcher=false`, `backup_enabled=false` (set in the
   compose), the git sha; `docker inspect --format '{{.Image}}' backend` recorded beside it.
5. Roster check (every P0a item 5 tech id exists; create missing ones); fence row set from P0a
   item 9 **and its `wifi_bssids` from item 14** by the runbook command (`O10-F14`, `O04-F18`).
6. PINs (ruling R4): `set_pin.py --dry-run`, then every account gets a fresh ≥ 6-digit PIN
   (`docker compose exec backend python scripts/set_pin.py …`); sealed per-tech slips (id + PIN)
   for hand-over at P4 E4; `default_pin_active` false for every account.
7. `curl` from the box: login works, marker present, `/api/ops/health` green with the token.
**Done when.** Step 7 passes; `docker ps --format '{{.Ports}}'` shows no host port; the tunnel
is **not** yet created.
**Owner inputs.** Box access; the dumps; the highest printed job ticket (case c).
**Size.** One session (case (a) restoring the P0a dump is the long version). **Resume.** The table.

## P3c — Pre-cutover verification (owner session + session; route stays closed)

**Goal.** Everything G2 §3 and O-10 require to be true before any phone meets the new host,
with `api.<domain>` answering 503 to the world until P4a opens it.
**Entry.** P3b done.
**Scope** (table first):
1. `cloudflared tunnel` created; `--profile edge`; `api.` on the **503 maintenance responder**;
   `app.` (and `ops.` if deployed) behind **Cloudflare Access**; a **temporary
   `preflight-api.<domain>`** ingress to `backend:8000`, reachable only with a Cloudflare Access
   **service token** (curl sends `CF-Access-Client-Id/Secret`); no APK knows it.
2. Tests through `preflight-api.`, recorded: (a) a forged `X-Forwarded-For` — the deep-health
   echo (P1) shows the resolved IP, raw XFF and `CF-Connecting-IP` (decides P7b-1's keying,
   `O08-F03`); (b) cloudflared stopped → `curl -i` code (a markerless 5xx or network error, never
   a marker 4xx; O-10 R3); (c) `/api/ops/health` carries `X-FixFlow-Api`; (d) one selfie presign
   → PUT → commit succeeds (`O10-F8`, O-10 B2); (e) CSP header checked **from the box**
   (`docker compose exec web wget -S -O- http://localhost/`).
3. **Latency** (§4 threshold) from the owner's phone on Pakistani mobile data (Termux `curl -w`
   with the service-token headers): 20 × GET `/api/health`; one manager login with a slip PIN,
   then 20 × GET `/api/jobs` and 20 × POST `/api/events`; record `cf-ray` PoP, p50/p95. Fail →
   re-run P3b and P3c on the next candidate (the next VPS region — Mumbai first, then Singapore,
   HR-A3 — or the home box only on the explicit P3b inversion, which needs the §4 box gate) from
   the same dump with the same slips,
   discarding the failed host's DB (O-10 R1); P0b records the date.
4. **Old hostname** per rule 5: H=yes & K=yes → hang stub deployed on Railway and verified (no
   bytes 20 s); H=yes & K=no (or mixed fleet) → the stub deployed, **in hang mode** until B6 (or
   until every K=yes phone has its P4b row), its proxy mode verified with the tunnel stopped (it
   hangs, never 5xx); H=no → recorded. The network-cut lift rule (§2) confirmed per phone.
5. Cloudflare rate rule on `/api/auth/login` (429 + Retry-After); WAF/Bot Fight/challenges off
   for `api.` and `preflight-api.` (`O05-03`, O-08 §4).
6. Heartbeat cron live; the dead-man service pages the owner (tested by stopping the container
   once).
7. Backups: `backup_prefix=backups/db-selfhost/` read back from deep-health; the manual backup
   run; the new key listed in R2; restored once with Appendix C; then `BACKUP_ENABLED=true`
   (read back); the P3a **hourly-dump cron** installed and its first key listed under
   `backups/db-hourly/`. Note in W0-results: backups are plaintext under the app credential until P13b
   (`O6-F06`, G2-D2 deviation accepted in §4).
8. `preflight-api.` and its service token **deleted**; deletion recorded.
**Done when.** Every test has a result; latency passes on the current host, or P3b/P3c re-run on the next candidate per step 3; `api.` still
answers 503 to a phone; step 8 done.
**Owner inputs.** Cloudflare dashboard; Railway if H=yes; their phone.
**Workflow.** The session guides; Opus reviews the XFF/stopped-tunnel results against P7b-1.
**Size.** Medium. **Resume.** The table.

## P12a — Web payment idempotency fix (web; one small PR; before P4a)

**Entry.** P3a merged; **P3b done** (the web profile runs on the box). **Scope.** A4 (HANDOFF
§4.1, P0): `PaymentModal`/`AppContext.logPayment` mint the idempotency key once per payment
attempt and rotate it **on success or on any change of job, amount or method** (after P7a a
reused key with a different job/amount is a 409), so a retried manager payment never
double-charges and a corrected amount is never refused — the manager enters P4's parked cash
residue through this path; a test per case. **Done when.** Vitest green; the web image rebuilt
on `release/drain-web` (= `release/drain` + this commit) and deployed (web-only). **Workflow.**
Opus (money). **Resume.** Branch `fix/web-payment-idempotency`.

## P4a (×n until passed) — Pilot drain (operations; one session; one phone)

**Goal.** One phone's queued data in the recovered database with proof, the field protocol
observed on the field build while it still exists, and the route opened.
**Entry.** P2c done; P3c done; P12a deployed; the first scheduled 02:30 backup object present in
R2; the `O10-F15` decision recorded (if applicable); drain window settings staged per
`w2/O-10-design.md` B4 with ruling R2's values (device_time ceiling = W; **jobs GPS ceiling = W**;
ping 240 h; future tolerance untouched). **In a mixed fleet the pilot is a K=yes phone**; K=no
phones run only as P4b rows after every K=yes row.
**Scope** (O-10 B4–E in order; Pilot table first):
1. **Field protocol** (`w2/O-01-design.md` steps 0–4, 55 min, adb, tech on shift): step 0 keeps
   FixFlow's network cut while the app is opened; start/end times logged (→ `--test-window`).
2. B4 restart with the staged window; B5 pre-drain snapshot per the runbook (`predrain-<stamp>.pgdump`
   to `archive/pre-drain/` — never via `run_db_backup`) **and `drain_audit.py --snapshot-fuel`**;
   selfie PUT re-checked.
3. B6: the route flips 503 → backend; `T_open` recorded; **K=no & H=yes**: the old-host stub is
   switched to proxy mode now (mixed fleet: only after every K=yes phone's P4b row).
4. **K=yes** E1–E6: BEFORE photo; the tech clocked in with the ping task registered; the app's
   network **on** — with H=no, only immediately before the install (an edge-404 park then is
   expected and un-parked by D3); `adb install -r` with logcat captured before the app is opened
   (no sync before the manifest receipt — O-10 D4); open; E4 sign-in with the sealed slip; drain;
   pings resume after the update (ring); AFTER audit `drain_audit.py --test-window … --fuel-baseline …`
   — per-tech row delta since `T_open` equals the manifest's landed count; fuel-distance diff
   clean (changed closed/billed jobs listed for the manager). **K=no & H=yes**: O-10 BRANCH K=NO
   steps incl. S7, row-by-row Retry, AFTER against the A3 photos, owner sign-off, then uninstall
   + fresh install. **K=no & H=no**: transcribe the A3 photos, declare the loss, sign-off, fresh
   install.
5. Parked residue entered by the manager (cash first, via the P12a web path); then the
   **post-drain dump** and the **manifest export** per the runbook, keys under `archive/post-drain/`
   and `archive/manifests/` recorded in the row (HR-A3).
6. The written release notice handed to the pilot tech (rule 6).
**Deliverables.** The Pilot table; logcat and protocol findings; the test-row window.
**Done when.** Per branch: K=yes → AFTER matches; K=no/H=yes → rows match the photos and the
owner signed; K=no/H=no → every photographed row transcribed or declared lost and signed. **On an
AFTER mismatch:** done = mismatch tabulated per kind, a register row opened, fleet halted (O-10
R7); a server-side fix is cherry-picked onto `release/drain` and re-tagged (rule 3); an APK-side
fix goes to `main`, gets a new versionCode and a P2c re-run; the pilot **re-run session** repeats
step 2 (fresh B5 + `--snapshot-fuel`) and steps 4–6 on the **next undrained phone** (the first
phone's queues are gone; O-10 D4 writes the manifest once per versionCode) and adds a row to the
Pilot table — P4b's Entry requires "P4a passed".
**Owner inputs.** Pilot tech and phone, manager, adb laptop.
**Workflow.** The session guides; Sonnet tabulates logcat. **Resume.** The Pilot table.

## P4b (×n) — Fleet drain, one session per workshop visit

**Entry.** **P4a passed** (AFTER matched). **Scope.** For each roster phone present: its E1–E6 row
(BEFORE photo, manifest receipt id or photo set, install result, sign-in — shared phones: each
tech in turn (E4 copy) —, AFTER audit, residue entered, **post-drain dump and manifest-export keys**, release notice), per
the phone's branch;
a phone STOPs and re-checks K only on a cert mismatch, `INSTALL_FAILED_UPDATE_INCOMPATIBLE` or a
downgrade (O-10 E2) and then follows the K=no row in its own supervised session; a phone the
owner declares undrainable gets a retired row. **Mixed fleet:** when the last K=yes phone has its
row, the stub is switched to proxy (recorded); K=no rows run only after that. **Done when** (per
session). Every present phone's row filled. **Done when (phase).** Every roster phone has a P4b
or retired row, or `T_close` has arrived (the rest go to P4r). **Resume.** The per-phone table.

## P4c — Window close, ceilings, re-seed, deploy train (owner + session; one session)

**Entry.** `T_open + 7 days` (extendable once in writing; an extension also moves
`FIXFLOW_LEGACY_JWT_EXPIRES_AT`, restart recorded) or every roster phone drained/retired.
**Scope.** Late-sync audit query; `T_close` recorded; ceilings set **device_time 336 h, jobs GPS
48 h, ping 240 h**, restart, values read back from deep-health; per-tech **min/max device_time
of the drained rows** recorded (for P6b-1's payroll regeneration); `payroll_export` rows created
in the window listed (runbook queries, O-10 F); **cursor re-seeded** (rule 4); the old-host stub
**switched to hang** (or kept hanging) while any roster phone lacks a P4b/P4r/retired row,
**removed** only when none does; `FIXFLOW_LEGACY_JWT_SECRET` unset on the box; the **sealed old
secret**: destroyed and recorded if the §4 `O10-F15` answer is "no" (or no phone is K=no & H=yes
& v2=no), otherwise kept until the last P4r destroys it; then the **deploy train**: `main` HEAD
deployed **once** per runbook R5 (`start.sh` applies the pending migrations in chain order),
`/api/ops/health` sha and `docker inspect` digest recorded, then **each row's post-deploy check
run** — the checks are read-only (P8a: schema at the new head, `voided_by/at` columns present;
P8b: a manual verify run `docker compose exec backend python -c "…verify_ledger_chain…"`; P9b:
the reconciliation GET returns 200 with zero deltas; the approval check waits for P10b); a
failing check **halts the train** (runbook rollback), and the remaining rows continue as
**P4c-train (×n)** sessions, per-row tags `train-<n>` only on a failure; the **last row rebuilds
the web image from `main`** and checks the board shows `sampler_state`; `release/drain` and
`release/drain-web` retired.
**Done when.** All of the above recorded in W0-results. **Resume.** The step table.

## P4r (×n) — Late re-open, one session per late phone

**Entry.** P4c done; a roster phone with no P4b/retired row. **Scope.** Supervised, with the
phone's branch row: the APK is **v2 only if P5c passed**, else fleet v1 (must happen before P7b-1
removes the roster the v1 login uses); **K=no & H=yes**: before the proxy switch, every other
roster phone lacking a row has its network cut re-imposed and verified (recorded), or the session
waits; then the stub switched to proxy and, on the §4 "yes", `FIXFLOW_LEGACY_JWT_SECRET` re-set
with a session-length expiry — both reverted to hang/unset at the end; the **global** window
settings staged (O-10 F: ceilings are global) and restart; fresh B5 snapshot + `--snapshot-fuel`;
drain; AFTER audit with `--test-window` and `--fuel-baseline`; residue entered; post-drain dump and manifest
export (keys recorded); release notice;
per-tech min/max device_time recorded; if P6b-1 is deployed, the manager `accept` pass and
payroll regeneration (version + 1) for the touched windows; ceilings restored and read back;
cursor re-seeded (rule 4); row recorded. **If every roster phone now has a P4b/P4r/retired
row:** the stub is removed (or, by owner decision, kept hanging while a lost retired phone
still runs the field build, `O05-07`), the sealed old secret destroyed, both recorded; this is
rule 4's "last re-open". **Done when.** The row is filled and every temporary setting reverted.

## P5-spike — Commercial background-location SDK spike (spare phone; debug build; one session) — or "declined" in §4

**Goal.** Settle HR-A1b's open question with device evidence instead of a desk opinion: does
`react-native-background-geolocation` build on this toolchain and keep its foreground service and
geofence callbacks alive where the Expo engine loses them?
**Entry.** P4a done (the spare phone is free again); the §4 row answered "run it" (a "declined"
answer skips this phase and P5a's Entry reads it as done).
**Scope** (table first): a debug build under a **separate applicationId** that points at a local
Docker backend or at no backend — it never signs in to `api.<domain>` and never as a roster tech
during the drain window (an extra row would break a per-tech AFTER check, O-10 R7); O-01 steps 3d
and 4b–4d and a travel-leg cross-stop check on the spare phone's OEM; build and licence facts
recorded.
**Done when.** A W0-results row with: builds yes/no on SDK 52 / RN 0.76.9 old-architecture;
FGS survives a restart yes/no; the fence survives a location toggle yes/no; cross-stop absent
yes/no; licence cost; a recommendation. "Favourable" means **compatibility only**; a
reliability-based engine swap still needs fleet-OEM evidence (standing rule 2) and is decided in
P5a's Entry.
**Owner inputs.** The spare phone; the licence quote. **Workflow.** Opus builds; the session
judges. **Size.** One session. **Resume.** The row.

## P5a — Geofence and sampler fixes (mobile code; one PR) + compile gate

**Goal.** The arrival prompt fires for real arrivals, the sampler regains its foreground service
when the app comes back, a lost fence repairs itself.
**Entry.** P2b-1 merged (fleet profile); **P6a merged** (shared verdict rule + fixture, ruling R1);
P4a done (protocol findings in W0-results); the §4 SDK row answered (P5-spike done or "declined")
— a swap would change these fixes, so it is decided here, not after P5a merges.
**Scope** — `w2/O-01-design.md` FIX ORDER 1–4 and 7, IN-APP LOGGING:
1. Record-first with **one bounded fix** (HR-A1a): `getLastKnownPositionAsync` (max age 2 min,
   accuracy ≤ 100 m), else `getCurrentPositionAsync` under an 8 s timeout, else null coordinates;
   the presence row is enqueued **after the bounded fix returns**, carrying its lat/lng/accuracy
   (the 8 s timeout bounds the wait; only a timeout yields null coordinates); local duty check;
   debounce stamp **after** enqueue; a fix older than the handler's start time (minus a small margin;
   Expo's geofence event carries no timestamp) never suppresses — it counts as unknown; **the 20 s dwell re-check and the second fix are
   deleted** (`O01-F05`, `O01-F10`, `O01-F16`, `O01-F18`).
2. The verdict rule from the P6a fixture (three-state; 100 m accuracy ceiling) applied to that
   single fix **only to suppress**: inside and unknown both **prompt** (unknown with softer
   copy), a definitive outside suppresses; the server recomputes every row (`O01-F04`). Depart:
   the row is judged by R1; the exit hysteresis threshold only suppresses the leaving prompt and
   the travel nudge (R1 note, §6.5).
3. FGS re-arm on `active` within the 14 h / 4 h bounds (drop the `isRunning()` early return,
   `O01-F01`) **with the #49424 guard and #52230 stop fallback** as patch-package patches
   (`patches/` + `postinstall`; `O01-F15`); sampler-gap notice. Also the **FGS cross-stop**
   (`O01-F20`, HR-A1b): a `dutyStatus`-gated `reassertPingForeground(techId)` in `pingTracker`
   (expired duty → `autoStopExpiredDuty`, never a re-arm; on duty **and foregrounded** → a forced
   re-register with the foreground option, bypassing the `isRunning()` guard), called from
   `stopJobTravel` through the attendance barrel; a leg that ends in the background (the headless
   failsafe paths) is repaired by the re-arm on the next `active`; a Jest test that an expired
   duty does not re-arm (consolidating both tasks into one mode-switching sampler is allowed, not
   required).
4. Error-branch re-register, provider banner, periodic re-check every 15 min (O-01 FIX ORDER 4;
   the interval the §4 re-registration threshold assumes) (`O01-F03`).
7. Awaited syncs and foreground drains for pings and presence (`O01-F08`); every fix of a
   batched delivery (`O01-F13`).
- Diagnostics ring (`diag.bg.v1`), telemetry events (`sampler_gap`, `geofence_error`,
  `crossing_recorded`, `notify_suppressed`) whose names are committed as
  `technician-app/src/shared/contracts/telemetry-events.json` (next to the P6a fixture
  `verdict-vectors.json` in the same folder, so Metro bundles both); the mobile test lands here,
  the backend test that reads the same files by repo-relative path lands in P6b-2; hidden
  Diagnostics screen, which ships in the release build and carries a **"stop travel in 60 s"**
  action so P5c can end a leg with the app backgrounded.
**Deliverables.** Code, patches, Jest tests (vectors from the fixture; a crossing whose fix
resolves within the bound lands with non-null coordinates; a stale outside fix still prompts),
the event-names JSON.
**Done when.** Mobile gates and CI green; **`eas build --profile fleet` compiles** (id recorded,
not installed — the native patches' first compile).
**Workflow.** Opus implements; Sonnet tests; Opus reviewer with CLAUDE.md's location invariants.
**Size.** Large. If long, defer **only fix 7 and the Diagnostics Share screen** to P5b-1.
**Resume.** Branch `fix/mobile-geofence-v2`. **Backlog.** `O01-F19`.

## P5b-1 — Permissions, OEM onboarding, remaining patches, typed-id login (mobile code; one PR)

**Entry.** P5a merged.
**Scope** — `w2/O-01-design.md` fixes 5–6, H11; G2 §5; ruling R3:
- Background/precise-location banners with one-tap re-request; hibernation exemption; an
  "Approximate" grant blocks geofencing with a banner (`O01-F06`, `O01-F07`).
- Manufacturer-specific onboarding step + ClockScreen re-offer (autostart, battery saver, lock in
  recents) with a self-attested checklist in telemetry (`O01-F02`), for the P0a roster OEMs.
- Patches: untracked second event (`O01-F09`), shared static timestamp (`O01-F12`), #50060
  (`O01-F14`), network constraint (`O01-F17`); cleanups `O01-F11`, duplicate channel helper.
- **Typed-id login**: the login screen takes the technician id from the sealed slip (no roster
  call; mobile-only).
- Anything deferred from P5a.
**Done when.** Mobile gates and CI green; **`eas build --profile fleet` compiles** (id recorded,
not installed — the four native patches' first compile; CLAUDE.md: `expo export` does not catch
Gradle breaks); merged.
**Workflow.** Opus for native patches and login; Sonnet for screens; Opus reviewer.
**Size.** Medium. **Resume.** Branch `fix/mobile-permissions-oem`.

## P5b-2 — Shift reminder, boundary rules, APK-side fields (mobile code; one PR) + v2 build

**Entry.** P5b-1 merged.
**Scope:**
- **Shift-start reminder** (HR-A1c; §4 default yes): `expo-notifications` WEEKLY triggers at
  shift start + grace on working days from the cached shift, cancelled by the clock-in punch,
  rescheduled on foreground and login; a pure scheduling function with Jest tests.
- **Mobile boundary enforcement** (HR §5): `dependency-cruiser` as a devDependency with rules
  mirroring the backend import-linter contracts, written as **import rules**: screens and
  components may not import the write functions of `lib/*Api`; only `lib/outbox*`,
  `features/*/sync*` and `pendingMedia` may; raw `fetch` stays confined to `lib/api.ts` and
  `lib/outboxSync.ts`; the jobs → attendance edge for `reassertPingForeground` is allowed
  consciously; run in CI beside the mobile job.
- **Negotiate reason field** sent with below-original negotiations (P7a flags its absence; never
  required).
- Job list and detail **render minimised unclaimed rows** (no phone/address until claimed) so
  P7b-1 can turn the PII setting on.
**Done when.** Mobile gates and CI green; **fleet v2 build submitted and finished green**
(`eas build:list`), bundle grep and cert check recorded.
**Workflow.** Opus for the reminder and the rules; Sonnet for screens; Opus reviewer.
**Size.** Medium. **Resume.** Branch `feat/mobile-reminder-rules`.

## P5c — Pilot validation of v2 (pilot phone; one session)

**Entry.** P5b-2's v2 build finished green; **P4c done and P6a deployed** (by the train or per
runbook R5, so the server applies the shared rule); the pilot tech on shift; the adb laptop at
the workshop.
**Scope.** Install-over on the pilot (rule 1); the O-01 protocol gates the fixes address: 3d
(foreground service back within 15 s of opening after an OS kill); 4b–4d (a location toggle
re-registers the fence without opening the app, or the 15-min re-check catches it); the indoor
test (~40 m from the centre on a Wi-Fi fix: prompt fires, the presence row carries non-null
coordinates, server verdict inside or unknown);
device items `O01-F14`, `O01-F12`, `O01-F16` recorded. 3b/3c are P5d-1b. The **cross-stop
check** (`O01-F20`): start and end a travel leg while on duty, once from the foreground and once
with the app backgrounded (the Diagnostics screen's "stop travel in 60 s" action, then background
the app before it fires); `adb shell
dumpsys activity services` then shows `LocationTaskService` with `isForeground=true` —
immediately in the first case, after the next foreground in the second.
**Done when.** 3d, 4b–4d, the indoor test and the cross-stop check pass; device items recorded (W0-results "v2 pilot").
**Owner inputs.** Pilot tech, adb laptop. **Resume.** The section.

## P5d-1a (×n) — Fleet install of v2, one session per workshop visit

**Entry.** P5c passed; **P6b-2 deployed** (sampler-health read); every roster phone has a P4b, P4r
or retired row.
**Scope.** Per phone present: versionCode check, Drain Report empty, `adb install -r` or
tap-to-update, never uninstall, onboarding step completed, row in
`docs/program/FIELD-VALIDATION.md`. **`T0`** is recorded when the last non-retired phone is on v2.
**Done when (session).** Every present phone's row filled. **Done when (phase).** Every roster
phone is on v2 or retired; `T0` recorded. **Owner inputs.** Techs with phones, adb laptop.
**Resume.** FIELD-VALIDATION.md.

## P5d-1b (×n) — Per-OEM protocol runs (one session per one or two OEMs, within T0 + 48 h)

**Entry.** P5d-1a complete (`T0`). **Scope.** The O-01 protocol steps 1–4 incl. 3b/3c on one phone
per OEM in the roster (the pilot's OEM included), tech on shift, adb attached; rows in
FIELD-VALIDATION.md **with the protocol's start/end time per phone** (P5d-2 excludes those
windows from its metrics, as `--test-window` does for the drain). **Done when.** Every OEM has a
row.

## P5d-2 — 48 h review (one session, at T0 + 48 h with every OEM row present)

**Scope.** Ring telemetry per phone and the P6b-2 sampler-health read over the same days,
**excluding the P5d-1b protocol windows**, against the §4 definitions and thresholds:
`sampler_gap` per on-duty hour; % of real arrivals
(arrival punches with server verdict inside/unknown) with `crossing_recorded`; % of
`geofence_error` re-registered within 15 min; **kill rate** = on-duty hours with a sampler gap
and no foreground service ÷ on-duty hours, per OEM; **suppressed-arrival rate** = arrivals
followed by a clock-in within 15 min whose crossing carried `notify_suppressed` ÷ such arrivals
(the case the deleted dwell used to protect, HR-A1a).
**Deliverables.** FIELD-VALIDATION.md: a row per OEM, pass/fail per metric, a named follow-up per
fail. **Done when.** Every OEM has a row; the §1 milestone is marked reached **only if the
thresholds pass**; otherwise the follow-ups become a P5e scope.
**Workflow.** Sonnet tabulates; the session judges.

## P6a — Attendance truth, migration-free (backend + small web; one PR)

**Entry.** P1 merged; P2b-1 merged (the Discard event name is fixed). Merge to `main` any time;
**deployed by the P4c train** (rule 3; its web half rides the train too).
**Scope** — `w2/O-04-design.md` §1(a), code-only list, `O04-F9`; ruling R1:
- The **shared verdict rule** as one pure module + a JSON fixture of test vectors at
  `technician-app/src/shared/contracts/verdict-vectors.json` (bundled by Metro for P5a; read by
  the backend tests by repo-relative path): inside if d + a ≤ r, outside if d − a > r, else
  unknown; 100 m accuracy ceiling; versioned; the job-punch rule unified with it (`O04-F9`,
  `O01-F04`).
- **Wi-Fi presence input** (`O04-F18`, HR-A1c): a `wifi_match=true` against the fence's existing
  `wifi_bssids` column promotes an **unknown** attendance punch or presence crossing to inside —
  never a definite outside, never a row with `is_mock_location`, never a job punch; it is a
  vector in the versioned fixture so R1 stays one rule on both sides; a redacted BSSID
  (`02:00:00:00:00:00`) is stored as null, never a miss; inert until P0a item 14 records the
  BSSIDs (P3b step 5 writes them).
- `sampler_state`, `last_ping_at`, `pings_today` on BoardRow (one `DISTINCT ON` query, `O04-F4`);
  open-shift breakdown with `window_end = min(now, first_in + 14 h)`; closed zero-ping day →
  coverage 0 `no_pings`; UNKNOWN interval for all-`None` runs (`O04-F3`).
- Timezone validator and single shop-timezone source (`O04-F8`); web renders `effective_time`
  (`O04-F10`); per-tech **discard count** on the board from the P2b-1 telemetry events
  (`w2/O-06-design.md` item 6).
**Done when.** Gates and CI green; the board shows `sampler_state` for a stopped sampler in a
test; **merged; deploy-train row added** (or deployed per runbook R5, after `T_close`).
**Workflow.** Opus for the rule and derivation; Sonnet web + tests; Opus reviewer.
**Size.** Medium. **Resume.** Branch `feat/attendance-truth-1`.

## P6b-1 — Attendance migration: late flags, adjustments, payroll version and regeneration (backend; one PR; one migration)

**Entry.** P6a merged; P4c done (`T_close`, per-tech drained-row date ranges recorded).
**Scope** — `w2/O-04-design.md` §2, §3:
- `late_sync`/`late_batch` flags **derived retroactively** from `received_at` vs `device_time`
  (`O04-F1`, `O04-F2`, `O04-F5`); punches kept at `device_time` within a 14-day window
  (code default **336 h**; env value confirmed from deep-health in Done-when); payroll exclusion:
  `late_sync` days stay out until an `accept` adjustment exists.
- Adjustments: actor from the principal, `client_id`, `action ∈ {add, replace, void, accept}`,
  `derive` honouring replace/void (`O04-F6`, `O04-F7`/`O6-F10`, `O04-F15`).
- **`payroll_export.version`** + `UNIQUE(shop_id, from_date, to_date, version)` replacing the
  window key (`O04-F11`); regeneration for every window covering the **P4c and P4r** date ranges
  **and** any `late_sync` row received between `T_close` and this deploy, **after a manager
  `accept` pass** (its own W0-results step); regenerated exports get version 2. (A P4r after this
  deploy runs its own accept pass and regeneration.)
- Per-session duty windows (`O04-F13`).
**Done when.** Gates incl. `alembic check` and CI green; deployed per runbook R5; env/default
read back as 336; the accept pass done and regenerated exports listed.
**Workflow.** Opus throughout. **Size.** Large. **Resume.** Branch `feat/attendance-truth-2`.
**Backlog.** `O04-F14`, `O04-F17`, `O6-F12`/`O6-F13` (mock-location in the verdict; billed fuel).

## P6b-2 — Heartbeat index, sampler-health read, dispatcher guard, audit script (backend; one PR; one migration)

**Entry.** P6b-1 merged; P5a merged (the event-names JSON exists).
**Scope.** Heartbeat events mapped to O-04's names from the shared JSON (the backend-side test
that reads `telemetry-events.json` and `verdict-vectors.json` by repo-relative path and fails on
drift); the `app_event` index; a per-tech per-day **sampler-health read** (`O04-F4`;
`w2/O-01-design.md` "Server side"); the
dispatcher's stale-event guard keyed on the event's own time, not insert time (`O10-F7`); the
**audit script** (dry-run, read-only) counting duplicate active fences, `job_payment` rows with
amount ≤ 0 and `recorded_by` orphans (for P13d).
**Done when.** Gates and CI green; deployed per runbook R5; the audit script run on the box and
its output recorded. **Workflow.** Opus. **Size.** Medium. **Resume.** Branch `feat/attendance-truth-3`.

## P7a — Authorization model and money guards (backend; one PR; migration-free)

**Entry.** P1 merged. Deployed by the P4c train or after `T_close`.
**Scope (register).**
- `require_job_actor(job, principal)` (assigned tech or manager) on negotiate, payments,
  completion, transition/abandon, customer pin, notes, messaging send/send-log, media list,
  `complete_upload` (`O05-05`, `O6-F02`/`F03`/`F04`, `O07-F3`, `O05-13`). `GET /api/jobs/{id}` and
  per-job reads: another tech's **claimed** job → 403 regardless; an **unclaimed** job returns the
  full detail when the PII setting is off and a **minimised** JobDetail when it is on (the field
  APK opens unclaimed detail before claiming) (`O05-06`).
- `log_payment`/`void_payment` refuse a closed job with the `(current status: closed)` detail
  (`O04-F16`, `O6-F03`, `O07-F5`); payment `client_id` reuse across job/amount → 409 (`O07-F15`).
  The closed-job guards on negotiate, `log_payment` and `void_payment` are **atomic** (`O07-F16`,
  HR-A4): a conditional UPDATE with the status predicate (the `try_transition` pattern,
  preferred); where `SELECT … FOR UPDATE` is used instead it must `populate_existing()` so a job
  already in the identity map is re-read; the race test against a concurrent close runs **two
  sessions** under READ COMMITTED; today `negotiate_bill` is check-then-set with no lock.
- Negotiation below original by the assigned tech is **accepted and flagged** in the negotiate
  `job_event` payload (reason = the optional note; a missing note is flagged, never refused); a
  per-shop cap setting, when set, requires a manager beyond it (`O07-F4`). The persisted reason
  lands in P8b's `job_bill_revision`.
- Tech-scoped `GET /api/jobs`: pagination opt-in via query parameter; **PII minimised until
  claimed — list and detail together — behind a per-shop setting, default off** (P7b-1 turns it
  on; §4).
- `manager_id` from the principal for non-attendance writes (`w2/O-06-design.md` item 4).
**Deliverables.** Code; integration tests per denied path **and** a request replay of the field
APK's own-job flow (open unclaimed detail → claim → negotiate below original **without a note** →
payment → completion → transition) run with the PII setting off **and** on, proving nothing the
APK does is newly refused.
**Done when.** Gates and CI green; merged; deploy-train row added (or deployed, after `T_close`).
**Workflow.** Opus; Sonnet tests; Opus reviewer hunting field flows the checks would break.
**Size.** Medium. **Resume.** Branch `fix/service-layer-authz`. **Backlog.** `O05-15`.

## P7b-1 — Login, lock and session hardening (backend + web login; one PR)

**Entry.** P7a merged; P3c's XFF record; P3b rotation done; **every roster phone has a P4b, P4r or
retired row and is on v2 or retired** (P5d-1a complete) — the v1 login still loads the roster.
**Scope** — G2 §5; `w2/O-05-design.md`:
- Lock keyed per (account, source) with the per-account invariant kept; source =
  `CF-Connecting-IP` when the peer is cloudflared (P3c), else single-hop XFF; an `app_event`/ops
  alert when an account locks (`O05-03`, `O05-04`).
- Roster endpoint **removed**; the **web manager login takes a typed id** (small web change in
  this PR; rides the deploy); the mobile side is P5b-1.
- `set_pin` requires the current PIN for self-service; `POST /api/auth/logout` bumps
  `token_version`; shorter manager token TTL (`O05-10`).
- The **PII-minimisation setting turned on** on the box and recorded (closes `O05-06`; the only
  phase that turns it on).
**Deliverables.** Code and tests, incl. a spray test showing per-account guesses per day across
N sources do not exceed the per-account ceiling.
**Done when.** Gates and CI green; deployed per runbook R5; setting on.
**Workflow.** Opus; Sonnet for the web login; Opus reviewer. **Size.** Medium.
**Resume.** Branch `fix/auth-lock`.

## P7b-2 — Ops console, media, web dependencies, Cloudflare rules (ops-server + backend + web; one PR)

**Entry.** P3c done. **Scope.** ops-server: per-IP backoff, 16 KB body cap, `OPS_SESSION_SECRET`
required, internal network only, status ignores unconfigured Railway pages (`O05-09`, `O6-F17`,
`O08-F08`, `O08-F09`). Media: reservation caps, length-bounded presign, 413 commit fix,
stale-pending sweep (`O05-12`, `O05-13`, T44-media-1/2). Web: react-router bump (`O05-18`).
Cloudflare rules documented (429 + Retry-After only; `app.`/`ops.` behind Access). **Done when.**
Gates and CI green; backend part: merged; deploy-train row added (or deployed after `T_close`);
the **web part rides the train** before `T_close` (or is cherry-picked as web-only onto
`release/drain-web`); the ops part may deploy any time. **Workflow.** Sonnet; Opus reviews media.
**Resume.** Branch `fix/ops-media-hardening`.

## P8a — Money integrity 1 (backend; one PR; one migration)

**Entry.** P7a merged. **Scope** — `w2/O-06-design.md` items 1–2, `w2/O-07-design.md` part 6:
`job_payment.voided_at`/`voided_by` (FK `NOT VALID` + `VALIDATE` same migration; all-NULL
column) stamped by `void_payment` with a required `reason` (`O6-F08`, `O07-F5`); payment/void
`job_event` payloads `{payment_id, amount_paisa, method, reason}`; optional `captured_at`
trust-windowed (`O07-F7`); **`job_payment.recorded_by` FK added `NOT VALID`** (validated in
P13d after the audit); the historical-void backfill script (dry-run default).
**Done when.** Gates incl. `alembic check`, CI green (a test proves a void stamps `voided_by/at`
and its payload); merged; deploy-train row added (or deployed after `T_close`); the row's
post-deploy check is **read-only**: schema at the new head, the columns present; the next real
void is reviewed by the manager.
**Workflow.** Opus. **Resume.** Branch `feat/money-integrity-1`.

## P8b — Money integrity 2 (backend; one PR; one migration)

**Entry.** P8a merged; the §4 anchor row answered (SMTP relay credentials, **or** "unanchored"
recorded).
**Scope** — `w2/O-06-design.md` items 2, 5:
- Append-only `job_bill_revision` on every **real** completion upsert, negotiate and bill send
  (an idempotent byte-identical replay writes **no** revision; CLAUDE.md bill freeze); reason
  required on manager override and on post-send negotiate from the web (`O6-F09`). Every write to
  `job.bill_*` goes through **one service function** that appends the revision in the same
  transaction (HR-A4); P9a-2 stages invoice-kind postings from the revision only.
- `attendance/chain.py` generalised: one per-shop chain over `staff_ledger`, `job_payment`
  create/void and `job_bill_revision` (`O6-F07`, `O6-F08`); the migration **backfills** chain
  entries for existing payments with the pinned serialisation (0041 precedent); the verify test
  runs on a DB seeded with pre-existing payments.
- Daily `ledger-chain-verify` scheduler job writing to `app_event` and delivering the head hash
  by a minimal stdlib **`core/mailer.py`** (SMTP relay from `/etc/fixflow`; a fake for tests);
  without credentials the verify output and CLAUDE.md say **"unanchored"**.
**Done when.** Gates and CI green; merged; deploy-train row added (or deployed after `T_close`);
post-deploy check: a **manual verify run** (`docker compose exec backend python -c
"…verify_ledger_chain…"`) delivers one head hash, **or** shows "unanchored" in its output and
CLAUDE.md.
**Workflow.** Opus. **Size.** Large. If long, land revisions + chain first and open **P8b-2**
(Entry: P8b merged; Scope: the verify job and mailer; Done: the head-hash/unanchored check,
merged; deploy-train row added or deployed after `T_close`) — P8b's own Done-when then drops
that check, and **P9a-2's Entry adds "P8b-2 merged"** (the stager calls verify first).
**Resume.** Branch `feat/money-integrity-2`.

## P9-0a — Week-export script (backend; one small PR; no deploy needed)

**Entry.** P3b done (a verified dump exists). **Scope.** `backend/scripts/export_week_csv.py`:
read-only; `--out <dir>`; exports one week — non-voided payments, voids, staff-ledger rows — into
the O-07 CSV column shape with UUID External IDs; `--pseudonymise` replaces technician ids and
names with stable tokens (P9-0b decides whether real rows may reach an Odoo trial); refuses an
empty week (at least one payment, one void and one ledger row, else `--seed-week` appends a
seeded fixture week and says so in the output). It runs on the owner's laptop against an
**Appendix C restore** of the latest R2 dump, never against production. **Done when.** Gates and
CI green; a test proves the double-import keys are stable; merged (no deploy-train row: it is not
part of the image). **Workflow.** Opus (money-adjacent code, §0 routing); Opus reviewer.
**Size.** Small. **Resume.** Branch `feat/week-export-script`.

## P9-0b — Odoo and books rehearsal (owner + accountant session; the decide-before-build gate)

**Goal.** Know the consumer before building the posting engine: whether Odoo exists and on which
plan, what the accountant wants, at what granularity, on what basis, and how field cash reaches
the shop (HR-A4).
**Entry.** P9-0a merged; P0a items 15–16 answered or dated unknown (this session turns unknowns
into answers).
**Scope** (table first): 1. The G1 §5 Odoo questions 1–3 answered. 2. An Odoo test company on the
Pakistani chart (`l10n_pk`; an Odoo Online trial or One App Free with Invoicing is enough).
3. The owner decides whether real staff and payment rows may be sent to the Odoo trial, else the
export runs `--pseudonymise`; the P9-0a export of one real week from an Appendix C restore, row
counts recorded. 4. The owner (with the accountant if there is one) imports it **twice**:
update-not-duplicate confirmed by hand. 5. Granularity (per payment, or one daily-close move per
method), the approval unit, the basis (cash or accrual) and the custody design (O-07 amendment
2) are decided — by the accountant where one exists, else by the owner signing that the §4
defaults stand (manager approver, per posting, weekly export, cash basis, `l10n_pk`, not
registered, custody yes), recorded as answers.
**Done when.** The §4 rows "pakka record set, basis, start date", "approver, unit and export
cadence" and "tax regime and chart" hold answers in W0-results; the chosen granularity and
custody design are recorded as a dated amendment to `w2/O-07-design.md`. If there is no Odoo and
no accountant: P9a/P9b ship the approval boundary and reconciliation, P10a ships the journal CSV
export, transport seam and exports page as written, and only `RUNBOOK-ODOO-IMPORT`, P10b and P11
are dropped (recorded here; the §1 milestone then ends at P10a).
**Owner inputs.** Odoo access, the accountant's time. **Workflow.** The session guides.
**Size.** One owner session. **Resume.** The table.

## P9a-1 — Accounting slice 1: posting tables, triggers, decision API (backend; one PR; one migration)

**Entry.** P8b merged; **P9-0b done** (its §4 rows answered); **P5d-2 done** (verdict recorded,
pass or P5e scoped) and no fleet install session in flight (HR-A4: the accounting chain never
competes with the fleet work). **Scope** — `w2/O-07-design.md` parts 1, 2 (decision step), 6: `posting`,
`posting_decision`, `posting_attempt`, `posting_export` with immutability triggers; gapless
commit-ordered `posting.seq` under `pg_advisory_xact_lock`; UUID External IDs (`O07-F11`); the
`accounting` slice and import-linter edges; decision API: approve / reject (typed reason) / bulk
approve with count + sum, 409 on drift; approval resolves `account_code_<role>` settings and is
refused while a role is unmapped; **self-approval flagged, not blocked** by default (ruling R9);
settings keys incl. `account_code_*` (`O07-F14`); **when P9-0b's recorded custody answer is yes** (`O07-F17`): the
`cash_remittance` source (migration, service, endpoint, tests) with the `cash_with_staff[tech]`
and `receipts_clearing` account roles.
**Deliverables.** Migration, code, real-Postgres trigger and API tests, CLAUDE.md (head, slice
list, invariant "no money feed on the `job_event` cursor", `O07-F6`).
**Done when.** Gates and CI green; fixture postings approve/reject; `UPDATE posting` refused in
real Postgres; merged; deploy-train row added (or deployed after `T_close`). **Workflow.** Opus;
Sonnet tests; Opus reviewer with BACKEND-REQUIREMENTS §3.15. **Size.** Medium-large.
**Resume.** Branch `feat/accounting-1`.

## P9a-2 — Accounting slice 2: stager (backend; one PR)

**Entry.** P9a-1 merged (and P8b-2 if opened); basis and start date as answered in P9-0b;
reason-code defaults ship; idle without a start date. **Scope** — part 2: the state-based stager (anti-join;
`O07-F1`, `O07-F2`) for the kinds P9-0b selected (the invoice kind only on an accrual
basis decision, HR-A4; the `cash_remittance` rows when P9-0b's recorded custody answer is yes); calls `verify_ledger_chain` first and refuses to stage on
failure; poison-row skipping; `restage` → new posting at `source_rev + 1`; reversal on void;
on an accrual decision only: accrual close stages an invoice. **Done when.** Gates and CI green; in a test with a start date,
payments and ledger rows stage, a void stages a reversal, an unmapped role refuses approval;
merged; deploy-train row added (or deployed after `T_close`). **Workflow.** Opus.
**Resume.** Branch `feat/accounting-2`. **Backlog.** `O07-F9`.

## P9b — Approval and reconciliation UI (web + backend read API; one PR)

**Entry.** P9a-2 merged. **Scope.** `GET /api/postings/reconciliation` (part 5; **Opus**) and
the web pages: staged queue with per-row reject, bulk approve with count and sum, reconciliation
view with the rejected-sum line first, flagged self-approvals visible; the **manager remittance form** when P9-0b chose custody
(`O07-F17`); own polling. **Done when.**
Gates green (a test approves a staged posting and the delta moves); merged; deploy-train row
added (or deployed after `T_close`); post-deploy check is **read-only**: the reconciliation GET
returns 200 with zero deltas (the stager is idle until a start date; the live approval check is
P10b's). **Workflow.** Opus endpoint; Sonnet pages. **Resume.** Branch `feat/accounting-ui`.

## P10a — CSV export, transport seam, exports page (backend + web; one PR)

**Entry.** P9a-2 merged; the Odoo version (§4; draft with the current release's labels if
unknown). **Scope** — parts 3, 4 (seam), 7 "build regardless": `run_posting_export` (window on
`decided_at`, advisory lock, record-first, deterministic bytes, sha256, `manifest.json`/`.csv` —
the manifest **carries the `posting_decision` ids** of the batch, ruling R9), acknowledgement
endpoint, signed download URLs; `core/posting_transport.py` Protocol with `CsvExportTransport`
(default) and a fake with tests; attempt log; lag alert (halt/rotation alerts may move to P11);
exports list page; `docs/RUNBOOK-ODOO-IMPORT.md` draft.
**Done when.** Gates and CI green; golden-file test proves deterministic bytes; merged;
deploy-train row added (or deployed after `T_close`).
**Workflow.** Opus; Sonnet runbook + page. **Resume.** Branch `feat/accounting-csv-export`.

## P10b — Odoo import rehearsal (owner session)

**Entry.** P10a and **P9b deployed**; one window's postings approved in the UI; Odoo test company
with chart of accounts and journals; account map set. **Scope.** Export one window; import it
**twice** following the runbook click by click; confirm update-not-duplicate on External ID;
manifest sums equal the import. **Done when.** The double import shows updates. **Resume.** The
runbook.

## P11 — JSON-2 push adapter (optional; Custom plan only)

**Entry.** P10a merged; Custom plan with bot user and API key. **Scope.** `OdooJson2Transport`
behind the Protocol; `erp-push` job (default OFF; ~1 call/s); search-before-create;
`already_present` on retry; key-expiry and halt alerts. **Done when.** A posting round-trips to
the test company and a retry is `already_present`; merged; deploy-train row added (or deployed
after `T_close`). **Workflow.** Opus.

## P12 — Web manager defects (web; one PR)

**Entry.** P3c done. **Scope** (HANDOFF §4.1/§4.4 and W1 S-06; §5 addenda): A3 revenue tile (tech
metrics report); L3 board refresh/polling; the nine bare `catch {}` mutators surface
`serverReason`; token kept on network/5xx failure (`O08-F13`); T44-web-1 (incl. Haul-on-ready),
T44-web-2..4. (A4 is P12a.) **Done when.** Vitest green; manual tile check; web image rebuilt
(on `release/drain-web` before `T_close`, from `main` after) and deployed.
**Workflow.** Sonnet. **Resume.** Branch `fix/web-manager-defects`.

## P13a — DB role split (backend + ops; one PR; one migration)

**Entry.** P4c done (after `T_close`); P7b-2 merged. **Scope.** `fixflow_migrator` /
`fixflow_app` / `fixflow_backup` with `REVOKE` on append-only tables (`O6-F18`); `start.sh`
migrates as the migrator; the owner applies the roles per the runbook. **Done when.** The app role
cannot `UPDATE job_event` in a test; deployed per runbook R5. **Workflow.** Opus. **Resume.**
Branch `feat/db-roles`.

## P13b — Backup encryption, put-only token, retention, first drill (backend + ops; one PR + owner steps)

**Entry.** P13a. **Scope.** `age` encryption to the owner's offline key; a separate bucket/prefix
with a put-only token; lifecycle retention per §4 (`O6-F06`); **the hourly cron moved under the same encrypted put-only path and the VPS provider backups
switched off** once an encrypted hourly + nightly pair has passed a restore drill (a provider
snapshot holds plaintext `/etc/fixflow` and cannot be encrypted into R2; the deviation's bound); row-count restore gate; the first
restore drill logged in RUNBOOK-BACKUPS with the monthly drill as a calendar item. **Owner
inputs.** The age key pair; the second bucket/token. **Done when.** A drill restore from an
encrypted dump succeeds. **Resume.** Branch `feat/backup-hardening`.

## P13c — Monitoring upgrade, node:22 images, lock file (ops; one PR) — then P13d as a second PR

**Entry.** P13a. **Scope.** The P3c heartbeat upgraded to the §4 MON_LOC choice with paging
tested; node:22 images; a Python lock file (`O08-F11`); `O08-F10` (R2 endpoint from settings); CLAUDE.md paths normalised to repo-relative and the P1
path check turned fatal (the negative-mention allow-list stays).
Then **P13d** in the same session as a separate PR and deploy: Entry = P8a merged **and the P6b-2
audit script re-run on the box in this session, immediately before the deploy, clean** (fences,
amount ≤ 0, `recorded_by` orphans; remediation recorded if not); Scope = the one-active-fence
partial unique index, `VALIDATE job_payment_amount_positive` (`O07-F8`), `VALIDATE` the
`recorded_by` FK — **each in its own migration file** so one failure cannot block the others.
**Done when.** Monitor pages on a stopped container; images deployed; P13d's `alembic check`
green and deployed with the audit output attached. **Workflow.** Sonnet (P13c), Opus (P13d).
**Resume.** Branches `chore/ops-hardening`, `feat/deferred-validates`.

## P13e — Primary host move: VPS → home box (owner session; runbook R9) — skipped when W0-results records "no home box"

**Entry.** P5d-2 done; every roster phone has a P4b, P4r or retired row (the last re-open);
P13b done (dumps encrypted); the **§4 box gate** passed, read from the box-gate probe's 14-day
history (≥ 99.5 % reachability from the home box's site) or a second uplink recorded. **Scope**
(table first; runbook R9 step by step): `api.` routed to the 503 responder (a markerless 503 is
connectivity, nothing parks); the VPS backend stopped and its host crons disabled; `/etc/fixflow`
copied byte-for-byte; final dump + sha256; O-08 §3 production restore on the home box; Appendix B
counts equal the source; tunnel moved; deep-health sha and digest read back; heartbeat and hourly
crons installed on the home box; the VPS left as a read-only DB container
(`default_transaction_read_only=on`, no backend, no crons). **Done when.** Phones write to the
home box (a punch lands), the old host is read-only, the row is filled; a dated **P13e-close** row
14 days later records the VPS destroyed. **Owner inputs.** Box access, the Cloudflare dashboard,
the provider console. **Size.** One session plus the close row. **Resume.** The table.

## P14-n — Expo SDK upgrade, one phase per major; P14-fleet (×n)

**Entry.** P5d-2 done (verdict recorded; any P5e follow-up scoped). **Scope per major.** Upgrade one SDK major; typecheck, Jest, `expo
export`; re-check each P5a/P5b patch against upstream (drop when fixed, else re-apply —
**Opus**); `expo-av` → `expo-audio` when required (re-test the recorder); advisories; `fleet`
build submitted and id recorded. **No `expo-updates`** (ruling R7). **P14-final.** Install on the
pilot (rule 1); the P5c gate re-run (owner inputs: pilot tech, adb laptop). **P14-fleet (×n).**
Per-phone install rows as in P5d-1a, one session per visit. **Done when.** Build green; pilot
without regression; every roster phone on the new versionCode or retired.
**Resume.** Branch `chore/expo-sdk-<n>`.

**P14-log (backlog; Opus).** HR-A2's one command log: the six AsyncStorage queues migrate to one
expo-sqlite store with one dispatcher, single-flight per stable id, one classifier and a per-kind
park/drop policy. A drain-class change: Entry P5d-2 done and a P14-n build to ride; a per-phone manifest before
and after the upgrade under the P2b-1 manifest gate (rule 1; "the outbox never deletes a write"); rides a
P14-fleet install round. Not scheduled until a phase is opened for it.

---

## 4. What the owner decides, and when it blocks

| Decision | Blocks | Default if undecided |
| --- | --- | --- |
| Domain (Cloudflare DNS, multi-year, auto-renew) | P2b-1 (name), P2c, P3a | nothing can ship to phones |
| Host for the drain window and after: VPS (default) or the home box | P0b, P3b, P13e | **VPS from P3b until P13e** (HR-A3; 2 vCPU / 4 GB, Mumbai measured first). **Box gate** — the one condition for the home box in any role: the box-gate probe's 14-day history at ≥ 99.5 % reachability from the home box's site, or a second uplink. P13e moves to the home box not before the later of P5d-2 done and the last re-open; the owner may invert at P3b only if the home box already passes the gate; "no home box" keeps the VPS and skips P13e |
| Recovery case a / b / c | P3b | **none** — P3b blocks until P0a item 4 is answered; (a) wins when restorable |
| Highest job ticket number printed for a customer (case c) | P3b | — |
| Fence coordinates and radius (≥ 100 m) | P3b, P5a | P3b blocks |
| `O10-F15`: accept old-secret tokens for the window (K=no & H=yes & v2=no only) | P3b, P4a (the verifier itself is always built in P1, default OFF) | **no**: photograph, retry by hand, declare the loss |
| Geofence thresholds (P5d-2) | P5d-2 verdict | `sampler_gap` < 1 per on-duty hour per phone; ≥ 90 % of real arrivals `crossing_recorded`; ≥ 95 % of `geofence_error` re-registered within 15 min; kill rate < 5 % per OEM; suppressed-arrival rate ≤ 10 % |
| Commercial background-location SDK spike (P5-spike; separate applicationId, never `api.<domain>` during the window) | P5a entry | **run it** (HR-A1b; the licence cost is the owner's to check); "declined" → patched Expo as planned; a favourable spike proves compatibility only (standing rule 2) |
| Shift-start clock-in reminder (working days, cancelled by clock-in) | P5b-2 | **yes** (HR-A1c) |
| Workshop Wi-Fi: SSID/BSSIDs and which phones join (P0a item 14) | P3b step 5 (fence row); the P6a rule is inert without | record in P0a; "no Wi-Fi" disables the rule |
| Field cash custody: do techs hold cash or online receipts before remitting | P9-0b decides; P9a-1 / P9b build it | assume **yes** when P0a item 15 is unknown: `cash_remittance` source, `cash_with_staff[tech]`, `receipts_clearing` |
| Latency threshold (P3c) | P3c | POST p95 < 805 ms (ADR projection) from a field phone; target 150–400 ms |
| Jobs GPS backdate ceiling during the drain | P4a | widened to W like device_time (ruling R2) with the per-job fuel-distance before/after check; back to 48 h at `T_close` |
| Plaintext backups under the app credential until P13b — nightly, hourly and the VPS provider snapshots (which hold `/etc/fixflow`) | P3c step 7 | accepted (G2-D2 deviation, `O6-F06`); P13b encrypts the dumps and switches the provider snapshots off |
| Odoo plan (external API needs Custom) | P11 only | CSV path (P10) |
| Odoo version | P10a labels, P10b | draft with the current release's labels |
| Pakka record set, basis (cash/accrual), sales-tax registration, start date, reason codes | P9-0b → P9a-2 going live | **no default — P9-0b must answer** (the owner may sign the cash-basis / not-registered defaults as the answer); stager idle until a start date; invoice kind only on accrual |
| Approver, unit and export cadence | P9-0b → P9a-1 / P10a | **no default — P9-0b must answer** (the owner may sign: the manager; per posting; weekly export) |
| Full-fidelity or selective postings | P9a-2 | full-fidelity |
| Tax regime and chart of accounts / journals | P9-0b (then P10b) | — (P9-0b answers; `l10n_pk` is the test-company chart) |
| Customer → Odoo partner mapping | P10a | one walk-in partner, no customer PII exported |
| Negotiation below original | P7a | allowed for the assigned tech, **flagged, never required** (the note is optional); manager beyond the cap once set |
| PII minimisation of unclaimed jobs for tech tokens (list and detail) | P7a setting; P7b-1 turns it on | off until v2 is fleet-wide (the list shows addresses techs use before claiming), then on |
| Second approver / self-approval | P9a-1 | flag, do not block (single-manager shop, ruling R9) |
| Chain anchor channel + SMTP relay credentials | P8b | email to the owner via `core/mailer.py`; without credentials the chain is labelled "unanchored" and P8b still completes |
| Error tracking | decided (G2-D2) | Sentry SaaS; P0a confirms the mobile project ingests; a change needs a new APK |
| Dead-man monitor location and paging (MON_LOC) | P3a | external heartbeat service paging the owner by email |
| RPO target; who is on call | P3c, P13b | 1 h from the first drain until P13e (hourly dumps), 24 h after; the owner |
| R2 retention and media cap | P13b | dumps 30 days; media uncapped with an alert at 8 GB |
| Second-provider backup copy | P13b | none (recorded) |
| Maintenance window | P3a runbook | outside 02:00–04:00 |
| age key holder | P13b | the owner, private key offline |
| Second uplink, split-horizon DNS, disk encryption | P13c | none |

## 5. Register coverage

Every P0/P1 row of G2 §2 and of the HR §3 addendum maps to one or more closing phases:

| Register id(s) | Closing phase(s) |
| --- | --- |
| `O01-F01`, `O01-F03`, `O01-F04` (phone), `O01-F05` | P5a (evidence P5c) |
| `O01-F20` | P5a (fix), P5c (cross-stop check) |
| `O07-F16` (P2, race) | P7a |
| `O07-F17` | P9-0b (decision), P9a-1 (source), P9b (form), P9a-2 (staging) |
| `O01-F02`, `O01-F06` | P5b-1 |
| `O3-F2` | P2a |
| `O3-F4` | P2b-1 (constant) + P4c (server value) |
| `O10-F1`, `O10-F2` | P2b-1 |
| `O10-F3`, `O10-F4` | P3a (stub modes), P3c step 4 |
| `O10-F7` | P6b-2 (guard), P4c/P4r (re-seed) |
| `O10-F15` | P0a 2/6/11 (secret, v2, decision), P1 (verifier), P3b 2, P4a/P4b/P4r K=no rows |
| `O04-F4` | P6a (fields), P6b-2 (health read) |
| `O6-F01` / `O08-F01` / `O05-01` / `O10-F5` | P1 |
| `O6-F05` / `O05-02` / `O10-F6` | P1 (refusal, policy), P3b (rotation) |
| `O05-03`, `O05-04` | P1 (6-digit policy), P3c (rate rule), P7b-1 (per-source lock, alert) |
| `O05-05` / `O6-F02` / `O6-F03` / `O6-F04` / `O07-F3` | P7a |
| `O05-06` | P7a (code), P5b-2 (APK), P7b-1 (setting on) |
| `O05-07` | P0a 2 and 12; P3c 4; P4c/P4r (stub lifecycle) |
| `O05-14`, `O05-16` | P1 |
| `O08-F02` | P0a 2–3; P3c 7 |
| `O6-F07`, `O6-F08` | P8a, P8b |
| `O07-F1`, `O07-F2` | P9a-2 |
| `O08-F05` / `O08-F14` | P2b-1 |

P2/P3 rows are in the "Backlog" line of the phase owning their file or in the scope that fixes
them (`O3-F1`..`F13`, `O3-F17`, `O3-F18` → P2a/P2b-1; `O01-F07`..`F18` → P5a/P5b-1/P5b-2; `O04-F1`..
`F3`, `F5`..`F13`, `F15`, `F16` → P1 (`F12`)/P6a/P6b-1/P6b-2/P7a; `O05-08`..`F13`, `O05-15`, `O05-17`,
`O05-18`, `O6-F17`, `O08-F03`/`F04`/`F08`/`F09`/`F13` → P3a/P7a/P0a/P7b-1/P7b-2/P12; `O6-F06`,
`O6-F18` → P13b/P13a; `O6-F09`, `O6-F14`..`F16` → P8b/P2b-1/P6a/P9a-1; `O07-F4`..`F15` →
P7a/P8a/P9a/P10a/P13d; `O08-F06` fixed in the design doc; `O08-F07` → P1; `O08-F10`..`F12` →
P13c/P3a; `O04-F18` → P6a (+ P3b step 5); `O3-F22` → P2a; `O10-F17` → P2b-1). **Addenda admitted from W1 S-06 and the HANDOFF** (not in G2 §2), with severity:
A4 **P0** (P12a); A3, L3 P2 (P12); L7 = `O3-F18` P3 (P2a); T44-web-1..4 P2/P3 (P12);
T44-media-1..3 P2 (P7b-2; media-3 = `O05-13`); T44-attendance-3 = `O04-F12`.

## 6. Adjudication record

### 6.1 The v1 critique (138 findings; `SHIP-PLAN-2026-11-critique.md`)

**Accepted** (default): every finding not listed. **Narrowed:** FIT-6/EXE-14/FID-15 (a spare
phone cannot log in: P2c proves install + report; the seeded and ordering proofs are P4a's
pilot); FIT-18 (O05-06 kept in P7a behind a setting; the list shows addresses techs use before
claiming — a UX/policy change, not an APK contract break); DEP-10 (the citation check found no
evidence that P7a parks queued writes; the drain-image rule is adopted anyway); DEP-23/CMP-16/
FID-9 (the drain does not wait for P6b; flags are retroactive; regeneration needs
`payroll_export.version`, now in P6b-1); EXE-9 (Appendix B carries drill baselines; exact
commands added); EXE-21 (manager-only below original was unsafe for field flows); CMP-18/FID-24
(T44 ids are W1 S-06 items, now cited with severity); DEP-1/EXE-1/EXE-2/CMP-4 (downgraded by
refuters; P0a now takes the dump the same day with commands); CMP-1/FID-11 (6-digit policy in the
service, refusal of default PINs, rotation of every account); FID-1 (adopted in full).
**Rejected:** none.

### 6.2 The v2 verification (141 findings; `SHIP-PLAN-2026-11-critique-2.md`)

**Accepted** (default), with these structural results: repeatable phases and the window-close
phase P4c (RFIT-1, FIT2-08, FIT2-11, EXE-17-r1); the drain image and the deploy train (CON-1,
FIT2-01, CON-2, CON-3); the complete K=no branch incl. the legacy verifier, the proxy-mode stub,
per-branch Done-whens and per-phone K (RFIT-3, R-DEP-3, CMP-3-R, EXE-3-r1..r3, FID-2-kno,
CON-6..CON-8, NT-7..NT-11); the `preflight-api.` host and the client-IP echo (RFIT-2, R-DEP-4,
EXE-13-r1, CON-4, CON-5, FIT2-04, NT-12, NT-13); runnable P0a (NT-1..NT-6, EXE-2-r1, NT-4); the
service PIN policy (CMP-1-R, CON-11, NT-15); payroll version + regeneration keyed on drained
dates after an accept pass (FID-9-regen, CON-14, FIT2-12); ceilings aligned at 336 h (CMP-15-R,
CON-15); the Docker-gate concurrency rule (RFIT-4, CON-16); P2b split and the audit script's
`--test-window` (FIT2-02, R-DEP-22, FID-3, NT-22, CON-21); compile gates at the end of P5a and
P5b (R-DEP-13, FIT2-09); P8b chain backfill and mailer (FIT2-15, EXE-20-r1, CON-20, FIT2-14); FK
NOT VALID in P8a and the three-part audit (FID-21-fk, R-DEP-12); P12a before P4a (CMP-18-R); the
rest as wording.
**Narrowed:** NT-17 (B5 named so the pruner regex cannot match; wording only); CMP-17-R (an
unclaimed job's detail is minimised, not 403 — adopted, gated by the same setting as the list;
the setting is turned on in **P7b-1 only**, which waits for v2 fleet-wide); FIT2-19 (P13d is a
second PR in the P13c session, not a phase); R-DEP-10 (wording: "citation check").
**Rejected:** none.

### 6.3 The v3 verification (52 findings; `SHIP-PLAN-2026-11-critique-3.md`)

**Accepted** (default), with these results: P5d-1a made repeatable per visit with `T0` at the
last install (RFL3-1, V3R-1); the legacy verifier always built, default OFF, `exp` not enforced
(RFL3-2, V3R-5, CON3-12); the old secret sealed unconditionally in P0a item 2 before the cut-off
(RFL3-7, V3R-3, RC-NT7-order, CON3-18); P4r completed (ranges, snapshot, residue, notice, accept
pass and regeneration, proxy/legacy re-set per session) and P6b-1 regenerating P4c + P4r ranges
and the `T_close`→deploy late rows (RFL3-3, CON3-07, RC-NT23-P4r, CON3-03); the PII setting owned
by P7b-1 only, list and detail gated together (RFL3-4/5/6, CON3-08, CON3-09); P12a after P3b and
the web profile started in P3b, web image from `release/drain` before `T_close` (RFL3-6,
RC-NT18-web, V3R-11, CON3-13); P13d's audit re-run immediately before its deploy (RFL3-8); the
`release/drain` branch procedure, tag ownership, re-cut after a window fix, P4b entry "P4a
passed" and re-run on the next undrained phone (V3R-2, CON3-01, CON3-11); the fuel
snapshot/baseline modes and the runbook's B5 and re-seed commands (V3R-4, CON3-10); R9 extended
to ledger entries and export batches (V3R-7); P8b Entry/Done-when consistent with the
"unanchored" default and the P8b-2 hatch wired into P9a-2 (V3R-8, RC-FIT2-14, CON3-14); graph
edges redrawn from the Entry lines (V3R-9, CON3-19); the money-chain Done-whens in train form
(V3R-10, RC-FIT2-01, CON3-02); Appendix B's `job.token` column fixed in the design doc
(RC-NT14-token); `MSYS_NO_PATHCONV`, exported AWS variables and the laptop copy mount in P0a
(RC-NT1-msys); STOP only on cert mismatch / incompatible update / downgrade (RC-NT11-vc); the
mixed-fleet host mode and the network-cut lift rule (CON3-04); deep-health exposing the values
phases read back plus an image identifier (CON3-05; renamed `FIXFLOW_GIT_SHA` in v5); retired rows, the "last re-open"
definition and P4r's APK (CON3-06); H=no pilot network timing (CON3-16); rule 5 reworded
(RC-NT8-rule5, CON3-17); the hold notice committed as sent in P0a (RC-NT20-notice, CON3-15); the
"R" prefix convention (CON3-20); the event-names JSON shared by both runtimes (CON3-22); USB
debugging on every phone and P7b-1 in the §5 line (CON3-23).
**Narrowed:** CON3-21 (the negotiate note stays optional for good — "flagged, never required" —
rather than becoming required after v2; field discounting must not park a write).
**Rejected:** none.

### 6.4 The v4 delta check (47 findings; `SHIP-PLAN-2026-11-critique-4.md`)

**Accepted** (default), with these results: `release/drain` built by cherry-pick only, its log
recorded and gated before tagging, P3a-2 outside the image (DV4-RB-1, D4-CON3-01-merge, DC4-05,
DC4-16, DV4-RB-4); the web image on `release/drain-web`, P7b-2/P9b/P10a web halves on the
train, the train's last row rebuilding the web image (DV4-RB-2, DV4-RB-3, D4-CON3-13-p7b2,
DC4-11, DC4-22); the deploy-train table created by the first phase that needs it (DC4-04,
D4-CON3-01-table); the train deploying `main` HEAD once with read-only post-deploy checks, a
halt rule and P4c-train (×n) (DC4-06, DC4-07, D4-FIT2-01-checks); the mixed-fleet guard in P4r
and P4b, a K=yes pilot, v2 on a late phone only after P5c, the stub removed and the sealed
secret destroyed at the last P4r (DC4-01, DC4-02, DC4-08, DC4-09, D4-CON3-03-p4r-proxy,
D4-CON3-03-p4r-v2, D4-CON3-03-final, D4-CON3-18-seal, DV4-RB-5); P6a's Done-when in train-or-R5
form and P5c's Entry "P6a deployed" (DC4-03); P6a waiting for P2b-1's Discard event (DC4-12); the
runbook's `-d fixflow`, `mkdir -p /restore`, `exec -T` on the B5 dump with `pg_restore -l` and a
sha256, the three window queries, the fuel snapshot on a bind mount (DC4-10, D4-CON3-10-tty,
D4-CON3-10-json, DC4-18); the proxy-mode stub passing only marker-carrying responses
(D4-CON3-17-marker); `FIXFLOW_BACKUP_ENABLED=false` in the compose (D4-CON3-05-backup, DC4-13);
`FIXFLOW_GIT_SHA` plus `docker inspect` instead of a self-referential digest
(D4-CON3-05-digest); P0a tools first and the Appendix C variables (DC4-14, D4-CON3-23-order,
D4-NT1-appc); P4a (×n until passed) with the APK-side fix path (D4-CON3-11-rerun, DC4-15); the
P8b-2 hatch given an Entry and Done-when (D4-CON3-14-hatch); the contract JSON files under
`technician-app/src/shared/contracts/` with the backend test in P6b-2 (D4-CON3-22-path,
DC4-17); protocol windows excluded from P5d-2 (DC4-19); P12a rotating the key on any change
(DC4-20); graph edges for P0b and the hatches (DC4-21); P11 in train form (DC4-22); `O04-F12`
moved to the P2 paragraph and the 15-min re-check cited to O-01 (DC4-23); R9's ledger-entry
coverage limited to the stager's start date (DV4-RB-6).
**Narrowed:** none. **Rejected:** none.

### 6.5 Rulings

- **R1 — one verdict rule.** Three-state (inside if d + a ≤ r; outside if d − a > r; else
  unknown), 100 m accuracy ceiling, on both sides; the phone prompts on inside **and** unknown.
  Built once in P6a with a published fixture; P5a consumes it (`O01-F04`, `O04-F9`). **Note (v7):**
  the exit hysteresis threshold is a prompt filter only (the depart row is judged by R1); the
  Wi-Fi input promotes unknown → inside only, as a fixture vector (HR-A1c as narrowed).
- **R2 — jobs GPS ceiling during the drain is widened to W.** Job punches are never rejected:
  out-of-window ones are re-bucketed to `server_now` (`jobs/service.py`), so a 48 h ceiling would
  collapse every drained depart/arrive pair to drain time and derive routes from it — worse for
  billing than landing them at their true `device_time`. The safeguard O-04 wanted (`O6-F13`) is
  `drain_audit.py --snapshot-fuel` at B5 and `--fuel-baseline` at AFTER (fuel is derived on the
  fly, so a `pg_dump` alone is not a baseline); changed closed/billed jobs are listed for the
  manager. Back to 48 h at `T_close`.
- **R3 — no pre-auth roster.** The typed value is the **technician id on the sealed slip**
  (mobile-only in P5b-1; the backend already logs in by id). The roster endpoint is removed in
  P7b-1 together with a typed-id web manager login, only once every phone is on v2 or retired. A
  request-side "app marker" is forgeable and is not used.
- **R4 — PIN rotation.** Every account is rotated to ≥ 6 digits in P3b with sealed slips handed
  over at E4; the 6-digit policy lives in the service (P1) so the manager's in-app `set_pin`
  cannot reintroduce 4 digits.
- **R5 — the drain image** is the `drain-image` tag cut from `release/drain` (P1 + P2b-2 + P3a,
  nothing else, applied by cherry-pick only), re-cut only for drain-tool fixes; everything else
  deploys via the P4c train or after `T_close`. The web image before `T_close` is built on
  `release/drain-web` (that branch plus web-only commits).
- **R6 — migration numbering.** No pre-assigned numbers; G2-D3's "0047" is not binding; deferred
  VALIDATEs and the fence index are separate migration files in P13d after the audit script has
  been re-run immediately before that deploy.
- **R7 — no `expo-updates`.** It bypasses the once-per-versionCode manifest and rule 1.
- **R8 — no JSON-`detail` fallback** in origin classification: the only backend the phones ever
  reach is P1+, so the fallback could fire only on non-app bodies and park them.
- **R9 — self-approval is flagged, not refused**, by default: with one manager, refusing
  `decided_by = recorded_by` would block every payment the manager recorded. O-06 item 3's "one
  approval table" is realised as: postings → `posting_decision` (from the stager's start date
  every ledger entry becomes a posting the manager decides, so **ledger entries** are covered
  there; manual entries before that date or while the stager is idle have no approval record —
  the P8b chain gives them tamper evidence, and approval begins with the pakka start date);
  advances →
  `advance_request`; bill override reasons → `job_bill_revision`; negotiate flags → the
  negotiate `job_event` payload; **export batches** → `posting_export` whose manifest carries the
  `posting_decision` ids (P10a). The owner may switch to refuse once a second approver exists.
- **R10 — the legacy-secret verifier is always built.** It is inert when unset, so building it
  unconditionally removes a P0a dependency from P1; whether it is ever switched on is the §4
  `O10-F15` decision, and it is never on outside a supervised window.

### 6.6 The harness and architecture review (2026-11-01; `HARNESS-REVIEW-2026-11-01.md`)

Four Opus architects (Android background execution, offline sync, self-hosting operations, ERP
and bookkeeping) reviewed the design behind the register against named alternatives; two Opus
judges merged them; 45 falsifiable claims were each attacked by two refuters (7 refuter runs were
lost to a usage limit; the affected claims stay owner questions). Verdict: no wrong foundation;
every change fits inside existing waits and none delays the drain. Rulings, binding from v6
(full text in that file §2): **HR-A1a** delete the phone dwell, one bounded fix, the server
judges (P5a, P6a; R1 unchanged); **HR-A1b** keep Expo, fix the register-absent FGS cross-stop
`O01-F20` (P5a, P5c), the commercial-SDK spike is phase P5-spike, decided at P5a's Entry;
**HR-A1c** Wi-Fi BSSID input as a fixture vector (P6a) and a shift-start reminder (P5b-2),
premises asked in P0a;
**HR-A2** keep the hand-rolled engine, one `classify()` outcome incl. pending media (P2a),
storage bytes in the manifest (P2b-1), one command log as backlog P14-log; **HR-A3** a VPS
host until the P13e move, the box after the §4 gate, hourly and post-drain dumps (P0b, P3a, P3b,
P3c, P4a–P4r, P13b, P13e, §4); **HR-A4** atomic closed-job guards (P7a), the P9-0a/P9-0b
rehearsal gating P9a-1, cash custody built in P9a-1/P9b, one bill-write function (P8b), Odoo
Online + CSV kept. Harness rules adopted into §0:
`Plan @ <sha>` and the resume diff, the in-PR decisions list, SHA-bound reviews with
fail-before evidence, the six-question phase close; skip-aware gates and the CLAUDE.md head check
land in P1; raw W1/W2 outputs are committed under `docs/program/evidence/`; graphify is skipped
in favour of dependency-cruiser on mobile (P5b-2). The review's own delta check
(`SHIP-PLAN-2026-11-critique-5.md`: 1 blocker — the v6 wording would have enqueued crossings
without coordinates — and 20 majors, mostly the hosting ruling applied unevenly and three phases
that no longer fit a session) is folded into v7: P13e, P5-spike, P5b-1/2 and P9-0a/b exist
because of it. Compaction audit: nothing lost that hurt; one
phase per new session is the defence (HR-C1–C5).

### 6.7 The v7 final check (critique-5 part 2; 10 major, 12 minor, 1 note)

One Opus critic re-read the v7 fold-in. **Accepted, all:** the backgrounded cross-stop check
needed a control that ships (a "stop travel in 60 s" Diagnostics action, P5a); runbook R9 left
the VPS backend, scheduler and crons running and never moved `/etc/fixflow` (R9 and P13e
rewritten; read-only defined; a dated close row for the destroy); the box gate had no probe (a
second dead-man check pinged from the home box, started in P0b); no branch for "no home box"
(P13e skipped, milestone ends at P13d); P1's trial file had no producer (it is P1's first act);
the no-Odoo branch kept no CSV export (P10a stays, only the Odoo runbook, P10b and P11 drop);
provider snapshots cannot be encrypted (P13b switches them off); the manifest archive is
`archive/manifests/` plus the post-drain dumps; P5b-1 gets its compile gate; the suppressed-arrival
rate becomes a P5d-2 metric with a §4 threshold; post-drain dumps never prune; the allow-list for
negative CLAUDE.md mentions; one custody trigger; P14-n and P14-log entries; wording (home box in
six places, P7b-1's P5b-1, the handler's start time, the version list). **Narrowed:** none.
**Rejected:** none. No further pass is run on v8; its edits complete procedures the v7 check named
rather than changing decisions.

**Status of verification.** Six passes have run (138 + 141 + 52 + 47 findings, then the
harness and architecture review: 45 claims, 83 refuter verdicts, then its delta check: 48 + 23
findings); each critique found mainly
second-order effects of the previous pass's fixes, the fourth found one blocker (the mixed-fleet
proxy guard in P4r), now closed, and the fifth found no wrong foundation, two register-absent P1 rows (`O01-F20`,
`O07-F17`), one new P2 race (`O07-F16`) and one default worth inverting (the host for the drain
window); its delta check is folded into v7 and the check of that fold-in into v8. No further
pass is scheduled: the remaining risk is in execution, which P0a starts **in a new session**. A phase session that finds the plan wrong
records the finding in its W0-results step table and amends this file in the same PR.

---

## 7. Parallel execution (v9 amendment, 2026-11-13)

**Why.** v8 runs one phase at a time and its first phase is the owner's. Twelve days after v8
nothing was built, because P0a had not happened and every code phase queued behind an Entry line.
Measured on 2026-11-13: production still answers Railway's edge 404 on both hostnames;
`W0-results.md` does not exist; the machine is a 12-core / 24-thread Ryzen 9 7900X with 31 GB RAM,
an RTX 5070 and 146 GB free disk, and it sat idle. This section changes **when work starts and
how many things run at once**. It changes nothing about what must be true before a PR merges,
deploys, or reaches a phone: §0's standing rules 1–7, rulings R1–R10 and HR-A1..A4 stand as written.

### 7.1 Roles

- **Coordinator session (Fable).** Owns this file, `W0-results.md`, `OWNER-VIEW.md`, the
  cross-lane contracts (§7.3) and the merge-readiness call on every PR. Never implements.
- **Lane session (Opus lead, its own git worktree cut from `origin/main`).** Runs exactly one
  phase (HR-C1 stands: one phase per session; what is new is several sessions at once). The lead
  reads §0, this section, its phase section and the cited design note, **implements the
  Opus-owned work itself** (§0 Routing's list), and hands Sonnet subagents the Sonnet-owned work
  (tests from a design's test list, screens, read models, infra files, runbooks). This replaces
  "the main session never implements" for lane sessions: the orchestrator window was measured as
  the largest token cost of the program (`TOKEN-BOTTLENECK-2026-11.md`), and a lead that both
  briefs and implements loses nothing to a hand-off.
- **Reviewer (Opus, fresh context, never the author).** Unchanged from §0: refute-by-default,
  verdict bound to the PR head SHA, fail-before/pass-after named per register id, every changed
  expectation, removed assertion and new skip listed. **Two reviews.** The lane dispatches one
  inside its loop, from the brief the coordinator wrote into the lane's prompt: a self-check that
  shortens the loop. The **binding review is dispatched by the coordinator** when the lane reports
  READY, from a brief written from the phase's register ids, on the PR head SHA. The author never
  chooses what its binding reviewer attacks (§0 Routing; §7.8 finding 7).
- **Where a lane reads the program.** The plan, the design notes and the evidence are on the
  plan branch (PR #182), not on `main`. A lane reads them at
  `C:/Users/User/Documents/projects/EMS_workshop1/docs/…` (the primary checkout stays on the plan
  branch) or with `git show origin/docs/orchestration-design-2026-10:<path>`; skills and agent
  definitions at `…/.claude/worktrees/wizardly-hertz-02c46a/.claude/{skills,agents}/` (PR #185).
  `Plan @ <sha>` is a commit of the plan branch; the resume diff is
  `git diff --stat <sha>..origin/docs/orchestration-design-2026-10 -- docs/program/`. The
  coordinator commits, pushes and tags every plan edit (`plan-v9`, `plan-v9.1`, …) **before** a
  lane is told to read it, so the file a lane reads is the commit it cites; the tags survive the
  plan branch's merge.
- **Resume key.** A lane keeps the branch its session created and writes it in the PR body. The
  PR title starts with the phase id in brackets (`[P1] …`), and `W0-results.md`'s lane board maps
  phase → session → branch → PR. That replaces v8's fixed branch names in every "Resume." line.
- **P1's cold-resume trial** (plan lines 322-328) gives its fresh agent the plan-branch path
  ("the repository" now includes it), writes `expected.json` to
  `C:/Users/User/.fixflow-cache/handoff/p1/`, and the coordinator commits it under
  `docs/program/evidence/resume-trial-P1/`.
- **Program files are the coordinator's.** A lane does not edit `docs/program/` or
  `OWNER-VIEW.md`. Its closing message carries its deploy-train row (phase, PR, merge sha,
  migration, post-deploy check) and any plan defect it found; the coordinator writes both down.
  This supersedes the last sentence of §6.7's status paragraph ("amends this file in the same
  PR"): a lane reports, the coordinator amends.

### 7.2 Build-ahead

An Entry line mixes four kinds of condition. Each clause is classified; only the first kind stops
a build from starting.

| Kind | Example | What a lane does |
| --- | --- | --- |
| **code** | "P2a merged" where the phase calls P2a's functions | builds on the other phase's **reviewed branch tip** (a stack); merges after it; after the squash-merge the stack is rebased with `git rebase --onto origin/main <old tip>` |
| **value** | the domain name, the fleet's highest versionCode, the anchor address | builds with one named placeholder; the placeholder is the last unticked box; no merge until it is filled |
| **operations / deploy** | "P3b done", "P3c done", "deployed per runbook R5" | builds now; the clause gates the deploy or the operation, exactly as written |
| **evidence / decision** | P4a's protocol findings, the SDK row, P9-0b's answers | builds only the default path and marks the PR **at risk**; the evidence can still change it |

**Merge-hold list.** "Merge is not deploy" is true only until P4c, whose train deploys `main`
HEAD, and the fleet APK v1 is built from `main` (P2c). So these PRs are built and reviewed but
stay **draft, unmerged** until the stated point:

| PR(s) | Held until | Reason |
| --- | --- | --- |
| P5a, P5b-1, P5b-2, P14-n (every mobile PR after P2b-1) | P4a passed and the §4 SDK row answered; v2 is built only after P4c | fleet APK v1 must contain P2a + P2b-1 and nothing else on the mobile side; an APK-side drain fix needs a clean `main` to land on |
| P6b-1, P6b-2 | P4c done | v8 sequences the late-flag migration after the window; it must not ride the train |
| P7b-1 | every roster phone on v2 or retired | it removes the roster endpoint the v1 login calls |
| P9a-1, P9a-2, P9b, P10a, P11 | **P5d-2 done** (HR-A4, as written) and P9-0b answered; then one at a time per runbook R5 | HR-A4: the accounting chain never competes with the fleet work — a deploy during P5c or P5d would |
| P13a–P13d | `T_close` | `start.sh` would migrate as a role the host does not have yet |

**The classification, per code phase** (the Entry line still wins for merge and deploy):

| Phase | Lane | v8 Entry clause → kind | Build may start | Merges no earlier than |
| --- | --- | --- | --- | --- |
| P1 | B-core | none | now | its own gates and review |
| P2a | M | none | now | its own gates and review |
| P12a → P12 | W | P3a merged, P3b / P3c done → deploy | now (P12 after P12a: same files) | any time; the deploy clauses stand |
| P9-0a | B-tools | "P3b done" → operations (it needs a dump only to *run*) | now | any time |
| P7a | B-jobs | "P1 merged" → no shared function found; shared files `CLAUDE.md`, `conftest.py` | now | P1 merged (rebase) |
| P6a | B-att | "P1 merged" → config lines only; "P2b-1 merged" → value (the event name, fixed in §7.3) | now | P1 merged (rebase) |
| P2b-1 | M | P2a → code; domain, versionCode → value | on P2a's reviewed tip | P2a merged; both values filled |
| P3a | O | P1 → code (`FIXFLOW_GIT_SHA`, environment, deep-health) | on P1's reviewed tip | P1 merged |
| P2b-2 | B-tools | P2b-1 → code (manifest schema) | once P2b-1's schema commit exists | P2b-1 merged |
| P8a → P8b | B-jobs | P7a / P8a → code; anchor → value with a default | on the previous reviewed tip | previous merged |
| P7b-2 | O + media + web | P3c → deploy | on P7a's reviewed tip, **one PR** as v8 wrote it | P7a merged |
| P5a → P5b-1 → P5b-2 | M | P2b-1, P6a → code; P4a → evidence; SDK → decision | on P2b-1's tip + P6a's fixture, default path, **at risk** | merge-hold list |
| P6b-1 → P6b-2 | B-att | P6a, P5a → code; P4c → operations data | on the previous reviewed tip | merge-hold list |
| P7b-1 | B-core + W | P7a → code; P3c XFF → evidence (keying behind a setting) | on P7a's reviewed tip | merge-hold list |
| P9a-1 → P9a-2 → P9b → P10a | B-jobs | P8b → code; P9-0b → decision; "P5d-2 done" → capacity | on P8b's tip, once P9-0b is answered or the owner signs the defaults | merge-hold list |
| P13a–d | O | P4c → operations | code only, late | merge-hold list |

**No undeclared splits.** A phase v8 made one PR stays one PR. P3a-2 is **not** started early: it
would create `docs/RUNBOOK-SELFHOST.md` and edit `ci.yml` ahead of P3a and P1, and P3a's
cherry-pick onto `release/drain` would then conflict (§7.8 finding 2); the stub and heartbeat stay
inside P3a with v8's hatch unchanged. P6a keeps its small web half in its own PR, inside the
attendance feature folder.

**P9-0b moves earlier.** Its real need is "a verified dump exists and P9-0a is merged". P0a item 4
verifies the dump with Appendix C on this machine, so P9-0b can run as soon as P0a item 4 and
P9-0a are done; it no longer waits for P3b. If item 4 ends in a screenshot and no dump, P9-0b
uses the newest archived R2 dump, or `--seed-week`. The Odoo decision is then known as early as
the owner's calendar allows, and the accounting lane has its answers when P8b is ready.

**HR-A4's "P5d-2 done" clause stands for merge and deploy.** Its reason is that the accounting
chain must never compete with the fleet work (HARNESS-REVIEW line 221). A lane session building
P9a-1 in its own worktree and gate stack does not compete with a fleet session; a merge that the
train or runbook R5 then deploys during P5c or P5d would. So the clause no longer stops the
*build* of P9a-1, and it is kept, as written, in the merge-hold list above.

### 7.3 Lanes, file ownership and cross-lane contracts

Two lanes never edit the same file in the same wave, except the shared files below.

| Lane | Owns | Phases in order |
| --- | --- | --- |
| **B-core** | `backend/app/core/`, `main.py`, `features/identity`, `features/ops`, `.github/workflows/ci.yml` | P1 → P7b-1 |
| **B-jobs** | `features/jobs`, `media`, `customer_messaging`, the money and accounting slices | P7a → P8a → P8b → P9a-1 → P9a-2 → P10a → P11 |
| **B-att** | `features/attendance`, `telemetry`, `tenancy` | P6a → P6b-1 → P6b-2 |
| **B-tools** | new files under `backend/scripts/` and their tests | P9-0a, P2b-2 |
| **M** | `technician-app/` | P2a → P2b-1 → P5a → P5b-1 → P5b-2 |
| **W** | `src/` outside a mixed phase's own feature folder | P12a → P12 (the only web commits ever cherry-picked to `release/drain-web`) |
| **O** | `ops/`, `ops-server.mjs`, compose files, Dockerfiles, runbooks | P3a → P7b-2 → P13b, P13c |
| **L** | `ops/lab/`, `docs/program/lab/` | L1 → L2 → L3 → L4 (§7.5) |
| **OWN** | the phones, the dashboards, the host | P0a → P0b → P3b → P3c → P4a … (unchanged) |

Shared files: `CLAUDE.md` (a PR edits only the lines its phase names; conflicts are resolved at
rebase), `backend/app/core/config.py` (B-core owns it in wave A; other lanes add settings in
their own block), `backend/tests/conftest.py` (same rule), `technician-app/src/shared/contracts/`
(created by P6a; the JSON files hold sorted arrays, so a later appender's rebase is a union),
`backend/app/features/tenancy/specs.py` (the settings registry: append-only, one block per
phase), and the constants block of `attendance/service.py` with `attendance/tests/test_service.py`
(P1 changes the ping-ceiling mirror and its 49 h test; P6a changes the accuracy ceiling beside it
and rebases after P1).

**Contracts fixed now** so lanes do not wait on each other:

| Contract | Value | Producer → consumer |
| --- | --- | --- |
| Origin marker | response header `X-FixFlow-Api: 1` | P1 → P2a, the hang stub |
| Verdict fixture | `technician-app/src/shared/contracts/verdict-vectors.json` | P6a → P5a, P6b-2 |
| Telemetry event names | `technician-app/src/shared/contracts/telemetry-events.json`, a sorted `events` array | P6a creates it holding all six names fixed in this table; P5b-1 appends its own. Supersedes plan lines 819-821 (P5a commits it) and the "event-names JSON exists" reason in P6b-2's Entry |
| Discard event | `queue_discard`, props `{queue, kind, reason_class, owner_tech, discarded_by}` (both technician slugs). The board counts per `discarded_by` and flags `owner_tech ≠ discarded_by` (`O6-F14`: a shared phone). The uploading principal is transport only: a queued event can upload under a third technician's session | P2b-1 → P6a (board count) |
| Drain manifest event | `drain_manifest` (v8's name) | P2b-1 → P2b-2, runbook |
| Sampler events | `sampler_gap`, `geofence_error`, `crossing_recorded`, `notify_suppressed` (v8's names) | P5a → P6b-2 |

### 7.4 The machine

| Resource (measured 2026-11-13) | Used for | Cap |
| --- | --- | --- |
| 24 threads | one backend gate stack per lane; Jest; Vitest; Gradle | 6 CPUs per gate container; 4 Jest workers; 4 Vitest workers |
| **RAM: 31 GB, about 11 GB free with other sessions running — the binding resource** | everything | the slot lock below; 3 GB per gates container, 1 GB per database |
| Docker Desktop 29.9 (WSL2 VM, 15.5 GB) | gates, restore rehearsals, the local full stack, the Android compile container | no `/dev/kvm` inside it (0 `svm` flags): no emulator in Docker |
| Windows Hypervisor Platform (enabled) + RTX 5070 | the Android emulator, natively (`-gpu host`); the GPU has no other job in this program | one emulator at a time until measured |
| 146 GB free disk | worktrees (about 1.2 GB each with mobile `node_modules`), images, one AVD | — |
| Android toolchain in the user folder `C:/Users/User/.fixflow-cache/android` (owner's yes, 2026-11-13) | a JDK 17.0.21 (Temurin), adb 1.0.41 (platform-tools), apksigner and aapt2 (build-tools 37.0.0), the emulator 37.2.13 (hardware acceleration: "WHPX is installed and usable"), one system image (Android 14 / API 34, Google APIs, x86_64, revision 14) and the AVD `ff34` (2 GB RAM); 8.6 GB on disk. Every installed file matches its official archive by name and size except the one DLL the antivirus blocks (next row) | loaded per terminal with `source /c/Users/User/.fixflow-cache/android/env.sh`; nothing on the system PATH; uninstall = delete the folder |
| A third-party antivirus (360 Total Security) is the active real-time scanner | it blocks, every time, the creation of the emulator's `lib64/gles_angle/d3dcompiler_47.dll` ("Access to the path is denied"), and once blocked the JDK's `ucrtbase.dll` in mid-unpack. Google's sdkmanager abandons a package when one file fails, and the system image depends on the emulator package, so neither can be installed through it here | **the block is left alone.** The emulator and the image are unpacked directly from the archives Google's manifests name (checksums verified, every file checked), the one blocked DLL stays absent, and the emulator is never run in an ANGLE gpu mode. FixFlow never changes an antivirus setting; allowing the folder is the owner's decision |
| Mains power | the PC lost power at about 13:25 on 2026-11-13 and was off for 28 minutes (Kernel-Power 41 with no bugcheck code, no long power-button press, no hardware-error record) | eight lanes were cut off mid-turn and all resumed from their worktrees; lanes now commit and push at every green checkpoint; a lock made before the last boot is treated as dead (`ff-slot.sh`, `ff-gates.sh`) |

- **Gates.** `bash C:/Users/User/Documents/projects/EMS_workshop1/docs/program/lab/ff-gates.sh
  backend|mobile|web <lane> <worktree>`, run in the background; the result is
  `<log dir>/summary.txt` under `C:/Users/User/.fixflow-cache/gate-logs/<lane>/`. It is design
  Appendix A with the lane in the container names, so each lane has its own database and the
  invariant "never a second pytest against one database" holds per lane. This replaces v8's "at
  most one backend phase that runs the Docker gates". The backend kind mirrors CI
  (`postgres:16-alpine` until P3a moves both to 17), fails when an integration test was skipped
  (HR §4), and reports pip-audit as advisory. The mobile kind runs Jest without
  `--passWithNoTests`. A Jest failure on Node 24 is re-run under `node:22` before it is called a
  defect (design §8). The lane id is the **phase id** (two stacked phases never share one). A
  per-lane lock, taken before anything else, refuses a second run of the same kind while the
  first is alive. The backend job's `FIXFLOW_ENVIRONMENT` is mirrored from the worktree's own
  `ci.yml`. A **merge-readiness run** has a clean tree and no extra pytest args: the summary
  prints `tree=dirty(n)` and `RUN partial` otherwise.
- **Slot lock.** `ff-slot.sh` has **two pools** since 2026-11-13 15:53. The **heavy pool** has 2
  slots: a Jest run, a Vitest run and a running emulator take 1 each, and a Gradle build takes
  the whole pool (and waits for any holder left over from a larger slot count). The **light
  pool** has 3 slots and holds only backend gate stacks, measured at about 0.5 GB each (403 MiB
  for the gates container, 102 MiB for its database); `ff-gates.sh` picks the pool from the kind.
  Before the split six jobs queued behind three slots, most of them backend runs waiting behind
  an emulator and each other. Measured worst case so far (16:15 the same day): emulator 4.9 GB + a
  phone gate run 3.7 GB (its export step, 18 bundler processes; the gate script now caps them
  at 4) + two backend stacks left 2.3 GB of RAM free. So the heavy pool stays at 2, every held
  slot counts toward it (also an emulator that took slot 3 while the pool was larger), and a
  web test run measured under 1 GB. Each pool is first come first served. A
  slot is reaped when its owner's process is gone, or after two minutes when its holder file was
  never written. A lane never starts a heavy job outside the lock.
- **Docker networks.** The predefined address pools are exhausted on this machine by another
  project's 29 networks (`docker network create` fails with "all predefined address pools have
  been fully subnetted"). FixFlow gates therefore share the database container's network
  namespace; anything that needs a real network (the P3a compose smoke, the lab stack) declares
  an explicit subnet inside `10.77.0.0/16`. FixFlow never prunes a network it did not create and
  never reconfigures Docker.
- **Other sessions.** Another project's containers run on this machine. A FixFlow session
  removes only containers named `fixflow-*` and never restarts Docker or WSL. After the power
  loss the coordinator started Docker Desktop (the owner had said to continue everything); it
  changed no Docker setting.
- **Memory, measured with eight lane sessions running (2026-11-13):** 5.5 to 7.7 GB free of 31;
  commit 35 to 41.5 of 50.1 GB; the Docker VM held 8.3 GB of which 4.4 GB was disk cache it was
  not using. The gate script therefore drops the VM's page cache after every backend run (cache
  only; the first drop gave 2.2 GB back at once), the slot count stays at 2, and eight sessions
  is the ceiling until some finish. The queue is first come first served: before that, one lane
  waited 20 minutes while later arrivals were served. Gate runs queue, so a lane's inner loop
  passes pytest args for the tests it is working on and keeps full runs for merge-readiness.
  **With ten lane sessions and three reviewers (15:44 the same day):** 4.1 GB free, commit 44 of
  50.1 GB; the lane processes held 9.7 GB, the Docker VM 8.5 GB, the emulator 4.7 GB, the
  owner's own applications about 4.4 GB. Ten sessions is the ceiling; a watcher reports when
  free commit falls under 3 GB.
  **The Docker VM does not return freed memory by itself (17:00):** after two Android builds it
  held 9.0 GB of host RAM while using 3.2 GB inside, and the host fell to 1.4 GB free. Dropping
  the VM's clean caches and compacting its memory returned 2.8 GB in 40 seconds (host free
  1.4 to 4.0 GB), with nothing restarted and no setting changed. `docs/program/lab/vm-return.sh`
  does this whenever the host has under 3 GB free; the coordinator keeps it running, and the
  backend gate compacts at the start and end of every run.
- **Ready signal.** A lane that reports READY also marks its PR ready for review (`gh pr ready`);
  a coordinator watcher polls that flag and wakes the binding review.

### 7.5 New phases

- [ ] **L1 — Parallel gate harness** (coordinator). `ff-gates.sh`, `ff-slot.sh`, a baseline of
  all three kinds on `main`'s code. **Done when** the baselines are recorded in §7.8.
- [ ] **L2 — Local Android compile gate** (lane L, Docker only, Opus). A container with JDK 17 and
  the Android SDK/NDK from their official sources; `ops/lab/android-compile.sh <lane> <worktree>`
  copies `technician-app` **into the container**, runs `expo prebuild` there (never in the
  repository: design §8) and `gradlew assembleRelease`, with Gradle and npm caches in named
  volumes. It is the native compile gate CLAUDE.md says does not exist, it gives P5a and P5b-1
  their "compiles" check in minutes instead of an EAS queue (the EAS build stays for every
  artifact a phone receives), and it answers the P5-spike's desk question — does
  `react-native-background-geolocation` build on SDK 52 / RN 0.76.9 old architecture — before
  any phone is involved. **Done when** `main` compiles to an APK here, the time, size and
  certificate are recorded, and the SDK compile fact is recorded yes/no with the log.
- [ ] **L3 — Device lab** (lane L; needs the owner's yes to install the Android toolchain: a JDK,
  platform-tools, build-tools, the emulator and one system image, about 8 GB, into a user
  folder — the same adb, apksigner and JDK that P0a item 10 asks the owner to install). A native
  emulator on the Windows Hypervisor Platform. Three scripted protocols with logs and screen
  recordings under `docs/program/evidence/lab/`: **(a) drain rehearsal** — the field commit's
  APK fills its queues against a stub that answers the edge 404, fleet v1 is installed over it
  with the same lab key, the queues drain into a local backend, and `drain_audit.py` AFTER
  equals the manifest: P2c and P4a's logic meets a device before it meets a phone holding real
  data; **(b) the adb-scriptable steps of the O-01 protocol** on stock Android — location
  toggle, process kill, doze, reboot, the cross-stop `dumpsys` check; **(c) the offline
  matrix** — airplane mode, timeout, 5xx, edge 404 and 401 against each queue kind.
  **No lab build can reach a real server:** the lab's "field" build points at a local stub that
  answers the edge 404 and its "fleet v1" build at the local backend; none bakes `api.<domain>`
  or an old Railway hostname as a reachable host, and the emulator signs in only to the lab
  backend with lab accounts, never as a roster technician (the P5-spike guard, plan lines 771-774).
  **Standing rule 2 is unchanged:** the lab is a pre-gate on stock Android; it makes a field
  session confirm instead of explore, and it supports no reliability claim about the fleet.
- [ ] **L4 — Train and restore rehearsal** (lane L). For every behaviour-changing PR that reaches
  `main`: restore the newest dump (a seeded database until P0a item 4 supplies the real one) into
  Postgres 17 per Appendix C, run `start.sh`'s migrations to the new head, run that PR's
  post-deploy check, record it. P3b's restore, PIN rotation and deep-health read-back are
  rehearsed the same way against the P3a compose. **Done when** each deploy-train row has a
  rehearsal row beside it, so P4c replays a tested sequence.
- [x] **P0a-prep** (coordinator). The `W0-results.md` step table committed, the hold notice
  drafted in English and Urdu for the owner to send, item 10's tools installed on the owner's
  yes. Items 1–9 and 11–16 remain the owner's; nothing here touches a dashboard or a phone.
  **Done 2026-11-13:** the table, the notice (English, Urdu, Roman Urdu; not sent), the
  five-script kit under `docs/program/lab/p0a/`, and — on the owner's "Yes, install" the same
  day — adb, apksigner and a JDK (§7.4). The installer's first run printed "INSTALL OK" with no
  SDK package on disk (a PowerShell pipe into `sdkmanager.bat` installs nothing and exits 0);
  `docs/program/lab/android-toolchain-install.ps1` now reports success only for files it finds
  on disk and lists any file it could not create.
- **L3 runs in parts.** **L3a** (lane session, started 2026-11-13, stacked on L2): the rig —
  `ops/lab/device/emu.sh`, a lab backend whose port can instead serve an `edge404`, `5xx` or
  `hang` stand-in for the dead host, a lab APK that bakes only `http://10.0.2.2:<port>`, and
  `app.sh`, which reads the app's queues straight from its storage — plus the first two
  protocols on today's app: the tracker checks (`O01-F01`, `O01-F03`, `O01-F20`, a fence
  crossing) and four writes against the edge-404 stand-in, each reported as reproduced / not
  reproduced / inconclusive with its evidence. Every check must be shown failing once. **L3b:**
  the drain rehearsal, when P2a and P2b-1 can be built. **L3c:** the remaining O-01 steps, the
  full offline matrix, and more Android versions once P0a item 5 names the fleet's.
  **The emulator boots here (measured 2026-11-13 14:38):** the L3a lane's instance of `ff34`
  reported `sys.boot_completed=1` as Android 14 / API 34 / x86_64 (`sdk_gphone64_x86_64`,
  userdebug) under the Windows Hypervisor Platform, with the lab build of
  `com.fixflow.technician` installed; its process held 3.8 GB of host RAM. The coordinator's own
  boot proof (`docs/program/lab/emulator-boot-proof.sh`) passed every compatibility check
  (hypervisor, system, hardware GPU, disk) and was then refused only because that AVD was
  already running: one AVD, one instance.

### 7.6 Waves

| Wave | Starts when | Lanes |
| --- | --- | --- |
| **A** | 2026-11-13 | P1, P2a, L2, P7a, P6a, P9-0a, then P12a and L3a the same day (eight sessions: RAM, not CPU, sets the ceiling) |
| **B** | a wave-A PR is review-passed | P2b-1 (on P2a), P3a with its stub and heartbeat (on P1), P8a (on P7a), P12 (on P12a), P7b-2 (on P7a), P2b-2 (after P2b-1's schema commit), L3 (on the owner's yes) |
| **C** | wave-B tips are review-passed | P5a (at risk), P8b, P6b-1, P7b-1, P9a-1 (after P9-0b), L4 |
| **D** | as tips allow | P5b-1, P5b-2, P6b-2, P9a-2, P9b, P10a, P13a–d code |

The owner's chain (P0a → P0b → P3b → P3c → P4a → P4b → P4c, then P5c, P5d, P10b, P13e; **P9-0b
right after P0a**, as soon as a verified dump and P9-0a exist) runs beside all four waves and is the critical path: no wave shortens it, each wave empties what
waits behind it.

### 7.7 Merging

A PR is **merge-ready** when its gates are green locally, CI is green, the reviewer's verdict
names its head SHA, it is not on the merge-hold list, and the coordinator has read the verdict.
The owner merges (v8). The owner may delegate the merge of merge-ready PRs to the coordinator;
that decision is a `W0-results.md` row. **Delegated on 2026-11-13** ("Yes, you merge"): the
coordinator merges a PR when CI is green on its head, the coordinator's own binding review has
passed on that same SHA (a push after the review means a re-read of the diff since it), the PR
is not on the merge-hold list, and its merge-order predecessor is merged. Squash merge; the
branch is kept while a lane or a stack still uses it; the commit body names the phase, the
register ids, the review verdict with its SHA and the plan tag. Merging deploys nothing
(standing rule 3). Until a base PR merges, its stack keeps building on the
reviewed tip.

**`release/drain` is cut at `a31924a`** (`main` before the program's first merge) and receives
the squash commits of P1, P2b-2 and P3a by cherry-pick, in that order. v8's "a branch at P1's
squash commit" (plan lines 66-67) assumed nothing merges before P1; under build-ahead something
may, and every commit below P1 would then be in the drain image (§7.8 finding 1).
`git log a31924a..release/drain` must show exactly those squash commits and any re-cut fix.
`release/drain-web` is that branch plus the P12a and P12 commits, also by cherry-pick.

### 7.8 Record of this amendment

**L1 — done 2026-11-13.** Baselines through `ff-gates.sh` on `main`'s code (plan-branch head,
whose `backend/`, `src/` and `technician-app/` equal `a31924a`), lane `base`:

| Kind | Result | Wall time | Evidence |
| --- | --- | --- | --- |
| backend | 7 gates green; 757 tests, 0 skipped, 0 integration tests skipped; pip-audit advisory exit 1 (open ranges, not a gate) | 7 min 23 s cold (image pulls and a cold pip cache included) | `C:/Users/User/.fixflow-cache/gate-logs/base/backend-20261113-121753/summary.txt` |
| web | lint, format, 106 tests in 19 files, build: green | 33 s | `…/base/web-20261113-122631/summary.txt` |
| mobile | typecheck, 334 tests in 39 suites, `expo export`: green | 29 s warm (`node_modules` already installed) | `…/base/mobile-20261113-122704/summary.txt` |

Two defects of the first harness draft were found by running it, not by reading it: the user
network could not be created (address pools exhausted, §7.4), and `docker cp` silently failed on
a `/c/…` path with path conversion off, so per-gate logs never reached the host. Both are fixed
(`be2e27a`). Design Appendix C creates the network `fixflow-w1` and therefore cannot run on this
machine as written; `docs/program/lab/p0a/verify-dump.sh` is its working form.

**The refuter pass on this section (2026-11-13).** One fresh-context Opus critic, read-only,
briefed to break §7.2's classification, §7.3's ownership, the merge-hold list, the rulings, the
contracts and the harness: 1 blocker, 7 major, 12 minor; 58 tool uses. Folded into this text as
**v9.1**. Lanes P1, P2a and L2 had started before it returned (they were entry-free under v8);
P7a, P6a and P9-0a started while it ran, and each affected lane was sent its correction.

| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | blocker | `release/drain` "at P1's squash commit" would swallow anything merged before P1 | **accepted**: the branch is cut at `a31924a` and takes P1, P2b-2, P3a by cherry-pick (§7.7) |
| 2 | major | P3a-2 built first creates the runbook and touches `ci.yml` ahead of P3a and P1 | **accepted**: P3a-2 is not started early (§7.2); it was never launched |
| 3 | major | The merge-hold let the accounting PRs deploy from `T_close`, during the fleet work HR-A4 protects; the quoted reason was the refuted claim, not the ruling's | **accepted**: hold until P5d-2 done; reason corrected (§7.2) |
| 4 | major | `queue_discard` keyed on the uploading principal loses whose data a shared-phone discard destroyed (`O6-F14`) | **accepted**: `owner_tech` and `discarded_by` in props (§7.3) |
| 5 | major | Two gate runs for one lane could share a database (check-then-remove race; the trap removed the other run's containers) | **accepted**: a per-lane lock before anything else; proved by a refused second run (exit 4) |
| 6 | major | P1's cold-resume trial cannot find the plan on `main` and may not commit under `docs/program/` | **accepted**: plan-branch path, hand-off folder (§7.1) |
| 7 | major | The implementing lead wrote its own reviewer's brief | **accepted**: the binding review is the coordinator's (§7.1) |
| 8 | major | P6a, P7b-1, P7b-2 were split across lanes without saying so | **accepted**: no undeclared splits (§7.2, §7.3) |
| 9 | minor | P1's ping ceiling and P6a's accuracy ceiling meet in `attendance/service.py` | **accepted**: listed as shared; P6a rebases after P1 |
| 10 | minor | P7a registers settings in `tenancy/specs.py`, a B-att file | **accepted**: shared, append-only |
| 11 | minor | The gate container did not set `FIXFLOW_ENVIRONMENT` | **accepted, differently**: mirrored from the worktree's `ci.yml`, so a pre-P1 worktree still runs as CI runs it |
| 12 | minor | Gates test the working tree but label the result with HEAD | **accepted**: `tree=dirty(n)` in the summary; merge-readiness needs a clean tree |
| 13 | minor | Extra pytest args can deselect integration tests; the skip check matched any "integration" text | **accepted**: `RUN partial` flag; the check matches conftest's own skip reason only |
| 14 | minor | The slot lock reaped live holders after 120 min; three backend stacks exceed free RAM | **accepted**: reaped only when the owner's process is gone; 2 slots while a Gradle lane runs |
| 15 | minor | P9-0b was moved earlier in §7.2 but not in §7.6; item 4 can end with no dump | **accepted** (§7.2, §7.6) |
| 16 | minor | v8's P7a refuses `log_payment` on a closed job for everyone, but P4r's residue is entered by the manager after the train has deployed P7a | **open ruling**: P7a builds v8's text with the actor rule isolated in one predicate; the coordinator rules (manager exemption with a reason, or an explicit residue path) before P7a merges |
| 17 | minor | Lane branch names differ from v8's Resume lines | **accepted**: the PR title is the resume key (§7.1) |
| 18 | minor | A lane could read uncommitted plan text | **accepted**: commit, push and tag before telling a lane (§7.1) |
| 19 | minor | A lab build baked with `api.<domain>` could write into production from the emulator | **accepted**: no lab build can reach a real server (§7.5) |
| 20 | minor | The telemetry-names file's creator moved without amending v8 | **accepted**: recorded in the contract table (§7.3) |

Held against attack (the critic's own "tried and could not break"): the backend accepts any
telemetry event name, so the new names need no migration; P1's body caps are ASGI middleware and
do not touch P7a's routers; P7a needs no new import-linter edge and shares no function with P1
(the legacy verifier is method-based in `identity/deps.py`); P12a's key rotation covers the 409
P7a adds; P9-0a builds without a host; P2a needs only the header name; the all-or-nothing slot
take cannot deadlock; P6b, P7b-1 and P13 holds agree with their v8 Entry lines. Unverified
suspicions carried forward: P2b-2's tests reusing P9-0a's fixtures (both B-tools) and then
failing on `release/drain`; P7b-2's stale-pending sweep registering in `main.py` (B-core).

### 7.9 Rulings and plan corrections from the first lane reports and binding reviews (2026-11-13)

Each row is something a lane or a binding review found by building or attacking, not by reading the
plan. Lines above §7 keep their numbers, so the corrections live here and win over the text they
correct.

| # | Source | Finding | Ruling |
| --- | --- | --- | --- |
| R11 | P7a lane (PR #191, journal 18) | "Nothing the installed APK does is newly refused" (P7a Deliverables) is false for writes on an **unclaimed** job: the deployed app lets a technician add a note, mark ready, close, abandon, run the arrival wizard, start travel and send WhatsApp without claiming first, and `require_job_actor` as written answers 403, which the phone parks as failed | **A technician's write to an unclaimed job first claims it for that technician**, atomically, through the existing claim path with its usual event, then proceeds; a lost race is 403. It grants no new power (any technician may claim an unclaimed job) and keeps one owner per job. Reads keep the plan's rule. The owner may overrule before P7a deploys; a v2 app can make the claim explicit |
| C1 | P7a lane | The replay order in P7a's Deliverables (negotiate, payment, completion) cannot run: negotiate needs a bill and the completion creates it | The replay is completion, negotiate, payment, transition |
| C2 | P7a lane; §7.8 finding 16 | Closed-job payments: plan line 999 refuses everyone, O-05 item 3 refuses non-managers only, and P4r has the manager enter cash residue after P7a is deployed | Still the owner's decision (W0-results). P7a builds line 999 with the actor rule in one predicate, `_closed_job_refuses_money_write`, so the answer is a one-line change |
| C3 | P7a lane (journal 19) | After a manager reassigns a job, the previous technician's queued writes are refused 403 (payments and the creator's own create replay excepted) and are parked, visibly, on that phone | Accepted as built: the write is not deleted, and the manager can see and re-enter it. Listed for the v2 app's copy |
| C4 | P2a binding review (PR #189, finding 3) | A build containing P2a, pointed at a backend that sends no marker, treats every 4xx as connectivity: an expired token never reaches sign-in and a real rejection is retried forever. Ruling R8 assumed every backend the fleet APK can reach is P1 or later, but no Entry line said so | **P2c's Entry gains "P1 merged"**, and no build containing P2a is ever pointed at a backend without P1. The device lab runs a P2a build only against a lab backend that contains P1 |
| C5 | P2a binding review (findings 1, 2) | One evidence-upload path (`ArrivalJobWizard`) kept a private status ladder; a clock-in the server refuses left the on-duty sampler recording for up to 14 h | Sent back to the lane as must-fix: both are inside P2a's Scope (HR-A2; `O3-F3`; the location-privacy bound in CLAUDE.md) |
| C6 | P12a binding review (PR #193, finding 1) | The idempotency key survived a retry but not a page reload or a second tab, so a partial payment could still be recorded twice | Sent back as must-fix: unconfirmed attempts persist in `localStorage` for 24 h with a discard control |
| C7 | P12a binding review (finding 3) | A genuinely separate payment identical to an unanswered-but-landed one reuses its key and the server silently returns the earlier row | **P8a's Scope gains:** the payment response says when it is a deduplicated replay, so the web can tell "confirmed the earlier payment" from "recorded a new one" |
| C8 | P2a binding review (unverified) | A `drainAll` pass started for one technician may keep sending after another signs in on a shared phone | P2a verifies and fixes or journals it; P2b-1's shared-phone work (`O10-F10`) inherits whatever is left |
| C9 | P2a binding review, second pass (finding N1) | After a clock-out the server refuses while it still has the technician clocked in, location sampling correctly resumes, but the parked clock-out does not tell the technician so | **P2b-1's Scope gains:** a parked clock-out says the technician is still on duty and location recording continues until the clock-out is accepted |
| C10 | P1 binding review (finding 1) | A legacy-secret token can replay an idempotent POST and read its response (a signed media URL; a job with the customer's phone). It needs the old secret and the ids | Accepted as the residual of ruling R10 (default OFF; a supervised window only; the secret is sealed in P0a and destroyed at P4c). **P7b-1's Scope gains:** correct the docstring and return no playback URL to a legacy principal |
| C11 | P6a binding review (PR #192; five minor findings, none blocking) | A shift open across midnight shows as not clocked in on today's board; the web's "silent" label can count minutes from an earlier session's ping; two settings nothing reads remain in `config.py`; a dash-separated BSSID counts as a Wi-Fi miss; the single shop-timezone source (`O04-F8`) holds inside the attendance slice only | Merged as `47a2246`. The first four, and the payroll job's "today" in `main.py`, are fixed by the same lane in a follow-up PR (`[P6a] follow-up …`) before P5a consumes the fixture. **P8a's Scope gains:** the jobs report reads the shop timezone through the validator (`jobs/service.py`, the rest of `O04-F8`) |
| C12 | coordinator, at the P6a merge | A PR's green CI ran on a merge with the `main` of its last push. Once another phase merges, that result no longer describes what a merge would produce | When `main` has moved since a PR's last CI run, the binding review's gate run is on the PR head **merged with current `main`** (a local merge in the reviewer's own checkout), or the lane rebases first; `main`'s own CI run after every merge is the backstop, and the coordinator reads it |

| C13 | P7a binding review (PR #191 at `76a5128`; no blocker or major, six minor) | (1) an oversized job token answers 500 on two media routes; (2) media delete is outside the actor rule, and an evidence row with no recorded capturer can be deleted by any technician; (3) a close that landed on an unclaimed job before the deploy answers 409 when the phone replays it, although a replay must be an idempotent success; (4) the payment replay returns the full job to a former technician; (5) the discount cap is measured against an original bill the technician can lower first; (6) creates from before the deploy carry no actor. Unverified by the reviewer: a completion resubmit racing a close is still check-then-act | 1 to 4 are fixed in the PR before it merges. **P8b's Scope gains:** the cap is measured against the first original in `job_bill_revision` (P7a documents the limit in the setting's description). 6, and whatever write kinds still answer 409 on a closed unclaimed job, go on P7a's deploy-train row. The completion race is fixed in P7a if it is the same row lock as the three guarded paths; otherwise **P8a's Scope gains** it. **P13b's backlog gains:** `GET /api/customers/lookup` answers a customer's name for any phone number to any technician |
| C14 | L2 binding review (PR #188 at `7cb4c7d`; one major, eight minor) | A build that is killed hard frees its slots but leaves its 6 GB container running outside the lock; an untracked `.env.production`, `credentials.json` or keystore would be copied into the build and never redacted; the output is named like a release; the Gradle cache volume holds unredacted task outputs. The lane's numbers, the redaction and the read-only mount all held | Sent back: stale Android containers are removed once every slot is held; the copy list refuses secret-bearing files; the APK is named compile-only; Docker is checked before queueing; the template is pinned; the README and the `CLAUDE.md` sentence are corrected. The two `ff-slot.sh` gaps the review confirmed (a slot left without a holder file; an acquire stopped part-way) were closed by the coordinator the same hour |
| C15 | P12a binding review, second pass (PR #193 at `9e89425`) | Both double-charge paths are fixed and proven. Left: the discard control says "It did not go through", which the manager cannot know, and the payments list behind the form is not re-fetched, so a manager can discard a payment that had landed and enter it again | Sent back for that one item: the job is re-fetched when the form opens with an unconfirmed attempt, and the control asks for a check instead of asserting an outcome |
| C16 | P12a binding review, third pass (PR #193 at `986b3ab`: PASS, two notes) | The re-read added in the last round is applied with no check of which answer is newer: a slow re-read issued after a timed-out payment can arrive after a successful retry and remove that payment from the list, and a manager who then enters it again charges the customer twice. The "possible landing" hint has no first-send time to filter on | Merged as `15df06d`. The first note is closed by the same lane in a follow-up PR (`[P12a] follow-up …`: a re-read is applied only if no payment call for that job started or succeeded after it was issued), and **the web image for the drain window (`release/drain-web`) is not cut before that follow-up is merged**. The second errs in the safe direction and is journaled for P12 |
| C17 | P9-0a binding review (PR #190 at `af58e9b`; one major, seven minor) | The export held under attack (read-only by declaration and by check, integer money, stable External IDs, no secret in any output), but no test pinned which side of the books a ledger kind lands on: the reviewer booked a salary backwards and all 84 tests passed. Also: ledger week boundaries untested; the shop timezone read without validation; a seeded fixture summed into the real totals; the owner's actual command absent from the repository; real names were the default | Sent back: a test pins the debit role, credit role and technician line of each ledger kind against `LEDGER_SIGN`; boundary rows; an invalid timezone is refused; real and seeded sums are separate and seeded rows are marked; the Docker command is in the docstring; **pseudonymised output is the default and real names need `--real-names`** (HR-A4). **P8a's Scope gains:** the script dates a payment void from `voided_at` once that column exists. **The P9-0b runbook gains:** exports from two different dumps are never mixed |
| C18 | P6a follow-up, binding re-read (PR #196 at `a6e27f5`: PASS, notes only) | All five items of C11 are fixed and proven (14 new or changed tests fail on `47a2246`). Notes: the payroll job's shop-local "today" has no test of its own; an overnight shift is carried on the board, but its hours after midnight are measured in no day's breakdown, and the day's status can read "absent" beside the on-duty chip; `technician-app/src/features/jobs/arrivalGate.ts:25` still names a deleted setting | Merged as `9b2e8f5`. **P6b-1's Scope gains** the overnight-shift item (hours after midnight belong to a day; one status per technician per day; a test for the payroll job's `shop_today`). **P5a's Scope gains** the stale name in `arrivalGate.ts`, a file it rewrites |
| C19 | L2 binding review, second pass (PR #188 at `1fdbdd4`: PASS, notes) | All nine findings fixed. Notes: the orphan removal is safe only while the run holds the heavy pool, and the acquire inherits the caller's `FF_POOL`; the secret-file refusal is case-sensitive and runs after the slot wait; the Gradle checksum first applies on the next cold build; the cold build at 6g is unmeasured. The lane's session would not edit `CLAUDE.md` on another session's request | Merged as `34f1dcd`. The first two notes go into a small follow-up PR by the same lane. The `CLAUDE.md` sentence is the coordinator's own PR (#199), reviewed and merged under the same gate. **From now on a mobile PR that changes the native build inputs (`app.json`, `app.config.js`, `eas.json`, `package.json` dependencies, plugins) is compiled with `ops/lab/android-compile.sh` before its binding review is called PASS**; the coordinator runs it. First use: P2b-1 |
| C20 | P12a follow-up, binding review (PR #198 at `67a68ae`: PASS-WITH-FIXES, one major) | The stale re-read is fixed, but the follow-up's 20 s timeout also applies to a job page's first load: on a slow link the page then shows Rs 0 paid and the full balance, with no error and no retry, and Log Payment is enabled; a manager can enter a payment that is already in the books (a wrong entry, not a replay, so the key cannot catch it). `main` already showed that silent zero on a failed load | Sent back: until a job's detail has loaded, the page says the payments are not loaded and offers a retry in place of the paid amount and the balance, and Log Payment is unavailable. The web image for the drain window still waits for this follow-up (C16) |
| C21 | P7a binding review, second pass (PR #191 at `28dc751`: PASS, two notes) | All seven items of C13 are fixed (the first-pass 500 was confirmed by running it; the completion resubmit now takes the job row lock). Notes: the completion's **first** submission is still not locked, so one racing an abandon could land on the abandoned job; a media delete on another technician's closed job answers "evidence is frozen" where "not assigned" was expected (still a 403) | Merged as `6ff6039`. **P8a's Scope gains** the first-submission lock. P8a's Scope now also carries, from earlier rows: the deduplicated-replay flag in the payment response (C7), the jobs report's validated shop timezone (C11), and the export script's void date from `voided_at` (C17, once PR #190 is on `main`). The wording note is journaled |
| C22 | P2b-1 binding review (PR #197 at `d2938f7`: PASS-WITH-FIXES; 19 deliberate breaks, 15 caught) | No defect that loses, duplicates or misattributes a technician's records; the order snapshot, un-park, receipt, drain holds; the pinned drain image accepts the manifest event and has no body cap on `/api/events`. To fix: a discard whose trace cannot be written still deletes the row; a corrupt manifest part triggers a second snapshot over the archive even after the receipt; presence and travel can lose their gate check with no test failing; the receipt is not tied to its manifest id; the fleet maximum is optional in the version check; the "too old" prompt appears on payments; arrival drafts are not counted in the manifest. The reviewer's one major was an evidence gap: no native compile of a head that changes `app.config.js` and `eas.json` | Sent back for those items. **The native compile is shown:** the coordinator ran `ops/lab/android-compile.sh` on `d2938f7` (exit 0; APK 79,912,613 bytes; versionCode 1, the development default; evidence under `docs/program/evidence/compile/`), and repeats it on the final head (C19). **Unchanged from §7.2: P2b-1 merges only when the owner's two values are filled** (the domain name; the fleet's highest versionCode), so a PASS leaves the PR open; P2b-2 and the lab's drain rehearsal build on its branch meanwhile |
| C23 | P12a follow-up, second pass (PR #198 at `c70ae78`: PASS, two older notes); the `CLAUDE.md` sentence (PR #199 at `8ca48db`: PASS) | The job page now shows no paid amount, no balance and no Log Payment until that job's payments have loaded, with a Retry; `apiGet` takes only an abort signal. Notes that predate the PR: the dashboard's revenue tile counts only jobs whose detail has loaded; a payment form left open reopens on the next job once its payments have loaded | Merged as `fa860f9` and `53db3b8`. **The hold of C16 is lifted:** the web image for the drain window is cut from a `main` that contains `fa860f9`. **P12's Scope gains** the two notes |
| C24 | P3a binding review (PR #195 at `f9d4a5b`: PASS-WITH-FIXES, four major, four minor; ten deliberate breaks) | (1) The hang stub answers by itself: Node writes its own 400 to an HTTP/1.1 request with no Host header, in both modes (standing rule 5). (2) The restore gate matches only `key=`; Compose also reads `key: value`, so a line in `backend.env` could start the backend as `dev` or with the dispatcher on (rules 3 and 4). (3) Runbook 10.6's STOP remedy removes the public route, after which the old platform's edge answers every phone with a bare 404 and the installed app parks its records. (4) The restore section drops the live schema before the dump is proven and without first saving the live database, and runbook operation R3 sends a live host there. Minor: CI renders nothing from the production compose; a port check in `CLAUDE.md` that can never pass; the stub's README does not say when the stub is not a guarantee; the backend image runs as root. The lane's eight reported plan defects were judged real or harmless | Sent back for 1 to 7; 8 if the image allows it. **Rulings on the lane's plan defects:** the web image for the drain window is tagged `drain-web-image`; CI runs on `release/drain` and `release/drain-web` (the branch filter is added in this PR so the cherry-pick carries it); the gate script's default Postgres image moves to 17 when this PR merges; O-10's 48 h ping ceiling is superseded by the code default of 240 h since P1 |
| C25 | P9-0a binding review, second pass (PR #190: PASS, bound to the rebased head `f93ee97`) | All seven items of C17 fixed; the two breaks that had passed every test are now caught, and two new ones; the docstring's Docker command, run as written against a Postgres 17 restore of a dump made with the backup job's flags, exported a balanced week with no real name in any file. Notes: an SQL failure is reported as "could not use the database" (the SQLSTATE is shown); a file error with no filename is labelled as a database error | Merged as `c392cf8`. **P8a's Scope gains** both notes and a re-run of the export suite and the docstring command once migration 0047 lands. With P9-0a merged, the Odoo rehearsal (P9-0b) needs only a restored dump and the owner's answers to P0a items 15 and 16 |
| C26 | P2b-1 binding review, second and third pass (PR #197: PASS at `c5eadbd`) | Every item of C22 is fixed or answered: a discard is aborted when its trace cannot be written; no second snapshot after a receipt; the receipt is tied to its manifest id; arrival drafts are counted (counts and job ids only); the largest manifest measured at 652 KB, with the upload timeout now scaled to its size; the fleet export shows the placeholder domain and `jobs.outbox.v2` in the bundle. Notes: with storage truly full a discard is refused and the row stays; the server can keep a second pending media row when an un-parked item is uploaded again | **PASS, not merged.** Per §7.2 the PR stays open until the owner supplies the domain name and the fleet's highest versionCode; `merge-ready.sh` now refuses P2b-1 while either is a placeholder. Filling them is one commit, re-read by the same reviewer. P2b-2 and the lab's drain rehearsal (L3b) build on the branch `claude/silly-kowalevski-9f2fc3` at `c5eadbd` meanwhile. **P7b-2's backlog gains** the duplicate pending media row |
| C27 | P3a binding review, second pass (PR #195 at `d1b3de1`: PASS, three notes) | All four majors of C24 are fixed and the attacks repeated by running them: a Host-less request is silent in hang mode; the restore gate refuses every spelling of a forced key but the exact one (and the loader experiment showed why it must: the last spelling in the environment wins); the runbook proves the dump and saves the live database before it drops anything, and never detaches the old hostname while a phone lacks its row. CI now renders the production compose and refuses a published port, a missing gate or a missing forced key; the backend image runs as a non-root user. Notes: the smoke does not assert the drop-after-check order; the "never drop while the only copy is on this disk" guard is an instruction, not a script check | Merged as `90ea88d`. `main`'s CI and `ff-gates.sh` are on Postgres 17 from this merge (`FF_PG_IMAGE=postgres:16-alpine` for a branch cut earlier). **L4's Scope gains** both notes: the restore rehearsal runs runbook section 6 as written and says whether a scripted guard is needed. **The drain image now lacks only P2b-2**; P3b (the owner's host work) can begin from `docs/RUNBOOK-SELFHOST.md` on `main` as soon as P0a's answers exist |
| R12 | **The owner, 2026-11-13** (answering the question left open by C2 and §7.8 finding 16) | May a manager record or void a payment on a job that is already closed? Plan line 999 refused everyone; cash found on a phone after the drain for a closed job would then have no way into the books | **Yes, managers only.** A manager may record a payment on, and void a payment of, a closed job; each such write requires a written reason and is logged as its own event that says the job was closed. A technician never may: the 409 ending `(current status: closed)` is unchanged. Negotiation and the completion stay frozen for everyone once a job is closed (the bill freeze). **P8a builds it** in the one predicate P7a left for it (`_closed_job_refuses_money_write`), keeping the job row lock; the web half (a reason field on a closed job's payment form) goes to P12. This supersedes plan line 999 and the P7a deploy note that called the question open |
| C28 | **The owner, 2026-11-13: "Yes, merge #185"**; the coordinator's review before merging (three passes) | PR #185 (13 skill packages, 11 agent definitions, written 2026-11-04 against `a31924a`) held no secret and no unsafe grant, but three passages would by now have misled an agent: the self-host skill told the architect to DRAFT the production compose and runbook that P3a had already merged; the security-review skill stated pre-P1 facts in the present tense; the Maestro write flows were kept off a real backend only by a sentence. Ten smaller statements were stale. Four headers did not parse in a strict YAML parser, one of them broken by the coordinator's own first correction (a `#` that cut a description short). About 1,900 `path:line` citations refer to `a31924a`; six in ten of the 486 resolvable ones were still exact | Corrected in two commits on the PR's branch, re-read twice by the same reviewer, CI green, merged as `f2b7a5e`. A dated notice in `.claude/skills/README.md` says every citation refers to `a31924a` and must be re-read before it is quoted as current. **Briefs now point at the definitions on `main`** (the coordinator's checkout `.claude/worktrees/coord-main/.claude/`), not at the side worktree. **PR #182 (the plan) stays on its branch.** One reviewer finding was rejected on evidence: CI moved to Postgres 17 with P3a, not P1 (the workflow file at `87bbe88` and `6ff6039` still names 16) |
| C29 | coordinator, 2026-11-13 19:30, after another session merged `main` into the plan branch (`39ed262`) and its merge note named a commit `main` does not have | The plan branch has carried `3810e42` since 2026-11-01: the tech-metrics report took its default `end` from the UTC date while the service buckets by the shop's local day, so four tech-metrics tests on `main` fail whenever CI or a gate runs between 19:00 and 24:00 UTC (00:00 to 05:00 in Karachi). Every lane PR cut from `main` inherits it; the lanes had only ever run in the Karachi daytime. PR #182 was therefore never docs-only | Cherry-picked unchanged onto `main` as PR #204 (`[P7a] follow-up …`), reviewed by the reviewer of P7a and merged under the usual gate, before 19:00 UTC the same day if the review passes. P8a (PR #202) touches the same function for C11 and rebases onto it. **A gate or CI failure in `jobs/tests/test_tech_metrics.py` on a branch cut before that merge, in that window, is this defect and not the lane's work** |
| C30 | PR #204 binding review (PASS at `3182918`; the claim of C29 reproduced with the clock frozen at 20:32 UTC); coordinator | The same defect exists on the drain tree: `release/drain` is cut from `a31924a`, P3a added CI on that branch, and P2b-2 must prove its script on that tree. Cut or tested between 19:00 and 24:00 UTC it would show four failing tests at the moment the owner pins the image that will hold the only copy of the data | Merged to `main` as `f192fee`. **The drain image takes the fix: `release/drain` is `a31924a`, then P1 (`87bbe88`), then `3810e42` (the original commit, which applies cleanly on `87bbe88`; the squash `f192fee` sits on top of P7a and is not the one to pick), then P2b-2, then P3a (`90ea88d`).** This supersedes the list of three in §7.7. P2b-2's drain-tree proof and L4's rehearsal use that order; the runbook's cut section is corrected by a follow-up PR from the lane that owns it (`[P3a] follow-up`) |

**Merged so far (2026-11-13, by 19:45):** P1 as `87bbe88` (binding review PASS at `73738d1`); P2a as `5cd29b1` (PASS at `62cabae` after a fix round); P6a as `47a2246` (PASS at `e1dfaca`, C11) with its follow-up as `9b2e8f5` (PASS at `a6e27f5`, C18); P12a as `15df06d` (PASS at `986b3ab` on the third pass, C16) with its follow-up as `fa860f9` (PASS at `c70ae78`, C23); L2 as `34f1dcd` (PASS at `1fdbdd4` on the second pass, C19) with its follow-up as `02af3cc` (PASS at `7749696`) and the `CLAUDE.md` sentence as `53db3b8` (PASS at `8ca48db`); P7a as `6ff6039` (PASS at `28dc751` on the second pass, C21); P9-0a as `c392cf8` (PASS at `f93ee97` on the second pass, C25); P3a as `90ea88d` (PASS at `d1b3de1` on the second pass, C27). Eight phases in twelve pull requests, plus the skill and agent definitions (PR #185 as `f2b7a5e`, C28) and the tech-metrics timezone fix (PR #204 as `f192fee`, C29 and C30). P2b-1 passed review at `c5eadbd` and waits for the owner's two values (C26). Verdicts are filed under `docs/program/evidence/reviews/`.

**What the binding reviews were worth.** Every lane reported READY with green gates, green CI and a
clean self-check. Of the nine PRs whose first binding review has returned, one passed clean (P1), two
passed with only minor findings (P6a five, P7a six), and six had something the self-check had
not found: P3a (four ways to lose or strand records during the cutover: a stub that answers by
itself, a bypassable restore gate, a runbook step that would make the old address answer 404,
a restore that drops before it proves), P2b-1 (a discard that deletes a row without its trace),
P9-0a (a salary entry booked backwards passed every test), P2a (a private status ladder in a
component; a refused clock-in that left location sampling on), P12a (first pass: a payment key
that died on reload; second pass: a discard control that invited a double entry) and L2 (a
killed build's container running outside the memory lock). Each review re-ran the lane's
fail-on-main claim instead of trusting it. No PR has merged on a self-check alone.

**The API outages of 14:55 and 15:15.** The Claude API answered a Cloudflare "403 Attention
Required" page for a few minutes at 14:55; it ended four lane turns and all three reviewer agents
at once. At about 15:15 the same page ended two more lane turns (P9-0a, L3a). Every one resumed
from its own transcript (a lane by a message, a reviewer agent by its id), and no work was lost.
Whether many concurrent conversations from one address cause it is not known; the event is
recorded so a repeat is recognised, and the coordinator checks every lane's last message after a
quiet stretch because a lane cut off this way does not report.
