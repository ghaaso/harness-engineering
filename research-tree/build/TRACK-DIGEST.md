# What the research says for the owner's track: the digest behind the plan (top session 9, 2026-11-24)

Written by the digest helper (analyse, Opus) from the ten reader digests `research-tree/build/top9/out/R1-tree-design.md` to
`R10-tree-rest.md`, with the figures a plan would rest on checked in their original files (section 8). Every line names the
original file and place, as the reader carried it; where I checked a place myself it says "checked". This file does not plan.

Short names. `RUN:` = `C:/research-runs/2026-11-harness-leads/`. `HB:n` = `RUN:closing/HAND-BACK.md` line n; `SYN:n` =
`RUN:closing/SYNTHESIS.md` line n; `W2:n` / `W2R:n` = `RUN:closing/wave2/SYNTHESIS-wave2.md` / `-refute.md` line n; `f2a`..`f8`
= `RUN:fields/<part>/f<part>-report.md`. `P2` = `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`. `GT` =
`docs/program/GRAPH-TEST-RESULT-2026-11.md`; `EC` = `docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md`;
`GV` = `docs/program/GRAPH-V2-DESIGN-2026-11.md`; `JH` = `research-tree/build/JUDGE-HANDBACK.md`; `JR` =
`research-tree/build/replays/JUDGE-REPLAYS.md`; `PILOT` = `research-tree/build/PILOT-PLAN.md`; `STATE` = `research-tree/build/STATE.md`
(MAIN copy); `R3:` = `docs/program/evidence/round3-2026-11-18/`. Records `r57-…` are read with `bash library/lookup.sh -f <id>`.

Marks (r57-0010, never upgraded): **[quoted]** a published source as our file quotes it (proven elsewhere, not here);
**[measured]** / **[observed]** measured or seen here; **[hypothesis]** reasoned, computed from guesses, or untested.

## 0. The frame: the owner's words that bind this plan

- His track: graphs, embeddings, training, the B-tree system (the research tree), enforcing it and its invariants; the token-saving
  library and token optimisation are his teammate's for now; `library/` is "the record book" to him (r57-0057, owner ruling,
  2026-11-24). Token-saving leads appear below in one line each, only where they touch his track.
- Token work only if it pays in the short term within his weekly allowance; otherwise the tree and graph track (r57-0058).
- All recorded research is read before the plan (r57-0059); top session 9 does the token step, reads, plans; the plan is shown
  before anything runs (r57-0060).
- Earlier rulings still in force that shape every choice: the run widened to graphs and knowledge graphs widest, encoders and memory
  wider; "not limited to 12 GB (24 GB through his university, after the 12 GB results)"; the tree is for quality and fewer
  hallucinations, the library, graph and router for tokens (r57-0047, owner). Whether and when the 24 GB card can be used is not
  known (r57-0189, owner fact, 2026-11-23). No install, download, training or experiment without his word, named with source and
  size, in containers with the network off (CLAUDE.md rule 3); design questions are not put to him (rule 7).
- Not a choice but a fact of the record: no step of his track has been run as an agent test on our repositories. "none measures our
  seven measures on our harness" (f2a, f2c, f2d headers, via R8 s3); GT item 7 "No agent was run"; EC s7 no agent, no tokens.

## 1. The B-tree system (the research tree)

### 1a. Where it stands
- Built on branch `build` through slice 2 and the FX-W6 fix: the 13 fixes and 0b, suite 6 1,037 pass, 0 fail, 51 skipped; end-to-end
  239/239; "nothing merged, pushed or run for real" (r57-0172 [observed]; STATE "NOW", via R2 s1) [measured].
- Readers disagree only by date: `research-tree/START-HERE.md` (dated 2026-11-18) says "Thirteen fix designs. None built" (R1 s3a);
  STATE and r57-0172 (2026-11-20) say built. The later record holds. Likewise R1 s3c's "the model does not model four fixes as built"
  (P2 s16 point 2) is superseded by S2.2, which brought the model to the code as built, except FX-W3 and FX-W7 (STATE slice 2, via R2 s3).
- Model check of the built design: 28 runs, 25 complete, 3 bounded; NoDeadlock and AlwaysCanResolve hold in every part; one fault sent
  back (the age cap re-armed on a bare acknowledgement, so the dead-man never reached the owner), fixed in FX-W6; the ablation AGE-REARM
  fails, so the check is not vacuous (STATE slice 2 and "NOW"; `research-tree/build/model/results-build/VERDICT.md` first line, via R2)
  [measured, for the model, not a run of the tree]. Not modelled: FX-W3, FX-W7; the owner is a premise; smallest forms only (R2 s3).
- Earlier idealised model run (groups 1-5): 59 configurations, 3.43 billion states, 53,447 cpu-seconds, about 2 h 15 min; with the six
  fixes all 14 properties hold at the sizes run; the full 77-configuration matrix was estimated at about 21 days, peak about 8,300 MB,
  and not run on the owner's decision (P2 s16 points 1, 11, via R1 s1c, s4) [measured].
- What the build's checks showed: blind review found breaks the builders' tests missed (W5, W3, S2.1 BREAKING; a combined review 56
  mutations, 49 caught) (STATE, via R2 s2) [measured]. "This says the build's checks catch faults; it does not say the tree is right
  when run" (R2 s2).

### 1b. What the research says the tree is for, and its shape
- Splitting one coding task among agents loses: every multi-agent form 2.1-14.9 % below one agent at matched tokens on SWE-bench
  Verified (f7 C02, independent; via R10 s1.2, R6 s2) [quoted]. Where structure pays on code it pays through a check or selection
  (f7 L1, L2; C07, C21) [quoted]; the owner's framing "the tree is for quality, not tokens" is confirmed against sources (f7 C76) [quoted].
- Depth: no source tests depth at equal work on code (f7 C71); "depth beyond one layer gained nothing" refuted (f7 C82); the build's one
  level is "a default, not a law" (f7 N3) (R10 s2.1). No controlled sweep of depth against fan-out with tokens per level exists
  (`R3:t1-report.md` "Not found", via R3 s6) [observed: not found].
- Shape by case (`R3:t1-report.md` "The answer" 1-4): a small job known up front keeps the bulk-loaded two-level tree, nothing splits
  or merges while work runs; a growing job adds a B-link split of unstarted keys only; a very large job adds coordinator epochs or an
  inner level, whichever costs fewer tokens [hypothesis on quoted database results]. Case (a) changes none of the 13 fixes; (b) and
  (c) extend the same files after them (t1 s3, C14) [hypothesis; the grep is observed].
- Ranked by the cost each part acts on: 1 fewer parent wakes (largest expected gain, unmeasured); 2 plan-time packing with f from R;
  3 split of unstarted keys; 4 epochs or an inner level priced in tokens; 5 one bounded summary per child; 6 copy-on-write, one writer
  (exists); 7 duplicate-drop and bounded restarts only when observed (t1 "The architecture proposed") [hypothesis].
- Not to be proposed again (refuted in t1): merge once at the top (C51); a minimum work per session from the page law (C59);
  FoundationDB's window as a reason to split (t1 C114) (`R3:t1-report.md` line 27, 39, 58, checked) [observed: refuter verdicts].
- An inner level is not ruled out: Dremel and RAO keep it alive (RAO 196K against 1,029K tokens at 83.9 % concurrent delegations,
  18x slower at 1.6 %, trained agents), MacNet and self-formed depth point the other way (t1 C70, C73, C76, C77) [quoted]. Here a helper
  orchestrator was ruled out for the build only: polls of 1.5-3.5 M against 0.42 M saved; probe 21 polls, 1.30 M in 6.4 min
  (`research-tree/ORCHESTRATION.md` s13 rows 1-2; f7 L3 C66-C67) [measured probe, computed total]; "no helper orchestrator has yet
  run a real batch here" (`research-tree/build/COMPLEXITY.md` s5, s6).
- Split against hand-over is open in the record itself: D2-01/D2-02 split by question range at plan time; D3-12 never splits a field
  mid-research; D3-01 splits remaining work near the window's limit (`research-tree/FAULTS-AND-FIXES.md` "Two things in the record to
  respect"; t1 s3, C12; DECISION-RULE-v2 Q30). R49 leaves it to measurement [hypothesis]. No source tests a split at a window share,
  the owner's 40 % (f7 "The owner's ideas"; C84 abstract only) [observed: not found].

