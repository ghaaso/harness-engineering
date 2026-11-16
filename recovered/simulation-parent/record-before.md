# Library pathways: the map, three conditions and the limitations (2026-11-13)

**Generated file.** Built by `docs/program/evidence/library-pathways/build-page.js.txt` from `docs/program/library-pathways/` (map.json, params.json, engine.js, limitations.json, cases.json) and `page-src/text.json`. The owner reads `docs/program/library-pathways/index.html`, built in the same run. Do not edit by hand.

**Rules.** This record maps and measures. It holds no fixes and no judgment on whether the library reaches its goal. Tags: [M] measured on this PC; [S] outside study or price list; [G] guess. A computed number takes the weakest tag of its inputs. Almost every computed number here is a guess (G). In a table, the tag in the heading covers its column. The 59 [M] real cases are chosen problem cases: they show where steps break, never how often.

## 1. The map

One piece of work: a fix-sized task of about ten cheap calls, where a result is produced and checked. Cheap-call equivalents. One call by the cheap model (Sonnet) costs 1. Lookup, screen, carry and handoff are paid at the cheap tier. One period is 30 days. The number of periods is a run setting: it is chosen, never drawn and never swung.

The graph has 40 [M] states and 83 [M] branches over eleven stages and an outcome, plus one link with no lookup: checks promoted into the shared tests, from the stock of good entries to every gate. It has 61 [M] settings: 60 [M] unknowns drawn in the runs (51 [M] guesses, 7 [M] from outside studies, 2 [M] measured), plus the horizon, which is chosen. 40 [M] unknowns are library unknowns, in four groups: comes back 6, reach 8, entry quality 22, running cost 4 [M].

- **Strong model directly.** Opus does the work. If the gate catches a wrong answer, Fable tries. No library.
- **Cheap model with the ladder.** The cheap model tries first. A caught failure gets one cheap retry, then Opus, then Fable. No library.
- **Cheap model with the library.** The same ladder, plus the library. A lookup comes before the cheap attempt. Opus and Fable solves are written back as entries.

Design steps to model stages (set by hand): 1 L1; 2 L1; 3 L2; 4 L2; 5 L4; 6 L3+L5; 7 L6; 8 L7+L8+L9; 9 L10; 10 L11. The walks used the design's ten steps; the model has eleven stages. The match was set by hand. Step 1 sits with the trigger. Step 6 covers the screen and the cheap attempt.

## 2. The funnel, last period [G]

Start with a hundred pieces of work the cheap model would get wrong alone. Each bar is how many are left after one step. Counts under each bar are from the data files [M]; the match of bars to design steps is set by hand.

| Stage | Middle values | All-good setting | Design steps | Limitations [M] | Cases broke [M] |
| --- | ---: | ---: | --- | ---: | ---: |
| An entry is held for it | 13.1 | 92.0 | no step |  |  |
| It is looked up | 4.8 | 67.5 | 1, 2 | 8 | 24 |
| The right entry comes back | 2.3 | 59.7 | 3, 4 | 17 | 28 |
| It is a good entry, not a bad one | 1.3 | 55.7 | 9, 10 | 22 | 39 |
| It passes the screen | 1.1 | 55.0 | step 6 sits under the last bar |  |  |
| It is in the window when needed | 0.97 | 53.9 | 5 | 2 | 2 |
| The cheap attempt comes out right | 0.35 | 31.7 | 6 | 3 | 31 |
| After the cheap attempt | | | 7, 8 | 17 | 40 |

The match of bars to design steps was set by hand. No step sits at the first bar. Bad entries come from writing (step 9) and from going stale (step 10). So both steps sit at the good-entry bar. Step 6 covers the screen and the cheap attempt, so it sits under the last bar only. Checks promoted into the shared tests do not pass through this funnel. They reach the gate with no lookup. Of the same hundred, they catch 0.04 [G] more at the first gate at middle values, 2.8 [G] at the all-good setting.

## 3. Three conditions, last period [G]

