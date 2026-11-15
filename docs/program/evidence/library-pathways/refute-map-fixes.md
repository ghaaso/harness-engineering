# Refuter findings applied to the library pathway map (2026-11-12)

This file records what was done with each finding in `refute-map.md`. The data and scripts were changed. The page and the record were then rebuilt with `build-page.js.txt`. Nothing generated was edited by hand.

Rules kept: no fixes for a limitation, no verdict on the library, a tag on every number ([M] measured on this PC, [S] from an outside study, [G] a guess), and the 59 [M] cases are a chosen sample.

## 1. Must fix

| Finding | What was done | Where |
| --- | --- | --- |
| MF1, fixed Opus price ratio | The value stays 2 and its range stays one value: changing either changes the model (see section 4). Its tag is now G, not S. Its note gives the per-token versus per-call issue and the call sizes, about 222,000 [M] and 440,000 [M] cache-read tokens. The page and record now show the cost against the strong model directly at a ratio of one beside the ratio of two, computed live at best values, plus the refuter's many-run middles. It is the first caveat in a new "In short" section near the top. | `build-params.js.txt`, `page-src/core.js.txt` (bestFacts), `page-src/text.json` (short, run, leaves_out), `page-src/page.js.txt` (ratio box) |
| MF2, the 0.0% share | The share line in "Many runs" now carries a bold note: the share comes from independent draws as much as from the ranges, with the refuter's tied-draw shares, 13.6% [G] and 24.9% [G], and the search result, 0.58 [G]. The same appears as a caveat in "In short" and in the leaves-out item on independent draws. | `page-src/text.json` (many.independent, short, leaves_out), `build-page.js.txt` |
| MF3, the earlier knowledge-store design | Every walk note that names that design is marked (`ks: true`, 126 [M] of 590 [M] steps, 32 [M] of 172 [M] works cells). The page marks those steps. The cases section and the record carry a note, the "In short" section a caveat, and the leaves-out list an item. "The other design" became "the earlier knowledge-store design". "Not a listed trigger" became "not a trigger in the earlier knowledge-store design". The f01-C1a, f03-C2 and f06-C3 notes were reworded to name it. The word list defines it. | `patch-cases-refute.js.txt` (new), `build-limitations.js.txt`, `page-src/*` |
| MF4, the works list | Renamed "Savings the walks saw or estimated". Each item now says whether it was seen (6 [M], tagged M) or is the walker's estimate (9 [M], tagged G). Each item names the channel that carried it when that channel already exists today (7 [M]). Each item quotes, as a caveat, a step the same walk rated broken or not specified (f01-C3a, f01-C4a, f05-3, f07-5, f09-2, f10-1a). | `build-limitations.js.txt` (WORKS), `page.js.txt`, `build-page.js.txt` |
| MF5, the ladder has no memory | The policy text now says "No library, and no notes of any kind". The ratio boxes are labelled as against no memory. A caveat in "In short" and a leaves-out item say that today's notes are not in the model and that the difference cannot be sized. | `page-src/text.json` |
| MF6, limitations tied only to favourable settings | A new field says whether the model can show each limitation. Not shown: LIM-40, LIM-44, LIM-62 and LIM-68, with no settings. Shown in part, with a reason: LIM-26, LIM-35 and LIM-36. The check-share setting was removed from LIM-35 and LIM-36. Each card says why. A leaves-out item lists them. Another item names the two simplifications that favour the library (a perfect check, free repair) with the refuter's sizes. | `build-limitations.js.txt`, `page-src/core.js.txt` (counts), `page.js.txt`, `text.json` |
| MF7, code names | Every one of the 57 [M] settings has a plain name in `map.json`. Cards, sliders, rankings, tooltips and the record show the plain name; the file id is shown second, as "name in the files". Limitation cards and the record name the families where real cases went the other way, not only their number. | `patch-map-refute.js.txt` (new), `page.js.txt`, `build-page.js.txt` |
| MF8, frequency words | LIM-05 "often a long command" became "which can be a long command". LIM-09 "often in another part of the code" became "maybe in another part of the code". ", often by agents" was dropped from quoted break titles (LIM-58). f05-5 "often a subagent" became "can be a subagent". | `build-limitations.js.txt`, `patch-cases-refute.js.txt` |

