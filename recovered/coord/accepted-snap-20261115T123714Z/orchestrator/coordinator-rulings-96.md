# Coordinator ruling 96, on graph kinds that only the held-out graphs have

Ruled by the coordinator on 2026-11-15 at about 03:00Z (file hash and exact time are in `progress.jsonl`,
line `rulings_96`), while stage B was training and before any stage-B or held-out score had been read.
Raised by a grader-side check of the answer seeds (`build/sealed/grader/embeddings/coordinator/seed-precheck.json`).
It goes to the end of section M word for word.

96. Kinds seen only in held-out graphs. This is an exception to ruling 79's "beyond its size counts",
    made by the coordinator and limited to names: from the exported graphs the coordinator read only
    the sets of relation names and of node-kind, area and code-flag values per parent, no triple and no
    path. Result: the held-out parents' graphs hold one relation type and two node kinds that no tuning
    checkpoint has, in 69 of the 70 parents (37 relation types against 36); the area and code-flag
    values are the same. A model or a ranking step that meets a relation or a node kind it has never
    been run on could fail in the single held-out run, where a code fix has no path after the freeze.
    Therefore: (a) the rehearsal of ruling 86(b) also trains and ranks, for every arm's selected
    settings, on a copy of a tuning graph into which one relation type and two node kinds with made-up
    names are injected (non-code nodes of area `other`, tied to existing code entities by the new
    relation), and the ruling-79 probe's synthetic graph carries 37 relation types; (b) the lane is
    told that such kinds exist and how many, not their names, and reads no held-out graph for this;
    (c) the result names it as a difference between the splits: the held-out graphs carry a layer the
    tuning graphs lack, so the settings were chosen on graphs without it.
