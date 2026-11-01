# Stage-3 delta check of SHIP-PLAN-2026-11 v4 (2026-11-01) — adjudicated in the plan §6.4

Raw output of the `ship-plan-v4-delta-check` workflow (run `wf_056640f4-4d2`; an earlier run
`wf_96f44719-2bd` was stopped because it had started against the v3 text): two Opus reflection
checkers over the 52 v3-verification findings and one Opus cold consistency read of v4, with
Sonnet citation checks on every blocker/major. 47 findings: 1 blocker (the mixed-fleet proxy
guard in P4r), 18 majors, 28 minors. Plan v5 was written from this file; no further pass is
scheduled.

---

==================== reflect:A — 6 findings; ok: RFL3-1, RFL3-2, RFL3-3, RFL3-4, RFL3-5, RFL3-6, RFL3-7, RFL3-8, V3R-1, V3R-3, V3R-4, V3R-5, V3R-6, V3R-8, V3R-9, V3R-10
SUMMARY: I checked all 19 reflect:A/B ids (RFL3-1..8, V3R-1..11) against v4. 16 are adequately reflected. Three are not:
- V3R-2: release/drain still allows a "merge", which can pull P6a/P7a onto the drain branch.
- V3R-11: P7b-2 still lets its web part deploy at any time from main. §0 also omits the P9b and P10a web halves, and P4c never rebuilds the web image.
- V3R-7: R9's ledger-entry mapping is overbroad, because the stager ships idle.
Two fixes introduced minor new gaps. The drain-branch definition leaves out the P3a-2 hatch. P4c never carries out P0a item 2's "destroyed at P4c" for the sealed old secret. A code check confirmed set_pin does not bump token_version, so the legacy verifier's kept `ver` check stays usable after the P3b PIN rotation.

--- DV4-RB-1 [MAJOR] §0 Merge-is-not-deploy / ruling R5 (V3R-2) (conf 0.6)
CLAIM: The V3R-2 fix defines release/drain as 'P1's merge commit with the P2b-2 and P3a merge commits applied (merge or cherry-pick), and nothing else'. Allowing 'merge' reopens the hole. P6a and P7a need only 'P1 merged' and may land on main before P2b-2 or P3a. Merging the P2b-2 or P3a merge commit into release/drain then brings in its whole ancestry, P6a/P7a included, which breaks rule 3.
EVIDENCE: v4 line 45 '(merge or cherry-pick)'; P6a Entry 'P1 merged. Merge to main any time'; P7a Entry 'P1 merged'; V3R-2 CHANGE (cherry-pick only); standing rule 3
CHANGE: §0 and R5: 'P2b-2 and P3a applied by `git cherry-pick -m 1 <merge commit>` only (never `git merge`); after the cut, `git log release/drain` must show no commit from another PR, recorded in W0-results'. Use the same wording for the window-fix re-cut.
CHECK: found=true supports=true — v4 line 45 says "(merge or cherry-pick)" and R5 (line 1123) adds no method or check. P6a Entry (line 707) says "Merge to main any time", and line 758 gives P1-merged entry. Rule 3 (line 71) says nothing else until T_close. Merging a merge commit pulls in its ancestry, so the gap is real.

--- DV4-RB-2 [MAJOR] P7b-2 Done-when vs §0 web-image rule (V3R-11) (conf 0.6)
CLAIM: V3R-11 is only half applied. §0 says the web image before T_close is built only from release/drain plus P12a/P12. But P7b-2 (Entry 'P3c done', so it can run before T_close) says 'ops and web parts may deploy any time'. A session that deploys its react-router bump from main before T_close ships P6a's web half (board sampler_state, effective_time) against the drain backend, the exact hazard V3R-11 named. §0 also lists only P6a and P7b-1 as web halves riding the train, but P9b and P10a have web pages too.
EVIDENCE: v4 line 54 (§0 web image); line 812 P7b-2 'ops and web parts may deploy any time'; P9b/P10a Scope (web pages); V3R-11 CHANGE
CHANGE: P7b-2: 'web part: before T_close, cherry-picked onto the release/drain web build like P12; otherwise it rides the train'. §0: 'web halves of mixed PRs (P6a, P7b-1, P9b, P10a) ride the train'.
CHECK: found=true supports=true — Confirmed in v4. Line 53-55 builds the pre-T_close web image from release/drain plus P12a/P12 and lists only P6a and P7b-1 as web halves riding the train. P7b-2 (line 812) says 'ops and web parts may deploy any time' and gives no drain-branch rule for its react-router bump. P9b (876) and P10a (885) have web pages but are not in §0's list. Nothing else in the plan resolves it.

--- DV4-RB-3 [MINOR] P4c deploy train (V3R-11 / RFL3-6 follow-on) (conf 0.45)
CLAIM: Web halves 'ride the train', but P4c's train names only backend evidence: 'every queued merge deployed from main … /api/ops/health head and digest recorded per row'. No step rebuilds the web image from main at T_close. P6a's web half could stay undeployed while its backend is live, and P12's 'from main after' has no switch-over point.
EVIDENCE: v4 P4c Scope; §0 'web halves of mixed PRs … ride the train'; P12 Done-when 'from main after'
CHANGE: P4c train, last row: 'web image rebuilt from main and deployed (`docker compose --profile web`); CSP and one web-half check (the board shows sampler_state) recorded'.

--- DV4-RB-4 [MINOR] §0 / R5 vs P3a-2 hatch (V3R-2) (conf 0.45)
CLAIM: P3a's hatch says 'the tag is cut after P3a-2 instead', which implies P3a-2's stub and heartbeat commits belong on the drain branch. But §0 and R5 define release/drain as 'P1 + P2b-2 + P3a, nothing else'. If the hatch is taken, a session cannot tell whether to cherry-pick P3a-2.
EVIDENCE: v4 line 454 P3a-2 hatch; §0 line 45; R5 '(P1 + P2b-2 + P3a, nothing else)'
CHANGE: §0 and R5: 'P1 + P2b-2 + P3a (+ P3a-2 if opened)'. P3a-2 Done-when: '+ release/drain and drain-image tag cut if it merges last'.

