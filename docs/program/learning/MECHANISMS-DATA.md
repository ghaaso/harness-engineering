# What each data step can and cannot do: collection, sampling, structure, leakage, evaluation

Compiled 2026-11-25 by the top session from teaching material it read itself, in full (the owner's order and the list
of sources: `research-tree/build/briefs/LEARNING-COMPILE.md`). The lens is his: only what a data step can and cannot
do, with the counterexample that shows the limit. No leaderboard figures. This file holds no opinion about our own
work; the comparison is a separate step. Read it in full before designing a data pipeline or judging a result
(`CLAUDE.md` rule 9). The model side is `MECHANISMS-NEURAL.md`.

Sources, with the short names used below:
- **C2**: Carnegie Mellon, Shalizi, statistical network analysis (36-720), lecture 2, "Data collection and network
  sampling".
- **P9**: Universitat Politecnica de Catalunya, complex networks course, "Sampling in networks".
- **H**: Hasso Plattner Institute, "Approximate data profiling".
- **F**: Carnegie Mellon 15-445, lecture 4, functional dependencies (the notes and the slides, both in full; the slides were read as pictures, page by page).
- **W8**: Warwick CS252, notes for section 8, "Database design issues, part I".
- **L-leak, L-imp, L-ts1, L-ts2**: LMU Munich, applied machine learning: train-test leakage; imputation
  (introduction); time series (introduction and forecasting set-up); time series (cross-validation, evaluation and
  practical guidance).
- **S12, S15**: Stanford CS224W, relational deep learning; scaling up graph networks.

---

## 1. Where the data comes from

**1.1 A census and its imperfections.** The ideal is a census: "every node, and every edge between nodes, with no
spurious additional nodes or edges". Only then can the sampling process be ignored. Even attempts at a census fall
short, in ways that depend on "the details of the measurement process": what counts as a link is understood
differently by different sources; the recording method caps what can be recorded. (C2 section 1.1)
- **Counterexample (censoring by degree).** A survey asks each person to "name up to three colleagues": no recorded
  out-degree can exceed three, whatever the truth. (C2 section 1.1.1)
- Cannot be replaced: "there is no real substitute for detailed knowledge of the domain, and of how the data is
  actually obtained"; treating the data "as just another database" is called pernicious. (C2 section 1.1.1)

**1.2 All of the data is still a sample.** "Even when ... n = all, and the data are automatically recorded ... almost
all the network sampling issues ... remain": "you're getting all of a biased convenience sample, not all of the
truth". Three ways it shows (C2 section 4):
- **Entity resolution.** Deciding when two records are the same thing. Counterexample: "Mark Newman",
  "M. E. J. Newman" and "M. Newman" in a collaboration network; one person with several phone numbers.
- **Diffusion.** The recorded network is the underlying one combined with how the recording system spread over it;
  the two "can differ radically" even when the spreading treats every node alike.
- **Performativity.** A system that recommends links makes the recorded network conform to the theory inside its own
  recommender.

---

## 2. Sampling a graph

"In networks, even a simple random sample is complicated." (C2 section 2)

**2.1 Induced-subgraph sampling** (sample nodes at random; keep the edges among them).
- Cannot: preserve even simple statistics. "Very biased for even very simple network statistics."
- **Counterexample.** With each node kept with probability pi, the expected mean degree of the sample is pi times the
  true mean degree: edges to unsampled nodes are never seen. Motif counts are biased too. (C2 section 2.1.1)
- Can: have some biases calculated and undone (mean degree, motif counts; density is unbiased). The degree
  distribution "gets distorted in very complicated, hard-to-fix ways". (C2 sections 3.1, 5)

**2.2 Incident-subgraph sampling** (sample edges at random; keep their end nodes). Natural when the records are events
(calls, transactions). It and 2.1 give "very different distributions" over sampled graphs from the same graph, even at
matched sizes. (C2 section 2.1)

**2.3 Snowball sampling** (a seed, its neighbours, their neighbours, and so on; breadth-first search).
- Cannot: give a random sample of nodes even from a random seed. The nodes reached "must have degree at least 1,
  must be at least weakly connected to the seed, and in general tend to have higher-than-average degree".
  (C2 section 2.2.1)

