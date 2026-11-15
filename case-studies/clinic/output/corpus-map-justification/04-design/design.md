# Corpus map method: design (justification pass)

Inputs: constraint block v1 (`00-constraints.md`, SHA-256 a373536b2d3cdf5654e511997e300e6d047adc6c170a9c721fb281eaf04dbdfe) and the verified source pack (`02-pack/pack.jsonl`: 89 works, 310 findings, 304 supported, 6 unverified). Nothing else was read.

Conventions. Quote IDs in square brackets cite pack quotes that are verified, outside the abstract, in supported findings. Element IDs (SM, KM, ID, GM, DR, QL, CI, CL, RP, PK) are the design rules; each element ends with what it borrows or states that no source covers it. "arg1" and "arg2" are the two argument slots of an attested edge (KM-3). "Level" means a query level L1–L3 of the block (D8); it never means a pack lane. Where the pack and the block disagree, the block wins (D12); see Overrides.

## Candidate formalisms

Inclusion rule: a work enters the inventory when it defines a way of reading, extracting or coding text (class reading-procedure) or a representation, store, vocabulary or query language (class model-store). A work that defines both appears in both classes under separate IDs (C-prefix for reading procedures, M-prefix for models and stores). The rejected methods R1-R3 are inventoried where the pack describes an instance of them (C11, C12, C13). Each candidate is scored against R1-R6 in `rejection-check.jsonl` (rendered in `rejection-check.md`); only its own rule class can pass or fail, the other class is N/A.

