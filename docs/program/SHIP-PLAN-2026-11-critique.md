# Stage-3 critique of SHIP-PLAN-2026-11 v1 (2026-11-01) — UNADJUDICATED

Raw output of the `ship-plan-critics` workflow (run `wf_2a33d0e7-423`): five Opus lenses
(one-session fit, dependency order, register coverage, owner executability, design fidelity),
Sonnet citation checks on every blocker/major, one Opus refuter per blocker (cap 3 per lens).
138 findings: 8 blockers (3 stand after refutation: FIT-1 design notes not in repo — fixed by
`docs/program/w2/`; DEP-2 old-hostname rule needs the K/H split and must not proxy before the
manifest; EXE-3 no K=no/H=no drain branch, O10-F15 dropped), 94 majors, 36 minors.

The v2 plan must be written from this file: adjudicate each finding (accept / narrow / reject
with a reason), then revise. Recurring structural themes: split P2b/P3/P4/P5a-c/P6/P9a/P10/P13
at "build submitted" / "pilot done" / "code vs owner session"; drop fixed migration numbers;
add deploy-to-box to every backend phase after P3; take the Supabase dump in P0; fence
verdict rule needs one ruling before P5a/P6; D2 mandatory items (dead-man monitor, CSP, Access)
belong in P3; §4 needs the missing G1 §5 rows and safe defaults (recovery case = none).

---

==================== LENS fit (one-session fit) — 28 findings, unrefuted blockers beyond cap: 0
SUMMARY: Three things matter most. (1) The plan cannot be resumed from the file alone. Every design citation and checklist points at W2 notes that exist only in this session's Temp scratchpad, and "the PR checklist" does not exist until a PR is opened. Copy the notes into docs/program/w2/ and open a draft PR at the start of each phase. (2) Several phases put outside-world waits or multi-day work inside one session: P2b, P5a and P5b each contain an EAS build, P4 covers the whole fleet, P5c has a 48 h wait, and P3 includes provisioning the box. Split each at "build submitted" or "pilot done", with an explicit resume table. (3) Escape hatches defer what the Done-when needs: P5a defers fix 4 and P9a defers the decision API, while P6's hatch names items not in its scope. Also, parallel backend phases would kill each other's Docker gates, and no phase after P3 deploys to the box.
PHASES OK: P0, P1, P2a, P11, P12

--- FIT-1 [BLOCKER] global (conf 0.9)
CLAIM: Resume notes point at checklists that are not in the repo. P2a: "the O-03 design's numbered list is the checklist". P5a: "O-01's fix-order list is the checklist". P2b, P3, P6 and P9a are scoped as "O-10 design D1–D7", "O-08 design §1–§4", "O-04 design" and "O-07 parts 1, 2, 6". Those notes exist only in this session's Temp scratchpad, so a fresh session cannot resume from the plan file alone.
EVIDENCE: G2 header: designs "live in the session scratchpad (w2-results/)"; `git ls-files` has no design file; docs/program/ holds only G1, G2 and SHIP-PLAN
CHANGE: In the plan's PR, copy w2-results/O-0{1,3,4,5,6,7,8}-design.md and O-10-design.md into docs/program/w2/. Rewrite every Scope and Resume citation as a repo path, e.g. `docs/program/w2/O-03-design.md` steps 1–5, 9, 10.
CHECK: found=true supports=true — G2 header line 8 says designs live in the session scratchpad. The repo's docs/program holds only G1, G2 and the plan, and git ls-files has no design file. The scratchpad w2-results holds the O-01 to O-10 designs. The plan cites them at lines 134, 149, 157, 181, 246, 286 and 374. Minor slip: the "numbered list is the checklist" line is P2b, not P2a.
REFUTE: refuted=false → blocker — I could not refute this. The plan never says to persist the W2 designs: a search for scratchpad, w2-results or copy finds nothing relevant. Its phase scopes depend on design-note numbering that is not in G2: "O-03 design steps 1–5 and 9" (line 134), "O-10 design D1–D7" (157), "O-08 design §1–§4" (181), "O-10 B4–F" (210), "O-01 fix order 1–4 and 7" (231), "O-04 design" (286) and "O-07 parts 1, 2 and 6" (374). G2 line 8 confirms the designs live only in the session scratchpad. docs/program/ holds only G1, G2 and the plan. That scratchpad is session-specific Temp storage, so a fresh session cannot resume from the file alone. That breaks the owner's hard constraint, so the blocker stands. The proposed fix of copying the notes into docs/program/w2/ and citing repo paths is sound. Minor slip: the "numbered list is the checklist" line is in P2a's resume note, which is line 149 and mentions P2b.

--- FIT-2 [MAJOR] global (conf 0.7)
CLAIM: "Resume. Branch X; the PR checklist mirrors the scope list" only works once a PR exists. A session cut before the PR is opened leaves just a branch name, with no record of which scope items are done.
EVIDENCE: Plan P1/P7a/P7b/P8 Resume lines; constraint: "resumable from the file alone"
CHANGE: Add to §0: "The first commit of every phase opens a draft PR whose body is the phase's scope as a checkbox list. Each landed item ticks its box in the same push." Each phase's Resume then reads: "`gh pr view <branch>`; continue from the first unticked box."
CHECK: found=true supports=true — P1 Resume (line 126) says "Branch fix/backend-first-boot-gate; the PR checklist mirrors the scope list". P7a, P7b and P8 Resume lines give only a branch name. The plan states no way to track done items before a PR exists. The quoted phrase "resumable from the file alone" appears nowhere in the plan or design doc; the plan says only "The file is the state".

--- FIT-3 [MAJOR] global (conf 0.75)
CLAIM: The plan runs backend phases in parallel ("P6 … Can run in parallel with P2", "P7a … in parallel with P5", P6 and P7a both after P1). The single gate recipe uses fixed container names and starts with `docker rm -f fixflow-w1-db fixflow-w1-gates`. A second session's gate run kills the first session's gates mid-pytest.
EVIDENCE: ORCHESTRATION-DESIGN Appendix A lines 1–6; §8 "fixed container names … docker rm -f those names up front is intentional"
CHANGE: In §0 Gates, either serialise backend gate runs on this machine ("one backend phase in flight at a time"), or parametrise Appendix A container and network names with the phase id (fixflow-<phase>-db). Drop the "in parallel" phrases until then.
CHECK: found=true supports=true — Design doc (lines ~620-638) uses fixed names fixflow-w1-db/gates/network and runs `docker rm -f fixflow-w1-db fixflow-w1-gates` up front, called intentional. Plan P6 (line 285) and P7a (line 310) say "in parallel". A second gate run would kill the first's containers. Doc's "second start fails" claim is contradicted by its own rm -f.

--- FIT-4 [MAJOR] global (conf 0.65)
CLAIM: After P3, no backend phase has a deploy step: every Done-when stops at "Gates green … CI green". Yet P5c reads "the server-side sampler state (P6) over the same days", and P7b assumes Cloudflare is in the path. Each deploy is an unscoped owner action at the box shell.
EVIDENCE: Plan §0 Gates; P5c Scope; O-08 §6 runbook R5 (deploy: git pull, build, up -d, digest logged)
CHANGE: Add to every backend phase from P6 on: "Done when … and deployed to the box per RUNBOOK-SELFHOST R5 (owner at keyboard, ~15 min)". Add "P6 deployed" to P5c's Entry.
CHECK: found=true supports=true — O-08 runbook R5 exists (deploy: git pull, build, up -d, digest logged). The plan's P6 and P7b Done-when lines stop at "Gates green" and contain no deploy step. The only "deploy" hit is line 320, about the deployed APK. P5c Scope uses "server-side sampler state (P6)" but its Entry omits P6. P7b Entry says "Cloudflare in the path". The "unscoped owner action" part is the critic's inference.

--- FIT-5 [MAJOR] P2b (conf 0.75)
CLAIM: "Large; the build wait … is wall-clock, not work" understates P2b. It holds Opus work (manifest gate, un-park migration), a screen, a backend Python script that needs Docker gates, an EAS build that takes hours on the free queue, and an owner install test. It also inherits P2a's escape hatch ("leave 5/9/banner for P2b"). It cannot finish in one session.
EVIDENCE: O-10 design D1–D7 and E6; pre-computed fact: the EAS free queue takes hours per build
CHANGE: Split it. P2b keeps the code: D2–D7 plus O3-F4/F13/F5/F12, drain_audit.py with its Docker gates, and the fleet profile. Done when gates are green and `expo export` plus the bundle grep pass. A new P2c (build and install proof) has Entry P2b merged plus the domain, keystore and versionCode from P0. P2c ends when the build is submitted (record the build id); it resumes via `eas build:list` and is done when the apksigner and install-over checks pass.
CHECK: found=true supports=true — O-10 D1–D7 and E6 exist. The plan's P2b section lists Opus work (manifest gate, un-park migration), the Drain Report screen, drain_audit.py, a built APK and an install-over test. P2a (line 149) says to leave "5/9/banner for P2b". The "hours" EAS queue time appears in no document. It is the stated pre-computed fact, and the plan itself says the wait is wall-clock. The Docker-gate detail and "cannot finish in one session" are not in the evidence. They are the critic's inference.

--- FIT-6 [MAJOR] P2b (conf 0.6)
CLAIM: "an install-over test on a phone with seeded queues" cannot be run as written. A fresh install of the field build points at the dead host, so it cannot fetch the roster or log in, and no queue can be seeded. The K=no branch, where the signatures differ, has no Done-when at all.
EVIDENCE: O-03 design: "Login was impossible"; O-10 A2/K=no branch; O-10 E1–E6 (the real seeded proof is the pilot phone)
CHANGE: P2b/P2c Done-when becomes: the APK installs over the field build on a test phone (same package, same cert, higher versionCode) and the Drain Report renders. Move the seeded-queue proof to the P4 pilot's AFTER check. Add: "if P0 reports K=no, stop; P2c is replaced by the O-10 K=no branch".
CHECK: found=true supports=false — Citations exist. O-03 says "Login was impossible" about the outage on the field APK. O-10 A2/K=no branch and E1–E6 exist, and E6 does make the pilot phone the real audited proof. But the plan has no P2c and never mentions K=no. P2b's Done-when only requires the Drain Report with BEFORE counts. A fresh install pointing at the dead host and unable to seed queues is not stated in the evidence. The K=no branch lacking a Done-when is only partly true.

--- FIT-7 [MAJOR] P3 (conf 0.7)
CLAIM: "Medium if the box is ready" does not fit one session. The phase holds repo configs (compose, Caddy with CSP, cloudflared, runbook) and an O-08 §1 host build (OS, docker, BIOS power-on, chrony, SSH) that no phase owns. It also holds the restore and Appendix B gate, PIN rotation, the tunnel, the old hostname and a field-phone latency run, with at least six owner dashboard and shell actions.
EVIDENCE: O-08 design §1 Host and §3 steps 1–4 plus restore; P0 Deliverables only record the box ("location, OS, UPS…"), not provision it
CHANGE: P3a is the repo PR: configs, runbook and a local `compose up` smoke on Docker Desktop with a fake domain. P3b is an owner session: provision the box per the O-08 §1 Host list, restore, pass Appendix B, rotate PINs, keep the tunnel on 503. P3c opens the tunnel, settles the old hostname, measures latency and enables backups after sign-off. Each ends at a numbered runbook step.
CHECK: found=true supports=true — Plan line 201 says "Medium if the box is ready". O-08 §1 Host lists OS, docker enable, BIOS power-on, chrony, SSH. §3 steps 1–4 and the restore section cover the build, restore and Appendix B gate. P0 Deliverables only record the box (location, OS, UPS, ISP, CGNAT test), and no phase provisions it. The P3 scope also lists PIN rotation, tunnel, old hostname and latency. The count of "six owner actions" is the critic's own estimate.

--- FIT-8 [MAJOR] P3 (conf 0.6)
CLAIM: P3's Done-when requires "the old hostname is hanging/proxying", but no phase writes or deploys the HANG stub or the reverse proxy on Railway. That is new code plus a Railway deploy hidden inside an operations session.
EVIDENCE: O-10 C ("replace the dead service with a HANG stub … ≥20 s"; K=no proxy); W0 §4.0 item 2
CHANGE: Add a scope item to P3c, or to P3a for the code: the hang stub as a tiny zero-dependency Node service in the repo with one test proving no bytes are sent for 20 s, deployed only if P0 reports H=yes. Otherwise record "H=no: uncontrollable".
CHECK: found=true supports=true — O-10 design (section C) specifies a HANG stub (accept, send nothing at least 20 s, close) and a reverse proxy in the K=no branch. W0 §4.0 item 2 says hang or proxy, not 503. Plan P3's Done-when says "hanging/proxying". P3's scope lists no stub or proxy code or Railway deploy. Plan line 157 references O-10 D1-D7 only for the APK profile.

--- FIT-9 [MAJOR] P3 (conf 0.6)
CLAIM: P3 moves production from Railway to the self-hosted box, but its Deliverables do not update CLAUDE.md. CLAUDE.md's "Deploy: Railway, manual railway up" row and "Deploy the backend from backend/" trap become false, and CLAUDE.md says to update it in the same PR when the deploy path changes.
EVIDENCE: CLAUDE.md "Keeping this file honest"; stack table Deploy row
CHANGE: Add to P3a Deliverables: "CLAUDE.md Deploy row, Build & deploy traps and doc map updated (RUNBOOK-SELFHOST)".
CHECK: found=true supports=true — CLAUDE.md lines 372-375 say to update it in the same PR when the deploy path changes. Line 36 is the Railway "manual railway up" Deploy row, and line 88 is the "deploy from backend/" trap. The plan's P3 section (line 176) lists no CLAUDE.md update in its Deliverables. The plan names the phase "P3", not "P3a", which is a minor label mismatch.

--- FIT-10 [MAJOR] P4 (conf 0.8)
CLAIM: "Done when … then each roster phone; the window is closed and ceilings restored" spans days (O-10 F deadline: B6 + 7 days), so P4 cannot be done in one session. Its Resume line, "Rule R2: forward-only", is a rollback rule and gives no checklist to resume from after the first phone has drained.
EVIDENCE: O-10 design E (per phone), F (dated deadline), R2
CHANGE: P4a is the pilot: the O-01 protocol, then E1–E6 on one phone. Done when the pilot's AFTER check matches. P4b is the fleet and window close, run by the owner. Its Resume is a per-phone table in W0-results.md (BEFORE photo, manifest receipt id, AFTER audit result, residue entered). Done when every row is filled and T_close and the audit query are recorded.
CHECK: found=true supports=true — O-10 design line 78 gives "dated deadline (B6 + 7 days)"; R2 is "After the first drain: forward corrections only. No DB restore unless every drained phone's manifest archive is in hand" (a rollback rule). Plan P4 matches: Done-when covers each roster phone and the window close; Size says "owner-run over days"; Resume is only "Rule R2: forward-only…". No per-phone checklist appears.

--- FIT-11 [MAJOR] P5a (conf 0.8)
CLAIM: The escape hatch defers the item the Done-when needs. "if long, ship fixes 1–3 and move 4/7 to P5b" defers O-01 fix 4 (F03, error-branch re-register), yet Done-when requires "a toggle re-registers the fence".
EVIDENCE: O-01 design FIX ORDER item 4 = F03; Plan P5a Done-when
CHANGE: Change the hatch to defer only fix 7 (F08) and the Diagnostics Share screen; fixes 1–4 always stay. Or keep the hatch and drop the toggle check from Done-when, moving it to P5b's.
CHECK: found=true supports=true — O-01 FIX ORDER item 4 is "F03: error-branch re-register, provider banner, periodic re-check". P5a's Size line says "ship fixes 1–3 and move 4/7 to P5b". Its Done-when requires "a toggle re-registers the fence". Deferring fix 4 therefore conflicts with that check. P5b's scope (as read) does not list F03.

--- FIT-12 [MAJOR] P5a (conf 0.7)
CLAIM: P5a puts five Opus fixes, the diagnostics ring, an EAS build that takes hours and roughly 35 minutes of on-shift walking tests with adb into one session. The plan names no EAS wait here, unlike P2b.
EVIDENCE: O-01 protocol steps 3–4 (15 + 20 min, tech on duty, 150 m walk); O-01 in-app logging spec (mutex ring, telemetry, hidden screen)
CHANGE: Split. P5a-code: fixes 1–4 and 7 plus the ring, with Jest tests. Done when gates are green; the build is submitted and its id recorded. P5a-validate: Entry is the build finished plus the pilot tech on shift. It runs O-01 steps 3–4 and is done when its current Done-when holds.
CHECK: found=true supports=true — O-01 design has Step 3 (15 min, tech on duty) and Step 4 (20 min, walk to 150 m+), about 35 min, plus the mutex-guarded diag.bg.v1 ring, telemetry and hidden Diagnostics screen. P5a scope has the fixes, ring and "fleet build v2". Its Done-when needs on-phone tests. P5a has no EAS-wait note; P2b does ("build wait... wall-clock"). The "hours" figure is not cited.

--- FIT-13 [MAJOR] P5a (conf 0.45)
CLAIM: P5a ships the FGS re-arm (fix 3) to the pilot without the #49424/#52230 patches, which the plan moves to P5b. O-01 fix 3 bundles them because re-arming increases FGS starts on Android 14+, where #49424 crashes.
EVIDENCE: O-01 FIX ORDER 3 ("re-arm the FGS … patch #49424/#52230"); H11 #49424 APPLICABLE on targetSdk 34
CHANGE: Move the #49424 guard and the #52230 stop fallback into P5a with fix 3. Add the patch-package setup to P5a: technician-app has no patches/ directory and no postinstall script.
CHECK: found=true supports=true — O-01-design.md line 96 puts "patch #49424/#52230" inside fix 3 (FGS re-arm). SHIP-PLAN P5b lists those patches and P5a ships fixes 1-3. H11 says #49424 is APPLICABLE on targetSdk 34, but conditional: Android 14+ with a while-in-use grant only. The "re-arming increases FGS starts" rationale is inference. The design names a different trigger, travel start then lock. No patches/ dir or postinstall exists.

--- FIT-14 [MAJOR] P5b (conf 0.5)
CLAIM: "Done when … a native compile succeeds (EAS build)" puts a second wait of hours inside a session. "one phone per OEM" also needs every OEM's phone present in that session. Running two consecutive EAS cycles (v2 in P5a, v3 here) doubles the outside-world waits.
EVIDENCE: pre-computed EAS queue fact; P5b Verification; P5c already covers per-OEM device checks
CHANGE: Make P5a and P5b code-only phases. Done when Jest and typecheck are green and the build is submitted. Add one build-and-pilot phase after P5b (O-01 steps 3–4 plus the onboarding screen on the pilot phone), and move the per-OEM onboarding check into P5c.
CHECK: found=true supports=true — P5b Done-when and Verification quote exactly as cited (EAS build, one phone per OEM). The plan calls the EAS free-queue build wait "wall-clock, not work" (P-fleet-drain Size, ~line 173), and P5a/P5b each ship a build (v2, v3). P5c does run per-OEM checks, but of O-01 protocol steps 1-4, not explicitly the onboarding screen. The plan never quantifies "hours".

