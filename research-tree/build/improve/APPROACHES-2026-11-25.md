# Different approaches to "which files change together" (D4): what the plateau shows, and pipelines to test (2026-11-25)

The owner's words are at the top of `../briefs/APPROACHES-REVIEW.md`; they outrank this file. Analysis only: nothing was
downloaded, started or touched; no held-out truth file was opened. CR = `C:/Users/User/Documents/projects/card-run-2026-11/`;
RUN = `C:/research-runs/2026-11-harness-leads/fields/` (field reports f2a-f2e, f3a-f3d; claims cited as f3c C42 and so on).
Marks: [c] computed here from recorded figures; [j] judgment; "not recorded: to collect" = the record has no figure.

## 0. The answer

- **What the plateau shows.** The 22 graph-network settings, the learned ranker and the temporal models all see the
  same thing (one seed file's path, the co-change history before the block, imports and folders, weak text), are asked the
  same one-shot question, and are trained on the same few labels. On that input, counting already recovers most of what
  history can reach: tuning recall@10 of the counting arm is 0.538 / 0.316 / 0.680 against 0.697 / 0.342 / 0.787 of truth
  files that have any earlier co-change with the seed (FixFlow / clinic / zulip) [c, rough: a per-task mean against a pooled
  share]. And the graph network's pair head is given the counting features directly (`code/U5/u5lib.py:17-24`, `:166-175`),
  so every setting is mostly a learned function of counts; the 22 settings vary only the part that adds little.
- **What it does not show.** It does not show that graph models, temporal models or larger models fail at this problem.
  No model was given the information that the unreached truth files depend on (the content of the change, calls and
  symbols, route-and-client pairs), none was trained against hard negatives, none was asked a different question, and the
  differences (0.004 pooled P@10) are inside one-seed noise and the bootstrap width on 260 tuning commits. "The limit is the
  signal" holds only as "the limit is the signal in co-change history", and that narrower form is still to be measured
  (section 1.3, checks 1-4).
- **What to test first**, ranked (section 6; argued from past results in section 3): T1 the plateau checks (CPU and under 0.5 card-hours, tonight); T2 the change
  content and code structure as new inputs (CPU; probe tonight, full form a round of its own); T3 a graph-plus-language-model
  pipeline with a verifier, a 32B teacher distilled into small parts (about 1.5 card-hours for the probe, about 16 for the
  full arm); T4 the same parts joined differently (routing by history, hard-negative specialists, several seeds).

## 1. What the plateau does and does not show

### 1.1 What the three D4 families share (read from the code)

| | U4 B2 (LambdaMART) | U5 B4 (GraphSAGE / GAT) | U6 B5 (DyGFormer, TGN) |
|---|---|---|---|
| query | one seed file (a modified file of the commit) | same | same |
| not given | the commit's own message, the seed's diff, the task text, any call or symbol fact | same | same |
| history | co-change pairs strictly before the block (`runbig/card/d4/d4lib.py:68-80`) | same, as weighted edges plus import and folder edges | one event per file pair per commit (pair stream; a commit-node stream built later) |
| text | TEXT (tf-idf of earlier commit messages per file, `d4lib.py:123-149`); CONTENT_COS (Qwen3-0.6B file vectors, empty for 88-99 % of FixFlow and clinic training cells, U4 report note 2) | Qwen3 or SweRank file vectors as node features | Qwen3 file vectors as node features |
| structure | SAME_STEM, TEST_PAIR, FOLDER_DIST, IMP_SC, IMP_CS, PPR | import and folder edges | none beyond co-change |
| pair inputs | all of the above | **the same count, age, name and import features as B2**, in the pair head | four count features per event |
| training target | lambdarank on full lists, truncation 30 (`code/U4/rank.py:96`) | softmax of 1 positive against 5 or 20 negatives drawn uniformly from all non-truth candidates (`code/U5/train.py:87-91, 161-170`) | DyGLib's next-event loss, default random negatives |
| training data | FixFlow 303 tasks, clinic 214, zulip 7,989 (100 of 1,044 blocks) | same blocks | FixFlow 3,865, clinic 5,994 pair events before tuning |
| scored | P@10 per commit, mean over seeds; tuning 34 / 34 / 192 commits | same | same |

### 1.2 Which explanations fit 22 settings landing together

1. **The input (fits best).** Pair counting already reaches about 77 / 92 / 86 % of the truth that history can reach at all
   [c, rough, from the figures in section 0]. What is left is 30 / 66 / 21 % of truth files with no earlier co-change
   (CANDIDATES G2). Of all truth files, 8.5 / 45 / 11 points sit within two hops of imports and folders (`CR/d4/out/pretest1.json`),
   and B2 is the arm that uses them: its clinic recall 0.432 is above the 0.342 that history can reach, so its clinic gain comes
   from structure features, not from learning counts better (U4 report). The graph network sees structure only as imports and
   folders: no calls, symbols or routes. In FixFlow, 158 of the 160 co-changed pairs the import graph cannot reach are
   cross-runtime (f2d C21).
2. **The architecture is held constant where it matters (fits).** The pair head concatenates the two node vectors with the
   count features (`u5lib.py:175`). Text node features add 0.002 (0.1314 against 0.1291 with none), so the node part carries
   little and the head is close to an MLP over counts. Layers, width, attention and negatives change the part that carries
   little. This explains why size does not move the score; it says nothing of a model given other information.
3. **The training target (likely contributes).** Uniform negatives are mostly files that never changed with the seed, which a
   count already rejects. The hard part of P@10 is the order among known partners (CANDIDATES G1) and the novel truth files; the
   loss pushes on neither. DyGLib's default is random negatives too (it offers `historical` and `inductive`,
   `CR/tools/DyGLib/utils/load_configs.py:49`). Hard negatives from the counting top-K were never tried.
