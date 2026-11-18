# c1 state (lane "check", research round 3)

Orchestrator: the Opus child session of lane check. Updated after each step. Week cap: stop at 62 %.

| Step | Status | Output | Notes |
|---|---|---|---|
| 0 Briefs and state | done 2026-11-19 | `c1-brief-{collect,analyse,gate,refute,fold,extract}.md` | Week 51 % at start (2026-11-18 evening; again 51 % on 2026-11-19 after the PC restart) |
| 1 Collect (5 Sonnet) | done 2026-11-19 | `c1-collect-{queue,group,mergeq,shorter,bottleneck}.md` | Read in full or in the parts that matter: queue 7 (none whole), group 3, mergeq 8, shorter 8, bottleneck 6. Gaps: N* for c servers and with bulk service not found in any source (the c-slot form is reasoned); Memon 2017 is probably in `papers/check/google-ct-2017` |
| 1b Second attempt (3 Sonnet) | done 2026-11-19: group 4 of 6 opened (Hwang 1972, Deb and Serfozo 1973 closed); queue+bottleneck 4 opened, 5 closed (Reiser-Lavenberg, Adams-Balas-Zawack, Duclos-Spencer, Stecke-Aronson, Kleinrock II); mergeq+shorter: Memon 2017, Beheshtian thesis 2020, Rust rollup pages opened, TSE 2021 and Bavand ICSME 2021 closed. c-server N* still in no source (two reasoned forms differ by c - 1). 445,735 helper tokens | "## Second attempt" appended to the collect files | Top session's rule: an entry "not tried" gets one real attempt before step 2. Brief `c1-brief-collect-retry.md`. One for group, one for queue+bottleneck (with a targeted search for the c-server and bulk-service saturation point), one for mergeq+shorter. Do not hold step 2 for a paper still closed after a real attempt |
| 2 Analyse (Opus) | done 2026-11-19: 66 claims (42 proven, 10 measured here, 14 hypothesis); c-slot N* = c(S+Z)/S computed from Sztrik's exact model, 16 cases; 294,846 helper tokens | `c1-report.md` draft, `c1-claims.md` | |
| 3 Gate (Sonnet) + refute (Opus) | done 2026-11-19: gate 167 STANDS, 11 NO QUOTE (all hypotheses), 0 faults; refute 41 CONFIRMED, 23 PARTIALLY, 2 REFUTED (C44, C64), 0 UNVERIFIABLE; 419,003 helper tokens | `c1-gate.md`, `c1-refute.md` | |
| 4 Fold (Opus) | done 2026-11-19 (successor session): 41 confirmed, 23 hold in part, 2 refuted (C44, C64), 0 cannot be checked; 73 records (35 result, 11 fact, 2 status, 9 hypothesis, 16 open), 0 removed; corrections proposed c1-0500..c1-0514, c1-0515 a separate task (DECISION-RULE.md l.41-44); 300,883 helper tokens | `c1-report.md` final, `library/journal/2026-11-19/c1.jsonl` | C44: gate runs dependency-selected targets, "full suite until a dependency map exists"; shortening now rank 1. C64: dropped from batching fit and its "2 to 4"; flakiness measure re-sourced (Ericsson). Not done: 81 % in x06-0336 unchecked; Lazowska ch. 11 record has no URL; BUILD-IN.md silent on shared base. Top session's rule "Keeping the library clean" passed to the fold mid-run |
| 4b Production collect (Sonnet), added by the top session 2026-11-19 | done: 6 sources opened in full (GitHub, Shopify v1/v2, Rust bors, Chromium CQ, Kubernetes Tide, Mozilla autoland), all figures "self-reported"; not found: Graphite Shopify page (404), autoland backout rate, Tide batch figures; Rust "~10 PRs a day" lines approximate (l.309-312); 113,247 helper tokens | `c1-collect-production.md` | Sub-topic 6 of `lane-check.md` |
| 4c Addendum (Opus) + quote check (Sonnet) | done 2026-11-19: 16 claims A1-A16 (9 self-reported; bear on ranks 1, 2, 3, 5, 6; none on rank 4); gate 26 quotations: 25 STANDS, 1 MOVED (A9, rustci.txt l.307-310 not 309-312; corrected in the report by the coordinator), 0 altered, 0 not found; 108,457 + 90,743 helper tokens | `c1-report.md` section "Addendum: queues in real use (added after the refutation; checked by the gate only)", `c1-addendum-gate.md` | |
| 5 Extract (6 Haiku: x30..x34, x43 for production) + check (Sonnet) | done 2026-11-19: x30 14, x31 41, x32 41, x33 26, x34 35, x43 24 result records; check over all 254 records (with c1.jsonl 73): 0 faults, 0 removed; one status record c1-0201 names C44 and C64; 8 records under-claimed as summary, kept; extract 698,314 + check 128,557 helper tokens | `library/journal/2026-11-19/x30..x34.jsonl`, `x43.jsonl`, `c1-check.md` | Launches carry the top session's "Keeping the library clean" text word for word |
| 6 Commit and push | done 2026-11-19: report 6 sections + addendum present; 254 records parse (node); week 55 % | | Only this lane's files. Successor session helper tokens: 1,440,201 |

## Resume
A fresh session continues at the first step not done: read this file, then the brief of that step. Every launch
is "Read and follow exactly the brief in <path>" with the helper's kind as the description prefix and an explicit
model (collect, run: sonnet; analyse, refute: opus; extract: haiku).

## Tokens and usage
- Week, all models: 51 % before step 1, 52 % after it (2026-11-19). Cap 62 %.
- Step 1 helper tokens: 713,167 (group 129,559; shorter 141,657; mergeq 163,974; bottleneck 143,632; queue 134,345).
- Orchestrator context after step 1: 148,250 tokens, past the 130,000 of ROUND.md. Reported to the top session;
  the next step (2, analyse) may be started by a fresh session from this file.
- Exceedance: ceiling 130,000 tokens (ROUND.md). Stood at: step 0 about 114,000; step 1 148,250. The top session
  decided (2026-11-19): continue here, launches only, hard stop at 180,000, state committed after each step.
- Orchestrator context at step 2: about 172,000 tokens.
- Orchestrator context after step 3: about 177,000 tokens. Hard stop (180,000) reached here: next is step 4, fold (brief c1-brief-fold.md), run by the top session or a fresh session from this file.
- Successor session (launch only, 2026-11-19): week 53 % before step 4, 54 % after it; context 101,078 after step 4.
