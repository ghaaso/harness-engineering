# Dossier: block "rework" (mechanisms: rework, late_discovery)

12 bottlenecks and 36 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### B18 · Tests ran only on Windows
family check; state: Partly closed: Linux run built, not the gate; waits on D09; package WP2a; metrics: quality, time (primary quality)
what: Production runs on Linux but the gate check runs on Windows, so Linux-only failures can reach main. It is the same decision as B06.
evidence: 2 of 2,472 tests failed only on Linux, in POSIX code never exercised on this PC [M]. Linux run 230.1 s vs Windows 367.2 s [M].
what fixing it unlocks: Zero Linux-only failures on main [T], with a faster gate in the same move.
first step: Same as B06: decide D09 and make the Linux container run the gate.

### B20 · Load test not rerun after the fix
family check; state: Open: Not started; harness v2 phase 4; package WP9; metrics: quality (primary quality)
what: After the query fix, single-client page speed was re-measured, but the 12-clerk concurrent load drill with backups was not rerun.
evidence: At 75,016 documents pages ran p50 109-468 ms, none above 524 ms p95 [M]. The last 12-clerk run predates the fix: posting p50 3.4-7.5 s, p95 up to 16 s [M].
what fixing it unlocks: A regression signal now; proof of the capacity envelope on a rented host; a stock ledger at 250,000 movements [T].
first step: Rerun drill e at 12 clerks on current main while no gate runs; build the bulk stock generator.

### MC-NATIVE · No native Android compile gate
family check; state: Open: Lab lane L2 under way since 13 Nov; package WP9; metrics: quality, time (primary quality)
what: CI's expo export bundles JavaScript only, so Gradle and native breaks are caught nowhere and the EAS queue is slow; the app has no testIDs for device checks.
evidence: Native compile time not yet measured. 0 testID or accessibilityLabel hits in technician-app/src [M].
what fixing it unlocks: A compile check in minutes instead of an EAS queue, answering the SDK 52 background-location build question before any phone is involved.
first step: Finish lab lane L2; record main's compile time, APK size and certificate; add testIDs to key flows.

### MC-ENVSKEW · Local gates differ from CI and production
family check; state: Partly closed: node:22 reruns in use; P3a moves to 17; package WP2b; metrics: quality, efficiency (primary quality)
what: Gate results can differ from CI and production: this PC runs Node 24 while CI pins 22, the backend has no lockfile, and CI tests Postgres 16 against production's 17.
evidence: Node 24 here vs 22 in CI [M]. Open dependency ranges and no backend lockfile. CI tests on Postgres 16; production runs 17.
what fixing it unlocks: Fewer false defects, and gates that reproduce what production actually ran.
first step: Rerun Node failures under node:22 before calling them defects; land P3a's move to Postgres 17.

### PR-FALSEGREEN · Green checks that test nothing
family check; state: Partly closed: Lab gates fixed; CI change scoped to P1; package WP2b; metrics: quality, hallucination (primary quality)
what: A check can pass while testing nothing: backend integration tests all skip without a database URL, mobile CI passes with no tests, and an installer reported false success.
evidence: conftest skips every integration test when FIXFLOW_TEST_DATABASE_URL is unset [M]. One installer printed 'INSTALL OK' with nothing installed [M].
what fixing it unlocks: Green that means something: the lab baseline already shows 757 tests, 0 integration tests skipped [M].
first step: Confirm CI fails on skipped integration tests and runs Jest without --passWithNoTests.

### PR-SCREENTEST · No screen tests for the mobile app
family check; state: Open: Worked around with pure functions; package WP9; metrics: quality (primary quality)
what: The mobile app has no screen-test harness, so UI logic is kept in pure functions and device smoke tests are the only route to the screens.
evidence: Not measured. No @testing-library/react-native or react-test-renderer; 0 testIDs in technician-app/src [M].
what fixing it unlocks: An automated arrival-flow smoke test on a device or the lab emulator.
first step: Add testIDs to the key flows; source a Maestro skill for the lab emulator.

