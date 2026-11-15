# Check of the third build (2026-11-13)

Scope: the task given for this pass. It covers the numbers, the lean both ways (R18, R18b, R19, R20, R21), the standing rules, the page brief item by item, a cold read as the owner, fixes in the sources, and what is left for the orchestrator.

**Tags.** Every model figure below follows from assumed values, the ranges and middle values in `params.json`. 51 [M] of the 60 [M] drawn unknowns are guesses, so every computed figure carries [G] unless it says otherwise. Counts read from the data files are [M]. Test counts are counts of checks run on this PC. The 59 [M] real cases are chosen problem cases. They show where steps break, never how often.

**Scripts beside this file** (run from this folder with `node - < name.js.txt`; each writes only its own console file):

| Script | What it does | Output |
| --- | --- | --- |
| `check-third-build.js.txt` | Part 1, numbers: time path, references, funnels, usage, square, weights, gate and ladder table, ensembles at three ties, p_promote = 0 targets, hand derivations, conservation over 500 draws | `check-third-build-console.txt` |
| `check-third-build-lean.js.txt` | Part 2, the lean: (a) group membership, (b) the anchor, (c) a search of the ranges, (d) R21 and a ladder counterpart, (e) shared levels at tie 1, and R20 at the low ends | `check-third-build-lean-console.txt` |
| `check-third-build-rules.js.txt` | Part 3, the rules: fix, verdict, rate and advice wording in 2,457 texts; terms against the word list; numbers without a tag in the record | `check-third-build-rules-console.txt` |

## 1. Numbers: confirmed

All checks in part 1 match the page and the build report. **Misses: 0.** The page shows the same figures in the browser.

**Middle values, last period [G].** Strong directly 29.92 per piece, 11.20% wrong. Cheap with the ladder 25.68, 21.24%. Library first period 26.39, 21.24%; last period 26.555, 21.390%. Ratios last period: cost and wrong against the ladder 1.034 and 1.007, against the strong model 0.888 and 1.910. Final stocks 67.77 good, 54.65 bad. The bad share at the start of the last period is 0.440. With an Opus price ratio of one, the cost against the strong model is 1.229.

**Corner table, last period [G].** Order: cost/ladder, wrong/ladder, cost/strong, wrong/strong. Corner digits: comes back, reach, entry quality; 0 poor end, 1 good end.

| Setting | c/l | w/l | c/s | w/s |
| --- | ---: | ---: | ---: | ---: |
| middle | 1.034 | 1.007 | 0.888 | 1.910 |
| 000 | 1.034 | 1.023 | 0.887 | 1.940 |
| 001 | 1.011 | 1.000 | 0.868 | 1.897 |
| 010 | 1.429 | 1.558 | 1.226 | 2.956 |
| 011 | 1.062 | 0.997 | 0.912 | 1.891 |
| 100 | 1.035 | 1.025 | 0.889 | 1.944 |
| 101 | 1.027 | 0.919 | 0.881 | 1.744 |
| 110 | 1.530 | 1.713 | 1.313 | 3.250 |
| 111 | 0.816 | 0.666 | 0.701 | 1.264 |
| all_good | 0.750 | 0.666 | 0.644 | 1.264 |
| worst_corner | 1.750 | 1.713 | 1.502 | 3.250 |
| all_good_costly | 0.925 | 0.666 | 0.794 | 1.264 |

**Square [G]** (11 by 11 [M], cells below the ladder): little comes back cost 0, wrong 23, both 0 of 121, cost ratio 1.01 to 1.43; middle cost 0, wrong 46, both 0, 1.01 to 1.44; much cost 17, wrong 58, both 17, 0.82 to 1.53.

**Funnel, cheap-wrong work, last period [G]:** 13.052, 4.813, 2.324, 1.302, 1.146, 0.974, 0.348. All-good marks: 92.00, 67.47, 59.75, 55.71, 55.04, 53.94, 31.74. All work: 8.497, 3.262, 1.575, 0.882, 0.776, 0.660; calls saved 2.038.

