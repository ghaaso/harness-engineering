# FIX-fence: smallest fixes for the fence group (revision 4, 2026-11-17, after REFUTE-fence-3)

## Status after three refuter passes

| Fix | Verdict (REFUTE-fence-3) | Last change | That change attacked? |
|---|---|---|---|
| FX-OUT | Stands with a change | Rev 5: liveness depends on FX-CLOSE, now stated (no step changed). Last step change, rev 4: no fenced slot and no tombstone when attempt E has no manifest (H1) | No |
| FX-CLAIM | Stands (FIDELITY-3 found a design hole, fixed in rev 5) | Rev 5 (Revision 5 notes, points 1 and 2): a tombstone confirms at once only when no folder session is visible; every session step 7 counts gets a close; a lease-expiry fence is refused once a claim exists; the timing assumption is restated | No |
| FX-CGATE | Stands with a change | Rev 4: a "no such session" close is recorded as such; verify decides whether it counts (H3) | No |
| FX-CLOSE | Stands with a change | Rev 4: verify counts a "no such session" done only for this coordinator's own start, or with a process list that matches nothing (H3) | No |
| FX-REDO | Stands | Rev 2: exact post-state, `redo` lines | Yes (stands) |
| FX-PLAN | Stands with a change | Rev 5: a new act `close-session <sid>` for every session that step 7 counts and no attempt's stop is closing; the lease act passes `--if-unclaimed`. Rev 4: the owner rule ends once every needed close is recorded (P1); `started` with no claim follows the admitted rule (P2) | No |

Rev 4 changes only the four points above. The refuter's P3, P4, P5 and the "one source for the
fence's refusal rules" note are recorded in sections 10 and 11, not fixed (outside this round's
scope).

# Revision 3 text, amended by revision 4 where marked "Rev 4"

Helper F (`fix-fence-3`). No script was changed. This file builds on `SEM-fence.md` and answers
`REFUTE-fence.md` and `REFUTE-fence-2.md`. Line numbers are today's scripts under `BUILD/tcb/`.

Section 11 is the change log; section 12 is the modeller's work order.

Notation:
- **INFERRED**: reasoned, not run.
- **PROBE n**: an unverified harness fact from section 9.
- **Nn**: a point from REFUTE-fence-2 section 3.

**Rev 2 (kept): no hook takes the run lock.** Every hook write is an exclusive create of a file
outside every subject's write prefixes. Table writes stay in scripts, under the lock.

**Rev 3, in one line each:**
- **Fence order.** The fence runs its refusal checks before it writes any slot (N1).
- **One hook-write primitive.** Every hook write uses one hardened create (section 0b). It:
  - takes no fallback (N5, C9);
  - creates no folders;
  - spends a bounded retry budget (O5).
- **Names from tool input** are validated before use. Close intents and dones live in separate
  folders (N2).
- **Start-record identity** is the pair (session, `tool_use_id`); the tick is not part of it (N6).
- **`nostart`** counts failure reasons only (N7).
- **Leases and verify** get a wall-time floor (N3).
- **Planner fixes (your own finding):** the double start, the `bind` loop and the branch with no
  session tools become a numbered fix, FX-PLAN, in section 6.

## 0. Table

| Fix | Defects closed | Scripts touched | Depends on |
|---|---|---|---|
| FX-OUT: the outcome log (the hook's test-and-set; fence checks before the slot; slots carry the reason) | D4a, a half-written READY, the M6 gap, N1 | lib, guard-hook, replace, commit, watch, status, fsck | Q6 (both branches equal); PROBE 2, 3, 6, 9 |
| FX-CLAIM: one claim per attempt (session or tombstone); bind by claim; `nostart` for failures only | D4b (double start in the child), the D3 child backstop, the RC gap, C1, C2/N7 | lib, guard-hook, replace (fence, bind), stop, status | PROBE 1, 7, 9; the transcript-lag bound |
| FX-CGATE: the coordinator hook (nonce identity, start record by (session, `tool_use_id`), close records with validated names) | D3, the coordinator's own retry, the CE gap for session tools and helpers, N2, N6 | guard-hook, handover, status (owner act), settings/coordinator.json | Q5 (both branches); PROBE 1, 4, 6, 7, 8, 10 |
| FX-CLOSE: stop for committed/started; verify on a done close plus a wall floor; owner after k rounds | D4c, N8 as a probe condition | stop, status, watch | Q5; PROBE 10 |
| FX-REDO: a repeat completes a missing line, only at the exact post-state | A missing ledger line after a death | replace, status, stop, fsck | none |
| **FX-PLAN** (new): planner expectations and a total act table | The planners' double start (status.mjs:542, watch.mjs:164); the committed/started `bind` loop (status.mjs:543); the Q5b wake loop (N9) | status, watch, a spec test | Q5; the lease (FX-CLAIM) |
| (handed on) a dead lock holder while the process list is unavailable | The wake group (D1) | - | - |

## 0b. The hook-write primitive (shared by FX-OUT, FX-CLAIM, FX-CGATE)

**Today's behaviour.** `exclusiveWrite(file, buf, F)` (lib.mjs:659-710) works in four steps:
1. It creates parent folders (lib.mjs:660).
2. It writes the bytes to a temp file, then fsyncs them (664-667).
3. It hard-links the temp file to the target name (671).
4. If hard links are unsupported (ENOTSUP, EINVAL, EXDEV, ENOSYS or EMLINK), it falls back to a
   plain `wx` create, where the name exists before its bytes (676-688).

Each fs operation retries sharing errors 40 times, sleeping 25-100 ms synchronously between tries
(`fsRetry`, lib.mjs:162-173).

**Change: a new options argument, `exclusiveWrite(file, buf, F, {strict})`.** All hook writes, and
the fence's slot and tombstone, pass `strict`. With `strict` set:
- (a) **No fallback.** The fallback error codes throw `no-hardlink`. The hook then denies, and a
  script exits 3. `selftest` (an existing script) checks hard-link support in `run/` and `wt/`
  and fails closed. This closes N5 and C9, because a slot or claim file never exists without its
  bytes.
- (b) **No folder creation.** The parent folder must already exist, otherwise the call throws
  `no-parent`. The hook therefore cannot create an attempt folder (part of N1, part of N2).
  `replace start` creates `outcome/` with the manifest. `run/close/intent`, `run/close/done` and
  `run/` are created by `init`.
- (c) **A retry budget.** A new `fsRetry(op, budget)` argument holds the time remaining until
  `hook_deadline_ms` (thresholds.json:52, 5000), measured from the hook's start. When the budget runs
  out the hook denies. A hook's own work then ends inside its 5 s deadline, far below the 30 s
  harness timeout (settings/child.json:43). This closes O5 and X5 as far as the hook controls.
  PROBE 6 remains for a harness that is slow to start the hook at all.

**Runner.** The hook on every write; `selftest` at `init` and after a raise.

## 1. FX-OUT: the outcome log

**Classical problem.** Two outcomes of attempt E can race: "finished" (READY) and "revoked"
(fenced). A revocation can meet a write that is already in flight, which is a TOCTOU race. Field:
distributed agreement, write-once registers.

**Borrowed whole.** Test-and-set on write-once slots, organised as a log of slots, as in CORFU and
the Paxos log. A row may have several steps (CONTRACT.md:304), hence a log rather than one register.
Each slot works as follows:
- Every party proposes by exclusive create of the next slot name.
- Exactly one creation succeeds.
- Everyone reads the winner.

A proposer validates its proposal before it proposes. A Paxos acceptor never accepts a value it
would later have to refuse. Rev 2 broke this rule (N1).

**Failed assumption.** Each participant runs its own test-and-set and follows the protocol. A child
has only the harness Write tool, which is neither exclusive nor torn-proof, and it may ignore the
protocol.

**Done about it.** The hook, which the harness runs and the child cannot skip, runs the test-and-set
on the child's behalf. It uses the bytes in the tool input. `READY.json` becomes a copy that no
decision reads.

**Layout.** One slot per file: `wt/<T>-e<E>/outcome/<j>.json`, with j = 0, 1, 2 and so on.
- The folder is created by `replace start` together with the manifest. It lies outside the child's
  write prefix (`{attempt}/staging/`).
- Ready slot bytes: `{kind:"ready", task, epoch, step}`.
- Fenced slot bytes: `{kind:"fenced", task, epoch, reason}`.
- The log has no gaps, and nothing is ever appended after a fenced slot.
- A repeat READY for a step has identical bytes, so a log holds at most |steps| ready slots. The
  rev-2 cap of 2 x |steps| is therefore dropped (O4: moot).

**Reading rules.** One function, `lib.outcomeState(attemptDir, row)`, serves every reader:
- **R-a.** If the log holds any fenced slot, it is **fenced (reason r)**:
  - commit refuses;
  - the fence takes its retry path;
  - the hook denies;
  - the planners answer per FX-PLAN.
- **R-b.** A ready slot is **uncommitted** when its own step is not in `row.commits`.
- **R-c.** A slot file is read only if `lstat` shows a regular file and its name matches
  `^\d+\.json$`. Bytes that do not parse are tamper: exit 3 in a script, deny in the hook. With 0b(a)
  in place, a file without its bytes cannot exist.

**Steps, child side.** These run in the guard-hook for each child Write or Edit, take no lock, and
come after the profile and write-prefix checks (guard-hook.mjs:412-459):
1. Run the epoch and step gate (guard-hook.mjs:394-409).
2. Decide whether the target is READY. It is when `pathKey(resolveToolPath(p))` equals
   `pathKey({attempt}/staging/READY.json)` (guard-hook.mjs:93, 130-145).
   - An Edit to READY -> deny `ready-write-only`.
3. Check a Write to READY.
   - Parse `content` and run `checkFormat('ready')`.
   - Task and epoch must match, and the step must be in `row.steps`. Otherwise deny `ready-invalid`.
   - A `repair` marker -> allow, with no slot.
4. Read the log with `outcomeState`.
   - Fenced -> deny `attempt-fenced`.
   - A ready slot with identical bytes -> allow.
   - Otherwise create the first free slot with the strict create. `created` -> allow. Taken -> read
     the log again from step 4.

**Steps, fence side.** All of these run inside `replace fence`'s single lock hold
(replace.mjs:451-522). Only the order changed in rev 3.
1. Read the row and `outcomeState` of E.
2. **Retry path.** The log is already fenced with reason r'.
   - If `--reason` differs from r', exit 65 `fence-pending` {reason: r'}.
   - Otherwise go to step 3. Step 3's checks still apply, because the row may have moved
     (INFERRED: only an owner act can move it).