### B01 · Fix rounds that create new defects
family review; state: Open: Harness v2 phase 3; replay not run; package WP3; metrics: quality, time, efficiency, throughput (primary quality)
what: Our fixes added new stored state (a hold, lock, marker or cutoff) whose endings nobody tested, so each fix round produced fresh P1s and the rounds did not converge.
evidence: Round one: 19 P1 [M]; fixes then made at least 5 more P1 and 10 P2 [M]. 64 % of reviews sent a slice back, 2.8 rounds per slice [M].
what fixing it unlocks: Review rounds that converge under a stop rule, shown as fewer fix-made defects per fixed finding than the testbed's rate.
first step: Replay a fix-round contract (two-round cap, revert, fresh reviewer, state-ending table) sealed against the recorded defect chains.

### PR-PLANDEFECTS · Plan revisions carry defects
family review; state: Closed: Delta check on every major revision; package WP3; metrics: quality, efficiency (primary quality)
what: Major plan revisions carried defects; the v6 delta's blocker would have stripped every crossing of its coordinates.
evidence: The v6 delta check found 1 blocker, 20 major, 20 minor, 7 notes [M]. The v9.1 refuter found 1 blocker, 7 major, 12 minor [M].
what fixing it unlocks: A plan that survives review before work starts.
first step: Delta-check every major revision with fresh critics.

### B02 · Gaps found only on the last day
family first-use; state: Partly closed: Real-data switch merged; walk unbuilt (v2 phase 4); package WP9; metrics: quality, time, throughput (primary quality)
what: Every clinic slice was tested on a synthetic seeder, so missing real-data paths (real data refused; fresh installs lacking tills and accounts) surfaced only on the last day.
evidence: Two [M] first-use gaps surfaced on the final day. No clean-install walk was ever run; the 'clean machine' drill still seeds synthetic data. The real-data switch merged 11 Nov (fb55599).
what fixing it unlocks: First-use failures caught at every gate instead of on the last day; the walk should fail on the commit before 11 Nov and pass after.
first step: Add a zero-seed journey against a fresh container database to every gate: install, first user, tills, import, transaction, close.

### B19 · First-deploy steps not yet run on a real host
family first-use; state: Open: D21 pending; harness v2 phase 4; package WP9; metrics: quality, time (primary quality)
what: First-deploy steps have not yet run on a real host: certificate, off-site backups, alerts and a second-host restore. Several are not yet built.
evidence: No certificate script, off-host backup push, alert channel or ssh hardening exists [M]. A local VM hung at first boot in 3 of 3 creations [M].
what fixing it unlocks: A result file from a real host for each checklist gap; every step carries its command, expected result and a negative run.
first step: Do the free steps with me present for one admin prompt, then rent a host for a day (D21).

### PR-FIELDEVIDENCE · Code reading cannot settle field questions
family first-use; state: Open: Waits on me naming the APK commit; package WP9; metrics: quality, hallucination (primary quality)
what: Field data is thin and the backend is down, so questions about phone-maker background rules or a commercial SDK can be settled only by device trials.
evidence: attendance_event held 9 rows lifetime [M]. main is 10 commits past the handoff, and the field APK is older than main [M].
what fixing it unlocks: A device protocol settles what code cannot; findings labelled by build; reliability evidence per phone maker.
first step: I name the field build's commit; write the discriminating field protocol; run per-maker trials (P5d-1b).

### LIB-KS-OUTSIDE · Root causes outside the repository
family retrieval; state: Open: accepted limit; designed as candidates only; package WP7; metrics: efficiency, time, quality (primary efficiency)
what: EAS builds and secrets, Railpack detection, the Supabase pooler and phone vendor behaviour leave no local trace; races look identical on good and bad runs.
evidence: Not sized. The design caps such entries at inconclusive, candidates only, when they cannot be probed locally.
what fixing it unlocks: Entries can still lead when I paste the build or deploy log, and races become checkable through tests that encode them.
first step: Let ks lookup --log accept pasted logs; write a race-encoding test per such entry.

## Ideas (most mature first)

