# Intake corrections: lanes w1 (several writers) and t1 (the kind of tree)

Step 2 of the intake (`R:intake-state.md`), written 2026-11-19 by an Opus `analyse` child. `R:` =
`docs/program/evidence/round3-2026-11-18/`, `E:` = `docs/program/evidence/harness-method-status-2026-11-18/`.
Read: `library/README.md`, the lane files `library/journal/2026-11-19/w1.jsonl` (x25-x29, x40, x41) and `t1.jsonl`
(x35-x39, x42), the seven target records, and every place their evidence cites. No journal file was edited. These
are recommendations. The top session decides and writes the adjudications.

## The answer

| Lane | Open records | Proposed corrections | Open tasks | Right | Right in part | Wrong |
|---|---|---|---|---|---|---|
| w1 (`w1.jsonl`) | 13 | 4 | 9 | 3 (w1-0509, w1-0510, w1-0512) | 1 (w1-0511) | 0 |
| t1 (`t1.jsonl`) | 11 | 3 | 8 | 3 (t1-0507, t1-0508, t1-0509) | 0 | 0 |
| extractor files x25-x29, x40, x41, x35-x39, x42 | 0 | 0 | 0 | | | |

Command: `grep -c '"kind":"open"'` on each of the 15 files. No record of another kind holds "proposed correction"
(`grep -n 'proposed correction'` over the 15 files finds only these seven).

| Proposal | Target | What the lane changes | Recommendation | Reason |
|---|---|---|---|---|
| w1-0509 | r57-0304 (result, quoted) | "OT ruled out for more than two writers" goes beyond the source; a central server is not covered | right | The quote covers "all OT algorithms considered here", and "ruled out" was r57-0304's own step |
| w1-0510 | r57-0308 (result, summary) | quoted, not summary; the figures split by what each counts | right | All three papers stand at the lines the lane's records cite, and each figure's population is as the lane says |
| w1-0511 | r57-0406 (hypothesis) | the per-file switch becomes the last rungs of a ranked architecture; redo cost = re-applying one write | right in part | The architecture and redo-cost points follow from the lane's records. "The one measurement put worktrees below one agent" is wrong: CAID, the lane's own w1-0356, put them above |
| w1-0512 | r57-0301 (result, quoted) | Agrawal's optimistic win also needs many transactions available; the authors doubt such low use is real | right | Both conditions stand in the quote at `E:concurrency-lit-1-databases.md` lines 143 and 147 |
| t1-0507 | x03-0335 (result, quoted) | Table I has six figures; the 1.25 % is the text's rounding | right | Table I at paper lines 282-286 and the text at 354 differ exactly as the lane says |
| t1-0508 | x21-0318 (result, summary) | adds what 4.4/17.2 and -5.51/-23.72 compare; neither is a test of depth | right | Both papers stand. Two fixes go into the replacement: cite Kim lines 974-980 for "not significant", and "depth one" holds for MAD only |
| t1-0509 | x21-0470 (hypothesis) | the 246 rows fill the coordinator's own growth g·k*, so the bound counts that room twice | right | `cost.mjs` lines 271-277 and protocol line 473 give room = g·k*. The conclusion holds only while a summary is a short row (s_summary is not measured) |

Ids in the replacement records are the next free r57 numbers on 2026-11-19 (the last result is r57-0309 and the last
hypothesis r57-0409). The c1-a1 packet draws from the same ranges, so number the two packets together when you write
them. Each replacement keeps the target's other content, so the old line can leave the board.

## The proposed corrections

### 1. w1-0509, proposed correction of r57-0304 (operational transformation)

- **Target** (`library/journal/2026-11-18/r57.jsonl:52`): "Boucheneb and Imine 2008: all five operational-transformation
  algorithms they model-checked fail to converge with three or more sites (those five, not every published one), so
  OT is ruled out for more than two writers, and a merge done by a model is a similar method and untested."