The library side of the model holds three conditions. Each is a group of unknowns with a poor end and a good end. Comes back: Much of the work comes back, so an entry could exist for it. Reach: An entry reaches the cheap model, when one could exist. Entry quality: The entry is right, and the cheap model uses it rightly. One more group is what the library costs to run. In the corners it stays at its middle value. Each condition at its poor or its good end. Every other unknown stays at its middle value. Last period. Below one, the library's figure is lower. Today's notes are in every way of working: CLAUDE.md, the memory notes, checks in the shared test run. So they cancel out.

| Setting | Cost / ladder | Wrong / ladder | Cost / strong | Wrong / strong |
| --- | ---: | ---: | ---: | ---: |
| Every unknown at its middle value | 1.03 | 1.01 (near) | 0.89 | 1.91 |
| Little comes back, low reach, poor entries | 1.03 | 1.02 | 0.89 | 1.94 |
| Little comes back, low reach, good entries | 1.01 (near) | 1.00 (near) | 0.87 | 1.90 |
| Little comes back, high reach, poor entries | 1.43 | 1.56 | 1.23 | 2.96 |
| Little comes back, high reach, good entries | 1.06 | 1.00 (near) | 0.91 | 1.89 |
| Much comes back, low reach, poor entries | 1.04 | 1.02 | 0.89 | 1.94 |
| Much comes back, low reach, good entries | 1.03 | 0.92 | 0.88 | 1.74 |
| Much comes back, high reach, poor entries | 1.53 | 1.71 | 1.31 | 3.25 |
| Much comes back, high reach, good entries | 0.82 | 0.67 | 0.70 | 1.26 |
| All-good setting: every library unknown at its good end | 0.75 | 0.67 | 0.64 | 1.26 |
| Much comes back, high reach, poor entries, high running cost | 1.75 | 1.71 | 1.50 | 3.25 |
| All-good setting with running cost at its high end | 0.92 | 0.67 | 0.79 | 1.26 |

Near: within 0.02 [G] of one, a band chosen for reading. The cost against the strong model rests on the Opus price ratio. It is 2 [S] per token and may be nearer 1 [G] per call. At one, the middle-value cost ratio against the strong model is 1.23 [G].

The square: reach against entry quality (11 by 11 levels [M]): little: cost below the ladder in 0, wrong rate below in 23, both in 0 of 121 cells; cost ratio 1.01 to 1.43. middle: cost below the ladder in 0, wrong rate below in 46, both in 0 of 121 cells; cost ratio 1.01 to 1.44. much: cost below the ladder in 17, wrong rate below in 58, both in 17 of 121 cells; cost ratio 0.82 to 1.53 [G]. A level is a share of each unknown's range, counted from its poor end.

At middle values: strong model directly costs 29.9 [G] per piece with 11.2% [G] wrong; cheap model with the ladder 25.7 [G] and 21.2% [G]; the library 26.4 then 26.6 [G] and 21.2% then 21.4% [G] (first, last period).

## 4. Where real cases broke

59 [M] real cases were walked through the design's ten steps. Each cell is one step of one case. **These are chosen problem cases. They show where steps break, never how often.** Some steps were judged with the owner's earlier knowledge-store design, not the library. 126 [M] of the 590 [M] step judgments name it. In cases.json those steps carry `ks: true`.

| Status [M] | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| works | 30 | 17 | 28 | 13 | 38 | 10 | 14 | 3 | 11 | 8 |
| strains | 29 | 7 | 19 | 19 | 8 | 13 | 6 | 10 | 23 | 21 |
| breaks | 0 | 24 | 10 | 26 | 2 | 31 | 38 | 21 | 22 | 29 |
| not specified | 0 | 11 | 0 | 0 | 8 | 0 | 1 | 2 | 3 | 0 |
| not reached | 0 | 0 | 2 | 1 | 3 | 5 | 0 | 23 | 0 | 1 |

Steps: 1 a task arrives; 2 trigger; 3 query; 4 match; 5 delivery; 6 use; 7 check; 8 failure and the ladder; 9 capture; 10 afterlife. Families: Same mistake, new session (11); Silent defect found later (6); Building new beside old (5); Outside vendor causes (5); Races and flaky failures (6); Two correct pieces, one fault (5); Research and design cases (6); Across projects (5); The ladder in real life (4); Existing notes over time (6) [M].

## 5. The limitations, by step, with two weights [G]

