# Library pathways: the map, the funnel and the limitations (2026-11-12)

**Generated file.** Built by `docs/program/evidence/library-pathways/build-page.js.txt` from `docs/program/library-pathways/` (map.json, params.json, engine.js, limitations.json, cases.json) and `page-src/text.json`. The owner reads `docs/program/library-pathways/index.html`, built in the same run. Do not edit by hand.

**Rules.** This record maps and measures. It holds no fixes and no judgment on whether the library reaches its goal. Tags: [M] measured on this PC; [S] outside study or price list; [G] guess. A computed number takes the weakest tag of its inputs. Almost every computed number here is a guess (G). In a table, the tag in the heading covers its column. The 59 [M] real cases are chosen problem cases: they show where steps break, never how often.

## 1. The map

One piece of work: a fix-sized task of about ten cheap calls, where a result is produced and checked. Cheap-call equivalents. One call by the cheap model (Sonnet) costs 1. Lookup, screen, carry and handoff are paid at the cheap tier. One period is 30 days. The number of periods is a run setting: it is chosen, never drawn and never swung.

The graph has 40 [M] states and 83 [M] branches over eleven stages and an outcome. It has 58 [M] settings: 57 [M] unknowns drawn in the runs (48 [M] guesses, 7 [M] from outside studies, 2 [M] measured), plus the horizon, which is chosen. 37 [M] unknowns are library unknowns, each with a good end.

- **Strong model directly.** Opus does the work. If the gate catches a wrong answer, Fable tries. No library.
- **Cheap model with the ladder.** The cheap model tries first. A caught failure gets one cheap retry, then Opus, then Fable. No library.
- **Cheap model with the library.** The same ladder, plus the library. A lookup comes before the cheap attempt. Opus and Fable solves are written back as entries.

Design steps to model stages (set by hand): 1 L1; 2 L1; 3 L2; 4 L2; 5 L4; 6 L3+L5; 7 L6; 8 L7+L8+L9; 9 L10; 10 L11. The walks used the design's ten steps; the model has eleven stages. The match was set by hand. Step 1 sits with the trigger. Step 6 covers the screen and the cheap attempt.

## 2. The funnel, last period [G]

Start with a hundred pieces of work the cheap model would get wrong alone. Each bar is how many are left after one step. Counts under each bar are from the data files [M]; the match of bars to design steps is set by hand.

| Stage | Unfavourable | Best | Favourable | Design steps | Limitations [M] | Cases broke [M] |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| An entry is held for it | 0.33 | 13.1 | 92.0 | no step |  |  |
| It is looked up | 0.06 | 4.8 | 67.5 | 1, 2 | 8 | 24 |
| The right entry comes back | 0.005 | 2.3 | 59.8 | 3, 4 | 17 | 28 |
| It is a good entry, not a bad one | 0.0005 | 1.3 | 55.7 | 9, 10 | 22 | 39 |
| It passes the screen | 0.0003 | 1.1 | 55.0 | step 6 sits under the last bar |  |  |
| It is in the window when needed | 0.0001 | 0.97 | 53.9 | 5 | 2 | 2 |
| The cheap attempt comes out right | 0.00003 | 0.35 | 31.7 | 6 | 3 | 31 |
| After the cheap attempt | | | | 7, 8 | 17 | 40 |

The match of bars to design steps was set by hand. No step sits at the first bar. Bad entries come from writing (step 9) and from going stale (step 10). So both steps sit at the good-entry bar. Step 6 covers the screen and the cheap attempt, so it sits under the last bar only. Faint marks: the unfavourable and the favourable reference settings. The unfavourable mark is a barely used library, not the worst the ranges allow.

Of all work (per hundred pieces), best values: an entry is held for it 8.5; it is looked up 3.3; the right entry comes back 1.6; it is a good entry, not a bad one 0.88; it passes the screen 0.78; it is in the window when needed 0.66; cheap calls saved at the cheap attempt 2.0 [G].

## 3. Three reference settings, last period [G]

Library unknowns at their unfavourable end, at best, or at their favourable end; every other unknown at best.

| Library over | Unfavourable | Best | Favourable |
| --- | ---: | ---: | ---: |
| Cost, against the ladder | 1.05 | 1.03 | 0.74 |
| Wrong rate, against the ladder | 1.02 | 1.01 | 0.71 |
| Cost, against the strong model | 0.90 | 0.89 | 0.63 |
| Wrong rate, against the strong model | 1.94 | 1.91 | 1.35 |
| Funnel's last number, of a hundred | 0.00003 | 0.35 | 31.7 |

