# Graph arm on LadybugDB 0.22.3 (arms/ladybug)

The graph arm of the controlled comparison. It answers every algorithm of `arms/common/SPEC.md`
from a LadybugDB store, natively where the engine can, and adds the engine-native modes as separate
configurations (SPEC 9.4). Everything here was run inside `graphtest:1` with `--cpus 6 --memory 4g`;
stores live on the named volume `gt-ladybug`, never on `/build`.

Revision of 2026-11-12, evening (graph-arm fix for protocol addendum 3, sections A to C). Only TUNE
tasks and the 20 TUNE questions were run. Nothing was scored, selected or frozen; `sealed/` and
`audit/` were never opened. Store version LB6, loader L5, facts extractor 59da7b753a4d908e.

**Pre-flight fix round 2 (2026-11-13, written by that lane; details in `arms/common/NOTES.md`).** One
change in `tq.js`, `setting_readers`: `min(f2.path + '::' + ...)` became
`min(CASE WHEN f2 IS NULL THEN NULL ELSE f2.path + '::' + ... END)`. LadybugDB's `+` on strings treats
NULL as an empty string, so a reader with no enclosing definition gave `'::'` and the
`coalesce(enc, ep + '::' + sn)` fallback never ran; relational and DuckPGQ (SQL `||`, NULL in, NULL out)
answered `path::NAME`. The 20 TUNE question answers are unchanged; probe 904 now matches the other two
typed arms. Ranking code is unchanged, but the arm's code hash changed, so every ladybug frozen record
needs the grader's re-freeze.

## Stage 2 (tuner lane, protocol addendum 3 section D; 2026-11-12, night)

Proposed from this arm's own stage-1 TUNE score table only (`results/tuner/ladybug.stage1.md`,
aggregates per configuration). No other arm's table, no per-task score, no reference answer, nothing
in `sealed/` or `audit/` was read. HELD-OUT was never run. No stage-2 score has been seen (one round).

**What the stage-1 table says (T1, primary = recall of reference files and definitions inside the
8,000-token signature answer, averaged per commit; standard error about 0.025 to 0.036):**
- Hop limit is the strongest factor: 1 hop 0.438, 2 hops (base) 0.664, 3 hops 0.727, 4 hops 0.768,
  unbounded 0.784 (se 0.025), that is +0.120 over the base, about 4.8 standard errors. Per-class
  budget B1 (unbounded) 0.779.
- Padding is the second: CO 0.771 and DIR 0.764 against 0.664 (+0.10). It fills the room a 2-hop head
  leaves (median 5,010 of 8,000 tokens used).
- Everything that shrinks the reach loses: one direction only (0.449 / 0.460), no history class
  (0.609), minConf 1 (0.636), in-degree cut at 5 / 10 (0.599 / 0.635), k-core cut k 4 / 6 (0.568 /
  0.624), the ordered metapaths (0.615 and 0.233). Symbol granularity (0.518) and the snippet form
  (0.363) lose too.
- Ranking moves nothing at 2 hops: every ranking, native or not, lies between 0.649 and 0.666,
  inside one standard error, because the 2-hop reach fits the budget, so the order cannot decide what
  is shown. The order only matters once the reach is larger than 8,000 tokens, which is the unbounded
  regime: there recall is 0.870 at 16,000 tokens but 0.784 at 8,000, so up to 0.086 is decided by
  the order. Stage 1 never tested a ranking there.
- Stage-1 best: `hops=null` (0.784, complexity 2).

**The 20 configurations** (`stage2.json`, list hash `f8b75c2a4dcfd6a1`; written by
`tmp/tune-ladybug/gen_stage2.js` from `sweep.js BASE` with `traversal = khop, hops null` unless the
name says otherwise). Complexity per addendum 3 item 10 in brackets.