69 [M] limitations: 54 [M] seen in real cases, 15 [M] from thought experiments only; real cases went the other way for 23 [M]. Alone: what moving only this gives. Its library unknowns go to their good ends; all else stays at middle values. Last: what is lost if only this stays. All else sits at its good end; this goes back to middle values. Both are shares of the full fall. They do not add up, because the steps multiply. The full fall runs from the middle values to the all-good setting. There the library's cost falls 27.4% and its wrong rate 33.8%; the full fall is 30.6% [G].

Groups, alone and last: entry quality 6.0% and 104.1%; comes back 0.2% and 82.4%; reach −12.4% and 68.2%; running cost 3.3% and 10.4%. Steps, by last: 4 10.9% and 94.0%; 9 9.2% and 78.1%; 2 −5.3% and 68.0%; 6 0.5% and 30.3%; 10 3.7% and 29.9%; 3 1.9% and 24.8%; 1 1.4% and 17.9%; 7 2.3% and 16.2%; 5 −0.3% and 11.7%; 8 −3.6% and 8.8%. Steps moved one after another: 4 10.9%, 2 23.6%, 9 50.3%, 6 57.1%, 7 61.5%, 1 62.9%, 3 62.9%, 5 62.9%, 8 62.9%, 10 62.9%; the unknowns no limitation names (Ceiling: parts held; Lookup finds the same problem; Cheap model accepts a good entry; Calls saved, all parts; Calls saved, some parts; Bad entries leaving the stock; Promoted checks run in the shared tests) carry the last 37.1% [G].

Not weighed: not in the model (LIM-26, LIM-44, LIM-62, LIM-68); gate or ladder (LIM-32, LIM-34, LIM-41, LIM-42, LIM-43, LIM-45, LIM-47) [M]. A number after ↔ counts the other limitations with the same library unknowns. Their weights match.