Unfavourable is a barely used library, so it can do little harm. It is not the worst setting the ranges allow. A check found heavy use with poor entries inside the same ranges. There, cost against the ladder is 1.75 [G] and the wrong rate 1.71 [G]. Against the strong model the wrong rate is 3.25 [G]. The map does not declare that setting. Recomputed by this build: cost vs top 1.50, wrong vs top 3.25, cost vs ladder 1.75, wrong vs ladder 1.71 [G]. Today's notes are in every way of working: CLAUDE.md, the memory notes, checks in the shared test run. So they cancel out.

At best values: strong model directly costs 29.9 [G] per piece with 11.2% [G] wrong; cheap model with the ladder 25.7 [G] and 21.2% [G]; the library 26.4 then 26.6 [G] and 21.2% then 21.4% [G] (first, last period). The cost against the strong model rests on the Opus price ratio. It is 2 [S] per token and may be nearer 1 [G] per call. At one, the last-period cost ratio against the strong model is 1.23 [G]. Good and bad entries after the last period at the three settings: 6.2 and 58.0; 67.7 and 54.6; 166.9 and 11.9 [G].

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

## 5. The limitations, by step, with their weights

69 [M] limitations: 54 [M] seen in real cases, 15 [M] from thought experiments only; real cases went the other way for 23 [M]. Weight: how far the four ratios fall, on average, when its library unknowns move to their good end. Weights are at best values, last period [G]; counts are walks of the 59 [M].

Largest single weights: LIM-65 1.20%; LIM-13 0.85%; LIM-25 0.85%; LIM-14 0.84%; LIM-18 0.81% [G]. Largest step weights (all of a step moved together): step 4 3.28%; step 9 2.57%; step 10 1.13%; step 7 0.61%; step 3 0.59% [G]. Steps moved one after another, with the fall so far: 4 3.3%, 2 7.2%, 9 15.2%, 6 17.3%, 7 18.0%, 1 18.4%, 3 18.4%, 5 18.4%, 8 18.4%, 10 18.4% [G]; funnel's last number then 20.0 [G] of a hundred.

Every weight here is small, because the library is used little at best values. Below zero, the ratios rise. At best values a lookup mostly returns nothing or a bad entry. A write costs Opus calls. So these good ends raise the ratios at best values: Lookup starts, latent work; Entry written after a strong solve; Lookup starts, visible work; Holding cut for work the cheap model gets right; Entry in the window when needed; Ceiling: parts held; Lookup finds some parts; Lookup finds all parts [G]. Every library unknown at its good end (the favourable setting) lowers the ratios by 29.0% [G]. The steps in sequence reach 18.4% [G], a gap of 10.6 [G] points. No limitation names 6 [M] library unknowns (Ceiling: parts held; Lookup finds the same problem; Cheap model accepts a good entry; Calls saved, all parts; Calls saved, some parts; Bad entries leaving the stock); moved together they give 0.3% [G]. The rest of the gap comes from them acting with the named unknowns. Not measured: a limitation with no setting, or one that acts only through unknowns every way of working shares. The weight never moves those unknowns. Not measured: 13 [M] (no setting: LIM-26, LIM-40, LIM-44, LIM-62, LIM-68; shared unknowns: LIM-32, LIM-34, LIM-39, LIM-41, LIM-42, LIM-43, LIM-45, LIM-47).

