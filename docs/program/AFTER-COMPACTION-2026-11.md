# Do sessions make more mistakes after a compaction than before one

14 November 2026. For the owner's yes or no on a live trial of the split rule
(`docs/program/SPLIT-RULE-2026-11.md`, parts 2.5 and 6).

**What this is.** The summary check (`docs/program/SUMMARY-CHECK-2026-11.md`) found nothing wrong in the
compaction summaries themselves: 0 wrong of 2,727 claims a script can recheck, and a lag behind the kept
tail that the next window never acted on. What it could not see is whether a session goes wrong more
often in the calls after a compaction than in the calls before it (its part 3.5). That is the count that
would say whether there is anything for a brief to fix. This document takes it from the transcripts
already on record. It made no model calls beyond the one session that wrote it, and used no subagents or
workflows.

**The result in short** (part 2; 116 hand-overs in 45 sessions of FixFlow and the clinic testbed; the 30
calls before each against the 30 calls after).

- **Yes, on the lead measure: 0.58 mistakes for each 100 calls before a compaction, 1.35 after**
  [M; which errors count as mistakes is M, hand]. The difference is +0.77, range +0.28 to +1.33. 34
  hand-overs had more after than before, 12 had fewer, 70 the same. It holds with 15 and with 60 calls a
  side, on full windows only, in both projects, and without the one session that pulls it most (+0.54,
  range +0.19 to +0.93).
- **The count that needs no judgement does not show it by itself.** All error results: 1.51 before, 2.11
  after, +0.60, range −0.27 to +1.47. The whole rise sits in the kinds a blind hand read found to be the
  session's own mistakes. Errors that are probes, check findings or the PC itself are 33 before and 33
  after.
- **What goes wrong is mostly what the session had learned about this PC and its tools, and lost.**
  Calling `python`, which is not on this PC's PATH: never in the calls before a compaction, 12 times
  after. Commands too long for the shell tool, cut short: 6 before, 13 after. Scripts written for the
  occasion that did not parse: 2 and 8. Mistakes about the project itself (a file, its content, a
  reference): 3 and 7, too few to say.
- **The placebo does not show the same. It shows the opposite: 1.29 before the point, 0.61 after**
  (−0.68, range −1.27 to −0.19). A profile added afterwards says why: mistakes are most frequent in the
  30 calls after a compaction (1.31), fade through the stretch (0.95, 0.82, 0.82, 0.70), and are fewest
  in the last 30 calls before the next one (0.58). The window at its fullest is where the fewest of
  these mistakes are made.
- **A new session is no better.** Before its first compaction a session makes 1.13 for each 100 calls
  in its first 60 calls and 1.12 after them: as many as in the 60 calls after a compaction (1.14), and
  it does not fade.
- **It is small, and a larger cost sits beside it.** About half a failed call for each compaction [E].
  But of the 30 calls after a compaction 4.6 change something, where 7.2 did before (placebo: no
  change), and twice as many are reads.
- **Kind of compaction, size, model.** No difference shows, and the smaller groups are too few to rule
  one out. Model and size cannot be told apart in this record.
- **For the trial.** This measure cannot lead it. To show a hand-over that costs nothing it needs 177
  hand-overs for each arm; with 10, 20 or 38 the smallest difference that would show (2.56, 1.81, 1.31)
  is larger than the whole rate after a compaction (1.19) [E]. And what it found is not what the split
  rule is aimed at: the loss is of working knowledge of the PC, a new session loses it too, and a
  fuller window does not make more of these mistakes. Part 3.7.

**Where the numbers come from.** Every number in parts 2 and 3 is printed by
`docs/program/evidence/after-compaction/after.js.txt` into `after-table.txt` in the same folder; the
section letter is given beside each (A to N). The page that shows it is
`docs/program/after-compaction/index.html`.

**What was fixed when.** Part 1 up to 1.10 is as first saved at 10:34 UTC, before any count. Section
1.11 was added at 10:52 UTC, after the hand read and before the first count, which ran at 10:56 UTC. The
copies in the evidence folder carry the times and a hash of each text. Three sections of the table and
four rows were added after the first count, to read it; part 2.1 names them, and part 2.10 holds them.

**Tags.** [M] measured from the transcripts. [M, hand] measured by this session's own read. [E]
estimated: computed from measured numbers under a stated assumption. [G] guess.

---

## Part 1. The scoring, fixed before any count

Written and saved before the counting stages of the script existed. A copy as first saved, with its time
and a hash of this text, is in `docs/program/evidence/after-compaction/scoring-first-saved.md`.

### 1.0 What had run before this was written

Two survey scripts, over the whole record in scope, with nothing split by where a call sits relative to
a boundary other than how many calls lie between boundaries. They are stage `survey` of the script.

- The first counted the boundaries, the tool calls between them, the tool names, and the error results
  by tool and by the first line of the error with numbers, paths and quoted text blanked.
- The second counted how many error results match each candidate pattern of 1.3, how many results that
  are not flagged as errors hold a line shaped like a shell diagnostic, and the totals of check runs,
  state-changing calls and interrupts.

What they showed [M], on calls made up to 10:30 UTC on 14 November:

- 85 main transcripts in 41 folders. 28,084 tool calls by the main sessions; 1,181 more are copied
  lines in 2 files.
- 121 boundaries in 47 sessions; 117 of them in 45 sessions are the summary check's.
- Calls between two boundaries in one session: median 149 (a tenth of the stretches hold 85 or fewer, a
  tenth 298 or more; the shortest 30). From a session's start to its first boundary: median 145. After
  its last boundary: median 70.
- 596 error results, 2.1 for each 100 calls. 513 of them are shell calls. The file tools returned 28:
  "does not exist" twice, text to replace not found 6 times, changed since read 6 times.
- The shell is 64 % of all calls (18,092). Read, Edit and Write together are 22 %.
- 170 shell results that are not flagged as errors hold a diagnostic line (no such file, command not
  found, unknown revision).
- 2,718 calls are check or test runs by the reader's class; 479 of them failed. 21 interrupts by the
  owner.

No signal had been counted before or after anything, and no rate by position existed.

### 1.1 Which boundaries, which calls

**Boundaries.** The 117 compaction boundaries of the summary check, found by its reader
(`docs/program/evidence/summary-check/check.js.txt`, stage `index`) at its cut,
`2026-11-14T08:49:53.273Z`: main-session windows of FixFlow and the clinic testbed, 45 sessions. The
reader also gives, for each boundary, where the summary's input ended, the kept tail, the model of the
last call before it, its size, and whether it was prepared ahead. The owner's other projects are not
opened.

