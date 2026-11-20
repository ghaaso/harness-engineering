# Coordinator brief

The acts of one coordinator turn, in order (model/as-built/FIX-JOIN.md part 2b). Each place names the one
round-3 fix that fills it and reads "(empty until <fix>)" until that fix lands; an act that several fixes
touch (0 and 5) has one sub-step per fix. Until then the coordinator works from the brief line of
`handover.mjs` and `run/status.json`, as before.

## 0. Wake (FIX-JOIN part 2b row 0)

### 0a. An alarm exits 30, 0 (superseded) or 64, each after its exit marker (FX-W1)

An alarm that has registered creates its exit marker `run/arm/exited-<pid>-<start_time>.json` {ce, exit, at} just
before it exits: 30 `alarm` (a whole period passed with no endturn), 0 `superseded` (`alarm.json` names a newer
alarm), 64 `stale-ce`, or an error exit (67, 70). That exit wakes you. From then on the alarm is dead, never unknown,
whatever the process list says: reconcile reports it as `arm-unconfirmed` (FX-W2, place 3) and endturn as
`alarm-missing`. The marker is the alarm's own:
never write, move or delete anything under `run/arm/`; reconcile prunes the old markers. A hard kill writes no marker:
the process list alone then judges that alarm, and a list that cannot tell makes it unknown, never dead (endturn
exit 2); on unknown, start nothing.

### 0b. On exit 30, an `unarmed` record when `turn_seq` has not moved (FX-W3)

An alarm whose period ends (exit 30) first reads `run/turn.json`'s `turn_seq`. When it still equals the
`turn_seq_at_reg` its slot record took at registration, no reconcile ran in a whole alarm period, and it creates
`run/arm/unarmed-<pid>-<start>.json` {ce, turn_seq} before its exit marker. The dead-man (FX-W4) alerts the owner
when two such records of the current ce carry one `turn_seq`. Nothing to do for it: begin the turn with calls 1 and
2 (places 2 and 3), which move `turn_seq`.

### 0c. The owner wakes the coordinator after the dead-man's alert (FX-W4)

A scheduled task the owner installs (`tcb/settings/deadman-task.xml`) runs `status.mjs --deadman` every 5 minutes,
waking the PC, and shows him a toast when no alarm or no watcher of your ce has lived for two of its runs, the process
list failed in 3 of its last 5 runs, an act-due is stuck, the run lock stays busy, or turns run unarmed
(`unarmed_turns` 3, or two unarmed records of one `turn_seq`). While the cause holds, the toast comes again every 6
runs (30 min). The task cannot wake you; the owner does, with a turn he types. It is an ordinary turn: begin with
calls 1 and 2 (places 2 and 3), which arm it, and start the watcher at place 4 when it is not alive. Never run
`status.mjs --deadman` yourself: the runs are the task's, one of yours counts toward its pace, and its alert reaches
no one. `run/deadman.json` is its file: never write it. The anomaly `deadman-nowake` in `run/status.json` (no
record, a stale one, or a gap in its runs) says the task does not run every period: tell the owner (its install, or
wake timers in the power plan); it changes none of your acts.

## 1. Bind, on the successor's first turn only (FX-CGATE)

The owner's brief line ends with your bind call: `node <root>/tcb/handover.mjs bind --root <root> --ce <ce> --nonce <X>`.
Run it exactly as written as the first call of your first turn, before any other call. Until it has run, every call
but a Read under your read paths is refused (`stale-coordinator`). Exit 0: you are the coordinator of this ce. A
refusal (`bound-elsewhere`, `nonce-mismatch`, `not-bound`, `no-nonce`): stop and tell the owner; never retry with other
values. Never bind on a later turn.

## 2. Call 1, in the background: the ensure (FX-W2; S1: one ensure)

