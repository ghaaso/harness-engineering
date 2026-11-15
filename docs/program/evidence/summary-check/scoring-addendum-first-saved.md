<!-- Section 1.9 of docs/program/SUMMARY-CHECK-2026-11.md exactly as first saved: after the first count and its hand read, before the kept tail of any summary had been listed or read and before the second count. Saved 2026-11-14T09:01:38.602Z. sha256 of the text below this line: 3b8d57b1427c75cdf5c0c5c0988244954468993ccf7da73aefe33e39edf7b4c4 -->
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

