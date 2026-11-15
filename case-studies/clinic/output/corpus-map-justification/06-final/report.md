# Justification pass: final package for user review

Run 2026-10-06 to 07 under the user-supplied method (constraint block v1; 8 lanes; deterministic reducer; independent pilot annotator; one reasoner; one skeptic; one response round; stop). This package is for **your** review. The model closed no counterexample and no unresolved claim. Parameters, gate evidence and incidents are in [run.md](../run.md).

## Headline

- **Design.** One design was emitted, with 99 numbered rules. 55 borrow from verified quotes, and 44 are marked "required: no source covers it", each naming the block clause that requires it. The skeptic made 21 attacks. The reasoner **accepted 12** and revised 15 elements, and **rejected 9** (3 on G1, 6 on G2).
- **The pilot check failed in a way that matters.** Applied by hand, the design **did not reproduce the independent annotator's chain at any level** and **reproduced the frozen gap only partly** (C7). The reasoner argues the block requires this (K18, K20): two of the annotator's three hops are joined by a shared "$8" figure rather than by any relation cue, and an unmet requirement is not a gap role. You need to decide this; see [unresolved.md](unresolved.md) A1.
- **Post-pass L3 check (2026-10-07, requested after the pass stopped):** [07-l3-check/verdict.md](../07-l3-check/verdict.md). Under the revised design, with identity decisions allowed, the chain is still **not reproduced**. The two $8 links cannot be joined at any level: they have no cue, and the $8 mentions are not substitutable, so identity cannot bridge them. The one cued link (USER-04 → A11) depends on an unsettled design question: what evidence an analyst needs to declare a relation walkable. The gap is PARTIAL, as before.
- **Re-application of the revised design (2026-10-08):** [08-reapply/summary.md](../08-reapply/summary.md). This replaces C1-C7 for the current design.
  - Hop 1 is **conditional**. It connects only when three analyst decisions are made together: the "Evidence" relation is declared walkable, "USER-04/05" is read as two items, and the row key "A11" is given a referent. Without borderline records it also needs two analyst-created, ungrounded referents for the brief's USER-04/05. A connection is not evidence that the two-items reading is correct, and the baseline stays `cannot tell`.
  - With an open vocabulary there are 692 edges and 242 labels. 61% of the labels are used once, and folding case and inflection removes only 8%. These counts carry an unquantified-omission qualification: two excluded headers alone imply at least 38 more edges.
  - There are 1,166 dangling endpoints at L2, and 785 distinct unresolved names (805 occurrences). *Corrected:* an earlier line here said identity, not vocabulary, is the scaling cost. No analyst effort was measured, so that claim is withdrawn. Unresolved names are numerous; whether they dominate cost is unknown.
- **Evidence base.** 310 findings from 89 works. 575 of 579 quotes were verified by exact match against the reducer's **own** re-fetch, and 304 findings are supported.

## 1. The design, as revised

[`04-design/design.md`](../04-design/design.md) (SHA-256 `f6e561fc…`) is the revised design. The original is frozen as [`design.v1.md`](../04-design/design.v1.md) (`c760a1a9…`). Its core mechanisms:

- **Status model (SM).** Each base record gets one status (S1-S5) at creation, and the status never changes. S1 has exactly four record types, all span-backed. S6 labels query results only. Repetition never promotes a record.
- **Kinds (KM).** A label is the cue text as written. A kind is that label plus the three D2 properties, each sourced from an S1 local definition or an S2 decision. A kind missing a property is inert for any operation that needs it, and the operation reports "unresolved vocabulary". Merges are optional S2 records that never replace a file's word. *Revised (K01, K02):* an S2 decision may split a label into senses (KM-17).
- **Identity (ID).** At L1/L2, a name resolves only through a definition link, an explicit identity statement, identical spans or, *after revision (K08)*, a diagram node declaration. Everything else needs an S3 decision: same, different or cannot tell. Identity is never closed transitively in storage.
- **Gaps (GM).** Gaps are keyed per (edge, slot, level, codebook version). The role comes from consequence or from the identity layer. *Revised (K17):* a dangling endpoint takes precedence over the consequence role, so a vocabulary decision cannot re-attribute an absence.
- **Paths (DR).** Chain and path answers return every hop with its property sources and distances. They are simple paths with cycles reported, and they are never stored as edges. *Revised (K12):* the reverse query got its own frontier and answer form.
- **Reading procedure (RP).** Three passes per file version: introductions, cues, then slots. There is no preloaded label list, and no edge is recorded without a cue. *Revised (K03, K04, K06, K11, K19):* the dependent slot comes only from the lead-in's own subject or the table row's key cell. Otherwise it stays absent. It is never the enclosing heading.
- **Packaging (PK).** One store with five partitions and ten named operations. The D9 proof shows that only O1 writes S1, that the similarity operation writes only to the candidate partition, and that no level query reads that partition.

## 2. Rejection check

