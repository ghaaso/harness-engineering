Counts: STANDS 24, MOVED 1, ALTERED 0, NOT FOUND 0, NO QUOTE 0 (26 quotations in A1 to A16). Extra checks: self-reported label present on every claim carrying a company figure (A2, A4, A5, A6, A7, A8, A9, A11, A12); "supported"/"confirmed" not used anywhere in the addendum; A7 table declared "not a quote". Collect-file line numbers (24..74) all match the claims. Paper texts are in papers/check/prod/.

| claim | quotation (first 60 characters) | cited place | verdict | true line or text when not STANDS |
|---|---|---|---|---|
| A1 | dynamically forms groups of pull requests that are candidates | collect l.24; gh.txt l.173 | STANDS | |
| A2 | Trains could also grow large, containing the changes of 15 p | collect l.25; gh.txt l.158 | STANDS | |
| A3 | Those causing conflicts or build failures should not impact a | collect l.26; gh.txt l.164 | STANDS | |
| A4 | shipping 30,000+ pull requests with their associated 4.5 mil | collect l.27; gh.txt l.172 | STANDS | |
| A4 | Every month, over 500 engineers merge 2,500 pull requests in | collect l.27; gh.txt l.176 | STANDS | |
| A5 | Shopify changes 40 times a day ... merge around 400 commits | collect l.37; shop1000.txt l.93 | STANDS | |
| A5 | Larger batches result in higher theoretical throughput, but | collect l.37; shop1000.txt l.139 | STANDS | |
| A6 | At any given time, we run CI on 3 batches worth of pull requ | collect l.37; shop1000.txt l.140 | STANDS | |
| A7 | legitimate failures will propagate to all later CI runs, but | collect l.38; shop1000.txt l.122 | STANDS | |
| A7 | (table values, declared "not a quote" in the section) | collect l.38; shop1000.txt l.126-135 | STANDS | values 6.25, 1.5, 0.39, 0.097 % at tolerance 1 to 4 = 2 to 5 failures in a row; tolerance 3, removal on the 4th failure (l.135); declaration present |
| A8 | upwards of 50 pull requests ... could take hours to merge an | collect l.39; shop1000.txt l.105 | STANDS | |
| A9 | at most a single auto build is being executed | collect l.50; rustci.txt l.109 | STANDS | source has `auto` in backticks (markup only) |
| A9 | testing a single PR at a time, combined with our long CI (~2 | collect l.48; rustci.txt l.309-312 | MOVED | true place rustci.txt l.307-310 (claim says "approximate to within two"; it is off by two); words and numbers equal |
| A10 | a PR where we merge several pending trivial PRs so they can | collect l.48; rustci.txt l.325-330 | STANDS | l.326-329 |
| A11 | The CQ has roughly ~20,000 unique flaky tests, without retri | collect l.58; chromcq.txt l.158 | STANDS | |
| A11 | adding retries increases the probability that a flaky test w | collect l.58; chromcq.txt l.157 | STANDS | |
| A12 | Median cycle time needs to be under 40 minutes for trybots. | collect l.58; chromcq.txt l.140 | STANDS | |
| A12 | catch enough failures to be worth adding / probably not wort | collect l.58; chromcq.txt l.141 | STANDS | |
| A13 | optimizes for quick turn-around time while still catching mo | collect l.59; chromcq.txt l.46 | STANDS | |
| A13 | regardless of cycle time | collect l.59; chromcq.txt l.46 | STANDS | |
| A14 | Automatically runs batch tests and merges multiple PRs toget | collect l.67; tide-index.txt l.23 | STANDS | |
| A14 | Tide prioritizes batches over individual PRs ... will wait f | collect l.67; tidemaint.txt l.19 | STANDS | |
| A15 | Don't let humans (or other bots) merge especially if tests h | collect l.67; tidemaint.txt l.10 | STANDS | |
| A15 | Any merge to a pool kicks all other PRs in the pool back int | collect l.67; tidemaint.txt l.18 | STANDS | |
| A16 | that is continuously tested | collect l.74; moztree.txt l.163-164 | STANDS | spans l.163-164; rest of A16 is stated as the collector's words (collect l.74) |