4. **The evaluation (contributes).** P@10 has a ceiling of min(|truth|, 10)/10 per seed; zulip's tuning seeds have about 3.9
   truth files each (2,366 over 609 tasks, pretest1) [c], so its ceiling is far below 1. The ceiling per repository: not recorded,
   to collect. The 22 settings span 0.0039 pooled; B2's pooled interval half-width is about 0.0035 (U4 report); each setting ran
   one seed. Most of the spread cannot be told from noise.
5. **The data (contributes on two repositories).** FixFlow and the clinic give 303 and 214 training tasks; U6's streams there
   hold about 4-6 thousand events. Zulip used 100 of 1,044 blocks. A graph network or temporal model learns little from this.
6. **The architecture family as such (does not fit as the main cause).** In the record, learned graph models gained where they
   added a signal the baseline lacked (f3c answer 1: issue text, history anchors, other repositories). Over the same co-change
   signal a learned ranker gains 4.3-10.2 % relative (f3c C42), about what B2 shows.

### 1.3 Checks that tell them apart, cheapest first (all on tuning; held-out untouched)

1. **Ceilings and strata** (CPU, seconds, existing U4 tables with B4 and B5 columns): per repository the P@10 and recall@10
   ceilings; each arm as a share of ceiling; each arm scored separately on truth files with and without earlier co-change. If
   every learned arm ties counting on "with" and only B2 gains on "without", explanation 1 stands.
2. **The U5 ablation** (4 runs, under 0.5 card-hours): head on counts alone (no graph), graph alone (no count features), two
   more seeds of the frozen setting. Counts alone within 0.002 of 0.1314 means the graph part adds nothing in this form.
3. **Hard negatives** (2 runs of U5): negatives from the counting top 50. A gain of 0.01 or more on "with" makes the target a cause.
4. **New information, smallest form** (CPU): one feature of the change content (design B in section 4, step B1) added to B2. A gain on
   "without" shows the information, not the model, was the limit.

## 2. The classical problems this is an instance of, and their standard solutions