[`04-design/rejection-check.md`](../04-design/rejection-check.md) has 64 candidate formalisms (22 reading procedures, 42 models or stores) plus THIS DESIGN, for **401 cells** with none blank. The cells break down as **197 pass, 192 N/A** (each with its reason; N/A is never a pass) and **12 fail**:

| Rule | Failing candidates |
| --- | --- |
| R1 | single long window |
| R2 | GraphRAG extraction + summarisation |
| R3 | CST Bank similarity preselection; embedding top-k as context |
| R4 | key-based consolidation; UnArch graph |
| R5 | owl:sameAs closure; vector store; GraphRAG graph (inferred); UnArch graph |
| R6 | essay tree with support/attack; OWL 2 equality/inequality (an interpretation) |

THIS DESIGN scores pass on R1-R6 and D1-D11. That is the reasoner's self-assessment. The gates check completeness, not correctness, and the skeptic tested the design only through its attacks.

## 3. Verified source pack and research ledger

- [`02-pack/pack.jsonl`](../02-pack/pack.jsonl) is the pack.
- [`ledger.md`](../02-pack/ledger.md) is the PRISMA-style research ledger, per lane.
- [`drop-log.md`](../02-pack/drop-log.md) logs every drop, unverified quote and merge, with its key.

Quotes were checked with exact substring matching after the specified normalisation, with no fuzzy matching. The checks were run by `tools/reduce.py` against its own fetch of each source.

| Lane | Queries run | Findings | Quotes verified | Supported findings |
| --- | --- | --- | --- | --- |
| L1 Argument graphs | 29 | 52 | 77/77 | 52 |
| L2 Discourse inventories | 38 | 38 | 86/86 | 37 |
| L3 Identity layer | 26 | 25 | 56/56 | 25 |
| L4 Provenance | 34 | 42 | 80/84 | 40 |
| L5 Stores & queries | 12 | 48 | 77/77 | 47 |
| L6 Failure modes | 14 | 36 | 63/63 | 34 |
| L7 Coverage ledgers | 23 | 29 | 48/48 | 29 |
| L8 Extraction & kinds | 39 | 40 | 88/88 | 40 |

Every lane question has at least one supported finding; no lane came back thin. The 4 unverified quotes all come from one source, ECO, which the reducer could not fetch. Seeds that are still unread are listed in [unresolved.md](unresolved.md) section C, including **Kruchten 2004 and its definition of "constrains"**.

## 4. Borrowed vs required, and overrides

[`04-design/borrowed-required.md`](../04-design/borrowed-required.md) has 99 rows: 55 borrowed, each with verified quote IDs, and 44 required.

Most required elements sit in the parts the block itself invents:

- query levels (QL-1 to QL-7)
- packaging (PK-1 to PK-5)
- gap roles and precedence (GM-2 to GM-6)
- the identity resolution rules

Overrides: 17 places where a source contradicts the block, and in every one the block wins (design § Overrides). Examples:

- PDTB's inserted implicit connectives and IAT's reconstructed propositions conflict with D1.
- PROV-Constraints and OPM storing inferences conflict with D7.
- Identity inferred from keys or similarity thresholds conflicts with D5.
- ACE's single-sentence relations conflict with the cross-file problem statement.
- AIF's derivable attack kinds and CSTNews's label merging conflict with D4.

## 5. Pilot record and counts C1-C7

- **Pilot files.** Four files from the corpus: [`docs/clinic-planning-brief.md`](../03-pilot/files/docs/clinic-planning-brief.md) and three from `docs/technical-plan/` (`decision-log.md`, `architecture.md`, `README.md`).
- **Frozen record.** [`03-pilot/freeze.txt`](../03-pilot/freeze.txt) holds the SHA-256 and git blob hashes, the guide and annotation hashes, and the annotator-independence evidence.
- **Annotator independence.** The annotator ran as an `Explore` agent with no project instruction file. Its transcript shows exactly four reads, of byte-identical copies of the pilot files at a neutral path. All 8 of its quotes verify against the frozen files.
- **Frozen chain:** brief USER-04 ($8/month cap) → decision-log A11 → architecture's "$8 quote" hard gate → README's $7.79/month total.
- **Frozen gap:** itemised recurring hosting arithmetic is required but never supplied.

Counts from [`05-skeptic/pilot-counts.md`](../05-skeptic/pilot-counts.md). They describe **design.v1**. The audit trail is [`pilot-application.jsonl`](../05-skeptic/pilot-application.jsonl), 1,318 items, all quote-verified.

