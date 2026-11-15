# Check of the second build before the owner sees it (2026-11-12)

This is the working behind the checker's return. It checks the page, the record and the data files after revision 3 (`model-brief.md` section 13) and the page brief. It proposes nothing for the library. Every "what to change" below is about the map, the page or the record.

**Tags.** [M] counted or measured on this PC from the files named. [S] outside study or price list. [G] computed by the model; its inputs include guesses.

**Scripts.** Both run from this folder with `node - < name.js.txt`. Both read the data files and change nothing on disk except their console file.
- `check-second-build.js.txt` writes `check-second-build-console.txt`: best values and time path, reference settings, funnel and a hand derivation, weights, the direction of every good end, a corner search, tie checks, ensembles at ties 0, 0.5 and 1, conservation over 500 draws, the counts under the funnel.
- `check-second-build-2.js.txt` writes `check-second-build-2-console.txt`: a tilt test with a tie that couples heavy use with poor entries.

**The page in the browser pane.** The pane loaded `index.html` as a data snapshot. It showed every limitation, works item and `<details>` open, and set `display: none` on most sections. The page's own code does neither (checked in `page.js.txt`). I closed everything by hand and removed those styles before counting words. Screenshots timed out, so layout at phone width and in dark mode was not checked.

---

## 1. Numbers

Everything below matches unless the row says otherwise.

| What | Page or record | My run | Match |
| --- | --- | --- | --- |
| Strong directly, cost and wrong rate | 29.9 / 11.2% [G] | 29.92 / 11.20% | yes |
| Ladder | 25.7 / 21.2% [G] | 25.68 / 21.24% | yes |
| Library, first and last period | 26.4, 26.6 / 21.2%, 21.4% [G] | 26.39, 26.55 / 21.24%, 21.40% | yes |
| Ratios, last period (cost and wrong vs ladder, vs strong) | 1.03, 1.01, 0.89, 1.91 [G] | 1.034, 1.008, 0.887, 1.911 | yes |
| Cost vs strong with an Opus price ratio of one | 1.23 [G] | 1.229 | yes |
| Stocks after the last period | 67.7 good, 54.6 bad [G] | 67.71, 54.61 | yes |
| Bad share at the start of the last period | 0.44 [G] | 0.440 | yes |
| Unfavourable / best / favourable, cost vs ladder | 1.05 / 1.03 / 0.74 [G] | 1.054 / 1.034 / 0.739 | yes |
| The same, wrong vs ladder | 1.02 / 1.01 / 0.71 [G] | 1.023 / 1.008 / 0.711 | yes |
| The same, cost vs strong | 0.90 / 0.89 / 0.63 [G] | 0.905 / 0.887 / 0.634 | yes |
| The same, wrong vs strong | 1.94 / 1.91 / 1.35 [G] | 1.940 / 1.911 / 1.348 | yes |
| The same, funnel's last number | 0.00003 / 0.35 / 31.7 [G] | 0.000031 / 0.348 / 31.71 | yes |
| Funnel, best values, last period | 13.1, 4.8, 2.3, 1.3, 1.1, 0.97, 0.35 [G] | 13.05, 4.81, 2.32, 1.30, 1.15, 0.97, 0.35 | yes |
| Funnel marks, unfavourable and favourable | as in record §2 | same | yes |
| All-work funnel | 8.5, 3.3, 1.6, 0.88, 0.78, 0.66, calls saved 2.0 [G] | 8.50, 3.26, 1.58, 0.88, 0.78, 0.66, 2.04 | yes |
| Single weights, top five | LIM-65 1.2%, LIM-13, 25, 14, 18 0.8% [G] | 1.205%, 0.848%, 0.847%, 0.839%, 0.808% | yes |
| Step weights, top five | 4 3.3%, 9 2.6%, 10 1.1%, 7 0.6%, 3 0.6% [G] | 3.28, 2.57, 1.13, 0.61, 0.59 | yes |
| Steps one after another | ends 18.4%, funnel 20.0 [G] | 18.38%, 19.98 | yes |
| Time path, 12 periods | flat ratios | 1.028 to 1.034 cost vs ladder | yes |
| Ensemble, tie 0 (1000 runs, seed 20261112) | 1.04 (1.01 to 1.10); 0.3%; 3.3% [G] | 1.038 (1.011 to 1.099); 0.3%; 3.3% | yes |
| Ensemble, tie 0.5 | 1.04 (0.99 to 1.08); 8.1%; 3.6% [G] | 1.036 (0.992 to 1.085); 8.1%; 3.6% | yes |
| Ensemble, tie 1 | 1.03 (0.80 to 1.08); 30.2%; 5.8% [G] | 1.031 (0.797 to 1.076); 30.2%; 5.8% | yes |
| Ensemble rows for wrong rates, cost vs strong and the funnel's last number | record §7 | same at all three ties | yes |
| Rankings at ties 0 and 0.5 | record §7 | same | yes |
| The page's own ensemble, 1000 runs, same seed | — | same table as the record, run in the pane | yes |
| Counts under the funnel bars | 22, 24, 28, 29, none, 2, 31, after 40 [M] | same | yes |

