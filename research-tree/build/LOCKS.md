# LOCKS: the tree's locks against the database way (helper of the locks session; analyse, Opus; 2026-11-21)

Brief: `research-tree/build/briefs/LOCKS-analyse.md`; the owner's words: `research-tree/build/briefs/LOCKS.md`:5-9. Read-only
check; nothing built, changed or run. Read on 2026-11-20 23:52 to 2026-11-21 00:07 local time (UTC+5). Sources: the eight
papers under `research-tree/build/locks/papers/` (READY stamped 2026-11-20T18:54:24Z) and Graefe 2010 on disk. Marks: [m]
measured (path), [r] read in a file (path:line), [q] quoted from a source (file and section or page), [c] computed with
the formula shown, [e] estimate (range). `hb` = `C:/Users/User/Documents/projects/hb` (branch build); `main` = the main
checkout; `RUN:` = `C:/research-runs/2026-11-harness-leads/`. Version 2 (2026-11-21, from 00:36): the blind review
`research-tree/build/refute/LOCKS.md` ("CORRECT: 11 findings") folded as the locks session decided each finding
(`research-tree/build/briefs/LOCKS-fold.md`; r57-0021). Version 1, whose lines the review cites, is
`research-tree/build/LOCKS-v1.md`, a byte copy (sha256 0c63d2cc...4b9575 for both at the copy) [m: `sha256sum`]. What
changed: the last section.

## 0. The answer

1. No. Our locks are files or folders made by exclusive create. The run and watcher locks name their holder and each
   write re-checks a nonce, epoch or revision; the lane's, lander's and plan gate's do not; the run's gate takes none.
2. What you saw is on the complexity page; the pilot plan takes no lock. Two OS proposals there, neither built: a lock
   the OS frees when its holder dies (a test first), and read-only and append-only rights on evidence, not a lock.
3. The course's cost reason (an OS mutex's 25 ns) does not carry over to holds of seconds; its control reason does, and
   every wait here is bounded. Its lock table need not survive a crash; our lock files outlive their holders, so they
   need stale breaks, where most lock faults sit; a lock the OS frees removes those, as in SQLite (locking v3, 4.0-4.1).
4. Flaws, none from an OS lock: the lane and plan gate can let two holders in; if two run-gate calls overlap, which the
   coordinator's brief avoids, one 117.7 M field too many can start; `shuffle.mjs` rewrites its key on a repeat (small).
5. Change before the research run: the gate writes each decision once to a numbered slot, and the key is made once.
   After the pilot: the run lock's checked break for the lane and plan gate, then the OS lock if its test passes. All
   on Opus with a blind refuter; estimates: about 9-22 M tokens each (the key less), the OS lock about 43 M.

Counts, one verdict per place of section 1 (16 places that take a lock, claim, fence, lease, slot or exclusive write, or
append with none; not faults, not call sites): flaw 4 (L8, L10, L11, L12); sound 11 (L1-L7, L9, L13, L14, L16), sound
for their data though L1, L2 and L16 keep a liveness gap; not known 1 (L15).

## 1. The places

