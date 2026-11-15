# Refuter: an attack on the graph v2 design before anything is built (2026-11-13)

Lane: REFUTER. Target: `DESIGN.md` in this folder (283 lines), read in full, with `verify-a.md`, `verify-b.md`, `use-cases.md`, `v1-audit.md` and the relevant parts of `lane-ranking.md`, `lane-time-incremental.md` and `lane-selection-interface.md`. Round 1 (`../research/`) and round 2 (`../widen/`, chiefly `lane-agents.md`, `lane-temporal.md`, `protocol-v2-power.txt`) were read where the design leans on them. I built nothing. I ran read-only `git` commands on the repository and extracted text from two public PDFs into my scratchpad (`scratchpad/refute/`). No project detail went into any search or URL.

Strength marks: S strong (independent, controlled, replicated), M medium, W weak (one study, self-reported, toy scale). Terms are defined where first used. "Carried tokens" means fetched tokens times the later model calls in the same window that re-read them (`use-cases.md` §2.3). "Tuning data" means the 65 tuning commits (388 seeds) and the 191 cached snapshots. "P@10" is the share of the top 10 ranked files that are in the truth set.

## 0. Verdict in five sentences

The design is a large improvement on v1: it starts from measured questions, names its sources, carries the verifiers' corrections, and keeps the agent pilot as the only test of tokens. It is not yet "every choice from documented theory": about a dozen thresholds and several mechanisms are the lanes' own, and three sources are cited for something they do not say (section 1). Its biggest structural flaw is that the validation plan drops the one test set the use-case lane asked for (CQ instances taken from transcripts and weighted by carried tokens), so the zero-model tests still score mostly what a graph is good at (co-change truth, typed questions written from code), not what agents spend tokens on (section 6). Several tuning tests cannot fail, or can fail only for the wrong reason, and every ranking test re-uses the same 65 commits that the ranking pilot already used to choose its arms (sections 4 and 5). The decisive agent pilot, as round 2 sized it, can only detect a saving of about 20 to 25 % per task, while the design's own illustration is 3 to 5 % of product context, so the pilot will most likely say "inconclusive" unless it is redesigned (section 9).

## 1. Still improvised, or a source that does not say what the design claims

1. **Hogan's definition of a knowledge graph is misquoted.** The design defines a knowledge graph as "a graph with a schema, stable identity, provenance and quality measures [Hogan]". Hogan et al. (ACM CSUR 2021, arXiv 2003.02320, introduction, text extracted from the PDF) adopt an inclusive definition: a graph of data intended to accumulate and convey knowledge of the real world, whose nodes are entities and whose edges are relations. Schema, identity and context are topics the survey discusses, and quality is one of its methods; none is definitional. Consequence: by Hogan's own definition v1 was already a knowledge graph. v2 adds the aspects Hogan discusses. The answer to the owner's "strictly graphs or knowledge graphs or TKGs" must say that.
2. **"Not a temporal knowledge graph" is too narrow, and so is "is a TKG".** A temporal knowledge graph in the representation sense is a set of facts annotated with time (quadruples or validity intervals). T1's validity sets over commits are exactly that, with the difference that time here is a partial order (the commit graph branches), not a line. What v2 is not is a TKG in the completion or forecasting sense (TLogic, RE-Net). Round 2's temporal lane says it did not review the TKG literature (`../widen/lane-temporal.md` line 51), so neither round has a primary source for the representation sense either. This is a wording fix, but it is the owner's own question.
3. **[deKleer] is cited for in-lists and out-lists.** In-lists and out-lists are the support-list justifications of Doyle's justification-based truth maintenance system (1979). De Kleer's 1986 assumption-based system works with assumption sets and labels. The time lane got this right ("JTMS justifications with in and out lists (Doyle 1979)", `lane-time-incremental.md` line 302, with Doyle not opened and described through de Kleer). The design's citation should read Doyle (not opened), described in de Kleer 1986. Nothing in M4 needs either system's machinery; what M4 actually uses is the verifying trace of Build Systems a la Carte (confirmed, verify-b T-a).
4. **S2's stop rule is called "the lane's own derivation", but there is documented theory for it, and the number plugged into it is the wrong quantity.**
   - Theory: leaving a source when its marginal gain rate falls to the average rate of the environment is Charnov's marginal value theorem (Theoretical Population Biology 9(2), 1976), carried into information seeking as the information patch model, and choosing which kinds of item to take is the information diet model (Pirolli and Card, Psychological Review 106(4), 1999). I confirmed the bibliographic record and the patch-model link through search results only; I did not open either paper, so no effect size is claimed. Citing it turns S2 from improvised into derived, and S3 (level of detail) is the diet model.
   - Number: the design sets F, "the tokens a scripted search spends to find one omitted item", to "about 695". The 695 is the tokens scripted search read per typed lookup question in the first test (`v1-audit.md` line 426), not per omitted file, and the selection lane says so (`lane-selection-interface.md` lines 153 and 219). The same lane computes that an avoided search is worth about 13,000 tokens once the carry over about 20 remaining calls is counted. With F of 13,000 instead of 695 the stop threshold falls about 19 times and the stop almost never fires. S2's expected effect therefore depends on which F is right, and that is not stated.