**Hand derivation.** One class: visible, cheap model wrong, the same problem held, no look-alike, at the last period's starting stocks (63.45 good, 49.86 bad [G]). By the brief: held 100; looked up `t_visible` = 50; right back × `r_exact` = 37.5; good × (1 − 0.440) = 21.00; screened × (0.2 + 0.8 × 0.85) = 18.48; in the window × 0.85 = 15.71; right × 0.75 = 11.78 [G]. The engine gives the same seven numbers to four decimals. The class chance by hand, 0.004476 [G], equals the engine's.

The whole cheap-wrong funnel by hand, summed over kind and what is held: 13.05, 4.81, 2.32, 1.30, 1.15, 0.97, 0.35 [G]. It equals the engine's.

**Conservation.** 500 draws, 250 at tie 0 and 250 at tie 1. Each was checked at the empty stocks and at its last period's stocks. 4,843,000 [M] checks; 0 failed; largest error 5.6e-16. Every funnel was non-increasing stage by stage in every draw.

**Ties.** At tie 1 with shared level 1, every library unknown equals the favourable reference; with level 0, the unfavourable one. Other unknowns do not depend on the level. Tie 0 reproduces the untied draw number for number. The formula matches R14.

---

## 2. Tilt after revision 3

**R11 and R12 are applied as written.** Coverage is `1 − exp(−(E_good + E_bad) / k_fill)`. A returned entry is bad with chance `wrong_share`. Each period `retire_bad × E_bad` leaves, range 0 to 0.3, best 0.05, tag G. R10 is applied: the Opus price ratio runs 1 to 2, best 2, tag G.

**Sides and good ends.** All 37 [M] library-side unknowns and their good ends follow R13 and their meanings. One is debatable: "Lookup finds some parts" (`r_comp_part`) has its good end high. Returning only some parts is a partial failure, but it beats returning none. Its effect is below 0.0001 [G].

**The good end is not always the end that lowers the ratios.** Each library unknown was moved alone from best to its good end. For 8 [M] of the 37, at least one ratio rose. Three rise by more than 0.01 [G]:
- Lookup starts, visible work: cost vs ladder +0.013 [G]
- Lookup starts, latent work: +0.015 [G]
- Entry written after a strong solve: +0.022 [G]

The others are tiny: delivery, the holding cut for work the cheap model gets right, the parts ceiling, and both parts-returned chances. The reason: at best values a lookup mostly returns nothing or a bad entry, and a write costs Opus calls.

R13 defines a good end as "where the mechanism works as intended". It mixes two kinds of unknown:
- how much the library is used (what it holds, lookups, returns, delivery, writes)
- how good what it returns is (entry quality, look-alikes, harm, acceptance of wrong entries)

**Consequence 1: the reference settings show the upside and almost none of the downside.** Corner search over the 37 library unknowns, others at best, last period:

| Cost vs ladder [G] | Reference | Searched corner |
| --- | --- | --- |
| Lowest | favourable 0.739 | 0.726 |
| Highest | unfavourable 1.054 | 1.750 |

At the highest corner the 14 "use" unknowns sit at their good ends. The quality unknowns sit at their bad ends. Its ratios are: cost vs ladder 1.75, wrong vs ladder 1.71, cost vs strong 1.50, wrong vs strong 3.25 [G]. Measured from best values, the favourable reference shows 96% [G] of the available fall. The unfavourable reference shows 2.8% [G] of the available rise. The unfavourable reference is a library that is barely used, so it can do little harm.