The first call of every turn (after the bind, on a successor's first turn) starts the alarm as the ensure, as a
background command: `node <root>/tcb/watch.mjs --alarm --ensure --nonce X --root <root> --ce <ce>`. X is a new
nonce each turn, 32 lowercase hex; never reuse one. `--alarm` without `--ensure --nonce X` is refused (exit 66;
the hook admits only this form). Under S1 there is one ensure per turn and no second nonce. The ensure records its
outcome in `run/arm/<X>.json`; it registers in the free slot `run/arm/slot-1.json` and then sleeps as the alarm
(its later exits are place 0a), or finds the slot held by an alarm that has not exited and exits 0 `present`. Its
exits before it registers (0 `present`, `nonce-reused` or `abandoned`, 64, 75) write no marker and ask nothing of
you: whether the turn is armed is reconcile's verdict (place 3). Do not wait for the ensure; make call 2 at once.

## 3. Call 2, in the foreground: reconcile (FX-W2)

Right after call 1: `node <root>/tcb/status.mjs --reconcile --arm-nonces X --root <root> --ce <ce>`, with call 1's
X. Reconcile writes `run/turn.json` (`turn_seq` + 1, `read_seq`, arm `unconfirmed`), waits for the ensure's outcome
(at least `release_ms`, at most `arm_confirm_ms`), then counts the live slots. A slot is live only by what the
scripts wrote (a slot record of this ce with no exit marker that the process list does not judge dead), never by
the nonce you pass. Exit 0: the arm is `confirmed`, and this turn may create work (place 6). Exit 1
`arm-unconfirmed` {ce, live, need, slots}: the turn is unarmed and `unarmed_turns` grows by one; do the
revocations (place 5, never gated by the arm) and start nothing that creates work (FX-W3 refuses it, exit 6
`not-armed`); the next turn's call 1 ensures again with a new nonce. A later reconcile in the same turn runs
without `--arm-nonces` and keeps a `confirmed` arm (B1.4). Exit 75: place 8.

## 4. Restart a dead watcher (FX-W1, FIX-JOIN point 1; on exit 2, start nothing)

After call 2, read the status reconcile printed (`result.status`, the same as `run/status.json`). When
`watcher.alive` is false (no watcher record, a dead one: anomaly `watcher-dead`) or `watcher.ce` is not your ce
(anomaly `watcher-stale-ce`), start the watcher as a background command: `node <root>/tcb/watch.mjs --root <root>
--ce <ce>`. Do the same when endturn exits 1 with `watcher-missing` (place 9). When `watcher.alive` is null (the
process list could not tell) or endturn exits 2 `proc-unavailable`, start nothing: the old watcher may live and hold
`watcher.lock`, and the dead-man alerts the owner while the list keeps failing. Starting the watcher creates no work
and is never gated by the arm.

## 5. Revocations, always (FIX-JOIN part 2b row 5)

One sub-step per fix: the fence hold in the order of FIX-JOIN point 11 (FX-OUT steps 1-5, then FX-CLAIM's
tombstone), then the close of a session (FX-CLOSE steps 3-5, with the hook's FX-CGATE steps 5-6 at its
step 4; point 9).

### 5a. `replace fence`, any reason but `first`: the refusals, the ready check, the fenced slot; `commit` refuses a fenced log (FX-OUT)

An attempt's outcome is its log `wt/<task>-e<e>/outcome/<j>.json`, never `staging/READY.json` (a copy).
`replace fence` makes every refusal before it writes: exit 65 `stale-epoch` or `wrong-step`, or exit 1
`hmax`, leaves no slot. Exit 5 `ready-wins`: an uncommitted ready slot wins over every reason but `first`
and `tainted`; do not fence again for it, audit and commit the step instead. Exit 65 `fence-pending`
(detail `reason`): a fence with that reason wrote its slot and did not finish; call `replace fence` again
with exactly that reason, never another. `commit record` exits 1 `attempt-fenced` on a fenced log: the
fence won; finish that fence first. Exit 3 `outcome-tamper`: stop and report it.

### 5b. The tombstone, in the same fence hold before `lib.fence`; `--if-unclaimed` (FX-CLAIM)

(empty until FX-CLAIM)

### 5c. Close a session: `stop request` to the claim holder, the close tool (5d), then `stop verify` (FX-CLOSE)

`stop request` names the session to close (`session`, the claim holder; after a tombstone, `sessions`). Close it
and every other session of that attempt folder with the close tool (5d), then run `stop verify` when its act is
due: the first call samples (exit 6), a later one compares once `stop_verify_deltas` ticks and `stop_verify_ms`
have passed (exit 6 `waiting` before). Exit 1 `stop-unconfirmed` with reason `close-missing` lists the CLI ids
whose close is not recorded. The hook records your close under the app's id, which verify cannot read yet, so
tell the owner which sessions you closed; only on the owner's own words, record each with `status.mjs owner --act
closed --subject <CLI id> --quote-file P` (the words in P). Never write that act without them. After three
unconfirmed rounds `next` is `owner`.

### 5d. The close tool: the hook records the intent before the call and the close after it (FX-CGATE)

Close with `mcp__ccd_session_mgmt__archive_session`, `session_id` = the app's id of the session (`local_<uuid>`, as
the start tool or the session list gave it); never `self`, never the CLI id (a bare UUID): the hook refuses both
(`bad-target`). A session still working: `mcp__ccd_session_mgmt__stop_session` with the same id first, then archive.
The hook writes `run/close/intent/<id>.json` before the call and `run/close/done/<id>.json` after an answer it can
read (archived or already archived: `stopped`; not found: `no-such-session`). Any other answer leaves the close
open: tell the owner, who records it with `status.mjs owner --act closed --subject <the CLI session id>`.

## 6. Acts that create work, only when call 2 confirmed the arm (FX-W3; a session start only on a turn the owner typed, Q5a)

Only after call 2 exited 0 in this turn (arm `confirmed`), and only the acts status names for a row (`next`):
- `replace-start`, and `replace-fence` of a planned row (reason `first`): `node <root>/tcb/replace.mjs start --task
  T --epoch E --root <root> --ce <ce>` (or `fence ... --reason first`). Not armed: exit 6 `not-armed`, nothing
  written; the act stays due.
- `start-session` (the row active at admitted, epoch E), **only on a turn the owner typed** (his own words began
  it). On a turn begun by an alarm's or the watcher's exit, a helper's notice or a session's message the app
  refuses a start: do not call the tool, leave the act due (the watcher raises it again; the owner's next typed turn
  takes it). The call: `mcp__ccd_session__start_session` with `initiation` `user_asked`, `cwd` exactly the absolute
  folder `<root>\wt\<T>-e<E>`, `use_worktree` false, `context` `fresh` (or left out), a `title`, the child's brief
  as `prompt`, and `background` (at least 80 characters); `target` only `local` or left out, and never `host`,
  `preset`, `environment`, `repository`, `proposal_id`, `source_branch` or `branch_name`. The hook denies the start
  when the turn is not armed (`not-armed`), the row is not active at admitted at E (`wrong-step`), the folder or
  an input is any other (`bad-target`), or another start of the attempt is recorded (`start-issued`); a denied
  start writes nothing. Bind once the claim exists (place 7).

Armed means: `run/turn.json` of your ce, arm `confirmed`, and no exit marker for its slots. It lasts until endturn
(arm `spent`) or until the confirmed alarm exits: an alarm that fires mid-turn leaves its marker and ends the arm
for the rest of the turn. Revocations (place 5) and the watcher's start (place 4) are never gated.

## 7. Bind a session: `replace bind --session` once a claim exists (FX-CLAIM)

(empty until FX-CLAIM)

## 7a. Close a session (FX-PLAN)

A row's `next` (status.json) or act-due `close-session <sid>` names a session (CLI id) counted against the slots that
no stop is closing: a late or duplicate session of an attempt. Close it with the close tool as in 5d, by its app id
(`local_<uuid>`, from the session list); if you cannot find it, tell the owner, who records `status.mjs owner --act
closed --subject <sid>`. `next` `owner` for such a row means its close was recorded but does not count. Other acts
with arguments are run with exactly those words: `replace-fence --reason <r>` (a fence that wrote its slot and did
not finish) and `replace-fence --reason crash --if-unclaimed` (a start lease that ran out; exit 5 `claimed-late`:
the next act is `bind`).

## 8. Any script exits 75: retry nothing, then endturn (FX-W3; N2 in place of "end the turn")

A script that exits 75 (`lock-busy`): retry nothing. The turn still ends with endturn (place 9), its last call
after a 75 as after anything else. If endturn itself exits 75, end the turn.

## 9. The last call, always: endturn (FX-W3; N2, E1)

Every turn's last call, also after `handover` exit 2, after any exit 75 and after an unarmed reconcile:
`node <root>/tcb/status.mjs --endturn --acked-seq K --root <root> --ce <ce>`. K is the turn's `read_seq`: the
`result.status.ledger.seq` of this turn's reconcile, or, when no reconcile of this turn printed a status (it exited
75), the `ledger.seq` of `run/status.json`. Endturn acknowledges K only while `run/turn.json` is of your ce and K is
neither above its `read_seq` nor below the stored `acked_seq`; otherwise it exits 1 `acked-ahead`,
`acked-backwards`, or `turn-stale` (no reconcile of your ce wrote the turn), and nothing is acknowledged. It spends
the arm (`spent`) and, in every case, reports the two wake sources alive, dead or unknown. Act on its exit 1
**once**, then end the turn:
- `alarm-missing`: ensure again (place 2's call, a new nonce);
- `watcher-missing`: start the watcher (place 4);
- `acked-ahead`, `acked-backwards` or `turn-stale` alone: nothing more (the lines stay unacknowledged and are
  raised again).

Exit 2 `proc-unavailable` (none dead, some unknown): start nothing. Exit 75: end the turn. Do not run endturn again
to check that act; a second endturn with the same K is accepted. A turn that ends without endturn (it died, or the
call was omitted) is not recovered at once: the dead-man (FX-W4) alerts the owner (E1).
