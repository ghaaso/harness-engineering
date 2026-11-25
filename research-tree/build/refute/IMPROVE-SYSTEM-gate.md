# System review of the improvement round, part "gate" (r57-0097, 2026-11-25, 08:59-09:20 UTC)

Verdict: 2 BREAKING, 6 SERIOUS, 11 NOTES.

File times read (UTC): cardgate.sh 08:45:44 (first read), then 09:04:07 (watchdog, new file id, so written by rename);
U2/run.sh 09:04:49, U5/run_gpu.sh 09:04:49, U6/run_gpu.sh 09:04:26 (watchdog, by rename); U3/run.sh 19:56:50 on 24 Nov;
gatesite/sitecustomize.py 08:37:58. Watchdog report `units/WATCHDOG/report.md` 09:11:08: read last.
Repros ran only on copies in `CR/review-2026-11-25/gate/` (fake readings, no card, no Docker).

## BREAKING

### B1. U2's run.sh always exits 0, so chain.sh goes on to final and fill_table after a failed stage
- Where: `code/U2/run.sh` gpu branch, last line (old 45, new copy same): the branch ends with `echo ... >> $LOG`, with no
  `exit $rc`. Callers: `code/U2/run_sweeps.sh:6` (`./run.sh gpu ... || exit 1`) and `CR/improve/U2/chain.sh:4-7`
  (`|| exit 1` after resume-test2, the sweeps, final-swerank, final-qwen3). U3/run.sh has the same ending. U5 and U6
  end with `exit $RC` and are sound.
- Scenario: any stage of the U2 sweep ends non-zero: a second 76, exit 1, 137 from the new watchdog after its 2 requeues,
  or 125 when Docker is down. run.sh returns 0 and the chain goes on. `sweep.py` writes `<tag>.frozen.json` at the end
  of every stage call (lines 131-132), and the file does not record which stages it covers. If the last stage (data) of
  a model fails, the frozen file from the stage before stands (`swerank.frozen.json` from the lr stage is on disk now,
  08:33 local). final.py then freezes and scores on held-out with that choice, and fill_table writes U1's table.
  If final-* is killed part-way, `heldout/<repo>/rank_a5_<tag>ft.jsonl` is written one repo at a time, not atomically:
  some repos come from this run and some are old or missing. fill_table still runs and the chain prints CHAIN_DONE.
  The only trace is an `end exit=N` line in `logs/improve-U2.log`.
- Evidence: repro `review-2026-11-25/gate/mask.sh` (same shape: EXIT trap, case, rc=1, then echo): script exit 0.
  The watchdog's new run.sh still ends in the echo. The coordinator's note "U2's chain would stop" is wrong: it does
  not stop, it goes on.
- Happened: no. Every U2 card run since the gate ended 0. Remaining: 9 sweep stages and 2 finals, now under a
  watchdog that can end them with 137. Likely enough to matter.
- Repair: add `exit $rc` as the last line of the gpu branch in U2/run.sh and U3/run.sh. The running chain's
  run_sweeps.sh calls ./run.sh fresh for each stage, so the fix takes effect from the next stage.

### B2. An "alone" waiter blocked by desktop or undeclared memory holds the whole card idle, and nothing reports it
- Where: `cardgate.sh` `_g_try`: line 169 (an alone job needs R=0), lines 188-189 (an alone job needs cneed >= 8864),
  and `_g_backfill` `[ $nrun -gt 0 ] || return 1` (the 08:37 fix).
- Scenario: the oldest waiter needs the card alone (11944). In the queue now: U5 fold1 (and later fold2, fold3 and
  final), and U3 a6-chain. After 600 s it is reserved at 11944. If desktop D + undeclared X > 2,568 MiB, the alone job
  cannot start (cneed = 11944 - D - 512 - X < 8864). Every other job is refused (S + R + need > budget). Backfill
  refuses as well, because no job is running, on the premise "the reserved job can start now", which is false here.
  The card stays empty until the desktop frees memory. Nothing goes to gate.log, only a line every 5 min in the
  job's own stdout. watch7.sh's stall check needs a U6 job in the ledger, so it stays silent too. X also counts an
  orphan container or a GPU process that the ledger does not know about.