**Step 1: A task arrives: what is in the window** (alone 1.4%, last 17.9% [G])
- LIM-01 Too much applies at the start of a task. Thought experiment only; other way in 1 [M] (Races and flaky failures). alone −0.2%, last 13.7% [G].
- LIM-02 Short helper windows start without the session's lessons. Thought experiment only; other way in 7 [M] (Same mistake, new session; Silent defect found later; Building new beside old; Races and flaky failures; Research and design cases; Across projects; Existing notes over time). alone 1.3%, last 15.9% [G].
**Step 2: Trigger: does anything start a lookup, and when** (alone −5.3%, last 68.0% [G])
- LIM-03 Nothing fails, so no lookup starts. 21 cases, 5 families [M]; other way in 2 [M] (Same mistake, new session; Outside vendor causes). alone −4.6%, last 38.3% [G] ↔1.
- LIM-04 A lookup can cost as much as fixing it. 7 cases, 3 families [M]; other way in 2 [M] (Silent defect found later; Building new beside old). alone 1.2%, last 12.4% [G].
- LIM-05 The lookup comes after the failed call is paid. 5 cases, 2 families [M]. alone −2.5%, last 17.7% [G].
- LIM-06 The cause sits outside the window that fails. 5 cases, 2 families [M]. alone −3.0%, last 27.0% [G].
- LIM-07 The failure happens where no session is watching. 3 cases, 1 family [M]. alone −4.6%, last 38.3% [G] ↔1.
- LIM-08 Operator hazards are reached only by the right verb. 1 case, 1 family [M]. alone −4.6%, last 45.6% [G].
**Step 3: Query: what is asked, in what words** (alone 1.9%, last 24.8% [G])
- LIM-09 Symptom words miss lessons stored in mechanism words. 5 cases, 2 families [M]. alone 0.005%, last 23.8% [G].
- LIM-10 The query carries the asker's own worry or guess. 4 cases, 2 families [M]; other way in 1 [M] (Races and flaky failures). alone 1.9%, last 14.2% [G].
**Step 4: Match: what comes back** (alone 10.9%, last 94.0% [G])
- LIM-11 Stored strong-model solutions carry defects nobody has found yet. 7 cases, 2 families [M]. alone 2.5%, last 11.2% [G].
- LIM-12 A near match may need the opposite fix. 7 cases, 2 families [M]. alone 2.2%, last 22.9% [G].
- LIM-13 One fact, different right answers in each project. 6 cases, 4 families [M]; other way in 2 [M] (Silent defect found later; The ladder in real life). alone 2.8%, last 4.0% [G].
- LIM-14 Same words, different cause: a look-alike comes back. 5 cases, 3 families [M]; other way in 1 [M] (Outside vendor causes). alone 2.7%, last 7.8% [G].
- LIM-15 The earlier knowledge-store design has no path between projects. 5 cases, 1 family [M]. alone 1.4%, last 59.0% [G].
- LIM-16 Partial matches disagree, and nothing says which governs. 3 cases, 2 families [M]; other way in 1 [M] (Existing notes over time). alone 1.9%, last 9.9% [G].
- LIM-17 Half-right entries make an open problem look closed. 3 cases, 1 family [M]; other way in 2 [M] (Outside vendor causes; Across projects). alone 2.3%, last 2.2% [G].
- LIM-18 New work copies the nearest old piece, flaws included. 3 cases, 1 family [M]. alone 2.7%, last 9.2% [G] ↔1.
- LIM-19 Lessons share no step to join on. 2 cases, 1 family [M]; other way in 1 [M] (Research and design cases). alone 0.09%, last 8.4% [G].
- LIM-20 One symptom, two causes: a correct hit stops searching. 2 cases, 2 families [M]. alone 0.07%, last 6.4% [G].
- LIM-21 The answer holds two cards; merges needed four parts. 2 cases, 1 family [M]. alone −0.02%, last 10.7% [G].
- LIM-22 The first time is full price. 1 case, 1 family [M]; other way in 2 [M] (Same mistake, new session; Across projects). alone 1.3%, last 29.4% [G].
- LIM-23 Empty at the start; the first weeks cost more. Thought experiment only; other way in 5 [M] (Silent defect found later; Building new beside old; Races and flaky failures; Two correct pieces, one fault; The ladder in real life). alone 1.6%, last 5.0% [G].
- LIM-24 Popular entries get fetched more and so look better. Thought experiment only. alone 2.4%, last 3.3% [G].
- LIM-25 Fixes that hide a symptom match the most problems. Thought experiment only. alone 2.8%, last 13.1% [G].
**Step 5: Delivery: which window receives it, and does it stay** (alone −0.3%, last 11.7% [G])
- LIM-26 Parallel windows pay before any entry can exist. 6 cases, 4 families [M]; other way in 2 [M] (Outside vendor causes; Across projects). not in the model. *The model shows this only in part.*
- LIM-27 Compaction drops a fetched entry. 1 case, 1 family [M]; other way in 4 [M] (Building new beside old; Outside vendor causes; Two correct pieces, one fault; Across projects). alone −0.3%, last 11.7% [G].
**Step 6: Use: the cheap model adapts and applies it** (alone 0.5%, last 30.3% [G])
- LIM-28 In the window is not the same as used. 10 cases, 5 families [M]. alone 0.5%, last 25.2% [G].
- LIM-29 Two checked answers do not make a checked merge. 6 cases, 2 families [M]; other way in 1 [M] (Same mistake, new session). alone 0.02%, last 5.1% [G] ↔1.
- LIM-30 Order matters when lessons are merged. Thought experiment only. alone 0.02%, last 5.1% [G] ↔1.
**Step 7: Check: what decides the result equals the strong model's** (alone 2.3%, last 16.2% [G])
- LIM-31 Matching the strong model also matches its mistakes. 17 cases, 5 families [M]. alone 0.2%, last 7.1% [G] ↔2.
- LIM-32 Reviews are costly and still pass wrong conclusions. 11 cases, 4 families [M]; other way in 1 [M] (Same mistake, new session). gate or ladder.
- LIM-33 Some entries have no check a machine can run. 10 cases, 2 families [M]. alone 1.7%, last 3.6% [G].
- LIM-34 Tests stay green; someone else finds the defect later. 8 cases, 2 families [M]; other way in 1 [M] (Same mistake, new session). gate or ladder.
- LIM-35 The entry's own test certifies the defect. 5 cases, 2 families [M]. alone 0.3%, last 7.8% [G]. *The model shows this only in part.*
- LIM-36 The real check happens outside: cloud, deploy or field. 5 cases, 1 family [M]. alone 0.08%, last 2.3% [G]. *The model shows this only in part.*
- LIM-37 A correction tested elsewhere overturned a right entry. 4 cases, 2 families [M]. alone 0.3%, last 10.0% [G] ↔1.
- LIM-38 A rerun passes whatever was done. 4 cases, 1 family [M]. alone 0.2%, last 7.1% [G] ↔2.
- LIM-39 Checks built from the conclusion share its blind spot. 2 cases, 1 family [M]. alone 0.02%, last 0.8% [G].
- LIM-40 A check built on the old fix misses recurrence. 1 case, 1 family [M]. alone 0.06%, last 2.3% [G]. *The model shows this only in part.*
**Step 8: Failure and the ladder: how failure is noticed, what goes up to Opus, then Fable** (alone −3.6%, last 8.8% [G])
- LIM-41 Higher tiers lack the missing fact too. 13 cases, 3 families [M]. gate or ladder.
- LIM-42 Higher tier was not who caught the error. 12 cases, 3 families [M]. gate or ladder.
- LIM-43 A trade between lessons ends with the owner. 3 cases, 1 family [M]. gate or ladder.
- LIM-44 An error line is not always a failure. 1 case, 1 family [M]. not in the model. *The model cannot show this.*
- LIM-45 Hard problems pay every rung of the ladder. Thought experiment only; other way in 6 [M] (Silent defect found later; Building new beside old; Outside vendor causes; Research and design cases; Across projects; The ladder in real life). gate or ladder.
- LIM-46 Fewer problems reach the top model to be stored. Thought experiment only. alone −3.6%, last 8.8% [G].
- LIM-47 The handoff is a polluted window or failed brief. Thought experiment only; other way in 2 [M] (Two correct pieces, one fault; The ladder in real life). gate or ladder.
**Step 9: Capture: what is written, by whom, when, from what** (alone 9.2%, last 78.1% [G])
- LIM-48 'Solved' moves after the entry is written. 17 cases, 5 families [M]. alone 0.3%, last 10.0% [G] ↔1.
- LIM-49 A conditional 'no' hardens into 'never'. 8 cases, 4 families [M]; other way in 2 [M] (Existing notes over time; Outside vendor causes). alone 2.4%, last 14.5% [G].
- LIM-50 The writer cannot know which details will matter. 7 cases, 3 families [M]. alone 0.6%, last 21.3% [G].
- LIM-51 Asides and observations are never 'a problem solved'. 7 cases, 3 families [M]. alone −2.4%, last 27.9% [G].
- LIM-52 Few observations get stored as a general rule. 6 cases, 3 families [M]. alone 1.5%, last 7.9% [G].
- LIM-53 Scope falls off an entry when written or copied. 6 cases, 3 families [M]. alone 2.7%, last 9.2% [G] ↔1.
- LIM-54 The after-the-fact write-up misstates what happened. 5 cases, 2 families [M]; other way in 4 [M] (Building new beside old; Races and flaky failures; Two correct pieces, one fault; Research and design cases). alone 0.2%, last 7.1% [G] ↔2.
- LIM-55 Solvers already write the lesson where builders look. 3 cases, 1 family [M]. alone 1.6%, last 2.5% [G].
- LIM-56 Writing happens in a full window that may compact. 1 case, 1 family [M]; other way in 4 [M] (Building new beside old; Research and design cases; The ladder in real life; Existing notes over time). alone −3.3%, last 5.9% [G] ↔1.
- LIM-57 Writing keys on what was hard for the solver. 1 case, 1 family [M]; other way in 1 [M] (Same mistake, new session). alone −3.9%, last 46.0% [G].
**Step 10: Afterlife: what happens to the entry later** (alone 3.7%, last 29.9% [G])
- LIM-58 Facts outside the repository change with no event. 14 cases, 5 families [M]. alone 0.3%, last 12.0% [G] ↔1.
- LIM-59 Corrections do not reach the copies. 8 cases, 4 families [M]. alone 0.3%, last 12.0% [G] ↔1.
- LIM-60 A later fix silently changes an older entry's truth. 4 cases, 2 families [M]. alone 0.2%, last 9.7% [G] ↔1.
- LIM-61 A stored conclusion answers its own day's question. 3 cases, 1 family [M]. alone 2.6%, last 11.9% [G].
- LIM-62 Repairing an entry can cost more than the fix. 1 case, 1 family [M]. not in the model. *The model cannot show this.*
- LIM-63 Evidence against an entry stays inside helper windows. 1 case, 1 family [M]. alone 0.08%, last 2.2% [G] ↔1.
- LIM-64 Blame is unclear when a reused entry fails. Thought experiment only. alone 0.08%, last 2.2% [G] ↔1.
- LIM-65 Storing merged answers fills the library with combinations. Thought experiment only. alone 3.9%, last 5.8% [G].
- LIM-66 A new model changes which entries are needed. Thought experiment only. alone 0.2%, last 9.7% [G] ↔1.
- LIM-67 The owner's corrections change and conflict over time. Thought experiment only. alone 0.5%, last 16.9% [G].
- LIM-68 Private details travel with entries. Thought experiment only. not in the model. *The model cannot show this.*
- LIM-69 Untrusted text can become trusted memory. Thought experiment only. alone −3.3%, last 5.9% [G] ↔1.

