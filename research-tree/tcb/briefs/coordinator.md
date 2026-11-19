# Coordinator brief

The acts of one coordinator turn, in order (model/as-built/FIX-JOIN.md part 2b). Each place names the one
round-3 fix that fills it and reads "(empty until <fix>)" until that fix lands; an act that several fixes
touch (0 and 5) has one sub-step per fix. Until then the coordinator works from the brief line of
`handover.mjs` and `run/status.json`, as before.

## 0. Wake (FIX-JOIN part 2b row 0)

### 0a. An alarm exits 30, 0 (superseded) or 64, each after its exit marker (FX-W1)

(empty until FX-W1)

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

(empty until FX-W2)

## 3. Call 2, in the foreground: reconcile (FX-W2)

(empty until FX-W2)

## 4. Restart a dead watcher (FX-W1, FIX-JOIN point 1; on exit 2, start nothing)

(empty until FX-W1)

## 5. Revocations, always (FIX-JOIN part 2b row 5)

One sub-step per fix: the fence hold in the order of FIX-JOIN point 11 (FX-OUT steps 1-5, then FX-CLAIM's
tombstone), then the close of a session (FX-CLOSE steps 3-5, with the hook's FX-CGATE steps 5-6 at its
step 4; point 9).

### 5a. `replace fence`, any reason but `first`: the refusals, the ready check, the fenced slot; `commit` refuses a fenced log (FX-OUT)

(empty until FX-OUT)

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