hb's `research-tree/tcb/` holds L1-L7; `research-tree/tools/lane.mjs`, `av-watch.ps1` and `recorder.ps1` are byte-equal
in hb and main [m: `diff -q`]; `land.mjs` exists in hb only [m: `ls`]. Hooks: `library-start.mjs`, `tier-hook.mjs` and
`tier-routes.json` are equal; `plan-gate.mjs` (main version 2, hb version 1), `record-guard.mjs`, `selftest.mjs` and
`tools/check-commit.mjs` differ [m: `diff -q`], and of these only the plan gate takes a lock, with the same lock code in
both (main :478-497, hb :321-340) [r]. RUN's scripts were read at 23:57 (`gate.mjs`, file 23:32, unchanged at 00:06) and
00:06 (`shuffle.mjs`, rewritten 00:04) [m: `ls --time-style`]; helper C was still writing them. The review's findings 3
and 7 rest on run files written after this check read the run root at 00:06: `RUN:run/config.json` 00:12:03,
`RUN:CLAUDE.md` 00:12:29, `RUN:briefs/COORDINATOR.md` 00:15:59 (the review's times). At the fold's reading (00:37-00:43)
`COORDINATOR.md` had changed again (00:23:16), its lines 39-41 and 193 still as the review cites; `gate.mjs` (23:32:42)
and `shuffle.mjs` (00:04:11) were unchanged [m: `ls --time-style=full-iso`]. The run's files may change again.

| id | file:line | primitive | protects | contenders; hold | on death, kill, sleep | literature (source) | real flaw here? | proven replacement | cost |
|---|---|---|---|---|---|---|---|---|---|
| L1 | hb `tcb/lib.mjs`:1342-1453 acquireLock, :1460-1511 breakStale, :1290-1323 handle (assertHeld :1302-1308), :1539-1549 withRunLock; ~22 call sites (e.g. `commit.mjs`:977, `watch.mjs`:428, `replace.mjs`:243) | exclusive create `wx` of `run/run.lock` with {pid, start time, nonce}; bounded retry 300 x 100 ms +-50 % then exit 75; holder judged after 50 unchanged sightings by one PowerShell query (:1262-1274, :2842); break by rename to a unique name, compare, create, restore by hard link; nonce re-read before every write (:1601, :1643, :1767) | `tasks.json`, the ledger, incidents, every shared write (protocol v2 R1, `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`:85-92) | the coordinator's scripts (parallel calls in one turn, the design's premise: `RJ`:983), the watcher's tick (5 s try), intake (one at a time); 2-4 at once [e]; hold ms to s, a PowerShell query inside some holds ~2 s [r :2852-2853] | file stays; broken ~5-7 s after death once PowerShell answers NONE [c: 50 x 100 ms + ~2 s]; PowerShell failing = "unknown" = alive: never broken, exit-75 loop (A11); sleep: no timer, a live holder is not broken [r] | a latch in Graefe's sense, not an OS lock; lecture 16's non-durable table is why it needs a break; the break is checked (design's fix of E1, `DR`:64, `RJ`:955) | no (safety); liveness gap A11 on record | for A11 only: an OS-freed lock after its test (sec. 3, P-OS); keep the nonce and epoch checks | with L2 and L8: ~1 unit, 43 M (28.5-51.4) [r FAULTS.md:231] |
| L2 | hb `lib.mjs`:4336-4350 breakStep; `watch.mjs`:859-897 (held for the watcher's life) | as L1; break only under `run.lock` and only if `watcher.lock` and `watcher.json` are byte-equal to the judgement; the watcher writes only inside a run-lock hold after its assertHeld (:4329-4335) | one watcher per run (SingleWatcher, `DR`:80) | the running watcher and one the coordinator starts; 2; hold minutes to hours | as L1 (A11's 30 s exit-75 loop when the list is unknown); sleep: kept | a long-held exclusive role = a Chubby lock with a sequencer checked at the resource (Burrows 2006, sec. 2.4) | no; A11 on record | as L1 | in L1's |
| L3 | hb `lib.mjs`:1742-1771 writeTasks, :1782-1807 updateRow; :826-855 writeAtomic | revision compare-and-set under L1; temp `wx`, fsync, rename; `.prev` copy | task rows (lost update) | L1's holders | rename is all or nothing on one NTFS volume [e]; a `<file>.<pid>.<nonce>.tmp` may remain | lock plus a protocol (lecture 16 notes, sec. 1: locks alone are not enough); version check | no | none | 0 |
| L4 | hb `lib.mjs`:1817-1912 fence, :1552-1567 checkCe; commit takes only the table's epoch (protocol v2 R2, :93-97) | fencing numbers (attempt epoch, coordinator epoch) compared at the resource under L1 | against a replaced session or a stale coordinator writing | sessions over hours | numbers never expire; a late write is refused whenever it comes | Chubby's sequencer: name, mode and "the lock generation number", tested by the server [q burrows2006 sec. 2.4]; D1-01 (`SM`:11) | no (FAULTS.md:232: "none better"); D15 on record | none | 0 |
| L5 | hb `lib.mjs`:703-766 exclusiveWrite (strict), :876-882, :3993-4013 outcomeAppend; `guard-hook.mjs`:398-405 hookCreate, :609-633 claim, :926, :1006-1025 start, :1043, :1091 close; `replace.mjs`:523, :536; `check-queue.mjs`:462-466; `watch.mjs`:1021, :1158, :1171 | write-once slot: temp, fsync, hard link to the name (fails if taken); test-and-set on the next free slot | one claim and one start per attempt, one outcome per slot, objects and seeds never rewritten | the guard hook in each tool call (takes no lock, `guard-hook.mjs`:6), the fence and commit under L1; no hold | nothing held; a temp file may remain; sleep: no effect | compare-and-swap on an empty slot (lecture 9 notes, sec. 4, latch-free hash table); D3-10 (`SM`:56); one protocol for all writers of a name (SQLite, how to corrupt, 2.4): all use exclusiveWrite (`guard-hook.mjs`:376) [r] | no; D15's window and A13 (fixed by 0b) on record | none | 0 |
| L6 | hb `lib.mjs`:1599-1647 appendLedger, :1010-1019 appendRaw | append, fsync, hash chain checked at each append, torn tail cut, under L1 | order and integrity of the run's events | L1's holders | a torn tail is cut at the next append [r] | write-ahead log (D2-03); A12 (two stores, no joint commit) | no (as a lock); A12 on record | none here | 0 |
| L7 | hb `lib.mjs`:4054-4063 startLeaseExpired | a lease on two clocks: ticks >= start + 10 and wall >= at + 600 s (thresholds) | a start record against a session that never claims | the hook's claim against the lease act | expires on both clocks; ticks stop in a sleep, so a sleep alone cannot expire it [r] | leases (x19-0400, summary only); Chubby's lock-delay bounds a dead holder (sec. 2.4) | no; D18 (a record that does not parse never expires) on record | none | 0 |
| L8 | `research-tree/tools/lane.mjs`:46-70 tryAcquire, :26-27, :44, :60, :62, :65, :78-79 | `mkdir slot-<i>`, then `owner.json` written in place; stale = pid not alive (`process.kill(pid, 0)`, pid only), or wall age over 26 min [c: (1500 + 60) s], or owner unreadable and folder over 15 s old; break = recursive `rmSync` with no re-check | at most `capacity` heavy commands at once: 4 now, clamped to 1-4 (`research-tree/lane/capacity.txt` in both checkouts, set by commit 372d5b97, 2026-11-19) | builders', refuters' and landers' test commands; two at once in 41 of 324 min (c1-0101, measured at capacity 2); hold s to 25 min | slot stays until the pid is dead; a reused pid holds it up to 26 min (D10); sleep: the wall age counts the sleep, so a waiter can break a live holder after a long sleep [r :60] | a counting semaphore; the course's latches are in-process; SQLite does cross-process exclusion with OS file locks (locking v3, sec. 6.0) | **yes** (D10 on record; the sleep break new): two waiters that judge one slot stale can each remove it, the second deleting the first's fresh slot (b1-0103, c1-0105), so more commands than slots run; load only, no data harm. A second fault on record (b1-0102, c1-0105): after the count is lowered, a holder of a higher slot is not counted (:47-48 try only the slots below it) | the run lock's checked break, judged by pid and start time, no wall age (sec. 3, F4); or OS-freed slots after the test | 8.6-21.5 M alone [e: sec. 3, a guessed fraction of one unit]; in L1's 43 M with the OS lock |
| L9 | hb `research-tree/tools/land.mjs`:163-183 (release :171 checks its own pid) | as L8: `mkdir land.lock` + `owner.json`; stale = pid dead, age over 3 h, or unreadable and over 15 s; break `rmSync` | one landing at a time on `build` | landers: one by design; hold minutes | as L8 | as L8 | no in our use (one lander); D21 on record ("remote, since the design has one lander", FAULTS.md:138) | the checked break when a second lander is planned | in F4's |
| L10 | main `.claude/hooks/plan-gate.mjs`:478-497 (lock, unlock), used at :148 (Agent start) and :188 (SendMessage); hb :321-340 the same | `mkdir plan-gate.lock`, an empty folder that names no holder (:482); stale = folder mtime over 5 s: rename to a unique name, remove (:487-489, "only one waiter wins the rename"); wait up to 8 s at 25 ms; release `rmdirSync` with no owner check (:497); the `allow` append re-checks nothing (:159, :202) | the count of running helpers, the width and same-unit checks and the `allow` line, so parallel starts are counted (`plan-gate.test.mjs`:318: four starts in one message give three allows) | the PreToolUse hooks of one build session's Agent and SendMessage calls, up to the starts in one message; hold "well under a second" (:40), git runs before the lock (:143, :366) [r] | broken 5 s after a death; a pause over 5 s inside the hold (antivirus, paging, a sleep) lets a waiter in beside a live holder, whose unlock then removes the new holder's lock | the course's lock manager records who holds which lock (lecture 16 notes, sec. 1); our release does not ask | **yes** (new; not in FAULTS row 15): W1 and W2 both see the lock stale, W1 renames it and makes a fresh one, W2's rename then takes W1's fresh lock away, since a rename takes whatever has the name; result: two allows, a duplicate helper (a builder unit is 32.3 M, r57-0173) or a batch above its width; probability low [e]; not in force in the research run (RUN `.claude/settings.json`: tier hook and record guard only) [r] | the run lock's checked break with a holder record {pid, start time, nonce}, judged by pid and start time, not by age, within the hook's 8 s wait (:41); release only on a nonce match; a last nonce check before the `allow` append narrows the window and is not a fence (sec. 3, F3) | 8.6-21.5 M [e: sec. 3, a guessed fraction of one unit] |
| L11 | RUN `tools/gate.mjs`:39-55 (running = START lines, done files, transcript scan), :14 (append), :79 (START, the last line) | check, then append a line to `run/usage.log`; no lock | the cap and both meters: no start whose reserve does not fit (`RUN-INTERFACE.md` "The scripts"; r57-0414) | the run's coordinator, the only caller (`RUN-COORD.md`:39); its brief, written after this check, joins several gate calls by `&&` in starting order, so they run one after another (`RUN:briefs/COORDINATOR.md`:39-41, :193); two at once only if it issues separate Bash calls in one message and those run together (not known, sec. 5; `RJ`:983 is the design's premise that they can); the window from the log read to the append includes the scan of every transcript, seconds [e] | a unit whose helper dies without `RETURN.md` or its done file counts as running and its reserve (expected less used, :56) stays counted (:44-55) until the unit is restarted (a restart's own gate skips the unit, :55; restarts: `RUN:briefs/COORDINATOR.md`:101-107); a unit ended without `RETURN.md` keeps it to the run's end and holds later starts (the safe side): a slot without a lease; sleep: no effect | write skew; the course: locks make the schedule serializable (lecture 16 notes, sec. 1) | **yes** (new), a flaw of the code, safe only while its caller is serial: if two gate calls overlap, each misses the other's START and both start; two fields at once pass the cap by up to 117.7 M and the all-models meter by up to 1.90 points [c: 117.7 / 62], three (the width) by up to 235.4 M [c: 2 x 117.7] (`RUN:run/config.json`: f2-f8 expected 117.7 M each, closing 127.4 M, `m_per_point_all` 62) [r] | test-and-set: each decision written once by exclusive create to slot n+1, no lock held; an `END` record releases a dead unit's reserve (sec. 3, F1) | 8.6-21.5 M [e: sec. 3, a guessed fraction of one unit] |
| L12 | RUN `tools/shuffle.mjs`:43-48 | plain overwrite (`writeFileSync`) of `score-in/review-1.md`, `-2.md` and `sealed/f<n>-arms.json` | the blinding key: which review is which | one writer; a repeat for one field (a retry after a crash) | a repeat that crashes between the reviews and the key leaves reviews and a key of different shuffles [r :43-44 order]; on a first run a crash leaves reviews and no key, and the retry writes both anew | write-once by exclusive create (D3-10; the tree seals its seeds so, `check-queue.mjs`:462) | **yes** (new, small): a second shuffle rewrites the key; scores of the first pair would be mapped to the wrong arm [e] | the key made once by `wx`; on a repeat the reviews rewritten in the key's order, never re-keyed; refused only when the files given differ from the key's `from` (sec. 3, F2) | on F1's route, smaller than F1 [e: sec. 3] |
| L13 | RUN `tools/wait.mjs`, `tokens.mjs`; `RUN-INTERFACE.md` "Returns" | a file's existence as the done signal; `DONE.md` written last, after the commit | that a unit's outputs are complete | one waiter per file | a waiter sees only files that exist | commit record written last (D3-09; FAULTS B10) | no; `gate.mjs`:48 takes `RETURN.md` as a field's end, before its commit: a reserve freed a moment early [r] | none needed | 0 |
| L14 | `research-tree/tools/av-watch.ps1`:45-60 (comment :21-22) | OS share-mode lock: `<log>.lock` held open with FileShare.Read for the run; a second opener gets a sharing violation and exits | one copy per log; no data | a second copy started by hand; hold hours | the OS closes the handle at death; kept across a sleep | as SQLite on Windows (locking v3, sec. 6.0); its risks are network file systems (how to corrupt, 2.1), not a local disk | no | none | 0 |
| L15 | `.claude/hooks/tier-hook.mjs`:16, `library-start.mjs`:41, `plan-gate.mjs`:46 (start and end lines outside its lock), hb `record-guard.mjs`:41-42; `lane.mjs`:42; `land.mjs`:95, :225 | one line appended per call in append mode, no lock, several hook processes at once | the lines of logs; the plan gate's start and end lines decide "running" | every session's hooks | a torn or glued line if two appends interleave | none read | **not known**: whether one-line appends from several processes interleave on this NTFS (sec. 5) | if they do: append under the gate's lock, or one file per event | - |
| L16 | RUN `CLAUDE.md`:42-44 (rule 7, written after this check): every session and helper commits in `RUN:`'s one git after each step, its own paths only; "If git reports `index.lock`, pause once (one wait) and try again" | git's own locks: `.git/index.lock` and the branch's ref lock, taken by exclusive create and never broken by git | the run's git index and branch | the coordinator and the helpers of up to three fields; held well under a second per commit [e] | a git killed mid-commit leaves `index.lock`, and every later add and commit in the run fails until it is removed by hand; one pause covers contention, not that; an app restart kills running helpers (r57-0118, `RUN:CLAUDE.md`:44); sleep: kept | an exclusive-create lock with no stale break: lecture 16's lock table dies with its holders, git's lock file does not | no for data (rule 7 writes files before committing them); a liveness gap of the kind of L1's A11 (new) | none proposed; sec. 4 sends it as data | 0 |

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
   second latch against the order "must support a "no-wait" mode" [q]. Carries over and holds. There are two nested
   takes, in opposite orders: the watcher holds `watcher.lock` for its life (hb `watch.mjs`:859) and takes `run.lock`
   inside it, waiting up to its retries (hb `lib.mjs`:4329-4334); the breaker holds `run.lock` and never waits on
   `watcher.lock` (`breakStep`, :4336-4350; `breakStale` has no wait). The one against the order (`run.lock`, then
   `watcher.lock`) never waits, which is the course's no-wait mode: no deadlock.
5. **The lock table dies with its holders.** Lecture 16 notes, sec. 1 (page 1): a central lock manager grants locks and
   keeps a table of holders and waiters; "The DBMS's lock-table does not need to be durable" [q cmu-notes-16], since every
   transaction still running at a crash is aborted. Carries over, and it is the one that matters here: our lock records
   are files that survive their holders, while nothing tells a waiter that a holder died; hence the stale breaks, the
   PowerShell judgement (L1, L2) and the timers (L8-L10), and the run's git `index.lock` has no break at all (L16). The
   only lock table on this PC that is cleared when a process dies is the kernel's. Lock-manager features (modes, a
   first-come queue, deadlock detection, intention locks) serve many objects held for a transaction's length; each of
   our locks covers one object in one mode, and the tree's long ownership (an attempt, hours) is not a held lock but an
   epoch checked at the resource (L4).
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
   lock moves to the new form at once. Where SQLite relies on the OS freeing a dead holder's lock is locking v3, sec.
   4.0-4.1: a crashed writer's journal is hot, to be rolled back by the next process, only when no RESERVED lock is
   held; how to corrupt, sec. 8.8, records a race in exactly that recovery on Windows (two processes opening a crashed
   writer's file at once), present since 2004 and fixed in SQLite 3.7.16.2.
9. **Fencing after a lock is lost.** Burrows 2006, sec. 2.4: a holder may send a request and fail; another may take the
   lock and act before the old request arrives; Chubby therefore hands out a sequencer (lock name, mode, generation
   number) that the receiving server checks, and a lock-delay of up to a minute for servers that cannot check. Carries
   over and is built: L4's epochs and L1's nonce check before each write are sequencers checked at the resource. Chubby
   also rejected mandatory locks (same section), so advisory locks with checks at the resource are the proven form.

## 3. Each flaw's replacement in detail

Costs. Each replacement below is invariant-sensitive code ("fence, claim, lock, ledger, planner, hook": `build-invariant`
in `.claude/hooks/tier-routes.json`:12), so it is built on Opus and reviewed by a blind Opus refuter. One such fix unit
measured a builder 32.3 M (quartiles 18.5-38.0) and a refuter 10.6 M (10.0-13.4), 42.9 M in all (28.5-51.4) (r57-0173;
FAULTS.md:224-225). A small change is put at 0.2-0.5 of one unit, a guess on no record: 8.6-21.5 M on the medians,
5.7-25.7 M across the quartiles [e: 0.2-0.5 x 42.9 M; 0.2 x 28.5 M to 0.5 x 51.4 M]. Every cost here is an estimate.

- **F1, `gate.mjs` (L11), before the research run.** Recommended: test-and-set by exclusive create, the proven form for
  a check-then-act race (D3-10, `research-tree/SELECTIONS-MAP.md`:56; FAULTS.md:72), used whole as the outcome slots use
  it (L5; hb `lib.mjs`:703-766, :3993-4013). The gate reads the n decisions on record, decides, and writes its decision
  once, by exclusive create, to slot n+1; a taken slot means another gate decided in between, so it reads again and
  decides again. No lock is held, so a killed gate leaves nothing to break and a sleep changes nothing. Add one record
  kind, `END <unit>: failed|stopped`, written the same way by the coordinator for a helper that will not return, so its
  reserve is released. Removes: a cap or meter passed by up to one unit's reserve when gate calls overlap. Risk: small;
  one test of two gates at once. Cost 8.6-21.5 M [e]. The coordinator's brief now runs gate calls in turn (`&&`,
  `RUN:briefs/COORDINATOR.md`:39-41, :193); that rests on a model's obedience, which the design does not rely on
  (`SM`:11, D1-01), so the change in the code stays.
  Rejected: version 1's form, an exclusive lock `run/gate.lock` broken when `process.kill(pid, 0)` says its holder is
  gone. It adds a held lock with a pid-only stale rule, which is the lane's fault D10 (FAULTS.md:127) without the lane's
  age bound: a dead gate whose pid is reused holds every start as "gate busy" until someone removes the file, and most
  lock faults on record sit in stale breaks (sec. 2, item 5). Its cost, 2-4 M on Sonnet, was the run scripts' figure,
  not the tier route's.