| ID | Candidate | Class | Works | Quote IDs | Own-class result |
|---|---|---|---|---|---|
| C01 | IAT annotation procedure (locution segmentation, proposition reconstruction, illocutionary anchoring) | reading-procedure | W002, W006, W007, W009 | [L1-F18.q1] [L1-F19.q2] [L1-F20.q1] [L1-F21.q1] [L1-F22.q1] | passes R1-R3 |
| C02 | Persuasive-essay component and relation annotation | reading-procedure | W003 | [L1-F23.q1] [L1-F23.q2] [L1-F24.q2] | passes R1-R3 |
| C03 | Modified-Toulmin token-span annotation | reading-procedure | W004 | [L1-F25.q1] [L1-F08.q1] [L8-F26.q2] | passes R1-R3 |
| C04 | Microtext ADU segmentation and argumentation-structure annotation | reading-procedure | W005 | [L1-F26.q1] [L1-F27.q1] | passes R1-R3 |
| C05 | PDTB connective-anchored annotation (explicit, implicit, AltLex, EntRel, NoRel) | reading-procedure | W013, W014 | [L8-F04.q1] [L8-F04.q3] [L8-F05.q1] [L8-F05.q2] [L2-F12.q2] | passes R1-R3 |
| C06 | RST whole-text analysis | reading-procedure | W015, W016 | [L2-F13.q1] [L2-F22.q1] | passes R1-R3 |
| C07 | CST Bank sentence-pair annotation with lexical-similarity preselection | reading-procedure | W019 | [L2-F15.q2] [L2-F24.q2] | fails R3 |
| C08 | CSTNews exhaustive text-pair annotation | reading-procedure | W020 | [L2-F16.q2] [L2-F08.q2] | passes R1-R3 |
| C09 | ECB+ event coreference annotation | reading-procedure | W027 | [L3-F03.q1] [L3-F06.q1] | passes R1-R3 |
| C10 | Cross-document event identity heuristic (similarity threshold plus anchors) | reading-procedure | W030 | [L3-F07.q1] [L3-F07.q2] [L3-F24.q2] | passes R1-R3 |
| C11 | Single long-context window over the corpus | reading-procedure | W062 | [L6-F09.q1] [L6-F10.q1] [L6-F10.q2] | fails R1 |
| C12 | GraphRAG chunked LLM extraction with community summarisation | reading-procedure | W060, W061 | [L6-F01.q1] [L6-F02.q1] [L6-F03.q1] [L6-F07.q1] [L6-F05.q2] | fails R2 |
| C13 | Embedding top-k retrieval used as the reading context | reading-procedure | W057, W058, W059, W063 | [L5-F43.q1] [L5-F45.q1] [L5-F46.q1] [L5-F47.q2] [L6-F11.q1] | fails R3 |
| C14 | Open IE relation-phrase extraction (ReVerb) | reading-procedure | W085 | [L8-F20.q1] [L8-F21.q1] [L8-F22.q1] | passes R1-R3 |
| C15 | Similarity-based synonym resolution and canonicalisation (Resolver, Open KB clustering, LLM canonicalisation) | reading-procedure | W064, W065, W082 | [L8-F12.q1] [L8-F13.q2] [L6-F18.q1] [L6-F21.q1] [L6-F22.q1] | passes R1-R3 |
| C16 | Implicit-premise gap filling (Fill the Gap; implicit-knowledge insertion) | reading-procedure | W083, W084 | [L8-F15.q1] [L8-F15.q2] [L8-F15.q3] [L8-F17.q1] [L8-F17.q3] | passes R1-R3 |
| C17 | Scheme-based enthymeme reconstruction (as surveyed) | reading-procedure | W010 | [L8-F03.q1] [L8-F03.q2] | passes R1-R3 |
| C18 | Grounded-theory constant comparison and open coding | reading-procedure | W086 | [L8-F23.q1] [L8-F24.q1] [L8-F25.q2] | passes R1-R3 |
| C19 | Qualitative codebook development with intercoder review and saturation assessment | reading-procedure | W074, W075, W076, W077, W080, W081 | [L7-F13.q2] [L7-F15.q1] [L7-F16.q1] [L7-F17.q1] [L7-F21.q1] [L7-F24.q1] | passes R1-R3 |
| C20 | Systematic-review selection and documentation (PRISMA 2020, PRISMA-S, MECIR) | reading-procedure | W070, W071, W072, W073 | [L7-F01.q1] [L7-F04.q1] [L7-F08.q1] [L7-F09.q2] [L7-F12.q1] | passes R1-R3 |
| C21 | ACE explicit-local relation annotation | reading-procedure | W089 | [L8-F36.q1] [L8-F36.q2] [L8-F37.q1] [L8-F38.q1] | passes R1-R3 |
| C22 | UnArch architectural decision recovery | reading-procedure | W087 | [L8-F29.q1] [L8-F31.q2] [L8-F32.q1] | passes R1-R3 |
| M01 | AIF family argument graph (AIF, AIF+, IAT relations, xAIF) | model-store | W001, W002, W006, W008, W009 | [L1-F01.q1] [L1-F02.q1] [L1-F02.q2] [L1-F03.q2] [L1-F11.q1] [L1-F16.q1] [L1-F35.q1] [L1-F52.q2] | passes R4-R6 |
| M02 | Persuasive-essay argument tree (support, attack) | model-store | W003 | [L1-F06.q1] [L1-F06.q2] [L1-F07.q1] [L1-F43.q1] | fails R6 |
| M03 | Microtext argumentation scheme | model-store | W005 | [L1-F09.q1] [L1-F09.q2] [L1-F10.q1] [L1-F27.q1] | passes R4-R6 |
| M04 | Four-relation argument scheme (support, attack, detail, sequence) | model-store | W010 | [L8-F01.q1] [L8-F01.q2] | passes R4-R6 |
| M05 | PDTB sense hierarchy | model-store | W013, W014 | [L2-F01.q1] [L2-F02.q1] [L2-F02.q2] [L8-F06.q2] | passes R4-R6 |
| M06 | RST relation inventory with constituent and dependency trees | model-store | W015, W016, W023 | [L2-F03.q1] [L2-F04.q2] [L2-F18.q1] [L2-F28.q1] [L2-F38.q2] | passes R4-R6 |
| M07 | Coherence graph (Wolf and Gibson) | model-store | W017 | [L2-F29.q1] [L2-F30.q1] [L2-F30.q2] | passes R4-R6 |
| M08 | CST cross-document relation taxonomy | model-store | W018, W019, W020 | [L2-F06.q3] [L2-F34.q2] [L2-F35.q3] [L8-F10.q1] [L8-F10.q2] | passes R4-R6 |
| M09 | ISO 24617-8 core discourse relations | model-store | W022 | [L2-F11.q2] [L2-F17.q1] [L2-F36.q1] [L2-F37.q2] | passes R4-R6 |
| M10 | SKOS mapping properties | model-store | W025 | [L3-F01.q1] [L3-F12.q1] [L3-F12.q2] [L3-F12.q3] [L3-F25.q1] | passes R4-R6 |
| M11 | OWL 2 individual equality and inequality axioms | model-store | W026 | [L3-F02.q1] [L3-F02.q2] | fails R6 |
| M12 | Key-based identity consolidation (HasKey, inverse-functional properties) | model-store | W026, W031 | [L3-F08.q1] [L3-F08.q2] [L3-F09.q1] [L3-F09.q2] [L3-F22.q1] | fails R4 |
| M13 | owl:sameAs identity links with transitive closure | model-store | W029, W033, W035, W036, W066 | [L3-F13.q1] [L3-F19.q1] [L3-F20.q1] [L6-F24.q1] [L6-F24.q2] [L6-F25.q1] [L6-F26.q2] | fails R5 |
| M14 | Similarity Ontology | model-store | W029 | [L3-F05.q1] [L3-F05.q2] [L3-F13.q1] [L3-F13.q2] [L3-F13.q3] | passes R4-R6 |
| M15 | Hedged identity links (said to be the same as, isLike) | model-store | W033, W034 | [L3-F16.q1] [L3-F16.q2] [L3-F17.q1] | passes R4-R6 |
| M16 | Event identity and near-identity typologies | model-store | W028, W032 | [L3-F04.q1] [L3-F04.q2] [L3-F14.q1] [L3-F15.q2] | passes R4-R6 |
| M17 | PROV family (PROV-DM, PROV-O, PROV-Constraints, ProvONE) | model-store | W037, W038, W039, W040, W044 | [L4-F01.q2] [L4-F04.q1] [L4-F06.q1] [L4-F09.q1] [L4-F19.q2] [L4-F21.q2] [L4-F28.q1] [L4-F29.q1] | passes R4-R6 |
| M18 | Open Provenance Model | model-store | W041 | [L4-F12.q1] [L4-F13.q1] [L4-F32.q1] [L4-F33.q1] | passes R4-R6 |
| M19 | PAV authoring and versioning | model-store | W042 | [L4-F14.q1] [L4-F14.q2] [L4-F27.q2] [L4-F34.q2] | passes R4-R6 |
| M20 | Named graphs with publishing warrants | model-store | W045, W049 | [L4-F35.q1] [L4-F36.q3] [L5-F40.q1] [L5-F41.q1] | passes R4-R6 |
| M21 | PML inference steps | model-store | W046 | [L4-F37.q1] [L4-F37.q2] [L4-F38.q1] | passes R4-R6 |
| M22 | Gene Ontology evidence codes | model-store | W048 | [L4-F41.q1] [L4-F41.q2] [L4-F42.q1] [L4-F42.q2] | passes R4-R6 |
| M23 | Provenance semirings (why- and how-provenance) | model-store | W043 | [L4-F16.q1] [L4-F16.q3] [L5-F36.q1] [L5-F38.q1] [L5-F39.q1] | passes R4-R6 |
| M24 | Datalog with proof trees | model-store | W056 | [L5-F33.q1] [L5-F34.q1] [L5-F35.q1] [L5-F35.q3] | passes R4-R6 |
| M25 | RDF 1.1 graphs and datasets | model-store | W049 | [L5-F01.q1] [L5-F02.q1] [L5-F03.q1] [L5-F40.q1] | passes R4-R6 |
| M26 | Property graphs with GQL and SQL/PGQ pattern matching | model-store | W050 | [L5-F04.q1] [L5-F04.q2] [L5-F15.q1] [L5-F16.q1] [L5-F17.q1] [L5-F28.q1] | passes R4-R6 |
| M27 | PG-Schema open and closed typing | model-store | W051 | [L5-F05.q1] [L5-F06.q1] [L5-F06.q2] | passes R4-R6 |
| M28 | Cypher property-graph model and path queries | model-store | W052, W053 | [L5-F08.q1] [L5-F10.q1] [L5-F18.q1] [L5-F20.q1] [L5-F27.q1] [L5-F31.q1] | passes R4-R6 |
| M29 | Regular path queries | model-store | W053 | [L5-F13.q1] [L5-F13.q2] [L5-F25.q1] [L5-F26.q1] | passes R4-R6 |
| M30 | SPARQL 1.1 property paths | model-store | W054 | [L5-F11.q1] [L5-F12.q1] [L5-F23.q1] [L5-F24.q1] | passes R4-R6 |
| M31 | Recursive common table expressions | model-store | W055 | [L5-F21.q1] [L5-F22.q1] [L5-F22.q2] [L5-F32.q1] | passes R4-R6 |
| M32 | Vector similarity store with filtered top-k search | model-store | W057, W058, W059 | [L5-F43.q1] [L5-F45.q1] [L5-F46.q1] [L5-F47.q1] [L5-F48.q1] | fails R5 |
| M33 | GraphRAG entity-relationship graph with community summaries | model-store | W060 | [L6-F01.q1] [L6-F03.q2] [L6-F04.q1] | fails R5 |
| M34 | Open knowledge base of relation-phrase triples | model-store | W064, W065, W082, W085 | [L6-F17.q2] [L6-F21.q1] [L8-F20.q1] [L8-F22.q1] | passes R4-R6 |
| M35 | Stand-off span anchoring (brat standoff, Web Annotation selectors) | model-store | W011, W012 | [L1-F31.q1] [L1-F31.q2] [L1-F32.q1] [L1-F32.q2] [L1-F33.q1] [L1-F34.q1] [L1-F34.q2] | passes R4-R6 |
| M36 | IBIS issue base | model-store | W088 | [L8-F33.q2] [L8-F33.q4] [L8-F33.q5] [L8-F35.q1] [L8-F35.q2] | passes R4-R6 |
| M37 | ACE relation inventory with modality | model-store | W089 | [L8-F39.q1] [L8-F40.q1] [L8-F40.q2] | passes R4-R6 |
| M38 | UnArch issue-change decision graph | model-store | W087 | [L8-F29.q1] [L8-F29.q2] [L8-F30.q1] [L8-F30.q2] | fails R4, R5 |
| M39 | Codebook version and change records (DDI version statements; code development logs) | model-store | W076, W078, W079 | [L7-F15.q2] [L7-F19.q1] [L7-F19.q2] [L7-F20.q1] | passes R4-R6 |
| M40 | ConceptNet relation inventory with NONE and suggested relations | model-store | W084 | [L8-F18.q1] [L8-F18.q2] [L8-F19.q1] [L8-F19.q2] | passes R4-R6 |
| M41 | Selection flow ledger (PRISMA flow counts) | model-store | W070, W071, W072, W073 | [L7-F01.q1] [L7-F04.q1] [L7-F05.q1] [L7-F06.q1] [L7-F08.q2] | passes R4-R6 |
| M42 | Authoritative forward-chaining materialisation (SAOR) | model-store | W067 | [L6-F30.q1] [L6-F31.q1] [L6-F31.q2] [L6-F32.q3] | passes R4-R6 |

Works used as evidence only (no formalism of their own in the pack): W024 (crossing dependencies in PDTB), W068 (vocabulary term evolution), W069 (hallucination in abstractive summaries).