| # | name | spec? | reason (one line) |
|---|---|---|---|
| 1 | `s2 hops=null pad=CO` | spec | the two strongest factors together: the CO tail fills answers whose unbounded reach is still under 8,000 tokens (isolated seeds) [3] |
| 2 | `s2 hops=null pad=DIR` | spec | the same with the DIR tail, which scored close to CO at 2 hops [3] |
| 3 | `s2 hops=3 pad=CO` | spec | hop limit x padding at the simplest level: a 3-hop head (0.727) plus the CO tail may match the unbounded reach at complexity 2 [2] |
| 4 | `s2 hops=3 pad=DIR` | spec | the same with DIR [2] |
| 5 | `s2 hops=4 pad=CO` | spec | 4 hops (0.768) plus the CO tail: between the two regimes [3] |
| 6 | `s2 hops=null rank=ppr r0.50` | spec | ranking under the unbounded reach: a higher restart keeps PageRank mass near the seed, which should matter only when the reach is the whole component [2] |
| 7 | `s2 hops=null rank=ppr w3` | spec | co-change weight 3 under the unbounded reach; at 2 hops it raised the reference share of the first 10 files on T1 (0.520 against 0.512) [2] |
| 8 | `s2 hops=null rank=degnorm` | spec | degree-normalised spreading decays with every hop and hub, a strong locality order for a deep reach [2] |
| 9 | `s2 hops=null rank=cochange` | spec | co-changed files first, then by hop: the co-change floor's signal inside the graph's reach [2] |
| 10 | `s2 hops=null rank=hybrid ppr+text` | spec | at 2 hops this hybrid had the best first-10 share (0.550) and MRR (0.612); under the unbounded reach those top ranks decide the answer [3] |
| 11 | `s2 hops=null rank=hybrid ppr+cochange` | spec | fuses graph proximity with commit history [3] |
| 12 | `s2 hops=null native rank=x_wsp` | native | the engine's weighted shortest path (kind cost / confidence) as a graded distance over the deep reach [3] |
| 13 | `s2 hops=null native rank=hybrid ppr+x_wsp` | native | PageRank fused with the weighted distance [4] |
| 14 | `s2 hops=null native rank=hybrid ppr+x_comm` | native | the stored Louvain community (`priors/`, B.5) as a locality prior where the reach spans many communities [4] |
| 15 | `s2 hops=null hub=transport` | spec | hub cut x hop limit: with no cap, blocking transport nodes stops PageRank and reach leaking through shared helpers [3] |
| 16 | `s2 hops=null hub=indeg>10 pad=CO` | spec | an in-degree cut keeps the head focused and the CO tail repays the reach it removes (the cut lost at 2 hops only by shrinking the head) [4] |
| 17 | `s2 native traversal=x_core k6 hops=null` | native | the engine's k-core hub cut with no hop cap [3] |
| 18 | `s2 hops=null gran=symbol` | spec | granularity x hop limit: symbol granularity lost at 2 hops because its head was small (2,651 tokens); with no cap it fills the budget with definitions [3] |
| 19 | `s2 hops=null classes=base+capability+docs` | spec | with no cap, capability and doc edges can reorder PageRank (at 2 hops they could not: the reach fitted) [2] |
| 20 | `s2 hops=null rank=hybrid ppr+text pad=CO` | spec | the most promising ranking with the strongest tail [4] |

**New modes: none.** Reasons: the only stage-1 evidence about the native priors is at 2 hops, where no
ranking can act, so a second community algorithm (Leiden, label propagation) would duplicate entry
14 before anything shows that a community prior helps; Katz and eigenvector are global centralities
like `x_prank`, which lowered nDCG@10 on T1 from 0.467 to 0.373 in stage 1; counting `ALL SHORTEST`
paths only refines the hop order of `bfs`, which ranked below PageRank. The native features used are
`x_wsp` (native `WSHORTEST`), the stored Louvain grouping (`x_comm`, read from `priors/`: the folder
still holds the same 54 files after the run, so no grouping was computed) and the native k-core cut
(`x_core`). Typed path patterns (`variant: "pattern"`) return the specified metapath's answers
(cross-checked), so they cannot change a score, and metapaths lost in stage 1.

**Run** (`tmp/tune-ladybug/run_stage2.sh`, inside `graphtest:1`, `--cpus 6 --memory 4g`, stores in
`/store/s2/ladybug` on the volume `gt-ladybug`, two other lanes' containers running at the same time,
so times are indicative only). One process ran `common/sweep.js --arms ladybug,reference --list
ladybug --stage 2 --sets T1,T1x,T2`: 772 TUNE tasks (T1 388, T1x 144, T2 240; 53 parents) x 20
configurations = 15,440 ladybug answers, 1,171 s wall (19.5 min including store builds). The 4
extension entries ran on ladybug only (3,088 reference runs skipped, as designed).
- Ladybug answers: `results/ladybug/tune/<hash>.<set>.jsonl.gz` (60 new files beside the 120 of stage
  1). Summary, configurations and mismatch file:
  `results/ladybug/sweep/stage2/ladybug+reference_T1+T1x+T2.{summary,configs,crosscheck_mismatches}`;
  list log appended to `results/ladybug/sweep/lists.jsonl`; log `results/ladybug/logs/stage2.log`.
  The reference arm's copies stay in `tmp/tune-ladybug/s2root/reference/tune/` (not results).
- Cross-check, the 16 specification entries against the reference arm on every TUNE task of T1, T1x
  and T2: 12,352 (task, configuration) comparisons (10,048 of them on T1 and T2), **0 equivalence
  failures** (same reach and hops, scores within 1e-9, same order, valid shortest explanation paths),
  and the packed answers identical in 12,352 of 12,352 once this arm's own `meta` field is set aside
  (`answers_same.js`; sweep.js counts every record as different because it does not strip `meta`).
- Answer-file checks (`verify.js --stage 2`, `results/ladybug/sweep/stage2/verify.json`): 0 problems;
  every configuration present for every task of each set (T1 7,760, T1x 2,880, T2 4,800 answers), task
  ids equal the relational arm's, no answer over its budget at 2,000 / 4,000 / 8,000 / 16,000 tokens,
  used tokens recomputed equal, lookups = 1 + padding (DIR 1, CO 2). `verify.js --stage 1` still gives
  0 problems on the 120 stage-1 files.