- **The lane says instead:** "ruled out for more than two writers" goes beyond a model-checking result on five
  algorithms. Google Docs (self-reported, no figures) orders every change at one server and transforms a late change
  there, and that result does not cover this setting.
- **Evidence checked:**
  - `sed -n 74p E:concurrency-lit-3-coordination-free.md`: "if the number of sites exceeds 2 then the convergence
    property is not satisfied for all OT algorithms considered here" and "(Five IT algorithms; p22, L630.)". Stands.
    The line itself adds "a model-checking result on the algorithms they chose, not a count of all published ones".
  - `grep -n` in `R:papers/w1/google-docs/ot.txt`: "If OT is implemented correctly" at 128; "we never send more than
    one pending change at a time" at 235; "The server will use OT to transform John's change" at 258-259; the lock race
    at 56-59. Stands (OCR gives "Nnd" for "find").
  - `sed -n 361,363p R:w1-report.md` (section 9): stands. Lines 264-266 give the lane's own reason for dropping OT:
    one server "needs a transform for every pair of change types, which free code edits do not have".
- **Recommendation: right.** The source says only that these five fail. That a central order removes the three-site
  condition (C2, or TP2) is textbook and was not read in the paper. The conclusion for our case does not change, but
  its reason does: OT through one server needs a transform for each pair of change types, which free code edits lack.
- **Also rests on the target:** `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md` lines 137-138
  ("Transformation of operations is out for more than two writers"); `library/INDEX.md` line 107. x04-0330 already
  states the narrow reading and needs no change.
- **Replacement record:**

```json
{"id":"r57-0310","kind":"result","status":"quoted","claim":"Boucheneb and Imine 2008 (model checking): all five operational-transformation algorithms they checked fail to converge with three or more sites, a counterexample for each (those five, not every published one); this rules out transforms among more than two sites that exchange operations with no central order, not OT through one server, which Google Docs runs (self-reported, no figures: the server orders every change and transforms a late one against the revisions committed since) and which needs a transform for every pair of change types, which free code edits do not have; a merge done by a model is a similar method and untested.","evidence":["E:concurrency-lit-3-coordination-free.md#line 74","docs/program/evidence/round3-2026-11-18/papers/w1/google-docs/ot.txt#lines 52-59, 128-130, 235-237, 257-259","docs/program/evidence/round3-2026-11-18/w1-report.md#lines 264-266"],"see":["r57-0304","x04-0330","w1-0371","w1-0509"],"note":"That the five assume no central order, and that one server removes the need for the second transform condition (C2, TP2), is textbook, not read in the paper; Google's posts hedge 'if OT is implemented correctly'. r57-0304 said 'OT is ruled out for more than two writers', which the quote does not say.","handles":["operational transformation","OT","central server","model merge","convergence"],"supersedes":["r57-0304"],"date":"2026-11-19","by":"r57"}
```

### 2. w1-0510, proposed correction of r57-0308 (AI agents in one repository)

- **Target** (`r57.jsonl:56`): "Studies of AI agents changing one repository at once report textual conflicts in 19.8
  to 41.7 % of co-active pull-request pairs (27.67 % in another) and parallel agents from 21.1 % faster to 39.4 %
  slower in 600 trials, all read from fetch-tool summaries and not from the papers."
- **The lane says instead:** the record can be quoted, not summary, with its numbers split. 19.8 % and 41.7 % are the
  conflict rates of same-agent and cross-agent pairs (a lower bound). 27.67 % covers unmerged pull requests against
  their base, with merged ones excluded. 21.1 % is the best task, while the mean was 13.1 % slower and more code was
  written.
