# System review, part "text" (U2 and U3), 2026-11-25, about 09:00-09:40 UTC

Verdict: 4 BREAKING, 3 SERIOUS, 10 NOTES.

File times when read (the local clock is UTC+5; times below are UTC): `code/U2/run.sh` 24 Nov 19:56, `trainlib.py` 20:54,
`sweep.py` 13:33, `final.py` 12:36, `fill_table.py` 12:36; `code/U3/run.sh` 19:56, `guard.sh` 25 Nov 02:55, `a6chain.sh` 02:54,
`a4.py` 24 Nov 14:42, `a6.py` 13:42, `embedlib.py` 12:58, `fill_table.py` 13:02. `cardgate.sh` 25 Nov 08:45 (I read it only for
its exit handling).

## BREAKING

### B1. U3's table fill wrote U1's tables as plain text under a `.gz` name, so every later reader fails
- Where: `code/U3/fill_table.py:62-66` (`tmp = p + '.u3.tmp'`; `df.to_csv(tmp, ...)`; `os.replace(tmp, p)`). `code/U2/fill_table.py`
  uses the same pattern (`tmp = p + '.tmp'`).
- Scenario: pandas chooses compression from the file name. Because the temp name ends in `.tmp`, the file is written
  uncompressed. The script checks it by reading the temp (this passes) and then renames it over `tune.csv.gz` /
  `heldout.csv.gz`. After that, any `pd.read_csv('<split>.csv.gz')` tries gzip and raises.
- Evidence: `CR/improve/U1/table/tune.csv.gz` starts with the bytes `72 65` ("re", from the header `repo,split,...`), not the gzip
  magic `1f 8b`. `train.csv.gz` was not touched (24 Nov 16:57) and starts with `1f 8b`. Both `tune.csv.gz` and `heldout.csv.gz`
  were rewritten at 02:48 UTC on 25 Nov (U3's A4 fill). Repro in `CR/review-2026-11-25/text/repro_gz.py` (made-up data, in a
  container, network off): the same write-then-rename gives `read fails: BadGzipFile Not a gzipped file (b'a,')`. I did not read
  the bytes of `heldout.csv.gz` (it is a held-out file); the same code wrote it in the same minute.
- Happened: yes. It touched U1's tuning and held-out tables. The values in them are intact: they use the same `%.6g` format as
  U1's `features.py`, so nothing was rounded differently. These fail next: U2's `fill_table.py` (the last step of
  `CR/improve/U2/chain.sh`), U3's fill for A6, U1's `ltr.py` (which U7 uses for the stacks), `R-U1/check_table.py` and
  `U1/test_u1.py`.
- Repair: while no fill is running, gzip the two files back in place (`gzip -c f > f.new && mv f.new f`). In both fill scripts,
  name the temp `...tmp.csv.gz` (or pass `compression='gzip'`).

### B2. `run.sh gpu` always exits 0: the chain cannot see a failed sweep stage or `final.py`, and the sweep can freeze a stage early
- Where: `code/U2/run.sh:41-45` and `code/U3/run.sh:41-45`. The script ends on `echo ... end exit=$rc >> $LOG` and never returns
  `rc`. Callers that rely on the exit code: `code/U2/run_sweeps.sh:6` (`|| exit 1`) and `CR/improve/U2/chain.sh` (`|| exit 1` on
  each line, and no check at all on the last line before `echo CHAIN_DONE`).
- Scenario: a stage job ends with exit 1, with 137, or with 76 twice, and the chain carries on.
  - Earlier stages recover by themselves, because each stage job re-runs the trials that are missing.
  - The last stage of each model does not. `sweep.py:131-132` writes `<tag>.frozen.json` at the end of EVERY stage job. If the
    `...,data` stage fails, `final.py` freezes the choice from the `filter` stage, and nothing says the data stage is missing.
  - If `final.py` fails, `fill_table.py` fails too, and the chain still prints `CHAIN_DONE`.
- Evidence: a shell repro, `CR/review-2026-11-25/text/rc.sh`, with the same structure (EXIT trap, `run_job`, final echo): the job
  exits 3, the log line says `end exit=3`, and the script exits 0. Right now `CR/improve/U2/sweep/swerank.frozen.json` (03:33 UTC)
  already holds the lr-stage choice (lr 2e-5, 1 epoch, 3 negatives, filter on, pooled), although the sweep has done only 1 of
  its 5 stages.
- Happened: not yet. Only `sweep-swerank-lr` has ended, with exit 0. Likely in what remains: U2 has 9 more card jobs, under a
  gate that has given exit 76 or 137 several times in 24 h. A frozen choice from an unfinished sweep would go into the owner's
  report.
- Repair: in the gpu branch of both `run.sh` files, end with `exit $rc`. In `chain.sh`, add `|| exit 1` to the fill line.

### B3. U2's zulip training data is capped at 2,500 commits, not the brief's 20,000, and this is not recorded anywhere
- Where: `code/U2/mkpairs.py:19` (`ZCAP = 2500`) and `:87-88`. The brief `units/U2/BRIEF.md`, item 2, says "zulip capped at
  20,000 training commits". `CANDIDATES.md` row A5 says "zulip capped at 20k commits" and "zulip has about 60k pairs".