**Calls.** A call is one tool call made by the main session, with its result. Each sits on its own line
of the transcript. The reader's rules apply: request blobs and file-history lines are skipped, sidechain
lines are left out, and a copied line (its session id is not the file's) does not enter a window. The
call's class is the reader's (`classifyCall`): shell, test or check run, git or gh status, a call that
changes state, read, plan update, other tool.

**A second cut for calls.** Calls are read up to `2026-11-14T10:30:00.000Z`, so that the last
boundaries have calls after them. Four boundaries were written between the two cuts. They are not
counted, and no window crosses one.

### 1.2 The comparison

Paired, inside each session. For each boundary:

- **Before window:** the 30 calls that end where the summary's input ended.
- **After window:** the 30 calls that start after the boundary line.
- The kept tail (the calls between the two; a median of one, three at most) is in neither. It is listed.

**Why 30.** Half the stretches between two boundaries hold 149 calls or fewer. Thirty before and thirty
after leave a middle of 60 or more calls in 54 of 74 stretches, enough for a placebo point that shares
no call with either window (1.4). With 50 only 10 of 74 stretches would have one. Thirty calls is also
where an effect of losing context should be: the first steps of the next window.

**When boundaries are close.** No call is in two windows.

- A before window never starts before the session's first own call. An after window never runs past the
  next boundary's input end, the end of the file, or the cut.
- When the stretch between a boundary and the next boundary's input end holds fewer than 60 calls, it is
  cut in the middle: the first half is the earlier boundary's after window, the second half the later
  boundary's before window. An odd call goes to the before window.
- A pair is counted when each of its windows holds at least 10 calls. Otherwise it is listed and left
  out. Rates are pooled over calls, so a short window weighs less.
- The same figures are printed for the pairs whose windows are both full, 30 and 30.

**Other window sizes, as a check.** The lead signals are also counted with 15 and with 60 calls a side
(a stretch under twice the size is cut in the middle). And as a profile: bins of 10 calls from 60 before
to 60 after.

### 1.3 The signals

Each is something the script counts without reading prose. Rates are events for each 100 calls in the
window.

**E. An error result.** The harness flags the tool result as an error. Results that say the session
ended before the result was recorded are not errors of the call; they are counted apart. Every error
result gets one kind, the first that fits, in this order:

| kind | the result |
| --- | --- |
| owner refused | says the owner rejected the call or interrupted it |
| harness refused | says a guard or a permission check blocked the call: a blocked wait, a protected path, a safety check, the rule on starting sessions, a hook |
| environment | a timeout, a network failure, a program this PC lacks |
| missing path | no such file or directory, cannot access, cannot find path, file does not exist |
| missing command | command not found, not recognised as a command, the Windows notice that Python was not found |
| missing reference | git or GitHub: unknown revision, bad revision, not a valid object name, pathspec did not match, not a git repository, remote ref not found, pull request not found, needed a single revision |
| shell syntax | the shell could not parse the command: syntax error near a token, unexpected end of file, a parser error |
| bad arguments | the program or the tool rejected its options or input: unknown or invalid option, unrecognised argument, input validation |
| file tool refused | Read, Edit or Write: text to replace not found or not unique, file changed since read, file not read yet, file too large, is a directory |
| script crashed | a traceback or an uncaught exception from a script the call ran, in a call that is not a check or test run |
| check failed | a call the reader classes as a test or check run, and none of the kinds above |
| other | none of the above |

**The same diagnostics in a result that is not flagged.** A compound command whose last step succeeds
hides a failed step. A result line shaped like a diagnostic (a program name, a colon, then one of the
messages of missing path, missing command or missing reference) is counted as that kind, marked "not
flagged". Only these three kinds, and only on a line of that shape.

**The other signals.**

| id | signal | how the script counts it |
| --- | --- | --- |
| B | aimed at something that is not there | missing path, missing command or missing reference, flagged or not |
| N | a state-changing command with nothing to do | a git or gh call that changes state and reports nothing to commit, everything up to date on a push, already up to date on a merge, already exists, or already merged |
| A1 | the same error met again | an error of kind missing path, missing command, missing reference, file tool refused or harness refused, with the same subject (the path, the command name, the reference, the guard) as an earlier error of that kind anywhere earlier in the session |
| A2 | a state-changing call run twice | a call that changes state with the reader's fingerprint (the same command text; the same file and text written; the same message; the same agent prompt) equal to an earlier call's in the last 200 calls, where the earlier call did not fail |
| A3 | a file read again | a read (the Read tool, or a shell segment that starts with cat, head, tail, nl, less, more, bat, type, Get-Content, gc, or sed -n) that names a path which a read in the 30 calls before the reference point also named. The reference point of an after window is the boundary, so it looks at the before window and the kept tail. The reference point of a before window is its own start. |
| R1 | an edit that undoes an earlier one | an Edit whose two strings are those of an earlier successful Edit of the same file, swapped, in the last 200 calls; or a Write that puts back the exact content of an earlier Write of the same file, with another write or edit of that file between them |
| R2 | work thrown away by git | a shell call with git checkout or restore of a path, reset --hard, revert, stash (not list, show, pop, apply, drop), or clean -f |
| R3 | a check that fails after it last passed | a failing check or test run whose previous run of the same command passed. The same command is the reader's normalisation: spaces collapsed, a trailing pipe into tail or head cut, lower case. Previous means the latest earlier run in the last 200 calls. Failing means an error result or a failed count above zero. |
| O | the owner stopped or refused a step | an interrupt line, or an error of kind owner refused. An interrupt belongs to the call before it. |

**M, the lead measure: mistakes.** A call counts once in M when it carries at least one of these kinds,
for the kinds that pass the hand read of 1.7: harness refused, missing path, missing command, missing
reference (flagged or not), shell syntax, bad arguments, file tool refused, script crashed, N, A1, A2,
R1, R2, R3. Never in M: owner refused, environment, check failed, other, and A3.

**A3 is a cost, not a mistake.** After a compaction a session has lost the file and has to read it
again. It is counted because the split replay had to guess this re-learning, and it is reported apart.

**What is changed from the list in the task, and why.**

- "A file tool aimed at a path that does not exist" is widened to the shell. The file tools said "does
  not exist" twice in 28,084 calls; these sessions read and change files through the shell.
- "A file read again" counts shell reads too, for the same reason.
- "A command that changes state run twice" is counted two ways: the same call again (A2), and a state
  command that found nothing to do (N).
- Nothing is dropped before the count. The hand read of 1.7 decides which kinds stand.

**From part 2.5 of the split-rule record, not counted.** Review send-backs and rounds are verdicts in
prose about a slice, not about a call. Corrections are counted only as the owner's interrupts and
refusals (O); what the owner typed is not read.

### 1.4 The placebo

The same count around points that are not boundaries, in the same 45 sessions. It tells "after a
compaction" from "30 calls later in a session".

One point for each stretch that has room for it, with no boundary within 60 calls of the point on
either side:

- **between two boundaries**, when the stretch from one boundary to the next one's input end holds 120
  calls or more: the point is after its middle call;
- **before the first boundary**, when the stretch from the session's first own call holds 120 or more:
  the same. The first 30 calls of a session are then never in a placebo window;
- **after the last boundary**, when 90 calls or more follow it: the point is halfway between call 60 and
  the call 30 before the end.

The windows are the 30 calls before the point and the 30 after it. No placebo window shares a call with
a boundary's window. The signals, the pooling and the resampling are the same. For A3 the reference
point is the placebo point.

**The difference in differences** is the after-minus-before difference at the boundaries less the same
difference at the placebo points, with a range from the same resamples.

**What the placebo cannot separate.** A compaction does two things at once: it replaces the session's
history with a summary, and it empties the window. If a full window by itself raises mistakes, the
before window is the fullest point and the after window the emptiest. The placebo sits in mid-fill on
both sides. So the comparison measures the net of the two, which is the question as asked.

### 1.5 A second reference: a fresh start

The first 30 own calls of every main transcript in scope that holds at least 30 and does not begin with
copied lines, whether or not the session ever compacted. It is a comparison between sessions, not a
paired one, and the work at the start of a session is not the work in the middle of one. It is counted
because the split rule's hand-over is a new session that starts from a brief, and nothing else on record
stands nearer to that. It is used for the trial size (1.9) and for nothing else. A3 has no reference
window there and is not counted.

### 1.6 The splits

For M, E and A3.

- **How the summary was written.** The 18 prepared ahead while the session sat idle against the 99
  written when the boundary fell. The headline is all 117, with the 99 and the 18 beside it. After a
  prepared-ahead compaction the next window starts with the owner's next message, a new turn; after the
  others the session carries on in mid-turn. They are not the same event.
- **Size and model, which are one contrast here.** Among the 99: Opus at the owner's setting (86,
  between 364k and 380k) against the other models at the default trigger (13, between 758k and 975k).
  No model was compacted at both sizes when the boundary fell, so this contrast cannot say which of the
  two it is. Inside one model nothing can be compared by size either: the compactions of Fable and
  Sonnet under 900k are prepared-ahead ones, whose size says when the session went idle.
