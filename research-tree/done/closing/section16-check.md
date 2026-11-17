# Check of section16-draft.md against the code and records

I found problems in A, B, D, E and F. In A, every row's changed sentence needs at least a qualifier, and R10 leaves out three counting cases and the memory clause. Every named test exists. All twelve point-1 numbers I spot-checked match the stage records. I ran nothing and wrote nothing; besides Read and Grep I used shell `ls`, `grep`, `sed` and `cat` to read records and the lane log, and `capacity.txt`.

Paths: DOC = `C:/Users/User/Documents/projects/harness-engineering/docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`; ROOT = `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build`; draft = `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/a7a94981-922e-4638-843d-cae1caa03ea5/scratchpad/section16-draft.md`.

## A. The rule table (draft 84-88)

- **R5 (draft 84).**
  - The quote holds (DOC:120-121).
  - **Wrong clause:** "more than 2Δ after the last counted tick." The code measures the gap from the previous evaluation, counted or not. `last_tick_at` is written at every evaluation, including a new watcher's uncounted first one (ROOT/tcb/watch.mjs:342-345, 666, 729).
  - **Left out:**
    - Paused ticks still advance `ticks_total`, which drives stop-verify and coalescing. So R9's 2Δ stop check still counts ticks across a PC sleep; modelfix-U1 leaves this open (ROOT/done/modelfix-U1.json:40, note 2).
    - In `--once` mode every call counts a tick with no minimum gap, so "at most once per Δ" is not enforced there (watch.mjs:724-726).
  - **Too broad:** "No other clock reads elapsed wall time" is false read globally: render.mjs reports throughput per wall hour (ROOT/tcb/test/render.test.mjs:1084).
  - **Corrected:** "A tick counts at most once per Δ. A counted tick whose wall-clock gap since the watcher's previous evaluation exceeds 2Δ is a paused tick: it leaves h unchanged but still counts as a tick for every other counter; new calls still reset h; a missing, negative or shorter gap counts as usual. No other counter of this rule reads elapsed wall time."
  - Pinned by the M5 tests (watch.test.mjs:1324, 1341).

- **R6, row 1 (draft 85).**
  - **Line number:** the quote starts on line 127, not 128 (DOC:127-128).
  - **"Every endturn" is too strong.** A refused endturn (acked-ahead or acked-backwards) and a `--dry-run` endturn do not rewrite `acked.json` (ROOT/tcb/status.mjs:627-638).
  - **"Nothing replaced" is false in one case.** A newly started alarm still supersedes a live one, which then exits 0 `superseded` and wakes the coordinator (watch.mjs:784-787; CONTRACT.md:1022-1023).
  - **Possible loop.** When the process list fails, reconcile reports `alarm-missing` (status.mjs:595-596). Each turn then starts an alarm that supersedes the last one, and each superseded exit wakes the coordinator again. This is M1's busy-loop shape, untested.
  - **Not amended but contradicted by code:** the next sentences, "Its pid and ce go in `coord.json`. Endturn writes acked_seq into `coord.json`" (DOC:128-129). The code uses `run/alarm.json` and `run/acked.json` (CONTRACT.md:1020; status.mjs:631; watch.mjs:772).
  - **Corrected:** "Each endturn that records acked_seq rewrites `run/acked.json`; a live alarm reads that file's hash after each sleep and sleeps again while it has changed, exiting 30 only after a whole period with no change. No script kills a wake source; an alarm exits early only on a newer ce (64) or when a newer alarm has registered in `run/alarm.json` (exit 0, superseded), and that exit is itself a wake. The alarm's pid and ce go in `run/alarm.json`; endturn writes acked_seq into `run/acked.json` under the run lock."
  - Pinned by watch.test.mjs:1195 and status.test.mjs:826.

