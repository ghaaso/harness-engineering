# Stage-3 verification of SHIP-PLAN-2026-11 v3 (2026-11-01) — adjudicated in the plan §6.3

Raw output of the `ship-plan-v3-verify` workflow (run `wf_c6bf7716-20d`): three Opus reflection
checkers (every v2-verification finding re-verified against v3) and one Opus cold consistency
read of v3, with Sonnet citation checks on every blocker/major. 52 findings: 4 blockers,
22 majors, 26 minors. Plan v4 was written from this file.

Note: reflect:A and reflect:C report that the repository copy of critique-2 was only a header
when they started (a path error, fixed within the same minute); they read the findings from the
workflow output instead, so their coverage is complete.

---

==================== reflect:A — 8 findings; ok: RFIT-2, RFIT-3, RFIT-4, RFIT-5, R-DEP-4, R-DEP-14, R-DEP-13, R-DEP-18, R-DEP-1, R-DEP-22, R-DEP-10, CMP-1-R, CMP-11-R, CMP-7-R, CMP-25-R
SUMMARY: The critique-2 file holds only its header, so the 23 reflection findings were taken from the wf_c9da77c6-1d4 journal: RFIT-1..6, nine R-DEP and eight CMP-R. 15 are adequately reflected in v3. Eight are not cleanly resolved. RFIT-1: P5d-1a still installs every phone in one session. R-DEP-3/CMP-3-R: the legacy verifier never says to skip exp on field tokens, which are all expired, and P0a item 2 asks for K before item 6 sets it. CMP-15-R: P4r drains and late rows after T_close are never regenerated. CMP-17-R/RFIT-6: P5d-1a and P7b-1 both claim to turn the PII setting on, and detail minimisation has no setting gate. CMP-18-R: P12a must deploy before a box exists. R-DEP-12: the fence audit can be stale by P13d.

--- RFL3-1 [MAJOR] P5d-1a / P14-fleet (RFIT-1) (conf 0.6)
CLAIM: RFIT-1 is only half reflected. P4b, P4r and P5d-1b became (×n) phases, but P5d-1a still needs every phone installed in one session: 'Done when. Every phone on v2', plus onboarding per phone and the ~55 min pilot-OEM protocol with the tech on shift. P4b already accepts that not every phone turns up at one visit. P14-fleet is (×n) yet points to 'Per-phone install rows as in P5d-1a', so the two phases disagree on the unit of work.
EVIDENCE: RFIT-1 proposed_change (P5d-1-install-n, one batch of phones per session); v3 P5d-1a Scope and Done-when; P4b (×n) 'each roster phone present'; P14-fleet (×n); §0 Sessions
CHANGE: Split P5d-1a into P5d-1a (×n) 'Fleet install, one session per workshop visit; per-phone rows in FIELD-VALIDATION.md; Done (phase) = every roster phone on v2, T0 = last install' and P5d-1a-OEM 'pilot-OEM protocol steps 1–4 incl. 3b/3c'. Point P5d-1b and P7b-1 Entry at the install phase's completion.
CHECK: found=true supports=true — RFIT-1 exists in critique-2 (line 14). In v3, P5d-1a (line 622) is "one session" with Done-when "Every phone on v2", plus the pilot-OEM protocol. P4b (line 535) and P5d-1b are (×n). P14-fleet is (×n) but reuses "per-phone install rows as in P5d-1a". The line 142 checklist and §3 do not mark P5d-1a repeatable. The gap is real.

--- RFL3-2 [MAJOR] P1 legacy verifier / P3b step 2 (R-DEP-3, CMP-3-R) (conf 0.6)
CLAIM: As written, the verifier the K=no fix added would accept no field token. P1 accepts FIXFLOW_LEGACY_JWT_SECRET tokens 'until FIXFLOW_LEGACY_JWT_EXPIRES_AT', but it never says to skip the token's own exp claim. Tokens live 30 days, prod died in 2026-08, and so every field token is already expired. O-10 says to accept 'expired tokens signed with the old secret'. An implementer who uses the standard decode_access_token (PyJWT verifies exp, and deps.py turns that into a 401) ships a verifier that rejects every pre-v2 write.
EVIDENCE: backend/app/core/config.py:154 jwt_expire_minutes = 30 days; backend/app/features/identity/deps.py:41-44; w2/O-10-design.md line 96; v3 P1 Legacy-secret verifier bullet
CHANGE: P1 bullet: 'verifies the signature against the legacy secret with exp NOT enforced (the window expiry replaces it); sub/ver/active checks kept; write routes only; tests: a token whose exp is 60 days past is accepted on a write route and refused on a read route and after EXPIRES_AT'.
CHECK: found=true supports=true — The v3 plan mentions the legacy verifier only at line 257-259 and at line 434. Neither says the token's own exp is skipped. The code is as cited: config.py:154 sets a 30-day expiry, and decode_access_token (security.py:65-67) lets PyJWT enforce exp. deps.py:41-44 turns that into a 401. O-10 line 96 does say to accept expired tokens. So an implementer using the standard decode would reject every pre-v2 token.

--- RFL3-3 [MAJOR] P4r / P6b-1 (CMP-15-R) (conf 0.5)
CLAIM: CMP-15-R asked that the retroactive late_sync and payroll regeneration cover [T_close, P6b deploy] as well as the drain windows. v3 aligned the ceiling at 336 h. But P6b-1 regenerates only 'every window covering the P4c date ranges', and P4r drains late phones after P4c without recording their min/max device_time. Any payroll window those late drains touch, and any T_close→P6b-1 late row, is never regenerated, even though the rows now land at device_time up to 14 days back.
EVIDENCE: CMP-15-R proposed_change; v3 P4c 'per-tech min/max device_time of the drained rows recorded (for P6b-1)'; P4r Scope (no date-range record); P6b-1 regeneration bullet
CHANGE: P4r Scope: 'record per-tech min/max device_time of the drained rows'. P6b-1: regenerate every window covering the P4c and P4r ranges plus late_sync rows received between T_close and the P6b-1 deploy. A P4r after P6b-1 deploys adds its own regeneration step.
CHECK: found=true supports=true — CMP-15-R exists in critique-2 and asks for regeneration to cover [T_close, P6b deploy]. In v3, P4c (line 547-549) records per-tech min/max only for its drained rows. P4r (556-560) has no range record. P6b-1 (678) regenerates only windows covering the P4c ranges. Nothing covers P4r drains or T_close-to-P6b-1 late rows, though the ceiling is 336 h from T_close.

