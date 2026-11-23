# T8-FIX: the review's breaking findings fixed (top session 8, 2026-11-24)

The four breaking findings of `research-tree/build/refute/TOP8.md` (B1-B4) and the two faults in the count gate's
refusal text are fixed. Each hook was built as a `.next.mjs` copy, tested, then swapped in one move. No settings change.

## What changed
- **B1, window ceiling** (`.claude/hooks/window-ceiling.mjs`). The checkpoint line `A - 10 g` now uses section 5's
  recorded 3.8 K a call until the segment has 17 calls of its own, then the growth over its last 17 calls. Before, one
  early jump made g tens of K. Replayed over 460 helpers and 29 main sessions (`replay-ceiling.mjs`,
  `replay-new.txt`): no helper is refused before its 18th call (the old lines refused 4 at calls 2-7). The 27 helpers
  still refused, at 269-363 K, were each about to reach the 368 K compaction within 10 calls.
- **B3, window ceiling.** The hand-over line W* now applies only to a coordinating session: one that a `.md` file in
  `research-tree/build/` names on one line as "session <id>", where the first "kind" after it is "orchestrate". That
  is the form in TOP8-STATE.md and STATE.md. Every other session gets the checkpoint form (330 K for Opus at 3.8 K a
  call), including child sessions and the owner's own sessions. The reviewer's 3f32429e and 53e109f9 move from a hard
  line of 181 K to 355 K. Top session 8 stays a coordinator (now: context 193 K, W* 216 K, hard line 229 K).
  The log names the form used ("kind") and the state file that named the session ("by").
- **B2, fan-out gate** (`fanout-gate.mjs`). The app writes an `api-request` line each time it sends a request, after
  all of the previous message's tools have returned (t8-0105: 15,246 of 15,246 messages across 489 transcripts, 0
  exceptions). A request line after the meter reading's result now shows that the start is in a later message. Replayed
  on this session's real transcript, each start cut off before its own message was written (`replay-fanout.txt`): the
  refuter's and T8-FIX's first tries, which were refused live, now pass. A start in the same message as a reading is
  still refused at all 4 readings. The log now records the start's tool-use id.
- **B2, count gate** (`count-gate.mjs`). A start this gate admitted no longer counts as pending once the caller's
  transcript shows an error result for it, meaning a later hook or the app refused it. The caller's transcript is the
  session's own, or the starting helper's for a nested start. The reviewer's wave case (12 refused, 8 retried) now
  admits the 9th retry. The log now keeps only lines that can still matter (read back to T_QUIET), with no fixed
  256 KB tail.
- **Refusal text.** A declared reason is shown whole up to 200 characters and is cut only between words; "0 helpers"
  had been shown as "0 ". The gate no longer names a running helper for `--end`: every helper it counts wrote within
  10.8 min. The message now says that a dead helper drops out by itself after 10.8 min, and gives the command with
  `<id>` and `--status`.
- **B4, numbers.** Each number is now a journal record (written with `tools/journal.mjs`) or computed from one:
  - T_QUIET 10.8 min: t8-0100.
  - REVIVED: 0.1 s, the longest finished-write lag measured (t8-0101; it was 1 s typed).
  - PENDING 16.7 s: t8-0102.
  - Count-gate lock: longest hold 20 ms under waves of 21 (t8-0103). Stale = 21 holds = 420 ms (was 5 s); wait = 840 ms
    (was 4 s). 21 = the app's 20 (t7-0603) + the session.
  - Journal lock: longest hold 281 ms (t8-0104). Stale = 5.9 s (was 60 s); tool and watch wait 11.8 s (were 10 s and
    3 s).
  - G_REC 3.8 K is checked against this repository's helpers in t8-0106.
  - `count-gate.mjs` now logs the lock's wait and hold.
  - Windows EPERM on the lock folder is retried.

## Tests (one run at the end, live files)
| Command | Result | New cases | Fail on the old code |
|---|---|---|---|
| `node .claude/hooks/window-ceiling.test.mjs` | 99/99 | 10 | 10 |
| `node .claude/hooks/count-gate.test.mjs` | 25/25 | 6 | 7 |
| `node .claude/hooks/fanout-gate.test.mjs` | all passed (36) | 4 | 4 |
| `node .claude/hooks/journal-watch.test.mjs` | 12/12 | 0 | |
| `node tools/journal.test.mjs` | 23/23 | 1 (crashed lock) | 1 (refused after 10 s) |

Other suites, unchanged and passing: owner-report 23/23, plan-gate 37/37, record-guard selftest 245/245, check-commit 20/20.

## What it cannot see
- A coordinator is recognised only if its state file names it in this form. Top session 7's form ("Top session 7
  (Fable, kind orchestrate-deep)", with no id) would get the checkpoint form, not W*.
- 3.8 K comes from section 5's 14 builders. This repository's Opus helpers have a Q3 of 4.2-4.8 K (t8-0106). The
  figure is used only for a segment's first 17 calls.
- The fan-out fix depends on the app writing `api-request` lines (app 2.1.330). Without them, first tries are refused
  again, with a clear message.
- The count gate drops a refused start only once its error result is in the transcript.
- The lock times were measured on this PC under synthetic waves. A slower moment can break a live lock, which at worst
  admits one start too many while the app's own limit still holds. It can also time a waiter out, which lets the start
  through uncounted and logs it.
- REVIVED 0.1 s is only 3 ms above the longest finished-write lag measured. A slower finish write would count a
  finished helper as running for up to 10.8 min.

## Settings
No change. The four hooks are already wired in `.claude/settings.json`.

## See it live
- Window ceiling: `.claude/logs/window-ceiling.jsonl` lines now carry `"kind"` and `"gFrom"`. This helper was logged
  as `"kind":"helper"`, line 357 K. Check this session with
  `node .claude/hooks/window-ceiling.mjs --show <transcript> coordinator`.
- Fan-out gate: the next helper start should pass at the first try. `.claude/logs/fanout-gate.jsonl` then shows an
  allow with `"tu"` and no "no request has gone out" denial.
- Count gate: `.claude/logs/count-gate.jsonl` lines carry `"wait"` and `"hold"`.
  `node .claude/hooks/count-gate.mjs --status 6d4e3fd7` shows the "admitted and then refused" count.

Scripts and outputs are in this folder: `replay-ceiling.mjs`, `replay-fanout.mjs`, `measure-api-order.mjs`,
`measure-numbers.mjs`, `measure-lock.mjs`, `records.json` (as appended: t8-0100 to t8-0106).