- **R6, row 2 (draft 86).**
  - The quote holds (DOC:126-127).
  - **Reconcile clause.** The code also exits `alarm-missing` when the process list is unavailable, and it still writes the status and reconciles the rows first (status.mjs:589-601; CONTRACT.md:1116-1118).
  - **Watcher clause is wrong.** "exits ... whenever the planner has an act" is too strong:
    - act-due is non-urgent, so it waits for coalescing;
    - it exits only while that act's event line is above acked_seq; an acknowledged act it cannot take stays quiet (watch.mjs:645-663; test watch.test.mjs:1222-1234);
    - its slot count uses an empty process list, so it can find a slot free too early (watch.mjs:548; CONTRACT.md:1126-1128).
  - **Bound sentence.** "a wake arrives while either source lives" (DOC:130-131) is contradicted by the model record: a turn that dies before it starts the alarm leaves none, and as built the alarm is started by a separate tool call (model-fidelity.json:24, 49-51).
  - **No brief carries the act.** No coordinator brief exists that tells the coordinator to start the alarm (modelfix-U1.json:40, note 3).
  - **Corrected (added sentences):** "`status.mjs --reconcile` at the start of every turn exits 1 alarm-missing when no alarm of the current ce is known to live (none recorded, another ce, dead, or the process list unavailable); the coordinator then starts the alarm before anything else. The watcher also raises act-due (class 17, not urgent) when the planner's predicate names an act the coordinator can take now, or an event line above acked_seq whose condition has cleared; like every class it wakes only until acknowledged. A turn that dies before it starts the alarm counts as a lost wake in this bound."

- **R7 (draft 87).**
  - The quote holds (DOC:137-138), and so does the code for every reason except first and tainted (ROOT/tcb/replace.mjs:470-477).
  - **Left out:** the check applies only to a running attempt of the current epoch (active at admitted, started or bound, or parked at stopped) (replace.mjs:473-474). `lib.fence` itself still re-checks failure reasons only (lib.mjs:1773-1776).
  - **Overclaim kept:** "so the commit wins" holds only for a READY written before the re-check. The child writes READY without the lock, and that race is unfixed (model-fidelity.json:38-41).
  - **Corrected:** "For every reason except first and tainted (planned hand-over, memory parking, cut and drop included), replace.mjs first re-checks under the run lock for a READY of the running attempt's current epoch, and if it finds one it refuses with exit 5 ready-wins, so a READY written before the re-check wins; one written after it can still be fenced (open defect)."
  - Pinned by replace.test.mjs:614.

- **R10 (draft 88).**
  - The quote holds (DOC:155-156).
  - **The changed sentence leaves out three counting cases of `slotCount`** (lib.mjs:3077-3098):
    - the last attempt of a committed row still counts until its stop is confirmed;
    - any unconfirmed attempt with a transcript but no process counts;
    - with no process list, every unconfirmed attempt counts (and admit then refuses `slots-unknown`, admit.mjs:226, 470).
  - **Memory clause also changed:** admit subtracts one peak per admitted or started session with no process before checking that one peak fits (admit.mjs:235, 469-475; test admit.test.mjs:566).
  - **Cap:** the cap is min(N_max, N_ceiling, 3) (admit.mjs:231).
  - **Corrected:** "fewer than N_max slots are taken (2 until memory is measured, never above 3), where every attempt whose stop is not confirmed takes one slot if it is stop-unconfirmed, a live process matches it, it is the current attempt of an active row at admitted, started or bound or the last attempt of a committed row, or a transcript of it exists; with no process list nothing is admitted. Free memory minus the reserve, minus one peak for each admitted or started session with no process, covers one session's peak."

## B. Rules the table misses

- **R4 (DOC:112-113).** The urgent/non-urgent split is not contradicted: act-due is non-urgent, so "within δ on others" covers it. Two gaps:
  - R6's bound now rests on act-due, so R4 should name it: "...and within δ on others, act-due (class 17) among them."
  - Pre-existing: R4's urgent list leaves out common-cause and tamper-seen (watch.mjs:20, 26).
- **R12 (DOC:177) and the script list (DOC:630).** "handover.mjs kills the watcher and the alarm" is contradicted by handover.mjs:6 and CONTRACT.md:1084-1085: it kills nothing, and old sources exit 64 or superseded. It now also contradicts the new R6's "no wake source is killed."
  - Corrected: "handover.mjs raises ce; the old watcher and alarm exit 64 on their next check."