**2.4 Path tracing** (record the nodes and edges on routes between chosen sources and targets).
- Cannot: preserve the degree distribution: it "systematically distorts the degree distribution, making all kinds of
  graphs look like they have heavy-tailed distributions whether they do or not". (C2 sections 2.2.3, 3.1)

**2.5 Ego (star) designs** (sample nodes, record each one's neighbourhood). Whether two recorded neighbourhoods
overlap may or may not be recoverable, depending on how they were recorded. (C2 section 2.2)

**2.6 Which designs are even available.** Random selection of nodes or edges is "only possible when access to entire
graph is given". Otherwise the sample is taken by exploration: breadth-first, depth-first, random walk, random walk
with jumps, forest fire (a probabilistic breadth-first search). (P9 slides 8, 11-14)

**2.7 The goal decides the design.** Two different goals: a subgraph that keeps several properties at once (degree
distribution, clustering, communities), or an estimate of one quantity of the whole graph (average degree, a node or
edge attribute). "Different sampling strategies will work for certain goals better than others." (P9 slides 9-10)

**2.8 What exploration does to the picture.**
- "In general, random walks, DFS, and BFS lead to over-sampling of high-degree nodes": a random walk visits a node
  with probability proportional to its degree. (P9 slides 18-19)
- **Counterexamples, in both directions.** "Induced subgraphs of scale-free networks are not scale-free"; "crawled
  subsets of ER graphs are scale-free" (a random graph looks heavy-tailed after crawling). (P9 slides 16-17)
- A sample of nodes also falls apart: "induced subgraphs of connected scale-free networks are sparse". In the deck's
  picture a connected network keeps its shape at nine tenths of the nodes and is almost all isolated points at three
  tenths. (P9 slide 16)
- **The cautionary story.** Around 1999-2000 several networks were reported to have power-law degree distributions;
  by 2003-2005 it was shown "that the sampling procedure may induce a power-law, even if the underlying graph is not
  scale-free". "It is very important to understand how biases in sampling affect results." (P9 slides 5-6)

**2.9 Undoing a known bias.** For a random walk the bias is known (proportional to degree), so it can be removed:
re-weight each visited node by one over its degree, or change the walk so that moves to higher-degree nodes are
sometimes refused (Metropolis-Hastings), which "results in uniform probabilities of visiting nodes". (P9 slide 19)
- Cannot: be done when the inclusion probability of a unit is not known (3.2).

**2.10 Sampling inside training is the same problem.** A graph model trained on sampled neighbours or sampled
subgraphs sees a sample: fewer neighbours kept means more variance; uniform choice mostly draws unimportant nodes; a
subgraph that drops the links between groups gives "systematically biased" gradients. A good sample "should retain
edge connectivity structure of the original graph as much as possible". (S15; the entries are in the model file,
section 14.)

---

## 3. Living with a sample

**3.1 Ignore it.** "Pretend that the graph we see is the whole graph. This is generally not a good idea."
(C2 section 3.1)

**3.2 Design-based inference.** Make probability assumptions only about how the sample was drawn; weight each observed
unit by one over its probability of inclusion (Horvitz-Thompson): "if we saw one unit with inclusion probability pi,
there are probably about 1/pi others that we didn't see".
- Can: give unbiased estimates of anything that is an average or total over units, when inclusion probabilities are
  known.
- Cannot: go beyond averages and totals; and "exact calculation of inclusion probabilities is harder" for network
  designs. (C2 section 3.2)

**3.3 Treat the unseen part as missing data** (imputation, EM).
- Cannot: assume the gaps are random: "It is very, very rare for anything to be 'missing at random', let alone
  'missing completely at random'". Needs a model of the network and of the sampling. (C2 section 3.3)

**3.4 Model the observed network.** Combine a model of the network with a model of the observation process and fit
what was actually seen; the observed network is still informative about the underlying parameters. (C2 section 3.4)

---

