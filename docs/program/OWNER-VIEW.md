# FixFlow ship program: owner view (generated)

_Generated from `program.json` by `build.js.txt`; state as of 2026-11-13. Do not edit by hand; edit program.json and rebuild. The page is `index.html` in this folder._

## Right now

- Production is still dead: both old Railway addresses answer Railway's own 404. Eight phases are merged on GitHub (P1, P2a, P3a, P6a, P7a, P9-0a, P12a, L2); none is deployed, because nothing reaches a server or a phone before your pre-flight. (measured 2026-11-13)
- Your pre-flight (P0a) has not started. It is the critical path: nothing reaches a phone or a server until it is done. Its first two answers are already needed: the domain name you will use, and the highest app version number on any technician's phone. The drain tooling is built and reviewed and waits only for those two. 37 of 56 phases wait behind it.
- Gate harness baseline green on main's code: backend 757 tests (0 skipped, 7.4 minutes), web 106 tests, mobile 334 tests. (measured 2026-11-13)

## Phases by state

- **done** (10): P0a-prep, P1, P2a, P3a, P12a, P6a, P7a, P9-0a, L1, L2
- **running now** (4): P2b-2, P8a, L3, L4
- **starting next** (0): 
- **waiting on you** (2): P0a, P2b-1
- **held (may be built, may not merge yet)** (16): P5a, P5b-1, P5b-2, P6b-1, P6b-2, P7b-1, P9a-1, P9a-2, P9b, P10a, P11, P13a, P13b, P13c, P13d, P14-n
- **not started** (24): P0b, P2a-2, P2c, P3a-2, P3b, P3c, P12, P4a, P4b, P4c, P4r, P5-spike, P5c, P5d-1a, P5d-1b, P5d-2, P7b-2, P8b, P8b-2, P9-0b, P10b, P13e, P14-fleet, P14-log

## Phases

