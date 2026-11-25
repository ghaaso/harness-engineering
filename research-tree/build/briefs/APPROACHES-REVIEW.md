# Brief: different approaches to the problem, not bigger copies of one (2026-11-25)

The owner's words, in full; they outrank this brief. He said them after being told that 22 graph-network settings
of different sizes scored within a hair of each other and that "the limit is the signal, not the size":

> "You're saying we tried 222 graph network settings of different sizes and they all scored within a hair of each other. Isn't that more of an architectural issue where the architecture is not good enough or not optimized for it, and we need to evaluate other options of looking at it, different approaches to the problem so that we can actually do it? The whole point of this is that getting the results from a bigger model and then reducing its complexity and making it smaller, etc., etc., to like moving down from that. So that's the plan basically. And what about the TGNs, the all the other kind of graph models, since also the graph rag system where the graph and LLMs will be running to reduce hallucination and get there's just a lot of opportunities and a lot of things that we could possibly try. Even uh, a lot of architectures out there, like and I also want you to take into consideration that sometimes a pipeline of separate components that specialize in one thing and will link together to perform the whole task and achieve it is better than just one component being rigorously modified and tested to doing all of it itself. Are you understanding where I'm getting at here? uh,"

He added a few minutes later, also in full:

> "also you should take into account what past results have showed us and reason accordingly"

So every design and every ranking in the deliverable is argued from what was measured here before, each result
named with its file and with the lens it was scored against (a result on one form on one repository is a result
about that form; say what it does and does not carry over): the big run's card tests
(`research-tree/build/runbig/d4-report.md`, `d2-report.md`, `refute/CARD-D4.md`: the knowledge-graph embeddings and
the rule miner under the counting baseline, the fusion level with it, the text retrievers against keyword search);
the graph test and the embeddings test (`docs/program/GRAPH-TEST-RESULT-2026-11.md`,
`docs/program/evidence/harness-bottlenecks/graph2/embeddings/COORDINATOR-REPORT.md`, with its limits);
`docs/program/HARNESS-BOTTLENECKS-2026-11.md` and `TOKEN-BOTTLENECK-2026-11.md`; this round's units (U1 to U6) and
their verdicts. Add a section "What past results say" before the designs: what each result supports, what it rules
out and what it leaves open, and show for each design which past result it builds on or answers.

His standing rulings, which this request repeats: one null is not a verdict on a family; do not narrow the question
(test the architecture he described: a knowledge layer, time, caching, an agent in the loop, with the popular tool
itself as an arm); test the strongest form of an idea, like with like, scoring defined first; name the classical
problem and its field and borrow the standard solution whole, saying which assumption fails here; r57-0076 (bolder,
measurable improvements before the pilot); r57-0619 is the mistake he already rejected once ("simple is enough"
after one form per family). The sentence "the limit is the signal" was this session's reading, not a measured fact:
treat it as a claim to test.

## What is known (read the files, do not take this summary as the record)

- The round: `research-tree/build/IMPROVE-STATE.md`, `research-tree/build/improve/CANDIDATES.md` (18 forms ranked, 8
  chosen), the units under `improve/units/` and `improve/code/`.
- This morning's reading of the arms against bigger cards: `improve/EXPAND-2026-11-25.md`.
- The task of files that change together (D4): the learned ranker over hand-made history features (U4), a graph
  network link predictor (U5, 22 settings, all within 0.004), time-aware graph models (U6: DyGFormer, TGN, below the
  counting baseline so far). All three read the same input, the co-change history with weak text features, and all
  answer one narrow question in one shot.
- The task of finding files from a bug report (D2) already runs as a pipeline: candidate search, a learned ranker
  over many signals, a large model re-ordering the top.
- The research already recorded: `library/INDEX.md` and the records behind it (graphs and knowledge graphs were
  researched widest, encoders, memory and caching wider), `docs/program/GRAPH-V2-DESIGN-2026-11.md`,
  `docs/program/HARNESS-V2-DESIGN-2026-11.md`, `docs/program/GRAPH-TEST-RESULT-2026-11.md`, the embeddings test's
  coordinator report, `research-tree/START-HERE.md` for where the research tree's outputs live.

## What to deliver

`research-tree/build/improve/APPROACHES-2026-11-25.md`, and a reply of at most eighteen lines.

1. **What the plateau does and does not show.** What the three D4 families share (the information they see, the
   question they are asked, the data they train on), and which explanations fit 22 settings landing together: the
   input, the question, the training target, the evaluation, or the architecture family. Say which checks would tell
   them apart, cheapest first.
2. **The classical problems this is an instance of, and their standard solutions**, from the recorded research
   first: for example next-basket and session recommendation, link and hyperedge prediction in a growing graph,
   change-impact analysis in software engineering, retrieval over a code knowledge graph with a language model
   (graph RAG). For each: what the field's strongest forms are, what they need as input, and which of their
   assumptions fails on our data. Where the record has no figure, write "not recorded: to collect", not a guess.
3. **Architectures as pipelines of specialised components.** At least three concrete designs, each drawn as its
   components, what each one sees, what each is asked, and how they connect: one of them a graph plus language
   model design aimed at fewer hallucinations (say how a hallucination is counted), one that adds information the
   current models never see (the code's structure: imports, calls, symbols; the content of the change), and one that
   keeps today's parts and changes how they are joined. Include TGN and the other graph models where they fit as a
   component, in their strongest form.
4. **Bigger first, then smaller.** His plan: reach the result with a large model or pipeline, then reduce it. For
   each design: what the large teacher is, what is distilled into which smaller part, and how the seven measures
   (throughput, efficiency, token count, token cost, time, quality, hallucinations) are read at each step.
5. **What to test first.** A ranked short list of at most four, each with: the scoring defined before any run and
   the like-for-like baseline (the same information given to the simple baseline where the task changes); what we
   have and what is missing (data to extract, code to build, models to download with source, size and licence);
   GPU-hours on a 96 GB card; build effort; what could be learned tonight on rented cards and what needs a round of
   its own. Say plainly what stays untested.

## Limits

Read only. No download, no install, no web search, no job started or touched, nothing sent anywhere. Never open a
held-out truth file. Work from the files, not from memory of them. Do not start helpers. About forty minutes.
