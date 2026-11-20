# LOCKS: the tree's locks against the database way (helper of the locks session; analyse, Opus; 2026-11-21)

Brief: `research-tree/build/briefs/LOCKS-analyse.md`; the owner's words: `research-tree/build/briefs/LOCKS.md`:5-9. Read-only
check; nothing built, changed or run. Read on 2026-11-20 23:52 to 2026-11-21 00:07 local time (UTC+5). Sources: the eight
papers under `research-tree/build/locks/papers/` (READY stamped 2026-11-20T18:54:24Z) and Graefe 2010 on disk. Marks: [m]
measured (path), [r] read in a file (path:line), [q] quoted from a source (file and section or page), [c] computed with
the formula shown, [e] estimate (range). `hb` = `C:/Users/User/Documents/projects/hb` (branch build); `main` = the main
checkout; `RUN:` = `C:/research-runs/2026-11-harness-leads/`. Status: LIMIT reached (section 6, "Left to do").

## 0. The answer

1. No: the tree does not rely on OS locks. Its locks are files made by exclusive create (Node `wx`, or a folder by `mkdir`)
   that name their holder, and each write re-checks a number (a nonce, an epoch, a revision). The one OS lock is
   av-watch's guard against a second copy of itself; it protects no data.
2. The OS lock you saw is a proposal on the complexity page ("a lock the OS frees when its holder dies", a test first);
   none of it is built. What the run lock does use from the OS is its process list (PowerShell), to judge a dead holder.
3. The course's reasons are about latches inside a database engine: an OS mutex costs about 25 ns per lock and unlock and
   hands a waiting thread to the OS scheduler (lecture 9 notes, section 3). Our holds last seconds and taking a lock
   already costs milliseconds, so neither reason carries over.
4. The reason that carries over is lecture 16's: the lock table need not be durable, since a crash ends every holder. Our
   lock files outlive their holders, so each needs a stale break, and most lock faults on record sit there (A11, D10,
   D21, E1). A lock the OS frees at a holder's death is that rule for processes; SQLite takes OS file locks for it.
5. Flaws, 4 of 15 places: the lane's slots and the plan gate's lock break a lock by age or process id with no check, so
   two holders can enter (lane: D10 on record; plan gate: new); the run's `gate.mjs` checks, then appends, with no lock,
   so two gate calls at once can both start past the cap (new); `shuffle.mjs` overwrites its sealed key (new, small).
6. Change, before the research run: one lock around `gate.mjs`'s check and append, and a create-once key in
   `shuffle.mjs`, about 3-6 M tokens [e]. After the pilot: the run lock's checked break into the plan gate and the lane,
   about 17-43 M [e]; the OS-freed lock for the run lock, watcher lock and lane only after its small test, about 43 M.

Counts by verdict: flaw 4 (L8, L10, L11, L12); sound 10 (L1-L7, L9, L13, L14); not known 1 (L15).

## 1. The places

hb's `research-tree/tcb/` holds L1-L7; `research-tree/tools/lane.mjs`, `av-watch.ps1` and `recorder.ps1` are byte-equal
in hb and main [m: `diff -q`]; `land.mjs` exists in hb only [m: `ls`]. Hooks: `library-start.mjs`, `tier-hook.mjs` and
`tier-routes.json` are equal; `plan-gate.mjs` (main version 2, hb version 1), `record-guard.mjs`, `selftest.mjs` and
`tools/check-commit.mjs` differ [m: `diff -q`], and of these only the plan gate takes a lock, with the same lock code in
both (main :478-497, hb :321-340) [r]. RUN's scripts were read at 23:57 (`gate.mjs`, file 23:32, unchanged at 00:06) and
00:06 (`shuffle.mjs`, rewritten 00:04) [m: `ls --time-style`]; helper C was still writing them.