## 4. Structure in relational data

**4.1 Redundancy and its anomalies.** A table that repeats a fact invites three failures: an update that must touch
every copy; an insert that is impossible until an unrelated fact exists; a delete that destroys an unrelated fact.
(F p.1)

**4.2 Functional dependency** (the value of X determines the value of Y).
- Can: be refuted by data. Cannot: be proved by data: "You can check if an FD is violated by an instance, but you
  can't prove a FD using just an instance." (F p.1)
- Checking one at run time means validating across the whole table at each insert or update. (F p.2)
- The dependencies decide what the keys are, and whether a table can be split and rebuilt. (F p.2; W8 sections 15-17)

**4.3 Decomposition and the join that undoes it.** A table is split by projection and restored by join. The split is
legitimate only if the join returns exactly the original, "without any loss or gain of tuples" (a join dependency).
Goals in order: lossless join (mandatory), dependency preservation, no redundancy. (F p.3; W8 sections 2-4)
- **Counterexample (a split that cannot be undone).** Project a two-column table onto each column separately and join
  the two projections: the result is every combination, not the original rows. (W8 section 5)
- A split that keeps the key in every part is the safe case; a split in which a part loses the key holds only when a
  functional dependency supports it. (W8 sections 6, 10-11, 19)

**4.4 The irreducible fact.** A relation that cannot be split further states one fact per row (sixth normal form).
- **Counterexample (a fact not yet known).** A table "wife of Henry VIII" with a column for her fate: while the
  marriage lasts the fate is unknown, so the row cannot be written; the table "would have had to be decomposed" into
  one table for names and one for fates "where known". Facts that become known at different times belong in different
  tables. (W8 section 9)

**4.5 Finding the structure from the data (profiling).** Three kinds of fact about a table: a set of columns that is
unique in every row; a functional dependency; an inclusion dependency (every value of one column appears in another,
the shape of a foreign key). Metadata "is often incomplete, outdated or completely unavailable", so it is discovered
from the data itself. (H slides 3-6)
- Can: prune the search by implication (if a set of columns is not unique, no subset of it is). (H slide 7)
- Cannot: avoid an exponentially large search space; and, by 4.2, a dependency found this way is only "not yet
  refuted". (H slide 7; F p.1)
- On a sample: profiling a sample is wanted for run time, privacy, cost or because the data is incomplete; the deck
  states it as open questions, not results: "How close can we get to the true dependencies? What properties must our
  sample have, so that we get reliable results? What is the tradeoff between sample size and correctness?" (H slide 8)

**4.6 Reasoning with dependencies.** From the stated dependencies others follow: if X determines Y and X determines
Z then X determines Y and Z together, and the reverse; if X determines Y and Y determines Z then X determines Z. The
set of everything that follows is the closure. For one set of columns X, its attribute closure is everything X
determines; "X determines A" holds exactly when A is in that closure, and X is a key exactly when the closure is every
column. A canonical cover is a smallest set of dependencies with the same closure: every right side a single column,
nothing that can be dropped without changing the closure. (F slides pp. 19-33)
- **Counter-statement.** "XY determines Z" is "not the same as" the two dependencies "X determines Z" and "Y
  determines Z": a pair of columns that decides a value says nothing about either column alone. (F slides p. 12)
- **Worked case.** The four dependencies AB to C, A to BC, B to C, A to B reduce step by step to two: A to B and
  B to C. Nothing is lost; there is less to enforce. (F slides pp. 28-33)
- Can: answer "does this dependency follow from those" mechanically; cut what has to be enforced to a minimum: the
  canonical cover is "the minimum number of assertions that we need to implement to make sure that our database
  integrity is correct", and it gives the keys. (F slides pp. 34-38)
- What they are for: dependencies "allow us to decide whether a database design is correct", which "is different
  [from] the question of whether it's a good idea for performance". (F slides p. 17)
- Cannot: say which dependencies are true of the world. They are stated by whoever knows the domain (4.2).

