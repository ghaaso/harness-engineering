# Integrating many writers into one mainline: established practice and results

First pass 2026-11-18 by web search and WebFetch summaries. Second pass 2026-11-18: the PDFs of 10 papers were downloaded with curl and turned into text with pdftotext -raw, then read with grep and sed.
Full text read: Uber 2019, Uber 2025, Memon 2017 (TAP), Elbaum 2014, Facebook PTS 2019, Ekstazi 2015, Brun 2011 (abstract numbers only) and 2013 (Crystal), Kasi 2013 (Cassandra), Bird 2011, Mauerer 2021. Not obtained: Ghiotto 2018/2020, Cataldo 2013, Potvin 2016, the Google flaky-test blog.
QUOTED = the sentence is in the paper text; the tag (UBER19 l.229) is a line number of that paper's paper.txt (raw mode) in the scratchpad. SUMMARY = a search or fetch summary. TEXTBOOK = my own recall, not fetched.
Limits: no mapping to our case. No project term went into any search (rule 4). Format per entry: name | problem | how | result | wins/loses | must hold | failures | reference | how known + URL.

## Corrections against the first pass
- Row 6, Uber 2019: first pass had no evaluation figures and said "100% green mainline (company claim)". The paper says "Since its launch, our mainlines have remained green at all times", before that green "only 52% of the time". The speedups are against an Oracle, not against baselines alone: SubmitQueue is up to 2.98x slower at P50, not faster than it.
- Row 7, Uber 2025: 53%, 44%, 37% are the abstract's headline. The per-monorepo data differ: CPU cut 44.70% (Go), 34.86% (iOS), 52.23% (Android); wait 44.67%, 33.32%, 31.66%. 44% is the Go figure.
- Row 9, Facebook: "a quarter of all tests per mobile change" is not in the PTS paper. It says "almost 99.9% of test targets selected by build-dependency-based selection strategy pass". A quarter appears there only as the share of changes sampled for learning runs (l.602).
- Row 12: confirmed ("fewer than a third", "over 99.9%", "factor of two"). Added: "three months" of training, recall set by calibration, 99.9% is recall of faulty changes at land time.
- Row 10, TAP: first pass had no figures; now 63K of 5.5 million tests ever failed, 1.23% of histories show a real breakage, "more than 3 developers" is really "3 (or more) ... compared to 2".
- Row 13, Ekstazi: 32% and 54% confirmed word for word; added that Ekstazi is slower than running everything for short suites (up to 138% of the time).
- Row 17, build and test conflicts: first pass had no rates. Crystal: 16% textual, 1% build, 6% test over 5,355 merges. Kasi: merge conflicts 7.6 to 19.3% in four projects, test failures after clean builds 5.6 to 35%. The Crystal paper counts "33 percent of the 399 clean textual merges" but 266 of 399 is 67%, so the 399 are all conflicts; the two papers read it differently (Kasi repeats the "clean merges" wording).
- Row 19, Bird: first pass had no correlations. Minor contributors correlate 0.86 with failures in Vista, almost as the total number of developers (0.84); the top owner's share correlates -0.49.
- Row 18: the first pass named only the 2021 study's doubt; it is now read: no relation in 25 open-source projects.