- Evidence: repro on a copy with fake readings (used 3000, vmwp 0). Alone waiter: "alone job: only 8432 MiB free of
  desktop (3000)". Small job: "declared 0 + reserved 11944 + 2048 > 10332". With used 2400 the alone job is admitted.
  Other programs took 3,626 MiB at 17:03 UTC on 24 Nov (state file line 155). Since the gate started, D measured at
  admissions was 400-850 MiB (the log shows the 1,100 floor).
- Happened: no (owner-side use stayed low overnight). Remaining: likely during the owner's day while alone jobs queue.
- Repair: in `_g_backfill`, allow backfill on an empty card when the reserved job is itself refused for D/X (keep a
  flag in `_g_try`). Log a `WAIT` line to gate.log once the oldest waiter has been blocked 30 min with an empty ledger.

## SERIOUS

- S1. U5's fold and final jobs declare the whole card although they measured 3,696 MiB peak reserved
  (`job-fold0.log`; `gate_need` U5: anything other than embed* gets GATE_USABLE). Each fold (51 s of work) waits
  behind every older job, then empties the card, and the threshold in B2 applies to it. fold0 waited 5.6 h. Repair:
  `fold*|final) c=4608` (peak + 400 + margin), or GATE_CARD_MIB in sweep_driver's job().
- S2. Coordinator 7's event watcher never fires on gate events
  (`.../47ff9697.../scratchpad/watch7.sh`, pid 510396). The pattern `"LEARN|FAILED|WARN|HANG\|..."` is a basic
  regex, so `|` is a literal character. Repro: a LEARN line does not match (rc=1). Later HANG, REQUEUE, LEARN and
  WARN lines in gate.log will go unseen. Repair: `grep -qE "LEARN|FAILED|WARN|HANG"`.
- S3. The mutex can be held across hung external calls. `_g_try` runs docker ps, nvidia-smi, powershell Get-Counter,
  wsl.exe and docker stats with no timeout. After 120 s another waiter breaks the mutex (`_g_lock`). The old holder's
  `_g_unlock` then removes the new holder's mutex, so two admissions run at once. With Docker down, `docker ps` gives
  no names and the sweep frees any entry whose shell is dead even if its container still runs. No "mutex broken" so
  far (0 in gate.log). Repair: `timeout 20` on each external call, and unlock only if mutex/pid is our own.
- S4. Watchdog 2T rule against U2 final.py (not proven). final.py prints nothing until it ends (the report says so).
  It encodes every chunk of the three repositories; U1's equivalent dense job took 1,290 s alone. On a card shared
  by up to four jobs this can pass 2T = 2,400 s: then 3 kills, exit 137, masked to 0 (B1), and fill_table runs. To
  settle: time `final.py qwen3` alone, or add a log line per repository in final.py.
- S5. If the watchdog's `docker kill` fails, the hang file is removed and the watch loop `break`s. The hung job then
  runs on unwatched for ever. Repair: `continue` instead of `break` when the kill fails. On the coordinator's
  question: the watchdog kills the whole container (`docker kill`, all processes in it). It does not have guard.sh's
  wrapper-only gap. The WATCHDOG test shows exit 137 within 1 s.
- S6. Nothing restarts the round after a reboot (3 shutdowns on 24 Nov). The gate's own state comes back by itself:
  dead pids are swept and MSYS pids are a counter, now at about 520k, that starts low after a boot. The drivers do
  not come back. The only restart list (state file line 172) names U5's cpu_worker x2 + sweep_driver and the three U6
  run_sweep lines. It does not name U2 chain.sh, U3 a6-chain, U6 finish.sh or the U5 driver's state now.
  Repair: one restart list, kept current, at the top of the state file.

## NOTES
1. gate.log writes "(torch cap 0)" for a waiter that entered as alone and was lowered by the UNLEARN rewrite. The
   real cap is set afterwards (`gate_admit` line 229): 398267 ran at 7,280 MiB (driver-zulip.out:503). The log is
   misleading, but no harm.