5. **Thresholds with no source.** Each of these is the lane's or the design's choice, stated before the run (which is good) but not derived from theory or from a power calculation:
   - Q1: a kind stays "only if recall falls beyond the paired 95 % interval".
   - M1: definition coverage "over 97 %"; drop `references_literal` "if under a third" of usage searches target a literal.
   - M3: "more than half" of what was read; A1: "at least 70 % of sessions" at "no more than a quarter" of the tokens.
   - M6: "cut spurious invalidations by about a third" (this one is not even a threshold; see section 5).
   - R1: "gain at least 0.02 P@10"; R3: "R@20 rises by at least 0.05".
   - S5: MMR "only if over a quarter".
   - T4: "misses a non-trivial share" (no number at all).
   - A1: 1,000 default and 2,000 hard cap tokens (the cited cap, about 4,000 characters per output, comes from a study of models up to 32B parameters, arXiv 2610.33958, confirmed by verify-b S-o; its transfer to a frontier agent is untested).
6. **M3's role vocabulary** (guard, client half, condition input, example, violation) has no source. The W3C n-ary relations note justifies making a rule with roles a node; it says nothing about which roles. The roles are a hand-made ontology, assigned by hand once for 20 invariants.
7. **R1's pool** (2 typed hops on the file-collapsed graph plus all co-change neighbours) and restart 0.15 come from the ranking pilot, not from theory. Restart 0.15 matches Liben-Nowell and Kleinberg's rooted PageRank setting (confirmed, verify-b R-a), but that is a different graph and task; the design sweeps it anyway, which is right.
8. **[ETH] as "nearby evidence"** for the ledger: arXiv 2602.11988 is about agent context files (AGENTS.md-type), not about a store of conclusions with premises. It is an analogy, weak for this purpose.

## 2. Over-engineering against the recorded use

The recorded use is in `use-cases.md`: product work carries 242M tokens, program work 1,147M. Check each component against what it serves.

