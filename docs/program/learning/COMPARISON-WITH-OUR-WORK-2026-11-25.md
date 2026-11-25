# Our work held against what the material teaches (first reading, 2026-11-25)

By the top session, which read the material itself (`MECHANISMS-NEURAL.md`, cited below as N, and
`MECHANISMS-DATA.md`, cited as D). This is the step the owner ordered after the compile: "compare to our approaches
... see where we're going wrong in development and how the development should be, how the architecture construction
should be, how we should reach to a conclusion, how we should work towards the hypothesis, what's the workflow,
whether our data usage collection or is not that good, whether the data engineering needs work. We'll all reason out
and work through all of those things first before actually training anything."

Standing: a first reading for him to correct, not a decision and not a design. Nothing was run for it. What we built
is taken from our own files: `research-tree/build/improve/CANDIDATES.md` (how forms were chosen),
`improve/APPROACHES-2026-11-25.md` section 1.1 (what each model was given), `runbig/card/d4/README.md` (how the data
was built), and the measurements `improve/units/T1`, `T2`, `T3` (used only to check an argument, never as its
basis).

---

## 1. What the problem demands of any model

The three questions he set ("which files" for task words, for a change, for an error) and his condition (it must
work on a repository it never trained on) can be stated in the material's terms. Each line is a demand that follows
from the problem, with the entries that make it one.

| | The demand | Why it is one |
|---|---|---|
| R1 | **The answer is relative to the question.** "Which files go with this file" is not a property of a file; it is a relation between the asked-about thing and each candidate. | A network that gives each node one vector from its own surroundings gives two candidates with the same surroundings the same vector, whatever was asked (N 9.4), and a link score built from two such vectors cannot prefer either (N 9.8). A task that depends on where a node is relative to something is a position task, on which "even a perfect GNN will fail" (N 9.7). The picture in the material is two triangles joined by a bridge, one labelled A and one B: the two mirror nodes get the same vector and "GNNs will always fail". The remedy is to describe every candidate relative to the question: distances to an anchor (N 10.5), marking the asked-about node inside the computation (N 9.10), or the graph entering through the attention between the pair (N 12.7). |
| R2 | **Multiplicities must survive.** How often, how recently and in how large a change two files moved together is the content of the history. | A mean cannot count and a max sees only which kinds are present; a sum, with a nonlinear map before and after, keeps the whole multiset (N 9.5). A normalised attention is a weighted mean and inherits the mean's limit (follows from N 9.5 and 12.6). |
| R3 | **No identities; everything in the repository's own scale.** A new file and a new repository must be handled like known ones. | One learned vector per entity is "shallow/transductive" and says nothing about an entity with no row (N 13.7); one-hot identities "cannot generalize to new nodes/graphs" (N 9.10). What is trained must be only coefficients that do not depend on the graph (N 3.1, 8.1). Transfer is proved only between graphs of one family, and is worse for small graphs (N 8.4), so inputs must be expressed relative to the repository's own structure, not in raw amounts (N 2.1, 7.1); a tree model on raw amounts cannot go beyond the range it saw (D 8.1). |
| R4 | **Only what was known at the moment of the question.** | A task is an entity, a label and a time, and "only use information up to the time of label" (D 9.1); the neighbourhood a model reads is different at every label time (D 9.4, N 13.9). |
| R5 | **Different relations mean different things.** Changed together, imports, same folder, test of, calls. | Separate treatment is needed when "different relation types represent different types of interactions" (N 13.1). Direction matters: imports are one-way, changed-together is two-way (N 2.2, 13.2); a scoring rule that can represent one kind of relation may be provably unable to represent another (N 13.8). |
| R6 | **Reach beyond history.** A share of the right files has never changed with the asked-about file. | Stacked local steps reach only as far as their layers (N 5.5), and far information is squeezed through bottlenecks (N 11); content, names and structure must be inputs, and far candidates need a direct path (N 11.3, 12.3) or to be retrieved first (N 12.5). |

---

## 2. The models we built, held against the demands