3. **Refusal checks before any write (N1).** Run `predictFence`'s checks against the row
   (replace.mjs:400-418): `stale-epoch`, `wrong-step` and `hmax`. Any refusal -> exit with it, and
   no slot is written.
   - **No slot at all** when the fence does not move the row to E+1 and step `fenced`: reason
     `first`, or `cut`/`drop` from planned or active/stopped (replace.mjs:406-412). Those have no
     live attempt to revoke.
   - **Rev 4 (H1): no slot and no tombstone when attempt E has no manifest.** Such an attempt was
     never admitted, so nothing can be live in it. This is the case for a parked row: a memory fence
     creates attempt E+1 without a folder (`newAttempt`, lib.mjs:1733, pushed at 1815), and stop sets
     `parked` (stop.mjs:185). Without this rule, every fence of a parked row would fail on the strict
     create (`no-parent`, exit 3). Steps 4-6 are skipped and step 7 (the CAS) runs as today.
4. **The ready check.** If the reason is neither first nor tainted and an uncommitted ready slot
   exists -> exit 5 `ready-wins`. This matches lib.fence's failure-only check at lib.mjs:1774 under
   Q6(b); `predictFence` (415) checks every reason. Q6 picks one, and both branches are kept.
5. **The fenced slot.** Strict-create the first free slot with `fenced(r)`. If a hook's ready slot
   takes that name first -> exit 5 `ready-wins`. A tainted fence instead reads the log again and
   appends after the ready slot.
6. **The tombstone** (FX-CLAIM fence step).
7. **The CAS** (`lib.fence`), then the ledger line.

   Once steps 3 and 4 have passed, `lib.fence` has no refusal left that could fire. The lock hold
   pins the row, and its `readyCheck` callback sees our own fenced slot as the winner. The only way
   left to fail is an fs error or a death.

**Deaths.**

| Death | What remains | Runner |
|---|---|---|
| After step 5 or 6, before step 7 | A fenced slot, with the row still at E | R-a blocks commit and READY. FX-PLAN acts `replace-fence --reason r'` (watcher class 17). The retry passes step 3 again, unless an owner act moved the row; then FX-PLAN answers `owner`, never a repeat (N1 rest) |
| In the hook, after the create, before allow | A ready slot, and no READY.json | The fence refuses (correct); commit reads the slot |

**Unknown cases.**

| Case | Effect |
|---|---|
| `outcome/` missing (a pre-fix attempt) | `no-parent`: the hook denies and the fence skips the slot. Migration: `replace start` creates the folder; attempts started before the fix finish under today's rule |
| PROBE 6 "lets it run" | READY.json lands with no slot. The work is lost, and the attempt hangs and is charged. Recorded open |

**Runners.**

| Steps | Runner | When |
|---|---|---|
| Child side | The harness hook | Each child Write or Edit |
| Fence side | `replace fence` | When the coordinator calls it |
| Fence-pending | FX-PLAN, then the coordinator | Each tick, then the next turn |

**Ablations.**

| Ablation | Property | Trace |
|---|---|---|
| Without the hook slot | ReadyNotDiscarded | READY passes the hook; a planned hand-over fence sees nothing; the CAS runs; READY lands |
| Without R-a | NoStaleAccepted | Schedule 3 |
| Without step 3 before step 5 | EventuallyResolves, NoBusyLoop | Schedule 1 |
| Without R-b | ReadyNotDiscarded | Pack committed, a review slot, a hang fence |

**Changes.**

| Where | Change |
|---|---|
| lib.mjs | `outcomeState`, `outcomeAppend`; 0b |
| guard-hook.mjs | A new step after 459 |
| replace.mjs | `readyValid` (183-201) goes. The M6 block (473-477) becomes steps 2-5. `predictFence` (400-426) is called inside the real run, not only in the dry run. `start` creates `outcome/` |
| lib.fence | The callback at 1774 becomes the log check |
| commit.mjs | Lines 674-694 |
| watch.mjs, status.mjs | `readReady` (watch.mjs:118-121, status.mjs:326-334) |
| fsck | Gapless log, slots parse, nothing after a fenced slot |
| CONTRACT | 3.12; an outcome-log section; 3.6 (CONTRACT.md:338); 4.6 (770-785); 8.20 |
| spec | Matching entries |
| Briefs | child.md:41 and the four helper briefs |

**Q6.**
- (a) Widen: the log check moves into `lib.fence`, which gets a pre-check entry, and
  replace.mjs:473-477 goes.
- (b) Keep: replace runs steps 1-5 itself before `lib.fence`.

The behaviour is the same in both.

**Not covered.**
- A READY whose outputs commit rejects still blocks fences that are not tainted.
- O7: READY is not a snapshot of staging.
- PROBE 6 "lets it run".

## 2. FX-CLAIM: one claim per attempt

**Classical problems** (distributed systems, RPC):
- At-most-once execution of a start that cannot safely be repeated, under crashes and lost replies.
- Failure detection in an asynchronous system.

**Borrowed whole:**
- An idempotency key checked at the server. The key is the attempt folder; the server is the
  session's gate.
- A tombstone on the same key, which cancels a request that never ran.
- Partial synchrony: a stated bound on start lag, a timeout in real time, and a detector that
  reopens a confirmation the bound got wrong.

**Failed assumptions:**
- Clients keep their keys. The coordinator forgets them when a turn dies.
- A server knows a request is a duplicate. A fresh session does not.
- Dead workers stop. A late session lives on without tool calls.
- Timeouts run on a clock nobody else drives. The tick counter can be advanced by a subject (N3).

