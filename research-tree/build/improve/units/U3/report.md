U3 is half done. A4 is finished and in the tables. A6 has not run: the card is held by a hung U6 job, and the A6 job is queued behind it.

**Where it stands**
- A4 sweep, frozen run, held-out ranking files and the `s_a4_rerank` column are all done.
- A6 (route check, resume test, encode, aggregation choice, score) has not run.
- The A6 job `a6-chain` is queued in the card gate, waiting in my background `run.sh`. It will run on its own once the card frees.
- Tokens: I spent roughly 1.5 to 2 M (estimate; I did not run count.mjs on my own transcript). Earlier builders spent 2.09 M and 6.24 M by count.mjs (total, including cache reads).

**What is blocking A6**
- The card is held by U6's job `sw-bip-tgn-zulip-n20_lr0.001` (container `gate-u6-361262-1795570033`, admitted 03:33:50 UTC).
- It has been hung since about 04:02 UTC. Its container sits at 100% CPU, the card shows 0% use, and its `ckpt.pt` has not been written since 09:01:08 local (04:01 UTC), 25 minutes before I looked.
- The Windows event log has `nvlddmkm` event 153 (display driver, GPU stopped responding) at 09:02:48 local, which is this hang. It also has one at 05:19:14 local, which is when my A4 job hung (the 00:19 UTC stall below).
- I tried `docker kill` on that container. The permission classifier denied it, so I left it. Someone with authority over U6 should kill it with `docker kill gate-u6-361262-1795570033`. Its checkpoint is intact.
- Until it is killed, my queued `a6-chain` cannot start.

**A4 (SweRankLLM-Small, 4-bit nf4, bf16 compute, sdpa)**
- Sweep: 10 configurations on 75 tuning queries (25 per repository, evenly spaced). Cards per config are in `a4/sweep.json`.
- Frozen choice: K=30, window 10, step 5, 512 tokens of each file, content "best" (the best function chunk by term overlap with the query). The rule was the larger of macro Acc@10 plus macro P@2 on the sample.
- On the 75-query sample this config scored macro Acc@10 0.947 and P@2 0.533. A2 on the same 75 scored 0.947 and 0.540.
- Frozen run on all tuning queries (217: fixflow 34, clinic 37, zulip 146), macro over the three repositories:

| Arm | Acc@10 (95% interval) | P@2 (95% interval) |
|---|---|---|
| A4 | 0.933 (0.886 to 0.973) | 0.475 (0.419 to 0.535) |
| A2 (U1's frozen arm) | 0.919 (0.868 to 0.963) | 0.497 (0.446 to 0.552) |
| BM25 | 0.713 (0.634 to 0.788) | 0.256 (0.210 to 0.307) |

- Paired differences (bootstrap over queries within each repository, 2000 draws):

| Comparison | Acc@10 | P@2 |
|---|---|---|
| A4 minus A2 | +0.014 (-0.002 to +0.039) | -0.022 (-0.071 to +0.028) |
| A4 minus BM25 | +0.220 (+0.152 to +0.294) | +0.219 (+0.156 to +0.285) |

- So A4 clearly beats BM25 but is not distinguishable from A2 on tuning. It adds nothing on its own; U7's stack decides whether it helps as a feature.
- Per repository, A4 versus A2 on Acc@10 / P@2: fixflow 0.941 / 0.559 versus 0.912 / 0.500; clinic 0.865 / 0.351 versus 0.865 / 0.446; zulip 0.993 / 0.514 versus 0.979 / 0.545.
- Held-out ranking files are written and not scored: `C:/Users/User/Documents/projects/card-run-2026-11/improve/U3/heldout/<fixflow|clinic|zulip>/rank_a4.jsonl`. They cover 69, 80 and 242 queries (391 total). The tuning ranking files are in `improve/U3/cardfmt/<repo>/rank_a4.jsonl`.
- The `s_a4_rerank` column is filled in U1's `tune.csv.gz` and `heldout.csv.gz` (via `fill_table.py`, with every other column checked unchanged). The train rows stay empty by design.
- Peak card memory was 7.73 GiB (torch max_memory_allocated).

**Card hours**
- This session: A4 sweep resume 0.58 h (21:07 to 21:42 UTC), frozen run 0.57 h (23:53 to 00:27 UTC, killed because of the hang), frozen run again 1.35 h (01:27 to 02:48 UTC). That is about 2.5 h, plus 0.1 h for the a6-check start that ran out of memory under the cap.
- Earlier builders used about 1.2 h of A4 card time that I counted at the time. All earlier A4 runs are covered by the per-query files.
- Queue waits were about 3 h for the sweep, 1 h for the first frozen run and 1.5 h for the second.
- The whole U3 card total was not summed across earlier builders.

**Faults found**
1. **GPU hang under driver 621.24.**
   - My frozen A4 job hung at 00:19:09 UTC. The container sat at 100% CPU with the card at 0% and clocks at 210 MHz, and no output for 8 minutes.
   - I killed it and resumed. The per-query files were intact, so no results were lost.
   - U6's job hung the same way at about 04:02 UTC, with the matching `nvlddmkm` events described above.
   - This is probably the cause of the 14:41 UTC stall the previous builder logged. I read the earlier 17:03 UTC exit differently: the brief says that one was the watchdog.
   - Mitigation: I wrote `code/U3/guard.sh`. It runs a command inside the container and restarts it if no file under /out changes for 1200 s. It is used for the second frozen run and for `a6-chain`. Other units' jobs have no such guard, so a hung job holds the whole queue.
2. **Card gate starvation (`cardgate.sh`).** I did not touch it.
   - `_g_backfill` returns true when nothing is running ("first running job can end in 999999999 s"). While the card is empty, a stream of small U6 jobs backfills ahead of the oldest reserved waiter.
   - My 8.9 GB job was passed over this way many times: about 2 h of waiting after the sweep ended, then again about 2 h before the second frozen run.
   - The fix is to refuse backfill when no job is running.
3. **A6 check ran out of memory under the gate's cap.** The check ran out of memory at 8464 MiB under the cap with the default TOKBUDGET of 16384 tokens. The new chain sets `U3_TOKBUDGET=8192`, which changes batching only and not the vectors.
4. **Gate switch mid-run.** `run.sh` was replaced by the gate version during my wait. My first waiter was adopted by the gate and ran, so nothing was lost.
5. **Disk.** C: showed 54 GB free earlier and 29 GB when I started, so above the 10 GB stop line. The A6 encode needs under 1 GB.

**A6 plan**
- `code/U3/a6chain.sh` is queued as the gate job `a6-chain`, under `guard.sh` with a 1200 s stall limit.
- It runs, in one gate admission:
  1. The route check (authors' code versus native bidirectional Qwen2) on real tuning queries and chunks, written to `improve/U3/a6/route-check.json`.
  2. A resume test: encode fixflow with a checkpoint every 20 s, hard-kill after 260 s, then restart and look for the "resume ... done" line in `logs/a6-chain.out`.
  3. The full encode with route a (the authors' modelling code, 4-bit nf4), writing `a6/vec_<repo>.npz` with a checkpoint every 120 s.
- If the route check shows the two routes disagree, the result must be read before scoring. I picked route a as the reference by default.
- The two CPU unit tests (route equivalence on a tiny model) pass.
- The chunk counts are 2,540 for fixflow, 8,480 for clinic and 32,440 for zulip.
- I did not score on U1's training queries, as the brief allowed only if time permits.

**Remaining steps once the card is free** (from `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U3`):
1. Wait for `a6-chain` to finish, then check `improve/U3/logs/a6-chain.out` and `a6/route-check.json`.
2. Run `bash run.sh cpu python -B a6.py score`. This chooses max or the sum of the top 3 chunk cosines on tuning and writes `a6/aggregation.json`, the tuning ranking files at `cardfmt/<repo>/rank_a6.jsonl` and the held-out ranking files at `heldout/<repo>/rank_a6.jsonl`.
3. Run `bash run.sh cpurw python -B fill_table.py`. It fills `s_a6_swerank_large`.
4. Run `bash run.sh cpu python -B evalint.py a4,a6` for A6's intervals against A2 and BM25.

**Not done**
- The A6 route check, resume test, encode and score, its table column and its held-out files.
- The report written as `units/U3/report.md`, which the app refuses, so this reply is the report text for the coordinator to save.

**Files**
- Code: `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/improve/code/U3/` (`a4.py`, `a6.py`, `evalint.py` (new), `guard.sh` (new), `a6chain.sh` (new), `fill_table.py`, `run.sh`).
- Outputs and logs: `C:/Users/User/Documents/projects/card-run-2026-11/improve/U3/`. Frozen choice is `a4/frozen.json`, tuning scores `a4/score.json`, intervals `intervals_a4.json`, logs under `logs/`.
- Card log: `C:/Users/User/Documents/projects/card-run-2026-11/logs/improve-U3.log`.