# c1 collect production: merge queues that large projects run, from their own accounts

All figures below are **self-reported** (a company's or project's own write-up; uncontrolled, no baseline run by a third party).
`R:` = `docs/program/evidence/round3-2026-11-18/`. Texts saved in `R:papers/check/prod/` (HTML stripped with `strip.js`; line numbers are of the `.txt`).
Library: searched `merge queue`, `SubmitQueue`, `speculat`, `bors`. Nothing from these six sources was in the library as a quote (x06-0333 Zuul and x06-0334 GitHub docs are summaries with no numbers).

## Gate summary
- P1 GitHub (self-reported): trains of up to 15 PRs "derailed"; waits of "8+ hours"; after merge queue, avg wait to ship down 33 %, 2,500 PRs/month, 500 engineers (gh.txt l.158, 176).
- P2 Shopify v2 (self-reported): batch size 8, CI on 3 batches at once; flaky-failure tolerance 3 (25 % flake rate -> 0.39 % false removal); about 400 commits/day (shop1000.txt l.93, 139, 140, 122-135).
- P3 Rust bors (self-reported): one full check at a time, ~2 h, "around ~10" PRs/day max; hand-made rollups for trivial PRs (rustci.txt l.285-328).
- P4 Chromium CQ (self-reported): builder median cycle under 40 min, p90 about an hour; ~20,000 unique flaky tests, retries are what lets any change pass (chromcq.txt l.140, 157-158).
- P5 Kubernetes Tide (docs, no numbers): batch tests first, every merge to a pool sends all other PRs back to retest (tidemaint.txt l.18-19).
- P6 Mozilla autoland (docs, no numbers): shared continuously tested branch; tree closed while sheriffs back out (moztree.txt l.163-164).

## From the library
- r57-0306 (result, quoted): Uber iOS main 52 % green before its merge queue (the paper, not read again here).
- x06-0333 (summary): Zuul window starts 20, +1 per merge, halves per failure; no throughput. x06-0334 (summary): GitHub docs, limits 1 to 100, no numbers. Both "no numbers" are confirmed by the missing figures in P1, P5.
- x06-0400 (reasoned): a Bors-style serial gate caps throughput at one full check per merge unless batched. P3 now gives the project's own figure for this.

## Papers (company and project accounts)

### P1. GitHub engineering, "How GitHub uses merge queue to ship hundreds of changes every day", GitHub Blog (undated in the page text; page lists 7 minutes read). Read from: https://github.blog/engineering/engineering-principles/how-github-uses-merge-queue-to-ship-hundreds-of-changes-every-day/ . Saved: R:papers/check/prod/gh.txt. Read: all body text (l.144-179).
- Problem: a hand-run "train" (one PR grouping several, tested and deployed together) in one monorepo derailed often; by 2016 nearly 1,000 PRs/month merged into it.
- Mechanism: queue "dynamically forms groups of pull requests that are candidates for deployment, kicks off builds and tests", removes conflicting PRs and re-forms groups (l.173).
- What broke (self-reported): "Trains could also grow large, containing the changes of 15 pull requests. Large trains frequently derailed due to a deployment issue, conflicts, or the need for an engineer to remove their change. On painful occasions, developers could wait 8+ hours after joining a train for it to ship, only for it to be removed due to a conflict" (l.158).
- Principle stated: "Those causing conflicts or build failures should not impact all other pull requests waiting to merge. The throughput of the overall system should be favored over fairness to an individual pull request." (l.164).
- Measured (self-reported): "shipping 30,000+ pull requests with their associated 4.5 million CI runs" before general availability (l.172), i.e. about 150 CI runs per PR (my division of the two quoted figures; their CI runs are across all checks, not one serial check). "Every month, over 500 engineers merge 2,500 pull requests into our large monorepo with merge queue, more than double the volume from a few years ago. The average wait time to ship a change has also been reduced by 33%." (l.176). No absolute wait time, no batch size, no failure rate given.
- Rollout cost: moving the monorepo took until 2023 from a mid-2021 start; at most about an hour of blocked deploys allowed (l.167-170).
- Assumes: nothing stated; no failure rate or group size is given, so the gain cannot be tied to a ratio.
- With model sessions (reasoned): the qualitative lesson (one bad change must not hold up the others; remove the culprit and re-form the group) holds; the number does not transfer.
- Needs to know: nothing from the page; its absence of numbers is the finding.
- Status: quoted (body read in full).