--- DV4-RB-5 [MINOR] P0a item 2 vs P4c (RFL3-7 / V3R-3 follow-on) (conf 0.4)
CLAIM: The fix seals the old JWT secret unconditionally and says it is 'destroyed at P4c otherwise'. P4c's Scope (and so its step table) only unsets FIXFLOW_LEGACY_JWT_SECRET on the box. It never destroys the sealed copy when the §4 answer is no or the branch is K=yes, so a live signing secret for the field tokens outlives the window with no owner.
EVIDENCE: v4 line 198 'destroyed at P4c otherwise'; P4c Scope 'FIXFLOW_LEGACY_JWT_SECRET unset (P4r re-sets it per session if needed)'
CHANGE: P4c Scope: 'if the §4 O10-F15 answer is no (or no K=no & H=yes & v2=no phone): destroy the sealed old secret and record it; otherwise keep it until the last re-open, then destroy and record'.

--- DV4-RB-6 [MINOR] §6.4 R9 (V3R-7) (conf 0.4)
CLAIM: R9 claims 'every ledger entry becomes a posting the manager decides, so ledger entries are covered there'. That holds only after a stager start date. §4 ships the stager idle ('Pakka record set … start date' default 'stager idle'), and rows before the start date never stage. Manual staff_ledger entries in that period have no approval record, which is the gap V3R-7 named.
EVIDENCE: v4 line 1134 R9; §4 'Pakka record set, basis, start date' → 'stager idle'; P9a-2 'idle without a start date'; w2/O-07-design.md line 91; w2/O-06-design.md item 3
CHANGE: R9: 'ledger entries from the stager start date → posting_decision; earlier or idle-period manual entries are out of scope (reason: the chain, P8b, gives tamper evidence; approval starts with the pakka start date)'.

==================== reflect:B — 18 findings; ok: RC-FIT2-01, RC-NT14-token, RC-NT1-msys, RC-NT11-vc, RC-NT7-order, RC-NT18-web, RC-NT20-notice, RC-FIT2-14, CON3-02, CON3-04, CON3-05, CON3-06, CON3-07, CON3-08, CON3-09, CON3-11, CON3-12, CON3-15, CON3-16, CON3-18, CON3-19, CON3-20, CON3-21, CON3-22, CON3-23
SUMMARY: I checked the 33 RC-*/CON3-* findings against v4. Most are reflected: train-form Done-whens, the Appendix B `job.token` fix, MSYS/exports, the STOP rule, retired rows, the full P4r, the PII setting owned only by P7b-1, the unconditional verifier and the graph. Five are unresolved or mis-resolved. CON3-01: 'merge or cherry-pick' of squash commits lets main leak into release/drain. CON3-10: the B5 pg_dump lacks `exec -T`. CON3-13: P7b-2's web half still 'deploys any time'. CON3-17/RC-NT8: the P3a stub spec does not require the marker. CON3-03/RC-NT23: no phase removes the stub after the last P4r. The fixes also introduced new problems: the P4r proxy switch exposes late K=yes phones, P4r can install v2 before P5c, the train's post-deploy checks write to production money records, the P8b hatch leaves an unreachable Done-when, and backup_enabled defaults to true.

