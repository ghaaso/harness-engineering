# L05 - Failures that do not reproduce on demand (facts only)

FixFlow = C:/Users/User/Documents/projects/EMS_workshop1 (FF). Clinic = C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop (CL).
Sweep cards (SC) = FF/docs/program/evidence/harness-bottlenecks/sweep-cards.txt.

## Case 1 - Outbox: a live send races a queued flush on the same id (timing; no test shows it)
- When: fix 3 Jul 2026 (76061e0); named "KNOWN DEFECT, UNFIXED" in CLAUDE.md on 2 Aug 2026 (c731e66, merged as da988e2).
- Who: 76061e0 is co-authored "Claude Opus 4.8"; c731e66 "Claude Opus 5". Transcripts not searched.
- What happened: sendOrQueue stored an offline write under a stable id and never removed it when a later edit went live. The next flush replayed the old version over the newer result (queued completion v1 rebuilt the bill after the tech sent v2). 76061e0 fixed one direction (drop the queued item on live success). The other direction, a live call at the same moment as flushOutbox, stayed open: the winner is whichever request the server finishes last. The workaround is a refusal (no second completion while one is queued), not a lock.
- Evidence (exact):
  - 76061e0 subject: "fix(jobs): don't replay a stale queued write over a newer live send"; body: "a queued completion v1 regenerating the bill from the old form after the tech submitted v2."
  - CLAUDE.md, mobile outbox: "KNOWN DEFECT, UNFIXED: the outbox has no mutual exclusion on a stable id. A live `sendOrQueue` racing a concurrent `flushOutbox` for the same id resolves to whichever request the **server** finishes last, not whichever the technician sent last"
  - FF/docs/lifecycle-audit-followups-2026-07.md:85-86: outbox docstring (outboxSync.ts:19-21) says replays "can at worst duplicate a timeline entry"; the audit calls the premise "false for negotiate and consent".
- Sources: FF git show 76061e0; FF CLAUDE.md; FF docs/lifecycle-audit-followups-2026-07.md:85.
- Later moment: Wave-2 finding O3-F15 "The two drains are unordered": "removeItem fires onOutboxChange which triggers drainPendingMedia, with no ordering" (FF/docs/program/evidence/w2/O-03.txt, O3-F15; outboxSync.ts:210-212). Design answer: "One drainAll(techId) orchestrator ... in the order flushOutbox, drainPendingMedia ..., syncNow ..." (FF/docs/program/w2/O-03-design.md:18). Same family (ordering inside the outbox), found by reading code, not by a failing run.