**Step 1: A task arrives: what is in the window** (step weight 0.4% [G])
- LIM-01 Too much applies at the start of a task. Thought experiment only; other way in 1 [M] (Races and flaky failures). Weight −0.07% [G] (Entry in the window when needed −0.10%, Cost of carrying an entry 0.03%).
- LIM-02 Short helper windows start without the session's lessons. Thought experiment only; other way in 7 [M] (Same mistake, new session; Silent defect found later; Building new beside old; Races and flaky failures; Research and design cases; Across projects; Existing notes over time). Weight 0.4% [G] (Cost of a lookup 0.5%, Entry in the window when needed −0.10%).
**Step 2: Trigger: does anything start a lookup, and when** (step weight −1.6% [G]; moves 6 of its 10 unknowns)
- LIM-03 Nothing fails, so no lookup starts. 21 cases, 5 families [M]; other way in 2 [M] (Same mistake, new session; Outside vendor causes). Weight −1.4% [G] (Lookup starts, latent work −1.4%).
- LIM-04 A lookup can cost as much as fixing it. 7 cases, 3 families [M]; other way in 2 [M] (Silent defect found later; Building new beside old). Weight 0.4% [G] (Cost of a lookup 0.5%, Holding cut for work the cheap model gets right −0.1%).
- LIM-05 The lookup comes after the failed call is paid. 5 cases, 2 families [M]. Weight −0.8% [G] (Lookup starts, visible work −0.8%).
- LIM-06 The cause sits outside the window that fails. 5 cases, 2 families [M]. Weight −0.9% [G] (Lookup starts, visible work −0.8%, Entry in the window when needed −0.10%).
- LIM-07 The failure happens where no session is watching. 3 cases, 1 family [M]. Weight −1.4% [G] (Lookup starts, latent work −1.4%).
- LIM-08 Operator hazards are reached only by the right verb. 1 case, 1 family [M]. Weight −1.4% [G] (Lookup starts, latent work −1.4%, Lookup finds the similar entry 0.008%).
**Step 3: Query: what is asked, in what words** (step weight 0.6% [G])
- LIM-09 Symptom words miss lessons stored in mechanism words. 5 cases, 2 families [M]. Weight 0.002% [G] (Lookup finds the similar entry 0.008%, Lookup finds some parts −0.005%, Lookup finds all parts −0.001%).
- LIM-10 The query carries the asker's own worry or guess. 4 cases, 2 families [M]; other way in 1 [M] (Races and flaky failures). Weight 0.6% [G] (Look-alike comes back on top 0.6%, Lookup finds the similar entry 0.008%).
**Step 4: Match: what comes back** (step weight 3.3% [G])
- LIM-11 Stored strong-model solutions carry defects nobody has found yet. 7 cases, 2 families [M]. Weight 0.8% [G] (Wrong entry spoils right work 0.5%, Cheap model accepts a wrong entry 0.4%, Written entry is good 0.07%).
- LIM-12 A near match may need the opposite fix. 7 cases, 2 families [M]. Weight 0.7% [G] (Wrong entry spoils right work 0.5%, Right with a similar entry 0.09%, Calls saved, similar entry 0.03%).
- LIM-13 One fact, different right answers in each project. 6 cases, 4 families [M]; other way in 2 [M] (Silent defect found later; The ladder in real life). Weight 0.8% [G] (Look-alike comes back on top 0.6%, Wrong entry spoils right work 0.5%, Cheap model accepts a wrong entry 0.4%).
- LIM-14 Same words, different cause: a look-alike comes back. 5 cases, 3 families [M]; other way in 1 [M] (Outside vendor causes). Weight 0.8% [G] (Look-alike ceiling 0.6%, Look-alike comes back on top 0.6%, Cheap model accepts a wrong entry 0.4%).
- LIM-15 The earlier knowledge-store design has no path between projects. 5 cases, 1 family [M]. Weight 0.4% [G] (Ceiling: the same problem held 0.3%, Ceiling: a similar entry held 0.03%, Lookup finds the similar entry 0.008%).
- LIM-16 Partial matches disagree, and nothing says which governs. 3 cases, 2 families [M]; other way in 1 [M] (Existing notes over time). Weight 0.6% [G] (Look-alike comes back on top 0.6%, Right with all parts 0.007%, Lookup finds some parts −0.005%).
- LIM-17 Half-right entries make an open problem look closed. 3 cases, 1 family [M]; other way in 2 [M] (Outside vendor causes; Across projects). Weight 0.7% [G] (Wrong entry spoils right work 0.5%, Cheap model accepts a wrong entry 0.4%).
- LIM-18 New work copies the nearest old piece, flaws included. 3 cases, 1 family [M]. Weight 0.8% [G] (Look-alike comes back on top 0.6%, Cheap model accepts a wrong entry 0.4%, Written entry is good 0.07%).
- LIM-19 Lessons share no step to join on. 2 cases, 1 family [M]; other way in 1 [M] (Research and design cases). Weight 0.03% [G] (Right with all parts 0.007%, Lookup finds all parts −0.001%).
- LIM-20 One symptom, two causes: a correct hit stops searching. 2 cases, 2 families [M]. Weight 0.02% [G] (Right with some parts 0.02%, Lookup finds some parts −0.005%).
- LIM-21 The answer holds two cards; merges needed four parts. 2 cases, 1 family [M]. Weight −0.006% [G] (Lookup finds some parts −0.005%, Lookup finds all parts −0.001%).
- LIM-22 The first time is full price. 1 case, 1 family [M]; other way in 2 [M] (Same mistake, new session; Across projects). Weight 0.3% [G] (Ceiling: the same problem held 0.3%, Entries needed to fill the library 0.008%).
- LIM-23 Empty at the start; the first weeks cost more. Thought experiment only; other way in 5 [M] (Silent defect found later; Building new beside old; Races and flaky failures; Two correct pieces, one fault; The ladder in real life). Weight 0.5% [G] (Cost of a lookup 0.5%, Entries needed to fill the library 0.008%).
- LIM-24 Popular entries get fetched more and so look better. Thought experiment only. Weight 0.7% [G] (Look-alike ceiling 0.6%, Entries needed to reach the look-alike ceiling 0.5%).
- LIM-25 Fixes that hide a symptom match the most problems. Thought experiment only. Weight 0.8% [G] (Look-alike ceiling 0.6%, Look-alike comes back on top 0.6%, Written entry is good 0.07%).
**Step 5: Delivery: which window receives it, and does it stay** (step weight −0.10% [G])
- LIM-26 Parallel windows pay before any entry can exist. 6 cases, 4 families [M]; other way in 2 [M] (Outside vendor causes; Across projects). Weight not measured (no setting). *The model shows this only in part.*
- LIM-27 Compaction drops a fetched entry. 1 case, 1 family [M]; other way in 4 [M] (Building new beside old; Outside vendor causes; Two correct pieces, one fault; Across projects). Weight −0.10% [G] (Entry in the window when needed −0.10%).
**Step 6: Use: the cheap model adapts and applies it** (step weight 0.2% [G]; moves 4 of its 5 unknowns)
- LIM-28 In the window is not the same as used. 10 cases, 5 families [M]. Weight 0.1% [G] (Right with a similar entry 0.09%, Right with a same-problem entry 0.04%, Calls saved, same-problem entry 0.02%).
- LIM-29 Two checked answers do not make a checked merge. 6 cases, 2 families [M]; other way in 1 [M] (Same mistake, new session). Weight 0.007% [G] (Right with all parts 0.007%).
- LIM-30 Order matters when lessons are merged. Thought experiment only. Weight 0.007% [G] (Right with all parts 0.007%).
**Step 7: Check: what decides the result equals the strong model's** (step weight 0.6% [G]; moves 5 of its 14 unknowns)
- LIM-31 Matching the strong model also matches its mistakes. 17 cases, 5 families [M]. Weight 0.07% [G] (Written entry is good 0.07%).
- LIM-32 Reviews are costly and still pass wrong conclusions. 11 cases, 4 families [M]; other way in 1 [M] (Same mistake, new session). Weight not measured (shared unknowns).
- LIM-33 Some entries have no check a machine can run. 10 cases, 2 families [M]. Weight 0.5% [G] (Cheap model accepts a wrong entry 0.4%, Entries with a mechanical check 0.2%).
- LIM-34 Tests stay green; someone else finds the defect later. 8 cases, 2 families [M]; other way in 1 [M] (Same mistake, new session). Weight not measured (shared unknowns).
- LIM-35 The entry's own test certifies the defect. 5 cases, 2 families [M]. Weight 0.07% [G] (Written entry is good 0.07%). *The model shows this only in part.*
- LIM-36 The real check happens outside: cloud, deploy or field. 5 cases, 1 family [M]. Weight 0.02% [G] (Cost of a mechanical check 0.02%). *The model shows this only in part.*
- LIM-37 A correction tested elsewhere overturned a right entry. 4 cases, 2 families [M]. Weight 0.09% [G] (Written entry is good 0.07%, Bad entry corrected when found 0.02%).
- LIM-38 A rerun passes whatever was done. 4 cases, 1 family [M]. Weight 0.07% [G] (Written entry is good 0.07%).
- LIM-39 Checks built from the conclusion share its blind spot. 2 cases, 1 family [M]. Weight not measured (shared unknowns).
- LIM-40 A check built on the old fix misses recurrence. 1 case, 1 family [M]. Weight not measured (no setting). *The model cannot show this.*
**Step 8: Failure and the ladder: how failure is noticed, what goes up to Opus, then Fable** (step weight −1.1% [G]; moves 2 of its 9 unknowns)
- LIM-41 Higher tiers lack the missing fact too. 13 cases, 3 families [M]. Weight not measured (shared unknowns).
- LIM-42 Higher tier was not who caught the error. 12 cases, 3 families [M]. Weight not measured (shared unknowns).
- LIM-43 A trade between lessons ends with the owner. 3 cases, 1 family [M]. Weight not measured (shared unknowns).
- LIM-44 An error line is not always a failure. 1 case, 1 family [M]. Weight not measured (no setting). *The model cannot show this.*
- LIM-45 Hard problems pay every rung of the ladder. Thought experiment only; other way in 6 [M] (Silent defect found later; Building new beside old; Outside vendor causes; Research and design cases; Across projects; The ladder in real life). Weight not measured (shared unknowns).
- LIM-46 Fewer problems reach the top model to be stored. Thought experiment only. Weight −1.1% [G] (Entry written after a strong solve −1.1%, Entries needed to fill the library 0.008%).
- LIM-47 The handoff is a polluted window or failed brief. Thought experiment only; other way in 2 [M] (Two correct pieces, one fault; The ladder in real life). Weight not measured (shared unknowns).
**Step 9: Capture: what is written, by whom, when, from what** (step weight 2.6% [G]; moves 12 of its 13 unknowns)
- LIM-48 'Solved' moves after the entry is written. 17 cases, 5 families [M]. Weight 0.09% [G] (Written entry is good 0.07%, Bad entry corrected when found 0.02%).
- LIM-49 A conditional 'no' hardens into 'never'. 8 cases, 4 families [M]; other way in 2 [M] (Existing notes over time; Outside vendor causes). Weight 0.7% [G] (Wrong entry spoils right work 0.5%, Cheap model accepts a wrong entry 0.4%, Good entries going stale 0.06%).
- LIM-50 The writer cannot know which details will matter. 7 cases, 3 families [M]. Weight 0.2% [G] (Right with a similar entry 0.09%, Written entry is good 0.07%).
- LIM-51 Asides and observations are never 'a problem solved'. 7 cases, 3 families [M]. Weight −0.8% [G] (Entry written after a strong solve −1.1%, Ceiling: the same problem held 0.3%).
- LIM-52 Few observations get stored as a general rule. 6 cases, 3 families [M]. Weight 0.5% [G] (Cheap model accepts a wrong entry 0.4%, Written entry is good 0.07%).
- LIM-53 Scope falls off an entry when written or copied. 6 cases, 3 families [M]. Weight 0.8% [G] (Look-alike comes back on top 0.6%, Cheap model accepts a wrong entry 0.4%, Written entry is good 0.07%).
- LIM-54 The after-the-fact write-up misstates what happened. 5 cases, 2 families [M]; other way in 4 [M] (Building new beside old; Races and flaky failures; Two correct pieces, one fault; Research and design cases). Weight 0.07% [G] (Written entry is good 0.07%).
- LIM-55 Solvers already write the lesson where builders look. 3 cases, 1 family [M]. Weight 0.5% [G] (Calls to write an entry 0.5%).
- LIM-56 Writing happens in a full window that may compact. 1 case, 1 family [M]; other way in 4 [M] (Building new beside old; Research and design cases; The ladder in real life; Existing notes over time). Weight −1.0% [G] (Entry written after a strong solve −1.1%, Written entry is good 0.07%).
- LIM-57 Writing keys on what was hard for the solver. 1 case, 1 family [M]; other way in 1 [M] (Same mistake, new session). Weight −1.2% [G] (Entry written after a strong solve −1.1%, Holding cut for work the cheap model gets right −0.1%, Holding cut for latent work 0.06%).
**Step 10: Afterlife: what happens to the entry later** (step weight 1.1% [G]; moves 9 of its 12 unknowns)
- LIM-58 Facts outside the repository change with no event. 14 cases, 5 families [M]. Weight 0.09% [G] (Good entries going stale 0.06%, Bad entry corrected when found 0.02%).
- LIM-59 Corrections do not reach the copies. 8 cases, 4 families [M]. Weight 0.09% [G] (Good entries going stale 0.06%, Bad entry corrected when found 0.02%).
- LIM-60 A later fix silently changes an older entry's truth. 4 cases, 2 families [M]. Weight 0.06% [G] (Good entries going stale 0.06%).
- LIM-61 A stored conclusion answers its own day's question. 3 cases, 1 family [M]. Weight 0.8% [G] (Look-alike comes back on top 0.6%, Cheap model accepts a wrong entry 0.4%, Good entries going stale 0.06%).
- LIM-62 Repairing an entry can cost more than the fix. 1 case, 1 family [M]. Weight not measured (no setting). *The model cannot show this.*
- LIM-63 Evidence against an entry stays inside helper windows. 1 case, 1 family [M]. Weight 0.02% [G] (Bad entry corrected when found 0.02%).
- LIM-64 Blame is unclear when a reused entry fails. Thought experiment only. Weight 0.02% [G] (Bad entry corrected when found 0.02%).
- LIM-65 Storing merged answers fills the library with combinations. Thought experiment only. Weight 1.2% [G] (Look-alike ceiling 0.6%, Calls to write an entry 0.5%, Entries needed to reach the look-alike ceiling 0.5%).
- LIM-66 A new model changes which entries are needed. Thought experiment only. Weight 0.06% [G] (Good entries going stale 0.06%).
- LIM-67 The owner's corrections change and conflict over time. Thought experiment only. Weight 0.1% [G] (Written entry is good 0.07%, Good entries going stale 0.06%).
- LIM-68 Private details travel with entries. Thought experiment only. Weight not measured (no setting). *The model cannot show this.*
- LIM-69 Untrusted text can become trusted memory. Thought experiment only. Weight −1.0% [G] (Entry written after a strong solve −1.1%, Written entry is good 0.07%).

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

