# What each mechanism can and cannot do: graph learning and neural networks

Compiled 2026-11-25 by the top session from teaching material it read itself, in full (the owner's order and the list
of sources: `research-tree/build/briefs/LEARNING-COMPILE.md`). The lens is his: only what a mechanism can and cannot
do, with the counterexample that shows the limit. No leaderboard figures, no "X beat Y". This file holds no opinion
about our own work; the comparison is a separate step. Read it in full before designing or judging a model
(`CLAUDE.md` rule 9). The data side is `MECHANISMS-DATA.md`.

Sources, with the short names used below (page or slide given per entry):
- **U3, U4, U5, U6, U7, U10**: University of Pennsylvania, graph neural networks course (Ribeiro), lectures 3, 4, 5,
  6, 7 and 10 (scripts and handouts).
- **B9**: Bresson, NUS, Graph Machine Learning, lecture 9, "Graph Transformer".
- **S6, S7, S8, S9, S10, S12, S15**: Stanford CS224W slides (theory 1 and 2, graph transformers, heterogeneous graphs,
  knowledge graphs, relational deep learning, scaling). All were read in full. The pages whose figures and tables did not
  come through as text were read as pictures.

---

## 1. The frame: what a design is

**1.1 A learning method is a choice of function class.** In empirical risk minimisation the training set and the loss
are given; "the function class C is the degree of freedom available to the system's designer", so designing a method
"can be equated to the problem of finding the right function class". (U4 slides 2-3)
- Can: a class that matches the structure of the data generalises from few examples (see 5.2).
- Cannot: a larger class is not better. A class that contains another reaches a lower cost on the training set, and
  that says nothing about operation on unseen inputs. (U4 slide 25)

**1.2 What is given and what is learned.** In every graph method here the graph (its shift operator S) is prior
information handed to the model; only the coefficients are learned. The same S can equally be treated as an input,
which is what makes running one trained model on another graph possible (section 8). (U4 slides 4, 14, 16)

---

## 2. The graph as an operator

**2.1 Matrix representations.** Adjacency A, Laplacian L = D - A, and their degree-normalised forms. The normalised
adjacency and normalised Laplacian "are essentially the same linear transformation". (U3 slides 8-14)
- Can (normalised forms): give "more homogeneous representations" when node degrees differ a lot: weights are
  re-expressed relative to the degrees of the nodes they touch. (U3 slide 14)
- Cannot: the choice is not neutral: "a specific choice matters in practice", although the theory holds for any.
  (U3 slide 15)

**2.2 Direction.** An edge (i, j) means "node i can be influenced by node j"; a directed graph may have (i, j) without
(j, i), or both with different weights. The spectral theory of this course (the graph Fourier transform, stability,
transfer) is stated for symmetric graphs only. (U3 slides 2-4, 32)
- Cannot: results proved for symmetric operators do not cover a directed graph as given.

**2.3 Diffusion is local, and hops trade locality for reach.** Multiplying a signal by S mixes each node only with its
neighbours; the k-th power reaches the k-hop neighbourhood: "for low values of k the entries of the diffusion sequence
represent local information only ... for large values of k ... global information". Stronger weights contribute more.
(U3 slides 18-20)
- Cannot: one multiplication cannot see past one hop. Node 2's diffused value "is affected by the input value x_4.
  But it is not affected by x_8". (U3 slide 18)
- Practice: compute powers recursively (S applied k times), never as matrix powers: "dramatic differences in
  computational cost". (U3 slide 20)

---

## 3. The linear graph filter (graph convolution)

A polynomial in S with K coefficients: y = sum_k h_k S^k x. It aggregates from the node itself out to the (K-1)-hop
neighbourhood, one coefficient per hop. (U3 slides 22-23)

**3.1 Can.**
- Run on any graph: "the same filter can be executed in multiple different graphs", with different neighbours,
  weights and even numbers of nodes, because the coefficients do not depend on S. (U3 slide 24)
- Be label-independent: relabelling the nodes relabels the output and changes nothing else (permutation
  equivariance). (U5 slides 5-10)
- Be read in frequency: the filter acts on each graph-frequency component separately, by a response h(lambda) that
  "is completely determined by the filter coefficients. The graph has nothing to do with it". The graph only decides
  at which eigenvalues that response is sampled. (U3 slides 36-41)

**3.2 Cannot.**
- Learn anything but linear maps: "graph filters can only learn linear functions of x". (U4 slide 8)
- Be both sharp and stable. To be stable when the graph changes in proportion to its own structure, a filter must be
  flat at high frequencies; it then cannot tell high-frequency features apart: "It is impossible to separate signals
  with high frequency features and be stable to deformations". This is tight, not an artefact of the proof.
  (U5 slides 38-40; U6 slides 28, 45)