## Added rows (important results the first pass lacked)
- Ekstazi, TAP, Facebook, Elbaum and Uber are all replays of recorded histories or before and after comparisons, not controlled trials of the same changes under two systems; only Ekstazi runs the tools itself on 615 revisions.
- Uber 2019, "Single-Queue" (one change at a time, the plain serial gate): at 500 changes per hour "P50, P95, P99 turnaround times grow 80x, 129x and 132x respectively compared to the turnaround times of the Oracle" (UBER19 l.1166-1167) and "95% slowdown" in throughput (l.1391). This is the measured cost of the serial queue in row 3.
- Uber 2019, speculation: "Speculate-all" (build every combination) is worse than the "Optimistic" approach: P50 "up to 15x", P99 "up to 24x" of the Oracle (l.1158-1161); "speculating deep instead of going wide helps" (l.1161-1163).
- TAP 2017, batching: "it is not cost effective to test each code commit individually" and a commit "every second on the average" (TAP17 l.43-46). Per-author risk differs a lot: 14% to 31% of commits by single humans caused breakages (l.755-777).
- Elbaum 2014: skipping tests in pre-submit and moving them to post-submit adds "less than 0.17%" to the pre-submit load at a 0.5% suite failure rate (ELB14 l.805-811), at the cost of later feedback.
- Brun 2013, persistence: conflicts last "3.2 days" on average; "for 19 percent of the commits" an earlier merge would have conflicted (BRU13 l.459-461, 1796).

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
- Result (QUOTED, full text read, UBER19 = line numbers of paper.txt made with `pdftotext -raw`): "Observe that with even two concurrent and potentially conflicting changes, there is a 5% chance of a real conflict. This number grows to 40% with only 16 concurrent and potentially conflicting changes." (UBER19 l.229-231). "even changes with one to ten hour staleness have between 10% to 20% chance of making the mainline red." (l.243-244). "Over a span of one week, the mainline was green only 52% of the time" before SubmitQueue (iOS, l.1427-1428); "Since its launch, our mainlines have remained green at all times." (l.1431-1432).
- Evaluation setup (QUOTED): iOS monorepo changes from the first 9 months of 2018 replayed at "100, 200, 300, 400 and 500 changes per hour" (l.1130-1132), against an Oracle that "can perfectly predict the outcome of a change" (l.1099-1100). Turnaround: "leads to maximum of 2.98x slower 50-percentile turnaround time, compared to the optimal Oracle" (l.1146-1148); P95 "increases by 4x under high contention" (l.1149); with 500 workers at 500 changes per hour all three percentiles are "reduced to 1.2x of the Oracle's" (l.1155-1156). Speculate-all: P50 "up to 15x", P99 "up to 24x" (l.1158-1159). Single-Queue at 500 per hour: "80x, 129x and 132x" for P50, P95, P99 (l.1166-1167). Throughput: SubmitQueue "up to 60% slowdown compared to Oracle, the slowdown reduces to around 20% with 500 workers" (l.1314-1315); Single-Queue "95% slowdown" (l.1391).
- Conflict analyzer (QUOTED): "The turnaround time of Oracle improves by up to 60% with the conflict analyzer." (l.1409); for the Optimistic approach "only 20%" because "the build graph on the iOS monorepo is very deep" (l.1414-1418). "only 7.9% of changes actually cause a change to the build graph for the iOS monorepo over a span of five months" (l.848). The failure model: "an accuracy of 97%" on a 30% hold-out (l.1041). Survey of 40 engineers: "93% of survey takers believed that enforcing an always green mainline positively impacts their personal productivity" (l.1455).
- Caveat (mine): all evaluation is a replay of one iOS monorepo, one company, build graph deep; the 5% and 40% are the paper's model figures for the chance of a real conflict, not a count of events.
- Wins: many commits, mixed conflict structure. Loses: when most changes touch the same targets (conflict analysis finds no independence) or when the failure model predicts badly.
- Must hold: a build graph that tells which changes touch which targets; history to train the model; deterministic builds.
- Failure (from the 2025 follow-up): premature build aborts waste resources; small changes wait behind large conflicting ones.
- Ref: Ananthanarayanan et al., "Keeping Master Green at Scale", EuroSys 2019, doi 10.1145/3302424.3303970.
- Known: SUMMARY of abstract and a review via search; paper PDF (lethain.com mirror) too large to fetch. URLs below.

