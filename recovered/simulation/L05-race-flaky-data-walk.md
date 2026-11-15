# L05: failures that do not reproduce on demand, walked through the library

Pathway family: races, flaky or order-dependent tests, and causes in production data or timing.
Read-only walk. No fixes are proposed. "KS" means the knowledge-store design
(`.claude/worktrees/knowledge-store-research-9c609c/docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md`, v1.3.1).
Where KS has a mechanism for a step, it is named and the step counts as working.

Six cases, chosen to differ: a race in field code (L05-1), a hazard in production data (L05-2),
an unexplained hang (L05-3), chance in test data (L05-4), a second test process (L05-5), and a
test whose pass depends on timing (L05-6, added by me).

---

## 1. What I checked, and corrections to the collected cases

- **L05-1.** 76061e0 confirmed (3 Jul 2026, trailer "Claude Opus 4.8"). New: the 76061e0 rule
  itself became a door for C1. 8dafcec (30 Jul, Opus 5): "pending + online — the form opened blank,
  live-sent it, and sendOrQueue's removeItem then deleted the queued REAL completion." The same
  commit names the open race: "sendOrQueue never checks the `syncing` flag flushOutbox sets".
- **L05-2.** Confirmed (0046 docstring lines 7-24; HANDOFF:155-186; c731e66, Opus 5). It is KS
  worked example ex4 (KS §2.4, R-02). New later moment: O10-F7 (`docs/program/evidence/w2/O-10.txt:84`):
  "The dispatcher's stale-event guard keys on server insert time, so drained months-old writes count as fresh."
- **L05-3.** Confirmed at `linux-test-runner/task.md:218-221`. Model: claude-sonnet-5-5 (transcript
  `7b3031d3-...jsonl` lines 1152-1175, clinic worktree `unruffled-sammet`). New: four days earlier the
  faster-check session saw the same watchdog line with a known cause: "`loadfile` hangs after the
  replacement worker starts" (`faster-check/task.md:38`, `:65`).