--- RFL3-4 [MINOR] P5d-1a vs P7b-1 / §6.2 (CMP-17-R, RFIT-6) (conf 0.65)
CLAIM: Two phases now claim the same act. P5d-1a says 'the PII-minimisation setting turned on and recorded (P7b-1 may already have done it)'. That is impossible: P7b-1's Entry requires 'P5d-1a done'. §6.2 rules that P7b-1 turns it on and that P5d-1a only 'records it if already on'. P5d-1a also does not require P7a deployed, so the setting may not exist yet when P5d-1a tries to switch it on.
EVIDENCE: v3 P5d-1a Scope; P7b-1 Entry and Scope; §6.2 CMP-17-R narrowing; §4 PII row; §5 O05-06 row
CHANGE: P5d-1a: delete the 'turned on' clause (or replace it with 'record the setting's current value'). Only P7b-1 turns it on, matching §6.2 and §5.

--- RFL3-5 [MINOR] P7a (CMP-17-R) (conf 0.5)
CLAIM: The CMP-17-R fix minimises unclaimed job detail with no condition, while the list's minimisation sits 'behind a per-shop setting, default off'. With the setting off, the list still returns customer_address to any tech, so hiding it on detail protects nothing. Meanwhile, from the P4c train onward, v1-fleet techs lose the phone and address on the detail screen. That is the UX change §4 defers 'until v2 is fleet-wide'. The v1 APK renders the nulls without crashing, so the cost is the UX change, not a crash.
EVIDENCE: v3 P7a first and fourth bullets; §4 PII row; technician-app/src/features/jobs/JobDetailScreen.tsx:519-520; JobsListScreen.tsx:53
CHANGE: P7a: 'unclaimed detail and list are minimised together under the same per-shop setting; another tech's claimed job → 403 regardless'. Add a test with the setting off and on.

--- RFL3-6 [MINOR] P12a (CMP-18-R) (conf 0.5)
CLAIM: P12a's Entry is 'P3a merged', but its Done-when is 'web image rebuilt and deployed'. No box exists until P3b, and no phase states when the web profile is first brought up (P3b starts db and app; P3c 2(e) assumes the web container is running). A session started right after P3a cannot finish.
EVIDENCE: v3 P12a Entry and Done-when; P3b steps 3-4 (profiles db, app only); P3c step 2(e); §0 'Web-only changes … may deploy at any time'
CHANGE: P12a Entry: 'P3a merged; P3b done (box up)'. Also add '--profile web' to P3b step 4 or P3c step 1 so the deploy target exists.

--- RFL3-7 [MINOR] P0a item 2 (R-DEP-3) (conf 0.55)
CLAIM: The K=no fix put 'if K=no (item 6), the old FIXFLOW_JWT_SECRET is copied … and sealed' into item 2. The items are to be run 'in this order', so at item 2 the owner does not know K yet. Item 2 is also the step that cuts off the Railway service, so the secret, the only input the legacy verifier needs, could be lost before K is known.
EVIDENCE: v3 P0a 'these numbered items in this order'; item 2; item 6; P3b step 2; P1 Legacy-secret verifier
CHANGE: Item 2: 'copy and seal the old FIXFLOW_JWT_SECRET unconditionally before any cut-off (used only if K=no & H=yes & v2=no)'.

--- RFL3-8 [MINOR] P13d (R-DEP-12) (conf 0.4)
CLAIM: The R-DEP-12 fix gates P13d on 'the P6b-2 audit clean', and that audit runs once, at the P6b-2 deploy. Unlike the NOT VALID CHECK and FK, which police new rows, nothing stops a second active fence appearing afterwards: the runbook fence UPDATE/INSERT command can add one, and upsert_geofence has a get-then-add path. If the unique index meets a duplicate at boot, start.sh restart-loops, the outage R-DEP-12 named.
EVIDENCE: backend/app/features/attendance/repository.py:355-372 (get_geofence then add); v3 P3a runbook 'fence UPDATE/INSERT command'; P6b-2 Done-when; P13c/P13d Entry
CHANGE: P13d Entry: 're-run the P6b-2 audit script on the box in this session, immediately before the deploy; attach that output'.

==================== reflect:B — 11 findings; ok: EXE-3-r1, EXE-3-r3, EXE-13-r1, EXE-16-r1, EXE-2-r1, EXE-9-r1, EXE-5-r1, EXE-18-r1, EXE-24-r1, FID-9-regen, FID-21-fk, FID-3-testrows, FID-15-order, FID-6-p5c, CON-2, CON-3, CON-4, CON-5, CON-6, CON-8, CON-9, CON-10, CON-11, CON-12, CON-13, CON-14, CON-15, CON-16, CON-17, CON-18, CON-19, CON-21, CON-23, CON-24, CON-25
SUMMARY: I checked all 46 exec, fidelity and consistency ids against v3. 35 are adequately reflected. Four majors remain. P5d-1a requires every phone on v2 in a single session that cannot repeat, unlike P4b and P14-fleet. Nothing stops P6a or P7a from merging before the drain-image tag is cut. The P0a item 2 condition on K comes before item 6, where K is recorded. The fuel before/after check cannot read B5's pg_dump file. Six minors: the legacy verifier does not say it accepts expired tokens and its Entry does not wait for the decision; the PII owner contradicts itself; R9's mapping is incomplete; P8b's Entry contradicts its unanchored fallback; graph edges are left over; P8a-P10a Done-whens say "deployed"; web deploys from main.

--- V3R-1 [MAJOR] P5d-1a (conf 0.55)
CLAIM: EXE-17-r1 is listed as accepted, but only the per-OEM runs became repeatable. P5d-1a still requires, in one non-repeatable session: 'Per phone … every phone on v2', the onboarding for each phone, T0, and the 55-minute O-01 steps 1–4 on the pilot OEM, all within 'a visit'. The plan already conceded that one visit does not reach every phone (P4b ×n), and P14-fleet is ×n for the same install rows.
EVIDENCE: EXE-17-r1 CHANGE ('resumable row by row like P4b'); v3 P5d-1a Scope and Done-when; P4b '(×n) one session per workshop visit'; P14-fleet '(×n) Per-phone install rows as in P5d-1a'; w2/O-01-design.md steps 3–4
CHANGE: Split P5d-1a into P5d-1a (×n) fleet-install rows, one session per visit, with T0 set when the last row fills, and P5d-1a-pilot (O-01 steps 1–4 on the pilot OEM). P5d-1b's 48 h clock starts at T0.
CHECK: found=true supports=true — The v3 text has the gap. P5d-1a is headed "one session", is not marked (×n), and its Done-when is "Every phone on v2". Its Owner inputs say "(a visit)". The same session holds T0 and the pilot-OEM protocol. P4b is (×n) and P14-fleet is (×n) for the same install rows. §6.2 lists EXE-17-r1 as accepted among the repeatable phases, but it names only P4b, P4r, P5d-1b and P14-fleet; P5d-1a is not among them. O-01 puts the protocol at about 55 min per phone, with steps 3 and 4 at 15 and 20 min on duty.

--- V3R-2 [MAJOR] §0 Merge-is-not-deploy / P3b Entry / P6a / P7a (conf 0.55)
CLAIM: CON-1 asked for the box to stay on a tag of 'P1 + P2b-2 + P3a and nothing else'. v3 defines the tag that way, but nothing guarantees its content. P6a ('Merge any time') and P7a (Entry 'P1 merged') can land on main before P2b-2 or P3a. A tag cut from main in P3b then carries their behaviour changes, which breaks rule 3. Nothing either says how a mid-window fix (P4a 'P4a re-runs … after the fix', R7) is re-tagged without picking up main.
EVIDENCE: CON-1 CHANGE; v3 §0 'drain-image = P1 + P2b-2 + P3a'; P3b Entry 'tag cut'; P6a Entry; P7a Entry; P4a Done-when; P3a 'the drain-image tag procedure' (unspecified)
CHANGE: In P3a's scope, define the procedure: a `drain` branch from P1's merge commit with only the P2b-2 and P3a merge commits cherry-picked, then tag it. A window fix is cherry-picked onto `drain` and re-tagged (drain-image-2), with a deploy-train row. Alternatively, add 'drain-image tag cut' to the Entry lines of P6a, P7a and P7b-2 (backend part).
CHECK: found=true supports=true — v3 defines the tag as P1 + P2b-2 + P3a (§0, rule 3, R5) and lists "the drain-image tag procedure" only as an unspecified P3a runbook item (line 411). P6a (line 651) and P7a (line 699) say "Merge any time" after P1. Nothing pins the tag to a branch or commit, and nothing covers re-tagging a mid-window fix (P4a line 531, R7). The gap is real.

--- V3R-3 [MAJOR] P0a item 2 (vs item 6) (conf 0.5)
CLAIM: The EXE-3-r2/CON-7 fix seals the old JWT secret in item 2 'if K=no (item 6)'. P0a says to run the items 'in this order', so item 2 (Railway first, the cut-off) runs before K is known. A session following the order cannot evaluate the condition. It will skip the step, and the K=no/H=yes/v2=no legacy option (O10-F15, a P1 register row) is then lost if the Railway project lapses later.
EVIDENCE: v3 P0a 'with these numbered items in this order'; item 2 'if K=no (item 6), the old FIXFLOW_JWT_SECRET is copied … and sealed'; item 6 determines K; G2 §2 O10-F15 → P1; w2/O-10-design.md B2 'Keep the old one … if it is recoverable'
CHANGE: Item 2: 'copy the old FIXFLOW_JWT_SECRET from the Railway env and seal it unconditionally (used only if item 6 gives K=no and item 11 says yes; destroyed at T_close otherwise)'.
CHECK: found=true supports=true — Confirmed. SHIP-PLAN-2026-11.md line 174 says items are "in this order". Item 2 (lines 182-183) makes sealing the old JWT secret conditional on "K=no (item 6)", but item 6 comes later. Item 2 also cuts off Railway. A whole-plan grep found no other place that seals the secret unconditionally. O-10-design.md line 22 says to keep the old secret "if it is recoverable".

--- V3R-4 [MAJOR] P2b-2 / P4a step 4 / §6 R2 (conf 0.5)
CLAIM: The new R2 safeguard is 'per-job fuel-distance before/after … in drain_audit.py against the B5 snapshot'. B5 (P4a step 2) is a `pg_dump --format=custom` file uploaded to archive/. drain_audit.py runs read-only inside the backend container against the live DB, and fuel is derived on the fly (jobs/service.py:96, 330). The script has no 'before' state to read, so P4a's 'fuel-distance before/after clean' cannot run as specified.
EVIDENCE: v3 P2b-2 Scope; P4a steps 2 and 4; §6 R2; backend/app/features/jobs/service.py:96,330 (route_fuel_paisa derived per request); FID-5-R2 CHANGE
CHANGE: P2b-2: add a `drain_audit.py fuel-snapshot` mode that P4a step 2 runs at B5, writing per-job derived distance and fuel for closed or billed jobs to a JSON file in archive/pre-drain/. The AFTER mode diffs against that file. Add a pytest for it.
CHECK: found=true supports=true — v3 P2b-2 (line 353), P4a step 4 (line 521) and §6 R2 (line 1006) all require drain_audit.py to compare fuel-distance against the "B5 snapshot". P4a step 2 defines B5 only as a pg_dump custom-format file. No fuel-snapshot mode or derived-value capture exists anywhere in the plan. service.py:96 and :330 derive fuel on the fly. The gap is real.

--- V3R-5 [MINOR] P1 legacy-secret verifier bullet (conf 0.5)
CLAIM: Two gaps remain in the EXE-3-r2/CON-7/FID-2-kno fix. (1) O-10 requires accepting expired old-secret tokens, since the field tokens date from before 2026-08. P1 says only 'accepted on write routes only, until EXPIRES_AT', so a verifier that keeps the `exp` check is useless. (2) §4 says the O10-F15 decision blocks P1, and P1's bullet says 'K=no & H=yes & v2=no only'. But P1's Entry is only 'Docker Desktop up', so the session cannot tell whether to build it.
EVIDENCE: w2/O-10-design.md BRANCH K=NO 'accept expired tokens signed with the old secret'; v3 P1 bullet; P1 Entry; §4 O10-F15 row 'Blocks P1'
CHANGE: P1 bullet: 'always built, default OFF; skips `exp` but checks signature, role and `ver`; write routes only; until FIXFLOW_LEGACY_JWT_EXPIRES_AT'. Change the §4 row to block P3b and P4a only.

--- V3R-6 [MINOR] P5d-1a / P7b-1 / §6.2 CMP-17-R narrowing (conf 0.55)
CLAIM: CON-26 is not resolved. The §6.2 narrowing says the PII setting 'is turned on in P7b-1 … P5d-1a records it if already on'. Yet P5d-1a's Scope says 'turned on and recorded (P7b-1 may already have done it)', and P7b-1's Entry requires 'P5d-1a done', so P7b-1 can never come first. Two phases own the same action, and the stated reason contradicts the Entry graph. P5d-1a also does not require P7a deployed, which the setting needs.
EVIDENCE: v3 P5d-1a Scope; P7b-1 Entry and bullet 4; §6.2 Narrowed CMP-17-R; §5 O05-06 row; CON-26
CHANGE: Remove the PII bullet from P5d-1a. Keep the setting turn-on only in P7b-1, and fix the §6.2 narrowing text to say so.

--- V3R-7 [MINOR] §6 R9 / FID-20-approval (conf 0.4)
CLAIM: R9 now gives the reason for 'flag, not refuse', which is fine. But its mapping of O-06 item 3's single approval table covers only advance, bill_override, negotiate and postings. Two of item 3's five subject types are missing. ledger_entry has no approval record anywhere (manual staff_ledger rows). erp_batch ('the export batch carries its approval id') is not carried by P10a's run_posting_export.
EVIDENCE: w2/O-06-design.md item 3 (subject_type: advance|bill_override|negotiate_over_cap|erp_batch|ledger_entry); v3 §6 R9; P10a Scope; FID-20-approval
CHANGE: Extend R9: ledger_entry goes to a named record (or is declared out of scope with a reason). erp_batch goes to posting_export carrying the posting_decision ids or a batch approval, added to P10a's manifest.json.

--- V3R-8 [MINOR] P8b Entry vs Scope/Done-when (conf 0.45)
CLAIM: The EXE-20-r1/CON-20 fix added core/mailer.py, but P8b now contradicts itself. Its Entry requires 'SMTP relay credentials', its Scope allows 'without credentials … unanchored', and its Done-when requires 'one head hash delivered'. If the owner has no relay, the §4 default ('unanchored') is unreachable because the phase is blocked at Entry.
EVIDENCE: v3 P8b Entry, Scope bullet 3, Done-when; §4 chain-anchor row
CHANGE: Make the Entry 'P8a merged'. Done-when: 'one head hash delivered, or no credentials and the verify output plus CLAUDE.md read "unanchored"'.

--- V3R-9 [MINOR] §2 graph (conf 0.6)
CLAIM: CON-22 is only partly fixed. The graph still disagrees with the Entry lines: it shows P10b ─► P11 although P11's Entry is 'P10a merged'; P2b-2 ─► P2c although P2c's Entry is P2b-1; it lacks P9b ─► P10b (P10b needs 'P9b deployed'); and it lacks P4c/T_close ─► P13a (P13a's Entry says 'after T_close').
EVIDENCE: v3 §2 lines 94, 100–101; Entry lines of P2c, P10b, P11, P13a; CON-22
CHANGE: Redraw these four edges from the Entry lines: P10a ─► P11; P2b-1 ─► P2c; P9b ─► P10b; P4c ─► P13a.

--- V3R-10 [MINOR] P8a, P8b, P9a-1, P9a-2, P9b, P10a Done-when (conf 0.4)
CLAIM: §0 says phases that merge before T_close end at 'merged; deploy-train row added'. These phases' Done-whens say only 'deployed', yet their Entry lines (from P7a merged onward) allow them to run during the drain window. A session following the phase text cannot finish before T_close without breaking rule 3. P6a, P7a and P7b-2 carry the explicit alternative.
EVIDENCE: v3 §0 Merge-is-not-deploy; standing rule 3; P8a…P10a Done-when; P7a Done-when 'deploy-train row or deployed'; CON-2, CON-3
CHANGE: Change each of these Done-whens to 'deployed, or (before T_close) merged and deploy-train row added'.

--- V3R-11 [MINOR] §0 'Web-only changes … any time' / P12a / P6a (conf 0.4)
CLAIM: Web images are built from main and 'may deploy at any time'. P6a's web part (board sampler_state, effective_time, discard count) and P7b-1's typed-id web login need backend fields or routes that the drain-image lacks. A P12a or P12 web deploy after those merges would ship web code against the old backend during the window. This is a side effect of the CON-1 fix.
EVIDENCE: v3 §0; P12a Done-when 'web image rebuilt and deployed'; P6a Scope (web renders effective_time, board fields); P7b-1 web login
CHANGE: In §0: 'web deploys before T_close build from the drain branch (plus P12a); web parts of P6a and P7a ride the deploy train'.

==================== reflect:C — 10 findings; ok: FIT2-02, FIT2-03, FIT2-04, FIT2-05, FIT2-06, FIT2-07, FIT2-08, FIT2-09, FIT2-10, FIT2-11, FIT2-12, FIT2-13, FIT2-15, FIT2-16, FIT2-17, FIT2-18, FIT2-19, FIT2-20, FIT2-21, FIT2-22, FIT2-23, FIT2-24, FIT2-25, FIT2-26, FIT2-27, NT-2, NT-3, NT-5, NT-6, NT-9, NT-10, NT-12, NT-13, NT-15, NT-16, NT-17, NT-19, NT-21, NT-22, NT-24, NT-25
SUMMARY: The repo copy of critique-2 is only a 569-byte header, so the 52 FIT2/NT findings were read from the workflow output in the scratchpad (verify-v2.txt). 41 are adequately reflected. FIT2-01 is only partly applied: P8a through P10a still end at "deployed" before T_close, which standing rule 3 forbids. Four fixes introduced new problems. Appendix B still queries the nonexistent job.token_seq, which aborts the P0a same-day verification. The P0a Git Bash commands omit MSYS_NO_PATHCONV. "versionCode differs" sends same-cert phones down the K=no uninstall path. P4c's stub and legacy-secret teardown strands late phones in P4r. Five minor wording and ordering gaps remain: the item-2 K ordering, the web profile never started, rule 5's 2xx wording, the hold-notice ordering, and the P8b Entry versus the unanchored default.

--- RC-FIT2-01 [BLOCKER] P8a, P8b, P9a-1, P9a-2, P9b, P10a (conf 0.6)
CLAIM: FIT2-01 was accepted, but it is only partly reflected. §0 says a phase that merges before T_close ends at "merged; deploy-train row added". P8a (Entry "P7a merged"), P8b, P9a-1, P9a-2, P9b and P10a still say "deployed" in their Done-when, and none of them waits for T_close. P8b's "one head hash delivered" also needs a running deploy. A session doing any of these before T_close must either break standing rule 3 or stay stuck.
EVIDENCE: FIT2-01 names P8a, P8b and P9a-1..P10a. v3 §0 'Merge is not deploy'; standing rule 3 ('No backend deploy from main before P4c'). Done-whens: P8a 'deployed; a void shows voided_by/at', P8b 'deployed; one head hash delivered', P9a-1/P9a-2/P9b/P10a 'deployed'.
CHANGE: Change each of these Done-whens to "merged; deploy-train row added (or deployed, if merged after T_close)". Move P8b's head-hash delivery and P9a-1's 'deployed' check into the P4c train row, or into a post-T_close check.
CHECK: found=true supports=true — FIT2-01 is accepted (§6.2) and §0 'Merge is not deploy' plus P6a/P7a/P7b-2 use train/after-T_close wording. P8a (Entry 'P7a merged'), P8b ('deployed; one head hash delivered'), P9a-1, P9a-2, P9b and P10a still end 'deployed' with no T_close entry or train-row alternative. Rule 3 forbids pre-P4c deploys, so the gap is real.

--- RC-NT14-token [MAJOR] P0a item 4 / P3a / P3b step 3 (conf 0.75)
CLAIM: The Appendix B fix (NT-14) left a query that aborts the run. `SELECT max(token_seq) FROM job;` names a column that does not exist; the column is `token`. Appendix C runs the queries with ON_ERROR_STOP=1, so the run stops there and the dispatch_cursor, sequence and alembic_version queries never run. v3 puts the column check in P3a, but P0a item 4 runs the Appendix C/B verification today, before P3a exists.
EVIDENCE: ORCHESTRATION-DESIGN-2026-10.md:682 and :704 (ON_ERROR_STOP=1); backend/app/features/jobs/models.py:130 `token: Mapped[int]`; v3 P3a 'verify the job.token_seq column name'; P0a item 4 'verify it the same day with design Appendix C'.
CHANGE: Fix Appendix B now: `SELECT max(token) FROM job;`. Drop the deferred 'verify the column name' clause from P3a.
CHECK: found=true supports=true — Design line 682 has `SELECT max(token_seq) FROM job;`; models.py:130 column is `token`. Line 704 runs psql with ON_ERROR_STOP=1, so the later queries never run. v3 P0a item 4 runs Appendix C/B today; P3a (line 413) only defers verifying the column name. Gap confirmed.

--- RC-NT1-msys [MAJOR] P0a items 3–4 (conf 0.6)
CLAIM: The new same-day MUST commands (NT-1, NT-4) are written for Git Bash, but they omit MSYS_NO_PATHCONV. MSYS rewrites `-f /out/supabase-<date>.dump`, and the `:/out` side of the `-v` mount, into `C:/Program Files/Git/...`, so pg_dump fails inside the container. Item 3's 'and to a laptop folder' copy has no `-v` mount and no destination. The `-e AWS_*` flags pass nothing unless the variables are exported first.
EVIDENCE: Appendix C opens with `export MSYS_NO_PATHCONV=1` (ORCHESTRATION-DESIGN-2026-10.md, Appendix C), which shows the repo already hit this. P0a item 4 docker command; item 3 aws-cli command. NT-1, NT-4.
CHANGE: Prefix items 3 and 4 with `export MSYS_NO_PATHCONV=1` and `export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=…`. Give the laptop copy as `docker run … -v C:/fixflow-r2:/dl amazon/aws-cli … s3 cp --recursive s3://<bucket>/backups/db/ /dl/`.
CHECK: found=true supports=true — The evidence exists. ORCHESTRATION-DESIGN-2026-10.md has `export MSYS_NO_PATHCONV=1` at line 633 (Appendix A) and line 691 (Appendix C). In plan v3, P0a item 4 (lines 190-191) gives a `-v ... :/out` pg_dump command with `-f /out/...` and no MSYS_NO_PATHCONV. Item 3 (lines 184-187) has `-e AWS_*` flags with no export. Its laptop copy is prose only, with no `-v` mount or destination.

--- RC-NT11-vc [MAJOR] §2 branch box / P4b (conf 0.6)
CLAIM: The NT-11 fix over-reaches. It says "a phone whose cert **or versionCode differs** follows the K=no row". A phone with the same cert and a lower versionCode installs over cleanly (P2b-1 puts the fleet versionCode above the fleet maximum). Sending it down K=no means hand-retry, uninstall and fresh install, which is the very data-loss path rule 1 exists to avoid. Field phones commonly carry different older versionCodes.
EVIDENCE: O-10 E2: STOP only 'on INSTALL_FAILED_UPDATE_INCOMPATIBLE or a version downgrade'. P2b-1 Entry (fleet maximum). Standing rule 1.
CHANGE: Replace the text with: "a phone whose cert differs, or whose install fails with INSTALL_FAILED_UPDATE_INCOMPATIBLE or a downgrade, STOPs and re-checks K (O-10 E2). A same-cert phone with a lower versionCode stays K=yes." Apply this in both the branch box and P4b.
CHECK: found=true supports=true — v3 says "cert or versionCode differs" follows K=no, at plan line 119 (branch box) and line 540 (P4b). O-10 E2 STOPs only on INSTALL_FAILED_UPDATE_INCOMPATIBLE or a downgrade. P2b-1 (line 315) requires the fleet versionCode to exceed the fleet maximum, so a lower versionCode installs over. The plan text is broader than E2. I did not open standing rule 1.

--- RC-NT23-P4r [MAJOR] P4c / P4r (conf 0.55)
CLAIM: P4c, added by the NT-23 fix, removes the stub or switches it to hang, and unsets FIXFLOW_LEGACY_JWT_SECRET. P4r, added by FIT2-08, then drains late phones 'per its branch row'. A late K=no/H=yes phone can no longer reach the box: the proxy is gone and its old-secret tokens are refused. A late K=yes phone, once the stub is removed, hits Railway's edge 404 again and drops pings and travel. O-10 C says to remove the stub only after the last phone is updated.
EVIDENCE: P4c Scope 'old-host stub removed or switched to hang; FIXFLOW_LEGACY_JWT_SECRET unset'. P4r Scope. O-10 C ('Remove the stub after the last phone is updated'). P0a item 12. NT-23, FIT2-08.
CHANGE: P4c: switch the stub to hang while any roster phone lacks a drain row; remove it only in the last P4r. P4r for a K=no/H=yes phone: rebind proxy mode and re-set the legacy secret with a session-length expiry, then revert both and record it.
CHECK: found=true supports=true — P4c Scope (SHIP-PLAN lines 550-551) says "old-host stub removed or switched to hang; FIXFLOW_LEGACY_JWT_SECRET unset". P4r (556-560) only says "drain per its branch row", with no stub, proxy or legacy-secret handling. Rule 5 and P3c step 4 bind the proxy only at B6. O-10 C (line 40) says to remove the stub after the last phone is updated. P4c's "or hang" option means a late K=yes phone only avoids the edge 404 if hang is chosen. A late K=no/H=yes phone has no restored path.

--- RC-NT7-order [MINOR] P0a item 2 (conf 0.5)
CLAIM: Item 2 says 'if K=no (item 6), the old FIXFLOW_JWT_SECRET is copied and sealed', but the items run 'in this order', so K is not known until four items later. A session can finish item 2, which is also where the Railway service is cut off, without copying the secret, and must then go back to Railway.
EVIDENCE: P0a 'numbered items in this order'; item 2; item 6 (K per phone); O-10 B2 ('if it is recoverable'); NT-7.
CHANGE: Item 2: always copy and seal the old secret before cutting the service off. It is used only if K=no & H=yes & v2=no and the §4 decision is yes; otherwise it is destroyed at P4c.

--- RC-NT18-web [MINOR] P3b / P3c step 2(e) / P12a (conf 0.55)
CLAIM: NT-18's fix runs `docker compose exec web wget …`, but no phase ever starts the `web` profile. P3b starts db and app, and P3c starts edge. `app.` behind Access has no upstream either. P12a's Entry is only 'P3a merged', yet its Done-when requires the web image deployed, which needs the box from P3b.
EVIDENCE: P3a profiles (db/app/web/ops/edge); P3b steps 3–4; P3c steps 1 and 2(e); P12a Entry and Done; P4a step 5 uses the P12a web path.
CHANGE: P3c step 1: `--profile web --profile edge`. P12a Entry: add 'P3b done (box exists)'.

--- RC-NT8-rule5 [MINOR] §0 standing rule 5 (conf 0.5)
CLAIM: Rule 5's clause 'never 5xx, never 2xx/204 to the field build' follows the K=no proxy sentence. Read literally, it forbids the proxy from relaying the backend's real 2xx, and relaying that 2xx is the whole purpose of proxy mode. A session writing the stub's proxy-mode tests could assert the wrong behaviour.
EVIDENCE: Standing rule 5 text; P3a hang-stub proxy mode; O10-F3/O10-F4 (the 204 risk is a fabricated success).
CHANGE: Reword as: '…never a 5xx, and never a 2xx/204 the stub fabricates itself. In proxy mode only the backend's own responses pass through.'

--- RC-NT20-notice [MINOR] P0a item 1 / P2b-2 (conf 0.45)
CLAIM: NT-20's fix commits `fleet-hold.md` in P2b-2, but P0a item 1 sends the hold notice today. So the committed text is written weeks after the notice went out and may not match it. The release notice's required content (what is allowed, what is still forbidden, whom to call) is not specified either.
EVIDENCE: NT-20 CHANGE; P0a item 1; P2b-2 Scope 'release notice and hold notice texts'; standing rule 6.
CHANGE: P0a item 1 records the sent text verbatim in W0-results, and P2b-2 copies it into fleet-hold.md. P2b-2's release.md lists the allowed actions (open, clock in, travel, Retry), the forbidden ones (Discard, uninstall, clear data) and a contact.

--- RC-FIT2-14 [MINOR] P8b Entry / §4 (conf 0.5)
CLAIM: P8b's Entry requires 'the anchor channel and SMTP relay credentials'. The §4 default and P8b's own Scope allow running without credentials, labelled 'unanchored'. The Done-when, 'one head hash delivered', cannot be reached in that default case, so a session with no SMTP is blocked by an Entry the §4 default says is optional.
EVIDENCE: P8b Entry, Scope bullet 3 and Done-when; §4 row 'Chain anchor channel + SMTP relay credentials'.
CHANGE: Entry: 'SMTP credentials, or the unanchored default recorded'. Done-when: 'one head hash delivered, or verify output and CLAUDE.md show unanchored'.

==================== attack:consistency-v3 — 23 findings; ok: Numbers consistent across phases: 20 s hang (rule 5, P3a, P3c 4), 32-byte secret (P1), 6-digit tech PIN (P1, P3b, R4; manager already 6 in identity/service.py:32), radius >= 100 m (P0a 9, §4), 100 m accuracy ceiling (P5a, P6a, R1), 15 min re-check (P5a, P5d-2, §4), 336/240/48 h ceilings (P2b-1 constant, P4c, P6b-1, §4), 7 days (P4c), §6 R1 followed: P6a builds the fixture, and P5a's Entry and Scope consume it, §6 R2 followed: P4a jobs GPS = W, P4c 48 h, fuel-distance check in P2b-2 (mechanism gap aside), §6 R3 and R4 followed (P2b-1 copy, P5b typed-id, P7b-1 roster removal and web typed-id, P3b rotation), §6 R6, R7, R8, R9 followed (no pre-assigned numbers, P13d separate files; P14 no expo-updates; P2a step 1 no detail fallback; P9a-1 flags self-approval), Rule 4 re-seed in P4c and P4r; dispatcher guard in P6b-2, Rule 7 reflected in P9a-1 CLAUDE.md invariant and the P9a-2 state-based stager, §5 P0/P1 mappings each name a phase whose Scope contains the id (O10-F1 via P2b-1 D7; O05-07 via the branch box), P6a/P6b-1/P6b-2/P7a/P7b-1/P7b-2/P13a Done-whens comply with rule 3 by deploy-train row or post-T_close Entry, Client-IP echo (P1) exists before P3c 2(a); preflight host created P3c 1 and deleted P3c 8; set_pin.py exists before P3b 6, P13d references an existing NOT VALID CHECK (0038 job_payment_amount_positive) and P8a's NOT VALID FK
SUMMARY: I read v3 cold for internal consistency. Blockers: (1) the drain-image tag cannot be just P1+P2b-2+P3a when P6a/P7a/P8a may merge earlier, and no phase cuts the tag; (2) the Done-whens of the money chain P8a–P10a say 'deployed' before T_close, which breaks rule 3; (3) P4c removing the old-host stub strands P4r late phones and re-opens O05-07. Majors: deep-health does not expose the values phases read back from it; the old host's mode in K=no and mixed fleets; P4r's missing steps; P5d-1a/P7b-1 can never be reached once a phone is late or lost; P7a's minimised unclaimed detail runs ahead of the default-off setting; two phases each turn the PII setting on; fuel-distance comparison has no baseline mechanism; P4b's Entry gets past the halt after a mismatch; the timing of the legacy verifier; the web image is built from main; P8b's anchor Done-when. The rest are minors.

--- CON3-01 [BLOCKER] §0 rule 3 / §6 R5 / P3b Entry / P6a / P7a (conf 0.75)
CLAIM: The drain image is defined as 'the drain-image tag = P1 + P2b-2 + P3a' and 'nothing else', but a tag is a commit on main, and other backend PRs may merge first. P6a says 'Merge any time' (Entry: P1 merged). P7a's Entry is P1 merged. P8a only needs P7a. Any of these merged before the last of P2b-2/P3a would end up inside the tag. Also, no phase's Scope actually cuts the tag (P3b's Entry just says 'tag cut'), and rule 0 puts the deploy-train table in W0-results while P3a puts it in the runbook.
EVIDENCE: §0 Merge-is-not-deploy; rule 3; P6a Entry; P7a Entry; P8a Entry; P3a runbook bullet ('the drain-image tag procedure; the deploy-train table'); CON-1/FIT2-01 adopted in §6.2
CHANGE: Either forbid merging P6a/P7a/P7b-2/P8a+ to main until the tag exists, or cut `drain-image` from a `release/drain` branch (P1 merge + P2b-2 + P3a cherry-picks). Make tagging the last Scope item of whichever of P1/P2b-2/P3a merges last. The first act of P3a commits the deploy-train table to W0-results.
CHECK: found=true supports=true — The gap is real. Rule 3 and R5 define drain-image as P1+P2b-2+P3a, but nothing says how it is cut. P6a ("Merge any time", Entry P1 merged) and P7a (Entry P1 merged) could land on main first. No phase Scope cuts the tag; P3b's Entry only says "tag cut". P3a lists the tag procedure and deploy-train table in the runbook, while the §0 merge-is-not-deploy rule puts the table in W0-results. P3b commits it to W0-results.

--- CON3-02 [BLOCKER] P8a, P8b, P9a-1, P9a-2, P9b, P10a Done-when (conf 0.7)
CLAIM: The money chain runs P1→P7a→P8a→… and nowhere waits for T_close, yet each phase's Done-when says 'deployed'. Before P4c that breaks rule 3 ('No backend deploy from main before P4c'). Otherwise the Done-when cannot be reached in the session. P8b ('one head hash delivered') and P9b ('deployed') depend on that deploy.
EVIDENCE: §0 rule 3 and Merge-is-not-deploy ('Done-when ends at "merged; deploy-train row added"'); P8a Entry 'P7a merged'; P7a Done 'deploy-train row or deployed'; P8a/P8b/P9a-1/P9a-2/P9b/P10a Done-when 'deployed'
CHANGE: Each of these Done-whens should read 'merged; deploy-train row added (before T_close) or deployed per RUNBOOK-SELFHOST R5 (after)'. Move P8b's 'one head hash delivered' and P9b's 'delta moves' checks into P4c's train row for that PR, or require 'after T_close' in their Entry.
CHECK: found=true supports=true — Cited text exists. Rule 3 bars backend deploys before P4c. The Merge-is-not-deploy bullet ends pre-T_close phases at "merged; deploy-train row added". P7a (Done-when "deploy-train row or deployed") and P7b-1 handle this. But P8a, P8b, P9a-1, P9a-2, P9b and P10a only require P7a/prior merged (DAG line 100), with no T_close entry gate and Done-when "deployed". P8b's head hash and P9b's delta need a deploy, so the contradiction is real.

--- CON3-03 [BLOCKER] P4c scope vs P4r, P0a item 12, rule 5 (conf 0.65)
CLAIM: At window close, P4c has 'the old-host stub removed or switched to hang'. Under K=yes, rule 5 allows the old host only to hang. Under P0a item 12, a phone's network cut may lift once there is 'a verified hang stub'. So a late phone that is still on the field build, with its network restored, reaches Railway's 404 after removal: punches park, and pings and travel are dropped (O-10 C H=no). The subdomain also becomes re-bindable (O05-07, a P1 row mapped to P3c 4). In addition, P4r gives a late K=no phone no way to restore the proxy or the legacy secret that P4c unset.
EVIDENCE: P4c Scope; P4r Scope; P0a item 12; rule 5; G2 §1.2 O05-07; O-10 C 'Remove the stub after the last phone is updated'; NT-23
CHANGE: P4c: 'stub switched to hang (or kept hanging); removed only after every roster phone has a P4b/P4r/retirement row'. P4r Scope: for K=no & H=yes, rebind the proxy (and, if decided, the legacy secret with a new expiry) for that session only, then go back to hang.
CHECK: found=true supports=true — P4c (line 550) says the old-host stub is "removed or switched to hang", and unsets FIXFLOW_LEGACY_JWT_SECRET. Rule 5 lets a K=yes host only hang. P0a item 12 lifts the network cut at "a verified hang stub". P4r has no step to rebind the proxy or restore the legacy secret. Nothing else in the plan addresses these. NT-23 and the O-10 C quote exist. O05-07 (G2 §2) is a P1 row.

--- CON3-04 [MAJOR] P0a item 12 / P3c step 4 / §2 last bullet / rule 5 (conf 0.6)
CLAIM: The old hostname has one mode at a time, but the plan sometimes needs two. (a) In K=no & H=yes, P3c 4 verifies a proxy-mode stub that is 'not yet bound'. P0a 12 lets the network cut lift on 'a verified hang stub'. Once B6 binds the proxy, every un-supervised K=no phone drains on the field build, and a v2=no phone drops job writes on the first 401 (O10-F15). (b) With a mixed fleet (§2 'a single phone whose cert … differs'), rule 5 needs hang for the K=yes phones and proxy for the odd one, at the same moment.
EVIDENCE: P0a item 12; P3c step 4; P4a step 3; §2 branch box last bullet; rule 5; O-10 BRANCH K=NO
CHANGE: P0a 12: the cut lifts only for K=yes with a hang-mode stub. Under K=no it stays until that phone's supervised BRANCH K=NO session. Mixed fleet: the host hangs until every K=yes phone has its P4b row, then switches to proxy for the K=no phones, each with its cut lifted only in its own session.
CHECK: found=true supports=true — All cited text exists. P0a 12 lifts the cut on 'a verified hang stub (P3c step 4)'. P3c 4 verifies the K=no proxy stub as hanging while unbound, and B6 binds it later (P4a 3). Nothing ties the lift to the supervised K=no session, and nothing resolves one hostname serving hang for K=yes and proxy for a K=no phone (§2, rule 5, P4b). The v2=no 401 drop is in O-10.

--- CON3-05 [MAJOR] P3b step 4, P3c step 7, P4c, P6b-1, §0 Merge-is-not-deploy (conf 0.75)
CLAIM: Several phases read values back from deep-health that deep-health does not expose: dispatcher OFF, BACKUP_ENABLED and FIXFLOW_BACKUP_PREFIX (P3b 4, P3c 7), the three ceilings (P4c, P6b-1 '336'), and an 'image digest' (rule 0, P4c). Today config_presence reports only jwt_secret_overridden, r2, fcm, sentry and ops_proxy_token, plus the migration head. P1 adds only default_pin_active and the client-IP echo.
EVIDENCE: backend/app/features/ops/health.py:105-122 (flags) and :77-104 (head only); P1 Scope; P3b step 4; P3c step 7; P4c; P6b-1 Done-when
CHANGE: P1 Scope adds to deep-health: enable_dispatcher, backup_enabled, backup_prefix, the device_time/jobs-GPS/ping ceilings, legacy-verifier on/expiry, and an IMAGE_DIGEST/GIT_SHA env var. P3a's compose sets that var at build time from the tag/commit. Each item gets a test.
CHECK: found=true supports=true — health.py config_presence (107-123) reports only jwt_secret_overridden, r2_storage, fcm_push, sentry_ingest, ops_proxy_token; migration check gives head only. P1 adds only default_pin_active and the client-IP echo. The plan reads back dispatcher OFF, BACKUP_ENABLED, BACKUP_PREFIX (P3b 4, P3c 7), ceilings (P4c, P6b-1 336) and an image digest (rule 0, P4c) from deep-health. No digest or git-sha mechanism found anywhere in the plan.

--- CON3-06 [MAJOR] P5d-1a Entry/Done, P7b-1 Entry/Scope, P4r, rule 4 (conf 0.65)
CLAIM: P5d-1a requires 'every phone's P4b row complete' and is done only when 'every phone on v2'. A phone that missed the window (P4r) or is lost never satisfies this, which stalls P7b-1 and the security milestone. Separately, P7b-1 removes the roster endpoint, yet a P4r late phone drains on fleet v1 or the field build, whose login loads `/api/technicians` (technician-app/src/lib/authApi.ts:29), so it can no longer sign in. Rule 4's 'after the last re-open' is never defined.
EVIDENCE: P5d-1a Entry/Done; P7b-1 Entry 'P5d-1a done' and Scope 'Roster endpoint removed'; P4r Scope (no APK named); P2b-1 'v1 build still shows the roster'; rule 4
CHANGE: Add a 'retired' row (owner sign-off, A3 photos transcribed) that closes a phone for P4b/P4r/P5d/P14. P5d-1a and P7b-1 Entry: every roster phone has a P4b, P4r or retired row. P4r names its APK: v2 once P5b exists, otherwise v1 only before P7b-1. Rule 4's last re-open = the point where no phone is still undrained.
CHECK: found=true supports=true — Confirmed. P5d-1a Entry says "every phone's P4b row complete" and Done says "Every phone on v2". P7b-1 Entry needs "P5d-1a done" and its Scope removes the roster endpoint. P4r names no APK and doesn't mention P5d or P7b-1. No "retired" row exists. Rule 4's "last re-open" is undefined. authApi.ts:29 calls /api/technicians. P2b-1 says the v1 build still shows the roster.

--- CON3-07 [MAJOR] P4r Scope (conf 0.65)
CLAIM: P4r widens the global ceilings for one late phone and drains it, but leaves out steps P4a/P6b-1 depend on. There is no B5 snapshot, so drain_audit's fuel-distance check has no baseline for jobs billed after P4a. There is no per-tech device_time range or accept pass plus payroll regeneration, even though P6b-1 regenerates only 'windows covering the P4c date ranges'. There is no residue entry and no release notice (rule 6). 'Window settings staged for that phone' wrongly implies the settings are per phone; they are global (O-10 F).
EVIDENCE: P4r Scope; P4a steps 2, 5, 6; P6b-1 Scope; rule 6; O-10 F 'the ceilings are global'; §6 R2
CHANGE: P4r Scope: take a fresh B5 snapshot; restart with the global window; drain; AFTER audit with --test-window and fuel-distance against that snapshot; enter residue; issue the release notice; record min/max device_time and, if P6b-1 is deployed, run the accept pass and regenerate (version+1); restore the ceilings; re-seed.
CHECK: found=true supports=true — P4r Scope (lines 556-560) lists only: window settings staged for that phone, drain per its branch row, AFTER audit, ceilings restored, cursor re-seeded, row recorded. No B5 snapshot, device_time min/max, accept pass or regeneration, residue entry or release notice appears. "Per its branch row" only vaguely implies some of these. P4a steps 2, 5 and 6, P6b-1, rule 6, R2 and O-10 line 81 ("ceilings are global") all exist and match.

--- CON3-08 [MAJOR] P7a Scope bullet 1 vs P7a bullet 4 / §4 PII row (conf 0.6)
CLAIM: P7a's first bullet makes an unclaimed job return 'a minimised JobDetail to any tech' with no condition. The fourth bullet and §4 put PII minimisation 'behind a per-shop setting, default off … until v2 is fleet-wide (the list shows addresses techs use before claiming)'. P7a deploys with the P4c train while the fleet still runs v1, so v1 techs would lose addresses on unclaimed detail, which is exactly what the setting was meant to prevent.
EVIDENCE: P7a Scope bullets 1 and 4; §4 'PII minimisation of unclaimed jobs'; §6.2 CMP-17-R narrowing; P5b 'render minimised unclaimed rows'
CHANGE: P7a bullet 1: 'an unclaimed job returns a minimised JobDetail when the per-shop PII setting is on, the full detail otherwise'. The replay test covers both setting values.
CHECK: found=true supports=true — P7a bullet 1 (line ~704) makes unclaimed detail minimised for any tech, unconditionally. Bullet 4 (line ~712) and the §4 row (line 909) put PII minimisation behind a per-shop setting, default off, because the list shows addresses before claiming. The bullet 4 wording names only the list, so a reading exists where detail is intentionally unconditional. §6.2 CMP-17-R is ambiguous. The inconsistency is real.

--- CON3-09 [MAJOR] P5d-1a Scope vs P7b-1 / §6.2 (conf 0.7)
CLAIM: P5d-1a Scope says 'the PII-minimisation setting turned on and recorded (P7b-1 may already have done it)'. P7b-1's Entry requires 'P5d-1a done', so P7b-1 can never have done it first. §6.2 rules the setting is turned on 'in P7b-1, not P5d-1'. So two phases each claim to turn the setting on, and the hedge describes an order the graph rules out.
EVIDENCE: P5d-1a Scope; P7b-1 Entry and Scope 'PII-minimisation setting turned on'; §6.2 CMP-17-R; §4 PII row
CHANGE: Remove the setting from P5d-1a's Scope. P7b-1 turns it on and records it, as §6.2 rules. Alternatively, keep it in P5d-1a and have P7b-1 only read it back. Either way, drop the parenthesis.
CHECK: found=true supports=true — Confirmed. P5d-1a Scope (line 628) says the setting is turned on "(P7b-1 may already have done it)". P7b-1 Entry (line 724) requires "P5d-1a done", so P7b-1 cannot come first. P7b-1 Scope (line 733) and the §4 row (line 909) turn it on. Line 992 says "turned on in P7b-1, not P5d-1" but then adds "P5d-1a records it if already on", which has the same ordering problem.

--- CON3-10 [MAJOR] P2b-2 Scope / P4a step 2 and step 4 (conf 0.6)
CLAIM: drain_audit.py must compare fuel distance before and after 'against the B5 snapshot', but B5 is a custom-format pg_dump file uploaded to R2. The script runs against the live DB through `docker compose exec backend`. No option takes a baseline, no step restores B5 into a second database, and P3a's runbook has no B5 command (P4a writes `pg_dump …`). The cursor re-seed that P4c/P4r run is also missing from the runbook.
EVIDENCE: P2b-2 Scope; P4a step 2 ('pg_dump --format=custom …'); P4a step 4; P3a runbook command list; §6 R2
CHANGE: P2b-2 adds `drain_audit.py --snapshot-fuel OUT.json`, which P4a step 2 runs right after B5, and `--fuel-baseline OUT.json`, which the AFTER audit uses, with a test. P3a's runbook adds the exact B5 pg_dump/upload commands and the dispatch_cursor re-seed SQL.
CHECK: found=true supports=true — Confirmed. P2b-2 Scope (line 353) and §6 R2 (line 1006) require a fuel-distance before/after check "against the B5 snapshot", but no `drain_audit.py` option takes a baseline. P4a step 2 only says `pg_dump --format=custom …`. The P3a runbook list has no B5 dump/upload command and no dispatch_cursor re-seed SQL. P4c and P4r only say "re-seeded (rule 4)". Nothing else in the plan covers either gap.

--- CON3-11 [MAJOR] P4b Entry / P4a Done-when (mismatch) (conf 0.6)
CLAIM: On an AFTER mismatch, P4a's Done-when is met by 'mismatch tabulated…, fleet halted (R7)'. P4b's Entry is only 'P4a done', so the fleet can proceed past the halt. 'P4a re-runs on the same phone after the fix' cannot produce a proof: that phone has already drained, its queues are empty, and the manifest is written once per versionCode. And if the fix is in drain_audit.py, the drain-image tag has to be re-cut, which rule 3 never provides for.
EVIDENCE: P4a Done-when; P4b Entry; O-10 R7, R2, D4; rule 3
CHANGE: P4b Entry: 'P4a passed (AFTER matched)'. After a fix, the pilot re-run happens on the next undrained phone. Rule 3 adds: a drain-tool fix re-cuts `drain-image` (P1+P2b-2+P3a+fix), logged in W0-results.
CHECK: found=true supports=true — Confirmed. P4a Done-when (lines 530-531) counts a tabulated mismatch plus 'fleet halted (R7)' as done, and P4b Entry (line 537) is just 'P4a done', so nothing enforces the halt. The same-phone re-run conflicts with O-10 D4 (manifest written once per versionCode) and R2. Rule 3 and §6 R5 define drain-image as P1+P2b-2+P3a only, with no re-cut after a fix.

--- CON3-12 [MAJOR] P1 Entry/Scope vs §4 O10-F15 row and §2 branch box (conf 0.55)
CLAIM: P1 builds the legacy-secret verifier only for 'K=no & H=yes & v2=no'. §4 says the O10-F15 decision 'Blocks P1'. Yet P1's Entry is only 'Docker Desktop up', so P1 can run and merge before P0a items 6 and 11 settle K, v2 and the decision. If K=no turns up afterwards, nothing adds the verifier, and the drain-image tag is fixed as P1+P2b-2+P3a.
EVIDENCE: P1 Entry; P1 Scope 'Legacy-secret verifier (K=no & H=yes & v2=no only; default OFF)'; §4 O10-F15 row; §2 branch box 'P1 ships the default-off legacy verifier'; rule 3
CHANGE: Build the verifier unconditionally in P1: it is default OFF, does nothing when unset, and has tests. That removes the dependency. Otherwise, add 'P0a items 6 and 11 recorded' to P1's Entry.
CHECK: found=true supports=true — Confirmed. §4 row 896 lists O10-F15 as blocking "P1 (legacy verifier), P3b, P4a". The §2 box (line 113) says P1 ships the verifier if the owner says yes. P1 Scope (line 257) builds it only for K=no, H=yes, v2=no. P1 Entry (line 243) is just "Docker Desktop up", with no P0a item 6 or 11 dependency. The drain-image tag is P1+P2b-2+P3a (line 429). No other text adds the verifier later.

--- CON3-13 [MAJOR] §0 Merge-is-not-deploy (web), P12a, P12, P3b/P3c (conf 0.55)
CLAIM: 'Web-only changes (Caddy image) may deploy at any time', but the Caddy image is built from main. Main can contain the web halves of mixed PRs such as P6a (board renders effective_time, sampler_state, discard counts) that the drain-image backend does not serve, and P12a/P12 deploy the web during the drain. Also, P12a's Done-when 'deployed' only needs P3a merged, yet no box exists before P3b. No step ever runs `--profile web`, although P3c 2(e) does `docker compose exec web`.
EVIDENCE: §0 Merge-is-not-deploy; P6a Scope (web); P12a Entry/Done; P12 Done; P3b steps 3-4 and P3c step 1 (only db, app, edge profiles); P3c 2(e)
CHANGE: Before T_close, the web image is built from `drain-image` plus web-only commits (P12a, P12). Web halves of mixed PRs ride the backend train. P12a Entry adds 'P3b done'. P3b step 4 adds `--profile web` (and `ops` if used).
CHECK: found=true supports=true — Evidence exists. §0 says web-only changes may deploy any time. P6a is backend plus web (renders effective_time, sampler_state) and is deployed by the P4c train. P12a Entry is only P3a merged, but its Done needs the web deployed, and no box exists until P3b. P3b step 4 and P3c step 1 start only db, app and edge. Nothing runs --profile web, yet P3c 2(e) execs into web. The plan never says which commit the web image is built from.

--- CON3-14 [MAJOR] P8b Entry/Done-when vs §4 anchor row (conf 0.6)
CLAIM: P8b's Entry demands 'the anchor channel and SMTP relay credentials', and its Done-when demands 'one head hash delivered through the channel'. §4's default for that row is that without credentials the chain is labelled 'unanchored', and the Scope says the same. So under the default, P8b can neither start nor finish. If the hatch moves the mailer to P8b-2, P8b's Done-when is unreachable, and no phase's Entry mentions P8b-2.
EVIDENCE: P8b Entry, Scope last bullet, Done-when, Size hatch; §4 'Chain anchor channel + SMTP relay credentials' row
CHANGE: Remove the credentials from P8b's Entry. Done-when: 'one head hash delivered, or "unanchored" shown in verify output and CLAUDE.md when no credentials exist'. If P8b-2 is opened, move that check there and add 'P8b-2 merged' to P9a-2's Entry, since the stager calls verify first.
CHECK: found=true supports=true — Confirmed. P8b Entry (line 764) requires the anchor channel and SMTP credentials. Done-when (line 776) requires one head hash delivered. Scope (774-775) and the §4 row (line 911) say that without credentials the chain is "unanchored". "P8b-2" appears only in the P8b size hatch (line 777), and no Entry, including P9a-2's, mentions it.

--- CON3-15 [MINOR] P2b-2 Scope vs P0a item 1 / rule 6 (conf 0.65)
CLAIM: P0a item 1 (MUST, today) sends the written hold notice. P2b-2, which comes much later, is the phase that first writes `docs/program/notices/fleet-hold.md` (English and Urdu). Either the text that was actually sent goes unrecorded, or it gets rewritten after the fact. Rule 6 relies on 'the P0a hold notice'.
EVIDENCE: P0a item 1; P2b-2 Scope last sentence; rule 6; NT-20
CHANGE: P0a item 1 commits the text as sent to `docs/program/notices/fleet-hold.md` (both languages). P2b-2 writes only `release.md`.

--- CON3-16 [MINOR] P4a step 4 vs P0a item 12 (conf 0.5)
CLAIM: In K=yes, the pilot clocks in 'with the app's network on' before `adb install -r`. That is safe only behind a hang stub. With H=no, the field build talks to Railway's 404, so the clock-in parks and pings drop, which breaks P0a 12 ('stays until the phone's update or a verified hang stub').
EVIDENCE: P4a step 4; P0a item 12; O-10 C H=no
CHANGE: P4a step 4: with H=no, turn the network on only immediately before `adb install -r`, and record that any edge-404 park is expected to be un-parked by D3.

--- CON3-17 [MINOR] §0 rule 5 (conf 0.6)
CLAIM: Rule 5 allows proxy mode for K=no & H=yes but then says 'never 2xx/204 to the field build'. Proxying the box's 2xx responses to the field build is the whole purpose of the K=no drain, so the rule contradicts itself as written.
EVIDENCE: rule 5; P3a hang-stub proxy mode; O10-F4 (stub-fabricated 2xx)
CHANGE: 'never a stub-originated 5xx, 2xx or 204; in proxy mode, app responses carrying the marker pass through unchanged'.

--- CON3-18 [MINOR] P0a item 2 order / P3b step 2 / P4c extension (conf 0.5)
CLAIM: Item 2 ('in this order') seals the old JWT secret 'if K=no (item 6)', but K is only learned later, in item 6. Separately, P3b sets FIXFLOW_LEGACY_JWT_EXPIRES_AT to 'the planned T_close', while P4c lets T_close be 'extendable once in writing'. If the window is extended, the verifier expires mid-window.
EVIDENCE: P0a items 2 and 6; P3b step 2; P4c Entry
CHANGE: Item 2 always copies and seals the old secret. P4c: extending the window also extends FIXFLOW_LEGACY_JWT_EXPIRES_AT, followed by a restart, recorded.

--- CON3-19 [MINOR] §2 graph vs Entry lines (conf 0.55)
CLAIM: The graph and the Entry lines disagree in places. The graph has P2b-2 ─► P2c, but P2c's Entry has no P2b-2. The graph has 'P3c, P7b-2 ─► P13a' but omits P13a's 'after T_close'. The graph has 'P3a ─► P12a', but deploying P12a needs the box (P3b).
EVIDENCE: §2 graph; P2c Entry; P13a Entry; P12a Entry/Done
CHANGE: Graph: P2b-1 ─► P2c; P4c ─► P13a; P3b ─► P12a. Alternatively, align the Entry lines with the graph.

--- CON3-20 [MINOR] P4a Done-when / P3a runbook R1–R7 / §6.3 (conf 0.5)
CLAIM: 'R' labels refer to three different lists. P4a's '(R7)' and '(R2 forward-only)' mean O-10 rollback items. 'RUNBOOK-SELFHOST R5' means the O-08 deploy step. §6.3 R1–R9 are rulings. P3a writes 'R1–R7 incl. R5 deploy of a tag', which a session could take for O-10's R5 ('install refused').
EVIDENCE: P4a Done-when; P3a runbook bullet; O-08 line 84 skeleton; O-10 ROLLBACK R1–R8; §6.3
CHANGE: Prefix every reference: 'O-10 R7', 'O-10 R2', 'runbook R5', 'ruling R5'.

--- CON3-21 [MINOR] §4 negotiation row / P7a (conf 0.5)
CLAIM: §4 says the note on a below-original negotiation is 'optional until v2 is fleet-wide', which implies it becomes required afterwards. P7a only ever flags a missing note, P5b just sends it, and no phase after P5d-1a makes it required.
EVIDENCE: §4 'Negotiation below original' row; P7a bullet 3; P5b 'Negotiate reason field'
CHANGE: Either add a P7b-1 Scope item ('below-original negotiate without a reason → 422 once the fleet is on v2'), or change the §4 text to 'flagged, never required'.

--- CON3-22 [MINOR] P5a telemetry names / P6b-2 Entry (conf 0.5)
CLAIM: P5a puts the event names in 'a shared constant P6b-2 consumes'. P5a is TypeScript and P6b-2 is Python, so the backend cannot import that constant, and P6b-2's Entry then has nothing it can mechanically depend on.
EVIDENCE: P5a Scope Diagnostics bullet; P6b-2 Entry 'event names fixed in the shared constant'; P6a fixture precedent (JSON in repo)
CHANGE: P5a commits the event names as a JSON file next to the P6a fixture. Both runtimes load it, with a test on each side.

--- CON3-23 [MINOR] P0a items 6 and 10; §5 P2/P3 line (conf 0.5)
CLAIM: Item 6 needs `adb pull` on every roster phone today, but item 10 enables USB debugging only 'on the pilot phone'. Separately, §5's P2/P3 line maps `O05-08..F13` to 'P3a/P7a/P0a/P7b-2/P12' and leaves out P7b-1, which closes O05-10 (logout and token TTL).
EVIDENCE: P0a items 6 and 10; P7b-1 Scope 'O05-10'; §5 P2/P3 paragraph
CHANGE: Item 10: USB debugging enabled on every roster phone (needed for item 6). In §5, add P7b-1 to the O05-08..F13 mapping.

FAILED: []
