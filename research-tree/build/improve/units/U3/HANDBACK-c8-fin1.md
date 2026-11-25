U3 is not finished. The A6 card job has not started, so steps 2 to 6 have not run. Nothing was scored or filled, and no A4/A6 numbers, card hours or faults exist from this session.

State at 10:20 UTC:
- The A6 waiter is shell pid 544784. Coordinator 8 replaced the old waiter 509956 at 09:46 and lowered the declared memory from 8,864 to 6,144 MiB.
- Its last gate line was 15:17 local, which is 10:17 UTC: "waiting for the card gate (declared 7680 + reserved 4608 + 6144 > 10332 MiB)".
- The 7,680 MiB declared is a U6 sweep job (sw-bip-tgn-zulip-n32_lr0.0001, shell 503213). It was admitted at 09:31 UTC and was still running at 10:10.
- A second U6 sweep job (n20_lr0.001) was also running then. The 4,608 MiB reserved is a U5 job ahead of mine in the gate's queue.
- If U6 keeps admitting 7,680 MiB sweep jobs one after another, A6 may not get a window for a long time.

What I checked:
- `CR/improve/U3/a6/` does not exist yet. There is no route-check.json and no vec_*.npz.
- `drvreset-events.log` shows one START at 09:22 UTC and no stop or restart of the A6 job.
- The earlier a6-chain attempt ended with exit 1 after 122 s at 08:48, an out-of-memory under the old cap, before the REPAIR rename.

What is left, in the brief's order:
1. Wait for pid 544784 to run. If it ends without all three vectors (fixflow, clinic, zulip), rerun `cd code/U3 && bash run.sh gpu a6-chain bash guard.sh bash a6chain.sh`. It resumes from its save.
2. Read the route check. Coordinator 8 says the owner overclocked the card at about 09:40 UTC. A NaN or a route disagreement beyond fp noise may be the overclock, so say so in the report.
3. `bash run.sh cpu python -B a6.py score`
4. Check there is no other fill (`ps -ef | grep fill_table`, no `cpurw` container). Then `bash run.sh cpurw python -B fill_table.py`. Afterwards confirm `tune.csv.gz` and `heldout.csv.gz` start with 1f 8b and that no other column changed.
5. `bash run.sh cpu python -B evalint.py a4,a6`
6. Write the report. Include A4 and A6 on tuning with intervals against A2 and BM25. The A4 intervals are optimistic, because its setting was chosen on 75 of these queries. Also cover the card hours, the faults, A4's freezing rule (Acc@10 + P@2, where Acc@10 alone would pick another setting), A4 queries cut at 1,024 tokens, and A6 not scored on training queries.

A fresh helper can resume from step 1 using this list. Waiting costs almost nothing per call, but the wait has no known end, because U6 and U5 keep the card busy.