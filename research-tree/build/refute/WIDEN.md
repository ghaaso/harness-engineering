# Blind review of the widened research run (refute, Opus, fresh context)

2026-11-21. Brief: `research-tree/build/briefs/TOP6-R-REFUTE.md`. Reviewed: `git -C C:/research-runs/2026-11-harness-leads
diff d83da0d..a5376b2` (16 commits, 31 files), `research-tree/build/WIDEN.md`, the apply notes `apply/S1.md`, `S2.md`,
`S3.md`, against r57-0047 (quote read), `briefs/TOP6-WIDEN-RUN.md` sections 2-7, `briefs/TOP6-A-WIDEN.md`, the cited
lines (COMPLEXITY.md 70-100, 116-122, 160-180; library/README.md 53-54; research.txt 366) and the run's CLAUDE.md.
`RUN:` = the run folder. 3 breaking, 11 other.

## Breaking

**B1. A map restarted after its split returns DONE without RETURN.md or DONE.md: its parts never start.**
Where: `RUN:briefs/MAP.md:22` (section 1 step 1: "if [PARTS.md] exists ... write nothing again, return `f<n>m DONE
(already)`").
Why: COORDINATOR.md:110 moves RETURN.md to RETURN-<k>.md before every restart or extension, and an app restart or a
usage limit kills a map with none written. The restarted map finds PARTS.md and returns without writing either file.
COORDINATOR.md:83-88 readies a map's parts only when DONE.md and PARTS.md both exist, so f2a-f2d never become ready.
lib.mjs:143-147 counts the map as running (a START slot, no done file). That holds its reserve, and hang.mjs gives
`SILENT f2m` after 20 minutes. The restart is its one restart and returns the same way. The map is then given up
("FAILED by the coordinator"), and COORDINATOR.md:111 ends its parts unstarted. Result: the widest field is lost, or
the run never reaches the closing.
How it happens: (a) the map reaches L at M4-M5 and returns LIMIT after split has written PARTS.md; the extension then
restarts it. (b) An app restart or a usage limit falls between M5 and M6. This is rare, but it loses what the owner
asked for first.
Fix: in MAP.md 1.1, when PARTS.md exists, run `node RUN:tools/split.mjs f<n>m` (it prints the unchanged line), write
RETURN.md with line 1 `f<n>m DONE`, commit, write DONE.md, and only then return.

**B2. The preparation is no longer 110 M, so the cap and the numbers in GO.md are off.**
Where: `RUN:run/config.json` `preparation_M` 110; `RUN:GO.md:5-7`, `:14`, `:79`; COORDINATOR.md:5, :51, :131, R1 row
`cap_M`; the opening of the run's CLAUDE.md; WIDEN.md section 3.
Why: 110 M is 80 M plus "about 30 M" for this round. This round was already at about 38 M of its 45 M limit when
this review started (the caller's brief), so the preparation is at least 118 M now and about 125 M or more at the go.
The cap was derived as the high plus the preparation: 1,750 + 110 = 1,860. With the measured figure that becomes about
1,880 M.
GO.md shows him "the preparation's 110 M" and "1,626 M (1,385 M to 1,860 M)". GO.md:47-48 plans to update only
config.json. If only that changes, cap_M 1860 leaves the run 1,860 - p (1,735 M or less), under its own sum of Q3s,
1,750 M. On the all-Q3 path the closing's L then falls from 248.6 M to 233.6 M or less [c: COORDINATOR s3 step 3
with run 1,486.4 M and the coordinator's reserve 15 M].
Fix: when the measured p is written, set cap_M to 1,750 + p rounded up to 10. In the same pass, rewrite the go text
(GO.md:14) and every line derived from 110 and 1,860 listed above. The other way: keep 1.86 B and say the buffer is
1,860 - p - 1,516 M.

**B3. GO.md tells him a run time this run cannot have.**
Where: `RUN:GO.md:77-78`; WIDEN.md section 3 (hours) and D7.
The text: "3.7 to 5.8 hours if a helper's own helpers do not count toward the app's 20".
Why: COORDINATOR.md:78 says "At most three map, part or field units run at once, never more". Nothing in the brief
widens the run if more would fit, and at three the coordinator's own starts are not refused, so the run cannot find
out. It takes 7.5-11.2 h either way.
Fix: remove the parenthesis, or say "three at once in either case".

## Other findings

**O1. The closing's packet folds write open records in the mistakes range.**
Where: CLOSING.md:75-76, :213.
Why: the packet folds write records of kind `open` with ids d9-0560 to d9-0619. library/README.md:53-54 sets open
tasks at 0500-0599 and mistakes at 0600-0699, so packets five and six (f5 f6, f7 f8) write d9-0600 to d9-0619 outside
the open range. The record check (CLOSING.md:93-94: "unique ids in their kind's range") fails them, and section 3
removes them. The proposed corrections for f5-f8 are lost, and the draft board cites ids that no longer exist.
Fix: synthesis gaps 0500-0529, recall opens 0530-0539, packets 0540-0599 (ten each).

**O2. A START that the coordinator does not follow with a start is still counted as a start.**
Where: COORDINATOR.md:55-63; gate.mjs:76-83; hang.mjs:54-58.
Why: when L is under the unit's expected while others run, the unit waits but keeps its START slot. hang.mjs then
lists the unit as running and gives SILENT after 20 minutes. Section 8 would then restart a unit that never ran,
against section 3 step 4. Each re-gate at a later return also spends a `starts_max` slot, so six gates without a start
give the unit up unrun. This happens only near a tight cap.
Fix: compute L first (`run` from `node tools/tokens.mjs run`) and call the gate only when L is at or over expected.

**O3. A unit's peak is 7 helpers, not 6.**
Where: COORDINATOR.md:78-80; WIDEN D7.
Why: FIELD.md:78 runs the five extractors "with the fold", beside the part helper. Three units then hold 21 helpers,
plus the sheet's 2, which is over the app's 20 (C:99-100) if helpers of helpers count. Refusals are retried
(FIELD.md s3), so nothing fails, but "your starts are not refused" is wrong, and 20 / 7 gives two units at once, not
three.
Fix: state the peak as 7, and say that a refusal inside a unit is expected and retried.

**O4. "Owned by f<m>" can name a field that never reads the key.**
Where: split.mjs:109, :120 (the NOT-COVERED reason).
Why: a key cross-referenced to a field whose map did not name it, or to f5-f8 (fixed rows in topics.md), is read by
no one. The hand-back still says "owned by f<m>", as if it were covered there. WIDEN section 4 knows that keys
between fields are not known; the hand-back does not say so.
Fix: the closing's Not covered step greps each such key in the owner's PARTS.md or topics.md, and writes "named for
f<m>, not read there" when it is absent.

**O5. HAND-BACK.md has no test designs.**
Where: CLOSING.md:175-191.
Why: the hand-back has no test designs, no `approve:` or `cap:` items, and no pointer to SYNTHESIS.md section 3 or
the d9-04xx records. TOP6-WIDEN-RUN.md step 7 asks the top session to judge "what to test first and at what cost, by
pipeline".
Fix: the synthesis fold adds `## Test designs` after the lead blocks (question, tier, cost, ids), or one line that
points to SYNTHESIS.md section 3.

**O6. The report writer's "helper 25.8" is the part helper's figure.**
Where: FIELD.md:74 (S2's choice).
Why: 17.8 + 1.5 x 5.3 uses the part helper's quartiles (12.5-17.8, WIDEN s3). With R_same gone, the writer's whole
limit is the report's 16.3 M (writer.md:44). A part helper reading 25.8 reserves 9.5 M too much.
Fix: drop "the helper 25.8".

**O7. "Five" is still written where a short last part has fewer.**
Where: writer.md:9 "(five ...)"; check.md:7 "the five extractor files"; FIELD.md:72 "5 readers", :78 "5 extractors",
:79 "the five `done/extract-*.done`"; CLOSING.md:31.
Why: a last part can hold 1-4 keys (split.mjs:112-115). A helper that reads "five" literally waits for files that
never come, and takes the 45-minute failure path.
Fix: "its" in place of "five".

**O8. split.mjs accepts a key that fill.mjs refuses.**
Where: split.mjs:81 (`[a-z0-9-]{2,24}`); MAP.md:63.
Why: a key can start with "-"; fill.mjs:40 refuses such a topic. The part then fails at fill after its map is DONE,
when there is no refold.
Fix: `^[a-z0-9][a-z0-9-]{1,23}$` in split.mjs and MAP.md.

**O9. The end's message rests on ListAgents, which this review could not see in the app.**
Where: COORDINATOR s12 step 3; run/TOP.md.
Why: ListAgents rests on research.txt:366 (v2.1.224+, Windows v2.1.234+) and was not tried. This review's own session
lists `SendMessage` and the app's `mcp__ccd_session_mgmt__list_sessions` and `send_message` among its deferred tools,
but no `ListAgents`. If the coordinator's session has none, the message fails as written. The failure path exists
(GO.md:71), so nothing breaks. Not probed (r57-0506).
Fix: name the app's session tools as the second route in step 3, still one message.

**O10. The timer's wakes are overcounted.**
Where: WIDEN s3 (coordinator row); COORDINATOR.md:125.
Why: 20-28 wakes at 30 minutes is 10-14 h. The run's 7.5-11.2 h gives 15-23 wakes. The coordinator's figure is high
by about 1 M (the safe side).

**O11. Hang detection needs CronCreate, and without it he is not told.**
Where: COORDINATOR.md:127-128; R4.7.
Why: hang detection runs only on the timer. A helper could not load CronCreate's tool text (R4.7). Without the
timer, no hang is seen between events, and only STATE.md says so.
Fix: add "no timer: a silent unit is not seen" to the start line he is shown.

## Checked and standing (CORRECT)
- **Tests:** `node --test tools/*.test.mjs` passes 45 of 45 (3.3 s). Each START slot is a record of a start
  (gate.mjs:79-90).
- **Units and briefs:** run/config.json has 17 units, each with expected, limit, model and a done_file in the folder
  fill.mjs makes (fill.mjs:23 slugs = the config paths). `starts_max`, `hang_silent_min`, `split` and
  `coordinator.limit_M` are present. Every unit has a brief (SHEET, MAP, FIELD, CLOSING) and a gate before each start.
- **Split and fill:** split.mjs's rows `| f2a | key | collect | ...` match COORDINATOR's grep `^\| f[0-9][a-d] ` and
  the reader's `grep -F '| f2a | <key> |'`. NOT-COVERED.md is written first, and PARTS.md is published once (link,
  else wx). It works for 1 to the bound of parts; a part not named is "not needed". The x ranges (2a 50 ... 4b 105)
  agree across fill.mjs:24, FIELD.md:25-26 and CLOSING.md:31-33.
- **Unit names:** `unitOf` reads the unit from every new description (`orchestrate: f2m graphs`,
  `collect: f2a <topic>`, `read: f2m prior`, `run: sheet record check`, `read: closing sample of f2a`). tokens.mjs and
  hang.mjs therefore give nested helpers to their unit.
- **The sheet:** it writes DONE.md on DONE (SHEET.md:47), and the parts wait for that file.
- **F1:** nothing waits on an F1 file. A grep for planted, sealed, scorer, R_same, review-form, shuffle, f1-tokens,
  fresh review, same.done and fresh.done in the operative files finds only change notes. Git shows the moves to
  later/f1 as renames. The fresh refuter on every part stays (FIELD.md:76, refuter.md:1).
- **Arithmetic:** the units sum to 1,516.0 (1,275.2-1,749.5) M. With 110 M of preparation: 1,626 (1,385-1,860) M.
  Points: 24.45 (20.6-28.2), Fable 2.91 (2.32-3.63); room 64.7 and 55.5.
- **Maps:** f2m 42.75 (32.45-55.96) M; f3m and f4m 28.04 (21.42-36.5) M each.
- **Limits:** each is Q3 + 1.5 IQR: 91.3, 59.2, 150.1, 395.6 and 32.0 M.
- **Extensions:** what is left by step (93.8, 53.0, 41.1, 20.0, 2.0) comes from the medians 78.9 M plus the part
  helper's 14.9 M (C:74-77, 166-170).
- **Hours:** (3 x 0.75-1.2 + 12 x 1.1-1.8) / 3 + 2.3-2.8 = 7.45-11.2 h. The end time 00:35-04:15 follows from 17:05.
- **Downloads:** 64 web topics (maps 8, parts 40, fields 16) x 15 MB = 960 MB and x 2.5 MB = 160 MB. The closing:
  214.9 M (stated 214.8).
- **Scope:** f2 is widest, with a map of the five areas he was told (topics.md:21-25 against
  TOP6-WIDEN-RUN.md:33-35) and 4 parts of 5 keys. f3 and f4 each have a map and 2 parts. f5-f8 keep their five topics.
  Every method gets a tier, and none is dropped for size: reader.md, writer.md, MAP.md:72-74, CLOSING.md S.1, S.3,
  S.5 and P. Test designs come 12 GB first. Tests and baseline comparisons are out of the run, and no rule-3
  exception is left (DOWNLOADS.md:5-6, the run's CLAUDE.md rule 3, the go text).
- **The checks:** each is weighed with numbers (WIDEN D6). Hang detection is added at 2.4-4.6 M Fable, the restart
  limit at no calls, and fencing is not added, with the reason given. hang.mjs's SILENT, RETURNED and PAUSE work as
  specified. A replaced helper is handled by TaskStop plus the restarted helper's wait-first (FIELD.md s5). Every
  restart, window restarts included, is bounded by `starts_max` (gate.mjs:41-42). A missed notice is caught three
  ways.
- **The hand-back:** HAND-BACK.md's lead block holds every field that TOP6-WIDEN-RUN.md 2g and section 3 list, then
  Not covered and Tokens per unit. The awk sums by unit (tokens.mjs:12 puts the unit first in column 4). The end runs
  at any end of the run and has a failure line.
- **Rules:** downloads only as DOWNLOADS.md names them. Rule 4 is restated (MAP.md:85-86, FIELD.md:151). Questions
  are only `cap:` and `approve:`. No archived file of the harness repository was changed.
- **Tier hook:** every new kind is on a model tier-routes.json allows.

## Not checked
- **Not run:** no live run and no probe of the app (ListAgents or SendMessage, CronCreate, whether helpers of helpers
  count). split.mjs was not run with two calls at once.
- **Map readers:** reader.md's prior branch for a map unit was checked only through S1b's scratch run.
- **Reader cost:** not checked whether R3's second attempts make 34.3 M the reader step of a five-topic part. The map's
  five readers, which have no second attempts, are costed at 16.05 M; if parts also have few second attempts, each
  part is about 18 M high.
- **Closing figures:** each helper's figure against the total (S3 choice 9). The draft-board and recall prompts were
  read only for their ids.
- **Go page:** not opened.