| # | Result |
| --- | --- |
| C1 | 427 attested edges (brief 98, decision log 116, architecture 137, README 76). 114 come from table headers read as lead-ins, 29 from mermaid arrows and 22 from bare links. These are lower bounds (see limits). |
| C2 | 120 new labels in reading order (45, 21, 37, 17). The curve does not flatten: the last file still adds 17 labels, which is 65% of the labels it uses. Most differ only by inflection, case, negation or hedge. |
| C3 | 0 labels have properties the text defines. The one local definition ("Arrows mean calls/reads") fixes none of the three. 120 labels need a codebook decision. |
| C4 | 120 labels need properties. *Corrected 2026-10-07: this does not mean 120 analyst decisions.* One merge record (KM-13) can set properties for several labels, while sense splits and assignments add records, so the workload is not fixed by the label count. 16 decisions were actually made, skeptic-provisionally (v1-v16), only to exercise L2. |
| C5 | 62 identity decisions are needed and none was made. 12 can never be "same" (set and range citations). 563 dangling endpoints at L2/v0: 500 names, 56 absent slots and 7 links to whole files. |
| C6 | *Correction (2026-10-07, user review, checked against `pilot-application.jsonl`): pilot-counts.md says 25 of the 37 external-link slots still yield no gap at v16. The correct figure is 27, because only 10 of the 12 v16 gaps (GAP-003 to GAP-012) are on external slots; GAP-001/002 are absent slots. The skeptic's file is unchanged.* L1 returns no gap answers. L2/v0 has 563 dangling endpoints only, because every kind is inert. L2/v16 has 561 dangling endpoints, 2 missing foundation, 4 missing premise and 6 unspecified name. The longest chain is 1 hop, and no hop crosses files. |
| C7 | Chain **not reproduced** at any level. Hop 1 fails twice: the heading replaces A11, and "USER-04/05" cannot resolve. Hops 2-3 have no cue and exist only as S5 candidates on "$8". Gap **partly reproduced**: "See operations-and-costs.md" becomes a missing premise at L2 with one provisional decision, but the itemised-arithmetic core is missed. There are extra gaps, as in C6. |

**Limits.** Four files say nothing about coverage or saturation. These are model-produced counts; the frozen annotation is the only independent element, and its annotator was a model. A "mostly gaps" result is the expected outcome on a loosely linked corpus, not a success criterion. The skeptic's reading choices are listed in pilot-counts.md and move the numbers.

## 6. Every counterexample

[`counterexamples.md`](counterexamples.md) shows each attack in full: passage, produced edge or gap, cited rule and argument. It also gives the reply: the applied diff for an accepted attack, and the G1 design step or G2 rule quote for a rejected one.

| Attack | Line | Reply | Attack | Line | Reply |
| --- | --- | --- | --- | --- | --- |
| K01 | A1 | accept | K12 | A7 | accept |
| K02 | A1 | accept | K13 | A8 | accept |
| K03 | A2 | accept | K14 | A8 | reject G1 |
| K04 | A2 | accept | K15 | A8 | reject G2 |
| K05 | A3 | reject G1 | K16 | A9 | accept |
| K06 | A3 | accept | K17 | A9 | accept |
| K07 | A4 | reject G2 | K18 | A10 | reject G2 |
| K08 | A4 | accept | K19 | A10 | accept |
| K09 | A5 | reject G2 | K20 | A10 | reject G2 |
| K10 | A5 | reject G2 | K21 | A10 | reject G1 |
| K11 | A6 | accept | | | |

The reasoner had already flagged three of the accepted points as its own open questions before the skeptic ran: heading-as-endpoint (#28), clause/name typing (#29) and absent-slot precedence (#37).

## 7. Unresolved claims

[`unresolved.md`](unresolved.md) has two parts:

- **Part 1** is the design's 37 unresolved items, copied verbatim. They are unsourced design points, unverified findings, seed claims the pack does not verify (for example R1-R6 as *measured* failures on plan text, and markdown structure as relation cues) and open questions.
- **Part 2** is what the run raised: decisions awaiting you, the scope of the pilot counts, still-unread seeds and process limits.

## Gates

| Gate | Result |
| --- | --- |
| G0 | Constraint block hashed: `a373536b…` |
| G1 | 8/8 lane files valid, each with a query list |
| G2 | Pack built; every quote verified or marked; ledger complete |
| G3 | Pilot hashed; annotator independence confirmed by transcript |
| G4 | All sections present; no blank rejection cells; every citation is a verified quote of a supported finding |
| G5 | Every attack passage quote-checked; every rejection cites exactly G1 or G2 with verbatim evidence; only accepted points revised |

Every gate was re-run by the orchestrator, not taken from the role's own report. Isolation was checked per role from transcripts: lanes, annotator, reasoner (both rounds) and skeptic opened nothing outside their allowed inputs.

## Reproduce the mechanical steps

```bash
python output/corpus-map-justification/tools/reduce.py --workdir output/corpus-map-justification --cache tmp/corpus-map-justification/cache/reducer --retry-failed
```

```bash
python output/corpus-map-justification/tools/gates.py g4 --workdir output/corpus-map-justification
```

```bash
python output/corpus-map-justification/tools/gates.py g5b --workdir output/corpus-map-justification
```

`python` here means the interpreter configured as `clinicWorkflow.python` in this checkout. Re-running `reduce.py` re-uses its fetch cache. Deleting the cache re-fetches, and live pages may then differ.