- Be both sharp and transferable. Near eigenvalue 0, where a graph family's eigenvalues crowd together, a filter that
  can tell components apart converges slowly to its limit and transfers badly; a filter that transfers well does not
  tell them apart: "for as long as we use graph filters, transferability and discriminability are incompatible".
  (U10 section 10.2 slide 11; section 10.5 slide 12)

---

## 4. The pointwise nonlinearity

Applied to each node's value separately; "entries are not mixed with each other". (U4 slide 7)

**4.1 Can.**
- Make the class nonlinear at almost no structural cost: a graph perceptron is a filter followed by it. (U4 slide 8)
- Move high-frequency content to low frequencies ("demodulation"), where the next layer's stable filter can separate
  it. This is why a network of stable filters "can be both stable and discriminative ... a tradeoff that linear
  filters cannot achieve". (U4 slide 7; U6 slide 45; U10 section 10.6 slide 11)

**4.2 Cannot.**
- Mix nodes: "All of the component mixing that goes on in a GNN is carried out by linear transformations", by the
  filters. What a network can gather from the graph is decided by its filters. (U4 slide 15)
- Differ much by kind: "different choices make marginal differences". (U4 slide 7)

---

## 5. The graph neural network

L layers, each a (bank of) graph filter(s) followed by a pointwise nonlinearity. (U4 slides 9-13, 45)

**5.1 What it is.** "Minor variations of graph filters": the only additions are the pointwise nonlinearity and the
composition of layers. "If we understand the behavior of graph filters, we also understand the behavior of GNNs."
(U4 slide 15)

**5.2 Can: generalise through symmetry, where a fully connected network cannot.**
- A graph network is a special case of a fully connected network, so the fully connected one fits the training set at
  least as well; in operation the graph network does better "because it successfully exploits internal symmetries of
  graph signals that are codified by the graph shift operator". (U4 slide 25)
- **Counterexample (U4 slides 26-27).** A rating pattern is seen in training around one node. At test time the same
  local pattern appears around a different node. The fully connected network "knows only the signal indexes": having
  learned to fill entry 3 it has no way to fill entry 6. The graph network performs "the exact same operations" at
  both places, because the local structure is identical. "The symmetries effectively multiply the size of the data
  set."
- Exact symmetry is rare; near-symmetry is common, and the stability results (section 7) are what let a network use
  it. (U5 slides 17-18)

**5.3 Can: several features per node.** A layer may map F input features to G output features with F x G filters
(a filter bank); each filter picks up a different frequency signature. (U4 slides 30-45)

**5.4 Readout.** When the wanted output is not one value per node, a readout matrix is applied after the last layer.
Making it trainable "is in general inadvisable": a simple fixed readout (one node's value for a recommendation, an
average for a classification) keeps the advantage of a parametrisation that uses the graph. (U4 slide 5)

**5.5 Cannot.**
- Escape its filters' reach: L layers of K-tap filters see L(K-1) hops and no further (from 2.3 and 4.2).
- Tell apart what its filters and the labelling symmetry make identical: two nodes with the same local structure and
  the same inputs get the same output. This is the price of 5.2 (and the root of section 9).

---

## 6. Permutation equivariance

Relabel the nodes of graph and signal consistently, and the output is relabelled the same way; holds for filters and
for networks of them, since the nonlinearity is pointwise. (U5 slides 5-16)
- Can: make processing independent of the arbitrary order of nodes; lets one observed pattern teach every place where
  the graph looks the same (5.2).
- Cannot: use a node's identity. Anything that depends on which node it is, and not on structure and input, is outside
  the class.
- Measuring change must respect it: two graphs that are relabellings of each other are "the same", so distances
  between graphs and between operators are taken "modulo permutation" (the smallest over all relabellings).
  (U5 slide 19; U6 slides 4-5)

---

## 7. Stability when the graph is not exactly the one trained on

Why it matters: graphs are estimated with error, change over time or between runs, and near-symmetries are only
approximate. (U6 slide 2)

**7.1 Measuring a change of graph.**
- An additive measure (the norm of the difference) is "not meaningful".
- **Counterexample (U6 slides 16-17).** A graph with one strongly connected community (weights far above 1), one
  weakly connected (weights far below 1). Add edges of weight 1. The norm of the change is small beside the norm of
  the graph, yet the weak community "is drastically changed" while the strong one is almost untouched: "The nature of
  the graph has changed."
- A relative measure ties the allowed change of an edge to the local structure (the degrees of its two nodes): "parts
  of the graph with weaker connectivity see smaller changes". (U6 slides 17-19)

**7.2 What is stable.**
- Filters whose response has bounded slope (Lipschitz) are stable to additive changes, with a real trade-off: a
  sharper filter is more discriminating and more sensitive. (U6 slides 8-14)
- For the meaningful, relative changes, a filter must be "integral Lipschitz": its response may vary fast near 0 and
  must be flat for large eigenvalues. Hence 3.2: no discrimination at high frequency for a stable linear filter.
  (U5 slides 26-31; U6 slides 21-28; U7)