- **S4 `connect` (exact Steiner tree, 2 to 8 terminals).** None of the 16 competency questions (CQs) asks how two or more named entities are connected. The design itself says "explanation questions only; no recall gain expected", and the evidence is thin (G-Retriever never ablated its tree step, verify-b S-g). It serves a question a graph is good at, not one agents asked. **Cut.**
- **T3 kind-level relevance filter.** It can only make validation faster; fact-level validation already takes 0.31 ms per snapshot. "No token effect" is the design's own words. **Cut.**
- **S5 redundancy term.** The audit is a single number that the A1 size test can report; the only published packer won 1 of 14 contrasts and reversed at 14B (verify-b S-j). **Cut as a component; keep the measurement inside A1.**
- **K4 tier 3 (def-use over untyped web JavaScript).** CQ13 is 2.4M product carried tokens (1.0 %) and 2.9M program; tier 3 rests on one abstract (ARISE, W, verify-a C12). Days of work for a fraction of 1 %. **Cut.** Tiers 1 and 2 are cheap given K1 and the TypeScript checker; keep them as a trial behind the K4 test.
- **R5 what-breaks ranker.** It needs differential test runs over 89 commits, a research project in itself, to rank failing tests for the "what breaks" part of CQ8 (CQ8 in total is 10.2M product, 4.2 %). Agents already run the test suite and CI. **Defer** until the cheaper components have shown any token effect.
- **R3 depth-3 tier.** It raises the pool ceiling for the co-change truth, which is the minor question (section 6). **Defer.**
- **Arm L (ridge logistic) and S1 isotonic calibration.** The pilot shows 2 features tie 25 (+0.001 [-0.007, +0.009]) and the 2-feature model ties RRF (-0.002 [-0.006, +0.002]) (`lane-ranking.md` §5.2, reproduced by verify-b R-o). L exists only to give S2 probabilities, and S2 is a trial whose one published relative (Adaptive-k) lost 3 to 5 points to fixed budgets (verify-b S-i). The cheaper calibration is the empirical precision at each rank position on earlier commits, which needs no model. **Cut L and S1 unless S2 survives its own test first.**
- **T1 validity sets as an agent feature.** The 71x storage saving (1.74M edge records against 24,579 validity records) saves disk, which is not a cost at this size (the whole adjacency is 65 KB). No CQ asks an "as of commit K" question; CQ1 asks whether a conclusion holds now, which needs only re-running its premises at the current commit (T4). T1 is evaluation infrastructure (leak-free parent builds) and the storage form behind T6. **Keep, but relabel it as harness infrastructure, not as the "temporal topology" answer to the owner.**
- **M5 changeset nodes.** "Answers the and-why through message and PR" is what `git log -- path` already does, and agents already do it (CQ10: `git log --oneline` with a path, `gh pr view`). The added value is one call instead of two. Keep only because it costs hours; expect nothing measurable.
- **M7 per-method calibration.** Parser-exact kinds are already about 1.0 (verify-a M6). **Fold into the K6 quality card**; it is not a separate component.
- **K3 extraction audit.** v1's extraction is not the bottleneck: 0 of 4,886 call edges chosen by name, sampled call precision 30 of 30 (`v1-audit.md`). K3 needs installs. Its stop rule is good. **Defer** until a CQ-level test shows that a missing edge, not a missing node kind or document layer, is what loses answers.
- **CQ4 rules for CLAUDE.md invariants: a file the agent already has.** The invariants file is `CLAUDE.md` (`use-cases.md` line 168: 50 calls, 22 transcripts, 1.2M carried). That file is loaded into every session's prefix, subagents included (it is in this lane's own prefix). A `rules` answer that returns invariant text duplicates the prefix; its only new content is the anchor (which rule applies to this code) and the role. The `rules` operation should return anchors and source line numbers for prefix-resident rules, never their text.
- **The cheaper thing for the session start is not a graph.** The largest product items behind the 55 % pre-edit share are full reads of design notes (15.3M carried, 46 transcripts), gate defect IDs (7.8M, 40 transcripts) and plan section 0 (6.1M, 15 transcripts). A section and ID index (outline plus ID lookup), or the orchestrator handing each phase session the exact sections in its brief (the orchestration skill already prescribes a context block per subagent prompt), removes most of that without any relation. M3's relations (covers, supersedes, justified_by) add to that only where an agent needs the links. The design never states this baseline, so `brief` cannot show that its graph part matters (section 7).

## 3. Scale

- **Correctly scaled in the design:** the not-worth-it list in section 9 (graph database, reachability indexes, reordering, Datalog engines, embeddings, GNNs, TLogic, PCST approximations). GRAIL's own "small" sets are 3,617 to 38,811 nodes (verify-a S2), the same order as 5,464, which is the best support for "no index here".
- **R2's resource-allocation weighting (NBI).** The measured gain (hit rate 16.2 % vs 14.1 %) is on MovieLens, 943 users by 1,682 items, 85,250 links, random split, user-item recommendation (verify-b R-n). Here there are 948 co-change pairs at the frozen commit from about 177 usable commits. The design keeps it as one of 12 swept variants, which is the right status; it must not be described as expected to help.
- **M7 and K6 sampling designs** (Knowledge Vault, Gao et al.) were built for 1.6 billion triples and web-scale annotation costs; at 73 to 385 labels per kind, cluster sampling saves little (verify-a M6, M7). The design already says this.
- **M6 identity ladder thresholds** come from HistoryFinder on 200 Java methods, self-evaluated (verify-a M4). Not a scale problem but a transfer one: Python and TypeScript bodies of a few hundred files may behave differently; the local replay is the only valid evidence, as the design says.
- **At 10x and 100x.** The design's claims hold their direction: at 10x code the card and span answers gain value; at 100x history (about 23,000 commits) TLogic-style rules and learned rankers become testable; at about 10^5 nodes a graph engine's traversal speed starts to matter. None of this changes a tier-0 choice.

