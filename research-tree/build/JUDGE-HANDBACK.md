# JUDGE-HANDBACK: the research run 2026-11-harness-leads, judged

Judged 2026-11-23 by a helper of top session 6 (analyse, Opus). `RUN:` = `C:/research-runs/2026-11-harness-leads/`.
Read: `RUN:closing/HAND-BACK.md` (all 58 lead blocks, Not covered, Tokens per unit); `RUN:closing/SYNTHESIS.md` (opening,
1.0, 1.5-1.8, 2-5); `SYNTHESIS-refute.md`; `check.md`; `recall-test.md`; `RUN:sheet/SHEET.md`; `RUN:run/config.json`,
`STATE.md`, `usage.log`, `tokens-run.txt`, `hang.log`; the report lines and claims behind the leads ranked first; the saved
paper text of ten leads. Owner records: r57-0047, r57-0003, r57-0015, r57-0028, r57-0014, r57-0050, r57-0424.
[c] computed here, [j] judgment; every other figure is quoted at the place given. No test was run; the run folder was
only read. No figure of a lead was measured in the run (its own words).

LIMIT: done: this record, sections 1-7 and Records. Not done: the owner's page
`research-tree/build/page/handback-page.html`, its publish as an Artifact, the look at 1870 px. Stopped at 243 K of
context (the brief's line is about 200 K), 8.3 M tokens of the 16 M limit. Section 1 and section 7 are the page's content.

## 1. The answer

Test first the cheap replays over records already on disk. A replay costs about 4.7-9.4 M tokens (1-2 R), under 1-2 h,
no card, no download, no install; an agent pilot costs 192-389 M, 40-80 times more, and no lead's evidence is strong or
close enough to our setting to pay for a pilot before the replays that size it [j]. Inside each pipeline the order follows
the measured size of the sink here (`RUN:sheet/SHEET.md`), the strength of the source, and how close its setting is to
Claude Code with Opus [j].

**Quality (the tree)**
1. **L11, accept "done" only against an executed check.** Replay: helper DONE claims against gate and refuter verdicts.
   4.7 M, under 1 h, card none. Source: GPT-5 submitted a patch on 100 % of runs and resolved 44 %; silent failures were
   68-80 % of failing runs; two guard prompts left resolve unchanged (one-author preprint, 50 SWE-bench Verified tasks, 4
   models, one scaffold). Acts on S4 (20-plus overstated reports) and on hallucinations. It also fits our own record:
   model re-checks often failed in the testbed, executed checks did not (C73 of f7).
2. **L8, type checker and lint gate.** Replay S2's fix commits through tsc and mypy; first check whether Claude Code's
   diagnostics already run here. 4.7 M, under 1 h, card none. Source effect is small and old (15.0 -> 18.0 % resolve,
   GPT-4 Turbo, one run per arm), but it acts on the largest counted quality sink (at least 5 P1 and 10 P2 defects made by
   fixes, S2) and a positive result is cheap to adopt.
3. **L6, a reviewer that reads two versions.** 9.4 M (40 reviewer calls), under 2 h, card none, on the 20-plus recorded
   overstatements. Source: losses with one injected faulty agent, hierarchical -5.51 against flat -10.54 and linear -23.72
   points (GPT-3.5/4o, text tasks); not a detection rate. Where the second version of each report comes from is not
   stated; generating it costs a child run per report.
4. Later, after 1-3: **D1 Phase A (L1)**, generated reproduction tests on the at least 15 fix-created defects, 70.5 M
   (15 R), card none; Phase B (256 M) only if Phase A catches a third or more (SYNTHESIS 3.1).

**Tokens: the router (the meter)**
1. **L24 with L25, cache breaks and lapses.** Scan per-call usage for cache writes that no first call, lapse or compaction
   explains, and for gaps over 300 s followed by writes. 4.7 M, under 1 h, card none. Cache writes are fresh tokens and
   fresh tokens drive the meter (S17: a cached re-read weighs about 1 % of a fresh Opus token). Source: 108 of 120
   prompt-caching defects in 10 agent projects raised no error (independent). Add to the same scan [j]: first-call writes
   of helpers whose prefix a sibling wrote within five minutes.
2. **L2 with L27, the prefix per role and per helper start.** 4.7 M (one R for both), under 1 h, card none. S12: the
   prefix is 27 % of context tokens (47 % FixFlow), about 70,000 per fresh agent. In this run 301 helpers ran; the
   lightest took 35-52 K fresh tokens in all, which bounds a helper's own prefix write, so prefix writes were at most
   about 10-16 M of the run's 44.5 M fresh tokens [c, an upper reading]. L2's pilot (384 M) only if the count shows a
   large fresh share.

**Tokens: the graph**
1. **L5, reads later falsified by an edit, and by whom.** 4.7 M, under 1 h, card none, no model run. Source measured
   Claude Code with Opus 4.8 (48 SWE-EVO instances): 73.4 % of held tokens not needed by the next edit, 72.3 % of those
   stale; resolve +4.9 / +2.7 / +3.3 points in all 18 cells (maker's own). Serves quality and tokens. Measure in the same
   scan what a drop costs: removing a held read mid-window rewrites the cache after it (C130 of f4b).
2. **D2 Phase A (L34, L35, L3)**, retriever accuracy of edited files from issue text on closed commits against BM25,
   grep and our RRF ranker. 4.7 M plus card hours, fits 12 GB; needs the 0.55 GB or about 1.2 GB embedder weights and
   installs whose sources and sizes are not yet known. Phase B (384 M) only past its gate. Expect little on our
   languages: the one Opus study's gain was mostly Go (47.1 against 29.9 %); Python 47.6 against 45.5 %; TypeScript untested.

**Tokens: the library**
1. **L38, how often recorded conclusions return, and which premises the traces miss.** 4.7 M, under 1 h, card none. Our
   own replay found fact-level invalidation 0.00 % stale against 6.49 % file level; no source estimates the return rate.
2. L4's count goes inside L5's scan: in-window re-fetch here is estimated at 0.5-1.5 % (S14), and in the source the reuse
   part alone raised input tokens on one model (C05); the state view (current against stale) is the token lever.

**Together** (L11, L8, L6, L24-L25, L2-L27, L5, L38): about 37.6 M expected [c], cap 87 M at the run's 2.3x; no card,
no download, no install; all under 2 h each. Four are among the run's ten replays (L11, L24-L25, L2-L27, L5); L8, L6 and
L38 are outside them. The other six of the ten (L4 count, L7, L10, L16, L26, L41: 28.2 M) follow if the first wave leaves
room. Memory tier: nothing in the first wave uses the card; the 12 GB card enters at D2 Phase A; 24 GB only at D3.

## 2. Every lead, judged

Pipelines: Q = quality (the tree); Tl, Tg, Tr = tokens (library, graph, router). Card as the hand-back after the fold.
Cost units are the run's (A 3.2 M a task-run, R 4.7 M a replay, P 384 M a paired pilot), computed or borrowed, none
measured on our task-runs. "Checked" = the figure was found at the cited line of the saved paper text in this judging.

| L | what the evidence supports (figure, condition, how known) | pipe | card | test here, cost | judgment |
|---|---|---|---|---|---|
| L1 | Agentless vote 77, + regression 81, + reproduction tests 96 of 300 (32.00 %, checked); Trae selected 62.27 % vs random 53.40 %, oracle 66.20 % (checked); makers' own, five groups, Python | Q | none | D1 Phase A 70.5 M, Phase B 256 M (below its own three-runs floor) | The strongest S2 lead but costly; Phase A after the replays |
| L2 | Curated Skills 33.9 -> 50.5 % vs none, 87 tasks, 18 configurations; compact +19.0 vs comprehensive +0.7; self-generated -8.1 on Claude Code + Opus 4.7; ETH: context files no gain, cost +20 / +23 % (all checked); independent | Q, Tr | none | prefix count 4.7 M; P 384 M | Supports on-demand curated procedures and lean always-loaded files; count first |
| L3 | Resolve 50.4 vs 41.9 % (p = 0.003), Opus 4.7, 91 instances, 3 seeds; per-cell cost null; gain mostly Go (checked); vendor's own | Tg | fits 12 GB | D2 388.7 M | Weak prior for TS and Python; only through D2's Phase A gate |
| L4 | Cost -28.9 / -31.8 %, Codex -24.4 %; input -15.9 / -53.1 %; Pass@1 +3.4 to +8.0 (checked); one run per instance; reuse alone did not cut tokens (C05) | Tl | none | count 4.7 M (inside L5's scan); P 384 M | Small ceiling here (re-fetch 0.5-1.5 %, S14); no pilot before the scan |
| L5 | 73.4 % of held tokens unneeded, 72.3 % of them stale (Claude Code, Opus 4.8); resolve up in all 18 cells, +2.7 to +4.9; manager 2.6 % of tokens (checked); maker's own preprint | Tg, Q | not stated | replay 4.7 M | First graph test: closest setting to ours, no model run |
| L6 | One faulty agent: hierarchical -5.51, flat -10.54, linear -23.72 points (checked), GPT-3.5/4o, text tasks; structure confounded with prompts | Q | none | 9.4 M on recorded overstatements | Third quality test; our record has model re-checks failing (C73) |
| L7 | 230 of 18,048 references stale in 23 % of 356 repositories; a stale command followed in 78 of 80 runs at about 2 extra calls; independent, three cases | Q | none | 4.7 M rate | No quality effect measured; a hygiene fix if the rate is high |
| L8 | Resolve 15.0 -> 18.0 % with a lint gate (GPT-4 Turbo, one run per arm, checked); type step fixed 29 of 762 failed patches | Q | none | replay 4.7 M | Small with Opus, but cheap and on S2: second quality test |
| L9 | Test-level regressions 6.08 -> 1.82 %, but resolution 31 -> 29 % and empty patches 14 -> 26 % (Qwen3-Coder 30B 4-bit); no significance test | Q | none | replay 4.7 M; P 384 M | Mixed, partly abstention; replay only |
| L10 | Exact API matches +23.9-61.0 % from 4.8-8.3 % (models up to 15.5B); project symbols about 11 % of code hallucinations | Q | none | count 4.7 M | Old, small models; our count of invented symbols decides |
| L11 | GPT-5 submitted 100 %, resolved 44 %; silent failures 68-80 % of failing runs; guards left resolve 65.2 -> 64.8 % (checked); one author, preprint, one scaffold | Q | none | replay 4.7 M | First quality test |
| L12 | Completeness 1.00, negation 0.98, supersession 0.98 vs mem0 and flat notes; similarity retrieval served a superseded value 36-38 %; the product's seller, one author | Tl, Q | none | 9.4 M on typed hand-overs | Weak source; S3 is large; after L14 |
| L13 | Add-all memory below a small fixed memory in all four agents; strict admission is an oracle; consolidation 58.5 -> 38.5 | Tl | not stated | 4.7 M | Supports keeping raw records over model rewrites (rule 1 already); low |
| L14 | Tuned compaction instruction 56.5 vs uncompressed 56.0, FIFO 45.8 (AppWorld, not code); learned compaction needs training | Q | none (prompt form) | about 28 M plus the optimizer's tokens, held-out half of 117 hand-overs | S3 (63.2 %) is the largest quality share; after the first wave |
| L15 | Acc@10 71.53 vs 66.06 (fine-tuned 7B); the pre-registered hop study negative; tokens rise | Tg | none; 7B 12 GB (reasoned) | D2 third arm 192 M | Not supported for Opus; only if D2's on beats off |
| L16 | 158 of 160 unreachable co-changed pairs are cross-runtime (ours, one repository); edge precision only; no agent measure | Tg | none | 4.7 M plus a few hours of scripting | A real gap in our graph; no agent effect anywhere |
| L17 | Warning precision above 66 %, firing on 1 in 33 missing items; ours 0.638 vs 0.625 recall | Tg | none | 4.7 M | No effect on the seven; low |
| L18 | KGCompass 30.3 -> 47.3 % (Claude-4, Lite); RepoMem -13.1 under 10K commits; none replicated | Tg | none; HAFix 7B 24 GB, 16B more | 4.7 M recall replay | Not shown at our about 230 commits; low |
| L19 | Defects4J 313 vs 236 fixes (Java, DeepSeek-V3) | Tg | none (tracer install) | 4.7 M after an install | Java only; waits for an install |
| L20 | GNN 26.4 % joint on real bugs, at least 98 % false flags on mature packages; analyzer triage 55 vs 27 of 120 at 50 % precision | Tg | fits 12 GB; training 24 GB | 4.7 M plus card hours | False flags too high on real code; low |
| L21 | 25.7 -> 31.0 % at $40.86 -> $576.00; an independent rerun found self-consistency as good at equal budget | Q | none | none | Not over L1 at equal tokens; no test |
| L22 | Python name-level selection -45.59 % test time, safe on 99.6 % of commits; Ekstazi -32 % (Java); no JS/TS figure | time | none (install) | 4.7 M after an install | The only time lead (S7); depends on the check suite's language |
| L23 | 8B Q4_K_M 4.58 GiB, 71.93 t/s; 4-bit keeps about 99 % on academic averages (vendors) | Tr | fits 12 GB | inside L33 | An enabler, not a gain; 4.9 GB download |
| L24 | 108 of 120 caching defects silent; one rebuilt prompt about +75 % cost (checked); independent, one benchmark | Tr | none | scan 4.7 M | First token test: acts on fresh tokens |
| L25 | Waits to 2,030 s; a 1-hour cache charges 2x on every write; our meter's write weight not found (C128) | Tr | none | inside L24's scan | With L24; a keep-alive pays only if lapses are frequent |
| L26 | Ours, one probe: 21 polls in 6.4 min, 1.30 M tokens, 94 % cache reads | Tr inside the tree [j] | none | 4.7 M | Mostly cache reads (about 1 % each on the meter); low for cost |
| L27 | Prefix 12-15x, turns 2-7x, cost per success 5-30x (24 small tasks, open models); mini-SWE-agent vs Claude Code with Opus 5: same 14 solved at 2.8x cost | Tr | none | shares L2's count; P 384 M | Count first, with L2 |
| L28 | Tokens -25 to -39 % (Haiku 4.5, one run); slower 66.7 -> 82-106 s; resolve 44.3-50.6 vs 49.0 % | Tg | none | inside D2 or P | Shown on Haiku and Sonnet, not Opus; inside D2 |
| L29 | 25/70 at 6,876 vs 19/70 at 25,426 mean context tokens (p = 0.07), single shot with oracle gold files, Sonnet 4.6; independent, pre-registered | Tg | none | P 384 M | No agent loop tested; size it first by counting read tokens outside the later-edited units [j] |
| L30 | Context -48.2 %, -25.4 % with card building; repair 44.00 -> 52.33 %; 31.63 % of model summaries held a wrong claim | Tg | fits 12 GB (4B) | 4.7 M plus a 4B download | Count falsehoods in cards first: a hallucination risk for the tree |
| L31 | Cost -19.3 to -55.1 % (mean -31.8 %), resolution at most -0.2 % (p = 0.46) | Tl | none | 4.7 M; P | Mid; our fix rounds are few |
| L32 | Cost -18.4 to -30.9 % (Claude Code, Codex, Copilot CLI; 277 tasks, 3 seeds); needs 5+ earlier tasks a repository; self-reported | Tl | none | 4.7 M count; P | Mid; count first |
| L33 | 18.0 % of remote dollars at 97.9 % accuracy (long documents, not code; uncached baseline) | Tr | fits 12 GB | 9.4 M plus 4.9 GB download | Our re-reads already cost about 1 %; small gain on our meter |
| L34 | Function Acc@10 74.45 (137M) and 82.12 (7B) vs BM25 36.86; 7B + 7B reranker not measured | Tg | 137M/0.6B 12 GB; 7B 24 GB | D2 Phase A; D3 388.7 M | Recall converts to resolve at 0.16-0.26 points per point (f3a:79-81); Phase A only |
| L35 | Acc@10 +0.058 to +0.101 over grep (Qwen3 0.6B-14B, 500 tasks, 12 repositories, pre-registered); graph on top -0.022 to +0.036 | Tg | fits 12 GB | inside D2 | The arm any graph must beat |
| L36 | 65.2 vs 46.2 % correct, $0.32 vs $0.74 per correct answer; confounded by a sub-agent hand-off | Tl | none | 9.4 M, 40 questions | Mid; the ratio swings by model |
| L37 | Cost -9.8 to -57.1 %, solve n.s.; on our meter a gross ceiling near 5 % and an edit per step likely net negative | Tr | none | 4.7 M count | Low: edits inside a cached window rewrite it |
| L38 | Tokens -22.5 to -32.5 % (synthetic APIs); ours 0.00 % stale fact level vs 6.49 % file level | Tl | none | replay 4.7 M | First library test; the return rate is the unknown |
| L39 | Opus 5: 17, 18, 16 of 25 at low, high, xhigh; the Sonnet figure cannot be checked | Tr | none | P 384 M | n = 25 cannot separate them; a records count of pass rate by effort first [j] |
| L40 | Cascade 0.929 vs 0.931 at 40 % of cost (maths); beats the zero router when the judge errs under 0.2 | Tr | none | 4.7 M from records | Mid: our check's error rate on passed outputs decides |
| L41 | An unresolved attempt over 4x a resolved one; a budget line 36.8 -> 55.4 % at 50 calls | Tr | none | 4.7 M | Mid; in this run all 16 units returned DONE on their first start |
| L42 | Main-agent tokens -14-26 %, about -10 % with the explorer's own; trained folding 0.580 vs 0.574 | Q, Tr | none | 4.7 M | Our tree already returns short results; low |
| L43 | 1-hop 2,311, 2-hop 10,505, summarised 1,229 tokens for 29.67, 26.00, 28.67 % resolved | Tg | none | 4.7 M offline | Cheap; mid for the graph |
| L44 | 92.6 Hit at 231 tokens vs traversal 75.1 at 7,069 (KG question answering, not code) | Tg | none (PPR) | D2 third arm | Not code; inside D2's third arm only |
| L45 | Hands-tied resolve 0.681 vs 0.611; with a free Sonnet 4.5 agent +0.46 to +2.74 points | Tg | none | 4.7 M offline | The free-agent gain is small; mid |
| L46 | Cost -50.31 % at 96.61 % of performance (one workload, not code) | Tl | none | 4.7 M count | Low unless tasks recur |
| L47 | GREPO Hit@5 31.51-32.47 vs 21.32, no BM25 row; ULTRA mixed | Tg | ULTRA 12 GB; GREPO 24 GB | 4.7 M plus card hours | No agent measure; low |
| L48 | 62.50 vs always-Opus 57.14 % out of distribution | Tr | fits 12 GB | not priced, likely large | Low until priced |
| L49 | 2-5x compression; no code or tool output | Tr | fits 12 GB | 4.7 M plus download | Identifiers at risk; low |
| L50 | 42.4 % Verified, expert 11.9 % of tokens; no figure against Opus alone | Tr | 12 GB inference (reasoned) | P if weights are public | Not testable yet |
| L51 | REM 27.6 vs 24.9 % (p = 0.22); models above 47 % lose 2.0-9.1 points | Tl | not stated | P 384 M | Negative for strong models; no test |
| L52 | Index tools -0.080 below 400K LOC, +0.259 above (vendors) | Tg | not stated | a larger repository inside D2 | Bears on r57-0028 (every project size); inside D2 |
| L53 | SymPy specialist 21.2 vs 13.6 % (7B) | Tr | needs more | none | Not on this PC |
| L54 | CGM 43.00 % on Lite at 72B; adapter gain 1.46x frozen | Tg | needs more | none | Not usable by a Claude session |
| L55 | Compile errors -75.3 / -52.1 %; needs the model's logits | Tr | 12 GB for 350M-2B (reasoned) | local model only | Only with L23 |
| L56 | Context-Folding 0.580 Verified; training above 441 GB | Q | needs more | none | No |
| L57 | 87.1 vs 56.2 % (one author, baselines copied) | Tg | not stated | none | Not until replicated |
| L58 | Parsed graph 2.13-2.25x vector-only cost vs 19.75-45.64x model-built; PyCG 0.41 s | Tg | none | none | Already our practice; keep |

Negatives N1-N15 hold as the synthesis lists them (refuter: holds; N13 corrected). Most bearing here: N1 (one coding
task split among peer agents 2.1-14.9 % below one agent at matched tokens, independent), N3 (self-written skills and
model-written context files), N4 (off-the-shelf memory at or below memory off in 11 of 12 pairings), N8-N9 (graph
navigation against strong grep; model-written graphs), N14 (single runs move 2.2-6.0 points: every pilot needs three runs
per arm).

## 3. What the sources do not carry

Spot-checked in the saved paper text (`RUN:papers/<field>/<id>/paper.txt`) and the fields' claims: L1 (agentless 703-712,
trae 671-677), L2 (f4b skillsbench 105-108, 450-453, 486-493; f2b a2602.11988 25-31, 358-372), L3 (f3a codeisntmem 30-36,
400-414, 507-514), L4 (f4b ledger 37-39, 296-298), L5 (f4b a2609.36319 232-260, 533-540), L6 (f7 huang 295-297), L8 (f5
sweagent 354-355), L11 (f8 rel2603.25764 13-25, 355-366), L24 (f4a silent 362-378), L29 (f2b claims C32). Every quoted
figure stands at its place. What the sources do not carry, or the hand-back leaves out:
1. **L29** is single shot with oracle gold files, not an agent loop; the hand-back block leaves out "single shot".
2. **L6** measures how much a structure loses with one injected faulty agent; it is not a reviewer's detection rate.
3. **L2**: +16.6 points is curated Skills against none, not short against long files; the length ablation has no
   length-matched control (C113). The ETH study found developer-written context files did not raise success either
   (+2.4 points n.s. at up to +19 % cost). The self-generated negative is a solver writing its own packs and then not
   finding them, not a top session writing a brief.
4. **L3** is a vendor's own study; its per-cell cost is null; the gain sits in Go.
5. **L11** is one author, an arXiv preprint, one scaffold; "independent" means of the model makers only (r57-0014 asks
   for strong venues).
6. **L4**: in the source, the reuse part alone raised input tokens on GPT-5 mini (131.7 M to 149.7 M) while carrying most
   of the resolution gain (C05).
7. **Cost units**: A (3.2 M a task-run) is a computed stand-in, R (4.7 M) is borrowed from a sample reader. This run's own
   helpers of kinds run, read and collect averaged 1.55, 2.05 and 2.80 M [c, `RUN:run/tokens-run.txt`], so R is likely
   generous. Hours (77-93 M an hour) are the closing plan's estimate; this run moved about 170 M an hour of active time
   [c], but pilots are bound by the check (mean 283.8 s) and containers, so pilot hours are unknown.
8. **Caps** at 2.3x the expected (the build's overrun, S18) disagree with this run, which came in at 0.53x its expected.
   Neither supports a fixed factor: a pilot's cap is set from A measured on its first three task-runs [j].
9. **D1** as designed is below its own floor of three runs per arm (a sizing pilot, no effect claimed); **D3**'s 24 GB fit
   rests on weights only.
10. **Sinks with no lead**: S6 halts and S9 memory, the time and throughput sinks second in r57-0003's order.
11. **Records**: 27 removed record ids are still named 36 times by run records; 4 of 114 closing records failed the check.

## 4. Coverage

Graphs and knowledge graphs got the widest coverage, as r57-0047 asked: 4 parts and a map; 20 of the 24 keys the graph
field owns; 256.0 M tokens, 31.7 % of the run and 36.0 % of the research units [c]; 280 of 791 saved paper folders; 21 of
58 leads. The keys read span code-graph tools in agents, graph against embedding, document KG extraction, budgeted
subgraphs, repository maps, index scale, GraphRAG evaluations, graph build, incremental indexes, symbol indexes, semantic
code KGs, graph algorithms, test impact, co-change, cross-runtime edges, KG reasoning agents, graph schemas, flow graphs
and slicing, graph query agents (`RUN:fields/2m-graphs/PARTS.md`). Encoders and memory got 2 parts each (10 of 16 and 10
of 14 owned keys; 131.1 M and 131.7 M); the other four fields one part each (39.8-63.9 M).

Not covered: the keys past the part bounds (`run/config.json` split: 5 keys a part, at most 4, 2, 2 parts).
- Graphs (4): graph grounding and hallucination rates (the one graph key aimed at the tree's goal); incremental and
  deletion-capable GraphRAG; temporal and versioned code graphs; cross-repository graphs.
- Encoders (6): learned fusion; temporal graph models; data-scale crossovers; hypergraph encoders; rule learners; the best
  training regime of KG embeddings (whether it changes the earlier embeddings null, x09-0306).
- Memory (4): further memory systems; semantic caches; self-hosted KV-cache reuse; neural memory.
Cost to cover the 14: 4 parts, 221.5 M at this run's mean part [c] (392 M at the plan's 98 M, 600.4 M at the limits);
about 950 M of the 1.9 B cap was left. Why: the part bound, not the token cap, set what was read.

The 18 keys "named for another field and not read there" are matched by key name. Most of their topics appear in the
owning fields' own collect files (CodeQL and Datalog in f5, LocAgent and G-Retriever in f3b, Zep and A-Mem in f4a and f4b)
[observed by search; depth not judged]; semantic caches and KV-cache reuse appear only in the memory map.

## 5. Cost against the plan

| | plan (r57-0424, `run/config.json`) | actual | |
|---|---|---|---|
| run tokens | about 1,515 M (1,274-1,748) | 807.62 M, 44.92 M fresh (5.6 %), 7,057 calls, 301 helpers | 53 % |
| with the preparation | about 1,665 M; cap 1,900 M | 949.2 M (preparation 141.6 M) | 50 % of the cap |
| 12 parts and fields | 98 M each | 39.8-66.5 M, mean 55.4 M | 41-68 % |
| 3 maps | 42.8 / 28 / 28 M | 24.9 / 12.1 / 10.5 M | 37-58 % |
| sheet | 9.8 M | 4.55 M | 46 % |
| closing | 214.8 M (limit 395.6) | 70.93 M | 33 % |
| coordinator (Fable) | 15.3 M (limit 30.3) | 20.10 M | 131 %, the only unit over |
| hours | 7.5-11.2 h, three units at once | about 4.75 h of running: 18:08-19:18 UTC on 11-21, 12:33-16:08 on 11-23; 46 h wall with the planned weekend hold | under |
| all-models meter | about 24.4 points next week | 688.6 M after the reset, about 11.1 points at 62 M a point [c]; the meter read 22 % at 15:20 UTC with other use | under |
| Fable meter | about 2.7 points | 11 % at 15:20 UTC; the coordinator's 20.1 M is about 3.5 points at 5.7 M a point [c]; the rest is not attributed in the run's logs | over, cause open |

Every unit returned DONE on its first start: no restart, no hang (`run/hang.log`), no refused start. Tokens per unit as in
HAND-BACK "Tokens per unit". Downloads (about 1.12 GB planned) not read here.

## 6. Pipelines and memory tier, in one view
- Quality (the tree): 14 leads; first L11, L8, L6, then D1 Phase A and L14. None needs the card.
- Tokens, router: 14 leads; first L24-L25 and L2-L27. Local models (L23, L33, L49, L50, L55) fit 12 GB but act on cached
  re-reads that already cost about 1 % each on the meter: little gain here.
- Tokens, graph: 21 leads; first L5, then D2 Phase A (12 GB), L43, L45. 24 GB only for D3 (L34's 7B), HAFix, GREPO.
- Tokens, library: 9 leads; first L38, L4 inside L5.
- Time: L22 only. Memory: none reduces S9.

## 7. For the owner
- approve: the first wave of seven replays, in this order: L11, L8, L6, L24 with L25, L2 with L27, L5, L38. About 37.6 M
  expected, cap 87 M; no card, no download, no install; each under 2 h. The other six of the run's ten (28.2 M) after it.
- approve, later, each after the first wave: D1 Phase A 70.5 M; L14's held-out test about 28 M plus the optimizer; D2
  Phase A 4.7 M plus card hours and the 0.55-1.2 GB weights (named with source and size first).
- approve: cover the 14 keys past the part bounds (graph grounding and hallucination first): 4 parts, about 222 M at this
  run's rate, cap 600 M at the parts' limits.
- cap: each pilot's cap is computed from A measured on its first three task-runs, not from a fixed factor.
- fact: whether the university's 24 GB card can be used, and from when (needed for D3 only, after D2).
- For the top session (facts to read, not the owner's): the check suite's language (decides L22); what drew the Fable
  meter to 11 %.

## Records (proposed, for the top session to write)

1. kind fact, status measured. "The research run 2026-11-harness-leads ended 2026-11-23 16:07 UTC with all 16 units DONE
   on their first start: 807.62 M tokens (44.92 M fresh) against about 1,515 M expected (53 %); with the 141.6 M
   preparation 949.2 M of the 1.9 B cap; about 4.75 h of running against 7.5-11.2 h planned; every unit at 33-68 % of its
   estimate except the Fable coordinator (20.1 M against 15.3 M)." Evidence: `RUN:closing/HAND-BACK.md#Tokens per unit`,
   `RUN:run/config.json`, `RUN:run/STATE.md`, `RUN:run/usage.log`, this file section 5.
2. kind fact, status measured. "Graphs and knowledge graphs had the run's widest coverage: 20 of 24 owned keys in 4 parts
   and a map, 256.0 M tokens (31.7 % of the run), 280 of 791 saved paper folders, 21 of 58 leads; 14 keys past the part
   bounds were not read (graphs 4, encoders 6, memory 4), set by the bound of 4, 2 and 2 parts, not by the cap (about 950 M
   left)." Evidence: `RUN:closing/HAND-BACK.md#Not covered`, `RUN:fields/2m-graphs/PARTS.md`, `RUN:run/config.json`
   (split), this file section 4.
3. kind hypothesis, status reasoned. "Test first, by expected gain per token of test cost: quality L11 (4.7 M), L8 (4.7 M),
   L6 (9.4 M); router L24 with L25 (4.7 M), L2 with L27 (4.7 M); graph L5 (4.7 M); library L38 (4.7 M); together about
   37.6 M, cap 87 M, no card; agent pilots (192-389 M) only after them." Evidence: this file section 1.
4. kind result, status quoted. "The quoted figures of L1, L2, L3, L4, L5, L6, L8, L11 and L24 stand at the cited lines of
   the saved paper text; L29's source is single shot with oracle gold files (the hand-back omits single shot); L6's
   figures are losses with one injected faulty agent, not a detection rate; L2's +16.6 points is curated Skills against
   none, not short against long files; L3's gain sits in Go." Evidence: this file section 3 with the paper lines named there.
5. kind fact, status measured. "In the research run 301 helpers ran; the lightest took 35-52 K fresh tokens in all, which
   bounds a helper's own prefix write; at that size prefix writes are at most about 10-16 M of the helpers' 44.5 M fresh
   tokens (an upper reading)." Evidence: `RUN:run/tokens-run.txt`.
6. kind fact, status measured. "Helpers of the research run averaged 1.55 M tokens (run), 2.05 M (read), 2.80 M (collect),
   3.72 M (analyse), 5.95 M (refute); the run came in at 0.53x its expected tokens, against 2.3x in the build of
   2026-11-19/20." Evidence: `RUN:run/tokens-run.txt`, `RUN:sheet/SHEET.md` S18.
7. kind open. "The Fable meter read 11 % at 15:20 UTC on 2026-11-23 against about 2.7 Fable points planned for the
   research run; its coordinator (Fable) used 20.1 M tokens, about 3.5 points at 5.7 M a point; the rest is not attributed."
   Evidence: `RUN:run/STATE.md` (meters line and notes), `RUN:run/config.json` (m_per_point_fable).
8. kind open. "Cover the 14 keys past the research run's part bounds, graph grounding and hallucination first: 4 parts,
   about 222 M at the run's mean part cost, at most 600.4 M at the limits; needs the owner's approve: and cap:."
   Evidence: `RUN:closing/HAND-BACK.md#Not covered`, this file section 4.
