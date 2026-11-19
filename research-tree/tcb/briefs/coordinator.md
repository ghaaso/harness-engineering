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

(empty until FX-W3)

### 0c. The owner wakes the coordinator after the dead-man's alert (FX-W4)

(empty until FX-W4)

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

(empty until FX-W1)

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

(empty until FX-CLOSE)

### 5d. The close tool: the hook records the intent before the call and the close after it (FX-CGATE)

Close with `mcp__ccd_session_mgmt__archive_session`, `session_id` = the app's id of the session (`local_<uuid>`, as
the start tool or the session list gave it); never `self`, never the CLI id (a bare UUID): the hook refuses both
(`bad-target`). A session still working: `mcp__ccd_session_mgmt__stop_session` with the same id first, then archive.
The hook writes `run/close/intent/<id>.json` before the call and `run/close/done/<id>.json` after an answer it can
read (archived or already archived: `stopped`; not found: `no-such-session`). Any other answer leaves the close
open: tell the owner, who records it with `status.mjs owner --act closed --subject <the CLI session id>`.

## 6. Acts that create work, only when call 2 confirmed the arm (FX-W3; a session start only on a turn the owner typed, Q5a)

(empty until FX-W3)

## 7. Bind a session: `replace bind --session` once a claim exists (FX-CLAIM)

(empty until FX-CLAIM)

## 7a. Close a session (FX-PLAN)

(empty until FX-PLAN)

## 8. Any script exits 75: end the turn, retry nothing (FX-W3)

(empty until FX-W3)

## 9. The last call, always: endturn (FX-W3; N2, E1)

(empty until FX-W3)
