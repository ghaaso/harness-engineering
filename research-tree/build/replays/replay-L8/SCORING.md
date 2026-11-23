# replay-L8: scoring (written 2026-11-23 before any count)

Lead L8: a lint gate and a type checker run after each edit (HAND-BACK.md:112-125). Sink S2: fixes that create defects
(SHEET.md:8, HARNESS-BOTTLENECKS-2026-11.md:143). The records of S2 are the clinic build's (CL); FixFlow, this
repository and the research run have no counted fix-made defects, so the defect side is clinic only.

## Part A: do Claude Code's own diagnostics already run on edits here?
- Counted: transcript lines (all `.jsonl` under `C:/Users/User/.claude/projects/*/`, helpers included) that carry
  Claude Code's diagnostics feedback: an attachment or reminder of type diagnostics / `new-diagnostics` /
  `<new-diagnostics>` text. Unit: lines, and sessions holding at least one. Denominator: Edit/Write/MultiEdit tool calls
  and sessions with at least one such call. By project folder group: clinic, FixFlow (EMS_workshop1), this repository,
  other.
- Answer "yes, already runs" if diagnostics lines follow edits in any project; "no" if zero lines in all transcripts.

## Part B: replay of the fix commits through the checkers the project already has
- Project and checkers: the clinic repository (Python, Django) with its own `.venv` (ruff 0.13.3, mypy 1.19.1 strict with
  the django-stubs plugin, its `pyproject.toml` config). No tsc: no S2 defect is in TypeScript. Nothing installed.
- Defect set (the S2 lower bound, fix-and-merge.md:19): 5 P1 (W1, GD-01, RS-1, GV-01, GV-02) and 10 P2 (S01 V1, S01
  V2, S02 V1, S06 inert price check on a first invoice, RR-1, RR-2, RR-3, PQ-01, PQ-02, S11 P2-1). Side set reported
  apart, not in the headline: the incomplete fixes G05-01, G10-05.
- Defect-making commit: the fix commit whose diff introduced the defect, located from the board text (the slice's
  task.md) and git history (message, date, files of the later finding). Each located commit is recorded with how it was
  located. A defect whose commit cannot be located is listed as "not located" and leaves the denominator.
- Defect lines: the lines changed by the commit that later fixed the defect (in files the defect-making commit also
  touched), or, if that is not separable, the files the finding names.
- Gate output per commit: `ruff check` and `mypy` (project config) on a clean extract of the commit's tree (git archive,
  read-only on the repository) and of its first parent. New flags = diagnostics at the commit not present at the parent
  (matched on file, rule code and message text, line ignored), restricted to files the commit changed. `ruff format
  --check` is reported apart (a format finding cannot be a defect).
- Hit: a defect counts as flagged if at least one new flag of its defect-making commit falls on a defect line (within
  3 lines) or its message names the defect's mechanism. A new flag elsewhere in the same commit is "flag, not on the
  defect" and is not a hit.
- Like with like, the other side: control set = every other fix commit of the same slices in the same period (message
  or board marks it a fix of a review finding) that no record links to a new defect. False flag = a control commit with
  at least one new flag. Report the share of control commits flagged and the flags per commit, and the same for the
  defect-making commits.
- Per-edit against per-commit: a commit holds several edits; a flag present in the committed state is one a per-edit
  gate would also have raised at some edit; a flag fixed again before the commit is not seen here. Said in RESULT.md.
- The project's own check already ran ruff, ruff format and mypy strict at every gate (src/clinic/devtools/check.py:752-754);
  this is recorded, not assumed to settle the count.

## What would mean "do not pilot"
- Zero of the located defects flagged, or flagged at a rate not above the control commits' rate. Then L8 on S2 is
  dropped for this project; it is not ruled out for other languages, weaker models or projects without a strict checker.
- A pilot is worth sizing only if at least 3 of the located defects (20 % of 15) are hit and the control false-flag rate
  is under 20 % of control commits.