Works not inventoried because the pack does not verify their method: W021 (Knott's cue-phrase methodology: abstract-only, L2-F09) and W047 (ECO assertion-method classes: source unread, L4-F39 and L4-F40). Both are listed under Unresolved claims.

## Status model

**SM-1** Status set and immutability. Every base record carries exactly one status from S1-S5, assigned at creation from the kind of evidence that created it, and never changed afterwards. S6 is not a record status; it labels query results (SM-8). A change of view is recorded as a new record, never by editing a status. Borrows: a per-annotation evidence code [L4-F41.q1]; separate categories for author statements, curatorial statements and automatically generated annotations [L4-F42.q1].

**SM-2** What is S1. A record is S1 if and only if a span of a read file version states it. There are exactly four S1 record types: (a) attested edge (RP-3 to RP-5); (b) introducing statement: a heading, an explicit definition of a name, or a naming statement (RP-2); (c) explicit identity statement: "hereafter X", "also called X", a definition link (ID-3); (d) explicit local definition of a relation word (RP-10). A reader's inference, a summary, a reconstruction or a similarity score never yields an S1 record. Borrows: relations tagged only when explicitly referenced in the text [L8-F36.q2] [L8-F37.q3]; every proposition and relation anchored in the material that created it [L1-F22.q1].

**SM-3** Span. A span is: one file version identifier; one or more character ranges [start, end) in that file version; for each range, its exact text and a short prefix and suffix sufficient to make the quoted text unique in the file version. Ranges may be discontinuous. A span never covers two file versions (D11). Borrows: stand-off annotations tied to text by character offsets [L1-F31.q2]; position and quote selectors [L1-F34.q1] [L1-F34.q2]; discontinuous text-bound annotations [L1-F33.q1]; a conclusion split around its premise [L1-F29.q1].

**SM-4** S2 record. Fields: decision id; who; when; spans in view (the attesting spans the analyst read); codebook version before and after; decision (a property value for a label, a label merge, a scope note, or a recorded disagreement). An S2 record decides vocabulary only: it never states that two things are the same and never creates an edge. Borrows: a log of each new code's name, definition, type and notes, and of every change with its nature and the interview at which it occurred [L7-F15.q1] [L7-F15.q2]; the agent and time stamp of each inference step [L4-F37.q2].

**SM-5** S3 record. Fields: decision id; who; when; spans in view (every endpoint span the decision covers, plus any introducing span consulted); decision value (ID-5); prompting candidate id or none. The prompting candidate is kept for the ledger only and is not evidence (SM-9). Borrows: authorship distinguished from curation and creation of a record [L4-F14.q1]; an account as a description given by observers [L4-F33.q1]; reporting how many reviewers screened each record and whether they worked independently [L7-F03.q1].

**SM-6** S4 record. Fields: annotation id; exactly one gap key (GM-1); type (reconstructed premise, no premise needed, abstain); analyst text for a reconstructed premise; who; when; spans in view. An S4 record is never an edge, endpoint expression, referent or hop (GM-8). Borrows: inserted implicit-knowledge sentences labelled separately from the original units [L8-F17.q3]; annotators free to abstain when claims cannot be matched [L8-F15.q2]; pairs needing no premise labelled directly linked [L8-F15.q3].

**SM-7** S5 record. Fields: candidate id; proposal type (CI-1); method name and parameters; score; input record ids; when; disposition (CI-3). S5 records exist only in the candidate index. Borrows: a model that outputs the probability that two strings co-refer [L8-F12.q1]; electronic annotations marked as not manually reviewed [L4-F41.q2].

**SM-8** S6 result. A result carries the query, the level, the codebook version (L2 and L3), and either its hops (DR-2) or its rule plus the base records it used (DR-10). A result is never written as an S1-S5 record and is never read by gap detection (DR-1). Borrows: an inference step recording the rule applied and its antecedents [L4-F37.q1]; a proof tree whose leaves are input facts [L5-F35.q1] [L5-F35.q2]; why-provenance as the set of contributing inputs [L4-F16.q1].

**SM-9** Evidence. The evidence of an S1 record is its span; the evidence of an S2, S3 or S4 record is its spans in view. Scores, candidate ids and earlier results are never evidence for any record. Required: no source covers it (D1).

**SM-10** No promotion by repetition. Several attestations of one relation are several S1 records, each counted. Several S5 proposals, or several analysts' agreeing S3 decisions, remain S5 or S3. Nothing reaches S1 except through SM-2. Required: no source covers it (D1, D5).

## Kind model and codebook

**KM-1** Label. A label is the cue text exactly as written in the attesting span (RP-5), compared after one normalisation only: each run of whitespace becomes one space. Case, inflection, spelling variants and synonyms give different labels unless an S2 merge (KM-13) groups them. Labels form an open set. Borrows: labels drawn from a countably infinite set [L5-F04.q1]; edge predicates as minted identifiers rather than members of a fixed list [L5-F01.q1]; relation lists deliberately left open [L2-F04.q2].

**KM-2** Kind (revised for K01, K02). A kind is a label, or a sense of a label (KM-17), plus exactly three properties: direction in {toward_arg2, toward_arg1, none}; consequence in {fails_to_build, fails_to_follow, fails_to_resolve, none}; walkable in {yes, no}. Any property may be unset. Borrows: directed versus undirected coherence relations [L2-F29.q1]; symmetric versus directional cross-document relations [L2-F34.q2]; low agreement on directionality (kappa 0.44) [L2-F25.q2], which is why direction is decided once per label and recorded rather than judged per edge.

**KM-3** Slots and direction. Every attested edge has two slots. arg2 holds the expression or expressions syntactically governed by the cue: the object of the relation verb or preposition, the clause introduced by or containing the connective, or the items governed by a list heading. arg1 holds the other argument. Direction names the foundation slot: toward_arg2 means arg1 is the dependent and arg2 the foundation (base, premise, source); toward_arg1 means the reverse; none means no dependent-foundation orientation. Example: in "A depends on B" and "A because B" the governed argument is B; in "B; therefore A" the governed argument is A, so a kind for "therefore" would be toward_arg1. Borrows: premise and conclusion roles given by edge direction rather than by node types [L1-F03.q1]; a relation phrase that sits between its two arguments [L8-F20.q2].

**KM-4** Consequence. fails_to_build: without the foundation the dependent cannot be built or cannot exist as planned. fails_to_follow: without the foundation the dependent (a conclusion or decision) does not follow. fails_to_resolve: without the foundation a name or reference in the dependent has no specified meaning. none: the text gives the foundation's absence no effect on the dependent. Gap roles derive from consequence only (GM-2). Borrows: a causal dependency meaning one artifact needs to have been generated for another to be generated [L4-F13.q1]; an assumption required for a conclusion to follow from its premises [L8-F02.q1].

**KM-5** Walkable. yes: attested edges of the kind may be composed into paths. no: edges of the kind are reported as terminal hops and never extended. Walkability is never assumed from what the label seems to mean. Borrows: no inference makes derivation transitive [L4-F09.q1]; a mapping property deliberately declared not transitive [L3-F12.q2].

**KM-6** Property sources. Each set property value of a kind has exactly one source: an S1 local definition (RP-10) or an S2 decision (SM-4). A value without a source is unset. Required: no source covers it (D2).

**KM-7** Definition scope. An S1 local definition applies to attestations inside its scope: the scope the text states ("in this section"), otherwise the file version that contains it. Outside every S1 scope the S2 value applies. Two S1 definitions that fix different values of one property in overlapping scope leave that property unset inside the overlap, and the conflict is listed as unresolved vocabulary. Required: no source covers it (D2, D11).

**KM-8** Precedence. Inside an S1 definition's scope, the S1 values govern the properties the definition fixes, and S2 fills only properties it does not fix. An S2 decision that contradicts an S1 value is kept as a recorded disagreement and is not applied inside that scope. Required: no source covers it (D1, D2).

**KM-9** Inertness per operation. Walking needs walkable = yes and direction other than none. Consequence-gap detection needs consequence set and, when consequence is not none, direction set (GM-3). A kind lacking what an operation needs is inert for that operation: its edges are stored, are not walked by it, produce no consequence gaps, and the operation lists them as "unresolved vocabulary" with label, edge ids and missing properties. A kind with no property set is inert for every operation (D3). Borrows: partial validation that assigns types to as many nodes and edges as possible without requiring every edge to receive one [L5-F06.q2].

**KM-10** New-label stub. When a reader records an edge whose label is not yet in the codebook, a stub entry is created: label, first attesting span, file version, no properties (unless an S1 definition applies). The file version's "new labels" count rises by one. Borrows: recording NONE and collecting suggested relation names when no inventory relation fits [L8-F19.q2]; logging every new code per interview [L7-F15.q1].

**KM-11** Codebook versions. The codebook version is an ordinal plus a date. Every S2 record produces a new version. The change log records the labels concerned, the nature of the change, who, when, and the file versions whose spans were in view. Every L2 or L3 answer cites one version (QL-2). Borrows: recording each code change with its nature and where it occurred [L7-F15.q2]; a version date attached at element level [L7-F19.q2]; version statements for substantive changes [L7-F20.q1]; senses dropped and added while annotating new data [L2-F01.q1].

**KM-12** Deciding properties. An analyst sets a label's properties only after reading attesting spans of that label, comparing span with span and, for related labels, label with label. The spans compared are the S2 record's spans in view; attestations not in view at decision time are listed in the change log. Borrows: incidents compared with incidents, then concepts with concepts [L8-F23.q1] [L8-F23.q2]; a category generated from similarities and differences between indicators [L8-F24.q1].

**KM-13** Merges. A merge is an optional S2 record naming a group of labels and the property values they share. It changes no S1 record. Label queries still return each file's word (QL-6); chain and gap queries use the properties; the group name never appears as a hop label. Borrows: translation between representations losing information [L2-F38.q2]; inferred statements losing the author versus curator distinction [L4-F34.q2]; a canonicaliser wrongly clustering distinct relations into one category [L6-F22.q1].

**KM-14** Disagreement. When analysts' S2 decisions on one property of one label differ, all are kept; the property is unset for operations until a resolving S2 record is made under a procedure fixed before decisions began (discussion to consensus, a third analyst, or a named arbiter); the disagreement stays in the ledger until resolved. Borrows: defining in advance how disagreements are resolved [L7-F12.q1]; a third coder or discussion to consensus [L7-F14.q1] [L7-F14.q2]; disagreements recorded while a codebook is tested [L7-F16.q2].

**KM-15** Closed property set. A kind has no property beyond the three in KM-2. A further property is admitted only with a counterexample: two kinds with identical (direction, consequence, walkable) for which a chain or gap answer required by the block must differ. This design admits none; the pressures examined are listed under Unresolved claims. Required: no source covers it (D2).

**KM-16** General words stay general. A general relation word ("relates to", "is connected with") is its own label; an analyst never replaces it with a more specific label. Borrows: annotators not forced into fine sense distinctions without sufficient information [L8-F06.q1]; a higher-level tag meaning that a more specific interpretation cannot be determined [L8-F06.q2].

**KM-17** Senses (new, revised for K01, K02). When attestations of one label state relations that differ, such as a compound header naming two relations ("Evidence / consequence") or one word used in two ways ("per" citing a source and "per" meaning "for each"), an S2 record may split the label into numbered senses, each with its own three properties. Each attestation is then assigned to one sense by an S2 record whose spans in view include that attestation. A kind is then the label and the sense: the label word is unchanged in every S1 record, and label queries return it with the sense shown beside it. An attestation not yet assigned to a sense is inert for every operation for which the senses' properties differ (KM-9). A split is not a merge and erases no label difference (KM-13). Borrows: an estimate that about 22% of extracted relation phrases are polysemous [L6-F19.q1]; not clustering a polysemous string with others unless every sense matches [L8-F14.q1].

## Identity layer

**ID-1** Endpoint expressions (revised for K13). Each slot holds zero or more endpoint expressions. An expression is verbatim text from the file version with its span, typed by a grammatical test on the span alone: clause if it contains a verb heading its own predicate, that is a finite or imperative verb, or a non-finite verb with its own subject ("the user's PC running continuously"); otherwise name (a noun phrase, pronoun, demonstrative, heading reference or link). The test involves no judgement of meaning, so the typing is part of what the span states. A slot with no expression is absent. Required: no source covers it (D5).

**ID-2** Referents. A referent is created by (a) an S1 introducing statement (heading, explicit definition, naming statement), giving a name referent grounded by that span; (b) a clause expression, giving a proposition referent grounded by its own span; or (c) an S3 decision that creates a referent for listed expressions, which is ungrounded unless ID-12 grounds it. Each referent keeps the expressions that resolve to it and the statements that resolve them. Required: no source covers it (D5).

**ID-3** S1 resolution (revised for K08). At L1 and L2 a name expression resolves only through: (a) a definition link whose target is an introducing span (a link to a heading or a definition); (b) an explicit identity statement in the text ("X, hereafter Y"; "Y (also called X)"); (c) span identity, when two slots hold the identical span; (d) a declared identifier: inside one diagram or other block written in a notation that declares node identifiers (a declaration such as "CMD[Explicit business commands]"), each later occurrence of the declared identifier in the same block resolves to the declared node, the declaration being the explicit textual statement and the block its scope. Pronouns, demonstratives and repeated names resolve at L1 and L2 only through (a) to (d). Required: no source covers it (D5).

**ID-4** Equal strings are not identity. Two distinct expressions with equal or similar text do not resolve to each other by that fact. Exact or fuzzy matching may only create S5 candidates (CI-1) or prompt an S3 decision. Borrows: entity matching by exact string [L6-F04.q1]; a query by one name not returning all facts about the entity [L6-F17.q2]; similar but non-synonymous names forming a large share of merge errors [L8-F13.q2]; looser identity constraints producing extreme lumping [L3-F24.q2].

**ID-5** S3 decision values. An S3 identity decision covers an enumerated list of expressions, each with its span, and states one value: same (all listed expressions denote one referent and are substitutable in every listed span), different (they denote distinct referents), or cannot tell. Near-identity, membership, subevent and part-whole judgements are recorded as different or cannot tell, never as same. Borrows: equality as substitutability in every expression [L3-F02.q1]; a separate axiom for asserting non-identity [L3-F02.q2]; quasi-identity kept apart from identity [L3-F14.q1]; near-identity as neither identical nor non-identical [L3-F15.q2]; main disagreement between "same as" and "can't tell" [L3-F18.q3]; a mention that adds new information is no longer identical [L3-F10.q2].

**ID-6** No stored closure. Identity statements and S3 decisions are stored as given (pairs or enumerated lists) and are never closed transitively in storage. Any closure is computed inside a query, hop by hop (DR-8). Borrows: transitive closures that get very large [L6-F24.q2]; a closure identity set of 177,794 terms [L3-F19.q1]; two incorrect links merging 78 terms into one equality set [L3-F20.q1]; false equivalence of over 177K names [L6-F28.q2].

**ID-7** Conflict. If, at a level, a chain of resolution hops connects two expressions that an S3 different decision or an explicit textual non-identity statement separates, every expression that resolves through that chain does not resolve at that level, and the conflict is listed. Borrows: exactMatch declared disjoint with broadMatch and relatedMatch [L3-F01.q1]; an inequality axiom alongside equality [L3-F02.q2].

**ID-8** Unique resolution. An expression resolves at a level if and only if exactly one referent is reachable from it through the resolution statements admitted at that level (ID-3 at L1 and L2; ID-3 plus S3 same decisions at L3). Zero or several reachable referents means it does not resolve. Required: no source covers it (D5).

**ID-9** Dangling endpoints (revised for K17). Any slot of any S1 edge, of any kind including inert kinds, whose expression does not resolve at the query's level, or which is absent, is a dangling-endpoint gap, whatever the kind's consequence. Required: no source covers it (D5).

**ID-10** Coordination and joint arguments. Coordinated expressions in one slot ("depends on A, B and C") produce one edge per coordinated item, all sharing the cue span. When the text states that the items act jointly ("together", "jointly", "only in combination", "both are needed"), one edge with several expressions in that slot is recorded instead. Each expression resolves separately. Borrows: simple versus linked support [L1-F09.q1]; relations with exactly one consequent and at least one antecedent [L1-F52.q1]; relations among more than two entities expressible only indirectly [L5-F02.q1]; errors from modelling only binary relations [L8-F22.q1].

**ID-11** Identity by level. L1 and L2 use the same resolution (S1 only); L3 adds S3 same and different decisions. Every count of dangling endpoints names its level. Required: no source covers it (D8).

**ID-12** Grounding (revised for K16). A referent is grounded at a level if and only if an S1 introducing span for it (ID-2 a or b) exists in a read file version, or, at L3 only, it is S3-same with a grounded referent (reported as an analyst hop). A link whose target lies outside the corpus does not resolve (ID-8): its slot is a dangling-endpoint gap for any kind, flagged external in the gap record and in CL-4 (c). Required: no source covers it (REQUIRED RESULT: gaps are first-class).

## Gap model

**GM-1** Gap record. A gap is keyed by (edge id, slot, level, codebook version). It has exactly one role (GM-2) and carries its rule (the GM element applied) and its basis: the edge, the slot's expressions, the resolution or non-resolution statements, and the S1 definition or S2 entry that supplied the consequence. Gap records live in the result partition (PK-1): they are recomputed from base records only, are never edges, are never walked and are never input to another gap. Borrows: each inferred annotation traceable to the direct annotations used as its basis [L4-F42.q2]; proof-tree leaves labelled by input facts [L5-F35.q2].

**GM-2** Roles. fails_to_build gives missing foundation; fails_to_follow gives missing premise; fails_to_resolve gives unspecified name; none gives no consequence gap. The identity layer adds dangling endpoint. No other role exists and roles are never declared. Required: no source covers it (D2, D5).

**GM-3** Foundation slots. toward_arg2: arg2. toward_arg1: arg1. Direction none with consequence other than none: both slots. Required: no source covers it (D2).

**GM-4** Per-slot decision (revised for K17). For each slot of each S1 edge, at a level and codebook version, apply in order and stop at the first that fires (at most one gap per edge and slot): (a) the slot is absent, or an expression in it does not resolve: dangling endpoint, for any kind; (b) the slot is a foundation slot of a kind whose consequence c is not none, and a resolved referent in it is ungrounded: the role derived from c; (c) otherwise no gap. For a joint slot (ID-10), (a) or (b) fires if any member qualifies, and the basis lists the members. Required: no source covers it (D2, D5).

**GM-5** Inert kinds and dangling endpoints (revised for K17). A kind inert for gap detection (KM-9) never produces a consequence gap, because step (b) needs consequence and direction; its edges still produce dangling-endpoint gaps under (a). This is how the design satisfies both D3 (no gaps from an inert kind) and D5 (dangling endpoints for any kind). Required: no source covers it (D3, D5).

**GM-6** Gap levels. Gap answers exist only at L2 and L3 and cite the codebook version. At L3, a resolution or grounding that uses an S3 decision is reported as an analyst hop in the gap's basis. Required: no source covers it (D8).

**GM-7** Provisional gaps. While any file version of the corpus is unread or partly read (CL-2), every dangling-endpoint gap and every step (b) gap based on an ungrounded referent is marked provisional and lists the unread extent that could hold the missing introducing or identity statement. Borrows: potentially eligible reports that were not retrievable reported as a state of their own [L7-F05.q1].

**GM-8** Reconstructed premises. An S4 record attaches to exactly one gap key. It never resolves an expression, never grounds a referent, never becomes a hop and never closes its gap: the gap stays in every count. Reconstruction text is the analyst's minimal statement of what is missing. Borrows: annotators supplying the premises that bridge two claims [L8-F15.q1]; adding as few sentences as possible to explain a missing connection [L8-F17.q1] [L8-F17.q2]; writing down the inferred stance for an implicit claim [L8-F26.q2]; assumptions left implicit although the conclusion needs them [L8-F02.q1].

**GM-9** Gap counts. At a level and codebook version, the number of gaps with a role is the number of distinct gap keys with that role. Per file version, a gap is attributed to the file version of its edge's cue span. Required: no source covers it (D10).

## Derived results and path semantics

**DR-1** Results only. Chains, paths, gap lists, identity sets and counts are S6 results (SM-8). They are never written as S1-S5 records, never read by gap detection, never read by another query as base facts, and are recomputed from base records when asked again. Borrows: complying without explicitly applying inferences or constructing normal forms [L4-F30.q2]; complete instance-level inference being neither feasible nor desirable [L6-F31.q1].

**DR-2** Hop. A hop records: edge id; label as written; the source of each property used (S1 definition span, or S2 entry with codebook version); the cue span; the from-referent and the statement or statements resolving the from-expression; the to-referent or referents and their resolving statements; the hop distance from the query start. Borrows: path variables bound to whole paths [L5-F28.q1]; paths as alternating node and relationship identifiers [L5-F31.q2]; an inference step that records rule and antecedents [L4-F37.q1].

**DR-3** Chain query (revised for K12). From a start referent X at L2 or L3: for every S1 edge whose dependent slot holds an expression resolving to X and whose kind is walkable with direction other than none, emit a hop to the referent or referents of the foundation slot; repeat from each reached referent. Kinds with direction none are not walked by chain queries. "What stands on X" walks the same edges from foundation to dependent and is a separate query; DR-4 and DR-6 apply to it exactly as to the chain query. Borrows: provenance chains formed from derivation alone [L4-F07.q1].

**DR-4** Frontier reporting (revised for K12). At each reached referent the answer also lists: edges of non-walkable kinds as terminal hops; edges of kinds inert for walking that hold an expression resolving to that referent in either slot, as "unresolved vocabulary" entries (label, edge id, missing properties, hop distance); and every gap on reached edges with its role and hop distance. If the start has only inert edges, the answer is "unresolved vocabulary", never an empty chain (D3). Required: no source covers it (D3, D7).

**DR-5** Simple paths. No referent is visited twice on one path. A hop that would revisit a referent is reported as a cycle with both hop distances and is not extended. Borrows: unbounded repetition required to sit under a restrictor such as TRAIL or ACYCLIC [L5-F17.q1]; never binding the same relationship twice so results stay finite [L5-F20.q1]; recursive queries looping on cyclic links [L5-F22.q1]; tracking already-visited values [L5-F22.q2]; recursive programs needing infinite sums of derivations [L5-F39.q1].

**DR-6** Answer form. A chain answer is the set of all reachable hops, each with its minimum hop distance and its predecessor hops, from which every simple path can be listed. A path query (X, Y, optional maximum length) returns every simple path from X to Y. Borrows: a query language that cannot return paths, only their existence or end nodes [L5-F25.q1]; no consensus on paths as query output [L5-F26.q1]; returning path elements [L5-F27.q2].

**DR-7** Joint hops. Walking an edge whose foundation slot holds several expressions reaches all their referents as one joint hop. The chain below a joint hop is complete only if every member's branch is reported, and a gap on any member is reported on the joint hop. Required: no source covers it (D7).

**DR-8** Identity hops. When resolving an expression passes through an identity statement, the hop lists it: S1 statements at every level; at L3, each S3 same decision used is a separate hop labelled "analyst hop" with decision id, who and when. Required: no source covers it (D8).

**DR-9** No promotion. A path never creates an edge between its ends, and a gap at a later hop never becomes a gap of an earlier edge. "A depends indirectly on C" exists only as a path answer. Borrows: no inference making derivation transitive [L4-F09.q1]; promotion through an intervening taggable entity declared illegal [L8-F38.q1]; a dependency that cannot be ascertained by composing hidden steps [L4-F13.q3].

**DR-10** Rule results. A rule-based result (a gap, an identity set, a count) returns the element id of its rule and every base record used; when several sets of base records support it, all are listed. Borrows: why-provenance as contributing inputs and the need to know how they contribute [L4-F16.q1] [L4-F16.q2]; a sum over all derivation trees [L5-F38.q1]; a fact derived if and only if a proof tree exists [L5-F35.q3].

**DR-11** Mixed kinds. A path may combine hops of different walkable kinds. Each hop keeps its own label and properties; answers may be grouped by consequence but hops are never relabelled. Required: no source covers it (D4).

## Query levels

**QL-1** L1 is S1 only. Answers: attested edges with labels, spans and slot expressions; introducing statements; S1 identity statements and S1 resolutions; S1 relation definitions. L1 returns no chain, path or gap answer. Required: no source covers it (D8).

**QL-2** L2 is S1 plus S2 at one named codebook version. Chain, path and gap answers start at L2 and cite the version; kinds inert for an operation give "unresolved vocabulary" (KM-9). Required: no source covers it (D8).

**QL-3** L3 is L2 plus S3. Every use of an S3 decision (resolution, grounding, closure) is an analyst hop (DR-8). Required: no source covers it (D8).

**QL-4** S4 in answers. S4 is in no level's read set and never changes an answer. A gap answer at L2 or L3 may, on request, append the S4 annotations attached to the returned gap keys, labelled S4. Required: no source covers it (D6, D8).

**QL-5** S5 in answers. S5 is in no level's read set; the candidate query (CI-2) is its only reader. Required: no source covers it (D8, D9).

**QL-6** Label queries. A label query at any level returns the words the files used, with their spans. At L2 and L3 it may show merge groups (KM-13) beside each word, never instead of it. Required: no source covers it (D4).

**QL-7** Defaults. A query that names no level runs at L1 if it is a statement or label query, and at L2 with the latest codebook version if it is a chain, path or gap query. L3 and the candidate query run only when named. Required: no source covers it (D8, D9).

## Candidate index

**CI-1** Proposal types. (a) two expressions may denote one referent; (b) two labels may name one kind; (c) two spans may be related. Each S5 record gives method, parameters, score and inputs (SM-7). Borrows: a co-reference probability computed from shared properties [L8-F12.q1]; an event-identity heuristic with a similarity threshold [L3-F07.q1], both used here only as proposal methods.

**CI-2** Isolation. Only the candidate query, and analysts choosing what to read next, read the candidate index. No level reads it (QL-5, PK-4). Required: no source covers it (D8, D9).

**CI-3** Disposition. A candidate's disposition (open; reviewed, with the id of the decision made; rejected) is a field separate from status, and changing it changes no status. A reviewed candidate yields at most a new S2 or S3 record whose evidence is its spans in view (SM-9), never the score. Required: no source covers it (D1).

**CI-4** No clustering. Candidates stay pairwise. They are never closed transitively or clustered into groups. Borrows: an aggressive clustering strategy propagating errors [L6-F18.q1]; one clustering error moving three entities into one cluster [L6-F18.q2]; similar names merged although not synonyms [L8-F13.q1].

**CI-5** Ordering, not limiting. Candidates may order what a reader examines next; they never limit what is read. A pair or span that was not proposed is not thereby examined or unrelated; read extent is recorded only by the ledger (CL-2). Borrows: preselecting pairs on the assumption that lexically dissimilar sentences are unlikely to be related [L2-F15.q2]; a weak correlation (-0.22) between similarity and the premises needed to bridge claims [L8-F16.q2]; top-k combinations that no query can return [L5-F43.q1]; top-k stopping that yields fewer results than expected [L5-F46.q1].

**CI-6** Scores. Scores are reported with method and inputs, are not compared across methods, and no threshold turns a candidate into a decision. Borrows: similarity as a vague notion that is hard to capture accurately [L5-F45.q1]; hubs picking up bad k-occurrences [L6-F12.q2]; looser constraints producing lumping [L3-F24.q2].

## Coverage ledger

**CL-1** Entry per file version. Each file version has one ledger entry: path and version identifier, then read, linked and unresolved (CL-2 to CL-4) and counts (CL-5). Borrows: decisions documented for all records identified [L7-F09.q2]; totals documented per information source [L7-F07.q1].

**CL-2** Read. The read ranges (character ranges of the file version) for each pass (RP-2 to RP-4), with reader, actor type and date, and the unread ranges. A file version is read when every pass covers all its characters, partly read when some range is covered, unread when none is. Borrows: separate counts for each stage of the selection trail [L7-F04.q1]; reports that could not be retrieved kept as a state of their own [L7-F05.q1].

**CL-3** Linked. The spans of this file version that produced S1 records, listed by record type (SM-2 a to d). Borrows: a count trail from records identified to studies included [L7-F01.q1].

**CL-4** Unresolved (revised for K16). (a) relation cues not typed, with cue span and reason (RP-8); (b) labels attested in this file version that are inert for walking or gap detection, with their missing properties, plus property conflicts and open disagreements (KM-7, KM-14); (c) dangling endpoints of edges cued in this file version, at L2 and at L3, with external link targets flagged (ID-12); (d) open candidates whose inputs include records from this file version. Required: no source covers it (D10).

**CL-5** Counts by hand (revised for K17). For a file version: attested edges = S1 edge records whose cue span lies in it, after ID-10 splitting; new labels = stubs created from it (KM-10); codebook decisions = S2 records whose spans in view include a span of it; identity decisions = S3 records whose spans in view include a span of it; dangling endpoints = GM-4 (a) gaps on edges cued in it, per level; gaps by role = gap keys on edges cued in it, per role, level and codebook version. Required: no source covers it (D10).

**CL-6** Corpus trail. Files identified, then read, partly read or unread (each partly read or unread file with a reason), then files with at least one linked span. No file version leaves the trail without a recorded reason. Borrows: reporting the numbers from records identified to studies included [L7-F04.q1]; explaining why near-miss studies were excluded [L7-F02.q1]; at least one explicit reason per excluded study [L7-F10.q2].

**CL-7** Actor. Every read range and every S2, S3 and S4 record names its reader or analyst and whether a person or an automated reader produced it. Borrows: records excluded by a human versus by automation tools [L7-F06.q1]; how many reviewers screened and which automation tools were used [L7-F03.q1].

**CL-8** Label emergence. The ledger lists new labels and codebook changes per file version in reading order. The list is descriptive: it is not a stopping rule and supports no claim that the label set is complete. Borrows: a per-interview log of new codes [L7-F15.q1]; thresholds that do not guarantee saturation [L7-F22.q2]; saturation judged without an a priori threshold [L7-F25.q1]; models of saturation that differ in what is saturated [L7-F28.q1].

**CL-9** No silent discard. Cues with unfilled slots, edges with dangling endpoints and S1 records that link to nothing else stay in the store and in the ledger. Required: no source covers it (D10).

**CL-10** Several readers. When more than one reader reads a file version, each reader's records are kept apart with reader id; a reconciled record set is produced by a procedure fixed before reading; differences not reconciled are listed as relation cues not typed; corpus-wide consistency checks of labels and slots run in addition to per-file agreement. Borrows: two people working independently with a disagreement process defined in advance [L7-F12.q1]; discussion to consensus [L7-F14.q2]; agreement measures not guaranteeing consistent annotation across a corpus [L2-F21.q1]; consistency checks over the corpus as a whole [L2-F21.q2].

## Reading procedure

**RP-1** Unit and passes. A reader reads one file version in full, in three sequential passes (RP-2, RP-3, RP-4), and records the read ranges of each pass (CL-2). No pass reads the corpus as one window, reads a summary instead of the file, or reads only retrieved passages. A reader's output is records with spans, never prose; outputs of different readers are combined under CL-10, never by merging prose. Borrows: U-shaped use of information in long contexts [L6-F09.q1]; models not reasoning effectively over their whole context window [L6-F10.q2]; degraded recall early in long chunks [L6-F02.q1]; hallucinations in more than 70% of single-sentence abstractive summaries [L6-F35.q1]; extracted relationships that may not be explicitly stated in the text [L6-F01.q1].

**RP-2** Pass A, introductions (revised for K08). Record every heading as an introducing statement (a referent named by the heading text); every explicit definition of a name ("X is", "X means", "X refers to", where the sentence says what X denotes); every naming statement ("hereafter X", "also called X"); every link whose target is a heading or definition (a definition link); and every node declaration in a diagram notation (an identifier with its node text, such as "CMD[Explicit business commands]") as a naming statement. Required: no source covers it (D5).

**RP-3** Pass B, cues. Mark every relation cue: a word or phrase that states a relation between two things or propositions. Cue classes: connectives (because, since, therefore, so, hence, given that); relation phrases (depends on, builds on, is derived from, assumes, extends, replaces, requires, uses); reference phrases (see, as defined in, per); headings, lead-in lines or table column headers that name a relation and govern a list or column ("Dependencies", "Based on:") (revised for K03, K06); links, with or without a relation word. The cue span is the minimal span containing the relation words. Text that introduces a thing without relating it is not a cue. Borrows: text units preceding a component that help recognise its type [L1-F24.q1]; no relation annotated where no explicit connective links the paragraphs [L2-F12.q2]; contiguous relation phrases [L8-F20.q1]; relations tagged only when explicitly referenced [L8-F36.q2].

**RP-4** Pass C, slots (revised for K03, K04, K06, K11, K19). For each cue, fill arg2 (governed) and arg1 (other) with verbatim endpoint expressions and type them (ID-1), or mark the slot absent. For a heading, lead-in line or table column header that governs a list or column, arg2 is each list item or cell item, one edge per item (ID-10), and arg1 is only an expression the text itself places in the relation: the subject written in the lead-in line itself ("X depends on:"), or, for a table, the key cell of the item's row (that row's cell in the table's first column). When the text places no such expression, arg1 is absent. An enclosing heading never fills a slot by position alone. Pronouns, demonstratives and phrases such as "the above" are recorded verbatim; the reader does not substitute what they refer to. Borrows: variability between annotators in how much a proposition is reconstructed [L1-F21.q2]; propositions reconstructed by resolving ellipsis and anaphora [L1-F21.q1], the step this design moves into the identity layer.

**RP-5** Label wording. The label is the cue's relation words as written, including negation, modality and hedges that modify the relation ("may depend on", "does not depend on", "should be derived from"). A link with no relation word gets the reserved label "(link)". Negated and hedged relations are thus their own labels, and their properties are decided like any other. Borrows: hypothetical relations marked apart from asserted ones [L8-F39.q1]; a graph quoted without comment on its truth distinguished from one asserted [L4-F35.q1].

**RP-6** No cue, no edge. A relation a reader infers without a cue is not recorded. If the inference is that a stated relation lacks an argument, the slot is marked absent and the gap model applies; the reader may then attach S4 to the resulting gap. Borrows: tagging a relation only when no reasonable reading leaves it false [L8-F37.q1]; excluding relations inferred from an event involving both entities [L8-F37.q2]; not tagging relations known only from elsewhere [L8-F36.q3]; leaving unannotated a relation with no explicit connective [L2-F12.q2].

**RP-7** Cross-file arguments. A cue's slot expressions are recorded where the text states them, and resolution may reach any file version of the corpus. Required: no source covers it (PROBLEM: files depend on each other; see Overrides O13).

**RP-8** Untyped cues. If a reader cannot fill a cue's slots or cannot decide whether a phrase states a relation, the cue is recorded as "relation cue not typed" with the reason, and no edge is recorded. Required: no source covers it (D10).

**RP-9** Splitting. Coordinated arguments are split under ID-10, and the edges from one cue are marked as siblings. Borrows: simple versus linked support [L1-F09.q1]; a scheme that leaves linked versus convergent undistinguished [L1-F44.q1], which this design decides only by textual joint-necessity markers.

**RP-10** Text-defined relations. When a file version defines what a relation word means (its direction, its consequence, or whether chains through it hold), record an S1 relation definition with its span, its scope (KM-7) and the properties it fixes; unfixed properties remain for S2. Required: no source covers it (block S1: explicit local definitions of a relation).

**RP-11** No preloaded labels. Readers bring no label list to reading. Labels come only from cues (KM-10), and analysts decide properties after reading (KM-12). Borrows: preconceiving theoretical codes rejected [L8-F25.q1]; relation lists deliberately left open [L2-F04.q2]; no two systems using the same set of relations [L2-F10.q1].

**RP-12** Several cues, several edges. If the text relates the same expressions by two cues, two edges are recorded. A reader never adds a label the text does not use. Borrows: several relations suitable for the same sentence [L8-F18.q1]; several labelings being correct at once [L8-F01.q3].

## Packaging and D9 proof

**PK-1** Partitions. One store with five partitions: B holds S1, S2 and S3 records; A holds S4 records; C holds S5 records; R holds S6 results kept for reference, including gap records; L holds the coverage ledger. Required: no source covers it (D9).

**PK-2** Operations. The method has exactly these operations; any other operation is outside the design.

| Op | Name | Reads | Writes |
|---|---|---|---|
| O1 | record | a range of one file version | S1 records to B; read ranges to L |
| O2 | codebook decide | S1 spans in B | S2 record to B |
| O3 | identity decide | S1 spans in B; optionally a candidate id from C | S3 record to B |
| O4 | annotate gap | a gap record in R; spans in B | S4 record to A |
| O5 | propose | records in B | S5 record to C |
| O6 | dispose | a record in C | the disposition field of that record in C |
| O7 | level query | B, filtered by QL-1 to QL-3 | an S6 result (optionally kept in R) |
| O8 | gap detection | B, filtered by level | gap records to R |
| O9 | candidate query | C | an answer listing S5 records |
| O10 | ledger update | logs of O1 to O6 | L |

Required: no source covers it (D9).

**PK-3** D1 holds. (1) Only O1 writes S1, and O1's input is a range of a file version; each S1 record carries a span inside a range that L records as read, so only text yields S1. (2) Status is fixed at creation (SM-1) and no operation edits a status field: O6 edits only the disposition field; O2, O3 and O4 create new records with their own statuses. (3) The only operation that computes similarity is O5, and it writes only S5 records into C; it writes nothing to B, A or L. (4) A similarity result reaches B only through an analyst's O2 or O3 decision, which creates an S2 or S3 record, never an S1 record, and whose evidence is spans in view (SM-9, CI-3). Hence similarity never creates an S1 record and never changes any record's status. Required: no source covers it (D1, D9).

**PK-4** L1-L3 exclude S5 by default. O7 reads only partition B, with status filter {S1} at L1, {S1, S2 at the named codebook version} at L2, and {S1, S2 at the named version, S3} at L3. C is not in O7's read set at any level, and O8 also reads only B. O9 is the only operation that reads C, and it runs only when named (QL-7). An S3 record prompted by a candidate is an S3 record, and appears only at L3 as a labelled analyst hop. Therefore no S5 record appears in any level's answer, by default or otherwise. Required: no source covers it (D8, D9).

**PK-5** Further invariants. A is read by no walking or gap operation (O7 walking, O8), so S4 never completes a chain (D6). R is read by no operation that writes base records (O1 to O3, O5) and not by O8, so derived results never become base facts or gap inputs (D7). Required: no source covers it (D6, D7).

## Overrides

Each item names a place where a pack source contradicts the constraint block. In every case the block wins (D12), and the design follows the block as stated in the elements named.

1. O1. Argument Interchange Format derived concepts. The AIF says rebut, undercut, attack, defeat and defend can in principle be derived from core concepts [L1-F04.q1], and that edges need no labels because edge types can be inferred from the nodes they connect [L1-F03.q2]. The block requires that kinds which differ are not collapsed and that label queries return the word the file used (REQUIRED RESULT, D4). Block wins: a file's "undercut" is its own label whatever it could be derived from (KM-1, QL-6).
2. O2. Small or pruned inventories. Wolf and Gibson deliberately use a small number of relations for generalisable representations [L2-F05.q2]; Habernal and Gurevych omit warrant and qualifier from their model [L1-F45.q1] [L8-F27.q2]. The block requires kinds recovered from the text, not fixed in advance. Block wins (RP-11, KM-10).
3. O3. Merging indistinguishable relations. CSTNews refined its set by removing relations not seen in training texts and merging relations annotators could not differentiate [L2-F08.q1] [L2-F08.q2]. D4 makes label merges optional S2 decisions that keep label differences. Block wins (KM-13).
4. O4. Variant forms as one type. PDTB-2.0 treats modified forms of a connective as the same type as the unmodified form [L8-F08.q1]. D4 requires label queries to return the word the file used. Block wins: variants are distinct labels unless an S2 merge groups them (KM-1).
5. O5. Implicit connectives. PDTB-2.0 inserts an implicit connective to capture an inferred relation [L8-F04.q1] [L8-F04.q2]. D1 admits only text to S1. Block wins: no edge without a cue; at most an S4 annotation on a gap (RP-6).
6. O6. Reconstructed propositions. IAT reconstructs propositions from locutions by resolving ellipsis and anaphora [L1-F21.q1]. Under S1 and D1 reconstructed text is not stated by a span. Block wins: endpoint expressions stay verbatim and resolution belongs to the identity layer (RP-4, ID-3).
7. O7. Abstractive relationships. GraphRAG's extracted relationships and claims may not be explicitly stated in the text [L6-F01.q1]. D1 admits only text to S1. Block wins (SM-2, RP-6).
8. O8. Two labels and trees. Stab and Gurevych use support and attack only [L1-F06.q2] and model arguments as trees that exclude divergent arguments and cycles [L1-F43.q1]. The block rejects a closed inventory of two relation labels (R6) and requires the plan as stated. Block wins: labels are open (KM-1) and cycles are handled at query time (DR-5).
9. O9. No explicit relations. Habernal and Gurevych annotate no explicit relations between spans [L1-F08.q1]. The block requires relation kinds recovered from the text. Block wins (RP-3).
10. O10. Forced connectedness. Budzynska et al. state that no unit is left pending [L1-F49.q1]; RST analysis seeks to include every part of a text in one connected whole [L2-F13.q1]. Applied as rules, both would force connections without cues and hide unresolved material, against D1 and D10. Block wins (RP-6, CL-4, CL-9).
11. O11. Stored inferences. PROV-Constraints applies inferences by adding new statements to the instance [L4-F29.q1] [L4-F29.q2]; OPM asserts completion edges in the same accounts as the original edge [L4-F32.q1]. D7 forbids storing derived results as base facts. Block wins (DR-1, PK-5).
12. O12. Identity from keys or similarity. Inverse-functional key properties infer new owl:sameAs links [L3-F09.q1]; without a unique name assumption shared keys entail sameness [L3-F08.q2]; a cross-document heuristic decides event identity from a similarity threshold [L3-F07.q1]; Resolver merges strings by co-reference probability [L8-F12.q1]. D5 makes identity S1 only by an explicit textual statement and otherwise S3 or S5; D1 forbids similarity changing status. Block wins (ID-3, ID-4, CI-1).
13. O13. Sentence-bound relations. ACE limits relations to those expressed within a single sentence [L8-F36.q1]. The PROBLEM states that files depend on each other and conclusions rest on premises stated elsewhere. Block wins: the cue is local, its arguments may resolve anywhere (RP-7).
14. O14. Negative relations dropped. ACE does not annotate negatively defined relations [L8-F39.q2]. The block requires relation kinds recovered from the text and every untyped cue listed (D10). Block wins: a negated cue is recorded as its own label (RP-5).
15. O15. Orphans removed. UnArch removes all orphaned changes and issues [L8-F31.q2]. D10 requires unresolved material to be explicit. Block wins (CL-9).
16. O16. Similarity-bounded examination. CST Bank preselects sentence pairs on the observation that lexically dissimilar sentences are unlikely to be related [L2-F15.q2]. Under D1 and D10, similarity may not decide what counts as examined. Block wins (CI-5).
17. O17. Automatic label merging. Resolver resolves relation synonyms from shared properties [L8-F12.q1] and aggressive clustering merges mentions [L6-F18.q1]. D4 makes label merges optional S2 decisions and D1 bars similarity from changing status. Block wins (KM-13, CI-4).

## Unresolved claims

Design points with no source (elements marked "Required"; each follows a block clause, none is supported by a pack quote):

1. Status model: SM-9, SM-10.
2. Kind model and codebook: KM-6, KM-7, KM-8, KM-15.
3. Identity layer: ID-1, ID-2, ID-3, ID-8, ID-9, ID-11, ID-12.
4. Gap model: GM-2, GM-3, GM-4, GM-5, GM-6, GM-9.
5. Derived results and paths: DR-4, DR-7, DR-8, DR-11.
6. Query levels: QL-1 to QL-7.
7. Candidate index: CI-2, CI-3.
8. Coverage ledger: CL-4, CL-5, CL-9.
9. Reading procedure: RP-2, RP-7, RP-8, RP-10.
10. Packaging: PK-1 to PK-5.

Unverified or unsupported findings that bear on the design (none is used as support):

11. Finding L2-F09 (unverified: its quotes are abstract-only). Knott's claim that relation definitions can be motivated from a corpus of over 200 cue phrases would bear on RP-3 and KM-12; the method is not verified outside the abstract and is not used.
12. Findings L4-F39 and L4-F40 (unverified: source not fetched). ECO's "assertion method" root separating manual from automatic assertion would bear on SM-1 and CL-7; not used.
13. Finding L5-F42 (unverified: abstract-only). The claim that the top-k subsets a query can return are limited by embedding dimension bears on CI-5; the design cites only the verified body statement in finding L5-F43.
14. Finding L6-F13 (unverified: abstract-only). The empirical basis of hubness on synthetic and real data bears on CI-6; only the verified body statement in finding L6-F12 is cited.
15. Finding L6-F34 (unverified: abstract-only). Measured frequency of vocabulary change and term adoption times would bear on KM-11; not used.
16. Abstract-only quotes inside otherwise supported findings are not cited as support anywhere in this design: the first quote of L1-F17, L2-F11, L2-F15, L3-F15, L5-F44, L6-F17 and L6-F33; the second quote of L4-F20, L6-F36 and L8-F12.

Seed claims the pack does not verify:

17. "Relations are sparse; the structure must be learned" (PROBLEM). No pack source measures relation density or structure in markdown plan corpora.
18. R1 as a failure for relation mapping. The pack measures position effects on question answering [L6-F09.q1] [L6-F10.q1], not on extracting dependency or reasoning links from a plan corpus.
19. R2 as a failure. The pack measures hallucination in single-document abstractive summaries [L6-F35.q1] and loss of fine-grained evidence in community summaries [L6-F07.q1]; no source tests splitting files across agents and merging prose summaries of a plan corpus.
20. R3 as a failure. The pack gives a theoretical limit [L5-F43.q1] and survey statements [L5-F45.q1] [L5-F46.q1]; none is measured on plan text.
21. R4, R5 and R6 as failures. No pack source evaluates an equality-join-only store, a one-edge-type store or a two-label inventory on plan text; the pack shows only that such schemes exist [L1-F06.q2] [L8-F29.q1] and that relation inventories vary [L2-F10.q1] [L1-F14.q1].
22. D2's three properties being sufficient, and gap roles derived from consequence. No pack source states or tests either.
23. Markdown structure (headings, lists, links) as relation cues. No pack source studies markdown; RP-2 to RP-4 extend span-annotation practice to it without evidence.
24. Achievable agreement for S2 property decisions and S3 identity decisions on plan text. Pack agreement figures concern other genres and tasks, for example CST directionality [L2-F25.q2], owl:sameAs judgements [L3-F18.q2] and commonsense relation assignment [L8-F18.q2].

Open questions:

25. QL-4 shows S4 annotations beside L2 and L3 gap answers on request; the block does not say whether S4 belongs to any level.
26. A bare "TBD" or open-question marker with no argument expressions yields no edge and therefore no gap; the block gives such text no status.
27. Reported relations ("the vendor states that X depends on Y") are recorded with the reporting frame inside the span (RP-5), but whether the edge's label should include the frame is undecided.
28. RP-4 (revised for K03, K04, K06, K11, K19) takes arg1 of a table column header from the key cell of the item's row in the first column; treating table layout as stated text is a design choice without a source.
29. ID-1 (revised for K13) types expressions by a grammatical test; nominalised propositions without their own subject ("the decision to shard") are typed name.
30. S1 local-definition scope (KM-7) defaults to the containing file version; definitions that claim corpus-wide scope are not handled.
31. Kinds with direction none are never walked by chain queries (DR-3); whether a separate connection query over them is needed is open.
32. Kind-property pressures examined under KM-15 without a counterexample: transitivity (covered by walkable [L4-F09.q1]); modality and negation (covered by labels, RP-5); joint arguments (covered by slots, ID-10); nuclearity versus headedness [L2-F38.q1] (not needed by chain or gap answers).
33. The R5 fail for M33 (GraphRAG graph) is inferred from the pack's description of relationships as abstractive summaries [L6-F01.q1]; the pack does not say whether GraphRAG types its relationships.
34. The R6 fail for M11 reads OWL 2's identity axioms as an identity inventory of exactly two relations; whether R6 should apply to identity vocabularies rather than plan relations is an interpretation.
35. Repeated names inside one file resolve only by S3 (ID-3); the effort of enumerated S3 decisions on a large corpus is unknown.
36. All simple paths (DR-6) can grow combinatorially; the design returns the hop set with predecessors, and whether a bound is required is open.
37. GM-4 (revised for K17) records every absent or unresolved slot as a dangling endpoint whatever the kind, so an absent foundation of a fails_to_follow kind is counted as a dangling endpoint, not as a missing premise.