- A network inherits whatever stability its filters have, "any stability claim": the bound of the filter, times the
  number of layers. (U6 slides 32-43)

**7.3 Cannot.**
- The bounds grow with the number of layers L (each layer passes the distortion on) and with the square root of the
  number of nodes through a term set by the perturbation, not by the design: it "cannot be affected by judicious
  filter choice" and makes the bound "meaningless asymptotically" in graph size. (U6 slides 9, 13, 36; U7)
- A stable network gets its discrimination from the nonlinearity (4.1), not from sharper filters.

---

## 8. Transfer: one trained model on another graph

**8.1 What makes it possible at all.** The trained object is only the set of coefficients; "it is all but impossible to
encounter the exact same graph twice", and theory and practice "have to account for that". Two words: transference
(trained on one graph, run on another) and generalisation across a family (trained on many graphs). (U3 slide 24;
U4 slide 16)

**8.2 What is proved.** For graphs that are samples of one common limit object (a graphon), the outputs of the same
filter, or the same network, on two such graphs of different sizes are close. The error has a part that vanishes as
the graphs grow (set by the smaller graph), and a part that does not: the components at eigenvalues near 0, "a part of
the spectral representation that is impossible to transfer from one graph to another". (U10 sections 10.4-10.6)

**8.3 Can.**
- Transfer more as graphs get larger: larger graphs "allow for using sharper filters". (U10 section 10.5 slide 8)
- Do better than a linear filter at equal sharpness: the nonlinearities scatter spectrum out of the crowded band, so
  "for the same level of discriminability, GNNs are more transferable than graph filters". (U10 section 10.6
  slide 11)

**8.4 Cannot.**
- The guarantee holds inside one family: both graphs "sampled from the graphon W". Nothing is proved for graphs that
  do not share a limit. (U10 section 10.4 slides 2-3)
- "Filters that are more discriminative are more difficult to transfer." (U10 section 10.5 slide 10)
- Deeper and wider networks are harder to transfer: the bound grows with depth L and width F. (U10 section 10.6
  slide 8)
- Small graphs transfer worse: the vanishing terms shrink only with the square root of the number of nodes.
  (U10 section 10.4 slide 6)
- How hard transfer is depends on the family itself: more eigenvalues outside the crowded band near 0, or eigenvalues
  that sit closer together, make it "more challenging", and that is "a property of the graphon", not of the design.
  (U10 handout slide 40)
- Signals and graph families that vary quickly are harder to carry over, but this part comes from sampling error and is
  "not fundamental". (U10 handout slide 38)
- What is proved is a limit and a bound; convergence for inputs confined to low frequencies is "easy. Also weak."
  (U10 handout slides 9, 12)

---

## 9. What message passing can and cannot tell apart

**9.1 The ceiling.** Standard message-passing networks (GCN, GAT, GatedGCN) "fail to distinguish simple non-isomorphic
graphs, i.e. at most as powerful as 1-WL", and "are unable to count elementary sub-structures like motifs, cycles and
cliques". A network with an injective aggregation (GIN) reaches that ceiling and no higher. (B9 slides 12-14)

**9.2 Ways above it, and their price.**
- Higher-order networks on k-tuples of nodes: more expressive; O(n^k) memory, at least k = 3 to gain anything, so
  "not practical". "Expressivity does not necessarily imply generalization." (B9 slide 14)
