# Protocol addendum 2: rules fixed after the phase A audits (2026-11-12)

Written by the orchestrator after reading both phase A audits, before any arm configuration was
selected and before any HELD-OUT run. No rule here was chosen by comparing one arm's score with
another's. Each one closes a defect an audit measured. protocol.md and addendum 1 stand otherwise.

## A. Scoring

1. One scorer for every arm: `arms/common/score.js`, run only by the grader against the sealed
   references. `arms/search/score.js` is retired.
2. Rule `content` replaces `locate`. A file is credited when its whole path line is shown. A
   definition is credited only when its own signature line (or lines inside its body) is shown. A
   cut item counts only when the whole line fits.
3. Primary metric: unchanged in wording (recall of reference files and definitions inside an
   8,000-token answer, T1 HELD-OUT, averaged per commit), restricted to output forms that show
   content (signature or snippet). Reason: a bare list of every code file fits in about 2,500
   tokens and scored 0.94 under `locate`, so the metric could not tell arms apart.
4. Bare-path and range forms are scored on file ranking only: recall@10, nDCG@10, MRR.
5. Added secondaries: recall at 2k, 4k and 16k, area under that curve, tokens to 80% recall,
   definition-only recall, the unpadded curve, recall at matched tokens.
6. TQ gets one shared scorer: precision, recall and F1 of answer items against `tq_reference`
   (aliases accepted), plus tokens returned and lookups used. Reported with and without the 12
   judgement items both readers shared.

## B. Padding

7. The padding tail is a shared packer option: `none`, `DIR` (same directory, then same
   capability, then outward) or `CO` (co-change order). Every arm may use it. It is one of the
   swept factors and is chosen per arm on TUNE.
8. The DIR and CO floors stay as arms of their own. A method must beat them, not only search.

## C. Selection

9. The grader selects every arm's configuration by one rule: highest primary on T1 TUNE, then the
   simplest configuration within one standard error.
10. Stage 1: 40 configurations per arm, one factor at a time around that arm's own base, written
    before any score is seen. Stage 2: 20 more per arm around its stage-1 best, to try
    interactions, proposed from that arm's own TUNE score table. Equal counts for every arm.
11. `arms/search/tune_labels.jsonl` moves into `sealed/`. The search arm's self-selection is void.
12. The search arm goes through the common harness, including the held-out lock.

## D. Facts

13. `commits.jsonl` holds only the commits an arm may use. `meta.json` names no task commit or PR;
    those fields move to a sealed side file.
14. Co-change drops same-PR siblings of the task commit only (protocol section 3). The extra
    in-flight rule is removed.
15. Edge conventions, applied once in the shared loader every arm reads: one edge per
    (kind, source, target); weight = highest confidence; evidence count kept as a property;
    `co_changed` is symmetric; every other kind is directed and the direction is chosen at query
    time. `minConf` is a shared factor (default 0.5): edges below it are left out of unweighted
    traversals and kept as weights in weighted rankings.
16. Extractor fixes: mobile config reads, SQL taken from string literals only, URLs in ternaries
    and loops, Protocol-typed calls, environment reads, `:line` suffixes in citations. This changes
    the extractor version, so the whole cache is rebuilt and every arm is re-run.
17. The cache gains the two missing parents (8dafcecc, a31924a). A T3 or T4 task's removed
    document is filtered by the loader.

## E. Graph arm

18. Both graph engines load the same canonical graph the relational arm loads.
19. Cross-check (arm d) equivalence: the same reach set; the same rank order wherever two scores
    differ by more than 1e-9; an explanation path is right if it is any valid shortest path. Where
    an engine's native algorithm follows a different specification (stopping rule, dangling
    nodes), the arm says so, the cross-check uses a specification-equivalent query, and the native
    variant is a separate configuration.
20. The graph arm may use anything the engine runs natively: typed variable-length paths, ordered
    metapaths, weighted shortest paths, PageRank, Louvain communities, components, k-core. The
    relational arm may use anything expressible in SQL, and gains an ordered metapath mode (join
    chains). An algorithm an arm can only run in application code is recorded as "not in the
    engine" for that arm and timed with its data fetch included.
21. Ordered metapaths become a configuration mode for every arm. The per-class budget state space
    is capped.
22. Engine measures are taken one arm at a time on a quiet machine, inside `graphtest:1`, with
    store files on the container filesystem (not the Windows bind mount), and with query time
    reported apart from client overhead.

## F. Declared limits (unchanged)

23. Smallest effect of interest 0.05; with 75 held-out commits a difference under about 0.09 may
    be reported as inconclusive.
24. Explanation paths are not scored on T1 (there is no objective reference for them). TQ and T3
    carry the value of typed chains.
25. Commit bfb5714 stays in T1 (the rule counts existing code files, and it has under 30).
26. `.gitattributes` forces LF, so `git archive` output is byte-identical on Windows and Linux.
27. On TUNE, same-directory padding alone scored 0.72 and co-change alone 0.75 at 8,000 tokens
    (old rule, signature form). In a repo organised as vertical slices, the folder already encodes
    much of the connection information. Any method is measured against that.
