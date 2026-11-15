# Lane: modelling the knowledge (graph v2) - notes, written 2026-11-13

Scope: the theory of designing a knowledge graph (what the nodes, relations and properties should be, and how identity and quality are handled), read from the primary sources, plus measurements I made on this repository's own facts. Read-only on the repository. Nothing installed or downloaded as a package, model or dataset. Papers and documentation were fetched only for reading; every search used the public names of papers and tools and nothing about the owner's project.

Strength labels: **strong** = independent, controlled or formally proven, replicated or standardised; **medium** = one independent study, or controlled by an interested party, or an engineering description from a production system; **weak** = single study, self-reported, toy scale, or read only as a summary.

How each source was read. "Read" means I extracted the text of the paper or page and the numbers below come from that text. "Summary" means I only saw a search-result summary or the abstract; those are marked and should be re-read before anyone relies on them. A web page fetch in this environment passes the page through a small summarising model, so for every PDF I saved the file and extracted its text locally with a PDF library, and quote that text, not the summary. The scripts for my own measurements are in the scratchpad folder `.../scratchpad/lm/` (idchurn.py, idcum.py, idlost.py, idbody.py, hyper.py) and read only the cached per-commit facts of the finished test and `git`.

Vocabulary used throughout (defined once here):
- **Competency question (CQ)**: a question the knowledge model must be able to answer; the unit of requirements in ontology engineering. The numbered list CQ1 to CQ16 is the one the "real use cases" lane measured from recorded agent sessions (`graph-v2/use-cases.md` section 5); I reuse its numbering and do not re-derive it.
- **Property graph**: nodes and edges that carry a type label and key-value properties, with edge identity (the model of v1 and of the ISO query language GQL).
- **RDF**: the W3C triple model (subject, predicate, object) with global identifiers; **RDF-star** lets a triple be the subject of another triple.
- **Reification**: turning a relation into a node so that statements can be made about it.
- **n-ary relation**: a fact with more than two participants. **Hyperedge**: an edge that is a set of any number of nodes.
- **Network schema / metapath**: the typed graph of node types and relation types (the schema), and a path through it (for example File - defines - Function - calls - Function); the vocabulary of heterogeneous information networks.
- **Occurrence vs entity**: an entity is the thing (a function); an occurrence is where it sits now (file, lines, content hash).

---

## 0. Answer in one page

**Q1. A method for deriving the schema of graph v2 from competency questions, and validating it.**
The documented method is competency-question-driven design (Gruninger and Fox 1995, read through Uschold and Gruninger 1996; Noy and McGuinness 2001, read; NeOn ORSD, summary only). What it prescribes, and how it applies here:
1. Write the questions first, in plain words, each with a sample answer, its type (a *scoping* question may be unanswerable; a *validating* question must be answerable and formalisable; Keet and Khan 2024, read) and its level in a stratification (a lookup, a relation, a composition of lower questions; Uschold and Gruninger: "it is not a well-designed ontology if all competency questions have the form of simple lookup queries"). The list is already measured: CQ1 to CQ16.
2. Turn each question into a typed path query (a metapath, section 2.3) with an answer shape and a token ceiling.
3. The schema is the union of the types and relations those queries use, and nothing else. Two checks follow. *Forward*: every node type and relation type must be used by at least one CQ, or it is dropped or demoted to a property ("for every object, attribute, relation and axiom there should first be an informal competency question which requires it", Uschold and Gruninger 6.4). *Backward*: every CQ must correspond to a path in the schema graph, or the schema cannot answer it. This static check is the cheap analogue of Gruninger and Fox's completeness theorems.
4. Choose node, edge, edge property or hyperedge for each concept by a decision rule (section 5.1), not by what a parser happens to emit.
5. Validate in four ways that need no installation: the static check above; gold answers for each CQ on the tuning data (hand-checked, not produced by the extractor); sampled accuracy per relation type with an interval (Gao et al. 2019 for the sampling theory); and counted constraint violations per rule (Hogan et al. 2021 section 7.3).
6. When two designs both answer a CQ, the competency-question method says they are equivalent with respect to that question and "any comparison must use other criteria" (Uschold and Gruninger 6.7). Here the other criterion is already fixed by the project: an agent's total tokens for the same correct work. So the CQ method picks the candidate designs and the token test chooses among them; no theory I read says which of two valid designs is cheaper for an agent.
**What the static backward check says about v1 today** (section 4.2): of the 16 CQs, v1's schema has no path for five (CQ1 conclusions, CQ2 plan structure, CQ6 change sets, CQ10 recent history and why, CQ14 does the cited line still say that), and only a partial one for CQ4 (rules) and CQ9 (item IDs). Its code half is, by contrast, well justified: every one of its 36 edge kinds present at the frozen commit (the task description counts 37) serves at least one CQ. The gap is the meaning layer and history, not the code structure.

**Q2. Where a hyperedge or n-ary node is the right model, and what a pairwise edge loses.** Four places (section 5): a change set (commit or pull request), a rule with several anchors that play different roles, a conclusion with the set of facts it rests on, and a test whose reach depends on a replaced dependency. Elsewhere (calls, imports, defines, reads, writes, citations, a route) binary edges with properties are right, and a route is already the right kind of n-ary node because its identity is the key (method plus path). Measured on v1's own facts: 85% of the commits it uses touch more than two files; the 12% of commits with 16 to 30 files produce 55% of the pairwise co-change pairs; 49% of its 1,896 co-change edges are supported only by commits of 10 or more files. A pairwise edge cannot tell "A and B changed alone together" from "A and B were two of thirty files in a sweep". The theory (Zhou et al. 2006; Fatemi et al. 2020) gives a principled weight, `w(e)/|e|`, that damps big change sets; whether it raises recall here is a one-hour tuning-data test (R3), not a known result.

**Q3. How identity over time should be handled.** Separate three things: the entity's key, the occurrence (where it is now), and the lineage (how identity continued across a rename, move, split or merge, with the method and score that decided it). Key by what is stable for each kind: the contract key for contract things (route = method plus path template, table.column, setting name, outbox kind), an explicit never-reused identifier for documents and rules (the ADR rule), an opaque minted id with an alias table for definitions. Never key by line number or ordinal. Measured on v1: its section ids contain line numbers, its invariant ids are ordinals, its URL-site ids contain line numbers. Across 110 consecutive snapshot pairs 78% of removed section ids re-appeared under the same heading with a new id, and 13 section ids and 11 invariant ids stayed the same while pointing at a different section or rule (a conclusion would have silently attached to the wrong text). Against the frozen commit, only 74% to 76% of the section ids of 16 to 23 days earlier still exist, and 5 or 6 of the 6 invariant ids that existed 16 to 27 days earlier now mean a different rule. For definitions the id string is much more stable (functions 99.0% at 16 days, 90.3% at 55 days), and of the definitions that were lost between 55 and 57 days ago, about one in five has the same name elsewhere (a move); a body-similarity match of 0.8 or more confirms only 4 of 44 and 9 of 53 of them (22 to 24 more sit in a 0.5 to 0.8 band that cannot be called, and the rest are gone), but 70 of 127 (55%) in a 64-day-old snapshot that spans the June restructuring. Lineage pays for restructurings and moves, not for deletions.

**Q4. What the meaning layer should look like as a model.** Seven entity types (Document, Section, Item, Rule, Decision, Claim, Evidence) and one provenance idea (every statement points to its source and producer), with relations `defines`, `cites` (carrying the cited span and its hash at citing time), `constrains` (carrying a role), `justified_by`, `supersedes`, `rests_on`, `about`. Statuses (valid, suspect, superseded, unanchored) are computed from the hashes of what a statement rests on and from explicit supersession links, never set by a model's opinion. An ambiguous or missing anchor is a visible status, not k edges of weight 1/k (v1 does the latter for 122 mention sites). The model is independent of how it is extracted; section 7 gives it, with the bill-freeze rule as a worked example.

**What I would not do** (section 9): adopt an RDF or OWL stack, a knowledge-graph embedding model, or the full property-graph schema standard at this size; adopt Kythe's or SCIP's identifiers as identity; trust a rename-tracking tool published for Java to work on Python and TypeScript.

---

## 1. What the earlier rounds got wrong or skipped in this area

1. **The schema was derived from what could be extracted, then checked against a hand-picked question list, never the reverse.** The first round's schema lane (`research/lane-schema.txt`) built 25+ node kinds and 35+ edge kinds from parsers and listed seven question families to score against ("screen to tables", "other half of a rule", ...). That is closer to competency questions than nothing, but the families were chosen from the graph's strengths, had no stratification and no check of answerability, and the finished test then scored only one of them as the headline (co-change recall, which the use-case lane shows is CQ10, 1.8% of product carried tokens). The competency-question literature says the order is requirements, then terms, then evaluation by the questions (Uschold and Gruninger 6.3 to 6.8).
2. **Identity was left as an open item.** `lane-temporal.md` section 3.3 says "identity errors ... not measured by anyone I found for code". Version-control research has measured it (method-level history tracking, section 2.5), but only for Java; and nobody had measured it on this repository's own cache of 191 snapshots. I did (section 3).
3. **`confidence` means three different things in v1** (section 3.4) and the audit lane noticed the ranking misuse; it was not noticed that the field is not calibrated to anything (Knowledge Vault, section 2.8).
4. **Documents were modelled as text with citations to code.** The first round's schema lane keyed document ids by (document family, id), which was right, and then did not model what a document item *is* (a rule, a decision, a finding, a conclusion) or what it rests on. `use-cases.md` section 7 point 7 makes the same complaint from the usage side.
5. **n-ary modelling was never examined.** v1 expands every commit into pairwise edges ("clique expansion") without saying so; the theory of what that loses is old (Zhou et al. 2006) and the ROSE paper that v1 cites for support and confidence also caps a transaction at 30 entities (section 2.2).
6. **Evaluation of schema quality was only precision samples of 20 to 30 edges per kind.** At 95% confidence that leaves an interval of about plus or minus 10 to 20 points; section 2.6 computes what a proper sample costs.
7. **Where the earlier rounds were right and I keep it:** property graph over RDF (section 2.2), document ids scoped by family, tables and settings as first-class nodes, evidence line on every edge, extractor-version keyed caches.

---

## 2. The theory and the evidence, by topic

### 2.1 Ontology engineering from competency questions

**What the method is (primary, read).**
- Gruninger and Fox (1995, IJCAI workshop on basic ontological issues) introduced competency questions as the requirements of an ontology. I could not open the 1995 paper (the Toronto host timed out twice; other mirrors returned 403 or a compressed file I could not read). I read the same authors' account in Uschold and Gruninger, "Ontologies: principles, methods and applications", AIAI-TR-191, Knowledge Engineering Review 11(2), 1996 (PDF text extracted; sections 6.2 to 6.8 are the Gruninger and Fox method).
- Sequence: motivating scenarios; informal competency questions; informal terminology; formal terminology; formal competency questions; axioms; completeness theorems (6.3 to 6.8).
- Informal competency questions are "expressiveness requirements that are in the form of questions"; the ontology "must be able to represent these questions using its terminology, and be able to characterise the answers to these questions using the axioms and definitions" (6.4).
- Stratification: "Ideally, the competency questions should be defined in a stratified manner, with higher level questions requiring the solution of lower level questions. It is not a well-designed ontology if all competency questions have the form of simple lookup queries" (6.4). Each question should state its rationale (how its answer is used to answer more complex questions) or its decomposition (simpler questions that must be answered first).
- Questions do not determine a design: "There is no single ontology associated with a set of competency questions. Instead, the competency questions are used to evaluate the ontological commitments that have been made" (6.4). Axioms must be "minimally sufficient" to express the questions and characterise their solutions (6.7). If one axiomatisation can represent a question and another cannot, the first is more expressive for that question; "if two different axiomatisations can represent a competency question and characterise its solutions, then they are equivalent with respect to the question, and any comparison must use other criteria" (6.7).
- Completeness theorems (6.8) state conditions under which a question's solutions are complete, in forms such as "the ontology plus the ground facts entail the question's conditions if and only if they entail the query".
- Pruning rule for an existing ontology: "for every object, attribute, relation, and axiom in the prior ontology or proposed extension, there should first be an informal competency question which requires the object or constraints defined with the object" (6.4). This is the forward check I use in section 4.