### 1c. The pilot (slice 3): what, cost, duration, preconditions
- What it is: one field as one frozen leaf. Comparison 1: the tree against one session S1 (optional S2), McNemar, blinded scoring,
  "descriptive, n = 1 per arm"; it "can show a difference above |S1 - S2|, a gross failure and real costs; not equality, nor other
  fields". Comparison 2: same-window review (R_same) against fresh (R1) and spread (R2), with k planted wrong assumptions scored as
  found with the right reason. Fault-injection probes (kill a child, sleep once, forced hand-over, stale-epoch write, a loop, one lost
  wake). It also measures the unmeasured parameters (P2 s10-11, via R1 s5) [design]. "The one pilot field is chosen, not drawn, so
  nothing it shows generalises" (P2 s13).
- Why it matters for his goal: nothing about the tree's quality has been run; whether same-window review beats fresh review is not
  tested and "no source compares the two here" (P2 s12 F1, s11; f7 "Not found") (R1 s2c; R10 s2.1).
- Tokens: expected 417.8 M (preparation 179.3, pilot 238.5; Fable 94), cap 593 M (every node at its Q3) (PILOT lines 20, 62, 67,
  checked) [computed from measured roles: r57-0173 medians; one build's three roots; research sessions of 2026-11-18/19]. The fix
  round FX-PILOT (three units) is 142.7 M (99.5-171.8) of it (PILOT line 41, checked). admit.mjs B_tokens 172 M, r_tokens 15.3 M
  (PILOT line 75). At the build's overrun (2.3x) it "would need 961 M", not applied (PILOT lines 94-97, checked).
- Duration: preparation 3-4 h; pilot 8.5-13.8 h of sessions plus drains; 37-58 turns he types (PILOT lines 24, 103-105, checked).
  Correction: r57-0174 [measured] says the 8.5-13.8 h counted a 4.3 h PC-restart stop as work; without it one field's reading and
  checking took 1.2-1.8 h.
- Preconditions as recorded (PILOT s6 and line 232-235; P2 s10 "Before the go"; via R1 s5, R2 s5):
  - approve: the preparation (P3.1 a stop test, P3.2 P2 s10's list counted against `tcb/`, run root outside every repository, pilot
    inputs, the FX-PILOT fix round: children's models and the tier hook, the scorer's agent file, the S1/S2 role with `W_quality`
    300 to 280 K and `attempt_max_ticks` 240 to 630) and cap: 593 M.
  - later approve: the field, question list, approach ids, protocol, analysis plan with the predicted total over every arm (R53).
  - owner acts: apply the user-level deny rules; import the dead-man task (`tcb/settings/deadman-task.xml`, never imported, PILOT s4);
    the go itself is an experiment on this PC with the network on, outside a container, an exception to rule 3; page snapshots about
    60 MB a field (PILOT line 235). F5 (the fetch script and snapshots): without it "every card is unverifiable ... and the pilot only
    measures" (P2 s12).
  - app facts to check before the pilot, cut to three by the owner's testing ruling: the guard hook fires for helpers; a stop ends a
    session with its helpers; a background command's exit wakes the coordinator (P2 s16 point 12, via R1 s3b) [observed once or
    believed]. The app's session id against the CLI id is unmapped, so every close ends with the owner's relayed `closed` (STATE line
    466, 553, checked) [observed].
- Facts that move the plan's numbers, found after the plan was written:
  - PILOT's schedule rests on the reset of 2026-11-23 12:00 UTC (line 232), which has passed; the research run used that week instead
    (JH s5) [observed].
  - The plan prices points at about 62 M a point, counting every token equally; r57-0175 [measured] says the meter follows fresh tokens
    (a cached re-read about 1 % of an Opus fresh token; Fable 2.7-5.6 of Opus per fresh token) and that equal counting "fits worst";
    it also says 107 M of Fable tokens were counted twice in r57-0170's basis, on which the build's 907.7 M and the plan rest.
  - No fixed overrun factor holds: the research run came in at 0.53x its expected tokens against the build's 2.3x (r57-0188 [measured]).
  - Lean helper definitions now exist: a helper's first call 57,133 to 13,564 tokens, n = 1, Sonnet
    (`research-tree/build/top9/out/STEP1-SUMMARY.md`) [measured, n = 1]; the role costs of r57-0173 and r57-0188 predate it.
- An earlier mistake to keep in view: the pilot page asked for approval without saying what the pilot is for, how it serves his goal,
  or that its diagram showed the test around one leaf rather than his B+ tree; he asked whether it is over-engineered (r57-0613
  [observed]). Its complexity analysis followed (r57-0420).
- The record's lighter alternative if the build is judged too big: a pilot on stages 0 and 1 only, every card labelled unverified
  (P2 s15 item 6). A single-session run of one field "can only rule that form out, never in" (COMPLEXITY s5, via R2 s2).

### 1d. Merging branch `build`
- State (checked by git today) [observed]: `build` = fa8d28c1; 211 commits on `build` not on `main`; merge base 48660877, which is also
  `main`'s head (0 commits on `main` not on `build`); `git diff --shortstat main...build`: 8,625 files, 1,401,108 insertions, 50
  deletions. New here: the working branch (`transfer/2026-11-16-embeddings-final-and-setup`) has 22 commits not on `build` (top
  sessions 5-8, among them 92b49ab3), and `build` has 111 not on it; so the merge meets two diverged lines, not one.
- The record: r57-0520 [open] "merge `build` (his approve:; first remove the identical untracked copies: 620 at the close-out, 627 with
  the pilot's plan)" (`library/INDEX.md` line 154, checked). PILOT s1: the merge "is not needed before the pilot: the commit stays
  reachable on `build`, and fsck checks the pinned copy against the named commit" (via R2 s3).
- Seen, not changed: 1,063 of 4,042 tracked files under `docs/program/evidence/` are in no manifest, so no hook protects them
  (ORCHESTRATION s13 row 9, via R2 s3) [observed]. Reviewing a merge of this size is itself sizeable (R2 s3) [hypothesis].

### 1e. Open faults (none breaks a unit)
- r57-0521: test gaps with code right (survivors per unit in `research-tree/build/refute/*.md`: W2 21, PLAN 30, W3 9, others); words;
  CLAIM's millisecond window (reachable only under reading (ii) of the lease). Plan: one round after the pilot (PILOT s4) (STATE "End
  list", via R2 s3).
- r57-0522: the brief line "answer the child" is an act the guard hook refuses; the coordinator cannot read the child's transcripts,
  so "unless it is making progress" has nothing to go on; no "continue" act re-arms the age cap. To be measured in the pilot (R2 s3).
- Flaky test: stop.test "FX-CLOSE T1" (c) reads the real process list; fails under load, passes alone; fix named: own ids per test
  file or a fake process list (ORCH s13 row 6, via R2 s3) [observed].
- Dead-man toasts: long coordinator turns (89 over 60 min, `research-tree/build/facts/Wturn-2.md`) will raise false toasts (PILOT s4).
- r57-0518 [open]: the hooks review's non-breaking items: merges and `commit -n` unchecked, manifests unprotected, no hook timeouts,
  lane races, the lane clamp untested, a done unit run twice (`library/INDEX.md` line 162, checked).
- Not recorded: whether a refused start leaves `start.json`; the lease's two delays; PostToolUseFailure's error shape (STATE, via R2 s3).
- Model coverage gaps: FX-W3, FX-W7 not modelled; lease reading (ii) bounded; 3 fields with 3-4 faults, two faults of a kind and
  A-FENCE-CE at 2-3 faults never run (P2 s16 point 11 "Not shown", via R1 s2c; R2 s3).
- Weak properties named by the fidelity review: RestartLimit vacuous, TwoCoordinatorsAct restates the fence, AtMostOneCommit's
  mechanism never exercised, Slots weaker than R10 (FAULTS-AND-FIXES; P2 s16, via R1 s3a). Whether the build strengthened them is not
  in the digests.

### 1f. The design points P2 s12 lists as "the owner's decisions"
- P2 s12 (checked, lines 748-798) lists, each with a silent default: the go; F1 where the review runs (silent: amendment 1, same
  window); F2 a second expert (silent: none); the research child's window (silent: one session to 300k, "the coordinator's, not his");
  F3 another provider's model (silent: none); F4 cap and allowance (silent: nothing admitted); F5 fetch script and snapshots; restart
  limit (silent: one); coordinator hand-over (silent: drain, W* 133.2k); keeping the PC awake (silent: sleeps accepted); memory reserve
  N_max (silent: two children); thresholds (d0 = 0.8, beta = 0.05); approvals; hook-test fallback; S2 and the hand-over measure.
