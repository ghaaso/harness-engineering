# FOLD: the review of the widened run folded (top session 6's fold helper, analyse, Opus)

2026-11-21. Review: `research-tree/build/refute/WIDEN.md` (3 breaking, 11 other). Run folder:
`C:/research-runs/2026-11-harness-leads` (`RUN:`), commits after a5376b2. Per finding: fixed (commit) or left (why).

## Breaking
- **B1 fixed (59d12a3).** `RUN:briefs/MAP.md` section 1 step 1: a map restarted after its split starts no helper,
  runs `split.mjs` (unchanged line), writes RETURN.md `f<n>m DONE`, commits, writes DONE.md, then returns. The same
  path for a part, the sheet and the closing: none returns without RETURN.md (FIELD.md section 2 steps 1-3 and
  section 5 end at step 9, which writes RETURN.md and DONE.md; SHEET.md:9 goes on from the first missing output,
  RETURN.md included; CLOSING.md section 1 step 2 likewise), so nothing else changed.
- **B2 fixed (7305336), with top session 6's decision.** `RUN:run/config.json`: `preparation_M` 150 (at most: 80 M of
  top session 5 + this round's limit 69 M, r57-0049, rounded up), `cap_M` 1900 (1,750 + 150), `preparation_note`
  says the cap stays 1,900 when the measured figure is written. Derived lines: `RUN:GO.md` opening (1,666 M, 1,425-1,900,
  cap 1.9 B), the go text ("The cap is 1.9 B tokens for the run, the preparation included."), section 2 (what
  config.json holds; the old "if it has not, the coordinator says so" no longer holds at 150), section 4 row, section 5,
  the successor go; `RUN:briefs/COORDINATOR.md` sections 0, 3 step 3, 7, 11's example, R1 rows `cap_M` and
  `preparation_M`, R1's sum; `RUN:CLAUDE.md` opening. Change notes of earlier rounds keep their old figures (records).
  WIDEN.md section 3 still says 110 and 1,860 (not mine to touch).
- **B3 fixed (1ab89b9).** `RUN:GO.md` section 5: "three map, part or field units at once, never more, in either case";
  the "3.7 to 5.8 hours" parenthesis removed (no other file of the run had it; WIDEN.md section 3 and D7 still do).

## Others
- **O1 fixed (d5ddcb9).** `RUN:briefs/CLOSING.md`: synthesis gaps d9-0500-0529, recall opens d9-0530-0539, packets
  d9-0540-0599 (ten each), all inside the open range 0500-0599 of `H:library/README.md`.
- **O2 fixed (05c4348).** `RUN:briefs/COORDINATOR.md` section 3 steps 2-4 and section 5: the tokens lines (`tokens.mjs
  run` gives `run`) at the end of the return's STATE.md call, L first, the gate only when L is at or over expected, so
  every START is followed by its start. Same number of calls (R2 unchanged). Residual, not built: a start of the
  coordinator's own refused after a START would leave the slot; not reachable, it starts with at most 16 helpers running.
- **O9 left.** Not one of the four classes: the failure path exists (`RUN:GO.md` section 4 last row, `run/TOP.md`'s
  line for him) and the app's session tools would be a second route as untested as the first (r57-0506).

## LIMIT: stopped at 7.38 M tokens and 226 K of context (limit 7 M, 200 K); not done, with the fix worked out
- **O3** (`COORDINATOR.md` section 4 "Slots", R3 fill 8): peak 7 a unit (its helper + fold + 5 extractors, FIELD.md
  steps 6-7); three units 21 + the sheet's 2 = 23, over 20 if helpers of helpers count: a start inside a unit is then
  refused and retried after one wait (FIELD.md section 3); the coordinator starts after a return with at most 16
  running, so its own starts are not refused either way. The closing's peak is 14 (12 samples + writer + itself).
- **O4** (`CLOSING.md` section 3, "Not covered"): after the `cat`, append for each NOT-COVERED row whose reason is
  `owned by f<m>` a line `<key> (<map folder>): named for f<m>, not read there` when no row `^| f<m>[a-d]? | <key> |`
  is in `fields/<m>m-*/PARTS.md` or `briefs/field/topics.md` (awk -F'|': $3 key, $8 reason; by shell, not read).