**Ontology Development 101** (Noy and McGuinness, Stanford KSL-01-05, 2001; PDF text extracted, read). Step 1 is domain and scope; competency questions are "a sketch and do not need to be exhaustive", the "litmus test later" for whether the ontology holds enough information and the right level of detail. Its three rules: there is "no one correct way to model a domain - there are always viable alternatives. The best solution almost always depends on the application that you have in mind"; development is iterative; concepts should be close to objects and relationships in the domain (nouns are classes, verbs are relations). Steps 3 to 7 (terms, classes, properties, facets, instances) are the modelling steps; step 5 notes that properties of several kinds become slots. Strength of the method as evidence of *effect*: none in the paper; it is a guideline.

**NeOn methodology** (Suarez-Figueroa, Gomez-Perez, Fernandez-Lopez; Springer chapter, 2012). Summary only (search result; I did not open the chapter). The Ontology Requirements Specification Document records the purpose, scope, intended users and uses, and the functional requirements as groups of competency questions with their answers, optionally prioritised. Nine scenarios for building ontologies, with reuse as the focus. Used here only as the form of the requirements document (section 4.1).

**What more recent work says about competency questions, and where it is weak** (read unless marked):
- Keet and Khan, "Discerning and Characterising Types of Competency Questions for Ontologies" (arXiv 2412.13688, 2024; PDF text extracted). Abstract: CQs are widely used for scoping and validation, "however, very limited guidance exists for formulating CQs and assessing whether they are good CQs, leading to issues such as ambiguity and unusable formulations". They propose five types: scoping, validating, foundational, relationship, metaproperty. A scoping CQ need not be answerable or even formalisable; a validating CQ "should be both formalisable and answerable" and its needed expressiveness must not exceed that of the ontology's language. They release a repository of 438 annotated CQs (ROCQS). They cite Monfardini et al.'s survey: CQs helped mostly in defining scope and evaluating, were authored iteratively, and the lack of detailed guidelines and tools is the main difficulty; and Guizzardi and Guarino's claim that CQs are typically "mere lookup queries" whose real value is in context-dependent requests for explanation. Strength: medium (theory plus one user story; no outcome measurement).
- Wisniewski, Potoniec, Lawrynowicz, Keet, "Analysis of Ontology Competency Questions and their formalizations in SPARQL-OWL", Journal of Web Semantics 59, 2019 (summary only; abstract and a search-result description). 234 CQs from several ontologies analysed; 106 distinct CQ patterns; "no 1:1 mapping" between a CQ's sentence form and a query form. Consequence for us: a list of questions in words does not by itself give a schema; each question needs an explicit formal query (step 2 above).
- So the honest summary of the evidence: competency questions are the standard *requirements* device, are used for coverage checks (the share of questions the model can answer), and are recognised by their own community to lack guidance on what a good question is. No source I found measures whether a CQ-derived schema leads to better downstream task results than an ad hoc one. **Weak for effect; strong as a discipline for making the requirement list explicit and checkable.**

**Applies at this size?** Yes, fully: 16 questions is a small list, the schema is a few dozen types, and the checks are scripts. At 10x or 100x the size the method scales with the number of questions, not the number of nodes.

### 2.2 Property graphs against RDF and RDF-star; n-ary relations, reification, hypergraphs

**Models and when each represents context** (Hogan et al., "Knowledge Graphs", ACM Computing Surveys 54(4), 2021, arXiv 2003.02320; full text extracted and read for sections 3.2, 3.3 and 7).
- Section 3.3 (context): context can be put directly in the data (turn the relation into a node), by reification (RDF reification, n-ary relations, singleton properties), or by a higher-arity representation (named graph, property graph, RDF-star). "In general, a reified edge does not assert the edge it reifies; for example, we may reify an edge to state that it is no longer valid." Of the higher-arity options: "the most flexible is the named graph representation, where we can assign context to multiple edges at once"; "the least flexible option is RDF*, which, in the absence of an edge id, does not permit different groups of contextual values to be assigned to an edge" (their example: a person holding an office in two separate terms cannot pair each start with its end). A property graph attaches the context as attributes on an edge that has its own id.
- Property graph is the model of v1 (nodes and edges with labels and attributes, edge identity). The ISO query language for it, GQL, was published as ISO/IEC 39075:2024 (April 2024); SQL/PGQ is part 16 of SQL:2023 (summary of ISO catalogue pages; standardisation facts, medium). The schema language for property graphs, PG-Schema (Angles et al., Proc. ACM Manag. Data 2023, arXiv 2211.10962), gives types with multiple inheritance and key constraints; summary only, I read the abstract. The abstract itself says schema support in graph databases is "limited".
- **My reading for this project:** keep the property graph. Edges here carry evidence (file, line), a resolution method and a status; they need their own properties and ids. RDF's strengths (global IRIs, OWL reasoning, federation across sources) are about integrating many independent publishers; this graph has one publisher and no reasoning requirement. RDF-star would lose pairing of context values on an edge (the Hogan example). Nothing in the retrieval questions needs inference. The advantage of RDF-world patterns that remains is the *patterns*: PROV-O's qualified relations (an n-ary node for a derivation) and named graphs (a context shared by many edges) can be mimicked with a node and a property.

**n-ary relations: when the relation should be a node** (W3C Working Group Note, Noy and Rector, "Defining N-ary Relations on the Semantic Web", read). Four use cases: (1) a binary relation needs extra attributes (certainty); (2) two properties that always go together should be one relation; (3) several participants with no primary one (a purchase: buyer, seller, object); (4) ordered arguments (a flight visiting three airports). Pattern 1: a new class for the relation with n properties to the participants; Pattern 2: an ordered list. The note's warning: creating a class for an n-ary relation "limits the use of many OWL constructs and creates a maintenance problem". This is the decision rule I use in section 5.1.

