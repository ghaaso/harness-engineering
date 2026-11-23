# PLANTED: the planted copy's brief (kind analyse, Opus, high)

The coordinator starts you as `analyse: planted copy of our files` with the prompt `Read and follow
C:/research-runs/2026-11-harness-leads/briefs/PLANTED.md for unit planted; your limit is <L> M tokens`. `RUN:CLAUDE.md`
binds. `RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` = `C:/Users/User/Documents/projects/harness-engineering/`
(read only). If `RUN:planted/INDEX.md` exists you are a restart: go on from the first missing output below.

## What it is for
In each field two reviews of the same copy of our files, in the same fixed form (`RUN:briefs/field/review-form.md`):
R_same, by the field's report writer in its own window, and the fresh arm, by the refuter from the field's claims
alone. A blind scorer counts which planted wrong assumptions each review finds with the right reason (protocol v2
section 11, comparison 2, `H:docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` lines 737-743; COMPLEXITY v2 section
5 step 2). You make that copy and its key, once for all seven fields. You review nothing.

## The files each field reviews
From each field's build-on files (research direction section 4 and section 5 rule 4; `RUN:briefs/FIELD.md` section 1):
designs and results of ours that the field's literature can confirm or contradict. At most about 52 KB a field, so a
review reads at most 60 KB with the sheet (8 KB) [c: R_same adds 32-72 K of window, COMPLEXITY lines 120-122]. Sizes
measured 2026-11-20 [m: wc -c]. Under `H:`; `E` = `docs/program/evidence/harness-bottlenecks/graph2/embeddings/`.

| Field | Files, in this order (a range keeps whole sections) | KB |
|---|---|---|
| f2 | `docs/program/GRAPH-TEST-RESULT-2026-11.md`; `docs/program/GRAPH-V2-DESIGN-2026-11.md`; `docs/program/HARNESS-BOTTLENECKS-2026-11.md` lines 212-268 (section 6) | 15.6 + 19.8 + 15.6 = 51.0 |
| f3 | `E/COORDINATOR-REPORT.md` lines 1-308 (sections 1-9); `E/RESULT.md` lines 1-146 (all but Sources) | about 50.5 |
| f4 | `docs/program/LIBRARY-PATHWAYS-2026-11.md`; `docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md` lines 7-48 and 336-363 (sections 0 and 5) | 33.2 + 6.1 + 8.1 = 47.4 |
| f5 | `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` lines 199-396; `docs/program/evidence/round3-2026-11-18/ROUND.md`; `library/README.md` | 16.3 + 10.0 + 10.7 = 37.0 |
| f6 | `E/INSTALL-GPU.md`; `E/COORDINATOR-REPORT.md` lines 1-146 (sections 1-5); `research-tree/build/ROUTER.md` lines 19-33 and 142-180 | 15.5 + 11.4 + 1.4 + 7.2 = 35.5 |
| f7 | `research-tree/build/COMPLEXITY.md` lines 16-274; protocol v2 lines 438-502 (section 7); `docs/program/evidence/round3-2026-11-18/DECISION-RULE-v2.md` | 27.0 + 5.4 + 12.5 = 44.9 |
| f8 | `research-tree/build/PILOT-PLAN.md` lines 12-209; protocol v2 lines 709-747 (section 11) and 237-246 (R20); `docs/program/TOKEN-BOTTLENECK-2026-11.md` | 22.3 + 3.3 + 1.0 + 4.8 = 31.4 |

Copy by command, never by retyping: `cp` for a whole file, `sed -n '<a>,<b>p'` for a range, into
`RUN:planted/f<n>/<name>` (`<name>-s<k>.md` for a range). Byte for byte, but for the plants. `wc -c` each field's set;
if over 52 KB, cut from the end of its list.

## The plants
- **k = 3 a field, 21 in all** (protocol v2 R44, line 424: "t of k = 3 plants are found (one against the hoped answer;
  rates pooled)"; line 436: three plants give no rate, so plants are pooled across fields).
- **Two with the hoped answer, one against it** (line 424; P2 "plant against hope", line 563). The hoped answer is
  what our file would like to be true: our method works, our design is sound, our gain holds. With it: a gain made
  larger, a condition made wider, a method credited with what its source does not show. Against it: a gain denied,
  a cost made larger, a limit that the source does not set.
- **Each one wrong by a quoted source**: a library record that quotes a paper read in full, at its evidence place
  (`bash H:library/lookup.sh -f <id>`, then open the place), or one of our evidence files at a line that quotes a
  source. Never from memory and never from the web (r57-0014, r57-0130). A reader of the field's literature must be
  able to find the truth from the source's paper.
