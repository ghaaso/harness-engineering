# How often the compaction summaries on record state something false

14 November 2026. For the owner's yes or no on a live trial of the split rule
(`docs/program/SPLIT-RULE-2026-11.md`, part 2.5).

**Revised the same day after an independent check of this record**
(`docs/program/evidence/summary-check/review-2026-11-14.md`; its section "What was done about each
finding" says what was done about each one). The check ran the script again and got the same table, and read a sample of the hand
verdicts a second time, blind. No verdict and no count of claims or summaries changed; three codes for
what was overtaken did, under a rule set after the check (2.7). What changed is the reading drawn from
the counts: what the kept-tail lag does and does not show, how the bounds are printed
(rounded up, with their level), and the link to part 6 of the split-rule record. Since this record was
first written the owner has said yes to one trial wave at the 300k line, and part 6 of that record fixes
how the trial is scored; 3.5 below is written against it. A second pass on the revision kept six small
fixes of wording (2.3, 3.2, "What this is" and four places on the page); they are applied, by the
session that ran the check, and the review file's section "Second pass, on the revised record" lists
each. A fresh check of those edits kept four small ones more: three on where this record, its README and
the review file point or what they list, and one in part 4 on what the second readings show. No count or
verdict moved.

**What this is.** The split replay could not see hallucinations. The case for the split rule now rests on
one unmeasured thing: whether a short brief written at the line is wrong less often than a compaction
summary. The record's only evidence was two summaries checked by hand, both wrong about the latest state
(PR-SUMMARY), and no rate (PR-HALLU, TK-FILL). This document applies the hand-over fidelity measure of
part 2.5 to the summaries already on record: pull out the claims a script can recheck, recheck them
against the state at the moment of the hand-over, and report wrong claims over claims checked. The count
itself made no model calls beyond the one session that wrote it, and used no subagents or workflows; the
second readings quoted in table section K, 2.7 and 2.9 come from the independent check of 14 November,
which used agents of its own.

**The result in short** (part 2; 117 summaries from the main sessions of FixFlow and the clinic testbed).

- **Claims a script can recheck: 0 wrong of 2,727** [M, hand]. Commit ids, file paths, pull request
  states and test results. With none found, the one-sided 95 % upper bound on the rate is under 0.2 % if
  claims stand or fall one by one and under 2.6 % if a whole summary does [E]. Departing from 1.6, which
  bars a rate when the script's flags fail the hand read: the failure shows the script over-flags, not
  that held claims are wrong, so an upper bound is given beside the count. The count is zero in every
  size band and for every model.
- **The script could not be trusted on its own.** It marked 73 claims wrong on the first count and 11
  after six repairs. Read by hand, none of the 84 flags was a wrong claim: each was the script's error.
  (The 84 are 76 different claims; 8 were flagged in both counts.) By the test fixed in 1.6 the script's
  own rate (2.6 %, then 0.4 %) is not reported as a rate, and three kinds of claim (head, merged as,
  count) carry no rate at all. What the script missed was measured outside paths only.
- **Latest state: 74 of 117 summaries (63.2 %) [M, hand], range 50.8 to 74.1 % [E], are behind their own
  hand-over.** Their last sections call something pending that the session had already done. This is the
  failure both hand-checked summaries showed. It comes from how the harness builds the hand-over (it keeps
  the last messages verbatim and summarises what precedes them); 9 of 117 summaries described their tail
  all the same. The kept tail goes to the next window beside the summary and carries the newer state.
  The check made two blind second readings: 30 hand-overs in hash order, where the two readers agree on
  28, and the 11 of one session, where they agree on 9. Where those readings end up differing from this
  record they count the hand-over as overtaken: one of the 30, and the two of the 11 that this record
  left unclear. So 74 is more likely a few too low than too high. It would be 76 with the two left
  unclear and 77 with the one miss as well.
- **No next window redid, word for word in its first six steps, a state-changing call or message of its
  kept tail: 0 of 117** [M], under 4.0 % among the 74 [E]. Plan updates, re-reads and reworded messages
  were not compared, so this is a floor on what the lag cost.
- **No difference by fill was found, and none of up to about 30 points can be ruled out.** Summaries
  written when the boundary fell are behind in 48 of 86 cases at about 367k (Opus under the owner's
  setting) and 7 of 12 at about 970k (the default trigger): 55.8 % and 58.3 % [M, hand], a difference of
  2.5 points with a range of −31.9 to +32.3 [E]. The two groups are also different models (Opus against
  Fable and Sonnet). What does move it is how the summary was written: all 18 summaries prepared ahead of
  the boundary are behind.
- **For the trial.** On claims a script can recheck the summaries already score nothing wrong, so that
  measure cannot separate a brief from a summary. Parts 6.3 and 6.4 of the split-rule record reached the
  same and replace it with a reader's check. What this record adds for 6.4: the kept tail is part of the
  hand-over in the summary's arm, so a statement that only the kept tail contradicts is overtaken in the
  kept tail and is reported apart from wrong. The 74 of 117 is the summary scored alone, by one reader,
  on its last three sections; scored that way a brief wins by construction. Dropped open loops were not
  measured here. Part 3.5.

**Tags.** [M] measured from the transcripts, the repositories or GitHub. [M, hand] measured by this
session's own read. [E] estimated: computed from measured numbers under a stated assumption. [G] guess.
[S] an outside figure.

**Where the numbers come from.** Every number in parts 2 and 3 is printed by
`docs/program/evidence/summary-check/check.js.txt` into `check-table.txt` in the same folder; the section
letter is given beside each (A to L; section K holds the figures of the independent check, quoted from
its file). The page that shows it is `docs/program/summary-check/index.html`.

---

## Part 1. The scoring, fixed before any claim was counted

Sections 1.1 to 1.8 below are as first saved at 08:42 UTC, before any count. Sections 1.9 and 1.10 were
added later, each before the count it governs was run, and say so. The copies in the evidence folder
carry the times and a hash of each text; this file holds the same text, byte for byte. Where the check
of 14 November found something to correct in that text, the correction is a marked note set after the
section, outside the text as first saved.

Written and saved before the extraction and checking stages of the script existed. A copy of this part
as first saved is kept in `docs/program/evidence/summary-check/scoring-first-saved.md`.

What had run before it was written: a survey that counted the summaries in scope, their sizes and
models, and the headings they use; a print of a few lines from eight summaries to see how claims are
phrased; a read of the field layout around five compaction boundaries; and a check that git, the two
repositories and `gh` answer. No claim had been pulled out or checked, and no rate existed. The bands in
1.7 were chosen knowing the sizes, not the outcomes.

### 1.1 Which summaries

Every compaction summary in a main-session window of FixFlow or of the clinic testbed, found by the split
replay's own reader rules (`docs/program/evidence/split-replay/replay.js.txt`, stage `index`): a compact
boundary marker with its size, followed by the user line flagged as a compaction summary; request blobs
and file-history lines skipped; sidechain lines left out; a copied line, whose session id is not the
file's, loses to the original. The folders are the ones the replay's `groupOf` assigns to the two groups.

From the survey [M]: 117 summaries in 45 sessions. 109 were written up to the split replay's cut (61
FixFlow, 48 clinic, as the replay counts them) and 8 after it, all FixFlow. Nine more markers are a later
copy of one session's file and are left out. All 117 carry the trigger "auto". They are counted together,
and the table also gives the 109 on their own so the two records can be set side by side.

