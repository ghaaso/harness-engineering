# S2 helpers idle past five minutes. Name: S2-idle
Goal: helpers do not sit idle past the helper cache's five-minute life (library r57-0176), the cheapest form the
record supports: a line in the brief templates, a check, or both (r57-0011).
Evidence: `research-tree/build/replays/JUDGE-REPLAYS.md` (cache lapses 16.3 % of fresh tokens; helpers waiting 5-10
min 46.2 M), the replay folder it cites; library records on the 180 s backgrounding (`bash library/lookup.sh 180`).
1. From the replay's data, say what the idle gaps were (waiting on a long command, on own helpers, on a lock or
   queue, on the user) with counts, and which a brief line can prevent.
2. Find where briefs are written from (templates under `research-tree/build/briefs/`, the build's orchestration
   documents, `research-tree/build/top9/briefs/COMMON.md`, anything the tree scripts generate) and add one short
   line where a brief template exists. Do not edit evidence or archived files; if the only templates are archived,
   write a new template file beside them and say so.
3. A check (a hook) is not built in this step: if the counts say a check would pay, write what it would test and
   what it cannot see, as a proposal in your output.
4. Say what cannot be kept under the mark (a command longer than five minutes, a wait on a queue) and the saving
   counted per avoided lapse (re-written prefix tokens, from the replay's figures).
Output `research-tree/build/top9/out/S2-idle.md` with the diff of each line added.