**7. Uber SubmitQueue enhancements (2025)**
- Problem: SubmitQueue wasted resources and delayed small changes.
- How: a model separates short from long builds; an ML model predicts build time; a speculation threshold runs only the most likely builds.
- Result (QUOTED, full text read, UBER25 = paper.txt lines): "CI resource usage dropped by 53%, weekly CPU hours by 44%, and p95 waiting times by 37%." (UBER25 l.144-145). The paper gives this only as the headline; per monorepo it gives (l.1010-1033, 1078-1082): builds per change down "45.45% (from a pre-rollout average of 3.39 to a post-rollout average of 1.85)" for Go, iOS "47.86% (from 4.93 to 2.57)", Android "64.02%, dropping from 5.43 to 1.96"; weekly CPU hours Go "44.70% (from a pre-rollout average of 1,485 to a post-rollout average of 821 hours)", iOS "34.86%", Android "52.23% (from 729 to 348 hours)"; p95 wait Go "44.67% (from a pre-rollout average of 33.69 minutes to a post-rollout average of 18.64 minutes)", iOS "33.32%", Android "31.66%". So 44% is the Go CPU figure and 37% is a headline mean; the three monorepos differ (CPU 35 to 52%, wait 32 to 45%).
- The problem it measured (QUOTED): "A significant number of builds are prematurely aborted, with an estimated 40-65% of builds being affected across major monorepos at Uber" (l.91-94). The bypass of small changes triggered at rates "ranging from 0% to 45%" of waiting changes (l.356). Build-time model error (MAPE) "3% for the Go monorepo, 6% for the iOS monorepo, and 3.5% for the Android" (l.948-949). Before/after comparison on live traffic, not a controlled test.
- Ref: Juloori et al., "CI at Scale: Lean, Green, and Fast", ICSE 2025, arXiv:2501.03440.
- Known: QUOTED from the full PDF https://arxiv.org/pdf/2501.03440

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
- Result (QUOTED, PTS19 l.370-372): "almost 99.9% of test targets selected by build-dependency-based selection strategy pass". The "quarter of all tests" in the first pass is NOT in the paper (see Corrections); the paper's figure is that predictive selection picks "fewer than a third" of the build-dependency set.
- Wins: well-modularised code with a precise dependency graph. Loses: one low-level library change triggers nearly everything.
- Must hold: hermetic builds, declared dependencies.
- Ref: Google TAP (Memon et al. 2017); Bazel docs (TEXTBOOK).
- Known: SUMMARY (Facebook blog); TEXTBOOK for Bazel.

**10. Google TAP study (2017)**
- Problem: cannot test every change; delayed feedback.
- How: models links among code, tests, developers, languages and change frequency; a milestone strategy tests snapshots periodically.
- Result (QUOTED, full text read, TAP17 = paper.txt lines, raw mode): scale: "In an average day, TAP integrates and tests ... more than 13K code projects, requiring 800K builds and 150 Million test runs." and "a code commit every second on the average" (TAP17 l.39-44). Share that ever fail: "of the 5.5 Million affected tests that we analyzed for a time period, only 63K ever failed." (l.75-77). By history (Table II, l.440-446): 5,562,881 targets; 5,082,803 (91.3%) "Never FAILED; PASSED at least once"; 115,160 passed and failed at least once, of which "Flakes 46,694 of 115,160", leaving 68,466; "only 2.07% PASSED and FAILED at least once", and "After filtering flaky test targets from these, we were left with 1.23% that actually found a test breakage" (l.408-412). "more than 99% of all tests run by the CI system pass or flake" (l.206-207). Per average change "Less than 0.5% FAILED" (l.389).
- What predicts a failure (QUOTED): "files within a short time span modified by 3 (or more) developers are significantly more likely to cause breakages compared to 2 developers." (l.193-195); "a single file changed many times by different people is almost 100% likely to cause a failure" (l.229); files modified 42 times: "77% of the files modified 42 times were in edge CLs" (l.671); file types: ".hpp files ... 80% of .hpp files appeared in edge CLs" (l.722-723); by author, one user "made a total of 182 commits of which 59 (31.4%) caused breakages", one release tool "made 42 commits of which 39 caused breakages" (l.755-758). Distance: only test targets within MinDist 10 or 6 "executed only 61% and 50% of test targets", saving "42% and 55% resources", and "we did not miss a single breakage or fix" (l.641-648); that is a replay on one month (Feb 11 to Mar 11 2016, "over 500K CLs", "over 4 Billion test outcomes", l.349-352), not a live deployment.
- Ref: Memon et al., "Taming Google-Scale Continuous Testing", ICSE-SEIP 2017, pp.233-242.
- Known: QUOTED from the full PDF (university course copy) https://huang.isis.vanderbilt.edu/cs8395-f23/paper/google-testing-icse-seip-17.pdf

