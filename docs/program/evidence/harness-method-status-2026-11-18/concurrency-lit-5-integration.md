# Integrating many writers into one mainline: established practice and results

Collected 2026-11-18 by web search (summaries only) and WebFetch (a small model's summary of a page; PDFs failed to parse).
No full paper text was read. Numbers marked SUMMARY come from search or fetch summaries of the abstract or a page.
QUOTED means words seen on a page; none here is a long quote. TEXTBOOK means my own recall, not fetched; those lines say so.
Limits: the Uber 2019 evaluation numbers, the TAP 2017 numbers and the Google monorepo numbers were NOT obtained. No mapping to our case. No project term went into any search (rule 4). Format per entry: name | problem | how | result | wins/loses | must hold | failures | reference | how known + URL.

## A. Trunk-based development and the serial queue

**1. Trunk-based development (TBD)**
- Problem: long-lived branches give late, large merges ("merge hell") and an unreleasable branch.
- How: everyone integrates into one shared branch; short-lived branches; feature flags; branch by abstraction for big changes.
- Result: no measured number on the site. It states: integrate at least once per 24 hours; Google uses it with about 35,000 developers in one repo. Figure for effect on conflicts not given.
- Wins: small, frequent, reviewed changes with a fast build. Loses: when the build is slow or red, because everyone waits on trunk.
- Must hold: a build server, a fast full build, flags to hide unfinished work, small changes.
- Failure: a broken trunk blocks all writers; the cure is the gates below.
- Ref: trunkbaseddevelopment.com (community site); also DORA/Accelerate, Forsgren, Humble, Kim 2018 lists TBD as a delivery capability (TEXTBOOK, no figure recalled).
- Known: SUMMARY, https://trunkbaseddevelopment.com/

**2. Presubmit plus postsubmit (Google)**
- Problem: a bad change reaches trunk and many people stop.
- How: tests run before submit (presubmit) and again after (postsubmit); a TAP system batches changes and splits failing batches.
- Result: a change that passes presubmit has "very high likelihood (95%+)" of passing the rest. TAP handles over 50,000 unique changes and over 4 billion test cases a day. Average wait to submit about 11 minutes. Moving one team's end-to-end tests to a run every two hours cut its culprit set "by 12 times". A hermetic presubmit cut one team's test time 14x.
- Wins: most breakage caught cheaply. Loses: slow tests move to postsubmit, so breakage reaches trunk and needs culprit finding.
- Must hold: hermetic, reliable tests; a way to find the culprit in a batch.
- Failure: "mid-air collisions" (two clean changes that break together) happen "most days at our scale".
- Ref: Winters, Manshreck, Wright, "Software Engineering at Google", ch.23 CI, 2020.
- Known: SUMMARY, https://abseil.io/resources/swe-book/html/ch23.html

**3. Bors / "Not Rocket Science Rule" (serial gate)**
- Problem: each change passes alone but the merged result fails.
- How: a bot merges the change onto current trunk in a temporary branch, runs the full checks, and only then fast-forwards trunk. One at a time (bors-ng also batches).
- Result: no numbers. The page says the clash is caught because the second change "no longer applies cleanly" or fails the build on the combination. Public bors-ng is being phased out for GitHub merge queues.
- Wins: trunk is always green. Loses: throughput is capped at one check duration per merge unless batched.
- Must hold: a full check that is deterministic; changes that are small.
- Ref: Hoare, "Not rocket science" rule, Graydon Hoare 2009 (TEXTBOOK, from memory); bors-ng site.
- Known: SUMMARY of https://bors.tech/essay/2017/02/02/pitch/ (page is the "semantic conflicts" essay, not the original rule text).

## B. Speculative and batched queues

**4. Zuul speculative gating (OpenStack)**
- Problem: the serial gate is too slow.
- How: queued changes are tested in parallel, each on top of all changes ahead of it, assuming those pass. On a failure the change is dropped and those behind are retested without it.
- Result: no throughput numbers on the page. Best case: as many changes merge at once as there are executors. Worst case: one at a time. A window starts at 20 changes, grows by 1 per merge, halves per failure (TCP-like). Each project queue has its own window.
- Wins: when most changes pass. Loses: when tests are flaky or failure rates are high; a failure discards the work of all later changes.
- Must hold: failure rate low; enough executors; changes in one queue declared as related.
- Failure: a failure deep in the queue is ambiguous (the change or one ahead). Cross-queue dependencies cannot enqueue together.
- Ref: Zuul project docs (OpenInfra), gating page.
- Known: SUMMARY, https://zuul-ci.org/docs/zuul/latest/gating.html

**5. GitHub merge queue**
- Problem: the same, as a hosted feature.
- How: a pull request is grouped with the latest base and the requests ahead; the group is built on a temporary branch; merge limits (1 to 100) set group size; build concurrency (1 to 100) throttles builds. Merge, rebase or squash.
- Result: no performance numbers on the page.
- Wins: no custom infrastructure. Loses: moving a request to the top forces rebuilds of those in progress. "Merge limits don't combine builds."
- Must hold: CI must listen to the merge_group event or the required check never reports.
- Failure: a failed or conflicting group removes the request and rebuilds the rest; CI timeout also removes it.
- Ref: GitHub Docs, "Managing a merge queue".
- Known: SUMMARY, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue

**6. Uber SubmitQueue (2019)**
- Problem: keep mainline green with thousands of daily commits to a monorepo.
- How: a queue speculates builds on likely outcomes. A probabilistic model scores changes; a greedy best-first search picks which speculative builds to run; a conflict analyzer finds independent changes and builds them in parallel; builds already run are reused.
- Result: abstract says: every commit point passes all build steps; in production over a year; scales to thousands of daily commits. A review says it beat three baselines (speculate on every combination, one sequential queue, optimistic speculation); the speedup figures were NOT obtained. Uber blog claims 100% green mainline (company claim).
- Wins: many commits, mixed conflict structure. Loses: when most changes touch the same targets (conflict analysis finds no independence) or when the failure model predicts badly.
- Must hold: a build graph that tells which changes touch which targets; history to train the model; deterministic builds.
- Failure (from the 2025 follow-up): premature build aborts waste resources; small changes wait behind large conflicting ones.
- Ref: Ananthanarayanan et al., "Keeping Master Green at Scale", EuroSys 2019, doi 10.1145/3302424.3303970.
- Known: SUMMARY of abstract and a review via search; paper PDF (lethain.com mirror) too large to fetch. URLs below.

**7. Uber SubmitQueue enhancements (2025)**
- Problem: SubmitQueue wasted resources and delayed small changes.
- How: a model separates short from long builds; an ML model predicts build time; a speculation threshold runs only the most likely builds.
- Result: CI resource use down about 53%, CPU use down 44%, P95 wait down 37%, across Go, iOS and Android monorepos.
- Ref: Juloori et al., "CI at Scale: Lean, Green, and Fast", ICSE 2025, arXiv:2501.03440.
- Known: SUMMARY of the abstract, https://arxiv.org/abs/2501.03440

**8. Batching and bisection / culprit finding**
- Problem: running the full tests per change costs too much.
- How: test several changes together; if the batch fails, split (bisect) or rank commits by risk to find the culprit.
- Results: Ericsson, constant batch sizes cut execution/resource use by 42% (one source) or 47% (another); I did not confirm which (Najafi, Shang, Rigby, FSE 2019). Parallel batch testing (Concordia, 2023, Ericsson data and 276 million Chrome test outcomes): constant batch of 4 needs up to 72% fewer machines at the same average feedback time; dynamic batching up to 91% fewer; test-case batching up to 81% fewer. Google TAP: "batches changes and splits failing batches".
- Wins: low failure rate per change. Loses: high failure rate (batches fail, retests pile up); the paper notes parallelism and feedback time interact non-linearly.
- Must hold: failure rate low; failures reproducible (not flaky); a way to rerun parts of a batch.
- Failure: flaky failures send bisection down the wrong branch. TestTopK (Ericsson) tests the riskiest commits singly and batches the rest, with risk models to rank the culprit. FONTE ranks the real bug-inducing commit in the top five for 87% of studied batch failures (SUMMARY).
- Ref: Najafi, Shang, Rigby, FSE 2019 (Ericsson; exact title not confirmed, file name Armin_FSE_2019). Beheshtian, Rigby et al., ICSE 2022 journal-first; arXiv:2308.13129.
- Known: SUMMARY via search; https://arxiv.org/abs/2308.13129 (fetched), https://ece.uwaterloo.ca/~wshang/pubs/Armin_FSE_2019.pdf (not read)

## C. Partitioning and test selection

**9. Partition by build graph (Bazel/TAP style)**
- Problem: running every test for every change.
- How: a build system knows which tests depend on which files; only tests that transitively depend on changed files run; independent targets build and test in parallel and are cached.
- Result: Facebook says build-dependency selection alone could still exercise as many as a quarter of all tests per mobile change. Other numbers not recalled.
- Wins: well-modularised code with a precise dependency graph. Loses: one low-level library change triggers nearly everything.
- Must hold: hermetic builds, declared dependencies.
- Ref: Google TAP (Memon et al. 2017); Bazel docs (TEXTBOOK).
- Known: SUMMARY (Facebook blog); TEXTBOOK for Bazel.

**10. Google TAP study (2017)**
- Problem: cannot test every change; delayed feedback.
- How: models links among code, tests, developers, languages and change frequency; a milestone strategy tests snapshots periodically.
- Result: "very few of our tests ever fail"; failing tests sit closer to the code they test; code recently modified by more than three developers breaks more often. Cost-reduction figures NOT obtained.
- Ref: Memon et al., "Taming Google-Scale Continuous Testing", ICSE-SEIP 2017, pp.233-242.
- Known: SUMMARY of abstract, https://research.google/pubs/taming-google-scale-continuous-testing/

**11. Regression test selection plus prioritisation in CI (Google, 2014)**
- Problem: cost of CI testing.
- How: choose test suites by module before submit, then order by prior failures.
- Result: reported cost-effectiveness gains; numbers NOT obtained ("figure not recalled").
- Ref: Elbaum, Rothermel, Penix, FSE 2014, pp.235-245.
- Known: SUMMARY via search, https://research.google/pubs/techniques-for-improving-regression-testing-in-continuous-integration-development-environments/

**12. Facebook Predictive Test Selection (2018/2019)**
- Problem: running every dependent test.
- How: a gradient-boosted tree predicts per test the chance of failing on this change, from change and test history; run the likeliest tests; retry failed runs while collecting training data to separate flakes.
- Result: runs about a third of the tests that depend on the change; catches over 99.9% of faulty changes and over 95% of individual failures; roughly halves infrastructure cost for testing. The blog says "roughly doubles" efficiency.
- Wins: large, long history; many tests. Loses: new tests, new code with no history; a miss is only caught at the full run before deploy.
- Must hold: stored history of outcomes; retries to label flakes.
- Failure: the 99.9% is for regressions reaching trunk, not production.
- Ref: Machalica, Samylkin, Porth, Chandra, ICSE-SEIP 2019, arXiv:1810.05286.
- Known: SUMMARY, https://engineering.fb.com/developer-tools/predictive-test-selection/ and https://export.arxiv.org/abs/1810.05286

**13. Ekstazi (file-level dynamic RTS)**
- Problem: rerun only tests affected by a change, safely.
- How: record the files each test used when it ran; rerun a test only if one of them changed.
- Result: 615 revisions of 32 open-source projects; end-to-end testing time cut 32% on average and 54% for longer-running suites.
- Wins: long suites, Java. Loses: short suites (tool overhead); changes to widely shared files.
- Must hold: deterministic tests whose file use can be traced.
- Ref: Gligoric, Eloussi, Marinov, ISSTA 2015 (ACM SIGSOFT Distinguished Paper).
- Known: SUMMARY, search results citing the dissertation (https://users.ece.utexas.edu/~gligoric/papers/Gligoric15PhD.pdf, not opened).

## D. Parallelism, isolation, flaky tests

**14. Hermetic tests and parallel runs**
- Problem: tests that share state cannot run side by side.
- How: each test gets its own environment; Google Assistant's hermetic presubmit tests cut runtime 14x "with virtually no flakiness" (SUMMARY, SWE at Google ch.23).
- Must hold: no shared ports, files or databases between tests.
- Known: SUMMARY, https://abseil.io/resources/swe-book/html/ch23.html

**15. Flaky tests, cost and handling**
- Problem: a test passing and failing on the same code blocks gates and corrupts bisection and selection.
- Results: Google: about 1.5% of all test runs report a flaky result; almost 16% of 4.2 million tests have some flakiness (as cited by academic papers). Mitigation at Google: rerun only for tests marked flaky or on request; a failing-reliably test is "far better" than a flaky one. Reruns up to 3 are common (commenters, not Google). Luo et al., FSE 2014, analysed 201 fixes: leading causes async wait, concurrency, test order (shares of 45%, 20%, 12% recalled; TEXTBOOK, check).
- Ref: Micco, "Flaky Tests at Google and How We Mitigate Them", Google Testing Blog, May 2016; Memon et al. dataset note.
- Known: SUMMARY via search for 1.5% and 16%; the blog page itself returned only comments. URL https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html

## E. How often merges conflict, and what predicts it

**16. Merge conflict frequency and predictors**
- Leßenich et al., ASE 2017: 155 projects, 32,579 merge scenarios. Seven developer-suggested indicators (commits per branch, commit density, files changed by both, change size, chunks, scattering, changes above class declarations): none predicts conflict frequency. Share of scenarios with conflicts not stated on the page.
- Accioly et al. 2018: 5,647 merge scenarios, 45 Java projects; measured precision and recall of conflict predictors (same method edited, dependent methods). Figures not obtained.
- Dias et al. 2019: 267,657 scenarios from 744 repositories; conflicts are rare, so prediction faces class imbalance.
- Vale, Costa, Apel 2023: 66 projects; top contributors at project level and occasional contributors at scenario level cause more conflicts; combined technical and social features reached accuracy 0.92 and recall 1.00 (SUMMARY, one study).
- Ref: Leßenich, Siegmund, Sattler, Schmid, Apel, ASE 2017; Accioly et al., Empirical Software Engineering 2018; Dias et al. 2019; Vale et al. (IEEE TSE or similar, year approximate).
- Known: SUMMARY, https://www.se.cs.uni-saarland.de/papers/conflict-prediction

**17. Conflicts after a clean textual merge (build and test conflicts)**
- Crystal: speculative clones in the background merge and then build and test; across nine open-source systems with 3.4 million lines, conflicts are "frequent, persistent" and show as build and test failures as well as text overlaps. Rates NOT obtained.
- Shen, Gulzar et al., TOSEM 2023: 208 repositories; 15,886 scenarios with textual conflicts, 79 with build conflicts, 33 with test conflicts (denominator unclear). Higher-order conflicts were mostly fixed by similar edits at several places.
- Ref: Brun, Holmes, Ernst, Notkin, ESEC/FSE 2011 and TSE 2013; Shen, Gulzar, He, Meng, TOSEM 2023.
- Known: SUMMARY, https://cs.ubc.ca/~rtholmes/papers/fse_2011_brun.pdf (not opened), https://vtechworks.lib.vt.edu/handle/10919/112057

## F. Ownership, modules, Conway's law

**18. Socio-technical congruence**
- Problem: work that depends on other work needs coordination; mismatch gives delay and defects.
- Result: Cataldo and Herbsleb (IEEE TSE 2013): when coordination needs are matched by coordination actions, productivity improves; breakdowns cut productivity and raise failures. Figures NOT obtained. A 2021 longitudinal study (arXiv:2105.08198) argues Conway's law has limited practical bite.
- Ref: Conway, "How do committees invent?", Datamation 1968 (TEXTBOOK); Cataldo, Herbsleb 2013.
- Known: SUMMARY via search; https://arxiv.org/pdf/2105.08198 (listed, not opened)

**19. Code ownership**
- Bird et al., FSE 2011 (Windows Vista and 7): ownership measures relate to failures; replicated in 4 Microsoft products (Greiler, Herzig, Czerwonka); Foucault et al. on open source Java doubt the effect generalises. Correlations not obtained.
- Known: SUMMARY via search, https://www.microsoft.com/en-us/research/?p=161465

**20. Modularity and design structure**
- MacCormack, Rusnak, Baldwin, Management Science 2006, compared Linux and Mozilla coupling (TEXTBOOK; figures not recalled). Parnas 1972, "criteria for decomposing systems into modules" (TEXTBOOK). I found no fetched study that measures write-conflict rates against module boundaries directly.

## G. Very large single repositories

**21. Google monorepo (Piper)**
- Potvin and Levenberg, CACM 2016: about two billion lines, tens of thousands of commits a day (TEXTBOOK, figures not verified; the CACM page returned 403). Single trunk, owners files, presubmit, large-scale automated changes.
- Known: TEXTBOOK; fetch of https://cacm.acm.org/research/why-google-stores-billions-of-lines-of-code-in-a-single-repository/ failed (403).

**22. Microsoft Windows (GVFS, Scalar) and Meta (Sapling, EdenFS)**
- Windows repo: 3.5 million files, chose to adapt Git rather than split (Microsoft DevOps blog 2017). VFS for Git is in maintenance mode; Scalar replaces it (README). Meta built Sapling and a virtual filesystem to scale its monorepo. No throughput or conflict numbers from primary pages.
- Known: SUMMARY via search, https://devblogs.microsoft.com/devops/optimizing-git-beyond-gvfs and https://engineering.fb.com/2022/11/15/open-source/sapling-source-control-scalable/ (listed, not fetched).

## URLs tried
Worked (summary): trunkbaseddevelopment.com; zuul-ci.org gating; docs.github.com merge queue; bors.tech essay (wrong page content); abseil.io ch23; engineering.fb.com predictive test selection; research.google TAP page; arxiv.org/abs/2501.03440; arxiv.org/abs/2308.13129; se.cs.uni-saarland.de conflict-prediction.
Failed: lethain.com Uber 2019 PDF (over 10 MB); web.eecs.umich.edu TAP PDF (unreadable); arxiv.org/pdf/2501.03440v2 (unreadable); i.cs.hku.hk review PDF (unreadable); uber.com research blog (404); cacm.acm.org Google monorepo (403); testing.googleblog.com flaky post (comments only).
Search only (not fetched): Ekstazi, Najafi FSE 2019, Bird 2011, Cataldo 2013, Crystal, Shen 2023, Sapling, GVFS, Elbaum 2014.
