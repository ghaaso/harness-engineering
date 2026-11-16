# Layer 1: Execution (version 2)

**Borrowed whole.** This layer has two parts. The first is a MapReduce-style master: a task table, numbered attempts, an atomic commit of each attempt's output, and re-execution from a checkpoint (D1 whole design, D1-03). The second is an OTP-style supervisor that limits restarts and escalates when the limit is reached (D1-09, D3-08, D4-07). The layer is crash-only (D1-12) and adds a batch system's admission and quotas (D1-08, D3-03, D3-05). The coordinator is both master and supervisor. A session exists only during its turns, so a watcher script serves as the coordinator's event loop (D3 whole design, point c). All execution state is kept in files under `run/`. Scripts write those files. Sessions do not.

**Where the classical assumptions fail.**
- Workers are not fail-stop. A confident wrong answer looks like success, so the Integrity layer has to catch it.
- A restart costs a field's tokens, not milliseconds. So restarts start from a checkpoint and are capped at one.
- Faults that come from a brief or a pack recur on restart (Bohrbugs, D4-07).
- A rerun is not deterministic. So recovery reads committed outputs and never replays (D2-03, D3-09).
- Only a session can stop a session. So the spend limits are counted from outside the session, but the stop waits for the coordinator to wake.

## Rules