- Ranking wall time per query, p50 / p95 in ms (including the child-process round trip; host shared):
  unbounded PPR entries 42 to 47 / 85 to 116; `hops=3` 8.6 / 20.5; `hops=4` 12.6 / 32.5; `x_wsp` 59.4 /
  135.5; hybrid `ppr+x_wsp` 63.8 / 142.5; hybrid `ppr+x_comm` 47.6 / 97.9; `x_core k6` 42.6 / 93.3;
  `+capability+docs` 46.3 / 97.7. Entries that differ only in padding or granularity reuse the
  ranking (rankKey) and have no separate time.

## What changed in this revision (addendum 3)

| item | rule | what the arm does now | proof |
|---|---|---|---|
| A.1 | degree-normalised ranking, out-degree 0 | `lb.js scoreFor('degnorm')`: a DAG source with no arc under `cfg.direction`, `cfg.classes` and `minConf` divides by the number of reach-DAG arcs leaving it, each (u, v, kind, orientation) once. Before, it divided by zero (an infinite activation). Applies to the specified metapath and to its typed-path-pattern variant. | random cross-check below: 18 pairs used the fallback, 0 differences |
| A.2 | `x_wsp` | edge cost = kind cost (table below) / max(confidence, 0.05); a node blocked by the configuration's hub cut may end a path but is never passed through (seeds never blocked). The recursive `WSHORTEST` filter carries the hub predicate; a blocked candidate gets min over its unblocked predecessors u of cost(u) + c(u, v) (one more Cypher query for its incoming arcs). Before, the hub rule was not applied to the cost path. | `wspcheck.js`: 135,337 candidate scores against a plain JavaScript Dijkstra, 0 differences |
| A.3 | `x_prank` counts a co-change edge in both directions | the stored `page_rank` prior runs over a projection that holds every directed edge in its stored direction and both orientations of every `co_changed` edge (`store.js PR_FILTER`). Before, co-change entered once, from the smaller to the larger node id. Louvain and k-core keep the each-edge-once projection (`CODE_FILTER`; the engine treats them as undirected). | toy probe below; 747 of 772 `x_prank` lists changed (expected) |
| A.4 | absent metapath steps | already handled (a step with no matching edge type has no label and matches nothing); now tested under load | random cross-check: 28 pairs with an absent step, 0 differences |
| B.5 | one community grouping per canonical graph | `store.js nativePriors/commPrior`: the grouping is kept in `arms/ladybug/priors/<canonical content hash>.json` (node ids 1..N to a community label, labels renumbered by first appearance). The first build of a graph writes it from its own `louvain()` run (atomic hard link, never replaced; a process that loses a race reads the winner's file); every later build of that graph reads it and writes it into `N.comm`. The build still runs `louvain()` and records in the store's meta how its own run compares with the file (`comm.this_build_ari_vs_file`). | `commcheck.js`: two fresh builds of each of 53 parents, 1,544 rankings, 0 differences |
| B.5 | draws 1 to 4 for the spread | `LB_COMM_DRAW=k` (k = 1..4) selects `priors/<hash>.draw<k>.json` and a separate store (the store key includes the draw). If that file is absent, the build draws it: the same `louvain()` on the same code graph in a scratch database whose node and edge rows are loaded in a seeded random order (seed 20261112 + 7919 k), so each draw is fresh and reproducible. | dev test on one parent: draw 1 gave 18 communities (adjusted Rand index 0.685 against draw 0, 19 communities), draw 2 gave 17 (0.747); building draw 1 again read the file. No draw file exists yet. |
| C.7 | name the application-code cache | default PageRank runs its 40 iterations in application code over a transition CSR that is fetched by one Cypher query and **cached in application code per (direction, classes, co-change weight)**, so a repeated call with the same configuration skips the fetch and its warm latency is flattered. `bench.js` now also reports `first_call` (the first answer on an open store, no cache) and `warm_uncached` (repeated calls with the application caches dropped before each), beside `cold` and `warm`. | `results/ladybug/engine.json` (`latency._note`) |
| (common NOTES) | one TQ answer file name | the diagnostic moved from `results/tq/ladybug.tune.jsonl` to `results/ladybug/tq_diagnostic/ladybug.tune.jsonl` | `results/tq/` holds only `ladybug.tune.answers.jsonl` for this arm |

### Kind-cost table for `x_wsp` (for the DuckPGQ lane to adopt)

Cost of an edge = the cost below for its kind / max(its confidence, 0.05). Fixed before any score was
seen; costs are set per class, so every kind of a class has the class's cost.

| class | cost | kinds |
|---|---|---|
| structure | 1 | defines, has_column, maps_table, includes_router, contains (source not runtime, slice or invariant_group) |
| membership | 4 | contains (source runtime, slice or invariant_group) |
| imports | 1 | imports, uses_constant |
| calls | 1 | calls, renders, passes_callable, depends_injects, inherits, navigates, registers_screen |
| http | 1 | calls_url, registers_route |
| tests | 1 | test_calls_route, mocks, overrides |
| data | 1.5 | reads_table, writes_table, writes_column, foreign_key, migration_touches, migration_follows |
| config | 1.5 | reads_setting, enqueues_kind, kind_handled_by, registers_job, runs |
| capability | 3 | same_capability, contract |
| docs | 3 | cites, mentions, constrains |
| history | 2 | co_changed (symmetric: one arc in every direction) |
| experimental | 3 | reads_response_field, returns_model, has_field |

Arcs follow SPEC 4 (direction, classes, `minConf`); score = 1 / (1 + the minimum cost from any seed),
0 when no path exists; ties: hop, then id. The DuckPGQ arm's table (`arms/duckpgq/sweep.js COSTS_A`)
differs: imports 2, data 2, config 2, experimental unset (cost 1 there), and its notes describe a cost
per class with no division by confidence and no hub rule. This arm keeps its own table, as instructed.

### x_prank: what the engine's `page_rank` computes (toy probe, `tmp/ladybug/probe_pr.js`)

On a five-node toy graph (1->2, 2->3, 3->1, 1->4, node 5 isolated): the engine's `page_rank` is
**directed** (it follows the stored direction of the projected relationships; a reversed or undirected
reading gives other values), teleports uniformly with (1 - 0.85) / N, counts parallel edges separately,
and **drops dangling mass**: a node with no outgoing projected edge passes nothing on, so the scores sum
to less than 1 (0.392 on the toy). With uniform teleport, dropping the dangling mass gives scores
proportional to the textbook definition that spreads it uniformly (on the toy every node's ratio is
2.5525), so the order of candidates, which is all `x_prank` uses, is the same. Engine defaults: damping
0.85 and its own iteration cap and tolerance (its default result is within 1e-4 of the converged one on
the toy). Only the rank order enters the hybrid (reciprocal rank fusion).

## Files

| file | what it is |
|---|---|
| `store.js` | builds one store per (parent commit, removed documents, community draw) from `exportCanon` (its own sha256 of the files must equal the canonical hash), and opens it; `nativePriors` (page_rank, k-core, community prior), `edgeCost` |
| `lb.js` | `LbGraph`: every SPEC algorithm plus the native modes, as Cypher over the store |
| `pattern.js` | the metapath as native typed path patterns (`traversal.variant = "pattern"`) |
| `arm.js` | the registry entry `open(G, opts)`; by default one child process per open store (`child.js`) |
| `child.js` | the child that holds one store and answers rank and tq over IPC |
| `tq.js` | one Cypher query function per TQ kind; `node tq.js` writes `results/ladybug/tq_diagnostic/ladybug.tune.jsonl` |
| `sweep.js` | the stage-1 list: exactly 40 configurations (base is entry 1), plus `complexity()` (predates addendum 3 item 10; not the selection rule) |
| `crosscheck.js` | earlier cross-check beyond the relational list (10 random configurations, the 13 extra combinations, the pattern variant, in-engine PageRank); not re-run in this revision |
| `xrandom.js` | new: N seeded random (configuration, task) pairs over T1, T1x and T2 from `common/crosscheck_random.js drawConfig`, strict against the reference arm, plus the pattern variant of every metapath pair |
| `wspcheck.js` | new: `x_wsp` against a JavaScript Dijkstra (three directions x four hub rules, plus one wide configuration) |
| `commcheck.js` | new: two fresh store builds per parent, `x_comm` rankings compared |
| `verify.js` | new: the answer-file checks (budgets, every configuration for every task, lookups, list hash, TQ file); `--stage 2` checks the stage-2 list |
| `stage2.json` | the 20 stage-2 configurations (section "Stage 2" above) |
| `compare_old.js`, `answers_same.js` | new: old against new answers; packed answers of two arms compared without the `meta` field |
| `priors/` | new: the community prior files, one per canonical graph (54 now: 53 TUNE parents and the frozen commit) |
| `priors.js` | core-number distribution and Louvain spread over 5 runs (diagnostic from the previous revision; `results/ladybug/priors*.json` are its LB5 outputs) |
| `bench.js` | engine measures (load, bytes, memory, cold, first-call, warm and warm-uncached latency, one-file update against a fresh build, EXPLAIN plans, lines of query code) |
| `run_checks.sh`, `run_stage1.sh` | the runs of this revision (below) |
| `dk.sh` | host helper that runs a command in `graphtest:1` with the required flags, mounts and volume |

## How to run (from the host, in the build root)

```
bash arms/ladybug/dk.sh "bash /build/arms/ladybug/run_checks.sh"   # relational-list cross-check, xrandom, wspcheck, commcheck
bash arms/ladybug/dk.sh "bash /build/arms/ladybug/run_stage1.sh"   # stage-1 sweep (stores in /store/s1) + TQ
bash arms/ladybug/dk.sh "cd /build && node arms/ladybug/verify.js --out /build/results/ladybug/sweep/stage1/verify.json"
bash arms/ladybug/dk.sh "cd /build && node arms/ladybug/bench.js"   # results/ladybug/engine.json, query_plans.txt
bash arms/ladybug/dk.sh "MODE=full bash /build/tmp/tune-ladybug/run_stage2.sh"   # stage 2 + cross-check (stores in /store/s2)
bash arms/ladybug/dk.sh "cd /build && node arms/ladybug/verify.js --stage 2 --out /build/results/ladybug/sweep/stage2/verify.json"
bash arms/ladybug/dk.sh "cd /build && LB_COMM_DRAW=2 node arms/common/sweep.js --arms ladybug --sets T1 --only 'native rank=hybrid ppr+x_comm' --out <root>"   # a later spread run (draw 2)
```

The two scripts can run at once: they use different store folders (one LadybugDB store can be held
by one process only). Environment switches: `LB_THREADS` (engine threads per query, default 1),
`LB_PPR` (`app` or `engine`, where the 40 PageRank iterations run), `LB_INPROC=1` (no child process),
`LB_PREPARE=0` (no prepared statements), `LB_COMM_DRAW` (0 default, 1 to 4 for the spread draws),
`LB_PRIORS_DIR` (another prior folder, for tests).

## Store schema

- `N`: one node table with the canonical columns plus precomputed properties: `dl` (BM25 document
  length), `transport`, `pi_<class>` (production in-degree per class), `prank` (global page_rank over
  `PR_FILTER`), `core` (k-core number over `CODE_FILTER`), `comm` (the community of the prior file),
  and `p`, `q`, `W` (scratch columns of the in-engine PageRank).
- `f_<type>` / `r_<type>`: one relationship table per edge type (the kind, or `contains_m` for
  membership containment), in the stored direction and reversed; `co_changed` has only `f_`, holding
  both orientations. Used by the typed path patterns and by TQ.
- `A`: the arc table. Every edge once in its stored direction (`sym 0, prim 1`) plus the mirror row of
  every `co_changed` edge (`sym 1, prim 0`), with `w, n, kid, cls, sym, prim, cost`. "both" is
  `(u)-[A]-(v)` restricted to `sym = 0 OR prim = 1`, which gives exactly one arc per SPEC 4 rule.
- `EV`: evidence rows (path, line, op) for TQ. `T` / `HAS`: the term graph for BM25.
- Everything derived (term graph, `dl`, `pi_*`, `transport`, the native priors) is computed by Cypher
  inside the engine at build time; the community column is written from the prior file.

## What is native, what is a query, what is application code

| algorithm (SPEC) | how it runs | label |
|---|---|---|
| k-hop reach and hop | `-[p:A* SHORTEST 1..H (r, n \| WHERE class, weight, direction, hub)]-` | native |
| unbounded reach | the same with `1..10000` (`var_length_extend_max_depth` raised from 30) | native |
| reach DAG, blocked end nodes, out-degrees | one Cypher query for the arcs out of every expanded node | engine query |
| parents, `npar`, explanation paths | application code over those rows | application |
| hub cuts (indeg, transport) | node predicates on precomputed `pi_*` / `transport` inside the recursive filter | native |
| per-edge-class budgets | one Cypher expansion query per BFS level; the mixed-radix state machine in application code | engine query + application |
| ordered metapath (spec) | as budgets: per-level Cypher, the automaton in application code | engine query + application |
| ordered metapath (variant `pattern`) | typed path patterns over `f_`/`r_` tables, two aggregate queries per step (`pattern.js`) | native |
| degree-normalised | arcs and out-degrees by Cypher; the activation spreading (and the out-degree-0 fallback) in application code | engine query + application |
| personalised PageRank (default) | transition arcs by one Cypher query, **cached in application code** per configuration; 40 iterations in application code, timed inside `engine_ms` with the data fetch on the first call only | engine query + application |
| personalised PageRank (`LB_PPR=engine`) | every iteration as Cypher writes on node properties; same output (cross-checked) | engine query |
| co-change | one Cypher join on the candidate's file | engine query |
| text (BM25) | Cypher over the term graph `T`/`HAS` (the FTS extension is not installed in the image) | engine query |
| hybrid (RRF) | application code over the part rankings | application |
| `x_wsp` | native `WSHORTEST(cost)` with the hub predicate; blocked end nodes by one more Cypher query plus a minimum in application code | native + engine query |
| `x_comm`, `x_prank`, `x_core` | stored native priors read by Cypher (`x_comm` from the prior file, see B.5) | native (stored) |
| TQ | one Cypher function per kind; `screen_tables` stage 1 is one Cypher query per BFS level (see limits) | engine query |

Why the budget and metapath state machines are not one recursive pattern: a recursive pattern's
filter sees one relationship and one node at a time, cannot read path state (per-class counters or
the automaton state), and cannot take parameters. The typed-path-pattern form of the metapath
(`variant: "pattern"`) does express the automaton natively, as a fixed sequence of typed segments,
and is cross-checked equivalent to the specified algorithm.

## Native configuration modes (SPEC 9.4), with their definitions

None is cross-checked against the reference (they are not SPEC algorithms), except `pattern`.

- **`rank: {mode: "ppr", variant: "gds"}`**: the engine's `GDS_PPR` on a projected graph of `A`
  restricted to the configuration's classes (each edge once). Sources are the seeds (by offset),
  `dampingFactor = 1 - restart`. Undirected and unweighted with its own stopping rule; `direction`,
  `minConf`, `cochange_w` and the hub rule do not enter it. Reach set and hops from the traversal.
- **`rank: {mode: "x_wsp"}`**: weighted shortest path, defined in the table above (addendum 3, A.2).
- **`rank: {mode: "x_comm"}`** (in a hybrid with PPR): 1 when the candidate's community holds a seed,
  else 0. The community is the canonical graph's stored grouping (B.5), a Louvain run on the code graph
  (structure, imports, calls, http, tests, data, config, history; each edge once; undirected).
- **`rank: {mode: "x_prank"}`** (in a hybrid with PPR): the engine's global `page_rank` (damping 0.85,
  engine defaults) on the code graph with co-change in both directions; dangling mass dropped, which
  keeps the textbook order (see the probe above).