### CHK-06 · Random-tag flaky tests fixed after parallel runs
stage: In use; package WP2a; metrics: quality, time (primary quality); answers: B06
problem: Parallel runs exposed chance failures from random digit-bearing test data, which made the gate unreliable.
how: A letters-only random_tag() and without_identifiers() replaced 33 uses [M] in 21 files [M], plus a layout test that fails if the old hex-tag forms return.
where it stands: In use in the testbed: about 3 failures in about 40 full runs [M] before; seven consecutive green runs [M] after. Small sample; random values elsewhere may recur.
next: Audit FixFlow's uuid fixtures for random hex before parallelising its tests.
origin: Clinic testbed

### CHK-10 · Pre-commit hook running the workflow verify command
stage: In use; package WP2a; metrics: quality (primary quality); answers: PR-FALSEGREEN
problem: We want broken links, bad JSON and failing workflow tests caught at commit time, not found later, because nothing was checking at that moment.
how: A hook runs one verify command at commit: links, JSON, provenance hashes, instruction contracts, workflow tests. Local and bypassable.
where it stands: In use in the testbed: 227 [M] tracked files matched their commits, 29 [M] workflow tests pass, bad commits rejected. Skipped for FixFlow: it read the working tree and let an all-skipped suite pass.
next: Copy the lesson, not the code: a gate must fail on skipped or empty suites, with negative controls.
origin: Clinic testbed; Harness review

### REV-01 · Two-level merge gates with refute-reviewers
stage: In use; package WP3; metrics: quality, time, hallucination (primary quality); answers: B01, B04, B12, B17
problem: We need agent output checked before it merges, so no unresolved critical finding reaches main.
how: Root runs the full check; two read-only Opus reviewers try to refute claims; findings numbered P1 to P3 with owner; root reads round three.
where it stands: In use in the testbed for every slice: 9 of 11 [M] gates took three rounds; 19 [M] P1 findings in round one; at least 5 [M] more P1 created by fixes.
next: Add an independent read of the last fix diff and a per-round cost record.
origin: Clinic testbed

### REL-01 · Local staging VM rig with fifteen drills
stage: In use; package WP9; metrics: quality, time (primary quality); answers: B19, B02
problem: We had never tested restore, deploy, upgrade or failure behaviour outside development, and had no production-like host to rehearse on.
how: Script-built Hyper-V Debian VM (2 vCPU [S], 2 GB [S]), versioned releases, fifteen re-runnable drills: deploy, upgrade, backup and restore, load, security probe, reboot.
where it stands: In use in the testbed, synthetic data: fresh VM serving in 109 s [M], upgrade 7 s [M], 781,505 rows restored in 14 s [M], security probe 99 pass, 0 fail [M].
next: Run the fresh-VM restore and first-deploy checklist with me present; reuse clean-install-first and restore row-checksum compare in FixFlow.
origin: Clinic testbed

### OWN-09 · Wrap-up called by me, carried P3 tables, pilot backlog
stage: In use; package WP11; metrics: time, quality (primary time); answers: B01, B21, B17
problem: We want review rounds that end, and low-severity findings kept visible without blocking the release.
how: Gate tables end with 'Remainders carried' and owners. On 10 Nov I ordered wrap-up: five branches merged, the rest into a pilot backlog.
where it stands: In use in the clinic testbed: 111 P3 findings returned in round 1 [M]; five branches merged, 7/7 checks, 2520 tests in 726 s [M], 0 skipped [M]. No stop rule written.
next: Define a stop rule up front, with never-deferred P1 classes; store findings as structured records.
origin: Clinic testbed; me

### REV-22 · Delta check of a plan revision by fresh critics
stage: Tested; package WP10a; metrics: quality, hallucination (primary quality); answers: PR-PLANDEFECTS
problem: Each plan revision can bring in new defects, so I want a fresh read of what changed before the revision is trusted.
how: Fresh Opus critics read only a plan's changes; Sonnet re-locates blocker and major citations; findings are tabled and folded into the next version.
where it stands: Tested: the v6-to-v8 delta check found 1 blocker, 20 major, 20 minor [M]; the section 7 amendment critic found 1 blocker, 7 major, 12 minor [M]; 19 accepted, 1 open ruling.
next: Repeat after any large plan change; decide, before P7a merges, whether a manager may record or void a payment on a closed job.
origin: Harness review; Ship plan §7