**E1. One task table.** `run/tasks.json` holds one row per task. A task is one stage of a field: research, review, the fresh review, or the control.
- Who writes it: only the exec scripts. Each holds `run/tasks.lock` (an exclusive create with `wx`) while it writes, writes to a temp file, renames it into place and increments `rev`. The watcher and the sessions only read it.
- Basis: D1 whole design (the master's table), D2-05 (one writer), D3-10 (an atomic create, not check-then-act).
- On failure: if the lock is held, the script exits 75 and writes nothing. A lock whose process is dead and that is older than 2 minutes is broken by a rename, and the break is logged. If the table cannot be parsed, every exec script refuses to run, status reports `table-corrupt`, and the owner is told. `tasks.json.prev` is kept for that case.

**E2. Attempts and epochs.** Every start of a task, the first included, does three things:
- it raises the task's epoch to *e*;
- it creates the worktree `wt/<task>-e<e>` on the branch `child/<task>-e<e>`;
- it passes *e* in the brief.

The attempt writes only under `fields/<f>/<stage>/attempt-<e>/`. A hook enforces that limit, and the hook belongs to the Integrity layer. Basis: D1-01.

**E3. Fencing at the acceptor.** `commit.mjs` accepts an attempt only when all four hold:
1. the branch's epoch equals the epoch for that task in the table;
2. the task's state is running or ready;
3. the diff touches only the attempt folder (D2-05, D5-08);
4. the schema check passes.

The test is equality against the table. This is how Chubby checks a sequencer against the lock service instead of trusting order, which is D1-01 as corrected by the source check. A branch with an older epoch is refused and logged as a `zombie-write`, with the tokens it spent. The same fence applies to the coordinator: every exec script takes `--ce` and refuses to act (exit 64) when that value differs from `run/coord.json` (D1-01, D1-10).

**E4. Atomic commit.** Inside an attempt, every durable write goes through `put.mjs`:
- it validates the content and writes a temp file, then renames it into place;
- a JSONL line is appended only after it validates;
- a torn last line is moved to `.corrupt`.

Basis: D2-03, D3-09, D4-07. The attempt becomes visible only through `commit.mjs`. It merges the branch, computes a manifest of {path, sha256} for every file in the attempt folder, and then creates `fields/<f>/<stage>/COMMIT` with `wx`. The first commit wins (MapReduce in D1-03; D1-07):
- a repeat with the same epoch and the same manifest is a success that changes nothing;
- a repeat with a different manifest is refused.

Consumers read only the attempts named in a COMMIT file, and they check the manifest hashes first. These consumers are the synthesis, the start of a review and the restart path. MapReduce guarantees only one execution per task, so this per-task rule is what keeps two attempts from mixing (source-check correction to D1 whole). On failure: a merge without a COMMIT stays invisible, and running `commit.mjs` again completes it.

**E5. Intents.** Five effects each get an intent record: starting a session, replacing one, committing, freezing a pack, and writing to the owner.
- Before the effect, the script creates `run/intents/<task>-e<e>-<step>.json` with `wx`.
- After the effect, it writes the matching `.done` file.
- At every coordinator start, the coordinator runs `intent.mjs reconcile` against the session list before it does anything else.
- On failure: an open intent whose effect is observed is marked done. One whose effect is not observed may be redone, and that is safe only because of E3. Basis: D1-07.

**E6. The watcher.** `watch.mjs` is one background Node process per coordinator epoch, and the coordinator starts it directly. Every Δ = 60 s it does five things:
1. it runs `status.mjs`;
2. it evaluates every condition below;
3. it appends events to `run/events.jsonl`, of which it is the only writer;
4. it writes `run/watcher.json` with {pid, ce, last_tick};
5. it records ledger lines through the ledger script that the Assurance layer owns.

The conditions:
- **Progress** (D7-07, D1-02; the logical check of D4-06). Each task has a variant V, computed from files. In research, V is the number of approved question ids that no committed card covers. Once the Integrity layer's quote script exists, only a card with a witnessed quote counts; before that, a schema-valid card counts. In review, V is the number of empty slots in the fixed review form plus the cited cards not yet checked. A progress event is either a drop in V or a new distinct source id on a question that is still uncovered. Rewrites, and cards on questions already covered, are not progress.
- **Stall** (D3-06): no progress event for T_box. Until the pilot, T_box is the owner's box for each stage. After the pilot it is twice the 95th percentile of the measured intervals between progress events.
- **Loop** (D3-06): the same tool-call signature (the tool name plus a hash of its arguments) three times in a row in the transcript.
- **Alive** (D4-06): a transcript that has not grown for T_box with no READY file counts as a stall.
- **Spend** (D3-05): tokens counted from the attempt's transcript and from its helpers' transcripts, compared with the soft and hard limits of E11.
- **Memory** (D3-03): `os.freemem()` below the reserve.
- **Pause** (D1-02, D3-06): if the wall-clock gap since the last tick exceeds 2Δ + 30 s, the PC was paused. Every deadline moves forward by the gap, the pause is logged, and nobody is suspected. The watcher does not exit.
- **Common cause** (D1-09): two or more failure events within W_cc.
- **Its own deadline:** the watcher exits with code 30 after T_watch, so a hung or forgotten watcher still wakes the coordinator. It exits with code 31 when `coord.json` shows a newer coordinator epoch than its own.

**When it exits.** Urgent events exit at once: stall, loop, overspend, memory, common cause, and an unconfirmed stop. Non-urgent events (ready, a repair request, the soft limit) wait up to δ so that others can be gathered into the same wake (D3-07). The exit code names the most urgent class present.

**E7. Wakes are level-triggered (D3-07, Mesa semantics).**
- **A wake is only a hint.** It may come from the watcher's exit, a child's turn-end note or the owner. The coordinator first runs `status.mjs`. It then acts on `status.json` and on the events after the last sequence number it saw. It never acts on the text of a note (D5-09).
- **Nothing is missed at a restart.** A new watcher's first act is to evaluate every condition, so an event that happened during the coordinator's turn is not lost.
- **Every turn ends with a check.** The coordinator's last act in each turn is `endturn.mjs`. If no watcher of the current coordinator epoch is alive with a fresh tick, the script exits with code 1, and the coordinator starts one as a background command.
- **How long a lost wake can last.** At most T_watch, or until the next child note.
- **What remains.** A turn that ends without `endturn.mjs` leaves only the children's notes and the owner to wake the coordinator. The age of the watcher's tick shows the gap at the next wake.

**E8. One restart path (D1-12, D3-13, D2-03, D4-07).** `replace.mjs` handles every case:
- stall, loop and crash;
- parking a session when memory runs short;
- a planned hand-over at W*, which the Shape layer computes;
- the fresh reviewer that F1 asks for;
- the very first start, from an empty checkpoint.

It runs nine steps:
1. Write the intent.
2. Fence: raise the task's epoch in the table before anything else.
3. Stop the old session (E10).
4. Restore-check: the checkpoint is the last COMMIT plus the cards journaled by the dead attempt that pass the schema, deduplicated by source id.
5. Compute todo: the approved ids minus the ids already covered.
6. Admit the new attempt (E11).
7. Build the brief: the epoch, a pointer to the checkpoint, and todo.
8. The coordinator starts the session.
9. `--bind` records the new session id.

This path must run at least once in the pilot as a real path, and the fresh review of F1 is that run.

**E9. Restart limits and escalation (D1-09, D3-08, D4-07).** Each task may be replaced after a failure at most R = 1 time. A second failure, or the same class of failure twice, marks the task `failed`, and it goes to the owner with its events. Nothing retries it.
- Planned replacements do not count toward R: a hand-over, the fresh review, or parking for memory.
- Hand-overs per task are capped at H_max. Past that cap the task goes back to the Shape layer for a split decision (D3, thrashing).
- A common cause stops admission. Nothing restarts, and the owner is told.
- Only the owner chooses a changed input for any further attempt (D3-08).

**E10. Stopping a session, and its orphans.** `stop.mjs` works in a fixed order:
1. **Fence first**, so the stop itself need not be trusted (D1-01).
2. The coordinator stops the session.
3. **Verify for 2Δ:** the session's state reads stopped, and neither its transcript nor its helpers' transcripts grow.
4. Kill with `taskkill /T /F` any process whose command line names the attempt's worktree (D3, orphan risk).

If anything still grows, the stop is recorded as `stop-unconfirmed`, and the tokens spent after the fence count as zombie spend. Fencing makes the zombie's output harmless, so the replacement may start, but only if memory admits it. Past Z zombie tokens, the case goes to the owner.

**E11. Admission and escrow (D1-08, D3-03, D3-04, D3-05).** `admit.mjs` starts a task only when four conditions hold:
1. every task it depends on is committed;
2. fewer than N_max = 3 children are running (a ceiling, not a target);
3. free memory minus the reserve is at least the peak memory of one session, as measured;
4. B − Σ(open escrows) − r ≥ e_task.

The escrow is reserved at start and released at commit or at a cut. B is the remaining cap in tokens: (cap % − meter %) × tokens per percent. `meter.mjs` takes the meter reading from the coordinator's transcript.
- **No waves.** Tasks are admitted one by one, so a slot never stays idle while work and budget remain. The Shape layer orders the admissible tasks (D3-14).
- **Soft limit:** at 0.8·e an event fires, and the coordinator tells the child to freeze: write down its cards and its pack.
- **Hard limit:** e − (Δ + wake latency) × the peak spend rate. It fires an urgent exit, and the coordinator fences and stops the child. The task becomes `cut`: its files are kept, its uncovered questions stay in the table, and nothing is topped up without the owner.
- **The meter does not match the transcripts:** if the two differ by more than 20 %, admission halts and the coordinator is woken.
- **No hold-and-wait (Coffman):** a child that waits for a repair commits its work and ends, which frees its slot.

**E12. The coordinator's snapshot and hand-over (D1-10, D7-05, D7-06).**
- **The snapshot.** The coordinator's state is `status.json`, which a script generates. Nobody writes a summary.
- **The hand-over.** At W*_coord, which the Shape layer computes, the coordinator stops admitting. It waits for a quiet moment with no child running, so that no child's turn-end note can reach the old session. It then runs `handover.mjs`, which raises `ce` and stops its watcher, and asks the owner to start a fresh coordinator with a one-line brief that points to `status.json`.
- **A stale coordinator.** One that wakes later is refused by every exec script.

## File formats

- **`run/tasks.json`:** `{rev, ce, tasks:[{task, field, stage, deps[], state, epoch, session, worktree, branch, started_at, escrow, soft, hard, spent, restarts, handovers, fails:[{epoch, class, at}], commit:{epoch, manifest_sha256, git_sha}|null, inputs_ref, updated_at}]}`.
  - `state` is one of: planned, admitted, running, ready, stopping, parked, committed, cut, failed, dropped.
- **`run/events.jsonl`:** `{seq, ce, at_wall, kind, task, epoch, urgent, detail}`. Its only writer is the watcher.
- **`run/watcher.json`:** `{pid, ce, started, last_tick, ticks, pauses:[{at, gap_s}], deadline}`.
- **`run/status.json`:** a derived view, rebuilt from files.
  - `{generated_at, rev, ce, slots:{running, max, free_mem, reserve}, budget:{B, open_escrow, r}, tasks:[{task, state, epoch, V, last_progress, spent, soft, hard}], open_intents[], last_event_seq, watcher_tick_age_s, anomalies[]}`.
- **`fields/<f>/<stage>/COMMIT`:** `{task, epoch, manifest_sha256, git_sha, committed_at}`. It is created once, with `wx`.
- **`attempt-<e>/MANIFEST.json`:** `[{path, sha256}]`. **`attempt-<e>/READY`** and **`REPAIR.json`:** typed requests, `{question_ids[], missing:enum}`.
- **`run/intents/<key>.json` and `.done`;** **`run/coord.json`:** `{ce, session, started_at}`; **`run/meter.jsonl`:** `{at, pct, source:"transcript"|"typed", tokens_since_last}`.

