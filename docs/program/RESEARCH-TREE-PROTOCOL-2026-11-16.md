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

## Amendment 1 (2026-11-16, on the owner's word)

The owner's idea, as he gave it: fresh child sessions are sent out to research; each fills its own
context window with high-quality knowledge and nothing unnecessary; only then does it review our work.
Sections 2, 4 and 5 above split that into two sessions per field (a builder that writes the pack and a
fresh expert that reads it). That split is withdrawn. For each field **one child session does both**:

1. **It researches the field itself.** Its helpers (readers) search and screen, so that search results
   and weak sources never enter the child's own context; they return source cards and the passages
   that matter. The child reads the best primary sources in the original, itself.
2. **It writes down what it learned** as it goes: the cards, `pack.md` and `must-read.md` are its own
   record. A checker confirms the cards against their sources, and the coordinator checks the pack at
   gate A, as before.
3. **It is checked, then it reviews.** It passes the knowledge check (section 5, step 2) and reviews
   our work in the fixed form (section 5, steps 3 and 4), in the same session, with the field still in
   its context.
4. **A second expert**, where section 6 asks for one, is a second child that does its own research
   from the same question list, so the two are independent; their packs and reviews are compared.
5. **A ceiling.** If a child's window passes 300,000 tokens before its review, it freezes its pack and
   a fresh session reads the pack and does the review. That is the exception, and the ledger records it.

Everything else stands: three levels, files as the only interface, the gates, the budgets, the ledger.

## Amendment 2 (2026-11-16): the risks of this tree, and what handles each

Written after the owner asked whether the tree's own problems had been identified. They had been only
in part: the rules of section 7 came from judgment, not from a list of failure modes. This is the list.
"had" means the rule was already above; "new" means this amendment adds it. It is the coordinator's
analysis. It has not yet been attacked by a refuter, checked against published work on how multi-agent
systems fail, or tried on a field; part D says how that happens before the tree is trusted.

### A. Mistakes that spread

| # | Risk | What handles it | |
|---|---|---|---|
| 1 | A wrong or invented source fact enters a child and travels into its review and the synthesis | Every fact enters as a source card with its number, conditions and a quote; a checker reopens each card a conclusion rests on; a review may cite cards only; the ledger counts failed citations | had |
| 2 | Anchoring: a child that is told what we hope confirms it | Neutral briefs; our work as files without verdicts; "what would change my mind" in every review; a refuter on the strongest leads | had |
| 3 | An ensemble of one model agrees for the same wrong reason, and a vote amplifies it | Facts are never voted on; a claim stands on a checked source; second experts research independently, so their agreement means something | had |
| 4 | Loss at each hand-over (helper, child, coordinator, owner): conditions fall off a summary | Hand-overs are files with fields (number, baseline, conditions), never paraphrase; the synthesis is built from the review files by a script and cites cards directly | new |
| 5 | Text on a web page steers a session | Helpers read the web; the child takes in cards and chosen primary papers; an instruction found in a source is data and is never followed | new |

### B. Coordination

| # | Risk | What handles it | |
|---|---|---|---|
| 6 | Two sessions write the same file or branch | One writer per folder; each child on its own branch; only the coordinator merges; schema check before anything is accepted | had |
| 7 | Two fields read the same sources twice | Field boundaries fixed in the question lists; a shared register of claimed sources, one line per paper, checked by a helper before it reads | new |
| 8 | Runaway fan-out | Three levels; helpers start nothing; at most six helpers per child at once; a total cap | had, cap new |
| 9 | Waiting on a stalled child, a usage limit or a sleeping PC | Time boxes; a heartbeat line in the ledger; usage read before each wave; the coordinator keeps the PC awake; a late field is restarted or dropped | had, heartbeat new |
| 10 | A crash or reboot loses a session's state | Whatever matters is in the session's folder (cards, pack, ledger); a session can be started again from its folder | new |
| 11 | The coordinator's window grows: our measured main token sink | The coordinator reads status files and verdicts only, never packs or sources; at 200,000 tokens it writes its state and a fresh coordinator takes over | new |
| 12 | Children's windows and fixed prefixes multiply the cost | Helpers return compact cards; the 300,000 ceiling of amendment 1; a lean folder with no unrelated skills, so the fixed prefix is small | had, lean folder new |
| 13 | One weak expert pollutes the synthesis | The pack check, the knowledge check, a second expert in the deciding fields | had |
| 14 | The cost is unknown until it is spent | A pilot field first: one field runs end to end, its tokens and time are measured, and the plan for the rest is set from that | new |

