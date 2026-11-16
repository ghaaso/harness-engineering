# Layer 4: Evidence method (version 2)

**Borrowed whole:** a systematic review in its rapid form with GRADE certainty, the cross-field synthesis as an overview of reviews (D6 whole design: PRISMA-P, PRISMA-S, PRISMA 2020, GRADE, Garritty et al. 2021 interim rapid-review guidance). Mapping: approved question list = registered protocol; readers = searchers and screeners; cards = extraction forms; checker = second extractor; pack = evidence tables; review of our work = evidence-to-decision step; synthesis = overview of reviews. Our own work is never graded as a source.

Each rule gives its runner, its basis and what happens on failure. Labels: [pilot] or [later].

## Rules

**E1. Protocol frozen before the search [pilot].** Basis: D6-07, D6 whole, D6 missing risk "forking paths". Each field gets a `protocol.json`. It holds the approved question ids, the inclusion and exclusion criteria with fixed reason codes, the routes, the card schema version, the certainty method (E6), the smallest effect of interest per measure (E8), the stopping parameters (E5), and the out-list vocabulary (approach ids, measure ids, directions). The coordinator writes it and the owner approves it. Then `protocol-freeze.js` writes the sha256 to the ledger and commits the file outside the child's write reach. Runner: the Execution layer's admission check refuses to start any reader for a field whose protocol hash is not in the ledger. A change goes through `protocol-freeze.js --amend` with a reason. Each output records the hash it was made under, and the flow table lists every deviation. PRISMA-P is a reporting checklist, not a registry. Here the hash in the ledger plus the commit does the registry's job.

**E2. Search documented from transcripts, not from self-report [pilot].** Basis: D6-07 (PRISMA-S). Readers hold no write tools (amendment 3 row 5). `search-log.js` reads each reader's transcript and extracts every search query, the tool used, the time, the number of results and every fetched URL. Screening comes from the reader's schema-imposed result: canonical id, included or excluded, reason code. The script reconciles the two. It rejects a card whose source was never screened, or a screened item whose URL never appears in the transcript. It writes `flow.json`: identified, deduplicated, screened, excluded by reason, carded, witnessed, confirmed, cited. *Fails here:* web search through a summariser cannot be repeated exactly. It is logged anyway and marked "not repeatable".

**E3. Exclusions re-screened on a sample [pilot].** Basis: D6-07; Clopper-Pearson (D6-03). `rescreen-sample.js` draws a seeded random 20 % of exclusions (proposed). A screener helper with a different fixed brief judges them again. If the exact upper 95 % bound on the wrongly-excluded share exceeds 10 % (proposed), screening is redone for that field before the pack freezes.

**E4. Coverage by capture-recapture, read as an upper bound [pilot].** Basis: D6-04, D8-10, D8 missing risk "same original counted twice". Every card records its route (keyword, backward citation, forward citation, contrary, seed) and two ids: a canonical id (DOI, arXiv id, else a normalised title) and the id of the primary source it rests on. Captures count primary ids. A source is relevant to question q only if it yields a card tagged q whose quote witness passed (Integrity layer). Before the readers start, `coverage.js split` divides the seed list at random. Half goes into the briefs. Half is held out, outside the worktree. After Stage A, `coverage.js score` reports per question:
- Chapman: N̂ = (n1+1)(n2+1)/(m+1) − 1, where n1 is found by the keyword routes, n2 by the citation-chasing reader (briefed from the seed half only, by a fixed template) and m by both. Coverage = observed / N̂.
- Relative recall on the held-out half: r = |found ∩ heldout| / |heldout|.
- Reported coverage = min of the two, labelled "upper bound".

*What must be independent:* given relevance, being caught by one route group must not change the chance of being caught by the other. The population must be closed during the wave, and items within a stratum must be equally catchable. *Fails here:* same model, same engine, and popular papers are easier to find. That positive dependence makes N̂ too low, so coverage is overstated. Hence "upper bound", different mechanisms per route, and strata by source kind. Chapman is near-unbiased only when n1+n2 is at least about N (source correction). On failure: if coverage is below 0.6 (proposed) or not estimable (no overlap), the question is marked "coverage low or unknown" and E6 downgrades it. Overlap between fields (P7) is counted by the same script as recapture data.

**E5. Stop on saturation [later; data in pilot].** Basis: D6-12. Stop question q when the last k reader calls brought no new relevant primary and coverage ≥ 0.8, or when q's budget is spent. A question stopped by budget is marked "not saturated". In the pilot `coverage.js` only records the yield curve per call, and the stop is budget plus the child's choice, recorded. Later `stop-check.js` runs as a hook before each helper start and refuses the start. Hooks are believed, not yet verified. The knee rule carries no probabilistic guarantee (source correction).