| problem, field | strongest forms in the record | what they need as input | assumption that fails on our data |
|---|---|---|---|
| **Change-impact analysis and logical coupling** (software engineering: mining software repositories) | Set rules TARMAQ (a correct file in the top 10 for 65 % of unseen queries, ROSE 0 %, f3c L4, C30); transitive rules +13.96 % recall (C34); commit-text match GitCF Hit@10 0.322 to 0.403 (f3c L5, C32); learning to rank over co-change, path, author and text features, NDCG@5 0.8399 against 0.8023 for the count (f3c L7, C42); time decay up to +80 % MAP on one project (C26); static impact by name reachability (f2c L1) | history with thousands of commits (MAP knee near 15,000, f2c L10, C76); method level; for static impact a name or call graph | FixFlow and the clinic have 429 and 376 commits (pretest1); our task is file level from one seed; static graphs miss 24-30 % of call edges (f2b C49) and every cross-runtime pair (f2d C21) |
| **Basket completion, next-basket and session recommendation** (recommender systems) | EASE (Steck 2019; named, figure not in the record; ours sits at the top of its lambda grid and collapses to a weighted count, U4 note 3); item-kNN, SLIM, sequence models (SASRec, BERT4Rec, TIFU-KNN): not recorded, to collect | many baskets per item; stable item identity; the basket's other items as the query | items are born and renamed (21-66 % of truth has no history with the seed); baskets are tangled commits; we give one item, not a partial basket |
| **Link and hyperedge prediction in a growing graph** (graph learning) | Temporal GNNs (TGN, DyGFormer; on commit streams Hit@5 21.65-25.39, no counting arm, f3c L14, C23); EdgeBank counting beats neural models on high-surprise streams (C71-C75); heuristics Katz, resource allocation rank top three under hard negatives (f2c L13, C48); inductive ULTRA zero-shot 0.395 against 0.344 MRR, weaker transductively (f3b C50-C51); NBFNet +22 % inductive Hits@10 (f3c L12); rule learners AnyBURL equal tuned embeddings on CPU (f2c L12, C44); hypergraph networks gain little where pairs say the same (f3c C77-C78); hyperedge models (HyperSAGNN, CHESHIRE): not recorded, to collect | long event streams; evaluation with historical or inductive negatives; for inductive forms many relation types or graphs | our streams are short on two repositories; surprise 0.21-0.66; few relation types (co-change, import, folder); our scoring is a hyperedge completed from one node, not the next edge |
| **Bug and change localisation from text** (IR for software engineering; D2's family) | fine-tuned code retrievers 1.4-2.8 times BM25 (f3a C01, C09); tuned listwise rerankers +6-15 points (f3a C15-C17); graph locators with text and history GAT Hit@5 31.51 (f3a L8, C34-C36) | the query text (issue or task); repositories with thousands of issue-to-edit pairs | D4 as posed has no query text; the clinic has about 189 pairs |
| **Retrieval over a code knowledge graph with a language model** (graph RAG) | parser-built graph plus one-hop tool: Pass@1 58.14 against 51.83 without (f2e L5, C79); KGCompass issue and PR nodes 58.3 against 38.7 % (f2c L11); trained one- or two-call path retrievers beat an 11.6-call traversal agent, 92.6 against 75.1 Hit at 231 against 7,069 input tokens (f2d C37); LLM-written graphs cost 19.75-45.64 times and skip files (f2b C48), so edges are parsed, not written (f2c L8) | a parsed symbol graph; a generator model; for trained retrievers labelled paths | tasks in the record are generation or QA, not file sets; graph context changes tokens both ways (f2e answer 8); model-written Cypher fell below BM25 with an open 72B model (f2d C79-C81) |
| **Hallucination control by grounding** (code generation) | project dependency context plus an existence check: MARIN -73.56 % relative fabricated-API rate against RAG; the check alone a further 11.5-12.2 points (f2e L1, C02, C03); AST existence check recall 0.876 at precision 1.0 (C05); a pre-execution query gate (f2d C85) | a parser index; a deterministic checker | the checked errors are names that do not exist; real-but-wrong picks pass (f2e C102) |
| **Learning to rank and stacking** (IR) | LambdaMART over many signals (B2; f3c L7); one tuned convex weight beats RRF on every dataset (f3c L6, C38) | labelled queries | few labels on two repositories |
| **Knowledge distillation from a large teacher** (machine learning) | a 7B fine-tuned on 768 trajectories at $0.05 against $0.66 per example (f3c L10, C15-C18); distilled history memory +7.1 against raw pairs +0.56 (f4b C98); listwise-ranker distillation (RankGPT-style teachers into small rankers): not recorded, to collect | teacher outputs on many queries; a student family | none tested here; the teacher must beat the student's baseline first |

**What the table says for D4.** Every field that reports large gains feeds its model information our D4 models do not get:
the query text, method-level history, a parsed symbol graph, or many repositories. The field nearest our exact question
(change impact from one changed file) reports its best results with set rules, commit text and learned ranking, which is
where B2 already sits. So the different approaches are mostly different inputs and different questions, then different joins.

## 3. What past results say

Each result is named with its file and the lens it was scored against. A result is about the form tested on the
repositories tested; "rules out" below never reaches past that form.

| # | result (file) | lens | supports | rules out (that form only) | leaves open |
|---|---|---|---|---|---|
| R1 | Embeddings test: RotatE, ComplEx-N3, TransE, CompGCN and routed specialists, each fused with counting plus rooted PageRank; best +0.0023 P@10, all "match"; the models "mostly recover the co-change facts they were trained on" (`docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md` sections 1, 3) | FixFlow only, 50 tuning commits, P@10 in a two-hop pool and unrestricted, identity embeddings, no text, fixed fusion | a model trained on the co-change graph learns back what counting already has | graph embeddings of the same graph as an addition to counting on FixFlow | other inputs; learned fusion; hard negatives; other repositories |
| R2 | Graph test: a typed store with definitions +0.076 recall over scripted search and +0.063 over the changed-together floor; outside the mobile app +0.001; hop depth moved recall by 0.346, ranking modes by at most 0.023; engines identical (`docs/program/GRAPH-TEST-RESULT-2026-11.md`, answers 1-4) | FixFlow, 75 held-out commits, recall of files and definitions inside an 8,000-token answer, no agent | structure beyond co-change adds where code links the files (the mobile app); **which candidates are reached matters about 15 times more than how they are ordered** | the graph engine as a lever | other repositories; whether D4's models would gain from that typed graph (it is not on disk for D4, `runbig/card/d4/README.md`, arms) |
| R3 | Card D4: ComplEx-N3 -0.053 and AnyBURL -0.074 pooled alone, fused 0.000 and -0.002; best untrained INV365 / PC / RRF; DEC90 +0.027 on the clinic (`research-tree/build/runbig/d4-report.md`) | three repositories, 598 held-out commits, P@10; the learned arms saw co-change as binary facts (`refute/CARD-D4.md` item 1); pooled gate 82 % zulip (item 6) | decay and the 1/\|e\| weight are where counting's strength lies; knowledge-graph embedding and rule mining over co-change, imports and folders do not add | those forms given binary facts | counts given to the learned forms (done since by U4, U5); GraIL; text; other edges |
| R4 | Card D2: shelf Qwen3 +23.2 / -13.8 / -0.8 and SweRank +14.5 / -11.3 / +1.7 Acc@10 over BM25; co-change by fixed RRF -14.5 on FixFlow (`research-tree/build/runbig/d2-report.md`) | issue text to file, Acc@10, shelf settings, 391 held-out queries | the value of one signal swings by repository; a fixed fusion of history can hurt | shelf embedders as a single arm at the +6 gate | learned fusion (answered by R5) |
| R5 | U1: LambdaMART over BM25, both dense scores, history votes, co-change from text seeds, path and file features: A2 0.919 Acc@10 against BM25 0.713, five-fold 0.916; P@2 0.497 against 0.256 (`improve/units/U1/READY.md`; no breaking finding, `refute/IMPROVE-U1.md`) | D2 tuning, 217 queries, in-sample for the pick | **the largest gain in all our work came from joining many signals in a learned ranker**, not from a bigger model | - | held-out (U7) |
| R6 | U3: SweRankLLM-Small (7B, 4-bit) reranking A2's top 30: Acc@10 +0.014, P@2 -0.022, clinic P@2 0.351 against 0.446 (`improve/units/U3/report.md`, as `EXPAND-2026-11-25.md` section 1 reads it) | D2 tuning sample, 4-bit, query cut at 1,024 tokens, the reranker sees text only | a model that sees less than the stack (no history) does not beat it | - | a larger judge; a judge given the stack's evidence |
| R7 | U4: B2 +0.032 / +0.035 / +0.006, pooled +0.013 in-sample; EASE equals the count (`improve/units/U4/report.md`; `refute/IMPROVE-U4.md`) | D4 tuning, best of 40 models, in-sample | on the clinic the gain comes from name, folder and import features (recall 0.432 above the 0.342 history can reach); on zulip the signal stops at 50 trees | EASE as a separate arm (it collapses to a weighted count) | more zulip blocks; new features |
| R8 | U5: 22 GraphSAGE and GAT settings 0.1275-0.1314 pooled; text node features +0.002; below B2's 0.138 (`CR/improve/U5/choice.json`) | D4 tuning, one seed, pair head given the count features, uniform negatives | size and attention do not move a head that already has the counts | larger forms of this network on these inputs | the graph without counts; hard negatives; other node and edge information |
| R9 | U6: DyGFormer 0.1076 and TGN 0.0393 pooled with the epoch chosen per repository, both under counting's 0.124 (`refute/IMPROVE-SYSTEM-graph.md` B1) | D4 tuning, DyGLib defaults, pair stream, random negatives, 4-6 thousand events on two repositories; the commit-node stream's result: not in the files read, to collect | temporal models trained on short co-change streams fall below counting, as the record predicted (f3c C23, C71-C75) | these defaults on these streams as a standalone arm | `historical` negatives; use as a feature in a stack; longer streams |
| R10 | U2: SweRankEmbed-Small stage 1 0.837 tuning Acc@10, from the void 2,500-commit pairs; zulip training capped at 2,500 commits, not 20,000 (`EXPAND-2026-11-25.md` section 1; `refute/IMPROVE-SYSTEM-text.md` B3) | D2 tuning, one stage | nothing yet | nothing | the whole arm |
| R11 | The testbed's context and recall machinery: "a disciplined short notes file matched the heavier machinery"; deterministic forms preferred; a script-built import graph of FixFlow matched an independent method on 441 of 441 and 678 of 678 pairs (`docs/program/HARNESS-BOTTLENECKS-2026-11.md` sections 2.4, 6) | agent sessions of one testbed; one repository for the graph | parser-built, deterministic parts are cheap and exact; model-built layers did not pay | the context machinery as built | a parsed symbol graph inside a ranking pipeline |
| R12 | Tokens: tokens = calls x window; 97 % re-reads; content fetched by reads and searches about 26 % (`docs/program/TOKEN-BOTTLENECK-2026-11.md`); the "what changed together" question is 1.8 % of product lookup cost, "where is X defined" 15.6 %, "who uses X" 4.2 % (`docs/program/GRAPH-V2-DESIGN-2026-11.md` A.1, B) | transcripts of FixFlow and the clinic | a D4 pipeline earns tokens only where it replaces lookup calls; the D4 question itself is a small share of lookups | - | whether any of D4 or D2 changes an agent's tokens or time (never measured) |

**What the results say together.**
1. **Same information, same answer, five times.** Whenever a learned model saw only what counting sees, it matched or fell
   below counting: R1 (five embedding forms, FixFlow), R3 (embedding and rule mining, three repositories), R7's EASE, R8 (22
   network settings), R9 (two temporal models). That is a strong result about the input, across families and repositories; it is
   not a result about graph or temporal models given other information, which none of them was.