**The gate and the ladder** (last period, cost and wrong rate [G]). These unknowns are shared by all three ways of working. So the weights give them none. The gate: tests and review: Tests catch it, visible work to its high end, Tests catch it, latent work to its high end, Review catches it to its high end, Share of gate passes with a review to its high end. The ladder: retry, Opus, Fable and the handoff: Cheap retry is right to its high end, Opus is right to its high end, Fable is right to its high end, Cost of the handoff to Opus to its low end.

| Base, moved | Cheap + library | Cheap + ladder | Strong directly |
| --- | ---: | ---: | ---: |
| Every unknown at its middle value, as it is | 26.6, 21.4% | 25.7, 21.2% | 29.9, 11.2% |
| Every unknown at its middle value, gate moved | 39.2, 7.9% | 37.9, 7.9% | 36.4, 8.5% |
| Every unknown at its middle value, ladder moved | 23.7, 17.1% | 23.1, 16.9% | 26.0, 1.6% |
| Every unknown at its middle value, gate and ladder moved | 32.9, 2.8% | 31.8, 2.8% | 31.4, 0.5% |
| All-good setting, as it is | 19.3, 14.2% | 25.7, 21.2% | 29.9, 11.2% |
| All-good setting, gate moved | 29.1, 5.3% | 37.9, 7.9% | 36.4, 8.5% |
| All-good setting, ladder moved | 17.1, 11.0% | 23.1, 16.9% | 26.0, 1.6% |
| All-good setting, gate and ladder moved | 24.8, 1.8% | 31.8, 2.8% | 31.4, 0.5% |