### REL-02 · Volume load and page-speed drill
stage: Tested; package WP9; metrics: time, quality (primary time); answers: B20, B19
problem: Pages were slow at volume, it was unknown whether 12 concurrent users worked, and an optimisation had to be proved not to change figures.
how: Grow synthetic data through the app's services, time persona pages, make reads set-based, count queries at two sizes, hash page bodies before and after.
where it stands: Measured in the testbed: pages 9-13 s down to 0.1-0.5 s at 75,016 documents [M]; queries on one page 29,346 to 28 [M]. The 12-clerk load run was not repeated after the fix.
next: Rerun the 12-clerk drill on current main, then a bulk generator to 250,000 [T] stock movements, then the rented host.
origin: Clinic testbed; Harness v2 design

### SKL-04 · Android field-debugging skill and device debugger agent
stage: Built; package WP9; metrics: hallucination, quality (primary hallucination); answers: PR-FIELDEVIDENCE
problem: The truth about geofencing and offline queues lives on phones, and the field APK is older than main, so reading code gives only candidates.
how: A sourced read-only skill for adb, dumpsys and logcat capture; a Sonnet agent returns a device-evidence table, never installing, clearing, force-stopping or judging reliability.
where it stands: Built: skill and agent in PR #185, merged on 13 Nov. Not yet run on a device.
next: Use it in drain sessions P4a and P4b.
origin: Skills packages

### REL-03 · Maestro on-device smoke tests with runner agent
stage: Built; package WP9; metrics: quality (primary quality); answers: PR-SCREENTEST
problem: The app has no screen-test harness, so we never exercise carry-in and arrival flows on a real device automatically.
how: Sourced Maestro skill with foreground smoke flows (carry-in, offline intake, arrival pair, drain report, read-only) for one phone; a Sonnet agent runs and reports.
where it stands: Built in skills packages in PR #185, merged on 13 Nov; not yet run. A pass would prove only the foreground smoke, never headless delivery or field reliability.
next: Add test IDs, then run the first smoke test (P2c) on a phone; the design calls this the cheapest route.
origin: Orchestration design; Skills packages; Maestro

### REL-04 · EAS release skill and release operator agent
stage: Built; package WP9; metrics: quality, time (primary quality); answers: PR-FIELDEVIDENCE, MC-NATIVE
problem: Fleet APK builds can ship the wrong host, certificate or version, or wipe the offline queue if uninstalled, and JavaScript fixes wait in the build queue.
how: Skill under rulings (no expo-updates, never prebuild, SDK 52, same certificate, install over); a Sonnet agent checks preconditions and records per-phone before/after build receipts.
where it stands: Built in PR #185, merged on 13 Nov; not yet run. The design asked whether expo-updates should ship; the built skill rules it out. Builds and installs stay with me.
next: Use it for the next fleet build and first phone install (P2b-1, P2c).
origin: Orchestration design; Skills packages; Expo/EAS docs

### REL-05 · Real-data switch and money-setup command
stage: Built; package WP9; metrics: quality (primary quality); answers: B02, B19
problem: A fresh install could not take real data or create accounts and tills, which is how the clean-install gap surfaced.
how: An append-only, default-off authorisation table that only the host console can switch (audited), plus a second command that creates accounts and tills.
where it stands: Built on a clinic testbed branch, unmerged and ungated: 39 files, 2,552 insertions, 71 deletions [M]; 2570 tests passed [M].
next: Run a fresh-database walk early in the next build so this kind of gap shows up on day one.
origin: Clinic testbed