| id | file:line | primitive | protects | contenders; hold | on death, kill, sleep | literature (source) | real flaw here? | proven replacement | cost |
|---|---|---|---|---|---|---|---|---|---|
| L1 | hb `tcb/lib.mjs`:1342-1453 acquireLock, :1460-1511 breakStale, :1290-1323 handle (assertHeld :1302-1308), :1539-1549 withRunLock; ~22 call sites (e.g. `commit.mjs`:977, `watch.mjs`:428, `replace.mjs`:243) | exclusive create `wx` of `run/run.lock` with {pid, start time, nonce}; bounded retry 300 x 100 ms +-50 % then exit 75; holder judged after 50 unchanged sightings by one PowerShell query (:1262-1274, :2842); break by rename to a unique name, compare, create, restore by hard link; nonce re-read before every write (:1601, :1643, :1767) | `tasks.json`, the ledger, incidents, every shared write (protocol v2 R1, `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`:85-92) | the coordinator's scripts (parallel calls in one turn, the design's premise: `RJ`:983), the watcher's tick (5 s try), intake (one at a time); 2-4 at once [e]; hold ms to s, a PowerShell query inside some holds ~2 s [r :2852-2853] | file stays; broken ~5-7 s after death once PowerShell answers NONE [c: 50 x 100 ms + ~2 s]; PowerShell failing = "unknown" = alive: never broken, exit-75 loop (A11); sleep: no timer, a live holder is not broken [r] | a latch in Graefe's sense, not an OS lock; lecture 16's non-durable table is why it needs a break; the break is checked (design's fix of E1, `DR`:64, `RJ`:955) | no (safety); liveness gap A11 on record | for A11 only: an OS-freed lock after its test (sec. 3, P-OS); keep the nonce and epoch checks | with L2 and L8: ~1 unit, 43 M (28.5-51.4) [r FAULTS.md:231] |
| L2 | hb `lib.mjs`:4336-4350 breakStep; `watch.mjs`:859-897 (held for the watcher's life) | as L1; break only under `run.lock` and only if `watcher.lock` and `watcher.json` are byte-equal to the judgement; the watcher writes only inside a run-lock hold after its assertHeld (:4329-4335) | one watcher per run (SingleWatcher, `DR`:80) | the running watcher and one the coordinator starts; 2; hold minutes to hours | as L1 (A11's 30 s exit-75 loop when the list is unknown); sleep: kept | a long-held exclusive role = a Chubby lock with a sequencer checked at the resource (Burrows 2006, sec. 2.4) | no; A11 on record | as L1 | in L1's |
| L3 | hb `lib.mjs`:1742-1771 writeTasks, :1782-1807 updateRow; :826-855 writeAtomic | revision compare-and-set under L1; temp `wx`, fsync, rename; `.prev` copy | task rows (lost update) | L1's holders | rename is all or nothing on one NTFS volume [e]; a `<file>.<pid>.<nonce>.tmp` may remain | lock plus a protocol (lecture 16 notes, sec. 1: locks alone are not enough); version check | no | none | 0 |
| L4 | hb `lib.mjs`:1817-1912 fence, :1552-1567 checkCe; commit takes only the table's epoch (protocol v2 R2, :93-97) | fencing numbers (attempt epoch, coordinator epoch) compared at the resource under L1 | against a replaced session or a stale coordinator writing | sessions over hours | numbers never expire; a late write is refused whenever it comes | Chubby's sequencer: name, mode and "the lock generation number", tested by the server [q burrows2006 sec. 2.4]; D1-01 (`SM`:11) | no (FAULTS.md:232: "none better"); D15 on record | none | 0 |
| L5 | hb `lib.mjs`:703-766 exclusiveWrite (strict), :876-882, :3993-4013 outcomeAppend; `guard-hook.mjs`:398-405 hookCreate, :609-633 claim, :926, :1006-1025 start, :1043, :1091 close; `replace.mjs`:523, :536; `check-queue.mjs`:462-466; `watch.mjs`:1021, :1158, :1171 | write-once slot: temp, fsync, hard link to the name (fails if taken); test-and-set on the next free slot | one claim and one start per attempt, one outcome per slot, objects and seeds never rewritten | the guard hook in each tool call (takes no lock, `guard-hook.mjs`:6), the fence and commit under L1; no hold | nothing held; a temp file may remain; sleep: no effect | compare-and-swap on an empty slot (lecture 9 notes, sec. 4, latch-free hash table); D3-10 (`SM`:56); one protocol for all writers of a name (SQLite, how to corrupt, 2.4): all use exclusiveWrite (`guard-hook.mjs`:376) [r] | no; D15's window and A13 (fixed by 0b) on record | none | 0 |
| L6 | hb `lib.mjs`:1599-1647 appendLedger, :1010-1019 appendRaw | append, fsync, hash chain checked at each append, torn tail cut, under L1 | order and integrity of the run's events | L1's holders | a torn tail is cut at the next append [r] | write-ahead log (D2-03); A12 (two stores, no joint commit) | no (as a lock); A12 on record | none here | 0 |
| L7 | hb `lib.mjs`:4054-4063 startLeaseExpired | a lease on two clocks: ticks >= start + 10 and wall >= at + 600 s (thresholds) | a start record against a session that never claims | the hook's claim against the lease act | expires on both clocks; ticks stop in a sleep, so a sleep alone cannot expire it [r] | leases (x19-0400, summary only); Chubby's lock-delay bounds a dead holder (sec. 2.4) | no; D18 (a record that does not parse never expires) on record | none | 0 |
| L8 | `research-tree/tools/lane.mjs`:46-70 tryAcquire, :26-27, :44, :60, :62, :65, :78-79 | `mkdir slot-<i>`, then `owner.json` written in place; stale = pid not alive (`process.kill(pid, 0)`, pid only), or wall age over 26 min [c: (1500 + 60) s], or owner unreadable and folder over 15 s old; break = recursive `rmSync` with no re-check | at most `capacity` (2) heavy commands at once | builders', refuters' and landers' test commands; two at once in 41 of 324 min (c1-0101); hold s to 25 min | slot stays until the pid is dead; a reused pid holds it up to 26 min (D10); sleep: the wall age counts the sleep, so a waiter can break a live holder after a long sleep [r :60] | a counting semaphore; the course's latches are in-process; SQLite does cross-process exclusion with OS file locks (locking v3, sec. 6.0) | **yes** (D10 on record; the sleep break new): two waiters that judge one slot stale can each remove it, the second deleting the first's fresh slot (b1-0103, c1-0105), so more commands than slots run; load only, no data harm | the run lock's checked break, judged by pid and start time, no wall age (sec. 3, F4); or OS-freed slots after the test | 8.6-21.5 M alone [c: 0.2-0.5 x 42.9 M]; in L1's 43 M with the OS lock |
| L9 | hb `research-tree/tools/land.mjs`:163-183 (release :171 checks its own pid) | as L8: `mkdir land.lock` + `owner.json`; stale = pid dead, age over 3 h, or unreadable and over 15 s; break `rmSync` | one landing at a time on `build` | landers: one by design; hold minutes | as L8 | as L8 | no in our use (one lander); D21 on record ("remote, since the design has one lander", FAULTS.md:138) | the checked break when a second lander is planned | in F4's |
| L10 | main `.claude/hooks/plan-gate.mjs`:478-497 (lock, unlock), used at :148 (Agent start) and :188 (SendMessage); hb :321-340 the same | `mkdir plan-gate.lock`; stale = folder mtime over 5 s: rename to a unique name, remove (:487-489, "only one waiter wins the rename"); wait up to 8 s at 25 ms; release `rmdirSync` with no owner check (:497) | the count of running helpers, the width and same-unit checks and the `allow` line, so parallel starts are counted (`plan-gate.test.mjs`:318: four starts in one message give three allows) | the PreToolUse hooks of one build session's Agent and SendMessage calls, up to the starts in one message; hold "well under a second" (:40), git runs before the lock (:143, :366) [r] | broken 5 s after a death; a pause over 5 s inside the hold (antivirus, paging, a sleep) lets a waiter in beside a live holder, whose unlock then removes the new holder's lock | the course's lock manager records who holds which lock (lecture 16 notes, sec. 1); our release does not ask | **yes** (new; not in FAULTS row 15): W1 and W2 both see the lock stale, W1 renames it and makes a fresh one, W2's rename then takes W1's fresh lock away, since a rename takes whatever has the name; result: two allows, a duplicate helper (a builder unit is 32.3 M, r57-0173) or a batch above its width; probability low [e]; not in force in the research run (RUN `.claude/settings.json`: tier hook and record guard only) [r] | the run lock's checked break with a holder record and nonce, the nonce re-checked before the `allow` append, release only on a nonce match (sec. 3, F3) | 8.6-21.5 M [c: 0.2-0.5 x 42.9 M] |
| L11 | RUN `tools/gate.mjs`:39-55 (running = START lines, done files, transcript scan), :14 (append), last line (START) | check, then append a line to `run/usage.log`; no lock | the cap and both meters: no start whose reserve does not fit (`RUN-INTERFACE.md` "The scripts"; r57-0414) | the run's coordinator, the only caller (`RUN-COORD.md`:39); two or more at once if it gates several starts in one message; window from the log read to the append includes the scan of every transcript, seconds [e] | a unit whose helper dies without `RETURN.md` or its done file counts as running for ever and its reserve stays counted (:44-55): a slot without a lease; sleep: no effect | write skew; the course: locks make the schedule serializable (lecture 16 notes, sec. 1) | **yes** (new), if two gate calls run at once (not known, sec. 5): each misses the other's START, both start, the cap or a meter is passed by up to one unit's expected tokens | one exclusive lock around read, decide and append, the run lock's form in small; an END line that releases a dead unit's reserve (sec. 3, F1) | 2-4 M on Sonnet [e: RUN-TOOLS.md expected 3.5 M for all four scripts] |
| L12 | RUN `tools/shuffle.mjs`:43-48 | plain overwrite (`writeFileSync`) of `score-in/review-1.md`, `-2.md` and `sealed/f<n>-arms.json` | the blinding key: which review is which | one writer; a repeat for one field (a retry after a crash) | a crash between the reviews and the key leaves reviews and a key of different shuffles [r :43-44 order] | write-once by exclusive create (D3-10; the tree seals its seeds so, `check-queue.mjs`:462) | **yes** (new, small): a second shuffle rewrites the key; scores of the first pair would be mapped to the wrong arm [e] | key first by `wx`, refuse when it exists, then the reviews (sec. 3, F2) | 1-2 M [e] |
| L13 | RUN `tools/wait.mjs`, `tokens.mjs`; `RUN-INTERFACE.md` "Returns" | a file's existence as the done signal; `DONE.md` written last, after the commit | that a unit's outputs are complete | one waiter per file | a waiter sees only files that exist | commit record written last (D3-09; FAULTS B10) | no; `gate.mjs`:48 takes `RETURN.md` as a field's end, before its commit: a reserve freed a moment early [r] | none needed | 0 |
| L14 | `research-tree/tools/av-watch.ps1`:45-60 (comment :21-22) | OS share-mode lock: `<log>.lock` held open with FileShare.Read for the run; a second opener gets a sharing violation and exits | one copy per log; no data | a second copy started by hand; hold hours | the OS closes the handle at death; kept across a sleep | as SQLite on Windows (locking v3, sec. 6.0); its risks are network file systems (how to corrupt, 2.1), not a local disk | no | none | 0 |
| L15 | `.claude/hooks/tier-hook.mjs`:16, `library-start.mjs`:41, `plan-gate.mjs`:46 (start and end lines outside its lock), hb `record-guard.mjs`:41-42; `lane.mjs`:42; `land.mjs`:95, :225 | one line appended per call in append mode, no lock, several hook processes at once | the lines of logs; the plan gate's start and end lines decide "running" | every session's hooks | a torn or glued line if two appends interleave | none read | **not known**: whether one-line appends from several processes interleave on this NTFS (sec. 5) | if they do: append under the gate's lock, or one file per event | - |

