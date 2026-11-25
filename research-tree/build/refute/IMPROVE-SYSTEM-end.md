# System review of the improvement round, part "end": from the units' outputs to the final numbers, and the hand-overs (r57-0097, 2026-11-25)

Reviewer: refute/Opus, fresh context, read only. Read 08:58-09:15 UTC. The state file was read at its 08:52 UTC version (253 lines).
Repros ran only on made-up data in `CR/review-2026-11-25/end/`, in `d2-embed-gpu:3` (`--network none --cpus 2 --memory 2g`; pandas 3.1.1).

**Verdict: 2 BREAKING, 6 SERIOUS, 12 NOTES.**

## BREAKING

### B1. U1's tuning and held-out tables are now plain text under a `.gz` name, so every later reader fails, and A1 can lose A5 and A6 without anyone noticing
- **Where:** `improve/code/U3/fill_table.py:62-65` writes `tmp = p + '.u3.tmp'` with `df.to_csv(tmp, ...)`. pandas picks compression from the file name, so this is uncompressed, and then `os.replace(tmp, p)`. `improve/code/U2/fill_table.py:48-51` does the same with `p + '.tmp'`.
- **Scenario:** U3's fill ran at about 02:48 UTC (after a4-frozen2) and replaced `CR/improve/U1/table/tune.csv.gz` and `heldout.csv.gz` with plain CSV. The next readers all call `pd.read_csv('<split>.csv.gz')`, and pandas infers gzip from the name:
  - U2's `fill_table.py`, the last step of `CR/improve/U2/chain.sh`;
  - U3's own fill after A6;
  - U1's `ltr.py:35`, which R-D2 and U1's report tell U7 to reuse (`derive`, `groups`, `train_one`).
  Each one stops with `BadGzipFile`.
  - `chain.sh` does not check the fill's exit code. It prints `CHAIN_DONE` anyway, and its output goes to `sweeps.log`.
  - U7's brief builds A1 from A4, A5 and A6 "each only where its unit wrote it for both tuning and held-out". If the columns stay empty, the primary D2 arm is fitted without A5 and A6, and nothing says so.
- **Evidence:**
  - The first bytes of the files are `72 65 70 6f` ("repo") for `tune.csv.gz` and `heldout.csv.gz`. `train.csv.gz` still starts `1f 8b`.
  - Both files have mtime 07:48 local (02:48 UTC), the same minute as U3's `intervals_a4.json`.
  - Column counts: `s_a4_rerank` is filled (54,499 of 54,499 tuning rows and 101,969 of 101,969 held-out rows); `s_a5_*` and `s_a6_*` hold 0 rows.
  - Repro: `pd.read_csv` on a plain file named `.csv.gz` raises `BadGzipFile Not a gzipped file`, and `to_csv('x.csv.gz.tmp')` writes plain text.
- **Happened already?** The two files are changed. Their content is complete: 54,499 rows and 217 queries; 101,969 rows and 391 queries, the same as `table-fusion.log`. No reader has failed yet. The next reader is U2's fill at the end of its chain, or U3's A6 fill.
- **Repair:** gzip the two files back in place (the content is right). In both `fill_table.py` files, use `to_csv(tmp, compression='gzip')` and `read_csv(tmp, compression='gzip')`. Make `chain.sh` stop when the fill fails (`|| exit 1` before `CHAIN_DONE`).

### B2. U6's merge and U5's fill read back their own gzip temp file as plain text, so both stop on the first table
- **Where:** `improve/code/U6/merge.py:48-50` writes `tmp = tp + '.u6tmp'` with `to_csv(tmp, compression='gzip')`, then `pd.read_csv(tmp, dtype=str, keep_default_na=False)` with no compression. `improve/code/U5/fill_tables.py:42-44` does the same with `.u5tmp`.
- **Scenario:** `finish.sh` (pid 240420) runs the reruns, `select_cfg`, then all 30 final jobs (about a day of card time), then `merge.py`.
  - The read-back raises `UnicodeDecodeError` before any `os.replace`. `finish.sh:84-86` then logs "STOP: merge failed exit 5".
  - So no `B5_*` column is written, and no `heldout/B5_<KIND>/` npy is written: merge.py writes those only after each table swap.
  - U5's `run_fill.sh` stops the same way, so there is no `B4_GNN` column.
  - B1, the primary D4 arm, then cannot be fitted with B4 and B5 until both are repaired and rerun.
  - The failure is loud. It costs a repair round at the very end, at whatever hour the finals end. Neither script has ever run against a real table: the U6 hand-backs say "merge.py ... not run".
