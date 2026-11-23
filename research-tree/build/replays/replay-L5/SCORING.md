# replay-L5 scoring (written 2026-11-23, before any count)

Lead L5 (write-time invalidation of held reads), with L4's count inside the same scan. No model run.

## Records in
- Every `.jsonl` transcript under `C:/Users/User/.claude/projects/` in four project groups, each reported apart:
  - harness: folders whose name contains `harness-engineering` (this repository, its library and probes);
  - run: `C--research-runs-2026-11-harness-leads`;
  - fixflow: folders containing `EMS-workshop1` and the OneDrive `23-FixFlow` folder (as in `evidence/token-spend/run.sh`);
  - clinic: folders containing `Clinic-Workshop`.
- Out: every other folder (scratch workspaces, coursework, other projects). Main session files and helper files
  (`<session>/subagents/*.jsonl`) are both in.

## Unit: the window and the held read
- A window = one transcript file, cut into segments at each `compact_boundary`. A read is held from its result until the
  segment ends (compaction or the file's last call). Calls = assistant messages with usage, once per message id.
- A read = one tool result that brings file content into the window:
  - `Read` (path, offset, limit);
  - `Grep` in content mode (paths named in its output lines); other Grep and Glob results are path lists: counted as
    fetched tokens, never as stale (a path list is not falsified by an edit of the content);
  - a shell command (Bash or PowerShell) whose first verb reads a file (cat, head, tail, sed, Get-Content, type, nl, less,
    git show/diff of a path) with one path in it.
- An edit = `Edit`, `MultiEdit`, `Write`, `NotebookEdit` on a path, with its timestamp, from any window in any group.
  Shell writes (redirection, `sed -i`, scripts) are not seen: a known undercount of edits, stated in the result.
  The harness's own `edited_text_file` notice (a file changed on disk since the window read it) is recorded per window.
- Paths compared lower-cased with `\` turned to `/`. Worktrees are different files.
- Tokens of a result: its characters divided by a chars-per-token ratio calibrated in the same scan (context growth
  between two calls with only tool results between them, divided by those results' characters). Shares do not depend on
  the ratio; absolute token figures do and say so.

## What is counted (the scan produces each, by group)
1. **Stale read (L5)**: a held read of file F, after which an edit of F happens (timestamp after the read, before the
   read's segment ends).
   - file level: any edit of F;
   - range level (the source's sense, stricter): the edit is a `Write`, or the edit's `old_string` occurs inside the read's
     text, or the read was a whole-file Read.
   - Who edited: `same` (an Edit call in the same window), `helper` (a helper of the window's session), `parent` (the
     main session of the helper's session), `sibling` (another helper of the same session), `other` (another session).
   - Visible or not: an edit by `same` is visible in the window (its own call). An edit by anyone else is invisible
     unless the window got an `edited_text_file` notice for F after it; counted apart.
   - Figures: stale read tokens as a share of all read tokens (each once), and carried: tokens x later calls in the
     segment after the edit, as a share of all read tokens x calls carried. Calls carrying each stale read: count and median.
2. **Read never needed by a later edit** (source: 73.4 % of held tokens): a read of F with no later edit of F by the
   same window in its segment. Share of read tokens, once and carried; also on windows that make at least one edit.
3. **In-window re-fetch (L4, S14 says 0.5-1.5 %)**: a read whose result text is identical (hash) to an earlier result
   still held in the same segment, with no known edit of the file between. Tokens, as a share of read tokens and of all
   context tokens of the group (sum over calls of input + cache write + cache read). Harness stubs ("file unchanged")
   counted apart as already saved.
4. **Cost of a drop (C130 of f4b)**: for each stale read, dropping it at the first call after the edit makes every token
   after it in the window a cache write. Rewrite = context of that call minus context just before the read's result.
   Saving = read tokens x calls left after the drop. Both in tokens; then on the meter with a cached re-read = 0.01 of a
   fresh token and a write = 1.25 (and 2.0) fresh tokens (S17). Net saving summed per group, and the share of stale reads
   whose drop saves more than it costs.

## Hit and miss
- A hit for L5 = a stale read at range level by an edit the window does not see (helper, parent, sibling, other,
  with no `edited_text_file` notice). Own-edit staleness is reported but is not a miss of today's harness: the edit and
  its result are in the window (the source's C12 condition).
- A false alarm for a file-level mechanism = a file-level stale read that is not range-level (the edit touched text the
  read did not hold). Reported as the share of file-level stale reads that are not range-level.

## Do not pilot if
- invisible range-level stale reads are under 1 % of read tokens carried in every group, or
- dropping stale reads costs more on the meter than it saves (net below zero at 1.25x) in every group,
- and re-fetch (L4) is under 1.5 % of context tokens in every group (then L4's state view has no ceiling here).
A pilot is indicated only if invisible stale reads are 1 % or more of carried read tokens in a group AND the drop's net is
positive there, or the quality side (invisible stale reads followed by an edit of the same file in the same window,
counted as "acted on stale") is 1 % or more of edits.

## Added after the first counts (rule 3: old lines kept)
- Item 3 (re-fetch) as written counts identical result text only. After the first run showed almost none, two looser
  counts were added, not replacing it: a Read whose line numbers overlap a held earlier Read of the same file with no
  edit between (share of the overlapping lines' characters), and an upper bound, any second read of a held file with no
  edit between (mostly paging through different ranges). Reason: S14's 0.5-1.5 % may count overlapping ranges, not only
  identical text; the do-not-pilot line is judged on the overlap count, which is the larger of the two real re-fetch counts.
- Pass 1 at first read edits from `api-request-blob` lines too (request copies without timestamps), which hid edits; it
  now reads only assistant and user lines. Counts in RESULT.md are from the fixed scan.
