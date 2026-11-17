# Several writers on one file: options for building the 13 fixes and 0b at once

Written 2026-11-18 by reading only. Nothing was built, run or committed.
Tags: [M] = measured or counted here (a run on this PC, or a count over our own change list). [L file #item, sum] = literature read from a summary; [L ..., tb] = literature stated as textbook knowledge, not fetched. [R] = reasoned here. [D] = documented by the app, not observed here. [O] = observed in this app (probe-hooks.md).
Files: lit1 to lit5 = concurrency-lit-1 to -5; litA = concurrency-literature.md; WCP = write-collision-points.md; PSM = probe-suite-memory.md; PH = probe-hooks.md; AEM = app-enforcement-mechanisms.md; SM = research-tree/SELECTIONS-MAP.md; BS = research-tree/BUILD-SIZE.md.

## 0. For the owner

- Theory settles this much: two writers can edit one file at once when their edits commute.
  Edits that must keep an order, or change the same statement, need the order fixed first or one owner. [L lit3 #9, #10; lit1 #9; sum]
- Our 20 shared points: 9 commute, 7 are ordered sequences, 4 are the same statements. [M]
- Chosen: 0b first. Then one small "skeleton" change fixes the interfaces, turns each ordered
  sequence into a list of empty steps (one per fix) and writes the 4 same statements. Then each fix
  fills only its own steps on its own copy; one script gate merges and tests. [R]
- Fixes at once: file lock 3; function lock 7, or 8 with 0b first [M]; with the skeleton, all 13 after 0b [R].
  The limit then is the gate and the PC, not the file.
- The gate: one suite run takes 596 s, one test file at a time [M]. Gating each fix alone costs
  14 x 596 s = 2 h 19 min whatever the number of writers [R].
- The gate keeps up only while writers < (time to write one fix) / 596 s. That time is not measured;
  it will be, on 0b, which goes first in every option.
- The suite uses about 3 of 24 threads and 494 MB [M]: it is serial by its setting, not by the PC.
  Test files side by side could cut one run to the longest file, about 270 s [R].
- Open: two suites side by side; git on our neighbouring lines; a hook on Edit and in a worktree;
  time and tokens per fix; how often a merge fails. Section 6: tests, smallest first.
- Left out: backup builders on the same fix (double tokens) and merges done by a model.

## 1. The problem in classical terms

| Classical term | Our case |
|---|---|
| Writer (transaction) | One builder agent implementing one fix (14 in all) [R] |
| Shared item and its grain | Repository > file > function or block > statement or key; WCP counts at function or block grain [M] |
| Operation | An edit to a place (write set); the signatures and file formats it relies on (read set) [R] |
| Write-write conflict | Two fixes change the same place: textual (same hunk) or ordered (both insert steps into one sequence) [R] |
| Read-write conflict | A fix relies on a function or format another fix changes; shows as a clean merge that fails [R] |
| Private copy | A git worktree per builder; its base commit is its snapshot [R; worktree isolation D] |
| Validation | Three-way merge (write sets) plus the test suite on the merged tip (read sets, joint invariants) [L litA topic 5, sum] |
| Commit | Advance the integration branch only if its tip is unchanged since the merge began (compare-and-swap) [R; L lit2 #11, tb] |
| Abort | A refused merge; the builder rebases or redoes [R] |

Version control is optimistic control: each writer works on a copy, the merge is the validation, a textual conflict is the abort [L litA topic 5, sum]. A clean merge does not prove the result: this is snapshot isolation's write skew, disjoint writes that break a joint invariant [L lit1 #7, sum], and it is what the suite must catch.

## 2. Schemes per class of collision

### 2a. Separate entries, keys or parts (9 points: B1, B5, B7, B9, B10, B12, B17, B18, B20) [M, WCP]

Candidates: optimistic control with private copies [L lit1 #4, tb and sum]; lock splitting and striping [L lit2 #3, tb; litA topic 7, sum: striping gave almost n times a single lock under contention]; commutativity as the condition [L lit3 #1, #2, sum]; key-wise merge as in the JSON CRDT, where edits to different keys merge [L lit3 #8b, tb]; semistructured or structured merge, 34 % to 62 % fewer conflicts [L lit3 #16, #17; litA topic 6, sum].
Chosen: optimistic copies with a three-way merge, made safe by layout (lock splitting applied to the text): the skeleton puts each fix's key, entry or part on its own line, apart from its neighbours [R].
Why: these edits commute, and optimistic control wins at low conflict [L lit1 #4, B1, sum]. A line merge reports a conflict when both sides change touching lines [L lit3 #14, tb], and some of ours are neighbours: lines 1773 and 1774 in `fence`, line 283 named by both CLAIM and CLOSE, appends at the end of one JSON object [M, WCP section 7]. Structured merge would also help but needs a tool installed (rule 3) and misses some interference [L lit3 #16, sum].
Assumptions that fail for model writers, and the answer [R]:
- "An abort is cheap": a rerun is a model re-reading files, paid in tokens. Answer: make conflicts nearly impossible by layout so aborts are rare; fix a conflict by a rebase with the other fix's diff in the brief, not a redo (telling an agent the other change recovered 82 % of runs [L litA topic 9, quoted abstract, constructed tasks]).
- "A writer stays in its declared write set": a model can drift. Answer: a hook refuses writes outside its files [O for Write, by path]; the gate script refuses hunks outside its declared functions.
- "Read sets are tracked": a model reads freely. Answer: the full suite on the merged tip.

### 2b. Ordered sequences (7 points: B2, B3, B6, B11, B15, B16, B19) [M, WCP]

These do not commute: the order of steps is the meaning (the hook order of FIX-JOIN point 9; "a denial writes nothing"). By CALM and invariant confluence a non-commutative step needs coordination [L lit3 #9, #10, sum].
Candidates: one writer at a time, strict two-phase locking [L lit1 #2, tb]; a central server that orders [L lit3 #7, sum]; operational transformation [L lit3 #6, sum: correct transform functions are hard, several published ones were faulty]; ordering before execution with declared read and write sets [L lit1 #9 Calvin, sum].
Chosen: Calvin's idea (order fixed before anyone writes) plus lock splitting. The order is already named in the record (FIX-JOIN points 9, 11, 2b, lines 150 and 244-252) [M, WCP rows B2-B19]. The skeleton rewrites each sequence as a fixed list of named step functions, each a no-op stub owned by one fix. Wrappers that must enclose a whole sequence (W3's `requireArmed` first in the fence hold, W7's copy-then-adopt around `evaluate`) go into the skeleton as their own functions. Each ordered point becomes separate parts [R].
Assumptions that fail [R]:
- "Read and write sets are declared and correct" holds in part: r3 names places and order but no signatures (BS lines 132-136). Answer: the skeleton fixes signatures first; a wrong one found later is a skeleton amendment through the gate, then its users rebase. Calvin names a wrong declared set as its failure mode [L lit1 #9, sum].
- "Execution is deterministic" fails (a model is not), but it is not needed: only the order of steps is fixed, nothing is replayed.
- Steps that read what another step writes in the same hold (B11: W1's prune reads W2's slots; B16: W5 acts over the set W6 extends) stay read-write dependencies. Answer: the plan script lists such pairs and their joint tests run at the gate once both are merged: the "dangerous structure" check of serializable snapshot isolation, done at plan time [L lit1 #8, sum].

### 2c. The same statements (4 points: B4, B8, B13, B14) [M, WCP]

No merge rule combines two versions of one statement; every scheme falls back on ordering, merge code or a reported conflict [L lit3 section F, sum]. Candidates: one owner, read-only users [SM D8-08]; strict 2PL, the second writer edits on top of the first [L lit1 #2, tb]; a merge procedure per write as in Bayou [L lit3 #12, sum].
Chosen: one owner, each point kept tiny. B4 disappears when 0b lands first and the others call its new option (WCP 4b, last row) [M]. B8 (one line in `briefLine`) and B14 (one statement in `rowAct`) are written once, with both fixes' content, by the skeleton writer. B13 (one line of flags) is reformatted to one flag per line and becomes separate parts [R].
Assumption that fails: the owner must know both fixes' intent and a model can misread one. Answer: each point is one line or one statement, and both fixes' own tests check it [R].

### 2d. Dependencies between fixes

Named in BS section 3: 0b before OUT, CLAIM, CGATE; PLAN after CLAIM, CGATE, OUT; CLOSE after CGATE and PLAN; W1, then W2, then W3, then W4 (W4 also reads W5 and W7); two design loops (W2 is correct only with W4; OUT's liveness needs PLAN and CLOSE, which read OUT's log) [M, BS].
Candidates: work and span with a greedy schedule, within T1/p + T_inf [L lit4 #1, #2, sum]; critical-path list scheduling, any greedy list within 2 - 1/m of the best, longest first within 4/3 - 1/(3m) for independent tasks [L lit4 #5, #6, sum and tb]; branch by abstraction, coding against an interface before the implementation exists [L lit5 #1, sum].
Chosen: interfaces first (the skeleton), then a work-conserving greedy queue, largest fix first (BS sizes: OUT, CLAIM, CGATE, W4 are L) [R]. Why: taken as implementation order, the chains 0b > CLAIM > PLAN > CLOSE and W1 > W2 > W3 > W4 give a span of 4 levels after 0b, so no number of writers finishes in fewer than about 5 build times [R on M]. Against interfaces, a dependency only says which joint tests wait for both. The design loops are not build loops: the joint tests and the joint model run (r3:280) check them at the end [R].
Assumption that fails: list scheduling assumes known task times; ours are S, M, L estimates. Answer: largest first needs only the ranking [R].

## 3. The serial step

Measured: one suite run T_s = 596 s, 965 pass, one file at a time, peak 494 MB, average 3.1 of 24 threads [M, PSM]. Per-file runs of 2026-11-17 summed to 768 s; selftest alone 270 s, queue start-up included [M, PSM].
Not measured, carried as symbols: T_w = time to write one fix; T_skel = time for the skeleton; p = chance that one merged fix fails the suite; T_r = time to rebase after a conflict; T_i = an integrator's time per patch (workflow C).

- Gate per fix, one at a time (the "not rocket science" rule [L lit5 #3, sum]): 14 x T_s = 8,344 s, about 2 h 19 min of gate time for any number of writers [R on M]. Amdahl caps speed-up at 1/s, s the serial share [L lit4 #7, sum].
- Pipeline view: writing and gating overlap; steady throughput is 1/max(T_w/N, T_s) [L lit4 #14, tb]. Gate load rho = N x T_s / T_w. The gate keeps up while N < T_w / 596 s: one writer per 10 minutes a fix takes to write [R].
- Queueing: with near-constant service, mean wait = rho / (2(1 - rho)) x T_s [L lit4 #17, tb]: 298 s at rho = 0.5, about 20 min at 0.8, about 45 min at 0.9 [R on M]. Its assumption of steady random arrivals fails for one batch of 14 that arrives in bursts: read it as the shape, not the value. For one batch, makespan >= max(critical path, total work / m) [L lit4 #5, tb].
- Universal Scalability Law: C(N) = N / (1 + a(N - 1) + b N(N - 1)), peak at N = sqrt((1 - a)/b) [L lit4 #9, sum; litA topic 8, sum]. Here a is the gate share and b the pairwise reconcile cost (rebases between writers); neither is measured. Before the skeleton 22 of 91 pairs collide at function grain [M, WCP 4b]; after it, none by write set [R]. With at most 3 points a fit is a reading, not a law (SM D3-11).

What shortens or hides the step:
- Test files side by side inside one suite: span >= the longest file, so at best about 270 s, at most 596/270 = 2.2 times faster unless selftest is split [R on M; L lit4 #1, sum]. Whether files are safe side by side: not tested.
- Batching with bisection: one suite run for k merged fixes. Retesting singly after a red batch, batching saves runs when (1 - p)^k > 1/k: p below 0.29 for k = 2 or 4, below 0.24 for k = 7 [R]. Literature: batches of 4 needed up to 72 % fewer machines, dynamic batching up to 91 % fewer [L lit5 #8, sum]; group commit [L lit4 #13, sum].
- Speculation (Zuul): test each queued fix on top of those ahead, in parallel; pays when q x t > (1 - q) x r [L lit5 #4, sum; lit4 #12, tb]. Here a miss costs processor time, not tokens, and the PC has room: about 30 runs by memory, 2 to 7 by threads (system-wide upper bounds) [M, PSM]. Needs tests that share no files or ports [L lit5 #14, sum]: not tested.
- Test selection before the gate: the builder runs its own test file and those of the scripts it touched (presubmit [L lit5 #2, sum]; file-level selection cut test time 32 % on average [L lit5 #13, sum]). It gives little for changes to lib, which every script imports (the losing case of lit5 #9, sum), so the gate still runs the full suite [R].
- Uber's queue, which models which changes are independent, cut resources about 53 % in its 2025 form [L lit5 #7, sum]; it needs a history we do not have [R].

## 4. Workflows

Common parts. Each builder works in its own worktree: the Agent tool's `isolation: worktree` [D, not observed]. A workflow script starts builders with a model per call, up to 16 at once by default, and has no file or shell access itself [D, AEM section 5]. The gate is a script run through the existing queue script `tools/lane.mjs` [M, used by PSM], started by a helper. A PreToolUse hook refuses a Write by path, also inside helpers and with permissions bypassed [O, PH rows 6, 10, 15]; Edit, shell writes and the hook's view of a worktree are not tested [PH limits]. The list of files each builder may write lives outside its worktree, since a checked party must not hold its own checker [SM D5-08].

### Workflow A: interfaces and slots first, then fill on private copies, one gate (chosen)

1. Build 0b alone and merge it through the gate. Record its write time and tokens (gives T_w).
2. One writer (Opus) makes the skeleton on one copy: signatures of every cross-file function the fixes name; each ordered sequence as a fixed list of no-op steps in the FIX-JOIN order; each key, entry and flag on its own line; B8 and B14 written in full; one new test file per fix (`tcb/test/fx-<name>.test.mjs`) so fixes share no test file. The suite must stay green. Merge through the gate.
3. The plan script reads each fix's footprint (file and function or stub) and its reads (interfaces it calls). It refuses a plan with two writers of one function and lists the pairs where one fix reads what another writes (joint tests).
4. The workflow script starts one builder per fix, largest first, as slots free; admission by free memory against a measured peak (SM D3-03). A builder's peak is not measured.
5. While writing, the hook refuses a write outside the builder's worktree or footprint files [O for Write].
6. The builder runs its own test file and the tests of the scripts it touched, then reports ready.
7. The gate takes ready fixes in order, merges each on the tip, refuses any hunk outside the declared functions (diff hunks mapped to function ranges, by script), runs the full suite plus the joint tests now complete, and advances the branch only if the tip is unchanged since it started (compare-and-swap: the tip is the fencing token of SM D1-01). Several ready: one batch; red: bisect.
8. Textual conflict: the later fix is refused (first committer wins) and rebases with the other diff in its brief. Footprint breach: refused, told the hunk. Red: the culprit goes back to its builder. Wrong signature: a skeleton amendment first, then its users rebase.
9. At the end: full suite and the joint model run (r3:280).
Enforced: by the hook, files per builder [O for Write; D for Edit]; by script, function footprints, merge order, the suite, the compare-and-swap; by the workflow script, who starts, on which model, how many at once [D].
At once: 13 after 0b, since no two write one function [R]. In practice min(13, slots by memory, gate capacity k x T_w / T_s), none measured.
Costs: the skeleton is a serial design step (T_skel); the record puts an agent's fixed overhead near 60,000 tokens (README section 3), so 16 agents carry about 960,000 before any work [R on that figure]. Failure modes: write skew across stubs (each passes alone, wrong together), caught only by the suite and joint tests; a wrong interface costs a rebase round; shell writes pass the hook and are caught only at the gate; flaky tests mislead bisection [L lit5 #15, sum].

### Workflow B: function locks fixed at plan time, no skeleton

1. 0b first, as A. 2. The plan script gives each of the 11 ordered or same-statement points to one owner fix, which writes the whole point, others' parts included, from their specs; two fixes sharing a point never run at the same time. All locks are declared before start and held to merge: conservative strict 2PL, so no deadlock [L lit1 #2, #3, tb]. 3. A greedy queue starts any fix whose points are free and whose inputs are merged, largest first. 4. Hook, own tests, gate and conflict handling as in A steps 5 to 9.
Enforced: as A. At once: at most 8 [M, WCP 4b, statement level, 0b first]. Colouring the same graph needs at least 3 rounds (W1, W2, W3 all meet at B15) and 3 suffice: {W3, CLOSE, W4, W5, REDO}, {W1, OUT, W6, PLAN}, {W2, CGATE, CLAIM, W7} [R on WCP edges]. With the named dependencies taken as implementation order the span is 4 levels after 0b [R on BS]: about 5 build times plus gates.
Costs: no design step; owners read other fixes' specs (more tokens, misreading risk concentrated on owners). Failure modes: long chains, idle slots between rounds, an owner applying another fix's part wrongly.

### Workflow C: many proposers, one integrator per file group

1. Builders write their fix on private copies of the whole tree and test it alone. 2. Each hands in a patch and a line of intent per changed place. 3. One integrator session per file group applies the patches in the FIX-JOIN order, resolves ordered and same points by intent (a Bayou-style merge procedure, done by a model [L lit3 #12, sum]), then the gate runs as in A.
Enforced: the hook keeps builders in their worktrees [O for Write]; a script checks that only the integrator commits to the integration branch. At once: 13 writers; the integrator is the serial step (T_i not measured).
Costs and failures: the integrator's window grows with every patch; merges by a model are the error-prone part the OT record warns of [L lit3 #6, sum]; builders write against a stale base.

## 5. The seven measures

| Measure | A | B | C | What measures it |
|---|---|---|---|---|
| Throughput | Not measured. Gate-bound: 1 fix per 596 s single, up to k per run batched [R on M] | Not measured. Same gate, fewer writers per round [R] | Not measured. Integrator-bound [R] | Merges per hour from the gate log |
| Efficiency | Not measured. Waste is rebases and amendments [R] | Not measured. Waste is idle slots [R] | Not measured. Waste is integrator re-reading [R] | Share of builder tokens spent after the first ready report |
| Token count | Not measured. 15 agents plus gate helpers, about 60,000 fixed each [R on record] | Not measured. 14 agents, owners larger [R] | Not measured. 14 plus growing integrator windows [R] | Token sums per helper from transcripts |
| Token cost | Not measured. One Opus skeleton step [R] | Not measured | Not measured. Opus integrators [R] | Tokens per model tier, from transcripts |
| Time taken | Not measured. T_0b + T_skel + longest T_w + gate [R] | Not measured. T_0b + about 4 x T_w + gates [R] | Not measured. T_w + 14 x T_i + gate [R] | First start to last merge |
| Quality | Not measured. Risk: write skew at stubs [R] | Not measured. Risk: owner misapplies a part [R] | Not measured. Risk: merges by a model [R] | Suite and joint model run at the end; defects found later per fix |
| Hallucinations | Not measured | Not measured | Not measured | Footprint refusals; builder claims contradicted by the diff or the tests (script compare) |

Literature only, for scale: parallel agents were up to 21 % faster on some tasks and up to 39 % slower on others; splitting by dependencies gave up to 2.1 times speed and 35 % lower cost; plan, isolated workspace, then test-checked merge beat a single agent by 14.7 to 25.6 points [L litA topic 9, all sum, preprints]. Unplanned co-active agent pairs conflicted textually in 20 % to 42 % [L litA topic 9, sum]; ours are planned, so that rate does not transfer [R]. Interference after a clean merge: 1 of 834 real pairs, 97 % of constructed ones [L litA topic 9, quoted abstract]; our fixes were designed jointly around shared state (FIX-JOIN part 2c lists 17), so the constructed end may be nearer [R, a hypothesis].

## 6. Tests, smallest first

Each is an experiment under rule 3 and needs the owner's word before it runs.
1. Line merge at our neighbours (minutes, no model tokens): two dummy edit sets on scratch copies at `fence` 1773 and 1774, `modeRequest` line 283, two keys appended to `thresholds.json` `params`, two allow-list entries; merge with git. Changes: if clean, the skeleton need not split separate parts (smaller T_skel); if not, it must.
2. Two suites side by side in two worktrees, then one suite with `--test-concurrency=4` (about 20 min of processor, no model tokens). Changes: whether the gate can speculate or test batches in parallel, and the suite time (floor about 270 s). If they interfere, batching is the only lever.
3. A hook on Edit and Write inside a helper started with worktree isolation (one small Haiku session, as PH). Changes: whether files per builder are held at write time (A step 5) or only at the gate.
4. Build 0b alone and record T_w and tokens (no extra cost: 0b goes first in every workflow). Changes: gate capacity T_w / 596 s, so whether batching and speculation are worth building and how many builders to start.
5. Skeleton plus the first fixes, logged: rebases, footprint refusals, red merges per fix (p). Changes: batch size (p below about 0.29 for k = 2 or 4) and for which points A falls back to B.
6. Wall-time speed-up at 2 and 3 builders, with the work ratio (SM D3-11). Changes: the number of builders for the rest.
Left out, because no result would change the choice: a general conflict-rate study, a USL fit beyond three points, a structured-merge tool (an install).

## 7. Against the designs already selected

- `research-tree/RULINGS.md:33` "One writer per file" and the harness v2 rule "Refuse a plan with two writers of one file" (WCP section 6): replaced for building by one writer per function or stub, after the owner's rejection of 2026-11-18. The v2 design is designed only, so nothing built changes [R].
- SM D2-05, shared-nothing partitioning, one writer per folder: selected for run files written at run time, not for source edits (WCP section 6). Workflow A is the same scheme at a finer grain; its weakness "nothing enforces the partition but discipline" is answered by the hook and the gate. Holds, refined [R].
- SM D8-08, one owner and read-only users: kept for the same-statement points [R].
- SM do_not, no consensus, distributed locks or two-phase commit across sessions: B's locks are assignments made once by one plan script before anyone starts, never taken or released across sessions; the gate is one serial committer. Holds [R].
- SM do_not, no speculative backup tasks: no second builder ever writes the same fix. Speculative suite runs cost processor time, not tokens, so the stated reason (double token cost) does not apply to them. Holds, with that line drawn [R].
- SM D3-11 (report wall-time speed-up and work ratio; waves of 2 if three is not better) is test 6. SM D3-03 (admit by measured memory) needs a builder's peak, not measured. SM D1-01 (fencing) is the gate's compare-and-swap.
- CONTRACT decision 20 ("guard-hook writes nothing") concerns the tree's own hook at run time, not a build hook: no conflict.
- Open: T_w, T_skel, p, T_r, T_i; suites side by side; the hook on Edit and in worktrees; a builder's peak memory; the signatures the skeleton must fix (r3 names functions, gives none); shell writes (caught only at the gate); flaky tests (none seen in one run, 0 fail [M, PSM]).