### CHK-31 · Stop after three identical CI failures
stage: Designed; package WP3; metrics: efficiency, quality (primary efficiency); answers: W2
problem: We want an agent never to keep re-pushing and re-running until CI turns green, which could hide a real failure.
how: Rule line: if the same CI job fails on 3 [S] pushes running after green local gates, stop, journal it, hand it to me.
where it stands: Adopted as a rule line, flaky-rerun allowance dropped; PR Auto-fix stays off. Not yet tested.
next: Over 5 [T] code phases, no job should fail on 3 [T] consecutive heads unless journaled.
origin: Dex Horthy sweep

### REV-27 · Fix-round contract: two rounds, revert, test per finding
stage: Designed; package WP3; metrics: quality, time, efficiency (primary quality); answers: B01, W2, L3
problem: Our fixes add new stored state with untested endings, so they create new defects; 64 % [M] of reviews sent slices back.
how: Two rounds; a fail-before, pass-after test per finding; revert instead of patching a patch; fresh agent after two failed fixes.
where it stands: Designed into harness v2 phase 3; not yet run. Testbed record: 2.8 [M] review rounds per slice. First step is a replay on recorded chains under the seal.
next: Replay on recorded chains under the seal, then add the clauses to the fix-round brief.
origin: Bottleneck compile, Harness v2 design, Dex Horthy sweep

### REV-37 · Code yields candidates, device evidence yields conclusions
stage: Designed; package WP9; metrics: hallucination, quality (primary hallucination); answers: PR-FIELDEVIDENCE
problem: Reading code on main cannot tell us what an older build does on real phones, so confident code audits can mislead.
how: Label each finding in_field_apk (yes, no, unknown); a field protocol, not the audit, decides what phones do; main-branch findings are candidates.
where it stands: Designed as a rule in orchestration design v3; not yet tested. It needs me to run the device protocol on a phone.
next: Have the geofence analysis output the field protocol that separates the top three hypotheses.
origin: Orchestration design

### MEM-19 · Lessons become checks
stage: Designed; package WP6a; metrics: quality, efficiency (primary quality); answers: B01, LIB-S2, LIB-Q
problem: The same defects keep arriving and notes alone have not stopped them: 38 of 71 [M] practised ideas failed as prose.
how: An entry seen three times becomes a proposed lint, test or gate clause; once it lands, the entry retires and the gate catches it.
where it stands: Designed; modelled as its own pathway: 0.04 [G] more pieces caught per 100 at middle values, 2.8 [G] at all-good. One real check already protects every agent [M].
next: Build after the library's journal exists; this would stop a defect arriving rather than relying on a lookup.
origin: Harness v2 design; Knowledge-store design

### MEM-38 · ks close: anchor, rescan at main, four counts
stage: Designed; package WP6b; metrics: quality (primary quality); answers: LIB-KS-STALE
problem: A fix can be pushed after its PR merged and stay stranded off main, and entries drift after refactors. One fix sat stranded for 16 days [M].
how: At phase close one command re-points checks to the merged commit, rescans main, labels 'fix not on main' or 'regression', and prints four counts.
where it stands: Designed for phase 3b; not built or tested. Its test must fire at every main tip across the stranded span [T].
next: Build it in the first knowledge-store phases. It would catch stranded fixes without extra effort from me.
origin: Knowledge-store design, refuter and critic findings

### REL-08 · Zero-seed first-use walk in every gate
stage: Designed; package WP9; metrics: quality, time (primary quality); answers: B02, B19
problem: Gaps surfaced only on the last day: nobody walked a clean install, so the app refusing real data and missing tills stayed hidden.
how: Each gate runs install, first user, tills, a real-shaped import, one transaction and close of day on a fresh container database with no seeder.
where it stands: Designed in harness v2 phase 4; not built. Adds 2 to 3 minutes [E] per gate and needs phase 2. Half of this gap was closed on 11 November.
next: Build the journey on a fresh container database, then replay it on the 11 November gap after phase 2.
origin: Bottleneck compile; Harness v2 design; Clinic testbed