**Promoted checks [G].** Of the same hundred, 0.036 more caught at the first gate at middle values, 2.830 at all_good, 4.858 at corner 101. Usage panel: looked up 29.0, good in hand 0.660, wrong in hand 1.830, lookup cost 0.290, write cost 0.4265, promo caught at the first gate 0.0134, at any gate 0.0207, promo strength 0.0906. Chance a piece climbs 0.097.

**Weights [G].** Full fall 30.64% (cost 27.44%, wrong 33.84%).

| Group | Alone | Last |
| --- | ---: | ---: |
| entry quality | 6.0% | 104.1% |
| comes back | 0.2% | 82.4% |
| reach | −12.4% | 68.2% |
| running cost | 3.3% | 10.4% |

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Alone | 1.4 | −5.3 | 1.9 | 10.9 | −0.3 | 0.5 | 2.3 | −3.6 | 9.2 | 3.7 |
| Last | 17.9 | 68.0 | 24.8 | 94.0 | 11.7 | 30.3 | 16.2 | 8.8 | 78.1 | 29.9 |

Sequence: 4 10.9, 2 23.6, 9 50.3, 6 57.1, 7 61.5, 1 62.9; steps 3, 5, 8 and 10 add exactly 0; the unnamed unknowns (u_composite, r_exact, a_right, s_comp, s_part, retire_bad, p_promote) add 37.1, to 100. Top limitations by last: LIM-15 59.0, LIM-57 46.0, LIM-08 45.6, LIM-03 and LIM-07 38.3. Not weighed [M]: LIM-26, 44, 62 and 68 have no setting; LIM-32, 34, 41, 42, 43, 45 and 47 act through the gate or the ladder.

**Gate and ladder table, last period, cost and wrong [G].**

| Base, moved | Library | Ladder | Strong |
| --- | --- | --- | --- |
| middle, as is | 26.6, 21.4% | 25.7, 21.2% | 29.9, 11.2% |
| middle, gate | 39.2, 7.9% | 37.9, 7.9% | 36.4, 8.5% |
| middle, ladder | 23.7, 17.1% | 23.1, 16.9% | 26.0, 1.6% |
| middle, both | 32.9, 2.8% | 31.8, 2.8% | 31.4, 0.5% |
| all_good, as is | 19.3, 14.2% | 25.7, 21.2% | 29.9, 11.2% |
| all_good, gate | 29.1, 5.3% | 37.9, 7.9% | 36.4, 8.5% |
| all_good, ladder | 17.1, 11.0% | 23.1, 16.9% | 26.0, 1.6% |
| all_good, both | 24.8, 1.8% | 31.8, 2.8% | 31.4, 0.5% |

**Ensembles** (1000 runs, seed 20261112, last period; middle run and 5 to 95 in 100) [G]:

| Measure | tie 0 | tie 0.5 | tie 1 |
| --- | --- | --- | --- |
| Cost vs ladder | 1.038 (1.012–1.099) | 1.043 (1.012–1.112) | 1.040 (0.995–1.213) |
| Wrong vs ladder | 1.007 (0.993–1.062) | 1.009 (0.978–1.107) | 1.008 (0.923–1.297) |
| Cost vs strong | 0.997 (0.511–2.092) | 1.006 | 1.014 |
| Wrong vs strong | 1.888 (0.975–6.365) | 1.906 | 1.942 |
| Better than the ladder | 0.3% | 0.3% | 6.1% |
| Better than the strong model | 3.3% | 3.8% | 3.5% |

The page's own run gives the same table. Ranking at tie 0: c_write +0.42, w_write +0.37, n_cheap −0.35, c_lookup +0.26. At tie 0.5 the quality unknowns sit at about ±0.40. At tie 1 the page shows group rows: entry quality −0.66, reach +0.40, running cost −0.30.