- **`traversal: {mode: "x_core", hops, k}`**: k-hop traversal with the hub cut "core number > k"
  (engine `k_core_decomposition` of the code graph); seeds exempt; a blocked node is reached, never
  expanded, as in SPEC 5.
- **`traversal: {mode: "metapath", variant: "pattern"}`**: the ordered metapath as native typed path
  patterns. Walk semantics equal the BFS over (node, automaton state); specification-equivalent.

Left untried, with the reason: `GDS_LEIDEN` and label propagation (a second community prior before
any score shows the first helps), Katz, betweenness, eigenvector (global centralities like `x_prank`),
closeness (fails on a disconnected graph), node2vec (needs a similarity layer this protocol does not
have), WCC/SCC (coarser than a Louvain community), `TRAIL` / `ACYCLIC` (same reach as `SHORTEST`, higher
cost), full-text and vector indexes (not in the image; installing is forbidden).

## Results of this revision (TUNE only; HELD-OUT never run; no scores were seen)

All runs inside `graphtest:1`, `--cpus 6 --memory 4g`, while other containers (the bench, another lane)
shared the host; the times below are therefore indicative only, not engine measures. Task counts:
T1 388, T1x 144, T2 240 (772 in all; 53 parents); T1 + T2 = 628 tasks.

**1. Equivalence with the reference arm.**