| Id | Phase | Lane | Wave | State | Needs | Merge held until |
| --- | --- | --- | --- | --- | --- | --- |
| P0a-prep | Pre-flight prep: step table, hold-notice draft, helper kit | OWN | A | done | - | - |
| P0a | Your pre-flight: cut off, archive, dump, evidence, decisions | OWN | A | waiting on you | - | - |
| P0b | Buy: domain, host (VPS), internet, UPS | OWN | later | not started | P0a | - |
| P1 | Backend first-boot gate | B-core | A | done | - | - |
| P2a | Offline engine honesty (phone app) | M | A | done | - | - |
| P2a-2 | Offline engine, second half (only if the size hatch is taken) | M | later | not started | P2a | - |
| P2b-1 | Drain tooling and fleet profile (phone app) | M | B | waiting on you | P2a, P0b | - |
| P2b-2 | Drain audit script (backend) | B-tools | B | running now | P2b-1 | - |
| P2c | Fleet app v1: build, signature, install proof | M | later | not started | P2b-1, P0b, P2a-2 | - |
| P3a | Self-host repository changes | O | B | done | P1 | - |
| P3a-2 | Self-host stub and heartbeat (only if P3a takes its size hatch) | O | later | not started | P3a | - |
| P3b | Host ready, restore, PIN rotation (your session) | OWN | later | not started | P3a, P0b, P0a, P2b-2 | - |
| P3c | Pre-cutover checks (route stays closed) | OWN | later | not started | P3b, P3a-2 | - |
| P12a | Web payment double-charge fix | W | A | done | - | - |
| P12 | Web manager defects | W | B | not started | P12a | - |
| P4a | Pilot drain on one phone | OWN | later | not started | P3c, P2c, P12a | - |
| P4b | Fleet drain, one workshop visit at a time | OWN | later | not started | P4a | - |
| P4c | Close the drain window, deploy train | OWN | later | not started | P4b | - |
| P4r | Late phones re-open, one at a time | OWN | later | not started | P4c | - |
| P5-spike | Trial of a paid background-location kit (or declined) | M | later | not started | P4a | - |
| P5a | Geofence and sampler fixes | M | C | held (may be built, may not merge yet) | P2b-1, P4a, P5-spike, P6a | P4a passed and the SDK decision answered; app v2 is built only after P4c |
| P5b-1 | Permissions, phone-maker setup, typed-id login | M | D | held (may be built, may not merge yet) | P5a | P4a passed and the SDK decision answered; app v2 is built only after P4c |
| P5b-2 | Shift reminder, boundary rules, app v2 build | M | D | held (may be built, may not merge yet) | P5b-1 | P4a passed and the SDK decision answered; app v2 is built only after P4c |
| P5c | Pilot test of app v2 | OWN | later | not started | P5b-2, P4c | - |
| P5d-1a | Install app v2 on the fleet, per visit | OWN | later | not started | P5c, P6b-2 | - |
| P5d-1b | Per-phone-maker test runs | OWN | later | not started | P5d-1a | - |
| P5d-2 | 48-hour review and field validation | OWN | later | not started | P5d-1b | - |
| P6a | Attendance truth (no migration) | B-att | A | done | P1 | - |
| P6b-1 | Attendance migration: late flags, payroll version | B-att | C | held (may be built, may not merge yet) | P6a, P4c | P4c done |
| P6b-2 | Heartbeat, sampler health, dispatcher guard, audit | B-att | D | held (may be built, may not merge yet) | P6b-1, P5a | P4c done |
| P7a | Who may do what, and money guards | B-jobs | A | done | P1 | - |
| P7b-1 | Login, lock and session hardening | B-core | C | held (may be built, may not merge yet) | P7a, P3c, P4b, P5d-1a | every roster phone on app v2 or retired |
| P7b-2 | Ops console, media, web deps, Cloudflare rules | O | B | not started | P7a, P3c | - |
| P8a | Money integrity 1: void attribution, payloads | B-jobs | B | running now | P7a | - |
| P8b | Money integrity 2: bill revisions, chain, daily check | B-jobs | C | not started | P8a | - |
| P8b-2 | Money integrity 2, second half (only if the size hatch is taken) | B-jobs | later | not started | P8b | - |
| P9-0a | Week-export script | B-tools | A | done | - | - |
| P9-0b | Odoo and books rehearsal (you + accountant) | OWN | later | not started | P0a, P9-0a | - |
| P9a-1 | Accounting 1: posting tables, decision API | B-jobs | C | held (may be built, may not merge yet) | P8b, P9-0b, P5d-2 | the 48-hour geofence review is done (P5d-2) and your Odoo answers are in (P9-0b); then one at a time |
| P9a-2 | Accounting 2: stager | B-jobs | D | held (may be built, may not merge yet) | P9a-1, P8b-2 | the 48-hour geofence review is done (P5d-2) and your Odoo answers are in (P9-0b); then one at a time |
| P9b | Approval and reconciliation screens | B-jobs | D | held (may be built, may not merge yet) | P9a-2 | the 48-hour geofence review is done (P5d-2) and your Odoo answers are in (P9-0b); then one at a time |
| P10a | CSV export and exports page | B-jobs | D | held (may be built, may not merge yet) | P9a-2 | the 48-hour geofence review is done (P5d-2) and your Odoo answers are in (P9-0b); then one at a time |
| P10b | Odoo import rehearsal (your session) | OWN | later | not started | P9b, P10a | - |
| P11 | Odoo push adapter (Custom plan only) | B-jobs | later | held (may be built, may not merge yet) | P10a | the 48-hour geofence review is done (P5d-2) and your Odoo answers are in (P9-0b); then one at a time |
| P13a | Database role split | O | D | held (may be built, may not merge yet) | P4c, P7b-2 | drain window closed (T_close) |
| P13b | Backup encryption, retention, first drill | O | D | held (may be built, may not merge yet) | P13a | drain window closed (T_close) |
| P13c | Monitoring upgrade, node 22 images, lock file | O | D | held (may be built, may not merge yet) | P13a | drain window closed (T_close) |
| P13d | Monitoring upgrade, second PR | O | D | held (may be built, may not merge yet) | P13c, P6b-2, P8a | drain window closed (T_close) |
| P13e | Move the server to the home box (your session) | OWN | later | not started | P5d-2, P4r, P13b | - |
| P14-n | Expo upgrade, one major version at a time | M | later | held (may be built, may not merge yet) | P5d-2 | P4a passed and the SDK decision answered; app v2 is built only after P4c |
| P14-fleet | Install each Expo upgrade on the fleet | OWN | later | not started | P14-n | - |
| P14-log | One command log for the six queues (backlog) | M | later | not started | P5d-2, P14-n | - |
| L1 | Parallel gate harness | L | A | done | - | - |
| L2 | Local Android compile gate | L | A | done | L1 | - |
| L3 | Device lab (emulator on this PC) | L | B | running now | L1 | - |
| L4 | Deploy-train and restore rehearsal | L | C | running now | L1 | - |