## Case 2 - Dispatcher cursor: a replay that exists only in production data
- When: migration 0046 dated 2026-07-28; hardening commit c731e66 on 2 Aug 2026 (PR #170, da988e2).
- Who: c731e66 co-authored "Claude Opus 5".
- What happened: dispatch_cursor never had a row. run_dispatch_once creates a missing cursor at last_seq=0, so switching FIXFLOW_ENABLE_DISPATCHER on would send the whole job_event history as live WhatsApp messages. The count came from the production table, not from a test. Also: an exception outside the guard left the cursor unmoved so the same event repeated every 60 s; a unique index makes the first decision per (job, kind) permanent.
- Evidence (exact):
  - FF/backend/alembic/versions/0046_seed_dispatch_cursor.py docstring: "Measured against prod at the time of writing: 87 events, of which 24 ``complete``, 7 ``ready`` and 5 ``create`` are dispatch triggers - 36 WhatsApp messages about jobs that may be months old, to real customers."
  - Same file: "The damage outlives the messages. ``uq_customer_message_job_kind`` ... make the first decision per (job, kind) **permanent**".
  - FF/docs/HANDOFF-2026-07-28-open-work.md:155-190: the dead-letter guard "was aimed at a statement that cannot raise"; "the cursor never moved, and the consumer re-attempted the same event every 60 s **forever**"; "Note the sibling test above it raises `RuntimeError`, which never poisons anything - it is named for a property it does not exercise."
  - CLAUDE.md: "Deleting the cursor is never safe".
- Sources: FF 0046 file; FF HANDOFF doc as above; git show c731e66.
- Later moment: the ship plan carries it as a rule: "The dispatcher stays OFF. The cursor is re-seeded at `T_close` and again after every P4r" (FF/docs/program/SHIP-PLAN-2026-11.md:102), with "dispatch_cursor re-seed SQL" as a runbook item (same file:541, 730, 759). A host move needs this knowledge again.

## Case 3 - Clinic: the native check hung at 96 percent, a rerun passed, cause unknown
- When: about 5-6 Nov 2026 (runs on bc572f6, linux-test-runner record).
- Who: a Clinic build session; model not stated in these lines.
- What happened: the parallel test pass stalled; the stall watchdog killed it after 961 s; the next run passed. The log shows no failure, only silence. The hung test is not named because the heartbeat carries no test id. Host free memory was under 1 GB.
- Evidence (exact): CL/docs/tasks/linux-test-runner/task.md:218-219: "Native, 6 workers, `m1` | `CHECK FAILED: 6/7`: **the parallel pass stalled** at about 96 percent (`no test made progress for 600s`, watchdog killed it after 961 s)" and "`m2` (run again right after) | `CHECK PASSED: 7/7`". Line 221: "its cause is not known (the log shows no failure, only the stall; the hung test is not identified: the heartbeat watchdog reports no test id)". SC A3-09: "A hung pass costs the whole 600 s before it is killed ... so one hang costs about 10 minutes."
- Sources: CL linux-test-runner/task.md:218-221; SC A3-09 (sweep-cards.txt:296-304); CL faster-check/task.md:104 and evidence/demo-d-hung-test-stall-60s.log.
- Later moment: no recurrence of this hang found in the record. Nearby: SC (line 474) records a later native run n1 that "waited 351 s for a slot ... took 799.4 s whole", same memory pressure, no stall. HARNESS-BOTTLENECKS-2026-11.md:427: "Flaky tests (A3-14) can fail a base rerun for the wrong reason, so mechanism 2 needs a rerun rule." That is a stated need, not an instance.

## Case 4 - Clinic: random tags in test data fail about 1 run in 6 (data-dependent flake)
- When: 5-6 Nov 2026 (FC-09, faster-check record).
- Who: faster-check session with Opus review rounds; exact model per fix not shown in these lines.
- What happened: after tests ran in parallel, some runs failed on the first test. A name carried uuid4().hex[:6]; a test asserted the digits "40" were absent from a message. A second test tripped on tag digits inside page numbers. An earlier guess (database id sequences differ by worker) was wrong; a fixture to reset sequences was written, reviewed, found pointless and reverted (6ac4577, 030c6cb). Fix: letters-only random_tag(), without_identifiers(), a layout test banning the old form.
- Evidence (exact): CL/docs/tasks/faster-check/task.md:76-90: "`030c6cb`, `load`, final ... 10 of 12 green ... both failures are the random-tag collision in `test_expenses.py`"; "asserts `\"40\" not in refused.value.message`; the message contains the till's name, which carries `uuid.uuid4().hex[:6]`"; "An earlier hypothesis of mine ... was wrong". SC A3-14: "about 3 failures in about 40 full runs (task.md:189)"; HARNESS-BOTTLENECKS section line 82: "Flaky digit-in-hex-tag tests (FC-09) gave random gate failures in three sessions on 6 Nov".
- Sources: CL faster-check/task.md:76-90, 189, 219-222; SC A3-14 (sweep-cards.txt:339-346).
- Later moment: SC A3-14 TRANSFER: "FixFlow's Hypothesis/uuid-based fixtures should be audited the same way before parallelising." Prospective only; no FixFlow audit found. Order-dependent form in CL: slice S02 round 2, V1 (P2): the new period race test "commits closed_through and committed_db never restores rows, so later tests pass 'only because files run alphabetically'" (SC line 154; CL task.md:168-170).

## Case 5 - FixFlow: 22 phantom test failures from two pytest runs on one database
- When: recorded 28 Jul 2026 (65c2c3b, PR #165).
- Who: not stated.
- What happened: two pytest processes on the same test database each ran conftest metadata.create_all, which takes an AccessExclusiveLock; they deadlocked. 22 tests "failed" with no code fault.
- Evidence (exact): FF/docs/HANDOFF-2026-07-28-open-work.md:132-134: "**Never run two pytest processes against that DB at once** - the conftest's `metadata.create_all` takes an AccessExclusiveLock and they deadlock. 22 phantom \"failures\" were once traced to exactly that."
- Sources: that file; git show 65c2c3b.
- Later moment: same shape in CL: faster-check/task.md:347, FS-02 (P2): "The same checkout checked twice at once got two slots and shared one set of test databases (`autoclobber` lets one drop the other's)." Fix: a checkout lock refusing the second check. Also SC A3-15: "Under two concurrent checks a slow second call looked 'blocked' after a 0.6 s join, so a race test could pass with a broken lock."

## Searched
FF git log (all refs) for race/flaky/replay/cursor/mutual; CLAUDE.md; HANDOFF-2026-07-28; lifecycle-audit-followups; ship plan; w2 evidence; SC; HARNESS-BOTTLENECKS; CL faster-check and linux-test-runner task records. Session transcripts (.jsonl) not scanned; model names come from commit trailers only.