| check | comparisons | failures | notes |
|---|---|---|---|
| relational stage-1 list (hash 5efda93e9c470eb9, 40 configurations), all 628 TUNE T1 and T2 tasks, `common/sweep.js` | 25,120 | 0 equivalence failures | packed answers identical in 25,120 of 25,120 once the arm's own `meta` field is set aside (`answers_same.js`); 745 s wall |
| 300 seeded random (configuration, task) pairs, seed 20261114, over T1 (145), T1x (49) and T2 (106), 47 parents, `xrandom.js` | 300 | 0 ranked lists differ, 0 packed answers differ, 0 equivalence failures, 0 errors | 200 pairs from the stratified cycle, 100 from the focused draw. Metapath with degnorm: dependents 29, dependencies 29, both 4 pairs; metapath with a hybrid ranking: 28, 28 and 3. The out-degree-0 fallback was used in 18 pairs. 28 pairs had a step whose kinds are absent at the parent (20 of them reached nothing); 93 pairs reached nothing in all. 112 s wall |
| the same pairs' metapaths as native typed path patterns | 166 | 0 equivalence failures | 146 byte-identical; the other 20 differ only in the explanation path (any valid shortest path is accepted, E.19) |
| `x_wsp` against a JavaScript Dijkstra (`wspcheck.js`), 2 tasks per parent, 13 configurations | 135,337 candidate scores | 0 differences above 1e-9 | 9,899 scores are of hub-blocked candidates; 23,028 scores would differ if blocked nodes could be passed through (the old definition) |
| `x_comm`: two fresh builds of every one of the 53 parents (`commcheck.js`), the stage-1 `ppr + x_comm` entry and `x_comm` alone on all 772 tasks | 1,544 rankings | 0 differ | on 6 of the 53 parents a fresh build's own Louvain run differed from the stored grouping (adjusted Rand index 0.61 to 0.89), on 3 of them the two fresh builds also differed from each other; the stored grouping removed that. 391 s wall |