- **By model, by size band, by project.** Printed for the record, with the number of sessions in each.
- **By the summary check's own verdict.** The 74 summaries that were behind their kept tail against the
  43 that were not. It asks whether that lag costs anything on these signals.

A difference between two groups is the difference of their after-minus-before differences, with a range
from the same resampling.

### 1.7 The script's own error

The summary check's script marked 84 claims wrong and all 84 were its own mistakes. So every kind of
flagged event here gets a hand read, by this session and by no other model.

- **The kinds read:** the twelve kinds of error result (owner refused and environment included, to
  check the patterns), the three "not flagged" kinds, N, A1, A2, A3, R1, R2 and R3.
- **The sample.** For each kind, the events that fall inside any window (before, after, placebo before,
  placebo after) are put in the order of a hash of the kind, the session id and the transcript line. The
  first 15 are read; all of them when the kind has 15 or fewer. The choice does not depend on what the
  events say.
- **Read blind.** The work file shows the call, the end of its result and the three calls before and
  the one after. It does not say which window the event is in. The script holds that key and prints the
  shares by side only after the verdicts are saved.
- **One verdict for each event read:**

| code | meaning |
| --- | --- |
| M | a mistake of the session: it relied on something that is not there, wrote a command or arguments that could not run, acted on a state that did not hold, tripped a guard, repeated or undid its own work, or broke a check that had passed |
| D | a defect in the work that a check or test caught, in the ordinary loop of writing and testing |
| P | a probe or an expected failure: the call asked whether something exists or whether a check fails, and the answer was the point |
| V | the environment: a timeout, the network, the PC, another session's change |
| O | the owner's own step |
| X | not what the kind says: the script's error |

  Telling M from P for a missing path: M when the command reads, runs or changes the thing it names, P
  when it only lists or tests for it.

- **What each kind is then used for.**

| share of the events read that are M (for R3: M or D) | the kind |
| --- | --- |
| 80 % or more, and at least 5 read | is a mistake kind, and counts in M |
| 50 % to under 80 % | is reported as events of that kind, with its share, and stays out of M |
| under 50 % | is dropped as a signal. The document says what its events were. It still counts inside E. |
| fewer than 5 read | counts only, outside M |

  A3 is judged on whether the event is a second read of the same file, since it is not a mistake kind.

- **Like with like.** If the M share of a kind differs between its before events and its after events by
  more than 25 points, with at least 8 read on each side, that kind's comparison is marked as not like
  with like.
- **E needs no judgement to count.** The hand read says what E is made of, not whether to count it.
- One reader made every verdict. There is no second reader.

### 1.8 What is reported

For every signal:

- events and calls in the before windows and in the after windows, and the two rates for each 100 calls;
- the difference, after less before, in events for each 100 calls;
- a 95 % range for each rate and for the difference: the 2.5th and 97.5th percentiles over 4,000
  resamples of whole sessions (seed 20261114). Sessions are the unit because boundaries in one session
  are not independent;
- how many pairs had more after than before, the same, and fewer;
- the same for the placebo points, and the difference in differences.

Also: calls by class before and after, and error results for each 100 shell calls, since the mix of
calls shifts after a boundary.

**What counts as shown.** A difference is shown when its range excludes zero.

**One lead comparison.** M, on all 117. E is given beside it because it needs no judgement. Every other
comparison is secondary. There are about fifteen of them, and one in twenty would exclude zero by chance,
so a single secondary difference that excludes zero is not evidence by itself.

**Too few to say.** A signal with fewer than 20 events in the before and after windows together is
reported as counts, and no difference is claimed for it.

### 1.9 The trial size

For part 3. The unit is one hand-over. Its score is the lead measure in the 30 calls after it, as events
for each 100 calls. From the 99 boundaries written when the boundary fell (the trial's compaction arm
compacts at the line), the script takes the mean score, its variance between hand-overs, and a design
effect: the variance of the mean under resampling of whole sessions over its variance if hand-overs were
independent.

Hand-overs for each arm, at 5 % two-sided and 80 % power, with the same variance in both arms:
n = 7.85 × 2 × variance / (difference of the two means)², then times the design effect when several
hand-overs come from one session. The brief's rate is not known, so three stand-ins:

| if after a brief the rate is | tag |
| --- | --- |
| the rate before a compaction, so that the hand-over costs nothing | [E] |
| half the rate after a compaction | [G] |
| the rate of a fresh start (1.5) | [E] |

And the other way round: the smallest difference that 10, 20 and 38 hand-overs for each arm could show
(the sizes the two earlier records name).

If the after rate is not above the before rate, the first row has nothing to remove, and the document
says so.

### 1.10 What the output files may hold

Counts, rates, session ids, transcript line numbers, call classes, kinds and verdict codes. No sentence
from a message, a summary or a tool result, and no command text. The work files for the hand read hold
commands and results; they stay in the session's scratchpad and are deleted at the end.

### 1.11 Added after the hand read, and fixed before any count: the same lines read again

Written after the hand read of 1.7 was finished and its verdicts were saved, and before any signal had
been counted before or after anything. A copy as first saved is in
`docs/program/evidence/after-compaction/scoring-addendum-first-saved.md`.