The owner's other projects are left out entirely. That drops the 8 summaries the replay counted there at
its cut. Their folders are not opened by this script, so summaries written there since are not counted.

### 1.2 The moment a claim is judged at

A boundary does not hand over the summary alone. The marker names a short tail of the latest messages
that the harness keeps verbatim after the summary, and the next window also gets a fresh git status. So
two positions are used.

- **The hand-over** is the boundary line. A claim is judged against the state at that line. This is the
  measure of part 2.5 ("as it stood at that moment") and the reading the two hand-checked cases were
  given ("wrong about the latest state, corrected by the verbatim tail").
- **The summary's input end** is the first kept message, or, for a summary prepared ahead of the
  boundary, its own timestamp if that is earlier. A claim that is wrong at the hand-over only because
  its value was replaced after this point is marked **replaced in the kept tail**: the summary could not
  have known, and the tail carries the newer value to the next window.

The headline rate is at the hand-over. The rate without the claims replaced in the kept tail is printed
beside it and called **as written**. Whether the summary's writer sees the kept tail is not stated in the
transcript; the script tests it (do summaries name things that first appear inside the kept tail) and
the table prints the answer.

### 1.3 The record a claim is checked against

In this order, as the task sets it.

1. **What the session saw**, in its own transcript before the hand-over: tool results (sub-agent reports
   included), messages in the user role (typed by the owner, sent by another session, or written by the
   harness), and attachments (re-attached files, instructions, the git status snapshot). The check uses
   the last value seen.
2. **The repository at that time**: commits, their ancestry and their dates in the project's own
   repository (FixFlow: this one; clinic: its own, on this PC, which has no remote).
3. **GitHub**, for pull request states and pull request commits, if `gh` answers. FixFlow only.

What the model itself wrote earlier (its text, its tool inputs, an earlier summary) is **said**, not
seen. It confirms nothing. A value found only there leaves the claim not checkable.

Three verdicts.

- **Held**: the record gives the same value.
- **Wrong**: the record contradicts the claim. Either it shows a different value at the hand-over, or
  the summary names an identifier (a commit id, a path, a count) that appears nowhere in the session's
  transcript before the hand-over and nowhere in the repository. The second case counts as a
  contradiction because the transcript is the whole input the summary was written from: an identifier
  with no source in it was not carried over, it was made up or garbled. The table prints the rate with
  and without that case.
- **Not checkable**: nothing in the record confirms or contradicts it. It stays out of the rate.

### 1.4 What counts as a checkable claim

One claim is one kind, one subject and one value, counted once per summary however often it is repeated.
The standard footer of a summary (the line that points at the transcript file) is not a claim.

| kind | what the script pulls out | held when | wrong when |
| --- | --- | --- | --- |
| **commit id** | A hexadecimal token of 7 to 40 characters with at least one digit and one letter, not part of a path, a URL, a session id or a longer word. | The session saw it (a longer id it is the start of counts), or it is a commit in the repository. | It appears nowhere before the hand-over and is not in the repository. |
| **head** | A commit id tied to a named branch or pull request as its head: the branch or `#N`, then "at", "@", "head", "HEAD" or "tip", then the id, in one clause. | The last head the session saw for that branch or pull request is this commit; or, if it saw none, the head by commit dates at that time is this commit. | The session saw the branch at another commit after it last saw it at this one; or the commit claimed is a strict ancestor of the head on record at that time. Never wrong only because the record shows nothing newer. |
| **pull request state** | `#N` with merged, open, closed or draft in the same clause. Draft is checked as open. Clauses with a negation or a condition (not, until, once, after, when, if, will, should, to be) are skipped. | The last state the session saw is this one; or, if it saw none, GitHub's created, merged and closed times put the pull request in this state at the hand-over. | The last state seen, or GitHub's times, give a different state. |
| **test result** | A number bound to passed, failed, skipped or passing: "N passed", "N failed", "N of M passing", "N tests pass". | The same number with the same word is in what the session saw. | The number appears nowhere in what the session saw; or a later run of the same command gave a different number and the summary does not also give that number. |
| **file path** | A token with a directory separator and a file extension, with no placeholder or wildcard. | It is in what the session saw, or was the target of a file tool call that did not fail, or is a path in the repository's history or on disk. | It appears nowhere before the hand-over, in the repository's history or on disk. |
| **count** | A number bound to files or rows: "N files", "N rows". | The same number with the same noun is in what the session saw. | The number appears nowhere in what the session saw. |

How a head the session saw is recognised: an output line that pairs a branch with a commit. A commit's
own result line, a push or fetch line, a branch or worktree listing, a decorated log line, a remote
listing, a `gh` result that names a head, or a message in the user role that states one in the form of
the table above.

Left out, with the reason:

- **Prose that names nothing.** What was decided and why, what the owner asked for, what is pending, what
  the session was doing. No script can recheck it. The "dropped an open loop" of the second hand-checked
  case lives here.
- **Whether a described change was made.** For a path the check is that the path is real, not that the
  edit the summary describes happened.
- **Bare file names, symbols, line numbers.** Too many chance matches.
- **Other numbers**: durations, sizes, token counts, percentages, dates, versions, migration numbers,
  ruling and task ids. No general way to tell which earlier value a later one replaces.
- **Small counts that match by chance.** A test result or a count is held only on the number with its
  own word; a number that merely appears somewhere is not checkable.

### 1.5 Latest-state failures, counted separately

A wrong claim is a **latest-state failure** when the summary's value was true earlier in the session and
the transcript shows it replaced before the hand-over: an older head, an older test count, a pull request
since merged. It is the failure both hand-checked summaries showed. Each one is also marked by where the
replacement first appears: before the summary's input end (wrong as written) or only in the kept tail
(1.2).

The other wrong claims are **named nothing on record** (1.3) or a **plain mismatch** (the record shows a
different value and never showed this one).

### 1.6 The extractor's own error, and when the measure fails

A script that reads prose will pull out things that are not claims and miss things that are. Three hand
reads, done by this session and by no other model, measure that. The hand verdicts go into a file the
script reads, so the table prints both the script's count and the count after the hand read.

1. **Every claim the script marks wrong is read by hand**, with its sentence and the evidence: is it a
   claim of the kind (not a plan, a hypothetical, a quoted error, a deliberate before-and-after), and
   does the record contradict it? Only claims confirmed by this read count as wrong in the reported
   rate. The script's own count is printed beside it.
2. **A fixed sample of held claims is read the same way**: 60 claims, ten of each kind, taken in the
   order of a hash of their key, so the choice does not depend on what they say. It shows how many
   "held" are not claims of the kind or were matched to the wrong evidence.
3. **A fixed sample of summaries is read in full**: two from each of three groups (Opus between 300k and
   400k; 400k to 900k; 900k and over), again in hash order, plus the two hand-checked ones. Every claim
   of the six kinds is listed by hand and checked by hand. It shows what the script missed, and whether
   what it missed is wrong more often than what it found.

The measure fails, and no rate is reported, only counts, in any of these cases:

| check | fails when | what is reported then |
| --- | --- | --- |
| wrong verdicts | fewer than 80 % of the script's wrong verdicts survive the hand read | the hand-confirmed count only, as a floor |
| held verdicts | more than 10 % of the sampled held claims are not claims of the kind or were matched to the wrong evidence | no rate for that kind; the overall rate without it |
| missed claims | the full reads find the script missed more than a third of the claims of the six kinds | the rate as a floor ("at least") |
| missed wrong claims | the full reads find more wrong claims of the six kinds that the script did not flag than ones it did | counts only, and the hand rate of the full reads as the only rate, with its small denominator |

