# Brief: fold of the review of the research run's briefs (two helpers of top session 5; kind analyse, Opus)

The blind review `H:research-tree/build/refute/RUN-BRIEFS.md` ("CORRECT: 13 findings") checked the run's files in
`RUN:` against their sources. Top session 5 accepted all 13 as the review states them (r57-0021), with the choices
below, and adds item 14. Two helpers fold at once, each only its part's files, so no file has two writers. `H:` =
`C:/Users/User/Documents/projects/harness-engineering/`; `RUN:` = `C:/research-runs/2026-11-harness-leads/`. Read the
review's row for each finding you fold, then the lines it cites, and change those files only as the decision says.

## Part F (the field side): `RUN:briefs/FIELD.md`, `RUN:briefs/field/*`, `RUN:briefs/PLANTED.md`
- **1** (breaking): the review's (a) and (b), not its alternative (the plants stay in each field's build-on files, so
  each field reviews our approaches in its own field). (a) In the refuter's Part A a claim citing a file of ours under
  `H:` is read from `claims.md`, never opened. (b) The scorer marks a plant "exposed" for an arm when the plant's
  original sentence or number stands in that arm's inputs (R_same: `collect-prior.md` and the writer's list of extra
  files read; both arms: `claims.md`), by one grep; F1 is reported on the unexposed plants, the exposed apart. Change
  `PLANTED.md:75-76` ("a shared confound, alike for both arms") to say this.
- **2** (breaking when it occurs): as the review's correction (a checkpoint file, `CHECKPOINT C<k>` in line 1 of the
  return, FIELD.md starts the rest with what is left of the limit, the done file only after it; in the fold a claim
  without a refuter verdict is `cannot be checked`, never confirmed). Same for the report writer if its template has
  a checkpoint.
- **3**: the `prior` reader also runs `node RUN:tools/typed.mjs "<the field's words>" --out
  RUN:fields/<n>-<slug>/work/typed.txt` (his typed messages in the app's local transcripts; one line printed; being
  built now) and cites matches `observed` with the transcript and date. Fill 21's wording changes accordingly.
- **4**: drain before every return (as "At L" does); on a restart, first wait (wait.mjs calls) for the done files of
  the steps `STATE.md` shows started, up to that step's limit time or its measured longest duration, sourced; then go on.
- **5** (reader side): add the raw-page route to `field/reader.md` (curl to `page.txt` with `--max-filesize 2097152`
  into the paper's folder, quoted at its line as `paper.txt` is), as `RUN:DOWNLOADS.md` section 2 names it.
- **11**: write each refused start, with the number running from `run/tokens-f<n>.txt`, into `STATE.md` and the
  return's "open" line.
- **12**: correct the two notes on `shuffle.mjs` (it now masks whole words only and keeps source and file lines).

## Part C (the coordinator side): `RUN:CLAUDE.md`, `RUN:briefs/COORDINATOR.md`, `RUN:briefs/CLOSING.md`, `RUN:briefs/SHEET.md`, `RUN:GO.md`, `RUN:DOWNLOADS.md`, `RUN:run/config.json`
- **5** (go side): keep `DOWNLOADS.md` section 2 and the go's naming of the raw text pages (he decides by typing the
  go); make `DOWNLOADS.md:45-47` and the go agree with the readers' route (Part F adds it: `page.txt`, at most 2 MB a
  page).
- **6**: with nothing running, a HOLD does not end in silence: at each safety wake the coordinator gates again; after
  the third hold in a row with nothing running it tells him (`cap:` or a plain message, as the hold's reason fits);
  source the interval from the cache lifetime (r57-0176) and the safety timer it already has. Add the three missing
  stops to `GO.md` section 4.
- **7**, **8**, **9**, **10**, **13**: as the review's corrections (an extension's L uses L2 within what is left of
  the cap; the `cap:` figure from preparation + run + the coordinator's reserve + the expected of units not yet run,
  rounded up to 10 M; test designs name what they would install with source and size, the card's part and hours;
  packet folds write `open` "proposed correction of <id>" records, `d9-05xx`, never adjudications or supersedes; "no
  file of H: but the hooks' logs").
- **14** (added; the review could not check it): what Auto mode does with the run's own commands (curl downloads into
  `RUN:papers/`, pdftotext, `node RUN:tools/...`, `bash H:library/lookup.sh`, git in `RUN:`, any rm the briefs use),
  from the provider's permission-modes page: read the raw copy in
  `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/unattended/docs/`
  if it is still there, else fetch the public page raw with `curl --ssl-no-revoke` (nothing of ours in the request).
  In `GO.md`, under the settings that are his, add one short optional item: the narrow allow rules that would let
  those commands run without Auto mode judging each one, each with what it lets through and what protection it
  removes (an allowed curl is no longer checked for what it sends; H: CLAUDE.md rule 4), and that how often Auto mode
  blocks them in a run of this size is not measured (each block counts toward its 3-in-a-row and 20-in-all limits).
  Write no rule into any settings file: they are his (UNATTENDED.md section 4 item 4). If a brief uses rm where a move
  or an overwrite would do, say so in your return for Part F's owner (do not edit Part F's files).

## Rules and return
Change only your part's files and scratch files in
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/0fedf9f2-6bb0-4fa4-bcd6-133df5bb66ca/scratchpad/run-fold-<part>/`.
Keep everything the review found right. Add at the end of each file you change a short "Changes after the review"
list (finding number, what changed). No session, helper, workflow, schedule or wake; no setting changed; no commit; no
command over 150 s. Tokens: expected about 3 M, limit 6 M (folds on Opus: 2.1-4.2 M, n = 3, one document each). Your
counter: `node H:research-tree/build/tools/tokens-self.mjs "run fold part <F or C>"` every 10 calls from call 20. Return
at most eight lines: the files changed, one line per finding, anything you could not fold, your token count.
