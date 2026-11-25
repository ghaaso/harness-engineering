# Session monitor round 3: brief shared by the helpers (2026-11-24)

The page `docs/program/monitor/session-monitor.html` (built from `build/template.html` by `build/snapshot.mjs`) shows the
sessions over time (round 2, accepted by the owner; keep it). Round 3 adds a second view of the same data: **the
harness**, the designed system with every part in its place, each part lit by real use in the stretch of time shown,
each rule marked by what enforces it. Selection links the two views. Read `docs/program/monitor/NEXT-ROUND.md` and
`docs/program/monitor/README.md` first.

## Rules for every helper
- Write only inside `docs/program/monitor/`. Read anything. No install, no download, no commit, no model calls from code.
- Never write to `library/journal/`, `docs/program/evidence/` or `recovered/`. A shell command that names the journal
  and a path held in a variable is refused by the record guard: use literal paths.
- Write scripts and patches with the Write tool (backslashes collapse in shell heredocs).
- Plain words in anything the owner sees: plain noun headings, no slogans, no taglines (memory note: plain wording).
- Say what is measured, what is inferred and what was not checked. A rule shown as enforced when it is not is worse
  than no monitor.

## The owner's system map (layout of the harness view)
His boxes and names, from `docs/program/pipeline-diagram/` (`harness-map.png`; text in `build/content.mjs`, part lists
in `parts/`). Pipeline ids are the keys of `content.mjs`: `S1`..`S6` (PATH: Plan, Admit, Work, Check, Land, Learn),
`A1` Code map, `A2` Graph model training, `A3` Code queries, `B1` Problem records, `B2` Problem lookup, `B3` Library,
`B4` Reasoning cache, `B5` Standing notes, `C` Guards, `D` Limits, `E` Context, `F` Recovery, `G` Measurement and
research. Grid of 7 columns, 3 rows:

| row | col 1 | col 2 | col 3 | col 4 | col 5 | col 6 | col 7 |
|---|---|---|---|---|---|---|---|
| 1 | | B2 | B4 | A3 | A2 | A1 | B1 |
| 2 | B5 (upper half), B3 (lower half) | S1 | S2 | S3 | S4 | S5 | S6 |
| 3 | | C | D | E | F | | G |

Arrows (from, to, label): S1>S2>S3>S4>S5>S6 (no label); B5>S1, B3>S1; B2>S1 "memory lookup"; B4>S2 "model choice";
A3>S3 "query results"; A1>A2; A2>A3; A1>A3 "graph"; B1>B2 "knowledge store"; S5>A1 "changed code re-extracted";
S6>B1 "solved problems"; C>S1 "blocks rule violations"; D>S2 "concurrency limit"; E>S3 "context size";
F>S3 "restarts stalled work"; S6>G "transcripts, timings, verdicts"; G>B3 "measurements and research return as
library records and revised rules" (dashed).

Inside a box: the pipeline's steps (`cards[].t` in content.mjs) as a short chain; under each step, the real parts
that belong to it as small chips; the owner's designed or idea items (state `d`, `i`) folded into a grey count
("3 designed, not built"). A pipeline with no built part is drawn faded and dashed with "not built".

## Fixed ids (both data files use them)
- Pipelines: as above. Steps: `<pipeline>.<index from 0 of cards>`.
- Enforcers: `hook:library-start`, `hook:tier-hook`, `hook:record-guard`, `hook:plan-gate`, `hook:window-ceiling`,
  `hook:count-gate`, `hook:fanout-gate`, `hook:owner-report`, `hook:journal-watch`, `script:check-commit`
  (`tools/check-commit.mjs` through `tools/git-hooks/pre-commit`), `script:journal` (`tools/journal.mjs`),
  `setting:permissions` (`.claude/settings.json` skillOverrides and permissions.deny).
- Documents and other parts: `doc:claude-md`, `doc:board` (`library/INDEX.md`), `doc:orchestration`
  (`research-tree/ORCHESTRATION.md`), `doc:plan` (`research-tree/build/plan.json`), `doc:tier-routes`
  (`.claude/hooks/tier-routes.json`), `doc:enforcement-table`, `script:lookup` (`library/lookup.sh`), `tool:get_usage`,
  `tool:wrap_up`, `tool:start_session`, `tool:update_plan`. Others get a new id with a prefix `doc:`, `store:`,
  `script:`, `agent:` (an agent type such as `agent:lean-read`), `tool:`.

## File 1: `build/round3/harness-parts.json` (the parts and where they sit)
```
{ "made": "<date>", "sources": ["files read"],
  "pipelines": [ { "id": "S1", "code": "1", "title": "Plan", "line": "<the owner's one line>", "row": 2, "col": 2,
                   "half": null | "upper" | "lower",
                   "steps": [ { "t": "Confirm the request", "built": 4, "designed": 0, "idea": 0 } ] } ],
  "links": [ { "from": "B2", "to": "S1", "label": "memory lookup", "dashed": false } ],
  "parts": [ { "id": "doc:board", "name": "Board", "kind": "document|store|hook|script|setting|agent|tool",
               "pipeline": "B3", "step": 0, "owner": "<the owner's item text in content.mjs this part stands for>",
               "path": "library/INDEX.md",
               "match": { "paths": ["regex on a forward-slash path"], "tools": ["tool name regex"],
                          "agents": ["subagent_type"], "hook": "<log name, hooks only>" },
               "note": "<one plain line; e.g. loaded at start by the start hook, so Read calls under-count it>" } ] }
```
Names are short (at most about 16 characters) and plain. Every part names its source line in content.mjs or parts/.

