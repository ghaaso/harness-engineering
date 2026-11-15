# Queue and power: fact sheet (folder: docs/program/evidence/harness-bottlenecks/)

Tags: MEASURED = logged number; RECORDED = stated in prose; INFERRED = the record marks it as inference.
File short names: cards = sweep-cards.txt, tables = sweep-tables.txt, map = map-full.txt, refute = refute.txt, facts = machine-facts.md, res = research.txt.

## PART 1 - the check queue

### 1a. How the lock works
- RECORDED: check.py takes an OS file lock around the test step only; it lives at <git common dir>/clinic-check/check.lock so every worktree shares it. (cards:277)
- RECORDED: Slots: constant TEST_SLOTS = 2, no env override; a check takes any free slot and waits only if all are taken. A per-checkout lock also refuses a second check of the same checkout. (cards:285)
- RECORDED: The second slot opens only while at least 8.0 GiB of physical memory is available, re-read at every poll; otherwise the check waits for slot 1 "as if there were one". Unreadable memory = second slot closed. SECOND_SLOT_FREE_GB = 8.0. (cards:293)
- RECORDED: The 8 GiB is "a safety margin, not a measured requirement"; a check's own footprint was not measured. (cards:295; map:258)
- RECORDED: A waiting check prints the holder (worktree, pid, start time) at once, then each minute. (cards:277)
- RECORDED: Wait bound 2700 s (45 min) via CLINIC_CHECK_LOCK_WAIT_SECONDS; "a chosen figure, not measured". Never runs unlocked silently; NO_LOCK=1 skips it and is reported. (cards:277,279)
- Poll interval of the memory re-read: not in record.
- RECORDED: A killed holder releases the lock (no stale-lock logic). (cards:277)
- RECORDED: Not fair: a newcomer can take the slot a long waiter was about to get (FS-06). (cards:280; map:262)
- RECORDED: In practice the gate collapses to one slot and queueing returns. (cards:296; map:255)
- RECORDED: Stall watchdog: a plugin touches a heartbeat on every collection and test event; no event for CLINIC_CHECK_STALL_SECONDS (default 600) kills the pass tree and fails with "no test made progress for Ns". On Windows a job object kills the whole tree when the check dies. (cards:301)

