## Hang watchdog and measured-peak step: built, tested once, swapped in at 09:09:45 UTC

Every gated card job of U2, U5 and U6 that starts from now on has a hang watchdog. The card gate also records each job's measured card peak. U3 is left to its own guard (`U3/guard.sh`): the watch never kills a U3 container. The one test passed every step, and the real gate and its queue were not touched.

### Files changed (each written as a `.new` copy, then `mv` over the old; the old one is kept as `.before-watchdog`)
- `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/cardgate.sh`
  - **New settings:** `GATE_HANG_U2/U5/U6`, `GATE_HANG_UTIL`=5 %, `GATE_HANG_MAX`=2, `GATE_WATCH_POLL`=30 s, `GATE_PEAK_MARGIN`=256. `GATE_HANG_T` overrides T for tests.
  - **New helpers:** `_g_util` (it honours `GATE_FAKE_UTIL`), `_g_hang_t` and `_g_learn_peak`.
  - **`gate_watch_start` and `gate_watch_stop`, rewritten:**
    - The VM sampling works as before.
    - A `docker logs -f` follower, started as soon as the container exists, keeps the "[card gate] … peak reserved N MiB" line.
    - The hang check runs at every poll.
    - The stop function logs `PEAK <unit> <job> VM x MiB (…), PEAK card N MiB (torch peak reserved) exit rc`. The line still ends in "exit rc", so the old parsers keep working.
    - It sets `GATE_HUNG` and `GATE_PEAK_CARD` for the run script.
  - **Silence timing:** a new line is detected when the timestamp from `docker logs -t --tail 1` changes, and it is timed by the host clock. The VM clock can drift after sleep, so silence is exact to one poll.
  - **Before a kill**, the watch checks that the container is still running.
  - **`gate_learn` no longer doubles.** At exit 76 it writes `pending/<unit>_<job>` (shell pid and the declaration that failed). When the alone rerun ends with exit 0, `learned/<key>` is set to max(N+400+256, the failed declaration+256, any larger existing mark), capped at 11,944. If no peak line was caught, it doubles as before. No learned file was moved or deleted.
- `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U2/run.sh`, `.../U5/run_gpu.sh`, `.../U6/run_gpu.sh`
  - `run_job` now calls `gate_watch_start <unit> <job>`.
  - The single exit-76 branch is replaced by one loop:
    - A hung job is requeued at once through the gate with the same declaration, at most 2 times, each logged as `REQUEUE … (n of 2)`. After that it fails with exit 137 and a `HANG … not requeued again` line.
    - Exit 76 still means one rerun alone, and a second 76 becomes exit 1, as before.
  - The docker command lines are unchanged.
- `bash -n` passes on all four. `sitecustomize.py`, the queue rules and U3 were not touched.

### T per unit
T = max(600 s, 2 × the longest gap between consecutive output lines in the unit's successful card runs), rounded up to the minute. The ×2 covers what those runs did not include: n32 settings, the qwen3 stages, the final jobs, and a card shared by up to four jobs. The 600 s floor covers U5's short runs. The numbers and their basis are also written in the comment in `cardgate.sh`.

| Unit | T | 2 T | Longest gap and where it comes from |
|---|---|---|---|
| U6 | 1,260 s | 42 min | 629 s, in `sw-tgn-zulip-n20_lr0.0001` on 24 Nov, 19:55:48 to 20:06:17 UTC: the epoch-2 evaluation (591 s) ran with the card full (11,925 MiB, old lock). The next longest was 468 s (bip-TGN zulip, epoch 7 to 8). I read 58 successful runs: gate.log ADMIT to PEAK, or `improve-U6.log` start to end before the gate, against the lines in `driver-*.out`. |
| U2 | 1,200 s | 40 min | 576 s, in `filter-qwen3` on 24 Nov: the zulip embedding, whose line reads "49715 chunks embedded, 576 s" with nothing printed before it. `sweep-swerank-lr` on 25 Nov had at most 130 s. `final.py` prints only at its end but keeps the card busy, so the 2 T rule applies to it. |
| U5 | 600 s (floor) | 20 min | 33 s, in fold0 on 25 Nov, from admission to epoch 1. `embed-swerank` had at most 32 s between chunk lines. |

With these values, last night's U6 hang (last line 04:00:29, card at 0 %) would have been killed at about 04:21 instead of 08:23.

### The one test
A scratch gate directory, faked admission readings, and the new U6 run script with only its card-run paths pointed at scratch. It used T=20 s and a 10 s poll. The dummy job's runs 1 and 2 print and then go silent, run 3 exits 76, and run 4 runs alone and puts 256 MiB on the card. Output (gate.log lines, abridged):
```
09:06:09Z HANG U6 watchdog-test container gate-u6-519618-1795597531: no output line for 24 s and the card at or below 5 % use all that time (T 20 s); card use now 0 %, at most 0 % since its last line; docker kill; the run script requeues it through the gate (at most 2 times)
09:06:10Z PEAK U6 watchdog-test VM 296 MiB (docker stats every 10 s), PEAK card ? MiB (torch peak reserved), hung: killed by the watchdog exit 137
09:06:10Z REQUEUE U6 watchdog-test after a hang (1 of 2), declared 600 MiB
09:07:12Z HANG U6 watchdog-test container gate-u6-519618-1795597570: no output line for 48 s (2 T = 40 s; card use up to 90 % meanwhile, perhaps another job's); ... docker kill; ...
09:07:13Z REQUEUE U6 watchdog-test after a hang (2 of 2), declared 600 MiB
09:07:18Z PEAK ... exit 76 / LEARN ... rerun alone ...
09:07:21Z ADMIT U6 watchdog-test ... card 11944
09:07:24Z PEAK U6 watchdog-test VM ? MiB (...), PEAK card 260 MiB (torch peak reserved) exit 0
09:07:24Z LEARN U6 watchdog-test: the alone rerun ended exit 0; its kind (U6:watchdog-test) declares 916 MiB from now on (peak reserved 260 + context 400 + margin 256)
```
The run script ended with exit 0, and nothing was left over: no watch files, no pending marks, no containers. The test and its full output are in `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/47ff9697-59ce-45a5-af48-3685601dc766/scratchpad/wd/test.sh` and `.../wd/test.out`.

### What is not covered
- **Two jobs on the card now have no watchdog.** U6 `sw-tgn-zulip-n20_lr0.001` (pid 352617) and U6 `sw-dygformer-zulip-n32_lr0.0003` (pid 521449) were admitted at 09:07, before the swap, and keep the old code. Your `watch7.sh` remains their only check.
- **The four shells waiting now (U2 404883 `sweep-swerank-lr-epochs`, U6 503213, U5 506722 fold1, U3 509956 a6-chain) loaded their run scripts earlier.**
  - When admitted, they pick up the new watch: it is called without arguments and takes the unit and job from the ledger.
  - If one of them hangs, it is killed with no requeue, and its HANG line says so.
  - U5's driver retries 3 times, and U6's `finish.sh` reruns settings that lack results.
  - **U2's chain would stop** (`run_sweeps.sh || exit 1`) and has to be restarted by hand.
  - U3 is never killed.
  - This no-argument path is the one part the test did not exercise. These shells have sourced the new file and are alive, with no errors in their logs.
- **The learning change affects every unit, U3 included, and the old shells.** No mark is written at the exit 76 itself, so a job of the same kind that starts during the alone rerun declares the old need. It may hit 76 too, and then reruns alone itself.
- **Not fixed (outside this brief):** U2's end line still reports a stale `gpu.peak`.