`common/sweep.js` reports `answers_differ` 25,120 for the reference~ladybug pair: its comparison
strips `arm`, `ms` and `engine_ms` but not the new `meta` field (addendum 3, D.12), which this arm
fills with its own query counts. With `meta` set aside every packed answer is identical (above). The
equivalence count and the ranked lists do not depend on it.

**2. Stage-1 sweep.** List hash `62916d71ad487af9` (unchanged), 40 configurations on 772 TUNE tasks =
30,880 answers. The one current set: `results/ladybug/tune/` (120 files, `<config hash>.<set>.jsonl.gz`),
summaries in `results/ladybug/sweep/stage1/ladybug_T1+T1x+T2.{summary,configs,crosscheck_mismatches}.json`,
list log `results/ladybug/sweep/lists.jsonl`. The previous set (`results/ladybug/stage1/`) and the
previous cross-check, dev and log folders were moved to `tmp/ladybug/old/`. Wall time 2,141 s.
Ranking p50 / p95 wall time (ms, including IPC; host shared): base 4.6 / 40.9, hops=null 40.4 / 88.1,
budget B1 51.9 / 136.0, budget B2 70.4 / 302.7, degnorm 2.6 / 4.9, x_wsp 17.4 / 81.3, hybrid ppr+x_wsp
18.2 / 59.5, hybrid ppr+x_comm 5.2 / 9.5, hybrid ppr+x_prank 4.9 / 8.7, x_core k4 5.4 / 8.3, ppr gds
1,319 / 1,502, pattern metapath 730 / 2,053.