### 1b. The 9 November mass resume
- RECORDED: On 9 Nov the root restarted Docker Desktop and nine databases and resumed sessions. (tables:469; cards:1076,1087)
- Number of sessions resumed or released at once: not in record. (Only "nine databases in use", cards:1087.)
- RECORDED (root transcript 7f348b2c, quoted by the refuter): "lock held for the test step (waited 2030 s)", returned 2026-11-09T12:52:03Z; 2030 s = 33.8 min. (refute:34)
- RECORDED: Root's wrap_up recap: "That check waited 34 minutes for the single lock slot behind the resumed sessions' checks." (refute:34)
- MEASURED: The same transcript also has "waited 350 s". (refute:34)
- Other 9 Nov waits: not in record. The "3 s" low end is from an earlier test (solo run 2, wait 3), not 9 Nov. (cards:295,367)
- RECORDED (refuter's reading): releasing all parked sessions at once produced the 2030 s wait ("thundering herd"). (refute:104; also refute:19)
- RECORDED: The earlier critic searched only docs/tasks and found 742 s (linux-test-runner task.md:88) and 726 s as largest; refute:34-35 overrides that to 2030 s. (sweep-critic.txt:9; cards:367; map:257)
- RECORDED: Root transcript's next record after the stop is 2026-11-09T12:03Z, started by a child session's note. (map:88)
- MEASURED: Other recorded waits (s): 385 single slot; 409/364/469/337; 338/551/726/221; 647/3/256/614; 443 and 169; 742 (c9; c12 was 700). (cards:367; map:257)

### 1c. Durations
- MEASURED: Native 6 workers, head df66fc8, 2,246 tests: 367.2 s whole (earlier 346.8, 336.8); across the build native ran 336.8 to 367.2 s on 2,217-2,246 tests. (cards:319; tables:436)
- MEASURED: Container 12 workers, same head: 247.0, 215.6, 227.7 s, mean 230.1 s. (cards:319)
- MEASURED: Heavily loaded day on bc572f6: container 331.3, 360.1, 318.8 s vs native 475.5 s; machine 60-72% loaded. (cards:319,386)
- MEASURED: Two container checks at once, 12 workers each: 266.4 and 267.0 s vs 220 s alone (about 20% slower each); machine 50% mean / 100% peak CPU; least free memory 5.3 GB. At 6 workers each: 285.9 / 283.0 s, least free 7.3 GB. (cards:418)
- Date of that pair and which other sessions ran: not in record.
- "About 440 s in a row" is not stated as such. Nearest: native pair 1, two checks started together, 435.1 and 435.6 s, no wait; loaded single 389.4 and 417.6 s; quiet machine 275-290 s. (cards:287; tables:434)
- MEASURED: Whole check on merged main 274 to 726 s as quoted by the verdicts. (verdicts.txt:19)

### 1d. Free-memory sampling
- MEASURED: About 980 one-second samples in three runs on 164528e: 8 GiB never available. Free memory 2.1-4.7 GiB (mean 3.5), 2.4-4.6 (3.4), 3.9-6.2 (5.2). CPU mean 24-36%, peak 82%. (cards:295; tables:447-451)
- MEASURED: Overall observed range 2.1-6.2 GiB. (map:255)
- MEASURED: Earlier pairs, minimum free memory: 8.5, 3.3, 2.3, 2.5, 5.6 GB of 31; later set 0.8, 0.0, 3.4 GB. (cards:287)
- MEASURED: 7.3 GB available at a no-build reading on 11 Nov. (facts:22; map:255)

### 1e. The 600 s stall (B09)
- MEASURED: Run m1 on bc572f6, native, 6 workers: parallel pass stalled at about 96% of tests, "no test made progress for 600s", watchdog killed it after 961 s, whole check 1,116.0 s; serial pass passed (155 s); rerun m2 passed 7/7 in 475.5 s (parallel 324.5 s). (cards:303)
- RECORDED: Host free memory under 1 GB; cause unknown; hung test not identified (heartbeat has no test id); not reproduced. (cards:303; map:326-328)
- RECORDED: One hang in roughly 40 native runs. (map:355)
- RECORDED: Longest healthy test about 16 s. (cards:305; map:329)
- MEASURED: Planted demos: sleeping test with 60 s limit killed; in the container a 20 s limit killed it after 24 s. (cards:303,394)

### 1f. Per-round gate cost
- RECORDED: "A check that costs about 5 minutes alone costs 10-18 minutes with two to four sessions." (cards:369)
- RECORDED: A slice's gate cost with waits is about 10-18 min; about 4-5 min with container mode and two real slots (a proposed gain). (map:288)
- RECORDED: Every slice session runs the full gate at least once per review round (2-4 rounds), with up to about six sessions working. (map:255)
- Checks per round actually run: not in record. map:274: "No rule says how many full gate runs a slice may spend per review round."

## PART 2 - the 6 November stop

### 2a. Timeline
- MEASURED: Last commit before the halt 2026-11-06 14:57:52 +0500, "Record the round's full check on 622db16". (map:189; refute:26)
- MEASURED: Event 6008: previous shutdown 2:58:23 PM on 11/6/2026, unexpected; Event 41 at 15:13:10 reboot. (map:87)
- MEASURED: Idle sleeps from 16:07 on 6 Nov; unclean shutdowns 6 Nov 18:11, 7 Nov 16:40, 8 Nov 11:47. (map:87)
- MEASURED: machine-facts lists Nov 6 as 00:01, 14:58, 18:11 (Nov 6 20:14 sleep-related); Nov 7 and Nov 8 without times; Nov 10 15:08 and 15:25. (facts:7,10) Its 6 Nov list differs from map:87 only in not listing the 7 and 8 Nov times.
- MEASURED: 24 Event 41 records since 2026-10-07; 23 with bugcheck code 0. (facts:7-8)
- MEASURED: No commits 7 or 8 Nov; first commit on resume 9 Nov (hour not in record; 41 commits that day). (cards:1062; tables:428)
- RECORDED: No transcript record after hour 09Z on 6 Nov. (refute:18,62)
- RECORDED: "About three days" / "took three days and the owner's return"; "three-day halt". (map:97,185)
- RECORDED: The root had ended its turn normally at 14:21 local after merging S11. (map:85) Slice nervous-newton-322a49's last record was an unanswered API request at 2026-11-06T09:59:05Z. (map:90) Three parked sessions waiting on the opening cutoff guards merge: kernel-followup, people-followup, posting-followups. (cards:1217) Which other slices were mid-work: not in record.
- CONFLICT in the record: cards:1076 and tables:468 say "a usage limit stopped every session" (from testbed task.md:763). map:85 and refute:17-19 reattribute it to a power-off (the main session's reading). No limit-text record exists on 6 Nov. (map:89)

### 2b. Started by hand after a reboot
- RECORDED: sign-in, Docker Desktop, the in-use database containers, and the sessions. (map:111)
- RECORDED: Docker AutoStart false; 31 of 34 containers have restart policy "no"; compose.yaml has no restart key. (facts:20; map:358)
- RECORDED: Background sessions stop at a restart; nothing restarts them. (res:356)
- RECORDED: The Hyper-V rig VM is off after every reboot and needs a UAC prompt. (map:358,362)
- Time from power-on to ready: not in record.

### 2c. Parked starts (CR-02)
- RECORDED: The app refuses start_session ("user_asked") on any turn begun by an automated event, even with standing authorisation USER-21. Workaround on 6 Nov: on the owner's own turn, pre-create sessions with a brief "PARKED START: reply one line and end your turn; begin only on the root's go"; later release each with SendMessage, which works on automated turns. (cards:1215)
- RECORDED: Used for three sessions (ports 55452, 55453, 55454); it did not prevent the halt and cannot create new sessions while the owner is away. (cards:1217,1218)
- RECORDED: Board quote: "the app accepts a start only on a turn the owner's own message began" (task.md:834). The documentation lane could not find this rule on the Desktop page; it may be an app-level guard. (map:91; res:366)

### 2d. Limits and scheduled tasks
- RECORDED: An open interactive session auto-continues after the reset; stops after three continuations, a reset over 24 h away, or exit. (res:343)
- RECORDED: Workflows pause at a limit only in interactive or local Desktop Code-tab sessions; no pause in background or scheduled-task sessions. (res:347)
- RECORDED: Desktop scheduled tasks need the machine on and no open session; their prompts cannot act as approval or consent; the docs describe no trigger that resumes a limit-halted session beyond auto-continue. (res:351,366)
- INFERRED (marked unverified): whether a scheduled task may start a session or release parked ones is an untested probe; the refuter expects it to fail. (map:112; refute:19; res:366 "I did not verify")