Most unknowns are guesses, so the model runs many times with random draws. The result is a spread, not one answer. Tie: how far the library unknowns move together. At tie 0, each is drawn on its own. At tie 1, they share one level. 48 [M] of the 57 [M] drawn unknowns are guesses. 1000 runs at each tie, seed 20261112, last period; the page gives the same numbers for the same seed. **This spread follows from the ranges and the way they are drawn. It is not a measurement of the library.**

| Middle (5 to 95 in 100) [G] | tie 0 | tie 0.5 | tie 1 |
| --- | ---: | ---: | ---: |
| Cost, against the ladder | 1.04 (1.01 to 1.10) | 1.04 (0.99 to 1.08) | 1.03 (0.80 to 1.08) |
| Wrong rate, against the ladder | 1.01 (1.00 to 1.06) | 1.01 (0.96 to 1.06) | 1.01 (0.76 to 1.06) |
| Cost, against the strong model | 1.00 (0.51 to 2.09) | 0.99 (0.51 to 2.08) | 0.95 (0.48 to 2.03) |
| Wrong rate, against the strong model | 1.89 (0.97 to 6.41) | 1.88 (0.97 to 6.39) | 1.82 (0.91 to 6.21) |
| Funnel's last number | 0.42 (0.05 to 1.8) | 0.56 (0.02 to 5.9) | 0.65 (0.0004 to 25.4) |
| Runs cheaper with a wrong rate no higher, against the ladder | 0.3% | 8.1% | 30.2% |
| The same, against the strong model | 3.3% | 3.6% | 5.8% |