- **Never** a heading, a table header, a number we measured ourselves (a reviewer could find that only in our
  originals, which it may not open [reasoned]), a marked or reworded neighbourhood, or two plants of a field in one
  file section. A plant is one sentence or clause, in the style and length of the text around it.
- The copies are per field: f3 and f6 share a source file, each with its own plants.

## Write
1. `RUN:planted/f<n>/...` for f2-f8, as above.
2. `RUN:planted/INDEX.md`: title `# Our files for review`; a line: "Copies of our own files for this run's reviews; the
   originals are not opened (protocol v2 R22). The problem sheet is read in place: `RUN:sheet/SHEET.md`."; then a part
   a field, `## f<n>`, one line a file: `planted/f<n>/<name>` and what it holds (whole, or section k). No plant, no
   key, no path of `H:`.
3. `RUN:sealed/planted-key.json`, read only by the scorers and the closing helper:
   `{"version": 1, "k": 3, "made": "<UTC>", "fields": {"f2": [{"id": "f2-P1", "file": "planted/f2/<name>", "line": <line
   in the copy>, "planted": "<the planted sentence>", "original": "<the sentence it replaced>", "reason_kind":
   "wrong-assumption|wrong-number|wrong-scope|other", "reason": "<why it is wrong and what is true, at most 40 words>",
   "source": "<library id and its place, or H: path:line>", "hope": "with|against"}, ...], ...}, "sources":
   {"planted/f2/<name>": "H:<path> lines <a>-<b>", ...}}`. The scorer matches a review row on file and line plus or
   minus 3, or the planted sentence, and on `reason` (`RUN:briefs/field/scorer.md`).
4. A self-check by command, its output to `RUN:planted/check.txt`, one line printed: per field, `diff` of each copy
   against its source range shows exactly the planted lines (3 a field in all); the key parses (`node -e`), has 3
   plants a field, one `against`, and every `line` holds its `planted` text; INDEX.md holds no `H:` path and no plant
   text. Fix and run it again until it passes.
5. Commit (`RUN:CLAUDE.md` rule 7) only through the run's commit script, never a bare git commit: `node
   C:/research-runs/2026-11-harness-leads/tools/commit.mjs "planted: copies and key" planted sealed/planted-key.json`
   (it commits only those paths and waits while another helper's `.git/index.lock` is held).
6. `RUN:planted/RETURN.md` and your return, the same lines, at most ten: line 1 `planted DONE|LIMIT|FAILED <one
   reason>`; line 2 `tokens <x> M of limit <y> M` (`node C:/research-runs/2026-11-harness-leads/tools/tokens.mjs
   planted`, once); then KB per field; plants per field (with, against); the self-check's line; what is open (never a
   plant's content). Order: RETURN.md, the commit, then `RUN:planted/DONE.md` (`planted done <UTC>`) only on DONE.

## Limits of this design (for the synthesis)
The fields' `prior` readers build on these originals (FIELD.md section 1) and the report writer opens our files at the
lines its prior file cites, so the arms are not alike: R_same may have met a plant's original text in the collect
files or in the lines the writer read, the fresh arm only in `claims.md` (it opens no file of ours: `field/refuter.md`
Part A). The blind scorer therefore marks each plant `exposed` for an arm when the plant's original sentence or number
stands in that arm's inputs (R_same: the collect files, `collect-prior.md` first, and the ranges the writer lists
under `## Files read` in `claims.md`; both arms: `claims.md`), by one grep after scoring (`field/scorer.md`). F1 is
reported on the plants exposed for neither arm, the exposed apart. The folder's name and INDEX.md tell both arms alike that the files are
copies. Plants are hand-made and may be easier than real faults (protocol v2 line 434).

## Tokens
Expected 8.05 M (4.94-10.39) [m: E 1a analyse/opus, n = 19; COMPLEXITY lines 252-253]; your limit is the L in your prompt
(18.6 M at most). At L or at about 330 K of context: write what stands, commit, RETURN.md with `planted LIMIT <what is
missing>`, no DONE.md, return.

## Changes after the review (2026-11-21)
Review `H:research-tree/build/refute/RUN-BRIEFS.md`, folded by `H:research-tree/build/briefs/RUN-FOLD.md` Part F.
- 1: "a shared confound, alike for both arms" replaced: the arms are not alike; the scorer marks each plant exposed per
  arm and F1 is reported on the plants exposed for neither (Limits of this design).
- Git: the commit goes through `tools/commit.mjs` (Write, item 5).
