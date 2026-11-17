# Testing evidence: what checking cost and what it changed (extraction, 2026-11-18)

Facts with sources. No verdict, no recommendation. Short names: PROTO = `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`; S17 = `research-tree/notes/section17-draft-2026-11-17.md`; BN = `docs/program/HARNESS-BOTTLENECKS-2026-11.md`; V2 = `docs/program/HARNESS-V2-DESIGN-2026-11.md`; RUL = `research-tree/RULINGS.md`; BS = `research-tree/BUILD-SIZE.md`; DES = `docs/ORCHESTRATION-DESIGN-2026-10.md`. [M] = marked measured in the record. "pt" = point number where I give no line.

## 1. Measured costs of checking

| Cost | What it measures | Source |
|---|---|---|
| 1,018 tests, 965 pass, 0 fail, 53 skipped; 26 test files; ended 14:52 | the closing run of the tree build's tests (skips need the app) | PROTO 1243-1245 |
| 232 of 232 steps | the end-to-end run of the same build, self-test included | PROTO 1246-1247 |
| no record of the minutes of that closing run as one figure | per-command times are in section 5 | no record |
| about 104 min + about 29 min + 4 min = about 2 h 15 min; estimate was about 4 h | the model run of groups 1 to 5 | PROTO 1292-1294 |
| estimate: groups 1 to 5 about 4 h, groups 1 to 9 about 2 to 2.5 days, whole matrix about 2.5 to 3 weeks | the full model matrix that cut 1 removed | PROTO 986-988 |
| 5,163 parts, 3.43 billion states, 53,447 cpu-seconds; 5,154 complete, 9 BOUNDED | size of the model run | PROTO "Totals" in pt 11 |
| 3,914 parts fitted 500 MB; 92 needed 1,150 MB; 26 needed 2,600 MB; 2 needed 6,000 MB (28.1 M states, 3,115 MB) | memory of the model run | PROTO pt 11 "Sizes" |
| 9 parts BOUNDED at 6,000 MB, 45 to 47 million states each | memory ceiling reached | PROTO pt 11 "Sizes" |
| design D 4.5 M to 391.5 M states per size; design with fixes 3.7 M to 278.5 M | states of the eight sizes | PROTO pt 11 table |
| FXW-4 at 3000 MB stopped BOUNDED at 23,229,448 states | one wake-fix check | S17 322-323 |
| FX-CGATE Q5a 8,290,758 states, peak 1063 MB; FX-CLAIM about 148 M states over 43 parts; Q5b about 190 M summed, 8 parts BOUNDED near 11.5 M | single fix checks | S17 pt 5 table |
| a complete joint as-built run estimated about 110 M states (about 16 GB), or billions | a run not made | S17 pt 10 |
| 30 to 50 min each | parts runs of each fence configuration | S17 pt 11 |
| 22 min stall: a long test command was moved to the background after 180 s and the helper waited | waiting in the closing round | PROTO 1085-1088 |
| about 20 min every process crawled (02:34) | waiting during the model run | PROTO 1056-1058 |
| about 6.8 million helper tokens, 30 runs, 13 helpers; designers 2.42 M, refuters 1.44 M, modellers 1.29 M, fidelity reviewer 0.94 M, join 0.23 M, change list 0.15 M, writer 0.35 M | tokens of the R57 round | S17 879-900 |
| about 7.67 million over 33 runs of 14 helpers (adds change list 0.25 M, writer 0.30 M, reader's check 0.30 M) | tokens of the whole round | S17 pt 13 |
| coordinator window about 404,000 tokens at the end, twice R59's 200,000 line | coordinator tokens | S17 pt 13; RUL 43-44, 67 |
| week's usage 26 % at 15:20 to 39 % at 22:10, all sessions | the round's share of the week | S17 pt 13; RUL 71-72 |
| 767,000 tokens, four minutes, under one point of the week, for five Sonnet readers | a reading fan-out on 2026-11-18 | RUL 48-49 |
| 12 scripts changed, 52 tests to add (0b 3, OUT 6, CLAIM 7, CGATE 5, CLOSE 3, REDO 1, PLAN 5, W1 3, W2 3, W3 5, W4 4, W5 2, W6 3, W7 2); model checks not counted | tests to add for 14 fix rows (author's own count) | BS 176, 179 |
| 367 s one full check on Windows, 230 s in the container (1.6x); parallel check 855 s to 284 s (3.0x) | earlier clinic build | BN 25, 65; V2 37 |
| one check slot; 8 GiB never free in about 980 samples | check capacity | BN 22 |
| waits from 3 s to 2,030 s (34 min) on 9 November; median 409 s | waiting for the check slot | BN 22, 46; V2 109 |
| 2.8 rounds per slice [M]; 9 of 11 slice gates took three rounds | review rounds, earlier build | V2 36, 110; BN 143 |
| 64 % of reviews sent a slice back [M] | share of reviews | V2 36 |
| 3 attack passes ran where the ruling says one | R57 round | RUL 71 |
| 39.8 % of tokens in calls past 400k; slice sessions 66 % of tokens, root 15 %; about 306k context per call over 9,342 calls | where tokens went (context, not checks alone) | BN 21; V2 103 |
| memory and tokens of each single test run | no record (the lane log has time only) | no record |
| time of the attack rounds in the R57 round | no record | no record |

## 2. Cases where a test, review or model run changed a decision or found a real fault

| Case | Source |
|---|---|
| The model of the adopted design fails 7 properties (Slots, ReadyNotDiscarded, NoFalseSuspicion, NoDeadlock, AlwaysCanResolve, NoBusyLoop, EventuallyResolves) at every size; with the six fixes none fails | PROTO pt 11 table |
| "Each of the six fixes is needed in the model": every X- row fails at 2 and at 3 faults | PROTO pt 11 |
| Model run corrected an earlier record: commit 164df64 said five properties fail; it fails seven | PROTO pt 11 end |
| Real counterexamples as built: D4a ReadyNotDiscarded 6 steps, D4b Slots, D3 stale coordinator (real in a longer form), D4c committed child holds its slot, M2 gap, D1 wake loop | S17 159-180 |
| R57 does not lift: "The counterexamples are real"; scripts unchanged; model evidence partial | S17 664-680 |
| Fidelity review marked traces "real" or "artefact": D7-SLOTS failure is an artefact with the held stop verify; D3's shortest trace is an artefact | S17 159-162, 690-695 |
| Ablations showed what each fix prevents: FX-CGATE (D3 real form), FX-OUT (D4a trace), FX-CLOSE (D4c) | S17 pt 5 table |
| Final pass: counting dead sessions in step 7 removed AlwaysCanResolve 7 (a slot leak) | S17 pt 5, FX-CLAIM revision 5 row |
| Q5b: NoDeadlock 15 and AlwaysCanResolve 12 found (hand-started children wake no coordinator); one trace rests on an inferred step | S17 pt 5, Q5b row |
| Model run: A-WX fails nothing because the model's reconcile has a branch the contract lacks | PROTO pt 11 results |
| The safeguard-removed rows each fail named properties (A-ALARM, A-ACK, A-CUT, A-FENCE-EPOCH and others) | PROTO pt 11, second table |
| The lane log let the coordinator see the 22-min stall and resume the helper | PROTO 1085-1088 |
| Provenance rerun of the four fence "holds" gave equal results | S17 pt 12 "Settled since" |
| Earlier build: 19 P1 findings in round one; at least 5 more P1 and 10 P2 created by fixes | BN 143 |
| Earlier build: first root check after the real-data switch failed 2 of 2,570 tests | BN 50 |
| Earlier build: 111 P3 findings in round 1 across ten slices; 20 plus recorded overstatements in reports | BN 52; BN 157 |
| Earlier build: for the first two slices the first check on merged main failed, on hand edits to shared documents | V2 44 |

## 3. Cases where checking changed nothing, was repeated, or was cut

| Case | Source |
|---|---|
| A-DRAIN and A-WX fail nothing at either size; "The model does not show these safeguards to be needed" | PROTO pt 11 results |
| DFPLUS-RECHECK (one extra fix) fails none: not shown to be needed | PROTO pt 11 |
| Groups 6 to 11 of RUN-FULL.md not run | PROTO pt 11 "The decision"; 1385-1390 |
| Nine cut-off parts of A-FENCE-CE: "none is rerun"; "its state space has no end" | PROTO 1389-1392; pt 11 results |
| FXW-4 whole run BOUNDED at 23.2 M states; five maximal parts used instead | S17 322-325 |
| A resume re-ran finished agents and overwrote 20 revised specs; restored from snapshot 8e0a694 | PROTO 1083-1084 |
| Four interruptions of the model run (01:44, 02:34, 13:57, 15:43) | PROTO 1054-1095 |
| Three attack passes ran where one was ruled; 13 of 14 helpers on the most expensive model | RUL 65-71 |
| No script changed in the R57 round, after about 7.7 million helper tokens | RUL 71-72; S17 pt 10 |
| 29 "owner choices" put to the owner on a page; he rejected them | RUL 69-71 |
| Not run, "stands": AB-SLOTCOUNT alone, AB-HANDOVER-NOKILL alone, AB-PROCLIST alone, parts runs of every fence configuration, the single-flag matrix, every "each flag alone" matrix, other parts of AB-WAKE-ALL, forced process-list recovery, D7-STALE at two faults, and others | S17 734-796 |
| Not run, "owner's call": three-fault runs, a complete AB-ALL run, a further attack round on revision 4, liveness of whole AB-WAKE-ALL, FXW-ALL above 400 MB, FX-W3 and FX-W7 (no model) | S17 734-796 |
| No review verdict for three late results (FN-OUT-CLOSE, FN-R5, N2) | S17 pt 5, pt 11 |
| "The self-test was not run again on its own" in the closing run | PROTO 1247-1248 |
| Same suite repeated: `selftest.test.mjs` ran under labels e2e-fix-suite, verify-selftest, mg-suite-selftest, each 4.5 to 4.6 min | lane log, section 5 |
| Earlier build: reruns at the base commit against one slot; rule "Never a second full check" | BN 407; V2 359 |
| Earlier build: proofs and drills ran at every gate; 4 of 5 merges on 10 November had the final head unread | BN 50 |
| Earlier build: every trial of context machinery came back null or worse (6 to 17 % more tokens) | BN 25 |

## 4. Rules already in force

The owner's ruling, PROTO 1374-1402 (2026-11-17, about 17:50). The owner: "we also want to avoid useless extensive testing that wastes a shit ton of our time". He answered the four cuts: "Yes, cut them". The four cuts as approved:

1. "Model checking of the corrected design: only the sizes where the fixes act (hours), not the whole matrix (weeks)."
2. "Attack rounds on the fixes: one round per fix; another only for a finding that would break it."
3. "App checks before the pilot: only the three that could stop the pilot (the guard hook firing for helpers, a stop ending a session with its helpers, a background command's exit waking the coordinator); the rest only if the pilot shows a need."
4. "Full test-suite runs: once at the end of a change, not at every stage."

The rule behind them: "a test runs only if its result can change what we do next."

PROTO 1393-1403: R57's "full run" means the sizes where the fixes act, not the 77 configurations of `model/RUN-FULL.md`; groups 6 to 11 are not run; "One attack round per fix, and the full suite once at the end of a change."
RUL 23-24 repeats the rule. RUL 45-46: "Heavy commands, such as a test suite or a model check, go through `research-tree/tools/lane.mjs`, one at a time".

Verification policy, DES 4.6 (313-340):
- "Citation check — Sonnet / high, one per analyst, batched over all its defect/risk claims."
- "Fresh-context skeptic — Opus / xhigh, one per surviving P0, and per surviving P1 that touches the outbox, the job lifecycle, the ledger/chain, auth, or the location privacy time bounds."
- "Hard cap: 12 Opus skeptics per W2 run; claims beyond the cap go to the open-risks list as `unverified` — never dropped."
- "Web re-check — Sonnet / medium, one agent."
- "No materiality skeptic: severity is re-set by Fable at G2 with the whole program in view."

DES section 6 (559-571), where verification is bought:
- "Verification is bought where it moves the plan: a cheap Sonnet citation pass over everything, Opus skeptics only for P0s and invariant-touching P1s, a hard cap, and a second lens at the skeptic rather than a duplicate analyst."
- "Verification is skeptical about promotion, not about existence."
- DES 580 (budget table): W2 verification "≤ 8 Sonnet citation checks · ≤ 12 Opus skeptics · 1 Sonnet web re-check".

## 5. Durations from the lane log

File: `research-tree/lane/log.jsonl`, 1,573 lines, 2026-11-16 22:11 UTC to 2026-11-17 16:51 UTC. Fields: `t`, `ev` (start, end, timeout, busy), `label`, `pid`, `waited_ms` (queue wait before start), `cmd` (on start lines); end lines add `exit`, `signal`, `ms` (duration). 783 starts, 778 ends, 11 timeouts, 1 busy line (fix-U3-st-canary, waited 900 s). Method: awk joined each end line to the latest start line of the same label. A reused label can join the wrong command text, so the command column is approximate; the `ms` figures are exact.

Kinds (rule: cmd contains `model/` is model check; label contains `e2e` is end-to-end; cmd contains `--test` is test suite; the rest other). Some "e2e" labels run `selftest.test.mjs` or `status.test.mjs`.

| Kind | Commands | Total minutes | Longest (s) |
|---|---|---|---|
| test suite | 421 | 165.9 | 300 |
| model check | 240 | 142.7 | 1,500 |
| end-to-end | 47 | 38.6 | 274 |
| other | 70 | 7.5 | 300 |
| all | 778 | 354.6 | 1,500 |

Queue waiting (sum of `waited_ms` over 783 starts): about 176.8 min; longest single wait 549.9 s. 267 of 778 ends had an exit other than 0 (this includes timeouts, exit 124, and tests meant to fail). Timeouts by label: lane-timeout (a self-test), model-review-r4 (300 s), lib-review-M5b, r3-q5b-parts, runner-check-debug, -final1, -floor, -full, -kill1, fix-U1-full-admit-stop, fix-U2.

The 20 longest commands:

| Rank | Minutes | Label | Command (cut) |
|---|---|---|---|
| 1 | 25.0 | r3-q5b-parts | node model/as-built/run-seq.mjs FX-CGATE-Q5B --parts --out model/results |
| 2 | 19.9 | r3-q5b-parts | node model/as-built/run-seq.mjs FX-CGATE-Q5B --parts --out model/results |
| 3 | 16.9 | r3-claim-parts | node model/as-built/run-seq.mjs FX-CLAIM --parts --out model/results-as- |
| 4 | 5.4 | r3-provenance | node model/as-built/run-seq.mjs FX-CLAIM --out model/results-as-built/pr |
| 5 | 5.3 | r3-claim-r | node model/as-built/run-seq.mjs FX-CLAIM --only k=2,cs=1,r=1;k=2,cv=1,r= |
| 6 | 5.0 | model-review-r4 | node <tmp>/e24f17dc-4aea-4914-a9d1-280a |
| 7 | 5.0 | lib-review-M5b | node --test --test-concurrency=1 --test-name-pattern=^T2[01] tcb/test/li |
| 8 | 5.0 | runner-check-full | node model/run-resumable.mjs --only A-ALARM,DF2-K2-R1 --results tmp/mode |
| 9 | 4.6 | verify-selftest | node --test --test-concurrency=1 --test-reporter=tap tcb/test/selftest.t |
| 10 | 4.6 | e2e-fix-suite | node --test --test-concurrency=1 --test-reporter=tap tcb/test/selftest.t |
| 11 | 4.5 | mg-suite-selftest | node --test --test-concurrency=1 --test-reporter=tap tcb/test/selftest.t |
| 12 | 3.9 | modelfix-U1-final-b | node --test --test-concurrency=1 tcb/test/watch.test.mjs tcb/test/status |
| 13 | 3.0 | r3-fixes-wake | node model/as-built/check.mjs FXW-4 --mem-mb 3000 |
| 14 | 2.9 | r3-asbuilt-fence | node model/as-built/run-seq.mjs AB-READY-SPLIT --parts --out model/resul |
| 15 | 2.9 | review-U1-base-status-handover | node --test --test-concurrency=1 tcb/test/status.test.mjs tcb/test/hando |
| 16 | 2.9 | r3-final | node model/as-built/run-seq.mjs FN-JOIN-WSTART --out model/results-as-bu |
| 17 | 2.4 | join-U1a-final | node --test --test-concurrency=1 <tmp>/ |
| 18 | 2.4 | e2e-fix-suite | node --test --test-concurrency=1 --test-reporter=tap tcb/test/status.tes |
| 19 | 2.4 | modelfix-U1-final-a | node --test --test-concurrency=1 tcb/test/admit.test.mjs tcb/test/stop.t |
| 20 | 2.4 | fix-U1-status | node --test --test-concurrency=1 tcb/test/status.test.mjs |