2. **Every gain came from a different signal or from joining signals.** R2 (definitions in a typed graph, +0.076 recall), R5
   (a learned ranker over many signals, +0.21 Acc@10 in-sample), R7 (name, folder and import features on the clinic), R4 (text,
   where the repository suits it).
3. **Reach beats order.** R2: hop depth moved recall 15 times more than ranking modes. In D4 counting reaches 77-92 % of what
   history can reach (section 1.2); the rest is outside history, so new reach needs new edges.
4. **A model that sees less than the stack loses to it** (R6). A language model in the pipeline must be given the stack's
   evidence, or it can only re-order text.
5. **Parsed, not written** (R11; f2b C48, C50; f2c L8). The structure a design adds should come from a parser, and a model's
   claims should be checked against it.

**What each design builds on or answers.**

| design | builds on | answers |
|---|---|---|
| A, graph plus language model with a verifier | R5 (the ranker is the backbone, A2 is B2); R11 (cards parsed, never model-written) | R6: the judge is given the history and graph evidence the ranker uses, and a 32B model instead of a 4-bit 7B; R9: TGN enters as a feature with `historical` negatives, not as a standalone arm |
| B, the code's structure and the change's content | R2 (definitions and reach added recall where code links files); R7 (structure features carried B2's clinic gain); f2d C21 (158 of 160 unreachable pairs are cross-runtime) | point 1: it is the first D4 design whose models see information counting does not have; R12: the same symbol graph serves "where is X defined" and "who uses X", 19.8 % of product lookup cost, not only D4's 1.8 % |
| C, today's parts joined differently | R5 (joining signals is what worked); R8's and R9's tuning results by stratum (T1) | R8: hard negatives change what the head is pushed to learn; R3 and R7: zulip's signal stops early, so its specialist is counting itself |

**What this does to the ranking (section 6).** T1 first, because five results already point at the input, and two runs
settle whether that holds for U5 too, at almost no cost. T2 second, because it is the only lever that both earlier gains
(R2 reach, R7 structure) used and that no D4 model has had. T3 third: R6 says a judge without evidence fails, so it waits on
T2's features and the verifier. T4 last: R5 says joins pay, but B2 already joins and can already split on seed history.

## 4. Three architectures as pipelines of specialised components

The question each design answers is stated with it, because two of them change it. "D4a" is today's question (seed path
only). "D4b" adds the seed's own diff: the realistic moment, after an agent has made its first edit. "D4c" adds the task text;
the commit message stands in for it as an optimistic upper bound, since it is written after the change. The truth files' diffs
are never an input in any variant.

