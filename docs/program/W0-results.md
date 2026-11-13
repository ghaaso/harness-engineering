# W0 results: P0a owner pre-flight

Plan @ plan-v9.1 (first written at 11a1850)

## Decisions / ruled out / owner corrections (P0a)

- (none yet; append each one the moment it occurs, dated)

Rule: an unknown is written "unknown, because ...", never 0 and never blank-as-zero. Scripts for
the "How" column are in `docs/program/lab/p0a/` (start with its `README.md`); they write only
outside the repository (`C:/fixflow-r2/`, `C:/fixflow-dumps/`, `C:/fixflow-phones/`). Start every
shell with `export MSYS_NO_PATHCONV=1`. Items run in this order: 10 first, then 1-9, then 11-16.

## P0a step table

| # | Item | MUST | How (script or where) | Result, or "unknown, because ..." | Date | Done |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | **Tools and access.** Docker Desktop running (`docker info`); Android platform-tools (adb), build-tools (apksigner) and a JDK; `npx eas-cli login`; `gh auth status`; `npx @railway/cli login` if H=yes; dashboard logins for Railway, Supabase, Cloudflare, Sentry, Firebase, Expo; USB debugging on every roster phone (item 6 needs it); a cable; a spare Android phone for P2c. | done-when | `lab/p0a/tools-check.sh`; logins by hand | Partial (coordinator, measured): Docker Desktop 29.9.2 running, GitHub CLI logged in. **Installed 2026-11-13 on the owner's yes**, in the user folder `C:/Users/User/.fixflow-cache/android` (load them into a terminal with `source /c/Users/User/.fixflow-cache/android/env.sh`): adb 1.0.41, apksigner (build-tools 37.0.0), JDK 17.0.21. eas and the railway CLI are not installed (both run through `npx` on demand and need the owner's login). Dashboard logins, USB debugging, cable, spare phone: unknown, because not yet checked by the owner. | 2026-11-13 | [ ] |
| 1 | **Fleet hold notice.** Written procedure sent to every technician: do not open the app, clock in, start travel, tap Discard, update, uninstall, clear data or reset. Date sent. Text as sent committed to `docs/program/notices/fleet-hold.md` (English and Urdu). | MUST | by hand (owner sends); file in `docs/program/notices/` | | | [ ] |
| 2 | **Railway first.** Project state. Copy the old `FIXFLOW_JWT_SECRET` from the Railway env and seal it unconditionally (used only if K=no, H=yes, v2=no and section 4 says yes; destroyed at P4c otherwise). Cut any surviving service off the database (remove its `DATABASE_URL` or scale to 0) and reset the Supabase DB password in the dashboard, so an old backend can neither drain phones nor run its 02:30 pruner (`O08-F02`). Whether the old subdomain can be bound (H), and to what. Account and billing access. | MUST | Railway and Supabase dashboards, by hand | Partial (coordinator, measured): both old Railway hostnames answer Railway's own edge 404 with header `x-railway-fallback: true`. Project state, the sealed secret, the cut-off, the password reset, H, billing: unknown, because the owner has not yet looked at the dashboards. | 2026-11-13 | [ ] |
| 3 | **R2 archive.** Mint an R2 API token; export `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`; list `backups/db/` and record the listing; copy it to `archive/pre-selfhost/` in the same bucket; laptop copy to `C:/fixflow-r2/`; list the archive prefix and record it. | MUST | `lab/p0a/r2-archive.sh <account-id> <bucket>` (token minted by hand) | | | [ ] |
| 4 | **Supabase.** Status, pause date, restore deadline as shown, Postgres major. If restorable: unpause and take the dump now through the session pooler (custom format, `--schema=public --no-owner --no-privileges`); sha256; upload to `archive/pre-selfhost/`; verify the same day with design Appendix C and record the Appendix B output. Dashboard download only: `pg_restore -l` it to learn the format; plain SQL is loaded into a scratch PG17 and re-dumped as custom format of `public`; done when an Appendix C restore of that file passes. Unrecoverable: screenshot. "Unknown" is not accepted; "project restored" alone does not satisfy this item. | MUST | dashboard by hand; `lab/p0a/supabase-dump.sh [--upload <account-id> <bucket>]`; `lab/p0a/verify-dump.sh <dump>` | Partial (coordinator, measured): Supabase's current docs state a one-year restore window for a paused Free project, and a 2024 changelog stated 90 days, so the dashboard's own date is the only authority. Status, pause date, deadline and the dump: unknown, because not yet looked at by the owner. | 2026-11-13 | [ ] |
| 5 | **Fleet roster.** Phone x technician id x OEM/model/Android version x shared-phone yes/no. | | `lab/p0a/phone-facts.sh` fills model and Android; technician id and shared-phone by hand | | | [ ] |
| 6 | **Field build, per phone.** `adb pull` of `base.apk`; signing-certificate SHA-256 (`apksigner verify --print-certs`); versionCode; `jobs.outbox.v2` in `assets/index.android.bundle` (v2) and the baked API host; K per phone against the EAS keystore certificate (`eas credentials`); the keystore exported (not re-mintable, `w2/O-08-design.md` section 1). | done-when (every roster phone) | `lab/p0a/phone-facts.sh <serial>` per phone; `eas credentials` and the keystore export by hand | | | [ ] |
| 7 | **A3 photos, per phone, today.** Airplane mode on and Wi-Fi off, open FixFlow, photograph the ClockScreen DID-NOT-SYNC list and every job banner, close the app, airplane mode off. "Not reachable" only for a phone whose session is gone. | | by hand, on the phone (the only step that opens the app) | | | [ ] |
| 8 | **Sentry.** Backend project last event; mobile project still ingests. | | Sentry dashboard | | | [ ] |
| 9 | **Workshop coordinates** and the fence radius the owner wants (at least 100 m, `O01-F04`). | | by hand (a map; the workshop's address) | | | [ ] |
| 11 | **Decisions** (plan section 4): every row answered or left to its default; incl. chain-anchor address and SMTP relay credentials (or "unanchored"), geofence thresholds, drain-window host (VPS by default, HR-A3), the SDK spike and the shift reminder (HR-A1b/c), the Odoo plan and version, and, when K=no, H=yes, v2=no, the `O10-F15` old-secret decision. | | the "Owner decisions" table below | | | [ ] |
| 12 | **Network cut, every phone.** FixFlow's per-app Wi-Fi and mobile data off (system settings), or "background data off + Wi-Fi blocked by METHOD", or airplane mode when nothing else is available; method and date per phone. Lifts only per the section 2 branch box. | done-when | by hand, per phone | | | [ ] |
| 13 | **Committed keys.** The Maps/Firebase/Sentry client keys restricted in each console (package name + SHA-1); done per key (`O05-17`). | | Google Cloud, Firebase and Sentry consoles | | | [ ] |
| 14 | **Workshop Wi-Fi** (HR-A1c). Does the workshop have Wi-Fi that technicians' phones join during shifts? SSID and BSSID(s) of its access point(s); which roster phones join it. "No Wi-Fi" is valid and disables the `O04-F18` rule. | | by hand (a phone's Wi-Fi details, or the router) | | | [ ] |
| 15 | **Field cash custody** (HR-A4, `O07-F17`). Do technicians hold cash collected at customers, or receive "online" payments into personal wallets, before handing them to the shop? For how long, and who counts the hand-over today? "Never, every rupee reaches the manager the same day" is valid and drops the remittance source. | | by asking the manager | | | [ ] |
| 16 | **Books basis.** Is the shop registered for sales tax (SRB/FBR)? Are the books on a cash basis? Is there an accountant, and does that person want per-transaction entries or periodic totals? Is a second money writer (counter POS, offline web manager, second shop) planned within 12 months? Unknowns here become answers in P9-0b, not here. | | by asking the owner and the accountant | | | [ ] |

