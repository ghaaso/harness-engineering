# Protocol addendum 3: rules fixed after the phase B audits (2026-11-12, evening)

Written by the orchestrator after both phase B audits and before any arm was scored. No score of
any arm existed when these rules were written. protocol.md and addenda 1 and 2 stand otherwise.

## A. Specification gaps closed

1. Degree-normalised ranking when a node has out-degree 0 under the configured direction (this
   can only happen in metapath mode, where a step may run against the configured direction): the
   out-degree is then the number of reach-DAG arcs leaving that node, which is at least 1. All
   four arms follow this. Until now two arms divided by zero and two dropped the term.
2. Ranking by weighted shortest path has one definition for both graph engines: the cost of an
   edge is its kind cost divided by its confidence, and a node removed by a hub cut cannot be
   passed through.
3. LadybugDB's stored PageRank prior counts a co-change edge in both directions.
4. A metapath step whose edge kinds are all absent at a commit reaches nothing (it is not an
   error).

## B. Reproducibility

5. LadybugDB's community detection gives a different grouping for each store build. The grouping
   is therefore stored once per canonical graph (keyed by its content hash) and reused by every
   rebuild. If a frozen configuration uses it, HELD-OUT is also scored on four further draws and
   the spread is reported.

## C. Engine fairness before any timing

6. DuckPGQ k-hop must not compute path lengths beyond the hop limit; its property graph is built
   once per store, not per connection; it uses as many threads as the container has CPUs.
7. Engine measures are taken only after these fixes, one arm at a time on a quiet machine
   (addendum 2, item 22). Client overhead (LadybugDB's child process, DuckDB's statement round
   trips) is reported apart from engine time. A cache held in application code is named as such.

## D. Stage 2 and selection

8. Every arm gets exactly 20 stage-2 configurations, proposed by a tuner that sees only that
   arm's own TUNE score table (aggregates per configuration, never per task, never references).
9. Mode catalogue: every tuner is told which ranking and traversal modes exist in any arm (names
   and definitions, no scores). An arm may add any of them if its engine can run it in its own
   language (SQL for the relational arm, the native graph features for the graph arms). A new
   mode needs a written definition and a hand check on a toy graph, and it counts inside the 20.
10. Parsimony ("the simplest configuration within one standard error of the best"): complexity is
    the number of ranking parts (1 for a single ranking, k for a hybrid of k), plus 1 each for:
    budget or metapath traversal; unbounded or more than 3 hops; any hub cut; padding; symbol
    granularity; an engine-only native mode. For the search arm: rounds beyond the first, routes,
    BM25, import following, padding, symbol granularity. Ties go to the lower median token use,
    then to the configuration name.
11. A padding tail costs lookups the same way for every arm: 1 for DIR, 2 for CO.
12. The search arm's tokens read reach the answer records. The floors run on the same task set as
    the swept arms.

## E. HELD-OUT comparisons, declared in advance

13. H1 (primary): the graph engine arm with the higher T1 TUNE primary, against the relational
    arm: difference in the primary metric on T1 HELD-OUT, paired cluster bootstrap over commits,
    95% interval.
14. H2: each graph engine arm against the relational arm.
15. H3: the H1 graph arm and the relational arm, each against search, the DIR floor and the CO
    floor.
16. H4: code-reading questions (30 held-out): typed-store arms against search on F1 and on
    tokens returned.
17. H5: engine measures: store build time, bytes on disk, memory, cold and warm latency per query
    class, one-file update, lines of query code.
18. Wording of a result: "better" only when the win rule of protocol section 7 holds;
    "equivalent" when the whole 95% interval lies inside plus or minus 0.05; "inconclusive"
    otherwise. Every estimate is reported with its interval so another threshold can be applied.

## F. Declared limits

19. The graph arms' question queries are translations of the relational ones, kind by kind, and
    return identical answers on TUNE. The questions therefore compare typed stores with search;
    between engines they compare query length and latency only.
20. 4.4% of TUNE T1 reference definitions (variables, object literals) have no node, so only the
    snippet form can credit them. The ceiling is the same for every arm.
21. When two arms select configurations that follow the shared specification with the same
    parameters, their answers are identical by construction and the difference is exactly zero.
    The engines then differ only on H5.
22. Audit flag traced: source text for parents 8dafcecc and d683faa4 was fetched at 16:37 by the
    facts fixer checking that the shared loader opens the rebuilt cache (node and edge counts
    only). No arm and no task ran there.