**Old against new** (`compare_old.js`, `results/ladybug/sweep/stage1/old_vs_new.json`): 903 of 30,880
ranked lists changed, and 898 packed answers; all in two configurations, nothing else changed:
- `native rank=hybrid ppr+x_prank`: 747 of 772 lists (50 parents), because the page_rank prior now
  counts co-change in both directions (A.3).
- `native rank=hybrid ppr+x_comm`: 156 of 772 lists, all on 5 parents (1a92ea23, 31ac1eba, c293916e,
  d3103498, f94ede29), because the previous sweep used whatever grouping its own store build drew and
  those draws differ from the stored canonical grouping on those parents (B.5). On the old LB5 stores
  (read once with `tmp/ladybug/oldcomm.js`, then removed from the volume), 3 of 53 TUNE parents' groupings differ from the prior files (adjusted Rand
  index 0.61 to 0.94); the previous sweep ran on its own copies of the stores.
- No stage-1 entry uses degnorm with a metapath (the out-degree-0 fallback cannot fire) and no stage-1
  `x_wsp` entry has a hub cut, so those fixes change no stage-1 list; `x_wsp` costs are unchanged.

**3. TQ.** 20 TUNE questions, 0 errors, `results/tq/ladybug.tune.answers.jsonl` (via `run.js tq`);
diagnostic `results/ladybug/tq_diagnostic/ladybug.tune.jsonl`. All 20 answers equal the previous
ones and the relational arm's answer file (compared as answers; the reference answers were never read).

**4. Answer-file checks** (`verify.js`, `results/ladybug/sweep/stage1/verify.json`): 0 problems.
Every configuration of the logged list (hash recomputed and equal) present for every TUNE task of
T1, T1x and T2, with no duplicate, extra or held-out id, and the same task ids as the relational arm's
files; config hash equal to the file's; no answer over its budget; `used` recomputed from the items
equal at every budget; head plus tail tokens equal; `n_full + cut + beyond = n_units`; lookups head 1,
pad 0/1/2 by padding, total their sum; TQ 20 lines with every field, no other ladybug file in
`results/tq/`.

**5. Bench** (`bench.js`, run once to prove it works, beside other containers; not the final timings):
see `results/ladybug/engine.json` and "Bench run of this revision" below.

### Bench run of this revision (indicative; the host was shared; the quiet-machine run comes later)

`bench.js` ran once to the end (44.8 min wall, exit 0) and wrote `results/ladybug/engine.json` and
`query_plans.txt` (the previous ones are in `tmp/ladybug/old/`). Frozen commit, 30 seeds, 1 thread per
query. p50 in ms (cold = fresh Database through the first answer; first = first answer on the open
store; warm = repeated calls, application caches kept; warm uncached = repeated calls, application
caches dropped before each):

| query class | cold | first | warm | warm uncached |
|---|---|---|---|---|
| PPR r0.30, 2 hops (base; iterations in application code over a cached adjacency) | 64.9 | 50.5 | 7.5 | 40.0 |
| PPR r0.30, unbounded (same) | 146.3 | 133.9 | 87.8 | 119.8 |
| hybrid PPR + text | 74.0 | 58.8 | 10.9 | 43.5 |
| hybrid PPR + x_comm | 80.8 | 65.2 | 9.6 | 44.2 |
| hybrid PPR + x_prank | 74.2 | 59.3 | 9.4 | 45.4 |
| PPR, every iteration as Cypher writes (8 seeds) | 1,981 | 1,970 | 1,780 | 1,619 |
| native GDS_PPR | 83.6 | 70.0 | 64.1 | 69.9 |
| x_wsp | 90.4 | 74.6 | 53.8 | 55.0 |
| x_wsp with hub cut indeg > 10 | 95.2 | 79.9 | 57.8 | 56.2 |
| k-hop 3 | 37.9 | 20.6 | 11.0 | 10.2 |
| budget B1 | 220.6 | 204.0 | 163.2 | 175.8 |