## 6. Savings the walks saw or estimated

Savings the walks saw happen [M] or estimated [G]. The library has never existed. 6 [M] of the 6 [M] savings seen came through notes that exist today.

- f01-C3a: A stored pdftoppm route, served to the second wave, would have saved 2 to 8 calls per agent. Four Opus agents were in that wave. [G]
- f01-C4a: One git flag with an exact error template, served before cloning, would have saved the 15 failed clones of 11-04. [G]
- f10-3: The pushed Python note worked at no extra cost. Three agents carried its remedy in the same command as the probe, on 11-09 and 11-12. [M] Carried by a pushed note, a channel that exists today.
- f08-1: The memory index put the long-paths fix into a sibling session before its first clone; that clone never failed. [M] Carried by the memory index, a channel that exists today.
- f05-4: A lookup by the failing test's name would have hit the root's entry. It would have saved a wrong fixture commit, its revert, stopped runs and one Opus review. [G]
- f05-3: The check held. An exact match to an old, fixed cause was tested and came back 'does not apply'. No wrong fix was applied. [G]
- f06-C4: After the first solve, a do-not-apply entry would block the handoff's wrong advice. That advice would let a 4-digit PIN be guessed without limit. CLAUDE.md already warns of it. [G] Carried by CLAUDE.md, a channel that exists today.
- f06-C2: The action words 'enable dispatcher' reach the stored hazard. That prevents the measured replay: 36 messages about months-old jobs, plus permanent suppressed rows. [G]
- f03-C5: The builder's own words 'offline presence outbox' reach the right entry. Had a lookup fired, it would have saved three days of stuck badges and a rework commit. [G]
- f09-2: A red check handed raw output to Fable. Fable fixed the defect in about a minute and wrote the rule, with its reason, within two minutes. [M] Carried by the project's own conventions file, a channel that exists today.
- f09-1: The entry from slice two, fetched at slice four's check, would have stopped the top tier's wrong premise. That saves one finding's round trip. [G]
- f07-4: A later change reused two stored traps that earlier failed cloud builds had paid for. A later design reused a stored design that had cost about 15M helper tokens. [M] Carried by CLAUDE.md and the stored design documents, a channel that exists today.
- f07-5: A design 'no' stored with its reason held for five months and was never argued again. [M] Carried by the project documents, a channel that exists today.
- f10-1a: The earlier knowledge-store design scans for fixes not on the main branch. That scan fits June exactly. It removes one of build 15's two causes and 16 days of broken main. [G]
- f10-1b: The empty-value check promoted into the shared test run blocks that mistake for every agent and human, with no lookup. [M] Carried by a check in the shared test run, a channel that exists today.