## Goals

1. Production back on a server you control; phone data drained with proof (reached at: end of P4c (late phones via P4r)): P0a, P0b, P1, P2a, P2b-1, P2b-2, P2c, P3a, P3b, P3c, P12a, P4a, P4b, P4c, P4r
2. Geofencing, pings and travel behave as designed in the field (reached at: end of P5d-2, thresholds passing): P6a, P5-spike, P5a, P5b-1, P5b-2, P5c, P5d-1a, P5d-1b, P5d-2, P6b-1, P6b-2
3. Security holes closed for a shipped system (reached at: boot/edge set at P3c; the rest at the later of P7b-1 and P7b-2; insider evidence at P8b, P13a): P1, P3c, P7a, P7b-1, P7b-2, P8a, P8b, P12, P13a, P13b
4. Speed (latency) acceptable (reached at: measured in P3c before the route opens): P3c
5. Kacha khata, then manager-approved pakka khata, then Odoo (reached at: end of P10b (P11 only on a Custom plan); without Odoo, end of P10a): P7a, P8a, P8b, P9-0a, P9-0b, P9a-1, P9a-2, P9b, P10a, P10b, P11
6. Self-hosting durable, not just running (reached at: end of P13e (or P13d when there is no home box and P13e is skipped)): P13a, P13b, P13c, P13d, P13e

## P0a, in order (item 10 first)

Done when items 1-4, 6 (every roster phone), 10 and 12 have values; the rest have values or a dated 'unknown, because ...'.

1. **Item 10: Tools and access** (needed for done). Start Docker Desktop. Install Android platform-tools (adb), build-tools (apksigner) and a JDK. Log in: EAS, GitHub CLI, Railway CLI (only if you control the old Railway hostname). Check you can log in to the Railway, Supabase, Cloudflare, Sentry, Firebase and Expo dashboards. Turn on USB debugging on every roster phone. Have a cable and a spare Android phone (for P2c). Uses: tools-check.sh. adb, apksigner and a JDK are already installed for you in C:/Users/User/.fixflow-cache/android/ (nothing was added to the system PATH: the first command below loads them into one terminal).
2. **Item 1: Send the fleet hold notice** (MUST). Edit the draft in docs/program/notices/fleet-hold.md (fill the square-bracket words), send it to every technician (English and Urdu), then replace its status line with the date, channel and who it went to, keeping the text exactly as sent. Uses: docs/program/notices/fleet-hold.md (draft, not sent).
3. **Item 2: Railway first: seal the old secret, cut old services off** (MUST). Record the Railway project state. Copy the old FIXFLOW_JWT_SECRET from the Railway environment and seal it offline (never into this page). Then remove DATABASE_URL from, or scale to 0, any surviving service, and reset the Supabase database password in its dashboard. Record whether you can bind the old subdomain (H) and to what, and your account and billing access. Uses: Railway and Supabase dashboards.
4. **Item 3: Archive the R2 backups** (MUST). Mint an R2 API token (type it only into your own terminal). List backups/db/, copy it to archive/pre-selfhost/, make a laptop copy in C:/fixflow-r2, then list the archive prefix and record both listings. Uses: r2-archive.sh (set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your own terminal first; never paste them here or into chat).
5. **Item 4: Supabase: take the dump and verify it, same day** (MUST). Record status, pause date, the restore deadline shown, Postgres major version. If restorable: restore it and take the dump now through the session pooler, sha256 it, upload it to the R2 archive, and verify it the same day with design Appendix C. If only a dashboard download exists, convert it (see the plan). If unrecoverable: screenshot. 'Unknown' is not accepted, and 'project restored' alone is not enough. Uses: supabase-dump.sh then verify-dump.sh (set FIXFLOW_SUPABASE_URL in your own terminal first; never paste it here or into chat).
6. **Item 5: Fleet roster**. For each phone: which technician id, maker / model / Android version, and whether it is shared. Uses: phone-facts.sh (read-only on the phone: it never opens the app; needs adb and apksigner).
7. **Item 6: Field build facts, per phone** (needed for done). Pull each phone's installed app (adb), read its signing certificate (apksigner), versionCode, whether the bundle contains jobs.outbox.v2 (v2) and which API host it has baked in. Compare the certificate with the EAS keystore (K). Export the keystore. Uses: phone-facts.sh (read-only on the phone: it never opens the app; needs adb and apksigner).
8. **Item 7: Photos of what is stuck, per phone, today**. Airplane mode on and Wi-Fi off, open FixFlow, photograph the clock screen's DID-NOT-SYNC list and every job banner, close the app, airplane mode off. 'Not reachable' only for a phone whose login is gone.
9. **Item 8: Sentry**. Backend project: date of last event. Mobile project: does it still receive events? Uses: Sentry dashboard.
10. **Item 9: Workshop location and fence size**. The workshop's coordinates and the fence radius you want (at least 100 m).
11. **Item 11: Decisions**. Answer every decision row (the board further down) or leave it to its default. Includes the chain-anchor address and mail relay (or 'unanchored'), geofence thresholds, drain host, SDK spike, shift reminder, Odoo plan and version. Uses: the decisions board on this page.
12. **Item 12: Cut the app's network, every phone** (needed for done). In system settings, turn off FixFlow's Wi-Fi and mobile data (or background data off plus Wi-Fi blocked by a named method, or airplane mode if nothing else works). Record method and date per phone.
13. **Item 13: Restrict the committed client keys**. In the Maps, Firebase and Sentry consoles, restrict each client key to the app's package name and SHA-1. Record done per key. Uses: Google Cloud, Firebase, Sentry consoles.
14. **Item 14: Workshop Wi-Fi facts**. Does the workshop have Wi-Fi the technicians' phones join during shifts? Its name (SSID), the access point id(s) (BSSID), and which phones join it. 'No Wi-Fi' is a valid answer.
15. **Item 15: Who holds cash in the field**. Do technicians hold cash collected at customers, or receive online payments into personal wallets, before handing them to the shop? For how long, and who counts the hand-over?
16. **Item 16: Books basis**. Registered for sales tax (SRB/FBR)? Books on cash basis? Is there an accountant, and do they want per-transaction entries or periodic totals? A second money writer (counter POS, offline web, second shop) planned within 12 months?