Not a lock place: `recorder.ps1` (one writer, append, FileShare.ReadWrite); `tools/check-commit.mjs` (git's own index lock);
the coordinator tools under `research-tree/tools/coordinator/` (one-off build scripts; `tcb_done_sync.js`:8 writes a fixed
`.tmp` name, harmless with one runner) [r].

## 2. The reasons in the sources, and which carry over

Quotes are kept to short phrases; the rest is said in my words with its place.

1. **Cost of an OS mutex.** Lecture 9 notes, sec. 3 (page 2): "OS mutex is generally a bad idea inside of DBMSs" [q
   cmu-notes-09], because the OS manages it at large overhead, "about 25 ns per lock/unlock invocation" [q same; slides
   09, slide 14 gives the same figure]. Does not carry over: 25 ns against our shortest hold of about 1 ms is 2.5e-5 of
   it, against 1 s 2.5e-8 [c: 25e-9 / 1e-3, 25e-9 / 1]; our acquire is itself a file create and fsync, milliseconds [e].
2. **Control on a busy latch.** Same section: a spin latch lets the engine decide what to do when it fails to get the
   latch (retry, yield, abort); a blocking OS mutex hands that to the OS. Carries over only as a rule, and the scripts
   keep it: every wait is bounded (L1: about 30 s then exit 75 [c: 300 x 100 ms]; the watcher 5 s; the plan gate 8 s).
   An OS lock taken without blocking (a pipe name that is refused at once) keeps the same control.
3. **Locks are not latches.** Lecture 9 notes, sec. 2, and the table on slide 7 of lecture 9 and slide 12 of lecture 16
   (both credited to Goetz Graefe): locks separate transactions, protect database contents for a whole transaction, have
   several modes, are handled by deadlock detection, and live in the lock manager; latches separate threads or processes,
   protect in-memory structures for a critical section, have read and write modes, avoid deadlock by coding discipline,
   and live in the structure they protect. Graefe 2010, sec. 3.1 (p. 16:5): the operating-systems literature "uses the
   term locks for the mechanisms that in database systems are called latches" [q w1/graefe10]. Carries over as a
   classification: an OS lock is a latch in the course's terms, and so is our run lock (short, one mode, one lock held at
   a time). The course's advice is how an engine builds its latches, not a rule that processes must not use the OS.
