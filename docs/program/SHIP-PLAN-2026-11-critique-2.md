# Stage-3 verification of SHIP-PLAN-2026-11 v2 (2026-11-01) — adjudicated in the plan §6.2

Raw output of the `ship-plan-v2-verify` workflow (run `wf_c9da77c6-1d4`): five Opus reflection
checkers (one per v1 critique lens, every v1 finding re-verified against v2), three Opus attack
lenses (internal consistency; one-session fit of the v2 splits; owner executability of P0a–P4b),
Sonnet citation checks on every blocker/major. 141 findings: 9 blockers, 76 majors, 56 minors.
The plan v3 was written from this file; §6.2 of the plan records the adjudication.

---

==================== reflect:fit — 6 findings; ok: FIT-1, FIT-2, FIT-4, FIT-5, FIT-8, FIT-9, FIT-11, FIT-12, FIT-13, FIT-14, FIT-16, FIT-17, FIT-19, FIT-20, FIT-21, FIT-22, FIT-23, FIT-24, FIT-25, FIT-26, FIT-27, FIT-28
SUMMARY: I checked all 27 FIT findings in the critique (FIT-1 to FIT-28; the critique has no FIT-22 in sequence, it appears as a minor after FIT-25). 22 are adequately reflected. FIT-5's split is reflected but leaves P2b's Entry without the domain it needs (RFIT-5). Not resolved: FIT-10 and FIT-15, because P4b ('over days') and P5d-1 ('may span a day') still exceed one session. Fixes that introduced new problems: FIT-7's P3c split keeps api. on 503 while requiring latency and health tests that need a backend route; FIT-6's 'skip P2c if K=no' leaves the K=no fresh-install build with no phase to build it; FIT-3's 'one phase in flight' rule contradicts the parallel notes in P1, P2a and P12. FIT-18's narrowing restates a premise the citation check refuted, and no phase ever turns the setting on.

