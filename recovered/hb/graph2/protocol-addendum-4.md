# Protocol addendum 4 — rules for the held-out run

Written 2026-11-13, after the tuning-set tables existed and before any held-out task or question
was run. It rules on the defects the selection audit found. Nothing here was written with held-out
data, because none exists yet.

## A. Selection tie rule (amended, for every arm alike)

1. The rule of addendum 3 item 10 stays, with one change in the tie order. Among configurations
   within one standard error of the arm's best T1 TUNE primary, take the lowest complexity. Ties
   are broken by **higher T1 TUNE primary**, then lower median tokens, then name.
2. Why. The old tie measure (median tokens) is inert: every answer that fills its budget uses
   7,999 tokens. The choice fell to alphabetical order, which picked `hops=4`, the weakest of 15
   tied configurations (T1 0.768 against 0.785; cross-runtime subset 0.530 against 0.609). An
   alphabetical handicap on three arms is a defect of the rule, not a finding.
3. This amendment was made after the TUNE tables existed. It uses TUNE data only, so the held-out
   estimate stays unbiased. To keep it checkable, the choice of the rule as first written is run
   on held-out too (row S1 below) and reported beside the primary.
4. Frozen primaries under the amended rule:
   - relational, LadybugDB, DuckPGQ: `95e990307da3b42b` (unbounded k-hop, both directions, base
     edge classes, degree-normalised ranking, file granularity, signature form, no padding);
     T1 TUNE 0.7853, complexity 2.
   - search: `e70177e5807f0252` (unchanged; T1 TUNE 0.7593, complexity 3).
   - floors: floor-dir `714a474060653c1f`, floor-co `c4d2f0a60a3d199c` (unchanged).

## B. Declared held-out runs (the complete list; nothing else runs)

5. Per arm, on T1, T1x, T2, T3 and T4:
   - **primary**: the configuration of item 4.
   - **S1 (rule as first written)**: `6b70cc1222745385` (`hops=4`) for relational, LadybugDB and
     DuckPGQ. Descriptive; no claim rests on it.
   - **S2 (best form)**: the arm's highest T1 TUNE primary regardless of complexity, where it
     differs from the primary: LadybugDB `f233ae069bdba0ce` (personalised PageRank fused with the
     stored community prior, a native engine mode; T1 TUNE 0.7862) and search `950c029615d337c1`
     (T1 TUNE 0.7644). Addendum 3 item 5 applies to the LadybugDB row: it is also scored on four
     further community draws.
   - The reference arm runs the primary and S1 for the equivalence check only. It is not scored.
6. The 30 held-out questions (TQ) run once for relational, LadybugDB, DuckPGQ and search, with the
   question code frozen by its code hash.
7. **T5 is not run.** Its seeds are free-text searches typed in a session. The shared seed
   contract maps a file or definition to nodes, T5 has no tuning part on which a text-to-seed step
   could be built and tuned, and an untuned one would handicap the typed arms. The protocol
   already made T5 descriptive only, and lookups are measured by TQ.

## C. Comparisons (additions to addendum 3 section E)

8. H1 tie: when both graph arms have the same T1 TUNE primary, LadybugDB is the H1 graph arm (it
   has the wider set of native algorithms). No number depends on this while the answers are
   identical.
9. **H1b (best form, secondary).** LadybugDB S2 against the relational primary on T1 HELD-OUT,
   same paired cluster bootstrap and the same wording rule. This is the direct test of whether a
   native graph algorithm adds answer quality over the shared specification. The spread over the
   five community draws is reported with it.
10. H3 also reports search S2 against the typed primary. S1 rows are reported for H3 without a
    verdict.

## D. Run discipline

11. The runner has no reference answers and no scores. Reference files are hidden from every arm
    process (an empty mount over `sealed/`).
12. A mechanical failure (crash, refusal by the lock, missing or incomplete answer file) may be
    fixed and that run repeated, as long as no held-out answer has been scored. Every repeat is
    logged with its reason. Once the grader has scored any held-out answer, no arm code,
    configuration or answer file changes.
13. Frozen records are keyed by (arm, configuration hash) and carry the role (primary, S1, S2,
    cross-check) and a hash of `arms/<arm>/*.js` plus `arms/common/*.js`. The lock refuses a
    held-out run when the record is missing or the code hash differs.
14. Before the held-out run, the removed-document path used by T3 and T4 is exercised on tuning
    tasks with a document removed, for every arm, and checked: equivalence with the reference arm,
    and the removed document never appears in an answer.
15. Tuning is closed. Arm notes that hold an arm's own aggregate TUNE scores stay where they are;
    no further tuning step can read them.

## E. Engine measures (H5)

16. Benches live outside the arm folders (`build/bench/`), so they do not change a frozen code
    hash. They time on tuning tasks only.
17. Quiet machine: no other container of this test runs during a measure, and measures run one
    engine at a time on pinned CPUs. Three containers unrelated to this test run on the host and
    are left alone; their CPU use (0.0 to 0.3 % of one CPU when checked) is recorded before and
    after each measure.
18. Query classes: the frozen primary (unbounded k-hop with degree-normalised ranking), S1
    (4 hops with personalised PageRank), the 2-hop base, LadybugDB S2, and the question lookups.
19. Each engine is reported at one thread and at its best thread setting; cold (fresh process,
    first call) and warm (median and 95th percentile); client round trips apart from engine time;
    store size on disk; store build time; length of the query text per class.
20. Labels that go with every H5 number: DuckPGQ's k-hop is recursive SQL, not a graph operator;
    LadybugDB's personalised PageRank runs in application code over a cached adjacency; SQLite's
    walk is a recursive common table expression.

## F. Declared limits (additions)

21. DuckDB sums on several threads are not bit-stable: 2 of 2,000 re-run answers differed in the
    twelfth decimal of one score. The equivalence rule already treats scores within 1e-9 as ties.
22. The three typed arms froze the same specification configuration and returned identical
    answers on all 772 tuning tasks. H1 and H2 are therefore expected to be exactly zero on answer
    quality; the engines can differ on H1b and H5 only.
