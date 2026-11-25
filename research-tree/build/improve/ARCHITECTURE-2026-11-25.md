# One model for "which files": the architecture, derived (2026-11-25)

Owner record: r58-0011. Page: `improve/review-page/architecture.html`. This file is a design, reached by reasoning from
his lecture deck (`briefs/GRAPH-TRANSFORMER-QUESTION.md` holds what the deck says), the published work collected today
(`improve/lit/GT-LIT-1.md`, `GT-LIT-2.md`: abstract or page level), the recorded research (`APPROACHES-2026-11-25.md`
section 2) and our own measurements (T1, T2, T3, `FAILURE-MODES-2026-11-25.md`). Nothing here is built. Marks:
[deck] his slides; [lit] today's collection; [rec] the recorded research; [m] measured here; [own] the top session's
own knowledge of the literature, not fetched today, to be read at source before it carries a decision (r57-0014).

## The owner's words, in full (they outrank this file)

> "Then shouldn't it also be able to see if there is an error and immediately prefetch which file the error could have been, like a sort of a prediction, and us having a very good accuracy for that, basically. And is this all this graph is doing, this graph unilateral or whatever, and we have to be sure that it can be specified to these specific repos. If it isn't trained to be generalized to a point where it can be used across repositories in a way like a generalized system or training or algorithm, whatever, then there's not much value to it outside of our project. So it won't have much value outside when I showcase it in some hackathon or a research paper or whatever. So that's an issue to consider. And I need a proper view and not a thorough explanation, but a better view of what we're trying to do and how we're trying to do it. Like, you're looking at facts from a perspective, okay, new information is the only thing that moves the score. We did this, so that happened, this was held back by our own setting. Or we're not even focusing on the architecture itself and what we're building. We're not doing great work on the architectural and technical side of it, I would say. You're saying a relational graph transformer is worth one fair test later? Like, how are you justifying that claim of yours? Like, I think that is the problem across all of your decisions and the things you test and make and design. I gave you a whole 100 slide explanation. Using that, you should be able to, by some chain of thought, some reasoning, be able to decide which factors, which formulas are best suited to this problem, and due to those reasons that you have figured out and compiled through the information that we provided and gained throughout multiple research sessions, that this architecture or this way of doing this, this nuanced way of doing this, would get us very good results. I'm seeing that we're not using that sort of workflow and that sort of thought process to this. So the way we're approaching the solution to these problems is faulty. If I'm wrong and what I'm saying is different from what you're doing, then let me know. But I do think you should take this into consideration."

## 1. The problem, stated once

Three questions an agent asks of a repository at time t are one mathematical object:

- task words -> files to open; a change -> the other files that must change; an error -> the file at fault.
- Each is **a ranking of the files of a typed, directed, time-stamped graph, conditioned on a query**. The query is a
  set of seed nodes S with weights, plus a text vector z: a change gives seeds (the edited file and the symbols its
  diff touches) and the edit's text; an error gives seeds (the frames of its stack trace) and its message; task words
  give text, and the best text matches become soft seeds.
- The answer is a set (the files of one change), scored as the top ten of all files.