**Files.** All are made by strict create, and none is deleted while the attempt lives:
- `wt/<T>-e<E>/claim.json`: `{kind:"session", session_id}` or `{kind:"tombstone", task, epoch}`.
- `start.json` (FX-CGATE).

**Steps.**
1. **Child hook, on every tool call**, after the epoch gate (guard-hook.mjs:409), with no lock.
   - `session_id` must match `SID_RE` (FX-CGATE), else deny `bad-input`.
   - No claim yet -> strict create `{session, sid}`. `created` or `identical` -> go on. Another
     session -> deny `attempt-claimed`.
   - A tombstone -> deny `attempt-cancelled`.
2. **`replace fence`**, in its hold, at FX-OUT step 6, for an attempt with a manifest: strict create
   the tombstone.
   - `created` means no session ever passed a tool call: a **no-start fence**.
   - **N7.** `nostart` is read and changed only for **failure reasons** (`FAILURE_REASONS`,
     lib.mjs:1773).
     - A failure-reason no-start fence is uncharged while `nostart < H_nostart` (default 2), and
       sets `nostart += 1`.
     - Past that, it is charged like a failure (lib.mjs:1785-1791).
   - A planned hand-over, a memory park, a cut or a drop of an attempt that never started stays
     uncharged, exactly as `lib.fence` does today.
   - A fence that finds a session claim resets `nostart` to 0.
   - `host` (lib.mjs:1782) keeps its boot-id meaning.
3. **`status --reconcile`** (status.mjs:263-322), in its hold.
   - A session claim on an admitted row -> `started`, with the session taken from the claim (via
     `setSession`, 319-322).
   - Transcripts are only a second source.
   - Any other folder session is the anomaly `duplicate-session`.
4. **`replace bind --session S`** (replace.mjs:976-1013), in its hold.
   - No claim yet -> exit 6 `not-claimed`.
   - The claim holder is not S -> exit 1 `not-claim-holder`.
   - Then today's checks.
5. **(moved to FX-PLAN)** The planner's act for an admitted row.
6. **`stop request`**, in its hold.
   - A tombstone -> confirmed at once.
   - Otherwise the request names the claim holder.
7. **`lib.slotCount`** (lib.mjs:3063-3102): today's count, plus 1 `unconfirmed` for every folder
   session that has no `run/close/done/<sid>.json` and is not the claim holder of a stop-confirmed
   attempt.

**The lease (N3).** A start record expires only when **both** of these hold:
- `ticks_total >= start.tick + start_lease_ticks`, and
- `now >= start.at + start_lease_ms`, where `at` is the hook's wall clock.

A wall jump can only expire a lease early. That costs liveness, never safety: a late session is made
inert.

**Rev 4 dependency (H2).** The lease needs `ticks_total` to advance. While the watcher is dead
nothing advances it, so the lease never expires and FX-PLAN answers `none` for that row for ever.
This rests on the wake group's dead-man fix (D1/D6). FX-CLAIM does not fix it; the stall is
liveness only, never safety.

**Lock holds.**
- Step 1 takes no lock; it is atomic by the hard link.
- Steps 2, 3, 4 and 6 run in one hold each.

**Deaths.**

| Death | What remains | Next |
|---|---|---|
| In the hook, after the claim | The claim | The same session retries and gets `identical` |
| In the fence, after the tombstone, before the CAS | A fenced slot, a tombstone, and the row at E | FX-PLAN's fence-pending act. The retry finds the tombstone `identical`, and `nostart` is counted once, by the CAS |

**Unknown cases.**

| Case | Effect |
|---|---|
| The claim does not parse | Tamper (cannot be torn, by 0b) |
| PROBE 7(b): `session_id` changes on compaction | The child is locked out of its own attempt. Recorded open |
| PROBE 9: a tool runs without the hook | This is a precondition |

**Runners.**

| Step | Runner |
|---|---|
| 1 | The hook |
| 2, 4, 6 | The coordinator's script calls |
| 3 | Reconcile, at each turn start |
| 7 | admit and handover |
| The lease | Read by FX-PLAN each tick |

**Ablations.**

| Ablation | Property | Trace |
|---|---|---|
| Without step 1 | OneSessionPerAttempt | A hand start makes two writers |
| Without step 4 | Slots, OneSessionPerAttempt | Schedule 6 |
| Without the cap | RestartLimit, EventuallyResolves | Schedule 4 |
| With the cap on every reason | RestartBudgetOnlyForFailures | Schedule 4, variant |
| Without the wall floor | NoChargeWithoutFault | Schedule 5 |
| Without step 7 | Slots | Schedule 7 |

**Timing assumption.** A transcript appears within the lease; this is to be measured (PROBE 5).
Without the bound, Slots holds only "eventually within N_max". The modeller runs both readings.

**Changes.**

| Where | Change |
|---|---|
| guard-hook.mjs | `parseInput` (210-226) keeps `session_id`; the claim after 409 |
| lib.mjs | claim helpers; `slotCount`; tasks schema `nostart`; thresholds `H_nostart`, `start_lease_ticks`, `start_lease_ms` |
| replace.mjs | fence; bind (987-998) |
| status.mjs | 263-322 |
| stop.mjs | 283-302 |
| CONTRACT | 3.6 (339-344), 4.10, R8, R10 |
| spec | Matching entries |
| Briefs | child: "if every tool is denied `attempt-claimed` or `attempt-cancelled`, end your turn" |

**Not covered.**
- A duplicate's tokens before its first tool call. The duplicate is counted until its close is done.
- PROBE 7(b).

## 3. FX-CGATE: the coordinator's hook

**Classical problem.** A deposed leader keeps acting through resources that do not check its term
(distributed systems).

**Borrowed whole:**
- A fencing token checked at the resource.
- A lease hand-over with a one-time nonce, as with Chubby's sequencer.
- **Input validation at a trust boundary.** Every name taken from a request is checked against a
  whitelist grammar before it is used as a path (CWE-22 practice).

**Failed assumptions:**
- Requests carry their token.
- A deposed node obeys refusals.
- Callers name only their own resources. A coordinator that steps outside its brief can name any
  string (N2).

**Files.** All are strict creates, all under `run/` (ALWAYS_PROTECTED) or the attempt folder:
- `run/coord-session-<ce>.json` {session_id}. `ce` comes from `coord.json`, never from the input.
- `wt/<T>-e<E>/start.json` {kind:"start", session, tool_use_id|null, tick, at}.
- `run/close/intent/<sid>.json` {kind:"close-intent", session:sid, by, tool_use_id}.
- `run/close/done/<sid>.json` {kind:"close-done", session:sid, outcome}.

**Name validation (N2).** These checks run before any path is built:
- `SID_RE` is a strict session-id grammar: hex and hyphens only, no dots or separators, fixed length.
  The exact form is PROBE 1 (INFERRED UUID).
- `T` must match `TASK_RE` and `E` must match `EPOCH_RE` (guard-hook.mjs:27-28).
- A failed check -> deny `bad-target`.
- Every reader checks that `kind` matches its folder and that `session` equals the file name.
  Otherwise the file is tamper.

**Steps.**
1. **`handover raise`** (handover.mjs:338-343) and `init` (209-213), in their hold, put
   `successor_nonce` into `coord.json`. The brief line (351-353) carries the nonce.
2. **Hook: the bind call.** This runs **after** the profile and Bash grammar checks
   (guard-hook.mjs:412-413, 519-521), so a helper profile with `bash: none` is refused first (G5 note).
   The call qualifies when all of these hold:
   - it is Bash running exactly `node <root>/tcb/handover.mjs bind --ce <ce> --nonce <X>`;
   - X equals `successor_nonce`;
   - the `sid` is in no earlier `coord-session-*` file.

   It then strict-creates `coord-session-<ce>`. `created` or `identical` -> allow; otherwise deny
   `bound-elsewhere`. The `handover bind` script then checks the nonce under the lock, copies the
   session into `coord.json`, and clears the nonce.