**11. Regression test selection plus prioritisation in CI (Google, 2014)**
- Problem: cost of CI testing.
- How: choose test suites by module before submit, then order by prior failures.
- Result (QUOTED, full text read, ELB14 = paper.txt lines, raw mode): data is "a sample of over 3.5 million test suite executions, gathered over a period of 30 days" (ELB14 l.327-328), a replay, "only a small sample" of Google. Pre-submit selection by failure window Wf: "The gains, as measured by the detection of failing test suites, reach between 70% and 80% when Wf = 96. The other 20% to 30% of failing test suites were not selected for execution" (l.774-777). "Random test suite selection with the same number of test suites selected for execution performed approximately six times worse in terms of failure detection." (l.777-779). Load moved to post-submit: "Assuming that test suite execution failures rates are 0.5% (as in our dataset), selecting 33% of the test suites (the maximum in our simulation ...) implies that the test executions added to post-submit testing form less than 0.17% of the pre-submit testing load" (l.805-811). Prioritisation helped in all window sizes; high-priority requests were "ranging from 5% to 8%" (l.933). The cost-effectiveness claim is only qualitative in the abstract.
- Ref: Elbaum, Rothermel, Penix, FSE 2014, pp.235-245.
- Known: QUOTED from the full PDF https://cs.uwaterloo.ca/~m2nagapp/courses/CS846/1171/papers/elbaum_fse14.pdf

**12. Facebook Predictive Test Selection (2018/2019)**
- Problem: running every dependent test.
- How: a gradient-boosted tree predicts per test the chance of failing on this change, from change and test history; run the likeliest tests; retry failed runs while collecting training data to separate flakes.
- Result (QUOTED, full text read, PTS19 = paper.txt lines, raw mode): "Using predictive test selection, we can catch over 95% of individual test failures and over 99.9% of faulty code changes." (PTS19 l.128-130). "The test selection procedure selects fewer than a third of the tests that would be selected on the basis of build dependencies" (l.134-136). "we reduce the total infrastructure cost of change-based testing by a factor of two." (l.137-138). Training: "test outcomes recorded for changes submitted over past three months" (l.532-533). Calibration: "TestRecall(s) > 0.95 and ChangeRecall(s) > 0.999 at land-time stage of testing" (l.778-779); "Based on our experience ... in production for several months" (l.781-783). "Faulty" means any selected test fails, so the 99.9% is recall of faulty changes, not of faults reaching users; a miss is caught later at the stabilisation stage (l.270-273).
- Flakiness handling (QUOTED, l.121-124): training "on flaky test results, we get very poor predictions."; failed runs are retried and flaky ones separated before training (section V, l.629-680).
- Wins: large, long history; many tests. Loses: new tests, new code with no history; a miss is only caught at the full run before deploy.
- Must hold: stored history of outcomes; retries to label flakes.
- Failure: the 99.9% is for regressions reaching trunk, not production.
- Ref: Machalica, Samylkin, Porth, Chandra, ICSE-SEIP 2019, arXiv:1810.05286.
- Known: SUMMARY, https://engineering.fb.com/developer-tools/predictive-test-selection/ and https://export.arxiv.org/abs/1810.05286

