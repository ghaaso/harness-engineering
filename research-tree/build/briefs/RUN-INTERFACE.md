# The research run: the fixed interface (top session 5, 2026-11-20)

Every brief and script of the run's preparation follows this file. It was fixed by top session 5 so that three helpers
can write their parts at once (r57-0006). A helper that finds a part of it wrong says so in its return and in a
"Against the interface" section of its file; it does not change the interface on its own.

`H:` = `C:/Users/User/Documents/projects/harness-engineering/` (the design documents and the library; the run only
reads them). `RUN:` = the run root `C:/research-runs/2026-11-harness-leads/`.

## The run root (built and checked by top session 5)
- `RUN:` sits outside every repository and every folder with a CLAUDE.md or a `.claude/` above it, the path protocol
  v2 gives as its example (`H:docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` line 58); it is its own git
  repository (`git init`, nothing committed yet). `.gitignore`: `papers/`, `.snapshots/`.
- `RUN:.claude/settings.json` holds: the tier hook `H:.claude/hooks/tier-hook.mjs` (every Agent call), the record
  guard `H:.claude/hooks/record-guard.mjs` (Write, Edit, AskUserQuestion, Bash, PowerShell: questions to the owner
  start `approve:`, `cap:` or `fact:`; archived evidence and the journal of `H:` protected), and
  `CLAUDE_CODE_FORK_SUBAGENT=0` (r57-0157: a helper's own helpers run in the background). Tested from `RUN:` on
  2026-11-20: tier hook refuses `collect` on Opus, passes it on Sonnet; the guard refuses "Which option do you
  prefer?", passes `cap: ...`, passes a write in `RUN:` and a git commit there, refuses a write of
  `H:docs/program/evidence/round3-2026-11-18/ROUND.md`.
- Deviation from protocol v2 (line 58, "no CLAUDE.md"): `RUN:CLAUDE.md` exists, because on path e2 no session starts
  in a folder under `RUN:` (all workers are helpers in the coordinator's process), and the efforts of
  `H:research-tree/build/ROUTER.md` section 4 apply only once written in CLAUDE.md or a skill (ROUTER section 7).

## Layout
| Path | What | Written by |
|---|---|---|
| `RUN:CLAUDE.md` | the run's own instructions: models, efforts, rules; at most about 5 KB (every helper loads it) | helper A |
| `RUN:GO.md` | what the owner types and sets, both forms, in plain words | helper A |
| `RUN:DOWNLOADS.md` | what his go approves to download, with source and size; the rule-3 exception | helper A |
| `RUN:briefs/COORDINATOR.md` | the Fable coordinator's brief | helper A |
| `RUN:briefs/SHEET.md`, `PLANTED.md`, `CLOSING.md` | the briefs of the coordinator's other three helpers | helper A |
| `RUN:briefs/FIELD.md`, `RUN:briefs/field/<step>.md` | the field helper's brief (one for all seven fields) and its step templates | helper B |
| `RUN:tools/` | `tokens.mjs`, `wait.mjs`, `shuffle.mjs`, `gate.mjs`, their tests, `README.md` | helper C |
| `RUN:run/config.json` | cap, preparation tokens, expected and limit per unit (schema below) | values: helper A; preparation tokens: top session 5 |
| `RUN:run/STATE.md` | the coordinator's state: started, returned, failed, held, restarted; rewritten after each event | coordinator |
| `RUN:run/usage.log` | one line per gate decision, appended by `gate.mjs` | gate.mjs |
| `RUN:sheet/SHEET.md` | the problem sheet (direction lane 1): the sinks, ranked, every field scores against them | sheet helper |
| `RUN:planted/` | the planted copy of our files; `planted/INDEX.md` lists which files each field reviews; no key inside | planted helper |
| `RUN:sealed/` | `planted-key.json` (the plants per field) and `f<n>-arms.json` (the shuffles' keys); read only by the scorers and the closing helper (by brief: no hook enforces it) | planted helper, shuffle.mjs |
| `RUN:fields/<n>-<slug>/` | one field: `STATE.md`, its step files, `RETURN.md` (its ten lines), `DONE.md` written last | field helper |
| `RUN:journal/2026-11-23/` | the run's library records in the schema of `H:library/README.md`, for a later intake into `H:library/` by a top session; the run never writes `H:library/` | fields, sheet, closing |
| `RUN:closing/` | samples, folds, draft board, recall test, synthesis, the page's source | closing helper |
| `RUN:papers/<unit>/<short>/` | `paper.pdf`, `paper.txt` (git-ignored) | readers |

## Units, tags and record prefixes
The seven fields are the direction's lanes 2-8 (`H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` section 4); lane 1
is the problem sheet. Every helper's `description` is `<kind>: <unit> <words>`: the tier hook reads the kind, the
scripts read the unit (the first word after the colon). A helper of the closing helper that samples field 4 is
`read: closing sample of f4`, so its tokens count to `closing`.

| Unit | Lane | Folder | Record prefix | Extractor files |
|---|---|---|---|---|
| `sheet` | 1 Where the tokens, time and errors go | `sheet/` | `d1` | `x49` |
| `planted` | - (the planted copy) | `planted/` | - | - |
| `f2` | 2 Graphs and knowledge graphs inside coding agents | `fields/2-graphs/` | `d2` | `x50`-`x54` |
| `f3` | 3 Learned encoders on code, in their strongest form | `fields/3-encoders/` | `d3` | `x55`-`x59` |
| `f4` | 4 Memory, knowledge layer, time, caching | `fields/4-memory/` | `d4` | `x60`-`x64` |
| `f5` | 5 Neuro-symbolic methods | `fields/5-neurosymbolic/` | `d5` | `x65`-`x69` |
| `f6` | 6 The local card as a cost lever | `fields/6-localcard/` | `d6` | `x70`-`x74` |
| `f7` | 7 Orchestration structure | `fields/7-orchestration/` | `d7` | `x75`-`x79` |
| `f8` | 8 How to measure it in general | `fields/8-measurement/` | `d8` | `x80`-`x84` |
| `closing` | - (samples, board, recall test, synthesis, page) | `closing/` | `d9` | - |
No library record uses a `d` prefix or `x49` and above today (checked 2026-11-20). Record ids `d<n>-0100` onward as
`H:library/README.md` numbers them.

## Returns
- Every helper returns at most ten lines (under 2 K tokens; ROUTER section 4 row 1); detail goes to files.
- A field helper's return, and the same text in `fields/<n>-<slug>/RETURN.md`:
  line 1 `f<n> DONE|LIMIT|FAILED|HELD <one reason>`; line 2 `tokens <x> M of limit <y> M` (from `tokens.mjs f<n>`);
  then the report's path and its counts by verdict, the records written (file, count, failed checks removed), the F1
  pair (`run` or `not run: <why>`), and what is open. `DONE.md` is written last, after the commit.

## The scripts (helper C builds them; each prints one line and writes the rest to a file)
- `node RUN:tools/tokens.mjs <unit|run>`: tokens of the run's transcripts (input + cache creation + cache read +
  output, once per message id, as `H:research-tree/build/tools/tokens-self.mjs` counts), for every helper whose unit
  is `<unit>`, or for everything in the run (`run`: the coordinator's session and all helpers). Prints
  `<unit> <calls> calls <x> M tokens (<y> M fresh)`; the per-transcript table to `RUN:run/tokens-<unit>.txt`.
- `node RUN:tools/wait.mjs <unit> <seconds, at most 150> <file>...`: returns when every file exists or the time is
  up; prints `<unit> done <k>/<n> [missing: ...] | tokens <x> M of limit <y> M`. It is the only way a field helper
  waits on its own helpers, and it carries the token count, so no separate count call is made.
- `node RUN:tools/shuffle.mjs f<n> <review file> <review file>`: removes the arm names and any line that tells the
  arms apart, writes `fields/<n>-<slug>/score-in/review-1.md` and `review-2.md` in a random order, writes which is
  which to `RUN:sealed/f<n>-arms.json`; prints one line.
- `node RUN:tools/gate.mjs <unit> --all <percent> --fable <percent>`: the gate before every start (the two readings
  are the coordinator's `get_usage` of the same turn). Prints `START <unit>: ...` or `HOLD <unit>: <why>` and appends
  the line to `RUN:run/usage.log`. The rule (PILOT-PLAN.md version 2 section 3; r57-0414): on each meter, the reading
  + the reserve of the running units + the unit's expected stays at or under 100 - the protected later demand to that
  meter's next reset; on the cap, the run's tokens + the reserve + the unit's expected stays at or under the cap less
  the preparation. A unit's reserve = its expected less its tokens so far, never below 0; running = started in
  `usage.log` and no `RETURN.md` (fields) or done-file (others) yet.

## `RUN:run/config.json` (schema; helper A fills the values with their sources in `briefs/COORDINATOR.md`)
```
{ "cap_M": 1200, "preparation_M": null,
  "m_per_point_all": 62, "m_per_point_fable": 5.7,
  "protected_all_points_per_hour": 0.21, "protected_fable_M_per_hour": 1.51,
  "resets_utc": ["2026-11-23T12:00:00Z", "2026-11-30T12:00:00Z"],
  "units": { "<unit>": { "expected_M": 0, "limit_M": 0, "model": "opus", "done_file": "<path under RUN:>" } },
  "coordinator": { "expected_M": 0, "model": "fable" } }
```
`preparation_M` stays `null` until top session 5 writes the measured tokens of the preparation; `gate.mjs` holds
every start while it is `null`.

## Readings at the preparation's start
2026-11-20 about 18:10 UTC (again at 18:31): weekly all models 85 %, weekly Fable 54 %, both reset 2026-11-23 12:00 UTC; the usage
card lists no five-hour window for this plan [m: get_usage]. The run starts from that reset (NEXT-STEP.md).