## 4. Learning on little data, and leakage

1. **The ranking tests re-use the data that chose the arms.** The pilot (`lane-ranking.md` §5) ran on exactly the 65 tuning commits and the late 50 rolling split. RRF with k = 60, restart 0.15, the 2-feature form and the floor were all seen there. R1's "keep F only if its paired interval over the best simpler arm is above zero and the gain is at least 0.02" will be computed on the same commits, where RRF already beat the graph-conditioned floor by about +0.022 (0.233 against 0.211). This is a re-run, not a test. The held-out 75 are spent and only 16 commits (10 touching product code) exist after the frozen commit `a31924a` (2026-08-03), checked with `git rev-list`. No clean confirmation of any ranking choice is possible on zero-model data. The design should say so in R1, not only in section 10.
2. **Rolling origin is sound for history features, and only for them.** The pilot builds features from the parent snapshot (`feat.py` line 25, verify-b R-o). Training on at least 15 earlier commits and scoring the late 50 is a correct time-respecting split. Ridge with at most 8 features on about 15,000 candidate rows will not overfit in the classical sense, but the rows are clustered (388 seeds in 50 commits), so the effective sample is about 50, and 12 R2 variants chosen on an inner split then compared on the outer 50 still invite a winner's curse unless the comparison is nested and reported with the selection step inside the bootstrap.
3. **Document text written after the fact is a leak path the design does not close.** CLAUDE.md's invariants name later migrations and PRs (for example migration 0046 and PRs #162 and #163), so many of them did not exist at early tuning commits. M3's role anchors are "hand-assigned once for the 20 invariants", at the current text. If any M3 fact (a rule anchor, a "same rule" feature, a `brief` section) is used when scoring a tuning commit, it carries knowledge of later defects into the past. The rule must be: every document fact used at commit C is extracted from the document as of C, and hand-assigned roles are dated and used only from their date.
4. **The program documents are not on the code's history at all.** 124 files under `docs/program` are tracked (on a docs branch, not main) and 1,780 are untracked (checked with `git ls-files`). Program work is 1,147M carried tokens, almost five times product work. T1's commit-keyed validity cannot apply to most of it; the design names this only as an owner decision ("index by content hash"). Two histories (code commits, and document versions by hash) have to be modelled, and T5 citations cross them.
5. **The "tuning data" definition includes snapshots from the held-out period.** The 191 cached snapshots cover the whole history, held-out commits included. Using them for the identity replay (M6) and the invalidation tests (T2, T5) is harmless, because those tests score no retrieval. Using them for T6's "find the next changed files more often than recency alone" would spend held-out commits again. The design should restrict every predictive test to the tuning range.
6. **The transcript replays are in-sample.** The 13 product sessions (one day, 2026-11-13, one plan) produced the CQ list, the 55 % session-start figure and the `brief` idea; the `brief` and M3 replays then score on the same 13 sessions. Those sessions also ran on code three months after the frozen commit, and transcripts carry no commit SHA (`use-cases.md` §11), so the replay must first establish which commit each session saw.

## 5. Can each tuning test fail, and is the simple arm the strongest one?