## 7. Many runs at three ties

Most unknowns are guesses, so the model runs many times with random draws. The result is a spread, not one answer. Tie: how far the library unknowns of one group move together. Each run draws one shared level per group, four in all. No group is tied to another. 51 [M] of the 60 [M] drawn unknowns are guesses. 1000 runs at each tie, seed 20261112, last period; the page gives the same numbers for the same seed. **This spread follows from the ranges and the way they are drawn. It is not a measurement of the library.**

| Middle (5 to 95 in 100) [G] | tie 0 | tie 0.5 | tie 1 |
| --- | ---: | ---: | ---: |
| Cost, against the ladder | 1.04 (1.01 to 1.10) | 1.04 (1.01 to 1.11) | 1.04 (1.00 to 1.21) |
| Wrong rate, against the ladder | 1.01 (0.99 to 1.06) | 1.01 (0.98 to 1.11) | 1.01 (0.92 to 1.30) |
| Cost, against the strong model | 1.00 (0.51 to 2.09) | 1.01 (0.52 to 2.09) | 1.01 (0.53 to 2.12) |
| Wrong rate, against the strong model | 1.89 (0.97 to 6.37) | 1.91 (0.98 to 6.27) | 1.94 (0.98 to 6.53) |
| Funnel's last number | 0.42 (0.05 to 1.8) | 0.45 (0.05 to 2.6) | 0.28 (0.005 to 6.6) |
| More caught by promoted checks | 0.05 (0.002 to 0.33) | 0.06 (0.004 to 0.52) | 0.05 (0.0001 to 1.4) |
| Runs cheaper with a wrong rate no higher, against the ladder | 0.3% | 0.3% | 6.1% |
| The same, against the strong model | 3.3% | 3.8% | 3.5% |