**p_promote at 0.** Every section 14 target is matched: the corners, all_good, worst_corner, the full fall 0.2902, the groups, the steps, the sequence, and the gate and ladder table.

**By hand.**
- Promoted-check catch, class visible / cheap wrong / exact held / no look-alike: g 0.865, promo 0.039204, g_lib 0.870292. Extra caught 0.46689 per 100, equal to the engine.
- The whole cheap-wrong funnel by hand equals the engine. Promo per 100 cheap-wrong work 0.03638, equal.
- Step 4: alone 0.10940 and last 0.93987 by hand, equal to the engine. The full fall by hand matches.
- Last-period stocks 63.5036 good and 49.8852 bad. Bad share 0.4399, fill 0.9413, look-alike chance 0.3396.

**Conservation.** 500 draws (250 at tie 0, 250 at tie 1): 4,843,000 checks, 0 failing, largest error 5.55e-16. No funnel stage rose.

## 2. The lean, both ways

**(a) Group membership.** Each library unknown is in one group (map.json `lib_groups`). Four moves were tested; all_good does not change under any of them.
- A1: a_right and p_promote moved to reach. Only corner 101 changes: cost 1.027 → 1.008, wrong 0.919 → 0.998 [G]. As built, the wrong-rate drop at poor reach comes through p_promote sitting in quality. On wrong rate this leans toward the library; on cost, against it.
- A2: the calls saved (s_*) held at middle in the corners. Corner 111 cost 0.816 → 0.904 [G]. As built, this leans toward the library by 0.088.
- A3: v_max, k_distract and delta_stale moved to comes back. Worst corner 1.750 → 1.546, 110 1.530 → 1.365, 100 1.035 → 1.016, 011 1.062 → 1.069 [G]. As built, this leans against the library.
- A4, all moves: worst corner 1.528, 111 0.904, 101 1.009 / 0.998, 110 1.346 [G].

**(b) The anchor of the weights.** With the anchor at three quarters of the way to the good ends, the full fall is 12.94% [G]; at half, 4.51% [G]. The group order by last is the same at every anchor (quality 107.4, comes back 75.2, reach 56.4, running cost 14.0 at 0.75). Steps by last: at 0.75, steps 6 and 10 swap, and 1 and 7 swap. At 0.5 the order is 4, 9, 2, 10, 7, 6, 1, 3, 5, 8, and step 8's last is −1.7%. The order by alone does not change. The top three steps (4, 9, 2) hold at every anchor.

**(c) A search of the ranges** (library unknowns only, coordinate search over 0, ¼, ½, ¾, 1 and the middle). Lowest cost against the ladder: 0.726 with wrong 0.713 [G], against all_good 0.750 and 0.666. At that point p_promote and c_check_share sit at their poor ends and w_write at 0.4. So all_good shows 92.2% of the available cost fall. Highest: 1.750, equal to worst_corner, which shows 99.9% of the available rise.

**(d) R21, promoted checks** (last period, cost/ladder and wrong/ladder [G]).

| Setting | p_promote 0 | 0.5 (as built) | 1 |
| --- | --- | --- | --- |
| middle | 1.034 / 1.008 | 1.034 / 1.007 | 1.034 / 1.006 |
| all_good | 0.739 / 0.710 | 0.744 / 0.689 | 0.750 / 0.666 |
| corner 101 | 1.007 / 0.997 | 1.016 / 0.959 | 1.027 / 0.919 |

Note: all_good and corner 101 put p_promote at its good end, 1. At middle values, moving p_promote from 0 to 1 changes the ratios by 0.002 or less. At all_good, the same move raises cost by 0.011 and lowers wrong by 0.044 [G]; from its middle value to 1, by 0.006 and 0.023. R21 lowers the wrong rate and raises cost. A counterpart was built for this check only: the ladder and the strong model get the same promoted checks from the library's stocks. Then library against the ladder is 0.737 / 0.720 at all_good (as built 0.750 / 0.666), 1.008 / 0.993 at corner 101 (as built 1.027 / 0.919), and unchanged at middle. Ensembles with p_promote pinned at 0: runs better than the ladder 0.3%, 0.4% and 7.9% at ties 0, 0.5 and 1, against 0.3%, 0.3% and 6.1% as built. The "cheaper, wrong no higher" count penalises R21's trade of cost for wrong rate.