- **Q1 prune test: biased toward cutting, and measuring the wrong thing.** Removing a kind and checking T1 recall plus 20 typed questions cannot show the value of a kind that serves a CQ with one or two questions (uses_fixture for CQ7, for example). With paired SD 0.263 on recall, "recall falls beyond the 95 % interval" will almost never happen, so the rule prunes by absence of evidence. It also contradicts the forward check (every kind serves some CQ). Fix: decide kinds by the backward check per CQ (can the CQ still be answered without the kind) on enough questions per CQ, and use recall only for the ranking kinds.
- **M1 test (a) cannot fail.** Adding nodes for variables and members raises "share of definitions with a node" by construction. It is a build check. Also the baseline 88.8 % is the held-out figure (354 of 3,150); the tuning figure is 91.3 % (364 of 4,162 missing, `v1-audit.md`), so the test quotes the wrong set.
- **M3 test (ii) is biased toward passing.** "Sections later cited or acted on" is measured from transcripts in which only 9 % of model calls carry visible text (`use-cases.md` §11), so use is under-observed and the read-but-unused share looks larger than it is.
- **A1 `brief` test can pass while saving nothing.** "The card contains the files and sections the session went on to edit or cite" is met by a list of names, which costs a few tokens; the agent then still reads the files. The test must score the tokens the agent would still have to read after the card, or count containment of the needed spans' content, not of their names. Its strongest simple arm is missing: the phase's own sections pulled by heading and ID with `awk` (what agents already do) or an orchestrator-written brief.
- **M6 cut condition is a re-measurement of a known number.** 736 of 2,179 vanished ids (34 %) are line-number moves; stable ids remove those by definition, so "cut spurious invalidations by about a third" will pass. M6's real value is conditional on M4 conclusions being reused, which is untested.
- **K1 test has no cut rule.** "Each difference read by hand" says what to look at, not what result would remove K1.
- **R1 test lacks the agent-realistic baseline.** The declared arms are plain co-change, v1 final and rule pick, PPR, directory proximity, F and L. The scripted search arm (grep for the seed's identifiers plus the co-change and directory tails) is missing, although it is the one v1 failed to beat outside the mobile app and the one an agent actually runs. Without it R1 can pass while losing to what an agent does today.
- **R4 and R5 have no margin.** "Paired contrast with and without" and "cut if not higher" need the same 0.02 P@10 or 0.065 recall resolution and an interval rule as R1.
- **T2 "stale must be 0" is sound but bounded.** Zero stale is judged against the extractor's own facts (`v1-audit.md`, k0 row). The mutation test removes or adds one fact at a time; it does not test multi-fact interactions or extractor misses. A cached answer can be fresh and wrong.
- **T4 test (ii) has no threshold** ("non-trivial share", "nearly everything"). It can neither pass nor fail as written.
- **S1 test has no cut rule.** A reliability curve and Brier score are reported, not judged.

## 6. Does the design serve the measured use, or what a graph is good at?

Mostly the measured use in its model (M3 first, `brief`, CQ table), but not in its validation:

- `use-cases.md` recommendation R1 asks for a test set of CQ instances taken from transcripts (the agent's seed and the spans it went on to use), weighted by carried-token share, with a falsifier for when spans cannot be identified. `DESIGN.md` section 10 does not adopt it. Its data are T1 co-change truth, 40 to 60 typed questions with truth read from code, and the phase-start replay. So the zero-model evidence will again be dominated by co-change truth and hand-written typed questions.
- The whole ranking stack (R1, R2, R3, S1, S2 and arm L) is tuned on T1 truth, "which other files did this commit modify". The use-case lane maps that truth to CQ10, 1.8 % of product carried tokens. The design files ranking under "CQ6, CQ8, CQ10", but CQ8 (who uses X) is an exact reverse-edge query, and CQ6's dependents are R5's job. "Which other files will I need to edit" is not one of the 16 recorded CQs. Either add it as a CQ with a transcript measure (files edited after the session's first read) or accept that R1 serves a question nobody measured.
- The largest program item, CQ1 (521M carried, 45 %, the noisiest label), is served by M4 and T4. Their validity checking works only for premises inside the repository (graph queries, code spans, tracked document sections). Program conclusions mostly rest on papers, web pages, scratchpad measurements and untracked notes, which fall in the time lane's unverifiable class (`lane-time-incremental.md` line 199: served only as a hint). The share of CQ1 conclusions with checkable premises is not measured. Until it is, M4 and T4 cannot be credited with any part of the 521M.
- CQ3, the largest product form (50.0M, 20.7 %), gets only a card plus spans. That is honest, but it means the largest code cost is the one v2 changes least.

## 7. Missing, where the theory clearly calls for it

1. **The transcript-derived, carried-token-weighted CQ test set** (section 6). Without it no zero-model number is about the measured use.
2. **An index-only arm**, in the zero-model tests and in the pilot: section outline, ID lookup, symbol and file index and BM25, with no relation edges. The pilot's BM25-only arm is close but lacks outlines and IDs. This is the ablation that shows whether the graph part, rather than the index part, saves tokens. Uschold and Gruninger (confirmed, verify-a M1) say CQs cannot rank two designs that both answer them; this arm is how the design ranks "graph" against "index".
3. **Programmer-navigation and task-context theory as the source for `brief`.**
   - Kersten and Murphy (FSE 2006, DOI 10.1145/1181775.1181777; abstract and a related paper's summary read, full text not opened) build a task context from the programmer's interaction history as a degree-of-interest weight per element (edits and selections) and report a significant productivity gain for 16 industry programmers (M for the existence of the effect, abstract level).
   - Piorkowski et al. (VL/HCC 2011, PDF text extracted and read) compared navigation-prediction models on one participant's two Java debugging sessions: for 123 click-based navigations, recency hit the next method in the top 10 54 % of the time, frequency 36 %, undirected call depth 11 %, source topology 8 %, forward call depth 1 %; for 676 view-based navigations within-file distance reached 83.4 % at top 3 (W: one participant).
   - What this means here: the truth for "what will the agent need" is the agent's own reads and edits, which the 1,452 transcripts record; the design scores against co-change instead. A task-context store (per phase or slice, the sections and files earlier sessions read and then edited, ranked by frequency and recency) is the documented-theory version of `brief`, and it is a required competitor arm for any graph-derived `brief`. In the one head-to-head study, call-graph proximity was a weak predictor of navigation.
4. **A push mechanism with its own test.** `use-cases.md` §7 point 5 says the "is this still true" check must be pushed at edit time, because agents trust documents and never ask. The design mentions an edit-time warning in T5 and CQ4 but has no component for the hook (what triggers it, its token cost per edit, its false-alarm rate). Round 2 found that adoption needs steering (CodeCompass: 51 of 88 graph-condition trials, 58 %, made no graph call; a checklist raised adoption to 100 % in one group, with the prompt changed, W; `../widen/lane-agents.md`).
5. **A text-embedding entry arm as an owner decision.** R4 rejects embedding entry because it needs a model download, but the owner-decision table does not list it. Round 2 records one pre-registered small-model study where localisation gains were explained better by the embedding index than by the graph (`../widen/lane-agents.md` line 119, W). For prose lookups (CQ1, CQ2) an embedding arm is the obvious competitor to BM25. It should be listed with its install size so the owner can decide.
6. **A power calculation for the agent pilot tied to the expected effect** (section 9), and an intermediate lookup-level replay (tokens per answered lookup on recorded lookups, with and without the tool's answer) that can see effects of a few percent.
7. **A two-history model** for code commits and document versions (section 4.4).

## 8. The owner's words: covered honestly?

- **"graph theory"**: partly. Link prediction (local indices, Katz, rooted PageRank), hypergraph projection, Steiner trees, knapsack and quotient graphs are named. Graph summarisation (the slice quotient is a quotient graph) is used but not cited. The strongest documented theory for "fetch only what is needed", information foraging and navigation prediction, is absent (section 7).
- **"knowledge graph"**: needs the Hogan correction (section 1.1). v1 already qualified.
- **"TKG"**: needs the two-sense answer (section 1.2): a TKG in the representation sense, over a branching history; not a forecasting TKG.
- **"spatial and temporal topology"**: "spatial" in v2 is the folder tree and the slice quotient. There is no spatial embedding or spatio-temporal graph model, and none is needed. Say that plainly rather than map the word onto the folder tree as if it were the owner's concept. "Temporal" is mostly evaluation infrastructure (section 2, T1).
- **"caching and invalidation, intensely documented"**: honestly covered (verifying traces, early cutoff, predicate locks, truth maintenance). The qualification is the one above: zero stale is relative to the extractor's facts, and conclusion caching pays only if conclusions are reused, which is unmeasured and has flat-to-negative nearby evidence.
- **"semantic relations"**: v2's relations are typed parser edges and hand-anchored rules. There is no semantic (meaning-similarity) retrieval; that was declined, and the embedding option is not even on the owner's decision list. Say so.
- **"small and fast"**: "fast" is already met (milliseconds; per-call overhead, not storage). "Small" is A2 and S2, measured with a regex tokenizer and 2.42 characters per token; the size of an answer is not the agent's total tokens.

## 9. Token-saving promises only an agent test can show

The design is careful in section 0, but these lines still read as promises:
- M3: "the largest candidate saving". It is the largest addressable cost (CQ2 plus CQ4: 17 % of product and 22 % of program carried tokens), not a saving. Note also that the 55 % session-start share includes code orientation (CQ3), so M3's addressable share is the 17 %, not the 55 %.
- A1: "exact answers in about 1,000 tokens instead of search-and-read". Size of an answer, not tokens saved.
- A2: "39 to 57 % fewer tokens per edge than triples". A character estimate per answer, not per task.
- The illustration "3 to 5 % of product context and about 8 % of program context". Labelled as an illustration, which is correct, but it is also the effect size the pilot would have to detect.

The pilot's power, from round 2's own calculation (`../widen/protocol-v2-power.txt`): with 40 change tasks and 2 or 3 arms, the probability of a confident "yes" on tokens is 0.02 to 0.09 at a true 10 % saving and 0.33 to 0.47 at 15 % in the most favourable variance case; 80 % power needs about a 20 to 25 % saving. An effect of 3 to 5 % of context is invisible to that pilot. Options: concentrate the pilot on tasks dominated by the served CQs (phase starts, document lookups), measure at the lookup level, or accept that the pilot can only rule out large effects.

## 10. Claim-by-claim results

| Claim (design) | Result | Qualification |
|---|---|---|
| v2 is a knowledge graph in Hogan's sense because it has schema, identity, provenance, quality | needs qualification | Hogan's definition is inclusive; v1 already was a KG; those are aspects, not the definition |
| v2 is not a TKG | needs qualification | Not a forecasting TKG; it is a TKG in the representation sense over a branching history |
| Ceiling: graph-served CQs carry 38 % of product carried tokens (8.8 % of product context), about 21 % of program | needs qualification | Arithmetic checks (91.9M of 242M); program figure rests on CQ1, whose label is noisiest and whose conclusions mostly have no repo premises |
| Illustration 3-5 % product, 8 % program | survives as illustration | Must never be stated as a forecast; it is below what the pilot can detect |
| CodexGraph 7-15x BM25 tokens | survives | S per verify-a M5, one system, GPT-4o |
| Q1 CQ registry with forward/backward checks | survives | The kind-prune test is biased toward cutting; decide kinds by per-CQ answerability |
| M1 closes the 11.2 % definition gap | needs qualification | Coverage test cannot fail; baseline quoted from held-out (88.8 %), tuning is 91.3 % |
| M1 `references_literal` cut at under a third | needs qualification | Threshold unsourced; CQ8 is 4.2 % of product |
| M2/K4 contract layer, tiers 1-2 | needs qualification | CQ13 is 1.0 % of product; trial only |
| K4 tier 3 web def-use | refuted as worth building | One abstract, untyped JS, for under 1 % |
| M3 meaning layer is the largest candidate saving | needs qualification | Largest addressable cost (17 %/22 %), not a saving; most of it is reachable by an outline-and-ID index or orchestrator briefs |
| M3 role vocabulary from theory | refuted | Roles are hand-made; W3C note justifies only the node form |
| M3 test (ii) | needs qualification | Biased toward passing (9 % visible text) |
| M4 ledger: no stale conclusion served | needs qualification | Only for repo-premised claims, and stale relative to extractor facts; reuse unmeasured |
| M4 theory: in/out lists from de Kleer | refuted as cited | Doyle's JTMS; M4 uses Build Systems verifying traces |
| M5 hyperedge answers the "and why" | survives | Equivalent to `git log -- path`; no ranking gain |
| M6 stable identity is the precondition for stored conclusions | survives | Its cut condition re-measures a known 34 %; value conditional on M4 reuse |
| M7 calibration per method | survives as hygiene | Fold into K6 |
| K1 framework export is exact | survives | Needs a cut rule; pin FastAPI (verify-a C6) |
| K2 type-aware resolution kept | survives | |
| K3 audit decides whether extraction is a bottleneck | needs qualification | Extraction already strong; installs; defer |
| K5 document extractor | survives | Labels per type have a cost not counted |
| K6 quality card | survives | |
| T1 validity sets give correct as-of answers | needs qualification | No CQ asks as-of; it is harness infrastructure; most program documents are off the commit history |
| T2 zero stale by construction | needs qualification | Relative to extractor facts; single-fact mutations only |
| T3 kind filter | refuted as worth building | No token effect, validation already 0.31 ms |
| T4 revalidation statuses | needs qualification | Test (ii) has no threshold; unverifiable class dominates program claims |
| T5 citation resolution fact | survives | Crosses two histories |
| T6 since-view smaller than git diff --stat | needs qualification | Restrict its predictive test to tuning commits |
| R1 RRF +0.030 P@10 over PPR | survives as measured | In-sample re-run; missing scripted-search arm; serves an unrecorded question |
| R1 25 features tie 2 | survives | Reproduced by verify-b |
| R1/R2 rejection of GNNs, KG embeddings, LambdaMART, TLogic at this size | survives | Pujara evidence is 2013-16 translational models (verify-b) |
| R2 co-change projection | needs qualification | NBI gain is random-split MovieLens; one variant among 12 |
| R3 depth-3 tier | needs qualification | Serves the minor truth; defer |
| R4 lexical entry from LocAgent's 19 vs 2 points | needs qualification | Fine-tuned 7B, unnamed dataset; direction only; no margin in the test |
| R5 what-breaks ranker | needs qualification | Research-scale cost for part of 4.2 %; Legunsen figures are revision shares, Java |
| S1 calibration prerequisite | needs qualification | Needed only if S2 survives; rank-position precision is cheaper |
| S2 value-density stop | needs qualification | Theory exists (marginal value theorem); F = 695 is the wrong quantity, 13,000 with carry |
| S3 level of detail | survives as trial | Information diet model is its source |
| S4 Steiner connect | refuted as worth building | No recorded CQ |
| S5 MMR | refuted as a component | Keep as a measurement |
| A1 CLI, no query language, no paging | survives | Cypher 61.58 % best (S-d), paging below no tool (S-c) |
| A1 caps 1,000/2,000 tokens | needs qualification | Cited caps come from small models |
| A1 `brief` test (70 %, a quarter) | needs qualification | Passes on names alone; needs content-based scoring and the strongest simple arm |
| A2 tree format 0.43x triples | survives for size | Accuracy evidence about one sample of 37 |
| A3 pointer at most 500 tokens, about 0.35 % | survives | Adoption needs steering beyond a pointer |
| ST1 SQLite plus arrays; no graph database | survives | At this size; revisit at about 10^5 nodes |
| Section 9 not-worth-it list | survives | |
| Validation: rolling origin, paired bootstrap, declared arms, one-SE rule | needs qualification | No clean confirmation set remains; nested selection required |
| Validation: held-out spent, descriptive only | survives | |
| Agent pilot is decisive | needs qualification | Underpowered for the design's own expected effect |
| Owner-words table covers every phrase | needs qualification | Semantic, spatial and TKG answers need the wording in section 8 |
| 12b: earlier rounds never treated ranking as link prediction etc. | survives | But this design repeats round 1's habit of scoring on co-change truth |

## 11. Sentences nobody may say to the owner about this design

1. "Every design choice in v2 comes from documented theory." (About a dozen thresholds, the role vocabulary, the pool, the caps and S2's F do not.)
2. "v2 will cut agent tokens by 3 to 5 %" or any other forecast of a token saving.
3. "The brief removes the session-start cost" or "M3 saves 17 % of product tokens."
4. "The ledger will save the 521M program tokens", or any share of them.
5. "The cache can never serve a wrong answer." (Zero stale only relative to the extractor's facts.)
6. "The ranker is validated" or "RRF is proven best". (In-sample on 65 commits, +0.030 P@10, coverage-limited, against arms that omit scripted search.)
7. "v2 is a temporal knowledge graph" or "v2 is not a temporal knowledge graph", without saying which sense.
8. "v1 was not a knowledge graph; v2 is."
9. "Graph databases do not help." (Only: not at this size, for this workload.)
10. "The schema is optimal because it answers all the CQs." (The CQ method cannot rank two designs that both answer them.)
11. "The agent pilot will settle it." (At about 40 tasks it detects only savings of about 20 % or more.)
12. "v2 stores semantic relations" in the sense of meaning similarity.
13. "Zero-model tests showed that this component saves tokens."

## 12. What I could not open or verify

- Doyle 1979 (JTMS) not opened; the attribution rests on the time lane's reading of de Kleer 1986.
- Pirolli and Card 1999 and Charnov 1976: bibliographic records and the patch-model link only, through search results; no effect size used.
- Kersten and Murphy 2006: abstract-level statements only (full text hosted elsewhere, not opened).
- Piorkowski et al. 2011: full text read; one participant, Java, Eclipse, so W.
- I did not re-run any lane measurement. The power figures are round 2's script output, with its variance assumptions (s 0.293 to 0.586).
- I did not count what share of CQ1 conclusions have repository premises; that is a measurement the design needs.
