# Results: what was measured, what came back null, what is not measured

Every row is one repository on one PC (Windows 11, 12 cores, 31 GB, RTX 5070 12 GB) in October and November 2026,
mostly one trial, unless the row says more. Tokens are counted as input + cache creation + cache read + output, once
per message id, so cache reads dominate. Read a record with `bash library/lookup.sh -f <id>` on `bilal/build`; "testbed" rows come from
`docs/program/HARNESS-BOTTLENECKS-2026-11.md` (the line is given), a different project measured before the split.

## 1. Speed-ups, largest first

| what changed | before | after | gain | limits | record |
|---|---|---|---|---|---|
| Tree's test suite: 25 files at 8 at once, the longest file split in 4 shards | 596 s | 120.4 s | about 5 times | one set of runs; all passing | r57-0159, r57-0103 |
| Testbed start-up cost found by tracing (16-test run) | 43 s | 11.5 s | 3.7 times | testbed | HARNESS-BOTTLENECKS l.67 |
| One self-test file (31 tests) split in 4 shards | 221 s | 67-70 s | about 3.2 times | one file | r57-0159 |
| Testbed parallel check, 6 workers, one database each | 855.2 s | mean 283.8 s | 3.0 times | 12 runs; testbed | HARNESS-BOTTLENECKS l.64 |
| Tree's suite, 8 files at once instead of 1 | 596 s | 264 s | about 2.3 times | one run; 965 pass both ways | hc1-0100 |
| Two card jobs side by side (U6 jobs) | 1 job | 2 jobs | 1.67 times the throughput; 3 jobs 1.8-1.9 | 12 GB card; the large jobs cannot share it | `research-tree/build/improve/ESTIMATE-2026-11-24-side-by-side.md` |
| Two testbed container checks at once | about 440 s in a row | 266 s and 267 s | about 1.65 times (440 / 267) | measured, not used | HARNESS-BOTTLENECKS l.66 |
| Testbed check in a Linux container, 12 workers | 367.2 s | 230.1 s | 1.6 times | optional, not the gate | HARNESS-BOTTLENECKS l.65 |
| Two tree suites at once, one per queue slot | 1 at a time | 334 s each | 1.58 times the throughput, each 27 % slower | one run; processor peak 97.6 % | hc1-0101 |
| 4 test files at once through the queue | alone | 1.06-1.15 times each | 3.67 of 4 | one test failed at 4 and passed alone twice; above 4 not measured | r57-0159 |

## 2. Helpers side by side and what they cost

| what | figure | limits | record |
|---|---|---|---|
| Five Sonnet readers started together | 767,000 tokens, 4 minutes, under one point of the week | one trial | r57-0115 |
| Three lean Sonnet readers, each filling one fixed table | 0.60, 0.80, 0.90 M; 4-6 min; about 45 K a message | one trial | r58-0102 |
| Sonnet builder of one script / Opus builder of one hook | 0.20 M / 3.73 M | one job | r58-0104 |
| Research helpers, median: collect / read / run (Sonnet); extract (Haiku); analyse / refute (Opus) | 3.2 / 1.8 / 1.4 / 0.83 / 8.1 / 8.7 M | research jobs, not building | hc1-0110 |
| Build: Opus builder unit with its helpers, median (n = 16) | 32.3 M against 11.7 M planned | one build | r57-0173 |
| Build: blind Opus refuter, median (n = 16) | 10.6 M against 5.4 M planned | one build | r57-0173 |
| Fixed load of a fresh helper before any work | 56-60 K tokens | this repository, one week | hc1-0104 |
| Build of 13 fixes, 7 builders at once in the first batch | 6.5 h; helpers ran 1.8 at a time on average | one build | r57-0167 |
| The whole build against its plan | 907.7 M against 397 M priced (2.3 times) | one build | r57-0170 |
| The app's limit on helpers at once | 20 (26 of 26 refusals at 20 running) | one session's log | t8-0109 |

## 3. The meter and the coordinator's window