**4.7 What enforcing a dependency costs.** As a rule over one wide table, a dependency is a check that no two rows
agree on X and differ on Y: a comparison of the table with itself at every change. When the table is split so that X
is the key of its own table, the same rule is a key constraint and costs nothing extra. That is the practical reason
to decompose. The general check is not even available in practice: "As of 2017, no major DBMS supports SQL-92
assertions", and the one system that supports dependencies limits them "to single attributes". Keeping every implied
dependency checked at run time "is expensive: the DBMS has to check all the constraints for every INSERT, UPDATE,
and DELETE". (F slides pp. 13-16, 24; F p.2)

**4.8 Counterexample: a split that "loses" by gaining rows.** A loans table (branch, branch city, assets, customer,
loan, amount) in which the branch determines city and assets, and the loan determines amount and branch.
- Split into (branch, city, assets, customer) and (customer, loan, amount) and joined back on customer: four rows
  come back as six. A customer with loans at two branches is paired with both branches' loans. The extra rows cannot
  be told from the real ones: the information is lost although nothing was deleted. (F slides pp. 43-45)
- Split so that the shared column is the branch: again rows that never existed come back. (F slides pp. 46-47)
- Split so that the shared column is the loan, which is the key of the second part: the join returns exactly the
  original. (F slides pp. 48-49)
- **The test.** A split into two parts is lossless exactly when the columns the parts share determine all of one
  part; the goal is "no noise introduced" when the whole is put back together by joins. A key is what guarantees it:
  "super keys ensure that we are able to recreate the original relation through joins". Of the goals of a split,
  the lossless join is marked "Mandatory!", the other two "nice to have, but not required". (F slides pp. 38-41, 62;
  W8 sections 10-11)

**4.9 Dependency preservation is a separate property.** "A schema preserves dependencies if its original FDs do not
span multiple tables"; one that spans two tables "would be expensive to check", because it needs a join.
(F slides p. 50)
- **Counterexample.** Columns A, B, C, D with A to B, AB to D, C to D. Split into (A, B, C) and (C, D): the parts can
  check A to B and C to D, and "A determines D", which follows from the originals, does not follow from those two.
  Split into (A, B, D) and (C, D): everything follows; the dependencies are preserved. (F slides pp. 55-60)
- The lossless split of 4.8 shows the same failure: branch and branch city end up in different parts, so "the branch
  determines its city" can no longer be checked inside one table. (F slides pp. 51-53)