**Consequence 2: the tie can only add good outcomes.** R14 ties use and quality together. So no tied run is a much-used library with poor entries. A tie that runs quality against use was tried (500 runs, seed 424242, `check-second-build-2-console.txt`):

| Tie 1 [G] | Cost vs ladder, 5 / 50 / 95 in 100 | Wrong vs ladder, 95 in 100 | Runs better than the ladder |
| --- | --- | --- | --- |
| As built | 0.80 / 1.03 / 1.08 | 1.05 | 31% |
| Quality against use | 1.00 / 1.05 / 1.44 | 1.60 | 0% |

**Consequence 3: 13 [M] limitations have a negative weight.** Moving their unknowns to the good end raises the ratios at best values. They include "Nothing fails, so no lookup starts", −1.4% [G], the limitation with the most real cases, 21 [M]. Step 2 (trigger) is −1.6% [G] alone, yet it is second in the sequence, adding 3.9 points [G] after step 4.

**Consequence 4: the sequence stops short of the favourable setting.** Moving every limitation's unknowns gives a fall of 18.4% [G]. The favourable reference gives 29.0% [G]. Six library unknowns are named by no limitation: the parts ceiling, "Lookup finds the same problem", "Cheap model accepts a good entry", the two parts-saving shares, and "Bad entries leaving the stock". Alone at best values they move cost vs ladder only from 1.034 to 1.030 [G]. With everything else favourable they carry the remaining 10.6 points [G].

**Leans carried over from the first build.** The perfect check and free repair favour the library, by 0.001 [G] or less. A good entry that never helps the retry or Opus works against it, by 0.01 [G] or less. The Opus price ratio's best value, 2, is the library-favourable end of its 1 to 2 range on the owner's-goal comparison: 0.89 [G] there, 1.23 [G] at 1. Every reference setting holds it at 2. The page puts the "may be nearer 1" line beside that row.

**Coverage ceilings after the today's-notes ruling.** Their meaning changed to "beyond what today's notes hold". Their values and sources did not change. "Ceiling: a similar entry held" (S) comes from outside studies of recurring fix patterns that count no notes at all. This leans toward the library, by an amount the map cannot size.

**Which way it leans now.** At best values the engine is near level with the ladder: 1.03 cost, 1.01 wrong [G]. The first build's lean against the library (0.0% of runs better than the ladder) is gone: 0.3% at tie 0 [G]. What revision 3 added leans the other way. The reference settings and the tie reach the favourable corner. They cannot reach the corner where the library is used heavily with poor entries. That corner is worse by about 0.70 [G] on cost vs ladder. Nothing stops the library from looking good. The reference settings and the tie stop it from looking as bad as its own ranges allow.

---

## 3. Rules

**Fixes.** None found in the page copy or the record. The five wordings the build lists ("The fix would be…", "The fix is…" twice, "the answer is a policy choice", "Subagents should return…") describe past cases or quote records.

**Verdicts.** No sentence says the library will or will not work. Two headings read as one:
- "Where it worked" (page section 4 and record §6). The library has never existed. All 6 [M] savings seen came through notes that exist today. The other 9 [M] are walkers' estimates. The first refuter renamed this section; the second build named it back, following the page brief's wording.
- "Unfavourable" for a setting that is not the worst the ranges allow (section 2 above).

**Numbers without a tag.**
- Run it, the box against the strong model: "With an Opus price ratio of one, cost: 1.23." No tag is visible; only the container carries G.
- The small "first period" figures in the two ratio boxes carry no visible tag.
- Record §5 and the page show "Weight 0% [G]" for limitations with no setting. That zero is not computed.
- A works item tagged [M] contains an inference: f07-4, "avoided at least two failed cloud builds".

**The chosen cases read as a rate.**
- LIM-03's description: "Most defects were written while building, with checks green." "Most" is a rate over the 59 [M] chosen cases.

**Undefined terms.**
- Record §7: "rank correlation" (the page explains it; the record does not).
- Page, under the screen bar: "with step 6", with nothing else.
- Case notes and entries: pdftoppm, heredoc, CSRF, `job_event.seq`, `EXPO_PUBLIC_SENTRY_DSN`, migration numbers such as 0046. The owner may know them.