### 1.7 What is reported

Per summary and in total: claims found, checked, held, wrong and not checkable, by kind; latest-state
failures, and of them how many were replaced in the kept tail.

Two rates, each with its denominator.

- **Claim rate**: wrong claims over claims checked (held plus wrong).
- **Summary rate**: summaries with at least one wrong claim over summaries with at least one checked
  claim. This is the form of the "2 of 2" on record.

Split by:

- **model**: the model of the session's last call before the boundary. The transcript does not name the
  model that wrote the summary.
- **window size at compaction**, in four bands fixed here: under 300k; 300k to under 400k (where the
  owner's Opus setting compacts); 400k to under 900k; 900k and over (the default trigger). From the
  survey they hold 4, 88, 13 and 12 summaries [M].
- **section**: the three sections that state where things stand (pending tasks, current work, next
  step) against the rest.

Model and fill are tangled in this record: 86 of the 88 summaries in the second band are Opus, and no
Opus summary is above 400k. So the comparison by fill is also made inside Fable alone, the only model
that spans the bands.

**Ranges.** Claims in one summary, and summaries in one session, are not independent: the same commit id
is repeated from one summary to the next. Each rate gets a 95 % range from a Wilson interval on an
effective number of claims: the claims checked, divided by a design effect measured by resampling whole
sessions (4,000 resamples, fixed seed). A band with fewer than five sessions is marked as too small for
its range to mean much. A difference between two bands is called shown only when the range of the
difference, from the same resampling, excludes zero.

**The trial size** (for part 3). For the live trial of part 2.5: the number of hand-overs per arm needed
to show a difference between two rates at 5 % two-sided with 80 % power, computed twice. Once on the
summary rate (a hand-over has a wrong claim or has none). Once on the claim rate, with the design effect
above and the measured number of checked claims per hand-over. The brief's rate is not known, so two
stand-ins are used and tagged: the rate found in the lowest band that has at least five sessions [E], and
half the summaries' rate [G].

### 1.8 What the output files may hold

What a claim names (a path, a commit id, a pull request number and state, a number and its word), its
verdict, the reason code and the transcript line the evidence is on. No sentence from a summary or from
any message. Working files that hold summary text stay in the session's scratchpad and are deleted at the
end.

### 1.9 Added after the first count, and fixed before it was run: the read of the kept tail

Written after the first count and its hand read (part 2.2 gives both), and before the kept tail of any
summary had been listed or read. A copy as first saved is in
`docs/program/evidence/summary-check/scoring-addendum-first-saved.md`.

**Why it was added.** The first count found no wrong claim that survived the hand read. Reading the first
hand-checked summary showed why the two cases on record do not appear in it: the harness ends every
summary with a line saying it was written without seeing the messages kept after it, and that something
the summary says has not happened may already have happened in them. Both hand-checked errors are of that
form, and both are prose: one said work was not yet committed, one said a closing message was not yet
written. No claim of the six kinds carries that. The brief asked for latest-state claims to be counted
separately, so a measure is added for the form they take in this record.

**What the script lists** (table section E; no judgement in it). For every summary, what lies between the
summary's input end (1.2) and the boundary: how many messages, how many tool calls, and each call's
class. A call **changes state** when it is a git commit, push, merge, rebase, reset, cherry-pick, tag or
pull; a `gh` call that creates, merges, closes, edits or readies a pull request; a file write or edit; a
message sent to another session; or the start of a session, agent or workflow. Reads, searches, status
calls, plan updates and test runs do not change state, and are listed.

**What is read by hand.** For all 117 summaries, the kept tail's calls and results beside the summary's
last three sections (pending tasks, current work, next step). One verdict per summary:

| verdict | when |
| --- | --- |
| **overtaken** | A statement in the last three sections says something is not done, is under way, is about to be done or is awaited, or gives a value, and the kept tail shows it done, finished, arrived or replaced. |
| **not overtaken** | The kept tail holds calls, and none of them completes or replaces anything those sections state. Work the summary calls under way that is still under way at the boundary is not overtaken. |
| **empty tail** | The kept tail holds no call and no message from the model. |
| **unclear** | The read cannot settle it. Counted with not overtaken in the rate, and shown. |

Each overtaken summary also gets what was overtaken, as a code: a commit or push; a file written; a
check or test result that arrived; a message or report that was sent or arrived; a pull request step;
other. No sentence is kept.

**The rate.** Overtaken summaries over summaries read, with the same split by band and by model and the
same ranges as 1.7 (here the unit is the summary, and the design effect is measured on it). This is the
summary rate of the latest-state failure. It is reported beside the claim rate of 1.7, not mixed into
it, because it comes from a hand read of prose and not from a script.

**What it does not say.** An overtaken statement is not a made-up one. The summary was right when it was
written; the hand-over is where it is behind, and the same hand-over carries the kept tail and the
harness's warning. Whether the next window then acts on the stale statement or on the tail is not
measured here.

**Two smaller additions to the script's kinds**, both made before the second count and both aimed at
finding more wrong claims, not fewer:

- **A bare head.** "head", "HEAD" or "tip" followed by a commit id, with no branch or pull request named
  in the clause, is read as the session's own branch (the branch the boundary line records). It is checked
  against that branch's commits by date: held when it is the last commit at the hand-over, wrong when it
  is a strict ancestor of it, with the kept-tail mark when the newer commit was made after the summary's
  input end.
- **Merged as.** `#N` followed by "merged as" and a commit id is checked against the merge commit GitHub
  records for that pull request: held when it is that commit, wrong when it is another.

Every claim either addition marks wrong is read by hand, as in 1.6.

> Note added after the check of 14 November, outside the text as first saved. "Part 2.2" above is now
> 2.4, and "table section E" is now sections B and D of the table (E holds the repeat check of 1.10).
> The text above does not say which code is given when the kept tail did more than one thing the
> summary calls still to come. The rule set after the check is in 2.7.

### 1.10 Added after the read of the kept tail, and fixed before it was run: did the next window repeat it

Written after the read of 1.9 was finished and before any line after a boundary had been listed. A copy
as first saved is in `docs/program/evidence/summary-check/scoring-addendum-2-first-saved.md`.

**Why.** 1.9 says how often the summary is behind the kept tail. It does not say whether that costs
anything, because the next window is also given the tail. What it costs can be read from the record with
no judgement: did the next window do again something the kept tail had already done?

**What the script compares.** For every hand-over, each call and each model message in the kept tail,
against the first six calls and model messages after the boundary.

| a repeat is | when |
| --- | --- |
| a file written again | the same path, and the same text written |
| a command run again | the same command text, once spaces are collapsed, for a call that changes state (1.9) |
| a message sent again | the same recipient and the same text |
| an agent, workflow or session started again | the same description and prompt |
| a message said again | a model message that shares more than half of its three-word runs with a model message in the kept tail, both at least eight runs long |

Reads, searches, status calls, plan updates and test runs repeated are not counted: doing one twice
changes nothing. Shell commands the script cannot class are counted apart and not in the rate.

**The rate.** Hand-overs in which the next window repeated at least one thing, over all hand-overs; and
the same split by the verdict of 1.9, since a repeat is expected only where the summary was overtaken. No
hand judgement enters it. It is a floor: a next window that redoes the work in different words, or acts
on a stale statement in some other way, is not caught.

---

## Part 2. The count

Run on 14 November 2026. Every figure below is from
`docs/program/evidence/summary-check/check-table.txt`; the letter in each heading is the table's section.

### 2.1 What ran, in what order

| time (UTC) | what |
| --- | --- |
| 08:42 | Scoring 1.1 to 1.8 saved. Its copy carries the time and a hash. |
| 08:49 | First count: the script as first written, over all 117 summaries. This fixes the cut: lines written after 08:49:53 are not read. |
| | Hand read of all 73 claims it marked wrong, and of the fixed sample of 60 held claims. |
| 09:01 | Addendum 1.9 saved (the kept-tail read, a bare head, "merged as"). |
| | Six repairs to the script and the second count, at the same cut. Hand read of the 11 claims it marked wrong and of a new held sample of 69. |
| | Hand read of the kept tail of all 117 hand-overs. Hand read of eight summaries for what the script missed. |
| 09:28 | Addendum 1.10 saved (did the next window repeat the tail). The repeat check run. |
| | Table, page, this document. |

Four things happened that are not in the scoring and changed no definition or threshold.

- The second count was first run with a later cut and picked up two summaries written in the meantime.
  That run was thrown away and the count repeated at the first count's cut, so both counts read the
  same 117.
- While the kept tails were being read, two descriptive tests were added to the script: does a summary
  repeat an id, or a run of four words, that exists only in its kept tail's results (table B4). They
  answer the question 1.2 left open and enter no rate.
- The script's class for "a call that changes state" missed commits made with quoted options. It was
  corrected after the hand read. It changes the script's listing (B2, D4) and no hand verdict.
- For the full read of 1.6, three of the eight summaries were read in full. For the other five, every
  line that could hold a claim of the non-path kinds was read, with the script's own extraction marked
  beside it. That is less than 1.6 fixed.

After the independent check, later the same day, the script's printing was corrected and the table, the
page and this document were regenerated at the same cut. No scoring text, no verdict and no count of
claims or summaries changed. What changed in the table:

- Upper bounds for a count of zero are printed rounded up and named as one-sided 95 % bounds. They had
  been rounded to the nearest tenth, which put three of the four headline bounds below their true value.
- The median lead of the summaries prepared ahead is 65 minutes, not 62: the script had taken the lower
  of the two middle values.
- Added: the wider repeat count (2.8), the rows inside Fable alone and the one-session line (2.7), when
  a prepared-ahead summary was written against its first kept message (2.2), how many claims check a
  value against a state (3.1), and section K, which quotes the figures of the check itself.
- A rule for which code a hand-over gets when its kept tail did more than one thing was set, and three
  codes were changed to follow it (2.7).
- A transcript started after the cut is no longer read, and a folder made after the cut is no longer
  counted, so a later run at the same cut reads the same 83 files in the same 41 folders.

Later still, the check sent the result of a blind second reading of one session's 11 hand-overs (2.7).
To print it, the working files were built again from the transcripts and the table was printed from
them. Every line came out as recorded, apart from the time, the new lines of section K and the count of
transcripts and folders that postdate the cut.

### 2.2 What was read (table section A) [M]

- 41 project folders in scope, 83 main transcripts. 21 other folders were left out and not opened. A
  transcript started after the cut is not read, and a folder made after the cut is not counted (3
  transcripts and 1 folder when the table was last printed).
- **117 summaries in 45 sessions**: FixFlow 69, clinic testbed 48. 109 of them were written up to the
  split replay's cut (61 FixFlow, 48 clinic, as the replay counts them) and 8 after it. Nine copied
  markers were left out. The owner's other projects hold 8 summaries at the replay's cut; they are
  dropped.
- Median summary 22,852 characters (9,686 to 37,870).

| window size at compaction | Opus 5.5 | Fable 5.1 | Fable 5.2 | Sonnet 5.5 | all | sessions | prepared ahead |
| --- | --- | --- | --- | --- | --- | --- | --- |
| under 300k (205k to 272k) | 1 | 0 | 3 | 0 | 4 | 2 | 4 |
| 300k to 400k (303k to 393k) | 86 | 0 | 2 | 0 | 88 | 35 | 2 |
| 400k to 900k (429k to 894k) | 0 | 3 | 5 | 5 | 13 | 10 | 12 |
| 900k and over (966k to 975k) | 0 | 4 | 7 | 1 | 12 | 7 | 0 |
| all | 87 | 7 | 17 | 6 | 117 | 45 | 18 |

**The bands are two kinds of compaction, not one scale.** 99 summaries were written when the boundary
fell: 86 on Opus between 364k and 380k, where the owner's setting compacts, and 13 on the other models
between 758k and 975k. The other 18 were **prepared ahead of the boundary** (the marker's own flag): the
harness wrote them while the session sat idle, a median 65 minutes and up to 396 minutes before the
boundary, and applied them when the next message came. They run from 205k to 894k, so their size says how
big the window happened to be when the session went idle, not that it was full. All four summaries under
300k and twelve of the thirteen between 400k and 900k are of this kind. All 18 were written after their
first kept message, a median 56 minutes after it (table A5).

### 2.3 What a compaction hands over (table section B) [M]

The harness keeps the session's last messages word for word after the summary. In 89 of the 117
hand-overs that kept tail holds at least one call, in the other 28 a model message and no call. It is
short: a median of one call, three at most, 117 calls in all. 39 tails hold a call the script classes
as changing state; those tails hold 42 such calls (file writes 28, commits, pushes and merges 7, agents
or sessions started 4, messages sent 3). That 39 is a floor: a shell or node command that edits a file
can be classed as a test run, a status call or plain shell. In the second reading's sample of 30, four
tails the adjudication judged overtaken by a write (two of them the readers' two disagreements) were
overtaken by a call the script did not class as changing state: in three the tail holds no such call at
all, and in clinic-903f5856-04 the writing was done by a call classed as a status call. In 35 a message
came in during the tail: the owner, another session, or a task notice.

**The summary is written without the kept tail.** The boundary marker names the kept messages as a
preserved segment, which is how the script finds the tail, and the harness summarises only what comes
before them. All 117 summaries end with the harness's own line saying so, and that something the summary
says has not happened may already have happened in the kept messages. The script tested the line. In 39
tails a tool result holds an id or a long number found nowhere earlier in the transcript; 2 summaries
repeat one. 3 more repeat a run of four words from a tail result that is found nowhere earlier. So **at
least 5 of the 89 summaries were written with the tail in view**; by the hand read, 9. For the rest the
test is silent: it can show a summary saw its tail, not that it did not. The evidence that the summary
is written without the tail is the marker's preserved-segment field and the harness's own line.

### 2.4 Claims, first count (table section C1, C2)

The script as first written found 2,979 claims, checked 2,858 and marked 73 wrong: 2.6 % [M].

| kind | found | held | marked wrong | not checkable |
| --- | --- | --- | --- | --- |
| commit id | 714 | 712 | 2 | 0 |
| file path | 1,987 | 1,852 | 53 | 82 |
| head | 72 | 49 | 11 | 12 |
| pull request state | 38 | 31 | 7 | 0 |
| test result | 113 | 109 | 0 | 4 |
| count | 55 | 32 | 0 | 23 |

**Read by hand, none of the 73 was wrong** [M, hand]. 42 were not claims of the kind and 31 were claims
the record agrees with.

| what the script took for a wrong claim | n |
| --- | --- |
| one token standing for several files (`a/b/c.md`, a range, a placeholder name) | 17 |
| a folder shortened or built from a shell variable; the transcript names the file | 14 |
| a path relative to a subfolder; the file is on disk there | 13 |
| a quoted instruction, or an account of an earlier state | 12 |
| a file or step the summary says is still to be made | 7 |
| a state word that belongs to something else in the sentence | 5 |
| a value that is in the transcript and the first reader missed | 2 |
| another spelling of the same path | 2 |
| a file digest, not a commit id | 1 |

So the first test of 1.6 fails: 0 of 73 survive, where 80 % was asked. The second test fails for four
kinds: of ten sampled held claims, the ones that were not claims of the kind were 0 for commit ids, 0
for paths, 5 for heads, 2 for pull request states, 4 for test results and 4 for counts.

### 2.5 Repairs, and the second count (table section C3 to C7)

Six repairs. R1, R3, R5 and R6 make the script do what 1.4 says. R2 and R4 narrow 1.4: a path known
only by its file name becomes not checkable, and a state word must sit beside the number. Neither can
hide a wrong claim, since all 73 first-count flags were read by hand before them.

- R1. An id that starts a longer hexadecimal string, or is in upper case, counts as seen.
- R2. One spelling per path. A path counts as on disk when a file under the project ends with it. When
  only the file name is on record, the claim is not checkable.
- R3. A token standing for several files is not a path.
- R4. A pull request state counts only when the word sits beside the number.
- R5. Quoted user messages and merge instructions are not head or state claims.
- R6. A test result needs a test word on its line and is not taken from an instruction. A count is not
  taken from a label.

Two things were added to find more wrong claims, not fewer (1.9): a bare head read as the session's own
branch, and "merged as" checked against the merge commit GitHub records.

| kind | found | held | marked wrong | not checkable | wrong after the hand read | sampled held claims that were not claims |
| --- | --- | --- | --- | --- | --- | --- |
| commit id | 714 | 713 | 0 | 1 | 0 | 0 of 10 |
| file path | 1,966 | 1,904 | 5 | 57 | 0 | 0 of 10 |
| pull request state | 22 | 20 | 2 | 0 | 0 | 1 of 10 |
| test result | 92 | 90 | 0 | 2 | 0 | 1 of 10 |
| head | 73 | 47 | 4 | 22 | 0 | 3 of 10 |
| merged as | 9 | 9 | 0 | 0 | 0 | 1 of 9 |
| count | 37 | 22 | 0 | 15 | 0 | 2 of 10 |
| all | 2,913 | 2,805 | 11 | 97 | 0 | |

The 11 it still marked wrong were read by hand: 4 quotations or accounts of an earlier state, 3 tokens
standing for several files, 2 plans, 1 value the summary had right, and 1 head where the summary names
the newer commit as well. **None was wrong** [M, hand]. 8 of the 11 are claims the first count had
marked wrong as well, so the two counts' 84 flags are 76 different claims. The first test fails again:
nothing the script marks wrong is wrong, in either count.

The two pull request flags (#185 in fixflow-423aac92-10, #180 in fixflow-49260710-02) are the two states
SPLIT-RULE 6.3 counts as contradicted (`pointers-record.json`, documents 9 and 11). Read by hand, one is
an account of earlier wording that the summary was replacing, and one stands inside a quoted
instruction whose outcome the same summary states.

After the repairs four kinds pass the second test and keep a rate: commit id, file path, pull request
state, test result. Head, merged as and count do not, and by 1.6 carry no rate.

**The claim rate: 0 wrong of 2,727 claims checked** in the four kinds that keep a rate [M, hand]; 0 of
2,807 over all seven. **The summary rate: 0 of 117.**

The range fixed in 1.7 cannot be computed: with no wrong claim, resampling sessions has nothing to
spread. Two one-sided 95 % upper bounds are given in its place [E], each printed rounded up. If claims
stand or fall one by one, the rate is under 0.2 %. If every claim in a summary stands or falls together,
under 2.6 %; if every claim in a session does, under 6.5 %. The truth lies between the first and the
second. Departing from 1.6, which bars a rate when the script's flags fail the hand read: the failure
shows the script over-flags, not that held claims are wrong, so an upper bound is given beside the
count. These bounds are one-sided; the ranges of 2.7 are two-sided, so the two are not at the same
level.

Where the 2,805 claims the script held were confirmed [M]: 2,483 commit ids and paths in the session's
own transcript (seen in a tool result, a message or an attachment, or opened by a file tool); 134 paths
in the repository's history or on disk; 47 heads (28 by the last head seen, 19 by commit dates); 29 pull
request states and merge commits (10 by the last state seen, 19 against GitHub); 112 test results and
counts seen with their word. 97 claims were not checkable and stay out: 57 paths, 22 heads, 15 counts,
2 test results, 1 commit id.

### 2.6 By window size and by model (table section C8, C9) [M, hand]

Nothing is wrong in any group, so each row gives how high the rate could still be: the one-sided 95 %
upper bound of 2.5, printed rounded up [E].

| group | summaries | sessions | claims checked | wrong | under, claim by claim | under, summary by summary |
| --- | --- | --- | --- | --- | --- | --- |
| under 300k (fewer than five sessions) | 4 | 2 | 52 | 0 | 5.6 % | 52.8 % |
| 300k to 400k | 88 | 35 | 2,037 | 0 | 0.2 % | 3.4 % |
| 400k to 900k | 13 | 10 | 252 | 0 | 1.2 % | 20.6 % |
| 900k and over | 12 | 7 | 386 | 0 | 0.8 % | 22.1 % |
| Opus 5.5 | 87 | 34 | 2,013 | 0 | 0.2 % | 3.4 % |
| Fable 5.1 (fewer than five sessions) | 7 | 3 | 179 | 0 | 1.7 % | 34.9 % |
| Fable 5.2 | 17 | 7 | 384 | 0 | 0.8 % | 16.2 % |
| Sonnet 5.5 | 6 | 5 | 151 | 0 | 2.0 % | 39.4 % |

Model and size are tangled: 86 of the 88 summaries between 300k and 400k are Opus and nothing above
400k is. Inside Fable alone, the only model that spans the bands, the count is the same: 0 of 76 under
400k (2 sessions, too few), 0 of 131 between 400k and 900k, 0 of 356 at 900k and over. The 109
summaries at the split replay's cut: 0 of 2,608.

262 claims sit in the three sections that state where things stand (pending tasks, current work, next
step), 237 of them in the kinds that keep a rate. None is wrong.

### 2.7 Latest state: the kept tail beside the summary's last sections (table section D) [M, hand]

For each of the 117 hand-overs the kept tail's calls and results were read beside the summary's last
three sections, under the verdicts of 1.9. Two points on how the rule was applied. A read alone was not
taken to overtake anything, even where the summary names that read as its next step. And one wrap-up
call was read as a report sent, since the summary names calling it as the next step.

**74 of 117 summaries were overtaken: 63.2 % [M, hand], range 50.8 to 74.1 % [E].** 39 were not. 4
could not be settled and are counted as not overtaken. The range is a Wilson interval on an effective
number of summaries; the design effect is 1.883, from resampling whole sessions [E].

**A second, blind reading** (table section K; done by the check of this record, not by this session).
30 of the 117 kept tails were read again in hash order by a second reader who did not see the first
verdicts. The two readers agree on 28 of 30. Each found 20 of 30 overtaken; the adjudicator, reading the
two disagreements again, makes it 21. Both disagreements were overtaken cases that one reader missed,
one each, and both misses came from trusting the script's class for a call instead of opening it. So 74
of 117 is more likely a few too low than too high. The verdicts in this record are the first reader's
as first given. One of them is a miss by that adjudication (clinic-903f5856-04, read as not overtaken);
with it the count would be 75.

**The 11 hand-overs of one session, read again** (table D6 and K6; the second reading is the check's
and reached this record after the review file was written). One session supplies 11 of the 117
summaries (fixflow-423aac92). Its hand-overs were judged overtaken in 2 of 11, against 72 of 106
(67.9 %) for the rest. A second reader read those 11 blind and agrees on 9: the same two overtaken, and
the same seven not, whose kept tails hold only reads. The two this record left unclear (01 and 08) the
second reader calls overtaken, both as close calls. In 01 the kept tail writes a file after the one the
summary names as the last written. In 08 it edits and re-runs a check, which replaces a count the
summary gives. So that session is overtaken in 2 of 11 by this record's count and in 4 of 11 by the
second reader's. Its low rate is real and comes from what its kept tails hold, not from the reading.
With those two read as overtaken the total would be 76 of 117, and 77 with the miss named above as
well. This record keeps 74 as reported. The design effect covers the clustering of one session's
hand-overs in the range; it is said here because one session weighs this much.

In all, 40 of the 117 hand-overs have had a second reading (the 30 and these 11; one is in both). Of the
4 this record left unclear, a second reading took one as not overtaken and two as overtaken; the fourth
has had one reader.

| what the kept tail had already done | n |
| --- | --- |
| written or changed a file the summary says is still to be written or changed | 30 |
| written, sent or received a message or report the summary says is still to come | 28 |
| made a commit or push the summary says is still to be made | 7 |
| taken another step the summary names as next (an agent, a workflow, a session, a stop) | 5 |
| received a check, test or background result the summary says is awaited | 4 |

Where the kept tail did more than one such thing, the code is the first that applies of: a commit or
push, a file, a message, a result, another step. A thing applies when the summary calls it still to
come and the kept tail holds it. 1.9 did not set this; the second reading showed the need (two
hand-overs the readers agreed on carried two codes each). It was set after the check, and applying it
changed three codes and no verdict: one from file to commit and two from result to file (table K4).

| group | overtaken | of | rate | range | sessions |
| --- | --- | --- | --- | --- | --- |
| prepared ahead of the boundary | 18 | 18 | 100 % | 71.3 to 100 % | 11 |
| written when the boundary fell | 56 | 99 | 56.6 % | 43.2 to 69.1 % | 39 |
| under 300k (fewer than five sessions) | 4 | 4 | 100 % | 35.6 to 100 % | 2 |
| 300k to 400k | 50 | 88 | 56.8 % | 42.6 to 70.0 % | 35 |
| 400k to 900k | 13 | 13 | 100 % | 64.2 to 100 % | 10 |
| 900k and over | 7 | 12 | 58.3 % | 24.8 to 85.6 % | 7 |
| Opus 5.5 | 49 | 87 | 56.3 % | 42.1 to 69.6 % | 34 |
| Fable 5.1 (fewer than five sessions) | 6 | 7 | 85.7 % | 36.7 to 98.4 % | 3 |
| Fable 5.2 | 13 | 17 | 76.5 % | 44.1 to 93.1 % | 7 |
| Sonnet 5.5 | 6 | 6 | 100 % | 45.3 to 100 % | 5 |
| Fable alone, under 400k (fewer than five sessions) | 5 | 5 | 100 % | 40.9 to 100 % | 2 |
| Fable alone, 400k to 900k | 8 | 8 | 100 % | 52.5 to 100 % | 5 |
| Fable alone, 900k and over | 6 | 11 | 54.5 % | 21.3 to 84.2 % | 6 |
| FixFlow | 36 | 69 | 52.2 % | 36.6 to 67.4 % | 22 |
| clinic testbed | 38 | 48 | 79.2 % | 60.2 to 90.5 % | 23 |

Like with like, taking only summaries written when the boundary fell: **Opus at its setting, 48 of 86
(55.8 %); the other models at the default trigger, 7 of 12 (58.3 %)** [M, hand]. The difference is 2.5
points, with a range of −31.9 to +32.3 points from the same resampling. It is not shown [E].

Inside Fable alone, the split 1.9 asks for through 1.7, fill cannot be compared like with like. All 5
Fable summaries under 400k and all 8 between 400k and 900k were prepared ahead of the boundary, and none
of the 11 at 900k and over was. No Fable summary under 900k was written when the boundary fell. So the
three Fable rows above compare how the summary was written, not how full the window was.

The nine summaries that describe their own kept tail are all not overtaken. Of the 39 tails that hold a
call the script classes as changing state (a floor, 2.3), 32 are overtaken; of the 78 that hold none, 42
are: a closing message written, a result or a message that came in, or a file changed by a shell
command.

### 2.8 Did the next window repeat what its kept tail had done (table section E) [M]

All 117 hand-overs have six steps on record after the boundary. **In none of them did the next window
repeat a call that changes state, and in none did it say a tail message again: 0 of 117.** With none
found the one-sided 95 % upper bound, printed rounded up, is under 2.6 %, and under 4.0 % among the 74
overtaken [E].

What was compared: file writes, by path and text; commands the script classes as changing state, by
text; messages sent, by recipient and text; agents, workflows and sessions started, by description and
prompt; model messages, by shared wording. That class is a floor (2.3), so the check was run again more
widely: any shell or node command run again with the same text, whatever class the script gave it. That
count is also **0 of 117**. Not compared: plan updates, reads, searches, status calls and test runs
(other than through the wider count), anything reworded, and anything after the sixth step.

The check could see such things. 28 tails hold a file write and 14 next windows write a file in their
first six steps; in 2 the same file was written again with other text, which is more work on it and not
a repeat. The most any next message shares with a tail message is 9 % of its three-word runs, where a
repeat needs more than half. The next window's first step is a plan update in 80 of 117 cases, and
whether that update carried an item the kept tail had already finished was not checked.

### 2.9 The script's own error (table section F)

| test fixed in 1.6 | first count | after the repairs |
| --- | --- | --- |
| at least 80 % of the script's wrong verdicts survive the hand read | 0 of 73: failed | 0 of 11: failed |
| at most 10 % of sampled held claims are not claims of the kind | passed for commit id and file path; failed for head, pull request state, test result, count | passed for commit id, file path, pull request state, test result; failed for head, merged as, count |
| the script misses no more than a third of the claims | | passed on a narrower read than 1.6 fixed (3 of 8 in full, paths not listed; 2.1): 34 missed against 88 found outside paths, 27.9 % |
| the hand reads find no more missed wrong claims than the script flagged | | passed on the same narrower read: 0 wrong among the 34 missed |

Under 1.6 this means: only the hand-confirmed count of wrong claims is reported, which is 0; and no rate
is reported for head, merged as and count. The upper bounds of 2.5 and 2.6 go beyond that, and say so
where they stand.

The check of this record added two reads of its own (table section K). A second reader read 35 of the
flags again, all 11 of the second count and 24 of the first count's 73 in hash order, and found none
wrong; the adjudicator agrees on all 35. And a hunt by hand through three summaries not read in full
before listed 47 claims of the non-path kinds: 46 held, 1 was not checkable, 0 were wrong.

What the script missed in the eight summaries read by hand: 17 "merged as" pairs written as a list, 7
test results, 5 commit ids made of digits only, 5 heads. Each of the 34 was checked by hand against the
transcript, the repository or GitHub. All 34 held. Paths were not listed by hand.

---

## Part 3. The reading

### 3.1 What the rate is

**On claims a script can recheck, the summaries on record are right.** 0 wrong of 2,727, with an upper
bound of 0.2 % to 2.6 % depending on how far claims in one summary go together. A summary names a median
of 24 claims of the seven kinds (1 to 65), and it copies them faithfully: of 714 commit ids, 713 are in
the session's transcript, 705 of them also in the repository, and the one left is a value the model
itself wrote earlier. What that shows is faithful copying. 2,617 of the 2,727 are commit ids and paths,
held when the identifier is on record. 110 (20 pull request states and 90 test results) check a value
against a state; none of those is wrong either, with an upper bound of 2.7 % (table C6) [E].

**On the latest state, most summaries are behind.** 74 of 117, 63.2 % (50.8 to 74.1 %). This is not the
summary making something up. The harness keeps the session's last messages verbatim, summarises only
what comes before them, and hands those messages over word for word beside the summary. What the summary
calls the next step is, more often than not, the very step the kept tail took.

**The lag cost nothing that this check could see.** 0 exact repeats in 117; plan updates, re-reads and
reworded messages were not compared.

### 3.2 Does it differ by fill and by model

**By fill: no difference shows; the 970k group (12 summaries) is too small to rule one out, and fill
and model coincide.**

- Claims: nothing wrong at any size. Inside Fable alone, 0 of 76 under 400k (2 sessions, too few), 0 of
  131 and 0 of 356 from the smallest windows to the largest.
- Latest state, like with like: 55.8 % at about 367k against 58.3 % at about 970k, 2.5 points apart with
  a range of −31.9 to +32.3 points. 86 summaries stand on one side and 12 on the other, so a real
  difference of 20 or even 30 points could sit inside that range.
- The two groups are also different models: Opus at about 367k, Fable and Sonnet at about 970k. Inside
  Fable alone no summary under 900k was written when the boundary fell (2.7), so one model cannot settle
  it either.

**The size bands mislead if read as a scale.** The two bands that read 100 % (under 300k, and 400k to
900k) are not fuller or emptier windows that summarise worse. They hold 17 summaries, 16 of them
prepared ahead while the session was idle; the 17th (758k, written when the boundary fell) is overtaken
as well. The harness keeps the session's last messages verbatim (the boundary
marker names them as a preserved segment) and summarises only what comes before them. A summary prepared
while the session is idle is written after the turn's closing message, but that message is the head of
the preserved segment, so the summary is always behind by it. All 18 were written after their first kept
message (table A5). Size has nothing to do with it.

**By model: what differs follows from the same thing.** Opus is behind in 56.3 % of its hand-overs, Fable
5.2 in 76.5 %, Sonnet in 6 of 6. But 1 of the 87 Opus summaries was prepared ahead, against 17 of the 30
on the other models (table section A5). The model groups are too small, and too tangled with that, to
say more.

**By project** the clinic testbed is behind more often: 79.2 % (60.2 to 90.5 %) against 52.2 % (36.6 to 67.4 %).
The read did not look for why.

### 3.3 The two hand-checked cases under this measure

Both are in the count (table section G).

| | first (971k, Fable 5.1, written at the boundary) | second (580k, Fable 5.1, prepared 396 minutes ahead) |
| --- | --- | --- |
| hand check of 1 November | wrong about the latest commit state, corrected by the kept tail | wrong about the closing message, corrected by the kept tail; dropped an open loop |
| claims a script can recheck | 0 wrong of 14 | 0 wrong of 10 |
| latest state | overtaken: a commit and a push | overtaken: the closing message |
| repeated by the next window | no | no |

So "2 of 2 wrong on the latest state" was a true reading of an ordinary case. It is the 63.2 %, seen
twice. And both were, as the hand check itself said, corrected by the kept tail. Neither would have
shown under the measure part 2.5 names, because neither failure is a claim that names a path, a commit,
a pull request or a test result: one says work is not yet committed, the other says a message is not
yet written. The dropped open loop of the second case is in no measure here.

### 3.4 What the script cannot see

- **Prose that names nothing.** What was decided and why, what the owner asked for, what is still open.
  The hand read covered only the last three sections against the kept tail.
- **What a summary left out.** Nothing here counts an omission.
- **Whether the next window acted on a stale statement** in some way other than redoing a call word for
  word. The repeat check is a floor.
- **Whether the next window's first plan update carried an item the kept tail had finished** (80 of 117
  first steps are plan updates).
- **Three kinds of claim.** Head, merged as and count carry no rate. In prose a script cannot tell "the
  branch is at this commit" from "merge the branch at this commit" often enough.
- **Anything, without a reader.** The script's 84 flags were 84 mistakes. A rate from a script alone
  would have been 2.6 %, then 0.4 %, and wrong both times. Any later use of this measure needs every
  flag read.
- **Thinking.** Some transcripts do not keep the model's thinking. A name found nowhere in the
  transcript can still come from a plan the transcript does not show; the one such case was a plan.

### 3.5 What this says about the live trial

SPLIT-RULE 6.3 and 6.4 already replace part 2.5's measure. Part 2.5 of the split-rule record had made
hand-over fidelity the trial's main measure: wrong claims that name a path, a commit, a pull request or
a test result, over claims checked, for briefs in one arm and summaries in the other. Its part 6.3 then
ran a scripted check of its own over 61 summaries and reached this record's first conclusion on its
own: on what a script can recheck, the summaries leave nothing for a brief to improve. Its part 6.4
makes the main measure a reader's check of the latest state and of dropped open loops. The owner has
since said yes to one trial wave at the 300k line.

**What this record adds for 6.4.** Arm B's hand-over is the summary plus the kept tail plus the git
status. A statement contradicted only by the kept tail should be marked "overtaken in the kept tail"
and reported apart from wrong. This record's 74 of 117 is the summary-alone figure (one reader, last
three sections only). Dropped open loops are not measured here. Part 6.4 as revised on 14 November
takes these points up, and leaves to the owner which count scores the trial.

**On claims a script can recheck, a trial cannot show a difference at any size.** The summaries' rate
is 0 of 2,727. A brief cannot be wrong less often than that. Both arms would score about nothing wrong
and the result would say nothing about the rule.

**On the latest state, scored on the summary alone, a brief wins by construction.** A summary is behind
its own hand-over 63.2 % of the time. A brief is written by the session as its last act, with nothing
kept beside it, so the same lag cannot arise the same way. How many hand-overs per arm it would take to
show that, at 5 % two-sided and 80 % power (table section H), on the summary alone, which favours a
brief by construction [E]; the last column multiplies by the design effect of 1.883:

| if a brief is overtaken | rate | hand-overs per arm | with several from one session |
| --- | --- | --- | --- |
| as often as the lowest band with five sessions (300k to 400k) [E] | 56.8 % | 910 | 1,714 |
| half as often as a summary [G] | 31.6 % | 38 | 72 |
| almost never, because it is the session's last act [G] | 5 % | 10 | 19 |

The ten per arm that part 2.5 names is enough only for the last row. The first row is the stand-in 1.7
fixed, and it shows why that stand-in does not fit: the lowest band is still a summary with a kept tail.

**But the lag comes from how the harness builds the hand-over, and its cost beyond exact redos (0 of
117) is unmeasured.** The harness hands the tail over and says the summary may be behind it, and in 117
hand-overs the next window never redid, word for word in its first six steps, what the tail had done. A
trial that shows briefs are behind less often would show something true and beside the point, unless
the stale pending list reaches the next window's plan, which was not checked.

**What is left for the rule's case on hallucinations** is what this check could not see: what a summary
leaves out, whether its account of decisions and reasons is right, and whether windows after a
compaction make more mistakes than windows before one. The last can be counted on the record with no
agent runs, in the measures part 2.5 lists beside the main one: review send-backs, corrections and
reversals, against where the last boundary fell. That is the count that would say whether there is a
problem for a brief to fix. It was started on 14 November in `docs/program/AFTER-COMPACTION-2026-11.md`;
its result is not in this record.

So, for the owner:

- Among claims a script can recheck, none is wrong (0 of 2,727, mostly paths and commit ids found in
  the summary's own input). But 74 of 117 summaries state as pending something already done at the
  hand-over; the kept tail carries the correction. No difference by fill was found, on 12 summaries at
  the larger size. The evidence that started this (2 of 2) is that lag.
- A trial that scores the latest state must score what the next window received: in arm B the summary
  with its kept tail and the git status, in arm A the brief with its key row. A statement contradicted
  only by the kept tail is marked "overtaken in the kept tail", not wrong (as 1.2 defines "as
  written"). Scored on the summary alone, a brief wins by construction (the table above). Scored on the whole
  hand-over, this record gives no measured reason to expect many wrong latest-state statements in arm
  B, so open loops dropped (not measured here) is the likelier separator.
- The cheaper step first is the count of mistakes after a boundary against mistakes before one, on the
  transcripts already on record.

### 3.6 Limits of this check

- One reader made every hand verdict in the counts: 84 flags (76 different claims), 129 sampled held
  claims, 117 kept tails, 34 missed claims. The check of this record then read a part a second time,
  blind. Of 30 kept tails in hash order the two readers agree on 28, and both misses were overtaken
  cases, so 74 of 117 is more likely a few too low than too high. Of 35 flags none was wrong. With the
  11 of the next point, 40 kept tails have had a second reading and 77 have had one reader. The tail
  read is a judgement on prose, and its verdict "overtaken" turns on what counts as the summary naming
  a step.
- 11 of the 117 summaries come from one long session (fixflow-423aac92). They were judged overtaken in
  2 of 11, against 72 of 106 for the rest. A blind second reading of those 11 agrees on 9. The two this
  record left unclear it calls overtaken, both as close calls, which makes that session 4 of 11 on that
  reading. So the session's low rate is real and comes from what its kept tails hold (seven hold only
  reads), not from the reading. With those two read as overtaken the total would be 76 of 117; this
  record keeps 74 as reported.
- The 2,727 are dominated by file paths (1,904) and commit ids (713). For a path, "held" means the path
  is real, not that the change the summary describes was made. For a commit id, held means it is in the
  session's transcript or the repository, not that what the summary says about it is true.
- The script's class for a call that changes state under-reports (2.3). The counts that lean on it (39
  tails, 32 of them overtaken) are floors, and the repeat check was widened for that reason (2.8).
- The first count failed its own test and the script was repaired after its flags were read. The
  repairs are listed and each claim it marks wrong was read again, but a second count is not a blind
  one.
- 12 summaries at the default trigger, from 7 sessions.
- FixFlow and the clinic testbed only. 8 summaries in the owner's other projects are not here.

---

## Part 4. What the compile should pick up

Nothing in the compile's data files was edited. These are the three rows named in the task.

**PR-HALLU, "No hallucination rate is measured".** There is now one rate with a denominator, for one
kind of statement in one kind of document.

- Evidence to add: *In 117 compaction summaries, 0 of 2,727 claims that name a commit, a path, a pull
  request state or a test result were wrong [M, hand]; under 0.2 % claim by claim, under 2.6 % summary
  by summary (one-sided 95 % upper bounds) [E]. 2,617 of them are commit ids and paths, held when the
  identifier is on record; 110 check a value against a state [M]. A script alone raised 84 flags over
  76 claims and every one was its own mistake [M, hand].*
- What stays open: reports, pull request bodies and review verdicts, where the 20-plus overstatements
  were caught; prose; anything per session or per window fill beyond this.
- First step, changed: run the same check on agent reports and pull request bodies, with every flag
  read by hand. The script is `docs/program/evidence/summary-check/check.js.txt`.

**PR-SUMMARY, "Compaction summaries misstate the latest state".** The two cases are the ordinary case:
the summary is behind its own kept tail, and the same hand-over carries the newer state.

- Evidence to replace "2 of 2": *74 of 117 summaries (63.2 % [M, hand], range 50.8 to 74.1 % [E]) were
  behind their own hand-over on the latest state. Blind second readings agreed on 28 of 30 hand-overs in
  hash order and on 9 of the 11 of one session; where they end up differing from the count (the 30
  after adjudication, the 11 as the second reader read them) they have the hand-over as overtaken (one
  of the 30 and two of the 11), which would make it 76 or 77 [M, hand]. The lag comes from how the harness
  builds the hand-over (it keeps the last messages verbatim and summarises what precedes them); 9 of
  117 summaries described their tail all the same [M, hand]. All 117 summaries end with the harness's line saying they were written without the
  kept messages [M]. All 18 summaries prepared ahead of the boundary were behind; they were prepared a
  median 65 minutes and up to 396 before it [M]. In 0 of 117 hand-overs did the next window redo, word
  for word in its first six steps, what the kept tail had done [M]; plan updates, re-reads and reworded
  messages were not compared.*
- Name, suggested: "Compaction summaries lag their kept tail; the hand-over carries the newer state".
- What stays open: one of the two hand-checked summaries dropped an open loop. Omissions are not
  counted anywhere. Whether a stale pending item reaches the next window's plan is not checked.
- First step, changed: count what a summary leaves out, by listing the open items before a boundary and
  after it.

**TK-FILL, "Judgement against window fill is unmeasured".** Still unmeasured. What a summary gets wrong
did not differ measurably with fill on this record.

- Evidence to add: *Summaries written at about 367k and at about 970k are behind the latest state at
  similar rates, 55.8 % and 58.3 % [M, hand], 2.5 points apart with a range of −31.9 to +32.3 points
  [E]; 12 summaries at the larger size are too few to rule a difference out, and the two groups are
  different models (Opus against Fable and Sonnet). Nothing was wrong among claims a script can recheck
  at any size [M, hand]. 18 of 117 compactions were prepared while the session was idle, at sizes from
  205k to 894k: their size reflects idleness, not fill [M].*
- First step, unchanged: log context use at each phase close (TOK-34) and peak context where a session
  reversed itself (MSR-43). A count of mistakes after a boundary against before one, on the record, is
  the nearer step.

**For PAR-22 and WP12** (not asked, and it follows): parts 6.3 and 6.4 of
`docs/program/SPLIT-RULE-2026-11.md` already replace part 2.5's measure. What this record adds for 6.4:
arm B's hand-over is the summary plus the kept tail plus the git status, and a statement contradicted
only by the kept tail should be marked "overtaken in the kept tail" and reported apart from wrong. This
record's 74 of 117 is the summary-alone figure (one reader, last three sections only). Part 6.4 as
revised on 14 November says so, and leaves to the owner which count scores the trial (3.5).
