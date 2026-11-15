# audit/arms: refuter pass over the relational, reference and search arms and the harness

TUNE only. Held-out was never run. `sealed/` was read only by `score_search.js` (TUNE T1 lines, filtered
by id before parsing) and once to print the references of the five hand-searched tasks.

## Files

| file | what it does |
|---|---|
| accesslog.js | `node -r` preload: logs every distinct fs path, child process and SQLite open |
| leak/ | access logs of relational + reference (`base`, T1+T2 TUNE, 628 tasks each) and search (3 parents, 40 configs + floors); `analysis.json`; held-out lock log; re-run answers in `leak/out` |
| leak_analyse.js | classifies every logged path / git call (sealed, held-out SHA, non-parent SHA) |
| equiv.js, equiv_seed7.json, equiv_seed2026.json | relational vs reference on random configurations (not the sweep list) |
| toy_checks.js / .json | PPR by hand (4 nodes), PPR vs exact linear solve (direction both, co-change x3), budget walk by hand |
| score_search.js / .json | search configs and floors scored on sealed TUNE T1 with BOTH scorers; the five hand searches |
| manual_lists.json, manual_tasks.jsonl | the hand-made ranked lists (written before the references were opened) |
| packcheck.js / .json | budget compliance over 21,928 stored answers, re-run determinism, header/footer counting |

Run each with `node <file>` from this folder (`score_search.js` needs `../../sealed`; TUNE only).

## Results

1. Leakage. No arm opens `sealed/`, a held-out SHA or a non-parent commit at query time. Relational and
   reference start no child process; search runs only `git archive <tune parent>`. Facts files read:
   meta, nodes, edges, commits (all 3 commits.jsonl checked are ancestors only). Two indirect channels:
   (a) every `facts/cache/<parent>/meta.json` names the task commit SHA (`switches.task`, 53/53 TUNE
   parents) and arms load meta.json; (b) `arms/search/tune_labels.js` diffs the task commits and
   `arms/search/tune_labels.jsonl` holds the result: it reproduces 4,958 of 4,973 sealed TUNE reference
   files (99.7 %) and 5,320 of 6,764 definitions, inside the arms folder. The search arm's configuration
   was selected on it. Also: the co-change filter reads history after the parent (task-commit PR ids,
   later merges), but only to drop ancestor commits, as the protocol asks.
2. Held-out lock. `run.js` refuses: no flag; flag without hash; wrong hash; right hash but never frozen
   (exit 2, before tasks.jsonl is read). `search/run.js` refuses without `--allow-heldout` but has no
   frozen-hash check. `results/frozen/` does not exist; no held-out result file exists. The only
   held-out-parent artefact is the srcstore tree of a31924a (T5's parent), written by bench/TQ.
3. Equivalence. 7,040 random configurations (960 on 32 tasks, seed 7; 6,080 on 152 tasks of all 53
   parents, seed 2026), random closure/CTE/level-wise paths: 0 mismatches in ranked lists and packed
   answers. Re-running `base` gives byte-identical answers to the stored sweep (1,256 answers).
   Found: the budget state space is prod(b_c + 1) per node; with about 9 classes at budget 2-3 the
   reference arm overflows a JS Set (crash) while the SQL CTE keeps going. Equivalence above was run
   with the state space capped at 2,000.
4. Relational design. Plans re-derived: k-hop, DAG and budget steps probe edge PK / edge_rev only; the
   scans are per-configuration caches. k-hop CTE = UNION over (node, depth) with a depth cap; unbounded
   = level-wise INSERT OR IGNORE (true visited set). PPR matches the hand solution to 1.3e-9 and an
   exact solve (both directions, co-change x3) to 1.5e-8; order identical. Budget walk matches the hand
   walk (reach, hop, via). "Metapath" is a per-class multiset budget, not an ordered type sequence, and
   counts per class, not per edge type.
5. Search baseline (sealed TUNE T1, 65 commits). Common scorer (locate) / search scorer, R8k: frozen
   `rounds=1 names-only` 0.734 / 0.698; DIR floor 0.719 / 0.683; CO floor 0.750 / 0.713; same frozen
   config without the DIR fill 0.333 / 0.319. So the search arm is the DIR floor plus about 0.015, and the
   CO floor beats it. Hand search on five tasks (4-8 greps each): unpadded 0.231 vs scripted 0.181 at 8k;
   with the same DIR fill both 0.776 at 8k (hand 0.33/0.51 vs scripted 0.24/0.39 at 2k/4k). Not a
   strawman next to a careful grep, but both are dominated by padding. Most references are other parts
   of the same commit with no code path to the seed (e.g. T1-0318: conftest seed, 14 attendance/web files).
6. Tokenizer and packer: one module for all three arms; headers and footer counted; 0 of 21,928
   stored answers over budget, `used` recomputes exactly; deterministic. The footer can exceed its
   8-token reserve only above 999,999 units (not reachable).
7. Scorer: two scorers disagree. In signature form the common scorer gives +0.035 over the search
   scorer on the same answers; in paths/range form the common "locate" rule credits every definition of
   a listed file, so DIR in paths form scores 0.925 at 2k and 0.941 at 8k in about 2.4k tokens
   (search scorer / content rule: 0.459). 5.3 % of reference definitions are in the seed's own file,
   which no file-granularity answer can show.

## Deviations
- The access log covers fs, child_process and SQLite opens; it does not see native reads inside SQLite.
- Hand search: one auditor, five tasks, five commits: descriptive only.
- The search CLI scorer needs a labels file: written to build/tmp/aud-score-<pid>/ and deleted.