### C. The shape of the tree (the owner's B+ tree idea, applied)

- **Balanced.** Every expert sits at the same depth. A field never hangs under another field.
- **Inner nodes hold keys, leaves hold data.** The coordinator keeps one line per field and pointers to
  files. The knowledge lives in the leaves: the children and their folders.
- **Split on overflow.** A field whose question list or pack outgrows its limit is split into two fields
  with question ranges that do not overlap. A session whose window is full hands over to a fresh one
  (amendment 1, and row 11). Nothing grows without bound.
- **Order of work.** First the problem sheet and the measurement field, because the others are judged by
  its criteria; then the pilot field; then the rest in waves of at most three.
- **The tree is measured like anything else.** The ledger gives its seven measures. One field is also
  done by a single session without the tree, on the same budget, so that we learn whether the tree
  earns its cost.

### D. Before the tree is trusted

A refuter attacks this amendment, and one reader checks it against published work on how multi-agent
systems fail. What they find changes this file before the pilot field starts.

## Amendment 3 (2026-11-16): amendment 2 was attacked; what stood, what fell, what changes

Part D of amendment 2 asked for a refuter and a check against published work before the tree is
trusted. Both ran on 2026-11-16, and this amendment is the result. **None of the 14 rows stood as
written: 10 hold with a change, 4 do not hold, and 7 risks were missing.** The file is still a draft and
nothing starts before the owner's go. Two changes would reverse what amendment 1 says on the owner's
word. They are not made here; they wait for him (part F).

### A. How the check was done

- **Three readers** (Sonnet) collected published evidence on how systems of several agents fail, what
  they cost, and what ensembles and reviewers do. They were not shown this protocol. A second agent
  (Opus) then opened every source again: 45 findings, 31 confirmed as written, 14 confirmed with a
  correction, none dropped.
- **Three refuters** (Opus), who did not see the readers' work, attacked the protocol from three sides:
  a walk through one field and through the whole programme; cost and dynamics; knowledge and judgment.
  36 findings: 17 high, 19 medium.
- **One mapper** (Opus) set the confirmed evidence and the refuters' findings against the 14 rows. It
  rejected 10 refuter findings or fixes that misread the text or asked for more machinery than the risk
  is worth.
- **The coordinator judged** the mapper's result. Part E says where it ruled differently.
- **Cost:** ten agents, 1,183,768 subagent tokens, 17 minutes. The plan's weekly meter for all models
  read 4 % before and 4 % after; the Fable meter went from 5 % to 6 %.
- **Record:** `evidence/research-tree/attack-2026-11-16/` holds each agent's return, the combined
  result and the script. Ids such as L1-05 (a reader's finding) and R3-03 (a refuter's) refer to it.

**Limits of this check.**

1. The agents did not read the sources directly. The fetch tool hands back a short summary of a page,
   written by a small model, and long pages were cut. "Confirmed" means that two agents asking
   separately got the same numbers through that tool.
2. Several sources are recent single preprints that nobody has repeated (for instance L1-05, L1-06,
   L1-08, L2-14, L2-16), and much of what exists on orchestration is vendors' reports about their own
   systems (L1-09, L1-11, L2-08, L2-10, L2-12). No change below rests on one of these alone.
3. No source measured a tree like this one (a coordinator, one child session per field, helpers below
   it). The evidence is on chains, flat groups, debates, and one lead with parallel workers.
4. The refuters' token arithmetic uses estimated sizes. Its direction holds; its figures are not used.

### B. The 14 rows

