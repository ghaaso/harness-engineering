# replay-L8: lint gate and type checker after each edit (sink S2), result

**Answer.** Claude Code's own edit diagnostics never ran here: 0 diagnostics lines after 30,336 Edit/Write calls in 4,443
transcripts. The clinic's own ruff + mypy (strict) flagged **0 of the 10 located fix-made defects** (0 of 9 defect-making
commits); on the other side they flagged 2 of 84 fix commits that made no recorded defect (2.4 %) and 7 of 256 commits
overall (2.7 %), all style or typing slips, none a defect. By the scoring written first: **do not pilot L8 on S2 here.**

Status: LIMIT reached (10.50 M of 10 M at the last count) after all counts were done; this file and records.md were
written after it. Nothing is left running.

## Counts

| Part | Project | Counted | Result | Denominator |
|---|---|---|---|---|
| A diagnostics | clinic | edit-diagnostics lines | 0 | 4,727 edit calls, 547 transcripts |
| A diagnostics | FixFlow | same | 0 | 17,578 edit calls, 2,163 transcripts |
| A diagnostics | this repository | same | 0 | 3,211 edit calls, 326 transcripts |
| A diagnostics | research run | same | 0 | 839 edit calls, 302 transcripts |
| A diagnostics | other folders | same | 0 | 3,981 edit calls, 1,105 transcripts |
| B gate replay | clinic | located defects flagged | 0 of 10 (P1 0 of 4, P2 0 of 6) | 15 defects in S2's lower bound |
| B gate replay | clinic | defect-making commits with any new flag | 0 of 9 | 7 touch Python, 2 shell only |
| B gate replay | clinic | control fix commits with any new flag | 2 of 84 (2.4 %), 3 flags | fix commits, no recorded defect |
| B gate replay | clinic | all commits with any new flag | 7 of 256 (2.7 %), 21 flags | non-merge commits with a run parent |
| side count | clinic | tool results showing mypy / ruff errors | 174 / 73 (31 of 547 transcripts) | 31,177 tool results |
| side count | FixFlow | tool results showing tsc / mypy / eslint errors | 35 / 11 / 14 (29 of 2,163 transcripts) | 106,434 tool results |
| side count | this repo, research run | same | 0 | 17,944 and 9,692 tool results |

Located defects and their commits (board line, then git): S01 V1, V2 in 0dead1a (clinic-build/task.md:102); S02 V1 in
a971319 (:170); W1 in 06754a0 + 91fb5c0 (:258); S06 inert price check in 5d7be0f (:342); PQ-01, PQ-02 in 9db22c3
(:751, "Post issues under the medicine's own bill mode"); GD-01 in c1fb346 (opening-cutoff-guards/task.md:63, 71);
GV-01, GV-02 in b6b510d + 2fe142f (s11-operations/task.md:276-277; shell scripts, which ruff and mypy do not read).
Not located (5): RR-1, RR-2, RR-3, RS-1 and S11 P2-1 were made and fixed inside one uncommitted round ("all fixed
before the commit", opening-cutoff-guards/task.md:63, 81; s11 task.md:283), so no commit holds them.
Flagged control and other commits: 55ec9b3 (mypy var-annotated, attr-defined in tests), 232b202 (ruff E501), d460c0a
(E501; it fixes PQ-01/02), 9774a91 (mypy arg-type etc.), f98e351 (mypy import errors), f709f60, fb306d7 (format).

## How it was counted
- Part A: `diag-scan.mjs` over every `.jsonl` under `~/.claude/projects` (helpers included, this replay excluded): an
  attachment of a diagnostics type, or `<new-diagnostics>` / `<diagnostics` text, or an IDE getDiagnostics call. Two
  false classes were found and removed before the final run, outputs kept: the API field `"diagnostics":{"cache_miss_reason"}`
  (`diag-scan.first-run-cache-miss-false-positives.json`) and workflow notices "<diagnostics>Per-agent results"
  (`diag-scan.second-run-workflow-notices.json`; 879 notices, not edit feedback). Final: `diag-scan.out.json`.
- Part B: `gate-replay.mjs` extracts each commit's `pyproject.toml`, `src`, `scripts` by `git archive` (read-only) and
  runs the clinic's own `.venv` ruff 0.13.3 and mypy 1.19.1 (strict, django-stubs) with that commit's own config and its
  own `.env.example`, a fresh mypy cache per tree. 317 trees: the 229 non-merge commits of 1-11 November touching
  Python, their parents, and the defect and fixing commits not reachable from a branch (06754a0, 91fb5c0, 5d7be0f,
  8ba7897) or not touching Python (2fe142f, ec413dc). `analyse.mjs` keeps flags present at a commit and absent at its
  parent (file, code, message; line ignored) in files the commit changed. `gate-replay.out.jsonl`, `analyse.out.json`.
- A first pass with one shared mypy cache was invalid (stale plugin dependencies: 101 trees failed on a module they do
  not hold); kept as `gate-replay.pass1-shared-cache-INVALID.jsonl`, not used. 3 trees have no `src` (mypy: no target).
- No defect-line test was needed: no defect-making commit had any new flag.
- Side count: `checker-output-scan.mjs`, tool results whose text matches mypy, ruff, tsc or eslint error lines; an upper
  bound (a grep or read of a log holding such lines also counts).

## The seven measures
- Quality and hallucinations: no effect on S2 measured here (0 of 10). The defects are wrong rules (a hold that never
  ends, a cutoff compared on the wrong date, a test that leaks state, an inert check); they type-check.
- Throughput, time, tokens: the side count says where a per-edit gate could act: type and lint errors the agents met in
  check output (clinic 247 results in 31 transcripts, FixFlow 60 in 29). Moving them from the check to the edit could
  save check reruns; their tokens and seconds were not measured. Every committed state already passed the project's
  check, which runs ruff, ruff format and mypy strict (src/clinic/devtools/check.py:752-754); 2.7 % of commits carried a
  slip that the gate's check then caught.
- Token cost: not applicable (no run of a model).

## What was not tested
- Edit-level states inside a commit; the 5 unlocated defects lived only there (rebuilding them from Edit calls in the
  transcripts would be the next measure if wanted).
- Shell: GV-01, GV-02 are in deploy scripts; no shellcheck on this PC; nothing installed.
- tsc: no S2 defect is in TypeScript; FixFlow has no counted fix-made defects. Other projects, weaker models, or a
  project with no strict checker in its gate may differ: this is a result on one project that already gates on mypy strict.
- The checkers at the versions now in the venv, not at the versions of each date (pyproject pins the same ranges).

## What it changes next
Drop L8 as a quality lever for S2 on this project; do not pilot (scoring rule: 0 hits). If a lever for the edit-to-check
loop is wanted, measure first the tokens and seconds of check reruns caused by type and lint errors (the side count gives
the sessions to read). The quality budget goes to L11 and L6, which act on the kind of defect seen here.
