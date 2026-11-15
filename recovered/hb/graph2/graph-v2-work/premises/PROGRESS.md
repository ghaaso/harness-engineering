# premise-measure progress

Inputs: usecases/out/episodes-qf.jsonl (qf labels), usecases/out/steps.jsonl (timestamps, cwd, writes).
Keep folder: docs/program/evidence/harness-bottlenecks/graph2/graph-v2/premise-measure/

- [x] read required docs
- [x] step 0: git path -> first-added time map (git-added.txt, git-touch.txt)
- [x] step 1: loc.js.txt -> loc.json, perfile.json, rows.jsonl; own.js.txt -> own.json; kind.js.txt -> kind.json  (SOUND, kept; session 2 checked the script)
- [x] step 2a: sample.js.txt -> sample-candidates.jsonl (12 files x 9 seeded candidates); sel.js.txt -> sample-selected.jsonl (60 selected) (kept)
- [x] step 2b: classify.json: all 60 classified (kept); stats.js.txt -> stats.json (kept)
- [x] step 3a: reuse.js.txt -> needles.json, reuse-hits.jsonl (56/60 found); reuse2.js.txt -> reuse.json (kept)
- [x] session 2: split premise c into in-repo-untracked vs scratch (classify2.json); in-repo share with two definitions
- [x] session 2: stale-use check for findings with repository premises (git changes between origin and later exposure)
- [x] session 2: same-task reread share (strict), web = 0 check
- [x] step 4: NOTES.md + result.json + per-finding classification file in premise-measure/

## session 2 (2026-11-14) done
- [x] kept all session-1 outputs after checking loc.js.txt, own.js.txt, sample.js.txt, sel.js.txt, stats.js.txt, reuse*.js.txt
- [x] classify2.js.txt -> classify2.json: kind c split (c_repo / c_scratch / c_other), a->ax for H5, L3, L5, STALE table (git history of main)
- [x] measure.js.txt -> measure.json (all headline numbers); rank.js.txt -> rank.json; stale2.js.txt -> stale2.json (lane's own scan agent excluded)
- [x] assemble.js.txt -> premise-measure/result.json, findings-classified.json, stale-exposures.json; scripts copied to premise-measure/scripts; input-hashes.txt
- [x] NOTES.md written (under 200 lines)