**(e) Shared levels at tie 1**, runs better than the ladder [G]: independent levels (as built) 6.1%; all four levels tied together 28.6%; quality tied against reach 0.4%. At tie 0.5: 0.3%, 6.8% and 0.3%. As built, the four levels sit between the two extremes.

**R20 at the low ends** (the table moves each group only to its high end; lean script). At middle values, gate low: wrong against the strong model 2.213. Ladder low: 1.062. Both low: 1.025 / 1.006 / 0.713 / 1.160, against both high 1.034 / 1.006 / 1.048 / 5.276 [G]. At all_good, both low: 0.759 / 0.714 / 0.529 / 0.823, against both high 0.780 / 0.651 / 0.790 / 3.414 [G]. The high ends give the strong model its lowest wrong rate. So the table shows the largest wrong-rate gap against the strong model.

**Which way the model leans.** Roughly balanced, with signs both ways. The ranking and the reference settings are stable.
- Toward the library: p_promote in quality (101 wrong −0.079); calls saved in quality (111 cost −0.088); promoted checks only on the library's way (all_good wrong against the ladder 0.666, against 0.720 with the counterpart).
- Against the library: look-alikes and staleness in quality (worst corner +0.204, 110 +0.165); R21 raises cost (all_good 0.739 → 0.750; runs better than the ladder at tie 1 7.9% → 6.1%); all_good is not the cost minimum (0.726 is reachable); the gate and ladder table shows only the high ends (against the library on wrong rate against the strong model).
- Neutral: worst_corner shows 99.9% of the rise; independent levels sit between the extremes; the anchor keeps the group order and the top three steps.

## 3. The standing rules

Scan of 2,457 texts (page copy, data files, the record), then read by hand.
- **Fixes or advice:** 21 hits, none a proposal. All are past events in case notes ("The fix would be stored"), quoted records, stored entries, a saving estimate's mechanism, or "should" as an expectation in a range note.
- **Verdicts:** 1 hit, the definition of "Good end" ("where the design works as intended"). This is a definition, not a verdict.
- **Cases read as a rate:** none in the page copy. The hits are "most" or "common" about unknowns, words or studies, and the warnings that cases never show how often.
- **Weights worded as advice:** none.
- **Retired word "best" in visible slider notes:** u_similar, s_review, m_fable, retire_bad. *Fixed.*
- **Undefined terms:** screen, window, handoff, mechanical check, escape, stale, compaction, subagent, lookup, capture, ceiling, middle run, thought experiment, case family, other way, several parts, and Sonnet / Opus / Fable. *Fixed* (the word list).
- **Record:** the rank-correlation definition was printed twice. The square line carried one tag for three sheets, with lowercase sheet ids. The groups and steps line had no tag until its last sentence. *Fixed.* Numbers left without a tag in the record are unit definitions (one cheap call costs 1; a period is 30 days), step and stage ids, the seed and the run count. The case-saving lines end with their own [M] or [G].

## 4. The page brief, item by item

Local server `pathway-map`, port 5199, 644 px pane, after the fixes.

