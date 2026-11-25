# Brief: graph transformers, known failure modes and data, for the co-change and file-finding work (2026-11-25)

The owner's words, in full and unedited; they outrank this brief. He sent them at about 13:35 UTC on 2026-11-25 with a
slide of a talk on relational graph transformers (token rows: multi-modal input features, table type, hop information,
temporal encoding for fact tables, tree encoding to preserve child, parent and sibling relations; headline: "Positional
Encodings are key to make Graph Transformers work, but Laplacian or Random Walk-based encodings are too expensive to
pre-compute") and a lecture deck (Xavier Bresson, NUS, Graph Machine Learning lecture 9, "Graph Transformer", 96 slides).

> "<< laplacian is a isotropic operator, transformers on directed graphs, we have to define operators which can encode direction, they frirst try to fdefine the operation to encode the direction which are inpired from physics, gnns have issues with oversquashing, graph transformers, in gnns when we havemessages coming from diistant nodes the neighbourhood risees exponentially, since it comes from eexponential blowup of neighbourhbood hops so theres a high chance of oversquashing, paper on the info bottleneck on this and how graph transformers with global attentiohn can allieviate the bottleneck theres a paper that investigvates this bottlneck, the gist of it is if we were to extend the converage of messagepassing or same case attedntion it would be a way to alliviate it, there are hybrid combinations like graph gps and others transformers provide attention and gnns thenused to incorporate edge features, in such a hybrid sense edges can be used or maybe the transformers could also build on the edge etc etc it can be used with text too somehow there are some good investigations and papers on this also embeddings etc>> for unstructured data we solve that we wil have to create a text to knowledge graph system, npnns fail with oversquashing but still smth is, graphtransfortmers shouldnt have issues with locality message passing gnn with transformers is sort of best of both worlds. >> This is what I've researched on graph transformers. And first of all, I'd like to ask, what is our end goal here? I've sort of lost track what we're trying to get at. We have experimented with a lot of options on our GPU, training them. What are we trying to achieve here? What's the baseline we're trying to beat and we're not able to beat? And what is it that we're achieving? How much, given that we achieve it, what would the benefit be? And considering all this information and this relational graph transformer stuff, wouldn't this be a very good option to consider to test, especially since now we have a very good resource of GPUs, with rented GPUs with some credits, instead of focusing on other approaches? Wouldn't, if this would be a very good one to test and would be very good, well likely to get our results better, then we could try this. And as I mentioned, some of them, the others you can research yourself. The bottlenecks that come with GNNs and the transformers, are any of our results that came bad due to those bottlenecks? For example, over squashing or the limitations of GNNs or temporal graphs. And we could also be looking at a pipeline or a better, like like in the attached screenshot, temporal information as well, like the TGN stuff, utilizing the advantages of other architectures. And another thing is that relational graph, not relational graph transformers in general have a complexity of O(n) square, but there are optimizations to this and a lot of stronger forms of this that are specific to use case, where we can use the better options and gain a lower complexity. And the formulas we use, for example, the Laplacian formula or the message patching, it really depends on what use case we're going for and what sort of embeddings, what sort of formulas would be good for our stuff, because any bad or wrong choice in either of these could lead to us having bad results. But in reality, the architecture or the actual the concept would be correct and the idea would be good, but our choice of things might be flawed. So we have to be careful with that, very careful with that, because we cannot be wasting our GPU resources as limited as they are, given these things. Okay, I'm also attaching a set of slides you could go through as a reference material for your information on graph transformers. So get back to me, let me know what you think. Also, because there might be a possibility that we are in some of the failure modes of graph neural networks or TGNs or whatever we're testing, but we just don't realize it yet. Some common failure modes, etc. And we also have to narrow down from what we know and what we have tested, what the issue might be, etc., etc. But even disregarding that, I've also heard that transformers are very data hungry. So we have to also take a look into how the quality of data would affect our results, and would that be because of the architecture or because of the quality of data itself, whether we need more data, what kind of data would we need to expand the data we have. So that is also an important part of it, whether we have a good set of training data and the good results we've gotten aren't cheated, or like the common failure modes that already exist out there. And there are also the good thing is there are a lot of investigations on these models and their what they can and can do, what happens in nuance or specific situations. So we can use those instead of investigating or running stuff on our GPUs on our own, which has already been done before. So that we're confident that what we are about to experiment right now has not been done before, and this would gain us some very good insight."

## What the lecture deck says (read by the top session from the file's text; the deck itself stays in his Downloads)

- Message-passing networks are bounded by the 1-WL test and cannot count simple substructures; positional or structural
  encodings break the symmetry. "There is no universally optimal PE and SE. The appropriate choice depends on the graph
  family and downstream task." Laplacian eigenvectors: global position, costly (O(n^3) exact), sign and basis ambiguity.
  Random-walk return probabilities: no ambiguity, O(nK) memory, not unique per node.
- Over-squashing has three causes: stacked layers compress a receptive field that grows exponentially; multi-step
  reasoning also overloads global attention; a narrow cut between graph regions. Global attention gives a one-hop path
  between any two nodes and so helps when the answer needs one long hop.
- Sparse graph transformer: attention along edges, O(n + E), needs many layers for long range. Dense: all pairs, O(n^2),
  practical for about a hundred to a thousand tokens. Hierarchical form (graph patches by METIS, a local network per
  patch, global attention over patch tokens): O(n S d) for patch size S.
- The deck's own next steps: richer node and edge features from language models, and graph retrieval that selects a
  relevant subgraph instead of processing the whole graph (G-Retriever).

## The three pieces of work started on it (helpers of the top session)

1. Published findings, part 1: graph transformers and relational graph learning. Output `improve/lit/GT-LIT-1.md`.
2. Published findings, part 2: over-squashing, temporal graph models, recommendation baselines, learned models for
   files that change together. Output `improve/lit/GT-LIT-2.md`.
3. Known failure modes against our own graph runs (U5, U6, T1), from the code, the logs and the tables.
   Output `improve/FAILURE-MODES-2026-11-25.md`.

## Rules for all three

- **Privacy.** No project name, repository name, path, identifier or line of code of ours goes into a web search or any
  outside request. Searches use only public terms: paper titles, authors, method names.
- No download of files, no install, no job started or touched, nothing sent anywhere. Web search and page fetches only.
  The page-fetch tool returns a small model's summary of the page, not the page: write for each finding how it was read
  ("abstract page", "paper's HTML page", "search result only"), and write a figure only where the fetched text gave it
  as the paper's own; otherwise "figure not read".
- Held-out truth files are never opened. Evidence and the journal are not written.
- A result on one benchmark is a result about that form on that benchmark: say what was and was not tested.
- Do not start helpers.

## Deliverable

Deliverable: research-tree/build/improve/GRAPH-TRANSFORMER-ANSWER-2026-11-25.md (the answer to his questions, argued
from the three outputs above and the record), shown to him as one page, `improve/review-page/graph-transformers.html`.
Done when he has the page and the short answer. No run, rental, download or build is part of it; each needs his word.
