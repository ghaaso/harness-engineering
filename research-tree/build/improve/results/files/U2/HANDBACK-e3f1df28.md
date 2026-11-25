U2 is not finished, and I stopped because another helper now owns it. At about 14:17 local (Nov 25) I found the REPAIR helper (of 47ff9697) already rebuilding U2's outputs under `CR/improve/U2/`. I did not touch the sweeps, final models or table fill, so as not to collide with its work.

**What I did**
- **Step a, resume test:** `resume-test2` passed, ran 22:31 to 01:10 UTC (card hours 2.6, mostly waiting inside the gate). The resumed run differs from a straight run by 7.27e-5. The two straight runs differ from each other by 7.17e-5 and 6.78e-5 in the two floor runs, so resume is as exact as the card's own run-to-run noise. Log: `CR/improve/U2/resume-test2.log`.
- **Fault fixed:** an earlier attempt died with "unexpected pos ... vs ..." while saving a checkpoint, because the disk was nearly full and other units were writing. I changed `save()` in `research-tree/build/improve/code/U2/trainlib.py` to retry the write up to 6 times, 20 s apart. The bytes written are the same.
- **Steps b-d:** I started them as one chain, `CR/improve/U2/chain.sh`: resume-test2, `run_sweeps.sh`, `final.py` for each model, then `fill_table.py`. Only the first sweep stage (swerank, "lr") ran, 03:17 to 03:33 UTC, 0.28 card hours, peak 2.92 GiB.

**Tuning numbers (SweRankEmbed-Small, swerank lr stage, macro Acc@10 on tuning)**
- Best (the stage's FROZEN line): lr 2e-5, 1 epoch, 3 negatives, filter on, pooled data, **0.8374**.
- Same settings at lr 5e-5: 0.8328.
- Per repository for the lr 5e-5 run: FixFlow 0.912, clinic 0.676, zulip 0.911.
- I did not get intervals or the BM25 and untuned-model comparison. Those need the later stages and the final scoring.

**Why these numbers do not stand**
REPAIR's review finding (text B3, in `refute/IMPROVE-SYSTEM-text.md`, per the state file) is that zulip pairs were capped at 2,500 commits instead of the brief's 20,000, a breach of r57-0080. The chain, `run_sweeps.sh` and a waiting run were frozen (SIGSTOP) at 09:13 UTC by 47ff9697 and are now gone. My stage-1 outputs, `models`, `ckpt` and `sweep` folders were moved to `CR/improve/U2/before-review-2026-11-25/` (that folder also holds `pairs-zulip-zcap2500/` and a copy of `chain.sh`). `pairs/` is being rebuilt, with zulip at 20,000 (`mkpairs-zulip-20000.log` is empty so far, and only clinic and fixflow pairs exist).

**Not done**
- All remaining sweep stages for both models, both final models, and the A5 columns in U1's tables.
- The A5 held-out ranking files (none written, none scored).
- The frozen choice per model against BM25 and against the untuned model, and the card hours for the whole unit. My card hours were about 2.9, counting the resume test and the one sweep stage.
- No disk problem when I looked: C: had 54 GB free.

**For the next owner of U2**
- My `chain.sh` is not running, because the chain exited while I was waiting. Start the REPAIR helper's fresh chain after its pairs finish. Run it as a background job started by you, not from a shell that may end.
- `run.sh gpu` now goes through the card gate (`cardgate.sh`) and not `GPU.lock`. Waits are long: the U6 and U3 jobs held the card for hours.
- The stale "1.57 GiB" `gpu.peak` line in `improve-U2.log` for resume-test2 is the old value, not that job's peak.

I did not count my own token use. Run `count.mjs` on this transcript if the figure is needed.