**The tie moves use and entry quality together. So no tied run is a much-used library with poor entries. The tied share of runs better than the ladder has no matching worst case.**

Rank correlation: how steadily each ratio rises (+) or falls (−) as one unknown rises across the runs. Moves the cost against the ladder most, last period: tie 0: Calls to write an entry +0.42, Entry written after a strong solve +0.37, Cheap calls per attempt −0.35, Cost of a lookup +0.26; tie 0.5: Calls to write an entry +0.56, Cost of a lookup +0.52, Look-alike comes back on top +0.51, Cheap model accepts a good entry −0.49 [G]. With 1000 runs, correlations closer than about 0.06 [G] are not well separated. Tie 1: At the highest tie every library unknown moves with the shared level. So they all share one rank correlation and cannot be ranked against each other. That shared value, by ratio: cost against the ladder −0.81; wrong rate against the ladder −0.88; cost against the strong model −0.13; wrong rate against the strong model −0.10 [G], as the shared level rises toward the good end.

## 8. What the map leaves out

- **A model of the mechanism, not a forecast.** Its numbers follow from its settings. 48 [M] of the 57 [M] drawn unknowns are guesses. The number of periods is a chosen horizon, never drawn in the runs.
- **The Opus price ratio is unsure.** The price list gives 2 [S] per token. On this PC an Opus call read about 222,000 [M] cached tokens. A Sonnet call read about 440,000 [M]. So per call the ratio may be nearer one. The runs draw it between 1 [G] and 2 [G]. At one, the cost ratio against the strong model is 1.23 [G] instead of 0.89 [G].
- **The coverage ceilings lean toward the library.** The ceilings now mean what the library could hold beyond today's notes. Their values and sources did not change with that reading. The outside studies behind them had nothing like today's notes. This leans toward the library, by an amount the map cannot size.
- **Chosen cases, not a sample of work.** The 59 [M] cases were chosen because something went wrong. They show which routes exist and where steps break. They never show how often.
- **Case statuses are judgments.** Works, strains and breaks were set by the agents that walked the cases. Another reader could set some differently. 126 [M] of the 590 [M] step judgments name the earlier knowledge-store design. That includes 32 [M] of the 172 [M] 'works' cells. This touches the case grid, not the model's numbers.
- **One size of work, and no time.** Every piece of work is about ten cheap calls. Real work varies far more in size. Tests at the gate cost nothing. Waiting and the owner's attention are left out.
- **Pieces of work are independent.** A piece's kind, its need, what the library holds and any look-alike are combined by multiplying chances. Real work clusters. A hard problem may also be the one the library lacks.
- **Averages, not one library.** The stocks change by their expected amounts each period. A real library has one history, with luck in it. Nothing written during a period helps that same period.
- **Entries are all-or-nothing.** A good entry is good wherever it applies, and a bad one bad. Partly right shows up only as the 'some parts' result.
- **One pool of entries.** Projects are not separated. Facts that differ between projects act only through the look-alike and wrong-entry chances.
- **An entry acts only at the cheap attempt.** A wrong entry does not follow the work up the ladder. A good entry does not help the cheap retry or Opus either.
- **A fixed ladder and one gate.** One cheap retry, then Opus, then Fable, in that order. Real sessions skip rungs, repeat them, or end with the owner. The ladder step was 'not reached' in 23 [M] cases and 'works' in 3 [M]. In 12 [M] cases the higher tier was not the one that caught the error.
- **How bad entries come and go.** Staleness moves good entries to bad, never back. A bad entry turns good only when a found escape is repaired. Bad entries leave only at the retiring rate. At best values the bad share reaches 0.44 [G] by the last period.
- **Two simplifications favour the library.** The mechanical check accepts every good entry and rejects every wrong one. Repair costs nothing beyond the rework.
- **How ranges are drawn.** Drawn on its own, an unknown is spread evenly across its range. Only the library unknowns can be tied, through one shared level. At the middle tie, a library unknown mixes that level with its own draw. Its draws then bunch toward the middle of its range. The middle nine in ten fall between 0.16 [G] and 0.84 [G] of the range. If two chances in a draw add up to more than certainty, both are scaled down. With the current ranges this does not happen. The ranking measures steady rise or fall. It misses an effect that rises and then falls.
- **Weights do not add up.** A weight moves only one limitation's library unknowns. Its other unknowns stay at best. Limitations that share an unknown share its weight. A weight depends on where the other unknowns sit, so the steps moved one after another are the fuller reading.
- **Some limitations the model cannot show.** 4 [M] limitations act through no setting in the model. 3 [M] more are shown only in part. Each one says why when opened.
- **Some tags are generous.** Several figures tagged M or S were measured on another unit than their setting. Each slider's source says how. One outside figure supports two settings in a row.
- **The step matches are set by hand.** A table matches the design's ten steps to the model's stages. Another matches them to the funnel's bars. A limitation is placed through these tables and its unknowns.

## 9. Files

- Page: `docs/program/library-pathways/index.html` (self-contained; opens from disk). Data: map.json, params.json, engine.js, limitations.json, cases.json beside it.
- Page sources and this build: `docs/program/evidence/library-pathways/page-src/`, `build-page.js.txt`; checks in `build-page-report.txt`. Briefs: `model-brief.md` (sections 12 and 13 override), `page-brief.md`.