--- FIT-15 [MAJOR] P5c (conf 0.7)
CLAIM: "One session plus the 48 h wait" is two sessions. Running O-01 steps 1–4 on one phone per OEM takes about 50 minutes each and needs techs on shift. P5c also reads P6 data that its Entry does not require to be deployed.
EVIDENCE: O-01 protocol durations; Plan P5c Scope "server-side sampler state (P6)"
CHANGE: P5c-1: Entry is the build installed fleet-wide and P6 deployed. It runs the per-OEM protocol and records T0. P5c-2: Entry is T0 + 48 h. It reviews the ring and telemetry and is done when FIELD-VALIDATION has a row per OEM. Resume for both is the validation file's per-OEM table.
CHECK: found=true supports=true — Plan P5c says "one session plus the 48 h wait" and Scope includes "server-side sampler state (P6)". Its Entry names only the P5b build installed fleet-wide, not P6 deployed. O-01 gives steps 0–4 at 3+7+5+15+20 = 50 min (about 55 min with close-out), on a phone during the tech's shift. This supports the claim, though "two sessions" is the critic's inference.

--- FIT-16 [MAJOR] P6 (conf 0.75)
CLAIM: P6 does not fit one session, and its escape hatch defers nothing. It lists about 11 O-04 items across derive, service and repository code, models, migration 0047, the tenancy timezone source and the web, all Opus with real-Postgres tests. "if long, defer payroll regeneration (O04-F11) and the one-active-fence index" names two items that are not in P6's scope.
EVIDENCE: O-04 design §1(a), §2 flags, §3 0047 plus the code-only list; Plan P6 Scope versus Size line
CHANGE: P6a, migration-free: O04-F4 liveness fields, open-shift, no_pings, F3 UNKNOWN, F8 timezone, F10 web. Done when the board shows sampler_state. P6b with 0047: F1/F2 late_sync and late_batch, F9, F6/F7/F15, F13. Done when alembic check is green and derive honours void/replace. Delete the current hatch.
CHECK: found=true supports=true — The P6 Size line says "if long, defer payroll regeneration (O04-F11) and the one-active-fence index to P13". P6's Scope and Deliverables list neither. In the O-04 design, F11 is optional and the fence index is a separate 0049 deploy, so deferring them removes nothing. P6 scope has about 11 items. The design's code-only list and 0047 cover them. I did not check which model files change.

--- FIT-17 [MAJOR] P7a (conf 0.6)
CLAIM: "the mobile app against a local backend still completes an own-job flow end to end (manual smoke)" needs a dev or EAS build pointed at a LAN backend, which may mean an EAS queue wait. It also needs a backend with a published port, which the gate recipe does not provide. None of this is stated.
EVIDENCE: CLAUDE.md Mobile: needs an EAS dev build; Appendix A uses no host ports
CHANGE: Replace the manual smoke with a pytest integration test that replays the fleet APK's own-job request sequence: claim, negotiate within cap, payment, completion, transition. Do the device smoke after the box deploy, not inside P7a.
CHECK: found=true supports=true — CLAUDE.md says mobile "needs an EAS dev build" and is not Expo Go. The design doc's Appendix A docker recipe runs the db and gates containers on a network with no -p/publish flags, so no host port is published. The P7a "Done when" (plan lines 321-322) requires a manual smoke against a local backend and states neither a build nor a port. The critic's reading is accurate.

--- FIT-18 [MAJOR] P7a (conf 0.6)
CLAIM: "tech-scoped GET /api/jobs with PII minimised until claimed, plus pagination (O05-06)" changes a list contract the fleet APK v1 consumes, so it cannot land backend-only in a migration-free Medium PR without a client change. G2 calls it a PII-minimisation decision, and that decision is not in §4.
EVIDENCE: G2 §1.2 O05-06 "C (design risk) … a PII-minimisation decision"; Plan §4 owner table lacks it
CHANGE: Move O05-06 out of P7a into a phase that pairs the backend change with an APK release. Pagination is opt-in through a query parameter, and old clients get the current shape. Add an O05-06 PII policy row to §4. P7a keeps require_job_actor, the closed guards, the 409 on reuse and manager_id from the principal.
CHECK: found=true supports=false — G2 §2 line 58 does say "C (design risk)… a PII-minimisation decision", and §4 has no PII row (Discount cap is the only P7a entry). But neither cited source says the change breaks fleet APK v1. The O-05 analyst tagged O05-06 apk=no, with the fix "PII minimised (no phone/address until claimed)". The APK-contract premise is the critic's inference.

--- FIT-19 [MAJOR] P7b (conf 0.6)
CLAIM: P7b, labelled "Medium", spans four runtimes: backend auth/lock (Opus), ops-server.mjs, web (logout, react-router) and Cloudflare dashboard rules. "roster endpoint requires the app marker" needs a request header that fleet APK v1 never sends, which would break login. The "spray test against a local backend" cannot show per-source keying behind cloudflared, where the source must be CF-Connecting-IP.
EVIDENCE: O-05 design §BEHIND CLOUDFLARE TUNNEL (last-XFF collapses buckets); X-FixFlow-Api is response-side only (O-03 step 1)
CHANGE: P7b-1 (backend auth): per-(account, source) lock using CF-Connecting-IP when the peer is cloudflared, roster reduced to names, the PIN rules, logout and TTL. P7b-2: ops-server, media, react-router and the Cloudflare rules doc. A request-side marker belongs in an APK phase.
CHECK: found=true supports=true — Both exist. O-05 design says to prefer CF-Connecting-IP when the peer is cloudflared, and that last-XFF collapses buckets only if a second proxy sits after cloudflared. O-03 step 1 stamps X-FixFlow-Api on responses only, so a request marker doesn't exist. The "must be" and "cannot show" wording is the critic's inference. The plan's "or reduced to names" is an escape hatch.

--- FIT-20 [MAJOR] P8 (conf 0.55)
CLAIM: "Medium" understates P8. It holds migration 0048 with the FK NOT VALID/VALIDATE pattern, void stamping, new event payloads, job_bill_revision written inside the bill-freeze paths, captured_at with a trust window, a new scheduler job with an out-of-band anchor, and a backfill script. All of it is Opus, plus an owner channel choice.
EVIDENCE: O-06 design items 1, 2, 5; O-07 §6 backfill script
CHANGE: Label P8 Large and give it a split line. P8a: voided_at/by, payloads, captured_at, backfill (0048). P8b: job_bill_revision plus the ledger-chain-verify job writing to app_event, with the anchor channel deferred unless P0 chose it. Each split has its own Done-when, taken from the current one.
CHECK: found=true supports=true — O-06 items 1, 2 and 5 exist. They cover void metadata and payloads, job_bill_revision, and a daily chain verify writing to app_event with an out-of-band anchor. O-07 §6 has the backfill script. The plan's P8 scope lists all the pieces. Caveats: O-07 puts voided_at in 0047, not 0048. The trust window is not in the cited text. "Opus throughout" comes from the plan, not the evidence. The evidence is silent on size.

--- FIT-21 [MAJOR] P9a (conf 0.75)
CLAIM: The escape hatch defers the item the Done-when needs. "if long, land tables + stager and leave the decision API to P9b" defers approval, yet Done-when requires that rows "stage, approve, and a reversal stages on void". P10 (Entry: P9a merged) would then start with no decisions to window on.
EVIDENCE: O-07 §2 decision API; §3 window over posting.decided_at
CHANGE: Split up front. P9a-1: four tables, triggers and the decision API. Done when fixture postings approve and reject and the triggers refuse an UPDATE in real Postgres. P9a-2: the stager for all five kinds, chain-verify gating and poison rows. Done when the current Done-when holds. P10's Entry becomes P9a-2.
CHECK: found=true supports=true — Plan P9a Size line says "if long, land tables + stager and leave the decision API to P9b". Done-when requires rows to "stage, approve, and a reversal stages on void". O-07 §2 puts approve/reject/approve-window in the manager step. §3 windows on posting.decided_at. P10 Entry is "P9a merged". Caveat: the dependency graph (line 50) orders P9b before P10, which softens the P10 point.

--- FIT-23 [MAJOR] P10 (conf 0.5)
CLAIM: Done-when depends on an owner-run double import in the Odoo test company, verified against the owner's Odoo version. The code session therefore blocks on outside-world access and an account map that may not exist yet, with no Resume beyond the branch.
EVIDENCE: O-07 §7 Part 3 "Blocked on: Odoo version and the test company's chart of accounts"
CHANGE: P10a (code): exporter, manifest, ack endpoint, role-map settings, a runbook draft. Done when gates are green and a golden-file test shows the CSV bytes are deterministic. P10b (owner session): Entry is Odoo access plus the account map. Done when the double import updates rather than duplicates. It resumes from the RUNBOOK-ODOO-IMPORT steps.
CHECK: found=true supports=true — O-07 design §7 Part 3 says "Blocked on: the Odoo version and the test company's chart of accounts and journals (role → code map)" (cited quote is abbreviated), with "Build regardless: exporter, manifest, ack endpoint, role-map settings". P10 in the plan has Done-when as the owner's double-import rehearsal, owner inputs, and Resume only "Branch feat/accounting-csv-export". Claim is accurate.

--- FIT-24 [MAJOR] P13 (conf 0.65)
CLAIM: "Large; split roles/backups from monitor/drill if needed" gives no split line. The one-PR scope also lumps "one-active-fence partial unique index after an audit" into migration 0050. O-04 requires that index as a separate PR/deploy after an audit script on restored data.
EVIDENCE: O-04 design §3 (0049-equivalent: "a separate PR/deploy after an orphan/duplicate audit script"); O-06 item 7; O-08 §2 dead-man
CHANGE: P13a: role split, 0050, start.sh, REVOKE test, and the owner applies the roles on the box. P13b: age encryption, put-only token, retention, drill. P13c: dead-man monitor, node:22, lockfile, CI on PG17. P13d: audit script, then the fence index in its own migration and deploy.
CHECK: found=true supports=true — The plan's P13 text (lines 445-460) puts the one-active-fence index in the one-PR scope under migration 0050. Its Size line only says "split roles/backups from monitor/drill if needed". The O-04 design lists it as 0049, "a separate PR/deploy after an orphan/duplicate audit script", and adds that same-deploy is fine on a fresh DB. O-06 item 7 and the O-08 dead-man text exist but only back the other P13 scope items.

--- FIT-25 [MAJOR] P14 (conf 0.65)
CLAIM: "SDK 52 → current" spans several Expo majors, each with React Native and architecture changes, plus expo-av → expo-audio, re-validating the patches, an EAS build per step and a field re-run. One "Large" session cannot hold that, and no split is given.
EVIDENCE: Plan P14 Scope; O-01 H11 (patches pinned to 18.0.10/12.0.6); EAS queue fact
CHANGE: One phase per SDK major. Each: upgrade, typecheck/Jest/expo export, re-check the patches, then the build submitted and its id recorded. A final phase runs the build and the P5c protocol on one phone.
CHECK: found=true supports=true — Plan P14 is real. It says "SDK 52 → current; re-apply or drop the P5b patches; expo-av → expo-audio", "one PR + build", Size Large, and gives no split. The EAS free-queue wait appears at P2b. O-01 H11 classifies issues against expo-location 18.0.10 and task-manager 12.0.6, but it doesn't say the patches are pinned to them. "Several majors" is the critic's inference, since the plan only says "current".

--- FIT-22 [MINOR] P9b (conf 0.5)
CLAIM: P9b's "exports list" page comes before the exports exist (P10 builds run_posting_export and the signed URLs). "L3 board refresh pattern reused" depends on P12's L3 fix, which is ordered "any time after P6".
EVIDENCE: O-07 §3 GET /api/postings/exports; Plan P12 Scope L3
CHANGE: Move the exports list page into P10. Have P9b implement its own polling, or add "P12 merged" to P9b's Entry.

--- FIT-26 [MINOR] P2a (conf 0.55)
CLAIM: "if it runs long, land steps 1–4 and leave 5/9/banner for P2b" overloads P2b, which already lists `drainAll.test` (O-03 step 5) in its own Deliverables. Step 5 thus has two owners, and the hatch target is the most over-full phase.
EVIDENCE: Plan P2a Scope versus P2b Deliverables; O-10 D5
CHANGE: Name step 5 (drainAll) in P2a only, and remove `drainAll.test` from P2b. Have the hatch defer steps 9 and 10 only, to a named P2a-2. Keep 5, which the fleet APK needs (O-10 D5).

--- FIT-27 [MINOR] P1 (conf 0.8)
CLAIM: P1 changes the ping backdate default from 48 to 240, but the Deliverables update only "CLAUDE.md security section". The Location and privacy invariant ("rejected outside ~48h back") would then be false.
EVIDENCE: CLAUDE.md line 176; G2 §5 ruling 240 h
CHANGE: Change the deliverable to "CLAUDE.md security section and the Location and privacy ping trust-window line (~240h back) updated".

--- FIT-28 [MINOR] global (conf 0.6)
CLAIM: Branch names and scope hard-code migration numbers (0047 for P6, 0048 for P8, 0049 for P9a, 0050 for P13) while the dependency graph lets P6 and the P7a→P8 chain merge in either order. A resumed session can find its number already taken.
EVIDENCE: Plan §2 graph (P6 parallel after P1); CLAUDE.md "next free slot is 0047"
CHANGE: Drop the numbers from branch names. State: "the migration takes the next free slot at rebase time; update CLAUDE.md's head in the same PR".

==================== LENS order (dependency order) — 24 findings, unrefuted blockers beyond cap: 0
SUMMARY: Three things matter most. (1) The irreversible clock is mis-placed: P0 only records the Supabase deadline, and the dump is deferred into P3 behind the domain, the box and P1. Take the dump in P0. (2) The cutover and drain ordering breaks O-10. P3 may proxy the old hostname in any K branch and opens the tunnel before B4/B5, and K=no is not modelled at all. Behaviour-changing backend phases (P7a, P8) have no rule keeping them out of the drain image. The cursor re-seed has no position relative to late re-opens. (3) The fixed migration numbers create hidden edges (P6→P8, P9a→P13). The fence unique index rides in 0050 against restored data with no separate-deploy audit. Also: P2a's JSON-detail fallback is unneeded and can only misclassify. P3 omits the cloudflared XFF test that P7b's per-source lock depends on. P5a splits the FGS re-arm from its native patches.
PHASES OK: P6, P8, P9a, P14

--- DEP-1 [BLOCKER] P0 (conf 0.85)
CLAIM: The only irreversible clock gets only a reading in P0. The action itself is pushed into P3, behind the domain, the box and P1. P0 records just 'Supabase status, pause date, deadline'. P3 says 'a whole session if the restore case is (a) with a Supabase dump to take'.
EVIDENCE: ORCHESTRATION-DESIGN §4.0 item 4 ('If restorable, restore now, or at least download the logical backup'); O-08 §3 step 2 ('the only irreversible clock'); G2 §3 ('W0 item 4, today')
CHANGE: Make it a P0 deliverable: restore or unpause the project, take a pg_dump 17 through the session pooler with backup.py's flags, and copy it to the laptop and to R2 archive/pre-selfhost/. Copy the backups/db/ dumps there too (O08-F02); this needs no box. P3 then restores from the file.
CHECK: found=true supports=true — All three citations resolve. ORCHESTRATION-DESIGN §4.0 item 4 has the quoted "If restorable, restore now, or at least download the logical backup". O-08 §3 step 2 calls the Supabase clock "the only irreversible clock". G2 §3 lists "W0 item 4, today". Ship plan line 91 records the pause date and deadline. Line 201 has the P3 "whole session if the restore case is (a)" text.
REFUTE: refuted=true → major — P0 already covers the action by reference. Its Scope is "Design doc §4.0 items 1–10", and item 4 says "If restorable, restore now, or at least download the logical backup it offers". Its Goal says the Supabase deadline is one of the clocks "that cannot wait". So the plan does not drop the action. The real gap is narrower: the Deliverables list and the Done-when line only ask for the facts to be recorded, and P3's sizing text reads as if the dump waits until then. O-08 §3 case (a) does design the full pg_dump 17 to run "from the box", so moving it to P0 is a choice, not a fix. The fix is to add "project restored or logical backup downloaded (path)" and "backups/db/ copied to archive/pre-selfhost/ and the laptop" to P0's deliverables. That is an under-specified deliverable, so major, not blocker.

--- DEP-2 [BLOCKER] P3 (conf 0.85)
CLAIM: P3's Done-when accepts 'the old hostname is hanging/proxying' whatever the K branch. A proxy before the fleet APK is installed lets field-APK phones drain without a manifest, with the old classifier. Pre-v2 bundles would drop job writes on the first 401, and a stale Retry would land on today. The scope also brings in O-08 §4's '503 stub', which G2 overruled.
EVIDENCE: O-10 C (proxy only when H=yes and K=no, after B1–B6; K=yes means HANG); G2 §2 B non-negotiables ('manifest before any sync'); O10-F15, O3-F4; G2 §5 row 1
CHANGE: Done-when: 'H=yes and K=yes: HANG stub (no bytes for at least 20 s). H=yes and K=no: reverse proxy, only after B4–B6, per the K=no branch. Never 5xx, 2xx or 204.' Strike O-08 §4's 503 stub from the scope citation.
CHECK: found=true supports=true — Mostly supported. O-10 C says HANG when K=yes, and proxy only after B1-B6 when K=no. G2 §2 requires "manifest before any sync". G2 §5 row 1 overrules the 503 stub. O10-F15 and O3-F4 are registered. The plan's Done-when does say "hanging/proxying" with no K split. Caveats: O-10 says B1-B6, not B4-B6. The plan's explicit "503 catch-all" is the new-host tunnel catch-all, not the old-host stub. The old-host 503 stub is O-08 line 61, inside the cited §1-§4.
REFUTE: refuted=false → blocker — The finding stands. P3's Done-when accepts "hanging/proxying" with no K/H split. P3's entry does not require the P2b APK or the B4 drain window, so the plan allows a proxy before the manifest exists. That breaks G2 §2's "manifest before any sync" and exposes O10-F15 and O3-F4 (both P1). O-10 C (line 40-41) puts a HANG stub on K=yes and allows a proxy only after the B-steps on K=no. P3 scope cites O-08 §1–§4, and O-08 line 61 offers a 503 stub that G2 §5 row 1 overrules. P4's "B4–F exactly" covers C, but it comes too late to stop P3 from proxying first. Two fixes to the proposed text: say B1–B6, not B4–B6; the tunnel's 503 catch-all is correct and stays.

--- DEP-3 [MAJOR] global (conf 0.7)
CLAIM: The graph covers K=yes only. With K=no, P2b's done criterion ('same package, same signature') cannot be met and P4 cannot need P2b. Instead the drain goes through the old-host proxy with the old APK, then an uninstall and reinstall. That makes P3's proxy (and maybe the old JWT secret) the real prerequisite.
EVIDENCE: O-10 'BRANCH K=NO' (H=yes proxy drain, then uninstall; H=no transcription); O-10 B2 (keep the old secret only in K=no/H=yes); G2 §3 H14
CHANGE: Add a K/H branch box to §2. K=no: P4 runs O-10's K=no branch, P4's entry drops P2b and adds 'P3 proxy up', and P2b becomes a fresh install after the drain. State which phase records K and H (P0).
CHECK: found=true supports=true — O-10 design has BRANCH K=NO: H=yes drains via old-host proxy then uninstall/reinstall (new cert); H=no transcribes photos then reinstalls. B2 keeps old secret only in K=no/H=yes. G2 §3 lists H14 as an open risk. The P2b and P4 dependency inference is the critic's own, but the cited branch facts are accurate.