- **L05-4.** Confirmed. The lead was Sonnet ("Session: Sonnet lead", `faster-check/task.md:3`;
  trailer "Claude Sonnet 5.5" on 6ac4577, 030c6cb, 8259fa3). New: the root (trailer "Claude Fable
  5.1") had already diagnosed the same cause in **44d115b at 01:20 +0500 on 6 Nov**, 3 h 46 min before
  the Sonnet session committed a wrong fixture (6ac4577, 05:06 +0500). The faster-check branch was cut
  from 1878b2f, before 44d115b.
- **L05-5.** Confirmed at HANDOFF:132-134 and 65c2c3b (Opus 5). The session that traced the 22
  failures is not on disk: the FixFlow transcript folder holds 7 sessions, all last written 12 Nov
  2026. The original error text is not recorded anywhere I found.
- **Sweep card A3-14's transfer line** ("FixFlow's Hypothesis/uuid-based fixtures should be audited")
  has a false premise. `grep` finds no Hypothesis import and no `uuid4().hex[:` in `backend/tests`,
  and FixFlow does not use pytest-xdist.
- **Added L05-6.** The clinic's socket-refusal retry and the time-based race harness. It shows a green
  test certifying the wrong property, which the five collected cases show less directly.

---

## 2. Case walks

### L05-1. Outbox: a live send races a queued flush on the same id

**Solving moment.** 3 Jul 2026, 76061e0 (Opus 4.8): a stale queued completion was replayed over a newer live send.

**Entry as the solver could have written it then (98 words).**
> Defect, mobile outbox. Symptom: a completion queued offline (v1) is replayed by the next flush over
> a newer v2 the tech sent live; the bill regenerates from the old form. Cause: `sendOrQueue` enqueues
> under a stable id (completion, negotiate, location, ready) and never removes the queued copy when a
> later live send succeeds. Fix: after a successful live send, `removeItem(item.id)`; `removeItem`
> saves and notifies only when something left the queue. Payments and notes use unique ids, so they
> never collide. Check: new case in `outboxSync.test.ts`. Footprint: `technician-app/src/lib/outbox.ts`, `outboxSync.ts`.

**Later moment A (30 Jul 2026, 8dafcec, Opus 5).** The session was closing C1 ("a blank completion
can no longer replace a real bill"). Its window held the handoff's C1 text, the completion screens
and the outbox. A lookup keyed on "queued completion lost" plus `outboxSync.ts` returns the 76061e0
entry. Its Jest case passes on HEAD, so for a solved entry the gate says `not_applies`: "this defect
is fixed here." The entry says nothing about a blank form being the live send. The session found the
deletion door by reasoning, not from any store. No transcript of it is on disk.

**Later moment B (Nov 2026, Wave-2 O-03).** A deep-dive agent reading all six queues filed O3-F15
("The two drains are unordered", `O-03.txt:181`) and wrote line 147: "Duplicates only arise through
the known flush/live race." A cheap implementer of O-03 item 8 ("Location outbox id per tap") then
edits `sendOrQueue` call sites. Nothing fails.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The task is a feature ("id per tap", "one drainAll"). The race is not a problem the model has. Only CLAUDE.md's always-loaded KNOWN DEFECT names it: the incumbent the library is meant to slim. |
| 2 Trigger | works | No error, so no escalation lookup. KS `--diff` (§7.2) matches author-named handles on changed lines. `sendOrQueue` and `flushOutbox` each changed in 2 of the last 150 first-parent commits on main, under the 5 % refusal line, so an outbox edit warns. |
| 3 Query | works | `--diff <base> --action "<phase Goal>"` is mechanical. The model does not have to choose words. |
| 4 Match | strains | Two entries look like one problem: 76061e0 "stale write over a newer send on one id: fixed" and the race "same id, concurrent flush: open". The fixed one reads as the answer to the open one. |
| 5 Delivery | works | One warning line per entry, in the main session and the PR's decisions journal. The Opus reviewer rules (KS §7.2). |
| 6 Use | breaks | The only stored fix is a rule: "on live success, drop the queued copy". 8dafcec shows that rule deleted a real queued completion when the live send was a blank form. Adapting it to a new stable-id kind copies the door. |
| 7 Check | breaks | KS §9 (line 516): "A race's footprint is identical between a good and a bad run." No test encodes this race. 76061e0's Jest case passes on every later tree, including trees where its rule destroys a bill. |
| 8 Failure, ladder | breaks | Nothing fails in a session. In the field the winner is "whichever request the SERVER happens to finish last" (`completionPrefill.ts:26-30`). No failure is seen, so nothing climbs. The finder in 8dafcec was code reading. |
| 9 Capture | strains | Written at solve time, 76061e0 would be stored with "never collide" true and the deletion unseen. The race has a diagnosis and no fix: KS kind `open_defect`, candidate only. |
| 10 Afterlife | breaks | The entry stayed true by its own test while, 27 days later, 8dafcec found it was a door, through screens outside its footprint (`CompleteJobScreen`, `completionPrefill.ts`). Footprint invalidation (KS §5.1) cannot see that. |

**Saved:** little. The `--diff` warning routes outbox edits to a reviewer, which CLAUDE.md already does.

---

### L05-2. Dispatcher cursor: a whole-history replay visible only in production data

**Solving moment.** 28 Jul to 2 Aug 2026, Opus 5: migration 0046, HANDOFF B1, c731e66.

**Entry as the solver could have written it then (104 words).**
> Trap, operator action. Symptom: none until `FIXFLOW_ENABLE_DISPATCHER=true`. Cause: `dispatch_cursor`
> has no row; `run_dispatch_once` mints one at `last_seq=0` and drains all of `job_event` as live
> WhatsApp messages. Measured on prod: 87 events, 36 triggers (24 complete, 7 ready, 5 create);
> pre-0043 `ready` rows have no `auto` key, so the auto guard passes them. `uq_customer_message_job_kind`
> makes the first decision permanent, even `suppressed`. Fix: 0046 seeds the cursor at `MAX(seq)`;
> a 2-day event-age skip covers a hand reset or an old snapshot; downgrade is a no-op. Check:
> `test_dispatch_integration.py`. Action handle: "enable dispatcher".

Before the 1 Aug review pass the same write-up would also have claimed the dead-letter guard stops a
wedge. HANDOFF:162-166: "The dead-letter guard was aimed at a statement that cannot raise ... the
consumer re-attempted the same event every 60 s **forever**."

**Later moment A (Nov 2026, Wave-2 O-10).** An Opus deep-dive agent auditing the offline drain asks
whether a late-landing write makes a job event the consumer would message (`O-10.txt:212`). It finds
O10-F7: the age guard reads `event.created_at`, set when the drained write lands. The entry's "second
lock" does not hold for drained writes.

**Later moment B (ship plan P4r/P4c).** A session moving hosts and closing the drain window.
`SHIP-PLAN-2026-11.md:102`: "The dispatcher stays OFF. The cursor is re-seeded at `T_close` and again
after every P4r". The window holds runbook steps, not a dispatcher problem.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The later tasks are a drain audit and a host move. Neither is "a dispatcher problem". The hazard is a state the next operator action meets. |
| 2 Trigger | strains | No error exists. KS reaches operator hazards "only" through the wording-based `action` handle (§3.3, line 263). `--diff` cannot see "state outside git (the dispatcher env flip ... database rows)" (§5.5). |
| 3 Query | strains | The entry's action is "enable dispatcher". The later sessions act as "drain", "restore", "re-point", "close the window". A hit depends on the writer having guessed those verbs. |
| 4 Match | strains | At best a candidate: an entry whose deciding state is prod data is "capped at candidate" (KS §3.4, `prod_db`). KS says ex4 is "candidate-only until its db_probe and a max_event_age unit test exist". |
| 5 Delivery | works | Main session, one card. |
| 6 Use | breaks | The stored fix is "seed at head; the age guard covers the rest". Both fail the new state: events pile up above the July seed while the dispatcher stays off, and drained writes pass the age guard (O10-F7). Re-running 0046's `ON CONFLICT DO NOTHING` insert does nothing when a row exists. |
| 7 Check | breaks | `db_probe` runs on "a throwaway Postgres migrated to head" (KS §3.4). It cannot count events above the prod cursor. The 36 came from a prod query. "Production data is not in git" (KS line 516). |
| 8 Failure, ladder | strains | The failure would be real customer messages, seen in no session. What must go up the ladder is a prod query result, which an operator runs, not a model. |
| 9 Capture | works | KS: the solving Opus writes before PR-ready and a different Opus approves (§7.3-7.4). That matches what happened: the review pass corrected the dead-letter guard, the downgrade and a CI-red test that "pinned the consent leak" (HANDOFF:157-158). |
| 10 Afterlife | breaks | The claim "enabling is forward-only" decays with prod rows that no footprint item sees (KS §5.5 names "the dispatcher cursor row"). The entry stays validated while the ship plan carries the live rule. |

**Saved:** little beyond the incumbents. The measured facts are valuable, but CLAUDE.md and the
ship plan already carry them.

---

### L05-3. Clinic native check hung at 96 percent; the rerun passed; cause unknown

**Solving moment of the only related entry.** 5 Nov 2026, faster-check session (Sonnet 5.5,
transcript `df1db0b9` lines 1326-1342): demo C showed a hang after a worker crash under `loadfile`;
the session chose `--dist load`.

**Entry as the solver could have written it then (95 words).**
> Gate trap, clinic check. Symptom: the parallel pass ends `no test made progress for 600s ... pytest
> and its workers were killed` after a worker died (`[gw4] node down: Not properly terminated`,
> `replacing crashed worker gw4`). Cause: under pytest-xdist `--dist loadfile` the run hangs after the
> replacement worker starts; under `--dist load` the crash is counted and reported at once. Fix:
> `DIST_MODE: Final = "load"` in `src/clinic/devtools/check.py`. Check: demo C, a test calling
> `os._exit(7)`: loadfile hangs to the watchdog (754 s), load fails in 274 s.

**Later moment (9 Nov 2026, linux-test-runner session, claude-sonnet-5-5, `7b3031d3` lines
1152-1175).** The session was measuring runs on bc572f6 for its record. Its window held the m1 log
tail: dots to 96 %, `== pytest parallel: exit 1, 961.0s`, and `parallel pass: no test made progress
for 600s (a hung test, a worker, or one test longer than that limit)`. Its grep for
`crash|node down|Error|retried` found nothing else. Line 1161: "I'll rerun native once more, and if it
hangs again, I'll dig into it. I still can't tell which test hung." The rerun passed (645 s including
a 169 s lock wait). Line 1175: "Native run passed on retry (the earlier one stalled)."

**A lookup keyed on the watchdog line** returns the 5 Nov entry by exact template. Verify reads
`DIST_MODE: Final = "load"` (check.py line 85 at bc572f6) and returns `not_applies`.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | The failure is in the window, mid-task, as a log tail. |
| 2 Trigger | works | KS §7.2: "A cheap agent that hits an unexpected error in a gate looks it up before retrying." |
| 3 Query | strains | The query is the watchdog line. What may matter is not in the log: "the heartbeat watchdog reports no test id"; low memory and "heavily loaded by other sessions" sit only in separate load samples (task.md:221). |
| 4 Match | strains | Exact template hit on a different cause: no worker died and the mode is already `load`. KS flags a template ambiguous only "when more than one cause is recorded or known"; on 5 Nov one was recorded, though the message itself names three. |
| 5 Delivery | works | Main session. |
| 6 Use | strains | Nothing to adapt. The entry's only use is to rule out one cause. The model then does what it did without a library: rerun. |
| 7 Check | breaks | The gate's `not_applies` is right. But the only verdict on the failure is the rerun, and KS takes `ks outcome` "from the re-run of the original failing command" (§7.1). It passed with no fix, so "resolved" is recorded for nothing. |
| 8 Failure, ladder | breaks | Escalating hands up the same silence: dots and one watchdog line, no test id, no stack, and the machine state is gone. Opus or Fable gets no more evidence than Sonnet had. |
| 9 Capture | breaks | Nothing was solved, so nothing is written. KS: "open defects without a diagnosis stay owned by G2 and the plan" (§7.3). The record says "its cause is not known". The next stall starts from zero. |
| 10 Afterlife | strains | The 5 Nov entry stays validated and matches every stall's exact line. Each stall without a crash pays a lookup and a `not_applies`. HARNESS-BOTTLENECKS:427: flaky tests "can fail a base rerun for the wrong reason". |

**Saved:** nothing. **Prevented:** a wrong reuse of the `loadfile` fix (the gate held).

---

### L05-4. Clinic random hex tags cause chance failures in the gate

**Solving moments.** (a) 5 Nov 20:20 UTC, root (Fable 5.1), 44d115b: right diagnosis, masking fix.
(b) 6 Nov 00:06 UTC, faster-check (Sonnet 5.5): wrong sequence fixture 6ac4577, reverted by 030c6cb at
00:18 UTC after the second Opus review. (c) 6 Nov 03:03 UTC, 8259fa3 (Sonnet 5.5): FC-09 source fix and guard.

**Entry as the root could have written it at (a) (100 words).**
> Flaky test, clinic withholding tests. Symptom: S09/S07 attack tests fail by chance with a list of
> (role, path, figure): a difference of two numbers on a page equals a hidden amount. Cause:
> `numbers()` reads record ids, the CSRF token and the fixtures' random hex tags (`SYN-TILL-77003a`,
> `SYN Till 770031`, `syn-viewer-123456`) as figures. Seen twice: the cutoff-guards session and main.
> Fix: both `numbers()` helpers strip those before reading figures; a unit test pins what is read and
> ignored. Source fix (letters-only tags) deferred. Footprint: `finance/tests/test_money_withholding.py`,
> `reporting/tests/test_gate_round1.py`.