1. **Title, two sentences, tags on one line; nothing else above the map.** Met. 58 words above the map in the browser, 62 in the build's count.
2. **The map.** Met. Smallest graph text 11.0 px [M] at a 644 px pane, 117 text elements; the graph is 1709 by 739.6 px and scrolls sideways inside its box. The promoted-check path is drawn from the stock of good entries to the gates, labelled "promoted checks, no lookup".
3. **The funnel.** Met. One faint mark at all_good. The line under it gives 0.04 [G] more caught at the first gate at middle values.
4. **Three conditions.** Met. One sentence each, plus running cost. Corner table with pattern marks (solid, ring, hatched), all_good with cheap and costly running cost, and the worst corner. The square has both toggles, the line at one, and a cell tap for four ratios. No sentence says what to conclude. New line: promoted checks need no lookup, so entry quality acts even at poor reach.
5. **Where real cases broke.** Met, as built.
6. **The limitations.** Met. Two-weights box with the full fall and its tag. It now also says alone can be below zero and last can pass the whole fall. Groups and steps ranked by last with both bars. Waterfall ending in the unnamed unknowns, now with a line naming the steps that add nothing. Table rows with cases, families, other way, alone and last; ↔ for shared unknowns; "gate or ladder" rows link to the table; "not in the model" rows. Gate and ladder table as specified; its lede now says each group moves one way only.
7. **Run it.** Met. No three-setting table. The usage panel shows the promoted-check figures. The stock drawing has the promoted-check arrow and marks the two loops it closes.
8. **Many runs.** Met. Ties 0, 0.5 and 1 side by side; four shared levels; "No group is tied to another"; "51 of the 60 drawn unknowns are guesses". New note at tie 0.5 explains why one group's unknowns show similar correlations.
9. **What the map leaves out.** Met, with two new items: the groups are a judgment; only the library's checks join the tests.
10. **Words behind one tap.** Met. 5 visible words when closed.

**Size and text.** 496,494 bytes (limit 500,000; the pane refuses over 524,288). Visible words with everything collapsed: 2,486 in the browser, 2,478 in the build (limit 2,500). Longest sentence: 18 words in page copy, 20 in data text. Retired words: 0. Page height 15,010 px at 644 px. No sideways page scroll at 644 or 375 px. No console messages. No browser storage; one dark-mode block. One `<details>` opens by default: the first slider group.

## 5. Cold read as the owner

**What confuses.**
- The waterfall repeated 62.9% for four steps with no reason given. *Fixed:* a line names steps 3, 5, 8 and 10 as adding nothing, because earlier steps already moved their unknowns.
- Reach "alone" is −12.4% and quality "last" is 104.1%. The box did not say a weight can leave 0 to 100%. *Fixed:* one sentence.
- Corner 101 has a low wrong rate at poor reach, which reads like a mistake. *Fixed:* one sentence on promoted checks.
- At tie 0.5 four quality unknowns all show +0.40. *Fixed:* a note at that tie.
- Many terms were used and never defined. *Fixed:* the word list.

**Too long.** The page sits at 2,486 of 2,500 visible words. The longest boxes are the map (537 words) and the limitations (475). The word list is long (958 words), but it stays behind one tap. Limitation details carry raw record pointers (commit ids, line numbers) in their examples. They are evidence, kept as data, and are shown in mono type.

**What his method needs.**
- *What each limitation costs if it is the one left unsolved* is "last" in the list. Each detail adds an "All good but this" column with the four ratios. With all else at its good end, all 58 [M] measured limitations, each left alone at middle values, keep the library below the ladder on cost and on wrong rate [G]. The highest is LIM-15, at 0.912 / 0.873 [G]. Whole groups or steps left unsolved can cross one: quality left at middle gives 1.029 / 1.038, step 4 gives 1.027 / 0.977 [G]. This rests on the all-good anchor, which is itself a guess. The list does not show this crossing at a glance; it takes one tap per limitation.
- *In which cases the design pays* is the corner table and the square. Below the ladder on cost: corner 111, all_good, all_good_costly, and 17 [G] of 121 cells on the "much comes back" sheet. None on the other two sheets.
- 37.1% of the full fall belongs to unknowns no limitation names (p_promote, a_right, r_exact among them). The waterfall shows this by name.

## 6. Fixes made (sources only, then rebuilt)