### P2. Shopify engineering, "Successfully Merging the Work of 1000+ Developers" (Merge Queue v2), and "Introducing the Merge Queue" (v1). Read from: https://shopify.engineering/successfully-merging-work-1000-developers ; https://shopify.engineering/introducing-the-merge-queue . Saved: R:papers/check/prod/shop1000.txt, shopmq.txt. Read: all body text.
- Problem: unrelated merges break master, slow deploys let master drift from production, a backlog of 50+ PRs after an incident takes hours (shop1000 l.93, 105).
- Mechanism: v2 starts CI for each PR as soon as it is queued; PRs are split into batches (a batch = most PRs allowed in one deploy); CI runs on a bounded number of batches ahead.
- Quotes (self-reported): "Shopify changes 40 times a day ... merge around 400 commits to master daily" (shop1000 l.93). "Larger batches result in higher theoretical throughput, but higher risk. In practice, the increased risk of larger batches impedes throughput by causing failures that are harder to isolate, and results in an increased number of rollbacks. In our application, we went with a batch size of 8" (l.139). "At any given time, we run CI on 3 batches worth of pull requests in the queue." (l.140). Over 90 % of PRs to the core app use the queue (shopmq l.106).
- Flaky tests: only remove a PR after successive failures exceed a tolerance; "legitimate failures will propagate to all later CI runs, but flaky tests will not block later CI runs" (l.122). Their table for an assumed 25 % flake rate: 6.25 %, 1.5 %, 0.39 %, 0.097 % false removal after 2, 3, 4, 5 failures in a row (l.126-134; the table's header line labels are lost in the strip, values read in order); tolerance 3 chosen, so removal on the 4th consecutive failure (l.135).
- Measured gain: none given as before/after numbers. A v1 queue of "upwards of 50 pull requests ... could take hours to merge and deploy" (l.105) is the only before figure; no v2 figure for that case.
- Assumes: a failed PR's failure shows up in every later CI run (the queue tests PRs on top of those ahead of them); flake rate known (25 % is an example, not their measured rate).
- With model sessions (reasoned): the 8 and the 3 batches were tuned to a deploy, not to a check; the "same failure repeats in all later runs" test is a cheap way to tell a real failure from noise and is the part that transfers. A model session's rerun is not the same run, so a flaky-style repeat test can be fooled by a change in what the worker does between runs.
- Needs to know: flake rate of the suite; the largest batch the downstream step accepts.
- Status: quoted.

### P3. Rust project, rustc-dev-guide "Continuous Integration" (section "Merging PRs serially with bors", "Rollups") and Rust Forge "Bors". Read from: https://raw.githubusercontent.com/rust-lang/rustc-dev-guide/master/src/tests/ci.md ; https://forge.rust-lang.org/infra/docs/bors.html . Saved: R:papers/check/prod/rustci.txt, rustforge.txt. Read: all of the relevant sections (l.11-14, 61-110, 285-328 of rustci.txt); rustforge is 20 lines, read.
- Problem: a test after the merge on the latest main must be done before merge, and one change at a time.
- Mechanism: bors tests one merge commit at a time on top of main; green means main is fast-forwarded; rollups combine several trivial PRs in one merge commit by hand.
- Quotes (self-reported): "tested one at the time" (l.292); "testing a single PR at a time, combined with our long CI (~2 hours for a full run), means we can't merge a lot of PRs in a single day, and a single failure greatly impacts our throughput. The maximum number of PRs we can merge in a day is around ~10." (l.309-312, line numbers approximate to within two). "it can take several hours until all the `auto` CI jobs finish" (l.99). Rollups: "a PR where we merge several pending trivial PRs so they can be tested together ... created manually by a team member ... uses their judgment to decide if a PR is risky or not." (l.325-330).
- Reading against a serial server: 2 h service time gives at most 12 a day around the clock; they state about 10, consistent with failures and idle time (my arithmetic, reasoned). No failure rate and no rollup size or gain given.
- Assumes: the full suite is not shortened for any PR except by a human choosing a rollup; "at most a single auto build is being executed" (l.109).
- With model sessions (reasoned): this is the one-slot case; the stated throughput is simply slots / service time. A human picking which changes are safe to group is the stand-in for a failure predictor; for sessions that predictor would need a record of past failures.
- Needs to know: which changes are "trivial" (a risk judgment per change).
- Status: quoted.

### P4. Chromium project, "Chromium Commit Queue" docs. Read from: https://chromium.googlesource.com/chromium/src/+/main/docs/infra/cq.md . Saved: R:papers/check/prod/chromcq.txt. Read: all (162 lines).
- Problem: keep tip of tree green with many changes and a huge flaky suite.
- Mechanism: no batching described; each change runs a curated set of try builders; passing builds from a dry run can be reused at submit; failed shards are retried with the same configuration, then failing suites are rerun without the change to see if tip of tree is already broken (l.42-55, 116-121).
- Quotes (self-reported): "Median cycle time needs to be under 40 minutes for trybots. 90th percentile should be around an hour (preferably shorter)." (l.140; a requirement for a builder to join, not a measurement). "The CQ has roughly ~20,000 unique flaky tests, without retries, pretty much no CL would ever pass the CQ." (l.158). "adding retries increases the probability that a flaky test will land on tip of tree sublinearly, but mitigates the impact of the flaky test on unrelated CLs exponentially" (l.157). A builder must "catch enough failures to be worth adding"; one that fails once every couple of weeks is "probably not worth adding" (l.141). Reuse window: a passing build stays reusable up to 24 hours, or within a commit-distance window such as 800 commits (l.54-55).
- Also: a smaller curated test set for the normal run, "optimizes for quick turn-around time while still catching most but not all regressions", and a Mega CQ with far more tests "regardless of cycle time" for risky changes (l.46).
- Measured gain: none given.
- Assumes: parallel builders per change, not one serial check; reuse is safe while the base has not moved far.
- With model sessions (reasoned): three transferable parts: a short curated check with a long one for risky changes; reuse of a passing result while the base is near; bounded retry. A check of seconds does not need any of them; an hour does.
- Needs to know: which builders catch real failures (their rule is failure yield per builder).
- Status: quoted.

### P5. Kubernetes (Prow) "Tide" docs and Maintainer's Guide. Read from: https://raw.githubusercontent.com/kubernetes-sigs/prow/main/site/content/en/docs/components/core/tide/_index.md , .../maintainers.md , and the config page. Saved: R:papers/check/prod/tide-index.txt, tidemaint.txt, tidecfg.txt. Read: all of the two pages; the config page has no batch figures (grep).
- Quotes: "Automatically runs batch tests and merges multiple PRs together whenever possible." (tide-index l.23). Pools are per org/repo:branch (l.30). "Don't let humans (or other bots) merge especially if tests have a long duration. Every merge invalidates currently running tests for that pool." (tidemaint l.10). "Any merge to a pool kicks all other PRs in the pool back into `Queued for retest`." (l.18). "Tide prioritizes batches over individual PRs ... will wait for the batch to complete and will merge the individual PR only if the batch fails." (l.19). Tide replaced the older submit queue in 2017 (tide-index l.39).
- Measured gain, batch size, failure rate: not stated anywhere in these pages. "Not found" for numbers; I looked for the project's own account of batch gains and did not open any.
- Assumes: each merge changes the base, so every other running test is stale; the mechanism is the same as the speculative-gating costs in x06-0402.
- With model sessions (reasoned): the stale-on-every-merge rule is the cost of testing against the latest base; with a check of an hour and 16 workers it would restart most runs after each merge.
- Status: quoted for the statements; no numbers exist in the sources.

### P6. Mozilla, "Tree Closures and What They Mean for Developers" (autoland). Read from: https://firefox-source-docs.mozilla.org/testing/automated-testing/tree-closure.html . Saved: R:papers/check/prod/moztree.txt. Read: l.157-233.
- Mechanism: patches land on a shared integration branch "that is continuously tested"; the branch is closed to new pushes while sheriffs back out a failing change (l.163-164, 184-188). Not a queue that tests before landing; checks run after.
- No numbers (closure rate, backout rate, batch size). A search turned up only an older team page quoting "99 %" of regressions backed out and 1,228 regressions in the first half of 2019; I did not open it, so I do not cite it.
- Status: quoted (policy only).

## Not found / only a vendor page
- Shopify's later move to a vendor queue (Graphite customer page, "hours to minutes", seen only as a search snippet; the page itself returned 404 when fetched): not opened, vendor-published, not cited.
- Kubernetes: a project account with batch figures: not found.
- GitHub: no wait time before the 33 % drop, no batch size.

## Could not open
| Title | Routes tried | Why |
|---|---|---|
| Shopify "Building the merge queue" (guessed URL) | shopify.engineering direct | 404; the right pages were found by search (P2) |
| Graphite Shopify customer page | direct fetch | 404 (search snippet only) |
| Rust blog "GHA migration" | direct fetch | 404 |
| Mozilla autoland landing rate | search | no published figure found |

## Needs the owner's sign-in
None.

## What these accounts give for a check shared by workers (reasoned, from the above)
- The one hard ratio from the project's own account: serial full check of about 2 h gives at most about 10 merges a day (P3); a stated service time divided into the day.
- Batch size is set by the risk of a failure that is hard to isolate: Shopify 8 per batch with CI on 3 batches (P2); GitHub's trains of 15 derailed (P1). Both are self-reported and neither gives a failure rate.
- Flaky tests are the main practical problem: Shopify and Chromium both build a rule around them (P2, P4).
- None of the six gives a controlled before/after for batching on a failure rate.
