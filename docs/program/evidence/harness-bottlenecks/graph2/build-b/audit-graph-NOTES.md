# Audit of the graph arms (Ladybug 0.22.3, DuckDB 2.0.0 + DuckPGQ)

Lane: audit-graph. Date: 2026-11-12. Folder: build/audit/graph (scratch: build/tmp/audit-graph, empty).

## Verdict

Stage-1 scoring can start for both graph arms on the lists as they stand. Every specified
(spec-only) configuration in the three stage-1 lists gives answers equivalent to the reference arm.
The defects found are either outside the stage-1 lists, in the extension ("native") rankings, or in
latency measurement. Fix before HELD-OUT: the Ladybug community prior (x_comm) is a new random draw per
store build, and the latency numbers need a quiet-machine run before any engine-speed claim.

## What exists and how to run it

All scripts run inside the image with `bash audit/graph/dk.sh "node <script>.js"` from build/.
dk.sh runs graphtest:1 with 6 CPUs and 4 GB, mounts /build read-only except build/audit/graph and
build/tmp/audit-graph, mounts the builders' volumes read-only (gt-ladybug at /lbstore, gt-duckpgq at
/dkstore) and keeps my own stores on the named volume gt-audit-graph at /work.

| Script | Check | Output |
| --- | --- | --- |
| probe_engines.js | 5 | engines_features.json (function lists and settings of both engines) |
| probe_sigs.js | 5 | engines_sigs.json, engines_sigs.err (signatures and what works) |
| probe_opts.js | 5 | engines_opts.txt (options each algorithm accepts) |
| probe_wsp.js | 5 | stdout (WSHORTEST crash on an in-memory toy database) |
| inputs.js | 1 | inputs.json |
| crosscheck300.js | 2 | results/crosscheck300.json, .rows.jsonl (and _subset variants with `--only`/`--arms`); log in results_xc300.log |
| toy_checks.js | 4 | results/toy_checks.json |
| probe_dkpr.js | 4 | stdout (DuckPGQ pagerank rule) |
| community.js | 4 | results/community.json (run `rm -rf /work/comm` first) |
| lists_and_results.js | 6, 8 | results/lists_and_results.json (host or image; reads only) |

## Results

1. Identical input: PASS. At 5 parents (02b9557c 2,250 nodes and 6,450 edges; 47004d15 1,091/2,723;
   9d896159 2,077/5,682; cd806c80 1,293/3,225; f94ede29 2,095/5,811) the Ladybug store, the DuckPGQ
   store and a fresh relational build all have node and edge digests equal to the loader graph, and
   both graph stores' canon_hash equals exportCanon's hash.
2. Cross-check: 300 seeded (seed 917) random pairs over T1, T1x and T2 TUNE tasks, none of whose
   configuration hashes the builders used. Ladybug 300 of 300 equivalent (byte-identical lists).
   DuckPGQ 297 identical, 2 errors, 1 equivalence failure (details under Defects D1 and D2).
3. Native or not: Ladybug labels are accurate. In DuckPGQ only the khop hop (iterativelength on a CSR),
   the one-edge DAG match, the JS-generated fixed-length metapath MATCH patterns and the x_* natives use
   the graph layer; budget, ppr, degnorm, explanations, text, cochange and hybrid are SQL. Two DuckPGQ
   list entries labelled native (MP_HTTP, MP_HIST) are ordinary spec metapaths.
4. Hand checks on a toy graph: all match (weighted shortest path, ordered metapath reach, 40-iteration
   PPR to 12 digits). GDS_PPR = undirected unweighted PPR, dangling to seeds, ignores minConf. Ladybug
   page_rank = directed, damping 0.85, dangling mass dropped. DuckPGQ pagerank = standard pagerank times
   a constant (sum 0.909 on a 3-cycle), same order. Community: Louvain on the same store is identical
   at 1, 6 and 24 threads (adjusted Rand index 1.0), but three fresh builds differ (index 0.892 to
   0.899); k-core is identical and page_rank differs by at most 1.3e-18. The builder's stored partition
   equals my build 0.