So the application-code cache makes the default PageRank's warm p50 about 5 times faster (7.5 ms
against 40.0 ms uncached); classes without that cache change little. Builds: 3,776, 3,915 and 3,899 ms
(19.1 MB). Memory: RSS 87 MB after open, 163 MB with facts, 616 MB after every query class. One-file
update (`backend/app/features/jobs/service.py`): 2,559 ms plus 1,063 ms for the global priors; every
table equals a fresh build; page_rank scales by 0.98789 (deleted slots counted, an engine trait); the
community column now equals the fresh build (adjusted Rand index 1.0, read from the prior file), while
the update's own Louvain run would have differed (adjusted Rand index 0.438, 50 against 54
communities). The facts here are unchanged, so the canonical hash is the store's; a real one-file
change has a new hash and its first build or update writes a new prior file.

**Stores**: stage-1 stores in `/store/s1/ladybug`, cross-check stores in `/store/ladybug` (both on the
volume `gt-ladybug`). Prior files: `arms/ladybug/priors/` (54 files, 356 KB).

## Departures from SPEC and the protocol

- The stage-1 list has 40 entries **including** base (the harness refuses any other size).
- PageRank iterations run in application code by default (40 exact iterations over a CSR built from
  one Cypher query and cached in application code per configuration). The fully in-engine form exists
  (`LB_PPR=engine`), was cross-checked equal in the previous revision, and costs about 0.3 to 1.6 s a
  ranking, so the sweep uses the first. Repeated-call latency of the default is flattered by the cache;
  bench reports the uncached first call and an uncached repeated call beside it.
- The default arm runs each store in a child process. The harness's wall time includes one IPC round
  trip per ranking; `engine_ms` is measured inside the child and excludes it.
- Stage-1 list cuts against the relational list, to make room for 7 native entries, chosen before any
  score: hops 6, three class-ladder steps, `+membership`, hybrid bfs+cochange+text, and the two
  symbol-granularity form combinations.
- `x_comm` uses a stored grouping (B.5); `x_prank` and `x_comm` read native results stored at build.

## Engine limits found (each cost time; each is handled in the code)

- Parameters are not allowed inside a recursive pattern's filter or in its hop bounds; values go in
  as literals. A recursive filter may not mix the relationship and the node in one predicate.
- In walk (non-`SHORTEST`) variable-length patterns the recursive node filter did not keep blocked
  nodes off a segment's end node; the hub rule is repeated on every segment end node in the outer
  `WHERE`. With `SHORTEST` and `WSHORTEST` the end node is filtered, so blocked end nodes are added by a
  separate query (k-hop and `x_wsp`).
- The default maximum recursion depth is 30 (`CALL var_length_extend_max_depth=10000`); `SHORTEST`
  needs a lower bound of 1. Lists are 1-based. `table` is a reserved word as a parameter name.
- CSV loading needs explicit `quote='"', escape='"'`, `parallel=false`, and typed columns.
- One relationship table for deep recursion: a union of 61 labels at depth 6 took 126 ms against
  18 ms for the single arc table `A`.
- Every query result must be closed at once, or the buffer pool fills within seconds.
- Every prepared statement pins buffer-pool pages until the process ends; at most 48 constant texts
  are prepared per store, texts with per-task literals go through `querySync`.
- A closed `Database` does not return its native memory to a live process (about 25 MB per store with
  plain queries, about 95 MB with prepared statements); hence one child process per store.
- Each `Database` reserves 8 TiB of address space by default; `maxDBSize` is set to 4 GiB.
- An interrupted build leaves a `.wal` that a rebuilt database of the same name refuses; the build
  removes every sibling file first.
- `GDS_PPR` with `tolerance := 0` never returns. `GDS_*` take one relationship table, node offsets,
  and are undirected and unweighted; `GDS_CLOSENESS` fails on a disconnected graph.
- `louvain()` takes no seed; its grouping depends on the order of the rows (the draws use that).
  `page_rank` is directed, drops dangling mass, and after deleting nodes counts the deleted slots.
- With 24 threads, small queries were slower than with 1; every run here uses 1 thread per query.

## For other lanes

- DuckPGQ lane: adopt the kind-cost table above, cost / max(confidence, 0.05), and the hub rule for
  `x_wsp` (blocked nodes may end a path, never be passed through).
- Harness lane: `common/sweep.js` compares packed answers without stripping `meta`, so any arm that
  returns `meta` shows `answers_differ` = every pair; `answers_same.js` here shows the comparison with
  `meta` set aside. The line of this arm's list in `results/sweep/lists.jsonl` lives in
  `results/ladybug/sweep/lists.jsonl` (this lane writes only in its own folder).

## History

- Phase A/B build (2026-11-12, afternoon): stores LB5, the full cross-check (25,120 comparisons on
  the relational list, 6,280 random, 8,164 extra, 5,652 pattern, 1,400 in-engine PageRank, 0
  failures), the stage-1 sweep (1,524 s), TQ, the first bench. Those outputs are in `tmp/ladybug/old/`.
