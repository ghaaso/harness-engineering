# Lane: ranking as link prediction (research and design pass for graph v2, 2026-11-13)

Scope of this lane: "which other nodes belong with this one" is link prediction and recommendation on a
heterogeneous, time-stamped graph. This note surveys that theory, says what the principled ranker is for
the repository's code graph, and tests the cheap parts of the answer on the **tuning split only**.

What I did and did not do:
- Read-only on the repository and on the build folder. No install, no download of a package, model or dataset.
  I read papers, documentation and source on the public web, by the papers' own names (no project detail in
  any search or URL).
- The only file written in the repository is this one. I ran a small pilot (section 5) with scripts that I
  wrote to the host temp folder and then copied, unchanged, to
  `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/graph-v2-pilot-ranking/`
  (`feat.py`, `ev.py`, `svd.py`; they read the facts cache and `git log` and write only pickles in the host temp
  folder). The pilot read **only the 65 tuning commits** (authored 2026-06-01 to 2026-06-30) and their
  leak-free parent snapshots. It never opened `sealed/`, `audit/`, a held-out task or a held-out snapshot.
- No agent and no model was run. I did not train a knowledge-graph embedding or a neural model (section 6.3 says
  why, and what the correct test needs).

Words used (defined once):
- **Seed**: the node an agent starts from; here a code file that is about to change. **Candidate**: a node the
  ranker may return. **Truth** of a seed (v1's T1 rule): the other existing code files changed in the same
  commit. **Pool**: the candidates the ranker is asked to order.
- **Link prediction**: scoring node pairs by how likely they are to be linked (or to be linked in future).
  **Heuristic** (index): a score computed from graph structure alone, with nothing fitted.
- **Common neighbours (CN)**: how many neighbours two nodes share. **Adamic-Adar (AA)** and **resource
  allocation (RA)**: CN where each shared neighbour counts 1/log(degree) or 1/degree, so hubs count less.
  **Jaccard**: CN divided by the size of the union of the two neighbour sets. **Katz**: a sum over all walks
  between two nodes, each walk of length L weighted by beta^L. **Rooted (personalised) PageRank, PPR**: the
  visiting probability of a random walk that restarts at the seed with probability alpha (0.15 here).
  **SimRank**: two nodes are similar if their neighbours are similar (recursive).
- **Metapath**: a sequence of node or edge types, for example file -calls_url-> route <-registers_route- file.
  **PathSim / HeteSim**: similarity measures that count metapath instances between two nodes, normalised.
- **PRA / SFE**: path ranking algorithm and subgraph feature extraction: use "which typed paths connect the
  pair" as the features of a classifier.
- **AMIE, AnyBURL, TLogic**: algorithms that mine if-then rules from a knowledge graph (TLogic: rules with
  time order). **Embedding** (TransE, RotatE, ComplEx): a learned vector per node and per relation, scored by a
  geometric formula. **GNN**: graph neural network.
- **Rolling origin**: train only on commits before time t, test on the commit at t, then move t forward.
  **Late 50**: the 50 tuning commits after the first 15 (the rolling-origin test commits in section 5).
- **P@10, R@10**: share of the top 10 that are truth, share of the truth inside the top 10. Averaged per seed
  within a commit, then over commits; intervals are 95 % bootstrap over commits (queries in a commit share truth).
- **Strength**: strong (independent, controlled, replicated), medium, weak (single study, self-reported, toy
  scale, or only an abstract or a summary was read).

---

## 1. Short answer

1. **The principled ranker at this size is small.** Generate candidates from the typed graph (2 hops over the
   file-collapsed graph, plus every co-change neighbour); score each with a handful of documented features; combine
   them with either a zero-parameter reciprocal-rank fusion or a strongly regularised logistic regression refitted
   on earlier commits only (rolling origin). On the 65 tuning commits (section 5), **two signals carry almost all
   of the ordering power: rooted PageRank over the typed graph, and co-change evidence.** A 25-feature logistic
   model scored the same as a 2-feature one (difference +0.001 P@10, 95 % interval -0.007 to +0.009). The fusion
   beat PPR alone by +0.030 P@10 (interval +0.015 to +0.044), and the 25-feature model beat a floor that uses only
   directory, slice, runtime and test flags inside the same pool by +0.021 (+0.010 to +0.033).
   The headroom to a perfect ordering inside the pool is large (0.356 oracle against 0.233), so there is
   something to gain, but not from more of these features at this history length.
2. **Features worth keeping:** PPR (Katz is equal), the hop count, co-change confidence with support and
   recency, RA as the single common-neighbour index, same slice, same runtime, test flag, and the kind of the
   direct edge. **Drop as separate features:** CN, AA, Jaccard (correlated 0.65 to 0.95 with RA; the full-fit
   coefficients flip sign between them), SimRank (cost, and a bias the PathSim paper documents), preferential
   attachment/degree (it scored at the random level, 0.140 against 0.132). PathSim/HeteSim belong only to the
   "other half of a contract" queries, as an optional test.
3. **Embeddings and neural models are not justified at this size, but that is a prediction, not a measurement of
   RotatE.** The documented regimes where they win have 14 to 70 times more triples (FB15k-237: 272,115 training
   triples; HGB link prediction sets: 141,521 to 244,986 edges; this graph: 18,875 edge rows) and, for the
   rotation family, a task of completing (head, relation, ?) with many training instances per relation. A
   linear latent model (rank-64 spectral similarity of the typed graph) matched PPR and added nothing in fusion
   (+0.001, interval -0.005 to +0.006). Where rule- and path-based methods are compared with embeddings in the
   literature (AnyBURL, ComplEx-N3 as the only embedding peer; SFE over PRA), the path side is at least equal
   and is the form an agent can read as an explanation. The owner's RotatE experience transfers when the
   graph is dense (many triples per entity); this one is at a density of 6.9 triples per node against 37 (FB15k-237).
4. **"What will break" is a different question with a different ground truth.** Co-change truth (same-commit
   files) mixes forced edits, coincident edits and tangled commits. "Break" needs directed dependents and an
   outcome: a test that fails, a fix that follows. Both can be built here from git plus differential test runs
   (section 6.4). Do not train a break ranker on co-change labels, and do not mix the two lists.
5. **No install is needed for the recommended ranker.** PPR, Katz, RA, fusion, logistic regression with a ridge
   penalty and the rolling-origin harness are plain code (numpy is already present in the host Python; the pilot
   used nothing else). Installs are needed only for optional arms: scikit-learn or LightGBM (a learned-to-rank
   arm), AnyBURL (a rule-mining arm, a Java jar), PyKEEN with PyTorch (an embedding arm). Section 7 lists them
   for the owner to decide.

---

## 2. What the two earlier rounds missed or got wrong in this area

First round (`research/lane-algorithms.txt`, `critic.txt`, `verify.txt`):
- **Ruled out trained graph models in one line** (`lane-agent-graphs.txt`: "Do NOT use ... trained graph models
  (CGM, GNN)") with no evidence about link prediction on small graphs. That is a conclusion without a source;
  the evidence exists (section 4.5) and mostly agrees, for reasons that are about size and density, not about
  principle.
- **Compared rankers by hand-picked fusions** (weights 0.5, 1 and 3, alpha 0.15 and 0.30) on 45 held-out commits
  with overlapping intervals. `critic.txt` already flagged tuning on the test commits. Neither lane asked how
  such a combination should be built (feature-based fusion, learned weights, rank fusion) or how much a fitted
  combination can be trusted with 45 to 65 independent commits.
- **Treated "co-change" as one number.** The literature (section 4.7) separates support, confidence, recency
  (history age), transaction size and rule aggregation, and gives measured defaults: transactions above 8 files
  filtered, history age near zero, about 25,000 commits before applicability levels off. The lane quoted the
  25,000 but did not draw the consequence: this repository has 233 non-merge commits (140 usable), about
  0.5 % of that, so co-change is a sparse feature that covers only some seeds (section 5: 36.1 % of seeds have
  no co-change candidate at all) and must be one signal among several.
- **Scored by a metric that cannot see ranking.** `graph-v2/v1-audit.md` shows that at 2 hops the whole reach of
  a median task fits inside the 8,000-token answer, so ordering could not change v1's primary score. My pilot
  fixes the list length (P@10, R@10) so that ordering is visible.
- **Left out of the evidence base:** link-prediction evaluation theory (hard negatives, ties, leakage by random
  split), supervised path models, rule mining, temporal link prediction, learning-to-rank at small sample size.

Second round (`widen/`): it widened the question (agents, memory, summaries, evaluation) but still treated ranking
as a detail. Its own evaluation lane asked for rolling-origin splits (`critique-assumptions.md` line 319); it
did not say how to avoid overfitting a model trained on those splits. It did not separate "changes together"
from "breaks".

---

## 3. Scale of this problem (measured here, tuning split)

- Frozen-commit facts (`a31924a`): 5,464 nodes, 18,875 edge rows, 36 edge kinds, 25 node kinds, 514 file nodes.
  The brief's "about 16,500 edges" is the canonical loader's count, which merges symmetric history rows; I did
  not reproduce that count. Triples per node (2E/V, Pujara et al.'s entity density): 6.9. File-collapsed
  semantic degree (without defines/contains/history): mean 6.2, median 4, 90th percentile 14, 12.1 % isolated.
- Tuning: 65 commits (of 140 usable), 388 seeds, 2,924 (seed, truth file) pairs, 7.5 truth files per seed on
  average, a median of 5 existing code files per commit, a maximum of 22. These 2,924 pairs are not independent:
  every seed of a commit shares the same truth. **The effective sample is 65 commits.** I recomputed the counts
  from `git log` and they match `tasks/README.md` (388 / 65).
- Pool: of the 2,924 truth pairs, **27.4 % sit at hop 1, 41.9 % at hop 2, 22.8 % at hop 3, 7.1 % at hop 4 and
  0.8 % beyond**, on the file-collapsed typed graph (undirected, without the slice-membership edges and without
  history edges). Within 2 hops: 69.4 %; within 3: 92.1 %. A co-change edge exists at the parent for 25.6 % of
  the pairs; "within 2 hops or co-changed" covers 71.3 %. Mean pool size within 1, 2 and 3 hops: 8.1, 45.7 and 120.8
  files (medians 7, 41, 117). So depth 2 is the cheap pool (71 % ceiling for 46 candidates), and depth 3 buys
  21 more points of ceiling for 75 more candidates.
- Direct (hop 1) connections by edge kind, in pairs (a pair can carry several kinds): imports 744, calls 544,
  test_calls_route 82, overrides 56, uses_constant 54, writes_table 34, reads_setting 28, renders 24, reads_table
  22, writes_column 18, calls_url 16, contract 12, includes_router 10, registers_screen 8.

---

## 4. The documented theory, family by family

Each row says what was measured, on what, against what, and whether the benefit exists at this size.

### 4.1 Neighbourhood and path heuristics

| Claim | Evidence | Source | Strength | At 5,000 nodes / 18,000 edges |
|---|---|---|---|---|
| Several simple proximity scores beat chance by factors of 40 to 50 on co-authorship graphs; sums over all paths (a Katz variant) often beat shortest path and CN; even the best predictor was right on only about 16 % of its guesses; on a narrow community (STOC/FOCS) no method beat random by more than about 7 | Five arXiv co-authorship graphs, 2,122 to 5,469 authors and 5,724 to 41,852 edges (labels misaligned in my text extraction); training 1994-1996, test 1997-1999 (a time split); core authors with at least 3 papers in each period | Liben-Nowell and Kleinberg, JASIST 2007, `people.csail.mit.edu/dln/papers/link/paper.pdf` (text extracted with pdftotext; Figure 1 and sections 1, 6, 7 read) | strong for the direction (the paper everyone replicates); medium for the numbers (one data family) | Same scale as this graph. Also a warning: a narrow, dense community (one repository, one team) is the hard case |
| Among nine local indices CN is best overall and AA second; RA beats AA by 0.030 AUC on USAir (0.955 vs 0.925) and 0.009 on political blogs (0.931 vs 0.922), ties it on the others; the gap exists only with high clustering and high degree heterogeneity; at small average degree RA and AA are nearly identical | Six networks (332 to 5,022 nodes), AUC, 90/10 random split, 10 repeats | Zhou, Lue, Zhang, Eur. Phys. J. B 2009, arXiv 0901.0553 (ar5iv) | medium (random edge split, AUC only) | Applies; expect RA to be marginally best of the three, and the three to be correlated |
| Global indices (Katz, average commute time) are more accurate but costly on large graphs; quasi-local walks (local path, superposed random walk) give the best accuracy-cost trade; preferential attachment is below chance on physical networks (0.446 on the power grid); score ties are severe on sparse graphs (on the router network CN scores 99.59 % of pairs zero) | Survey tables over the same six networks plus C. elegans, Yeast, NetScience | Lue and Zhou survey, Physica A 2011, arXiv 1010.0725 (ar5iv; last 20 k characters unread) | medium (a survey of the same authors' tables) | Cost is irrelevant at 5,000 nodes (full PPR for one seed takes milliseconds); ties matter: the ranker must break them explicitly (see 4.8) |
| A "gamma-decaying" theory: Katz, rooted PageRank and SimRank can be approximated from the h-hop subgraph around the pair with error shrinking exponentially in h (walks of length up to 2h+1 captured); the learned model SEAL (a GNN over that subgraph) beat the best heuristic on 7 of 8 graphs, for example Power 76.15 to 87.61 AUC, Router 56.43 to 96.38, Yeast 92.76 to 97.91, USAir 95.77 to 96.62 (PageRank tied it on C.elegans 90.32 vs 90.30) | Eight graphs, 297 to 5,022 nodes, 2,126 to 16,714 edges, **no node types**, 90 % of the edges as training positives, random negatives | Zhang and Chen, NeurIPS 2018, arXiv 1802.09691 (ar5iv) | medium (self-reported; random negatives, which later work shows flatter learned models) | The sizes match this graph, but the positives do not: they trained on 90 % of 2,000 to 17,000 edges; here the supervised signal is 65 commits |
| Under hard, heuristic-selected negatives the learned models' margin shrinks: on ogbl-collab (235,868 nodes) Katz 6.31 and RA 6.29 MRR beat GCN 6.09 and SAGE 5.53; on ogbl-ppa RA 28.34 beats SAGE 27.27 and GCN 26.94; but on Cora GAE 18.32 beats AA 11.91 and on Pubmed SAGE 9.40 beats Katz 3.01 | Same hyper-parameter search for all methods, original vs "HeaRT" negatives | Li et al., NeurIPS Datasets 2023, arXiv 2306.10453 (html; first 100 k of 122 k characters read) | medium to strong (independent, matched tuning) | Mixed: heuristics win where common-neighbour structure dominates (collaboration, protein interaction); GNNs win on feature-rich citation graphs. A code graph is the first kind for structure and the second kind for text |

Reading for this graph: Katz and PPR are equivalent to each other in the pilot (-0.003 P@10, interval
-0.010 to +0.003) and both beat the common-neighbour family (+0.02 P@10 over CN). Preferential attachment is a
trap on a graph where "popular" files (core/db.py, api.ts) are hubs, not partners.

### 4.2 Heterogeneous forms (metapaths)

| Claim | Evidence | Source | Strength | At this size |
|---|---|---|---|---|
| PathSim = 2 M_ij / (M_ii + M_jj) over a **symmetric** metapath; it removes the "visibility" bias of P-PageRank (favours popular objects) and SimRank (favours rarely linked ones); ranking judged better on 15 labelled queries | DBIS subset (464 venues, top 5,000 authors), nDCG; the full DBLP (710 k authors) for speed only | Sun, Han, Yan, Yu, Wu, VLDB 2011 (pdf, text extracted) | weak to medium (15 queries, authors' labels, one domain) | Applicable only to same-type peer questions (files that call the same route, migrations that touch the same table) |
| HeteSim extends this to asymmetric paths and mixed types; margins over PCRW are small (AUC 0.8111 vs 0.8030 on one conference, clustering NMI 0.7235 vs PathSim 0.6663); ranking comparison qualitative | ACM (about 12 k papers), DBLP (14 k papers), IMDB | Shi et al., arXiv 1309.7393 (ar5iv) | weak to medium | For "file to test" style asymmetric questions |
| Simple homogeneous GNNs (GCN, GAT) beat the specialised heterogeneous GNNs (HAN, HGT, R-GCN, GATNE) when they are given proper inputs; link prediction ROC-AUC on Amazon: GCN 92.84, HGT 88.26, RGCN 86.34, Simple-HGN 93.40; LastFM: GCN 59.17, HGT 54.99, Simple-HGN 67.59; PubMed: GCN 80.48, HGT 80.12, Simple-HGN 83.39 | Three link-prediction sets with 10,099 to 63,109 nodes and 141,521 to 244,986 edges; 81/9/10 edge split | Lv et al., KDD 2021 "Are we really making progress" (the HGB benchmark), arXiv 2112.14936 (ar5iv) | medium to strong (independent re-benchmark) | Heterogeneity-specific machinery rarely pays; and these sets have 8 to 13 times more edges than this graph |

Reading: v1's 37 edge kinds are best used as **typed path features and per-kind edge priors**, not as a reason
for a heterogeneous neural architecture.

### 4.3 Supervised path models (the path ranking algorithm and its successors)

| Claim | Evidence | Source | Strength | At this size |
|---|---|---|---|---|
| PRA scores a pair by random-walk probabilities along typed paths, then fits logistic regression. **SFE drops the probabilities**: binary "this path type exists" features gave statistically indistinguishable accuracy (MAP .344 vs .337 on Freebase, .319 vs .303 on NELL, p .55 and .25) and enabled richer features (bigrams, one-sided paths, any-relation) and a breadth-first search; on 10 NELL relations PRA .3704 (44 min) vs SFE-BFS .4799 (5 min), p < 0.05; abstract: MAP .432 to .528 | NELL and Freebase KBs; logistic regression with elastic net, penalties tuned on a development split and the final test on a new split; paired permutation test over relations; negatives sampled by personalised PageRank similarity (hard negatives) | Gardner and Mitchell, EMNLP 2015 (ACL anthology pdf, text extracted) | medium (one group; large KBs) | Feasible and cheap: our "kind sequence" features are exactly SFE features. The negative sampler (nearby nodes by PPR) is what the pilot's pool does implicitly |
| Learning the edge weights of the random walk itself (supervised random walks) beats the unweighted walk, Adamic-Adar, common friends and degree: Hep-Ph (12,527 nodes, 118,515 edges) AUC 0.712 vs RWR 0.638 vs AA 0.606 vs CN 0.594 vs logistic regression on features 0.674 (Prec@20 4.25 vs 3.41); Facebook (about 174 k nodes) AUC 0.828 vs 0.817 | Time-split link prediction; thousands of training edges | Backstrom and Leskovec, WSDM 2011, arXiv 1011.4071 (ar5iv) | medium | The idea transfers (per-kind edge weights fitted from outcomes); with 65 commits the number of free weights must be a handful. A per-kind weight table of 36 kinds is not identifiable |
| NBFNet shows that Katz, PPR, graph distance, widest path and most reliable path are special cases of one path-sum with different operators (Theorems 1-5), and learns the operators; FB15k-237 MRR 0.415 vs RotatE 0.338; WN18RR 0.551 vs 0.476; about 3 M parameters; 6 iterations; cost per run O(T(\|E\|d + \|V\|d^2)) | FB15k-237 (272,115 training edges), WN18RR | Zhu et al., NeurIPS 2021, arXiv 2106.06935 (ar5iv; appendix E unread) | medium (benchmarks on graphs 15 times larger) | Theory: v1's PPR, metapath counts and spreading are all instances of the same algebra, so "which one" is a fitting question. Practice: no model with 3 M parameters is fitted from 388 queries |

### 4.4 Rule mining (AMIE, AnyBURL) and temporal rules (TLogic)

| Claim | Evidence | Source | Strength | At this size |
|---|---|---|---|---|
| AnyBURL samples paths, turns each into a rule, scores a rule by confidence with Laplace smoothing (pc = 5) and aggregates by maximum; in 1,000 s it reaches FB15k-237 H@1 27.34 (RotatE 23.83, ComplEx 25.72, TuckER 25.90), MRR at least .346 (RotatE .336), WN18RR H@1 45.69 (RotatE 42.60), MRR at least .492 (RotatE .475); "does not require time-consuming hyperparameter tuning" | FB15k-237 (14,505 entities, 272,115 train), WN18RR (40,559, 86,835), YAGO3-10 (123,143, 1.08 M); the embedding numbers are copied from other papers | Meilicke et al., arXiv 2004.04412 (ar5iv); IJCAI 2019 version; project page `web.informatik.uni-mannheim.de/AnyBURL` | medium (authors' own, partly copied baselines) | Good fit: rules are the human-readable form of path features; training takes seconds on 19 k triples. The smoothing constant (pc = 5) is the one idea to take even without the tool |
| An independent comparison of 16 embedding models and AnyBURL on 5 benchmarks calls AnyBURL "a remarkably well-performing model" that "consistently ranks among the best", with ComplEx-N3 the only embedding model consistently comparable; predictions with more relational-path support are better predicted by all models; facts with very low path support are rarely right; RotatE "particularly shines" on H@10 | FB15k, WN18, FB15k-237, WN18RR, YAGO3-10 | Rossi et al., ACM TKDD 2021, arXiv 2002.00819 (ar5iv; middle part read) | medium to strong (independent, 16 models) | The path-support finding is the key: embeddings do well where many typed paths already support the answer, which is where a path feature model also does well |
| Most of FB15k, WN18 and YAGO3-10 is solved by simple rules because of leakage: 142 of 1,345 FB15k relations are Cartesian-product relations; a single simple rule scores FHits@1 71.6 % against 73.8 % for the best embedding on FB15k, 96.4 % against 94.6 % on WN18, and 51.6 % on YAGO3-10 (above every embedding); after removing the redundancy ConvE FMRR falls .698 to .305 (FB15k to FB15k-237) and AMIE FHits@10 88.1 to 47.7 % | Same benchmarks | Akrami et al., SIGMOD 2020, arXiv 2003.08001 (ar5iv; last 8 k characters unread) | strong for the leakage claim (replicated by Rossi) | Warning for anyone quoting embedding wins on FB15k/WN18: they are inflated |
| TLogic mines temporal rules by walks that go backward in time, scores a candidate as 0.5 x confidence + 0.5 x exp(-0.1 x (query time - first body time)), and combines rules by noisy-OR; ICEWS14 (63,685 training facts, 7,128 entities, 230 relations, 365 timestamps) MRR 0.4304 vs xERTE 0.4079, RE-Net 0.3828, CyGNet 0.3273, static AnyBURL 0.2967, TTransE 0.1343; rule learning 180 s on 8 CPUs; rules transfer between datasets (ICEWS0515 to ICEWS14 MRR 0.4253) | ICEWS14/18/0515 with 250 to 4,017 timestamps | Liu et al., AAAI 2022, arXiv 2112.08025 (ar5iv) | medium (one group, three event datasets) | Temporal rules are the best-documented way to use "when" in link prediction, and they beat temporal embeddings in this study. The recency term and the noisy-OR are cheap to copy; the rule miner needs thousands of events per relation |

### 4.5 Knowledge-graph embeddings and graph neural models

| Claim | Evidence | Source | Strength | At this size |
|---|---|---|---|---|
| A carefully tuned DistMult beats nearly all published FB15k models: Hits@10 89.3 and MRR .798 against 57.7 and .35 for the original DistMult and .692 for ComplEx; tuning (batch size 16 to 2048 gave +14.2 Hits@10, number of negatives, softmax loss) explains the gap | FB15k and WN18, filtered protocol | Kadlec et al., arXiv 1705.10744 (ar5iv) | medium (FB15k leaks, see above) | The lesson is on method: an untuned embedding arm is a handicapped arm; a tuned one needs a sweep that the tuning data cannot support |
| Some neural models reported inflated results through tie handling: ConvKB .396 reported vs .243 with random tie-breaking; CapsE .523 vs .150 | FB15k-237 | Sun et al., ACL 2020, arXiv 1911.03903 (ar5iv) | strong (a bug, reproduced) | Relevant to us for a different reason: structural scores tie heavily; v1's breadth-first order has ties. Use random tie-breaking |
| Embeddings degrade as the graph gets sparser: half of FB15k's triples removed at random (relation density 220) leaves TransE/TransH/HolE/STransE up to 60 % worse in Hits@10 than the same number removed by relation; on the extracted NELL165 (entity density about 3 to 7) they scored AUPRC .70 to .78, below a threshold baseline (.873) and a probabilistic-rule model (.891) | FB15k variants, NELL165 | Pujara, Augustine, Getoor, EMNLP 2017 (pdf, text extracted) | medium (one study, four 2013-2016 models) | Density is the lever: FB15K has 79 triples per entity, FB15k-237 about 37 (computed 2 x 272,115 / 14,541), WN18 about 7 (but only 18 relations and heavy symmetry), this graph 6.9 |
| A very simple model of observed features (binary indicators of direct relation types) was competitive with or better than latent models on FB15K and WN18, and the two combined best | FB15K (483,142 triples), WN18 | Toutanova and Chen, 2015 workshop paper (pdf text extracted; tables not read) | weak (the datasets leak, per Akrami) | Do not cite as a general result |
| R-GCN: FB15k-237 MRR .248 vs DistMult .191, ComplEx .201, HolE .222, TransE .233; entity classification on AIFB (8,285 entities, 45 relations, 29,043 edges, 176 labelled) 95.83 vs WL 80.55 | FB15k-237; AIFB, MUTAG, BGS, AM | Schlichtkrull et al., arXiv 1703.06103 (ar5iv) | medium | The one point where a relational GNN worked at this size is a classification task with strong labels; not link ranking |
| Neural recommenders did not beat tuned simple baselines: of 18 deep-learning top-n papers from KDD, SIGIR, WWW and RecSys (2015-2018) 7 could be reproduced and 6 of those did not consistently beat tuned nearest-neighbour or graph-based baselines; the seventh did not consistently beat a tuned linear ranking method (SLIM); papers tuned epochs on the test set | CiteULike, Pinterest, Epinions, MovieLens, Yelp, LastFM | Ferrari Dacrema, Cremonesi, Jannach, RecSys 2019, arXiv 1907.06902 (ar5iv) | strong (an independent reproducibility study, a count not an average) | The base rate for "a learned model beats a tuned simple baseline" in recommendation is low |
| Gradient-boosted trees were found better than neural rankers on learning-to-rank benchmarks until a new neural recipe closed the gap | LETOR-style sets | Qin et al., ICLR 2021 (abstract page read only) | weak (abstract only) | A reason to try trees, not neural nets, for any learned ranker; the data here is too small for either to be judged |

### 4.6 Temporal link prediction and temporal knowledge-graph forecasting

| Claim | Evidence | Source | Strength | At this size |
|---|---|---|---|---|
| A memorisation baseline with no learning (EdgeBank: predict an edge if it was seen, optionally only inside a time window) is competitive with temporal GNNs under random negatives (average precision LastFM .79 against TGN .72; Enron .84 vs TGN .85; UN Trade .60 vs .64), and the best under historical negatives on several sets (UN Trade .73, UN Vote .71, Contact .77 against TGN .57 to .67); under the harder historical and inductive samples the unlimited version collapses to about .5; model rankings change with the negative sampler | 13 datasets, 184 to 13,169 nodes, 59,835 to 2.4 M edges, five runs | Poursafaei et al., NeurIPS 2022, arXiv 2207.10128 (ar5iv) | medium to strong (independent re-evaluation) | Co-change is an EdgeBank. The right comparison for any temporal model here is "co-change with a window and decay" |
| The Temporal Graph Benchmark confirms it: EdgeBank beats DyRep and nearly matches TGN on tgbl-coin; persistence and moving-average forecasts beat TGN and DyRep on node-affinity; rankings change from set to set; 157 k to 73 M edges, chronological 70/15/15 split | Nine datasets | Huang et al., NeurIPS 2023, arXiv 2307.01026 (ar5iv) | medium to strong | Same |
| A parameter-free "recurrency" baseline (a recency-decayed repeat of seen triples, with a relaxed variant for unseen ones) ranks first or third on three of five temporal KG sets: GDELT MRR 24.5 vs 21.7 for TiRGN; ICEWS18 28.7 vs 33.7; ICEWS14 37.2 vs 47.4; YAGO about 90.9 and WIKI about 81.5 (both above 85 % recurrence) | Five temporal KG forecasting sets | Gastinger et al., IJCAI 2024, arXiv 2404.16726 (html) | medium | Exactly the shape of co-change evidence: a recency-decayed count of repeats, plus a fallback for unseen pairs (the structural score) |
| TLogic's exponential time term (lambda = 0.1) and TARMAQ's finding that "age zero" (a model mined right before the query) is best both say recent events carry more | see 4.4 and 4.7 | | medium | The recency weight is already in the extractor (`recency_weight`, 30-day half-life by hand); the question is its value, which is a one-parameter sweep |

### 4.7 Software engineering: which files change together

| Claim | Evidence | Source | Strength | At this size |
|---|---|---|---|---|
| History length and age: applicability (share of queries answerable) rises with history length and levels off; about 25,000 commits is the point of "sufficient history"; precision on the queries that can be answered is highest for very short histories (1 or 2 commits), which answer few; age zero is best; filtering transactions above 8 files was best in the earlier study | 2 industrial + 17 open-source systems, last 50,000 commits each, 660 sampled transactions per system, a random split of one transaction into query and expected outcome, TARMAQ, average precision | Moonen, Di Alesio, Rolfsnes, Binkley, "history length and age" (Simula pdf, text extracted with pdftotext) | medium to strong (19 systems, large) | **This repository has 233 non-merge commits and 140 usable**, 0.5 % of the "sufficient" history, and commits of up to 22 existing code files (median 5). Co-change is sparse and the transaction-size filter matters |
| Aggregating the rules that apply to a change improved 13 % to 90 % of recommendations | 15 open-source and 2 industrial systems | Rolfsnes et al., Empirical Software Engineering 2018 (listing page and abstract only) | weak (abstract) | With query size 1 there is nothing to aggregate across the query; across candidate evidence it is the fusion of section 6 |
| Learning to rank co-changed methods: the strongest single feature is the number of earlier co-changes (permutation importance 0.3844); path similarity 0.0539, author similarity 0.0392, code dependency 0.0082, hierarchy 0.0043, clone 0.0010, semantic (CodeBERT) 0.0008; random forest (point-wise) was best of 8 learners (LambdaMART and RankNet included), NDCG@5 0.8394, P@5 0.7418; **+4.7 % NDCG@5 over plain support ranking**, the best baseline | 150 Java projects, 41.5 M lines, 634,216 pull requests; 12-month feature window, 6-month label window; Wilcoxon over projects | Arxiv 2411.19099 (html; the last 54 k of 154 k characters unread) | weak to medium (single study, Java, methods, labels are co-change counts) | The same shape as my pilot: history dominates, everything else adds a few percent, learners differ little. Their data is about 4,228 pull requests per project against 233 commits here |
| Structural dependency is a weak predictor of co-change; history-based beats call-graph based | 35 and 45 Java projects (Geipel and Schweitzer; Oliva and Gerosa), Hassan and Holt | quoted from `research/lane-algorithms.txt` (search snippets; I did not open them) | weak | The reason both signals are needed |

The method-level and class-level change-prediction studies I found (arXiv 2502.17908) use a different target
(will this class change in the next release) with cross-validation that may not respect time; I did not use them.
A temporal-graph-network study of change propagation (ScienceDirect, IST 2023) could not be opened (HTTP 403),
and the Simula "predicting relevance of change recommendations" paper sits behind a bot check.

### 4.8 How to evaluate and select without fooling yourself

| Claim | Evidence | Source | Strength |
|---|---|---|---|
| Random and leave-one-out splits leak the future; models recommended items released after the test instance; changing the amount of future training data changed accuracy by -5 % to +90 % and reordered models | MovieLens-25M, Yelp, two Amazon sets; BPR, NeuMF, SASRec, LightGCN | Ji et al., arXiv 2010.11060 (ar5iv) | medium |
| For non-stationary series the most accurate estimates came from out-of-sample methods, especially the holdout repeated in multiple testing periods; blocked cross-validation is acceptable for stationary series | 62 real and 3 synthetic series | Cerqueira, Torgo, Mozetic, Machine Learning 2020, arXiv 1905.11744 (search listing; I did not open the paper) | medium |
| The over-fitting that comes from selecting a model on a noisy estimate can be as large as the differences between algorithms | theory and experiments on cross-validation based selection | Cawley and Talbot, JMLR 2010 (abstract only) | medium |
| Evaluation choices change the winner: easy random negatives favour learned models, hard negatives favour heuristics (HeaRT; EdgeBank); tie handling alone moved ConvKB and CapsE | see 4.1, 4.5, 4.6 | | medium to strong |

---

## 5. The pilot: what the cheap parts of the theory do on this graph (tuning split only)

Purpose: replace "it is probably fine" by a measurement of which features carry signal and whether a fitted
combination beats a simple one at this history length. It is **not** the test of v2; it fixes a design.

Setup (all choices fixed before looking at results, except where stated):
- Seeds, truth and snapshots: the 65 tuning commits (T1 rule: non-merge, 2 to 30 existing code files, authored
  2026-06-01 to 2026-06-30), every existing file of a commit as a seed once (388 seeds), truth the other existing
  files; the snapshot is the facts cache at the commit's first parent (ancestors only, so no leakage of the
  commit's own edges); history edges are the extractor's `co_changed` rows at that parent (it drops same-PR
  commits and carries support, confidence and a recency weight).
- Graph: typed edges collapsed to file level (a symbol inherits its file's path; nodes without a path, such as
  routes, tables and settings, stay as intermediate nodes), undirected, without slice/runtime/invariant-group
  membership edges and without `co_changed`.
- Pool: code files within 2 hops, plus every co-change neighbour. 14,938 (seed, candidate) rows. Ceiling: 71.3 %
  of truth pairs are in the pool.
- Scores: random tie-breaking (fixed seed) everywhere. PPR alpha 0.15, 25 iterations; Katz beta 0.1 over walks
  of length up to 3; CN, RA, AA, Jaccard on the typed neighbour sets; co-change confidence, support and recency
  weight from the extractor.
- Supervised arms: logistic regression with a ridge penalty (intercept free), features log-scaled and
  standardised from the training rows only, refitted before every test commit on all earlier commits (rolling
  origin, expanding window, at least 15 commits of history); test commits are the **late 50**. The ridge penalty
  took four values (0.3, 3, 30, 300); results did not depend on it (spread 0.003 P@10), so the choice is not
  tuned in any way that matters.
- Metrics: P@10 and R@10 (R against all truth, including truth outside the pool). Intervals: 95 % bootstrap over
  commits, 2,000 resamples; paired where stated.

### 5.1 Single heuristics, all 65 tuning commits (no fitting)

| Score | P@10 [95 % interval] | R@10 |
|---|---|---|
| random inside the pool | 0.132 [0.106, 0.157] | 0.293 |
| hop distance (closer first) | 0.198 [0.164, 0.231] | 0.437 |
| common neighbours | 0.180 [0.143, 0.214] | 0.389 |
| resource allocation | 0.190 [0.151, 0.228] | 0.405 |
| Adamic-Adar | 0.187 [0.148, 0.223] | 0.402 |
| Jaccard | 0.189 [0.151, 0.226] | 0.407 |
| Katz (beta 0.1, length 3) | 0.213 [0.175, 0.249] | 0.465 |
| rooted PageRank | 0.216 [0.177, 0.255] | 0.479 |
| co-change confidence (history alone) | 0.208 [0.169, 0.247] | 0.475 |
| co-change support / recency weight | 0.208 / 0.208 | 0.468 / 0.476 |
| same directory | 0.178 [0.144, 0.210] | 0.403 |
| popular first (candidate degree) | 0.140 [0.113, 0.166] | 0.318 |
| low-rank spectral similarity of the typed graph, rank 8 / 16 / 32 / 64 / 128 | 0.161 / 0.169 / 0.208 / 0.212 / 0.201 | 0.380 / 0.390 / 0.446 / 0.456 / 0.409 |
| reciprocal-rank fusion of PPR and co-change (co-change only where it exists), k = 60 | **0.245 [0.201, 0.287]** | **0.553** |
| PPR scaled plus 0.5 x co-change confidence | 0.243 | 0.552 |

(The rank of the spectral model was picked from five values on the same data; the others were not tuned.)

### 5.2 Rolling origin, late 50 commits (train only on earlier commits)

| Arm | P@10 [95 %] | R@10 | note |
|---|---|---|---|
| random in pool | 0.118 [0.095, 0.145] | 0.259 | |
| PPR alone | 0.204 [0.164, 0.247] | 0.430 | |
| co-change alone | 0.199 [0.161, 0.240] | 0.447 | |
| RRF(PPR, co-change) | 0.233 [0.190, 0.281] | 0.508 | no parameter fitted |
| graph-conditioned floor: logistic on directory/slice/runtime/test flags and degree | 0.211 [0.170, 0.258] | 0.462 | uses the pool from the graph |
| 25 scalar features (hop, CN, RA, AA, Jaccard, shared non-file hubs, PPR, Katz, three co-change features, degree, same dir/slice/runtime, test flags), lambda 3 | 0.232 [0.190, 0.279] | 0.513 | |
| the same plus 9 direct-edge-kind flags | 0.235 [0.192, 0.282] | 0.521 | |
| the 25 features without any history feature | 0.221 [0.180, 0.266] | 0.483 | |
| 2 features: PPR and co-change confidence | 0.231 [0.189, 0.279] | 0.507 | |
| 4 features: PPR, Katz, co-change confidence and support, plus hop | 0.231 [0.189, 0.278] | 0.506 | |
| oracle ordering of the pool | 0.356 [0.290, 0.435] | 0.720 | the ceiling of any ranker over this pool |

At K = 5: RRF 0.316, 25-feature model 0.324, PPR 0.262, random 0.124. At K = 20: RRF P 0.146 and R 0.603, 25-feature
model 0.147 and 0.608, PPR 0.137 and 0.561, random 0.101 and 0.405.

Paired differences over the late 50 commits (bootstrap over commits, 95 %):

| Contrast | P@10 | R@10 |
|---|---|---|
| RRF minus PPR | +0.030 [+0.015, +0.044] | +0.077 [+0.034, +0.130] |
| RRF minus co-change alone | +0.034 [+0.017, +0.053] | +0.061 [+0.028, +0.093] |
| 2-feature logistic minus RRF | -0.002 [-0.006, +0.002] | -0.001 [-0.010, +0.007] |
| 25-feature logistic minus 2-feature logistic | +0.001 [-0.007, +0.009] | +0.006 [-0.012, +0.027] |
| +kind flags minus 2-feature logistic | +0.003 [-0.004, +0.011] | +0.014 [-0.017, +0.046] |
| 25 features minus the same without history | +0.012 [+0.004, +0.021] | +0.032 [+0.011, +0.058] |
| 25 features minus the graph-conditioned floor | +0.021 [+0.010, +0.033] | +0.051 [+0.017, +0.090] |
| PPR minus hop distance | +0.017 [+0.003, +0.032] | +0.030 [-0.010, +0.074] |
| Katz minus PPR | -0.003 [-0.010, +0.003] | -0.012 [-0.038, +0.008] |
| RA minus CN | +0.012 [+0.002, +0.022] | +0.024 [-0.010, +0.057] |
| spectral rank 64 minus PPR | -0.007 [-0.021, +0.006] | -0.031 [-0.095, +0.035] |
| RRF(PPR, co-change, spectral 64) minus RRF(PPR, co-change) | +0.001 [-0.005, +0.006] | +0.007 [-0.017, +0.036] |

Where co-change helps: in the late 50, 208 seeds have at least one co-change candidate and 100 have none. On the
208, PPR scores 0.275 P@10, RRF 0.330, the 25-feature model 0.322, random 0.151. On the 100 with no history all
three structured arms score about 0.295 (random 0.189), as they must. Over all 388 seeds, 36.1 % have no co-change
candidate at their parent snapshot and 55.4 % have at least one truth file among their co-change neighbours.

In-sample standardised coefficients of the 25-feature plus kind-flag model (descriptive; strongest first): hop 1
-0.97, PPR +0.47, hop 2 -0.37, same slice +0.37, Adamic-Adar -0.36, Jaccard +0.33, calls flag +0.33, co-change
recency +0.30, candidate degree +0.27, same runtime +0.27, imports flag +0.24, co-change confidence +0.24, test
flag +0.23, co-change support -0.21, RA +0.12, Katz -0.04, CN -0.02. Pearson correlation of the log-scaled CN, RA,
AA, Jaccard, PPR, Katz, co-change confidence and degree: CN-RA 0.80, CN-AA 0.94, RA-AA 0.95, PPR-Katz 0.69, and
co-change with everything else 0.01 to 0.27. The AA and RA coefficients have opposite signs: collinearity, the
sign of an over-parameterised model.

What this does and does not show:
- It shows that on this graph and these commits **PPR and co-change are close to a sufficient set**, that fusing
  them is worth about +0.03 P@10 (the same size as the +4.7 % NDCG over support ranking in the Java study), and
  that nothing else tried was distinguishable from zero at 50 test commits. The width of a paired interval is
  about +/-0.01 to +/-0.02 P@10, so effects below about 0.02 are not resolvable with this tuning set.
- It does **not** show that the extra features are useless in general: a 65-commit set cannot resolve small
  effects, and the pool excludes the 29 % of truth beyond 2 hops (a depth-3 pool is the next test).
- It measures order inside a list of ten, not v1's primary (recall inside an 8,000-token answer), so it cannot be
  compared with v1's 0.076 number. The pool is the file level; symbols, tokens and documents were not scored.
- Limits: one repository, one month of commits, bursty and mostly agent-written history; the co-change features
  inherit the extractor's rules (same-PR drop, support and confidence definitions, a 30-day half-life by hand);
  PPR alpha, Katz beta and the penalty grid were not swept; ties were broken by one fixed random seed; the four
  penalty values and the five spectral ranks are the only selections made on these data.

---

## 6. Answers to the five questions

### 6.1 Which ranker is principled and feasible (about 5,000 nodes, 16,000 to 19,000 edges, about 140 usable commits, 65 for tuning)

**Stage 0, candidate generation (the "recall" stage).** All code files within 2 hops on the file-collapsed typed
graph (undirected for "belongs with"; directed for "breaks", 6.4) plus all co-change neighbours. Ceiling 71.3 %
of truth pairs with 46 candidates on average; depth 3 raises the ceiling to about 92 % with about 121 candidates
and should be a second tier the agent asks for, as the hop-radius literature (RepoGraph k = 1 helps and k = 2
hurts; small-agent odds per extra hop multiplied by 0.47 to 0.55, from `lane-algorithms.txt`) advises.

**Stage 1, features (at most eight, each from section 4):**
1. Rooted PageRank from the seed over the typed graph (Liben-Nowell and Kleinberg; Zhang and Chen's theory says
   a 2-hop subgraph captures it).
2. Hop distance, as two indicators (1 and 2).
3. Co-change evidence: smoothed confidence, support and a recency weight (Moonen et al.; TLogic; Gastinger et al.).
   Smoothed means confidence = shared commits / (antecedent commits + pc), with pc around 5 as in AnyBURL, so a
   single shared commit does not make a rule with confidence 1.
4. RA (one common-neighbour index, not three).
5. Same slice, same runtime, candidate is a test (cheap context features that the pilot's floor shows are worth
   about as much as PPR alone: 0.211 against 0.204).
6. The kind of the direct edge, as indicators (SFE-style typed path features of length 1), or per-kind priors.
7. A lexical similarity between the seed's and the candidate's names and path tokens (not measured in the
   pilot; it is the strongest non-graph baseline in the earlier rounds' sources and costs nothing to compute).
8. Optionally one length-2 metapath count normalised as PathSim for the "same-type peer" question kinds.

**Stage 2, combination.** Two arms, both with no training-set size that the data cannot support:
- *Arm F (fusion)*: reciprocal-rank fusion (k = 60) of the PPR rank and, where it exists, the co-change rank.
  No parameter is fitted, so nothing can be overfitted. Pilot: 0.233 P@10 on the late 50.
- *Arm L (logistic)*: a ridge-penalised logistic regression over the features above, one row per (seed, candidate),
  refitted before every test commit using only earlier commits. Pilot: 0.231 to 0.235 whatever the feature set.
  Its reason to exist is not accuracy but **calibration**: the other lane's packer chooses what to include under a
  token budget, and expected truth per token needs a probability, which rank fusion does not give. (A
  probability per candidate also makes "should the agent read more?" a threshold on expected recall.)
- Not recommended now: LambdaMART or other boosted trees, neural rankers, per-kind learned edge weights. The
  coefficient count must stay below the number of independent commits divided by a safety factor; with 65
  clusters that means roughly 6 to 10 free parameters, which is why the 2-feature and 4-feature models are the
  right size and the 25-feature model is not better.

**Training and validation without leaking the future:**
- Features of a row come from the snapshot at the commit's parent only (the facts cache already does this); the
  co-change graph at snapshot t contains only commits before t.
- Rolling origin, expanding window: refit on commits before t, predict commit t. Never shuffle commits; never use
  a random split (Ji et al.; Cerqueira et al.). Keep branch order in mind: commits on side branches interleave
  in date with main; use the authored date and exclude a commit's own PR siblings from its history (the
  extractor's same-PR drop does this).
- Selection: choose the penalty and the feature set by an **inner** rolling split inside the training window, or
  declare the whole arm list in advance (six arms) and report all of them. The pilot's selections were 4
  penalties and 5 spectral ranks; v1 tried 60 configurations on 65 commits, and Cawley and Talbot's point is
  that selection noise on a set this small can be as large as the effects chosen between.
- Unit of resampling: the commit, never the row. Paired differences over the same commits.
- Tie protocol: random tie-breaking with a fixed seed, with the tie share reported (Sun et al.).
- Negatives: the pool already holds hard negatives (nearby nodes), which is the HeaRT / SFE lesson; do not score
  against random files.

**Detecting overfitting (all cheap):**
1. Learning curve: rolling-origin score against training-window length. If flat from 15 to 50 commits (the pilot's
   shape), more features cannot help yet.
2. A larger model must beat the 2-feature model with a paired interval above zero, or it is dropped. The pilot's
   25-feature model fails this (+0.001, interval -0.007 to +0.009).
3. Coefficient stability: refit on every window and report sign flips; the AA / RA flip above is the signal to
   remove redundant features.
4. Placebo columns: add a shuffled copy of each feature (shuffled within seed); if the model assigns it weight or
   gains from it, the fit is noise.
5. Gap between the in-window score and the next-commit score.
6. Count every configuration tried and report it next to the result.

### 6.2 Which heuristics should be features

| Heuristic | Keep? | Reason (source and pilot) |
|---|---|---|
| Rooted PageRank | yes | Best single structural score (0.216); stands for the whole "sum over paths" family (Katz equal at 0.213); Zhang and Chen: approximable from 2 hops |
| Katz | no (equal to PPR) | Correlation with PPR 0.69; difference -0.003 |
| Hop distance | yes (two indicators) | Dominant coefficient; cheap; PPR beats it by +0.017 [0.003, 0.032] but they are complementary in the fit |
| Resource allocation | yes, as the single local index | Zhou et al.; +0.012 over CN [0.002, 0.022] |
| CN, AA, Jaccard | no | Correlated 0.65 to 0.95 with RA; coefficients flip sign |
| SimRank | no | Cost; SEAL shows it best only on one sparse graph (Power); PathSim paper documents its bias toward rarely linked nodes |
| Preferential attachment / popularity | no (use as a negative control) | Pilot: 0.140 vs random 0.132; below chance on physical networks (Lue and Zhou) |
| Co-change (support, confidence, recency) | yes | Worth +0.03 P@10 and +0.055 on seeds that have history; EdgeBank and recurrency baselines say a decayed repeat count is hard to beat |
| Same slice / runtime / directory / test flag | yes, cheap | A graph-free floor scores 0.211 given the pool |
| PathSim / HeteSim | optional, per question kind | Needs symmetric metapaths and per-type counts; evidence is small-scale and qualitative |
| Direct-edge kind | optional | +0.003 [-0.004, +0.011] at 65 commits: below resolution; revisit with more history |
| Lexical similarity (names, paths) | to be tested | Not measured here |

Time-aware weighting: sweep one parameter, the recency half-life (14, 30, 60, 120 days and none), because
TLogic, TARMAQ ("age zero") and the recurrency baseline all say recency matters and none says how much for a repository
whose pace is a commit a few hours apart.

### 6.3 Embeddings and neural models: when they help, when a path-feature model beats them

I did not train one. The reasons, with the evidence, and the test that would settle it.

**When rotation- and translation-type embeddings (RotatE, TransE) and bilinear ones (ComplEx, DistMult) help:**
(a) many triples per entity: the published wins are on FB15k-237 (272,115 training triples for 14,541 entities,
37 per entity), WN18RR (86,835 for 40,559) and larger; Pujara et al. show up to 60 % worse Hits@10 on the
randomly thinned sparse variant of a dataset at the same size, and below-baseline results on sparse extracted KGs;
(b) the task is completing (head, relation, ?) with many training instances per relation, so the relation
vector is learned well (RotatE's gain over TransE comes from symmetric, inverse and composed relation patterns,
Rossi et al.); (c) a fixed entity set, since they are transductive; (d) no strong typed-path evidence available.

**When a path-feature or rule model matches or beats them:** when typed paths already support the answer (Rossi:
all models do better with more relational-path support; AnyBURL "consistently among the best"); when the data is
small or the history is short; when new entities arrive daily (a new file has no embedding but has edges); when the
answer must be explained as a path to an agent; and where the benchmark leaked (Akrami et al.: simple rules equal or
beat embeddings on FB15k, WN18 and YAGO3-10).

**This graph.** 18,875 edge rows; 6.9 triples per node; 36 relation kinds of which the most informative (`co_changed`)
has about 1,900 rows; 388 tuning queries from 65 commits; new files and renamed files weekly; the answer needs to
be explained. Every condition in (a) to (d) points the wrong way, and the owner's own RotatE experience (dense,
fixed, many instances per relation) is on the other side of that line. My measured proxy: a rank-64 spectral
(linear latent) model equals PPR (-0.007 P@10, interval -0.021 to +0.006) and adds +0.001 in fusion; a nonlinear
embedding would have to find signal that the linear one and the path scores both miss, from 2,924 correlated pairs.

**GNNs.** HGB shows that vanilla GCN equals or beats specialised heterogeneous GNNs on 140 k to 245 k edge
link-prediction sets; SEAL needs thousands of positives; R-GCN worked at 8 k entities only for classification with
labels. Training a GNN on 65 commits is the case Dacrema et al. warn about (weak baselines, selection on the
test set). The one place a neural component is plausible is **text**: node features from a code-embedding model
(the earlier rounds' pre-registered small-model study credited an embedding entry point). That is a feature-and-entry
question for other lanes, and the pilot did not include it.

**What would change at 10 and 100 times the size.** At 10 times (about 2,300 commits, 55,000 nodes, 190,000
edges) the problem enters the HGB and R-GCN regime: a logistic or boosted ranker over 25 features becomes
justified (hundreds of independent commits), AnyBURL becomes informative, and an embedding arm becomes a fair test. At 100 times
(23,000 commits, the 25,000-commit regime of Moonen et al.) co-change applicability saturates, PPR needs
approximate push algorithms, boosted trees and NBFNet-class models are standard, and
the temporal-GNN baselines in TGB become relevant.

**The correct test, if the owner wants it:** train ComplEx with N3 regularisation and RotatE (self-adversarial negatives, the owner's setup)
on the graph at each rolling-origin parent (or every tenth parent, to bound cost), with their hyper-parameters tuned on
an inner rolling split, restrict to the same pool, and compare in the fusion; the arm is killed if the paired
interval of "RRF with the embedding score minus RRF" contains zero on the late 50 commits. A weaker version (untuned,
one seed) must not be run: it would be the "naive prototype against a strong baseline" the owner objected to.

### 6.4 "What will break" versus "what changes together"

| | Changes together | Breaks if I change this |
|---|---|---|
| Question | which files were edited in the same commit | which code, tests, contracts or documents stop being correct |
| Natural graph | undirected; history edges plus typed structure | directed dependents (reverse of imports, calls, route-client, table readers) with typed priors; the earlier lane measured directed dependents saturating at about 8 files (2 % of the repository) against a quarter of the repository for the undirected closure |
| Ground truth | other files of the same commit (what v1 used) | a test that fails, a fix that follows, a contract half that had to change |
| Contamination | tangled commits (6 to 15 % of fixes, snippet from `lane-algorithms`), lockfiles, documents, formatting passes | missing: dependents that are not covered by any test; mutants overstate (Musco et al.) |
| Literature | ROSE, TARMAQ, CoRanker, Moonen (4.7) | change-impact analysis (Musco: richer call graphs raise completeness, lower precision; Legunsen: class-level static selection 29.4 % of tests, 0.2 % unsafe vs method-level 43.8 %, 10.6 % unsafe), Meta's predictive test selection (features: failure history, change history, dependency distance) |

Ground truth that exists or can be built here:
- *Co-change* (exists): 65 tuning and 75 held-out commits.
- *Tests that needed to change* (exists, weaker than "break"): v1's T2 set (240 tuning seeds in 47 commits).
- *Tests that fail* (buildable): apply a commit's production diff to its parent, keep the parent's tests, run
  the suites; failing tests are the ripple. The feasibility lane found 89 of the 141 usable commits runnable with
  what is installed and all 12 sampled parents green; cost is minutes per commit. This is a differential
  test-selection ground truth and the closest to "break". It needs the owner's decision on Postgres containers only
  for backend integration tests.
- *Fix follow-ups* (small): git subjects show 48 "fix" commits of 233 and 1 revert; the earlier commit that last touched the
  fixed lines is the "broke it" candidate (the SZZ idea; I did not open that paper, name only). Too few for training, usable as a
  sanity check.
- *Mutation or injection* (buildable, expensive): inject a fault into a function and run the covering tests; Musco et al.
  used about 17,000 mutants on 10 Java projects. Use for calibrating edge-kind priors, not for evaluation of an agent.
- *Defect register and handoff documents* (exists, tiny): 8 items in the held-out T4 set; do not touch for tuning.

Ranker for "break": directed reverse reachability to depth 2 with edge-kind priors estimated from the differential test runs
(a Laplace-smoothed share of edges of each kind that carried a failing test), plus the test-selection features that need no failure
history (dependency distance, test-to-source links, route-to-client calls). Evaluate it on recall of failing tests
and precision at fixed list size, never against co-change truth. Report the two lists separately to the agent.

### 6.5 What needs no install and what needs a library

| Piece | Install | Note |
|---|---|---|
| Candidate generation, BFS pools, tie protocol | none | Plain Node or Python |
| PPR, Katz, RA, hop, co-change scores | none | numpy is present (2.3.5 in the host Python); node code also works. The pilot ran all of these in about 3 s of CPU per 65 snapshots for features |
| Rank fusion, ridge logistic regression (Newton steps), rolling origin, commit-level bootstrap | none | About 60 lines; written and run in the pilot |
| Low-rank spectral similarity | none | `numpy.linalg.eigh` on a 100 to 300 node file-collapsed matrix at tuning parents; larger at the frozen snapshot (a few thousand nodes) |
| Lexical similarity | none | SQLite FTS5 (already in the earlier arms) |
| Boosted-tree ranker (LambdaMART) | optional: LightGBM or XGBoost (MIT / Apache-2.0, a few MB wheels, CPU only, runs offline on Linux); or scikit-learn (BSD, tens of MB with SciPy) | Not justified at 65 clusters; revisit with 10 times the history |
| Rule mining arm | optional: AnyBURL jar (BSD-3, Java, input is triples as TSV; the page does not state a jar size or the Java version required; I did not download it) | Offline, laptop-scale; runs in seconds on 19 k triples; fix for noisy-OR dated 12 Nov 2025 |
| Embedding arm | optional: PyKEEN 1.11.1 (MIT, 730 kB wheel, 40 models including RotatE, ComplEx, TransE) plus PyTorch (hundreds of MB, CPU wheel; I did not check its size) | Runs offline in a Linux container; does not need a GPU at 19 k triples |
| A heterogeneous GNN or NBFNet | optional: PyTorch Geometric or the NBFNet reference code | Do not install; see 6.3 |

---

## 7. Recommendations

Each has: what to build, the theory, what it replaces in v1, the expected effect and why, the test on tuning data
that would show it does not help, and the install (none unless stated). The owner decides installs.

**R1. A two-stage ranker: pool, then fusion of PPR and smoothed co-change evidence (Arm F), with a ridge logistic arm (Arm L) for calibrated scores.**
- Theory: path-sum heuristics (Liben-Nowell and Kleinberg; Zhang and Chen), recurrence/EdgeBank (Poursafaei;
  Gastinger), reciprocal-rank fusion (used by the other lane's baseline), ridge logistic regression as SFE's
  classifier (Gardner and Mitchell).
- Replaces: v1's hand-weighted fusions, degree-normalised spreading and the 60-configuration sweep.
- Expected effect: about +0.03 P@10 over PPR alone and +0.02 over a graph-free floor (pilot, tuning, 95 %
  intervals above); recall inside a budget will move less than v1's primary could show, because v1's pool saturates the budget.
- Test: rolling origin on the 65 tuning commits (refit chain as in section 5); paired bootstrap over commits.
  Kill criterion: if RRF minus PPR has a 95 % interval that includes zero on the full 65 (the pilot's was above
  zero on 50), co-change is demoted to a tie-breaker; if Arm L minus Arm F includes zero (it did), Arm F is the default and
  Arm L is kept only if the packer needs probabilities.
- Install: none.

**R2. Build co-change as the weighted projection of the file-commit bipartite graph, not as pairwise confidence.**
- Theory: resource allocation on a bipartite graph (Zhou et al. 2007: each commit passes one unit split among its
  files; NBI hit rate at L = 10 was 16.2 % against 14.1 % for user-based collaborative filtering and 10.3 % for
  global popularity on 85,250 MovieLens links; weight the contribution of a commit by 1/(files - 1) as in collaboration-network
  weighting); filter transactions above 8 files (Moonen); recency (TLogic); Laplace smoothing pc = 5 (AnyBURL).
- Replaces: the extractor's confidence, support and recency weight taken as given.
- Expected effect: unknown; it changes the order of the strongest single signal (0.208 P@10 alone). The literature says
  size filtering and age matter more than the formula.
- Test: P@10 of the co-change-only ranking for each of: confidence; smoothed confidence (pc 0, 2, 5, 10); size-weighted RA;
  commit-size cap 8, 15, 30; half-life 14, 30, 60, 120 days, none. Twelve variants, so report all twelve and use an inner split to
  choose; kill if none beats the extractor's confidence by a paired interval above zero.
- Install: none (needs commit-file lists the extractor already holds in `attrs.commits`, and commit sizes from `git log`).

**R3. A depth-3 second tier, ranked by the same score.**
- Theory: the ceiling rises from 71.3 % to 92.3 % of truth pairs (section 3); hop literature says depth 1 helps, depth 2 can hurt, so make
  the third hop something the agent requests.
- Replaces: v1's unbounded hops (a median reach of 3,633 of 5,464 nodes, `v1-audit.md`).
- Test: R@20 and token cost with and without the tier on tuning; kill if R@20 does not rise by at least 0.05.
- Install: none.

**R4. Add a lexical similarity feature (names, paths, symbols).**
- Theory: the strongest non-graph baseline in the first two rounds (LocAgent's search component, the pre-registered
  small-model study credits embedding or lexical entry); here as a ranking feature of the pair.
- Test: paired contrast of the 4-feature model with and without it, over the late 50. Install: none (SQLite FTS5 or a plain BM25).

**R5. Typed path features (SFE) with an elastic-net penalty, as the explanation layer and as a tested feature set.**
- Theory: Gardner and Mitchell. In the pilot the direct-kind flags added +0.003 (interval -0.004, +0.011), so
  this is for explanations ("via route X") first, features second.
- Test: add length-2 kind-sequence indicators (top 30 by frequency) to Arm L; kill if the paired interval vs the
  2-feature model contains zero; revisit at 300 usable commits. Install: none.

**R6. A rule-mining arm (AnyBURL) on the typed graph with `co_changed` as the target relation.**
- Theory: Rossi (AnyBURL among the best), Meilicke (competitive in 1,000 s), TLogic (temporal rules beat temporal embeddings).
- Replaces: nothing; it is an arm that also yields rules an agent can read.
- Expected effect: close to the path-feature model; its value is the explanations and a cross-check of R5.
- Test: top-10 from the mined rules (maximum aggregation) fused with PPR; kill if it adds nothing (interval over zero).
- Install: AnyBURL jar, Java; owner decision.

**R7. An embedding arm, only after R1 to R3 and only with a tuned, multi-seed setup.**
- Theory and prediction: section 6.3; the low-rank proxy was a null (+0.001).
- Test: ComplEx-N3 and RotatE trained per parent (or per tenth parent), pool-restricted, fused; kill if the paired
  interval of the fusion gain contains zero.
- Install: PyKEEN plus PyTorch in a Linux container, offline; owner decision.

**R8. A separate "break" ranker on directed dependents, with outcome truth from differential test runs.**
- Theory: Legunsen (class-level selection), Musco (precision cost of richer graphs), Meta (distance and history
  features). See 6.4.
- Test: recall of failing tests at fixed list size on the runnable commits of the tuning set. Install: containers already present on the host.

**R9. An evaluation harness that cannot be fooled.**
- Rolling origin, commit-level bootstrap, paired contrasts, random ties, placebo features, the list of arms declared
  in advance, held-out touched once (section 6.1). Replaces: the one-factor-at-a-time sweep. Install: none.

---

## 8. What I could not open or verify, and what I did not do

Not opened or only partly read (nothing in this note rests on them beyond what is stated):
- Liben-Nowell and Kleinberg: read except the table of factors over random; the sentence naming how many sections
  Katz won was cut in the extraction. Zhou 2009 and the Lue-Zhou survey (last 20 k characters unread), Zhang and Chen,
  Li et al. (last 22 k of 122 k characters unread), Rossi (read in two parts, tables for per-dataset MRR not seen),
  Akrami (last 8 k unread), Gardner and Mitchell (read fully, extracted with pdftotext).
- Not opened at all: the original path ranking algorithm papers (Lao and Cohen 2010, Lao, Mitchell, Cohen 2011); AMIE and AMIE+
  (only the AMIE numbers quoted by Akrami); the RotatE paper; SimRank (Jeh and Widom); Peduzzi's events-per-variable rule
  (I did not use it); Tax et al.'s learning-to-rank comparison; SZZ; Ying et al. 2004 and the ROSE paper (the first
  round read ROSE); TARMAQ itself (described through the history-length paper and a listing page).
- Abstract or listing page only: Qin et al. (gradient-boosted trees vs neural rankers), Cawley and Talbot, Cerqueira et al., Rolfsnes et al. 2018.
- Blocked: a temporal-graph-network study of change propagation (ScienceDirect, HTTP 403); the Simula paper on predicting the
  relevance of change recommendations (bot check). The CoRanker paper's last 54 k characters (limitations) were not read.
- AnyBURL's tables partly copy baselines from other papers; PathSim's evidence is 15 labelled queries; the
  Toutanova and Chen results were not read in tables and rest on leaking data.
- PyTorch's wheel size, AnyBURL's jar size and minimum Java version were not found.

Not done: no embedding, GNN, boosted-tree or rule-mining model was trained; no symbol-level or token-budget
ranking was tested; the held-out split was not touched; the "break" ground truth was not built; no lexical feature
was measured; depth 3 was not ranked; the three heuristics' parameters (alpha, beta) were not swept.

Pilot limits are listed at the end of section 5. The main risk to the conclusions: 65 commits from one month of a
bursty history. A result of "no resolvable difference" there means "not at this size", not "no effect".

## 9. Reproduction

Scripts (read-only on the facts cache and git; they write pickles to the host temp folder only):
`.../scratchpad/hb/graph2/graph-v2-pilot-ranking/feat.py` (features per seed and candidate at each tuning parent),
`ev.py` (single heuristics, rolling-origin logistic arms, paired bootstraps, coefficients), `svd.py` (spectral
similarity). They expect `git log --no-merges --format='@@%H|%as|%P' a31924a --name-status -M` written to the
host temp folder as `gl2.txt` (the commit list) and the facts cache at
`.../build/facts/cache/<parent>/{nodes,edges}.jsonl`. Python: the codex runtime at
`C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe -I` (numpy 2.3.5 only).