## 2. Should fix

| Finding | What was done |
| --- | --- |
| 1, bad entries take lookups from good ones | Disclosed in the leaves-out item "Bad entries stay bad, keep being found, and take lookups from good ones", with the refuter's 0.17 [G]. The loop R1 note says it rests on this. The model was not changed. |
| 2, bad entries never fade | The same item, with 0.69 [G] and 0.04 [G] at 36 [G] periods. The model was not changed. |
| 3, a good entry never helps the retry or Opus | Leaves-out item "An entry acts only at the cheap attempt", with 0.1% [G]. The model was not changed. |
| 4, low use | A new usage panel on the page and paragraph in the record, computed live from the engine at the current settings: share looked up, good and wrong entries in hand, write and lookup cost, uses per good entry. Also a caveat in "In short". |
| 5, the ladder item | The leaves-out item now gives LIM-45 contradicted in 6 [M] families, step 8 "not reached" in 23 [M] cases and "works" in 3 [M], and LIM-42 with 12 [M] cases. All counted from the data at build time. |
| 6, undefined terms in case notes | Reworded (see MF3), and the word list defines the earlier knowledge-store design. |
| 7, zero branches | A card whose limitation reaches no branch now says its settings act through class chances or stocks, not through branches. |
| 8, LIM-26 | Marked as shown in part, with no settings, and the reason given. |
| 9, tags | e_right is now S. m_fable's note now explains its best value of 3. u_similar's note now explains why its best value, 0.15, sits where it does. Values were not changed. Tag counts: 2 [M] measured, 7 [M] outside studies, 48 [M] guesses. |
| 10, untagged numbers in case notes | The case section carries one tag statement: numbers in the case notes (dates, counts, durations, ids) come from the records (M), and a saving is the walker's estimate (G) unless the walk saw it happen. The 162 [M] notes were not tagged one by one. |
| 11, "episode" and "seed" | "Episode" became "piece of work" in the settings' meanings, labels and notes. "Seed" is defined in the word list and on the page. |

The cold read's points were also taken up: a short section near the top gives the best-value result and the five caveats, and the words CI, PR and seq are defined. The page's length and section order were not changed.

## 3. Rule breaches

- Savings tagged M although estimated: fixed (MF4).
- e_right's tag: fixed (should-fix 9).
- Untagged quantities in case notes: one section-level tag (should-fix 10).
- "Often" on a chosen sample: removed (MF8).
- Code names and undefined terms: replaced or defined (MF7, should-fix 6 and 11).
- Five wordings flagged by the build ("The fix would be…", "The fix is…" twice, "the answer is a policy choice", "Subagents should return…"): left as written. They describe past cases or quote a record. None proposes a remedy for the library. The build still lists them for review.

## 4. Not applied: these would change the model

`model-brief.md` defines the model. These findings would change what it means, so they are left for the orchestrator. Each is disclosed on the page and in the record.

- The Opus price ratio's value (2) and its one-value range (MF1).
- The best values of m_fable (3) and u_similar (0.15) (should-fix 9).
- Bad entries taking lookups from good ones, bad entries that never fade, a good entry that never helps up the ladder, the perfect check, free repair (should-fix 1 to 3, MF6, the tilt list).
- A way of working with today's notes in the comparison (MF5).
- Tied draws in the many-runs section (MF2). The page keeps the brief's independent draws and states the lean.

## 5. Scripts changed or added