**Why it was added.** The hand read of A3 found all 15 sampled events to be second reads of the same
file, so by 1.7 the kind stands. But 9 of the 15 read another part of the file, 4 read it after the
session itself had changed it, and only 2 read the same content again. As fixed, A3 counts going back to
a file. It does not count learning a file again, and that is the cost the split replay had to guess.

**What is added: A3s, the same lines read again.** A read in the window that names the same path as a
read in the reference calls (A3's reference calls), whose lines overlap that read's lines, with no write
to the file between the two that the calls show.

- **Lines.** The Read tool's offset and limit, or the whole file without them. `sed -n` with line
  numbers: those lines. `head`: line 1 to its count, 10 by default. `tail`: the end of the file, which
  overlaps only a whole-file read or another `tail`. cat, nl, less, more, bat, type, Get-Content and gc:
  the whole file. A read whose lines the script cannot tell overlaps nothing.
- **A write between the two.** An Edit or Write call on the path; a shell call that names the file and
  edits in place, redirects into it, copies or moves over it, formats it or restores it with git; or a
  result in which the harness notes that the command modified the file. The later read's own call is
  checked too, for a command that edits and then prints.
- A3s is a cost, like A3, and is never in M. It gets its own hand read of 15 by the rule of 1.7, judged
  on whether the event reads the same lines of the same file again with nothing changed between.

**A3's verdict codes, as used in the read.** Y the same content again. S another part of the same file.
W the file was changed between the two reads. All three are a second read of the same file.

---

## Part 2. The count

Run on 14 November 2026. Every figure below is from
`docs/program/evidence/after-compaction/after-table.txt`; the letter in each heading is the table's
section. Rates are events for each 100 calls. A range is the 2.5th to the 97.5th percentile over 4,000
resamples of whole sessions.

### 2.1 What ran, in what order

| time (UTC) | what |
| --- | --- |
| 10:25 to 10:30 | The two surveys of 1.0. |
| 10:34 | Scoring 1.0 to 1.10 saved, with its hash. |
| 10:35 | The summary check's reader, run to the call cut: 121 boundaries, 117 of them at its own cut. |
| 10:43 | The call stream of all 85 transcripts. The hand-read sample drawn by hash: 224 events of 22 kinds. No count by side existed. |
| | Hand read of the 224, without the side. |
| 10:52 | Verdicts saved. Addendum 1.11 saved. The script was extended for A3s, the samples already read were checked to be the same events, and 15 more events were read. |
| 10:56 | First count. |
| | Sections J, K and L and four rows on the mix of calls added, to read the first count. |
| 11:08 | The table as used for parts 2 and 3. |
| 13:07 on | The session was interrupted for two hours. One line was then added to section B (how many events were read before and after the addendum) and the table printed again: the same inputs give the same lines. The page was built from that run and looked at as screenshots at 1870 px and at 644 px. |

Things that are not in the scoring. None changes a definition or a threshold.

- **The surveys named a cut that was three minutes ahead of the clock.** They read 28,084 calls and 596
  error results. By the cut, the sessions then running had made 48 more calls, and the count reads
  28,132. Part 1 keeps the survey's figures as first saved.
- **Guards.** By the letter of 1.7 a tripped guard is a mistake. 12 of the 15 read are the guard on
  waiting with `sleep`. 3 are a safety check or a protected-path block that stopped a harmless command.
  They are counted as mistakes too.
- **Missing paths.** A command that prints several candidate files in a row, each with its errors
  shown, was read as a probe, not a mistake.
- **Two events needed more of the result than the work file showed** (both of kind N). The session
  looked at the part of the result around the matched words and no further.
- **A3 and A3s got three codes of their own** (1.11). For A3s, "the same lines" was read as: at least
  half of the lines read now had been read before.
- **After the first count** three descriptive sections were added to the table (J what the mistakes
  are, K where in a stretch they fall, L one session left out), four rows on the mix of calls (EnM, Msh,
  ST and RD) and a few derived lines. Two lines were reworded: A2, which had counted 2 of the 4 later
  boundaries, and the line of section B that says how many events were read. Every other line of the
  first count's sections A to I is in the final table unchanged. The session checked this line by line.

### 2.2 What was read (table section A) [M]

- 41 folders in scope, 85 main transcripts, 28,132 tool calls by the main sessions. 21 other folders
  were left out and not opened. 1,181 copied calls in 2 files are in no window.
- **117 boundaries in 45 sessions**, the summary check's own. 4 more were written between the two cuts:
  2 in those sessions, where no window crosses one, and 2 in sessions that hold no counted boundary.
- **116 pairs counted.** One was left out: its after window holds 3 calls, where that session's record
  ends. 103 pairs have both windows full. 5 before windows and 8 after windows are short.
- 3,436 calls in the before windows and 3,412 in the after windows. The kept tails, which are in
  neither, hold 116 calls, 2 of them error results.
- **103 placebo points in 42 sessions**: 30 before a session's first boundary, 54 between two
  boundaries, 19 after the last. 3,090 calls on each side. A point sits a median of 81 calls after the
  last compaction or the session's start (a tenth at 64 or fewer, a tenth at 176 or more).
- 75 of the 85 transcripts give a fresh start of 30 calls.
- 98 of the pairs are summaries written when the boundary fell. 18 were prepared ahead.

### 2.3 The hand read: which kinds stand (table section B) [M, hand]

239 events read: 224 before the addendum and 15 for A3s. The side of each was hidden.

| kind | in the windows | read | mistakes of the session | the rest | used as |
| --- | --- | --- | --- | --- | --- |
| harness refused | 18 | 15 | 15 | | a mistake kind, in M |
| missing command, flagged | 10 | 10 | 10 | | in M |
| shell syntax | 43 | 15 | 15 | | in M |
| bad arguments | 6 | 6 | 6 | | in M |
| file tool refused | 10 | 10 | 10 | | in M |
| script crashed | 24 | 15 | 15 | | in M |
| the same error met again (A1) | 28 | 15 | 13 | 1 a check's finding, 1 not an error of the call | in M |
| missing path, flagged | 17 | 15 | 10 | 3 probes, 2 the PC | events only (67 %) |
| missing path, not flagged | 57 | 15 | 8 | 4 probes, 2 not the call's own, 1 a check's finding | events only (53 %) |
| missing command, not flagged | 19 | 15 | 11 | 2 not the call's own, 1 probe, 1 a check's finding | events only (73 %) |
| missing reference, not flagged | 8 | 8 | 6 | 2 probes | events only (75 %) |
| missing reference, flagged | 4 | 4 | 2 | 1 probe, 1 the PC | counts only |
| a state-changing command with nothing to do (N) | 2 | 2 | 2 | | counts only |
| a check that fails after it last passed (R3) | 1 | 1 | 0 | 1 a defect the check caught | counts only |
| environment | 13 | 13 | 0 | 13 the PC | never in M |
| check failed | 28 | 15 | 3 | 10 findings in the work, 2 probes | never in M |
| other error results | 74 | 15 | 1 | 8 probes, 5 the PC, 1 a check's finding | never in M |
| a state-changing call run twice (A2) | 5 | 5 | 0 | 4 not repeats, 1 a deliberate rerun | dropped |
| work thrown away by git (R2) | 28 | 15 | 1 | 12 deliberate, 2 text inside a here-document | dropped |
| a file read again (A3) | 628 | 15 | | 2 the same content, 9 another part, 4 after a change | stands, as going back to a file |
| the same lines read again (A3s) | 159 | 15 | | 6 the same lines unchanged, 6 other lines, 3 after a change | dropped as a measure (40 %) |
| owner refused; an edit that undoes an earlier one (R1) | 0 | 0 | | | no event in any window |

**M is seven kinds:** harness refused, missing command (flagged), shell syntax, bad arguments, file tool
refused, script crashed, and the same error met again.

**Like with like.** No kind's share of mistakes differs between its before and its after events by more
than 25 points with 8 read on each side. A1 comes nearest: 3 of 5 before, 10 of 10 after.

**What became of the list in the task.**

- *A tool call that comes back as an error.* Kept as E, which needs no judgement. Its mistake kinds are
  in M.
- *A file tool aimed at a path that does not exist.* Widened to the shell (B). As a mistake signal it
  fails the test: only 53 to 67 % of missing paths were mistakes, the rest probes. It is reported as
  events.
- *A file read again.* A3 stands only as a count of going back to a file. Neither A3 nor the stricter
  A3s counts learning a file again: the script cannot tell a second read of the same lines from reading
  on, or from reading a log that has grown.
- *An edit that undoes an earlier one.* No event in any window. The git form (R2) is dropped: 12 of 15
  were deliberate, a change tested against a broken or an older copy and then restored.
- *A check that fails after it last passed.* One event in the windows. Counts only.
- *A command that changes state run twice.* A2 is dropped: the reader's fingerprint of an edit ignores
  the text replaced, and an identical push after new commits is routine. N has 2 events, both real.

### 2.4 Before against after at the boundaries (table section C)

116 pairs, 30 calls a side. [M; ranges E]

| signal | before: events of 3,436 calls | rate (range) | after: events of 3,412 calls | rate (range) | after less before (range) | reading | pairs more / same / fewer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **M, mistakes (the lead measure)** | 20 | 0.58 (0.36 to 0.83) | 46 | 1.35 (0.91 to 1.87) | **+0.77 (+0.28 to +1.33)** | shown | 34 / 70 / 12 |
| E, an error result | 52 | 1.51 (1.02 to 2.07) | 72 | 2.11 (1.45 to 2.89) | +0.60 (−0.27 to +1.47) | not shown | 39 / 50 / 27 |
| B, aimed at something that is not there | 16 | 0.47 (0.22 to 0.79) | 40 | 1.17 (0.77 to 1.57) | +0.71 (+0.28 to +1.14) | shown | 29 / 78 / 9 |
| A1, the same error met again | 2 | 0.06 | 14 | 0.41 | +0.35 (+0.16 to +0.62) | too few to say | 14 / 100 / 2 |
| A3, a file read again | 109 | 3.17 (2.02 to 4.75) | 200 | 5.86 (4.28 to 7.60) | +2.69 (+1.34 to +4.33) | shown | 57 / 38 / 21 |
| A3s, the same lines read again | 23 | 0.67 | 63 | 1.85 | +1.18 (+0.46 to +1.94) | dropped as a measure | 31 / 73 / 12 |
| A2, a state-changing call run twice | 2 | 0.06 | 2 | 0.06 | | dropped | |
| R2, work thrown away by git | 7 | 0.20 | 5 | 0.15 | | dropped | |
| N, R1, R3, O | 0, 0, 1, 1 | | 0, 0, 0, 1 | | | too few to say | |

The kinds of error result, as counts before and after: harness refused 6 and 1; environment 5 and 1;
missing path 2 and 4; missing command 1 and 6; missing reference 1 and 2; shell syntax 6 and 14; bad
arguments 2 and 3; file tool refused 0 and 3; script crashed 4 and 11; check failed 3 and 4; other 22
and 23. In results not flagged: missing path 9 and 14; missing command 2 and 12; missing reference 1
and 2.

Three rows that set the lead measure in its place:

- **Error results that are not mistake kinds: 33 before, 33 after** (0.96 and 0.97; +0.01, range −0.69
  to +0.72). The rise in E is all in the mistake kinds.
- **M among shell calls: 0.74 for each 100 shell calls before, 1.72 after** (+0.98, range +0.37 to
  +1.69). The rise is not made by there being more shell calls after a compaction.
- **Failing check or test runs: 17.2 % of 354 runs before, 15.7 % of 268 after** (−1.56 points, range
  −7.66 to +4.64). Checks do not fail more often.

### 2.5 The placebo (table section D)

103 points that are not boundaries, 30 calls a side. [M; ranges E]

| signal | before the point: events of 3,090 calls | rate (range) | after: events of 3,090 calls | rate (range) | after less before (range) | reading |
| --- | --- | --- | --- | --- | --- | --- |
| **M** | 40 | 1.29 (0.85 to 1.86) | 19 | 0.61 (0.37 to 0.90) | **−0.68 (−1.27 to −0.19)** | shown, as a fall |
| E | 72 | 2.33 (1.71 to 3.10) | 51 | 1.65 (1.10 to 2.31) | −0.68 (−1.49 to +0.14) | not shown |
| B | 34 | 1.10 (0.70 to 1.54) | 25 | 0.81 (0.48 to 1.17) | −0.29 (−0.76 to +0.15) | not shown |
| A1 | 9 | 0.29 | 3 | 0.10 | −0.19 (−0.52 to +0.03) | too few to say |
| A3 | 186 | 6.02 (4.46 to 7.74) | 133 | 4.30 (2.83 to 5.80) | −1.72 (−3.07 to −0.34) | shown, as a fall |
| error results that are not mistake kinds | 35 | 1.13 | 34 | 1.10 | −0.03 (−0.68 to +0.63) | not shown |

**The placebo does not show the rise. It shows a fall.** The difference in differences fixed in 1.4 is
+1.45 for M (range +0.70 to +2.25), +1.28 for E (+0.01 to +2.53) and +1.00 for B (+0.43 to +1.61). Part
3.3 says why that figure should not be read as the size of anything.

### 2.6 Checks on the window (table section E) [M; ranges E]

| | M before | M after | after less before (range) | E: after less before (range) |
| --- | --- | --- | --- | --- |
| 30 a side, all 116 pairs | 0.58 | 1.35 | +0.77 (+0.28 to +1.33) | +0.60 (−0.27 to +1.47) |
| 30 a side, only the 103 full pairs | 0.61 | 1.33 | +0.71 (+0.24 to +1.28) | +0.39 (−0.47 to +1.30) |
| 15 a side | 0.63 | 1.61 | +0.98 (+0.23 to +1.77) | +0.92 (−0.18 to +2.15) |
| 60 a side | 0.75 | 1.18 | +0.43 (+0.06 to +0.81) | +0.30 (−0.22 to +0.87) |

The lead measure is shown at every size, and the difference shrinks as the window widens. B is shown at
15 a side (+0.75) and not at 60 (+0.13, range −0.13 to +0.43).

**The profile, in bins of 10 calls** (E3). M for each 100 calls, counting back from where the summary's
input ended: 1.03, 0.76, 1.01, 0.53, 0.52, 0.69. Counting forward from the boundary: 1.81, 0.96, 1.26,
1.43, 0.41, 1.05. Each bin holds about ten events, so single bins mean little. The highest is the first
ten calls after the boundary. Calls that read a file are 19.5 % of the last ten calls before and 32.1 %
of the first ten after, and are back near 22 % by calls 31 to 40.

### 2.7 The splits (table section F) [M; ranges E]

M, before and after, and the difference.

| group | pairs | sessions | before | after | after less before (range) | reading |
| --- | --- | --- | --- | --- | --- | --- |
| written when the boundary fell | 98 | 39 | 0.58 | 1.21 | +0.63 (+0.24 to +1.11) | shown |
| prepared ahead of the boundary | 18 | 11 | 0.59 | 2.13 | +1.54 (+0.01 to +2.30) | too few to say (14 events) |
| Opus at the owner's setting, 364k to 380k | 85 | 33 | 0.63 | 1.19 | +0.56 (+0.18 to +0.99) | shown |
| other models at the default trigger, 758k to 975k | 13 | 8 | 0.26 | 1.33 | +1.08 (−0.48 to +3.33) | too few to say (6 events) |
| summary behind its kept tail | 73 | 40 | 0.56 | 1.54 | +0.98 (+0.29 to +1.68) | shown |
| summary not behind | 43 | 21 | 0.63 | 1.03 | +0.40 (−0.11 to +1.04) | not shown |
| FixFlow | 68 | 22 | 0.40 | 1.05 | +0.65 (+0.00 to +1.52) | shown |
| clinic testbed | 48 | 23 | 0.83 | 1.76 | +0.93 (+0.30 to +1.49) | shown |
| Opus 5.5 | 86 | 34 | 0.62 | 1.18 | +0.55 (+0.18 to +0.98) | shown |
| Fable 5.1 | 7 | 3 | 0 of 210 calls | 8 of 210 | | too few to say |
| Fable 5.2 | 17 | 7 | 2 of 476 | 4 of 475 | | too few to say |
| Sonnet 5.5 | 6 | 5 | 2 of 180 | 4 of 177 | | too few to say |
| 300k to 400k | 87 | 35 | 0.62 | 1.20 | +0.59 (+0.22 to +1.02) | shown |
| 400k to 900k | 13 | 10 | 0.77 | 2.15 | +1.38 (+0.01 to +2.34) | too few to say (11 events) |
| 900k and over | 12 | 7 | 0.28 | 1.45 | +1.17 (−0.56 to +3.81) | too few to say (6 events) |

Every group's difference points the same way. Between two groups, the difference of their differences:

| contrast, for M | difference (range) | reading |
| --- | --- | --- |
| prepared ahead less written when the boundary fell | +0.91 (−0.46 to +1.58) | too few to say |
| other models at the default trigger less Opus at the owner's setting | +0.52 (−1.08 to +2.68) | too few to say |
| summary behind its kept tail less summary not behind | +0.58 (−0.36 to +1.42) | not shown |
| clinic testbed less FixFlow | +0.27 (−0.79 to +1.20) | not shown |

For E no group's difference is shown except the clinic testbed's (+0.79, range +0.03 to +1.48), and no
contrast is.

### 2.8 A fresh start (table section G) [M; ranges E]

The first 30 calls of 75 sessions, 2,250 calls: M 21 events, 0.93 for each 100 calls (0.53 to 1.38); E
60 events, 2.67 (1.73 to 3.73); B 59 events, 2.62 (1.91 to 3.47). The owner stopped or refused a step 4
times.

### 2.9 The mix of calls (table section H) [M]

| class of call | before a compaction | after | placebo: before | after |
| --- | --- | --- | --- | --- |
| shell | 46.3 % | 51.2 % | 47.3 % | 45.5 % |
| test or check run | 10.3 % | 7.9 % | 11.1 % | 11.7 % |
| git or gh status | 5.4 % | 6.5 % | 5.4 % | 6.2 % |
| changes state | 24.0 % | 15.4 % | 23.3 % | 23.1 % |
| read | 4.8 % | 9.8 % | 4.6 % | 4.5 % |
| plan update | 6.4 % | 6.7 % | 5.2 % | 6.2 % |
| other tool | 2.6 % | 2.7 % | 3.1 % | 2.7 % |

With ranges (rows ST and RD of sections C and D): calls that change state fall by 8.68 points after a
compaction (range −12.18 to −5.17) and by 0.16 at the placebo points (−2.73 to +2.67). Calls of the
read class rise by 4.96 points (+3.24 to +6.97) and by −0.06 at the placebo points. In one window of 30
calls, 7.21 change state before a compaction and 4.61 after; 1.45 are reads before and 2.94 after.

### 2.10 Added after the first count, to read it (table sections J, K, L)

**What the mistakes are (J)** [M]. The 20 mistakes before and the 46 after, and the placebo's 40 and
19, by what the call got wrong. The grouping into three is this session's own.

| what the call got wrong | before a compaction | after | placebo: before | after |
| --- | --- | --- | --- | --- |
| **a fact about this PC or the harness** | **15** | **29** | 22 | 14 |
| a command cut short, or a quote left open | 6 | 13 | 14 | 6 |
| `python`, which is not on this PC's PATH | 0 | 6 | 1 | 1 |
| the same again, in a result not flagged | 0 | 6 | 0 | 0 |
| the guard on waiting with `sleep` | 5 | 1 | 5 | 2 |
| arguments of the plan tool or the Monitor tool | 1 | 3 | 1 | 0 |
| other (a tool, a program, another guard) | 3 | 0 | 1 | 5 |
| **a command or a script written wrong** | **2** | **10** | 5 | 2 |
| a script that did not parse | 2 | 8 | 1 | 1 |
| other | 0 | 2 | 4 | 1 |
| **what is in the project: a file, its content, a reference** | **3** | **7** | 13 | 3 |
| a script whose text to replace was not in the file | 2 | 2 | 4 | 1 |
| a file too large to read whole | 0 | 2 | 6 | 0 |
| other (a path or a reference met again, an edit's text not found, a file changed since read) | 1 | 3 | 3 | 2 |

**Where in a stretch the mistakes fall (K)** [M; ranges E]. Every call of the 45 sessions, by how many
calls it comes after the last compaction.

| calls after the last compaction | calls | M events | rate (range) | E rate |
| --- | --- | --- | --- | --- |
| 1 to 30 | 3,522 | 46 | 1.31 (0.88 to 1.80) | 2.10 |
| 31 to 60 | 3,162 | 30 | 0.95 (0.62 to 1.32) | 1.64 |
| 61 to 90 | 2,671 | 22 | 0.82 (0.52 to 1.18) | 1.87 |
| 91 to 120 | 2,207 | 18 | 0.82 (0.49 to 1.18) | 1.81 |
| 121 to 150 | 1,574 | 11 | 0.70 (0.27 to 1.27) | 1.27 |
| 151 to 210 | 1,195 | 5 | 0.42 (0.00 to 0.88) | 1.34 |
| 211 and on | 1,819 | 10 | 0.55 (0.41 to 1.14) | 0.82 |

Calls 1 to 60 against calls 61 and on: M 1.14 against 0.70, +0.44 (range +0.05 to +0.82); E 1.89
against 1.49, +0.40 (−0.14 to +0.90).

And the same for the calls of a session before its first compaction, counted from its start: 0.52,
1.77, 1.17, 1.01, 1.00, 1.27, 1.15. Calls 1 to 60 against the rest: 1.13 against 1.12, +0.01 (range
−0.52 to +0.62). No fall.

M above the rate of the 30 calls before a compaction (0.58), summed over calls 1 to 150 as if every
stretch ran that long: **0.50 mistakes for each compaction** [E]. Of that, 0.22 in calls 1 to 30; from
the pairs' own figures, 0.23.

**One session left out (L)** [M; range E]. The lead difference is +0.77 with all 45 sessions. Dropping
any one session leaves it between +0.54 and +0.84. The lowest is without the session that holds 10
pairs, 1 mistake before and 10 after; resampling the other 44 gives +0.54, range +0.19 to +0.93. For E:
between +0.36 and +0.83, and without that session +0.36 (−0.48 to +1.26). For B: between +0.61 and
+0.78.

---

## Part 3. The reading

### 3.1 Do the calls after a compaction go wrong more often

**Yes, on the lead measure, and it is as sure as this record allows.** 20 mistakes in the 3,436 calls
before, 46 in the 3,412 after: 0.58 and 1.35 for each 100 calls, +0.77, range +0.28 to +1.33. The
range comes from resampling whole sessions, so it allows for one session holding many hand-overs. Three
hand-overs in ten had more after than before; one in ten had fewer.

What stands behind "as sure as":

- It was the one lead comparison, fixed before any count (1.8).
- Which errors count as mistakes was settled by a read that could not see the side (1.7).
- It holds at 15, 30 and 60 calls a side, on full windows only, in each project, on Opus alone, and
  with any one session dropped.
- **But it rests on that read.** All error results together rise by 0.60, and the range of that holds
  zero. What the read did was split the errors in two. The half it called mistakes goes from 19 errors
  to 39 (+0.59, range +0.12 to +1.15). The half it called probes, findings and the PC stays at 33 and 33. A reader who drew the line
  elsewhere would get another number. One reader drew it.

### 3.2 What goes wrong

**Mostly not the project. The PC and the tools.** Of the 26 more mistakes after a compaction, 14 are
facts about this PC or the harness, 8 are commands or scripts written wrong, 4 are about the project.

- `python` is not on this PC's PATH. A session finds that out and stops calling it. In the 30 calls
  before a compaction it is called 0 times. In the 30 after, 12 times: 6 as flagged errors, 6 more in
  results the harness did not flag. At the placebo points: 1 and 1.
- The shell tool cuts a command that is too long, and what is left does not parse. 6 before, 13 after.
- Scripts written for the occasion that did not parse: 2 before, 8 after.
- The same error met again (A1): 2 before, 14 after. Too few for a rate by the rule of 1.8, and it
  points the same way.
- One thing goes the other way. The guard on waiting with `sleep` is tripped 5 times before and once
  after. It is tripped while waiting on a long check, and those come late in a stretch.

**Hallucination in the sense the split rule means it does not show here.** A mistake about the project
(a file that is not there, text that is not in a file, a reference that does not exist) is what a
session would make if its summary had told it something false or left something out. Those are 3 before
and 7 after in M. Missing paths as a whole, which are only partly mistakes, are 11 before and 18 after
(flagged and not flagged together): +0.21 for each 100 calls, range −0.11 to +0.51. Not shown.

### 3.3 What the placebo says

**It does not show the same thing, so the rise is not "30 calls later in a session".** At points with
no compaction the later 30 calls have fewer mistakes than the earlier 30, not more: 1.29 and 0.61.

**That fall is part of the same picture.** A placebo point sits in the middle of a stretch: a median
of 81 calls after the last compaction or the session's start, with its windows reaching 30 calls to
either side. The profile of section K shows what a stretch looks like:

- 1.31 mistakes for each 100 calls in the first 30 calls after a compaction;
- 0.95, 0.82, 0.82 and 0.70 in the four thirties after that;
- 0.58 in the last 30 before the next compaction.

So a compaction sets the rate back up, and it runs down again over the stretch. From the middle that
looks like a fall. The placebo's fall (−0.68) is larger than the profile's between the same thirties
(0.95 to 0.82), and its range is wide, so part of it is chance.

**The difference in differences (+1.45) is not the size of the effect.** It takes the placebo as a
level line, and the placebo is on the slope. The pairs' own figure, +0.77, is the one to use.

**The window at its fullest is where the fewest of these mistakes are made.** The last 30 calls before
a compaction are the fullest point of a window, about 367k on Opus and 970k on the others, and have the
lowest rate in the stretch. In this record a stretch running on and a window filling up are the same
thing, so the count cannot say a full window is harmless. It can say that whatever a full window does to
these mistakes is outweighed by what the session has learned by then.

**A session before its first compaction does not show the fall.** It makes 1.13 for each 100 calls in
its first 60 calls and 1.12 after them. The first 30 calls of all 75 fresh starts: 0.93.

### 3.4 Kind of compaction, size and model

**Nothing differs that the record can show.**

- **Prepared ahead against written when the boundary fell.** +1.54 against +0.63. The difference
  between them, +0.91, has a range that holds zero, and the 18 prepared-ahead pairs hold 14 events. They
  are a different event (the next window opens on the owner's next message), and the direction is
  toward more mistakes after them.
- **Size and model.** Opus at about 367k: +0.56, shown. The other models at about 970k: +1.08 on 6
  events. As 1.6 said, this is one contrast and cannot be split: no model was compacted at both sizes.
  With thirteen hand-overs on one side, the range of the contrast runs from −1.08 to +2.68.
- **By model.** Opus alone carries a shown difference. Fable 5.1, Fable 5.2 and Sonnet 5.5 have 7, 17
  and 6 pairs.
- **The summary check's lag.** After the 73 summaries that were behind their kept tail: +0.98. After
  the 43 that were not: +0.40. The difference, +0.58, has a range from −0.36 to +1.42. The summary
  check found the lag cost nothing in repeated work. Here it points toward a cost and does not show
  one.

### 3.5 The larger cost: the session stops changing things for a while

Not asked as a signal, and plain in the mix of calls. **Of the 30 calls after a compaction, 4.6 change
something (a file, a commit, a message, an agent). Before, 7.2 did.** The share falls from 24.0 % to
15.4 %, by 8.68 points, range −12.18 to −5.17. At the placebo points it is 23.3 % and 23.1 %. Reads go
the other way: 4.8 % to 9.8 %. In the first ten calls after a boundary one call in three reads a file,
against one in five before, and the share is back to its usual level by calls 31 to 40.

That is about 2.6 fewer state-changing calls for each compaction in the next 30 calls, and about 1.5
more reads. Against that, the mistakes are 0.23 more failed calls in the same 30.

**What a session reads again could not be counted cleanly.** Reads of a file already read in the last
30 calls go from 3.17 to 5.86 for each 100 calls. By the hand read, 9 of 15 such reads were of another
part of the file and 4 followed the session's own change. The stricter count (the same lines, 0.67 to
1.85) was right 6 times in 15. So the re-learning the split replay had to guess is still a guess. What
is measured is the mix above.

### 3.6 What the signals cannot see

- **Mistakes that raise no error.** A wrong statement to the owner, a wrong decision, work on the wrong
  thing, something left undone. The split rule's case on hallucinations lives there, and this count does
  not reach it.
- **What the owner typed.** Corrections in words are not read. The owner stopped or refused a step once
  before and once after: nothing to count.
- **Review send-backs.** They are verdicts about a slice.
- **Sub-agents' calls.** Only the main session's calls are read.
- **Shell reads that do not start a command.** A file read inside a longer pipeline is missed.
- **Why.** The count shows the mistakes come back after a compaction. It does not show whether the
  summary left the fact out or the next window had it and did not use it. No summary was read for this.

### 3.7 What this says about the live trial

**1. There is something after a compaction, and it is not what the trial was booked for.** The trial
compares a brief written at a line with a summary written at a compaction, on whether the hand-over
states the latest state rightly (part 6.4 of the split-rule record). This count finds a different loss:
working knowledge of the PC and the tools, which no hand-over on record carries across.

**2. A new session loses it too.** The split rule ends a session and starts another from a brief. On
this measure a session before its first compaction runs at 1.13, the level a compacted session returns
to and then leaves. Unless the brief carries the PC's facts, each new session learns them again, and
under the rule every hand-over is a new session.

**3. The window being full is not where these mistakes are.** The rule splits at a line so that work
does not run in a full window. For these mistakes the full end of a window is the best part of it.

**4. This measure cannot lead the trial.** One hand-over is one unit, scored on M in the 30 calls after
it. Over the 98 hand-overs written when the boundary fell the mean is 1.19, the standard deviation
2.04, and 69 % of hand-overs score nothing (table section I) [E].

| if after a brief the rate is | rate | hand-overs for each arm |
| --- | --- | --- |
| the rate before a compaction, so that the hand-over costs nothing [E] | 0.58 | 177 |
| half the rate after a compaction [G] | 0.60 | 186 |
| the rate of a fresh start [E] | 0.93 | 993 |

With 10, 20 or 38 hand-overs for each arm, the smallest difference that would show is 2.56, 1.81 or
1.31 for each 100 calls. Each is more than the whole rate after a compaction. A brief that removed
every one of these mistakes would not show. On E the figures are 1,602, 131 and no number at all: a
fresh start has more error results (2.67) than a compaction (1.63).

**5. What the trial should lead with is unchanged.** The reader's check of the latest state and of open
loops (6.4), sized from its own baseline on the recorded summaries. This count can ride along for
nothing: `after.js.txt` reads any transcript, and a trial's hand-overs can be added to the 116 on
record. It should be reported as counts, not as a test.

**6. The nearer step is not a trial.** If the loss is the PC's facts, they can be put where every
window reads them, compaction or not: the project's instruction file. Three lines would cover most of
the 29: `python` is not on the PATH here; a shell command that is too long is cut, so a long script goes
in a file first; and waiting is done with the wait tool, not with `sleep`. The same count on the
transcripts written after that would say whether the gap closes. It needs no agent runs.

So, for the owner's yes or no:

- **On mistakes a script can count, the record gives a small, real effect after a compaction and no
  reason to expect a brief to remove it.**
- **A trial of one wave cannot measure it either way.** If a trial runs, it runs for what 6.4 measures
  and for tokens.
- **Nothing here speaks to what the rule is for**: wrong statements and dropped loops raise no error.

### 3.8 Limits of this count

- One reader made every hand verdict, 239 of them, with no second reader. The lead measure is the
  errors that reader called mistakes.
- The windows are 30 calls. An effect that lasts longer shows only in the profile added afterwards (K),
  which was not fixed beforehand.
- Sections J, K and L were added after the first count, with the first count in view. They describe.
  The one test in this document is the lead comparison.
- One session holds 10 of the 46 mistakes after. Without it the difference is +0.54 and still shown.
- 66 mistakes in all at the boundaries. Any split of them by kind, model or size is thin.
- The placebo did not behave as a placebo. It sits on the slope it was meant to measure against.
- FixFlow and the clinic testbed only, on one PC. The facts that are lost are that PC's.

---

## Part 4. What the two earlier records and the compile could pick up

Nothing in the compile's data files or in the two earlier records was edited.

**TK-FILL, "Judgement against window fill is unmeasured".** Evidence to add: *In 116 hand-overs, the 30
calls before a compaction, the fullest point of a window, hold the fewest mistakes a script can count:
0.58 for each 100 calls, against 1.31 in the 30 calls after one and 0.70 to 0.95 between [M; which
errors are mistakes is M, hand]. Fill and time since the last compaction cannot be told apart.* It is
still unmeasured for judgement that raises no error.

**PR-SUMMARY, "Compaction summaries are behind the latest state".** Evidence to add: *After the 73
summaries that were behind their kept tail, mistakes rose by 0.98 for each 100 calls; after the 43 that
were not, by 0.40; the difference is not shown (+0.58, range −0.36 to +1.42) [M; E].*

**PR-HALLU, "No hallucination rate is measured".** Evidence to add: *Mistakes about the project itself
(a path, a file's content, a reference) in the 30 calls around 116 compactions: 3 before, 7 after [M,
hand]. Too few to say.* What stays open is unchanged.

**New, for the compile.** *A compaction loses what the session had learned about the PC and its tools.
`python` (not on the PATH) is called 0 times in the 30 calls before a compaction and 12 times in the 30
after; commands too long for the shell tool are 6 and 13 [M]. Mistakes in all: 0.58 to 1.35 for each
100 calls, +0.77 (+0.28 to +1.33) [M; E]. And for the 30 calls after a compaction a session changes
state in 15.4 % of its calls, against 24.0 % before [M].* First step: put those facts in each project's
instruction file and run the count again on later transcripts.

**For the split-rule record, part 6.** The trial's sizes for this measure are in 3.7. It cannot lead.