3. **Hook: every other call.**
   - If `sid` equals `coord-session-<current ce>`, the session is current.
   - Otherwise only Read under the read prefixes is allowed.
4. **Session-start tool (Q5a).**
   - Map the input to `T` and `E`, validated.
   - Read the row without a lock. It must be active/admitted at E, else deny `wrong-step`.
   - Strict-create `start.json`. The `outcome/` folder exists, so 0b(b) holds.
     - `created` -> allow.
     - **`different`** -> parse it. If `session` and `tool_use_id` are both equal and non-null,
       allow, because the hook was repeated (N6). Otherwise deny `start-issued`.
   - PROBE 8(b), no `tool_use_id`: a repeated hook is denied. The start then waits for the lease and
     ends in a no-start fence (`crash`, a failure reason, so the cap applies). That changes the pace,
     not safety.
5. **Session-stop tool, PreToolUse.** Validate the target. Then strict-create
   `run/close/intent/<sid>.json` (`identical` -> allow), then allow.
6. **Session-stop tool, PostToolUse.** Validate the target again. Strict-create
   `run/close/done/<sid>.json` when `tool_response` shows one of:
   - (a) success, meaning the session process is gone (N8, a PROBE 10 condition); or
   - (b) "no such session", the target does not exist (N4, PROBE 10).

   On anything else, nothing is written.

   **Rev 4 (H3).** The done file records which case it is: `outcome: "stopped"` for (a), or
   `outcome: "no-such-session"` with `by: <caller sid>` for (b). "No such session" may be relative to
   the caller (INFERRED, PROBE 4/10): a session started by the owner, by an earlier coordinator or by a
   duplicate start may be invisible to this one while alive. The hook therefore does not decide
   whether (b) counts; `stop verify` does (FX-CLOSE step 5).
7. **Owner act.** `status owner --act closed --subject <sid> --quote-file P` checks the `sid`
   against `SID_RE`. It writes the done file with `outcome: "owner"` in the lock and adds an owner
   line.

**Lock holds.**
- Steps 2-6 hold no run lock. Each is one strict create, inside the hook's 5 s budget (0b(c)).
- Step 1, step 2's script and step 7 are one hold each.

**Deaths.**
- A start is allowed, then fails: `start.json` exists with no claim. The lease runs out and a
  no-start fence follows.
- The intent was written but there is no done: verify keeps the slot.
- The bind file was written but the script never ran: the session is current by the file, and the
  script run completes the bind.

**Unknown cases.**

| Case | Effect |
|---|---|
| `coord.json` or the session file cannot be read | Only Read is allowed |
| Q5 tool input shape | `tool-not-allowed` |
| PROBE 7(b) | The coordinator is locked out. Recover from a terminal |
| PROBE 1(c): a helper has its own id | Every helper call is denied. Recorded open |

**Runbook line.** When the coordinator is dead or locked out, the owner runs drain and
`handover raise` from a terminal, then starts the successor with the brief line.

**Ablations.**

| Ablation | Property | Trace |
|---|---|---|
| Without step 4 | Slots | The start hook is skipped once |
| Without step 3 | TwoCoordinatorsAct (restated) | A stale tool start |
| Without the nonce | Successor liveness, TwoCoordinatorsAct | Schedule 13 |
| Without name validation | Slots | Schedule 2 |
| Comparing `start.json` by bytes | NoChargeWithoutFault | Schedule 9 |
| Verify on the intent | Slots | A close tool that fails |

**Changes.**

| Where | Change |
|---|---|
| guard-hook.mjs | The coordinator path (today step 4 is skipped, 394); a PostToolUse mode; `SID_RE` |
| handover.mjs | 209-213, 338-343, 351-353, bind 371- |
| status.mjs | The owner act `closed` |
| settings/coordinator.json | A Post entry |
| profiles/coordinator.json | Q5 |
| CONTRACT | `coord.json`; 3.6; 8.20; R6, R12 |
| spec | Matching entries |

**Q5.**
- (a) As above.
- (b) Steps 1-3 and 7 only. Session tools stay refused, and FX-PLAN answers `owner`.

**Not covered (open).**
- G6: a `plan/` Write whose hook ran before the raise and that lands after it.
- The window between allow and effect for a start.
- PROBE 1(c) and PROBE 7(b).

## 4. FX-CLOSE: releasing a finished child's slot

**Classical problem.** Releasing a resource held by a finished worker that does not exit by itself
(supervision).

**Borrowed.** Close-then-verify on an observed close, driven by a supervisor's due-list. A lease is
rejected: sessions neither stop at expiry nor can be killed by scripts.

**Steps.**
1. `commit record` sets committed. It is unchanged.
2. **(Planner: FX-PLAN.)** A committed row at `started` or `bound` -> `stop-request`.
3. **`stop request`** (stop.mjs:278-279). It now also accepts `committed && started`. The target is
   the claim holder.
