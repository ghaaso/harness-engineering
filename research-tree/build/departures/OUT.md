# OUT departures (FX-OUT, the outcome log and the READY fence; branch u/OUT)

Design places: `model/as-built/FIX-fence.md` section 1 and its reading rules R-a to R-c (F), `FIX-JOIN.md` 2c
(J). Tests named are on u/OUT at e38717a3 (lane labels in `units/OUT/result.md`).

1. **Two READY.json readers stay: watch class 12 and the zombie-write telemetry.** J 2c moves the READY of an
   epoch into the outcome log, and class 11 (watch) and `readyPending` (status) now read the log. Class 12 (a
   repair READY) still reads `staging/READY.json`, because the hook lets a repair marker through without a slot
   (it is no outcome), so the log cannot carry it. The zombie-write line (watch) and anomaly (status) also still
   read READY.json: they are telemetry, they decide nothing. Tests: watch.test.mjs X2 (repair READY exits 12),
   T7 (one zombie-write line, no class 11).
2. **lib.test.mjs, the skeleton test's `const stubs = {...}` line (S0.5 round-3 skeleton) is edited:**
   `outcomeState` and `outcomeAppend` are built, so they leave the stub list. W1 (`liveness`) and CLAIM
   (`readClaim`, `claimRecord`, `tombstoneRecord`) edit the same line, so a landing conflict there is expected:
   resolve it as the union of the removals.
3. **status's anomaly `ready-unparseable` is replaced by `outcome-tamper`** (detail `{task, epoch, why}`),
   since READY.json no longer decides `readyPending`; a log that does not read is the anomaly. The anomaly list in
   `spec/status.mjs.md` line 62 still names `ready-unparseable` (line 28 of that spec says `outcome-tamper`): the
   list line is shared with the other units that edit status, so it is left for S2.2. No status test asserts
   this anomaly; fsck.test.mjs FX-OUT 6 and guard-hook.test.mjs FX-OUT 2 cover the same failed reads.
4. **commit T15 changed: a READY of epoch 1 in the epoch-2 folder now exits 2 `no-ready`, not 1
   `ready-mismatch`.** Such a READY takes no slot (the hook denies it `ready-invalid`), so record finds no ready
   slot. `ready-mismatch` 1 is kept for a ready slot of an earlier step only (a new case in the same test).
   Test: commit.test.mjs T15.
5. **More than R-c's "a slot that does not parse" is tamper.** `outcomeState` throws `outcome-tamper` 3
   (detail `why`) also for a slot whose bytes are not the canonical slot (`slot-shape`), a slot of another task
   or epoch (`slot-owner`), a gap, a slot after the fenced one (`after-fenced`), a digits name that is not plain
   `<j>.json` (`slot-name`: leading zeros, an upper-case extension, ten digits or more), a slot that is not a
   regular file and an `outcome` that is not a real folder. Strict creates by
   the hook and the fence cannot make any of these, so each one is a writer outside them, and reading past it
   would let a forged slot decide a commit or a fence. Tests: fsck.test.mjs FX-OUT 6, guard-hook.test.mjs
   FX-OUT 2.
6. **Two shared lines left unchanged:** CONTRACT 3.6's row text ("READY of e present") and guard-hook.mjs header
   line 8 ("No step writes yet"; the hook now writes a ready slot). Other fixes edit both; S2.2 rewords them.
7. **selftest.test.mjs not run:** not one of OUT's test files, and its fixtures write no READY and no
   `outcome/` (its "outcome" names are probe outcomes). The root's full suite covers it.