- The section was written before CLAUDE.md rule 7 (added 2026-11-18) and rule 7 overrides it (R10 s3). `research-tree/START-HERE.md`
  line 40 (checked) says the rejected 29-question sheet "is still a complete list of the open branches: treat each as something to
  derive or to measure". So F1, F2, the window, restart limit, hand-over point, N_max, thresholds, S2 and the hand-over measure are
  derived or measured (F1 is what Comparison 2 measures; P2 s12 F2 names the D6-10 crossed design as the measurement at about one
  more research run [hypothesis]). What stays with him under rules 3 and 5 is not a design choice: the go, the cap, installs and
  downloads (F5's fetch script, PDF text extraction), the rule-3 exception, and any outside model (F3 sends project text to another
  provider, which rule 4 bears on).
- The same for the build's six rulings left with him (P2 s16 point 9 table: U3-F8, U2-F2, U5-PF-1, LR-4, coordinator session tools,
  M6 library half) (R1 s3c): design points, derived or measured under rule 7. Whether the build settled them is not in the digests.
- N_max: P2 and DESIGN-RECORD still carry 2 to 3; CLAUDE.md says "three at most" is withdrawn (r57-0032) and the number is computed by
  the decision rule (r57-0414, untested hypothesis) (R1 s4). The app allows 20 helpers at once, helpers of helpers counted
  (`library/INDEX.md` line 152, [observed]).

## 2. The graph and knowledge-graph tests