4. **Deadlock and no-wait.** Lecture 9 notes, sec. 5 (page 4): latches have no deadlock detection, so code that takes a
   second latch against the order "must support a "no-wait" mode" [q]. Carries over and holds: the one nested take
   (L2's break holds `run.lock` while it breaks `watcher.lock`) never waits on the second lock [r hb `lib.mjs`:4336-4350].
5. **The lock table dies with its holders.** Lecture 16 notes, sec. 1 (page 1): a central lock manager grants locks and
   keeps a table of holders and waiters; "The DBMS's lock-table does not need to be durable" [q cmu-notes-16], since every
   transaction still running at a crash is aborted. Carries over, and it is the one that matters here: our lock records
   are files that survive their holders, while nothing tells a waiter that a holder died; hence the stale breaks, the
   PowerShell judgement (L1, L2) and the timers (L8-L10). The only lock table on this PC that is cleared when a process
   dies is the kernel's. Lock-manager features (modes, a first-come queue, deadlock detection, intention locks) serve
   many objects held for a transaction's length; each of our locks covers one object in one mode, and the tree's long
   ownership (an attempt, hours) is not a held lock but an epoch checked at the resource (L4).
6. **Lock cost against latch cost.** Graefe 2010, sec. 3.1: a lock acquisition often costs thousands of CPU cycles, a
   latch tens of instructions. Does not carry over: both are far below our millisecond file operations.
7. **mmap.** Crotty, Leis and Pavlo 2022, sec. 3.1: the OS may write a dirty page back at any time and "The DBMS cannot
   prevent these flushes" [q crotty2022]; sec. 6 lists when not to use mmap, first when updates must be transactionally
   safe. Does not carry over: nothing here maps files (Node's `fs` has no mmap [e]); as a theme (do not leave ordering to
   the OS) the scripts already fsync before they rename (hb `lib.mjs`:833-838).
8. **SQLite builds on OS locks.** Locking v3, sec. 6.0: "On Windows it uses the LockFile(), LockFileEx(), and
   UnlockFile() system calls" [q sqlite-lockingv3], and sec. 3.0 builds five lock states on them (unlocked, shared,
   reserved, pending, exclusive). Its warnings are about file systems whose locks are broken, network ones above all
   (how to corrupt, sec. 2.1; locking v3, sec. 6.0), the POSIX quirk where a close() drops every lock of the process
   (sec. 2.2, Unix only), and two programs on one file with different lock protocols, which "will not see each other's
   locks" [q sqlite-howtocorrupt, sec. 2.4]. Carries over: an embedded database's own lock manager stands on OS file
   locks; on one local NTFS disk the warned cases are absent, except 2.4, which binds any change: every party to one
   lock moves to the new form at once.