**13. Ekstazi (file-level dynamic RTS)**
- Problem: rerun only tests affected by a change, safely.
- How: record the files each test used when it ran; rerun a test only if one of them changed.
- Result (QUOTED, full text read, EKS15 = paper.txt lines, raw mode): "evaluated it on 615 revisions of 32 open-source projects (totaling almost 5M LOC)" and "Ekstazi reduced the end-to-end testing time 32% on average, and 54% for longer-running test suites, compared to executing all tests." (EKS15 l.21-26). With the collection phase run off-line, "47% on average, 66% for longer-running test suites" (l.160-161). Selection ratio "varies between 5% and 38% of RetestAll, the time for AEC varies between 9% and 138 % (slowdown)" and "all slowdowns are for projects with short-running test suites" (l.827-832); on average the time is 68% of RetestAll (AEC), 46% for long suites (l.831-834); "for Cucumber, Ekstazi selects on average 12% of test entities, but the time that Ekstazi takes is 99% of RetestAll" (l.821-823). Useful "for projects whose test suites take over a minute" (l.835-836).
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
- Measured, read in full text (QUOTED): in one month of Google's TAP data, of 115,160 test targets that both passed and failed at least once, "Flakes 46,694 of 115,160" (TAP17 l.441-445), i.e. 40.5% by my division; "more than 99% of all tests run by the CI system pass or flake" (TAP17 l.206-207). Elbaum 2014 treats flakiness as a threat: failed suites are re-run to "deflake" (ELB14 l.1109-1120). Facebook: training on flaky outcomes gives "very poor predictions" (PTS19 l.124). The shares below (1.5% of runs, 16% of tests) are still SUMMARY: the blog was not readable.
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
- Crystal, TSE 2013 (QUOTED, full text read, BRU13 = paper.txt lines, raw mode): "conflicts are frequent, persistent, and appear not only as overlapping textual edits but also as subsequent build and test failures" over "nine open-source systems totaling 3.4 million lines of code" (BRU13 l.6-7). "Of all the merges, one in six, or 16 percent, had textual conflicts as determined by Git's built-in merging mechanism" and "The other 83 percent of the merges had no textual conflicts" (l.421-430). Over 5,355 merges in Git, Perl5 and Voldemort (the only three with a runnable test suite): "76 percent of merges completed cleanly, 16 percent of merges resulted in a textual conflict ..., 1 percent of merges resulted in a build failure ..., and 6 percent of merges resulted in a test failure" (l.504-515). "The 266 textual conflicts reported by the version control system only represent 67 percent of all conflicts. That is, 33 percent of the 399 clean textual merges led to build or test conflicts." (l.519-522). Persistence: conflicts "persist, on average, for 3.2 days" (l.1796; the contributions list says 3 days, l.60). 19 percent of potential earlier merges would have conflicted (l.459). Note: 266 of 399 is 67 percent, so the 399 are all conflicts and about 133 are higher order; the paper's wording "clean textual merges" and the 1+6 percent do not agree with that count (my arithmetic, see Corrections). Subjects are open-source projects, mostly single-team DVCS use, not a mainline queue.
- Cassandra paper, ICSE 2013 (QUOTED, KAS13 = paper.txt lines): in four projects (Perl, Storm, Jenkins, Voldemort; 88 to 505 merges each) "merge conflicts ranged from 7.6% to 19.3%. Of the clean merges 2.1% to 14.7% had build failures, and 5.6% to 35% of correct builds incurred test failures." (KAS13 l.49-52; Table I l.344-347: Perl 14 of 185 merges conflicted, 4 build failures, 56 test failures (30.2%); Voldemort 55 of 380 (14.5%), 133 test failures (35%)). The text twice gives merge conflicts as "4.2%" or "7.6%" as the low end (l.50 and l.262) while Table I's lowest is 7.6%: the paper disagrees with itself. "Resolving these conflicts took substantial effort, typically spanning multiple days" (l.52-53). Cassandra's scheduler (task ordering by predicted conflict) avoided "a majority of conflicts" in its simulations (l.22), e.g. "16/17 ... 33/35" avoided in one table (l.862): simulation on past data, not a deployment.
- Shen, Gulzar et al., TOSEM 2023: 208 repositories; 15,886 scenarios with textual conflicts, 79 with build conflicts, 33 with test conflicts (denominator unclear). Higher-order conflicts were mostly fixed by similar edits at several places.
- Ref: Brun, Holmes, Ernst, Notkin, ESEC/FSE 2011 and TSE 2013; Shen, Gulzar, He, Meng, TOSEM 2023.
- Known: SUMMARY, https://cs.ubc.ca/~rtholmes/papers/fse_2011_brun.pdf (not opened), https://vtechworks.lib.vt.edu/handle/10919/112057

