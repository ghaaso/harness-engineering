# Several writers on one file: options for building the 13 fixes and 0b at once

Written 2026-11-18 by reading only; revised the same day after 48 papers were read in full text. Nothing was built, run or committed.
Marks. MEASURED-HERE: [M] measured or counted here (a run on this PC, or a count over our own change list); [O] observed in this app (PH). LITERATURE: [L file #item, quoted] = exact words now in that file, with its page or line; [L ..., sum] = still only from a summary (a small model's text or an abstract returned by a fetch tool); [L ..., tb] = textbook knowledge, not read; [D] = the app's documentation read through summaries (AEM), so also sum. REASONED: [R].
Files: lit1 to lit5 = concurrency-lit-1 to -5; litA = concurrency-literature.md (first pass, summaries only); WCP = write-collision-points.md; PSM = probe-suite-memory.md; PH = probe-hooks.md; AEM = app-enforcement-mechanisms.md; SM = research-tree/SELECTIONS-MAP.md; BS = research-tree/BUILD-SIZE.md; OD = orchestration-design-status.md.

## 0. For the owner

- Two builders can share one file only where their edits commute. Of our 20 shared points, 9 do, 7 are ordered steps, 4 are the same lines. [M; L lit3 #1, #9, #10, quoted]
- Tokens are the scarce resource; the PC is not (the suite used 3 of 24 threads and 0.5 of 15 GB free). [M]
- The 1987 study that compared the two methods: when the work a redo throws away is scarce, wait instead of redo. [L lit1 B1, quoted]
- So no two builders write one function at once, and a fix that reads another fix's work waits for it.
- Chosen: 0b first. Then one "skeleton" change fixes the interfaces and gives each fix its own empty steps.
- Then 7 fixes at once (OUT, CLAIM, CGATE, REDO, W1, W6, W7); the other 6 follow in three steps. Without the skeleton: 4 at once. [R on M]
- The number running grows by one per clean merge and halves after a failed one.
- The check: one suite run takes 596 s. The 13 fixes checked one by one take 2 h 9 min.
- The check keeps up only while builders < (minutes to write one fix) / 10. [R on M]
- Textual merge conflicts: near 0 with the skeleton, but not proven; the merge theorem covers two edited regions only. [L lit3 #14, quoted]
- Clean merges that then fail the tests: 1 to 6 of 13 by studies of people; maybe more, as our fixes share 17 places by design. [L lit5 #17, quoted; R]
- Checking several ready fixes in one run pays while fewer than about 29 % of merges fail (2 to 4 per run). [R]
- A failed test is not simply retried: our tests check timing, and a retry hides a race. [R; L lit5 #10, quoted]
- Not known yet: time and tokens to write one fix (0b gives it); the failure rate (the first wave gives it).
- Ruled out: merges done by a model, testing every combination of waiting fixes, a structured-merge tool.
- Next tests, smallest first: git merge on our neighbouring lines; two suites side by side; the hook on Edit inside a worktree.

## 1. The problem in classical terms

| Classical term | Our case |
|---|---|
| Writer (transaction) | One builder agent implementing one fix (14 in all) [R] |
| Shared item and its grain | Repository > file > function or block > statement or key; WCP counts at function or block grain [M] |
| Operation | An edit to a place (write set); the signatures and formats it relies on (read set) [R] |
| Write-write conflict | Two fixes change the same place: textual (same hunk) or ordered (both insert steps into one sequence) [R] |
| Read-write conflict | A fix relies on code another fix changes; shows as a clean merge that fails [R] |
| Private copy | A git worktree per builder; its base commit is its snapshot [R; D] |
| Validation | Three-way merge (write sets) plus the suite on the merged tip (read sets, joint invariants) [R; L lit1 #4, quoted Kung l.58-59] |
| Commit | Advance the integration branch only if its tip is unchanged since the merge began (compare-and-swap) [R; L lit2 #8, quoted l.111] |
| Abort | A refused merge; the builder rebases or redoes [R] |

Version control is optimistic control: a private copy, a validation, a publish [L lit1 #4, quoted l.58-59]. A clean merge does not prove the result. That is snapshot isolation's write skew: "two concurrent transactions that read the same data, but modify disjoint sets of data" break an invariant together [L lit1 #7, quoted Ports l.36-55]. The suite must catch it.

## 2. Schemes per class of collision

### 2a. Separate entries, keys or parts (9 points: B1, B5, B7, B9, B10, B12, B17, B18, B20) [M, WCP]

Candidates: optimistic copies [L lit1 #4, quoted]; lock splitting, "partition spacetime" [L lit2 #3, quoted perfbook l.5808; no open measured study of striping, the "almost n times" figure is L litA t7, sum]; commutativity as the condition [L lit3 #1, quoted]; key-wise merge as in the JSON CRDT [L lit3 #8b, tb]; semistructured merge, fewer conflicts in 60 % of scenarios by 34±21 %, but more in 26 % of them by 109±170 % [L lit3 #16, quoted Apel p7 L462, p8 L569]; structured merge, 39 % of the conflicts of line merge [L lit3 #17, quoted p7 L332].
Partitioning wins only while few writers span partitions: a partitioned store fell below optimistic control at about 20 % cross-partition transactions [L lit1 B4, quoted Silo l.434-436], and throughput fell 12-40 % from two to four partitions [L lit1 B3, quoted Harding l.296]. Ours at file grain: 81 of 91 pairs share a file, largest disjoint set 3 [M, WCP 4a]. At function grain: 22 of 91 pairs [M, WCP 4b].
Chosen: change the layout so the edits commute, as the scalable commutativity rule does by changing an interface ("an O_ANYFD flag"; inode numbers from "a per-core counter") [L lit3 #1, quoted p14 L486, p13 L454]. Code points (B1, B7, B9, B10, B12): each fix's part becomes a step function in a per-fix file, called from the shared function. Content points (B5, B17, B18, B20): the skeleton writes every entry and key in full, since WCP names them all; a later change is a skeleton amendment [R].
Why per-fix files and not stubs in the shared file. The three-way merge theorem guarantees a clean merge only when the untouched middle holds a line that "occurs exactly once in each of O, A, and B", and only for two edited regions; generalised to several "this generalization no longer ensures a conflict-free synchronization" [L lit3 #14, quoted p7 L118-119, p9 L131]. lib alone gets 9 fixes [M, WCP table C]. A per-fix file has one writer, so nothing is merged, and the hook refuses a Write by path [O, PH rows 6, 15]. Test 1 decides whether stubs may stay in the shared file instead.
Structured merge is not chosen: it needs an install (rule 3), and its improved form still had 20.60 % added false negatives (clean merges that are wrong) against 9.62 % for line merge [L lit3 #16, quoted Cavalcanti 2017 p16 L211].
Assumptions that fail for model writers, and the answer [R]:
- "An abort is cheap": a redo is a model re-reading files, paid in tokens, the scarce resource (section 3a). Answer: no shared text to conflict on; a rebase with the other fix's diff in the brief, not a redo (telling an agent of the other change recovered 82 % of runs [L litA t9, sum, constructed tasks]).
- "A writer stays in its declared write set": answer, the hook by path [O for Write]; the gate refuses hunks outside the footprint.
- "Read sets are tracked": answer, the full suite on the merged tip.

### 2b. Ordered sequences (7 points: B2, B3, B6, B11, B15, B16, B19) [M, WCP]

These do not commute: the order of steps is the meaning. CALM: "A program has a consistent, coordination-free distributed implementation if and only if it is monotonic" [L lit3 #9, quoted p3 L119]. Invariant confluence: sequential numbering is the textbook case that needs coordination ("order IDs should be assigned sequentially") [L lit3 #10, quoted p8 L439].
Candidates: strict two-phase locking [L lit1 #2, tb]; a central server that orders [L lit3 #7, sum]; operational transformation, ruled out (section 2e); ordering before execution with known read and write sets (Calvin) [L lit1 #9, quoted l.120]. Ordering first was "the only protocol to maintain good performance despite high skew" [L lit1 B3, quoted Harding l.205-206].
Chosen: Calvin's idea (order fixed once, before anyone writes) applied by the skeleton. Each sequence becomes a fixed list of step functions in the FIX-JOIN order (points 9, 11, 2b), each step in its owner's per-fix file. Wrappers around a whole sequence (W3's `requireArmed`, W7's copy-then-adopt around `evaluate`) are skeleton functions. B19 (one list of acts in a brief) is content: written in full [R; M, WCP rows].
Assumptions that fail [R]:
- Calvin needs "advance knowledge of all transactions' read/write sets"; a transaction that must read to learn them gets a reconnaissance step and is "restarted if the 'reconnoitered' read/write set is no longer valid" [L lit1 #9, quoted l.120]. Our fixes are such transactions: r3 names places, gives no signatures (BS lines 132-136). Answer: the skeleton is the reconnaissance; the gate's footprint check is the recheck; a wrong signature is a skeleton amendment.
- Determinism is not needed: only the order of steps is fixed, nothing is replayed.
- A step that reads what another step writes in the same hold (B11: W1's prune reads W2's slots; B16: W5 acts over the set W6 extends) is not made safe by any merge rule: "If invariants are incorrectly or incompletely specified, an I-confluent database system may violate application-level correctness" [L lit3 #10, quoted p6 L291]. Answer, changed in this revision: the reader waits for the writer (W2 after W1 as BS already says; W5 after W6), and their joint tests run at its gate. This is the "dangerous structure" of serializable snapshot isolation [L lit1 #8, quoted Ports l.162-166], settled at plan time.

### 2c. The same statements (4 points: B4, B8, B13, B14) [M, WCP]

No merge rule combines two versions of one statement; every scheme falls back on ordering, merge code or a reported conflict [L lit3 section F, the file's own reading aid]. Candidates: one owner, read-only users [SM D8-08]; strict 2PL [L lit1 #2, tb]; a merge procedure per write as in Bayou [L lit3 #12, sum].
Chosen: one writer. B4 disappears when 0b lands first [M, WCP 4b last row]. B8 (one line of `briefLine`), B13 (one line of flags) and B14 (one statement of `rowAct`) are written once, with both fixes' content, by the skeleton writer [R]. Assumption that fails: that writer must know both intents. Answer: each point is one line or statement, and both fixes' own tests check it [R].

### 2d. Dependencies between fixes

Named in BS section 3: 0b before OUT, CLAIM, CGATE; PLAN after CLAIM, CGATE, OUT; CLOSE after CGATE and PLAN; W1, W2, W3, W4 in that order (W4 also reads W5 and W7); two design loops [M, BS]. Added here: W5 after W6 (2b) [R].
Theory: any greedy schedule finishes within T1/P + T_inf, "universally optimal to within a factor of 2" [L lit4 #2, quoted bl99 L316-323]. Critical-path-first is not near optimal with precedence: its best bound stays near 2; with no precedence it is "4/3 - 1/(3n)" [L lit4 #5, quoted graham66 L735-779]. "an increase in the number of processing units can cause an increase in the total length of time" [L lit4 #6, quoted L7-10]; ratios of 1.1 or more over the best "are quite common" in simulation [L lit4 #5, quoted L784-787].
Chosen, changed in this revision: a dependency is build order by default, not only a joint test. Reason: Agrawal (section 3a) says wait when the redo would waste the scarce resource, and a fix written against a stub of code not yet written is the likeliest to be redone. Levels after 0b and the skeleton: (1) OUT, CLAIM, CGATE, REDO, W1, W6, W7; (2) PLAN, W2, W5; (3) CLOSE, W3; (4) W4 [R on BS]. Within a level, largest first (BS sizes) [R]. Dependents may start early on stubs only if the first wave's measured failure rate allows it (section 4, step 9). The design loops are checked by the joint tests and the joint model run (r3:280) [R].

### 2e. Ruled out by the corrected literature

- Merge by a model "by intent" (Workflow C) is operational transformation done without checked transform functions. Published string transforms fail the convergence conditions ("It is well known that these transformation functions are not correct") [L lit3 #6, quoted Imine p6 L77], and "if the number of sites exceeds 2 then the convergence property is not satisfied for all OT algorithms considered here" [L lit3 #6, quoted Boucheneb abstract].
- Testing every combination of waiting fixes: worse than testing on top of the likely outcome, P50 "up to 15x" of the ideal; "speculating deep instead of going wide helps" [L lit5 #6, quoted UBER19 l.1158-1163].
- A structured or semistructured merge tool: an install, and more missed interference (2a).
- Who-talks-to-whom arguments (socio-technical congruence): 25 projects showed "no statistical relationship" with bugs [L lit5 #18, quoted STC21 l.15-16].
- Real-time co-editing of one file (sequence CRDTs): interleaving anomalies and growing metadata [L lit3 #4, #5, sum; #3, quoted p41 L1949]; nothing in our case needs it.

## 3. The serial step and the scarce resource

Measured: one suite run T_s = 596 s, 965 pass, 0 fail, one test file at a time, peak 494 MB, average 3.1 and peak 12 of 24 threads, 15,019 MB free at start [M, PSM]. Per-file runs of 2026-11-17 summed to 768 s; selftest alone 270 s [M, PSM]. A later pass lost 7 refuters to the usage limit [M, OD item 13]. An agent's fixed overhead is about 60,000 tokens [M, README section 3].
Not measured, carried as symbols: T_w (time to write one fix), T_skel, p (share of merges that fail the suite), R (tokens per rework), T_r (rebase time).

### 3a. Which resource is scarce (Agrawal, Carey and Livny 1987)

The paper: blocking won "for medium to high levels of resource utilization"; a restart-based method wins only "if resource utilizations are low enough so that a large amount of wasted resources can be tolerated, and in addition there are a large number of transactions available to execute" [L lit1 B1, quoted l.1195-1197]. "the proper algorithm choice is strongly resource dependent" (l.1197); the crossover is a resource level, not a conflict rate [L lit1 B1, B6].
Our resources [M unless marked]:
- Processor and memory during a suite run: not scarce (3.1 of 24 threads on average; 0.5 GB of 15 GB).
- The check: serial by design, 596 s a run; a capacity limit, not a waste limit [R].
- Tokens and the weekly allowance: scarce (the limit stopped a pass; OD item 13). A refused or failed merge throws away the tokens its builder spent; a fresh session costs about 60,000 before any work.
- Transactions available: 13, few; Agrawal's second condition for restarts does not hold [R].
What follows [R]: wait (lock or order) wherever a redo would waste tokens; be optimistic only where the waste is processor time. So writing is locked by plan (one writer per function or per-fix file, readers after writers), and the gate is optimistic (speculative and batched suite runs; a lost run costs only processor). Kung and Robinson add the remedy for a writer refused again and again: "in an optimistic approach, the major difficulty is starvation, which can be solved by using locking" [L lit1 #4, quoted l.214]. "the level of multiprogramming ... should be carefully controlled" [L lit1 B1, quoted l.1201-1203].
Wasted work per workflow [R]: A risks a rework per failed merge and a rebase round per wrong signature (paused builders only). B risks idle slots, little rework, but owners read others' specs. C would throw away whatever the integrator cannot fit.

### 3b. Expected conflicts and failures over 13 merges (arithmetic, ranges as published)

| Source | Rate | Of 13 merges |
|---|---|---|
| Textual conflict, people (Brun 2013) [L lit5 #17, quoted BRU13 l.504-515] | 16 % | 2.1 |
| Textual conflict, people (Kasi 2013) [L lit5 #17, quoted KAS13 l.49-52] | 7.6 to 19.3 % | 1.0 to 2.5 |
| Textual conflict, co-active AI agent PR pairs [L litA t9, sum] | 19.8 to 41.7 %; 27.67 % in a second study | 2.6 to 5.4; 3.6 |
| Fails build or tests, of all merges (Brun) [quoted l.504-515] | 1 % + 6 % = 7 % | 0.9 |
| Fails build or tests, of clean merges (Kasi: build 2.1 to 14.7 %, then tests 5.6 to 35 % of good builds) [quoted l.49-52] | 1 - 0.979 x 0.944 = 7.6 % to 1 - 0.853 x 0.65 = 44.6 % | 1.0 to 5.8 |
| Stale 1 to 10 h, makes mainline red (Uber, model figure) [L lit5 #6, quoted l.243-244] | 10 to 20 % | 1.3 to 2.6 |
| Semantic conflicts, parallel agents [L litA t9, sum] | 5 to 10 % | 0.65 to 1.3 |
| Passes alone, fails together: mined pairs / constructed tasks [L litA t9, sum] | 1 of 834 / 97 % | 0.02 / 12.6 |

Brun's text also says "33 percent of the 399 clean textual merges led to build or test conflicts", which does not agree with its 1 % + 6 % [L lit5 #17, corrections]; the table uses the per-merge counts.
How far the conditions match [R]: the studies merge long-lived, unplanned branches of people (conflicts persisted 3.2 days [quoted BRU13 l.1796]) or unplanned co-active agent PRs. Ours are planned with declared places, hours apart, from one base. So textual rates do not transfer: under A and B (with layout) the write sets are disjoint by plan, and the residual is diff3 alignment, which test 1 measures. Failures after a clean merge come from read-write coupling, which planning does not remove; our fixes were designed around 17 shared places (FIX-JOIN 2c), nearer the constructed end. Expect 1 to 6 red merges of 13, more possible; the first wave's p replaces this range.
Per workflow [R]: A: textual about 0 (unproven); red 1 to 6. B without layout: up to 5 textual (one per neighbouring DIFF point whose fixes share a wave: B1, B5, B7, B17, B18), about 0 with A's layout; red 1 to 6. C: textual 2.6 to 5.4, resolved by a model; red 1 to 6 plus the integrator's errors.

### 3c. What shortens or hides the 596 s check

- Load: gating one fix at a time, 13 x 596 = 7,748 s (2 h 9 min); with 0b, 8,344 s [R on M]. Gate load rho = N x 596 / T_w; with 13 builders the gate is the bound whenever T_w < 7,748 s [R]. Pipelining hides the check only while rho < 1 [L lit4 #14, tb]. The plain serial queue at Uber's load (500 changes an hour) gave turnaround "80x, 129x and 132x" of the ideal and a "95% slowdown" [L lit5 #6, quoted l.1166-1167, l.1391]: a load effect, so for us it is the rho above, not the multiple.
- Batching, greedy: when the gate frees, take every ready fix as one batch. Group commit's "flush the instant the device is free" came within about 0.1 % of the best tuned timer [L lit4 #13, quoted L12-19; a 2026 preprint, one measured case]. With a failed batch retested singly, a batch of k saves runs when (1 - p)^k > 1/k: p below 0.29 for k = 2 or 4, below 0.24 for k = 7 [R]. At Brun's 7 % and Kasi's low 7.6 % it pays; at Kasi's high 44.6 % it does not. Batch-of-4 figures (72 % fewer machines) stay [L lit5 #8, sum]. Needs failures that reproduce (next item but one).
- Speculation, deep not wide: test the next fix on top of those ahead. The chance that k fixes ahead all pass is (1 - p)^k: 0.75 for p = 0.07, k = 4; 0.095 for p = 0.446 [R]. A miss costs processor, which is not scarce (3a), so it is allowed, but it gains time only at the low end of p. SubmitQueue was up to 2.98x the ideal at P50 and 1.2x with 500 workers [L lit5 #6, quoted l.1146-1156]. Needs two suites side by side without interference: test 2.
- Conflict analysis: it improved the ideal's turnaround up to 60 %, but "only 20%" for the practical queue because "the build graph on the iOS monorepo is very deep" [L lit5 #6, quoted l.1409-1418]. Ours is deep too: 9 of 14 fixes change lib, which every script imports [M, WCP table C; R]. It could separate only the 5 fixes that do not touch lib (CGATE, CLOSE, REDO, W4, W5) [R].
- Test selection: file-level selection cut test time "32% on average, and 54% for longer-running test suites", but took up to 138 % of the full run on short suites [L lit5 #13, quoted EKS15 l.21-26, l.827-832]. Predictive selection needs "past three months" of outcomes [L lit5 #12, quoted l.532-533]; we have none. A lib change selects every test file. So selection is the builder's pre-check (its own test file and those of the scripts it touched); the gate runs the full suite [R].
- Test files side by side: span at least the longest file, 270 s, so at most 596 / 270 = 2.2 times faster unless selftest is split [R on M; L lit4 #1, quoted]. Needs tests that share no files or ports [L lit5 #14, sum]: test 2.
- Uber's 2025 changes cut CPU 35 to 52 % and p95 wait 32 to 45 % per monorepo (headline 53 % / 44 % / 37 %), against their 2019 queue, by predicting build times [L lit5 #7, quoted l.144-145, l.1010-1082]. We have no history to predict from [R].
- Flaky tests and retries. At Google, of 115,160 test targets that both passed and failed, 46,694 were flakes (40.5 %), so about 60 % were real breaks [L lit5 #10, quoted TAP17 l.441-445]. Training on flaky results gives "very poor predictions" [L lit5 #12, quoted l.121-124]; flaky failures mislead bisection [L lit5 #8, sum]. Our tests check leases, deadlines and locks, where a race shows as an intermittent failure [R]. Rule: no retry on the merged tip. A failing test file is run once on the base tip without the fix: failing there too means a pre-existing or flaky test; passing there means the fix broke it [R]. Our one run had 0 failures [M]; test 2's runs on the base add flake data at no extra cost.

### 3d. Universal Scalability Law: what can and cannot be computed

The law C(N) = N / (1 + a(N - 1) + b N(N - 1)) and its peak N* = sqrt((1 - a)/b) are confirmed [L lit4 #9, quoted eq. 5-6], and the peak formula reproduces three measured fits (memcached, peaks 6.6 to 6.8) [L lit4 #9b, quoted L560-583]. Gunther's own method asks for "at least half a dozen data points" [quoted L108-126], and one case predicted from early data a peak at 12,000 threads that measured 2,000, a factor of 6 [quoted L707-712].
Before any measurement we can say [R]: a comes from the serial check; b from pairwise reconciling (rebases, joint failures). The skeleton makes write-set overlap zero by plan, so b is set by read-write coupling, unknown. With b near 0 the peak goes to infinity and the cap is Amdahl's 1/a [L lit4 #9, quoted L151-165]. After 0b gives T_w: with single-run gating, speed-up over one builder is at most (T_w + 596) / 596; with greedy batches of k that all pass, at most k times that. We cannot compute b, the peak, or where adding builders turns retrograde, and with at most 13 builders a fit from 2 or 3 widths must not be extrapolated (SM D3-11). The growing width (step 4 below) visits each width once and gives the points for free.

## 4. Workflows

Common parts. Each builder works in its own worktree (`isolation: worktree`) [D, not observed]. A workflow script starts builders with a model per call, up to 16 at once by default, and has no file or shell access itself [D, AEM section 5]. The gate is a script run through `tools/lane.mjs` [M, used by PSM]. A PreToolUse hook refuses a Write by path, also inside helpers and with permissions bypassed [O, PH rows 6, 10, 15]; Edit, shell writes and a worktree are not tested [PH limits]. The list of files each builder may write lives outside its worktree [SM D5-08].

### Workflow A: skeleton first, then fixes by level, one optimistic gate (chosen; revised)

1. Build 0b alone and merge it through the gate. Record T_w and tokens.
2. One writer (Opus) makes the skeleton: signatures of every cross-file function the fixes name; for the 11 code points (B1, B2, B3, B6, B7, B9, B10, B11, B12, B15, B16) the step functions in per-fix files (`tcb/fx/<fix>.mjs`, name assumed), called in the FIX-JOIN order; the 8 content and same points (B5, B8, B13, B14, B17, B18, B19, B20) written in full; one test file per fix. Suite green. Through the gate. (Changed: per-fix files and full content, see 2a.)
3. The plan script reads each fix's footprint (files, functions) and its reads, refuses two writers of one file or function, and builds the levels of 2d. (Changed: reads are build order by default.)
4. The workflow script admits ready fixes (all they read is merged), largest first. Width starts at 2, grows by 1 per clean merge, halves after a failed one, as Zuul's window does [L lit5 #4, sum]; capped by free memory against a measured builder peak (SM D3-03) and by gate capacity: T_w / 596 s builders with single runs, k times that with passing batches of k. (Changed: replaces a fixed width; Graham's anomaly and Agrawal's load control.)
5. While writing, the hook refuses a write outside the builder's worktree or footprint [O for Write].
6. The builder runs its own test file, those of the scripts it touched, and its joint tests whose other fixes are merged; then reports ready.
7. The gate, when free, takes all ready fixes as one batch, merges each on the tip, refuses hunks outside the footprint, runs the full suite and the joint tests now complete, and advances only if the tip is unchanged (compare-and-swap; the fencing token of SM D1-01). A red batch is bisected; a failing test file is rerun once on the base, never retried on the tip (3c).
8. Textual conflict: first committer wins; the later fix rebases with the other diff in its brief. A fix refused twice gets the next gate run alone and fixes that read its places wait (Kung's remedy, 3a). Footprint breach: refused, told the hunk. Wrong signature: a skeleton amendment, and only builders whose declared reads include it pause.
9. After level 1 is merged: compute p and R. Start later levels early on stubs only if p x R x (fixes started early) fits the allowance left with margin; otherwise wait (the default). (New.)
10. At the end: full suite and the joint model run (r3:280).
Enforced: by the hook, files per builder (per-fix files make this the write-time check) [O for Write; Edit untested]; by script, function footprints, levels, merge order, the suite, the compare-and-swap; by the workflow script, who starts, on which model, how many [D].
At once: 7 in level 1, then 3, 2, 1 [R on BS]; 13 only if step 9 allows stubs. In practice also bounded by memory and gate capacity, not measured.
Costs: the skeleton is a serial step (T_skel), larger than in the first draft; about 60,000 tokens fixed per agent, so 15 agents carry about 900,000 before work [R on M]. Failure modes: write skew across steps, caught by the suite and joint tests; a wrong interface costs a rebase of its readers; shell writes pass the hook; flaky tests mislead bisection.

### Workflow B: function locks fixed at plan time, no skeleton

1. 0b first, as A. 2. The plan script gives each of the 11 ordered or same points to one owner fix, which writes the whole point from the other fixes' specs; fixes sharing a point never run at once. All locks are declared before start and held to merge: conservative strict 2PL, no deadlock [L lit1 #2, #3, tb]. 3. A greedy queue starts any fix whose points are free and whose reads are merged, largest first. 4. Hook, own tests, gate, conflicts as A steps 5 to 10.
At once: 8 if dependencies are ignored [M, WCP 4b, statement level, 0b first]; 4 in the first level once BS's dependencies and W5 after W6 are kept (from OUT, CLAIM, CGATE, REDO, W1, W6, W7 the edges OUT-CLAIM, CGATE-W1, W6-W7 leave 4, e.g. OUT, CGATE, REDO, W6) [R on WCP edges]. (Changed: the first draft gave 8 and 3 colouring rounds without dependencies.) The DIFF neighbours still need A's layout, or they conflict (3b).
Costs: no design step; owners read other fixes' specs (more tokens, misreading concentrated on owners). Failure modes: longer chains, idle slots, an owner applying another fix's part wrongly.

### Workflow C: many proposers, one integrator per file group (ruled out as written)

Builders write on whole-tree copies; an integrator session per file group applies the patches and resolves ordered and same points by intent. Ruled out in this revision: the integrator is an unchecked transform function (2e), its window grows with every patch, and textual conflicts would sit at the unplanned agent rate (3b). An integrator that only applies clean merges and refuses the rest is Workflow A without the skeleton.

## 5. The seven measures

| Measure | A | B | What measures it |
|---|---|---|---|
| Throughput | Not measured. Gate-bound: 1 fix per 596 s single, up to k per run batched while p < 0.29 [R on M] | Not measured. Same gate, fewer ready fixes per level [R] | Merges per hour from the gate log |
| Efficiency | Not measured. Waste: reworks (p x R) and amendments [R] | Not measured. Waste: idle slots [R] | Builder tokens spent after the first ready report |
| Token count | Not measured. 15 agents plus gate helpers, about 60,000 fixed each [R on M] | Not measured. 14 agents, owners larger [R] | Token sums per helper from transcripts |
| Token cost | Not measured. One Opus skeleton step [R] | Not measured | Tokens per model tier |
| Time taken | Not measured. T_0b + T_skel + 4 levels of T_w + gate tail; 1 level if step 9 allows stubs [R] | Not measured. T_0b + at least 4 levels, more where a level splits at shared points [R] | First start to last merge |
| Quality | Not measured. Risk: write skew across steps [R] | Not measured. Risk: owner misapplies a part [R] | Suite and joint model run; defects found later per fix |
| Hallucinations | Not measured | Not measured | Footprint refusals; builder claims contradicted by the diff or tests (script compare) |

For scale only [L litA t9, all sum, preprints]: parallel agents up to 21 % faster on some tasks and 39 % slower on others; dependency-aware splitting up to 2.1 times faster at 35 % lower cost; plan, isolated workspace and test-checked merge beat one agent by 14.7 to 25.6 points.

## 6. Tests, smallest first

Each is an experiment under rule 3 and needs the owner's word before it runs.
1. Line merge on our neighbours (minutes, no model tokens): dummy edits on scratch copies at `fence` 1773 and 1774, `modeRequest` line 283, two keys in `thresholds.json` `params`, two allow-list entries; then several dummy fixes merged one after another into one copy of lib (the many-region case the theorem does not cover). Changes: whether step functions may stay in the shared files (smaller skeleton) or need per-fix files.
2. Two suites side by side in two worktrees, then one suite with `--test-concurrency=4` (about 20 min of processor, no model tokens). Changes: whether the gate can speculate or split a batch (floor about 270 s); the base runs also show flaky tests, which sets the retry rule.
3. A hook on Edit and Write inside a helper started with worktree isolation (one small Haiku session, as PH). Changes: whether files per builder are held at write time or only at the gate.
4. Build 0b alone, recording T_w and tokens (no extra cost: 0b goes first in every workflow). Changes: gate capacity T_w / 596 s, the width cap, and whether batching is worth building.
5. Skeleton and level 1, logged: rebases, footprint refusals, failed merges (p), rework tokens (R), wall-time speed-up and work ratio at each width the window visits (SM D3-11). Changes: batch size, whether later levels start on stubs (step 9), and the width.
Dropped: a separate run at 2 and 3 builders (the window in test 5 visits those widths on real work); a general conflict-rate study; a USL fit (fewer than six points); a structured-merge tool (an install).

## 7. Against the designs already selected

- `research-tree/RULINGS.md:33` "One writer per file" and the harness v2 rule "Refuse a plan with two writers of one file" (WCP section 6): for building, kept for per-fix files and refined to one writer per function in the shared files, after the owner's rejection of 2026-11-18. The v2 design is designed only [R].
- SM D2-05, shared-nothing partitioning: Workflow A is that scheme at function and per-fix-file grain; "nothing enforces the partition but discipline" is answered by the hook (by path) and the gate. Holds, refined [R].
- SM D2-06, optimistic control (Kung and Robinson): kept for the gate only; writing is locked by plan (3a) [R].
- SM D8-08, one owner and read-only users: kept for the same points and content points [R].
- SM do_not, no consensus, distributed locks or two-phase commit across sessions: B's locks and A's levels are made once by one plan script; the gate is one serial committer. Holds [R].
- SM do_not, no speculative backup tasks: no second builder writes the same fix; speculative suite runs cost processor, not tokens. Holds [R].
- SM D3-11 is test 5's reading; SM D3-03 needs a builder's peak, not measured; SM D1-01 is the gate's compare-and-swap.
- CONTRACT decision 19 ("what two scripts share is in lib"): per-fix step files are called from lib and the other scripts, so lib still holds the shared logic; the step files hold one fix's part each. To be checked against the contract text when the skeleton is written [R].
- CONTRACT decision 20 concerns the tree's own hook at run time, not a build hook: no conflict.
- Open: T_w, T_skel, p, R, T_r; suites side by side; the hook on Edit and in worktrees; a builder's peak memory; the signatures the skeleton must fix; shell writes (caught only at the gate); flaky tests.

## 8. What changed in this revision

Figures
- Agrawal 1987: was "optimistic wins at low conflict" [sum]; now quoted: the choice turns on resource use, not conflict rate; optimistic only when waste is tolerable and transactions many.
- Kung and Robinson: now quoted, including starvation solved by locking (used in A step 8).
- Write skew and SSI's dangerous structure: now quoted from Ports and Grittner (Berenson and Cahill unread).
- Calvin: "wrong declared set is its failure mode" [sum] replaced by the quoted limit, dependent transactions, reconnaissance and restart.
- CALM and invariant confluence: now quoted, with the limits on imperative code and on incomplete invariants.
- Three-way merge: the quoted theorem covers two edited regions with a unique untouched line; the many-region case is not guaranteed.
- Semistructured and structured merge: "34 % to 62 % fewer conflicts" replaced by quoted figures with the opposite cases (more conflicts in 26 %; more false negatives).
- Striping "almost n times": still a summary; no open measured study (lit2).
- Operational transformation: "several faulty" now quoted (C1/C2 failures; no algorithm converges beyond 2 sites).
- Greedy scheduling: bound now quoted; critical-path-first not near optimal with precedence; more workers can lengthen a schedule.
- Amdahl: no formula in his paper; formula from Gunther. USL peak formula confirmed; one prediction off by 6x.
- Uber 2019: speed-ups are against an ideal oracle (2.98x slower at P50), not baselines; serial queue 80x to 132x at 500 per hour; conflict analyser only 20 % on a deep graph.
- Uber 2025: "53 %" is a headline; per monorepo 35 to 52 % CPU, against their own 2019 queue.
- Ekstazi 32 % now quoted, with the slowdown on short suites. Facebook's "a quarter of tests" withdrawn.
- Brun and Kasi rates now quoted (16 %; 7.6 to 19.3 %; build and test failures after clean merges); Brun's "33 % of 399" is inconsistent.
- Flaky tests: TAP's 40.5 % of pass-and-fail targets were flakes, now quoted; the 1.5 % and 16 % stay summaries.
- Group commit: now a quoted 2026 preprint (greedy release within about 0.1 % of the best timer), one case.
Choices
- Locking versus optimistic: writing is locked by plan, the gate is optimistic (from Agrawal's resource rule).
- Dependencies are build order by default; stubs only if measured p and R allow. A's first wave 13 became 7; B's 8 became 4.
- Skeleton: per-fix step files for the 11 code points and full content for the 8 content points, instead of stubs in shared files (merge theorem; hook by path).
- Width: grows by one per clean merge, halves per failure, instead of a fixed number.
- Gate: greedy batches; no retry on the merged tip; reruns on the base to tell a flake from a break.
- Workflow C ruled out (model merge is unchecked transformation).
- Test 6 folded into test 5; test 1 now includes the many-region merge into lib.