### REL-09 · Rented-host rehearsal
stage: Designed; package WP9; metrics: quality (primary quality); answers: B19, B20
problem: So far everything we built has run only on my PC, so certificates, off-site backups, alerts and restore are unproven outside my PC.
how: Free steps first with me present for one administrator prompt (restore, deploy checklist, off-site push, planted alert), then one rented-host day on made-up data.
where it stands: Designed in harness v2 phase 4; not run. Today there is no certificate script, no off-host backup push and no alert channel [M]. Target: a result file per checklist gap [T].
next: I decide D21 (approve a one-day rented host); first, be present for one administrator prompt to run the free steps.
origin: Bottleneck compile; Harness v2 design

### REL-10 · List of what never ran on real hosts
stage: Designed; package WP9; metrics: hallucination, quality (primary hallucination); answers: B19, B11
problem: We want to stop assuming that local rehearsal proved how things behave on a real host.
how: A 'cannot be proven here' list: off-site store, certificates, hosted CPU speed, alerts, second-host restore, second maintainer, each tied to a closing drill.
where it stands: Designed as a list only; none of it has run on a real host. No real-host measurement exists; only desk evidence such as a hosting cost estimate read on 5 November.
next: Keep the list in the handoff and name one closing command per drill; I choose a host and pilot frame.
origin: Clinic testbed

### REL-11 · Local Android compile gate (L2)
stage: Designed; package WP9; metrics: quality, time (primary quality); answers: MC-NATIVE
problem: No check catches native Android compile breaks, because the JavaScript-only export misses them and an EAS build queue is slow.
how: Docker container with JDK 17 [S] and Android SDK copies the app in, runs prebuild there (never in the repo), builds a release.
where it stands: Designed in ship plan section 7.5; the lane is running as PR #188. Not yet tested. It will also answer whether the background-geolocation library builds on SDK 52 / RN 0.76.9.
next: Record time, size, certificate and the yes/no compile fact, aiming for compile checks in minutes rather than an EAS queue.
origin: Ship plan §7, closing a gap CLAUDE.md names

### REL-12 · L3 device lab on a native emulator
stage: Designed; package WP9; metrics: quality (primary quality); answers: MC-NOEMU, PR-FIELDEVIDENCE
problem: Drain logic and field-reliability steps meet a real phone with real data without any earlier rehearsal, and Docker has no /dev/kvm to run an emulator.
how: A native emulator (Windows Hypervisor Platform) runs three scripted protocols: drain rehearsal, adb field steps, offline matrix. Lab builds cannot reach a real server.
where it stands: Designed; L3a started 13 November, stacked on L2. The emulator boots on this PC with the lab app installed. No check run yet; each must be shown failing once.
next: L3a reports each tracker check as reproduced, not reproduced or inconclusive, so a field session confirms instead of explores.
origin: Ship plan §7

### REL-13 · L4 deploy-train and restore rehearsal
stage: Designed; package WP9; metrics: quality, time (primary quality); answers: B19
problem: Behaviour-changing PRs deploy together at P4c, and the first run of an untried sequence would be on the restored production data.
how: Per behaviour-changing PR: restore newest dump into Postgres 17 [S], run start.sh migrations to the new head, run its post-deploy check, log a rehearsal row.
where it stands: Designed in ship plan section 7.5 (wave C); not started, not yet tested. The plan's claim is that P4c then replays a sequence already tried.
next: Use a seeded database until P0a item 4 supplies the real dump.
origin: Ship plan §7

### REL-14 · Device evidence across phone brands before reliability claims
stage: Designed; package WP9; metrics: hallucination, quality (primary hallucination); answers: PR-FIELDEVIDENCE
problem: One phone can tell hypotheses apart but cannot validate a fix across the phone brands our fleet uses.
how: Any geofencing reliability claim requires device evidence across the phone brands in the fleet; an adb-based field protocol separates the top hypotheses.
where it stands: Designed as a constraint on the phased plan; not yet tested. The field protocol itself is still to be produced, and I run it on devices.
next: Have the first investigation output the protocol, then I run it on devices.
origin: Orchestration design