### Design A: graph plus language model with a verifier (aimed at fewer hallucinations)

```
seed (+ its diff, D4b) -> A1 candidate generator -> A2 learned ranker -> A3 evidence cards -> A4 LLM listwise judge -> A5 verifier -> ranked files with cited evidence
                             ^ parsed graph, history, TGN memory          ^ graph paths, commits               ^ graph + history at the cutoff
```

| component | sees | is asked | connects to |
|---|---|---|---|
| A1 generator | history at the cutoff; imports, calls, routes (design B's parser); TARMAQ set rules; TGN memory | the union of the top 50 of each source | A2 |
| A2 ranker (B2, extended) | every feature of U4 plus A1's source flags and TGN/DyGFormer scores in their strongest form (bipartite commit-node stream, epoch per repository, `historical` negatives) | order the union; keep the top 30 | A3, A4 |
| A3 evidence cards (no model) | the parsed graph and history | for each candidate: the shortest graph path from the seed, the last 3 commits it shared with the seed (sha, message), its defined symbols, about 150 tokens | A4 |
| A4 judge (large model, listwise, window 10 step 5) | seed path, seed diff (D4b), 30 cards | choose and order the files this change also needs; for each pick cite one evidence id from its card | A5 |
| A5 verifier (no model) | the graph and history at the cutoff | does each picked file exist at the cutoff; does each cited id exist and say what is claimed | output; failed picks go below every verified pick |

**How a hallucination is counted.** Before A5, per 100 picks in the top 10: (a) a path not alive at the cutoff or not among the
30 candidates; (b) a cited edge, commit or symbol that does not exist at the cutoff; (c) a cited id that exists but does not
link the two files. A5 makes (a)-(c) zero in the output, so the model's rate is read before it and the pipeline's after it.
Reported apart: picks with no citation (unsupported), and real-but-wrong picks, which only the quality measure sees (f2e C102).

### Design B: the code's structure and the change's content (information today's models never see)

```
seed + seed diff -> B1 changed symbols -> B2 symbol impact walk -> B4 learned ranker (+ counting) -> files
                    B3 cross-runtime matcher (URL literals <-> routes, payload keys) --^
                    B5 inductive typed-graph GNN over files and symbols ------------------^
```

| component | sees | is asked | connects to |
|---|---|---|---|
| B1 diff reader (parser, no model) | the seed's diff at the commit; the seed's parsed file at its parent | which symbols were added, changed or removed; which identifiers the diff names | B2, B3, B4 |
| B2 impact walk (no model) | a symbol graph parsed at the cutoff: definitions, imports, calls, references, test-to-source | files that define, call or test the changed symbols, with hop count and edge kind | B4 |
| B3 cross-runtime matcher (no model) | route definitions and URL or key literals at the cutoff | files on the other side of each changed route or key | B4 |
| B4 learned ranker | U4's features plus B1-B3 and B5 scores; method-level co-change of the changed symbols (f3c C34) | order all candidates | output (or design A's A2) |
| B5 typed-graph GNN, strongest form for this input | heterogeneous graph of files and symbols (R-GCN or HGT form: not recorded, to collect), node text, inductive, trained with hard negatives | score the seed's changed-symbol nodes against candidate files | B4 |