**Sentences over 20 words.** The build checks only the page copy: 256 [M] sentences, longest 18 [M]. Text from the data files was not checked. In it, 75 [M] of 1,776 [M] sentences run over 20 words, up to 29 [M]:
- limitation descriptions, 21 [M]
- case step notes, 16 [M]
- works items, 11 [M] of 15 [M]; the record prints these in full in §6
- case entries 11 [M], case stories 4 [M], "went the other way" reasons 6 [M], works caveats 3 [M], "cannot show" reasons 2 [M], one "worked" note

**A limitation's weight worded as advice.** None found. The definition reads as a measurement: "how much it holds the result down".

**The picture is the model.** The funnel, references, ties and weights are declared in `map.json` and computed by `engine.js`. A few figures are worked out in `core.js.txt` from the engine's flows, with no measure declared in the map:
- the usage panel
- "Share of work that climbs to Opus or Fable" in the stock drawing
- the cost ratio at an Opus price ratio of one

---

## 4. The page brief, item by item

| Item | Finding |
| --- | --- |
| Order | Hero, map, funnel, cases, limitations, run it, many runs, left out, words. Matches. |
| Above the map | Top bar (name, eight links, theme button) and the hero: title, two sentences, the three tags on one line. 61 [M] words. Matches. The word list is behind one tap, at the bottom. |
| The map | Kept as built. |
| Funnel present and correct | Present. Values and both marks equal the engine. Counts under each bar equal the data. Tapping a bar opens its step's limitations. Two problems: see must-fix 5 and should-fix 4. |
| Where real cases broke | Kept, with the chosen-cases line and the earlier-design marks. |
| Limitations collapsed with weights | Collapsed at load, one line each: title, cases, families, other way, weight. Two ranked lists above. The works list sits beside. Problems with the zeros and the negatives: must-fix 2 and 3. |
| Reference settings | One small table, three columns, the four ratios and the funnel's last number. Matches. Naming problem: must-fix 1. |
| Tie control | Runs ties 0, 0.5 and 1 and shows them side by side. Matches. The page defaults to 300 runs while the record quotes 1000. The ranking at tie 1 cannot rank: must-fix 6. |
| Words with everything collapsed | 2,440 [M] by the build; 2,448 [M] by my count in the pane. Under 2,500. After "Run at all three ties" about 2,880 [M] are visible. |
| No sentence over 20 words | Page copy passes. Data text fails 75 [M] times (section 3). |
| Today's notes | Present, and "the ladder keeps no notes" is gone. The brief says to say it once, beside the ladder comparison. The page says it three times: in the reference table, in the ladder ratio box, and in "What the map leaves out". The record says it twice. |
| No fixes, no verdicts, tags, cases not as rates | See section 3. |
| Record under 250 lines | 214 [M] lines. |
| Phone width, light and dark | Not checked: the pane's screenshots timed out. |

---

## 5. Cold read as the owner

**What he will see first.** The hero is clean. The map is dense: 40 [M] boxes and four selectors. The funnel is the clearest picture on the page. 100 pieces go in and 0.35 [G] come out right.

**What will confuse him.**
- The biggest drop in the funnel is the first bar: 100 to 13.1 [G]. It is labelled "step 9, capture". The engine sets that bar mostly by the coverage ceilings and the latent cut. With a full library it would still be 13.9 [G]. Capture moves it by under 1 point [G] at the last period.
- "It is a good entry, not a bad one" is labelled "step 10, afterlife". Over 12 periods at best values, 53.2 [G] bad entries come from writing (step 9) and 20.5 [G] from going stale (step 10).
- "It passes the screen" shows "with step 6" and no counts.
- The most-evidenced limitation shows −1.4% [G]. The definition says only "Below zero, they rise."
- 13 [M] limitations show 0%. Five cannot be shown. Eight act only through the gate or the ladder, which no weight can move by construction. Among them is "Higher tiers lack the missing fact too", 13 [M] cases. The collapsed row looks like a measured zero.
- Every single weight is small, 1.2% [G] at most. The page does not say why. At best values the library turns 0.35 in 100 [G] right, so moving any one limitation changes little. The usage panel that shows this is collapsed.
- Three of the top ten single weights are thought experiments. The top one, "Storing merged answers fills the library with combinations", owes much of its weight to "Calls to write an entry", which it shares with LIM-55.
- At tie 1 the ranking lists eight unknowns at ±0.81 [G]. All 37 [M] library unknowns tie at that value; the eight shown are first by file name.
- "Unfavourable" reads as the worst case. It is 1.05 [G]; the ranges allow 1.75 [G].
- "Where it worked" heads a list in which every seen saving came through today's notes.