- **Layout line (DOC:60).** It says `coord.json` holds acked_seq and the alarm pid. Corrected: "coord.json (ce, session, started_at, tcb_commit), acked.json (acked_seq), alarm.json (alarm pid, ce)" (CONTRACT.md:401-406).
- **Script list (DOC:626-629).** Add "the act-due class (17)" to watch.mjs. Add "and asks for the alarm (exit 1 alarm-missing)" to status `--reconcile`.
- **"Deleted, not deferred" (DOC:692).** It lists "pause detection by tick gaps (its rule is gone)", which M5 reintroduces. Strike that item and point to R5.
- **N2 row (DOC:584).** The mechanism column becomes "Counters in calls and ticks; a tick after a gap over 2Δ does not count toward hang".
- **R57 (DOC:527-528).** "It models the adopted designs, not oracles" is contradicted by model-fidelity.json:23-30 (four fixes plus reconcile and the --ce fence are oracles). Corrected: "It must model the adopted designs as built, not oracles; as of 2026-11-17 four fixes, reconcile and the --ce fence are still oracles (§16)."
- **R9 (DOC:149-150), for the record.** The 2Δ stop check counts ticks across a PC sleep, which is M5's reasoning left unapplied (modelfix-U1.json:40, note 2). Pre-existing: "then kills processes naming the attempt folder" is contradicted by decision 29.
- **R6 (DOC:129).** "exits 1 unless both sources run": the code exits 2 `proc-unavailable` when it cannot tell (status.mjs:652-653).

## C. The fixes table (draft 72-77)

All named tests exist (watch.test.mjs:1195, 1222-1311 with eight M3 tests, 1324, 1341; status.test.mjs:807; replace.test.mjs:614; admit.test.mjs:538). Quoted names are prefixes of the real names, which is acceptable. Rows M1 and M6 hold, with the qualifiers from A (superseded exits; running attempt only).

- **M2 (draft 73).** Add "or the process list is unavailable" (status.mjs:595).
- **M3 (draft 74), "all failing with the fix off."** The record is inconsistent. modelfix-U1.json:16 says all eight fail; :40 says "9 of the 11 watch M tests fail, and the 2 that pass are the controls". The file holds 12 watch M tests, 10 of them non-controls. Corrected: "eight tests; the mutation summary reports 9 of 11 watch M tests failing, which does not match the 10 non-control tests now in the file."
- **M4 (draft 75), "not mutation-checked."** Partly stale: fix-U1 added T16b (admit.test.mjs:566), and its mutation A5 fails (fix-U1.json:5, 69). Corrected: "slot counting not mutation-checked (it is in lib); the memory reservation of admitted rows is, by T16b (mutation A5)."
- **M5 (draft 76).** Replace "since the last tick" with "since the previous evaluation".

## D. The state of the model (draft 90-109)

- **Holds:** 14 properties at DF2-K2-R1; bounded K3 with no failure; run stopped after about 45 s (model-findings-2.json:246, 270, 426, 431); 165,031,945 states and 22 workers (:451-452); the oracle mapping M2/M6/M5/nearly M3 (model-fidelity.json:24-27); the state-count bullet (:13).
- **"Nothing exists yet for R = 2, 3 fields or 4 faults" (draft 92) is too absolute.** The interrupted first review left DF2-K3-R2, DF3-K2-R1 and DF3-K2-R2 complete with all properties holding, and DF2-K4 bounded with no failure, on an earlier model (model-fidelity.json:69). Corrected: "...nothing exists yet with the current model for R = 2, 3 fields or 4 faults (an earlier model's interrupted runs held there: evidence only)."
- **"Fails NoDeadlock in 2 steps" (draft 98-99) drops two facts.** It is NoDeadlock and AlwaysCanResolve, with one fault; ReadyNotDiscarded fails within 5 steps (model-fidelity.json:24-25).
- **The other two fixes also have caveats, left out:**
  - M1 is only half modelled; superseded-alarm exits are not modelled (:28).
  - M4 reads true process liveness, with no unknown case (:29, :20).