| # | Risk | Verdict | What was wrong | The rule now |
|---|---|---|---|---|
| 1 | A wrong fact travels | holds, changed | The check ran before the review, where no conclusion exists yet. The checker was briefed by the child it checks. A 95 % sample was a gate | Every card cited in the pack's conclusions and in the review is checked after the review: a script finds the quote on the page; the checker confirms the number, the conditions, and that the citing sentence stays within them. The checker's brief is a fixed file outside the child's folder. The sample's failure rate is a ledger measure, not a gate |
| 2 | Anchoring | holds, changed | The child wrote its own question list from the direction file, which states what we hope | The coordinator writes all question lists first, as open questions with ids; the owner approves them. A child gets its list, the definition of a lead and the rules, not the rest of the direction file |
| 3 | An ensemble agrees wrongly | holds, changed | "Their agreement means something" does not hold within one model: errors correlate (L1-14) | An agreement never raises a claim. A disagreement marks it weak. The form of the second expert is the owner's call (F2) |
| 4 | Loss at a hand-over | holds, changed | The synthesis script did not exist, and free-prose reviews cannot be compared by a script | Fixed approach ids per field; reviews are keyed by approach and measure; a card's conditions are copied field by field, never summarised. The schemas and scripts are written and run on the pilot's files before wave 1 |
| 5 | Web text steers a session | holds, changed | "Is data and is never followed" is a wish. The child also reads originals | Readers hold no write or shell tools and return cards as their result; the child writes the file. The schema rejects text outside the card fields. The child reads originals only of must-read sources whose cards were confirmed |
| 6 | Two writers | holds, changed | The ledger and the source register were shared files with many writers | Each session keeps its ledger lines in its own folder, and a script merges them. One git worktree per child |
| 7 | Sources read twice | **does not hold** | The register broke the single-writer rule, races when two helpers claim one paper, and keeps a neighbouring field from a paper it needs | The register is deleted. Some overlap is accepted, and a script counts it after each wave |
| 8 | Runaway fan-out | holds, changed | "A total cap" had no figure and nobody who stops at it. It was unclear whether the coordinator counts among three sessions | The cap is the admission rule of row 14. A wave is two children beside the coordinator, unless free memory allows three |
| 9 | Waiting | **does not hold** | Nobody reads a heartbeat: a coordinating session does nothing between its turns | A watcher script per wave. It exits, which wakes the coordinator, on: done, a repair request, no progress within the time box, or spend over the field's allowance. Progress means new confirmed cards or files, not being alive. A stalled session is stopped before its replacement starts |
| 10 | A crash | holds, changed | Four different paths back into a fresh session, each with its own rule | One path: a fresh session from the frozen pack, or from `cards.jsonl` if no pack exists yet |
| 11 | The coordinator's window | holds, changed | The coordinator had duties that need reading (the problem sheet, pack coverage). Its hand-over was a summary it wrote itself | The problem sheet is a leaf session of its own. Coverage is a script over question ids. A hand-over points to the watcher's status file |
| 12 | The children's cost | **does not hold** | A window ceiling does not bound spend. By the protocol's own sizes the 300,000 "exception" is the likely path. A 60,000 floor invites padding | Spend is bounded by the admission rule of row 14. The floor is deleted. A reader takes several sub-questions. The pilot records a reader's real first-call context. Where the review runs is the owner's call (F1) |
| 13 | A weak expert | **does not hold** | Under amendment 1 the knowledge check became a self-test: the child wrote the questions and the keys, then answered them | The self-written probe is deleted. An expert is certified from outside: the approved question list is covered by confirmed cards; what it read matches its input list; every card it cites is confirmed and used within its conditions; a verdict that rests only on vendor or single-study cards is marked as judgment |
| 14 | Unknown cost | holds, changed | Part C ran the measurement field before the pilot. Nothing turned the pilot's number into a stop. Token counts were self-reported | The measurement field is the pilot. Tokens are counted from the transcripts by a script. A wave starts only if the remaining cap covers its fields at the pilot's measured cost, with a margin the owner sets |

### C. Risks the list did not name