9. **Fencing after a lock is lost.** Burrows 2006, sec. 2.4: a holder may send a request and fail; another may take the
   lock and act before the old request arrives; Chubby therefore hands out a sequencer (lock name, mode, generation
   number) that the receiving server checks, and a lock-delay of up to a minute for servers that cannot check. Carries
   over and is built: L4's epochs and L1's nonce check before each write are sequencers checked at the resource. Chubby
   also rejected mandatory locks (same section), so advisory locks with checks at the resource are the proven form.

## 3. Each flaw's replacement in detail

- **F1, `gate.mjs` (L11), before the research run.** The proven mechanism: run the gate's read, decision and append as one
  serial step, by an exclusive lock held over all three (two-phase locking on one object, lecture 16 notes, sec. 1-2).
  Form, the run lock's in small (protocol v2 R1): exclusive create of `run/gate.lock` with {pid, nonce}; bounded retry
  (about 50 x 100 ms), then `HOLD <unit>: gate busy`; read, decide, append; release by unlink only when the nonce
  matches. A stale lock is broken only when `process.kill(pid, 0)` says the holder is gone, by rename to a unique name
  and a nonce compare (restore on mismatch); a reused pid keeps the lock, which only holds starts (the safe side); no
  timer, so a sleep cannot break it. Add one line kind, `END <unit>: failed|stopped`, that the coordinator writes for a
  helper that will not return, so its reserve is released. Removes: a cap or meter passed by one unit's reserve. Risk:
  small; one test of two gates at once. Cost 2-4 M on Sonnet [e]. A brief line "one gate call per message" alone would
  rest on a model's obedience, which the design does not rely on (`SM`:11, D1-01).