| What we built | Against the demands | Was it knowable before running |
|---|---|---|
| **Knowledge-graph embeddings** (ComplEx, RotatE, TransE; the first embeddings test and the card run). One learned vector per file, co-change given as yes-or-no facts. | Fails R3 by construction: a lookup table has no row for a new file, let alone a new repository (N 13.7). Fails R2: the counts were reduced to facts before the model saw them. The family was also not chosen by its own selection rule, "use the table to select models" after finding which kinds of relation the data has (N 13.8): changed-together is symmetric, which plain translation cannot represent at all; imports are one-way, which a plain product cannot. | Yes. Each of the three points is a stated property of the family. |
| **A graph network with a pair head** (GraphSAGE with mean aggregation, graph attention; 22 sizes). One vector per file from its neighbours; the score from the two vectors plus hand-made count features. | Fails R1: the two vectors are computed without reference to each other (N 9.8). Fails R2 inside the graph part: mean and normalised attention cannot count (N 9.5). So the graph part could carry neither the pair nor the counts; only the count features fed to the head could. The 22 sizes varied the part that by construction could not hold the answer; "a larger class is not better" (N 1.1). | Yes. Our own measurement afterwards agrees with the argument: the graph without the count features scored below plain counting, and the count features without the graph scored the same as the whole. |
| **Temporal graph models at library defaults** (DyGFormer, TGN; the 20 to 32 most recent events of a file). | The window is a sample of the history, and a sample's statistics are not the graph's (D 2.1, 2.8, 2.10): with it the counts over the whole history do not exist for the model (R2). Which neighbours are kept is itself a design decision with known effects: fewer means more variance, and the choice decides what the model can see (N 14.2); "the most recent few" was the library's choice, not ours. The memory form keeps one vector per file (R1). Its "historical negatives" label real earlier pairs as false, against the rule that a negative must not be a real edge (N 13.6). | Yes for all three. Afterwards: counting inside the same window scored like the model; the memory model ranked by a file's popularity; the historical negatives destroyed the score. |
| **A tree ranker over hand-made pair features** (our best on both tasks). | Meets R1 and R2 by construction: every feature is computed for the pair, and counts are features. That is the reason it leads; it is not evidence that "simple is enough". Its limits are the stated limits of the method: the features are "chosen arbitrarily (e.g., aggregations, time windows)" and "only a limited set of data is used" (N 13.9, D 9.2); what was aggregated away cannot be recovered; and trees "cannot extrapolate beyond the training range" (D 8.1), so raw counts and ages, which grow with a repository's age and size, break R3 on any repository unlike the three it saw. | Yes. |
| **The architecture draft of 25 November** (candidates described relative to the asked-about file, sums along typed edges, attention among retrieved candidates). | Its main choices agree with R1, R2, R5 and R6. It is still not a hypothesis in the agreed sense: it does not weigh the alternatives for each choice (for R1 alone: distances to the asked-about file as an anchor, marking the asked-about file inside the computation, a subgraph drawn around the pair, or the relation carried in the attention). Its history input is again aggregated pairs, the projection of D-a below. Its amounts are raw (logarithms of counts), which leaves R3's scale question open. It says "train across many public repositories" without a design for which ones. | It was written before the material was read. |

**What the table says about the plateau.** Every model that plateaued failed R1 or R2 or both by construction, and
the one model that met both is the one that leads. The plateau was a property of the function classes we picked.
Nothing in it measures the problem.

---

## 3. How we arrived at designs

1. **We chose forms the way a paper reports them, not the way a course teaches to choose.** Our candidate table has
   a column "published gain as recorded" and a column "chance, my judgment"; it has no column for what the problem
   demands or whether the form can represent it. The material's frame is the opposite: "designing a method can be
   equated to the problem of finding the right function class" (N 1.1), and its one explicit selection procedure is:
   first find which patterns the data has, then take a model that can represent them (N 13.8).
2. **We varied size inside a class instead of asking whether the class fits.** 22 sizes of one network, sweeps over
   neighbours and learning rates at library defaults.
3. **We read a null as a fact about the problem.** A null says: this function class, on this input, with this
   target. The first check after a null is the list in section 1, not another run.
4. **We ran tests to discover faults that an argument would have named.** A mean that cannot count, one vector per
   file for a question about a pair, a short window on a long history, negatives that were real pairs: each was found
   by measurement, and each is a stated property in the material.

**The workflow that follows from the material** (it is the agreed rules made concrete, not a new rule):
1. State the question exactly: what is known at the moment it is asked, what the answer is, when the label becomes
   known (D 9.1).
2. Look at the data for the patterns that decide the design, by counting, without training: which kinds of
   relation there are and whether each is one-way or two-way, how much of the answer history reaches, how the
   repositories differ in scale.
3. Write the demands on the model (section 1 is the first version).
4. For each design decision list the alternatives with what each can and cannot do, from the two learning files;
   choose; say what observation would refute the choice.
5. The owner sees that document before anything is built.
6. A test is the smallest one that separates alternatives that survived step 4. A result is read against the demands
   first.