**Later moment (faster-check session, claude-sonnet-5-5, `df1db0b9`).** At 23:00 UTC run 12 failed:
`AssertionError: [('stock_coordinator', '/overview/money/', 403, '654300')]` at
`reporting/tests/test_access.py:193` (line 1369). The model first suspected a random token, then
misjudged the odds. At 23:49 UTC a second failure, `('finance_operator', [77003])` in
`test_money_withholding`. Line 1547: "A 5-digit match from random hex is vanishingly unlikely, so I
suspect the numbers come from database sequences". Line 1582: "it rests on an assumption I haven't
verified yet". Line 1629: "Test results are passing with the sequences normalised." It committed
6ac4577. The second Opus review refuted it. Line 1666: "I was wrong about the cause: the models use
UUID primary keys".

**A lookup** at 23:00 keyed on `test_access.py` likely misses: the root's footprint is two other files,
and the canonicaliser masks the digits. At 23:49, keyed on the `test_money_withholding` test id, the
frames handle hits the root's entry (its commit even names `SYN-TILL-77003a`). The branch lacks
44d115b, so the result is a candidate. KS's candidate contract shows "summary and UNVERIFIED
negatives, no fix without applies". The summary names the cause.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | The task is speed. The failure is in the window as a run-log line. |
| 2 Trigger | works | Unexpected gate error, lookup before retry (KS §7.2). |
| 3 Query | strains | The canonicaliser masks "hex runs, ids, free numbers" (KS §4.1). The coincidence between a figure and a hex tag is the only clue, and masking removes it. The match has to come from the test id. |
| 4 Match | works | At 23:49 the test-id frame hits the root's entry. At 23:00 (`test_access.py`, outside the root's footprint) a miss is likely. |
| 5 Delivery | works | Main Sonnet session. |
| 6 Use | strains | The candidate shows the cause, not the fix. The root's fix is half right: the FC-09 review found `NOT_FIGURES` "would hide `SYN Till 654321 moved`" (task.md:224). Adapting it to `test_access.py` spreads a mask that hides real figures. |
| 7 Check | strains | A planted-tag unit test turns the chance into a repeatable check (the root's pinning test; FC-09's `test_no_hex_tags.py`), so a control pair can flip. It proves the condition, not that today's failure came from it. The session's own check of its wrong idea was passing runs. |
| 8 Failure, ladder | strains | A strong model caught the wrong hypothesis: the second Opus review. The same review approved "0.05 s per attempt" for the retry, still over the 0.6 s window (L05-6). |
| 9 Capture | strains | Three writers, three fixes for one cause in about 7 hours. "Store when solved" would have stored 6ac4577 at 00:06 ("passing"). KS's review-before-approve would have caught it, but KS's write trigger would likely skip the root's routine fix. |
| 10 Afterlife | strains | In-project, FC-09 moved the lesson into a repo test that fails at merge naming `random_tag` (task.md:255), so the entry becomes redundant (KS D17). Cross-project, A3-14 tells FixFlow to audit "Hypothesis/uuid-based fixtures" that FixFlow does not have. |