- **Evidence checked:**
  - `sed -n 188,194p R:papers/w1/agentpr/paper.txt`: "601 evaluatable out of 625): 19.8% tex-" at 190; "115 evaluatable
    out of 122): 41.7% tex-" at 193; "conservative lower bound." at 333. Line 162: cross-agent pairs are "only 0.50% of
    all concurrent pairs". Stands.
  - `R:papers/w1/agenticflict/paper.txt`: "a conflict rate of 27.67%" at 70; "retain PRs that are either open or closed
    without evidence of having been merged" at 115-116; the merge runs against the current base for open PRs and
    against the base at closing for closed ones (147-152). Stands.
  - `R:papers/w1/codecrdt/paper.txt`: "Parallel 13.1% slower overall" at 280; "-21.1% speedup (Tic-Tac-Toe) to +39.4%
    slowdown" at 281-282; "faster per character for 5/6 tasks (11-52% speedup" at 287-288; "parallel produces 82-189%
    more code" at 290; "6 tasks × 2 modes × 50 runs = 600 evaluations" at 256. Stands.
  - The proposal's own evidence names only `R:w1-report.md` section 9 (it stands at 364-366). The paper lines are in
    the records it sees (w1-0349, w1-0351, w1-0352), and all three passed the gate (`R:w1-gate.md` W58, W60, W61).
- **Recommendation: right.** The lane read the papers, so the summary mark no longer applies. The single range mixes
  two strata, and "21.1 % faster" leaves out the mean and the code-volume confound.
- **Also rests on the target:** `library/INDEX.md` line 111. x15-0339 repeats the same summary range, and the top
  session may name it in `supersedes` too.
- **Replacement record:**

```json
{"id":"r57-0311","kind":"result","status":"quoted","claim":"Three preprints on AI coding agents, read in the papers: co-active pull-request pairs had textual conflicts in 19.8 % of 601 same-agent and 41.7 % of 115 cross-agent pairs (a lower bound, build and semantic conflicts not tracked; a pair rate over hours to days, not a rate for sessions running at once); 27.67 % of agent pull requests that were open or closed without merging (merged ones excluded) conflicted with their base; and up to 5 Claude agents on one shared CRDT document were 13.1 % slower overall (6 tasks, 50 runs per mode), from 21.1 % faster to 39.4 % slower by task, while writing 82-189 % more code and running faster per 1,000 characters in 5 of 6 tasks.","evidence":["docs/program/evidence/round3-2026-11-18/papers/w1/agentpr/paper.txt#lines 162-167, 190, 193, 330-333","docs/program/evidence/round3-2026-11-18/papers/w1/agenticflict/paper.txt#lines 68-70, 113-116, 147-152","docs/program/evidence/round3-2026-11-18/papers/w1/codecrdt/paper.txt#lines 256, 280-292","https://arxiv.org/pdf/2607.04697","https://arxiv.org/pdf/2604.03551","https://arxiv.org/pdf/2510.18893"],"see":["r57-0308","x15-0339","w1-0349","w1-0351","w1-0352","w1-0510"],"note":"r57-0308 read these from fetch-tool summaries (E:concurrency-literature.md lines 95 to 97) and gave one range, 19.8 to 41.7 %, and '21.1 % faster' without the mean. Cross-agent pairs are 0.50 % of co-active pairs, mostly with Codex.","handles":["agents","parallel agents","conflict rate","pair rate","CRDT","speed-up"],"supersedes":["r57-0308"],"date":"2026-11-19","by":"r57"}
```

### 3. w1-0511, proposed correction of r57-0406 (the per-file switch)

- **Target** (`library/journal/2026-11-18/r57b.jsonl:12`): "Untested: how several writers share one file is the one
  real switch in the rule, decided per file: places known beforehand to conflict (7 ordered sequences and 4 places
  where the same statements change, of our 20 shared places) get one owner at a time or are split first into separate
  entries, and the 9 separate entries get own copies merged later; while work runs, a file moves to one owner when
  the chance of a conflict times the cost of redoing a unit exceeds the cost of waiting for the owner, with cost
  counted in whatever is scarce now (tokens and check time for redoing, clock time for waiting), and moves back only
  after a set number of quiet units and only between units; every merge passes the check."
- **The lane says instead:** the switch becomes the last rungs of a ranked architecture (w1-0400 to w1-0406). "The
  one measurement on model sessions" put isolated worktrees below one agent and version-checked writes above both
  (STORM, preprint, one run per arm). Where writes are checked as they are made, the redo cost in the threshold is the
  cost of re-applying a write, not of redoing the unit.
- **Evidence checked:**
  - `sed -n 122,140p DECISION-RULE.md`: the switch and its threshold stand at 122-138 (the r57-0304 reference runs to
    138, one line past the cited 122-137).
  - `R:papers/w1/storm/paper.txt` lines 76-78: "82.5% macro pass rate and 46.2% weighted pass rate, outperforming
    single-agent (66.4% / 20.7%) and GitWorktree (63.8% / 24.6%)". The rejection payload, "re-plan from the current
    baseline", is at 180-183. Line 260 gives "three LLMs". Stands. On the weighted score, however, worktrees (24.6) are
    above one agent (20.7).
  - `R:papers/w1/caid/paper.txt` line 326 (the table row the lane cites as 324): "53.1 692.6 1.9 59.1 1583.2 8.1",
    which is single agent against CAID's worktrees with 4 engineers. Worktrees are above one agent here.
  - STORM reports no repeated runs (`R:w1-refute.md` W62, "grep for runs/seed/confidence finds none"). "One run per
    arm" is the lane's reading of that silence, not the paper's words.
  - `R:w1-report.md` lines 123-135: "The two-way switch survives as the last rungs: one owner of a hot pair (part 4)
    or of a hot file." Stands.
- **Recommendation: right in part.** The ranking and the redo-cost point follow from the lane's records. The re-apply
  cost is STORM's design; no token figure was measured (M2). The measurement sentence is wrong as written: CAID
  (w1-0356, Sonnet 4.5) put worktrees above one agent, 59.1 against 53.1 %, and STORM's worktrees were below one agent
  only on macro pass rate.
- **Also rests on the target:** `DECISION-RULE.md` lines 34-36 (answer 5), 116 (the Step 2 row) and 122-138, which the
  lane lists as not records (`R:w1-report.md` line 372); b1-0417 (a modes table per file: own copies or one owner);
  `library/INDEX.md` lines 12 and 118.
- **Replacement record:**

```json
{"id":"r57-0410","kind":"hypothesis","status":"reasoned","claim":"Untested: several writers on one file are handled by a ranked architecture, not by one per-file switch between own copies and one owner: reshape shared places so writes commute or land at integration (the 7 ordered sequences and 4 places where the same statements change, of our 20 shared places, are split first into separate entries or steps; the 9 separate entries land at integration); then version-checked writes, which land only if what the unit read is unchanged; claims below the file at the grain a unit touches; one owner of a known hot pair or hot file when the chance of a conflict times the redo cost exceeds the cost of the wait, in whatever is scarce now; checkpoints smaller than the unit; every landing through the serial check; structured merge last; the redo cost is, by STORM's design, re-planning one refused write from a diff where writes are checked as they are made, and redoing the unit where own copies are merged at the end; no threshold or rank is computed yet (M1 to M9).","when":"Before letting two helpers or sessions change the same file, and before choosing between waiting and redoing.","evidence":["docs/program/evidence/round3-2026-11-18/w1-report.md#6. Point (d): the architecture that replaces the two-way switch, ranked by expected gain","docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md#lines 122-138","docs/program/evidence/round3-2026-11-18/papers/w1/storm/paper.txt#lines 76-78, 175-186","docs/program/evidence/round3-2026-11-18/papers/w1/caid/paper.txt#lines 324-326"],"see":["r57-0406","r57-0128","r57-0401","w1-0400","w1-0401","w1-0402","w1-0403","w1-0404","w1-0405","w1-0406","w1-0353","w1-0356","w1-0511"],"note":"Two preprints on model sessions, no repeated runs reported: STORM's version-checked writes 82.5 % macro pass rate against 66.4 % one agent and 63.8 % worktrees, weighted 46.2, 20.7, 24.6 % (w1-0353); CAID's worktrees 59.1 % against 53.1 % one agent (w1-0356). Re-planning tokens are not measured (M2). DECISION-RULE.md lines 34-36, 116 and 122-138 still state the old switch.","handles":["several writers","one file","switch","one owner","own copies","version check","redo cost","threshold","conflict"],"footprint":["docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md"],"supersedes":["r57-0406"],"date":"2026-11-19","by":"r57"}
```

### 4. w1-0512, proposed correction of r57-0301 (Agrawal, Carey and Livny)

- **Target** (`r57.jsonl:49`): "Agrawal, Carey and Livny 1987 (a simulation with 1 to 50 resource units): locking
  wins when resources are scarce and optimistic control when they are plentiful, with the crossover between 10 and 25
  resource units; no paper read gives one conflict rate where they cross, and other papers (Yu, Harding) find
  optimistic control better under skew."
- **The lane says instead:** restart-oriented and optimistic control won only when use was low enough to tolerate
  wasted work and, in addition, a large number of transactions were available to execute. The authors call it an
  open question whether such low use occurs in real systems.
- **Evidence checked:** `sed -n 139,149p E:concurrency-lit-1-databases.md`: "and in addition there are a large number
  of transactions available to execute" at 143; "It is an open question whether or not such low utilizations will
  ever actually occur in real systems" at 147; think times of 1, 5 and 10 s at 145; the crossover between 10 and 25
  units at 144. Stands. x15-0300 already holds the condition.
- **Recommendation: right.** The quote has two conditions joined by "in addition", and r57-0301 kept only the first.
  With 3 to 16 sessions the second is not obviously met (`R:w1-refute.md` W34). The Yu and Harding part stands (B6,
  lines 203-204).
- **Also rests on the target:** `DECISION-RULE.md` line 134 ("This applies r57-0301"); `library/INDEX.md` line 104.
- **Replacement record:**

```json
{"id":"r57-0312","kind":"result","status":"quoted","claim":"Agrawal, Carey and Livny 1987 (a simulation of one database with 1 to 50 resource units): blocking beat immediate restart and optimistic control at medium to high resource use; optimistic control won only when use was low enough to tolerate much wasted work and, in addition, a large number of transactions were available to execute (many resource units, or interactive think times of 1, 5 or 10 s), with the crossover between 10 and 25 resource units, and the authors call it an open question whether such low use occurs in real systems; no paper read gives one conflict rate where they cross, and other papers (Yu, Harding) find optimistic control better under skew.","evidence":["E:concurrency-lit-1-databases.md#lines 143-147","E:concurrency-lit-1-databases.md#B6"],"see":["r57-0301","x15-0300","w1-0329","w1-0512"],"note":"Only sentences of the papers were read; the throughput charts are images. With 3 to 16 sessions the second condition is not obviously met (docs/program/evidence/round3-2026-11-18/w1-refute.md, W34); DECISION-RULE.md line 134 applies r57-0301 without it.","handles":["optimistic","locking","concurrency control","Agrawal","resources","crossover","multiprogramming"],"supersedes":["r57-0301"],"date":"2026-11-19","by":"r57"}
```

### 5. t1-0507, proposed correction of x03-0335 (Bw-tree failures)

- **Target** (`library/journal/2026-11-18/x03.jsonl:47`): "Bw-tree 2013 Table I: split and consolidate failures are
  about 1.25% on Xbox and dedup and 8.88% on synthetic."
- **The lane says instead:** Table I gives failed splits of 0.25 % (dedup), 1.27 % (Xbox) and 8.88 % (synthetic), and
  failed consolidates of 1.19 %, 0.22 % and 7.35 %. The "about 1.25 %" is the text's rounded figure.
- **Evidence checked:** `grep -n` in `R:papers/tree/bwtree2013/paper.txt`: "Dedup Xbox Synthetic" at 282, "Failed
  Splits 0.25% 1.27% 8.88%" at 284, "Failed Consolidates 1.19% 0.22% 7.35%" at 286, "TABLE I LATCH-FREE DELTA UPDATE
  FAILURES" at 290, and "around 1.25% for both the Xbox and deduplication workloads" at 354. Stands. The target's
  source, `sed -n 71p E:concurrency-lit-2-memory.md`, itself credits the text's figure to "line 354, Table I", so x03
  copied that error faithfully. `R:t1-report.md` lines 202-204 stand.
- **Recommendation: right.** The text's 1.25 % matches neither dedup splits (0.25) nor Xbox consolidates (0.22).
  Column labels come from a text extraction (`R:t1-claims.md` keeps C25 under proven). t1-0306 already holds the
  figures.
- **Replacement record:**

```json
{"id":"r57-0313","kind":"result","status":"quoted","claim":"Bw-tree 2013, Table I (latch-free delta update failures): failed splits 0.25 % dedup, 1.27 % Xbox, 8.88 % synthetic; failed consolidates 1.19 %, 0.22 %, 7.35 %; failed record updates 0.0013 %, 0.0171 %, 0.0003 % (below 0.02 %); the text's 'around 1.25 % for both the Xbox and deduplication workloads' is a rounded figure that matches neither dedup splits nor Xbox consolidates.","evidence":["docs/program/evidence/round3-2026-11-18/papers/tree/bwtree2013/paper.txt#lines 280-290","docs/program/evidence/round3-2026-11-18/papers/tree/bwtree2013/paper.txt#line 354"],"see":["x03-0335","t1-0306","t1-0507"],"note":"Column labels as the text extraction gives them (line 282: Dedup Xbox Synthetic). x03-0335 took the text's figure as Table I's from E:concurrency-lit-2-memory.md line 71, which does the same.","handles":["Bw-tree","failed splits","failed consolidates","Table I","latch-free"],"supersedes":["x03-0335"],"date":"2026-11-19","by":"r57"}
```

### 6. t1-0508, proposed correction of x21-0318 (error amplification, hierarchy against chain)

- **Target** (`library/journal/2026-11-18/x21.jsonl:69`): "Centralized check trace-level error amplification is 4.4
  against 17.2 for independent agents; a hierarchy scores -5.51 against -23.72 for a chain."
- **The lane says instead:** 4.4 against 17.2 is the trace-level error amplification of one orchestrator over three
  agents against three independent agents, and after controls error amplification is not a significant predictor.
  -5.51 against -23.72 compares different systems of depth one (a judge over two debaters, and AgentVerse's four
  agents) with linear ones; it is not a test of depth.
- **Evidence checked:**
  - `R:papers/tree/kim-scaling/paper.txt`: the table header at 1150, "Error Amp 1.0 17.2 7.8 4.4 5.1" at 1159 and
    "Success/1K tokens" at 1162. Stands within the cited 1153-1166. "After controlling for other coordination metrics,
    neither the main effect of error amplification ... nor its interaction ... reaches statistical significance" is at
    975-980, outside the lines the proposal cites. Its sibling t1-0330 cites them. "3 sub-agents with 1 orchestrator
    across maximum 5 orchestration rounds" is at 2227-2228.
  - `R:papers/tree/huang-faulty/paper.txt`: "lower resilience (-10.54) than the hierarchical structure (-5.51)" at 295-296,
    "est resilience (-23.72)" at 297, "two debaters and one judge" at 299, and AgentVerse "using four agents" at 303.
    Stands. Linear systems (MetaGPT, Self-collaboration) are at 286-290.
  - The target's source, `sed -n 37p research-tree/ATTACK-AND-COST-RECORD.md`, gives both figures with no conditions.
    It stands as x21 copied it. `R:t1-report.md` lines 205-208 stand.
- **Recommendation: right.** Both figures are as the papers give them, and each needs its conditions. Two fixes go
  into the replacement: cite Kim 974-980 for the non-significance, and say "depth one" for MAD only. AgentVerse's depth
  is not stated (it has a planner, a solver and critics, Huang 955-960). The ATTACK-AND-COST-RECORD line 37 verdict, "the
  tree as a plain hierarchy earns its place", rests on these figures.
- **Replacement record:**

```json
{"id":"r57-0314","kind":"result","status":"quoted","claim":"Read in the papers: Kim and others (agent architecture scaling study) give trace-level error amplification 4.4 for a centralised system (one orchestrator over three sub-agents, at most 5 rounds) against 17.2 for three independent agents and 1.0 for one agent, and after controls for other coordination metrics error amplification is not a significant predictor (beta 0.014, p 0.658); Huang and others give drops under one faulty agent of -5.51 for hierarchical systems (MAD, a judge over two debaters; AgentVerse, four agents) against -10.54 for flat and -23.72 for linear ones (chains), different systems averaged over tasks, so neither figure is a test of tree depth.","evidence":["docs/program/evidence/round3-2026-11-18/papers/tree/kim-scaling/paper.txt#lines 1150-1162","docs/program/evidence/round3-2026-11-18/papers/tree/kim-scaling/paper.txt#lines 974-980","docs/program/evidence/round3-2026-11-18/papers/tree/kim-scaling/paper.txt#lines 2227-2229","docs/program/evidence/round3-2026-11-18/papers/tree/huang-faulty/paper.txt#lines 286-303"],"see":["x21-0318","t1-0330","t1-0332","t1-0508"],"note":"x21-0318 copied both figures from research-tree/ATTACK-AND-COST-RECORD.md line 37 without conditions; that line's verdict that the tree as a plain hierarchy earns its place rests on them. Depth one holds for MAD; AgentVerse's depth is not stated in the lines read (a planner, a solver and critics, huang-faulty lines 955-960).","handles":["error amplification","hierarchy","faulty agent","depth test","Kim scaling","Huang"],"supersedes":["x21-0318"],"date":"2026-11-19","by":"r57"}
```

### 7. t1-0509, proposed correction of x21-0470 (root fan-out of 246 rows)

- **Target** (`x21.jsonl:142`): "No inner level of the tree is needed for 7-10 fields, since root fan-out capacity is
  246 rows of about 200 tokens between P plus S and W*."
- **The lane says instead:** that room is g·k*, the coordinator's own window growth over one epoch. Child summaries
  share it with the coordinator's own calls, so the bound counts it twice, and a bound for sessions needs s_summary
  and the share of g. Its note: "the correction is to the reason, not the conclusion".
- **Evidence checked:** `grep -n` in `research-tree/tcb/cost.mjs`: "const rowTok = 200; // G: tokens per status row"
  at 271; "fanoutRows: Math.floor((Wc - pc.P - pc.S) / rowTok)" at 277; `Wc = pc.P + pc.S + pc.g * kc` at 265; the
  printed "no inner level is ever needed for 7-10 fields" at 401-402. `sed -n 473p
  docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`: "W* = P + S + √(2H0·g)". So the room is √(2H0·g) = g·k*.
  The figure 246 stands at `research-tree/ATTACK-AND-COST-RECORD.md` line 132 (H0 = 432.4k, k* = 17.6, W* = 133.2k, so
  g·k* is about 49,000 tokens). `R:t1-report.md` lines 209-211 and `R:t1-refute.md` C83 stand.
- **Recommendation: right.** The room is by construction the coordinator's own growth. The note's "either way" holds
  only while a summary is a short row. The 200 tokens is a guess (G), and at about 4,900 tokens a summary, 10 fields
  would fill the whole room. The replacement states that condition.
- **Replacement record:**

```json
{"id":"r57-0411","kind":"hypothesis","status":"reasoned","claim":"No inner level of the tree is needed for 7-10 fields on window room alone, if a child's summary is a short status row: 7-10 rows of about 200 tokens (a guess) take about 1,400 to 2,000 tokens of the room between P plus S and the coordinator's W*, which by the hand-over law is g·k* (about 49,000 tokens on cost.mjs's inputs), the coordinator's own window growth over one epoch that summaries share with its own calls; cost.mjs's 246 rows count that whole room as rows and so overstate the root's fan-out, and at summaries of about 4,900 tokens or more 10 fields would fill all of it; a bound needs s_summary and the share of g that summaries take, neither measured.","evidence":["research-tree/tcb/cost.mjs#lines 265-277","research-tree/tcb/cost.mjs#lines 401-402","docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md#line 473","research-tree/ATTACK-AND-COST-RECORD.md#line 132"],"see":["x21-0470","t1-0120","t1-0504","t1-0509"],"note":"The 49,000 is 246 rows of 200 tokens; cost.mjs tags the 200 a guess (G). Whether an inner level pays for other reasons (how much it compresses, how many children run at once) is the open measurement t1-0504.","handles":["no inner level","7-10 fields","root fan-out","cost.mjs","s_summary"],"footprint":["research-tree/tcb/cost.mjs","research-tree/ATTACK-AND-COST-RECORD.md"],"supersedes":["x21-0470"],"date":"2026-11-19","by":"r57"}
```

## Open tasks (17)

w1 (M1 to M9 of `R:w1-report.md` section 6; "run" needs the owner's word, CLAUDE.md rule 3):

- w1-0500, M1, a count: regions per unit (k) and per file (F), units per region, and each unit's share of its diff on hot places and when it was written, from past units' change lists and diffs.
- w1-0501, M2, a count: tokens of a redone unit, of re-applying a refused write from a diff and of the steps since a checkpoint, from kept transcripts; and whether each past conflict's item was read before the last checkpoint.
- w1-0502, M3, a run: clock time a unit waits for the owner of a file or region.
- w1-0503, M4, a run: conflicts of model-session edits on our own neighbouring lines, and the share that are reorders or renames.
- w1-0504, M5, a run: the share of clean merges of two model-session units, and of entries applied at landing, that fail the tests.
- w1-0505, M6, a count: the share of units whose change list crosses the places of two owners.
- w1-0506, M7, a run: whether a PreToolUse refusal stops the Edit tool, whether a hook can check a file's version before a write, and what a hook sees of reads.
- w1-0507, M8, a count by replay: replay recorded units against share thresholds for escalation and against resource-ordered claims or wait-die, counting waits, conflicts and aborts.
- w1-0508, M9, a count: minutes per unit and their spread, and landings asked per hour, against the serial check's capacity from lane c1.

t1:

- t1-0500: from coordinator transcripts on disk, a parent's tokens per wake split into the fixed re-read and each child's s_summary, and how many wakes could have waited.
- t1-0501: R, realised over estimated work per leaf, from the pilot's predicted-against-realised log (R48(a)), per class of question.
- t1-0502: a tree session's start cost (P and S0, now guesses of 60,000 and 10,000 tokens) and its time, on a tree run.
- t1-0503: new keys per leaf lifetime, and whether a field works its keys in key order, on the pilot and later runs.
- t1-0504: before any inner level is added, how much an inner session compresses (tokens out over tokens read) and the share of its children that run at once.
- t1-0505: a parent's read share (state reads against child reports); it sets the merge policy of inner summaries.
- t1-0506: repeated or overlapping questions per leaf and session restarts per hour, once tree runs exist.
- t1-0510: a research child's reloaded state S and its growth per epoch under option (b), against g·k*; it decides between hand-over and split (R49).

## Corrections the lanes named that are not records (no adjudication; for the board)

- `R:w1-report.md` line 372: the rule's Step 2 row (DECISION-RULE.md line 116), answer 5 (lines 34-36) and lines 124-137
  follow r57-0406 and change with it. The lane file's sub-topic 7 wording on Discord is wrong (W82 in part).
- `R:t1-report.md` lines 196-201: a lane sentence says the owner rejected removing the split. No library record
  says so, and the report notes "The lane sentence is not a record".