| Where | What changed |
| --- | --- |
| `page-src/text.json` words | 17 entries added: cheap model, Opus and Fable; lookup; several parts; screen; mechanical check; window; stale; capture; ceiling; escape; handoff; middle run; case family; other way; thought experiment; subagent; compaction |
| `page-src/text.json` sections | `conditions.promo_note`, `lims.sign_def`, `lims.seq_zero`, `many.rank_half` added; `lims.gate_lede` gains one sentence |
| `page-src/text.json` leaves_out | Two items: "The groups are a judgment" and "Only the library's checks join the tests" |
| `page-src/page.js.txt` | Corner note (only when the map declares a promoted-check measure); square lede no longer repeats the tap line; sign sentence in the two-weights box; the zero-step line under the waterfall, computed from `weights().sequence`; the tie-0.5 note |
| `build-params.js.txt` | Notes of u_similar, s_review, m_fable and retire_bad say "the middle value" instead of "best"; a dated line in `assumptions`. No number changed: only those four notes differ in `params.json` |
| `build-page.js.txt` (record) | Duplicate rank-correlation definition removed; the square line tagged per sheet with sheet names; groups, steps and sequence each tagged; the zero-step line; the corner note; the tie-0.5 note; "What moves" before the gate moves |

Rebuilt: `node - < build-params.js.txt`, then `node - < build-page.js.txt`. Checks failed: 0.

## 7. Left for the orchestrator

These need a change to section 14's model meaning or to the page brief, so they were not made.
1. **Group placement** of p_promote, the calls saved, and look-alikes and staleness (A1 to A4 above).
2. **R21 is one-sided.** The other ways get no accumulating checks. A counterpart moves all_good wrong against the ladder from 0.666 to 0.720, and corner 101 from 0.919 to 0.993 [G].
3. **all_good is not the cost minimum.** 0.726 against 0.750 [G]; all_good shows 92.2% of the available fall.
4. **The anchor.** The full fall is 30.6%, 12.9% and 4.5% [G] at anchors 1, 0.75 and 0.5. The group order and the top three steps hold. Showing another anchor needs a declared setting.
5. **R20 shows only the high ends.** Both low against both high, wrong against the strong model: 1.160 against 5.276 at middle values, 0.823 against 3.414 at all_good [G].
6. **The "cheaper, wrong no higher" count** penalises R21's trade (tie 1: 7.9% without promoted checks, 6.1% with) [G].
7. **"All good but this" at a glance.** The owner's method reads it from each detail. A column in the list would depart from the brief's column list.

## 8. Final numbers after the fixes

Unchanged. Only wording changed. The part 1 console is byte-identical after the rebuild. The build's parity checks compare 6,301 engine numbers with a largest gap of 0.

## 9. Tests after the fixes

- `engine-test.js.txt`: 61 of 61 passed.
- `rev4-regression.js.txt`: 0 misses, 0 section 14 targets missed; largest gap 5.90e-17 over 75,364 numbers. Console byte-identical.
- `run-v4.js.txt`: outputs byte-identical.
- `verify-engine.js.txt`: 21 of 31, the same checks failing as before. It is the revision-1 check and predates revisions 2 to 4 (see `check-second-build-fixes.md`). Its output file was restored to the earlier copy, so this pass leaves it unchanged.
- `check-third-build.js.txt`: misses 0; console byte-identical to the first run.
- `check-third-build-lean.js.txt`: console byte-identical to the first run.
- `check-third-build-rules.js.txt`: re-run; the differences are only the fixes listed in section 3.
- Build: checks failed 0; 496,494 bytes; 2,478 visible words; record 242 lines; smallest graph text 11 px; longest sentence 18 (copy) and 20 (data).
- Browser: 2,486 visible words, 58 above the map, height 15,010 px, no sideways scroll at 644 or 375 px, 0 untagged digits, no console messages. The ensemble table matches node, and the tie-0.5 note shows.

Nothing is committed. `.claude/launch.json` was not touched.