--- D4-CON3-01-merge [MAJOR] §0 Merge is not deploy / ruling R5 / P1, P2b-2, P3a tag item (conf 0.65)
CLAIM: v4 builds `release/drain` from "P1's merge commit with the P2b-2 and P3a merge commits applied (merge or cherry-pick)". The repo squash-merges (git log on main: #168–#176 are single commits). A `git merge` of P3a's commit pulls in every earlier commit on main, including P6a, P7a or P8a if they merged first. That breaks "nothing else", which is exactly the CON3-01 hole the branch was meant to close.
EVIDENCE: v4 §0 lines 43-46; R5 'nothing else'; P6a 'Merge to main any time', P7a Entry 'P1 merged'; `git log main` shows squash commits; CON3-01.
CHANGE: §0 and R5: 'release/drain = branch at P1's commit; P2b-2 and P3a (and P3a-2 or fixes) applied ONLY by `git cherry-pick` (never `git merge`); the tagging session records `git log release/drain` in W0-results'.
CHECK: found=true supports=true — §0 lines 44-45 say release/drain is "P1's merge commit with the P2b-2 and P3a merge commits applied (merge or cherry-pick)". R5 (line 1123) says "nothing else". Git log on main shows single squash commits (#168-#176). A git merge of a later commit would pull in any earlier main commits, so "merge" permits that hole. No "never git merge" or git-log recording rule appears anywhere in the plan.

--- D4-CON3-10-tty [MAJOR] P3a runbook B5 commands / P4a step 2 / P4r (conf 0.6)
CLAIM: The new B5 command is `docker compose exec postgres pg_dump --format=custom … > predrain-<stamp>.pgdump`, which leaves out `-T`. `docker compose exec` allocates a TTY by default, and binary custom-format output through a TTY gets LF→CRLF mangled. The O-10 R1/R2 rollback point could then be a corrupt file, and no one would find out until a rollback needs it. No step restores-tests B5, either. The runbook's restore line does use `exec -T`, so the omission is not deliberate.
EVIDENCE: v4 P3a lines 437-438; compare line 431 `docker compose exec -T postgres psql`; P4a step 2; CON3-10.
CHANGE: Change the runbook to `docker compose exec -T postgres pg_dump -U fixflow_app -d fixflow --format=custom > predrain-<stamp>.pgdump`, then `pg_restore -l` it and record the sha256 before upload (P4a step 2, P4r).
CHECK: found=true supports=true — Plan line 437 gives `docker compose exec postgres pg_dump --format=custom … > predrain-<stamp>.pgdump` with no `-T`, while line 431 uses `exec -T`. P4a step 2 and P4r only say "per the runbook" and "fresh B5 snapshot". Nothing in the plan runs `pg_restore -l` on B5 or records its sha256. Only the pre-selfhost dump (line 210) gets a sha256. CON3-10 added the B5 command.

--- D4-CON3-13-p7b2 [MAJOR] P7b-2 Done-when vs §0 web-image rule / ruling R5 (conf 0.6)
CLAIM: §0 now says the pre-T_close web image is built from `release/drain` plus P12a/P12 only, and that 'web halves of mixed PRs … ride the train'. P7b-2 is a mixed PR (react-router bump; Entry P3c done, so it can land before T_close), yet it still says 'ops and web parts may deploy any time'. A session would ship a web build from main, which carries P6a's web half against the drain-image backend. That re-opens V3R-11/CON3-13. Separately, §0 lists P7b-1 as a train rider, but P7b-1 is always post-T_close.
EVIDENCE: v4 §0 lines 53-55; P7b-2 lines 811-812; P7b-1 Entry (needs P5d-1a, which follows P4c); CON3-13, V3R-11.
CHANGE: P7b-2: 'ops part may deploy any time; web part rides the train before T_close (or is cherry-picked as web-only onto the web build)'. In §0, replace '(P6a, P7b-1)' with '(P6a, P7b-2)'.
CHECK: found=true supports=true — Confirmed. §0 (lines 53-55) says the pre-T_close web image is release/drain plus P12a/P12, and the web halves of mixed PRs "(P6a, P7b-1)" ride the train. P7b-2 (lines 811-812) is a mixed PR with a web react-router bump and Entry P3c only, yet says "ops and web parts may deploy any time". P7b-1 Entry needs P5d-1a, which needs P5c and P6b-2, which follow P4c, so it is always post-T_close. I did not open CON3-13 or V3R-11.

--- D4-CON3-17-marker [MAJOR] §0 rule 5 vs P3a hang-stub spec (conf 0.5)
CLAIM: Rule 5, as reworded, says that 'in proxy mode only the backend's own marker-carrying responses pass through'. The P3a stub spec still says it passes 'the backend's responses through unchanged' and hangs only 'on any upstream error, 5xx or timeout'. So a markerless 4xx, such as the Cloudflare 429 from the P3c login rate rule or a 403/404 from the edge, passes through to a field build that has no marker awareness. That build treats the 4xx as definitive: pings and travel are dropped, and writes are parked. The stub tests are written from the P3a spec.
EVIDENCE: v4 rule 5 lines 78-80; P3a lines 422-425; P3c step 5 (429 rule); CLAUDE.md droppable pings/travel on definitive 4xx; RC-NT8-rule5, CON3-17.
CHANGE: P3a stub proxy mode: 'pass a response through only if it carries `X-FixFlow-Api: 1`; hang on any markerless response, any 5xx, error or timeout'. Add a test: a markerless 429 causes a hang.
CHECK: found=true supports=true — Rule 5 (lines 76-80) says only marker-carrying backend responses pass through in proxy mode. P3a (lines 422-425) says responses pass through unchanged and the stub hangs only on upstream error, 5xx or timeout. It has no marker test. The plan has no other stub-level marker rule. A markerless 4xx, such as the Cloudflare 429 from the P3c rate rule (lines 442, 514), would therefore pass through, contradicting rule 5.

--- D4-CON3-03-p4r-proxy [MAJOR] P4r Scope (K=no & H=yes) vs §2 network-cut rule (conf 0.5)
CLAIM: In K=yes mode, a phone's network cut lifts once a hang stub is verified (§2). A K=yes phone that missed the window can therefore be online on the field build. When P4r 'switches the stub to proxy' for a late K=no phone, that K=yes phone starts draining through the proxy without supervision: no manifest and no BEFORE proof, and on v2=no it drops job writes on the first 401 (O10-F15). The mixed-fleet guard ('hangs until every K=yes phone has its P4b row') protects only P4a/P4b.
EVIDENCE: v4 §2 lines 132-136; P4r lines 606-608; P4c 'switched to hang while any roster phone lacks a row'; O-10 BRANCH K=NO; CON3-03, CON3-04.
CHANGE: P4r: 'before the proxy switch, every roster phone without a P4b/P4r/retired row has its network cut re-imposed and verified (recorded); the proxy reverts to hang at session end'.
CHECK: found=true supports=true — Cited text exists (§2 lines 132-136, P4r, P4c, CON3-03/04). §2 lifts the cut for K=yes once a hang stub is verified. The mixed-fleet guard appears only in P3c 4 and P4b scope. P4r switches the stub to proxy with no guard and no cut re-imposition. A late K=yes phone can still be online and drain unsupervised; the O10-F15 401 drop is documented.

--- D4-CON3-03-p4r-v2 [MAJOR] P4r Scope (APK choice) (conf 0.5)
CLAIM: P4r installs 'v2 if P5b's build exists'. A v2 build exists as soon as P5b finishes, which is before P5c has validated v2 on any device. The new native patches (#49424/#52230/#50060) first run on a real phone in P5c, and P5d-1a gates the fleet on 'P5c passed'. A late phone could therefore get an unvalidated native build in the middle of a drain, and a crash there puts its undrained queues at risk.
EVIDENCE: v4 P4r line 605; P5a Done (compile only); P5c Scope; P5d-1a Entry 'P5c passed'; standing rule 1.
CHANGE: P4r: 'the APK is v2 if P5c passed, else fleet v1 (before P7b-1)'.
CHECK: found=true supports=true — Plan line 605 says P4r's APK is "v2 if P5b's build exists". P5b's Done-when is a v2 build finished green, with no device validation. P5c (Entry: P5b's build green) is the first on-device run, and P5d-1a Entry requires "P5c passed". A late phone could therefore get unvalidated v2. Nothing in P4r requires P5c passed.

--- D4-FIT2-01-checks [MAJOR] P4c deploy train post-deploy checks (P8a, P9b) and P4c sizing (conf 0.5)
CLAIM: The train form moves the post-deploy checks into P4c, but two of them write to immutable production money records. P8a's check needs 'a void shows voided_by/at', which means voiding a real payment. P9b's check needs 'a staged posting approved moves the delta', which means an immutable posting_decision that then flows to the Odoo export, and the stager is idle with no start date anyway. P8b's head-hash check waits on a daily job that has no manual trigger. P4c also now carries up to nine sequential deploys (about 15 min each) with no size hatch and no halt rule if a row fails.
EVIDENCE: v4 P4c lines 596-599; P8a line 824; P9b lines 881-882; P9a-2 'idle without a start date'; P9a-1 immutability triggers; RC-FIT2-01, CON3-02.
CHANGE: Make the P8a and P9b checks read-only (schema/columns present; the reconciliation GET returns 200 with counts). Give P8b's check a manual verify run. Add to P4c: 'a failing row halts the train (runbook R-rollback); the train may continue as P4c-train (×n)'.
CHECK: found=true supports=true — Confirmed in v4. P4c (lines 596-599) runs each row's post-deploy check, "e.g. P8b's head hash, P9b's delta". P8a line 824 requires "a void shows voided_by/at"; P9b lines 881-882 require "a staged posting approved moves the delta". P8b's check waits on a daily job, and the plan gives no manual trigger. P4c has no size hatch and no halt rule (no rollback wording). RC-FIT2-01 and CON3-02 exist.

--- D4-CON3-14-hatch [MINOR] P8b Size hatch / Done-when (conf 0.55)
CLAIM: The hatch moves 'the verify job and mailer' to P8b-2, and P9a-2's Entry now waits for it. But P8b's Done-when still requires 'one head hash delivered, or "unanchored" shown in the verify output', which cannot be reached once the verify job has moved. P8b-2 also has no Entry, no Done-when, and no row in the train. CON3-14 asked for the check to move.
EVIDENCE: v4 P8b lines 842-847; P9a-2 Entry; CON3-14 CHANGE 'If P8b-2 is opened, move that check there'.
CHANGE: P8b hatch: 'P8b's Done-when then drops the head-hash/unanchored check; P8b-2 (Entry P8b merged; Done: that check, merged; deploy-train row added or deployed after T_close)'.

--- D4-CON3-03-final [MINOR] P4c / P4r stub lifecycle / rule 5 (conf 0.5)
CLAIM: P4c removes the stub 'only when none' lacks a row, and rule 5 says the same. If a phone is still late at P4c, though, no phase removes the stub after the last P4r: P4r's Scope never checks 'was this the last phone'. The O05-07 lifecycle row (§5 'P4c (stub lifecycle)') then stays open indefinitely.
EVIDENCE: v4 P4c lines 594-596; P4r lines 604-613; rule 5 line 80; §5 O05-07 row.
CHANGE: P4r Scope end: 'if every roster phone now has a P4b/P4r/retired row: remove the stub (or keep the subdomain bound to a hang stub per O05-07), record it, and run rule 4's last-re-open step'. Map O05-07 in §5 to P4c/P4r.

--- D4-CON3-18-seal [MINOR] P0a item 2 vs P4c (conf 0.55)
CLAIM: Item 2 now seals the old secret unconditionally, to be 'destroyed at P4c otherwise'. P4c only unsets the env var: it never destroys the sealed copy in the 'no' case, and never says to keep it for P4r in the 'yes' case. A session therefore has no step for either.
EVIDENCE: v4 P0a item 2 lines 196-198; P4c lines 596; P4r 'on the §4 yes … re-set'; RC-NT7-order, CON3-18.
CHANGE: P4c Scope: 'if §4 O10-F15 = no, destroy the sealed old secret (password-manager entry and paper) and record it; if yes, keep it until the last P4r, which destroys it'.

--- D4-CON3-05-backup [MINOR] P3a compose vs P3b step 4 / P3c step 7 (conf 0.6)
CLAIM: P3b step 4 expects deep-health to show `backup_enabled=false`, and P3c step 7 later sets it to true. But `backup_enabled` defaults to True (config.py:197), and P3a's compose sets only `FIXFLOW_BACKUP_PREFIX`. The P3b read-back therefore fails, or the box backs up before P3c verifies the prefix.
EVIDENCE: backend/app/core/config.py:197 `backup_enabled: bool = True`; v4 P3a lines 419-421; P3b step 4; P3c step 7; CON3-05.
CHANGE: P3a compose bullet: add `FIXFLOW_BACKUP_ENABLED=false` (flipped in P3c step 7).

--- D4-CON3-05-digest [MINOR] P1 deep-health / P3a compose / §0 / P4c (conf 0.45)
CLAIM: P1 says `FIXFLOW_IMAGE_DIGEST` is 'set at build time from the tag or commit'. An image cannot contain its own digest, so the value is a git ref labelled as a digest. A session verifying a deploy by content (CLAUDE.md trap) against `docker inspect` would see a mismatch.
EVIDENCE: v4 P1 lines 286-287; P3a line 414; §0 line 53; P4c 'digest recorded per row'; CON3-05.
CHANGE: Rename it to `FIXFLOW_GIT_SHA` (build-arg from `git rev-parse HEAD`/tag). Have P4c and runbook R5 record both deep-health's sha and `docker inspect --format '{{.Image}}' backend`.

--- D4-CON3-01-table [MINOR] §0 deploy-train table / P3a first act / P6a, P7a (conf 0.45)
CLAIM: P3a's first act creates the deploy-train table, but P6a and P7a share P3a's Entry (P1 merged) and may merge first. Their Done-when 'deploy-train row added' then has no table to add a row to.
EVIDENCE: v4 §0 line 50; P3a Entry line 411; P6a Entry line 707; P7a Entry line 758.
CHANGE: §0: 'the first phase that needs the deploy-train table creates it (empty, columns fixed in §0); P3a confirms it exists'.

--- D4-CON3-23-order [MINOR] P0a items 3, 4, 6 vs item 10 (conf 0.55)
CLAIM: Items run 'in this order', yet items 3, 4 and 6 use Docker, adb, apksigner, `eas credentials` and USB debugging, which only item 10 sets up. This is the same shape RC-NT7-order fixed for item 2: a session that follows the order hits item 3 without its tools.
EVIDENCE: v4 P0a line 190 'in this order'; items 3-4 (docker run), item 6 (adb pull, apksigner, eas credentials), item 10 (tools; USB debugging on every phone); RC-NT7-order, CON3-23.
CHANGE: Move 'Tools and access' to item 0 (before item 1), or say 'item 10's tools are set up before item 3'.

--- D4-NT1-appc [MINOR] P0a item 4 (conf 0.5)
CLAIM: Item 4 says to 'verify it the same day with design Appendix C', but Appendix C needs `ARGS_DUMP_PATH`, `ARGS_LOGDIR` and an `$ARGS_LOGDIR/appendix-b.sql` file extracted from Appendix B, and item 4 sets none of them. The 'copy it to archive/pre-selfhost/' upload also has no command or mount, unlike item 3's commands.
EVIDENCE: ORCHESTRATION-DESIGN-2026-10.md:692, :703-704; v4 P0a item 4 lines 207-211; RC-NT1-msys.
CHANGE: Item 4: `export ARGS_DUMP_PATH=C:/fixflow-dumps/supabase-<date>.dump ARGS_LOGDIR=C:/fixflow-dumps/logs`; save the Appendix B block as `$ARGS_LOGDIR/appendix-b.sql`. Upload with `docker run --rm -v C:/fixflow-dumps:/up -e AWS_… amazon/aws-cli --endpoint-url … s3 cp /up/supabase-<date>.dump s3://<bucket>/archive/pre-selfhost/`.

--- D4-CON3-11-rerun [MINOR] P4a Done-when (mismatch) / §3 checklist (conf 0.45)
CLAIM: After a mismatch, P4a counts as 'done' but not 'passed', and 'the pilot re-run happens on the next undrained phone'. P4a is not marked repeatable, though, and does not say which steps a re-run repeats (B4/B6 are already done, and the field protocol has already been observed). Its Pilot-table resume cannot represent a second pilot.
EVIDENCE: v4 P4a lines 568-572; P4b Entry 'P4a passed'; §0 Sessions (×n) rule; CON3-11.
CHANGE: Mark it 'P4a (×n until passed)'. A re-run session repeats B5 (fresh snapshot + --snapshot-fuel) and E1–E6 on the next phone, and adds a row to the Pilot table.

--- D4-CON3-10-json [MINOR] P2b-2 --snapshot-fuel / P4a / P4r (conf 0.4)
CLAIM: `--snapshot-fuel OUT.json` runs through `docker compose exec backend`, so the file is written inside the container. A drain-image re-cut (`drain-image-2`) or a restart between B5 and AFTER wipes it, and the `--fuel-baseline` diff then has no input. Neither the runbook nor P4a says where the file lives.
EVIDENCE: v4 P2b-2 lines 373-379; P3a B5 runbook line 438; §0 re-cut rule; P4a step 2/4.
CHANGE: Runbook: write to a bind-mounted `/var/lib/fixflow/drain/` (or `docker compose cp` it out right after B5) and upload it with the B5 dump to `archive/pre-drain/`.

--- D4-CON3-22-path [MINOR] P5a event-names JSON / P6a fixture (conf 0.4)
CLAIM: The event-names JSON sits 'next to the P6a fixture', which is a backend-phase file with no stated path, and v4 says it is 'loaded by both runtimes'. The mobile app needs the names at runtime, inside the Metro bundle. A JSON outside `technician-app/` needs a Metro watchFolders change, and nothing is planned for that.
EVIDENCE: v4 P5a lines 632-634; P6a line 710-711 (fixture, no path); P6b-2 Entry; CON3-22.
CHANGE: Name the paths: the fixture and event-names JSON live in `technician-app/src/shared/` (bundled). Backend tests read them by repo-relative path, and a CI test fails if they drift.

==================== attack:consistency-v4 — 23 findings; ok: Rule 3 vs backend Done-whens: P1, P2b-2, P3a undeployed; P7a/P8a-P10a in train form; P6b-1, P6b-2, P7b-1, P13a-c deploy only after P4c via Entry chains, Rule 1 K=no exception consistent with P4a K=no/H=yes and K=no/H=no rows, Rule 4 last re-open defined and used consistently (P4c, P4r re-seed; no phase enables the dispatcher), Rule 6 notices: fleet-hold.md in P0a, release.md in P2b-2 before P4a, Numbers consistent: 24h code default, 48h jobs GPS, 240h ping (G2 §5 ruling), 336h device_time/retry constant/P6b-1, T_open+7 days, 6-digit PINs, radius >=100 m, 100 m ceiling, >=20 s hang vs 15 s client abort, 32-byte secret (G2-D2), Deep-health fields read later are all in P1's exposure bullet or exist (jwt_secret_overridden in health.py:110), set_pin does not bump token_version (identity/service.py:125), so P3b rotation does not break the legacy verifier, job_payment_amount_positive exists NOT VALID (0038) for P13d, R1-R10 reflected in P6a/P5a, P4a/P4c, P2b-1/P5b/P7b-1, P3b, rule 3, P13d, P14, P2a, P9a-1/P10a, P1, §5 covers every G2 §2 P1 row
SUMMARY: Cold read of v4: most rules, numbers and rulings are consistent. The concrete gaps are mostly mixed-fleet handling, deployment of the train, and artefact timing. P4r switches to proxy without the K=yes-first guard, which risks pre-manifest syncs and O10-F15 drops. A K=no pilot deadlocks P4b. P6a can merge after T_close with no deploy, yet P5c assumes it is deployed. The deploy-train table may not exist when P6a, P7a or P8a merge. The P3a-2 hatch contradicts the tag definition. P9b's and P8a's train checks are unreachable or need real money mutations. Runbook R5 cannot deploy intermediate commits. P4r can install v2 before P5c. No phase removes the stub after the last P4r. Smaller issues: the runbook's psql -d mismatch, the backup_enabled default, P0a tool ordering, and graph omissions.

--- DC4-01 [BLOCKER] P4r / P4b / §2 branch box (mixed fleet) (conf 0.6)
CLAIM: P4a step 3 guards the proxy switch with "mixed fleet: only after every K=yes phone's P4b row", but P4r does not. P4r says "K=no & H=yes: the stub switched to proxy" with no such guard. In a mixed fleet, a late K=yes phone whose cut lifted at P3c ("K=yes and a hang-mode stub is verified") would sync its field build through the proxy before any manifest exists, and a pre-v2 build drops job writes on the first 401. P4b also has no step that makes the hang→proxy switch for the K=no rows.
EVIDENCE: P4a step 3; P4r Scope; §2 Mixed fleet and Network cut bullets; O10-F15; O-10 D4; CON3-04
CHANGE: P4r: "Mixed fleet: before proxy mode, every K=yes phone lacking a row has its network re-cut (recorded), or the K=no session waits." P4b Scope: "When the last K=yes phone has its row, switch the stub to proxy (recorded); K=no rows only after that."
CHECK: found=true supports=true — Cited evidence exists (P4a step 3 guard, §2 Mixed fleet bullet, O10-F15, CON3-04). P4r says "K=no & H=yes: the stub switched to proxy" with no mixed-fleet guard. P4b has no hang→proxy switch step for K=no rows; only P4a step 3 (pilot) and the §2 bullet state it. The gap exists as claimed.

--- DC4-02 [MAJOR] P4a Entry / P4b Entry (mixed fleet) (conf 0.6)
CLAIM: Nothing says which branch the pilot phone must be on. If a mixed fleet's pilot is K=no, P4a step 3 cannot switch to proxy until every K=yes phone has its P4b row, and P4b's Entry needs "P4a passed". That is a deadlock.
EVIDENCE: P4a step 3 "(mixed fleet: only after every K=yes phone's P4b row)"; P4b Entry "P4a passed (AFTER matched)"; §2 Mixed fleet bullet
CHANGE: Add to P4a Entry: "In a mixed fleet the pilot is a K=yes phone; K=no phones run only as P4b rows after every K=yes row."
CHECK: found=true supports=true — Cited text exists: P4a step 3 (line 553), P4b Entry "P4a passed" (line 577), §2 mixed-fleet bullet (line 132). A whole-plan search for "pilot" finds no rule fixing the pilot's branch, and P4a step 4 handles a K=no pilot. A K=no pilot in a mixed fleet therefore deadlocks.

--- DC4-03 [MAJOR] P6a Done-when vs P5c Entry (conf 0.6)
CLAIM: P6a's Done-when stops at "merged; deploy-train row added". Unlike P7a, P7b-2 and P8a–P10a, it has no "(or deployed, after T_close)". If P6a merges after P4c, no phase ever deploys it. Yet P5c's Entry assumes "P6a deployed by the train, so the server applies the shared rule".
EVIDENCE: P6a Done-when; P7a Done-when "(or deployed, after T_close)"; P5c Entry; CON3-02
CHANGE: P6a Done-when: "merged; deploy-train row added (or deployed per runbook R5, after T_close)". P5c Entry: "P6a deployed" (not "by the train").
CHECK: found=true supports=true — P6a Done-when ends "merged; deploy-train row added" with no "(or deployed, after T_close)", unlike P7a and P8a onward. Its Entry says "Merge to main any time". P4c's train only deploys queued merges, so a P6a merge after P4c is never deployed. P5c Entry assumes "P6a deployed by the train". CON3-02 exists but covers other phases.

--- DC4-04 [MAJOR] §0 deploy train / P3a first act / P6a, P7a, P8a (conf 0.6)
CLAIM: The deploy-train table is created by "P3a's first act". P6a and P7a need only "P1 merged", and P8a needs only P7a, so any of them can merge before P3a starts. Their Done-when ("deploy-train row added") then writes to a table that does not exist yet.
EVIDENCE: §0 "P3a's first act commits the empty table"; P6a/P7a Entry "P1 merged"; P8a Entry "P7a merged"
CHANGE: Move the table creation to P1's last Scope item, or say "the first phase that needs the deploy-train table commits it if absent". P3a's first act becomes "confirm the table exists".
CHECK: found=true supports=true — Confirmed. §0 line 50 and P3a line 411 make P3a's first act commit the empty table. P6a (line 707) and P7a (line 758) both have Entry "P1 merged" ("merge any time"), and P8a needs only P7a. Nothing orders them after P3a, so a row could be added before the table exists. No "if absent" fallback exists anywhere in the plan.

--- DC4-05 [MAJOR] P3a size hatch vs rule 3 / §0 / ruling R5 (conf 0.6)
CLAIM: The P3a-2 hatch says "the tag is cut after P3a-2 instead". Rule 3, §0 and R5 define release/drain as "P1 + P2b-2 + P3a, nothing else", cut by "whichever of P1 / P2b-2 / P3a merges last". Including P3a-2 breaks that definition, and leaves unclear who cuts the tag if P2b-2 merges after P3a-2. The stub runs on Railway and the heartbeat is a host cron, so neither is part of the backend image.
EVIDENCE: P3a Size; §0 Merge-is-not-deploy; rule 3; §6.4 R5; P3b Entry
CHANGE: Hatch text: "P3a-2 does not affect the drain-image tag; P3c's Entry adds P3a-2 merged." Delete "the tag is cut after P3a-2 instead".
CHECK: found=true supports=true — P3a Size (lines 453-455) says "the tag is cut after P3a-2 instead". §0 (lines 44-46), rule 3 (line 71) and R5 (line 1123) define the drain image as P1 + P2b-2 + P3a only, cut by whichever of those three merges last. P3a-2 is not in that set, and the hatch doesn't say who cuts the tag if P2b-2 merges after P3a-2. I did not verify the claim that the stub and heartbeat sit outside the backend image.

--- DC4-06 [MAJOR] P9b / P8a post-deploy checks run in P4c (conf 0.55)
CLAIM: P9b's train check, "a staged posting approved moves the delta", cannot be run under the §4 default, because the stager stays idle without a start date and nothing is staged. Approving a real posting is also an irreversible decision. P8a's check, "a void shows voided_by/at", needs a real payment to be voided in production. Either way P4c's "All of the above recorded" can be unreachable or force a real money mutation.
EVIDENCE: P9b Done-when; P8a Done-when; P4c Scope "each row's post-deploy check"; §4 "stager idle"; P9a-2 Entry
CHANGE: P9b check: "reconciliation endpoint returns 200 with zero deltas; the approval check runs in P10b once a start date is set". P8a check: "schema head plus a void on a designated test job, or the next real void reviewed".
CHECK: found=true supports=true — Cited text exists. P9a-2 Entry and §4 say the stager is idle without a start date, so nothing is staged and P9b's "approved posting moves the delta" check cannot run. P8a's check needs a void, and no test job is designated. P4c requires every row's check run, with no exemption or deferral. Gap confirmed.

--- DC4-07 [MAJOR] P4c deploy train / runbook R5 (P3a) (conf 0.5)
CLAIM: P4c deploys "every queued merge from main in Alembic order with head and digest recorded per row". Runbook R5 only covers "deploy of a tag or of main", so intermediate merge commits have no deploy path. Up to about 9 rows (P6a, P7a, P7b-2, P8a, P8b, P9a-1, P9a-2, P9b, P10a) at about 15 min each, plus the window-close steps, also strains one session. start.sh already applies pending migrations in chain order.
EVIDENCE: P4c Scope; §0 "R5 deploy of a tag or of main"; P3a runbook list; CLAUDE.md start.sh runs all pending migrations
CHANGE: P4c: "Deploy main HEAD once per R5; record head and digest; then run each train row's post-deploy check. Fall back to per-row tags (train-<n>) only on a failure."
CHECK: found=true supports=true — P4c (line 596) requires every queued merge to be deployed from main in Alembic order, with head and digest recorded per row. P3a (line 441) lists R5 as "deploy of a tag or of main", and §0 (line 47) says R5 deploys only the drain-image tag before T_close. Neither says how to deploy a commit that is not main HEAD. P4c is also labelled "one session". The 9-row count is not in the plan, and the plan says start.sh behaviour only in CLAUDE.md.

--- DC4-08 [MAJOR] P4r Scope (APK choice) (conf 0.55)
CLAIM: P4r installs "v2 if P5b's build exists". That can put v2 on a roster phone before P5c has validated it on the pilot, which skips the P5c → P5d-1a order the plan applies to every other v2 install.
EVIDENCE: P4r Scope; P5c Entry/Done; P5d-1a Entry "P5c passed"
CHANGE: P4r: "the APK is v2 if P5c passed, else fleet v1 (then a P5d-1a row later)".
CHECK: found=true supports=true — v4 line 605 says P4r's APK is "v2 if P5b's build exists, else fleet v1". P5c Entry needs only P5b's build plus P4c. P5d-1a Entry requires "P5c passed" before fleet v2 installs. P4r has no P5c condition, so a late phone could get v2 before pilot validation. Rule 1 is the drain rule, not pilot-first.

--- DC4-09 [MAJOR] P4r Done-when / rule 5 / §5 O05-07 (conf 0.5)
CLAIM: Rule 5 and O-10 F require the stub to be removed once every roster phone has a row. P4c removes it "only when none does", but when late phones exist the last P4r is where that becomes true, and P4r's Done-when only says "every temporary setting reverted". No phase removes the stub, and §5 maps O05-07 (P1) to P4c only. Also, a retired phone that is lost still runs the field build pointed at the old host.
EVIDENCE: P4c Scope; P4r Done-when; rule 5; O-10 F "Delete the old-hostname stub"; G2 §2 O05-07
CHANGE: P4r Done-when: "if no roster phone now lacks a row: stub removed (or kept hanging while a retired-lost phone exists, owner decision), recorded". §5 O05-07: add P4r.
CHECK: found=true supports=true — Evidence exists. Rule 5 and O-10 F say the stub is removed once every roster phone has a P4b/P4r/retired row. P4c removes it "only when none does". P4r's scope only reverts the stub to hang and its Done-when is "row filled, every temporary setting reverted". Nothing in the plan removes the stub after a late P4r. §5 maps O05-07 to P0a, P3c and P4c only. The lost-phone point is an inference, not stated in the plan.

--- DC4-10 [MAJOR] P3a runbook restore commands (used by P3b step 3) (conf 0.55)
CLAIM: `psql -U fixflow_app -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public'` and the Appendix B call `psql -U fixflow_app -f /restore/appendix-b.sql` set no -d, so psql connects to a database named fixflow_app. `pg_restore … -d fixflow` restores into fixflow. The drop and the Appendix B gate therefore run against the wrong database, or fail. `docker compose cp <dump> postgres:/restore/` also assumes /restore exists in the container.
EVIDENCE: P3a Scope runbook restore sequence; P3b step 3
CHANGE: Runbook: `psql -U fixflow_app -d fixflow -c …` and `psql -U fixflow_app -d fixflow -f …`, plus `docker compose exec postgres mkdir -p /restore` before the cp.
CHECK: found=true supports=true — SHIP-PLAN-2026-11.md lines 431-434 (P3a runbook) show `psql -U fixflow_app -c 'DROP SCHEMA...'` and `psql -U fixflow_app -f /restore/appendix-b.sql` with no -d, while pg_restore uses `-d fixflow`. Nowhere in the plan is `mkdir` for /restore found, and docker-compose*.yml has no /restore mount. The gap is real.

--- DC4-11 [MINOR] P7b-2 Done-when vs §0 web-image rule (conf 0.6)
CLAIM: P7b-2 says "ops and web parts may deploy any time". §0 says the web image before T_close is built from release/drain plus the web-only commits P12a/P12, and that web halves of mixed PRs ride the train. P7b-2 is a mixed PR, and its react-router bump is a web half.
EVIDENCE: P7b-2 Done-when; §0 Merge-is-not-deploy (web image); §6.4 R5; CON3-13
CHANGE: P7b-2: "web part rides the train (or deploys from main after T_close); ops part may deploy any time."

--- DC4-12 [MINOR] P6a Entry (discard count) (conf 0.5)
CLAIM: P6a shows a "per-tech discard count on the board from the P2b-1 telemetry events", but P6a's Entry is only "P1 merged". The Discard event's name and props are fixed only when P2b-1 merges.
EVIDENCE: P6a Scope last bullet; P6a Entry; P2b-1 Step 6 "every Discard writes a telemetry event"
CHANGE: P6a Entry: add "P2b-1 merged (Discard event name fixed)", or move the discard count to P6b-2, which already consumes telemetry names.

--- DC4-13 [MINOR] P3a compose / P3b step 4 (conf 0.55)
CLAIM: P3b step 4 expects deep-health to show `backup_enabled=false`. The code default is ON (CLAUDE.md scheduler table; config), and P3a's compose bullet sets only BACKUP_PREFIX. The box would run nightly backups from P3b, before P3c step 7's restore check and the deliberate switch-on.
EVIDENCE: P3a Scope compose bullet; P3b step 4; P3c step 7 "then BACKUP_ENABLED=true"; CLAUDE.md scheduler table
CHANGE: P3a compose: `FIXFLOW_BACKUP_ENABLED=false` until P3c step 7, with the box-ready checklist checking it.

--- DC4-14 [MINOR] P0a item order (conf 0.5)
CLAIM: P0a requires the items "in this order". Items 3 and 4 use `docker run`, and item 6 uses adb, apksigner and USB debugging, but those tools (Docker Desktop, platform-tools, build-tools, JDK, USB debugging on every phone) are set up only in item 10.
EVIDENCE: P0a Deliverables items 3, 4, 6, 10
CHANGE: Move item 10 (tools and access) to before item 3, or add "set up item 10 first".

--- DC4-15 [MINOR] P4a AFTER-mismatch path (conf 0.45)
CLAIM: The mismatch path covers only a server-side fix ("cherry-picked onto release/drain and re-tagged"). If the defect is in the APK's drain tooling (manifest, un-park, gate), the fix needs a new fleet build with a higher versionCode and a P2c re-run before the next undrained phone, and no phase provides that.
EVIDENCE: P4a Done-when; rule 3; P2c; O-10 D1/D4
CHANGE: Add: "If the fix is APK-side: fix PR to main, P2c re-run with a new versionCode, W0-results row; the pilot re-run uses that APK."

--- DC4-16 [MINOR] §0 tag cut / P1, P2b-2, P3a (conf 0.45)
CLAIM: release/drain (P1 + P2b-2 + P3a, applied by merge or cherry-pick) is a combination CI never ran. Each PR was gated on main, possibly alongside other merges, but the tag cut has no gate on the branch the box actually runs.
EVIDENCE: §0 Merge-is-not-deploy; P1/P2b-2/P3a Deliverables "release/drain branch and drain-image tag cut"
CHANGE: Tag-cut item: "backend gates (Appendix A) green on release/drain before tagging; re-run after every re-cut".

--- DC4-17 [MINOR] P5a event-names JSON (conf 0.45)
CLAIM: In P5a, a mobile PR, the JSON is "loaded by both runtimes with a test on each side", which needs a backend test and Docker gates. P5a's Done-when lists only mobile gates, and §0's one-Docker-phase-at-a-time rule is not considered.
EVIDENCE: P5a Scope Diagnostics bullet and Done-when; §0 Sessions; P6b-2 Scope
CHANGE: P5a: JSON + mobile test. The backend-side test lands in P6b-2, which consumes the JSON.

--- DC4-18 [MINOR] P4c Scope / P3a runbook (conf 0.45)
CLAIM: P4c runs a "late-sync audit query", records per-tech min/max device_time and lists the window's payroll_export rows. None of these is in P3a's runbook command list, and none is cited. O-10 F defines the late-sync query.
EVIDENCE: P4c Scope; P3a runbook bullet; O-10 F
CHANGE: P3a runbook adds these three queries, citing O-10 F; P4c cites them.

--- DC4-19 [MINOR] P5d-1b / P5d-2 (conf 0.45)
CLAIM: P5d-1b's deliberate kill tests (3b/3c) run inside T0..T0+48 h, the same span P5d-2 uses for kill rate and sampler_gap. No test window is excluded, so the protocol inflates the per-OEM metrics.
EVIDENCE: P5d-1b Scope; P5d-2 Scope; P2b-2 `--test-window` precedent
CHANGE: P5d-1b records start/end per phone in FIELD-VALIDATION.md; P5d-2 excludes those windows.

--- DC4-20 [MINOR] P12a vs P7a (conf 0.4)
CLAIM: P12a rotates the payment key "only on success". After P7a, reusing a payment client_id across a different job or amount returns 409. A manager who corrects the amount after a failed attempt resends the old key and gets refused.
EVIDENCE: P12a Scope; P7a Scope "payment client_id reuse across job/amount → 409" (O07-F15)
CHANGE: P12a: rotate on success or on any change of job, amount or method; add a test for each.

--- DC4-21 [MINOR] §2 graph (conf 0.45)
CLAIM: The graph is said to be "drawn from the Entry lines", but it leaves out P0b's outgoing edges (P2b-1 name, P2c DNS, P3b destination) and the hatch edges P2a-2→P2c, P3a-2→P3c and P8b-2→P9a-2.
EVIDENCE: §2 graph; P2b-1/P2c/P3b Entry; P2a, P3a, P8b Size hatches
CHANGE: Add "P0b ─► P2b-1 (name), P2c, P3b" and the three dotted hatch edges.

--- DC4-22 [MINOR] P11 Done-when; P12a web branch (conf 0.4)
CLAIM: P11 is backend code that can merge before T_close, yet its Done-when has no train form. P12a builds the web image from "release/drain + this commit" without saying whether P12a lands on release/drain, which would break "nothing else".
EVIDENCE: P11 Entry/Done-when; P12a Done-when; rule 3; §0
CHANGE: P11 Done-when: add "merged; deploy-train row added (or deployed after T_close)". P12a/P12: build the web image on a `release/drain-web` branch, never on release/drain.

--- DC4-23 [MINOR] §5 P0/P1 table; P5a 15-min re-check (conf 0.4)
CLAIM: §5 lists O04-F12 among the P0/P1 rows, but G2 §2 marks it P2. P5a cites "(§4)" for the 15-minute periodic re-check, but §4 has no row for it, only the threshold of re-registration within 15 min.
EVIDENCE: §5 table; G2 §2 section C; P5a item 4; §4 geofence row
CHANGE: Move O04-F12 to the P2/P3 paragraph. P5a cites O-01 FIX ORDER 4, or §4 adds a re-check interval row.

FAILED: []