**Saved (if the root's fix had been stored):** the sequence-reset detour. That is commit 6ac4577 and
its revert, full runs started on the wrong fixture and stopped, and an Opus review spent on a
pointless fixture.

---

### L05-5. FixFlow: 22 phantom failures from two pytest runs on one database

**Solving moment.** Before 28 Jul 2026, recorded by Opus 5 in 65c2c3b (HANDOFF §2.4). The tracing
session is not on disk.

**Entry as the solver could have written it then (72 words).**
> Trap, FixFlow backend tests. Symptom: many integration tests fail together (22 in one run) with no
> code change behind them; a lone rerun passes. Cause: two pytest processes ran against one
> `FIXFLOW_TEST_DATABASE_URL`; each conftest runs `Base.metadata.create_all`, which takes an
> AccessExclusiveLock, and they deadlock. Fix: never run two pytest processes against that database
> at once. Check: none; the cause is which processes were running at that moment.

**Later moment (cross-project: clinic, 6 Nov 2026).** The root's gate round on the check slots
raised FS-02 (`faster-check/task.md:347`): "The same checkout checked twice at once got two slots and
shared one set of test databases (`autoclobber` lets one drop the other's)." The Sonnet session was
building slots that let two checks run at once by design ("the lock lets up to 2 checks of this
repository run their tests at once", `7b3031d3`:1152). A cross-project lookup "two checks share test
databases" would return the FixFlow trap as a candidate. Its rule contradicts the clinic's design, and
its mechanism (a create_all deadlock) is not the clinic's (dropped databases, fixed with per-checkout
names, FC-04, and a checkout lock, FS-02).

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | In FixFlow: a test run with 22 red tests. The failure is in the window. |
| 2 Trigger | works | Unexpected gate error, lookup before retry. |
| 3 Query | breaks | 22 failures carry 22 test ids and lock errors. The deciding fact, a second pytest process from another session, is in no log the failing session holds. |
| 4 Match | strains | A deadlock or lock-wait template has many causes. KS: an ambiguous template "never makes a lead alone". At best a candidate through the `ctx` handle. |
| 5 Delivery | strains | In FixFlow the test runner is often a subagent in a worktree (HANDOFF §2.5). Its window starts empty and cannot see the sibling agent that holds the lock. |
| 6 Use | strains | The fix is a rule about other sessions. The failing agent cannot stop the other process; it can only rerun alone. |
| 7 Check | breaks | Process state at the moment of failure is gone once the other process exits. No check, no control pair. |
| 8 Failure, ladder | strains | It was "once traced" (HANDOFF:133-134). What the trace cost is recorded nowhere, and the session is gone. |
| 9 Capture | works | KS seeds HANDOFF traps as trap entries (R-01a: "HANDOFF 13 traps"). A one-line rule is cheap and true in FixFlow. |
| 10 Afterlife | breaks | In the clinic, "never run two at once" contradicts the designed two slots and misses the clinic's different mechanism. KS is FixFlow-only, so cross-project behaviour is not specified. |

**Saved (in FixFlow, entry present):** a cheap model seeing many lock failures at once gets "rerun alone" instead of debugging 22 tests.

---

### L05-6 (added). Clinic socket-refusal retry and the time-based race harness

**Sources.** `faster-check/task.md:46`, `:105`, `:344`; `clinic-build/task.md:707`; commits dd74a3d,
030c6cb, 0a56a77, 11e00dd; `faster-check/evidence/review-opus-round2.md:8`.

**Solving moment.** 5-6 Nov 2026, Sonnet 5.5 (dd74a3d 23:26 UTC; 030c6cb 00:18 UTC). 2 of 22 full
runs failed in the serial race pass with a Windows socket refusal.

**Entry as the solver could have written it then (108 words).**
> Gate flake, clinic check on Windows. Symptom: the serial race pass fails with `psycopg.OperationalError:
> ... port 55450 failed: No buffer space available (0x00002747/10055)` on the loopback connect; 2 of 22
> runs, both in race tests. Ruled out: ephemeral-port exhaustion (TIME_WAIT peak 352 on the DB port).
> Cause: not identified; inferred transient machine pressure. Fix: `connect_retry.py` retries
> `psycopg.connect` up to 6 times, only for that message. Safety: the refused connection never reached
> the server, and the delay is 0.05 s per attempt, well under the race harness's 0.6 s window, so a
> retry cannot make a call look blocked. Check: unit tests; 17 later runs without a retry.

**Later moments.** (A) The root's gate (FC-01, `clinic-build/task.md:707`): "The connection retry
sleeps 0.05 s times the attempt (up to 0.75 s in all), longer than the race harness's 0.6 s
observation window". (B) FS-01 (`faster-check/task.md:344`): "With two checks at once a race test
could pass with a broken lock", because "a merely slow second call ... read as 'blocked'". (C) Any
later session on this PC that meets 10055 (A3-10 says FixFlow's pytest on the same Docker setup pays
the same port path).

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | A full-check log with a refused connect in a race test. |
| 2 Trigger | works | Unexpected gate error, lookup before retry. |
| 3 Query | works | The error line is exact and distinctive: `No buffer space available (0x00002747/10055)`. |
| 4 Match | works | Exact template, one cause recorded: a clean hit. |
| 5 Delivery | works | Main session. |
| 6 Use | strains | Copying the retry copies a hidden coupling: its total delay against another test's timing window. Neither the words nor the footprint of the entry name that coupling. |
| 7 Check | breaks | The retry's unit tests pass. The safety claim had no test until FC-01. The race tests it protects passed under load "with a broken lock" (FS-01). A green check certified the wrong property. |
| 8 Failure, ladder | breaks | Sonnet wrote the claim. The Opus review (round 2, item 2) found the 0.25 s problem and approved "0.05 s per attempt", still 0.75 s in total. The Fable root caught it at gate. Every rung paid, and the middle rung endorsed a wrong fix. |
| 9 Capture | breaks | Written at solve time, the entry stores the false safety sentence the record carried: "it cannot make a second call look blocked by itself" (task.md:105). |
| 10 Afterlife | strains | Fixed in place within hours (FC-01: flat 0.02 s and any serial retry fails the step; FS-01: "blocked" needs a lock wait in `pg_stat_activity`). An entry written at 030c6cb must be superseded, and KS supersede needs an Opus actor plus a second Opus approver. |

**Saved:** a first-time hit on an exact error, and the stored negative result (port exhaustion ruled
out) saves a re-measurement.

---

## 3. Breaks, clearest first

1. **No repeatable check for a cause that does not reproduce** (step 7; new; L05-1, 2, 3, 5, 6).
   The gate needs a check that reads PRESENT at a failing commit and ABSENT at a fixed one. A race, a
   hang under load, a second process, a prod row and a timing window give no such flip. The entry
   stays a candidate or carries a check of something else. KS line 516: "A race's footprint is identical
   between a good and a bad run; production data is not in git."
2. **A rerun passes whatever was done** (steps 7-8; known #22; L05-3, 4, 5, 6). The rerun is the only
   verdict, and it passes with a wrong fix or no fix. KS takes the outcome "from the re-run of the
   original failing command". `df1db0b9`:1629: "Test results are passing with the sequences normalised"
   (a wrong fix).
3. **A verified fix was half right and opened the next defect** (steps 6, 10; known #8, #21; L05-1, 2,
   4, 6). The rules were: drop the queued copy (it deleted a real bill), 0.05 s per attempt (0.75 s in
   total), the age guard covers the rest (drained writes look fresh), mask hex tags in `numbers()` (it
   hides real figures). Each kept its own test green.
4. **Escalation buys reasoning, not the missing observation** (step 8; new; L05-1, 3, 5). The stall
   log is silence. The second process is gone. No test encodes the race. Opus and Fable get the same
   empty evidence.
5. **The cause is in another session's activity** (steps 3, 5; new; L05-3, 5, 6). A second pytest
   process, a machine "heavily loaded by other sessions", two checks at once. The failing window cannot
   see any of them, so the query cannot carry them.
6. **An exact symptom match returns a different cause** (step 4; known #3; L05-1, 3). The 9 Nov stall
   matches the 5 Nov `loadfile` entry exactly. The ambiguity flag needs two recorded causes; the
   watchdog's own message names three.
7. **A failure that vanishes is never stored** (step 9; new; L05-3, 4). A stall that passes on rerun,
   or a chance failure seen once in another session, is never solved, so nothing is written. 44d115b:
   "the S09 test failed twice by chance (once in the cutoff guards session, once on main)".
8. **The judge was a strong model, and it was half right** (steps 7-8; known #4; L05-2, 4, 6). One Opus
   review refuted the sequence fixture and approved a retry delay that still broke the window.
9. **A rule in one project is a bug in the other** (step 10; known #34; L05-4, 5). FixFlow's "never two
   pytest at once" against the clinic's designed two slots. A3-14's FixFlow audit assumes fixtures
   FixFlow does not have.
10. **Data-state entries never go stale** (step 10; new; L05-2). The cursor claim decays with prod rows
    that no footprint item sees.
11. **Two sessions solved one flake hours apart, one wrongly** (step 9; known #31; L05-4). Root at
    20:20 UTC, wrong Sonnet fixture at 00:06 UTC. Under KS's write trigger the root's routine fix is
    not recorded, so the duplicate still happens.
12. **Operator hazards are reached only by wording** (steps 2-3; known #2; L05-2). There is no error
    text. The later sessions say "restore", "drain", "close the window", not "enable dispatcher".

## 4. What works

- L05-4: under the owner's rule (store every strong-model solve), the Sonnet lookup at 23:49 UTC by
  test id would have hit the root's entry. The candidate summary names the cause. That saves the
  sequence-reset detour: 6ac4577, its revert 030c6cb, stopped full runs, and one Opus review.
- L05-3: the gate held. The `loadfile` entry matched exactly; verify returned `not_applies`; no wrong
  fix was applied.
- L05-6: an exact, distinctive error line gives a first-time hit, and the stored negative result
  saves a re-measurement.
- L05-1: the KS `--diff` arm works as a tripwire. `sendOrQueue` and `flushOutbox` are rare enough on
  main (2 of 150 commits each) to warn without noise.
- L05-2: write-then-review matched reality. The review pass corrected two false claims before merge.
- L05-5: a one-line trap is cheap and true in FixFlow.
- L05-4: promotion into the repo (`test_no_hex_tags.py`) is the strongest afterlife: it fails at
  merge with no lookup at all.

## 5. Listed items these cases did not show, or show as smaller

- **#9 empty at the start.** In L05-4 the answer existed 3 h 46 min before the session that needed it.
  The gap was who wrote and on which branch, not an empty store.
- **#16 subagent windows start empty.** The Opus review that refuted the sequence hypothesis was a
  fresh subagent briefed to refute (`review-opus-round2.md:3`). Its empty window was not anchored by
  the main session's guess.
- **#2 the wrong question.** For failures with an error line (L05-3, L05-6) the query is the exact
  message. The question was right; the stored answer was the problem. It still bites for operator
  actions (break 12).
- **#12 too much at task start.** Here lookups come mid-task at a gate failure (L05-3 at transcript
  line 1152 of 1892, near the end of a measuring turn; L05-4 from line 1369 of 4070), not at task start.
- **#27 raw reasoning not available.** The clinic transcripts keep thinking blocks: `df1db0b9`:1547-1629
  show the wrong hypothesis forming. It does hold for FixFlow's July cases: no July transcript is on disk.