## Decisions

| Id | Decision | Blocks | Default |
| --- | --- | --- | --- |
| N3 (new) | Merge the docs-only PRs #182 (the plan) and #185 (the skills) into main | nothing hard: lanes read the plan from the plan branch until then (section 7.1) | DECIDED 2026-11-13: Yes for #185 (the reviewer and skill definitions). |
| N4 (new) | Close the old draft PR #180 (an earlier geofence approach the plan replaces) | nothing; it can be mistaken for live work | DECIDED 2026-11-13: Close it. |
| N5 (new) | May a manager record (or void) a payment on a job that is already closed? | the merge of P7a (who may do what, and money guards) | DECIDED 2026-11-13: Yes, managers only. |
| T1 | Domain (Cloudflare DNS, multi-year, auto-renew) | P2b-1 (name), P2c, P3a | nothing can ship to phones |
| T2 | Host for the drain window and after: VPS (default) or the home box | P0b, P3b, P13e | VPS from P3b until P13e (2 vCPU / 4 GB, Mumbai measured first). Box gate, the one condition for the home box in any role: 14 days at 99.5 % reachability from its site, or a second uplink. P13e not before the later of P5d-2 done and the last re-open; you may invert at P3b only if the box already passes the gate; 'no home box' keeps the VPS and skips P13e |
| T3 | Recovery case a / b / c | P3b | none: P3b blocks until P0a item 4 is answered; (a) wins when restorable |
| T4 | Highest job ticket number printed for a customer (case c) | P3b | none given |
| T5 | Fence coordinates and radius (at least 100 m) | P3b, P5a | P3b blocks |
| T6 | O10-F15: accept old-secret tokens for the window (only if K=no and H=yes and v2=no) | P3b, P4a (the verifier itself is always built in P1, default OFF) | no: photograph, retry by hand, declare the loss |
| T7 | Geofence thresholds (P5d-2) | P5d-2 verdict | sampler_gap under 1 per on-duty hour per phone; at least 90 % of real arrivals crossing_recorded; at least 95 % of geofence_error re-registered within 15 min; kill rate under 5 % per phone maker; suppressed-arrival rate at most 10 % |
| T8 | Paid background-location kit trial (P5-spike; separate app id, never api.<domain> during the window) | P5a entry | run it (the licence cost is yours to check); 'declined' means the patched Expo path; a good trial proves compatibility only |
| T9 | Shift-start clock-in reminder (working days, cancelled by clock-in) | P5b-2 | yes |
| T10 | Workshop Wi-Fi: name, access point ids, which phones join (P0a item 14) | P3b step 5 (fence row); the P6a rule does nothing without it | record in P0a; 'no Wi-Fi' disables the rule |
| T11 | Field cash custody: do technicians hold cash or online receipts before handing over | P9-0b decides; P9a-1 / P9b build it | assume yes when P0a item 15 is unknown (cash_remittance source, cash_with_staff per tech, receipts_clearing) |
| T12 | Latency threshold (P3c) | P3c | POST p95 under 805 ms from a field phone; target 150-400 ms |
| T13 | Jobs GPS backdate ceiling during the drain | P4a | widened to the window like device_time (ruling R2) with the per-job fuel-distance before/after check; back to 48 h at T_close |
| T14 | Plaintext backups under the app credential until P13b (nightly, hourly, and the VPS provider snapshots) | P3c step 7 | accepted (recorded deviation); P13b encrypts the dumps and switches provider snapshots off |
| T15 | Odoo plan (the external API needs Custom) | P11 only | CSV path (P10) |
| T16 | Odoo version | P10a labels, P10b | draft with the current release's labels |
| T17 | Pakka record set, basis (cash/accrual), sales-tax registration, start date, reason codes | P9-0b, then P9a-2 going live | no default: P9-0b must answer (you may sign the cash-basis / not-registered defaults); stager idle until a start date; invoice kind only on accrual |
| T18 | Approver, unit and export cadence | P9-0b, then P9a-1 / P10a | no default: P9-0b must answer (you may sign: the manager; per posting; weekly export) |
| T19 | Full-fidelity or selective postings | P9a-2 | full-fidelity |
| T20 | Tax regime and chart of accounts / journals | P9-0b (then P10b) | none given (P9-0b answers; l10n_pk is the test-company chart) |
| T21 | Customer to Odoo partner mapping | P10a | one walk-in partner, no customer personal data exported |
| T22 | Negotiation below the original price | P7a | allowed for the assigned tech, flagged, never required (the note is optional); manager beyond the cap once set |
| T23 | Hide personal data of unclaimed jobs from technicians (list and detail) | P7a setting; P7b-1 turns it on | off until v2 is fleet-wide (the list shows addresses techs use before claiming), then on |
| T24 | Second approver / self-approval | P9a-1 | flag, do not block (single-manager shop, ruling R9) |
| T25 | Chain anchor channel and mail relay credentials | P8b | email to you via core/mailer.py; without credentials the chain is labelled 'unanchored' and P8b still completes |
| T26 | Error tracking | already decided | Sentry SaaS; P0a confirms the mobile project ingests; a change needs a new app build |
| T27 | Dead-man monitor location and paging | P3a | external heartbeat service paging you by email |
| T28 | Recovery point target; who is on call | P3c, P13b | 1 h from the first drain until P13e (hourly dumps), 24 h after; you |
| T29 | R2 retention and media cap | P13b | dumps 30 days; media uncapped with an alert at 8 GB |
| T30 | Second-provider backup copy | P13b | none (recorded) |
| T31 | Maintenance window | P3a runbook | outside 02:00-04:00 |
| T32 | Holder of the backup encryption key (age) | P13b | you, private key offline |
| T33 | Second uplink, split-horizon DNS, disk encryption | P13c | none |

## The rules that never bend

1. No phone gets a new app until its stuck data has been drained and the after-check passed. Never uninstall, except in the one documented branch with your written sign-off per phone.
2. No claim that geofencing works without evidence from the fleet's own phone models.
3. During the drain the server runs one pinned image and nothing else.
4. The automatic WhatsApp dispatcher stays off until every phone is drained or retired.
5. The old Railway address may only hang (or, in one branch, proxy). It never answers on its own.
6. Technicians stay on hold until the written release notice.
7. Money is whole paisa; no money feed runs off the event cursor; the outbox never deletes a write.