- **O5** (`CLOSING.md` S.1 and section F's block): per lead the test, its like baseline, the scoring defined first,
  cost in M tokens and hours, card tier; the block's lines `test`, `baseline`, `scoring`, `cost to test here`, and a
  pointer `full design: SYNTHESIS.md section 3 <k>, d9-04xx | none` with the S.5 `approve:`/`cap:` item.
- **O6** (`FIELD.md`:74): drop "; the helper 25.8 [c: 17.8 + 1.5 x 5.3]" (the writer's limit is 16.3, writer.md:44).
- **O7** ("five" where a short last part has fewer): `writer.md`:6, :9 (twice), :15; `check.md`:7; `FIELD.md`:23,
  :72, :78, :79, :133, :158; `CLOSING.md`:31; `topics.md`:7: "its" / "its extractor files" / "up to five".
- **O8**: `tools/split.mjs`:8 (comment), :81, :101 and `MAP.md`:63 key pattern `^[a-z0-9][a-z0-9-]{1,23}$` (fill.mjs:40
  refuses a leading "-"); a test in `split.test.mjs` that a key `-ab` is refused.
- **O10** (changes figures shown to him): wakes 15-23 (7.5-11.2 h at 30 min), so the coordinator is 100-133 calls,
  15.3 (12.0-19.3) M [c: 116 x 132 K, as 126 x 132 K gave 16.6], limit 30.3 (19.3 + 1.5 x 7.3); the run 1,515
  (1,274-1,748) M, with the preparation 1,665 (1,424-1,898), the cap still 1,900 (1,898 rounded up); points 24.4
  (20.5-28.2), Fable 2.7 (2.1-3.4), "+0.2" if Fable counts on all models; the timer 1.8-3.8 M; window end about
  158-199 K. Lines: config.json `coordinator`; GO.md opening and section 5; COORDINATOR.md 3 step 3 (32.0), 6, 9, R1
  coordinator row and sum, R2, R3 fills 5 and 15.
- **O11** (`COORDINATOR.md` section 2 step 3 and section 6; a GO.md section 4 row): without CronCreate the start
  line adds "No timer here: a unit that goes silent is not noticed until another returns."
- Tests: no script changed, so the run's 45 stand (not re-run).

## Fold 2 (top session 6's second fold helper, Sonnet; run commits after 05c4348)
- **O3 d4f62b8:** COORDINATOR.md section 4 "Slots" and R3 fill 8: peaks 7 a field unit, 21 for three, 23 with the sheet's 2,
  closing 14, the coordinator's starts at most 16 running.
- **O4 50b2a94 (after bc4dfcd, which had a wrapped pattern):** CLOSING.md section 3: the shell line that appends `<key>
  (<map folder>): named for f<m>, not read there` for each owned-by row no PARTS.md or topics.md names; tried on a sample.
- **O5 b89174f:** CLOSING.md S.1 and the section F block: test, baseline, scoring, cost to test here, full design pointer.
- **O6 6dfc134:** FIELD.md:74 helper 25.8 dropped.
- **O7 bfbd24d:** "five" to "its" or "up to five" at the listed places (writer.md, check.md, FIELD.md, CLOSING.md:31, topics.md:7;
  FIELD.md:23, :72, :78, :79, :133, :158). FIELD.md:159 and topics.md:4 left (they speak of f5-f8, which have five).
- **O8 8b38bb6:** split.mjs (comment, two tests of the pattern), MAP.md:68 `^[a-z0-9][a-z0-9-]{1,23}$`; new test for `-ab`; 46 pass.
- **O10 22b4000:** GO.md opening and section 5, COORDINATOR.md (section 3 step 3, 6, R1 coordinator row and sum, R2, fills 5 and
  15), run/config.json coordinator 15.3 / 30.3. Shown now: 1,515 M (1,274-1,748), 1,665 M with the preparation (1,424-1,898),
  cap 1,900, 24.4 points (20.5-28.2), Fable 2.7 (2.1-3.4), +0.2, coordinator 15.3 M (12.0-19.3). Change notes of earlier rounds
  keep their old figures (records).
- **O11 58fe24d:** COORDINATOR.md section 2 step 3 and section 6, and a GO.md section 4 row.
- **O9** left as above. B1, B2, B3 checked: each holds, nothing near them broken; no fix needed.
