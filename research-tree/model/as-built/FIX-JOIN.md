# FIX-JOIN: making FIX-fence (rev 4) and FIX-wake (rev 4) fit together (helper J, round 3, 2026-11-17)

Inputs: `notes/r3-changes.md` §1, §7, §10; `model/as-built/FIX-fence.md` (F) and `FIX-wake.md` (W),
both at revision 4; the scripts under `tcb/` (read only). Neither FIX file was edited. No Node command
was run. Script citations use W's abbreviations: `S:` status.mjs, `W:` watch.mjs, `L:` lib.mjs,
`G:` guard-hook.mjs, `R:` replace.mjs; also `A:` admit.mjs, `H:` handover.mjs, `C:` CONTRACT.md.

Markers used below:
- **from the files**: the resolution only restates what F, W or the scripts already say.
- **new in the join, not attacked**: a design choice the two files leave open; the smallest option is
  given, and no refuter has read it.
- **owner**: both branches are given; the owner rules.
- **open**: cannot be settled here; the reason is given.
- **INFERRED**: reasoned, not checked.

---

## 1. The thirteen points

### Point 1. A dead watcher and the start lease (F §2 "Rev 4 dependency H2", F §10 H2, F §12 schedule 6)

**The compiler is right**: an alert alone does not meet F's dependency. F needs `ticks_total` to
advance again within a bound. FX-W4 cannot restart anything (W FX-W4, "Classical assumption that
fails": it "can only alert (H4)").

**What restarts a dead watcher today.** The coordinator does, in a turn. Nothing else can (H4: only a
process the coordinator starts can wake it, so only the coordinator may start the watcher). The
scripts only report the death:
- the status anomaly `watcher-dead`, only when the process list answers (S:425); `watcher-stale-ce`
  for another ce (S:426);
- endturn exit 1 `watcher-missing` (S:656), and exit 2 `proc-unavailable` when the list cannot answer
  (S:652-653);
- CONTRACT exit 70: "a watcher 70 means 'restart the watcher'" (C:104).

The duty itself is R6's present sentence ("`status.mjs --endturn` makes sure two wake sources that the
coordinator itself started are pending", protocol line 130). No brief carries it (defect D2).

**Within what bound, today (INFERRED from the scripts).** The coordinator gets a turn by one of:
- (a) the watcher's own exit. The watcher is the coordinator's background command (C decision 37,
  C:1134-1135), and its exit is a wake (H1 for a session in a turn; needs-app item 5, C:1034-1035,
  for an idle one). This is immediate if delivered.
- (b) the alarm. As built, an alarm sleeps `alarm_ms` and then sleeps one more period whenever
  `run/acked.json` changed during the sleep (W:778-791, the M1 token). So it fires at most
  2 × `alarm_ms` after the last endturn: 2 h at the guess value (`thresholds.json:22`, 3,600,000 ms).
  If timers stop while the PC sleeps (H7 b, open), FX-W4's 5-minute wake-to-run runs are what let it
  advance (W FX-W4, timing argument).

At that turn, the restart succeeds only if the process list answers. A new watcher judges the old
`watcher.lock` holder with `proc.alive`, and "null (unknown) counts as alive" (L:1326). It therefore
cannot break the lock of a dead holder while the list is unknown, and it exits 75.

**Resolution** (from the files, with two additions new in the join).
1. **The runner is R6's restart act**, carried by FX-W3's coordinator brief (`tcb/briefs/coordinator.md`)
   as a numbered act:
   - when reconcile's status shows `watcher-dead` or `watcher-stale-ce`, or there is no `watcher.json`
     of this ce, or endturn exits 1 naming the watcher (FX-W1's tri-state `dead`): start
     `watch.mjs --root R --ce N` in the background;
   - on `unknown` (endturn exit 2): start nothing.

   The duty is R6's present text, and the allow-list already admits that form (W FX-W1 step 5). Only
   its place in the new brief is **new in the join**. W's brief list (r3-changes §5: reconcile first,
   ensure, act at exit 17, nothing on exit 75) omits it.
2. **The bound F may state** (INFERRED, list answering):

   `T_resume ≤ T_turn + start_lease_ticks × Δ`

   - `T_turn` is immediate on a delivered exit, else at most 2 × `alarm_ms` (S2: the shorter slot
     period governs).
   - The new watcher continues `ticks_total` from `watcher.json` (R5 "continued by any later
     watcher"; `loadWatcherState`, W:717).
   - Its first evaluation counts no tick (W:728-729). Every later counted tick counts toward the lease,
     paused ticks included (R5 as amended by M5: "still counts as a tick for every other counter").
   - The wall floor `start_lease_ms` has already run during the death.
3. **The list is unknown.**
   - L1: no restart until the list answers (L:1326). FX-W4's `list_hist` alert (3 of the last 5
     runs) tells the owner. This is W's open top-table row 1, so F schedule 6 fails in L1+u **by
     design (open)**.
   - L2: endturn judges the watcher dead after `watcher_lease_ticks × Δ` of wall time (W FX-W7 "Who
     restarts a dead watcher"). FX-W7 step 1 breaks the lock under the run lock, and the bound gains
     that term.
4. **A coordinator that skips the act, or gets no turn.** As built, FX-W4 has no counter for a dead
   watcher while an alarm lives. Its inputs are `runs_no_alarm`, `list_hist`, `watcher.json.stuck`
   (written only by a live watcher), `watcher-busy.json`, `unarmed_turns` and the `unarmed` records.
   So a skipped restart is silent. **New in the join, not attacked:** `status --deadman` adds
   `runs_no_watcher`. It counts runs where the list answers and no watcher of the current ce is
   alive, using the `proc.list` it already runs and the `watcher.json` it already reads. It alerts at
   ≥ 2, once per onset like the other causes. Sub-flag `FIX_NOWATCHER_ALERT` under `FIX_DEADMAN`.
5. **F's H2 row then reads:** "closed by R6's restart act at the coordinator's next turn, bound
   above; with the list unknown under L1, or with no coordinator turn, the owner is alerted
   (FX-W4); liveness only, never safety."

### Point 2. "The four helper briefs" (F §1 Changes)

**From the scripts.** The briefs other than `child.md` that write READY are:
- `briefs/fmea.md:21`
- `briefs/fresh-reviewer.md:23`
- `briefs/mapper.md:23`
- `briefs/stpa.md:21`

`checker.md`, `reader.md` and `scorer.md` contain no READY (grep). Each of the four gets the same line
as `child.md:41`: READY is a copy, and the outcome log decides. FX-CLAIM's line ("if every tool is
denied `attempt-claimed` or `attempt-cancelled`, end your turn") goes to all five, because every one
of them runs in an attempt folder under the child hook. That line also goes to the four helper
briefs: **new in the join, not attacked**.

### Point 3. `profiles/coordinator.json`, change "Q5" (F §3 Changes, F §6 "Q5b detection")

Today the profile lists no session tool. `tools_allow` holds Read, Glob, Grep, Write, Edit, Agent,
Bash, PowerShell and ToolSearch (`profiles/coordinator.json:4-14`). The hook refuses any tool not
listed (G:413). `toolListed` accepts an exact name or a trailing-`*` prefix (G:279-281).
- **Q5a** (owner): add the session-start and session-stop tools to `tools_allow`. The hook must also
  know which listed tool is a start and which is a stop (FX-CGATE steps 4-6), and nothing in the
  profile says so today. **New in the join, not attacked:** a profile key
  `session_tools: {start: [names], stop: [names]}`. It is added to `PROFILE_KEYS` (G:33), and every
  name in it must also appear in `tools_allow`. The exact names are PROBE 4. INFERRED candidates from
  this harness's own tool list: `mcp__ccd_session__start_session` and
  `mcp__ccd_session_mgmt__stop_session`.
- **Q5b** (owner): no `session_tools` key, or empty lists. That is the fact FX-PLAN's "Q5b detection"
  reads once per build.

### Point 4. CONTRACT sections named without a number or text

**From the files, and from CONTRACT's own numbering (headings, C:230-657; decisions end at 40,
C:1141).**

| What F or W names | Place | Text |
|---|---|---|
| "an outcome-log section" (F §1) | new **§3.23 Outcome log [outcome-slot]**, after §3.22 | F §1 "Layout" and "Reading rules" R-a to R-c, as written |
| §3.12 "FX-OUT" | §3.12 Ready marker (C:440) | add: "READY.json is a copy that no decision reads; the decision is the outcome log (§3.23)" |
| "R6 and decision 41" (W FX-W2, W3, W4) | new **decision 41**, after 40 (C:1141) | the R6 sentences of part 3 below (rows R6-a to R6-d), with the reason "round-3 model fixes D1, D2, D6" |
| §1.2 (L2 only) | §1.2 (C:47) | W's amended R5 sentence, verbatim (W "R5 and the leases") |
| `session_tools` (point 3) | §3.21 Role profile (C:577) | the key and the rule that its names appear in `tools_allow` |
| decision 20, "guard-hook writes nothing" (C:1094) | decision 20 | **contradicted by F**, which neither file names: the hook now writes by exclusive create (outcome slots, `claim.json`, `start.json`, `coord-session-<ce>`, close records). Amend to "guard-hook takes no lock and writes only by strict exclusive create (§0b of FIX-fence), never a file a script writes" |

### Point 5. stop.mjs for B2 (W FX-W6 step 6)

**Open.** B2 is an owner branch: one refund per task "for a fence later shown false". Neither file
says what shows a fence false. After FX-OUT, a fenced attempt can no longer land a ready slot: the
hook denies `attempt-fenced` (F §1 child step 4). So the obvious evidence, a READY after a hang fence,
no longer exists. Transcript growth after the fence (stop verify's sample, stop.mjs:426-449) shows
that the session was alive, not that it was healthy.
- **B1:** nothing to place.
- **B2:** the place would be `stop verify`'s confirmed-stop hold (stop.mjs:426-449), which reads the
  fence reason and the growth sample, with a row field `refunded`. The evidence rule needs an owner
  ruling. Not modelled until then.

### Point 6. Who prunes `run/arm/` (W FX-W1 step 2, "daily prune")

**New in the join, not attacked.**
- **Runner:** `status --reconcile` in hold 2 (W FX-W2 step 7). It already holds the run lock, reads
  every slot and marker, and writes `turn.json.slots`. It runs every turn, so "daily" is not needed
  and no clock is read.
- **Condition, tightened:** a marker is removed only when **neither** a slot record **nor** the
  `turn.json.slots` being written names its (pid, start_time). The reason: FX-W3's "armed" reads the
  markers of `turn.json.slots`. A marker pruned while `turn.json` still names its fired alarm would
  turn a stale `confirmed` back into "armed", which is schedule W1 (stale confirmed).
- `unarmed-*` records of the current ce stay; FX-W4 reads them. Records of an older ce may go.

### Point 7. `admit` and the new `slotCount` (F §2 step 7, runners)

**From the scripts.** `slotCount(rows, procList, transcriptsRoot, opts)` resolves attempt folders only
through `opts.root` (L:3059-3065). The new term needs the run root: `claim.json` in
`wt/<T>-e<E>/` and `run/close/done/<sid>.json`. Four of the five callers pass no root:
- A:470
- A:572
- H:277
- S:362

W:548 already passes `{ root }`. Change: those four calls pass `{ root }`. No other admit or handover
line changes. Without the root, the new term must count every folder session as `unconfirmed`, which
fails closed.

### Point 8. `spec/` entries per fix

**From the files**, mapped onto the existing `spec/<script>.md`, `spec/lib.md` and `spec/briefs.md`:

| Fix | Spec files |
|---|---|
| 0b | lib.md (`exclusiveWrite` strict, `fsRetry` budget), selftest.mjs.md |
| FX-OUT | lib.md (T56 for Q6a), guard-hook, replace, commit, watch, status, fsck, briefs.md |
| FX-CLAIM | lib.md (claim, `slotCount`, `nostart`), guard-hook, replace, status, stop, admit and handover (root passed, point 7), briefs.md |
| FX-CGATE | guard-hook (coordinator branch, Post mode), handover (nonce), status (owner act `closed`), selftest (folders at init) |
| FX-CLOSE | stop, lib.md (schema `verify_rounds`, threshold) |
| FX-REDO | replace, status, stop, fsck, render |
| FX-PLAN | lib.md (`planAct`, the table test), status, watch |
| FX-W1 | lib.md (`liveness`), watch, status, guard-hook (allow-list) |
| FX-W2 | watch (`--ensure`, `--nonce`), status (`--arm-nonces`), lib.md (`realProc` timeout) |
| FX-W3 | lib.md (`withRunLock` option), replace, guard-hook, status (endturn), handover, briefs.md (coordinator brief) |
| FX-W4 | status (`--deadman`, incl. `runs_no_watcher`) |
| FX-W5 | watch |
| FX-W6 | watch, lib.md (`parseTranscript` kind), stop (B2 only, point 5) |
| FX-W7 | lib.md (`acquireLock`), watch |

### Point 9. Two fixes in one hook (W FX-W3 "Interaction"; F PROBE 11)

**Resolution.** PROBE 11 is not needed for this pair. FX-CGATE and FX-W3 both run in the single
PreToolUse entry of `settings/coordinator.json` (matcher `*`, one command, lines 57-64). "Denied if
either denies" is therefore program order inside one process, not two hooks answering. The join's
rule (**new in the join, not attacked**): keep exactly one PreToolUse entry per role. The PostToolUse
entry that FX-CGATE adds is a different event.

W calls both checks "file reads". That is wrong for FX-CGATE step 4, which **writes** `start.json`.
Order matters:
- If `start.json` were created before the armed check denied, the planner would wait for the lease and
  then fence `crash`. That is a failure reason: it counts `nostart`, and past `H_nostart` it is charged
  (F §2 step 2).
- So the order (**new in the join, not attacked**; it is F's own rev-3 rule, validate before
  propose) is: every read-only check, then the one strict create. The full order is in part 2b.

### Point 10. FX-PLAN step 5 (`start-session`) against FX-W3's gate on the session-start tool

**Resolution, from the files: the planner's answer does not change.** `planAct` stays a pure function
of the row and its facts (claim, `start.json`, lease, Q5). "Armed" is a fact about the current turn,
not about the row: `turn.json.arm` becomes `spent` at every endturn (W FX-W3 A3). Between turns,
nothing is armed. So:
- the watcher keeps raising act-due for `start-session` (rowAct's filters are unchanged: free slot,
  not blocked);
- the woken coordinator arms first (ensure, then reconcile), and the start is then allowed.

When reconcile exits 1 `arm-unconfirmed`:
- the brief act (FX-W3 A1/A2): take no act that creates work this turn (`start-session`,
  `replace-start`, `replace-fence --reason first`); take every revocation; end the turn;
- if the coordinator tries anyway, `replace` exits 6 `not-armed` and the hook denies. Neither writes
  anything (point 9 order), so no lease starts and nothing is charged;
- the act stays due. FX-W5 raises it again at the capped interval, and `stuck` (3 raises) or
  `unarmed_turns ≥ 3` reaches FX-W4's alert. W FX-W3 already lists "an arm that cannot be confirmed"
  as a cause of that alert.

`none` would be wrong: it hides the row from FX-W5's `stuck` count. `owner` would be wrong: it hands a
transient arm failure to the owner. In Q5b the planner already answers `owner` (F §6 step 5), and the
gate is moot.

### Point 11. Order of the edits to `rowAct`, `lib.fence`, `withRunLock` and `acquireLock`

**From the files, ordered by what each step reads.**
- **`rowAct` (W:135-166)** becomes a filter around `planAct`:
  1. `planAct(row, facts)` (FX-PLAN). The facts include `zombieOver`, which status already passes
     (S:520). Today's watch `rowAct` lacks it.
  2. `owner` or `none` gives null. This is FX-W5 step 1, met through `planAct` step 0.
  3. Today's "can take now" filters stay in `rowAct` only: a free slot and not blocked for
     `replace-fence`/`replace-start` (W:138-139), and the sample age for `stop-verify` (W:150).
  4. The act ident is keyed as today.

  FX-W6's `idle-child` and `age-cap` are **not** row acts. They are added to the same act-due set in
  `evaluate` (W:347-421). FX-W5's re-raise and `stuck` count then run over the whole set. All of this
  is computed on FX-W7's copy `next` and kept only if the hold succeeds.
- **One `replace fence` hold.** The order is:
  1. `withRunLock(..., {requireArmed})` (FX-W3), checked at the start of the hold, for reason `first`
     only;
  2. FX-OUT steps 1-5 (refusals, ready check, fenced slot);
  3. FX-CLAIM's tombstone (FX-OUT step 6);
  4. `lib.fence`'s CAS with the log callback (Q6a) and `nostart` (FX-CLAIM step 2).

  These touch disjoint parts of `lib.fence`: the callback at L:1774, and the charge at L:1782-1791.
- **`acquireLock`** is touched by FX-W7 alone, for `watcher.lock`. **`withRunLock`** is touched by
  FX-W3 alone. Each has no order to settle.
- **Build order across `lib`.**
  1. 0b. Every strict create depends on it.
  2. `outcomeState` and the claim helpers.
  3. `planAct`, which reads both, `start.json` and the lease.
  4. `liveness` and the `realProc` timeout.
  5. `withRunLock` `requireArmed`, which reads `turn.json` and the markers.
  6. `acquireLock`.
  7. `parseTranscript` kind.
  8. `slotCount`.

### Point 12. Flag and schedule numbering (F §12; W "For the modeller")

**From the files.** The modeller uses only the final tables: F's fourteen (F §12) and W's eighteen
(W, final table). The two numberings collide, so the joint table prefixes them: **F1-F14** and
**W1-W18**. W's flags table numbers its "Schedules" column by REFUTE-wake-2 and is superseded by its
final table. `FIX_HOOK_TESTFLAGS` is renamed `FIX_FLAG_ALLOWLIST`. F's rev-3 flags stay as regression
traces (F §12, last paragraph).

### Point 13. Where the tests live

**From the scripts.** There is one file per script in `tcb/test/<script>.test.mjs`, with helpers in
`tcb/test/helpers.mjs` (C §4.11).
- **The total-table test (FX-PLAN):** `tcb/test/lib.test.mjs`. It enumerates `planAct`, then asserts
  each script guard's acceptance by calling the scripts as the replace and stop tests already do.
- **The dead-man tests (FX-W4, including `runs_no_watcher`):** `tcb/test/status.test.mjs`, because
  `--deadman` is a status mode.
- **The allow-list:** `tcb/test/guard-hook.test.mjs`. Its check against each script's production calls
  reads `spec/<script>.md`, the source W names.
- **The rest:** in the test file of the script that W or F changes.

---

## 2. The joint table for the modeller

### 2a. Every fix's main flag

Charter rule: one ablation per main flag. A sub-flag is ablated only on its named schedule.

| Fix | Main flag | Further flags (each with its schedule) | Must fail when main is off |
|---|---|---|---|
| 0b | (none, a precondition of FX-OUT/CLAIM/CGATE; tested by selftest) | — | — |
| FX-OUT | `FX_OUT` | `FX_OUT_PRECHECK` (rev-3 trace), `FX_OUT_MANIFEST` (F1) | ReadyNotDiscarded; NoStaleAccepted (F7) |
| FX-CLAIM | `FX_CLAIM` | `FX_CLAIM_CAP` (F8), `FX_CLAIM_WALL` (rev-3 trace) | OneSessionPerAttempt; Slots (F9, F10) |
| FX-CGATE | `FX_CGATE` | `FX_CGATE_NAMES` (F11), `FX_CGATE_TUID` (F12) | TwoCoordinatorsAct (restated); successor liveness; Slots (F14) |
| FX-CLOSE | `FX_CLOSE` | `FX_CLOSE_NOSUCH` (F4) | AlwaysCanResolve; Slots (F2, F13b) |
| FX-REDO | not modelled (fs seam) | — | — |
| FX-PLAN | `FX_PLAN` | `FX_PLAN_OWNEREND` (F2), `FX_PLAN_STARTWAIT` (F3) | OneSessionPerAttempt; NoBusyLoop (F13) |
| FX-W1 | `FIX_ALARM_MARKER` | `FIX_FLAG_ALLOWLIST` (W5, W6; a second mechanism, so its own ablation); `FIX_MARKER_PRUNE` (point 6 condition) | NoDeadlock under u (W3) |
| FX-W2 | `FIX_ARM_FIRST` | — | NoDeadlock (`arm-start-can-die`); W8 |
| FX-W3 | `FIX_ARM_GATE` | `FIX_UNARMED_REC` (W7) | NoDeadlock (W1); RevocationNeverGated holds always (W17) |
| FX-W4 | `FIX_DEADMAN` | `FIX_BUSY_FILE` (W11), `FIX_LIST_WINDOW` (W12), **`FIX_NOWATCHER_ALERT`** (join, point 1: F6 with the restart act omitted) | NoSilentDeadlock (W10) |
| FX-W5 | `FIX_ACT_RERAISE` | — | PromptResponse; feeds NoSilentDeadlock |
| FX-W6 | `FIX_OP_DEADLINE` (with `FIX_EPOCH_TICK`) | `FIX_IDLE_ACT` (W14), `FIX_AGE_CAP` / `FIX_AGE_ASK` (W13) | NoFalseSuspicion (`no-timeliness`) |
| FX-W7 | `FIX_WLOCK_UNDER_RUN` | `FIX_BUSY_SKIP` (W11), `FIX_TICK_COPY` (W18) | SingleWatcher (W16) |
| Join | (no flag) the actions `WATCHER_START` (point 1) and `HOOK_ORDER` (point 9) are on in the all-on run | `JOIN_HOOK_ORDER` off = `start.json` created before the armed check | off: RestartBudgetOnlyForFailures / NoChargeWithoutFault (a not-armed start ends in a `crash` fence) |

**The join's two targeted checks.** Each is one check, because it guards a charged restart or a
silent stall:
- F6 with `WATCHER_START`, in L2 and in L1 with the list known: EventuallyResolves must hold. With the
  act omitted (fault `o`), NoSilentDeadlock must hold only with `FIX_NOWATCHER_ALERT` on.
- `JOIN_HOOK_ORDER` off, with an unconfirmed arm and a start attempt.

The model's existing actions are not checked here. Whether `model.mjs` already has a watcher-start
action is INFERRED, and the modeller confirms it.

### 2b. One coordinator turn with both groups' fixes on (the order of acts)

One row is one tool call or one hook pass. "Hook" = the coordinator's PreToolUse pass, in the order of
point 9.

| # | Act | What runs, in order | Writes |
|---|---|---|---|
| 0 | Wake | A watcher exit (class 17 or urgent, 70, 75), an alarm exit (30, 0 superseded, 64; each preceded by its exit marker, FX-W1; on 30 also an `unarmed` record if `turn_seq` is unchanged, FX-W3), an owner message, or FX-W4 to the owner | markers by the exiting alarm |
| 1 | **Successor's first turn only:** `handover bind --ce N --nonce X` | Hook: profile (G:412-413), Bash grammar and allow-list (G:519-521, `checkTcbNode` G:315-353, the bind form listed), bind recognition (FX-CGATE step 2), xc `coord-session-<ce>`. Then the script's hold: nonce check, session copied, nonce cleared | `coord-session-<ce>`, `coord.json` |
| 2 | Call 1, background: `watch --alarm --ensure --nonce X --root R --ce N` (S2: a second one) | Hook: profile, grammar, allow-list, current session (FX-CGATE step 3). Ensure steps 2-4 (FX-W2), with `turn_seq_at_reg` in hold 1 (FX-W3) | `run/arm/X.json`, a slot |
| 3 | Call 2, foreground: `status --reconcile --arm-nonces X` | r1 list outside the lock (also slot verdicts, FX-W1 `liveness`). Hold r8-r13: claim → `started` (FX-CLAIM step 3), `readReady` from the log (FX-OUT), `nextOf` = `planAct` (FX-PLAN), `readLoose` / `state-corrupt` (FX-W1), status.json, then `turn.json` (`turn_seq` + 1, `read_seq`, arm). Wait ≤ `arm_confirm_ms`. Hold 2: count live slots → `confirmed` or exit 1 `arm-unconfirmed`; prune markers (point 6) | `status.json`, `turn.json`, nonce files |
| 4 | Restart a dead watcher (point 1) | Only when status says `watcher-dead` / `watcher-stale-ce` / none. Hook as row 2. The new watcher takes `watcher.lock` per FX-W7 step 1 | `watcher.lock`, `watcher.json` |
| 5 | Revocations, always (never gated by the arm, W17) | `replace fence` (non-first: FX-OUT 1-5, tombstone, CAS); `stop request` (FX-CLOSE step 3, the claim holder); session stop (hook: FX-CGATE step 5 intent, then the tool, then Post step 6 done); `stop verify` (FX-CLOSE step 5); `commit` (refuses a fenced log) | slots, tombstone, rows, close records |
| 6 | Work-creating acts, only if row 3 confirmed | `replace start` / fence `first` (`requireArmed`, exit 6 `not-armed` otherwise, FX-W3; `start` creates `outcome/` with the manifest, FX-OUT). Session start (Q5a). Hook: current session, then the armed predicate (FX-W3), then the row check and xc `start.json` (FX-CGATE step 4). Then the tool's effect. In the child: epoch gate, claim (FX-CLAIM step 1), then the READY slot (FX-OUT) on its writes | rows, `start.json`, `claim.json` |
| 7 | `replace bind --session S` once a claim exists | FX-CLAIM step 4 (exit 6 `not-claimed`, exit 1 `not-claim-holder`) | row `bound` |
| 8 | Any script exits 75 | End the turn; retry nothing (FX-W3 A4-A6) | — |
| 9 | `status --endturn --acked-seq K` | K = `turn.json.read_seq` (FX-W3). Hold: `acked.json` (the M1 re-arm token), arm = `spent`. Then the tri-state report (FX-W1): exit 1 on a dead source. On exit 1: start the dead watcher (row 4) or ensure again (row 2), then end the turn. A second endturn with the same K is accepted (S:627-628) | `acked.json`, `turn.json` |

Between turns, three runners act on their own:
- the watcher: `planAct` → `rowAct` filters, FX-W6 kinds, FX-W5 re-raise, the FX-W7 copy and hold;
- the alarm: the M1 token, its marker on exit;
- FX-W4 every 5 minutes.

### 2c. Pairs of fixes that touch the same state: the combined step

| State | Fixes | Combined step |
|---|---|---|
| Hook pass for the session-start tool | FX-CGATE 3, 4 + FX-W3 | One process: current session → armed → row at admitted → xc `start.json`. A denial writes nothing (point 9) |
| Revocation by the coordinator | FX-CGATE 3 + FX-W3 "never gated" | The arm gate never refuses a revocation. The identity gate refuses every non-Read call of a stale session, revocations included. RevocationNeverGated is read as "for the current coordinator" |
| Coordinator Bash call | FX-W1 allow-list + FX-CGATE 2 | Allow-list first, then bind recognition, both read-only. The allow-list must hold every production form the fence group uses: `handover bind --ce --nonce`, `replace fence/start/bind`, `stop request/verify`, `commit`, `status --reconcile --arm-nonces`, `--endturn --acked-seq`. Otherwise a successor can never bind (W's open row "the allow-list's content") |
| Handover brief line (H:351-354) | FX-CGATE 1 + FX-W3 | One line: the nonce and the path `tcb/briefs/coordinator.md` |
| Caller's ce in the hook | FX-CGATE 3 + FX-W3 "armed" | The hook takes ce from the matching `coord-session-<ce>` (never from the input) and compares `turn.json.ce` with it |
| `ticks_total` and the start lease | FX-CLAIM lease + FX-W7 copy + FX-W6 step 1 + M5 | The lease reads the `ticks_total` of the adopted evaluation `next`. A dropped tick advances neither the lease nor any act. A paused tick (M5) counts for the lease. FX-W6's "nothing is counted" on a fresh epoch's first tick applies to the hang and kind counters only, not to `ticks_total` (W:732 increments it before `evaluate`) |
| `ticks_total` while the watcher is dead | FX-CLAIM lease + FX-W1/W7/W4 | Point 1 |
| `rowAct` / `evaluate` act set | FX-PLAN + FX-W5 + FX-W6 + FX-W7 | Point 11 |
| Planner act against the arm | FX-PLAN 5 + FX-W3 | Point 10 |
| One fence hold | FX-W3 `first` + FX-OUT + FX-CLAIM + `lib.fence` | Point 11 |
| Child hook | FX-CLAIM 1 + FX-OUT child steps | Epoch gate (G:394-409) → claim → profile and prefix (G:412-459) → READY slot (after 459). A duplicate's READY is denied `attempt-claimed` before it can take a slot |
| Slot count | FX-CLAIM 7 + FX-CLOSE done records + callers | Every caller passes `{ root }` (point 7). The `unconfirmed` term reads `claim.json`, `run/close/done/`, and the stop-confirmed flag |
| `run/arm/` markers | FX-W1 marker + prune + FX-W3 armed + FX-W2 count | Point 6. An ensure that exits `present`, `nonce-reused` or `abandoned` without registering needs no marker (no slot names it). One that registers later (FX-W2 step 8) is an alarm and writes one |
| `turn.json` | FX-W2 (reconcile holds) + FX-W3 (endturn `spent`, `unarmed_turns`) + FX-W4 (reader) | Written only under the run lock, by reconcile and endturn. The dead-man reads it without a lock |
| READY voids suspicion (R5) | FX-OUT `readReady` + FX-W6 | The watcher's "READY of the current epoch" is a ready slot in the log (`outcomeState`, W:118-121), not READY.json |
| Owner path for a stuck close | FX-CLOSE 6 + FX-PLAN 0 + FX-W5 | `planAct` gives `owner`, so `rowAct` gives null: no act-due and no `stuck`. The owner hears through the status view, not FX-W4 (as both files have it) |
| `stop.mjs` | FX-CLOSE + FX-CLAIM 6 + FX-W6 B2 | FX-CLOSE and FX-CLAIM in their holds, as F gives them. B2 is open (point 5) |

---

## 3. Amended rule sentences for the protocol document

"Present" means the protocol text, or §16 point 2's amended text where it exists (lines 947-951). A
row marked **join** was written here because neither FIX file proposes a sentence. Each such row is
new in the join and not attacked.

| Rule | Present sentence (line) | Proposed sentence | Fix | Owner ruling? |
|---|---|---|---|---|
| R2 | "Every script that writes takes `--ce` and exits 64 on a stale one." (95-96) | "Every script that writes takes `--ce` and exits 64 on a stale one; the coordinator's hook allows a session other than the one bound to the current ce (by the one-time nonce of the brief line) only Read, so a stale coordinator can neither start nor stop a session." **join** | FX-CGATE | Q5 (start/stop clause only in Q5a); PROBE 1(c) |
| R3 | "`status.mjs --reconcile` runs at the start of every coordinator turn: a transcript on disk for the attempt folder means the start happened, so it is recorded." (106-107) | "`status.mjs --reconcile` runs at the start of every coordinator turn: the attempt's claim (the first session to pass a tool call, recorded by the hook) means the start happened, so it is recorded with that session; a transcript is a second source, and any other session in the folder is an anomaly. A session start is recorded by the hook before it runs, and the planner does not order another start while that record's lease (ticks and wall time) runs." **join** | FX-CLAIM, FX-CGATE, FX-PLAN | Q5 |
| R4 | (§16, line 957) "...and within δ on others, act-due (class 17) among them." | add: "An act-due whose condition still holds is raised again at a capped interval, and one raised three times at the cap is reported as stuck. The planner's act is one function shared with status; a row status gives to the owner raises nothing." **join** | FX-W5, FX-PLAN | R1/R2 |
| R5 | (§16, line 947, M5-amended) "...No other counter of this rule reads elapsed wall time." | L2 only: W's sentence verbatim ("No counter of this rule reads elapsed wall time, except when the process list cannot answer. Then an alarm whose `renewed_at` is older than `lease_ms`, ..."). Both branches: replace "Hang: h watcher ticks with no new call in any transcript of the attempt" (123) with "Hang: a per-kind deadline in counted ticks, read from the transcript tail (a tool call: its timeout + 12; a background wait: 60; a model call: 10); an idle child and an attempt older than `attempt_max_ticks` raise an uncharged act-due, never a fence; the first tick of an epoch counts nothing." **join** (the second sentence) | FX-W1, FX-W7 (L2); FX-W6 | L1/L2; RL-yes/RL-no; B1/B2 |
| R6-a | (§16, line 949) "`status.mjs --reconcile` at the start of every turn exits 1 alarm-missing when no alarm of the current ce is known to live (...); the coordinator then starts the alarm before anything else." | "The coordinator's first call of every turn starts `watch.mjs --alarm --ensure` in the background, which registers an alarm only when no slot holds one that has not exited; its second is `status --reconcile`, which counts the slots holding an alarm with no exit marker that is alive or unknown, and records the turn as armed only if enough are." **join** | FX-W2 (replaces M2's alarm-missing) | S1/S2 |
| R6-b | (§16, line 948) "...and exits 1 unless both sources run (2 proc-unavailable when it cannot tell)." | "...and reports each source alive, dead or unknown: exit 1 when any is dead, 2 only when none is dead and some is unknown. Every alarm writes an exit marker before it exits, so an alarm that fired or was superseded is dead, never unknown. On a dead watcher the coordinator starts a new one; on unknown it starts nothing." **join** | FX-W1; point 1 | L1/L2 |
| R6-c | (none) | add: "Acts that create work (a first fence, a start, a session start) need the turn to be armed: the confirmed slots hold alarms with no exit marker; revocations are never gated. On exit 75 the coordinator ends its turn and retries nothing. The coordinator brief lists these acts." **join** | FX-W3 | — |
| R6-d | (127-128, present) "The bound: a wake arrives while either source lives; if both wakes are lost, only the owner wakes the tree." | "The bound: a wake arrives while either source lives; a dead watcher is restarted at the next turn, within two alarm periods. A scheduled task outside the tree, which wakes the PC, alerts the owner when no alarm or no watcher lives, the process list keeps failing, an act-due is stuck (about 4.75 h), the run lock stays busy, or turns run unarmed; it cannot wake the coordinator." **join** | FX-W4, FX-W3, point 1 | H4 A/B (who reads the alert); H7 a/b (fact) |
| R7 | (§16, line 950, M6) "...replace.mjs first re-checks under the run lock for a READY of the running attempt's current epoch, and if it finds one it refuses with exit 5 ready-wins, so a READY written before the re-check wins; one written after it can still be fenced (open defect)." | "The outcome of an attempt is a log of write-once slots that the hook writes for the child's READY and the fence writes for itself, each by exclusive create; the fence first runs every refusal check, then refuses with exit 5 ready-wins on an uncommitted ready slot for every reason except first and tainted, then takes the next slot; whichever slot comes first decides, and nothing follows a fenced slot. READY.json is a copy no decision reads." **join** | FX-OUT | Q6 (same behaviour both ways) |
| R8 | "A failed task is replaced at most once (R = 1, any class)." (145) | add: "A fence of an attempt that no session ever claimed (a no-start) is uncharged for a failure reason only while fewer than `H_nostart` such fences ran in a row, and charged after; it is never charged for a planned reason." B2 only, add: "One fence per task later shown false is refunded, and R is counted as R + 1." **join** | FX-CLAIM; FX-W6 B2 | B1/B2 (refund; evidence rule open, point 5) |
| R9 | "...after the coordinator's stop it checks for 2Δ that no transcript of the session or its helpers grows, then kills processes naming the attempt folder" (153-154) | "...after the coordinator's close, recorded by the hook from the close tool's answer, it confirms only when the claim holder and every other session of the folder has a counting close record and no transcript grew over `stop_verify_deltas` ticks and `stop_verify_ms`; a committed child at started or bound is stopped the same way; after three unconfirmed rounds the owner records the close. No script kills a process." **join** | FX-CLOSE, FX-CGATE (also §16's R9 row, line 964) | Q5; PROBE 10 |
| R10 | (§16, line 951) "...it is the current attempt of an active row at admitted, started or bound or the last attempt of a committed row, or a transcript of it exists..." | append: "; and every session found in an attempt folder that has no close record and is not the claim holder of a stop-confirmed attempt takes one more slot." **join** | FX-CLAIM step 7 | — |
| R12 | "...handover.mjs kills the watcher and the alarm and raises ce; the owner starts a fresh coordinator from a one-line brief." (181-182; §16 line 958 already corrects "kills") | "...handover.mjs raises ce and writes a one-time nonce; the old watcher and alarm exit 64 on their next check; the owner starts a fresh coordinator from a one-line brief that carries the nonce and the coordinator brief, and the first session to bind with that nonce is the coordinator. If the coordinator is dead or locked out, the owner drains and raises from a terminal." **join** | FX-CGATE, FX-W3 | PROBE 7(b) |
| R13 | "A session writes only its `staging/`; ... only lib.mjs appends to the ledger. [guard-hook prevents; fsck detects.]" (206-210) | add: "The guard-hook takes no lock and writes only by strict exclusive create (no fallback, no folder creation, within its deadline): outcome slots, `claim.json`, `start.json`, `coord-session-<ce>` and close records, none of them a path a script writes." **join** | 0b, FX-OUT, FX-CLAIM, FX-CGATE (also C decision 20) | — |
| R29 | "guard-hook.mjs refuses out-of-role paths, writes to `.claude/`, Bash (except the coordinator's `node tcb/scripts/*`), ..." (310-312) | "...Bash (except the coordinator's `node tcb/scripts/*` with the flags each script's production calls use; any other flag is refused), ..." **join** | FX-W1 step 5 | — |
| Class 17 | the "Steps first match" text (C:97) is CONTRACT, not protocol | — (CONTRACT only, F §6) | FX-PLAN | — |

No rule sentence is proposed for FX-REDO (the scripts' own repeat, no rule changes) or FX-W7 in L1
(R5 is unchanged in L1).

---

## Deliberately not run

- No model run or Node command: this task is text only (charter rule 3 applies to Node; none was
  needed).
- The join's two targeted checks (part 2a) are left to the modeller. Their results decide whether
  `FIX_NOWATCHER_ALERT` and the hook order stay.
- The protocol document was not read whole: only R2-R13 (lines 93-210), R28-R29 (299-326) and §16
  point 2 (930-1013).