- The two properties do not imply each other: the preserving split above shares only D, which determines neither
  part, so by the test of 4.8 it is not lossless. (Derived here from the two slides' own definitions.)
- Redundancy, the third goal, is defined the same way: a table holds duplicate entries for a dependency when the
  dependency lies inside the table and its left side is not a key of it. (F slides p. 61)

---

## 5. Missing values

**5.1 Dropping incomplete rows.**
- Cannot: scale with the number of columns. **Counterexample:** 100 features, each missing in 2 % of rows at random:
  "only 13 % of our data can be used". (L-imp p.1)

**5.2 The options and what each gives up.** Drop rows ("could lead to a very small dataset"); drop columns that are
mostly empty ("can lose important information"); use a model that accepts missing values, such as most tree methods
("restriction in model choice"); impute plausible values. (L-imp p.3)

**5.3 A missing-value pattern is itself information that can leak or shift.** "Missing patterns in the test data not
present in training data" is listed as a form of train-test leakage. (L-leak p.1)

---

## 6. Leakage

**6.1 The rule.** "Ultimately we are interested in predicting on future data. We can not use 'knowledge' about future
(test) data during training." It "requires clearly separating train and test data in order to avoid overoptimistic
conclusions". (L-leak p.1)

**6.2 Named forms.**
- Using knowledge of which features matter in the test data. (L-leak)
- Scaling with statistics that include the test data; fit every scaler "on train only". (L-leak; L-ts2 p.4)
- Lag or rolling features computed before the split is made: "computing rolling/lag features before the train/test
  split lets future data leak into training rows". Features must be "causal". (L-ts2 pp.4, 9)
- A target transformation fitted on everything. **Counterexample:** removing a trend estimated on the full series
  before splitting "leaks future information and makes CV results overly optimistic"; the trend "must be re-estimated
  on each training fold". (L-ts1 p.8)
- Random shuffled splits of time-ordered data: "Never." (L-ts2 p.4)

**6.3 What makes it dangerous.** It "is subtle and can silently inflate your metrics". (L-ts2 p.4)

**6.4 The pipeline is the model.** Every step that learns something from data (the scaling factors, the levels of a
category, the medians used to fill gaps, the learner itself) learns it on the training data, and what it learned is
carried unchanged to new data and only applied there. (L-leak p.2, the diagram)

---

## 7. Evaluating on time-ordered data

**7.1 Splits that respect time.** Train on the past, validate on what follows: an expanding window (training set
grows) or a sliding window (fixed width). "Validation window should match the forecasting horizon." A gap between
training and validation "to simulate real-world prediction delay". (L-ts2 p.3)

**7.2 The baseline rule.** "Always benchmark against naive forecasts. If your model cannot beat these, something is
wrong." The naive forms: the last value; the value one season ago; a moving average. (L-ts2 p.6)

**7.3 What an aggregate score cannot show.** "Aggregate metrics can hide that a model is great on weekdays but
terrible on weekends. Always plot residuals over time." (L-ts2 p.9)

**7.4 Two things a model on historical data cannot be assumed to survive.**
- Rare events: with two examples of an event in training "the model may memorize rather than generalize".
- Drift: "real-world patterns shift over time"; retrain periodically or use a sliding window. (L-ts2 p.9)

**7.5 Where the leverage is.** "Feature engineering often outweighs model complexity in time-series ML": lags, rolling
statistics and calendar features "make temporal patterns accessible to non-temporal models". (L-ts1 p.7; L-ts2 p.11)

---

## 8. Forecasting set-ups

**8.1 Tree models on engineered features.**
- Can: take mixed feature types, need no stationarity assumption, train fast.
- Cannot: extrapolate: "Tree-based models cannot extrapolate beyond the training range. If the data has a strong
  upward trend, predictions will plateau." Remedy: model the trend separately, inside each fold (6.2), or predict
  differences. (L-ts1 pp.7-8)

**8.2 Predicting several steps ahead.** Recursive (feed each prediction back in): simple, "errors accumulate".
Direct (one model per step): no accumulation, many models, "no shared learning". Multi-output (one model, all steps):
needs a model with vector output. Hybrid of the first two. (L-ts1 p.9)

---

## 9. From tables to a prediction task

**9.1 A task is an entity, a label and a time.** The labels live in a training table of (entity, time, label). "An
entity may have different labels at different times." "Only use information up to the time of label." "Temporal
tasks [are] especially challenging because features are time dependent: for every time, a feature needs to be
recomputed." (S12 slides 48-51)

**9.2 What a hand-built feature table gives up.** "Features are chosen arbitrarily (e.g., aggregations, time
windows)"; "only a limited set of data is used"; "issues with point-in-time correctness/information leakage". A
single table that already holds features computed from other tables is a "loss of information". (S12 slides 14, 30)
This is the lossy projection of 4.3 seen from the modelling side: what was aggregated away cannot be recovered by any
model. The expert in the deck's case study starts by looking at the data before writing any feature (activity is
seasonal, counts are heavy-tailed, one kind of event is rare). (S12 slides 81-87)

**9.3 The lossless form: the relational entity graph.** Every row of every table is a node; an edge joins two rows
wherever a foreign key matches a primary key (exactly the joins on keys); the kind of a node is its table; each row
keeps its own columns. Nothing is aggregated in advance; aggregation is left to the model. In the deck's picture a
sale is a node of its own between the user and the product, carrying its price and time; it is not an edge.
(S12 slides 34, 39-45, 60-61)

**9.4 Leakage is prevented where the data is loaded.** For a label at time t, the neighbourhood a model may read
holds only rows dated before t: "avoid data leakage via temporal sampling directly during data loading". The
neighbourhood of the same entity is therefore different at every label time. (S12 slides 58, 66)