- **F2, `shuffle.mjs` (L12), before the run.** Create the key `sealed/f<n>-arms.json` once, by `wx`; on a repeat, read
  the key and rewrite the two reviews in its order, so a redo finishes and never re-keys (log first, D2-03; idempotent
  redo, D1-07); refuse (`REFUSED f<n>`, exit 2) only when the files given differ from the key's `from`. The key holds
  the order (`shuffle.mjs`:44-47, `from` and `argument` per review) and `scrub` depends on the file alone (:13-28), so
  the reviews can be rebuilt from it. Rejected: version 1's key first with a refusal whenever it exists: a crash after
  the key and before the reviews leaves a key, no reviews and every retry refused, and `RUN:CLAUDE.md`:48-49 (rule 10)
  lets only the planted helper and `shuffle.mjs` write `sealed/`, so no helper may clear it and the field stops.
  Removes a silent re-key. Cost: on F1's route, smaller than F1 [e]; version 1's 1-2 M was a Sonnet figure.
- **F3, plan gate (L10), after the pilot.** The run lock's checked break (R1; `RJ`:955): the lock holds a record {pid,
  start time or creation stamp, nonce}; a stale lock is judged by its holder's pid and start time, not by age (as F4
  says for the lane), within the hook's 8 s wait (:41); a waiter that judges it stale renames it to a unique name,
  re-reads it and proceeds only if it is the record it judged, else renames it back; release only on a nonce match. The
  holder re-reads its nonce just before the `allow` append: a last check that narrows the window, not a fence, since
  `plan-gate.jsonl` is a plain append that tests nothing (:46), and a fence is tested by the resource (Burrows 2006,
  sec. 2.4). Removes the double break and the cascade, and with the age rule gone a live holder paused over 5 s is no
  longer broken. Cost 8.6-21.5 M [e]; the lock test at `plan-gate.test.mjs`:325 extends.