- **F2, `shuffle.mjs` (L12), before the run.** Write `sealed/f<n>-arms.json` first with flag `wx`; when it exists, print
  `REFUSED f<n>: key exists` and exit 2; then write the two reviews. Removes a silent re-key. Cost 1-2 M [e].
- **F3, plan gate (L10), after the pilot.** The run lock's checked break (R1; `RJ`:955): the lock holds a record {pid,
  start time or creation stamp, nonce}; a waiter that judges it stale renames it to a unique name, re-reads it and
  proceeds only if it is the record it judged, else renames it back; the holder re-reads its nonce just before the
  `allow` append and refuses when it lost the lock (a fence at the resource); release only on a nonce match. Removes the
  double break and the cascade. Cost 8.6-21.5 M [c: 0.2-0.5 x 42.9 M, r57-0173 via FAULTS.md:226-228]; the lock test at
  `plan-gate.test.mjs`:325 extends.
- **F4, lane (L8), after the pilot.** As FAULTS row 16 says (FAULTS.md:246): first the checked break; judge by pid and
  start time, not pid alone; drop the wall-age rule (or keep it only as an alert); publish a slot with its owner record
  in one step (make the folder under a temp name with `owner.json` inside, then rename it to `slot-<i>`). Cost 8.6-21.5
  M alone [c], or inside the 43 M unit below.