- Evidence: `CR/improve/U2/pairs/zulip/info.json` gives training_commits 2500 and pairs 6145; `mkpairs-zulip.log` says the same.
  U1's zulip `split.json` (counts only) has a training_pool of 59,724 commits before the tuning start. The sweep trains on 3,787
  pooled examples (`sweep/swerank.json`). No line in `IMPROVE-STATE.md`, in the estimates or in any report names the cap as a
  departure. The side-by-side estimate (`ESTIMATE-2026-11-24.md` line 30) is built on the 2,500-commit data without saying so.
- Happened: yes. All three finished SweRank runs use it, and so will every later run of both models. It weakens the form (an
  eighth of the zulip training commits the brief set), which goes against r57-0080, and it changes A5's reported numbers.
- Repair:
  1. Rerun `mkpairs.py zulip --zcap 20000`, then `filter_ranks.py` for zulip with both models.
  2. Before the next stage, clear U2's `sweep/`, `models/` and `ckpt/`. Otherwise the old states would be reused, because the
     read-back is keyed on the setting only (see S3).
  3. Record the change. It costs more card time: about 7 times the training examples.

### B4. A6 cannot fit under its cap because the remote code's rotary caches take 3.5 GiB; it has failed twice and now waits for an empty card
- Where: `code/U3/embedlib.py` `fix_rotary` (`mod._set_cos_sin_cache(seq_len=mod.max_position_embeddings, ..., dtype=torch.float32)`).
- Scenario: SweRankEmbed-Large's `modeling_qwen.py` puts a `Qwen2RotaryEmbedding` in every attention layer (line 238).
  `config.json` has `max_position_embeddings` 131072 and 28 layers. For each layer, `fix_rotary` builds cos and sin tables of
  131072 x 128 in float32: 28 x 2 x 64 MiB = 3,584 MiB on the card. No input uses them: queries are cut at 8,192 tokens and
  chunks at 512.
- Evidence:
  - `CR/improve/U3/logs/a6-check.out` (00:35 UTC) and `a6-chain.out` (08:48 UTC) both run out of memory in the first forward
    pass: "8.12 GiB is allocated by PyTorch", against 8.27 GiB allowed. A 7B model at nf4 with a bf16 embedding is about 4.6 GB,
    so the caches explain the gap.
  - In `improve-U3.log`, a6-check waited from 00:35 to 02:55 UTC for the card alone and was ended by hand. a6-chain was
    admitted at 08:46 and ended with exit 1 at 08:48 (the known wrapper fault).
  - The coordinator requeued it at 08:51, declaring 11,944 MiB (the card alone). It is still waiting: `ps` shows pid 509956,
    and the log's last line, at 09:02 UTC, says "needs the card alone".
- Happened: yes. No A6 vector exists (`CR/improve/U3` has no `a6/` folder). A6 has lost more than 8 hours of wall time. Because
  it needs an empty card, it now blocks every other job or is blocked by them.
- Repair: in `fix_rotary`, build the cache for 8,192 positions (`seq_len=min(mod.max_position_embeddings, 8192)`). The values
  used stay the same (`cos_cached[:seq_len]`), and the need drops by about 3.3 GiB. After that the learned 11,944 mark for
  `U3_a6-chain` can be removed. Not proven: whether the job as it stands fits alone and uncapped with an 8,192-token query. One
  check would settle it: the peak of `a6.py check` run alone, or the longest tuning or held-out query in tokens.

## SERIOUS

- S1. Every stage job recomputes the start-model baseline and appends it again.
  - Where: `code/U2/sweep.py:86-91`. `done` is keyed by `json.dumps(cfg)`, so the baseline's key is `'"baseline"'`. The test
    `'baseline' not in done` is therefore always true in a new process.
  - Effect: each of the 9 remaining stage jobs loads the model again, scores the 217 tuning queries again and adds a duplicate
    row to `sweep/<tag>.json`. That is about 2 min of card each, from the lr runs' 290 s minus 175 s of training.
  - Not happened yet (one job so far). Repair: test `json.dumps('baseline') not in done`.
- S2. `guard.sh` kills only the wrapper process.
  - Where: `code/U3/guard.sh:54-61` kills `$pid`. For a6-chain that is `bash a6chain.sh` (the running command line in `ps`), not
    the Python process under it.
  - Effect: on a real stall the hung Python keeps its ~8 GB on the card, and the guard starts a second one in the same
    container. The second one runs out of memory, and the guard exits with that code. So the restart the guard exists for
    cannot work for A6.
  - Not happened. Repair: start each child in its own process group (`setsid`) and kill the group, or have `guard.sh` wrap
    `python a6.py ...` directly.