| what | figure | limits | record |
|---|---|---|---|
| Weekly meter per fresh token, against Opus | Sonnet 0.15-0.5, Haiku 0.15-0.8, Fable 2.7-5.6; a cached re-read about 1 % | 132 readings, one week | r57-0175 |
| Tokens per meter point in the build (96 % Opus) | about 62 M (59-66 M) | whole-percent readings | r57-0170 |
| Measured hand-over point of a build root | 247-273 K (design said 129 K) | one build | r57-0171 |
| Cost of one call of a build root | about 0.24 M | three roots | r57-0173 |
| Share of the build's tokens held by its roots | 154.1 M of 907.7 M (17 %) | one build | r57-0170 |
| Cache lapses over all 4,438 transcripts on this PC | 151.5 M of 927.4 M fresh tokens (16.3 %) | not weighted by model | t7-0111 |
| Helper cache lapses after waits of 5-10 min | 296 lapses, 46.2 M tokens; 76 % after a shell call | replay transcripts | t9-0102 |
| Done claims contradicted by a later check | 7 of 20 build units (35 %); 79 of 94 clinic reviews (84 %) | counted | t7-0100 |
| Helper DONE reports with no passing check after the last edit | 84 of 183 (46 %) | found by script | t7-0102 |

## 4. Tested and null, in the form tried

One form each, mostly on one repository. No family is ruled out by these.

- **Graph store of code facts** against scripted search: three engines identical (0.000); a stored community prior
  +0.015 [-0.010, +0.042], under the 0.05 bar. A typed store did beat scripted search on held-out recall, +0.076
  [+0.036, +0.118], but only +0.024 [-0.023, +0.075] outside the mobile app. No agent was run with it
  (`docs/program/GRAPH-TEST-RESULT-2026-11.md`).
- **Embeddings**: four knowledge-graph embedding models and one graph-neural encoder fused with a simple ranker; largest
  gain +0.0032 against a +0.02 bar; a gain of about +0.006 cannot be ruled out
  (`docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md`).
- **The card run** (which files change together): the simple baseline D4 was not beaten in the forms tried; a graph
  transformer in a pair-aware form is the proposed next test
  (`research-tree/build/improve/GRAPH-TRANSFORMER-ANSWER-2026-11-25.md` section 0).
- **Done-gates replayed on past work**: a "done only after a passing check" rule would have caught about 1 of 92
  contradictions (t7-0101); a lint and type gate flagged 0 of 10 located defects, one Python project (t7-0105); a
  reviewer shown two versions of a report flagged 2 of 17 overstated claims against 4 of 17, p 0.50, clinic only
  (t7-0108). The next form to try is a reviewer with the code in hand (t7-0401).
- **A shared library of earlier helper results**: 0 conclusions worked out again in 57 judged pairs (t7-0125).
- **Dropping stale reads from the window** (costed, not run): a net loss on the meter in every project (t7-0122).
- **Context machinery in the testbed**: a snapshot-before-compaction adapter used +6.1 % tokens over a plain notes
  file for the same recall (HARNESS-BOTTLENECKS l.25, 97-98).
- **Ten lanes at once in October** (product line of work): died within 15 minutes; two at a time finished
  (HARNESS-BOTTLENECKS l.86).

## 5. Not measured

- **Any gain on tokens, time or quality from the hooks** (tier routes, window ceiling, fan-out gate, count gate,
  creep gate, record guard, owner guard). Their self-tests and live refusals are recorded (r57-0120, t8-0107,
  t8-0110, r58-0104); no before-and-after run of the work they guard exists.
- **Anything on a machine other than this PC**, or a second person's setup. The queue's 4 slots were set on this PC.
- **Effort levels**: what each costs and whether a lower one gives the same output. Only Opus high and xhigh ever ran;
  the levels per tier are designed only (r57-0207, r57-0421). "Overthinking" is in no record.
- **A smaller model against a larger one on the same job**: no record compares them (r57-0201, r57-0208).
- **Whether the lean helper types, a leaner prefix or a keep-alive save tokens**: only ceilings exist (t7-0400 at most
  15.6 %, t7-0114 at most 7.9-8.1 %); nothing was switched and re-measured.
- **The helper-wait fix** (shell calls under 240 s): written, never piloted (t9-0102, t7-0501).
- **More than 4 test runs at once**, and a check's own memory peak.
- **A real run of the research tree**: nothing has run for real (r57-0172).
- **An agent using a graph or typed store** during real work.
- **The best number of helpers at once** for ordinary work: the decision rule is a hypothesis (r57-0414).
- **How cache reads count against the five-hour limit**, and the sizes of the five-hour and weekly windows (a1-0327).