Done when: items 1-4, 6 (every roster phone), 10 and 12 have values; the rest have values or a
dated "unknown, because".

## Owner decisions

(Plan section 4, copied; the last two columns are for the owner.)

| Decision | Blocks | Default if undecided | Owner's answer | Date |
| --- | --- | --- | --- | --- |
| Domain (Cloudflare DNS, multi-year, auto-renew) | P2b-1 (name), P2c, P3a | nothing can ship to phones |  |  |
| Host for the drain window and after: VPS (default) or the home box | P0b, P3b, P13e | **VPS from P3b until P13e** (HR-A3; 2 vCPU / 4 GB, Mumbai measured first). **Box gate** — the one condition for the home box in any role: the box-gate probe's 14-day history at ≥ 99.5 % reachability from the home box's site, or a second uplink. P13e moves to the home box not before the later of P5d-2 done and the last re-open; the owner may invert at P3b only if the home box already passes the gate; "no home box" keeps the VPS and skips P13e |  |  |
| Recovery case a / b / c | P3b | **none** — P3b blocks until P0a item 4 is answered; (a) wins when restorable |  |  |
| Highest job ticket number printed for a customer (case c) | P3b | — |  |  |
| Fence coordinates and radius (≥ 100 m) | P3b, P5a | P3b blocks |  |  |
| `O10-F15`: accept old-secret tokens for the window (K=no & H=yes & v2=no only) | P3b, P4a (the verifier itself is always built in P1, default OFF) | **no**: photograph, retry by hand, declare the loss |  |  |
| Geofence thresholds (P5d-2) | P5d-2 verdict | `sampler_gap` < 1 per on-duty hour per phone; ≥ 90 % of real arrivals `crossing_recorded`; ≥ 95 % of `geofence_error` re-registered within 15 min; kill rate < 5 % per OEM; suppressed-arrival rate ≤ 10 % |  |  |
| Commercial background-location SDK spike (P5-spike; separate applicationId, never `api.<domain>` during the window) | P5a entry | **run it** (HR-A1b; the licence cost is the owner's to check); "declined" → patched Expo as planned; a favourable spike proves compatibility only (standing rule 2) |  |  |
| Shift-start clock-in reminder (working days, cancelled by clock-in) | P5b-2 | **yes** (HR-A1c) |  |  |
| Workshop Wi-Fi: SSID/BSSIDs and which phones join (P0a item 14) | P3b step 5 (fence row); the P6a rule is inert without | record in P0a; "no Wi-Fi" disables the rule |  |  |
| Field cash custody: do techs hold cash or online receipts before remitting | P9-0b decides; P9a-1 / P9b build it | assume **yes** when P0a item 15 is unknown: `cash_remittance` source, `cash_with_staff[tech]`, `receipts_clearing` |  |  |
| Latency threshold (P3c) | P3c | POST p95 < 805 ms (ADR projection) from a field phone; target 150–400 ms |  |  |
| Jobs GPS backdate ceiling during the drain | P4a | widened to W like device_time (ruling R2) with the per-job fuel-distance before/after check; back to 48 h at `T_close` |  |  |
| Plaintext backups under the app credential until P13b — nightly, hourly and the VPS provider snapshots (which hold `/etc/fixflow`) | P3c step 7 | accepted (G2-D2 deviation, `O6-F06`); P13b encrypts the dumps and switches the provider snapshots off |  |  |
| Odoo plan (external API needs Custom) | P11 only | CSV path (P10) |  |  |
| Odoo version | P10a labels, P10b | draft with the current release's labels |  |  |
| Pakka record set, basis (cash/accrual), sales-tax registration, start date, reason codes | P9-0b → P9a-2 going live | **no default — P9-0b must answer** (the owner may sign the cash-basis / not-registered defaults as the answer); stager idle until a start date; invoice kind only on accrual |  |  |
| Approver, unit and export cadence | P9-0b → P9a-1 / P10a | **no default — P9-0b must answer** (the owner may sign: the manager; per posting; weekly export) |  |  |
| Full-fidelity or selective postings | P9a-2 | full-fidelity |  |  |
| Tax regime and chart of accounts / journals | P9-0b (then P10b) | — (P9-0b answers; `l10n_pk` is the test-company chart) |  |  |
| Customer → Odoo partner mapping | P10a | one walk-in partner, no customer PII exported |  |  |
| Negotiation below original | P7a | allowed for the assigned tech, **flagged, never required** (the note is optional); manager beyond the cap once set |  |  |
| PII minimisation of unclaimed jobs for tech tokens (list and detail) | P7a setting; P7b-1 turns it on | off until v2 is fleet-wide (the list shows addresses techs use before claiming), then on |  |  |
| Second approver / self-approval | P9a-1 | flag, do not block (single-manager shop, ruling R9) |  |  |
| Chain anchor channel + SMTP relay credentials | P8b | email to the owner via `core/mailer.py`; without credentials the chain is labelled "unanchored" and P8b still completes |  |  |
| Error tracking | decided (G2-D2) | Sentry SaaS; P0a confirms the mobile project ingests; a change needs a new APK |  |  |
| Dead-man monitor location and paging (MON_LOC) | P3a | external heartbeat service paging the owner by email |  |  |
| RPO target; who is on call | P3c, P13b | 1 h from the first drain until P13e (hourly dumps), 24 h after; the owner |  |  |
| R2 retention and media cap | P13b | dumps 30 days; media uncapped with an alert at 8 GB |  |  |
| Second-provider backup copy | P13b | none (recorded) |  |  |
| Maintenance window | P3a runbook | outside 02:00–04:00 |  |  |
| age key holder | P13b | the owner, private key offline |  |  |
| Second uplink, split-horizon DNS, disk encryption | P13c | none |  |  |
| Merging of merge-ready PRs (added 2026-11-13, plan section 7) | every phase's merge step | the owner merges; may delegate to the coordinator | **delegated** ("Yes, you merge"): the coordinator merges a PR once CI is green and the coordinator's own binding review passes on its head SHA; the merge-hold list (plan section 7.2) and merge order still apply; squash merges, branches kept | 2026-11-13 |
| Installing the Android toolchain: JDK, platform-tools, build-tools, emulator, one system image, about 8 GB, in a user folder (added 2026-11-13, plan section 7) | device lab L3; P0a item 10 | not installed: L3 does not run and item 10 stays "unknown, because not installed" | **yes** ("Yes, install"); installed by the coordinator with `docs/program/lab/android-toolchain-install.ps1` into `C:/Users/User/.fixflow-cache/android/` | 2026-11-13 |
| Merging the docs-only PRs #182 (plan) and #185 (skills) to `main` (added 2026-11-13, plan section 7) | the plan and skills being readable from `main` | stay open on their branches |  |  |
| Closing draft PR #180, an older geofence approach that the plan's P5a supersedes (added 2026-11-13, plan section 7) | P5a (tidiness only) | stays open as a draft |  |  |
| May a manager record or void a payment on a job that is already closed? (added 2026-11-13, plan section 7.8 finding 16) | the merge of P7a | no: closed is final for everyone (v8 as written); cash found on a phone after the drain for a closed job then has no way in |  |  |
| A technician acting on a job nobody has claimed: the coordinator ruled that the first write claims the job for that technician (plan section 7.9, R11), because the installed app already lets technicians do this and would otherwise show failed items (added 2026-11-13) | P7a deploy (the P4c train) | **the ruling stands**: acting on an unclaimed job assigns it to that technician |  |  |

## Deploy-train table

Behaviour-changing phases that merge to `main` before the cutover are appended here and deployed
by P4c. Until then their Done-when ends at "merged; deploy-train row added".

| Phase | PR | Merge sha | Migration | Post-deploy check | Rehearsal (L4) |
| --- | --- | --- | --- | --- | --- |
| P6a | #192 | `47a2246` | none | read-only, with a manager token: the attendance board rows carry `sampler_state`, `last_ping_at` and `pings_today`; a technician who is clocked in with no recent ping shows a stale or silent tracker, never a healthy one; the technician day view renders the effective time. The lane's own wording replaces this when its follow-up reports | not yet run |

P1 (`87bbe88`) is not a train row: it is part of the pinned drain image that P3b boots first
(`release/drain`, plan section 7.7). P2a (`5cd29b1`) is not a train row either: it reaches a phone
only inside the fleet app build (P2c).

## Lane board

| Lane | Phase | Session | Branch | PR | State | Since |
| --- | --- | --- | --- | --- | --- | --- |
| B-core | P1 backend first-boot gate | `p1-boot-gate` (local_9616a4f6-0e4f-423f-8939-57b041ff3979) | `claude/p1-backend-boot-gate-e5a6e7` | #187 | **merged 2026-11-13 as `87bbe88`** (binding review PASS on `73738d1`; 931 tests, 0 skipped; cold-resume trial 10/10) | 2026-11-13 |
| M | P2a offline engine honesty | `p2a-engine-honesty` (local_25d6f554-9f47-46e9-b5f4-4d66ba12bddb) | `claude/p2a-mobile-engine-honesty-13ca22` | #189 | **merged 2026-11-13 as `5cd29b1`** (binding review: PASS-WITH-FIXES at `c770de8`, two major findings fixed, re-read PASS at `62cabae`; 512 tests) | 2026-11-13 |
| L | L2 local Android compile gate | `l2-android-compile` (local_95a45d7c-489d-4341-8aae-898e6a4713fb) | `claude/l2-android-compile-gate-3d0bf0` | #188 | READY at `7cb4c7d` (main compiles: cold 1460 s, warm 81 s at a 6g cap; the location SDK 5.8.2 compiles on SDK 52); binding review dispatched 15:41 | 2026-11-13 |
| B-jobs | P7a authorization and money guards (built ahead of P1) | `p7a-authz-money` (local_e8309ceb-a4b6-4bae-be38-23550a12de18) | `claude/p7a-authz-money-guards-00cb4d` | #191 | READY at `76a5128` with R11 built (1004 tests, 0 skipped); binding review dispatched 15:41 on that head; rebased onto `47a2246` as `3ddc81c` (a second pass covers the rebase and any fixes) | 2026-11-13 |
| B-att | P6a attendance truth (built ahead of P1) | `p6a-attendance-truth` (local_aa29532d-569a-4548-a9d9-af8be9c9d436) | `claude/p6a-attendance-truth-d088d0`; follow-up on `claude/p6a-followup` | #192 | **merged 2026-11-13 as `47a2246`** (binding review PASS on `e1dfaca`; 1070 tests, 0 skipped; five minor findings: four plus half of the fifth go into a follow-up PR by the same lane, started 15:41; the jobs-report half goes to P8a) | 2026-11-13 |
| B-tools | P9-0a week-export script (built ahead of P3b) | `p90a-week-export` (local_95afe0ff-cf18-4caa-8814-e7e1b1187b04) | `claude/p90a-week-export-script-4f99a5` | #190 | running (cut off by an API error at 15:16; resumed 15:36) | 2026-11-13 |
| W | P12a web payment idempotency (built ahead of P3b) | `p12a-web-idempotency` (local_d11066b5-3340-40c0-b1c4-607b5c0d306e) | `claude/p12a-web-payment-idempotency-31f74e` | #193 | fix round done at `9e89425` (146 web tests); second review pass dispatched 15:41, with its gate run on the head merged with `47a2246` | 2026-11-13 |
| L | L3a device lab: emulator rig and first protocols (stacked on L2, #188) | `l3a-device-lab` (local_39b83985-59b2-4118-a7a5-b0f343ecd1c6) | `claude/l3a-device-lab-0d5f13` | #194 | running (cut off by an API error at 15:15; resumed 15:36) | 2026-11-13 |
| O | P3a self-host repository changes (on P1) | `p3a-self-host-repository` (local_c0c39af5-ca3b-4df3-82c8-218eec3749e9) | `claude/magical-lederberg-1067ae` | | running (started by the owner from the coordinator's card, about 15:40) | 2026-11-13 |
| M | P2b-1 drain tooling and fleet profile (on P2a) | `p2b-1-drain-tooling-and` (local_7bb0a4ed-4137-4e16-a8c0-cc67512e783f) | `claude/silly-kowalevski-9f2fc3` | | running (started by the owner from the coordinator's card, about 15:40) | 2026-11-13 |
| L | L1 gate harness | coordinator | plan branch | #182 | done: baselines green on main's code (backend 757 tests, 0 skipped; web 106 tests; mobile 334 tests) | 2026-11-13 |
| OWN | P0a-prep | coordinator | plan branch | #182 | done: step table, hold-notice draft, helper kit, Android tools installed on the owner's yes | 2026-11-13 |

## Coordinator notes

- **Binding reviews** (plan section 7.1): when a lane reports READY the coordinator dispatches its
  own fresh-context Opus reviewer on the PR head SHA; the lane's in-loop review is a self-check.
- **Open ruling** (section 7.8 finding 16): the closed-job payment rule for managers; the owner
  decision row above settles it; P7a builds v8's text with the actor rule in one predicate.
- **P0a kit self-test files.** The kit's proof run wrote a dump of an empty, freshly migrated
  stand-in database. Those files are in `C:/fixflow-dumps/_kit-selftest-2026-11-13-NOT-REAL/`
  (a 131 KB `supabase-20261113.dump` among them). They are **not** the production dump and may
  be deleted by the owner; the coordinator's removal of them was stopped by a safety check, so
  they were moved into that folder instead.
- **Messages to lanes** are delivered when a lane's current turn ends, not mid-turn: a
  correction therefore lands as a follow-up turn in that lane.
- **Memory is at its ceiling (2026-11-13 15:44).** With ten lane sessions and three reviewers:
  4.3 GB of 31 GB RAM free, 6 GB of the 50 GB commit limit free (the Docker VM 6.5 GB, the
  emulator 3.6 GB). No further session is started until one finishes; a watcher reports if free
  commit falls under 3 GB. Archiving the sessions of merged phases (P1, P2a) is the owner's call.
- **A lane cut off by an API error does not report.** It happened twice on 2026-11-13 (plan
  section 7.9). After any quiet stretch the coordinator reads each idle lane's last message.
- **Power loss, 2026-11-13 about 13:25 to 13:53.** Windows recorded an unexpected shutdown with
  no crash code, no long power-button press and no hardware-error record: the PC lost power.
  All eight lane sessions and Docker went down. At 13:57 the coordinator started Docker Desktop
  (no setting changed) and woke every lane with a resume message; each resumed from its
  worktree. Lanes now commit and push at every green checkpoint. Locks made before a boot are
  treated as dead.
- **Antivirus.** 360 Total Security is the active scanner. It blocks, every time, the creation
  of one file of Google's emulator package, `sdk/emulator/lib64/gles_angle/d3dcompiler_47.dll`.
  That block was left alone and the file is absent (listed in
  `C:/Users/User/.fixflow-cache/android/BLOCKED-FILES.txt`); the emulator is run with `-gpu host`
  or `swiftshader_indirect`, never an ANGLE mode. Whether to allow the folder in the antivirus is
  the owner's decision; nothing in the program needs it today.
- **Leftovers the coordinator could not remove** (the tool's safety guard refuses these
  removals; all are harmless and the owner may delete them): the installer's temporary folders
  `C:/Users/User/.fixflow-cache/android/sdk/.temp` (about 0.5 GB), `.../sdk/emulator-2`,
  `.../sdk/emulator/.installer`, `.../android/emu-probe`, `.../android/jdk-tmp`; and the kit's
  self-test folder `C:/fixflow-dumps/_kit-selftest-2026-11-13-NOT-REAL`.
- **Ready signal.** A lane that reports READY marks its PR ready for review; a coordinator
  watcher polls that flag and the coordinator then dispatches the binding review.