- **F4, lane (L8), after the pilot.** As FAULTS row 16 says (FAULTS.md:246): first the checked break; judge by pid and
  start time, not pid alone; drop the wall-age rule (or keep it only as an alert); publish a slot with its owner record
  in one step (make the folder under a temp name with `owner.json` inside, then rename it to `slot-<i>`). Cost 8.6-21.5
  M alone [e], or inside the 43 M unit below.
- **P-OS, the page's proposal (FAULTS row 1, FAULTS.md:231; `research-tree/build/reports/complexity.html`:389).** Judged
  by the sources, a lock the OS frees at its holder's death is not the misuse the course warns about (reasons 1-3); it is
  reason 5 applied to processes, and it is where SQLite relies on the OS (locking v3, sec. 4.0-4.1; reason 8). In plain
  Node the form is a named pipe held by the holder (a second `listen` on the name is refused at once; the OS closes it
  at death). It would delete the PowerShell judgement and the stale breaks, and A11, D10 and D21 with them. It does not
  replace the fences (reason 9): nonces and epochs stay. Nor does it clean up: the next holder still finds whatever a
  dead holder half did (the ledger's torn tail, temp files, a half-made slot), and that clean-up stays under the lock.
  Its risks are facts of this PC, to be measured first by its small test (FAULTS.md:255, :327; it needs the owner's
  word, CLAUDE.md rule 3): freed at a hard kill; not inherited by child processes (the watcher spawns intake); not
  blocked by the antivirus; two waiters reaching a dead holder's lock at once (the test has them do so; the race SQLite
  fixed in 3.7.16.2, how to corrupt, sec. 8.8); and all parties of one lock switched at once (reason 8). A hung live
  holder is never freed, as with today's files. Cost about 1 unit, 43 M (28.5-51.4 M) with the lane [r FAULTS.md:231;
  e]. Order: after the pilot, after its test.