2. `gate_need` applies the n32 x5/4 before the learned mark replaces c, so a mark learned on n20 is used unscaled
   for n32, and the reverse. The same kind key also covers `final-*` jobs. With the watchdog's measured-peak marks,
   expect one extra OOM and alone rerun per TGN kind.
3. The new `gate_learn` writes the mark only after the alone rerun ends 0. Until then, parallel jobs of the same
   kind (three zulip drivers) can each OOM under the old declaration.
4. In the rerun-after-76 wait, the MON loop keeps polling nvidia-smi (398442 for 352617 polled for 5.8 h). The end
   line's "peak card memory used" then covers the whole wait and other jobs.
5. `secs=` in the end lines includes the rerun's wait time, so `_g_hist` maximums grow and backfill is refused for
   that kind. This only makes the gate more careful.
6. `gate/held/1795550384-115321` is stale (that pid is gone); the gate code does not read it.
7. The VM kernel ring buffer is flooded by `dxgkio_escape: Ioctl failed: -22` (4,095 lines, oldest at boot+19,709 s).
   Docker's `log/vm` rotates in about 45 min. An OOM kill in the container VM (cause of the 137 of a4-frozen) can no
   longer be shown. Declared VM needs are low: U6 bip-tgn-zulip measured 5,138 MiB against 2,560 declared (PEAK lines).
8. The ring buffer also holds a page allocation failure in a 9p write (boot+19,709 s, about 19:09 UTC 24 Nov). This
   is a likely mechanism for the "unexpected pos" torch.save failures through the mounted folder (for the graph reviewer).
9. Any top-level code added to cardgate.sh runs in every waiter every 20 s, because `gate_admit` re-sources it.
   Keep the file to definitions only.
10. A docker client that dies while its container runs releases the ledger slot (rc != 0). X still counts the card
    memory, but the U6 claim is removed, so finish.sh could start the same setting beside the orphan.
11. `U2/resume_test.py:21` catches RuntimeError, which also catches torch.OutOfMemoryError from the first run, so the
    exit-76 hook does not see it (for the text reviewer).

## Checked and found sound
- Admission arithmetic against the card: no card-full rows (>11,500 MiB) in `gpu-telemetry-2026-11-24.csv` after
  20:33 UTC on 24 Nov. The only full-card spell (19:48-20:33) was the known dry run. Now: vmwp dedicated 6,793 MiB,
  shared 83 MiB, desktop 825.
- The cap is set in every gated container, never "FAILED to set the cap" (caps seen: 1648-9930 MiB); expandable
  segments are logged; per-process GATE_SEEN covers U3's sequential Python processes.
- Two admissions at once under the mutex; the reservation and 600 s rule (FIFO in practice); the UNLEARN rewrite.
- Ledger after a kill or reboot: dead shell and no container leads to a freed slot. MSYS kill -0 does not see
  Windows pids (tested), so pid reuse is improbable.
- Requeue limits are bounded everywhere: U6 one alone rerun + 2 hang requeues; U5 3 tries, then the driver exits
  (watch7 catches "gave up"); finish.sh 3 passes. No endless loop.
- No duplicate of a running job: U6 `sw-*` claims; one U2 chain, one U5 driver, one a6-chain alive (ps).
- Exit code map: 76 = OOM under the cap, 75 = the old cap (no code emits it now), 3 = claimed, 137 = hang or kill.
- The watchdog (09:09): written by `.new` + `mv` (file ids changed), so running and waiting shells kept their parsed
  copy. A repro shows an in-place edit would make a sleeping bash run a cut line ("ger: command not found"). The
  watchdog kills the whole container. Its T values against measured gaps: U6 first line 2 min after admission,
  epochs 2 min; U5 make_blocks within 33 s; U2 lines every 18 s in training and 120 s in evaluation. Legacy shells
  get the watch without requeue (known). The two jobs admitted at 09:07 run with the old watch (known).

## Not examined
- Whether `final.py` for qwen3 fits the 2T window (S4: not timed).
- The new watchdog under a real hang on the card (only the helper's one scratch test).
- docker events or VM logs for the cause of a4-frozen's 137: the logs no longer reach back.
- U3/guard.sh's kill gap (another reviewer's). The units' training code beyond its exit and OOM paths.
