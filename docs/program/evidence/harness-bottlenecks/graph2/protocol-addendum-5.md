# Protocol addendum 5 — what changed during pre-flight, and timing decoupled

Written 2026-11-13, after the third pre-flight audit passed and before any held-out task or
question was run. `results/heldout/` held no answer file when this was written.

## A. Pre-flight record

1. Three pre-flight audits ran. The first two refused the run; the third passed checks 1 to 9.
   No arm ran on a held-out task or question in any round.
2. Question code changed after the **text** of the held-out questions was read. No lane that
   edits arm code read a reference answer. The changes:
   - A shared target parser (`arms/common/tqtarget.js`) replaced four separate ones. The old
     parsers threw on the phrasing of 7 of the 30 held-out questions in the typed arms (ids 24,
     27, 33, 40, 41, 46, 47) and on 4 of them in search (27, 33, 41, 47).
   - LadybugDB returned `::` where SQL returns nothing when a setting is read outside every
     definition (its string join treats a missing value as empty). Found on a probe question the
     fix lane wrote; fixed so the translation matches the SQL one (addendum 3 item 19).
   - A symbol that names a member with no node (question 40: a schema field) is cut back to the
     nearest existing definition, for all typed arms alike. It changes only question 40.
3. Rulings. The cut-back rule stays: it is generic, it is what a careful user of a typed store
   does, and the alternative is an empty answer on a question the store can address. The hold on
   the question runs is lifted.
4. After these changes all 80 stored tuning question answers and 390 sampled tuning task answers
   were reproduced exactly, and all 17 records were re-frozen with the new code hashes.

## B. H4 reporting (amended before the run)

5. H4 is reported on all 30 held-out questions and on the 23 whose handling was not touched
   (without ids 24, 27, 33, 40, 41, 46, 47). The verdict uses all 30. If the 23-question result
   has a different sign or a different verdict, H4 is reported as inconclusive and both are shown.

## C. Engine timing (H5) decoupled from the held-out run

6. The timing step was attempted twice and aborted both times. Other work on the host, unrelated
   to this test and not ours to stop, held the CPUs near 100 % for long stretches. Waiting for a
   quiet machine does not work on this PC.
7. The held-out run does not depend on timing, so it goes first. H5 is measured afterwards and
   changes no answer-quality verdict.
8. Timing is redesigned to tolerate load instead of waiting for quiet. Addendum 4 items 16, 18,
   19 and 20 stand. Item 17 changes to:
   - The engines alternate in short blocks, so load falls on all of them alike. Only one engine
     works at any moment.
   - CPU time is reported beside wall time for every measure.
   - Host load is recorded for every block. A block taken while other host work used more than
     half of the CPUs is repeated, up to three times, then kept and flagged.
   - At least five passes. A difference between engines is stated only if it holds in wall time
     and in CPU time and is larger than the spread between passes.

## D. Run notes

9. Before the first entry and after the last, the runner recomputes the input hashes (tasks,
   questions, facts) and compares them with the audit's record.
10. If the run is interrupted, complete answer files stand as logged. An incomplete entry is
    repeated through the harness with the reason "interrupted". Nothing is scored until every
    entry is complete.
11. The grader's check that a removed document is absent from T3 and T4 answers matches whole
    paths, not substrings.
12. Known and without effect on any answer: the DuckDB store of the frozen commit was built three
    minutes before the last edit of its build code (rebuilt and compared: 54 of 54 tables
    identical); a grouping difference in LadybugDB's setting query occurs 0 times at the frozen
    commit.