---

## 4. The data: what holds and what needs work

**What holds, measured against the material.**
- Time-ordered splits with a strict cut-off, every model of a block seeing exactly the history before it (D 6.1,
  7.1, 9.1).
- A file keeps its identity through renames, which is the entity-resolution problem solved for this case (D 1.2).
- Every learned model is scored against naive baselines, counting and plain text search (D 7.2).
- Results are given per repository and not only pooled (D 7.3).

**What needs work.**

| | What we do | What the material says | What follows |
|---|---|---|---|
| D-a | **We feed a projection.** The extraction keeps the right fact (each commit with the files it added, changed or deleted, under a file id that survives renames), though without the content of the change. But every model was fed pairs of files that changed together, and the embedding models yes-or-no facts. | A table split by projection can be rebuilt only if the join gives back exactly the original; pairs do not (D 4.3, 4.8). From pairs one cannot tell one change touching A, B and C from three changes touching two each. A feature table made from other tables is a "loss of information" that no model can undo (D 9.2). | The fact to feed is the irreducible one (D 4.4): this change touched this file at this time, with this content. The change is an entity of its own with rows of its own, as the sale is a node of its own between user and product in the material's picture (D 9.3); pairs and counts are views a model may compute, not its input. The store gains the content of each change (one later test had to extract the diffs separately). |
| D-b | **Three repositories, chosen because they were at hand** (two of the owner's, one large public one). All three are in training and in testing; the pooled score is four fifths one repository. | "All of a biased convenience sample, not all of the truth" (D 1.2). "The goal decides the design" of a sample (D 2.7). Transfer is only proved inside one family of graphs and is learned from many graphs (N 8.1, 8.4). An aggregate hides segments (D 7.3). | For a model that must work on an unseen repository, the repository is the unit of sampling, and three is no sample. This is the largest gap: many repositories, drawn by a stated design (sizes, languages, team habits), with whole repositories held out of training. It is a download, so it needs his word. |
| D-c | **A change is taken to be whatever one commit holds**, with our own rules on top: no merges, only commits of 2 to 50 code files. | What counts as a link "is understood differently by different sources", and the recording method caps what can be recorded (D 1.1: the survey that allows three names). The recorded network is the true one combined with how recording spreads over it (D 1.2). | Our link is partly made by our rules and by each team's habits (squashed work, mixed commits, bulk edits). A 51-file commit yields no link at all. Raw co-change counts are therefore not comparable between repositories, which is R3 again: relative measures, and the commit-practice of a repository treated as something that varies. |
| D-d | **Every changed file of every eligible commit is a starting file; large commits give many more training pairs.** We found by trial that weighting a commit by one over its size is where much of plain counting's strength lies. | Sampling by events over-represents what takes part in many events (D 2.2, 2.8); a known inclusion bias is undone by weighting each unit by one over its inclusion probability (D 2.9, 3.2). | The one-over-size weight is the design-based correction and could have been derived. The same reasoning should fix how training examples are drawn, instead of leaving it to a library default. |
| D-e | **A content feature is empty for 88 to 99 % of the training cells of two repositories.** | It is "very, very rare for anything to be missing at random" (D 3.3); a pattern of missing values is itself information that can differ between training and use (D 5.3). | A feature that is mostly missing in training and present in use is a train-test difference built in. Either the content exists for every cell at every cut-off, or it is not an input. |
| D-f | **Three questions, one data set.** Task words to files and change to files have labels in the history. Error to file has none collected. | A task is an entity, a label and a time (D 9.1). What is known at the moment of asking differs: task words only; one changed file and its diff; an error text. | Each question needs its own training table over the same stored facts. The third needs data we do not have: error texts tied to the change that fixed them (failing test output, bug reports linked to a fix). Whether our repositories hold enough of that is a count to make, not a model to train. |

---

## 5. What I take from this, for him to correct

1. The models that failed did so for reasons stated in the material, and the model that leads does so because it
   meets the two demands the others broke. There is no finding here about the limit of the problem.
2. The next model is not chosen yet. Its hypothesis document starts from section 1's demands and weighs the
   alternatives for each; the draft of 25 November is one candidate answer to some of them.
3. The data needs more work than the models did: feed the lossless facts with their content, treat the repository as the unit, collect
   many repositories by a stated design, and build the third question's labels.
4. Order of work I would reason through with him next: the demands (is section 1 right and complete); then the data
   plan (D-a, D-b, D-f, each with what it needs from him); then the hypothesis document. Nothing is trained before
   he has seen that document.