### 2a. What was tested, on which repository, with what result
- Graph test, FixFlow product repository only (June to August 2026 commits): given one changed file, which tool shows the other changed
  files and definitions within 8,000 tokens; settings tuned on 65 commits, held-out 75 commits, 418 tasks, run once (GT "What was
  tested", via R4 s1a) [measured].
  - Held-out recall at 8,000 tokens: typed store 0.700 (SQLite, LadybugDB, DuckDB identical), scripted search 0.625, changed-together
    floor 0.638, same-folder floor 0.549 (GT table lines 25-30, checked) [measured].
  - Typed minus scripted search +0.076 [+0.036, +0.118] "better"; but mobile-app seeds +0.151, outside the mobile app +0.024 [-0.023,
    +0.075]; against the changed-together floor outside mobile +0.001 (GT item 3, line 15, checked) [measured]. 48 % of the search
    arm's credited recall came from its changed-together padding (same line).
  - Engines identical on 770 of 770 tasks; community prior +0.015 [-0.010, +0.042]; hop depth moved the score most (0.346); engine
    speed does not enter the token bill (GT items 1, 2, 4, 6) [measured].
  - Code-reading questions: F1 +0.100 [-0.060, +0.257], inconclusive (GT item 5) [measured].
- The popular tool itself as an arm: graphify 0.9.108, code layer only, container, network off, no model, no agent, same 75 commits:
  recall 0.564 against typed 0.700 (-0.137 [-0.188, -0.088], typed better); against scripted search and the floors inconclusive;
  backend seeds -0.227, mobile -0.019 (GT section M line 98, checked) [measured]. Not run: its model-read document layer; no agent used
  it; part of the typed lead is file size; it was partly judged on a task it was not built for (GT M "Qualifications", "Task fit").
  Graphify's own 71.5x is self-reported, weak (GT K) [quoted].
- Cached-answer replay (deterministic answers, no model): wrong among served 32.7 % with no invalidation, 12.0 % at a 20-commit TTL,
  6.5 % file level, 0.0 % fact level while serving 87.6 % (GT L table, via R4 s1b) [measured; "wrong" against the same extractor].
  A store item (the teammate's) except where it bears on hallucination.
- Corrections to the first test: 0 of 4,886 call edges by name; 11.2 % of changed definitions had no node; median 5,010 of 8,000
  tokens used "so ranking could not matter" (GV s J, R-8, via R4 s3) [measured].
- Keyword search is "the strongest index-only arm on almost every form, and it is the one to beat" (42.1 % product, 44 % program top-10
  overlap with the span read) (GV s B, via R4 s3) [measured].
- Cross-runtime gap: 158 of 160 co-changed pairs the import graph cannot reach are cross-runtime (158 of 1,028 pairs, one repository)
  (SYN:246-249; f2d L1) [observed]. The one gap our own data shows (f2d ranked 1, via R8 s2).
- Not measured for graphs: "16 of 49 cells measured, 33 not measured. Token cost is not measured in any row" (GV s A2, via R4 s3).

### 2b. What the literature read says, by form (all [quoted]; makers' own unless "independent")
- The arm a graph must beat is text embeddings, not grep alone: L35, independent, pre-registered, 500 tasks, 12 Python repositories:
  Acc@10 +0.058 to +0.101 over grep (Qwen3 0.6B-14B), +0.026 at 32B; graph on top of embeddings -0.022 to +0.036 post hoc, 0.6B
  significantly negative (HB:442-455; f5 C06-C11; `RUN:fields/2m-graphs/KEYS.md` key 3; via R5, R7, R8). f2a corrects the C99 ratios
  to -0.19, -0.29, -0.04, -0.06, +0.49 (R8 s3).
- Graph-navigation agents lose to a strong grep agent under matched settings (LocAgent 59.5 vs 83.2 % Func@5); structure on the same
  reads +2.34 points at +11.7 % tokens; maps on writing tasks +1 to +12 % tokens; an optional graph tool went uncalled in 58 % of trials
  (f2a L11-L13, C07, C11, C14, C55; SYN:369-382; via R8 s2, R6 s1).
- Hybrid index (vector + BM25 + call graph) beside grep, Opus 4.7: resolve 50.4 vs 41.9 % (p = 0.003), vs a grep harness 50.4 vs 45.3 %
  (p = 0.087); turns -22 %; tokens -9 %; per-cell cost null (p = 0.73); 91 instances, gain mostly Go (47.1 vs 29.9), Python 47.6 vs 45.5
  (HB:67-80; f3a:33; via R5, R9). The cost p is unsettled between per-cell and per-solved-task (SYN:99-101, via R6 s3).
- Graph-guided planning is the one graph form with a token cut in a deployed agent: 0.32-0.76x tokens where significant (f8 L3, C78,
  self-reported, Python and C/C++, one run per instance; via R7 s2a).
- Parser-built graphs over model-built: 2.13-2.25x vector-only cost against 19.75-45.64x (L58; f2b L12; f2d L10, narrowed). Ours is
  already parser-built; no test (HB:862-875, via R5).
- Typed traversal tool (L15): Acc@10 71.53 vs 66.06 (fine-tuned 7B), tokens rise; the one pre-registered hop study -0.004 to -0.007
  (HB:652-665; f2d L3 C98; f2d C44 corrects 77.01 to the 32B's). One-call closure (L44): 92.6 vs 75.1 Hit, 231 vs 7,069 tokens,
  knowledge-graph QA, not code (HB:637-650).
- Token-bounded subgraph (L43): 1-hop 2,311 tokens, 2-hop 10,505, summarised 1,229, resolved 29.67 / 26.00 / 28.67 % (HB:622-635).
- Language-server tools: one author, 6 issues of one repository: tokens to success vs grep Opus 4.8 +6 %, Sonnet 4.6 +118 %, Haiku 4.5
  -26 %; Opus used the LSP 0 % when free (f2c L5, C01-C07, via R8 s1). "A saving unshown, not ruled out" (f2c C109).
- Index services (zoekt, SCIP, LSIF, Kythe, Glean): no agent measure of any (f2c L6, "Not found", via R8 s1).
- Graph and hallucination: project dependency context plus an existence check (MARIN -73.56 % relative vs RAG; AST check recall 0.876
  at precision 1.0 on only 39 clean of 200 samples; 1.3-34B local models, no agent); real-but-wrong symbols pass the check; context
  gives the larger part (f2e L1; W2:28-34; via R6, R9). A model-built graph trades abstention (91.36 to 81.06) for comparison and temporal
  answers, so graph context can add unsupported answers (f2e L12, via R6 s2). Graph-grounding hallucination as a key was read empty in
  wave 2: "graph vs no graph on code hallucination" not found (W2:256-267, via R9 s2).
- Weak retrieval added by default can hurt a strong agent: BM25 lowered a GPT-5 agent 88.5 to 78.5 (text); BM25 injection +21 % tokens
  at 30B (f2b L17, C22, C68, via R8 s2).

### 2c. What must not be ruled out (one null is not a verdict)
- The graph test is one form (ranked file lists, a scripted search, not an agent) on one repository; tokens in sessions, quality and
  hallucinations of any tool are untested (GT item 7; GT "Not shown": "Any other repository").
- No source runs a frontier model in Claude Code with a graph arm against an embedding arm with tokens counted (f2a answer 7 "Not
  found"; SYN:691-722; via R8, R6). Whether gains shrink with stronger models is mixed (f2a answer 3, C101; f2d C106 refuted).
- Rule or path ranking (AnyBURL, TLogic) is the untested neighbour of the embeddings null; benchmark-only evidence; the graph-algorithms
  reader got HTTP 429 and ran no web search, so "not found" is not "no paper" (f2c answer 5, L12, "Not found", via R8 s2).
- Cross-runtime edges: no source measures URL-literal-to-route matching; no agent measure anywhere (f2d C02, C23, C24, via R8 s2).

### 2d. Which repositories the record names
- FixFlow product (GT, EC); the clinic project (no remote; CLAUDE.md rule 4 keeps its material private); one public repository
  (D2, D4: SYN:640-641, W2 s3.4); the paired pilot P: 20 tasks, 7 FixFlow, 7 clinic, 6 public (SYN, via R6 s4) [hypothesis: designs].
- FixFlow's history: about 233 commits at head (EC s6 item 8, checked: "about 233 commits of history, about 5,400 nodes and 19,000
  edges"); "432 commits" is an eight-day snapshot, correction x09-0129 proposed and not applied (HB:1320, via R5 s3).
- Size: a size threshold was argued from vendor figures (L52: reward -0.080 below 400K LOC, +0.259 above; HB:772-785, via R5; R4 s3
  points it at r57-0028, a larger repository inside D2). R8 s2 carries f2c's refutation: "a size law: code-intelligence tools cost
  below 400K lines" is refuted (f2c C111: "rests on two summaries"; f2c line 16 and 24, checked); f2b keeps the vendor numbers as
  vendors' own; no study varies size (f2b L16, C65-C66). So: test size, do not assume a threshold.
- Co-change at our history size: "co-change is weak at our 432 commits" is refuted (f2c C114: our changed-together floor scored 0.638
  above scripted search 0.625; f2c line 16, checked); record x09-0418 needs correction d2c-0501 (R8 s2). The literature's MAP knee near
  15,000 commits (f2c L10, C73-C83) is not ours.

### 2e. Scoring defined first, and baselines, as the record fixes them
- Rules for every ranking test (W2 s3.0, lines 300-312, checked; from f3d L8): random tie-breaking; leak-free splits of training and
  test commits; filtered ranking only for the link-prediction selection metric, not for P@10; every arm scored alone and unrestricted,
  since the fixed fusion held co-change on top in 224-226 of 226 tasks. Why: ConvKB .396 to .243 under random ties; KBAT .518 to .157
  after a leak fix (f3d L8, via R6 s5) [quoted].
- The earlier tests' own scoring: recall at 8,000 tokens, frozen settings, held-out once, independent scorer reproducing 1,151 point
  values (GT "What was tested", "Trust"); P@10 in pool and unrestricted, "adds" needs the interval above zero and at least +0.02,
  "matches" means within +-0.02, not "no difference" (EC s2, via R4 s1d) [measured protocol].
- Baselines named: our RRF ranker (rooted PageRank + co-change), P@10 0.2493 pool, 0.2513 unrestricted (EC line 48, checked); plain pair
  counting; BM25 and grep; keyword search as the index-only arm to beat (GV s B); the text-embedding arm (L35); the best untrained history
  arm for D4 (W2 s3.4); in agent tests the same harness, model and tasks with grep only (SYN:656).
- Agent tests need recall to convert: recall rises 0.16-0.26 resolve points per localisation point, and a recall gain can lower resolve
  (f3a:45, :79-80, via R9 s2) [quoted]. "Tenfold shrink" refuted (f3c C52, via R6 s2).

## 3. The embeddings retest, the 12 GB card, and what waits for 24 GB

### 3a. What the earlier test showed, exactly
- FixFlow, verdict graphs of about 1,600-2,450 nodes, about 6 facts per node (EC s6 item 8, checked); file-level truth (what a commit
  edited, not what it needed) (EC s7). Arms: RotatE, ComplEx-N3, TransE, CompGCN, routed RotatE specialists (the owner's CureFound
  form), each alone and fused; placebo; PyKEEN 1.11.1 (EC s2, s6 item 7) [measured].
- Tuning (later 50 commits, 313 tasks): simple ranker 0.2493 pool; fused gains RotatE +0.0023 [-0.0002, +0.0049] and the rest
  "matches"; routed specialists alone lower (-0.0221 pool, -0.0441 unrestricted) (EC lines 48-57, checked) [measured].
- Held-out 75 commits, frozen E1: simple 0.2155; E1 fused +0.0026 [-0.0019, +0.0071]; E1 alone unrestricted -0.0133 [-0.0261,
  -0.0006]; answer level 0.7020 vs 0.7125 (EC lines 130-132, checked) [measured].
- Why the pool "matches" is weak: the fixed fusion kept co-change candidates on top in 224-226 of 226 tasks; the placebo moved the list
  as much; "matches" rules out "a third to a half of the gain that could be reached, not all of it" (EC s4 point 5) [measured].
- It holds "as a result about one form" (W2:294-297; f3d folded; f8 C105). Its resolution was coarse: +0.006 is far below what 313 tasks
  resolve (f8 assumption 6, C113 in part) [hypothesis].

### 3b. Where the earlier arms fell short of each family's best form
- KG embeddings: training form decides as much as model (ComplEx on FB15K-237 24.7 to 34.8 % MRR across studies) [quoted]; E2 already
  had 1-vs-all, reciprocals, N3, Adagrad; it departed on N3 weight (0.033 in the code's units against published 0.05-0.1; EC s6 item 9,
  checked), dimension (at most 512 against 1000-4000) and selection (SE about 0.022 against differences of at most 0.015, so the
  smallest model was always chosen; EC s6 item 11, checked); negatives not filtered (EC s6 item 10). "No source sizes the gain left"; the
  draft "+0.06 to +0.10 MRR" was refuted (f3d C65) (W2:175-186; f3d answer 2; via R6, R9) [quoted / measured].
- Routed specialists: most of E5's shortfall is the merge as written (about 60 % of its gap on two-area tasks); on 121 single-area tasks
  E5 equals E1 (0.2226 vs 0.2219); says nothing about routing on a graph too large for one model (EC s4 point 6, s7) [measured].
- Families never tried: rule learners (AnyBURL at embedding level after 100-1000 s CPU against 1-300 h of embedding training;
  independent, never tested on code) (f2c L12; f3d L7; W2:167-173); untrained history forms (decay up to +80 % MAP on one project;
  TARMAQ 65 % vs ROSE 0 % on unseen queries; commit-text match Hit@10 0.322 to 0.403) (f3c L3-L5; W2:151-157); one tuned convex fusion
  weight (0.454 vs RRF 0.425 NDCG@1000, independent re-test, MS MARCO) (f3c L6); a commit as one hyperedge, weight w/|e| (our own
  derivation, d10-0546) (HB:1042-1055); text and code embeddings as a retriever (GT "Possible next tests"; L34, L35); temporal and
  inductive models (EC s7) [quoted; the transfer is hypothesis].
- For the wider encoder family the model-class premise is contradicted for text, transfer and inductive forms (W2R:90 r70; f3c L8,
  N3); for identity KG embeddings only on N3 weight, dimension, selection and the untested rule learner (f3d:96-98). "Both parts are
  stated; do not shrink the second" (R9 s2).

### 3c. The retest the record designs: D4 (wave 2), fits 12 GB
- Question: on held-out later commits of more than one repository, does a learned arm (rule learner; KG embedding at its published
  form) add over the best untrained history forms, each scored alone, then fused by one tuned weight (W2 s3.4, checked).
- Arms: decay, TARMAQ, commit-text match; AnyBURL; E2 at N3 weight 0.05-0.1 and rank 1000-2000, selected on held-out link-prediction
  MRR; the 1/|e| weight; one tuned fusion weight; baselines our RRF ranker and plain pair counting. Swept: decay per repository, d 512 /
  1000 / 2000, N3 weight, fusion weight, triples against pairs. Script pre-tests first: the surprise index of our history (bounds pair
  counting) and triples against pairs; GraIL (12 GB inductive) only if they show room (W2 s3.4) [hypothesis: a design].
- Scoring fixed first: recall and P@10 of files each held-out commit edited, each arm alone and unrestricted; a gain counts at +0.02
  P@10 against the best untrained arm; the s2e rules (W2 s3.4).
- What it changes: no learned arm above the best untrained one by +0.02 closes the encoder family for this ranker at our size, with
  these forms named; a learned arm above it joins D2's index; an untrained form above our co-change term replaces it at no card cost
  (W2 s3.4) [hypothesis].
- n is a measurement: n = (2.8 x sd / 0.02)^2; "were the SE on 50 commits, n would be about 474 held-out commits"; our repositories hold
  about 230 and 432 (dated) commits, so the public repository supplies most (W2 s3.4, checked). Spot-check finding: W2 and R9 say the
  commit count behind the SE 0.022 is "not in the reports"; EC s6 item 11 (checked) gives it: "about 0.022 on all 65 commits, 0.024 to
  0.041 inside the blocks", for the selection figure. Were that SE per commit on 65 commits, the same formula gives about 617 held-out
  commits [hypothesis: my arithmetic; the SE may be over tasks, not commits; x09's per-commit scores settle it, as W2 says]. At 242
  held-out commits a true +0.02 is seen about half the time (W2R:100-103, via R9 s3) [computed].
- Cost: 4 R = 18.8 M, "a judgment, no part costed from a measurement", cap 43.2 M, under 4 h plus card hours (E2's wall times x the d
  ratio, a measurement) (W2 s3.4; HB:993, checked).
- Installs (W2 s3.4, checked): AnyBURL (source and size not in the reports: a measurement); the public repository's clone (size a
  measurement); x09's training runtime if absent; a copy of the x09 arms' code run in a container, never the recovered files in place
  (rule 1). Earlier library: PyKEEN 1.11.1 (EC s6 item 7; size not stated).
- Memory (computed, assuming Adam-type state, a high figure for Adagrad): about 0.16 GB at d = 2000 on 2,450 nodes; 6.4 GB at 10^5
  nodes; 24 GB from about 10^6 nodes at d = 500 (HB:1033, checked; W2:181-182; f3d C69). The public repository's node count is not known.
- The earlier run's own costs: held-out run 2 h 43 min of work plus a 2 h sleep; memory cap 6 GB after a 4 GB probe was killed; E5 not
  bit-reproducible on the card (EC s6 items 3, 4, 15; s9) [measured]. No token count (EC s7).

### 3d. The text-retriever test on 12 GB: D2 Phase A
- No agent: Acc@10 of finally edited files from issue-like text on closed commits of FixFlow, clinic and a public repository, against
  BM25, grep and our RRF ranker; top-2 precision (SYN:657-659, checked). Embedder: SweRank-class 137M (0.55 GB fp32) or
  Qwen3-Embedding-0.6B (about 1.2 GB) (SYN:668-669, checked) [computed sizes].
- Gate to Phase B: 6 or more points over BM25 (both files agree). Top-2 precision: SYN:659 says "0.68 or more for seed injection";
  HB:557 says "0.45 or more" (both checked). R9 reads 0.45 as the stop line (f3a:34 "seed top-2 precision under 0.45") and 0.68 as the
  injection gate; the seed figures rest on three points of one 30B model, one run (f3a:34). The two files disagree; settle from f3a:34.
- Cost: Phase A 1 R = 4.7 M plus card hours (a measurement); Phase B 384 M; D2 388.7 M, 4.2-5.0 h, cap 894 M; third arm (typed store
  as traversal and closure tool) +192 M only if "on" beats "off" (SYN:671-672; HB:79, 558, checked) [hypothesis: R borrowed, A computed].
- Installs (SYN:669-672, checked): the weights (0.55 GB or about 1.2 GB, named in DOWNLOADS.md first), an embedding runtime,
  tree-sitter, SQLite FTS5 and a search tool for the agent, "whose sources and sizes the reports do not give: each a measurement
  before the owner decides". `DOWNLOADS.md` entries do not exist yet (R9 s6).
- SweRank figures, corrected (W2:194-201, checked; W2R:62 r42-43): 137M file Acc@1 66.42 vs BM25 38.69 vs its start CodeRankEmbed
  52.55; function Acc@10 74.45 vs 36.86 vs 58.76; 72.63 is the 7B's. R6 line 76 still repeats "file Acc@1 72.63 vs 43.43" (from f3c):
  wrong; the records d3c-0300, x115-0327, x117-0330 carry the shifted figures (corrections d10-0504 to 0506 proposed, not applied).
  Part of the gain is the pretrained start (R9 s2).
- Stop rules named: tuned retriever not 6 points above BM25 or grep on our tasks; seed top-2 precision under 0.45; invented project
  symbols under about 1 % of our edits (f3a:31-46; f3b:38-52, via R9 s5).

### 3e. Other encoder forms the record sizes for 12 GB
- ULTRA zero-shot: 12.87 GB at batch 64 as measured by its source, so "needs 24 GB" (HB:1179, checked; wave 1 said fits 12 GB); f3b L5
  says inference fits 12 GB, computed from 177k parameters (f3b:42). Two tags for two things, not reconciled (R9 s2).
- GraIL fits 12 GB; NBFNet needs more; HYPER 25.30 GB; GREPO as run needs 24 GB (one RTX 4090), its anchors need an 8B embedder
  (HB:1179; f3b:41; f3c L12; via R5, R9). GREPO: Hit@5 31.51 (GAT) against 21.32 for untrained Agentless, not "CF-RAG" as f3a:38 and
  C34, d3a-0326, x55-0301 label it (f3b:41, :146-148; corrections d3b-0512, d3b-0513 proposed); without history anchors 19.13, below
  Agentless; no BM25, PageRank or tuned-retriever row (R9 s1).
- Frozen embedder + GNN fits 12 GB (Sentence-BERT 1.30 GB; DeBERTa fine-tune 12.53 GB at the border) (f3a:40). SubgraphRAG retriever
  434M fits 12 GB; GFM-RAG 8M runs, trains on 8 A100 (f3b:40) [computed].
- Code embedder plus 4B+ reranker: top-5 50.0 to 67.5 on SWE-Bench-Lite; the 0.6B reranker is below its embedder on code (73.42 vs
  75.41) (f6 L2, via R7 s1b) [quoted]; a 4B reranker over long prompts is not shown to fit 12 GB (f3a:32).
- L20 learned checkers as hints: GNN 26.4 % joint on real bugs, at least 98 % false flags on mature packages; inference fits 12 GB,
  classifier training 24 GB (HB:217-230) [quoted / reasoned].
- L30 entity cards from a local 4B: 31.63 % of 2024 code summaries held a wrong claim, flagged a hallucination risk for the tree;
  f2c computes only about -1 % to 6.6 % of context tokens with card building (C112 corrected) (HB:337-350; f2c answer 4, C37; R8 s2).

### 3f. What waits for 24 GB (r57-0189: not known whether or when)
- D3: 7B retriever (14.2 GB weights) plus 7B listwise reranker, one at a time; 100 candidates ran on an A100-80GB, so a 24 GB fit is not
  shown; 388.7 M, 4.2-5.0 h, cap 894 M plus university card hours; after D2 (HB:555-558, checked; SYN:676-690).
- Also tagged 24 GB or more: ULTRA as measured, GREPO as run, GNN-RAG, HAFix 6.7-7B (HAFix 16B tagged "needs 24 GB" though 31 GB of
  weights do not fit: SYN:277-278), classifier training, model-added cross-runtime edges (2.81 M tokens, 12.86 h a project, f2d L2),
  CodeScout 14B; more than 24 GB: CGM, NBFNet, HYPER, GCR 8B, repository fine-tunes, L56, L75 (HB:1179; via R5 s3, R8 s4).
- The order is the owner's: 12 GB first, 24 GB after the 12 GB results (r57-0047; f3a:50, :120-121, via R9 s5).

## 4. Training: what fits on 12 GB

- No 12 GB fine-tuning run exists in the record (SYN:710, via R6 s4) and no source measures any local-card method "on a 12 GB card, on our
  step kinds, or in our meter's units" (f6 "The answer" 7, via R7 s3b) [observed: not found].
- What has been trained here: the KG embeddings of the earlier test on the card under PyKEEN (EC s6, s9) [measured: memory caps above].
- Fits 12 GB by the record's computation or source: KG embeddings at best form at our size (0.16-6.4 GB, HB:1033); AnyBURL on CPU (4 cores,
  16 GB RAM for the 75 held-out commits, f2c L12); GraIL; a frozen embedder + GNN; GCR 0.5B decoder (10 GB per GPU in training, f2d L4,
  C39); program-graph GNNs run on 11-16 GB cards, training 12 h to 1.5 weeks (f3b:44); MGD 350M-2B for decoding constraints (reasoned,
  C90 cannot be checked; needs logits, so only with a local model, f5 L9) [computed or quoted].
- Small localiser tuned on a few hundred successful trajectories (L72, 768 in the source): our count of successful localisations is not
  in the record; card not stated (HB:1072-1085; f3c L10) [quoted]. Cross-project training for a label-poor repository: negative transfer
  in 9.5-30.2 % of pairs (f3c N3) [quoted]. A tuned retriever trained on unfiltered pairs falls below its start (f3c N4; f3a C04).
- Needs more than 12 GB: repository fine-tune (SymPy specialist 21.2 vs 13.6 %, 7B; 6.7B full 67.2 GB on 8 A100), 7B executor training
  (8 x 80 GB), SweRank training (8 GH200), learned compaction (above 441 GB), RL memory managers (32 H100), language-server RL (8-16
  A100-80G) (HB:787-800, 832-845, 1117-1130; f6 L6, L8; f3a; f2c L5; via R5, R7, R8) [quoted].
- Local inference as an enabler: 8B Q4_K_M 4.58 GiB (4.9 GB download, the owner's decision, HB:330, checked), 71.93 t/s; on 12 GB its KV
  pool holds about 11,000-30,000 tokens against a coding agent's median 119,000-token prefix, so it binds at one session (HB:1160-1162; f6
  C66 holds in part: "~56K tokens" with grouped-query attention) [quoted / computed]. The two figures differ (R5 vs R7); the wave-2 figure
  is the later one.

## 5. How the quality mechanism is tested (mistakes, hallucinations)

### 5a. Our baselines (the sheet's sinks; this PC, two repositories, mostly Opus; "none is shown across repositories or models")
- S1 mistakes after a compaction 0.58 before vs 1.35 after per 100 calls (+0.77, 0.28 to 1.33), one blind reader [measured]; S2 at least
  5 P1 and 10 P2 defects created by fixes [measured]; S3 summary behind its hand-over 74 of 117, 63.2 % [measured, one reader]; S4 20-plus
  overstated reports, no rate per report [measured count]; S5 false claims in compaction summaries 0 of 2,727 checkable [measured]
  (`RUN:sheet/SHEET.md` rows S1-S5, via R4 s2d). The hand-over count is 116 in f2e and 117 in SYN:233, not resolved (R6 s3).

### 5b. What the seven replays found (2026-11-23; JR, checked)
- L11, a gate holding DONE without a passing check after the last edit: the contradicted claims had already passed their checks (clinic 79
  of 94 gate reviews contradicted, an existing check showed 1 of 79; H build 0 of 7; FixFlow 0 of 6); code-helper DONE without a passing
  check after the last edit 84 of 183; 11 DONE after a red last check, unread (JR row L11, line 25) [measured]. Do not pilot the narrow form.
- L8, ruff + mypy strict after each edit on one Python project that already gates on them: 0 of 10 located defects; edit diagnostics 0
  lines in 30,336 Edit/Write (JR row L8, line 26) [measured]. The defects are "wrong rules that type-check".
- L6, a text-only reviewer with two versions vs one, 37 paired clinic cases: 2 of 17 vs 4 of 17 flagged, p 0.50 each; both under a quarter
  (JR row L6, line 27) [measured].
- What caught the recorded defects: in H, executed checks stronger than the worker's (merged-head suite, mutations, a model check, probes);
  in the clinic, Opus gate reviewers reading the code and probing (78 of 79); in FixFlow, PR reviewers. "Together [r]: the catch came from a
  second party with the code in hand or running a stronger check" (JR line 71) [hypothesis: reasoned from measured counts].
- Not ruled out: L11's stronger forms; L8 on TypeScript, shell, a project without a strict checker; L6 with code, tests or evidence in hand,
  other models (JR s3c, via R4 s2c). The three are nulls for one form each, mostly on the clinic.

### 5c. Literature that bears on the mechanism (all [quoted])
- Done is often wrong: GPT-5 submitted 100 % and resolved 44 %; silent failures 68-80 % of failing runs; guard prompts did not close it
  (f8 C33-C36, independent of model makers, one scaffold, 50 tasks; L11 HB:37-50).
- A passed check is not correctness: Dafny alone 100 % false positives on adversarial versions; 7.8 % of grader-passing patches wrong; SAST
  gating 12.5 to 20.8 % latent degradation (f5 N3, C51, C68, C69, via R7).
- Test-filtered selection among candidates (L1): Agentless 77 to 96 of 300 with regression plus reproduction tests; Trae selected 62.27 %
  vs random 53.40 % vs oracle 66.20 %; reproduction tests the largest step (+15, about $0.25 an issue) (f7 L1; HB:52-65).
- A checker above workers that sees several versions (L6): one faulty agent, hierarchical -5.51 vs flat -10.54 vs linear -23.72 points;
  only Huang's evaluator sees several versions (f7 L2, C07; HB:22-35) - the nearest support for P2's "compare to detect, never vote".
- Curated short instruction files: +16.6 points; model-written files -0.5 and -2 (n.s.) at over +20 % cost; our briefs are model-written
  (L2, independent; HB:7-20).
- Debate no better than self-consistency; search over thoughts no gain at equal budget in an independent rerun (N2, L21; SYN:544-545).
- Hallucinations: project-symbol hallucinations are about 11 % of hand-labelled code hallucinations, at most 25 % (f3b:12; HB:130); "85 %
  made-up APIs" is four small 2023 models on one company project (W2R:28 r8). Unscriptable hallucinations stay unknown (SYN:714-716).

### 5d. Power: what any test can see
- Single runs move 2.2-6.0 points; 2 points need about 9 runs per arm, 1 point about 36 (f8 C01-C02, open models, 500 tasks) [quoted]; 9 %
  of outcomes flip between identical runs (f2b L8, C31-C33) [quoted]; repositories differ by over 40 points and methods flip sign between
  them (f8 C44; N14) [quoted]. Our own run spread is unknown (f8 M1, C113) [observed: not measured].
- A 40-task pilot detects a per-task saving only at 18.4-33.4 % or more (GV line 125, checked; f2a C92). The paired pilot P (20 tasks x 2
  arms x 3 runs) sees only gross effects (SYN, via R6 s4) [computed].
- The tree pilot is n = 1 per arm (P2 s11, s13). Checker detection per class d_k is unmeasured; 2-4 plants per expert give no rate (P2 s6,
  s11, via R1 s3c).

### 5e. Tests the record proposes for the mechanism (none started)
- Read the 11 helpers that said DONE after a red last check: reading only, well under 1 M, "no owner word" (JR s4 item 1, checked).
  The record shows it found by pattern, not read (`research-tree/build/TOP-STATE.md` line 429).
- The stronger form: a merged-head suite plus mutation of the claimed guard, folded with D1 Phase A (70.5 M); case set 10 of S2's 15 defects
  (8 in Python); owner's word and a cap (JR s4 item 2, checked); Phase B 256 M only if Phase A catches a third or more (JH s1).
- D1 as designed is below its own floor of three runs per arm (JH s9 line 170; HB:57); 326.5 M, cap 751 M; a public task set is the owner's
  download; per-repository containers about 10 h manual work each where none exist (SYN:645-651).
- Replay (a) widened: invented project symbols, same-turn catches, real-but-wrong symbols, version errors, causing-commit need, today's
  commit count; one of the five wave-2 replays, 1 R (W2 s3.0, checked). If the share is not near zero: project dependency context plus an
  existence check, then a pinned-version doc index (f2e ranked 1-2).
- The tree's own pilot comparisons (1c above) and its fault-injection probes.

## 6. Costs per step, with their basis

| Step | Tokens | Time, card | Basis | Place |
|---|---|---|---|---|
| Tree pilot (slice 3), all | 417.8 M expected, cap 593 M | prep 3-4 h; pilot 8.5-13.8 h (r57-0174: counts a 4.3 h stop); 37-58 typed turns | measured role medians (r57-0173), one build's roots; points at 62 M, the worst-fitting basis (r57-0175) | PILOT 20, 24, 62, 67 |
| of it, fix round FX-PILOT | 142.7 M (99.5-171.8) | - | 3 x (builder 32.3 + refuter 10.6) + root share | PILOT 41 |
| Build to the model check (done) | 907.7 M against plan 397 M (PILOT) or 416 M (ORCH), cap 576 M | about 15 h | measured; r57-0170 includes 107 M Fable counted twice (r57-0175) | PILOT 94; ORCH 21, 232; r57-0170 |
| Merge of `build` | not costed | - | - | r57-0520 |
| Five wave-2 replays | 23.5 M, cap 54.1 M (refuter: 4 R = 18.8 M, L61's 1 R missing from the sums) | under 1 h each; no card | R = 4.7 M a judgment | W2 s3.0, s5; W2R:92, :114 |
| D4 ranker retest | 18.8 M, cap 43.2 M | under 4 h + card hours (a measurement); 12 GB | "no part costed from a measurement" | W2 s3.4; HB:993 |
| D2 Phase A | 4.7 M + card hours | 12 GB | R borrowed | SYN:671 |
| D2 whole (Phase B 384 M) | 388.7 M, cap 894 M; third arm +192 M | 4.2-5.0 h | A = 3.2 M computed stand-in | HB:79, 558; SYN:671-672 |
| L65 arm (BM25 list vs grep) | 192 M joined to Phase B (cap 442 M) or 384 M alone (cap 883 M) | 2.1-2.5 h / 4.1-5.0 h | computed on A | W2 s3.2 |
| D3 (24 GB) | 388.7 M, cap 894 M + university card hours | 4.2-5.0 h | computed | HB:558 |
| D1 quality (selection) | 326.5 M, cap 751 M; Phase A 70.5 M; Phase B 256 M | 3.5-4.2 h | computed | HB:64; SYN:645-651 |
| Read the 11 DONE-after-red helpers | well under 1 M | - | reasoned | JR s4 item 1 |
| L16 cross-runtime replay | R5: 1 R = 4.7 M; R8: 0 model tokens, a few hours of scripting | no card | the two digests differ: f2d L1 vs HB:262-275 | f2d L1; HB:262-275 |
| L43 token-bounded subgraph; L45 union | 4.7 M each | under 1 h; no card | R | HB:622-635, 367-380 |
| Paired agent pilot P (any agent test) | 384 M | 4.1-5.0 h | 20 tasks x 2 arms x 3 runs x A | SYN, via R6 s4 |
| A 2-point test on 100 tasks | about 28.8 B | - | 9,000 task-runs x A (f8 C115 corrected) | f8 "The answer" 2 |
| Wider graph test (agent baseline, switches) | 4.0-10.0 B over probe, pilot, both main stages | - | estimate, protocol v2 | GT s K |

- Units: A = 3.2 M a task-run is computed from f8:15 (28.8 B for 9,000 task-runs), not measured on ours; R = 4.7 M a replay helper is
  borrowed from a closing sample reader, a judgment (HB:2-5, checked; SYN:17-20). The run's own helpers averaged 1.55 M (run), 2.05 M
  (read), 2.80 M (collect), 3.72 M (analyse), 5.95 M (refute) (r57-0188 [measured]); builder unit 32.3 M, refuter 10.6 M, a root call
  0.24 M (r57-0173 [measured]).
- Overrun: the build 2.3x its plan; the research run 0.53x; "no fixed overrun factor holds" (r57-0188). The replays: 60.6 M against
  37.6 M expected, cap 87 M (JR line 33, checked). Wave 2 of the research run: 1,055.08 M after wave 2 less 807.62 M after wave 1 =
  247.46 M (HB:1272, 1325, checked; my subtraction) against about 222 M expected and a 600 M cap (r57-0054).
- Points: the meter follows fresh tokens; a cached re-read weighs about 1 % of an Opus fresh token; Sonnet 0.15-0.5, Haiku 0.15-0.8,
  Fable 2.7-5.6 of Opus per fresh token (r57-0175 [measured, one week, 132 readings]). Conversions at 40, 41-43 or 62 M a point appear
  in ORCH, STATE and PILOT (R2 s4); say which basis when quoting.

## 7. Never read or not covered (each line with its source)

### 7a. Keys the research did not cover
- Wave 1 left 14 keys past the part bounds; the owner approved covering them (r57-0054, 4 parts, about 222 M, cap 600 M) and wave 2
  read all 14 (W2:256-257; HB:1296-1311, via R9 s6). R4 s3 and s5 still list "cover the 14" as a next step (from JH s4, s7, written
  before wave 2): out of date.
- Read in wave 2 and found empty: learned fusion, temporal GNNs, hypergraphs or rule learners against counting on code; KG embeddings
  at best form on code; size crossover; graph vs no graph on code hallucination (W2:256-267, via R9 s2).
- Still unread keys (HB:1249-1267, via R5 s3; R9 s6): gnn-code-encoders and graph-llm-adapters (read in f3a/f3b), datalog-code-queries,
  small-model-graph-tools, repo-model-freshness, repo-scale-benchmarks, pathway-graphs, tuned-agent-localizer, repo-graph-tools,
  learned-compression, learned-memory-index, incremental-graph-maint, code-entity-identity, prompt-compression, subagent-context,
  self-correction, graph-cache-invalidation, library-entry-graphs, temporal-kg-memory. Datalog and exact program-analysis queries remain
  unread (key 30, owner f5).
- Inside graph ranks 1-20, covered by no reader: production symbol indexes and language-server tools (key 11); change impact and test
  selection (14); cross-runtime and polyglot linking (16); text-to-Cypher and graph stores (20); KG reasoning agents (17); graph algorithms
  and non-neural graph learning (13); GNNs trained on code graphs (`RUN:fields/2m-graphs/NOT-COVERED.md`, KEYS "Not read", via R7 s3a).
- The encoder map read only ranks 1-10 of 20 in wave 1 ("three readers, 17 papers read in part, about 40 to 60 percent each") and the
  retrievers reader ran no web search, table rows "summary-grade" (`RUN:fields/3m-encoders/KEYS.md`, NOT-COVERED, via R7 s1a, s3a).

### 7b. Questions no source answers (so open, not negative)
- An embedding-only on/off inside a strong-model agent with tokens counted; any GNN against BM25, PageRank or a tuned retriever; any
  inductive link predictor on a co-change, call or import graph; any learned encoder measured on an agent's tokens, turns, time or
  mistakes; independent replication of GREPO, SweRank, GNN-RAG, CGM, ULTRA; a crossover curve over graph size, history or training
  repositories; hallucination rates by retriever; any result on a private or very large repository (f3a:124-134; f3b:131-140;
  W2:256-267, via R9 s2).
- No frontier-model graph arm vs embedding arm with tokens; no node count at which a graph database pays; no agent run with and without a
  type checker; no depth vs fan-out at equal work; no split at a window share; no local-plus-cloud run on one 12 GB card; no 12 GB
  fine-tuning run; no independent replication of any cost figure; run-to-run variance of token counts not searched (SYN:691-722, via R6).
- Knowledge transfer between tree nodes and the CAP choice (r57-0505, not started; t1 C93 cannot be checked; f7 "Not found") (R3 s3).

### 7c. Sources named and not opened by the run
- Papers behind the tree's shape layer: Bayer and McCreight 1972, Comer 1979, Yao 1978, Sagiv 1986, Johnson and Shasha 1990/1993 (the
  1993 utilisation would settle t1's unchecked claim), Lanin and Shasha 1986 - several need the owner's sign-in (f7 list; t1 "Not found,
  not opened"; `library/INDEX.md` line 241; via R3 s4, R10 s3).
- Graph and encoder papers not opened: CoSIL, OrcaLoca, GREPO (wave 1), SeeRepo, LARGER, CodeCompass, RepoNavigator, RepoAtlas,
  GraphCodeAgent, GraphRAG-Bench, TG-RAG; Merkle/zoekt indexing; Salsa and incremental Datalog (NC, via R7 s3a); Jigsaw-LightRAG
  (behind a bot check, for the owner to save), GitTemporalAI (403), VersiCode, CodeUpdateArena, VersionExec, RustEvo2; TARMAQ (EMSE
  2018), Ye et al. FSE 2014, AmaLgam; Ruffinelli (OpenReview), Ali appendices, Lacroix, Sun et al., Rossi s3-4, KBGAN, PBG, AttH, DGL-KE
  (HB:1321, via R5 s3, R9 s6). f2c's folders `tarmaq-saner`, `kovalenko-zen`, `kovalenko-core` hold wrong downloads (R8 s6).
- Our own files the memory reader did not open: KNOWLEDGE-STORE-DESIGN, TOKEN-BOTTLENECK, AFTER-COMPACTION, HARNESS-IDEAS-HORTHY,
  recall-test-4 (`RUN:fields/4m-memory/KEYS.md`, via R7 s3a). The graph-v2 lane files `graph2/graph-v2/lane-*.md` (2,409 lines) were not
  read line by line by any part (R7 s3a; R8 s6).
- The owner's note behind the 24 GB option (C74) and his message behind the 40 % split (C75) were never found (f6 F5; f7 "Not sure";
  `collect-prior.md` line 40, via R7, R10). The 24 GB question is now an owner fact (r57-0189).

### 7d. Not read by any reader of this round (from each digest's section 6)
- Tree: `research-tree/build/ROUTER.md`, `UNATTENDED.md`, `FAULTS.md`, `LOCKS.md`, `TOP9-STATE.md`, `branches.md`, `reports/*`,
  `refute/*`, `departures/*`, `model/results-build/VERDICT.md` beyond its first line (R2 s6); `BUILD-PLAN.md`, `BUILD-SIZE.md`,
  `FIX-VS-SELECTIONS.md`, `ATTACK-AND-COST-RECORD.md`, `model/as-built/*`, `notes/r3-changes.md` (R1 s6); P2 sections 2, 5-8, 10, 15, 16
  partly (R1 read 1, 2, 5-8, 10-13, 15, 16, not s9's table; R10 read 3, 4, 9, 14, 1, 11-13): together every section was read by one of them,
  except P2 s8's lines after R58 and s9's pointers checked against their sections (R1 s6, R10 s6). `research-tree/RULINGS.md` beyond its
  first 60 lines (R10 s6). The mapping folder `docs/program/evidence/research-tree/foundations-2026-11-16/map/` and the attack folder
  (R1 s6, R10 s6). `tree-v2/cost/cost.js` and `tree-v2/model/model.mjs` not located (R1 s6).
- Round 3: the lane claims files, gates, refuters, collect files, `R3:RULE-V2-DRAFT.md`, `R3:lane-tree.md`, the papers folder, the 2026-11-19
  journals, the owner's page `decision-rule-v2.html` (R3 s6). The c1 addendum A1-A16 checked by the gate only (R3 s6).
- Graph tests: GT's data and scripts, the lane's RESULT.md, result.json, AUDIT.md, CLAIMS.md, protocol-addendum-8.md, rulings 103-113 (R4 s6);
  the replays' own SCORING.md, RESULT.md, records.md (R4 s6). EC's audit read arm code against PyKEEN; the papers and authors' code were not at
  hand offline (EC s8).
- Research run: every `claims.md`, gate, refuter and collect file of every part; the d9/d10 journals; `BOARD-draft.md`; `RUN:papers/`;
  `run/config.json` (R5-R10 s6). Every paper figure in this digest is as the reports quote them, mostly makers' own, some from flattened
  two-column text (R7 s6; R10 s6). f2b was read in two pieces, answer item 5 only in part (R8 s6). `4m-memory/KEYS.md` rows only to about
  700 characters (R7 s6).
- Hardware sizes never stated anywhere read: indexers for the extraction audit ("total size not verified", GV s K); the downloads planned for
  the run (about 1.12 GB) (JH line 214); AnyBURL, the public repository, x09's runtime, every released model's weights beyond parameter
  counts, a tracer, tsc, mypy, language servers, a test-selection tool (W2 s3.4; f6 L2; f5 L3-L4; f2c L1, L5; HB:1023).

## 8. Disagreements, corrections, and the spot-checks

### 8a. Corrections the readers flagged (carried)
- SweRank: R6 line 76 "file Acc@1 72.63 vs 43.43" is wrong; the right reading is 66.42 / 38.69 / 52.55 file Acc@1 and 74.45 / 36.86 / 58.76
  function Acc@10; 72.63 is the 7B's (W2:194-201, checked; W2R:62 r42-r43; R9 s2). Use the corrected figures.
- GREPO's 21.32 is untrained Agentless, not CF-RAG (f3b:41, :146-148; f3a:38 and records d3a-0326, x55-0301 still say CF-RAG) (R9 s1, s3).
- f2c C111 (a size law below 400K lines) and f2c C114 (co-change weak at our 432 commits) are refuted (f2c lines 16, 24, checked; R8 s2).
  Do not confuse them with t1's C111 (hot leaf, holds in part) and t1's C114 (FoundationDB's window, refuted): claim numbers are per report
  (`R3:t1-report.md` lines 27, 58-59, checked). Other refuted draft claims that must not recur: f2b C79/C80 ("about 20.5 % of lookup tokens
  graph-servable") and C85 (22 % fewer turns cut S10 by 22 %; real 2-8 %); f2d C105, C106, C44, C65 (3,200 tokens per extra fix is about
  0.95 M); f2a C06 (R8 s3).
- P2 s12 lists owner decisions that CLAUDE.md rule 7 overrides (R10 s3); section 1f above separates the design points (derived or measured)
  from his acts (go, cap, installs, rule-3 exception).

### 8b. Where readers or files disagree (both sides kept)
- Top-2 precision gate in D2 Phase A: 0.68 (SYN:659) against 0.45 (HB:557); see 3d.
- L16's cost: 1 R = 4.7 M (R5, HB:262-275) against 0 model tokens and a few hours of scripting (R8, f2d L1).
- The KV pool of an 8B model on 12 GB: about 56K tokens with grouped-query attention (f6 C66, holds in part) against 11,000-30,000 tokens
  (wave 2, HB:1160-1162).
- ULTRA: fits 12 GB for inference, computed (f3b:42) against needs 24 GB at batch 64, measured by the source (HB:1179).
- The build's plan: 416 M (ORCH lines 21, 195, checked) against 397 M (PILOT line 94, checked); the 2.3x ratio uses 397.
- Hand-overs behind S1: 116 (f2e) against 117 (SYN:233).
- The P2 s12 ratio "2.4 to 4.4 times" is used for opposite directions in two sentences (same-window review costs more; roll-overs cost
  fewer); R10 s4 did not resolve which is meant. Both rest on stand-in inputs (cost.js, E).
- Five wave-2 replays (W2 final text, 23.5 M) against four (W2R:92 r72, 18.8 M, with L61 missing from the sums).
- START-HERE (2026-11-18, fixes not built) against STATE and r57-0172 (2026-11-20, built): the later holds.

### 8c. Spot-checks made in the original files (this session)
- GT held-out recall and the typed-vs-search differences (GT lines 15, 25-30, 98): agree with R4.
- EC tuning and held-out tables (lines 48-57, 130-132), graph sizes and commit count (s6 item 8), the N3 weight (item 9), the selection SE
  (item 11): agree with R4; item 11 adds that the SE 0.022 is "on all 65 commits", which W2 says is missing (see 3c).
- PILOT expected, cap, fix round, time, turns (lines 20, 24, 41, 62, 67, 94-105, 232-235): agree with R2.
- ORCH plan 416 M (lines 21, 195, 232); `library/INDEX.md` lines 64, 68-69, 91, 150-154, 162; r57-0057 to r57-0060, r57-0170, r57-0173 to
  r57-0175, r57-0188, r57-0189: read.
- HB lines 2-5, 64, 79, 330, 555, 557, 558, 993, 1023, 1033, 1179, 1272, 1325: agree with R5 except the 0.45 / 0.68 gate (8b).
- SYN:655-675 (D2): agrees with R6. W2 s3.0, s3.2, s3.4, s5 and lines 194-201: agree with R9.
- JR lines 25-33, 71, 76-104: agree with R4. JH lines 58, 71, 170, 189-192, 202-203, 214, 220-232: agree with R4.
- f2c lines 16, 24, 52-53; t1 lines 27, 39, 58-59: as in 8a. P2 s12 lines 748-798; START-HERE line 40: as in 1f.
- Git: `build` against `main` and the working branch, counted today (1d).
- GV lines 99 and 125 (pays at about 300 usable commits and 10x edges; the 40-task power): agree with R4.

## 9. Not read by me

- I read the ten reader digests in full, the step-2 brief, the owner's rulings r57-0057 to r57-0060 and the records named in 8c. I did not
  read any original file in full: only the lines listed in 8c. Every other place in this file is carried from the reader digest that cites
  it and was not opened by me.
- Not opened: `research-tree/build/top9/out/S1-skills.md`, `S2-idle.md`, `S3-lean.md`, `TEAMMATE-TOKEN-NOTE.md` (token step; only
  STEP1-SUMMARY.md read); `research-tree/build/TOP9-STATE.md`; `research-tree/build/COMPLEXITY.md`, `NEXT-STEP.md` beyond grep lines;
  `JUDGE-HANDBACK.md` beyond the grep lines; x09's per-commit scores (needed for D4's n).
- I ran no test, model or suite and opened nothing under `hb` or inside `build` beyond `git ls-tree` of `research-tree/build/facts/` and a
  grep of `build:research-tree/build/STATE.md`.