- **Evidence:** the repro writes `x.csv.gz.u6tmp` with `compression='gzip'` (first bytes `1f 8b`), and `pd.read_csv(tmp, dtype=str, keep_default_na=False)` raises `UnicodeDecodeError: 'utf-8' codec can't decode byte 0x8b`. Both scripts run in `d2-embed-gpu:3` (`U6/run_cpu.sh:12`, `U5/run_fill.sh:7`).
- **Happened already?** No. It is certain to happen when either step runs. `finish.sh` starts merge.py fresh at the end, so a fix made now takes effect.
- **Repair:** add `compression='gzip'` to the `chk = pd.read_csv(tmp, ...)` call in both files (`merge.py:50`, `fill_tables.py:44`).

## SERIOUS

### S1. U3's remaining work has no owner, and its hand-back is not saved
- U3's helper (`e3f1df28/subagents/agent-adb4fe41ca566cbda.jsonl`) handed back at 04:26:36 UTC, to e3f1df28, which was past its line. e3f1df28 woke at 04:27 and said "this session can't act any more".
- `units/U3/report.md` does not exist. Coordinator 7's log calls the helper "silent since 04:26 UTC", but it had in fact reported.
- `a6chain.sh` stops after `a6.py embed`. These steps are in no one's list in the state file:
  - `a6.py score` (the aggregation choice on tuning, `a6_<repo>_<split>.npz`, held-out `rank_a6.jsonl`);
  - `fill_table.py` (which will also hit B1);
  - U3's report, for which U7 reads `units/U*/report.md`.
- watch7 flags only the a6-chain shell ending.
- Repair: save the 04:26 hand-back as `units/U3/report.md` now. Add "fresh U3 finisher: a6 score, fill, report" to the next steps.

### S2. The hangs are driver resets, but the state file blames the allocator; the evidence exists only in U3's unsaved hand-back
- Windows System log, `nvlddmkm` event 153 ("display driver stopped responding and recovered"), at these UTC times:
  - 25 Nov 04:02:48: the U6 bip-TGN job that "stopped making progress after epoch 5 (04:00)";
  - 25 Nov 00:19:14: U3's a4-frozen stall, which ended exit 137 at 00:27, "cause not found";
  - 24 Nov 13:55:15 and 15:02:45.
- The state file says "likeliest cause, not proven: the allocator at its cap". U3's hand-back names event 153 for both hangs.
- Four resets in about 40 h of heavy load means more will come before the end.
  - After a reset, every job on the card can hang at 100 % CPU with 0 % card use.
  - WATCHDOG should be told: kill and requeue every job that was on the card at a reset, not just one.
  - Event 153 is a direct signal that can be polled.

### S3. Coordinator 7's watcher, the only notifier, can never fire on gate events
- `scratchpad/watch7.sh` (pid 510396) uses `grep -q "LEARN|FAILED|WARN|HANG\|..."`. In grep's basic syntax `|` is a literal character, so this matches only the literal text "LEARN|FAILED|WARN|HANG". Repro: `printf 'x LEARN y' | grep -q ...` gives NOMATCH.
- So LEARN, FAILED, WARN and the new watchdog's HANG lines in `gate.log` are never reported.
- Its U6 stall check looks at the newest of any `driver-*.out`. A hung job is missed while another U6 driver keeps writing.
- The watcher also exits at its first event and is gone with its session.
- Repair: `grep -qE 'LEARN|FAILED|WARN|HANG'`.