- **The page's other OS proposal** (`complexity.html`:350, :394): the OS's file protection for evidence (read-only and
  append-only rights, the owner's setting). It is an access right, not a lock, and none of the eight sources speaks
  against it.
- **P-DB, an embedded database as the lock manager** (the brief's third example): SQLite would give transactions across
  `tasks.json` and the ledger (A12's case) with its own lock states on OS locks. Not indicated: the run lock and the
  fences are sound, the flaws are small side locks, and it would rebuild the 4,501-line library every script uses
  [m: `wc -l`], several units [e: 3-5 x 42.9 M = 129-215 M]; whether Node 24's built-in `node:sqlite` is stable is not
  known [e].

## 4. Bears on top session 5's run scripts

The text the locks session sends to top session 5 as data (brief `LOCKS.md`, rules); it asks for no change:
"L11: `RUN:tools/gate.mjs` reads `run/usage.log`, decides and appends START (:14, :39-79) with no lock: two calls at
once miss each other's START. `RUN:briefs/COORDINATOR.md`:39-41 joins gate calls by `&&`, so they run in turn; separate
Bash calls in one message might overlap. Size (`RUN:run/config.json`): two at once pass the cap by up to 117.7 M (1.90
points of the all-models meter), three by 235.4 M. A unit that ends without RETURN.md and is not restarted keeps its
reserve to the run's end, holding later starts (`gate.mjs`:44-56). L12: `RUN:tools/shuffle.mjs`:43-47 rewrites the key
`sealed/f<n>-arms.json` on a repeat; refusing a second key is no cure: a crash just after the key would stop the field,
as `RUN:CLAUDE.md`:48-49 lets no helper clear `sealed/`. Git: a git killed mid-commit leaves `index.lock` and every later
commit fails; `RUN:CLAUDE.md`:44's one pause does not clear it. See `H:research-tree/build/LOCKS.md`, sections 1 and 3."

## 5. Not known, and what would measure it

- Whether two Bash calls in one message run at the same time (the design assumes so, `RJ`:983). Since the coordinator's
  brief joins gate calls by `&&` (`RUN:briefs/COORDINATOR.md`:39-41, :193), this decides whether L11 can be reached at
  all: only if the coordinator issues separate gate calls in one message. The measure: two `gate.mjs` calls in one
  message against a scratch run root with `GATE_NOW`, each line stamped at start and end (a test: the owner's word first).
- Whether one-line appends from several processes interleave on this NTFS disk (L15): N processes appending M lines to
  one file, then a count of bad lines (a test).
- Whether a named pipe held as a lock is freed at a hard kill, refuses a second holder, is not inherited by spawned
  children, and stays with one holder when two waiters reach a dead holder's lock at once, on this PC (P-OS;
  FAULTS.md:255, :327): the small test, after the owner's word (CLAUDE.md rule 3).
- Whether `process.uptime()` counts a sleep on this PC: it sets the start time the run lock records (hb `lib.mjs`:1220-1225;
  a backward clock step over 2 s before a process's first lock could misjudge a live holder [e]): compare before and
  after one sleep.
- How long the run lock is held and waited for in real use: never measured (`DR`:85, "lock contention not measured");
  the ledger's line times in the pilot would give it.
- The size of an L11 overshoot: answered after the check by `RUN:run/config.json` (00:12:03): up to 117.7 M and 1.90
  points of the all-models meter for two gate calls at once, up to 235.4 M for three (L11).
- Whether a hard-killed lane's command dies with it (Node may place children in a kill-on-close job) [e]: one kill test.

## 6. Not done after the fold

- From version 1: D15's window was not re-traced (taken from FAULTS); the slides were read only at the lines cited; the
  field briefs (`RUN:briefs/FIELD.md` and others) were not read, but for the review's search of FIELD.md for the gate;
  `RUN:CLAUDE.md` was read only at :40-50 (by the fold; the review cites :42-44 and :48-49).
- Not checked by the review: L4 and L6 beyond the lock checks on their write paths; L15's lines; protocol v2 R1 and R2;
  `DR`:64, :80, `RJ`:955, `SM`:11 (only `RJ`:983 and `DR`:85 were read); the slides beyond the three pages; the ~22 call
  sites of the run lock; the tree's tests; whether two Bash calls in one message run at once; what Node and Windows do
  with a named pipe as a lock (nothing on disk says).
- Not done by the fold: the findings were taken as the review states them (the locks session's decision), not
  re-checked; the fold re-read only the run lines it cites (`gate.mjs`, `shuffle.mjs` and `config.json` whole;
  `COORDINATOR.md`:36-48, :80-85, :101-107, :190-195, :236-239; `CLAUDE.md`:40-50), FAULTS.md:224-228, :231, :245-246,
  :255 and :327, `tier-routes.json`:12, r57-0173, r57-0608 and the SQLite section titles. F1's slot form, F2's redo and
  L16's gap are in no code and were not tested; nothing was run.
- The run's files may change again after the fold's reading (00:37-00:43).
- Tokens of the fold: 1.20 M over 9 messages (18 tool calls), context 203 K, before this edit [m: `tokens-self.mjs`
  "fold of the locks check": input, cache creation, cache read and output once per message id].

## Changes from version 1

Findings of the blind review (`research-tree/build/refute/LOCKS.md`), all accepted as the review states them:
1. Finding 1: sec. 0 item 2 now puts the OS proposals on the complexity page (two, neither built), not in the pilot plan, which takes no lock; sec. 3 adds the second proposal.
2. Finding 2: sec. 0 item 1 says which locks name a holder and re-check a number and which do not (the run's gate takes none); item 3: the control reason carries over, the cost reason does not.
3. Finding 3: L11 is a flaw of the code, safe while its caller is serial; its reach (`COORDINATOR.md`:39-41, :193) and size (117.7 M and 1.90 points for two, 235.4 M for three) in sec. 0, 1, 4 and 5.
4. Finding 4: F1 is now a test-and-set slot with no lock; version 1's lock form is listed as rejected with the review's reason; F1 and F2 moved to the build-invariant route; "3-6 M" withdrawn.
5. Finding 5: F2 makes the key once and redoes the reviews in its order, refusing only different files; L12's crash case is now a repeat's.
6. Finding 6: F3 and L10 judge a stale lock by pid and start time, not age, within the 8 s wait; the last nonce check is a narrowing, not a fence.
7. Finding 7: L16 added (the run's git `index.lock` and ref lock, sound for data, a liveness gap); 16 places; sec. 2 item 5 names it.
8. Finding 8: L8's capacity is 4 now, clamped to 1-4, and c1-0101's minutes were at 2; the second lane fault b1-0102 added.
9. Finding 9: the 0.2-0.5 fraction is marked a guess [e]; 42.9 M cited to FAULTS.md:224-225; the OS-lock test to FAULTS.md:255 and :327 with the owner's word, not r57-0506.
10. Finding 10: sec. 2 item 4 names both nested takes and their orders; the conclusion stands.
11. Finding 11: P-OS adds the dead holder's half-work, which stays with the next holder, and the two-waiter case to its test; locking v3 sec. 4.0-4.1 and how to corrupt sec. 8.8 cited in sec. 0, 2 and 3.
Decisions of the locks session (`research-tree/build/briefs/LOCKS-fold.md`):
12. Decision 1: sec. 0 rewritten from the corrected findings in 12 plain lines, the answer first.
13. Decision 2: counts over 16 places, flaw 4, sound 11, not known 1, with what the count counts (r57-0608); no verdict changed.
14. Decision 3: F1's slot form recommended and the lock form rejected; F2, F3 and P-OS as findings 5, 6 and 11; costs as Opus build-invariant work with a blind refuter, r57-0173's quartiles, marked estimates.
15. Decision 4: sec. 4's text rewritten in 8 lines: L11 with its reach and size, the dead unit's reserve, L12 with finding 5's caution, git's `index.lock`; each file and line named; no change asked.
16. Decision 5: the review's times of the run files given in sec. 1, with `COORDINATOR.md`'s later change (00:23:16) and that the run's files may change again.
17. Decision 6: sec. 6 lists what is still not done after the fold (version 1's items, the review's list, the fold's own); the header's LIMIT status replaced by version 2's line.