### REL-15 · Early performance and recovery proof
stage: Designed; package WP9; metrics: quality (primary quality); answers: B02, B19, B20
problem: Production-readiness claims go unmeasured until the very end of a build, so we want proof early.
how: Small performance and recovery proof in early slices: p95 timing under load with optional parts off, slow or failed, plus an A/B/C form comparison.
where it stands: Designed from an AI red-team review of the clinic guide; untested. Proposed gates: posting p95 under 1 s [T], list and report pages under 2 s [T], memory under 3.2 GB [T] of 4 GB [S].
next: Bring a small proof into the early slices of the next build.
origin: Clinic testbed; AI red-team review

### REV-44 · Observed chains of fixes that created defects
stage: Idea; package WP3; metrics: quality, time (primary quality); answers: B01, B17
problem: We want to understand why fixes keep opening new defects, so fix rounds converge instead of looping.
how: Case studies of fixes that opened new defects; proposed per-round split into old, caused-by-fix and new, with a state table per new hold.
where it stands: Proposed from an observation record, not yet a built mechanism: one clinic fix chain, the cutoff guards RS-2 and RS-5, took three rounds [M] with a new P1 in rounds 1 and 2. No tally of fix-induced findings exists yet.
next: Record per round: old still open, new caused by the fix, new independent.
origin: Clinic testbed

### REV-47 · Recurring defect shapes in the reviewer brief
stage: Idea; package WP3; metrics: quality (primary quality); answers: W2, L3
problem: Defect shapes we already know sit in a checklist reviewers never see, so the same kinds of defect keep coming back.
how: Seven recurring defect shapes, plus an eighth for any new stored copy or flag, go in the Opus refute brief, one required line each.
where it stands: Trial: moved into the ship plan's top trial 6; not yet tested. First step is a look-back test on known-defect diffs, with and without the line.
next: Run that look-back test on 3 to 4 known-defect diffs [T]; count cases caught.
origin: Dex Horthy sweep; Knowledge-store design

### REV-50 · One cumulative-drift audit after ten PRs
stage: Idea; package WP3; metrics: quality (primary quality); answers: W2, L3
problem: Per-PR review cannot see drift that builds across PRs, such as a helper reimplemented twice, and we want one look at the whole.
how: One fresh Opus audit after the 10th merged code PR, covering the diff from the P1 merge to main.
where it stands: Trial, one audit only; not yet tested. Pass bar is at least 2 findings I accept [T] after the 10th merged code PR [T].
next: Run the audit and count the drift findings I accept against the bar of 2 [T].
origin: Dex Horthy sweep

### REV-51 · Pick among candidate fixes by executed test
stage: Idea; package WP3; metrics: quality, token_cost (primary quality); answers: B01
problem: A single fix often creates a new defect, and choosing among candidates by a test that runs may avoid that.
how: Generate three candidate fixes per recorded chain; a frozen pre-written test plus a guard-removal check rejects the candidate that causes the defect.
where it stands: Deferred in harness v2, not run unless switched on. Outside, on SWE-bench Lite: 25.7% by vote, 27.0% with a regression filter, 32.0% with a reproduction test [S].
next: Decide after the fix-round contract's replay (D20); live only if the selector works.
origin: Harness v2 design, after SWE-bench candidate selection

### MEM-53 · Review findings fed forward by slice type
stage: Idea; package WP6a; metrics: efficiency, time, quality (primary efficiency); answers: B01, LIB-S9
problem: Review sends work back often; if findings repeat an earlier class, we pay the same fix round again.
how: Store review findings by slice type and serve them to the builders of the next slice of that type.
where it stands: Idea; not tested. Record: 2.8 [M] review rounds per slice and 64 % [M] sent back.
next: Measure the share of review send-backs that repeat an earlier finding class; this decides whether feeding them forward pays.
origin: Library review

