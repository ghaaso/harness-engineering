# K0 cache replay: progress log

- conf.js, chain.js, tree.js: 190 snapshots; 99 on main's first-parent chain, 91 on side branches; all 190 form one
  first-parent ancestry tree (1 root, 189 steps, 29 branch points). data/chain.json, data/tree.json, data/blobs/.
- load.js, rec.js, programs.js: loader with fact hashes, recording reader, nine programs.
- check_frozen.js: 50 of 50 identical to the SQL arm's answer files at the frozen commit.
- crosscheck.js 40: 6,177 of 6,177 answers identical JS vs SQL at 40 snapshots (out/crosscheck.json).
- check_completion.js 40: 40 of 40 held-out T1 records of the frozen config reproduced (out/check_completion.json).
- gen.js: 350 questions (50 + 200 + 100), data/questions.json.
- replay.js: first pair of runs out/run1, out/run2 (code before the EMPTY/timing edits and the optional
  seeds parameter of completion). Final pair to be re-run with the final code: out/final1, out/final2.
- next: report.js -> out/report.json; NOTES.md and result.json in the evidence folder.