**Hypergraphs and what a pairwise edge loses** (read):
- Zhou, Huang, Scholkopf, "Learning with Hypergraphs: Clustering, Classification, and Embedding", NIPS 2006. Their motivating point: a graph with an edge between any two articles that share an author "cannot tell us whether the same person is the author of three or more articles"; replacing a hyperedge by a clique of pairwise edges with weight `w(e)/delta(e)` each (delta = the number of nodes in the hyperedge) is the standard approximation, and the natural random walk on a hypergraph is: from node u, choose an incident hyperedge e with probability proportional to `w(e)`, then choose a node of e uniformly. Strength: strong as mathematics; the evaluation is on clustering and classification benchmarks, not on retrieval for code.
- Fatemi, Taslakian, Vazquez, Poole, "Knowledge Hypergraphs: Prediction Beyond Binary Relations", IJCAI 2020 (arXiv 1906.00137, read intro). 61% of the relations in the original Freebase are non-binary. Reification keeps the information but adds entities a model never saw in training; star-to-clique "loses information": the clique for flies-between(Air Canada, New York, Los Angeles) reads as true because the three pairs are each connected somewhere. Medium (link-prediction benchmarks).
- Galkin et al., "Message Passing for Hyper-Relational Knowledge Graphs" (StarE), EMNLP 2020 (arXiv 2009.10847, read). Hyper-relational facts are a main triple plus qualifier pairs. About 17.4% of 734 million Wikidata statements (as of August 2019) have at least one qualifier; in their WD50K set 13.6% do; models that use qualifiers beat triple-only baselines by up to 25 mean-reciprocal-rank points, with the gain growing as the share of qualified facts grows (WD50K(100), all facts qualified). Medium; link prediction, not retrieval for agents.
- Luo et al., HyperGraphRAG (arXiv 2503.21322, NeurIPS 2025): n-ary relations extracted by a language model and stored as hyperedges; reports gains over standard RAG and graph RAG in medicine, agriculture, computer science and law (summary only; I did not read the paper). Weak for our case: model-extracted, different domains, no code, one third-party summary quotes +7.45 F1 which I did not verify.
- **The software-engineering precedent that matters most: the commit as a transaction.** Zimmermann, Weissgerber, Diehl, Zeller, "Mining Version Histories to Guide Software Changes" (ICSE 2004, TSE 2005; ICSE PDF text extracted, read). A *transaction* is the set of entities changed together; ROSE groups per-file CVS changes by a 200-second sliding window with the same author and rationale; mines association rules `x1 => x2` between disjoint entity sets (an antecedent set and a consequent set, not pairs); and "ignores all changes that affect more than 30 entities" to avoid merge commits and sweeps. Reported (ICSE abstract): after an initial change it predicts 26% of further files to be changed and 15% of the precise functions or variables; the top three suggestions contain a correct location with 64% likelihood (the TSE abstract reports more than 70% for eight open source projects; I read the ICSE text only). Medium (the authors' own evaluation on open source projects, CVS era, Java and C).
- Graphify keeps hyperedges "in a side list" (earlier lane `widen/architecture.md` table, read from source there): the same observation that a group relation does not fit the pairwise edge list.

**What does not need an n-ary model.** The relations behind CQ7, CQ8, CQ13 and CQ15 (calls, imports, defines, reads, writes, route registration, client URL to route) are binary relations with properties. Fatemi's 61% non-binary statistic is for Freebase, a general knowledge base of events and roles, and says nothing about a code graph; on this repository the binary reading is enough for these relations (section 5.2 table).

### 2.3 Heterogeneous information networks and the theory of metapaths

- Definitions (Shi, Li, Zhang, Sun, Yu, "A Survey of Heterogeneous Information Network Analysis", IEEE TKDE 2017, arXiv 1511.04854, text extracted and read). A *heterogeneous information network* has more than one object type or relation type. Its *network schema* is a directed graph over the types, whose edges are relation types, with a type mapping from every node and link of the instance. A *meta path* is a path on the schema, `A1 -R1-> A2 -R2-> ... -> A(l+1)`, defining a composite relation; a path instance follows it in the data. A meta path is *symmetric* if it equals its inverse (AP-A, APVPA in the bibliographic example). The schema "specifies type constraints" and so makes the network "semi-structured, guiding the semantics explorations".
- Similarity depends on the path: for the same pair of authors, the path author-paper-author ranks the person's students as most similar, the path author-paper-venue-paper-author ranks reputable researchers in the same field (survey, Table II discussion).
- **PathSim** (Sun, Han, Yan, Yu, Wu, "PathSim: Meta Path-Based Top-K Similarity Search in Heterogeneous Information Networks", VLDB 2011, PDF text extracted, read). Defined only on a *symmetric* meta path between objects of the *same type*: `s(x,y) = 2 * |paths x to y| / (|paths x to x| + |paths y to y|)`. The denominator is each object's "visibility" (its number of self-paths), so a highly connected hub cannot look similar to everything. Materialises short paths and combines them. The paper's evaluation is on bibliographic networks (DBLP); I extracted the text but did not transcribe the result tables.
- **Path-constrained random walks / Path Ranking Algorithm** (Lao and Cohen, Machine Learning 81(1), 2010; abstract-level summary): proximity is a weighted combination of "path experts", one weight per *sequence of edge labels* instead of one weight per edge label as in random walk with restart; reported to beat random walk with restart (trained and untrained) on eight tasks in two biology subdomains. This is the learning counterpart of a hand-written metapath budget. (Ranking as link prediction is another lane; I record only the schema consequence.)
- **Choosing metapaths:** Meng, Cheng, Maniu, Senellart, Zhang, "Discovering Meta-Paths in Large Heterogeneous Information Networks", WWW 2015 (summary only): existing methods assume a domain expert supplies the meta paths; the paper asks for example node pairs with high proximity and finds the meta paths that best explain them, using a greedy algorithm because exact selection is intractable. Relevance: the finished test's tuning commits supply exactly such example pairs.
- **Consequence for the schema:** the network schema is the right *artifact* to write down, because every CQ becomes a metapath on it and the static completeness check (section 0, step 3) is a reachability check on a graph of about 25 types. The earlier schema lane's "typed edges with a hop budget per edge type (metapaths), not one global hop limit" is correct in these terms. What HIN theory does *not* give is an answer-size control: PathSim and PRA rank; they do not decide how many nodes an agent should be shown.
- **Applies at this size?** The schema graph, yes. PathSim-style scoring is meaningful for questions like "which functions are similar peers of this one through shared tables and routes"; no CQ asks that, so PathSim is *not* recommended; I note its visibility normalisation is the same hub damping the v1 audit found needed.

### 2.4 Existing schemas for software knowledge, and what can be reused

| Schema | What it models | Identity | Source and strength | Reuse here |
|---|---|---|---|---|
| **Kythe** | Graph of anchors (byte ranges) and semantic nodes; kinds such as file, function, record, variable, package, doc, vcs; edges `ref`, `ref/call`, `defines/binding`, `childof`, `param.N`, `typed`, `extends`, `overrides`, `satisfies`, `generates`; one `vcs` node for a revision | A five-field name (language, corpus, root, path, signature); the signature "does not necessarily need to be stable across different versions of the input" | kythe.io/docs/schema, read. Production at Google; strong as a description, no outcome data | Edge vocabulary and the idea of anchors separate from semantic nodes (= occurrence vs entity). Do not adopt identity: it includes the path and promises no stability. `generates` (spec file to generated file) is the right relation if this repo ever generates code; it does not now |
| **SCIP** (Sourcegraph) | Documents with occurrences, each with a symbol string and role bits (definition, reference, import, read/write access, generated, test); relationships `is_reference`, `is_implementation`, `is_type_definition`, `is_definition` | Symbol = scheme, package (manager, name, version), then descriptors with suffixes for namespace `/`, type `#`, term `.`, method `(...).`, type parameter `[ ]`, parameter `( )`, meta `:`, macro `!`; "local" symbols for entities inside one document | `scip.proto` comments, read. The comment says a symbol "should serve as a unique identifier across the package"; no field addresses renames; `display_name` is for display and "the symbol field is not a reliable source of the display name" | Adopt the **descriptor grammar as the textual form of a definition's qualified name** (free; deterministic). Do not adopt it as identity: it contains the module path and the package version, so a move or a version bump changes it |
| **Code property graph** (Joern, open spec cpg.joern.io) | 18 layers (MetaData, FileSystem, Namespace, Method, Type, Ast, CallGraph, Cfg, Dominators, Pdg, Comment, Finding, Shortcuts, TagsAndLocation, Configuration, Binding, Annotation, Base), 45 node types and 20 edge types by the tally of the fetch summary (I did not recount them in the specification); extension by overlays recorded by name in one META_DATA node | Per-graph ids | Spec page, read. Yamaguchi et al. 2014 not re-read here | The layer and overlay idea maps to "which extractor produced which facts" provenance. Data-flow layers (CFG, PDG, REACHING_DEF) answer no CQ here (the earlier lane reached the same conclusion) |
| **CodexGraph** (Liu et al., arXiv 2408.03910) | 6 node types (module, class, function, field, method, global variable) and 5 edge types (contains, inherits, has method, has field, uses); the agent writes Cypher against a Neo4j database | Name plus file path | Paper text extracted, read. "We ... have empirically designed a schema" (section 3.1): no schema ablation | Shows a *small* schema is workable for an agent: with GPT-4o its exact match on CrossCodeEval Lite was 27.90 against 21.20 for BM25, and on SWE-bench Lite its 22.96% resolved equalled AutoCodeRover's 22.96% (Table 1). Its own Table 2: average tokens per task 22.16k against 1.47k for BM25 on CrossCodeEval Lite and 102.25k against 14.76k on SWE-bench Lite, "the length of the query outcomes is not controllable". The small schema did not make the interface cheap |
| **KGCompass** (arXiv 2503.21710) | Graph linking issues and pull requests to files, classes, functions, built from ASTs plus regular expressions over issue and PR text; only artifacts older than the benchmark instance are used | Entity names | Search-result summary only. Reports 45.67% repair and 51.33% function-level localisation on SWE-bench Lite at about 0.20 USD per repair; the abstract and the paper's second version quote different multi-hop statistics | The nearest published example of "documents as entities linked to code", built deterministically. Summary-level evidence, weak |
| **LocAgent, RepoGraph** | LocAgent: directory, file, class, function nodes; contain, import, invoke, inherit edges. RepoGraph: line-level nodes with invoke and contain edges | Path-based | Earlier lane (`research/lane-schema.txt`): RepoGraph 1-hop 29.67% resolved at 2,311 tokens, 2-hop flattened 26.00% at 10,505 tokens (below the 27.33% baseline) | Granularity and radius lessons, already recorded |
| **SEON** (Wuersch, Ghezzi, Hert, Reif, Gall, Computing 94(11), 2012) | A pyramid of ontologies from code structure up to stakeholder activities and artifacts, with linked data | Not examined | Search-result summary only; not opened. (A *different* SEON, the Software Engineering Ontology Network of UFES, exists; do not conflate.) | Conceptually the closest to a meaning layer over code, but it is an OWL ontology for researchers' tools and I could not read it. Not reusable as-is; recorded as an unread lead |
| **CodeOntology** (Atzeni and Atzori, ISWC 2017) | An ontology for object-oriented code plus a Java parser emitting RDF, queried in SPARQL | Not examined | Search-result summary only. Java only | Not applicable (Python and TypeScript; RDF) |
| **Software Heritage data model and SWHID** | Merkle DAG of content, directory, revision, release, snapshot objects; identifiers computed from content (`swh:1:cnt:`, `dir`, `rev`, `rel`, `snp`); content id equals the Git blob id, revision id the Git commit hash; qualifiers (anchor, path, line range) | **Intrinsic**: derived from the object itself | Documentation page was blocked by bot protection; read only through search-result descriptions of the docs and the Di Cosmo et al. article titles. Medium | The model case for *commit and file-content* identity: the git sha and blob hash already are intrinsic ids. It identifies immutable versions, not "the same function across versions", so it does not solve lineage |

**What can be reused, in one sentence:** the code half of v1's schema already matches the published vocabularies (Kythe and SCIP edges, CPG's structural layers), so reuse is of the *symbol-name grammar* (SCIP) and of the *anchor/occurrence separation* (Kythe); nothing published models rules, decisions, claims or their evidence for agents, which is the part v1 lacks.

### 2.5 Entity resolution and stable identity over time