**Still too long.** "What the map leaves out" has 22 [M] items. The collapsed limitation list is 618 [M] words. Most of the page's length opens on tap, which is the intent.

**Missing for his method.** He wants the limitations that hold the result down most.
1. A plain line that weights depend on where the other unknowns sit, with the sequence as the reading that accounts for it. The sequence is closed by default.
2. The share of the favourable fall that no limitation names: 10.6 of 29.0 points [G], through six unknowns.
3. Which unknown carries most of each weight.
4. A statement that steps 7 and 8 cannot be weighed by this measure, because their unknowns are shared by every way of working.
5. Where the funnel loses most, by stage. The first bar's loss is set by what recurs and by the latent cut, not by capture.

---

## 6. Must fix

1. **The unfavourable reference is not the bad end of the ranges** (Run it table, funnel marks, record §2 and §3, words list). It is 1.05 [G]; a corner inside the ranges reaches 1.75 [G]. The page's words call it "every library unknown at its bad end". The page and record need to say what it is, a barely used library, and that the ranges hold a worse setting. Whether to add a declared setting for it is for the orchestrator (R15).
2. **Ties lean one way** (Many runs, record §7). R14 ties use with quality, so tied runs cannot be a much-used library with poor entries. The 30.2% [G] at tie 1 has no counterpart. The page and record need one line on this. Whether to add an opposite tie is for the orchestrator.
3. **Negative weights are unexplained** (limitation list, step headers, record §5). 13 [M] limitations and steps 2, 5 and 8 are below zero. The cause: 8 [M] good ends raise the ratios at best values, chiefly both trigger rates and the write rate.
4. **0% rows that are not measurements** (collapsed limitation rows, record §5). Five have no setting; eight move no library unknown. Show them as not measured, with the reason on the row.
5. **The first funnel bar is matched to capture** (funnel, record §2). Its drop is set by the ceilings and the latent cut. Tapping it opens capture limitations. The hand match needs a note on that bar, or a different match.
6. **The tie-1 ranking** (Many runs details at tie 1, record §7). All library unknowns share one correlation, so the list is file-name order.
7. **"How ranges are drawn" is wrong at tie 0.5** (left out, record §8). "Each range is drawn evenly" fails there: the middle 90% of a library unknown's draws spans 0.16 to 0.84 [G] of its range, not 0.05 to 0.95.
8. **The sequence looks complete and is not** (ranked lists, record §5). It ends at 18.4% [G]; the favourable setting gives 29.0% [G]. Name the six unknowns no limitation acts through.
9. **"Where it worked"** (page section 4, record §6). See section 3. The first refuter's rename was undone.
10. **LIM-03 "Most defects…"** reads the chosen cases as a rate.
11. **75 [M] sentences over 20 words** in text from the data files, including 11 [M] of the 15 [M] works items printed in the record.

## 7. Should fix

1. Today's notes are said three times on the page and twice in the record; the brief says once, beside the ladder comparison.
2. The page's ensemble defaults to 300 runs; the record's table is for 1000. Default to 1000, or say the record used 1000.
3. "With an Opus price ratio of one, cost: 1.23" and the "first period" figures need a visible tag.
4. The screen bar shows "with step 6" and no counts. Say in words that step 6's limitations sit under the last bar.
5. "It is a good entry" is matched to step 10, though 53.2 of 73.7 [G] bad entries over 12 periods come from writing (step 9).
6. The ceilings' new meaning ("beyond today's notes") is not reflected in their notes or values. Say so in each note.
7. One line beside the ranked lists: weights are small because the library is used little at best values, with the usage figures.
8. Show which unknown carries most of each limitation's weight.
9. After "Run at all three ties" the page shows about 2,880 [M] words.
10. "1 cases, 1 families" in record §5. "already warns" twice in the f06-C4 works item.
11. Record §7: define "rank correlation" in one line.
12. f07-4 is tagged [M] but "avoided at least two failed cloud builds" is an inference.
13. The usage panel, the climb share and the price-ratio-one figure are worked out in `core.js.txt`, not from measures declared in `map.json`.
14. Case notes use pdftoppm, heredoc, CSRF and file names with no definition.
15. `r_comp_part`'s good end is high; say in its note why returning some parts counts as the good end.
