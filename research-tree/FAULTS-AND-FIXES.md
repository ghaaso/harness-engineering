# Research tree: faults, fixes and what to measure

Open this to build or verify a fix. The board is `research-tree/START-HERE.md`.

## What the scripts get wrong today

Each has a failing trace in `research-tree/model/as-built/CEX-fence.md` or `CEX-wake.md` and a fix
design in `FIX-fence.md`, `FIX-wake.md` and `FIX-JOIN.md`. `BUILD-SIZE.md` section 4 says what
triggers each. Most need only one common event: a slow call, a late transcript, one dead turn.

1. A child's finished result can be thrown away by a fence that races it.
2. Two sessions can be started for one attempt.
3. A finished child can hold its slot for ever, so the tree stops admitting work.
4. A stale coordinator can start a session, if coordinators have the session tools.
5. One coordinator turn that dies can leave nothing to wake the tree.
6. A healthy slow call of about ten minutes is taken for a hang and fenced.
7. A due act is raised once. A coordinator that ignores it leaves it unraised for ever.

Also: no coordinator brief exists; a row committed at `started` cannot be stopped; test flags of the
scripts can be reached by the coordinator.

## The fixes against the recorded selections

No fix uses a design that differs from the record. Nine use the recorded design. Five use another
variant of the same family. For those five, build what the record selects:

| Fix | The record selects |
|---|---|
| FX-OUT | A write-ahead log with value logging (ARIES), an atomic rename plus a COMMIT file, the commit record written last (D2-03, D1-03, D3-09, D3-10) |
| FX-CLOSE | A recorded intent reconciled against the observed world; supervision with restart limits; the check goes to the resource, because a stop cannot be confirmed (D1-07, D1-09, D1-01) |
| FX-PLAN | Intent written before the effect, then reconciled; a deterministic script that computes the next legal actions from files (D1-07, D1-10) |
| FX-W2 | Mesa monitor semantics: a notify is only a hint, the condition is checked again (D3-07) |
| FX-W5 | At-least-once delivery with idempotent effects; a hint that is checked again, wakes coalesced (D1-07, D3-07) |

Two things in the record to respect when building. Its `do_not` list for the distributed-systems
field forbids, across sessions: consensus, distributed locks, two-phase commit, and speculative backup
tasks for stragglers. And its rules on splitting disagree with each other (D2-01 and D2-02 split by
question range at plan time, D3-12 says a field is not split in the middle of its research, D3-01
says remaining work is split when the window is near its limit): settle that from the record before
touching splitting.

## How big the rest is

From `BUILD-SIZE.md`. Sizes are estimates from the change list, not from a diff.

- 14 units: 4 large (FX-OUT, FX-CLAIM, FX-CGATE, FX-W4), 8 medium, 2 small.
- 12 of the scripts and `thresholds.json` change. 2 new source files. 52 tests to add.
- 21 facts about the app that the designs lean on. 3 of them are file checks.
- Ten fixes edit `lib.mjs`, nine `status.mjs`, eight `watch.mjs`. How many lanes run is computed by
  the plan check from four limits (collisions, the check, the review, the token window), in
  `research-tree/BUILD-PLAN.md`.
- A cut by file needs the function signatures and file formats between the files fixed first:
  `planAct`, `outcomeState`, `liveness`, `realProc`, `requireArmed`, `acquireLock`, the kind returned
  by `parseTranscript`, `slotCount`, the 13 runtime file kinds, the keys of `thresholds.json`. The
  sources name them and give no signatures.

## Two facts to measure first

1. Does a hook's input carry the session id? FX-CLAIM and FX-CGATE, two of the four large fixes,
   cannot be built without it.
2. Can a coordinator start a session on a turn the owner did not type? On 2026-11-17 the app refused
   that for a session that another session had started. `BUILD-SIZE.md` says the same from the
   scripts' side: today the session tools are not allowed to the coordinator. If it holds, FX-CGATE's
   gate on session starts has nothing to gate, and who starts a child is settled by the app.

## Parameters

The record derives the hand-over windows, the admission reservation and the cost law. It
names the stall and hang counters as guesses until the pilot measures them. So the fixes' new
thresholds ship as marked guesses, and the pilot is where they are measured.