- **P-OS, the page's proposal (FAULTS row 1, FAULTS.md:231; `research-tree/build/reports/complexity.html`:389).** Judged
  by the sources, a lock the OS frees at its holder's death is not the misuse the course warns about (reasons 1-3); it is
  reason 5 applied to processes and is what SQLite does (reason 8). In plain Node the form is a named pipe held by the
  holder (a second `listen` on the name is refused at once; the OS closes it at death). It would delete the PowerShell
  judgement, the stale breaks and A11, D10 and D21 with them. It does not replace the fences (reason 9): nonces and
  epochs stay. Its risks are facts of this PC, to be measured first (r57-0506): freed at a hard kill; not inherited by
  child processes (the watcher spawns intake); not blocked by the antivirus; and all parties of one lock switched at
  once (reason 8). A hung live holder is never freed, as with today's files. Cost about 1 unit, 43 M (28.5-51.4 M) with
  the lane [r FAULTS.md:231]. Order: after the pilot, after its test.
- **P-DB, an embedded database as the lock manager** (the brief's third example): SQLite would give transactions across
  `tasks.json` and the ledger (A12's case) with its own lock states on OS locks. Not indicated: the run lock and the
  fences are sound, the flaws are small side locks, and it would rebuild the 4,501-line library every script uses
  [m: `wc -l`], several units [e: 3-5 x 42.9 M = 129-215 M]; whether Node 24's built-in `node:sqlite` is stable is not
  known [e].

## 4. Bears on top session 5's run scripts

F1 and F2 are in `RUN:tools/`, being written now. For the locks session to send as data (brief `LOCKS.md`, rules): "L11:
`gate.mjs` reads usage.log, decides and appends with no lock, so two gate calls at once can both START past the cap; a
dead unit's reserve is never released. L12: `shuffle.mjs` overwrites `sealed/f<n>-arms.json` on a repeat. Detail:
`H:research-tree/build/LOCKS.md` sections 1 and 3."

## 5. Not known, and what would measure it

- Whether two Bash calls in one message run at the same time (decides whether L11 is reachable; the design assumes so,
  `RJ`:983): two `gate.mjs` calls in one message against a scratch run root with `GATE_NOW`, each line stamped at start
  and end (a test: the owner's word first).
- Whether one-line appends from several processes interleave on this NTFS disk (L15): N processes appending M lines to
  one file, then a count of bad lines (a test).
- Whether a named pipe held as a lock is freed at a hard kill, refuses a second holder and is not inherited by spawned
  children on this PC (P-OS; FAULTS.md:327; r57-0506): the small test.
- Whether `process.uptime()` counts a sleep on this PC: it sets the start time the run lock records (hb `lib.mjs`:1220-1225;
  a backward clock step over 2 s before a process's first lock could misjudge a live holder [e]): compare before and
  after one sleep.
- How long the run lock is held and waited for in real use: never measured (`DR`:85, "lock contention not measured");
  the ledger's line times in the pilot would give it.
- The size of an L11 overshoot: the units' expected tokens are in `RUN:run/config.json`, not yet written at 00:06.
- Whether a hard-killed lane's command dies with it (Node may place children in a kill-on-close job) [e]: one kill test.

## 6. Left to do (LIMIT)

Stopped at the token limit (14 M): 13.58 M over 73 calls before this file [m: sum of input, cache creation, cache read and
output once per message id over this helper's transcript, by awk; `tokens-self.mjs` itself was refused by the auto-mode
classifier]. Not done: D15's window was not re-traced (taken from FAULTS); the slides were read only at the lines cited;
`RUN:CLAUDE.md` and the field briefs were not read (CLAUDE.md absent at 00:06); RUN's scripts may change after 00:06.