--- DEP-4 [MAJOR] P3 (conf 0.7)
CLAIM: The drain-window steps run in the wrong order. P3 opens the tunnel route ('login works through the tunnel'), and only P4's entry stages B4. The B5 pre-drain snapshot and B2's end-to-end selfie PUT proof appear in no phase. Anything that reaches the route before P4 (P2b's test phone, a K=no proxy) lands under 24 h bucketing, with no forensic snapshot.
EVIDENCE: O-10 B4→B5→B6 ('no step may start before the previous one is verified'); O-10 B2 (O10-F8 selfie PUT); O-08 §3 step 3 (maintenance responder until admit)
CHANGE: P3 ends with api.<domain> on the 503 maintenance responder, smoked via localhost or app.<domain>. P4 step 1 is B4 (restart), the B5 snapshot and the selfie PUT. B6 flips the route and records T_open.
CHECK: found=true supports=true — All three citations exist and are quoted accurately. The core conflict is real: P3 says login works through the tunnel, while O-10 puts B6 (open the route) after B4 and B5, and O-08 step 3 says to hold a 503 responder. One overstatement: P4 scope is "B4–F exactly", which covers B5 and B6 by range. The B2 selfie PUT proof does not appear in the plan.

--- DEP-5 [MAJOR] P2b (conf 0.65)
CLAIM: The install-over test uses 'a phone with seeded queues', but the fleet APK bakes the production domain. If P3's route is open, the seeded test punches and payments drain into the recovered DB under real tech ids. That corrupts the per-tech delta the drain proof depends on.
EVIDENCE: O-10 E6 ('per-tech server row delta since T_open must equal the landed count'; any mismatch halts); O-10 D1 (baked URL); P2b Done-when needs only BEFORE counts
CHANGE: Keep the test phone's per-app network off for the whole test (O-01 step 0) and assert BEFORE counts only. Or run the test before B6, then wipe and reinstall the test phone. State this in P2b's Verification.
CHECK: found=true supports=true — All cited items exist. O-10 E6 says the per-tech server delta since T_open must equal the landed count, and any mismatch stops rollout. D1 sets EXPO_PUBLIC_API_URL to the owned domain. P2b Done-when needs only BEFORE counts, and its Verification says "a phone with seeded queues". The hazard is conditional: it needs the route open (B6) and a real-tech login (E4). The sources don't say the test phone is isolated.

--- DEP-6 [MAJOR] P2a (conf 0.75)
CLAIM: The fallback in the entry ('or the client treats a JSON detail body as the app signature for older backends') is not needed, and it is harmful. The fleet APK only ever reaches api.<domain>, and P3 requires P1, so every app response carries the marker. The fallback can therefore fire only on non-app bodies, exactly the ones that must count as connectivity, and it would park them. The entry is also stricter than needed: P2a needs only the header constant.
EVIDENCE: P3 Entry 'P1 merged'; O-10 D1 (APK points only at the owned domain); O-03 step 1; O-08 P-D
CHANGE: Entry: 'header name fixed (X-FixFlow-Api: 1)'; P2a runs in parallel with P1. fromApp = header only. Add a test that a {"detail"} body without the marker is not definitive.
CHECK: found=true supports=true — All cited items exist. P3 Entry says "P1 merged". O-10 D1 builds the fleet APK against the owned domain. O-03 step 1 is the source of the "older backends" JSON-detail fallback. O-08 P-D says infra problems must not be 4xx. These support the premise that every app response carries the marker. They don't state the fallback is harmful or unneeded; that is the critic's inference.

--- DEP-8 [MAJOR] P4 (conf 0.75)
CLAIM: 'dispatcher cursor re-seeded' is listed as a P4 deliverable with no position, while P4's session covers only the pilot. If the re-seed happens before the last phone or a late re-open, later drains insert old events above the cursor that count as fresh. The age guard keys on insert time.
EVIDENCE: O-10 F (re-seed at window close; late phones get re-opens); O10-F7; CLAUDE.md dispatcher invariants (mass-message incident)
CHANGE: Put the re-seed at F, after T_close. Add a standing rule: the dispatcher stays OFF, every supervised re-open is followed by another re-seed, and enabling the dispatcher is a separate owner-approved step after the last re-open.
CHECK: found=true supports=true — O10-F7 exists (age guard keys on server insert time, so drained old writes count as fresh). O-10 step F lists the re-seed alongside the "late phones get a scheduled, supervised re-open" bullet. Its only timing rule is "before the dispatcher is ever enabled", not "after the last re-open". SHIP-PLAN P4 lists "dispatcher cursor re-seeded" with no position. Minor: the design does not literally say the re-seed happens at window close.

--- DEP-10 [MAJOR] P7a (conf 0.7)
CLAIM: The plan treats merge and deploy as one step. P7a's entry is only 'P1 merged', but it changes what the server accepts: 403 for a non-assigned tech, 409 for a payment on a closed job, 409 for client_id reuse. If P7a is in the image that receives the drain, queued writes come back app-definitive and park. Shared phones are hit, since a phone drains under whoever logs in. That adds residue and AFTER mismatches that halt the rollout.
EVIDENCE: O-10 'Recovery case: what the server accepts' (assumes the 0046 semantics); O10-F10; O-10 E6/R7
CHANGE: §0 rule: the drain image is P1, plus P6 optionally. P7a, P7b and P8 deploy only after T_close. P7a's entry gains 'deploy after the P4 window closes'.
CHECK: found=true supports=false — The cited items exist. O10-F10 is the shared-phone re-login, queues drain per owner session. O-10 E6 is the AFTER check and R7 halts on a mismatch. The recovery-case section covers only 404s and client_id dedupe. None of it mentions P7a, 403s, 409s on closed jobs, or client_id reuse. The P7a-parks-queued-writes link is the critic's inference, not stated evidence.

--- DEP-11 [MAJOR] global (conf 0.8)
CLAIM: The fixed migration numbers force an order the graph does not show. P8 (0048, entry only 'P7a merged') cannot merge before P6's 0047. P13 (0050, entry 'P3 and P7b') cannot merge before P9a's 0049, which ties self-host hardening to the Odoo track. G2 D3 also gave 0047 to accounting, and the plan overrides that without saying so.
EVIDENCE: Plan §2 and the entry lines of P6/P8/P9a/P13; G2 §4 D3 ('migration 0047'); CLAUDE.md ('the next free slot')
CHANGE: Drop the fixed numbers: each migration PR takes the next free slot when it rebases and updates the CLAUDE.md head. Or add the P6→P8 and P9a→P13 edges explicitly. Either way, note the D3 renumbering.
CHECK: found=true supports=true — Plan §2 has no P6→P8 or P9a→P13 edge. P8's entry is only "P7a merged" and its migration is 0048. P6 holds 0047. P13's entry is "P3 and P7b" and its migration is 0050, while P9a holds 0049. G2 D3 puts 0047 on the accounting slice. The plan gives accounting 0049 and never mentions the renumbering (grep for "renumber" finds nothing). The CLAUDE.md quote was not opened.

--- DEP-12 [MAJOR] P13 (conf 0.7)
CLAIM: The one-active-fence partial unique index is bundled into 0050 with the role split, 'after an audit'. start.sh runs pending migrations at boot, which leaves no audit window. If the restored DB holds duplicate active fences, CREATE UNIQUE INDEX fails, the backend restart-loops (an outage), and the role split is blocked with it.
EVIDENCE: O-04 §3 (separate PR/deploy after the audit script); CLAUDE.md migrations invariant (start.sh; separate deploy for populated data); O-08 §6 (container restart-loops)
CHANGE: Ship the dry-run audit script in an earlier phase (P6) and run it on the box. Put the index in its own migration and deploy, separate from the role split.
CHECK: found=true supports=true — All three citations exist. O-04 design says 0049 is a separate PR/deploy after a dry-run audit script. CLAUDE.md says start.sh runs all pending migrations at boot. O-08 design says a bad migration makes start.sh exit non-zero and the container restart-loops. Plan P13 lists the index with the 0050 role split. "Bundled into 0050" is the critic's inference, since the plan names no migration number for the index.

--- DEP-13 [MAJOR] P5a (conf 0.65)
CLAIM: P5a re-arms the FGS by dropping the isRunning() early return, while the #49424 guard and the #52230 stop fallback wait for P5b. O-01 treats these as one fix. Re-arming more often on Android 14+ without the guard exposes the FGS bind crash in v2. Separately, P5a's escape hatch ('ship 1–3, move 4/7 to P5b') breaks its own Done-when, which needs fix 4 ('a toggle re-registers the fence').
EVIDENCE: O-01 FIX ORDER 3 ('F01: re-arm … patch #49424/#52230'); O01-F15; O-01 H11 #49424/#52230
CHANGE: Move the #49424 and #52230 patches into P5a, with an EAS native-compile gate. Make Done-when list only the protocol checks for the fixes that actually landed.
CHECK: found=true supports=true — O-01 design FIX ORDER item 3 reads "re-arm the FGS on 'active'...; patch #49424/#52230". The plan's P5a scope drops the isRunning() early return, and the patches are listed under P5b (plan line 256). G2 lists O01-F15 as #49424 (FGS bind crash on Android 14+). The escape hatch "ship 1–3, move 4/7" conflicts with the Done-when clause "a toggle re-registers the fence". The "exposes the crash" point is the critic's inference, not stated in the sources.

--- DEP-14 [MAJOR] P5a (conf 0.6)
CLAIM: The entry 'P4 drained the fleet' (window close, up to B6 + 7 days) blocks the code and the build, but the standing rule only constrains installs, phone by phone. The §2 graph also draws P5a as 'parallel after P1', which contradicts the entry.
EVIDENCE: Plan §0 standing rule ('before the drain protocol has run on it'); O-10 F (B6 + 7 days); plan §2 line 49
CHANGE: Entry: code and build after P2b merges. Install v2 on a phone only after that phone's AFTER audit has passed. Fix the graph line.
CHECK: found=true supports=true — Plan line 28 says nothing ships to a phone before the drain protocol has run on it, which is per phone and constrains installs. P5a's Entry (line ~229) is "P4 drained the fleet (never ship a second APK into undrained queues)". O-10 F (line 78) closes the window at B6 + 7 days. The §2 graph (line 49) draws P5a as "parallel after P1". The cited quote is slightly abbreviated, but the claim holds.

--- DEP-15 [MAJOR] P5c (conf 0.8)
CLAIM: P5c's scope reads 'the server-side sampler state (P6) over the same days', but its entry requires only 'P5b build installed fleet-wide'. Without P6 deployed there is no server-side liveness to compare against.
EVIDENCE: P5c Scope; O-04 §1a (sampler_state on BoardRow); register O04-F4 (P1)
CHANGE: Entry: add 'P6 deployed to production at least 48 h before the review window starts'.
CHECK: found=true supports=true — P5c Entry reads only "P5b build installed fleet-wide", while Scope includes "the server-side sampler state (P6) over the same days". The dependency graph shows P6 parallel after P1, with no edge into P5c. O-04 design defines sampler_state on BoardRow. O04-F4 (P1) says a dead sampler is invisible. The cited evidence supports the claim.

--- DEP-16 [MAJOR] P3 (conf 0.8)
CLAIM: P7b's per-(account, source) lock needs the real client IP. The backend trusts the last X-Forwarded-For entry, a Railway assumption. The cloudflared XFF behaviour and the HTTP code of a stopped tunnel are open risks that must be tested before cutover, yet P3's scope includes neither test, and P7b has nothing to build on.
EVIDENCE: backend/app/features/identity/router.py:57-64; G2 §3 row 'cloudflared's X-Forwarded-For behaviour … tests in the self-host phase before cutover'; O-05 'Client IP'; O05-08/O08-F03
CHANGE: P3: route api directly to backend:8000 (no Caddy). Through the tunnel, send a forged XFF and record what _client_ip returns. Stop cloudflared and record curl -i. Write both into W0-results. P7b's entry consumes that record and keys on CF-Connecting-IP only when the peer is cloudflared.
CHECK: found=true supports=true — router.py:57-64 does trust the last X-Forwarded-For entry, with a Railway docstring. G2 row 232 lists cloudflared XFF behaviour and stopped-tunnel HTTP code as untested, deferred to "tests in the self-host phase before cutover". O-05 line 32 says to prefer CF-Connecting-IP only when the peer is cloudflared. G2 row 184 covers O05-08/O08-F03 (XFF trust is single-hop). I did not check whether P3's scope omits the tests.

--- DEP-17 [MAJOR] P3 (conf 0.75)
CLAIM: api.<domain> becomes public in P3, but the P1 lock-DoS and PIN-guessing mitigations wait for P7b. Two need no code and fit P3: the Cloudflare 429 rule on /api/auth/login (the phones retain 429s), and 6-digit tech PINs at P3's own set_pin rotation.
EVIDENCE: O05-03/O05-04 (P1); G2 §5 login-lock ruling; O-08 §4(iii); service.py:31 (MIN_PIN_DIGITS_TECH = 4, a minimum); LoginScreen.tsx:102 (maxLength 12)
CHANGE: Add both to P3's Done-when: the rate rule as 429 with Retry-After, and every PIN rotated to at least 6 digits. P7b keeps the per-source lock, the minimum-digit raise and logout.
CHECK: found=true supports=true — All cited items exist. O05-03/O05-04 are P1 in the G2 register. G2 §5 (line 283) rules for a Cloudflare rate rule on /api/auth/login and 6-digit tech PINs on the next set_pin. O-08 §4(iii) says rate-limit rules only as 429 with Retry-After, which the phones retain. service.py:31 is MIN_PIN_DIGITS_TECH = 4; LoginScreen.tsx:102 is maxLength={12}. The ship plan puts both mitigations in P7b (line 335) and has P3 as the self-host cutover, so the placement mismatch is real.

--- DEP-18 [MAJOR] P10 (conf 0.65)
CLAIM: P10's entry is 'P9a merged', but §2 draws P9b→P10. P9a's escape hatch also moves the decision API into P9b, and without it the import rehearsal has no approved postings to export.
EVIDENCE: P9a Size ('leave the decision API to P9b'); P10 Scope (window on decided_at); O-07 §3
CHANGE: Entry: 'the decision API merged (in P9a or P9b)', and make §2 match.
CHECK: found=true supports=true — SHIP-PLAN line 50 draws P9b to P10; P10 Entry (line 409) says only 'P9a merged'. P9a Size (line 387) lets the decision API slip to P9b. P10 window is on decided_at, and O-07 design §3 exports only status='approved' rows with decided_at in window, so approvals must exist. Caveat: P9b Scope doesn't list the decision API.

--- DEP-21 [MAJOR] P2b (conf 0.7)
CLAIM: P2b adds a 'fleet' profile but leaves the preview profile (dead Railway host) and the production profile (api.fixflow.example) baking hosts the owner does not control. The P5b and P14 builds do not name a profile, so a mis-profiled build can still ship an uncontrolled host.
EVIDENCE: O08-F05/O08-F14 (P1); O-10 D1 (production is an AAB on api.fixflow.example; preview bakes the dead host)
CHANGE: P2b repoints both existing profiles to api.<domain>, or removes them. P5a, P5b and P14 each name 'fleet', and every build gets the bundle grep for the owned domain.
CHECK: found=true supports=true — G2 register row O08-F05/F14 says both EAS profiles bake a host the owner doesn't control. O-10 D1 says production is an AAB at api.fixflow.example. eas.json confirms preview bakes the Railway host and production bakes api.fixflow.example. O-10 D1 does not itself say preview's host is dead (the register and eas.json cover that). The P5b/P14 'no profile named' part comes from the plan, not the evidence.

--- DEP-7 [MINOR] P1 (conf 0.6)
CLAIM: The marker is stamped by a BaseHTTPMiddleware, so an unhandled-exception 500 (from ServerErrorMiddleware, the outermost layer) carries no marker. Phones would read app-origin 500s as connectivity. That is safe for the outbox contract, but it makes O-10 R4 ('cut the tunnel before five flushes on an app-origin 5xx') and O3-F6 unobservable.
EVIDENCE: backend/app/core/request_id.py:37-49 (header set only after call_next returns); main.py:282; O-10 R4; O-03 step 1
CHANGE: P1: add a test that forces an unhandled 500 and asserts the marker, via an exception handler or an outer ASGI wrapper. Or document that markerless 500s are expected, and write P2a's tests to match.

--- DEP-9 [MINOR] P4 (conf 0.7)
CLAIM: 'Ceilings restored' gives no values. O-10 F says 24/48/48, but G2 made the ping ceiling 240 permanent (shipped in P1), and O-04 makes the device_time ceiling 336 once P6 is deployed.
EVIDENCE: O-10 F; G2 §5 (ping 240 h); O-04 §2 (permanent 336 after the O04-F1 fix)
CHANGE: State the targets: device_time 24, or 336 if P6 is deployed; ping 240; jobs GPS 48; future tolerance untouched.

--- DEP-19 [MINOR] P9b (conf 0.6)
CLAIM: P9b reuses the 'L3 board refresh pattern', but L3 is fixed in P12, which is not in P9b's entry.
EVIDENCE: P9b Scope; P12 Scope (L3 board refresh/polling)
CHANGE: Add P12 (or its L3 commit) to P9b's entry, or have P9b implement its own refresh.

--- DEP-20 [MINOR] P12 (conf 0.55)
CLAIM: The entry 'P6 merged' is stricter than needed: A3, A4, L3 and O08-F13 do not depend on P6. A4 (payment idempotency key) and O08-F13 (logout on any me() failure) start to bite as soon as the manager uses app.<domain> after P3.
EVIDENCE: P12 Scope; O08-F13; A4 (money)
CHANGE: Entry: 'P3 done (web on the new origin)'; P12 can run in parallel with P5–P7.

--- DEP-22 [MINOR] P4 (conf 0.55)
CLAIM: The field protocol runs on the pilot's field build before the update. It records real presence crossings, and punches if clocked in, into that phone's queue, and these drain as real attendance. P4's deliverables do not log the window.
EVIDENCE: O-01 protocol ground rules ('Test crossings are real presence rows … log the time window for O-10')
CHANGE: Add the protocol's start and end time to P4's deliverables, so the manager can exclude or annotate those rows after the drain.

--- DEP-23 [MINOR] P4 (conf 0.5)
CLAIM: O-04's drain order ends with 'regenerate payroll exports (needs O04-F11)', but the plan defers F11 to P13 'if not done'. A Sunday payroll-weekly-export inside the 7-day window freezes that week (idempotent on the window) before late phones drain into it.
EVIDENCE: O-04 §2 order of operations steps 4–5; O-10 B2 (Sunday export); CLAUDE.md (payroll_export idempotent on shop and window)
CHANGE: P4 records the payroll_export rows created in [T_open, T_close]. Tie O04-F11 to P6 or to a named follow-up for those windows, not to P13.

--- DEP-24 [MINOR] P11 (conf 0.6)
CLAIM: P11's entry names only the Custom plan. Its worker reads the posting and posting_attempt tables and the approved or exported states from P9a and P10.
EVIDENCE: O-07 §4 (worker selects approved|exported postings; writes posting_attempt)
CHANGE: Entry: 'P9a merged (P10 for the exported state) and the Custom plan confirmed'.

==================== LENS coverage (register coverage) — 30 findings, unrefuted blockers beyond cap: 0
SUMMARY: No P0/P1 id is dropped outright; most of the grep's absences are grouping artefacts. Several P1 items are only partly closed, though. (1) Login security: P7b moves the lock to per-(account, source) while every PIN is still 4 digits, which makes O05-04 worse and undercuts the CLAUDE.md per-account invariant. (2) Several P1 items sit in a phase's scope but no Done-when closes them: seed PINs, dump pruning, the O01-F01 restart path, O01-F03 under P5a's fallback, and O3-F4. The plan also mis-targets the H14/O10-F15 bundle grep at the new APK instead of the field build, and lets P0 finish with the Supabase deadline still 'unknown'. (3) D2 is not followed: there is no Access on app./ops. and the mandatory dead-man monitor is deferred to P13. §4 is missing half the G1 form, and its recovery-case and chain-anchor defaults are unsafe. P12 also carries ids that exist nowhere in the register (T44-web, T44-media-1/2).
PHASES OK: P5c, P14

--- CMP-1 [BLOCKER] P7b (conf 0.6)
CLAIM: P7b keys the lock per (account, source) while every PIN is still 4 digits. P3 rotates PINs with set_pin.py before P7b exists, and '6-digit technician PINs on the next set_pin' only applies to future changes. An attacker who rotates sources gets about 96 guesses per day per source, so O05-04 (P1) gets worse and the reason behind the CLAUDE.md per-account invariant no longer holds. The Done-when ('owner can still log in from a known device') also reads like the known-device bypass that G2 §5 rejected.
EVIDENCE: G2 §2 D O05-04 (P1, C); G2 §5 login-lock ruling; CLAUDE.md Security 'per-account lockout is the real defense'; O05-04 evidence throttle.py:184-186
CHANGE: P3: set_pin.py issues ≥6-digit PINs for every account. P7b entry: no active account still holds a 4-digit PIN. P7b Done-when: a test showing per-account guesses per day across N sources are no higher than today. Drop the 'known device' wording.
CHECK: found=true supports=true — O05-04 is real (G2 §2: about 96 guesses per account per day, 4-digit PINs fall in weeks to months). G2 §5 keeps the invariant, which "protects a 4-digit space", and rejects the known-device bypass. It lists per-(account,source) keying and 6-digit PINs "on the next set_pin" as mitigations. The P7b text and its "known device" Done-when match. The throttle.py:184-186 cite is invalid (file has 123 lines).
REFUTE: refuted=true → major — Part of the problem is real. The 6-digit rule arrives in P7b, after P3 has already rotated every PIN with set_pin.py. So the PINs stay 4-digit and that G2 §5 mitigation never takes effect. But this is not a blocker. P7b's scope copies the G2 §5 ruling word for word ('per-(account, source) keying', a Cloudflare rate rule, '6-digit technician PINs on the next set_pin') and keeps the invariant. P1 owns the account-wide check, so O05-04 is not dropped. The critic's 'no higher than today' test would undo the per-source keying G2 chose to stop lock DoS. 'Known device' in the Done-when is loose wording, not the rejected bypass. The throttle.py:184-186 cite is invalid (the file has 123 lines). Fix: put the 6-digit minimum in P1's set_pin.py.

--- CMP-2 [MAJOR] P3 (conf 0.7)
CLAIM: Two P1 items sit in P3's scope but no Done-when closes them. O6-F05 seed PINs: P1 adds only a deep-health check, and the rotation is a scope line in P3 that its Done-when never verifies. O08-F02 pruning: archiving the pre-death dumps before the first scheduler run is in scope but missing from Done-when.
EVIDENCE: G2 §2 D O6-F05 (P1, V), O08-F02 (P1, S); G2 §6 'seed-PIN fixes gate the first self-host boot'; plan P1 Done-when, P3 Done-when
CHANGE: Add to P3 Done-when: deep-health 'default PIN active' = false for every account before the tunnel route opens; dumps listed under archive/pre-selfhost/ and on the laptop; BACKUP_PREFIX=backups/db-selfhost/ read back from the env file before BACKUP_ENABLED=true.
CHECK: found=true supports=true — G2 lists O6-F05 (P1, V) and O08-F02 (P1, S), and §6 says seed-PIN fixes gate first self-host boot. P3 scope has PIN rotation via set_pin.py and pre-death dump archiving before the first scheduler run. P3 Done-when (line 193) checks neither. Minor: P1 also adds set_pin.py, not only the deep-health check.

--- CMP-3 [MAJOR] P0 (conf 0.75)
CLAIM: G2 §3 settles H14 and O10-F15 with a grep of the FIELD bundle for jobs.outbox.v2. The plan greps only the NEW fleet APK in P2b, where the string is obviously present. P0 records commit, versionCode and cert but not v2 presence, and the O10-F15 branch (pre-v2 outbox drops queued writes on the first 401; under owner sign-off, accept old-secret tokens for the window) appears in no phase. That leaves a P1 open item unsettled.
EVIDENCE: G2 §3 rows H14, O10-F15; G2 §2 B O10-F15 (P1, O); O-10 design A2, 'BRANCH K=NO'
CHANGE: P0 deliverable: pull base.apk from one field phone and grep it for jobs.outbox.v2 and the API host. P4 scope: add the K=no/pre-v2 branch from O-10, including the owner sign-off item, plus a §4 row for it.
CHECK: found=true supports=true — G2 §3 (lines 225/227) names the bundle grep for jobs.outbox.v2 (H14, O10-F15); §2 lists O10-F15 as P1/O; O-10 design A2 and BRANCH K=NO give the sign-off branch. The plan's P0 lists commit/versionCode/cert but no v2 grep. Its only grep is the P2b built APK (line 165). O10-F15 appears nowhere in the plan.

--- CMP-4 [MAJOR] P0 (conf 0.7)
CLAIM: G2 calls the Supabase deadline 'the only irreversible clock'. W0 item 4 says to restore now or at least download the logical backup. P0 only records status and deadline, and its Done-when accepts 'unknown, because …' on any line, so P0 can finish with the clock still running and no backup in hand.
EVIDENCE: G2 §3 'The Supabase restore deadline … W0 item 4, today'; ORCHESTRATION-DESIGN §4.0 item 4; O-08 §3 step 2
CHANGE: P0 Done-when: the Supabase logical backup is downloaded to the laptop and to R2 archive/, or the project is confirmed unrestorable (with a screenshot). 'Unknown' is not allowed for this line.
CHECK: found=true supports=true — G2 line 229 reads "The Supabase restore deadline (the only irreversible clock) | W0 item 4, today". ORCHESTRATION-DESIGN line 142 (W0 item 4) says to restore now, or at least download the logical backup. O-08 line 40 calls it the only irreversible clock, and its CASE a (line 44) repeats the restore-or-download advice. I did not check the ship plan's P0 Done-when wording or G2's section number.

--- CMP-5 [MAJOR] P3 (conf 0.8)
CLAIM: G2 §3 hands three tests to 'the self-host phase before cutover': cloudflared's X-Forwarded-For behaviour, the HTTP code a stopped tunnel returns, and the PoP. P3 covers only the PoP (curl with cf-ray). The stopped-tunnel code is what P4's abort lever R3 relies on. XFF decides whether P7b's per-source keying and the login limiter work or turn into a self-DoS.
EVIDENCE: G2 §3 row 'cloudflared's X-Forwarded-For…'; O08-F03; O-08 §4(v) HYPOTHESIS; O-05 design 'Prefer CF-Connecting-IP…'; O-10 R3
CHANGE: P3 Verification/Done-when: stop cloudflared and `curl -i` the API, recording the code (it must be 5xx or a network error); log the XFF and CF-Connecting-IP the backend sees from two clients; api routes direct to the backend (no Caddy hop). P7b entry: the XFF result is recorded.
CHECK: found=true supports=true — G2 §3 row lists XFF, stopped-tunnel code and PoP for the self-host phase. O-08 §4(v) marks the stopped-tunnel code as HYPOTHESIS. O08-F03 and the O-05 design note tie XFF to the limiter and self-DoS. O-10 R3 uses cutting the tunnel as the abort lever. P3 in the ship plan only has the cf-ray latency curl, with no XFF or stopped-tunnel test.

--- CMP-6 [MAJOR] P0 (conf 0.55)
CLAIM: O05-07 (P1, open) is settled only as 'whether the subdomain can be bound'. P3 accepts 'documented as uncontrollable', but no phase says what to do then. Background tasks keep syncing to the old host even when techs never open the app, so a third party who claims the subdomain could answer 2xx (deleting items, O10-F4) or harvest logins.
EVIDENCE: G2 §2 D O05-07 (P1, O); O-08 §4 'no phone may run the old build online'; O-10 C H=no; O-01 protocol step 0 (per-app data off)
CHANGE: P0: if H=no, turn off FixFlow's per-app Wi-Fi and mobile data on every field phone until its P4 update (O-01 step 0 mechanism), and record the date per phone. P4 entry: confirmed for every phone.
CHECK: found=true supports=true — All cited items exist. G2 lists O05-07 as P1/O needing W0 item 2. O-08 says no phone may run the old build online if the host can't be regained. O-10 C says for H=no the APK update is the only guard, and any 2xx deletes queued items (O10-F4). O-01 step 0 turns off per-app data. P3 (line 194) accepts "documented as…". The harvest-logins risk and the background-sync reasoning are the critic's inference, not stated in the evidence.

--- CMP-7 [MAJOR] global (conf 0.85)
CLAIM: §4 is missing several questions the G1 §5 form asks. Odoo: (3) who approves and at what unit or cadence (the export scheduler cadence in O-07 part 3); (4) full-fidelity or selective; (5) tax regime and chart of accounts (P10 needs it); (6) customer partner mapping (PII to Odoo). Self-host: (5) RPO/RTO and who answers the phone; (6) whether the web and ops consoles move (Access). O-08 §7 P7 MON_LOC, P10 retention, P11 second-provider copy and P13 disk encryption are also absent.
EVIDENCE: G1 §5 owner-decision form; O-07 design part 7; O-08 design §7 P5–P13
CHANGE: Add §4 rows for each with safe defaults: one walk-in partner (no PII), full-fidelity, a weekly export, 24 h RPO, and web/ops behind Access. Name the phase each one blocks (P9a/P10/P3/P13).
CHECK: found=true supports=true — G1 §5 lists the Odoo items (3) approver and unit, (4) full-fidelity or selective, (5) tax regime and chart of accounts, (6) customer mapping, and the self-host items (5) RPO/RTO and who answers the phone, (6) whether the consoles move. O-08 §7 has P7 MON_LOC, P10, P11, P13. O-07 line 47 gives the weekly or monthly export cadence. The SHIP-PLAN §4 table has none of these rows. Minor: the cadence is in O-07's export section, not part 7.

--- CMP-8 [MAJOR] global (conf 0.6)
CLAIM: Two §4 defaults are unsafe or missing. 'Recovery case → case (b) R2 dump if it exists' would pick the older dump over a restorable Supabase project (O-08 says to prefer the live dump and cross-check), and it could let the irreversible deadline pass. 'Box → —' leaves out D1's mandated fallback, a VPS running the identical compose behind the same DNS name.
EVIDENCE: G2 §4 D1 fallback sentence; O-08 §3 CASE a 'Prefer the live dump; compare the two'; G2 §3 Supabase deadline
CHANGE: Recovery-case default: none, so P3 blocks until P0 settles it, with (a) taking precedence when restorable. Box default: 'D1 fallback: small VPS, identical compose, same api.<domain>'.
CHECK: found=true supports=true — All three citations exist. O-08 CASE a says "Prefer the live dump; compare the two" and also pulls the newest R2 dump as the cross-check and fallback. G2 §4 D1 gives the VPS fallback (identical compose, same DNS name). G2 §3 calls the Supabase restore deadline "the only irreversible clock". The plan §4 table has "Recovery case → case (b) R2 dump if it exists" and "Box → —". So the claim holds.

--- CMP-9 [MAJOR] P8 (conf 0.6)
CLAIM: The default chain anchor is 'app_event only'. That keeps the head hash on the box the operator controls, so O6-F07's 'unanchored' part stays open, and P8's Done-when ('chain job runs in a test scheduler') never requires an off-box anchor. O-06 says the anchor is the only thing that defeats an operator who can recompute the chain.
EVIDENCE: G2 §2 D O6-F07 (P1/P2, G); O-06 design item 5 and the 'Residual risk' paragraph; plan §4 row 'Chain anchor channel'
CHANGE: Change the default to email to the owner, or block P9a entry until a channel is chosen. P8 Done-when: one head hash delivered through the chosen off-box channel.
CHECK: found=true supports=true — Plan §4 row "Chain anchor channel | P8 | app_event only" exists. The P8 Done-when ("chain job runs in a test scheduler") has no off-box anchor requirement. O-06 item 5 says the anchor is the only thing that defeats an operator who can recompute an unkeyed chain. The G2 row O6-F07 lists the chain as unanchored. The scope text does say the head hash is anchored out of band, so the weakness is the default and the Done-when, not the scope.

--- CMP-10 [MAJOR] P8 (conf 0.6)
CLAIM: O6-F08 (P1) covers two things: no tamper evidence on job_payment, and voids that cannot be attributed. P8 closes the attribution half (voided_at/by, event payloads) but not the tamper evidence. O-06 item 5 extends the hash chain to job_payment create/void and job_bill_revision, and the plan leaves that out.
EVIDENCE: O-06 JSON O6-F08 title 'Customer cash (job_payment) has no tamper evidence…'; O-06 design item 5
CHANGE: Add to P8 scope: generalise attendance/chain.py so the per-shop chain covers job_payment create/void and job_bill_revision, and have the daily verify cover them. Or record the deferral explicitly, with the reason and the phase.
CHECK: found=true supports=true — O6-F08 exists in O-06 with the cited title. Its fix says to generalise chain.py to cover job_payment create/void and bill revisions. Design item 5 says the same. P8 scope has voided_at/by, event payloads, job_bill_revision, a daily verify job and an anchor. It never extends the chain to job_payment. The plan has no recorded deferral.

--- CMP-11 [MAJOR] P3 (conf 0.7)
CLAIM: P3 does not follow D2. D2 says 'app. and ops. behind Cloudflare Access' and 'an off-box dead-man monitor is mandatory'; P3 mentions neither, and the monitor is pushed to P13 ('a month of stable running is nice'). P3's goal 'nothing else reachable' also contradicts serving the Caddy web the manager needs in P4 (residue) and P5a (radius). D2's age encryption and put-only token are deferred too, with no stated rationale.
EVIDENCE: G2 §4 D2; O-08 §2 'Uptime/dead-man: MUST be off-box'; plan P13 scope
CHANGE: Add to P3: an Access policy on app./ops. and an off-box heartbeat (host cron, DB-touching check), both in Done-when. Reword the goal to 'only api. open; app./ops. behind Access'. Note the age/put-only deferral to P13 explicitly against D2.
CHECK: found=true supports=true — G2 D2 says app. and ops. are behind Cloudflare Access, age encryption and a put-only token apply, and an off-box dead-man monitor is mandatory. O-08 says the monitor must be off-box. P3's scope and Done-when omit Access and the monitor, and its goal is "nothing else reachable" while it includes the Caddy web. P13 holds the monitor, age and put-only token, and its entry says a month of stable running is "nice but not required". I did not check P4/P5a's need for the web manager.

--- CMP-12 [MAJOR] P5a (conf 0.6)
CLAIM: P1 geofence items fall between P5a and P5b. O01-F01's 'after any restart' path depends on the #52230/#49424 patches, which O-01 fix 3 bundles with the re-arm. The plan puts the patches in P5b, whose Done-when is only a compile plus an OEM screen check. P5a's own fallback ('move 4/7 to P5b') moves O01-F03 (fix 4) into P5b too, which has no toggle re-register test. Either way, neither phase's Done-when closes the item.
EVIDENCE: O-01 design FIX ORDER 3–4; G2 §2 A O01-F01, O01-F03 (P1); plan P5a 'Size', P5b Done-when
CHANGE: Keep the #52230/#49424 patches with F01 in P5a, or add to P5b Done-when: 'after a reboot/OS kill while on duty, the FGS is present' and, under the fallback, 'a location toggle re-registers the fence'.
CHECK: found=true supports=true — The cited text exists. Design FIX ORDER 3 bundles "patch #49424/#52230" with the F01 re-arm. The plan puts both patches in P5b, whose Done-when is a native compile plus an OEM screen check. P5a's fallback "move 4/7 to P5b" moves F03, and P5b has no toggle test. Overstated: P5a's Done-when does test "FGS present after reopen" and a toggle re-register, so "either way" holds only under the fallback. It tests reopen, not reboot or OS kill.

--- CMP-13 [MAJOR] P2a (conf 0.7)
CLAIM: O-03 step 8 (O3-F10, O3-F11) is in no phase. P2a takes steps 1–5 and 9 and P2b takes 6–7, yet P2a's Resume says 'the O-03 design's numbered list is the checklist'. O3-F10 is a live deletion: a second trip's depart silently overwrites the first trip's unsent punch. That breaks CLAUDE.md's 'the outbox never deletes a write' in the file P2a edits.
EVIDENCE: O-03 design step 8; O-03 JSON O3-F10 (outbox.ts:155-161, TravelScreen.tsx:171-177); CLAUDE.md 'The mobile outbox'
CHANGE: Add step 8 to P2a scope (a per-tap location outbox id, and a travel-state merge with outbox.test and a merge test), or name it explicitly as deferred to P5a with a reason.
CHECK: found=true supports=true — O-03 design step 8 exists (per-tap location outbox id plus travel-state merge). O3-F10 and O3-F11 exist in the O-03 JSON and the G2 register, severity P2. O3-F10 cites outbox.ts:155-161 and TravelScreen.tsx:171-177 and says a second depart overwrites an unsent first punch. P2a lists steps 1-5 and 9, and its Resume names the design's numbered list as the checklist. The plan has no mention of O3-F10, O3-F11 or step 8. I did not verify P2b's scope beyond line 160.

--- CMP-14 [MAJOR] P2b (conf 0.65)
CLAIM: O10-F8 is not handled: a selfie upload that throws breaks syncNow and stalls every later punch. No phase fixes the uncaught uploadAsync, and P3 drops O-10 B2's 'prove one selfie PUT end to end, or the punch drain stalls', so P4 can stall on its first phone.
EVIDENCE: O-10 JSON O10-F8 (attendance/sync.ts:296-301, :217); O-10 design B2; G2 §2 B 'O10-F8..F14'
CHANGE: P2b scope: a local catch around the selfie PUT, so the punch is marked and the selfie retried separately, with a sync.test case. P3 Done-when: one selfie PUT through a signed URL succeeds against the box's R2 settings.
CHECK: found=true supports=true — O10-F8 exists in O-10.json and the G2 §2 row. The code matches: sync.ts uploadAsync (lines 161-162, not the cited 296-301) has no local catch, and a non-ApiError hits the 'break' at line 81 (cited 217). Design B2 says 'prove one selfie PUT end to end, or the punch drain stalls'. Cited lines are stale (the register marks them MOVED), but the content is accurate. I did not check the plan's P3 for the dropped B2 clause.

--- CMP-15 [MAJOR] P2b (conf 0.55)
CLAIM: O3-F4 (P1) is spread across P2b (retryAdvice), P4 (the window) and P6 (a 14-day device_time) with no Done-when. P2b's deliverable tests leave out the retryAdvice test in O-03 step 6. Its '24 h and 48 h' boundaries also go stale once P1 sets the ping ceiling to 240 h and P6 the punch ceiling to 336 h.
EVIDENCE: G2 §2 B O3-F4 (P1, C); O-03 design step 6; plan P1 (O04-F12 240 h), P6 (14-day window)
CHANGE: P2b deliverables: a retryAdvice.test at the post-P1/P6 ceilings, read from a single shared constant. Done-when: a parked row older than the ceiling shows the 'late' prompt before Retry.
CHECK: found=true supports=true — Mostly confirmed. The G2 gate lists O3-F4 as P1/C. O-03 step 6 requires a retryAdvice test at the 24 h and 48 h boundaries. P2b names only manifest, unpark and drainAll tests, with no Done-when for retry advice. P1 raises the ping ceiling to 240 h, and P6 sets a 14-day (336 h) punch window. Minor flaw: the 14-day window is in P6, not P4.

--- CMP-16 [MAJOR] P6 (conf 0.6)
CLAIM: The plan breaks O-04's drain sequence. O-04 says ship the late_sync/late_batch flags before widening, then regenerate payroll for the affected windows (O04-F11). The plan widens in P4 without requiring P6, lets P6 defer O04-F11 to P13 ('if not done'), and never cites O04-F5 (drain-day collapse). Back-filled weeks' payroll exports then stay frozen and wrong.
EVIDENCE: O-04 design §2 'Honest flags to ship before widening' and 'Order of operations' 1–5; O-10 B2 Sunday payroll note; G2 §2 C O04-F5, O04-F11
CHANGE: P4 entry: P6's flags merged. Move O04-F11 out of P13 into P6 (or a named P4 follow-up) with Done-when 'payroll exports regenerated for every window touched by the drain'. Cite O04-F5 in P1/P4.
CHECK: found=true supports=true — O-04 design confirms flags "to ship before widening" and order steps 1–5 (step 4 regenerate payroll, needs O04-F11). G2 lists O04-F5 and F11. The plan's P4 entry lacks P6, P6 defers F11 to P13 (line 303), and O04-F5 is never cited. Minor: G2 calls F11 "payroll export frozen"; the Sunday-note citation was not checked.

--- CMP-17 [MAJOR] P7a (conf 0.6)
CLAIM: O05-06 (P1) is only partly closed. P7a scopes `GET /api/jobs` (the list), but `GET /api/jobs/{job_id}` takes any CurrentPrincipal and returns the full JobDetail (customer PII and location) for any job. The claim names 'the whole customer base, every job's GPS'.
EVIDENCE: backend/app/features/jobs/router.py:149-155 (get_job, `_principal: CurrentPrincipal`); G2 §2 D O05-06
CHANGE: Add job detail (and any per-job read that carries customer or location fields) to the require_job_actor / PII-minimised-until-claimed rule. Done-when: a tech gets a minimised detail for an unclaimed job and a 403 for another tech's job.
CHECK: found=true supports=true — router.py:149-155 matches: get_job takes only `_principal: CurrentPrincipal` and returns JobDetail with no ownership check. G2 lists O05-06 as P1 ("tech token reads whole customer base, every job's GPS and media"). The plan's P7a line scopes only `GET /api/jobs` (SHIP-PLAN line 317). I did not open JobDetail's schema, so the PII/GPS content is unverified.

--- CMP-18 [MAJOR] P12 (conf 0.8)
CLAIM: The plan adds scope that is not in the register. 'T44-web-2..4' (P12) and 'T44-media-1/2' (P7b) appear nowhere in G2, the W2 outputs or docs/; a grep finds them only in the plan. A3, A4, L3 and the 'nine bare catch {}' come from the HANDOFF doc, not from G2. Most of P12 cannot be traced to the evidence its header promises.
EVIDENCE: grep over docs/ and w2-results: T44-web-*/T44-media-1/2 occur only in SHIP-PLAN lines 340, 440; G2 lists only T44-media-3, T44-attendance-3; HANDOFF-2026-07-28 A3/A4
CHANGE: Remove the invented ids. Cite A3/A4/L3 as 'HANDOFF-2026-07-28 §…' and have G2 (or a register addendum) admit them with a severity, or drop them to backlog.
CHECK: found=true supports=false — The grep result is accurate for docs/ and w2-results. G2 lists only T44-media-3 (line 190). But the ids are not invented. W1 discovery output S-06 (w1-results/S-06.json and .txt) defines T44-web-1..4 and T44-media-1..3, each sourced to "HANDOFF §4.4". The critic never searched w1-results. I did not check A3/A4/L3.

--- CMP-19 [MAJOR] P9b (conf 0.6)
CLAIM: D3: 'Implementation stays on Opus whatever the transport, because the money invariants do not change.' P9b has Sonnet implementing `GET /api/postings/reconciliation` (LEDGER_SIGN-signed money arithmetic across sources). P9a's fallback also moves the decision API, which drives money state transitions, into P9b under that same Sonnet routing.
EVIDENCE: G2 §4 D3 last sentence; O-07 design part 5; plan P9a 'Size', P9b 'Workflow'
CHANGE: P9b: Opus implements the backend reconciliation and any deferred decision API, and Sonnet does the web pages only. Name the deferred decision API in P9b scope and Done-when.
CHECK: found=true supports=true — G2 §4 D3 ends with that sentence. O-07 part 5 specifies reconciliation with LEDGER_SIGN-signed sums across sources. P9b Workflow says Sonnet implements and Opus reviews arithmetic. P9a Size says the decision API may defer to P9b. Fallback routing hazard is real.

--- CMP-20 [MAJOR] P9a (conf 0.45)
CLAIM: P9a builds the manager approval boundary without O6-F16 (a manager can credit their own ledger or approve their own advance). O-06 item 3 requires refusing self-approval on exactly this kind of table and proposes an owner role or digest. With one manager, that needs an owner decision, and §4 has none.
EVIDENCE: G2 §2 D O6-F16 (P2, G); O-06 design items 3 and 8
CHANGE: P9a scope: the decision API refuses decided_by = the subject tech or recorded_by, or flags such postings in the reconciliation view. Add a §4 row 'second approver / owner digest' with the default 'flag, do not block'.
CHECK: found=true supports=true — G2 §2 D row "O6-F16, O6-F18" is P2, gate G: manager self-credit/self-approval possible. O-06 item 3 refuses self-approval (decided_by != subject tech or recorded_by). Item 8 proposes an owner role or owner-only digest because only tech and manager exist. I did not check whether the plan's §4 lacks an owner decision or whether P9a omits O6-F16.

--- CMP-21 [MAJOR] P5b (conf 0.55)
CLAIM: G2 §3 hands three outcomes to 'device tests in the field-fix phase': O01-F14 (#50060) under the old architecture, O01-F12 timestamp sharing, and O01-F16 FLP timeout. P5b patches F12 and F14, but its Done-when is a compile and an OEM screen. No phase records these device results.
EVIDENCE: G2 §3 last row; O-01 design H11 classification (#50060 'outcome after the drop is unverified')
CHANGE: P5b Verification: device tests for each (open the app while a headless task is alive; pings during a travel leg; a GPS read under no fix). Record pass/fail in FIELD-VALIDATION or W0-results.
CHECK: found=true supports=true — G2 §3 last row (line 234) lists exactly these three items (O01-F14 old-architecture outcome, O01-F12 FLP timestamp sharing, O01-F16 FLP timeout) as settled by "device tests in the field-fix phase". O-01 design H11 line 109 says #50060 is likely applicable and "the outcome after the drop is unverified". The plan-side claims (P5b Done-when, no recording phase) were not checked.

--- CMP-22 [MINOR] P7a (conf 0.75)
CLAIM: O6-F10 and O04-F7 are the same register row ('Adjustment actor from the body'), yet the item appears in both P6 ('O04-F6, F7, F15') and P7a ('manager_id from the principal everywhere (O6-F10)'). That breaks §5's 'exactly one phase' and invites conflicting edits to the same attendance code.
EVIDENCE: G2 §2 D row 'O6-F10 / O04-F7'
CHANGE: Keep it in P6 (which owns the 0047 adjustment change). In P7a, limit 'actor from the principal' to the non-attendance fields and cite O-06 item 4.

--- CMP-23 [MINOR] P12 (conf 0.7)
CLAIM: L7 is a mobile defect (O3-F18: sendPunch reports a queued arrival as 'Arrival recorded'), but the plan puts 'L7 wording' in P12, a web-only PR verified by Vitest.
EVIDENCE: O-03 JSON O3-F18 title; G2 §2 B 'O3-F14..F21 … L7'
CHANGE: Move L7 / O3-F18 to P2a (it ties into the engine status banner, O3-F14) or to P5a.

--- CMP-24 [MINOR] P1 (conf 0.7)
CLAIM: P1 labels its items 'D1 dev-secret fail-open … D2 seed PINs', which collides with G2's decisions D1–D3 (latency, self-host scope, Odoo) and with O-10's D1–D7. P7b also cites O08-F09 (ops always 'degraded' off Railway) for ops-server hardening it does not address.
EVIDENCE: G2 §4 D1/D2; O-08 JSON O08-F09 title
CHANGE: Drop the D1/D2 prefixes in P1. In P7b, either add the O08-F09 fix (status ignores unconfigured Railway pages) or remove the citation.

--- CMP-25 [MINOR] global (conf 0.75)
CLAIM: §5 says P2/P3 items are 'listed in the phase that touches their file', but many are listed nowhere: O6-F12/F13 (mock-location, fuel billed), O6-F14/F15 (shared-phone Discard, no trace), O01-F19, O05-15, O05-17 (key restrictions, part of O-05's 'before shipping' set), O04-F14, O3-F16, O3-F19..F21, O07-F9, O08-F10, and O10-F10 (with O-10 B3's roster check).
EVIDENCE: G2 §2 rows A, B, C, D, E, F; O-05 design item 10; O-10 design B3
CHANGE: Add one 'backlog in this file' line per phase: O6-F14/F15 → P2b, O01-F19 → P5a, O6-F12/F13 → P6, O05-17 → P0, O10-F10 and the B3 roster check → P3, O07-F9 → P9a, O08-F10 → P13, and so on.

--- CMP-26 [MINOR] P3 (conf 0.7)
CLAIM: P7b says 'Caddy CSP/headers already in P3 — verify', but P3's scope and Done-when name no CSP, no security headers, no node:22 build stage and no self-hosted font. O05-11 and D2's 'Caddy with CSP and headers from a node:22 build' would therefore pass P3 unverified.
EVIDENCE: G2 §2 D O05-11; G2 §4 D2; O-05 design item 6; O-08 §1 web service
CHANGE: P3 scope: the Caddy CSP/headers and the node:22 build stage. Done-when: `curl -I https://app.<domain>` shows the CSP header.

--- CMP-27 [MINOR] global (conf 0.7)
CLAIM: §5 claims coverage by family letter instead of by id, and several P1 ids are never cited (O07-F1, O07-F2, O08-F05, O08-F14, O10-F3, O10-F4, O10-F7, O04-F5), which weakens resumability. O08-F05 is also only half closed: P2b adds a fleet profile, but the preview and production profiles still bake the Railway host and api.fixflow.example.
EVIDENCE: G2 §2 B/E/F; O-10 JSON O10-F11 (eas.json:14-30)
CHANGE: Make §5 an id → phase table. Cite each id where it is handled. In P2b, repoint or delete the preview/production EXPO_PUBLIC_API_URL values.

--- CMP-28 [MINOR] P3 (conf 0.7)
CLAIM: D1 requires the ADR to be amended 'superseded by the self-host decision'. No phase does that.
EVIDENCE: G2 §4 D1 last sentence
CHANGE: Add the ADR-0001 amendment to P3's deliverables.

--- CMP-29 [MINOR] P11 (conf 0.5)
CLAIM: O-07 part 7 says to build the async PostingTransport Protocol, a fake transport and the halt/lag/rotation alerts regardless of plan, writing only the Odoo adapter after Custom is confirmed. The plan gates all of P11 on the Custom plan, so the CSV default never sits behind the Protocol that D3 describes.
EVIDENCE: O-07 design part 4 (Default CsvExportTransport) and part 7 'Build regardless'
CHANGE: Move the Protocol, CsvExportTransport and the fake transport with tests into P10, and keep only OdooJson2Transport and erp-push in P11.

--- CMP-30 [MINOR] P9a (conf 0.6)
CLAIM: If P9a's fallback ('leave the decision API to P9b') is taken, O07-F1 (P1) closes only in P9b, whose scope lists read endpoints only. P10's entry is 'P9a merged' even though export needs approved postings. P9a also leaves out O-07's rule that the stager calls verify_ledger_chain and refuses to stage on a verify failure.
EVIDENCE: O-07 design part 2 (ledger entry line, Manager step); plan P9a Size, P9b Scope, P10 Entry
CHANGE: Name the deferred decision API in P9b scope and Done-when. Set P10 entry to 'decision API merged'. Add the chain-verify precondition to P9a scope.

==================== LENS exec (owner executability) — 28 findings, unrefuted blockers beyond cap: 0
SUMMARY: Three things matter most. First, the plan cannot branch on what W0 might return: §4 defaults to a lossy R2 restore while the Supabase clock runs out. It has no case-c steps, no K=no/H=no drain branch (O10-F15, a P1, is dropped), and no VPS fallback if the box is late, which D1 requires. Second, P0 is incomplete and oversized. It lacks per-phone K checks, the A3 photos, the keystore export, the roster, and the tools this machine does not have (adb, apksigner, JDK, eas-cli). It also folds procurement into a phase that can close with 'unknown'. Third, many Done-whens rest on things no phase provides: deploying to the box after P3, installing builds across the fleet, a spare phone or dev build, techs walking with adb, and measurements with no threshold (latency, kill rate).
PHASES OK: P2a, P6, P9a, P9b, P11, P12

--- EXE-1 [BLOCKER] global (conf 0.8)
CLAIM: §4 default 'Recovery case → case (b) R2 dump if it exists' is unsafe. While the case is undecided because nobody has checked Supabase, this default quietly ships a lossy restore: everything synced after the newest dump (20260802T023008Z, head 0045) is lost server-side. Meanwhile the only irreversible clock keeps running.
EVIDENCE: G2 §3 'The Supabase restore deadline (the only irreversible clock)'; design §4.0 item 4 'If restorable, restore now'; O-08 §3 CASE b 'RPO = outage start minus that stamp'
CHANGE: Change the default to: 'P3 blocks until W0 item 4 is answered. If Supabase is restorable, take its dump the same day (case a). Use case b only when the dashboard shows the project is unrecoverable, and case c only when no R2 dump exists either.'
CHECK: found=true supports=true — All three citations exist. G2 line 229 names the Supabase restore deadline as the only irreversible clock (W0 item 4, today). Design §4.0 item 4 says "If restorable, restore now". O-08 CASE b says anything synced after dump 20260802T023008Z (head 0045) is lost server-side. The plan's default is at SHIP-PLAN line 482. The cited text supports the claim as stated.
REFUTE: refuted=true → major — The problem is real, but it is not a blocker. P0's scope already covers design §4.0 items 1–10, and item 4 says "If restorable, restore now, or at least download the logical backup". P0 also lists the Supabase status, pause date and deadline as deliverables, and its goal is to start the Supabase clock. P3's entry requires that "P0 delivered … recovery case". So the §4 default only takes effect if P0 closes with Supabase marked "unknown". That still matters: the default contradicts P3's entry condition, and the loss it allows is permanent (O-08 CASE b). The fix is to drop the default (P3 blocks until W0 item 4 is answered) and to say plainly in P0 that the Supabase dump is taken the same day.

--- EXE-2 [BLOCKER] P0 (conf 0.8)
CLAIM: P0 only records the Supabase deadline ('Supabase status, pause date, deadline, Postgres major'). Nothing makes the owner act on it, and nothing covers a deadline that has already passed. P3 has no case-c steps at all: no job_token_seq set above the highest printed ticket, no roster slugs, none of O-10's 'nothing' rules.
EVIDENCE: design §4.0 item 4; O-08 §3 'Case c extras' (setval job_token_seq above tickets 1051–1057+); O-10 'RECOVERY CASE: … Nothing'
CHANGE: Add P0 step 1: 'If restorable, restore or download the logical backup today and keep a copy off-box.' Add an a/b/c decision tree to P0. Add case-c sub-steps to P3, with an owner input 'highest job ticket number printed for any customer'.
CHECK: found=true supports=true — Design §4.0 item 4 says "If restorable, restore now, or download the logical backup" (P0 only records it). O-08 "Case c extras" says setval job_token_seq above highest token (tickets 1051-1057+); O-10 has "Nothing:" rules. P3 mentions restore per case and sequences gate, but no case-c setval, ticket input, or slugs. Supported.
REFUTE: refuted=true → major — This is a real gap, but it is not a blocker, because the plan already pulls in most of it by reference. P0's scope is "Design doc §4.0 items 1–10", and item 4 says "If restorable, restore now, or at least download the logical backup". P0's goal also says it will "start the two clocks", the Supabase deadline among them. P3's scope is "O-08 design §1–§4", which contains the case c section and its "Case c extras". P3 already names the three-sequence gate, setting the fence and rotating every PIN. What is missing: P3's size line puts taking the Supabase dump in P3 (after the box exists), which contradicts "restore now". P0's deliverables only record the deadline. And P3 has no explicit job_token_seq setval above the highest printed ticket, and no owner input for that number. Making these explicit is a major fix, not a blocker.

--- EXE-3 [BLOCKER] P2b (conf 0.8)
CLAIM: The plan assumes K=yes and H is controllable everywhere ('same package, same signature'). It has no K=no or H=no branch, and O10-F15 (P1, open) appears nowhere, even though §5 claims every P1 is covered. If P0 returns a signature mismatch, P2b's Done-when cannot pass and P4 has no procedure.
EVIDENCE: G2 §2-B O10-F15 P1 O; O-10 'BRANCH K=NO' (proxy drain, row-by-row Retry, transcribe failed creates, then uninstall/reinstall; H=no: transcribe photos, declare loss); plan has no 'K=' text
CHANGE: Add the O-10 K=no/H=yes and K=no/H=no branches to P4 verbatim, including the O10-F15 handling (photograph job writes first; owner sign-off on accepting old-secret tokens). Make P2b's Done-when conditional on K.
CHECK: found=true supports=true — G2 line 139 lists O10-F15 as P1/O; O-10-design.md has "BRANCH K=NO" with H=yes (photograph, Retry row by row, transcribe failed creates, reinstall) and H=no. The plan has no "K=" text and no O10-F15 mention. P2b's Done-when assumes the same package and signature. §5 claims every P0/P1 item is placed.
REFUTE: refuted=false → blocker — The claim holds. P4 scopes "O-10 design steps B4–F exactly", but in O-10-design.md the "BRANCH K=NO" section (H=yes: proxy drain, photograph job writes, optional owner sign-off to accept old-secret tokens, Retry row by row, transcribe failed creates, reinstall; H=no: transcribe and declare the loss) comes after F, so P4 leaves it out. P2b's Done-when requires "same package, same signature". O10-F15 (G2 line 139, P1/O; §3 says the H14 answer settles it) appears in no phase, even though §5 claims every P0/P1 item is covered. P0 records the keystore but nothing says what happens on a mismatch. The plan's own rubric makes dropping a P1 item a blocker. That F15 only applies if K=no makes it conditional, but it is still dropped.

--- EXE-4 [MAJOR] P0 (conf 0.75)
CLAIM: P0's deliverables are incomplete against O-10 A2/A3 and O-08. Missing: the per-phone K check (pull base.apk, apksigner, grep the bundle for jobs.outbox.v2 and the API host); the A3 photos of each DID NOT SYNC list, due 'today' (the plan defers them to P4); exporting the non-re-mintable keystore; and the fleet roster (phone × tech id × OEM/model) that P4 B3 and P5b/P5c need.
EVIDENCE: O-10 A2 'on each phone', A3 'only BEFORE evidence'; O-08 §1 'Not re-mintable: the Android keystore (W0 item 3, export it)'; P5b owner input 'fleet's phone models' arrives three phases late
CHANGE: Add these four lines to P0's deliverables in W0-results.md.
CHECK: found=true supports=true — O-10 A2 (per-phone pull/apksigner, bundle grep for jobs.outbox.v2 and API host) and A3 (BEFORE photos, "today") exist. O-08 says to export the keystore. P0 lists only the EAS keystore-in-credentials check, not an export or per-phone K. P4 holds the photos; P5b owner input is the fleet's phone models. Roster/phone×tech is the critic's inference.

--- EXE-5 [MAJOR] P0 (conf 0.8)
CLAIM: No phase lists the tools and logins the owner needs. This machine has no adb, apksigner, JDK/keytool, eas-cli, railway CLI, psql or Android SDK (checked with `which`). Yet P0 (dumpsys, `eas credentials`), P2b (apksigner) and P4/P5a/P5c/P14 (adb logcat) all assume them. Tech phones also need USB debugging enabled, which is OEM-specific.
EVIDENCE: design §4.0 items 3 and 8; O-01 field protocol steps 1–5; plan P2b Verification; `which adb apksigner keytool java eas railway psql` all absent
CHANGE: Add a P0 'tools and access' checklist: platform-tools, build-tools apksigner plus a JDK, `npx eas-cli login`, dashboard logins confirmed (Railway, Supabase, Cloudflare, Sentry, Firebase, Expo), USB debugging on the pilot phone, a cable.
CHECK: found=true supports=true — All cited items exist. Design §4.0 items 3 and 8 name eas credentials and adb dumpsys. The O-01 protocol steps 1–5 use adb. Plan P2b verification cites apksigner. Rerunning `which` finds adb, apksigner, keytool, java, eas, railway and psql all absent. P0 lists no tools checklist or USB debugging step. The USB-debugging OEM claim is the critic's own inference, not cited evidence.

--- EXE-6 [MAJOR] P0 (conf 0.7)
CLAIM: P0 mixes same-day clocks (notice, Supabase, photos) with procurement that one session cannot finish: buying the domain, choosing and building the box, ISP, UPS, and a CGNAT test that needs the box online. 'Done when every line has a value or unknown, because…' lets P0 close with no domain and no box. P2b's build and P3 then block with no date and no fallback.
EVIDENCE: plan P0 Deliverables/Done when; §2 'P3 cannot start before P0 delivers a domain and a box'
CHANGE: Split P0. P0a, one session today: clocks, evidence, tools, logins. P0b: owner-run procurement with a target date that triggers the D1 VPS fallback (EXE-7).
CHECK: found=true supports=true — P0 Deliverables list a chosen domain and a box (location, OS, UPS, ISP, CGNAT test) beside same-day clocks. "Done when" accepts a value or "unknown, because …". §2 says P3 cannot start before P0 delivers a domain and a box. P2b entry needs the domain, and P3 entry needs domain, box, ISP. The plan has no date or fallback. I did not check "EXE-7" or the D1 VPS fallback.

--- EXE-7 [MAJOR] P3 (conf 0.75)
CLAIM: The plan drops D1's fallback. P3's entry requires 'box (Linux, UPS)' and §4's Box row default is '—', so if the box is late the drain waits indefinitely. Meanwhile phones keep unsynced data and hibernation revokes their permissions.
EVIDENCE: G2 D1 'If the box is not ready when the drain must start, the fallback is a small VPS running the identical compose behind the same DNS name'; G1 §1.8 permission decay
CHANGE: Set §4 Box default to 'small VPS, same compose, same DNS name, by date X'. Change P3 entry to 'box or VPS'. The VPS-to-box move later is a DNS change only (O-08 P-A).
CHECK: found=true supports=true — G2 D1 (line ~246) does state the small-VPS fallback with the same compose and DNS name. The plan has no VPS or fallback mention. P3 Entry says 'box (Linux, UPS)', and the §4 Box row default is '—'. G1 item 8 covers permission decay from hibernation. G1 does not say phones hold unsynced data; the plan only implies it by sequencing P3 before the P4 drain.

--- EXE-8 [MAJOR] global (conf 0.75)
CLAIM: After P3, no phase deploys anything. P6–P13 end at 'gates green and CI green'. Railway is gone, but CLAUDE.md's Deploy row still says `railway up`. Migrations 0047–0050 reach production only when the owner rebuilds on the box over SSH. P5c needs P6's server signal live 'over the same days', yet its entry lists only P5b.
EVIDENCE: O-08 §6 runbook R5 deploy (git pull, build, up -d, image digest, rollback rule); CLAUDE.md Deploy row; plan P5c Scope 'server-side sampler state (P6)'
CHANGE: P3 delivers the R5 deploy runbook and updates CLAUDE.md's Deploy row. Every backend phase ends with 'deploy to box (owner at SSH); /api/ops/health shows head 00NN'. P5c entry adds 'P6 deployed'.
CHECK: found=true supports=true — O-08 line 84 lists R5 as "deploy (git pull, build, up -d; image digest logged; rollback rule)". CLAUDE.md line 36 still says Railway/railway up. The plan's P6–P13 "Done when" lines stop at gates green. P3 has no CLAUDE.md Deploy update and no R5 deploy step. P5c Scope uses "sampler state (P6)" but its Entry lists only P5b. Plan also has no SSH or deploy text.

--- EXE-9 [MAJOR] P3 (conf 0.7)
CLAIM: P3's restore check is circular: 'Appendix B counts match the dump', but a dump carries no independent count. The plan also never tells the owner that the check needs no Python: Appendix C uses Docker+psql, and set_pin.py/drain_audit.py run in the backend container.
EVIDENCE: O-08 §3 verification gate: ≥3,268 rows at the 2026-08-02 drill, non-voided job_payment Rs 34,400, job_token_seq ≥1057, three sequences, alembic_version 0045/0046, dispatch_cursor near max seq; design Appendix C
CHANGE: Rewrite Done-when using those baselines. Name the exact commands, e.g. `docker compose exec postgres psql -f b.sql` and `docker compose exec backend python scripts/set_pin.py`.
CHECK: found=true supports=false — O-08 design §3 gate does contain the cited baselines: 3,268 rows, Rs 34,400, token seq 1057, three sequences, 0045/0046, cursor near max seq. So "Appendix B counts" are drill baselines, not just a dump compared to itself. I found no Appendix C text, and nothing on set_pin.py or drain_audit.py running in the backend container. The Docker+psql claim is not shown.

--- EXE-10 [MAJOR] P3 (conf 0.7)
CLAIM: P3's Done-when, 'old hostname is hanging/proxying', has nobody to build it. A hang stub is code that no phase writes, it needs a Railway login and possibly a paid plan, and P3's owner inputs omit Railway. O-08 §4 also still says 'bind a stub returning 503', which G2 §5 overruled, so a runbook drafted from O-08 would carry the parking stub.
EVIDENCE: O-10 C (hang ≥20 s, never 5xx/2xx); G2 §5 row 1; O-08 §4 first bullet; plan P3 Owner inputs
CHANGE: Add a deliverable: hang stub (accept, sleep 20 s, close) plus Railway deploy steps. Add owner input: Railway access and billing. State in P3 that O-08 §4's 503 line is void.
CHECK: found=true supports=true — All four citations exist. O-10 design line 40 says hang stub, 20 s or more, never 5xx or 2xx. G2 §5 row 1 rules "hang or proxy" over the 503 stub. O-08 design line 61 still says "bind a stub returning 503". P3's owner inputs omit Railway, and the plan has no hang-stub deliverable. The paid-plan point is the critic's speculation.

--- EXE-11 [MAJOR] P3 (conf 0.65)
CLAIM: No phase prepares the box. P3 is 'Medium if the box is ready', but 'ready' is never defined, and O-08's host requirements are all owner-at-box work no phase lists: Ubuntu LTS, docker enabled, BIOS power-on after AC loss, chrony, key-only SSH, upgrade window, `cloudflared tunnel login`, /etc/fixflow 0600 env files, an encrypted secrets copy and a printed recovery sheet.
EVIDENCE: O-08 §1 'Host:' and 'Where secrets live'; plan P3 Size
CHANGE: Make a 'box ready' checklist P3's entry condition (or a P3a). Give each item an owner check command (e.g. `timedatectl`, `systemctl is-enabled docker`).
CHECK: found=true supports=true — O-08 design lines 24-25 list every cited item (Ubuntu LTS, systemctl enable docker, BIOS power-on, chrony, key-only SSH, 04:30 upgrade window, 0600 env files, encrypted copy and printed recovery sheet). P3 Size says "Medium if the box is ready". The plan has no definition of "ready". P3 Entry only says P0 delivers a "box (Linux, UPS)". One nit: "cloudflared tunnel login" is not in the cited §1 text; the design mentions only tunnel creation.

--- EXE-12 [MAJOR] P3 (conf 0.55)
CLAIM: P3 rotates every PIN ('every PIN rotated via set_pin.py'), but no step gets the new PINs to the technicians before P4 E4's mandatory re-login. Restored real PINs are fine, so rotation is required only in case c. P3 also omits O-10 B2's selfie PUT proof, without which the punch drain stalls.
EVIDENCE: O-08 §3 'restored real PINs are fine; for case c rotate'; O-10 B3, B2 (O10-F8), E4
CHANGE: Rotate only in case c, or produce a sealed per-tech PIN slip handed over in P4. Add 'prove one selfie PUT end to end' to P3's Done-when.
CHECK: found=true supports=true — O-08 line 54 says restored real PINs are fine and case c rotates t1..t5 and m1. P3 (plan line 187) says every PIN is rotated. O-10 B2 has the selfie PUT proof (O10-F8) and E4 has the forced re-login. No step delivers new PINs to techs. Caveat: O-10 B3 itself says set every PIN, so only O-08 supports rotating in case c only. I did not check P3's Done-when for the selfie PUT.

--- EXE-13 [MAJOR] P3 (conf 0.7)
CLAIM: Latency is promised but never defined. 'latency curl run from a field phone with cf-ray' has no acceptable number, no method, no sample size and no route. Field phones have no curl and are frozen by the A1 notice. §1 says 'measured in P3/P4', but P4 has no latency deliverable.
EVIDENCE: G2 D1 'a hypothesis until a field-phone curl run'; O-08 §5 predicted GET 100–300 ms, POST p95 150–400 ms vs 1703/2461 today, ADR projection ~805 ms
CHANGE: Specify the device (the owner's phone on Pakistani mobile data, e.g. Termux curl -w), N runs per route, the PoP to record, and a pass threshold (e.g. POST p95 below the ADR's 805 ms). On fail, use the D1 VPS. Drop P4 from §1.
CHECK: found=true supports=true — G2 D1 says the latency estimate is "a hypothesis until a field-phone curl run with cf-ray", to be done before cutover. O-08 design line 73 gives GET 100-300 ms and POST p95 150-400 ms, against 1703/2461 today and about 805 ms in the ADR projection. Plan §1 says "measured in P3/P4", and the P3 scope names the curl with no threshold, N or method. I did not check the A1 frozen-phone point.

--- EXE-14 [MAJOR] P2b (conf 0.6)
CLAIM: P2b's proof 'install-over test on a phone with seeded queues' cannot be run. A copy of the field build on a spare phone points at the dead Railway host, so nobody can log in and no queues can be seeded unless H=yes. Owner inputs list neither a spare phone nor the pulled field APK, and P0 does not produce it.
EVIDENCE: O-10 A2 (adb pull base.apk); eas.json preview env bakes the railway.app host; plan P2b Done when/Verification/Owner inputs
CHANGE: Owner input: a spare Android phone plus the field APK pulled in P0. P2b proves the install-over plus an empty Drain Report. The seeded-queue proof moves to the P4 pilot (A3 photos vs manifest).
CHECK: found=true supports=true — eas.json:21 bakes the railway.app host, and O-10 says to pull base.apk from a phone. Plan P2b requires an install-over test "on a phone with seeded queues". Its Owner inputs (domain, EAS access, field cert) name no spare phone or pulled APK, and P0 only records the cert and versionCode. I did not check "H=yes" or whether the preview profile is the field build.

--- EXE-15 [MAJOR] P4 (conf 0.7)
CLAIM: P4 leaves the owner without parameters:
- No phone count or roster (B3).
- No window length: 'dated deadline' with no value, where O-10 F says B6+7 days.
- 'Released' is undefined for technicians: what they may do now and what stays forbidden, plus E4's copy.
- 'Transcribed' has no target for jobs missing in case c.
- drain_audit.py is Python, not runnable on the owner's PC.
- 'Ceilings restored' to 24/48/48 contradicts P1's 240 h ping default.
- The fleet days have no per-phone checklist.
EVIDENCE: O-10 B3, E4, E6, E7, F; G2 §5 ping 240 h ruling; plan P4 Size 'owner-run over days'
CHANGE: Add the roster, T_close = B6+7 d, the tech-facing release script, the residue entry path, `docker compose exec backend python scripts/drain_audit.py`, a ping value of 240, and a per-phone checklist file.
CHECK: found=true supports=true — O-10 B3, E4, E6, E7 and F exist. F says "dated deadline (B6 + 7 days)" and restores ceilings to 24/48/48, while G2 §5 rules the ping ceiling at 240 h permanent. P4 says only "dated deadline" and "ceilings restored", and "owner-run over days". drain_audit.py is only a planned script path. The plan gives no roster, no per-phone checklist, and no target for case-c residue. The "not runnable on the owner's PC" point is inference, not cited.

--- EXE-16 [MAJOR] P5c (conf 0.7)
CLAIM: No phase installs the v2/v3 builds on the fleet. P5c's entry, 'P5b build installed fleet-wide (through the normal in-place update…)', assumes an update channel that does not exist: APKs are sideloaded, and expo-updates arrives only in P14. P5a and P5b each produce a build but test it on one phone. Every install is a supervised per-phone action.
EVIDENCE: plan P5c Entry; P14 Goal 'optional expo-updates'; O-10 E2 install procedure; plan §0 standing rule
CHANGE: Add a supervised fleet-install step with a per-phone checklist (versionCode check, queues drained, never uninstall) as the first hour of P5c, or as P5b's tail. Or skip the v2 fleet rollout and ship only v3.
CHECK: found=true supports=true — All four cited items exist. P5c Entry says "P5b build installed fleet-wide (through the normal in-place update, queues drained)". P14 lists "optional expo-updates". O-10 E2 is a per-phone adb install -r or tap-to-update, with "never uninstall". §0 forbids shipping before P4. P5a and P5b have no fleet-install step. Caveat: "normal in-place update" may mean the E2 manual install, not an OTA channel, so "assumes a channel that does not exist" is slightly overstated.

--- EXE-17 [MAJOR] P5a (conf 0.7)
CLAIM: Several Done-whens need a person and a phone, but only the radius is listed as an owner input:
- P5a: 'an indoor arrival notifies', 'a toggle re-registers the fence' (O-01 steps 3–4).
- P5c: steps 1–4 on one phone per OEM, plus a 48 h ring.
- P14: a re-run.
The O-01 steps mean walking ≥150 m away and back with screen-off waits, a tech on shift and the adb laptop at the workshop. P5c is N×~50 min plus 48 h, so it is two sessions.
EVIDENCE: O-01 field protocol steps 3–4 (15 + 20 min, 'tech on duty'); plan P5a/P5c Owner inputs; P5c Size 'one session plus the 48 h wait'
CHANGE: Add owner inputs: pilot tech on shift, adb laptop, estimated hours at the workshop. Split P5c into P5c-1 (protocol runs, ring armed) and P5c-2 (48 h review), with the validation file as the resume point.
CHECK: found=true supports=true — Plan P5a Done-when contains the quoted phrases. Its Owner inputs list only the radius. P5c has no Owner inputs line, and its Size is "one session plus the 48 h wait". P14 re-runs the P5c protocol. O-01 step 3 is "15 min, tech on duty" and step 4 is "20 min", with a walk to 150 m or more and screen-off waits, all run through adb. The adb laptop and "N×~50 min" are the critic's inference.

--- EXE-18 [MAJOR] P5c (conf 0.7)
CLAIM: P5c's 'residual kill rate' has no definition and no threshold. Its Done-when ('each OEM has a row; any fail has a named follow-up') can never fail, yet §1 declares the geofencing goal reached at the end of P5c.
EVIDENCE: plan §1 row 2; P5c Deliverables/Done when; O-01 ring defines sampler_gap (>3× interval on duty), crossing_recorded, notify_suppressed, geofence_error
CHANGE: Define the metrics from the ring and the P6 server: sampler_gap per on-duty hour, % of real arrivals with crossing_recorded, % of geofence_errors re-registered within N min. The owner sets pass thresholds in P0. The §1 milestone counts only when the thresholds pass.
CHECK: found=true supports=true — Plan P5c says the deliverable includes "residual kill rate" and Done-when is "Each OEM has a row; any fail has a named follow-up" (lines 268-277). No metric definition or threshold appears there. §1 row 2 puts geofencing "end of P5c". The O-01 design defines sampler_gap, crossing_recorded, notify_suppressed and geofence_error. I did not search the whole plan for a definition elsewhere.

--- EXE-19 [MAJOR] P7a (conf 0.6)
CLAIM: P7a's Done-when, 'the mobile app against a local backend still completes an own-job flow end to end (manual smoke)', cannot be run. The fleet APK bakes api.<domain>, and CLAUDE.md says the mobile app needs an EAS dev build (no Expo Go). No dev build, spare phone or adb reverse is listed. A dev-profile build installed on a field phone would replace the fleet app.
EVIDENCE: CLAUDE.md Mobile row 'needs an EAS dev build'; eas.json 'development' profile; plan P7a Done when/Owner inputs
CHANGE: Either add owner inputs (spare phone, a development-profile EAS build with its queue wait, LAN/adb-reverse setup), or replace the smoke with a backend integration test that replays the field APK's request sequence for an own job.
CHECK: found=true supports=true — All three citations exist. The P7a Done-when quotes as stated, and its Owner inputs list only the discount cap. CLAUDE.md says the mobile app needs an EAS dev build and not Expo Go. eas.json has a development profile (developmentClient, internal APK), so a dev build is possible. The plan lists no spare phone, dev build or adb reverse for P7a (adb appears only for the P5c pilot phone). "Cannot be run" overstates it: the plan omits the prerequisites, but the build route exists. The field-phone replacement claim is not verified.

--- EXE-20 [MAJOR] P8 (conf 0.6)
CLAIM: §4 default 'Chain anchor channel → app_event only' ships a check an insider can defeat. app_event lives in the same database the operator can rewrite, and P8's Done-when never requires an out-of-band anchor.
EVIDENCE: O-06 design item 5 'That anchor is the only thing that defeats an operator who can recompute an unkeyed chain'; G2 §2-D O6-F07
CHANGE: Default to email to the owner, which is cheap, and collect the address in P0. If no channel is chosen, P8 must label the chain 'unanchored' in the verify output and in CLAUDE.md, rather than claim tamper evidence.
CHECK: found=true supports=true — O-06 design item 5 contains the quoted sentence ("That anchor is the only thing that defeats an operator who can recompute an unkeyed chain"). G2 register row O6-F07 says "unkeyed, unanchored, never auto-verified". Plan §4 row lists the default as "app_event only". P8's Done-when does not require an out-of-band anchor. I did not check whether app_event shares the operator-writable DB.

--- EXE-21 [MAJOR] P7a (conf 0.5)
CLAIM: §4 default 'Discount cap → manager-only below original' takes away technicians' field discounting without asking the owner. The deployed APK's queued negotiates would then 403 into the failed list, a definitive 4xx. P7a itself names 'own-job negotiate below cap' as a field flow to keep.
EVIDENCE: O-07 design 'Blocked on: … whether negotiation below original needs a manager' (owner decision); O-06 item 3 negotiate_over_cap approval record; plan P7a Deliverables
CHANGE: Ask this in P0. Until it is answered, P7a allows the assigned tech to negotiate below original with a required reason and a flagged approval record, and does not block it.
CHECK: found=true supports=false — Evidence exists. O-07 design line 90 does list "whether negotiation below original needs a manager" as blocked-on. O-06 item 3 defines negotiate_over_cap. Plan §4 default and P7a:320 exist. But P7a says "own-job negotiate below cap", not below original, and lists the cap value as an owner input. So "without asking the owner" overstates it. The 403/failed-list point is unverified here.

--- EXE-22 [MAJOR] global (conf 0.6)
CLAIM: §4 lacks rows for decisions D2 makes mandatory: where the off-box dead-man monitor lives and how the owner is paged, the RPO target, who is on call, and who holds the age key. The monitor appears only in P13's Done-when, so the box runs unmonitored from P3 to P13.
EVIDENCE: G2 D2 'An off-box dead-man monitor is mandatory'; O-08 §7 P5 RPO_TARGET, P7 MON_LOC, P12 on-call; G1 §5 self-host (5)
CHANGE: Add these §4 rows with defaults: heartbeat cron to an external service paging the owner by email, nightly RPO 24 h, owner on call. Require MON_LOC as a P3 owner input and a P3 deliverable.
CHECK: found=true supports=true — G2 D2 line 258 says the off-box dead-man monitor is mandatory. O-08 lists P5 RPO_TARGET, P7 MON_LOC (where the monitor lives and how the owner is paged) and P12 on-call. G1 self-host (5) asks about RPO/RTO and who answers the phone. Ship plan §4 has none of these rows, and the monitor appears only in P13 (line 451), not P3. Age-key holder isn't in the cited evidence; D2 only mentions age encryption.

--- EXE-23 [MINOR] global (conf 0.6)
CLAIM: §4 says 'Error tracking: Sentry vs GlitchTip' blocks P13. In fact the mobile DSN is baked into the fleet APK at P2b, D2 already decided Sentry SaaS, and P0 only checks the backend Sentry project, not that the mobile project is live.
EVIDENCE: technician-app/eas.json EXPO_PUBLIC_SENTRY_DSN; O-08 §2 'the APK DSN is already baked and cannot change without a new APK'; G2 D2
CHANGE: Change the row to 'decided (D2): Sentry SaaS; P0 confirms the mobile project still ingests; changing it later requires a new APK'.

--- EXE-24 [MINOR] P10 (conf 0.6)
CLAIM: P10's entry is 'P9a merged', but the graph shows P9b ──► P10, and P9a's fallback can move the decision API into P9b. Without the decision API there are no approved postings to export. Owner inputs also omit the Odoo version (which the column labels depend on), the chart of accounts/tax regime and the customer mapping (G1 §5 Odoo Q5/Q6).
EVIDENCE: plan §2 graph; P9a Size fallback; G1 §5 Odoo (5)(6); P10 Deliverables 'column labels verified against the owner's Odoo version'
CHANGE: Entry: decision API merged (P9a or P9b). Owner inputs add the Odoo version, CoA/journals and partner mapping. The runbook gets click-by-click import steps the owner follows.

--- EXE-25 [MINOR] P13 (conf 0.6)
CLAIM: P13's Done-when needs owner-only inputs that are not listed: the heartbeat service and paging channel, the owner's offline age private key, and a second bucket with a put-only token. 'Monthly restore drill' is a recurring owner chore, not something one session delivers.
EVIDENCE: O-06 'encrypt with age to the owner's offline key'; O-08 §2 dead-man; plan P13 Done when
CHANGE: List these owner inputs. Make the drill a calendar item in RUNBOOK-BACKUPS with the first run recorded in P13.

--- EXE-26 [MINOR] P3 (conf 0.55)
CLAIM: P3 resumes from 'the runbook's numbered steps', but that runbook is P3's own deliverable, so a session cut short before it exists has nothing to resume from. The order matters, e.g. archive-first (O08-F02).
EVIDENCE: plan P3 Resume/Deliverables; O-08 §3 'copy dumps … FIRST'
CHANGE: Commit RUNBOOK-SELFHOST.md (from O-08 §3) first, and tick each step in W0-results.md as it is executed.

--- EXE-27 [MINOR] P7b (conf 0.55)
CLAIM: P7b's Cloudflare rate rule needs the owner in the dashboard, and that is not listed. The plan also omits O-08's constraint that rules answer only 429 with Retry-After and that WAF, Bot Fight and challenges stay off for api. A default challenge returns 403, which parks queued writes. The entry 'P3 merged' is wrong: P3 is an operation, not a PR.
EVIDENCE: O-08 §4 (ii)(iii); plan P7b Entry/Scope
CHANGE: Owner input: Cloudflare dashboard. The rule is scoped to /api/auth/login and answers 429 with Retry-After. Entry: 'P3 done'.

--- EXE-28 [MINOR] P1 (conf 0.5)
CLAIM: P1 says 'Owner inputs: None', but its entry needs Docker Desktop up, and design §8 forbids agents from starting it.
EVIDENCE: design §8 'The owner starts Docker Desktop; agents never start, install or reconfigure it'
CHANGE: Owner input: start Docker Desktop and confirm with `docker info`.

==================== LENS fidelity (design fidelity) — 28 findings, unrefuted blockers beyond cap: 0
SUMMARY: The plan mostly tracks the design notes, but it drops or garbles the drain-critical details. (1) The field-bundle `jobs.outbox.v2` grep was moved to the new APK, so the P1 item O10-F15 and O-10's whole K=no branch appear in no phase. P4 also leaves out O-01 step 0 and would undo G2's 240 h ping ruling by following O-10 F literally. (2) The phone verdict rule (O-01, built in P5a) and the server three-state rule (O-04, built in P6) contradict each other, and the plan lets them land in either order, which brings back O01-F04. (3) The self-host and money phases claim the decisions (G2-D2, O-06's minimum before anything flows to Odoo) but defer or drop their mandatory parts: the dead-man monitor, CSP and Access, the pre-cutover tunnel and XFF tests, the chain over payments, and self-approval refusal. Fixed migration numbers combined with a loose phase order will collide.
PHASES OK: P0, P5b, P5c, P7a, P10, P13

--- FID-1 [BLOCKER] P2b (conf 0.75)
CLAIM: P2b says the bundle is "grepped for the owned domain and `jobs.outbox.v2`", but that is the new build. O-10 A2 greps the bundle pulled from the field phone, which is the only way to settle H14/O10-F15 (a pre-v2 outbox drops queued job writes on the first 401). P0 does not grep the field bundle either, and O10-F15 (P1, status O) is cited by no phase, which contradicts the plan's own §5 coverage claim.
EVIDENCE: O-10 design A2 and the K=NO branch; G2 §2 B O10-F15 (P1/O); G2 §3 H14 row ("bundle grep for jobs.outbox.v2")
CHANGE: Add to P0 deliverables: `adb pull` the field base.apk, grep its bundle for `jobs.outbox.v2` and the API host, and record the v2 yes/no result. Cite O10-F15 in P0 and P4. Keep the new-bundle grep as a separate check that the queue keys did not change.
CHECK: found=true supports=true — O-10 A2 pulls the field APK and greps it for jobs.outbox.v2. G2 lists O10-F15 as P1/O and says H14 needs a bundle grep. The plan's P2b greps only the newly built APK. P0 deliverables list versionCode and cert but no field-bundle grep. O10-F15 appears nowhere in SHIP-PLAN, though §5 claims every P0/P1 item is covered.
REFUTE: refuted=true → major — The facts hold up. P2b line 165 greps only the new APK. O10-F15 appears nowhere in the plan, so the §5 coverage claim is false. But calling it a blocker overstates it. P0's scope already includes "G2 §3 open risks that W0 settles", and H14 is one of those. P0's deliverables also record the installed build's commit, and git history at that commit answers whether the v2 outbox existed. O10-F15 only bites in O-10's K=no branch. With K=yes, the HANG stub means no field phone ever gets a 401 before it is updated. The real gap is that the plan never carries the K=no branch, including its old-secret sign-off. The fix: add the field-bundle grep to P0 deliverables explicitly and cite O10-F15 in P0 and P4. That is a major finding, not a blocker.

--- FID-2 [MAJOR] P4 (conf 0.65)
CLAIM: Neither P4 nor P2b carries O-10's K=no branch. With K=no the old APK drains through a proxy on the old host, each row is retried one by one, the AFTER check uses photos only, the owner decides whether to accept expired old-secret tokens, and only then is the app uninstalled and reinstalled. P2b's done-when ("same package, same signature") and P4's "steps B4–F exactly" both assume K=yes, so a K=no answer from P0 leaves no executable phase.
EVIDENCE: O-10 design 'BRANCH K=NO' (H=yes / H=no); G1 §3 (K, H and R are parameters)
CHANGE: Add a P4 sub-section 'If P0 recorded K=no' that transcribes the K=NO steps: proxy on the old host, row-by-row Retry, photo-only AFTER check, the owner sign-off on old-secret tokens, then reinstall. Make P2b's entry say it applies only when K=yes.
CHECK: found=true supports=true — O-10 design has a BRANCH K=NO section (H=yes: proxy, row-by-row Retry, photo-only AFTER check, owner sign-off for old-secret tokens, then reinstall). G1 §3 says K, H, R are parameters. The plan's P2b done-when says "same package, same signature" and P4 says "B4–F exactly", with no K=no branch anywhere.

--- FID-3 [MAJOR] P4 (conf 0.7)
CLAIM: P4 runs the 55-minute O-01 protocol on the field build "before its update" but leaves out step 0, which turns off FixFlow's per-app Wi-Fi and data first. Without it, opening the app on the field build flushes against the dead host: new pings are dropped and new crossings and punches park. W0 item 1 forbids opening the app for exactly this reason. P4 also does not log the protocol's time window, which O-01 says to log so the test rows can be told apart in the drain.
EVIDENCE: O-01 design ground rules and Step 0; design doc §4.0 item 1; G2 §2 B (S9: 404 drops or parks)
CHANGE: Write into P4: 'run O-01 Step 0 (per-app data off) before opening the field build; record the protocol start and end times in W0-results so its presence and punch rows are marked as test rows in drain_audit; restore the app's network only at step E.'
CHECK: found=true supports=true — O-01 design has Step 0 (per-app data off before opening FixFlow, so syncs fail as kept network errors rather than the dead host's 404, "dropped or parked, S9"). It also says to log the time window for O-10. Design doc §4.0 item 1 forbids opening the app. SHIP-PLAN P4 mentions neither. Minor: S9 is not in G2 §2 B (G2 lists O3-F1/O04-F5 for 404s); it is cited inside O-01.

--- FID-4 [MAJOR] P4 (conf 0.7)
CLAIM: P4 says "ceilings restored" and follows "O-10 B4–F exactly". O-10 F resets the ceilings to 24 / 48 / 48, and B4 says the ping ceiling "stays 48 … a location-privacy invariant". G2 §5 overruled that in favour of 240 h permanent, which P1 ships. Read literally, the step would undo P1 and bring back O04-F12. It would also undo O-04's permanent 336 h device-time value once P6 lands.
EVIDENCE: O-10 B4 and F; G2 §5 ping-ceiling ruling; O-04 design §2 ("Permanent value after the O04-F1 fix: 336")
CHANGE: State the post-window values explicitly in P4: device-time 24 h (336 h if P6 has merged), jobs GPS 48 h, ping 240 h (P1 default). Note that B4's 'ping stays 48' is superseded by G2 §5.
CHECK: found=true supports=true — All cited evidence exists. O-10 F: "ceilings back to 24 / 48 / 48"; B4: ping "stays 48 … location-privacy invariant". G2 line 282 rules 240 h permanent. O-04 §2 gives 336 permanent device-time. P4 says "O-10 B4–F exactly" and "ceilings restored". I did not check whether P1 ships 240.

--- FID-5 [MAJOR] P4 (conf 0.55)
CLAIM: P4 stages the drain window from O-10 B4, which sets FIXFLOW_JOBS_GPS_BACKDATE_CEILING_HOURS = W when the jobs exist. O-04 §2 says to leave it at 48 because it feeds billing; a late arrive sets the billed fuel distance (O6-F13). G2 never ruled on this conflict, and the plan silently takes O-10's side.
EVIDENCE: O-10 design B4 (jobs GPS = W unless R='nothing'); O-04 design §2 ('leave at 48. It feeds billing'); G2 §5 (no ruling); G2 §2 D O6-F13
CHANGE: Record a ruling in P4, or as a P0 owner decision, on the jobs GPS ceiling during the drain. If it is widened, add a P4 check that no closed or billed job's fuel distance changed, by comparing before and after values per job.
CHECK: found=true supports=true — The O-10 and O-04 lines are quoted accurately. O-10 sets the jobs GPS ceiling to W unless R is 'nothing'. O-04 says leave it at 48 because it feeds billing. G2 §5 has no ruling on it. P4 only says "O-10 B4". One error: G2 line 193 says O6-F13 is a mocked arrive setting the billed fuel distance, not a late arrive.

--- FID-6 [MAJOR] P5a (conf 0.75)
CLAIM: P5a pins the phone to "the shared overlap verdict rule with test vectors against `derive.geofence_flags`", which is O-01's rule (confirmed if d − a ≤ r). P6 changes the server to O-04's three-state rule (inside only if d + a ≤ r) with a 100 m ceiling. These two rules disagree. The plan lets P5a and P6 land in either order, so whichever lands second breaks the test vectors and brings back O01-F04: a phone-confirmed indoor arrival becomes server-unknown.
EVIDENCE: O-01.txt O01-F04 FIX 1–2; O-04.txt O04-F9 FIX; G2 §5 (no adjudication); plan §2 diagram (P6 parallel with P5a)
CHANGE: Get a G2-style ruling on one verdict rule before either phase starts. Put it in P6, make P5a's entry require P6 merged, and generate P5a's test vectors from the post-P6 derive function.
CHECK: found=true supports=true — O01-F04 fix (O-01.txt:71-85) sets the rule to confirmed if d−a≤r and says to pin vectors against derive.geofence_flags. O04-F9 fix (O-04.txt:176-) makes inside only if d+a≤r, outside if d−a>r, else None, and lowers the ceiling to 100 m. G2 §5 has no ruling on this. The plan runs P6 parallel to P5a with no ordering. Mild overstatement: the phone's arrive rule would read unknown, not wrong.

--- FID-7 [MAJOR] P5a (conf 0.6)
CLAIM: P5a's done-when says "step-3/step-4 protocol tests now pass". Step 3b/3c separate H1 (OEM swipe kill, blocked restart) from H10b, and P5a fixes neither: OEM onboarding is P5b, and re-arm on `active` only repairs the service when the app is opened (3d). "An indoor arrival notifies" is not a protocol step at all. As written, the gate either cannot pass or only proves 3d.
EVIDENCE: O-01 design Steps 3b–3d, 4a–4d and 'Separation'; O-01 fix order 3 vs 6
CHANGE: Make the P5a gate: 3d (foreground service back within 15 s of opening), 4b–4d (a toggle re-registers the fence without opening the app, or the periodic re-check catches it), plus a defined indoor test (about 40 m from the centre on a Wi-Fi fix, prompt fires, server row agrees). Leave 3b/3c to P5c.
CHECK: found=true supports=true — The plan's P5a done-when quotes as cited. O-01 steps 3b/3c separate H1 from H10b, while 3d tests the foreground service on reopen. Fix order puts F01 re-arm at 3 and F02 OEM onboarding at 6 (P5b). Step 4c is a walk back within 40 m, with no indoor test. The plan's parenthetical lists only 3d/4-style checks, so "cannot pass" is slightly strong.

--- FID-8 [MAJOR] P6 (conf 0.6)
CLAIM: P6 builds only O-04 §1(a), the ping-derived sampler_state. It drops §1(b): heartbeat events plus the `ix_app_event_shop_name_actor_time` index, which O-04 calls "the only way to tell an OS-killed sampler from no network". It also drops O-01's server-side per-tech sampler-health view built from the diagnostics events. P5a ships those events, nothing reads them, and P5c relies on "server-side sampler state (P6)". O-04's index is also numbered 0048, a slot P8 now takes.
EVIDENCE: O-04 design §1(b) and §3 (0048 index); O-01 design 'IN-APP LOGGING … Server side (O-04/H18)'; G2 §2 C O04-F4 (P1)
CHANGE: Add to P6, or to a P6-follow-up gated on P5a: map the O-01 ring event names to O-04's heartbeat names, add the app_event index in the next free migration, and add a per-tech per-day sampler-health read. P5c then cites that read, not only sampler_state.
CHECK: found=true supports=true — O-04 §1(b) has the heartbeat names, the "only way to tell an OS-killed sampler from no network" quote, and index ix_app_event_shop_name_actor_time as migration 0048. O-01 line 91 has the server-side per-tech per-day sampler-health view. G2 lists O04-F4 as P1, and P6 cites it. P6 scope has sampler_state only, with no heartbeat, index or health view. P8 owns 0048. P5c cites "server-side sampler state (P6)". I did not check that P5a ships the events.

--- FID-10 [MAJOR] global (conf 0.7)
CLAIM: Migration numbers are fixed per phase (P6=0047, P8=0048, P9a=0049, P13=0050), but the order is not. P8's entry needs only P7a, which needs only P1, so P8 can be branched before P6 exists, and its 0048 would chain onto a 0047 that is not there. P13 also cites the "O04 design 0049-equivalent" fence index inside a migration numbered 0050.
EVIDENCE: plan §2 diagram and P6/P8/P9a/P13 entries; CLAUDE.md migrations invariant (next free slot 0047); O-04 design §3 numbering
CHANGE: Either add P6 to P8's entry, P8 to P9a's and P9a to P13's, or replace the fixed numbers with 'the next free slot at branch time (check the down_revision chain)'. Give the fence index its own migration and its own deploy, per O-04.
CHECK: found=true supports=true — Plan fixes P6=0047, P8=0048, P9a=0049, P13=0050. Entries: P6 needs P1 (line 285); P7a needs P1 (line 310); P8 needs only P7a (line 351); P9a needs P8 (line 372); P13 needs P3 and P7b (line 448). So P8 can precede P6, and P13 does not require P9a. P13 line 454 cites "O04 design 0049-equivalent"; the O-04 design (line 55) says 0049 as a separate PR/deploy after an audit.

--- FID-11 [MAJOR] P1 (conf 0.65)
CLAIM: P1 handles D2 (seed PINs) with "a deep-health 'default PIN active' check plus set_pin.py". That is only a warning, and login still mints a manager JWT for m1/1234. O-05 asks for a must_rotate flag that refuses tokens. O-06 asks for that, or a seed with no usable hash. G2 §6 says the seed-PIN fix gates the first self-host boot. A warning gates nothing, and P3's procedural rotation is the only control left.
EVIDENCE: O-05.txt O05-02 FIX; O-06.txt O6-F05 FIX; G2 §6 'the dev-secret and seed-PIN fixes gate the first self-host boot'
CHANGE: Keep P1 migration-free but make it refuse: in production, block login (or refuse to boot) for any active account whose hash verifies against a known default PIN. Keep the deep-health check as the visible signal.
CHECK: found=true supports=true — All cited items exist. SHIP-PLAN P1 (lines 109-119) handles D2 with a deep-health default-PIN check plus set_pin.py. O05-02's FIX is a must_rotate flag (migration 0047) that refuses tokens, or a seed with no usable hash. O6-F05's FIX offers a refusing flag or a random seed, and lists the warning as an extra. G2 §6 contains the quoted gating sentence. The plan's P2/P3 rotation is procedural, as the critic says.

--- FID-13 [MAJOR] P2a (conf 0.65)
CLAIM: No phase picks up O-03 step 8 (a location outbox id per tap, O3-F10/O3-F11). Today a stable location outbox id makes a second depart overwrite an unsent depart from an earlier trip. That deletes a queued write, against CLAUDE.md's "the outbox never deletes a write", and it happens during exactly the multi-trip backlog the drain will replay. P2a covers steps 1–5 and 9, P2b covers 6–7, and step 8 falls through.
EVIDENCE: O-03 design step 8; G2 §2 B O3-F10, O3-F11; CLAUDE.md 'The mobile outbox'
CHANGE: Add O-03 step 8 to P2a (or P2b, before the fleet APK v1 build) with its two tests: outbox.test (two departs for one job both kept) and the inTransit merge test.
CHECK: found=true supports=true — O-03 design step 8 exists (location outbox id per tap, with outbox.test and a merge test). G2 lists O3-F10 (stable location id deletes an earlier trip's unsent punch) and O3-F11 (re-tap replaces the depart). SHIP-PLAN P2a scope is steps 1-5 and 9; P2b lists O3-F4/F5/F12/F13. Neither mentions step 8, O3-F10 or O3-F11. The "multi-trip backlog" framing is the critic's inference.

--- FID-14 [MAJOR] P2b (conf 0.6)
CLAIM: P2b drops O-10's ordering and receipt gates. D3 un-parks only after D4's manifest exists (otherwise the BEFORE counts by reason class are wrong), and D4/R6 say the drain waits for a 2xx manifest receipt. P2b also drops D6's login banner and E4's shared-phone sign-in copy (O10-F10: queues drain only under their owner's session), so shared-phone residue causes an AFTER mismatch and halts the fleet (R7).
EVIDENCE: O-10 design D3 ('run after D4'), D4 ('The drain waits for a 2xx receipt'), D6, E4, R6, R7; G2 §2 B O10-F8..F14
CHANGE: Add to P2b's scope: un-park runs after the snapshot is written; the sync gate opens only on a 2xx manifest receipt; the login screen shows the per-tech record counts using E4's wording and walks each tech on the phone through sign-in. Add tests for both gates in manifest.test.
CHECK: found=true supports=true — O-10 design has D3 ("run after D4"), D4 ("drain waits for a 2xx receipt"), D6 (login banner), E4 (shared-phone sign-in copy), R6 and R7. G2 line 152 covers O10-F8..F14, including owner-session draining. P2b cites D1–D7 but lists none of the ordering, receipt-gate or banner items. The link from shared-phone residue to an R7 halt is the critic's inference.

--- FID-15 [MAJOR] P2b (conf 0.55)
CLAIM: P2b's verification ("an install-over test on a phone with seeded queues") does not test the risk D4 was designed for: a headless task restored by MY_PACKAGE_REPLACED draining before the snapshot exists. O-01 also cites #47595 (an app update freezes tracking). Seeded queues with the app idle never exercise either.
EVIDENCE: O-10 design D4 ('A headless task restored by MY_PACKAGE_REPLACED therefore cannot drain first'); O-01 design H11 #52230 note citing #47595
CHANGE: Change the install-over test: the tech is clocked in with the ping task registered and the queues seeded, install with `adb install -r`, and before opening the app check with logcat and the Drain Report that no sync ran before the manifest was written. Then confirm tracking resumes after the update.
CHECK: found=true supports=true — O-10 D4 exists and says the quoted sentence about a MY_PACKAGE_REPLACED-restored headless task not draining first. O-01 H11 notes #52230 cites #47595 (update freezes tracking), and O-01 flagged it for O-10. Plan P2b Verification says only "an install-over test on a phone with seeded queues", with no ping task registered or logcat ordering check. The characterization is accurate.

--- FID-16 [MAJOR] P3 (conf 0.7)
CLAIM: P3 drops the pre-cutover tests that G2 §3 assigns to the self-host phase: cloudflared's X-Forwarded-For behaviour, which decides whether P7b's per-source lock collapses into one bucket, and the HTTP code a stopped tunnel returns, which R3's abort lever depends on. P3 also leaves out O-10 B2's end-to-end selfie PUT (O10-F8: a selfie-upload throw stalls the punch drain) and B6's check of the marker header on the tunnel.
EVIDENCE: G2 §3 'cloudflared's X-Forwarded-For behaviour; the HTTP code a stopped tunnel yields … tests in the self-host phase before cutover'; O-08 §4(v); O-05 design 'Client IP'; O-10 B2, B6, R3
CHANGE: Add to P3's done-when: (1) a stopped-cloudflared `curl -i` shows a non-marker 5xx; (2) the backend logs the client IP seen through the tunnel and it is CF-Connecting-IP; (3) one selfie presign, PUT and commit succeeds; (4) `/api/ops/health` through the tunnel carries `X-FixFlow-Api`.
CHECK: found=true supports=true — G2 §3 line 232 assigns the XFF, stopped-tunnel-code and PoP tests to the self-host phase before cutover. O-08 §4(v) calls the 530/1033 result a hypothesis to test with curl -i. O-05 says last-XFF collapses behind a second proxy. O-10 B2 (selfie PUT, O10-F8), B6 (marker) and R3 (cut tunnel) exist. P3 and SHIP-PLAN omit XFF, stopped-tunnel, selfie PUT and marker checks.

--- FID-17 [MAJOR] P3 (conf 0.65)
CLAIM: P3 claims "the D2 decision" but drops what D2 calls mandatory: the off-box dead-man monitor, which is pushed to P13 ("a month of stable running is nice"). It also drops the Caddy CSP and headers from a node:22 build and Cloudflare Access on app./ops. P7b then says "Caddy CSP/headers already in P3 — verify", so each phase assumes the other covers O05-11. O-08 §3 step 4 (backend gates on postgres:17 before cutover) is likewise pushed to P13.
EVIDENCE: G2 §4 D2 ('An off-box dead-man monitor is mandatory'; Caddy with CSP; app./ops. behind Access); O-08 §1 web service, §2 'Uptime/dead-man', §3 step 4; O-05 design item 6; G2 §2 D O05-11
CHANGE: Move into P3: a minimal off-box heartbeat (host cron with a DB-touching check, pinging an external service), the Caddy CSP and headers from a node:22 build with the font self-hosted, Access on app./ops., and backend gates on postgres:17. Leave the encryption and drill parts of P13 where they are.
CHECK: found=true supports=true — Evidence exists and mostly supports. G2 D2 says dead-man monitor "mandatory", Caddy CSP from node:22 build, app./ops. behind Access. P13 scope holds the dead-man monitor and "CI on Postgres 17". P3 scope lacks those items. P7b says "Caddy CSP/headers already in P3 — verify". Caveats: O-08 calls Access "optional", and P3 cites O-08 §1–§4, which includes step 4.

--- FID-18 [MAJOR] P3 (conf 0.55)
CLAIM: P3 says to restore "per recovery case into Postgres 17 (Appendix C with the schema drop)". Appendix C is a throwaway forensic container that restores as `postgres` into `fixflow_restore`. O-08 §3 owns the real box restore: only postgres runs (the `profiles: ["app"]` gate, so the backend cannot boot first and seed the schema and dispatch_cursor), and ownership is moved to fixflow_app afterwards. P3 also leaves out O-08's deliverables of an encrypted off-box copy of every secret and an export of the Android keystore ("not re-mintable").
EVIDENCE: design Appendix C (separate restore stack); O-08 §3 'Restore (postgres alone…)' and 'ALTER … OWNER'; O-08 §1 'Where secrets live' and the keystore line
CHANGE: Cite O-08 §3 as the restore procedure: postgres-only start, schema drop, restore, ALTER OWNER to fixflow_app, Appendix B, then `--profile app`. Add a deliverable: secrets in a password manager plus a printed recovery sheet, and the keystore exported (P0 or P3).
CHECK: found=true supports=true — Plan line 185 says "restore per recovery case into Postgres 17 (Appendix C with the schema drop)". Appendix C is a throwaway container restoring as postgres into fixflow_restore. O-08 §3 says postgres runs alone, the backend must not boot first, ALTER OWNER follows the restore, and `profiles: ["app"]` gates the backend. O-08 §1 requires an encrypted secrets copy and an exported keystore ("not re-mintable"). P3 mentions none of these; its keystore references (lines 93, 155) are P0 and P2b only.

--- FID-19 [MAJOR] P7b (conf 0.6)
CLAIM: P7b says "roster endpoint requires the app marker or is reduced to names". The marker (`X-FixFlow-Api`) is a response header the server stamps, so requiring it on a request is something no design proposes, and any client can forge it. G2 §5 ruled "no pre-auth roster". P7b also leaves out G2's fifth DoS mitigation, "an ops alert on lock", and does not make the Cloudflare login rule answer 429 with Retry-After, as O-08 §4(iii) requires.
EVIDENCE: G2 §5 login-lock row; O-03 design step 1 (marker is a response header); O-08 §4(ii)–(iii); O-05.txt O05-04 FIX (alert on failed_attempts)
CHANGE: Replace the clause with: 'remove the pre-auth roster (login by typed id), with the matching fleet-APK login change', or, if that is rejected, record a G2-style exception. Add the ops/app_event alert when an account locks, and make the Cloudflare login rule return 429 with Retry-After.
CHECK: found=true supports=true — Evidence is real. G2 §5 lists "no pre-auth roster" and "an ops alert on lock". O-03 step 1 stamps X-FixFlow-Api on responses, so it is a response header. O-08 §4(iii) requires rate rules only as 429 with Retry-After. O05-04 FIX has an alert on failed_attempts. One caveat: O05-03 FIX offers "or require an app/Access header", so a request-side marker was proposed as an alternative, though it is forgeable.

--- FID-20 [MAJOR] P8 (conf 0.6)
CLAIM: P8 implements only part of O-06's 'audit/forensics minimum (what must exist before the pakka-khata flows to Odoo)'. It drops item 5 (one chain over staff_ledger, job_payment create/void and job_bill_revision); P8 anchors only the existing staff_ledger chain, so payments stay without tamper evidence (O6-F08). It also drops item 3 (an append-only approval table that refuses self-approval, O6-F16), item 6 (a telemetry trace and board counts for discards, O6-F14/F15) and the `reason` in void payloads. No other phase picks these up, and P10 is gated only on P9a.
EVIDENCE: O-06 design items 1, 3, 5, 6, 8; G2 §2 D O6-F07/F08/F16 and O6-F14/F15
CHANGE: Add item 5 (extend chain.py to cover payment and bill-revision events), `reason` in the void payload, and item 3's self-approval refusal to P8, or to a P8b that P10 requires. Add item 6's discard telemetry to P2b, which introduces the new pending-media Discard.
CHECK: found=true supports=true — O-06 design items 1,3,5,6,8 exist as cited. G2 §2 lists O6-F07/F08, F14/F15, F16 (F07/F08 rows in G2 §2 D, F16 and F14/F15 as P2). P8 omits payment/bill-revision chain, void `reason` (payload only has payment_id, amount, method), self-approval refusal and discard telemetry. Caveat: P9a's append-only posting_decision partly covers item 3's approval table; self-approval refusal is not mentioned. O6-F16 is a different case.

--- FID-9 [MINOR] P6 (conf 0.5)
CLAIM: O-04 orders 'honest flags to ship before widening' and adds a payroll exclusion: late_sync days stay out of payroll until a manager accepts them. P6 adds the 'accept' action but not that exclusion, and P4 does not depend on P6. Back-filled days can therefore land and reach payroll unflagged. Payroll regeneration (O04-F11) is pushed to P13.
EVIDENCE: O-04 design §2 'Honest flags to ship before widening', 'Order of operations' 1–5, 'Payroll exclusion'
CHANGE: Add to P6's scope: payroll export skips late_sync days until an 'accept' adjustment exists. Either make P4's window close wait for P6 or record which payroll windows to regenerate after P6.

--- FID-12 [MINOR] P1 (conf 0.6)
CLAIM: P1's done-when ("a manual boot with no env fails closed") requires changing `environment: str = "dev"` at config.py:160, because today no env means dev. The deliverables do not list the knock-on edits: Appendix A's gate container, CI, and dev docker-compose all run without FIXFLOW_ENVIRONMENT and would fail. O-06 also suggests requiring a localhost DB for dev. P1 also changes the ping ceiling, but only the CLAUDE.md security section is updated, so the "~48h back" line in its Location section goes stale.
EVIDENCE: backend/app/core/config.py:160,221-231; O-06.txt O6-F01 FIX; design Appendix A docker run (no FIXFLOW_ENVIRONMENT); CLAUDE.md 'Location and privacy'
CHANGE: Add to P1's deliverables: the default-environment change, FIXFLOW_ENVIRONMENT=test in ci.yml, Appendix A and dev compose, and a CLAUDE.md Location-section edit to 240 h citing G2 §5.

--- FID-21 [MINOR] P8 (conf 0.5)
CLAIM: P8 writes job_bill_revision "on every completion upsert". CLAUDE.md makes a byte-identical resubmit an idempotent success (deployed phones send no client_id), so a revision per replayed upsert would fill the history with phantom revisions. O-06 also requires a reason for a post-send negotiate, which P8 leaves out. P8 also drops O-07 0048's separate-deploy items: VALIDATE job_payment_amount_positive (O07-F8) and the recorded_by FK with a later VALIDATE.
EVIDENCE: CLAUDE.md 'The bill freeze'; O-06 design item 2; O-07 design part 6 '0048 (separate deploy …)'
CHANGE: Specify that an idempotent replay writes no revision, and that a reason is required on manager override and on post-send negotiate. List the amount-CHECK VALIDATE and the recorded_by FK as a separate audit-then-deploy step (P8 or P13).

--- FID-22 [MINOR] P9a (conf 0.55)
CLAIM: P9a omits several mechanisms from O-07 part 2. posting.seq is gapless and commit-ordered under pg_advisory_xact_lock. The stager calls verify_ledger_chain first and refuses to stage if it fails. A 'restage' creates a new posting at source_rev+1 rather than editing the row. Approval resolves account_code_<role> and is refused while a role is unmapped, yet the role map is scheduled in P10, so the P9a/P9b gate 'a staged posting can be approved' depends on settings that do not exist yet. Accrual invoice staging at close is also missing from done-when.
EVIDENCE: O-07 design part 2 (posting.seq, stager ledger verify, restage, approve-window, unmapped-role 400); plan P10 'role → account-code settings'
CHANGE: List these in P9a's scope. Move the account_code_* keys into P9a's settings (O07-F14). Add to done-when 'an accrual-basis close stages an invoice; an unmapped role refuses approval'.

--- FID-23 [MINOR] P11 (conf 0.55)
CLAIM: P11 puts the whole transport Protocol behind "only on a Custom plan". O-07 part 7 says to build the Protocol, a fake transport, the attempt log and the halt/lag/rotation alerts with tests regardless, and to write only the Odoo adapter once the plan is confirmed. P9a/P10 do not include them, so a later move to Custom means retrofitting the seam.
EVIDENCE: O-07 design part 7 'Part 4 … Build regardless: the Protocol, a fake transport, the attempt log, and halt/lag/rotation alerts'
CHANGE: Move `core/posting_transport.py`, CsvExportTransport and a fake transport with tests into P10. Keep only OdooJson2Transport and the `erp-push` job in P11.

--- FID-24 [MINOR] P12 (conf 0.65)
CLAIM: P12 (web) lists "L7 wording", but L7 is the mobile `sendPunch` collapsing landed/queued/failed into a boolean, and G2 files it under the O-03 P3 status-surface items. P12 also attributes A3/A4/L3/L7 and T44-web to "(register)", but G2 §2 does not contain them; they come from the HANDOFF and S-06. T44-web-1's second half (Haul offered on a ready visit) is dropped.
EVIDENCE: w1-results/S-06.txt (L7 'sendPunch collapses…', T44-web-1); G2 §2 B O3-F14..F21 row ('L7'); docs/HANDOFF-2026-07-28-open-work.md A3/A4
CHANGE: Move L7 to P2a (engine status) or P2b. Cite HANDOFF §4.1/§4.4 and S-06 as the source for P12's ids. Add T44-web-1's Haul item or mark it as backlog.

--- FID-25 [MINOR] P2b (conf 0.5)
CLAIM: Routing under-tiers P2b's queue-contract work. 'Sonnet for screens and the audit script' leaves the pending-media retry/discard, the stale-row retry advice, and drain_audit.py (whose mismatch halts the fleet, with its subtle job-state matching for kinds without a client_id) to Sonnet. Design §3 says Sonnet is never for outbox-sensitive code. P9b likewise has Sonnet implement the reconciliation read (LEDGER_SIGN, ledger predicates), and P14 has Sonnet re-apply or drop P5b's native background patches.
EVIDENCE: design doc §3 tier guide (Sonnet 'Never for … invariant-sensitive code (outbox, lifecycle, ledger, migrations)'); O-10 E6; O-07 part 5
CHANGE: P2b: Opus implements pendingMedia retry/discard, retryAdvice and drain_audit's matching rules; Sonnet does only the screens. P9b: Opus writes the reconciliation endpoint. P14: Opus owns the patch re-apply or drop.

--- FID-26 [MINOR] P5a (conf 0.4)
CLAIM: O-01 fix-order item 3 combines the F01 re-arm with the #49424 and #52230 patches, but the plan ships the re-arm in v2 and the patches in v3 (P5b). Re-arming on `active` goes through the unguarded startForegroundService→bind path (LocationTaskConsumer.kt:191-219) that #49424 crashes on Android 14+ with a while-in-use grant, so v2 could raise that crash rate before the guard lands.
EVIDENCE: O-01 design fix order 3; O-01 H11 #49424 classification; expo-location LocationTaskConsumer.kt:163-223
CHANGE: Move the #49424 guard patch into P5a with the re-arm, plus an EAS native compile in P5a's done-when. Alternatively, have P5a's done-when check exit-info for 'Starting FGS with type location' crashes on an Android 14+ phone.

--- FID-27 [MINOR] global (conf 0.7)
CLAIM: In P1, "D1 dev-secret" and "D2 seed PINs" collide with G2 §4's D1 (latency path) and D2 (self-host scope). P3 cites "the D2 decision" meaning G2's D2, and P2b's "D1–D7" are O-10's step letters. A cold-started session following "D1" from P1 lands on the latency decision.
EVIDENCE: plan P1 and P3 scope; G2 §4 D1/D2/D3; O-10 design D1–D7
CHANGE: In P1, cite register ids only (O6-F01…, O6-F05…). Write 'G2-D2' and 'O-10 D1–D7' wherever a decision or step is meant.

--- FID-28 [MINOR] P14 (conf 0.45)
CLAIM: P14 adds an "`expo-updates` decision", which no design note or register row proposes. It also conflicts with O-10 D4: the manifest snapshot is written once per versionCode, and an over-the-air JS update keeps the versionCode, so the drain evidence and the standing rule ('nothing ships to a phone before the drain') could be bypassed.
EVIDENCE: O-10 design D4 ('written once per versionCode'); plan §0 standing rules; O-05 design (SDK upgrade for advisories only)
CHANGE: Drop expo-updates from P14, or make it conditional on re-keying the manifest snapshot per bundle id and adding an OTA rule to §0's standing rules.

FAILED LENSES: []
LOGS:
owner executability: 28 findings (22 blocker/major)
one-session fit: 28 findings (24 blocker/major)
dependency order: 24 findings (17 blocker/major)
register coverage: 30 findings (21 blocker/major)
design fidelity: 28 findings (18 blocker/major)
fit: 28 (blockers 1, refuted 0) | order: 24 (blockers 2, refuted 1) | coverage: 30 (blockers 1, refuted 1) | exec: 28 (blockers 3, refuted 2) | fidelity: 28 (blockers 1, refuted 1)