Where TGN fits here: not as a scorer of files, but as the memory of symbol-level change events if B5 proves useful.

### Design C: today's parts, joined differently

```
seed -> C1 router (history density of the seed) -> C2 known-partner specialist (counts, LambdaMART, hard negatives)
                                                -> C3 novel-file specialist (structure, text, GNN, trained only on novel truth)
       -> C4 merger (calibrated scores, one tuned convex weight per stratum) -> C5 set size and multi-seed update -> files
```

| component | sees | is asked | connects to |
|---|---|---|---|
| C1 router | the seed's change count, partner count, age | which stratum this seed is in | C2, C3 weights |
| C2 known-partner specialist | today's count features; negatives from the counting top 50 | order among files with history | C4 |
| C3 novel-file specialist | structure and text features, U5's GNN without counts, U6's DyGFormer where it beats counting on its stratum | rank files with no history with the seed | C4 |
| C4 merger | the two calibrated scores (f3c L6: one tuned weight beats RRF) | one list | C5 |
| C5 set completer | the list; when a second file of the change is known, both seeds | how many files to return; re-rank given two seeds (TARMAQ's multi-item query) | output |

C changes the join, the training target and, in C5, the question (one seed to a partial basket). C5 needs a variant of the
scoring defined before any run: P@10 and recall@10 with two seeds given (the second drawn at random from the truth, removed
from it), beside today's.

## 5. Bigger first, then smaller

Each design is first run at full size to find the result, then cut step by step; each cut is kept only if quality stays
inside the interval of the step before (tuning, paired bootstrap) and hallucinations do not rise.

| design | the large teacher | distilled into | the smaller end state |
|---|---|---|---|
| A | A4 = a 32B listwise reranker in bf16 (SweRankLLM-Large, already named for D2's A4L; revision, size and licence to collect) with full cards and the seed diff | (1) its order as an extra label and feature for A2 on training blocks; (2) a 0.6B cross-encoder (Qwen3-0.6B, on disk) trained on its window orders; (3) the cards cut to the fields the teacher cites most | A1-A3 + the 0.6B student + A5, no 32B at run time |
| B | the full symbol graph, B5 at its widest, and a 32B judge reading the diff and the impact walk | B5's scores into B4 as a feature; edge kinds pruned by their gain; the judge's picks distilled into B4 as in A | parser + B4, CPU only |
| C | every specialist at full size plus A4 as a third specialist | one LambdaMART over the router and the specialists' scores; then specialists dropped by importance | C1 + C2 + one small C3 |

**The seven measures at each step** (tokens reported, not money; GPU-seconds are the cost of local models):

| measure | how it is read |
|---|---|
| quality | tuning P@10 and recall@10 per repository and pooled, per stratum (with and without history), paired bootstrap 10,000; held-out once at the end |
| hallucinations | section 4's count before A5 per 100 picks; unsupported picks apart; zero after A5 by construction |
| token count | model input and output tokens per query (A4 and the student), counted from the run logs |
| token cost | the same tokens; for a hosted model it would be priced tokens, none planned |
| time taken | seconds per query at each stage, measured; build time of the parser graph per cutoff |
| throughput | queries per card-hour at the frozen setting |
| efficiency | quality gained over counting per card-second and per thousand tokens |

## 6. What to test first (ranked)

Scoring for every test, fixed before any run: D4's scorer as it stands (`runbig/card/d4/README.md`): P@10 and recall@10 per
commit, paired bootstrap; choices on tuning only; held-out once, after the round's U7 has scored; a new arm adds if +0.02 P@10
pooled over the best untrained arm, also reported per stratum. GPU-hours are on a 96 GB card [c]. The grounds of the order are the past results of section 3: T1 tests what R1, R3, R7, R8 and R9 point at; T2 adds what R2 and R7 show pays; T3 answers R6; T4 extends R5.

| rank | test | like-for-like baseline | have | missing | 96 GB card-h | build effort | tonight or its own round |
|---|---|---|---|---|---|---|---|
| **T1** | The plateau checks of section 1.3 (1-3): ceilings, strata, the U5 ablation, two seeds, hard negatives | counting and B2 on the same strata and commits | U4 tables with B4 and B5 columns; U5 code | about 150 lines: a stratum scorer, two U5 flags (no-graph, no-counts, hard negatives) | about 0.3 (8 short runs; U5's sweep used 0.3 card-h plus CPU, ESTIMATE) | small; ordinary code (Sonnet), about 2 h | **tonight**, after the round's jobs end or on copies; no download |
| **T2** | Design B, in two steps. Probe (D4b, no parser): identifiers of the seed's diff matched by BM25 to candidate files at the cutoff, as a B2 feature; and the D4c upper bound (current message against TEXT profiles). Full: B1-B4 with a parsed symbol graph | the same diff given to an untrained baseline: diff-BM25 alone and fused with counting by one tuned weight | the git repositories (CR/repos; the clinic read-only); U4's feature tables and refit path (`rank.py refit --extra`) | diffs per seed (git, CPU minutes); for the full form tree-sitter and its grammars (approved r57-0065, not fetched; size and licence to collect), the symbol graph per cutoff, the route matcher, a leak test (no truth file's diff read) | probe 0; full 0 to 0.3 (an optional 0.6B embedding of diff hunks) | probe small (half a day); full large and invariant-sensitive (Opus build, 1.5-2 days) | **probe tonight** (CPU only); the full form **a round of its own** |
| **T3** | Design A with a 32B judge over B2's top 30, verifier, hallucination count; then the 0.6B student | B2's own top 30 order (the judge sees nothing B2 lacks except the cards and the diff, so B2 also gets the diff feature from T2) | A4's listwise code (`code/U3/a4.py`), B2's frozen model | the 32B weights (SweRankLLM-Large, about 65 GB, licence to collect; siblings CC BY-NC 4.0); a card builder and verifier (about 300 lines) | probe on 300 tuning seeds: 300 x 5 windows x 3.5 s = 1.5; full tuning 975 seeds 4.7; held-out about 2,240 seeds 10.9 [c: seeds per commit 975 / 260 = 3.75 applied to 598 commits; 3.5 s a window from EXPAND section 2]; student training about 1 | medium (1-1.5 days) | probe **tonight only if** the 32B is on the pod and he approves the download; otherwise **a round of its own** |
| **T4** | Design C: router, hard-negative known-partner specialist, novel-file specialist, one tuned weight per stratum; the two-seed variant | B2 refit with the same router feature (LambdaMART can already split on seed history, so the specialists must beat that) | all score columns; T1's flags | the stratum training split; the two-seed scorer variant (defined above) | about 0.5 (U5 and DyGFormer retrained per stratum) | small to medium (1 day) | after T1 (its hard-negative and stratum results set whether C is worth building); **a round of its own** |

Expected tokens (basis r57-0173, builder unit 18.5-38.0 M; analyser 9.1 M): T1 about 8 M, T2 probe about 8 M and full about
30 M, T3 about 25 M, T4 about 15 M [j on the basis]. Rule 3 holds for every row: each run needs the owner's word, and T3's
download needs its source, size and licence named first. If the move's pod is used, the clinic's code goes to a rented card:
that is under whatever he ruled for the move, not decided here.

## 7. What can be learned tonight, what needs its own round, what stays untested

**Tonight (rented or local card, about 0.3 card-hours, the rest CPU):** T1 in full and T2's probe. Together they test the claim
"the limit is the signal": if the ceilings leave room, the ablation shows the graph adds nothing over counts, hard negatives
move nothing, and the diff feature lifts the "without history" stratum, then the limit was the input and the question, not
the model family, and design B is the next build. If the diff feature moves nothing, the claim survives one more form.

**A round of its own:** T2's parsed form, T3 (download, 16 card-hours with held-out), T4, and the distillation steps of section 5.

**Stays untested after all four** (priorities, not verdicts): hosted frontier models as teacher or judge (privacy of the clinic,
tokens); cross-repository training of a graph locator (needs tens of repositories, f3c L8); ULTRA, NBFNet and hyperedge networks;
temporal models on symbol-level events; an agent in the loop measured on the seven measures (none of D2 or D4 is measured on an
agent's tokens or time); the commit message as a task stand-in versus a real task text (no task texts exist for most commits).
