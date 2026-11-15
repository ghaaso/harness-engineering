# Split-rule replay evidence (2026-11-14)

Record: `docs/program/SPLIT-RULE-2026-11.md`. Page: `docs/program/split-replay/index.html`.
Check of the deliverable: `review-2026-11-14.md` in this folder. Its findings are applied, with two
exceptions. Two settled wordings on the leaf test were declined: N-F2's "not met at any line" and M-F3's
"an artefact of the units". Both rested on estimates of the like-unit bar. Counted from the record the bar
is 80 and 82 session-window calls per human prompt for the two projects behind the 162, and 59 over all
groups, and calls per leaf as the test defines them (50, 52, 58) are under all three at every line; see
3.4 of the record. A second pass kept five small fixes; its section of the review file says what was done
about each. A third pass set the record beside the summary check (`docs/program/SUMMARY-CHECK-2026-11.md`)
and kept thirteen fixes (X-F1 to X-F14), listed in the review file's section "Third pass: this record
beside the summary check" with six more from a fresh check of those edits.

- `replay.js.txt` is the replay. It makes no model calls and keeps counts only: usage counts, compaction
  markers and, in the prompts stage, how many human prompts each session window received. No message text
  is written anywhere. Four stages, run from this folder (the scripts are saved as `.js.txt`, so they run
  on stdin):
  - `node - index <cacheDir> < replay.js.txt` reads every transcript under the Claude projects folder once
    and writes a counts-only index (`windows.jsonl`) to `<cacheDir>`. Keep the cache outside the repo: it
    holds per-call token counts for every project on this PC.
  - `node - check <cacheDir> < replay.js.txt` runs the token report's own parser
    (`../token-spend/parse.js.txt`, unchanged) over the same folders and compares call counts and token
    sums per project group, session and role. That parser also writes prompt text and command strings
    into its output; the stage deletes those files as soon as it has compared them. Run of 14 November:
    196 of 196 identical, before and after the script was revised.
  - `node - prompts <cacheDir> < replay.js.txt` counts human prompts per session window, up to the index
    cut, and writes `prompts.json` to `<cacheDir>`: four counts per session and nothing else. A typed slash
    or skill command, which the transcript records twice, is counted once. It is what puts the leaf test
    in like units.
  - `node - replay <cacheDir> . < replay.js.txt` writes `replay-table.txt` and `replay.json` here.
- `replay-table.txt` is the output table, sections A to G. Every number in the record and on the page is
  in it. Section F changes one input at a time.
- `replay.json` is the same run as data, for the page.
- `page-template.html` and `build-page.js.txt`: `node - < build-page.js.txt` puts `replay.json` into the
  template and writes the page.

## The live trial's instruments (added 14 November, after the owner's yes; part 6 of the record)

Three more stages of `replay.js.txt`. None makes a model call.

- `node - fill <session id> < replay.js.txt` is the gauge a session reads at a step boundary: the context
  its latest call read, the line (30 % unless a share is given), the hard ceiling, and whether it is due.
  The id is the session's own, or its first eight characters; a session finds it in its scratchpad path.
- `node - trial <manifest.json> < replay.js.txt` measures the sessions a manifest names: fills, hand-overs,
  rule failures, tokens. The manifest's shape is in a comment above the stage.
- `node - pointers <repoDir> <cacheDir> record [outDir] < replay.js.txt` is the scripted hand-over check
  over every FixFlow compaction summary up to the index cut. `file <path> [commit]` checks one document,
  `corrupt <path> [commit]` checks it again with every third pointer broken on purpose, and
  `trial <manifest.json>` checks a trial's briefs and summaries. It reads summary and brief text inside
  the process and writes counts only. The pull request numbers and dates it checks against are two files
  in `<cacheDir>`, made with
  `gh pr list --state all --limit 1000 --json number,createdAt,mergedAt,closedAt > prs.json` and
  `gh issue list --state all --limit 1000 --json number,createdAt,closedAt > issues.json`.
- `pointers-record.txt` and `pointers-record.json`: the 61 recorded summaries. `pointers-controls.txt`:
  two maintained documents, as they are and broken on purpose. `trial-dry-run.txt`: the gauge and the
  trial measure on recorded sessions. It is not a trial.
- `pointers-record.txt` holds the script's own count, not a count of wrong pointers. Its two contradicted
  pull request states (documents 9 and 11 of `pointers-record.json`, counted from 0) were read by hand in
  the summary check, `docs/program/SUMMARY-CHECK-2026-11.md`, and are not wrong; see 6.3 of the record.
  For the summaries on record, the summary check's figures are the ones to cite.

The replay stages were not re-run for this and the replay table did not change.

The run of 14 November counted calls made up to 05:12 UTC. Running `index` again moves that cut, and every
number moves with it; run `check`, `prompts` and `replay` after it, then rebuild the page and update the
record. The revision after the check did not re-run `index`.

## The reader's check and the rest of its baseline (added 14 November; part 6.7 of the record)

One more stage of `replay.js.txt`, `reader`, in four modes. `list`, `tally` and `cost` write counts only.
`extract` writes message text, so it refuses any folder inside a git working tree; what it writes is
scratch and is deleted after the tally.

- `node - reader list <cacheDir> [outDir] [auditJson]` lists the FixFlow compaction summaries on record
  in time order (the same population as `pointers record`), picks the sample by the rule in 6.7, and
  prints what the readings will cost. With `outDir` it writes `reader-sample.txt`. With the summary
  check's `audit.json` it also prints that check's verdicts on the record and on the sample.
- `node - reader extract <repoDir> <cacheDir> <n | sample> <scratchDir> [promptFile]` writes, for record
  `n` or for every sampled record: `doc-NN.txt` (the summary in numbered lines), `turns-NN.txt` (the last
  30 turns before the boundary, with the kept turn marked), `meta-NN.json`, and the readers'
  instructions `prompt-NN-a.txt`, `-b.txt`, `-c.txt` (the frozen prompt with its paths filled in). Run it
  from this folder, or give the prompt file. If the prompt uses the repository (it names `{REPO}`), the
  stage also adds the facts it can look up there (pull request dates, commit dates, the session's
  branch) to `doc-NN.txt`. The prompt in use does not.
- `node - reader tally <scratchDir> [outDir] [auditJson]` reads the readers' `marks-NN-a.json`, `-b.json`
  and, where the two differ, `-c.json`, and prints the table. With `outDir` it writes
  `reader-baseline.txt` and `reader-baseline.json`. Until every summary that needs a third reading has
  one, it says which do. With `audit.json` it sets the summary check's verdict beside the readings.
- `node - reader cost <session id> [since]` sums what the readers' agent windows read and wrote, from
  the transcripts of the session that started them.
- `reader-prompt.md` is the prompt in use, frozen at 11:02 UTC and scoped to what the baseline still has
  to add: dropped open loops and a second reading of where the work stood. Two earlier texts, frozen at
  10:48 and 10:52 before any reading, are kept as `reader-prompt-superseded-1048.md` (6.4 as the brief
  gave it) and `reader-prompt-superseded-1052.md` (6.4 as revised, all six kinds, with the repository).
  The hashes are in 6.7 of the record.
- `reader-sample.txt` is the list, the sample, the first reader's verdicts for scale and the cost
  estimate. `reader-baseline.txt` does not exist yet: the readings wait on the owner's go.

The stage was tested before it was pointed at the record: on a made-up transcript with the line shapes
of a real one and no real text, and on made-up marks whose tally was worked out by hand first. Neither
was kept.