- Symmetry-breaking inputs: "Add symmetry-breaking positional or structural information, i.e. node IDs". With unique
  identifiers, sufficient depth (the graph's diameter) and unbounded width, message passing can compute anything
  computable. (B9 slide 16)

**9.3 Isotropic against anisotropic aggregation.**
- Isotropic (GCN): "neighbors are processed by the same kernel"; cannot treat neighbours differently. "Most
  real-world data is anisotropic."
- Anisotropic (edge gates, attention): treats neighbours differently, at the same linear cost; still bounded by 9.1
  and exposed to over-squashing (section 11). (B9 slides 10-11)

**9.4 What a message-passing network sees: a rooted subtree, and no identities.** After K layers a node's vector is a
function of its "computational graph": the tree obtained by unfolding its neighbours K times, with the features at
the leaves. "GNN does not care about node ids, it just aggregates features vectors of different nodes."
(S6 slides 19-24)
- Cannot: tell apart two nodes whose rooted subtrees and features are the same. **Counterexample:** in a five-node
  graph, nodes 1 and 2 sit symmetrically; their computational graphs are identical, so "GNN won't be able to
  distinguish nodes 1 and 2". (S6 slides 17, 20-22)
- Can at best: give different vectors to different rooted subtrees. That needs every aggregation step to be
  injective, to "fully retain the neighboring information". (S6 slides 25-31)

**9.5 Aggregation is a function of a multiset: mean and max lose information, sum does not.**
- **Mean** "cannot distinguish different multi-sets with the same color proportion". **Counterexample:** one
  neighbour of each of two kinds, against two of each: the mean is (0.5, 0.5) both times. A mean cannot count.
- **Max** "cannot distinguish different multi-sets with the same set of distinct colors". **Counterexample:**
  {a, b}, {a, a, b} and {a, b, b} all give the same maximum. A max sees only which kinds are present.
- **Sum**, with a nonlinear map before it and after it, can express any injective function of a multiset: summing
  one-hot codes "retains all the information about the input multi-set". Order of discriminating power: sum, then
  mean, then max. (S6 slides 34-48)
- The deck's picture says it in three words: sum keeps the multiset, mean keeps only the distribution, max keeps only
  the set. Its plainest failure case is two neighbours of one kind against three of the same kind: mean and max
  both give the same answer. (S6 slide 48)
- The network built on the sum (an MLP applied to the node's own vector, weighted, plus the sum of its neighbours')
  is "THE most expressive GNN in the class of message-passing GNNs", exactly as strong as Weisfeiler-Lehman colour
  refinement, of which it is the trainable version; its vectors are low-dimensional, so unlike colours they can also
  express how similar two nodes are. (S6 slides 47, 55-60)

**9.6 Where the best message passing still stops.** Colour refinement "cannot distinguish between some basic graph
structures" and "cannot count important sub-structures, e.g., cycles and cliques". **Counterexample:** a node on a
short cycle and a node on a longer cycle, same features, every degree two: their computational graphs are the same
tree, so no message-passing network of this class separates them. (S6 slides 61-64) The deck's pair of whole graphs that
colour refinement cannot tell apart: two six-rings sharing an edge, and two five-rings joined by a bridge. (S6 slide 61)

**9.7 Two different reasons a network cannot tell two nodes apart.** Structure and position are different things.
- A structure-aware task labels nodes by their structural role. Message passing can do it, up to the ceiling of 9.6.
- A position-aware task labels nodes by where they are. Two nodes with the same neighbourhood structure in different
  places get the same vector by construction: they "will always have the same computational graph, due to structure
  symmetry". "Even a perfect GNN will fail for these tasks." **Counterexample:** two nodes at mirror positions of a
  symmetric graph, one labelled A and one B; any two nodes of a grid. (S7 slides 7-10, 71-73)
- So more expressive power does not repair a position problem, and position information does not repair a structure
  problem. The remedies differ (9.10 for structure, 10.5 for position).

**9.8 The failure shows at three levels.** Node level: two different nodes, one computational graph, one vector.
Edge level: two candidate links from the same node to two nodes that have the same computational graph get the same
score, so a link predictor built from node vectors cannot prefer either. Graph level: two different graphs, the same
collection of node vectors. (S7 slides 12-15)

**9.9 Why: the starting features, read in the spectrum.** A sum-aggregation layer multiplies the current node values
by the adjacency matrix. Written with that matrix's eigenvectors, the update depends on the eigenvalues, the
eigenvectors and the inner products between the eigenvectors and the current values. If every node starts from the
same value, the components along eigenvectors orthogonal to the constant vector never enter, and "graphs with
symmetries admit eigenvectors orthogonal to 1". Hence "the limitations of the WL kernel are limitations of the
initial node color": the colours "obey the same symmetries as graph structure", and "these joint symmetries lock the
message-passing operations to limited representations". (S7 slides 17-41)
- **The counterexample in numbers.** For the two graphs of 9.6 the spectra differ, but the eigenvector that tells
  them apart has zero inner product with the constant start, so it never enters the computation. The number of
  triangles at a node is itself a function of the eigenvalues and eigenvectors, which is why it cannot be counted
  from a constant start. (S7 slides 38-40)

**9.10 Remedies through the input features, and what each costs.** (S7 slides 43-62)
- **A constant feature.** Expressive power medium; generalises to new nodes and graphs; one dimension. Use: any
  graph.
- **A one-hot identity per node.** Expressive power high: "node-specific information can be stored". "Not inductive:
  Cannot generalize to new nodes/graphs": "new nodes introduce new IDs, GNN doesn't know how to embed unseen IDs".
  Needs as many feature dimensions as nodes, so it "cannot apply to large graphs". Use: "Small graph, transductive
  settings (no new nodes)".
- **Structure-aware features.** Counts of the cycles through the node; the diagonals of the powers of the adjacency
  matrix (the closed walks from the node back to itself); also clustering coefficient, PageRank, centrality.
  Expressive power high and still inductive: one "can count triangles or closed loops for any graph"; the cost depends
  on what is counted. **The counterexample of 9.6 resolved:** the node on a triangle gets closed-walk counts
  (1, 0, 2, 2, 6, 10), the node on a four-cycle (1, 0, 2, 0, 8, 0). With such features there is a network that
  separates any two graphs whose adjacency matrices have different eigenvalues; it is "strictly more powerful than
  the WL-kernel".
- **Marking the root.** A relative identity in place of a memorised one: mark the node being computed wherever it
  reappears in its own computation tree. Counting the marks at each level counts the cycles through that node: two
  at depth three for the node on a triangle, none for the node on a four-cycle. No table of identities is needed, so
  it carries to new graphs. (S7 slides 57-58)
- A task as plain as "does this graph contain a cycle" stays at chance for a gated message-passing network at every
  amount of training data, and is solved once such features are given. (S7 slide 47)
- **Laplacian eigenvectors as extra features**: section 10.3 and 10.6.

---

## 10. Positional and structural encodings

**10.1 What they are for.** Position: where a node is relative to a global reference. Structure: what its
neighbourhood looks like, independent of any reference. "There is no universally optimal PE and SE. The appropriate
choice depends on the graph family and downstream task." (B9 slides 17-18)

**10.2 What a good one must satisfy.** Equivariant to relabelling; discriminating (distinct structural nodes get
distinct codes); distance-sensitive (near nodes similar, far nodes different); structure-sensitive; scalable, O(n) to
build and store. (B9 slide 18)

**10.3 Laplacian eigenvectors.**
- Can: give unique, distance-sensitive coordinates; the graph analogue of sinusoidal positions.
- Cannot: be cheap (O(n^3) exactly; approximations exist); be unambiguous: each eigenvector is defined up to sign
  (2^K configurations for K eigenvectors), and eigenvectors sharing an eigenvalue only up to a rotation of their
  space. **Counterexamples:** a graph with three connected components has three zero eigenvalues; a balanced
  four-community block model has three equal ones. Usual patch: flip signs at random in training so the network
  learns to ignore them. (B9 slides 19-22)

**10.4 Random-walk return probabilities.**
- Can: be compact (O(nK)); have no sign or basis ambiguity.
- Cannot: guarantee a unique code: "nodes with identical return-probability signatures remain indistinguishable".
  (B9 slide 24)

**10.5 Anchor distances (position by reference points).** Pick anchor nodes at random; a node's code is its distance
to each. "An anchor node serves as a coordinate axis"; more anchors locate nodes in more regions of the graph; an
anchor may be a set of nodes (distance to its nearest member), and large sets "can sometimes provide more precise
position estimate". A theorem (Bourgain) says that about log-squared-n anchor sets of exponentially varying sizes give
coordinates whose distances are provably close to the distances in the graph. (S7 slides 74-80)
- Can: do the position-aware tasks that no message-passing network can (9.7). Stay inductive: anchor sets are
  re-sampled at every training step and sampled afresh on an unseen graph, so the network learns to work with any
  anchors. (S7 slide 79)
- Cannot: serve structure-aware tasks: relative distances are "not suited to structure-aware tasks". (S8 slide 48)
- Related forms use random walks in place of distances; the deck calls the idea "especially strong for tasks that
  require counting cycles". (S8 slide 47)
- A trap in use: each dimension is tied to a random anchor set, so the dimensions "can be randomly permuted, without
  changing its meaning", while an ordinary network's output changes when its input dimensions are permuted. Feeding
  the code as an extra node feature "works well in practice"; the rigorous form needs a network that is invariant to
  that permutation. (S7 slides 81-82)

**10.6 More on Laplacian eigenvectors (adds to 10.3).** Eigenvectors with small eigenvalues carry global structure,
those with large eigenvalues local symmetries. They can be given to a message-passing network as well as to a
transformer. (S7 slide 44; S8 slides 51-53)
- The sign problem restated: with k eigenvectors there are 2^k sign choices, so up to 2^k different predictions for
  the same graph. Random sign flips in training teach the network to ignore signs, but "exponentially many sign
  choices is very difficult to learn". The better remedy is a network built to be invariant to the sign.
  (S8 slides 66-71)
- Cost, in this deck's words: "Computing eigenvectors has cubic complexity", "Storing them needs quadratic space".
  (S8 slide 72)
- In that deck's own example, eigenvectors fed with arbitrary signs helped no more than no encoding at all, and the
  sign-invariant form did. The other deck is milder: the number of sign choices is far smaller than the number of
  node orderings, the rotation ambiguity "does not appear to be critical" in its author's experience, and these
  encodings "remain widely used". (S8 slide 95; B9 slides 21-22)

**10.7 Identities that do not break transfer.** One-hot identities separate everything and are neither scalable nor
inductive (9.10). The alternative: give each node random numbers as its identity, run a message-passing network on
each random draw separately, and average the outputs over the draws. The average does not depend on the particular
draw, so the result still carries to new graphs; it is "strictly more expressive than the WL-test" and can count
cycles at near-linear cost. (S8 slides 78-93)

---

## 11. Over-loading and over-squashing

**11.1 The two effects.** Over-loading: many vectors are aggregated and the few relevant ones must be found among
them. Over-squashing: a receptive field that grows quickly must be compressed into a vector of fixed size. In a binary
tree the L-hop neighbourhood holds O(2^L) nodes. (B9 slides 34, 38)
- **Counterexample (matching across a tree).** The root must report the label of one particular leaf. For that the
  leaves' information has to travel up the tree, exponentially many of them squeezed into one vector; "standard
  MP-GNNs fail as depth increases". (B9 slide 91)
- A third effect of depth: "deep message passing can lead to over-smoothing of node representations with simple
  convolution operations". (B9 slide 33)

**11.2 Three causes.**
1. Stacking layers: every model except the transformer needs many layers to reach far, and the receptive field grows
   with them.
2. Multi-step reasoning: one global layer gives one hop between any two nodes, but composing steps needs more layers,
   and each token must then select among everything, so global attention is also exposed.
3. Bottlenecks in the graph: "a small cut or narrow bridge between large graph regions forces many long-range signals
   through only a few nodes". (B9 slides 39-40)

**11.3 What helps, and its limit.** Attention gives a direct path between distant nodes and so removes the long route
when the answer needs one long hop; "one layer is generally insufficient for complex reasoning". Hierarchies shorten
routes: O(log_S n) hops in place of O(n). (B9 slides 40-41, 88)

---

## 12. Attention and transformers on graphs

**12.1 Plain self-attention.** Every token attends to every token: a global receptive field in one layer. It has no
notion of order or structure by itself (it is permutation-equivariant), so position "must be introduced explicitly".
Cost O(n^2) pairs in compute and memory; on ordinary hardware "relatively short sequences, i.e. n of 100 to 1,000".
(B9 slides 35-37, 44-46)

**12.2 Sparse graph attention** (attend along edges only).
- Can: scale, O(n + E), to very large sparse graphs; use the graph as an inductive bias; carry edge features inside
  the attention score.
- Cannot: reach far without many layers, and then it over-squashes; sparse operations are less efficient on graphics
  cards than dense ones. (B9 slides 47-49, 54, 60)

**12.3 Dense graph attention** (all pairs, missing edges given a "no edge" type).
- Can: give direct long-range interaction; run on fast dense kernels; get round bottlenecks of the graph.
- Cannot: afford large n: O(n^2) pairs, "practical only when n is sufficiently small". (B9 slide 61)

**12.4 Hierarchical forms** (partition the graph into patches, encode each patch with a small message-passing network,
attend among patch tokens).
- Can: bring cost to O(n S d) for patch size S, independent of the number of levels; keep message passing inside small
  patches, where routes are short; shorten long routes to O(log_S n).
- Cannot: avoid choosing the partition (the objectives are NP-hard; METIS and heavy-edge matching are heuristics),
  and each level needs its own encoding. (B9 slides 68-90)

**12.5 The deck's own next steps.** Richer node and edge features from language models; "graph retrieval can select
relevant subgraphs instead of processing the entire graph". (B9 slide 95)

**12.6 Attention is message passing on the complete graph.** One token's update is a weighted sum of messages from
all tokens: "Self-attention is a special case of message passing", namely "message passing on the fully connected
graph"; restrict the softmax to a node's neighbours in a graph and it becomes graph attention. (S8 slides 23-28)
- Cannot, as it stands: know the graph or any order. With node features as tokens and nothing more, "we completely
  lose adjacency info". **Counterexample:** swap two words of a sentence: the two outputs swap and the pooled
  prediction is identical, "a 'bag of words' prediction model". (S8 slides 35-37, 44)

**12.7 The three places where a graph can enter a transformer.** The tokens (usually node features; subgraphs, or
nodes together with edges, are alternatives). The positional encoding, which "gives Transformer adjacency structure of
graph" (section 10). The attention itself. Edge features have no natural place in tokens or positions, so they go into
the attention score: add to a pair's score a learned term computed from the edge's features or, for a pair with no
edge, from the features along the shortest path between the two. (S8 slides 39-60)

---

## 13. Heterogeneous graphs, knowledge graphs, relational data

**13.1 When kinds of node and edge need their own treatment.** A relation type is the triple (kind of start node,
kind of edge, kind of end node). Kinds can simply be given as one-hot features, and then "a heterogeneous graph
reduces to a standard graph". Separate treatment is needed in two cases: the kinds have features of different shape;
or "we know different relation types represent different types of interactions". It is "a more expressive graph
representation" that "also comes with costs": computation, storage, a more complex implementation. "Be aware that we
don't always need heterogeneous graphs." (S9 slides 8-15, 72)

**13.2 One weight matrix per relation (relational graph convolution).** A neighbour's message is transformed by a
matrix chosen by the relation, normalised by the node's degree within that relation, and summed with a self-loop
term. On a directed graph messages pass "only along direction of edges". (S9 slides 20-26)
- The normalisation by degree makes each relation's contribution a mean, with the mean's limit of 9.5: it cannot say
  how many neighbours of that relation there are. (Follows from the formula on S9 slide 26 and from 9.5.)
- Cannot: add relations for free: "Rapid growth of the number of parameters w.r.t number of relations! Overfitting
  becomes an issue." Two remedies, each with its limit: block-diagonal matrices ("only nearby neurons/dimensions can
  interact"); or every relation's matrix written as a mix of a few shared basis matrices, so that a relation learns
  only its mixing weights. (S9 slides 27-29)

**13.3 The general form.** A message function per relation type; aggregation in two stages, first within each
relation type, then across the types; pre- and post-processing layers per kind of node: pre-processing "when encoding
node features is necessary", for example when nodes are text or images, and post-processing "when reasoning /
transformation over node embeddings are needed". (S9 slides 50-55)

**13.4 Attention with kinds.** Plain graph attention "is unable to represent different node & different edge types",
and a separate attention network for every relation type "is too expensive". The decomposition: weights that depend
on the kind of node (for keys and queries) and weights that depend on the kind of edge. Three kinds of node and two
kinds of edge then need five matrices where the undecomposed form needs eighteen. (S9 slides 63-70)

**13.5 Preparing the graph.** If the graph lacks features, add them (9.10). "Too sparse: add virtual nodes / edges.
Too dense: sample neighbors when doing message passing. Too large: sample subgraphs." With kinds, statistics and
sampling can be done within each relation type, which "ensure[s] neighbors from each type are covered", or across the
whole graph. (S9 slides 56-57)

**13.6 Predicting links: the head, the split, the negatives.** (S9 slides 31-42)
- The head scores a pair from its two node vectors. A plain dot product gives one number, enough only for "does an
  edge exist"; with several relations each relation gets its own scoring function.
- The split: every edge is one of four kinds. Training message edges are the graph the network computes on; training
  supervision edges are what it is asked to predict; then validation edges and test edges. With several relations
  the split is made inside every relation. At validation the network computes on the training message and
  supervision edges; at test on those and the validation edges.
- Negatives are made by corrupting one end of a supervision edge, and "the negative edges should NOT belong to
  training message edges or training supervision edges": a corrupted pair that is a real edge is not a negative.
- Scoring: the true edge is ranked against the corrupted ones that are not real edges; the share ranked in the top k,
  and the reciprocal of the rank.
- A benchmark with dates is split by time: trained on what was published before a date, tested on what came after.
  (S9 slide 45)

**13.7 Knowledge-graph embeddings: one learned vector per entity, and a scoring rule per relation.** A knowledge graph
is a graph of typed entities and relations that is "massive" and "incomplete: many true edges are missing"; the task
is, for a given head and relation, to predict the missing tail. The models of this family are "shallow": the encoder
"is just an embedding-lookup", one vector per entity and per relation, and "we do not learn a GNN here". They are
trained to score real triples above corrupted triples "that do not appear in the KG". (S10 slides 11-22)
- Cannot, by construction: say anything about an entity that has no row in the lookup table. The deck's own label for
  the family is "shallow/transductive". (S10 slides 15, 18)

**13.8 Each scoring rule can represent some kinds of relation and provably not others.** Five kinds: symmetric (if a
relates to b then b relates to a); antisymmetric; inverse pairs (advisor and advisee); composition ("my mother's
husband is my father"); one-to-many (one head, many tails). (S10 slides 23-24)
- **Translation in one space** (head plus relation should land on tail). Can: antisymmetric, inverse (the negated
  vector), composition (vectors add). Cannot: symmetric: it would need the relation vector to be zero and head equal
  to tail, "however h and t are two different entities". Cannot: one-to-many: every tail of the same head and
  relation is forced onto one point. (S10 slides 20-30)
- **Translation in a space per relation** (project head and tail with the relation's own matrix, translate there).
  Can: all five; two different entities can be projected to the same point in one relation's space and stay apart in
  the entity space; composition holds because "linear functions are chainable". Price: a matrix per relation.
  (S10 slides 32-42)
- **Product of head, relation and tail, component by component.** A full matrix per relation is "too general and
  prone to overfitting", so it is limited to a diagonal. Can: symmetric, one-to-many. Cannot: antisymmetric, inverse,
  composition: the product is commutative, so the triple and its reverse "always have same score"; the rule "cannot
  differentiate between head entity and tail entity", and "all relations are modelled as symmetric regardless".
  (S10 slides 44-52)
- **The same product with complex numbers and a conjugated tail.** The conjugate breaks the symmetry. Can: symmetric
  (zero imaginary part), antisymmetric, inverse (the conjugate relation), one-to-many. Cannot: composition.
  (S10 slides 54-61)
- **Rotation in complex numbers** (the relation turns the head towards the tail). Can: symmetric, antisymmetric,
  inverse, composition. Cannot: one-to-many in the strict sense; like translation it has only "a weaker notion" of
  it, many tails at the same distance. (S10 slide 61)
- **The rule for choosing.** "Different KGs may have drastically different relation patterns!" "There is not a
  general embedding that works for all KGs, use the table to select models": first find which kinds of relation the
  data has, then take a rule that can represent them. (S10 slide 62) The deck's order of work: the simplest translation rule
  "for a quick run if the target KG does not have much symmetric relations", then the more expressive rules.

**13.9 A database read as a graph (relational deep learning).** Every row of every table is a node; an edge joins two
rows wherever a foreign key matches a primary key; the kind of a node is its table; the rows keep their own columns as
features ("entities also have features (different than KGs)"). The joins on keys "are exactly the pkey-fkey edges".
(S12 slides 39-45, 60-61)
- What message passing is on such a graph: "GNN aggregation is learnable version of hand-crafted features". A sum
  over a node's neighbours inside a time window is the query "sum of value per user since a date"; the network learns
  which such aggregates to form. (S12 slides 59-62) By 9.5 this needs an aggregation that can sum and count. The deck's
  form of a message: the neighbouring fact's own representation, multiplied by an embedding of that fact's time,
  combined by a learnable aggregation. (S12 slide 62)
- Can: "discard neighboring node information that is irrelevant for the given downstream task"; "detect fine-grained
  patterns within local neighborhoods"; "exchange information across training examples", because entities are no
  longer isolated rows; reach, by "multi-hop reasoning across table boundaries", "information which is hard to
  pre-compute beforehand". (S12 slides 63-65)
- Must be time-aware throughout: "The computation graph for each node is time-dependent. Message+Aggregation becomes
  time-dependent. Sampling over neighbors is time-dependent." (S12 slide 58)
- What it replaces, and that method's limits: a single table of hand-built features, where "features are chosen
  arbitrarily (e.g., aggregations, time windows)", "only a limited set of data is used", and there are "issues with
  point-in-time correctness/information leakage". (S12 slide 14)
- The deck's reasons why a language model does not replace it: "Database prediction is NOT sequence modeling";
  language models "are NOT trained to predict the future"; "Context size is limited". (S12 slide 21)
- The older method it inherits from (statistical relational learning) "only works with categorical variables" and
  "does not scale to large data". (S12 slide 31)

---

## 14. Training on a graph too large for memory

**14.1 Why ordinary mini-batches fail.** Nodes sampled independently "will be isolated from each other", and a
network that aggregates neighbours "does not access to neighboring nodes within the mini-batch". Computing on the
whole graph at once is cheap per step, linear in edges and layers because every layer's vectors are reused, but the
whole graph and its features must fit in the card's memory. (S15 slides 9-11, 29-30)

**14.2 Neighbour sampling.** One node's vector needs only its K-hop neighbourhood, so a batch is a set of such
computation graphs. (S15 slides 14-18)
- Cannot avoid: the computation graph "becomes exponentially large with respect to the layer size" and "explodes when
  it hits a hub node". Keeping at most H neighbours per hop bounds it, and it is "still exponential": one more layer
  costs H times more. (S15 slides 20-24)
- The trade-off: a smaller H is cheaper and gives "less stable training due to the larger variance in neighbor
  aggregation". (S15 slide 24)
- Which neighbours: uniform sampling is "fast but many times not optimal (may sample many 'unimportant' nodes)"; in
  a graph of a few hubs and many leaves it mostly draws leaves. Taking the neighbours with the highest
  random-walk-with-restart score from the root "works much better in practice". (S15 slide 25)

**14.3 Subgraph sampling (clusters).** Partition the graph into groups, sample groups, compute layer by layer on the
subgraph they induce. The cost is linear in the number of layers. (S15 slides 28-38, 46-48)
- The rule for a good subgraph: it "should retain edge connectivity structure of the original graph as much as
  possible". **Counterexample:** two four-node induced subgraphs of one graph: one keeps a community whole, the other
  "drops many connectivity patterns, even leading to isolated nodes". (S15 slides 32-33)
- Cannot, with one group per batch: the links between groups are removed, so "messages from other groups will be
  lost"; and a group "tends to only cover the small-concentrated portion of the entire data", so the gradient "has
  high variance". Several small groups per batch, with the links among them, reduce both. (S15 slides 39-45)
- Cannot, in any form: it "leads to systematically biased gradient estimates (due to missing cross-community
  edges)". (S15 slide 49)

**14.4 Diffusion computed once (a network without its nonlinearity).** Remove the nonlinearity and K layers collapse
to the input features diffused K times along the graph, followed by one linear map. The diffusion "needs to be
calculated only once", on an ordinary processor, and any ordinary model can be trained on the result. (S15 slides
51-56)
- Cannot: "the model is less expressive", "due to the lack of non-linearity in generating node embeddings". It is
  the linear filter of section 3 again.
- When it is enough: when "nodes connected by edges tend to share the same target labels" (homophily). The
  pre-processing is repeated averaging over neighbours, so connected nodes get similar features and similar
  predictions: it "aligns well with the graph homophily". By the same mechanism it helps only as far as the wanted
  answer is shared along edges. (S15 slides 57-62)