- Changed: `build-params.js.txt`, `build-limitations.js.txt`, `build-page.js.txt`, `page-src/core.js.txt`, `page-src/text.json`, `page-src/page.html.txt`, `page-src/page.css.txt`, `page-src/page.js.txt`.
- Added: `patch-map-refute.js.txt` (plain names, wording; checks the model's signature is unchanged), `patch-cases-refute.js.txt` (rewordings and `ks` marks; checks no step status changed). Both can run twice with no further change.
- Regenerated: `docs/program/library-pathways/params.json`, `map.json`, `limitations.json`, `cases.json`, `index.html`; `params-notes.md`; `docs/program/LIBRARY-PATHWAYS-2026-11.md`; `build-page-report.txt`; `run-v2-out.json` and `run-v2-console.txt` (only the tag counts changed); `verify-engine-out.json` (see section 6).

## 6. Tests

All run from `docs/program/evidence/library-pathways` with `node - < name.js.txt`.

- `build-page.js.txt`: 0 [M] checks failed. New checks: every setting has a plain name; each limitation's shown, not-shown and settings fields agree; each works item's basis matches its tag. The page engine matches the node engine on 868 [M] numbers, largest gap 0 [M]. Record 241 [M] lines. The 5 [M] flagged wordings are the ones in section 3.
- `engine-test.js.txt`: 37 [M] of 37 [M] passed.
- `run-v2.js.txt`: ran. Every number is unchanged; only the tag counts moved (M 3 to 2 [M], G 47 to 48 [M]).
- `refute-map.js.txt` and `refute-map-2.js.txt`: rerun. Their console files came out identical to the refuter's, so every literal quoted from them (13.6%, 24.9%, 0.58, 3.72, 1.17, 0.90, 1.01, 0.17, 0.69, 0.04, 0.1%, 1.035, 1.036) still holds.
- `verify-engine.js.txt`: 22 [M] of 31 [M] checks pass, before and after these fixes alike. It was written against the first engine, 31 [M] of 31 [M] in `verify-engine-console.txt`. The engine was revised to its second version afterwards (`run-v2.js.txt`), and the nine failing checks compare against the first version's model. Run on a copy of the data from before these fixes, it fails the same nine checks. Its output file differs only in tag lists. Its rerun rewrote `verify-engine-out.json`; `verify-engine-console.txt` was left as it was.
- `patch-map-refute.js.txt`, `patch-cases-refute.js.txt` and the build were run a second time: every data file, the page and the record came out byte for byte the same.
- The browser check (`check-page-browser.js.txt`) in the browser pane: no digit outside a tagged or labelled place, after two labels were reworded so they hold no digit. The page's own 1000-run ensemble, seed 20261112, gives the same table as the record.

## 7. Numbers after the fixes

Every number here follows from the assumed best values and ranges. None is a measurement of the library. The engine and every value and range are unchanged, so these equal the numbers before the fixes.

Best values, 12 [G] periods. Cost is in cheap-call equivalents per piece of work.

| Way of working | Cost, first period | Wrong rate, first period | Cost, last period | Wrong rate, last period |
| --- | ---: | ---: | ---: | ---: |
| Strong model directly | 29.92 [G] | 11.2% [G] | 29.92 [G] | 11.2% [G] |
| Cheap model with the ladder | 25.68 [G] | 21.2% [G] | 25.68 [G] | 21.2% [G] |
| Cheap model with the library | 26.39 [G] | 21.2% [G] | 26.57 [G] | 21.4% [G] |

Ratios, library over the other way, first / last period: cost against the ladder 1.03 / 1.03 [G], wrong rate against the ladder 1.00 / 1.01 [G], cost against strong directly 0.88 / 0.89 [G], wrong rate against strong directly 1.90 / 1.91 [G]. With the Opus price ratio at one, cost against strong directly in the last period is 1.23 [G].

Many runs: 1000 [G] runs, seed 20261112, each unknown drawn evenly and on its own.

| Ratio | First: 5 in 100 / middle / 95 in 100 | Last: 5 in 100 / middle / 95 in 100 |
| --- | --- | --- |
| Cost against the ladder | 1.01 / 1.03 / 1.07 [G] | 1.01 / 1.04 / 1.10 [G] |
| Wrong rate against the ladder | 1.00 / 1.00 / 1.00 [G] | 1.00 / 1.01 / 1.08 [G] |
| Cost against strong directly | 0.47 / 0.89 / 1.79 [G] | 0.47 / 0.90 / 1.81 [G] |
| Wrong rate against strong directly | 0.98 / 1.81 / 5.94 [G] | 1.00 / 1.86 / 6.06 [G] |

Share of runs where the library costs less with a wrong rate no higher: against the ladder 0.0% [G] in both periods; against strong directly 4.0% [G] first and 3.4% [G] last. That share depends on drawing each unknown on its own (MF2).