Requirements: R0 it must work on a repository it never trained on (r58-0011); R1 it must hold pair facts ("these two
changed together seven times"), which a vector per file cannot [m: graph alone 0.107 under counting 0.124]; R2 it must
see the whole history, not a window [m: a 31-event window holds 55/26/39 % of truth against 70/34/79 %]; R3 it must
reach files with no shared history, 21-66 % of truth [m], through code structure; R4 it must never fall below counting,
which five earlier learned forms did [m, APPROACHES section 3]; R5 every answer must carry its evidence, so a model or
an agent reading it cannot be handed an invented file.

## 2. The chain: each choice, the formula, and why

| # | what the problem needs | choice and formula | why this and not the alternative |
|---|---|---|---|
| 1 | R0: the same weights on any repository | No learned vector per file. A node's input is x_v = frozen text embedding of its content or signature, plus its type. Position is never a global coordinate | Identity embeddings (RotatE, ComplEx, a memory per node) belong to one graph [m: the embeddings test recovered the facts it was trained on]. Laplacian eigenvectors are coordinates of one graph: O(n^3) or approximate, sign and basis ambiguous, rebuilt at every commit of a growing graph, and undirected ("isotropic", as he noted) [deck]. A coordinate in one repository means nothing in the next |
| 2 | R1: pair facts | **Condition on the seed.** h_v^0 = W_type x_v + 1[v in S] * w_v * (W_q z + e_kind). Every later state of v is then a function of (query, v) | Message passing is bounded by 1-WL and cannot count substructures; the cure is a symmetry-breaking label [deck]. For a pair task the right label is the query's own seed (the labeling trick, NBFNet): one propagation per query scores every candidate, cost O(L * E_sub * d), not n^2 [own]. Pair-conditioned models score 7.71-9.23 against 2.08 for one-vector-per-item on the relational recommendation tasks [lit]; the inductive form is on record: NBFNet +22 % inductive Hits@10, ULTRA zero-shot across graphs 0.395 against 0.344 MRR [rec] |
| 3 | counting must be a special case (R4) and edges are not alike | **Edge-gated, typed, directed messages**: m_(u->v) = (W_r h_u) * g(x_e, phi(t - t_e)), with x_e = log count, decayed sums (30/90/365 days), 1/commit size, days since last. Aggregation = degree-scaled **sum** and max, never mean: h_v' = h_v + MLP(h_v^0, sum, max) | "Most real-world data is anisotropic": an isotropic layer treats a co-change of last week in a two-file commit like one of three years ago in a forty-file commit [deck]. Sum is the injective aggregator; mean cannot count [deck, GIN], and our network used a row-normalised mean [m, failure row 1]. With one layer and co-change edges only, the gated sum from the seed **is** weighted counting. Direction is carried by typed edges and their inverses, so no direction-aware Laplacian is needed at this stage |
| 4 | R2: all of history, no memory to go stale | History enters as **aggregated, time-stamped edges** read at query time; time as phi(delta t) relative to the query; no per-node memory | The memory model trained with a shortcut it lacks when scored and ranks by popularity [m, T3]; windows drop half the partners [m]. A relative time encoding is the same function in every repository |
| 5 | R3: files with no shared history | A **parsed code graph** under the same messages: file contains symbol, symbol calls or references symbol, file imports file, test covers file, folder tree. Seeds at symbol level from the diff or the stack frame. Depth L = 3 | file -> symbol -> symbol -> file is three hops. Truth without history lies within two hops of imports and folders for 8.5/45/11 points even before symbols exist [m]; a typed store with definitions added +0.076 recall [m, graph test]. Over-squashing starts near radius 4 [lit], and the two-hop field already covers most of a repository [m, failure row 1]: so three layers, a seed-relative state (less to compress), and step 6 instead of depth. Edges are parsed, never model-written [rec] |
| 6 | the cost of n^2, and reach before order | **Retrieve, then attend.** Candidates C = union of the best ~100 by count, by personalised PageRank from S over the typed graph, and by text; about 300 tokens. Dense attention only over C | "Graph retrieval can select relevant subgraphs instead of processing the entire graph"; dense attention is practical to about a thousand tokens [deck]. At 300 tokens O(K^2 d) is small, so no patching and no linear-attention variant is needed. Reach moved recall 15 times more than ordering in the graph test [m], so the retriever is a union tuned for recall |
| 7 | position without coordinates (R0) | **Seed-relative encodings** per token: typed hop distance to S, personalised-PageRank mass from S per edge group, log co-change with S, time since last change, and a **tree encoding** of the folder path relative to the seed (depth of the common ancestor, sibling flag) | Slide criteria for an encoding: equivariant, distance-sensitive, structure-sensitive, O(n) [deck]. A walk from the seed meets all four, has no sign ambiguity, follows edge direction, means the same in every repository and is computed on the time-valid graph, so it cannot see the future. Random-walk encodings won the one ablation read; PPR-selected pair attention ranked first on 5 of 6 benchmarks [lit]. The tree row of his screenshot maps onto the folder tree; name and folder features carried the ranker's gain on the clinic [m] |
| 8 | a change is a set; candidates relate to each other | **Two layers of attention among the candidates**, with a bias from their own links: a_ij ~ exp(q_i k_j / sqrt(d) + b(rel_ij)) | Scoring each candidate against the seed alone cannot say "these five move as a group". Attention gives every candidate a one-hop path to every other, which is the deck's remedy for long routes, without more message-passing depth. Message passing below, attention above: the hybrid he named |
| 9 | R4 again, and the right target | **Score** s_v = MLP(token_v) + alpha * log(1 + decayed count(S, v)), alpha = 1 and the MLP near zero at the start. **Loss**: softmax over the candidate list with every true file a positive | At the first step the model equals counting and learns only the correction. The candidates are hard negatives by construction; uniform negatives mismatched our scoring and easy negatives leave models unable to rank [m, lit] |
| 10 | R0: data | Train across many public repositories, one query per commit; **no repository-specific parameter anywhere**. A new repository needs only its graph (a parser and its git log), no training | Two of our repositories have 303 and 214 training cases [m]; more of the same data did not help the old form [m, T3], so the data must be other repositories, which only an inductive model can use. The published edit-location models trained on 180K commits of 471 projects [lit] |
| 11 | R5: evidence | Return with each file the paths from the seed that carried its score | A later judge model or the agent can be made to cite them, and a checker can drop anything without a path [rec: existence checks] |

## 3. Why this should work, as predictions that can fail

- P1, files with shared history: equal to counting at the start; above it after training, from the time and commit-size
  gates and the attention among candidates. Room: a perfect order inside history scores 0.198 against 0.124 [m].
- P2, files without shared history: above the learned ranker, from symbol-level seeds and typed paths. Today: recall in
  the top ten 0.004 for counting, 0.106 for the ranker, 0.225 with the edit's words [m].
- P3, an unseen repository: no worse than counting there with zero training on it, since counting is inside the model
  and counts are inputs, not parameters.
- It fails if: on an unseen repository it is below counting on files with history (the gate or the skip did not
  hold); or it adds nothing over the ranker with the edit's words on files without history (paths carry no more than
  hand features); or the parsed graph misses the links that matter (static call graphs miss 24-30 % of call edges and
  every cross-runtime pair [rec]).

