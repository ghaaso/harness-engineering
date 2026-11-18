# b1-refute: the claims and choices of b1-claims.md tried against code and records (b1/refute, Opus, 2026-11-18)

Format: id | verdict | reason. Paths from the repository root; F and E as in b1-claims.md. Read only; nothing run but
grep, sed, awk, ls and git log. F/BUILD-IN.md, F/b1-map-*.md, F/b1-gate.md and F/b1-state.md were not opened (brief).

## Claims

C1 | confirmed | lane.mjs:43 sits in tryAcquire, called on every pass of the 700 ms loop (lane.mjs:70-72)
C2 | confirmed | capacity.txt holds "2"; it went from 1 to 2 in commit 7358773d (2026-11-17 04:00); the header lane.mjs:8 still says default 1
C3 | confirmed | lane.mjs:39; "0" or text also gives 1 (the `|| 1`)
C4 | confirmed | lane.mjs:44-61, 70-72; only slots 0..n-1 are tried, so a holder of a slot at or above n is not counted (see D3)
C5 | confirmed | lane.mjs:82
C6 | confirmed | lane.mjs:95; the spawn-error path lane.mjs:91 carries ms too
C7 | confirmed | lane.mjs:70-72; the whole log holds one busy line (grep)
C8 | confirmed | lane.mjs:56; a third case: owner.json unreadable and the folder older than 15 s (lane.mjs:58), which breaks a live slot on one failed read
C9 | confirmed | lane.mjs:23; the age counts from the acquire time in owner.json, with no heartbeat
C10 | confirmed | lane.mjs:33 (default 540 s)
C11 | confirmed | x16-0171; in the log r3-q5b-parts ended exit 124 at 1,500,104 ms, a timeout kill (lane.mjs:85-90); its previous run ended at 1,193,636 ms
C12 | confirmed | r57-0127; recount over end lines before 2026-11-17T22:20Z: 780 ends, 364.6 min run, 176.8 min waited; "never three" taken from the record
C13 | confirmed | log.jsonl:1577 holds ms 596366; the file is still 1,577 lines (mtime 2026-11-18 01:33)
C14 | confirmed | RULINGS.md:41-42 says "one at a time", which capacity.txt (2) and the log contradict (o1-0101)
C15 | confirmed | PROTOCOL-v2:1022; but the tree's guard-hook lets its coordinator run only node tcb/<name>.mjs (guard-hook.mjs:339), so the lane is refused there
C16 | confirmed | recorder.ps1:7
C17 | confirmed | recorder.ps1:14; a date appears only on the earlier version's first line (recorder.log:1)
C18 | confirmed | recorder.ps1:9-10
C19 | confirmed | RUN-LADDER.md:63; no script or task in the repo starts recorder.ps1 (grep finds only docs and an evidence json)
C20 | confirmed | recorder.ps1:16; also node>60, powershell>40 or 30 s at 97 % CPU; recorder.log holds no GOVERNOR line
C21 | confirmed | recorder.ps1:17, node.exe or powershell.exe only; the name is the old scratchpad build folder (tcb-build/tools/recorder.ps1 in pc-freezes evidence tx.json), and no lane command line has held it since 2026-11-17T08:42Z (grep), so today it matches nothing
C22 | confirmed | recorder.ps1:11-12; the Process objects already carry working set, read only for names
C23 | holds in part | three periods, not two: a gap 15:45:34 to 17:19:03 (recorder.log lines 14307-14308); later lines carry no date (C17), so their day is inferred; file mtime 2026-11-17 21:51
C24 | holds in part | true of today's recorder; the earlier version logged the three largest processes (recorder.log:2), the model runner samples its own children (run-resumable.mjs:307), the suite probe sampled its tree (E/probe-suite-memory.md:21)
C25 | confirmed | recorder.log:2; that format runs through the 03:11-07:34 period
C26 | confirmed | r57-0117, its note
C27 | cannot be checked | F/b1-state.md is closed to this refuter by the brief
C28 | cannot be checked | F/b1-state.md, as C27
C29 | confirmed | r57-0115 (one trial)
C30 | holds in part | r57-0114 says the week's usage of "all sessions together" went 26 to 39 %; the claim credits the R57 round alone
C31 | confirmed | SELECTIONS-MAP.md:50, as the assumption that fails for D3-04
C32 | confirmed | E/app-enforcement-mechanisms.md:77-78, also :30-31 (documented only)
C33 | confirmed | status.mjs:750
C34 | confirmed | cost.mjs:879-883 (meter[0] and the last line)
C35 | confirmed | F/own-data.md:39; measured on clinic and FixFlow sessions, not on this tree; its effect on the limit is unknown (same line)
C36 | cannot be checked | F/b1-state.md, as C27
C37 | confirmed | F/own-data.md:36 (row 22, clinic, October)
C38 | confirmed | tier-hook.mjs:27
C39 | confirmed | tier-hook.mjs:29-31
C40 | confirmed | tier-hook.mjs:20
C41 | confirmed | tier-hook.mjs:42-43, for an unreadable or unparsable file only: a file that parses to null, or a kind without models, throws at :45-46, exits 1, and exit 1 lets the call through (E/app-enforcement-mechanisms.md:99)
C42 | confirmed | tier-hook.mjs:23-25
C43 | confirmed | tier-hook.mjs:34-39, 74
C44 | confirmed | .claude/settings.json:3-4; project settings only (the user settings.json has no hooks), so sessions in other folders never run it
C45 | confirmed | r57-0105 (Haiku, app 2.1.325)
C46 | confirmed | r57-0106; E/probe-hooks.md rows 16-17
C47 | confirmed | E/probe-hooks.md:26
C48 | confirmed | E/probe-hooks.md:43-45
C49 | confirmed | E/app-enforcement-mechanisms.md:34 (documented; it is about several hooks on one event, not about tool calls in one batch)
C50 | holds in part | the source line goes on "unless `onFailure: "block"` is set" (E/app-enforcement-mechanisms.md:99, also :20); the claim drops the exception
C51 | confirmed | E/app-enforcement-mechanisms.md:66-67 (documented)
C52 | confirmed | E/app-enforcement-mechanisms.md:94 (documented, untested)
C53 | confirmed | the cited meta file: description, model, toolUseId, finished:true
C54 | confirmed | the analyse meta now has finished (written after b1-claims.md); this refuter's own meta (session 23475471) has no finished key while it runs. The converse fails: 11 of 404 meta files on this PC lack the key for helpers long ended (5 in EMS-workshop1 session f0447fa4, transcripts silent since 2026-11-18 01:06)
C55 | confirmed | lib.mjs:2230
C56 | confirmed | lib.mjs:2677-2678
C57 | confirmed | admit.mjs:137; decide (admit.mjs:158 on) holds no Date, fs or process call (grep)
C58 | confirmed | admit.mjs:16
C59 | confirmed | admit.mjs:231; an N_max above N_ceiling or 3 is refused as 'ceiling' (admit.mjs:224), not clamped
C60 | confirmed | admit.mjs:237-243, one peak_mb for every session
C61 | confirmed | admit.mjs:258, only when B_tokens is set (admit.mjs:145-147); it is null (C66), so the term never refuses today
C62 | confirmed | lib.mjs:3035
C63 | confirmed | thresholds.json:14, source "guess"
C64 | confirmed | thresholds.json:16, source "guess"
C65 | confirmed | thresholds.json:17, source "guess"
C66 | confirmed | thresholds.json:20 (r_tokens null too, :21)
C67 | confirmed | thresholds.json:23; r57-0404: designed, not measured
C68 | confirmed | thresholds.json:13, source "guess"
C69 | confirmed | thresholds.json:4
C70 | confirmed | replace.mjs:879-884
C71 | confirmed | replace.mjs:926-933 (live and free_mb)
C72 | confirmed | tcb/README.md:15
C73 | confirmed | lib.mjs:413; lib.mjs:6-8 makes edgeFacts the one place for such reads
C74 | confirmed | watch.mjs:548-554
C75 | confirmed | watch.mjs:140; slotFree is worked out once per tick (watch.mjs:554) and passed to every row, so one free slot can give several replace-start acts in one tick
C76 | confirmed | watch.mjs:462-465
C77 | confirmed | watch.mjs:518-520 (class 16 and a drain line)
C78 | confirmed | watch.mjs:541; batch_size 12 is a guess (thresholds.json:45)
C79 | confirmed | check-queue.mjs:311
C80 | confirmed | check-queue.mjs:419, 467: batch, n, n_seeds, rng_seed only
C81 | confirmed | cost.mjs:917-918
C82 | confirmed | cost.mjs:365; it also goes into the JSON output (cost.mjs:509) and the speed table (:553); no gate reads it (grep)
C83 | confirmed | cost-inputs.json:218-221; ATTACK-AND-COST-RECORD.md:118 the same
C84 | confirmed | lib.mjs:3053-3058
C85 | confirmed | lib.mjs:2737-2738
C86 | confirmed | lib.mjs:2846-2847 ("Report only")
C87 | confirmed | lib.mjs:75, enforced at lib.mjs:1523
C88 | confirmed | profiles/child.json:25-27
C89 | confirmed | commit.mjs:5-6 ("never repairs"); "never merged" follows from exclusive create, it is not written there
C90 | confirmed | lib.mjs:3583-3587: the item becomes 'unclear'
C91 | confirmed | lib.mjs:1683-1684
C92 | confirmed | guard-hook.mjs:3-6 today; after the fixes it writes by exclusive create (section17-draft:525, C106)
C93 | confirmed | guard-hook.mjs:333-345: node tcb/<name>.mjs from the root, or its absolute form
C94 | confirmed | settings/coordinator.json:58-66; no tier hook anywhere in tcb/settings (grep); timeout 30 s, no onFailure
C95 | confirmed | run-resumable.mjs:327-329
C96 | confirmed | run-resumable.mjs:73
C97 | confirmed | run-resumable.mjs:306-307
C98 | holds in part | r57-0109's note: only the login line and the refusal of 2026-11-17 have a source; "after one of its own sessions ends" has none
C99 | confirmed | section17-draft:247
C100 | confirmed | section17-draft:249
C101 | confirmed | section17-draft:250
C102 | confirmed | section17-draft:251
C103 | confirmed | section17-draft:253
C104 | confirmed | section17-draft:259
C105 | confirmed | section17-draft:260
C106 | confirmed | section17-draft:525; so after the fixes it no longer "writes nothing" (C92)
C107 | confirmed | section17-draft:559
C108 | cannot be checked | F/b1-map-fixes.md is closed by the brief; section17-draft:253 names status.mjs:542-543 and watch.mjs:164 for FX-PLAN, which agrees
C109 | confirmed | FAULTS-AND-FIXES.md:49-50
C110 | confirmed | START-HERE.md:26; research-tree/BUILD-PLAN.md does not exist (ls)
C111 | confirmed | FAULTS-AND-FIXES.md:69-70
C112 | confirmed | r57-0128 (counted from the change list, not from diffs)
C113 | confirmed | r57-0401 (a hypothesis; r57-0406's note makes it one case of a rule)
C114 | confirmed | r57-0506
C115 | confirmed | r57-0103; E/probe-suite-memory.md:21-33
C116 | confirmed | E/probe-suite-memory.md:53 keeps only the note and the CSV (:61 "the sampler's raw output"); the sampler's code is in no file
C117 | confirmed | r57-0129 (its note recounts 9 and 7)
C118 | confirmed | recount of recorder.log: lowest free=7306 at 18:43:37 (line 16814)
C119 | confirmed | DECISION-RULE.md:71 says so; but no file holds the week share (r57-0117), so the rule's "logged" is wrong
C120 | confirmed | DECISION-RULE.md:66 says so; but the recorder runs only when started by hand (C19), stops at 12 h (C18) and has no line after 2026-11-17 21:51
C121 | confirmed | DECISION-RULE.md:72 says "Yes"; no harness file logs units ready to start; only the tree's watcher counts its own rows
C122 | confirmed | DECISION-RULE.md:134
C123 | confirmed | DECISION-RULE.md:143 says so; but the log has no slot count, and one slot held only from the lane's start (2026-11-17 03:11) to at most 04:00 (capacity.txt 1 then 2 in commit 7358773d; first overlap 03:50, r57-0127)
C124 | confirmed | DECISION-RULE.md:59 (a hypothesis)
C125 | confirmed | F/o1-report.md:59; the paper's own words are at F/o1-adaptive-sync.md:38 ("stable (within 5%) for three consecutive iterations"), for microsecond iterations
C126 | holds in part | DECISION-RULE.md:78; a session blocked on a tool or a helper makes no model call; it pays only when it polls, and once its cache lapses it pays cache writes, not reads (weights 1.25 against 0.05, thresholds.json:64)
C127 | cannot be checked | F/o2-report.md:46 (reasoned); no per-process processor figure is on record (o1-0102, r57-0129)
C128 | confirmed | F/o1-report.md:120
C129 | confirmed | o1-0305 (analytic; its note: Windows working set is not Denning's set)
C130 | confirmed | o2-0302 (Borg cells; kill for memory or disk)
C131 | confirmed | o2-0304; it needs a usage history per job, which we lack (its note)
C132 | confirmed | o1-0304; the threads shed were spinners that cost nothing to stop (its note)
C133 | confirmed | o1-0301 (a simulator, 4 programs)
C134 | confirmed | o1-0302; the bracketed narrowing is the claim's own reading of "programs limited by neither", not in the record
C135 | confirmed | o1-0308
C136 | confirmed | o1-0319
C137 | confirmed | o1-0307 (OCR text; gains in figures not read)
C138 | confirmed | o1-0310
C139 | confirmed | o1-0312
C140 | confirmed | o1-0316
C141 | confirmed | r57-0301 (a simulation; crossover between 10 and 25 units)
C142 | confirmed | r57-0305: 1 % and 6 % are of all merges (its note); Kasi and Sarma give 5.6 to 35 % of correct builds
C143 | confirmed | o2-0309; its objective is the fewest bins, not the shortest schedule (its note)
C144 | confirmed | o2-0310 (worst-case theory)
C145 | confirmed | r57-0307
C146 | confirmed | o2-0314 (one run)
C147 | confirmed | o1-0402
C148 | confirmed | o1-0403
C149 | confirmed | o1-0404; its 27 s mean agrees with the recount (364.6 min over 780 commands, 28 s)
C150 | confirmed | o1-0405
C151 | confirmed | o2-0401
C152 | confirmed | o2-0403
C153 | confirmed | o2-0404
C154 | confirmed | o2-0407
C155 | confirmed | r57-0408
C156 | confirmed | r57-0407
C157 | confirmed | r57-0406
C158 | confirmed | r57-0511
C159 | confirmed | r57-0402
C160 | confirmed | r57-0403
C161 | confirmed | r57-0404
C162 | confirmed | r57-0001; CLAUDE.md rule 7
C163 | confirmed | r57-0002
C164 | confirmed | r57-0003
C165 | confirmed | r57-0006
C166 | confirmed | r57-0008
C167 | confirmed | r57-0011
C168 | confirmed | r57-0005
C169 | confirmed | CLAUDE.md:55
C170 | confirmed | SELECTIONS-MAP.md:49
C171 | confirmed | x21-0120 is marked "measured"; its source ATTACK-AND-COST-RECORD.md:118 gives a rule ("harness fact 1"), not a measurement
C172 | confirmed | o1-0101; capacity.txt
C173 | confirmed | CLAUDE.md:46
C174 | confirmed | FAULTS-AND-FIXES.md:61; r57-0109 answers it only in part (C98)

## Design choices

D1 | holds in part | one function answers C107 and the split of C59 and C74; but its callers sit in three places (.claude/hooks, research-tree/tools, tcb), and a tree run uses its own copy of tcb/ in a folder outside the repo (CLAUDE.md:46; settings/coordinator.json:64 "{root}/tcb/"), so the repo's width.mjs and a run's copy are two copies again; a static import of a broken width.mjs crashes the tier hook with exit 1, which lets every start through, routes included (E/app-enforcement-mechanisms.md:99): it needs the guarded dynamic import guard-hook uses (guard-hook.mjs:8-9)
D2 | confirmed | lib.mjs:6-8 makes edgeFacts the one place for clock, free memory, boot and process list, and decide is pure (admit.mjs:137); the lane and the hook can read os.freemem the same way (lib.mjs:413)
D3 | holds in part | the lane re-reads its count at each poll (lane.mjs:43) but tries only slots 0..n-1 (:44): when the width falls, a holder of a higher slot is not counted and a waiter takes slot 0, so more run than the width until it ends (count every held slot instead); two waiters that judge one slot stale can each remove and recreate it, the second deleting the first's fresh slot (lane.mjs:56-61, no fence); one failed read of a live owner.json breaks the slot after 15 s (:58); a memory width per heavy command needs a per-command peak that nothing logs (C24)
D4 | holds in part | a hook is the only start gate seen to work (r57-0105), but it fires only in sessions that load this repo's .claude/settings.json (C44): a tree run lives outside every repository with guard-hook only (CLAUDE.md:46, C94), and other projects' sessions share the PC and the week ungated; helpers a workflow script starts are not Agent calls of the session, and whether PreToolUse sees them is untested (E/probe-hooks.md:43-45), so up to 16 at once by default (E/app-enforcement-mechanisms.md:65) may pass; a hook in the user settings would cover every folder
D5 | holds in part | the reason is wrong as cited: the source says a stalled hook lets the call through "unless onFailure: block is set" (E/app-enforcement-mechanisms.md:99, :20), so a lock can fail closed; the real case against a lock is its release after a crash. Counting by a missing finished key fails on the same crash: 11 of the 404 meta files on this PC lack the key for helpers long ended (5 in EMS-workshop1 session f0447fa4, transcripts silent since 2026-11-18 01:06), each counted as running for ever without an age or transcript-growth test; "the reserve covers one batch" uses a per-helper peak never measured (C64 is a guess, for sessions)
D6 | holds in part | failing open can be argued, but the backstop named is not there: the governor stops only node.exe or powershell.exe whose command line holds tcb-build (recorder.ps1:17), a folder name no lane command has carried since 2026-11-17T08:42Z, so it stops no helper, session or build today; it runs only when started by hand (C19), for 12 h (C18), with no line after 2026-11-17 21:51; and "the routes part stays closed" holds only for an unreadable file: any exception (routes parsing to null, a kind without models, tier-hook.mjs:45-46) exits 1 and lets the call through
D7 | holds in part | the lane kills at 1,500 s at most (lane.mjs:33, 85-90), so refusing Node outside it blocks the model ladder run that "loads every core for an hour or more" (RUN-LADDER.md:62) and any long background script (the tree's watcher, tcb/README.md:14) unless they are exempted; the session's PowerShell tool also starts Node and a Bash branch does not see it; npm, npx, `cd x && node`, `sh -c` and paths escape (C52); a hook's refusal of a Bash call is untested here (E/probe-hooks.md rows 6, 9 tried Write and Agent)
D8 | holds in part | admit is the right gate (replace.mjs:879-884), but the watcher's own start test (watch.mjs:554: N_max alone, once per tick for every row) is left out, so it keeps offering replace-start that admit then defers with exit 6, the kind of wake loop FX-PLAN exists to stop (section17-draft:253); widths() in admit and watch also lands on places the 13 fixes change (r57-0128, C108); a window term beside B_tokens does nothing while B_tokens is null (thresholds.json:20, admit.mjs:145-147)
D9 | holds in part | right for helpers (tokens per transcript, lib.mjs:2230, 2677); but sessions' memory can be told apart side by side: the recorder already lists every process (recorder.ps1:11), lib maps processes to a session by folder or id (lib.mjs:2846), the model runner samples its own children (run-resumable.mjs:307); running alone is needed only for slowdown under interference (DECISION-RULE measurement 3), which D9 does not name
D10 | holds in part | a ticket queue answers C4 and C7, but ranking by fit first starts long light commands before short heavy ones, the case o2-0310 shows can be Omega(n) worse and o2-0403 orders the other way ("start the short heavy check before long light work"); fit belongs as a filter, then shortest, then age; o2-0309 minimises bins, not finish time (its note); waiters are separate processes killed by their callers' time limits, so a dead ticket at the head must be found by pid and age (pid reuse); time per label is not stored but the log's labels and ms give it
D11 | holds in part | follows from r57-0407 and r57-0408 and from what a hook can do (refuse only, tier-hook.mjs:20); but a refused start leaves no ticket: the session must remember to try again, and one that retries by polling pays a model call over its whole context per try (C126); the refusal text has to say when to retry
D12 | holds in part | waits and ends are both in the lane (lane.mjs:82, 95), but a flag worked out at ends lags: a waiter is invisible until it starts or gives up (C7), and two ends can be 596 to 1,500 s apart (C13, C11); with D10's tickets the queue's length and oldest age can be read directly; several lane processes writing one stats file need write-then-rename
D13 | holds in part | check-queue.mjs makes the batches (:419, :467), but its ledger line is written only when a batch is formed, so between batches the oldest item's age goes unseen; the watcher already counts candidates every tick (watch.mjs:541) and could take their oldest age there
D14 | confirmed | o1-0307 (hundreds of departures per step), o1-0404 (about 45 min per step at the lane's 28 s mean); a script that drives nothing cannot break a gate
D15 | holds in part | the status line is the only documented automatic reader of rate_limits (E/app-enforcement-mechanisms.md:77-78), but it is a terminal feature and the login on this PC is in the desktop app (r57-0109), so whether it runs at all is the first test; the stopgap is a typed figure a session can forget (C26); this app's tool list also shows a session tool named get_usage, not tried, which may give a session the figure without typing
D16 | holds in part | the 2,500 MB stop floor has no actor (recorder.ps1:17 matches nothing today, the recorder is not running; D6); 4,000 MB is run-resumable's floor left after running headroom and the part's own size (run-resumable.mjs:329), not a reserve before an unknown peak, and the peak it would pair with is a guess (thresholds.json:16); free memory never fell below 7,306 MB on record (C118), so the defaults bind nothing yet; the week cap's source (F/b1-state.md) cannot be checked
D17 | holds in part | modes from the change list follow r57-0406; but the Write/Edit branch rests on an Edit hook not tested (r57-0506, E/probe-hooks.md:43-45) and cannot see writes through Bash or PowerShell (E/app-enforcement-mechanisms.md:90); the hook knows a helper only by agent_id, and its meta file holds a description, not its files, so who owns which file needs a record written at the start
D18 | confirmed | C88 to C91 hold in code (profiles/child.json:26, commit.mjs:5-6, lib.mjs:3585, lib.mjs:1684); the fixes keep one writer per path (section17-draft:525; FX-W7 at :260)
D19 | confirmed | lib.mjs:3053-3058 already counts the last attempt until its stop is confirmed (2 ticks, thresholds.json:13), and FX-CLOSE makes the close verified (section17-draft:251), with a "no such session" rule so a lost session does not hold the slot for ever
D20 | holds in part | tokens per unit is a count over transcripts (lib.mjs:2230, 2677) and needs no run; measurement 7 is not: the log has no slot count, and one slot held only from the lane's start at 03:11 to at most 04:00 on 2026-11-17 (capacity.txt history; first overlap 03:50, r57-0127) under other work, so a count compares two workloads, not one slot against two; the rest of measurement 6 (window fixed or rolling, cached reads) is not on disk
D21 | confirmed | lane.mjs:23 against :33; the 25.0 min run was a timeout kill (exit 124 at 1,500,104 ms) and the same label's run before it ended at 1,193,636 ms (19.9 min); stronger: write each command's own timeout into owner.json and break at its start + that timeout + a margin, which keeps an age limit against pid reuse

## Weakest points

1. The gates see one folder: the tier hook is in this repo's project settings only, a tree run lives elsewhere under guard-hook, and helpers started by a workflow may not pass PreToolUse at all; load from other sessions on the same PC and week goes uncounted (D4, D1).
2. The safety net assumed behind a fail-open gate is not there: the governor's match (tcb-build) is a folder name no command has carried since 2026-11-17 08:42Z, the recorder is started by hand and silent since 21:51 that day, and any exception in the tier hook exits 1 and lets every start through (D6, D16, C41).
3. Liveness read from meta files is unsound: a missing finished key outlives crashed helpers (11 of 404 here); without an age or transcript-growth test each one holds a slot for ever (D5).
4. The lane as the gate for a moving width has a shrink gap (only slots below n are tried), a stale-break race with no fence, and a 15 s break on one failed read (D3).
5. Most numbers the widths need are guesses or null (thresholds.json:13-21), and the rule's "logged today" column is wrong for the week share, free memory and ready work (C119-C121): numbers would be used before they are measured.
6. The lane order ranks fit ahead of short-first, against the two sources it cites (D10); measurement 7 as a count compares two different workloads (D20); refusing Node outside the lane would block the hour-long model run (D7).