**How version control sees identity.**
- Git stores snapshots and does not record renames; renames are *detected* by content similarity. `git diff -M<n>` / `--find-renames` reports a delete and an add as a rename if more than the threshold of the file is unchanged; the default similarity index is 50%; `-C` adds copies (by default only when the source file was modified in the same commit; `--find-copies-harder` also inspects unmodified files and "is a very expensive operation for large projects"); `-B` breaks complete rewrites into delete plus create; the exhaustive part of rename detection is O(N^2) in the number of sources and destinations and is skipped above `diff.renameLimit` (default 1000) (git-diff documentation, read). `git log --follow` continues history past renames but "works only for a single file"; `git log -L :funcname:file` traces a line range or function within one file from one starting revision (git-log documentation, read). `git patch-id` fingerprints a patch's content with line numbers and whitespace ignored, "reasonably stable, but at the same time also reasonably unique", used to find duplicate commits, which is what identifies a commit across a rebase (git-patch-id documentation, read).
- **Method-level history tools** (read, through HistoryFinder, Islam et al., arXiv 2507.14716, 2025): CodeShovel (Grund et al., ICSE 2021), CodeTracker (Jodavi and Tsantalis, FSE 2022), FinerGit, Historage, IntelliJ's history and `git log -L`. All evaluated on **Java only** (HistoryFinder parses with JavaParser). Commit-level precision/recall/F1 percent, on a 200-method oracle: CodeShovel 93.44/84.17/88.56; CodeTracker 96.40/93.34/94.84; HistoryFinder 96.40/98.34/97.36; IntelliJ 58.82/77.43/66.85; `git log -L` by line range 49.03/76.74/59.84 and by function name 41.33/68.99/51.69. On the older, smaller CodeShovel oracle the numbers are higher (CodeShovel 97.01/95.53) and CodeShovel's authors reported complete histories for 90% of methods. Median runtime per method 3.5 to 7.6 s for the parser-based tools, 0.2 to 0.4 s for git. Failure causes named: moves with body changes, overloads, merge commits, small renamed or moved methods, parser errors on invalid files. HistoryFinder matches first by signature, then by body similarity, 70% within a file and 75% across files. Strength: medium (independent re-evaluations on two oracles; Java; the tools' own authors built the oracles).
- **Python**: PyRef (Atwi et al., MSR 2021) detects 9 to 11 refactoring types in Python; its authors report precision 89.6% and recall 76.1% on three projects; an independent 2025 comparison (ActRef, arXiv 2505.06553) gives it F1 0.64 (summaries only). Weak to medium. I found no method-history tool evaluated for TypeScript or JavaScript.
- **Origin analysis** (Godfrey and Zou, IEEE TSE 31(2), 2005; abstract-level summary): detects merging and splitting of files and functions by reasoning about changed call relationships; case study on PostgreSQL. Gives the *vocabulary* for lineage events (rename, move, merge, split) and the idea of using relationships, not only text, to decide.
- **How common untracked change is** (Hora, Silva, Valente, Robbes, ICSE 2018, abstract read by the v1 audit lane through OpenAlex): 10% to 21% of method-level changes untracked in 15 Java systems; about 25% of entities have split histories. Medium; Java.

**Identity in published code schemas:** Kythe: signature "does not necessarily need to be stable across different versions"; SCIP: no field covers renames; Software Heritage: intrinsic content-derived ids for immutable objects only (section 2.4). In knowledge graphs generally: persistent identifiers and external identity links are the recommended remedies for naming clashes; the weak alternative is heuristics "prone to error in more difficult cases" (Hogan 3.2, read). **No source I read provides an off-the-shelf stable identity for a function across renames in Python or TypeScript.**

**Entity linking / resolution as a model for the document-to-code binding.** Standard decomposition: candidate generation, disambiguation, and a NIL decision (the mention has no referent in the knowledge base; Shen, Wang, Han, IEEE TKDE 27(2), 2015, summary only). v1's document extractor does the first two and, for the NIL case, labels 517 of 1,268 backticked file names "not in repo". The modelling consequence is in section 7.

**Entity resolution in general** (Christophides, Efthymiou, Palpanas, Papadakis, Stefanidis, "An Overview of End-to-End Entity Resolution for Big Data", ACM Computing Surveys 53(6), 2020, arXiv 1905.06397; summary only): the task is finding records that describe the same real-world entity; the standard pipeline is *blocking* (cheaply group candidates so that matching does not compare every pair, which is quadratic), then *matching* (a similarity decision), then clustering. The lineage ladder of section 6.3 is this pipeline with git's file renames as the blocking step. Strength of this survey as evidence for our case: none directly (web-scale, schema-less records); it supplies the vocabulary and the reason blocking exists.

**My measurements on this repository** (section 3) supply what the literature lacks: the actual rates of id breakage by kind.

### 2.6 Quality of a knowledge graph: dimensions, and how each is measured

**Dimensions** (Hogan et al. 2021, section 7, read in full). Quality is fitness for purpose. Accuracy: syntactic (ratio of malformed values to all values of a property), semantic (do the edges match the world; manual check, cross-source check, or process precision against a gold standard) and timeliness (up to date relative to the source; assessed by update frequency and temporal annotations). Coverage: completeness in four senses (schema, property, population, linkability) and representativeness (bias in what is included); "measuring completeness directly is non-trivial as it requires knowledge of a hypothetical ideal knowledge graph"; strategies are a gold standard sample or the recall of the extraction method against complete sources. Coherency: consistency (no logical contradictions; count inconsistencies) and validity (no constraint violations against shapes; "a straightforward measure of validity is to count the number of violations per constraint"). Succinctness: conciseness (no irrelevant schema or data elements), representational conciseness and understandability. Strength: strong as a taxonomy (a widely used survey); it gives dimensions, not thresholds.

**Estimating accuracy by sampling** (Gao, Li, Xu, Sisman, Dong, Yang, "Efficient Knowledge Graph Accuracy Evaluation", PVLDB 12(11), 2019, text extracted, read). KG accuracy is the share of correct triples; manual annotation of a sample gives an estimate with a margin of error (MoE); annotation cost is `entities identified x c1 + triples verified x c2`, so sampling triples *clustered by entity* is cheaper; weighted two-stage and stratified designs reduce cost up to 60% on static graphs and up to 80% on evolving graphs "without loss of evaluation quality". Strength: medium to strong (data sets from real KGs, Amazon authors), at web scale; the sampling theory itself is ordinary survey statistics.
My arithmetic for this graph (not from the paper): the sample size for an accuracy estimate with margin plus or minus e at 95% confidence is about `1.96^2 * p(1-p) / e^2`. With e = 5 points: 385 labels if p is unknown (0.5), 73 if p is about 0.95. v1's precision samples of 20 to 30 edges per kind give an interval of roughly plus or minus 10 to 20 points. A proper accuracy table needs about 73 to 385 labels *per heuristic edge kind*; only the heuristic kinds need it (the parser-exact kinds do not).

**Calibrating the confidence a pipeline attaches to a fact** (Dong et al., "Knowledge Vault", KDD 2014, text extracted, read section 3.3). "The confidence scores from each extractor ... are not necessarily on the same scale, and cannot necessarily be interpreted as probabilities"; they apply Platt scaling (a logistic regression on the scores, fit on a separate validation set), and show that "if we collect all the triples that have a predicted probability of 0.9, then we find that about 90% of them are indeed true" (1.6 billion triples extracted; labels from a local closed-world assumption against Freebase, and human labels as a check). Strength: medium (one production system, web scale). Relevance: v1's `confidence` is exactly such an uncalibrated score (section 3.4).

**Validation against a schema** (Hogan 3.1.2, read): "shapes" target a set of nodes and constrain the number and type of their values; a graph conforms if every node satisfies its shape; violations are listed. PG-Schema extends this to property graphs (abstract only). At our size, shapes can be a script of queries that each return the violating nodes; no schema-language install is needed.

**Applies at this size?** Yes. The graph has about 5,400 nodes and 18,900 edges at the frozen commit, so a full constraint check runs in seconds and an accuracy sample of a few hundred labels per heuristic kind is a day of reading, not a pipeline. At 100x (540,000 nodes) the sample size does not grow (survey sampling depends on the margin, not the population) but constraint checks need indexes.

### 2.7 Modelling documents and their claims against code

**Deterministic linking of documentation to code** (Dagenais and Robillard, "Recovering Traceability Links between an API and its Learning Resources", ICSE 2012, text extracted, read). The technique identifies *code-like terms* in documents and links them to specific code elements, using the surrounding context because "code elements mentioned in documents are rarely fully qualified". Average recall and precision 96% on the learning resources of four open source systems (Java; the authors' own evaluation; they treat 90% as necessary for usefulness). Medium. It is the same problem v1's docs extractor solves with a name dictionary: 1,195 mention sites of which 122 fan out to 2 to 5 candidates (v1 audit lane); strict precision 27 of 30 on a sample (v1 build notes).
**Detecting a documentation statement that no longer matches code** (Zhong and Su, DocRef, OOPSLA 2013; summary only): finds mismatches between code names in natural-language documentation and the code; more than 1,000 new documentation errors on five libraries; a third-party summary puts false alarms near 40%, which I could not verify. Weak. For prose claims beyond names, CoCC (outdated code comments from commits, over 90% precision) and DocPrism (plain LLM use gives "unacceptably high" false positives) were summaries in the temporal lane; not re-read.
**Model-read meaning bound to code** (earlier lanes, not re-read): graphify-bench (independent author, 940 runs, one synthetic corpus): doc-and-code questions with Sonnet 5 80% against 70%, cost lower by 0.084 USD (interval -0.180 to -0.005); planted contradiction hunt 4 of 4 against 2 of 4 (medium); Haiku 4.5 on the same tasks 75% against 80%. The ETH AGENTS.md study (arXiv 2602.11988): model-written repository context files changed resolution by -0.5% and -2% and raised cost about 20% to 23% (medium to strong). Together: evidence that a meaning layer *can* pay on document-and-code questions with a strong model, and that unfiltered model-written context costs.

**Provenance and evidence as a model.**
- PROV-O (W3C Recommendation, read): three core classes, Entity, Activity, Agent; core relations `wasGeneratedBy`, `used`, `wasDerivedFrom`, `wasAttributedTo`, `wasInformedBy`, `wasInvalidatedBy` (with `invalidatedAtTime` bounding an entity's lifetime), `specializationOf`. Its *qualified relation pattern* is the n-ary node: keep the plain `wasDerivedFrom` link and add a `qualifiedDerivation` node recording the activity, usage and generation involved; "consumers should treat the qualified form as implying the unqualified form". Strength: strong as a standard; no outcome data.
- Wikidata statements (Help:Ranking and Help:Sources, read): a statement has qualifiers, references (the value of a reference *is* the source: "stated in" a Wikidata item, or a reference URL plus a retrieved date) and a **rank**: preferred (best consensus), normal, deprecated ("known to include errors", kept rather than deleted "to prevent users from re-adding" wrong values and to preserve how knowledge changed). References show where a value comes from; ranks say which value is most correct. Strength: medium (production practice at scale; no controlled evaluation).
- Architecture Decision Records (Nygard 2011, read): short documents with title, context (value-neutral facts), decision ("We will ..."), status (proposed, accepted, deprecated, superseded by a later record), and consequences (all, "not just the positive ones"); numbered sequentially and "numbers will not be reused"; a reversed decision stays in place marked superseded. Practitioner source; weak as evidence, but it is the exact id and supersession discipline the program documents here already follow.
- Provenance semirings (Green, Karvounarakis, Tannen, PODS 2007; summary only): annotations propagate through queries by two operations (alternative use and joint use) in a commutative semiring; why-provenance (the sets of source facts that suffice), bag semantics and probabilities are instances. Gives a formal basis for "the footprint of a conclusion is a set of sets of facts" and for combining confidences along a path (multiplication) and across alternative paths. Strong as theory; at this size a footprint is a plain set of fact ids and I do not recommend adopting the machinery.

### 2.8 Confidence and evidence on edges

Synthesis of 2.6 to 2.7: an edge needs four separate things, and v1 has one number for all of them.
1. *Where it came from*: extractor name and version, method class (exact syntax, type-resolved, name-resolved, heuristic, model-read), producer (PROV `wasGeneratedBy`/`wasAttributedTo`).
2. *Evidence*: file and line span with the span's content hash at extraction time (so "does the cited text still say that" is a hash comparison, CQ14).
3. *Resolution status*: resolved; ambiguous with the candidate set; not in repository (NIL); unresolved.
4. *A calibrated probability of correctness per method class* (Knowledge Vault: Platt scaling on a validation sample), kept separate from *strength*, the weight a ranking should use (support of a co-change pair, call count).
Wikidata's reference-plus-rank split is the same separation: references say where, rank says which to trust.

---

## 3. What I measured on this repository

All from the finished test's cache of per-commit facts (191 snapshots; `build/facts/cache/<sha>/{nodes,edges,commits}.jsonl`), the frozen commit `a31924a`, and `git`, read-only. Scripts and outputs are in the scratchpad `lm/` folder. Strength: strong for the counts (full enumeration, no sampling) on this one repository; the snapshots are the *parents of the held-out and tuning task commits*, so they are sparse samples of history (110 of them have their first parent also in the cache).

### 3.1 How stable are v1's identifiers? (idchurn.py, idcum.py)

v1's identifiers, from `nodes.jsonl`: definitions `sym:<path>#<qualified name>`; files `file:<path>`; documents' sections `sec:<path>#L<first line>` (so the id contains a line number); invariants `inv:CLAUDE.md#<ordinal>`; document ids `docid:<path>#<id>`; client URL sites `urlsite:<path>:<line>:<METHOD path>`; routes `route:<runtime> <METHOD> <path template>`; tables and columns `column:<table>.<column>`.

**Per transition** (110 pairs where a commit and its single parent are both cached; counts summed over pairs; "reappears" = the same natural key, defined below, exists in the child under a new id):

| Kind | Entities in parent snapshots (summed) | Ids removed | of which reappear under same natural key | Ids kept but the entity differs |
|---|---|---|---|---|
| function | 82,132 | 102 (0.12%) | 76, all in a different file (moves) | 52 kept ids with a changed signature |
| method | 19,881 | 6 | 3 same file | 19 signature changed |
| class | 16,418 | 1 | 0 | 0 |
| component (UI) | 11,662 | 49 | 45 other file | 12 signature changed |
| test | 62,362 | 4 | 0 | 2 signature changed |
| constant | 21,871 | 34 | 0 | - |
| column | 29,275 | 0 | - | - |
| route | 5,875 | 1 | 0 | - |
| file | 38,571 | 48 | 0 (git renames not followed) | - |
| **doc section** | 29,643 | **335 (1.13%)** | **260 same file, same heading, new id (line shift)** | **13 kept id, different heading** |
| **client URL site** | 9,450 | **184 (1.95%)** | **184 same file** | 0 |
| **invariant** | 553 | 0 | - | **11 kept id, different rule title (2.0%)** |
| doc id | 7,277 | 21 | 0 | - |

Natural keys used for "reappears": definitions (kind, name, signature); sections (path, heading text); invariants (title); URL sites (path, method and path text).

**Cumulative against the frozen commit** (the share of entities in an older snapshot whose id still exists at the frozen commit; "mis-bound" = the id still exists but the natural key differs):

| Snapshot age before frozen | function | method | class | test | doc section | client URL site | invariant | file |
|---|---|---|---|---|---|---|---|---|
| 16 days | 99.0% | 100% | 100% | 99.8% | **76.0%** | **54.0%** | 100% (5 of 6 mis-bound) | 99.8% |
| 23 days | 98.6% | 100% | 100% | 99.7% | **74.4%** | **48.0%** | 100% (5 of 6 mis-bound) | 99.8% |
| 34 days | 97.6% | 100% | 100% | 99.8% | 69.8% | 33.3% | - | 99.6% |
| 55 days | 90.3% | 100% | 100% | 96.1% | **28.5%** | 23.9% | - | 94.7% |
| 57 days | 88.1% | 100% | 100% | 97.5% | 53.9% | 21.6% | - | 93.5% |

At 55 to 57 days, 460 of 504 definitions (function, method, class, component) at the 57-day snapshot still have their id; of the 44 lost, 9 (20%) have a definition of the same name elsewhere, 20 (45%) were in files that no longer exist and whose names are gone, and 15 (34%) were in a surviving file with the name gone (a rename or a deletion; the name key cannot tell which). At the 55-day snapshot, 674 of 727 survive; of 53 lost, 15 have the name elsewhere, 20 sit in vanished files with the name gone, 18 are in surviving files with the name gone. 

Body-similarity check (idbody2.py): for each lost definition, its normalised body at the old snapshot is compared (Python `difflib` ratio) with every definition of the same kind at the frozen commit; the best match is classified.

| Snapshot (age before frozen) | Lost definitions | Best body match 0.8 or more (same entity) | of those, different name | 0.5 to 0.8 (cannot call) | Below 0.5 (deleted or rewritten) | Body too small or unreadable |
|---|---|---|---|---|---|---|
| cd806c80 (57 days) | 44 | 4 | 1 | 22 | 17 | 1 |
| 08e829be (55 days) | 53 | 9 | 4 | 24 | 18 | 2 |
| 8f0da52c (64 days, spans the June restructuring) | 127 | 70 | 2 | 30 | 22 | 5 |

Reading: (a) almost all confident matches are cross-file moves with the same name (0, 1 and 0 matches were in the same file); pure renames with a different name and a body of 0.8 or more are rare (1, 4 and 2). (b) The name key proposed 9 and 15 candidates at 57 and 55 days; the body check confirms 4 and 9, so a name-only key would have re-bound 5 and 6 definitions to something whose body differs by more than 20% (either a rewrite or a different function that shares the name; I did not inspect them). (c) Between 41% and 89% of the lost definitions have no confident successor (39 of 44, 42 of 53 and 52 of 127 are below 0.8): they are deleted or rewritten beyond recognition, and no matcher can recover that. (d) At 64 days the restructuring moved many UI components and the matcher recovers 55% (70 of 127). I used one threshold, one similarity function and no blocking; I did not tune them or count false merges.

What this means for the model:
- For definitions the id string is a *reasonable* key over weeks (97.6% to 99% over 16 to 34 days). Per transition, three quarters of the removed function ids are moves with the same name and signature; over 55 to 57 days only about a fifth of the lost definitions have a confident successor elsewhere, and the rest are names that no longer exist (deleted, rewritten, or renamed beyond a 0.8 body match). A name key alone would mis-bind some; a body check is what separates a move from a namesake. Lineage is therefore worth recording for the moves and the restructurings (one large restructuring accounts for 55% recovery at 64 days), but it cannot make deleted entities reachable, so every anchor needs an *orphaned* status as well.
- For document sections and URL sites the id is a **bad** key: a quarter of section ids and half of URL-site ids are gone within three weeks, solely because the id contains a line number, and up to about 1 in 25 of the surviving section ids (at 55 to 57 days; under 1% at 16 to 34 days) and 5 or 6 of the 6 invariant ids point at a different entity. (The section column is not monotone in age, 28.5% at 55 days and 53.9% at 57 days, because documents were reorganised between those snapshots; the snapshots are sparse parents of task commits, not a regular sample.) A cached conclusion keyed on those ids would, within weeks, be silently attached to the wrong text. This is a failure of the *kind* the audit lane warned of ("a rename invalidates rather than migrates") but worse: mis-binding does not invalidate, it lies.
- File renames: the audit lane measured 45 git-detected renames in 233 non-merge commits (41 of code files) and that following them adds 1.7% to co-change pair occurrences at the frozen commit (v1 audit 2.4). My per-transition table shows 48 file ids vanishing; a path-keyed id cannot follow a rename and the only natural key for a file is its path, so this measurement cannot separate renames from deletions (git's rename detection can).

### 3.2 What the commit expansion does (hyper.py)

From `commits.jsonl` of the frozen commit: 233 commits listed, 177 usable by the co-change stage (2 to 30 files each; larger ones are dropped, which is ROSE's 30-entity rule). Among the 177: median 7 files, mean 8.1, maximum 30. 150 of 177 (85%) touch more than two files.

| Files per commit | Commits | Share of commits | Pairwise co-change pair incidences (k(k-1)/2 each) | Share of pair incidences |
|---|---|---|---|---|
| 2 to 3 | 52 | 29% | 102 | 1% |
| 4 to 7 | 50 | 28% | 644 | 8% |
| 8 to 15 | 53 | 30% | 3,030 | 36% |
| 16 to 30 | 22 | 12% | 4,635 | 55% |

Of v1's 1,896 `co_changed` edges, 930 (49%) are supported only by commits of 10 or more files, and 710 have support of 3 or more. v1's `confidence` for co-change is support divided by the number of commits touching the source file (ROSE's confidence); it does not account for commit size, and the `recency_weight` is separate. So the sweeping commits dominate the pair counts; the confidence is not computed to be sensitive to it.

### 3.3 What a rule looks like in v1

20 `invariant` nodes (19 CLAUDE.md bullets in 8 groups plus one), 90 `constrains` edges. An invariant node carries a title (66 tokens for the first), a line span and its group; a `constrains` edge carries `token` (the backticked text) and `how` (`name:resolved`, `file:ambiguous`, ...). Where the token is ambiguous, one invariant fans out: `inv:CLAUDE.md#3 -> attendance/service.py` at confidence 0.0909 is one of 11 candidates for the token `service.py`. There is no rationale, no role (guard, client half, example, exception), no link to the defect or incident that justified the rule, and no supersession. The CQ4 question "which rule constrains this code, and why" can be answered with the *what* and the line number; the *why* is a re-read.

### 3.4 What `confidence` means in v1

Frozen commit value sets: `calls` 1 (4,176 edges), 0.9 (599), 0.95 (111); `cites` 1, 0.5, 0.8; `mentions` 0.9, 1, 0.5, 0.6, 0.25, 0.33; `constrains` 1 (44), 0.5, and 1/k values 0.09 to 0.12 for 38 edges chosen by ambiguous file; `co_changed` 1, 0.67, 0.5, 0.4, 0.33, 0.12. Three different quantities share one field: (a) a fixed heuristic score per resolution method (0.9, 0.95, 0.8); (b) an ambiguity share 1/k when k candidates tie; (c) a support ratio for history edges. None is a probability of being correct; none was calibrated. The v1 audit lane found the ranking uses it as strength ("the extractor's confidence ... used as if it were strength of relevance").

---

## 4. The method, applied: deriving and validating schema v2

### 4.1 Step 1 and 2: the competency questions, typed, stratified, formalised

The 16 CQs come from `use-cases.md` section 5 and are not re-derived. I classify them by the Keet and Khan type and by stratification level, and write each as a metapath over the schema of section 4.2. (Level 0 = an index lookup; level 1 = one relation; level 2 = a composition of lower questions. Costs are the product-work carried-token shares from the use-case lane.)

| CQ | Question (short) | Type | Level and depends on | Metapath on the v2 schema | Answer shape | Share of product carried tokens |
|---|---|---|---|---|---|---|
| CQ1 | What did an earlier agent or review conclude about X, and does it still hold? | validating | 2: needs CQ5 (find X), then evidence hashes | Entity <-about- Claim -rests_on-> Evidence; status computed | claim text, source, status, the evidence that changed | 0.4% (product) |
| CQ2 | What does the plan or design say about my assignment (phase, findings, decisions)? | validating | 2: CQ9 then relations among items | Phase -covers-> Item(finding) -defined_in-> Section; Decision -supersedes-> Decision; Item -anchored_at-> Definition | item ids, decisions, section spans | 8.4% |
| CQ3 | How does subsystem S work now? | validating, composite | 2: CQ13, CQ15, CQ4, CQ8 over a slice | Slice -contains-> Definition; Definition <-registers- EntryPoint; EntryPoint -> Route/Table/Setting/OutboxKind; Rule -constrains-> | a card plus spans | 20.7% (largest) |
| CQ4 | Which rule constrains the code I am changing, and why? | validating | 1 | Entity <-constrains[role]- Rule -justified_by-> Item/ChangeSet | rule statement, role, rationale, source span | 8.7% |
| CQ5 | Where is X defined, with what signature? | validating | 0 (index) | name -> Entity.alias | span | 15.6% |
| CQ6 | What does this change set change, and what outside it depends on that? | validating | 2: CQ10 + CQ8 + CQ13 over changed entities | ChangeSet -touches-> Definition <-calls\*/imports/calls_url- ... | changed entities with outside users | 7.3% |
| CQ7 | Which tests and fixtures exercise X? | validating | 1 | Definition <-exercises- Test; Route <-requests- Test; Test -overrides-> Provider | tests with kind unit / router-with-fakes / integration | 4.7% |
| CQ8 | Who uses X, including by string literal; what breaks if it changes? | validating | 1 to 2, hop budget per relation | Definition <-calls/references/renders/depends_injects- Definition; Key <-reads- Definition | ranked, grouped users | 4.2% |
| CQ9 | Where is item ID X defined and cited? | validating | 0 to 1 | Item -defined_in-> Section <-cites- Section | spans | 0.3% (product) |
| CQ10 | What changed here recently and why? | validating | 1 | Entity <-touches- ChangeSet (message, PR, ruling) | dated list with reasons | 1.8% |
| CQ11 | Which file is X? | validating | 0 (index) | file tree | path | 1.9% |
| CQ12 | What sections does document X have? | validating | 0 (index) | outline | headings | 0.3% |
| CQ13 | Where is the other half of a contract? | validating | 1 | ClientSite -calls-> Route <-handled_by- Definition; OutboxKind -enqueued_by/handled_by-> Definition; Setting/Key readers | the paired location | 1.0% |
| CQ14 | Does this cited line still say what the document claims? | validating | 1 | Section -cites[span, hash]-> Span; compare hash now | holds / changed / gone | 0.1% |
| CQ15 | What table, migration or setting is behind X? | validating | 1 | Definition -reads/writes[op,via]-> Table/Column; Migration -touches-> Table; Definition -reads_setting-> Setting | names with operation | 0.9% |
| CQ16 | What do the build, CI, ops scripts do and invoke? | validating, mostly reading | 1 | Job -runs-> Script -invokes-> Command | locate | 7.3% |

Observations: all 16 are *validating* questions in Keet's sense (they must be answerable); there is no scoping-only question, because they were measured from real lookups, not brainstormed. Only five (CQ5, CQ9, CQ11, CQ12, CQ16's reading part) are level 0; the rest are relations or compositions, so the list does satisfy Uschold and Gruninger's stratification requirement, unlike the test of "co-change recall". The four largest product costs are CQ3 (20.7% of product carried tokens), CQ5 (15.6%), CQ4 (8.7%) and CQ2 (8.4%); the finished test scored none of them (it scored CQ10, 1.8%), and CQ3, CQ4 and CQ2 are the three whose models v1 lacks or only partly has. **Each question must also carry a gold answer in the tuning set**; section 4.4.

### 4.2 Step 3: the schema as the union of what the questions use, and the two checks

**Schema v2 (network schema).** Node types by layer; relation types with the properties they must carry. This is a *proposal to be pruned by the forward check and the tuning test*, not a finished design.

| Layer | Node type (identity key, section 6) | Occurrence properties | Needed by |
|---|---|---|---|
| Structure | Runtime, Slice (= capability folder per runtime), File | path, content hash, tokens | CQ3, CQ11 |
| Structure | Definition (function, method, class, component, constant, test, fixture) | file, line span, signature, body hash | CQ5, CQ7, CQ8 |
| Contract keys | Route (method + path template), OutboxKind (name), Setting (key), Table, Column, Key (string literal that couples two places: a message text matched by a regular expression, a storage key, an event name) | declaration site | CQ8, CQ13, CQ15 |
| Entry points | Screen, ScheduledJob, BackgroundTask (kinds of EntryPoint) | registration site | CQ3, CQ16 |
| Occurrence | ClientSite (a call site that builds a URL) | file, line, method, path text | CQ13 |
| History | ChangeSet (commit or pull request: sha, date, message, PR, author, size) | - | CQ6, CQ10 |
| Documents | Document (family, version, supersedes), Section (heading path; span; content hash), Item (id defined in a document: finding, ruling, card, phase, limitation) | - | CQ2, CQ9, CQ12 |
| Meaning | Rule, Decision, Claim, Evidence, Source (section 7) | - | CQ1, CQ2, CQ4, CQ14 |

| Relation | From to | Properties it must carry | Needed by |
|---|---|---|---|
| calls, references (imports, renders, uses_constant, passes_callable, inherits, depends_injects, navigates) | Definition to Definition/Key | how (method class), evidence span, status | CQ8 |
| handled_by, registers, enqueued_by | Route/EntryPoint/OutboxKind to Definition | span | CQ3, CQ13 |
| calls (url) | ClientSite to Route | match status | CQ13 |
| reads, writes | Definition to Table/Column/Setting/Key | op (insert, update, delete, select), via (orm, sql, unit-of-work), columns | CQ15 |
| exercises, requests, overrides | Test to Definition/Route/Provider | override list as a property of the test-route relation | CQ7 |
| touches | ChangeSet to File/Definition | role (added, modified, deleted), hunk spans; edge weight uses set size | CQ6, CQ10 |
| defines, cites | Section to Item / Section to Span | for cites: the span and its content hash at citing time; resolution status | CQ9, CQ14 |
| constrains | Rule to Entity | role (guard, client half, condition input, example, violation), resolution status | CQ4 |
| justified_by, supersedes, depends_on | Rule/Decision to Item/ChangeSet/Rule | date | CQ2, CQ4 |
| about, rests_on, refutes, supports | Claim to Entity/Evidence/Claim | span hash on rests_on | CQ1 |
| derived_from, generated_by | any derived object to Source | extractor, version, model and prompt hash if a model produced it | provenance |
| lineage (renamed_from, moved_from, split_from, merged_into) | Entity to Entity | method, score | identity, section 6 |

**Forward check (every kind serves a CQ), run against v1's 36 edge kinds at the frozen commit** (counted from its `edges.jsonl`; the task description says 37, probably counting an experimental kind): all map to at least one CQ, so nothing is dropped by this check alone. The 254 `contract` edges (import-linter allowed and forbidden imports) are rule-like and belong in the Rule layer with their own statement and anchors (CQ4), not in the structure layer. The weakest justified, which the pruning ablation (R1) should test first: `same_capability` (24 edges; a slice membership that is a property of the Definition and the Slice node), `migration_follows` (45; serves only "what is the migration order", which no CQ asks), `registers_screen` and `navigates` (60; needed only if CQ3 and CQ8 on mobile screens are answered), `mocks` (93; a duplicate of `overrides` in purpose), `contains` (1,185) and `defines` (3,548) (structural; better as properties and an index than as edges if no CQ traverses them), and `co_changed` (1,896 pairwise edges, replaced by `touches` on a ChangeSet node in section 5).

**Backward check (every CQ has a path), run against v1's node and edge kinds:**
- v1 can answer by type: CQ3 (partly, no card), CQ5, CQ7, CQ8, CQ11, CQ12 (`doc_section` nodes), CQ13, CQ15, CQ16 (`scheduled_job`, `runs`).
- v1 has only a **partial** path for CQ4 (an invariant has `constrains` edges but no role, rationale or `justified_by`) and CQ9 (`doc_id` nodes and `mentions` edges exist; no `defined_in` / `cited_in` distinction between a definition and a citation).
- v1 has **no path** for five CQs. CQ1 (no claim or evidence type), CQ2 (no phase, finding as an entity with covers relations, no decision type), CQ6 (no change-set node; commits live only inside the `commits` attribute list of a `co_changed` edge, and there is no commit message, so no reason), CQ10 (same cause), and CQ14 (`cites` edges do not store the cited span's hash).
- Conclusion: **the CQ method confirms the code half and flags exactly the layers the earlier rounds left out**: change sets with reasons, items and decisions, rules with roles and justifications, claims with evidence, and spans with hashes. No node type is needed for CQ5, CQ11 and CQ12; they are indexes, as the use-case lane concluded.

### 4.3 Step 4: choosing node, edge, edge property or hyperedge

See section 5.1.

### 4.4 Step 5: validation, four layers, no installation

1. **Static**: the schema as a data file (types, relation types, from-to, required properties, cardinalities); a script reports unused kinds (forward) and CQs without a path (backward). Seconds.
2. **Gold answers**: for each CQ at least five hand-checked instances in the *tuning* set, with the spans a competent reader would need (the use-case lane's R1 builds instances from transcripts; the finished test's 20 tuning TQ questions already cover CQ7, CQ8, CQ13, CQ15 and part of CQ4). Score: answer exactness and tokens. Rule from Uschold and Gruninger: a schema change is accepted if every CQ still has its gold answer retrievable and no other measure worsens.
3. **Accuracy by sample**: per heuristic relation type, label 73 to 385 randomly chosen instances (section 2.6), clustered by entity to cut cost, and report a Wilson interval per type. Parser-exact kinds get a smaller audit.
4. **Constraint violations counted per rule** (Hogan 7.3.2): a script of queries each returning violators: every Route has at least one handler, every ClientSite resolves or is flagged, no two live entities share a key, every Rule has at least one anchor or is flagged unanchored, every lineage chain is acyclic and every entity has at most one live successor, every Claim has evidence.

### 4.5 What this method cannot show

- It gives no objective answer to "is this schema good": Noy and McGuinness say there is "no one correct way", and Uschold and Gruninger say a set of questions does not determine a design. The tie-breaker is tokens, which only an agent run measures. A schema derived and validated this way can still lose to a flat index on tokens.
- Completeness against the *real* distribution of questions is only as good as the 16 CQs; they were measured from one day of product sessions (109 transcripts) and weeks of program sessions, so a question type that has not occurred yet is absent.

---

## 5. Where a hyperedge or n-ary node is the right model

### 5.1 The decision rule

From the W3C n-ary note (four use cases), Hogan 3.3 and the PROV-O qualification pattern. Model a concept as:
- **a property** of a node when it is single-valued, has no relations of its own and is not queried as an entity (line span, signature, `is_test`);
- **an edge with properties** when it is a binary relation and its context belongs to that one relation (a call with its line; a write with `op` and `via`; a citation with a span and a hash);
- **a node (reified relation, "qualified" in PROV-O terms)** when at least one holds: (a) three or more participants and no primary one; (b) other facts must refer to it (a claim about it, a supersession, a status); (c) it has its own lifecycle (created, superseded, invalid); (d) its context is shared by many edges (the "named graph" role); (e) the participants are ordered;
- **a hyperedge (a set that is the fact)** when the fact *is* membership of a set: a change set, a rule's anchor set, a claim's dependency set. In a property graph a hyperedge is a node plus one edge per member (the reified form); the members' roles go on those edges.

### 5.2 Where it applies in this repository, and what a pairwise edge loses

| Fact | Participants | Right model | What the pairwise form loses | Evidence here |
|---|---|---|---|---|
| **Commit or PR change set** | k files and the entities in them, message, PR, date | ChangeSet node, `touches` edges with a role (added, modified, deleted) and hunk spans. Walk weight `w/|e|`, or ROSE-style rules between entity *sets* | Which pairs were two of thirty; the commit's reason (message) and PR; the order and time of the set. k(k-1)/2 edges per commit instead of k | 85% of used commits touch more than 2 files; commits of 16 to 30 files are 12% of commits and 55% of pair incidences; 49% of co-change edges rest only on commits of 10 or more files (section 3.2). ROSE's own mitigation is a size cap; Zhou's walk is the principled weight |
| **Rule with several anchors** | statement, conditions, exemptions, anchors in different roles (server guard, client half, dependent rule), rationale | Rule node; `constrains` edges with a role property; `justified_by` edges; `depends_on` between rules | The roles. v1's `constrains` edge says "this invariant mentions this symbol"; "the other half of this rule" (CQ13/CQ4, 2 to 3 hops in the schema lane) has no way to tell the guard from the example | The bill-freeze group spans server and client at group level; two bullets span runtimes by direct anchors (schema lane); v1 edges carry only `token` and `how` |
| **Claim with its dependency set** | statement, and the set of spans, hashes and negative facts ("no other caller") it rests on | Claim node; `rests_on` edges, each with the hash of what it rests on; a negative dependency as an edge to a *query pattern* node | The set as a unit: a pairwise `rests_on` is fine as long as all members are present; the point of the node is that the Claim has a status and a producer | Replay of cached answers (K0): 0 stale answers on 29,097 lookups with fact-level dependencies against 6.5% stale with file-level (v1 audit). Provenance semirings: the footprint is a set of sets (why-provenance) |
| **Test whose reach depends on a replaced dependency** | test, route, provider, replacement | `requests` edge from Test to Route with an `overrides` list property (a TestScenario node only if scenarios are queried) | The condition under which "test reaches service" is true. Composing separate test-route and test-override edges gives wrong reach paths | 3 router tests appeared to reach `submit_completion` but override the service with a mock (13 integration tests reach it only over HTTP) (schema lane); 57 override sites exist |
| **Route** | method, path, handler, request and response schema, auth dependency, callers, tests | Route key node (identity = runtime + method + path template) with binary edges to each participant | Nothing: the route node *is* the reified n-ary relation; this is the right model and v1 has it | 75 of 75 production client URL sites match a route (schema lane) |
| **Outbox kind** | enqueue sites, kind, handler switch case, API method, route | Key node (the kind name) with binary edges | Nothing; v1's kind nodes already fix the string-dispatch hub (6 false routes of 14 by call edges) | schema lane measurement |
| **Write statement** | function, table, op, columns, mechanism | Edge `writes` with properties `op`, `via`, `columns` | Nothing a CQ asks | 252 writes_table edges |
| **Citation** | section, code span, hash at citing | Edge with properties | Nothing | CQ14 |

**Where n-ary buys nothing** (report against enthusiasm): calls, imports, defines, contains, renders, depends_injects, reads, writes, route registration, URL-to-route: binary edges with properties answer CQ7, CQ8, CQ13 and CQ15 and are what every published code schema uses (section 2.4). The n-ary evidence in the literature (Freebase 61% non-binary, Wikidata 17.4% qualified) is about general knowledge bases and is on link-prediction accuracy, not on retrieval cost; **no source I read measures a hyperedge model against a pairwise one for coding-agent retrieval**. The one place the pairwise form has a *measured* distortion on this repository is the change set (section 3.2).

### 5.3 What to expect and how to test it

The change-set model changes one thing the retrieval can use: the weight of a co-change relation. Expected effect: small to moderate on co-change recall (CQ10 is 1.8% of product carried tokens, so the direct token effect is small); the test is cheap because it needs no agent and no new extraction (R3). It would show the hyperedge is no better if the three weightings give the same recall at the same answer size on the tuning commits, stratified by commit size. At 10x the history (2,000 commits) the pair blow-up per commit is unchanged (a 30-file commit is 435 pairs); at 100x the clique list becomes millions of edges and the set form is the only one that scales; at this size the benefit is weighting and meaning, not space.

---

## 6. Identity over time

### 6.1 The model

Three levels, because they change at different speeds and answer different questions.
1. **Entity key**: what a claim, rule, citation or cached conclusion is *about*. Must be stable across edits, moves and renames as far as the evidence allows.
2. **Occurrence**: where the entity sits at a commit (file, line span, content hash, signature). Changes every commit; this is what v1 currently uses as the id for sections and URL sites.
3. **Lineage**: events that continue or end an identity between commits: `created`, `renamed`, `moved`, `split`, `merged`, `deleted`, each as an edge between entity versions with the method that decided it and a score. A lineage edge below a threshold is a `candidate_of` edge, never a silent merge.

Why three: SCIP and Kythe keep identity and occurrence apart but both put the path into identity and do not model lineage; Software Heritage's identifiers are intrinsic (content hashes) and so identify one version only; the method-history tools produce lineage but only for Java and only per method.

### 6.2 Keys by kind

| Kind | Key | Why | Breaks when |
|---|---|---|---|
| Route | runtime, METHOD, normalised path template | It is the contract; survives handler renames and file moves | the API path changes (a real contract change, which should be a visible event) |
| Table, Column | table.column as in the database | Names the contract with the database; migrations are immutable revisions (`alembic` revision id) | rename migration: lineage from the migration's own rename operation, exact |
| Setting, environment variable, outbox kind, string Key | the literal | The literal is the coupling between runtimes | the literal changes (visible event) |
| Commit | sha (intrinsic; the Software Heritage and git model); PR number and `git patch-id` as lineage across rebases | content-derived | history rewritten: patch-id links the old and new sha |
| File | git rename detection per commit, `-M` (default 50% similarity; configurable) giving file lineage | the git documentation; measured 45 renames in this history | similarity below threshold; the rename limit (1000 files) |
| Definition (function, class, method, component, test) | an opaque id minted at first sight, with an alias table of every (qualified name in SCIP descriptor form, path) it has had | the name changes under a rename and the path under a move, so neither can be the key | a wrong lineage decision |
| Document item (finding, ruling, card, phase) | (document family, id) as written, never reused; v1's schema lane already found 85 ids defined in more than one document, so the family is part of the key | ADR discipline: numbered, never reused, superseded not edited | the author reuses an id |
| Section | the explicit id if the heading has one, else the heading path (document, heading, heading, ...) with the content hash as the occurrence property; **never a line number** | measured: line-number keys lose a quarter of sections in three weeks | a heading is reworded (lineage by hash and by neighbours) |
| Rule | an explicit stable id written in the source (an owner decision: add ids to the invariants file), else a minted id from the group and first-seen normalised statement with lineage by text similarity | invariants have no ids in CLAUDE.md; ordinals break on insertion (measured) | the statement is rewritten (lineage, status suspect) |
| Claim | hash of (source span normalised text, claim statement); a re-extraction that finds the same text finds the same id | graphify's id churn on re-extraction (0 to 12% id retention, user report in `widen/architecture.md`, weak) is the failure to avoid | the source text changes (the claim becomes suspect, by design) |

### 6.3 The matching ladder (for definitions between a parent commit and a child)

1. `git diff -M` between the two commits gives the file mapping (documented heuristic; default 50% similarity).
2. In the mapped file, an exact qualified-name match continues the identity (this is what v1's id string already does within a file).
3. An exact (kind, name, signature) match in a different file is a `moved` lineage edge. Per transition this recovers 76 of the 102 removed function ids, and 45 of 49 removed UI component ids.
4. Otherwise compare normalised bodies within the mapped file and then across files; HistoryFinder uses 70% within a file and 75% across files (its own tuning, Java). A match at or above the threshold is a `renamed` or `moved` lineage edge with the score. Measured with one cheap matcher (3.1): of 44 and 53 lost definitions at 57 and 55 days, 4 and 9 match at 0.8 or more (1 and 4 under a different name); at 64 days across the restructuring, 70 of 127. The 0.5 to 0.8 band holds 22 to 30 definitions that no threshold decides.
5. Anything else is `created` or `deleted`. A body match below the threshold but above 50% is a `candidate_of` edge: the anchored claim becomes *suspect*, never silently re-pointed.
Everything here is deterministic given the repository and the matcher version, so the lineage map can be a per-commit cached artefact like the v1 facts cache (key: commit, matcher version).

### 6.4 Tests on tuning data (no agent, no model)

- **Orphan rate**: take the cached snapshots as pseudo-claims (one anchor per entity, recorded at snapshot S); at the frozen commit count anchors that (a) still resolve by id string (v1: measured in 3.1), (b) resolve by natural key, (c) resolve by the ladder, (d) resolve to a *different* entity (mis-bound). The ladder is justified if (c) minus (b) is material and (d) is zero; skip the body-similarity step if under 1% of anchors are orphaned by it (the v1 audit lane set the same 1% rule for its own R6).
- **Rule and section keys**: re-run the cumulative table with section keys by heading path and invariant keys by minted id: the mis-bound share must be zero by construction, and the orphan share is the number to report.
- Scale: the body comparison is quadratic in definitions (1,800 here, so about 3 million comparisons if unblocked; the measurement in 3.1 took minutes in plain Python with cheap pre-filters); at 10x use a blocking step (same kind and similar size and shared name tokens) before the similarity score; at 100x it needs an index. Nothing here is a problem at this size.

---

## 7. The meaning layer as a model (independent of how it is extracted)

### 7.1 Entities and relations

| Entity | What it is | Key properties | Status values |
|---|---|---|---|
| **Document** | a file of prose (the invariants file, a handoff, a plan, a design note, a runbook) | family, path, version, supersedes | live, superseded |
| **Section** (occurrence) | a heading's text in a document at a commit | heading path, line span, content hash | - |
| **Item** | a thing a document gives an id to: a finding (A1), a ruling (R12), a card, a phase, a limitation | (family, id), title, defined_in | open, closed, superseded |
| **Rule** | a normative statement that constrains code or behaviour | statement, kind (invariant, trap, known defect, do-not-assume), rationale, severity, source span | valid, suspect, unanchored, superseded |
| **Decision** | a ruling: what was decided, by whom, when, and why | context, decision, consequences, date, decided_by | accepted, superseded (ADR form) |
| **Claim** | a statement about the code or the world produced by an agent or reader (a finding, a conclusion, an impact analysis) | statement, producer, strength | valid, suspect, refuted, superseded |
| **Evidence** | a typed span the above rest on: a code span, a document span, a commit, a run output | location, content hash at recording | current, changed, gone |
| **Source** | provenance: a person, a parser, or an agent with model and prompt hash | kind, version | - |

Relations: `Section -defines-> Item`; `Section -cites[span, hash_at_cite, status]-> Span|Section|Item`; `Rule -constrains[role, status]-> Entity`; `Rule -justified_by-> Item|ChangeSet|Evidence`; `Rule -depends_on-> Rule`; `Decision -supersedes-> Decision`; `Rule -supersedes-> Rule`; `Claim -about-> Entity`; `Claim -rests_on[hash]-> Evidence`; `Claim -refutes|supports-> Claim`; and PROV-style `derived_from` and `generated_by` from every object to its Source. A **refuted claim is kept with a deprecated rank**, not deleted (Wikidata: keeps known-wrong values from being re-added), so the next agent finds "this was tried and is wrong" before re-deriving it (this is the knowledge-store design's "trap" kind).

### 7.2 Statuses are computed, not asserted

- A Claim, Rule or cited span is **valid** while every Evidence it rests on has the same content hash, **suspect** when one has changed (it may still hold; the check is to re-read the changed span, as in build systems' early cutoff), **superseded** only through an explicit `supersedes` link, **unanchored** when an anchor token resolved to nothing or to several candidates, **refuted** only by a `refutes` edge from another claim with evidence. No model judges freshness (lanes `lane-temporal.md` and `architecture.md` reached the same rule; here it is stated as a modelling constraint).
- **Ambiguity is a status.** For a document token with k candidate definitions, create one *mention* occurrence with status `ambiguous(k)` and the candidate set, instead of k edges of weight 1/k. The agent tool can then return "ambiguous: these 3" or choose by context, and a ranking does not see k phantom edges. For a token that names nothing in the repository, status `not_in_repo` (the NIL case); v1 has 517 of 1,268 such file tokens and 120 of 1,634 symbol tokens ambiguous, plus 85 ids defined in more than one document. A document that cites a file that does not exist is itself a finding (CQ14, stale documentation), found by a check, not by a model.
- **Validity time** follows the temporal lane: facts and claims hold at the commits reachable from the commit at which they were recorded and not from the one that ended them; record time comes from the journal. Nothing in this lane changes that.

### 7.3 Worked example: the bill-freeze rule (from the invariants file)

The invariant, in the file's own words, is a rule with a reason, conditions, exemptions and two code halves. As a model:
- **Rule** `bill-freeze` (kind invariant; group "The bill freeze"): statement "a bill the customer has seen, agreed, or paid against is frozen"; rationale "an unguarded resubmit silently rewrote real bills to zero"; severity high.
- **Condition inputs** (`constrains`, role `condition`): the job's `bill_sent_at` column, its `bill_negotiated_paisa` column, the existence of a non-voided payment (the payment table).
- **Guard** (role `guard`, server half): the completion submission function in the jobs service. **Exemptions** as properties of the rule: the first submission (cash can precede paperwork); a byte-identical resubmit (idempotent success, "deployed phones send no client_id"); a manager's correction until the job closes ("the closed guard outranks the override").
- **Client half** (role `client_half`): the completion prefill function and the arrival-wizard state function, "pure functions living outside their components on purpose".
- **Dependent rule** (`depends_on`): "the automated send must call `log_customer_message`", because otherwise `bill_sent_at` stays NULL and the freeze never engages.
- **`justified_by`**: the carry-in-loop findings and the two pull requests the file names; a `Decision` only if one exists in the program documents.
- **Source** (`derived_from`): the invariants file section, with line span and hash; if a model read it, the model id and prompt hash.
With this shape CQ4 returns the statement, the role of each anchor and the reason in one answer, and "the other half of this rule" (CQ13) is a traversal from the guard to the `client_half` anchors, not a text re-read. In v1 the same invariant is one node with a title and `constrains` edges whose only property is the matched backtick token. That is the difference the model makes; **whether it saves tokens is untested** (the temporal and widen lanes record that the published evidence on cached or model-written context about code is mostly flat or negative, so the test must be run, section 8 R5).

### 7.4 How the model answers the document-side CQs

- CQ4: `Entity <-constrains- Rule` returns statement, role, rationale and span; cost is the rule's text, not the whole invariants file (50 reads of that file in 22 product transcripts today).
- CQ9: `Item -defined_in-> Section` and `Section -cites-> Item`; spans only.
- CQ2: `Phase -covers-> Item -defined_in-> Section`; `Decision -supersedes-> Decision`; the agent reads only the cited sections.
- CQ14: compare `hash_at_cite` with the hash of the cited span now; the answer is holds, changed or gone, and the check is deterministic.
- CQ1: `Entity <-about- Claim -rests_on-> Evidence`; status as computed.

### 7.5 Evidence, honestly

For: graphify-bench (independent, medium) on document-and-code questions; Dagenais and Robillard (96% precision and recall linking code-like terms to code; Java; medium); KGCompass linking issue text to code (summary; weak); build-system theory for the status rule (strong as engineering). Against: LLM-written context cost 20% to 23% more and did not help on average (ETH, medium to strong); free reuse of model summaries scored 22.22% against 26.26% without (SWE Context Bench, medium); 11 of 12 memory-system pairings did not beat no memory (VibeMemBench, medium); and 160 of 231 failures were in the *form* of the stored record, which is why this section specifies form (roles, statuses, anchors) and not just "store conclusions". The model is a specification of the record's form; it is not evidence that the record pays.

---

## 8. Recommendations

Each: what to build, theory, what it replaces, expected effect, the tuning-data test that would show it does not help, what must be installed. All tests are scripts over the cached per-commit facts and the tuning tasks only; none touches held-out data.

**R1. Write the schema as data from the competency questions and prune by the two checks.**
- Build: a schema file (types, relation types, from-to, required properties, cardinalities) and a script for the forward check (every kind serves a CQ), the backward check (every CQ has a metapath) and the constraint-violation counts (4.4). Add the 16 CQs with their metapaths (4.1) as the requirements document.
- Theory: Gruninger and Fox via Uschold and Gruninger (stratified CQs, minimal sufficiency, completeness check); Noy and McGuinness; Keet and Khan (answerable validating CQs); HIN network schema (Shi et al.).
- Replaces: a schema that grew from extractors, scored on one question family.
- Expected effect: no change in recall by itself. It yields a justified kind list, exposes the five CQs v1 cannot answer by type (section 4.2), and a pruning candidate list (`same_capability`, `migration_follows`, `mocks`, `contains`/`defines` as edges, pairwise `co_changed`). The token effect, if any, comes from smaller answers and a smaller schema for an agent to learn.
- Test that would show it does not help: remove the pruning candidates and re-run the tuning T1/TQ scoring: if tuning recall at the same answer size falls by more than the paired interval, the kind stays; if five of the five pruned kinds are needed, the CQ list is incomplete.
- Install: none (a script).
- Verdict: **do; first.**

**R2. A metapath registry derived from the schema, with the hop budget per relation, and the candidate paths discovered from tuning pairs.**
- Build: for each CQ the metapath and a per-relation hop budget (the schema lane's example: calls up to 3 in one runtime, one `calls` (url) hop, one route hop, calls up to 3 in the other runtime, one `writes` hop). Candidate extra metapaths found by greedy search for the paths that best explain the tuning co-change and seed-target pairs (Meng et al. 2015; Lao and Cohen 2010 for learning one weight per path).
- Theory: HIN metapaths; PRA; meta-path discovery.
- Replaces: v1's hand-set traversal and a sweep of 60 hand-chosen configurations.
- Expected effect: unknown; this is the area where the ranking lane works (`lane-ranking.md`); I only fix the schema consequence. Risk: learned path weights overfit 65 tuning commits.
- Test: tuning recall at fixed answer size for registry paths against discovered paths, by cross-validation inside the tuning set; reject if the discovered set does not beat the hand-set by more than the interval.
- Install: none.
- Verdict: **do after R1; coordinate with the ranking lane.**

**R3. Model the change set as a node with `touches` edges, and weight by set size.**
- Build: ChangeSet (sha, date, message, PR, size); `touches` with role and hunk spans to File and to Definition where the hunk can be mapped; walk weight `w/|e|` (Zhou et al.) as the replacement of pairwise `co_changed`; keep ROSE's cap at 30 entities and add the sweep indicator as a property.
- Theory: Zhou et al. 2006 (hypergraph random walk, clique weight `w(e)/delta(e)`); ROSE (transactions, rules between sets, 30-entity cap); Fatemi et al. 2020 (what star-to-clique loses).
- Replaces: 1,896 pairwise `co_changed` edges with ROSE confidence; adds the commit message ("why") that CQ10 and CQ6 need.
- Expected effect: moderate on co-change recall at equal answer size if the sweeps are noise, none if they carry signal; the measured distortion is that 55% of pair incidences come from 12% of commits. Plus: the first answer to CQ10's "and why".
- Test: on the tuning commits, co-change recall at the fixed answer size and the fixed 8,000-token budget for (a) v1 pairwise confidence, (b) pairwise weight `1/(k-1)`, (c) the hypergraph walk; stratified by seed commit size. No improvement of (b) or (c) over (a) beyond the paired interval means the set model adds meaning (the message) but not ranking.
- Install: none.
- Verdict: **do; cheap, one hour of scripting.**

**R4. Stable identity: keys by kind, occurrence separate from entity, lineage edges.**
- Build: section 6; contract keys, ADR-style item ids, section ids by heading path (never line numbers), invariant ids minted or written into the file, minted ids with an alias table for definitions, the matching ladder with `git diff -M` and body similarity, `candidate_of` for uncertain matches.
- Theory: Hogan 3.2 (persistent identifiers); git rename detection; origin analysis (Godfrey and Zou); method-history tools (HistoryFinder, CodeShovel, CodeTracker); PROV (`specializationOf`, `wasInvalidatedBy`) for the version relation; ADR numbering.
- Replaces: id-string identity, with line-number and ordinal ids for sections, invariants and URL sites.
- Expected effect: on this repository, none on structural retrieval over one snapshot; it is a precondition for any stored conclusion or citation check. Measured: with v1 ids a quarter of section ids and half of URL-site ids are gone within three weeks and some silently mis-bound.
- Test: the orphan-rate and mis-bound-rate test of 6.4. It shows identity work is unnecessary if fewer than 1% of anchors are orphaned by the ladder beyond the name key, and the section and rule keys are needed regardless because mis-binding is not a rate to trade off.
- Install: none (git and Python or Node already present). Optional: PyRef (Python refactoring detector) is not recommended (its precision and recall were 89.6% and 76.1% by its authors, F1 0.64 in an independent comparison; summaries only).
- Verdict: **do before any cached conclusion is stored.**

**R5. The meaning layer as the model of section 7: Rule, Decision, Item, Claim, Evidence, Source with roles, statuses and provenance.**
- Build: the schema; a deterministic extractor for what parsers can give (document ids, headings, citation spans with hashes, invariant bullets with their backtick anchors and roles from a small controlled vocabulary written by hand for the 20 invariants), and a resolver that emits `ambiguous(k)` and `not_in_repo` statuses. Model-read extraction (rationale, decisions) only fills fields of this form and never creates a code edge unaided (the architecture draft's rule).
- Theory: PROV-O qualified relations; Wikidata statements, references and ranks; ADR; competency-question stratification (CQ1, CQ2, CQ4, CQ9, CQ14 are the questions); entity linking with NIL; Dagenais and Robillard.
- Replaces: invariants as nodes with titles and fan-out edges; citations as edges with no span hash; no node for items, decisions or claims.
- Expected effect: this is the layer with the largest *candidate* saving (document and rule questions are 8.7% + 8.4% + others of product carried tokens, and a larger share of program work; upper bounds, not forecasts, from `use-cases.md`). Evidence on effect is mixed (7.5).
- Test: (i) anchor precision and resolution status on a sample of 73 to 385 labels per anchor type; (ii) a replay: for each tuning session's phase-start reads, whether the Rule, Item and Section answers contain the spans the session later cited or acted on (the use-case lane's falsifier: under about half means a convenience, not a lever); (iii) the cached-conclusion staleness replay already built for K0, run with the new hashes.
- Install: none for the deterministic part.
- Verdict: **do; the largest gap the CQ check found.**

**R6. Split `confidence` into method, evidence, status, calibrated probability, and strength; calibrate by method class from a labelled sample.**
- Build: per-edge `how`, evidence span and hash, status; for each method class a calibration table (the share correct in the labelled sample, with a Wilson interval; Platt or isotonic fitting is unnecessary at a few hundred labels, bin by method) replacing the mixed 0.9/0.95/1/k values; `strength` (support, call count) kept separately for ranking.
- Theory: Knowledge Vault calibration (Platt scaling on a validation set; "not necessarily on the same scale"); Gao et al. for the sample design; Wikidata references versus ranks; provenance semirings for combining along a path (a product), not adopted as machinery.
- Replaces: the single `confidence` field.
- Expected effect: ranking uses a quantity that means the same thing across relation kinds; the effect on recall is unknown and may be zero (the v1 audit lane noted the ranking mostly treats non-history edges as equal).
- Test: a reliability table on the tuning labels (predicted against observed correctness per bin); and tuning recall using calibrated correctness times strength against the raw field. Reject if recall is unchanged and the reliability error was already small (v1's parser kinds are mostly exact).
- Install: none.
- Verdict: **do the split (cheap, correctness of the model); the ranking effect is a trial.**

**R7. A quality card per build: accuracy by sample, completeness against independent sources, violations per constraint, timeliness, succinctness.**
- Build: the dimensions of Hogan section 7 as five numbers per relation type: sampled precision with interval (Gao-style sample, clustered by entity); completeness (population: routes and clients against the framework's own export, which the construction lane proposes; linkability: the share of document tokens that resolve; dynamic call edges as a recall check, 49% of dynamic edges present in a static Python call graph in an independent study cited by the construction lane); violations per constraint; extractor version and commit lag; tokens per answer and kinds with no CQ.
- Theory: Hogan et al. 2021 section 7; Gao et al. 2019; shapes (Hogan 3.1.2).
- Replaces: ad hoc samples of 20 to 30 edges.
- Expected effect: none on retrieval directly; it makes every other number in the design checkable and stops the graph silently degrading as the repository changes.
- Test: none to fail; its own validity is checked by seeding known errors (delete an edge, rename a route) and confirming the card flags them.
- Install: none.
- Verdict: **do; small.**

**R8. Reuse the SCIP descriptor grammar as the textual form of a definition's qualified name; reuse Kythe's occurrence/entity split; do not adopt either's identity.**
- Replaces: v1's `path#name` ids as display and alias.
- Expected effect: none on retrieval; interoperability if an indexer (scip-python, scip-typescript) is later used by the construction lane.
- Install: none for the grammar. (If the construction lane recommends the indexers, that decision is the owner's.)
- Verdict: **adopt the grammar only.**

**Not recommended at this size (section 9):** an RDF or OWL stack, RDF-star, OWL reasoning, an ISO GQL or PG-Schema engine, knowledge-graph embeddings, PathSim, hypergraph embedding models (HypE, StarE), HyperGraphRAG-style model-extracted hyperedges.

---

## 9. What is not worth it at this size, and what changes at 10x and 100x

| Technique | At about 5,400 nodes and 18,900 edges | At 10x | At 100x |
|---|---|---|---|
| RDF, OWL, RDF-star | No benefit: one publisher, no inference need; costs an extra data model | Same | Same unless sharing the graph across organisations |
| Property graph schema language (PG-Schema, GQL DDL) | A script of constraint queries does the job; the standard's DDL was still "limited" in 2022 and I only read its abstract | A shapes file may earn its keep | A real engine's constraints |
| Knowledge-graph embeddings (TransE family, HypE, StarE) | Hundreds of thousands of parameters over a graph this small; the evidence is link prediction, not agent retrieval; the earlier round ruled trained graph models out in one line, and this lane found no evidence against that for retrieval | Doubtful | Possible for candidate generation |
| PathSim and similar metapath similarities | No CQ asks for similar peers | - | Possible for a "similar code" feature |
| Hyperedge storage form (set per commit) | Brings meaning (message, PR) and a principled weight, not space | Same | The set form is required (435 pair edges per 30-file commit) |
| Body-similarity lineage | Needed to separate rename from delete; quadratic but trivial here | Needs blocking | Needs an index |
| Full provenance semirings | A footprint is a plain set of fact ids | Same | Maybe, for incremental maintenance of derived facts |
| Model-extracted rationale and decisions | The only way to get the prose-only parts of the meaning layer; unproven for effect | - | Cost dominates (graphify-bench about 7 USD for 139 documents; the architecture draft's estimate of about 2 USD for the product docs) |
| Sample-based accuracy | Cheap | Same | Same (sample size depends on margin, not population) |

---

## 10. What I could not open or verify

- Gruninger and Fox 1995 itself (the Toronto host timed out twice; other copies returned 403 or unreadable text). I read the same authors' description of the method in Uschold and Gruninger 1996 (AIAI-TR-191, the 1996 Knowledge Engineering Review paper, section 6). The use-case lane also cites "section 9" of the 1995 paper; I could not check that section number.
- NeOn methodology chapter (summary only); Wisniewski et al. 2019 (summary and the Keet and Khan 2024 description only).
- Software Heritage data model pages (bot protection); SWHID facts are from search-result descriptions of the documentation.
- PG-Schema body (abstract only); the ISO GQL and SQL/PGQ standards themselves (catalogue pages and summaries only).
- SEON (Wuersch et al. 2012) and CodeOntology (Atzeni and Atzori 2017): not opened.
- Lao and Cohen 2010 (PRA) and Meng et al. 2015 (meta-path discovery): abstract-level summaries only. Green, Karvounarakis, Tannen 2007: summary only.
- KGCompass: summary only; its two versions quote different multi-hop statistics.
- Zhong and Su (DocRef) and Hora et al. (ICSE 2018): summaries only; CodeShovel, CodeTracker original papers: read only through HistoryFinder; PyRef and ActRef: summaries.
- Shen, Wang, Han (entity linking): summary only.
- Zaveri et al. 2016 (linked data quality survey): not opened; Hogan 2021 section 7 stands in for the quality taxonomy.
- HyperGraphRAG: summary only.
- The effect of any modelling choice on an agent's tokens: nothing I read measures it; the tests in section 8 are the way to learn it. No source measures hyperedge against pairwise models, or a schema derived from competency questions against an ad hoc one, for coding-agent retrieval.
- Body-similarity lineage is measured in section 3.1 on only three snapshots and one threshold; I did not tune the threshold or measure false merges.
- My identity measurements use 110 consecutive pairs and 8 snapshots spread over 64 days of this one repository (which had a large restructuring in June, per the audit lane); rates will differ elsewhere.
