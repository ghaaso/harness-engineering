# Research tree protocol: experts first, reviews second (draft for the owner, 2026-11-16)

**Status: a draft. Nothing starts until the owner says go or changes it.** It goes with
`RESEARCH-DIRECTION-2026-11-16.md`, which says what is asked. This file says how the sessions and agents
are arranged, so that a mistake in one place cannot spread.

## 1. Why this shape

- An agent asked what it thinks of our work answers from its training and from whatever the brief hints
  at. That is a raw opinion. So a reviewer is first made an expert: its context is filled, precisely,
  with the field's primary knowledge and nothing else. Only then does it see our work.
- A tree of sessions and an ensemble of agents multiply a mistake if the structure is loose. So the
  tree, the roles, the files and the order are fixed before anything runs.

## 2. The tree: three levels, never more

| Level | Who | Does | Never does |
|---|---|---|---|
| 0 | The coordinator: one fresh session in this repository | Starts and checks everything; owns the gates, the budget and the ledger | Reads sources or reviews work itself |
| 1 | Per field: one pack builder, then one expert (a second expert in at most three fields) | The builder makes the knowledge pack; the expert reads it, is checked, then reviews | Talks to another level-1 session; writes outside its own folder |
| 2 | Helpers of a level-1 session: readers (Sonnet), checkers (Opus) | One bounded job each, returned as a file in a fixed form | Starts other agents |

Experts never see each other's output. Everything passes through files that the coordinator checks.

## 3. The fields

Seven experts, from the lanes of the direction file: (2) graphs and knowledge graphs inside coding
agents; (3) learned encoders on code; (4) memory, knowledge layer, time and caching; (5) neuro-symbolic
methods; (6) the local card and small models; (7) orchestration structure; (8) measurement in general,
whose expert is the methodologist. Lane 1 is not a field: it is **the problem sheet**, written by the
coordinator from our own measurements (where tokens, time and errors go), and every expert gets it with
our work.

## 4. Stage A: building a field's knowledge pack

1. **Question list.** The builder writes the field's questions from the direction file and the kinds
   of source it will accept: papers, code and benchmarks from 2023 to 2026, and engineering reports
   that give numbers.
2. **Readers** (Sonnet, in parallel, each on its own sub-question) find and read sources and write one
   **source card** per source: id, citation, address, date, what was done, the measured effect (measure,
   number, baseline), the conditions (task, repository size, model), how strong the evidence is, its
   limits, one quote of at most 15 words, and which of the seven measures it bears on. No project
   name, path or code goes into a search.
3. **Checker** (Opus) opens every card that a conclusion will rest on, and a sample of the rest, and
   confirms the number and its conditions. A card whose source cannot be opened or whose number does
   not match is dropped.
4. **The pack.** The builder assembles `pack.md`: a map of the field in one or two pages; the cards
   grouped by mechanism; where the literature disagrees; what is not known; a glossary. It stays
   within 60,000 to 90,000 tokens. Beside it: `must-read.md` (five to eight sources worth reading in
   the original, with the sections to read) and `probe.json` (twelve questions with answer keys and
   card ids).
5. **Gate A** (coordinator): the files pass the schema check; at least 95 % of checked cards were
   confirmed; the pack covers the field's questions and fits the size. Then the pack is frozen and its
   hash is recorded.

## 5. Stage B: the expert

1. **A fresh session.** Its whole brief: read `pack.md` completely, then the must-read sources. No web
   search, no other file. Its context then holds the field and nothing else.
2. **The knowledge check.** The expert answers the probe questions with card ids and writes one page:
   what works, under which conditions, what is unknown. A checker grades it. Below 10 of 12, the pack
   is repaired or a new expert is started from it.
3. **Only then the review.** The expert is given our work as files: the problem sheet, and the
   protocols, results and designs that belong to its field (a fixed list per field). It is not given
   the coordinator's opinion, the owner's hopes or another expert's review.
4. **The review has a fixed form.** For each of our approaches in its field: what we assumed; what the
   literature says about that assumption (card ids); a verdict (sound, wrong form, wrong problem, or
   untested); the strongest form and what it needs (data, compute, card memory); the expected effect on
   which of the seven measures, with the strength of the evidence; the cheapest decisive test; what
   would change the expert's mind. Every factual sentence cites a card or one of our files. Anything
   else is marked as judgment.
5. **One repair.** An expert that finds its pack lacks something asks the coordinator once. The gap
   goes back to stage A, and a new expert is started from the repaired pack.

## 6. Ensembles, kept small

- One expert per field. After gate A the coordinator names at most three fields that decide the next
  experiment; each of those gets a second expert from the same pack, working alone. Their reviews are
  compared sentence by sentence: where two instances with the same knowledge disagree, the claim is
  weak.
- The methodologist reviews every test design the others propose.
- One refuter (Opus, fresh) attacks the three strongest leads with the packs in hand.
- **How results are combined.** Facts are not voted on. A claim stands if it cites a confirmed card.
  Claims that conflict are both kept, with their sources, and marked open; the coordinator may order
  one adjudication, in which a checker opens the cited sources again. One round, no debates. Which test
  to run first is the owner's choice from a table.

## 7. Rules that keep it from turning into chaos

1. **Fixed tree, roles and places.** Nobody writes outside its own folder; shared inputs are read-only.
2. **Files are the only interface.** Each kind of file has a schema; a script checks it before the
   coordinator accepts it.
3. **Gates in order:** direction approved; packs frozen; experts checked; reviews in; ensemble table;
   the owner chooses the tests. A field that fails a gate is repaired or dropped with a note. It never
   holds up the others.
4. **Budgets.** A token ceiling per pack and per expert, at most three sessions at once on this PC,
   and a time box for every step. The plan's usage is read before and after each wave. At the cap the
   programme stops and reports.
5. **No experiment, install or training** in this programme, and no reading of sealed test material.
6. **A ledger.** Every session and agent writes its start, end, tokens, outputs and failures to
   `research/LEDGER.jsonl`, so the programme can report its own seven measures, including how many
   citations failed their check.
7. **No silent waiting.** A child that is quiet past its time box is reported; the coordinator moves on.
8. **Changes to this protocol** are made only by the coordinator on the owner's word, as a dated
   amendment at the end of this file.

## 8. Where the files go

```
research/2026-11-harness-leads/
  LEDGER.jsonl
  problem-sheet/                      the coordinator's sheet from our own measurements
  fields/<n>-<name>/pack/             cards.jsonl, pack.md, must-read.md, probe.json, CHECK.json
  fields/<n>-<name>/expert-<k>/       probe-answers.json, state-of-field.md, review.json, review.md
  synthesis/                          claims-table.json, the leads page, test-designs/
research/schemas/                     one schema per kind of file, and the checking script
```

## 9. Budget (proposal)

The whole programme may use at most 10 % of the week's allowance unless the owner sets another figure:
about half for the packs, a quarter for the experts, a quarter for checks and the synthesis.