- **Further flaws left out:**
  - A healthy slow call is suspected as a hang: NoFalseSuspicion fails in every part within 4 steps, costing the one restart R = 1 allows; the proposed fix is counting transcript growth (:59-61). This is a flaw, not only "largely assumed".
  - One dead turn leaves no wake source; the fix is a dead-man check outside the tree (:49-51).
- **Weak properties left out:**
  - AtMostOneCommit's mechanism is never exercised: A-WX's state graph equals DF's (:8, :14).
  - Slots excludes READY-but-alive children and is weaker than R10 (:7).
  - A-FENCE-CE has an infinite state space (:19).

## E. R59 and R60

- **R59 figures.** 133.2k, 157.1k and 1.5·W*_coord match §12 (c) (DOC:774-775), ROOT/tcb/thresholds.json:23-24, and audit.mjs:460. watch.mjs exits class 16 at W_star_coord (watch.mjs:516-520), and handover raises ce.
- **"Never past the 200k line of §12" is wrong.** §12 offers "a band up to the 200k line" as an owner option, not a ceiling (DOC:774-775), and R50's W* has no cap (DOC:468-472). Drop it, or state it as a new cap the owner must approve.
- **R59 contradicts R12.** R12 already drains from W*_coord, then waits for quiescence and the owner; 300k is only where it stops taking turns (DOC:174-179). So "not at R12's 300k quality line" misstates R12. In the tree, "It starts no long wait above W*_coord: it hands over first" conflicts with R12's quiescence wait.
  - Corrected: "In the tree, R12's drain is the hand-over: from W*_coord the coordinator starts nothing and waits only for quiescence and the owner. Outside the tree, a coordinating session starts no long wait above W*_coord: it hands over first."
- **Causal claim.** "Because the session ... stopped at about 90 %" conflicts with point 4 (draft 174-175: whether the full context caused it is not proven). Corrected: "Because the session that coordinated this build stopped with its context about 90 % full; that the full context caused the stop is not proven."
- **R60 is contradicted by its own runner.** tcb-build-finish.workflow.js:113 still takes `lib-fix.json` from file whenever the lib review came from file. That is "a file standing in", which R60 forbids; "harmless now" (draft 197) does not make the rule true.
- **R60 against 6(b).** "Obeys the lane and the no-burst rule" sits beside a brief that says both "never several files at once" and "per few files" (workflow.js:183). Name the allowed form.
- **The runner named in R60** ("the coordinator's done-sync script") is not among the files I read; it is unverified.

## F. Other record contradictions

- **Stale fix column (draft 44-46).** fix-U1, fix-U2 and fix-U3 now have records:
  - fix-U1: 264/0/16, nine findings fixed plus mutation R4, one equivalent mutant (S4) (fix-U1.json:66-68);
  - fix-U2: 131/0/5;
  - fix-U3: 151/0/9.

  All `done/*.json` files carry mtime 13:45, so their order cannot be read from the files.
- **Point 4 leaves out a record.** fix-U1 says that, run alone, admit takes 50 s and stop 51 s. It judges the 05:16 timeouts "likely ... a system-wide WMI/PowerShell stall, not a hanging test" (fix-U1.json:69). Cite it as that stage's opinion.
- **Numbers spot-checked against the records, all holding:**
  - all ten join counts (join-U1a through join-U5b);
  - lib-join 172/0/2, lib-review 177/0/2, lib-fix 188/0/2;
  - review U1 to U5: 245/0/17, 116/0/5, 145/0/9, 93/0/13, 91/0/8;
  - fix-U4 106/0/13 with 12 findings, fix-U5 98/0/8 with 14 findings;
  - 88 exports (lib-finish.json:9);
  - 13 of 14 mutations (lib-review.json:2);
  - 77 configurations, 9,154 parts, about 21 days, 8,300 MB, 8,950 MB (runner-build.json:68, 70, 87; runner-check.json:2, 22);
  - the lane times in point 4: 00:10:57Z end, 00:11:19Z and 00:11:58Z starts, 00:16:19Z and 00:16:58Z timeouts, 00:27:04Z busy (lane/log.jsonl);
  - capacity.txt = 2;
  - 24 scripts in the units.