### S4. The hand-over orders a "fix" that would break U5's fill
- 02d5327b's step 2 (and 4f04d618's note) says `fill_tables.py` maps held-out to `heldout` while U4's tables use `test`. This brief lists it as a known fault.
- The code is right:
  - `fill_tables.py:25` lists tables under `<split>` (`test`);
  - `:31` reads scores from `scores/<sd>` (`heldout`);
  - `train.py:352` `final()` writes held-out scores with `save_scores('heldout', ...)`.
- A finisher that "fixes" `SPLITDIR` will stop on "no scores for ... test".
- Repair: strike the instruction from the U5 finisher's prompt.

### S5. The meter can reach the 85 % line before the end steps, which all need new helpers (not proven)
- The meter read 73 % at 08:50 UTC. On 24 Nov afternoon it rose about 2 points an hour (61 % at 14:50, 70 % at 19:08, mostly the owner's other work). Overnight it rose about 1 point in 10 h.
- At the daytime pace the line comes in the afternoon of 25 Nov. Card scripts run on past it, but the fan-out gate then refuses every helper start, and each of these needs one:
  - U3 finisher, U5 finisher, U6 report, the cut-offs refuter, U7, the page.
- Check: read the meter at the next wave. If it is above 80 %, tell the owner through the top session before the line, not at it.

### S6. Nothing comes back after a reboot, and the keep-awake ends Thursday 21:00 UTC
- The keep-awake is a PowerShell loop (pid 52496) whose script sits in the top session's scratchpad. There is no scheduled task.
- After a reboot, none of these restart: keep-awake, `chain.sh` 181978, `finish.sh` 240420, the U6 drivers, U5's `sweep_driver.sh` 98729, the gate's waiters.
- Three unexpected shutdowns happened on 24 Nov, plus four driver resets. Only the manual recipe in the state file covers this.
- The estimate (Thursday about 07:30, range up to 16:00, then about 3 h for the end steps) leaves about 2 h of margin at the late end before 21:00.

## NOTES
1. U2's helper (`agent-af3c23686f5a5eee2`, of e3f1df28) is alive and waiting on its own loop (pid 355082, `while kill -0 181978`). It wakes when `chain.sh` ends, acts, and reports to a dead coordinator. A fresh U2 finisher started meanwhile would run beside it. Read its transcript before starting one.
2. Other leftover loops:
   - e3f1df28's wait loop (pid 98456) waits for an "a4-sweep end" line that may never come. When it ends, it wakes e3f1df28, which declined to act at 04:27. Harmless.
   - 4f04d618's `tail -F gpucap-events.log | grep` (pids 22369/22371) and 807f5dc3's telemetry loop (pid 2032; 2.5 MB csv, from a dead scratchpad) are harmless.
   - The node relay in `c:/rust-work` (pid 91048) and a `tail` of another scratchpad's `bench.log` (pid 78117) are not the round's.
3. U2's and U3's fills edit the same U1 files by read, modify and replace, with no lock. U3's docstring says the file "is re-read just before the write", but the code reads it once at the start. Two overlapping fills lose one column.
4. A kill or a Docker restart can leave `CR/improve/U4/tables/.u6merge.lock`, `merge.running` or `fill.running` behind. `merge.py:37-41` spins on `mkdir` with no timeout, and `finish.sh:82` waits on `fill.running` with no limit.
5. U7's brief points at verdicts by `refute/IMPROVE-*.md`. That glob now also matches the four `IMPROVE-SYSTEM-*.md` reviews: give U7 the two paths by name.
6. U7 is told to put the card's `files.jsonl`, `queries.jsonl` and `rank_bm25.jsonl` into U1's held-out folder. A copy in U7's own folder keeps U1's outputs as they are. `evaluate.py test` writes `result-test.json` into `D4_OUT`: U7 must never mount `CR/d4/out` read-write.
7. In the card's D4 scorer, `per_arm` drops an arm with a missing block without a word, and `summarise` compares on common commits only. U7 should assert that each arm's `n_commits` equals the baseline's.
8. "The best other arm per task" is the best of about 10 arms, and its own 95 % interval is optimistic. The in-tuning cross-validation of A1 and B1 is also optimistic, because the A4/A5/A6 and B4/B5 settings were chosen on the same tuning queries and commits. Only held-out numbers belong in the gains. The report should say so.
9. A1 can only rank U1's candidate rows (about 261 per held-out query). A file that A5 or A6 finds outside that union cannot reach A1. Quote `table/recall.json` beside A1.
10. Disk C: 29 GB free at 09:05 UTC (48 at 22:07, 33 at 02:13).
    - U6 holds 23 GB: bip-TGN zulip states are 1.5 GB each, and `n20_lr0.001` holds 7.2 GB unpruned.
    - Still to come: 3 bip-TGN zulip settings (about 3 GB kept each), the 4 TGN cross-fit checkpoints (about 1.7 GB each, not removed by `final.py`), and retrains.
    - Expect about 15 GB free at the end. The "stop under 10 GB" rule has no script behind it, only watch7's 12 GB check.
11. Token cap: about 229 M of 405 M at 08:40 UTC. What remains (end-step helpers about 35 M, coordinators, these reviews) fits.
12. The state file's own entries such as "U3's helper ... must not start a second copy" cannot reach that helper. It handed back and has not run since 04:26.

## Checked and found sound
- **U1's held-out files:** 69 / 80 / 242 lines in each of `rank_{a2,a3,a7,a8}`. `heldout.py` asserts that the query set equals the card's.
- **U3's A4 held-out files:** 69 / 80 / 242 unique qids, no bad lines; the tuning files have 34 / 37 / 146. `a4/score.json` and `intervals_a4.json` hold tuning only.
- **Held-out truth, D2:** it lives in `CR/d2/<repo>/queries.jsonl` (mounted read-only at `/cr` in U1/U2/U3). Only `u1lib.load_heldout_queries` reads it, and it drops `truth` at parse. U1's split stores `truth=None` for held-out. Held-out table labels are empty.
- **Held-out truth, D4:** `d4lib.Block` computes truth in memory for held-out blocks. U5's `final()` asserts there are no held-out labels. U6's `per_commit` uses the table labels, which are empty on `test`. A grep of `CR/improve` for metric files that mention held-out found none. "Scored once" holds so far.
- **Like-for-like baselines:**
  - D2: `score.py` uses the same universe (`files.jsonl`), the same tie key and the same queries for each arm and BM25, and raises on a missing query.
  - D4: `per_commit` masks the seed. U4's tables hold every candidate (tasks x (N-1)). U4's held-out blocks equal the card's byte for byte. The best untrained arm per repository (PC, RRF, INV365) is the card's own choice.
- **Intervals:**
  - D2: within-repository paired bootstrap, 10,000 resamples, seed 0, macro.
  - D4: paired bootstrap over pooled commits, 10,000 resamples, seed 1.
  - Both gates are judged on the point estimate, as in the card run and U7's brief.
- **Table files:** U4's tables are still real gzip. U5 and U6 write with gzip. Neither U6's merge nor U5's fill has touched a table yet, and no `*.running` marker or `.u6merge.lock` exists.
- **Remaining card work:**
  - U6 zulip: 12 of 24 settings lack their last epoch; 7 of them are TGN-class (counted from `sweep/*/zulip/*/e8.json`).
  - U2: 8 sweep stages and 2 finals.
  - U3: A6, waiting to run alone.
  - U5: folds 1-3 and final.
  - This agrees with coordinator 7's estimate of about 07:30 UTC Thursday.

## Not examined
- The gate and the watchdog (`cardgate.sh.new` was being edited at 09:03 UTC; `units/WATCHDOG/report.md` was not there). The "torch cap 0" admissions in `gate.log`.
- Leakage in time inside U5 and U6. U5's cross-fit uses ordinary k-fold, not time order. TGN memory replay at held-out. U2's and U3's training pairs. A4 per-query lines across the two runs.
- Whether U5's and U6's score rows line up with the card's task order (U4's refuter checked the tables, not U5's or U6's matrices).
- The meter itself (the app's reading is not visible to me), and the card hours per unit.