## F. Ownership, modules, Conway's law

**18. Socio-technical congruence**
- Problem: work that depends on other work needs coordination; mismatch gives delay and defects.
- Result, Cataldo and Herbsleb (IEEE TSE 2013): SUMMARY only (a search summary of the abstract: "gaps between coordination requirements and the actual coordination activities carried out by the developers significantly increased software failures"; two projects at two companies). The PDF at par.nsf.gov downloaded twice but is damaged (pdftotext: "Missing 'endstream'", 2.9 and 5.0 MB). EFFECT SIZE NOT OBTAINED.
- Counter-evidence (QUOTED, full text read, STC21 = paper.txt lines, raw mode; Mauerer, Joblin, Tamburri, Paradis, Kazman, Apel, arXiv:2105.08198): "The major result of our study, based on an analysis of 25 large open-source projects, is that STMC is not related to project quality measures--software bugs and churn--in any temporal scenario." (STC21 l.12-14); "we find no statistical relationship between the alignment of developer tasks and developer communications on the one hand, and project outcomes on the other hand." (l.15-16). They write that they find congruence "of less importance than previously believed" and reconcile this with Cataldo by saying the difference lies in the statistical focus (l.2411-2416). Open source, not industry.
- Ref: Conway, "How do committees invent?", Datamation 1968 (TEXTBOOK); Cataldo, Herbsleb 2013.
- Known: SUMMARY via search; https://arxiv.org/pdf/2105.08198 (listed, not opened)