**E6. Certainty per conclusion: the script sets a ceiling, the model may only lower it [pilot].** Basis: D6-08 (GRADE), D4-10, D5-03, D7-02. `certainty.js` computes for each conclusion and verdict:
- the start level, from the cited cards' **distinct primaries**: high only for replicated or independent controlled comparisons; low for a single study or a vendor's own report;
- the mechanical downgrades: inconsistency (cited cards with opposite directions on the same approach and measure); indirectness (a mismatch between the sentence's `applies_to` and the card's typed conditions, or a dropped condition); imprecision (one primary, no stated uncertainty, or E4 coverage low or unknown); sponsorship (more than half the primaries are vendors' own).

That gives a ceiling. The child adds the judgment domains: risk of bias, adapted from trials and stated as an adaptation, and free-text indirectness. Each downgrade needs a one-line reason. Final = min(model, ceiling). The script rejects a rating above the ceiling or a downgrade with no reason, and the review goes back. The post-review checker verifies the judgment downgrades, and each overturn is counted. A conclusion resting only on vendor or single-study primaries is labelled "judgment". Only the per-field summary-of-findings table (`sof.json`) enters the synthesis. GRADE's upgrade domains are not used.

**E7. Agreement never raises a claim [pilot].** Basis: D6-01, D4-02, D7-09, D8-03, D1-04 (Knight and Leveson; Ladha). The synthesis script ignores agreement counts. A disagreement between two opinions on a key (approach × measure) marks it weak and sends it to the one source-tied adjudication. `second-opinion.js` reports the disagreement rate. It also reports ρ, the mean phi of error indicators over claims checked in both opinions, and n_eff = n/(1+(n−1)ρ). With fewer than 20 shared checked claims it writes "not estimable". If n_eff < 1.3 (proposed), the admission rule refuses further same-model second-opinion slots until the owner reopens them.

**E8. A dismissal is an open hazard with an evidential bar [pilot].** Basis: D6-06 (Altman and Bland; Lakens), D4-12 (MIL-STD-882E), D7-03 (JTMS out-list). A dismissal is a verdict of "wrong form", "wrong problem", "not worth testing" or a dropped field. Each one is an entry in `dismissals.jsonl` with its supports (card ids) and an out-list of keys (approach_id, measure, direction). `dismissals.js` runs after each post-review check and on every card status change in any field. It enforces:
- a dismissal stands only if a confirmed card bounds the effect below the owner's smallest effect of interest, under conditions that cover ours; otherwise the script rewrites it to "untested" and keeps the wording as judgment;
- a confirmed card matching an out-list key, or a support card going stale, reopens the entry;
- the refuter attacks every standing entry, with 2 or 3 seeded false dismissals mixed in. If it misses a seed, its "upheld" verdicts are labelled unqualified.

An entry closes only with a bound, a refuter pass and a seed pass. The owner's table never shows a reopened entry as dismissed. Exit code 10 (reopened) reaches the coordinator through the watcher.

**E9. A promoted lead is judged on a new test [pilot, a rule in the evidence-to-decision brief and the test-design template].** Basis: D6 missing risk "winner's curse". The expected effect is stated conservatively. The evidence that selected a lead never counts as its confirmation.

**E10. Pilot analysis plan frozen [pilot].** Basis: D6-05, D6 missing risks "optional stopping" and "forking paths". `analysis-plan.json` fixes the units, the primary and secondary outcomes, Δ, the decision rules, one single look, the arm budgets and the label "descriptive, n = 1 per arm". The owner approves it and it is hashed like E1 before the first arm starts. If it was not frozen, `compare.js` labels every result "exploratory".

**E11. P18: the tree against one session [pilot].** Basis: D6-05, D3-12.
- Arms: the tree (child T, pack A, fresh review R1) and a single session S1 with the same token cap, schemas, checks and question ids. S2 is a repeat of S1, if the owner allows, to estimate run-to-run spread.
- Unit: the arm run. Question ids are clustered sub-units.
- Primary score Y_q: 1 if question q is answered in the claims table by a confirmed card used within its conditions.
- Secondary scores: citation failure rate, tokens and wall time from transcripts, a blinded rubric score, and confirmed answers gained per extra million tokens. The Shape layer's token predictions are stated beforehand and tested.
- `compare.js anon` strips ids, normalises format and randomises order. A blinded scorer (a different model if F3 allows) also guesses the arm. If it guesses right above 80 %, blinding is recorded as failed.
- McNemar on discordant questions, labelled conditional on the run.
- *One reading can show:* a difference larger than |S1 − S2|, a gross failure of one arm, real costs, and estimates of σ for later. *It cannot show:* equality (that needs replicates and a CI inside ±Δ), a difference smaller than the spread, or that the result holds for other fields (the pilot field was chosen, not drawn). A small difference is reported as "no difference shown".

**E12. F1: two ways to review, paired [pilot].** Basis: D6-05, D4-08, D8-07, D1-12, D7-04, D5-06.
- Arms: R_same, written in T's window, and R1, a fresh session from pack A. Both read the same pack hash and the same copy of our files, into which the Assurance layer planted k wrong assumptions. R2, a second fresh review, gives the review step's run-to-run spread.
- Unit: the review. Cells (approach × measure) and plants are paired sub-units.
- Primary score: plants found with the correct reason, out of k.
- Secondary scores: end-to-end citation failures; use outside conditions; share of judgment labels; tokens; u = factual sentences in R_same that cite no card in pack A, as a share of its factual sentences, with a checker sample of those sentences against sources (D8-07).
- Findings that match plant ids are stripped before synthesis. The fresh path runs regardless (D1-12).
- The plan names a default for "no difference shown". The coordinator proposes fresh, because it is certifiable and hermetic (D7-04, D5-06).
- *One reading can show:* whether R_same's extra sentences carry correct knowledge that the pack lost, and a gap in plants found larger than |R1 − R2|. *It cannot show* equivalence or a small difference.

**E13. F2 measured, not argued [pilot where the budget allows].** Basis: D6-10 (generalizability theory), D4-02, D8-03. Reviewer facet: R1 against R2 on pack A. Pack facet: packs from independent research runs (S1 against S2; a second tree pack B only if the owner pays a field run). `second-opinion.js` estimates σ²_pack and σ²_reviewer:pack per token. On seeded faults it computes each candidate opinion's miss rates and the beta factor p_AB / min(p_A, p_B). A 2 × 2 design gives wide intervals, so the result is indicative.

## F2 for the owner: what the classical results say

The jury theorem needs independent judges. Under correlation a majority helps only while the average correlation stays bounded relative to competence (Ladha). Independently built versions failed together far more often than independence predicts, much of it from a shared misreading of the specification (Knight and Leveson). Shared difficulty alone raises coincident failure (Eckhardt and Lee). An ensemble gains only through diversity (Krogh and Vedelsby), and measured diversity did not reliably predict accuracy (Kuncheva and Whitaker). The standard response has four parts:
1. compare to detect, never to vote;
2. send each disagreement to the acceptance test;
3. force diversity along the axis of the error (model, method or inputs);
4. measure the coupling.

The options:
- **A second research run** (amendment 1): diverse in inputs, catches faults in the pack, costs a whole field, and its disagreements cannot be located.
- **A second reviewer of the same frozen pack** (amendment 3; favoured by D7-09 and D8-03): cheap, and its disagreements can be located, but it is blind to faults in the pack.
- **A contrary-evidence reader**: input diversity at the cost of a reader.
- **A different model** (F3), for any of these.

The deciding fact is where the residual faults sit (D4-02). That is what E13 replicates: the research run that made the pack, against the reviewer of a pack.

## File formats (JSONL or JSON; every file carries `schema_version`)

- `protocol.json`: {field, question_ids[], criteria{include[], exclude[{code, text}]}, routes[], card_schema, certainty_method, sesoi{measure: value}, stop{k, coverage_target}, outlist_vocab{approaches[], measures[], directions[]}}
- `search-log.jsonl`: {reader, transcript, t, tool, query, n_results, urls[]}
- `screening.jsonl`: {reader, canonical_id, primary_id, url, decision, reason_code, q[]}
- `flow.json`: counts per stage and reason; deviations[]
- Card fields added: route, canonical_id, primary_id, q[], conditions{typed}, evidence_type, effect{value, uncertainty, direction, measure, approach_id}
- `coverage.json`: per q {n1, n2, m, N_hat, var, rel_recall, coverage_ub, status}
- `sof.json`: per conclusion {key, primaries[], start, downgrades[{domain, by: script|model, reason}], ceiling, final, label}
- `dismissals.jsonl` (append-only events): {id, verdict, supports[], outlist[], bound_card, status: untested|standing|closed|reopened, by_card}
- `analysis-plan.json`, `blind-key.json` (outside the scorer's reach), `scores.json` (scorer, schema-imposed), `comparison.json`, `second-opinion.json`