## 4. What stands today against this

- Built and working: the history tables, counting, the learned rankers for both tasks, file text vectors, a script
  import graph. Not built: the symbol and call graph, the seed-conditioned network, any training across repositories,
  any test on an unseen repository, any error-to-file test set.
- **Everything measured so far was trained and tested on the same three repositories.** Generalisation is untested.
  The rankers use repository-independent features, so a leave-one-repository-out test of them is possible now from the
  tables on disk; the time-aware models keep state per repository and cannot transfer as built.
- Error to file: the same model with stack frames as seeds. The literature's families (text match, files named in the
  trace, files fixed before, recent changes) are named here from [own]; no figure is recorded and none was collected
  today. It needs a test set of real errors with their fixes, which we do not have.
- The published relational graph transformer supplies the token recipe of step 7 (type, hop, time, tree); its
  backbone answers a different question (one row's label) and was never run on a pair or set task [lit]. So the
  answer to "is that the model" is: its encodings yes, its backbone no; rows 2, 3 and 9 are what our task adds.

## 5. Size and cost, to be computed before any build is asked for

Model: about 5-10 M parameters at d = 256 [own estimate, to compute]. Per query: one propagation over a few thousand
edges and attention over 300 tokens. Training across thousands of repositories is the part that needs rented cards.
Downloads to name with source, size and licence before asking: a parser with its grammars; one public collection of
commit histories. Tokens: 81 % of the week used at 15:52 UTC, stop line 85 %, reset 2026-11-30 12:00 UTC.
