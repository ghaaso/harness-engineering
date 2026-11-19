# Intake sample check, lane c1 (2026-11-19)

Checked: the 30 records fixed in `intake-state.md`, section "Samples", line `- c1:` (9 in `c1.jsonl`, 21 in x30-x34 and x43). Rule: each record's claim, figures and conditions were compared with the place its `evidence` cites (collect file line, and where it quotes a paper text under `R:papers/`, that text line; for fact records the code, log or design file). Marks: stands / stands in part / does not stand / cannot be checked. Read only; no file changed except this one. `R:` = `docs/program/evidence/round3-2026-11-18/`.

General note: for c1-0309, c1-0314, c1-0319, c1-0324, c1-0329 and c1-0334 the cited collect-file line is the section header ("### P2. ..."); the quoted figures sit in the lines just below it and in the paper text lines cited. The claims hold, but the line cited is the header, not the quote.

| id | mark | reason |
|---|---|---|
| c1-0304 | stands | sztrik-book txt 564-588: N machines, r operators (r<N), exponential, one operator per machine, served in order of breakdown; txt 619-707 steady-state probabilities, average down time (6), mean waiting time (7). |
| c1-0309 | stands | usl-fits txt 113-124 (half a dozen points; Nc may lie outside attainable system), 593-599 and 622-624 (partitioned cache, per-thread stats, Nc 22 to 48). |
| c1-0314 | stands | najafi2019 txt 35-43 (72 %, 42 %), 126-132 and 532-554 (A 46 % at batch 4, 2.4 times, C 72 % at batch 9, max 50/47/74 %), 421-422 (2.8 %), 614-621 (C to batch 4 and 41 %). |
| c1-0319 | stands | pgdocs txt 426-427: more transactions per flush if load high enough; delay only if at least commit_siblings others active; default zero (no delay). |
| c1-0324 | stands | uber txt 229-231 (5 %, 40 %), 1143-1167 (2.98x, 4x P95, 1.2x with 500 workers at 500 an hour, single queue 80x), 1426-1432 (52 %, green since), 1129 (9 months). "Self-reported" present. The 2.98x and 1.2x are for SubmitQueue's speculation model. |
| c1-0329 | stands in part | ekstazi txt 25-32 (615 revisions, 32 %, 54 %) and 522-534 (9 % to 138 %, slowdowns only on short suites, useful over a minute) agree; but the 9-138 % range is across all projects (the AE C variant), not "on short suites" alone. |
| c1-0334 | stands | tcsched txt 612-621 (840 suites, 1 to 800 s, 30 % resource use, machine eligibility), 636-638 (random 30 to 60 % worse than greedy). |
| c1-0104 | stands | lane.mjs:23 MAX_HOLD_MS 20 min, :33 timeout capped 1500, :55-57 stale if pid dead or hold older than 20 min (no heartbeat in the file), :85-90 taskkill at timeout; log lines 1411-1412 show the 1500 s timeout kill. |
| c1-0109 | stands | DECISION-RULE.md:74 case B formula and "a textbook queueing bound, reasoned"; BUILD-IN.md:91-92, 113 (check width = the lane's 2 slots), 306 (a check per merge, 596 s per suite run). |
| x30-0307 | stands | sztrik-fsqs txt 561-571: N* = (b + 1/lambda)/b, saturation number by [42] (Kleinrock vol. II); slides dated 2001; note on secondary text present. |
| x31-0307 | stands | aldridge txt 1031-1037: sqrt(nk) pools of size sqrt(n/k), at most 2 sqrt(nk) tests (symbols lost in the scan, restored; note says so). |
| x31-0315 | stands in part | aldridge txt 1385-1388 says it, but "most widely used" is among group-testing methods in practice; the paper adds at 1396 that group testing "was not used particularly extensively" for Covid-19. |
| x31-0323 | stands | gc2606 txt 120-122: ski lands at 1.34x the offline optimum against the fixed timer's 1.44x, open loop with rate shifts; 2026 company preprint (self-reported present). |
| x31-0331 | stands | sobel txt 80-82 has the sentence (Bell System Technical Journal; manuscript Nov 1958, vol. 38, 1959). |
| x31-0339 | stands | gawlick txt 586-591: critical resources held to the millisecond range, extremely high concurrency; no measured figure given. |
| x32-0307 | stands | najafi2019 txt 614-621: flake rate 1.37 times (Project B vs C), batch 4 saves 14 % vs 41 %; C from batch 9 (72 %) to 4 (41 %). |
| x32-0315 | stands | beheshtian2021 txt 758-762 (the file holding the Fallahzadeh 2023 text; the pbatch copy agrees): constant batches plateau with relatively high feedback time, TestAll outperforms when machines significantly exceed the baseline. |
| x32-0323 | stands | github-mq txt 221: jumping to the top causes a full rebuild of all in-progress pull requests. |
| x32-0331 | stands | google-ct-2017 txt 59 (milestone typically cut every 45 minutes during peak), 336-338 (latest affecting CL). "Self-reported" present. |
| x32-0339 | stands | rust-rollups/rollups.txt:41 has both quoted group-size recipes and "Massive rollups are rarely needed". |
| x33-0307 | stands | pts txt 92-94: classifier trained on flaky test results gives very poor predictions. |
| x33-0315 | stands | luo txt 36-41: Google reruns a failing test 10 times against the same code version, flaky if any passes. |
| x33-0323 | stands | google-ct-2017 txt 175 and 179-180 (1.23 %, 99:1), 408-412 (1.23 % left after filtering flaky targets). "Self-reported" present. |
| x34-0307 | stands | usl-fits txt 111 (fixed user-threads), 758 (closed queueing system), 361 (pairwise), 128 (coherency); the txt lines the collect file lacked are found. |
| x34-0315 | stands | collect line 69 says it; suleman-acs txt 262-282 shows the request buffer (CSRB) and CSCALL marking; "one serial section every thread must pass" is the collect file's reading, not a quoted sentence. |
| x34-0323 | stands | dbr-bokor txt 22-32: significant reduction in simulation budget against full factorial enumeration; no figure. |
| x34-0331 | stands | suleman-fdt2008 txt 38-42: SAT reduces execution time and power by up to 66 % and 78 %; baseline is threads = number of cores (txt 126). The same paper's introduction (txt 98) says 66 % and 81 %. |
| x43-0307 | stands | prod/shopmq.txt:106: "Over 90% of pull requests to Shopify's core application are using Shipit with the merge queue". "Self-reported" present. |
| x43-0315 | stands | prod/chromcq.txt:158: roughly ~20,000 unique flaky tests; without retries pretty much no CL would pass. "Self-reported" present. |
| x43-0323 | stands | prod/moztree.txt:163-164 (shared integration branch, continuously tested), 186-187 (sheriffs close the tree while they back out the offending patch); policy, no numbers. |

## Counts by mark

stands 28, stands in part 2, does not stand 0, cannot be checked 0 (total 30).

## Ids that do not stand

None. In part: c1-0329 (9-138 % range is across all projects, not short suites alone); x31-0315 ("most widely used" is among group-testing methods, and the paper also says group testing was not used extensively for Covid-19).

## (a) Refuted claims of `c1-refute.md`

- C44, that BMW's merge gate keeps the full suite: appears as a result record? No. Only c1-0201 (kind status, records it as refuted and not to be proposed again) and c1-0403 (hypothesis, consistent with the refutation).
- C64, that a session's rerun nondeterminism shrinks the best batch toward 2 to 4: appears as a result record? No. Only c1-0201 (status).

Search of c1.jsonl, x30-x34 and x43 by BMW, Bazel, pre-submit, "rerun is not the same run", nondeterminism, "2 to 4", "reproduc": no result record carries either claim. x33-0316 to x33-0318 (BMW, Schwendner) state other figures (pipelines still 34 and 56 minutes after affected-target selection); none says the gate keeps the full suite.

## (b) "self-reported" check, every result and fact record of c1, x30-x34, x43

Company-account records that carry the word include c1-0324, c1-0328, x31-0323, x32-0331, x33-0323, x43-0307, x43-0315. Records lacking it where the source is a company's or project's own account:
- x32-0337 (Rust forge: "~3hr current CI duration", a figure from the project's own page; its sibling c1-0328 has the word).
- c1-0331, x33-0303, x33-0304 (Elbaum 2014: Google's own data, 3.5 million suite runs; a peer-reviewed paper by Google authors, so borderline).
- x33-0307 (Machalica 2019, Facebook's own paper; qualitative claim, no figure).
- x33-0315 (Luo 2014, Google's practice as the paper states it; a procedure, the note says not measured).
- x43-0321, x43-0322, x43-0323 (Kubernetes Tide guide and Mozilla docs: policy statements with no figures, so nothing to qualify).

Ids that need the word: x32-0337, c1-0331, x33-0303, x33-0304, x33-0307.