--- RFIT-1 [BLOCKER] P4b / P5d-1 (conf 0.6)
CLAIM: FIT-10 and FIT-15 were accepted, but the phases that replace them still break the one-session constraint. P4b is labelled "owner-run over days" and spans a 7-day window plus late re-opens. P5d-1 says "the session may span a day" and holds a supervised install on every phone plus the ~55 min O-01 protocol for each OEM. A per-row resume table makes these phases resumable, but each one is still several sessions.
EVIDENCE: FIT-10 CLAIM ("P4 cannot be done in one session"); FIT-15 (O-01 protocol about 50–55 min per OEM, tech on shift); v2 P4b heading and Scope; P5d-1 Owner inputs; task hard constraint
CHANGE: Make the repeatable unit the phase. P4b-n is one session per phone (its E1–E6 row, done when the row is filled). P4b-close is one session at T_close (audit query, ceilings, re-seed). P5d-1 becomes P5d-1-install-n (a batch of phones per session) and P5d-1-OEM-n (one OEM's protocol per session), with T0 taken at the last one. §3 should list them as repeatable phases.
CHECK: found=true supports=true — FIT-10 and FIT-15 exist as cited. v2 P4b is headed "owner-run over days" with a 7-day window, late re-opens and a per-row Resume. P5d-1 says "the session may span a day", runs the 55 min protocol per OEM, and is one session. Standing rule §0 says one phase per session. §3 has no repeatable-phase concept. The gap is real.

--- RFIT-2 [MAJOR] P3c (conf 0.6)
CLAIM: FIT-7 split P3 into a/b/c, and P3c now contradicts itself. Step 1 and the Done-when keep `api.` on the 503 responder ("api. still answers 503 to a phone"). Yet step 3 measures latency to /api/ops/health, a GET list and a POST from the owner's phone, and test 2(c) checks the marker on /api/ops/health "through the tunnel". No route to the backend exists while api. is 503 and app. only serves the web build (P3a routes api. directly to the backend), so neither test can run.
EVIDENCE: v2 P3c Scope 1, 2(c), 3 and Done-when; P3a compose bullet; O-08 §3 line 55 (smoke via app., then flip api.); FIT-7 CHANGE
CHANGE: Add to P3c step 1 a temporary preflight hostname to backend:8000 behind Cloudflare Access, used with a service-token header from Termux. Run 2(c) and the latency test through it. Delete it before B6 and record the deletion in W0-results. Alternatively, move the latency test to P4a between B6 and the pilot install, and move the VPS fallback decision with it.
CHECK: found=true supports=true — P3c step 1 and Done-when keep api. on the 503 responder until P4a B6. Step 3 (latency to /api/ops/health, GET, POST from a phone) and 2(c) need a backend route. P3a/O-08 route only api. to backend:8000; app. goes to web:80. The plan has no preflight hostname or service-token route.

--- RFIT-3 [MAJOR] P2c / §2 branch box / P4b (conf 0.65)
CLAIM: FIT-6 (narrowed) was reflected as "If K=no, skip" P2c. That removes the only phase that runs `eas build --profile fleet`. The K=no branch then says "fresh install of the fleet build" (P4b; §2 "P2c's code still ships as the fresh install"), but no phase builds it, greps the bundle or test-installs it. FIT-6 asked for P2c to be replaced by the K=no branch, not dropped without a replacement.
EVIDENCE: v2 P2c Entry; §2 K=no,H=yes bullet; P4b K=no line; O-10 BRANCH K=NO ("uninstall and install the new build (new cert)"); FIT-6 CHANGE
CHANGE: Under K=no, P2c still runs: the build is submitted and its id recorded, then the bundle grep. It skips the cert-equality and install-over checks and instead does a fresh install on the spare phone with the Drain Report rendering, with per-app network off. Its Done-when then reads "build id recorded; fresh install renders". P4a's Entry becomes "P2c done (either branch)".
CHECK: found=true supports=true — The v2 text has the gap. P2c is the only phase that runs the v1 `eas build --profile fleet`, and P2c's Entry says "If K=no, skip". P2b says "no build", and the later fleet builds are v2 (P5c) and P14. Yet the §2 box and P4b still require a "fresh install of the fleet build", with no phase to build, grep or test-install it. v2 §6 says FIT-6 was accepted "in part"; the critique's CHANGE had P2c replaced by the O-10 K=no branch. O-10 BRANCH K=NO does say "install the new build (new cert)".

--- RFIT-4 [MAJOR] §0 Sessions vs P1, P12, P4b (conf 0.55)
CLAIM: FIT-3 is reflected as an absolute rule: "One phase per session, one phase in flight at a time on this machine". Other phases contradict it. P1 says "Runs in parallel with P2a", P2a says "parallel with P1", and P12 says "Parallel with P5–P7". Read literally, the rule also freezes all code work for the whole multi-day P4b window. The conflict FIT-3 identified was only between Docker gate runs.
EVIDENCE: FIT-3 CLAIM/CHANGE (serialise backend gate runs); v2 §0 Sessions; P1 Entry; P2a Entry; P12 Entry; P4b "over days"
CHANGE: Reword §0: "At most one session running backend Docker gates (design Appendix A) at a time on this machine; mobile and web phases and owner operations phases may run alongside one." Keep the parallel notes in P1, P2a and P12 as they are.
CHECK: found=true supports=true — FIT-3 (critique line 36) concerns only Docker gate runs killing each other via fixed container names. v2 §0 line 18 states "One phase per session, one phase in flight at a time on this machine" as an absolute rule. P1 (line 202) and P2a (line 239) say "parallel", and P12 (line 801) says "Parallel with P5–P7". P4b is owner-run over days (line 456). No other standing rule reconciles these.

--- RFIT-5 [MINOR] P2b Entry (conf 0.55)
CLAIM: FIT-5's split moved "domain in DNS (P0b)" into P2c's Entry, but P2b still bakes `EXPO_PUBLIC_API_URL=https://api.<domain>` (D1), and its Done-when requires the bundle grep to show "the owned domain". P2b's Entry is only "P2a merged", and §4 lists the domain as blocking P2c and P3a, not P2b.
EVIDENCE: v2 P2b Scope D1 and Done-when; P2c Entry; §4 Domain row
CHANGE: Change P2b's Entry to "P2a merged; the domain name decided (P0b; DNS need not resolve yet)". Add P2b to the Blocks column of §4's Domain row.

--- RFIT-6 [MINOR] §6 FIT-18 narrowing / P7a / §5 (conf 0.5)
CLAIM: The narrowing reason ("O05-06 is a contract change for the fleet APK") is the premise the citation check rejected (supports=false; the O-05 analyst tagged it apk=no). Gating the setting on "the v2 APK fleet-wide" adds nothing either way: P5a and P5b contain no change that adapts the job list to minimised fields (JobsListScreen.tsx:53 renders customer_address). And no phase ever switches the setting on, even though §5 says "on after P5d-1".
EVIDENCE: critique FIT-18 CHECK; technician-app/src/features/jobs/JobsListScreen.tsx:53; v2 P7a O05-06 bullet; §4 PII row; §5 O05-06 row
CHANGE: Restate the reason as "the list shows addresses and phones that techs use before claiming; minimising them is a UX/policy change". Add a scope item to P5b ("job list renders minimised unclaimed rows"). Add to P5d-1's Done-when: "PII-minimisation setting turned on; recorded".

==================== reflect:order — 9 findings; ok: DEP-2, DEP-5, DEP-6, DEP-7, DEP-8, DEP-9, DEP-11, DEP-15, DEP-17, DEP-19, DEP-20, DEP-21, DEP-23, DEP-24
SUMMARY: I checked all 24 DEP findings. 14 are adequately reflected. The other 10 have gaps. P3c keeps api. on the 503 responder yet runs XFF, health and latency tests through the tunnel (DEP-4/16). P5a's entry names P2c, a build phase skipped under K=no, instead of P2b (DEP-14). The K=no branch builds no fleet APK, contradicts standing rule 1's 'never uninstall', and drops O-10 B2's old-secret rule (DEP-3). P13d re-bundles the fence index with two VALIDATEs that have no audit (DEP-12). P5a's native patches have no compile gate before the pilot session (DEP-13). Four are minor: the graph and the P10 entries still disagree (DEP-18), P3b's dump wording is stale (DEP-1), drain_audit has no test-window input (DEP-22), and §6 misattributes DEP-10's evidence while P7b-2 and P13a lack 'deploy after T_close'.

--- R-DEP-4 [MAJOR] P3c (conf 0.7)
CLAIM: The fix for DEP-4 and DEP-16 contradicts itself. P3c keeps api.<domain> on the 503 maintenance responder ('api. still answers 503 to a phone'), yet it also requires tests that only work if the tunnel routes api. to the backend: (a) a forged XFF read by `_client_ip`, (c) /api/ops/health through the tunnel carrying the marker, and step 3's latency run to a GET list and a POST. P3a routes api. straight to backend:8000, and app. sits behind Access and Caddy, so it is not a single-hop stand-in.
EVIDENCE: DEP-4 change ('smoked via localhost or app.<domain>'); DEP-16 (XFF test must go through the real single-hop path); O-08 §3 line 41/55; P3a 'api. routes directly to the backend'; P3c steps 1-3 and Done-when
CHANGE: P3c step 1: add a temporary test hostname behind Cloudflare Access (e.g. api-test.<domain>) that maps to backend:8000 on the same single hop. Run tests (a), (c) and the latency run against it, and delete it before P4a B6. Or state that these tests run in P4a between B5 and B6.
CHECK: found=true supports=true — P3c step 1 puts api. on the 503 responder and Done-when requires it still answers 503. Tests (a), (c) and the GET/POST latency run need api. routed to the backend. P3a routes api. directly to the backend and publishes no ports, and app. goes through Caddy behind Access. Nothing in the plan supplies another single-hop path. The contradiction is real.

--- R-DEP-14 [MAJOR] P5a (conf 0.75)
CLAIM: P5a's entry, 'P2c merged (the fleet profile)', points at the wrong phase. The fleet profile is P2b's code. P2c is a build-and-install phase with nothing to merge, and it is skipped when K=no, so under K=no P5a can never start. The entry also adds 'P4a's protocol ranking read', but the §2 graph draws only P6a ──► P5a, with no edge from P4a or P2c.
EVIDENCE: DEP-14 change ('code and build after P2b merges … fix the graph line'); P2c Entry 'If K=no, skip'; P2b D1 owns the fleet profile; §2 line 83
CHANGE: P5a Entry: 'P2b merged (fleet profile); P6a merged; P4a protocol findings recorded in W0-results'. Add P2b→P5a and P4a→P5a edges to §2.
CHECK: found=true supports=true — v2 line 479 gives P5a Entry as "P2c merged (the fleet profile); P6a merged; P4a's protocol ranking read". P2b (line 110, 267) is titled "Drain tooling and fleet profile". P2c (line 310-312) is a build phase, skipped if K=no. The §2 graph (line 83) draws only P6a ──► P5a, with no P2c or P4a edge. DEP-14's change reads "after P2b merges … fix the graph line".

--- R-DEP-3 [MAJOR] §2 branch box / standing rule 1 / P3b / P4b (conf 0.7)
CLAIM: The K=no branch box (from DEP-3) is incomplete, and it contradicts a standing rule. (1) Standing rule 1 says 'never an uninstall', but the K=no branch uninstalls and installs fresh. (2) P2c is skipped under K=no, so no phase builds or verifies the fleet APK that P4b's 'fresh install of the fleet build' needs. (3) P3b step 2 always generates a new JWT secret, with no carve-out for O-10 B2's 'keep the old one only in K=no/H=yes'. The 'accept expired old-secret tokens on write routes' option the owner signs off in P4b has no implementing phase, and standing rule 3 freezes the drain image to P1.
EVIDENCE: DEP-3 (evidence O-10 B2, BRANCH K=NO); O-10 line 22, 96, 100; v2 standing rules 1 and 3; P2c Entry; P3b step 2; P4b K=no line
CHANGE: Standing rule 1: change it to 'never an uninstall when K=yes'. Branch box K=no: 'P2c runs without the install-over and cert-match steps (build, bundle grep, versionCode only)'. P3b step 2: 'K=no & H=yes: recover the old Railway secret and keep it'. Either name a P1 addendum implementing the old-secret acceptance as part of the drain image, or drop that option.
CHECK: found=true supports=true — O-10 B2 keeps the old secret in K=no/H=yes. The O-10 K=no branch has the "accept expired old-secret tokens" option. v2 matches the claim on each point. Rule 1 says "never an uninstall", but the branch box and P4b K=no uninstall. P2c is skipped for K=no and builds nothing. P3b step 2 always generates a new secret. No phase implements old-secret acceptance, and rule 3 limits the drain image to P1.

--- R-DEP-12 [MAJOR] P13d / P6b (conf 0.65)
CLAIM: The fix for DEP-12 re-bundles. P13d puts the fence index in one migration and deploy with VALIDATE of job_payment_amount_positive and the recorded_by FK. Its entry demands 'no duplicate active fences and no orphans', but the only audit script (P6b) covers active fences only. Nothing checks for amount ≤ 0 poison rows, which O-07 expects to exist under the NOT VALID CHECK, or for recorded_by orphans. A failing VALIDATE fails start.sh at boot and the container restart-loops, which is the outage DEP-12 described.
EVIDENCE: DEP-12 (O-08 §6 restart-loop; CLAUDE.md start.sh); O-07 line 42 (poison rows amount ≤ 0, O07-F8) and line 82 (recorded_by VALIDATE 'after an orphan audit'); P6b 'one-active-fence audit script'; P13d Entry
CHANGE: Extend P6b's audit script to count job_payment rows with amount ≤ 0 and recorded_by orphans. In P13d, state the remediation (a forward data fix, or leave that constraint NOT VALID) when the count is non-zero. Ship each constraint as its own migration so one failure cannot block the others.
CHECK: found=true supports=true — P13d is "one migration; separate deploy" holding the fence index plus VALIDATE of job_payment_amount_positive and the recorded_by FK. Its entry says only "no duplicate active fences and no orphans". P6b's audit script is described solely as the one-active-fence audit. O-07 line 42 expects amount ≤ 0 poison rows, and line 82 wants an orphan audit before the recorded_by VALIDATE. Nowhere in the plan is a payment audit or remediation stated.

--- R-DEP-13 [MAJOR] P5a / P5c (conf 0.5)
CLAIM: DEP-13 asked for the #49424/#52230 patches to move into P5a 'with an EAS native-compile gate'. The patches moved, but no gate came with them. P5a's Done-when is typecheck, Jest and expo export, and P5b says 'Native compile is P5c's build'. The first native compile of two PRs of patch-package native patches therefore happens in P5c, with the pilot tech on shift. A gradle break found there costs that field session and sends the work back into already-merged code.
EVIDENCE: DEP-13 change ('with an EAS native-compile gate'); CLAUDE.md 'expo export … does NOT catch native/Gradle compile breaks'; P5a Done-when; P5b Done-when; P5c Entry
CHANGE: P5a Done-when: add 'eas build --profile fleet compiles (build id recorded; not installed)'. Or add a P5c entry condition: 'v2 build green before the pilot tech is scheduled'.
CHECK: found=true supports=true — DEP-13's change does say "with an EAS native-compile gate". The patches are now in P5a, whose Done-when is typecheck, Jest, expo export and CI. P5b says "Native compile is P5c's build." P5c, with the pilot tech on shift, is the first fleet build after the patches. P2c's compile gate covers the v1 build only. Searching "compile" and "gradle" in the plan turned up no other gate.

--- R-DEP-18 [MINOR] §2 / P10a / P10b (conf 0.6)
CLAIM: The graph and the entries still disagree. §2 draws P9b ──► P10a, while P10a's entry is 'P9a-2 merged'. P10b's rehearsal also needs postings the owner has approved, but its entry names only P10a deployed. The approval UI (P9b) is not required, so the owner would have to approve through the raw API.
EVIDENCE: DEP-18 change ('make §2 match'); §2 line 86; P10a Entry; P10b Entry; O-07 §3 (only approved rows export)
CHANGE: Redraw §2 as P9a-2 → P9b and P9a-2 → P10a. P10b Entry: add 'P9b deployed; one window's postings approved in the UI'.

--- R-DEP-1 [MINOR] P3b (conf 0.6)
CLAIM: P0a item 2 makes the Supabase dump a same-day MUST. P3b's Size line still reads 'case (a) with a dump still to take is the long version', which is the exact text the DEP-1 refuter singled out as implying the dump waits for P3.
EVIDENCE: DEP-1 refuter note (P3 sizing text reads as if the dump waits); v2 P0a item 2; P3b Size
CHANGE: P3b Size: 'case (a), restoring from the P0a dump, is the long version'. Or delete the clause.

--- R-DEP-22 [MINOR] P4a / P2b (conf 0.5)
CLAIM: P4a says the protocol window's presence and punch rows 'are marked as test rows by drain_audit.py'. P2b specifies drain_audit.py as read-only, comparing a manifest with server rows since T_open, and gives it no test-window input or separate reporting. The mechanism P4a relies on is therefore never built.
EVIDENCE: DEP-22 change; P2b drain_audit bullet and Deliverables; P4a step 1
CHANGE: P2b: drain_audit.py takes '--test-window START,END' and reports rows in that window separately, read-only. Add a pytest case for it.

--- R-DEP-10 [MINOR] §6 / P7b-2 / P13a (conf 0.55)
CLAIM: §6's reason for narrowing DEP-10 says 'the refuter found no evidence'. No refuter ran on DEP-10; the finding came from the citation check (supports=false). Separately, P7b-2 changes media upload acceptance (reservation caps, 413 commit) that the pending-media drain hits, and P13a changes start.sh. Their entries (P3c done; P7b-2 merged) carry no 'deploy after T_close' clause, unlike P6a and P7a, so a session could deploy them mid-window.
EVIDENCE: Critique DEP-10 CHECK supports=false (no REFUTE line); standing rule 3; P7b-2 Entry/Done-when; P13a Entry
CHANGE: In §6, say 'the citation check found no evidence'. Add 'deploy after T_close (standing rule 3)' to P7b-2 and P13a, as P6a and P7a have.

==================== reflect:coverage — 8 findings; ok: CMP-2, CMP-4, CMP-5, CMP-6, CMP-8, CMP-9, CMP-10, CMP-12, CMP-13, CMP-14, CMP-16, CMP-19, CMP-20, CMP-21, CMP-22, CMP-23, CMP-24, CMP-26, CMP-27, CMP-28, CMP-29, CMP-30
SUMMARY: I checked all 30 coverage findings. 22 are adequately reflected in v2. The CMP-16 narrowing holds: O-04 says late_sync is computable without a migration, and P6b regenerates the drain payroll. Eight are not resolved. CMP-1: the service still allows 4-digit tech PINs. CMP-17: the detail lock breaks the field APK's view of unclaimed jobs, and nothing turns the PII setting on. CMP-3: the old-secret sign-off comes after the proxy is on and has no implementation. CMP-18: A4, a P0 double-charge, is unranked and not fixed before P4a's cash entry. CMP-15: the retry-advice constant is wrong between T_close and P6b. CMP-11, CMP-7 and CMP-25 have smaller gaps: an unstated D2 deferral, missing O-08 owner parameters, and a P0a pointer to an item that does not exist.

--- CMP-1-R [MAJOR] P1 / P7b-1 (conf 0.7)
CLAIM: The 6-digit minimum is put only in the new `backend/scripts/set_pin.py`. The service policy that the manager's in-app set_pin uses still allows 4 digits for technicians. CLAUDE.md names that path as the way to clear a lock, so after P3b a 4-digit PIN can come back. P7b-1's entry, 'every account on a ≥ 6-digit PIN (P3b)', is therefore only true at the moment P3b checks it.
EVIDENCE: backend/app/features/identity/service.py:31 `MIN_PIN_DIGITS_TECH = 4`, applied in `_check_pin_policy` (:160-165) for router.py:108 set_pin. G2 §5 calls for '6-digit technician PINs on the next `set_pin`'. Plan P1, line 213: the script 'enforces a 6-digit minimum'. CLAUDE.md Security: 'a manager clears a tech's lock via set_pin'.
CHANGE: P1 scope: raise `MIN_PIN_DIGITS_TECH` to 6 in identity/service.py, so the API and the script share one policy, and add a test that set_pin rejects a 5-digit technician PIN. P7b-1 entry: 'no active account holds a PIN shorter than 6 digits (deep-health check)'.
CHECK: found=true supports=true — service.py:31 has MIN_PIN_DIGITS_TECH = 4, used in _check_pin_policy (:160-165) for the in-app set_pin route. The plan puts the 6-digit minimum only in the new set_pin.py script (line 213). P7b-1 entry (line 661) requires every account on a ≥6-digit PIN, but no P1 item changes the API policy. The gap is real.

--- CMP-17-R [MAJOR] P7a (conf 0.7)
CLAIM: P7a now puts `require_job_actor` (assigned tech or manager) on `GET /api/jobs/{id}`. That breaks the deployed APK's Available Work flow: a tech taps an unassigned job and the detail screen fetches it before any claim. The critic asked for a minimised detail on unclaimed jobs, not a 403. Separately, no phase ever switches on the per-shop PII setting, so O05-06 (P1) never actually closes.
EVIDENCE: technician-app/src/features/jobs/JobsListScreen.tsx:170,222-225 opens JobDetail for `available` jobs. JobDetailScreen.tsx:168 calls `jobsApi.get(id)`. Plan P7a lines 637-640 and 646-648. §4: 'off until the v2 APK is fleet-wide, then on', with no owning phase. FIT-18 narrowing.
CHANGE: P7a: an unclaimed job's detail returns a minimised JobDetail to any tech, and another tech's claimed job returns 403. Add 'open an unclaimed job's detail' to the field-APK request replay. P7b-1 (entry already requires v2 fleet-wide): turn on the PII setting, with Done-when 'setting on; a tech list read of an unclaimed job returns no PII'.
CHECK: found=true supports=true — P7a (lines 637-640) puts require_job_actor on GET /api/jobs/{id}. JobsListScreen.tsx lists unassigned jobs as available, with open() at line 170 and onPress at 222-225. JobDetailScreen.tsx:168 calls jobsApi.get(id), so a tech's tap on an unclaimed job would hit a 403. The replay starts at claim and never opens unclaimed detail. Line 908 says the PII setting is "on after P5d-1" but no phase, including P5d-1 and P7b-1, switches it on.

--- CMP-3-R [MAJOR] §2 box / P3b / P4a / P4b (conf 0.6)
CLAIM: The O10-F15 branch (K=no, bundle without v2) is now written down, but the owner's sign-off on old-secret tokens is placed in P4b, after P4a has already turned on the proxy for the pilot. Once the proxy is on, a pre-v2 outbox drops its writes on the first 401. If the owner says yes, there is also nothing to act on: no phase builds old-secret token acceptance (standing rule 3 limits the drain image to P1 plus P3 infrastructure), P3b step 2 only generates a new secret, and §4 has no row for this decision.
EVIDENCE: O-10 design 'BRANCH K=NO' (photograph first, then sign off). O-10 B2: 'Keep the old one only in the K=no/H=yes branch'. Plan §2 box, P4a step 3, P4b ('owner's signed decision'), P3b step 2, standing rule 3.
CHANGE: Add a §4 row 'accept old-secret tokens on write routes for the window (K=no and v2=no only)' that blocks P3b, default 'no: photograph and declare the loss'. If yes: P1 adds a settings-gated legacy-secret verifier, off by default, and P3b step 2 keeps the recovered old secret. The P4a entry requires the decision to be recorded.
CHECK: found=true supports=true — O-10 'BRANCH K=NO' confirms pre-v2 writes drop on first 401 and the owner sign-off option; B2 keeps the old secret only in K=no/H=yes. The plan puts the sign-off in P4b (line 468) after P4a step 3 enables the proxy. P3b step 2 only generates a secret, rule 3 limits the drain image, and §4 has no row for it.

--- CMP-18-R [MAJOR] P12 / §5 addenda / P4a (conf 0.6)
CLAIM: The narrowing admits A3, A4 and the T44 ids as addenda but gives them no severity, which the critic's fix required. A4 is a HANDOFF §4.1 P0 that is still live: a fresh client_id is minted per attempt, so a retry double-charges. P12 is only 'parallel with P5–P7', yet P4a step 5 has the manager entering parked cash residue through that same web payment path.
EVIDENCE: docs/HANDOFF-2026-07-28-open-work.md §4.1 A4. src/app/providers/AppContext.jsx:319 still calls `crypto.randomUUID()` inside logPayment. Plan P4a step 5 'entered by the manager (cash first)'; P12 entry 'P3c done. Parallel with P5–P7'; §5 addenda have no severity column.
CHANGE: §5 addenda: give each a severity, with A4 = P0 (HANDOFF §4.1). Split A4 into its own small web PR (Opus) that must be merged and deployed before P4a; P4a entry names it. Leave the rest of P12 where it is.
CHECK: found=true supports=true — Evidence exists: HANDOFF §4.1 (headed "P0 — live today") lists A4, and AppContext.jsx:319 still calls crypto.randomUUID() inside logPayment. The plan's §5 addenda line (921) lists A3/A4 with no severity. P12 is "Parallel with P5–P7", after P3c. P4a step 5 has the manager enter parked residue, cash first, but names no entry path, so the web payment path is an inference.

--- CMP-15-R [MAJOR] P2b / P4b (conf 0.5)
CLAIM: P2b bakes retry advice into fleet APK v1 using 'the post-P1/P6 ceilings read from one shared constant'. The server's punch ceiling changes by stage: W during the window, 24 h from T_close until P6b deploys, then 336 h. In the T_close→P6b interval the phone treats rows 24–336 h old as not late, so a Retry lands them on today. That is O3-F4 (P1) reopened for as long as P6b, a Large phase, takes. P2b's Done-when also has no late-prompt check.
EVIDENCE: O-03 design step 6: `retryAdvice(item, now, ceilingH)`. Plan P2b step 6; P4b 'device_time 24 h (336 h once P6b is deployed)'; P6b 'ceiling 336 h permanent'. attendance/service.py:117 default 24 h.
CHANGE: P4b: at T_close set the device_time ceiling to 336 h, not 24 h, so the server matches the constant baked in v1. P6b's retroactive late_sync and payroll regeneration then cover [T_close, P6b deploy] as well as the drain windows. P2b Done-when: a parked row older than the constant shows the late prompt before Retry.
CHECK: found=true supports=true — Evidence exists: O-03 step 6 retryAdvice(item, now, ceilingH); service.py:117 default 24 h. v2 P4b restores device_time to 24 h until P6b deploys, then 336 h; P6b says 336 h permanent. P2b bakes one shared constant into the APK, with no value stated and no late-prompt Done-when (only retryAdvice.test boundaries). No other plan text covers the T_close to P6b interval.

--- CMP-11-R [MINOR] P3c / P13b (conf 0.6)
CLAIM: Access and the heartbeat are now in P3. The critic's third ask was to record against G2-D2 why age encryption and the put-only token are deferred, and that is not done. P3c step 7 turns on nightly backups as plaintext dumps under the read-write R2 credential (O6-F06), and they stay that way until P13b, which comes after P7b-2 and has no date.
EVIDENCE: G2 §4 D2: backups 'encrypted with age, under a put-only token'. Plan P3c step 7; P13b entry 'P13a'; CMP-11 CHANGE 'Note the age/put-only deferral to P13 explicitly against D2'.
CHANGE: In P3c, add one line: 'Backups are plaintext and deletable with the app credential until P13b (O6-F06, a G2-D2 deviation accepted by the owner in §4)'. Add a §4 row for that acceptance, or move the age encryption alone into P3a.

--- CMP-7-R [MINOR] §4 (conf 0.6)
CLAIM: The new §4 rows still leave out three of the O-08 §7 owner parameters, including two the critic named. P10 (R2 retention and the 10 GB media cap) and P11 (second-provider backup target) have no row, and neither does P12 (maintenance window outside 02:00–04:00). P13b's 'lifecycle retention' and 'separate bucket' have no default to build to.
EVIDENCE: w2/O-08-design.md lines 96-98 (P10, P11, P12). CMP-7 CLAIM names 'P10 retention, P11 second-provider copy'. Plan §4 table, P13b scope.
CHANGE: Add §4 rows: 'R2 retention / media cap', blocks P13b, default 30 days for dumps and media uncapped with an alert at 8 GB; 'Second-provider backup copy', blocks P13b, default none (recorded); 'Maintenance window', blocks P3a runbook, default outside 02:00–04:00.

--- CMP-25-R [MINOR] P1 backlog / P0a (conf 0.6)
CLAIM: P1's backlog line says 'O05-15, O05-17 (committed-key console restrictions: owner action, P0a item 10)'. P0a item 10 is the tools-and-access checklist and contains no key-restriction step. O05-15 is a different row (the manual-send claim that is flush-only), not a key item. O-05 rates the committed keys as live exposure today, so the critic routed O05-17 to P0, and in practice it lands in no phase.
EVIDENCE: Plan P1 line 233; P0a item 10 (line 171). w2/O-05-design.md line 3 ('live exposure ... the committed client keys (O05-17)') and item 10. G2 §2 D row 'O05-14..F18'. CMP-25 CHANGE 'O05-17 → P0'.
CHANGE: Add P0a item 13: 'Restrict the committed Maps/Firebase/Sentry keys in each console (package name + SHA-1); record done per key (O05-17)'. Move O05-15 to the backlog line of the phase that owns customer_messaging (P7a), with its correct description.

==================== reflect:exec — 12 findings; ok: EXE-1, EXE-4, EXE-6, EXE-7, EXE-8, EXE-10, EXE-11, EXE-12, EXE-14, EXE-15, EXE-19, EXE-21, EXE-22, EXE-23, EXE-25, EXE-26, EXE-27, EXE-28
SUMMARY: All 28 exec findings checked. 18 are adequately reflected. The K=no branch fix for EXE-3 is incomplete in three ways. First, P4a's Done-when still requires a manifest match, which contradicts §2's photos-only AFTER check. Second, old-secret token acceptance has no code and no source for the old secret. Third, under K=no no phase builds the fresh-install APK, and P5a's entry 'P2c merged' can never be met. P5d-1 admits it 'may span a day', which breaks the one-session rule. P3c measures latency through a route it keeps on 503. The default email anchor has no sender. P14 builds never reach the fleet. Minor findings: EXE-2 (dump still deferrable), EXE-9 (narrowing reason partly untrue), EXE-5 (railway CLI), EXE-18 (kill rate), EXE-24 (Odoo version timing).

--- EXE-3-r1 [BLOCKER] P4a / §2 branch box (conf 0.7)
CLAIM: The K=no branch was added to §2, but P4a's scope and Done-when still apply only to K=yes. The two disagree on a fact the session acts on: §2 says 'the AFTER check is photos-only', while P4a requires 'AFTER matches the manifest' and an install-over with a logcat manifest receipt. The old field APK writes no manifest (O-10 D4 is fleet-build only), so under K=no P4a can never close.
EVIDENCE: EXE-3 (refuter: blocker stands; CHANGE 'make the Done-when conditional on K'); w2/O-10-design.md BRANCH K=NO 'The AFTER check runs against the photos only'; v2 P4a step 4 and Done-when; §2 'K=no, H=yes … AFTER check is photos-only'
CHANGE: Write P4a's step 4 and its Done-when per branch. K=yes: the manifest audit. K=no/H=yes: proxy at B6, Retry row by row, failed creates transcribed, AFTER audit against the A3 photos. K=no/H=no: photos transcribed and the loss declared. Do the same for P4b's per-phone row columns.
CHECK: found=true supports=true — §2 box says K=no/H=yes AFTER check is photos-only, matching O-10 BRANCH K=NO. P4a step 4 and Done-when ('AFTER matches the manifest', install-over with logcat manifest receipt, R7 manifest mismatch) are written only for K=yes. P4a's K=no/B6 mention covers just the proxy. P4b alone has a K=no line. The disagreement stands.

--- EXE-17-r1 [BLOCKER] P5d-1 (conf 0.65)
CLAIM: EXE-17's sizing point is not fixed: P5d-1 still holds every fleet install plus O-01 steps 1–4 (about 55 min each, tech on shift) for each OEM, and says outright that 'the session may span a day'. That breaks the one-session constraint. P14-final also re-runs the P5c gate plus a per-OEM spot check with no owner inputs listed (pilot tech, adb laptop).
EVIDENCE: EXE-17 (N×~50 min; split into protocol runs and review); w2/O-01-design.md steps 3–4 (15 + 20 min, tech on duty); v2 P5d-1 Owner inputs 'the session may span a day'; P14-final has no Owner inputs line
CHANGE: Make P5d-1 an owner-run per-phone table, resumable row by row like P4b, with each per-OEM protocol run as its own sub-session row (P5d-1-<OEM>) and T0 set when the last OEM row is filled. Add the owner inputs to P14-final: pilot tech on shift, adb laptop.
CHECK: found=true supports=true — P5d-1 is headed "one session" yet its scope runs fleet installs plus O-01 steps 1–4 per OEM with the tech on shift, and its Owner inputs say "the session may span a day". O-01 describes about 55 min per phone, with steps 3–4 at 15 and 20 min. P14-n has no Owner inputs line; P14-final names no pilot tech or adb laptop. EXE-17 is cited.

--- EXE-3-r2 [MAJOR] P4b / P0a item 4 / P1 (conf 0.6)
CLAIM: P4b lets the owner sign off on 'old-secret tokens' (O10-F15), but no phase can carry that out. Accepting expired tokens signed with the old secret needs backend code (an old-secret verifier on write routes, limited to the window), and the old JWT secret has to come from the Railway env. P1 does not build that code, standing rule 3 freezes the drain image at P1, and P0a item 4 does not record the old secret.
EVIDENCE: w2/O-10-design.md BRANCH K=NO 'under explicit owner sign-off, accept expired tokens signed with the old secret on write routes for the window'; v2 standing rule 3; P0a item 4 (state, H, billing only); P3b step 2 generates a new secret
CHANGE: P0a item 4: retrieve and seal the old FIXFLOW_JWT_SECRET if K=no. Add a conditional P1 bullet (or a P1-K branch): a write-route old-secret verifier gated by an env flag with an expiry at T_close, plus tests. Otherwise state that under K=no the only option is to accept the loss.
CHECK: found=true supports=true — O-10-design.md K=NO offers accepting expired old-secret tokens on write routes under owner sign-off. V2 lets the owner sign that off in P4b and in the §2 box, citing O10-F15. P1 has no old-secret verifier. P0a item 4 does not record the old JWT secret. Rule 3 freezes the drain image at P1. P3b generates a new secret. No other text carries it out.

--- EXE-3-r3 [MAJOR] P5a / §2 branch box (conf 0.7)
CLAIM: With K=no, P2c is skipped, yet 'P2c's code still ships as the fresh install'. P2c holds no code, only the `eas build --profile fleet` step, so under K=no no phase builds the fresh-install APK. P5a's entry 'P2c merged' cannot be met under K=no, and as worded it never can be: P2c is an operations phase, not a PR (the same fault EXE-27 found in v1's 'P3 merged').
EVIDENCE: v2 §2 K=no bullet; P2c heading 'EAS + one spare phone; K=yes only' and 'no code'; P5a Entry 'P2c merged (the fleet profile)'; the fleet profile is P2b D1; EXE-27
CHANGE: P5a entry: 'P2b merged (fleet profile); P4a done'. In the K=no branch, add the `eas build --profile fleet` step (build id, cert recorded as new) to P4a's tail before the uninstall/fresh install.
CHECK: found=true supports=true — The v2 text has the gap. §2 K=no says P2c is skipped yet "P2c's code still ships". P2c states "no code" and is an operations phase. The only `eas build --profile fleet` steps are in P2c and P5c (v2), so under K=no nothing builds the fresh-install APK. P5a Entry says "P2c merged". EXE-27 exists but concerns P7b's "P3 merged".

--- EXE-13-r1 [MAJOR] P3c (conf 0.6)
CLAIM: The fix for EXE-13 moved latency into P3c, but P3c keeps `api.` on the 503 maintenance responder ('api. still answers 503 to a phone'). So 20 GET/POST requests from the owner's phone over mobile data, and test 2(c) for health through the tunnel, can only reach the 503 responder, not the backend. The phase never names a hostname or path that reaches the backend while the route is closed.
EVIDENCE: v2 P3c steps 1, 2(c), 3 and Done-when; w2/O-08-design.md §3 line 55 (smoke 'through app.${DOMAIN}' before flipping api.); EXE-13
CHANGE: Name the route for the measurement: either a temporary test hostname behind Cloudflare Access (an Access service token in the curl), or app.<domain>'s /api proxy, with the extra Caddy/Access hop noted. Have tests 2(c) and 3 use that route and send the X-Ops-Proxy-Token for /api/ops/health.
CHECK: found=true supports=true — P3c step 1 puts api. on the 503 responder, and Done-when says api. still answers 503. Step 2(a) and (c) say "through the tunnel", and step 3 sends 20 phone requests to /api/ops/health, a GET list and a POST. None names a hostname or path that reaches the backend. P3a sends api. straight to the backend and gives app. no /api proxy. O-08 §3 smokes through app.${DOMAIN}, which P3c never adopts. The gap is real.

--- EXE-20-r1 [MAJOR] P8b / §4 chain anchor row (conf 0.6)
CLAIM: The accepted default 'email to the owner' has nothing to send it. The backend has no email transport (no SMTP or provider code in backend/app; the only outbound channels are FCM and the settings-gated WhatsApp sender), and no phase or owner input supplies SMTP or provider credentials. So P8b's Done-when 'one head hash delivered through the channel' cannot pass on the default.
EVIDENCE: EXE-20 CHANGE 'Default to email'; w2/O-06-design.md item 5 '(WhatsApp/email) or a locked object under a different account'; grep for smtp/sendgrid/mailgun in backend/app returns no sender; v2 P8b Entry/Done-when; P0a item 11 collects only the address
CHANGE: Either change the default to a channel that already exists (WhatsApp sender, or a put-only object in the second account from P13b), or add an email transport to P8b's scope plus an owner input in P0a for SMTP or provider credentials.
CHECK: found=true supports=true — Backend has no SMTP or email provider code (only an intake-channel enum and an FCM service-account email). v2 sets the chain-anchor default to email to the owner (§4, P8b Entry), P0a item 11 collects only the address, and no phase adds an email transport or credentials. P8b's Done-when requires a delivered head hash. The "unanchored" fallback covers only an unconfigured channel.

--- EXE-16-r1 [MAJOR] P14-n (conf 0.55)
CLAIM: P5d-1 now installs v2 across the fleet, but the v3 half of EXE-16 is still open: P14 builds each SDK major and installs it only on the pilot, plus a 'per-OEM spot check'. No step installs the P14 build on the fleet, and R7 rules out expo-updates. As written, the SDK upgrade and its advisories never reach the field phones.
EVIDENCE: EXE-16 ('No phase installs the v2/v3 builds on the fleet'); v2 P14-final 'Install on the pilot … a per-OEM spot check'; P14 Done-when 'installed on the pilot'; §6 R7
CHANGE: Add P14-fleet, reusing P5d-1's per-phone table: versionCode check, Drain Report empty, `adb install -r`, never uninstall. Its Done-when: every roster phone on the new versionCode.
CHECK: found=true supports=true — EXE-16 exists in the critique. v2 fixed the v2 half (P5d-1 is a per-phone fleet install). For v3, P14-final says "Install on the pilot", Done-when says "installed on the pilot", and R7 bans expo-updates. No P14 step or other phase installs the new build on the fleet. The gap is real. A "per-OEM spot check" is not a fleet install.

--- EXE-2-r1 [MINOR] P3b / P0a item 2 (conf 0.55)
CLAIM: P0a item 2 can be met by 'project restored' alone, and P3b's size line still allows for 'case (a) with a dump still to take'. That keeps the path the refuter flagged, where the dump is taken in P3, after the box. It also contradicts P3b's own entry, which requires 'the Supabase dump … artefacts' to be in hand.
EVIDENCE: EXE-2 refuter ('P3's size line puts taking the Supabase dump in P3 … contradicts restore now'); v2 P0a item 2 'project restored or the logical backup downloaded'; P3b Entry and Size
CHANGE: P0a item 2: the logical dump is downloaded and archived with its sha256 in every restorable case, and restoring the project alone does not satisfy it. Delete 'with a dump still to take' from P3b's size line.

--- EXE-9-r1 [MINOR] §6 / P3b (conf 0.45)
CLAIM: The narrowing reason says 'the exact commands were added instead'. That holds for drain_audit.py (P2b/P4a) but not for P3b: step 3's Appendix B gate and step 6's `set_pin.py --dry-run` name no container invocation, and the owner's PC and the box host have no Python or psql.
EVIDENCE: EXE-9 CHANGE (`docker compose exec postgres psql -f b.sql`, `docker compose exec backend python scripts/set_pin.py`); v2 P3b steps 3 and 6
CHANGE: In P3b, write out `docker compose exec -T postgres psql -U fixflow -f /restore/appendix-b.sql` (or the path the runbook uses) and `docker compose exec backend python scripts/set_pin.py --dry-run`.

--- EXE-5-r1 [MINOR] P0a item 10 / P3c step 4 (conf 0.45)
CLAIM: EXE-5's claim lists the railway CLI as missing on this machine, and the tools list still leaves it out. P3c step 4 still deploys the hang stub to Railway, and CLAUDE.md says Railway deploys are manual `railway up` (the service is not GitHub-connected).
EVIDENCE: EXE-5 claim ('no … railway CLI'); EXE-10; CLAUDE.md Deploy row; v2 P0a item 10; P3c step 4
CHANGE: P0a item 10: add 'railway CLI (`npx @railway/cli login`) if H=yes'. P3c step 4: name the deploy command for ops/hang-stub.

--- EXE-18-r1 [MINOR] P5d-2 / §4 thresholds row (conf 0.5)
CLAIM: Three metrics now have thresholds, but 'per-OEM residual kill rate', the metric EXE-18 named, still has no definition and only a 'reported per OEM' threshold. '% of real arrivals' also has no stated ground truth, so the denominator is undefined.
EVIDENCE: EXE-18 ('residual kill rate has no definition and no threshold'); v2 §4 'residual kill rate reported per OEM'; P5d-2 Scope
CHANGE: Define kill rate as on-duty hours with sampler_gap and no foreground service ÷ on-duty hours, per OEM, from the ring plus the P6b read, and give it a threshold (e.g. <5%). Define real arrivals as arrival punches with server verdict inside or unknown.

--- EXE-24-r1 [MINOR] P10a / §4 (conf 0.55)
CLAIM: P10a must produce 'the column labels for the owner's Odoo version', but §4 lists the Odoo version as blocking only P10b, and P10a has no owner-inputs line. The draft runbook is therefore written before the version that decides its labels is known.
EVIDENCE: EXE-24 ('Owner inputs also omit the Odoo version (which the column labels depend on)'); v2 P10a Scope; §4 row 'Tax regime … Odoo version | P10b'
CHANGE: §4 row: Odoo version blocks P10a. Add the owner input 'Odoo version' to P10a, or collect it in P0a item 11.

==================== reflect:fidelity — 8 findings; ok: FID-1, FID-4, FID-7, FID-8, FID-10, FID-11, FID-12, FID-13, FID-14, FID-16, FID-17, FID-18, FID-19, FID-22, FID-23, FID-24, FID-25, FID-26, FID-27, FID-28
SUMMARY: I checked all 28 FID ids against v2. Twenty are adequately reflected. Eight have a defect. R2's reason (FID-5) is wrong on the code: job punches are re-bucketed to drain time, not rejected. The payroll-regeneration step that the FID-9 narrowing depends on is a no-op without payroll_export.version. The K=no branch (FID-2) lacks the old-secret token code and a manifest-free done-when. FID-20 is counted as accepted, yet v2 flags self-approval instead of refusing it and builds no O-06 approval table. FID-21 never adds the recorded_by FK as NOT VALID and has no orphan audit. Three minors: drain_audit test-row marking, install-time state for the D4 proof, and P5c checking against the pre-P6a server rule.

--- FID-5-R2 [MAJOR] §6 ruling R2 / P4a entry / §4 jobs-GPS row (conf 0.75)
CLAIM: R2's stated reason is wrong on the code. v2 says 'a late job-travel punch older than 48 h is rejected and counted in the Drain Report as "too old"'. Job location punches are never rejected. `_effective_capture_time` re-buckets an out-of-window device_time to server_now. Only breadcrumb samples are rejected. With the ceiling at 48 h, every drained depart/arrive pair lands stamped at drain time, a few seconds apart. Each one writes a 'GPS — arrive' job_event 'now', and the route is derived from the collapsed window. No P2b scope builds a 'too old' Drain Report class either.
EVIDENCE: backend/app/features/jobs/service.py:351-362 ('re-bucket, never reject'), 365-373 (only samples rejected), 1576; O-04 §2 line 30 ('punches are never rejected either way'); FID-5
CHANGE: Rewrite R2: outage-age job punches land re-bucketed to server_now, with device_time kept raw. State whether that is acceptable, or widen the ceiling with the before/after fuel check that FID-5 proposed. Drop the 'too old' Drain Report claim, or add that class to P2b D7.
CHECK: found=true supports=true — service.py:351-362 re-buckets an out-of-window job punch to server_now and keeps device_time raw. Only breadcrumb samples are rejected (365-373, used at 1679). Plan R2 (line 964) and the §4 row (line 871) say punches older than 48 h are rejected and counted as "too old". "too old" appears nowhere else in the plan. One caveat: O-04 line 30 says punches are never rejected, but it concerns the attendance ceiling, not job GPS.

--- FID-9-regen [MAJOR] P6b / §6 narrowing DEP-23/CMP-16/FID-9 (conf 0.6)
CLAIM: The narrowing depends on 'P6b regenerates payroll for the drain windows P4b records'. payroll_export is unique on (shop_id, from_date, to_date), and a re-run is a no-op. So the Sunday export written during the 7-day window is final unless the key changes. O-04 §3 makes regeneration depend on `payroll_export.version` replacing `payroll_export_window_key`. P6b's 'one migration' lists adjustment action/client_id and the app_event index, but not the version column. As written, the regeneration step does nothing.
EVIDENCE: backend/app/features/attendance/models.py:365-373; O-04 §3 'Optional later (only with O04-F11): payroll_export.version…'; O-04 'Order of operations' 4; FID-9
CHANGE: Add to P6b's migration: payroll_export.version INT NOT NULL DEFAULT 1, plus UNIQUE(shop_id, from_date, to_date, version) in place of payroll_export_window_key. Add a done-when that a regenerated export for a P4b-recorded window gets version 2.
CHECK: found=true supports=true — Evidence exists: models.py:365-373 has the unique key payroll_export_window_key and the docstring says re-runs are no-ops. O-04 §3 lists the version column only as "Optional later (only with O04-F11)", and step 4 says regeneration needs O04-F11. P6b (lines 603-626) schedules regeneration but names no version column or key change anywhere in the plan.

--- FID-2-kno [MAJOR] §2 branch box / P4a / P4b / P3b (conf 0.65)
CLAIM: The K=no branch is transcribed only in outline and cannot be executed. (1) The owner sign-off on 'accepting old-secret tokens' needs server code that verifies an old-secret JWT on write routes during the window. No phase builds it. P3b step 2 generates a new secret with no K=no/H=yes 'keep the old one' clause (O-10 B2). (2) P4a's E-steps and its done-when 'AFTER matches the manifest' assume a manifest, which K=no never produces (photos only). (3) With P2c skipped, no phase builds and cert-checks the fresh-install APK. (4) The S7 'clock in and walk through the fence' step is dropped.
EVIDENCE: O-10 B2, BRANCH K=NO lines 95-101; plan §2 box, P2c entry, P3b step 2, P4a done-when; FID-2
CHANGE: Add a 'K=no' variant to P3b step 2 (keep the old secret if it can be recovered) and to P4a: Retry row by row, an S7 walk, and a done-when against the photos. Name the phase that builds the dual-secret verify, gated on the owner's sign-off. Add a build + apksigner step before the fresh install in P4b.
CHECK: found=true supports=true — O-10 BRANCH K=NO (lines 94-101) and FID-2 exist. v2 carries K=no only in the §2 box, P4a entry and P4b one-liner. It names the old-secret sign-off, but no phase builds the dual-secret verify and P3b step 2 has no keep-old-secret clause. P4a done-when says "AFTER matches the manifest" with no photos-only variant. The S7 clock-in walk appears nowhere. P2c is skipped, and P4b adds no build or apksigner step before the fresh install.

--- FID-20-approval [MAJOR] P9a-1 / §4 self-approval row / P7a / P2b (conf 0.6)
CLAIM: FID-20 is not listed as narrowed in §6, so it counts as accepted, but v2 reverses its core. O-06 item 3 says 'Self-approval is refused', and it is part of the minimum required before anything flows to Odoo. P9a-1 and §4 instead default to 'flag, do not block', and give no reason. O-06 item 3's single approval table (advance, bill_override, negotiate_over_cap…) is built nowhere. P7a cites it for a 'flagged approval record' but is migration-free, and posting_decision covers postings only. Item 6's per-tech discard count on the board is also missing; P2b ships only the telemetry event.
EVIDENCE: w2/O-06-design.md items 3, 6; plan P7a, P9a-1, §4, §6; G2 O6-F16; FID-20
CHANGE: Either list FID-20 as narrowed in §6 with the reason (for example a single-manager shop), or make refusal the default. Name where the O-06 item 3 approval table lands, with a migration (P8a/P8b), and add the board discard count to P6a or P9b.
CHECK: found=true supports=true — O-06 item 3 says self-approval is refused, with one approval table; item 6 asks for a per-tech discard count on the board. FID-20 is absent from §6's narrowed list. The plan (P9a-1, §4 row ~880) defaults to "flag, do not block" with no reason. P7a only cites a "flagged approval record", with no table. The only discard artifact is P2b's telemetry event, and no board count appears anywhere.

--- FID-21-fk [MAJOR] P8a deferred list / P13d (conf 0.6)
CLAIM: FID-21 asked that the recorded_by FK be added and then validated in a separate audit-then-deploy step. v2 lists only 'the recorded_by FK validate' (P8a) and 'VALIDATE … the recorded_by FK' (P13d). No phase ADDs the FK NOT VALID first. P13d's entry audit is the fence script only, with no orphan or non-positive-amount audit for job_payment. On restored months-old data, P13d would therefore add and validate the FK in one migration and one deploy. CLAUDE.md forbids that for populated human data.
EVIDENCE: O-07 part 6 lines 80-82 (ADD … NOT VALID, VALIDATE in a later migration after an orphan audit); CLAUDE.md 'Data and money' FK rule; plan P8a 'Deferred', P13d
CHANGE: Add `job_payment.recorded_by` FK NOT VALID to P8a's migration. Extend the P6b audit script, or add one, to cover recorded_by orphans and amount ≤ 0. Make P13d's entry require that audit to come back clean before the VALIDATEs.
CHECK: found=true supports=true — O-07-design.md line 82 does say ADD recorded_by FK NOT VALID, with VALIDATE in 0049 after an orphan audit. The v2 plan mentions the FK only as "validate" at P8a line 702 and P13d line 843, and no phase ADDs it. P6b's audit script (line 620) covers fences only. P13d's entry says "no orphans" but ties it to that fence script, so no recorded_by or amount≤0 audit exists. The claim holds.

--- FID-3-testrows [MINOR] P4a step 1 / P2b drain_audit (conf 0.5)
CLAIM: P4a says the protocol's presence and punch rows 'are marked as test rows by `drain_audit.py`', but P2b's scope for drain_audit.py (a manifest-vs-server comparison per tech since T_open) has no test-window input or marking. The P4a step cannot be done with the script P2b builds.
EVIDENCE: plan P2b drain_audit bullet; P4a step 1; O-01 Step 0 ('write down the clock time'); FID-3
CHANGE: Add to P2b's drain_audit scope and pytest: a `--test-window <start> <end>` option that labels rows in that window as protocol test rows in its output.

--- FID-15-order [MINOR] P4a step 4 (conf 0.5)
CLAIM: The narrowing moves the ordering proof to the pilot, but P4a does not say what state the phone is in at install. Step 1 says the app's network is restored 'only at step E', which leaves unclear whether it is on at `adb install -r`. If it is off, logcat 'no sync before the manifest receipt' proves nothing. The #47595 check that tracking resumes after the update, part of FID-15's change, is also dropped.
EVIDENCE: O-10 D4 (MY_PACKAGE_REPLACED headless task); O-01 H11 #52230/#47595; plan P4a steps 1, 4; FID-15
CHANGE: In P4a E2: tech clocked in with the ping task registered, per-app network ON before `adb install -r`, logcat captured before opening the app. Add 'pings resume after the update (ring/sampler)' to the Pilot table.

--- FID-6-p5c [MINOR] P5c entry / indoor test (conf 0.45)
CLAIM: R1 resolves the rule conflict in code, but P5c's check that 'the server row's verdict agrees' does not require P6a to be deployed. Standing rule 3 deploys P6a only after T_close, and P5c can run before that. The server would then still apply the old d − a ≤ r rule (derive.py:95), so the agreement check would test the superseded rule, not the shared one.
EVIDENCE: backend/app/features/attendance/derive.py:76-95; plan P5c entry, P6a 'deploy after T_close'; §6 R1; FID-6
CHANGE: Add 'P6a deployed to the box' to P5c's entry, or state that the indoor server-agreement check is re-run in P5d-1, after P6a is deployed.

==================== attack:consistency — 26 findings; ok: P0b, P6a, P8a, P9a-1, P9a-2, P9b, P10b, P13d, P14-n, no entry-graph cycle found, radius >= 100 m consistent (P0a, P3b, §4), 100 m accuracy ceiling consistent (P5a, P6a, R1), 6-digit PIN consistent in text (P1, P3b, P7b-1), 7-day window consistent (P4b, O-10 F), ceilings 24/48/240 consistent between P4a, P4b, R2 and §4, hang stub and heartbeat are P3 infra (rule 3 ok), §6 R6 and R7 followed
SUMMARY: I found no cycles in the Entry graph, and the numbers (radius, accuracy, PIN length, the 7-day window, the 24/48/240 ceilings) agree across phases. The blockers: no phase pins a drain image, so P3b's image can hold P6a/P7a merges and lack drain_audit.py. P7b-2 and P13a–c can deploy before T_close. The K=no branch's uninstall breaks standing rule 1. Majors: P3c keeps api. closed while its tests need it open, and no phase sets the ops-proxy token behind /api/ops/health. The K=no branch lacks its APK build, proxy and old-secret handling. Also: the 6-digit minimum is script-only, typed-name login has no backend and removing the roster breaks web login, P7a's required negotiate reason breaks the field APK, payroll regeneration is keyed wrongly, and Entry gaps exist in P2b, P5a and P5c.

--- CON-1 [BLOCKER] §0 rule 3 / P3b / P4a / P6a / P7a (conf 0.75)
CLAIM: The plan never says how to build a drain image that holds P1, P3 and nothing else. P6a says "Merge any time after P1", P7a can also merge after P1, and R5 deploys from main, so the P3b image picks up whatever has merged by then. The P4a AFTER audit also runs `scripts/drain_audit.py`, which P2b writes, but P3b's Entry is only "P3a merged", so the box image may not contain the script. Adding it later means redeploying from main, which can ship behaviour changes before T_close.
EVIDENCE: P6a Entry; P7a Entry; P3b Entry; P4a step 4; §0 Deploys (R5 = git pull, build, up -d); backend/Dockerfile `COPY . .` (scripts ship only in the image they were built into)
CHANGE: Add to rule 3: "the box runs tag `drain-image` (P1 + P3a + P2b's drain_audit.py) until T_close; R5 deploys only that tag until then". Add "P2b merged; tag cut" to P3b's Entry. P6a/P7a: "merge to main any time; the box stays on the tag until T_close".
CHECK: found=true supports=true — Rule 3 and R5 define the drain image as "P1 plus P3 infrastructure", which leaves out P2b. P4a step 4 runs drain_audit.py (P2b) in the box container. P3b's Entry is "P3a merged", not P2b. No tag or ref pinning is stated, and R5 is pull/build. Mitigations are "Merge is not deploy" and P6a/P7a "deploy after T_close". The gap is real for the P2b script and for ref selection.

--- CON-2 [BLOCKER] P7b-2 (conf 0.7)
CLAIM: P7b-2's Entry is only "P3c done" and its Done-when says "deployed". Its scope changes backend behaviour (media reservation caps, length-bounded presign, the 413 commit fix, the stale-pending sweep), so a session following it can deploy in the middle of the drain and refuse selfie and voice-note uploads. That breaks standing rule 3 and conflicts with §2's note "(P7a..P8b deploy after T_close)".
EVIDENCE: P7b-2 Entry/Done when; §0 standing rule 3; §2 line 85; §6 R5; O10-F8 (a selfie PUT stall blocks the punch drain)
CHANGE: Change P7b-2's Entry to "P3c done. Merge any time; deploy the backend part after `T_close` (standing rule 3); the ops-server and web parts may deploy earlier."
CHECK: found=true supports=true — P7b-2 Entry is only "P3c done" and Done-when is "gates and CI green; deployed", with no T_close mention. Its scope has backend media behaviour changes. Rule 3, §2 line 85 and R5 do say behaviour-changing backend work deploys after T_close, so the gap is local to the phase text. P7a and P6a state it explicitly.

--- CON-3 [BLOCKER] P13a / P13b / P13c (conf 0.6)
CLAIM: P13a's Entry is "P3c done; P7b-2 merged", and P7b-2 can merge before T_close. P13a ships a migration, a start.sh change to the migrator role and REVOKEs. P13b changes the backup job, and P13c ends with "images rebuilt and deployed". None of them waits for T_close, so each can replace the drain image while the window is open.
EVIDENCE: P13a/P13b/P13c Entry and Done-when; §2 "P13a..P13d after P3c and P7b-2"; standing rule 3; §6 R5
CHANGE: Add "deploy after `T_close` (standing rule 3)" to the Entry of P13a, P13b and P13c, and to §2's P13 line.
CHECK: found=true supports=true — The cited text exists. P13a Entry is "P3c done; P7b-2 merged" (merge, not deploy). P13b and P13c Entry is "P13a". Neither P13 phase mentions T_close, and P13c Done-when says "images rebuilt and deployed". §2 line 87 says only "after P3c and P7b-2". Rule 3 and R5 cover only "P6a onward"; the "deploy after T_close" note covers P7a..P8b. The gap is real but partly covered implicitly by rule 3's wording.

--- CON-8 [BLOCKER] §0 standing rule 1 / §2 K=no box / P4b (conf 0.6)
CLAIM: Standing rule 1 says installs are "never an uninstall", and rule 7 says the plan never asks for an exception. The K=no branch in §2 and in P4b ends with "uninstall and fresh install of the fleet build". So the plan breaks its own standing rule without saying so.
EVIDENCE: §0 rule 1; §2 K=no,H=yes and K=no,H=no bullets; P4b "K=no … then fresh install"; O-10 BRANCH K=NO line 100; O-10 R5
CHANGE: Reword rule 1: "…never an uninstall, except in the K=no branch after A3 photos, every row retried or transcribed, and the owner's written sign-off per phone (O-10 BRANCH K=NO)".
CHECK: found=true supports=true — Rule 1 (line 48) says installs are "never an uninstall". Line 97 (K=no,H=yes) says "then uninstall and fresh install", and K=no,H=no says "then fresh install". O-10 line 100 says uninstall, and E2/R5 forbid it elsewhere. Rule 7 line 61 says no exception is asked. The exception is unflagged. The claim's "P4b" text is only partly checked.

--- CON-4 [MAJOR] P3c (conf 0.75)
CLAIM: P3c asks for two incompatible things. Step 1 and its Done-when keep `api.` on the 503 responder ("api. still answers 503 to a phone"). Yet step 2(a) (XFF through the tunnel), 2(c) (`/api/ops/health` through the tunnel), 2(d) (selfie presign→PUT→commit) and step 3 (20 phone requests to a GET list and a POST) all need the backend reachable through the tunnel. As written the phase cannot be completed.
EVIDENCE: P3c steps 1, 2(a), 2(c), 2(d), 3 and Done when; O-08 §3 step 3; O-10 §B ("the tunnel route stays closed")
CHANGE: Add step 1b: a temporary hostname `api-test.<domain>` routed to the backend and reachable only with a Cloudflare Access service token (or the owner's IP). Tests 2(a)/(c)/(d) and 3 run against it. It is deleted before P4a B6, and the deletion is recorded in W0-results.
CHECK: found=true supports=true — P3c step 1 and Done-when keep api. on the 503 responder. Steps 2(a), 2(c), 2(d) and 3 need the backend reachable through the tunnel. The plan's P3a routes only api. directly to the backend, and the app. host serves the web build. Nothing else in the plan, including §4–§6 and the standing rules, gives a test route. O-08 §3 line 55 smokes through app.; the plan does not carry that over. O-10 B says the route stays closed.

--- CON-5 [MAJOR] P1 / P3a / P3b / P3c (conf 0.7)
CLAIM: Several phases rely on `/api/ops/health`: P1 makes it the healthcheck target, the P3a heartbeat calls it, and P3b step 7 and P3c 2(c)/3 call it. The route is gated by `X-Ops-Proxy-Token` and fails closed with 401 when `ops_proxy_token` is unset. P3b step 2's secrets list (JWT, R2, FCM, Sentry) never creates that token, and no step gives it to the healthcheck, the cron or the phone used for the latency test.
EVIDENCE: backend/app/features/ops/router.py:18; ops/deps.py:31-44 ("ops proxy token not configured" → 401); P3b step 2; P1 bullet 5; P3a heartbeat bullet
CHANGE: Add `FIXFLOW_OPS_PROXY_TOKEN` (32 random bytes) to P3b step 2. In P3a, the compose healthcheck and the heartbeat cron send the header. In P3c step 3, time a public route (e.g. `/api/health`) instead of a token-gated one.
CHECK: found=true supports=true — Evidence exists: router.py gates all /api/ops routes with require_ops_proxy_token; deps.py returns 401 "not configured" when unset. The v2 plan never mentions the token or header. P3b step 2 omits it, and the P3a heartbeat, P3b step 7 and P3c 2(c)/3 call /api/ops/health without it. Only w2/O-08-design.md sets it, for the compose healthcheck and ops service. It does not cover the heartbeat cron or the phone latency test.

--- CON-6 [MAJOR] §2 K=no box / P2c / P3a / P3c / P4a / P4b (conf 0.7)
CLAIM: No phase produces what the K=no branch needs. (1) The fresh-install APK: P2c is skipped and has no code ("P2c's code still ships"), so the K=no build has no build step and no cert or versionCode check. (2) The Railway proxy: P3a builds only the hang stub, but P3c step 4 says "proxy prepared". (3) A reachable Done-when: P4a/P4b require "AFTER matches the manifest", but under K=no the field build has no manifest and the AFTER check is photos-only.
EVIDENCE: §2 branch box; P2c Entry ("If K=no, skip"); P3a hang-stub bullet; P3c step 4; P4a Done when; O-10 BRANCH K=NO, A3
CHANGE: Add to P2c: "K=no: run `eas build --profile fleet` and record the id; no install-over test". Add to P3a: an `ops/proxy-stub/` service (enabled only at B6, under the B1–B6 conditions). Make P4a/P4b Done-when branch-aware: "K=no: every parked row is photographed and either retried or transcribed, the loss is declared, and the fresh install is done".
CHECK: found=true supports=true — Confirmed. P2c is skipped under K=no and has no code, yet §2 says it "still ships" as the fresh install; no phase runs the eas build or cert check. P3a builds only the hang stub, while P3c step 4 and P4a step 3 assume a proxy that nothing builds. P4a Done-when "AFTER matches the manifest" contradicts O-10's photos-only AFTER. P4b's Done-when doesn't say that, so part (3) is P4a only.

--- CON-7 [MAJOR] P3b step 2 / P4b K=no (conf 0.6)
CLAIM: In the K=no/H=yes branch the owner signs off on "accepting old-secret tokens for the window". No phase builds acceptance of a second JWT secret on write routes. P3b step 2 always generates a new JWT secret, although O-10 B2 says to keep the old one in exactly this branch. With a pre-v2 outbox, every queued job write is then lost on the first 401 (O10-F15).
EVIDENCE: P3b step 2 ("generated JWT secret"); O-10 B2 ("Keep the old one only in the K=no/H=yes branch, if it is recoverable"); O-10 BRANCH K=NO; §2 box; O10-F15
CHANGE: Add to P3b step 2: "If K=no & H=yes & v2-outbox=no: keep the recovered old secret (≥32 bytes, not the dev default) for the window, on the owner's signed decision, and rotate it at T_close." That avoids new code under rule 3.
CHECK: found=true supports=true — Evidence exists. O-10 B2 says keep the old secret only in K=no/H=yes. O-10 line 96 allows accepting expired old-secret tokens on write routes, under owner sign-off. Plan lines 96 and 469 only name the sign-off. P3b step 2 generates a JWT secret unconditionally. No phase builds acceptance of a second secret or keeps the old one.

--- CON-9 [MAJOR] P5a Entry (conf 0.7)
CLAIM: P5a's Entry says "P2c merged (the fleet profile)". P2c opens no PR, and the fleet profile is P2b's D1. Under K=no, P2c is skipped, so the Entry can never be met. P5a also depends on "P4a's protocol ranking", but §2 shows only P6a ──► P5a.
EVIDENCE: P5a Entry; P2b D1; P2c (no code, "If K=no, skip"); §2 line 83
CHANGE: Change P5a's Entry to "P2b merged; P6a merged; P4a done (protocol ranking in W0-results)", and draw P4a ──► P5a in §2.
CHECK: found=true supports=true — P5a Entry (line 479) says "P2c merged (the fleet profile)". But the fleet profile is P2b's D1 (line 273), and P2c is "no code" (EAS build and adb only), so it has no merge. P2c is skipped when K=no (line 306), so the Entry can't be met there. Line 480 also requires "P4a's protocol ranking read", but §2 line 83 draws only P6a ──► P5a.

--- CON-10 [MAJOR] P5c Entry (conf 0.65)
CLAIM: P5c's gate needs P6a deployed, but its Entry does not say so. The indoor test requires "the server row's verdict agrees (inside or unknown)", and the three-state server rule is P6a's, which deploys only after T_close. P5c's Entry asks only for P5b merged and the pilot drained (P4a), so P5c can run during the window, when the old server rule (200 m overlap) is the one judging.
EVIDENCE: P5c Scope indoor test; P6a Entry "deploy after T_close"; §6 R1; O04-F9
CHANGE: Add to P5c's Entry: "P6a deployed to the box (after `T_close`)".
CHECK: found=true supports=true — P5c Entry requires only P5b merged, pilot drained (P4a), tech on shift, adb laptop. Its indoor test needs the server row's verdict to agree. P6a Entry and standing rule 3 deploy the three-state rule only after T_close (R1). Only P5d-1 Entry requires P6a/P6b deployed. The line-83 diagram implies order loosely, but P5c's Entry does not state it.

--- CON-11 [MAJOR] P1 (6-digit minimum) (conf 0.75)
CLAIM: P1 puts the 6-digit minimum only in `backend/scripts/set_pin.py`. The service still allows 4-digit tech PINs, so after P3b the manager's set_pin endpoint can issue a 4-digit PIN. That invalidates P7b-1's Entry ("every account on a ≥ 6-digit PIN") and §5's "P1 (6-digit minimum)".
EVIDENCE: backend/app/features/identity/service.py:31 `MIN_PIN_DIGITS_TECH = 4`, :163-165; identity/schemas.py:33 `min_length=4`; P1 seed-PIN bullet; G2 §5; O05-04
CHANGE: Add to P1's scope: raise `MIN_PIN_DIGITS_TECH` to 6 and `SetPinRequest.pin` min_length to 6, with a test that a 4-digit tech PIN set through the API is refused.
CHECK: found=true supports=true — Code confirms service.py:31 MIN_PIN_DIGITS_TECH=4, _check_pin_policy at :163, schemas.py:33 min_length=4. Plan (P1 line 213, §5 line 949) puts the 6-digit minimum only in scripts/set_pin.py; nowhere does it raise the service minimum. The manager endpoint (line 668 mentions set_pin self-service) can still set 4-digit tech PINs, so the 6-digit entry guarantee is script-only.

--- CON-12 [MAJOR] P5b / P7b-1 / P12 (conf 0.65)
CLAIM: Typed-name login has no backend side, and removing the roster breaks the web. Login takes `tech_id`, not a name, and no phase adds name→id resolution. P7b-1 removes the roster endpoint, but the web manager login reads that same endpoint, and neither P7b-1 nor P12 changes the web login.
EVIDENCE: identity/schemas.py:24-26 (`tech_id`); identity/router.py:67 `/technicians`; src/features/auth/data/authApi.js:9-10 `fetchTechnicians` → `/api/technicians`; P5b typed-name bullet; P7b-1 roster bullet; §6 R3
CHANGE: P5b: state whether the field is the tech id or a name. If a name, P7b-1 adds a server-side case-insensitive lookup. Add a web typed-name login to P7b-1 (or to P12 as an Entry for P7b-1), or keep `/api/technicians` but behind auth instead of removing it.
CHECK: found=true supports=true — All cited evidence exists. LoginRequest takes tech_id, and the service looks up by id. Web Login.jsx and AppContext both call fetchTechnicians on /api/technicians. The v2 plan (P5b, P7b-1, R3) says the roster endpoint is removed and the mobile login takes a typed name. It never says whether that name is the id, and it adds no name-to-id lookup. P12 and P7b-1 never touch the web login, and no other plan text mentions it.

--- CON-13 [MAJOR] P7a / P8b (conf 0.6)
CLAIM: P7a contradicts itself. It requires a reason when the assigned tech negotiates below the original, and it also promises a replay "proving nothing the APK does is newly refused". The field and v1 APKs send `note` as optional, and no mobile phase adds a reason. The refusal is a definitive 4xx, so the write parks in the tech's failed list. P8b's required reason on a post-send negotiate has the same problem.
EVIDENCE: jobs/schemas.py:145-147 (`note` optional); technician-app/src/lib/outboxSync.ts:125 (`p.note`); P7a negotiation bullet and Deliverables; P8b first bullet; CLAUDE.md outbox contract
CHANGE: In P7a: a missing reason from a tech token is accepted and flagged (not refused) until a build that sends it is fleet-wide. Add "negotiate reason field" to P5b's scope. Add a P7a replay case without a note.
CHECK: found=true supports=true — Evidence exists. NegotiateRequest.note is optional (schemas.py:147), and the APK sends `note: selectedDiscount ?? undefined` (ArrivalJobBillScreen.tsx:173). P7a requires a reason but replays only a with-reason flow, yet claims nothing is newly refused. P5b scope and the other mobile phases add no reason field. P8b requires a post-send negotiate reason with no fleet compatibility handling.

--- CON-14 [MAJOR] P4b / P6b (payroll regeneration) (conf 0.55)
CLAIM: Payroll regeneration is keyed wrongly and has no schema to work with. (1) P4b records payroll_export rows *created* in [T_open, T_close], but drained punches land on their device_time days (the Aug–Oct weeks), so the affected windows are not the ones recorded. (2) payroll_export is idempotent on (shop, window), and O-04 §3's `payroll_export.version` migration is missing from P6b's scope. (3) Drained days are late_sync and excluded until an `accept` adjustment exists, and no step schedules the manager's accept pass.
EVIDENCE: P4b Scope; P6b payroll bullets; O-04 §2 order step 4 and §3 "Optional later (only with O04-F11): payroll_export.version"; CLAUDE.md "payroll_export is idempotent on (shop, window)"
CHANGE: P4b records the min/max device_time of the drained rows per tech. P6b's migration adds `payroll_export.version`. P6b regenerates the windows covering those dates after a manager `accept` pass, which gets its own step in W0-results.
CHECK: found=true supports=true — Evidence exists. P4b records payroll_export rows created in [T_open, T_close], not the drained device_time dates. P6b's scope omits any payroll_export.version migration, which O-04 §3 lists as optional and tied to O04-F11. P6b says late_sync days stay out of payroll until an accept adjustment exists, but no step schedules a manager accept pass. A whole-plan search found none of these handled elsewhere.

--- CON-15 [MAJOR] P2b step 6 / P4b / P6b (conf 0.5)
CLAIM: The ceilings do not line up between phases. P2b bakes retry advice at the "post-P1/P6 ceilings" (device_time 336 h) into fleet APK v1. P4b then restores device_time to 24 h through the env, and P6b's "ceiling 336 h permanent" has no step that edits that env value. Between T_close and the env change, v1 tells techs that 2–14-day-old rows land on their true day while the server re-buckets them to today. The env stays at 24 unless someone edits it.
EVIDENCE: P2b step 6; P4b "device_time 24 h (336 h once P6b is deployed)"; P6b first bullet and Done-when; O-04 §2 (the ceiling governs bucketing)
CHANGE: Add to P6b's Done-when: "`FIXFLOW_ATTENDANCE_DEVICE_TIME_BACKDATE_CEILING_HOURS=336` set in /etc/fixflow, restart, value read back from deep-health". Have P2b's advice read the ceiling from the server, or use 24 h until v2.
CHECK: found=true supports=true — The cited text exists. P2b step 6 reads a shared constant at the "post-P1/P6 ceilings". P4b restores device_time to "24 h (336 h once P6b is deployed)". P6b says "ceiling 336 h permanent" but has no step or Done-when that sets the env or the default. config.py still defaults to 24 and O-04 §2 treats 336 as an env value. Nothing else in the plan closes this.

--- CON-16 [MAJOR] §0 Sessions / P1 / P2a / P12 (conf 0.6)
CLAIM: §0 says "one phase in flight at a time on this machine". P1 says it "Runs in parallel with P2a", P2a says "parallel with P1", and P12 says "Parallel with P5–P7". A session cannot obey both statements.
EVIDENCE: §0 Sessions bullet; P1 Entry; P2a Entry; P12 Entry; FIT-3 (the reason is the fixed Docker container names)
CHANGE: Choose one. Either reword §0 to "at most one Docker-gated (backend) phase in flight; one mobile- or web-only phase may run alongside it", or change "parallel" to "independent; may be scheduled in either order".
CHECK: found=true supports=true — §0 says "one phase in flight at a time on this machine" (two sessions would kill each other's Docker gates). P1 Entry says "Runs in parallel with P2a", P2a says "parallel with P1", and P12 says "Parallel with P5–P7". No standing rule reconciles them, so the plan contradicts itself. FIT-3 exists in the critique.

--- CON-17 [MAJOR] P2b Entry / §4 Domain row (conf 0.6)
CLAIM: P2b needs the domain but does not wait for it. D1 bakes `EXPO_PUBLIC_API_URL=https://api.<domain>`, and the Done-when requires a bundle grep that "shows the owned domain". P2b's Entry is only "P2a merged", and §4 lists the domain as blocking only P2c and P3a.
EVIDENCE: P2b D1 and Done when; P2b Entry; §4 Domain row
CHANGE: Add "domain registered (P0b)" to P2b's Entry, and P2b to §4's Domain "Blocks" cell.
CHECK: found=true supports=true — P2b Entry is only "P2a merged". D1 bakes EXPO_PUBLIC_API_URL=https://api.<domain>, and Done-when requires a bundle grep showing "the owned domain". §4 lists the domain as blocking only P2c and P3a. P2c's Entry names "domain in DNS (P0b)", P2b's does not. I found no standing rule elsewhere in the plan that covers P2b.

--- CON-20 [MAJOR] P8b / §4 anchor row (conf 0.5)
CLAIM: The default anchor channel is "email to the owner", and P8b's Done-when needs "one head hash delivered through the channel". No phase builds email sending, and §4 has no row for the SMTP or provider credentials. The backend sends only WhatsApp and FCM.
EVIDENCE: P8b Scope bullet 3 and Done when; §4 "Chain anchor channel" row; w2/O-06-design.md item 5 (WhatsApp/email/locked object)
CHANGE: Add a §4 row "anchor transport credentials (SMTP provider) — blocks P8b". Add "settings-gated email sender (or a locked R2 object under a second account)" to P8b's scope.
CHECK: found=true supports=true — v2 §4 defaults the anchor channel to "email to the owner", and P8b Done-when requires one head hash delivered through it. Searching the whole plan finds no phase that builds an email sender and no §4 row for SMTP or provider credentials. The backend has no email code. O-06 item 5 lists WhatsApp, email or a locked object as options only. The gap is real.

--- CON-18 [MINOR] P0a item 5 / P2b D1 / P2c (conf 0.5)
CLAIM: P0a's Done-when needs item 5 only "for at least the pilot phone". P2b D1 needs a versionCode above the field value on every phone, and P2c checks the cert on one phone only. A phone with a higher versionCode or a different cert surfaces only at P4b E2.
EVIDENCE: P0a Done when; P2b D1; P2c Scope; O-10 E2, R5
CHANGE: Add to P2c's Entry: "item 5 recorded for every roster phone; the fleet versionCode is above the maximum; K is the same on every phone".

--- CON-19 [MINOR] P3c step 2(e) (conf 0.6)
CLAIM: Step 1 puts `app.` behind Cloudflare Access, so an unauthenticated `curl -I https://app.<domain>` returns Access's redirect, not Caddy's CSP header.
EVIDENCE: P3c steps 1 and 2(e); G2-D2
CHANGE: Change 2(e) to send an Access service token (`CF-Access-Client-Id/Secret`), or curl Caddy on the internal network from the box.

--- CON-21 [MINOR] §6 R2 / P2b D7 (conf 0.55)
CLAIM: R2 says a rejected late job-travel punch is "counted in the Drain Report as 'too old'", but P2b's Drain Report scope (D7: BEFORE counts by queue and reason) and step 6 have no such category. P4a's "test rows marked by drain_audit.py" likewise has no matching P2b scope item.
EVIDENCE: §6 R2; P2b D7, step 6 and audit-script bullet; P4a step 1
CHANGE: Add to P2b: a D7 reason bucket `too_old` for jobs-GPS rejections, and a `--test-window START END` option for drain_audit.py with a pytest.

--- CON-22 [MINOR] §2 graph (conf 0.7)
CLAIM: The graph differs from the phases' Entry lines. Missing edges: P4a→P5a, P4a→P5c, P5d-1→P7b-1, P3b→P7b-1. Shown but not in the Entry lines: P9b→P10a (P10a's Entry is P9a-2) and P10b→P11 (P11's Entry is P10a merged). P13d's Entry (P6b audit + P8a) does not match the graph's "P13a..P13d after P3c and P7b-2".
EVIDENCE: §2 lines 83-87; Entry lines of P5a, P5c, P7b-1, P10a, P11, P13d
CHANGE: Redraw §2 from the Entry lines, adding the missing edges and replacing the sequential P9b→P10a and P10b→P11 edges with the real ones.

--- CON-23 [MINOR] §5 (conf 0.65)
CLAIM: Several §5 mappings are wrong. §5 says each row maps to "exactly one closing phase", but many rows list two. `O07-F1`/`F2` → P9a-1, but P9a-1's scope does not contain them (P9a-2 does). `O04-F12` is grouped under P6a/P6b/P7a and `O05-14` under P3a/P7b, but P1 closes both. `O05-16` maps to no phase.
EVIDENCE: §5 header and rows; P9a-1 Scope; P1 bullets 3 and 5; G2 §2 D (O05-14..F18)
CHANGE: Fix the header to "one or more closing phases", map O07-F1/F2 to P9a-2, map O04-F12 and O05-14 to P1, and give O05-16 an owner or a backlog line.

--- CON-24 [MINOR] §0 rule 7 / P8a (conf 0.45)
CLAIM: Rule 7 says "nothing money-related rides the `job_event` cursor", while P8a writes `{payment_id, amount_paisa, method, reason}` into job_event payloads, which the dispatcher cursor reads.
EVIDENCE: §0 rule 7; P8a bullet 2; P9a-1 CLAUDE.md invariant; O07-F6
CHANGE: Reword rule 7: "no money feed (staging, export, push) is driven by the job_event cursor; payloads may carry amounts for audit".

--- CON-25 [MINOR] P3a / P3c / P7b-2 (conf 0.5)
CLAIM: P3a's compose has no ops-server service, yet P3c step 1 puts `ops.` behind Access and P7b-2 binds the ops-server to the internal network.
EVIDENCE: P3a compose bullet; P3c step 1; P7b-2 Scope; G2-D2 ("Ops console optional")
CHANGE: Add an optional, profile-gated `ops` service to P3a, or mark `ops.` "only if the ops profile is deployed" in P3c and P7b-2.

--- CON-26 [MINOR] §1 / P7a (conf 0.55)
CLAIM: The security milestone says "end of P7b-2 for the rest", but P7b-1 waits for P5d-1 and can finish after P7b-2. P12 (O08-F13) and P13b (O6-F06) are not listed. No phase step turns P7a's PII setting on "after P5d-1", which §5 claims.
EVIDENCE: §1 security row; P7b-1 Entry; §5 O05-06 row; P7a PII bullet
CHANGE: Change the milestone to "end of the later of P7b-1 and P7b-2" and add P12 and P13b. Add to P5d-1's Done-when: "PII-minimisation setting turned on and recorded".

==================== attack:fit — 27 findings; ok: FIT-1, FIT-2, FIT-3, FIT-6, FIT-7, FIT-8, FIT-9, FIT-11, FIT-13, FIT-15, FIT-17, FIT-18, FIT-19, FIT-20, FIT-21, FIT-22, FIT-23, FIT-24, FIT-25, FIT-26, FIT-27, FIT-28, P0a, P0b, P1, P2a, P2c, P3b, P4a, P5a, P5d-2, P6a, P7b-1, P7b-2, P8a, P9a-1, P9a-2, P9b, P10b, P11, P12, P13a, P13b, P13c, P14-n
SUMMARY: Most v2 splits fit one session, and the P5a hatch is now valid. The structural blocker: phases that can merge before T_close have \"deployed after T_close\" in their Done-when, which collides with \"one phase in flight\". Each still needs a split: P2b (move drain_audit.py out, with the test-row window P4a relies on), P4b (per-visit sessions plus a separate window-close P4c), P5d-1 (split by OEM count), P6b (also missing the payroll_export.version migration that regeneration needs). Unexecutable steps: P3c's tunnel and latency tests against a closed api. route, and its overnight wait for the backup. The P5c build sits inside the pilot session. P5b's typed-name login needs a backend change; P7a's required reason refuses deployed APKs; P8b has no email transport or chain backfill. P13d can merge into P13c.

--- FIT2-01 [BLOCKER] §0 Deploys / P6a, P7a, P7b-2, P8a, P8b, P9a-1..P10a (conf 0.65)
CLAIM: A phase that can merge before T_close has a Done-when it cannot reach in its own session. P6a says "Merge any time; deploy after T_close", P7a says "deployed after T_close", and P7b-2, P8a, P8b and P9a-1 can all start before T_close and end "deployed". Under §0's "one phase in flight at a time", every later phase is blocked for days or weeks.
EVIDENCE: §0 Deploys plus standing rule 3; P6a Entry/Done; P7a Entry/Done; P8a Entry is "P7a merged", so it can run before T_close; FIT-4 added deploys but not their timing.
CHANGE: Done-when for any phase merged before T_close reads "merged; row added to the W0-results 'deploy train' table". Add a one-session ops phase P4c-deploy, entered after T_close, that deploys the queued merges in Alembic-chain order and records /api/ops/health head and digest per row. "In flight" ends at merge.
CHECK: found=true supports=true — §0 says one phase in flight at a time. Rule 3 defers P6a onward to after T_close. P6a is "merge any time" with Done "deployed after T_close". P7a, P7b-2, P8a, P8b and P9a-1 enter on P1, P3c or earlier-merge conditions, with no T_close entry, yet end "deployed". Nothing in the plan separates merge from deploy for these phases, so the gap is real.

--- FIT2-02 [MAJOR] P2b (conf 0.65)
CLAIM: P2b does not fit one session. It holds D1, D3–D7, steps 6–7, the screens, the login banner and drain_audit.py with its matching rules for about ten kinds plus real-Postgres pytest in Docker. P4a also relies on a drain_audit feature P2b never scopes: "presence/punch rows are marked as test rows by drain_audit.py".
EVIDENCE: O-10 D1–D7 and E6 matching list; O-03 steps 6–7; P4a step 1; FIT-5 split the build out but kept the audit script in P2b.
CHANGE: P2b-1 (mobile): D1, D3–D7, steps 6–7. Done when mobile gates and expo export pass and the bundle grep is clean. P2b-2 (backend): drain_audit.py with a --test-window from/to option. Entry: P2b-1 merged, so the manifest schema is fixed. Done when Docker gates pass and pytest runs against a fixture manifest. Add P2b-2 to P4a's Entry, not P2c's.
CHECK: found=true supports=true — P2b (plan lines 267-304) does bundle D1, D3–D7, steps 6–7 and drain_audit.py (dry-run, read-only, per-tech since T_open) in one PR; O-10 E6 lists the matching kinds. P4a step 1 (line 436) says drain_audit.py marks protocol rows as test rows, but P2b never scopes that or any test-window option. Fit in one session is an inference.

--- FIT2-03 [MAJOR] P2b Entry (conf 0.6)
CLAIM: P2b's Done-when needs the owned domain and the field versionCode, but its Entry is only "P2a merged". D1 sets EXPO_PUBLIC_API_URL=https://api.<domain> and a "versionCode above the field value from P0a", and Done-when requires "bundle grep shows the owned domain".
EVIDENCE: P2b Scope D1 and Done-when; §4 row "Domain … Blocks P2c, P3a" (not P2b); P0a item 5 is only required for the pilot phone.
CHANGE: P2b Entry: "P2a merged; domain name fixed (P0b); P0a item 5 versionCode recorded for every roster phone (take the max)". Change the §4 Domain row to "Blocks P2b, P2c, P3a".
CHECK: found=true supports=true — P2b Entry (line 271) is only "P2a merged". Its D1 uses https://api.<domain> and a versionCode above the P0a field value, and Done-when requires a bundle grep showing the owned domain. §4 (line 864) lists Domain as blocking only P2c and P3a. P0a item 5 (line 162) does record versionCode. No standing rule or other section makes P2b depend on P0a/P0b.

--- FIT2-04 [MAJOR] P3c (conf 0.75)
CLAIM: P3c cannot run steps 2(a), 2(c) and 3 as written. Step 1 puts api. on the 503 responder and the Done-when keeps it there, so a forged-XFF test, "/api/ops/health through the tunnel carries X-FixFlow-Api", and 20 GET/POST latency samples from a phone all hit cloudflared's markerless 503, not the backend. app. and ops. are behind Access, so a phone curl cannot use them either.
EVIDENCE: P3c steps 1–3 and Done-when; O-08 §3 step 3; O-08 §4(ii) keeps Access off api. only.
CHANGE: Add step 1b: a temporary ingress preflight.<domain> → backend:8000 behind an Access service token (curl sends CF-Access-Client-Id/Secret). Run 2(a), 2(c) and 3 against it. Delete the route and token at the end of P3c and record this in W0-results.
CHECK: found=true supports=true — P3c step 1 puts api. on the 503 responder (O-08 §3 step 3), and Done-when requires api. to still answer 503 to a phone. Tests 2(a), 2(c) and the phone latency run in step 3 are phrased as "through the tunnel" or from a phone, so they have no reachable backend. O-08 §4(ii) keeps Access off api. only. The plan has no preflight host or token.

--- FIT2-05 [MAJOR] P3c step 7 (conf 0.7)
CLAIM: Step 7 waits on the nightly scheduler: "the first scheduler run is confirmed to write under backups/db-selfhost/". backup_hour/minute default to 02:30, so the session cannot reach its Done-when without waiting overnight.
EVIDENCE: backend/app/core/config.py:199-202; main.py:196-197; core/backup.py:106 run_db_backup.
CHANGE: Step 7: set BACKUP_ENABLED=true, then trigger one run by hand (`docker compose exec backend python -c "import asyncio;from app.core.backup import run_db_backup;asyncio.run(run_db_backup())"`) and list the prefix to read the object back. Make "first scheduled 02:30 object present" an Entry check of P4a.
CHECK: found=true supports=true — Evidence exists: config.py:199-200 backup_hour=2, backup_minute=30; main.py:192-198 schedules run_db_backup as a daily job at those times; backup.py:106 defines run_db_backup. P3c step 7 requires the first scheduler run confirmed under backups/db-selfhost/ before enabling, with no manual trigger anywhere in the plan, so it implies an overnight wait (and is circular with BACKUP_ENABLED).

--- FIT2-06 [MAJOR] P3a / P3c / P7b-2 (conf 0.6)
CLAIM: P3a's compose has no ops service ("Postgres 17 … backend, Caddy … cloudflared"), yet P3c step 1 puts "ops. behind Cloudflare Access" and P7b-2 binds ops-server "to the internal network". A P3c session would route a hostname to a service that does not exist.
EVIDENCE: P3a Scope bullet 1; O-08 §1 lists an ops service (Dockerfile.ops, OPS_* env, not published unless behind Access); P3c step 1; P7b-2 Scope.
CHANGE: Add to the P3a compose: the ops service (Dockerfile.ops, OPS_BACKEND_URL=http://backend:8000, OPS_SESSION_SECRET set, OPS_RAILWAY_* unset) and the ops.<domain> ingress line. Or drop ops. from P3c step 1 and record "ops console not deployed until P7b-2".
CHECK: found=true supports=true — O-08 §1 does define an ops service (Dockerfile.ops, OPS_* env, OPS_RAILWAY_* unset, not published unless behind Access). But P3a's scope lists only Postgres, backend, Caddy web and cloudflared. P3c step 1 puts ops. behind Access, and P7b-2 binds ops-server to the internal network. Nothing in the plan adds an ops service or ops. ingress to the compose.

--- FIT2-07 [MAJOR] P3a (conf 0.45)
CLAIM: P3a is sized "Medium" with no hatch. It holds the compose with five services, a Caddy and node:22 stage with CSP and a self-hosted font (a web code change), cloudflared config, the init SQL role, the hang stub and its test, the heartbeat cron, a multi-case runbook, CI on PG17, CLAUDE.md, the ADR and a local smoke. P3b needs only the compose, the restore runbook and CI on PG17.
EVIDENCE: P3a Scope; O-08 §1–§3 and §6; FIT-7/FIT-8 added the stub and heartbeat into P3a.
CHANGE: Relabel P3a Large. Hatch: "if long, move the hang stub (ops/hang-stub) and the heartbeat cron and its runbook section to P3a-2. Entry: P3a merged. Done when the stub's 20 s test and CI are green." P3c's Entry becomes "P3b done; P3a-2 merged".
CHECK: found=true supports=true — The v2 plan's P3a says "Size. Medium" with no "If long" hatch, while P3 phases elsewhere have one (lines 503, 625). Its scope lists the compose, Caddy/node:22 with CSP and font, cloudflared, hang stub with its 20 s test, heartbeat cron, runbook, PG17 CI, CLAUDE.md and ADR, and local smoke. FIT-7 and FIT-8 added the stub and heartbeat. The "init SQL role" item is not named in P3a. P3c's Entry is "P3b done".

--- FIT2-08 [MAJOR] P4b (conf 0.6)
CLAIM: P4b is "owner-run over days" with T_close at T_open + 7 days, so it is not one session. Window close (ceiling restore and restart, audit query, payroll windows, cursor re-seed) is distinct box work that P6b's Entry depends on. Late re-opens after T_close belong to no phase.
EVIDENCE: P4b Goal and Scope; O-10 F; standing rule 4; P6b Entry "T_close recorded".
CHANGE: Split it. P4b-n is one session per workshop visit, each filling per-phone E1–E6 rows. P4c is the window close in one session; it is done when T_close, the ceilings, the audit result, the payroll windows and the re-seed are recorded. P4r is a repeatable per-late-phone re-open: re-open, drain, AFTER audit, re-seed, one W0 row each.
CHECK: found=true supports=true — P4b is "owner-run over days" with T_close = T_open + 7 days, extendable once. The plan promises one phase per session. Window close is bundled into P4b scope, and P6b Entry needs "T_close recorded". Overstated: late re-opens are mentioned in P4b scope and standing rule 4. But P4b's Done-when doesn't cover them and they happen after T_close, so they have no completion criterion.

--- FIT2-09 [MAJOR] P5b / P5c (conf 0.65)
CLAIM: P5c starts the EAS build with Entry "the pilot tech on shift; the adb laptop at the workshop". The tech and the owner wait out the queue, and that build is the first native compile of the hand-written Kotlin/Java patches from P5a and P5b. A compile failure costs a full field session and then another queue wait.
EVIDENCE: P5c Scope "eas build --profile fleet (v2…)"; P5a/P5b "Native compile is P5c's build"; CLAUDE.md "A real Android compile is currently not gated"; FIT-12 and FIT-14 proposed "build submitted" at the end of the code phase.
CHANGE: P5b Done-when adds "fleet v2 build submitted, id recorded; build finished green (resume via eas build:list)". P5c Entry: "v2 build finished; cert and bundle grep checked". P5c scope starts at install-over.
CHECK: found=true supports=true — v2 P5c Entry requires the pilot tech on shift and the adb laptop, and its Scope begins with `eas build --profile fleet`; the title says "plus the queue wait". P5a/P5b Done-when says native compile is P5c's build, and CLAUDE.md says a real Android compile is not gated. FIT-12 and FIT-14 do propose "build submitted". The plan has no standing rule that submits the build earlier.

--- FIT2-10 [MAJOR] P5b (typed-name login) (conf 0.6)
CLAIM: "The login screen takes a typed name … instead of the pre-auth roster" cannot be a mobile-only change. The backend login accepts tech_id, not a name, and the app gets ids from the roster. No phase scopes a backend name lookup or its deploy, which would have to land before P5d-1.
EVIDENCE: backend/app/features/identity/schemas.py:24-26 (LoginRequest.tech_id); technician-app/src/lib/authApi.ts roster() and login(techId); G2 §5 ruling R3.
CHANGE: Either define the typed value as the tech id printed on the P3b sealed slip, which keeps it mobile-only and states that on the login screen, or add "login by name (case-folded, unique per shop)" to P7a and add "P7a deployed" to P5d-1's Entry.
CHECK: found=true supports=true — Evidence exists: LoginRequest takes tech_id, service.login looks up by tech_id, and authApi login(techId) gets ids from roster(). v2 P5b (lines 523-525) and R3 (line 965) specify a typed name as a mobile change, and P7b-1 only removes the roster. No phase scopes a backend name lookup, and P5d-1 does not require one.

--- FIT2-11 [MAJOR] P5d-1 (conf 0.55)
CLAIM: "The session may span a day" breaks the one-session rule. Installs and onboarding for every phone, plus the ~55-min O-01 protocol per OEM run serially on one adb laptop with the tech walking 150 m, scale with the roster's OEM count, which is unknown until P0a item 7.
EVIDENCE: P5d-1 Owner inputs; O-01 FIELD PROTOCOL durations (steps 0–5 ≈ 55 min); FIT-15.
CHANGE: P5d-1a: every phone installed and onboarded, T0 recorded, and the protocol run on the pilot OEM. P5d-1b (one session per two OEMs, inside T0 + 48 h): the remaining OEM protocol rows. P5d-2's Entry becomes "T0 + 48 h and every OEM row present".
CHECK: found=true supports=true — P5d-1 is titled "one session" yet says it may "span a day". Its scope covers per-phone install and onboarding plus the O-01 protocol on one phone per OEM. O-01 steps 0–5 sum to about 52–55 min per run (3+7+5+15+20+2), with a 150 m walk in step 4. The roster and its OEM count are unknown until P0a item 7. The plan has no other rule that resolves this.

--- FIT2-12 [MAJOR] P6b (conf 0.7)
CLAIM: P6b does not fit and leaves out a migration it needs. Payroll regeneration is impossible because payroll_export is unique on (shop, window) and a re-run returns the existing record untouched. O-04 §3 says regeneration needs payroll_export.version plus a key swap, and P6b's "one migration" omits it. The hatch defers only the heartbeat work and leaves seven Opus items.
EVIDENCE: attendance/models.py:372 payroll_export_window_key; attendance/service.py:1247-1253; O-04 §3 "Optional later (only with O04-F11)"; P6b Scope.
CHANGE: Split up front. P6b-1 (migration): adjustments action/client_id, payroll_export.version with the key swap, late flags, device_time window, accept, exclusion and the regeneration run. P6b-2: heartbeat mapping, app_event index, sampler-health read, per-session windows, dispatcher guard and fence audit script. P5d-1 and P13d enter on P6b-2.
CHECK: found=true supports=true — Evidence is real: models.py:372 has the unique key, and service.py:1247-1253 returns the existing export untouched. O-04 §3 lists payroll_export.version with a key swap as "only with O04-F11". P6b requires F11 regeneration but says "one migration" and never mentions version or the key swap anywhere in the plan. The hatch defers only the heartbeat index and sampler-health read.

--- FIT2-13 [MAJOR] P7a (conf 0.6)
CLAIM: The negotiate rule contradicts P7a's own constraints. It requires "a required reason and a flagged approval record" in a "migration-free" PR, but no approval table exists (O-06 item 3 is unbuilt). The deployed APKs send `note` as optional, so a required reason refuses their below-original negotiations, and the Done-when replay asserts "nothing the APK does is newly refused".
EVIDENCE: backend/app/features/jobs/schemas.py:145-147 (note optional); technician-app/src/lib/jobsApi.ts:285 negotiateBill(note?); O-06 item 3; P7a Deliverables.
CHANGE: Reword: "a below-original negotiate without a note is accepted and flagged; the reason is the existing note; the flag goes in the negotiate job_event payload (no migration)". Move the persisted reason to P8b's job_bill_revision.reason.
CHECK: found=true supports=true — P7a is "migration-free" yet requires "a required reason and a flagged approval record" (cites O-06 item 3). O-06 item 3 is an unbuilt approval table, and the plan creates decisions only in P9a-1. schemas.py:147 has note optional; jobsApi.ts:285 has note?. A required reason would refuse note-less APK negotiations, against the "nothing newly refused" replay. The plan's replay says "with reason", which partly softens this.

--- FIT2-14 [MAJOR] P8b (conf 0.6)
CLAIM: P8b's Done-when, "one head hash delivered through the channel" with the §4 default "email to the owner", needs a mail transport the backend does not have. There is no SMTP or email client anywhere in app/. Provider signup and credentials become an unscoped owner action in the middle of the phase.
EVIDENCE: grep for smtp/email in backend/app finds only FCM service-account email; §4 Chain anchor row; O-06 item 5.
CHANGE: P8b Entry adds "SMTP relay host and credentials in /etc/fixflow (owner)" and scope adds a smtplib core/mailer.py with a fake for tests. Alternatively ship "unanchored" in P8b and move delivery to P13b's put-only bucket under a separate account, the O-06 item 5 alternative.
CHECK: found=true supports=true — Grep of backend/ finds no smtplib, mailer or email client; "email" hits are only model fields and FCM. The v2 plan has no smtp or mail-transport text anywhere. P8b and §4 default the anchor to email to the owner, and Done-when requires a delivered head hash. Scope adds no mail transport or credentials. The "unanchored" fallback only covers an unconfigured channel.

--- FIT2-15 [MAJOR] P8b / P9a-2 (conf 0.5)
CLAIM: P8b generalises the chain to job_payment create/void with no backfill of existing payments. If the generalised verify reconciles the chain against job_payment, every historical payment reads as unchained. P9a-2's stager "calls verify_ledger_chain first and refuses to stage on a failure", so the P9a-2 Done-when ("payments … stage") fails on any restored DB.
EVIDENCE: CLAUDE.md: 0041 backfilled staff_ledger_chain for existing rows; O-07 §2 ledger entry (stager calls verify first); P8b Scope has no backfill.
CHANGE: Add to P8b: "the migration backfills chain create/void entries for existing job_payment rows using the pinned canonical serialisation (the 0041 precedent); the verify test runs on a DB seeded with pre-existing payments".
CHECK: found=true supports=true — P8b (lines 705-720) generalises chain.py to job_payment create/void and job_bill_revision, with no backfill of existing payments anywhere in the plan. Only the void-metadata backfill is mentioned (P8a). The existing verify flags a ledger row with no create event as missing_create (chain.py:260), and 0041 did backfill (chain.py:348). P9a-2 (line 748) refuses to stage on a verify failure, so historical payments would block it.

--- FIT2-16 [MINOR] P2a (conf 0.7)
CLAIM: P2a's step numbers do not match O-03's, yet the scope cites "w2/O-03-design.md steps 1–5" and asks for "the pure-module Jest tests named in the design for each step". The plan's Step 2 (5xx cap) is part of O-03 step 1, Step 3 is O-03 step 2, and Step 4 merges O-03 steps 3 and 4. A resuming session would map the wrong tests.
EVIDENCE: O-03 steps 1–4 vs P2a Steps 1–4; P2a Resume "checklist = the step list above".
CHANGE: Label the P2a bullets with O-03's numbering (1 incl. the 5xx cap, 2 sendOrQueue, 3 duty truth, 4 session loss, 5, 8, 9, 10), so each checkbox names its O-03 test file.

--- FIT2-17 [MINOR] P2a hatch (conf 0.5)
CLAIM: The hatch creates P2a-2 ("P2b's entry becomes P2a and P2a-2 merged"), but P2a-2 is not in the §3 checklist or the §2 graph. Gating P2b on it serialises a session that only the fleet build needs.
EVIDENCE: P2a Size line; §3 and §2.
CHANGE: Gate P2c (not P2b) on P2a-2: "P2c Entry adds P2a-2 merged, if opened". Add a conditional P2a-2 line to §3.

--- FIT2-18 [MINOR] P5c (conf 0.6)
CLAIM: P5c's Done-when gate "re-check catches it within N min" leaves N undefined. §4 fixes the related threshold at 15 min.
EVIDENCE: P5c Scope bullet 2; §4 Geofence pass thresholds "re-registered within 15 min".
CHANGE: Replace "N min" with "15 min (§4)" in P5c and P5d-2.

--- FIT2-19 [MINOR] P13d (conf 0.5)
CLAIM: P13d is one index plus two VALIDATEs, too small for its own session. The separate-deploy rule needs a separate PR and deploy, not a separate session.
EVIDENCE: P13d Scope; CLAUDE.md FK rule (separate PR/deploy).
CHANGE: Run P13d as a second PR and deploy at the end of the P13c session. Its Entry (P6b audit output clean, P8a merged) stays a precondition checked at that point.

--- FIT2-20 [MINOR] P6b Entry (conf 0.5)
CLAIM: P6b maps "heartbeat events from the P5a ring", but its Entry does not require P5a. The graph allows P6b straight after T_close, possibly before P5a fixes the event names.
EVIDENCE: P6b Scope bullet 3; §2 graph.
CHANGE: P6b (or P6b-2) Entry adds "P5a merged (event names fixed)", or P6b fixes the names in a shared constant that P5a consumes.

--- FIT2-21 [MINOR] P5a Entry (conf 0.6)
CLAIM: P5a's Entry reads "P2c merged (the fleet profile)", but P2c is an operations phase that merges nothing. The fleet profile lands in P2b.
EVIDENCE: P2c Workflow "no code"; P2b D1.
CHANGE: P5a Entry: "P2b merged (fleet profile)".

--- FIT2-22 [MINOR] P3a (conf 0.7)
CLAIM: "new FIXFLOW_BACKUP_PREFIX" already exists, so a session might add a duplicate setting.
EVIDENCE: backend/app/core/config.py:202 backup_prefix = "backups/db/".
CHANGE: Reword: "set FIXFLOW_BACKUP_PREFIX=backups/db-selfhost/ in the env file (existing setting)".

--- FIT2-23 [MINOR] P3a / §0 Gates (conf 0.6)
CLAIM: P3a moves CI to Postgres 17, but Appendix A, which runs every local backend gate, still starts postgres:16-alpine. Local and CI gates then disagree, against "a phase is not done until gates green locally and CI".
EVIDENCE: ORCHESTRATION-DESIGN Appendix A line 639; P3a Scope "CI runs the backend job on Postgres 17".
CHANGE: Add to P3a: "Appendix A gate image → postgres:17-alpine (with FIXFLOW_ENVIRONMENT=test from P1)".

--- FIT2-24 [MINOR] P10a (conf 0.45)
CLAIM: P10a spans backend, web and runbook, plus halt, lag and rotation alerts. The rotation alert (odoo_api_key_expires_on) only matters for P11's JSON-2 transport. The runbook needs the Odoo version, which §4 lists as blocking only P10b.
EVIDENCE: O-07 §4 key rotation; P10a Scope; §4 Tax/Odoo version row.
CHANGE: Hatch: "if long, move the halt/rotation alerts to P11; the lag alert stays". Change the §4 Odoo-version row to "Blocks P10a runbook labels (draft with 20.0 labels if unknown), P10b".

--- FIT2-25 [MINOR] P4a (conf 0.5)
CLAIM: P4a's Done-when is "AFTER matches the manifest", but on a mismatch R7 halts the fleet and the plan gives no terminal state. The session can neither finish nor say what follows.
EVIDENCE: O-10 R7; P4a Done-when.
CHANGE: Add: "On mismatch: done = mismatch tabulated per kind, a register row opened, fleet halted; P4a re-runs on the same phone after the fix (forward-only, R2)".

--- FIT2-26 [MINOR] P3b (conf 0.4)
CLAIM: P3b step 4 runs `--profile app` while "the tunnel is not yet created". If cloudflared and its credentials secret sit in the app profile, compose fails on the missing secret file or the container restart-loops.
EVIDENCE: P3b steps 4 and 7 and Done-when; O-08 §1 cloudflared credentials as a compose secret.
CHANGE: In P3a put cloudflared in its own profile `edge`. P3b uses `--profile app`; P3c step 1 adds `--profile edge` after the tunnel exists.

--- FIT2-27 [MINOR] §0 Resume / P3b, P3c, P4a, P5d-1 (conf 0.5)
CLAIM: The operations Resume lines point at step tables ("The step table", "The Pilot table") that P0a never creates; P0a's deliverables list only sections 1–12. P5d-1 resumes from `FIELD-VALIDATION-<date>.md`, whose date a fresh session cannot know.
EVIDENCE: §0 Resume; P0a Deliverables; P5d-1 Deliverables.
CHANGE: §0: "an operations phase's first act commits its numbered step table, copied from its Scope, to W0-results.md". Fix the name docs/program/FIELD-VALIDATION.md, with dates inside.

==================== attack:nearterm — 25 findings; ok: P0b, P1, P2a, P2b, DEP-2, FID-3, FID-4, FID-5, EXE-10, EXE-11, EXE-12, EXE-13, EXE-14, FIT-5, FIT-6
SUMMARY: I walked P0a through P4b in the order the owner would run them. Five problems would cost data or stop a session. (1) P0a has no runnable same-day Supabase dump or R2 archive step, and its item order could wake an old Railway backend, which would then prune the pre-death dumps. (2) The K=no branch has no code for accepting old-secret tokens, no safe proxy and no fleet build, the token decision comes after the pilot, and its Done-whens cannot be checked. (3) P3c runs its tunnel tests while api. is still on the 503 responder, and nothing logs _client_ip. (4) P3b's restore gate queries a table name that does not exist, and its ownership step is "ALTER …". (5) The 6-digit PIN rule covers only the script.

--- NT-1 [BLOCKER] P0a (conf 0.75)
CLAIM: Item 2 says "project restored or the logical backup downloaded", but no step tells the owner to run pg_dump and no command is given. P3b then allows "case (a) with a dump still to take", which contradicts the same-day MUST. By the time P0b procurement is done, a restored free project will have auto-paused again.
EVIDENCE: DEP-1 CHANGE asked P0 to take a pg_dump 17 through the session pooler with backup.py's flags (accepted by default, §6). O-08 §3 case a puts that dump on a box that does not exist at P0a. The owner has no Python and no psql. RUNBOOK-BACKUPS:104-107 covers the session pooler.
CHANGE: Item 2: reset the DB password in the dashboard if it is unknown, then run `docker run --rm -v C:/fixflow-dumps:/out postgres:17-alpine pg_dump "postgresql://postgres.<ref>:<pw>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" --format=custom --schema=public --no-owner --no-privileges -f /out/supabase-<date>.dump`. Record the hash with `sha256sum` (Git Bash). Verify the dump the same day with Appendix C. In P3b, strike "a dump still to take".
CHECK: found=true supports=true — Evidence exists: DEP-1 CHANGE, O-08 §3 case a (dump run "from the box"), and RUNBOOK-BACKUPS:104-107 all match. P0a item 2 says "restored or downloaded" with no pg_dump command, and pg_dump appears nowhere in the P0a text. P3b line 390 still allows "a dump still to take", which conflicts with the same-day MUST. The auto-pause timing point is inference, not stated in the plan.

--- NT-7 [BLOCKER] P4a / P4b (K=no, H=yes) (conf 0.7)
CLAIM: The O10-F15 decision on accepting old-secret tokens is made in P4b, but the pilot drains in P4a first, so a pre-v2 pilot bundle drops its job writes on the first 401. Accepting old-secret tokens also needs backend code that no phase builds: standing rule 3 limits the drain image to P1. P3b step 2 generates a new secret without keeping the old one.
EVIDENCE: O-10 B2: "Keep the old one only in the K=no/H=yes branch, if it is recoverable". O-10 BRANCH K=NO. §5 maps O10-F15 to "P0a records; P4b", and neither phase contains code.
CHANGE: P0a item 11: the owner decides O10-F15 when v2=no. P1 adds a default-off `FIXFLOW_LEGACY_JWT_SECRET` accepted only on write routes until a set expiry, with a test. P3b step 2 records the old secret if it is recoverable. P4a's Entry requires the decision before B6.
CHECK: found=true supports=true — O-10 B2 and BRANCH K=NO say what is cited. The v2 plan puts the old-secret sign-off in P4b (line 469; §5 line 902 says "P0a records v2 yes/no; P4b"), while P4a drains the pilot first. No phase builds legacy-token backend code: P1 has none, rule 3 limits the drain image to P1, and P3b step 2 only generates a new secret. The claimed gap exists.

--- NT-2 [MAJOR] P0a (conf 0.5)
CLAIM: Item 2 accepts "the logical backup downloaded" from the dashboard as meeting the MUST. P3b, however, restores only with `pg_restore --exit-on-error` (custom format, public schema). A dashboard download is likely plain SQL that includes the Supabase auth/storage schemas and roles. No step tests it, and no branch covers the case where it is the only artefact.
EVIDENCE: P3a runbook restore chain: DROP SCHEMA → pg_restore --exit-on-error. Appendix C uses pg_restore. RUNBOOK-BACKUPS:19-22 says Supabase-internal schemas are not ours to restore.
CHANGE: Item 2: if only a dashboard download is available, run `pg_restore -l` on it inside postgres:17-alpine the same day and record the format. If it is plain SQL, record that it needs an extraction step: load it into a scratch PG17 with ON_ERROR_STOP off, then pg_dump the public schema in custom format. Done when an Appendix C restore of the resulting file passes.
CHECK: found=true supports=true — Plan P0a item 2 (lines 154-157) accepts a "logical backup downloaded" with only path and sha256 recorded; no format check. P3a/P3b restore uses pg_restore --exit-on-error (line 350); design Appendix C (line 689) assumes a custom-format dump. RUNBOOK-BACKUPS:19-20 says auth/storage schemas aren't ours to restore. No plain-SQL handling found anywhere in the plan.

--- NT-3 [MAJOR] P0a (conf 0.5)
CLAIM: Item 2 (restore Supabase) comes before item 4 (Railway state). If any old Railway service still exists, restoring its database can revive it. It would then drain field phones without a manifest at the 24 h ceiling, and its 02:30 backup would prune every backups/db/ dump older than 30 days, which is all of them, before item 3's archive copy exists.
EVIDENCE: backup.py:106-134: dump, then prune keys under backup_prefix older than retention. O08-F02. Standing rule 1. Item 3: "before any backend ever boots against the bucket".
CHANGE: Reorder P0a to item 4, then 3, then 2. If a Railway service exists, remove its database variable or scale it to 0 and record that before restoring Supabase. Resetting the Supabase DB password before the restore also cuts any old backend off. Add both to item 2.
CHECK: found=true supports=true — backup.py:106-135 dumps, uploads, then deletes keys under backup_prefix older than retention. P0a lists Supabase restore (item 2) before Railway state (item 4) and states no ordering constraint. A search of the whole plan found nothing on a surviving old Railway service reviving after the restore, or on cutting its DB access. Item 3 only guards against "any backend ever boots".

--- NT-4 [MAJOR] P0a (conf 0.65)
CLAIM: Item 3 ("every dump copied to archive/pre-selfhost/") gives no tool. The Cloudflare dashboard cannot copy objects, and the owner has no Python, rclone or aws CLI. About 30 dumps would each have to be downloaded and re-uploaded by hand. The item also never says to keep a laptop copy.
EVIDENCE: RUNBOOK-BACKUPS:128: the last drill used a scratchpad boto3 script via `railway run`, and neither is available. O-08 §3: "copy dumps to archive/pre-selfhost/ in R2 and to the laptop FIRST".
CHANGE: Item 3: mint an R2 API token, then run `docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli --endpoint-url https://<acct>.r2.cloudflarestorage.com s3 cp --recursive s3://job-media/backups/db/ s3://job-media/archive/pre-selfhost/`, a second `s3 cp --recursive` to a mounted laptop folder, and `s3 ls` before and after. Record the listing.
CHECK: found=true supports=true — Item 3 (plan line 158) says only "every dump copied to archive/pre-selfhost/" with no tool and no laptop copy; item 2 mentions the laptop only for the Supabase dump. RUNBOOK:128 shows scratchpad boto3 via railway run, and O-08 line 47 says "to the laptop FIRST". The design doc confirms no Python on this machine. rclone/aws CLI and Cloudflare-dashboard claims are unverified inference.

--- NT-5 [MAJOR] P0a (conf 0.6)
CLAIM: Item 6 says to take the A3 photos "without opening the app where the list is reachable from a notification; otherwise note 'not reachable'". The DID NOT SYNC list is on ClockScreen inside the app, so most phones will record "not reachable". Under K=no those photos are the whole AFTER proof.
EVIDENCE: O-10 A3: "the only BEFORE evidence ... and the whole proof in the K=no branch". O-01 step 0 makes the app safe to open by cutting its network first.
CHANGE: Item 6: turn on airplane mode with Wi-Fi off (available on every OEM), open FixFlow, photograph ClockScreen and each job banner, close the app, then turn airplane mode off. Record per phone. Keep "not reachable" only for a phone whose session is gone.
CHECK: found=true supports=true — Plan item 6 (line 166-167) says to photograph the lists without opening the app, where reachable from a notification, otherwise "not reachable". O-10 A3 says to photograph the ClockScreen list and calls it the only BEFORE evidence and the whole proof for K=no. O-01 step 0 cuts the app's network before opening it. Nothing in the plan says the list is reachable from a notification, and no airplane-mode route appears. The gap is real.

--- NT-6 [MAJOR] P0a / §2 branch box (conf 0.55)
CLAIM: Per-app data-off applies only "If H=no". With H=yes, the old host keeps answering the edge 404 until P3c step 4 deploys the hang stub, possibly weeks later, and pings and travel keep being dropped. Neither the plan nor O-01 step 0 has a branch for OEMs (e.g. Samsung One UI) that have no per-app Wi-Fi toggle.
EVIDENCE: O-10 C, H=no: "the edge 404 keeps parking punches and crossings ... dropping pings and travel (lost)". The same is true for H=yes until the stub is live. O-01 step 0 assumes an "OEM per-app data settings" screen.
CHANGE: Item 12: apply it to every phone until either its update or a verified hang stub. Record per phone how it was done: "per-app toggle", "background data off + Wi-Fi blocked by <method>", or "not available". Use airplane mode as the protocol and P2c fallback.
CHECK: found=true supports=true — O-10 line 42 says exactly the quoted text, for H=no only. Plan P0a item 12, the branch box (line 101) and P3c step 4 limit per-app data-off to H=no. H=yes is not covered before the stub deploys in P3c. O-01 step 0 assumes an OEM per-app data screen, with no fallback for phones lacking one. Whole-plan search found no other handling.

--- NT-8 [MAJOR] P3a / P3c / P4a (K=no, H=yes) (conf 0.65)
CLAIM: P3c says "proxy prepared", but no phase builds the proxy. A stock reverse proxy returns 502 when the upstream fails and passes Cloudflare's 530 through. The old APK has no D2 classification, so it counts those 5xx and parks after five flushes. That breaks standing rule 5 ("never 5xx") and leaves the R3 abort lever (cutting the tunnel) unsafe under K=no.
EVIDENCE: O-10 C ("every 5xx counts and parks after 5 flushes"), R3 ("With D2, the Cloudflare error is connectivity"), R4. P3a builds only the hang stub.
CHANGE: P3a: add a proxy mode to ops/hang-stub that forwards to api.<domain> and hangs for at least 20 s, instead of answering, on any upstream error, 5xx or timeout. Test it. P3c verifies it with the tunnel stopped. P4a K=no: the abort is switching the stub to hang, never cutting the tunnel.
CHECK: found=true supports=true — v2 P3c item 4 says "proxy prepared but not enabled" for K=no/H=yes. P3a builds only the hang stub, and no phase specifies, builds or tests the proxy. Nothing covers proxy upstream failure or K=no abort. O-10 says every 5xx parks after 5 flushes, and R3 relies on D2, which the old APK lacks. The gap is real.

--- NT-9 [MAJOR] P2c / §2 branch box (K=no) (conf 0.7)
CLAIM: With K=no, "P2c is skipped", yet P4b ends with a "fresh install of the fleet build" that no phase builds or verifies. The new signing cert is never recorded or exported, so P5c and P14 builds have no reference to check against.
EVIDENCE: P2c: "If K=no, skip: the fleet build becomes the fresh install". O-08 §1: the keystore is not re-mintable. O-10 D1: "Verify the URL in the built bundle".
CHANGE: P2c runs in both branches. With K=no it builds `--profile fleet`, records the new cert SHA-256, exports the keystore and greps the bundle. A fresh install on the spare phone replaces the install-over proof. In the branch box, change "P2c is skipped" to "P2c runs without the install-over step".
CHECK: found=true supports=true — Partly true. The plan skips P2c at K=no, yet P4b installs "the fleet build", and no phase builds or bundle-greps it. O-10 D1 does require the URL check. But "cert never recorded or exported" is wrong: P0a item 5 compares against the EAS keystore cert and exports the keystore, so P5c has a reference.

--- NT-10 [MAJOR] P4a / P4b (conf 0.65)
CLAIM: Both Done-whens are K=yes only: P4a's "AFTER matches the manifest; the pilot is released" and P4b's rows ("manifest receipt id, install-over result"). Under K=no there is no manifest, and the AFTER check is photos-only. Under K=no/H=no there is no drain at all. Neither phase can be closed in those branches.
EVIDENCE: O-10 BRANCH K=NO: "The AFTER check runs against the photos only". H=no: "transcribe the photos ... declare the rest lost". EXE-3, FID-2.
CHANGE: Add per-branch Done-whens. K=no/H=yes: the per-tech server rows since T_open match the A3 photo counts, the owner signs off, then a fresh install. K=no/H=no: every photographed row is transcribed or declared lost in W0-results, the owner signs off, then a fresh install.
CHECK: found=true supports=true — O-10 "BRANCH K=NO" has the cited lines (photos-only AFTER check; H=no transcribe and declare lost); EXE-3 and FID-2 exist. The v2 branch box (lines 94-100) describes the K=no steps, but P4a's Done-when ("AFTER matches the manifest") and P4b's row fields (manifest receipt id, install-over result) assume a manifest. No per-branch Done-when exists. Mostly accurate, though P4b's "Every row filled" is loosely satisfiable.

--- NT-11 [MAJOR] P0a / P2c / P4b (conf 0.6)
CLAIM: P0a's Done-when requires item 5 "for at least the pilot phone", and P2c sets the versionCode "above the field value". K and versionCode are per-phone facts. A phone built from a different build (higher versionCode or another cert) fails P4b E2, and P4b has no branch for it.
EVIDENCE: O-10 E2: "On INSTALL_FAILED_UPDATE_INCOMPATIBLE or a version downgrade: STOP this phone ... re-check K". O-10 A2 does the K check "on each phone".
CHANGE: P2c Entry: item 5's versionCode and cert are recorded for every roster phone, and the fleet versionCode is above the fleet maximum. P4b: a phone with a different cert follows the K=no row for that phone, while the rest of the fleet stays K=yes.
CHECK: found=true supports=true — Evidence exists (O-10 E2 line 63; A2 "on each phone"). v2 P0a item 5 is "per phone", but Done-when needs it only for the pilot phone. K is a single fleet-wide branch parameter, P2c uses one "field value", and P4b has no per-phone branch for a cert mismatch or downgrade; only O-10 E2's STOP applies.

--- NT-12 [MAJOR] P3c (conf 0.75)
CLAIM: Step 1 leaves `api.` on the 503 maintenance responder, and the Done-when needs it still answering 503. Yet tests 2(a) XFF, 2(c) health marker, 2(d) selfie presign/PUT/commit and step 3's GET/POST latency all need api.<domain> routed to the backend. As written, the phase cannot be executed.
EVIDENCE: P3c steps 1-3 and the Done-when "api. still answers 503 to a phone". O-10 B6 opens the route only in P4a.
CHANGE: P3c adds a temporary `preflight-api.<domain>` ingress to backend:8000 for steps 2-3, which no APK knows. Delete it and record the deletion before the phase ends. api. stays on the 503 responder throughout.
CHECK: found=true supports=true — P3c step 1 (lines 398-399) puts api. on the 503 responder, and the Done-when (line 421) requires api. still answering 503. Tests 2(a), 2(c), 2(d) and step 3 need api. routed to the backend. P4a B6 (line 440) opens the route. No preflight host exists anywhere in the plan. Searching the whole plan found no other test hostname or standing-rule workaround.

--- NT-13 [MAJOR] P3c (conf 0.8)
CLAIM: Test 2(a) asks "what `_client_ip` logs", but `_client_ip` logs nothing: it only feeds `_ip_limiter.allow`. The owner has no way to read the value that decides P7b-1's keying.
EVIDENCE: backend/app/features/identity/router.py:57-63,76 has no logger call. P1's scope has no echo or log for the resolved IP.
CHANGE: P1 adds the resolved `_client_ip`, the raw X-Forwarded-For and CF-Connecting-IP to the ops-token-gated deep-health response (or one INFO log line on /api/auth/login), with a test. P3c 2(a) reads it with `docker compose logs backend | grep client_ip`, or reads the health JSON, after a forged-XFF curl.
CHECK: found=true supports=true — Plan line 400-401 says test 2(a) records "what `_client_ip` logs". In router.py, `_client_ip` (lines 57-64) only returns a value; it is used at line 76 for `_ip_limiter.allow`, and the file has no logger or print. No part of the plan adds an echo or log of the resolved IP.

--- NT-14 [MAJOR] P3b (conf 0.75)
CLAIM: Step 3 runs "Appendix B gate against the O-08 §3 baselines", but Appendix B queries `attendance_presence`, which does not exist. Run with ON_ERROR_STOP=1, the gate aborts. Appendix B also has no non-voided payment sum or staff_ledger counts, though P3b requires both. "ALTER … OWNER TO fixflow_app" is not a command. EXE-9's "name the exact commands" is not carried into P3b.
EVIDENCE: attendance/models.py:166 `attendance_presence_event`. Appendix B lines "attendance_presence" and the width_bucket query. Appendix C runs with `-v ON_ERROR_STOP=1`.
CHANGE: Fix Appendix B: use `attendance_presence_event` and add `SELECT sum(amount_paisa) FROM job_payment WHERE NOT voided` and counts for staff_ledger and staff_ledger_chain. In P3b, run the DROP SCHEMA and the pg_restore as `-U fixflow_app` (the DB owner) so no ALTER is needed. Spell out `docker compose cp` / `exec postgres psql -f`.
CHECK: found=true supports=true — Appendix B is in ORCHESTRATION-DESIGN-2026-10.md (lines 668-683). It queries `attendance_presence` (twice); the model table is `attendance_presence_event`, and the "adjust names" comment is on one line only. Appendix C runs it with ON_ERROR_STOP=1. Appendix B has no payment sum. It does have all-table counts, which include staff_ledger, so the counts part is overstated. P3b has no exact commands, and "ALTER … OWNER TO" is v2's own wording.

--- NT-15 [MAJOR] P1 / P4b (conf 0.7)
CLAIM: P1 enforces the 6-digit minimum only in `set_pin.py`. The service still allows 4-digit tech PINs. During P4b, a manager who re-issues a lost slip or clears a lock through the web set_pin (CLAUDE.md's recovery path) can set a 4-digit PIN, which reopens O05-04.
EVIDENCE: backend/app/features/identity/service.py:31 `MIN_PIN_DIGITS_TECH = 4`, applied at :163-164. §5 maps O05-04 to P1 (6-digit minimum).
CHANGE: P1 raises MIN_PIN_DIGITS_TECH to 6 in service.py, so the endpoint and the script share one rule. Add a test: a manager set_pin with 4 digits on a tech is rejected. P4b: re-issue a slip only through set_pin.
CHECK: found=true supports=true — service.py:31 sets MIN_PIN_DIGITS_TECH = 4, applied at :163. Plan P1 (line 213) and §5 (line 906) put the 6-digit minimum only in set_pin.py (the file doesn't exist yet). No plan text raises the service constant or covers the web set_pin endpoint. P4b has no slip re-issue step, so that scenario is inferred. The 4-digit path stays open.

--- NT-16 [MAJOR] P3c step 7 (conf 0.6)
CLAIM: Step 7 waits for "the first scheduler run" before confirming backups, but backups run only at 02:30 and the scheduler is the only caller of run_db_backup. The session cannot finish step 7 without waiting overnight.
EVIDENCE: backup.py:106 (only the scheduler calls it). O-08 §3: "run one manual backup and one restore drill", with no command given.
CHANGE: Step 7: set FIXFLOW_BACKUP_PREFIX=backups/db-selfhost/, run `docker compose exec backend python -c "import asyncio;from app.core.backup import run_db_backup;asyncio.run(run_db_backup())"`, confirm the new key in R2, restore it once with Appendix C, then set BACKUP_ENABLED=true.
CHECK: found=true supports=true — backup.py:106 defines run_db_backup; main.py:195 registers it only as the daily job, and the config comment gives 02:30. v2 P3c step 7 (line 416) requires confirming "the first scheduler run" before BACKUP_ENABLED=true, yet the scheduler job exists only when BACKUP_ENABLED is true. The job therefore never runs while it is false, so step 7 as written is circular. No manual-run step appears anywhere in the plan. O-08 §3 says "run one manual backup" with no command.

--- NT-17 [MAJOR] P4a step 2 (B5) (conf 0.5)
CLAIM: "B5 pre-drain snapshot (pg_dump to the archive prefix)" points a session at run_db_backup with the archive prefix. After the upload, that function prunes every key under the prefix whose fixflow-db-<stamp> is older than 30 days, which would delete the pre-death dumps P0a copied into archive/pre-selfhost/.
EVIDENCE: backup.py:50-75: `_KEY_RE.search` matches copied keys, and keys_to_prune deletes those past retention. O08-F02.
CHANGE: B5: run `docker compose exec backend pg_dump --format=custom ...` to a file named `predrain-<stamp>.pgdump`, which the key regex does not match, and upload it to `archive/pre-drain/`. Never call run_db_backup with an archive prefix. Add the same warning to the runbook.
CHECK: found=true supports=false — backup.py:37-75 and O08-F02 exist and show the pruner deletes regex-matching keys past retention. But v2 line 438 only says "pg_dump to the archive prefix"; it never names run_db_backup. Lines 158-159 and 417 say the nightly pruner never lists archive/ and the nightly writes to backups/db-selfhost/. Only a vague-wording risk exists.

--- NT-18 [MINOR] P3c step 2(e) (conf 0.65)
CLAIM: `curl -I https://app.<domain>` is run after step 1 has put app. behind Cloudflare Access. Curl gets Access's redirect and Cloudflare's own headers, not Caddy's CSP.
EVIDENCE: P3c step 1 (Access on app. and ops.) and step 2(e).
CHANGE: 2(e): send an Access service token (`-H CF-Access-Client-Id: … -H CF-Access-Client-Secret: …`), or run `docker compose exec web wget -S -O- http://localhost/` on the box and check the CSP header.

--- NT-19 [MINOR] P3b (conf 0.55)
CLAIM: Only the case-c extras check the roster, but O-10 B3 requires every tech id any phone holds to exist in every case. A case-b dump from 2026-08-02 lacks techs added later. P3b also never records T_restore. Step 5 sets the fence with no command, and the manager web cannot be reached because the tunnel does not exist yet.
EVIDENCE: O-10 B1 ("write down T_restore") and B3 (roster, fence). P3b steps 5-7.
CHANGE: Step 5: for each tech id in P0a item 7, run `SELECT id FROM technician` and create any that are missing. Record T_restore from Appendix B's max timestamps. Give the fence UPDATE/INSERT as a `docker compose exec postgres psql` command.

--- NT-20 [MINOR] P4a step 6 / standing rule 6 (conf 0.55)
CLAIM: Standing rule 6 makes the written release notice the only release, but its text exists nowhere. Neither does the P0a fleet notice text. EXE-15 asked for the tech-facing release script.
EVIDENCE: EXE-15 CHANGE: "the tech-facing release script" (accepted by default). P4a step 6 names the notice without content or location.
CHANGE: P2b commits `docs/program/notices/fleet-hold.md` and `release.md` (English and Urdu). The release notice lists what may now be done (open the app, clock in, travel, Retry), what is still forbidden (Discard, uninstall, clear data) and whom to call.

--- NT-21 [MINOR] P2c (conf 0.6)
CLAIM: P2c checks the cert and the install-over but never greps the EAS-built APK. P2b's grep covers only `expo export`, and §P2b says every later build "gets the bundle grep".
EVIDENCE: O-10 D1: "Verify the URL in the built bundle". P2b Done-when.
CHANGE: P2c deliverable: unzip the built APK and run `grep -a` on assets/index.android.bundle for `api.<domain>` and `jobs.outbox.v2`. Record the result.

--- NT-22 [MINOR] P2b / P4a (conf 0.5)
CLAIM: P4a says the protocol rows are "marked as test rows by drain_audit.py", but P2b's drain_audit spec has no test-window input, so the pilot's AFTER delta behaviour is undefined.
EVIDENCE: P2b drain_audit bullet. P4a step 1. FID-3.
CHANGE: P2b: drain_audit takes `--test-window START END` and reports the rows in that window separately, while still counting them toward the landed delta. Add a pytest for it.

--- NT-23 [MINOR] P4b (conf 0.6)
CLAIM: The T_close step list leaves out removing the old-hostname hang stub or proxy and turning off any old-secret acceptance. A proxy that accepts old-secret tokens would stay open indefinitely.
EVIDENCE: O-10 C ("Remove the stub after the last phone is updated") and F ("Delete the old-hostname stub").
CHANGE: P4b at T_close: delete the stub or proxy (and, if H=yes, record whether the Railway domain is released or held). Unset FIXFLOW_LEGACY_JWT_SECRET and restart.

--- NT-24 [MINOR] P3a (conf 0.55)
CLAIM: P3a moves CI to Postgres 17, but design Appendix A's local gate still starts postgres:16-alpine, and §0 requires both to be green.
EVIDENCE: Appendix A: `postgres:16-alpine`. P3a: "CI runs the backend job on Postgres 17 (O08-F12)".
CHANGE: P3a also changes Appendix A to postgres:17-alpine in the same PR.

--- NT-25 [MINOR] P3c step 3 (conf 0.45)
CLAIM: "Fail → G2-D1 VPS fallback" has no re-entry path. The restored DB and the PIN rotation sit on the box, so a VPS needs P3b and P3c again.
EVIDENCE: P3c step 3. O-10 R1: before any phone drains, every server step can be redone.
CHANGE: Add: on a latency fail, re-run P3b and P3c on the VPS from the same dump, keep the same slips, and discard the box DB (R1). P0b records the VPS date.

FAILED: []