## File 2: `build/round3/rules.json` (what each rule is and what enforces it)
```
{ "made": "<date>", "sources": ["files and lines read"],
  "enforcers": [ { "id": "hook:tier-hook", "file": ".claude/hooks/tier-hook.mjs",
                   "wired": [ { "event": "PreToolUse", "matcher": "*" } ],   // as in .claude/settings.json today
                   "acts": "refuses | reminds | refuses at commit | settings",
                   "what": "<plain: what it refuses or does>",
                   "log": ".claude/logs/tier-hook.jsonl", "logSessionField": "session",
                   "logsEveryCheck": true | false,  // true only if the code writes a log line on every call it checks
                   "evidence": ["file:line"], "cannotSee": "<plain>" } ],
  "rules": [ { "id": "claude-5", "source": "CLAUDE.md rule 5" | "Board: <row>" | "r57-0001",
               "text": "<plain, at most about 12 words>", "pipeline": "S2", "step": "S2.0" | null,
               "carriedBy": ["doc:claude-md"],
               "by": "hook | script | both | none", "whole": true | false,  // whole=false: only some breaks are refused
               "reminder": true | false, "enforcers": ["hook:tier-hook"],
               "trigger": "<plain: when it applies, tool and condition>", "cannotSee": "<plain>",
               "evidence": ["file:line of the code that refuses, or of the table row"] } ] }
```

## Additions to `build/data.json` (snapshot.mjs)
- `harness`: the two files above, inlined.
- per session `use`: `{ "<part id>": [read, write, named, firstTime, byHelpers] }`, sparse, the session and its
  helpers together (byHelpers = how many of those touches came from helpers). Read = Read/Grep/Glob on a matching path;
  write = Write/Edit/MultiEdit/NotebookEdit, or a shell redirect to it; named = the path in a shell command or in an
  Agent / start_session prompt; tools and agent types count as read.
- per session `hk`: `{ "<hook id>": [expected, seen, refused] }`: expected = calls by the session and its helpers that
  the hook's matcher in the settings of the session's own folder covers, made after the hook's first log line, and
  only for hooks whose code logs every check (`logsEveryCheck`); seen = its log lines for that session; refused =
  refusals. A hook not wired in the session's folder and with expected calls is bypassed.
- `orphans`: markdown documents written in the data's time span and never read, named or pointed at afterwards:
  `[[path, session short id, time]]`, for the later feature "built but untouched".
- Page size stays under 500,000 bytes (the browser pane refuses local files over 512 KiB).

## The page (two views, one screen of 1920 x 1080, no page scroll)
- Top bar: add `View: Over time | Harness`; `?view=time|harness`, `?part=<id>`, `?sel=<session>` open it so.
  The choice is kept in localStorage, wrapped in try/catch.
- **Over time**: as now. When a part is selected, every session card shows its relation to the part: read, wrote,
  skipped (expected and missing), none (dimmed); a chip in the map's corner names the part and clears it.
- **Harness**: the owner's map (above) fills the left area under the strip. Each part chip is coloured by its use in
  the stretch shown: used, idle (outline only), bypassed (red: a hook should have checked and its log has no line),
  not built (grey dashed). At the foot of each box a row of small squares, one per rule of that pipeline, coloured by
  what enforces it: refused by a hook, checked by a script at commit, partly refused, written only. Under the map a
  row of the sessions in the stretch, in start order, as chips in their state colour; a click selects one.
- **A session selected** (in either view): its path through the harness. The chips it touched are lit; the pipelines
  get a small number in the order it first touched them; the parts it should have touched and did not get a ring:
  red where a hook should have checked, amber where the method expects it and nothing forces it (the seven method
  steps of the round 2 page, each tied to a part: board at start = `hook:library-start`, library looked up =
  `script:lookup` or `doc:board`, usage read before helpers = `tool:get_usage`, models by route = `hook:tier-hook`,
  window under its limit = `hook:window-ceiling`, journal written = `script:journal`, closing report = `tool:wrap_up`).
- **A part selected**: the right column shows what it is, where it sits (pipeline and step), who read it, who wrote
  it, which rules it carries or enforces and their status, what enforces each, and which sessions skipped it. The
  session chips (harness view) and cards (time view) are coloured by their relation to it.
- Nothing selected, harness view: the right column shows the harness in three lines (rules by what enforces them;
  parts used, idle, bypassed in the stretch; parts designed and not built) and the existing "to look at" list.
- State as colour; a number only where one figure answers the question. Colours as in the existing `:root`.
