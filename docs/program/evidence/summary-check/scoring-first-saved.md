<!-- Part 1 of docs/program/SUMMARY-CHECK-2026-11.md exactly as first saved, before the extraction and checking stages of check.js.txt existed. Saved 2026-11-14T08:42:06.710Z. sha256 of the text below this line: b5bff48d623d54362efd37ac3fb63156908c92d2006c7f7d07fa719671e9e7e7 -->
## Part 1. The scoring, fixed before any claim was counted

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