| # | Risk | Basis | Handling |
|---|---|---|---|
| 15 | A lead that was wrongly dismissed is never challenged: the mistake that started this programme | argument (R3-03) | The refuter attacks every dismissal ("wrong form", "wrong problem") and every dropped field, not the strongest leads. A promoted lead is attacked by the methodologist's review of its test design |
| 16 | The search decides what the expert knows: ranking, popular papers, vendors' reports | sources and argument | A card's evidence field is one of: replicated, independent, single study, vendor's own. The earlier research files are seeds. One reader per field looks for the strongest evidence against the field's main findings (the coordinator's addition, argument only) |
| 17 | A correct card used outside its conditions | sources and argument | Part of the post-review check of row 1. The failure rate goes into the ledger |
| 18 | The tree may not beat one session at the same budget | sources (L2-05, L2-06, L1-03) | The single-session control runs on the pilot field with the same budget and checks and a score fixed beforehand. It is one reading, not a verdict |
| 19 | A child that is busy but not progressing | sources (L1-01, L2-07) | The watcher measures progress, not liveness (row 9) |
| 20 | Checker and checked share blind spots where the check is a judgment | sources (L1-14, L1-12, L3-09) | Every check is tied to the quoted passage. For a judgment that cannot be avoided, a different model where the owner allows one (F3) |
| 21 | A check that "opens the source" sees a small model's summary of it, not the source. Found in this check itself (part A, limit 1) | observed | The quote check runs as a script on the page's own text, not through the fetch tool. To be built and tried in the pilot, on the owner's word (F5) |

### D. The shape (part C of amendment 2)

- **A plain hierarchy is supported.** A coordinator that checks what comes up, leaves that do not talk
  to each other, outputs that do not overlap. In the scaling study a centrally checked team amplified
  errors least (4.4 against 17.2 for independent agents; the paper notes that the effect loses
  significance after its controls), and a hierarchy lost least to faulty agents (L1-03, L1-04).
- **Of the B+ tree properties, two were already rules and stay**, under plain names: the coordinator
  holds pointers, not contents (row 11), and a full session is replaced by a fresh one (row 10).
  "Balanced" only restated "three levels".
- **"Split a field in two on overflow" is withdrawn.** It was the coordinator's own application of the
  idea, and it was wrong: it fires after the research budget is spent and cuts one expertise in two. An
  over-limit pack is cut to its limit, with the rest listed as "not covered". A new field needs an
  amendment.
- **The B+ tree idea itself is not judged here.** It is a subject of the orchestration field
  (direction, lane 7).
- **The single-session control** was the most valuable line of part C and had no score. See row 18.

### E. Where the coordinator ruled differently from the mapper

1. The mapper: children never see the direction file. Ruling: they get its definition of a lead and its
   rules, not its sections on our own test and on what we hope.
2. The mapper: delete the B+ bullets. Ruling: part D. Two stay as rules, one is withdrawn, and the idea
   goes to lane 7.
3. The mapper ranked "the review runs in a fresh session" first among its changes, and "the second
   expert is a second reviewer of the same pack" eighth. Both reverse amendment 1. Ruling: not made;
   part F.
4. Added by the coordinator: the contrary-evidence reader of row 16, and row 21.
5. Keeping the PC awake: until a watcher is shown to do it, the coordinator keeps its turn open with
   bounded waits. This check did so (two waits, 16 minutes).

### F. The owner's decisions

- **F1. Where the review runs.** Amendment 1, on his word: the child that researched also reviews, in
  the same session. The check says: review in a fresh session that holds only the frozen pack, the
  must-read sections and the review files. For it: a focused context scored higher than a long, mixed
  one (L2-11, L2-12); that window would hold nothing the checker dropped; and it is the path a crash or
  a full window takes anyway. Against it: a hand-over loses caveats (L1-07, L1-09), and the researcher
  has read more than its pack says. No source compares the two for this job. **Recommendation: the
  pilot field decides.** Both reviews are written there and scored on the score fixed beforehand.
- **F2. The second expert.** Amendment 1: a second child does its own research. The check says that
  within one model this buys little independence (L1-14) at the price of a whole field run.
  **Recommendation:** a second reviewer of the same frozen pack, in fields chosen after the first
  reviews are in. The contrary-evidence reader of row 16 does what independent research was for.
- **F3.** Whether a model other than the child's may be used for second reviews and judgment checks.
- **F4.** The cap (10 % of the week is proposed) and the margin of the admission rule.
- **F5.** The script of row 21, which fetches pages itself to find a quote.

### G. Not established

The pilot measures what it can of these.

- Whether the tree beats one session at the same budget for this kind of work.
- Whether a fresh reviewer loses more than it gains.
- How much of the week one field costs.
- Whether our own result files anchor a reviewer even without verdicts.
- Whether a watcher can keep the PC awake and wake the coordinator.
- What share of a helper's fixed prefix a lean folder removes.

### H. The order of work now

1. The owner's go, and F1 to F5.
2. The coordinator writes the question lists and the approach ids; the owner approves them.
3. The schemas, the check script, the synthesis script and the watcher are written.
4. The pilot: the measurement field, with both reviews of F1 and the single-session control.
5. The owner sees the pilot's reading and sets the margin.
6. The other fields, in waves.

## Amendment 4 (2026-11-16): the rules above are replaced by version 2

The owner ruled that these problems are instances of problems that established branches of computer
science have already solved, and that the fixes should be those branches' standard solutions (he is
himself reusing distributed systems and B+ trees). Eight field experts mapped the 21 problems to 103
classical solutions; six designers wrote version 2 from them; its coordination rules were
model-checked; four refuters attacked it; it was revised. The current design is
`RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`, and its record is `evidence/research-tree/foundations-2026-11-16/`.
This file stays as the record of how the problems were found. Amendment 1 stays in force until the
owner rules, as version 2 says in its section 12.