4. **The coordinator calls the close tool.** FX-CGATE steps 5-6 run.
5. **`stop verify`** confirms only when all of these hold:
   - (a) the claim is a tombstone, or `run/close/done/<claim holder>.json` exists with `kind`
     `close-done`;
   - (b) every other folder session has a done file;
   - (c) there has been no growth over `stop_verify_deltas` ticks **and** over at least
     `stop_verify_ms` of wall time since the sample (N3).

   Otherwise the result is `unconfirmed` and `verify_rounds += 1`.

   **Rev 4 (H3).** A done file with `outcome: "no-such-session"` counts for (a) or (b) only when one
   of these holds:
   - the attempt's `start.json.session` equals the done file's `by` (this coordinator's own start);
     or
   - a process list is available and matches no process for that session id.

   Otherwise it counts as missing. Verify runs in the lock and can read both, so no new runner is
   needed; the owner act `closed` stays the way out.
6. **Escalation.** `verify_rounds >= 3` -> `owner`, by FX-PLAN.

**Lock holds and deaths.**
- Steps 3 and 5 run in one hold each.
- A death between step 3 and step 4: FX-PLAN lists `stop-session` again.

**Unknown cases.**

| Case | Effect |
|---|---|
| Process list unavailable | Verify exits 2 (stop.mjs:405-418) |
| PROBE 10 has no Post hook or no readable response | Every close goes to the owner |
| PROBE 10(b) is false: a dead session's close does not say "no such session" | Every crashed child ends with the owner, in Q5a as well (N4) |
| PROBE 10(a) is false: success means only "requested" | Verify can confirm while the session finishes its model call (N8). Recorded open, as a probe condition |

The N4 cost is the stated trade: today a dead session confirms by itself, and the same rule also
falsely confirms an idle live session.

**Runners.**
- FX-PLAN, through the watcher and status, for steps 2 and 6.
- The coordinator for steps 3-5.
- The owner for FX-CGATE step 7.

**Ablations.**

| Ablation | Property | Trace |
|---|---|---|
| Without step 3's change | AlwaysCanResolve | Schedule 12(b) |
| Verify on intent or forged done | Slots | Schedule 2 |
| Without the wall floor | Slots (requires N3's fault) | Schedule 5, the verify half |
| PROBE 10 branches | AlwaysCanResolve without the owner, which is expected to fail | Schedules 8 and 10 |

**Changes.**

| Where | Change |
|---|---|
| stop.mjs | 278-283, 426-449 |
| tasks schema | `verify_rounds` |
| thresholds | `stop_verify_ms` |
| CONTRACT | 3.6 (341) |
| spec | stop |

## 5. FX-REDO: a missing ledger line after a death (stands; unchanged)

**Classical problem.** Two stores with no atomic commit across them.

**Borrowed.** Idempotent redo from the after-image, as in ARIES. The script's own repeat call is the
redo. Each redo runs in the script's existing hold. A repeat answers 0 **only at the exact
post-state**.

| Path | Post-state required | Redo |
|---|---|---|
| `replace fence --epoch E --reason r` | Row at E+1, step `fenced`, `reason === r`, `attempts[E].cut` set | `fence` (`redo: true`), exit 0 `repeat` |
| `replace start` | admitted at E with a manifest | `admit` |
| `replace bind` | bound, same session id | `bind` |
| `status --reconcile` | started, same session | `started` |
| `stop request` | stop-requested | `stop-request` |
| `stop verify` | stopped | `stop` |

- Render (render.mjs:625) orders by epoch when `redo` is set. It is the only reader of these kinds.
- Fsck warns about lines that are still missing.
- The model has no ledger lines; this is tested through the fs seam (lib.mjs:155).

## 6. FX-PLAN: planner expectations and a total act table (new)

**Defects** (confirmed by REFUTE-fence-2 section 2):
- (a) `nextOf` answers `start-session` for every admitted row (status.mjs:542). `rowAct` does the
  same when no transcript is visible (watch.mjs:157-165). After a start whose session has not yet
  written its first record, both order a second start: D4b, from the trusted planner itself.
- (b) A committed row at `started` falls through to `bind` (status.mjs:526, 543; watch.mjs:141, 166).
  `replace bind` refuses anything but active (replace.mjs:987-988, 65), so the act repeats every turn
  and every tick for ever.
- (c) N9: with no session tools (Q5b), the planner orders `start-session` and `stop-session`, which
  nobody can do. That is a class-17 wake every tick.
- (d) N1 rest: the fence-pending act repeated when its retry would be refused.

**Classical problem.** A level-triggered controller re-issues an action whose effect it has not yet
observed. With it, an incomplete dispatch table. Field: cluster orchestration, control loops.

**Borrowed whole:**
- **Controller expectations**, as in the Kubernetes ReplicaSet controller's `ControllerExpectations`.
  An issued create is recorded, and the controller does not re-issue while the expectation is
  outstanding and unexpired. The record here is `start.json` (FX-CGATE step 4), and expiry is the
  lease (FX-CLAIM).
- **A total transition table checked by test.** Every (state, step) pair maps to exactly one act, and
  the act's script accepts that pair.

**Failed assumptions:**
- The actuator reports its own actions to the controller. Here the coordinator, an LLM, forgets
  them, so the trusted hook writes the expectation.
- Observation, here the transcript, follows within a known time. It is bounded only by the measured
  lease.

**Steps.** One pure function, `lib.planAct(row, facts)`, is used by both `nextOf` (status.mjs:520)
and `rowAct` (watch.mjs:135). The first match wins.
0. Today's `owner` conditions (status.mjs:523), plus `verify_rounds >= 3` **while some session that
   verify needs (the claim holder, and every other folder session) still has no counting done file**
   (rev 4, P1). Once the owner's `closed` act, or a counting close, has recorded every needed close,
   this rule stops matching. Step 4 then orders `stop-verify` again, and verify can confirm.
   `verify_rounds` is not reset; it only stops mattering.
1. The log is fenced and the row is still at E:
   - `predictFence` passes -> `replace-fence --reason r'`;
   - it refuses -> `owner` (d).
2. Today's lines 524-525.
3. Step `fenced`, or committed at `started` or `bound` -> `stop-request` (b).
4. Today's stop-requested block (527-541). In Q5b, `stop-session` -> `owner` (c).
5. Admitted:
   - a session claim -> `bind`;
   - `start.json` and no claim, lease not expired -> `none` (wait);
   - `start.json` and no claim, lease expired -> `replace-fence --reason crash`;
   - no `start.json` -> `start-session`, or `owner` in Q5b (a, c).
6. Started (committed rows were already taken by step 3):
   - a session claim -> `bind`.
   - **Rev 4 (P2): no claim yet** -> the same rule as admitted in step 5:
     - `start.json` and lease running -> `none` (wait);
     - lease expired -> `replace-fence --reason crash`;
     - no `start.json` (an owner's hand start, or a lost record) -> `owner`.

   Reconcile can mark a row `started` from a transcript before the first tool call creates the
   claim (INFERRED, lib.mjs:2310-2331). Today `bind` would then exit 6 `not-claimed` every tick.
7. Today's 544-549.

**Q5b detection.** `profiles/coordinator.json` names no session-tool prefixes. This is read once per
build, as a fact.

**Lock holds.** None. The planner only reads, so a stale read only delays an act.

**Deaths.** None. It writes nothing.

**Runners:**
- the watcher on each tick (class 17);
- `status`, which builds the act list at each turn.

**The spec test (runner of the total table).** It enumerates every (state, step) in the tasks schema
crossed with {claim, start record, lease, Q5}. It asserts that `planAct` returns exactly one act, and
that the named script's guard (stop.mjs:277-279, replace.mjs:987, and the others) accepts that row.
It fails on (b) today.

**Ablations.**

| Ablation | Property | Trace |
|---|---|---|
| Without step 5's expectation | OneSessionPerAttempt | Schedule 12(a) |
| Without step 3's committed/started rule | AlwaysCanResolve, NoBusyLoop | Schedule 12(b) |
| Without Q5b `owner` | NoBusyLoop | Schedule 11 |
| Without step 1's refusal branch | NoBusyLoop | Schedule 1, the variant with an owner act moving the row |

**Changes.**

| Where | Change |
|---|---|
| lib.mjs | `planAct` |
| status.mjs | `nextOf` delegates |
| watch.mjs | `rowAct` delegates. The transcript-visible branch (157-164) goes, because the claim replaces it |
| spec | The table test |
| CONTRACT | Class 17 (CONTRACT.md:97) and the "Steps first match" text |

**Not covered.**
- A start record lost by a hook that the harness skipped (PROBE 9).

## 7. Stale-coordinator coverage after the fixes

| Act | After |
|---|---|
| Scripts | 64, in the hold |
| Session start and close | FX-CGATE step 3 (Q5a); refused in Q5b |
| Agent helpers | Step 3 |
| Write under `plan/` | Step 3 for calls after the raise. **Open** for a Write in flight across the raise (G6) |
| Names in tool input | Validated (FX-CGATE) |

## 8. Dead lock holder while the process list is unavailable

This belongs to the wake group (D1). For this group:
- Scripts exit 75; that affects liveness only.
- No hook waits on, or holds, the run lock.
- If D1 adopts a time-based break, the writes stay safe, because of `assertHeld` (lib.mjs:1560,
  1566, 1690).

## 9. Probes (unverified harness facts; check before the build)

1. The PreToolUse input carries `session_id`.
   - Is it (a) shared with Agent helpers, or (c) their own?
   - What is its exact format (for `SID_RE`)?
   - **Where do helper transcripts live** (N10)? If they are top-level `.jsonl` files in the
     project folder, `slotCount` and verify (b) count helpers as folder sessions.
2. The Write input carries the full `content`.
3. A helper's tool calls run the attempt's hook.
4. The session tools' input names the folder or the target session.
5. A bound on transcript lag after a start; measure it in the pilot.
6. What the harness does with a hook that times out or is killed (guard-hook.mjs:3-5;
   settings/child.json:43).
7. Does `session_id` survive compaction and resume?
8. Does the input carry `tool_use_id`? Do duplicate hook entries run twice?
9. Does matcher `*` run the hook for every tool, MCP tools included?
10. PostToolUse for the session-stop tool, which needs two answers:
    - (a) Does "success" mean the process is gone (N8)?
    - (b) Is "no such session" distinguishable (N4)?
11. When several hooks answer, does a deny win?
12. Do `run/` and `wt/` support hard links (0b(a))? `selftest` answers this at run time.

## 10. Open defects (recorded, not fixed)

| Id | Defect | Why not fixed |
|---|---|---|
| G6 | A `plan/` Write in flight across a raise | Needs the write itself fenced; no small change found |
| O5 / PROBE 6 | A harness that lets a timed-out hook's tool run | The hook's own work is now bounded (0b(c)); the harness side is unknown |
| C4 / G4 / PROBE 7(b) | `session_id` changes on compaction | No stable identity to key on |
| PROBE 1(c) | Coordinator helpers with their own ids | Protocol choice for the owner |
| N8 / PROBE 10(a) | A close "success" that is not a stop | Depends on harness semantics |
| N4 / PROBE 10(b) false | Every crashed child goes to the owner | The stated trade |
| N10 | Helper transcripts counted as sessions | PROBE 1 |
| H2 | Watcher dead: the lease never expires, so the row waits for ever | The wake group's dead-man fix (D1/D6) |
| P3 | The table test does not cross the log state, the manifest or `verify_rounds` | Outside rev 4's scope; a spec-test change |
| P4 | An old watcher keeps the old planner after an upgrade (a wake per tick) | Outside rev 4's scope; the refuter's options are "exit on a `tcb_commit` change" or "an upgrade requires a raise" (the watcher exits on a ce change) |
| P5 | The owner has no supersede path for a fence-pending row whose retry is refused | The branch is unreachable without an owner act moving the row (the hold pins it); a hand edit resolves it |
| Fence rules | `predictFence` and `lib.fence` are two copies of one rule set | Outside rev 4's scope; one function or an agreement test |

## 11. Change log

### Rev 2 (after REFUTE-fence)

| Point | Right? | Change |
|---|---|---|
| O1 | Yes (commit.mjs:929-939) | R-a; the fenced slot carries its reason |
| O2 | Yes | R-b |
| O3 | Yes | Fence-pending act (now in FX-PLAN step 1) |
| O4 | Yes | Cap (dropped in rev 3 as moot) |
| O5 | Yes | Slot work on READY only (rev 3: 0b(c)) |
| O6 | Yes | `pathKey(resolveToolPath)` |
| O7, O8, O10 | Agreed | Stated as not covered |
| O9 | Yes | R-c |
| C1 | Yes (replace.mjs:987-1007) | Bind by claim |
| C2 | Yes (lib.mjs:1782-1791) | `nostart`, `H_nostart` |
| C3 | Precondition | PROBE 9 |
| C4 | Yes | PROBE 7 |
| C5 | Yes | Close records keyed by session id |
| C6, C9 | Answered | (rev 3: C9 reopened, see below) |
| C7 | Partly | Owner act `closed` |
| G1, G2 | Yes (lib.mjs:144-145; settings/child.json:43) | No hook takes the run lock |
| G3 | Yes | `tool_use_id` |
| G4 | Yes | PROBE 1, PROBE 7, terminal recovery |
| G5 | Yes | Nonce |
| G6 | Yes | Narrowed; open |
| G7 | Yes | Runbook line |
| G8 | Yes | Lease + cap |
| G9 | Yes | 8.20; exclusive creates only |
| K1 | Yes | Post hook done record |
| K2 | Partly wrong (status.mjs:319-322) | Stop names the claim holder |
| K3 | Yes | `verify_rounds` |
| R1-R3 | Yes | Exact post-state; `redo`; more redo paths |
| X1-X5 | - | As above |
| Own finding | - | Planners: double start, `bind` loop |

### Rev 3 (after REFUTE-fence-2)

Each point was checked against the scripts first.

| Point | Checked | Change |
|---|---|---|
| N1 fence that can never land | Right. `lib.fence` refuses `wrong-step` (lib.mjs:1771-1772) and `hmax` (1779-1781) after rev 2's slot; `predictFence` has the same checks (replace.mjs:413-418); `exclusiveWrite` creates folders (lib.mjs:660) | FX-OUT fence steps 3-4 run before the slot, and no slot is written for first/cut/drop without a live attempt; strict create makes no folders; FX-PLAN step 1 answers `owner` when a retry would be refused |
| N2 forged close names | Right (rev 2 put intent and done in one folder, distinguished by suffix) | `SID_RE`, `TASK_RE`/`EPOCH_RE` before any path; separate `intent/` and `done/` folders; `kind` and `session` checked by readers |
| N3 lease driven by `--once` | Right (watch.mjs:724-725 counts a tick per `--once`; it waits on `watcher.lock` only while the watcher lives, 714) | Wall-time floor on the lease and on verify's growth window |
| N4 dead session's close | Right as a consequence; PROBE 10 | Post writes done on "no such session" if PROBE 10(b) holds; else the stated trade, for Q5a too |
| N5 no-hard-link fallback | Right (lib.mjs:676-688) | 0b(a): strict create refuses the fallback; `selftest` fails closed |
| N6 tick inside `start.json` | Right | Compare parsed (session, `tool_use_id`) |
| N7 `nostart` for non-failures | Right (`lib.fence` charges failures only, lib.mjs:1773, 1785) | Counted and charged for failure reasons only |
| N8 success is not a stop | Unverifiable from scripts | PROBE 10(a) condition; recorded open |
| N9 Q5b wake loop | Right (watch.mjs:164) | FX-PLAN: `owner` for start and stop session in Q5b |
| N10 helper transcripts | INFERRED risk (lib.mjs:2354-2358 takes every top-level `.jsonl` by cwd) | Added to PROBE 1; open |
| G5 ordering | Right (helper profiles `bash: none`; guard-hook.mjs:519) | Bind recognition after the profile and grammar checks |
| O5 (partly) | Right (`fsRetry` 40 x <= 100 ms, lib.mjs:162-173) | 0b(c): retry budget = remaining `hook_deadline_ms`; the PROBE 6 harness side stays open |
| C2 (partly) | = N7 | As N7 |
| C5 (partly) | = N2 | As N2 |
| C7 (partly) | = N4 | Owner act, plus PROBE 10(b) done; cost stated for Q5a and Q5b |
| C9 (partly) | = N5 | 0b(a) |
| G3 (partly) | = N6 | As N6 |
| K1 (partly) | = N2 + N8 | Forgery closed; N8 recorded open |
| O4 | Refuter right: moot | Cap dropped |
| Own finding | Confirmed by the refuter | Made a numbered fix, FX-PLAN (section 6); FX-CLAIM step 5 and FX-CLOSE step 2 moved there |

### Rev 4 (after REFUTE-fence-3)

| Point | Checked | Change |
|---|---|---|
| H1 parked fence fails on the strict create | Right: the memory fence pushes `newAttempt` (lib.mjs:1733, 1815) with no folder; stop sets `parked` (stop.mjs:185); a parked/stopped row is fenceable (lib.mjs:1771) | FX-OUT step 3: no slot and no tombstone without a manifest |
| H2 lease frozen while the watcher is dead | Right (watch.mjs:725, 732 are the only tick writers) | Stated as a dependency on the wake group; no step changed |
| H3 "no such session" relative to the caller | Plausible, INFERRED (PROBE 4/10) | The done file records the case and the caller; verify counts it only for this coordinator's own start or with an empty process-list match |
| P1 owner rule with no exit | Right (rev 3 step 0 had no end condition) | Step 0 matches only while a needed close is missing |
| P2 `started` with no claim -> `bind` refused | Right (rev 3 step 6; FX-CLAIM step 4 exits 6) | `started` with no claim follows the admitted rule |
| P3, P4, P5, one rule source | Right as stated | Recorded open (section 10); outside this round |
| P6, P7, P8 | Refuter: sound | None |

## 12. For the modeller (rev 4: supersedes the flag and schedule tables below)

**Sub-flags added in rev 4.** Each one, when off, must make its property fail on its schedule:

| Sub-flag | Off = | Property | Final schedule |
|---|---|---|---|
| FX_OUT_MANIFEST | Slot and tombstone even without a manifest | EventuallyResolves | 1 |
| FX_CLOSE_NOSUCH | A "no such session" done always counts | Slots | 4 |
| FX_PLAN_OWNEREND | Step 0 owner rule with no end condition | AlwaysCanResolve after the owner acts | 2 |
| FX_PLAN_STARTWAIT | `started` with no claim -> `bind` | NoBusyLoop | 3 |

**Model changes for rev 4:**
- F1 reads `attempt.manifest`. Without one, F1 and F2 write nothing.
- The done record carries `outcome` and `by`.
- VERIFY reads `start.json.session`, the done file's `by`, and the process-list fact.
- PLAN reads the done files for step 0 and the claim for `started`.
- WATCHER_DEAD freezes ticks. This is a fault, not a flag.

**The fourteen final schedules (REFUTE-fence-3 section 4), mapped:**

| # | Schedule | Fix and flag | Property | Expected with the flags on |
|---|---|---|---|---|
| 1 | Parked fence (H1) | FX_OUT_MANIFEST | EventuallyResolves | holds |
| 2 | Owner close, then nothing (P1) | FX_PLAN_OWNEREND, FX_CLOSE | AlwaysCanResolve after the owner acts | holds |
| 3 | Started before the claim (P2) | FX_PLAN_STARTWAIT | NoBusyLoop | holds |
| 4 | Close of a session the caller did not start (H3) | FX_CLOSE_NOSUCH, FX_CGATE | Slots | holds |
| 5 | Rollout: old watcher, new status (P4) | none (open) | NoBusyLoop | fails: report as open P4 |
| 6 | Watcher dead during a lease (H2) | FX_CLAIM (dependency) | EventuallyResolves | fails without the wake group's fix: report as a dependency |
| 7 | Torn tainted fence | FX_OUT (R-a) | NoStaleAccepted | holds |
| 8 | No-start loop; variant with `handover` | FX_CLAIM_CAP | RestartLimit; the budget is untouched by handover | holds |
| 9 | Bind to the loser | FX_CLAIM | OneSessionPerAttempt | holds |
| 10 | Late session past the lease | FX_CLAIM step 7 + timing assumption | Slots vs eventually within N_max | both readings reported |
| 11 | Forged done; success that is only a request | FX_CGATE_NAMES; PROBE 10(a) | Slots | forged: holds. Request-only: fails if 10(a) is false (open N8) |
| 12 | Hook repeated across a tick | FX_CGATE_TUID | NoChargeWithoutFault | holds |
| 13 | Planner loops: (a) double start; (b) committed/started -> bind | FX_PLAN (+ FX_CLOSE step 3) | OneSessionPerAttempt; AlwaysCanResolve, NoBusyLoop | holds |
| 14 | Wrong first binder; helper variant | FX_CGATE (nonce, G5 ordering) | Successor liveness, TwoCoordinatorsAct | holds; the PROBE 1(c) variant is open |

The rev-3 flags (FX_OUT, FX_OUT_PRECHECK, FX_CLAIM, FX_CLAIM_CAP, FX_CLAIM_WALL, FX_CGATE,
FX_CGATE_NAMES, FX_CGATE_TUID, FX_CLOSE, FX_PLAN) and the action table below stay as they are.
Two rev-3 schedules have no number among the fourteen final ones, but their ablation flags keep
them as regression traces:
- fence past H_max (FX_OUT_PRECHECK);
- lease driven by `--once` (FX_CLAIM_WALL).

### 12a. Rev-3 flags, actions and schedules (still valid; the schedule numbers below are rev 3's, superseded by the final fourteen above)

**Flags.** Each fix has one flag. A sub-flag ablates one rev-3 change while the fix is on. With a
flag off, the property named for it must fail on the named schedule.

| Flag | Property that must fail when off | Schedules |
|---|---|---|
| FX_OUT | ReadyNotDiscarded; NoStaleAccepted | 3 |
| FX_OUT_PRECHECK | EventuallyResolves, NoBusyLoop | 1 |
| FX_CLAIM | OneSessionPerAttempt; Slots | 6, 7 |
| FX_CLAIM_CAP (with failure-only) | RestartLimit (off); RestartBudgetOnlyForFailures (when it counts every reason) | 4, 4-variant |
| FX_CLAIM_WALL | NoChargeWithoutFault | 5 |
| FX_CGATE | TwoCoordinatorsAct (restated); Slots | 13 |
| FX_CGATE_NAMES | Slots | 2 |
| FX_CGATE_TUID | NoChargeWithoutFault | 9 |
| FX_CLOSE | AlwaysCanResolve; Slots | 8, 10, 12(b) |
| FX_PLAN | OneSessionPerAttempt; NoBusyLoop | 11, 12(a), 12(b) |

FX_REDO is not modelled; it is tested through the fs seam.

**Model actions.** In the table:
- one row = one atomic step;
- "|" = a death point between rows;
- R/W = what each step reads and writes;
- "lock" = one run-lock hold;
- "xc" = one exclusive create (atomic by itself).

| Fix | Action | Reads | Writes | Atomic as |
|---|---|---|---|---|
| FX_OUT | H_READY(c,s) | row (epoch, steps, commits), log | 1 ready slot | xc (allow follows; death -> slot without READY.json) |
| FX_OUT/CLAIM | F1 check+slot(r) | row, log | 1 fenced slot (or exit: stale, wrong-step, hmax, ready-wins) | lock, with the slot as xc inside it |
| | \| F2 tombstone | claim | claim=tomb | xc (same hold) |
| | \| F3 CAS(r) | row, claim | row -> E+1/fenced, nostart, restarts, ledger | lock (same hold; a death between F1/F2/F3 = the hold dies, state as left) |
| FX_OUT | COMMIT(E) | log, row | row committed | lock; refuses when fenced |
| FX_CLAIM | H_CLAIM(sid) | claim | claim=sid | xc; a precondition of every child op |
| FX_CLAIM | BIND(sid) | claim, row | row bound | lock; refuses a non-holder or no claim |
| FX_CLAIM | RECONCILE | claim, transcripts | row started, session | lock |
| FX_CLAIM | LEASE? | start (tick, at), ticks, now | - | predicate |
| FX_CGATE | RAISE | coord | ce+1, nonce | lock |
| FX_CGATE | H_BIND(sid,X) | coord nonce, coord-session-* | coord-session-ce | xc |
| | \| BIND_SCRIPT | coord-session-ce | coord.session, nonce cleared | lock |
| FX_CGATE | H_COORD(sid,op) | coord-session-ce | - | predicate on every coordinator op |
| FX_CGATE | H_START(sid,tuid,T,E) | row (no lock), start | start | xc |
| | \| T_START | - | child session alive | tool effect (may fail: fault) |
| FX_CGATE | H_CLOSE_PRE(t) | name check | intent/t | xc |
| | \| T_CLOSE(t) | - | session t gone (or "requested", PROBE 10a) | tool effect (may fail) |
| | \| H_CLOSE_POST(t) | response | done/t | xc |
| FX_CGATE | OWNER_CLOSED(t) | - | done/t | lock |
| FX_CLOSE | STOP_REQ | row, claim | row stop-requested | lock; accepts committed/started |
| FX_CLOSE | VERIFY | claim, done/*, growth, ticks, now | row stopped or verify_rounds+1 | lock |
| FX_PLAN | PLAN | row, log, claim, start, lease, Q5 | act (watcher wake) | read-only |

**Faults to keep:**
- deaths at each "|";
- the watcher dead, plus coordinator `WATCH_ONCE` (ticks + 1);
- a start-tool failure;
- close-tool semantics (fails / "requested" only / "no such session");
- a hook repeated on the same `tool_use_id` across a tick;
- a stale coordinator's tool op;
- an out-of-brief coordinator act (a fence reason past H_max; a forged close target).

**The refuter's thirteen schedules, mapped:**

| # | Schedule | Fix and flag | Property | Expected with the flag on |
|---|---|---|---|---|
| 1 | Fence past H_max | FX_OUT_PRECHECK, FX_PLAN | EventuallyResolves, NoBusyLoop | holds (exit `hmax`, no slot) |
| 2 | Forged done `S1.done` | FX_CGATE_NAMES, FX_CLOSE | Slots | holds (`bad-target`) |
| 3 | Torn tainted fence, then commit | FX_OUT (R-a) | NoStaleAccepted | holds |
| 4 | Failing start tool, a no-start loop; variant with reason `handover` | FX_CLAIM_CAP | RestartLimit; budget unchanged for handover | holds |
| 5 | Lease driven by `--once` | FX_CLAIM_WALL (+ the verify floor) | NoChargeWithoutFault | holds |
| 6 | Bind to the loser | FX_CLAIM | Slots, OneSessionPerAttempt | holds |
| 7 | Late session past the lease | FX_CLAIM step 7 + timing assumption | Slots (invariant vs eventually) | both readings reported |
| 8 | Close of a dead session | FX_CLOSE, PROBE 10(b) | AlwaysCanResolve without the owner | holds only if 10(b); else fails = the stated trade |
| 9 | Hook repeated across a tick | FX_CGATE_TUID | NoChargeWithoutFault | holds |
| 10 | Close success that is not a stop | FX_CLOSE, PROBE 10(a) | Slots | fails if 10(a) is false: open |
| 11 | Q5b wake loop | FX_PLAN | NoBusyLoop | holds |
| 12 | (a) re-start before the transcript; (b) committed/started `bind` loop | FX_PLAN (+ FX_CLOSE step 3) | OneSessionPerAttempt; AlwaysCanResolve, NoBusyLoop | holds |
| 13 | Wrong first binder; helper variant | FX_CGATE (nonce, the G5 ordering) | Successor liveness, TwoCoordinatorsAct | holds; the PROBE 1(c) variant is open |

Schedules 1 and 2 need no harness fault, only a coordinator acting outside its brief. The model must
let the coordinator take any script or tool act, not only the briefed ones.

## Revision 5 notes (after FIDELITY-3 part 2; not attacked)

Each point was checked against my own steps and the scripts.

### Point 1. Dead or inert folder sessions in a tombstoned attempt

**Verdict: a design hole.** The reviewer is right (FIDELITY-3 9.2 b).
- FX-CLAIM step 7 counts every folder session with no done file.
- Step 6 confirms a tombstoned attempt at once, and no act ever closes its folder sessions.
- So nothing writes a done file for:
  - a session that died after its transcript appeared and before its first tool call;
  - a late session made inert by the tombstone.

That session is counted for ever. Two such deaths fill N_max = 2.

**Smallest change.** Two rules, plus one guard on the first:
- **FX-CLAIM step 6.** A tombstone confirms at once **only when no folder session is visible**.
  Otherwise the stop is requested for every folder session and goes through FX-CLOSE verify (b) as
  usual.
- **FX-PLAN.** A new act, `close-session <sid>`, for every session that step 7 counts and no
  attempt's stop is already closing. It covers late sessions that appear after a stop was
  confirmed. Its done file counts under rev 4's H3 rule: a "no such session" counts when this
  coordinator made the start, or when a process list matches nothing for that session. Otherwise
  the act becomes `owner` (the owner's act `closed`).
- **Guard: no new mechanism.** The close tool, the done record, the H3 rule and the owner act all
  exist already. The only new piece is the planner act, and its runner is the watcher (class 17)
  and status.

**Needs:**
- PROBE 10(b) and process-list availability; without them every such orphan ends with the owner.
- No owner ruling.

**Check for the modeller.**
- Configuration: C_D4B + FX_CLAIM + FX_PLAN + FX_CLOSE + AB_STOP_HELD, with step 7 counting
  `tv && !dn` whether the session is alive or dead.
- Schedule: two children die after their transcript appears and before their first tool call
  (2 faults, K = 2, N_max = 2). Each lease expires, each crash fence tombstones its attempt, and a
  third task waits.
- Property: AlwaysCanResolve. It must fail without the rule (an immediate confirm, and no
  `close-session` act). It must hold with it, given process-list availability or `by` equal to the
  starter.

### Point 2. What the start lease assumes

**Verdict: an assumption to state, plus one small change.**

What the design needs for Slots is weaker than the model's reading (i). It needs: "every live
session either claims, or has a visible transcript, within the lease." With point 1's change, a
session that stalls before its first tool call but has a visible transcript is counted by step 7.
Its attempt is no longer confirmed at once, so Slots holds.

Under the reviewer's reading (ii), with no bound on transcript lag, a stalled session with no visible
transcript is tombstoned and confirmed, and another task is admitted. Slots then fails with no fault.
The design keeps that case as "Slots eventually within N_max" (FX-CLAIM, timing assumption).

**Sentence to add (FX-CLAIM, timing assumption).** "Slots as an invariant assumes that every started
session makes its first tool call, or shows its transcript, within the lease (`start_lease_ticks` and
`start_lease_ms`). A first model call longer than the lease is a stall: without a visible transcript
it can break Slots (reading ii), and with one it is counted and closed."

**Smallest change: the reviewer's suggestion.** The lease act becomes
`replace-fence --reason crash --if-unclaimed`. Inside the fence's hold, if the tombstone create finds
a session claim, the fence exits 5 `claimed-late` with nothing written; FX-OUT step 3 runs before
it, so no slot exists either. The planner then orders `bind`.
- This removes the charge on a healthy session whose claim came late.
- It does not remove the Slots failure under reading (ii), which stays an assumption.

**Needs:**
- PROBE 5 must measure both transcript lag and the time to a child's first tool call. The lease is
  set above both.
- An owner ruling only if the probe finds no bound. The owner then chooses "Slots eventually" or a
  longer lease.

**Check for the modeller.**
- Configuration: C_D4B + FX_CLAIM + FX_PLAN, with the pre-claim stall allowed while FX_CLAIM is on
  (MF:1144).
- (a) Lease reading "claim or visible transcript within the lease", with point 1's change. Schedule:
  start; the session's transcript appears; the session stalls; the lease expires. Property: Slots
  must hold with point 1 and fail without it.
- (b) Reading (ii). Schedule: the session claims after the lease expired but before the fence's
  tombstone. Property: NoChargeWithoutFault must fail without `--if-unclaimed` and hold with it.

### Point 3. FX-OUT's liveness: a child alive after its commit

**Verdict: a model reading only, plus a dependency to state.** No step changes.
- After commit the row is no longer `active`, so the hook denies every tool the child calls
  (guard-hook.mjs:406-407). The child is inert: it can spend tokens but cannot write.
- Its slot is released by FX-PLAN step 3 (committed at `started` or `bound` -> `stop-request`), and
  then by FX-CLOSE's close and verify.
- So FX-OUT is closed by FX-CLOSE by design. The model's oracle close stands in for that pair. The
  gap is the joint run that was never made, not the design.
- A row with several steps stays `active` after an earlier step commits, and its child is meant to
  keep working.

**Sentence to add (FX-OUT, Not covered).** "Liveness and Slots after a commit depend on FX-PLAN step 3
and FX-CLOSE: a READY accepted from the hook's slot may leave the child running, inert, until it is
closed."

**Needs:**
- No probe beyond PROBE 10 (FX-CLOSE's).
- No owner ruling.

**Check for the modeller.**
- Configuration: C_OUT + FX_PLAN + FX_CLOSE + AB_STOP_HELD, with AB_COMMIT_CLOSE off (no oracle).
- Schedule: the child keeps looping after its ready slot (1 fault). Commit follows, then the
  stop-request, the close and verify.
- Property: AlwaysCanResolve and SlotsProc. They must fail with FX_CLOSE off; the superseded file
  `FX-OUT-before-commit-close-oracle.json` already shows AlwaysCanResolve F 7. They must hold with
  FX_CLOSE on.

### Change log, rev 5

| Point | Verdict | Change |
|---|---|---|
| 1 Dead or inert folder sessions in a tombstoned attempt | Design hole | Step 6 confirms at once only with no visible folder session; a new FX-PLAN act `close-session <sid>` for counted orphans |
| 2 Lease reading | Assumption to state + small change | The timing sentence restated; the lease fence gets `--if-unclaimed` (`claimed-late`, exit 5) |
| 3 FX-OUT liveness | Model reading; dependency stated | A sentence under FX-OUT "Not covered" (guard-hook.mjs:406-407 makes the child inert) |

**New flags for the modeller.**

| Flag | Property when off | Check |
|---|---|---|
| FX_CLAIM_ORPHANCLOSE | AlwaysCanResolve | Point 1 |
| FX_CLAIM_IFUNCLAIMED | NoChargeWithoutFault | Point 2 (b) |
| (none; joint configuration) | AlwaysCanResolve, SlotsProc | Point 3 |
