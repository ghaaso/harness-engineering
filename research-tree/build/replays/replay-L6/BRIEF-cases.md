# Brief for the case builders of replay-L6 (read: Sonnet)

Read first: `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/replays/replay-L6/SCORING.md`
(the rules you build to; do not change it). Your group of findings is named in your start message.

`CLINIC` = `C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop` (a git repository; read-only: use
`git -C CLINIC show <commit>:<path>`, `git -C CLINIC log`, `git -C CLINIC grep`; never checkout, worktree, stash,
commit or anything that writes). The board is `CLINIC/docs/tasks/clinic-build/task.md`; each finding's line is in the
list of A2-05 / A2-06 (`C:/Users/User/Documents/projects/harness-engineering/docs/program/evidence/harness-bottlenecks/sweep.json`,
search `"id": "A2-05"` and `"A2-06"`). Slice session transcripts: `C:/Users/User/.claude/projects/C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop*/`
(the board names each slice's branch, e.g. `claude/distracted-blackwell-f1bd1a` is the folder `...--claude-worktrees-distracted-blackwell-f1bd1a`).
Transcripts are large: search them with grep or a short node script for the last assistant text; never Read one whole.

Write only under `C:/Users/User/Documents/projects/harness-engineering/research-tree/build/replays/replay-L6/cases-src/`.
Nothing goes to the network. No commit. Keep each foreground command under 150 s.

## For each overstated finding in your group
1. Read the finding on the board (its line, the gate it belongs to, the commit the gate reviewed: "branch ... at `<sha>`").
2. Find the worker's report text that made the claim the finding says was overstated: the slice's task record
   (`docs/tasks/<slice>/task.md`) or its evidence file, at the commit the gate reviewed (round 1: the "at `<sha>`" of the
   gate; a later round: the fix commit the round reviewed). If the claim is in a test or code comment only and in no
   report text, drop the case and say why.
3. v1.md: that section verbatim from that commit, at most about 120 lines, starting with one line
   `Report: <slice> <file name>` (no commit hash, no finding id, no gate text, nothing written after that commit).
4. v2.md, the first that exists (SCORING.md "Version 2"): (a) the same file at an earlier commit where that section's text
   differs; (b) the same claim in another text the same worker wrote for the same round before the gate (the slice
   session's closing message to its caller in its transcript, or its check-summary / evidence file at that commit);
   (c) none. Same form and limits as v1.md. If (c), write no v2.md.
5. meta.json: `{"finding":"G02-02","class":"overstated","board_line":149,"claim":"<one sentence quoting or closely
   paraphrasing the report's claim, neutral wording, no verdict>","v1":{"file":"...","commit":"...","lines":"a-b"},
   "v2":{"source":"a|b|c","file_or_transcript":"...","commit_or_line":"..."},"note":"..."}`.
   Folder: `cases-src/<finding id>/` (e.g. `cases-src/G02-02/`).

## Accurate controls (as many as overstated cases you kept)
From the same slices and rounds, claims in the same reports that the record shows held: the gate text says its refute
reviewers "held up" it, or an executed check confirmed it (e.g. a lock-removal run recorded as failing without its
guard and accepted by the re-review), and no later board finding contradicts it (grep the board for its subject).
Prefer one accurate claim from the same report as each overstated claim. Same files as above, class "accurate",
finding = `OK-<slice>-<n>`, board_line = the line that shows it held.

## Blinding
v1.md and v2.md must not reveal the verdict: no finding ids, no gate or reviewer text, no later notes such as
"recorded as proving serialization only". The claim sentence in meta.json must read the same way for both classes.

## Return (at most 10 lines)
Cases kept per class, dropped findings with one-line reasons, v2 source counts (a, b, c).