### MEM-63 · Edit-time warning hook
stage: Idea; package WP6b; metrics: quality, time (primary quality); answers: LIB-KS-DIFF
problem: We want a forbidden edit to warn at edit time, not only in review.
how: A fail-open hook (one that lets the edit through if the hook itself fails) on Edit and Write diffs the edited path through the same lookup and shows one short warning. It never blocks.
where it stands: Deferred, default off; not yet tested. Its known blind spot is edits made through Bash or PowerShell.
next: Waits on harness decision D17 (hooks stay off) and on KS-D21 at the checkpoint, if the warning rate is within the ceiling.
origin: Knowledge-store design, my critique point 2

### MTH-44 · Shape block: signatures and call stack in PR
stage: Idea; package WP4; metrics: quality, efficiency (primary quality); answers: B01
problem: On phases that change control flow or add surfaces, design mistakes show up only after the code is written.
how: Before the first code commit, the Opus implementer drafts public signatures and the call stack in the draft PR body. No tool is built.
where it stands: Trial, narrowed, not yet tested. Candidates are the first 4 Opus-owned phases that change control flow [T].
next: Run it on the first 4 qualifying Opus phases [T]; see whether design mistakes surface earlier.
origin: Dex Horthy sweep

### MTH-47 · 'Mirror these files' field in Sonnet briefs
stage: Idea; package WP10a; metrics: quality, efficiency (primary quality); answers: W4
problem: Sonnet implementers write code that does not match the patterns already in the repo.
how: Each Sonnet implementation brief names 1 to 3 existing files to mirror, which the explorer agent can fill in.
where it stands: Trial, not yet tested. The test is a blind paired probe rather than a PR count: 4 tasks, each with and without the line, 8 sessions [T].
next: Run the 8 sessions [T]; a blind Opus judge scores each diff; scores decide if we keep the field.
origin: Dex Horthy sweep; refuter narrowed it

### MSR-40 · Per-PR rework rate as health metric
stage: Idea; package WP8; metrics: quality, efficiency (primary quality); answers: B01, L3
problem: We have no measure of whether review is converging or code keeps changing after review.
how: Track the share of each PR's diff changed after review; under 5% [T] is the quality bar.
where it stands: Deferred in the Dex Horthy sweep. No refuter verdict, reviewers split between trial and skip, and no measurement is defined. Not tested.
next: Decide whether to send it to a refuter; defining how to measure it would bring it back.
origin: Dex Horthy sweep

### OWN-18 · Rough HTML mockup before new-screen phases
stage: Idea; package WP11; metrics: efficiency, quality, time (primary efficiency); answers: W4
problem: A copy or state mistake on a new mobile screen costs a whole new fleet APK build and is found only after implementation.
how: Sonnet produces one rough HTML mockup of the screen's states and exact copy, written into the brief; I glance at it without blocking.
where it stands: Trial on four new-screen phases (P2b-1, P5b-1, P9b, P10a); not a skill or rule, and not for P12a or P12. Not yet tested.
next: Produce the mockup for P2b-1; success would mean fewer APK rebuilds.
origin: Dex Horthy sweep

### CHK-40 · Stop hook that re-runs the CI checks
stage: Parked; package WP2b; metrics: quality, time (primary quality); answers: W2
problem: We want an agent never to end its turn with a red tree, without waiting for CI to tell us.
how: When an agent tries to finish, a hook runs the same quality and typecheck commands as CI and blocks with only the errors.
where it stands: Parked: first pass left it deferred with no verdict; the addendum ruled skip. It reopens the pre-commit skip, and backend gates take minutes in Docker. Not tested.
next: Would return if gates get fast enough to run at every stop, and only after D17 reopens hooks.
origin: Dex Horthy sweep

### MTH-59 · Autonomous refactor loop (Ralph) for style rules
stage: Parked; package WP10a; metrics: quality, throughput (primary quality); answers: -
problem: Repetitive refactors cost human time, and we wanted to hand them to a loop.
how: A loop on a cloud VM ran about 6 hours [S] from style rules and produced 20 commits [S].
where it stands: Parked: the outside result was a PR of about 20,000 lines [S] that was never merged and had about 100 conflicts [S] two days later.
next: Reopen only if phase-sized loop PRs are measured.
origin: Dex Horthy sweep, after Geoff Huntley's Ralph