- S3. U2's read-back is keyed on the setting only.
  - Where: `code/U2/sweep.py:56-62` (`ckpt/<tag>/<md5(cfg)>/<group>.done.pt`) and `:86-87` (`sweep/<tag>.json`). Neither key
    includes the training data or `--max-zulip`.
  - Effect: a rerun with changed pairs (B3's repair) would quietly read back states trained on the old pairs.
  - Not happened. Repair: add a hash of the pairs' `info.json` to the key, or clear the folders as B3 says.

## NOTES

- Training uses 256 input tokens (`trainlib.py:11`) and inference uses 512 (`to_eval`). The state file (line 102) records this
  as a fact, not as a departure with a reason. Chunks longer than 256 tokens are cut during training.
- The batch is 8, with in-batch negatives (`trainlib.py:71`). The brief sets no batch size, the record's tuning used larger
  batches, and the batch is not swept.
- A4 cuts queries at 1,024 tokens (`a4.py:19`, QMAX), against the authors' 32k context. Only a code comment says so.
- A4 freezes by Acc@10 + P@2 (`a4.py:218`). By Acc@10 alone, the rule U2 and the round use, K30_W10_N512_head (0.960) would have
  won over the frozen K30_W10_N512_best (0.947). The U3 brief names no metric, so the report should say which one was used.
- A4's `tune_zulip` file was written partly by a4-frozen (killed at 00:27 UTC) and partly by a4-frozen2. It has 146 lines, 146
  unique queries and no half-written line. The code and setting are the same, but after a restart the groups of 8 queries
  batched for generation shift. Greedy outputs can therefore differ slightly from a straight run.
- A6 is not scored on U1's training queries (`a6.py` docstring). The brief allowed this only "if the card time allows".
- `improve/code/U3;C` was made at 13:01:06 UTC on 24 Nov. The U3 builder ran a test `docker run` without `MSYS_NO_PATHCONV`;
  its transcript (`193c5a98.../agent-a7ca0a422b2b92c31.jsonl`) shows "working directory 'C:/Program Files/Git/code' is
  invalid". Docker created the source folder of the broken mount. Nothing was written there, and it can be deleted.
- U2 never deletes `ckpt/<tag>/*/<group>.done.pt`. Each SweRank run leaves 0.55 GB, over about 10-13 runs: about 6-7 GB at the end.
- The `evalint.py` intervals are computed on tuning queries, 75 of the 217 of which (the sweep sample) also chose A4's setting.
  They are optimistic and should not be used for the report's gains.
- The guard counts any change under `/out` as a sign of life, including the logs folder (the host writes the container's
  output to `/out/logs`). Another U3 job writing there would keep a hung job alive. Separately, `chain.sh` (pid 181978) and the
  a6 queue are plain `nohup` processes: after a reboot nothing starts them again, and `chain.sh` would repeat resume-test2 first.

## Checked and found sound

- The time cut of the training pairs:
  - `mkpairs.py` keeps commits with ct < t_tune; in U1's split, tuning is ct >= t_tune.
  - The negative pools come from a snapshot before each group (asserted on ancestry).
  - In `info.json`, max_ct < t_tune for all three repositories.
  - `test_u2.py` checks the pairs against the split's own history file.
- No tuning or held-out label reaches training or selection:
  - The filter uses start-model ranks on the training pairs.
  - U2's sweep and A4's sweep score the tuning block only.
  - U1's `load_split` carries no held-out truth (held-out rows have `truth=None`).
  - The A5 and A4 held-out ranking files are written but not scored.
  - `evalu3.tune_truth` reads the tuning block only.
- Resuming training with in-batch negatives: the batch order is a fixed function of seed and epoch, and the RNG states are
  saved. In the test (`resume-test2.log`), the resumed run differs from a straight run by 7.27e-5, two straight runs differ by
  6.78e-5, and both take the same 6 steps.
- The frozen setting and the saved models agree. The coordinate rule keeps the running best, and the models are saved before
  the run's record. Read-back states load into the same eval form (LoRA merged, fp16, 512).
- A4's per-query files:
  - All 37 files: every line parses, no query is duplicated, and each file ends on a newline.
  - Every sweep config has 25 queries per repository. The frozen runs have 34/37/146 tuning and 69/80/242 held-out queries.
  - The only edit to `a4.py` after the first config ran (14:42 UTC, 24 Nov) changed logging and freed the cache; it did not
    change outputs.
- Like with like:
  - A5's baseline and arms use the same `score_blocks` (card chunker, prompts, fp16, best chunk per file).
  - A4 is compared with A2 on the same sample queries and lists.
  - A6's query prefix is the one on the model card.
- Both fills keep every other column (checked in memory before writing) and write with `%.6g`, the format U1 used.

## Not examined

- The gate's admission, marks, reservations and watchdog (`cardgate.sh`, `gatesite/sitecustomize.py`), which belong to the gate
  part. I did not read the WATCHDOG helper's report.
- U2's Qwen3 path has not run yet; I only read its code.
- The bytes of `heldout.csv.gz` (a held-out file; see B1).
- `test_u2.py` and `test_u3.py` beyond a grep, and `speed.py`.
- `a6.py score` and route b, which have not run yet.
- Whether A6 fits alone as it stands (B4, not proven).
