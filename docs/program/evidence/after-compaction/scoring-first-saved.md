# After-compaction count: the scoring as first saved

Saved at 2026-11-14T10:34:33.707Z (UTC), before the counting stages of the script existed and before any signal had been
counted before or after anything. What had run by then is listed in 1.0 below.

sha256 of the text below this line, from the heading of part 1 to its last line: 857f7191e3e4d09529b121eefcd19504d3f2298793f8d13b63d03ec105b3d55f

The same text, byte for byte, is part 1 of docs/program/AFTER-COMPACTION-2026-11.md.

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

