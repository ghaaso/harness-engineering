# What limited each past job: our own records (extraction only, no verdict)

Written 2026-11-18. Times are local (UTC+5). Sources are in REPO = harness-engineering.
CPU = whole-PC processor use from `research-tree/lane/recorder.log` (R), one line per 2 s: `free= cpu= procs= node=`.
R exists only for 2026-11-17 03:11 to 07:34 and 12:07 to 21:51. Before that: no record of processor or free memory.
"n>=90" = share of R samples with cpu 90 % or more. R has no per-job processor figure: it is the whole PC.
Abbreviations: LOG = `research-tree/lane/log.jsonl`; PROTO = `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`.

## 1. One row per job or episode

Columns: job | when | at once | processor | memory | queue wait | tokens | limit | evidence | sure.

| # | Job | When | At once | Processor | Memory | Queue wait | Tokens | Limit | Evidence | Sure |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Model ladder, tier 500 MB, first part | 11-17 15:29-15:37, then 15:38-15:43 | up to 16 workers; R node avg 19.4, max 23 | avg 90.9 %, max 100; n>=90 69 % (R 15:29:17-15:37:04) | lowest free 11,262 MB | none in LOG | no record | processor | R; `model/results/ladder.log` lines 1-6; PROTO pt 4 "processor mostly at 85 to 99 % (mean 89 %)" | measured |
| 2 | Same run, after restart | 11-17 15:38-15:43:26 | R node avg 18.0 | avg 88.2 %, max 99; n>=90 52 % | lowest free 14,187 MB | no record | no record | processor, then blocked program start at 15:43:26 | R; PROTO pt 4 ("15:43:26, a fourth interruption") | measured |
| 3 | Ladder tier 500, run 1 (restart) | 11-17 17:19-17:56:57 (37.9 min) | up to 16; R node avg 20.5, max 24 | avg 88.3 %, max 100; n>=90 48 % | lowest free 12,294 MB (17:55:18) | no record | no record | processor | R; `ladder.log` lines "17:19:00 ... 17:56:57" | measured |
| 4 | Ladder tier 1150 MB | 11-17 17:56:59-18:14:53 (17.9 min); 120 parts moved here | "up to 16"; R node avg 10.8, max 12 | avg 48.9 %, max 80; n>=90 0 % | lowest free 11,105 MB | no record | no record | serial queue (few long parts left; the file does not say so) | R; `ladder.log` (moved 120); RUN-LADDER.md tier table | inferred |
| 5 | Ladder tier 2600 MB | 18:14:55-18:31:56 (17.0 min); 28 parts | R node avg 6.5, max 8 | avg 25.7 %, max 47 | lowest free 11,315 MB | no record | no record | serial queue (same reading) | R; `ladder.log` (moved 28) | inferred |
| 6 | Ladder tier 6000 MB (2 parts, plus 4 of A-FENCE-CE) | 18:31:59-18:48:53 (16.9 min) | runner: "4 workers of 6000 MB, big parts alone"; R node avg 4.0, max 6 | avg 13.9 %, max 31 | lowest free 7,306 MB (18:43:37), the lowest in R; each A-FENCE-CE part stopped "with 4796 MB in use" | no record | no record | memory (the check's own cap; 9 parts BOUNDED) and serial queue (big parts alone) | R; `model/results/SUMMARY.md` header and last lines; `run-full.out` rss 5,652-5,680 MB | measured (memory), inferred (queue) |
| 7 | Model run, groups 1-2 at 1,500 MB | 11-17, about 14:55-15:29 (start not recorded; 2,001 s in `run-full.out`) | 3 workers (PROTO pt 11); then single 6000 MB parts | R 14:45-15:10 avg 12.9 %, max 41; 15:10-15:29 avg 14.6 %, max 40 | lowest free 9,367 MB (15:15:53); parts peak 1,139 MB, rss 1,649-1,658 MB, then 4,796 MB / rss 5,680 MB | no record | no record | memory (parts BOUNDED at 1,500 MB, rerun alone) and serial queue | R; `run-full.out` (464-2001 s lines); PROTO pt 11 "about 29 minutes ... group 1 four minutes" | measured; start time inferred |
| 8 | Model run on 22 workers (165,031,945 states) | 11-16, stopped at 12.5 min | 22 workers | no record | no record | no record | no record | no record | PROTO line 924; `model/RUN-FULL.md` "Sources" | unknown |
| 9 | Model checker run before the 01:42 reset | 11-17 about 01:30-01:42 | pool of 11 workers of 670 MB | no record (no recorder) | no record | no record | no record | blocked program starts (app log from 01:26) | PROTO pt 4; `pc-freezes-2026-11-17/VERDICT.md` item 3 | inferred |
| 10 | Many agents queueing for the lane (capacity 1 until 03:50, then 2) | 11-16 22:21Z to 11-17 00:11Z = 03:21-05:11 local | many agents; 785 commands in LOG | R 03:21-04:58 avg 8.3 %, max 33 | R lowest free 17,105 MB | 342 starts before 00:00Z waited 10,201 s in all; one waited 549,921 ms; 443 later starts waited 404 s in all; all 785: 10,596 s, 219 starts over 1 s | no record | serial queue | LOG `waited_ms`; PROTO pt 3 ("capacity.txt holds 2 since 03:50") | measured |
| 11 | Waiter gives up | 11-17 05:27:04 (LOG at 00:27:04Z) | one `busy` event, waited_s 900 | R 05:12-05:30 avg 1.9 %, max 17 | R lowest free 18,393 MB | 900 s | no record | blocked program starts (the held slot ran commands that did not end) and serial queue | LOG line 789; PROTO pt 4 (05:11-05:27); VERDICT.md item 2 | measured; cause inferred |
| 12 | PC idle after the 05:12 block | 11-17 05:30-07:34 | 11 to 14 node | avg 1.4 %, max 7 | lowest free 18,543 MB | no record | no record | blocked program starts; the owner not there (stuck start returned 05:37:31 as "access denied") | R; VERDICT.md item 2 | measured |
| 13 | Interruption 4, ladder in tier 500 | 11-17 15:43:23-15:45:34 | 17 node at 15:43:01 | 95 % at 15:43:01, then 1 to 6 % | free about 19,300 MB; 17,263 at 15:43:01 | no record | no record | blocked program starts | R; PROTO pt 4; VERDICT.md item 2 ("320 to 343") | measured |
| 14 | Interruptions 1 and 2 (hard reset 01:42; stall 02:34) | 11-17 | agent self-test over many cases | no record | no record | no record | no record | blocked program starts (same signature; not attributable) | PROTO pt 4; VERDICT.md "still open" | unknown |
| 15 | Earlier blocks found in the app log | 11-02 15:44, 11-06, 11-13 20:51-22:58 (a `taskkill` start blocked 7,560 s), 11-14 16:10-17:13, 11-15 02:44 | no record | no record | no record | no record | no record | blocked program starts | VERDICT.md item 3 | measured (log), jobs unknown |
| 16 | Research-tree test suite, one run | 11-18 01:23-01:33 | 1 test file at a time; up to 12 processes | PC avg 12.8 %, peak 50.2 %; threads busy 3.1 avg, 12.0 peak (of 24) | tree peak 493.9 MB working set, 332.0 MB private; lowest free 14,811 MB | queue 2 ms | no record | serial queue (by setting `--test-concurrency=1`) | `harness-method-status-2026-11-18/probe-suite-memory.md` figures table | measured |
| 17 | Same suite, 29 files one by one | 11-17 16:15:10-16:31:11 (16 min) | 1 | no record | process of the 360 service 157 to 271 MB private (not the tests) | no record | no record | serial queue (by setting); selftest alone 258 s | `pc-freezes-2026-11-17/suite-profile.txt` | measured (time) |
| 18 | Ordinary day work, other hours | 11-17 12:07-14:59 (except row 7); 18:50-21:51 | R node avg 6.1 (1.8 after 18:50) | avg 8.8 %, max 91 (one sample at 12:24:23); after 18:50 avg 6.4 %, max 46 | lowest free 11,141 MB (14:58:07); 15,312 MB after 18:50 | none in LOG | no record | nothing (idle) | R | measured |
| 19 | Clinic project, check slots (pytest) | 9 Nov and build days | 1 slot; 6 xdist workers | no record of use; 8 workers gain 3 % over 6 (native) | "8 GiB was never free in about 980 samples"; free 2.1-6.2 GiB; two container checks: lowest free 5.3 GB | waits 3 s to 2,030 s (34 min); median 409 s | no record | memory (second slot never opened) and serial queue | `HARNESS-BOTTLENECKS-2026-11.md` lines 22, 46, 61-66; `testing-evidence.md` lines 30-32; `harness-v2-status.md` lines 143-146 | measured |
| 20 | Clinic project, stalled run | build day (date not given) | no record | no record | "free memory under 1 GB" | no record | no record | memory | `harness-v2-status.md` line 146 | measured (second hand) |
| 21 | Clinic project, 6 Nov halt of three days | 11-06 14:58:23 | all sessions | no record | no record | no record | no limit message that day | none of the five (the PC powered off); then the owner not there | `HARNESS-BOTTLENECKS-2026-11.md` lines 20, 42 | measured |
| 22 | Clinic project, October sessions | 6-20 Oct | subagents made 82.4 % of 4,155 calls | no record | no record | no record | about 778M tokens, 94 % cache reads; 14 usage-limit episodes; 91 of 104 limit errors from subagents; one burst of 40 in 78 s; limit about 75 min into a five-hour window | token allowance | `HARNESS-BOTTLENECKS-2026-11.md` line 84 | measured |
| 23 | Clinic project, 1 and 3 Nov | 11-01, 11-03 | no record | no record | no record | no record | limit messages in the root transcript | token allowance | `HARNESS-BOTTLENECKS-2026-11.md` line 20 | measured |
| 24 | Research session, 11-16 about 12 h stall | 11-16 | no record in the repo | no record | no record | no record | no figure | token allowance (weekly) | only the owner's memory index (`MEMORY.md`, "Usage limit and stalls"); no file in the repo | unknown |
| 25 | Window re-reads (every job) | Clinic Nov; FixFlow | main sessions 333k tokens per call | no record | no record | no record | 97 % of tokens are re-reads; output 0.75 %; clinic main sessions 74 %; FixFlow agents 56 % fixed prefix (about 60k) | no figure for the allowance: "How cache reads count against the five-hour limit is unknown" | `TOKEN-BOTTLENECK-2026-11.md` lines 14, 43-44, 64 | measured (shares); effect on limit unknown |

## 2. Highest and lowest load on record

| Resource | Highest | Lowest |
|---|---|---|
| Processor (R, whole PC) | 100 % in rows 1-3 (tier 500, 16 workers); 773 of 1,501 samples in rows 1-3 are at 90 % or more (150+85+538 of 217+163+1121) | 0 % (R, 12:07:46); row 12 avg 1.4 % |
| Memory (R, free) | lowest free 7,306 MB at 18:43:37, tier 6000 (row 6); one part rss 5,680 MB; clinic: under 1 GB in a stalled run (row 20), 5.3 GB with two checks | highest free 18,747 MB (R hour 07) |
| Serial queue | one start waited 549,921 ms; 900 s `busy` give-up; clinic 2,030 s | 0 s on most of the 443 starts after 00:00Z (404 s in all) |
| Tokens | about 778M tokens in two weeks of October, 94 % cache reads; 333k per call in clinic main sessions | no figure |
| Blocked starts | 7,560 s for one `taskkill` start (11-13); 25 to 63 min for stuck starts that ended "access denied" | no record |

## 3. Two limits at once

- Row 6 and row 7: a part stopped on memory while it ran alone, so the other workers' share of the PC was unused (memory and serial queue). The CPU in row 6 was 13.9 % avg.
- Row 11: a blocked program start and a serial queue (a waiter gave up after 900 s while the PC was at 1.9 % CPU and 18,393 MB free).
- Row 19: memory kept the second slot shut, and the single slot made the queue (2,030 s).
- Row 2: processor at 88 % and then a blocked start at 15:43:26 ended the run.
- Rows 4 and 5: the processor fell to 48.9 % and 25.7 % while more workers could have run on memory (free 11,105 and 11,315 MB). The file does not name the cause; it is read from the part counts (120 and 28).

## 4. What was never measured

- Processor share of any one job: R is the whole PC and holds other programs (the probe file says so too).
- The memory peak of a model run as a whole: only per-part peaks (17 to 840 MB per part in SUMMARY.md, 5,680 MB for A-FENCE-CE) and the lowest free memory in R. PROTO says "Not verified: the 8,950 MB reservation of a big part".
- Any processor or memory sample before 11-17 03:11, between 07:34 and 12:07, and from 16:xx (gap 15:45:34 to 17:19:03). The 22-worker run of 11-16 (row 8) has none.
- The first and second interruptions of 11-17 (rows 9, 14): no samples.
- The tokens or usage meter of any model run, lane command or suite run: no record in LOG, R or the SUMMARY files.
- How cache reads count against the five-hour limit: unknown (TOKEN-BOTTLENECK line 64).
- The time a job spent waiting for its own memory admission (the runner logs it "once a minute"; no such count was read in the output files).
- The cause of blocked program starts: not established (VERDICT.md "still open"). The watcher `watch/av-watch.log` has 6,850 lines and no `BLOCK` line at the time I read it; its covered period was not checked.
- Probe suite at `--test-concurrency=4`: not measured (probe-suite-memory.md "Limits").
- The model run's per-tier worker count: the file says "up to 16"; R's node count (24 max) is the only observed figure.
- Disk use and the owner's own presence: no record for any row; "the owner not there" in row 12 and row 21 is from the stuck start and the power-off, not from a presence log.
