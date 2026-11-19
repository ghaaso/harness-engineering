# Coordinator brief

The acts of one coordinator turn, in order (model/as-built/FIX-JOIN.md part 2b). Each heading names the
round-3 fix that fills it; a section reads "(empty until <fix>)" until that fix lands. Until then the
coordinator works from the brief line of `handover.mjs` and `run/status.json`, as before.

## 0. Wake (FX-W1, FX-W3, FX-W4)

(empty until FX-W1)

## 1. Bind, on the successor's first turn only (FX-CGATE)

(empty until FX-CGATE)

## 2. Call 1, in the background: the ensure (FX-W2; S1: one ensure)

(empty until FX-W2)

## 3. Call 2, in the foreground: reconcile (FX-W2)

(empty until FX-W2)

## 4. Restart a dead watcher (FX-W1, FIX-JOIN point 1; on exit 2, start nothing)

(empty until FX-W1)

## 5. Revocations, always (FX-OUT, FX-CLAIM, FX-CLOSE, FX-CGATE session stop)

(empty until FX-OUT, FX-CLAIM, FX-CLOSE and FX-CGATE)

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