5. Strongest form: see Defects D5 to D9.
6. Fair tuning: all three lists have 40 entries (hashes relational 5efda93e9c470eb9, ladybug
   62916d71ad487af9, duckpgq 480f97f2c88b36f5) and share BASE. Ladybug drops 8 relational entries and
   adds 8; DuckPGQ drops 9 (also budget B2) and adds 9. The graph arms lose hops 6 and three class-ladder
   steps and gain extra metapath shapes the relational arm could also run.
7. Handicaps: see D10 and D11.
8. TQ: per-kind queries, same target regexes as the relational SQL, refuse non-tune splits. All result
   files hold only tune ids (20 rows each, 0 errors), and both graph arms' 20 answers equal the
   relational arm's. Stage-1 answer files: 120 files and 30,880 answers per graph arm, all split tune,
   40 configuration hashes with 772 answers each.

## Defects

| Id | Severity | Where | What |
| --- | --- | --- | --- |
| D1 | minor | arms/duckpgq/pgq.js stepArcSql | A metapath step whose classes and kinds are all absent at a parent emits `AND ()` and fails (TUPLE to BOOLEAN cast). Pairs 298 (T2-0045) and 299 (T1x-0012). Not in any stage-1 list. Fix: emit FALSE. |
| D2 | minor | arms/common/SPEC.md 8.1 | degnorm over a metapath whose step direction differs from cfg.direction: od(u)=0 gives Infinity (JSON null) in reference and Ladybug, 0 in DuckPGQ and relational. Pair 229 (T2-0030), node 206 via 787 to 587 to 206. Not in any list. Fix: define it in SPEC. |
| D3 | biases a result | arms/ladybug/store.js x_comm | Louvain has no seed; each store build is a new partition (index about 0.89 between builds). A held-out build will not reproduce the tuned prior. Fix: build once and freeze the partition, or score several draws. |
| D4 | minor | arms/duckpgq/sweep.js | MP_HTTP and MP_HIST labelled native; they are spec metapaths. Relabel. |
| D5 | biases a result (latency only) | arms/duckpgq/pgq.js khop | Unbounded iterativelength from every seed to every node, then rows with d > H deleted: p50 50 ms against Ladybug 13 ms. Fix: bounded lengths or reachability. |
| D6 | minor | arms/ladybug/store.js x_prank | co_changed counts once, directed smaller id to larger; dangling mass dropped. |
| D7 | minor | both x_wsp | Cost tables differ (Ladybug divides by confidence and ignores hubs; DuckPGQ does neither), so the two native options are not comparable. |
| D8 | minor | arms/ladybug/store.js | page_rank and louvain run with default parameters; Leiden, label propagation, Katz, ALL SHORTEST and REL TABLE GROUP unused. |
| D9 | minor | arms/duckpgq | Projection and property graph rebuilt per connection; store attached READ_ONLY so no stored property graph; 4 threads under 6 CPUs. |
| D10 | biases a result (latency only) | measurement | Builders ran on shared CPUs alongside other runs; E.22 quiet-machine condition not met. |
| D11 | minor | arms/ladybug lb.js | PPR transitions cached per store and configuration in JS, which flatters repeated-call latency. |

## Deviations

- The builders' stores were opened read-only from their volumes; my builds are on gt-audit-graph.
- The random generator caps budget state spaces at 1,024 states (the reference arm overflows a JS Set on
  larger ones, noted in the phase A audit).
- Extensions (x_*) and `variant` configurations are not in the 300-pair cross-check, as SPEC says; they
  were checked by hand on toy graphs instead.
- Community reproducibility was measured on 2 TUNE parents (f94ede29, 9d896159), not all.
- No HELD-OUT task was run and sealed/ was not read. Nothing was installed or downloaded.
- Latency numbers here come from the same shared machine and are indicative only.

## Needs from other lanes

- DuckPGQ builder: D1, D4, D5.
- Common lane: D2 (SPEC 8.1).
- Ladybug builder: D3, D6.
- Both graph builders: D7 if the native options are to be compared.
- Measurement lane: a quiet-machine latency bench (D10).