**19. Code ownership**
- Bird et al., FSE 2011 (Windows Vista and Windows 7) (QUOTED, full text read, BIR11 = paper.txt lines, raw mode). Definition: a "minor contributor" is a developer whose share of commits to a component is "below 5%" (BIR11 l.289-291). Table 1, Spearman correlation with failures (Vista pre, Vista post, Win7 pre, Win7 post, l.398-401): Minor 0.86, 0.70, 0.93, 0.25; Total developers 0.84, 0.70, 0.92, 0.24; Ownership (top owner's share) -0.49, -0.49, -0.29, -0.02 (the last not significant); Size 0.75, 0.69, 0.70, 0.26. Table 2 (variance in failures explained, l.501-505): code metrics alone 26%, 29%, 24%, 18%; adding Minor raises them to 46%, 41%, 70%, 21%; adding Total gives 40%, 35%, 68%, 21%; with Minor, Major and Ownership "The final models account for up to 72% of variance in failures." (l.596). "Ownership was found to have a negative relationship with failures to a statistically significant degree and Major had a positive relationship, but was much smaller than Minor." (l.589-594). So the effect is observational, between components, and the count of minor contributors is almost the same variable as the count of all contributors (0.86 vs 0.84); the paper does not give an effect per extra writer.
- Replication and doubt are NOT read here: Greiler, Herzig, Czerwonka (4 Microsoft products) and Foucault et al. (open source) stay SUMMARY, https://www.microsoft.com/en-us/research/?p=161465

**20. Modularity and design structure**
- MacCormack, Rusnak, Baldwin, Management Science 2006, compared Linux and Mozilla coupling (TEXTBOOK; figures not recalled). Parnas 1972, "criteria for decomposing systems into modules" (TEXTBOOK). I found no fetched study that measures write-conflict rates against module boundaries directly.

## G. Very large single repositories

**21. Google monorepo (Piper)**
- Potvin and Levenberg, CACM 2016: paper NOT read (ACM and the course copy refuse; every address returned an HTML page). From search summaries only (SUMMARY): about 2 billion lines, about 35 million commits in 18 years, "16,000 changes" a workday by people plus "24,000" by automated systems. Single trunk, owners files, presubmit, large-scale automated changes (TEXTBOOK). How concurrent writers are handled: NOT obtained.
- Another Google paper does give a rate (QUOTED, TAP17 l.42-44, see row 10): "a code commit every second on the average" and "it is not cost effective to test each code commit individually"; Google's own 2017 account that TAP batches commits.
- Known: TEXTBOOK; fetch of https://cacm.acm.org/research/why-google-stores-billions-of-lines-of-code-in-a-single-repository/ failed (403).

**22. Microsoft Windows (GVFS, Scalar) and Meta (Sapling, EdenFS)**
- Windows repo: 3.5 million files, chose to adapt Git rather than split (Microsoft DevOps blog 2017). VFS for Git is in maintenance mode; Scalar replaces it (README). Meta built Sapling and a virtual filesystem to scale its monorepo. No throughput or conflict numbers from primary pages.
- Known: SUMMARY via search, https://devblogs.microsoft.com/devops/optimizing-git-beyond-gvfs and https://engineering.fb.com/2022/11/15/open-source/sapling-source-control-scalable/ (listed, not fetched).


## URLs tried
Read in full text (PDF, second pass): https://lethain.com/static/blog/2019/eurosys19uber.pdf (11 MB); https://arxiv.org/pdf/2501.03440; https://huang.isis.vanderbilt.edu/cs8395-f23/paper/google-testing-icse-seip-17.pdf; https://cs.uwaterloo.ca/~m2nagapp/courses/CS846/1171/papers/elbaum_fse14.pdf; https://arxiv.org/pdf/1810.05286; https://users.ece.utexas.edu/~gligoric/papers/GligoricETAL15Ekstazi.pdf; https://homes.cs.washington.edu/~mernst/pubs/vc-conflicts-fse2011.pdf and vc-conflicts-tse2013.pdf; https://web.engr.oregonstate.edu/~sarmaa/wp-content/uploads/2020/08/2486788.2486884.pdf; https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/bird2011dtm.pdf; https://arxiv.org/pdf/2105.08198.pdf (needed the .pdf suffix; the bare id and v2 failed).
Worked (summary, first pass): trunkbaseddevelopment.com; zuul-ci.org gating; docs.github.com merge queue; bors.tech essay (wrong page content); abseil.io ch23; engineering.fb.com predictive test selection; research.google TAP page; arxiv.org/abs/2501.03440; arxiv.org/abs/2308.13129; se.cs.uni-saarland.de conflict-prediction.
Failed, second pass: typeset.io Ekstazi (HTML page, not a PDF); par.nsf.gov/servlets/purl/10038372 Cataldo (PDF damaged on two downloads, "Missing 'endstream'"); edisciplinas.usp.br, dl.acm.org/doi/pdf/10.1145/2854146, research.google/pubs/archive/45424.pdf and static.googleusercontent.com .../45424.pdf for Potvin (all HTML); microsoft.com .../bird2011dtmc.pdf and Dont-Touch-My-Code.pdf (wrong names; bird2011dtm.pdf worked); researchgate and vtechworks for Ghiotto and Shen (HTML); leomurta.github.io ghiotto2020.pdf (HTML).
Failed, first pass: uber.com research blog (404); cacm.acm.org Google monorepo (403); testing.googleblog.com flaky post (comments only).
Search only (not fetched): Najafi FSE 2019, Shen 2023, Sapling, GVFS, Greiler replication, Ghiotto, Leßenich, Accioly, Dias, Vale.
