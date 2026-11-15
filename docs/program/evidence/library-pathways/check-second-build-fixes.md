# Fixes after the second-build check (2026-11-12)

This applies `check-second-build.md` to the library pathway map. Only data and sources changed. `index.html` and `LIBRARY-PATHWAYS-2026-11.md` were rebuilt by `build-page.js.txt`. A second build gave byte-identical output.

Every number below follows from assumed values. 48 of the 57 drawn unknowns are guesses. The numbers describe the model, not the library.

## Sources changed

| File | What changed |
| --- | --- |
| `library-pathways/engine.js` | `weights()` now returns `measured`, `not_measured` and `parts` (each library unknown moved alone) on every row. It also returns `unknowns`, `favourable` and `unnamed`. New `variant(model, params, id)` reads `map.variants`. Scores are unchanged. |
| `patch-map-check2.js.txt` (new) | Edits `map.json` in place and is safe to rerun. Adds six declared measures: looked up, good and wrong entry in hand, lookup cost, write cost, `P_climbs`. Adds `usage_measures`, the `opus_one` variant, a note on the unfavourable setting and a new weight note. Splits three parameter meanings. It checks that the model itself did not change. |
| `patch-cases-check2.js.txt` (new) | Splits 32 case sentences. Defines `job_event.seq`, `EXPO_PUBLIC_SENTRY_DSN` and CSRF where they appear. Makes the hand-made "early November 2026" dates reproducible. Statuses and ks marks are unchanged. |
| `patch-cases-refute.js.txt` | The f03-C2 step 2 text now matches its split form, so the two scripts agree. |
| `patch-limitations-src-check2.js.txt` (new) | Makes 46 wording edits in `build-limitations.js.txt`. These cover LIM-03, long descriptions and reasons, the works items, f06-C4 (CLAUDE.md said once) and f07-4 (the inference moved to its caveat). |
| `patch-params-src-check2.js.txt` (new) | Splits 19 parameter notes in `build-params.js.txt`. Values, tags, ranges and sources are unchanged. |
| `build-params.js.txt` | Notes for u_exact, u_similar and u_composite now cover the ceilings' new meaning. r_comp_part says why its good end is high. |
| `page-src/core.js.txt` | The usage panel reads the declared measures. The figure at an Opus price ratio of one comes from `E.variant`. |
| `page-src/text.json` | Funnel match is now `[[], [1,2], [3,4], [9,10], [], [5], [6]]`, with notes under the empty bars. Text added: the unfavourable setting, the tie lean, the rank-correlation definition, the tie-1 statement, the not-measured labels, and words for technical names. "Today's notes" is said once, beside the ladder. The left-out items were corrected. |
| `page-src/page.js.txt`, `page.html.txt` | Rows that are not measured show "not measured" and the reason. The ranked lists gain a box explaining why weights are small and where the gap to the favourable setting goes. A limitation's detail shows its parts. Tags were added on the first-period and price-ratio-one figures. The default is 1000 runs. At tie 1 the ranking is replaced by the shared correlation. The 15 savings sit behind one tap. |
| `build-page.js.txt` | Checks sentence length in all data text. Checks not-measured rows on the page. Recomputes the heavy-use corner and fails if the page's literals differ. Record §1–§8 were updated. `LP_DUMP` is a reading aid. |
| `check-page-browser.js.txt` | Handles not-measured rows. |

## Not applied (for the orchestrator)

- **A fourth reference setting** for heavy use with poor entries (R15). The page and record now name that setting and quote it: 1.75 / 1.71 / 3.25. It is not declared.
- **An opposite tie** (R14). The lean is stated on the page and in the record.
- **Coverage ceiling values.** Their notes now say the values predate the reading "beyond today's notes". The values were not changed.

## Checks run

- `build-page.js.txt`: 0 failures. 1,752 engine numbers compared, largest gap 0. 2,338 data sentences, longest 20 words. Two builds were byte-identical.
- `engine-test.js.txt`: 52 of 52 passed.
- The patch scripts make no edits on a rerun. Rebuilding the data from scratch reproduces cases, limitations, params and map exactly.
- `run-v2`, `run-v3`, `refute-map`, `refute-map-2`, `check-second-build` and `check-second-build-2` all exit 0.
- `verify-engine.js.txt`, the revision-1 check, passes 21 of 31. It does the same against the map from before this pass, because it predates revisions 2 and 3.
- The browser check was not run, because the browser pane could not open the file.