Rank correlation: how steadily each ratio rises (+) or falls (−) as one unknown rises across the runs. Rank correlation: how steadily a ratio rises (+) or falls (−) as one unknown rises across the runs. Moves the cost against the ladder most, last period: tie 0: Calls to write an entry +0.42, Entry written after a strong solve +0.37, Cheap calls per attempt −0.35, Cost of a lookup +0.26; tie 0.5: Look-alike ceiling +0.40, Look-alike comes back on top +0.40, Cheap model accepts a wrong entry +0.40, Wrong entry spoils right work +0.40; tie 1 (At the highest tie, a group's unknowns all move with its shared level. So each group shows one rank correlation, toward its good end.): group entry quality −0.66, group reach +0.40, group running cost −0.30, Cheap calls per attempt −0.24 [G]. With 1000 runs, correlations closer than about 0.06 [G] are not well separated.

## 8. What the map leaves out

- **A model of the mechanism, not a forecast.** Its numbers follow from its settings. 51 [M] of the 60 [M] drawn unknowns are guesses. The number of periods is a chosen horizon, never drawn in the runs.
- **Weights are shares of a guessed fall.** Both weights are shares of the full fall. That fall comes from the ranges, which are mostly guesses. A weight measures the model at those ranges.
- **The match of limitations to unknowns is a judgment.** Each limitation was matched by hand to the unknowns it acts through. Another reader could match some differently. Its weights move with that match.
- **A promoted check can pin a defect.** A bad entry's promoted check can hold a defect in place. The real cases show this. The map leaves it out, which leans toward the library.
- **The Opus price ratio is unsure.** The price list gives 2 [S] per token. On this PC an Opus call read about 222,000 [M] cached tokens. A Sonnet call read about 440,000 [M]. So per call the ratio may be nearer one. The runs draw it between 1 [G] and 2 [G]. At one, the cost ratio against the strong model is 1.23 [G] instead of 0.89 [G].
- **The coverage ceilings lean toward the library.** The ceilings now mean what the library could hold beyond today's notes. Their values and sources did not change with that reading. The outside studies behind them had nothing like today's notes. This leans toward the library, by an amount the map cannot size.
- **Chosen cases, not a sample of work.** The 59 [M] cases were chosen because something went wrong. They show which routes exist and where steps break. They never show how often.
- **Case statuses are judgments.** Works, strains and breaks were set by the agents that walked the cases. Another reader could set some differently. 126 [M] of the 590 [M] step judgments name the earlier knowledge-store design. That includes 32 [M] of the 172 [M] 'works' cells. This touches the case grid, not the model's numbers.
- **One size of work, and no time.** Every piece of work is about ten cheap calls. Real work varies far more in size. Tests at the gate cost nothing. Waiting and the owner's attention are left out.
- **Pieces of work are independent.** A piece's kind, its need, what the library holds and any look-alike are combined by multiplying chances. Real work clusters. A hard problem may also be the one the library lacks.
- **Averages, not one library.** The stocks change by their expected amounts each period. A real library has one history, with luck in it. Nothing written during a period helps that same period.
- **Entries are all-or-nothing.** A good entry is good wherever it applies, and a bad one bad. Partly right shows up only as the 'some parts' result.
- **One pool of entries.** Projects are not separated. Facts that differ between projects act only through the look-alike and wrong-entry chances.
- **An entry in hand acts only at the cheap attempt.** A wrong entry does not follow the work up the ladder. A good entry does not help the cheap retry or Opus either. Only a promoted check acts later, at the gate.
- **A fixed ladder and one gate.** One cheap retry, then Opus, then Fable, in that order. Real sessions skip rungs, repeat them, or end with the owner. The ladder step was 'not reached' in 23 [M] cases and 'works' in 3 [M]. In 12 [M] cases the higher tier was not the one that caught the error.
- **How bad entries come and go.** Staleness moves good entries to bad, never back. A bad entry turns good only when a found escape is repaired. Bad entries leave only at the retiring rate. At the middle values the bad share reaches 0.44 [G] by the last period.
- **Two simplifications favour the library.** The mechanical check accepts every good entry and rejects every wrong one. Repair costs nothing beyond the rework.
- **How ranges are drawn.** Drawn on its own, an unknown is spread evenly across its range. Library unknowns can be tied within their group, through that group's shared level. At the middle tie, a library unknown mixes that level with its own draw. Its draws then bunch toward the middle of its range. The middle nine in ten fall between 0.16 [G] and 0.84 [G] of the range. If two chances in a draw add up to more than certainty, both are scaled down. With the current ranges this does not happen. The ranking measures steady rise or fall. It misses an effect that rises and then falls.
- **Some limitations the model cannot show.** 3 [M] limitations act through no setting in the model. 4 [M] more are shown only in part. Each one says why when opened.
- **Some tags are generous.** Several figures tagged M or S were measured on another unit than their setting. Each slider's source says how. One outside figure supports two settings in a row.
- **The step matches are set by hand.** A table matches the design's ten steps to the model's stages. Another matches them to the funnel's bars. A limitation is placed through these tables and its unknowns.

## 9. Files

- Page: `docs/program/library-pathways/index.html` (self-contained; opens from disk). Data: map.json, params.json, engine.js, limitations.json, cases.json beside it.
- Page sources and this build: `docs/program/evidence/library-pathways/page-src/`, `build-page.js.txt`; checks in `build-page-report.txt`. Briefs: `model-brief.md` (sections 12, 13 and 14 override), `page-brief.md`.
