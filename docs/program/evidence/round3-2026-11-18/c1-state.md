# c1 state (lane "check", research round 3)

Orchestrator: the Opus child session of lane check. Updated after each step. Week cap: stop at 62 %.

| Step | Status | Output | Notes |
|---|---|---|---|
| 0 Briefs and state | done 2026-11-19 | `c1-brief-{collect,analyse,gate,refute,fold,extract}.md` | Week 51 % at start (2026-11-18 evening; again 51 % on 2026-11-19 after the PC restart) |
| 1 Collect (5 Sonnet) | done 2026-11-19 | `c1-collect-{queue,group,mergeq,shorter,bottleneck}.md` | Read in full or in the parts that matter: queue 7 (none whole), group 3, mergeq 8, shorter 8, bottleneck 6. Gaps: N* for c servers and with bulk service not found in any source (the c-slot form is reasoned); Memon 2017 is probably in `papers/check/google-ct-2017` |
| 1b Second attempt (3 Sonnet) | done 2026-11-19: group 4 of 6 opened (Hwang 1972, Deb and Serfozo 1973 closed); queue+bottleneck 4 opened, 5 closed (Reiser-Lavenberg, Adams-Balas-Zawack, Duclos-Spencer, Stecke-Aronson, Kleinrock II); mergeq+shorter: Memon 2017, Beheshtian thesis 2020, Rust rollup pages opened, TSE 2021 and Bavand ICSME 2021 closed. c-server N* still in no source (two reasoned forms differ by c - 1). 445,735 helper tokens | "## Second attempt" appended to the collect files | Top session's rule: an entry "not tried" gets one real attempt before step 2. Brief `c1-brief-collect-retry.md`. One for group, one for queue+bottleneck (with a targeted search for the c-server and bulk-service saturation point), one for mergeq+shorter. Do not hold step 2 for a paper still closed after a real attempt |
| 2 Analyse (Opus) | done 2026-11-19: 66 claims (42 proven, 10 measured here, 14 hypothesis); c-slot N* = c(S+Z)/S computed from Sztrik's exact model, 16 cases; 294,846 helper tokens | `c1-report.md` draft, `c1-claims.md` | |
| 3 Gate (Sonnet) + refute (Opus) | done 2026-11-19: gate 167 STANDS, 11 NO QUOTE (all hypotheses), 0 faults; refute 41 CONFIRMED, 23 PARTIALLY, 2 REFUTED (C44, C64), 0 UNVERIFIABLE; 419,003 helper tokens | `c1-gate.md`, `c1-refute.md` | |
| 4 Fold (Opus) | pending | `c1-report.md` final, `library/journal/2026-11-19/c1.jsonl` | |
| 5 Extract (5 Haiku) + check (Sonnet) | pending | `library/journal/2026-11-19/x30..x34.jsonl`, `c1-check.md` | |
| 6 Commit and push | pending | | Only this lane's files |

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
