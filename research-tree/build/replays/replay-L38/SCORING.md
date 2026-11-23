# replay-L38: scoring, fixed before any count (2026-11-23)

Lead L38 (RUN:closing/HAND-BACK.md line 562): cache model-made conclusions with their premises; withdraw a stored
conclusion when a recorded premise changes. Its unknowns (C133, C132 of f4b): how often a recorded conclusion comes
back, and whether the premises a tool trace records cover the ones the answer used. Sink S19 (reading load, SHEET.md
line 25) and S5.

## Unit of count
A **sub-task** = one helper (a `subagents/*.jsonl` transcript with its `.meta.json`): its brief (first user message),
its report (the SubagentHandback message, else the last assistant text), its tool trace, its tokens.
Tokens of a helper: per call, once per message id, input + cache creation + cache read + output (total), and
input + cache creation + output (fresh), as `RUN:tools/lib.mjs` countFile does.

**On record** for a later helper H2 = (a) an earlier helper H1 in the same project group whose transcript ended before
H2's first line, or (b) a library journal record (`H:library/journal/<date>/*.jsonl`, `RUN:journal/`) whose folder
date ends before H2 started (harness and run groups only).

## Project groups (records in, out)
- harness: transcript folders `C--Users-User-Documents-projects-harness-engineering*`.
- run: `C--research-runs-2026-11-harness-leads*`.
- FixFlow: `*EMS-workshop1*`, `*20-PROJECTS-23-FixFlow*`.
- clinic: `*24-Clinic-Workshop*` (both roots and worktrees).
- Out: scratch, downloads, Codex and probe folders other than the above; main-session (non-helper) work; the owner's
  typed questions. harness and run are also paired across each other (the run reads the harness's records), reported apart.

## Candidates
For each H2, the earlier on-record item with the highest TF-IDF cosine between H2's brief and that item's
brief+report (helper) or claim (journal record); words lower-cased, 3+ characters, IDF over all briefs and records of
all groups. Bins of the best cosine: [0.9,1], [0.8,0.9), [0.7,0.8), [0.6,0.7), [0.5,0.6), and a control bin [0.3,0.5).

## What decides a hit (a return)
A blind Opus judge (`analyse: replay-L38 judge`, not told the cosine or the bin) reads H1 brief + H1 report (or the
record) and H2 brief + H2 report, each cut to its first 1,800 characters, and gives one class:
- **R whole**: H2's question was answered by H1's report / the record, and H2 worked it out again (not told to take it).
- **R part**: a named part of H2's question was so answered and worked out again.
- **C**: H2 was told to use, continue, fold or repeat H1 (successor, fold, rerun asked for): deliberate, not a return.
- **V**: H2 is an independent check of H1 by design (refuter, reviewer, judge): a cache must not skip it; not a return.
- **D**: a different question.
For R: does H2's conclusion agree with H1's (same / changed / cannot tell)? "changed" = the stored answer would have
been stale by then.
Sample: up to 12 pairs per bin, drawn at random with a fixed seed (1729), spread over groups in proportion.
Return rate per bin = (R whole + R part) / judged; estimated returns = sum over bins of bin size x bin rate; pairs
below 0.3 counted as no return (stated as a floor of the estimate).
Tokens of a return: H2's tokens; R whole counted in full, R part reported separately (an upper bound).

## Premises (for the R pairs)
Trace premises of a helper = files its tools named: Read/Edit/Write file_path, Grep/Glob path, NotebookEdit path, and
absolute paths in Bash/PowerShell commands. Used premises of H2 = its trace files that its report names (by base name);
if the report names none, all its trace files.
- **missed**: used premises of H2 not in H1's trace, as a share of H2's used premises.
- **over**: H1 trace files not in H2's trace, as a share of H1's.
- **file-level invalidation fires** when a file of H1's trace was the target of an Edit, Write or NotebookEdit call in any
  transcript of the group between H1's end and H2's start. Scored against the judge's "changed": fires & changed = caught;
  fires & same = false alarm; not fires & changed = missed staleness. Fact-level invalidation is not built here.

## What would mean "do not pilot"
Either: estimated R-whole tokens under 1 % of all helper tokens in every group with at least 50 helpers; or the traces
miss over half of the used premises in the median R pair (a premise check could not be trusted). Between 1 % and 5 %:
pilot only where the rate is highest. Over 5 % in any group: pilot there.
